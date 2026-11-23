/**
 * Flat A1e read → nested outline, summary counts, flattened table rows and
 * export sheets (design §2.1, §6.2, §6.4). Sibling order is natural
 * (`1.2` before `1.10`). Counts of descendants are computed here so a
 * fourth level needs no change (R-STF-002 AC.1).
 *
 * @akili-spec institutional-performance/strategy-framework T-12
 */

import { naturalCompare } from '@shared/utils/natural-compare.util';
import { XlsxExportColumn } from '@shared/utils/xlsx-export.util';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel, UsageLabel } from '@shared/interfaces/strategy-framework.interface';

export interface FrameworkOutlineNode {
  element: FrameworkEditorElement;
  children: FrameworkOutlineNode[];
  /** Descendants per depth, not including this element. */
  descendantCounts: Readonly<Record<number, number>>;
}

/**
 * One table/export row. Higher-level codes live on `<depth>Code`
 * (`1Code`, `2Code`, …) so `DataTable` can bind them as text fields (§6.4).
 */
export interface FrameworkTableRow {
  id: number;
  depth: number;
  code: string;
  name: string;
  parentCode: string;
  responsiblesText: string;
  [field: string]: string | number;
}

export interface FrameworkLevelCount {
  depth: number;
  name: string;
  pluralName: string;
  shortLabel: string;
  isIndicatorLevel: boolean;
  count: number;
}

export interface FrameworkExportSheet {
  name: string;
  columns: XlsxExportColumn<FrameworkTableRow>[];
  rows: FrameworkTableRow[];
}

interface MutableNode {
  element: FrameworkEditorElement;
  children: MutableNode[];
  descendantCounts: Record<number, number>;
}

const phrase = (count: number, name: string, pluralName: string): string => (count === 1 ? name : pluralName).toLowerCase();

const byDepth = (left: { depth: number }, right: { depth: number }): number => left.depth - right.depth;

const countDescendants = (node: MutableNode): Record<number, number> => {
  const counts: Record<number, number> = {};
  const walk = (child: MutableNode): void => {
    counts[child.element.depth] = (counts[child.element.depth] ?? 0) + 1;
    for (const grandchild of child.children) walk(grandchild);
  };
  for (const child of node.children) walk(child);
  return counts;
};

const sortTree = (nodes: MutableNode[]): void => {
  nodes.sort((left, right) => naturalCompare(left.element.code, right.element.code));
  for (const node of nodes) sortTree(node.children);
};

/** Roots of the portfolio, each subtree ordered by code. */
export function nestFramework(view: FrameworkEditorView): FrameworkOutlineNode[] {
  const nodes = new Map<number, MutableNode>();
  for (const element of view.elements) {
    nodes.set(element.id, { element, children: [], descendantCounts: {} });
  }
  const roots: MutableNode[] = [];
  for (const element of view.elements) {
    const node = nodes.get(element.id);
    if (!node) continue;
    const parent = element.parentId === null ? undefined : nodes.get(element.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  sortTree(roots);
  for (const node of nodes.values()) node.descendantCounts = countDescendants(node);
  return roots;
}

/** One entry per level, in depth order, counting elements at that depth. */
export function levelCounts(view: FrameworkEditorView): FrameworkLevelCount[] {
  return [...view.levels].sort(byDepth).map(level => ({
    depth: level.depth,
    name: level.name,
    pluralName: level.pluralName,
    shortLabel: level.shortLabel,
    isIndicatorLevel: level.isIndicatorLevel,
    count: view.elements.filter(element => element.depth === level.depth).length
  }));
}

/** "4 performance areas · 13 dimensions · 31 indicators". */
export function summaryLine(view: FrameworkEditorView): string {
  return levelCounts(view)
    .map(level => `${level.count} ${phrase(level.count, level.name, level.pluralName)}`)
    .join(' · ');
}

/**
 * Row counts: descendant levels ("6 dimensions · 18 indicators") plus each
 * registered usage whose count is greater than zero ("· 46 KPIs").
 * Level names are lowercased; usage labels are the registry's own text.
 */
export function descendantCountText(
  counts: Readonly<Record<number, number>>,
  levels: readonly FrameworkLevel[],
  usage: Readonly<Record<string, number>> = {},
  usageLabels: readonly UsageLabel[] = []
): string {
  const levelsByDepth = new Map(levels.map(level => [level.depth, level]));
  const parts: string[] = [];
  const depths = Object.keys(counts)
    .map(key => Number(key))
    .filter(depth => Number.isInteger(depth) && (counts[depth] ?? 0) > 0)
    .sort((left, right) => left - right);
  for (const depth of depths) {
    const level = levelsByDepth.get(depth);
    const count = counts[depth] ?? 0;
    if (!level || count <= 0) continue;
    parts.push(`${count} ${phrase(count, level.name, level.pluralName)}`);
  }
  for (const label of usageLabels) {
    const count = usage[label.consumerName] ?? 0;
    if (count > 0) parts.push(`${count} ${label.label}`);
  }
  return parts.join(' · ');
}

const responsiblesText = (element: FrameworkEditorElement, indicatorDepth: number | undefined): string => {
  if (indicatorDepth === undefined || element.depth !== indicatorDepth) return '';
  return (element.responsibles ?? []).map(person => (person.isActiveStaff ? person.name : `${person.name} (inactive)`)).join('; ');
};

const toRow = (
  element: FrameworkEditorElement,
  byId: ReadonlyMap<number, FrameworkEditorElement>,
  indicatorDepth: number | undefined
): FrameworkTableRow => {
  const row: FrameworkTableRow = {
    id: element.id,
    depth: element.depth,
    code: element.code,
    name: element.name,
    parentCode: '',
    responsiblesText: responsiblesText(element, indicatorDepth)
  };
  const seen = new Set<number>();
  let current = element.parentId === null ? undefined : byId.get(element.parentId);
  if (current) row.parentCode = current.code;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    row[`${current.depth}Code`] = current.code;
    row[`${current.depth}Ancestor`] = `${current.code} · ${current.name}`;
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return row;
};

/** Elements at `depth`, natural code order, with ancestor code columns filled in. */
export function tableRowsForLevel(view: FrameworkEditorView, depth: number): FrameworkTableRow[] {
  const byId = new Map(view.elements.map(element => [element.id, element]));
  const indicatorDepth = view.levels.find(level => level.isIndicatorLevel)?.depth;
  return view.elements
    .filter(element => element.depth === depth)
    .sort((left, right) => naturalCompare(left.code, right.code))
    .map(element => toRow(element, byId, indicatorDepth));
}

const sheetName = (level: FrameworkLevel): string => {
  const raw = level.pluralName.trim();
  return raw.length > 0 ? raw : `Level ${level.depth}`;
};

/**
 * Columns the level table shows. Each ancestor is `<code> · <name>`.
 * The parent is already the nearest of those columns, so Parent code is not repeated.
 * The workbook does not use this — it stays on `columnsForLevel`.
 */
export function tableColumnsForLevel(
  level: FrameworkLevel,
  levels: readonly FrameworkLevel[]
): XlsxExportColumn<FrameworkTableRow>[] {
  const columns: XlsxExportColumn<FrameworkTableRow>[] = [
    { field: 'code', header: 'Code' },
    { field: 'name', header: 'Name' }
  ];
  if (level.depth > 1) {
    for (const higher of levels.filter(item => item.depth < level.depth).sort(byDepth)) {
      columns.push({ field: `${higher.depth}Ancestor`, header: higher.name });
    }
  }
  if (level.isIndicatorLevel) columns.push({ field: 'responsiblesText', header: 'Responsibles' });
  return columns;
}

/** Workbook columns: code, name, parent code, each higher level's code, and responsibles on the indicator level. */
export function columnsForLevel(level: FrameworkLevel, levels: readonly FrameworkLevel[]): XlsxExportColumn<FrameworkTableRow>[] {
  const columns: XlsxExportColumn<FrameworkTableRow>[] = [
    { field: 'code', header: 'Code' },
    { field: 'name', header: 'Name' }
  ];
  if (level.depth > 1) {
    columns.push({ field: 'parentCode', header: 'Parent code' });
    for (const higher of levels.filter(item => item.depth < level.depth).sort(byDepth)) {
      columns.push({ field: `${higher.depth}Code`, header: `${higher.name} code` });
    }
  }
  if (level.isIndicatorLevel) columns.push({ field: 'responsiblesText', header: 'Responsibles' });
  return columns;
}

/** One sheet per level, in depth order. Rows are sorted by code. */
export function buildExportSheets(view: FrameworkEditorView): FrameworkExportSheet[] {
  const levels = [...view.levels].sort(byDepth);
  return levels.map(level => ({
    name: sheetName(level),
    columns: columnsForLevel(level, levels),
    rows: tableRowsForLevel(view, level.depth)
  }));
}
