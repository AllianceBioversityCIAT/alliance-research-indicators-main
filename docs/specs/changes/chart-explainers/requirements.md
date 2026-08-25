# Requirements — Changes / Chart Explainers

- **Module:** changes (client-only: `project-detail` dashboard + `shared/components`)
- **Spec id:** 2026-08-chart-explainers
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Linked PRD section:** `docs/prd.md` §3.2 (MEL aggregate views), §3.5 (human federation consumers), AC-Accessibility, AC-Theming
- **Linked tickets:** none (user request 2026-08-24; see `./proposal.md`)
- **Depth:** Standard
- **Approval Mode:** gated
- **Last updated:** 2026-08-24
- **Extends:** archived `project-dashboard-redesign` and `dashboard-advanced-analytics` (the charts being explained). **Sequenced after** `changes/executive-overview-grounded-context` (same host file).

---

## 1. Context

The project dashboard renders **≈33 data-viz surfaces** (31 `viz-chart` instances + the status composition strip + the geo map) across 7 host components. Each has a title and an sr-only data table, but **none explains what the graphic means** — what a heatmap cell or a bipartite edge encodes, how to read it, which results are counted. Non-analyst readers (Center Admins, PIs, donor viewers) are the dashboard's audience and currently have to guess.

This spec adds one consistent **"?" explainer** affordance next to every chart: a keyboard/touch-reachable button that opens a short plain-language explanation, with the same text also exposed to assistive technology. Copy is static, curated, and versioned in the repo.

**Not changing:** chart data, options, click-through behavior, card layout, the `viz-chart` engine, any server endpoint. No i18n framework (client has none — child guide "i18n: not yet wired").

Verified in code 2026-08-24 (scout): `app-viz-chart` has **zero** usages outside `project-detail/`; `viz-chart` renders **no visible title** (`chartTitle` feeds only the sr-only table `aria-label`); the existing KPI `p-popover` trigger carries **no `aria-expanded`/`aria-controls`** — that precedent is reused for chrome, not for a11y semantics.

---

## 2. Requirement numbering

`R-CXP-<NNN>` — Chart eXPlainer. `NFR-CXP-<NNN>` for non-functional.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Chart surface** | Anything the dashboard renders as a data visualization: a `viz-chart` instance, the status composition strip (`figure[role=img]`), the geo map. KPI tiles and progress meters are **not** chart surfaces (design.md §8.1 registry). |
| **Explainer** | The `?` button + its popover + the assistive-tech description, for one chart surface. |
| **Explainer key** | A stable string identifier for one chart surface, mapping to one registry entry. Surfaces rendered by the same component with different data (e.g. the four `viz-bar` cards) have **distinct** keys. |
| **Registry** | The single typed constant holding every explainer's copy. |
| **Host** | The component whose template decides where the `?` sits for a given surface. |

---

## 4. System context & scope

| In scope | Out of scope |
| --- | --- |
| New shared explainer component | Any server change |
| Explainer wiring on every chart surface of `/project-detail/:id` dashboard | Charts on other routes (none exist today — verified) |
| Copy registry with one entry per surface | AI-generated / dynamic descriptions |
| a11y semantics (button name, expanded state, description linkage, focus return, Esc) | Translations (registry shaped to allow later; EN only — OQ-2 of proposal accepted as "EN only") |
| `docs/ux-ui/design.md` §8.1 + §12.2 entries | Redesign of card headers beyond inserting the button |
| Unit tests + HITL light/dark visual check | E2E / visual-regression tooling |

**Personas served:** MEL Regional Expert (PRD §3.2), Center/General Admin (§3.3), human federation consumers / donor analysts (§3.5). Result Contributors benefit incidentally.

---

## 5. Functional requirements

### R-CXP-001 — Every chart surface has an explainer button

- **As a** dashboard reader
- **I want** a visible `?` control beside every chart
- **So that** I can learn what the graphic means without leaving the page

**Details:**
- Behavior:
  - Every chart surface on the project dashboard renders exactly one explainer button, visually adjacent to the surface's title (when the host has a title row) or in the surface's own top-right corner (when it has none — deep-dive grid, insights cards, geo list-variant rankings, geo map).
  - The button is icon-only (`?` glyph), minimum **24×24 px** hit target, with an accessible name of the form `Explain this chart: <chart title>`.
  - The button renders in every data state of the surface (loaded, empty, error) **and is hidden during the loading skeleton** — an explanation of a chart that has not appeared yet is noise; an explanation of an *empty* chart is exactly when the reader needs it.
  - A surface whose explainer key has no registry entry renders **no button** (fail-closed) — and the registry-completeness gate (R-CXP-004) makes that state unreachable in the shipped set.

**Acceptance criteria:**
- [ ] AC.1 — On a loaded dashboard, the count of explainer buttons equals the count of chart surfaces enumerated in design.md §5 (33 surfaces, 38 keys once multi-instance cards are counted per key). Verified by a test that mounts each host with its surfaces present and asserts one button per surface.
- [ ] AC.2 — Each button has `aria-label` starting with `Explain this chart:` followed by the surface's title.
- [ ] AC.3 — While the host reports `loading`, no explainer button is rendered for that surface; once loaded (or empty/error), it is.
- [ ] AC.4 — The button's computed hit target is ≥ 24×24 CSS px (asserted from class/size attributes in jsdom **and** confirmed visually at the HITL pause — jsdom cannot measure layout).

#### Scenario: Explainer present on an empty chart
- GIVEN the "Top primary levers" card has zero items and shows its empty message
- WHEN the dashboard renders
- THEN the card still shows its `?` explainer
- AND the explanation's third sentence tells the reader why the chart may be empty
- BUT it must NOT render the `?` while the card's loading skeleton is visible
- AND IT MUST render at most one `?` per surface even when the host re-renders (signal churn, view-mode toggle).

#### Scenario: Multi-instance host, distinct keys
- GIVEN `project-dashboard-card` is instantiated for "Top partner institution" and for "Top contributing projects"
- WHEN both render
- THEN each carries its own key and its own copy
- BUT it must NOT share a generic "ranked list" explanation across both.

---

### R-CXP-002 — Explainer popover: open, read, close, focus return

- **As a** keyboard, mouse, or touch user
- **I want** the explainer to open on activation and close predictably
- **So that** it never traps me or loses my place

**Details:**
- Behavior:
  - Activation (click, `Enter`, `Space`) toggles a popover anchored to the button, max width **340 px**, appended to `body` so nested cards never clip it.
  - Popover content, in order: the chart title as a heading; then 1–3 sentences structured **what it shows → how to read it → data source / caveat** (R-CXP-005).
  - Close on: `Escape` (from anywhere while open), click outside, second activation of the same button, activation of a different surface's button (only one explainer open at a time).
  - On any close, **keyboard focus returns to the button that opened it**.
  - Opening one explainer while another is open closes the first.

**Acceptance criteria:**
- [ ] AC.1 — Activating the button shows the popover containing the title heading and the registry text for that key.
- [ ] AC.2 — `Escape` closes an open popover and `document.activeElement` is the originating button afterwards. **Falsifying input (K-012):** remove the focus-return call — the test must go red on `activeElement`.
- [ ] AC.3 — A second activation closes it; focus stays on the button.
- [ ] AC.4 — Opening explainer B while A is open leaves exactly one popover in the DOM.
- [ ] AC.5 — Outside click closes it (delegated to PrimeNG `p-popover`; asserted via its `onHide` → focus-return path rather than re-testing PrimeNG).

#### Scenario: Keyboard-only walkthrough
- GIVEN focus is on the "Results over time" explainer button
- WHEN the user presses `Enter`, reads, then presses `Escape`
- THEN the popover appears, then disappears
- AND focus is back on the same button
- BUT it must NOT move focus into the popover automatically on open (the reader may just want to glance)
- AND IT MUST close on `Escape` even if focus moved elsewhere on the page while it was open (document-level listener — the same lesson as the `executiveOverviewReader` FAIL on this branch).

#### Scenario: Only one open at a time
- GIVEN the heatmap explainer is open
- WHEN the user clicks the trend-chart explainer
- THEN the heatmap explainer closes and the trend explainer opens
- BUT it must NOT return focus to the heatmap button (focus follows the user's latest action).

---

### R-CXP-003 — Assistive-technology exposure without opening

- **As a** screen-reader user
- **I want** the explanation available from the chart itself
- **So that** I do not have to discover and operate a popover to understand the graphic

**Details:**
- Behavior:
  - The button exposes `aria-expanded` (`true`/`false`) and, while open, `aria-controls` pointing at the popover panel's `id`.
  - The popover panel has `role="dialog"`-free, non-modal semantics: a container with `role="region"` and `aria-labelledby` the title heading (matching the KPI popover precedent's region pattern).
  - The chart surface's accessible container (the `viz-chart` sr-only table, the status `figure`, the map wrapper) carries `aria-describedby` referencing a **persistent** (always-rendered, visually hidden) element holding the full explainer text — so the description is available even when the popover is closed.

**Acceptance criteria:**
- [ ] AC.1 — Closed: button has `aria-expanded="false"` and no `aria-controls`; open: `aria-expanded="true"` and `aria-controls` equals the panel `id`.
- [ ] AC.2 — For a wired `viz-chart`, the sr-only table's `aria-describedby` resolves to an element whose text equals the registry entry's concatenated sentences, with the popover closed.
- [ ] AC.3 — The status composition strip's `figure` and the geo map wrapper carry the same linkage.
- [ ] AC.4 — No `aria-describedby` is emitted when no key is provided (unchanged behavior for a keyless `viz-chart`).

#### Scenario: Description available while closed
- GIVEN the indicator × year heatmap is rendered and its explainer is closed
- WHEN assistive tech reads the chart's sr-only table
- THEN the description text is announced via `aria-describedby`
- BUT it must NOT duplicate the description inside the table caption (one source, one linkage)
- AND IT MUST keep the description element visually hidden (`sr-only`), not `display:none` (which removes it from the accessibility tree).

---

### R-CXP-004 — Single typed copy registry with a completeness gate

- **As a** maintainer / reviewer
- **I want** every explanation in one typed file
- **So that** copy is reviewable in one place and no chart can silently ship without one

**Details:**
- Behavior:
  - One constant `CHART_EXPLAINERS` typed as `Record<ChartExplainerKey, ChartExplainer>` where `ChartExplainerKey` is a **string-literal union** — a key used in a template that is not in the union is a compile-time error (`strictTemplates`).
  - Each entry: `title`, `what`, `howToRead`, `source` (each a single sentence), optional `emptyHint`.
  - Each entry records `derivedFrom` — the archived spec section / component the semantics were checked against (KZ-007: descriptions propagate as fact; cite the source).
  - A completeness test enumerates the keys **used in the seven host templates** (by reading the template sources, not by rendering) and asserts each exists in the registry, and that every registry key is used at least once (no dead copy).

**Acceptance criteria:**
- [ ] AC.1 — `npm run build` fails when a template passes a key outside `ChartExplainerKey`. **Falsifying input:** pass `explainerKey="not-a-key"` in one template — build must red.
- [ ] AC.2 — The completeness test fails when any host-template key is missing from the registry. **Falsifying input:** delete one registry entry — test must red (observed and recorded in `execution.md` per K-004).
- [ ] AC.3 — The completeness test fails when the registry holds a key no template uses. **Falsifying input:** add an entry `zzz-unused`.
- [ ] AC.4 — Every entry has non-empty `what`, `howToRead`, `source`, `derivedFrom`; each sentence ≤ 220 characters (a table-driven test over the registry).

#### Scenario: A new chart is added later without copy
- GIVEN a developer adds a new `app-viz-chart` to `insights-section` with `explainerKey="insights-new"`
- WHEN they run `npm run build`
- THEN the build fails on the unknown key
- AND IT MUST fail again in the completeness test if they add the union member but not the registry entry
- BUT it must NOT fail for a `viz-chart` that intentionally passes no key (keyless remains legal for future non-dashboard uses).

---

### R-CXP-005 — Plain-language copy standard

- **As a** non-analyst reader
- **I want** explanations in everyday language
- **So that** I understand the chart in one read

**Details:**
- Behavior — every entry MUST follow:
  1. **What it shows** — names the *mark* and the *unit* ("Each bar is one institution; its length is how many results name it as a partner.").
  2. **How to read it** — the encoding + any interaction ("Darker blue means more results. Click a cell to open those results.").
  3. **Source / caveat** — which results are counted and the known blind spot ("Counts every result except Rejected ones; a project with no partner data shows an empty chart.").
  - Plain-language rules (authored with `cognitive-doc-design`): no unglossed acronym (IRL, SP, AOW, HLO, OICR get a gloss on first use in that entry), no chart-jargon ("bipartite", "treemap", "funnel") without a plain paraphrase, active voice, ≤ 3 sentences, second person allowed.
  - Semantics verified against the archived spec that defined the chart (KZ-007) — the `derivedFrom` field is the audit trail.

**Acceptance criteria:**
- [ ] AC.1 — A reviewer reads **100 %** of entries (not a sample) against the archived chart spec cited in `derivedFrom` and records PASS per entry in `execution.md`. **No automated gate exists for semantic truth** — this is a declared human check (see §7 defect classes).
- [ ] AC.2 — A lint-style test asserts: no entry contains `bipartite|treemap|funnel|heatmap` without an accompanying parenthetical or "—" gloss in the same sentence; no entry exceeds 3 sentences.

#### Scenario: Acronym glossed
- GIVEN the "Readiness levels (IRL)" entry
- WHEN its `what` sentence is rendered
- THEN "IRL" appears with a gloss ("Innovation Readiness Level, 1 = idea to 9 = proven at scale") on first use
- BUT it must NOT restate the gloss in every sentence.

---

### R-CXP-006 — Visual treatment uses existing tokens; light + dark

- **As a** designer / maintainer
- **I want** the explainer to look native to the dashboard cards
- **So that** it reads as one system in both themes

**Details:**
- Behavior:
  - Button: `--ac-grey-700` glyph at rest; `--ac-light-blue-400` on hover/focus; focus ring `focus-visible:ring-2 ring-[var(--ac-light-blue-400)]` (dashboard convention); transparent background; circular 24 px.
  - Popover: PrimeNG Aura `p-popover` surface (already themed light/dark); title in `--ac-primary-blue-600` Barlow 13 px 600 (matches the KPI popover header); body text `--ac-grey-700` Barlow 14 px (design.md §7.1 `.description`).
  - No hex literals; no new tokens; no bespoke animation (respects `prefers-reduced-motion` by inheriting Aura).

**Acceptance criteria:**
- [ ] AC.1 — `grep -nE '#[0-9a-fA-F]{3,8}\b' <new component files>` returns nothing.
- [ ] AC.2 — HITL light **and** dark screenshots of at least: a card-header explainer, a deep-dive grid explainer, a list-variant geo ranking explainer, one open popover — attached in `execution.md` before the task checkbox flips (KZ-014).
- [ ] AC.3 — Contrast of glyph-at-rest on `--ac-white-1` (light) and `--ac-background` (dark) ≥ 3:1 (UI icon threshold, design.md §10.1) — checked with `npm run tokens:validate`-style computation **or** by hand at the HITL pause; jsdom cannot measure it.

---

### R-CXP-007 — Pattern registered in the design baseline

- **As an** agent / contributor
- **I want** the explainer documented in `docs/ux-ui/design.md`
- **So that** the §8.1 rule ("a new pattern must extend a shared component or be documented in §12 and added to the inventory in the same change") is honored

**Acceptance criteria:**
- [ ] AC.1 — §8.1 client component inventory lists `chart-explainer` with its purpose and the rule "every chart surface passes an explainer key".
- [ ] AC.2 — §12.2 gains a dated decision entry citing this spec and D-CXP decisions.
- [ ] AC.3 — §10.1 gains one line: "chart explanations are exposed via `aria-describedby`, not only via the popover".

---

## 6. Non-functional requirements

### NFR-CXP-001 — Accessibility
- **Category:** a11y
- **Target:** WCAG 2.1 AA (PRD C-4, AC-Accessibility): keyboard reachable, visible focus, accessible name, no trap, description available non-visually.
- **How verified:** unit tests (R-CXP-002/003 ACs) + keyboard walkthrough at the HITL pause. No `jest-axe` in the repo — do not add one for this spec; hand-written DOM assertions are the convention.

### NFR-CXP-002 — Bundle budget
- **Category:** performance
- **Target:** no change to the initial bundle (component lives in the lazy project-dashboard chunk's import graph; registry is tree-shaken into that chunk). Component styles ≤ 4 kB warning budget.
- **How verified:** `npm run build` budget output; compare the `project-dashboard` lazy chunk size before/after — **disqualifier:** if the diff is within the run-to-run noise of the build (measure baseline twice first), report the spread, not a number.

### NFR-CXP-003 — No behavior regression on charts
- **Category:** reliability
- **Target:** existing `viz-chart`, card, and dashboard specs stay green unchanged except for additive assertions.
- **How verified:** `npm test -- --silent` full client suite, run by the Leader in isolation (no concurrent workers — §4.3 concurrency rule).

---

## 7. Defect classes and the gate for each

| # | Defect class this spec can produce | Gate | Coverage |
| --- | --- | --- | --- |
| D1 | A surface ships without an explainer (missing key) | Completeness test (R-CXP-004 AC.2) + `strictTemplates` build (AC.1) | Automated |
| D2 | Wrong copy — explanation does not match what the chart encodes | **None automated.** 100 % human review against `derivedFrom` (R-CXP-005 AC.1) at the Reviewer step | Human, declared |
| D3 | Jargon / unglossed acronyms | Lint-style registry test (R-CXP-005 AC.2) — catches the listed terms only; **cannot reach** unlisted jargon → residual accepted risk, mitigated by D2's review | Partial + human |
| D4 | Focus not returned / Esc not handled / two popovers open | Unit tests arranging the **transition** open→close (KZ-015), R-CXP-002 ACs | Automated |
| D5 | Missing `aria-*` linkage | Unit tests R-CXP-003 ACs (presence assertions — they prove the attribute exists and resolves, **not** that a screen reader announces it; the HITL keyboard/SR pass covers announcement) | Automated + human |
| D6 | Hit target < 24 px, clipped popover in nested cards, bad contrast in dark mode | **jsdom cannot see any of these.** HITL light/dark screenshots + keyboard pass (R-CXP-006 AC.2/AC.3). T6 Multimodal review if the session host cannot view images | Human, declared |
| D7 | Duplicate `?` after re-render / view-mode toggle | Unit test toggling Bars↔Heatmap and asserting button count (R-CXP-001 empty-chart scenario `AND IT MUST`) | Automated |
| D8 | Build/type errors hidden by the test suite (K-002) | `npm run build` **and** `npx tsc -p tsconfig.spec.json --noEmit` against the 945 baseline | Automated |
| D9 | Bundle budget regression | `npm run build` budgets (NFR-CXP-002) | Automated, with disqualifier |

Accepted, unsubstituted risk: **none**. D3's residual is covered by D2.

---

## 8. Data / API surface / cross-system impact

- **Data:** none. **API:** none. **Server:** untouched.
- **STAR client:** this *is* the client spec. No socket events.

---

## 9. Assumptions, dependencies, risks

| Item | Note |
| --- | --- |
| A-1 | English-only copy is acceptable for this release (proposal OQ-2 → accepted; the registry's shape allows a locale layer later). |
| A-2 | Empty/error states *do* show the explainer (proposal OQ-1 → accepted). |
| DEP-1 | `changes/executive-overview-grounded-context` shares `project-dashboard.component.*` — **land it first**; this spec is `Parallel-safe: no` with it. |
| RISK-1 | Copy drift (D2) — mitigated by `derivedFrom` + 100 % review. |
| RISK-2 | PrimeNG `p-popover` `onHide` timing vs focus return — mitigated by driving focus from the component's own close path, not only from `onHide`. |
| RISK-3 | The deep-dive grid has 19 charts with no headings; a `?` per chart could feel dense — mitigated by the top-right in-surface placement at 24 px and a HITL density check (Adjust point if the user dislikes it). |

---

## 10. Open questions

- **OQ-1** (owner: J. Cadavid, by first HITL pause) — Popover on **hover** as an additional (non-primary) trigger for mouse users? Default: **no** — click/keyboard only, to avoid hover/focus double-open jitter. Revisit if users ask.

---

## 11. Requirement ID index

| ID | Title | Tasks (filled by `tasks.md`) |
| --- | --- | --- |
| R-CXP-001 | Every chart surface has an explainer button | T-02, T-03 |
| R-CXP-002 | Popover open/close/focus return | T-01 |
| R-CXP-003 | AT exposure without opening | T-01, T-02 |
| R-CXP-004 | Typed registry + completeness gate | T-02 |
| R-CXP-005 | Plain-language copy standard | T-03 |
| R-CXP-006 | Tokens, light + dark | T-01, T-04 |
| R-CXP-007 | Design baseline registration | T-04 |
| NFR-CXP-001 | Accessibility | T-01, T-04 |
| NFR-CXP-002 | Bundle budget | T-04 |
| NFR-CXP-003 | No chart regression | T-04 |

---

## 12. Sign-off

- [ ] Engineering lead — J. Cadavid
- [ ] MEL / product owner — <tbd>
- Security review — n/a (no auth/secrets)
- DevOps — n/a (no infra)
