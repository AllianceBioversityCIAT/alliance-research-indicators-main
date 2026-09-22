import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import {
  PRMS_SYNC_HTTP_DESCRIPTIONS,
  PrmsSyncLastAttemptDto,
  PrmsSyncLastDecisionDto,
  PrmsSyncState,
  PrmsSyncStatusDto,
} from './dto/prms-sync.dto';

const LAST_ATTEMPT_SQL = `
      SELECT
        attempt_number,
        outcome,
        http_status,
        request_id,
        failure_reason,
        environment,
        prms_type,
        created_at
      FROM result_prms_sync_log
      WHERE external_reference = (
              SELECT result_official_code FROM results WHERE result_id = ?
            )
        AND result_year = (
              SELECT report_year_id FROM results WHERE result_id = ?
            )
        AND is_active = TRUE
      ORDER BY attempt_number DESC
      LIMIT 1
    `;

const RESULT_STATUS_SQL = `
      SELECT is_synced_to_prms, prms_result_code
      FROM results
      WHERE result_id = ?
        AND is_active = TRUE
    `;

const LAST_DECISION_SQL = `
      SELECT
        decision,
        decided_at,
        justification,
        prms_result_code,
        received_at
      FROM prms_webhook_delivery
      WHERE result_id = ?
        AND correlation_outcome = 'CORRELATED'
        AND duplicate_of_id IS NULL
      ORDER BY decided_at DESC
      LIMIT 1
    `;

const asBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

/**
 * R-PRMS-014 read surface. Lives here (T-13) so the reviewed write-path
 * service/repos stay untouched. Column list is the exclusion: `request_payload`
 * is never selected and `mapLastAttempt` never copies unknown keys.
 */
export function mapLastAttempt(
  row: Record<string, unknown> | null | undefined,
): PrmsSyncLastAttemptDto | null {
  if (!row) {
    return null;
  }
  return {
    attempt_number: Number(row.attempt_number),
    outcome: row.outcome as PrmsSyncOutcome,
    http_status: row.http_status == null ? null : Number(row.http_status),
    request_id: typeof row.request_id === 'string' ? row.request_id : null,
    failure_reason:
      typeof row.failure_reason === 'string' ? row.failure_reason : null,
    environment: String(row.environment ?? ''),
    prms_type: typeof row.prms_type === 'string' ? row.prms_type : null,
    created_at: (row.created_at as Date | string) ?? '',
  };
}

export function deriveSyncState(
  isSyncedToPrms: boolean,
  lastAttempt: PrmsSyncLastAttemptDto | null,
): PrmsSyncState {
  if (isSyncedToPrms || lastAttempt?.outcome === PrmsSyncOutcome.ACCEPTED) {
    return 'synced';
  }
  if (
    lastAttempt == null ||
    lastAttempt.outcome === PrmsSyncOutcome.IN_FLIGHT
  ) {
    return 'never_synced';
  }
  return 'failed';
}

export function mapLastDecision(
  row: Record<string, unknown> | null | undefined,
): PrmsSyncLastDecisionDto | null {
  if (!row) {
    return null;
  }
  return {
    decision: typeof row.decision === 'string' ? row.decision : null,
    decided_at:
      row.decided_at == null ? null : (row.decided_at as Date | string),
    justification:
      typeof row.justification === 'string' ? row.justification : null,
    prms_result_code:
      row.prms_result_code == null ? null : Number(row.prms_result_code),
    delivery_received_at:
      row.received_at == null ? null : (row.received_at as Date | string),
  };
}

@Injectable()
export class ResultPrmsSyncStatusReader {
  constructor(private readonly dataSource: DataSource) {}

  async getStatus(resultId: number): Promise<PrmsSyncStatusDto> {
    const resultRows = await this.dataSource.query(RESULT_STATUS_SQL, [
      resultId,
    ]);
    const resultRow = resultRows[0] as
      | { is_synced_to_prms?: unknown; prms_result_code?: unknown }
      | undefined;
    if (!resultRow) {
      throw new NotFoundException(PRMS_SYNC_HTTP_DESCRIPTIONS.notFound);
    }

    // Twice: the log keys on (official code, year) now, and each is resolved from
    // the same `results` row the caller asked about.
    const attemptRows = await this.dataSource.query(LAST_ATTEMPT_SQL, [
      resultId,
      resultId,
    ]);
    const lastAttempt = mapLastAttempt(
      attemptRows[0] as Record<string, unknown> | undefined,
    );
    const decisionRows = await this.dataSource.query(LAST_DECISION_SQL, [
      resultId,
    ]);
    const lastDecision = mapLastDecision(
      decisionRows[0] as Record<string, unknown> | undefined,
    );
    const isSynced = asBoolean(resultRow.is_synced_to_prms);
    const prmsResultCode =
      resultRow.prms_result_code == null
        ? null
        : Number(resultRow.prms_result_code);

    return {
      sync_state: deriveSyncState(isSynced, lastAttempt),
      is_synced_to_prms: isSynced,
      prms_result_code: prmsResultCode,
      last_attempt: lastAttempt,
      last_decision: lastDecision,
    };
  }
}
