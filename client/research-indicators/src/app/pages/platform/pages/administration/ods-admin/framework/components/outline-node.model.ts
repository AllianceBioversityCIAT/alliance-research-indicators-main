/**
 * Tree the outline editor hands to each recursive row (design §6.3).
 * A node is either a stored element or a draft that has no code yet.
 *
 * @akili-spec institutional-performance/strategy-framework T-13
 */

import { FrameworkEditorElement } from '@shared/interfaces/strategy-framework.interface';

export interface OutlineDraft {
  key: string;
  parentId: number | null;
  depth: number;
  /** The new row focuses its name field once, on the render that creates it. */
  autofocus: boolean;
}

export interface OutlineNode {
  key: string;
  element: FrameworkEditorElement | null;
  draft: OutlineDraft | null;
  /** Descendants per depth, from `nestFramework`. Empty for a draft. */
  counts: Readonly<Record<number, number>>;
  children: OutlineNode[];
}

export interface OutlineAddChildEvent {
  parentId: number;
  /** Depth of the row being added, already resolved against the levels. */
  depth: number;
}

export interface OutlineCommittedEvent {
  /** Set when the save stored a draft, so the editor can drop that draft. */
  draftKey: string | null;
}

export interface OutlineRemoveEvent {
  id: number;
  parentId: number | null;
  /** The control the alert returns focus to when the row is still there. */
  button: HTMLElement;
}
