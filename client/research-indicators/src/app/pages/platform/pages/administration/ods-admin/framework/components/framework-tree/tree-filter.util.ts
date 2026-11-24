/**
 * Outline search and pin rules (strategy-framework T-17).
 * A row matches a code prefix or a case-insensitive name substring.
 * Drafts and unsaved rows stay visible, and so do ancestors of a match.
 */

import { OutlineNode } from '../components/outline-node.model';

export function normalizedTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function isPinned(node: OutlineNode, pinnedKeys: ReadonlySet<string>): boolean {
  if (node.draft !== null) return true;
  return pinnedKeys.has(node.key);
}

/** Code prefix, or a case-insensitive substring of the stored name. */
export function matchesQuery(node: OutlineNode, term: string): boolean {
  const needle = normalizedTerm(term);
  if (needle === '') return true;
  const code = (node.element?.code ?? '').toLowerCase();
  const name = (node.element?.name ?? '').toLowerCase();
  return code.startsWith(needle) || name.includes(needle);
}

/** Shown while filtering: a match, a pin (draft or unsaved), or an ancestor of either. */
export function nodeShown(node: OutlineNode, term: string, pinnedKeys: ReadonlySet<string>): boolean {
  if (normalizedTerm(term) === '') return true;
  if (isPinned(node, pinnedKeys)) return true;
  if (matchesQuery(node, term)) return true;
  return node.children.some(child => nodeShown(child, term, pinnedKeys));
}

export function hasShownDescendant(node: OutlineNode, term: string, pinnedKeys: ReadonlySet<string>): boolean {
  return node.children.some(child => nodeShown(child, term, pinnedKeys));
}

export function hasPinnedDescendant(node: OutlineNode, pinnedKeys: ReadonlySet<string>): boolean {
  return node.children.some(child => isPinned(child, pinnedKeys) || hasPinnedDescendant(child, pinnedKeys));
}
