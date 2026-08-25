# Tasks — Changes / Chart Explainers

- **Module:** changes (client-only)
- **Spec id:** 2026-08-chart-explainers
- **Status:** not-started
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Depth:** Standard · **Approval Mode:** gated
- **Budget (design §12):** 4 tasks · ≈ 400 LOC · 2 review rounds per phase — exceeding any of these **stops and escalates**
- **Sequencing:** `changes/executive-overview-grounded-context` has landed and is committed (`d48ca945`) — `project-dashboard.component.*` is a normal shared-file dependency now, not a blocking one.
- **Last updated:** 2026-08-25
- **Re-scoped 2026-08-25:** T-02 pivoted from per-chart wiring (38 keys, `viz-chart` inputs, 7 hosts) to per-section wiring (6 keys, one per Act header, `project-dashboard.component.html` only). See design.md D-CXP-10 and execution.md "Pivot Record: T-02" for the decision record. T-01 is unaffected and stays `done`.

All commands run from `client/research-indicators/`. Targeted jest runs MUST add `--coverage=false` (K-020). Every gate below must be **observed red once** before it is cited as evidence (K-004) — record the red in `execution.md`.

---

## 1. Dependency graph

```mermaid
graph TD
  T01[T-01 chart-explainer component + service] --> T02[T-02 registry (6 keys) + wiring of 6 Act headers]
  T02 --> T03[T-03 author the 6 explanations]
  T02 --> T04[T-04 design.md registration + HITL visual/keyboard pass + full-suite gates]
  T03 --> T04
```

T-02 and T-03 are split on purpose: T-02 lands placeholder copy (`TODO:` sentences that the registry lint test **rejects**) so the wiring can be verified structurally, and T-03 is a copy-only task reviewed by a different lens (content truth, KZ-007).

---

## 2. Task list

### T-01 — `chart-explainer` shared component + `ChartExplainerService`

- **Requirements covered:** R-CXP-002 (all ACs + both scenarios), R-CXP-003 AC.1, R-CXP-006 AC.1, NFR-CXP-001
- **Design refs:** design §2.1, §5.1, §7, D-CXP-1/3/4/5/7
- **Files touched (intended):**
  - `src/app/shared/components/chart-explainer/chart-explainer.component.{ts,html,scss,spec.ts}` (new)
  - `src/app/shared/services/chart-explainer.service.{ts,spec.ts}` (new)
  - `src/app/shared/interfaces/chart-explainer.interface.ts` (new)
  - `src/app/shared/constants/chart-explainers.constants.ts` (new — **type + empty-able skeleton only**; keys/copy are T-02/T-03)
- **Description:** Build the pattern once. Button with accessible name, `aria-expanded`, `aria-controls` while open; `p-popover` (`appendTo="body"`, 340 px, `maxWidth: calc(100vw - 24px)`); always-rendered `span.sr-only` description with a per-instance id; document-level Esc; focus return on every close path except service-initiated hide; `placement` input (`inline` | `surface`).
- **Implementation notes:**
  - Copy the standalone + `OnPush` + `input()` + `componentRef.setInput` shape from `shared/components/viz-chart`.
  - Esc: `@HostListener('document:keydown.escape')` guarded by `isOpen()` (precedent `project-dashboard.component.ts:1579`).
  - Close paths converge on one `onHidden(returnFocus: boolean)`; PrimeNG `(onHide)` calls it with `true` unless the service marked this hide as displaced.
  - Tokens only: `text-[var(--ac-grey-700)]`, hover/focus `text-[var(--ac-light-blue-400)]`, `focus-visible:ring-2 ring-[var(--ac-light-blue-400)]`; `surface` placement adds `bg-[var(--ac-white-1)] dark:…` via tokens — **no hex**.
  - Do **not** move focus into the panel on open.
  - Until T-01 lands, `ChartExplainerKey` may be `string` with a `// T-02 narrows to a literal union` note — but the component's `key` input must already be typed against `ChartExplainerKey` so T-02's narrowing propagates without touching T-01.
- **Tests (`chart-explainer.component.spec.ts`, `chart-explainer.service.spec.ts`)** — each with its falsifying input (K-012):
  - Open on click → panel in `document.body` contains title + 3 sentences. *Red if:* `toggle()` never calls `popover.toggle`.
  - `aria-expanded` `false`→`true`→`false` and `aria-controls` present only while open. *Red if:* attribute bound to a constant.
  - Esc closes and `document.activeElement === button`. *Red if:* remove the `.focus()` call in `onHidden`.
  - Esc while focus is on `document.body` still closes (document listener). *Red if:* listener moved to the host element.
  - Second toggle closes; focus remains on button. *Red if:* `toggle()` always opens.
  - Two fixtures: opening B hides A **and** A's button is **not** focused afterwards (`focus` spy on A's button not called). *Red if:* service `open()` passes `returnFocus=true`.
  - Arrange transitions, not end state (KZ-015): construct closed, assert closed, then act.
- **Acceptance / done check:**
  - [x] `npx jest src/app/shared/components/chart-explainer src/app/shared/services/chart-explainer --coverage=false --silent` green, **after** each listed red was observed
  - [x] `grep -nE '#[0-9a-fA-F]{3,8}\b' src/app/shared/components/chart-explainer/*` → no output (**this check cannot see** token misuse such as `var(--ac-red-1)` for a neutral glyph — the T-04 HITL screenshot covers appearance)
  - [x] `npm run build` green (app type-check incl. `strictTemplates`)
  - [x] `npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c 'error TS'` ≤ 945 baseline (**disqualifier:** if the baseline itself moved on this branch, re-measure it on `HEAD~` before comparing; a count is not evidence without its baseline)
- **Evidence disqualifiers:** a green targeted run **without** `--coverage=false` exits 1 regardless (K-020) — an exit code from such a run is not a signal either way.
- **Dependencies:** none
- **Estimated effort:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`
- **Effort dial:** `medium` (a11y focus logic → bump to `high` on any rework)
- **Status:** done

---

### T-02 — Registry (6 keys) and wiring of the 6 Act section headers

- **Requirements covered:** R-CXP-001 (all ACs; scenarios *Act section that can disappear entirely* incl. `BUT` loading / `AND IT MUST` no duplicate, *Six distinct keys, no shared copy*), R-CXP-003 AC.2/AC.3/AC.4 (+ scenario *Description available while closed*), R-CXP-004 AC.1/AC.2/AC.3 (+ scenario *A 7th Act is added later*, all three clauses)
- **Design refs:** design §5.3 wiring table, §5.4, D-CXP-10
- **Files touched (intended):**
  - `src/app/shared/constants/chart-explainers.constants.ts` (+ new `.spec.ts`) — `ChartExplainerKey` union of the **6** literals (`act-1-identity` … `act-6-depth`); every entry present with **placeholder** sentences prefixed `TODO:` and a real `derivedFrom`
  - `src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.{html,ts,spec.ts}` — the **only** host touched
- **Not touched (dropped — D-CXP-10):** `viz-chart.component.*`, `project-dashboard-card.component.*`, `results-trend-card`, `sp-alignment-graph`, `geo-scope-card`, `geo-scope-map`, `insights-section`, `indicator-deep-dive`.
- **Description:** Add one `<app-chart-explainer key="act-N-...">` beside each of the 6 `<h2 id="act-N-title">` headers in `project-dashboard.component.html`; add `[attr.aria-describedby]` to each `<section aria-labelledby="act-N-title">`; write the completeness test that scans this one template.
- **Implementation notes:**
  - All 6 keys are **fixed literals** — none is computed from a signal (contrast with the superseded hero-toggle key). No `EXPECTED_DYNAMIC_KEYS` escape hatch is needed; the template scan alone is exhaustive.
  - Each `<app-chart-explainer>` sits inside its Act's own `@if`-gated `<section>` where one exists (Act 2, Act 3) — so a conditionally-empty Act's explainer disappears with it, not separately.
  - Hide all 6 while `getProjectDetailService.loading()` — a single dashboard-wide gate, not per-Act.
  - `aria-describedby` on each `<section>` needs the explainer's `descriptionId` — if the `#key` template ref and the `<section>`'s attribute binding end up in different `@if` branches, a raw `chx.descriptionId` cross-reference will NOT compile (`strictTemplates` NG9 — Angular scopes a structural block's local refs to that block's own embedded view); use a `viewChild()` + `computed()` signal on the component class instead, exactly as T-01's own component does internally.
- **Tests** — falsifying input per assertion:
  - `chart-explainers.constants.spec.ts` completeness: template-scan set (over `project-dashboard.component.html` only) == registry keys. *Red if:* delete one registry entry → missing; add `zzz-unused` → dead entry. **Both reds must be observed and recorded.**
  - Build gate: temporarily set `key="not-a-key"` on one Act's `<app-chart-explainer>` → `npm run build` must fail with a TS error on the union; revert. (R-CXP-004 AC.1)
  - `project-dashboard.component.spec.ts`: with all 6 Acts visible → exactly 6 explainer buttons, each `aria-label` naming its own Act; `getProjectDetailService.loading()` true → 0 buttons, then flip to false → 6 (KZ-015: arrange loading-then-loaded, not loaded-only); each Act's `<section>` `aria-describedby` resolves to that Act's description text; Act 2 or Act 3 rendering nothing (its own `@if` false) → 0 buttons for that Act specifically, not a missing-element error. *Red if:* `@if` dropped, attribute hard-coded, or a duplicate explainer appears after an in-Act re-render (e.g. the Bars/Heatmap toggle inside Act 2).
  - Distinct-keys assertion: `Object.keys(CHART_EXPLAINERS)` contains all 6 Act keys (one-line assert, template scan already proves the template side).
- **Acceptance / done check:**
  - [x] Completeness spec green after both reds observed
  - [x] Build-gate red observed (`not-a-key`) and recorded, then reverted
  - [x] `grep -c '<h2 id="act-' src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` totals **6** — if it differs, **stop and update design §5.3 before wiring** (a count over a moved target is not evidence)
  - [x] `npm run build` green; registry lint test (T-01's shape rules) **fails** on the `TODO:` placeholders — this red is expected and is T-03's starting state; do **not** weaken the test to get green here
  - [x] Existing `project-dashboard.component.spec.ts` suite stays green unchanged except additive tests
- **Evidence disqualifiers:** the template scan passing while `npm run build` was not run proves nothing about a future computed key slipping in unregistered. A count taken with `head`/`tail` is not a count (K-014).
- **Dependencies:** T-01
- **Estimated effort:** M (down from L — one host instead of eight)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Effort dial:** `medium`; bump to `high` on this attempt specifically — it is a resumed/re-scoped task (per root CLAUDE.md's re-baseline rule: a `[~]`-resumed task starts one level higher)
- **Status:** done

---

### T-03 — Author the 6 explanations

- **Requirements covered:** R-CXP-005 (AC.1, AC.2, scenario *Acronym glossed* incl. `BUT` no repeated gloss), R-CXP-004 AC.4
- **Design refs:** design §5.4, D-CXP-9; requirements §5 R-CXP-005 copy standard
- **Files touched (intended):**
  - `src/app/shared/constants/chart-explainers.constants.ts` (replace every `TODO:` placeholder)
  - `src/app/shared/constants/chart-explainers.constants.spec.ts` (jargon/gloss/length lint — extend if T-02 stubbed it)
- **Description:** Write `title`, `what`, `howToRead`, `source`, optional `emptyHint` for all **6** Act keys in plain language, each ≤ 3 sentences, each sentence ≤ 220 chars, acronyms glossed on first use, chart jargon paraphrased — describing each Act's content **collectively**, not chart-by-chart. Verify each entry's semantics against the archived spec(s) named in `derivedFrom` (`project-dashboard-redesign`, `dashboard-advanced-analytics`) — **not** against the Act title alone.
- **Implementation notes:**
  - Load `cognitive-doc-design` (lead with the answer; one idea per sentence) and `ui-ux-pro-max` (`data-table`/`color-guidance` rules inform the "how to read" sentence).
  - Structure every entry: *what it shows* (the Act's content, spanning its charts/cards) → *how to read it* (the shared encoding + any interaction, e.g. "click a bar or ranking row to open those results" only where at least one chart in that Act actually emits `chartClick`) → *source / caveat* (which statuses are counted; why part of the Act may be empty).
  - For an Act containing a heatmap ramp (e.g. Act 2's results-by-indicator heatmap), say "darker blue = more results" — matches `--ac-viz-ramp-*` monotonicity (design.md §7.1).
  - Don't over-claim: an Act mixing a clickable chart and a non-clickable one should describe the click affordance narrowly ("click a bar in the results chart") rather than implying every element in the section is clickable.
- **Tests:**
  - Registry lint (`chart-explainers.constants.spec.ts`): no `TODO:`; non-empty fields; ≤ 3 sentences; ≤ 220 chars/sentence; listed jargon (`bipartite|treemap|funnel|heatmap`) only with a gloss in the same sentence; acronyms `IRL|SP|AOW|HLO|OICR` glossed on first use per entry. *Red if:* leave one `TODO:` — observed at the start of this task by construction (T-02 leaves it red). **Cannot reach:** semantic truth and unlisted jargon — declared, covered by the human review below.
- **Acceptance / done check:**
  - [x] Registry lint test green (was red at task start — cite the T-02 record)
  - [x] Reviewer reads **all 6** entries against `derivedFrom` and records a per-key PASS table in `execution.md` (R-CXP-005 AC.1) — a sample is not a review
  - [x] Every "click …" sentence corresponds to at least one `(chartClick)` binding within that Act's region of `project-dashboard.component.html` (or a component it renders) — verified by grep and listed in the PR
- **Evidence disqualifiers:** a green lint with a shortened jargon list is not evidence — the list in the test must be the one in R-CXP-005 AC.2 verbatim.
- **Dependencies:** T-02
- **Estimated effort:** S (down from M — 6 entries, not 38)
- **Skills:** `cognitive-doc-design`, `ui-ux-pro-max`
- **Effort dial:** `high` (content correctness is the dominant defect class D2)
- **Status:** done

---

### T-04 — Baseline registration, HITL visual/keyboard pass, full-suite gates

- **Requirements covered:** R-CXP-006 AC.2/AC.3, R-CXP-007 (all ACs), NFR-CXP-001 (manual pass), NFR-CXP-002, NFR-CXP-003
- **Design refs:** design §5.5 UI states, §7, §12 budget
- **Files touched (intended):**
  - `docs/ux-ui/design.md` §8.1 (inventory row), §10.1 (one line), §12.2 (dated decision citing D-CXP-1…10)
  - `docs/specs/changes/chart-explainers/execution.md` (screenshots + measurements)
- **Description:** Register the pattern in the baseline; run the human checks jsdom cannot; run the full client gates in isolation.
- **HITL checklist (light AND dark, attach screenshots before any checkbox flips — KZ-014):**
  - [x] All 6 Act explainers, closed, in one full-dashboard screenshot pass
  - [x] At least one Act explainer open (popover chrome, 340 px width, text legibility)
  - [x] Act 2 or Act 3 in its "section absent" state — confirm no orphaned button/description remains in the DOM
  - [x] Popover at 375 px viewport does not overflow (`maxWidth`)
  - [x] Glyph contrast ≥ 3:1 on `--ac-background` in BOTH themes (T-01 rework moved the surface disc to `var(--ac-background)` light+dark — measuring `--ac-white-1` would measure a backdrop the code no longer renders) — compute from the token values (`npm run tokens:validate` style) or measure with a contrast tool; record the numbers
  - [x] Keyboard walkthrough across all 6: Tab reaches each `?`, Enter opens, Esc closes, focus visibly returns; VoiceOver (macOS) reads "Explain this chart: …, button, collapsed" and the Act's description via describedby — note PrimeNG's popover panel role (`region`, not `dialog`) so VoiceOver's announcement is read against that expectation, not a dialog one
  - [x] Hit area ≥ 32 px measured in DevTools (jsdom cannot)
- **Gates (Leader runs, no concurrent workers — root CLAUDE.md §4.3):**
  - [x] `npm test -- --silent` full suite green
  - [x] `npm run lint -- --quiet` clean
  - [x] `npm run build` green; record the `project-dashboard` lazy chunk size before/after — **disqualifier:** measure the baseline **twice**; if the before/after delta is within the two-baseline spread, report "within noise", not a number (NFR-CXP-002)
  - [x] Budget check against design §12: tasks ≤ 4, LOC ≤ ~400, review rounds ≤ 2 per phase (`git diff --stat` on the branch range) — over any → escalate, do not continue
- **Evidence disqualifiers:** a screenshot of only light mode is half the evidence; a full-suite run while a worker is active is a wrong measurement, not a slow one.
- **Dependencies:** T-02, T-03
- **Estimated effort:** S
- **Skills:** `ui-ux-pro-max` (checklist), `cognitive-doc-design` (design.md entries)
- **Effort dial:** `medium`; visual review is **T6 Multimodal** — dispatch cross-host if the session host cannot view the screenshots
- **Status:** done

---

## 3. Clause coverage (scenario / `BUT` / `AND IT MUST` granularity)

| Requirement clause | Owner |
| --- | --- |
| R-001 AC.1–4 | T-02 (AC.4 measured in T-04) |
| R-001 *Act section that can disappear* THEN/AND | T-02 (explainer sits inside the Act's own `@if`) + T-03 (`emptyHint`) |
| R-001 *Act section that can disappear* BUT loading | T-02 |
| R-001 *Act section that can disappear* AND IT MUST no duplicate | T-02 (in-Act re-render test) |
| R-001 *Six distinct keys* THEN / BUT | T-02 (distinct keys) |
| R-002 AC.1–5 | T-01 |
| R-002 *Keyboard walkthrough* BUT no auto-focus / AND IT MUST Esc anywhere | T-01 |
| R-002 *Only one open* THEN / BUT | T-01 (service) |
| R-003 AC.1 | T-01 |
| R-003 AC.2–4 | T-02 |
| R-003 *Closed* BUT no caption dup / AND IT MUST sr-only | T-02 (dashboard test asserts each Act's caption unchanged and `.sr-only` class) |
| R-004 AC.1–3 | T-02 |
| R-004 AC.4 | T-03 |
| R-004 *7th Act added* THEN / AND IT MUST / BUT reuse-elsewhere legal | T-02 |
| R-005 AC.1 | T-03 (human) |
| R-005 AC.2 | T-03 |
| R-005 *Acronym* THEN / BUT | T-03 |
| R-006 AC.1 | T-01 |
| R-006 AC.2–3 | T-04 |
| R-007 AC.1–3 | T-04 |
| NFR-001 | T-01 (automated) + T-04 (manual) |
| NFR-002, NFR-003 | T-04 |

No clause is discharged by citing a different requirement.

---

## 4. Testing expectations

- Spec files: 3 new (`chart-explainer.component`, `chart-explainer.service`, `chart-explainers.constants` — all T-01/T-02), 1 extended (`project-dashboard`). `viz-chart` and `project-dashboard-card` gain no test changes — they are not touched (D-CXP-10).
- Coverage floors unchanged (40/20/45/30); targeted runs use `--coverage=false`.
- No `jest-axe` — hand-written DOM assertions per repo convention.

## 5. Execution conventions

- Commits: `[SPEC:changes/chart-explainers] feat(chart-explainer): …` (repo style `<type>(<module>): <subject>` with the AKILI prefix).
- **PR strategy:** ≈ 400 LOC (re-scoped, was ≈ 950 across two PRs) → **one PR**: T-01 (already committed separately at `5fcc730b`) + T-02 + T-03 + T-04 together — one host file touched, one small registry, no engine changes; reviewers read `project-dashboard.component.html`'s 6 Act headers first, then the registry, then the completeness test. States in its description: "supersedes the per-chart design originally planned for this spec — see design.md D-CXP-10".
- Branch: this worktree branch `bilateral-visual-improvements`; deliver to `main` via PR (memory: dev takes direct merges, main takes PRs).

## 6. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-08-24 | `executive-overview-grounded-context` not yet landed → same-file conflicts | Do not start T-02 until it lands | Leader | **closed** — landed and committed (`d48ca945`) 2026-08-25 |
| RB-2 | 2026-08-24 | Scout counts (31 instances / 20 deep-dive) may drift | T-02 re-counts before wiring | Implementer | **closed** — moot under the re-scoped design (no per-chart counts to drift); the T-02 attempt against the original scope did re-count and confirmed 31/20/38 before the pivot landed, for the record |
| RB-3 | 2026-08-24 | PrimeNG `onHide` firing on service-initiated hide could refocus the displaced button | Service marks the hide as displaced before calling `hide()` | Implementer | open — unaffected by the pivot, T-01 component unchanged |
| RB-4 | 2026-08-25 | `project-dashboard.component.{html,ts}` is edited by this spec's T-02 **and** may be touched again by a concurrent session working `changes/executive-overview-grounded-context` follow-up work or another dashboard spec — same-file edit collision risk, same shape as RB-1 before it closed | Re-check `git status`/`git log` on this file immediately before editing; land T-02's edit as its own small, additive commit promptly rather than holding it uncommitted across a long working session (the exact failure mode recorded in execution.md's "Crossed-messages incident") | Implementer | open |

## 7. Done definition

- [x] T-01…T-04 `done` with `execution.md` PASS records (guardrail hook enforces evidence-before-checkbox)
- [x] All ACs checked; both HITL screenshot sets attached
- [x] Coverage floors green; `design.md` baseline updated in the same PR as the copy
- [x] Budget not exceeded (or escalation recorded)
