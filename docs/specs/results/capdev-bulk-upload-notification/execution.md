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
| O-4 | T-04 | `npm run migration:dev:execute` then `npm run migration:revert` | the `capdev-bulk-upload-summary` row appears in `sec_template`; revert removes only it |
| O-5 | T-04 | `_getTemplate(TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY)` returns non-empty against dev | **the one claim static review cannot close** — it is also the only way to confirm the live `sec_template.is_active` column really carries `DEFAULT 1`, rather than merely being declared `default: true` on `AuditableEntity`. Three working precedents make it near-certain, not proven. |

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
