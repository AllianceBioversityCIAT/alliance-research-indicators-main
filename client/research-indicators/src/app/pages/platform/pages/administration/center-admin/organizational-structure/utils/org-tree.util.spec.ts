import { OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { row, staff } from '../../../../../../../testing/org-structure.fixture';
import { buildOrgTree, countByLevel, endedBadge, scheduledBadge, toTableRows, visibleRows } from './org-tree.util';

// @akili-spec institutional-performance/organizational-structure T-01 (client half) — R-ORG-006, R-ORG-013, R-ORG-014.
describe('org-tree.util', () => {
  // L1 > L2 > L3 > L4, an L4 directly under an L2 (Office optional), a second L2 with no children,
  // and an L2 that ended in 2027.
  const rows: OrgYearViewRow[] = [
    row({ id: 10, code: 'ORG-10', levelCode: 'L1', name: 'Division A' }),
    row({ id: 2, code: 'ORG-2', levelCode: 'L2', name: 'Department One', parentId: 10 }),
    row({ id: 3, code: 'ORG-3', levelCode: 'L3', name: 'Office', parentId: 2 }),
    row({ id: 4, code: 'ORG-4', levelCode: 'L4', name: 'Unit under office', parentId: 3 }),
    row({ id: 5, code: 'ORG-5', levelCode: 'L4', name: 'Unit directly under L2', parentId: 2 }),
    row({ id: 6, code: 'ORG-6', levelCode: 'L2', name: 'Department Two', parentId: 10 }),
    row({ id: 7, code: 'ORG-7', levelCode: 'L2', name: 'Ended Department', parentId: 10, status: 'deleted', statusFromYear: 2027 })
  ];

  it('nests by parent, orders siblings by natural code and counts the units under a container', () => {
    const tree = buildOrgTree(rows, 2027, false);

    expect(tree.map(n => n.data?.row.code)).toEqual(['ORG-10']);
    const division = tree[0];
    // ORG-2 before ORG-6: natural order. The ended ORG-7 is not here (filter off).
    expect(division.children?.map(n => n.data?.row.code)).toEqual(['ORG-2', 'ORG-6']);
    // ORG-2 holds two units (one via the Office, one directly); ORG-6 is a leaf container of 0; the division sums leaves.
    const dept = division.children?.[0];
    expect(dept?.data?.unitCount).toBe(2);
    expect(division.data?.unitCount).toBe(3);
    expect(division.children?.[1].data?.unitCount).toBe(0);
  });

  it('orders siblings in NATURAL code order: ORG-2 before ORG-10', () => {
    const siblings = [
      row({ id: 1, code: 'ORG-1', levelCode: 'L1', name: 'Root' }),
      row({ id: 11, code: 'ORG-10', levelCode: 'L2', name: 'Ten', parentId: 1 }),
      row({ id: 12, code: 'ORG-2', levelCode: 'L2', name: 'Two', parentId: 1 })
    ];

    expect(buildOrgTree(siblings, 2026, false)[0].children?.map(n => n.data?.row.code)).toEqual(['ORG-2', 'ORG-10']);
  });

  it('puts an L4 directly under an L2', () => {
    const tree = buildOrgTree(rows, 2027, false);
    const dept = tree[0].children?.[0];

    expect(dept?.children?.map(n => `${n.data?.row.version.levelCode}:${n.data?.row.code}`)).toEqual(['L3:ORG-3', 'L4:ORG-5']);
  });

  it('includes an ended entry only with the filter, and marks it ended', () => {
    const without = buildOrgTree(rows, 2027, false)[0].children?.map(n => n.data?.row.code);
    const withEnded = buildOrgTree(rows, 2027, true)[0].children?.map(n => ({ code: n.data?.row.code, ended: n.data?.ended }));

    expect(without).not.toContain('ORG-7');
    expect(withEnded).toEqual([
      { code: 'ORG-2', ended: false },
      { code: 'ORG-6', ended: false },
      { code: 'ORG-7', ended: true }
    ]);
  });

  it('keeps an entry that ends in a LATER year in the earlier year view (R-ORG-006 AC.2)', () => {
    expect(visibleRows(rows, 2026, false).map(r => r.code)).toContain('ORG-7');
    expect(visibleRows(rows, 2027, false).map(r => r.code)).not.toContain('ORG-7');
    expect(endedBadge(rows[6], 2026)).toBeNull();
    expect(endedBadge(rows[6], 2027)).toBe('Deleted (from 2027)');
  });

  it('badges inactive and scheduled entries', () => {
    const inactive = row({ id: 1, code: 'ORG-1', levelCode: 'L4', name: 'x', status: 'inactive', statusFromYear: 2026, scheduledFromYear: 2028 });

    expect(endedBadge(inactive, 2026)).toBe('Inactive (from 2026)');
    expect(scheduledBadge(inactive)).toBe('Change scheduled in 2028');
    expect(scheduledBadge(rows[0])).toBeNull();
  });

  it('treats a parent that is hidden as absent: the child becomes a root', () => {
    const tree = buildOrgTree([rows[1]], 2027, false);

    expect(tree.map(n => n.data?.row.code)).toEqual(['ORG-2']);
  });

  it('counts per level over the rows given', () => {
    expect(countByLevel(visibleRows(rows, 2027, false))).toEqual({ L1: 1, L2: 2, L3: 1, L4: 2 });
  });

  it('flattens rows to display strings, current delegates joined and inactive staff marked', () => {
    const data = [
      row({
        id: 2,
        code: 'ORG-2',
        levelCode: 'L2',
        name: 'Dept',
        acronym: 'DPT',
        parentId: 10,
        parentCode: 'ORG-10',
        parentName: 'Division A',
        director: staff('C1', 'Ana Director', false),
        delegates: [staff('C2', 'Beto One'), staff('C3', 'Cira Two', false)],
        from: 2026
      })
    ];

    expect(toTableRows(data, 2026, false)).toEqual([
      {
        id: '2',
        code: 'ORG-2',
        level: 'L2 Department',
        name: 'Dept',
        acronym: 'DPT',
        parent: 'ORG-10 Division A',
        director: 'Ana Director (Inactive staff)',
        delegates: 'Beto One; Cira Two (Inactive staff)',
        status: 'Active',
        since: '2026'
      }
    ]);
  });
});
