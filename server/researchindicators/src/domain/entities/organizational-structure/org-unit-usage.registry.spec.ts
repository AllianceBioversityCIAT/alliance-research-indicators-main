import { OrgUnitUsageRegistry } from './org-unit-usage.registry';

describe('OrgUnitUsageRegistry (D-ORG-10)', () => {
  const provider = (consumerName: string, count: number) => ({
    consumerName,
    countByUnitIds: jest.fn(async (ids: number[]) =>
      Object.fromEntries(ids.map((id) => [id, count])),
    ),
  });

  it('registering the same consumer name twice counts it once', async () => {
    const registry = new OrgUnitUsageRegistry();
    registry.register(provider('KPI values', 5));
    registry.register(provider('KPI values', 5));

    expect(registry.getConsumerNames()).toEqual(['KPI values']);
    expect(await registry.getCount(57)).toBe(5);
  });

  it('two different consumers are summed (2 + 3 = 5), not first-only', async () => {
    const registry = new OrgUnitUsageRegistry();
    registry.register(provider('A', 2));
    registry.register(provider('B', 3));

    expect(await registry.getCount(57)).toBe(5);
    expect(await registry.getBreakdown(57)).toEqual([
      { consumer: 'A', count: 2 },
      { consumer: 'B', count: 3 },
    ]);
  });

  it('the later registration of a name replaces the earlier one', async () => {
    const registry = new OrgUnitUsageRegistry();
    registry.register(provider('A', 2));
    registry.register(provider('A', 7));
    expect(await registry.getCount(1)).toBe(7);
  });

  it('with no consumer registered the count is 0 and the breakdown is empty', async () => {
    const registry = new OrgUnitUsageRegistry();
    expect(await registry.getCount(1)).toBe(0);
    expect(await registry.getBreakdown(1)).toEqual([]);
  });

  it('a consumer reporting 0 or omitting the id is left out of the breakdown', async () => {
    const registry = new OrgUnitUsageRegistry();
    registry.register(provider('Zero', 0));
    registry.register({
      consumerName: 'Omits',
      countByUnitIds: async () => ({}),
    });
    expect(await registry.getBreakdown(9)).toEqual([]);
  });
});
