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
