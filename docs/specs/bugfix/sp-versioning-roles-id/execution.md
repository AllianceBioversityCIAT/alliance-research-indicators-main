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
| Budget (design §2.4) | ~~3 tasks · ~2,050 LOC · 1–2 review rounds~~ → ~~4 tasks · ~2,050 LOC + baseline dump · 2–3 review rounds~~ → **5 tasks · ~2,750 LOC + baseline dump · 3–4 review rounds** (revised 2026-08-14 by the T-02 Pivot; this row had been left at the T-01 figure — corrected 2026-08-18 by the Leader during T-03 so the log and `design.md` §2.4 no longer state two different budgets) |
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

- `green-checks.repository.ts` calls through `this.dataSource.query(...)` with **no transaction**, and the routine itself has no `START TRANSACTION` and no handler → autocommit. The 32 preceding child deletes **commit**, then the parent delete fails: the snapshot's children are destroyed while the snapshot row survives. Not recoverable through the application.
- `result-status-workflow.repository.ts` runs inside an `EntityManager` transaction, so it rolls back — but its `.catch()` at `:167-169` rewrites the error to a bare `'Error deleting snapshot'`, making the 1451 diagnostically invisible.

That second point also **answers RB-4's open question** ("whether callers swallow the error") — one of them does, and the answer should be carried into `requirements.md`.

**Why this is recorded as an advisory and not a FAIL.** DD-4 explicitly forbids touching the delete routine, and the Implementer complied. T-02 is correct as specified; the gap is in the spec's own risk analysis, which sized this as OQ-2 "worth its own ticket". Transcript §4.1 predicted *orphaned rows*; with a RESTRICT FK the real outcome is a hard block plus partial, committed deletion. The advisory route out of a spec is escalation, never a self-minted task.

**Options put to the user:**

1. **Companion migration** (Reviewer's suggestion) — add the two `DELETE` statements to `SP_delete_result_version`, mirroring `full_delete_result_version`, in **its own migration** shipped with or ahead of this one. Honours DD-4 (no harmonization hidden inside a versioning bugfix) while closing the activated defect.
2. **Measure it** — extend the fixture to version → re-version and record the failure explicitly, so the gap is proven rather than assumed, then decide.
3. **Accept and defer** — merge as-is, record B-1 against OQ-2, and hold the shared-DB run until a separate ticket lands. Note that `down()` does **not** undo the exposure: rows created while the fix is live persist and keep blocking the delete.

---

## Pivot Record: T-02 — the repair activates a latent 1451 in the delete routine

**Trigger:** advisory B-1, raised by the T-02 risk lens, verified independently by the Leader against the live scratch schema (table above). **User ruling, 2026-08-14: option 1 — companion migration.**

**Why this is a Pivot and not rework.** T-02 itself is correct and passed all three lenses; nothing about its diff changes. What was wrong is the *spec's* analysis: `design.md` DD-4 called the delete-routine divergence an "unrelated pre-existing inconsistency" and `requirements.md` OQ-2 sized it as "worth its own ticket". Both premises are false — this spec's own repair is what makes the divergence reachable, and the failure mode is not the orphaned rows transcript §4.1 predicted but a hard MySQL 1451 plus partial committed deletion, because the FKs are RESTRICT. An advisory that cannot wait is a spec gap, and the route out of a spec is escalation, never a self-minted task.

**Blocker.** Merging the `SP_versioning` repair alone converts "versioning never works for any indicator" into "re-versioning fails once a snapshot exists, destroying that snapshot's children on the untransacted `green-checks` path". That is a worse failure than the one being fixed, because it loses data instead of refusing to act.

**Alternatives considered:** the three options put to the user (companion migration / measure-first / accept-and-defer), recorded verbatim under B-1 above. The user chose the companion migration.

**Revised direction.** Two migrations ship together, the delete repair sorting first or in the same PR (RB-5). The delete routine gains exactly the two `DELETE` statements `full_delete_result_version` already has, placed before the final `DELETE FROM results`. No transaction, no handler, no other harmonization — DD-4's *intent* (nothing hidden inside another change's diff) survives; only its factual premise was replaced.

### Amendments applied (Pivot Protocol step 3)

| Document | Change |
| --- | --- |
| `requirements.md` | **R-SPV-002** added (5 ACs + re-version scenario) · **DC-E** added to §4.1 · **RB-5** added · RB-4 partly answered (a caller *does* swallow the error — `result-status-workflow.repository.ts:167-169`) · **OQ-2 struck and resolved** into R-SPV-002 |
| `design.md` | **§3.1** added (the companion migration, with the verbatim SQL and the live-verified evidence chain) · **DD-6** added, **DD-4 struck and amended** · §6 Rollout re-written (order, backout, timing, `DEFINER` — absorbing advisories B-7, B-8, B-9) · Document Control budget and Pivot rows updated |
| `tasks.md` | **T-02b** added · dependency graph, budget tripwire (4→5 tasks, ~2,050→~2,750 LOC, 2–3→3–4 rounds), coverage table, PR strategy, and Done definition all updated |

### Correction closure — two-direction sweep

**Forward** (`grep` for the superseded values across the whole spec folder): `OQ-2` and `DD-4` appear at `tasks.md:121` (T-02's implementation note) and `tasks.md:136` (the rollout hold). Both annotated rather than deleted — they were true when written and are part of T-02's record.

**Backward** (documents citing the corrected sections) — **one real hit, in the neighbouring spec**:

> `innovation-use/data-model-and-catalog` asserts the delete-routine divergence as a *fixture expectation*, not merely as prose:
> - `design.md:422` — "Harmonize the two hard-delete routines … **Out of scope** — 'fixing' it changes delete behavior for every indicator"
> - `design.md:499` and `tasks.md:319` — M6's edit-set assertion requires the post-M6 routine bodies to leave "**both divergences intact**" (R-IU-011 AC.8/AC.9)
>
> Once T-02b lands, one of those two divergences **no longer exists**, so M6's assertion checks a stale expectation and will fail for the right reason at the wrong place. This is carried into **T-03**, which already owns the chunk-1 reconciliation — see its carry-forward list. It is recorded, not silently edited: amending another spec's approved acceptance criteria is that spec's gate, not this one's.

---

### T-02b — Companion migration: `SP_delete_result_version` deletes the objective tables: **PASS**

- **Date:** 2026-08-14
- **Implementer attempts:** 1 (no rework)
- **Review mode:** **parallel lens** (4R) — two lenses, **spec conformance + evidence discrimination** (the gate) and **risk**. Both `STATUS: PASS`. Narrower than T-02's three because the change is eight lines over a body whose structural questions T-02's review had already settled
- **Requirements covered:** R-SPV-002 AC.1–AC.5; DC-E; RB-5

#### Files changed

| File | What |
| --- | --- |
| `src/db/migrations/1784250000000-RepairSpDeleteResultVersionObjectiveTables.ts` | New, 381 lines. `up()` adds the two `DELETE` statements before the final `DELETE FROM results`; `down()` restores the prior body verbatim, omission included |
| `test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts` | +165/−25. A second `it` exercising version → delete-version → re-version on its own `cycleResultOfficialCode`. The 25 deletions are the existing `afterAll` cleanup wrapped in a loop over both codes — **not** removed assertions; T-02's test and every one of its assertions are unchanged (Leader-verified against `git diff`) |

#### Verification evidence

| Gate | Evidence |
| --- | --- |
| **RED, migration absent** (T-02 applied, so `SP_versioning` works — the precondition this red needs) | `QueryFailedError: Cannot delete or update a parent row: a foreign key constraint fails (`ari_scratch_test`.`result_impact_outcomes`, CONSTRAINT `FK_f1a19f2f5d9556dee00b4c54d31` FOREIGN KEY (`result_id`) REFERENCES `results` (`result_id`))` — 1 failed, 1 passed, T-02's test unaffected |
| **GREEN** after `migration:test:execute` | 2/2 pass |
| **RE-RED** via `migration:test:revert` | Revert log confirmed it removed exactly timestamp `1784250000000`; fixture returned to the identical 1451; re-execute → 2/2 green |
| **AC.3/AC.4 — body diff** (Leader-extracted mechanically) | **One hunk, +8 lines**, positioned immediately before the final `DELETE FROM results`. `DELETE` counts: prior 33, `up()` 35, `down()` 33 |
| **AC.5 — `down()` fidelity** | `cmp` → **byte-identical** to the prior body |
| Ordering | Live `migrations` table: `1784211738931 < 1784250000000 < 1784300000000` |
| Lint | `npm run lint -- --quiet` clean; `git status` unchanged before/after |

#### Ownership determination (family decision D-10 — never guess which migration owns a routine)

The Implementer grepped rather than trusting the spec's filename: `SP_delete_result_version` appears in 10–11 migration files; highest prior timestamp is `1778510205765-updatefulldelete.ts`, and `1783029013035` — the newest *lifecycle* migration — contains **zero** occurrences of the routine name. Its objective-table deletes at `:1046–:1052` belong to `full_delete_result_version`, which is what the new statements were mirrored from. Both Reviewers re-derived this independently and confirmed it.

#### What the Reviewers verified independently (not accepted on report)

- **Zero routine drift on the shared DB** — a check neither the Leader nor the brief asked for. Both lenses compared the migration's base body against **dev's live routine** as captured in `baseline.sql:6706–6867` and found it identical to `1778510205765:173–334`. So `up()` overwrites nothing that exists only on dev — the failure mode where a migration reproduces a stale body and silently reverts a hand-edit made directly on the shared database is ruled out, not assumed away.
- **Deletion scope — the load-bearing risk question**, confirmed safe on three independent grounds: `temp_result_id` is selected under `is_snapshot = TRUE` and `results.result_id` is the PK, so snapshot and live rows are distinct; both new `DELETE`s key on `result_id`, an FK to `results(result_id)` (`baseline.sql:3158`/`:4002`) rather than on `result_official_code`; and the statements introduce **no new selection semantics at all** — `WHERE result_id = temp_result_id` is the identical predicate the 30 sibling deletes already use. A live result's objective rows are unreachable by this predicate.
- **Both target tables are FK leaves** — a full-file grep of `baseline.sql` finds no `REFERENCES` pointing at either — so deleting them before `DELETE FROM results` can neither block nor orphan anything.
- **Discrimination** — the fixture asserts `snapshot1Rio`/`snapshot1Rso` are *defined* (`:285–294`) **before** the delete runs, so a silent zero-row copy by `SP_versioning` would fail there rather than producing a trivially-successful delete and a false green. And it versions **twice** (`:275`, `:329`) with the delete at `:303`, clearing the T-02b disqualifier.
- **Body preservation checked by offset arithmetic**, not by trust: a constant 131-line offset holds from prior `:173`↔`up():42` through `:328`↔`:197`, resuming cleanly after the eight inserted lines (`:329`↔`:206`).
- **Two risk-positive choices recorded**, because a plausible alternative to each would have re-opened the bug: the new deletes are **unconditional on `is_active`** (matching all 30 siblings — an `is_active = TRUE` filter would strand soft-deleted rows and re-raise 1451), and the fixture's `afterAll` removes objective rows *before* `DELETE FROM results`, so cleanup stays FK-safe even when the fixture is left RED.
- **The other divergence is correctly left alone** — `up():87-90` keeps `link_results … WHERE result_id = temp_result_id OR other_result_id = temp_result_id`, where `full_delete_result_version` has only `result_id`. One omission closed, nothing harmonized (AC.4).

#### `Not Done / Assumptions` (carried verbatim from the Implementer report)

- The spec's own statement counts ("~37 child deletes", "~32 preceding deletes") disagree with the file: the routine has **32 child deletes + 1 parent = 33 statements**. Implementation unaffected — exactly 2 added, all 33 originals byte-identical.
- Scope fences honoured: no transaction/handler, no harmonization of the `SIGNAL` vs `RETURN FALSE` divergence, no merged migration edited, no harness file touched, full suite not run (T-03's).
- Scratch MySQL left GREEN with both migrations applied.

**Leader adjudication:** no unfinished scope. The count discrepancy is **my error, introduced when I wrote §3.1 during the T-02 Pivot**, and both Reviewers flagged it independently. Corrected in `requirements.md` R-SPV-002 AC.4 and `design.md` §3.1 in the same turn rather than deferred to T-03's sweep — leaving it would send a T-03 verifier hunting for five statements that do not exist.

#### Requirements outcome

| Item | Status |
| --- | --- |
| AC.1 | Closed — the delete completes; the full re-version cycle runs |
| AC.2 | Closed — snapshot 1's objective rows and its `results` row are gone; snapshot 2 carries its own |
| AC.3 | Closed — placement immediately before the final `DELETE FROM results` |
| AC.4 | Closed — 33 prior statements, the `temp_result_id` SELECT, the `SIGNAL` guard and the signature all byte-identical |
| AC.5 | Closed — `down()` byte-identical, omission intact |
| DC-E | Closed — the cycle fixture is the gate; a single-version fixture structurally cannot see this defect |
| RB-5 | Mitigated in structure, not only in prose — see B-13 |

## ADVISORY findings — T-02b (recorded; never gate, never become tasks in this spec)

| # | Lens | Finding |
| --- | --- | --- |
| **B-12** ✅ | conformance / risk (**both lenses**) | **The spec said 37 child deletes; the routine has 32 + 1 parent.** A Leader error from the T-02 Pivot. **FIXED this turn** in `requirements.md` AC.4 and `design.md` §3.1 |
| **B-13** ✅ | risk — *favourable* | Because `1784250000000` sorts **before** `1784300000000`, TypeORM's newest-first revert undoes the versioning repair before the delete repair automatically. Advisory B-9's "revert the delete repair last" is now **structurally guaranteed by the timestamp**, not merely documented |
| B-14 | risk | §6's backout rule is stated in migration-identity terms, not operator terms. Concretely: `npm run migration:revert` reverts exactly **one** migration, and with both applied that is `1784300000000` — **the default single revert is already the safe one**, and the hazard is specifically a *second consecutive* revert. §6 also offers no way to find the residual rows that make it dangerous; a locator (`SELECT r.result_id FROM results r JOIN result_impact_outcomes rio ON rio.result_id = r.result_id WHERE r.is_snapshot = TRUE`, and the same for the other table) would let an engineer decide rather than guess |
| B-15 | risk — harness fidelity, inherited from T-01b | §6 says dev's routines carry ``DEFINER=`AllianceRepUser`@`%` ``, but the baseline snapshot emits `CREATE PROCEDURE` with **no DEFINER** (`baseline.sql:6706`), so the scratch container recreates as the scratch user and **structurally cannot exercise the DEFINER axis**. The green fixture is not evidence about privilege behaviour on dev. This migration introduces no new divergence (`1778510205765` declares none either) and §6 already requires human confirmation — recorded so the green run is not later misread as having covered it. Immaterial companion: dev's routine was created under `sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION` and will be recreated under the TypeORM session's mode; no effect on a DELETE-only body |
| B-16 | risk — pre-existing data | For snapshots created before any of this landed — which by the spec's own premise carry no objective rows, since `SP_versioning` could never execute — the two new statements match zero rows and are a successful no-op. Dev behaviour unchanged |
| B-17 | reliability — optional | The fixture proves the **live** result's rows survive the delete only *indirectly*, via snapshot 2 being non-empty (`:340-352`). Since "the delete did not touch the live result's rows" is the most consequential property of this change, one direct assertion after the delete (`result_impact_outcomes WHERE result_id = cycleSourceResultId` still returns a row) would make the guarantee explicit and fail loudly rather than as a confusing downstream `undefined` |
| B-18 | risk — outside this task | T-03 must still restate chunk 1's R-IU-011 AC.8/AC.9 edit-set assertion. Already carried in `tasks.md` T-03; re-flagged by a Reviewer so it is not lost |

---

### T-03 — Full-suite regression and release: **attempt 1 → FAIL (rework)**

- **Date:** 2026-08-18 · **Attempts run:** 1 of 3 · **Status after this attempt:** `[~]` in flight
- **Requirements covered (attempted):** R-SPV-001 AC.4 (suite); RB-2, RB-3; OQ-1
- **Effort:** Implementer `high` · Reviewers `high` (conformance) / `xhigh` (risk)

#### Leader decisions recorded before the spawn

| Decision | Reason |
| --- | --- |
| **Skills deviated from the task list** — kept `nestjs-expert`, **added** `cognitive-doc-design` and `systematic-debugging` (the latter contingent on a red suite) | T-03's real output is cross-spec document surgery plus an operator-facing hand-off artifact, not Nest code. The task list named only `nestjs-expert` |
| **Fixture suite (`test:fixtures`) excluded from the gate** | User ruling, 2026-08-18. T-03's Verification line names only `npm test`, `test:cov`, `lint` — none needing Docker. The fixture red→green is already recorded verbatim for both defects (1054, 1451) in the T-02 / T-02b entries. Docker daemon was down; pre-flight (KZ-004) confirmed the unit suite does not need it |
| **DevOps comms → drafted, not sent** | User ruling, 2026-08-18. The Leader cannot perform an outward-facing action; the Implementer drafts `devops-note.md`, the user sends it |
| **`caveman` compression not applied to the Implementer brief** | T-03's load-bearing instruction is a *negative* boundary ("raise it, do not edit it"). Compression is most dangerous exactly at a prohibition. Deviation taken deliberately and recorded rather than silently |
| **Parallel lens Reviewers (2), not the single-Reviewer checklist** | The diff's `devops-note.md` is operator guidance on a **data-loss path against a shared, non-disposable database** — a data-loss surface under `/akili-execute` §2.3's mode table, independent of effort |
| **Diff handed to Reviewers as a frozen scratchpad file, not inline** | The inline rule exists because a wrapper-restricted Reviewer has no `Bash` to regenerate the diff; a read-only file it can `Read` satisfies that reason, and inlining for two parallel Reviewers would have duplicated the identical payload. Deviation recorded |

#### OQ-1 — answered and recorded (T-03 Done criterion)

**Ruling, 2026-08-14, by the product owner** — carried here verbatim because the risk-lens Reviewer correctly noted that the answer existed only in `requirements.md` and had **no provenance in the audit trail**, while T-03's criterion is "OQ-1 answered **and recorded**":

> Reporting has been **paused** in production for some time, so there are no updates and no version/snapshot attempts — the defect was never reachable by a real user. **Comms decision: none needed.**

**Consequences:** RB-4's "unknown production exposure" is closed on the exposure side. The error-swallowing observation at `result-status-workflow.repository.ts:167-169` stands on its own as a code finding, unaffected. The paused-reporting window is also the low-traffic window advisory B-8 asks for. This ruling is the sole support for `devops-note.md`'s "User impact: none" section — recorded here so a future operator can audit its source.

#### Files changed (attempt 1)

| File | Change |
| --- | --- |
| `innovation-use/data-model-and-catalog/tasks.md` | `Depends on` declared; T-01/T-02 marked superseded-verify-only; false premise corrected at the T-02 scope bullet and Done criterion; T-03 extraction finalized; RB-B corrected + **RB-B2** added; inbound notice on T-10's AC.8/AC.9 Done item |
| `innovation-use/data-model-and-catalog/design.md` | §6.5.1 piece 4 corrected; inbound notices after the §6.7 "What M6 must NOT do" table and the §10 testing-strategy table |
| `innovation-use/data-model-and-catalog/requirements.md` | Sixth false-premise site (§4.3 DC-13 substitute-gate row) corrected — found by full-folder grep, named by neither the spec's cited list nor the Leader's forward sweep |
| `innovation-use/family.md` | FR-6 marked closed |
| `bugfix/sp-versioning-roles-id/requirements.md` | OQ-1 struck through and answered (pre-existing working-tree edit, carried as this task's evidence) |
| `bugfix/sp-versioning-roles-id/devops-note.md` | **New** — operator-facing hand-off note |

Diff: 6 files, doc-only, +25/−10 plus the new file. **Scope fences held** — no production code, no migration created or edited, no harness file, `design.md` §6 untouched (B-14 routed into the note rather than into the spec, which is correct).

#### Verification (Implementer, from `server/researchindicators`, working tree quiet)

| Gate | Result |
| --- | --- |
| `npm test -- --silent` | **PASS** — `Test Suites: 321 passed, 321 total`; `Tests: 2042 passed, 2042 total` |
| `npm run test:cov` | **PASS** — `All files: 83.57% stmts / 74.76% branches / 84.62% funcs / 83.56% lines`; no threshold failure (global floor 60%) |
| `npm run lint -- --quiet` | Clean, no output. `git status` re-checked after — `--fix` mutated nothing |
| Fixture suite | Deliberately not run (user ruling above); Docker down by design |

#### Reviewer verdicts — attempt 1

**Lens A (spec conformance) — `STATUS: FAIL`, 2 issues.**
**Lens B (risk / reliability) — `STATUS: FAIL`, 2 issues.**

**A-1 — the corrected chunk-1 task still contradicts itself.**
*Discovered Issue:* `data-model-and-catalog/tasks.md:107` (T-02 **Implementation notes**) still reads "The suite must be the **full** one: …" — the identical false premise the task was mandated to remove, left inside the same task and now in direct contradiction with the corrected scope bullet three lines above it. An implementer reading T-02 top to bottom hits "snapshot, only M1–M6 run" and then "the suite must be the full one."
*Violated Rule:* T-03's first carried blockquote — chunk 1's `tasks.md` "**must be updated in this task**", `:97` cited precisely because it "carries the same false premise". Root `CLAUDE.md` §5 ("Do NOT silently let docs and code drift").
*Remediation:* Same strikethrough-plus-correction pattern at `:107`; keep the dependency list (true and unchanged), state those objects arrive via the T-01b snapshot.

**A-2 — "already-merged migration" is false and defeats the merge gate this task just declared.**
*Discovered Issue:* `data-model-and-catalog/design.md:426` asserts the T-02b work landed "outside M6, in its own **already-merged** migration." Both migrations exist only on branch `AC-1679-Create-the-innovation-use-section`; the shared-DB run has not happened — it is what this task's own `devops-note.md` requests. The claim contradicts two statements in the same diff: the new `Depends on` line ("**must be merged before T-10 starts**") and bugfix `design.md:176` Coupling ("**Once merged**, chunk 1 drops its T-03"). A chunk-1 implementer reading "already-merged" has a documented reason to skip the `SHOW CREATE PROCEDURE` check — the one guard between M6 and re-emitting a non-executable body.
*Violated Rule:* bugfix `design.md` §6 Coupling + Shared-DB gate rows; `requirements.md` §7 (DevOps sign-off outstanding); root `CLAUDE.md` §5.
*Remediation:* Merge-status-free statement of fact + "pending merge of `bugfix/sp-versioning-roles-id`; verify with `SHOW CREATE PROCEDURE SP_delete_result_version` before T-10."

**B-1 — `devops-note.md` omits the Shared-DB gate entirely.**
*Discovered Issue:* The note's five imperative steps read as a self-authorizing procedure against a non-disposable database. Step 1 is "Run these two migrations"; step 2 says "you don't need to schedule around anything else"; step 4 downgrades the last remaining check to "a check, not a change to how you already run migrations". Nowhere does it state that a shared-DB run requires **human approval first**. A DevOps engineer handed this document has a complete and self-authorizing procedure in front of them.
*Violated Rule:* `design.md` §6 Rollout → **Shared-DB gate** ("Human approval required before running against the shared dev database"); `requirements.md` **RB-2**; `family.md` **FR-3**; root `CLAUDE.md` §4.3.
*Remediation:* Make the gate **step 0** and blocking — "This note is the hand-off that *requests* the run; it is not the approval." Name who approves and where the approval is recorded.

**B-2 — `family.md` FR-6 stamped "CLOSED 2026-08-18" while its own closure criterion is unmet.**
*Discovered Issue:* The criterion sits in the same cell, left intact: "must not start T-10 until it **merges**." Nothing has merged, and T-03's own Done items (suite, DevOps informed, release) were unchecked at the time of the edit. The supporting evidence is narrower than the claim — "proven red-before-green **on the scratch schema**"; the shared dev DB still carries the broken routine. Chunk 1's `tasks.md:130` tells an implementer to run `SHOW CREATE PROCEDURE SP_versioning` before T-10 and **stop** if `roles_id` is present — which it still is. Marking the row closed converts a live guard into a green light.
*Violated Rule:* `family.md` FR-6's own mitigation column; bugfix `design.md` §6 Coupling ("**Once merged**…").
*Remediation:* Merge-conditional wording; keep the residual pre-flight condition explicit.

#### Leader adjudication

**All four findings accepted as in-scope; one lens conflict resolved.**

The two lenses **disagreed on FR-6**: Lens A accepted it (T-03's Done item mandates closing the row, and there is no later task in which to do it — so "now" is the only compliant time), filing only advisory A1 on the wording. Lens B filed it as a FAIL (the row asserts a state that is not true and defeats a live guard).

**Both are right about different things, and they converge on the same remedy.** The task genuinely mandates closing FR-6, so deleting or deferring the closure would violate T-03. What is defective is the *wording*, which asserts a completed merge. Adjudicated as an **in-scope FAIL whose remediation is merge-conditional phrasing, not removal of the closure** — satisfying the mandate and the risk finding at once.

**Root cause is shared across three of the four findings.** A-2 and B-2 are the same defect at two sites, and B-1 is its operational twin: the attempt conflated *"task `[x]`, Reviewer PASS, committed on a branch"* with *"merged and applied to the shared database."* Attempt 2 is therefore briefed to sweep its **own diff** for merge-status over-claims rather than patching only the two cited sites — the two-direction sweep discipline this spec already applies to pivots.

**Not a Pivot.** No evidence surfaced that the spec is wrong or unviable; the spec was right and the implementation over-claimed against it. Straight rework, effort bumped `high` → `xhigh`.

**Boundary set for attempt 2** (to stop the fix from widening): sites **inside the blocks T-03 mandates** get corrected; identical premises **outside** those blocks get recorded as advisory and, where they are acceptance criteria, remain chunk 1's own gate to amend.

## ADVISORY findings — T-03 attempt 1 (recorded; never gate, never become tasks in this spec)

| # | Lens | Finding |
| --- | --- | --- |
| C-1 | risk | The note's failure-mode sentence drops the path qualifier both sources carry. `design.md` §3.1 restricts partial destruction to the **untransacted `green-checks` path** ("the workflow path is transactional and rolls back"); RB-5 agrees. Overstated in the safe direction, so not a gate — but naming the path would also tell the operator the failure can arrive *invisibly* on the other path, reported as a bare `'Error deleting snapshot'` |
| C-2 | reliability | Note step 2 ("you don't need to schedule around anything else") contradicts its own Timing section ("the `DROP` takes an exclusive metadata lock…"). The reporting pause is a fact about **production**; the target here is the **shared dev** database, whose traffic that pause does not govern |
| C-3 | reliability | Step 4 asks the operator to confirm the DEFINER but supplies neither a command nor a failure branch. A wrong definer breaks at `CALL` time, not migration time. A post-run verification section (`SHOW CREATE PROCEDURE` on both routines) would close it |
| C-4 | readability | The note names only `migration:dev:execute`. `README.md:262-263` documents `migration:execute` as the dist/production path. Both resolve to `orm.config.ts` → `CORE` → `ARI_MYSQL_*`, so nothing is wrong; naming the **datasource** rather than one script removes the assumption that the operator runs from a TypeScript checkout |
| C-5 | conformance — *favourable* | The "superseded" marking of chunk 1's T-01/T-02 was **verified sound**, not accepted on assertion: `test/jest-fixtures.json` sets `rootDir: "."` (resolved against `test/`) with `testRegex: ".fixture-spec.ts$"`, so it does collect `test/fixtures/innovation-use/**` recursively. Chunk 1's T-02 Jest-config deliverable is genuinely satisfied; **no work is stranded** by the supersede |
| C-6 | reliability | The supersede notes say "verify the existing one and close as a no-op" — not falsifiable as written. The harness collects only `*.fixture-spec.ts`; a chunk-1 fixture named `*.spec.ts` under `test/` is collected by **neither** runner and yields exactly the silent zero-collected pass chunk 1's own disqualifier forbids. Naming the convention and `npm run test:fixtures` would make the verify step real |
| C-7 | conformance | Three further "from empty" sites survive **outside** T-03's mandate: `tasks.md:163` (T-04 Done), `requirements.md:248` (R-IU-002 AC.4), `requirements.md:254`. Two are ACs — chunk 1's gate to amend. A raise-notice, not an edit, is the correct instrument |
| C-8 | conformance | Two small imprecisions in audit prose: (a) RB-B2 says an empty container "fails at migration **#139**" — from empty the *first* blocker is `1751474908040-InsertTemplates.ts` (`sec_template`, MySQL 1146, RB-1b); #139 is the second, found after the first was worked around. (b) `tasks.md:328` says one of the two divergences "no longer exists" where `design.md:426` more accurately says the table-enumeration **half**; by the transcript's taxonomy nothing ceased to exist |
| **C-9** | risk — **carry forward** | **Post-T-02b staleness now sits in chunk 1's declared M6 authority.** `routine-transcript.md:172-175` still records `SP_delete_result_version` as absent for both objective tables ("Table count 33"), `:177` still says AC.8 asserts the divergence survives M6 intact, and `requirements.md:511` still names `1778510205765` as that routine's latest definition. **DD-12 requires M6 to be written from the transcript, not from prose** — so this is the one place stale text can propagate into SQL. Correctly outside T-03's sweep (editing chunk 1's authority is chunk 1's gate), but stronger than B-18 and must not rest on B-18 alone |
| C-10 | readability | The inbound notice at `tasks.md:328` was inserted **between** Done-checklist items, splitting one list into two so the following items render as a restarted list. Both `design.md` notices also say "the row above" when the referenced row is 2–3 rows up |
| C-11 | conformance | T-03's Verification block specifies a falsifying input ("revert one lifecycle-adjacent spec's expectation — the full suite must fail"); the evidence supplied is the three commands only. The diff changes zero code, so this would test suite sensitivity rather than the change, and the Done checklist is satisfied — but every prior task in this spec demonstrated its falsifier, which makes the omission conspicuous |
| C-12 | traceability | `devops-note.md` is linked from nowhere — not `requirements.md` §7, not `tasks.md` T-03, not `execution.md`. **Closed by this entry**, which is now its pointer |


### T-03 — Full-suite regression and release: **attempt 2 → PASS**

- **Date:** 2026-08-18 · **Attempts run:** 2 of 3 · **Effort:** Implementer `xhigh` (bumped from `high`) · Reviewer `high`
- **Reviewer mode:** single Reviewer, scoped re-judgment. Changed from round 1's parallel lens pair because the data-loss surface's factual claims (migration identity/order, revert semantics, DEFINER, locator SQL) were exhaustively verified correct in round 1 — re-deriving them would violate *commit to the delegation*. The verified facts were passed forward in the brief so the pass was spent on closure and new-defect detection.

#### Runtime failure (not a work FAIL, consumed no attempt)

The first closure-Reviewer spawn terminated on **API Error 529 Overloaded** — an environment blocker. Per `/akili-execute`'s runtime-failure fallback it was retried once, with the identical brief and the same frozen diff; the retry completed. **The Reviewer-inline fallback was not used and was never considered available:** the Leader supervised this work, so auditing it would collapse `author ≠ auditor`, and an infrastructure failure does not suspend a correctness constraint.

#### Root cause of attempt 1's FAIL (Leader analysis)

Attempt 1 was not missing work — it delivered all five deliverables and the suite was green. It made **one systematic error at multiple sites**: it treated *"task `[x]`, Reviewer PASS, committed on a branch"* as equivalent to *"merged and applied to the shared database."* Three of the four findings were that single error, so attempt 2 was briefed to sweep its **own diff** for merge-status over-claims rather than patch the two cited sites — the two-direction sweep discipline this spec already applies to pivots.

That sweep paid for itself: it found a **fifth** site neither lens cited by line — chunk 1's `tasks.md:136`, where attempt 1's own blockquote claimed "This extraction is complete; nothing further is pending here", sitting three blockquote paragraphs below its own "verify the bugfix is merged … If it does, stop" instruction. That is the site most likely to have talked a chunk-1 implementer past the guard.

#### Attempt 2 changes (six edits, all documentation)

| Finding | Site | Fix |
| --- | --- | --- |
| A-1 | `data-model-and-catalog/tasks.md:107` | Struck "The suite must be the **full** one"; dependency list retained verbatim and re-attributed to the T-01b snapshot |
| A-2 | `data-model-and-catalog/design.md:426` | "already-merged migration" → merge-status-free fact + the `SHOW CREATE PROCEDURE SP_delete_result_version` pre-flight |
| B-1 | `devops-note.md` | Blocking **step 0** ahead of everything: names the note as *requesting* the run, not authorizing it, and points at the real approval mechanism |
| B-2 | `family.md` FR-6 | Closure **retained** per Leader adjudication; wording now "Closes on merge of this PR" + explicit residual (branch-only, shared DB still broken, `devops-note.md` and §7 Sign-off both open) |
| C-10 | `data-model-and-catalog/tasks.md` T-10 | Inbound notice moved from *between* Done items to after the complete checklist — list renders as one again |
| self-swept | `data-model-and-catalog/tasks.md:136` | "Verified and finalized" → "Recorded", plus an explicit line that this closes the routing record, **not** the merge gate |

#### Leader adjudication of the round-1 lens conflict (recorded because it bound attempt 2)

The two lenses **disagreed on FR-6**. Lens A accepted the closure — T-03's Done item mandates *"`family.md` FR-6 closed"* and there is no later task, so "now" is the only compliant time. Lens B filed it FAIL — the row asserted a state that was untrue and converted a live guard into a green light.

**Both were right about different things, and they converged on one remedy.** Deleting or deferring the closure would have violated T-03; retaining "CLOSED" would have violated `design.md` §6 Coupling. Adjudicated as an **in-scope FAIL whose remediation is merge-conditional phrasing, not removal of the closure** — and the binding was stated explicitly in attempt 2's brief and in the closure-Reviewer's brief, so neither worker could re-open a settled question.

#### Reviewer verdict — attempt 2: `STATUS: PASS`

> All four round-1 findings and the list-splitting rendering defect are closed at the cited sites, with citations (`design.md` §6 Shared-DB gate, `requirements.md` §7 Sign-off, the migration filename) verified accurate against the tree; the fifth self-swept site was in-scope, the left-alone sites' code-artifact-vs-deployment-state distinction holds including RB-B2, and the scope fences (no code, no migration, bugfix `design.md` and R-IU-011 AC.8/AC.9 untouched) held. **No new defect entered.**

**Independently verified by the Reviewer, not accepted on report:**

- **Every citation attempt 2 introduced resolves.** `design.md` §6 *Rollout* at `:166` with the Shared-DB gate row at `:174`; `requirements.md` §7 Sign-off at `:173` carrying both the Engineering-lead (`:175`) and DevOps (`:176`) rows step 0 names; root `CLAUDE.md` §4.3 does make shared-DB schema operations a human decision. Step 0 points at a **real** approval mechanism, not a dangling reference.
- **RB-B2's `closed (external)` survives scrutiny** — a claim round 1 never examined. The gap it records is *can the scratch schema be built at all*, closed by the committed `src/db/baseline/` snapshot, which is exercised only against the **disposable** container. No shared-DB deployment state is implied, so the code-artifact-vs-deployment-state distinction the Implementer drew is the correct one.
- **The other left-alone judgments hold:** `tasks.md:11` is a forward-looking requirement, not a state claim; the T-01/T-02 supersede notices rest on committed on-branch artifacts and stay verification-conditional; `design.md:506` makes a routine-body claim that is unconditional regardless of merge.
- **Markdown structure checked line by line** — strikethrough, bold-nested-italic, backtick and paren balance all sound; the note's `0.`-based ordered list renders as 0–5. (Attempt 2 caught and fixed one stray `)` of its own before reporting.)
- **Fences confirmed against the tree:** bugfix `design.md` absent from the diff entirely (B-14 stayed routed into the note); chunk 1 `requirements.md` changed only at the §4.3 DC-13 row, R-IU-011 AC.8/AC.9 untouched; `tasks.md:163`, `requirements.md:248`, `requirements.md:254`, `routine-transcript.md:172-177` all unchanged.

#### Final verification

| Gate | Result |
| --- | --- |
| `npm test -- --silent` | **PASS** — `Test Suites: 321 passed, 321 total`; `Tests: 2042 passed, 2042 total` |
| `npm run test:cov` | **PASS** — 83.57% stmts / 74.76% branches / 84.62% funcs / 83.56% lines; global floor 60%, not regressed. Note `collectCoverageFrom` excludes `**/db/migrations/**`, so this spec's migrations cannot move the number either way |
| `npm run lint -- --quiet` | Clean; `git status` re-checked, `--fix` mutated nothing |
| Not re-run for attempt 2 | Documentation-only changes; Leader instruction. Fixture suite excluded from the gate by user ruling — its red→green stands recorded verbatim in the T-02 / T-02b entries for both defects (1054, 1451) |

#### Requirements outcome

| Item | Status |
| --- | --- |
| R-SPV-001 AC.4 (suite) | Closed — full suite green, never targeted (KZ-003) |
| RB-2, RB-3 | Addressed — the shared-DB run stays a human gate, and `devops-note.md` now carries that gate as blocking step 0 rather than omitting it |
| OQ-1 | **Answered and recorded** — ruling carried verbatim with provenance in the attempt-1 entry above, closing the risk lens's advisory that it existed only in `requirements.md` |
| Chunk 1 updated | Closed — `Depends on` declared, T-01/T-02 superseded-verify-only, T-03 extraction record finalized, six false-premise sites corrected, RB-B corrected + RB-B2 added, three raise-notices filed without touching chunk 1's ACs |
| `family.md` FR-6 | Closed **merge-conditionally**, with the residual pre-flight named |

#### `Not Done` — one criterion, user-owned

**"DevOps informed before the shared-DB run" is NOT closed.** The note is drafted and Reviewer-verified; **sending it is an outward-facing human action the Leader cannot take**, and the user explicitly took ownership of it (ruling, 2026-08-18: *"Draft the note, you send it"*).

T-03 therefore stays `[~]`, not `[x]`. This is deliberate and follows the standard this very task enforced on FR-6: a reader who saw T-03 `[x]` would conclude DevOps had been informed, which is exactly the over-claim attempt 1 failed for. Marking it done while the note sits unsent would repeat that error in the audit trail itself.

**One action flips it:** send `devops-note.md` to DevOps, then check `requirements.md` §7's DevOps box (recording approver and date) — at which point T-03's remaining criterion and the spec's release gate both close.

## ADVISORY findings — T-03 attempt 2 (recorded; never gate, never become tasks in this spec)

| # | Lens | Finding |
| --- | --- | --- |
| D-1 | readability | At `design.md:353` and `requirements.md:253` the retained lead-in ends in a period and the struck fragment then starts lowercase. The original was a subordinate clause; splitting the correction into its own sentence would read cleanly |
| **D-2** | readability — **precision, the one worth acting on** | Three snapshot restatements disagree on what runs after the snapshot loads. `design.md:353` is accurate ("M1–M6 here, **plus the two migrations in the external bugfix spec**"); `requirements.md:253` and `tasks.md:102`/`:116` say "only this chunk's own M1–M6". On this branch the two bugfix migrations post-date the snapshot, so `tasks.md:116`'s restated criterion "`migration:test:execute` reports zero pending migrations" **will read 2 pending** once they are in the tree. Aligning the three on `design.md:353`'s phrasing removes a criterion that will read false to the next implementer |
| D-3 | readability | Pointer imprecision: `tasks.md:136` says "two paragraphs above" (it is three); both `design.md` notices say "the row above" where the row is 2–3 up; `tasks.md:331` says "this Done item" now that it sits after the whole checklist. All cosmetic — each sentence self-disambiguates by quoting its referent |
| D-4 | risk | `devops-note.md` step 0 names the approver as "whoever checks the 'DevOps' box" while the note is addressed **to** DevOps. The parenthetical gives both rows, but naming the **Engineering-lead** row as the non-operator approver would eliminate the residual self-approval reading |
| D-5 | risk | RB-B2's `closed (external)` is sound but does not repeat the branch/merge caveat carried at `tasks.md:11`; one clause ("inherited on merge of that spec") would make the row self-contained for a reader landing on the register directly |
| — | carried | Still open and still non-gating from round 1: **C-8** (RB-B2's "#139" first-blocker imprecision), **C-11** (T-03's falsifier not demonstrated), **C-9** (`routine-transcript.md` staleness — chunk 1's gate, and stronger than B-18) |


#### Addendum — T-03 attempt 2 received a **second, independent Reviewer PASS**

The closure-Reviewer spawn that was recorded above as terminated on **API Error 529** had in fact not died — it was still running and completed after the retry. Attempt 2 therefore carries **two independent PASS verdicts from two separately spawned Reviewers**, neither aware of the other. This is stronger evidence than the single verdict recorded above, and it is logged rather than discarded.

**What the second Reviewer verified that the first did not:**

- **Per-file `2026-08-18` occurrence counts reconcile exactly with the frozen diff** (design 3 · tasks 13 · requirements 1 · family 1) — proving there were **no undeclared working-tree edits** outside the reviewed diff. Neither the Implementer's report nor the first Reviewer established this.
- **`RB-B2`'s `closed (external)` status was pushed on hardest**, and held: the gap it records is *"no mechanism to build a scratch schema"*, whose remedy is a **repo artifact, not a deployment**. It confirmed `src/db/baseline/baseline.sql` and its `README.md` exist and are **tracked** (no matching pattern in the package `.gitignore`), and that the target is a local Docker schema, so no shared-DB state is implicated. The Implementer's code-artifact-vs-deployment-state distinction is independently upheld.
- **Repo-wide grep for `already[- ]merged|is merged|already applied|already landed` returns no residual over-claim** in any audited file — a direct falsification test of attempt 1's root cause, rather than a site-by-site check.
- **`R-IU-011 AC.8/AC.9` untouched was confirmed as *mandated*, not merely permitted**, citing `tasks.md:188` ("this task raises it, it does not silently edit it").

#### Leader response to the second Reviewer's process finding

> *"`tasks.md:177` already records 'Reviewer PASS on attempt 2' and its Done items at `:199-203` are checked — written before this review concluded. My verdict happens to match, so no false record results, but pre-recording a Reviewer verdict is worth avoiding on principle."*

**The principle is right and the finding does not apply here.** The record was written **after** a completed Reviewer PASS — from the retry spawn, whose verdict is transcribed in full above. The flagging Reviewer had no way to know a second Reviewer existed, because the 529 notification had reported its own spawn as dead. Nothing was pre-recorded and no verdict was anticipated.

**The real artifact of the mix-up is the reverse, and it is worth naming:** this Reviewer audited a tree that **already contained** the attempt-2 PASS record and the flipped Done checkboxes. That is observation-order contamination in the confirming direction — a Reviewer that can see a recorded PASS has a mild pull toward agreeing with it. Recorded so the dual-PASS is not over-read: it reached PASS independently and pushed hardest on the one claim round 1 never examined (`RB-B2`), which is evidence against the bias having bitten — but the two verdicts are **not** equally blind, and the audit trail should say so rather than presenting them as symmetric.

**Process correction adopted:** when a spawn reports a terminal API error, the retry's verdict is authoritative, but the Leader should not treat the failed spawn as reliably dead until the run ends — a 529 notification describes the transport, not the worker.

#### Leader action taken on the second Reviewer's traceability finding

`data-model-and-catalog/design.md:11` and `requirements.md:13` still read **"Last updated: 2026-08-14"** while carrying 2026-08-18 corrections; `tasks.md:12` had been bumped but its two siblings had not. **Corrected inline by the Leader.**

This is deliberately *not* treated as an advisory absorbed into the task. It is a **false statement this task's own diff created** — a document asserting it was not edited on the day it was edited — and it is the same class as the split-checklist defect attempt 2 was told to fix: completing this task's edits correctly, not new scope. Two single-line header bumps, each naming what changed and pointing at the inline provenance. Recorded here as a Leader write, not Implementer work.

#### New advisories from the second Reviewer (recorded; never gate, never become tasks)

| # | Lens | Finding |
| --- | --- | --- |
| E-1 | traceability | ✅ **Closed this turn** — the two stale `Last updated` headers, above |
| E-2 | risk | `family.md` FR-6's "**this PR**" is written in an innovation-use document about the *bugfix* spec's PR. Both live on branch `AC-1679-Create-the-innovation-use-section`, so it resolves to the same thing; naming the branch would remove the double-take |
| E-3 | risk | Duplicate of D-5 — `RB-B2`'s mitigation cell lacks the on-branch qualifier the other five swept sites now carry. Authorizes no action and `baseline.sql` genuinely exists, so non-gating; "(on branch; inherited on merge)" would make the sweep uniform |
| E-4 | risk | Duplicate of D-4 — `devops-note.md` step 0 defines the approver as "whoever checks the 'DevOps' box", plausibly the same engineer executing the note. Not self-authorizing (the parenthetical names both rows and §7's DevOps row *is* the spec's gate), but naming the **Engineering-lead row as approver** and the DevOps row as executor acknowledgement would close the last inch |
| E-5 | readability | Duplicates D-1 and D-3 — the period-then-lowercase strikethrough surgery at `design.md` §6.5.1 piece 4 / `requirements.md:253`, and the "row above" / "two paragraphs above" pointer imprecision. All cosmetic; each sentence quotes its referent |

**Both Reviewers independently carried forward the same non-gating set** — C-1 through C-4, C-6 through C-9, C-11 — with **C-9** (`routine-transcript.md` staleness inside chunk 1's DD-12 routine authority) named by both as the strongest. Two independent auditors converging on one carry-forward is the signal worth acting on; it must not rest on B-18 alone.

