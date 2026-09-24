# Execution — Bilateral / Pool Funding Feature Toggles

**Run:** `run_351d95238858` · **Coordinator:** Claude (Leader + Reviewer) ·
**Implementer:** Grok `grok-4.7-high` via Cursor (Orca `/orchestration`)

Standing split (2026-09-23): Grok implements, Claude reviews.

---

## T-01 — Seed both flag rows and register the keys → **PASS**

| Field | Value |
| --- | --- |
| Task | `task_df9aec3871a5` |
| Dispatch | `ctx_5649b888f4a6` (attempt 2) |
| Worker | Cursor · `grok-4.7-high` |
| Reviewed by | Claude (Leader), re-measured independently |
| Verdict | **PASS** |

### Files changed (3, nothing outside scope)

- `server/researchindicators/src/db/migrations/1790258215513-seedPoolFundingFeatureToggles.ts` (new)
- `server/researchindicators/src/domain/entities/app-config/enum/app-config-key.enum.ts`
- `client/research-indicators/src/app/shared/constants/application-configuration-keys.ts`

`git status --porcelain` confirmed exactly these three and no others.

### Verification — re-run by the reviewer, not taken from the worker's report

| Check | Result |
| --- | --- |
| Migration **executed** on a fresh scratch container | `SeedPoolFundingFeatureToggles1790258215513 has been executed successfully` |
| Rows present, exact shape | Both keys, `simple_value = true`, `json_value`/`category`/`subcategory`/`field` `NULL`, descriptions matching design §6 |
| `down()` — **not covered by the worker's report** | `migration:test:revert` → both `DELETE` statements ran → `COUNT(*) = 0` |
| Re-apply after revert | `migration:test:execute` → both rows back at `true` |
| `npx eslint` (server, both files) | exit 0 |
| `npx prettier --check` (all three) | clean |
| `npx tsc -p tsconfig.build.json --noEmit` | no errors in the touched files |
| Server suite | **389 suites / 3366 tests green** |
| Client suite | **323 suites / 7330 tests green** |

The `down()` round trip is the one check the worker did not report. It was added by the
reviewer because a seed migration whose revert is untested is a migration that cannot be
rolled back — and `down()` here deletes rows by key, which is exactly the statement most
likely to be wrong and least likely to be noticed.

### Reviewer finding raised and **withdrawn**

The migration imports `AppConfigKey` from the domain layer rather than hardcoding the key
strings. Raised as a coupling concern: a merged migration must be immutable, and importing a
mutable symbol makes its emitted SQL mutable.

**Withdrawn — it is established repo convention.** `grep -h "^import" src/db/migrations/*.ts`
over all **337** migrations shows domain-enum imports are the norm, and `AppConfigKey`
specifically is already imported by **3** existing migrations. Recording the withdrawal rather
than deleting it, because the same objection will occur to the next reader.

### Carried forward

- **K-015 applies.** The pipeline deploys code, not migrations. This migration is committed but
  **not applied to any shared environment**. Applying it is a separate, human-decided step.
  Until it runs, both flags are absent — which fail-open (R-PFT-003) renders as today's
  behavior, so nothing breaks; the feature simply cannot be switched off yet.
- The worker correctly declined to write this file, since the brief scoped it to three paths.
  Authoring `execution.md` is the Leader's job, not the Implementer's.

### Attempt history

- **Attempt 1** (`ctx_b2479283b1b6`) — failed at `agent_readiness`. Not a transport false
  negative: the terminal showed `Cannot use this model: grok`. `--model grok` is not a valid
  Cursor id; the grok family there is `grok-4.7-{low,medium,high,xhigh}`. Terminal closed,
  replacement started with `--retry-of`.
- **Attempt 2** (`ctx_5649b888f4a6`) — succeeded.

---

## T-02 — The fail-open parser → **PASS**

| Field | Value |
| --- | --- |
| Task | `task_39a2d15bd75a` |
| Dispatch | `ctx_d63c94f223c9` (first attempt) |
| Worker | Cursor · `grok-4.7-high` |
| Verdict | **PASS** |

### Files created (4, nothing wired)

- `server/researchindicators/src/domain/shared/utils/feature-flag.util{,.spec}.ts`
- `client/research-indicators/src/app/shared/utils/feature-flag.util{,.spec}.ts`

The parser is deliberately **not** consumed anywhere yet — that is T-03 and T-04.

### The implementation

```ts
return value?.trim().toLowerCase() !== 'false';
```

This satisfies D-2's structural requirement rather than merely its behavior: the enabled
result **is** the inequality, so there is no `catch` and no default branch for a later reader
to "clean up" into a fail-closed one. Optional chaining covers `null`/`undefined` without a
guard clause.

### Verification — falsifier executed by the reviewer on BOTH tiers

| Check | Server | Client |
| --- | --- | --- |
| 12-row table green | 12/12 | 12/12 |
| Falsifier (`!== 'false'` → `=== 'true'`) | **8 rows red** | **8 rows red** |
| Rows that reddened | `undefined`, `null`, empty, whitespace, `maybe`, `0`, `no`, `off` | same |
| Rows that stayed green | `FALSE`, ` false `, `false`, `true` | same |
| Restored → green again | 12/12 | 12/12 |

The 8/4 split is the arithmetic the inversion predicts, and it is what makes the fixture
non-inert: `maybe` and `0` are the rows where the two implementations diverge. A table of only
`'true'`/`'false'` would have stayed fully green under the mutation and proved nothing.

| Gate | Result |
| --- | --- |
| `npx eslint` (server) | exit 0 |
| `npx prettier --check` (all four) | clean |
| `npx tsc -p tsconfig.spec.json --noEmit`, filtered to the new spec | no errors (new file, the easy case) |
| Server suite | **390 suites / 3378 tests** (+12, exactly the new table) |
| Client suite | **324 suites / 7342 tests** (+12, exactly the new table) |

The `+12 / +12` deltas are recorded because they corroborate that the new tests actually
joined their runners — a suite total that did not move would mean the file was collected by
neither.

### Reviewer check that closed an open concern

The signature is `string | null | undefined`, and `value?.trim()` would throw on a non-string.
Checked the contract rather than assuming: `ConfigurationByKeyResponse.simple_value` is typed
`string | null`, and the column is `text`, so the signature is a superset of what can arrive.
No gap.

*(An observation recorded here at T-02 — that the same interface declares `is_active?: boolean`,
"a field `app_config` does not have" — was **wrong** and is withdrawn. The column exists; see
the T-03 correction below. The client interface was accurate all along.)*

---

## T-03 — Server refusal entry in the sync gate → **PASS**

| Field | Value |
| --- | --- |
| Task | `task_17fc5bd1c49e` |
| Dispatch | `ctx_90489d257bd2` (first attempt) |
| Worker | Cursor · `grok-4.7-high` |
| Verdict | **PASS** |

### Files changed (8 — and the 6 that look out of scope are not)

Substantive: `eligibility/sync-gate{,.spec}.ts`,
`repositories/result-prms-sync-log.repository{,.spec}.ts`.

The other four (`result-prms-sync.service.spec.ts`, `result-prms-sync.controller.spec.ts`,
`knowledge-product.builder.spec.ts`, `test/result-prms-sync-claim-concurrency.integration-spec.ts`)
each received **one line**: `prms_sync_button_enabled: true,`. `SyncGateSnapshot` gained a
required field, so every fixture that builds one must supply it or stop compiling. That is the
Consumer Sweep the task asked for, not scope creep — checked by diffing each file rather than
by trusting the file list.

### The implementation

`feature_enabled` is the **first** entry of `SYNC_GATE_ENTRIES`: `503 SERVICE_UNAVAILABLE`,
`persistsRow: false`, failing only on `prms_sync_button_enabled === false` — fail-open at the
gate as well as in the parser. The flag is loaded in `loadGateSnapshot` through
`isFeatureFlagEnabled`, with the `try/catch` placed at the query rather than in the parser, so
a thrown query arrives at the parser as an absent value. That division is right: D-2 requires
the parser to have no catch.

The worker also updated the now-stale `persistsRow` doc comment (`entries 1–2` → naming the
three that write no row). An off-by-one comment left behind would have been a quiet landmine.

### Verification — both falsifiers executed by the reviewer

| Check | Result |
| --- | --- |
| `npx jest src/domain/entities/result-prms-sync --silent` | 8 suites / **101 tests** green |
| Falsifier 1 — `persistsRow: true` | **1 red**, the `persistsRow` assertion |
| Falsifier 2 — entry moved below `result_exists` | **1 red**, `refuses with feature_enabled before result existence when the flag is off and the result does not exist` |
| Restored after each | green again (13/13, then 101/101) |
| `npx eslint` · `npx prettier --check` | exit 0 · clean |

### The check the unit suite structurally cannot make (KZ-001)

Every test here mocks the `DataSource`, so a green suite says nothing about whether the new SQL
is valid against the real schema — a mocked query returns rows where a real one might throw.
So the reviewer ran the worker's SQL **verbatim** against the Dev database, read-only:

```
SELECT simple_value FROM app_config WHERE `key` = ? AND is_active = TRUE
→ executed with no error, 0 rows
```

Zero rows because T-01's migration is not applied on Dev, which fail-opens to enabled — the
designed behavior, observed rather than assumed.

### Reviewer error, recorded because it was nearly a false FAIL

The reviewer flagged `AND is_active = TRUE` as a defect, on the strength of the spec's own
premise P-1 (*"`app_config` has no `is_active` column"*). **The premise was wrong and the
implementer was right.** `AppConfig extends AuditableEntity`; `baseline.sql` declares
`is_active tinyint NOT NULL DEFAULT '1'`. P-1's citation was a `grep` over the entity subclass
— a region that structurally cannot show inherited columns, so the check was narrower than its
claim and returned a confident green (**KZ-017**, and this time the auditor's own).

Corrected in `design.md` P-1 and `requirements.md` §1.1, and the T-02 note that inherited the
same error is withdrawn above. Had this been reported as a FAIL it would have cost a rework
round to "fix" correct code into broken code.

---

## T-04 — Client flags service and the sidebar choke point → **PASS**

| Field | Value |
| --- | --- |
| Task | `task_af3b50cb85ae` |
| Dispatch | `ctx_0489108328fa` (first attempt) |
| Worker | Cursor · `grok-4.7-high` |
| Verdict | **PASS** |

### Files changed (10 — four of which look out of scope and are not)

Substantive: `pool-funding-flags.service{,.spec}.ts` (new),
`result-sidebar.component.{ts,html,spec.ts}`.

`app.config.ts` and `cognito.service.ts` (plus the `login`/`auth`/`cognito` specs that mock
them) were flagged by the reviewer as scope creep, then cleared: the precedent this task was
told to copy, `DateFormatConfigService`, is initialised in **exactly** those two places —
`app.config.ts:53-55` (app initializer) and `cognito.service.ts:95` (after login). Wiring the
new service anywhere else would have been the deviation.

### The implementation

```ts
const hiddenByExistingRules =
  meta?.indicator_id === 5 || !alignment || alignment.eligible === false || alignment.version_locked === true;
return hiddenByExistingRules || !this.poolFundingFlags.sectionEnabled();
```

OR-ed for hiding is AND-ed for showing: the flag subtracts and never adds (R-PFT-001). In the
template the button's `@if (poolFundingFlags.prmsSyncButtonEnabled())` nests **inside**
`@if (hasPoolFundingOption())`, so "section off also hides the button" falls out of the
existing choke point with no second gate (NFR-PFT-002 intact), and the `PRMS code` caption sits
outside the button's `@if`, so it survives when only the button is hidden (R-PFT-002's `BUT`).

The service copies the precedent faithfully: single-flight `loadPromise`, signals initialised
to `true`, `.catch(() => true)`. Fail-open both **before** a read resolves and **on** a failed
read.

### Verification — override falsifier executed by the reviewer

| Check | Result |
| --- | --- |
| Targeted suites (sidebar + new service) | **152 tests green** |
| **Override falsifier** (`flag on ⇒ visible`, ignoring the existing rules) | **8 assertions red** |
| Which reddened | the OICR-indicator case, `eligible=false`, `version_locked=true`, the combined-gates case, the loading-state case, the button+divider case, and both byte-identical path-list guards |
| Restored | 147/147 green |
| Full client suite | **325 suites / 7352 tests** |
| Full server suite | **390 suites / 3383 tests** |
| `npm run build` (client) | **exit 0** — `strictTemplates` sees the modified HTML |
| `npx prettier --check` (all six) | clean |

The override falsifier is stronger than the task required. It was supposed to redden the
matrix's row 4; it reddened **eight** assertions, because the pre-existing suite already pins
each existing rule independently. Those tests were guarding this property before the flag
existed.

### Spec type-check — compared as a SET, not a total

`result-sidebar.component.spec.ts` carries pre-existing errors, so an empty grep was
unreachable. The reviewer swapped in `HEAD`'s copy of that one file, re-ran, and compared the
normalized sets:

```
before: 11× TS18048 currentMetadata · 3× TS18048 route.snapshot ·
         3× TS2322 null→number · 1× TS2322 null→string · 1× TS2739 Mock→WritableSignal
after:  identical, same counts
```

**No new errors.** The other four touched spec files and the new service spec produce **zero**.
Project total 944, consistent with the historical band — no parse-abort collapse.

### Recorded for the PR reviewer: 273 of 275 changed HTML lines are whitespace

`result-sidebar.component.html` shows a 275-line diff for a ~2-line feature change, and
`result-sidebar.component.ts` 61 lines for one. Measured rather than assumed: formatting
`HEAD`'s copy with the repo's own Prettier (via `--stdin-filepath`, so the repo config
resolves) changes **273** lines in the HTML and 43 in the TS. Both files were simply never
Prettier-clean on `HEAD`, and the delivered files are.

Kept rather than reverted: husky's `lint-staged` would reformat them on commit anyway, so
reverting would produce a diff that cannot survive its own commit hook. Flagged here because a
reviewer opening that file needs to know where the two real lines are.

*(Unrelated and pre-existing: `npm run build` prints template warnings for
`PoolFundingAlignmentComponent` and `CreateOicrFormComponent`. Neither file was touched; the
build exits 0.)*

---

## T-06 — Boolean toggle in the admin modal → **PASS (code), visual approval PENDING**

| Field | Value |
| --- | --- |
| Task | `task_662fd49b9cd4` |
| Dispatch | `ctx_2ddb90125825` (first attempt) — **retained**, not released |
| Worker | Cursor · `grok-4.7-high` |
| Verdict | **PASS** on every automated gate; **not committed** pending the owner seeing it |

### Files changed (3, exactly the scope)

`edit-environment-variable-modal.component.{ts,html,spec.ts}`.

### The implementation

A fourth arm in the existing chain, placed after the CLARISA arm and before the free-text
`@else`. It mirrors the arm beside it: `POOL_FUNDING_FLAG_KEYS` next to `CLARISA_PHASE_CONFIG_KEY`,
`isPoolFundingFlagKey()` next to `isClarisaPhaseKey()`.

The control carries the contract itself:

```html
<p-toggleswitch [trueValue]="'true'" [falseValue]="'false'" ... />
```

so `ngModel` round-trips the canonical strings rather than booleans that something downstream
would have to stringify. `onPoolFundingFlagChange` normalises defensively on top. The adjacent
label reads `=== 'false' ? 'Disabled' : 'Enabled'`, which matches the parser's fail-open
semantics: anything that is not exactly `false` displays as Enabled.

Raw `p-toggleswitch` rather than a wrapped field is consistent with this modal, whose CLARISA
arm already uses a raw `p-select`. Token classes only (`atc-primary-blue-600`, `atc-grey-600`);
no hex in the new block.

### Verification — falsifier executed by the reviewer

| Check | Result |
| --- | --- |
| Modal suite | **19/19 green** |
| Falsifier — new branch deleted so the key falls through to free text | **4 red**: both "renders the toggle and not a text input" and both "writes exactly true then false" |
| Restored | 19/19 green |
| Other arms intact | tests for the CLARISA key and `SOME_OTHER_KEY` still pass |
| `npx prettier --check` | clean |
| Spec type-check, filtered to the touched files | **empty** |
| Client suite | **325 suites / 7356 tests** (see the flake note) |
| Server suite | **390 suites / 3383 tests** |
| `npm run build` | exit 0 |
| `npm run lint -- --quiet` | All files pass linting |

The assertions query the rendered DOM — `fixture.nativeElement.querySelector('[data-testid="pool-funding-flag-toggle"]')`,
then down into PrimeNG's own `[data-pc-name="toggleswitch"]` — so they prove the control
rendered, not that a predicate returned true.

### Client suite flake, confirmed not a defect

The first full client run reported **1 failed suite and 0 failed tests**, the repo's known
runner flake. Re-ran: 325/325 suites, 7356/7356 tests, and the total is `7352 + 4`, exactly the
new assertions. Recorded rather than silently re-run.

### Formatting, same as T-04

198 of the 216 changed lines in the template are Prettier normalising a file that was never
Prettier-clean on `HEAD` (measured with `--stdin-filepath`). The file also gained its missing
trailing newline.

### Why this is not committed

`no-commit-before-visual-approval`: this task adds a **new visual control**, and no gate in this
repo can see it — jsdom renders no pixels and the admin screen was never opened in a browser.
The worker said so plainly in its report. The code is verified; the appearance is not. The
worker is **retained** so a rework goes back to the context that holds the investigation.

---

## T-05 — Full gates on both packages → **PASS**

Run by the reviewer across T-03/T-04/T-06 rather than dispatched: the task changes no product
code, and its `skip-eligible` claim is "both suites green and both type-check gates clean, with
the numbers quoted".

| Gate | Result |
| --- | --- |
| Server tests | 390 suites / **3383** |
| Server lint (`npx eslint`, not `npm run lint`) | exit 0 |
| Client tests | 325 suites / **7356** (clean re-run after the known flake) |
| Client lint (`npm run lint -- --quiet`) | All files pass linting |
| Client build | exit 0 |
| Client spec type-check | project total **944**, no collapse; touched files compared as a normalized SET against `HEAD` — identical, no new errors |

Suites were run **sequentially, never concurrently** — two full-suite runs at once have twice
produced phantom failures in this repo.

---

## T-07 — Categorise the two flag rows → **PASS** (after one rework)

| Field | Value |
| --- | --- |
| Task | `task_1846cb6cc68f` → rework `task_b3b5679b44c7` |
| Dispatch | `ctx_b685d29a495f` (attempt 1) → `ctx_6f77d08c24dc` (attempt 2, same terminal) |
| Worker | Cursor · `grok-4.7-high` |
| Verdict | **PASS** |

### Why this task exists — a design error, not an implementation error

T-01 seeded the rows with `category` / `subcategory` / `field` `NULL`, because `design.md` §6
said to. The spec was wrong: **all 16 pre-existing `app_config` rows carry a category and a
subcategory**, and the admin screen *filters* by both, so the two new rows landed in the
`UNCategorized` bucket. The owner hit it the moment they applied the migration.

Root cause, and it is the **second instance of the same mistake in this spec**: the design
reasoned from the `AppConfigCategory` enum (which declares only `EMAIL`) and treated it as the
vocabulary. The enum is vestigial; the vocabulary lives in the data. P-1 failed the same way,
reasoning from the entity subclass instead of the schema.

### The values, and why

| | `POOL_FUNDING.SECTION.ENABLED` | `POOL_FUNDING.PRMS_SYNC_BUTTON.ENABLED` |
| --- | --- | --- |
| `category` | `FRONT` | `FRONT` |
| `subcategory` | `SECTIONS` | `SECTIONS` |
| `field` | `NULL` | `NULL` |

Owner's call, evaluated before being accepted. `FRONT` holds up: `config-front`'s own
description defines the category as covering *"customizable settings and feature behavior"*, and
two rows sharing a subcategory has precedent (`front-version-dev` / `front-version-prod` are both
`FRONT` / `ENVIRONMENT`).

`field` `NULL` was the owner's second correction and it is right on two independent grounds:
`EnvAppConfigUtil` builds `where.field = …`, so `field` is the third coordinate of a composite
lookup rather than a state; and the admin table renders eight columns, none of them `field`.
`ENABLED` there would have been invisible dead data shaped like a status.

**No new column was added to the admin table** — the owner ruled that out explicitly, and the
observation that `field` is unrendered was an argument for leaving it `NULL`, never for
displaying it.

### A new migration, not an edit

`1790258215513` was already applied to the owner's Dev database, so editing it in place would
never have re-run there. `1790280318260` `UPDATE`s the two rows instead. *(Attempt 1's file was
edited in place during rework rather than superseded, because it had never been committed.)*

### Verification — re-run by the reviewer on a fresh scratch container

```
after up       FRONT / SECTIONS / <NULL> / true      (both rows)
after revert   <NULL> / <NULL> / <NULL> / true       (both rows)
after re-apply FRONT / SECTIONS / <NULL> / true      (both rows)
```

The falsifier is the middle line: `down()` clears the three columns and leaves `simple_value`
`true`. A rollback that also wiped the value would have silently disabled nothing and looked
identical in the category columns.

| Gate | Result |
| --- | --- |
| Migration executed on a fresh container | `CategorisePoolFundingFeatureToggles1790280318260 ... executed successfully` |
| `npx eslint` · `npx prettier --check` | exit 0 · clean |
| Server suite | **390 suites / 3383 tests** |

### Attempt history

- **Attempt 1** (`ctx_b685d29a495f`) — reported `succeeded` with `POOL_FUNDING` / `SECTION` /
  `PRMS_SYNC_BUTTON` / `ENABLED`. A mid-flight correction was sent to its inbox and **it
  finished without applying it** — a worker's report is about the brief it started with, not the
  mail that arrived during the run.
- **Attempt 2** (`ctx_6f77d08c24dc`) — dispatched onto the **same terminal** so the worker kept
  its container and its investigation, carrying the rejected values as explicit attempt history.
  Succeeded.

### Still owed

`ARI` note for whoever applies this: migration `1790280318260` is committed but **not applied**
anywhere. The owner applied `1790258215513` by hand; this one needs the same step, or the two
rows stay uncategorised in that environment.
