import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsWebhookCallbackModule } from './prms-webhook-callback.module';
import {
  PoolFundingChanges,
  PoolFundingMappingDiffService,
} from './pool-funding-mapping-diff.service';

// KZ-001 — assertions are on the SQL text and the parameter arrays.
// KZ-017 — this fake filters the predicates it understands. It does not
// run MySQL, so joins, collation, and boolean storage stay unproven.
// A dropped `is_snapshot = TRUE` returns the live row, which has no ToC.

const CODE = '19949';
const YEAR = 2026;
const HISTORY_ID = 77;
const LIVE_ID = 10;
const VERSION_ID = 20;

interface ResultRow {
  result_id: number;
  result_official_code: string;
  report_year_id: number;
  is_snapshot: boolean;
  is_active: boolean;
}

interface TocRow {
  result_id: number;
  sp_code: string;
  level: string | null;
  toc_result_id: number | null;
  toc_result_title: string | null;
  indicator_description: string | null;
  quantitative_contribution: string | null;
  unit_messurament: string | null;
  target_value: string | null;
  target_year: number | null;
  is_active: boolean;
}

interface SpRow {
  result_id: number;
  sp_code: string;
  sp_role: string;
  is_active: boolean;
  alignment_active: boolean;
}

interface HistoryRow {
  id: number;
  result_official_code: string | null;
  result_year: number | null;
  raw_body: unknown;
}

interface RecordedQuery {
  sql: string;
  params: unknown[];
}

const callbackBody = (
  entries: Record<string, unknown>[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  data: { ...extra, obj_results_toc_result: entries },
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

const decoy = {
  obj_result_level: { name: 'Outcome' },
  result_level_id: 4,
};

const historyRow = (overrides: Partial<HistoryRow> = {}): HistoryRow => ({
  id: HISTORY_ID,
  result_official_code: CODE,
  result_year: YEAR,
  raw_body: callbackBody([
    primary([
      {
        title: 'Same title',
        toc_result_id: 7290,
        level: 'Intermediate Outcome',
      },
    ]),
  ]),
  ...overrides,
});

const liveResult = (): ResultRow => ({
  result_id: LIVE_ID,
  result_official_code: CODE,
  report_year_id: YEAR,
  is_snapshot: false,
  is_active: true,
});

const versionResult = (overrides: Partial<ResultRow> = {}): ResultRow => ({
  result_id: VERSION_ID,
  result_official_code: CODE,
  report_year_id: YEAR,
  is_snapshot: true,
  is_active: true,
  ...overrides,
});

const versionToc = (overrides: Partial<TocRow> = {}): TocRow => ({
  result_id: VERSION_ID,
  sp_code: 'SP06',
  level: 'Intermediate Outcome',
  toc_result_id: 7290,
  toc_result_title: 'Same title',
  indicator_description: null,
  quantitative_contribution: null,
  unit_messurament: null,
  target_value: null,
  target_year: null,
  is_active: true,
  ...overrides,
});

const versionSp = (overrides: Partial<SpRow> = {}): SpRow => ({
  result_id: VERSION_ID,
  sp_code: 'SP06',
  sp_role: 'PRIMARY',
  is_active: true,
  alignment_active: true,
  ...overrides,
});

class FakeVersionDb {
  history: HistoryRow[] = [];
  results: ResultRow[] = [liveResult(), versionResult()];
  tocs: TocRow[] = [versionToc()];
  sps: SpRow[] = [versionSp()];
  queries: RecordedQuery[] = [];

  readonly query = jest.fn((sql: string, params: unknown[] = []) =>
    this.execute(sql, params),
  );

  async execute(sql: string, params: unknown[] = []): Promise<unknown> {
    this.queries.push({ sql, params });
    if (/\bFROM\s+result_prms_sync_log\b/i.test(sql)) {
      throw new Error(
        `diff must not read the sent payload\n${normalizeSql(sql)}`,
      );
    }
    if (
      /^\s*SELECT\b/i.test(sql) &&
      /\bFROM\s+result_prms_sync_history\b/i.test(sql)
    ) {
      return this.selectHistory(sql, params);
    }
    if (/^\s*SELECT\b/i.test(sql) && /\bFROM\s+results\b/i.test(sql)) {
      return this.selectResults(sql, params);
    }
    if (
      /^\s*SELECT\b/i.test(sql) &&
      /\bFROM\s+result_pool_funding_toc_alignment\b/i.test(sql)
    ) {
      return this.selectToc(sql, params);
    }
    if (
      /^\s*SELECT\b/i.test(sql) &&
      /\bresult_pool_funding_alignment_sp\b/i.test(sql)
    ) {
      return this.selectSp(sql, params);
    }
    if (/^\s*UPDATE\s+result_prms_sync_history\b/i.test(sql)) {
      return { affectedRows: 1 };
    }
    throw new Error(`FakeVersionDb: unsupported SQL\n${sql}`);
  }

  private selectHistory(sql: string, params: unknown[]): HistoryRow[] {
    if (!/\bWHERE\s+id\s*=\s*\?/i.test(sql)) {
      throw new Error(`FakeVersionDb: history SELECT without id = ?\n${sql}`);
    }
    if (params.length !== 1) {
      throw new Error(
        `FakeVersionDb: history SELECT expected 1 param, got ${params.length}`,
      );
    }
    return this.history.filter((row) => row.id === params[0]);
  }

  private selectResults(
    sql: string,
    params: unknown[],
  ): Array<{ result_id: number }> {
    const wantsSnapshot = /is_snapshot\s*=\s*TRUE\b/i.test(sql);
    const wantsLive = /is_snapshot\s*=\s*FALSE\b/i.test(sql);
    const wantsActive = /is_active\s*=\s*TRUE\b/i.test(sql);
    const code = params[0];
    const year = params[1];
    return this.results
      .filter((row) => {
        if (row.result_official_code !== code || row.report_year_id !== year) {
          return false;
        }
        if (wantsActive && !row.is_active) {
          return false;
        }
        if (wantsSnapshot) {
          return row.is_snapshot;
        }
        if (wantsLive) {
          return !row.is_snapshot;
        }
        return true;
      })
      .map((row) => ({ result_id: row.result_id }));
  }

  private selectToc(
    sql: string,
    params: unknown[],
  ): Array<Record<string, unknown>> {
    const requireActive = /is_active\s*=\s*TRUE\b/i.test(sql);
    const resultId = params[0];
    return this.tocs
      .filter(
        (row) =>
          row.result_id === resultId && (!requireActive || row.is_active),
      )
      .map((row) => ({
        sp_code: row.sp_code,
        level: row.level,
        toc_result_id: row.toc_result_id,
        toc_result_title: row.toc_result_title,
        indicator_description: row.indicator_description,
        quantitative_contribution: row.quantitative_contribution,
        unit_messurament: row.unit_messurament,
        target_value: row.target_value,
        target_year: row.target_year,
      }));
  }

  private selectSp(
    sql: string,
    params: unknown[],
  ): Array<Record<string, unknown>> {
    const requireSpActive = /sp\.is_active\s*=\s*TRUE\b/i.test(sql);
    const requireAlignmentActive = /a\.is_active\s*=\s*TRUE\b/i.test(sql);
    const resultId = params[0];
    return this.sps
      .filter((row) => {
        if (row.result_id !== resultId) {
          return false;
        }
        if (requireSpActive && !row.is_active) {
          return false;
        }
        if (requireAlignmentActive && !row.alignment_active) {
          return false;
        }
        return true;
      })
      .map((row) => ({ sp_code: row.sp_code, sp_role: row.sp_role }));
  }
}

const normalizeSql = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const changesUpdate = (table: FakeVersionDb): RecordedQuery => {
  const updates = table.queries.filter((query) =>
    /^\s*UPDATE\s+result_prms_sync_history\b/i.test(query.sql),
  );
  expect(updates).toHaveLength(1);
  return updates[0];
};

const parsedChanges = (table: FakeVersionDb): PoolFundingChanges => {
  const update = changesUpdate(table);
  expect(normalizeSql(update.sql)).toBe(
    'UPDATE result_prms_sync_history SET changes = ? WHERE id = ?',
  );
  expect(update.params).toHaveLength(2);
  expect(update.params[1]).toBe(HISTORY_ID);
  expect(typeof update.params[0]).toBe('string');
  return JSON.parse(update.params[0] as string) as PoolFundingChanges;
};

const queryFor = (table: FakeVersionDb, pattern: RegExp): RecordedQuery => {
  const found = table.queries.find((query) => pattern.test(query.sql));
  expect(found).toBeDefined();
  return found as RecordedQuery;
};

describe('PoolFundingMappingDiffService', () => {
  let table: FakeVersionDb;
  let service: PoolFundingMappingDiffService;
  let warn: jest.SpyInstance;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    table = new FakeVersionDb();
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

  const arm = (
    historyOverrides: Partial<HistoryRow> = {},
    tocOverrides: Partial<TocRow> = {},
    extraSps: SpRow[] = [],
  ): void => {
    table.history = [historyRow(historyOverrides)];
    table.tocs = [versionToc(tocOverrides)];
    table.sps = [versionSp(), ...extraSps];
  };

  it('is provided by PrmsWebhookCallbackModule', () => {
    const providers: unknown[] = Reflect.getMetadata(
      'providers',
      PrmsWebhookCallbackModule,
    );
    expect(providers).toContain(PoolFundingMappingDiffService);
  });

  describe('version resolution', () => {
    it('reads the snapshot ToC when the live row has none', async () => {
      arm({
        raw_body: callbackBody([
          primary([
            {
              title: 'Callback title',
              toc_result_id: 7290,
              level: 'Intermediate Outcome',
            },
          ]),
        ]),
      });
      table.tocs = [versionToc({ toc_result_title: 'Version title' })];

      await record();

      const snapshot = queryFor(table, /\bFROM\s+results\b/i);
      expect(normalizeSql(snapshot.sql)).toBe(
        'SELECT result_id FROM results WHERE result_official_code = ? AND report_year_id = ? AND is_snapshot = TRUE AND is_active = TRUE',
      );
      expect(snapshot.params).toEqual([CODE, YEAR]);
      const toc = queryFor(
        table,
        /\bFROM\s+result_pool_funding_toc_alignment\b/i,
      );
      expect(normalizeSql(toc.sql)).toBe(
        'SELECT sp_code, level, toc_result_id, toc_result_title, indicator_description, quantitative_contribution FROM result_pool_funding_toc_alignment WHERE result_id = ? AND is_active = TRUE',
      );
      expect(toc.params).toEqual([VERSION_ID]);
      const sps = queryFor(table, /\bresult_pool_funding_alignment_sp\b/i);
      expect(normalizeSql(sps.sql)).toBe(
        'SELECT sp.sp_code, sp.sp_role FROM result_pool_funding_alignment_sp sp INNER JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id WHERE a.result_id = ? AND a.is_active = TRUE AND sp.is_active = TRUE',
      );
      expect(sps.params).toEqual([VERSION_ID]);
      expect(parsedChanges(table)).toEqual({
        'Theory of Change result': {
          before: 'Version title',
          after: 'Callback title',
        },
      });
      expect(
        table.queries.some((query) =>
          /\bFROM\s+result_prms_sync_log\b/i.test(query.sql),
        ),
      ).toBe(false);
    });

    it('writes {} and logs when two active snapshots share the pair', async () => {
      arm({
        raw_body: callbackBody([
          primary([
            {
              title: 'Callback title',
              toc_result_id: 7290,
              level: 'Intermediate Outcome',
            },
          ]),
        ]),
      });
      table.results = [
        liveResult(),
        versionResult(),
        versionResult({ result_id: VERSION_ID + 1 }),
      ];

      await record();

      expect(parsedChanges(table)).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('2 active snapshots');
      expect(String(warn.mock.calls[0][0])).toContain(CODE);
      expect(String(warn.mock.calls[0][0])).toContain(String(YEAR));
      expect(
        table.queries.some((query) =>
          /\bresult_pool_funding_toc_alignment\b/i.test(query.sql),
        ),
      ).toBe(false);
    });

    it('writes {} and logs when the version has no ToC row', async () => {
      arm({
        raw_body: callbackBody([
          primary(
            [
              {
                title: 'Callback title',
                toc_result_id: 7290,
                level: 'Intermediate Outcome',
              },
            ],
            'SP99',
          ),
        ]),
      });
      table.tocs = [];
      table.sps = [versionSp()];

      await record();

      expect(parsedChanges(table)).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain(
        `no active ToC row for result_id=${VERSION_ID}`,
      );
    });
  });

  describe('level', () => {
    it('emits the nested toc_mappings level when it differs from the version', async () => {
      arm(
        {
          raw_body: callbackBody(
            [
              primary([
                {
                  title: 'Same title',
                  toc_result_id: 7290,
                  level: 'Intermediate Outcome',
                },
              ]),
            ],
            decoy,
          ),
        },
        { level: 'Output' },
      );

      await record();

      expect(parsedChanges(table)).toEqual({
        'Theory of Change level': {
          before: 'Output',
          after: 'Intermediate Outcome',
        },
      });
    });

    it('omits level when the nested value matches and ignores obj_result_level', async () => {
      arm({
        raw_body: callbackBody(
          [
            primary([
              {
                title: 'Same title',
                toc_result_id: 7290,
                level: 'Intermediate Outcome',
              },
            ]),
          ],
          decoy,
        ),
      });

      await record();

      expect(parsedChanges(table)).toEqual({});
      expect(parsedChanges(table)['Theory of Change level']).toBeUndefined();
    });
  });

  describe('callback paths PRMS does not send', () => {
    it('emits the marker when our value is set, distinct from a real change', async () => {
      arm({
        raw_body: callbackBody([
          primary([
            {
              title: 'New title',
              toc_result_id: 7290,
              level: 'Intermediate Outcome',
              unit_messurament: 't/ha',
              target_value: '100',
              target_year: 2030,
            },
          ]),
        ]),
      });
      table.tocs = [
        versionToc({
          toc_result_title: 'Old title',
          indicator_description: 'Stored indicator',
          quantitative_contribution: '12.50',
          unit_messurament: 't/ha',
          target_value: '100',
          target_year: 2030,
        }),
      ];

      await record();

      const changes = parsedChanges(table);
      expect(changes['Theory of Change result']).toEqual({
        before: 'Old title',
        after: 'New title',
      });
      expect(changes.Indicator).toEqual({
        before: 'Stored indicator',
        after: 'Not provided by PRMS',
      });
      expect(changes['Quantitative contribution']).toEqual({
        before: '12.50',
        after: 'Not provided by PRMS',
      });
      expect(changes['Unit of measurement']).toBeUndefined();
      expect(changes.Target).toBeUndefined();
    });

    it('emits nothing for an absent path when our value is null', async () => {
      arm();

      await record();

      const changes = parsedChanges(table);
      expect(changes).toEqual({});
      expect(changes.Indicator).toBeUndefined();
      expect(changes['Quantitative contribution']).toBeUndefined();
      expect(changes['Unit of measurement']).toBeUndefined();
      expect(changes.Target).toBeUndefined();
    });
  });

  // Added to the callback 2026-09-29 under toc_mappings[].indicators[].
  // Real shape observed the same day: target_contribution is a NUMBER
  // (1), not a string — scalar() must still stringify it.
  describe('indicators[] (added 2026-09-29)', () => {
    it('emits a real diff for Indicator and Quantitative contribution from the one indicators entry', async () => {
      arm(
        {
          raw_body: callbackBody([
            primary([
              {
                title: 'Same title',
                toc_result_id: 7290,
                level: 'Intermediate Outcome',
                indicators: [
                  {
                    indicator_description: 'PRMS indicator text',
                    target_contribution: 1,
                  },
                ],
              },
            ]),
          ]),
        },
        {
          indicator_description: 'Stored indicator',
          quantitative_contribution: '35.00',
        },
      );

      await record();

      expect(parsedChanges(table)).toEqual({
        Indicator: { before: 'Stored indicator', after: 'PRMS indicator text' },
        'Quantitative contribution': { before: '35.00', after: '1' },
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('omits both fields, unchanged, and no marker, when the callback repeats our own values', async () => {
      arm(
        {
          raw_body: callbackBody([
            primary([
              {
                title: 'Same title',
                toc_result_id: 7290,
                level: 'Intermediate Outcome',
                indicators: [
                  {
                    indicator_description: 'Stored indicator',
                    target_contribution: '35.00',
                  },
                ],
              },
            ]),
          ]),
        },
        {
          indicator_description: 'Stored indicator',
          quantitative_contribution: '35.00',
        },
      );

      await record();

      expect(parsedChanges(table)).toEqual({});
    });

    it.each([
      ['zero entries', []],
      [
        'two entries',
        [
          { indicator_description: 'A', target_contribution: 1 },
          { indicator_description: 'B', target_contribution: 2 },
        ],
      ],
    ])(
      'skips both fields and logs, never guessing, when indicators has %s',
      async (_label, indicators) => {
        arm(
          {
            raw_body: callbackBody([
              primary([
                {
                  title: 'Same title',
                  toc_result_id: 7290,
                  level: 'Intermediate Outcome',
                  indicators,
                },
              ]),
            ]),
          },
          {
            indicator_description: 'Stored indicator',
            quantitative_contribution: '35.00',
          },
        );

        await record();

        const changes = parsedChanges(table);
        // Falsifier: an implementation that defaults to indicators[0] on
        // the two-entry case would emit Indicator: {before, after: 'A'} —
        // this assertion catches that the same way toBeUndefined() below
        // catches a fall-through to "Not provided by PRMS".
        expect(changes.Indicator).toBeUndefined();
        expect(changes['Quantitative contribution']).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('indicators[]');
        expect(String(warn.mock.calls[0][0])).toContain(String(VERSION_ID));
      },
    );

    it('still reports "Not provided by PRMS" when the mapping has no indicators key at all (the pre-2026-09-29 shape)', async () => {
      arm(
        {
          raw_body: callbackBody([
            primary([
              {
                title: 'Same title',
                toc_result_id: 7290,
                level: 'Intermediate Outcome',
              },
            ]),
          ]),
        },
        {
          indicator_description: 'Stored indicator',
          quantitative_contribution: '35.00',
        },
      );

      await record();

      const changes = parsedChanges(table);
      expect(changes.Indicator).toEqual({
        before: 'Stored indicator',
        after: 'Not provided by PRMS',
      });
      expect(changes['Quantitative contribution']).toEqual({
        before: '35.00',
        after: 'Not provided by PRMS',
      });
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('duplicated toc_mappings', () => {
    it('collapses the repeated mapping to one id', async () => {
      const mapping = {
        title: 'Same title',
        toc_result_id: 7290,
        level: 'Intermediate Outcome',
      };
      arm(
        {
          raw_body: callbackBody([primary([mapping, { ...mapping }])]),
        },
        { toc_result_id: 1 },
      );

      await record();

      expect(parsedChanges(table)).toEqual({
        'Theory of Change result ID': { before: '1', after: '7290' },
      });
    });
  });

  describe('contributing programs', () => {
    const contributingSp = (code: string): SpRow =>
      versionSp({ sp_code: code, sp_role: 'CONTRIBUTING' });

    it('treats a reorder as no change', async () => {
      arm({
        raw_body: callbackBody([
          primary([
            {
              title: 'Same title',
              toc_result_id: 7290,
              level: 'Intermediate Outcome',
            },
          ]),
          contributingEntry('SP02'),
          contributingEntry('SP03'),
        ]),
      });
      table.sps = [versionSp(), contributingSp('SP03'), contributingSp('SP02')];

      await record();

      expect(parsedChanges(table)).toEqual({});
    });

    it('emits a sorted pair when membership differs', async () => {
      arm({
        raw_body: callbackBody([
          primary([
            {
              title: 'Same title',
              toc_result_id: 7290,
              level: 'Intermediate Outcome',
            },
          ]),
          contributingEntry('SP04'),
          contributingEntry('SP02'),
        ]),
      });
      table.sps = [versionSp(), contributingSp('SP02')];

      await record();

      expect(parsedChanges(table)).toEqual({
        'Contributing Science Programs': {
          before: ['SP02'],
          after: ['SP02', 'SP04'],
        },
      });
    });
  });

  describe('Science Program', () => {
    it('emits the primary code when the version and the callback differ', async () => {
      arm({
        raw_body: callbackBody([
          primary(
            [
              {
                title: 'Same title',
                toc_result_id: 7290,
                level: 'Intermediate Outcome',
              },
            ],
            'SP07',
          ),
        ]),
      });

      await record();

      expect(parsedChanges(table)).toEqual({
        'Science Program': { before: 'SP06', after: 'SP07' },
      });
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
