import { ChartExplainer } from '../interfaces/chart-explainer.interface';

/**
 * Stable identifier for one chart surface's explainer entry (R-CXP-004).
 *
 * T-01 (this file, as authored): kept as `string` so `chart-explainer.component.ts`'s `key`
 * input can already be typed against it. T-02 narrows this to the string-literal union of every
 * wired surface (design.md §5.3/§5.4) — at that point an unregistered key becomes a
 * `strictTemplates` build error (R-CXP-004 AC.1), which a plain `string` cannot give us yet.
 */
export type ChartExplainerKey = string;

/**
 * Single typed copy registry (R-CXP-004), explicitly annotated `Record<ChartExplainerKey,
 * ChartExplainer>` — not left to inference from `{}`, which would type as the empty object
 * type and lose its string index signature (`CHART_EXPLAINERS[key]` would not compile). The
 * explicit annotation also keeps T-02's completeness guarantee: once `ChartExplainerKey` narrows
 * to the real string-literal union, this empty object literal will fail to satisfy the
 * (now-required) key set until every entry is seeded, exactly like `satisfies` would.
 *
 * Intentionally empty: copy authoring is T-03's scope. `chart-explainer.component.ts` reads
 * this registry to fail closed (R-CXP-001 "no button when key has no registry entry") — until
 * T-03 seeds it, every key is unregistered by construction, which is the correct state for a
 * skeleton this early.
 */
export const CHART_EXPLAINERS: Record<ChartExplainerKey, ChartExplainer> = {};
