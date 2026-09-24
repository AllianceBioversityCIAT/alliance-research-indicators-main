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

*(Unrelated observation, deliberately not acted on: that same interface declares
`is_active?: boolean`, a field `app_config` does not have. Pre-existing and out of this
spec's scope.)*
