import { OrgStructureReadService } from '../../src/domain/entities/organizational-structure/org-structure-read.service';
import { OrgUnitUsageRegistry } from '../../src/domain/entities/organizational-structure/org-unit-usage.registry';

/**
 * A reusable TEST CONSUMER of the Organizational Structure read contract
 * (docs/specs/institutional-performance/organizational-structure, R-ORG-010
 * AC.2, T-04). It behaves the way a real consumer (a KPI module) is meant to:
 *
 *  - it stores ONLY the permanent entry id next to each value and the value's
 *    year (R-ORG-010: "a consumer stores the entry's permanent ID and nothing
 *    else from it");
 *  - it reports how many of its records use each entry through
 *    `OrgUnitUsageRegistry.register` (drives *Linked data* and the delete block);
 *  - it rolls its values up by an ancestor level by asking `ancestors` for the
 *    VALUE'S OWN year, never rewriting a stored value (the "KPI history
 *    continues through a move" scenario).
 *
 * Nothing here touches the database: the entries live in the suite's fixtures,
 * and the consumer's own records live in memory, so there is nothing of the
 * consumer's to clean up.
 */
export interface TestConsumerValue {
  unitId: number;
  year: number;
  value: number;
}

export class OrgTestConsumer {
  readonly values: TestConsumerValue[] = [];
  /** Forces a record count without values (a plain "this many records use the entry"). */
  private readonly forcedCounts = new Map<number, number>();

  constructor(readonly consumerName = 'Test consumer') {}

  add(unitId: number, year: number, value: number): void {
    this.values.push({ unitId, year, value });
  }

  setCount(unitId: number, count: number): void {
    this.forcedCounts.set(unitId, count);
  }

  count(unitId: number): number {
    return (
      (this.forcedCounts.get(unitId) ?? 0) +
      this.values.filter((v) => v.unitId === unitId).length
    );
  }

  register(registry: OrgUnitUsageRegistry): void {
    registry.register({
      consumerName: this.consumerName,
      countByUnitIds: async (ids) =>
        Object.fromEntries(ids.map((id) => [id, this.count(id)])),
    });
  }

  /** One series per entry: the stored values for the entry, ordered by year, exactly as stored. */
  series(unitId: number): TestConsumerValue[] {
    return this.values
      .filter((v) => v.unitId === unitId)
      .sort((a, b) => a.year - b.year);
  }

  /**
   * Roll-up by the ancestor whose level is `levelId`, resolved for each value's
   * year. Returns `{ ancestorId: { year: total } }` as sorted pairs so a test
   * can compare it exactly.
   */
  async rollUpByLevel(
    read: OrgStructureReadService,
    levelId: number,
  ): Promise<Record<number, Array<[number, number]>>> {
    const out: Record<number, Map<number, number>> = {};
    for (const stored of this.values) {
      const chain = await read.ancestors(stored.unitId, stored.year);
      const group = chain.find((node) => node.levelId === levelId);
      if (!group) continue;
      const years = (out[group.id] ??= new Map<number, number>());
      years.set(stored.year, (years.get(stored.year) ?? 0) + stored.value);
    }
    return Object.fromEntries(
      Object.entries(out).map(([id, years]) => [
        id,
        [...years.entries()].sort((a, b) => a[0] - b[0]),
      ]),
    );
  }
}
