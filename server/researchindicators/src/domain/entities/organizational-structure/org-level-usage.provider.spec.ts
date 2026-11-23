import { Test } from '@nestjs/testing';
import { Scope } from '@nestjs/common';
import { ControlListUsageRegistry } from '../control-lists/control-list-usage.registry';
import { OrgLevelUsageProvider } from './org-level-usage.provider';
import { OrgUnitVersionRepository } from './repositories/org-unit-version.repository';

/**
 * R-ORG-011 (design 5.8, D-ORG-10, P-3). The REAL Control Lists registry is
 * used (it is dependency-free), because "registered once" is a property of the
 * pair - the provider's guard and the registry's blind `push` - not of a mock.
 * What the database returns for the counts is proven on real rows by
 * `test/org-structure-consumers.integration-spec.ts` (KZ-017).
 */
describe('OrgLevelUsageProvider (T-04)', () => {
  let registry: ControlListUsageRegistry;
  let provider: OrgLevelUsageProvider;
  const versions = { countByLevelValueIds: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new ControlListUsageRegistry();
    provider = new OrgLevelUsageProvider(registry, versions as never);
  });

  it('registers once for `org.level` under the name the A1 `usedBy` shows', () => {
    provider.onModuleInit();

    expect(registry.getConsumerNamesForKey('org.level')).toEqual([
      'Organizational Structure › Level',
    ]);
  });

  it('two onModuleInit calls (and a second instance) still register exactly once', () => {
    provider.onModuleInit();
    provider.onModuleInit();
    new OrgLevelUsageProvider(registry, versions as never).onModuleInit();

    expect(registry.getProvidersForKey('org.level')).toHaveLength(1);
  });

  it('is registered under no other list key', () => {
    provider.onModuleInit();
    expect(registry.getProvidersForKey('kpi.unit')).toEqual([]);
  });

  it('counts VERSIONS per level value, reads absent ids as 0 through the registry, and does not double when summed', async () => {
    versions.countByLevelValueIds.mockResolvedValue([
      { level_value_id: '23', versions: '3' },
      { level_value_id: 21, versions: 1 },
    ]);
    provider.onModuleInit();
    provider.onModuleInit();

    const totals = await registry.getInUseCounts([20, 21, 23]);

    expect(versions.countByLevelValueIds).toHaveBeenCalledWith([20, 21, 23]);
    expect([...totals.entries()]).toEqual([
      [20, 0],
      [21, 1],
      [23, 3],
    ]);
  });

  it('is a singleton provider: Nest builds it without a request scope and runs its hook on bootstrap', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ControlListUsageRegistry,
        OrgLevelUsageProvider,
        { provide: OrgUnitVersionRepository, useValue: versions },
      ],
    }).compile();
    await moduleRef.init();

    const resolved = moduleRef.get(OrgLevelUsageProvider);
    expect(resolved).toBeInstanceOf(OrgLevelUsageProvider);
    expect(
      Reflect.getMetadata('scope:options', OrgLevelUsageProvider)?.scope ??
        Scope.DEFAULT,
    ).toBe(Scope.DEFAULT);
    expect(
      moduleRef.get(ControlListUsageRegistry).getProvidersForKey('org.level'),
    ).toHaveLength(1);
    await moduleRef.close();
  });
});
