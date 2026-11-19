import { dataSource } from '../../src/db/config/mysql/orm.test.config';
import {
  PrmsPushStatusReader,
  PUSH_EVENTS_SQL,
} from '../../src/domain/entities/result-prms-sync/prms-push-status.reader';

/**
 * Real-MySQL fixture for T-01, `docs/specs/changes/prms-pending-review-lock`.
 *
 * Asserts on the rows `PUSH_EVENTS_SQL` returns and on the status
 * `PrmsPushStatusReader` derives from those rows (KZ-017). Inserts only
 * into `result_prms_sync_history`. No DDL (FP-51).
 *
 * `result_official_code` band (FP-45): `901000`–`901009` (the literal
 * varchar codes). Sibling headers that say `901_000` mean the
 * `901000000000000 + suffix` band in `results`, not these ten codes.
 * This file does not insert into `results`.
 */

type Row = Record<string, unknown>;

const BAND = [
  '901000',
  '901001',
  '901002',
  '901003',
  '901004',
  '901005',
  '901006',
  '901007',
  '901008',
  '901009',
] as const;

const CODE_698 = '901000';
const CODE_CROSS_YEAR = '901001';
const CODE_STRING_YEAR = '901002';
const CODE_IMPORTED = '901003';
const CODE_IGNORED = '901004';
const CODE_IMPORTED_DECISION = '901006';
const CODE_EMPTY = '901009';

const PLATFORM = 'STAR';

describe('PRMS push status on result_prms_sync_history (T-01)', () => {
  const reader = new PrmsPushStatusReader(dataSource);

  async function insertHistory(row: {
    code: string;
    platform?: string;
    year: number;
    source: 'STAR' | 'PRMS';
    status: string | null;
    decision?: string | null;
    occurredAt: string;
    decidedAt?: string | null;
    deliveryId?: string | null;
    rawBody?: string | null;
    rawHeaders?: string | null;
    active?: 0 | 1;
    duplicateOfId?: number | null;
  }): Promise<void> {
    await dataSource.query(
      `INSERT INTO result_prms_sync_history
         (occurred_at, environment, correlation_outcome, platform_code,
          result_official_code, result_year, decision, decided_at, raw_body,
          raw_headers, processing_state, duplicate_of_id, is_active,
          event_source, status, delivery_id)
       VALUES (?, 'test', 'CORRELATED', ?, ?, ?, ?, ?, ?, ?, 'PROCESSED', ?, ?, ?, ?, ?)`,
      [
        row.occurredAt,
        row.platform ?? PLATFORM,
        row.code,
        row.year,
        row.decision ?? null,
        row.decidedAt ?? null,
        row.rawBody ?? null,
        row.rawHeaders ?? null,
        row.duplicateOfId ?? null,
        row.active ?? 1,
        row.source,
        row.status,
        row.deliveryId ?? null,
      ],
    );
  }

  const rowsFor = (code: string, platform = PLATFORM): Promise<Row[]> =>
    dataSource.query(PUSH_EVENTS_SQL, [platform, code]);

  const statusFor = (code: string, year: number, platform = PLATFORM) =>
    reader.read({
      platformCode: platform,
      resultOfficialCode: code,
      year,
    });

  beforeAll(async () => {
    await dataSource.initialize();
    await dataSource.query(
      `DELETE FROM result_prms_sync_history
        WHERE result_official_code IN (${BAND.map(() => '?').join(', ')})`,
      [...BAND],
    );

    // 698-like: push, REJECT, push. occurred_at disagrees with id order.
    await insertHistory({
      code: CODE_698,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-11-11 16:43:00',
    });
    await insertHistory({
      code: CODE_698,
      year: 2026,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-11-13 19:09:00',
      decidedAt: '2026-11-13 19:09:00',
      deliveryId: 'dlv-901000',
      rawBody:
        '{"data":{"obj_version":{"id":"36","phase_name":"Reporting 2026","phase_year":2026}}}',
      rawHeaders: '{"x-delivery-id":"dlv-901000"}',
    });
    await insertHistory({
      code: CODE_698,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-11-13 14:42:00',
    });

    // S-26: the callback's phase year is 2026 and its stored year is 2027.
    await insertHistory({
      code: CODE_CROSS_YEAR,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-11-01 10:00:00',
    });
    await insertHistory({
      code: CODE_CROSS_YEAR,
      year: 2027,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-11-02 10:00:00',
      decidedAt: '2026-11-02 10:00:00',
      deliveryId: 'dlv-901001',
      rawBody:
        '{"data":{"obj_version":{"id":"36","phase_name":"Reporting 2026","phase_year":2026}}}',
      rawHeaders: '{"x-delivery-id":"dlv-901001"}',
    });

    // phase_year stored as a JSON string, result_year deliberately different.
    await insertHistory({
      code: CODE_STRING_YEAR,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-11-01 11:00:00',
    });
    await insertHistory({
      code: CODE_STRING_YEAR,
      year: 2028,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-11-02 11:00:00',
      decidedAt: '2026-11-02 11:00:00',
      deliveryId: 'dlv-901002',
      rawBody:
        '{"data":{"obj_version":{"id":"36","phase_name":"Reporting 2026","phase_year":"2026"}}}',
      rawHeaders: '{"x-delivery-id":"dlv-901002"}',
    });

    // S-27: real push first, then the imported pair (higher ids).
    await insertHistory({
      code: CODE_IMPORTED,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-11-03 09:00:00',
    });
    await insertHistory({
      code: CODE_IMPORTED,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-10-01 09:00:00',
      rawBody: '{}',
      rawHeaders: '{}',
    });
    await insertHistory({
      code: CODE_IMPORTED,
      year: 2026,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-10-02 09:00:00',
      decidedAt: '2026-10-02 09:00:00',
      rawBody: '{}',
      rawHeaders: '{}',
    });

    // Rows the SQL or the rule must ignore, plus one real 2026 push.
    await insertHistory({
      code: CODE_IGNORED,
      year: 2026,
      source: 'STAR',
      status: 'PENDING_REVIEW',
      occurredAt: '2026-11-04 09:00:00',
    });
    await insertHistory({
      code: CODE_IGNORED,
      year: 2026,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-11-05 09:00:00',
      decidedAt: '2026-11-05 09:00:00',
      deliveryId: 'dlv-901004-inactive',
      rawBody: '{"data":{"obj_version":{"phase_year":2026}}}',
      rawHeaders: '{"x-delivery-id":"inactive"}',
      active: 0,
    });
    await insertHistory({
      code: CODE_IGNORED,
      year: 2026,
      source: 'PRMS',
      status: 'APPROVED',
      decision: 'APPROVE',
      occurredAt: '2026-11-06 09:00:00',
      decidedAt: '2026-11-06 09:00:00',
      deliveryId: 'dlv-901004-dup',
      rawBody: '{"data":{"obj_version":{"phase_year":2026}}}',
      rawHeaders: '{"x-delivery-id":"dup"}',
      duplicateOfId: 1,
    });
    await insertHistory({
      code: CODE_IGNORED,
      platform: 'TIP',
      year: 2026,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-11-07 09:00:00',
      decidedAt: '2026-11-07 09:00:00',
      deliveryId: 'dlv-901004-tip',
      rawBody: '{"data":{"obj_version":{"phase_year":2026}}}',
      rawHeaders: '{"x-delivery-id":"tip"}',
    });
    await insertHistory({
      code: CODE_IGNORED,
      year: 2025,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-11-08 09:00:00',
      decidedAt: '2026-11-08 09:00:00',
      deliveryId: 'dlv-901004-2025',
      rawBody: '{"data":{"obj_version":{"phase_year":2025}}}',
      rawHeaders: '{"x-delivery-id":"year"}',
    });

    // Imported decision alone: empty body, so the year is result_year.
    await insertHistory({
      code: CODE_IMPORTED_DECISION,
      year: 2026,
      source: 'PRMS',
      status: 'REJECTED',
      decision: 'REJECT',
      occurredAt: '2026-10-03 09:00:00',
      decidedAt: '2026-10-03 09:00:00',
      rawBody: '{}',
      rawHeaders: '{}',
    });
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    try {
      await dataSource.query(
        `DELETE FROM result_prms_sync_history
          WHERE result_official_code IN (${BAND.map(() => '?').join(', ')})`,
        [...BAND],
      );
    } finally {
      await dataSource.destroy();
    }
  });

  it('S-5: the 698 sequence is pending because id order, not occurred_at, decides', async () => {
    await expect(statusFor(CODE_698, 2026)).resolves.toEqual({
      year: 2026,
      status: 'pending_review',
      resubmittable: false,
    });
  });

  it('S-26: 2027 stays never_pushed when the callback phase year is 2026', async () => {
    await expect(statusFor(CODE_CROSS_YEAR, 2027)).resolves.toEqual({
      year: 2027,
      status: 'never_pushed',
      resubmittable: true,
    });
    await expect(statusFor(CODE_CROSS_YEAR, 2026)).resolves.toEqual({
      year: 2026,
      status: 'rejected',
      resubmittable: true,
    });
  });

  it('projects a string phase_year as the number 2026', async () => {
    const rows = await rowsFor(CODE_STRING_YEAR);
    const stringYear = rows.find((row) => Number(row.result_year) === 2028);

    expect(stringYear).toBeDefined();
    expect(stringYear?.phase_year).toBe(2026);
    await expect(statusFor(CODE_STRING_YEAR, 2026)).resolves.toEqual({
      year: 2026,
      status: 'rejected',
      resubmittable: true,
    });
    await expect(statusFor(CODE_STRING_YEAR, 2028)).resolves.toEqual({
      year: 2028,
      status: 'never_pushed',
      resubmittable: true,
    });
  });

  it('S-27: imported rows with higher ids do not outrank the real push', async () => {
    const rows = await rowsFor(CODE_IMPORTED);

    expect(rows).toHaveLength(3);
    // ORDER BY id ASC. The real push is first, so the imported pair has
    // the higher ids (S-27). The projection does not include id.
    expect(rows[0].imported).toBe(0);
    expect(rows[0].event_source).toBe('STAR');
    expect(rows[0].status).toBe('PENDING_REVIEW');
    expect(rows[1].imported).toBe(1);
    expect(rows[2].imported).toBe(1);
    expect(rows[2].decision).toBe('REJECT');
    await expect(statusFor(CODE_IMPORTED, 2026)).resolves.toEqual({
      year: 2026,
      status: 'pending_review',
      resubmittable: false,
    });
  });

  it('drops inactive, duplicate and other-platform rows, and keeps the other year for the rule', async () => {
    const rows = await rowsFor(CODE_IGNORED);
    const years = rows.map((row) => Number(row.result_year)).sort();

    expect(years).toEqual([2025, 2026]);
    await expect(statusFor(CODE_IGNORED, 2026)).resolves.toEqual({
      year: 2026,
      status: 'pending_review',
      resubmittable: false,
    });
    await expect(statusFor(CODE_IGNORED, 2025)).resolves.toEqual({
      year: 2025,
      status: 'rejected',
      resubmittable: true,
    });

    const tipRows = await rowsFor(CODE_IGNORED, 'TIP');
    expect(tipRows).toHaveLength(1);
    await expect(statusFor(CODE_IGNORED, 2026, 'TIP')).resolves.toEqual({
      year: 2026,
      status: 'rejected',
      resubmittable: true,
    });
  });

  it('an imported decision with an empty body counts for result_year', async () => {
    const rows = await rowsFor(CODE_IMPORTED_DECISION);

    expect(rows).toHaveLength(1);
    expect(rows[0].imported).toBe(1);
    expect(rows[0].phase_year).toBeNull();
    await expect(statusFor(CODE_IMPORTED_DECISION, 2026)).resolves.toEqual({
      year: 2026,
      status: 'rejected',
      resubmittable: true,
    });
  });

  it('S-4: a code with no rows is never pushed', async () => {
    await expect(rowsFor(CODE_EMPTY)).resolves.toEqual([]);
    await expect(statusFor(CODE_EMPTY, 2026)).resolves.toEqual({
      year: 2026,
      status: 'never_pushed',
      resubmittable: true,
    });
  });
});
