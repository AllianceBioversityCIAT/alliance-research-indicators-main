# Execution Log — Results / CapDev Bulk Upload Notification

## 1. Document Control

- **Spec path:** `docs/specs/results/capdev-bulk-upload-notification`
- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Module / package:** `results` (implementation in `ai-reports`) — **server** (`server/researchindicators`)
- **Branch:** `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics`
- **Leader:** Claude Opus 5 (T1) via `/akili-execute`
- **Worker wrappers:** `.claude/agents/akili-implementer.md` (T2 `sonnet`) · `.claude/agents/akili-reviewer.md` (T3 `opus`, read-only) — author ≠ auditor enforced by configuration
- **Approval mode:** *not recorded* in the spec's Document Control → default **interactive** (user gate after every task)
- **Rework ceiling:** 3 attempts per task
- **Budget tripwire** (`design.md` §14 / `tasks.md` §1): 12 tasks · **~5,600 LOC** · 2 review rounds — *re-baselined **twice**: to ~4,600 on 2026-08-06 (fired at T-05, `design.md` §14.1) and to ~5,600 on 2026-08-11 (fired again before T-12, `design.md` §14.2). Original ~1,450. The tripwire still binds against the current figure; a third firing escalates to a scope conversation, not a third revision.*
- **Commit standard:** `[SPEC:docs/specs/results/capdev-bulk-upload-notification] <type>(<module>): <subject>`
- **Concurrency decision:** all 12 tasks target the **same package** (`server/researchindicators`). Per root `CLAUDE.md` → *Concurrency* ("two tasks in the same package are not [safe]") and `.agents/leader.md` → *Disjoint source files are necessary but not sufficient*, T-01…T-04 are **logically** independent but share `node_modules`, Jest cache, and build output. **Execution is serialized**, document order.
- **Active Kaizen lessons in force:** KZ-001 (test-double fidelity — binds T-04/T-08), KZ-003 (full-suite run on shared-service change — binds T-12)
- **Created:** 2026-08-06

---

## 2. Pre-execution baselines

### B-1 — Legacy `ai/formalize/bulk` payload contract (captured before T-01)

`tasks.md` T-11 *Disqualifies* requires the pre-change request shape to be captured **before** the DTO change lands, otherwise the backward-compatibility regression is untested. Captured by the Leader at run start from `src/domain/entities/results/dto/result-ai.dto.ts` (pre-T-01 working tree):

```ts
// ProcessMedatada — pre-T-01, exactly two properties, both required
export class ProcessMedatada {
  @IsString() @IsNotEmpty() file_name: string;
  @IsString() @IsNotEmpty() ai_interaction_id: string;
}

// RootAi — pre-T-01
export class RootAi {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ResultRawAi) results: ResultRawAi[];
  @IsOptional() @ValidateNested() @Type(() => ProcessMedatada) metadata: ProcessMedatada;
}
```

The legacy e2e fixture in T-11 MUST therefore send `metadata` with **exactly** `{ file_name, ai_interaction_id }` and no `contacts` key, and expect `201`. Endpoint validation at `results.controller.ts` runs `whitelist: true` + `forbidNonWhitelisted: true`.

---

## 4. Owed DB evidence register

Consequence of the user's environment decision at the T-01→T-02 gate (*"write the migration, don't apply it"*, same rule for T-03/T-04). Every migration this spec produces is **written and reviewed by inspection but never executed**. Collect these into **one supervised human session** against the shared dev MySQL rather than three interruptions.

Run from `server/researchindicators/`, in this order:

| # | Task | Command | Expected |
| --- | --- | --- | --- |
| O-1 | T-02 | `npm run migration:dev:execute` | 9 nullable columns appear on `bulk_upload_processes`; existing rows keep NULLs |
| O-2 | T-02 | `npm run migration:revert` | the 9 columns drop cleanly; no other change |
| O-3 | T-03 | `npm run migration:dev:execute` then `npm run migration:revert` | two `app_config` rows appear (`EMAIL.CAPDEV_BULK_UPLOAD.ENABLED` = `'false'`, `EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL` = `''`) with `is_active = 1`; revert deletes exactly those two |
| O-4 | T-04 | `npm run migration:dev:execute` then `npm run migration:revert` | the `capdev-bulk-upload-summary` row appears in `sec_template`; revert removes only it |
| O-5 | T-04 | `_getTemplate(TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY)` returns non-empty against dev | **the one claim static review cannot close** — it is also the only way to confirm the live `sec_template.is_active` column really carries `DEFAULT 1`, rather than merely being declared `default: true` on `AuditableEntity`. Three working precedents make it near-certain, not proven. |
| O-6 | T-05 | Execute all four queries (`findGroups`, `findMetrics`, `findCountries`, `findUnattributedResultIds`) against dev MySQL | **Narrowed 2026-08-06 — the specific suspected defect is fixed; the general gap remains.** Both Reviewers independently flagged that `MULTI_PRIMARY_RESULT_IDS_SELECT` built `GROUP_CONCAT(DISTINCT <CASE expr> ORDER BY bur.result_id)`, whose `ORDER BY` expression is not among the `DISTINCT` expressions — a shape MySQL 5.7+ rejects with `ER_FIELD_IN_ORDER_NOT_SELECT` (3065). The user authorized the one-line deletion and it landed (commit below). **What is still owed:** no test in the suite compiles SQL, so a column typo, a bad alias, or an `ONLY_FULL_GROUP_BY` violation would still pass green. All four queries must be executed against real MySQL **before T-09/T-10 wire the repository into a live path**. Note: `.getQuery()` against a non-connected `DataSource` would catch typos and aliases but **not** parser-level rejections — only MySQL can. |

### Resolution — 2026-08-09

Run via two read-only probe scripts (`build/od-evidence/od-check.ts`, `od-probe.ts` — gitignored, deleted after the session) rather than a raw MySQL client, because none is installed on the operator's machine.

**Two corrections to this register's own plan, found while preparing the run:**

1. **The per-task "execute then revert" cycles were not runnable as written.** `migration:dev:execute` runs *every* pending migration, not one; `migration:revert` undoes exactly one. O-1/O-3/O-4 therefore share a single apply.
2. **Both seed migrations insert without `is_active`.** They are raw `queryRunner.query` INSERTs, so `AuditableEntity`'s `default: true` — an ORM-level default applied on entity save — never runs. The landed value is the live column's DDL default. This is the doubt O-5 was written for, and it is **broader than O-5 states**: it hits `app_config` too, where the failure mode is worse. A non-`1` default there makes the flag read as absent, so the accessor defaults to `false` and **the feature silently never runs while appearing correctly disabled**. Checked directly against `information_schema` before anything was applied.

| # | Outcome |
| --- | --- |
| O-1 | ✅ **Verified.** 9 nullable columns present, correct types, no backfill on existing rows. |
| O-2 | ⚠️ **Waived by the spec owner, 2026-08-09 — static review, not execution.** The revert cycle was **not** run against dev. Owner's assessment: the `down()`s are `DROP COLUMN` and `DELETE` by exact key, with no logic, so inspection suffices. Risk accepted is narrow but real: **a production rollback of these three migrations is unrehearsed.** Recorded as a waiver rather than as evidence so the distinction survives — "we tested it" and "we read it and judged it safe" are not interchangeable in an incident. |
| O-3 | ✅ **Verified.** Both `app_config` rows present, `ENABLED = 'false'` (seeded off per DD-5), `CC_EMAIL = ''`, both `is_active = 1`. |
| O-4 | ✅ **Verified.** Template row present and active. `CHAR_LENGTH` matches the on-disk file exactly and the em dash survived storage — so the byte-equality chain (disk == migration literal == **stored row**) is closed end to end, not just at its first two links. |
| O-5 | ✅ **Discharged by O-4's check, more directly than planned.** O-5 existed to confirm the live `sec_template.is_active` really carries `DEFAULT 1`; `information_schema` answers that at the DDL level, and the seeded row confirms it landed. `_getTemplate`'s filter is `name` + `is_active: true`, both now verified. |
| O-6 | ✅ **Verified 2026-08-09 — see the detail block below.** All four queries execute against dev MySQL without error across **five** bulk processes. **T-09/T-10 are unblocked.** |

### O-6 detail — 2026-08-09 (run by the Leader; read-only, no writes issued)

`build/od-evidence/od-probe.ts` against `alliancereportingdb` (`192.168.20.210`), processes **2, 5, 9, 1, 3** — every bulk process on dev carrying CapDev results (11 processes exist; 5 qualify).

**Result: 5/5 probes green on all five processes.** Representative output (process 2):

```
O-6.1 findGroups   OK  1 group(s), 0 multi-primary warning(s);
                       keys: agreement_id, project_lead_description, pi, ra, pa, token_owner
O-6.2 findMetrics  OK  {"agreement_id":"D527","trainings_count":2,"participants_total":44,
                        "female_participants_total":20,"start_date":"2024-07-18T00:00:00.000Z",
                        "end_date":"2024-09-30T00:00:00.000Z"}
O-6.3 findCountries OK {"agreement_id":"D527","country_names":["Colombia"],"iso_alpha2_list":["CO"]}
O-6.4 findUnattributedResultIds OK  0 unattributed result id(s)
O-5   _getTemplate OK  1308 chars; em-dash present=true; 19 unrendered {{ }} slots
```

**What this discharges.** O-6's narrowed concern was `ER_FIELD_IN_ORDER_NOT_SELECT` (3065) in Q1's `GROUP_CONCAT`, plus the general class of parser-level rejections (`ONLY_FULL_GROUP_BY`, bad alias, column typo) that no unit test can catch because nothing in the suite compiles SQL. **All of these fire at prepare/execute time, independently of how many rows match** — so a query that ran to completion proves the class is absent. It is.

**What it does not discharge, stated precisely.** Two output paths returned empty on *every* process on dev: `multiPrimaryWarnings` (0 everywhere) and `findUnattributedResultIds` (0 everywhere). Their **SQL is proven**; their **row-mapping is not**, and rests on the repository spec's fixtures, which re-collapse raw rows precisely so this is testable without a database. Dev has no multi-primary contract and no unattributed result to exercise them with, so this is a limit of the available data, not a gap in the run — but it should not be read as "the multi-primary path works end to end."

**Incidental confirmations:**

- **Byte fidelity closed independently of O-4's check.** `_getTemplate` returned **1,308 characters**; the on-disk file is 1,308 characters / 1,312 bytes (two em dashes, 3 bytes each). Stored copy == disk copy == migration literal, confirmed through the runtime accessor rather than through `CHAR_LENGTH`.
- **Real data exercises the OD-2 `female == 0` branch.** Processes 1 and 3 carry `female_participants_total: 0` against 6 and 3 participants — the AC.8 suppression case, present in live data rather than only in fixtures.
- **Date storage is inconsistent but harmless.** Some rows store a pure calendar date (`2024-07-18T00:00:00.000Z`), others a Bogotá-midnight instant (`2024-10-17T05:00:00.000Z`). Both land on the intended calendar day because `capdev-metrics.formatter.ts:20` pins `timeZone: 'UTC'` on the `Intl.DateTimeFormat`. Without that pin, a row stored as local midnight would render the **previous month** on a UTC server. The comment on that line ("the DB value is a calendar date, not an instant") is load-bearing, not decorative — do not remove the `timeZone` option.

**Also discovered:** the three migrations were **already applied** on dev when the check ran — surfaced incidentally, because the script's verification branch only executes when all three are present. The register had assumed dev was at `AddedTipIdKp1784211738931`.

**Evidence-capture gap, recorded honestly:** the probe's raw stdout was **not pasted into this log**; O-1/O-3/O-4/O-5 above rest on the spec owner's report that the run came back green. The script exits non-zero on any failure, so a green exit is a meaningful signal — but the specific numbers (the `is_active` defaults, the three baseline counts, the char-length comparison) are not preserved here and cannot be re-read later without re-running.

**Known blocker for this register:** `npm run migration:generate` is currently **non-functional** against the dev datasource — `alliancereportingdb.orm_metadata` does not exist, and there is pre-existing generated-column drift on `bilateral_project_mapping.active_agreement_id`. Unrelated to this spec and not fixed by it, but it blocks generation for every spec until someone owns it. This spec's migrations are hand-written in response (D-T02-a).

---

## 3. Task Execution History

<!-- entries appended below, newest last -->

### T-01 — Extend the AI bulk payload with file contacts

- **Final status:** ✅ **PASS** (Reviewer verdict, attempt 1 of 3)
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-005
- **Design refs:** §5 (API design), §8 (shared contracts)
- **Implementer attempts:** 1
- **Skills assigned:** `nestjs-expert`, `api-design-principles` (as recommended by the task — no Leader deviation)
- **Effort:** `medium` (small, well-specified surface; the difficulty is in the disqualifier, which was handled by making it explicit in the brief rather than by raising the dial)
- **Review lens mode:** lens checklist (single Reviewer, effort `medium`)

#### Attempt 1

- **Files changed:**
  - `src/domain/entities/results/dto/result-ai.dto.ts`
  - `src/domain/entities/results/dto/result-ai.dto.spec.ts`
- **Change summary:** added `AiContactRole` enum (`reporting_leader | contact_person | other`), `AiContactDto` (`email` required `@IsEmail` + `@IsNotEmpty`; optional `name`, `role`, `contract_code`; `@ApiProperty` on all four), and `contacts?: AiContactDto[]` on `ProcessMedatada` with `@IsOptional() @IsArray() @ValidateNested({each:true}) @Type(() => AiContactDto)`. Six new spec cases. No controller, service, entity, or migration touched.
- **Implementer verification** (from `server/researchindicators/`):
  - `npx jest src/domain/entities/results/dto/result-ai.dto.spec.ts --silent` → 1 suite, **13 tests passed**
  - `npm test -- --silent` → **321 suites, 2048 tests passed**
  - `npx tsc --noEmit -p tsconfig.json` → clean
  - `npm run lint` deliberately **not** run — the script carries `--fix` and mutates files outside the review surface. Deferred to the pre-PR-1 gate (`tasks.md` §8).
- **Reviewer verdict:** `STATUS: PASS` — "T-01 lands the `AiContactDto` / `ProcessMedatada.contacts` extension exactly as `design.md` §5 specifies, and the test suite clears the binding `Disqualifies` clause in substance — it drives the endpoint's real `whitelist`/`forbidNonWhitelisted`/`transform` `ValidationPipe` over the nested `metadata.contacts` path, on a `minimalResult` fixture I verified valid against `ResultRawAi`'s three required fields, so no rejection assertion is vacuous."

#### Disqualifier adjudication (`tasks.md` T-01 *Disqualifies*)

**Cleared, verified in substance rather than form.** The Leader raised the vacuity risk explicitly in the review brief: all four rejection tests assert bare `rejects.toThrow()` over a shared `minimalResult` fixture, so a fixture that itself failed `ResultRawAi` validation would make every rejection test pass for the wrong reason. The Reviewer checked field by field and confirmed:

- `ResultRawAi`'s only `@IsNotEmpty` fields are `contract_code`, `indicator`, `title` — all three present in the fixture;
- every other fixture key is a declared decorated property, so `forbidNonWhitelisted` has nothing to trip on;
- `ValidatorOptions` propagate recursively through `RootAi.metadata → ProcessMedatada.contacts`, so the nested-whitelist test exercises real nested behavior, not a top-level artifact;
- `transform: true` does **not** enable `enableImplicitConversion`, so `{ email: 12345 }` stays numeric and genuinely fails `@IsEmail` rather than being coerced.

The suite is also self-guarding: if `minimalResult` ever stops validating, the two "accepts" tests fail loudly before the rejection tests can go silently vacuous.

#### Decisions

- **D-T01-a — Implementer `Not Done` item 1 resolved, not carried.** The Implementer reported the task's "`/api` Swagger renders `metadata.contacts`" criterion as met by proxy (`@ApiProperty` + clean `tsc`) rather than by observing a live server. The Reviewer established it is **statically verifiable**: `@ApiBody({ type: RootAi })` at `results.controller.ts:670` reaches `AiContactDto` through explicit `type:` references and the class is exported, so Swagger resolves the schema with no `@ApiExtraModels` needed. No residual scope owed; no deferral to T-10 required.
- **D-T01-b — Implementer `Not Done` item 2 accepted.** `AiContactRole` declared inline in the `.dto.ts` beside its sole consumer. In-repo precedent exists (`reporting-feedback.dto.ts:3` declares `AskForHelpTypeEnum` inline), and the task's `Files` list scopes T-01 to this file. Routine placement call, not a scope deviation.
- **D-T01-c — Baseline B-1 captured before this task landed** (see §2), satisfying T-11's requirement that the legacy fixture predate the DTO change.

#### Advisory (4R lenses — recorded, non-gating, no rework, no new task)

- **RELIABILITY:** the four rejection tests use bare `rejects.toThrow()`. Attributable today (verified above), but asserting `BadRequestException` and a message mentioning `contacts`/`email` would make attribution explicit instead of inferred.
- **RESILIENCE:** `contacts` has no `@ArrayMaxSize` and `email` no `@MaxLength`. A malformed CapDev file could ship an unbounded contact list that the T-06 builder then expands into every group's CC. The design does not call for a bound — **noted as input for T-06/T-09**, not a T-01 defect.
- **READABILITY:** the new spec comment pins `results.controller.ts:663-669`; `design.md` §5 cites `666-672` for the same block. `663-669` is correct as of today — the design doc's citation has drifted. Naming the decorator (`@UsePipes` on `createResultFromAiBulk`) would age better than either line range.
- **RISK:** none in this diff. Residual is process-level: `tasks.md` §8 still requires `npm run lint -- --quiet` + a `git status` re-check before PR 1 merges.

#### Final verification

Full server unit suite green (321 suites / 2048 tests), `tsc` clean, scope confined to the two files the task names.

---

### T-02 — Additive migration + entity columns on `bulk_upload_processes`

- **Final status:** 🟡 **`[~]` — code PASS, DB evidence owed** (Reviewer `STATUS: PASS`, attempt 1 of 3)
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-008, NFR-CBU-005
- **Design refs:** §4.1, §3
- **Implementer attempts:** 1
- **Skills assigned:** `nestjs-expert` (as recommended — no Leader deviation)
- **Effort:** `medium`
- **Review lens mode:** lens checklist

#### ⛔ Environment decision governing this task (and T-03, T-04)

The user was asked at the T-01→T-02 gate how to handle schema work against the **shared remote dev MySQL** (there is no local DB; `docs/infrastructure.md` → *Boundary rule* makes destructive schema ops there a human decision). **User chose: "Write migration, don't apply it"**, and "Same rule" for T-03/T-04.

Consequently the Implementer was forbidden `migration:dev:execute`, `migration:execute`, `migration:revert`, and any raw DDL. The task's Done criteria "applies cleanly on dev" / "reverts" are **authorized deferrals, not failures**. This is why the task closes `[~]` and not `[x]` despite a Reviewer PASS.

#### Attempt 1

- **Files created/changed:**
  - `src/db/migrations/1786043523207-addBulkUploadNotificationMetrics.ts` *(new)*
  - `src/domain/entities/ai-reports/entities/bulk-upload-processes.entity.ts` *(modified — 9 columns)*
  - `src/domain/entities/ai-reports/entities/bulk-upload-processes.entity.spec.ts` *(new)*
  - `src/domain/entities/ai-reports/notifications/enum/notification-status.enum.ts` *(new)*
- **Implementer verification** (from `server/researchindicators/`):
  - `npx tsc --noEmit -p tsconfig.json` → clean
  - `npx jest ...bulk-upload-processes.entity.spec.ts --silent` → **18/18 passed**
  - `npm test -- --silent` → **322 suites / 2066 tests passed**
  - `git status --porcelain` → only the 4 in-scope files
- **Reviewer verdict:** `STATUS: PASS` — "All 9 columns agree three ways (design §4.1 ↔ migration SQL ↔ entity decorators) on name, type, nullability, and absence of default; `down()` is an exact nine-drop reverse of `up()`; the migration is append-only with the newest timestamp and matches the house idiom; the enum sits exactly where design §3 puts it."

#### Migration route — generator is broken, hand-written instead

The Leader authorized one **read-only** diagnostic (`migration:generate` diffs `information_schema`; it writes only a local file). It connected and **errored before producing anything**:

```
QueryFailedError: Table 'alliancereportingdb.orm_metadata' doesn't exist
...GENERATED_COLUMN diff attempted on 'active_agreement_id' in table 'bilateral_project_mapping'
```

Pre-existing drift on an unrelated table. The Reviewer **corroborated rather than trusted** this: `bilateral_project_mapping` / `active_agreement_id` is a real pre-existing table (`1779190000011-createBilateralProjectMapping.ts`) untouched by this diff.

Per the brief's fallback, the Implementer hand-wrote the migration on the `AddedTipIdKp1784211738931` idiom, timestamp `1786043523207` (> prior newest `1784211738931`).

**The `Disqualifies` clause is not tripped.** It targets a *generated* migration pruned into shape; nothing was generated and nothing pruned. The artifact contains exactly the 9 additive columns — narrows nothing, drops nothing, backfills nothing.

**Reviewer's independent safety check** (valuable because nobody will execute this migration before it runs on a shared DB): `1781101247756-createIaReportSchema.ts` creates `bulk_upload_processes` with only `id`, `file_name`, `ai_interaction_id` + audit columns, and **no other migration in the repo touches this table**. So all 9 `ADD`s target names that do not yet exist and all 9 `DROP`s target names that will. Both directions are safe by inspection.

Also resolved: entity declares bare `type: 'timestamp'` while audit columns are `timestamp(6)`. Non-issue — `deleted_at` in `AuditableEntity` uses the identical bare decorator and was emitted as `timestamp NULL` in the same table's create migration.

#### Decisions

- **D-T02-a — Hand-writing is the STANDING route for the rest of this spec.** T-03 and T-04 both prescribe generated migrations and will hit the identical broken generator. Leader decision: they are hand-written on the house idiom, with the same by-inspection verification the Reviewer applied here (target-table history check + `up()`/`down()` inverse check). Recorded so it is not rediscovered twice.
- **D-T02-b — `bigint` → `number` typing accepted as-is, flagged forward.** TypeORM maps MySQL `bigint` to a **string** property, so `total_results?: number | null` is a mismatch the compiler will believe. The Reviewer ruled it **not T-02's defect**: `id!: number` on this same entity and `created_by`/`updated_by` in `AuditableEntity` carry the identical mismatch, and neither §4.1 nor R-CBU-008 specifies the TS property type. Changing it here would make this the only entity in the codebase typed differently. **Carried forward into the T-05 and T-07 briefs** — see the owed-evidence register.

#### Owed evidence (blocks `[x]`)

| # | Command | From | Why owed |
| --- | --- | --- | --- |
| O-1 | `npm run migration:dev:execute` | `server/researchindicators/` | T-02 Done: migration applies cleanly on dev |
| O-2 | `npm run migration:revert` | `server/researchindicators/` | T-02 Done: migration reverses; existing rows unchanged |

Both require a supervised human session against the shared dev MySQL. See §4 *Owed DB evidence register*.

#### Advisory (4R lenses — recorded, non-gating, no rework, no new task)

- **⚠️ RELIABILITY / forward-flag to T-05, T-07, T-09 — `bigint` reads are strings, and this defeats T-07's own gate.** Two reinforcing causes: TypeORM maps `bigint` to a string property, **and** MySQL `SUM()` over an integer column returns `DECIMAL`, which mysql2 also yields as a string. So `total_participants` reaches the formatter as `"1234"`, and `"1234".toLocaleString()` returns `"1234"` — **not** `"1,204"`-style output. That silently violates §6.5's `en-US` thousands-separator rule while emitting no `NaN`, `Infinity`, `null`, `undefined`, or `Invalid Date` — i.e. **it survives every negative assertion T-07's `Disqualifies` clause requires.** Suggested: T-05 coerces with `Number(...)` at the raw-query boundary; T-07 adds one *positive* assertion that a value ≥ 1000 renders with a separator. *(This is in-scope for T-05/T-07 as already written — §6.5 already mandates the separators — so it is a briefing input, not scope growth.)*
- **RISK / spec-wide:** the migration generator is down against dev (`orm_metadata` missing + `bilateral_project_mapping` generated-column drift). Not this spec's to fix; it will block any future `migration:generate` in any spec. Addressed for this spec by D-T02-a.
- **READABILITY:** the entity spec keys off `propertyName` and never asserts `options.name`. They coincide for all nine, so nothing is wrong, but the entity↔migration contract is on the *column* name; one `expect(column.options.name).toBe(propertyName)` would make the dependency explicit.
- **RISK / design-level note, not a diff finding:** MySQL `timestamp` tops out at 2038-01-19 and is timezone-converted on read/write. `activity_start_date` / `activity_end_date` are calendar activity dates where `datetime`/`date` would avoid TZ shifting a boundary date by a day. The implementation correctly follows design §4.1 as written — **this is a note against the design**, surfacing in §6.5's date-range clause.

#### Final verification

Full server unit suite green (322 suites / 2066 tests), `tsc` clean, scope confined to the 4 files the task names. Coverage floor unaffected (`*.entity.ts`, `*.enum.ts`, `db/migrations/**` are coverage-excluded per src guide §9).

---

### T-03 — Config enums + non-throwing accessors + seed migration

- **Final status:** 🟡 **`[~]` — code PASS, DB evidence owed** (Reviewer `STATUS: PASS`, attempt 1 of 3)
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-009, R-CBU-004 (source 6)
- **Design refs:** §6.3, §4.3, DD-5
- **Implementer attempts:** 1
- **Skills assigned:** `nestjs-expert`, `error-handling-patterns` (as recommended — no deviation)
- **Effort:** **`high`** — *Leader deviation from the `medium` default.* Reason: this task's entire purpose is preventing a plausible-looking implementation (`try/catch` around a method that logs before it throws) whose defect is invisible in the return value. Under-thinking is the specific risk, so the dial went up rather than adding a skill.
- **Review lens mode:** lens checklist
- **Environment:** governed by the standing "write, don't apply" decision and D-T02-a (hand-written migration; generator broken).

#### Attempt 1

- **Files created/changed:**
  - `src/domain/entities/app-config/enum/app-config-catergory.enum.ts` *(modified — +1 subcategory, +2 fields; existing filename typo `catergory` deliberately preserved)*
  - `src/domain/shared/utils/env-app-config.util.ts` *(modified — private `tryGetConfig` + 2 accessors)*
  - `src/domain/shared/utils/env-app-config.util.spec.ts` *(new — this util had no spec before; coverage moves up)*
  - `src/db/migrations/1786044600000-insertCapdevBulkNotificationConfig.ts` *(new)*
- **Implementer verification** (from `server/researchindicators/`):
  - `npx tsc --noEmit -p tsconfig.json` → clean
  - `npx jest --silent env-app-config` → **6/6 passed**
  - `npm test -- --silent` → **323 suites / 2072 tests passed**
- **Reviewer verdict:** `STATUS: PASS` — "`tryGetConfig` is a genuine parallel path that never touches the throwing `getConfig`, and the absent-row tests assert both no-throw and no-error-log through a prototype seam I verified is live (`CgiarLogger.error` is a real prototype method), so the Disqualifies clause is met in substance and not vacuously."

#### Disqualifier adjudication — the seam was verified, not assumed

The gate is that the absent-row test must prove **no error-level log fired**; the returned value alone is identical for the forbidden implementation. That makes the whole gate rest on whether `jest.spyOn(CgiarLogger.prototype, 'error')` is a live seam — if `error` were an instance/arrow property, the spy would never fire and all six `not.toHaveBeenCalled()` assertions would pass **vacuously**. That is exactly KZ-001 (High, 4 prior recurrences), so the Leader made it the first scrutiny point.

Reviewer findings, verified at source:
- `CgiarLogger.error` is an ordinary class method — an own, writable, configurable property of `CgiarLogger.prototype` (`cgiar-logs/logs.util.ts:31-38`). Not an instance field, not an arrow property.
- `EnvAppConfigUtil` holds `new CgiarLogger(...)` as a field initializer (`:14`), and `this.logger.error(...)` resolves **through the prototype chain at call time** — so a spy installed in `beforeEach` intercepts an instance built later in the test body.
- **The counterfactual holds**, which is the real point: had the Implementer written `try { await this.getConfig(...) } catch { return {value:false, defaulted:true} }`, `getConfig` would have hit `this.logger.error(...)` at `:44-47` *before* throwing, and the spy assertion would **fail**. The assertion genuinely discriminates between the correct and the forbidden implementation.
- `tryGetConfig` (`:78-98`) is standalone: rebuilds `where`, calls `repository.findOne` directly. No delegation, no `try/catch`, no logger reference. Both accessors call only it.

#### Other verified findings

- **`is_active` — the seeded rows will be found.** `AuditableEntity.is_active` is `boolean, nullable: false, default: true` over `` `is_active` tinyint NOT NULL DEFAULT 1 `` (`1752097721168-addAppConfigTable.ts:8`). The seed omits the column, MySQL applies `1`, and TypeORM's `where.is_active = true` maps to `1`. Byte-for-byte the same filter the already-in-production `getConfig` uses. The "seeded row the accessor can never find → feature permanently unconfigurable" failure mode does **not** materialise.
- **Key strings byte-identical.** Accessor `getKey([...])` and the migration's local `.join('.')` both yield `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED` / `...CC_EMAIL`, matching §4.3.
- **`select: false` on `field` is harmless** — it suppresses the column from the SELECT list, not the WHERE clause, and neither accessor filters on or reads `field`.
- **Boolean parsing satisfies DD-5 in every branch:** absent → `false`, `'false'` → `false`, any unrecognised value → `false`. The fail-safe direction is correct throughout.
- **Reserved-word bug not propagated.** The `AddNewEnvCl` exemplar's `down()` uses unquoted `key` (a MySQL reserved word → syntax error) and string interpolation. The Leader flagged it in the brief; this migration uses backtick-quoted `` `key` `` and bound `?` parameters in both directions.

#### Decisions

- **D-T03-a — `is_active` left implicit in the seed**, having *verified* (not assumed) the DB-level `DEFAULT 1`. Matches the exemplars.
- **D-T03-b — the "unreadable config" half of R-CBU-009 is carried forward to T-09** (see advisory 1). Not fixed here: design §6.3, the binding contract for *this* task, scopes its constraint to the missing-row path only, and R-CBU-009 is jointly covered by T-03 + T-09.

#### Owed evidence (blocks `[x]`)

O-3 in §4 — `migration:dev:execute` + `migration:revert` against dev.

#### Advisory (4R lenses — recorded, non-gating, no rework, no new task)

1. **⚠️ RELIABILITY / forward-flag to T-09 — the "unreadable" half of R-CBU-009 is not implemented.** R-CBU-009 reads "Absent **or unreadable** config resolves to disabled", and this migration seeds that exact claim into the row's `description`. The code implements only the *absent* half: a rejected `repository.findOne` (DB/connection error) propagates out of `tryGetConfig`, contradicting its own JSDoc ("never raises") and the accessors' ("Does not throw"). **Failure direction is safe** — a throw can never mean "enabled" — which is why it does not gate. Resolution belongs to T-09: either add `.catch(() => null)` to the `tryGetConfig` return (one line, one test) **or** soften the two JSDoc claims and the seeded description to say "absent". Ordering consequence T-09 must weigh: with the flag read *after* `persistProcessMetrics` (§2.1), a throw here leaves metrics written but `notification_status` unwritten.
2. **RELIABILITY — no positive control proves the `errorSpy` can fire.** The seam is live today (verified above), but if `CgiarLogger.error` ever becomes an instance/arrow property, all six assertions go silently vacuous with a green suite — KZ-001 deferred rather than present. ~6 lines would pin it permanently: one case exercising `EMAIL_READINESS_LEVEL_7_TO()` against `findOne → null` and asserting the spy **was** called.
3. **READABILITY — `tryGetConfig` duplicates `getConfig`'s entire 15-line `where`-building block.** `getConfig` could delegate to it (`if (!config) { log; throw; }`) with identical behavior. Deliberately not raised as a FAIL issue: that edit touches the shared path used by `function-handler.service.ts:435`, outside T-03's file scope. Better as a follow-up than a rework.
4. **RISK — the key string is constructed twice** (accessor via private `getKey`, migration via a local `.join('.')`). They agree today and share the enum source, but would diverge silently if the separator changed — and an already-applied migration's `down()` would then delete a key nobody owns. An exported `buildAppConfigKey(...)` would collapse it, if a third seed migration ever needs one.
5. **OPERATIONS — `simple_value === 'true'` silently treats `'TRUE'`, `'1'`, `' true'` as disabled.** Correct as a fail-safe, but an operator flipping the kill switch by hand in MySQL gets no feedback that their value did not take. `.trim().toLowerCase() === 'true'` would remove the footgun without weakening the fail-safe.
6. **READABILITY — cosmetic:** malformed JSDoc brace at `env-app-config.util.ts:162` — `` `{ value, defaulted} ` `` should be `` `{ value, defaulted }` ``.

#### Final verification

Full server unit suite green (323 suites / 2072 tests), `tsc` clean, scope confined to the 4 files the task names. `EnvAppConfigUtil` is already provided and exported by `global-utils.module.ts`, so T-09 needs no wiring from this task.

---

### T-04 — Template enum, seeded `sec_template` row, on-disk mirror

- **Final status:** 🟡 **`[~]` — code PASS, DB evidence owed** (Reviewer `STATUS: PASS`, attempt 1 of 3)
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-007 (AC.4 + AC.6 verified statically here; AC.1/2/3/5 belong to T-08)
- **Design refs:** §4.2, §3, §6.5, DD-4
- **Implementer attempts:** 1
- **Skills assigned:** `nestjs-expert` (as recommended)
- **Effort:** **`high`** — *Leader deviation from `medium`.* Reason: this task silently fixes the Handlebars variable contract that T-07 and T-08 must both match, and its disqualifier is KZ-001, the spec's highest-severity Kaizen lesson.
- **Review lens mode:** lens checklist

#### Leader action — the approved copy was retrieved, not invented

The spec repeatedly cites "the approved copy" (design §4.2, R-CBU-007) without inlining it. Rather than let the Implementer compose plausible wording — which the mandatory D7 human review would then have rewritten, invalidating the migration and its byte-equality mirror — the Leader pulled the verbatim body from **Jira AC-1607** and passed it into the brief as the source of truth, with an explicit instruction not to "improve" the prose. The ticket's odd `"contact direct them to"` is approved text and was preserved deliberately.

#### Attempt 1

- **Files created/changed:**
  - `src/domain/shared/auxiliar/template/enum/template.enum.ts` *(modified — `CAPDEV_BULK_UPLOAD_SUMMARY = 'capdev-bulk-upload-summary'`)*
  - `src/domain/shared/auxiliar/template/template/capdev-bulk-summary.html` *(new — 30 lines, review/diff mirror; **never read by the running app**)*
  - `src/db/migrations/1786045516418-insertCapdevBulkSummaryTemplate.ts` *(new)*
  - `src/domain/shared/auxiliar/template/template/capdev-bulk-summary.template.spec.ts` *(new — the KZ-001 gate)*
- **Implementer verification:** `tsc` clean; `npm test -- --silent` → **324 suites / 2073 tests passed**.
- **Reviewer verdict:** `STATUS: PASS` — "closes its KZ-001 disqualifier with a genuinely load-bearing gate — the migration owns the single HTML literal, `up()` binds that exact identifier, and the spec imports it rather than re-declaring it."

#### KZ-001 adjudication — the gate is load-bearing, verified two independent ways

Anti-drift route **(b)**: the migration exports `CAPDEV_BULK_SUMMARY_TEMPLATE_HTML`; `up()` binds **that identifier** (not a copy) as the second parameter; the spec imports the same binding and compares it to the disk file.

- **Implementer's own mutation test:** appended one space to the `.html`, reran the spec → failed with a `toBe` diff naming the line; reverted → passed. *(First worker in this run to proactively prove a negative assertion can fail — the discipline KZ-001 asks for.)*
- **Reviewer's independent structural check** (did not trust the self-report): grep confirms **no second literal anywhere in `src`** — only the spec, the html, and two comment lines. Byte-equality confirmed by line count and line-for-line mapping, including the trailing newline (both sides are 30 newline-terminated lines), the two em-dashes, and the 300-char unwrapped metrics line. The classic off-by-one trailing-newline defect is **not** present.
- **Tooling cannot silently break it:** `.husky/pre-commit` is empty, and both `lint` (eslint, `.ts` only) and `format` (prettier, `.ts` only) exclude `.html`. Nothing will reflow that long line behind the gate's back.

#### The Handlebars variable contract — **binding input for T-07 and T-08**

T-04 defines it; T-07 must produce exactly these fields and T-08 renders them.

| Field | Meaning | Guarded |
| --- | --- | --- |
| `projectLeadName` | salutation (T-06's 3-tier chain, incl. `"Colleagues"`) | no — non-empty by contract |
| `trainingsCount` | e.g. `"12"` | no — group only dispatched when > 0 |
| `countries` | comma-joined names, or `"multiple countries"` | `{{#if countries}}` |
| `startDate` | e.g. `"March 2025"` | `{{#if startDate}}` — **also guards `endDate`** |
| `endDate` | range end | renders **only** inside the `startDate` guard |
| `participantsCount` | e.g. `"1,204"` | `{{#if participantsCount}}` |
| `percentageWomen` | number without `%`, e.g. `"58"` | **nested inside** `participantsCount` |
| `starLink` | full STAR CapDev URL | no |
| `tokenOwnerName` / `tokenOwnerEmail` | contact sentence (AC.4 needs both) | no |

**Two invariants are encoded in the template's nesting rather than in any type**, and T-07 must honour them or the sentence breaks grammatically while every type-check passes: `endDate` cannot render without `startDate`, and `percentageWomen` cannot render without `participantsCount` as its "of whom" antecedent.

#### Dangling-connector sweep — Reviewer walked all 8 combinations independently

The base text ends `…trainings conducted` with **no trailing space**, and every optional segment carries its own leading delimiter inside its guard. That one detail is what makes the whole matrix safe. Verified: no doubled spaces, no leading comma, no dangling `across`/`from`/`to`/`—`, sentence period outside all four blocks, all `{{#if}}`/`{{/if}}` pairs balanced. The all-absent case renders `"The records encompass 12 trainings conducted."` The specific space-before-comma risk (countries+dates off, participants on) does **not** occur: `conducted` + `, in which` = `conducted, in which`.

#### Decisions

- **D-T04-a — copy sourced from Jira AC-1607**, preserved verbatim including its awkward phrasing.
- **D-T04-b — two flagged copy deviations accepted.** `({{tokenOwnerEmail}})` is **mandated by AC.4** (name *and* email), not decoration. The plain-text `The Alliance of Bioversity and CIAT` sign-off substitutes for the ticket's signature **image**, which is not retrievable via the Jira API — routed to the D7 human gate.
- **D-T04-c — the spec→`db/migrations/` import is accepted as the least-bad option** inside the task's 4-file scope bound. Reviewer ruled it **not a defect**: append-only is preserved, coverage excludes `db/migrations/**`, TypeORM's loader ignores non-function exports, the migration *already* imports `TemplateEnum` from `src` (house style), and if migrations were ever pruned the break is a **compile error** — loud, not silently vacuous. Cleaner shape recorded as advisory.

#### Owed evidence (blocks `[x]`)

O-4 and **O-5** in §4. O-5 is notable: `_getTemplate` returning non-empty against dev is *the one claim static review cannot close*, and it doubles as the only proof that the live `sec_template.is_active` column really carries `DEFAULT 1` rather than merely being declared `default: true` on `AuditableEntity`. No `CREATE TABLE sec_template` migration exists in the repo — the table predates the migrations folder — so three working precedents (`WELCOME_EMAIL`, `INNOVATION_LEVEL_SEVEN`, `insertNewTamplate.ts`, all of which omit `is_active` and are read successfully in production) are the evidence, and they make it near-certain rather than proven.

#### Advisory (4R lenses — recorded, non-gating, no rework, no new task)

1. **⚠️ RELIABILITY / forward-flag to T-07 — `{{#if}}` on a pre-rendered string cannot distinguish `"0"` from absent; `"0"` is truthy.** `participantsCount: "0"` renders *"in which 0 participants took part"*, and `percentageWomen: "0"` renders *"— 0% of whom were women, a most noteworthy figure"* — a D7-grade embarrassment. §6.5 covers participants `0`/all-null but **not** participants > 0 with zero women, so this case is genuinely uncovered by the design. **The DTO contract must be "empty string when the clause should not render"**, written into `capdev-bulk-email-template.dto.ts` as a doc comment during T-07.
2. **⚠️ RELIABILITY / forward-flag to T-07 + T-08 — half-range dates.** `endDate` is guarded only by `{{#if startDate}}`, so a half-range input renders `"from March 2025 to."` — exactly the dangling-connector class T-07's own `Disqualifies` clause names. Not a T-04 violation (its scope treats "date range" as one clause; §6.5 assigns both-or-neither to the formatter), but **the template cannot self-defend**. T-07 must assert both-or-neither; T-08 should render a half-range input against the real file to prove the boundary rather than assume it.
3. **RISK — `{{{starLink}}}` disables escaping in both the `href` and the link text, for no benefit.** The value is env-derived so exposure is low, and design §9 relies on Handlebars escaping for `metadata.contacts[].email`, not the link — so no rule is broken. But inside an attribute `{{starLink}}` is strictly better: `&` → `&amp;` is the *correct* HTML serialization and decodes back to `&`, so the link behaves identically while a stray `"` can no longer terminate the attribute. Per Q1 (§15) the link carries a CapDev-tab query string, so `&` is the **expected** case, not hypothetical.
4. **READABILITY — the `.spec.ts` → `db/migrations/` edge is the only src→migration import in the repo.** The cleaner shape, at the cost of one file outside T-04's bound, is a `capdev-bulk-summary.template.ts` beside the `.html` exporting the constant, imported by *both* the migration and the spec — every edge then points migration→src. Worth revisiting if T-08 also needs the constant.
5. **RISK (future) — the gate proves disk == migration literal, not disk == the live `sec_template` row.** A later `updateCapdevBulkSummaryTemplate` migration, or a manual `UPDATE`, reopens the exact KZ-001 gap this task closed. Any future edit to this template must move the constant and update the mirror **in the same commit**.

#### Final verification

Full server unit suite green (324 suites / 2073 tests), `tsc` clean, 126 insertions across exactly the 4 in-scope files. Nothing in the diff makes the `.html` runtime-reachable — its only reader is `fs.readFileSync` inside a `.spec.ts`; production still goes `TemplateService._getTemplate` → `sec_template`.

---

### T-05 — Notification repository: four grouped queries + two writes

- **Final status:** 🟡 **`[~]` — code PASS on both review lenses, SQL-execution evidence owed (O-6)**
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-002, R-CBU-003, R-CBU-006, R-CBU-008
- **Design refs:** §6.1 (binding), §3, §11
- **Implementer attempts:** 1
- **Skills assigned:** `nestjs-expert`, `tdd` (as recommended — no Leader deviation)
- **Effort:** **`xhigh`** — Size L, correctness-critical SQL, three named Judgment-Day traps, and a `Disqualifies` clause aimed squarely at vacuous fixtures.
- **Review lens mode:** **parallel lens reviewers** (2 × Opus, `author ≠ auditor` on both axes — Implementer was Sonnet). Lenses: **reliability** and **risk/test-fidelity**. Both returned `STATUS: PASS`.

#### Leader ruling made *before* dispatch — the DB-less testing seam

`design.md` §11 asks the repository unit test to prove *"Q1 returns one row per `agreement_id` for an N-result group"*. No database is reachable: there is no local DB, and dev MySQL still lacks T-02's nine columns because that migration is written-but-not-applied. A jest-mocked repository returning a canned array proves nothing about a `GROUP BY` — that is **KZ-001** verbatim, the spec's highest-severity active lesson at recurrence 4.

The Leader resolved this in the brief rather than letting the Implementer discover it mid-task, mandating: (a) `createQueryBuilder` so the SQL is introspectable, never opaque `dataSource.query` strings; (b) an **exported pure** raw-row → group-DTO mapper, tested behaviorally on a fixture where one contract carries ≥3 results; (c) a **mandatory mutation test** — break the grouping, observe red, revert, observe green. Dialect substitution was explicitly ruled out (sqlite has no `ANY_VALUE` and differing `GROUP_CONCAT` semantics — a swap re-creates the very defect).

#### Leader-added trap not present in the spec

`design.md` §6.1 says the CapDev filter must be *"bound from `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`, never a literal `1`"*. The codebase contains **two** enum members with that exact name: `entities/indicators/enum/indicators.enum.ts` (`= 1`, correct) and `tools/open-search/prms/enum/rsult-type.enum.ts` (`= 5`). Importing the wrong one satisfies the spec's letter while silently filtering to the wrong indicator. The collision was passed into the brief; both Reviewers verified the correct import path.

#### Attempt 1

- **Files created (all new, 1,051 insertions, no deletions):**
  - `src/domain/entities/ai-reports/notifications/capdev-bulk-notification.repository.ts` *(420)*
  - `src/domain/entities/ai-reports/notifications/capdev-bulk-notification.repository.spec.ts` *(506)*
  - `src/domain/entities/ai-reports/notifications/dto/capdev-bulk-group.dto.ts` *(125)*
- **Implementer verification:** `tsc --noEmit` clean; `npm test -- --silent` → 325 suites / 2106 tests passed.
- **Leader independent re-verification** (both Reviewers noted they could not execute anything — read-only tool allowlists): re-ran from `server/researchindicators/` after both verdicts landed, with no agent active. `tsc` clean, **325 suites / 2106 tests / 1 snapshot passed, 18.9 s**. Matches the Implementer's report exactly.
- **Reviewer verdicts:** reliability `STATUS: PASS` — "all four named traps correctly handled… free of NULL/NaN/fan-out defects". Risk `STATUS: PASS` — "genuine defense-in-depth, not KZ-001".

#### The central adjudication — is the mutation test load-bearing, or KZ-001 in disguise?

The Implementer flagged this itself in `Not Done / Assumptions` and asked for it to be checked, which is the behavior the methodology wants. Its resolution: the QueryBuilder genuinely calls `.groupBy('ac.agreement_id')` **and** the mapper independently re-collapses by `agreement_id` in JS — a no-op against correct SQL, but the only thing a mutation test can exercise without a database.

The risk lens adjudicated this squarely and **rescued it on a specific finding**: `spec.ts:175-178` pins `.groupBy` to the literal `'ac.agreement_id'`, so the two defects have two distinct failing tests — dropping the SQL `GROUP BY` fails the *structural* test, dropping the JS collapse fails the two ≥3-row tests. The design's "mandatory" `GROUP BY` therefore remains load-bearing under test. The Reviewer stated it would have **failed the task had that structural assertion been absent**, which is the right bar.

`Disqualifies` clause **satisfied**: two fixtures carry three rows under one `agreement_id`. The 3-contract → 3-groups tests are built on one-row-per-contract fixtures and could not distinguish correct grouping alone — but the clause targets the collapse test, and that one complies.

#### Convergent finding — the reason this task is `[~]` and not `[x]`

**Both Reviewers, working blind to each other, independently identified the same defect as their highest-risk item and proposed the same one-line fix.** Two independent auditors converging on one specific suspected runtime throw is the strongest signal this run has produced. Recorded as **O-6** in §4.

Neither could execute MySQL to confirm it, and neither escalated it to a FAIL — correctly, since `design.md` §6.1 does not mandate the `ORDER BY`, PR 2 is dead code, and the flag ships `false`. But the pairing with the reliability lens's second finding is what decides the checkbox: **no test in the suite ever compiles SQL.** The mocks only prove a string was handed to a `jest.fn()`, so a column typo, a bad alias, an `ONLY_FULL_GROUP_BY` violation, or O-6 itself all pass green. The four queries are, as written, entirely unverified *as SQL*.

This is the same class of gap that holds T-02, T-03 and T-04 at `[~]`, and it is treated identically.

#### Decisions

- **D-T05-a — the defensive JS re-collapse is accepted as in-scope.** A raw-row → group-DTO mapper must exist regardless (Q1 returns ~20 aliases plus the multi-primary CSV); the only increment is keying the accumulator by `agreement_id` rather than pushing to an array — roughly four lines. Not unrequested code of consequence. It carries a maintenance tax, recorded as advisory R6.
- **D-T05-b — tie-break implemented on both sides, deliberately.** The decision is SQL-side (a correlated subquery restricting `rc.result_contract_id` to `MIN(rc2.result_contract_id)` inside the join `ON`); the warning and the defensive collapse are mapper-side. The reliability lens verified the subquery is correctly correlated to the right outer row, admits exactly one `rc` row when an active primary exists and zero when none does — and that the zero case is precisely what Q4 picks up, so no row is silently dropped. It also confirmed TypeORM's alias replacement cannot corrupt it (`rc2`/`rc_dup` have no registered metadata; the `rc.` regex cannot match `rc2.`).
- **D-T05-c — Leader deviation from the diff-inline rule, recorded.** `/akili-execute` Step 2.3 requires the git diff inline because a wrapper-restricted Reviewer has no `Bash` to regenerate it. With 1,051 lines of pure additions and two parallel Reviewers, inlining would have cost ~30k output tokens to convey files the Reviewers can `Read` directly. The diff was written to a scratchpad file and both Reviewers were pointed at it *and* at the three source paths. The rule's intent — the Reviewer has access to the exact change set — is satisfied; its literal form is not.
- **D-T05-d — `caveman` not loaded for the briefs.** The command directs loading it for transient inter-agent output. For an `xhigh` correctness-critical task whose brief carries four named traps and a testing-seam mandate, clarity was judged to outweigh compression. Deviation recorded rather than taken silently.
- **D-T05-e — Implementer `Not Done` items 2–5 resolved, none carried as owed scope.** `total_results` (item 2) is an all-indicators count no T-05 query computes and design assigns to T-09 orchestration — out of scope, not a gap. DTO snake_case naming (item 3) matches design prose and house convention; it is a forward contract for T-06/T-07, flagged below. The raw-table-name `sec_users` join (item 4) was verified correct by **both** lenses against the real precedent at `result-status-workflow.repository.ts:95`. Item 5 is a scope-compliance confirmation.

#### Forward-flag to T-06 / T-07 — the consuming contract

`capdev-bulk-group.dto.ts` fixes snake_case field names (`agreement_id`, `project_lead_description`, `pi`/`ra`/`pa`/`token_owner`). T-06's builder and T-07's formatter must consume exactly these. This is the Implementer's choice, made before either consumer existed — if T-06 wants a different shape, change it there and then, not after T-08 has also bound to it.

#### Advisory (4R lenses — recorded, non-gating, no rework, no new task)

Per `/akili-execute` §2.4, none of these may become a task in this spec. They are recorded and, apart from O-6's evidence obligation, they die here unless the user elects to reopen scope.

**Reliability lens (8):**

1. **⚠️ `GROUP_CONCAT(DISTINCT … ORDER BY …)` — see O-6.** Highest-value item. Cheapest fix: delete ` ORDER BY bur.result_id`; the ordering is required by nothing, since the mapper iterates the CSV and each warning logs individually.
2. **No test compiles SQL** — see the checkbox rationale above. Suggested mitigation: build the QueryBuilder against a non-connected `DataSource` and assert on `.getQuery()`. *(Leader note: this would catch typos and bad aliases but **not** O-6 — `.getQuery()` emits a string, it does not invoke MySQL's parser. It narrows the gap; it does not close it.)*
3. **Q3's `GROUP_CONCAT` runs at the default `group_concat_max_len` of 1024 bytes** and truncates silently mid-word. This codebase already treats that default as a hazard — `reports/repositories/star-results-export.repository.ts:47-51` raises it to 4 MB with `SET LOCAL`. A group spanning ~30+ country names would hit it.
4. **Asymmetric `is_active` filtering** — Q3 filters `rcty.is_active = TRUE`; Q2 does not filter `rcs.is_active`, so a soft-deleted `result_capacity_sharing` row still contributes participants and date bounds. Not mandated either way by §6.1, but the inconsistency between adjacent queries is a latent wrong-number path for R-CBU-006.
5. **`updateNotificationStatus` enforces nothing about R-CBU-008 AC.4** (`notification_sent_at` null whenever status is `SKIPPED`) — it rests entirely on T-09 calling it correctly. A one-line normalisation at the persistence boundary would make AC.4 true by construction.
6. **Double-log risk at the T-05/T-09 seam** — `findGroups` both emits the multi-primary warn *and* returns `multiPrimaryWarnings`, while T-09 is scoped to "every §10 log line". Ownership should be settled before T-09, not after. Related: §10 wants the line to name the contract chosen by the tie-break, and the query never selects the winning `result_contract_id`.
7. **`persistProcessMetrics` spreads a fully-optional interface into `update`** — an all-undefined payload makes TypeORM throw *"Cannot perform update query because update values are not defined"*.
8. **Q4 can return duplicate `result_id`s** if one result appears on more than one `bulk_upload_results` row (`bur.id` is the PK, `result_id` is not unique). Its three exclusion filters are also present but unasserted by any test, unlike `findGroups`.

**Risk lens (6):**

- **R1 — O-6**, above. Recommended by this lens as an owed-evidence item rather than rework; adopted.
- **R2 — a hole narrower than the one R-CBU-002 AC.3 exists to close.** Q1's spine inner-joins `agresso_contracts`, but Q4 filters only on `rc.result_contract_id IS NULL`. A result whose active primary contract has no `agresso_contracts` row falls out of Q1 and is reported by **neither** — no email, no warning.
- **R3 — `toNumber` coerces an unparseable Q4 id to `0`**, so a malformed row logs as `result_id=0`, a plausible-looking but nonexistent result. `toNullableNumber` + filter would fail visibly.
- **R4 — the one real pocket the mock hides:** nothing pins `MULTI_PRIMARY_RESULT_IDS_SELECT` into Q1's select list. If a refactor drops that `addSelect`, `multiPrimaryWarnings` goes permanently empty and every test still passes, because the behavioral warning test injects the column through the mock. Same for the `:isActive` binding.
- **R5 — `spec.ts:295-302` is behaviorally identical to `spec.ts:246-249`** and its comment cites "the implementer's report", which is not a durable repo artifact. Adds no coverage.
- **R6 — the JS re-collapse is a no-op in production**, so a future maintainer who correctly reasons "the SQL already groups, this Map is redundant" gets two red tests describing impossible behavior. The doc comment should state plainly that the SQL `GROUP BY` is the production mechanism, the Map is a test-observable safety net, and `spec.ts:175-178` is the actual gate.
- **Test hygiene:** `jest.spyOn(…, '_warn')` has no `mockImplementation`, so it calls through and prints a real WARN line on every green run — against the "green costs one line" contract in `tasks.md` §4.

#### Post-review follow-up — user overrode the advisory rule on the convergent finding

`/akili-execute` §2.4 says an advisory is recorded and never triggers rework. The Leader therefore did **not** act on the `GROUP_CONCAT` finding, and instead escalated it with the two other options (leave as O-6; run the dev-DB session). **The user chose to fix it now**, which is the user's prerogative to override — recorded here rather than applied silently.

- **Scoped Implementer, effort `medium`, single-line deletion.** Before: `') > 1 THEN bur.result_id END ORDER BY bur.result_id)'` → after: `') > 1 THEN bur.result_id END)'`.
- No spec assertion referenced the removed clause (the QueryBuilder is mocked, so no test compiled the SQL) — no test changes were required, which is itself a restatement of the underlying gap.
- Verified: `tsc` clean, `npm test -- --silent` → **325 suites / 2106 tests**, unchanged.
- **O-6 is narrowed, not closed.** The suspected parser rejection is gone; "the four queries have never been executed as SQL" still stands and still blocks T-09/T-10.

#### Budget tripwire — **FIRED**, escalated to the user, re-baseline accepted

`design.md` §14 budgets the whole 12-task spec at ~1,450 LOC (≈750 production, ≈700 tests).

| | Budgeted | Actual |
| --- | --- | --- |
| T-01 … T-04 (PR 1) | ~450 | **812** |
| T-05 | — | **1,051** (545 production / 506 tests) |
| **Running total, 5 of 12 tasks** | ~1,450 *(all 12)* | **1,863 — 128%** |
| PR 2 (T-05 … T-08) | ~600 | 1,051 after **one** of four tasks |

Per `/akili-execute` §2.4 the Leader **stopped and escalated rather than advancing to T-06**. Leader's read, offered as a hypothesis and not a finding: this is a mis-sized estimate rather than runaway scope. The production side is four grouped SQL builders plus a shared spine and two writes — plausibly what "Size L" means, against a ~750-LOC production budget covering *all twelve* tasks. The test side is where the DB-less constraint bit: proving grouping without a database required a structural layer *and* a behavioral mapper layer, roughly double what one integration test would have needed.

**User decision: accept and re-baseline.** `design.md` §14 is revised to **~4,600** with the full basis recorded in the new §14.1; `tasks.md` §1 and §3 are swept to match. The hypothesis above was accepted without a bloat audit — recorded as such, since it was not independently tested. The tripwire is re-armed against the new figure and will fire again if actuals exceed it.

#### Final verification

`tsc --noEmit` clean; full server unit suite **325 suites / 2106 tests / 1 snapshot green** (18.9 s), re-run independently by the Leader from `server/researchindicators/` after both verdicts, with no agent active. 1,051 insertions across exactly the 3 in-scope files; `git status` shows nothing else touched. `npm run lint` deliberately **not** run — it carries `--fix` and mutates files outside the review surface; deferred to the pre-PR gate (`tasks.md` §8).

---

### T-06 — `capdev-recipients.builder.ts` (pure)

- **Final status:** ✅ **PASS** (Reviewer verdict, attempt 1 of 3)
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-003, R-CBU-004
- **Design refs:** §6.4
- **Implementer attempts:** 1
- **Skills assigned:** `tdd` (as recommended — no Leader deviation)
- **Effort:** `high` — pure, but the rule table is where defect class D1 lives (wrong recipients, cross-project CC leak), and R-CBU-003 AC.4's tier ordering is only testable if the tiers are genuinely ordered rather than coalesced.
- **Review lens mode:** lens checklist (single Reviewer)

#### Ran in parallel with T-07 — and the constitution says that is unsafe

Root `CLAUDE.md`: *"Cross-package parallelism (one server task + one client task) is safe; two tasks in the same package are not."* The user asked for T-06 ‖ T-07, both server tasks.

**Leader resolution:** the source files are genuinely disjoint; the only real collision is the test runner (shared `node_modules` and jest cache, where a concurrent full-suite run yields a *wrong* result, not a slow one). So each Implementer was instructed to run **only its own spec file** and explicitly forbidden `npm test` and `npm run lint`; the Leader ran the full suite **once, serially, after both reported**. Both modules are new with no importers, so blast radius was nil until that run. **KZ-003** is satisfied at the Leader level rather than per-worker: full suite went 325 → **327 suites**, 2106 → **2142 tests**, exactly +12 (T-06) +24 (T-07). Reviewers ran concurrently without restriction — they are read-only and contend for nothing.

#### Attempt 1

- **Files created:** `capdev-recipients.builder.ts`, `capdev-recipients.builder.spec.ts`
- **Signature:** `build(group, fileContacts, sprmEmails, configuredCc) → { to, cc, salutation } | null`
- **TDD evidence:** genuine red first — spec run before the module existed failed `TS2307: Cannot find module`. Then 12 tests green.
- **Reviewer verdict:** `STATUS: PASS` — verified the disqualifier **in the spec file itself rather than from the report**, and extended the check to the module: its sole import (`cleanName`/`cleanText`) pulls only a TypeORM *type*, erased at compile time. Purity holds on both sides.

#### What the Reviewer actually verified

- **`to` is structurally incapable of holding a non-PI address** — `to: [piEmail]` is the single write, sourced only from `group?.pi?.email`; nothing reads `cc` back. No backfill path exists.
- **The §6.4 asymmetry is two independent code paths** — the address gate is an early `return null`; the salutation is resolved separately and neither consults the other.
- **Salutation is an ordered chain, not a coalesce**, and a *blank-but-present* tier-1 name falls through correctly rather than producing a whitespace salutation.
- **Sanitisation order is literally normalise → validate → drop-if-in-`to` → dedupe**, with dedupe genuinely after the drop, both comparisons via `trim().toLowerCase()`.
- **Contract partitioning is fail-closed** — a non-empty code matching nothing is excluded from *every* group, so the dangerous direction (a scoped contact leaking cross-group) is impossible.
- **Test non-vacuity checked case by case**, not counted: the dedupe fixture carries three real casing variants across three sources and asserts `toEqual`, so it fails on broken dedupe, on case-sensitive dedupe, *and* on wrong-casing output.

#### Decisions

- **D-T06-a — the local `CapdevRecipientFileContact` interface is accepted, with a recorded hole.** The Implementer typed `fileContacts` locally rather than importing `AiContactDto`, to keep the pure module free of a `results` dependency. The Reviewer ruled the direction sound and not a spec deviation (neither T-06 nor §6.4 binds the parameter type) — but found it provides **zero drift protection**: both fields are optional, so `{}` satisfies the interface and *any* object is assignable. If T-01's `AiContactDto` renamed `contract_code`, T-09 would still compile and contract scoping would silently degrade to broadcast-to-every-group. It also corrected the Leader's premise: `ai-reports` **already** imports from `results` (`entities/bulk-upload-results.entity.ts:11`), so the module-boundary argument is weaker than the code comment implies. Recorded as advisory, not rework.

#### Advisory (recorded, non-gating, no rework, no new task)

1. **RISK — `contract_code` matching is case-sensitive** while emails are matched case-insensitively, and both arrive from the same user-supplied file. `"abc-123"` against agreement `"ABC-123"` is silently dropped from every group. Fail-closed, no spec text mandates otherwise, but the inconsistency will read as a bug later.
2. **RISK — the drift hole above closes in one line** with a type-only conformance check in the spec (`import type { AiContactDto }` + an assignability assertion). Runtime purity untouched; a rename then breaks the build instead of silently broadcasting.
3. **⚠️ RELIABILITY / forward-flag to T-09 — the debug log for dropped recipients has no owner.** Design §10 specifies a `recipient dropped | debug | the dropped raw value` signal and R-CBU-004 AC.4 requires it, but §6.4 fixes the return shape as `{to, cc, salutation}`, which carries **no record of what was dropped**. T-09 can only recompute the drop set by diffing its inputs against `cc`, which conflates invalid-address drops with dedupe drops. Not a T-06 defect — the signature is what the design binds — but T-09 must not discover it late.
4. **RELIABILITY — two rule-table cells implemented but unexercised**, which sits awkwardly against the disqualifier's own rationale ("pure by design precisely so its rule table can be exhausted"): a whitespace-only PI email (R-CBU-003 AC.3 says "null/blank"; only null is tested), and a blank-but-present tier-1 name. Also unasserted: the R-CBU-004 CC source ordering (RA → PA → file → SPRM → configured), which the code honours but no test would notice being reordered.
5. **READABILITY / D7 human-copy check — `cleanText` lowercases** (`object.utils.ts:126-128`), so a tier-2 salutation renders as *"Dear fallback description,"*. Conformant — §6.4 names `cleanText` explicitly — but it should land on the D7 gate rather than surprise a Project Leader.
6. **READABILITY — interior padding survives:** `first_name: '  Jane  '` + `last_name: 'Doe'` yields `'Jane   Doe'`.
7. **READABILITY — the export is the bare name `build`**, which reads as nothing at T-09's call site and would have collided with T-07 had it followed the same pattern. §6.4 writes `build(...)` as signature shorthand, not as a binding export name.

#### Final verification

`tsc` clean · full suite **327 suites / 2142 tests** (Leader, serial) · `npm run lint -- --quiet` **zero errors** after the formatting pass.

---

### T-07 — `capdev-metrics.formatter.ts` (pure)

- **Final status:** ✅ **PASS** (Reviewer verdict, attempt 1 of 3) — **with a spec gap escalated to the user, see below**
- **Date:** 2026-08-06
- **Requirements covered:** R-CBU-006
- **Design refs:** §6.5, DD-4
- **Implementer attempts:** 1 (+1 scoped follow-up for a lint error)
- **Skills assigned:** `tdd` (as recommended — no Leader deviation)
- **Effort:** `high` — the two inherited T-04 defects both type-check cleanly and still break the email.
- **Review lens mode:** lens checklist (single Reviewer)

#### Attempt 1

- **Files created:** `capdev-metrics.formatter.ts`, `capdev-metrics.formatter.spec.ts`, `dto/capdev-bulk-email-template.dto.ts`
- **Signature:** `formatCapdevMetrics(metrics: CapdevBulkMetricsDto, countryNames: string[] | null | undefined): CapdevMetricsTemplateFields`
- **TDD evidence:** genuine red first (`TS2307`), then 24 tests green.
- **Reviewer verdict:** `STATUS: PASS`.

#### The two inherited T-04 defects — both verified closed by exhaustion, not sampling

1. **`"0"` truthiness.** `participantsCount` is only ever assigned inside the branch where `toPositiveFinite` returned `> 0`, so it cannot be `"0"`; every other path returns `''`. `percentageWomen` is `percentage > 0 ? String(percentage) : ''` — and since `NaN > 0` is `false`, this incidentally absorbs `NaN` too.
2. **Half-range dates.** `startDate`/`endDate` are assigned in exactly one place, the destructure of `formatDateRange`, which returns the pair **atomically**. There is no second write path — the invariant is structural, not conventional.

The Reviewer also traced every negative assertion to the guard it targets and confirmed each would go red if that guard were deleted (e.g. removing `toPositiveFinite` yields `"NaN"`; removing the `Number.isFinite` check yields `"Infinity"`). It noted `expect(x).not.toMatch(re)` **throws** on a non-string, so the sweep catches a literal `undefined` rather than passing over it.

#### The adjudication — the Reviewer split the question rather than answering it flatly

The Leader flagged that the Implementer extended suppression beyond R-CBU-006's text (which names exactly one trigger: *"omitted… when the participant total is `0`"`*) to cover any percentage that **rounds** to zero. The Reviewer's ruling:

- **`female == 0`, `participants > 0` → sound (a).** Forced by the copy, not taste: T-04's template hardcodes `— {{percentageWomen}}% of whom were women, a most noteworthy figure`, so rendering `0` yields *"— 0% of whom were women, a most noteworthy figure"*. Exactly the render DD-4 exists to make an enumerable TS branch.
- **`0 < female` but rounds to 0 → a genuine spec gap (c), escalate, do not rework.** *"Narrowing to the literal requirement produces a worse artifact, not a compliant one… A FAIL whose remediation is 'restore the embarrassing render' is a reviewer forcing a regression to satisfy a literalism."*

Two facts moved it off FAIL: the extension is **documented, not silent** (stated in the DTO's binding contract at `capdev-bulk-email-template.dto.ts:56-63`) and the test is **named for what it is** ("rounds to zero"). It is reviewable behavior sitting in a spec gap, not smuggled behavior — but *"a test is not a requirement"*, and it must not stay that way.

**The risk the Reviewer named, which the Leader had not:** the error direction. Suppressing a sub-1% women's share silently **flatters** the data for a gender-sensitive reporting organization. The honest-and-non-embarrassing option is a `"<1"` floor clause — which needs a copy change in T-04's template and is therefore a spec-owner decision.

#### Follow-up — lint error, repaired in scope

`npm run lint` left one hard error (`'key' is assigned a value but never used`, `capdev-metrics.formatter.spec.ts:32`) — the same spot the Reviewer independently flagged as *"a comment promising an assertion that is not there"*: `assertNoForbiddenTokens` documented the empty-string-not-zero contract but its loop only ran `FORBIDDEN_PATTERN`. The unused `key` was the symptom of an assertion never written.

Repaired by making the helper **enforce what its comment claimed** (a `GUARDED_FIELDS` set + `expect(value).not.toBe('0')`), not by renaming to `_key` — which would have silenced the linter while leaving the helper lying. **Correctness detail the Leader put in the brief:** `trainingsCount` is legitimately allowed to be `"0"` because it is *unguarded* in the template (`{{trainingsCount}} trainings conducted`); applying the check uniformly would have broken a passing test for the wrong reason. Verified excluded.

#### Decisions

- **D-T07-a — `timeZone: 'UTC'` accepted, with the caveat recorded.** `result_capacity_sharing.start_date`/`end_date` are `@Column('timestamp')` (instants), and the TypeORM MySQL config sets no `timezone`, so mysql2 parses against the Node process TZ. UTC is *deterministic but not unconditionally faithful*: exactly right on a UTC-deployed container, and it can shift a month boundary backwards for a value written as local midnight in a UTC-positive zone. Nothing in the spec pins this; the code states the assumption honestly.
- **D-T07-b — the DTO seam is clean for T-08.** The 10-field contract matches T-04's template variable-for-variable (verified against `capdev-bulk-summary.html`), and `CapdevMetricsTemplateFields` picks the six T-07 owns, leaving `projectLeadName`/`starLink`/`tokenOwnerName`/`tokenOwnerEmail` for T-06 and T-08 to spread in.

#### Advisory (recorded, non-gating, no rework, no new task)

1. **⚠️ RISK — escalate the rounds-to-zero rule into R-CBU-006.** Currently `capdev-metrics.formatter.spec.ts:115` is the only place this behavior is written down. Decide between suppression (current) and a `"<1"` floor clause (needs T-04 template copy). **Pending user decision.**
2. **⚠️ RISK — no upper clamp on `percentageWomen`.** If `SUM(female)` exceeds `SUM(participants)` — possible when a row records `session_participants_total = 0` alongside a non-zero female count — the email renders *"— 150% of whom were women, a most noteworthy figure"*. The same defect class this module exists for, at the other end of the range, covered by no requirement.
3. **⚠️ FORWARD-FLAG to T-08 — a contradiction inside R-CBU-006 that T-07 resolved correctly.** The metric table says countries render `"multiple countries"` when the set is empty (§6.5 agrees; T-07 implements it), but the "Degenerate metrics" **scenario** says the body omits the *country* clause too. These cannot both hold. T-07 followed the binding design. **T-08's rendered-body test for the degenerate scenario must expect `"across multiple countries"` to be present, or it will fail against a correct formatter.** The requirements sentence is what is wrong — see §6 below.
4. **RELIABILITY — the negative sweep runs on one fixture.** `assertNoForbiddenTokens` is invoked only in the degenerate-scenario test; applying it to every case (or via `afterEach`) would make the gate hold for cases added later, at near-zero cost.
5. **RELIABILITY — countries are filtered on trim but joined untrimmed.** `"Kenya"` and `"Kenya "` survive as two distinct entries and the join carries the trailing space.

#### Final verification

`tsc` clean · full suite **327 suites / 2142 tests** (Leader, serial) · `npm run lint -- --quiet` **zero errors**.

---

### T-04 + T-07 — OD-2 amendment (the `"<1%"` floor clause)

- **Status:** PASS — 1 Implementer attempt, 2 parallel lens Reviewers, both PASS.
- **Date:** 2026-08-09
- **Requirements covered:** R-CBU-006 (amended — the *Women-percentage rule*, AC.7, AC.8), R-CBU-007 (template copy)
- **Attempts:** 1

**Why two Reviewers.** The diff touches a **migration** — a listed trigger for parallel-lens mode in `/akili-execute` §2.3 — and it amends code that had **already passed review**, so the prior PASS no longer covered the tree. Lens A: spec conformance (gate) + reliability. Lens B: risk + test fidelity. Both on T3, both independent of the T2 Implementer.

**Files changed (5):** `capdev-metrics.formatter.ts` (rule + JSDoc) · `capdev-bulk-email-template.dto.ts` (contract rewritten) · `capdev-bulk-summary.html:16` · `1786045516418-insertCapdevBulkSummaryTemplate.ts` (literal, in place) · `capdev-metrics.formatter.spec.ts` (rewrote the stale "rounds to zero" test, +5 cases).

**Rule as landed:**

```ts
const percentage = (female / participants) * 100;   // un-rounded
if (!(percentage > 0))    percentageWomen = '';
else if (percentage < 1)  percentageWomen = '<1%';
else                      percentageWomen = `${Math.round(percentage)}%`;
```

**Verification.** Implementer: formatter suite red→green (5 failing before the fix, 28/28 after), byte-equality 1/1, full suite **327 suites / 2146 tests**, `tsc` clean. `npm run lint` withheld during the task (carries `--fix`); Leader ran it after review — see below.

#### What the review bought that the green suite did not

- **The `p === 1` boundary is float-safe for *every* integer pair, not just the fixture.** An exact 1% share requires `participants = 100 × female`, so `p` is always `double(0.01) × 100`. `double(0.01)` exceeds 0.01 by ≈2.08e-17, under the half-ULP at 1.0 (1.11e-16) — the product is exactly `1.0`. The boundary is tested *on* the boundary, not near it. Lens B checked the other fixtures the same way (`4/1240`, `6/1000`, `698/1204`, `37/100`) — all far from both `0.5` and `1`, so last-bit wobble changes nothing.
- **`"0%"` is now structurally unreachable**, not merely unasserted: `Math.round` runs only on the `p >= 1` branch, so the minimum rendered figure is `1%`. AC.8's negative assertion is guaranteed by construction.
- **D-OD2-a is pinned on both sides, mutation-checked.** Lens B mutated the branch six ways: `round(p) === 0` → red at `:159`; `p < 0.5` → red at `:159`; `p <= 1` → red at `:170`; dropping the `%` → red at `:131`/`:140`; `'<1%'`→`'0%'` → red at `:149`/`:159`. The decision is recorded in a test that **actually fails on its violation** — which is the defect class OD-2 was raised against, now closed rather than relocated.
- **The byte-equality gate is a real raw comparison.** `capdev-bulk-summary.template.spec.ts` does `expect(diskHtml).toBe(CAPDEV_BULK_SUMMARY_TEMPLATE_HTML)` — no `trim`, no whitespace collapse, no CRLF normalization — and imports the constant from the migration module, so it compares the exact value `up()` binds as its `?` parameter. The HTML contains no backtick and no `${`, so the untagged template literal is a byte-faithful carrier. Lens B additionally verified the two long edited lines by anchored fixed-form grep (head and tail patterns, 2 hits each — one per file), independently of the test.
- **Neither `lint` nor `format` can silently reformat one side:** both are scoped to `*.ts`; `.husky/pre-commit` is empty and there is no lint-staged config. Editor format-on-save on the `.html` is the one drift vector, and it turns the gate **red** — intended behavior.
- **Copy reads correctly in all four states**, including `…took part.` with a clean sentence end when the women clause is absent, and no dangling comma or double space where the praise tail was removed.

#### ⚠️ The finding that outranks both PASSes — and the Leader adjudication of a Reviewer disagreement

**Both lenses independently found it: Handlebars HTML-escapes `{{percentageWomen}}`, so the rendered body contains `— &lt;1% of whom were women`, not `— <1% of whom were women`.**

The behavior is correct on the wire — a mail client displays `<1%`. The defect is in **the spec text written earlier the same day**: `requirements.md` AC.7 and `tasks.md` T-08's OD-2 binding correction both quote the **unescaped** form. An Implementer following either literally writes `expect(body).toContain('— <1% of whom were women')` and gets a **red test against a correct template**. This is the OD-1 trap class, re-armed by the OD-2 amendment itself — and it did not exist before it, because the prior value `"58"` contains no escapable character.

**The two Reviewers proposed opposite fixes.** Lens A offered switching the slot to `{{{percentageWomen}}}`, reasoning the value comes from a closed formatter-controlled set (`''` | `'<1%'` | `'N%'`) with no user input, and noting the template already triple-staches `starLink`. Lens B stated the opposite in its advisory: *"the double stache is the right choice and a future switch to `{{{percentageWomen}}}` would be a defect."*

**Leader ruling: Lens B is right; keep the double stache and fix the contract text (Lens A's option (a)).** The safety argument is sound but answers the wrong question — the risk is not injection, it is **HTML validity**. A literal `<` in HTML text content must be escaped; emitting a raw `<1%` produces technically invalid markup that survives only because `<1` cannot begin a tag name, leaving the rendering at the mercy of whatever sanitizer a mail client applies. `&lt;1%` is the correct wire representation and renders exactly as intended. The fix is therefore **documentation-only, no code change** — which is also the strictly lower-risk of the two, since the alternative would have altered a shipping template on a reasoning error.

**Recorded as D-OD2-c.** The copy choice itself (`"<1%"` over e.g. `"fewer than 1%"`) is the spec owner's, made at the OD-2 gate, and is **not** reopened by this — the escaped form renders identically to the reader.

**Contract edits made by the Leader as a consequence** (not Implementer rework — this is Leader-authored text being corrected):

1. `requirements.md` AC.7 — restated against the escaped body, with the reason inline so it is not "simplified" back.
2. `tasks.md` T-08 — the OD-2 binding correction now names the escaped form, and its two rendered-body tests are marked **blocking**, not owed. Rationale from Lens B's second advisory: **D-OD2-b is a cross-file invariant with no gate.** Byte-equality couples disk↔migration; nothing couples either to the formatter. Re-adding `%` to the template yields `58%%`; removing it from the formatter yields `— 58 of whom were women`. Neither goes red until T-08's rendering tests exist.

#### Advisory (recorded, non-gating, no rework, no new task)

1. **READABILITY (formatter JSDoc)** — "a non-finite `percentage` is absorbed into the suppressed branch for free" over-generalizes from `NaN`. `+Infinity > 0` is true, so `+Infinity` would reach `Math.round(Infinity)` → `"Infinity%"`. Unreachable today (both operands pass `toPositiveFinite`), and identically unreachable before this diff — but the sentence would mislead whoever relaxes that guard. Narrowing to "a `NaN` percentage" would make it exactly true.
2. **READABILITY (DTO contract)** — flagged by **both** lenses: "Empty (`""`) **only** when the un-rounded share `p` is `<= 0`" is not exhaustive; it is also empty when the participants clause is absent. The preceding nesting sentence covers it contextually, so T-08's briefing risk is low.
3. **RELIABILITY (pre-existing, not introduced here)** — the claim that `participantsCount` can never be `"0"` holds for integer sums, but `toLocaleString('en-US')` defaults to 3 fraction digits, so a positive-finite fractional value below `0.0005` would format as `"0"` and truthily render the participants clause. Unreachable through the repository's `SUM` over integer columns.
4. **RESILIENCE** — the byte-equality gate is line-ending sensitive by design, and the repo has no `.gitattributes`. A Windows checkout with `core.autocrlf=true` would CRLF the `.html` while the migration literal stays LF, failing the test for a non-defect reason. Not worth acting on for a macOS/Linux team; worth `*.html text eol=lf` if CI ever runs on Windows.
5. **Still open, unchanged by this amendment** — no *upper* clamp on `percentageWomen` (`SUM(female) > SUM(participants)` renders e.g. `"150%"`). Deliberately out of scope; no task minted from it.

#### Decisions

- **D-OD2-c — the double stache stays; the contract text is what was wrong.** Escaping is correct HTML; `&lt;1%` renders as `<1%`. Reviewer disagreement adjudicated on HTML validity, not on injection risk.
- **D-OD2-d — T-08's two OD-2 rendered-body tests are blocking, not owed.** They are the only gate that couples the formatter's output to the template's copy; without them, D-OD2-b is enforced by nothing.

#### Implementer `Not Done / Assumptions` — adjudicated, no scope owed

Three items, all disclosure rather than outstanding work: (1) four modified spec `.md` files correctly identified as the Leader's amendment authoring, confirmed by `git status` (4 docs Leader, 5 code files Implementer, nothing else); (2) scope discipline held — no upper clamp, no T-08 service, no neighbouring refactor; (3) one extra test beyond the brief (`37 of 100 → "37%"`), anchored in `design.md` §6.5's worked example — Lens B assessed it as not creep. The Implementer also **re-verified the unmerged/unapplied migration premise itself** (`git log` shows the file touched only by `17a90ae5` on this branch) rather than taking the brief on faith — the right instinct where a wrong premise would be expensive and invisible.

#### Status transitions

- **T-04 → `[~]`** — code PASS on both lenses; still owed **O-4/O-5** (unchanged; the amendment does not discharge DB evidence, and the seeded string it must eventually prove is now the amended one).
- **T-07 → `[x]`** — PASS on both lenses, no owed evidence.

---

### T-08 — Template wrapper + email assembly

- **Date:** 2026-08-09
- **Attempts:** 1 (Reviewer PASS ×2, no FAIL, no rework attempt consumed)
- **Implementer:** `akili-implementer` (`sonnet`, effort `high` — above the T2 default; the task is well-specified but carries three named traps and a hard disqualifier)
- **Reviewers:** two parallel lens Reviewers (`akili-reviewer`, `opus`, read-only) — **reliability** and **risk**. Parallel mode selected because NFR-CBU-003 is a security-category NFR and because D-OD2-d had just made an ungated cross-file invariant this task's responsibility.

#### Leader scope decision (recorded before briefing)

T-08 and T-09 share `capdev-bulk-notification.service.ts`. The seam was drawn at **per-group send**: T-08 owns the safe template accessor, the render-and-send-one-group method, subject, STAR link and contact fields; T-09 owns `dispatch()` — the four queries, the flag gate, metric persistence, the per-group loop, the aggregate status write, and provider registration in `ai-reports.module.ts`.

The seam is not cosmetic. T-08's `Tests` line requires "missing template → zero `sendEmail`, one error log", which is untestable unless T-08 owns a send path. Drawing the line at `dispatch()` instead would have deferred that assertion to T-09 and left R-CBU-007 AC.5 unproven through two tasks.

#### Method contract handed to T-09

```ts
async sendGroupNotification(input: CapdevGroupSendInput): Promise<CapdevGroupSendOutcome>
enum CapdevGroupSendStatus { SENT = 'SENT', NO_TEMPLATE = 'NO_TEMPLATE' }
```

`NO_TEMPLATE` is an **internal per-group outcome, deliberately not added to `NotificationStatus`** — that enum stays the four persisted values (`SENT | SKIPPED | FAILED | PARTIAL`) that T-09 writes to `notification_status`. Widening a persisted column's domain to carry a transient control-flow marker was the failure this instruction pre-empted.

A `sendEmail` rejection is **not** caught in `sendGroupNotification`; it propagates so T-09's per-group `try/catch` (design §6.6) remains the single logger, keeping R-CBU-010 AC.5's "exactly one error log" true. Both Reviewers verified this in the code rather than accepting the Implementer's claim: no `try/catch`, no `.catch()`, no floating promise.

#### Files

| File | Change |
| --- | --- |
| `.../notifications/capdev-bulk-notification.service.ts` | **NEW** (237 → 239 lines). `safeGetTemplate` wrapper; `sendGroupNotification`; subject; STAR link; token-owner contact fields. |
| `.../notifications/capdev-bulk-notification.service.spec.ts` | **NEW** (311 → 316 lines). 8 tests. |

Nothing else in the tree changed — verified by `git status` and by an explicit `git diff --stat` over the formatter, template, and migration paths, which returned empty.

#### Verification (Leader's own run, no agents active)

- `npx tsc --noEmit -p tsconfig.json` → exit 0
- `npx eslint <both files> --quiet` → exit 0 (after `npm run lint`'s `--fix`; `git status` re-checked, no files leaked into other tasks)
- `npm test -- --silent` → **328 suites / 2154 tests passed, 1 snapshot, 48.182s**

#### What the review bought that the green suite did not

Both lenses returned `PASS`, and both — independently, from opposite directions — found the same hole in a gate this spec had just declared closed.

**D-OD2-d was half-delivered.** The `<1%` branch was correctly gated: re-adding `%` to the template renders `&lt;1%%` and drops the `%` from the formatter renders `&lt;1 of whom`, both turning the same assertion red. But the `p >= 1` branch was **not** gated at the render layer. The risk lens ran the mutation rather than checking that a well-named test existed, and found that dropping the `%` from `capdev-metrics.formatter.ts:94` alone left every test in T-08's suite green — the happy path rendered `— 58 of whom were women` and asserted nothing about that sentence. It was caught only by the formatter's own unit spec, one layer away from the render, which is exactly the distance D-OD2-d exists to close.

The reliability lens reached the same place from the other side: `buildTemplateData` maps ten fields and the suite asserted four in the body, so `projectLeadName: ''` or a swapped `startDate`/`endDate` also stayed green. `not.toContain('{{')` cannot catch that class, because Handlebars renders a missing or empty value as the empty string — **KZ-001 one level down**, and a standing argument against treating "no unresolved tokens" as a rendering guarantee.

Convergence from two independent lenses on one finding is the signal the parallel mode exists to produce; either lens alone would have read as a stylistic suggestion.

#### Leader adjudication — advisory fold, not a rework

Both Reviewers classified these advisory and neither raised a spec violation, so the verdict stood at `PASS` and **the attempt count stayed at 1**. But an advisory that leaves the task's own stated purpose half-delivered is closed before signing, not recorded and walked past. Four bounded changes were sent back to the same Implementer, explicitly labelled *not a rework attempt*:

1. `expect(body).toContain('— 58% of whom were women')` — closes the `p >= 1` render coupling.
2. Salutation and date-range assertions — closes the field-mapping mutation class.
3. `tokenOwner` narrowed from `CapdevBulkTokenOwnerDto | null` to non-nullable (see D-T08-a).
4. `not.toContain('%')` → `not.toMatch(/\d+%|<1%/)` — the broad form would break spuriously on any future `%` in the template (`width: 100%` in an email style block being the likely one), with a failure message pointing nowhere near the cause.

**The fold was required to demonstrate the gate, not assert it:** mutate the formatter, observe red, revert. Given that the failure mode under review was "a test that looks right but proves nothing," accepting *"I added the assertion"* would have repeated the exact error being corrected. Result: the mutation turned the happy-path test red on the new assertion with the body showing `— 58 of whom were women`; all other tests stayed green, confirming the gap had been invisible to everything except the formatter's own spec. Revert verified by the Leader independently (`git diff` empty on the formatter; line 94 re-inspected for the `%`).

#### Decisions

- **D-T08-a — the token-owner parameter is non-nullable; the guarantee is enforced at the fetch point.** Both lenses found `null` was not unhandled but handled *silently*: `resolveTokenOwnerContact` optional-chains through and yields `{ tokenOwnerName: '', tokenOwnerEmail: '' }`, so the body ships `contact direct them to  (), who shall be happy to assist.` to a Project Leader — violating `capdev-bulk-email-template.dto.ts`'s "non-empty by contract" and landing precisely in the class DD-4 exists to keep out of Handlebars. Reachable two ways, not one: a `null` token owner, **and** a resolved owner whose `email` and both names are null (`capdev-bulk-group.dto.ts` permits it). Design §6.1 declares the first unreachable, so this was correctly advisory rather than a violation. Dropping `| null` converts a silently-broken email into a **compile error at T-09's call site**, forcing the guarantee to be stated where the data is fetched. No runtime fallback string was added — choosing between skipping the group and falling back to a support address is T-09's call, and inventing copy here would have pre-empted it.
- **D-T08-b — the subject carries no environment marker.** R-CBU-007's prose mentions one; `MessageMicroservice` already threads `environment: ARI_MIS_ENV` into the payload. Prefixing here would break AC.2's "subject begins with `[<agreement_id>]`". The risk lens checked this specifically because it read as drift, and confirmed it is correct.

#### Advisories — recorded, not acted on, no tasks minted

1. **`sendEmail` is `client.emit` — fire-and-forget onto the broker.** It resolves with no delivery acknowledgement, so `SENT` means "handed to the broker", not "delivered". Correct existing platform behaviour and nothing here should change it — but **`notification_status = 'SENT'` (R-CBU-011) inherits exactly this weaker guarantee**, and a broker-side failure will never produce `FAILED` or `PARTIAL`. T-09 should know this rather than discover it.
2. **`safeGetTemplate` uses a bare `catch`,** so a transient DataSource error is reported as `NO_TEMPLATE` — "the template row is missing", logged at error with that wording — rather than as a group failure. Design §6.2 mandates catching the throw, so this conforms; but it blurs R-CBU-011 AC.3's skipped-vs-failed distinction for a cause that is neither. Worth a distinguishing log field when T-09 wires the aggregate status.
3. **`expect(body).not.toContain('trainee_name')` is tautological** — no participant-level field exists in the DTO or the template, so it survives every mutation of this diff. It is literally what `tasks.md` T-08's `Tests` line asks for, so it stays; but the real data-minimisation guard is the DTO's key set.
4. **`starLink` degrades to `undefined/results-center?...`** if `ARI_CLIENT_HOST` is unset. A deployment concern, not a code one. (The triple stache on `starLink` is safe — the value is entirely code-constructed from env plus a module constant, no user data.)

#### NFR-CBU-003 — both halves checked

The structural half holds: `CapdevGroupSendInput.metrics` is six pre-rendered aggregate strings, so no participant channel exists. The **runtime half** was checked separately at the Leader's instruction, because the Implementer's structural argument does not cover it: the service's only log carries the template key, `agreement_id` and `bulk_upload_process_id` — no address; `MessageMicroservice`'s info-level line interpolates only the subject, never `to`/`cc`; and this diff adds zero info-level logs.

#### Implementer `Not Done / Assumptions` — adjudicated, no scope owed

Round 1 disclosed three items, none outstanding work: (1) the STAR link query string implements design §15's own recorded stance on open question Q1, explicitly non-blocking — a wrong param degrades to a correct page, and the value is enum-bound rather than a literal; (2) the token-owner nullable, escalated to the reliability lens for adjudication rather than settled on the Implementer's summary → became **D-T08-a**; (3) no dedicated NFR-CBU-003 fixture, argued structurally — accepted, and the runtime half verified independently above. Round 2 returned `none`, with the mutation demonstrated and reverted.

#### Status transition

- **T-08 → `[x]`** — Reviewer PASS ×2 (reliability + risk), advisory fold applied and its gate demonstrated red-then-reverted, full suite and lint green on the Leader's own run. **No owed evidence** — T-08 renders the on-disk template through real Handlebars, and that file is byte-equality-coupled to the migration literal by T-04's separate guard, so nothing here waits on dev MySQL.

---

### T-09 — `CapdevBulkNotificationService` orchestration

- **Date:** 2026-08-11
- **Attempts:** 1 coding attempt (Reviewer PASS ×2, no FAIL). Preceded by **one aborted spawn**: the first Implementer died on a network error (`ENOTFOUND`) mid-research, before writing any code. Working tree verified clean afterwards; relaunched with the same brief plus the lookups it had reached. **An environment failure is not a work FAIL and did not consume an attempt.**
- **Implementer:** `akili-implementer` (`sonnet`, effort `xhigh` — highest-consequence task in the spec: it persists data and decides a durable status column)
- **Reviewers:** two parallel lens Reviewers (`akili-reviewer`, `opus`, read-only) — **reliability** and **data-semantics/observability**.

#### Leader decision taken before briefing

**`tokenOwner === null` → skip the group, log at `error`, continue.** T-08 left `sendGroupNotification`'s parameter non-nullable (D-T08-a) precisely so this decision could not be skipped; the compile error was the forcing function and it worked. Chosen over a support-address fallback because §6.1 declares the path unreachable — reaching it means an invariant broke, which is an error-level event, not a routine degradation. A fallback would conceal a broken invariant, and R-CBU-007 AC.4 requires the token owner *by name*, so a generic substitute does not satisfy the AC, it only hides the violation. Symmetric with the existing unresolvable-PI rule. Counts as **not dispatched**.

#### Verification (Leader's own run, no agents active)

- `npx tsc --noEmit` → exit 0 · `npx eslint <module> --quiet` → exit 0
- `npm test -- --silent` → **328 suites / 2180 tests passed, 1 snapshot, 16.917s**

#### What the review bought

Both lenses PASSed and both confirmed the load-bearing parts structurally rather than by claim: the flag check provably sits after `persistProcessMetrics` (no early exit between the reads and the write), the Disqualifies clause is discharged by a test asserting the metrics write **and** the persisted `SKIPPED` rather than only "no `sendEmail`", every row of the status table has a mutation that turns a named test red, and `safeGetTemplate` still does not log so the single-error-log discipline holds.

Beyond conformance they surfaced four things worth the run:

1. **AC.4 was true but unenforced.** `sent_at` was derived from `dispatchedCount > 0` rather than from the status just computed, so "`sent_at` null whenever `SKIPPED`" held only because three call sites passed literal arguments. The invariant was asserted in three places and enforced in none — one refactor from breaking silently in a durable column. Folded: derived from the status. All 27 pre-existing tests passed unchanged, which is what proves the change was behaviour-identical rather than merely intended to be.
2. **AC.6 was gated by nothing.** Every `dispatch` test mocked `sendGroupNotification`, so "stored metrics agree with the emailed ones" held by construction (both read one `metricsByAgreementId` map) with no test on it. **That is the same shape both lenses caught in T-08 one task earlier** — an invariant true by construction, ungated. Folded: one unmocked dispatch renders the real on-disk template and compares the body's trainings count against the value read back from the actual `persistProcessMetrics` call — same-run agreement, not two hand-written literals.
3. **A data defect in already-PASSed T-05 code** — see the Q2 block below.
4. **An orphaned AC** — R-CBU-004 AC.4 (drops logged at debug) is unimplemented **feature-wide**, found by diffing §10 row by row. Assigned to T-12 by spec-owner decision, with the reason it could not land here recorded: `tasks.md` told T-09 to implement "every §10 log line" while its Files clause denied it the builder that would have to carry the data — a spec-internal contradiction, not implementer drift.

#### §10 conformance

Nine of ten rows implemented at the correct level, verified row by row with file:line. The unattributed warn carries the **`result_id` list**, not a scalar (R-CBU-002 AC.3), pinned by a test asserting the literal ids. The multi-primary warn is emitted in T-05 and deliberately not duplicated. NFR-CBU-003 verified at **every** call site, not only the named ones: info level appears exactly twice and carries `to`/`cc` counts, and the token-owner error logs the agreement and process id but **not** `tokenOwner.email` — the easy mistake there. A test asserts no info message contains `@`.

The tenth row (recipient dropped, debug) is the orphaned AC above. One log line the code emits that §10 does not enumerate — the token-owner error — is sanctioned by the Leader decision above.

#### Q2 `result_capacity_sharing.is_active` — corrected, and the mechanism was not what the review described

`findMetrics` joined `result_capacity_sharing` with no `is_active` predicate, while the countries query **in the same file** filters `rcty.is_active = TRUE` and every other reader of that table on the platform filters it too. That internal inconsistency was the signal. Spec owner authorised the fix; `AND rcs.is_active = TRUE` landed with a `STRUCTURAL —` test (the house convention in this spec file since T-05, because no unit test can execute SQL), and the gate was demonstrated red-then-reverted.

**Then the dev probe corrected the reasoning behind it.** The review's stated mechanism was inflation via multiple rows per result. The data says otherwise:

| Fact from dev | Consequence |
| --- | --- |
| **252** rows in `result_capacity_sharing` with `is_active = 0` | The review's aside that "the condition evidently did not occur" was **wrong** — soft-deleted rows exist in quantity |
| **0** results with more than one `result_capacity_sharing` row | The inflation-by-duplicates mechanism is **not** the live risk |

So the real defect was narrower and different: a result whose **single** capacity-sharing row is soft-deleted was having that row's participants counted as live. With the fix, the `leftJoin` yields NULL and the formatter's degenerate path suppresses the clause — which is the correct reading of a deleted training record.

**Effect on dev today: none.** All five CapDev processes return byte-identical metrics before and after (44/20, 67/17, 68/33, 6/0, 3/0, same date bounds) — no inactive row currently attaches to a bulk-uploaded CapDev result. Recorded plainly: **the predicate's presence is pinned by a test; its effect is not, and cannot be until data exhibiting the case exists.** The fix rests on consistency with the rest of the codebase, not on an observed failure.

#### O-6 re-verified (the Q2 change invalidated the prior evidence)

Changing Q2 retired the O-6 evidence collected 2026-08-09 for that query, so the probe was re-run against dev over the same five processes, plus the new `countTotalResults`. **5/5 green on each.** `total_results` returns 2/2/2/1/1 — equal to `total_capdev_results` for these batches, which is consistent: every one of them contained only CapDev results.

#### Decisions

- **D-T09-a — OD-3 resolved in favour of R-CBU-008 AC.1 (group-scoped).** `design.md` §4.1 said "across the batch" for six columns while §6.1 builds Q2/Q3 on the contract-inner-joined spine, making a batch-wide value structurally unobtainable — **design contradicting design**, the same class as OD-1. AC.1 already specified the group-scoped reading. §4.1's wording was corrected for all six columns and the word "attributed" made load-bearing. **No code changed** — the implementation already followed AC.1. Consequence recorded in §4.1: when unattributed results exist, `total_capdev_results` is strictly less than the created-CapDev count, and the gap is exactly Q4's list.
- **D-T09-b — `total_results` is populated, not left null.** The Implementer's premise (no producing query) was right about the four existing queries, all of which descend from the CapDev-filtered spine — but the value is one unjoined scalar read away, using the `result_id IS NOT NULL AND error_message IS NULL` predicate `requirements.md:30` already defines as a *created result*. Closes the open half of ledger entry JD-S6. `total_results` is now the **only** genuinely batch-wide column in §4.1.
- **D-T09-c — the recipient-dropped debug log belongs to T-12**, with the builder-signature widening and the purity-preserving rationale written into that task.

#### Advisories — recorded, no tasks minted

1. **A repository read failure leaves `notification_status` NULL**, which §4.1 defines as "predates the feature", so a mid-stage crash is indistinguishable from a pre-feature row in the durable record R-CBU-011 relies on. `FAILED` is unreachable for that whole class. The outer boundary is T-10's, and T-12 owns "metric query throws" — but that scenario is **batch-level, not per-group**, which T-12's current framing does not distinguish.
2. **`err.message` is interpolated at error level** in the group-failed log (what §10 asks for), so a broker error string could in principle echo an address. Error level is outside NFR-CBU-003's info-level target, so not a violation.
3. **Reason-label asymmetry** across the three skip/error lines: `reason=NO_PI`, `cause=TEMPLATE_*`, and a bare prose sentence for the token-owner skip. Three conventions for one question a log reader asks; a uniform `reason=` key would make R-CBU-011 AC.3 greppable rather than regex-able.
4. **One test title overclaims** — a zero-groups test says "no email" but asserts the metrics write, the status, and that the flag was never read. True (the loop cannot run), but an unasserted claim in a test name is what a later reader trusts.

#### Implementer `Not Done / Assumptions` — adjudicated, no scope owed

Round 1 disclosed three items, **all three correctly identified as spec-owner matters rather than gaps in its own work**, and all three became decisions above. Its reasoning on `total_results` — refusing to put a CapDev-only number under an "all indicators" column because a wrong number misleads worse than an honest null — was the right instinct even though the spec owner ultimately chose to populate it. Rounds 2 and 3 returned clean, with both folds' gates demonstrated red-then-reverted. It also flagged that `design.md`/`tasks.md` had changed under it and asked rather than assuming — those were the Leader's concurrent spec edits.

#### Status transition

- **T-09 → `[x]`** — Reviewer PASS ×2, three folds applied (AC.4 structural, AC.6 gated, Q2 + `total_results`), O-6 re-verified against dev after the query change, full suite and lint green on the Leader's own run. **T-10 is unblocked.**

---

### T-10 — Wire into `ResultsService` + module registration

- **Date:** 2026-08-11
- **Attempts:** 1 coding attempt (Reviewer PASS ×2, no FAIL), plus one Leader-directed advisory fold (comment-only; **not** a rework, attempt count unchanged).
- **Implementer:** `akili-implementer` (`sonnet`, effort `high`)
- **Reviewers:** two parallel lens Reviewers (`akili-reviewer`, `opus`, read-only) — **conformance/reliability** and **risk/resilience**. Two lenses rather than the default single checklist because T-10 is the only task in the spec that changes runtime behavior.
- **Skills assigned:** `nestjs-expert`, `error-handling-patterns`. **Leader deviation** from the task's list (`nestjs-expert` only): T-10's substance is the R-CBU-010 outer containment boundary, which is an error-propagation design question.

#### Files changed

`ai-reports.module.ts` (+16/−3) · `results.service.ts` (+19/−2) · `results.service.spec.ts` (+149). **186 insertions, 3 deletions.**

#### Verification (Leader's own runs, tree quiet, no agents active)

- `npx tsc --noEmit` → exit 0 · `npx eslint <touched paths> --quiet` → exit 0
- `npm test -- --silent` → **328 suites / 2186 tests passed, 1 snapshot, 17.374 s**
- `npm run test:e2e` → **PASS, 1/1, 3.593 s** — the literal Done-clause command
- App boot (DI) → `PASS`, **0 DB retries, 0 `can't resolve dependencies`, 0 `Maximum call stack`**

The T-10 **Disqualifies** clause ("a passing unit suite alone… an app that boots is part of the evidence") is therefore discharged: `test/app.e2e-spec.ts` compiles the real `AppModule`, so a DI wiring failure would surface there.

#### The environment scare — recorded because it nearly cost the task its evidence

At briefing time the dev MySQL (VPN, `192.168.20.x`) was **unreachable**. On that basis the Leader diagnosed `npm run test:e2e` as a broken harness — "red on a 5000 ms hook timeout, and hangs forever without `--forceExit`" — opened **O-7** as owed boot/e2e evidence, told the Implementer T-10 would be parked `[~]`, and (with the spec owner) assigned the supposed harness defect to T-11.

**All of that was measuring the outage, not the harness.** The 5 s hook timeout was the app burning its budget retrying an unreachable database. When the VPN returned, the same command was green in 3.6 s. Corrected consequences:

| Claim made under the outage | Corrected |
| --- | --- |
| `test:e2e` red on a hook timeout | **Green**, pre- and post-change |
| O-7 owed; T-10 parked `[~]` | **Discharged in-flight; T-10 → `[x]`** |
| Whole harness defect → T-11 | Narrowed — see below |

**What survives, verified by A/B with the tree stashed:** `npm run test:e2e` prints its results and then **never exits** (open handles; the script carries no `--forceExit`). Confirmed on **both** trees — pre-change `PASS 4.461 s` then no exit, post-change identical. So the non-exit is genuinely pre-existing and **not** introduced by T-10's new `MessageMicroservice` provider. This A/B exists because the conformance Reviewer flagged that the Leader's original comparison used `--forceExit` on one side and not the other — a fair catch on the evidence, not on the code. **T-11 inherits the narrowed defect (non-exit only), not the original overstated one.**

Also disproven: the Implementer reported a `RangeError: Maximum call stack size exceeded` in its own probe and **declined to assert it was pre-existing** because it lacked the baseline. Correct instinct — it was retry-exhaustion noise from the outage, absent once the DB was reachable.

#### What the two lenses bought

Both PASSed, and both verified load-bearing claims structurally rather than accepting them:

1. **Containment is total for the failures that exist here.** The conformance lens read the *whole* `dispatch()` body hunting for an orphan promise that could escape the `try/catch` as an unhandled rejection — every call is awaited, including the sequential per-group loop; there is no `void`/fire-and-forget path.
2. **The tests genuinely gate.** All four failure tests drive `dispatch` via `mockRejectedValueOnce` and then `await` the method **without** `expect(...).rejects` — delete the `try/catch` and they go red. This is the property that was *missing* in T-08 and T-09, where invariants were true by construction of the mock. Recorded as the first task in this spec where that shape did not have to be folded in after the fact.
3. **No transaction, verified not asserted.** The risk lens confirmed `createResultFromAiBulk` has no `queryRunner` and no `manager.transaction`, so design §6.6's "outside any transaction governing result creation" is factually true here.
4. **DI blast radius is one module.** `ResultsService` is provided in exactly one place (`results.module.ts:92`), which already imports `AiReportsModule` — so the new constructor dependency resolves in the only injector that constructs it, and `result-oicr.module.ts`'s `forwardRef(() => ResultsModule)` is unaffected. No cycle: `AiReportsModule`'s only import is `TemplateModule`, which imports nothing leading back.

#### Two corrections the risk lens made to the spec's own record

- **JD-S7's stated mechanism is aimed at the wrong component.** The ledger records the unbounded-wait risk as a stalling `client.emit` on a lazily-connecting `ClientProxy`. It cannot stall: `MessageMicroservice.sendEmail` calls `this.client.emit(...)` with no `await`, `firstValueFrom`, or `subscribe` (unlike the sibling `emitToPattern`, which does use `firstValueFrom`), and `BrokerConnectionBase` builds the proxy without connecting. The live unbounded surface T-10 puts on the request path is **7–8 MySQL round-trips**, with no query or acquire timeout in `orm.config.ts`. **JD-S7 remains open by human decision — but a future mitigation should be aimed at the DB stage, not the broker.**
- **`tasks.md` §3's flag-off claim is right as written and wrong as usually paraphrased.** "Sends nothing until someone flips a row" is **confirmed** — zero `sendEmail` on every flag-off path. "No runtime behavior" is **refuted**: **5 reads + 2 writes execute per bulk upload regardless of the flag**, including batches containing zero CapDev results (a zero-group batch never even reads the flag). This is intended — design §12 step 1 and the JD-01 step order — but the PR 3 description must state it. **The kill switch stops email, not work.**

#### Leader error, recorded

The Leader's risk brief asked whether inline `await` violates **NFR-CBU-002**. It does not — NFR-CBU-002 is *"no duplicate notification per process"*. The latency NFR is **NFR-CBU-001**, and `tasks.md` §6 assigns it to T-05/T-11, not T-10. The Reviewer read the requirement at the source and corrected the framing instead of answering the question as posed. Inline await is **DD-3**, with both alternatives explicitly rejected.

#### Advisory fold applied (Leader-directed, comment-only, no attempt consumed)

The risk lens found the new inline comment **overclaiming against DD-3**: it promised a notification failure "must never roll back or **delay** the response", while the awaited dispatch delays the response by construction and a slow failure delays it proportionally. That plants JD-S7's exact contradiction into production code as a guarantee. Folded to "roll back or **fail** the response" (`results.service.ts:1066`). Suite identical after the change (2186/2186), as a comment-only edit must be.

#### Advisories — recorded, no tasks minted

1. **`const process` shadows Node's global `process`** for the rest of the method. The name comes from design §2.1 so it is conformant, but a later edit adding `process.env.X` inside this method would silently read the bulk-process entity. A rename to `bulkProcess` removes the trap; the design's pseudocode does not bind the identifier.
2. **The catch discards the stack** (`error?.message ?? error`) and diverges from the notification service's own `err instanceof Error ? err.message : String(err)`. `CgiarLogger.error` accepts a second `{ stack }` argument — passing it would make the one surviving log line diagnosable.
3. **Deploy-before-migrate degrades silently.** If this code lands anywhere before T-02's migration, every bulk upload throws inside `dispatch()`, is swallowed by the new catch, and returns `201` with one error log and `notification_status` left NULL. The containment works as designed, which is exactly what makes it quiet. Compounds T-09 advisory 1: NULL status is indistinguishable from "predates the feature". Design §12 step 1 should read as **ordered**, not concurrent.
4. **Two test names promise a fidelity they lack** — the "`sendEmail` throws" and "repository throws" cases both stub `dispatch` itself; the real seams are T-09's and T-12's. T-10 gates only the outer boundary.
5. **The DD-2 async-dispatch seam is one argument wider** than "process id only" — `metadata?.contacts` is request state threaded past the DB re-read. Serialisable, so still queue-compatible, but a future queued dispatch must carry it in the message payload.
6. **`npm run test:cov` was not run.** Regression risk is negligible (~20 production lines, all exercised), but `tasks.md` §8's 60% floor is not discharged by T-10.

#### Implementer `Not Done / Assumptions` — adjudicated, no scope owed

Three items, all correctly raised. (a) `CapdevBulkNotificationRepository` deliberately **not** exported — the task text says "the service to exports" and nothing outside the module injects the repository; the Reviewer confirmed the narrower reading is right and that the `result-oicr` exemplar exports its repository only because it has external consumers. (b) `AiContactDto[]` → `CapdevRecipientFileContact[]` compatibility verified as real, not accidental: `string` widens to `string | null | undefined` and excess-property checking does not apply to a non-literal. (c) The `RangeError`, disproven above.

#### Leader process incident

A stale background command scheduled to restore the stash fired **after** the Leader had already restored it manually, popping an unrelated branch's stash (`AC-1672`, labelled "REJECTED — DO NOT APPLY") into the tree and leaving three conflicted **client** files. No work was lost — git preserves a stash on conflicted pop — and the files were reverted to HEAD with the spec owner's approval. **Lesson: never leave a mutating command queued against state you intend to change.** Candidate Kaizen entry at archive.

#### Status transition

- **T-10 → `[x]`** — Reviewer PASS ×2, one comment-only fold, full unit suite + e2e + app boot green on the Leader's own runs, O-7 discharged in-flight. **T-11 and T-12 are unblocked.**

---

### T-11 — E2E: the payload contract holds both ways

- **Date:** 2026-08-11
- **Status:** ✅ **PASS** — Reviewer PASS on attempt 1, plus two Leader-directed advisory folds (comment + type-only; **not** a rework, attempt count unchanged).
- **Attempts:** 1 coding attempt, 0 FAIL. One Implementer turn ended without delivering its report and was recovered by a single poke (see *The delivery failure* below) — a protocol event, not a rework.
- **Implementer:** `akili-implementer` (`sonnet`, effort **`high`**)
- **Reviewer:** one `akili-reviewer` (`opus`, read-only) in **lens-checklist** mode — the effort dial (`high`) selects the single-Reviewer sweep rather than parallel lens Reviewers. 6 advisories returned, 2 folded.
- **Skills assigned:** `nestjs-expert`, **`systematic-debugging`**. **Leader deviation** from the task's list (`nestjs-expert` only): T-11 carries an inherited harness defect (the non-exit), and `.agents/leader.md` → *Delegation Discipline* maps any bug or test failure to `systematic-debugging`. Effort is `high` rather than the `medium` default because the difficulty is not line count — it is an auth bypass inside a real `AppModule`, fixture fidelity against baseline B-1, and a harness defect that hides its own failure.

#### Environment pre-check (run before briefing, per `/akili-execute` Step 2.1)

Dev MySQL `192.168.20.210:3306` **reachable** at run start. This is the condition whose absence produced the T-10 environment scare (§ above), so it is recorded rather than assumed: the T-11 e2e boots the real `AppModule`, which connects to that database.

#### D-T11-a — how far the e2e reaches into the real stack *(spec-owner decision, 2026-08-11)*

**The ambiguity.** T-11's scope bullet 2 — *"payload with valid contacts → `201` and they reach CC"* — is not decidable from the spec. Neither `requirements.md` R-CBU-005 nor `design.md` §11 states what the e2e may touch, and three facts collide:

1. the endpoint sits behind `JwtMiddleware` (`app.module.ts:75`) + `@UseGuards(RolesGuard)` (`results.controller.ts:55`), so the test must bypass auth or mint a real token;
2. `createResultFromAiBulk` writes real rows to the **shared** dev MySQL, which `docs/infrastructure.md` → *Boundary rule* makes a human decision, never an agent's;
3. the `ENABLED` flag is seeded `'false'` by T-03, so a faithful real run dispatches **nothing** — bullet 2 is unprovable without an override regardless of the DB question.

**Decided:** real chain, repository stubbed, **zero writes to the shared dev DB**.

| Layer | T-11 treatment |
| --- | --- |
| `AppModule`, `ValidationPipe` (`whitelist` + `forbidNonWhitelisted` + `transform`), `GlobalExceptions`, `ResponseInterceptor`, `RootAi`/`AiContactDto` | **real** — the D4 gate and the `400` envelope |
| `JwtMiddleware`, `RolesGuard` | bypassed / `overrideGuard` with a stub `req.user` |
| `ResultsService.createResultFromAiBulk` | stubbed spy — **no persistence** |
| `CapdevBulkNotificationRepository` (5 reads + 2 writes) | stubbed, one synthetic group |
| `ENABLED` flag | overridden **on** for the CC test only |
| `dispatch()` → `buildRecipients` → `formatCapdevMetrics` → `sendGroupNotification` | **real** — this is what makes bullet 2 a genuine assertion rather than a mock echo |
| `MessageMicroservice.sendEmail` | spy — the CC assertion reads `EmailBody.cc` |

**Rejected alternatives, and why they were offered.** *Full integration with real dev-DB writes* would be the strongest proof of the CC claim, but it writes junk rows to a shared database on every run and depends on live Agresso contract data staying valid — the spec owner declined the write authorization. *Validation-contract-only* (service stubbed, dispatch never entered) is the narrowest true reading of defect class **D4** ("legacy caller now `400`s") and would have been defensible, but it silently drops an approved scope bullet; it was offered as the reduced option and not taken.

**One trap this decision creates, briefed explicitly.** T-04's `sec_template` migration is **unapplied on dev**, so a real `_getTemplate` returns nothing, `sendGroupNotification` short-circuits to `NO_TEMPLATE`, and `sendEmail` is never called — bullet 2 would pass vacuously while proving the opposite of what it claims. The brief therefore requires the template stub to carry the **real bytes** of `capdev-bulk-summary.html`. **KZ-001 binds here** (test-double fidelity, recurrence 4).

#### Inherited harness defect — scope bounded in the brief

`npm run test:e2e` passes but never exits (open handles: DB pool, RMQ, cron; the script carries no `--forceExit`). Pre-existing, proven by A/B with T-10 stashed. The Implementer was directed to fix it in order — `afterAll` → `await app.close()` first, `"forceExit": true` in **`test/jest-e2e.json`** only as a backstop, and never by editing `package.json` — and to report which was actually needed. The brief also restates that **only the non-exit is real**: the 5 s hook timeout in the original diagnosis was the VPN outage, not the harness.

**Outcome: both were needed, and this is the opposite of the cheap answer.** `afterAll` → `await app.close()` alone left the jest process alive **5+ minutes with no self-termination across two independent runs**. `"forceExit": true` in `test/jest-e2e.json` is the load-bearing part. `--detectOpenHandles` ran green (4/4) and named **no** open handle, so the residual leak is **masked, not diagnosed** — consistent with a native/pool-level handle jest cannot attribute. Candidates (unconfirmed): the mysql2 pool, an OpenSearch keep-alive socket, `@nestjs/schedule` timers. `package.json` was not touched.

#### Files changed

`test/results-ai-formalize-bulk.e2e-spec.ts` (**new**, 412 lines) · `test/app.e2e-spec.ts` (+13/−1: `beforeEach`→`beforeAll`, `afterAll` → `app.close()`) · `test/jest-e2e.json` (+2/−1: `"forceExit": true`). **No `src/` file touched** — the `test/`-only scope boundary held.

#### Verification (Leader's own runs, tree quiet, no agents active)

| Check | Result |
| --- | --- |
| `npm run test:e2e` | **2 suites / 4 tests passed, 4.967 s**, and the process **exits on its own** — marker file `EXIT=0`, `pgrep` for `jest --config ./test/jest-e2e.json` empty immediately after |
| Non-exit mechanism | jest's own `"A worker process has failed to exit gracefully and has been force exited"` line confirms `forceExit` is what ends the run — the `app.close()`-alone claim would have been unfalsifiable without it |
| `npx tsc --noEmit -p tsconfig.json` | exit 0. `tsconfig.json` declares **no `include`** (only `exclude`), so `test/` **is** typechecked — the new suite is covered, not merely ignored |
| `npx eslint test/ --quiet` (**no `--fix`**) | exit 0, `git status` re-checked, nothing mutated |
| Unit-suite regression | **structurally impossible.** Unit jest is `rootDir: "src"` (`package.json`), so `test/` is outside its scope entirely. The Implementer's 2186/2186 is guaranteed by configuration, not sampled — this was reasoned rather than re-run |

**Independent corroboration from the app's own logger**, which is stronger than either agent's testimony: the e2e log carries
`ERROR [STAR MAIN API] [ValidationPipe] [exceptionFactory] [POST] [USER_ID:900001]: /api/results/ai/formalize/bulk BadRequestException`.
That single line proves three things at once — the unversioned route is real and reachable, the **real** `ValidationPipe` produced the `400` (not a test assertion), and the `JwtMiddleware` stub genuinely populated `request.user`.

**Pre-existing noise, not introduced here:** both e2e suites log a caught `console.error` — `Error loading Vite manifest: ENOENT … dist/admin/public/.vite/manifest.json` from `ReactRendererService` — because `npm run build:admin` has not run. Present in `app.e2e-spec.ts` before this diff. Benign; recorded so a future reader does not mistake it for a T-11 defect.

#### Reviewer verdict

`STATUS: PASS` — *"The diff conforms to T-11's scope as narrowed by D-T11-a… no query or write from any test body can reach the shared dev MySQL. The route-path deviation from the task text is correct behavior against stale documentation, and the one link the e2e authors rather than observes is independently gated by T-10's unit spec."*

The five adjudications worth keeping:

1. **AC.2 is not KZ-001-vacuous, but its claim needed narrowing.** Real: the `ValidationPipe`/`RootAi`→`ProcessMedatada`→`AiContactDto` transform, the DI-resolved `dispatch()`, `buildRecipients` + `formatCapdevMetrics` (module-level function imports — unmockable by accident), `safeGetTemplate` → real `Handlebars.compile` over the real on-disk bytes, real `EmailBody` assembly, captured at the last seam. **Authored, not observed:** exactly one link — `metadata?.contacts` → `dispatch`'s second parameter — which D-T11-a's own seam table *forces* (stubbing `createResultFromAiBulk` and running `dispatch` real cannot both hold unless the stub calls `dispatch`). That link is **independently gated** at `results.service.spec.ts:3409-3430`, which asserts `dispatch` was called with `(42, contacts)` from the real `createResultFromAiBulk` against `results.service.ts:1067-1076`. Unit + e2e compose to full coverage. **State the claim precisely:** AC.2 proves *the posted address survives real DTO validation and the real dispatch→builder→formatter→render chain into `EmailBody.cc`* — **not** *"through the endpoint's own service"*.
2. **The route path — see D-T11-b below.** Claim correct; documentation stale.
3. **Coverage complete.** T-11's three scope bullets map to AC.1/AC.2/AC.4, all present. **AC.3 is not owed by T-11** (its scope bullets never mention scoping) and is discharged at `capdev-recipients.builder.spec.ts:135-155`, which asserts both `toContain` on group A and `not.toContain` on group B. AC.5 is D-T01-a. ⚠️ **Worth carrying forward:** AC.2's fixture has exactly one group, so a **cross-group CC leak is gated only at unit level** — the e2e cannot see it.
4. **The B-1 fixture genuinely guards D4.** `metadata: { file_name, ai_interaction_id }`, no `contacts` key — byte-for-byte the shape at §2 above, not a current-DTO payload with an optional field omitted. And `minimalValidResult()` is safe: `ResultRawAi` (`result-ai.dto.ts:271-310`) requires exactly `contract_code`, `indicator`, `title`; every other property is `@IsOptional()`. So AC.1's `201` cannot be standing in for a "400 for the wrong reason", and all three fields are pre-T-01.
5. **Zero DB writes — and zero DB *queries* from any test body.** All 7 repository entry points `dispatch()` touches are spied (there is no eighth); both config accessors spied (no `app_config` read); `_getTemplate` spied (no `sec_template` read); `JwtMiddleware.prototype.use` stubbed (no `app_secrets`/ROAR lookup); `AppConfig.COMPLETE_CLIENT_HOST` is `process.env`-only. The Reviewer additionally traced the **real** `SetUpInterceptor`, which does run: both `setup()` calls short-circuit to `null` before any query on this request (`results.util.ts:26-36`, `portfolio.util.ts:23-34`). The suite is also self-guarding — had the `ENABLED` spy missed, dev's seeded `'false'` would return `SKIPPED` and `expect(sendEmailSpy).toHaveBeenCalledTimes(1)` would go red rather than passing quietly.

**KZ-001 satisfied (recurrence 4).** `REAL_CAPDEV_TEMPLATE_HTML` is `fs.readFileSync` of the real `capdev-bulk-summary.html`, and the stub reproduces `_getTemplate`'s semantics exactly including the `data === undefined` raw-string branch (`template.service.ts:22-23`). A `template: ''` stub would have driven `NO_TEMPLATE` and turned the CC assertion **red**, not vacuously green — the failure mode is closed from both directions.

#### Two Leader-directed advisory folds (no attempt consumed)

- **F-1 — the `afterAll` comments contradicted the evidence.** Both originally presented `app.close()` as *the* fix and cited "no `--forceExit` in the script" as the cause, while the A/B proved `forceExit` load-bearing. `jest-e2e.json` is JSON and cannot carry a comment, so those comments are the only honest home for the finding. Rewritten to state that both are required, that **deleting the config line restores the CI-blocking hang even with `app.close()` present**, and that the leak is masked rather than diagnosed. Folded because the original wording is a live trap: it invites a future maintainer to delete the one line that works.
- **F-2 — dropped the `as never` cast** at the `dispatch` call site. It defeated the only type check at the test's own hand-off point, and was unnecessary: `AiContactDto` is structurally assignable to `CapdevRecipientFileContact`, which is why `results.service.ts:1068-1071` needs no cast. The Implementer was told that if `tsc` went red without it, to **stop and report** rather than restore it — that would have meant T-10's recorded DTO compatibility was not real. It compiled clean, confirming the Reviewer's read. `tsc --noEmit` exit 0 after the fold.

#### D-T11-b — the documented endpoint path does not exist *(Leader correction, 2026-08-11)*

**Finding.** `design.md` §5, `requirements.md` §9 + §1/§3/R-CBU-001, and `tasks.md` T-11's Scope all named `POST /api/v1/results/ai/formalize/bulk`. **That route returns `404`.** Evidence, verified by the Leader and independently by the Reviewer:

- `main.ts:53-56` — `setGlobalPrefix('api')` + `enableVersioning({ type: VersioningType.URI })`, and **no `defaultVersion`** anywhere in `src/`.
- `results.controller.ts:656-682` — `createResultFromAiBulk` declares no `@Version()`. The only versioned handler in `ResultsController` is `@Version('2')` at `:257-258`.
- Under Nest, a handler with neither its own version nor a configured default mounts **without** a version segment. Reachable path: `POST /api/results/ai/formalize/bulk`.

**Consequence and why it is not a pivot.** Nothing about the design became unviable and no code changed — the endpoint's real path has always been unversioned, and the AI mining service's existing integration was never affected because it has always called the reachable path. This is a **documentation error corrected in place**, per the constitution's *"prefer fixing the document and recording a decision."* Had the Implementer obeyed the documented path, its test would have `404`d and proven nothing about D4; it booted the app, dumped the Express route table, and used the real route — the right call, correctly reported rather than silently taken.

**Correction closure — two-direction sweep executed** (per `/akili-specify` → *Correction Closure*):
- **Forward** (the superseded value at sites the analysis did not cite): `grep -rn "api/v1"` across the spec folder found **6** occurrences — `requirements.md:16,43,88,472`, `design.md:177`, `tasks.md:264`. All corrected; the only remaining matches are inside the two correction notes themselves, which quote the old value deliberately as historical record.
- **Backward** (documents citing the corrected sections, which may now assert a falsehood): the 5 references to `design.md` §5 / `requirements.md` §9 (`tasks.md:79`, `:262`, `execution.md:122`, `:139`, `:162`) are **pointers only** — none restates the path. No further edit owed.

#### Constitution Impact: T-11

The same inaccuracy is in the constitution, and it caused **demonstrated** harm in this run: three spec documents *and* the root guide told the Implementer `/api/v1/...`. Corrected immediately rather than deferred to `/akili-archive`, per the root guide's own rule that a guide actively misleading agents is fixed in the task commit:

- **root `CLAUDE.md` §4.1** — "URI versioning (`/api/v1`, `/api/v2`)" replaced with how versioning actually resolves (enabled, no `defaultVersion`, so a version segment appears only where `@Version(...)` is declared), plus the instruction to verify a path before writing a client, test, or doc against it.
- **`server/researchindicators/src/CLAUDE.md` §1** — "REST API under `/api/v{n}`" corrected the same way.
- No module was created or reshaped; no new child guide is needed. **CodeGraph re-index pending** (unchanged from prior tasks).

#### Recorded advisories — not folded, and deliberately NOT new tasks

`/akili-execute` → *Advisory Never Becomes A Task*: an advisory is recorded and dies there. None of these may widen this spec; each is the spec owner's call as a possible follow-up proposal.

| # | Lens | Advisory |
| --- | --- | --- |
| A-1 | Risk | **`forceExit: true` is a shared-config change with forward blast radius.** It now applies to every future e2e suite and will silently absorb leaks those suites introduce. Defensible as a backstop given `--detectOpenHandles` named nothing, and explicitly authorized by the T-11 brief — but it is an **accepted, undiagnosed leak**, not a fixed one. A follow-up should identify the holder. |
| A-2 | Reliability | **Extract the bootstrap instead of replicating it.** `setGlobalPrefix('api')` + `enableVersioning(...)` now live in both `main.ts` and the e2e. A future route-affecting bootstrap step would land in `main.ts` only, and the e2e would keep passing against a configuration production no longer has. An exported `configureHttpApp(app)` called by both removes the drift class permanently — and would make the `/v1` question un-guessable. **`src/` change, out of T-11's scope.** |
| A-3 | Reliability | **Auth is unobservable at e2e level for this endpoint.** With `JwtMiddleware.prototype.use` patched and `RolesGuard` overridden to always allow, deleting `@Roles(...)` from `createResultFromAiBulk` would turn **no** e2e red. Inside D-T11-a's approved seam map and out of scope — but one case (no header → 401, wrong role → 403) would close a gap with no gate at any layer. |
| A-4 | Reliability (minor) | **`mockClear()` does not drain `mockResolvedValueOnce` queues.** If AC.2 ever fails part-way through `dispatch`, unconsumed once-values would survive `afterEach` into the next test. Harmless today (AC.4 asserts the repository is not called at all). **Not folded deliberately:** changing mock lifecycle to fix a currently-latent coupling risks reddening a green suite for no present benefit. |
| A-5 | Readability | `AC.2`'s inline comment claims the assertion proves the address "survived the REAL builder + formatter + template render" — true, but a reader may over-read it as *through the endpoint's own service*. The precise framing is recorded in adjudication 1 above. |

#### Two findings the Implementer surfaced that outlive this task

1. **`MessageMicroservice` is declared as its own provider in five separate feature modules** (`result-status-workflow`, `result-oicr`, `ai-reports`, `green-checks`, `reporting-feedback`) rather than imported from one shared module, so **each declaring module gets its own instance**. This is a live DI footgun, and it bit: the Implementer's first attempt used `moduleFixture.get(MessageMicroservice)` + an instance-level `jest.spyOn`, which silently patched the **wrong object** — `updateNotificationStatus` recorded `SENT` while the spy saw zero calls, because the real `client.emit()` ran on a different instance. Fixed **in the test** via `.overrideProvider(MessageMicroservice)`, which patches the token across every declaring module at once. **`src/` was deliberately not touched** — consolidating those five declarations is outside T-11's scope and is a candidate follow-up proposal, not an advisory this spec may absorb. Any future e2e touching mail will hit the same trap.
2. **A real `client.emit()` reached the live RabbitMQ broker at least once during that debugging**, carrying fabricated `@example.org` addresses. `example.org` is the IANA-reserved test domain with no mail server, so **no human could receive anything** and the mailer had nothing deliverable — but a message was genuinely emitted to the real queue. Contained, self-reported, and recorded here rather than dropped. The `overrideProvider` fix makes it structurally unreachable from this suite going forward.

#### The delivery failure (protocol event, worth recording)

The Implementer's first turn **ended without delivering its report** — it stopped mid-wait on a background monitor. Per `.agents/leader.md` → *Idle is not delivered*, the Leader poked **once** with the specific evidence (a `-t "AC.2"` jest process alive 2 m 46 s against a ~3.6 s boot), and the full report came back. **No attempt was consumed** — this is an environment/protocol failure, not a work FAIL.

Two lessons, both Kaizen candidates at archive:

- **The Implementer's own background-task tool reported two `npx jest` invocations as "completed (exit code 0)" while both underlying `node` processes were still alive minutes later**, parent chain intact, with an `&&`-chained marker write that had never fired. The notification apparently tracks output-idle, not process death. The Implementer caught this itself, switched to marker-file + `ps` as its only trusted signal, and flagged that it had nearly repeated the false claim in its report. **This is precisely the class of defect T-11 existed to fix, appearing in the tooling used to verify the fix** — a green signal over a process that never exited.
- The Leader's own first inference from the mid-flight tree ("`jest-e2e.json` unmodified, so `app.close()` sufficed") was **wrong for the same reason** — reading a working tree while a worker is active measures an intermediate state. Corrected once the report arrived.

#### Status transition

- **T-11 → `[x]`** — Reviewer PASS attempt 1, two comment/type-only folds, `test:e2e` 4/4 green **and exiting** on the Leader's own run, `tsc` + `eslint` clean, unit-suite regression structurally impossible. D-T11-b corrected across 6 spec sites + 2 constitution guides with both sweep directions closed. **T-12 is unblocked — and is the last task in the spec.**

---

### Budget tripwire — **FIRED a second time**, measured before T-12, re-baseline accepted

Measured by the Leader at the T-11 → T-12 gate rather than after T-12 landed. That timing is the point: §14.1's own closing sentence armed the tripwire against ~4,600, and a tripwire checked only *after* absorbing the next task cannot stop anything.

| | Budgeted (2026-08-06) | Actual at 11/12 tasks |
| --- | --- | --- |
| Tasks | 12 | 11 done, 1 open — within |
| **LOC** (`src/` + `test/`) | **~4,600** | **5,085 insertions / 5,079 net — +485 (+10.5%), before T-12 writes a line** |
| Review rounds | 2 | ≤2 per task — within |

Measurement: `git diff --shortstat a5ee2c47~1..HEAD -- src/ test/` across the 15 `[SPEC:…]`-prefixed commits — 31 files. The 2,668 lines of spec documentation are excluded; the budget has always counted code.

**Leader's read, offered as a hypothesis and not a finding.** §14.1 identified the right driver (the ~1:1 test ratio) and then mis-allocated *inside* PR 3: ~1,500 for four tasks, of which **T-09 alone took 1,098**. PR 2's +265 is a separate and non-recurring cost — the OD-2 amendment (95 lines reopening T-04/T-07), which was rework forced by a requirements defect, not scope. No commit fails to map to an approved task, and the *advisory-never-becomes-a-task* rule held in both places it was tested (T-07's upper-clamp advisory, T-11's A-1 masked handle) — neither was quietly folded into a neighbour.

**User decision (2026-08-11): accept and re-baseline to ~5,600, finish T-12 in full.** `design.md` §14 revised, basis recorded in the new §14.2, `tasks.md` §1 and §3 swept, this Document Control updated. Correction Closure ran both directions: forward on `4,600`/`4600` (live sites `tasks.md:21`, `tasks.md:52`, `design.md:396`, `execution.md:13` — all corrected; §14.1 and the T-05 firing record left intact as history that was true when written), backward on `§14` / `Budget tripwire` (citers at `tasks.md:14-16` are generic and survive; `judgment.md:92` and `design.md:203` are the NFR-CBU-001 *time* budget and the query budget, unrelated).

**Explicitly declined:** narrowing T-12 to hold the old line. T-12 carries **R-CBU-004 AC.4**, an approved acceptance criterion currently unimplemented feature-wide — holding a number by shipping a known-unmet requirement trades a visible miss for an invisible one.

**Re-armed against ~5,600.** A third firing is no longer an estimation error to revise; it means the spec cannot be priced by this method, and the response is a scope conversation.

---

## 6. Open decisions blocking T-08

Two items surfaced by the T-07 review that are **spec-owner calls, not Implementer or Reviewer calls**. Both should be settled before T-08 is briefed, because T-08's rendered-body assertions depend on them.

| # | Decision | Why it cannot wait |
| --- | --- | --- |
| OD-1 | ~~**R-CBU-006 contradicts itself on empty countries.**~~ → ✅ **RESOLVED 2026-08-06** | See the resolution note below. |
| OD-2 | ~~**The rounds-to-zero suppression is only recorded in a test.**~~ → ✅ **RESOLVED 2026-08-09** | See the resolution note below. |

*(Neither is a Pivot: the design is internally consistent and the implementation follows it. OD-1 is a defect in one requirements sentence; OD-2 is a gap the requirements never addressed.)*

### OD-1 resolution — 2026-08-06

**User decision: fix the requirements sentence.** The metric table (and design §6.5) are correct; the scenario line was wrong.

**Ground truth established before editing**, from T-04's seeded template at `capdev-bulk-summary.html:16`:

```
{{trainingsCount}} trainings conducted{{#if countries}} across {{countries}}{{/if}}…
```

Because the empty-set fallback is the **non-empty** string `"multiple countries"`, `{{#if countries}}` passes and the clause renders. The degenerate body is therefore `"The records encompass 3 trainings conducted across multiple countries."` — the country clause is the one degenerate case that *substitutes* text rather than disappearing, which is exactly why the scenario's blanket "omits… and country clauses" was wrong.

**Correction Closure — both directions swept** (per `/akili-specify`):

- **Forward** (the superseded value at sites the analysis did not cite): grepped `multiple countries` / `country clause` across the whole spec folder. Exactly **one** wrong site — `requirements.md:263`. `requirements.md:242` (metric table), `design.md:263` (§6.5), and `tasks.md:175` (T-07 scope) all already said `"multiple countries"`.
- **Backward** (documents citing the corrected section, which may now assert a falsehood): grepped `Degenerate`. Citers are `tasks.md:176` (generic reference — still valid), `requirements.md:420` (D2 defect row — still valid), and `design.md:257`/`369` (DD-4 rationale — unaffected). **No citer asserted the old behavior.**

**Changes made:**

1. `requirements.md` — the scenario line split in two: the participants/percentage/date-range clauses are omitted, and a new line states the country clause still renders with the fallback. An inline correction note records what the sentence used to say and why it was wrong, so the change is not silently absorbed.
2. `tasks.md` T-08 — added a **binding correction** line to its `Tests` clause. This is the load-bearing edit: T-08's existing `Tests` list never mentioned the degenerate body at all, so an Implementer working from the old scenario sentence would have written `expect(body).not.toContain('countries')` and produced a red test against a *correct* formatter. Fixing only `requirements.md` would have left that trap armed.

No code changed. T-07 already implements the correct behavior and its 24 tests are unaffected.

### OD-2 resolution — 2026-08-09

**User decision: the `"<1%"` floor clause.** Neither suppression (which the code did) nor a literal `0%` (which the requirement's text implied).

**The question, restated from the artifacts rather than the summary.** `capdev-metrics.formatter.ts:65-69` computed `Math.round((female / participants) * 100)` and emitted `percentage > 0 ? String(percentage) : ''`. `capdev-bulk-summary.html:16` guarded the clause with `{{#if percentageWomen}}`. Together: a group with 4 women out of 1,240 participants produced `Math.round(0.32) === 0` → `''` → **the entire women clause vanished**, and the email reported the training as though no women attended. That rule lived in exactly one place — `capdev-metrics.formatter.spec.ts:115`, a test — which the T-07 Reviewer declined to accept as a requirement (*"a test is not a requirement"*) while also declining to FAIL it, on the grounds that the literal requirement would force the `"— 0% of whom were women, a most noteworthy figure"` render back into production.

**Resolved rule** (canonical text in `requirements.md` → R-CBU-006 → *Women-percentage rule*):

| `p = female / participants * 100` | `percentageWomen` |
| --- | --- |
| participants `0` / all-null | `""` (participants clause absent, so the nested clause cannot render) |
| `p <= 0` | `""` — clause omitted |
| `0 < p < 1` | `"<1%"` |
| `p >= 1` | `"{round(p)}%"` |

**Two decisions inside the decision, both deliberate:**

- **D-OD2-a — the boundary is `p < 1`, not `round(p) === 0`.** These differ on `0.5 ≤ p < 1`, where rounding would print `"1%"`. The floor is chosen there too: this rule exists because *silent misreporting in either direction* is the defect, and rounding `0.6%` up across the 1% line is the same error with the sign flipped. Written into the requirement explicitly so a future reader does not "simplify" it back to a round.
- **D-OD2-b — the `%` sign moves from the template into the formatter output, and the praise tail is dropped.** `— {{percentageWomen}}% of whom were women, a most noteworthy figure` becomes `— {{percentageWomen}} of whom were women`. The `%` has to move because one Handlebars slot must now carry both `"<1%"` and `"37%"`; a template-side `%` would render `"<1%"` only by accident of adjacency and could not express a floor at all. The praise tail goes because it was written for a headline figure and reads as sarcasm against a sub-1% share — the D7 embarrassment class, arriving through copy rather than through arithmetic.

**Why this reopens two closed tasks.** The copy lives in T-04's seeded migration **and** its byte-equality on-disk mirror; the rule lives in T-07's formatter, its DTO contract, and its tests. T-04 → `[~]`, T-07 → `[~]`. The migration is corrected **in place**, which is not an append-only violation: `1786045516418-insertCapdevBulkSummaryTemplate.ts` has never been executed anywhere (O-4 is still owed) and the branch is unmerged (`git branch --contains HEAD` returns only `AC-1607-…`). Both facts were verified before the amendment was written, not assumed.

**Correction Closure — both directions swept** (per `/akili-specify`):

- **Forward** (the superseded rule/copy at sites the analysis did not cite): grepped `most noteworthy` / `percentageWomen` / `Women %` / `of whom were women` across the spec folder. Live sites corrected: `requirements.md:246` (metric row), `design.md:261-264` (§6.5 table — the `"58"` example was also stale, now `"58%"`), `tasks.md:175` (T-07 scope). Code sites owed to the Implementer: the formatter, the DTO contract, the template, the migration literal. Hits at `execution.md:311/333/532/541/562` are **append-only history** and were true when written — deliberately left unchanged; this note is the record of what superseded them.
- **Backward** (documents citing the corrected sections, which may now assert a falsehood): grepped `R-CBU-006` / `DD-4` / `§6.5`. `requirements.md` AC.4 (participants `0` → no percentage clause) survives — that path still suppresses. `requirements.md:420` (D2 defect row), `design.md:369` (DD-4 rationale — reinforced, not contradicted), and `judgment.md:46` (AC.6 grouping) are unaffected. One citer *was* stale and is fixed: `tasks.md` §6 mapped R-CBU-006 to T-05 and T-07 only, though the copy now makes T-04 and the rendered-body assertions make T-08 both load-bearing for it.

**Not in scope, still open.** T-07 advisory 2 — no *upper* clamp on `percentageWomen`, so `SUM(female) > SUM(participants)` renders e.g. `"150%"`. Same defect class at the other end of the range, covered by no requirement. It remains a recorded advisory; it was not folded into this amendment and no task was minted from it.

---

## 5. PR 1 (Foundation) — completion state

All four foundation tasks have landed with a Reviewer PASS. Per `tasks.md` §3, PR 1 has **no runtime blast radius**: an additive DTO field, additive nullable columns, and seeded config/template rows that nothing calls yet.

| Task | Code | Reviewer | Status | Owed |
| --- | --- | --- | --- | --- |
| T-01 | ✅ | PASS | **`[x]`** | — |
| T-02 | ✅ | PASS | `[~]` | O-1, O-2 |
| T-03 | ✅ | PASS | `[~]` | O-3 |
| T-04 | ✅ | PASS | `[~]` | O-4, O-5 |

**PR 1 cannot be certified complete from this session.** `tasks.md` §8 requires migrations to apply and revert on dev, and `npm run lint -- --quiet` with a `git status` re-check (the script carries `--fix`, so it must not run mid-task). Both are pending: the former needs the supervised DB session in §4, the latter should run once before the PR opens.

---
