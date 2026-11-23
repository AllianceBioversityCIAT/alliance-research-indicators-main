import 'reflect-metadata';
import { Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FrameworkUsageProvider,
  FrameworkUsageRegistry,
} from './framework-usage.registry';

describe('FrameworkUsageRegistry (design 5.6)', () => {
  const provider = (
    consumerName: string,
    elementCount: number,
    objectiveCount?: number,
  ): FrameworkUsageProvider & {
    countByElementIds: jest.Mock;
    countByObjectiveIds?: jest.Mock;
  } => {
    const row: FrameworkUsageProvider & {
      countByElementIds: jest.Mock;
      countByObjectiveIds?: jest.Mock;
    } = {
      consumerName,
      label: `${consumerName} label`,
      countByElementIds: jest.fn(async (ids: number[]) =>
        Object.fromEntries(ids.map((id) => [id, elementCount])),
      ),
    };
    if (objectiveCount !== undefined) {
      row.countByObjectiveIds = jest.fn(async (ids: number[]) =>
        Object.fromEntries(ids.map((id) => [id, objectiveCount])),
      );
    }
    return row;
  };

  it('registers a name once: the later provider replaces the earlier one', async () => {
    const registry = new FrameworkUsageRegistry();
    const first = provider('KPIs', 5);
    const second = provider('KPIs', 7);
    registry.register(first);
    registry.register(second);

    expect(registry.getConsumerNames()).toEqual(['KPIs']);
    const [row] = await registry.countElements([4]);
    expect(row.counts[4]).toBe(7);
    expect(first.countByElementIds).not.toHaveBeenCalled();
    expect(second.countByElementIds).toHaveBeenCalledTimes(1);
    expect(second.countByElementIds).toHaveBeenCalledWith([4]);
  });

  it('keeps two consumer names and does not add their counts together', async () => {
    const registry = new FrameworkUsageRegistry();
    registry.register(provider('KPIs', 2));
    registry.register(provider('Mapping', 3));

    const rows = await registry.countElements([8]);
    expect(rows).toEqual([
      { consumerName: 'KPIs', label: 'KPIs label', counts: { 8: 2 } },
      { consumerName: 'Mapping', label: 'Mapping label', counts: { 8: 3 } },
    ]);
  });

  it('calls only the counter that was asked for when a provider has both', async () => {
    const registry = new FrameworkUsageRegistry();
    const both = provider('KPIs', 2, 9);
    registry.register(both);

    expect(
      (await registry.countElements([1])).map((row) => row.counts),
    ).toEqual([{ 1: 2 }]);
    expect(both.countByObjectiveIds).not.toHaveBeenCalled();

    expect(
      (await registry.countObjectives([3])).map((row) => row.counts),
    ).toEqual([{ 3: 9 }]);
    expect(both.countByElementIds).toHaveBeenCalledTimes(1);
    expect(both.countByObjectiveIds).toHaveBeenCalledTimes(1);
    expect(both.countByObjectiveIds).toHaveBeenCalledWith([3]);
  });

  it('reads a missing id as 0 and keeps an explicit 0', async () => {
    const registry = new FrameworkUsageRegistry();
    registry.register({
      consumerName: 'KPIs',
      label: 'KPIs',
      countByElementIds: async () => ({ 1: 0 }),
    });

    const [row] = await registry.countElements([1, 2]);
    expect(row.counts).toEqual({ 1: 0, 2: 0 });
  });

  it('does not call a counter when there are no ids', async () => {
    const registry = new FrameworkUsageRegistry();
    const row = provider('KPIs', 4, 4);
    registry.register(row);

    expect(await registry.countElements([])).toEqual([
      { consumerName: 'KPIs', label: 'KPIs label', counts: {} },
    ]);
    expect(row.countByElementIds).not.toHaveBeenCalled();
  });

  it('rejects a provider that counts neither elements nor objectives', () => {
    const registry = new FrameworkUsageRegistry();
    expect(() =>
      registry.register({ consumerName: 'KPIs', label: 'KPIs' }),
    ).toThrow(/must count elements or objectives/);
    expect(registry.getConsumerNames()).toEqual([]);
  });

  it('elementLabels lists only providers that count elements, under their label', () => {
    const registry = new FrameworkUsageRegistry();
    registry.register({
      consumerName: 'kpi.records',
      label: 'KPIs',
      countByElementIds: async () => ({}),
    });
    registry.register({
      consumerName: 'dashboards',
      label: 'Dashboards',
      countByObjectiveIds: async () => ({}),
    });

    expect(registry.elementLabels()).toEqual([
      { consumerName: 'kpi.records', label: 'KPIs' },
    ]);
  });

  it('is a singleton with no constructor dependencies and instantiates outside a request', async () => {
    expect(
      Reflect.getMetadata('design:paramtypes', FrameworkUsageRegistry) ?? [],
    ).toHaveLength(0);
    expect(
      Reflect.getMetadata('scope:options', FrameworkUsageRegistry)?.scope ??
        Scope.DEFAULT,
    ).toBe(Scope.DEFAULT);

    const moduleRef = await Test.createTestingModule({
      providers: [FrameworkUsageRegistry],
    }).compile();
    const first = moduleRef.get(FrameworkUsageRegistry);
    const second = moduleRef.get(FrameworkUsageRegistry);
    expect(first).toBe(second);
    await moduleRef.close();
  });
});
