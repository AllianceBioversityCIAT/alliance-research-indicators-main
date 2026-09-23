import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';
import {
  DeliveryCorrelationInput,
  DeliveryCorrelatorService,
} from './delivery-correlator.service';
import { DeliveryCorrelationOutcome } from './enum/delivery-correlation-outcome.enum';
import { DeliveryProcessingState } from './enum/delivery-processing-state.enum';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-06.
//
// KZ-017 — what this tier structurally CANNOT reach: the fake below
// filters rows by splitting the WHERE clause on AND. It does not run
// MySQL, so operator precedence is unproven. `A OR B AND C` binds as
// `A OR (B AND C)` in MySQL; a predicate list asserted here would not
// notice. The fake REFUSES a WHERE that contains OR rather than
// evaluating it. Real precedence stays unproven at this tier.

const OFFICIAL = 1441061;
const CODE_ZERO_ID = 1;
const SNAPSHOT_ID = 10;
const OTHER_PLATFORM_ID = 20;
const INACTIVE_ID = 30;
const LIVE_ID = 40;
const SECOND_LIVE_ID = 50;
const DELIVERY_ROW_ID = 100;
const DELIVERY_HEADER_ID = '4172';

interface ResultRow {
  result_id: number;
  result_official_code: number;
  platform_code: string;
  is_active: boolean;
  is_snapshot: boolean;
}

interface RecordedQuery {
  sql: string;
  params: unknown[];
}

interface RecordedUpdate {
  sql: string;
  params: unknown[];
  set: Record<string, unknown>;
  id: unknown;
}

const resultRow = (overrides: Partial<ResultRow> = {}): ResultRow => ({
  result_id: LIVE_ID,
  result_official_code: OFFICIAL,
  platform_code: ReportingPlatformEnum.STAR,
  is_active: true,
  is_snapshot: false,
  ...overrides,
});

/**
 * Same `result_official_code` on four STAR-or-not shapes, plus a live
 * STAR row whose official code is `0`. A fixture with one row per code
 * cannot tell a dropped `is_snapshot` from the real query (KZ-004).
 * The `0` row is the coercion trap: `Number('') === 0` would correlate
 * to it.
 *
 * Ids ascend with the distractors first so "the first" after
 * `ORDER BY result_id ASC` is the wrong row whenever a predicate is
 * missing. Insertion order matches that, so a fake that ignores
 * ORDER BY still fails the same way.
 */
const discriminatingFixture = (): ResultRow[] => [
  resultRow({
    result_id: CODE_ZERO_ID,
    result_official_code: 0,
  }),
  resultRow({ result_id: SNAPSHOT_ID, is_snapshot: true }),
  resultRow({
    result_id: OTHER_PLATFORM_ID,
    platform_code: ReportingPlatformEnum.PRMS,
  }),
  resultRow({ result_id: INACTIVE_ID, is_active: false }),
  resultRow({ result_id: LIVE_ID }),
];

/**
 * Driven by the SQL text, never by call order. A dropped predicate
 * changes which fixture row comes back — that is the whole point of
 * the four-row fixture.
 */
class FakeResultsTable {
  rows: ResultRow[] = [];
  selects: RecordedQuery[] = [];
  updates: RecordedUpdate[] = [];
  writes: string[] = [];

  readonly query = jest.fn((sql: string, params: unknown[] = []) =>
    this.execute(sql, params),
  );

  async execute(sql: string, params: unknown[] = []): Promise<unknown> {
    if (/^\s*SELECT\b/i.test(sql)) {
      this.selects.push({ sql, params });
      if (!/\bFROM\s+results\b/i.test(sql)) {
        throw new Error(`FakeResultsTable: SELECT is not FROM results\n${sql}`);
      }
      return this.matching(sql, params).map((row) => ({
        // mysql2 returns BIGINT as a string. The service must coerce.
        result_id: String(row.result_id),
      }));
    }
    if (/^\s*UPDATE\s+result_prms_sync_history\b/i.test(sql)) {
      return this.updateDelivery(sql, params);
    }
    if (/^\s*(UPDATE|INSERT|DELETE)\b/i.test(sql)) {
      this.writes.push(sql);
      return { affectedRows: 1 };
    }
    throw new Error(`FakeResultsTable: unsupported SQL\n${sql}`);
  }

  private matching(sql: string, params: unknown[]): ResultRow[] {
    const whereMatch = /WHERE\s+([\s\S]+?)(?:\bORDER\s+BY\b|$)/i.exec(sql);
    if (!whereMatch) {
      throw new Error(`FakeResultsTable: SELECT without WHERE\n${sql}`);
    }
    const where = whereMatch[1];
    if (/\bOR\b/i.test(where)) {
      throw new Error(
        'FakeResultsTable refuses OR — SQL precedence is unmodeled (KZ-017)',
      );
    }
    const parts = where
      .split(/\bAND\b/i)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    let paramIndex = 0;
    const checks: Array<(row: ResultRow) => boolean> = [];
    for (const part of parts) {
      const comparison = /^(\w+)\s*=\s*(.+)$/i.exec(part);
      if (!comparison) {
        throw new Error(
          `FakeResultsTable: unparsed predicate "${part}"\n${sql}`,
        );
      }
      const column = comparison[1] as keyof ResultRow;
      const raw = comparison[2].trim();
      let expected: unknown;
      if (raw === '?') {
        expected = params[paramIndex++];
      } else if (/^'(.*)'$/.test(raw)) {
        expected = /^'(.*)'$/.exec(raw)?.[1];
      } else if (/^TRUE$/i.test(raw) || raw === '1') {
        expected = true;
      } else if (/^FALSE$/i.test(raw) || raw === '0') {
        expected = false;
      } else {
        throw new Error(`FakeResultsTable: unsupported literal ${raw}`);
      }
      checks.push((row) => row[column] === expected);
    }
    if (paramIndex !== params.length) {
      throw new Error(
        `FakeResultsTable: ${paramIndex} placeholders vs ${params.length} params`,
      );
    }
    let matched = this.rows.filter((row) =>
      checks.every((check) => check(row)),
    );
    if (/ORDER\s+BY\s+result_id\s+ASC/i.test(sql)) {
      matched = [...matched].sort((a, b) => a.result_id - b.result_id);
    }
    return matched;
  }

  private updateDelivery(
    sql: string,
    params: unknown[],
  ): { affectedRows: number } {
    const setMatch = /SET\s+([\s\S]+?)\s+WHERE\s+id\s*=\s*\?/i.exec(sql);
    if (!setMatch) {
      throw new Error(`FakeResultsTable: unparsed UPDATE\n${sql}`);
    }
    const assignments = setMatch[1].split(',').map((part) => part.trim());
    const set: Record<string, unknown> = {};
    let paramIndex = 0;
    for (const assignment of assignments) {
      const parsed = /^(\w+)\s*=\s*(.+)$/.exec(assignment);
      if (!parsed) {
        throw new Error(
          `FakeResultsTable: bad assignment ${assignment}\n${sql}`,
        );
      }
      const raw = parsed[2].trim();
      if (raw === '?') {
        set[parsed[1]] = params[paramIndex++];
      } else if (/^NULL$/i.test(raw)) {
        set[parsed[1]] = null;
      } else {
        throw new Error(`FakeResultsTable: bad literal ${raw}`);
      }
    }
    const id = params[paramIndex++];
    if (paramIndex !== params.length) {
      throw new Error(
        `FakeResultsTable: ${paramIndex} placeholders vs ${params.length} params on UPDATE`,
      );
    }
    this.updates.push({ sql, params, set, id });
    return { affectedRows: 1 };
  }
}

const delivery = (
  overrides: Partial<DeliveryCorrelationInput> = {},
): DeliveryCorrelationInput => ({
  id: DELIVERY_ROW_ID,
  delivery_id: DELIVERY_HEADER_ID,
  external_reference: String(OFFICIAL),
  ...overrides,
});

describe('DeliveryCorrelatorService', () => {
  let table: FakeResultsTable;
  let resultsWriter: {
    save: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
  };
  let service: DeliveryCorrelatorService;
  let warn: jest.SpyInstance;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    table = new FakeResultsTable();
    table.rows = discriminatingFixture();
    resultsWriter = {
      save: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };
    const dataSource = {
      query: table.query,
      getRepository: jest.fn(() => resultsWriter),
    } as unknown as DataSource;
    service = new DeliveryCorrelatorService(dataSource);
    warn = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    errorLog = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
    errorLog.mockRestore();
  });

  const expectNoResultsWrite = (): void => {
    expect(resultsWriter.save).not.toHaveBeenCalled();
    expect(resultsWriter.update).not.toHaveBeenCalled();
    expect(resultsWriter.insert).not.toHaveBeenCalled();
    expect(resultsWriter.delete).not.toHaveBeenCalled();
    expect(table.writes).toEqual([]);
  };

  const winner = (resultId: number | null): ResultRow | undefined =>
    table.rows.find((row) => row.result_id === resultId);

  describe('the discriminating fixture', () => {
    it('holds a live STAR row, a snapshot, an inactive row, and another platform, all on official code 1441061', () => {
      const sameCode = table.rows.filter(
        (row) => row.result_official_code === OFFICIAL,
      );
      expect(sameCode).toEqual([
        expect.objectContaining({
          result_id: SNAPSHOT_ID,
          platform_code: ReportingPlatformEnum.STAR,
          is_active: true,
          is_snapshot: true,
        }),
        expect.objectContaining({
          result_id: OTHER_PLATFORM_ID,
          platform_code: ReportingPlatformEnum.PRMS,
          is_active: true,
          is_snapshot: false,
        }),
        expect.objectContaining({
          result_id: INACTIVE_ID,
          platform_code: ReportingPlatformEnum.STAR,
          is_active: false,
          is_snapshot: false,
        }),
        expect.objectContaining({
          result_id: LIVE_ID,
          platform_code: ReportingPlatformEnum.STAR,
          is_active: true,
          is_snapshot: false,
        }),
      ]);
    });
  });

  describe('AC.1 — the live row wins', () => {
    it('official code 1441061 resolves to the live STAR row, not the snapshot, the inactive row, or the other platform', async () => {
      const result = await service.correlate(delivery());

      // First, on purpose. The id is looked up in the fixture, so a
      // snapshot id fails here on `is_snapshot` — the diff names the
      // wrong row. A later `resultId` check would hide that.
      expect(winner(result.applied ? result.resultId : null)).toMatchObject({
        result_id: LIVE_ID,
        result_official_code: OFFICIAL,
        platform_code: ReportingPlatformEnum.STAR,
        is_active: true,
        is_snapshot: false,
      });
      expect(result).toMatchObject({
        applied: true,
        correlationOutcome: DeliveryCorrelationOutcome.CORRELATED,
        resultId: LIVE_ID,
        officialCode: OFFICIAL,
        processingState: DeliveryProcessingState.PROCESSED,
      });
      expect(table.updates).toEqual([
        expect.objectContaining({
          id: DELIVERY_ROW_ID,
          set: {
            correlation_outcome: DeliveryCorrelationOutcome.CORRELATED,
            result_id: LIVE_ID,
            processing_state: DeliveryProcessingState.PROCESSED,
          },
        }),
      ]);
      expect(warn).not.toHaveBeenCalled();
      expectNoResultsWrite();
    });
  });

  describe('the emitted query', () => {
    it('carries all four live-row predicates in the SQL text, joined by AND', async () => {
      await service.correlate(delivery());

      expect(table.selects).toHaveLength(1);
      const sql = table.selects[0].sql.replace(/\s+/g, ' ').trim();
      expect(sql).toContain("platform_code = 'STAR'");
      expect(sql).toContain('result_official_code = ?');
      expect(sql).toContain('is_active = TRUE');
      expect(sql).toContain('is_snapshot = FALSE');
      expect(sql).toMatch(
        /WHERE platform_code = 'STAR' AND result_official_code = \? AND is_active = TRUE AND is_snapshot = FALSE/,
      );
      expect(sql).not.toMatch(/\bOR\b/);
      expect(table.selects[0].params).toEqual([OFFICIAL]);
    });
  });

  describe('AC.5 — another reporting platform is not matched', () => {
    it('the resolved row is the STAR live row, not the PRMS row with the same official code', async () => {
      const result = await service.correlate(delivery());

      expect(result.applied).toBe(true);
      expect(winner(result.applied ? result.resultId : null)).toMatchObject({
        result_id: LIVE_ID,
        platform_code: ReportingPlatformEnum.STAR,
      });
      expect(result.applied ? result.resultId : null).not.toBe(
        OTHER_PLATFORM_ID,
      );
    });
  });

  describe('AC.2 — a non-numeric reference never becomes a query, and never 0', () => {
    it.each<[string]>([
      ['abc'],
      [''],
      ['1441061abc'],
      ['1.5'],
      ['1e3'],
      [' 1441061'],
      ['1441061 '],
      ['01441061'],
      ['null'],
    ])(
      '%j is UNKNOWN_REFERENCE, writes a null result_id, and issues no results query',
      async (reference) => {
        const result = await service.correlate(
          delivery({ external_reference: reference }),
        );

        expect(result).toMatchObject({
          applied: true,
          correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
          resultId: null,
          officialCode: null,
          processingState: DeliveryProcessingState.PROCESSED,
        });
        expect(table.selects).toEqual([]);
        expect(table.updates[0]?.set).toEqual({
          correlation_outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
          result_id: null,
          processing_state: DeliveryProcessingState.PROCESSED,
        });
        // The live STAR row at official code 0 is the coerced-empty trap.
        expect(result.applied ? result.resultId : null).not.toBe(CODE_ZERO_ID);
        expectNoResultsWrite();
      },
    );

    it('the literal "0" is a real code and correlates to that row — it is not the empty-string coercion', async () => {
      const result = await service.correlate(
        delivery({ external_reference: '0' }),
      );

      expect(result).toMatchObject({
        applied: true,
        correlationOutcome: DeliveryCorrelationOutcome.CORRELATED,
        resultId: CODE_ZERO_ID,
        officialCode: 0,
      });
      expect(table.selects[0]?.params).toEqual([0]);
    });
  });

  describe('absent reference', () => {
    it.each<[string | null]>([[null]])(
      '%j is NO_REFERENCE and issues no results query',
      async (reference) => {
        const result = await service.correlate(
          delivery({ external_reference: reference }),
        );

        expect(result).toMatchObject({
          applied: true,
          correlationOutcome: DeliveryCorrelationOutcome.NO_REFERENCE,
          resultId: null,
          officialCode: null,
          processingState: DeliveryProcessingState.PROCESSED,
        });
        expect(table.selects).toEqual([]);
        expect(table.updates[0]?.set.correlation_outcome).toBe(
          DeliveryCorrelationOutcome.NO_REFERENCE,
        );
        expectNoResultsWrite();
      },
    );

    it('a missing external_reference is NO_REFERENCE', async () => {
      const input = delivery();
      delete (input as { external_reference?: string | null })
        .external_reference;

      const result = await service.correlate(input);

      expect(result).toMatchObject({
        correlationOutcome: DeliveryCorrelationOutcome.NO_REFERENCE,
        resultId: null,
      });
      expect(table.selects).toEqual([]);
    });
  });

  describe('no live row', () => {
    it('a well-formed code that matches nothing is UNKNOWN_REFERENCE and still not a 0-query', async () => {
      const result = await service.correlate(
        delivery({ external_reference: '9999999' }),
      );

      expect(result).toMatchObject({
        applied: true,
        correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        resultId: null,
        officialCode: null,
        processingState: DeliveryProcessingState.PROCESSED,
      });
      expect(table.selects).toHaveLength(1);
      expect(table.selects[0].params).toEqual([9999999]);
      expect(table.updates[0]?.set.result_id).toBeNull();
      expectNoResultsWrite();
    });
  });

  describe('AC.4 — more than one live match is resolved and warned', () => {
    it('takes the first by result_id and warns with the reference and the match count', async () => {
      // Inserted AHEAD of the lower id, so ignoring ORDER BY would
      // apply 50 and this assertion would fail.
      table.rows.unshift(resultRow({ result_id: SECOND_LIVE_ID }));

      const result = await service.correlate(delivery());

      expect(result).toMatchObject({
        applied: true,
        correlationOutcome: DeliveryCorrelationOutcome.CORRELATED,
        resultId: LIVE_ID,
        officialCode: OFFICIAL,
        processingState: DeliveryProcessingState.PROCESSED,
      });
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0][0]);
      expect(message).toMatch(/Ambiguous/);
      expect(message).toContain(`external_reference=${OFFICIAL}`);
      expect(message).toContain('2 live rows');
      expect(table.updates[0]?.set.result_id).toBe(LIVE_ID);
      expectNoResultsWrite();
    });
  });

  describe('AC.3 — no branch writes results', () => {
    it('null, non-numeric, unknown, one match, and an ambiguous match never call save/update/insert/delete and never emit a write against results', async () => {
      await service.correlate(delivery({ external_reference: null }));
      await service.correlate(delivery({ external_reference: '' }));
      await service.correlate(delivery({ external_reference: 'abc' }));
      await service.correlate(delivery({ external_reference: '9999999' }));
      await service.correlate(delivery());
      table.rows.unshift(resultRow({ result_id: SECOND_LIVE_ID }));
      await service.correlate(delivery());

      expectNoResultsWrite();
      for (const update of table.updates) {
        expect(update.sql).toMatch(/UPDATE\s+result_prms_sync_history/i);
        expect(update.sql).not.toMatch(
          /\b(decision|justification|decided_at|raw_body|is_synced_to_prms|prms_result_code|prms_phase_id)\b/,
        );
        expect(Object.keys(update.set).sort()).toEqual([
          'correlation_outcome',
          'processing_state',
          'result_id',
        ]);
      }
    });
  });

  describe('a throw stays inside the correlator (R-PWH-003 AC.4)', () => {
    it('a failing results read is logged at error with the delivery id and marks PROCESSING_FAILED', async () => {
      const execute = table.execute.bind(table);
      table.query.mockImplementation(
        async (sql: string, params?: unknown[]) => {
          if (/\bFROM\s+results\b/i.test(sql)) {
            throw new Error('connection reset');
          }
          return execute(sql, params ?? []);
        },
      );

      const result = await service.correlate(delivery());

      expect(result).toEqual({
        applied: false,
        processingState: DeliveryProcessingState.PROCESSING_FAILED,
      });
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(String(errorLog.mock.calls[0][0])).toContain(
        `delivery_id=${DELIVERY_HEADER_ID}`,
      );
      expect(String(errorLog.mock.calls[0][0])).toContain('connection reset');
      expect(table.updates).toEqual([
        expect.objectContaining({
          id: DELIVERY_ROW_ID,
          set: {
            processing_state: DeliveryProcessingState.PROCESSING_FAILED,
          },
        }),
      ]);
      expectNoResultsWrite();
    });

    it('a failing failure-mark is still logged and still does not reject', async () => {
      table.query.mockImplementation(async () => {
        throw new Error('connection reset');
      });

      await expect(service.correlate(delivery())).resolves.toEqual({
        applied: false,
        processingState: DeliveryProcessingState.PROCESSING_FAILED,
      });
      expect(errorLog.mock.calls.length).toBeGreaterThanOrEqual(1);
      const messages = errorLog.mock.calls
        .map((call) => String(call[0]))
        .join('\n');
      expect(messages).toContain(`delivery_id=${DELIVERY_HEADER_ID}`);
      expect(messages).toContain(`id=${DELIVERY_ROW_ID}`);
      expectNoResultsWrite();
    });

    it('a null delivery_id is still named by the row id in the error line', async () => {
      table.query.mockImplementation(async () => {
        throw new Error('connection reset');
      });

      await service.correlate(delivery({ delivery_id: null }));

      const messages = errorLog.mock.calls
        .map((call) => String(call[0]))
        .join('\n');
      expect(messages).toContain('delivery_id=none');
      expect(messages).toContain(`id=${DELIVERY_ROW_ID}`);
    });
  });
});
