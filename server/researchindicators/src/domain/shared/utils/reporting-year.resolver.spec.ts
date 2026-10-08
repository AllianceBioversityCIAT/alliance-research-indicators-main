import { DataSource } from 'typeorm';
import { AppConfig } from '../../entities/app-config/entities/app-config.entity';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { LoggerUtil } from './logger.util';
import {
  DEFAULT_REPORTING_YEAR,
  ReportingYearResolver,
} from './reporting-year.resolver';

type ConfigRow = {
  key: string;
  simple_value: string | null;
  is_active: boolean;
};

type FindWhere = {
  key?: string;
  is_active?: boolean;
};

/**
 * Repository stand-in. Applies the `where` the resolver actually sends, so
 * dropping `is_active` returns the inactive `'2027'` row (falsifier c).
 */
function matchingRow(rows: ConfigRow[], where: FindWhere): ConfigRow | null {
  return (
    rows.find((row) => {
      if (where.key !== undefined && row.key !== where.key) {
        return false;
      }
      if (where.is_active !== undefined && row.is_active !== where.is_active) {
        return false;
      }
      return true;
    }) ?? null
  );
}

describe('ReportingYearResolver', () => {
  let resolver: ReportingYearResolver;
  let rows: ConfigRow[];
  let findOne: jest.Mock;
  let getRepository: jest.Mock;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    rows = [];
    findOne = jest.fn(
      async (options?: { where?: FindWhere }): Promise<ConfigRow | null> =>
        matchingRow(rows, options?.where ?? {}),
    );
    getRepository = jest.fn().mockReturnValue({ findOne });
    const dataSource = { getRepository };
    warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    resolver = new ReportingYearResolver(dataSource as unknown as DataSource);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function active(simpleValue: string | null): void {
    rows = [
      {
        key: AppConfigKey.ARI_PRMS_SYNC,
        simple_value: simpleValue,
        is_active: true,
      },
    ];
  }

  it('is constructed with DataSource only', () => {
    expect(resolver).toBeInstanceOf(ReportingYearResolver);
    expect(DEFAULT_REPORTING_YEAR).toBe(2026);
  });

  it("returns 2027 when the active row is '2027'", async () => {
    active('2027');

    await expect(resolver.resolve()).resolves.toBe(2027);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(findOne).toHaveBeenCalledWith({
      where: {
        key: AppConfigKey.ARI_PRMS_SYNC,
        is_active: true,
      },
    });
  });

  it("returns 2027 when the active row is ' 2027 '", async () => {
    active(' 2027 ');

    await expect(resolver.resolve()).resolves.toBe(2027);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('resolves a missing row to 2026 and warns with the key', async () => {
    rows = [];

    await expect(resolver.resolve()).resolves.toBe(2026);

    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      AppConfigKey.ARI_PRMS_SYNC,
    );
  });

  it("resolves an inactive row holding '2027' to 2026 and warns", async () => {
    rows = [
      {
        key: AppConfigKey.ARI_PRMS_SYNC,
        simple_value: '2027',
        is_active: false,
      },
    ];

    await expect(resolver.resolve()).resolves.toBe(2026);

    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      AppConfigKey.ARI_PRMS_SYNC,
    );
  });

  it.each(['', 'abc', '20265', '2026.5'])(
    'resolves unusable simple_value %j to 2026 and warns with the key and raw value',
    async (simpleValue: string) => {
      active(simpleValue);

      await expect(resolver.resolve()).resolves.toBe(2026);

      expect(warnSpy).toHaveBeenCalled();
      const message = String(warnSpy.mock.calls[0][0]);
      expect(message).toContain(AppConfigKey.ARI_PRMS_SYNC);
      expect(message).toContain(JSON.stringify(simpleValue));
    },
  );

  it('returns the new value on the second call when the row changes', async () => {
    active('2026');

    await expect(resolver.resolve()).resolves.toBe(2026);

    rows[0].simple_value = '2027';

    await expect(resolver.resolve()).resolves.toBe(2027);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('asks the repository for the AppConfig entity', async () => {
    active('2026');

    await resolver.resolve();

    expect(getRepository).toHaveBeenCalledWith(AppConfig);
  });

  it('degrades a failed read to 2026 and warns with the key', async () => {
    findOne.mockRejectedValue(new Error('connection refused'));

    await expect(resolver.resolve()).resolves.toBe(2026);

    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      AppConfigKey.ARI_PRMS_SYNC,
    );
  });
});
