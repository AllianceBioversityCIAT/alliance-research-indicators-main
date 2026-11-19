// @akili-spec changes/prms-pending-review-lock

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  derivePrmsPushStatus,
  PrmsPushEvent,
  PrmsPushStatus,
} from './eligibility/prms-push-status';

/**
 * One history read for a platform + official code, every year (design
 * §5.1). The year is not a predicate: a decision's year is the callback's
 * phase year, which is not a column. Flat ANDs only. `id` order stays in
 * SQL; JavaScript never compares ids (P-12).
 */
export const PUSH_EVENTS_SQL = `
  SELECT
    h.event_source,
    h.status,
    h.decision,
    h.result_year,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(h.raw_body, '$.data.obj_version.phase_year')) AS UNSIGNED) AS phase_year,
    (h.delivery_id IS NULL AND h.raw_headers IS NOT NULL AND h.raw_headers = JSON_OBJECT()) AS imported
  FROM result_prms_sync_history h
  WHERE h.platform_code = ?
    AND h.result_official_code = ?
    AND h.is_active = TRUE
    AND h.duplicate_of_id IS NULL
    AND h.correlation_outcome = 'CORRELATED'
  ORDER BY h.id ASC
`;

interface PushEventRow {
  event_source: string;
  status: string | null;
  decision: string | null;
  result_year: unknown;
  phase_year: unknown;
  imported: unknown;
}

const decisionYear = (row: PushEventRow): number => {
  if (row.phase_year == null || row.phase_year === '') {
    return Number(row.result_year);
  }
  return Number(row.phase_year);
};

const toPushEvent = (row: PushEventRow): PrmsPushEvent | null => {
  const imported = Number(row.imported) === 1;
  if (row.event_source === 'STAR' && row.status === 'PENDING_REVIEW') {
    return {
      kind: 'push',
      decision: null,
      year: Number(row.result_year),
      imported,
    };
  }
  if (
    row.event_source === 'PRMS' &&
    (row.decision === 'APPROVE' || row.decision === 'REJECT')
  ) {
    return {
      kind: 'decision',
      decision: row.decision,
      year: decisionYear(row),
      imported,
    };
  }
  return null;
};

export interface PrmsPushStatusKey {
  platformCode: string;
  resultOfficialCode: string;
  year: number;
}

@Injectable()
export class PrmsPushStatusReader {
  constructor(private readonly dataSource: DataSource) {}

  async read(key: PrmsPushStatusKey): Promise<PrmsPushStatus> {
    const rows = (await this.dataSource.query(PUSH_EVENTS_SQL, [
      key.platformCode,
      String(key.resultOfficialCode),
    ])) as PushEventRow[];
    const events: PrmsPushEvent[] = [];
    for (const row of rows) {
      const event = toPushEvent(row);
      if (event) {
        events.push(event);
      }
    }
    return derivePrmsPushStatus(events, key.year);
  }
}
