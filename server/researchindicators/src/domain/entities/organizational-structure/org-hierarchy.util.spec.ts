import {
  describeChildLevelConflicts,
  findChildLevelConflicts,
  findHierarchyViolation,
  GraphVersion,
} from './org-hierarchy.util';

const L1 = 20;
const L2 = 21;
const L3 = 22;
const L4 = 23;

const gv = (
  unitId: number,
  levelId: number,
  parentId: number | null,
  from = 2026,
  to: number | null = null,
): GraphVersion => ({ unitId, levelId, parentId, from, to });

describe('findHierarchyViolation (R-ORG-003, design 5.3)', () => {
  // Structure: 1 = L1 (open), 2 = L2 under 1, 3 = L3 under 2.
  const base = [gv(1, L1, null), gv(2, L2, 1), gv(3, L3, 2)];
  const check = (
    version: GraphVersion[],
    others = base,
    fromYear = 2026,
    unitId = 9,
  ) => findHierarchyViolation({ unitId, versions: version, others, fromYear });

  describe('parent level rules, each with an allowed and a rejected case', () => {
    it.each([
      ['L1 without a parent', L1, null],
      ['L2 under an L1', L2, 1],
      ['L3 under an L2', L3, 2],
      ['L4 under an L3 (office)', L4, 3],
      ['L4 directly under an L2 (department)', L4, 2],
    ])('allows %s', (_label, level, parent) => {
      expect(check([gv(9, level, parent)])).toBeNull();
    });

    it.each([
      ['L1 with a parent', L1, 2, /cannot have a parent/],
      ['L2 under an L2', L2, 2, /cannot sit under a L2/],
      ['L3 under an L1', L3, 1, /cannot sit under a L1/],
      ['L4 under an L1', L4, 1, /cannot sit under a L1/],
      ['L2 with no parent', L2, null, /needs a parent/],
    ])('rejects %s naming `parent`', (_label, level, parent, text) => {
      const violation = check([gv(9, level, parent)]);
      expect(violation?.field).toBe('parent');
      expect(violation?.description).toMatch(text);
    });

    it('rejects a level outside the four seeded ids, naming `level`', () => {
      expect(check([gv(9, 24, 2)])).toMatchObject({ field: 'level' });
    });
  });

  describe('parent active in every covered year (I-3)', () => {
    const parentEnding = [gv(1, L1, null), gv(2, L2, 1, 2026, 2028)];

    it('rejects a version that outlives its parent and names the years', () => {
      const v = check([gv(9, L3, 2, 2029)], parentEnding, 2029);
      expect(v?.field).toBe('parent');
      expect(v?.description).toContain('2029 onward');
    });

    it('names a bounded gap as a range', () => {
      const v = check([gv(9, L3, 2, 2026, 2031)], parentEnding, 2026);
      expect(v?.description).toContain('2028-2030');
    });

    it('allows a bounded version inside the parent life', () => {
      expect(check([gv(9, L3, 2, 2026, 2028)], parentEnding)).toBeNull();
    });

    it('rejects a parent that starts later than the child', () => {
      const v = check(
        [gv(9, L3, 2, 2026)],
        [gv(1, L1, null), gv(2, L2, 1, 2027)],
      );
      expect(v?.description).toContain('2026');
    });

    it('does not re-validate history before the first changed year', () => {
      // the [2024, 2026) half sits under a parent that did not exist then; only 2026 onward is checked
      const versions = [gv(9, L3, 2, 2024, 2026), gv(9, L3, 2, 2026)];
      expect(check(versions, base, 2026)).toBeNull();
    });
  });

  describe('cycles over every boundary year (I-4)', () => {
    it('rejects a cycle in the year the change applies from', () => {
      // Stored: P (3) is an L3 whose parent is E (9) (stale edge, E was an L2 when it was saved).
      // E is saved from 2027 as an L4 under P: both levels are valid for E's own version.
      const others = [gv(1, L1, null), gv(3, L3, 9, 2026)];
      const v = check([gv(9, L4, 3, 2027)], others, 2027);
      expect(v?.field).toBe('parent');
      expect(v?.description).toContain('from 2027');
      expect(v?.description).toContain('cycle');
    });

    it('rejects a cycle that exists ONLY in a scheduled 2029 version, saving from 2027', () => {
      // P (3) is L3 under M (2) until 2029, then under E (9). E (9) is saved from 2027 as an
      // L4 under P: levels are valid for every version of E, and the loop exists only from 2029.
      const others = [
        gv(1, L1, null),
        gv(2, L2, 1),
        gv(3, L3, 2, 2026, 2029),
        gv(3, L3, 9, 2029, null),
      ];
      const versions = [gv(9, L4, 2, 2026, 2027), gv(9, L4, 3, 2027)];
      const v = check(versions, others, 2027);
      expect(v?.field).toBe('parent');
      expect(v?.description).toContain('2029');
      expect(v?.description).toContain('cycle');
    });

    it('is accepted when the same entry is not looped in any year', () => {
      const others = [gv(1, L1, null), gv(2, L2, 1), gv(3, L3, 2)];
      expect(check([gv(9, L4, 3, 2027)], others, 2027)).toBeNull();
    });
  });
});

describe('findChildLevelConflicts (I-3 for children, R-ORG-003)', () => {
  const run = (
    versions: GraphVersion[],
    others: GraphVersion[],
    fromYear = 2026,
  ) => findChildLevelConflicts({ unitId: 2, versions, others, fromYear });

  it('allows a level change every child still accepts (L2 -> L2, L3 child; L2 with L4 child)', () => {
    expect(run([gv(2, L2, 1)], [gv(3, L3, 2), gv(4, L4, 2)])).toEqual([]);
  });

  it('rejects L2 -> L1 with an L3 child, naming the child and the years', () => {
    const conflicts = run([gv(2, L1, null)], [gv(3, L3, 2)]);
    expect(conflicts).toEqual([{ childId: 3, from: 2026, to: null }]);
    expect(
      describeChildLevelConflicts(conflicts, (id) => `ORG-00${id}`, L1),
    ).toContain('ORG-003 (2026 onward)');
  });

  it('rejects an L3 made an L4 while it has an L4 child (L4 under L4)', () => {
    expect(run([gv(2, L4, 1)], [gv(3, L4, 2)])).toHaveLength(1);
  });

  it('only the overlapping years conflict: the new level starts in 2028, the child lives 2026-2030', () => {
    const conflicts = run(
      [gv(2, L2, 1, 2026, 2028), gv(2, L1, null, 2028)],
      [gv(3, L3, 2, 2026, 2030)],
      2028,
    );
    expect(conflicts).toEqual([{ childId: 3, from: 2028, to: 2030 }]);
  });

  it('ignores a child that ended before the first changed year and children of other entries', () => {
    expect(run([gv(2, L1, null)], [gv(3, L3, 2, 2024, 2026)])).toEqual([]);
    expect(run([gv(2, L1, null)], [gv(3, L3, 7)])).toEqual([]);
  });
});
