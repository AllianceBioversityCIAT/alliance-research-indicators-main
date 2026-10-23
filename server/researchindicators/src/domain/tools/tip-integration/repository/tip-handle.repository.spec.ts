import 'reflect-metadata';
import { DataSource } from 'typeorm';
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
});
