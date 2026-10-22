import { DataSource, EntityManager } from 'typeorm';
import { AppConfigKey } from '../../app-config/enum/app-config-key.enum';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { ReportingYearResolver } from '../../../shared/utils/reporting-year.resolver';
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
  let resolveYear: jest.Mock;
  let repository: ResultPrmsSyncLogRepository;
  let manager: Pick<EntityManager, 'query'>;

  beforeEach(() => {
    query = jest.fn();
    transactionQuery = jest.fn();
    resolveYear = jest.fn().mockResolvedValue(2026);
    manager = { query: transactionQuery };
    const dataSource = {
      query,
      transaction: jest.fn(async (work: (m: EntityManager) => unknown) =>
        work(manager as EntityManager),
      ),
    } as unknown as DataSource;
    repository = new ResultPrmsSyncLogRepository(dataSource, {
      resolve: resolveYear,
    } as unknown as ReportingYearResolver);
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
          report_year_id: 2026,
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
      resultYear: 2026,
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

  it('claims on (platform_code, external_reference, result_year), never on result_id', async () => {
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
    expect(inFlightSql).toMatch(/platform_code = \?/);
    expect(inFlightSql).toMatch(/external_reference = \?/);
    expect(inFlightSql).toMatch(/result_year = \?/);
    // The surrogate key is gone from the log entirely; keying on it would leave a
    // live row and its snapshots as separate identities, and PRMS resolves both
    // to ONE result via external_reference.
    expect(inFlightSql).not.toMatch(/WHERE result_id/);
    // HEAD bound ['19999', 2026, IN_FLIGHT]. This fixture has no platform, so it
    // is STAR: the reference string stays '19999' and the platform is prepended.
    expect(transactionQuery.mock.calls[1][1]).toEqual([
      'STAR',
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
    // HEAD bound ['19999', 2026, 1, 'TEST', IN_FLIGHT, 7]. The reference is
    // still the bare code; platform_code is the new leading column.
    expect(insertParams).toEqual([
      'STAR',
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

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toMatch(/COALESCE\(prms_result_code, \?\)/);
    expect(query.mock.calls[0][0]).toMatch(/prms_phase_id\s*=\s*\?/);
    // result code, phase id, result id -- ORDER MATTERS: positional `?` params,
    // so a transposition writes the phase into prms_result_code.
    expect(query.mock.calls[0][1]).toEqual([555, 36, 42]);
  });

  it('also writes ONLY the PRMS code onto the live version of the pushed result', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await acceptedSettle();

    const liveSql = String(query.mock.calls[1][0]);
    expect(liveSql).toMatch(/SET live\.prms_result_code = \?/);
    expect(liveSql).toMatch(/live\.is_snapshot = FALSE/);
    expect(liveSql).toMatch(/live\.is_active = TRUE/);
    // NULL on the pushed side is STAR, so a STAR push still copies. The live
    // side stays strict: HEAD never wrote a NULL live row.
    expect(liveSql).toMatch(
      /live\.platform_code\s*=\s*COALESCE\(pushed\.platform_code,\s*'STAR'\)/,
    );
    expect(liveSql).not.toMatch(/report_year_id/);
    expect(liveSql).toMatch(/live\.prms_result_code IS NULL/);
    expect(liveSql).toMatch(
      /pushed\.result_official_code = live\.result_official_code/,
    );
    // The phase belongs to the pushed version, never to the live row.
    expect(liveSql).not.toMatch(/prms_phase_id/);
    expect(query.mock.calls[1][1]).toEqual([555, 42]);
  });

  it('does not touch the live version when PRMS returned no code', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.ACCEPTED,
      userId: 7,
      prmsResultCode: null,
      prmsPhaseId: 36,
      storedPrmsResultCode: null,
    });

    expect(query).toHaveBeenCalledTimes(1);
    const pushedSql = String(query.mock.calls[0][0]);
    expect(pushedSql).toMatch(/COALESCE\(prms_result_code, \?\)/);
    expect(query.mock.calls[0][1]).toEqual([null, 36, 42]);
  });

  it('copies the stored code onto the live row when PRMS returns no code', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.ACCEPTED,
      userId: 7,
      prmsResultCode: null,
      prmsPhaseId: 36,
      storedPrmsResultCode: 9475,
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][1]).toEqual([null, 36, 42]);
    const liveSql = String(query.mock.calls[1][0]);
    expect(liveSql).toMatch(/live\.prms_result_code IS NULL/);
    expect(query.mock.calls[1][1]).toEqual([9475, 42]);
  });

  it('writes the returned code on the live row when nothing is stored yet', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.ACCEPTED,
      userId: 7,
      prmsResultCode: 8888,
      prmsPhaseId: 36,
      storedPrmsResultCode: null,
    });

    expect(query.mock.calls[1][1]).toEqual([8888, 42]);
  });

  it('warns and keeps the stored code when PRMS returns a different non-null code', async () => {
    const warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query.mockResolvedValue({ affectedRows: 1 });

    await repository.settleIfInFlight({
      attemptId: 8,
      resultId: 42,
      outcome: PrmsSyncOutcome.ACCEPTED,
      userId: 7,
      prmsResultCode: 8888,
      prmsPhaseId: 36,
      storedPrmsResultCode: 9475,
    });

    const pushedSql = String(query.mock.calls[0][0]);
    expect(pushedSql).toMatch(/COALESCE\(prms_result_code, \?\)/);
    expect(query.mock.calls[0][1]).toEqual([8888, 36, 42]);
    const liveSql = String(query.mock.calls[1][0]);
    expect(liveSql).toMatch(/live\.prms_result_code IS NULL/);
    expect(query.mock.calls[1][1]).toEqual([9475, 42]);
    expect(query.mock.calls[1][1]).not.toEqual([8888, 42]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = String(warnSpy.mock.calls[0][0]);
    expect(message).toContain('42');
    expect(message).toContain('9475');
    expect(message).toContain('8888');
    warnSpy.mockRestore();
  });

  it('still writes the live code when the snapshot metadata write fails', async () => {
    transactionQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 });
    query
      .mockRejectedValueOnce(new Error('snapshot write failed'))
      .mockResolvedValueOnce({ affectedRows: 1 });

    await expect(acceptedSettle()).resolves.toBe('settled');

    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[1][0])).toMatch(/live\.prms_result_code/);
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

    it('loadGateSnapshot selects r.report_year_id and sets reporting_year from the resolver', async () => {
      resolveYear.mockResolvedValue(2027);
      query.mockResolvedValueOnce([
        {
          ...snapshotRow,
          report_year_id: '2025',
        },
      ]);

      const snapshot = await repository.loadGateSnapshot(555);

      const selectSql = query.mock.calls[0][0] as string;
      expect(selectSql).toContain('r.report_year_id');
      expect(snapshot.report_year).toBe(2025);
      expect(snapshot.reporting_year).toBe(2027);
    });

    it('loadGateSnapshot records a null report_year when report_year_id is null', async () => {
      query.mockResolvedValueOnce([
        {
          ...snapshotRow,
          report_year_id: null,
        },
      ]);

      const snapshot = await repository.loadGateSnapshot(555);

      expect(snapshot.report_year).toBeNull();
      expect(snapshot.reporting_year).toBe(2026);
    });

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

  const claimRow = (platform: string | null, code: number) => ({
    result_id: 42,
    result_official_code: code,
    report_year_id: 2026,
    is_synced_to_prms: 0,
    platform_code: platform,
  });

  const primeClaim = (platform: string | null, code: number) => {
    transactionQuery
      .mockResolvedValueOnce([claimRow(platform, code)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ max_attempt: 0 }])
      .mockResolvedValueOnce({ insertId: 7 });
  };

  describe('platform identity on the sync log (R-PPI-001 / R-PPI-002)', () => {
    it('a TIP claim writes platform_code TIP and external_reference TIP-123', async () => {
      primeClaim('TIP', 123);

      await claim();

      const selectSql = String(transactionQuery.mock.calls[0][0]);
      expect(selectSql).toMatch(/platform_code/);

      const inFlightSql = String(transactionQuery.mock.calls[1][0]);
      expect(inFlightSql).toMatch(/platform_code = \?/);
      expect(inFlightSql).toMatch(/external_reference = \?/);
      expect(inFlightSql).toMatch(/result_year = \?/);
      expect(transactionQuery.mock.calls[1][1]).toEqual([
        'TIP',
        'TIP-123',
        2026,
        PrmsSyncOutcome.IN_FLIGHT,
      ]);

      const maxSql = String(transactionQuery.mock.calls[2][0]);
      expect(maxSql).toMatch(/platform_code = \?/);
      expect(maxSql).toMatch(/external_reference = \?/);
      expect(maxSql).toMatch(/result_year = \?/);
      expect(transactionQuery.mock.calls[2][1]).toEqual([
        'TIP',
        'TIP-123',
        2026,
      ]);

      const insertSql = String(transactionQuery.mock.calls[3][0]);
      const insertParams = transactionQuery.mock.calls[3][1] as unknown[];
      expect(insertSql).toMatch(/platform_code/);
      expect(insertParams).toEqual([
        'TIP',
        'TIP-123',
        2026,
        1,
        'TEST',
        PrmsSyncOutcome.IN_FLIGHT,
        7,
      ]);
      expect((insertSql.match(/\?/g) ?? []).length).toBe(insertParams.length);
    });

    it('a STAR claim writes platform_code STAR and the bare code 123', async () => {
      primeClaim('STAR', 123);

      await claim();

      expect(transactionQuery.mock.calls[3][1]).toEqual([
        'STAR',
        '123',
        2026,
        1,
        'TEST',
        PrmsSyncOutcome.IN_FLIGHT,
        7,
      ]);
    });

    it('a NULL platform_code is claimed as STAR with the bare code', async () => {
      primeClaim(null, 123);

      await claim();

      expect(transactionQuery.mock.calls[1][1]).toEqual([
        'STAR',
        '123',
        2026,
        PrmsSyncOutcome.IN_FLIGHT,
      ]);
      expect(transactionQuery.mock.calls[3][1]).toEqual([
        'STAR',
        '123',
        2026,
        1,
        'TEST',
        PrmsSyncOutcome.IN_FLIGHT,
        7,
      ]);
    });

    it('insertRefusedByStar keys MAX+1 on platform and writes prmsRef', async () => {
      transactionQuery
        .mockResolvedValueOnce([
          {
            result_id: 42,
            result_official_code: 123,
            report_year_id: 2026,
            platform_code: 'TIP',
          },
        ])
        .mockResolvedValueOnce([{ max_attempt: 4 }])
        .mockResolvedValueOnce({ insertId: 11 });

      const inserted = await repository.insertRefusedByStar({
        resultId: 42,
        environment: 'TEST',
        userId: 7,
        failureReason: 'Pool Funding Alignment is not green-checked',
      });

      expect(inserted).toEqual({ attemptId: 11, attemptNumber: 5 });
      const selectSql = String(transactionQuery.mock.calls[0][0]);
      expect(selectSql).toMatch(/platform_code/);
      const maxSql = String(transactionQuery.mock.calls[1][0]);
      expect(maxSql).toMatch(/platform_code = \?/);
      expect(transactionQuery.mock.calls[1][1]).toEqual([
        'TIP',
        'TIP-123',
        2026,
      ]);
      const insertParams = transactionQuery.mock.calls[2][1] as unknown[];
      expect(insertParams[0]).toBe('TIP');
      expect(insertParams[1]).toBe('TIP-123');
      expect(
        (String(transactionQuery.mock.calls[2][0]).match(/\?/g) ?? []).length,
      ).toBe(insertParams.length);
    });
  });

  describe('live-row PRMS code copy (R-PPI-005)', () => {
    it('joins the live row on the pushed platform and has no year predicate', async () => {
      transactionQuery
        .mockResolvedValueOnce({ affectedRows: 1 })
        .mockResolvedValueOnce({ affectedRows: 1 });
      query.mockResolvedValue({ affectedRows: 1 });

      await acceptedSettle();

      const liveSql = String(query.mock.calls[1][0]);
      expect(liveSql).toMatch(
        /live\.platform_code\s*=\s*COALESCE\(pushed\.platform_code,\s*'STAR'\)/,
      );
      expect(liveSql).not.toMatch(
        /live\.platform_code\s*=\s*pushed\.platform_code/,
      );
      expect(liveSql).not.toMatch(/report_year_id/);
    });
  });
});
