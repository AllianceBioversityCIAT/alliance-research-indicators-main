import { DataSource } from 'typeorm';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';
import {
  mapMonitoredRow,
  PooledFundingMonitorRepository,
  splitSciencePrograms,
} from './pooled-funding-monitor.repository';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-02
//
// Scope of this file: the PURE parts of the repository (row mapping, DD-PFM-7,
// scope guard). It deliberately says nothing about what the SQL returns - a
// mocked DataSource cannot represent SQL (KZ-017). The SQL is asserted on real
// rows in `test/pooled-funding-monitor.integration-spec.ts`.

const sp = (
  code: string,
  role: string | null,
  extra: Partial<{ name: string | null; color: string; category: string }> = {},
) => ({
  code,
  role,
  name: 'name' in extra ? extra.name : `${code} name`,
  color: extra.color ?? null,
  category: extra.category ?? null,
});

describe('splitSciencePrograms (DD-PFM-7)', () => {
  it('uses the PRIMARY row and lists every other SP as contributing, ordered by code', () => {
    const { primary, contributing } = splitSciencePrograms([
      sp('SP09', 'CONTRIBUTING'),
      sp('SP02', 'PRIMARY', { color: '#123456', category: 'Accelerators' }),
      sp('SP05', null),
    ]);
    expect(primary).toEqual({
      code: 'SP02',
      name: 'SP02 name',
      color: '#123456',
      category: 'Accelerators',
    });
    expect(contributing.map((c) => c.code)).toEqual(['SP05', 'SP09']);
  });

  it('promotes the ONLY active SP when its role is NULL (legacy rows)', () => {
    const { primary, contributing } = splitSciencePrograms([sp('SP07', null)]);
    expect(primary?.code).toBe('SP07');
    expect(contributing).toEqual([]);
  });

  it('does NOT guess a primary among several NULL-role SPs', () => {
    const { primary, contributing } = splitSciencePrograms([
      sp('SP01', null),
      sp('SP02', null),
    ]);
    expect(primary).toBeNull();
    expect(contributing.map((c) => c.code)).toEqual(['SP01', 'SP02']);
  });

  it('falls back to the code when CLARISA has no name for the program', () => {
    const { primary } = splitSciencePrograms([
      sp('SP11', 'PRIMARY', { name: null }),
    ]);
    expect(primary?.name).toBe('SP11');
  });

  it('returns no primary and no contributing for an empty alignment', () => {
    expect(splitSciencePrograms([])).toEqual({
      primary: null,
      contributing: [],
    });
  });
});

describe('mapMonitoredRow', () => {
  const base = {
    result_id: '10',
    result_official_code: '1001',
    report_year: 2026,
    platform_code: 'STAR',
    title: 'T',
    indicator_id: '1',
    indicator_name: 'Knowledge Product',
    result_status_id: '6',
    result_status_name: 'Approved',
    updated_at_utc: '2026-03-05T23:30:00Z',
    approved_at_utc: '2026-03-06T00:15:00Z',
    is_synced_to_prms: 1,
    project_code: 'P-A',
    project_name: 'Alpha',
    donor: 'D',
    lead_pi: 'L',
    has_alignment: 1,
    has_contribution: 1,
    mapping_complete: 0,
    sp_rows: [sp('SP02', 'PRIMARY'), sp('SP05', null)],
    snapshot_years: [2024, 2025],
    prms_latest: { status: 'REJECTED', justification: 'no' },
  };

  it('turns UTC strings into the same instant, whatever the process time zone', () => {
    const row = mapMonitoredRow(base);
    expect(row.approved_at.toISOString()).toBe('2026-03-06T00:15:00.000Z');
    expect(row.updated_at.toISOString()).toBe('2026-03-05T23:30:00.000Z');
  });

  it('keeps null dates null and parses a JSON string payload', () => {
    const row = mapMonitoredRow({
      ...base,
      approved_at_utc: null,
      sp_rows: JSON.stringify([sp('SP02', 'PRIMARY')]),
      snapshot_years: null,
    });
    expect(row.approved_at).toBeNull();
    expect(row.primary_sp?.code).toBe('SP02');
    expect(row.snapshot_years).toEqual([]);
  });

  it('coerces tinyint flags to booleans and keeps NULL as NULL', () => {
    const row = mapMonitoredRow({
      ...base,
      has_alignment: 0,
      has_contribution: null,
      mapping_complete: null,
      is_synced_to_prms: '0',
    });
    expect(row.has_alignment).toBe(false);
    expect(row.has_contribution).toBeNull();
    expect(row.mapping_complete).toBeNull();
    expect(row.is_synced_to_prms).toBe(false);
  });

  it('orders snapshot years newest first and exposes contributing names for T-01', () => {
    const row = mapMonitoredRow(base);
    expect(row.snapshot_years).toEqual([2025, 2024]);
    expect(row.contributing_sp_names).toEqual(['SP05 name']);
    expect(row.result_id).toBe(10);
    expect(row.indicator_id).toBe(1);
  });
});

describe('PooledFundingMonitorRepository scope guard', () => {
  const dataSource = { query: jest.fn() } as unknown as DataSource;
  const repository = new PooledFundingMonitorRepository(dataSource);

  beforeEach(() => (dataSource.query as jest.Mock).mockReset());

  it.each([undefined, null, NaN, '7' as unknown as number, 1.5])(
    'refuses the PI scope without an integer user id (%p) instead of falling back to the portfolio',
    async (userId) => {
      await expect(
        repository.findMonitoredResults({
          scope: PfmScopeEnum.MINE,
          userId,
        }),
      ).rejects.toThrow('PI scope requires the authenticated sec_user_id');
      expect(dataSource.query).not.toHaveBeenCalled();
    },
  );

  it('binds the user id twice (carnet + delegate branches) and never inlines it', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([]);
    await repository.findMonitoredResults({
      scope: PfmScopeEnum.MINE,
      userId: 4242,
    });
    const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
    expect(params.filter((p: unknown) => p === 4242)).toHaveLength(2);
    expect(sql).not.toContain('4242');
  });

  it('adds no user binding for the portfolio scope', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([]);
    await repository.findMonitoredResults({ scope: PfmScopeEnum.ALL });
    const [, params] = (dataSource.query as jest.Mock).mock.calls[0];
    expect(params).toEqual([6, 'STAR']);
  });

  it('sums window months into the epoch bound the monthly query binds', async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([
      { month: '2026-05', synced: '2' },
    ]);
    const out = await repository.findMonthlySyncs(
      { scope: PfmScopeEnum.ALL },
      new Date('2026-10-08T12:00:00Z'),
    );
    expect(out).toEqual([{ month: '2026-05', synced: 2 }]);
    const [, params] = (dataSource.query as jest.Mock).mock.calls[0];
    // min(six-month start 2026-05-01, year start 2026-01-01) = 2026-01-01T00:00:00Z
    expect(params[0]).toBe(Date.UTC(2026, 0, 1) / 1000);
  });
});
