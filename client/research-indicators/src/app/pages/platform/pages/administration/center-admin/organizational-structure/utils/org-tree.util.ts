import { TreeNode } from 'primeng/api';
import { OrgLevelCode, OrgStaffRef, OrgTableRow, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { naturalCompare } from '@shared/utils/natural-compare.util';

// @akili-spec institutional-performance/organizational-structure T-01 (client half) — design §2.1, §6.3,
// §6.4; requirements R-ORG-006, R-ORG-013, R-ORG-014. Pure functions: no I/O, no Angular.

export const ORG_LEVEL_LABELS: Record<OrgLevelCode, string> = {
  L1: 'Division',
  L2: 'Department',
  L3: 'Office',
  L4: 'Unit'
};

/** What a tree node carries in `data` (the `p-treeTable` row reads everything from here). */
export interface OrgTreeNodeData {
  row: OrgYearViewRow;
  /** Leaf units under the node (the *N units* label of a container row); 0 on a leaf. */
  unitCount: number;
  /** Set when the entry ended on or before the viewed year (shown only with *Show inactive / deleted*). */
  ended: boolean;
}

export type OrgLevelCounts = Record<OrgLevelCode, number>;

/** An entry ended on or before `year`: *Inactive (from Y)* / *Deleted (from Y)* territory (R-ORG-006). */
export function isEndedInYear(row: OrgYearViewRow, year: number): boolean {
  return row.status !== 'active' && row.statusFromYear !== null && row.statusFromYear <= year;
}

/** Ended entries are dropped unless *Show inactive / deleted* is on (R-ORG-006 AC.2). */
export function visibleRows(rows: OrgYearViewRow[], year: number, includeEnded: boolean): OrgYearViewRow[] {
  return includeEnded ? rows : rows.filter(row => !isEndedInYear(row, year));
}

/** The *Inactive (from Y)* / *Deleted (from Y)* badge text, or `null` for an entry that is live in `year`. */
export function endedBadge(row: OrgYearViewRow, year: number): string | null {
  if (!isEndedInYear(row, year)) return null;
  return `${row.status === 'deleted' ? 'Deleted' : 'Inactive'} (from ${row.statusFromYear})`;
}

/** The *Change scheduled in Y* badge text (R-ORG-006 AC.3), or `null`. */
export function scheduledBadge(row: OrgYearViewRow): string | null {
  return row.scheduledFromYear === null ? null : `Change scheduled in ${row.scheduledFromYear}`;
}

/** Divisions · Departments · Offices · Units for the count chips, over the rows actually shown. */
export function countByLevel(rows: OrgYearViewRow[]): OrgLevelCounts {
  const counts: OrgLevelCounts = { L1: 0, L2: 0, L3: 0, L4: 0 };
  for (const row of rows) counts[row.version.levelCode] += 1;
  return counts;
}

/**
 * Nests the flat year view by `version.parentId`. A row whose parent is not in the shown set (a
 * root, or an orphan whose parent is hidden) becomes a root. Siblings are in natural code order.
 * An L4 under an L2 nests directly (the Office level is optional).
 */
export function buildOrgTree(rows: OrgYearViewRow[], year: number, includeEnded: boolean): TreeNode<OrgTreeNodeData>[] {
  const shown = visibleRows(rows, year, includeEnded);
  const nodes = new Map<number, TreeNode<OrgTreeNodeData>>();
  for (const row of shown) {
    nodes.set(row.id, {
      key: String(row.id),
      data: { row, unitCount: 0, ended: isEndedInYear(row, year) },
      children: [],
      expanded: row.version.levelCode === 'L1',
      leaf: true
    });
  }

  const roots: TreeNode<OrgTreeNodeData>[] = [];
  for (const row of shown) {
    const node = nodes.get(row.id) as TreeNode<OrgTreeNodeData>;
    const parent = row.version.parentId === null ? undefined : nodes.get(row.version.parentId);
    if (parent) {
      (parent.children as TreeNode<OrgTreeNodeData>[]).push(node);
      parent.leaf = false;
    } else {
      roots.push(node);
    }
  }

  const byCode = (a: TreeNode<OrgTreeNodeData>, b: TreeNode<OrgTreeNodeData>) =>
    naturalCompare((a.data as OrgTreeNodeData).row.code, (b.data as OrgTreeNodeData).row.code);
  const settle = (list: TreeNode<OrgTreeNodeData>[]): number => {
    list.sort(byCode);
    let leaves = 0;
    for (const node of list) {
      const children = node.children as TreeNode<OrgTreeNodeData>[];
      if (children.length === 0) {
        leaves += 1;
        continue;
      }
      const below = settle(children);
      (node.data as OrgTreeNodeData).unitCount = below;
      leaves += below;
    }
    return leaves;
  };
  settle(roots);
  return roots;
}

function staffLabel(staff: OrgStaffRef): string {
  const name = staff.name ?? staff.carnet;
  return staff.isActiveStaff ? name : `${name} (Inactive staff)`;
}

function statusLabel(row: OrgYearViewRow, year: number): string {
  const ended = endedBadge(row, year);
  const scheduled = scheduledBadge(row);
  return [ended ?? 'Active', scheduled].filter(Boolean).join(' · ');
}

/** Flattens year-view rows into the display strings `DataTable` needs (R-ORG-014, P-7). */
export function toTableRows(rows: OrgYearViewRow[], year: number, includeEnded: boolean): OrgTableRow[] {
  return visibleRows(rows, year, includeEnded).map(row => {
    const v = row.version;
    return {
      id: String(row.id),
      code: row.code,
      level: `${v.levelCode} ${ORG_LEVEL_LABELS[v.levelCode]}`,
      name: v.name,
      acronym: v.acronym ?? '',
      parent: v.parentCode ? `${v.parentCode} ${v.parentName ?? ''}`.trim() : '',
      director: v.director ? staffLabel(v.director) : '',
      delegates: row.delegates.map(staffLabel).join('; '),
      status: statusLabel(row, year),
      since: String(v.from)
    };
  });
}
