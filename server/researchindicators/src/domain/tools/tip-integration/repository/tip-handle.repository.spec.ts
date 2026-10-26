import 'reflect-metadata';
import { DataSource, In, IsNull, Not } from 'typeorm';
import { Result } from '../../../entities/results/entities/result.entity';
import { ReportingPlatformEnum } from '../../../entities/results/enum/reporting-platform.enum';
import { SecUserEntity } from '../../../entities/users/entities/sec-user.entity';
import { ResultPrmsSyncModule } from '../../../entities/result-prms-sync/result-prms-sync.module';
import { TipIntegrationModule } from '../tip-integration.module';
import {
  TipHandleRepository,
  TipHandleResolution,
  TipHandleRow,
} from './tip-handle.repository';

interface RawTipRow {
  result_id: number | string;
  result_official_code: number | string;
  report_year_id: number | string;
  is_snapshot: number | boolean;
  is_active: number | boolean;
  is_linked: number | boolean;
}

const HANDLE = 'https://hdl.handle.net/10568/999';

function raw(
  overrides: Partial<RawTipRow> & Pick<RawTipRow, 'result_id'>,
): RawTipRow {
  return {
    result_official_code: 100,
    report_year_id: 2025,
    is_snapshot: 0,
    is_active: 1,
    is_linked: 0,
    ...overrides,
  };
}

function published(row: RawTipRow): TipHandleRow {
  return {
    result_id: Number(row.result_id),
    result_official_code: Number(row.result_official_code),
    report_year_id: Number(row.report_year_id),
    is_snapshot: row.is_snapshot === true || row.is_snapshot === 1,
    is_active: row.is_active === true || row.is_active === 1,
  };
}

describe('TipHandleRepository.resolve', () => {
  let repository: TipHandleRepository;
  let queryMock: jest.Mock;

  beforeEach(() => {
    queryMock = jest.fn().mockResolvedValue([]);
    const dataSource = { query: queryMock } as unknown as DataSource;
    repository = new TipHandleRepository(dataSource);
  });

  function sqlOf(): string {
    return queryMock.mock.calls[0][0] as string;
  }

  it('sends a TIP platform filter and no results is_active filter', async () => {
    await repository.resolve(HANDLE);

    const sql = sqlOf();
    const outerWhereAt = sql.lastIndexOf('WHERE');
    const projection = sql.slice(0, outerWhereAt);
    const where = sql.slice(outerWhereAt);
    expect(where).toContain("r.platform_code = 'TIP'");
    expect(where).toContain('r.public_link = ?');
    expect(where).not.toMatch(/is_active/);
    expect(projection).toContain('r.is_active');
    expect(sql).toContain('link_results');
    expect(sql).toContain('lr.other_result_id = r.result_id');
    expect(sql).toContain('lr.is_active = 1');
    expect(queryMock.mock.calls[0][1]).toEqual([HANDLE]);
    expect(sql).not.toContain(HANDLE);
  });

  it('splits live rows from versions keyed by year, including inactive', async () => {
    const live = raw({
      result_id: '15',
      result_official_code: '21156',
      report_year_id: 2026,
      is_snapshot: 0,
      is_active: 1,
    });
    const version = raw({
      result_id: 500,
      report_year_id: 2025,
      is_snapshot: 1,
      is_active: 1,
      result_official_code: 21156,
    });
    const inactiveVersion = raw({
      result_id: 80,
      report_year_id: 2023,
      is_snapshot: 1,
      is_active: 0,
      result_official_code: 21156,
    });
    queryMock.mockResolvedValueOnce([live, version, inactiveVersion]);

    await expect(repository.resolve(HANDLE)).resolves.toEqual({
      live: published(live),
      otherLive: [],
      versions: {
        2025: published(version),
        2023: published(inactiveVersion),
      },
      otherVersions: [],
    } satisfies TipHandleResolution);
  });

  it('prefers an active live row over an inactive row the survivor rule would keep', async () => {
    const inactiveLinked = raw({
      result_id: 30,
      report_year_id: 2026,
      is_active: 0,
      is_linked: 1,
      result_official_code: 111,
    });
    const activeUnlinked = raw({
      result_id: 10,
      report_year_id: 2024,
      is_active: 1,
      is_linked: 0,
      result_official_code: 222,
    });
    queryMock.mockResolvedValueOnce([inactiveLinked, activeUnlinked]);

    const resolved = await repository.resolve(HANDLE);

    expect(resolved.live).toEqual(published(activeUnlinked));
    expect(resolved.otherLive).toEqual([published(inactiveLinked)]);
  });

  it('among active live rows keeps the single linked survivor', async () => {
    const linkedOlder = raw({
      result_id: 10,
      report_year_id: 2024,
      is_active: 1,
      is_linked: 1,
      result_official_code: 1,
    });
    const unlinkedNewer = raw({
      result_id: 40,
      report_year_id: 2026,
      is_active: 1,
      is_linked: 0,
      result_official_code: 2,
    });
    queryMock.mockResolvedValueOnce([unlinkedNewer, linkedOlder]);

    const resolved = await repository.resolve(HANDLE);

    expect(resolved.live).toEqual(published(linkedOlder));
    expect(resolved.otherLive).toEqual([published(unlinkedNewer)]);
  });

  it('with no single linked survivor keeps the highest year, then the highest result_id', async () => {
    const older = raw({
      result_id: 50,
      report_year_id: 2025,
      is_linked: 0,
      result_official_code: 5,
    });
    const newer = raw({
      result_id: 40,
      report_year_id: 2026,
      is_linked: 0,
      result_official_code: 6,
    });
    queryMock.mockResolvedValueOnce([older, newer]);

    await expect(repository.resolve(HANDLE)).resolves.toMatchObject({
      live: published(newer),
      otherLive: [published(older)],
    });

    const bothLinkedLow = raw({
      result_id: 7,
      report_year_id: 2026,
      is_linked: 1,
      result_official_code: 7,
    });
    const bothLinkedHigh = raw({
      result_id: 9,
      report_year_id: 2026,
      is_linked: 1,
      result_official_code: 9,
    });
    const unlinkedHigherYear = raw({
      result_id: 3,
      report_year_id: 2027,
      is_linked: 0,
      result_official_code: 3,
    });
    queryMock.mockResolvedValueOnce([
      bothLinkedLow,
      bothLinkedHigh,
      unlinkedHigherYear,
    ]);

    const tied = await repository.resolve(HANDLE);
    expect(tied.live).toEqual(published(unlinkedHigherYear));
    expect(tied.otherLive).toEqual([
      published(bothLinkedLow),
      published(bothLinkedHigh),
    ]);

    const tieLow = raw({
      result_id: 10,
      report_year_id: 2026,
      is_linked: 0,
      result_official_code: 10,
    });
    const tieHigh = raw({
      result_id: 20,
      report_year_id: 2026,
      is_linked: 0,
      result_official_code: 20,
    });
    queryMock.mockResolvedValueOnce([tieLow, tieHigh]);

    const yearTie = await repository.resolve(HANDLE);
    expect(yearTie.live).toEqual(published(tieHigh));
    expect(yearTie.otherLive).toEqual([published(tieLow)]);
  });

  it('applies the survivor rule when every live row is inactive', async () => {
    const linked = raw({
      result_id: 4,
      report_year_id: 2023,
      is_active: 0,
      is_linked: 1,
      result_official_code: 40,
    });
    const newer = raw({
      result_id: 8,
      report_year_id: 2026,
      is_active: 0,
      is_linked: 0,
      result_official_code: 80,
    });
    queryMock.mockResolvedValueOnce([newer, linked]);

    const resolved = await repository.resolve(HANDLE);

    expect(resolved.live).toEqual(published(linked));
    expect(resolved.otherLive).toEqual([published(newer)]);
  });

  it('keeps one version per year, active first then highest result_id, and reports extras', async () => {
    const inactiveHigherId = raw({
      result_id: 8,
      report_year_id: 2025,
      is_snapshot: 1,
      is_active: 0,
      result_official_code: 100,
    });
    const activeLowerId = raw({
      result_id: 3,
      report_year_id: 2025,
      is_snapshot: 1,
      is_active: 1,
      result_official_code: 100,
    });
    const activeHighId = raw({
      result_id: 12,
      report_year_id: 2024,
      is_snapshot: 1,
      is_active: 1,
      result_official_code: 100,
    });
    const activeLowId = raw({
      result_id: 2,
      report_year_id: 2024,
      is_snapshot: 1,
      is_active: 1,
      result_official_code: 100,
    });
    queryMock.mockResolvedValueOnce([
      inactiveHigherId,
      activeLowerId,
      activeLowId,
      activeHighId,
    ]);

    const resolved = await repository.resolve(HANDLE);

    expect(resolved.versions[2025]).toEqual(published(activeLowerId));
    expect(resolved.versions[2024]).toEqual(published(activeHighId));
    expect(resolved.otherVersions).toEqual([
      published(inactiveHigherId),
      published(activeLowId),
    ]);
    expect(resolved.live).toBeNull();
  });

  it('returns an empty resolution when the handle has no TIP rows', async () => {
    await expect(repository.resolve(HANDLE)).resolves.toEqual({
      live: null,
      otherLive: [],
      versions: {},
      otherVersions: [],
    });
  });

  it('is registered as a provider of TipIntegrationModule', () => {
    const providers = Reflect.getMetadata(
      'providers',
      TipIntegrationModule,
    ) as unknown[];
    const exportsMeta = Reflect.getMetadata(
      'exports',
      TipIntegrationModule,
    ) as unknown[];
    expect(providers).toContain(TipHandleRepository);
    expect(exportsMeta).toContain(TipHandleRepository);
  });

  it('imports ResultPrmsSyncModule for the push phase', () => {
    const imports = Reflect.getMetadata(
      'imports',
      TipIntegrationModule,
    ) as unknown[];
    expect(imports).toContain(ResultPrmsSyncModule);
  });
});

describe('TipHandleRepository.idsWithPrmsCode', () => {
  it('returns an empty list and does not query when given no ids', async () => {
    const query = jest.fn();
    const getRepository = jest.fn();
    const repository = new TipHandleRepository({
      query,
      getRepository,
    } as unknown as DataSource);

    await expect(repository.idsWithPrmsCode([])).resolves.toEqual([]);

    expect(query).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalled();
  });

  it('reads ids that already store a PRMS code with TypeORM In', async () => {
    const find = jest
      .fn()
      .mockResolvedValue([{ result_id: 10 }, { result_id: '20' }]);
    const getRepository = jest.fn().mockReturnValue({ find });
    const query = jest.fn();
    const repository = new TipHandleRepository({
      query,
      getRepository,
    } as unknown as DataSource);

    await expect(repository.idsWithPrmsCode([10, 20, 30])).resolves.toEqual([
      10, 20,
    ]);

    expect(query).not.toHaveBeenCalled();
    expect(getRepository).toHaveBeenCalledWith(Result);
    expect(find).toHaveBeenCalledWith({
      select: { result_id: true },
      where: {
        result_id: In([10, 20, 30]),
        prms_result_code: Not(IsNull()),
      },
    });
  });
});

describe('TipHandleRepository.liveAuthorFor', () => {
  const OFFICIAL_CODE = 28404;

  function harness(options: {
    version: unknown;
    live?: unknown;
    user?: unknown;
  }) {
    const findOne = jest.fn().mockResolvedValueOnce(options.version);
    if (options.version != null) {
      findOne.mockResolvedValueOnce(
        options.live === undefined ? null : options.live,
      );
    }
    const userFindOne = jest.fn().mockResolvedValue(options.user ?? null);
    const getRepository = jest.fn().mockImplementation((entity: unknown) => {
      if (entity === SecUserEntity) {
        return { findOne: userFindOne };
      }
      return { findOne };
    });
    return {
      repository: new TipHandleRepository({
        getRepository,
      } as unknown as DataSource),
      findOne,
      userFindOne,
      getRepository,
    };
  }

  it('returns null and does not look for a live row when the version row is missing', async () => {
    const { repository, findOne, getRepository } = harness({ version: null });

    await expect(repository.liveAuthorFor(50)).resolves.toBeNull();

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({
      select: { result_id: true, result_official_code: true },
      where: { result_id: 50 },
    });
    expect(getRepository).not.toHaveBeenCalledWith(SecUserEntity);
  });

  it('returns null when the version row has no official code', async () => {
    const { repository, findOne, getRepository } = harness({
      version: { result_id: 50, result_official_code: null },
    });

    await expect(repository.liveAuthorFor(50)).resolves.toBeNull();

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(getRepository).not.toHaveBeenCalledWith(SecUserEntity);
  });

  it('returns null when no TIP live row shares the official code', async () => {
    const { repository, findOne, getRepository } = harness({
      version: { result_id: 50, result_official_code: OFFICIAL_CODE },
      live: null,
    });

    await expect(repository.liveAuthorFor(50)).resolves.toBeNull();

    expect(findOne).toHaveBeenNthCalledWith(2, {
      select: { result_id: true, created_by: true },
      where: {
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: false,
        is_active: true,
        result_official_code: OFFICIAL_CODE,
      },
      order: { result_id: 'DESC' },
    });
    expect(getRepository).not.toHaveBeenCalledWith(SecUserEntity);
  });

  it('returns null and does not load a user when the live row has no created_by', async () => {
    const { repository, userFindOne, getRepository } = harness({
      version: { result_id: 50, result_official_code: OFFICIAL_CODE },
      live: { result_id: 9, created_by: null },
    });

    await expect(repository.liveAuthorFor(50)).resolves.toBeNull();

    expect(userFindOne).not.toHaveBeenCalled();
    expect(getRepository).not.toHaveBeenCalledWith(SecUserEntity);
  });

  it('returns null when created_by does not match a user', async () => {
    const { repository, userFindOne } = harness({
      version: { result_id: 50, result_official_code: OFFICIAL_CODE },
      live: { result_id: 9, created_by: 718 },
      user: null,
    });

    await expect(repository.liveAuthorFor(50)).resolves.toBeNull();

    expect(userFindOne).toHaveBeenCalledWith({
      where: { sec_user_id: 718 },
    });
  });

  it('returns the STAR user stored on the TIP live row', async () => {
    const { repository, userFindOne } = harness({
      version: { result_id: 50, result_official_code: OFFICIAL_CODE },
      live: { result_id: 9, created_by: '718' },
      user: {
        sec_user_id: '718',
        email: 'live.author@cgiar.org',
        first_name: 'Live',
        last_name: 'Author',
      },
    });

    await expect(repository.liveAuthorFor(50)).resolves.toEqual(
      expect.objectContaining({
        sec_user_id: 718,
        email: 'live.author@cgiar.org',
        first_name: 'Live',
        last_name: 'Author',
      }),
    );
    expect(userFindOne).toHaveBeenCalledWith({
      where: { sec_user_id: 718 },
    });
  });
});
