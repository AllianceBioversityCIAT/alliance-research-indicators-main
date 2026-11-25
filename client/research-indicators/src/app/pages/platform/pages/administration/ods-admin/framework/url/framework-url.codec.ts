/**
 * Pure `URL ⇄ state` codec for the Framework page (design §2.1, §6.2).
 *
 * No DI, no `Router`, no signals. Vocabularies are frozen constants, never
 * derived from level display names — a fourth level is `depth-4`, not a
 * slug of its name (client guide, URL-addressable state; R-STF-002 AC.1).
 *
 * `view` is `editor` | `table`. `editor` is the Tree view (D-STF-35): it is
 * the default and is omitted from the URL. No new slug is added. `level` is
 * still read as `depth-<n>` so an old link parses, and the depth is dropped
 * (D-STF-37). Serialize never writes `level`. An unknown view slug falls
 * back to `editor` (Tree).
 *
 * @akili-spec institutional-performance/strategy-framework T-12
 */

export const FRAMEWORK_VIEW_SLUGS = Object.freeze(['editor', 'table'] as const);

export type FrameworkViewSlug = (typeof FRAMEWORK_VIEW_SLUGS)[number];

export const DEFAULT_FRAMEWORK_VIEW: FrameworkViewSlug = 'editor';

/** Frozen prefix. The number after it is the level's depth, not its name. */
export const FRAMEWORK_LEVEL_SLUG_PREFIX = 'depth-';

const VIEW_SLUGS: ReadonlySet<string> = new Set(FRAMEWORK_VIEW_SLUGS);

export interface FrameworkUrlState {
  readonly view: FrameworkViewSlug;
  /**
   * Ignored. Parse always returns `null`, and serialize always clears `level`,
   * so an old `depth-<n>` does not select a table (D-STF-37).
   */
  readonly level: number | null;
}

export interface FrameworkUrlParams {
  get(name: string): string | null;
}

const isViewSlug = (value: string): value is FrameworkViewSlug => VIEW_SLUGS.has(value);

const levelDepth = (slug: string): number | null => {
  if (!slug.startsWith(FRAMEWORK_LEVEL_SLUG_PREFIX)) return null;
  const raw = slug.slice(FRAMEWORK_LEVEL_SLUG_PREFIX.length);
  if (!/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
};

export function parseFrameworkUrl(params: FrameworkUrlParams): FrameworkUrlState {
  const rawView = params.get('view');
  const view = rawView !== null && isViewSlug(rawView) ? rawView : DEFAULT_FRAMEWORK_VIEW;
  const rawLevel = params.get('level');
  if (typeof rawLevel === 'string') levelDepth(rawLevel);
  return { view, level: null };
}

/**
 * `null` clears the param. The default view is written as `null` so a
 * round-trip of `{ view: 'editor', level: null }` is an empty query.
 * `level` is always cleared (D-STF-37).
 */
export function serializeFrameworkUrl(state: FrameworkUrlState): { view: string | null; level: null } {
  return {
    view: state.view === DEFAULT_FRAMEWORK_VIEW ? null : state.view,
    level: null
  };
}
