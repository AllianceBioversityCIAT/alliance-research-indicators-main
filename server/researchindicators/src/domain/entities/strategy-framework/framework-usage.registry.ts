import { Injectable } from '@nestjs/common';

/**
 * One later module's plug-in (design 5.6, R-STF-012). At least one counter.
 * `label` is what the editor shows (for example *KPIs*); `consumerName` is
 * the dedup key and the name in a delete way-out.
 */
export interface FrameworkUsageProvider {
  consumerName: string;
  label: string;
  countByElementIds?(ids: number[]): Promise<Record<number, number>>;
  countByObjectiveIds?(ids: number[]): Promise<Record<number, number>>;
}

export interface FrameworkUsageCount {
  consumerName: string;
  label: string;
  /** Every requested id is present. A missing id from the provider is 0. */
  counts: Record<number, number>;
}

/**
 * Singleton registry (design 2.1, D-STF-1). No constructor dependencies, so
 * it cannot be pulled into request scope. Deduplicated by `consumerName`:
 * registering a name again replaces the earlier provider (D-ORG-10 parity).
 *
 * @akili-spec institutional-performance/strategy-framework
 */
@Injectable()
export class FrameworkUsageRegistry {
  private readonly providers = new Map<string, FrameworkUsageProvider>();

  register(provider: FrameworkUsageProvider): void {
    const countsElements = typeof provider.countByElementIds === 'function';
    const countsObjectives = typeof provider.countByObjectiveIds === 'function';
    if (!countsElements && !countsObjectives) {
      throw new Error(
        `usage provider ${provider.consumerName} must count elements or objectives`,
      );
    }
    this.providers.set(provider.consumerName, provider);
  }

  getConsumerNames(): string[] {
    return [...this.providers.keys()];
  }

  /** Labels of providers that count elements, in registration order. */
  elementLabels(): Array<{ consumerName: string; label: string }> {
    return [...this.providers.values()]
      .filter((provider) => typeof provider.countByElementIds === 'function')
      .map((provider) => ({
        consumerName: provider.consumerName,
        label: provider.label,
      }));
  }

  countElements(ids: number[]): Promise<FrameworkUsageCount[]> {
    return this.count('countByElementIds', ids);
  }

  countObjectives(ids: number[]): Promise<FrameworkUsageCount[]> {
    return this.count('countByObjectiveIds', ids);
  }

  private async count(
    kind: 'countByElementIds' | 'countByObjectiveIds',
    ids: number[],
  ): Promise<FrameworkUsageCount[]> {
    const rows: FrameworkUsageCount[] = [];
    for (const provider of this.providers.values()) {
      const counter = provider[kind];
      if (typeof counter !== 'function') continue;
      const raw = ids.length === 0 ? {} : await counter.call(provider, ids);
      const counts: Record<number, number> = {};
      for (const id of ids) counts[id] = Number(raw?.[id] ?? 0);
      rows.push({
        consumerName: provider.consumerName,
        label: provider.label,
        counts,
      });
    }
    return rows;
  }
}
