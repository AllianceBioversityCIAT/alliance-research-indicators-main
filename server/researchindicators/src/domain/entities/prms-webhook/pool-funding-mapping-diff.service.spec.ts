import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsWebhookCallbackModule } from './prms-webhook-callback.module';
import {
  PoolFundingChanges,
  PoolFundingMappingDiffService,
} from './pool-funding-mapping-diff.service';

// KZ-017 — this fake filters AND-predicates and refuses OR. It does not
// run MySQL, so operator precedence stays unproven. Dates compare by
// instant. A dropped `created_at <= ?` changes which push is paired.

const CODE = '19949';
const YEAR = 2026;
const HISTORY_ID = 77;
const T_OLDEST = new Date('2026-09-01T00:00:00.000Z');
const T_EARLIER = new Date('2026-09-05T00:00:00.000Z');
const T_REJECTED = new Date('2026-09-08T00:00:00.000Z');
const T_DECISION = new Date('2026-09-10T00:00:00.000Z');
const T_LATER = new Date('2026-09-20T00:00:00.000Z');
const T_OCCURRED_AFTER = new Date('2026-09-25T00:00:00.000Z');

interface LogRow {
  id: number;
  external_reference: string;
  result_year: number;
  outcome: string;
  created_at: Date;
  request_payload: unknown;
}

interface HistoryRow {
  id: number;
  result_official_code: string | null;
  decided_at: Date | null;
  occurred_at: Date | null;
  raw_body: unknown;
}

interface RecordedQuery {
  sql: string;
  params: unknown[];
}

const sentPayload = (
  toc: Record<string, unknown>,
  contributing?: Record<string, unknown>[],
): Record<string, unknown> => {
  const data: Record<string, unknown> = { toc_mapping: toc };
  if (contributing) {
    data.contributing_programs = contributing;
  }
  return { results: [{ data }] };
};

const callbackBody = (
  entries: Record<string, unknown>[],
): Record<string, unknown> => ({
  data: { obj_results_toc_result: entries },
});

const primary = (
  mappings: Record<string, unknown>[],
  officialCode = 'SP06',
): Record<string, unknown> => ({
  official_code: officialCode,
  initiative_role: 'Primary submitter',
  toc_mappings: mappings,
});

const contributingEntry = (officialCode: string): Record<string, unknown> => ({
  official_code: officialCode,
  initiative_role: 'Contributing',
  toc_mappings: [],
});

const logRow = (overrides: Partial<LogRow> = {}): LogRow => ({
  id: 1,
  external_reference: CODE,
  result_year: YEAR,
  outcome: 'ACCEPTED',
  created_at: T_EARLIER,
  request_payload: sentPayload({
    science_program_id: 'SP06',
    result_title: 'Same title',
    toc_result_id: 7290,
  }),
  ...overrides,
});

const historyRow = (overrides: Partial<HistoryRow> = {}): HistoryRow => ({
  id: HISTORY_ID,
  result_official_code: CODE,
  decided_at: T_DECISION,
  occurred_at: T_DECISION,
  raw_body: callbackBody([
    primary([{ title: 'Same title', toc_result_id: 7290 }]),
  ]),
  ...overrides,
});

class FakePairingTables {
  history: HistoryRow[] = [];
  logs: LogRow[] = [];
  queries: RecordedQuery[] = [];

  readonly query = jest.fn((sql: string, params: unknown[] = []) =>
    this.execute(sql, params),
  );

  async execute(sql: string, params: unknown[] = []): Promise<unknown> {
    this.queries.push({ sql, params });
    if (
      /^\s*SELECT\b/i.test(sql) &&
      /\bFROM\s+result_prms_sync_history\b/i.test(sql)
    ) {
      return this.selectHistory(sql, params);
    }
    if (
      /^\s*SELECT\b/i.test(sql) &&
      /\bFROM\s+result_prms_sync_log\b/i.test(sql)
    ) {
      return this.selectLogs(sql, params);
    }
    if (/^\s*UPDATE\s+result_prms_sync_history\b/i.test(sql)) {
      return { affectedRows: 1 };
    }
    throw new Error(`FakePairingTables: unsupported SQL\n${sql}`);
  }

  private selectHistory(sql: string, params: unknown[]): HistoryRow[] {
    const id = this.boundId(sql, params);
    return this.history
      .filter((row) => row.id === id)
      .map((row) => ({
        ...row,
      }));
  }

  private boundId(sql: string, params: unknown[]): unknown {
    if (!/\bWHERE\s+id\s*=\s*\?/i.test(sql)) {
      throw new Error(
        `FakePairingTables: history SELECT without id = ?\n${sql}`,
      );
    }
    if (params.length !== 1) {
      throw new Error(
        `FakePairingTables: history SELECT expected 1 param, got ${params.length}`,
      );
    }
    return params[0];
  }

  private selectLogs(
    sql: string,
    params: unknown[],
  ): Array<{ request_payload: unknown }> {
    const whereMatch = /WHERE\s+([\s\S]+?)(?:\bORDER\s+BY\b|\bLIMIT\b|$)/i.exec(
      sql,
    );
    if (!whereMatch) {
      throw new Error(`FakePairingTables: log SELECT without WHERE\n${sql}`);
    }
    const where = whereMatch[1];
    if (/\bOR\b/i.test(where)) {
      throw new Error(
        'FakePairingTables refuses OR — SQL precedence is unmodeled (KZ-017)',
      );
    }
    const parts = where
      .split(/\bAND\b/i)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    let paramIndex = 0;
    const checks: Array<(row: LogRow) => boolean> = [];
    for (const part of parts) {
      const comparison = /^(\w+)\s*(<=|=)\s*(.+)$/i.exec(part);
      if (!comparison) {
        throw new Error(
          `FakePairingTables: unparsed predicate "${part}"\n${sql}`,
        );
      }
      const column = comparison[1] as keyof LogRow;
      const operator = comparison[2];
      const raw = comparison[3].trim();
      let expected: unknown;
      if (raw === '?') {
        expected = params[paramIndex++];
      } else if (/^'(.*)'$/.test(raw)) {
        expected = /^'(.*)'$/.exec(raw)?.[1];
      } else {
        throw new Error(`FakePairingTables: unsupported literal ${raw}`);
      }
      checks.push((row) => this.matches(row, column, operator, expected));
    }
    if (paramIndex !== params.length) {
      throw new Error(
        `FakePairingTables: ${paramIndex} placeholders vs ${params.length} params`,
      );
    }
    let matched = this.logs.filter((row) =>
      checks.every((check) => check(row)),
    );
    if (/ORDER\s+BY\s+created_at\s+DESC,\s*id\s+DESC/i.test(sql)) {
      matched = [...matched].sort((a, b) => {
        const byTime = b.created_at.getTime() - a.created_at.getTime();
        return byTime !== 0 ? byTime : b.id - a.id;
      });
    }
    if (/\bLIMIT\s+1\b/i.test(sql)) {
      matched = matched.slice(0, 1);
    }
    return matched.map((row) => ({ request_payload: row.request_payload }));
  }

  private matches(
    row: LogRow,
    column: keyof LogRow,
    operator: string,
    expected: unknown,
  ): boolean {
    const actual = row[column];
    if (operator === '<=') {
      const left = actual instanceof Date ? actual.getTime() : Number.NaN;
      const right =
        expected instanceof Date
          ? expected.getTime()
          : new Date(String(expected)).getTime();
      return left <= right;
    }
    if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();
    }
    return actual === expected;
  }
}

const normalizeSql = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const changesUpdate = (table: FakePairingTables): RecordedQuery => {
  const updates = table.queries.filter((query) =>
    /^\s*UPDATE\s+result_prms_sync_history\b/i.test(query.sql),
  );
  expect(updates).toHaveLength(1);
  return updates[0];
};

const parsedChanges = (table: FakePairingTables): PoolFundingChanges => {
  const update = changesUpdate(table);
  expect(normalizeSql(update.sql)).toBe(
    'UPDATE result_prms_sync_history SET changes = ? WHERE id = ?',
  );
  expect(update.params).toHaveLength(2);
  expect(update.params[1]).toBe(HISTORY_ID);
  expect(typeof update.params[0]).toBe('string');
  return JSON.parse(update.params[0] as string) as PoolFundingChanges;
};

describe('PoolFundingMappingDiffService', () => {
  let table: FakePairingTables;
  let service: PoolFundingMappingDiffService;
  let warn: jest.SpyInstance;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    table = new FakePairingTables();
    warn = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    errorLog = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
    service = new PoolFundingMappingDiffService({
      query: table.query,
    } as unknown as DataSource);
  });

  afterEach(() => {
    warn.mockRestore();
    errorLog.mockRestore();
  });

  const record = (): Promise<void> =>
    service.record({ historyId: HISTORY_ID, resultYear: YEAR });

  it('is provided by PrmsWebhookCallbackModule', () => {
    const providers: unknown[] = Reflect.getMetadata(
      'providers',
      PrmsWebhookCallbackModule,
    );
    expect(providers).toContain(PoolFundingMappingDiffService);
  });

  describe('(a) a changed title emits one key', () => {
    it('writes only Theory of Change result', async () => {
      table.logs = [
        logRow({
          request_payload: sentPayload({
            science_program_id: 'SP06',
            result_title: 'Old title',
            toc_result_id: 7290,
          }),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([
            primary([{ title: 'New title', toc_result_id: 7290 }]),
          ]),
        }),
      ];

      await record();

      const changes = parsedChanges(table);
      expect(changes).toEqual({
        'Theory of Change result': { before: 'Old title', after: 'New title' },
      });
      expect(changesUpdate(table).params).toEqual([
        JSON.stringify(changes),
        HISTORY_ID,
      ]);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('(b) nothing changed writes {}', () => {
    it('omits equal fields and the unobservable indicator description', async () => {
      table.logs = [
        logRow({
          request_payload: sentPayload(
            {
              science_program_id: 'SP06',
              result_title: 'Same title',
              toc_result_id: 7290,
              result_indicator_description: 'sent but not observable',
            },
            [{ science_program_id: 'SP02' }],
          ),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([
            primary([
              {
                title: 'Same title',
                toc_result_id: 7290,
                level: 'Outcome',
              },
            ]),
            contributingEntry('SP02'),
          ]),
        }),
      ];

      await record();

      expect(changesUpdate(table).params).toEqual(['{}', HISTORY_ID]);
      expect(parsedChanges(table)).toEqual({});
    });
  });

  describe('(c) a blank we sent and PRMS filled', () => {
    it('records before null when toc_result_id was omitted', async () => {
      table.logs = [
        logRow({
          request_payload: sentPayload({
            science_program_id: 'SP06',
            result_title: 'Same title',
          }),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([
            primary([{ title: 'Same title', toc_result_id: 7290 }]),
          ]),
        }),
      ];

      await record();

      expect(parsedChanges(table)).toEqual({
        'Theory of Change result ID': { before: null, after: '7290' },
      });
    });
  });

  describe('(d) duplicated toc_mappings collapse to one', () => {
    it('emits one id change, not two copies of the same mapping', async () => {
      const mapping = { title: 'Kept', toc_result_id: 7290, level: 'Output' };
      table.logs = [
        logRow({
          request_payload: sentPayload({
            science_program_id: 'SP06',
            result_title: 'Kept',
          }),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([primary([mapping, { ...mapping }])]),
        }),
      ];

      await record();

      expect(parsedChanges(table)).toEqual({
        'Theory of Change result ID': { before: null, after: '7290' },
      });
    });
  });

  describe('(e) contributing programs are a set', () => {
    it('treats a reorder as no change and does not count the primary', async () => {
      table.logs = [
        logRow({
          request_payload: sentPayload(
            {
              science_program_id: 'SP06',
              result_title: 'Same title',
              toc_result_id: 7290,
            },
            [{ science_program_id: 'SP03' }, { science_program_id: 'SP02' }],
          ),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([
            primary([{ title: 'Same title', toc_result_id: 7290 }]),
            contributingEntry('SP02'),
            contributingEntry('SP03'),
          ]),
        }),
      ];

      await record();

      expect(parsedChanges(table)).toEqual({});
    });

    it('emits a sorted pair when membership differs', async () => {
      table.logs = [
        logRow({
          request_payload: sentPayload(
            {
              science_program_id: 'SP06',
              result_title: 'Same title',
              toc_result_id: 7290,
            },
            [{ science_program_id: 'SP02' }],
          ),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([
            primary([{ title: 'Same title', toc_result_id: 7290 }]),
            contributingEntry('SP04'),
            contributingEntry('SP02'),
          ]),
        }),
      ];

      await record();

      expect(parsedChanges(table)).toEqual({
        'Contributing Science Programs': {
          before: ['SP02'],
          after: ['SP02', 'SP04'],
        },
      });
    });
  });

  describe('(f) no matching ACCEPTED push', () => {
    it('writes {} and logs one line', async () => {
      table.logs = [
        logRow({
          id: 9,
          outcome: 'REJECTED_BY_PRMS',
          created_at: T_EARLIER,
          request_payload: sentPayload({
            science_program_id: 'SP06',
            result_title: 'Rejected title',
          }),
        }),
      ];
      table.history = [
        historyRow({
          raw_body: callbackBody([
            primary([{ title: 'From PRMS', toc_result_id: 7290 }]),
          ]),
        }),
      ];

      await record();

      expect(changesUpdate(table).params).toEqual(['{}', HISTORY_ID]);
      expect(parsedChanges(table)).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain(
        `external_reference=${CODE}`,
      );
      expect(String(warn.mock.calls[0][0])).toContain(`result_year=${YEAR}`);
      expect(String(warn.mock.calls[0][0])).toContain('ACCEPTED');
      expect(errorLog).not.toHaveBeenCalled();
    });
  });

  describe('(g) the decision pairs with the earlier ACCEPTED push', () => {
    const bracketedPushes = (): LogRow[] => [
      logRow({
        id: 1,
        created_at: T_OLDEST,
        request_payload: sentPayload({
          science_program_id: 'SP06',
          result_title: 'Oldest title',
          toc_result_id: 1,
        }),
      }),
      logRow({
        id: 2,
        created_at: T_EARLIER,
        request_payload: sentPayload({
          science_program_id: 'SP06',
          result_title: 'Earlier title',
          toc_result_id: 2,
        }),
      }),
      logRow({
        id: 3,
        created_at: T_REJECTED,
        outcome: 'REJECTED_BY_PRMS',
        request_payload: sentPayload({
          science_program_id: 'SP06',
          result_title: 'Rejected title',
        }),
      }),
      logRow({
        id: 4,
        created_at: T_LATER,
        request_payload: sentPayload({
          science_program_id: 'SP06',
          result_title: 'Later title',
          toc_result_id: 4,
        }),
      }),
    ];

    it('uses decided_at as the cutoff, not a later occurred_at', async () => {
      table.logs = bracketedPushes();
      table.history = [
        historyRow({
          decided_at: T_DECISION,
          occurred_at: T_OCCURRED_AFTER,
          raw_body: callbackBody([
            primary([{ title: 'From PRMS', toc_result_id: 9 }]),
          ]),
        }),
      ];

      await record();

      const logSelect = table.queries.find((query) =>
        /\bFROM\s+result_prms_sync_log\b/i.test(query.sql),
      );
      expect(logSelect).toBeDefined();
      const sql = normalizeSql(logSelect?.sql ?? '');
      expect(sql).toContain('external_reference = ?');
      expect(sql).toContain('result_year = ?');
      expect(sql).toContain("outcome = 'ACCEPTED'");
      expect(sql).toContain('created_at <= ?');
      expect(sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(sql).toContain('LIMIT 1');
      expect(logSelect?.params).toEqual([CODE, YEAR, T_DECISION]);
      expect(parsedChanges(table)['Theory of Change result']).toEqual({
        before: 'Earlier title',
        after: 'From PRMS',
      });
    });

    it('falls back to occurred_at when decided_at is null', async () => {
      table.logs = bracketedPushes();
      table.history = [
        historyRow({
          decided_at: null,
          occurred_at: T_DECISION,
          raw_body: callbackBody([
            primary([{ title: 'From PRMS', toc_result_id: 9 }]),
          ]),
        }),
      ];

      await record();

      const logSelect = table.queries.find((query) =>
        /\bFROM\s+result_prms_sync_log\b/i.test(query.sql),
      );
      expect(logSelect?.params).toEqual([CODE, YEAR, T_DECISION]);
      expect(parsedChanges(table)['Theory of Change result']?.before).toBe(
        'Earlier title',
      );
    });
  });

  describe('a failure stays inside the service', () => {
    it('resolves when the query throws and does not write changes', async () => {
      table.query.mockRejectedValue(new Error('connection reset'));

      await expect(record()).resolves.toBeUndefined();

      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(String(errorLog.mock.calls[0][0])).toContain(`id=${HISTORY_ID}`);
      expect(String(errorLog.mock.calls[0][0])).toContain('connection reset');
      expect(
        table.queries.filter((query) => /^\s*UPDATE\b/i.test(query.sql)),
      ).toEqual([]);
    });
  });
});
