/**
 * In-memory tree of one portfolio (design 5.2, R-STF-002 AC.1, R-STF-003,
 * I-2, I-3). No I/O: the service loads the rows and passes them in. The
 * depth rule makes a cycle unreachable through the API; `findCycle` is the
 * defensive check tested on a hand-built map.
 *
 * @akili-spec institutional-performance/strategy-framework
 */

export interface TreeElement {
  id: number;
  parentId: number | null;
  depth: number;
  code: string;
}

export interface TreeNode {
  element: TreeElement;
  childIds: number[];
}

export interface FrameworkTree {
  byId: ReadonlyMap<number, TreeNode>;
  roots: readonly number[];
}

export interface ParentViolation {
  field: 'parentId';
  description: string;
}

export const buildTree = (elements: readonly TreeElement[]): FrameworkTree => {
  const byId = new Map<number, TreeNode>();
  for (const element of elements) {
    byId.set(element.id, { element, childIds: [] });
  }
  const roots: number[] = [];
  for (const element of elements) {
    const parent =
      element.parentId === null ? undefined : byId.get(element.parentId);
    if (parent) parent.childIds.push(element.id);
    else roots.push(element.id);
  }
  return { byId, roots };
};

/** Descendants per depth, not including the element itself. */
export const descendantCounts = (
  tree: FrameworkTree,
  elementId: number,
): Record<number, number> => {
  const counts: Record<number, number> = {};
  const start = tree.byId.get(elementId);
  if (!start) return counts;
  const stack = [...start.childIds];
  const seen = new Set<number>([elementId]);
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const node = tree.byId.get(id);
    if (!node) continue;
    counts[node.element.depth] = (counts[node.element.depth] ?? 0) + 1;
    stack.push(...node.childIds);
  }
  return counts;
};

/** Ancestor ids from the parent up to the root. Stops if a cycle is handed in. */
export const ancestorChain = (
  tree: FrameworkTree,
  elementId: number,
): number[] => {
  const chain: number[] = [];
  const seen = new Set<number>();
  let current = tree.byId.get(elementId)?.element.parentId ?? null;
  while (current !== null && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = tree.byId.get(current)?.element.parentId ?? null;
  }
  return chain;
};

/**
 * First cycle in a parent map, as the ids from the repeated node back to
 * it, or `null` when the map is a forest. A self-loop is `[id]`.
 */
export const findCycle = (
  parentById: ReadonlyMap<number, number | null>,
): number[] | null => {
  const visited = new Set<number>();
  for (const start of parentById.keys()) {
    if (visited.has(start)) continue;
    const path: number[] = [];
    const index = new Map<number, number>();
    let current: number | null = start;
    while (current !== null && parentById.has(current)) {
      const at = index.get(current);
      if (at !== undefined) return path.slice(at);
      if (visited.has(current)) break;
      index.set(current, path.length);
      path.push(current);
      current = parentById.get(current) ?? null;
    }
    for (const id of path) visited.add(id);
  }
  return null;
};

/**
 * A6 move. `null` clears no parent (an element never changes depth). A
 * depth-1 element cannot gain one. The new parent must sit one depth above
 * the element — the same depth as its current parent.
 */
export const moveViolation = (input: {
  elementDepth: number;
  newParentId: number | null;
  newParentDepth: number | null;
}): ParentViolation | null => {
  if (input.newParentId === null) {
    return {
      field: 'parentId',
      description: 'an element never changes depth',
    };
  }
  if (input.elementDepth === 1) {
    return {
      field: 'parentId',
      description: 'a depth-1 element cannot have a parent',
    };
  }
  if (input.newParentDepth !== input.elementDepth - 1) {
    return {
      field: 'parentId',
      description:
        'the new parent must be at the same depth as the current one',
    };
  }
  return null;
};

/**
 * Create placement (design 5.2 step 2). No parent means depth 1. A parent
 * in another portfolio is rejected, and so is a parent whose next depth is
 * not a level (`no level below <name>`), including when a fixture has added
 * a fourth level and when it has not.
 */
export const createDepthViolation = (input: {
  parentId: number | null;
  parentDepth: number | null;
  parentLevelName: string | null;
  levelDepths: readonly number[];
  samePortfolio: boolean;
}): ParentViolation | null => {
  if (input.parentId === null) return null;
  if (!input.samePortfolio) {
    return {
      field: 'parentId',
      description: 'the parent belongs to another portfolio',
    };
  }
  const nextDepth = (input.parentDepth ?? 0) + 1;
  if (!input.levelDepths.includes(nextDepth)) {
    return {
      field: 'parentId',
      description: `no level below ${input.parentLevelName ?? 'the parent'}`,
    };
  }
  return null;
};
