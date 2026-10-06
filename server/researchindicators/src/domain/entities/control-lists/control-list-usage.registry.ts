import { Injectable } from '@nestjs/common';

/**
 * One consumer's plug-in into the in-use mechanism (design.md §5 rule 5,
 * D-CTL-3). A consumer module (e.g. `organizational-structure`) builds one
 * of these and calls `ControlListUsageRegistry.register(...)` once — no
 * change to this module is needed for a new consumer to plug in
 * (R-CTL-005).
 */
export interface ControlListUsageProvider {
  /** Shown verbatim in A1 `usedBy` (e.g. "Organizational Structure › Level"). */
  consumerName: string;
  /** The system key(s) (design.md §2 "List") this provider reads. */
  listKeys: string[];
  /**
   * Returns, for the given value ids, how many of the consumer's own
   * records reference each one. Ids with no matching record are omitted or
   * zero — both read as 0 by the caller (`getInUseCounts` below).
   */
  countByValueIds(valueIds: number[]): Promise<Record<number, number>>;
}

/**
 * Singleton registry of in-use providers (design.md §5 rule 5; A1 `usedBy`,
 * A9 `inUse`, A12's delete block). Deliberately has **no constructor
 * dependencies at all** — in particular no `CurrentUserUtil`
 * (`current-user.util.ts:7`, `Scope.REQUEST`) — so it stays a singleton
 * itself, and anything that injects it (`ControlListsService`, a future
 * consumer module) is not cascaded into request scope through THIS edge
 * (P-10, tasks.md T-04 forward pointer / disqualifier).
 */
@Injectable()
export class ControlListUsageRegistry {
  private readonly providers: ControlListUsageProvider[] = [];

  register(provider: ControlListUsageProvider): void {
    this.providers.push(provider);
  }

  getProvidersForKey(listKey: string): ControlListUsageProvider[] {
    return this.providers.filter((provider) =>
      provider.listKeys.includes(listKey),
    );
  }

  // A1 `usedBy` (D-CTL-12): consumer names of the providers that declare
  // this key — nothing stored, derived at read time.
  getConsumerNamesForKey(listKey: string): string[] {
    return this.getProvidersForKey(listKey).map(
      (provider) => provider.consumerName,
    );
  }

  // A9 `inUse` / A12's block: summed across EVERY registered provider, not
  // only the ones that happen to declare the value's own list key — a
  // provider that knows nothing about a given id simply contributes 0 for
  // it. KZ-004 disqualifier (tasks.md T-04): two providers must return
  // DIFFERENT counts (2 and 3 → 5) to prove summation, not "first provider
  // only" (falsifier 1).
  async getInUseCounts(valueIds: number[]): Promise<Map<number, number>> {
    const totals = new Map<number, number>(valueIds.map((id) => [id, 0]));
    if (valueIds.length === 0 || this.providers.length === 0) {
      return totals;
    }

    for (const provider of this.providers) {
      const counts = await provider.countByValueIds(valueIds);
      for (const id of valueIds) {
        totals.set(id, (totals.get(id) ?? 0) + (counts[id] ?? 0));
      }
    }
    return totals;
  }

  async getInUseCount(valueId: number): Promise<number> {
    const totals = await this.getInUseCounts([valueId]);
    return totals.get(valueId) ?? 0;
  }
}
