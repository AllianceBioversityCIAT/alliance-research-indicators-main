# Proposal — "What am I looking at?" explainer button on every project-dashboard chart

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `changes/chart-explainers` |
| **Slug** | `chart-explainers` — given as a bare kebab-case name |
| **Type** | **Change** (feature — new UI affordance + copy; no data/API change) |
| **Approval Mode** | `gated` (default) |
| **Depends on** | none (`changes/executive-overview-grounded-context` is in flight on the same branch and touches `project-dashboard.component.*`; sequence this **after** it lands to avoid same-file merge churn) |
| **Parallel-safe** | **no** with `executive-overview-grounded-context` (same host component); yes with any server-side spec |
| **Source** | User request 2026-08-24 via `/akili-quick` (escalated: 34 chart surfaces across 7 components, new visual pattern) |
| **Requirement source** | Free-text user intent — no Jira ticket, no Figma (user was not available to confirm; revise if one exists) |
| **Skills to load downstream** | `ui-ux-pro-max`, `cognitive-doc-design` (copy), `angular-developer` |
| **Date** | 2026-08-24 |

## Intent

Every chart on the project dashboard gets a small, consistent **`?` explainer** that, in one or two plain-language sentences, tells the reader **what the graphic shows, how to read it, and where the numbers come from** — so a Center Admin, PI, or donor viewer never has to guess what a heatmap cell, a bipartite edge, or a funnel step means.

## Problem / Current Behavior

| Today | Consequence |
| --- | --- |
| Charts carry a **title** (`chartTitle`) and, on some cards, a one-line `description` — but the description is data-flavoured ("Top 5 by result count"), not an explanation of meaning | Readers who are not analysts (donor viewers, new PIs) cannot tell *what a cell/bar/edge represents* or *why a chart is empty* |
| Advanced charts (indicator × year **heatmap**, SP **bipartite graph**, review **funnel**, keyword **treemap**, IRL readiness) have **no explanation at all** | These are exactly the charts whose encoding is non-obvious — the ones an explainer helps most |
| The only "help" pattern in the client is `icon-tooltip` — a hover-only PrimeNG `pTooltip` on an `<i>` (not focusable, not touch-reachable, one line) | Not usable for a paragraph of natural language; fails §10.1 keyboard reachability |
| The dashboard already has a **`p-popover` precedent** (`indicators-covered-popover`, KPI card) with header + body + close pattern | A consistent home exists — it just is not applied to charts |

**Chart surface inventory (what renders on `/project-detail/.../dashboard`, per KZ-002 — enumerate by *what renders*, not by folder):**

| Host component | Surfaces | Header mechanism |
| --- | --- | --- |
| `project-dashboard` (hero + indicator section) | status composition strip, results-by-indicator (morph) , indicator × year heatmap, 2 more `viz-chart` | inline `<h2>` + `aria-labelledby` regions |
| `results-trend-card` | trend line | own `<header>` with `<h2 id="results-trend-title">` |
| `project-dashboard-card` (default variant) | top partner / main contact / contributing projects / primary levers (viz-bar) | `<header>` with `title()` + optional `description()` |
| `geo-scope-card` + `geo-scope-map` | map + 3 rankings (regions / countries / sub-national, `variant="list"`) | nested `<h3>` + list-variant cards |
| `sp-alignment-graph` | bipartite SP ↔ results graph | own `<header>` |
| `indicator-deep-dive` | **20** `viz-chart` (velocity sparkline, capacity gender/session/modality/type, IRL, scalability, innovation type, …) | own section `<header>`, charts in sub-blocks |
| `insights-section` (×3 instances) | **5** `viz-chart` (actor reach, evidence per role, review funnel, levers, keyword treemap) | own `<header>` |

≈ **34 chart surfaces, 7 host components, 1 shared chart engine (`viz-chart`).**

## Proposed Outcome

- Every chart title row shows a compact **`?` button** (icon-only, `aria-label="Explain this chart: <title>"`, 24px hit target, visible focus ring, `--ac-grey-700` at rest → `--ac-light-blue-400` on hover/focus).
- Click / Enter / Space opens a **popover** (PrimeNG `p-popover`, `appendTo="body"`, ≤ 340px) titled with the chart's name and containing **2–3 short sentences** in natural language, structured the same way everywhere:
  1. **What it shows** — "Each cell is the number of results for one indicator in one year."
  2. **How to read it** — "Darker blue = more results. Click a cell to open those results."
  3. **Where the data comes from / caveats** — "Counts include all statuses except Rejected."
- Esc, outside-click, or the button again closes it and **focus returns to the `?` button** (precedent: the `executiveOverviewReader` Esc-close FAIL on this same component — KZ-014 says the red must be *seen* in a test).
- Screen-reader users get the same text through `aria-describedby` on the chart region, so the explanation is available **without** opening the popover.
- Copy lives in **one typed registry** (`CHART_EXPLAINERS: Record<ChartExplainerKey, ChartExplainer>`), not scattered across 7 templates — reviewable in one place, translatable later.
- Dark mode and `prefers-reduced-motion` respected (popover uses Aura tokens; no bespoke animation).

## Scope

| In | Out |
| --- | --- |
| New shared `chart-explainer` component (button + popover) in `shared/components/` | Changing any chart's data, options, or click behavior |
| `explainerKey` / `explainer` input on `viz-chart` **and** on the card/section headers that own a title (so the `?` sits beside the title, not inside the canvas) | Explaining KPI tiles / progress meters (not data-viz per §8.1 registry) |
| Copy registry with an entry for **all ≈34 surfaces**, authored with `cognitive-doc-design` (plain language, ≤ 3 sentences, no jargon without a gloss) | A generic "help center" or per-page documentation |
| a11y: focus management, Esc, `aria-describedby`, `aria-expanded`, `aria-controls` | i18n framework (registry is shaped to allow it later) |
| Register the pattern in `docs/ux-ui/design.md` §8.1 + §12.2 decision | Backend changes (none needed) |
| Unit tests: open/close/Esc/focus-return, registry completeness (every rendered chart has a key) | E2E / visual regression |

## Non-Goals

- No AI-generated or dynamic descriptions — copy is static, curated, and versioned in the repo.
- No redesign of card headers beyond inserting the button.
- No tooltip-on-hover as the *primary* mechanism (hover-only fails keyboard/touch).

## Affected Users, Systems, And Specs

| Who / what | Effect |
| --- | --- |
| Center Admins, PIs, donor viewers (PRD personas) | Read charts without training |
| `shared/components/viz-chart` | +1 optional input, renders `?` in its own title row when given |
| 7 host components listed above | Header markup gains the explainer; `project-dashboard-card` gets an `explainerKey` input |
| `docs/ux-ui/design.md` §8.1, §10.1, §12.2 | New component + decision entry (mandatory per §8.1 rule) |
| `changes/executive-overview-grounded-context` | Shares `project-dashboard.component.*` — land first |
| Archived `project-dashboard-redesign`, `dashboard-advanced-analytics` | Source of truth for what each chart encodes (copy must be checked against them, KZ-007) |

## Visual Reference

- Source: **None** yet — no Figma, no Jira. A mockup was **not** generated because this is a non-interactive session; `/akili-specify` may generate one (`stitch-design` → `claude-design` → self-contained HTML fallback) under `docs/specs/changes/chart-explainers/mockup/` before designing.
- Existing precedents to match instead of inventing: `indicators-covered-popover` (`project-dashboard.component.html:123`) for popover chrome; `project-dashboard-card` header for placement; Aura tokens for surfaces.
- Notes: the one screen in scope is the project dashboard; the pattern must look identical on the compact list-variant cards (geo rankings) and the full cards.

## Requirement Delta Preview

### ADDED Requirements

- R-CX-001 Every data-viz surface on the project dashboard renders a `?` explainer button adjacent to its title.
- R-CX-002 The explainer opens a popover with a title and 1–3 plain-language sentences (what / how to read / source); closes on Esc, outside click, or toggle; focus returns to the button.
- R-CX-003 The explanation is exposed to assistive tech via `aria-describedby` regardless of popover state; the button has `aria-expanded` / `aria-controls`.
- R-CX-004 Copy is held in a single typed registry; a test fails if a rendered chart has no registry entry (registry completeness gate — must be *seen red* with one key removed, K-004).
- R-CX-005 Visual treatment uses existing tokens only (`--ac-grey-*`, `--ac-light-blue-400`, `--ac-primary-blue-600`, Aura popover surface); works in dark mode.

### MODIFIED Requirements

- `project-dashboard-card.description` stays as-is (data subtitle) — the explainer is additive, not a replacement.

### REMOVED Requirements

- none

## Approach Options

| Option | Shape | Pros | Cons |
| --- | --- | --- | --- |
| **A. Shared `chart-explainer` component + copy registry (recommended)** | One standalone component `<app-chart-explainer key="…">` rendering button + `p-popover`; `viz-chart` and card/section headers accept a key | Single a11y implementation; copy reviewable in one file; 34 surfaces covered by ~7 template touches + registry | New shared component + `design.md` entries |
| B. Reuse `icon-tooltip` with longer text | Drop `<app-icon-tooltip>` into each header | Zero new components | Hover-only, non-focusable, single-line tooltip — fails §10.1 and the "natural language" goal; 34 copy strings inlined in templates |
| C. Inline explanation text under every chart | Always-visible paragraph | No interaction | Adds ~34 paragraphs of vertical space to an already long dashboard; buries the data |

## Recommended Approach

**Option A.** It is the smallest path that satisfies keyboard/touch reachability and keeps the copy auditable. It reuses PrimeNG `p-popover` (already in the host component) and matches the existing KPI popover chrome, so no new tokens or overlay mechanics are introduced — only a new *component* registered in §8.1, which the design-system rule already provides for.

Suggested task shape for `/akili-specify` (Lite, 3 tasks):

1. `chart-explainer` shared component + `CHART_EXPLAINERS` registry type + unit tests (open/close/Esc/focus-return, seen red first).
2. Wire into `viz-chart`, `project-dashboard-card`, and the 5 section headers; registry entries for all ≈34 surfaces, copy authored with `cognitive-doc-design` and cross-checked against the archived chart specs.
3. `design.md` §8.1/§12.2 entries + HITL light/dark screenshot check (KZ-014 — the checkbox flips only after screenshots land).

## Risks, Dependencies, And Open Questions

| # | Item | Mitigation |
| --- | --- | --- |
| R-1 | **Same-file overlap** with in-flight `executive-overview-grounded-context` on `project-dashboard.component.*` | Land that spec first; this one is `Parallel-safe: no` with it |
| R-2 | Copy drift — an explainer that describes the chart wrongly is worse than none (KZ-007: correction records / descriptions propagate as fact) | Every registry entry cites the archived spec section it was derived from; reviewer checks 100 % of entries, not a sample |
| R-3 | `viz-chart` is used **outside** the project dashboard (`geo-scope-map`, possibly other routes) | Input is optional; no `?` renders without a key — verify with a grep over the whole client, not just `project-detail/` (KZ-002, KZ-017) |
| R-4 | `p-popover` inside the list-variant cards (compact, nested in `geo-scope-card`) may clip | `appendTo="body"` as in the KPI precedent |
| R-5 | Focus-return regression (the exact FAIL seen on `executiveOverviewReader`) | Test arranges the *transition* open → Esc → `document.activeElement` (KZ-015) |
| OQ-1 | Should the explainer also surface on **empty/error** chart states ("why is this empty")? | Recommend yes — same registry entry, third sentence covers it |
| OQ-2 | English only, or prepare ES strings now? | Registry typed per-locale-ready; ship EN only |
| OQ-3 | Is a Figma/Jira reference available? | Ask at approval; if yes, `/akili-specify` ingests it via MCP |

## Success Criteria

- 100 % of chart surfaces on the project dashboard (counted by rendered `viz-chart` + composition strip + map) show a `?`; the registry-completeness test enumerates them and has been observed failing.
- Keyboard-only walkthrough: Tab reaches every `?`, Enter opens, Esc closes, focus returns — verified by spec **and** a manual pass.
- Screen reader announces the description via `aria-describedby` without opening the popover.
- Light and dark screenshots attached in `execution.md` before any task is checked.
- `npm test -- --silent` green; `npm run lint -- --quiet` clean; no new hex literals.

## Next Step

```text
/akili-specify changes/chart-explainers
```

(Change track, Lite depth — 3 tasks as sketched above. Pending: approval of this proposal, and R-1 sequencing after `executive-overview-grounded-context` lands.)
