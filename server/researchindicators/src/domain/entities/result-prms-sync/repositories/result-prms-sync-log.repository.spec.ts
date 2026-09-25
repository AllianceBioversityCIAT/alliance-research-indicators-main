import { DataSource, EntityManager } from 'typeorm';
import { AppConfigKey } from '../../app-config/enum/app-config-key.enum';
import { PrmsSyncOutcome } from '../../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PolicyTypesEnum } from '../../policy-types/enum/policy-types.enum';
import {
  PRMS_IN_FLIGHT_LIVE_WINDOW_MS,
  PRMS_TRANSPORT_CEILING_MS,
} from '../result-prms-sync.constants';
import { ResultPrmsSyncLogRepository } from './result-prms-sync-log.repository';

describe('ResultPrmsSyncLogRepository', () => {
  let query: jest.Mock;
  let transactionQuery: jest.Mock;
  let repository: ResultPrmsSyncLogRepository;
  let manager: Pick<EntityManager, 'query'>;

  beforeEach(() => {
    query = jest.fn();
    transactionQuery = jest.fn();
    manager = { query: transactionQuery };
    const dataSource = {
      query,
      transaction: jest.fn(async (work: (m: EntityManager) => unknown) =>
        work(manager as EntityManager),
      ),
    } as unknown as DataSource;
    repository = new ResultPrmsSyncLogRepository(dataSource);
  });

  const claim = (now = new Date('2026-09-15T12:00:00.000Z')) =>
    repository.claimAttempt(42, {
      environment: 'TEST',
      userId: 7,
      now,
    });

  it('runs the four-way claim branch inside one locked transaction with FOR UPDATE', async () => {
    transactionQuery
      .mockResolvedValueOnce([
        {
          result_id: 42,
          result_official_code: 1001,
          is_synced_to_prms: 0,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ max_attempt: 2 }])
      .mockResolvedValueOnce({ insertId: 99 });

    const decision = await claim();

    expect(decision).toEqual({
      kind: 'claimed',
      attemptId: 99,
      attemptNumber: 3,
      resultOfficialCode: 1001,
    });
    expect(transactionQuery).toHaveBeenCalled();
    const lockSql = transactionQuery.mock.calls.map(
      (call) => call[0] as string,
    );
    expect(lockSql[0]).toMatch(/FROM results[\s\S]*FOR UPDATE/);
    expect(lockSql[1]).toMatch(/FROM result_prms_sync_log[\s\S]*FOR UPDATE/);
    expect(lockSql.every((sql) => typeof sql === 'string')).toBe(true);
  });

  it('returns already_synced and writes nothing when is_synced_to_prms is a tinyint 1', async () => {
    transactionQuery.mockResolvedValueOnce([
      {
        result_id: 42,
        result_official_code: 1001,
        is_synced_to_prms: 1,
      },
    ]);

    const decision = await claim();

    expect(decision).toEqual({
      kind: 'already_synced',
      resultOfficialCode: 1001,
    });
    expect(transactionQuery).toHaveBeenCalledTimes(1);
    expect(transactionQuery.mock.calls[0][0]).toMatch(/FOR UPDATE/);
  });

  it('returns collision and writes nothing for a live IN_FLIGHT row', async () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    transactionQuery
      .mockResolvedValueOnce([
        {
          result_id: 42,
          result_official_code: 1001,
          is_synced_to_prms: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 8,
          attempt_number: 1,
          created_at: new Date(now.getTime() - PRMS_TRANSPORT_CEILING_MS),
        },
      ]);

    const decision = await claim(now);

    expect(decision).toEqual({
      kind: 'collision',
      attemptNumber: 1,
      resultOfficialCode: 1001,
    });
    const sql = transactionQuery.mock.calls.map((call) => call[0] as string);
    expect(sql.some((s) => /INSERT INTO result_prms_sync_log/.test(s))).toBe(
      false,
    );
    expect(sql.some((s) => /UPDATE result_prms_sync_log/.test(s))).toBe(false);
  });

  it('expires an aged IN_FLIGHT to UNKNOWN and does not insert a new claim', async () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    const agedCreatedAt = new Date(
      now.getTime() - PRMS_IN_FLIGHT_LIVE_WINDOW_MS - 1,
    );
    transactionQuery
      .mockResolvedValueOnce([
        {
          result_id: 42,
          result_official_code: 1001,
          is_synced_to_prms: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 8,
          attempt_number: 4,
          created_at: agedCreatedAt,
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const decision = await claim(now);

    expect(decision).toEqual({
      kind: 'expired',
      attemptId: 8,
      attemptNumber: 4,
      resultOfficialCode: 1001,
    });
    const updateSql = transactionQuery.mock.calls[2][0] as string;
    const updateParams = transactionQuery.mock.calls[2][1] as unknown[];
    expect(updateSql).toMatch(/SET outcome = \?/);
    expect(updateSql).toMatch(/AND outcome = \?/);
    expect(updateParams).toContain(PrmsSyncOutcome.UNKNOWN);
    expect(updateParams).toContain(PrmsSyncOutcome.IN_FLIGHT);
    const sql = transactionQuery.mock.calls.map((call) => call[0] as string);
    expect(sql.some((s) => /INSERT INTO result_prms_sync_log/.test(s))).toBe(
      false,
    );
  });

  it('settleIfInFlight writes nothing when the row is no longer IN_FLIGHT', async () => {
    transactionQuery.mockResolvedValueOnce({ affectedRows: 0 });

    const result = await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.ACCEPTED,
      userId: 7,
      requestId: 'late-id',
    });

    expect(result).toBe('late');
    expect(transactionQuery).toHaveBeenCalledTimes(1);
    const sql = transactionQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/AND outcome = \?/);
  });

  const acceptedSettle = () =>
    repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.ACCEPTED,
      userId: 7,
      prmsResultCode: 555,
      prmsPhaseId: 36,
      requestPayload: { tenant: 'prms.result-management.api' },
    });

  // --- identity columns + external_reference from claim time (2026-09-21) ----

  it('claims on (external_reference, result_year), never on result_id', async () => {
    transactionQuery
      .mockResolvedValueOnce([
        {
          result_id: 42,
          result_official_code: 19999,
          report_year_id: 2026,
          is_synced_to_prms: 0,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ max_attempt: 0 }])
      .mockResolvedValueOnce({ insertId: 7 });

    await claim();

    const inFlightSql = String(transactionQuery.mock.calls[1][0]);
    expect(inFlightSql).toMatch(/external_reference = \?/);
    expect(inFlightSql).toMatch(/result_year = \?/);
    // The surrogate key is gone from the log entirely; keying on it would leave a
    // live row and its snapshots as separate identities, and PRMS resolves both
    // to ONE result via external_reference.
    expect(inFlightSql).not.toMatch(/WHERE result_id/);
    // A STRING: external_reference is varchar, and it already carries the result
    // official code, so no separate numeric code column is stored.
    expect(transactionQuery.mock.calls[1][1]).toEqual([
      '19999',
      2026,
      PrmsSyncOutcome.IN_FLIGHT,
    ]);
  });

  it('writes external_reference on the CLAIM, so a row that never reaches PRMS still has it', async () => {
    // Measured before this change: all 15 REFUSED_BY_STAR and both UNKNOWN rows
    // had a null external_reference, because it was only extracted from a built
    // payload.
    transactionQuery
      .mockResolvedValueOnce([
        {
          result_id: 42,
          result_official_code: 19999,
          report_year_id: 2026,
          is_synced_to_prms: 0,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ max_attempt: 0 }])
      .mockResolvedValueOnce({ insertId: 7 });

    await claim();

    const insertSql = String(transactionQuery.mock.calls[3][0]);
    const insertParams = transactionQuery.mock.calls[3][1] as unknown[];

    expect(insertSql).toMatch(/external_reference/);
    // The EXACT array, in order -- not `toContain`. A params list one item too
    // long still "contains" the right value while shifting every column one to
    // the right, and MySQL then reports the mismatch at whichever column first
    // rejects the type ("Incorrect integer value: 'IN_FLIGHT' for column
    // 'created_by'"), which points nowhere near the real mistake. This exact
    // bug shipped on 2026-09-22 under a `toContain` assertion.
    expect(insertParams).toEqual([
      '19999',
      2026,
      1,
      'TEST',
      PrmsSyncOutcome.IN_FLIGHT,
      7,
    ]);
    // Structural guard for the whole class: one placeholder per bound param.
    expect((insertSql.match(/\?/g) ?? []).length).toBe(insertParams.length);
  });

  it('a settle with no payload does NOT erase the external_reference', async () => {
    // COALESCE, not a plain assignment: an expiry or a refusal settles with
    // null and must leave the claim-time value standing.
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
      userId: 7,
      failureReason: 'rejected',
      externalReference: null,
    });

    expect(String(transactionQuery.mock.calls[0][0])).toMatch(
      /external_reference = COALESCE\(\?, external_reference\)/,
    );
  });

  it('settleIfInFlight flips is_synced_to_prms in the settle transaction, and NOTHING else', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    expect(await acceptedSettle()).toBe('settled');

    expect(transactionQuery).toHaveBeenCalledTimes(2);
    expect(transactionQuery.mock.calls[1][0]).toMatch(
      /SET is_synced_to_prms = TRUE/,
    );
    expect(transactionQuery.mock.calls[1][1]).toEqual([42]);
    // The metadata columns must NOT ride the transaction. They used to, and a
    // failure writing them rolled the settle back -- losing the record that PRMS
    // had accepted while PRMS still held the result.
    expect(transactionQuery.mock.calls[1][0]).not.toMatch(/prms_result_code/);
    expect(transactionQuery.mock.calls[1][0]).not.toMatch(/prms_phase_id/);
  });

  it('writes the PRMS metadata OUTSIDE the transaction, after it commits', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await acceptedSettle();

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/prms_result_code\s*=\s*\?/);
    expect(query.mock.calls[0][0]).toMatch(/prms_phase_id\s*=\s*\?/);
    // result code, phase id, result id -- ORDER MATTERS: positional `?` params,
    // so a transposition writes the phase into prms_result_code.
    expect(query.mock.calls[0][1]).toEqual([555, 36, 42]);
  });

  it('SURVIVES a metadata write failure: still settled, never throws', async () => {
    // The exact shape of the 2026-09-21 incident: the metadata UPDATE failed (the
    // prms_phase_id column was missing) and took the whole settle down with it.
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockRejectedValue(
      new Error("Unknown column 'prms_phase_id' in 'field list'"),
    );

    await expect(acceptedSettle()).resolves.toBe('settled');

    // The settle itself still happened -- both transaction writes were issued.
    expect(transactionQuery).toHaveBeenCalledTimes(2);
  });

  it('does not attempt the metadata write on a LATE settle', async () => {
    // R-PRMS-013 AC.4: a settle arriving after expiry writes nothing at all.
    transactionQuery.mockResolvedValueOnce({ affectedRows: 0 });

    expect(await acceptedSettle()).toBe('late');

    expect(transactionQuery).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });

  it('does not attempt the metadata write on a non-ACCEPTED outcome', async () => {
    transactionQuery.mockResolvedValueOnce({ affectedRows: 1 });

    const result = await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
      userId: 7,
      failureReason: 'rejected',
    });

    expect(result).toBe('settled');
    expect(transactionQuery).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });

  it('insertRefusedByStar assigns attempt_number under the results row lock', async () => {
    transactionQuery
      .mockResolvedValueOnce([{ result_id: 42 }])
      .mockResolvedValueOnce([{ max_attempt: 0 }])
      .mockResolvedValueOnce({ insertId: 11 });

    const inserted = await repository.insertRefusedByStar({
      resultId: 42,
      environment: 'TEST',
      userId: 7,
      failureReason: 'Pool Funding Alignment is not green-checked',
    });

    expect(inserted).toEqual({ attemptId: 11, attemptNumber: 1 });
    expect(query).not.toHaveBeenCalled();
    const lockSql = transactionQuery.mock.calls[0][0] as string;
    expect(lockSql).toMatch(/FROM results[\s\S]*FOR UPDATE/);
    const insertSql = transactionQuery.mock.calls[2][0] as string;
    expect(insertSql).toMatch(
      /prms_type,\s+http_status,\s+request_id,\s+request_payload,\s+response_body/,
    );
    expect(insertSql).toMatch(/NULL, NULL, NULL, NULL, NULL/);
    expect(transactionQuery.mock.calls[2][1]).toContain(
      PrmsSyncOutcome.REFUSED_BY_STAR,
    );
  });

  it('maps STAR policy type Program/Budget/Investment to PRMS id 1', async () => {
    query.mockResolvedValueOnce([
      {
        result_id: 42,
        result_official_code: 1001,
        is_synced_to_prms: 0,
        result_status_id: 6,
        indicator_id: 4,
        alignment_green: 1,
        agreement_id: 'C-POOL-001',
        is_pool_funding_contributor: 1,
        policy_type_id: PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT,
      },
    ]);

    const snapshot = await repository.loadGateSnapshot(42);

    expect(snapshot.prms_policy_type_id).toBe(1);
    expect(snapshot.exists).toBe(true);
    expect(snapshot.pool_funding_alignment_green).toBe(true);
    expect(snapshot.prms_sync_button_enabled).toBe(true);
  });

  describe('PRMS sync button flag on the gate snapshot', () => {
    const resultRow = {
      result_id: 42,
      result_official_code: 1001,
      is_synced_to_prms: 0,
      result_status_id: 6,
      indicator_id: 4,
      alignment_green: 1,
      agreement_id: 'C-POOL-001',
      is_pool_funding_contributor: 1,
      policy_type_id: null,
    };

    const flagCall = () =>
      query.mock.calls.find((call) =>
        String(call[0]).includes('FROM app_config'),
      );

    it('stores disabled only when simple_value is the exact disable string', async () => {
      query
        .mockResolvedValueOnce([resultRow])
        .mockResolvedValueOnce([{ simple_value: 'false' }]);

      const snapshot = await repository.loadGateSnapshot(42);

      expect(snapshot.prms_sync_button_enabled).toBe(false);
      expect(flagCall()?.[1]).toEqual([
        AppConfigKey.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED,
      ]);
    });

    it('stays enabled when the row is missing, and still reports a missing result', async () => {
      query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const snapshot = await repository.loadGateSnapshot(42);

      expect(snapshot.exists).toBe(false);
      expect(snapshot.prms_sync_button_enabled).toBe(true);
    });

    it('stays enabled when the config read throws', async () => {
      query
        .mockResolvedValueOnce([resultRow])
        .mockRejectedValueOnce(new Error('config unread'));

      const snapshot = await repository.loadGateSnapshot(42);

      expect(snapshot.exists).toBe(true);
      expect(snapshot.prms_sync_button_enabled).toBe(true);
    });
  });

  /**
   * Versions (`is_snapshot = TRUE`) are the approved rows, and they are what PRMS
   * receives. ResultsUtil already chooses live-vs-version from `reportYear` before
   * the id reaches this repository, so re-filtering here refused every version with
   * a 404 "Result not found". Asserted on the emitted SQL, where the property lives.
   */
  describe('version (snapshot) rows are reachable', () => {
    const snapshotRow = {
      result_id: 555,
      result_official_code: 19949,
      is_synced_to_prms: 0,
      result_status_id: 6,
      indicator_id: 4,
      alignment_green: 1,
      agreement_id: 'C-POOL-001',
      is_pool_funding_contributor: 1,
      policy_type_id: null,
    };

    it('loadGateSnapshot does not constrain is_snapshot, and resolves a version row', async () => {
      query.mockResolvedValueOnce([snapshotRow]);

      const snapshot = await repository.loadGateSnapshot(555);

      expect(query.mock.calls[0][0] as string).not.toMatch(/is_snapshot/i);
      expect(snapshot.exists).toBe(true);
      expect(snapshot.result_id).toBe(555);
      expect(snapshot.result_official_code).toBe(19949);
    });

    it('the claim lock does not constrain is_snapshot', async () => {
      transactionQuery
        .mockResolvedValueOnce([
          { result_id: 555, result_official_code: 19949, is_synced_to_prms: 0 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ max_attempt: 0 }])
        .mockResolvedValueOnce({ insertId: 1 });

      await repository.claimAttempt(555, {
        environment: 'TEST',
        userId: 7,
        now: new Date('2026-09-16T12:00:00.000Z'),
      });

      const lockSql = transactionQuery.mock.calls[0][0] as string;
      expect(lockSql).toContain('FOR UPDATE');
      expect(lockSql).not.toMatch(/is_snapshot/i);
    });

    it('the insertRefusedByStar lock does not constrain is_snapshot', async () => {
      transactionQuery
        .mockResolvedValueOnce([{ result_id: 555 }])
        .mockResolvedValueOnce([{ max_attempt: 0 }])
        .mockResolvedValueOnce({ insertId: 2 });

      await repository.insertRefusedByStar({
        resultId: 555,
        environment: 'TEST',
        userId: 7,
        failureReason: 'Refused by STAR',
      });

      const lockSql = transactionQuery.mock.calls[0][0] as string;
      expect(lockSql).toContain('FOR UPDATE');
      expect(lockSql).not.toMatch(/is_snapshot/i);
    });
  });
});
