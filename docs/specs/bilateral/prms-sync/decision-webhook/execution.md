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

---

### T-02 — `PrmsNormalizerService`: `registerWebhook` + `getWebhook`

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1**

| Field | Value |
|---|---|
| Implementer | Cursor / `grok-4.7-high` · dispatch `ctx_bc4e0b8ba393` |
| Reviewer | Cursor / `gpt-5.6-sol-xhigh` · dispatch `ctx_b4bfe3900e20` |
| `author ≠ auditor` | **held** — different models. No `REVIEW_WAIVED` record owed |
| runtime events | none |
| Diff | 3 files, **585 insertions** (service +151, spec +383, new DTO +51) |
| Wave | 2 — run concurrently with T-08 (disjoint files, lanes B and C) |

#### Files changed

- `src/domain/tools/prms-normalizer/prms-normalizer.service.ts` (additive)
- `src/domain/tools/prms-normalizer/prms-normalizer.service.spec.ts`
- `src/domain/tools/prms-normalizer/dto/prms-webhook.dto.ts` (new)

#### Evidence re-run — non-author, Step 2.3 (never waived)

Performed by the **Leader**, inline, **after both wave-2 workers reported and their terminals were released**. The measurement was deliberately deferred while T-08's worker was live: T-08's own verification includes `git diff --unified=0 | grep -i secret`, and a `git add -N` taken to extract T-02's diff would have pulled T-02's files into the diff T-08 was auditing for credentials. Root `CLAUDE.md` §4.3 — *measure after the worker reports, never beside it*.

| Command | Implementer reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/tools/prms-normalizer` | 154/154 | **13 suites / 154 tests** green | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint src/domain/tools/prms-normalizer` | exit 0 | exit 0 | **VERIFIED** |

**Result: `VERIFIED`** — no `MISMATCH`, no rework attempt consumed.

**Leader full-suite re-measurement:** `npm test -- --silent` → **393 suites, 3423 tests, 1 snapshot — all passed.** (Wave 2 measured once, covering T-02 and T-08 together.)

#### Falsifiers — both observed red, then green

1. Extra property added to the registration body → `expect(Object.keys(sentBody)).toEqual(['url'])` red.
2. `registered` rewritten as `response.status === 200` → the nothing-registered case (`200` + `{}`) asserts `true` and reddens.

The Reviewer independently judged that **both mutations can genuinely redden for the reason claimed** — it did not take the Implementer's claim on trust (K-004 / KZ-014).

#### Reviewer verdict — `STATUS: PASS`, no `ADVISORY`

The audit confirmed the two points the *Disqualifier* singles out, which is where this task was most likely to produce an inert gate:

- the exactness assertion is `Object.keys(...).toEqual(['url'])`, **not** `toMatchObject({ url })` — the latter cannot detect an extra property and is disqualified for AC.3;
- the body is read off **`httpService.post.mock.calls[0][1]`**, i.e. the stub's *arguments*, not merely asserting that `postRequest` was called. Asserting the call proves dispatch, not payload (KZ-001).

Also confirmed: `registered` derived from emptiness with `200` + `{}` covered; the key re-read per call; `NotFoundException` and empty-key on **distinct** `404`/`503` paths (the JD-5 collapse avoided); PRMS messages preserved; host only from `ARI_PRMS_NORMALIZER_HOST`; new log lines carry only the status — **no credential**.

#### Consumers

`git grep -rn "PrmsNormalizerService" -- src test` → 22 hits at `3978304f`. **Zero call sites modified**; the constructor signature is unchanged. That last point is load-bearing and was briefed as a FAIL condition: `test/result-prms-sync-claim-concurrency.integration-spec.ts:216` casts a stub to this class and `test/prms-sync.e2e-spec.ts:249` spies on `ingest` — **neither tier is run by `npm test`** (P-10). See §4 below for what those tiers actually report.

#### Requirements covered

R-PWH-001 AC.3, AC.4, AC.5 + both scenarios · R-PWH-002 AC.3 · R-PWH-009 AC.1 · NFR-PWH-002.

#### Decisions made

- Effort `grok-4.7-high` (task says `M`). Held at the task's level: the scope is well-specified and additive; the credential handling is reuse of an existing, reviewed pattern rather than new design.
- **No execute-time spec edit.** No edit-carry owed to the next Reviewer brief.
- The brief pointed the Implementer at `ingest` as the exemplar **after the Leader read it** and confirmed it already implements the required `NotFoundException`-propagates / empty-`simple_value`-`503` split. The exemplar was verified before being cited, not assumed correct (KZ-007).

#### Budget tracking

| | Budgeted | T-02 actual | Running total |
|---|---|---|---|
| LOC | ≈ 230 for this task | **585** (**+154 %**) | **1,487 / 2,970** after T-01 + T-02 + T-08 |
| Tasks | 10 | — | 2 closed, 1 in rework |
| Review rounds | 3 | 1 | 3 used |

The overage is test volume, as `tasks.md` §5 predicted: 383 of the 585 lines are the spec. **Review rounds are now at 3 of 3 budgeted with 7 tasks outstanding** — that figure will cross first, ahead of LOC. Recorded, not absorbed.

#### Final verification result

**PASS.** Scoped suite 13/154 green and re-verified by a non-author; full server suite 393/3423 green; build exit 0; eslint clean; both falsifiers observed red then green; Reviewer `PASS` from an independent context on a different model.

---

## 4. Branch-level finding: the `test:e2e` and `test:integration` tiers are RED, and it is not this spec's doing

Recorded here once, at wave 2, so no later task re-diagnoses it. **This is RB-1 materializing** — `tasks.md` §6 predicted exactly this.

### What was measured (Leader, 2026-09-22, tree quiet)

| Tier | Command | Result |
|---|---|---|
| Unit (root config) | `npm test -- --silent` | **393 suites / 3,423 tests — all green** |
| E2E | `npm run test:e2e` | **1 suite failed of 3** — `test/prms-sync.e2e-spec.ts`, 2 tests |
| E2E (T-08's consumer) | `npm run test:e2e -- test/results-ai-formalize-bulk.e2e-spec.ts` | **3 / 3 green** |
| Integration | `npm run test:integration` | multiple failures across T-03 / T-11 / T-13 suites |

The first row against the second is **KZ-017 in the flesh**: `npm test` runs the root config only and invokes none of the other three jest configs (P-10). A check narrower than the claim it backs returns a confident green.

### Causation established by measurement, not by argument

The obvious reasoning — *"T-02 is additive and T-08 only touches `request.url`, so neither can change a gate-reason string or produce a SQL error"* — is reasoning from the change's own frame, which **K-004 / KZ-014 explicitly refuse as evidence**. It was therefore tested:

1. `git stash push -u -m "akili-wave2-probe-1790089228"` — both wave-2 diffs set aside, SHA captured (`39d5927354b3`). *(The stash stack is shared with other worktrees and held four other sessions' entries; the tagged-push / apply-by-SHA / drop-by-retagged-index procedure was used throughout, and no other entry was touched.)*
2. Tree confirmed clean at `3978304f`; `npm run test:e2e -- test/prms-sync.e2e-spec.ts` re-run.
3. **Identical result** — same two tests, same assertions, same messages.
4. `git stash apply 39d5927354b3`, all 11 files restored, entry dropped by re-finding its index from the tag.

**Conclusion: T-02 and T-08 do not cause these failures.**

### Root cause

One cause covers the e2e failure #2 and every failure in T-02's integration consumer: `QueryFailedError: Unknown column 'result_id' in 'where clause'`.

Migration **`1790023167000-replaceResultIdWithOfficialCodeInPrmsSyncLog`** (sibling `sync-engine`, merged on this branch) runs `ALTER TABLE result_prms_sync_log DROP COLUMN result_id`. Confirmed live: the scratch schema's `result_prms_sync_log` has **no `result_id` column**, and `result-prms-sync-log.entity.ts` no longer declares one. But `result-prms-sync-log.repository.ts` still issues `WHERE result_id = ?` against that table.

The remaining e2e failure is a gate-reason string mismatch (`"Innovation Use is gated: …"` vs `"Missing mandatory field 'submitted_by'"`) — also sibling territory, in the sync gate / builders.

### The honest part about T-01

T-01's `migration:test:execute` applied four pending migrations to the scratch schema, **including 1790023167000**, and left them applied. So T-01 **changed the failure mode** of these suites.

It did not introduce the failure. Before T-01 the scratch schema had no `result_prms_sync_log` table **at all** — `grep -ril result_prms_sync_log src/db/baseline/` returns **0**, and the head was `391` while the table's creating migration is `392`. Suites exercising that table could not have passed; they failed on a missing table and now fail on a missing column.

What T-01 *did* do is useful: it revealed that the sibling's own migrations, **when actually applied**, break the sibling's own tests. That finding was unreachable while the scratch schema sat four migrations behind.

### Consequence for this spec

- **T-02 and T-08 are not blocked.** Neither touches `result_prms_sync_log`, and T-08's own e2e consumer is green.
- **T-07 is not blocked either** — checked directly rather than assumed. `LAST_ATTEMPT_SQL` in `result-prms-sync-status.reader.ts` is already migrated: it filters `result_prms_sync_log` by `external_reference` and `result_year`, using `result_id` only as a parameter against the `results` table. P-5 / P-6 / P-8 hold.
- **The defect is in the write-path repository, not the reader**, and it belongs to family child 1 (`sync-engine`, status `pending`). Escalated to the owner; logged as **RB-6** in `tasks.md` §6.

**What this section cannot reach (KZ-017):** it establishes that the wave-2 diffs are not causal and names one root cause covering most failures. It does **not** prove the gate-reason failure shares that cause, and it has not been run against the shared Dev database (deliberately untouched) — only against the disposable scratch schema the e2e tier redirects itself to.

---

## HALT: T-08 — `path-redaction.util.ts` and the five `request.url` read sites

**Status `[~]` · 3 Implementer attempts · 3 Reviewer `FAIL` verdicts · rework ceiling reached 2026-09-22 · escalated to the owner, not auto-advanced.**

| Field | Value |
|---|---|
| Attempt 1 | Cursor / `grok-4.7-xhigh` · `ctx_8d90b7a0986c` |
| Attempt 2 | Cursor / `grok-4.7-xhigh` · `ctx_e6cdb6f605b1` |
| Attempt 3 | Cursor / **`claude-opus-5-thinking-high`** · `ctx_cc61f5905e0c` — tier escalation, **owner-approved** at the attempt-3 gate |
| Reviewer (all three rounds) | Cursor / `gpt-5.6-sol-xhigh` · `ctx_8313fa29bb94`, `ctx_f17b770188b9`, `ctx_fb34ee482f12` |
| `author ≠ auditor` | **held on all three rounds** |
| runtime events | none on any attempt |

### Work preserved — nothing was discarded

The working tree was **not** restored. The full attempt-3 state is preserved three ways before any decision:

| Where | What |
|---|---|
| **branch `akili/t08-halted`** (`f0036aa2`) | all **8** files, durable in git. Recover with `git checkout akili/t08-halted -- server/researchindicators/src/domain/shared` |
| tag `akili-t08-halted-20260922-105615` (`2f39a6cc`) | the 6 tracked files only — `git stash create` does not capture untracked files, so this copy is **incomplete**; prefer the branch |
| session scratchpad | `t08-a3.diff` (879 lines, includes both new files) + copies of the two untracked files |

The shared stash stack was not used and holds only other sessions' entries, untouched.

**Rollback deliberately deferred to the owner.** `/akili-execute` Step 4 prescribes a blanket restore when the tree holds only the halted task's changes, which is the case here. It was not executed, for a reason that is stated rather than assumed: the rule exists so a HALT does not leave **broken** code behind, and this code is not broken — it is green on every gate and closes three confirmed leak vectors that `HEAD` does not close at all. Destroying 714 lines of verified work to satisfy the letter of a rule aimed at a different failure mode is the owner's call, not the Leader's. **No live exposure results from deferring**: T-04, the endpoint that would carry the secret in its path, does not exist yet.

### Attempt-by-attempt history

#### Attempt 1 — Reviewer `FAIL`, 2 issues

Implementer delivered `redactCallbackPath` + the five wrap sites. Scoped suite 44/270 green, build 0, eslint 0.

Reviewer confirmed: all five `request.url` sites wrapped including both logger paths; nothing bound at module load; no envelope or interceptor bypass; `app-microservice.module.ts`, `setup.interceptor.ts`, `jwr.middleware.ts` and the registration order untouched; scope clean; both DC-11 mutations able to redden.

**Issue 1 — case sensitivity.** `/API/PRMS-CALLBACK/segment-k7` reaches the callback because Express builds its router with `caseSensitive: this.enabled('case sensitive routing')`, that setting is false by default and `main.ts` never enables it — while the helper compared case-sensitively. **Leader verified both halves at source before accepting the verdict:** `grep -niE "case.?sensitive" src/main.ts` returns nothing, and the helper used `===` / `startsWith` on the raw string.

**Issue 2 — URL-bearing exception text.** A callback-prefixed URL that misses the route reaches Nest's `registerNotFoundHandler`, whose message is `Cannot POST <full-url>`. `GlobalExceptions` returned it via `errors` and logged the same URL-bearing stack, so the guess leaked despite a redacted `path`. The attempt-1 test substituted a synthetic `Not Found` / `stack-trace`, **which is why its gate could not see the leak** — a test that invents the exception it protects against.

#### Attempt 2 — Reviewer `FAIL`, 1 issue (introduced by the fix)

Both attempt-1 issues **closed and confirmed closed**. Scoped suite 44/284 green (+14 tests), build 0, eslint 0, full suite 393/3,437 green, e2e consumer 3/3.

**Issue — over-redaction.** `redactCallbackDiagnostics` used `value.replace(/\/[^\s]*/g, …)`, consuming from any `/` to the next whitespace, so a delimiter was swallowed into the token and the remainder destroyed:

```
input : {"path":"/api/prms-callback/example","reason":"invalid"}
got   : {"path":"/api/prms-callback
```

That is DC-11's second direction — degrading diagnostics for the **whole application** — and a violation of R-PWH-004 AC.7. *(The Leader had flagged this exact risk in the attempt-2 Reviewer brief, as one of three named regression suspicions; the auditor confirmed it.)*

#### Attempt 3 — Reviewer `FAIL`, 2 issues

Tier escalated to `claude-opus-5-thinking-high` (owner-approved): `grok-4.7-xhigh` is the ceiling of its family, so the rework rule's *"bump effort one level"* could only be honoured by changing tier.

Delivered: the token now stops at the RFC 3986-excluded set plus whitespace, and trailing delimiter punctuation is split off and restored verbatim. **The Implementer also found and closed an under-redaction no Reviewer round had named** — under the old whitespace token, a callback path embedded in a JSON object was invisible to the predicate and leaked.

Scoped suite **44 suites / 288 tests** green, build 0, eslint 0, **full suite 393 / 3,441 green**, e2e consumer 3/3, all five sites wrapped, secret grep clean (5 hits, all variable names).

**Leader probe of the compiled `dist/` output** (asserting on generated output, never on the call sequence — KZ-001):

```
{"path":"/api/prms-callback/example","reason":"invalid"}       -> {"path":"/api/prms-callback","reason":"invalid"}   ✅
Cannot POST /api/prms-callback/guess/extra                     -> Cannot POST /api/prms-callback                      ✅
Cannot POST /API/PRMS-CALLBACK/segment-k7                      -> Cannot POST /api/prms-callback                      ✅
at Object.<anonymous> (/Users/x/node_modules/@nestjs/core/…)    -> unchanged, byte-identical                           ✅
{"path":"/api/results/910150901/prms-sync","reason":"invalid"} -> unchanged, byte-identical                           ✅
redactCallbackPath('/api/prms-callbackers/x')                  -> unchanged (sibling prefix correctly not matched)     ✅
```

**The two issues that stopped it — both reproduced by the Leader against `dist/`, not taken on the Reviewer's word:**

| # | Issue | Leader's reproduction | Reachability |
|---|---|---|---|
| 1 | **Absolute-URL forms are not recognised.** `PATH_TOKEN` consumes `//host/api/prms-callback/<secret>?x=1` as one token and the prefix is never matched | `Cannot POST //host/api/prms-callback/SECRET123?x=1` → **unchanged, full secret** · `failed https://star.ciat.cgiar.org/api/prms-callback/SECRET123` → **unchanged, full secret** | **Unproven.** `request.url` under Express is always origin-form (a path), so none of the five wrapped sites can produce this. It requires some other code to place an absolute callback URL into an exception message or stack. No such path was identified in this spec |
| 2 | **The declared residual is inaccurate.** `[.,;:!?)\]']+` restores a whole **sequence**, not one character, and those bytes are legal in an RFC 3986 segment | `/api/prms-callback/SECRET!!!` → `/api/prms-callback!!!` · `/api/prms-callback/SECRET.,;` → `/api/prms-callback.,;` | **Reachable**, but leaks only trailing delimiter bytes of a guess — never a path segment |

Issue 2 matters beyond its severity: the Implementer declared this residual itself as *"that single low-entropy character"*, and it is **not** a single character. The Leader deliberately handed that declaration to the Reviewer to judge rather than accepting it; the auditor judged it inaccurate and unacceptable, and the Leader's own probe confirms the auditor. **A self-declared residual is a claim, not evidence** (KZ-002 — a criterion discharged by an observation must quote what that observation actually covered).

### Leader's root-cause hypothesis

**Not under-thinking, and not a bad implementer.** The pattern across three rounds is consistent: each attempt fixed what it was told about and exposed an adjacent case in the same function, because **the task's own Falsifier list was incomplete for the mechanism it mandated**.

`tasks.md` T-08 specifies exactly two falsifiers, both about `data.path` in the envelope. Neither can reach an exception **message** or a **stack**, and neither models route case-insensitivity. Yet DD-10 v2 requires redacting the credential wherever it appears. The gate the spec supplied was structurally narrower than the obligation the spec imposed — **KZ-017 in the spec itself**, not in the execution. Each Reviewer round was, in effect, authoring the falsifier the task should have carried; the rework ceiling was reached discovering requirements, not fixing defects.

Supporting evidence: every attempt was green on every mandated gate. `npm test` never went red once across all three rounds. The defects were found only by an independent auditor reasoning about the mechanism.

### What is owed

- **Decision on the two open issues.** Issue 1's reachability is unproven and may be `n/a` for this codebase; Issue 2 is a bounded, declarable residual. Both are candidates for an explicit accepted-risk record rather than more rework — but that is the owner's call, not the Leader's, because both touch a credential (NFR-PWH-002) and requirements §14 makes Security sign-off **required** for this spec.
- **If the work is kept:** `tasks.md` T-08's *Falsifier* and *Done criteria* need amending to carry the cases three review rounds discovered — absolute-URL forms, delimiter sequences, mixed case, and URL-bearing exception text. That is a **spec amendment**, and under `gated` mode it needs owner approval before any further attempt.
- **Ordering constraint stands regardless:** `tasks.md` §1 — *"T-08 must merge before T-04 reaches any deployed environment."* Without the redaction the callback endpoint returns the credential to PRMS in every `2xx` body. **T-04 must not be dispatched while T-08 is `[~]`.**

---

### T-08 — AMENDED task, attempt 1 — **`PASS (degraded-pair)`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts on the amended task: 1 · Reviewer rounds: 1 (8 across the task's whole life)**

This closes the task that HALTed above. The amendment (`c056b253`, owner-approved) is recorded in `tasks.md` T-08 as the `> AMENDED` and `> C-T08` callouts. The attempt counter reset because **the task changed**, not by Leader fiat.

| Field | Value |
|---|---|
| Implementer (main rewrite) | Cursor / `claude-opus-5-thinking-high` · `ctx_841ad727666d` |
| Implementer (micro-fix, `%`) | Cursor / `claude-opus-5-thinking-high` · `ctx_9e9f834f9e84` — **killed mid-command by a provider quota limit** |
| Implementer (falsifier **g**) | Cursor / `grok-4.7-xhigh` · `ctx_d1a64447b62d` |
| Reviewer | **Claude Code / `claude-fable-5-1`** via the project's own `.claude/agents/akili-reviewer.md` wrapper (read-only: `Read`, `Grep`, `Glob`) |
| `author ≠ auditor` | **held** — different model, fresh context, no command access. See the routing record below for why it is not the registry's `opus` |
| runtime events | **provider-limit death ×1** (recovered at ladder rung 4) · **idle-without-report ×1** (recovered by tree probe + artifact recovery) · **Reviewer host exhaustion ×1** (recovered at Reviewer ladder rung 3). **None consumed an attempt** |
| Diff | 8 files, **937 insertions**, 12 deletions |

#### The mechanism that closed it

The amendment's constraint **C-T08** is what made the task solvable. Previous attempts oscillated between leaking bytes and destroying surrounding text because the code had to *guess* where the secret ended inside arbitrary prose. Fixing the credential's alphabet removes the guess:

- `SECRET_CHARS = 'A-Za-z0-9_\-'` — expresses C-T08, the **credential's** grammar.
- `PATH_CHARS = SECRET_CHARS + '/%'` — the **scanner's** reach, deliberately a superset.
- `SEGMENT_END` uses `SECRET_CHARS`, so the sibling route `/api/prms-callbacks/x` is not matched; the discard uses `PATH_CHARS`, so `/guess/extra` is dropped whole.

The Reviewer named the load-bearing invariant better than the brief did: **`SECRET_CHARS ⊆ PATH_CHARS`** — any C-T08-conformant secret is entirely inside the consumed token, so **no byte of a real secret can survive, whatever follows it.**

#### Runtime events, and what they cost

Three, none of which touched the attempt counter (Step 2 *Accounting rule*):

1. **Provider-limit death.** The `%` micro-fix worker was killed by Cursor's monthly Opus limit mid-`eslint`, and its turn ended without `worker_done`. Ladder rung 1's **tree probe** found the edit had landed (`PATH_CHARS` already carried `%`, `SECRET_CHARS` untouched); rung 2's artifact check recovered its `build` and `eslint` logs from `/tmp`. Rung 3 (resume-by-message) was attempted and failed — the model was gone, so the context was unrecoverable. **Rung 4**: a fresh worker on `grok-4.7-xhigh` continued from the partial diff and ran only the one gate that leaves no trace in the tree, falsifier (g).
2. **An unsent report recovered in full.** The main implementer had written a **695-line report to `/tmp/t08/T-08-attempt1-report.md`** and died before mailing it. The verbatim reds quoted below come from that file and its per-falsifier captures, not from a summary. *Workers reliably do the work and unreliably mail it* — the protocol's own words, observed again.
3. **Reviewer host exhaustion.** `gpt-5.6-sol-xhigh` hit the same limit. `gpt-5.3-codex-xhigh` was tried and hit it too, from which this Leader concluded the limit was **account-level, not per-model**. ⚠️ **THAT CONCLUSION WAS FALSE, and it is corrected here rather than quietly fixed.** Re-probed 2026-09-22 after the owner questioned it: `cursor-agent -p` returns normally on **`grok-4.7-high`, `grok-4.7-xhigh` and `composer-2.5`**, while `claude-opus-5-thinking-high`, `gpt-5.6-sol-xhigh`, `gpt-5.3-codex-xhigh`, `claude-sonnet-5-thinking-high` and `gemini-3.7-flash-high` all report the limit. The exhausted pool is Cursor Pro's **included premium-model usage**; non-premium models keep working. **The error was the Leader's, and it is the KZ-017 class this spec exists to catch:** three data points drawn entirely from premium models were generalised to the whole account, and one probe of a non-premium model would have falsified it. It was recorded as a verified finding, and it was used to justify abandoning the owner's chosen Implementer routing (Cursor/Grok) for three subsequent tasks — Grok had been available the whole time. Root `CLAUDE.md`'s *quota is per-model, not per-account* line, which this entry claimed to correct, **stands**. Reviewer ladder rung 3 (*a different model or cross-host dispatch*) was taken. **Rung 4 (waiver) was never reached, and the Leader never audited inline** — that ladder's first line forbids it, and an infrastructure failure does not suspend a correctness constraint.

#### Routing record — why the Reviewer is Fable and not `opus`

The `.claude/agents/akili-reviewer.md` wrapper binds `model: opus`. It was **overridden to `claude-fable-5-1`** because the diff's author was `claude-opus-5-thinking-high`: running the auditor on `opus` would have collapsed the gate to `same-model` and cost the owner an approval for nothing. Fable 5.1 is a current-generation model outside the registry's T3 entry, so this is recorded as **`degraded-pair`** per the Execution Log Format — `author ≠ auditor` is **fully preserved on both axes** (different weights, fresh context), and the `PASS` stands. **The registry entry is stale rather than the choice wrong**, and `docs/model-routing.md` should gain Fable at T3.

#### Falsifiers — seven, each applied independently and observed red

Six mandated by the amended task, plus (g) added by the Implementer for the `%` decision. Suite sizes are from the runs themselves.

| # | Mutation | Red observed |
|---|---|---|
| (a) | redaction removed from the envelope `path` | **2 failed** / 295 |
| (b) | predicate widened to every route | **12 failed** / 295 |
| (c) | comparison made case-sensitive | **8 failed** / 295 |
| (d) | diagnostics sanitization removed | **7 failed** / 295 |
| (e) | token restored to whitespace-bounded | **8 failed** / 295 |
| (f) | path-only predicate (no authority) | **4 failed** / 295, re-run **5 failed** / 297 |
| (g) | `%` removed from `PATH_CHARS` | red on `body.errors`, verbatim: `Cannot POST /api/prms-callback%2Fdef%2Fghi` |

Final state after restoring all seven: **297 passed**, then **300 passed** once (g)'s tests landed.

**(e) verbatim — it reproduces the attempt-2 regression exactly, which is what makes it a real gate:**

```
● redactCallbackDiagnostics › (e) keeps every delimiter around a callback path it truncates
  Expected: "{\"path\":\"/api/prms-callback\",\"reason\":\"invalid\"}"
  Received: "{\"path\":\"/api/prms-callback"
● redactCallbackDiagnostics › (e) leaves a non-callback token byte-for-byte intact around delimiters
  Expected: "{\"path\":\"/api/results/99\",\"callback\":\"/api/prms-callback\"}"
  Received: "{\"path\":\"/api/results/99\",\"callback\":\"/api/prms-callback"
```

#### Evidence re-run — non-author, Step 2.3 (never waived)

Leader-inline, after every worker reported and its terminal was released.

| Command | Reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/shared` | 300/300 | **44 suites / 300 tests** green | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint <paths>` | exit 0 | exit 0 | **VERIFIED** |
| five `request.url` sites | all wrapped | **all wrapped, none bare** | **VERIFIED** |
| secret hygiene | no literal value | only variable names; the one assigned value is the placeholder `'configured-after-import'` | **VERIFIED** |

**Leader full-suite re-measurement:** `npm test -- --silent` → **393 suites, 3,453 tests — all passed.**
**Leader e2e:** `npm run test:e2e -- test/results-ai-formalize-bulk.e2e-spec.ts` → **3/3 green.** This discharges the Done criterion that no worker could: it runs under a jest config `npm test` never invokes (P-10).

**Leader probe of the compiled `dist/`** (asserting on generated output, never on the call sequence — KZ-001). Eleven cases; the four that must **not** change came back byte-identical, including the two traps — the sibling route `GET /api/prms-callbacks/list failed` and the mid-path embed `/api/results/compare/api/prms-callback/x`. And `redactCallbackPath('/api/prms-callback/abc%2Fdef')` → `/api/prms-callback`, which is why **all five wrapped sites are immune** to the `%` class entirely.

#### Reviewer verdict — `STATUS: PASS`

All five prior findings closed **at the mechanism level, not patched around**. Scope exactly the 8 permitted files; no literal credential.

**The round's open judgement call, and the Reviewer's ruling.** The (g) worker disclosed that the assertion on the first `_error` logger argument *passed green but never executed as red*, because Jest stopped at the first failing `expect` in that test. The Leader handed this over unresolved and asked for reasoning, not a ruling. The Reviewer ruled it **acceptable, not a K-004 violation**, on grounds the Leader accepts and records:

> K-004 targets gates that *structurally cannot* redden. This one can: the identical assertion shape was **observed red** in falsifier (d), whose **first** redaction assertion is the `loggedStack` one — no earlier `expect` can pre-empt it. The `_error` first-argument site is therefore independently proven live and reddenable. What rests on composition is only *"the `%` behaviour also reaches the logger stack"*, and **both factors were each observed red**.

#### `ADVISORY` — recorded, never gating

| Lens | Finding | Reviewer's own reachability check |
|---|---|---|
| RELIABILITY | `global.exception.ts` redacts `rawErrors` only when it is a `string`; a `ValidationPipe` `BadRequestException` carries `response.message` as `string[]` and passes through unredacted | **Could not construct a reaching payload** — the secret is in the path, not the body, and the callback parses leniently and never returns `400`. Cheap hardening: map the array |
| RISK | `response.interceptor.ts` logs `res?.stack` (`:72`) and copies `res.message` into `errors` (`:64`) without sanitization. Not one of the five enumerated sites | **Could not construct one** — thrown exceptions bypass this `map`; it would need a handler *returning* an error-shaped object whose stack embeds the callback URL. No such code exists |
| READABILITY | Split the (g) percent test into two `it()`s mirroring the (d) pair, so the logger assertion is first in its own test | Smallest change that would make it independently falsifiable |
| SECURITY (util-declared) | A **percent-encoded guess** is no longer a residual — the `%` micro-fix closed it. The remaining declared behaviour is that a query string survives in diagnostics (`…/prms-callback/SECRET?x=1` → `…/prms-callback?x=1`), which is safe **because the credential is a path segment** and `redactCallbackPath` drops the query at all five wrapped sites. **If a future variant moves the secret into the query string, this needs revisiting** | Declared in the util's own comments, not claimed away |

Both reachability findings are the right shape: a finding whose author states *"I could not construct a reaching payload"* is more useful than one that asserts a leak it cannot demonstrate.

#### Requirements covered

R-PWH-004 AC.4, AC.7 · NFR-PWH-002 · DC-11 (both directions).

#### Decisions made

- **Execute-time spec edits**, all owner-approved at the amendment gate and carried into this Reviewer's brief: `tasks.md` T-08 (`> AMENDED`, `> C-T08`, six falsifiers, Done criteria, `Effort` M→L, LOC 240→750); `requirements.md` DC-11 widened from two assertions to six; `design.md` §*Verification* row updated to match. The **requirement's meaning is unchanged** — only its gate was made adequate to it, which is why this is an edit and not a Pivot.
- **The `%` scanner widening was the Leader's call, correctly escalated by the Implementer.** It declined to change `PATH_CHARS` because it believed that changed C-T08. It does not: C-T08 governs the **credential's** grammar, `PATH_CHARS` the **scanner's** reach, and a scanner may consume a superset provided it consumes nothing that is ordinary sentence punctuation. `%` is not; `.` `,` `;` `:` are, and adding those is what destroyed surrounding text at attempt 2.
- **A defect in this Leader's own brief, found by a worker and recorded rather than quietly fixed:** the mandated secret-hygiene gate `git diff --unified=0 | grep -niE "…secret"` **could not fail**, because both util files are untracked and `git diff` cannot see them. It returned a confident zero. Replaced with a form that covers untracked paths. This is the same class as the three gates root `CLAUDE.md` §4.3 already records — **authored by the Leader, in a brief whose whole subject was falsifiability.**

#### Budget tracking

| | Budgeted | Actual | Running total |
|---|---|---|---|
| LOC (T-08) | ≈ 750 after the amendment (≈ 240 before) | **937** | **2,104 measured across T-01, T-02, T-08** |
| Review rounds | 3 for the whole spec | **8 on T-08 alone** | **8 / 3 — crossed, escalated at the amendment gate** |

#### Final verification result

**PASS (degraded-pair: `claude-opus-5-thinking-high` / `claude-fable-5-1`).** Scoped suite 44/300 green and re-verified by a non-author; full server suite **393 / 3,453** green; e2e envelope-path consumer 3/3; build exit 0; eslint clean; all five `request.url` sites wrapped; seven falsifiers observed red then green; Reviewer `PASS` from an independent context on a different model with no command access.

## REVIEW_WAIVED: T-08

Written because the auditor ran outside the registry's T3 entry. **The gate was not lost — only its registry conformance.**

| Field | Content |
|---|---|
| `flag` | **`degraded-pair`** |
| cause | Cursor Pro's **included premium-model** usage exhausted (resets 2026-10-15), confirmed against `claude-opus-5-thinking-high`, `gpt-5.6-sol-xhigh` and `gpt-5.3-codex-xhigh`. *(This row originally read "account-wide". **Corrected 2026-09-22** — non-premium models were never exhausted; see the correction in the T-08 HALT record above. The waiver itself stands: every model at the registry's **T3 auditor** tier was unavailable, which is what forced the cross-host dispatch.)* Reviewer ladder climbed: rung 1 retry → rung 3 different model / cross-host. **Rung 4 (waiver of the review itself) was never reached; the Leader never audited inline** |
| approved by | Not required — the review **happened**, on an independent context and a different model. This record exists so the metric stays honest, not because a gate was skipped. The owner is nonetheless informed at the continue gate (`gated` mode) |
| verification that stood in | Nothing stood in. Full Reviewer audit performed, plus the Leader's non-author evidence re-run and an eleven-case `dist/` probe |
| models | Implementer `claude-opus-5-thinking-high` (+ `grok-4.7-xhigh` for falsifier (g)) / Reviewer **`claude-fable-5-1`**, read-only (`Read`, `Grep`, `Glob`) |

**This is not a `REVIEW_SKIPPED`.** No predicate proved a review was never owed; one was owed, and one was performed.

---

### T-03 — Registration surface: module, controller, service, route, env var, Swagger — **`PASS`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 2 · Reviewer rounds: 2**

| Field | Value |
|---|---|
| Implementer (attempt 1) | Claude Code / `akili-implementer` → **Sonnet 5** (T2, registry-conformant) |
| Implementer (attempt 2) | Claude Code / `akili-implementer` → **Fable 5.1** — effort bumped one rung per the rework rule |
| Reviewer (both rounds) | Claude Code / `akili-reviewer` → **Opus 5**, read-only (`Read`, `Grep`, `Glob`) |
| `author ≠ auditor` | **held on both rounds, at the registry's tiers** — no `degraded-pair` record owed. the exhaustion of Cursor's **premium-model** pool forced the host change (*originally written "account-wide" — **corrected 2026-09-22**, see the T-08 HALT record*); the native wrappers restored registry conformance that T-08 had lost |
| runtime events | none |
| Diff | 13 files, **879 insertions** |

#### P-14b settled before dispatch — the spec's only `UNVERIFIED` premise

T-03's first bullet requires settling P-14b *before* anything is built on it. The **Leader** did it as the Step 2.1 pre-check, by reading the table directly rather than through the TTL-cached service:

```
SELECT is_active, CASE WHEN simple_value IS NULL THEN 'NULL'
                       WHEN simple_value = '' THEN 'EMPTY'
                       ELSE CONCAT('POPULATED len=', LENGTH(simple_value)) END
FROM app_config WHERE `key` = 'ARI_CLARISA_API_KEY';
  -> row present · is_active = 1 · POPULATED len=47
```

The value itself was never printed. So on TEST **neither** failure mode this premise was open about is reachable: not the `404` (missing/inactive row), not the `503` (present but empty). RB-3's TEST half is closed; **the PROD half stays `UNVERIFIED` and moves to T-10** with OQ-6 / R-1 — this checkout has no PROD access, and saying otherwise would be the KZ-017 failure the spec keeps naming.

**This relieved the code of nothing**, and the brief said so: a premise being healthy *today* does not prove the code handles it *correctly*. Both branches were still required, each with its own test.

#### Attempt 1 — Reviewer `FAIL`: the registration log line wrote the secret

One issue, and it is the spec's own defect class reappearing three tasks later.

**The callback URL *is* the credential.** `.env.example`, written by this same task, documents it: *"The trailing segment is the path secret configured separately in `ARI_PRMS_WEBHOOK_SECRET`."* And `attemptLine` emitted `url=${url ?? 'unset'}` verbatim, on **both** the success `_log` and the failure `_warn` paths. Every registration attempt wrote the secret into the application log — violating R-PWH-001 AC.6, NFR-PWH-002, design §9 and §10, and T-03's own Done criterion.

**The test did not merely miss it — it certified it.** The `_log` assertion was `toContain('url=' + callbackUrl)`, where `callbackUrl` ends in `/secret`. And the only secrecy assertions in the file were `not.toContain('x-api-key')` / `not.toContain('apikey')` — **structurally unable to fail**, because the API key never enters this service at all: it is read and attached entirely inside `PrmsNormalizerService` (T-02), a jest mock here. Two assertions that look like security hygiene and evaluate nothing.

**Leader verified all three claims at source before accepting the verdict** — the `.env.example` wording, the template at `:109`, and the assertion set. The finding is correct.

#### Attempt 2 — the fix, and the red that could only be taken once

One import and one call site: `url=${url ? redactCallbackPath(url) : 'unset'}` in `attemptLine`, which both paths route through. Plus the `attemptLine` docstring, which had claimed the secret is *"never passed into this helper"* — the false belief that produced the leak — rewritten to state that the URL **is** the credential.

The fix cost one line because **T-08 had already built and audited the helper**, and its absolute-URL handling (added for T-08's own falsifier (f)) is exactly what was needed here.

**The red was taken against the pre-fix tree, before the fix existed** — the brief required that ordering, because that red is obtainable exactly once and is worth more than one manufactured by re-breaking a fix:

```
● logs the attempt … never a key or a secret (AC.6)
  Expected substring: not "/secret"
  Received string: "… url=https://star.example.org/api/prms-callback/secret message=…"
● logs a warn line (still no key/secret) and rethrows on failure …
  Expected substring: not "/secret"
  Received string: "… url=https://star.example.org/api/prms-callback/secret message=\"Config not found\" …"
Tests: 2 failed, 8 passed, 10 total
```

Green after the fix: 10/10.

#### Evidence re-run — non-author, Step 2.3 (never waived)

| Command | Reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/entities/prms-webhook src/domain/routes src/domain/entities/entities.module.spec.ts` | 53/53 | **7 suites / 53 tests** green | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint <touched paths>` | exit 0 | exit 0 | **VERIFIED** |
| Scope | 13 files | matches `git status --porcelain` exactly | **VERIFIED** |

**Leader full-suite re-measurement:** **396 suites, 3,482 tests — all passed** (up from 393 / 3,453; +3 suites, +29 tests).

**Leader probe of the compiled helper against the REAL registered-URL shape**, not the test placeholder (KZ-001 — assert on generated output):

```
redactCallbackPath('https://main-allianceindicatorstest.ciat.cgiar.org/api/prms-callback/a3f8SECRETVAL')
  -> 'https://main-allianceindicatorstest.ciat.cgiar.org/api/prms-callback'   includes the secret? false
```

§10's *"the URL registered"* field survives with host and route intact, minus the credential.

#### Reviewer verdict — `STATUS: PASS`

> The leak is closed at the single formatting site … `registerWebhook` is still asserted to receive the **unredacted** `callbackUrl`, so redaction did not leak into what is actually registered with PRMS.

That last clause is the check the Leader had not thought to ask for: the fix must redact the **log**, not the value sent to PRMS. It does.

**The Reviewer also corrected the Leader's framing of its own question.** The Leader asked whether `toContain('url=https://…/api/prms-callback')` was inert, since it passes against the leaking line. The ruling:

> it is not inert: it reddens on **over**-redaction (a "fix" that dropped the URL, or emitted `unset`), which is the other way §10's "URL registered" field can be lost. So the pair covers both directions, one each.

Neither the Leader nor the Implementer had seen that. Recorded because it is the more accurate reading.

#### Rulings on the three Implementer disclosures

| # | Disclosure | Reviewer's ruling |
|---|---|---|
| a | The scoped test count did **not** grow — assertions were replaced inside two existing `it` blocks rather than a new case added | **Acceptable.** Both new assertions were observed red individually with distinct failure output, so evidence is attributable without a separate block |
| b | The `_warn` test was widened beyond the brief's literal step, which named only `_log` | **Required, not optional.** NFR-PWH-002 is unconditional, the falsifier unredacts both paths, and the failure line is the one an operator actually reads. *"A brief step narrower than the requirement does not narrow the requirement"* |
| c | The `x-api-key` / `apikey` assertions were kept, with a code comment stating they cannot redden here | **The right call.** They are inert only under the current data flow — they **would** redden if a later edit passed key material into `attemptLine`. That makes them a regression tripwire rather than evidence, and the comment says exactly that. *"Deleting them would remove a cheap guard; leaving them undocumented would have been the actual error"* |

The 401 deferral and the `entities.module.spec.ts` scope addition were both ruled on in round 1 and stand: **401** is only e2e-provable and T-04's falsifier already carries it, so `[~]` is the honest mark; **the module-graph assertion** is justified and would genuinely redden, since it reads the decorator's literal `imports` array — and `src/CLAUDE.md` §4 records this exact gap shipping twice over four silent `404`s.

#### `ADVISORY` — recorded, never gating

| Lens | Finding | Disposition |
|---|---|---|
| RELIABILITY | `not.toContain('/secret')` is coupled to the fixture's literal trailing segment. Rename it and the gate goes **vacuously true against a leaking line, silently.** Robust form: `not.toContain(callbackUrl)` | **Recorded, not applied.** The gate demonstrably reddened in the tree under review, which is the standard. Acting on it here would widen a task to absorb an advisory — the one thing the methodology forbids outright, and for the right reason: advisories are the least-vetted findings in a run |
| RISK — **constructible** | `redactCallbackPath` anchors the prefix immediately after the authority, so a URL carrying a **path prefix ahead of** `/api/prms-callback` (reverse proxy, path-rewriting gateway) is logged whole. `redactCallbackDiagnostics` misses it too | **Verified by the Leader against the compiled helper** — see **RB-7** in `tasks.md` §6. Not T-03's to fix; it is T-08's helper, and it is reachable through T-03's new log path only if an operator configures such a URL |
| OBSERVABILITY | On a PRMS refusal the warn line always prints `requestId=none` — T-02's exception carries only `message`, dropping the trace id §10 names | Outside this task's file list. Carried to the family owner |
| RISK (carried from round 1) | `prms-webhook.module.ts` plans to host the callback controller, but `RouterModule` stamps **one** `MODULE_PATH` per module — two route entries on one module cannot yield two disjoint prefixes (DD-3) | **Carried to T-04**, which mounts `prms-callback`. Verify before mounting, or give the callback its own module |

#### Requirements covered

R-PWH-001 AC.1, AC.2, AC.6, AC.7 · R-PWH-002 AC.1, AC.2, AC.4 · R-PWH-009 AC.2, AC.3, AC.5 (URL half) · NFR-PWH-003.

#### Decisions made

- **Effort bumped Sonnet 5 → Fable 5.1 for attempt 2**, per the rework rule. Reviewer stayed Opus 5, so `author ≠ auditor` held on both rounds.
- **Host change, forced — but on a premise that was partly wrong.** Cursor's **premium-model** pool was exhausted (three premium models confirmed during T-08); the Leader generalised that to the whole account, which was **false** — `grok-4.7-*` and `composer-2.5` were available throughout. The project's own `.claude/agents/` wrappers were used instead, which happens to be the registry-conformant routing, so T-03 closes with no waiver record where T-08 needed one. **But the owner's chosen Implementer (Cursor/Grok) was available and was not used**, for T-03 and T-05, on the strength of a conclusion the Leader had recorded as verified. Corrected 2026-09-22 after the owner asked why work had stopped going to Cursor; routing returns to Cursor/Grok for the Implementer from T-06.
- **`POST` returns `200`, not `201`.** R-PWH-001 AC.1 accepts either; `200` matches PRMS's own upsert convention and the `GET`. Reviewer confirmed internal consistency: `ResponseInterceptor` sets the wire status from the envelope, and Swagger, controller and tests all agree.
- **No execute-time spec edit in this task.** The `design.md` / `tasks.md` changes committed alongside it are the **P-14b settlement**, which records a measurement rather than changing a requirement.

#### Budget tracking

| | Budgeted | T-03 actual | Running total |
|---|---|---|---|
| LOC | ≈ 350 | **879** (**+151 %**) | **2,983 measured across T-01, T-02, T-03, T-08** |
| Review rounds | 3 for the whole spec | 2 | **10 / 3 — crossed at T-08, escalated then** |

#### Final verification result

**PASS.** Scoped suite 7/53 green and re-verified by a non-author; full server suite **396 / 3,482** green; build exit 0; eslint clean; the falsifier red taken against the pre-fix tree on both log paths; the helper probed against the real URL shape; Reviewer `PASS` from an independent read-only context on a different model at the registry's tier.

---

### T-05 — Delivery repository: dedupe transaction, retry, history queries — **`PASS`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1**

| Field | Value |
|---|---|
| Implementer | Claude Code / `akili-implementer` → **Fable 5.1** — escalated from the wrapper's Sonnet 5 because the *Effort dial* classes concurrency as `xhigh`, and the tier↔effort rule escalates the tier rather than maxing a cheaper one |
| Reviewer | Claude Code / `akili-reviewer` → **Opus 5**, read-only |
| `author ≠ auditor` | **held on both axes**, at the registry's T3 for the auditor |
| runtime events | none |
| Diff | 2 new files, **922 lines** (292 production, 615 spec, 20 tests) |
| Skills assigned | `nestjs-expert`, `systematic-debugging`, **`tdd`** |

**Why `tdd` here and nowhere else in this spec so far.** The Disqualifier's four dedupe cases *are* the test design — same id twice, different ids with identical bodies, a `NULL` id, a **second** `NULL` id. Writing them first and watching them fail is a different act from writing the repository and retrofitting assertions onto it. The Leader assigned it for that reason and recorded the reason; `tdd` is overhead on copy or config work and was not assigned elsewhere.

#### Falsifiers — four, and one sharper than the task required

| # | Mutation | Red observed |
|---|---|---|
| (a) | dedupe branch deleted | **5 failed / 20** — AC.1 returns `kind: 'recorded'` where `'duplicate'` was expected |
| (b) | retry removed | **5 failed / 20** — including `toHaveBeenCalledTimes(2)` receiving `1` |
| **(b′)** | **errno set narrowed to `[1213]` alone → exactly the two 1205 tests red. Narrowed to `[1205]` alone → exactly the 1213 tests red** | **the task asked for one test per code; this proves each code's test depends on its own code being in the set, rather than the two covering for each other** |
| (c) | dedupe keyed on the body hash | **2 failed / 20** — AC.5 returns `'duplicate'` where `'recorded'` was expected |
| (d) | an `UPDATE prms_webhook_delivery` line appended | **1 failed** — the AC.7 append-only tripwire |

**The Implementer discarded two of its own reds as invalid**, unprompted: an early failure was `mock.calls[1]` undefined — a *setup* error, not a behavioural assertion — and it says so explicitly rather than counting it. It also found one of its own tests vacuous on the stub (a loop over zero calls) and pinned it with `toHaveBeenCalledTimes(2)` **before** implementing. That is the Disqualifier's discipline applied to its own work.

#### Evidence re-run — non-author, Step 2.3

| Command | Reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/entities/prms-webhook` | 66/66 | **6 suites / 66 tests** green | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint .../repositories` | exit 0 | exit 0 | **VERIFIED** |
| Scope | 2 new files | `git status --porcelain` shows only the new `repositories/` directory | **VERIFIED** |

**Leader full-suite re-measurement: 397 suites, 3,502 tests — all passed** (up from 396 / 3,482).

**Leader read the shipped source directly** rather than trusting the report: `:203-204` carry `WHERE delivery_id = ? AND duplicate_of_id IS NULL` / `FOR UPDATE` — design §6.3 step 3 verbatim — and `:18` is `RETRYABLE_LOCK_ERRNOS = new Set([1205, 1213])`, **both** codes. An earlier draft of this spec named only 1213 and its own review caught it.

#### Reviewer verdict — `STATUS: PASS`

The audit went beyond the brief in one respect worth recording: it **checked the INSERT's column list against migration `1790086170692`** and confirmed every column exists and that `created_at` / `updated_at` / `is_active` carry DB defaults, so the raw INSERT is runnable — *"a property the mocked harness structurally cannot prove."* That is the auditor closing a gap the tier leaves open, which is what an independent auditor is for.

It also judged the falsifiers mechanically, not on trust: the fake table **decodes the emitted SQL**, so keying the dedupe on the body genuinely changes what it returns — AC.5 reddens on the fake's own filter, not on a mock expectation.

**(4) The NULL-id skip — ruled correct and safe.** The Implementer skips the `FOR UPDATE` read entirely for a `NULL` delivery id rather than binding `NULL` into the query. The Reviewer: *"It makes AC.4 structural rather than dependent on `WHERE delivery_id = NULL` returning empty, and the absent gap lock costs nothing: a NULL id can never be a duplicate of anything, so there is no invariant to serialise. A concurrent non-NULL `FOR UPDATE` on an empty range can still gap-block the NULL insert, but that surfaces as 1205/1213 and is covered by the retry."*

**(b) `DUPLICATE` rows resting at `RECEIVED` — acceptable.** It is the only legal value at insert, inventing a fourth would exceed the design's vocabulary, and a duplicate is already discriminable by `duplicate_of_id IS NOT NULL`.

**(c) The AC.7 text tripwire — adequate, and not the inert-gate class.** The Leader asked whether grepping the shipped source for `UPDATE prms_webhook_delivery` is real evidence. The ruling: it is **not what carries AC.7**. The behavioural proof is `expect(sql).toHaveLength(2)` / `toHaveLength(1)` plus the pinned call counts, which enumerate every statement the three public methods emit. The text test is a regression tripwire on the real artifact, *"and its false-positive direction is red, not green."*

#### Execute-time spec edit — `tasks.md` T-05 and T-06, mutability

**The task text was narrower than the design it implements, and would have blocked T-06.** T-05 and T-06 both say `processing_state` and `result_id` are the **only** mutable columns. The Implementer flagged the tension and **declined to decide it**; the Reviewer ruled, citing source; the Leader verified all three citations before accepting:

- `requirements.md:259` — AC.7: *"No code path updates a stored row's decision, justification, `decided_at`, or raw body after insert. **(The row's processing state may change; its content may not.)**"* — AC.7 enumerates **content** columns and explicitly permits state change.
- `design.md:233` (§6.4 step 5) — *"One row → `CORRELATED`, write `result_id`, `processing_state = PROCESSED`."* — the correlator **does** write `correlation_outcome` after insert.
- `design.md:162` — the `processing_state` vocabulary `RECEIVED → PROCESSED | PROCESSING_FAILED` is specified in §4, but **§3.1 assigns it no file**.

`correlation_outcome` is therefore a **third mutable column**, by the design's own text. The tasks' line is amended to say so. **This changes no requirement's meaning** — it removes a contradiction between a task and the design it implements, which is an execute-time edit, not a Pivot. **Carried as a named conformance check into T-06's Reviewer brief.**

#### Open item the Leader must place before T-06 — not decided here

**The `processing_state` vocabulary has no home.** T-01 built `DeliveryCorrelationOutcome` for `correlation_outcome` but nothing for `processing_state`; T-05 exports a lone const `DELIVERY_PROCESSING_STATE_RECEIVED`, and T-06 will need `PROCESSED` and `PROCESSING_FAILED`. The Reviewer's placement: *"a sibling `enum/delivery-processing-state.enum.ts`, with the const retired in the same edit — two vocabularies is the failure mode."*

Adding that file is a **scope addition to T-06**, whose *Files touched* names only `delivery-correlator.service.ts` and its spec. Under `gated` mode that is the owner's call, and it is raised at the continue gate rather than absorbed.

#### `ADVISORY` — recorded, never gating

| Lens | Finding |
|---|---|
| RELIABILITY (reachable today) | The AC.7 tripwire greps for `UPDATE prms_webhook_delivery` but **cannot see `manager.update(...)`, `.save(...)` or `createQueryBuilder().update()`**. Add those patterns |
| RISK (reachable, certain) | T-06 writes `result_id` / `processing_state` / `correlation_outcome`. §3.1 assigns that write to the correlator, so the tripwire holds — but if T-06 instead adds an update method **here**, narrow the tripwire to the content columns rather than delete it |
| RISK (reachable only via NG-4) | Duplicates rest at `RECEIVED` forever; a future sweeper must exclude `duplicate_of_id IS NOT NULL`. One line in design §4 closes it |

#### Methodological finding — a sweep the Leader supplied was structurally blind

The Implementer reported that `git grep -rn "PrmsWebhookDeliveryRepository" -- src test` returns 0 hits **but cannot see untracked files**, so the sweep the Leader handed it was blind to the very files under review. Same class as the `git diff | grep` secret-hygiene gate the Leader wrote for T-08, which returned a confident zero for the same reason. **Two Leader-authored gates in one spec, both unable to fail, both caught by workers.**

#### Requirements covered

R-PWH-006 AC.1, AC.2, AC.4, AC.5, AC.6, AC.7 · R-PWH-005 AC.7, AC.8 · R-PWH-003 AC.5 · NFR-PWH-001.

#### Budget tracking

| | Budgeted | T-05 actual | Running total |
|---|---|---|---|
| LOC | ≈ 360 | **922** (**+156 %**) | **3,905 measured across T-01, T-02, T-03, T-05, T-08** |
| Review rounds | 3 for the whole spec | 1 | **11 / 3** |

#### Final verification result

**PASS.** Scoped suite 6/66 green and re-verified by a non-author; full server suite **397 / 3,502** green; build exit 0; eslint clean; four falsifiers observed red then green, one of them sharper than the task required; the shipped SQL read directly by the Leader; Reviewer `PASS` from an independent read-only context on a different model at the registry's tier.

---

### T-06 — `DeliveryCorrelator`: resolve the live result and apply the verdict — **`PASS`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1**

| Field | Value |
|---|---|
| Implementer | **Cursor / `grok-4.7-xhigh`** · dispatch `ctx_414243a20984` — the owner's chosen routing, restored after the quota error was corrected |
| Reviewer | Claude Code / `akili-reviewer` → **Opus 5**, read-only |
| `author ≠ auditor` | **held on both axes and across hosts** |
| runtime events | none |
| Diff | 6 files, **861 insertions** — 4 new, plus **6 lines** across T-05's repository and spec |

This is the spec's most silent defect class (**DC-1**): a verdict landing on a snapshot row is *valid data in the wrong row* — nothing downstream notices, no test fails, no log complains.

#### Pre-checks run by the Leader before dispatch

- **P-3 re-verified at HEAD `b2b2233d`.** T-06 is *anchored* by it — if STAR's outbound `external_reference` were not `String(result_official_code)`, the task is discarded outright. `common-fields.builder.ts:421-426` still resolves exactly. **RB-1 requires this re-run at each task's own start commit**, because the sibling `sync-engine` has already invalidated five Premise Ledger citations mid-review once.
- **The live-row convention re-verified** at `results.util.ts:38-46`: all four predicates are the repo's own convention, not this spec's invention.
- **The untouchable sweep:** `git grep -rln "is_synced_to_prms\|prms_result_code\|prms_phase_id" -- src` → **31 files**, every one of which this task must leave untouched.

#### Evidence re-run — non-author, Step 2.3

| Command | Reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/entities/prms-webhook` | 89/89 | **8 suites / 89 tests** green (from 6/66) | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint src/domain/entities/prms-webhook` | exit 0 | exit 0 | **VERIFIED** |

**Leader full-suite re-measurement: 399 suites, 3,525 tests — all passed** (from 397 / 3,502).

**Leader read the shipped source directly:**

```sql
WHERE platform_code = '${ReportingPlatformEnum.STAR}'
  AND result_official_code = ?
  AND is_active = TRUE
  AND is_snapshot = FALSE
```

Four predicates, all joined by `AND` — **not** the `OR` precedence trap the Disqualifier warns about — and `platform_code` a literal from the enum. `grep -nE "UPDATE results|INSERT INTO results|resultsRepo|\.save\(|\.update\("` over the service returns **nothing**: no write path to `results` exists in the file.

**Scope verified by diffing T-05's two files in full**, not by trusting the report: the only change is the enum import, the deletion of `DELIVERY_PROCESSING_STATE_RECEIVED` plus its doc comment, and one usage swap. **Six lines.** The Reviewer independently confirmed **zero remaining references repo-wide** — one vocabulary survives, which is the whole point of the addition.

#### Reviewer verdict — `STATUS: PASS`

The audit judged the falsifiers **mechanically, not on trust**, which is what the brief asked for:

> (a) Dropping `is_snapshot = FALSE` leaves rows `{10, 40}`; `ORDER BY result_id ASC` makes 10 first, so the AC.1 `winner(...)` lookup fails on `is_snapshot: false`, the SQL-text regex fails, and `expect(warn).not.toHaveBeenCalled()` fails — **three assertion-level reds, no fixture-setup error.** (b) Dropping `platform_code` leaves `{20, 40}` … the fake's placeholder/param count still balances, so it reddens on the assertion, not on a parse throw. (c) A `dataSource.query('UPDATE results …')` is captured by `table.writes`; a `getRepository(...).update` is captured by the `resultsWriter` mock. **Both reachable forms are covered.**

That last clause matters: the AC.3 gate would be worth little if it caught only one of the two ways this codebase can write to a table.

#### Rulings on the three judgement calls

**(a) `platform_code` interpolated as a template literal — acceptable, no finding, with a condition.** The value is a TypeScript enum member resolved at module load and never request-derived, so there is no injection surface; `design.md:231` §6.4 step 3 itself writes `platform_code = 'STAR'` as a literal; and a literal is what makes the Done criterion *"all four predicates present in the emitted query, asserted on the SQL text"* assertable at all. The service's own comment supplies a second reason — binding it would shift the `?` ordinal for the official code. **The ruling is conditional: if a future task parameterises the platform by input, it must bind.**

**(b) The ambiguity `warn`, and whether *"take the first"* is deterministic.** Both fields are present (`external_reference=1441061`, `2 live rows matched`), satisfying design §10 and R-PWH-007 AC.4. And determinism does **not** rest on the result set's natural order: `LIVE_ROW_SQL` ends `ORDER BY result_id ASC`, and **the test proves the ordering is load-bearing** by `unshift`-ing id 50 ahead of id 40 and still expecting 40. A test that would pass identically with or without the `ORDER BY` would have proved nothing here.

**(c) The Leader's own `tasks.md` amendment — confirmed faithful, and better argued than the Leader argued it.** This was handed over deliberately: the Leader edited the spec after T-05's ruling and then dispatched T-06 to build on that edit, so nobody had audited it. The Reviewer's grounds:

> `requirements.md:259` AC.7 enumerates exactly four protected columns — decision, justification, `decided_at`, raw body — and `correlation_outcome` is **not among them**; its parenthetical explicitly permits state change. `design.md:233` §6.4 step 5 reads *"One row → `CORRELATED`, write `result_id`, `processing_state = PROCESSED`"*, and steps 1/2/4 likewise assign `NO_REFERENCE`/`UNKNOWN_REFERENCE` to this detached step — **outcomes that are unknowable at insert time** (§6.3 step 3 can only classify shape and duplication). The amendment removes a task/design contradiction; it changes no requirement's meaning.

The *"unknowable at insert time"* argument is the decisive one and the Leader had not made it.

#### `ADVISORY` — recorded, never gating

| Lens | Finding | Disposition |
|---|---|---|
| **RISK** | **`finish()` overwrites `correlation_outcome` unconditionally**, so calling `correlate` on a `MALFORMED` row would replace it with `NO_REFERENCE`. `design.md:226` already exempts `DUPLICATE` but says nothing about `MALFORMED` | **Reachable only through T-09**, which does not exist. **Carried as a named gate into T-09's brief** — T-09 owns which rows reach the detached step |
| RELIABILITY | `MARK_FAILED_SQL` writes `processing_state` only; the `processing_error` column (design §4) stays null, so a failure reason survives **only in logs** | Recorded; the column exists and is unused |
| RISK | `Number.isSafeInteger` and `Number(rows[0].result_id)` both cap at 2^53−1 on `bigint` columns | **"Could not construct a reachable payload"** — live official codes are 7 digits and `result_id` is a low auto-increment |
| READABILITY | `classifyReference`'s `typeof !== 'string'` branch is unreachable under its own signature | Recorded |

#### Requirements covered

R-PWH-007 (all ACs) · R-PWH-005 AC.1, AC.2 · R-PWH-008 AC.5 (correlation branch) · R-PWH-003 (the detached step) · NFR-PWH-003.

#### Decisions made

- **Routing restored to the owner's choice.** Implementer back on Cursor / `grok-4.7-xhigh` after the Leader's false account-wide-quota conclusion was corrected. `xhigh` because DC-1 is correctness-critical and silent.
- **The `enum/delivery-processing-state.enum.ts` addition was owner-approved** at T-05's continue gate, with the T-05 const retired in the same edit. Design §4 fixed the vocabulary but §3.1 assigned it no file — the gap was found by T-05's Implementer, ruled real by T-05's Reviewer, and placed by the owner.
- **No execute-time spec edit in this task.** The mutability amendment belongs to T-05's close and was carried into this Reviewer's brief as a named conformance check, where it was confirmed.

#### Budget tracking

| | Budgeted | T-06 actual | Running total |
|---|---|---|---|
| LOC | ≈ 310 | **861** (**+178 %**) | **4,766 measured across T-01, T-02, T-03, T-05, T-06, T-08** |
| Review rounds | 3 for the whole spec | 1 | **12 / 3** |

#### Final verification result

**PASS.** Scoped suite 8/89 green and re-verified by a non-author; full server suite **399 / 3,525** green; build exit 0; eslint clean; three falsifiers observed red on their own assertions and independently judged reachable by the auditor; the four-predicate SQL and the absence of any `results` write read directly from the shipped source; Reviewer `PASS` from an independent read-only context on a different model at the registry's tier.

---

### T-07 — Reader: the additive `last_decision` field — **`PASS`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1**

| Field | Value |
|---|---|
| Implementer | **Cursor / `grok-4.7-high`** · dispatch `ctx_e28da5e727e7` |
| Reviewer | Claude Code / `akili-reviewer` → **Opus 5**, read-only |
| `author ≠ auditor` | **held on both axes and across hosts** |
| runtime events | none |
| Diff | 3 files, **374 lines**, **zero deletions anywhere** |

`Effort` held at `high` rather than escalated: the task is sized `S`, its scope is one additive field, and its gates are mechanical rather than deep. Escalating every task empties the dial of meaning.

#### The Leader captured the AC.4 baseline **before** dispatch

T-07's *Red run* requires the pre-edit baseline to exist before the first edit, and its *Disqualifier* states that an AC.4 assertion written afterwards from the new code's own output *"proves self-consistency and nothing else."* Rather than trust the ordering to the worker, the Leader captured it at `HEAD 6540e33f`: pristine copies of all three files into the session scratchpad, plus the existing spec green at **1 suite / 8 tests**.

#### A Leader-authored gate that gave a FALSE ALARM — recorded, not quietly fixed

The Leader also hashed the two protected blocks with an `awk` range, and on re-measurement **both hashes had moved**. That was **wrong, and the fault was in the gate**: each symbol (`LAST_ATTEMPT_SQL`, `deriveSyncState`) appears **twice** in the file — declaration and usage — so `awk`'s range operator opened a *second* range at the second occurrence and swept up the file's tail, which had grown. The gate was measuring the end of the file, not the block.

Re-measured correctly, by extracting each block between exact delimiters and comparing against the pristine copy:

```
LAST_ATTEMPT_SQL   -> IDENTICAL, 556 chars both sides
deriveSyncState    -> IDENTICAL, 372 chars both sides
diff baseline vs current: 0 deleted or modified lines — purely additive
```

**This is the third Leader-authored gate in this spec that did not measure what it claimed.** The others: the `git diff --unified=0 | grep` secret-hygiene check in T-08, blind to untracked files; and the `git grep` consumer sweep handed to T-05, blind for the same reason. All three failed in the **safe** direction — a false alarm or a false zero that a worker caught — but the pattern is the point, not the luck: **a Leader's gate is the one no Reviewer audits.** The Reviewer for this task was therefore handed the corrected measurement *and told explicitly it was not obliged to accept it.*

#### Evidence re-run — non-author, Step 2.3

| Command | Reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/entities/result-prms-sync` | green | **8 suites / 99 tests** green | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint src/domain/entities/result-prms-sync` | exit 0 | exit 0 | **VERIFIED** |
| Deletions in the reader | — | **0** | **VERIFIED** |
| Deletions in the DTO | — | **0** | **VERIFIED** |
| `git status --porcelain client` | untouched | **empty** | **VERIFIED** |

**Leader full-suite re-measurement: 399 suites, 3,528 tests — all passed.**

#### Reviewer verdict — `STATUS: PASS`, and it re-derived the Leader's claim

> I re-derived the protected-block claim myself rather than accepting it: baseline `:11-31` vs current `:12-32` (`LAST_ATTEMPT_SQL`) and baseline `:67-81` vs current `:83-97` (`deriveSyncState`) are **character-for-character identical**, and **`RESULT_STATUS_SQL` and `mapLastAttempt` are untouched too.**

Those last two were not in the Leader's check at all — the auditor widened the protected set on its own judgement.

**On the Disqualifier, the check that decides this task.** The Reviewer verified at source that the new test's `baselineLastAttempt` **reproduces the pre-edit fixture value for value** — *"an independently authored literal, not a re-serialisation of new output."* And that `sync_state` and `last_attempt` are asserted **separately**, with `last_decision` absent from that test entirely, so a `sync_state` regression is isolable. That is precisely the trap the Disqualifier names, checked rather than assumed.

**On falsifier credibility**, it found the non-obvious one: the spec's `projectDeliveries` helper **only sorts when the emitted SQL actually contains `ORDER BY decided_at DESC`**, so dropping the clause returns the earlier `APPROVE` and reddens. *"The ordering assertion is not decorative."*

#### Rulings on the three judgement calls

**(a) The cross-package mirror — CONFIRMED, and closed by structure rather than by inspection.** `client/.../prms-sync.interface.ts` holds only `PrmsSyncOutcome` and `PrmsSyncResponse { outcome, attempt_number, http_status, request_id, prms_result_code, failure_reason }` — a field-for-field mirror of the server's **`PrmsSyncResponseDto`**, the sync **POST** contract. It has no `sync_state` and no `last_attempt`, so it does not model this GET at all; `last_decision` hangs off `PrmsSyncStatusDto` and **cannot reach that file by any path**. No client edit was owed, and the empty `git status --porcelain client` is consistent with that rather than merely with restraint.

**(b) Exporting `mapLastDecision` — justified.** The file already exports `mapLastAttempt` and `deriveSyncState` as free functions and the pre-existing spec imports both directly. *"Withholding it would make the new mapper the only untestable-in-isolation one of three."*

**(c) Type looseness — faithful, and keep it.** The Leader suspected `decision: string | null` should have been `'APPROVE' | 'REJECT'`. The ruling refuses that, with the better argument:

> `decision` is `varchar(20) nullable` on the entity and is already typed `string | null` on the write path, populated **verbatim** from PRMS. A `'APPROVE' | 'REJECT'` union on the read side would be an **unenforced cast asserting a constraint no validator applies** — it would lie at runtime the first time PRMS sends a third verb. The enum lives where it belongs: in `@ApiProperty({ enum: ['APPROVE','REJECT'] })`.

A narrower type would have looked like rigour and been a latent lie. Recorded because the Leader would have asked for the union.

#### `ADVISORY` — recorded, never gating

| Lens | Finding |
|---|---|
| READABILITY | `@ApiProperty` on `decision` and `delivery_received_at` omits `nullable: true` though both types carry `| null`; Swagger under-documents nullability. Cosmetic, and it mirrors the existing `created_at` treatment |
| RELIABILITY | A `CORRELATED` row with a NULL `decision`/`decided_at` yields an object with null members rather than `last_decision: null`. **Reachable** — the correlator sets `CORRELATED` independently of the ingest-time decision parse. Faithful to design §6.5's wording, so not an issue here; **worth a line in the future UI spec** (OQ-5's sequel) |
| RISK | `query.mockResolvedValue([])` in `beforeEach` makes unstubbed calls return `[]` rather than throwing, slightly weakening the spec's strictness. Necessary for the third query |

#### Requirements covered

R-PWH-008 (all ACs) · NFR-PWH-005.

#### Decisions made

- **No execute-time spec edit.** None was needed.
- **The consumer sweep was re-run before dispatch** per RB-1 (the sibling `sync-engine` is in flight and has moved this file once): **7 files**, matching the task's record at `170da206` exactly.
- **`last_decision` is fed by its own query**, never by `LAST_ATTEMPT_SQL`. A verdict and an outbound attempt are different events — conflating them is the family's R-F1 failure, and DD-9 exists to prevent it.

#### Budget tracking

| | Budgeted | T-07 actual | Running total |
|---|---|---|---|
| LOC | ≈ 250 | **374** (**+50 %**) | **5,140 measured across T-01, T-02, T-03, T-05, T-06, T-07, T-08** |
| Review rounds | 3 for the whole spec | 1 | **13 / 3** |

The smallest overrun of any task in this spec, and the only one under 2×.

#### Final verification result

**PASS.** Scoped suite 8/99 green and re-verified by a non-author; full server suite **399 / 3,528** green; build exit 0; eslint clean; zero deletions in any file; `client/` untouched; both protected blocks proven byte-identical **twice — once by a corrected Leader measurement and once independently by the auditor**; both falsifiers observed red and independently judged reachable; Reviewer `PASS` from an independent read-only context on a different model at the registry's tier.

---

### T-09 — `PrmsWebhookDeliveryService`: classify, store, acknowledge, detach — **`PASS`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1**

| Field | Value |
|---|---|
| Implementer | **Cursor / `grok-4.7-xhigh`** · dispatch `ctx_79fde6f1570b` |
| Reviewer | Claude Code / `akili-reviewer` → **Opus 5**, read-only |
| `author ≠ auditor` | **held on both axes and across hosts** |
| runtime events | none |
| Diff | 2 new files, **946 lines** |

**DC-6 is the class this task exists to avoid, and the spec names its own blind spot**: *this defect is invisible to any gate that uses the wrong stub.*

#### Evidence re-run — non-author, Step 2.3

| Command | Reported | Leader re-run | Verdict |
|---|---|---|---|
| `npm test -- --silent -- src/domain/entities/prms-webhook` | 111/111 | **9 suites / 111 tests** green (from 8/89) | **VERIFIED** |
| `npm run build` | exit 0 | exit 0 | **VERIFIED** |
| `npx eslint src/domain/entities/prms-webhook` | exit 0 | exit 0 | **VERIFIED** |

**Leader full-suite re-measurement: 400 suites, 3,550 tests — all passed** (from 399 / 3,528).

Leader read the shipped source: `correlate(...)` invoked at `:336` **without `await`**, detached at `:353` with `void correlation.then(...)`; the `MALFORMED` predicate at `:325` with its rationale at `:311`; `environmentLabel()` at `:385` documenting that it reuses the existing `ARI_IS_PRODUCTION` discriminator rather than inventing a second.

#### Reviewer verdict — `STATUS: PASS`

**The Disqualifier check, done at source rather than from the diff — this is the check that decides the task.** A synchronous or resolved stub makes the awaited and the detached implementations indistinguishable, so AC.2 would pass either way and prove nothing.

> `prms-webhook-delivery.service.spec.ts:171` is `correlate.mockReturnValue(new Promise(() => {}))` inside the AC.2 `it`, with a 1000 ms timeout at `:183`. **The executor body is empty — no `resolve`, no `reject`, no closure capture. It never settles.**

Two things the auditor added that were not asked for:

- **`:177-182` pins `correlate` to exactly one call with the exact payload**, so *"never called at all"* cannot pass the same test. Without that, a service that simply dropped the correlator would be indistinguishable from one that detached it correctly.
- **The *other* stub at `:195-206` is deliberately RESOLVED, and that is correct** — it must model `finish()`'s write, not defer. The auditor discriminated between two stubs with opposite jobs instead of applying one rule to both.

#### Rulings on the three judgement calls

**(a) Does `void ... .then()` genuinely detach?** Yes. It is the **two-argument** form `then(onFulfilled, onRejected)`, so a correlator rejection is consumed by `onRejected` and cannot reach `unhandledRejection`; synchronous throws are caught one level earlier in `beginCorrelation`'s `try`. The auditor then found the **one surviving window** — a throw *inside* `onFulfilled`, which the two-arg form does not route to `onRejected` — **and tried to build it**: it would need the correlator to resolve `undefined`, which its return type forbids on every branch. *"Could not construct a production path."* A finding that states its own failed attempt is worth more than one that asserts a leak it cannot demonstrate.

**(b) Is the `2xx` produced after the row exists?** Yes. `await this.repository.recordDelivery(...)` at `:782` precedes every other statement; the acknowledgement is constructed only at `:808`/`:822`. And `:141-163` **proves** it by withholding the repository promise and observing the handler stay unsettled. The detached call is *initiated* before the return — inherent to fire-and-forget, and not an await — and `correlate`'s synchronous prologue is pure up to its first query, so nothing blocks the acknowledgement.

**(c) Is `MALFORMED` reachable on both paths AC.3 names?** Structurally-wrong-but-valid JSON: yes, four covered cases (missing `decision`, bad `decided_at`, `'APPROVED'`, `'approve'`), plus non-object bodies. **The syntactically unparseable body is structurally outside this service** — and that is a real finding, carried to T-04. See below.

#### The carried gate from T-06 — settled, and the design is the thing that is wrong

Skipping the detached step for `MALFORMED` is **correct, not a shortcut**. The auditor's reasoning:

> `finish()` writes `correlation_outcome` unconditionally (`delivery-correlator.service.ts:203`), so a malformed row carrying a reference would be rewritten `CORRELATED` with `decision = NULL` — **which R-PWH-008's read surface treats as a verdict.**

That is the consequence neither T-06 nor the Leader had traced: the reclassification would not merely lose a label, it would manufacture a phantom verdict visible through `last_decision`. Falsifier (d) proves the predicate behaviourally.

**`design.md` §6.3:226 exempts only `DUPLICATE` and should name `MALFORMED` too** — recorded as an advisory rather than edited, because widening a design exemption is not a Leader-inline edit and T-09's rationale comment is the correct artifact for now.

#### Two gates carried into T-04 — both real, both recorded in `tasks.md` T-04

1. **An unparseable JSON body never reaches this service.** `input.body` is already parsed, and Express's JSON parser would emit a **`400` before the handler runs** — which **NFR-PWH-005 forbids** (*the endpoint does not fail the caller for its own reasons*). Constructible: `Content-Type: application/json` with body `{`. T-09's lenient classification cannot help, because it is never reached. **T-04 owns the body-parser configuration.**
2. **`raw_headers` is stored exactly as given, and the "no secret among them" rule is a comment, not a type.** **T-04 must pass an allowlist, never `req.headers`** — the callback secret is in the path, but headers are the other place a credential can arrive, and NFR-PWH-002 is unconditional.

#### `ADVISORY` — recorded, never gating

| Lens | Finding |
|---|---|
| RELIABILITY | A correlator that **never settles logs nothing** — the single NFR-PWH-003 line is emitted only inside the `.then` handlers. **Reachable** via a stalled `dataSource.query` in `finish()`. Consider a settle-or-log fallback |
| READABILITY | `design.md` §6.3:226 exempts only `DUPLICATE`; widen it to name `MALFORMED` so the next reader does not read the predicate as drift |
| RELIABILITY | A non-object body discards the payload (`raw_body: null`) because T-05 types it `Record<string, unknown> \| null`. **Reachable** with body `[]`. Mild NFR-PWH-004 tension, owned upstream |

#### Requirements covered

R-PWH-003 AC.1–AC.4 · R-PWH-005 AC.3, AC.4, AC.5 (write path), AC.6 · R-PWH-006 AC.3 · R-PWH-009 AC.4 · NFR-PWH-001, NFR-PWH-003, NFR-PWH-005.

#### Decisions made

- **No execute-time spec edit.** The `MALFORMED` exemption lives as a code rationale plus a recorded advisory; widening design §6.3 is a spec change and was not taken unilaterally.
- Effort `xhigh`: store-then-acknowledge is what PRMS actually depends on, and the defect class is invisible to a wrong gate.

#### Budget tracking

| | Budgeted | T-09 actual | Running total |
|---|---|---|---|
| LOC | ≈ 340 | **946** (**+178 %**) | **6,086 measured across eight closed tasks** |
| Review rounds | 3 for the whole spec | 1 | **14 / 3** |

#### Final verification result

**PASS.** Scoped suite 9/111 green and re-verified by a non-author; full server suite **400 / 3,550** green; build exit 0; eslint clean; the AC.2 stub read at source and confirmed non-settling; four falsifiers observed red, (a) by **timeout** as the class requires; the carried gate from T-06 settled with its own falsifier; Reviewer `PASS` from an independent read-only context on a different model at the registry's tier.

---

### T-04 — Callback edge: controller, guard, `JwtMiddleware` exclusion, non-stubbing e2e harness — **`PASS`**

**Final status: `PASS` · date 2026-09-22 · Implementer attempts: 1 · Reviewer rounds: 1 (`lenses` — security)**

| Field | Value |
|---|---|
| Implementer | **Cursor / `grok-4.7-xhigh`** · dispatch `ctx_2b7420860683` |
| Reviewer | Claude Code / `akili-reviewer` → **Opus 5**, read-only, security lens |
| `author ≠ auditor` | **held on both axes and across hosts** |
| runtime events | none |
| Diff | 15 files, **1,125 lines** |

**The application's first public, unauthenticated write endpoint.** The guard is the entire security boundary.

#### The spec's highest structural risk — closed, not substituted

**P-17 / DD-11:** the repo's existing e2e suites stub `JwtMiddleware.prototype.use`, and under that stub **AC.2 passes vacuously and AC.3 cannot redden at all** — the tokenless case yields `403`, never `401`. The task's one forbidden outcome was silently falling back to that pattern.

**Verified twice, independently.** The Leader checked the untracked file separately, because `git grep` cannot see it — the lesson from T-05. The Reviewer then re-derived it and widened the search:

> `JwtMiddleware.prototype` appears in `test/` at exactly two pre-existing sites. A separate grep over the untracked `test/prms-webhook.e2e-spec.ts` for `JwtMiddleware|overrideProvider|forRoutes|exclude(` returns **zero matches** — **the suite names the middleware nowhere at all.** DD-11's harness was built, not substituted; its AC.2/AC.3 evidence counts.

**T-04's own e2e suite: `PASS`, 7/7**, running the real `JwtMiddleware`.

#### Evidence re-run — non-author, Step 2.3

| Command | Leader re-run | Verdict |
|---|---|---|
| `npm run test:e2e -- test/prms-webhook.e2e-spec.ts` | **1 suite / 7 tests PASS** | **VERIFIED** |
| `npm test -- --silent` | **403 suites / 3,569 tests** green (from 400 / 3,550) | **VERIFIED** |
| `npm run build` | exit 0 | **VERIFIED** |
| `npx eslint <touched paths>` | exit 0 | **VERIFIED** |

**Security-critical pieces read at source by the Leader:** the exclusion at `app.module.ts:106` is `path: 'prms-callback(.*)'` with `RequestMethod.ALL`, **no leading slash**; the guard compares lengths at `:35` **before** `timingSafeEqual` at `:38`, with an unset/empty guard at `:27-28`; `.env.example:47` is `# ARI_PRMS_WEBHOOK_SECRET=` — commented, **no value**; headers pass through a named `PRMS_CALLBACK_RAW_HEADER_ALLOWLIST`.

#### The e2e tier is red for THREE distinct causes, and only one is a defect

This was measured, not assumed, because T-04 modifies `app.module.ts` — which **every** e2e suite boots, making it a legitimate suspect.

| Cause | Evidence | Whose |
|---|---|---|
| T-04's own suite | **GREEN, 7/7** | — |
| A pre-existing sibling defect | `result_prms_sync_log.result_id` dropped by `sync-engine`'s migration while its repository still queries it, plus a `submitted_by` gate-reason mismatch | **RB-6**, established earlier by stashing an unrelated diff and reproducing |
| **ENVIRONMENTAL, new this session** | **The Dev database `192.168.20.210:3306` became UNREACHABLE** mid-session (`nc` times out); the scratch container `127.0.0.1:3307` is up. Suites redirecting to scratch still run; suites on the default CORE datasource — including `results-ai-formalize-bulk.e2e-spec.ts`, **green earlier today** — now fail `connect ETIMEDOUT` | **Not a code defect at all.** The Leader reached Dev this morning for the P-14b probe; the connection dropped between then and now |

The Reviewer was given this table with an explicit instruction not to charge T-04 for the second or third. Without it, a reasonable auditor would have failed the task for someone else's defects and a dropped network link.

#### Reviewer verdict — `STATUS: PASS`, security lens

**Fail-open analysis — four candidate paths, all closed.** (1) Guard absent for a handler: class-level `@UseGuards`, one handler, no per-route override — not reachable. (2) Unset/empty secret: refused **before any Buffer allocation**. (3) Empty path segment: `:secret` cannot match it, and the guard would refuse anyway — double-closed. (4) **Prefix confusion**: `/api/prms-callback%2f..`, `…/../prms-webhook` and uppercase paths each traced — *"the exclusion regex and the router consume the **same** raw path, so anything the exclusion over-matches has no route and 404s."* And `process.env` is read **per request**, so there is no K-016 cache window and rotation needs no restart.

**Credential in output — none.** The guard logs only `remoteAddress` and the constant route prefix, never `request.url` or `params.secret`. `raw_headers` is an allowlist of three, so **`referer` / `origin` — the realistic carriers of a URL containing the secret — cannot reach the row.** The envelope `path` is redacted by T-08 and asserted on **both** the `200` and `404` branches.

**Auth-boundary scope — tight in both directions.** `prms-callback(.*)` over-matches `/api/prms-callbackXYZ`, but no route exists there so it exempts nothing. No other exclusion can reach `prms-callback`, and this exclusion cannot reach `prms-webhook` — which is the entire point of DD-3 / P-13.

#### Rulings on the three scope additions

| # | Addition | Ruling |
|---|---|---|
| a | `prms-webhook-callback.module.ts` (new) | **Correct and necessary.** `RouterModule` stamps one `MODULE_PATH` per class, so two disjoint prefixes need two classes. This is the question the Leader carried in from T-03's review, and the answer is the one the brief anticipated |
| b | `lenient-callback-json.ts` + spec (new) | **Defensible shape.** The only alternatives were `bodyParser: false` app-wide or accepting the `400`. Scoped by an anchored `^/api/prms-callback(?:/\|$)` regex with a negative test for `/api/prms-callbacks`, and it **fails loudly at boot** (throws on 0 wraps) rather than silently. Affects no other route |
| c | `app.module.spec.ts`, `prms-webhook.module.spec.ts` (modified siblings) | Accepted — the exclusion-array assertion has to live somewhere, and this is the same class as T-03's `entities.module.spec.ts` addition that this auditor already ruled justified |

#### `ADVISORY` — one of these is serious enough to name in the risks log

| Lens | Finding | Disposition |
|---|---|---|
| **RISK — reachable, high value** | **No unit-tier assertion pins `@UseGuards(CallbackSecretGuard)` to the controller.** Deleting that one line leaves `npm test` **fully green with the public write endpoint open**. *"The exclusion array already has exactly this protection; the guard binding does not."* Fix is one line: `expect(Reflect.getMetadata('__guards__', PrmsWebhookCallbackController)).toContain(CallbackSecretGuard)` | **Recorded as RB-8. Not applied** — acting on it would widen a task to absorb an advisory, which is the one thing the methodology forbids outright. Raised to the owner at the continue gate |
| RELIABILITY | The empty-secret falsifier **reddens, but not by the claimed mechanism**: it fires via the unit assertion `callbackSecretsMatch('','') === false`, not a route-level `404→200`. Dropping the unset check makes `Buffer.from(undefined)` throw — a `500`. *"The gate is real; the stated mechanism is not."* | A correction to the Implementer's claim, recorded rather than restated |
| OBSERVABILITY | The guard's `source_ip` is `socket.remoteAddress` only; `jwr.middleware.ts:69` — this repo's own precedent — prefers `x-forwarded-for`. Behind the CIAT proxy, §10's *"source IP"* will log the proxy | Carried to T-10's rollout note |
| RESILIENCE | `/api` is hardcoded in `isPrmsCallbackPath` **and** in `path-redaction.util.ts`. A global-prefix change silently reverts the callback to `400`. Also, production wraps `main.ts`'s 50 MB parser while the e2e wraps Nest's default 100 kB — **the suite cannot observe a large-payload difference** | Recorded; the second half is a genuine KZ-017 scope limit of the harness |

**A correction to the Reviewer, in both directions.** Its reversion challenge says the only gate that reddens on a deleted `@UseGuards` is *"an e2e suite `npm test` does not run and which cannot run today at all."* The first half is right; **the second is not** — T-04's own suite redirects to the scratch schema and ran **7/7 green**. The accurate statement is narrower and still worth acting on: the binding **is** gated, but **only at a tier `npm test` never invokes**.

#### Requirements covered

R-PWH-004 AC.1, AC.2, AC.3, AC.5, AC.6, AC.8 · R-PWH-009 AC.5 (secret variable) · R-PWH-003 (the HTTP edge) · NFR-PWH-002, NFR-PWH-005.

#### Budget tracking

| | Budgeted | T-04 actual | Running total |
|---|---|---|---|
| LOC | ≈ 450 | **1,125** (**+150 %**) | **7,211 measured across nine closed tasks** |
| Review rounds | 3 for the whole spec | 1 | **15 / 3** |

#### Final verification result

**PASS.** T-04's e2e suite 7/7 green on a **non-stubbing** harness, verified independently twice; unit tier **403 / 3,569** green; build exit 0; eslint clean; four falsifiers observed red including the exclusion swap breaking **both** AC.2 and AC.3 simultaneously; the guard's fail-open surface enumerated and closed on all four paths; Reviewer `PASS` on a security lens from an independent read-only context on a different model at the registry's tier.

---

## Pivot Record: T-01 — the table is a synchronization HISTORY, not a delivery log

**Date 2026-09-23 · raised by the owner · approved by the owner · `/akili-execute` Error Handling & Pivot Protocol**

### The blocker

The owner supplied the UI mock this spec's history was always meant to feed (OQ-5's sequel, deliberately sequenced after this child). Reading it against the built schema surfaced a premise failure, not an implementation error:

**The mock's timeline holds four rows from TWO different event classes.**

| Mock row | Event class | Where it lives today |
|---|---|---|
| "First synchronization" · Mariana Acosta **(PI)** | **STAR's outbound push** | `result_prms_sync_log` |
| "Mapping re-synced after rejection" · Mariana Acosta | **STAR's outbound push** | `result_prms_sync_log` |
| "PRMS returned the mapping" · Lucía Fernández | **PRMS's inbound decision** | `prms_webhook_delivery` |
| "PRMS approved the mapping" · Daniel Okoth | **PRMS's inbound decision** | `prms_webhook_delivery` |

`prms_webhook_delivery` was designed on the premise *"every delivery PRMS sends us is recorded"* (**R-PWH-005**). A `Pending Review` row is **not a delivery** — PRMS never sends it. It is STAR's own event, written from STAR's own data at the moment a push succeeds.

**Owner's decision, stated explicitly: one table, not two.** The history must be a single query.

### What was considered, and rejected

**Read the history as a UNION of the two tables.** The Leader's initial recommendation, and it was wrong for the owner's purpose. Every field is already present — `result_prms_sync_log.created_by` **is** populated (`result-prms-sync.service.ts:131` reads `currentUser.user_id`; the repository writes it on every insert), and `sec_users` carries `first_name` / `last_name`, so *"Mariana Acosta"* is reachable today. **The data exists; only the reader is missing.** The owner nonetheless chose one table, and that is a product decision about how this history is owned and read, not a data-availability question. Recorded as considered and declined.

### The revised direction

**The table becomes the synchronization history, and is renamed to say so.**

| Change | Why now |
|---|---|
| `prms_webhook_delivery` → **`result_prms_sync_history`** | The migration is **not applied anywhere but the disposable scratch schema**, so the rename is free today and expensive after the first Dev apply. A name that lies about its contents is a defect this spec has already paid for twice |
| `received_at` → **`occurred_at`** | An outbound push is not *received*. Same type, same `NOT NULL` |

**The three `NOT NULL` columns survive without relaxing** — which was the Leader's main doubt when pricing this, and it resolved better than expected:

- `correlation_outcome` = `CORRELATED` for an outbound row. **Honest**: a push knows exactly which result it is about.
- `processing_state` = `PROCESSED`. The event is complete at write time.
- `environment` — both directions have it.

**Seven columns added, all nullable except the discriminator:**

| Column | Type | For |
|---|---|---|
| `event_source` | `varchar(10) NOT NULL` | `'STAR'` \| `'PRMS'` — which side generated the row |
| `status` | `varchar(30) NULL` | `'PENDING_REVIEW'` \| `'APPROVED'` \| `'REJECTED'` — the mock's badge |
| `actor_user_id` | `bigint NULL` | **Outbound only.** Our user → `sec_users`. An **id**, because this person exists in our system and a stored name would freeze on rename |
| `reviewer_name` | `varchar(255) NULL` | **Inbound only.** "Daniel Okoth". **Name only, no id** — this person does not exist in our system. The PRMS contract's own vocabulary is *"Reviewer's reason"*, so `reviewer_*` is consistent |
| `reviewer_role` | `varchar(191) NULL` | "SP02 Science Program reviewer" — the label as sent, for display |
| `science_program_code` | `varchar(20) NULL` | "SP02". **Deliberately separate from the role string**: the role is display, the code is data — filterable, and joinable to CLARISA later without parsing prose |
| `changes` | `json NULL` | The mock's "See what changed" payload |

**No column is removed.** Of the **23** columns T-01 shipped, 22 are untouched and one is renamed; the amended table resolves to **30** columns. *(Corrected 2026-09-23 during T-01b's evidence re-run — this record first said "24 / 23", a Leader off-by-one. Deriving command: `git show HEAD:server/researchindicators/src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable.ts` counted 23 column lines in the original `CREATE TABLE`; the post-change count was read from `information_schema.columns`, which returned 30. This figure has ONE home — this line — per KZ-005.)*

### Design decisions taken with the owner, recorded here because they are not derivable from the schema

1. **`decided_at` drives the timeline; `occurred_at` is our audit.** Ordering is `COALESCE(decided_at, occurred_at)` — outbound rows and `MALFORMED` rows have no `decided_at`. The owner's reasoning: *"en teoría apenas se acepte se debería mandar a nosotros, entonces si se demora mucho es un problema, pero de eso no hablaremos — eso es problema de PRMS."* The gap between the two columns remains **measurable** without being acted on, which is a side benefit worth keeping.
2. **A row is written only on a FAVOURABLE push.** A failed push (`AUTH_FAILED`, `TRANSPORT_FAILED`, `RETRYABLE`, `REFUSED_BY_STAR`) writes **nothing** here — *"para eso está la otra tabla de logs que se encarga de registrar esos errores."*
3. **One row per successful push attempt**, not per result. A re-sync after rejection is its own timeline entry, exactly as the mock shows.
4. **Nothing updates; only new events are appended.** The badge on the 28 Aug row still reads `PENDING_REVIEW` after the 11 Sep approval, because this is a timeline of events, not a current-state view.
5. **The history write must never fail the push.** If the push succeeded and the history insert throws, the error is caught and logged at `error` — failing a successful sync over a UI row would be strictly worse. Same discipline T-09 already applies to the detached correlator.
6. **Outbound rows bypass the dedupe transaction.** T-05's `SELECT … FOR UPDATE` exists for PRMS's `delivery_id`, which an outbound row does not have. Running it would take gap locks on the push's critical path and protect nothing. A separate plain-`INSERT` method.
7. **Duplicates are stored and filtered at read.** `duplicate_of_id IS NULL` — the requirement to record every delivery stands, and the UI stays clean. This is already T-07's behaviour. *(Leader default; surfaced to the owner and not contradicted.)*
8. **`status` is stored rather than derived.** It is derivable from `event_source` + `decision`, but the table is append-only, the value is fixed at write time, the read stays a plain `SELECT`, and a future PRMS verdict the current code cannot map will still render what was recorded.

### Blast radius — measured at `HEAD 8ebc3117`, not estimated

```
git grep -rln "prms_webhook_delivery" -- src test   ->  12 files
git grep -rln "received_at"           -- src test   ->  11 files
```

The rename reaches **T-05's repository, T-06's correlator, T-07's reader, T-09's service and T-04's e2e suite** — five closed tasks. None needs a behavioural change; all need the identifier updated, and their specs assert on the literal SQL text, so the specs move with them.

### Requirement impact

**R-PWH-005's premise widens.** *"Every delivery PRMS sends is recorded"* remains true and unchanged. What is new is that the table also records STAR's own successful pushes — rows that are **not** deliveries. The requirement is not contradicted; its table now has a second, clearly discriminated population. **`event_source` is what keeps the two legible**, and every existing query that means *"deliveries"* must filter on it.

### Branch state re-verified before planning — RB-1 did not fire

The owner updated the branch mid-discussion (`8ebc3117`, merging `AC-1441-US5-Push-Results-into-the-PRMS`). The Leader re-checked rather than assuming: the merge brought **14 files, all under `client/research-indicators/`**. No server file moved, the sync service is unchanged since `c3f10b44`, and the migration is intact and still unapplied outside the scratch schema.

### The write point, located

`result-prms-sync.service.ts`, immediately after `settleAttempt(...)` (~`:251`) and before the return, conditional on `interpreted.outcome === PrmsSyncOutcome.ACCEPTED`. Everything a `Pending Review` row needs is already in scope there: `resultId`, `userId`, `claim.attemptNumber`, `claim.resultOfficialCode`, `externalReference`, `interpreted.prmsResultCode`, `interpreted.prmsPhaseId`, `interpreted.requestId`, `environment`.

**This file belongs to the sibling `sync-engine` (family child 1, status `pending`).** The change is **one guarded call**, and it is the minimum that satisfies the owner's decision — the alternatives were a backfill that duplicates data, or an event bus that still requires the same single line.

### Tasks

- **T-01 is REOPENED as T-01b** — rename, column rename, seven additions, and the rename propagated across the twelve files.
- **T-11 is NEW** — the outbound `PENDING_REVIEW` write.

Both are recorded in `tasks.md`. **No work has been dispatched for either; this record precedes execution, as the protocol requires.**

---

## T-01b — Rename the table to `result_prms_sync_history`, rename `received_at`, add the seven history columns

| Field | Value |
|---|---|
| **Final status** | **`PASS`** (dual-lens, both independent) |
| Date | 2026-09-23 |
| Implementer attempts | **1** |
| Start commit | `57267b4f` (tree clean) |
| Implementer | `akili-implementer` · **Claude Sonnet** (T2) · effort `xhigh` |
| Reviewers | `akili-reviewer` ×2 · **Claude Opus** (T3) — reliability lens + risk/resilience lens, spawned in parallel per the 4R table (task touches a migration) |
| `author ≠ auditor` | **holds** on both axes (fresh context *and* different weights). No `REVIEW_WAIVED` owed |
| runtime events | **none** |

### 1.1 Routing change from the previous nine tasks, recorded

T-01 – T-09 ran on **Cursor** (Implementer `grok-4.7-*`, Reviewer `gpt-5.6-sol-xhigh`) by owner direction of 2026-09-22 (§1.1). T-01b was routed by owner decision of **2026-09-23** onto the **Claude Code Step 8E wrappers** — the registry's enforced binding (`akili-implementer`→`sonnet` T2, `akili-reviewer`→`opus` T3). The one hard constraint is unchanged: Implementer and Reviewer are different models, so each task still closes on an ordinary Reviewer `PASS`.

### Attempt 1 — `PASS`

**Files changed (14, +372 / −109):**

```
src/db/migrations/1790086170692-createPrmsWebhookDeliveryTable.ts
src/db/migration-specs/1790086170692-createPrmsWebhookDeliveryTable.spec.ts
src/domain/entities/prms-webhook/entities/prms-webhook-delivery.entity.ts        (+ spec)
src/domain/entities/prms-webhook/repositories/prms-webhook-delivery.repository.ts (+ spec)
src/domain/entities/prms-webhook/delivery-correlator.service.ts                  (+ spec)
src/domain/entities/prms-webhook/enum/delivery-processing-state.enum.ts
src/domain/entities/prms-webhook/prms-webhook-delivery.service.ts
src/domain/entities/result-prms-sync/result-prms-sync-status.reader.ts           (+ spec)
src/domain/entities/result-prms-sync/dto/prms-sync.dto.ts
test/prms-webhook.e2e-spec.ts
```

**Implementer verification (reported):** unit tier 403 suites / 3577 tests green · `npm run build` exit 0 · migration revert→execute→revert with pre-execute absence confirmed · `npx eslint` (14 paths) exit 0 · `npm run test:e2e -- test/prms-webhook.e2e-spec.ts` 7/7 green. Three falsifiers each observed red then restored green.

**Evidence re-run — Leader-inline, non-author (Step 2.3, never waived): `VERIFIED`**

| Check | Reported | Leader re-run |
|---|---|---|
| Unit tier | 403 / 3577 | **403 / 3577** ✓ |
| Build | exit 0 | **exit 0** ✓ |
| eslint | clean | **exit 0, no findings** ✓ |
| e2e `prms-webhook` | 7 / 7 | **7 / 7** ✓ |
| Migration gate | revert→absent→execute→revert | **reproduced from an independently confirmed-absent baseline** (217 tables, head `395`) ✓ |
| Sweeps | 0 old-table, 0 bare `received_at`, 12 files on the new name, 3 renamed indexes | **identical** ✓ |

**Resolved-schema assertion (KZ-001 — asserted in `information_schema`, never on the decorator):** 30 columns · `event_source` `varchar(10) NOT NULL` · `status` `varchar(30) NULL` · `actor_user_id` `bigint NULL` · `reviewer_name` `varchar(255) NULL` · `reviewer_role` `varchar(191) NULL` · `science_program_code` `varchar(20) NULL` · `changes` `json NULL` · `occurred_at` `timestamp NOT NULL` · `received_at` **absent** · `correlation_outcome` / `processing_state` / `environment` all still `NOT NULL` · indexes `idx_result_prms_sync_history_{delivery_id,result,occurred_at}`.

**Reviewer verdicts:**

- **Reliability lens — `STATUS: PASS`.** Column fidelity, up/down symmetry, SQL fidelity across the five closed tasks, and KZ-001 compliance all verified at source. Independently re-derived the corrected 23→30 figure rather than accepting it.
- **Risk & resilience lens — `STATUS: PASS`.** Scope boundary intact (no `result_prms_sync_log`, no `result-prms-sync.service.ts`, no `client/`). All three delegated judgment calls ruled **conformant**.

### Decisions made

1. **Execute-time spec edit — column-count correction (3 sites).** The Pivot Record stated T-01 shipped **24** columns; the original `CREATE TABLE` declares **23**. Corrected in `execution.md` (Pivot Record), `design.md` §4, and `tasks.md` T-01's superseded note, with a two-direction sweep (old value: zero hits). The figure now has **one home** with its deriving command attached, per KZ-005's escalation. Both Reviewers re-derived it independently and confirmed the correction. *Origin: a Leader arithmetic error in the Pivot Record, not an implementation defect — but it briefly read as a missing column (24 + 7 = 31 vs. the 30 observed), which is exactly how a wrong figure in a correction record does damage (KZ-007).*
2. **`delivery_received_at` kept at 4 sites** — ruled conformant. The Done criterion targets schema identifiers; this is T-07's shipped API response field, and renaming it is behaviour the scope boundary excludes. Zero **bare** `received_at` remain.
3. **Migration file and class name kept.** Ruled not merely allowed but **required**: `CreatePrmsWebhookDeliveryTable1790086170692` is the identity TypeORM matches applied records by.
4. **Entity/repository symbols kept** (`PrmsWebhookDelivery`, `PrmsWebhookDeliveryRepository`) — the task delegated this; applied consistently and stated.

### Issues encountered

- **A reported end-state that did not match the database, resolved as not a defect.** The scratch schema showed migration record `400` present and the table applied, against a report claiming a clean final revert. Re-run from a confirmed-clean baseline showed the record advance to `402` after `test:e2e` alone: **the e2e harness runs the migration itself.** The Implementer's revert did happen; e2e re-applied it. The report's *mechanism* ("`CREATE TABLE IF NOT EXISTS`") is wrong; its *outcome* was right. No attempt consumed.
- **Falsifier 3's inert-file statement — corrected against the Reviewer.** The risk Reviewer asked the Leader to confirm four files as comment-only and structurally unable to redden. Verified directly: **only two are** — `enum/delivery-processing-state.enum.ts` (JSDoc) and `dto/prms-sync.dto.ts` (a comment and an `@ApiProperty` description asserted by no spec). The other two are **live and do redden**: the migration emits the SQL its spec asserts, and `result-prms-sync-status.reader.spec.ts` carries `/result_prms_sync_history/.test(sql)` matchers that drive the fake. Recorded as the falsifier requires: **2 of the 12 files carry doc-only references and cannot redden.**

### Requirements covered

R-PWH-005 (population widens — see *Pivot Record* → *Requirement impact*) · the UI history contract supplied as a mock.

### ADVISORY (4R lens — recorded, never gating, never a new task)

- **`LAST_DECISION_SQL` becomes wrong once T-11 lands.** Both lenses reached this independently. `result-prms-sync-status.reader.ts:41-54` filters `correlation_outcome = 'CORRELATED' AND duplicate_of_id IS NULL`; T-11's outbound `PENDING_REVIEW` rows satisfy both (Pivot decision 2). Reachable sequence: a result pushed to `ACCEPTED` with **no** inbound verdict → the only matching row is T-11's STAR row → `last_decision` returns `{decision: null, decided_at: null, …}` instead of `null` — **a break of R-PWH-008 AC.3, in the common case.** Correctly deferred out of T-01b (adding a `WHERE` clause is behaviour the scope boundary excludes). **Recording is the gap: T-11's task text lists neither the reader in *Files touched* nor this in its Done criteria or Consumers.** → escalated to the owner at the Step 5 gate as a **spec gap**, not absorbed into T-11 by Leader fiat.
- `EVENT_SOURCE_INBOUND = 'PRMS'` is a bare literal while sibling varchar-backed values live in `enum/`; a shared `event-source.enum.ts` would stop T-11 drifting. Not reachable today.
- The e2e suite's `CREATE TABLE` now hand-duplicates 30 columns and 3 indexes of the migration with nothing asserting the two agree — future migration drift leaves e2e green against a stale schema.
- Two inaccurate doc pointers: `prms-sync.dto.ts:~98` attributes the field to T-13 (it is this spec's T-07), and the entity doc points at the migration header for symbol-retention reasoning the header does not contain.
- After T-11, STAR-generated rows will be written through `PrmsWebhookDeliveryRepository` into `PrmsWebhookDelivery` — the symbol no longer means "delivery".
- `findHistory`/`findHistoryByResultId` order by `occurred_at ASC` and do not filter `duplicate_of_id IS NULL`, while amended `design.md` §4 specifies `COALESCE(decided_at, occurred_at)` and duplicate-filtered reads. Belongs to the UI spec (OQ-5's sequel).

### Final verification result

**Green and independently reproduced.** Unit 403/3577 · build exit 0 · eslint exit 0 · e2e 7/7 · migration applies and reverts cleanly from a confirmed-absent baseline · resolved schema matches the Pivot Record exactly · all rename axes swept to zero, including the index-name axis (KZ-005).

**Scope this verification cannot reach (KZ-017):** the migration is applied **nowhere but the disposable TEST scratch schema** — nothing here speaks to Dev or PROD, where the table does not exist under either name. InnoDB locking is proven only on emitted SQL against a mocked `EntityManager`. The six inbound-relevant nullable columns (`status`, `reviewer_name`, `reviewer_role`, `science_program_code`, `changes`, `actor_user_id`) are proven to **store `NULL`**; no task in this spec yet populates them from a PRMS callback body, and T-11 covers only the **outbound** write.

---

## Task Amendment: T-11 — the reader guard is in scope

**Date 2026-09-23 · raised by both T-01b Reviewers independently · approved by the owner at the T-01b continue gate**

### Why

T-11 as originally written **introduces a break of R-PWH-008 AC.3**. `LAST_DECISION_SQL` (`result-prms-sync-status.reader.ts:41-54`) selects on `correlation_outcome = 'CORRELATED' AND duplicate_of_id IS NULL`. Pivot decision 2 gives T-11's outbound rows **both** properties. Reachable sequence, no edge case required:

1. A result is pushed and settles `ACCEPTED` → T-11 writes one `PENDING_REVIEW` row.
2. PRMS has not yet returned a verdict → there is no inbound row.
3. `GET /api/results/:result-code/prms-sync` → the only `CORRELATED`, non-duplicate row is **STAR's own**, so `mapLastDecision` returns `{decision: null, decided_at: null, prms_result_code: <set>, …}` where the contract requires **`null`**.

The Pivot's own *Requirement impact* already stated the governing rule — *"every existing query that means 'deliveries' must filter on `event_source`"* — but no task owned that query.

### Why it was not fixed in T-01b

Correctly deferred. Adding a `WHERE` predicate is behaviour, and T-01b's scope boundary excludes *"any behaviour beyond the rename and the additions"*. Both Reviewers ruled the deferral right and the **recording** inadequate: the repository received an inline note, the reader received none, and T-11's task text named neither the file nor the criterion. A deferral recorded only in an advisory has no owner — the brief carries it or nobody does.

### Why it is not a new task

The fix belongs to the task that **causes** the break. Routing it to a new T-12 would leave the defect live in the window between the two, and routing it to the UI spec would ship a known requirement break to Dev. The owner chose the amendment at the T-01b continue gate; the alternatives (new task, or accept-and-log as RB-9) were presented and declined.

### What changed in `tasks.md` § T-11

| # | Change |
|---|---|
| 1 | Amendment banner naming the R-PWH-008 AC.3 break |
| 2 | `result-prms-sync-status.reader.ts` (+ spec) added to **Files touched** |
| 3 | Implementation note: add `AND event_source = 'PRMS'`, and **do not widen** beyond that one predicate |
| 4 | **Falsifier 4**: remove the guard → a STAR-only result returning `last_decision = null` must redden; a green there means the test asserts on the mock, not the emitted SQL (KZ-001) |
| 5 | **Consumers** extended: `git grep -rn "last_decision\|LAST_DECISION_SQL" -- src test` |
| 6 | Two Done criteria added (guard asserted on emitted SQL; the STAR-only → `null` regression gate) |
| 7 | Est. LOC ≈ 300 → **≈ 340** |

**Scope is narrowed, not widened, everywhere else:** `findHistory` / `findHistoryByResultId` ordering and duplicate filtering stay out — they belong to the UI spec (OQ-5's sequel).

### Correction closure (two-direction sweep)

- **Forward:** the stale `All 10 \`T-NN\` tasks are \`done\`` line in `tasks.md` §7 — the Pivot added two tasks and never updated it. Now **12**.
- **Backward:** `tasks.md` §5 budget. The tripwire **has fired** and is recorded as an actual (12 tasks · ≈ 3,710 LOC · 11 review rounds) beside the HITL-approved figure, which is deliberately left unedited. The overrun is fully attributable to the owner-approved T-08 amendment and the owner-approved Pivot.

---

## T-11 — The outbound `PENDING_REVIEW` event

| Field | Value |
|---|---|
| **Final status** | **`PASS`** (dual-lens, both independent) |
| Date | 2026-09-23 |
| Implementer attempts | **1** |
| Implementer | `akili-implementer` · **Claude Sonnet** (T2) · effort `xhigh` |
| Reviewers | `akili-reviewer` ×2 · **Claude Opus** (T3) — reliability + risk/resilience, in parallel |
| `author ≠ auditor` | **holds** on both axes. No `REVIEW_WAIVED` owed |
| runtime events | **none** |

> **Routing note.** The owner set a standing rule mid-run (2026-09-23): **Cursor/Grok implements, Claude reviews.** T-11's implementation was already in flight on Claude Sonnet when the rule was given, and the owner directed: *"si ya lo hiciste tú, pues revísalo, y para lo próximo que lo ejecute cursor con grok."* **T-11 is therefore the last task implemented on Claude; from T-10 onward implementation goes to Cursor/Grok via Orca `/orchestration`.**
>
> **Correction to §1.1.** That section records the Cursor/Grok routing as an owner direction dated to the 2026-09-22 run. That was the Leader's misreading — it is the owner's **standing** preference. The switch to the Claude Code wrappers for T-01b and T-11 followed a Leader recommendation (presented labelled *"(Recommended)"*), not an owner request. Recorded so the log does not attribute to the owner a decision the Leader induced.

### Attempt 1 — `PASS`

**Files changed (10, +550 / −0 — pure additions):** the repository (+ spec), the sync service (+ spec), the status reader (+ spec), the module (+ spec, DI wiring), the controller spec and `test/result-prms-sync-claim-concurrency.integration-spec.ts` (consumer fixes).

**Evidence re-run — Leader-inline, non-author (Step 2.3, never waived): `VERIFIED`**

| Check | Reported | Leader re-run |
|---|---|---|
| Unit tier | 403 suites / **3594** tests | **403 / 3594** ✓ |
| Build | exit 0 | **exit 0** ✓ |
| eslint (bare, no `--fix`) | clean | **exit 0** ✓ |
| The amendment's guard | present | **confirmed by direct grep in the real `LAST_DECISION_SQL`**, not only in a fake ✓ |

**All four falsifiers observed red, then green:** (1) try/catch removed → the lock-timeout propagated out of `sync(42)`; (2) guard → `if (true)` → `AUTH_FAILED`/`TRANSPORT_FAILED`/`RETRYABLE` each red; (3) a `Set`-keyed dedupe added → "Expected 2 calls, Received 1"; (4) the `event_source` predicate removed → **the literal R-PWH-008 AC.3 regression the amendment exists to prevent**, a STAR-only row surfacing as a decision object where `null` is required.

**Reviewer verdicts:**

- **Reliability lens — `STATUS: PASS`.** Verified the KZ-001 Disqualifier is genuinely cleared: the NULL row shape is asserted on the **decoded emitted INSERT**, not on call arguments — the spec's fake parses the column list and VALUES tokens and *throws* on any count mismatch (25 columns / 25 tokens / 10 placeholders / 10 params, counted by hand). Confirmed the guard-placement claim by reading the file. Added a finding the Implementer did not make: `interpreted.outcome`'s real domain is only 5 enum values across the interpreter's 9 return sites, so the `IN_FLIGHT` exclusion is **structural**, and a test for it would have to mock the interpreter and would prove nothing.
- **Risk & resilience lens — `STATUS: PASS`.** All nine Done criteria covered by assertions on generated SQL or call arguments; scope boundary intact; all three delegated judgment calls ruled conformant.

### Decisions made

1. **The four files outside the task's named `Files touched` — ruled *necessary consequence*, not scope expansion.** The 8th constructor parameter makes DI registration mandatory (without it the module cannot boot) and makes the three direct `new ResultPrmsSyncService(...)` sites uncompilable. The Reviewer swept the axis independently: exactly **3** such sites repo-wide, all three in the diff.
2. **`occurred_at` = `new Date()` rather than `options.now` — ruled sound.** `SyncOptions.now` is threaded only into `claimAttempt`, where it ages the `IN_FLIGHT` window; `settleAttempt` takes no `now` either, so the history row is timestamped exactly as the settle it follows. The value is still asserted against a fixed fixture in the bound-parameter test.
3. **`PrmsWebhookDeliveryRepository` registered directly in the module's providers — ruled correct, and the alternative was worse.** `PrmsWebhookCallbackModule` does **not** export it, so importing would have required editing a sibling closed task's module. The second instance is stateless, so instance identity carries no semantics.

### Requirements covered

The UI history contract (the mock's *"First synchronization"* / *"Mapping re-synced after rejection"* rows) · **R-PWH-008 AC.3 preserved** by the owner-approved amendment.

### ADVISORY (4R lens — recorded, never gating, never a new task)

- **The history write is `await`ed on the push's critical path.** Its *failure* is tolerated by the catch; its *latency* is not decoupled — a stalled pool delays an already-successful `ACCEPTED` response until the driver times out. This is the one place T-11 differs from T-09's detached correlator.
- **Gap-lock contention arriving by a second route.** `idx_result_prms_sync_history_delivery_id` is **non-unique**, so `recordDelivery`'s `FOR UPDATE` takes next-key locks; a `delivery_id IS NULL` insert lands in that index's head gap, so a concurrent inbound dedupe on the lowest `delivery_id` could make the outbound INSERT wait — **the exact contention Pivot decision 6 meant to avoid, reached a different way.** Bounded by the catch: one lost history row and one `error` log, never a failed push. Reasoned, not measured — no live InnoDB session.
- **`created_by` is `NULL`** on rows where the acting user *is* known (`actor_user_id` carries it). Both lenses raised it; root `CLAUDE.md` §4.1 *Audit* would favour populating it. Suggest the UI spec decide it once for both populations.
- `findHistory` / `findHistoryByResultId` remain unfiltered on `duplicate_of_id`, but have **zero production consumers today** — deferred to the UI spec.

### Final verification result

**Green and independently reproduced.** Unit 403 / 3594 · build exit 0 · eslint exit 0 · the guard confirmed in the real SQL string · all four falsifiers red then green.

**Scope this verification cannot reach (KZ-017):** no tier here executes the new `INSERT` against MySQL — the migration lives only in the disposable scratch schema — so a column/type mismatch against the real 30-column table is structurally outside what was proven. Mitigated, not closed: the column list is byte-identical to `recordInsideLock`'s, which T-04's e2e exercised. `test:e2e` and `test:integration` were not run (the amended Verification names only `npm test`, `npm run build`, `npx eslint`); the one integration consumer touched was spot-checked and fails **only** on the pre-existing RB-6 defect, undisturbed.

---

## Attribution cleanup — 2026-09-23

Commits `f3a5210f` and `97eb358c` were authored carrying a Claude co-author trailer, violating the owner's standing global rule (`~/.claude/CLAUDE.md` §Commits). Both were unpushed and have been rewritten **message-only** to `fc22a199` and `50ac1767`; content tree hashes verified identical. **No pushed commit was rewritten** — roughly 18 older commits on this branch carry the trailer from earlier sessions and are left untouched pending an owner decision, because that is shared history.

A `PreToolUse` hook (`~/.claude/hooks/no-claude-coauthor.sh`) now blocks any history-writing or PR command carrying a Claude attribution. Proven able to fail per K-004, and **refined after it over-blocked its own documentation**: the first version matched the pattern anywhere in the command, so writing *this very section* was blocked. It now anchors on command position. Final battery: **9 cases, 4 blocking, 5 passing**, no over-block.

---

## Rollout note: T-10

| Field | Value |
|---|---|
| Date | 2026-09-23 |
| Start commit | `1f4ac0ff` (tree clean at dispatch) |
| Implementer | Cursor / Grok (T2), via Orca orchestration |
| Release date | **Not set.** This note records the rollout; it does not perform one. |
| Rollout owner | Family owner **Juan Cadavid** / ARI (`family.md` *Owner / Squad*). The public host is a separate owner: whoever owns the AWS deployment (OQ-6 / requirements §14 DevOps). |
| What this section is | The operational record T-10 could write without a running server and without the shared Dev database. It closes nothing that a human has to close. |

**Order, and why it is not optional (K-015).** Migration first, code second. The CI/CD pipeline deploys **code only** — it does not apply database migrations. A merged migration can sit unapplied indefinitely with nothing in the deploy surfacing it. Applying `1790086170692-createPrmsWebhookDeliveryTable` against the shared Dev database is a **human-decided** step. Do not read a green deploy as evidence the table exists.

### Backout

1. Revert the code.
2. Run the migration's `down`. In `1790086170692-createPrmsWebhookDeliveryTable.ts` that method is one statement: `DROP TABLE result_prms_sync_history`.

Nothing else is touched. There is no `results` column to remove, no `result_prms_sync_log` column to remove, and no enum member to remove. The dropped table is `result_prms_sync_history` — the name after the owner-approved Pivot of 2026-09-23 (T-01b). It is not `prms_webhook_delivery`.

### Migration pending-state — **BLOCKED**

Not re-run in this task. The Leader measured it at `1f4ac0ff` on 2026-09-23 and the dispatch forbade starting the server, running Docker Compose, or reaching the shared Dev database by another route. Verbatim result, as recorded by that measurement:

```
npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts
   -> EXIT=1, ETIMEDOUT, 'connect' syscall fatal — the shared Dev MySQL is NOT reachable from here
```

**No pending count is reported.** The command errored. Per K-014 and this task's Falsifier, a count taken over a failed command — including a count that reads zero — is inconclusive, not clean. The disposable scratch schema was not queried in its place: it is a different target and proves nothing about Dev.

### TEST registration round-trip — **BLOCKED**

`POST /api/prms-webhook` then `GET /api/prms-webhook` was not performed. The Leader's measurement at the same commit:

```
curl --max-time 5 http://localhost:3000/    -> 000, unreachable (no server running)
```

A running server needs the same unreachable Dev database. No response body exists to record. **K-016 still binds the next person who tries:** `app_config` is TTL-cached about 5 minutes, and re-saving restarts the window. Read the status the design names: `404` means `ARI_CLARISA_API_KEY` is missing or inactive (P-14, already closed); `503` means the row exists and `simple_value` is empty (that is what P-14b is open about).

**P-14b outcome.** No new observation. `design.md` §2 row P-14b is left as the 2026-09-22 settlement: TEST half verified by a direct read (`is_active = 1`, `POPULATED len=47`, value never printed); PROD half still `UNVERIFIED`. This task did not edit that row, because editing it without a new measurement would invent one. The PROD half stays with OQ-6 / R-1.

**T-04 substitution record.** None is owed. T-04 built the non-stubbing e2e harness; it did not substitute DD-11. Recorded in this file under *T-04*: the suite names `JwtMiddleware` nowhere, and AC.2 / AC.3 evidence counts.

### PROD — **blocked on OQ-6 / R-1**

Not attempted. Design **P-11** (measured 2026-09-21): no PROD hostname resolves (`dig` empty for `main-allianceindicators.ciat.cgiar.org` and `allianceindicators.ciat.cgiar.org`), and PRMS refuses private ranges at registration. **Named owner:** whoever owns the AWS deployment (requirements §12 OQ-6). Requirements §14 makes the DevOps sign-off **required** for this path. It has not been obtained.

### DC-8 and DC-9 — **accepted risks, not closed**

| Class | What it is | Owner | Why this run does not close it |
|---|---|---|---|
| **DC-8** | PII retained without a decision. `data` is the full enriched result document and may carry contributor names and emails. v1 stores it whole (NFR-PWH-004). | Product owner + whoever owns compliance (requirements §12 **OQ-3**; tasks.md RB-5). Parent: PRD OQ-7. | No automated gate exists. No product-owner answer to OQ-3 was given. There is no quote, so there is no evidence (KZ-002). |
| **DC-9** | A live delivery from PRMS never arrives — wrong URL, unreachable host, or a refused registration. | Whoever owns the AWS deployment (requirements §10 DC-9; tasks.md RB-2). | **Cannot be closed from inside the CIAT network** (C-15, C-16). A green local suite is not a live delivery, and this note does not record one as the other. |

### Open questions — **STILL OPEN**

No question below was answered in this task. No answer was invented. OQ-5's sequencing sentence from 2026-09-22 is already in requirements §12; it decides *when* the UI row opens, not *who* reads the history, and it is not treated here as an answer.

| # | Question | Named owner | State |
|---|---|---|---|
| **OQ-1** | Should the verdict become a lifecycle status? | Product owner | **STILL OPEN** |
| **OQ-2** | Does REJECT reopen editing? | Product owner | **STILL OPEN** |
| **OQ-3** | What may STAR retain from `data`? This is DC-8. | Product owner + whoever owns compliance | **STILL OPEN** — no quote |
| **OQ-4** | May the callback populate `result.prms_result_code`? | Product owner + `sync-engine` owner | **STILL OPEN** |
| **OQ-5** | Who may read the history, and at what grain? | Product owner | **STILL OPEN** (substance). Sequencing only was decided 2026-09-22. |
| **OQ-6** | What is the PROD callback host? This is R-1. | Whoever owns the AWS deployment | **STILL OPEN** |
| **OQ-D1** | Should a `DUPLICATE` row retain `raw_body` a second time? v1 retains it. | Product owner | **STILL OPEN** |
| **OQ-D2** | Is a manual re-process endpoint wanted for `PROCESSING_FAILED`, or does the visible state suffice? | Engineering lead (requirements §14: **Juan Cadavid**) | **STILL OPEN** |

### Comms — **NOT YET SENT**

This task has no authority to send them.

| Audience | What they must be told | Who must send it | State |
|---|---|---|---|
| PRMS technical team | The destination registered, per environment | Family owner **Juan Cadavid** / ARI | **NOT YET SENT** |
| Family owner | Children **2, 3 and 4** gain `last_decision` | Family owner **Juan Cadavid** / ARI — he is both the named recipient in T-10's notes and the only named sender in this family. Design §12 step 6 still says "children 3 and 4"; the task notes say 2, 3 and 4. The discrepancy is recorded, not resolved. | **NOT YET SENT** |
| Security | This is the application's first public unauthenticated **write** endpoint, plus a new credential | Family owner **Juan Cadavid** / ARI must request it. Requirements §14 names the Security review itself as **required**. | **NOT YET SENT** |

**Security sign-off: REQUIRED and not obtained.** Requirements §14. Not requested by this task.

### Constraints the risks log assigns to this note

- **RB-7 (recorded, not fixed).** The registered callback URL's path must begin at `/api/prms-callback`. The redaction helper anchors the prefix immediately after the authority, so a gateway path in front of `/api/prms-callback` is logged whole, secret included. Not reachable in the current mount; reachable the moment an operator sets `ARI_PRMS_WEBHOOK_CALLBACK_URL` with a prefix. Reopening T-08 is an owner decision.
- **RB-8 (recorded, not fixed).** `@UseGuards(CallbackSecretGuard)` has no unit-tier gate. Deleting that binding leaves `npm test` green while the only public unauthenticated write endpoint is open. T-04's e2e suite does assert the wrong-secret `404`, and that suite is a tier `npm test` never runs (P-10). Whether the one-line metadata assertion earns a follow-up is an owner decision.

### Consumers sweep (KZ-013) — before the status edit

`git grep -rn "decision-webhook" -- docs` at `1f4ac0ff`, **25 hits**, raw output checked for an error first (exit 0). None of the 25 is a path that the status-word edit moves. The folder `docs/specs/bilateral/prms-sync/decision-webhook/` stays where it is. Hits outside this spec folder:

- `docs/specs/bilateral/prms-sync/family.md` — the manifest row, the mermaid node, and prose in the family-status paragraph, OQ-F1, OQ-F7
- `docs/specs/bilateral/prms-sync/sync-engine/execution.md`, `proposal.md`, `requirements.md` — prose naming the child, not a relocated path

**After the edit** the same command was re-run (exit 0): **28 hits**. Three lines are new: the sweep command quoted in this section, the child-5 status note in `family.md`, and the §9.1 row in `docs/trd/trd.md`. Every pre-existing hit is still present. The folder was not moved, and the path named in the before-sweep still resolves on disk. Line numbers inside `family.md` shifted by the note inserted under the manifest — the citations moved with the text, they did not break.

### Scope this note cannot reach (KZ-017)

- The migration check cannot see Dev, and it was not pointed at the scratch schema.
- The registration check cannot see PRMS TEST or a `ServerResponseDto` from either handler. A `/swagger` page was not opened; a rendered page would not be evidence of a `200` anyway (KZ-002).
- `git grep -- docs` cannot see `src/`, `test/`, `client/`, or untracked files.
- P-11's DNS result is the 2026-09-21 measurement. This task did not re-resolve PROD hostnames.
- No comm, no sign-off, and no open-question answer is evidenced here. Absence of a quote is absence of evidence.

### Done criteria — left `[ ]` in `tasks.md`

This spec's closed tasks keep their inner Done boxes unchecked; the Leader flips the task header after a Reviewer `PASS`. T-10's nine boxes are all still `[ ]`. What this note actually did:

| Criterion | In this note | Checkbox |
|---|---|---|
| Migration pending-state checked, raw output recorded, ANSI-normalized before counting | **Not met.** Command errored. No count. | `[ ]` |
| TEST registered and read back; P-14b written into the Premise Ledger | **Not met.** No server. Ledger row not edited. | `[ ]` |
| PROD recorded as blocked on OQ-6 / R-1, with a named owner | **Met** (above) | `[ ]` until Reviewer PASS |
| Backout written into `execution.md` | **Met** (above) | `[ ]` until Reviewer PASS |
| All three comms sent; Security sign-off requested | **Not met.** Not sent, not requested. | `[ ]` |
| OQ-1…OQ-6 and OQ-D1/OQ-D2 put to their owners, quoted or still open | **Recorded STILL OPEN, not put to the owners.** No human was asked. | `[ ]` |
| DC-8 and DC-9 restated as accepted risks with human owners | **Met** (above). Neither closed. | `[ ]` until Reviewer PASS |
| `docs/trd/trd.md` §9.1 carries the inbound-callback row | **Met** | `[ ]` until Reviewer PASS |
| `family.md` child 5 `Status` updated | **Met** — `pending` → `active`, not `done` | `[ ]` until Reviewer PASS |

---

## T-10 — Rollout, registration runbook, and the two accepted risks

| Field | Value |
|---|---|
| **Final status** | **`[~]` — conformance `PASS`, task NOT complete** (see *Why this is `[~]`* below) |
| Date | 2026-09-23 |
| Implementer attempts | **1** |
| Implementer | **Cursor · `grok-4.7-high`** (T2), via Orca orchestration — Run `run_1f393f8398d7`, Task `task_4fab6a262f43`, Dispatch `ctx_3acd909f6625` |
| Reviewer | `akili-reviewer` · **Claude Opus** (T3), lens-checklist mode (the task's `Review` field is `checklist`) |
| `author ≠ auditor` | **holds** — different models, different hosts. No `REVIEW_WAIVED` owed |
| runtime events | **none** |

> **Routing.** First task executed under the owner's standing rule of 2026-09-23: **Cursor/Grok implements, Claude reviews.** The worker terminal was released on completion.

### Environment pre-check (Step 2.1) — run by the Leader BEFORE dispatch

| Check | Command | Result |
|---|---|---|
| Server | `curl --max-time 5 http://localhost:3000/` | **`000` — unreachable**, no server running |
| Shared Dev MySQL | `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` | **EXIT=1, `ETIMEDOUT`, `connect` syscall fatal** |

**A K-014 instance was produced by the pre-check itself and is recorded because it is the lesson in miniature.** The first attempt wrapped the command in `timeout`, which does not exist on macOS: it returned `EXIT=127`, `command not found`. Had the Leader piped that into `grep '^\[ \]' | wc -l`, the answer would have been **zero pending migrations** — a confident green over a command that never ran. The error was checked before the count, which is the whole of K-014.

**Consequence carried into the brief:** two of the nine Done criteria were *impossible to execute*, and the brief instructed the worker to record them BLOCKED with verbatim evidence and to tick nothing.

### Attempt 1 — conformance `PASS`

**Files changed (3, docs only, +126):** `docs/trd/trd.md` (§9.1 inbound-callback integration row) · `docs/specs/bilateral/prms-sync/family.md` (child 5 `pending` → `active`) · this file (the `## Rollout note: T-10` section above).

**Evidence re-run — Leader-inline, non-author: `VERIFIED`**

| Check | Result |
|---|---|
| Scope boundary | **0** files under `src/`, `test/`, `client/` ✓ |
| `tasks.md` | **0** lines changed — no Done criterion ticked ✓ |
| Consumers sweep `git grep -rn "decision-webhook" -- docs` | **28** hits, total checked **before** filtering (K-014) ✓ |
| Cited `Status Vocabulary` | matches `docs/specs/general-setup/family.md` §Status Vocabulary **lines 41–44 exactly** ✓ |
| TRD row's factual claims | all resolve: `prms-callback(.*)` exclusion at `src/app.module.ts:106`; `ARI_PRMS_WEBHOOK_SECRET` in `.env.example`; module at `domain/entities/prms-webhook/` ✓ |

The last two rows were re-verified at the source by the Leader rather than accepted from the worker's report: a document future children of this family read as fact is exactly the artifact class KZ-007 warns about.

**Reviewer verdict — `STATUS: PASS`.** Every blocked step names its command, attributes the measurement, and explicitly refuses a count over a failed command. `active` is correct against the vocabulary (`done` requires `/akili-test` complete and verified; it has not run). DC-8/DC-9 restated as accepted risks with the C-15/C-16 wording intact and neither closed. All eight open questions `STILL OPEN` with owners matching `requirements.md` §12 and `design.md` §15. Backout names `result_prms_sync_history` and explicitly disclaims the old name. K-015 stated explicitly.

### Why this is `[~]` and not `[x]`

**Conformance `PASS` is not completion.** All **nine** Done criteria remain `[ ]`, and the worker correctly ticked none. Four are outstanding, and **none can be closed by any agent**:

| Outstanding | Blocked by | Owner |
|---|---|---|
| Migration pending-state check | shared Dev MySQL unreachable (`ETIMEDOUT`) | whoever restores Dev access |
| TEST registration round-trip (`POST` then `GET /api/prms-webhook`) | needs a running server, which needs that same database | as above |
| OQ-1…OQ-6, OQ-D1, OQ-D2 answered; **OQ-3 quoted** | no human answer exists | product owner / named owners |
| Three comms sent + **Security sign-off obtained** (requirements §14, *required*) | nobody has sent them | Juan Cadavid / Security |

Per `/akili-execute` Step 2.3 item 0, a task with an outstanding gap never reaches `[x]`, **even on a Reviewer `PASS`** — the Reviewer audits what was written, not what was omitted. The spec is **code-complete with the rollout pending**, which is an honest terminal state, not a half-finished one.

### ADVISORY (recorded, never gating)

- **`design.md` §12 step 6 is factually stale.** It says the comms reach *"children 3 and 4"*; the actual set is **2, 3 and 4** — children 2, 3 and 4 all gain `last_decision`. The worker recorded the discrepancy rather than silently resolving it, which was right. Per root `CLAUDE.md` §5 the wrong document should be fixed, so this is carried to the owner as a decision rather than left only in this log.
- **DC-9 and OQ-6 name a *role*, not a person** ("whoever owns the AWS deployment"). Faithful to `requirements.md` §12/§14, which names nobody either — so a **spec gap, not a diff defect** — but neither is actionable until a human is named.
- The two BLOCKED evidence blocks are fenced like a terminal transcript and headed *"Verbatim result"*, while their content is a summarized one-liner. Nothing is ticked on them and the prose hedges it, so it does not gate; relabelling them "Leader's recorded summary line, not raw stdout" would remove the ambiguity.

### Final verification result

**Documentation delivered and independently verified; the operational and human halves are blocked and recorded as such.** No test or build gate applies — this task produces no code.

**Scope this verification cannot reach (KZ-017):** it proves what the three documents now say and that no code was touched. It proves **nothing** about the Dev database's migration state, the PRMS TEST host, or whether any human has been told anything — all three are the outstanding work above, and a green review here must never be read as covering them.
