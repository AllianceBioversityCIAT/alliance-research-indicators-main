import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PrmsSyncOutcome } from '../../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PolicyTypeHomologation } from '../../../tools/open-search/prms/homologation/policy-type.homologation';
import { effectivePoolFundingContributorSql } from '../../../shared/utils/pool-funding.util';
import { SyncGateSnapshot } from '../eligibility/sync-gate';
import { PRMS_IN_FLIGHT_LIVE_WINDOW_MS } from '../result-prms-sync.constants';
import { LoggerUtil } from '../../../shared/utils/logger.util';

const asBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

const asOk = (
  result: unknown,
): { insertId?: number; affectedRows?: number } => {
  if (Array.isArray(result)) {
    return (result[0] ?? {}) as { insertId?: number; affectedRows?: number };
  }
  return (result ?? {}) as { insertId?: number; affectedRows?: number };
};

const starToPrmsPolicyTypeId = (
  starPolicyTypeId: number | null,
): number | null => {
  if (starPolicyTypeId == null) {
    return null;
  }
  for (const [prmsId, starId] of Object.entries(PolicyTypeHomologation)) {
    if (Number(starId) === starPolicyTypeId) {
      return Number(prmsId);
    }
  }
  return null;
};

export interface PrmsSyncGateFacts extends SyncGateSnapshot {
  result_id: number | null;
  result_official_code: number | null;
}

export type ClaimDecision =
  | { kind: 'not_found' }
  | { kind: 'already_synced'; resultOfficialCode: number }
  | {
      kind: 'collision';
      attemptNumber: number;
      resultOfficialCode: number;
    }
  | {
      kind: 'expired';
      attemptId: number;
      attemptNumber: number;
      resultOfficialCode: number;
    }
  | {
      kind: 'claimed';
      attemptId: number;
      attemptNumber: number;
      resultOfficialCode: number;
      /** `results.report_year_id`, read under the same lock as the code. */
      resultYear: number;
    };

export interface ClaimAttemptInput {
  environment: string;
  userId: number;
  now?: Date;
}

export interface SettleIfInFlightInput {
  attemptId: number;
  resultId: number;
  outcome: PrmsSyncOutcome;
  userId: number;
  httpStatus?: number | null;
  requestId?: string | null;
  requestPayload?: Record<string, unknown> | null;
  responseBody?: Record<string, unknown> | null;
  failureReason?: string | null;
  prmsType?: string | null;
  externalReference?: string | null;
  prmsResultCode?: number | null;
  prmsPhaseId?: number | null;
}

export interface InsertRefusedByStarInput {
  resultId: number;
  environment: string;
  userId: number;
  failureReason: string;
}

@Injectable()
export class ResultPrmsSyncLogRepository {
  private readonly logger = new LoggerUtil({
    name: 'ResultPrmsSyncLogRepository',
  });

  constructor(private readonly dataSource: DataSource) {}

  async loadGateSnapshot(resultId: number): Promise<PrmsSyncGateFacts> {
    const missing: PrmsSyncGateFacts = {
      exists: false,
      result_id: null,
      result_official_code: null,
      is_synced_to_prms: false,
      result_status_id: null,
      pool_funding_alignment_green: false,
      primary_contract: null,
      indicator_id: null,
      prms_policy_type_id: null,
    };

    const rows = await this.dataSource.query(
      `
      SELECT
        r.result_id,
        r.result_official_code,
        r.is_synced_to_prms,
        r.result_status_id,
        r.indicator_id,
        pool_funding_alignment_validation(r.result_id) AS alignment_green,
        ac.agreement_id,
        ${effectivePoolFundingContributorSql('ac')} AS is_pool_funding_contributor,
        rpc.policy_type_id
      FROM results r
      LEFT JOIN result_contracts rc
        ON rc.result_id = r.result_id
        AND rc.is_active = TRUE
        AND rc.is_primary = TRUE
      LEFT JOIN agresso_contracts ac ON ac.agreement_id = rc.contract_id
      LEFT JOIN result_policy_change rpc
        ON rpc.result_id = r.result_id
        AND rpc.is_active = TRUE
      WHERE r.result_id = ?
        AND r.is_active = TRUE
      `,
      [resultId],
    );

    const row = rows[0];
    if (!row) {
      return missing;
    }

    return {
      exists: true,
      result_id: Number(row.result_id),
      result_official_code:
        row.result_official_code == null
          ? null
          : Number(row.result_official_code),
      is_synced_to_prms: asBoolean(row.is_synced_to_prms),
      result_status_id:
        row.result_status_id == null ? null : Number(row.result_status_id),
      pool_funding_alignment_green: asBoolean(row.alignment_green),
      primary_contract: row.agreement_id
        ? {
            agreement_id: String(row.agreement_id),
            is_pool_funding_contributor: asBoolean(
              row.is_pool_funding_contributor,
            ),
          }
        : null,
      indicator_id: row.indicator_id == null ? null : Number(row.indicator_id),
      prms_policy_type_id: starToPrmsPolicyTypeId(
        row.policy_type_id == null ? null : Number(row.policy_type_id),
      ),
    };
  }

  /**
   * Claim transaction 1 (design.md §5.1b). The four-way branch runs inside
   * ONE locked transaction — splitting it reopens the race.
   */
  async claimAttempt(
    resultId: number,
    input: ClaimAttemptInput,
  ): Promise<ClaimDecision> {
    const now = input.now ?? new Date();
    return this.dataSource.transaction((manager) =>
      this.claimInsideLock(manager, resultId, input, now),
    );
  }

  private async claimInsideLock(
    manager: EntityManager,
    resultId: number,
    input: ClaimAttemptInput,
    now: Date,
  ): Promise<ClaimDecision> {
    const resultRows = await manager.query(
      `
      SELECT result_id, result_official_code, report_year_id, is_synced_to_prms
      FROM results
      WHERE result_id = ?
        AND is_active = TRUE
      FOR UPDATE
      `,
      [resultId],
    );

    const resultRow = resultRows[0];
    if (!resultRow) {
      return { kind: 'not_found' };
    }

    const resultOfficialCode = Number(resultRow.result_official_code);
    // The log now keys on (official code, year) rather than the surrogate
    // `result_id`. That is the identity PRMS uses -- `result_official_code` is sent
    // as `external_reference` -- so an in-flight claim covers every `results` row
    // sharing it (a live row and its snapshots), which is exactly the set that
    // would otherwise be pushed to PRMS twice under one external reference.
    const resultYear = Number(resultRow.report_year_id);
    // `external_reference` IS the official code -- the payload builder sends the
    // same value -- so it doubles as the log's identity column and no separate
    // code column is stored. Written here, at CLAIM time, so rows that never
    // reach PRMS (REFUSED_BY_STAR, expired UNKNOWN) carry it too.
    const externalReference = String(resultOfficialCode);

    if (asBoolean(resultRow.is_synced_to_prms)) {
      return { kind: 'already_synced', resultOfficialCode };
    }

    const inFlightRows = await manager.query(
      `
      SELECT id, attempt_number, created_at
      FROM result_prms_sync_log
      WHERE external_reference = ?
        AND result_year = ?
        AND outcome = ?
        AND is_active = TRUE
      FOR UPDATE
      `,
      [externalReference, resultYear, PrmsSyncOutcome.IN_FLIGHT],
    );

    const inFlight = inFlightRows[0];
    if (inFlight) {
      const createdAt = new Date(inFlight.created_at);
      const ageMs = now.getTime() - createdAt.getTime();
      if (ageMs > PRMS_IN_FLIGHT_LIVE_WINDOW_MS) {
        await manager.query(
          `
          UPDATE result_prms_sync_log
          SET outcome = ?,
              failure_reason = ?,
              updated_by = ?
          WHERE id = ?
            AND outcome = ?
          `,
          [
            PrmsSyncOutcome.UNKNOWN,
            'Claim expired; PRMS outcome unconfirmed',
            input.userId,
            inFlight.id,
            PrmsSyncOutcome.IN_FLIGHT,
          ],
        );
        return {
          kind: 'expired',
          attemptId: Number(inFlight.id),
          attemptNumber: Number(inFlight.attempt_number),
          resultOfficialCode,
        };
      }

      return {
        kind: 'collision',
        attemptNumber: Number(inFlight.attempt_number),
        resultOfficialCode,
      };
    }

    const nextRows = await manager.query(
      `
      SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt
      FROM result_prms_sync_log
      WHERE external_reference = ?
        AND result_year = ?
      `,
      [externalReference, resultYear],
    );
    const attemptNumber = Number(nextRows[0]?.max_attempt ?? 0) + 1;

    const insertResult = await manager.query(
      `
      INSERT INTO result_prms_sync_log
        (external_reference, result_year, attempt_number,
         environment, outcome, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
      `,
      // 7 columns, 6 placeholders + literal TRUE. Keep this list and the array
      // below in lockstep: a stray extra param shifts every value one column to
      // the right, and MySQL reports it at the FIRST type mismatch it reaches
      // ("Incorrect integer value: 'IN_FLIGHT' for column 'created_by'"), not at
      // the column that is actually wrong.
      [
        externalReference,
        resultYear,
        attemptNumber,
        input.environment,
        PrmsSyncOutcome.IN_FLIGHT,
        input.userId,
      ],
    );

    return {
      kind: 'claimed',
      attemptId: Number(asOk(insertResult).insertId),
      attemptNumber,
      resultOfficialCode,
      resultYear,
    };
  }

  /**
   * REFUSED_BY_STAR numbering uses the same `results` row lock as claim
   * (design.md §3 monotonic attempt_number). A bare MAX+1 outside a
   * transaction lets two concurrent refusals collide on the same number.
   */
  async insertRefusedByStar(
    input: InsertRefusedByStarInput,
  ): Promise<{ attemptId: number; attemptNumber: number }> {
    return this.dataSource.transaction((manager) =>
      this.insertRefusedByStarInsideLock(manager, input),
    );
  }

  private async insertRefusedByStarInsideLock(
    manager: EntityManager,
    input: InsertRefusedByStarInput,
  ): Promise<{ attemptId: number; attemptNumber: number }> {
    const lockRows = await manager.query(
      `
      SELECT result_id, result_official_code, report_year_id
      FROM results
      WHERE result_id = ?
        AND is_active = TRUE
      FOR UPDATE
      `,
      [input.resultId],
    );

    // Read under the SAME results lock the claim uses, so the attempt counter
    // stays monotonic across both paths (design.md section 3).
    const lockedRow = lockRows[0];
    const resultOfficialCode = Number(lockedRow?.result_official_code);
    const resultYear = Number(lockedRow?.report_year_id);
    const externalReference = String(resultOfficialCode);

    const nextRows = await manager.query(
      `
      SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt
      FROM result_prms_sync_log
      WHERE external_reference = ?
        AND result_year = ?
      `,
      [externalReference, resultYear],
    );
    const attemptNumber = Number(nextRows[0]?.max_attempt ?? 0) + 1;

    const insertResult = await manager.query(
      `
      INSERT INTO result_prms_sync_log
        (external_reference, result_year, attempt_number,
         environment, outcome, failure_reason, prms_type, http_status,
         request_id, request_payload, response_body, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, TRUE)
      `,
      [
        externalReference,
        resultYear,
        attemptNumber,
        input.environment,
        PrmsSyncOutcome.REFUSED_BY_STAR,
        input.failureReason,
        input.userId,
      ],
    );

    return {
      attemptId: Number(asOk(insertResult).insertId),
      attemptNumber,
    };
  }

  /**
   * Settle transaction 2. Conditional on the row still being IN_FLIGHT so a
   * late settle after expiry writes nothing (R-PRMS-013 AC.4).
   */
  async settleIfInFlight(
    input: SettleIfInFlightInput,
  ): Promise<'settled' | 'late'> {
    const status = await this.settleTransaction(input);

    // Runs only on a settled ACCEPTED, so a 'late' settle still writes nothing
    // (R-PRMS-013 AC.4). Cannot throw -- see `recordAcceptedPrmsMetadata`.
    if (status === 'settled' && input.outcome === PrmsSyncOutcome.ACCEPTED) {
      await this.recordAcceptedPrmsMetadata(input);
    }

    return status;
  }

  private async settleTransaction(
    input: SettleIfInFlightInput,
  ): Promise<'settled' | 'late'> {
    return this.dataSource.transaction(async (manager) => {
      const updateResult = await manager.query(
        `
        UPDATE result_prms_sync_log
        SET outcome = ?,
            http_status = ?,
            request_id = ?,
            request_payload = ?,
            response_body = ?,
            failure_reason = ?,
            prms_type = ?,
            -- COALESCE, not a plain assignment: the claim already wrote the
            -- official code here, and a settle that built no payload (or an
            -- expiry) must not erase it back to NULL.
            external_reference = COALESCE(?, external_reference),
            updated_by = ?
        WHERE id = ?
          AND outcome = ?
        `,
        [
          input.outcome,
          input.httpStatus ?? null,
          input.requestId ?? null,
          input.requestPayload == null
            ? null
            : JSON.stringify(input.requestPayload),
          input.responseBody == null
            ? null
            : JSON.stringify(input.responseBody),
          input.failureReason ?? null,
          input.prmsType ?? null,
          input.externalReference ?? null,
          input.userId,
          input.attemptId,
          PrmsSyncOutcome.IN_FLIGHT,
        ],
      );

      if (Number(asOk(updateResult).affectedRows ?? 0) === 0) {
        return 'late';
      }

      if (input.outcome === PrmsSyncOutcome.ACCEPTED) {
        // ONLY the safety-critical flag rides this transaction. `is_synced_to_prms`
        // is the single thing that stops a second push (`claimAttempt` reads it and
        // nothing else -- the log is not consulted), so losing it means STAR can
        // send a result PRMS already holds.
        //
        // `prms_result_code` and `prms_phase_id` are METADATA and deliberately do
        // NOT ride along. They used to, and it cost us: a failure writing them
        // rolled the whole transaction back, which un-did the log settle too. The
        // row stayed IN_FLIGHT, the acceptance vanished, and the only evidence that
        // PRMS had accepted was gone -- while PRMS still held the result.
        await manager.query(
          `
          UPDATE results
          SET is_synced_to_prms = TRUE
          WHERE result_id = ?
          `,
          [input.resultId],
        );
      }

      return 'settled';
    });
  }

  /**
   * Best-effort metadata write, deliberately OUTSIDE the settle transaction and
   * deliberately unable to throw.
   *
   * These two columns are descriptive: nothing reads them to make a decision.
   * Losing them costs a lookup; losing the settle costs correctness. So a failure
   * here is logged loudly and swallowed, leaving a diagnosable mismatch (an
   * ACCEPTED row whose result has no code) instead of a silent rollback.
   */
  private async recordAcceptedPrmsMetadata(
    input: SettleIfInFlightInput,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `
        UPDATE results
        SET prms_result_code = ?,
            prms_phase_id = ?
        WHERE result_id = ?
        `,
        [
          input.prmsResultCode ?? null,
          input.prmsPhaseId ?? null,
          input.resultId,
        ],
      );
    } catch (error) {
      this.logger._error(
        `PRMS metadata not stored for result ${input.resultId} (attempt ${input.attemptId}): ` +
          `the sync IS recorded as ACCEPTED and is_synced_to_prms is set, but prms_result_code / ` +
          `prms_phase_id were not written. Do NOT re-sync. Cause: ${
            (error as Error)?.message ?? error
          }`,
      );
    }
  }
}
