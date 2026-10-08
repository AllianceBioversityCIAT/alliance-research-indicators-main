import 'dotenv/config';
import { DataSource, QueryRunner } from 'typeorm';
import { derivePfmRow } from '../src/domain/entities/pooled-funding-monitor/derivation/pfm-derivation';
import { PfmScopeEnum } from '../src/domain/entities/pooled-funding-monitor/enum/pfm-scope.enum';
import {
  PfmMonitoredRow,
  PooledFundingMonitorRepository,
  PfmRepositoryScope,
} from '../src/domain/entities/pooled-funding-monitor/repositories/pooled-funding-monitor.repository';
import { CreatePiDelegates1787600000000 } from '../src/db/migrations/1787600000000-createPiDelegates';
import { CreateResultPrmsSyncLogTable1789479131116 } from '../src/db/migrations/1789479131116-createResultPrmsSyncLogTable';
import { ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000 } from '../src/db/migrations/1790023167000-replaceResultIdWithOfficialCodeInPrmsSyncLog';
import { CreatePrmsWebhookDeliveryTable1790086170692 } from '../src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor - T-02
//
// PooledFundingMonitorRepository against a REAL MySQL server, on seeded rows.
//
// WHY: SQL precedence and join semantics are invisible to a mocked query builder
// (KZ-017). Every assertion below is on rows RETURNED by the shipped repository,
// never on generated SQL text.
//
// SAFETY (this suite writes rows, so it is built to leave nothing behind):
//   1. Refuses to run unless the target schema's `results` table is EMPTY - the
//      committed baseline is schema-only, so any data means "not the disposable
//      scratch schema" (e.g. the developer's local `alliancereportingdb`).
//   2. Pins ONE connection; every seed row is written inside ONE transaction that
//      is ROLLED BACK in afterAll, and afterAll then proves `results` is empty again.
//   3. Tables the schema lacks (pi_delegates, result_prms_sync_log,
//      result_prms_sync_history - migrations not applied on the scratch schema)
//      are created as TEMPORARY tables by replaying the REAL migration classes
//      through a shim that only adds TEMPORARY and skips FK statements (MySQL
//      cannot put an FK on a temporary table). They vanish with the connection.
//      When the real table already exists it is used as-is. The suite logs which.
//
// Connection: PFM_MYSQL_* (no default password, same precedent as
// pi-delegates-auth-sql.integration-spec.ts):
//   PFM_MYSQL_PASSWORD=<pass> npx jest --config test/jest-integration.json test/pooled-funding-monitor

const config = () => {
  const password = process.env.PFM_MYSQL_PASSWORD;
  if (!password) {
    throw new Error(
      'PFM_MYSQL_PASSWORD is not set. This suite never falls back to ARI_MYSQL_* ' +
        '(shared DEV). Point it at the disposable scratch schema, e.g. ' +
        '`PFM_MYSQL_PASSWORD=<pass> npm run test:integration`.',
    );
  }
  return {
    host: process.env.PFM_MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.PFM_MYSQL_PORT || '3307', 10),
    username: process.env.PFM_MYSQL_USER || 'root',
    password,
    database: process.env.PFM_MYSQL_DATABASE || 'ari_scratch_test',
  };
};

const YEAR = 2026;
const NOW = new Date('2026-10-08T12:00:00Z');

const PI_A = 101; // leads P-A through carnet C-A
const PI_B = 102; // leads P-B through carnet C-B
const DELEGATE_A = 103; // active delegate of P-A
const REVOKED_DELEGATE_A = 104; // revoked delegate of P-A
const STRANGER = 105; // no staff row, no delegation

const MINE = (userId: number): PfmRepositoryScope => ({
  scope: PfmScopeEnum.MINE,
  userId,
});
const ALL: PfmRepositoryScope = { scope: PfmScopeEnum.ALL };

describe('PooledFundingMonitorRepository (real MySQL, seeded rows)', () => {
  let ds: DataSource;
  let repo: PooledFundingMonitorRepository;
  const tableSource: Record<string, 'persistent' | 'temporary'> = {};

  const q = <T = Record<string, unknown>[]>(sql: string, params?: unknown[]) =>
    ds.query(sql, params) as Promise<T>;

  const insert = async (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row);
    await q(
      `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c]),
    );
  };

  /** Replays a REAL migration's up() as TEMPORARY tables (see header, point 3). */
  const replayAsTemporary = async (
    tableName: string,
    migrations: { up(qr: QueryRunner): Promise<void> }[],
  ) => {
    const [{ n }] = await q<{ n: string | number }[]>(
      `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName],
    );
    if (Number(n) > 0) {
      tableSource[tableName] = 'persistent';
      return;
    }
    const shim = {
      query: async (sql: string) => {
        if (/ADD CONSTRAINT|DROP FOREIGN KEY/i.test(sql)) return undefined;
        return q(sql.replace(/^\s*CREATE TABLE/i, 'CREATE TEMPORARY TABLE'));
      },
    } as unknown as QueryRunner;
    for (const migration of migrations) await migration.up(shim);
    tableSource[tableName] = 'temporary';
  };

  beforeAll(async () => {
    const c = config();
    ds = new DataSource({
      type: 'mysql',
      ...c,
      entities: [],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      bigNumberStrings: false,
      // Same driver options as orm.config.ts (namedPlaceholders matters: it
      // rewrites every query, so a stray ':word' in the SQL would surface here).
      extra: {
        connectionLimit: 1,
        namedPlaceholders: true,
        charset: 'utf8mb4_unicode_520_ci',
      },
    });
    await ds.initialize();
    repo = new PooledFundingMonitorRepository(ds);

    // Guard 1: only a schema-only (empty) database is accepted.
    const [{ n }] = await q<{ n: string | number }[]>(
      `SELECT COUNT(*) AS n FROM results`,
    );
    if (Number(n) !== 0) {
      await ds.destroy();
      throw new Error(
        `Refusing to run: ${c.database}.results holds ${n} rows - not a disposable, schema-only database.`,
      );
    }

    await q(`SET time_zone = '+00:00'`);
    await q(`SET FOREIGN_KEY_CHECKS = 0`);

    // DDL first: ALTER on a temporary table implicitly commits, so it must
    // happen before the transaction opens.
    await replayAsTemporary('pi_delegates', [
      new CreatePiDelegates1787600000000(),
    ]);
    await replayAsTemporary('result_prms_sync_log', [
      new CreateResultPrmsSyncLogTable1789479131116(),
      new ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000(),
    ]);
    await replayAsTemporary('result_prms_sync_history', [
      new CreatePrmsWebhookDeliveryTable1790086170692(),
    ]);
    console.info('PFM integration table sources:', tableSource);

    await q(`START TRANSACTION`);
    await seed();
  });

  afterAll(async () => {
    if (!ds?.isInitialized) return;
    try {
      await q(`ROLLBACK`);
      const [{ n }] = await q<{ n: string | number }[]>(
        `SELECT COUNT(*) AS n FROM results`,
      );
      // Proof that the suite left nothing behind.
      expect(Number(n)).toBe(0);
    } finally {
      await ds.destroy();
    }
  });

  // ---------------------------------------------------------------- seed ----
  async function seed() {
    for (const [id, name] of [
      [1, 'Knowledge Product'],
      [2, 'Innovation Development'],
      [3, 'Innovation Use'],
      [4, 'Capacity Sharing for Development'],
      [5, 'OICR'],
      [6, 'Policy Change'],
    ] as const) {
      await insert('indicators', {
        indicator_id: id,
        name,
        indicator_type_id: 1,
      });
    }
    for (const [id, name] of [
      [2, 'Submitted'],
      [3, 'Under review'],
      [4, 'Draft'],
      [6, 'Approved'],
      [7, 'Rejected'],
    ] as const) {
      await insert('result_status', { result_status_id: id, name });
    }

    // Contracts: P-A (flag), P-B (active bilateral mapping), P-X (neither), P-Z (flag but inactive).
    const contract = (id: string, extra: Record<string, unknown>) =>
      insert('agresso_contracts', {
        agreement_id: id,
        short_title: `${id} title`,
        description: `${id} description`,
        donor: `${id} donor`,
        project_lead_description: `Lead of ${id}`,
        ...extra,
      });
    await contract('P-A', {
      projectLeadId: 'C-A',
      is_pool_funding_contributor: 1,
    });
    await contract('P-B', {
      projectLeadId: 'C-B',
      is_pool_funding_contributor: 0,
    });
    await contract('P-X', {
      projectLeadId: 'C-A',
      is_pool_funding_contributor: 0,
    });
    await contract('P-Z', {
      projectLeadId: 'C-A',
      is_pool_funding_contributor: 1,
      is_active: 0,
    });
    await insert('bilateral_project_mapping', {
      agresso_agreement_id: 'P-B',
      clarisa_project_id: 1,
      is_active: 1,
    });
    // P-X has a mapping too, but INACTIVE: it must not make it a contributor.
    await insert('bilateral_project_mapping', {
      agresso_agreement_id: 'P-X',
      clarisa_project_id: 2,
      is_active: 0,
    });

    // People: PI A / PI B resolve a carnet through the e-mail join.
    for (const [id, email] of [
      [PI_A, 'a@x.org'],
      [PI_B, 'b@x.org'],
      [DELEGATE_A, 'd@x.org'],
      [REVOKED_DELEGATE_A, 'r@x.org'],
      [STRANGER, 's@x.org'],
    ] as const) {
      await insert('sec_users', { sec_user_id: id, email });
    }
    await insert('alliance_user_staff', {
      carnet: 'C-A',
      first_name: 'A',
      last_name: 'A',
      email: ' A@X.org ', // join is case/space-insensitive, like My Projects
    });
    await insert('alliance_user_staff', {
      carnet: 'C-B',
      first_name: 'B',
      last_name: 'B',
      email: 'b@x.org',
    });
    await insert('pi_delegates', {
      project_id: 'P-A',
      delegate_user_id: DELEGATE_A,
      is_active: 1,
    });
    await insert('pi_delegates', {
      project_id: 'P-A',
      delegate_user_id: REVOKED_DELEGATE_A,
      is_active: 0,
    });

    for (const [code, name, category, color] of [
      ['SP01', 'Alpha program', 'Science programs', '#111111'],
      ['SP02', 'Beta program', 'Accelerators', '#222222'],
      ['SP03', 'Gamma program', 'Scaling programs', '#333333'],
      ['SP04', 'Delta program', 'Something else', '#444444'],
      ['SP05', 'Epsilon program', null, null],
      ['SP08', 'Out of scope program', 'Science programs', null],
      ['SP09', 'Only on excluded rows', 'Science programs', null],
    ] as const) {
      await insert('clarisa_science_programs', {
        official_code: code,
        name,
        category,
        color,
      });
    }

    // ---- results -------------------------------------------------------
    const result = async (
      id: number,
      code: number,
      o: Partial<{
        indicator: number;
        status: number;
        year: number;
        snapshot: number;
        platform: string;
        active: number;
        synced: number;
        contract: string | null;
        primary: number;
        contractActive: number;
      }> = {},
    ) => {
      await insert('results', {
        result_id: id,
        result_official_code: code,
        title: `Result ${code}`,
        indicator_id: o.indicator ?? 1,
        result_status_id: o.status ?? 4,
        report_year_id: o.year ?? YEAR,
        is_snapshot: o.snapshot ?? 0,
        platform_code: o.platform ?? 'STAR',
        is_active: o.active ?? 1,
        is_synced_to_prms: o.synced ?? 0,
        updated_at: '2026-10-01 10:20:30',
      });
      if (o.contract !== null) {
        await insert('result_contracts', {
          result_id: id,
          contract_role_id: 1,
          contract_id: o.contract ?? 'P-A',
          is_primary: o.primary ?? 1,
          is_active: o.contractActive ?? 1,
        });
      }
    };
    const alignment = async (
      id: number,
      resultId: number,
      hasContribution: number,
      sps: [string, string | null][] = [],
      tocFor: string[] = [],
    ) => {
      await insert('result_pool_funding_alignment', {
        id,
        result_id: resultId,
        has_contribution: hasContribution,
      });
      for (const [spCode, role] of sps) {
        await insert('result_pool_funding_alignment_sp', {
          alignment_id: id,
          sp_code: spCode,
          sp_role: role,
        });
      }
      for (const spCode of tocFor) {
        await insert('result_pool_funding_toc_alignment', {
          result_id: resultId,
          sp_code: spCode,
          aligns_with_toc: 1,
        });
      }
    };

    // 1001: approved KP of P-A, COMPLETE mapping (primary SP01 + contributing SP02),
    // synced, with a snapshot of 2025 (the snapshot+current pair).
    await result(1, 1001, { status: 6, synced: 1 });
    await result(2, 1001, { status: 6, year: 2025, snapshot: 1, synced: 1 });
    await alignment(
      1,
      1,
      1,
      [
        ['SP01', 'PRIMARY'],
        ['SP02', 'CONTRIBUTING'],
      ],
      ['SP01'],
    );
    await alignment(2, 2, 1, [['SP01', 'PRIMARY']], ['SP01']); // snapshot's own alignment
    // An older, OVERWRITTEN version of 1001/2026 (inactive, other result_id): history is
    // keyed per version id, so its approval must still be found through code + year.
    await result(3, 1001, { status: 6, active: 0 });
    await insert('submission_history', {
      result_id: 1,
      from_status_id: 2,
      to_status_id: 6,
      custom_date: '2026-03-05 23:30:00',
    });
    await insert('submission_history', {
      result_id: 3,
      from_status_id: 2,
      to_status_id: 6,
      custom_date: null,
      created_at: '2026-03-06 00:15:00',
    }); // MAX, crosses UTC midnight
    await insert('submission_history', {
      result_id: 3,
      from_status_id: 2,
      to_status_id: 6,
      custom_date: '2026-04-01 00:00:00',
      is_active: 0,
    }); // inactive -> ignored
    await insert('submission_history', {
      result_id: 1,
      from_status_id: 6,
      to_status_id: 3,
      custom_date: '2026-05-01 00:00:00',
    }); // other status -> ignored
    await insert('submission_history', {
      result_id: 2,
      from_status_id: 2,
      to_status_id: 6,
      custom_date: '2025-02-01 00:00:00',
    }); // other YEAR -> ignored

    // 1002: submitted innovation development, no alignment at all.
    await result(4, 1002, { indicator: 2, status: 2 });
    // 1003: approved innovation use, NULL-role single SP (legacy), NO toc -> INCOMPLETE; synced without history.
    await result(5, 1003, { indicator: 3, status: 6, synced: 1 });
    await alignment(3, 5, 1, [['SP03', null]]);
    // 1004: P-B capacity sharing, declared NO contribution (out of scope); stray SP row must not surface in options.
    await result(6, 1004, { indicator: 4, status: 4, contract: 'P-B' });
    await alignment(4, 6, 0, [['SP08', 'PRIMARY']]);
    // 1005: P-B policy change, synced, REJECTED in PRMS; two NULL-role SPs (no primary guess).
    await result(7, 1005, {
      indicator: 6,
      status: 6,
      synced: 1,
      contract: 'P-B',
    });
    await alignment(5, 7, 1, [
      ['SP04', null],
      ['SP05', null],
    ]);
    // 1014: P-B, under review, no alignment.
    await result(8, 1014, { status: 3, contract: 'P-B' });

    // ---- rows that MUST NOT be monitored --------------------------------
    await result(20, 1006, { indicator: 5, status: 6 }); // OICR
    await result(21, 1007, { platform: 'TIP' }); // TIP
    await result(22, 1008, { platform: 'AICCRA' }); // AICCRA
    await result(23, 1009, { contract: 'P-X' }); // primary is P-X (not contributing) ...
    await insert('result_contracts', {
      result_id: 23,
      contract_role_id: 1,
      contract_id: 'P-A',
      is_primary: 0,
      is_active: 1,
    }); // ... P-A only NON-primary
    await result(24, 1010, { contract: 'P-X' }); // only a non-contributing project
    await result(25, 1011, { active: 0 }); // inactive result
    await result(26, 1013, { contractActive: 0 }); // primary link deactivated
    await result(27, 1015, { contract: 'P-Z' }); // contributing flag but INACTIVE contract
    await result(28, 1016, { contract: null }); // no contract at all
    await alignment(6, 20, 1, [['SP09', 'PRIMARY']]);
    await alignment(7, 21, 1, [['SP09', 'PRIMARY']]);

    // 1012: a code duplicated among CURRENT rows (2 STAR codes locally) -> once.
    await result(30, 1012);
    await result(31, 1012);

    // ---- PRMS history (outbound STAR push + inbound PRMS decisions) ------
    const history = (o: Record<string, unknown>) =>
      insert('result_prms_sync_history', {
        environment: 'TEST',
        correlation_outcome: 'CORRELATED',
        processing_state: 'PROCESSED',
        event_source: 'PRMS',
        result_year: YEAR,
        is_active: 1,
        ...o,
      });
    // 1001: pending (STAR push) then APPROVED -> latest is APPROVED.
    await history({
      result_official_code: '1001',
      event_source: 'STAR',
      status: 'PENDING_REVIEW',
      occurred_at: '2026-04-01 10:00:00',
    });
    await history({
      result_official_code: '1001',
      status: 'APPROVED',
      decision: 'APPROVE',
      occurred_at: '2026-04-10 10:00:00',
      decided_at: '2026-04-09 09:00:00',
    });
    // 1001 / 2025 (snapshot year): a LATER REJECTED must not leak into 2026.
    await history({
      result_official_code: '1001',
      result_year: 2025,
      status: 'REJECTED',
      decision: 'REJECT',
      occurred_at: '2026-09-30 10:00:00',
    });
    // 1005: pending, then REJECTED with justification; later rows that must be IGNORED:
    // a duplicate delivery, a non-correlated delivery, an inactive row, a status-less row.
    await history({
      result_official_code: '1005',
      event_source: 'STAR',
      status: 'PENDING_REVIEW',
      occurred_at: '2026-05-01 10:00:00',
    });
    await history({
      result_official_code: '1005',
      status: 'REJECTED',
      decision: 'REJECT',
      justification: 'Budget shares missing',
      occurred_at: '2026-05-20 10:00:00',
      decided_at: '2026-05-19 10:00:00',
    });
    await history({
      result_official_code: '1005',
      status: 'APPROVED',
      decision: 'APPROVE',
      occurred_at: '2026-06-01 10:00:00',
      duplicate_of_id: 999,
    });
    await history({
      result_official_code: '1005',
      status: 'APPROVED',
      decision: 'APPROVE',
      correlation_outcome: 'UNKNOWN_REFERENCE',
      occurred_at: '2026-06-02 10:00:00',
    });
    await history({
      result_official_code: '1005',
      status: 'APPROVED',
      decision: 'APPROVE',
      is_active: 0,
      occurred_at: '2026-06-03 10:00:00',
    });
    await history({
      result_official_code: '1005',
      status: null,
      occurred_at: '2026-06-04 10:00:00',
    });
    // 1003: synced, deliberately NO history row.

    // ---- accepted syncs (monthly series), UTC ----------------------------
    const log = (
      code: string,
      year: number,
      outcome: string,
      createdAt: string,
    ) =>
      insert('result_prms_sync_log', {
        external_reference: code,
        result_year: year,
        attempt_number: 1,
        environment: 'TEST',
        outcome,
        created_at: createdAt,
      });
    await log('1001', YEAR, 'ACCEPTED', '2026-05-31 23:59:00'); // May in UTC (June in UTC+13)
    await log('1001', YEAR, 'ACCEPTED', '2026-05-10 08:00:00'); // same result, same month -> counted once
    await log('1003', YEAR, 'ACCEPTED', '2026-05-02 08:00:00');
    await log('1001', YEAR, 'ACCEPTED', '2026-09-15 08:00:00');
    await log('1001', YEAR, 'ACCEPTED', '2026-03-01 08:00:00'); // earlier this year: kept for the YTD footer
    await log('1001', YEAR, 'ACCEPTED', '2025-12-31 23:00:00'); // last year: out
    await log('1001', 2025, 'ACCEPTED', '2026-07-01 08:00:00'); // other year of the same code: not this result
    await log('1005', YEAR, 'ACCEPTED', '2026-08-02 08:00:00');
    await log('1005', YEAR, 'REFUSED_BY_STAR', '2026-09-16 08:00:00'); // not accepted
    await log('1002', YEAR, 'IN_FLIGHT', '2026-09-17 08:00:00'); // not accepted
    await log('1006', YEAR, 'ACCEPTED', '2026-09-18 08:00:00'); // OICR
    await log('1007', YEAR, 'ACCEPTED', '2026-09-19 08:00:00'); // TIP
  }

  // ------------------------------------------------------------- helpers ----
  const codes = (rows: PfmMonitoredRow[]) =>
    rows.map((r) => r.result_official_code).sort((a, b) => a - b);
  const byCode = (rows: PfmMonitoredRow[], code: number) => {
    const found = rows.filter((r) => r.result_official_code === code);
    expect(found).toHaveLength(1);
    return found[0];
  };

  /**
   * Independent, hand-written count. It shares NO text with the repository: no
   * join chain, no effective-contributor predicate, no function. The contributing
   * projects are named by hand from the seed (P-A flag, P-B mapping), and a result
   * is counted once per official code with IN / EXISTS instead of JOINs.
   */
  const independentCount = async (projects: string[]) => {
    const [row] = await q<{ n: string | number }[]>(
      `SELECT COUNT(DISTINCT r.result_official_code) AS n
       FROM results r
       WHERE r.platform_code = 'STAR'
         AND r.is_snapshot = 0
         AND r.is_active = 1
         AND r.indicator_id <> 5
         AND r.result_id IN (
           SELECT rc.result_id FROM result_contracts rc
           WHERE rc.is_primary = 1 AND rc.is_active = 1
             AND rc.contract_id IN (${projects.map(() => '?').join(', ')})
         )`,
      projects,
    );
    return Number(row.n);
  };

  // ------------------------------------------------------- base query -------
  describe('findMonitoredResults', () => {
    it('portfolio: returns exactly the monitored set and equals the independent count', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      const expected = await independentCount(['P-A', 'P-B']);
      console.info(
        `T-02 portfolio count: repository=${rows.length} independent=${expected}`,
      );
      expect(expected).toBe(7);
      expect(rows).toHaveLength(expected);
      expect(codes(rows)).toEqual([1001, 1002, 1003, 1004, 1005, 1012, 1014]);
    });

    it('excludes OICR, TIP/AICCRA, non-primary, non-contributing, inactive and contract-less rows', async () => {
      const present = codes(await repo.findMonitoredResults(ALL));
      for (const excluded of [
        1006, 1007, 1008, 1009, 1010, 1011, 1013, 1015, 1016,
      ]) {
        expect(present).not.toContain(excluded);
      }
    });

    it('counts a result with a snapshot once (current version) and exposes the snapshot year', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      const matching = rows.filter((r) => r.result_official_code === 1001);
      expect(matching).toHaveLength(1);
      expect(matching[0].result_id).toBe(1);
      expect(matching[0].report_year).toBe(YEAR);
      expect(matching[0].snapshot_years).toEqual([2025]);
    });

    it('counts a code duplicated among current rows once, keeping the newest', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      const duplicated = rows.filter((r) => r.result_official_code === 1012);
      expect(duplicated).toHaveLength(1);
      expect(duplicated[0].result_id).toBe(31);
    });

    it("PI scope returns only the projects the user leads, and never another PI's rows", async () => {
      const a = await repo.findMonitoredResults(MINE(PI_A));
      const b = await repo.findMonitoredResults(MINE(PI_B));
      expect(codes(a)).toEqual([1001, 1002, 1003, 1012]);
      expect(codes(b)).toEqual([1004, 1005, 1014]);
      expect(new Set(a.map((r) => r.project_code))).toEqual(new Set(['P-A']));
      expect(new Set(b.map((r) => r.project_code))).toEqual(new Set(['P-B']));
      const independentA = await independentCount(['P-A']);
      const independentB = await independentCount(['P-B']);
      console.info(
        `T-02 PI counts: A repository=${a.length} independent=${independentA}; B repository=${b.length} independent=${independentB}`,
      );
      expect(a).toHaveLength(independentA);
      expect(b).toHaveLength(independentB);
      // P-X is also led by C-A but is not a contributing project: still absent.
      expect(a.map((r) => r.project_code)).not.toContain('P-X');
    });

    it("an active delegate sees exactly the PI's results; a revoked delegate and a stranger see none", async () => {
      expect(codes(await repo.findMonitoredResults(MINE(DELEGATE_A)))).toEqual([
        1001, 1002, 1003, 1012,
      ]);
      expect(await repo.findMonitoredResults(MINE(REVOKED_DELEGATE_A))).toEqual(
        [],
      );
      expect(await repo.findMonitoredResults(MINE(STRANGER))).toEqual([]);
    });

    it("the PI scope is the portfolio filtered to the viewer's projects (no OR leaks across the other predicates)", async () => {
      const all = await repo.findMonitoredResults(ALL);
      const mine = await repo.findMonitoredResults(MINE(PI_A));
      expect(codes(mine)).toEqual(
        codes(all.filter((r) => r.project_code === 'P-A')),
      );
    });

    it('projects project, status, type, lead and donor', async () => {
      const row = byCode(await repo.findMonitoredResults(ALL), 1001);
      expect(row).toMatchObject({
        project_code: 'P-A',
        project_name: 'P-A title',
        donor: 'P-A donor',
        lead_pi: 'Lead of P-A',
        indicator_id: 1,
        indicator_name: 'Knowledge Product',
        result_status_id: 6,
        result_status_name: 'Approved',
        platform_code: 'STAR',
        title: 'Result 1001',
        is_synced_to_prms: true,
      });
    });

    it('mapping: Complete via the SQL function, Incomplete, Out of scope and Not started are distinguishable', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      const r1001 = byCode(rows, 1001);
      const r1003 = byCode(rows, 1003);
      const r1004 = byCode(rows, 1004);
      const r1002 = byCode(rows, 1002);
      expect([
        r1001.has_alignment,
        r1001.has_contribution,
        r1001.mapping_complete,
      ]).toEqual([true, true, true]);
      expect([
        r1003.has_alignment,
        r1003.has_contribution,
        r1003.mapping_complete,
      ]).toEqual([true, true, false]);
      expect([r1004.has_alignment, r1004.has_contribution]).toEqual([
        true,
        false,
      ]);
      expect([r1002.has_alignment, r1002.has_contribution]).toEqual([
        false,
        null,
      ]);
    });

    it('SPs: PRIMARY wins, a single NULL-role SP is promoted, several NULL-role SPs give no primary', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      const r1001 = byCode(rows, 1001);
      expect(r1001.primary_sp).toEqual({
        code: 'SP01',
        name: 'Alpha program',
        color: '#111111',
        category: 'Science programs',
      });
      expect(r1001.contributing_sp_names).toEqual(['Beta program']);

      const r1003 = byCode(rows, 1003);
      expect(r1003.primary_sp?.code).toBe('SP03');
      expect(r1003.contributing_sps).toEqual([]);

      const r1005 = byCode(rows, 1005);
      expect(r1005.primary_sp).toBeNull();
      expect(r1005.contributing_sps.map((s) => s.code)).toEqual([
        'SP04',
        'SP05',
      ]);
      expect(r1005.contributing_sps[1].category).toBeNull();

      expect(byCode(rows, 1002).primary_sp).toBeNull();
    });

    it('approval date: latest entry into status 6 across versions of the same code+year, as a UTC instant', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      // MAX over the current version (03-05 23:30) and the overwritten version
      // (created_at 03-06 00:15); inactive / other-status / other-year rows ignored.
      expect(byCode(rows, 1001).approved_at.toISOString()).toBe(
        '2026-03-06T00:15:00.000Z',
      );
      expect(byCode(rows, 1002).approved_at).toBeNull();
    });

    it('dates are the same instants whatever the MySQL session time zone is', async () => {
      const before = await repo.findMonitoredResults(ALL);
      await q(`SET time_zone = '+13:00'`);
      try {
        const after = await repo.findMonitoredResults(ALL);
        const pick = (rs: PfmMonitoredRow[]) =>
          byCode(rs, 1001).approved_at.toISOString() +
          '|' +
          byCode(rs, 1001).updated_at.toISOString();
        expect(pick(after)).toBe(pick(before));
        expect(byCode(after, 1001).updated_at.toISOString()).toBe(
          '2026-10-01T10:20:30.000Z',
        );
      } finally {
        await q(`SET time_zone = '+00:00'`);
      }
    });

    it('T-01 formatters print the same calendar day as the stored UTC instant', async () => {
      const row = byCode(await repo.findMonitoredResults(ALL), 1001);
      const derived = derivePfmRow(row);
      expect(derived.piLine).toBe('Approved 06 Mar 2026');
      expect(derived.updatedLabel).toBe('01 Oct, 10:20');
    });

    it('PRMS: latest correlated, non-duplicate, active, status-bearing row; keyed by code AND year', async () => {
      const rows = await repo.findMonitoredResults(ALL);
      // 1001/2026: APPROVED (the later REJECTED belongs to 2025).
      expect(byCode(rows, 1001).prms_history_status).toBe('APPROVED');
      const r1005 = byCode(rows, 1005);
      expect(r1005.prms_history_status).toBe('REJECTED');
      expect(r1005.prms_justification).toBe('Budget shares missing');
      // Synced without any history row -> null here, "Pending Review" in T-01.
      const r1003 = byCode(rows, 1003);
      expect(r1003.is_synced_to_prms).toBe(true);
      expect(r1003.prms_history_status).toBeNull();
      expect(derivePfmRow(r1003).prmsStatus).toBe('Pending Review');
      expect(derivePfmRow(r1005).prmsStatus).toBe('Rejected');
      // Never synced -> no history considered.
      expect(byCode(rows, 1002).prms_history_status).toBeNull();
    });
  });

  // ---------------------------------------------------- remaining reads -----
  describe('countContributingProjects', () => {
    it('counts active contributing projects only (flag OR active mapping)', async () => {
      // P-A (flag), P-B (mapping). Not P-X (inactive mapping), not P-Z (inactive contract).
      expect(await repo.countContributingProjects()).toBe(2);
    });
  });

  describe('findMonthlySyncs', () => {
    it('portfolio: distinct monitored results per UTC month, accepted only, from 1 Jan of the year', async () => {
      const out = await repo.findMonthlySyncs(ALL, NOW);
      expect(out).toEqual([
        { month: '2026-03', synced: 1 },
        { month: '2026-05', synced: 2 }, // 1001 (twice) + 1003; 05-31 23:59 UTC stays in May
        { month: '2026-08', synced: 1 },
        { month: '2026-09', synced: 1 },
      ]);
    });

    it("PI scope only counts that PI's results", async () => {
      expect(await repo.findMonthlySyncs(MINE(PI_B), NOW)).toEqual([
        { month: '2026-08', synced: 1 },
      ]);
      expect(await repo.findMonthlySyncs(MINE(PI_A), NOW)).toEqual([
        { month: '2026-03', synced: 1 },
        { month: '2026-05', synced: 2 },
        { month: '2026-09', synced: 1 },
      ]);
    });

    it('does not depend on the MySQL session time zone', async () => {
      await q(`SET time_zone = '+13:00'`);
      try {
        const out = await repo.findMonthlySyncs(ALL, NOW);
        expect(out.find((m) => m.month === '2026-05')?.synced).toBe(2);
        expect(out.find((m) => m.month === '2026-06')).toBeUndefined();
      } finally {
        await q(`SET time_zone = '+00:00'`);
      }
    });

    it('a window that opens before 1 January reaches back into the previous year', async () => {
      // now = 2026-02-15: the six-month window starts 2025-09-01, earlier than Jan 1,
      // so 2025-12 (one accepted sync, 2025-12-31 23:00 UTC) is returned.
      const out = await repo.findMonthlySyncs(
        ALL,
        new Date('2026-02-15T00:00:00Z'),
      );
      expect(out.map((m) => m.month)).toContain('2025-12');
    });
  });

  describe('findFilterOptions', () => {
    it('portfolio: projects, the five PRMS types (never OICR) and SPs grouped by category', async () => {
      const options = await repo.findFilterOptions(ALL);
      expect(options.projects).toEqual([
        { code: 'P-A', name: 'P-A title' },
        { code: 'P-B', name: 'P-B title' },
      ]);
      expect(options.types.map((t) => t.id)).toEqual([1, 2, 3, 4, 6]);
      expect(options.science_programs).toEqual([
        {
          category: 'Science programs',
          items: [{ code: 'SP01', name: 'Alpha program' }],
        },
        {
          category: 'Scaling programs',
          items: [{ code: 'SP03', name: 'Gamma program' }],
        },
        {
          category: 'Accelerators',
          items: [{ code: 'SP02', name: 'Beta program' }],
        },
        {
          category: 'Other projects',
          items: [
            { code: 'SP04', name: 'Delta program' },
            { code: 'SP05', name: 'Epsilon program' },
          ],
        },
      ]);
      const allSps = options.science_programs.flatMap((g) =>
        g.items.map((i) => i.code),
      );
      expect(allSps).not.toContain('SP08'); // belongs to an out-of-scope alignment
      expect(allSps).not.toContain('SP09'); // only on OICR / TIP rows
    });

    it("PI scope: options come from that PI's data only", async () => {
      const options = await repo.findFilterOptions(MINE(PI_A));
      expect(options.projects.map((p) => p.code)).toEqual(['P-A']);
      expect(options.types.map((t) => t.id)).toEqual([1, 2, 3]);
      expect(options.science_programs.map((g) => g.category)).toEqual([
        'Science programs',
        'Scaling programs',
        'Accelerators',
      ]);
    });
  });
});
