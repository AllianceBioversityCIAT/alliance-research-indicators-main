// @akili-spec changes/agresso-staff-deactivation (T-07 — R-AGD-011)
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../entities/app-config/entities/app-config.entity';
import { AppConfigKey } from '../../../entities/app-config/enum/app-config-key.enum';
import { EXTERNAL_STATUS_ID } from './dto/deactivation-config.dto';
import { StaffDeactivationConfigResolver } from './staff-deactivation-config.resolver';

const DRY = AppConfigKey.ARI_STAFF_DEACTIVATION_DRY_RUN;
const CEILING = AppConfigKey.ARI_STAFF_DEACTIVATION_CEILING_FRACTION;
const FLOOR = AppConfigKey.ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR;
const EXTERNAL = AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID;

type RowOverride = string | { inactive: true; value: string } | null;

const SEEDED: Record<AppConfigKey, string> = {
  [DRY]: 'false',
  [CEILING]: '0.05',
  [FLOOR]: '10',
  [EXTERNAL]: '9',
} as Record<AppConfigKey, string>;

describe('StaffDeactivationConfigResolver', () => {
  let find: jest.Mock;
  let getRepository: jest.Mock;
  let resolver: StaffDeactivationConfigResolver;

  const row = (
    key: AppConfigKey,
    simpleValue: string,
    isActive: boolean | number = true,
  ): AppConfig =>
    ({
      key,
      simple_value: simpleValue,
      is_active: isActive,
    }) as AppConfig;

  const rows = (
    overrides: Partial<Record<AppConfigKey, RowOverride>> = {},
  ): AppConfig[] =>
    [DRY, CEILING, FLOOR, EXTERNAL].flatMap((key) => {
      const override = Object.prototype.hasOwnProperty.call(overrides, key)
        ? overrides[key]
        : SEEDED[key];
      if (override == null) {
        return [];
      }
      if (typeof override === 'object') {
        return [row(key, override.value, false)];
      }
      return [row(key, override)];
    });

  beforeEach(() => {
    find = jest.fn().mockResolvedValue(rows());
    getRepository = jest.fn().mockReturnValue({ find });
    resolver = new StaffDeactivationConfigResolver({
      getRepository,
    } as unknown as DataSource);
  });

  it('reads each key through AppConfig and coerces the seeded shapes', async () => {
    find.mockResolvedValue(
      rows({
        [DRY]: ' false ',
        [CEILING]: ' 0.05 ',
        [FLOOR]: ' 10 ',
        [EXTERNAL]: ' 9 ',
      }),
    );

    const result = await resolver.resolve();

    expect(getRepository).toHaveBeenCalledWith(AppConfig);
    expect(result).toEqual({
      config: {
        dryRun: false,
        ceilingFraction: 0.05,
        absoluteFloor: 10,
        externalStatusId: 9,
      },
      failures: [],
    });
    expect(result.config.externalStatusId).not.toBe(EXTERNAL_STATUS_ID);
  });

  it('ARI_STAFF_DEACTIVATION_DRY_RUN unresolvable fails safe to enabled', async () => {
    find.mockResolvedValue(rows({ [DRY]: 'banana' }));

    const result = await resolver.resolve();

    expect(result.config.dryRun).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('ARI_STAFF_DEACTIVATION_CEILING_FRACTION unresolvable aborts C-3', async () => {
    find.mockResolvedValue(rows({ [CEILING]: '0' }));

    const result = await resolver.resolve();

    expect(result.failures).toEqual([{ key: CEILING, abortReason: 'C-3' }]);
    expect(result.config.ceilingFraction).toBeNull();
  });

  it('ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR unresolvable aborts C-3', async () => {
    find.mockResolvedValue(rows({ [FLOOR]: '10.5' }));

    const result = await resolver.resolve();

    expect(result.failures).toEqual([{ key: FLOOR, abortReason: 'C-3' }]);
    expect(result.config.absoluteFloor).toBeNull();
  });

  it('ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID unresolvable aborts C-4', async () => {
    find.mockResolvedValue(
      rows({ [EXTERNAL]: { inactive: true, value: '9' } }),
    );

    const result = await resolver.resolve();

    expect(result.config.externalStatusId).toBeNull();
    expect(result.failures).toEqual([{ key: EXTERNAL, abortReason: 'C-4' }]);
  });

  it('a failed read fails safe on dry-run and loud on the other three keys', async () => {
    find.mockRejectedValue(new Error('app_config unavailable'));

    const result = await resolver.resolve();

    expect(result.config.dryRun).toBe(true);
    expect(result.config.ceilingFraction).toBeNull();
    expect(result.config.absoluteFloor).toBeNull();
    expect(result.config.externalStatusId).toBeNull();
    expect(result.failures).toEqual([
      { key: CEILING, abortReason: 'C-3' },
      { key: FLOOR, abortReason: 'C-3' },
      { key: EXTERNAL, abortReason: 'C-4' },
    ]);
  });
});
