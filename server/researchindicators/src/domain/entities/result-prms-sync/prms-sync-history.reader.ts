import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { formatPersonName } from '../../shared/utils/name-format.util';
import { PRMS_SYNC_HTTP_DESCRIPTIONS } from './dto/prms-sync.dto';
import {
  PrmsSyncHistoryDto,
  PrmsSyncHistoryEventDto,
} from './dto/prms-sync-history.dto';

/**
 * Q1 — result metadata. The reporting year is resolved here, never from
 * the client. Flat predicates only: no OR (design §5, KZ-017).
 */
const RESULT_METADATA_SQL = `
      SELECT result_official_code, report_year_id, prms_result_code, prms_phase_id
      FROM results
      WHERE result_id = ?
    `;

/**
 * Q2 — timeline. Newest first by COALESCE(decided_at, occurred_at), then id.
 * Duplicate deliveries and inactive rows are not timeline entries.
 */
const EVENTS_SQL = `
      SELECT h.*, su.first_name, su.last_name
      FROM result_prms_sync_history h
      LEFT JOIN sec_users su ON su.sec_user_id = h.actor_user_id
      WHERE h.result_official_code = ?
        AND h.result_year = ?
        AND h.duplicate_of_id IS NULL
        AND h.is_active = TRUE
      ORDER BY COALESCE(h.decided_at, h.occurred_at) DESC, h.id DESC
    `;

/**
 * Q3 — sync_count counts STAR pushes awaiting review, not inbound decisions.
 */
const SYNC_COUNT_SQL = `
      SELECT COUNT(*)
      FROM result_prms_sync_history
      WHERE result_official_code = ?
        AND result_year = ?
        AND event_source = 'STAR'
        AND status = 'PENDING_REVIEW'
        AND duplicate_of_id IS NULL
        AND is_active = TRUE
    `;

const asNullableNumber = (value: unknown): number | null =>
  value == null || value === '' ? null : Number(value);

const asTimestamp = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

/**
 * STAR rows take the joined sec_users name. A PRMS row returns null even
 * when actor_user_id (and therefore the join) is populated (R-SSP-001 AC.9).
 */
const firstToken = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const token = value
    .trim()
    .split(/\s+/)
    .find((part) => part.length > 0);
  return token ?? null;
};

const actorName = (row: Record<string, unknown>): string | null => {
  if (row.event_source !== 'STAR') {
    return null;
  }
  const first = formatPersonName(
    typeof row.first_name === 'string' ? row.first_name : null,
  );
  const last = formatPersonName(
    typeof row.last_name === 'string' ? row.last_name : null,
  );
  if (!first || !last) {
    return null;
  }
  return `${first} ${last}`;
};

/**
 * The seam between given name and surname is the column boundary, not a
 * guess over the joined string. One first name plus three surnames must
 * still yield the first token of each column.
 */
const actorNameShort = (row: Record<string, unknown>): string | null => {
  if (row.event_source !== 'STAR') {
    return null;
  }
  const first = formatPersonName(firstToken(row.first_name));
  const last = formatPersonName(firstToken(row.last_name));
  if (!first || !last) {
    return null;
  }
  return `${first} ${last}`;
};

/** PRMS rows only. A stray reviewer_name on a STAR row is not surfaced. */
const reviewerName = (row: Record<string, unknown>): string | null => {
  if (row.event_source !== 'PRMS') {
    return null;
  }
  return asNullableString(row.reviewer_name);
};

/**
 * `result_prms_sync_history.changes`, written by
 * `PoolFundingMappingDiffService`. Cast direct, no `JSON.parse` — mysql2
 * already hands back a parsed object for a JSON column, the same
 * convention `PrmsWebhookDeliveryRepository` uses for `raw_body`
 * (`prms-webhook-delivery.repository.ts:107`). `EVENTS_SQL`'s `h.*`
 * already selects the column; this was the one line missing between the
 * database and the wire — the diff computed and persisted correctly, the
 * response just never carried it.
 */
const asChanges = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export function mapHistoryEvent(
  row: Record<string, unknown>,
): PrmsSyncHistoryEventDto {
  return {
    id: Number(row.id),
    event_source: row.event_source as 'STAR' | 'PRMS',
    status: asNullableString(row.status),
    decision: asNullableString(row.decision),
    occurred_at: asTimestamp(row.occurred_at) ?? '',
    decided_at: asTimestamp(row.decided_at),
    justification: asNullableString(row.justification),
    actor_name: actorName(row),
    actor_name_short: actorNameShort(row),
    reviewer_name: reviewerName(row),
    reviewer_role: asNullableString(row.reviewer_role),
    changes: asChanges(row.changes),
  };
}

@Injectable()
export class PrmsSyncHistoryReader {
  private readonly logger = new LoggerUtil({
    name: PrmsSyncHistoryReader.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  async getHistory(resultId: number): Promise<PrmsSyncHistoryDto> {
    const resultRows: unknown[] = await this.dataSource.query(
      RESULT_METADATA_SQL,
      [resultId],
    );
    const resultRow = resultRows[0] as
      | {
          result_official_code?: unknown;
          report_year_id?: unknown;
          prms_result_code?: unknown;
          prms_phase_id?: unknown;
        }
      | undefined;
    if (!resultRow) {
      throw new NotFoundException(PRMS_SYNC_HTTP_DESCRIPTIONS.notFound);
    }

    const officialCode = resultRow.result_official_code;
    const year = resultRow.report_year_id;

    try {
      const eventRows: unknown[] = await this.dataSource.query(EVENTS_SQL, [
        officialCode,
        year,
      ]);
      const countRows: unknown[] = await this.dataSource.query(SYNC_COUNT_SQL, [
        officialCode,
        year,
      ]);
      const countRow = countRows[0] as Record<string, unknown> | undefined;
      const syncCount = Number(countRow?.['COUNT(*)'] ?? 0);

      return {
        prms_result_code: asNullableNumber(resultRow.prms_result_code),
        prms_phase_id: asNullableNumber(resultRow.prms_phase_id),
        sync_count: syncCount,
        events: (eventRows as Record<string, unknown>[]).map(mapHistoryEvent),
      };
    } catch (error) {
      this.logger._error(
        `PRMS sync history read failed result_official_code=${officialCode} result_year=${year}`,
      );
      throw error;
    }
  }
}
