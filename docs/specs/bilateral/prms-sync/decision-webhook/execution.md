# Execution Log — Bilateral / PRMS Sync — Decision Webhook

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/decision-webhook` |
| Spec id | `2026-09-decision-webhook` |
| Approval Mode | **`gated`** (from [`./proposal.md`](./proposal.md) §1) — every continue gate stops for the owner |
| Budget (tripwire) | **10 tasks · ≈ 2,970 LOC · 3 review rounds** ([`./tasks.md`](./tasks.md) §5) |
| Execution started | 2026-09-22 |
| Start commit | `81ea3b30` |
| Branch | `AC-1675-Syncronization-of-bilateral-status-in-PRMS` |
| Leader | Claude Opus 5 (1M) — T1 orchestration, writes no production code |
| Implementer | **Cursor CLI · `grok-4.7-*`** (T2 Coder) — dispatched via Orca orchestration |
| Reviewer | **Cursor CLI · `gpt-5.6-sol-xhigh`** (T3 Auditor) — different model from the Implementer, so `author ≠ auditor` holds and no `REVIEW_WAIVED` record is owed |
| Orchestration Run | `run_1f393f8398d7` (Orca) |

### 1.1 Model-routing deviation, recorded

The registry (`## Model Routing`, root `CLAUDE.md`) maps T2 Coder → `sonnet` and T3 Auditor → `opus` for the Claude Code host. This run was **directed by the owner** (2026-09-22) to execute on **Cursor and Grok** instead. The split chosen keeps the methodology's one hard constraint intact:

- **Implementer** = Cursor / `grok-4.7-*` (T2)
- **Reviewer** = Cursor / `gpt-5.6-sol-xhigh` (T3) — **a different model**, so the audit stays independent on both axes (fresh context *and* different weights).

Because the two roles run on different models, each task closes on an ordinary Reviewer `PASS`. No `REVIEW_WAIVED (same-model)` record is owed by this routing. Had both roles run on Grok, every task would have closed `WAIVED (same-model)` and stopped for the owner — that option was presented and declined.

---

## 2. Environment pre-check (`/akili-execute` Step 2.1)

Run by the Leader **before** the first dispatch, because T-01's verification is environment-dependent (`migration:test:execute` / `migration:test:revert` need the disposable TEST scratch schema, never the shared Dev database — root `CLAUDE.md` §4.3).

| Check | Command | Result |
|---|---|---|
| Docker daemon | `docker info` | **UP** |
| Scratch container | `docker ps --filter name=research_indicators_server_test_mysql` | **Up 5 days**, `127.0.0.1:3307->3306/tcp` |
| Scratch schema loaded | `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='ari_scratch_test'` | **216** tables |
| Migrations applied | `SELECT id,name FROM ari_scratch_test.migrations ORDER BY id DESC LIMIT 3` | head = `391 AddPoolFundingCopyToVersioningSp1789586388552` |
| **T-01 gate precondition** | `… WHERE table_name='prms_webhook_delivery'` | **0 — the table is ABSENT** |

The last row is the one that matters: T-01's *Disqualifier* states the migration gate is worthless if the scratch schema already holds the table from a previous run. It does not. The starting state is clean, and this is the baseline any `migration:test:execute` result for T-01 is read against.

`server/researchindicators/node_modules` is present — no install is owed before the first dispatch.

**Scope this pre-check cannot reach (KZ-017):** it proves the scratch database is reachable and empty of this table. It proves nothing about the shared Dev database (deliberately untouched), nothing about `npm run test:e2e` (a different jest config, P-10), and nothing about the PRMS TEST host (that is T-03's P-14b probe, not this).

> ⚠️ **This baseline was consumed by T-01 and no longer describes the scratch schema.** `npm run migration:test:execute` applies *every* pending migration, not only the one under test, and T-01's run applied four that were already pending in the tree. Post-T-01 state, **independently re-read by the Leader** after the worker reported: **217** tables (was 216), head **`395 DropResultFkFromResultReviewHistory1790024668000`** (was `391 AddPoolFundingCopyToVersioningSp1789586388552`), `prms_webhook_delivery` **absent**. The four now applied are `CreateResultPrmsSyncLogTable1789479131116`, `AddPrmsPhaseIdToResults1789761421000`, `ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000`, `DropResultFkFromResultReviewHistory1790024668000`.
>
> **Any later task that reads this section as its starting state must re-read the schema, not trust the table above.** The figures in the table are the pre-T-01 record, kept because T-01's migration gate is only interpretable against them.

---

## 3. Task Execution History

_Appended per task. Each entry records every Implementer attempt and every Reviewer verdict._

### T-01 — Implementer attempt 1 (2026-09-22)

Package root: `server/researchindicators/`. No commit.

#### 1. Files changed

- `server/researchindicators/src/domain/entities/prms-webhook/entities/prms-webhook-delivery.entity.ts`
- `server/researchindicators/src/domain/entities/prms-webhook/entities/prms-webhook-delivery.entity.spec.ts`
- `server/researchindicators/src/domain/entities/prms-webhook/enum/delivery-correlation-outcome.enum.ts`
- `server/researchindicators/src/domain/entities/prms-webhook/enum/delivery-correlation-outcome.enum.spec.ts`
- `server/researchindicators/src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable.ts`
- `server/researchindicators/src/db/migration-specs/1790086170692-createPrmsWebhookDeliveryTable.spec.ts`

#### 2. Verification evidence

**2.1 Scoped tests — RED (falsifier observed).** `justification` flipped to `nullable: false` on the entity, then:

Command (from `server/researchindicators/`):

```text
npm test -- --silent -- src/domain/entities/prms-webhook src/db/migration-specs
```

Output, verbatim:

```text
npm notice run researchindicators@0.0.1 test
npm notice run jest --silent -- src/domain/entities/prms-webhook src/db/migration-specs
PASS src/domain/entities/prms-webhook/enum/delivery-correlation-outcome.enum.spec.ts
PASS src/db/migration-specs/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.spec.ts (5.118 s)
PASS src/db/migration-specs/1787066437593-createClarisaInnovationUseLevels.spec.ts (5.25 s)
PASS src/db/migration-specs/1790086170692-createPrmsWebhookDeliveryTable.spec.ts (5.249 s)
PASS src/db/migration-specs/1789761421000-addPrmsPhaseIdToResults.spec.ts (5.249 s)
PASS src/db/migration-specs/1787070034303-addInnovationUseCountsToSharedTables.spec.ts (5.278 s)
PASS src/db/migration-specs/1787068132517-createResultInnovationUse.spec.ts (5.294 s)
PASS src/db/migration-specs/1789479131116-createResultPrmsSyncLogTable.spec.ts (5.307 s)
PASS src/db/migration-specs/1789000000000-insertInnovationUseLinkedDevRole.spec.ts (5.317 s)
PASS src/db/migration-specs/1787078283929-createInnovationUseValidation.spec.ts (5.31 s)
PASS src/db/migration-specs/1787280000000-updateInnovationUseValidation.spec.ts (5.332 s)
PASS src/db/migration-specs/insert-aiccra-result-statuses.spec.ts (5.325 s)
PASS src/db/migration-specs/1787071463485-insertInnovationUseRoles.spec.ts (5.331 s)
FAIL src/domain/entities/prms-webhook/entities/prms-webhook-delivery.entity.spec.ts (5.551 s)
  ● PrmsWebhookDelivery entity metadata › justification is text NULL

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      123 |     const justification = column('justification');
      124 |     expect(justification.type).toBe('text');
    > 125 |     expect(justification.isNullable).toBe(true);
          |                                      ^
      126 |   });
      127 |
      128 |   it('decided_at is timestamp NULL', () => {

      at Object.<anonymous> (domain/entities/prms-webhook/entities/prms-webhook-delivery.entity.spec.ts:125:38)

Test Suites: 1 failed, 13 passed, 14 total
Tests:       1 failed, 168 passed, 169 total
Snapshots:   0 total
Time:        5.808 s
```

Exit code: 1. The failing assertion is `findColumnWithPropertyName('justification').isNullable === true` on TypeORM's resolved metadata. The mutation was reverted (`nullable: true`) before any later command.

**2.2 Scoped tests — GREEN** after the revert. Same command.

```text
npm notice run researchindicators@0.0.1 test
npm notice run jest --silent -- src/domain/entities/prms-webhook src/db/migration-specs
PASS src/db/migration-specs/1789479131116-createResultPrmsSyncLogTable.spec.ts (7.623 s)
PASS src/domain/entities/prms-webhook/enum/delivery-correlation-outcome.enum.spec.ts (7.699 s)
PASS src/db/migration-specs/1787068132517-createResultInnovationUse.spec.ts (7.721 s)
PASS src/db/migration-specs/1787078283929-createInnovationUseValidation.spec.ts (7.681 s)
PASS src/db/migration-specs/1787280000000-updateInnovationUseValidation.spec.ts (7.714 s)
PASS src/db/migration-specs/1789000000000-insertInnovationUseLinkedDevRole.spec.ts (7.721 s)
PASS src/db/migration-specs/1787071463485-insertInnovationUseRoles.spec.ts (7.736 s)
PASS src/db/migration-specs/1789761421000-addPrmsPhaseIdToResults.spec.ts (7.722 s)
PASS src/db/migration-specs/1787066437593-createClarisaInnovationUseLevels.spec.ts (7.731 s)
PASS src/db/migration-specs/insert-aiccra-result-statuses.spec.ts (7.797 s)
PASS src/db/migration-specs/1787070034303-addInnovationUseCountsToSharedTables.spec.ts (7.802 s)
PASS src/db/migration-specs/1790086170692-createPrmsWebhookDeliveryTable.spec.ts (7.772 s)
PASS src/db/migration-specs/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.spec.ts (7.817 s)
PASS src/domain/entities/prms-webhook/entities/prms-webhook-delivery.entity.spec.ts (8.082 s)

Test Suites: 14 passed, 14 total
Tests:       169 passed, 169 total
Snapshots:   0 total
Time:        8.496 s
```

Exit code: 0.

**2.3 `npm run build`** from `server/researchindicators/`. Exit code 0. `nest build` printed nothing and continued into `build:admin`; vite finished `✓ built in 388ms`. `BUILD_EXIT:0`.

**2.4 `npx eslint`** (no `--fix`):

```text
npx eslint src/domain/entities/prms-webhook src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable.ts src/db/migration-specs/1790086170692-createPrmsWebhookDeliveryTable.spec.ts
```

No findings. `ESLINT_EXIT:0`.

**2.5 Migration gate on the TEST scratch schema** (`127.0.0.1:3307`, database `ari_scratch_test`). Pre-check before execute, because the table was already absent and the head was not this migration (reverting first would have undone `AddPoolFundingCopyToVersioningSp1789586388552`):

```json
{"tables":[],"head":[{"id":391,"timestamp":1789586388552,"name":"AddPoolFundingCopyToVersioningSp1789586388552"}],"count":[{"table_count":216}]}
```

`npm run migration:test:execute` exit 0. It reported 5 new migrations. The last one was ours. Relevant tail:

```text
Migration CreatePrmsWebhookDeliveryTable1790086170692 has been  executed successfully.
query: COMMIT
```

Live `SHOW CREATE TABLE prms_webhook_delivery` after execute: `result_id` bigint nullable, no `FOREIGN KEY` / `REFERENCES` (information_schema FK list `[]`), `delivery_id` varchar(191) nullable with `KEY idx_prms_webhook_delivery_delivery_id` `Non_unique: 1`, `correlation_outcome` varchar(40) NOT NULL, `decision` varchar(20) nullable, `justification` text `IS_NULLABLE: YES`, three non-unique indexes, charset `utf8mb4_unicode_520_ci`.

`npm run migration:test:revert` exit 0:

```text
CreatePrmsWebhookDeliveryTable1790086170692 is the last executed migration. It was executed on Tue Sep 22 2026 09:09:30 GMT-0500 (Colombia Standard Time).
Now reverting it...
query: START TRANSACTION
query: DROP TABLE `prms_webhook_delivery`
query: DELETE FROM `ari_scratch_test`.`migrations` WHERE `timestamp` = ? AND `name` = ? -- PARAMETERS: [1790086170692,"CreatePrmsWebhookDeliveryTable1790086170692"]
Migration CreatePrmsWebhookDeliveryTable1790086170692 has been  reverted successfully.
query: COMMIT
```

Post-revert: `SHOW TABLES LIKE 'prms_webhook_delivery'` = `[]`.

**2.6 Second falsifier (down body).** Re-executed (only this migration was pending; exit 0, `CREATE TABLE prms_webhook_delivery` ran). Then `down()` was emptied and `npm run migration:test:revert` ran. Exit 0, and the SQL log contains the migrations `DELETE` and **no** `DROP TABLE`. Immediate read:

```json
{"tables":[{"Tables_in_ari_scratch_test (prms_webhook_delivery)":"prms_webhook_delivery"}],"migrationRows":[]}
```

The revert removed the migration row and left the table. `down()` was restored. The orphaned table was dropped with `DROP TABLE prms_webhook_delivery` on the scratch schema. Final read: table absent, no migration row for timestamp `1790086170692`.

#### 3. Done criteria

- [x] Entity matches design §4 column-for-column, including every nullability and the three indexes. Evidence: resolved-metadata spec (20 tests, green in §2.2) plus live `information_schema` / `SHOW CREATE TABLE` / `SHOW INDEX` after execute (§2.5). `result_id` nullable, `foreignKeys` length 0. `delivery_id` nullable, index `isUnique === false`, no `UNIQUE` in the DDL. `correlation_outcome` and `decision` are `varchar` with `enum` undefined. `justification` is `text` and `isNullable === true`. `created_by` nullable, `is_active.default === true`. No `@OpenSearchProperty`.
- [x] Migration applies and reverts cleanly against the TEST scratch schema. Outputs in §2.5. Pre-execute the table was absent (216 tables, head id 391).
- [x] The migration spec lives in `src/db/migration-specs/1790086170692-createPrmsWebhookDeliveryTable.spec.ts`, not beside the migration.
- [x] The justification falsifier was observed red (§2.1), then green (§2.2). The `down()` falsifier was observed on the scratch schema (§2.6): empty `down()` left the table in place.
- [x] `npm run build` green (§2.3). `npx eslint` clean on the touched paths (§2.4).

#### 4. Consumers sweep

Before any new file, from `server/researchindicators/`:

```text
git grep -rn "prms_webhook_delivery\|PrmsWebhookDelivery\|DeliveryCorrelationOutcome" -- src test
```

No lines. Exit code 1 (no matches).

The same command after the files exist still prints nothing and exits 1, because `git grep` does not search untracked files. A workspace search of `*.ts` / `*.js` / `*.json` under `server/researchindicators` hits only the six new files listed in §1. No existing reader.

#### 5. Not Done / Assumptions

- `npm run migration:generate --name=createPrmsWebhookDeliveryTable` was run. It connected to shared Dev (`ARI_MYSQL_HOST=192.168.20.210`, database `alliancereportingdb`) and failed before writing a file: `Table 'alliancereportingdb.orm_metadata' doesn't exist` while reading generated column `active_primary_alignment` on `result_pool_funding_alignment_sp`. The same failure occurred against `orm.test.config.ts` (`ari_scratch_test.orm_metadata`). No `orm_metadata` table was created on either database. The DDL was written by hand from design §4 and the `createResultPrmsSyncLogTable` analogue, then executed on the scratch schema.
- `scripts/scan-migration-placeholders.js` is not in the tree (`package.json` script `migration:scan` points at it; `scripts/` contains only `load-baseline.js`). The two SQL strings in the migration were scanned with the child-guide placeholder pattern. `placeholder_hits 0`.
- `migration:test:revert` was **not** run before the first execute. The pre-check showed `prms_webhook_delivery` absent and head `391 AddPoolFundingCopyToVersioningSp1789586388552`. Reverting first would have undone that migration. Absence was confirmed by `SHOW TABLES`, then execute, then revert.
- `migration:test:execute` applies every pending migration, not only T-01. The scratch schema was missing four migrations already in the tree, and this command applied them and left them applied after T-01 was reverted: `CreateResultPrmsSyncLogTable1789479131116`, `AddPrmsPhaseIdToResults1789761421000`, `ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000`, `DropResultFkFromResultReviewHistory1790024668000`. Post-state: head id `395` `DropResultFkFromResultReviewHistory1790024668000`, `prms_webhook_delivery` absent, table count **217** (was 216; `result_prms_sync_log` is the extra table). Those four were not reverted.
- `duplicate_of_id` has no self-FK. Design §4 types it as nullable bigint and does not name a constraint.
- Nest module registration was not done (T-03).


---

### T-01 — Leader record: evidence re-run, Reviewer verdict, closure

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1**

| Field | Value |
|---|---|
| Task | **T-01 — Schema: `prms_webhook_delivery` entity, enum, migration, migration spec** |
| Implementer | Cursor / `grok-4.7-xhigh` · dispatch `ctx_9bbdfb7add27` |
| Reviewer | Cursor / `gpt-5.6-sol-xhigh` · dispatch `ctx_445af506ea7d` |
| `author ≠ auditor` | **held** — different models, different contexts. No `REVIEW_WAIVED` record is owed |
| runtime events | none |
| Diff | 6 files, **582 insertions**, 0 deletions |

#### Leader effort decision (deviation from the task's `Effort: M`, recorded per `.agents/leader.md` §3)

The Implementer ran at `grok-4.7-**xhigh**`, one rung above the task's `M`/medium. Reason: T-01 produces a **migration**, which the *Effort dial* classes as correctness-critical — migrations are append-only in this repo, so a defect is expensive to reverse once merged. Per the tier↔effort rule the escalation was taken on the **slug** (`high` → `xhigh`), not by forcing `max` onto a cheaper tier.

#### Evidence re-run — non-author, `/akili-execute` Step 2.3 (never waived)

Executed by the **Leader** (inline mode, within the *Delegation Thresholds* inline budget) **after** the worker reported and its terminal was released, so the tree was quiet — root `CLAUDE.md` §4.3: *measure after the worker reports, never beside it*.

| Command | Implementer reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/entities/prms-webhook src/db/migration-specs` | 14 suites / 169 tests green | 14 suites / 169 tests green | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 (`✓ built in 392ms`) | **VERIFIED** |
| `npx eslint <touched paths>` | exit 0, no findings | exit 0, no findings | **VERIFIED** |
| Scratch schema post-state | 217 tables · head `395` · table absent | 217 tables · head `395` · table absent | **VERIFIED** |

**Result: `VERIFIED`** — no `MISMATCH`, so no implicit FAIL and no rework attempt consumed.

**Leader full-suite re-measurement** (root `CLAUDE.md` §4.3 — *workers verify their own scope; the Leader re-measures the full suite after every worker reports*): `npm test -- --silent` → **392 suites, 3392 tests, 1 snapshot — all passed, 17.7 s.** No regression anywhere in the server package. *(The `A worker process has failed to exit gracefully` line is a pre-existing teardown warning in this suite, unrelated to this diff, and the run still exits 0.)*

**What this re-run structurally cannot reach (KZ-017):** it does not run `npm run test:e2e`, `test:integration` or `test:fixtures` — three separate jest configs the root config never invokes (P-10). T-01 adds no e2e surface, so nothing is owed there yet; **T-04 and T-08 will owe it.** It also proves nothing about the shared Dev database, which was never touched.

#### Falsifiers — both observed red, then green (K-004 / KZ-014)

1. **`justification` → `nullable: false`.** Red observed: `expect(justification.isNullable).toBe(true)` → `Expected: true / Received: false`, 1 failed / 168 passed, exit 1. Reverted → 169 passed. The assertion reads **TypeORM's resolved metadata** via `buildMetadatas` + `findColumnWithPropertyName`, not the decorator's options object — which is what makes it a gate that discriminates rather than an inert one (KZ-001, the repo's most recurrent lesson at 13 occurrences).
2. **`down()` body emptied.** Red observed **on the live scratch schema**: the revert ran `DELETE FROM migrations` and **no `DROP TABLE`**, leaving the table orphaned (`SHOW TABLES` returned it, `migrationRows` empty). `down()` restored, the orphan dropped, final read confirms the table absent and no migration row for `1790086170692`.

#### Reviewer verdict — `STATUS: PASS`

> El diff satisface T-01 y `design.md` §4 celda por celda; los seis archivos son exactamente las cuatro entradas autorizadas del task, incluidas las dos sibling specs, sin cambios en `results`, `result_prms_sync_log`, `PrmsSyncOutcome`, migraciones existentes, registro de módulos ni `client`.

All 14 audited checks conformant, including: `result_id` nullable with **no FK** (P-2 — the reason this table exists); `delivery_id` nullable and **not unique** (DD-5 — a unique index would forbid the repeat row R-PWH-005 requires); `correlation_outcome` / `decision` as `varchar`, never MySQL `ENUM`; the three indexes present with exact names and non-unique; the enum holding exactly `CORRELATED`, `UNKNOWN_REFERENCE`, `NO_REFERENCE`, `MALFORMED`, `DUPLICATE`; the migration spec in `src/db/migration-specs/`; and no bare `?` or `:word` in the migration SQL **or its comments** (child guide §7).

#### `ADVISORY` — recorded, never gating

The Reviewer adjudicated the four judgement calls the Implementer surfaced in its `Not Done / Assumptions`. **None is a spec violation**; all four are recorded here and none triggered rework.

| # | Item | Reviewer's adjudication |
|---|---|---|
| 1 | `migration:test:revert` was **not** run before the first `execute`, which the task's *Disqualifier* asks for literally | **Satisfies the Disqualifier's intent.** Absence of the table was proven directly (`SHOW TABLES` + a 216-table / head-391 read), and reverting first would have wrongly undone an unrelated migration (`AddPoolFundingCopyToVersioningSp`). The intent is *confirm the table is absent before execute* — that was met by observation |
| 2 | `npm run migration:generate` **failed** (`orm_metadata` missing on **both** the Dev and the scratch database); the DDL was hand-written | Not a violation. The task's deliverable is a migration conformant to design §4 — the generator is a starting point, not the deliverable. The hand-written DDL was checked cell by cell against §4 and was **executed and reverted for real** |
| 3 | `migration:test:execute` applied **four other** pending migrations and left them applied | A **recorded side effect of the scratch schema**, not a T-01 scope violation. The command applies every pending migration by design. Independently confirmed by the Leader and carried into §2 above |
| 4 | `scripts/scan-migration-placeholders.js` **does not exist**, although `package.json` defines `migration:scan` pointing at it | **Harness debt, not this task's.** The migration carries no forbidden placeholder, proven by reading the SQL and by the real execution. See *Issues encountered* — this is escalated separately |

#### Requirements covered

R-PWH-005 (row shape; AC.5 `justification` nullability; AC.7 append-only column set) · R-PWH-006 AC.2 (`duplicate_of_id`) · R-PWH-009 AC.4 (`environment` column) · NFR-PWH-004 (`raw_body` retained whole).

#### Decisions made

- **Effort escalated** from the task's `M` to `xhigh` — reason above. No spec text was edited.
- **No execute-time spec edit was made.** `requirements.md`, `design.md` and `tasks.md` are unchanged by this task, so no edit-carry is owed to the next Reviewer brief.
- **`duplicate_of_id` carries no self-FK.** Design §4 types it as a nullable `bigint` and names no constraint; the Implementer's reading is correct and is confirmed here rather than left implicit.
- **The Implementer wrote its report directly into this file.** The four-file scope list did not name `execution.md`, but Orca's dispatch contract carries a `--report-path` and the report is precisely what the brief asked for. Accepted, not treated as a scope breach; the Leader owns this file and has framed the entry.

#### Issues encountered

1. **`npm run migration:scan` is a gate that cannot be invoked.** `package.json` defines it as `node ./scripts/scan-migration-placeholders.js`, and `scripts/` contains only `load-baseline.js`. This is the **same class** as the three gates root `CLAUDE.md` §4.3 already records as unable to go red (`npm run lint`, `npm run build` over spec files, the client's `tsc -p tsconfig.spec.json`). It is **not** T-01's to fix — flagged for `/akili-archive`'s Kaizen step and for the child guide, whose §7 currently points at it.
2. **`migration:generate` cannot run in this checkout** — `orm_metadata` is absent from both the Dev and the scratch database, and generation aborts while reading the generated column `active_primary_alignment` on `result_pool_funding_alignment_sp`. Every later migration task in this spec (there are none, T-01 is the only one) and in sibling specs will hit the same wall. Recorded so the next author does not re-diagnose it.

#### Budget tracking (tripwire, `tasks.md` §5)

| | Budgeted | Actual after T-01 | Running total |
|---|---|---|---|
| Tasks | 10 | 1 closed | 1 / 10 |
| LOC | ≈ 2,970 | **582** (est. was ≈ 380 → **+53 %**) | 582 / 2,970 |
| Review rounds | 3 | 1 | 1 / 3 |

**Not a tripwire event** — the budget binds the total, not a single task. Recorded because the direction matters: `tasks.md` §5 already warns, on the sibling `sync-engine`'s measured actuals (**9,724 LOC against ≈ 2,000 — 1.9× on production code alone**, and 14 review rounds against a budget of 2), that crossing ≈ 2,970 is the **expected** outcome here. At 1.53× on the first task, that projection is holding. The Leader escalates when the total crosses; it does not absorb.

#### Final verification result

**PASS.** Scoped suite green and re-verified by a non-author; full server suite **392 / 3392 green**; `npm run build` exit 0; `npx eslint` clean; the migration applies **and** reverts against the disposable TEST scratch schema with both outputs recorded; both falsifiers observed red then green; Reviewer `PASS` from an independent context on a different model.
