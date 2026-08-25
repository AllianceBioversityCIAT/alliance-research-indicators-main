# Requirements — Changes / Chart Explainers

- **Module:** changes (client-only: `project-detail` dashboard + `shared/components`)
- **Spec id:** 2026-08-chart-explainers
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Linked PRD section:** `docs/prd.md` §3.2 (MEL aggregate views), §3.5 (human federation consumers), AC-Accessibility, AC-Theming
- **Linked tickets:** none (user request 2026-08-24; see `./proposal.md`)
- **Depth:** Standard
- **Approval Mode:** gated
- **Last updated:** 2026-08-25
- **Extends:** archived `project-dashboard-redesign` and `dashboard-advanced-analytics` (the section content being explained). **Sequenced after** `changes/executive-overview-grounded-context` (same host file; now committed at `d48ca945`, so `project-dashboard.component.*` is a normal shared-file dependency, not an in-flight conflict).
- **Re-scoped 2026-08-25:** owner-directed pivot from a per-chart explainer (33 surfaces, 38 keys) to a **per-section** explainer (6 Act headers). See design.md D-CXP-10 for the decision record; this document reflects the section-level design going forward — it is not a changelog of the pivot.

---

## 1. Context

The project dashboard groups its content into **6 numbered "Act" sections** (`act-1-identity` … `act-6-depth`, each a `<section aria-labelledby="act-N-title">` with an `<h2>` header) — Identity, Production, Reach, Direction, Quality, and Depth. Every Act renders one or more charts, cards, or lists, but **nothing explains what a given Act is showing as a whole** — what its charts collectively encode, how to read them, which results are counted. Non-analyst readers (Center Admins, PIs, donor viewers) are the dashboard's audience and currently have to guess.

This spec adds one consistent **"?" explainer** affordance beside each Act's `<h2>`: a keyboard/touch-reachable button that opens a short plain-language explanation of that section, with the same text also exposed to assistive technology. Copy is static, curated, and versioned in the repo.

**Not changing:** chart data, options, click-through behavior, card layout, the `viz-chart` engine (untouched — no per-chart explainer input), any server endpoint. No i18n framework (client has none — child guide "i18n: not yet wired").

Verified in code 2026-08-25 (scout): `project-dashboard.component.html` has exactly 6 `<h2 id="act-N-title">` headers, one per Act, each inside a `<section aria-labelledby="act-N-title">`; the `chart-explainer` component and service (T-01, committed `5fcc730b`) are reusable as-is — nothing about their contract assumed a per-chart placement.

---

## 2. Requirement numbering

`R-CXP-<NNN>` — Chart eXPlainer. `NFR-CXP-<NNN>` for non-functional.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Act section** | One of the 6 top-level `<section aria-labelledby="act-N-title">` blocks in `project-dashboard.component.html`, each with its own `<h2 id="act-N-title">` header: Act 1 Identity, Act 2 Production, Act 3 Reach, Act 4 Direction, Act 5 Quality, Act 6 Depth. This is the unit an explainer describes — **not** an individual chart. |
| **Explainer** | The `?` button + its popover + the assistive-tech description, for one Act section. |
| **Explainer key** | A stable string identifier for one Act section, mapping to one registry entry: `act-1-identity` … `act-6-depth`. Fixed one-to-one with the 6 Acts — there is no multi-instance case (contrast with the archived per-chart design, where the same component rendered several keyed instances). |
| **Registry** | The single typed constant holding every explainer's copy — now 6 entries, one per Act. |
| **Host** | `project-dashboard.component.html` — the only template that renders `<app-chart-explainer>` in this spec. |

---

## 4. System context & scope

| In scope | Out of scope |
| --- | --- |
| Reuse of the existing shared explainer component (T-01, unchanged) | Any server change |
| Explainer wiring on all 6 Act section headers of `/project-detail/:id` dashboard | Per-chart explainers (superseded — design.md D-CXP-10) |
| Copy registry with one entry per Act (6 total) | AI-generated / dynamic descriptions |
| a11y semantics (button name, expanded state, description linkage, focus return, Esc) — unchanged from T-01, applied at section scope | Translations (registry shaped to allow later; EN only — OQ-2 of proposal accepted as "EN only") |
| `docs/ux-ui/design.md` §8.1 + §12.2 entries | Redesign of Act headers beyond inserting the button |
| Unit tests + HITL light/dark visual check | E2E / visual-regression tooling; `viz-chart` or `project-dashboard-card` changes (none needed) |

**Personas served:** MEL Regional Expert (PRD §3.2), Center/General Admin (§3.3), human federation consumers / donor analysts (§3.5). Result Contributors benefit incidentally.

---

## 5. Functional requirements

### R-CXP-001 — Every Act section has an explainer button

- **As a** dashboard reader
- **I want** a visible `?` control beside each Act's heading
- **So that** I can learn what that part of the dashboard is showing, without leaving the page

**Details:**
- Behavior:
  - Each of the dashboard's **6 Act sections** renders exactly one explainer button, placed beside its `<h2 id="act-N-title">` heading (`placement="inline"`, matching T-01's existing header-slot pattern — no new placement mode).
  - The button is icon-only (`?` glyph), minimum **32×32 px** hit target (correcting a stale 24 px figure in an earlier draft of this requirement — design.md D-CXP-4 already fixed 32 px as the authoritative hit area for the T-01 component; this document now matches it), with an accessible name of the form `Explain this chart: <Act title>` (the component's existing aria-label convention — "chart" here reads as "this part of the dashboard").
  - The button renders whenever its Act section renders, in any data state inside that section (some content loaded, some empty, some erroring) **and is hidden only while the whole dashboard is loading** (`getProjectDetailService.loading()`) — an explanation of a page that has not appeared yet is noise.
  - A key with no registry entry renders **no button** (fail-closed, unchanged from T-01) — the registry-completeness gate (R-CXP-004) makes that state unreachable in the shipped set.

**Acceptance criteria:**
- [ ] AC.1 — On a loaded dashboard with every Act visible, the count of explainer buttons is **6**, one per Act section. Verified by a test that mounts the dashboard with all 6 Acts' render conditions satisfied and asserts one button per `<section aria-labelledby="act-N-title">`.
- [ ] AC.2 — Each button has `aria-label` starting with `Explain this chart:` followed by the Act's title (e.g. `Explain this chart: Reach`).
- [ ] AC.3 — While `getProjectDetailService.loading()` is true, no explainer button is rendered anywhere on the dashboard; once loaded, each visible Act's button renders.
- [ ] AC.4 — The button's computed hit target is ≥ 32×32 CSS px (asserted from class/size attributes in jsdom **and** confirmed visually at the HITL pause — jsdom cannot measure layout).

#### Scenario: Act section that can disappear entirely
- GIVEN Act 3 ("Reach") has no geo-scope data and no visible ranking cards, so its `@if` guard renders nothing
- WHEN the dashboard renders
- THEN Act 3's `<section>` — and with it, Act 3's explainer — is absent from the DOM
- AND this is accepted behavior, not a defect: R-CXP-001's "renders on empty" rule means *the section's own content may be empty and the explainer still shows*, not that the explainer forces a section that would otherwise be entirely absent to render
- BUT it must NOT render Act 3's `?` while the dashboard's overall loading skeleton is visible
- AND IT MUST render at most one `?` per Act even when that Act's own content re-renders (e.g. an internal view-mode toggle inside Act 2 does not create a second Act 2 button).

#### Scenario: Six distinct keys, no shared copy
- GIVEN all 6 Act explainers are registered
- WHEN each renders
- THEN each carries its own key (`act-1-identity` … `act-6-depth`) and its own copy
- BUT it must NOT share a generic "this section has charts" explanation across Acts — each entry's `what` names what that specific Act's content shows.

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
  - The Act's `<section aria-labelledby="act-N-title">` carries `aria-describedby` referencing a **persistent** (always-rendered, visually hidden) element holding the full explainer text — so the description is available even when the popover is closed and even to a reader who never opens it.

**Acceptance criteria:**
- [ ] AC.1 — Closed: button has `aria-expanded="false"` and no `aria-controls`; open: `aria-expanded="true"` and `aria-controls` equals the panel `id`. (Unchanged from T-01.)
- [ ] AC.2 — For each of the 6 Act `<section>` elements, `aria-describedby` resolves to an element whose text equals that Act's registry entry, concatenated sentences, with the popover closed.
- [ ] AC.3 — The linkage in AC.2 is present for both an unconditionally-rendered Act (e.g. Act 1) and a conditionally-rendered one (e.g. Act 3) whenever that Act's `<section>` is in the DOM at all.
- [ ] AC.4 — A `chart-explainer` instance with no registry entry for its key emits no button and, by extension, nothing for a host to point `aria-describedby` at (fail-closed, unchanged from T-01) — a section is never left with a dangling `aria-describedby` reference to an explainer that failed to render.

#### Scenario: Description available while closed
- GIVEN Act 6 ("Depth") is rendered and its explainer is closed
- WHEN assistive tech reads Act 6's `<section>`
- THEN the description text is announced via `aria-describedby`
- BUT it must NOT duplicate the description inside any of Act 6's own chart captions (one source, one linkage — the section-level description, not a per-chart one)
- AND IT MUST keep the description element visually hidden (`sr-only`), not `display:none` (which removes it from the accessibility tree).

---

### R-CXP-004 — Single typed copy registry with a completeness gate

- **As a** maintainer / reviewer
- **I want** every explanation in one typed file
- **So that** copy is reviewable in one place and no chart can silently ship without one

**Details:**
- Behavior:
  - One constant `CHART_EXPLAINERS` typed as `Record<ChartExplainerKey, ChartExplainer>` where `ChartExplainerKey` is a **string-literal union of 6 members** (`act-1-identity` … `act-6-depth`) — a key used in a template that is not in the union is a compile-time error (`strictTemplates`).
  - Each entry: `title`, `what`, `howToRead`, `source` (each a single sentence), optional `emptyHint`.
  - Each entry records `derivedFrom` — the archived spec section(s) whose charts that Act contains, checked for semantic accuracy (KZ-007: descriptions propagate as fact; cite the source). Since one Act's `what` now speaks for several charts collectively, `derivedFrom` may cite more than one archived section.
  - A completeness test enumerates the keys **used in `project-dashboard.component.html`** (the only template that renders `<app-chart-explainer>` in this spec — by reading the template source, not by rendering) and asserts each exists in the registry, and that every registry key is used at least once (no dead copy).

**Acceptance criteria:**
- [ ] AC.1 — `npm run build` fails when the template passes a key outside `ChartExplainerKey`. **Falsifying input:** pass `key="not-a-key"` on one Act's `<app-chart-explainer>` — build must red.
- [ ] AC.2 — The completeness test fails when any template-used key is missing from the registry. **Falsifying input:** delete one registry entry — test must red (observed and recorded in `execution.md` per K-004).
- [ ] AC.3 — The completeness test fails when the registry holds a key the template never uses. **Falsifying input:** add an entry `zzz-unused`.
- [ ] AC.4 — Every entry has non-empty `what`, `howToRead`, `source`, `derivedFrom`; each sentence ≤ 220 characters (a table-driven test over the registry).

#### Scenario: A 7th Act is added later without copy
- GIVEN a developer adds a new `<section aria-labelledby="act-7-title">` with `<app-chart-explainer key="act-7-new">`
- WHEN they run `npm run build`
- THEN the build fails on the unknown key
- AND IT MUST fail again in the completeness test if they add the union member but not the registry entry
- BUT it must NOT fail for a `chart-explainer` used elsewhere with a key that already has a registry entry (the pattern itself stays legal to reuse outside this dashboard; only an unregistered key is rejected).

---

### R-CXP-005 — Plain-language copy standard

- **As a** non-analyst reader
- **I want** explanations in everyday language
- **So that** I understand the chart in one read

**Details:**
- Behavior — every entry MUST follow, describing its Act's content **collectively** (an Act typically holds several charts/cards; the entry is one explanation for the section, not per chart):
  1. **What it shows** — names the *kind of content* and the *unit*, spanning what the Act actually contains ("This section ranks partner institutions, main contacts, and contributing projects by how many results name them.").
  2. **How to read it** — the shared encoding + any interaction across the Act's content ("Longer bars and darker cells mean more results; click a bar or cell to open those results.").
  3. **Source / caveat** — which results are counted and the known blind spot ("Counts every result except Rejected ones; a project with no data in a category shows that part empty.").
  - Plain-language rules (authored with `cognitive-doc-design`): no unglossed acronym (IRL, SP, AOW, HLO, OICR get a gloss on first use in that entry), no chart-jargon ("bipartite", "treemap", "funnel", "heatmap") without a plain paraphrase, active voice, ≤ 3 sentences, second person allowed.
  - Semantics verified against the archived spec(s) that defined the Act's charts (KZ-007) — the `derivedFrom` field is the audit trail.

**Acceptance criteria:**
- [ ] AC.1 — A reviewer reads **100 %** of entries (6, not a sample) against the archived spec(s) cited in `derivedFrom` and records PASS per entry in `execution.md`. **No automated gate exists for semantic truth** — this is a declared human check (see §7 defect classes).
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
  - Button: `--ac-grey-700` glyph at rest; `--ac-light-blue-400` on hover/focus; focus ring `focus-visible:ring-2 ring-[var(--ac-light-blue-400)]` (dashboard convention); transparent background; circular 32 px (matching the T-01 implementation's `h-8 w-8`, not the earlier 24 px draft figure).
  - Popover: PrimeNG Aura `p-popover` surface (already themed light/dark); title in `--ac-primary-blue-600` Barlow 13 px 600 (matches the KPI popover header); body text `--ac-grey-700` Barlow 14 px (design.md §7.1 `.description`).
  - No hex literals; no new tokens; no bespoke animation (respects `prefers-reduced-motion` by inheriting Aura).

**Acceptance criteria:**
- [ ] AC.1 — `grep -nE '#[0-9a-fA-F]{3,8}\b' <new component files>` returns nothing.
- [ ] AC.2 — HITL light **and** dark screenshots of: all 6 Act explainers closed (one full-dashboard pass), at least one open, and an Act in its "section absent" state (Act 2 or Act 3 with nothing to render) — attached in `execution.md` before the task checkbox flips (KZ-014).
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
| D6 | Hit target < 32 px, clipped popover, bad contrast in dark mode | **jsdom cannot see any of these.** HITL light/dark screenshots + keyboard pass (R-CXP-006 AC.2/AC.3). T6 Multimodal review if the session host cannot view images | Human, declared |
| D7 | Duplicate `?` for one Act after its internal content re-renders (e.g. Act 2's Bars/Heatmap toggle, Act 4's SDG-coverage refresh) | Unit test exercising each Act's own re-render trigger and asserting its explainer button count stays 1 (R-CXP-001 `AND IT MUST` clause) | Automated |
| D8 | Build/type errors hidden by the test suite (K-002) | `npm run build` **and** `npx tsc -p tsconfig.spec.json --noEmit` against the 938 baseline (re-measured after T-01 landed; re-verify before use since it drifts) | Automated |
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
| A-2 | An Act's own empty/error/mixed content states *do* still show that Act's explainer, as long as the Act's `<section>` itself renders (proposal OQ-1 → accepted; re-affirmed at the section level by the 2026-08-25 pivot). |
| DEP-1 | `changes/executive-overview-grounded-context` shared `project-dashboard.component.*` — now committed (`d48ca945`); no longer an in-flight conflict, just a normal shared-file dependency going forward. |
| RISK-1 | Copy drift (D2) — mitigated by `derivedFrom` + 100 % review. |
| RISK-2 | PrimeNG `p-popover` `onHide` timing vs focus return — mitigated by driving focus from the component's own close path, not only from `onHide`. Unaffected by the pivot (T-01 component reused unchanged). |
| RISK-3 | **Closed by the 2026-08-25 pivot.** The original concern (a `?` on each of 20 deep-dive charts feels dense) no longer applies — the deep-dive grid gets no per-chart explainers at all; Act 6 ("Depth") carries one section-level explainer instead. |

---

## 10. Open questions

- **OQ-1** (owner: J. Cadavid, by first HITL pause) — Popover on **hover** as an additional (non-primary) trigger for mouse users? Default: **no** — click/keyboard only, to avoid hover/focus double-open jitter. Revisit if users ask.

---

## 11. Requirement ID index

| ID | Title | Tasks (filled by `tasks.md`) |
| --- | --- | --- |
| R-CXP-001 | Every Act section has an explainer button | T-02, T-03 |
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
