# Execution Log — Bugfix / `SP_versioning` references the dropped column `roles_id`

- **Module:** results (lifecycle routines)
- **Spec id:** 2026-08-sp-versioning-roles-id
- **Linked requirements:** [`./requirements.md`](./requirements.md) · **Linked design:** [`./design.md`](./design.md) · **Linked tasks:** [`./tasks.md`](./tasks.md)

---

## Document Control

| Field | Value |
| --- | --- |
| Approval Mode | **gated** — every continue/pause gate stops for the user |
| Depth | Lite (Bug Mode) |
| Budget (design §2.4) | ~~3 tasks · ~2,050 LOC · 1–2 review rounds~~ → **4 tasks · ~2,050 LOC + baseline dump · 2–3 review rounds** (revised 2026-08-14 by the T-01 pivot) |
| Leader model tier | T1 (session model: Opus 5 — matches registry) |
| Log started | 2026-08-14 |

---

## Task Execution History

### T-01 — Scratch-schema harness: TEST datasource, port var, Jest config

| Field | Value |
| --- | --- |
| **Final status** | **`[~]` BLOCKED — Pivot Record filed** (see below) |
| Date | 2026-08-14 |
| Implementer attempts | 1 |
| Reviewer verdict | **Not spawned** — loop stopped under the Pivot Protocol before consuming a review round (the pivot may reshape T-01's scope) |
| Requirements covered | R-SPV-001 (precondition for its gate); RB-1 — **partially**; the gate remains unrunnable |
| Skills assigned | `nestjs-expert` (as recommended by the task; no deviation) |
| Effort assigned | `high` — above the T2 `medium` default, because a misconfigured datasource points a migration suite at the shared, non-disposable database (RB-2) |

#### Attempt 1 — files changed

| File | Change |
| --- | --- |
| `server/researchindicators/src/db/config/mysql/orm.test.config.ts` | **new** — `dataSourceTarget.TEST`-bound `DataSource` |
| `server/researchindicators/docker-compose.test.yml` | **new** — scratch MySQL 8.0, `utf8mb4` / `utf8mb4_unicode_520_ci`, host port `3307` |
| `server/researchindicators/test/jest-fixtures.json` | **new** — dedicated Jest config for the fixture directory |
| `server/researchindicators/test/fixtures/smoke.fixture-spec.ts` | **new** — smoke fixture |
| `server/researchindicators/package.json` | `test:fixtures`, `compose:test:up`/`:down`, `migration:test:execute`/`:revert` |
| `server/researchindicators/.env.example` | documented `ARI_TEST_MYSQL_*` placeholders + a "must be disposable" warning |
| `server/researchindicators/.env` | **gitignored, not in the diff** — `ARI_TEST_MYSQL_*` redirected to the local container (see finding F-01) |

`orm.config.ts` and `orm-connection-test.module.ts` confirmed **unmodified** (`git diff --stat` on both → empty). Done criterion #4 satisfied.

#### Attempt 1 — verification evidence

| Check | Result |
| --- | --- |
| Resolved options | `{"host":"127.0.0.1","port":3307,"database":"ari_scratch_test"}` |
| **Falsifying sentinel** | with `ARI_TEST_MYSQL_HOST="SENTINEL-not-real-host.invalid"` → `{"host":"SENTINEL-not-real-host.invalid","port":3307,...}` — proves `TEST`-bound, not `CORE`-bound. Done criterion #1 satisfied |
| Fixture, container **up** | `PASS ... ✓ connects to the TEST datasource and runs a trivial query` |
| Fixture, container **down** | `FAIL ... ✕ ... connect ECONNREFUSED 127.0.0.1:3307` — Done criterion #3 satisfied (both directions observed) |
| Migration **revert**, TEST-routed | `Migration UpdateInstitutionsAndActors1750220319664 has been reverted successfully` against `ari_scratch_test` |
| Migration **full apply** | ❌ **FAILS** — see the Pivot Record. Done criterion #2 **not satisfied** |
| Lint | `npm run lint -- --quiet` clean; `git status` re-checked afterwards (the script carries `--fix`), only intended files changed |

#### `Not Done / Assumptions` (carried verbatim from the Implementer report)

> - **`npm run migration:test:execute` (full suite apply) does not complete on a truly empty scratch schema — reproduced twice.** It fails deterministically at `1751474908040-InsertTemplates.ts` with `Table 'ari_scratch_test.sec_template' doesn't exist` (MySQL 1146). I grepped all 303 migration files: **no migration in the repo's history ever creates any `sec_*` table** (`sec_template`, `sec_user`, etc.) — they are baseline/legacy tables that predate this repo's adoption of TypeORM migrations and were evidently created once, directly, on the shared DB outside migration control. This is a pre-existing repo-level gap, not a defect in anything T-01 built — the harness itself (module, port var, scripts, container, Jest config) is proven correct by the sentinel and both fixture directions. But it means **Done criterion #2 ("Full migration suite applies AND reverts") cannot be satisfied as written** until someone supplies a baseline schema/dump for the `sec_*` tables (and possibly others) that migrations assume already exist. I did not attempt to synthesize that baseline myself — that's a scope decision for the Leader, and guessing at `sec_template`'s schema risks shipping a fabricated definition into a scratch harness other tasks (T-02) will build on.
> - Recommend escalating this specific finding before T-02 starts: T-02's regression fixture needs migrations up to `1783029013035` (`SP_versioning`), which is *after* the blocking `1751474908040` in timestamp order, so T-02 will hit the same wall unless a baseline dump is sourced.
> - I tore the scratch container down at the end (`npm run compose:test:down`) to leave a clean disposable state; bring it back up with `npm run compose:test:up`.
> - Judgment call: picked `3307` for the scratch container's host port (documented, not colliding with anything currently bound) and `ari_scratch_test` / `scratch_root_pw` as throwaway scratch credentials — these are placeholders, not secrets of consequence, living only in the gitignored local `.env` and the new compose file.

#### Leader verification of the blocking claim

The claim is load-bearing for the escalation, so the Leader verified it inline rather than accepting it:

```
grep -rliE "CREATE TABLE[^;]*sec_" src/db/migrations/   → 0 files
grep -rl  "sec_template"           src/db/migrations/   → 10 files
ls src/db/migrations/*.ts | wc -l                       → 303
```

**Confirmed.** Ten migrations write into `sec_template`; none of the 303 creates it. The repo's migration history is **not self-sufficient** — it presumes a baseline schema created outside migration control.

#### Finding F-01 — `ARI_TEST_MYSQL_*` pointed at a shared remote RDS (safety)

The local `.env` already defined `ARI_TEST_MYSQL_*`, and they resolved to `tstprmsdb.…rds.amazonaws.com` / `alliance_main_automation` — the **same remote RDS instance** aliased a few lines above as an alternate `ARI_MYSQL_*` (CORE) target. The TEST datasource target, as configured on this machine, was a shared non-disposable database wearing a "test" name. Applying a migration suite through it would have produced exactly the RB-1/RB-2 outcome the harness exists to prevent — under a variable name the literal prohibition text did not cover.

The Implementer redirected `ARI_TEST_MYSQL_*` to the local disposable container and left an explanatory comment in `.env`. Nothing was ever executed against the RDS host.

> **Leader note on brief accuracy:** the Implementer's brief asserted as a confirmed fact that `.env` had no `ARI_TEST_MYSQL_*` keys. That came from a truncated read (`head -40`) of the key list and was wrong. The Implementer checked rather than trusting it, which is why F-01 surfaced instead of being acted on.

---

## Pivot Record: T-01

**Trigger.** The approved `design.md` §4 enumerates the harness as **two pieces plus a Jest config** — a `TEST`-bound datasource module and `ARI_TEST_MYSQL_PORT`. All three were built and independently proven. The harness still cannot deliver what R-SPV-001's gate requires, because a fourth piece was never identified: **a baseline schema**. The repo's 303 migrations cannot be applied to an empty database at all.

**Why this is a pivot and not rework.** No Implementer error occurred and no rework attempt was consumed. The design's model of the harness is incomplete, and no number of Implementer attempts can close a gap whose input (a schema definition for legacy `sec_*` tables) does not exist anywhere in the repository. Synthesizing it by guesswork would seed every downstream fixture — including T-02's red-before-green gate — with a fabricated schema.

**Blast radius.**

| Affected | Consequence |
| --- | --- |
| **T-01** Done criterion #2 | Unsatisfiable as written. Criteria #1, #3, #4 are satisfied |
| **T-02** (the actual bugfix) | **Fully blocked.** Its mandatory red-before-green fixture needs migrations through `1783029013035`, which sorts *after* the blocking `1751474908040`. The fixture cannot reach `SP_versioning` |
| **requirements.md §4.2** | Its disqualifier ("if the disposable MySQL cannot be provisioned, report inconclusive") does not quite fit: MySQL *was* provisioned. The schema is what cannot be built |
| **RB-1** | Understated. It named the missing datasource plumbing; the deeper gap is that migrations presume a pre-existing baseline |
| `innovation-use/data-model-and-catalog` | Its T-01/T-02 (still `todo`) share this harness and will hit the identical wall |
| **KZ-004** | Second confirmed instance — Bug Mode entered without the verification prerequisites installed. Recurrence should be incremented at archive |

**Alternatives for the user (no option taken without approval).**

| # | Option | Cost | Risk |
| --- | --- | --- | --- |
| A | **Source a baseline dump** (schema-only) of the shared dev DB and load it into the scratch container before migrations. Adds a task and a documented `db/baseline/` artifact | Needs DevOps to produce a sanitized schema-only dump | Low, and it fixes the gap permanently for every future spec |
| B | **Narrow the fixture:** skip the full suite; create only the tables `SP_versioning` touches, then apply the two relevant procedure migrations | Moderate; hand-built table subset | Medium — the fixture proves the procedure runs against a *hand-made* schema, not the real one |
| C | **Waive the red-before-green gate**, ship the migration on body-diff review alone | Cheap | **High** — requirements §4.2 calls this out explicitly: a clean apply proves the SQL parses, which is exactly what already succeeds on the broken body. This is what KZ-004 warns against |
| D | **Pause the spec** until the baseline question is resolved repo-wide | Zero now | Leaves `SP_versioning` broken for all six indicators |

**Leader recommendation: A.** It is the only option that makes the mandatory gate real, it is reusable by `innovation-use` and every later spec, and it converts a recurring methodology failure (KZ-004) into fixed infrastructure. B is the fallback if DevOps cannot produce a dump quickly; C should be refused on the spec's own stated reasoning.

**Spec amendments required once the user rules** (not yet applied — the Pivot Protocol requires approval first): `design.md` §4 gains the baseline-schema piece; `requirements.md` RB-1 and §4.2 are restated; `tasks.md` gains the baseline task and T-01's Done criterion #2 is rewritten. A two-direction correction sweep follows.

**Status:** ~~awaiting user decision~~ → **RESOLVED 2026-08-14.** The user ruled for **option A — source a schema-only baseline dump.** T-01 stays `[~]` until its blocked criterion is closed by the new task. **No rollback performed** — the harness code is correct and retained under the chosen option.

### Amendments applied (Pivot Protocol step 3)

| Document | Change |
| --- | --- |
| `design.md` | §4 restated: **four** harness pieces, not two + a Jest config. New §4.1 defining the baseline artifact. New **DD-5** with its three rejected alternatives. Document Control: budget revised, Pivot row added |
| `requirements.md` | **RB-1b** added (migration history not self-sufficient) and **RB-1c** added (a `TEST`-named var is not evidence of a disposable target). RB-1 marked resolved-and-verified. §4.2 amended — provisioning a container is not the same as building a schema |
| `tasks.md` | **T-01b** added with its own falsifying input and disqualifier. Dependency graph, budget tripwire, coverage table, PR strategy, and done definition all updated. T-01's Done criteria marked per-item (#1/#3/#4 satisfied, #2 blocked) |

### Correction closure — two-direction sweep

**Forward** (the superseded values, across the whole spec folder): `3 tasks`, `1–2 review rounds`, `Two pieces`, `T-01 … T-03`, `T-01, T-02, T-03`, the PR table. All located and updated. `execution.md`'s own budget row updated to show the revision rather than the stale figure.

**Backward** (documents that cited the corrected sections and may now assert a falsehood): `innovation-use/data-model-and-catalog` shares this harness and **three of its statements are now false** —

| Site | Now false because |
| --- | --- |
| `tasks.md:111` | Done criterion "Full migration suite applies and reverts cleanly on the scratch schema" — unachievable without the baseline |
| `tasks.md:97` | "Run the **full** migration suite against the scratch schema" — same false premise |
| `tasks.md:486` | RB-B claims its T-01 + T-02 close the scratch-schema gap. They do not |

Its T-01/T-02 are **superseded** by this spec's T-01 + T-01b. Not edited now — cross-spec updates are already **T-03's** assigned scope, and the finding has been **written into T-03's task body** rather than left as a note here, because a forward pointer filed only in the log is one nobody carries into the brief.

### Kaizen

**KZ-004 second instance** — Bug Mode entered without the verification prerequisites installed. Its recurrence count should be incremented at archive. The lesson held exactly as written: the prerequisite gap surfaced *before* the fix landed only because T-01 was sequenced first.

**Candidate new lesson** — *A verification harness can be proven correct and still be unable to run.* T-01's mechanism passed every check designed for it (sentinel, both fixture directions, TEST-routed revert) while remaining useless, because the design enumerated the plumbing and never asked whether the schema it plumbs into could exist. Harness tasks should carry an end-to-end "the gate actually executes" criterion, not only per-piece proofs.

---

### T-01b — Baseline schema artifact for the scratch container

| Field | Value |
| --- | --- |
| **Final status** | **`[~]` BLOCKED — INCONCLUSIVE on the primary deliverable** (environmental, not a work FAIL) |
| Date | 2026-08-14 |
| Implementer attempts | 1 |
| Reviewer verdict | **Not spawned** — the artifact under review does not exist yet; the loader will be audited together with the dump when T-01b closes |
| Requirements covered | RB-1b — **not** closed. RB-1c — closed, and enforced in code |
| Skills assigned | `nestjs-expert` (no deviation) |
| Effort assigned | `xhigh` — deriving the baseline table set is ambiguity-heavy, and the artifact seeds every downstream fixture |
| Authorization | User granted narrow read-only access to the shared DB for this task (2026-08-14). **Never exercised** — no connection was ever established |

#### Blocker — no network route to the shared database

`ARI_MYSQL_HOST` is a private, VPN-only address. The Implementer confirmed TCP timeout with the sandbox explicitly disabled, ruling out a sandbox artifact. **Leader re-verified independently:**

```
nc -z -w4 <ARI_MYSQL_HOST> 3306   → UNREACHABLE
nc -z -w4 8.8.8.8 443             → succeeded  (general internet is fine)
```

FortiClient VPN is installed but not connected. Establishing the tunnel needs the user's credentials and 2FA — not an agent action. **This is an environment blocker, not a defect and not a rework FAIL; no attempt was consumed against the 3-attempt ceiling.**

#### Delivered and verified anyway

| File | Change |
| --- | --- |
| `server/researchindicators/scripts/load-baseline.js` | **new** — loads the baseline into the scratch container. Written in Node rather than shell because several `.env` values contain unquoted shell metacharacters that broke a `source .env` approach (failure observed, then rewritten with `dotenv`) |
| `server/researchindicators/src/db/baseline/README.md` | **new** — derivation methodology, the blocker, the candidate table set, and the exact read-only commands for whoever finishes it |
| `server/researchindicators/package.json` | `baseline:test:load`, `migration:test:bootstrap` (chains load → execute so the order cannot be skipped) |
| `src/db/baseline/baseline.sql` | ❌ **absent** — the core deliverable |

**RB-1c is now enforced in code, not just documented.** `load-baseline.js` refuses to run when `ARI_TEST_MYSQL_HOST` resolves to the same host as `ARI_MYSQL_HOST` — the exact hazard finding F-01 uncovered. Proven by simulation (the real `.env` was left untouched):

```
ERROR: ARI_TEST_MYSQL_HOST (shared-host.example) is the same host as ARI_MYSQL_HOST. ... refusing to load onto it.
```

#### Derivation of the baseline table set — partial

| Step | Result |
| --- | --- |
| 1. Tables present in the shared dev DB | **BLOCKED** (no network) |
| 2. Tables created by any of the 303 migrations | **132**, parsed from `CREATE TABLE [IF NOT EXISTS]`. Confirmed **0** uses of `queryRunner.createTable()` anywhere, so raw SQL is the only creation path |
| 3. Candidate baseline set | **3** — `sec_template`, `sec_roles`, `sec_users`. Derived from migration source alone, filtering ~60 raw regex hits down to real table references (the rest were `DECLARE`d procedure-local variables, HTML prose, and migration class names) |

⚠️ **Step 3 is unverified against the live database**, and the Implementer flagged it as such rather than asserting completeness. The task's method requires (1) minus (2); only (2) was computable. The set is plausible but must be confirmed against `SHOW TABLES` once a route exists — an incomplete set fails late, at a different 1146.

#### Verification evidence

| Check | Result |
| --- | --- |
| **Falsifying input** (mandatory), two independently fresh containers | `errno: 1146, sqlMessage: "Table 'ari_scratch_test.sec_template' doesn't exist"` at `InsertTemplates1751474908040`. Identical both runs — reproduces T-01's finding exactly |
| Load-order guard | `npm run migration:test:bootstrap` → `ERROR: .../baseline.sql not found.` and **never reached** `migration:test:execute` |
| RB-1c guard | fires as shown above |
| Full suite on top of the baseline | ❌ **not reached** — no baseline to load |
| Zero-`INSERT` check | moot — no dump exists |
| Unit suite | `Test Suites: 321 passed, 321 total / Tests: 2042 passed, 2042 total` |
| Lint | `npm run lint -- --quiet` clean; `git status` re-checked afterwards |
| Writes against the shared DB | **none** — no connection was ever established |

#### `Not Done / Assumptions` (carried verbatim from the Implementer report)

> - **`src/db/baseline/baseline.sql` was not produced.** This is the task's core deliverable and it is genuinely missing — not narrowed, not substituted. Root cause: no network route from this execution environment to `ARI_MYSQL_HOST`, requiring a VPN session only the human can establish. Recommend either (a) a human with VPN access runs the 5 documented commands in the README and commits `baseline.sql`, or (b) a future session is run from an environment with that network path.
> - The 3-table candidate set (`sec_template`, `sec_roles`, `sec_users`) is derived from migration source only, not cross-checked against the live `SHOW TABLES` output as the task's step 1 specifies. I believe it is very likely complete for this purpose, but I'm flagging it as unverified rather than asserting it.
> - Done criteria satisfied: falsifying input observed (✓, reproduced twice); load step ordered ahead of migration script and documented (✓); no write against the shared DB (✓, because no connection was ever achieved, let alone a write).
> - Done criteria **not** satisfied: baseline artifact committed (✗ — file absent); full suite applies+reverts on the baseline (✗ — unreachable without the baseline).
> - Per my own contract's disqualifier clause: reporting this as **INCONCLUSIVE** on the primary deliverable, not as done and not as a clean fail — the check that matters (full suite applying on the baseline) could not be run at all.

#### Leader adjudication

Correct call. The task's own disqualifier says a dump that loads is not a dump that is sufficient, and the evidence that counts — the full suite applying on top of the baseline — was unreachable. Reporting INCONCLUSIVE rather than manufacturing a pass is the behaviour the spec asked for, and hand-writing the missing tables would have violated DD-5 outright.

**Unblocking action is a single human step:** connect the corporate VPN, then the dump can be produced from this session in minutes using the commands the README already records.

#### Resumed run — VPN connected, same Implementer (2026-08-14)

User connected the corporate VPN. Leader verified the route before resuming: `nc -z -w6 <ARI_MYSQL_HOST> 3306` → `Connection to 192.168.20.210 port 3306 succeeded`. The Implementer was resumed rather than respawned, so the 132-table derivation and the loader carried over.

**Derivation gap closed — and the source-only candidate set was 95% wrong.**

| Step | Result |
| --- | --- |
| 1. Live objects in `alliancereportingdb` | **213** — 196 `BASE TABLE` + 17 `VIEW` |
| 2. Created by the 303 migrations | **132** |
| 3. Baseline = base tables − created − `migrations` | **64** |

The earlier candidate set caught **3 of 64**. Missed: 13 further `sec_*` tables, all 33 `TIP_*`, all 8 `AICCRA_*`, and 7 others with no migration reference at all.

> **Lesson (recorded in the artifact README).** Grepping migration source finds only tables migrations *talk about*. It structurally cannot find tables migrations never mention — which was the large majority here, because `TIP_*` / `AICCRA_*` / most `sec_*` are reached exclusively through application services, never through raw SQL in a migration. There is no cheap substitute for the literal algorithm: enumerate the live schema, subtract what migrations create. Also caught in flight: a `comm` diff silently produced a wrong 84/209 result from a locale-dependent sort, fixed with `LC_ALL=C sort`.

**Artifact produced and Leader-verified:** `src/db/baseline/baseline.sql`, 55,146 bytes, **64 `CREATE TABLE`**, **0 `INSERT`** (`grep -c` confirmed by the Leader independently). No views, no triggers, no routines. Only the authorized read-only statements touched the shared DB.

**RB-1b's reported defect is FIXED** — `Migration InsertTemplates1751474908040 has been executed successfully`, and 138 migrations now apply past the point that used to fail.

---

## Pivot Record: T-01b — the migration history is not replayable from empty

**Trigger.** With the baseline loaded, the suite advances to migration **#139 of 303** and dies on a *second, independent* defect:

```
Migration "CreateStaffGroups1759786024597" failed, error: Cannot add or update a child row:
a foreign key constraint fails (`alliance_user_staff_groups`,
CONSTRAINT ... FOREIGN KEY (`carnet`) REFERENCES `alliance_user_staff` (`carnet`))
errno: 1452 (ER_NO_REFERENCED_ROW_2)
```

Leader-verified by reading the migration: its `up()` hardcodes five `carnet` values (`15570`, `14440`, `14331`, `14871`, `15030`) into `alliance_user_staff_groups`. `alliance_user_staff` **is** created by a migration (`1731616750326`) and is correctly excluded from the baseline — but it is **populated at runtime by a staff-sync process**, never by a migration. The rows exist on the shared DB and on no fresh schema.

**Why this is a pivot and not another task.** The first blocker looked like a one-off missing-schema gap. Two blockers of the same family, found in the first 139 migrations, is a pattern: **this migration history assumes a pre-existing environment — both its schema and some of its data — and cannot be replayed from empty.** A schema-only baseline cannot fix a *data* dependency without breaking the no-data guarantee that is the artifact's whole point. And **164 migrations remain unexercised**, so the prior of finding a third dependency is high.

The Implementer correctly refused to fabricate personnel rows or edit a merged migration, and reported INCONCLUSIVE rather than papering over it.

**What this does and does not invalidate.** T-01's plumbing and T-01b's baseline are both correct and are retained under every option below. What is invalidated is the *replay* premise inherited from `design.md` §4 and T-01's Done criterion #2 — "the full migration suite applies on the scratch schema" was never an achievable criterion, and no amount of patching individual migrations makes it one within this bugfix's budget.

**Options.**

| # | Option | Assessment |
| --- | --- | --- |
| A | **Snapshot harness.** Dump dev schema-only **with `--routines`**, plus the `migrations` table **with its rows**, so the scratch DB equals dev's structure with all 303 recorded as applied. Only genuinely new migrations then run | Higher fidelity *and* less machinery than replay. Gives T-02 exactly what it needs: `SP_versioning` present in its broken form, so `CALL` → 1054 is a true red, and the repair migration is the only pending one. This is how real staging environments are built |
| B | **Seed fixture for the FK.** Insert minimal synthetic `alliance_user_staff` rows before migration #139, keep replaying | Unblocks #139 only. 164 migrations unexercised; each further data dependency is another round of this same loop, none of it budgeted |
| C | **`FOREIGN_KEY_CHECKS=0` during replay** | Rejected on reasoning: disabling referential integrity in a harness whose entire purpose is fidelity to the real schema |
| D | **Escalate replayability as a repo-level problem and pause this spec** | The finding is real and deserves its own ticket, but it leaves `SP_versioning` broken for all six indicators meanwhile |

**Leader recommendation: A, plus D as a separate ticket.** A unblocks T-02 on better evidence than replay would have given. The non-replayable history is a genuine repo-level defect worth recording in the TRD, but it is not this bugfix's to fix.

**Status:** ~~awaiting user decision~~ → **RESOLVED 2026-08-14. User ruled for option A — the snapshot harness.** Spec amended (design §4.1 rewritten, DD-5 revised, RB-1d and OQ-3 added, T-01b rescoped, T-01's criterion #2 retired as never-achievable). Nothing rolled back.

---

### T-01 + T-01b — final outcome: **PASS**

| Field | Value |
| --- | --- |
| **Final status** | **PASS** — both tasks `[x]` |
| Date | 2026-08-14 |
| Implementer attempts | 1 for T-01; 3 rounds for T-01b (initial → VPN-resumed → snapshot pivot). **Zero rework attempts consumed** — no Reviewer FAIL ever occurred; every interruption was an environment blocker or a user-approved pivot |
| Reviewer | Spawned once, on both tasks together (one uncommitted change set forming one mechanism; T-01b twice reshaped what T-01 built, so auditing them apart would leave the seams uncovered). Different model from the Implementer |
| Reviewer verdict | **`STATUS: PASS`** + 7 `ADVISORY` findings |

#### Snapshot artifact — final composition (Leader-verified independently)

196 `CREATE TABLE` · 17 views · 23 routines · **1** `INSERT`, targeting `migrations` · **0** `DEFINER=` remaining · **2** occurrences of `roles_id` · 423,531 bytes.

Two load-time defects were found and fixed while producing it, both scoped to the disposable container and never near `ARI_MYSQL_*`:

| Error | Cause | Fix |
| --- | --- | --- |
| MySQL **1418** | `mysql:8.0` ships `log_bin` ON / `log_bin_trust_function_creators` OFF, rejecting non-deterministic routine bodies | `--log-bin-trust-function-creators=1` on the scratch service only, with an inline comment forbidding it near `ARI_MYSQL_*` |
| MySQL **1449** | `DEFINER='AllianceRepUser'@'%'` does not exist on the scratch container | Stripped all 40 `DEFINER=` clauses by one literal substitution; counts verified unchanged before/after |

#### Reviewer's independent confirmation of the load-bearing claim

The one thing that could have failed silently is whether the snapshot actually hands T-02 a real red. The Reviewer verified it **structurally**, not by count:

`SP_versioning`'s body spans `baseline.sql:6935`–`:7917` — **982 lines, matching the spec's 981-line body**. Both `roles_id` occurrences fall inside it, in exactly the two blocks requirements §2.3 names:

- `:7044` `INSERT INTO result_impact_outcomes(` … `:7051 id,` … `:7054 roles_id,` … 11 columns against 10 `SELECT` expressions (`:7057`–`:7066`), `:7063 rio.id` copying the source PK
- `:7071` `INSERT INTO result_strategic_objectives(` … `:7078 id,` … `:7081 roles_id,` — same shape with `rso`

**All three defects from requirements §2.3 are present and intact.** Fidelity exceeds what the criterion required: `:6934` preserves dev's per-routine `sql_mode`, `:6930-6932` preserve `utf8mb4` / `utf8mb4_unicode_520_ci`, so error behaviour on the scratch container matches dev.

The Reviewer also checked a clause that *looked* like a violation and cleared it: the `FOREIGN_KEY_CHECKS=0` at `:14` / `:8259` is mysqldump's standard session preamble, restored at `:8231-8232` / `:8275-8276` — not the practice design §4.1 rejects, which was disabling FK checks to bypass the `CreateStaffGroups` 1452 blocker during replay. That was never done; replay was abandoned.

#### ADVISORY findings (recorded; these never gate and never become tasks in this spec)

| # | Lens | Finding |
| --- | --- | --- |
| A-1 | **risk** | **The same-host guard is on the one script that cannot cause the harm, and absent from the ones that can.** `migration:test:execute` / `:revert` connect over TCP via `orm.test.config.ts` and run DDL with **no guard**, and `migration:test:bootstrap` chains guarded-load `&&` unguarded-execute. Under F-01's exact former configuration the load would be harmless while the migration run reached the shared RDS. `load-baseline.js` itself is structurally safe — `:93-105` uses `docker exec` against a hard-coded container name with **no `-h` flag**, so it can only ever load into the local container. Suggested: a shared `scripts/assert-disposable-target.js` preflight the `migration:test:*` scripts also run, hardened past string equality (lowercase, strip trailing dot, compare `dns.lookup()` results) |
| A-2 ✅ | **risk — FIXED** | `docker-compose.test.yml:26` published `'3307:3306'`, binding **0.0.0.0** — exposing a MySQL whose root password is committed in plaintext at `:13` to every interface of the developer's machine, including a corporate VPN segment. Suggested `'127.0.0.1:3307:3306'`; zero cost, the harness only ever connects from localhost |
| A-3 | readability | `load-baseline.js:88-90` logs `host ${ARI_TEST_MYSQL_HOST}` while the load actually goes to the container's local socket — the message implies that variable controls the destination when it does not |
| A-4 | readability | README describes the two mysqldump passes in prose with all flags named but gives no copy-pasteable command block, and says to re-derive counts on regeneration without saying **when** regeneration is needed. The snapshot self-heals for new migrations; it goes stale only for schema changed directly on dev outside migration control — the exact class that produced the `sec_*` gap |
| A-5 | reliability | `orm.test.config.ts:28` `parseInt(env.ARI_TEST_MYSQL_PORT, 10)` yields `NaN` when unset, producing an obscure driver failure instead of a named one |
| A-6 | reliability | `scripts/load-baseline.js` is a `.js` under `scripts/`, outside the lint glob `{src,apps,libs,test}/**/*.ts` — "lint clean" carries no information about this file |
| A-7 | bookkeeping | The audit trail understated what had landed (Pivot Record still read "awaiting user decision", T-01b still `[~]`). **Fixed by this entry** — the Reviewer was right to flag it before T-02 briefs off it |

**A-1 and A-2 are security-relevant and were escalated to the user rather than filed and forgotten.** Per the methodology an advisory may not become a task in this spec, and none was minted; the decision on whether they earn work is the user's.

**User ruling, 2026-08-14:** fix A-2, record A-1.

- **A-2 fixed** — `'3307:3306'` → `'127.0.0.1:3307:3306'`, with an inline comment naming the exposure. Applied **inline by the Leader**, a documented deviation from the no-Leader-code rule: it is a one-line port binding whose exact remediation was specified verbatim by the auditor (so it arrives pre-reviewed), it closes an exposure that was live while the corporate VPN was connected, and spawning an Implementer for a single prefix is what the Delegation Ceiling exists to prevent. Recorded here rather than left implicit.
- **A-1 recorded, not actioned.** No task was minted and T-02/T-03 were not widened. The guard gap is real but conditional on a misconfigured `.env`, and the current `.env` correctly resolves to `127.0.0.1:3307`. If it is to be closed, that is a new proposal — the route an advisory takes out of a spec, never around its approval gate.

#### Verification evidence — final state

| Check | Result |
| --- | --- |
| Snapshot loads, zero pending migrations | `No migrations are pending`; `information_schema.TABLES` → 213; `migrations` rows → 348 |
| `SP_versioning` present and broken | `SHOW CREATE PROCEDURE` → `roles_id` at body lines 122 and 149 |
| Falsifying input | fresh container, snapshot skipped → `errno: 1146 ... 'ari_scratch_test.sec_template' doesn't exist` |
| No business data | `grep -c '^INSERT'` → **1**, target `migrations` |
| Unit suite | 321/321 suites, 2042/2042 tests |
| Lint | clean; `git status` re-checked |
| Coverage floor | untouched — main Jest `rootDir: "src"` + `testRegex: ".*\.spec\.ts$"` cannot pick up `smoke.fixture-spec.ts` (wrong root **and** `-spec` vs `.spec`) |
| Shared DB | only `SHOW TABLES`, `information_schema` SELECTs, and `mysqldump` read passes. **No write of any kind** |

#### Requirements outcome

| Item | Status |
| --- | --- |
| RB-1 | Closed — TEST datasource reachable, proven by sentinel |
| RB-1b | Closed — the `sec_template` 1146 defect no longer occurs |
| RB-1c | Closed as written, with A-1 recording where the guard does **not** reach |
| RB-1d | Recorded, out of scope, tracked as OQ-3 |
| R-SPV-001 | Gate precondition satisfied. The ACs themselves remain T-02's |

---

### T-02 — The migration and its regression fixture (red → green): **PASS**

- **Date:** 2026-08-14
- **Implementer attempts:** 1 (no rework)
- **Review mode:** **parallel lens** (4R) — the task touches a migration, which the mode table routes to 2–4 lens-scoped Reviewers. Three ran concurrently: **spec conformance** (the gate), **risk**, **reliability**. All three returned `STATUS: PASS`
- **Requirements covered:** R-SPV-001 AC.1–AC.5; DC-A, DC-B, DC-C, DC-D

#### Files changed

| File | What |
| --- | --- |
| `src/db/migrations/1784300000000-RepairSpVersioningObjectiveBlocks.ts` | New migration, 1,991 lines. `up()` = the `1783029013035` body with `roles_id` and `id` dropped from the `result_impact_outcomes` and `result_strategic_objectives` column **and** `SELECT` lists (9/9 each). `down()` = that body verbatim, defects included (DD-3) |
| `test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts` | New regression fixture, 214 lines. Seeds its own FK chain, calls the **real** `SP_versioning` over the TEST datasource, asserts AC.1–AC.3 on both tables, cleans up in `afterAll` |

`git status --short` shows only these two untracked files. No harness file, no merged migration, and no table DDL was touched.

#### Verification evidence

| Gate | Evidence |
| --- | --- |
| **RED, before the migration existed** | `QueryFailedError: Unknown column 'roles_id' in 'field list'` (MySQL 1054), with `SHOW CREATE PROCEDURE` showing `roles_id` count = 2 beforehand. The migration file was held outside `src/db/migrations/` so the red could not be contaminated |
| **GREEN, after `migration:test:execute`** | `PASS test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts ✓ copies result_impact_outcomes and result_strategic_objectives into the new snapshot with role_id preserved and a fresh id (11 ms)`; `roles_id` count = 0 |
| **RE-RED, via `migration:test:revert`** | Same 1054; `roles_id` count back to 2. Then re-executed → GREEN again. **Stronger than the criterion asked for** — tasks.md suggested reinstating `roles_id` in one block by hand; running the real `down()` exercises AC.5 live instead of by inspection |
| **AC.4 — body diff** (Leader-extracted mechanically from both files, not taken from the Implementer report) | `up()` vs the prior body: **four hunks, all removals**, confined to the two named blocks — `id,` and `roles_id,` out of each column list, `rio.id,` / `rso.id,` out of each `SELECT`. No additions anywhere, no other hunk |
| **AC.5 — `down()` fidelity** | `cmp` → **byte-identical** to the prior body. `roles_id` counts: prior 2, `up()` 0, `down()` 2 |
| Lint | `npm run lint -- --quiet` clean. It reformatted the fixture (Prettier wrapping) only; `git status` re-checked afterwards, nothing else mutated |

All runs executed against the disposable scratch container (`127.0.0.1:3307`, `ari_scratch_test`). **No statement of any kind was issued against `ARI_MYSQL_*`.**

#### `Not Done / Assumptions` (carried verbatim from the Implementer report)

- The baseline schema has zero rows in **every** lookup table involved (`reporting_platforms`, `report_years`, `portfolios`, `impact_outcomes`, `strategic_objectives`, both role tables) — not merely "no business data" as the task prose implied. The fixture therefore seeds the full FK chain itself, idempotently for shared lookups (insert-if-absent, delete-only-if-this-run-inserted).
- `results.result_status_id` has a non-NULL DEFAULT (`'4'`) plus an FK to the empty `result_status` table; the fixture sets it to `NULL` to avoid an incidental FK failure unrelated to the bug under test.
- Scratch schema left in the migrated (GREEN) state as the handoff for T-03.
- Full suite, `test:cov`, and harness files deliberately untouched — T-03's scope.

**Leader adjudication:** none of these is unfinished T-02 scope. The reliability Reviewer independently cleared the `result_status_id = NULL` item with control-flow evidence: `SP_versioning` branches only on `is_active`, `is_snapshot`, `result_official_code`, `platform_code`, and `report_year_id`; no branch reads `result_status_id`, so NULLing it cannot steer the routine down an unrepresentative path. The column's copy is exercised trivially (NULL→NULL) and is covered by the AC.4 body diff.

#### What the Reviewers verified independently (not accepted on report)

- **Spec-conformance lens** re-derived the line arithmetic: prior body `1783029013035:8–988` (981 lines) vs new `up():30–1004` (975 lines) — exactly the 6 removed lines, with the offset confirmed at three anchors (`+22` before the blocks, `+16` after, and the terminal `END`). It read the fixture's assertions rather than its test name.
- **Reliability lens** closed a tautology trap the assertions could have hidden: `id` and `role_id` are both `bigint`, so a driver returning strings would make `not.toBe(<number>)` pass vacuously. The `role_id` `toBe(<number>)` assertion passing **on the same row** is the type-witness that both arrive as JS numbers. It also established that all three §2.3 defect classes discriminate **independently** — 1054 and 1136 raise at statement *prepare* (so a partial repair still goes red on the column-count mismatch), and seeding exactly one source row per table makes defect 3 collide on 1062.
- **Risk lens** confirmed zero table DDL (four `queryRunner.query` calls, all `DROP`/`CREATE PROCEDURE`), and cleared the timestamp: `1784300000000` sorts after the newest existing migration and *behind* the real clock, so anything `migration:generate` produces from now on — including Innovation Use M6 — still sorts after it, preserving design §6's ordering requirement. Hand-rounded stamps have 12 prior precedents in this folder.

#### Requirements outcome

| Item | Status |
| --- | --- |
| AC.1 | Closed — `CALL` completes; a 1054 would reject the awaited call |
| AC.2 | Closed — `role_id` compared to the **seeded** FK on both tables, on rows selected by the new `result_id` |
| AC.3 | Closed — `id` asserted unequal to the source PK on both tables |
| AC.4 | Closed — four removal hunks, two blocks, nothing else |
| AC.5 | Closed — `down()` byte-identical, and re-proven live by the revert→RED→execute→GREEN cycle |
| DC-A / DC-B / DC-C / DC-D | Closed by the red-before-green cycle, the body diff, the `cmp`, and the fixture's dual assertions respectively |

---

## ADVISORY findings — T-02 (recorded; these never gate and never become tasks in this spec)

| # | Lens | Finding |
| --- | --- | --- |
| **B-1** ⚠️ | **risk — HIGH, escalated** | **The repair activates a latent FK failure in the re-versioning path.** See the dedicated section below |
| B-2 | risk / reliability (**flagged independently by two lenses**) | The fixture is an **unguarded write path**. `scripts/load-baseline.js:64` refuses to run when `ARI_TEST_MYSQL_HOST` resolves to `ARI_MYSQL_HOST` (RB-1c); the fixture carries no such check yet `INSERT`s, `DELETE`s, and `CALL`s. On a machine misconfigured exactly the way finding F-01 documents, it would write to the shared dev DB. Cheapest fix is porting the guard into `orm.test.config.ts`, which covers every fixture path at once |
| B-3 | reliability | `test/jest-fixtures.json` sets no `maxWorkers`, so fixtures run in parallel workers against one scratch schema. This fixture seeds **shared** lookups (`reporting_platforms.STAR`, `report_years.2094`) with a racy insert-if-absent / delete-if-I-inserted protocol. Harmless today (the smoke fixture seeds nothing) but `innovation-use/data-model-and-catalog` is queued to add fixtures on this same schema — `"maxWorkers": 1` before the second seeding fixture lands |
| B-4 | reliability | A partial `beforeAll` failure leaves `undefined` ids bound into `afterAll`'s deletes, masking the original seeding error (and, per the risk lens, potentially skipping `destroy()` and hanging Jest on an open handle). Guard each delete on its id; move `destroy()` into a `finally` |
| B-5 | reliability | `beforeAll` has no timeout override — `initialize()` plus nine sequential inserts under Jest's default 5s. Against a cold container that is a plausible flake whose failure mode reads like the bug. The `it` already carries 30000 |
| B-6 | reliability | Two cheap assertions would widen coverage: seed a second row per table with `is_active = 0` (the blocks' `WHERE is_active = TRUE` is asserted by nobody today, though AC.2 says "**active** rows"), and assert the copied row count is exactly 1 rather than destructuring `[0]` |
| B-7 | risk (medium) | The scratch container under-predicts dev on `DEFINER`: dev's routines carry ``DEFINER=`AllianceRepUser`@`%` `` (40 stripped for the baseline load) and this `CREATE PROCEDURE` has none, so on dev the routine is recreated as `CURRENT_USER`. Confirm the shared-DB run executes as `AllianceRepUser`. `1783029013035` has the identical property, so this is pre-existing, not introduced. Separately: `--log-bin-trust-function-creators=1` masks nothing here — MySQL 1418 applies to stored *functions*, and this migration creates only a PROCEDURE |
| B-8 | risk (low) | `DROP`/`CREATE` leaves a brief window where `CALL SP_versioning` raises 1305, and the `DROP` takes an exclusive metadata lock that waits on in-flight invocations. Unavoidable in MySQL, identical to every prior routine migration — fold "low-traffic window" into the §6 DevOps note |
| B-9 | risk (low) | `design.md` §6 describes backout as "a procedure swap". Accurate but under-stated: a rollback re-breaks versioning for all six indicators **and** leaves the newly created objective rows in place. Worth one sentence for an on-call engineer reverting at 2am |
| B-10 | readability | The fixture's docblock names only "the scratch MySQL schema". The real prerequisite chain is `compose:test:up` → `migration:test:bootstrap` → `migration:test:execute` → `test:fixtures`, and a bare 1054 means "migration not applied", not "harness broken" |
| B-11 | readability | RB-3's mitigation claims "the fixture proves the other blocks still copy". It does not — the seeded result has no children outside the two objective tables, so the other 27 blocks copy zero rows. What the green `CALL` **does** prove is that every block's column list is nameable and count-matched (1054/1136 raise at prepare regardless of row count). DC-B is carried by the body diff, as designed; the risk-table sentence credits the wrong gate |

Per the methodology none of these may become a task in this spec, and none was minted. **B-1 is rollout-blocking and was escalated to the user rather than filed and forgotten.**

### B-1 — the repair activates a latent FK failure in the re-versioning path

**Status: escalated to the user, 2026-08-14. Not actioned. T-03 is held pending the ruling.**

The risk lens surfaced this; the Leader then verified every load-bearing link directly against the live scratch schema rather than adjudicating on the report:

| Link | Leader verification |
| --- | --- |
| Both objective tables hold **RESTRICT** FKs to `results` | `information_schema.REFERENTIAL_CONSTRAINTS` → `DELETE_RULE = NO ACTION` for `FK_f1a19f2f5d9556dee00b4c54d31` (`result_impact_outcomes`) and `FK_f533df2b0cbca7d2d9cdc8d4308` (`result_strategic_objectives`) |
| `SP_delete_result_version` never deletes those two tables | `ROUTINE_DEFINITION LIKE '%result_impact_outcomes%'` → **0**; same for `result_strategic_objectives` |
| `full_delete_result_version` **does** delete both | → **1** for both. This is the transcript §4.1 divergence, confirmed live |
| The delete routine ends by removing the parent | Routine tail: `DELETE FROM results WHERE result_id = temp_result_id` |
| Both call sites delete the previous snapshot **before** re-versioning | `green-checks.repository.ts:294 → :307`; `result-status-workflow.repository.ts:152 → :172` |

**The consequence.** Today the defect is inert: `SP_versioning` aborts at block 3 with 1054, so those two tables never receive snapshot rows and the delete routine never trips over them. **After this migration they will.** The next re-version of any result carrying objective rows — mainstream for Portfolio-2 alignment — hits **MySQL 1451** on the final `DELETE FROM results`.

The two call paths fail differently, and the worse one is unprotected:

- `green-checks.repository.ts` calls through `this.dataSource.query(...)` with **no transaction**, and the routine itself has no `START TRANSACTION` and no handler → autocommit. The ~32 preceding table deletes **commit**, then the parent delete fails: the snapshot's children are destroyed while the snapshot row survives. Not recoverable through the application.
- `result-status-workflow.repository.ts` runs inside an `EntityManager` transaction, so it rolls back — but its `.catch()` at `:167-169` rewrites the error to a bare `'Error deleting snapshot'`, making the 1451 diagnostically invisible.

That second point also **answers RB-4's open question** ("whether callers swallow the error") — one of them does, and the answer should be carried into `requirements.md`.

**Why this is recorded as an advisory and not a FAIL.** DD-4 explicitly forbids touching the delete routine, and the Implementer complied. T-02 is correct as specified; the gap is in the spec's own risk analysis, which sized this as OQ-2 "worth its own ticket". Transcript §4.1 predicted *orphaned rows*; with a RESTRICT FK the real outcome is a hard block plus partial, committed deletion. The advisory route out of a spec is escalation, never a self-minted task.

**Options put to the user:**

1. **Companion migration** (Reviewer's suggestion) — add the two `DELETE` statements to `SP_delete_result_version`, mirroring `full_delete_result_version`, in **its own migration** shipped with or ahead of this one. Honours DD-4 (no harmonization hidden inside a versioning bugfix) while closing the activated defect.
2. **Measure it** — extend the fixture to version → re-version and record the failure explicitly, so the gap is proven rather than assumed, then decide.
3. **Accept and defer** — merge as-is, record B-1 against OQ-2, and hold the shared-DB run until a separate ticket lands. Note that `down()` does **not** undo the exposure: rows created while the fix is live persist and keep blocking the delete.

---
