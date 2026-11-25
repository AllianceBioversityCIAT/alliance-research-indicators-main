import { OutlineDraft, OutlineNode } from '../outline-node.model';
import { FrameworkEditorElement } from '@shared/interfaces/strategy-framework.interface';
import { hasPinnedDescendant, hasShownDescendant, isPinned, matchesCodeOrName, matchesQuery, nodeShown, normalizedTerm } from './tree-filter.util';

// @akili-spec institutional-performance/strategy-framework T-18 — design §6.3 search.
// The outline editor still calls these functions; this file is their own spec.

const element = (code: string, name: string): FrameworkEditorElement => ({
  id: code.length,
  levelId: 1,
  depth: 1,
  code,
  name,
  description: null,
  parentId: null,
  descendantCounts: {},
  usage: {},
  deletable: true,
  blockers: []
});

const stored = (code: string, name: string, children: OutlineNode[] = []): OutlineNode => ({
  key: `id:${code}`,
  element: element(code, name),
  draft: null,
  counts: {},
  children
});

const draftOf = (key: string): OutlineDraft => ({ key, parentId: null, depth: 1, autofocus: false });

const draftNode = (key: string): OutlineNode => ({
  key: `draft:${key}`,
  element: null,
  draft: draftOf(key),
  counts: {},
  children: []
});

describe('tree-filter.util', () => {
  const tree = stored('1', 'Institutional excellence', [
    stored('1.2', 'Financial health', [stored('1.2.3', 'Execution and control')]),
    stored('1.10', 'Ten')
  ]);

  it('normalizes the term and matches a code prefix or a name substring', () => {
    expect(normalizedTerm('  1.2 ')).toBe('1.2');
    expect(matchesCodeOrName('1.2.3', 'Execution and control', '')).toBe(true);
    expect(matchesCodeOrName('1.2.3', 'Execution and control', '1.2')).toBe(true);
    expect(matchesCodeOrName('1.10', 'Ten', '1.2')).toBe(false);
    expect(matchesCodeOrName('1', 'Institutional excellence', '1.2')).toBe(false);
    expect(matchesQuery(tree.children[1], 'EXECUTION')).toBe(false);
    expect(matchesQuery(tree.children[0].children[0], '  Execution ')).toBe(true);
  });

  it('shows a match and its ancestors, and pins drafts', () => {
    const pinned = new Set<string>();
    expect(nodeShown(tree, 'execution', pinned)).toBe(true);
    expect(nodeShown(tree.children[0], 'execution', pinned)).toBe(true);
    expect(nodeShown(tree.children[0].children[0], 'execution', pinned)).toBe(true);
    expect(nodeShown(tree.children[1], 'execution', pinned)).toBe(false);
    expect(hasShownDescendant(tree, 'execution', pinned)).toBe(true);
    expect(hasShownDescendant(tree.children[1], 'execution', pinned)).toBe(false);
    expect(nodeShown(tree, '   ', pinned)).toBe(true);

    const draft = draftNode('d1');
    const root = stored('2', 'Other area', [draft]);
    expect(isPinned(draft, pinned)).toBe(true);
    expect(isPinned(root, new Set(['id:2']))).toBe(true);
    expect(isPinned(root, pinned)).toBe(false);
    expect(nodeShown(root, 'nomatch', pinned)).toBe(true);
    expect(hasPinnedDescendant(root, pinned)).toBe(true);
    expect(hasPinnedDescendant(tree, pinned)).toBe(false);
  });
});
