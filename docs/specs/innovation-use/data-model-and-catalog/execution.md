# Execution — Results (Innovation Use) / Data Model, Catalog & Green Check

> Append-only audit trail of the AKILI `/akili-execute` Leader → Implementer → Reviewer loop for this spec.
> Written **before** each `tasks.md` checkbox flip (evidence-before-checkbox: evidence-without-checkbox is recoverable, checkbox-without-evidence is an unfalsifiable completion).

---

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/innovation-use/data-model-and-catalog` — chunk 1 of the `innovation-use` family |
| Spec id | 2026-08-innovation-use-data-model |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Approval Mode | **gated** (inherited from `proposal.md` / `family.md`) — every continue/pause gate stops for the user |
| Budget tripwire (`design.md` §12) | **13 tasks · ~2,600 LOC · 4–5 review rounds** |
| Budget consumed so far | **2 tasks (both no-op verifications) · 0 LOC · 1 review round** — within tripwire |
| Package | `server/researchindicators` (server-only; no client file touched) |
| Model routing | Leader T1 `opus` · Implementer T2 `sonnet` · Reviewer T3 `opus` (**author ≠ auditor** satisfied on both axes: different model, read-only tools) |
| Started | 2026-08-18 |
| Last updated | 2026-08-18 |

---

## Task Execution History

### T-01 — Create the TEST-bound datasource module and its npm scripts · **PASS (no-op closure)**

- **Date:** 2026-08-18
- **Status:** `[x]` — closed as **superseded / verify-only**
- **Implementer attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-IU-009 AC.4; precondition for DC-1/DC-2/DC-3/DC-10/DC-12
- **Design references:** §6.5.1 pieces 1 and 3; RB-9
- **Files changed:** **none** — `git status --short`, `git diff --stat`, and `git diff --stat --cached` all empty; `HEAD` unchanged at `9cf5cf1c`

**Why this is a no-op.** The artifact was built by the external spec `bugfix/sp-versioning-roles-id` (its own T-01, `[x]` done, Reviewer PASS 2026-08-14), committed as `59c2490f [SPEC:docs/specs/bugfix/sp-versioning-roles-id] feat(db): scratch-schema harness via dev snapshot`. Per T-03's shared-task rule — *"whichever lands first builds them; the other verifies and moves on"* — the external spec landed first. **No second harness was built.**

**Verification evidence (verbatim):**

```
$ npx ts-node -e "import('./src/db/config/mysql/orm.test.config').then(m => console.log(m.dataSource.options))"
host: '127.0.0.1', port: 3307, database: 'ari_scratch_test'

$ ARI_TEST_MYSQL_HOST="sentinel-falsify-9f3e.invalid" npx ts-node -e "..."
host: 'sentinel-falsify-9f3e.invalid'
```

The sentinel propagated; `ARI_MYSQL_HOST` (`192.168.20.210`) never appeared. The T-01 disqualifier — *"a module that merely compiles proves nothing"* — is cleared: the options were printed and read.

Reviewer independently confirmed the sentinel **discriminates** rather than merely proving "some env var is read": in `orm.config.ts`, `host` is assigned in **mutually exclusive switch branches** (`ARI_MYSQL_HOST` under `CORE`, `ARI_TEST_MYSQL_HOST` under `TEST`), so a CORE-bound module cannot print a value injected into the TEST var. Two further discriminators: the normal run printed `database: 'ari_scratch_test'` (the `ARI_TEST_MYSQL_NAME` value, not CORE's `alliancereportingdb`), and CORE's host value is independently corroborated by `baseline.sql:3` (`-- Host: 192.168.20.210    Database: alliancereportingdb`).

**Scripts reference only the test config:**

```
"migration:test:execute": "npm run typeorm migration:run -- -d ./src/db/config/mysql/orm.test.config.ts"
"migration:test:revert":  "npm run typeorm migration:revert -- -d ./src/db/config/mysql/orm.test.config.ts"
"migration:test:bootstrap": "npm run baseline:test:load && npm run migration:test:execute"
```

Neither references `orm.config.ts`.

**"Unmodified" (criterion 3) — discharged by stronger evidence than `git log` recency.** The Reviewer (read-only, no `git`) instead verified that four line-anchored citations authored 2026-08-14 still land exactly on the current files, which any modification at or above them would have shifted:

| Citation | Resolves to |
| --- | --- |
| `requirements.md` RB-9 → `orm.config.ts:71-73` | `export const dataSource: DataSource = <DataSource>(getDataSource(dataSourceTarget.CORE, true));` |
| RB-9 → `orm.config.ts:34-39` | `case dataSourceTarget.TEST:` … `break;` |
| RB-9 / `design.md` §6.5.1 piece 2 → `orm.config.ts:46` | `port: parseInt(env.DB_PORT),` |
| `design.md` §6.5.1 piece 1 trap → `orm-connection-test.module.ts:10` | `getDataSource(dataSourceTarget.CORE, false) as DataSourceOptions,` |

The `orm-connection-test.module.ts` **decoy is confirmed a decoy** — it binds `CORE` despite its name, exactly as §6.5.1 piece 1 warns.

**Reviewer verdict:** `STATUS: PASS`. *"All three Done criteria discharged; criterion 3 by stronger evidence than offered."* Safe to mark `[x]`.

---

### T-02 — Provision the disposable MySQL, the TEST port var, and the fixture Jest config · **PASS (no-op closure)**

- **Date:** 2026-08-18
- **Status:** `[x]` — closed as **superseded / verify-only**
- **Implementer attempts:** 1 (PASS on first attempt)
- **Requirements covered:** R-IU-009 AC.1, AC.4; A-4
- **Design references:** §6.5.1 pieces 2, 4, 5
- **Files changed:** **none**

**Why this is a no-op.** Built externally by `bugfix/sp-versioning-roles-id` T-01 (port var, Docker MySQL, fixture Jest config) and T-01b (the committed schema-only baseline snapshot that the original scope never anticipated), both `[x]` done, Reviewer PASS 2026-08-14.

**Verification evidence (verbatim) — this block discharges Done bullet 4.**

Port plumbing (§6.5.1 piece 2):

```
orm.test.config.ts:28   port: parseInt(env.ARI_TEST_MYSQL_PORT, 10)
.env.example:18         ARI_TEST_MYSQL_PORT=xxxxx
.env (developer's)      ARI_TEST_MYSQL_PORT=3307
docker-compose.test.yml ports: - '127.0.0.1:3307:3306'
```

Snapshot load + pending-migration state:

```
$ npm run compose:test:up
container started

$ npm run migration:test:bootstrap        # = baseline:test:load && migration:test:execute
348 migrations are already loaded in the database.
305 migrations were found in the source code.
2 migrations are new migrations must be executed.
-> RepairSpDeleteResultVersionObjectiveTables1784250000000  executed
-> RepairSpVersioningObjectiveBlocks1784300000000           executed
   transaction committed
exit 0

$ npm run migration:test:execute
No migrations are pending
```

**The 348 / 305 / 303 arithmetic reconciles — recorded as benign, not assumed benign.** The Reviewer counted independently: `Glob src/db/migrations/*.ts` → **305 files**, i.e. **303 + the 2 branch-only bugfix migrations**. `src/db/baseline/README.md` §*Derivation* documents the other number in advance: 348 live `migrations` rows diffed against all 303 files shows *"0 of the 303 current files are missing from the live table. The other 45 rows are historical/orphaned entries with no corresponding file in the current tree… harmless, since TypeORM's pending-check only looks for files absent from the table, never complains about extra rows."* So **348 = 303 current + 45 orphans**, and **2 pending = the branch-only migrations absent from the snapshot's bookkeeping**. TRD ADR-12's "303" and the README's "348" count *different things* (files vs. bookkeeping rows); they do not disagree.

*Corroboration the Implementer did not claim:* the bootstrap printing **348** already-loaded on a container that held **350** rows beforehand is only possible if `baseline:test:load` genuinely dropped and reloaded the `migrations` table — positive evidence the reload executed rather than an assertion that it did.

Fixture runner, both directions:

```
# container UP (post-bootstrap)
$ npm run test:fixtures
PASS test/fixtures/smoke.fixture-spec.ts
PASS test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts
Test Suites: 2 passed, 2 total.   Tests: 3 passed, 3 total.

# container DOWN (mandatory falsification)
$ npm run compose:test:down && npm run test:fixtures
connect ECONNREFUSED 127.0.0.1:3307        (all three test cases)
Test Suites: 2 failed, 2 total.   Tests: 3 failed, 3 total.
exit 1
```

Loud failure, no skip, no silent green — the KZ-001 failure mode is excluded. **Collected count is non-zero and correct:** the Reviewer read both fixture files and confirmed `smoke.fixture-spec.ts` has 1 `it()` and `sp-versioning-objective-blocks.fixture-spec.ts` has 2 — **3 is exactly right**, so this is not the name-gated zero-collected silent pass that `src/CLAUDE.md` §9 and `infrastructure.md` trap 2 warn about.

**KZ-006 end-to-end criterion — satisfied.** The whole mechanism ran, not per-piece checks: `compose:test:up` → `baseline:test:load` (414 KB schema-only snapshot restored into `ari_scratch_test`) → `migration:test:execute` (2 migrations applied against real MySQL, transactionally, committed) → `test:fixtures` (3 real tests executing `CALL SP_versioning(?)` and `CALL SP_delete_result_version(?, ?)` against the live container). That is **genuine stored-routine execution**, which is what `requirements.md` §4.1 says has never happened in this repository before — the blind spot is actually addressed, not restated.

**No command was pointed at `ARI_MYSQL_*`** (R-IU-009 AC.4; §4.3's hard prohibition). The Reviewer verified every script in the chain is TEST-bound, and found that `scripts/load-baseline.js` carries an **in-code refusal**, not merely a convention:

```js
if (ARI_MYSQL_HOST && ARI_TEST_MYSQL_HOST === ARI_MYSQL_HOST) fail(...)
```

This is `infrastructure.md` finding **F-01** enforced mechanically. The CORE-bound trio (`migration:dev:execute`, `migration:execute`, `migration:revert`) appears nowhere in the evidence. Leader pre-flight independently confirmed resolved host/port, not variable names: TEST → `127.0.0.1:3307`, CORE → `192.168.20.210`.

**⚠️ Scope of what the two applied migrations prove (Reviewer advisory A-2, adopted).** `RepairSpVersioningObjectiveBlocks` and `RepairSpDeleteResultVersionObjectiveTables` were applied **to the disposable scratch schema `ari_scratch_test` only**. The shared dev database is **untouched**. This does **not** discharge, and must never be read as discharging, the **T-10 merge gate**: `bugfix/sp-versioning-roles-id` remains **archived but NOT merged**, and `SHOW CREATE PROCEDURE SP_versioning` must be run against the **target** database and show no `roles_id` before T-10 begins. Archived is not merged; scratch is not shared.

**Container state left behind:** **up** — `research_indicators_server_test_mysql`, `Up`, `127.0.0.1:3307->3306/tcp`, schema loaded, zero pending migrations, fixtures green.

**Reviewer verdict:** `STATUS: PASS`, with `[x]` made conditional on this execution-note transcription — *"a Leader-side transcription into `execution.md`, not Implementer rework — the Implementer had no mandate to author that file and correctly did not invent one."* This entry satisfies that condition.

---

## Decision: T-02's M1–M6 clause is delegated downstream, not left open

**The problem.** T-02's Done bullet 2 was restated on 2026-08-18 by the *external* spec's T-03 as: *"the snapshot loads, `migration:test:execute` reports zero pending migrations, and **only this chunk's own M1–M6 apply and revert cleanly on top of it**."* The M1–M6 clause is **not satisfiable at T-02 time** — M1–M6 are created by T-04 … T-10.

**Ruling: T-02 closes `[x]`; the M1–M6 clause is delegated to T-04 … T-10.** Reasoning, with the Reviewer concurring independently:

1. **`[~]` deadlocks the spec.** `tasks.md` §0 states *"Nothing SQL runs until T-01 and T-02 land"*, and §1's graph has `T-02 → T-10` and `T-02 → T-12`. If T-02 cannot close until M1–M6 apply and revert, and M1–M6 cannot be authored until T-02 closes, neither ever moves and PR 1 becomes permanently un-mergeable.
2. **The clause is already redundantly owned downstream**, each with its own scratch-schema apply/revert gate — **T-05** (*"migration applies and reverts on the scratch schema"*), **T-06** (*"apply + revert on the scratch schema with pre-existing `result_actors` rows present"*), **T-10** (*"apply + revert on the scratch schema"*) — plus **R-IU-009 AC.1** as a standing requirement. Nothing is lost by delegating it.
3. **Provenance explains the defect.** The clause was authored by a *different* spec's task as a restatement, and inherited a sub-clause whose subject matter belongs to T-04 … T-10.

This is recorded rather than silently edited into `tasks.md`, so the closure is auditable rather than inferred. **No `requirements.md` AC is weakened** — R-IU-009 AC.1 stands unchanged and unmet-so-far.

---

## Forward pointers — carry these into later briefs

> A pointer filed here is **not** carried by having been filed. The brief carries it or nobody does.

| # | For task | Pointer |
| --- | --- | --- |
| FP-1 | **T-04** (and every later migration task) | **`compose:test:down && compose:test:up` must precede `migration:test:bootstrap`.** Reviewer advisory **A-1**: `baseline.sql` cannot drop objects **absent from the snapshot**. From T-04 on, the pending set creates *new* tables (`clarisa_innovation_use_levels`, `result_innovation_use`) and adds columns to `result_actors` / `result_institution_types`. Re-running bootstrap on a container where those already exist resets the `migrations` table to 348 **while the objects survive**, so M1 re-runs into a "table already exists" error that **reads as a migration defect but is dirty state**. Fresh container per migration run. |
| FP-2 | **T-04 … T-10** | The **M1–M6 apply-and-revert clause delegated from T-02** (see ruling above) is discharged here, task by task, against R-IU-009 AC.1. |
| FP-3 | **T-10** | The **merge gate is still open.** `bugfix/sp-versioning-roles-id` is archived but **not merged**; its two migrations exist only on branch `AC-1679-Create-the-innovation-use-section` and have applied only to the scratch schema. Run `SHOW CREATE PROCEDURE SP_versioning` against the **target** DB and confirm no `roles_id` **before T-10 starts**. |
| FP-4 | **T-12 / T-13** (fixture authoring) | Reviewer advisory **A-3**: `sp-versioning-objective-blocks.fixture-spec.ts` leaves residue on a partial `beforeAll` failure — `afterAll` issues `DELETE … WHERE id = ?` with an `undefined` parameter, which throws and aborts the remaining cleanup. Do **not** copy that teardown pattern into this chunk's many new fixtures; guard each cleanup on its id being defined, or prefer a per-suite unique-suffix `DELETE` sweep. |
| FP-5 | **T-04, T-05, T-06, T-09, T-10** | Narrowed inherited claim: *"`baseline.sql` is idempotent, safe to replay"* holds **only for objects present in the snapshot**. Do not generalize it. |

---

## Leader deviations from the task files (recorded per `.agents/leader.md` §3)

| Task | Deviation | Reason |
| --- | --- | --- |
| T-01, T-02 | **Skills:** task lists `nestjs-expert`; I added **`systematic-debugging`** conditionally (load on any unexpected result before diagnosing). | A verification task's failure mode is silent-wrong evidence; a diagnosis reflex is worth pre-arming. Not triggered — no check failed. |
| T-01, T-02 | **Effort:** `high`, above the T2 `medium` default. | A false PASS here makes every downstream SQL gate in this spec fake evidence, and a misstep points a migration runner at a shared database. |
| T-01, T-02 | **Executed as one Implementer brief** covering both tasks, reported per-task. | Delegation Ceiling — *"one subagent beats several for a single modest task."* T-02 depends on T-01 and both verify **one mechanism**; KZ-006 is explicit that per-piece verification of this exact harness is what failed before, so the end-to-end criterion necessarily spans both. Adjudicated and recorded separately. |
| T-01, T-02 | **Reviewer given the evidence report instead of a diff.** | Both tasks are no-ops with a provably empty diff. `author ≠ auditor` still applies — arguably more so, since the claim under audit is *"the harness works"* and a previous spec made that claim about this same harness (KZ-006). Reviewer stayed read-only. |
| T-01, T-02 | **Single Reviewer (4R lens checklist), not parallel lens reviewers.** | The parallel mode triggers on effort `xhigh`/`max` or a diff touching migrations/security/data-loss surfaces. Effort was `high` and the diff is **empty** — there is no artifact to attack from multiple angles. |

---

## ADVISORY findings (recorded, never gating — they consumed no rework attempt and mint no task)

From the T-01/T-02 Reviewer. **A-1 and A-2 are adopted into the forward pointers above** because they are operational preconditions for gates that *already exist*, not new scope. **A-3, A-4, A-5 are recorded and stop here** — they concern files owned by the archived external spec or general repo hygiene, and are outside this spec's approved task set. Escalating any of them is a user decision, via a proposal, not a task added here.

| # | Lens | Finding |
| --- | --- | --- |
| **A-1** | risk | Replay onto a dirty container is **not** generally equivalent to fresh provision; bites from T-04. → **adopted as FP-1 / FP-5** |
| **A-2** | readability | *"both new migrations executed successfully"* will be misread later without scratch-only scoping. → **adopted**, stated explicitly in the T-02 entry |
| **A-3** | reliability | `sp-versioning-objective-blocks.fixture-spec.ts` teardown aborts on partial `beforeAll` failure (`DELETE … WHERE id = undefined`). Low impact (disposable schema), inherited from the archived spec. → **recorded as FP-4** for the pattern T-12/T-13 must not copy |
| **A-4** | readability | `test/jest-fixtures.json` `"testRegex": ".fixture-spec.ts$"` has an unescaped dot; should be `"\\.fixture-spec\\.ts$"`. Harmless today (broader, never narrower — nothing under-collected), but reads as an anchored literal and is not one. **Recorded only** — file owned by the archived external spec |
| **A-5** | resilience | `orm.test.config.ts:28` `parseInt(env.ARI_TEST_MYSQL_PORT, 10)` yields `NaN` when unset, and `load-baseline.js` validates four `ARI_TEST_MYSQL_*` keys but **not** `_PORT` (it connects via `docker exec`, so it reports `Baseline loaded.` regardless). A developer who fills every key except the port gets a successful baseline load followed by a confusing connection failure. **Recorded only** — file owned by the archived external spec |

---

## Environment / pre-flight record (KZ-004)

Run by the Leader inline **before** spawning, per `/akili-execute` Step 2.1 and `design.md` §10 Pre-flight:

| Check | Result |
| --- | --- |
| Docker daemon | **initially OFF** → user chose to start it → up, v29.1.5 |
| `src/db/config/mysql/orm.test.config.ts` | exists |
| `ARI_TEST_MYSQL_PORT` | `3307`, matching `docker-compose.test.yml`'s `127.0.0.1:3307:3306` |
| **F-01 safety** (resolved host, not variable name) | TEST → `127.0.0.1` · CORE → `192.168.20.210` — **different hosts, TEST loopback-bound** |
| Exact npm script names | `compose:test:up`, `compose:test:down`, `baseline:test:load`, `migration:test:execute`, `migration:test:revert`, `migration:test:bootstrap`, `test:fixtures` — all present |
| `src/db/baseline/baseline.sql` | present, ~414 KB |
| `node_modules` | installed |

The Docker daemon being off was surfaced to the user as a blocking decision rather than worked around, because the scratch container is the **only** gate for DC-1/DC-2/DC-3/DC-10/DC-12 and the sole alternative target is the shared, non-disposable dev database.
