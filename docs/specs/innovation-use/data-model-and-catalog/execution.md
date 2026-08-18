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
| Budget consumed so far | **5 tasks (T-01, T-02 no-op verifications; T-04, T-05, T-06 migrations) · ~936 LOC · 1 review round** — within tripwire |
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

---

### T-04 — M1: catalog table `clarisa_innovation_use_levels` + the ten canonical rows · **PASS (attempt 1 of 3)**

- **Date:** 2026-08-18
- **Status:** `[x]`
- **Implementer attempts:** 1 · **Reviewers:** 3 parallel lens-scoped (all PASS) · **Rework attempts consumed:** 0
- **Requirements covered:** R-IU-002 AC.1–AC.5; NFR-IU-003; D-1, D-7; RB-4, RB-7
- **Design references:** §3.2, §5 (M1), DD-2, DD-3
- **Effort:** `xhigh` · **Skills:** `nestjs-expert` + `tdd` (Leader addition)

**Files changed (both new):**

| Path | What |
| --- | --- |
| `src/db/migrations/1787066437593-createClarisaInnovationUseLevels.ts` | M1 — `CREATE TABLE` + one ten-row `INSERT`; `down()` = `DROP TABLE` |
| `src/db/migration-specs/1787066437593-createClarisaInnovationUseLevels.spec.ts` | Seed spec, 19 tests, TDD red(19/19)→green(19/19). **New directory** — see Constitution Impact below |

**Verification:**

```
npm run migration:empty --name=createClarisaInnovationUseLevels   -> 1787066437593-...
npx jest <spec>        (RED, stub up()/down())  -> 19 failed / 19
npx jest <spec>        (GREEN, implemented)     -> 19 passed / 19
npm test -- --silent                            -> 322 suites, 2061 tests passed
compose:test:down && compose:test:up            -> fresh container (FP-1 honored)
migration:test:bootstrap                        -> M1 applied
migration:test:revert                           -> DROP TABLE, reverted
migration:test:execute  (re-apply)              -> identical ten rows
npm run lint -- --quiet                         -> reformatted line-wrapping in the new spec only;
                                                   git status re-checked, spec still 19/19
```

**⚠️ Evidence-accuracy correction (Lens 2, ADVISORY-4).** The scratch run applied **three** migrations, not one: the committed baseline snapshot records neither `1784250000000` nor `1784300000000` (the external bugfix spec's) as executed, so `migration:test:execute` applied both of those and *then* M1. `migration:test:revert` reverts only the last applied migration, so the revert/re-apply cycle exercised M1 alone and "identical ten rows" holds. **Recorded so this is never later misread as M1 having been exercised in isolation.**

**Done criteria:**

1. **Exactly ten rows, ids 1–10, levels 0–9, no duplicate `level`, no ids 13–20** — ✅. Gated by the spec's tuple-set test: cardinality 10, `ids === [1..10]`, `levels === [0..9]`, `new Set(levels).size === 10`, explicit absence of ids 13–20 (D-7), and `id === level + 1` per pair. Lens 3 notes the **duplicate-row** half of DC-8 is caught *here*, not by the per-row `toContain` (a duplicated row still satisfies `toContain`) — the two tests are complementary by design.
2. **Every `name` and `definition` matches R-IU-002 verbatim** — ✅. Lens 1 verified **mechanically, not by eyeball**: regex-extracted every name/definition from all three sources (migration, spec literal, `requirements.md`) independently; the three sets came back **byte-identical, same order, ten entries**. An ASCII-only character class was used deliberately so a Unicode lookalike (curly quote, en-dash) would truncate the match and surface as a mismatch — none did; zero non-ASCII bytes on either file's seed lines. Per-row confirmation included the `commonly`/plain pairs (4, 6, 8, 10), the `organization(s)` parenthetical, spacing around `/` in `End-user / Beneficiaries`, `in initial` (rows 3–4) vs `in the initial` (rows 5–10), and the **asymmetric absence of `some` at levels 6–7** — which looks wrong against rows 5/9 but matches the canonical table, so imposing symmetry would have been the defect. **Both copies match `requirements.md` independently, not merely each other.**
3. **`clarisa_innovation_readiness_levels` row count and contents unchanged (AC.5)** — ✅, **but not on the evidence originally offered.** The Implementer reported `readiness_before = 0 / readiness_after = 0`. **That is rejected as the evidence for this AC:** the scratch schema is built from a *schema-only* snapshot, so that catalog is empty there, and comparing 0 → 0 is vacuously true over an empty set — precisely the **DD-11** failure shape, and silent on the two mutations AC.5's phrase "same contents" actually names (`UPDATE`, partial `DELETE`). **The evidence relied on instead** is the spec's line 226 assertion — iterating *every* captured statement from `up()` and asserting none references `clarisa_innovation_readiness_levels` (case-insensitive), with line 242 doing the same for `down()` — which forecloses INSERT/UPDATE/DELETE/ALTER/TRUNCATE/DROP against that table by name. Corroborated by Lens 1's repo-wide grep: only the two new files reference the new table, and neither statement names the readiness catalog. The 0 → 0 count is context, not proof.
4. **Fresh container → snapshot → migrate reproduces the identical ten rows** — ✅ under the snapshot reading (see the adjudication below). Verified twice, on two separate fresh containers.

**Trap compliance:**

| Trap | Evidence |
| --- | --- |
| `id = level + 1`, both seeded explicitly | Every tuple stores `id` and `level` as independent literals; `id=6 → level=5` confirmed in the DB. Neither derived from the other at insert time (RB-4) |
| No unique constraint/index on `name` | `SHOW CREATE TABLE` carries only `PRIMARY KEY (id)`; no `UNIQUE` token anywhere |
| No `additional_guidance` column | DDL lists only the six `AuditableEntity` columns + `id`/`level`/`name`/`definition` |
| `id` PK, **not** auto-increment | `` `id` bigint NOT NULL `` + `PRIMARY KEY (id)`, no `AUTO_INCREMENT`; spec asserts `not.toMatch(/AUTO_INCREMENT/i)` |

**The falsification (performed, not asserted):** mutated row id=6's definition trailing `.` → `!` (one character) in the migration only.

```
● seeds id 6 / level 5 with name and definition matching R-IU-002 verbatim
  expect(received).toContain(expected)
  Expected substring: "(6, 5, 'Connected next-user', 'Innovation is commonly used by organizations
                        connected to partners involved in the initial innovation development.')"
  Received string: "...development!'),..."
Tests: 1 failed, 18 passed, 19 total
```
Reverted → `19 passed`. Working tree clean of the mutation.

**Lens 3 traced the falsification against the code rather than accepting the report:** the assertion builds `` `(${id}, ${level}, '${name}', '${definition}')` `` and is **anchored on both ends** (leading `(`, trailing `')`), so appended *or* truncated text also breaks the match — not only substitution. The id/level pair `(6, 5,` is unique and the tuple-count regex is insensitive to definition text, so exactly one assertion can fail. Test census reconciles: 6 DDL + 1 tuple-set + 10 `it.each` + 1 readiness-negative + 1 `down()` = **19**. `EXPECTED_ROWS` imports **only the migration class**, no data — the KZ-001 guard holds and the gate is non-tautological.

#### Reviewer verdicts — 3 parallel lens-scoped reviewers, all PASS

| Lens | Scope | Verdict |
| --- | --- | --- |
| **L1** | Spec conformance & seed correctness | **PASS** — ten rows character-exact in both copies against `requirements.md`; DDL matches §3.2 exactly; scope fence clean (repo-wide grep for `clarisa_innovation_use_levels｜ClarisaInnovationUseLevel｜innovation_use_level` returns **only the two new files**) |
| **L2** | Migration safety, reversibility, precedent fidelity | **PASS** — strictly additive; `down()` fully and exclusively reverses `up()` with no droppable residue; append-only respected; column list **byte-identical to the named precedent** `1749604157074` |
| **L3** | Gate fidelity & test integrity | **PASS** — the gate is real, not comfortable; clears T-04's Disqualifier decisively; none of the 19 tests is vacuous (every one has a reachable failing input) |

**Four of five Leader-flagged "divergences" were false positives** — which is why they went to an independent lens instead of being guessed at. L2 established that the mixed timestamp precision (`created_at`/`updated_at` at `timestamp(6)`, `deleted_at` plain) is **required for fidelity, not sloppiness**: `AuditableEntity` renders the first two via `@CreateDateColumn`/`@UpdateDateColumn` (MySQL precision 6) and `deleted_at` via a plain `@Column`. "Correcting" `deleted_at` would hand T-08's entity a **permanent phantom schema diff**. Column order, `is_active tinyint NOT NULL DEFAULT 1`, and the `ON UPDATE CURRENT_TIMESTAMP(6)` clause are all character-identical to the precedent and to the live table in `baseline.sql:1336-1349`.

**The one real divergence is an improvement.** M1 declares `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`; the precedent stops at bare `ENGINE=InnoDB` and inherits the schema default. `baseline.sql:1349` shows what that produced in reality: `clarisa_innovation_readiness_levels` actually shipped as **`utf8mb3`**. Being explicit matches TRD §5.1 verbatim and the newer in-repo convention, and keeps M1 off that rake.

**On `CREATE TABLE IF NOT EXISTS` (Leader asked; L2 argued it down).** Plain `CREATE TABLE` is correct and `IF NOT EXISTS` would be **strictly worse**: `up()` is CREATE **plus** INSERT, so on a dirty container the CREATE would silently no-op and the INSERT would hit the pre-existing table — and if that table carried the source system's confirmed-wrong ids 13–20 (D-7), the insert could partially succeed and leave an **18-row catalog**. That converts a loud crash into exactly the DC-8 silent corruption R-IU-002 AC.1 exists to prevent. M1 therefore makes FP-1 **detectable** rather than better or worse; container hygiene belongs in the harness, not the DDL.

---

## Correction: the migration-timestamp ceiling was higher than the Leader's brief stated

**A Leader briefing error, caught by Lens 2.** The T-04 brief instructed that the new timestamp must sort after **`1784300000000`** — the highest migration *file* on this branch. That was the wrong ceiling. `baseline.sql:8269`'s `INSERT INTO \`migrations\`` records migrations as **already executed** up to **`1786679227000`**, including nine with no file in this checkout (`1784500000000`, `1785866413438`, `1785870729889`, `1785870730889`, `1785872085723`, `1786043523207`, `1786044600000`, `1786045516418`, `1786636994078`, `1786679227000`) — the shared dev DB is **ahead of the branch**.

A timestamp chosen only to beat the file ceiling could have landed **below** the executed ceiling and been silently treated as already-applied. No harm occurred: `migration:empty` stamped `1787066437593` from the real clock, which clears both. **The correct ceiling for every remaining migration in this spec is `1786679227000`** — carried as FP-6.

---

## Constitution Impact: T-04

**A new repo-level convention was created: `server/researchindicators/src/db/migration-specs/`.**

**Why it was unavoidable.** `orm.config.ts:55` sets `migrations: [`${__dirname}/../../migrations/**/*{.ts,.js}`]`, which resolves to `src/db/migrations/**`, and `orm.test.config.ts` inherits the same glob through `getDataSource(dataSourceTarget.TEST)`. TypeORM's CLI `require()`s **every** match expecting a `MigrationInterface` export, so a `.spec.ts` placed beside its migration executes its top-level `describe(...)` outside the Jest runtime and crashes with `ReferenceError: describe is not defined`. The Implementer reproduced this before moving the file; Lens 3 independently verified the glob resolution on both the ts-node path and the `dist/db/migrations/**` path used by `migration:execute`.

**Why the sibling directory is the right remedy** (Lens 3 weighed all three):

| Option | Verdict |
| --- | --- |
| **Sibling `src/db/migration-specs/`** ✅ chosen | Collected by `npm test` (`rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"`, no extra `testPathIgnorePatterns`); outside the migrations glob; excluded from `dist/` by `tsconfig.build.json`'s `"**/*spec.ts"` |
| Narrow the TypeORM glob | ✗ Cannot be expressed cleanly — TypeORM's directory importer takes **positive** globs, and a `[0-9]*`-prefix trick fails because the spec file *is* timestamp-prefixed. Worse, it would mutate the datasource used for **CORE production** migration runs — a far larger blast radius than adding a directory |
| Place it under `test/` | ✗ **Reproduces a trap the child guide already documents.** Jest unit `rootDir` is `src`, so a `*.spec.ts` under `test/` is collected by **neither** `npm test` nor `test:e2e` — the same silent zero-collection failure §9 warns about for `*.fixture-spec.ts` |

**Guides synced in this task's commit rather than deferred to `/akili-archive`** — the deferral condition in `/akili-execute` Step 3.5 is met: `server/researchindicators/src/CLAUDE.md` §3's rule *"Specs: sibling `*.spec.ts`"* is **actively wrong for migrations specifically**, and it is the one case where following the guide **crashes the migration runner**. T-05, T-06, T-09 and T-10 each add a migration and would each hit this before archive ever runs, guaranteeing the rediscovery the guide exists to prevent. Direct precedent: §9's `*.fixture-spec.ts` naming-trap note was landed the same way on 2026-08-18.

- ✅ `server/researchindicators/src/CLAUDE.md` §2 (source map) — `migration-specs/` added
- ✅ `server/researchindicators/src/CLAUDE.md` §3 (where to put a new file) + §9 (Tests) — trap documented
- Root `CLAUDE.md`: **no change needed** (Lens 3 concurs)
- **CodeGraph re-index pending** (new directory) — for `/akili-archive`
- `server/researchindicators/src/AGENTS.md` is a byte-identical mirror of the child guide and is re-synced alongside it

---

## Forward pointers — updated after T-04

| # | For task | Pointer |
| --- | --- | --- |
| **FP-6** | **T-05, T-06, T-07, T-09, T-10** | **Migration timestamps must exceed `1786679227000`, not `1784300000000`.** The baseline snapshot records migrations as executed up to `1786679227000` (nine of them with no file on this branch — the shared dev DB is ahead of the checkout). A timestamp above the *file* ceiling but below the *executed* ceiling would be silently treated as already-applied. `migration:empty` stamps from the real clock and clears this naturally — **verify, don't assume**. |
| **FP-7** | **T-05 (M2)** and the DevOps hand-off | **M1's `down()` stops being order-independent once M2 lands.** `DROP TABLE clarisa_innovation_use_levels` will fail (MySQL 1217/3730) while `result_innovation_use.innovation_use_level_id`'s FK still references it. `design.md` §13 already mandates reverse-order backout and §5 already specifies M2's `down()` as *"`DROP TABLE` (FKs first)"* — **no rule is violated**, but that documented order is now **load-bearing rather than tidy**, and the DevOps hand-off must carry it explicitly. |
| **FP-8** | **chunk 2** (`innovation-use/details-api`) | **Collation asymmetry.** `clarisa_innovation_use_levels` is `utf8mb4_unicode_520_ci`; pre-existing tables in `baseline.sql` (`:1349`, `:2232`) shipped as **`utf8mb3`**. Nothing is exposed today — the only cross-table link is `bigint id`, and M5's validation function filters on numeric `level`. But a chunk-2 query that `UNION`s or directly compares `clarisa_innovation_use_levels.name`/`.definition` against a utf8mb3 text column can raise **MySQL 1267 "Illegal mix of collations"**. |
| **FP-9** | **T-05 … T-10** (every migration task) | **Recovery note, structural and not to be "fixed":** MySQL forces an implicit commit on DDL, so a CREATE+INSERT migration whose `INSERT` fails after the `CREATE` succeeds leaves the table **with no `migrations` bookkeeping row**. `migration:revert` cannot clean that up (no row to revert) — recovery is a manual `DROP TABLE`. Inherent to MySQL, shared by every CREATE+INSERT migration in the repo, and `design.md` §5 specifies M1 as one migration: **do not restructure**. |

FP-1 … FP-5 from the T-01/T-02 entry remain live. **FP-1 (fresh container before bootstrap) was honored in T-04 and proved necessary** — keep it standing for every remaining migration task.

---

## Leader deviations from the task files — T-04 (recorded per `.agents/leader.md` §3)

| Deviation | Reason |
| --- | --- |
| **Skills:** task lists `nestjs-expert`; I added **`tdd`**. | To force spec-before-migration. Writing the expectations *before* the migration exists structurally prevents the tautological gate (importing the migration's own constant and comparing it to itself), which is the KZ-001 shape this task's Disqualifier targets. It worked: red 19/19 → green 19/19, and `EXPECTED_ROWS` is genuinely independent. |
| **Effort:** `xhigh` (default is `medium`). | Append-only migration (ADR-5 — immutable once merged) carrying the family's most-warned-about trap (`id ≠ level`). Not `max`: the tier-vs-effort rule forbids `max` on a T2 model; escalation would have meant a higher tier, which this task's bounded blast radius did not warrant. |
| **Review mode: 3 parallel lens-scoped Reviewers**, not the single lens-checklist Reviewer used for T-01/T-02. | Required by `/akili-execute` §2.3 on **both** triggers: effort `xhigh` **and** the task touches migrations. Lenses: spec-conformance/seed-correctness · migration-safety/reversibility · gate-fidelity/test-integrity. |
| **Reviewers given file paths, not an inlined diff.** | The diff-inline rule exists because a diff is ephemeral working state. Here both files are new, on disk, and readable by a read-only Reviewer — so pointers satisfy it at a third of the cost, and each lens read the real file rather than my rendering of it. |
| **`from empty` reinterpreted** for Done criterion 4 (see below). | The literal premise is known false (ADR-12 / RB-1d). |

---

## Documentation drift found in T-04 — the "from empty" premise (KZ-005 recurrence)

**T-04's Done criterion 4 and `requirements.md` R-IU-002 AC.4 both say *"re-running the migration suite **from empty**"*, and R-IU-002's Scenario opens *"GIVEN an empty database."* That premise is false and known false.** TRD **ADR-12** and RB-1d establish that the 303-migration history is **not replayable from an empty database** — it dies around migration 139 of 303 on `sec_template` (MySQL 1146).

The identical false premise was already corrected in **T-02**, **`design.md` §6.5.1 piece 4**, and **`requirements.md` §4.3** on 2026-08-18. It survived here in a **different phrasing** — a textbook **KZ-005** miss: the correction swept the *string* it had edited, not the *claim*.

**Leader adjudication applied in the brief:** the achievable, equivalent reading is *fresh scratch container → `baseline:test:load` → `migration:test:execute` → assert the identical ten rows*. That is what was verified, twice. Lens 3 concurs that AC.4's determinism follows from the seed being a static literal, while its *application* must be evidenced by the scratch-schema apply.

**Not silently edited.** Correcting R-IU-002 AC.4, its Scenario, and T-04's criterion 4 requires the two-direction sweep (`/akili-specify` → *Correction Closure*) across the whole spec folder, and per KZ-005 the sweep must chase the **claim in every phrasing**, not the string. **Raised for a user ruling; deliberately not absorbed into T-04.**

---

## ADVISORY findings — T-04 (recorded, never gating; 0 rework attempts consumed; no task minted)

Per `/akili-execute` §2.4, advisories are recorded and stop here. Two were **adopted** because they are either mandatory record-accuracy or an explicitly authorized Constitution sync; the rest are **recorded only** — escalating any of them is a user decision via a proposal, not a task added to this spec.

| # | Lens | Finding | Disposition |
| --- | --- | --- | --- |
| **L3-a** | reliability | **The `INSERT`'s column list is never asserted.** A list/tuple arity or column-name mismatch passes all 19 tests and fails only at MySQL (error 1136). Lens 3 calls this *"the one reachable hole I would close"*; one line does it: `expect(insertSql).toMatch(/\(\s*`id`\s*,\s*`level`\s*,\s*`name`\s*,\s*`definition`\s*\)\s*VALUES/i)` | **Recorded only.** Real and cheap, but adding it would widen T-04 to absorb an advisory — forbidden. **Surfaced to the user.** |
| **L3-b** | risk | Do not cite `readiness_before = 0 / readiness_after = 0` as AC.5 evidence — vacuous over the schema-only baseline (DD-11 shape) | **Adopted** — record accuracy is mandatory. Done criterion 3 above cites the line 226/242 assertion instead |
| **L3-c** | readability | `not.toMatch(/UNIQUE/i)` is asserted over the **whole** CREATE TABLE while the test name scopes to `name`. Fails safe (only ever over-strict) but would block a legitimate future unique index on **`level`** with a misleading message | Recorded only |
| **L3-d** | readability | The two `expect(...)` calls in `beforeAll` are load-bearing (they guard `insertSql` from being `undefined` across the ten `it.each` tests) but surface as an unnamed hook failure. Cleaner: keep `beforeAll` derivation-only, promote the counts to their own `it` | Recorded only |
| **L3-e** | risk / convention | Child guide §2/§3/§9 stale and actively misleading for migration specs; land the fix in this commit. Also suggested: add `"!**/db/migration-specs/**"` to `collectCoverageFrom` as forward protection against a future **non-spec** helper landing there at 0% coverage | **Guide sync adopted** (Constitution Impact above). **The `collectCoverageFrom` change is recorded only** — it protects against a file that does not exist |
| **L2-1** | risk | utf8mb4 vs the shared DB's real utf8mb3 | **Adopted as FP-8** |
| **L2-2** | reliability | CREATE+INSERT is not atomic on MySQL (DDL implicit commit) | **Adopted as FP-9**; explicitly *do not restructure* |
| **L2-3** | readability | `down()`'s FK-order dependency is not mentioned in the migration's own header comment; one line would put it where the next maintainer reading `down()` will see it | **Adopted as FP-7** for the DevOps hand-off; the in-file comment is **recorded only** (editing the file would widen T-04) |
| **L2-4** | process | Record that three migrations applied, not one | **Adopted** — see the evidence-accuracy correction above |
| **L1-i** | readability | New `migration-specs/` convention undocumented in the child guide | **Adopted** (same as L3-e) |
| **L1-ii** | risk (low) | Explicit collation differs from the "mirrored" precedent; an improvement, but §3.2 says "same column shape" and a future reader may misread it | Recorded only; overlaps FP-8 |
| **L1-iii** | reliability (positive) | The `toContain` row assertion depends on the migration's exact `', '` inter-column spacing — a Prettier reflow would break it. **Fails loudly, not open** — the correct direction for a gate | Recorded only; no action |

**Budget after T-04:** 3 of 13 tasks · ~317 LOC of ~2,600 · 1 of 4–5 review rounds consumed (T-04 passed first attempt). Within tripwire.

---

### T-05 — M2: detail table `result_innovation_use` · **PASS (attempt 1 of 3)**

- **Date:** 2026-08-18
- **Status:** `[x]`
- **Implementer attempts:** 1 · **Reviewers:** 2 parallel lens-scoped (both PASS) · **Rework attempts consumed:** 0
- **Requirements covered:** R-IU-001 **AC.1, AC.4**; NFR-IU-002. *(AC.2 → T-08; AC.3 → T-12. Neither claimed here — Lens A verified the mapping is honest.)*
- **Design references:** §3.1, §5 (M2), DD-3
- **Effort:** `xhigh` · **Skills:** `nestjs-expert` + `tdd` (Leader addition)

**Files changed (both new):**

| Path | What |
| --- | --- |
| `src/db/migrations/1787068132517-createResultInnovationUse.ts` | M2 — `CREATE TABLE` + two `ALTER TABLE ADD CONSTRAINT`; `down()` drops both FKs then the table |
| `src/db/migration-specs/1787068132517-createResultInnovationUse.spec.ts` | DDL spec, 10 tests, TDD red(10/10)→green(10/10). Placed per the `migration-specs/` rule established in T-04 |

**Verification:**

```
npm run migration:empty --name=createResultInnovationUse  -> 1787068132517
npx jest <spec>   (RED, empty stub)   -> 10 failed / 10
npx jest <spec>   (GREEN)             -> 10 passed / 10
npm test -- --silent                  -> 323 suites, 2071 tests passed (was 322/2061)
compose:test:down && compose:test:up  -> fresh container (FP-1)
migration:test:bootstrap              -> M2 applied on top of M1
migration:test:revert                 -> M2 ONLY reverted (FK, FK, DROP TABLE)
migration:test:execute                -> M2 re-applied
npm run lint -- --quiet               -> reformatted the spec's line wrapping only; git status
                                         re-checked, still only the two new files; spec 10/10
compose:test:down                     -> container + network removed (docker ps -a empty)
```

**Timestamp — all three ceilings cleared** (FP-6 discharged, and *verified* rather than assumed):

| Ceiling | Value |
| --- | --- |
| Highest pre-spec migration file | `1784300000000` |
| Highest migration file on branch (T-04's M1) | `1787066437593` |
| **Highest executed row in the baseline snapshot** (the binding one) | **`1786679227000`** (`baseline.sql:8269`) |
| **M2** | **`1787068132517`** — a real-clock stamp ~28 min after M1 |

**Done criteria:**

1. **Table exists, `result_id` is PK, both FKs resolvable** — ✅. `SHOW CREATE TABLE` shows `PRIMARY KEY (result_id)`, `FK_result_innovation_use_result_id → results(result_id)`, `FK_result_innovation_use_innovation_use_level_id → clarisa_innovation_use_levels(id)`. Lens A confirmed the FK targets the catalog's **`id`**, not `level` (DD-3), and that M1 emits `id bigint NOT NULL` + `PRIMARY KEY(id)` so type and signedness match — the FK is *creatable*, not merely textually plausible.
2. **Duplicate active row structurally impossible — demonstrated** — ✅:
   ```
   ERROR 1062 (23000) at line 2: Duplicate entry '33540' for key 'result_innovation_use.PRIMARY'
   ```
   **Lens A's forensic point, which is why this is proof and not decoration:** MySQL 8 renders the key as `table.index_name`, and `PRIMARY` is a **reserved** index name that only a primary key carries. A `UNIQUE KEY` on `result_id` would have reported its own index name (`IDX_…`/`UQ_…`). The error string therefore independently corroborates `PRIMARY KEY (result_id)` rather than a unique index — exactly the distinction T-05's Disqualifier targets.
3. **`is_active` defaults to `1`, `deleted_at` to `NULL`** — ✅. Real row after a bare insert: `result_id=33540, innovation_use_level_id=NULL, innovation_use_level_explanation=NULL, is_active=1, deleted_at=NULL`.
4. **`down()` reverts cleanly** — ✅. `migration:test:revert` reverted **M2 only** (DROP FK level → DROP FK result → DROP TABLE), M1 untouched per FP-7.

**Second falsification — the FK is real** (R-IU-001's *"AND IT MUST reject an `innovation_use_level_id` absent from the catalog"*):
```
ERROR 1452 (23000) at line 2: Cannot add or update a child row: a foreign key constraint fails
  ('ari_scratch_test'.'result_innovation_use',
   CONSTRAINT 'FK_result_innovation_use_innovation_use_level_id'
   FOREIGN KEY ('innovation_use_level_id') REFERENCES 'clarisa_innovation_use_levels' ('id'))
```
Constraint identifier, child table, child column, referenced table and referenced column all match the migration verbatim. Schema is **`ari_scratch_test`** — the disposable container, never `ARI_MYSQL_*`.

**Fixture rows created and cleaned up** (recorded per Lens A's evidence-completeness note — error 1062 is only reachable if a first insert succeeded, which requires a parent `results` row, and `baseline.sql` is schema-only):

| Table | Rows | Disposition |
| --- | --- | --- |
| `results` | `result_id=33540` (`result_official_code=999999901`), `result_id=33541` (`999999902`), both `result_status_id=NULL` | deleted; `SELECT COUNT(*)` returned `0` |
| `result_innovation_use` | one row, `result_id=33540`, defaults | deleted; count `0` |

The container was then destroyed entirely, so no residue survives regardless.

#### The PK-vs-"active rows" question — adjudicated

R-IU-001 says *"must NOT be possible to write two **active** rows"*; a PK forbids two rows **at all**. **Lens A ruled this faithful and stronger, not over-constraining**, and the reasoning is worth keeping:

1. **Versioning (R-IU-011 AC.1)** — `SP_versioning` writes the copy against a **new** `results` row, hence a new `result_id`. No collision. Proven by precedent: `result_innovation_dev` has the identical PK-is-FK shape and is already copied by its dedicated block (`1783029013035:695-770`) without conflict.
2. **Both hard deletes (AC.3, AC.4)** — the row is removed; nothing survives to collide.
3. **Soft delete (AC.5)** — leaves exactly one row, `is_active = FALSE` + `deleted_at` set. A second row would only be needed if a soft-deleted result were re-reported *in place* — but `delete_result` deactivates the **result itself** (`results.is_active = FALSE`, `result_status_id = 8`), so re-reporting means a new `results` row and a new `result_id`. A restore reactivates the existing row by `UPDATE` on the same PK, which is what a PK permits.
4. `design.md` **§3.7's "no index added" review basis depends on `result_id` being the PK** — a unique index would have satisfied the constraint while weakening that argument.

#### Reviewer verdicts — 2 parallel lens-scoped reviewers, both PASS

| Lens | Scope | Verdict |
| --- | --- | --- |
| **A** | Spec conformance · constraint correctness · gate fidelity · requirement-mapping honesty | **PASS** — DDL matches §3.1 column-for-column, all three traps clear, mapping honest, gate non-tautological with a reachable failing input behind every assertion (8 of 10 carry real weight) |
| **B** | Migration safety · reversibility · precedent fidelity · forward-compatibility | **PASS** — append-only and correctly ordered above all three ceilings; `down()` fully and exclusively reverses `up()`; **all three cited precedents verified to genuinely establish every claimed pattern** |

**Every apparent divergence from the shipped `result_innovation_dev` is mysqldump normalization or an InnoDB default, not a semantic difference** — Lens B proved each by comparing what the precedent *authored* against what the dump *renders*: `deleted_at timestamp NULL` ≡ `timestamp NULL DEFAULT NULL`; `is_active … DEFAULT 1` ≡ `DEFAULT '1'`; the absent `KEY` clauses are InnoDB auto-created (the precedent authors **zero** `KEY` clauses yet `baseline.sql:3231-3233` shows them, with index names identical to the constraint names); the absent `ON DELETE` resolves to the same rule.

**Citation check passed this time** — notable because `design.md` §6.7's *"Why this section was wrong three times"* records three consecutive rounds citing the wrong migration for `SP_delete_result_version`. All three of M2's cited precedents (`1749603152180`, `1749763135881`, `1749957832239`) exist and establish exactly the claimed patterns.

**`down()`'s explicit FK drops are redundant but correctly kept.** Lens B confirmed InnoDB drops a table's own outgoing FKs as part of `DROP TABLE` — the constraint that blocks a drop is one *referencing* the table, and `result_innovation_use` is the child in both FKs. Keeping them is harmless and marginally better: it matches the precedent's shape, makes the reversal self-documenting, and the only way they could error (1091) requires a half-applied `up()`, which per FP-9 leaves no `migrations` row so `down()` would never be called. The drop **order** between the two is arbitrary.

---

## Forward pointers — added after T-05

| # | For | Pointer |
| --- | --- | --- |
| **FP-10** | **T-08** | **Pin the FK constraint names on the entity, or `migration:generate` will propose rename churn.** Lens B verified against the installed TypeORM **0.3.20**: `RdbmsSchemaBuilder.js:193-202` (`dropOldForeignKeys`) and `:764-768` (`createForeignKeys`) match existing constraints **by NAME only, never by structure**, and the metadata name is `"FK_" + sha1(table_sortedColumns).substr(0,27)` (`DefaultNamingStrategy.js:81-89`). M2's hand-named FKs therefore produce a **drop-then-re-add**, not duplicates. Fix: `@JoinColumn({ name: 'result_id', foreignKeyConstraintName: 'FK_result_innovation_use_result_id' })` and likewise `'FK_result_innovation_use_innovation_use_level_id'` — `foreignKeyConstraintName` is confirmed available on `JoinColumnOptions` in this version. **The precedent will mislead you:** `result-innovation-dev.entity.ts:214-266` pins **no** constraint names, and grep finds **zero** `foreignKeyConstraintName` and **zero** hand-named FKs across all 307 migrations. Two secondary traps: deleting the FK statements out of the generated migration makes the generator re-propose the same diff forever; and if such a churn migration ever lands, `DROP FOREIGN KEY` leaves the index behind, so you get an index named `FK_result_innovation_use_innovation_use_level_id` supporting a constraint named `FK_<sha1>`. **Exposure is broader than T-08 — it is anyone who runs `migration:generate` for any reason.** |
| **FP-11** | **T-10 rollout · DevOps hand-off** | **M2's `down()` acquires a SECOND, SILENT order dependency once M5 lands.** `innovation_use_validation`'s body references `result_innovation_use`, and **MySQL does not schema-bind stored routines or views** — so dropping the table without first reverting M5 raises **nothing at DDL time** and instead fails at the function's next invocation (`ER_NO_SUCH_TABLE`). §13's reverse-order backout already covers it, but unlike FP-7's loud MySQL 1217/3730 **this variant leaves no trace if the order is broken.** Must be stated explicitly in the DevOps hand-off alongside FP-7. |
| **FP-12** | **chunk 2** (`innovation-use/details-api`) | **The write path is load-bearing because the PK is the constraint.** Mirror `result-innovation-dev.service.ts`: `create()` once via `entityManager.save`, then `findOne({ result_id, is_active: true })` + `.update(resultId, …)`. **Never insert-on-save** — an `INSERT` against a soft-deleted row raises the very MySQL 1062 that T-05 relies on as proof of correctness. |

FP-1 … FP-9 remain live. **FP-6 and FP-7 were both exercised in T-05 and both held.**

---

## Open doc conflict found in T-05 — R-IU-001 AC.3 is double-assigned

**Found by Lens A; pre-existing, not caused by T-05.** `tasks.md` **T-08** lists *"Requirements covered: R-IU-001 (AC.2, AC.3)"*, while **§3's traceability row** and **T-12** both place the AC.3 detail-row round trip in **T-12** — consistent with `design.md` §10's *"Integration — Detail-row round trip (R-IU-001 AC.3) … §6.5 harness"*.

Harmless for T-05, which claims neither AC. But **whichever of T-08 / T-12 lands first will report AC.3 closed**, and the other will either duplicate the work or skip it. **Needs a ruling before T-08 runs.** Raised, deliberately not silently edited — reassigning an AC is a spec correction requiring the two-direction sweep, not a task finalization step.

---

## Leader deviations & process notes — T-05

| Item | Note |
| --- | --- |
| **Skills** | `nestjs-expert` + **`tdd`** (task lists only the former) — same reasoning as T-04; red 10/10 → green 10/10 |
| **Effort** | `xhigh` — append-only migration adding an FK into `results`, the domain hub |
| **Review mode** | **2** parallel lenses, not T-04's 3. No ten-row seed corpus to verify character-by-character, so gate-fidelity folded into the conformance lens. Fan-out capped to the surface |
| **⚠️ Leader briefing asymmetry** | I gave the verbatim MySQL 1062/1452 evidence to **Lens A only**. Lens B therefore could not judge Done criterion 2 and raised a **CROSS-LENS FLAG** — *"if no duplicate-insert attempt was actually run, that checkbox is unearned"* — and correctly deferred rather than asserting. It worked, but the split was mine, not a reviewer failing. **Next time: give every lens the full evidence set and vary only the lens.** |

---

## ADVISORY findings — T-05 (recorded, never gating; 0 rework attempts consumed; no task minted)

Adopted only where the item is mandatory record-accuracy or a forward pointer. Everything else is recorded and stops here — editing files or widening a task to absorb an advisory is forbidden.

| # | Lens | Finding | Disposition |
| --- | --- | --- | --- |
| **A-1** | risk | Chunk 2's write path must not insert-on-save | **Adopted as FP-12** |
| **A-2** | reliability | **No re-runnable gate for the constraint itself.** `design.md` §6.5's F1–F18 contains **no** duplicate-insert and **no** off-catalog-FK fixture, so Done criterion 2 rests on a one-time manual demonstration recorded in prose here. Two cheap fixtures in T-12's set would make the family's signature defects regression-proof rather than historically observed | **Recorded only** — adding fixtures to T-12 would widen a task from an advisory. **Surfaced to the user** |
| **A-3** | readability | `not.toMatch(/ON DELETE/i)` / `/ON UPDATE/i` gate *text*, not behavior — InnoDB treats `NO ACTION` and `RESTRICT` identically, so a maintainer aligning the statement with the precedent's explicit clauses would fail a test having changed nothing | Recorded only |
| **A-4** | gate fidelity (minor) | "Exactly one `CREATE TABLE`" lives in `beforeAll`, so a regression surfaces as a hook error rather than the named test; and test 6's `/utf8mb4/i` is subsumed by its `/utf8mb4_unicode_520_ci/i` and cannot fail independently | Recorded only |
| **A-5** | evidence | Record the seed statements verbatim, since the container is gone | **Adopted** — the fixture table above |
| **B-1** | risk / forward-compat | FK naming vs TypeORM's hash matching. **Direct answer to the Leader's question: NO, do not change the migration before merge** — no rule constrains FK names (checked TRD §2.4, §Indexes, child guide §7, `design.md` §3.1/§3.7, R-IU-009), matching TypeORM would require embedding two opaque sha1 prefixes obtainable only by writing T-08's entity first (inverting task order), and a verified two-token fix exists on the T-08 side that makes the hand-naming a net **improvement** — greppable and immune to hash churn | **Adopted as FP-10** |
| **B-2** | risk / reversibility | The silent M5 order dependency | **Adopted as FP-11** |
| **B-3** | readability | Header lines 27-29 say *"No `ON DELETE`/`ON UPDATE` clause … matching the `result_innovation_dev` precedent"* — **the precedent carries the clause explicitly** (`1749603152180:13`). The resulting schema is identical (InnoDB resolves `NO ACTION` to `RESTRICT`; mysqldump prints the clause only for non-default rules), so behavior matches and the omission is arguably cleaner — but the sentence reads as "the precedent has no clause", which is false | **Recorded only** — a factual imprecision in a comment; editing it would widen T-05. Consistent with how T-04's equivalent in-file note (L2-3) was handled |
| **B-4** | readability (minor) | The `down()` spec pins the two FK drops in a relative order that is arbitrary in MySQL. Fails safe | Recorded only |

**Budget after T-05:** 4 of 13 tasks · ~574 LOC of ~2,600 · 1 of 4–5 review rounds consumed (T-04 and T-05 both passed first attempt). Within tripwire.

---

### T-06 — M3: six additive count columns on the two shared tables · **PASS (first attempt)**

- **Date:** 2026-08-18
- **Status:** `[x]`
- **Implementer attempts:** 1
- **Review mode:** 2 parallel lenses (effort `xhigh`), **both given the full evidence set** — correcting the T-05 briefing asymmetry recorded in that task's process notes
- **Requirements covered:** R-IU-003 (AC.1, AC.2), R-IU-004 (AC.1, AC.2), R-IU-009 (AC.2) — and R-IU-009 **AC.1** for M3, see the FP-2 retirement below

**Files changed (2, both new, 362 insertions, nothing else touched):**

| File | Note |
| --- | --- |
| `src/db/migrations/1787070034303-addInnovationUseCountsToSharedTables.ts` | M3. Six `ALTER TABLE … ADD \`col\` int NULL`; `down()` = six `DROP COLUMN` in exact reverse order |
| `src/db/migration-specs/1787070034303-addInnovationUseCountsToSharedTables.spec.ts` | DDL spec, 21 tests, TDD red(15/21)→green(21/21). `migration-specs/` placement per child guide §9 |

**The six columns** — `result_actors`: `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`, `actors_count`. `result_institution_types`: `organization_count`. All `int` (DD-6), all nullable, no default.

**Verification:**

```
npm run migration:empty --name=addInnovationUseCountsToSharedTables -> 1787070034303
npx jest <spec>  (RED, empty stub)    -> 15 failed / 21
npx jest <spec>  (GREEN)              -> 21 passed / 21
npm test -- --silent                  -> 324 suites, 2092 tests passed (was 323/2071)
                                         every Innovation Dev spec passed UNMODIFIED
compose:test:down && compose:test:up  -> fresh container (FP-1)
migration:test:bootstrap              -> baseline + all migrations incl. M1, M2
<seed rows in BOTH affected tables>   -> see the fixture table below
migration:test:execute                -> M3 applied
migration:test:revert                 -> M3 ONLY reverted (6 DROP COLUMN)
migration:test:execute                -> M3 re-applied cleanly
npm run lint -- --quiet               -> reformatted the spec's line wrapping only; git status
                                         re-checked, still only the two new files; spec 21/21,
                                         suite re-run 324/2092
compose:test:down                     -> container + network removed (docker ps -a empty)
```

**Seed fixture — recorded verbatim because the container is disposable and the evidence must outlive it** (the practice adopted from T-05 advisory A-5). `baseline.sql` is schema-only, so `result_status`, `actor_roles` and `institution_type_roles` had no data rows despite the schema recording their migrations as applied; those had to be seeded to satisfy the FKs.

```sql
INSERT INTO `result_status` (`result_status_id`, `name`) VALUES (4, 'T-06 scratch status');
INSERT INTO `results` (`result_official_code`) VALUES (999001);        -- got result_id=33541
INSERT INTO `clarisa_actor_types` (`code`, `name`) VALUES (9999, 'T-06 scratch actor type');
INSERT INTO `actor_roles` (`actor_role_id`, `name`) VALUES (1, 'innovation-development');
INSERT INTO `institution_type_roles` (`institution_type_role_id`, `name`) VALUES (1, 'innovation-development');
INSERT INTO `result_actors`
  (`result_id`,`actor_type_id`,`actor_role_id`,`sex_age_disaggregation_not_apply`,
   `women_youth`,`women_not_youth`,`men_youth`,`men_not_youth`)
  VALUES (33541, 9999, 1, 0, 1, 0, 1, 0);
INSERT INTO `result_institution_types`
  (`result_id`,`institution_type_id`,`institution_type_role_id`) VALUES (33541, NULL, 1);
```

| Observation | Before M3 | After M3 | After revert |
| --- | --- | --- | --- |
| `result_actors` row count | 1 | 1 | 1 |
| booleans on result_id 33541 | `0,1,0,1,0` | **identical** | **identical** |
| the six new columns | absent | present, all `NULL`, `int DEFAULT NULL` | **gone** |
| every pre-existing column | present | present | **present, unchanged** |

`0` acceptance (R-IU-003 AC.1 / R-IU-004 AC.1) proved by explicit `UPDATE … = 0` on all six, not by inspection of the DDL.

**Reviewer verdicts — both PASS, independently:**

| Lens | Scope | Verdict |
| --- | --- | --- |
| **A** | Spec conformance · gate fidelity · requirement-mapping honesty | **PASS** — DDL matches §3.3/§3.4 column-for-column; the AC.4 trap judged in both directions; all 21 assertions independently transcribed and provably falsifiable; four Done criteria each earned |
| **B** | Migration safety · reversibility · precedent fidelity · Innovation Dev non-regression · forward-compat | **PASS** — append-only verified against the folder and `baseline.sql:8269` rather than the Implementer's claim; `up()` destructive-DDL-free; `down()` exact and exclusive; cited precedent genuinely establishes the pattern |

**Lens A reconstructed the RED count instead of accepting it.** It enumerated the suite independently (11 `up()` + 10 `down()` = 21), derived that every `for (const sql of calls)` loop passes vacuously against an empty stub, predicted exactly 15 fail / 6 pass — matching the reported run — and then **named the six**: the three `up()` and three `down()` absence assertions. All six are still meaningful against the real artifact, but their gating power is conditional on the two `expect(calls).toHaveLength(6)` cardinality assertions. That pairing is present, so the suite is not tautological.

**The AC.4 trap, judged in both directions (Lens A).** `actors_count` does **not** violate R-IU-003 AC.4: the AC is a *per-row* property ("parts present in the same row"), and in aggregate mode the four disaggregated columns are `NULL` — the row has no parts. This is the requirement's own scenario text, not a post-hoc reading. Equally, nothing was over-corrected away: all five design columns are present and no `*total*` / `*_sum` column was added.

**Innovation Dev non-regression — the mechanism, not just the green suite (Lens B).** `orm.config.ts:51` sets `synchronize: false`, the only occurrence in `src/`, hard-coded and not env-driven. `SP_versioning` copies both tables with **explicit column lists** (`routine-transcript.md` §2.1/§2.2), so there is no positional or column-count coupling to break. Views expand `*` at creation time. The six columns are therefore invisible to Innovation Dev at runtime.

**Both lenses converged on the seed's sufficiency, from different directions.** One row per table clears the task's Disqualifier (an empty table cannot detect a destructive migration), and the seed carries both `1` and `0` booleans so a flip or a backfill-from-boolean would have surfaced. Lens B added the precise limit: a *conditional* destructive statement predicated on a value absent from the seed is the one class a single row cannot catch — closed here not by the seed but by the spec's cardinality assertions, which leave no room for a seventh statement. **Seed + cardinality together discharge the clause; the seed alone would not.**

**FP-2 retirement for M3.** T-02's delegated "M1–M6 apply-and-revert" clause is discharged task by task against R-IU-009 **AC.1**. The apply → revert → re-apply run above is that discharge for **M3**. Recorded explicitly (Lens A advisory) so the delegated clause closes visibly per task rather than by inference. Remaining: M4, M5, M6.

---

## Forward pointers — added after T-06

| # | For | Pointer |
| --- | --- | --- |
| **FP-13** | **T-08** (and anyone running `migration:generate` before it lands) | **M3's six columns are entity-less until T-08, and TypeORM will propose DROPPING them.** Verified against the installed TypeORM **0.3.20**: `RdbmsSchemaBuilder.js:526` — *"Drops all columns that exist in the table, but does not exist in the metadata"* — invoked unconditionally at `:168`. For as long as these six columns exist in a database with no entity counterpart, `migration:generate` emits six `ALTER TABLE … DROP COLUMN`. **This is a NEW variant, not FP-10.** FP-10 is the FK-*name* churn; M1/M2 added whole *tables*, which the schema builder never auto-drops. M3 adds *columns to already-mapped tables*, which it does. If you must run `migration:generate` in this window, discard the six `DROP COLUMN` statements — and note the two traps now compose: a generated migration in this window can carry both the FK rename churn (FP-10) and these drops. Closed by T-08. |

FP-1 … FP-12 remain live. **FP-1, FP-2, FP-6 and FP-9 were all exercised in T-06 and all held.**

---

## Leader deviations & process notes — T-06

| Item | Note |
| --- | --- |
| **Skills** | `nestjs-expert` + **`tdd`** (task lists only the former) — third consecutive task where the DDL spec is authored red-first; red 15/21 → green 21/21 |
| **Effort** | `xhigh` — first migration in this chunk to touch **pre-existing shared tables** that Innovation Dev reads and writes today (FR-1) |
| **Review mode** | **2** parallel lenses, matching T-05's width. **Both lenses received the full evidence set** — the T-05 entry's ⚠️ briefing-asymmetry note was a standing correction and it was applied; neither lens had to defer a Done criterion for want of evidence this time |
| **Exemplar correction, by the Implementer** | The brief named `1779190000012-addIconKeyToScienceProgram.ts`. The Implementer declared a deviation to `1752542014680-addNewFieldsInnovationDev.ts` (nine one-column ALTERs, `down()` exact reverse) on the grounds that a single-column migration establishes no multi-column pattern. **Lens B verified the citation at `:18-44` / `:74-100` and confirmed it.** The declared judgment call was correct and the Leader's exemplar was the weaker one |
| **Citation discipline held** | The migration header makes **no** style-precedent claim, so it does not repeat T-05's B-3 defect (a header sentence that misdescribed its precedent). Both lenses checked every factual claim in the 40-line JSDoc against its cited source; all accurate |

---

## ADVISORY findings — T-06 (recorded, never gating; 0 rework attempts consumed; no task minted)

Adopted only where the item is mandatory record-accuracy or a forward pointer. Everything else is recorded and stops here — editing files or widening a task to absorb an advisory is forbidden.

| # | Lens | Finding | Disposition |
| --- | --- | --- | --- |
| **B-1** | risk / forward-compat | The `migration:generate` DROP-COLUMN window on entity-less columns | **Adopted as FP-13** |
| **A-1** | reliability | The six vacuously-passing absence assertions gate only in combination with the two `toHaveLength(6)` checks. If a refactor weakens those, six tests silently become decorative. A `expect(calls.length).toBeGreaterThan(0)` in each would make them independently non-vacuous | **Recorded only** — widening the spec to absorb an advisory is forbidden. **Surfaced to the user** |
| **A-2 / B-2** | reliability / readability (**both lenses, independently**) | The spec's `*_PRE_EXISTING_COLUMNS` lists are transcribed from `1749957832239` only, so they omit the six `AuditableEntity` columns **and** `actor_type_custom_name` (`1750220319664:16`), `sub_institution_type_id` and `institution_type_custom_name` (`:10,13`). The test titled *"…or any other pre-existing column on either table"* promises more than it checks — a `down()` dropping `is_active` would be caught by cardinality, but **not** by the guard whose stated job that is | **Recorded only.** The actual hole is closed by the cardinality assertions; the defect is a title over-promising. **Surfaced to the user** |
| **A-3** | reliability | The fake `QueryRunner` never parses SQL and the primary regexes are unanchored, so the unit spec would go green on syntactically invalid DDL. Fully covered by the real-MySQL scratch run — worth recording that Done criteria 1 and 2 rest on the **scratch run**, not on the DDL spec | Recorded only |
| **A-4** | risk | The falsifying input used n=1 row per table — literally what T-06 prescribes, and it clears the Disqualifier. A second row would additionally catch a row-reordering or partial-loss defect one row cannot distinguish from success | Recorded only |
| **B-3** | reliability | `down()`'s reverse ordering is **arbitrary** here — six independent, unconstrained columns drop in any order. Precedent aesthetics; fails safe. Explicitly no change wanted | Recorded only |
| **B-4** | risk (minor) | Five separate instant `ADD COLUMN`s consume five of MySQL 8.0's 64 per-table instant row versions where one batched ALTER would consume one. Immaterial at 5/64; exhaustion degrades to a table rebuild, not an error. Recorded because precedent-vs-batching was the declared judgment call | Recorded only |
| **B-5** | readability | No DB-level `COMMENT` on the six columns — spec-correct (RB-5 layer 1 puts the invariant on the entity, T-08), but a DBA reading `SHOW CREATE TABLE` sees six bare `int DEFAULT NULL` with no hint that two mutually exclusive modes exist. **Not free**: a column comment must be mirrored on the entity or it becomes its own `migration:generate` drift source | Recorded only |

**Lens B's verification boundary, stated by the lens itself:** read-only and running no commands, it could not independently confirm the scratch-schema BEFORE/AFTER observations, `SHOW CREATE TABLE`, the RED/GREEN counts, or the suite run — those are transient worker output with no persisted artifact. Its verdict rests on static evidence, which it judged independently sufficient for every Lens B question except the empirical apply/revert. **Recorded rather than papered over:** the empirical half of this task's evidence is Implementer-attested and Leader-accepted, not independently reproduced.

**Budget after T-06:** 5 of 13 tasks · ~936 LOC of ~2,600 · 1 of 4–5 review rounds consumed (T-04, T-05 and T-06 each passed first attempt). Within tripwire.
