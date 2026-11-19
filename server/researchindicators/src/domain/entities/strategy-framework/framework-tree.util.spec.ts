import {
  ancestorChain,
  buildTree,
  createDepthViolation,
  descendantCounts,
  findCycle,
  moveViolation,
  TreeElement,
} from './framework-tree.util';

const el = (
  id: number,
  parentId: number | null,
  depth: number,
  code: string,
): TreeElement => ({ id, parentId, depth, code });

/**
 * Four levels. Depth 4 is present only so this fixture is not a three-level
 * tree (R-STF-002 AC.1). Counts are literals, not recomputed.
 *
 * 1 Area
 *   2 Dimension 1.1
 *     3 Indicator 1.1.1
 *       4 fourth 1.1.1.1
 *       5 fourth 1.1.1.2
 *     6 Indicator 1.1.2
 *   7 Dimension 1.2
 * 8 Area (no children)
 */
const fourLevels: TreeElement[] = [
  el(1, null, 1, '1'),
  el(2, 1, 2, '1.1'),
  el(3, 2, 3, '1.1.1'),
  el(4, 3, 4, '1.1.1.1'),
  el(5, 3, 4, '1.1.1.2'),
  el(6, 2, 3, '1.1.2'),
  el(7, 1, 2, '1.2'),
  el(8, null, 1, '2'),
];

describe('buildTree / descendant counts / ancestors (design 5.2, R-STF-002 AC.1, R-STF-003)', () => {
  const tree = buildTree(fourLevels);

  it('nests the portfolio and keeps a fourth level as data', () => {
    expect(tree.roots).toEqual([1, 8]);
    expect(tree.byId.get(1)?.childIds).toEqual([2, 7]);
    expect(tree.byId.get(2)?.childIds).toEqual([3, 6]);
    expect(tree.byId.get(3)?.childIds).toEqual([4, 5]);
    expect(tree.byId.get(8)?.childIds).toEqual([]);
  });

  it.each([
    ['area 1', 1, { 2: 2, 3: 2, 4: 2 }],
    ['dimension 1.1', 2, { 3: 2, 4: 2 }],
    ['indicator 1.1.1', 3, { 4: 2 }],
    ['a fourth-level leaf', 4, {}],
    ['an empty area', 8, {}],
  ])('counts descendants of %s by depth', (_label, id, expected) => {
    expect(descendantCounts(tree, id as number)).toEqual(expected);
  });

  it('walks the ancestor chain from the parent up to the root', () => {
    expect(ancestorChain(tree, 4)).toEqual([3, 2, 1]);
    expect(ancestorChain(tree, 6)).toEqual([2, 1]);
    expect(ancestorChain(tree, 8)).toEqual([]);
  });
});

describe('findCycle (R-STF-003 AC.2, design 5.2 step 3)', () => {
  it('reports a hand-built cycle of three', () => {
    expect(
      findCycle(
        new Map<number, number | null>([
          [1, 2],
          [2, 3],
          [3, 1],
        ]),
      ),
    ).toEqual([1, 2, 3]);
  });

  it('reports the cycle when the walk starts outside it', () => {
    expect(
      findCycle(
        new Map<number, number | null>([
          [4, 1],
          [1, 2],
          [2, 3],
          [3, 1],
        ]),
      ),
    ).toEqual([1, 2, 3]);
  });

  it('reports a self-loop', () => {
    expect(findCycle(new Map<number, number | null>([[9, 9]]))).toEqual([9]);
  });

  it('accepts a hand-built map with no cycle', () => {
    expect(
      findCycle(
        new Map<number, number | null>([
          [1, null],
          [2, 1],
          [3, 2],
        ]),
      ),
    ).toBeNull();
  });
});

describe('moveViolation (R-STF-003 AC.2, design 5.2 step 3)', () => {
  it.each([
    ['a dimension under another area', 2, 20, 1, null],
    [
      'a parent that is an indicator',
      2,
      30,
      3,
      {
        field: 'parentId',
        description:
          'the new parent must be at the same depth as the current one',
      },
    ],
    [
      'another dimension',
      2,
      21,
      2,
      {
        field: 'parentId',
        description:
          'the new parent must be at the same depth as the current one',
      },
    ],
    [
      'parentId null',
      2,
      null,
      null,
      { field: 'parentId', description: 'an element never changes depth' },
    ],
    [
      'a parent on a depth-1 element',
      1,
      20,
      1,
      {
        field: 'parentId',
        description: 'a depth-1 element cannot have a parent',
      },
    ],
  ])(
    'move to %s',
    (_label, elementDepth, newParentId, newParentDepth, expected) => {
      expect(
        moveViolation({
          elementDepth: elementDepth as number,
          newParentId: newParentId as number | null,
          newParentDepth: newParentDepth as number | null,
        }),
      ).toEqual(expected);
    },
  );
});

describe('createDepthViolation (R-STF-003, design 5.2 step 2)', () => {
  it('allows a root and a child one depth below an in-portfolio parent', () => {
    expect(
      createDepthViolation({
        parentId: null,
        parentDepth: null,
        parentLevelName: null,
        levelDepths: [1, 2, 3],
        samePortfolio: true,
      }),
    ).toBeNull();
    expect(
      createDepthViolation({
        parentId: 1,
        parentDepth: 1,
        parentLevelName: 'Performance Area',
        levelDepths: [1, 2, 3],
        samePortfolio: true,
      }),
    ).toBeNull();
  });

  it('allows a fourth level supplied by the fixture and rejects it when that depth is absent', () => {
    expect(
      createDepthViolation({
        parentId: 3,
        parentDepth: 3,
        parentLevelName: 'Indicator',
        levelDepths: [1, 2, 3, 4],
        samePortfolio: true,
      }),
    ).toBeNull();
    expect(
      createDepthViolation({
        parentId: 3,
        parentDepth: 3,
        parentLevelName: 'Indicator',
        levelDepths: [1, 2, 3],
        samePortfolio: true,
      }),
    ).toEqual({
      field: 'parentId',
      description: 'no level below Indicator',
    });
  });

  it('rejects a parent from another portfolio', () => {
    expect(
      createDepthViolation({
        parentId: 9,
        parentDepth: 1,
        parentLevelName: 'Performance Area',
        levelDepths: [1, 2, 3],
        samePortfolio: false,
      }),
    ).toEqual({
      field: 'parentId',
      description: 'the parent belongs to another portfolio',
    });
  });
});
