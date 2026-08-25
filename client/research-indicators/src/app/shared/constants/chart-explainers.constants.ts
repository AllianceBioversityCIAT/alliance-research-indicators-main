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

/**
 * KZ-007 audit trail, split by what each constant actually documents (T-03 rework attempt 2,
 * Reviewer finding #2): `PROJECT_DASHBOARD_REDESIGN` is the source of each Act's chart-level
 * semantics; `DASHBOARD_NARRATIVE_PASS` is the source of the 6-act grouping/order/taglines
 * (R-DN-003) — that requirement lives ONLY under `2026-08-24-changes--dashboard-narrative-pass`,
 * never under `project-dashboard-redesign`. Every entry's `derivedFrom` composes both.
 */
const PROJECT_DASHBOARD_REDESIGN = 'archive/2026-08-22-changes--project-dashboard-redesign';
const DASHBOARD_NARRATIVE_PASS = 'archive/2026-08-24-changes--dashboard-narrative-pass — R-DN-003, design §2.3/D-DN-3';

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
    what: "This section sums up the project's current standing — results counts, indicator coverage, partner institutions, a status breakdown, the reporting timeline, and an AI-drafted overview.",
    howToRead:
      'The summary tiles, indicator list, and status-bar segments are all clickable — select one to open or jump to the matching results.',
    source:
      'Counts reflect every result reported for this project; results imported from TIP, PRMS, or AICCRA may show less detail until those sources are fully enriched.',
    derivedFrom: `${DASHBOARD_NARRATIVE_PASS}; ${PROJECT_DASHBOARD_REDESIGN} — Act 1 "Identity": hero KPI strip, context chips, in-hero status semaphore (project-dashboard.component.html hero block)`
  },
  'act-2-production': {
    title: 'Production',
    what: 'This section tracks how much this project has produced and when, combining a results-over-time trend with a breakdown of results by indicator.',
    howToRead:
      'Switch the indicator view between bars and a color-graded grid, where darker blue means more results; click a bar or a cell to open those results.',
    source: "Both charts count every result recorded against this project's indicators, grouped by the year they were reported.",
    emptyHint:
      'If only the trend or only the indicator breakdown appears here, the other one simply had no results yet — the whole section disappears only when both are empty.',
    derivedFrom: `${DASHBOARD_NARRATIVE_PASS}; ${PROJECT_DASHBOARD_REDESIGN} — Act 2 "Production": results-trend-card, results-by-indicator bars/heatmap morph (project-dashboard.component.html + results-trend-card.component)`
  },
  'act-3-reach': {
    title: 'Reach',
    what: "This section shows where this project's results reach geographically, and with which partner institutions, main contacts, and contributing projects.",
    howToRead:
      'The map and rankings share the same results; only the contributing-projects ranking is clickable — select a bar there to open those results.',
    source:
      'Rankings count every result that names that partner, contact, or contributing project, so a short list means fewer results recorded that link, not fewer partners overall.',
    emptyHint:
      'If this section shows only the map or only one ranking, the other parts simply had no results to rank — the whole section disappears only when none of them do.',
    derivedFrom: `${DASHBOARD_NARRATIVE_PASS}; ${PROJECT_DASHBOARD_REDESIGN} — Act 3 "Reach": geo-scope-card, geo-scope-map, partner/main-contact/contributing-project rankings (geo-scope-card.component, geo-scope-map.component, project-dashboard-card.component)`
  },
  'act-4-direction': {
    title: 'Direction',
    what: "This section shows what this project is working toward — its top primary levers, how its results align with Science Programs, and its coverage of the Sustainable Development Goals.",
    howToRead:
      'Click a bar in the primary-levers ranking, or a result node in the Science Program alignment view, to open that result; the SDG-coverage and contributing-levers charts are for reading only.',
    source:
      'Counts reflect every result linked to a lever, Science Program, or SDG on this project; the alignment view appears only once at least one Science Program link is recorded.',
    derivedFrom: `${DASHBOARD_NARRATIVE_PASS}; ${PROJECT_DASHBOARD_REDESIGN} — Act 4 "Direction": top primary levers, SP alignment, SDG coverage & contributing levers (project-dashboard-card.component, sp-alignment-graph.component, insights-section.component)`
  },
  'act-5-quality': {
    title: 'Quality',
    what: "This section shows how solid this project's reporting is — evidence attached per role, how results move through the review process, and how many results report who they reached by actor group.",
    howToRead:
      'None of these charts are clickable — read the bars, review-decision breakdown, and reach figures directly.',
    source:
      'Figures cover every result on this project that has evidence, a review decision, or actor-group reach data recorded; a result missing that detail is left out of the matching chart.',
    derivedFrom: `${DASHBOARD_NARRATIVE_PASS}; ${PROJECT_DASHBOARD_REDESIGN} — Act 5 "Quality": evidence coverage, review flow, actor-group reach (insights-section.component)`
  },
  'act-6-depth': {
    title: 'Depth',
    what: "This section drills into each indicator individually, plus the project's most common keywords and any results still pending revision.",
    howToRead:
      'Select a row in the pending-revision list to open that result; the indicator and keyword charts are for reading only.',
    source:
      'The indicator and keyword charts count every result reported for this project; the pending-revision list shows only results currently awaiting review.',
    derivedFrom: `${DASHBOARD_NARRATIVE_PASS}; ${PROJECT_DASHBOARD_REDESIGN} — Act 6 "Depth": indicator deep-dive (20 charts), keywords, pending-revision table (indicator-deep-dive.component, insights-section.component)`
  }
};
