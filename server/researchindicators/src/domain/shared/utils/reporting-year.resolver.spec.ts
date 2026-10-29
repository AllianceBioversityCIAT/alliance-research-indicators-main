import { DataSource } from 'typeorm';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { LoggerUtil } from './logger.util';
import {
  currentReportingYearSql,
  DEFAULT_REPORTING_YEAR,
  ReportingYearResolver,
} from './reporting-year.resolver';

type ConfigRow = {
  key: string;
  simple_value: string | null;
  is_active: boolean;
};

/**
 * Stand-in for the SELECT. It applies the active-row filter and the year
 * rule so a unit test can flip the stored value. What the SQL evaluates to
 * is proved by test/reporting-year-sql.integration-spec.ts, which executes
 * the exported fragment.
 */
function yearFromRaw(raw: string | null): number {
  if (typeof raw !== 'string') {
    return DEFAULT_REPORTING_YEAR;
  }
  const normalized = raw.replace(/[\t\r\n]/g, ' ').replace(/^ +| +$/g, '');
  return /^[0-9]{4}$/.test(normalized)
    ? Number(normalized)
    : DEFAULT_REPORTING_YEAR;
}

describe('ReportingYearResolver', () => {
  let resolver: ReportingYearResolver;
  let rows: ConfigRow[];
  let query: jest.Mock;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    rows = [];
    query = jest.fn(async () => {
      const row = rows.find(
        (candidate) =>
          candidate.key === AppConfigKey.ARI_PRMS_SYNC && candidate.is_active,
      );
      const raw = row?.simple_value ?? null;
      return [
        {
          reporting_year: String(yearFromRaw(raw)),
          raw_value: raw,
        },
      ];
    });
    const dataSource = { query };
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

  it('exports a fragment with no placeholders', () => {
    expect(currentReportingYearSql).not.toMatch(/\?/);
    expect(currentReportingYearSql).not.toMatch(/:\w/);
    expect(currentReportingYearSql).toContain('`key`');
  });

  it("returns 2027 when the active row is '2027'", async () => {
    active('2027');

    await expect(resolver.resolve()).resolves.toBe(2027);

    expect(warnSpy).not.toHaveBeenCalled();
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain(currentReportingYearSql);
    expect(sql).toContain('AS raw_value');
    expect(sql).not.toContain(';');
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

  it('executes the fragment and returns the SELECT year column', async () => {
    query.mockResolvedValueOnce([
      { reporting_year: '2031', raw_value: 'not-a-year' },
    ]);

    await expect(resolver.resolve()).resolves.toBe(2031);
  });

  it('degrades a failed read to 2026 and warns with the key', async () => {
    query.mockRejectedValueOnce(new Error('connection refused'));

    await expect(resolver.resolve()).resolves.toBe(2026);

    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      AppConfigKey.ARI_PRMS_SYNC,
    );
  });
});
