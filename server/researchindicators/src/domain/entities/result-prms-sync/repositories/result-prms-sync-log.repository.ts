import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PrmsSyncOutcome } from '../../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PolicyTypeHomologation } from '../../../tools/open-search/prms/homologation/policy-type.homologation';
import { effectivePoolFundingContributorSql } from '../../../shared/utils/pool-funding.util';
import { SyncGateSnapshot } from '../eligibility/sync-gate';
import { PRMS_IN_FLIGHT_LIVE_WINDOW_MS } from '../result-prms-sync.constants';

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
}

export interface InsertRefusedByStarInput {
  resultId: number;
  environment: string;
  userId: number;
  failureReason: string;
}

@Injectable()
export class ResultPrmsSyncLogRepository {
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
        AND r.is_snapshot = FALSE
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
      SELECT result_id, result_official_code, is_synced_to_prms
      FROM results
      WHERE result_id = ?
        AND is_active = TRUE
        AND is_snapshot = FALSE
      FOR UPDATE
      `,
      [resultId],
    );

    const resultRow = resultRows[0];
    if (!resultRow) {
      return { kind: 'not_found' };
    }

    const resultOfficialCode = Number(resultRow.result_official_code);

    if (asBoolean(resultRow.is_synced_to_prms)) {
      return { kind: 'already_synced', resultOfficialCode };
    }

    const inFlightRows = await manager.query(
      `
      SELECT id, attempt_number, created_at
      FROM result_prms_sync_log
      WHERE result_id = ?
        AND outcome = ?
        AND is_active = TRUE
      FOR UPDATE
      `,
      [resultId, PrmsSyncOutcome.IN_FLIGHT],
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
      WHERE result_id = ?
      `,
      [resultId],
    );
    const attemptNumber = Number(nextRows[0]?.max_attempt ?? 0) + 1;

    const insertResult = await manager.query(
      `
      INSERT INTO result_prms_sync_log
        (result_id, attempt_number, environment, outcome, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, TRUE)
      `,
      [
        resultId,
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
    await manager.query(
      `
      SELECT result_id
      FROM results
      WHERE result_id = ?
        AND is_active = TRUE
        AND is_snapshot = FALSE
      FOR UPDATE
      `,
      [input.resultId],
    );

    const nextRows = await manager.query(
      `
      SELECT COALESCE(MAX(attempt_number), 0) AS max_attempt
      FROM result_prms_sync_log
      WHERE result_id = ?
      `,
      [input.resultId],
    );
    const attemptNumber = Number(nextRows[0]?.max_attempt ?? 0) + 1;

    const insertResult = await manager.query(
      `
      INSERT INTO result_prms_sync_log
        (result_id, attempt_number, environment, outcome, failure_reason,
         prms_type, http_status, request_id, request_payload, response_body,
         created_by, is_active)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, TRUE)
      `,
      [
        input.resultId,
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
            external_reference = ?,
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
        await manager.query(
          `
          UPDATE results
          SET is_synced_to_prms = TRUE,
              prms_result_code = ?
          WHERE result_id = ?
          `,
          [input.prmsResultCode ?? null, input.resultId],
        );
      }

      return 'settled';
    });
  }
}
