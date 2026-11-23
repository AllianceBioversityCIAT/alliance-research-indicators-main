/**
 * Labels and indicator options for the Institutional Objectives page (design §6.6).
 * Year text is "YYYY · N objectives". Carry-forward toast uses the server's
 * copied count (R-STF-010). Linked indicators are "code name", one per line.
 *
 * @akili-spec institutional-performance/strategy-framework T-16
 */

import { CarryForwardObjectivesResult, FrameworkElement, FrameworkView } from '@shared/interfaces/strategy-framework.interface';
import { naturalCompare } from '@shared/utils/natural-compare.util';

export interface IndicatorOption {
  label: string;
  value: number;
}

export interface IndicatorGroup {
  label: string;
  items: IndicatorOption[];
}

export function objectiveYearLabel(year: number, count: number): string {
  return `${year} · ${count} ${count === 1 ? 'objective' : 'objectives'}`;
}

/** Exact toast detail. Singular only when the server copied one row (D-STF-27's N = 1 rule). */
export function carryForwardMessage(result: CarryForwardObjectivesResult): string {
  const noun = result.copied === 1 ? 'objective' : 'objectives';
  return `${result.copied} ${noun} copied to ${result.toYear}; ${result.fromYear} is unchanged`;
}

/** One indicator per line so the table cell can wrap without a horizontal scroll (T-17). */
export function linkedIndicatorsText(elements: readonly { code: string; name: string }[]): string {
  return elements.map(element => `${element.code} ${element.name}`).join('\n');
}

/**
 * Indicator-level elements only, as `code · name`, grouped by their depth-1 ancestor.
 * Areas and dimensions are group labels, never options.
 */
export function indicatorGroups(view: FrameworkView | null): IndicatorGroup[] {
  if (!view) return [];
  const indicatorDepth = view.levels.find(level => level.isIndicatorLevel)?.depth;
  if (indicatorDepth === undefined) return [];
  const byId = new Map(view.elements.map(element => [element.id, element]));
  const groups = new Map<number, IndicatorGroup>();
  const ungrouped: IndicatorOption[] = [];

  for (const element of view.elements) {
    if (element.depth !== indicatorDepth) continue;
    const option: IndicatorOption = { label: `${element.code} · ${element.name}`, value: element.id };
    const ancestor = depthOneAncestor(element, byId);
    if (!ancestor) {
      ungrouped.push(option);
      continue;
    }
    const existing = groups.get(ancestor.id);
    if (existing) {
      existing.items.push(option);
      continue;
    }
    groups.set(ancestor.id, {
      label: `${ancestor.code} · ${ancestor.name}`,
      items: [option]
    });
  }

  const sorted = [...groups.values()].sort((left, right) => naturalCompare(left.label, right.label));
  for (const group of sorted) group.items.sort((left, right) => naturalCompare(left.label, right.label));
  if (ungrouped.length > 0) {
    ungrouped.sort((left, right) => naturalCompare(left.label, right.label));
    sorted.push({ label: 'Indicators', items: ungrouped });
  }
  return sorted;
}

function depthOneAncestor(element: FrameworkElement, byId: Map<number, FrameworkElement>): FrameworkElement | null {
  let current: FrameworkElement | undefined = element;
  const seen = new Set<number>();
  while (current && current.depth !== 1) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    if (current.parentId === null) return null;
    current = byId.get(current.parentId);
  }
  return current?.depth === 1 ? current : null;
}
