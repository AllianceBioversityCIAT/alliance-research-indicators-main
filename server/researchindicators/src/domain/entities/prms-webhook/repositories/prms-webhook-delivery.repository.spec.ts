import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, EntityManager } from 'typeorm';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { DeliveryCorrelationOutcome } from '../enum/delivery-correlation-outcome.enum';
import { DeliveryProcessingState } from '../enum/delivery-processing-state.enum';
import {
  PrmsWebhookDeliveryRepository,
  RecordDeliveryInput,
} from './prms-webhook-delivery.repository';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-05.
//
// KZ-017 — what this tier structurally CANNOT reach: a mocked
// `EntityManager` proves the emitted SQL text, the bound parameters and the
// attempt count. It does NOT exercise InnoDB, so gap locks, insert-intention
// waits, and the real deadlock/timeout behaviour DD-5 reasons about are
// unproven here. Every lock-related assertion below is on the query TEXT.

type FakeRow = Record<string, unknown>;

/**
 * A minimal table fake driven by the SQL the repository emits — never by
 * mock-call order. An INSERT is decoded by its own column list; a SELECT
 * is filtered on the column its WHERE names and on `duplicate_of_id IS
 * NULL` when the text carries it. Deleting the dedupe read, or keying it
 * on a body hash instead of `delivery_id`, changes what the fake returns —
 * that is what makes the four dedupe fixtures discriminating (KZ-004).
 */
class FakeDeliveryTable {
  rows: FakeRow[] = [];
  private nextId = 100;

  readonly query = jest.fn((sql: string, params: unknown[] = []) =>
    this.execute(sql, params),
  );

  async execute(sql: string, params: unknown[] = []): Promise<unknown> {
    if (/^\s*SELECT/i.test(sql)) {
      return this.select(sql, params);
    }
    if (/^\s*INSERT\s+INTO\s+result_prms_sync_history/i.test(sql)) {
      return this.insert(sql, params);
    }
    throw new Error(`FakeDeliveryTable: unsupported SQL\n${sql}`);
  }

  private select(sql: string, params: unknown[]): FakeRow[] {
    const where = /WHERE\s+(\w+)\s*=\s*\?/i.exec(sql);
    if (!where) {
      throw new Error(
        `FakeDeliveryTable: SELECT without WHERE col = ?\n${sql}`,
      );
    }
    const column = where[1];
    const onlyOriginals = /duplicate_of_id\s+IS\s+NULL/i.test(sql);
    return this.rows
      .filter((row) => row[column] === params[0])
      .filter((row) => !onlyOriginals || row.duplicate_of_id === null)
      .map((row) => ({ id: row.id }));
  }

  private insert(sql: string, params: unknown[]): { insertId: number } {
    const match =
      /INSERT\s+INTO\s+result_prms_sync_history\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i.exec(
        sql,
      );
    if (!match) {
      throw new Error(`FakeDeliveryTable: unparseable INSERT\n${sql}`);
    }
    const columns = match[1].split(',').map((c) => c.trim());
    const tokens = match[2].split(',').map((t) => t.trim());
    if (columns.length !== tokens.length) {
      throw new Error(
        `FakeDeliveryTable: ${columns.length} columns vs ${tokens.length} values`,
      );
    }
    const row: FakeRow = { id: this.nextId++ };
    let paramIndex = 0;
    columns.forEach((column, i) => {
      const token = tokens[i];
      if (token === '?') {
        row[column] = params[paramIndex++];
      } else if (/^NULL$/i.test(token)) {
        row[column] = null;
      } else if (/^TRUE$/i.test(token)) {
        row[column] = true;
      } else {
        throw new Error(`FakeDeliveryTable: unsupported literal ${token}`);
      }
    });
    if (paramIndex !== params.length) {
      throw new Error(
        `FakeDeliveryTable: ${paramIndex} placeholders vs ${params.length} params`,
      );
    }
    this.rows.push(row);
    return { insertId: row.id as number };
  }

  applied(): FakeRow[] {
    return this.rows.filter(
      (row) => row.correlation_outcome !== DeliveryCorrelationOutcome.DUPLICATE,
    );
  }

  duplicates(): FakeRow[] {
    return this.rows.filter(
      (row) => row.correlation_outcome === DeliveryCorrelationOutcome.DUPLICATE,
    );
  }
}

const OCCURRED_AT = new Date('2026-09-22T10:00:00.000Z');
const DECIDED_AT = new Date('2026-09-22T09:59:00.000Z');

const delivery = (
  overrides: Partial<RecordDeliveryInput> = {},
): RecordDeliveryInput => ({
  delivery_id: '4172',
  occurred_at: OCCURRED_AT,
  environment: 'TEST',
  correlation_outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
  external_reference: '1441061',
  prms_result_id: 9001,
  prms_result_code: 555,
  decision: 'APPROVE',
  justification: 'Looks right',
  decided_at: DECIDED_AT,
  raw_body: { result_id: 9001, decision: 'APPROVE' },
  raw_headers: { 'x-prms-delivery-id': '4172' },
  ...overrides,
});

describe('PrmsWebhookDeliveryRepository', () => {
  let table: FakeDeliveryTable;
  let transaction: jest.Mock;
  let dataSourceQuery: jest.Mock;
  let repository: PrmsWebhookDeliveryRepository;

  beforeEach(() => {
    table = new FakeDeliveryTable();
    dataSourceQuery = jest.fn();
    const manager = { query: table.query } as unknown as EntityManager;
    transaction = jest.fn(async (work: (m: EntityManager) => unknown) =>
      work(manager),
    );
    const dataSource = {
      query: dataSourceQuery,
      transaction,
    } as unknown as DataSource;
    repository = new PrmsWebhookDeliveryRepository(dataSource);
  });

  const emittedSql = (): string[] =>
    table.query.mock.calls.map((call) => String(call[0]));

  describe('recordDelivery — the dedupe transaction (design §6.3 step 3)', () => {
    it('a first delivery: one FOR UPDATE read on delivery_id, one INSERT, inside one transaction', async () => {
      const result = await repository.recordDelivery(delivery());

      expect(transaction).toHaveBeenCalledTimes(1);
      const sql = emittedSql();
      expect(sql).toHaveLength(2);
      // Asserted on the generated query TEXT (KZ-001), not on how it was built.
      expect(sql[0]).toMatch(
        /SELECT\s+id\s+FROM\s+result_prms_sync_history\s+WHERE\s+delivery_id\s*=\s*\?\s+AND\s+duplicate_of_id\s+IS\s+NULL\s+FOR\s+UPDATE/i,
      );
      expect(sql[0]).toContain('FOR UPDATE');
      expect(sql[0]).toContain('duplicate_of_id IS NULL');
      expect(table.query.mock.calls[0][1]).toEqual(['4172']);
      expect(sql[1]).toMatch(/^\s*INSERT\s+INTO\s+result_prms_sync_history/);

      expect(result).toEqual({
        kind: 'recorded',
        deliveryRowId: 100,
        correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      });
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]).toEqual({
        id: 100,
        delivery_id: '4172',
        occurred_at: OCCURRED_AT,
        environment: 'TEST',
        correlation_outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        result_id: null,
        external_reference: '1441061',
        prms_result_id: 9001,
        prms_result_code: 555,
        decision: 'APPROVE',
        justification: 'Looks right',
        decided_at: DECIDED_AT,
        // JSON columns are bound as text — mysql2 would otherwise expand an
        // object into `key = value` pairs (the exemplar binds
        // `JSON.stringify(input.requestPayload)` for the same reason).
        raw_body: JSON.stringify({ result_id: 9001, decision: 'APPROVE' }),
        raw_headers: JSON.stringify({ 'x-prms-delivery-id': '4172' }),
        processing_state: DeliveryProcessingState.RECEIVED,
        processing_error: null,
        duplicate_of_id: null,
        created_by: null,
        is_active: true,
        // The Pivot's discriminator: every row this method writes is an
        // inbound PRMS delivery. The other six Pivot columns are NULL —
        // T-11's outbound write is the only path that fills them.
        event_source: 'PRMS',
        status: null,
        actor_user_id: null,
        reviewer_name: null,
        reviewer_role: null,
        science_program_code: null,
        changes: null,
      });
    });

    it('binds the INSERT with the EXACT parameter list, one placeholder per bound value', async () => {
      await repository.recordDelivery(delivery());

      const insertSql = String(table.query.mock.calls[1][0]);
      const insertParams = table.query.mock.calls[1][1] as unknown[];
      // The exact array, in order — a `toContain` cannot see a shifted column
      // (the exemplar spec's "The EXACT array, in order" comment records the
      // bug that shipped under a `toContain`).
      expect(insertParams).toEqual([
        '4172',
        OCCURRED_AT,
        'TEST',
        DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        '1441061',
        9001,
        555,
        'APPROVE',
        'Looks right',
        DECIDED_AT,
        JSON.stringify({ result_id: 9001, decision: 'APPROVE' }),
        JSON.stringify({ 'x-prms-delivery-id': '4172' }),
        DeliveryProcessingState.RECEIVED,
        null,
        'PRMS',
      ]);
      expect((insertSql.match(/\?/g) ?? []).length).toBe(insertParams.length);
    });

    it('AC.1 / AC.2 — the same delivery_id twice: TWO rows, ONE applied, the second DUPLICATE pointing at the first', async () => {
      const first = await repository.recordDelivery(delivery());
      const second = await repository.recordDelivery(delivery());

      expect(first).toEqual({
        kind: 'recorded',
        deliveryRowId: 100,
        correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      });
      expect(second).toEqual({
        kind: 'duplicate',
        deliveryRowId: 101,
        duplicateOfId: 100,
      });
      expect(table.rows).toHaveLength(2);
      expect(table.applied()).toHaveLength(1);
      expect(table.duplicates()).toHaveLength(1);
      expect(table.duplicates()[0]).toMatchObject({
        id: 101,
        delivery_id: '4172',
        correlation_outcome: DeliveryCorrelationOutcome.DUPLICATE,
        duplicate_of_id: 100,
        raw_body: JSON.stringify({ result_id: 9001, decision: 'APPROVE' }),
      });
      // Both attempts ran the locked read before writing.
      const sql = emittedSql();
      expect(sql.filter((s) => /FOR UPDATE/.test(s))).toHaveLength(2);
    });

    it('a THIRD repeat still points at the ORIGINAL, never at the earlier duplicate', async () => {
      await repository.recordDelivery(delivery());
      await repository.recordDelivery(delivery());
      const third = await repository.recordDelivery(delivery());

      expect(third).toEqual({
        kind: 'duplicate',
        deliveryRowId: 102,
        duplicateOfId: 100,
      });
      expect(table.applied()).toHaveLength(1);
      expect(table.duplicates().map((r) => r.duplicate_of_id)).toEqual([
        100, 100,
      ]);
    });

    it('AC.5 — DIFFERENT ids with IDENTICAL bodies are BOTH applied (dedupe is keyed on the id, not a body hash)', async () => {
      const body = { result_id: 9001, decision: 'APPROVE' };
      const a = await repository.recordDelivery(
        delivery({ delivery_id: '4172', raw_body: body }),
      );
      const b = await repository.recordDelivery(
        delivery({ delivery_id: '4173', raw_body: body }),
      );

      expect(a.kind).toBe('recorded');
      expect(b.kind).toBe('recorded');
      expect(table.rows).toHaveLength(2);
      expect(table.applied()).toHaveLength(2);
      expect(table.duplicates()).toHaveLength(0);
      expect(table.rows.map((r) => r.raw_body)).toEqual([
        JSON.stringify(body),
        JSON.stringify(body),
      ]);
    });

    it('AC.4 — a NULL delivery_id is recorded, with NO dedupe read at all', async () => {
      const result = await repository.recordDelivery(
        delivery({ delivery_id: null, raw_headers: {} }),
      );

      expect(result.kind).toBe('recorded');
      const sql = emittedSql();
      expect(sql).toHaveLength(1);
      expect(sql.some((s) => /FOR UPDATE/.test(s))).toBe(false);
      expect(table.rows[0]).toMatchObject({
        delivery_id: null,
        correlation_outcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        duplicate_of_id: null,
      });
    });

    it('AC.4 — a SECOND NULL delivery_id is recorded independently and is NOT a duplicate of the first NULL', async () => {
      const first = await repository.recordDelivery(
        delivery({ delivery_id: null }),
      );
      const second = await repository.recordDelivery(
        delivery({ delivery_id: null }),
      );

      expect(first.kind).toBe('recorded');
      expect(second.kind).toBe('recorded');
      expect(table.rows).toHaveLength(2);
      expect(table.applied()).toHaveLength(2);
      expect(table.duplicates()).toHaveLength(0);
      expect(table.rows.map((r) => r.duplicate_of_id)).toEqual([null, null]);
    });

    it('a NULL id arriving AFTER a stored delivery with an id is still recorded as applied', async () => {
      await repository.recordDelivery(delivery({ delivery_id: '4172' }));
      const second = await repository.recordDelivery(
        delivery({ delivery_id: null }),
      );

      expect(second.kind).toBe('recorded');
      expect(table.applied()).toHaveLength(2);
    });
  });

  describe('recordDelivery — step 3b, the single retry on a MySQL lock conflict (DD-5, DC-12, R-PWH-006 AC.7)', () => {
    let warn: jest.SpyInstance;
    let error: jest.SpyInstance;

    beforeEach(() => {
      warn = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);
      error = jest
        .spyOn(LoggerUtil.prototype, '_error')
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      warn.mockRestore();
      error.mockRestore();
    });

    // A mysql2 lock error as TypeORM re-throws it: `QueryFailedError` copies
    // the driver's own enumerable fields (`errno`, `code`) onto itself.
    const lockError = (errno: 1213 | 1205) => ({
      errno,
      code: errno === 1213 ? 'ER_LOCK_DEADLOCK' : 'ER_LOCK_WAIT_TIMEOUT',
      message: `lock ${errno}`,
    });

    it.each<[1213 | 1205, string]>([
      [1213, 'ER_LOCK_DEADLOCK'],
      [1205, 'ER_LOCK_WAIT_TIMEOUT'],
    ])(
      'errno %i (%s) once: the transaction is retried EXACTLY once and the delivery is recorded',
      async (errno) => {
        table.query.mockRejectedValueOnce(lockError(errno));

        const result = await repository.recordDelivery(delivery());

        expect(transaction).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
          kind: 'recorded',
          deliveryRowId: 100,
          correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        });
        expect(table.rows).toHaveLength(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('4172');
        expect(String(warn.mock.calls[0][0])).toContain(String(errno));
        expect(error).not.toHaveBeenCalled();
      },
    );

    it.each<[1213 | 1205]>([[1213], [1205]])(
      'errno %i twice: fails LOUD after the second attempt — two attempts, never a third, nothing swallowed',
      async (errno) => {
        table.query
          .mockRejectedValueOnce(lockError(errno))
          .mockRejectedValueOnce(lockError(errno));

        await expect(repository.recordDelivery(delivery())).rejects.toEqual(
          lockError(errno),
        );

        expect(transaction).toHaveBeenCalledTimes(2);
        expect(table.rows).toHaveLength(0);
        expect(error).toHaveBeenCalledTimes(1);
        expect(String(error.mock.calls[0][0])).toContain('4172');
        expect(String(error.mock.calls[0][0])).toContain(String(errno));
      },
    );

    it('a lock conflict on the INSERT (after the read) re-runs the WHOLE transaction, read included', async () => {
      // First attempt: the read succeeds, the insert deadlocks.
      table.query
        .mockImplementationOnce((sql: string, params: unknown[]) =>
          table.execute(sql, params),
        )
        .mockImplementationOnce(async () => {
          throw lockError(1213);
        });

      const result = await repository.recordDelivery(delivery());

      expect(result.kind).toBe('recorded');
      expect(transaction).toHaveBeenCalledTimes(2);
      const sql = emittedSql();
      expect(sql.filter((s) => /FOR UPDATE/.test(s))).toHaveLength(2);
      expect(table.rows).toHaveLength(1);
    });

    it('a NON-lock MySQL error (1062 ER_DUP_ENTRY) is NOT retried: one attempt, propagated as-is', async () => {
      const dup = { errno: 1062, code: 'ER_DUP_ENTRY', message: 'dup' };
      table.query.mockRejectedValueOnce(dup);

      await expect(repository.recordDelivery(delivery())).rejects.toEqual(dup);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
    });

    it('a non-MySQL error (no errno) is NOT retried either', async () => {
      table.query.mockRejectedValueOnce(new Error('connection reset'));

      await expect(repository.recordDelivery(delivery())).rejects.toThrow(
        'connection reset',
      );

      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('never puts the raw body or the headers into a log line', async () => {
      table.query
        .mockRejectedValueOnce(lockError(1213))
        .mockRejectedValueOnce(lockError(1213));

      await expect(
        repository.recordDelivery(
          delivery({
            raw_body: { secretish: 'BODY-MARKER' },
            raw_headers: { 'x-marker': 'HEADER-MARKER' },
          }),
        ),
      ).rejects.toBeDefined();

      const logged = [...warn.mock.calls, ...error.mock.calls]
        .map((call) => JSON.stringify(call))
        .join('\n');
      expect(logged).not.toContain('BODY-MARKER');
      expect(logged).not.toContain('HEADER-MARKER');
    });
  });

  describe('history reads (R-PWH-005 AC.8)', () => {
    // Raw rows as mysql2 hands them back: BIGINT columns arrive as strings,
    // JSON columns already parsed, timestamps as Date.
    const rawRows = [
      {
        id: '100',
        delivery_id: '4172',
        occurred_at: new Date('2026-09-22T10:00:00.000Z'),
        environment: 'TEST',
        correlation_outcome: 'CORRELATED',
        result_id: '1441061',
        external_reference: '1441061',
        prms_result_id: '9001',
        prms_result_code: '555',
        decision: 'APPROVE',
        justification: null,
        decided_at: new Date('2026-09-22T09:59:00.000Z'),
        raw_body: { decision: 'APPROVE' },
        raw_headers: { 'x-prms-delivery-id': '4172' },
        processing_state: 'PROCESSED',
        processing_error: null,
        duplicate_of_id: null,
        event_source: 'PRMS',
        status: null,
        actor_user_id: null,
        reviewer_name: null,
        reviewer_role: null,
        science_program_code: null,
        changes: null,
        created_at: new Date('2026-09-22T10:00:00.100Z'),
        updated_at: new Date('2026-09-22T10:00:01.000Z'),
        is_active: 1,
      },
      {
        id: '101',
        delivery_id: null,
        occurred_at: new Date('2026-09-22T10:05:00.000Z'),
        environment: 'TEST',
        correlation_outcome: 'UNKNOWN_REFERENCE',
        result_id: null,
        external_reference: 'STAR-does-not-exist',
        prms_result_id: null,
        prms_result_code: null,
        decision: 'REJECT',
        justification: 'nope',
        decided_at: null,
        raw_body: null,
        raw_headers: null,
        processing_state: 'RECEIVED',
        processing_error: null,
        duplicate_of_id: '100',
        event_source: 'PRMS',
        status: null,
        actor_user_id: null,
        reviewer_name: null,
        reviewer_role: null,
        science_program_code: null,
        changes: null,
        created_at: new Date('2026-09-22T10:05:00.100Z'),
        updated_at: null,
        is_active: 1,
      },
    ];

    it('by STAR result_id: filters on result_id, orders by occurred_at ascending, outside any transaction', async () => {
      dataSourceQuery.mockResolvedValueOnce([rawRows[0]]);

      const history = await repository.findHistoryByResultId(1441061);

      expect(transaction).not.toHaveBeenCalled();
      expect(dataSourceQuery).toHaveBeenCalledTimes(1);
      const sql = String(dataSourceQuery.mock.calls[0][0]);
      expect(sql).toMatch(/FROM\s+result_prms_sync_history/);
      expect(sql).toMatch(/WHERE\s+result_id\s*=\s*\?/);
      expect(sql).toMatch(/ORDER\s+BY\s+occurred_at\s+ASC/);
      expect(sql).not.toMatch(/FOR UPDATE/);
      // Never filters on is_active: nothing in this spec flips it, and a
      // hidden filter would be a way to silently discard history.
      expect(sql).not.toMatch(/is_active\s*=/);
      expect(dataSourceQuery.mock.calls[0][1]).toEqual([1441061]);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: 100,
        delivery_id: '4172',
        result_id: 1441061,
        prms_result_id: 9001,
        prms_result_code: 555,
        duplicate_of_id: null,
        correlation_outcome: DeliveryCorrelationOutcome.CORRELATED,
        raw_body: { decision: 'APPROVE' },
        is_active: true,
        event_source: 'PRMS',
        status: null,
        actor_user_id: null,
        reviewer_name: null,
        reviewer_role: null,
        science_program_code: null,
        changes: null,
      });
    });

    it('across all results: NO result_id filter, so uncorrelated (result_id IS NULL) rows come back too, in occurred_at order', async () => {
      dataSourceQuery.mockResolvedValueOnce(rawRows);

      const history = await repository.findHistory();

      expect(transaction).not.toHaveBeenCalled();
      const sql = String(dataSourceQuery.mock.calls[0][0]);
      expect(sql).toMatch(/FROM\s+result_prms_sync_history/);
      expect(sql).not.toMatch(/WHERE/);
      expect(sql).toMatch(/ORDER\s+BY\s+occurred_at\s+ASC/);
      expect(sql).not.toMatch(/FOR UPDATE/);

      expect(history).toHaveLength(2);
      expect(history.map((row) => row.result_id)).toEqual([1441061, null]);
      expect(history[1]).toMatchObject({
        id: 101,
        delivery_id: null,
        result_id: null,
        duplicate_of_id: 100,
        prms_result_id: null,
        raw_body: null,
        decided_at: null,
        event_source: 'PRMS',
      });
    });

    it('both reads select the domain columns (including the seven Pivot columns) and leave the select:false audit columns out', async () => {
      dataSourceQuery.mockResolvedValue([]);

      await repository.findHistoryByResultId(1);
      await repository.findHistory();

      // Pinned first: a loop over zero calls asserts nothing (KZ-017).
      expect(dataSourceQuery).toHaveBeenCalledTimes(2);
      for (const call of dataSourceQuery.mock.calls) {
        const sql = String(call[0]);
        for (const column of [
          'delivery_id',
          'occurred_at',
          'correlation_outcome',
          'result_id',
          'duplicate_of_id',
          'raw_body',
          'processing_state',
          'event_source',
          'status',
          'actor_user_id',
          'reviewer_name',
          'reviewer_role',
          'science_program_code',
          'changes',
        ]) {
          expect(sql).toContain(column);
        }
        expect(sql).not.toMatch(/created_by|updated_by|deleted_at/);
      }
    });
  });

  describe('append-only (R-PWH-005 AC.7)', () => {
    it('the shipped repository source emits no UPDATE or DELETE against result_prms_sync_history, and never flips is_active', () => {
      // A lock on the real artifact, not on this suite's call log: a later
      // edit that adds a mutation reddens this without needing a fixture.
      const source = readFileSync(
        join(__dirname, 'prms-webhook-delivery.repository.ts'),
        'utf8',
      );
      expect(source).not.toMatch(/UPDATE\s+result_prms_sync_history/i);
      expect(source).not.toMatch(/DELETE\s+FROM\s+result_prms_sync_history/i);
      expect(source).not.toMatch(/is_active\s*=\s*(FALSE|0)\b/i);
      expect(source).toMatch(/INSERT\s+INTO\s+result_prms_sync_history/);
    });
  });
});
