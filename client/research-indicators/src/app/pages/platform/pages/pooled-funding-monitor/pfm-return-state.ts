// Where the user was in the monitor when they opened a result, so coming back (breadcrumb or browser
// Back) reopens the same projects on the same page (owner 2026-10-22). Same idea as the Results Center
// view state: sessionStorage, this browser tab only. It is read ONCE: opening the monitor any other
// way starts fresh. Storage can be missing or blocked: every access is guarded and failure means "no state".
import { PfmChip, PfmFilters, PfmScope, PfmTab } from './pfm.interfaces';

/** One project table: page, rows per page, search and sort. */
export interface PfmGroupView {
  first: number;
  rows: number;
  search: string;
  sortField: string | null;
  sortOrder: 1 | -1;
}

export interface PfmReturnState {
  v: 1;
  savedAt: number;
  scope: PfmScope;
  tab: PfmTab;
  filters: PfmFilters;
  chip: PfmChip | null;
  openGroups: string[];
  groupViews: Record<string, PfmGroupView>;
  /** The result that was opened: the page scrolls back to it. */
  resultCode: string | null;
}

const KEY = 'pfm-monitor-return-state';
/** A snapshot older than this is ignored (the user did something else in between). */
export const PFM_RETURN_STATE_TTL_MS = 2 * 60 * 60 * 1000;

export function savePfmReturnState(state: Omit<PfmReturnState, 'v' | 'savedAt'>, now = Date.now()): void {
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify({ ...state, v: 1, savedAt: now }));
  } catch {
    // storage blocked or full: coming back simply starts fresh
  }
}

/** Returns the saved state once and forgets it. */
export function takePfmReturnState(now = Date.now()): PfmReturnState | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    globalThis.sessionStorage?.removeItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as PfmReturnState;
    if (state?.v !== 1 || typeof state.savedAt !== 'number' || now - state.savedAt > PFM_RETURN_STATE_TTL_MS) return null;
    return state;
  } catch {
    return null;
  }
}

/** "STAR-629" from "/result/STAR-629/general-information?from=pfm-monitor"; null when it is not a result URL. */
export function resultCodeFromUrl(url: string): string | null {
  return /\/result\/([^/?#]+)/.exec(url)?.[1] ?? null;
}
