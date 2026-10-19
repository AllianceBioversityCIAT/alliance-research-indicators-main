import { Injectable } from '@nestjs/common';

/**
 * One consumer's plug-in into the in-use mechanism for organizational units
 * (design 2.1, 5.8, R-ORG-010). A consumer module registers one of these and
 * reports how many of ITS records reference each unit id.
 */
export interface OrgUnitUsageProvider {
  /** Shown to admins in the delete block and in *Linked data* (T-04). */
  consumerName: string;
  /** For the given unit ids, how many of the consumer's records use each one. Missing ids read as 0. */
  countByUnitIds(unitIds: number[]): Promise<Record<number, number>>;
}

/**
 * Singleton registry of unit-usage providers. Deliberately has NO constructor
 * dependencies (no `CurrentUserUtil`, which is request-scoped), so any consumer
 * module can inject it without being pulled into request scope (design 2.1).
 *
 * DEDUPLICATED BY `consumerName` (D-ORG-10): the Control Lists registry pushes
 * blindly, so a provider registered twice doubled every count (control-lists
 * F-4). Registering a name again replaces the earlier provider, so the count of
 * that consumer is taken once, whatever the number of registrations.
 *
 * @akili-spec institutional-performance/organizational-structure
 */
@Injectable()
export class OrgUnitUsageRegistry {
  private readonly providers = new Map<string, OrgUnitUsageProvider>();

  register(provider: OrgUnitUsageProvider): void {
    this.providers.set(provider.consumerName, provider);
  }

  getConsumerNames(): string[] {
    return [...this.providers.keys()];
  }

  /** Per consumer, how many records use the unit; consumers reporting 0 are left out. */
  async getBreakdown(
    unitId: number,
  ): Promise<Array<{ consumer: string; count: number }>> {
    const rows: Array<{ consumer: string; count: number }> = [];
    for (const provider of this.providers.values()) {
      const counts = await provider.countByUnitIds([unitId]);
      const count = Number(counts[unitId] ?? 0);
      if (count > 0) rows.push({ consumer: provider.consumerName, count });
    }
    return rows;
  }

  /** Sum over every registered consumer (the delete blocker, design 5.5). */
  async getCount(unitId: number): Promise<number> {
    const rows = await this.getBreakdown(unitId);
    return rows.reduce((total, row) => total + row.count, 0);
  }
}
