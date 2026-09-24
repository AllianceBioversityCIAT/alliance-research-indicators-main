# Tasks — Bilateral / Pool Funding Feature Toggles

**Spec:** `docs/specs/bilateral/pool-funding-feature-toggles` · **Depth:** Lite ·
**Baseline:** `37d8f875` · **Budget:** 6 tasks · ~250 LOC · 1 review round

## Dependency graph

```
T-01 (migration + keys)
   ├── T-02 (parser)          ── T-03 (server gate)
   │                          └── T-04 (client flags + choke point)
   └── T-06 (admin toggle)
T-03 + T-04 ── T-05 (full gates)
```

No cycles. T-03 and T-04 are **cross-package** and therefore parallel-safe (root
guide §4.3); T-02 must land first because both consume it.

---

## T-01 — Seed both flag rows and register the keys

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | — |
| Requirements | R-PFT-005 (row-exists scenario), R-PFT-003 |
| Design | D-1, D-7, §6 |
| Review | `checklist` — a migration plus two constant registrations; mechanical but touches schema |
| Skills | `nestjs-expert` |

**Scope.** Migration inserting `POOL_FUNDING.SECTION.ENABLED` and
`POOL_FUNDING.PRMS_SYNC_BUTTON.ENABLED` with `simple_value = 'true'` and the
descriptions from design §6. Add both to the server `AppConfigKey` enum and the
client `APPLICATION_CONFIGURATION_KEY` constant.

**Verification.** `npm run migration:test:bootstrap` against the disposable scratch
container, then select both rows.

⚠️ **The migration must run to be verified** (K-006): static gates pass on migrations
that cannot execute. ⚠️ **No `?` or `:word` anywhere in the SQL, comments included** —
`namedPlaceholders: true` makes a bare `?` throw before MySQL parses it.

| Field | Value |
| --- | --- |
| Falsifier | Change the seeded value to `'false'` → T-04/T-05 visibility tests go red |
| Red run | Run the migration against a scratch schema and observe both rows; then revert and observe their absence |
| Disqualifier | A green `npm run build` or `lint` is **not** evidence the migration runs. Only an executed migration counts |
| Consumers | `AppConfigKey` enum (server), `APPLICATION_CONFIGURATION_KEY` (client) |

**Done.** Both rows exist after an executed migration; both keys registered; the
K-015 caveat (pipeline does not apply migrations) noted in `execution.md`.

---

## T-02 — The fail-open parser

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-01 |
| Requirements | R-PFT-003 (all paths) |
| Design | D-2 |
| Review | `checklist` — tiny surface, but it is the single point where fail-open is decided |
| Skills | `nestjs-expert`, `angular-developer` |

**Scope.** One pure function per tier: trim, lowercase, return `false` **only** on
exactly `false`; everything else returns `true`. No `try/catch` used as the default —
the default is the function's only other branch (D-2).

**Verification.** Table-driven unit test over the full absent-value set from
R-PFT-003: `undefined`, `null`, `''`, `'   '`, `'maybe'`, `'0'`, `'no'`, `'off'`,
`'FALSE'`, `' false '`, `'true'`.

| Field | Value |
| --- | --- |
| Falsifier | Invert the comparison (return `true` only on `'true'`) → every absent-value row goes red. The fixture is **not** inert: `'maybe'` and `'0'` discriminate the two implementations, which a fixture of only `'true'`/`'false'` would not |
| Red run | Apply that inversion, observe the assertion fail on the absent-value rows specifically — not on setup |
| Disqualifier | A test whose only inputs are `'true'` and `'false'` proves nothing about fail-open; if the absent-value rows are absent, the task is not done |
| Consumers | T-03, T-04 |

**Done.** Parser exists per tier, table test green, inversion observed red.

---

## T-03 — Server refusal entry in the sync gate

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-02 |
| Requirements | R-PFT-004 (incl. both `BUT`/`AND IT MUST` clauses) |
| Design | D-3, P-4, P-5 |
| Review | `full` — this is the enforcement boundary; a wrong `persistsRow` corrupts the audit log |
| Skills | `nestjs-expert`, `api-design-principles` |

**Scope.** Add the `feature_enabled` entry to `SYNC_GATE_ENTRIES` as the **first**
element, `503`, `persistsRow: false`. Load the flag into the snapshot.

**Verification.** Unit tests asserting: (a) flag off → refusal with `503`; (b) the
refusal is the **first** entry, so it fires even when the result does not exist;
(c) `persistsRow === false` — no attempt number consumed, no `REFUSED_BY_STAR` row;
(d) flag on → the ladder behaves exactly as today.

| Field | Value |
| --- | --- |
| Falsifier | Set `persistsRow: true` → (c) goes red. Move the entry below `result_exists` → (b) goes red |
| Red run | Both mutations applied and observed red on their own assertions |
| Disqualifier | Asserting the gate array's *shape* instead of the decision it returns is a presence-assertion (KZ-001): assert the returned `SyncGateDecision`, not the literal array |
| Consumers | `result-prms-sync.service.ts`, `result-prms-sync.controller.ts`, `sync-gate.spec.ts` |

**Done.** Four assertions green; both mutations observed red; no PRMS call reachable
when the flag is off.

---

## T-04 — Client flags service and the choke point

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | M |
| Depends on | T-02 |
| Requirements | R-PFT-001, R-PFT-002, R-PFT-003, NFR-PFT-002 |
| Design | D-4, D-5, P-6 |
| Review | `full` — the AND-vs-OR error here silently exposes Pool Funding on non-qualifying results |
| Skills | `angular-developer`, `ui-ux-pro-max` |

**Scope.** `PoolFundingFlagsService` modelled on `DateFormatConfigService`
(single-flight `loadPromise`, `signal`, `catch` → enabled). AND the section flag into
`shouldHidePoolFundingTab()`; AND the button flag into the button's `@if`.

**Verification.** Component tests over the matrix:

| Section flag | Button flag | Qualifies? | Section | Button |
| --- | --- | --- | --- | --- |
| on | on | yes | shown | shown |
| **off** | on | yes | hidden | hidden |
| on | **off** | yes | shown | hidden |
| **on** | on | **no** | hidden | hidden |
| read fails | read fails | yes | shown | shown |

Row 4 is the **override falsifier** — it is the row that fails if someone writes `OR`.

| Field | Value |
| --- | --- |
| Falsifier | Change the section disjunct from `OR` to an override (`flag on ⇒ visible`) → row 4 goes red. Row 4 is not inert: a non-contributing contract is exactly where an override and an AND diverge |
| Red run | Apply the override, observe row 4 red on its assertion. Arrange the **transition** (construct with the flag unresolved, assert, then resolve) per KZ-015 — not the end state |
| Disqualifier | Asserting on `component.hasPoolFundingOption()` alone is a call-sequence assertion (KZ-001): the button lives behind `@if` in the template, so at least one row must assert the **rendered** button via `data-testid="sidebar-prms-sync-button"` |
| Consumers | `result-sidebar.component.spec.ts` (already pins `hasPoolFundingOption()` at `:405`, `:418`), `http-error.interceptor.spec.ts`, `innovation-use-details.component.spec.ts` — the three spec files that reference the sidebar; plus the 13-file reader list from Premise P-6 |

**Done.** All five rows green; override mutation observed red on row 4; the rendered
button asserted, not just the computed signal.

---

## T-05 — Full gates on both packages

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-03, T-04 |
| Requirements | all |
| Design | — |
| Review | `skip-eligible` — runs pre-existing commands and changes no product code. **Claim it must prove:** both suites green and both type-check gates clean, with the numbers quoted |
| Skills | — |

**Scope.** Run the gates. No code changes.

**Verification.**

| Gate | Command |
| --- | --- |
| Server tests | `npm test -- --silent` |
| Server lint | `npx eslint <changed paths>` (**not** `npm run lint` — it is `eslint --fix` and mutates, K-001) |
| Client tests | `npm test -- --silent` |
| Client lint | `npm run lint -- --quiet` |
| Client spec types | `npx tsc -p tsconfig.spec.json --noEmit`, compared as a **normalized error SET**, never a total |

⚠️ Run the two packages' suites **sequentially**, never concurrently — two full-suite
runs in parallel produced phantom failures twice in this repo (root guide §4.3).

| Field | Value |
| --- | --- |
| Falsifier | n/a — this task runs gates, it does not author them |
| Red run | n/a |
| Disqualifier | A failing suite reported as "pre-existing" without the baseline run that proves it. A client suite reporting failed suites with **zero** failed tests is the runner — re-run before investigating |
| Consumers | none |

**Done.** Both suites green with counts quoted; lint clean; spec type-check set
unchanged from baseline.

---

## T-06 — Boolean toggle in the admin modal

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-01 |
| Requirements | R-PFT-005 |
| Design | D-6, P-7 |
| Review | `checklist` — one template branch, existing permissions |
| Skills | `angular-developer`, `ui-ux-pro-max` |

**Scope.** Fourth branch in the existing chain, before the free-text `@else`: when
the key is one of the two flags, render a toggle writing exactly `'true'` / `'false'`.

**Verification.** Component test: opening either flag renders the toggle and **not**
a text input; toggling writes the canonical string; a non-flag key still renders text.

| Field | Value |
| --- | --- |
| Falsifier | Remove the new branch → the flag key falls through to the free-text `@else` and the "renders a toggle, not a text input" assertion goes red |
| Red run | Remove the branch, observe that assertion red |
| Disqualifier | Asserting the branch predicate on the component instance proves the predicate, not the render. Assert the rendered control |
| Consumers | `edit-environment-variable-modal.component.spec.ts` |

**Done.** Toggle renders for both keys; text input for others; canonical value written.

---

## Coverage closure

| Requirement · scenario / clause | Owner |
| --- | --- |
| R-PFT-001 · flag off hides qualifying | T-04 row 2 |
| R-PFT-001 · flag on does not override (`AND IT MUST`) | T-04 row 4 |
| R-PFT-001 · `BUT` no alignment data altered | T-04 (no write path touched; asserted by scope) |
| R-PFT-002 · button off, section on | T-04 row 3 |
| R-PFT-002 · section off wins | T-04 row 2 |
| R-PFT-002 · `BUT` result-code caption preserved | T-04 row 3 |
| R-PFT-003 · every absent-value path (`AND IT MUST`) | T-02 table + T-04 row 5 |
| R-PFT-004 · stale tab refused | T-03 (a) |
| R-PFT-004 · `AND IT MUST` refuse before PRMS call | T-03 (b) |
| R-PFT-004 · `BUT` no attempt number, no row | T-03 (c) |
| R-PFT-005 · admin toggles a flag | T-06 |
| R-PFT-005 · `BUT` no free-text accepted | T-06 |
| R-PFT-005 · rows always exist | T-01 |
| NFR-PFT-001 | P-2 (no cache); stated in D-4 |
| NFR-PFT-002 | T-04 (single choke point preserved) |
