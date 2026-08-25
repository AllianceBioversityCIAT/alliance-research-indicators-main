import { ChartExplainer } from '../interfaces/chart-explainer.interface';

/**
 * Stable identifier for one Act section's explainer entry (R-CXP-004).
 *
 * Narrowed here (T-02, re-scoped 2026-08-25 — design.md D-CXP-10) to the string-literal union of
 * the 6 Act sections in `project-dashboard.component.html`: a key used in a template that is not
 * a member of this union is a `strictTemplates` build error (R-CXP-004 AC.1). This is a
 * per-section registry, not per-chart — the superseded per-chart design (38 keys) never shipped.
 */
export type ChartExplainerKey = 'act-1-identity' | 'act-2-production' | 'act-3-reach' | 'act-4-direction' | 'act-5-quality' | 'act-6-depth';

const PROJECT_DASHBOARD_REDESIGN = 'archive/2026-08-22-changes--project-dashboard-redesign — R-DN-003, design §2.3/D-DN-3';

/**
 * Single typed copy registry (R-CXP-004), explicitly annotated `Record<ChartExplainerKey,
 * ChartExplainer>` — not left to inference from an object literal, which would otherwise widen
 * to a type that can silently omit a member. With `ChartExplainerKey` now a closed 6-member
 * union, this annotation is what makes an incomplete registry (a missing Act) a compile error.
 *
 * T-02 (this task): every key present with a real, human `title` (needed now — it drives the
 * button's accessible name and is exercised by T-02's own tests) but placeholder `what` /
 * `howToRead` / `source` sentences prefixed `TODO:` — T-03's registry-lint test is expected to
 * fail on these placeholders; that red is T-03's starting state, not a bug here. `derivedFrom`
 * already points at the real archived spec clause per Act (KZ-007 audit trail), plus the
 * component(s) that Act's content comes from — T-03 verifies semantics against it.
 */
export const CHART_EXPLAINERS: Record<ChartExplainerKey, ChartExplainer> = {
  'act-1-identity': {
    title: 'Identity',
    what: 'TODO: (Act 1 — Identity) name what this section shows, collectively, in plain language (R-CXP-005).',
    howToRead: "TODO: (Act 1 — Identity) name the shared encoding/interaction across this Act's content.",
    source: 'TODO: (Act 1 — Identity) which results are counted; caveat for a partially-empty Act.',
    derivedFrom: `${PROJECT_DASHBOARD_REDESIGN} — Act 1 "Identity": hero KPI strip, context chips, in-hero status semaphore (project-dashboard.component.html hero block)`
  },
  'act-2-production': {
    title: 'Production',
    what: 'TODO: (Act 2 — Production) name what this section shows, collectively, in plain language (R-CXP-005).',
    howToRead:
      'TODO: (Act 2 — Production) name the shared encoding/interaction across this Act\'s content — mention "click a bar/cell to open those results" only if still true.',
    source: 'TODO: (Act 2 — Production) which results are counted; caveat for a partially-empty Act.',
    derivedFrom: `${PROJECT_DASHBOARD_REDESIGN} — Act 2 "Production": results-trend-card, results-by-indicator bars/heatmap morph (project-dashboard.component.html + results-trend-card.component)`
  },
  'act-3-reach': {
    title: 'Reach',
    what: 'TODO: (Act 3 — Reach) name what this section shows, collectively, in plain language (R-CXP-005) — must gloss "bipartite" if referenced.',
    howToRead: "TODO: (Act 3 — Reach) name the shared encoding/interaction across this Act's content.",
    source: 'TODO: (Act 3 — Reach) which results are counted; caveat for a partially-empty Act.',
    derivedFrom: `${PROJECT_DASHBOARD_REDESIGN} — Act 3 "Reach": geo-scope-card, geo-scope-map, partner/main-contact/contributing-project rankings (geo-scope-card.component, geo-scope-map.component, project-dashboard-card.component)`
  },
  'act-4-direction': {
    title: 'Direction',
    what: 'TODO: (Act 4 — Direction) name what this section shows, collectively, in plain language (R-CXP-005).',
    howToRead: "TODO: (Act 4 — Direction) name the shared encoding/interaction across this Act's content.",
    source: 'TODO: (Act 4 — Direction) which results are counted; caveat for a partially-empty Act.',
    derivedFrom: `${PROJECT_DASHBOARD_REDESIGN} — Act 4 "Direction": top primary levers, SP alignment, SDG coverage & contributing levers (project-dashboard-card.component, sp-alignment-graph.component, insights-section.component)`
  },
  'act-5-quality': {
    title: 'Quality',
    what: 'TODO: (Act 5 — Quality) name what this section shows, collectively, in plain language (R-CXP-005).',
    howToRead: "TODO: (Act 5 — Quality) name the shared encoding/interaction across this Act's content.",
    source: 'TODO: (Act 5 — Quality) which results are counted; caveat for a partially-empty Act.',
    derivedFrom: `${PROJECT_DASHBOARD_REDESIGN} — Act 5 "Quality": evidence coverage, review flow, actor-group reach (insights-section.component)`
  },
  'act-6-depth': {
    title: 'Depth',
    what: 'TODO: (Act 6 — Depth) name what this section shows, collectively, in plain language (R-CXP-005) — must gloss any acronym referenced (IRL, OICR).',
    howToRead: "TODO: (Act 6 — Depth) name the shared encoding/interaction across this Act's content.",
    source: 'TODO: (Act 6 — Depth) which results are counted; caveat for a partially-empty Act.',
    derivedFrom: `${PROJECT_DASHBOARD_REDESIGN} — Act 6 "Depth": indicator deep-dive (20 charts), keywords, pending-revision table (indicator-deep-dive.component, insights-section.component)`
  }
};
