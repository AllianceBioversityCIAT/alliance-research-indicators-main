# Design — client / Dashboard Narrative Pass (Project Dashboard v3.1)

- **Module:** client / project-detail (STAR) — client-only
- **Spec id:** 2026-08-dashboard-narrative-pass
- **Status:** draft
- **Owner:** JuanCode
- **Linked requirements:** ./requirements.md
- **Visual reference:** `./mockup/narrative-dashboard.html` (self-contained, generated this phase — 6 acts with real-shaped data + OQ-1/OQ-2 variants side by side; the owner-approved variant becomes binding)
- **Skill note:** designed against the repo's own design system (`docs/ux-ui/design.md` §6-8, F1-F4 as-built idioms) — deviation from the ui-ux-pro-max load recorded: the binding constraints here are repo-internal (tokens, card idioms, act grouping), not generic UI patterns
- **Last updated:** 2026-08-24

---

## 1. Goals & non-goals

**Goals:** (1) trend series renders — crash mechanism removed (R-DN-001); (2) one declared visual language, inventory closed (R-DN-002); (3) six-act narrative order with question-subtitles (R-DN-003); (4) zero behavior regression (R-DN-004).

**Non-goals:** new endpoints/DTOs; new chart types; token changes; touching archived v3 specs; NgRx; component rewrites beyond what migration/reordering strictly requires.

## 2. Architecture

### 2.1 Bug fix — `results-trend-card` (R-DN-001)

Replace the `visualMap` mechanism entirely (D-DN-1): **two overlapping line series** sharing the resolved token color — series "closed" = buckets `[0..lastClosedIndex]` with `lineStyle.type:'solid'`; series "in-progress" = `[null × lastClosedIndex-1, lastClosed, inProgress]` with `lineStyle.type:'dashed'`. Tooltip formatter/axis/click/tableModel unchanged. Colors ALWAYS resolved via `chartTokens()` — never the `'var(--…)'` fallback string into options (probe case C trap); fallback = omit color and let the theme default, or a resolved literal from the token util.

**Regression harness (D-DN-5):** new `results-trend-card.ssr.spec.ts` co-located, importing full `echarts` (`init(null,null,{renderer:'svg',ssr:true})`) — renders the REAL builder output and asserts: (a) no throw; (b) ≥1 series-colored stroke path + symbols; (c) solid AND dashed stroke-dasharray present; (d) no `var(--` substring in the SVG. Red on current code (probe already proves it), green after. Runs in jsdom (SSR needs no DOM).

### 2.2 Visual-language closure (R-DN-002)

Inventory task enumerates by render markup (grep `style.width`/`app-viz-chart` + template read). Known set: status composition strip (inline, `project-dashboard.component.html:383-440`), `project-dashboard-card` pills (:95/:160), Top Regions/Countries pills. Resolution per OQ-2 at the mockup gate:
- **Variant A (migrate):** top-N/regions render as `viz-chart` horizontal bars (F1 rankings builder family) — one engine everywhere; composition strip stays as the ONE declared non-echarts idiom (it is a part-to-whole strip with drill links, not a chart).
- **Variant B (declare):** pills stay and design.md §8 gains a "ranking strip" idiom entry (when-to-use: ≤10 labeled counts with drill links, no axis needed) + "composition strip".
Either way the closure table lands in `docs/ux-ui/design.md` §8 via the normal flow (this spec's execution edits it — allowed: it is the change itself, not an archive sync).

### 2.3 Narrative reorder (R-DN-003)

`project-dashboard.component.html` template reorder only — components keep their selectors/inputs/contracts. Act structure = `<section>` per act with an act header (number + question) and shared grid rows:

| Acto | Pregunta (subtítulo ES/EN per app copy idiom) | Cards |
|---|---|---|
| 1. Identity & health | ¿Qué es este proyecto y cómo va? | Hero F1 + status composition (OQ-1: variant A in-hero semaphore row / variant B strip directly below hero) |
| 2. Production | ¿Cuánto se ha producido y cuándo? | Results over time (fixed) + results by indicator |
| 3. Reach | ¿Dónde y con quién? | Geo map + top regions/countries + partners + contacts |
| 4. Direction | ¿Hacia qué apunta? | Primary levers + SP alignment + SDG coverage (F4 card re-grouped here — its data/fetch stays in the lazy insights request; the card renders skeleton until the insights fetch resolves, identical lazy semantics, only DOM position moves) |
| 5. Quality & process | ¿Qué tan sólido es lo reportado? | Evidence + review flow + reach (F4, same lazy mechanics) |
| 6. Depth on demand | ¿Qué hay detrás de cada indicador? | F3 deep-dive + keywords treemap (F4) + pending-revision table |

**Lazy invariant (hard):** acts 4-5 re-position F4 cards WITHOUT moving the fetch trigger — the insights IntersectionObserver moves to the FIRST F4-card position in DOM (act 4); one fetch still feeds all F4 cards wherever they sit. F3 panel trigger unchanged. First-paint request set unchanged (NFR-DN-001).

## 3. Data model / 4. API surface

No changes. No new requests.

## 5. Workflows & business rules

1. Reorder is template-level; every card keeps loading/error/empty/sparse states (R-DN-004 BUT).
2. Act headers are static markup (no data dependency, no CLS risk).
3. Drill links move with their cards; `routerLink`/queryParams untouched.

## 6. Frontend component architecture

- `project-dashboard.component.html`: 6 `<section aria-labelledby>` act wrappers; act header = number chip + question subtitle (`Space_Grotesk` label idiom, tokens only).
- `results-trend-card`: builder refactor per §2.1 (component API unchanged).
- OQ-2-A only: top-N/regions bar builders reuse the F1 rankings `viz-chart` builder family; sr-only tables preserved; pills markup removed with its tests migrated (see reversion challenge 2).
- No new shared components; `insights-section` cards MAY need per-card projection/reorder support — if its template requires splitting into per-card exports, that is the ONE allowed structural change, flagged in tasks.

## 7. Integration / 8. Security / 9. Observability

None new / unchanged / unchanged.

## 10. Testing strategy

- **Bug:** SSR regression spec (§2.1) — red first on current code, green after (Bug Mode mandate).
- **Order:** dashboard component spec asserts act DOM order + subtitle presence + per-act card membership (queryAll sequence).
- **Laziness:** re-run/extend F3/F4 zero-fetch-before-intersection specs with the moved observer target (KZ-015 transitions); assert one insights fetch feeds re-positioned cards.
- **Migration (OQ-2-A):** builder specs on option output from live-shaped fixtures (KZ-001); a11y attributes asserted.
- **HITL (KZ-014):** light+dark of all 6 acts vs the approved mockup; below-the-fold network check; drill click-through; `tokens:validate`.

## 11. Rollout

Additive/reorder on `bilateral-visual-improvements`; rollback = revert. No flags, no migrations.

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-DN-1 | 2026-08-24 | Trend fix = two overlapping series (solid/dashed), NO visualMap | Probe-confirmed crash in `getVisualGradient` with `pieces[].lineStyle`; T-09 precedent already avoids visualMap; two series are SSR-testable and semantics-identical |
| D-DN-2 | 2026-08-24 | Regression harness = real-echarts SSR render asserted on emitted SVG | KZ-001: the property lives in generated output; jsdom-safe; the probe is the harness prototype |
| D-DN-3 | 2026-08-24 | Act mapping per §2.3 table; OQ-1/OQ-2 variants decided by mockup approval, then recorded here as D-DN-6 | Visual decisions are decided visually (mockup gate), not in prose |
| D-DN-4 | 2026-08-24 | F4 cards re-group into acts 4-6 while ONE lazy fetch + observer (moved to first F4 card) feeds them all | Narrative wins over widget locality without touching the fetch contract (NFR-DN-001) |
| D-DN-5 | 2026-08-24 | Colors into echarts options are always RESOLVED token values; the `'var(--…)'` fallback string is banned from options | Probe case C: browsers don't resolve var() in SVG presentation attributes — silent invisible-series trap |

### Reversion challenges (Step 2.3 — delivered behavior being moved/removed)

1. **Status card leaves its F2-delivered position (both OQ-1 variants).** Challenge: what breaks? → The conditional `lg:grid-cols-2` pairing with the trend card (`project-dashboard.component.html:370-371`) — trend loses its grid partner. Design answers: act-2 grid pairs trend with results-by-indicator instead; status's routerLink drills and sr-only table travel intact (self-contained markup). Addressed in §2.3.
2. **OQ-2-A removes delivered pill markup.** Challenge: what breaks? → `project-dashboard-card` pill tests (`partnerBarWidthPercent`/`fillPercent`/`barColor` specs) and their aria/data attributes. Design answers: tasks must migrate those specs to builder-output assertions in the same task as the markup change, never orphan them. If OQ-2-B wins, nothing is removed and this challenge is void.

## 13. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 7 |
| LOC — production | ~450–650 (fix ~80 · migration ~150–250 if OQ-2-A · reorder+acts ~200–300) |
| LOC — test | ~700–1,000 (≈1.5× prod — KZ lesson from F4: test code dominates under KZ-001/K-004/KZ-015 gates) |
| Review rounds | 2 |

Depth re-check: Full holds (cross-cutting layout + Bug Mode + HITL-heavy). Tripwire armed for `/akili-execute`.

## 14. Open questions

OQ-1 / OQ-2 — resolved at the mockup gate (this phase's approval), recorded as D-DN-6 upon decision.

## 15. References

`./requirements.md` · probe evidence in requirements §1 · archived family `2026-08-24-changes--project-dashboard-v3*` (idiom sources) · Kaizen applied: KZ-001, KZ-002, KZ-014, KZ-015, K-004, F4 lessons 1-2 (assumption-probe at specify — practiced here; prod/test LOC split — practiced here).

### D-DN-6 — OQ resolutions (owner, mockup gate 2026-08-24)

| OQ | Decision | Consequence |
|---|---|---|
| OQ-1 | **A — status semaphore lives IN the hero** (act 1 answers "¿cómo va?" at a glance) | Standalone status card retires; its strip + legend + drill links move into the hero; `md:` behavior verified at HITL (R-1 risk) |
| OQ-2 | **A — rankings migrate to viz-chart** (one engine everywhere) | Top regions/countries + partner/contact pills become viz-chart horizontal bars (F1 rankings builder family); pill specs migrate in the same task (reversion challenge 2); the ONLY declared non-echarts idiom left is the hero **composition strip** |
