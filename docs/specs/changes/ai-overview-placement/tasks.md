# Tasks — Changes / Executive Overview Clear Placement (`ai-overview-placement`)

- **Module:** changes (STAR client) · **Spec id:** 2026-08-ai-overview-placement
- **Status:** not-started · **Owner:** j.cadavid@cgiar.org · **Last updated:** 2026-08-22
- **Linked requirements:** ./requirements.md · **Linked design:** ./design.md
- **Budget (design §2.4):** 2 tasks · ~150 net LOC · 1 review round — exceeding it escalates, never continues silently

## Dependency graph

`T-01 → T-02` (linear).

---

### T-01 — Template split + state gates + four-cell rendered-DOM tests

- **Requirements covered:** R-AIP-001 (all clauses except visual prominence), R-AIP-002 (all cells + both clauses), R-AIP-003 (all clauses)
- **Design refs:** Architecture 1–3, state-gates table, D-AIP-1…6
- **Files touched (intended):** `project-dashboard.component.{ts,html,spec.ts}` (+ the stagger constant file if the key lives separately)
- **Description:** Insert the top card after the Project Context strip (D-AIP-2 default); strip the presentation card out of the bottom `[hidden]` panel; rename the bottom header to "AI Grounding & Setup" (id `ai-grounding-section-title` unchanged); add the View more signal (caveat-banner idiom, `aria-expanded`/`aria-controls`); split the presence computeds per the locked gates.
- **Acceptance / done check:**
  - [x] Four-cell matrix tests assert **rendered DOM** presence/absence per R-AIP-002's table (KZ-001), arranged as the product transition — construct without summary, assert absence, then feed the signals (KZ-015). **Failing input (K-012):** the non-admin/no-summary cell must FAIL if the card or any AI placeholder renders — prove it once by temporarily rendering the card unconditionally and observing the red (K-004).
  - [x] DOM-order test: card node precedes the charts-grid node via `compareDocumentPosition`. **Failing input:** move the card below the pending table ⇒ red. **Declared limit:** this proves order, not visual prominence — that is T-02's.
  - [x] View more tests: collapsed ⇒ exactly one paragraph node, no source list; expanded ⇒ all paragraphs + source list; `aria-expanded` flips.
  - [x] **D-PD-9 suite passes unmodified** (R-AIP-003 `AND IT MUST`) — a diff touching those tests disqualifies the task, whatever the suite says.
  - [x] Old `showExecutiveOverview` computed tests realigned from the **failing run's** list, not grep (K-018, D-AIP-6).
  - [x] Admin-gate test: bottom section presence identical to today's admin branch for each input combination (docs/loading/error/data) — **Failing input:** drop `hasExecutiveOverviewData` from the OR ⇒ the docs-removed-after-generation case reddens (D-AIP-5).
  - [x] `npm test` full green (targeted runs `--coverage=false`, K-020); `npm run build` green; `npx tsc -p tsconfig.spec.json --noEmit` ≤ 945 baseline. **Disqualifier:** suites run concurrently with another agent's run are not evidence (§4.3).
- **Dependencies:** none · **Effort:** M · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Status:** done

### T-02 — HITL placement decision + visual verification

- **Requirements covered:** R-AIP-001 ("high on the page" visual half, OQ-1), defect-class table's visual + a11y rows
- **Design refs:** D-AIP-2, testing strategy (HITL row)
- **Files touched (intended):** `project-dashboard.component.html` (only if the placement flips to before the strip — a one-line move)
- **Description:** In a real browser (`npm start`, a contract **with** a generated summary — e.g. ULZ53 — and one **without** — e.g. A511), compare both OQ-1 placements live, pick one with the user, and verify the visual/a11y items.
- **Acceptance / done check:**
  - [x] Placement decision recorded (which side of the context strip, and why) — the OQ-1 closure (Option A confirmed).
  - [x] Observed and recorded: card visible without scrolling at 1280×800; light **and** dark themes legible; no layout shift on View more; admin bottom section unchanged in situ; no-summary contract shows no AI trace for a non-admin. **KZ-014: this task's checkbox may not be marked from green suites — only from the recorded observation.**
  - [x] View more keyboard pass: reachable by Tab, activates on Enter/Space, `aria-expanded` announced.
  - [x] **Disqualifier:** a check against only a no-summary contract (or only a summary one) covers half the matrix — evidence must name both contracts used. If the placement flips, the T-01 DOM-order test is re-run after the move (`--coverage=false`).
- **Dependencies:** T-01 · **Effort:** S · **Skills:** `ui-ux-pro-max` · **Status:** done

---

## Coverage closure (clause → owner)

| Clause | Owner |
|---|---|
| R-AIP-001 card content + date + pill + first-paragraph + View more toggle | T-01 |
| R-AIP-001 "high on the page" (visual) + HITL side decision | T-02 |
| R-AIP-001 `BUT NOT` reorder/restyle other blocks | T-01 (DOM-order + untouched-markup diff) + T-02 (visual) |
| R-AIP-001 `AND IT MUST` same signals, no new fetch | T-01 (no service diff; code review clause) |
| R-AIP-002 four cells | T-01 (rendered DOM) |
| R-AIP-002 `BUT NOT` empty/placeholder AI card | T-01 (proven-red cell) + T-02 (live no-summary contract) |
| R-AIP-002 `AND IT MUST` admin gate identical | T-01 (D-AIP-5 test) |
| R-AIP-003 invariants + `BUT NOT` service/flow changes | T-01 (D-PD-9 suite unmodified; no service diff) |
| R-AIP-003 `AND IT MUST` tests unmodified | T-01 (diff disqualifier) |
| Defect-class visual + a11y rows | T-02 |

No orphans; no clause discharged by citing a different requirement.

## PR strategy

**Single PR** (~150 LOC, one component) — under the ~400 LOC threshold. Description notes the placement decision from T-02 and links this spec.

## Done definition

- [x] T-01 and T-02 done (T-02 only via recorded human observation — KZ-014).
- [x] Coverage table has no orphan; budgets/gates green; OQ-1 recorded as closed in this file or design.md.
