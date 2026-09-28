// @akili-spec changes/agresso-staff-deactivation (T-04, T-09)
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { AppConfigKey } from '../../../entities/app-config/enum/app-config-key.enum';
import { AppSecret } from '../../../entities/app-secrets/entities/app-secret.entity';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { DeactivationConfigResolution } from './dto/deactivation-config.dto';
import { FetchReport } from './dto/fetch-report.dto';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import {
  DeactivationMeasurement,
  SecUserDeactivationService,
} from './sec-user-deactivation.service';
import { CHUNK } from './sec-user-reconciler.repository';
import { ReconciliationResult } from './sec-user-reconciler.service';
import { StaffDeactivationConfigResolver } from './staff-deactivation-config.resolver';

const EXTERNAL_STATUS_ID = 3;

/** Every field varies per row: a fixture built from identical defaults cannot tell per-account
 *  scoping from a batch-wide bug (KZ-004). */
const user = (over: Partial<SecUser> & { sec_user_id: number }): SecUser =>
  ({
    first_name: `F${over.sec_user_id}`,
    last_name: `L${over.sec_user_id}`,
    email: `user${over.sec_user_id}@cgiar.org`,
    status_id: 1,
    carnet: `C${over.sec_user_id}`,
    is_active: true,
    ...over,
  }) as SecUser;

const member = (resourceId: string, email: string): AgressoStaffRawDto =>
  ({ resourceId, email, firstName: 'F', lastName: 'L' }) as AgressoStaffRawDto;

const reconciliation = (
  over: Partial<ReconciliationResult> = {},
): ReconciliationResult =>
  ({
    skipped: [],
    collapsed: [],
    create: [],
    refresh: [],
    reactivate: [],
    ...over,
  }) as ReconciliationResult;

const fetch = (over: Partial<FetchReport> = {}): FetchReport => ({
  totalElements: 2,
  pageRowCounts: [2],
  distinctCarnets: 2,
  duplicatedCarnets: [],
  ...over,
});

const resolvedConfig = (
  over: Partial<DeactivationConfigResolution['config']> = {},
): DeactivationConfigResolution => ({
  config: {
    dryRun: true,
    ceilingFraction: 0.05,
    absoluteFloor: 10,
    externalStatusId: EXTERNAL_STATUS_ID,
    ...over,
  },
  failures: [],
});

async function serviceOverRealRepository(
  externalStatusId: number,
  statusRows: { user_status_id: number; name: string }[],
): Promise<{ service: SecUserDeactivationService }> {
  const repository = new SecUserDeactivationRepository({} as EntityManager);
  jest.spyOn(repository, 'query').mockImplementation(async (sql: string) => {
    if (/from\s+user_status/i.test(sql)) {
      return statusRows;
    }
    return [];
  });

  const moduleRef = await Test.createTestingModule({
    providers: [
      SecUserDeactivationService,
      { provide: SecUserDeactivationRepository, useValue: repository },
      {
        provide: StaffDeactivationConfigResolver,
        useValue: {
          resolve: jest
            .fn()
            .mockResolvedValue(
              resolvedConfig({ externalStatusId, dryRun: true }),
            ),
        },
      },
      { provide: DataSource, useValue: { transaction: jest.fn() } },
    ],
  }).compile();

  return { service: moduleRef.get(SecUserDeactivationService) };
}

describe('SecUserDeactivationService', () => {
  let service: SecUserDeactivationService;
  let repo: jest.Mocked<SecUserDeactivationRepository>;
  let configResolver: { resolve: jest.Mock };

  beforeEach(async () => {
    repo = {
      resolveExternalStatusId: jest
        .fn()
        .mockResolvedValue({ statusId: EXTERNAL_STATUS_ID, matchCount: 1 }),
      countActivePopulation: jest.fn().mockResolvedValue(0),
      findActiveSystemAdminUserIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SecUserDeactivationRepository>;
    configResolver = {
      resolve: jest.fn().mockResolvedValue(resolvedConfig()),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SecUserDeactivationService,
        { provide: SecUserDeactivationRepository, useValue: repo },
        { provide: StaffDeactivationConfigResolver, useValue: configResolver },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(SecUserDeactivationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const run = (
    staff: AgressoStaffRawDto[],
    users: SecUser[],
    over: { rec?: ReconciliationResult; fetch?: Partial<FetchReport> } = {},
  ) =>
    service.measure(
      staff,
      over.rec ?? reconciliation(),
      users,
      fetch({
        totalElements: staff.length,
        distinctCarnets: staff.length,
        ...over.fetch,
      }),
    );

  describe('candidate set (R-AGD-001)', () => {
    it('reports an active account no payload member claims', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 700, email: 'present@cgiar.org' }),
          user({ sec_user_id: 701, email: 'gone.person@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([701]);
    });

    it('matches on the normalized key, so case and whitespace do not manufacture a candidate', async () => {
      const result = await run(
        [member('A1', '  J.DOE@CGIAR.ORG ')],
        [user({ sec_user_id: 702, email: 'j.doe@cgiar.org' })],
      );

      expect(result.candidates).toEqual([]);
    });

    it('never reports an already-inactive row', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({
            sec_user_id: 703,
            email: 'already.off@cgiar.org',
            is_active: false,
          }),
          user({ sec_user_id: 704, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.activePopulation).toBe(1);
    });
  });

  describe('shields (R-AGD-002)', () => {
    // THE JD-3 CASE. Raw length is over the column width; the trimmed key is not, and the trimmed
    // key is what matching compares. Swapping shieldKeyFor for isUsableEmail reddens this.
    it('shields an account whose staff member arrived with a padded, over-length raw email', async () => {
      const padded = 'maria.gomez@cgiar.org' + ' '.repeat(140);
      expect(padded.length).toBeGreaterThan(150);

      const result = await run(
        [member('A1', padded)],
        [user({ sec_user_id: 812, email: 'maria.gomez@cgiar.org' })],
      );

      expect(result.candidates).toEqual([]);
    });

    it('shields an account whose staff member was skipped for a too-long carnet', async () => {
      const skipped = member('ABCDEFGHIJK', 'real.person@cgiar.org');
      const result = await run(
        [skipped],
        [user({ sec_user_id: 800, email: 'real.person@cgiar.org' })],
        {
          rec: reconciliation({
            skipped: [
              { staffMember: skipped, reason: 'CARNET_TOO_LONG' },
            ] as any,
          }),
        },
      );

      expect(result.candidates).toEqual([]);
      expect(result.shieldedBySkip).toEqual([
        { accountId: 800, carnet: 'ABCDEFGHIJK', reason: 'CARNET_TOO_LONG' },
      ]);
    });

    it('shields the account of a collapsed loser, because its key equals its winner key', async () => {
      const result = await run(
        [
          member('A100', 'shared@cgiar.org'),
          member('B200', 'shared@cgiar.org'),
        ],
        [user({ sec_user_id: 801, email: 'shared@cgiar.org' })],
        { fetch: { totalElements: 2, distinctCarnets: 2 } },
      );

      expect(result.candidates).toEqual([]);
    });

    it('completes without throwing when a member arrives with a null email', async () => {
      const result = await run(
        [member('A1', null as unknown as string), member('A2', 'ok@cgiar.org')],
        [user({ sec_user_id: 805, email: 'ok@cgiar.org' })],
      );

      expect(result.abortReason).toBeUndefined();
      expect(result.candidates).toEqual([]);
    });
  });

  describe('exclusions (R-AGD-003)', () => {
    it('EX-1 spares an external account', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({
            sec_user_id: 900,
            email: 'ext@partner.org',
            status_id: EXTERNAL_STATUS_ID,
          }),
          user({ sec_user_id: 901, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.excludedExternal).toBe(1);
    });

    it('EX-2 spares an active system admin but NOT an ex-admin', async () => {
      repo.findActiveSystemAdminUserIds.mockResolvedValue([910]);

      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 910, email: 'admin@cgiar.org' }),
          user({ sec_user_id: 911, email: 'exadmin@cgiar.org' }),
          user({ sec_user_id: 912, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([911]);
      expect(result.excludedSystemAdmin).toBe(1);
    });

    it('EX-3 spares BOTH rows when a key maps to two active rows', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 920, email: 'twin@cgiar.org' }),
          user({ sec_user_id: 921, email: 'TWIN@cgiar.org' }),
          user({ sec_user_id: 922, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.excludedAmbiguous).toBe(2);
    });

    // F-10 — an already-inactive duplicate must not shield its live twin forever.
    it('EX-3 does not count an inactive duplicate, so the live twin IS a candidate', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 10, email: 'twin@cgiar.org', is_active: false }),
          user({ sec_user_id: 11, email: 'twin@cgiar.org' }),
          user({ sec_user_id: 12, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([11]);
      expect(result.excludedAmbiguous).toBe(0);
    });

    it('EX-4 spares an account whose own email is blank — nothing could ever match it', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 930, email: '   ' }),
          user({ sec_user_id: 931, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.excludedUnmatchable).toBe(1);
    });
  });

  describe('preconditions (R-AGD-004)', () => {
    it('C-1 aborts on an empty payload and reports no candidate set', async () => {
      const result = await run(
        [],
        [user({ sec_user_id: 940, email: 'a@cgiar.org' })],
        {
          fetch: { totalElements: 0, pageRowCounts: [], distinctCarnets: 0 },
        },
      );

      expect(result.abortReason).toBe('C-1');
      expect(result.candidates).toBeUndefined();
    });

    it('C-2 aborts naming the page when a non-final page contributed nothing', async () => {
      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 941, email: 'b@cgiar.org' })],
        {
          fetch: {
            totalElements: 2400,
            pageRowCounts: [1000, 0, 400],
            distinctCarnets: 2400,
          },
        },
      );

      expect(result.abortReason).toBe('C-2');
      expect(result.abortDetail).toMatchObject({ emptyPageNumber: 2 });
      expect(result.candidates).toBeUndefined();
    });

    // JS-5 — after the ceil fix the final page holds total % pageSize rows, so one mid-run
    // departure legitimately empties it. That must not read as a failed fetch.
    it('C-2 does NOT fire on an empty FINAL page; the distinctness clause reports the real cause', async () => {
      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 942, email: 'b@cgiar.org' })],
        {
          fetch: {
            totalElements: 2001,
            pageRowCounts: [1000, 1000, 0],
            distinctCarnets: 2000,
          },
        },
      );

      expect(result.abortReason).toBe('C-2');
      expect(result.abortDetail).not.toHaveProperty('emptyPageNumber');
      expect(result.abortDetail).toMatchObject({
        distinctCarnets: 2000,
        totalElements: 2001,
      });
    });

    // JD-1 — the row count would be 2000 == totalElements here and would pass.
    it('C-2 aborts when DISTINCT carnets fall short, and names the duplicates', async () => {
      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 943, email: 'b@cgiar.org' })],
        {
          fetch: {
            totalElements: 2000,
            pageRowCounts: [1000, 1000],
            distinctCarnets: 1995,
            duplicatedCarnets: ['D1', 'D2', 'D3', 'D4', 'D5'],
          },
        },
      );

      expect(result.abortReason).toBe('C-2');
      expect(result.abortDetail).toMatchObject({
        duplicatedCarnets: ['D1', 'D2', 'D3', 'D4', 'D5'],
      });
    });

    it('C-2 does not fire on a surplus — more members is always the safe direction', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [user({ sec_user_id: 944, email: 'present@cgiar.org' })],
        {
          fetch: {
            totalElements: 1000,
            pageRowCounts: [1005],
            distinctCarnets: 1005,
          },
        },
      );

      expect(result.abortReason).toBeUndefined();
    });

    it.each([
      ['zero', 0],
      ['more than one', 2],
    ])('C-4 aborts when %s user_status row matches', async (_l, matchCount) => {
      repo.resolveExternalStatusId.mockResolvedValue({
        statusId: null,
        matchCount,
      });

      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 945, email: 'b@cgiar.org' })],
      );

      expect(result.abortReason).toBe('C-4');
      expect(result.abortDetail).toMatchObject({
        externalStatusMatches: matchCount,
      });
      expect(result.candidates).toBeUndefined();
    });

    it('aborts C-4 when ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID is unresolvable instead of using 4', async () => {
      configResolver.resolve.mockResolvedValue({
        config: {
          dryRun: true,
          ceilingFraction: 0.05,
          absoluteFloor: 10,
          externalStatusId: null,
        },
        failures: [
          {
            key: AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID,
            abortReason: 'C-4',
          },
        ],
      });
      repo.resolveExternalStatusId.mockResolvedValue({
        statusId: 4,
        matchCount: 1,
      });

      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 946, email: 'b@cgiar.org', status_id: 4 })],
      );

      expect(result.abortReason).toBe('C-4');
      expect(result.candidates).toBeUndefined();
    });

    it('measure selects configured ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID when it is not 4', async () => {
      const configuredId = 9;
      expect(configuredId).not.toBe(4);
      const { service: wired } = await serviceOverRealRepository(configuredId, [
        { user_status_id: 4, name: 'External Accepted' },
        { user_status_id: configuredId, name: 'Partner' },
      ]);

      const result = await wired.measure(
        [member('A1', 'present@cgiar.org')],
        reconciliation(),
        [
          user({
            sec_user_id: 980,
            email: 'partner@ext.org',
            status_id: configuredId,
          }),
          user({ sec_user_id: 981, email: 'legacy@cgiar.org', status_id: 4 }),
        ],
        fetch({ totalElements: 1, distinctCarnets: 1, pageRowCounts: [1] }),
      );

      expect(result.abortReason).toBeUndefined();
      expect(result.excludedExternal).toBe(1);
      expect(result.candidates).toEqual([981]);
    });

    it('aborts C-4 in dry-run when ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID matches no active row', async () => {
      const configuredId = 9;
      expect(configuredId).not.toBe(4);
      const { service: wired } = await serviceOverRealRepository(configuredId, [
        { user_status_id: 4, name: 'External Accepted' },
      ]);

      const result = await wired.measure(
        [member('A1', 'present@cgiar.org')],
        reconciliation(),
        [user({ sec_user_id: 982, email: 'legacy@cgiar.org', status_id: 4 })],
        fetch({ totalElements: 1, distinctCarnets: 1, pageRowCounts: [1] }),
      );

      expect(result.abortReason).toBe('C-4');
      expect(result.candidates).toBeUndefined();
    });
  });

  describe('reporting (R-AGD-005)', () => {
    it('omits abortReason entirely on a healthy run, so its presence alone identifies an abort', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [user({ sec_user_id: 950, email: 'present@cgiar.org' })],
      );

      expect('abortReason' in result).toBe(false);
    });

    it('reports activePopulation before exclusions', async () => {
      repo.findActiveSystemAdminUserIds.mockResolvedValue([961]);

      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 960, email: 'present@cgiar.org' }),
          user({ sec_user_id: 961, email: 'admin@cgiar.org' }),
          user({ sec_user_id: 962, email: 'gone@cgiar.org' }),
          user({ sec_user_id: 963, email: 'off@cgiar.org', is_active: false }),
        ],
      );

      expect(result.activePopulation).toBe(3);
      expect(result.candidates).toEqual([962]);
    });
  });
});

/**
 * In-memory stand-in for the three tables. The real repository issues the
 * writes; this manager applies them. A transaction that throws restores the
 * snapshot, which is what TypeORM does when the callback rejects. A catch
 * inside the callback resolves the transaction, so the writes stay.
 */
interface FlagRow {
  id: number;
  is_active: boolean;
}

interface TableWorld {
  sec_users: FlagRow[];
  sec_user_roles: FlagRow[];
  app_secrets: FlagRow[];
}

function flagRows(ids: number[], isActive = true): FlagRow[] {
  return ids.map((id) => ({ id, is_active: isActive }));
}

function deactivateRows(rows: FlagRow[], ids: number[]): number {
  const wanted = new Set(ids);
  let affected = 0;
  for (const row of rows) {
    if (wanted.has(row.id) && row.is_active) {
      row.is_active = false;
      affected += 1;
    }
  }
  return affected;
}

function worldFor(
  candidateIds: number[],
  extras: { secretsForFirst?: number } = {},
): TableWorld {
  const outsider: FlagRow = { id: 9000, is_active: true };
  const secrets = flagRows(candidateIds);
  const extra = extras.secretsForFirst ?? 0;
  for (let i = 0; i < extra; i += 1) {
    secrets.push({ id: candidateIds[0], is_active: true });
  }
  return {
    sec_users: [...flagRows(candidateIds), { ...outsider }],
    sec_user_roles: [...flagRows(candidateIds), { ...outsider }],
    app_secrets: [...secrets, { ...outsider }],
  };
}

function transactionalWorld(
  world: TableWorld,
  options?: { failRolesOnChunk?: number },
): { transaction: jest.Mock; statements: string[] } {
  const statements: string[] = [];
  let rolesChunks = 0;
  const manager = {
    getRepository(entity: unknown) {
      if (entity !== AppSecret) {
        throw new Error(`apply opened an unexpected repository: ${entity}`);
      }
      return {
        update: async (
          criteria: {
            responsible_user_id: { value: number[] };
            is_active: boolean;
          },
          partial: { is_active: boolean },
        ) => {
          statements.push('app_secrets');
          const ids = criteria.responsible_user_id.value;
          let affected = 0;
          for (const row of world.app_secrets) {
            if (ids.includes(row.id) && row.is_active === criteria.is_active) {
              row.is_active = partial.is_active;
              affected += 1;
            }
          }
          return { affected };
        },
      };
    },
    query: async (sql: string, params: number[] = []) => {
      if (/update\s+sec_user_roles\b/i.test(sql)) {
        rolesChunks += 1;
        if (options?.failRolesOnChunk === rolesChunks) {
          throw new Error('sec_user_roles second chunk failed');
        }
        statements.push('sec_user_roles');
        return { affectedRows: deactivateRows(world.sec_user_roles, params) };
      }
      if (/update\s+sec_users\b/i.test(sql)) {
        statements.push('sec_users');
        return { affectedRows: deactivateRows(world.sec_users, params) };
      }
      throw new Error(`apply issued unexpected SQL: ${sql}`);
    },
  };

  return {
    statements,
    transaction: jest.fn(async (callback) => {
      const snapshot = JSON.stringify(world);
      try {
        return await callback(manager);
      } catch (error) {
        const restored = JSON.parse(snapshot) as TableWorld;
        world.sec_users = restored.sec_users;
        world.sec_user_roles = restored.sec_user_roles;
        world.app_secrets = restored.app_secrets;
        throw error;
      }
    }),
  };
}

function applyService(
  repository: SecUserDeactivationRepository,
  dataSource: { transaction: jest.Mock },
): SecUserDeactivationService {
  return new SecUserDeactivationService(
    repository,
    { resolve: jest.fn() } as unknown as StaffDeactivationConfigResolver,
    dataSource as unknown as DataSource,
  );
}

function mockWriteRepository(): SecUserDeactivationRepository {
  return {
    deactivateAppSecrets: jest.fn().mockResolvedValue(1),
    deactivateSecUserRoles: jest.fn().mockResolvedValue(2),
    deactivateSecUsers: jest.fn().mockResolvedValue(3),
  } as unknown as SecUserDeactivationRepository;
}

function measurementOf(
  candidates: number[] | undefined,
  activePopulation: number,
  abortReason?: DeactivationMeasurement['abortReason'],
): DeactivationMeasurement {
  return {
    totalElements: 1,
    distinctCarnets: 1,
    activePopulation,
    candidates,
    excludedExternal: 0,
    excludedSystemAdmin: 0,
    excludedAmbiguous: 0,
    excludedUnmatchable: 0,
    shieldedBySkip: [],
    ...(abortReason ? { abortReason, abortDetail: { from: 'measure' } } : {}),
  };
}

/** 146 candidates against the 2026-09-25 population. Ceiling is max(0.05 × 1985, 10). */
const MEASURED_POPULATION = 1985;
const MEASURED_CANDIDATES = Array.from(
  { length: 146 },
  (_, index) => index + 1,
);

describe('SecUserDeactivationService.apply (T-09)', () => {
  const ceilingConfig = (
    dryRun: boolean,
    over: Partial<DeactivationConfigResolution['config']> = {},
  ) =>
    resolvedConfig({
      dryRun,
      ceilingFraction: 0.05,
      absoluteFloor: 10,
      ...over,
    });

  it('a dry run reports a ceiling breach instead of aborting; the same input live aborts and writes nothing', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = applyService(mockWriteRepository(), dataSource);
    const measured = measurementOf(MEASURED_CANDIDATES, MEASURED_POPULATION);
    const ceiling = Math.max(0.05 * MEASURED_POPULATION, 10);

    const dry = await service.apply(measured, ceilingConfig(true));

    expect(dry.ceilingBreached).toBe(true);
    expect(dry.candidates).toBe(measured.candidates);
    expect(dry.deactivationCount).toBe(146);
    expect(dry.activePopulation).toBe(MEASURED_POPULATION);
    expect(dry.ceiling).toBe(ceiling);
    expect(dry.dryRun).toBe(true);
    expect(dry).not.toHaveProperty('abortReason');

    dataSource.transaction.mockClear();
    const live = await service.apply(measured, ceilingConfig(false));

    expect(live.abortReason).toBe('C-3');
    expect(live.ceilingBreached).toBe(true);
    expect(live.deactivationCount).toBe(146);
    expect(live.activePopulation).toBe(MEASURED_POPULATION);
    expect(live.ceiling).toBe(ceiling);
    expect(live.candidates).toEqual(MEASURED_CANDIDATES);
    expect(live.deactivated).toBe(0);
    expect(live.rolesDeactivated).toBe(0);
    expect(live.secretsDeactivated).toBe(0);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not call DataSource.transaction in dry-run', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = applyService(mockWriteRepository(), dataSource);

    await service.apply(
      measurementOf(MEASURED_CANDIDATES, MEASURED_POPULATION),
      ceilingConfig(true),
    );

    // DD-D10: a zero row-delta would also be true of a transaction that
    // rolled back. The proof is that the DataSource was never asked.
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('a second-chunk failure over 120 leaves all three tables byte-identical', async () => {
    const ids = Array.from({ length: 120 }, (_, index) => index + 1);
    expect(CHUNK).toBe(50);
    expect(Math.ceil(ids.length / CHUNK)).toBe(3);

    const world = worldFor(ids);
    const before = JSON.parse(JSON.stringify(world)) as TableWorld;
    const dataSource = transactionalWorld(world, { failRolesOnChunk: 2 });
    const service = applyService(
      new SecUserDeactivationRepository({} as EntityManager),
      dataSource,
    );

    const result = await service.apply(
      measurementOf(ids, MEASURED_POPULATION),
      ceilingConfig(false, { absoluteFloor: 200 }),
    );

    expect(world).toEqual(before);
    expect(result.abortReason).toBe('WRITE_FAILED');
    expect(result.deactivated).toBe(0);
    expect(result.rolesDeactivated).toBe(0);
    expect(result.secretsDeactivated).toBe(0);
    expect(result.abortDetail).toEqual({
      message: 'sec_user_roles second chunk failed',
    });
  });

  it('a live run under the ceiling switches off all three tables and reports three counts', async () => {
    const ids = [11, 22, 33];
    const world = worldFor(ids, { secretsForFirst: 1 });
    const dataSource = transactionalWorld(world);
    const service = applyService(
      new SecUserDeactivationRepository({} as EntityManager),
      dataSource,
    );

    const result = await service.apply(
      measurementOf(ids, MEASURED_POPULATION),
      ceilingConfig(false),
    );

    expect(result).not.toHaveProperty('abortReason');
    expect(result.secretsDeactivated).toBe(4);
    expect(result.rolesDeactivated).toBe(3);
    expect(result.deactivated).toBe(3);
    expect(dataSource.statements).toEqual([
      'app_secrets',
      'sec_user_roles',
      'sec_users',
    ]);
    for (const id of ids) {
      expect(world.sec_users.find((row) => row.id === id)?.is_active).toBe(
        false,
      );
      expect(world.sec_user_roles.find((row) => row.id === id)?.is_active).toBe(
        false,
      );
    }
    expect(
      world.app_secrets.filter((row) => row.id === 11 && row.is_active),
    ).toHaveLength(0);
    expect(world.sec_users.find((row) => row.id === 9000)?.is_active).toBe(
      true,
    );
    expect(world.sec_user_roles.find((row) => row.id === 9000)?.is_active).toBe(
      true,
    );
    expect(world.app_secrets.find((row) => row.id === 9000)?.is_active).toBe(
      true,
    );
  });

  it('treats a set equal to the ceiling as allowed and the next id as a breach', async () => {
    const dataSource = {
      transaction: jest.fn(async (callback) => callback({})),
    };
    const service = applyService(mockWriteRepository(), dataSource);
    const population = 100;
    const ceiling = Math.max(0.05 * population, 10);
    expect(ceiling).toBe(10);

    const atCeiling = await service.apply(
      measurementOf(
        Array.from({ length: 10 }, (_, index) => index + 1),
        population,
      ),
      ceilingConfig(false),
    );
    expect(atCeiling).not.toHaveProperty('abortReason');
    expect(atCeiling.ceilingBreached).toBe(false);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);

    dataSource.transaction.mockClear();
    const overCeiling = await service.apply(
      measurementOf(
        Array.from({ length: 11 }, (_, index) => index + 1),
        population,
      ),
      ceilingConfig(false),
    );
    expect(overCeiling.abortReason).toBe('C-3');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('applies a ceiling fraction above 1, which has no upper bound', async () => {
    const dataSource = {
      transaction: jest.fn(async (callback) => callback({})),
    };
    const service = applyService(mockWriteRepository(), dataSource);
    const population = 10;
    const fraction = 5;
    const setSize = 11;

    const result = await service.apply(
      measurementOf(
        Array.from({ length: setSize }, (_, index) => index + 1),
        population,
      ),
      ceilingConfig(false, { ceilingFraction: fraction, absoluteFloor: 10 }),
    );

    expect(result.ceiling).toBe(Math.max(fraction * population, 10));
    expect(result.ceiling).toBeGreaterThan(setSize);
    expect(result).not.toHaveProperty('abortReason');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['CEILING_FRACTION', { ceilingFraction: null }],
    ['CEILING_FRACTION', { ceilingFraction: 0 }],
    ['ABSOLUTE_FLOOR', { absoluteFloor: null }],
    ['ABSOLUTE_FLOOR', { absoluteFloor: 0 }],
  ] as const)(
    'an unusable %s (%j) aborts a live run with C-3 and opens no transaction',
    async (_key, over) => {
      const dataSource = { transaction: jest.fn() };
      const service = applyService(mockWriteRepository(), dataSource);

      const result = await service.apply(
        measurementOf([1, 2, 3], MEASURED_POPULATION),
        ceilingConfig(false, over),
      );

      expect(result.abortReason).toBe('C-3');
      expect(result.ceiling).toBeNull();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    },
  );

  it('a dry run over an unusable ceiling reports the breach and does not abort', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = applyService(mockWriteRepository(), dataSource);
    const measured = measurementOf(MEASURED_CANDIDATES, MEASURED_POPULATION);

    const result = await service.apply(
      measured,
      ceilingConfig(true, { ceilingFraction: null }),
    );

    expect(result.ceilingBreached).toBe(true);
    expect(result.ceiling).toBeNull();
    expect(result.candidates).toBe(measured.candidates);
    expect(result).not.toHaveProperty('abortReason');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not open a transaction when the measurement already aborted', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = applyService(mockWriteRepository(), dataSource);

    const result = await service.apply(
      measurementOf(undefined, MEASURED_POPULATION, 'C-1'),
      ceilingConfig(false),
    );

    expect(result.abortReason).toBe('C-1');
    expect(result.candidates).toEqual([]);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
