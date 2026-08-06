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
- **Budget tripwire** (`design.md` §14 / `tasks.md` §1): 12 tasks · ~1,450 LOC · 2 review rounds
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
| O-4 | T-04 | *(pending — seed `sec_template` row)* | to be filled when T-04 lands |

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
