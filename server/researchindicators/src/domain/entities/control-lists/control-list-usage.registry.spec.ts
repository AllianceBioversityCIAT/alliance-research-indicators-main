import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ControlListUsageRegistry } from './control-list-usage.registry';

/**
 * T-04 (docs/specs/institutional-performance/control-lists) — the singleton
 * registry of in-use providers (design.md §5 rule 5, D-CTL-3).
 */
describe('ControlListUsageRegistry', () => {
  let registry: ControlListUsageRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControlListUsageRegistry],
    }).compile();

    registry = module.get<ControlListUsageRegistry>(ControlListUsageRegistry);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  // P-10 guard (tasks.md T-04 forward pointer / disqualifier): the registry
  // must have NO request-scoped dependency. Reflect metadata proves it has
  // NO constructor dependencies at all, so `CurrentUserUtil`
  // (`current-user.util.ts:7`, `Scope.REQUEST`) cannot be one of them.
  it('has no constructor dependencies (P-10: cannot inject the request-scoped CurrentUserUtil)', () => {
    const paramTypes: unknown[] =
      Reflect.getMetadata('design:paramtypes', ControlListUsageRegistry) ?? [];
    expect(paramTypes).toHaveLength(0);
  });

  // Default (singleton) scope proof: resolving the provider twice from the
  // SAME module instance returns the SAME object — a request-scoped
  // provider would hand back a distinct instance per resolution context.
  it('resolves to the same instance every time (default/singleton scope)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControlListUsageRegistry],
    }).compile();

    const a = module.get<ControlListUsageRegistry>(ControlListUsageRegistry);
    const b = module.get<ControlListUsageRegistry>(ControlListUsageRegistry);

    expect(a).toBe(b);
  });

  describe('getConsumerNamesForKey (A1 usedBy, D-CTL-12)', () => {
    it('returns [] for a key nothing has registered', () => {
      expect(registry.getConsumerNamesForKey('org.level')).toEqual([]);
    });

    it("returns a provider's consumer name only for the key(s) it declares", () => {
      registry.register({
        consumerName: 'Organizational Structure › Level',
        listKeys: ['org.level'],
        countByValueIds: async () => ({}),
      });

      expect(registry.getConsumerNamesForKey('org.level')).toEqual([
        'Organizational Structure › Level',
      ]);
      expect(registry.getConsumerNamesForKey('kpi.direction')).toEqual([]);
    });

    it('lists every provider that declares the same key', () => {
      registry.register({
        consumerName: 'Consumer A',
        listKeys: ['org.level'],
        countByValueIds: async () => ({}),
      });
      registry.register({
        consumerName: 'Consumer B',
        listKeys: ['org.level', 'kpi.direction'],
        countByValueIds: async () => ({}),
      });

      expect(registry.getConsumerNamesForKey('org.level')).toEqual([
        'Consumer A',
        'Consumer B',
      ]);
    });
  });

  describe('getInUseCounts / getInUseCount (A9 inUse, A12 block)', () => {
    it('returns 0 for every requested id when nothing is registered', async () => {
      const counts = await registry.getInUseCounts([1, 2]);

      expect(counts.get(1)).toBe(0);
      expect(counts.get(2)).toBe(0);
      expect(await registry.getInUseCount(1)).toBe(0);
    });

    // KZ-004 disqualifier (tasks.md T-04): two providers returning the SAME
    // number cannot tell "summed" from "first provider only". Two DIFFERENT
    // counts (2 and 3) that must sum to 5 is the fixture that falsifies
    // falsifier 1 ("make the registry return only the first provider's
    // count").
    it('sums in-use counts across two providers for the SAME value id (2 + 3 = 5)', async () => {
      registry.register({
        consumerName: 'Consumer A',
        listKeys: ['org.level'],
        countByValueIds: async () => ({ 5: 2 }),
      });
      registry.register({
        consumerName: 'Consumer B',
        listKeys: ['org.level'],
        countByValueIds: async () => ({ 5: 3 }),
      });

      const counts = await registry.getInUseCounts([5]);

      expect(counts.get(5)).toBe(5);
      expect(await registry.getInUseCount(5)).toBe(5);
    });

    it('a provider with nothing for a given id contributes 0, not an error', async () => {
      registry.register({
        consumerName: 'Consumer A',
        listKeys: ['org.level'],
        countByValueIds: async (ids) =>
          Object.fromEntries(ids.filter((id) => id === 5).map((id) => [id, 2])),
      });

      const counts = await registry.getInUseCounts([5, 6]);

      expect(counts.get(5)).toBe(2);
      expect(counts.get(6)).toBe(0);
    });

    it('returns an empty map for an empty id list without calling any provider', async () => {
      const countByValueIds = jest.fn();
      registry.register({
        consumerName: 'Consumer A',
        listKeys: ['org.level'],
        countByValueIds,
      });

      const counts = await registry.getInUseCounts([]);

      expect(counts.size).toBe(0);
      expect(countByValueIds).not.toHaveBeenCalled();
    });
  });
});
