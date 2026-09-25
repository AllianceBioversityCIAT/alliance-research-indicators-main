import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import {
  PrmsSyncHistoryReader,
  mapHistoryEvent,
} from './prms-sync-history.reader';

/**
 * Six kinds named by T-01, plus one discriminator the (d) mutation needs.
 *
 * The task enumerates 6 rows and also says dropping `status = 'PENDING_REVIEW'`
 * moves sync_count 2→3. That move is impossible if every same-year active
 * non-duplicate STAR row is already PENDING_REVIEW — the PRMS row is not
 * STAR, and the duplicate / inactive / foreign-year rows are still excluded
 * by the predicates (d) does not touch. Row 104 is that discriminator:
 * STAR, status not PENDING_REVIEW, already inside the timeline (so events
 * stay at 4) and outside the count (so the count moves 2→3).
 *
 * COALESCE keys are all distinct (KZ-004). The PRMS row's decided_at is the
 * latest COALESCE key; its occurred_at is not the latest occurred_at, so
 * ORDER BY occurred_at changes the head.
 */
const RESULT_ID = 42;
const OFFICIAL_CODE = 88001;
const YEAR = 2024;
const FOREIGN_YEAR = 2023;

type FixtureRow = {
  id: number;
  event_source: 'STAR' | 'PRMS';
  status: string | null;
  decision: string | null;
  occurred_at: string;
  decided_at: string | null;
  justification: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  first_name: string | null;
  last_name: string | null;
  duplicate_of_id: number | null;
  is_active: boolean;
  result_official_code: number;
  result_year: number;
};

const FIXTURE: FixtureRow[] = [
  {
    id: 101,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    decision: null,
    occurred_at: '2026-01-10T08:00:00.000Z',
    decided_at: null,
    justification: null,
    reviewer_name: null,
    reviewer_role: null,
    first_name: 'Ana',
    last_name: 'Alpha',
    duplicate_of_id: null,
    is_active: true,
    result_official_code: OFFICIAL_CODE,
    result_year: YEAR,
  },
  {
    id: 102,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    decision: null,
    occurred_at: '2026-05-20T09:00:00.000Z',
    decided_at: null,
    justification: 'second push',
    reviewer_name: 'Stray Reviewer',
    reviewer_role: null,
    first_name: 'Bea',
    last_name: 'Bravo',
    duplicate_of_id: null,
    is_active: true,
    result_official_code: OFFICIAL_CODE,
    result_year: YEAR,
  },
  {
    id: 103,
    event_source: 'PRMS',
    status: null,
    decision: 'APPROVE',
    occurred_at: '2026-02-15T10:00:00.000Z',
    decided_at: '2026-09-01T12:00:00.000Z',
    justification: '  looks good\n',
    reviewer_name: 'Carmen Reviewer',
    reviewer_role: 'PI',
    first_name: 'ShouldNot',
    last_name: 'Leak',
    duplicate_of_id: null,
    is_active: true,
    result_official_code: OFFICIAL_CODE,
    result_year: YEAR,
  },
  {
    id: 104,
    event_source: 'STAR',
    status: 'APPROVED',
    decision: null,
    occurred_at: '2026-03-03T11:00:00.000Z',
    decided_at: null,
    justification: null,
    reviewer_name: null,
    reviewer_role: null,
    first_name: 'Dee',
    last_name: 'Delta',
    duplicate_of_id: null,
    is_active: true,
    result_official_code: OFFICIAL_CODE,
    result_year: YEAR,
  },
  {
    id: 105,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    decision: null,
    occurred_at: '2026-04-04T12:00:00.000Z',
    decided_at: null,
    justification: 'duplicate delivery',
    reviewer_name: null,
    reviewer_role: null,
    first_name: 'Eve',
    last_name: 'Echo',
    duplicate_of_id: 101,
    is_active: true,
    result_official_code: OFFICIAL_CODE,
    result_year: YEAR,
  },
  {
    id: 106,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    decision: null,
    occurred_at: '2026-06-06T13:00:00.000Z',
    decided_at: null,
    justification: 'inactive',
    reviewer_name: null,
    reviewer_role: null,
    first_name: 'Fay',
    last_name: 'Foxtrot',
    duplicate_of_id: null,
    is_active: false,
    result_official_code: OFFICIAL_CODE,
    result_year: YEAR,
  },
  {
    id: 107,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    decision: null,
    occurred_at: '2026-07-07T14:00:00.000Z',
    decided_at: null,
    justification: 'other year',
    reviewer_name: null,
    reviewer_role: null,
    first_name: 'Gus',
    last_name: 'Golf',
    duplicate_of_id: null,
    is_active: true,
    result_official_code: OFFICIAL_CODE,
    result_year: FOREIGN_YEAR,
  },
];

const RESULT_ROW = {
  result_official_code: OFFICIAL_CODE,
  report_year_id: YEAR,
  prms_result_code: 452,
  prms_phase_id: 6,
};

describe('PrmsSyncHistoryReader', () => {
  const query = jest.fn();
  const reader = new PrmsSyncHistoryReader({
    query,
  } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
  });

  it('returns the newest event first, counts only STAR pending pushes, and resolves the actor by source', async () => {
    installFixture(query, FIXTURE, [RESULT_ROW]);

    const history = await reader.getHistory(RESULT_ID);

    const eventsSql = issuedCall(query, /FROM result_prms_sync_history h/);
    const countSql = issuedCall(query, /COUNT\(\*\)/);
    const metaSql = issuedCall(query, /prms_phase_id/);

    expect({
      head: history.events[0]?.id,
      ids: history.events.map((event) => event.id),
      length: history.events.length,
      sync_count: history.sync_count,
    }).toEqual({
      head: 103,
      ids: [103, 102, 104, 101],
      length: 4,
      sync_count: 2,
    });

    expect(metaSql.sql).toMatch(/result_official_code/);
    expect(metaSql.sql).toMatch(/report_year_id/);
    expect(metaSql.sql).toMatch(/prms_result_code/);
    expect(metaSql.sql).toMatch(/prms_phase_id/);
    expect(metaSql.sql).not.toMatch(/\bOR\b/);
    expect(metaSql.params).toEqual([RESULT_ID]);

    expect(eventsSql.sql).toMatch(
      /ORDER BY COALESCE\(h\.decided_at, h\.occurred_at\) DESC, h\.id DESC/,
    );
    expect(eventsSql.sql).toMatch(/duplicate_of_id IS NULL/);
    expect(eventsSql.sql).toMatch(/is_active = TRUE/);
    expect(eventsSql.sql).toMatch(/h\.result_year = \?/);
    expect(eventsSql.sql).toMatch(/h\.result_official_code = \?/);
    expect(eventsSql.sql).toMatch(/LEFT JOIN sec_users/);
    expect(eventsSql.sql).not.toMatch(/\bOR\b/);
    expect(eventsSql.params).toEqual([OFFICIAL_CODE, YEAR]);

    expect(countSql.sql).toMatch(/event_source = 'STAR'/);
    expect(countSql.sql).toMatch(/status = 'PENDING_REVIEW'/);
    expect(countSql.sql).toMatch(/duplicate_of_id IS NULL/);
    expect(countSql.sql).toMatch(/is_active = TRUE/);
    expect(countSql.sql).toMatch(/result_year = \?/);
    expect(countSql.sql).not.toMatch(/\bOR\b/);
    expect(countSql.params).toEqual([OFFICIAL_CODE, YEAR]);

    expect(history.prms_result_code).toBe(452);
    expect(history.prms_phase_id).toBe(6);
    expect(history.sync_count).toBe(2);
    expect(history.events.map((event) => event.id)).toEqual([
      103, 102, 104, 101,
    ]);

    const head = history.events[0];
    expect(head.id).toBe(103);
    expect(head.event_source).toBe('PRMS');
    expect(head.decision).toBe('APPROVE');
    expect(head.actor_name).toBeNull();
    expect(head.actor_name_short).toBeNull();
    expect(head.reviewer_name).toBe('Carmen Reviewer');
    expect(head.reviewer_role).toBe('PI');
    expect(head.justification).toBe('  looks good\n');

    const star = history.events.find((event) => event.id === 102);
    expect(star?.actor_name).toBe('Bea Bravo');
    expect(star?.actor_name_short).toBe('Bea Bravo');
    expect(star?.reviewer_name).toBeNull();

    expect(history.events.map((event) => event.id)).not.toContain(105);
    expect(history.events.map((event) => event.id)).not.toContain(106);
    expect(history.events.map((event) => event.id)).not.toContain(107);
  });

  it('returns an empty timeline and sync_count 0 when the result was never synced', async () => {
    installFixture(
      query,
      [],
      [
        {
          result_official_code: OFFICIAL_CODE,
          report_year_id: YEAR,
          prms_result_code: null,
          prms_phase_id: null,
        },
      ],
    );

    const history = await reader.getHistory(RESULT_ID);

    expect(history.events).toEqual([]);
    expect(history.sync_count).toBe(0);
    expect(history.prms_result_code).toBeNull();
    expect(history.prms_phase_id).toBeNull();
  });

  it('carries a null prms_phase_id when the column is null', async () => {
    installFixture(
      query,
      [],
      [
        {
          result_official_code: OFFICIAL_CODE,
          report_year_id: YEAR,
          prms_result_code: 452,
          prms_phase_id: null,
        },
      ],
    );

    const history = await reader.getHistory(RESULT_ID);

    expect(history.prms_result_code).toBe(452);
    expect(history.prms_phase_id).toBeNull();
  });

  it('throws NotFoundException when the result does not exist', async () => {
    installFixture(query, FIXTURE, []);

    await expect(reader.getHistory(RESULT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('logs the official code and year when a history query fails, never the SQL', async () => {
    query.mockImplementation((sql: string) => {
      if (/prms_phase_id/.test(sql)) {
        return Promise.resolve([RESULT_ROW]);
      }
      return Promise.reject(new Error('history read boom'));
    });
    const spy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);

    await expect(reader.getHistory(RESULT_ID)).rejects.toThrow(
      'history read boom',
    );

    const message = String(spy.mock.calls[0]?.[0]);
    expect(message).toContain(String(OFFICIAL_CODE));
    expect(message).toContain(String(YEAR));
    expect(message).not.toMatch(/SELECT/i);
    expect(message).not.toContain('Carmen');
    spy.mockRestore();
  });

  it('title-cases a STAR actor name taken from uppercase sec_users columns', () => {
    const mapped = mapHistoryEvent({
      id: 1,
      event_source: 'STAR',
      status: 'PENDING_REVIEW',
      decision: null,
      occurred_at: '2026-01-10T08:00:00.000Z',
      decided_at: null,
      justification: null,
      reviewer_name: null,
      reviewer_role: null,
      first_name: 'DAVID FELIPE',
      last_name: 'CASAÑAS HERNANDEZ',
    });

    expect(mapped.actor_name).toBe('David Felipe Casañas Hernandez');
    expect(mapped.actor_name_short).toBe('David Casañas');
  });

  it('builds the short name from the first token of each sec_users column', () => {
    const oneGivenThreeSurnames = mapHistoryEvent({
      id: 2,
      event_source: 'STAR',
      status: 'PENDING_REVIEW',
      decision: null,
      occurred_at: '2026-01-10T08:00:00.000Z',
      decided_at: null,
      justification: null,
      reviewer_name: null,
      reviewer_role: null,
      first_name: 'ANA',
      last_name: 'LOPEZ GARCIA MARTINEZ',
    });
    expect(oneGivenThreeSurnames.actor_name).toBe('Ana Lopez Garcia Martinez');
    expect(oneGivenThreeSurnames.actor_name_short).toBe('Ana Lopez');

    const twoGivenOneSurname = mapHistoryEvent({
      id: 3,
      event_source: 'STAR',
      status: 'PENDING_REVIEW',
      decision: null,
      occurred_at: '2026-01-10T08:00:00.000Z',
      decided_at: null,
      justification: null,
      reviewer_name: null,
      reviewer_role: null,
      first_name: 'MARIA FERNANDA',
      last_name: 'RUIZ',
    });
    expect(twoGivenOneSurname.actor_name).toBe('Maria Fernanda Ruiz');
    expect(twoGivenOneSurname.actor_name_short).toBe('Maria Ruiz');
  });
});

function installFixture(
  query: jest.Mock,
  rows: FixtureRow[],
  resultRows: Array<Record<string, unknown>>,
): void {
  query.mockImplementation((sql: string, params: unknown[] = []) => {
    if (/prms_phase_id/.test(sql)) {
      return Promise.resolve(resultRows);
    }
    if (/result_prms_sync_history/.test(sql)) {
      return Promise.resolve(projectHistory(sql, params, rows));
    }
    return Promise.resolve([]);
  });
}

function issuedCall(
  query: jest.Mock,
  pattern: RegExp,
): { sql: string; params: unknown[] } {
  const call = query.mock.calls.find((entry) =>
    pattern.test(entry[0] as string),
  );
  if (!call) {
    throw new Error(`no query matched ${pattern}`);
  }
  return { sql: call[0] as string, params: (call[1] as unknown[]) ?? [] };
}

/**
 * Applies the predicates and the ORDER BY that are actually present in the
 * emitted SQL text. Dropping a predicate from the reader stops the regex
 * matching, so the row the predicate existed to exclude comes back — the
 * red is the SQL string, not the mock call sequence (KZ-001).
 */
function projectHistory(
  sql: string,
  params: unknown[],
  rows: FixtureRow[],
): FixtureRow[] | Array<Record<string, number>> {
  let matched = rows.slice();
  const [code, year] = params;

  if (/result_official_code\s*=\s*\?/.test(sql)) {
    matched = matched.filter(
      (row) => String(row.result_official_code) === String(code),
    );
  }
  if (/result_year\s*=\s*\?/.test(sql)) {
    matched = matched.filter((row) => Number(row.result_year) === Number(year));
  }
  if (/duplicate_of_id\s+IS\s+NULL/i.test(sql)) {
    matched = matched.filter((row) => row.duplicate_of_id == null);
  }
  if (/is_active\s*=\s*TRUE/i.test(sql)) {
    matched = matched.filter((row) => row.is_active);
  }
  if (/event_source\s*=\s*'STAR'/.test(sql)) {
    matched = matched.filter((row) => row.event_source === 'STAR');
  }
  if (/status\s*=\s*'PENDING_REVIEW'/.test(sql)) {
    matched = matched.filter((row) => row.status === 'PENDING_REVIEW');
  }

  if (/COUNT\(\*\)/i.test(sql)) {
    return [{ 'COUNT(*)': matched.length }];
  }

  if (
    /ORDER BY\s+COALESCE\s*\(\s*h\.decided_at\s*,\s*h\.occurred_at\s*\)\s+DESC/i.test(
      sql,
    )
  ) {
    matched.sort((a, b) => {
      const left = a.decided_at ?? a.occurred_at;
      const right = b.decided_at ?? b.occurred_at;
      if (left === right) {
        return b.id - a.id;
      }
      return left < right ? 1 : -1;
    });
  } else if (/ORDER BY\s+(?:h\.)?occurred_at\s+DESC/i.test(sql)) {
    matched.sort((a, b) => {
      if (a.occurred_at === b.occurred_at) {
        return b.id - a.id;
      }
      return a.occurred_at < b.occurred_at ? 1 : -1;
    });
  }

  return matched;
}
