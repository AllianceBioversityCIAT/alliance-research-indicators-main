# Execution Log — Bilateral / Pooled Funding Contribution Monitor

## Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/pooled-funding-monitor` |
| Branch / baseline | `plc-monitor` @ `f93bde88` |
| Leader | Claude Code session (Opus 5.5, T1) |
| Implementer | `akili-implementer` wrapper (sonnet, T2) |
| Reviewer | `akili-reviewer` wrapper (opus, T3, read-only) — author ≠ auditor |
| Approval Mode | pre-approved (Daniela Pino, 2026-10-08) — routine continue gates logged `auto-approved (pre-approved mode)`; exceptions stop |
| Budget (design §13) | 13 tasks · ≈ 2,400 LOC · ≤ 2 review rounds/task (≈ 18 total) |
| Started | 2026-10-08 |

## Task Execution History

### Wave 1 — T-01 (server) ∥ T-08 (client)

Parallel-safe per root guide §4.3: different packages, separate `node_modules`, build outputs and ports; each worker runs **scoped** tests only. The Leader re-runs the package suites after both report.

#### T-08 — Extract the Results Center result-link builder to a shared util — **PASS** (2026-10-08)

- **Attempts:** 1 (attempt 1 reported with a `Not Done` item — `openResult` still held an inline copy of the rule — and K-004 unmet for the comparison; the Leader returned it to the same worker before review, per Step 2.3 item 0; no Reviewer cycle consumed).
- **Skills / effort:** `angular-developer` · medium.
- **Files:** `client/.../shared/utils/result-link.util.ts` (new), `result-link.util.spec.ts` (new, 5 tests), `results-center-table.component.ts` (`openResult`, `getResultHref`, `getResultRouteArray`, `getResultQueryParams` delegate through private `resultLink()`).
- **K-019 old-vs-new comparison** (temporary spec, deleted after the run; this table is the only surviving record). Old = pre-edit rule re-implemented inline; new = real component methods; compared href, route array, query params and `openResult` navigate args:

| Context | Case | New output | Result |
|---|---|---|---|
| results-center | STAR s6 [2024,2025] | `["/result","STAR-12","general-information"]` `{version:2025, from:"results-center"}` | SAME |
| results-center | STAR s6 [] | `["/result","STAR-12"]` `{from:"results-center"}` | SAME |
| results-center | STAR s4 [2024] | `["/result","STAR-12"]` `{from:"results-center"}` | SAME |
| results-center | TIP s6 [2025] | `["/result","TIP-7","general-information"]` `{version:2025, from:"results-center"}` | SAME |
| project | STAR s6 [2024,2025] | `["/result","STAR-12","general-information"]` `{version:2025}` | SAME |
| project | STAR s6 [] | `["/result","STAR-12"]` `{}` | SAME |
| project | STAR s4 [2024] | `["/result","STAR-12"]` `{}` | SAME |
| project | TIP s6 [2025] | `["/result","TIP-7","general-information"]` `{version:2025}` | SAME |

- **K-004:** `Math.max`→`Math.min` in the util ⇒ comparison red (`Expected: 0 / Received: 2`; the s6 [2024,2025] rows gave `version=2024`); restored ⇒ green. (A first `sed` break silently failed on macOS and produced a false "pass" — re-done with python3.)
- **Verification:** `npx jest src/app/shared/utils/result-link.util.spec.ts src/app/pages/platform/pages/results-center --silent --coverage=false` → 10 suites, 533 tests passed. `npx eslint` clean. Existing results-center specs unedited.
- **Reviewer (opus, attempt 1):** `STATUS: PASS` — refactor is behaviour-preserving; `resultEntryQueryParamsForNavigation(extra = {})` makes the explicit `{}` identical to the old no-arg call; signatures of the four public methods unchanged.
- **Issues noted (non-blocking):** 5 pre-existing `tsc -p tsconfig.spec.json` errors in `results-center-table.component.spec.ts` (`updateFn` unknown ×3, `MouseEvent` casts ×2) — file untouched by this task; out of scope.
- **Requirements covered:** R-PFM-013 (link rule half; the View rendering half is T-13).
- **Continue gate:** auto-approved (pre-approved mode).

#### T-01 — Pure derivation functions and enums — attempt 1: **FAIL**

- **Skills / effort:** `nestjs-expert`, `tdd` · medium.
- **Files:** `server/.../pooled-funding-monitor/derivation/pfm-derivation.ts` + `.spec.ts` (42 tests), `enum/pfm-{scope,star-label,mapping-state,prms-status,status-filter,chip}.enum.ts` (8 new files).
- **Implementer verification:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 42 passed; eslint + prettier clean. K-004 mutation runs: status 7→Draft ⇒ 1 red; synced-without-history→Not sent ⇒ 5 red; No-SP check removed ⇒ 5 red; needsAttention including out-of-scope ⇒ 3 red; isReady without Approved ⇒ 3 red; all restored green.
- **Review input deviation:** the change set is 8 new untracked files only, so the Reviewer was given their paths to read in full instead of an inline 668-line diff (diff ≡ file contents). Recorded per Step 2.3.
- **Reviewer (opus):** `STATUS: FAIL` — verbatim issue:
  1. **Discovered Issue:** `PfmScopeEnum.PORTFOLIO = 'portfolio'` in `enum/pfm-scope.enum.ts` does not match the API contract. Design §4 says `scope=mine|all` (default `mine`); `?scope=all` would be rejected and the client store mirroring `?scope=` would be built against the wrong value. **Violated Rule:** design.md §4, summary endpoint, "Query: `scope=mine|all` (default `mine`)". **Remediation:** change to `ALL = 'all'`, or amend design §4 with a logged decision first.
- **Decisions judged conforming by the Reviewer:** (a) mapping checks "no alignment → Not started" before "has_contribution=0 → No SP contribution" — `has_contribution` is NOT NULL on the entity, so NULL only arises from a missing row; design §5's bullet order is the imprecise part. (b) case-insensitive PRMS history status, fallback Pending Review; (d) unmapped status → raw name, empty PI line; (e) Approved with null date → "Approved"; (g) red evidence via mutation runs; (h) DD-PFM-6 stage assignment deferred to T-03.
- **ADVISORY (recorded, non-gating):** RELIABILITY — UTC formatting can shift the day if the Node process TZ ≠ UTC (mysql2 reads DATETIME in process-local time; no `timezone` in `orm.config`). To be handled where dates are read (T-02 brief). READABILITY — design §4 `chip_counts` keys (`attention`, `mapping`, `ready`, `pending`, `prms_rejected`, `synced`) differ from `PfmChipEnum` values; T-03/T-05 need an explicit mapping (`pending` = Awaiting PI, not PRMS Pending Review).

#### T-01 — attempt 2: **PASS** (2026-10-08)

- **Effort:** high (bumped per rework rule).
- **Change:** `enum/pfm-scope.enum.ts` → `{ MINE = 'mine', ALL = 'all' }`; case-insensitive grep for `portfolio` in the module → no hits.
- **Verification:** `npx jest src/domain/entities/pooled-funding-monitor --silent` → 1 suite, 42 passed; eslint + prettier clean.
- **Reviewer (opus):** `STATUS: PASS` — issue 1 resolved; attempt-1 audit of the rest of T-01 stands.
- **ADVISORY carried (non-gating):** UTC-vs-process-TZ date shift (→ T-02 brief); `chip_counts` keys vs `PfmChipEnum` mapping (→ T-03/T-05 briefs).
- **Decision recorded:** mapping-state precedence = no alignment → *Not started* before `has_contribution=0` → *No SP contribution* (Reviewer: conforms; design §5 bullet order is imprecise, not the code).
- **Requirements covered:** R-PFM-004, R-PFM-009 (status matching), R-PFM-010 (chip matching), R-PFM-012 (rank), Glossary §2.
- **Total:** 2 attempts, 2 review rounds. **Continue gate:** auto-approved (pre-approved mode).

#### T-06 — Design tokens + `pfm-status-badge` — **PASS** (2026-10-08)

- **Attempts:** 1 (first report omitted the `--ac-pfm-seg-*` family that design §6.2 lists and had no K-004 red; returned to the same worker before review, per Step 2.3 item 0).
- **Skills / effort:** `angular-developer`, `ui-ux-pro-max` · medium.
- **Files:** `client/.../src/styles/colors.scss` (+22 tokens in `:root`, +22 in `[data-theme='dark']`: status pairs success/info/review/neutral/danger/warning(+border), `outscope-fg`, and 8 `seg-*` incl. `seg-pending-group` for the mockup's group-bar amber); new `pages/.../pooled-funding-monitor/components/pfm-status-badge/` (ts, html, spec — no `.scss`).
- **Verification:** `npx jest src/app/pages/platform/pages/pooled-funding-monitor --silent --coverage=false` → 17/17. eslint clean. No new `.scss` (staged + untracked checks empty). No hex in new component files. K-004: PRMS Rejected tone DANGER→SUCCESS ⇒ 1 red (`prms "Rejected" renders a pill with the danger token`), restored ⇒ 17/17.
- **Reviewer (opus):** `STATUS: PASS` — labels match server enums; PRMS Not sent → "—"; SP badge binds DB color as `--sp` + `color-mix` (DD-PFM-8); Tailwind runtime CDN generates classes composed in TS.
- **ADVISORY (non-gating, carried to HITL in T-13):**
  - RISK — light neutral pair `#6b7a89` on `#eef1f5` ≈ 3.9:1 and "—" `#6b7a89` on white ≈ 4.4:1 (hand-computed, unmeasured) — below AA 4.5:1 for small text. NFR-PFM-004 requires AA → **must be measured at the T-13 HITL; darken `--ac-pfm-neutral-fg` if confirmed.**
  - a11y — bare "—" has no accessible name → T-13 brief: `aria-label="Not sent"` (or visually-hidden text).
  - READABILITY — badge value names typed as string literals; switch to the shared client type once T-07's `pfm.interfaces.ts` exists.
  - READABILITY — Tailwind `text-xs` vs STAR `fs-*` scale (design §6.2) — pick deliberately in later UI tasks.
  - DOCS — client guide asks new tokens to be listed in `client/research-indicators/README.md` and `docs/ux-ui/design.md` §7 → deferred to `/akili-archive` documentation pass.
  - Dark palette implementer-chosen → covered by the NFR-PFM-004 dark-mode HITL check.
- **Unrun check:** `tsc -p tsconfig.spec.json` on the new spec not run (Reviewer note); Leader full-suite + tsc pass scheduled at the end of PR 2.
- **Requirements covered:** NFR-PFM-003, NFR-PFM-004 (non-color cue; contrast pending HITL), R-PFM-004 rendering, R-PFM-012 ("—").
- **Continue gate:** auto-approved (pre-approved mode).
