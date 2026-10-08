import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { TocIntegrationService } from '../../tools/toc-integration/toc-integration.service';
import { TocResult } from '../../tools/toc-integration/dto/toc-integration.types';
import { DeliveryCorrelationOutcome } from './enum/delivery-correlation-outcome.enum';
import { PoolFundingMappingApplyService } from './pool-funding-mapping-apply.service';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { PrmsWebhookCallbackModule } from './prms-webhook-callback.module';

// KZ-001 — assertions are on the SQL text and the parameter arrays.
// KZ-017 — this fake does not run MySQL. A transaction "rolls back" by
// discarding its buffer when the callback throws. Real ROLLBACK, unique
// indexes, and collation are unproven here.

const RESULT_ID = 40;
const VERSION_RESULT_ID = 88;
const CODE = '19949';
const YEAR = 2026;
const HISTORY_ID = 100;
const ALIGNMENT_ID = 9;
const TOC_ID = 70;
const OTHER_TOC_ID = 71;
const PRIMARY_SP_ID = 5;

const INHERITED = {
  aligns_with_toc: true,
  level: 'OUT-9',
  indicator_id: 4242,
  quantitative_contribution: '17.25',
  indicator_description: 'inherited-indicator',
  unit_messurament: 'inherited-unit',
  target_value: 'inherited-target',
  target_year: 2031,
};

// The live 2026-09-29 shape: PRMS names the indicator by its UUID, which is a
// different identifier space from our numeric indicator_id. Only the lambda-toc
// catalog bridges the two.
const INDICATOR_UUID = '63e85c28-e0c2-4f85-b365-82cd0145ed8f';
const CATALOG_INDICATOR_ID = 10999;

const catalogResult = (): TocResult =>
  ({
    toc_result_id: 7169,
    title: 'New title',
    official_code: 'SP06',
    indicators: [
      {
        indicator_id: CATALOG_INDICATOR_ID,
        toc_result_indicator_id: INDICATOR_UUID,
        indicator_description: 'Landscapes with an active plan',
        unit_messurament: 'Landscapes',
        targets: [
          { target_value: '12', target_date: '2025' },
          { target_value: '40', target_date: '2026' },
        ],
      },
    ],
  }) as unknown as TocResult;

class FakeTocCatalog {
  results: TocResult[] = [catalogResult()];
  error: Error | null = null;
  readonly getTocResults = jest.fn(async () => {
    if (this.error) {
      throw this.error;
    }
    return this.results;
  });
}

const UPDATE_TOC_INDICATOR_SQL = `
UPDATE result_pool_funding_toc_alignment
SET indicator_id = ?,
    indicator_description = ?,
    quantitative_contribution = ?,
    unit_messurament = ?,
    target_value = ?,
    target_year = ?
WHERE id = ?
  AND is_active = TRUE
`;

const DEACTIVATE_TOC_SQL = `
UPDATE result_pool_funding_toc_alignment
SET is_active = FALSE
WHERE id = ?
  AND is_active = TRUE
`;

const INSERT_TOC_SQL = `
INSERT INTO result_pool_funding_toc_alignment
  (result_id, sp_code, aligns_with_toc, level, toc_result_id, indicator_id,
   quantitative_contribution, toc_result_title, indicator_description,
   unit_messurament, target_value, target_year, created_by, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, TRUE)
`;

const DEACTIVATE_SP_SQL = `
UPDATE result_pool_funding_alignment_sp
SET is_active = FALSE
WHERE id = ?
  AND is_active = TRUE
`;

const INSERT_SP_SQL = `
INSERT INTO result_pool_funding_alignment_sp
  (alignment_id, sp_code, sp_role, created_by, is_active)
VALUES (?, ?, ?, NULL, TRUE)
`;

interface RecordedQuery {
  sql: string;
  params: unknown[];
}

const flat = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const isWrite = (query: RecordedQuery): boolean =>
  /^\s*(UPDATE|INSERT)\b/i.test(query.sql);

const touchesResults = (sql: string): boolean =>
  /\b(FROM|UPDATE|INSERT\s+INTO)\s+results\b/i.test(sql);

const primaryCallback = (
  officialCode: string,
  mappings: Record<string, unknown>[],
): Record<string, unknown> => ({
  data: {
    obj_results_toc_result: [
      {
        official_code: officialCode,
        initiative_role: 'Primary submitter',
        toc_mappings: mappings,
      },
    ],
  },
});

interface SnapshotRow {
  result_id: number;
  result_official_code: string;
  report_year_id: number;
  is_snapshot: boolean;
  is_active: boolean;
}

class FakeApplyDb {
  history: Record<string, unknown> | null = null;
  alignmentId: number | null = ALIGNMENT_ID;
  sps: Array<Record<string, unknown>> = [];
  tocs: Array<Record<string, unknown>> = [];
  snapshots: SnapshotRow[] = [
    {
      result_id: RESULT_ID,
      result_official_code: CODE,
      report_year_id: YEAR,
      is_snapshot: false,
      is_active: true,
    },
    {
      result_id: VERSION_RESULT_ID,
      result_official_code: CODE,
      report_year_id: YEAR,
      is_snapshot: true,
      is_active: true,
    },
  ];
  queries: RecordedQuery[] = [];
  committed: RecordedQuery[] = [];
  failInsert = false;

  readonly query = jest.fn((sql: string, params: unknown[] = []) =>
    this.execute(sql, params, null),
  );

  readonly transaction = jest.fn(
    async (work: (manager: { query: jest.Mock }) => Promise<void>) => {
      const buffer: RecordedQuery[] = [];
      const manager = {
        query: jest.fn((sql: string, params: unknown[] = []) =>
          this.execute(sql, params, buffer),
        ),
      };
      await work(manager);
      this.committed.push(...buffer);
    },
  );

  private async execute(
    sql: string,
    params: unknown[],
    buffer: RecordedQuery[] | null,
  ): Promise<unknown> {
    if (/^\s*(UPDATE|INSERT)\b/i.test(sql) && touchesResults(sql)) {
      throw new Error(`results table must not be written: ${flat(sql)}`);
    }
    this.queries.push({ sql, params });
    if (buffer && this.failInsert && /^\s*INSERT\b/i.test(sql)) {
      throw new Error('insert failed');
    }
    if (buffer && isWrite({ sql, params })) {
      buffer.push({ sql, params });
    }
    if (/\bFROM\s+results\b/i.test(sql)) {
      return this.selectSnapshots(sql, params);
    }
    if (/result_prms_sync_history/i.test(sql)) {
      return this.history ? [this.history] : [];
    }
    if (/result_pool_funding_alignment_sp/i.test(sql)) {
      return this.sps;
    }
    if (/result_pool_funding_toc_alignment/i.test(sql)) {
      if (/^\s*SELECT\b/i.test(sql) && params[0] !== VERSION_RESULT_ID) {
        return [];
      }
      return this.tocs;
    }
    if (/result_pool_funding_alignment\b/i.test(sql)) {
      if (/^\s*SELECT\b/i.test(sql) && params[0] !== VERSION_RESULT_ID) {
        return [];
      }
      return this.alignmentId === null ? [] : [{ id: this.alignmentId }];
    }
    throw new Error(`unexpected sql: ${flat(sql)}`);
  }

  private selectSnapshots(
    sql: string,
    params: unknown[],
  ): Array<{ result_id: number }> {
    const wantsSnapshot = /is_snapshot\s*=\s*TRUE\b/i.test(sql);
    const wantsLive = /is_snapshot\s*=\s*FALSE\b/i.test(sql);
    const wantsActive = /is_active\s*=\s*TRUE\b/i.test(sql);
    const code = params[0];
    const year = params[1];
    return this.snapshots
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
}

const tocRow = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: TOC_ID,
  sp_code: 'SP06',
  toc_result_id: 7290,
  toc_result_title: 'Old title',
  ...INHERITED,
  ...overrides,
});

const primarySp = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: PRIMARY_SP_ID,
  alignment_id: ALIGNMENT_ID,
  sp_code: 'SP06',
  sp_role: 'PRIMARY',
  ...overrides,
});

const titleChange = (
  before = 'Old title',
  after: unknown = 'New title',
): Record<string, unknown> => ({
  'Theory of Change result': { before, after },
});

describe('PoolFundingMappingApplyService', () => {
  let db: FakeApplyDb;
  let service: PoolFundingMappingApplyService;
  let warn: jest.SpyInstance;
  let errorLog: jest.SpyInstance;
  let catalog: FakeTocCatalog;

  beforeEach(() => {
    db = new FakeApplyDb();
    warn = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    errorLog = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
    catalog = new FakeTocCatalog();
    service = new PoolFundingMappingApplyService(
      db as unknown as DataSource,
      catalog as unknown as TocIntegrationService,
      {
        resolve: jest.fn().mockResolvedValue(2026),
      } as unknown as ReportingYearResolver,
    );
  });

  afterEach(() => {
    warn.mockRestore();
    errorLog.mockRestore();
  });

  const apply = (): Promise<void> =>
    service.apply({ historyId: HISTORY_ID, resultId: RESULT_ID });

  const writes = (): RecordedQuery[] => db.queries.filter(isWrite);

  const expectSql = (
    query: RecordedQuery,
    sql: string,
    params: unknown[],
  ): void => {
    expect(flat(query.sql)).toBe(flat(sql));
    expect(query.params).toEqual(params);
  };

  const armTitleCase = (overrides: Record<string, unknown> = {}): void => {
    db.history = {
      decision: 'APPROVE',
      correlation_outcome: DeliveryCorrelationOutcome.CORRELATED,
      result_official_code: CODE,
      result_year: YEAR,
      changes: titleChange(),
      raw_body: null,
      ...overrides,
    };
    db.sps = [primarySp()];
    db.tocs = [
      tocRow(),
      tocRow({
        id: OTHER_TOC_ID,
        sp_code: 'SP09',
        toc_result_title: 'contributing title',
        toc_result_id: 111,
      }),
    ];
  };

  // --- Indicator adopted from the callback (2026-09-29) -------------------
  //
  // Owner's rule: the reviewer's own value has to win, because once a result
  // is pushed the reporter can no longer edit the indicator. Inheriting the
  // previous indicator across a ToC-result move left result 20017 pointing at
  // indicator 10842 of ToC result 7188 while the row said 7169 -- a value the
  // form could not even render.
  const armIndicatorCase = (
    mapping: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
  ): void => {
    db.history = {
      decision: 'APPROVE',
      correlation_outcome: DeliveryCorrelationOutcome.CORRELATED,
      result_official_code: CODE,
      result_year: YEAR,
      changes: {
        ...titleChange(),
        'Theory of Change result ID': { before: '7290', after: '7169' },
      },
      raw_body: primaryCallback('SP06', [
        {
          title: 'New title',
          toc_result_id: 7169,
          level: 'Intermediate Outcome',
          indicators: [
            {
              toc_results_indicator_id: INDICATOR_UUID,
              indicator_description: 'Landscapes with an active plan',
              target_contribution: 55,
            },
            {
              toc_results_indicator_id: INDICATOR_UUID,
              indicator_description: 'N/A',
              target_contribution: 55,
            },
          ],
          ...mapping,
        },
      ]),
      ...overrides,
    };
    db.sps = [primarySp()];
    db.tocs = [tocRow()];
  };

  it('writes the callback indicator, not the inherited one, when the ToC result moves', async () => {
    armIndicatorCase();

    await apply();

    expect(catalog.getTocResults).toHaveBeenCalledWith('SP06', 'OUTCOME', 2026);
    const inserted = writes().find((query) => /^\s*INSERT\b/i.test(query.sql));
    expect(inserted).toBeDefined();
    expectSql(inserted as RecordedQuery, INSERT_TOC_SQL, [
      VERSION_RESULT_ID,
      'SP06',
      INHERITED.aligns_with_toc,
      INHERITED.level,
      7169,
      CATALOG_INDICATOR_ID,
      '55',
      'New title',
      'Landscapes with an active plan',
      'Landscapes',
      '40',
      2026,
    ]);
  });

  it('updates the active row in place when only the indicator changed', async () => {
    armIndicatorCase(
      { title: 'Old title', toc_result_id: 7290 },
      {
        changes: {
          Indicator: {
            before: 'inherited-indicator',
            after: 'Landscapes with an active plan',
          },
        },
      },
    );
    catalog.results = [
      { ...catalogResult(), toc_result_id: 7290 } as unknown as TocResult,
    ];

    await apply();

    expect(writes()).toHaveLength(1);
    expectSql(writes()[0], UPDATE_TOC_INDICATOR_SQL, [
      CATALOG_INDICATOR_ID,
      'Landscapes with an active plan',
      '55',
      'Landscapes',
      '40',
      2026,
      TOC_ID,
    ]);
  });

  it('leaves the indicator alone when the callback entry is the N/A filler', async () => {
    armIndicatorCase({
      indicators: [
        {
          toc_results_indicator_id: INDICATOR_UUID,
          indicator_description: 'N/A',
        },
      ],
    });

    await apply();

    expect(catalog.getTocResults).not.toHaveBeenCalled();
    const inserted = writes().find((query) => /^\s*INSERT\b/i.test(query.sql));
    expect((inserted as RecordedQuery).params[5]).toBe(INHERITED.indicator_id);
    expect((inserted as RecordedQuery).params[8]).toBe(
      INHERITED.indicator_description,
    );
  });

  it('keeps the inherited indicator and logs when the catalog cannot resolve the UUID', async () => {
    armIndicatorCase();
    catalog.results = [];

    await apply();

    const inserted = writes().find((query) => /^\s*INSERT\b/i.test(query.sql));
    expect((inserted as RecordedQuery).params[5]).toBe(INHERITED.indicator_id);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain(String(HISTORY_ID));
  });

  it('keeps the inherited indicator when the catalog call throws', async () => {
    armIndicatorCase();
    catalog.error = new Error('lambda-toc down');

    await apply();

    const inserted = writes().find((query) => /^\s*INSERT\b/i.test(query.sql));
    expect((inserted as RecordedQuery).params[5]).toBe(INHERITED.indicator_id);
    expect(warn).toHaveBeenCalled();
  });

  it('is provided by PrmsWebhookCallbackModule', () => {
    const providers: unknown[] = Reflect.getMetadata(
      'providers',
      PrmsWebhookCallbackModule,
    );
    expect(providers).toContain(PoolFundingMappingApplyService);
  });

  describe('(a) APPROVE with a changed toc_result_title', () => {
    it('deactivates the old row and inserts a new one carrying the eight unobservable columns', async () => {
      armTitleCase();

      await apply();

      expect(writes()).toHaveLength(2);
      expectSql(writes()[0], DEACTIVATE_TOC_SQL, [TOC_ID]);
      expectSql(writes()[1], INSERT_TOC_SQL, [
        VERSION_RESULT_ID,
        'SP06',
        INHERITED.aligns_with_toc,
        INHERITED.level,
        7290,
        INHERITED.indicator_id,
        INHERITED.quantitative_contribution,
        'New title',
        INHERITED.indicator_description,
        INHERITED.unit_messurament,
        INHERITED.target_value,
        INHERITED.target_year,
      ]);
      expect(flat(writes()[1].sql)).toContain('created_by');
      expect(flat(writes()[1].sql)).toContain('NULL');
      expect(
        writes().some((query) => query.params.includes(OTHER_TOC_ID)),
      ).toBe(false);
      const snapshot = db.queries.find((query) =>
        /\bFROM\s+results\b/i.test(query.sql),
      );
      expect(snapshot).toBeDefined();
      expect(flat(snapshot?.sql ?? '')).toContain('is_snapshot = TRUE');
      expect(flat(snapshot?.sql ?? '')).toContain('is_active = TRUE');
      expect(snapshot?.params).toEqual([CODE, YEAR]);
      const alignment = db.queries.find(
        (query) =>
          /^\s*SELECT\b/i.test(query.sql) &&
          /\bFROM\s+result_pool_funding_alignment\b/i.test(query.sql),
      );
      expect(alignment?.params).toEqual([VERSION_RESULT_ID]);
      expect(
        db.queries.some(
          (query) =>
            /^\s*(UPDATE|INSERT)\b/i.test(query.sql) &&
            touchesResults(query.sql),
        ),
      ).toBe(false);
    });
  });

  describe('(b) REJECT with changes', () => {
    it('writes nothing', async () => {
      armTitleCase({ decision: 'REJECT' });

      await apply();

      expect(writes()).toEqual([]);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('(c) APPROVE with empty changes', () => {
    it('writes nothing', async () => {
      armTitleCase({ changes: {} });

      await apply();

      expect(writes()).toEqual([]);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('(d) second run over already-applied state', () => {
    it('is a no-op and writes zero rows', async () => {
      armTitleCase();
      db.tocs = [
        tocRow({ toc_result_title: 'New title' }),
        tocRow({
          id: OTHER_TOC_ID,
          sp_code: 'SP09',
          toc_result_title: 'contributing title',
        }),
      ];

      await apply();

      expect(writes()).toEqual([]);
      expect(db.committed.filter(isWrite)).toEqual([]);
    });
  });

  describe('(e) primary sp_code changed', () => {
    const armPrimaryMove = (mappings: Record<string, unknown>[]): void => {
      db.history = {
        decision: 'APPROVE',
        correlation_outcome: DeliveryCorrelationOutcome.CORRELATED,
        result_official_code: CODE,
        result_year: YEAR,
        changes: {
          'Science Program': { before: 'SP01', after: 'SP02' },
        },
        raw_body: primaryCallback('SP02', mappings),
      };
      db.sps = [primarySp({ id: PRIMARY_SP_ID, sp_code: 'SP01' })];
      db.tocs = [
        tocRow({
          sp_code: 'SP01',
          toc_result_id: 7290,
          toc_result_title: 'Stored title',
        }),
      ];
    };

    it('deactivates the SP row, replaces it, and rebuilds the ToC row from the callback primary entry', async () => {
      armPrimaryMove([
        { title: 'From PRMS', toc_result_id: 8001 },
        { title: 'From PRMS', toc_result_id: 8001 },
      ]);

      await apply();

      expect(writes()).toHaveLength(4);
      expectSql(writes()[0], DEACTIVATE_SP_SQL, [PRIMARY_SP_ID]);
      expectSql(writes()[1], INSERT_SP_SQL, [ALIGNMENT_ID, 'SP02', 'PRIMARY']);
      expect(flat(writes()[1].sql)).toContain('NULL');
      expectSql(writes()[2], DEACTIVATE_TOC_SQL, [TOC_ID]);
      expectSql(writes()[3], INSERT_TOC_SQL, [
        VERSION_RESULT_ID,
        'SP02',
        INHERITED.aligns_with_toc,
        INHERITED.level,
        8001,
        INHERITED.indicator_id,
        INHERITED.quantitative_contribution,
        'From PRMS',
        INHERITED.indicator_description,
        INHERITED.unit_messurament,
        INHERITED.target_value,
        INHERITED.target_year,
      ]);
      expect(writes()[3].params).not.toContain(7290);
      expect(writes()[3].params).not.toContain('Stored title');
    });

    it('leaves the existing ToC row active when the callback primary has no toc_mappings', async () => {
      armPrimaryMove([]);

      await apply();

      expect(writes()).toHaveLength(2);
      expectSql(writes()[0], DEACTIVATE_SP_SQL, [PRIMARY_SP_ID]);
      expectSql(writes()[1], INSERT_SP_SQL, [ALIGNMENT_ID, 'SP02', 'PRIMARY']);
      expect(writes().some((query) => /toc_alignment/i.test(query.sql))).toBe(
        false,
      );
    });
  });

  describe('(f) contributing set changed', () => {
    const armContributing = (after: unknown): void => {
      db.history = {
        decision: 'APPROVE',
        correlation_outcome: DeliveryCorrelationOutcome.CORRELATED,
        result_official_code: CODE,
        result_year: YEAR,
        changes: {
          'Contributing Science Programs': {
            before: ['SP-A', 'SP-B'],
            after,
          },
        },
        raw_body: null,
      };
      db.sps = [
        primarySp({ id: 10, sp_code: 'SP-P' }),
        {
          id: 11,
          alignment_id: ALIGNMENT_ID,
          sp_code: 'SP-A',
          sp_role: 'CONTRIBUTING',
        },
        {
          id: 12,
          alignment_id: ALIGNMENT_ID,
          sp_code: 'SP-B',
          sp_role: 'CONTRIBUTING',
        },
      ];
      db.tocs = [];
    };

    it('moves only the affected rows', async () => {
      armContributing(['SP-B', 'SP-C']);

      await apply();

      expect(writes()).toHaveLength(2);
      expectSql(writes()[0], DEACTIVATE_SP_SQL, [11]);
      expectSql(writes()[1], INSERT_SP_SQL, [
        ALIGNMENT_ID,
        'SP-C',
        'CONTRIBUTING',
      ]);
      expect(writes().some((query) => query.params.includes(12))).toBe(false);
      expect(writes().some((query) => query.params.includes(10))).toBe(false);
    });

    it('treats after null as the empty set', async () => {
      armContributing(null);

      await apply();

      expect(writes()).toHaveLength(2);
      expectSql(writes()[0], DEACTIVATE_SP_SQL, [11]);
      expectSql(writes()[1], DEACTIVATE_SP_SQL, [12]);
    });
  });

  describe('(g) a failure mid-way', () => {
    it('rolls the transaction back and does not touch correlation_outcome', async () => {
      armTitleCase();
      db.failInsert = true;

      await expect(apply()).resolves.toBeUndefined();

      expect(db.committed.filter(isWrite)).toEqual([]);
      expect(
        db.queries.some((query) =>
          /UPDATE\s+result_pool_funding_toc_alignment/i.test(query.sql),
        ),
      ).toBe(true);
      expect(
        db.queries.some((query) =>
          /UPDATE\s+result_prms_sync_history/i.test(query.sql),
        ),
      ).toBe(false);
      expect(
        db.queries.some((query) => /correlation_outcome\s*=/i.test(query.sql)),
      ).toBe(false);
      expect(String(errorLog.mock.calls.at(-1)?.[0])).toContain(
        'insert failed',
      );
    });
  });

  describe('correlation_outcome other than CORRELATED', () => {
    it('writes nothing', async () => {
      armTitleCase({
        correlation_outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      });

      await apply();

      expect(writes()).toEqual([]);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('fields PRMS does not send', () => {
    it('writes nothing when the payload is only the not-provided marker', async () => {
      armTitleCase({
        changes: {
          Indicator: {
            before: 'Stored indicator',
            after: 'Not provided by PRMS',
          },
          'Quantitative contribution': {
            before: '12.50',
            after: 'Not provided by PRMS',
          },
        },
      });

      await apply();

      expect(writes()).toEqual([]);
      expect(db.transaction).not.toHaveBeenCalled();
      expect(
        db.queries.some((query) =>
          query.params.includes('Not provided by PRMS'),
        ),
      ).toBe(false);
    });

    it('writes nothing when changes is empty because our values were null', async () => {
      armTitleCase({ changes: {} });

      await apply();

      expect(writes()).toEqual([]);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('applies a real change and leaves the marker out of the write', async () => {
      armTitleCase({
        changes: {
          ...titleChange(),
          Indicator: {
            before: 'Stored indicator',
            after: 'Not provided by PRMS',
          },
        },
      });

      await apply();

      expect(writes()).toHaveLength(2);
      expect(writes()[1].params).toContain('New title');
      expect(writes()[1].params).toContain(INHERITED.indicator_description);
      expect(writes()[1].params).not.toContain('Not provided by PRMS');
    });
  });

  describe('two active snapshots', () => {
    it('writes nothing and logs', async () => {
      armTitleCase();
      db.snapshots.push({
        result_id: VERSION_RESULT_ID + 1,
        result_official_code: CODE,
        report_year_id: YEAR,
        is_snapshot: true,
        is_active: true,
      });

      await apply();

      expect(writes()).toEqual([]);
      expect(db.transaction).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('2 active snapshots');
    });
  });

  describe('a list where a scalar is required', () => {
    it('does not write the ToC title', async () => {
      armTitleCase({
        changes: titleChange('Old title', ['One', 'Two']),
      });

      await apply();

      expect(writes()).toEqual([]);
    });
  });
});
