import { DataSource } from 'typeorm';
import { MergeTipHandleDuplicates1792764939185 } from '../src/db/migrations/1792764939185-mergeTipHandleDuplicates';
import { dataSource } from '../src/db/config/mysql/orm.test.config';
import { ReportingPlatformEnum } from '../src/domain/entities/results/enum/reporting-platform.enum';
import {
  SyncProcessEnum,
  SyncProcessStatusEnum,
} from '../src/domain/entities/sync-process-log/enum/sync-process.enum';
import { SyncProcessLogService } from '../src/domain/entities/sync-process-log/sync-process-log.service';
import { IndicatorsEnum } from '../src/domain/entities/indicators/enum/indicators.enum';
import {
  CounterResults,
  TipMappedResult,
  TipTocMappingDto,
} from '../src/domain/tools/tip-integration/dto/response-year-tip.dto';
import { TipHandleRepository } from '../src/domain/tools/tip-integration/repository/tip-handle.repository';
import { TipIntegrationService } from '../src/domain/tools/tip-integration/tip-integration.service';
import { ExternalMappersDto } from '../src/domain/shared/global-dto/external-mappers.dto';
import {
  ExtraData,
  SaveResultService,
} from '../src/domain/shared/services/save-all-sections.service';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { QueryService } from '../src/domain/shared/utils/query.service';
import { TocResult } from '../src/domain/tools/toc-integration/dto/toc-integration.types';

// @sdd-spec docs/specs/changes/tip-prms-phase-2/tip-versioning — T-07
//
// Behavioural proof on the TEST container (Dev dump + T-06 migration).
// result_official_code band 917300–917399. Sibling integration headers
// read before assigning (FP-45): 917000
// (result-prms-sync-log-outcome.integration-spec.ts), 917100 and 917110
// (result-prms-sync-claim-concurrency.integration-spec.ts), 917200–917230
// (prms-platform-identity.integration-spec.ts). bilateral-primary-contributing-sp
// builds a private schema and does not reserve a results band. Fixture bands
// 900_000–906_000 stay untouched.
//
// The per-handle routine is the production `syncHandle` / `saveAllSections`
// pair. Section writers that are not the columns under test are no-ops so
// the save reaches MySQL without OpenSearch, TOC, or RabbitMQ. The snapshot
// flag, the title, the year, the row delete, and the pool-funding ids are
// read back from MySQL.
//
// KZ-017 — what this gate cannot reach:
// `npm test` (rootDir "src") never collects this file. A green unit suite
// is not this proof. `clearAlignmentWhenPortfolioChanges` is private on
// ResultsService and is not entered by the no-op general-info writer, so
// P-14 is not reached here. The real TOC catalog and the real
// `importAlignmentFromTip` body are not reached: the routine's import call
// is the production `importPoolFunding`, and the rows it asks for are
// written to `result_pool_funding_alignment` so the year split is visible
// in MySQL. OpenSearch, RabbitMQ, sockets, and the PRMS webhook are not
// called from this file.

const BAND_LO = 917300;
const BAND_HI = 917399;

const HANDLE_RESOLVE = 'https://t07.invalid/resolve';
const HANDLE_NULL = 'https://t07.invalid/null-snapshot';
const HANDLE_VERSION = 'https://t07.invalid/version';
const HANDLE_OLDER = 'https://t07.invalid/older';
const HANDLE_FAIL = 'https://t07.invalid/fail-live';
const HANDLE_POOL = 'https://t07.invalid/pool';
const HANDLE_LEGACY = 'https://t07.invalid/legacy';
const HANDLE_IDEM = 'https://t07.invalid/idem';
const HANDLE_LINKED = 'https://t07.invalid/linked-older';
const HANDLE_LINKER = 'https://t07.invalid/linker';
const HANDLE_SELF = 'https://t07.invalid/self-link';
const HANDLE_SELF_LINKER = 'https://t07.invalid/self-linker';
const HANDLE_STAR = 'https://t07.invalid/star-nfr';

const FAIL_LIVE_TITLE = 'T07-FAIL-LIVE';

const RESOLVE_SQL = `
SELECT
  r.result_id,
  r.result_official_code,
  r.platform_code,
  r.is_snapshot,
  r.is_active,
  EXISTS (
    SELECT 1
    FROM link_results lr
    WHERE lr.other_result_id = r.result_id
      AND lr.is_active = 1
  ) AS is_linked
FROM results r
WHERE r.platform_code = 'TIP'
  AND r.public_link = ?
`;

const RESOLVE_SQL_NO_PLATFORM = `
SELECT
  r.result_id,
  r.platform_code,
  EXISTS (
    SELECT 1
    FROM link_results lr
    WHERE lr.other_result_id = r.result_id
      AND lr.is_active = 1
  ) AS is_linked
FROM results r
WHERE r.public_link = ?
`;

type Row = Record<string, unknown>;

type CreatedRow = { id: number; snapshot: boolean };

type Routine = {
  syncHandle(
    handle: string,
    byYear: Map<number, TipMappedResult>,
    batchExtra: ExtraData<ExternalMappersDto>,
    catalogMemo: Map<string, TocResult[] | null>,
  ): Promise<number>;
};

function assertScratchTarget(): void {
  const options = dataSource.options as {
    host?: string;
    port?: number;
    database?: string;
  };
  expect(options.host).toBe('127.0.0.1');
  expect(options.port).toBe(3307);
  expect(options.database).toBe('ari_scratch_test');
  expect(options.host).not.toBe('192.168.20.210');
}

describe('T-07 — TIP versioning on the TEST schema', () => {
  const created: CreatedRow[] = [];
  let routine: Routine;
  let repository: TipHandleRepository;
  let starId: number;
  let starStamp = '';

  beforeAll(async () => {
    assertScratchTarget();
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    await cleanupBand();
    for (const year of [2020, 2023, 2024, 2025, 2026]) {
      await ensureReportYear(year);
    }
    starId = await insertResult({
      code: 917360,
      year: 2026,
      platform: ReportingPlatformEnum.STAR,
      snapshot: 0,
      handle: HANDLE_STAR,
      title: 'STAR-UNTOUCHED',
    });
    starStamp = await stampOf(starId);
    repository = new TipHandleRepository(dataSource);
    routine = bindRoutine(dataSource, created);
  }, 120000);

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }
    try {
      await cleanupBand();
    } finally {
      await dataSource.destroy();
    }
  });

  it('connects via ARI_TEST_MYSQL_*, never the shared Dev host', () => {
    assertScratchTarget();
  });

  it('counts TIP rows whose is_snapshot is NULL on the dump', async () => {
    const rows = (await dataSource.query(
      `SELECT COUNT(*) AS c
         FROM results
        WHERE platform_code = 'TIP'
          AND is_snapshot IS NULL
          AND (result_official_code < ? OR result_official_code > ?)`,
      [BAND_LO, BAND_HI],
    )) as Row[];
    expect(Number(rows[0].c)).toBe(0);
  });

  it('converts a linked older pair, then the routine writes the highest year onto A', async () => {
    const roleId = await loadRoleId();
    const olderId = await insertResult({
      code: 917350,
      year: 2025,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_LINKED,
      title: 'A-2025',
    });
    const newerId = await insertResult({
      code: 917351,
      year: 2026,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_LINKED,
      title: 'B-2026',
    });
    const linkerId = await insertResult({
      code: 917352,
      year: 2024,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_LINKER,
      title: 'LINKER',
    });
    const incoming = await insertLink(linkerId, olderId, roleId);

    const selfSurvivorId = await insertResult({
      code: 917353,
      year: 2026,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_SELF,
      title: 'SELF-HIGH',
    });
    const selfDemotedId = await insertResult({
      code: 917354,
      year: 2025,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_SELF,
      title: 'SELF-LOW',
    });
    const selfLinkerId = await insertResult({
      code: 917355,
      year: 2024,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_SELF_LINKER,
      title: 'SELF-LINKER',
    });
    await insertLink(selfLinkerId, selfSurvivorId, roleId);
    const owned = await insertLink(selfSurvivorId, selfDemotedId, roleId);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await new MergeTipHandleDuplicates1792764939185().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    const older = await readRow(olderId);
    const newer = await readRow(newerId);
    expect(Number(older.result_id)).toBe(olderId);
    expect(Number(older.is_snapshot)).toBe(0);
    expect(Number(older.result_official_code)).toBe(917350);
    expect(Number(newer.result_id)).toBe(newerId);
    expect(Number(newer.is_snapshot)).toBe(1);
    expect(Number(newer.result_official_code)).toBe(917350);

    const incomingRow = await readLink(incoming);
    const ownedRow = await readLink(owned);
    expect(Number(incomingRow.is_active)).toBe(1);
    expect(Number(incomingRow.other_result_id)).toBe(olderId);
    const selfSurvivor = await readRow(selfSurvivorId);
    const selfDemoted = await readRow(selfDemotedId);
    expect(Number(selfSurvivor.is_snapshot)).toBe(0);
    expect(Number(selfDemoted.is_snapshot)).toBe(1);
    expect(Number(selfDemoted.result_official_code)).toBe(917353);
    expect(Number(ownedRow.is_active)).toBe(0);
    expect(Number(ownedRow.other_result_id)).toBe(selfDemotedId);

    await routine.syncHandle(
      HANDLE_LINKED,
      new Map([[2026, payload(HANDLE_LINKED, 2026, 'SYNC-2026', false, null)]]),
      batch(),
      new Map(),
    );

    const olderAfter = await readRow(olderId);
    const newerAfter = await readRow(newerId);
    expect(Number(olderAfter.result_id)).toBe(olderId);
    expect(Number(olderAfter.is_snapshot)).toBe(0);
    expect(Number(olderAfter.report_year_id)).toBe(2026);
    expect(olderAfter.title).toBe('SYNC-2026');
    expect(Number(newerAfter.result_id)).toBe(newerId);
    expect(Number(newerAfter.is_snapshot)).toBe(1);
    expect(newerAfter.title).toBe('SYNC-2026');
  }, 180000);

  it('never returns a STAR row that shares the code, and a linked row wins', async () => {
    const roleId = await loadRoleId();
    const inactiveId = await insertResult({
      code: 917301,
      year: 2024,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      active: 0,
      handle: HANDLE_RESOLVE,
      title: 'INACTIVE',
    });
    const linkedId = await insertResult({
      code: 917302,
      year: 2025,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_RESOLVE,
      title: 'LINKED',
    });
    const higherId = await insertResult({
      code: 917303,
      year: 2026,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_RESOLVE,
      title: 'HIGHER',
    });
    const starSameCode = await insertResult({
      code: 917302,
      year: 2025,
      platform: ReportingPlatformEnum.STAR,
      snapshot: 0,
      handle: HANDLE_RESOLVE,
      title: 'STAR-SAME-CODE',
    });
    const linkerId = await insertResult({
      code: 917305,
      year: 2024,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_LINKER,
      title: 'RESOLVE-LINKER',
    });
    await insertLink(linkerId, linkedId, roleId);

    const nullId = await insertResult({
      code: 917304,
      year: 2023,
      platform: ReportingPlatformEnum.TIP,
      snapshot: null,
      handle: HANDLE_NULL,
      title: 'NULL-SNAPSHOT',
    });

    const resolved = await repository.resolve(HANDLE_RESOLVE);
    const pickedIds = [
      resolved.live?.result_id,
      ...resolved.otherLive.map((row) => row.result_id),
      ...Object.values(resolved.versions).map((row) => row.result_id),
      ...resolved.otherVersions.map((row) => row.result_id),
    ];
    expect(resolved.live?.result_id).toBe(linkedId);
    expect(pickedIds).toEqual(
      expect.arrayContaining([inactiveId, linkedId, higherId]),
    );
    expect(pickedIds).not.toContain(starSameCode);

    const raw = (await dataSource.query(RESOLVE_SQL, [
      HANDLE_RESOLVE,
    ])) as Row[];
    const linkedRaw = raw.find((row) => Number(row.result_id) === linkedId);
    expect(linkedRaw).toBeDefined();
    const flag = linkedRaw?.is_linked;
    expect(flag === true || flag === 1 || flag === '1').toBe(true);

    const scratch = (await dataSource.query(RESOLVE_SQL_NO_PLATFORM, [
      HANDLE_RESOLVE,
    ])) as Row[];
    expect(scratch.map((row) => Number(row.result_id))).toContain(starSameCode);

    const nullResolved = await repository.resolve(HANDLE_NULL);
    expect(nullResolved.live?.result_id).toBe(nullId);
    expect(nullResolved.live?.is_snapshot).toBe(false);
    const stored = await readRow(nullId);
    expect(stored.is_snapshot).toBeNull();
  });

  it('refuses only a young IN_PROGRESS row of this process', async () => {
    await dataSource.query(
      `UPDATE sync_process_logs
          SET process_status = ?
        WHERE process_name = ?
          AND process_status = ?`,
      [
        SyncProcessStatusEnum.FAILED,
        SyncProcessEnum.TIP_INTEGRATION,
        SyncProcessStatusEnum.IN_PROGRESS,
      ],
    );

    const young = new Date(Date.now() - 60 * 60 * 1000);
    const old = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const youngId = await insertSyncLog(
      SyncProcessEnum.TIP_INTEGRATION,
      SyncProcessStatusEnum.IN_PROGRESS,
      young,
    );
    const oldId = await insertSyncLog(
      SyncProcessEnum.TIP_INTEGRATION,
      SyncProcessStatusEnum.IN_PROGRESS,
      old,
    );
    const completedId = await insertSyncLog(
      SyncProcessEnum.TIP_INTEGRATION,
      SyncProcessStatusEnum.COMPLETED,
      young,
    );
    const otherId = await insertSyncLog(
      SyncProcessEnum.PRMS_INTEGRATION,
      SyncProcessStatusEnum.IN_PROGRESS,
      young,
    );

    const service = new SyncProcessLogService(
      dataSource,
      {} as CurrentUserUtil,
    );
    const seen: { sql: string; params: unknown }[] = [];
    const probe = dataSource.createQueryRunner();
    const proto = Object.getPrototypeOf(probe) as {
      query: (...args: unknown[]) => Promise<unknown>;
    };
    const original = proto.query;
    proto.query = function patched(this: unknown, ...args: unknown[]) {
      seen.push({ sql: String(args[0]), params: args[1] });
      return original.apply(this, args);
    };

    try {
      await expect(
        service.isInProgressYoungerThan(SyncProcessEnum.TIP_INTEGRATION, 6),
      ).resolves.toBe(true);

      const guardSql = seen.filter((entry) =>
        entry.sql.includes('process_name'),
      );
      expect(guardSql.length).toBeGreaterThan(0);
      const sql = guardSql.map((entry) => entry.sql).join('\n');
      const params = JSON.stringify(guardSql.map((entry) => entry.params));
      expect(sql).toContain('process_status');
      expect(sql).toContain('created_at');
      expect(params).toContain(SyncProcessEnum.TIP_INTEGRATION);
      expect(params).toContain(SyncProcessStatusEnum.IN_PROGRESS);

      await dataSource.query('DELETE FROM sync_process_logs WHERE id = ?', [
        youngId,
      ]);
      await expect(
        service.isInProgressYoungerThan(SyncProcessEnum.TIP_INTEGRATION, 6),
      ).resolves.toBe(false);
    } finally {
      proto.query = original;
      await probe.release();
      await dataSource.query(
        `DELETE FROM sync_process_logs WHERE id IN (${[youngId, oldId, completedId, otherId].join(',')})`,
      );
    }
  });

  it('keeps an existing version row a snapshot with the same result_id', async () => {
    const versionId = await insertResult({
      code: 917310,
      year: 2025,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 1,
      handle: HANDLE_VERSION,
      title: 'OLD-TITLE',
    });

    await routine.syncHandle(
      HANDLE_VERSION,
      new Map([
        [2025, payload(HANDLE_VERSION, 2025, 'NEW-TITLE', false, null)],
      ]),
      batch(),
      new Map(),
    );

    const row = await readRow(versionId);
    expect(Number(row.result_id)).toBe(versionId);
    expect(Number(row.is_snapshot)).toBe(1);
    expect(row.title).toBe('NEW-TITLE');
    expect(Number(row.result_official_code)).toBe(917310);
  });

  it('leaves the live row, including updated_at, untouched for an older year', async () => {
    const liveId = await insertResult({
      code: 917320,
      year: 2026,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_OLDER,
      title: 'LIVE-2026',
    });
    const before = await readRow(liveId);

    await routine.syncHandle(
      HANDLE_OLDER,
      new Map([
        [2025, payload(HANDLE_OLDER, 2025, 'VERSION-2025', false, null)],
      ]),
      batch(),
      new Map(),
    );

    const after = await readRow(liveId);
    expect(Number(after.result_id)).toBe(liveId);
    expect(after.title).toBe(before.title);
    expect(Number(after.report_year_id)).toBe(2026);
    expect(after.updated_at_text).toBe(before.updated_at_text);
    expect(Number(after.is_snapshot)).toBe(0);

    const version = (await dataSource.query(
      `SELECT result_id, is_snapshot, title, report_year_id
         FROM results
        WHERE public_link = ?
          AND platform_code = 'TIP'
          AND is_snapshot = 1
          AND report_year_id = 2025`,
      [HANDLE_OLDER],
    )) as Row[];
    expect(version).toHaveLength(1);
    expect(version[0].title).toBe('VERSION-2025');
    expect(Number(version[0].result_id)).not.toBe(liveId);
  });

  it('deletes only the failed live create and leaves versions of the same code', async () => {
    const existingVersion = await insertResult({
      code: 917330,
      year: 2023,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 1,
      handle: HANDLE_FAIL,
      title: 'VERSION-2023',
    });
    created.length = 0;

    await routine.syncHandle(
      HANDLE_FAIL,
      new Map([
        [2024, payload(HANDLE_FAIL, 2024, FAIL_LIVE_TITLE, false, null)],
      ]),
      batch(),
      new Map(),
    );

    const liveCreates = created.filter((row) => !row.snapshot);
    expect(liveCreates).toHaveLength(1);
    const deletedId = liveCreates[0].id;
    const gone = (await dataSource.query(
      'SELECT result_id FROM results WHERE result_id = ?',
      [deletedId],
    )) as Row[];
    expect(gone).toHaveLength(0);

    const remaining = (await dataSource.query(
      `SELECT result_id, is_snapshot, result_official_code
         FROM results
        WHERE public_link = ? AND platform_code = 'TIP'
        ORDER BY result_id`,
      [HANDLE_FAIL],
    )) as Row[];
    expect(remaining.map((row) => Number(row.result_id))).toContain(
      existingVersion,
    );
    expect(remaining.every((row) => Number(row.is_snapshot) === 1)).toBe(true);
    expect(
      remaining.every((row) => Number(row.result_official_code) === 917330),
    ).toBe(true);
    expect(remaining.length).toBeGreaterThanOrEqual(2);
  });

  it('writes each year of pool funding onto that year only', async () => {
    const liveId = await insertResult({
      code: 917380,
      year: 2024,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_POOL,
      title: 'POOL-LIVE',
    });
    const sp2025: TipTocMappingDto = {
      science_program_id: 'SP01',
      toc_result_id: 917381,
    };
    const sp2026: TipTocMappingDto = {
      science_program_id: 'SP02',
      toc_result_id: 917382,
    };

    await routine.syncHandle(
      HANDLE_POOL,
      new Map([
        [2025, payload(HANDLE_POOL, 2025, 'POOL-2025', false, sp2025)],
        [2026, payload(HANDLE_POOL, 2026, 'POOL-2026', false, sp2026)],
      ]),
      batch(),
      new Map(),
    );

    const version2025 = await versionId(HANDLE_POOL, 2025);
    const version2026 = await versionId(HANDLE_POOL, 2026);
    expect(await programsOf(version2025)).toEqual(['SP01']);
    expect(await programsOf(version2026)).toEqual(['SP02']);
    expect(await programsOf(liveId)).toEqual(['SP02']);
    expect(Number((await readRow(liveId)).report_year_id)).toBe(2026);
  });

  it('gives a legacy live row its version without changing result_id', async () => {
    const liveId = await insertResult({
      code: 917340,
      year: 2024,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_LEGACY,
      title: 'LEGACY',
    });

    await routine.syncHandle(
      HANDLE_LEGACY,
      new Map([
        [2024, payload(HANDLE_LEGACY, 2024, 'LEGACY-NOW', false, null)],
      ]),
      batch(),
      new Map(),
    );

    const live = await readRow(liveId);
    expect(Number(live.result_id)).toBe(liveId);
    expect(Number(live.is_snapshot)).toBe(0);
    expect(live.title).toBe('LEGACY-NOW');
    const version = await versionId(HANDLE_LEGACY, 2024);
    expect(version).not.toBe(liveId);
    expect(Number((await readRow(version)).is_snapshot)).toBe(1);
    expect(Number((await readRow(version)).result_official_code)).toBe(917340);
  });

  it('creates no row when the same payloads run a second time', async () => {
    await insertResult({
      code: 917370,
      year: 2020,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_IDEM,
      title: 'IDEM-LIVE',
    });
    const years = new Map<number, TipMappedResult>([
      [2025, payload(HANDLE_IDEM, 2025, 'IDEM-2025', false, null)],
      [2026, payload(HANDLE_IDEM, 2026, 'IDEM-2026', false, null)],
    ]);

    await routine.syncHandle(HANDLE_IDEM, years, batch(), new Map());
    const afterFirst = await idsForHandle(HANDLE_IDEM);

    await routine.syncHandle(HANDLE_IDEM, years, batch(), new Map());
    const afterSecond = await idsForHandle(HANDLE_IDEM);

    expect(afterSecond).toEqual(afterFirst);
    expect(afterFirst.length).toBeGreaterThan(1);
  });

  it('does not change the STAR fixture row', async () => {
    const tipId = await insertResult({
      code: 917360,
      year: 2025,
      platform: ReportingPlatformEnum.TIP,
      snapshot: 0,
      handle: HANDLE_STAR,
      title: 'TIP-SAME-CODE',
    });
    await routine.syncHandle(
      HANDLE_STAR,
      new Map([
        [2026, payload(HANDLE_STAR, 2026, 'TIP-WROTE-STAR', false, null)],
      ]),
      batch(),
      new Map(),
    );

    expect(await stampOf(starId)).toBe(starStamp);
    const star = await readRow(starId);
    expect(star.title).toBe('STAR-UNTOUCHED');
    expect(star.platform_code).toBe(ReportingPlatformEnum.STAR);
    expect(Number(star.result_official_code)).toBe(917360);
    expect(Number(star.report_year_id)).toBe(2026);

    const tip = await readRow(tipId);
    expect(tip.platform_code).toBe(ReportingPlatformEnum.TIP);
    expect(tip.title).toBe('TIP-WROTE-STAR');
    expect(Number(tip.result_id)).not.toBe(starId);
  });
});

const silentLogger = {
  warn(): void {},
  error(): void {},
  log(): void {},
  debug(): void {},
};

function bindRoutine(ds: DataSource, created: CreatedRow[]): Routine {
  const results = {
    async updateInactiveResult(id: number, isSnapshot: boolean): Promise<void> {
      await ds.query(
        'UPDATE results SET is_active = 1, is_snapshot = ? WHERE result_id = ?',
        [isSnapshot ? 1 : 0, id],
      );
    },
    async updateResultStatus(id: number, statusId: number): Promise<void> {
      await ds.query(
        'UPDATE results SET result_status_id = ? WHERE result_id = ?',
        [statusId, id],
      );
    },
    async updateGeneralInfo(
      id: number,
      info: { title?: string; description?: string; year?: number },
    ): Promise<void> {
      const current = (await ds.query(
        'SELECT is_snapshot AS snap FROM results WHERE result_id = ?',
        [id],
      )) as Row[];
      if (info.title === FAIL_LIVE_TITLE && isLiveFlag(current[0]?.snap)) {
        throw new Error('forced live-create failure');
      }
      await ds.query(
        `UPDATE results
            SET title = ?, description = ?, report_year_id = ?
          WHERE result_id = ?`,
        [info.title ?? null, info.description ?? null, info.year ?? null, id],
      );
    },
    async createResult(
      dto: {
        year?: number;
        title?: string;
        description?: string;
        indicator_id?: number;
      },
      platform: string,
      config: { isSnapshot?: boolean; result_status_id?: number },
      officialCode?: number,
    ): Promise<{ result_id: number; result_official_code: number }> {
      const header = await ds.query(
        `INSERT INTO results
           (result_official_code, report_year_id, platform_code, is_snapshot,
            is_active, title, description, indicator_id, result_status_id)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [
          officialCode,
          dto.year,
          platform,
          config.isSnapshot ? 1 : 0,
          dto.title ?? null,
          dto.description ?? null,
          dto.indicator_id ?? null,
          config.result_status_id ?? null,
        ],
      );
      const id = insertIdOf(header);
      created.push({ id, snapshot: config.isSnapshot === true });
      return { result_id: id, result_official_code: Number(officialCode) };
    },
    async findResultAlignment(): Promise<{ primary_levers: [] }> {
      return { primary_levers: [] };
    },
    async updateResultAlignment(): Promise<void> {},
    async saveGeoLocation(): Promise<void> {},
    async newOfficialCode(): Promise<number> {
      throw new Error('T-07 fixture must already own its official code');
    },
  };

  const bilateral = {
    async importAlignmentFromTip(
      resultId: number,
      mapping: TipTocMappingDto,
    ): Promise<void> {
      const header = await ds.query(
        `INSERT INTO result_pool_funding_alignment
           (result_id, has_contribution, is_active, created_at)
         VALUES (?, 1, 1, CURRENT_TIMESTAMP)`,
        [resultId],
      );
      await ds.query(
        `INSERT INTO result_pool_funding_alignment_sp
           (alignment_id, sp_code, sp_role, is_active, created_at)
         VALUES (?, ?, 'PRIMARY', 1, CURRENT_TIMESTAMP)`,
        [insertIdOf(header), mapping.science_program_id],
      );
    },
  };

  const save = Object.assign(Object.create(SaveResultService.prototype), {
    logger: silentLogger,
    dataSource: ds,
    _currentUser: {
      setSystemUser(): void {},
      clearSystemUser(): void {},
    },
    _queryService: new QueryService(ds),
    _resultsUtil: {
      async setCurrentResult(): Promise<void> {},
      clearManually(): void {},
    },
    _resultsService: results,
    _resultInstitutionsService: { async updatePartners(): Promise<void> {} },
    _resultEvidencesService: {
      async updateResultEvidences(): Promise<void> {},
    },
    _resultKnowledgeProductService: { async update(): Promise<void> {} },
    _resultPolicyChangeService: {},
    _resultCapacitySharingService: {},
    _resultInnovationDevService: {},
    _resultIpRightsService: {},
    _resultInnovationUseService: {},
  }) as SaveResultService;

  return Object.assign(Object.create(TipIntegrationService.prototype), {
    logger: silentLogger,
    tipHandleRepository: new TipHandleRepository(ds),
    saveResultService: save,
    resultsService: results,
    bilateralService: bilateral,
  }) as Routine;
}

function batch(): ExtraData<ExternalMappersDto> {
  return {
    platformCode: ReportingPlatformEnum.TIP,
    resultSaved: [],
    counters: new CounterResults(),
    manageOfficialCode: true,
  };
}

function payload(
  handle: string,
  year: number,
  title: string,
  isVersionApplied: boolean,
  poolFunding: TipTocMappingDto | null,
): TipMappedResult {
  return {
    public_link: handle,
    is_version_applied: isVersionApplied,
    official_code: 0,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    createResult: {
      title,
      year,
      description: title,
      indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
    },
    generalInformation: {
      title,
      year,
      description: title,
      keywords: [],
    },
    alignments: { primary_levers: [] },
    poolFunding,
  } as TipMappedResult;
}

function isLiveFlag(value: unknown): boolean {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return value.length === 0 || value[0] === 0;
  }
  return value === 0 || value === false || value === null || value === '0';
}

async function ensureReportYear(year: number): Promise<void> {
  await dataSource.query(
    `INSERT INTO report_years (report_year, is_active)
     SELECT ?, TRUE FROM DUAL
     WHERE NOT EXISTS (
       SELECT 1 FROM report_years WHERE report_year = ?
     )`,
    [year, year],
  );
}

async function insertResult(input: {
  code: number;
  year: number;
  platform: ReportingPlatformEnum;
  snapshot: number | null;
  handle: string;
  title: string;
  active?: number;
}): Promise<number> {
  const header = await dataSource.query(
    `INSERT INTO results
       (result_official_code, report_year_id, platform_code, is_snapshot,
        is_active, title, public_link, result_status_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      input.code,
      input.year,
      input.platform,
      input.snapshot,
      input.active ?? 1,
      input.title,
      input.handle,
    ],
  );
  return insertIdOf(header);
}

async function insertLink(
  resultId: number,
  otherResultId: number,
  roleId: number,
): Promise<number> {
  const header = await dataSource.query(
    `INSERT INTO link_results
       (result_id, other_result_id, link_result_role_id, is_active)
     VALUES (?, ?, ?, 1)`,
    [resultId, otherResultId, roleId],
  );
  return insertIdOf(header);
}

async function insertSyncLog(
  name: SyncProcessEnum,
  status: SyncProcessStatusEnum,
  createdAt: Date,
): Promise<number> {
  const header = await dataSource.query(
    `INSERT INTO sync_process_logs
       (process_name, process_status, created_records, updated_records,
        total_records, success_records, error_records, is_active, created_at)
     VALUES (?, ?, 0, 0, 0, 0, 0, 1, ?)`,
    [name, status, createdAt],
  );
  return insertIdOf(header);
}

async function loadRoleId(): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT link_result_role_id AS id
       FROM link_result_roles
      WHERE is_active = 1
      ORDER BY link_result_role_id
      LIMIT 1`,
  )) as Row[];
  const id = Number(rows[0]?.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('scratch schema has no link_result_roles row');
  }
  return id;
}

async function readRow(id: number): Promise<Row> {
  const rows = (await dataSource.query(
    `SELECT result_id, result_official_code, report_year_id, is_snapshot,
            is_active, title, platform_code, public_link,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updated_at_text
       FROM results
      WHERE result_id = ?`,
    [id],
  )) as Row[];
  if (!rows[0]) {
    throw new Error(`result ${id} is missing`);
  }
  return rows[0];
}

async function readLink(id: number): Promise<Row> {
  const rows = (await dataSource.query(
    `SELECT link_result_id, result_id, other_result_id, is_active
       FROM link_results
      WHERE link_result_id = ?`,
    [id],
  )) as Row[];
  return rows[0];
}

async function stampOf(id: number): Promise<string> {
  const row = await readRow(id);
  return JSON.stringify([
    row.result_official_code,
    row.report_year_id,
    row.is_snapshot,
    row.title,
    row.platform_code,
    row.public_link,
    row.updated_at_text,
  ]);
}

async function idsForHandle(handle: string): Promise<number[]> {
  const rows = (await dataSource.query(
    `SELECT result_id
       FROM results
      WHERE public_link = ? AND platform_code = 'TIP'
      ORDER BY result_id`,
    [handle],
  )) as Row[];
  return rows.map((row) => Number(row.result_id));
}

async function versionId(handle: string, year: number): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT result_id
       FROM results
      WHERE public_link = ?
        AND platform_code = 'TIP'
        AND is_snapshot = 1
        AND report_year_id = ?`,
    [handle, year],
  )) as Row[];
  expect(rows).toHaveLength(1);
  return Number(rows[0].result_id);
}

async function programsOf(resultId: number): Promise<string[]> {
  const rows = (await dataSource.query(
    `SELECT sp.sp_code AS sp
       FROM result_pool_funding_alignment a
       JOIN result_pool_funding_alignment_sp sp ON sp.alignment_id = a.id
      WHERE a.result_id = ? AND a.is_active = 1 AND sp.is_active = 1
      ORDER BY sp.sp_code`,
    [resultId],
  )) as Row[];
  return rows.map((row) => String(row.sp));
}

async function cleanupBand(): Promise<void> {
  const ids = (await dataSource.query(
    `SELECT result_id AS id
       FROM results
      WHERE result_official_code BETWEEN ? AND ?
         OR public_link LIKE 'https://t07.invalid/%'`,
    [BAND_LO, BAND_HI],
  )) as Row[];
  const list = ids.map((row) => Number(row.id)).filter((id) => id > 0);
  if (list.length === 0) {
    return;
  }
  const inList = list.join(',');
  const logTables = (await dataSource.query(
    `SELECT COUNT(*) AS c
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'tip_handle_merge_log'`,
  )) as Row[];
  if (Number(logTables[0]?.c) > 0) {
    const linkRows = (await dataSource.query(
      `SELECT link_result_id AS id
         FROM link_results
        WHERE result_id IN (${inList})
           OR other_result_id IN (${inList})`,
    )) as Row[];
    const linkIds = linkRows
      .map((row) => Number(row.id))
      .filter((id) => id > 0);
    const linkClause =
      linkIds.length > 0
        ? `OR (kind = 'link' AND row_id IN (${linkIds.join(',')}))`
        : '';
    await dataSource.query(
      `DELETE FROM tip_handle_merge_log
        WHERE (kind = 'result' AND row_id IN (${inList}))
        ${linkClause}`,
    );
  }
  await dataSource.query(
    `DELETE sp FROM result_pool_funding_alignment_sp sp
       JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id
      WHERE a.result_id IN (${inList})`,
  );
  await dataSource.query(
    `DELETE FROM result_pool_funding_alignment WHERE result_id IN (${inList})`,
  );
  await dataSource.query(
    `DELETE FROM link_results
      WHERE result_id IN (${inList}) OR other_result_id IN (${inList})`,
  );
  await dataSource.query(`DELETE FROM results WHERE result_id IN (${inList})`);
}

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number } | undefined)?.insertId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`insert did not return an id: ${JSON.stringify(result)}`);
  }
  return id;
}
