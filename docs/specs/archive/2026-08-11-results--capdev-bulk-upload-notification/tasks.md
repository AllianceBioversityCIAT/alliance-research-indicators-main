# Tasks — Results / CapDev Bulk Upload Notification

- **Module:** results (implementation in `ai-reports`)
- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Status:** **execution complete — 12/12 tasks `[x]` as of 2026-08-11.** The §8 Done definition is not yet fully discharged (coverage measurement, migration revert, flag re-confirmation, and the human email review remain owed). Next phase: `/akili-test`.
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md) (r4)
- **Review ledger:** [`./judgment.md`](./judgment.md) — APPROVED, 9 non-severe entries open
- **Last updated:** 2026-08-06

---

## 1. Budget tripwire

From `design.md` §14. `/akili-execute` **stops and escalates** rather than continuing past these:

| Signal | Budget |
| --- | --- |
| Tasks | 12 |
| LOC | **~5,600** — re-baselined **2026-08-11** after the tripwire fired a second time before T-12 (5,085 actual at 11/12 tasks). Prior figures ~4,600 (2026-08-06) and ~1,450 (original). Basis and cause in `design.md` §14.1 and **§14.2**. |
| Review rounds | 2 |

---

## 2. Dependency graph

```
        ┌── T-01 (DTO + Swagger) ─────────────────────────┐
        │                                                 │
PR 1 ───┼── T-02 (migration: columns + entity) ── T-05 ────┤
        ├── T-03 (config enums + accessors) ──────────┐   │
        └── T-04 (template enum + seed + HTML) ───┐   │   │
                                                  │   │   │
PR 2 ─────────── T-05 (repository, 4 queries) ────┼───┼───┤
                   ├── T-06 (recipients builder)  │   │   │
                   └── T-07 (metrics formatter) ──┤   │   │
                            └── T-08 (email assembly) ─┤   │
                                                       │   │
PR 3 ─────────────────── T-09 (service orchestration) ─┘   │
                              └── T-10 (wire into ResultsService + module) ─┘
                                       ├── T-11 (e2e payload contract)
                                       └── T-12 (failure isolation suite)
```

No cycles. T-01 through T-04 are mutually independent and parallelisable.

---

## 3. PR strategy

~5,600 LOC far exceeds the 400-LOC single-PR guidance. Three PRs, split so that **only the last one changes runtime behavior**. The `~LOC` column below is **re-baselined 2026-08-11** (`design.md` §14.2); every PR lands well above the guidance, so each PR description must state its real size up front rather than let a reviewer discover it:

| PR | Tasks | ~LOC | Blast radius |
| --- | --- | --- | --- |
| **PR 1 — Foundation** | T-01 … T-04 | **812 actual** *(est. ~450)* | **None at runtime.** Additive DTO field, additive columns, seeded config/template rows. Nothing calls any of it yet. |
| **PR 2 — Engine** | T-05 … T-08 | **2,615 actual** *(est. ~600, then ~2,350)* | **None at runtime.** Repository + two pure modules + email assembly, fully unit-tested but unwired. |
| **PR 3 — Activation** | T-09 … T-12 | **1,727 actual through T-11** *(est. ~400, then ~1,500)* · ~2,100 projected with T-12 | **The only PR with blast radius** — and it lands with the flag seeded `false`, so even merged it sends nothing until someone flips a row. |

Per `cognitive-doc-design` review-empathy: each PR description states what to review first, what is deliberately dead code until the next PR, and links previous/next.

---

## 4. Verification contract (applies to every task)

Two rules, both non-negotiable:

1. **State what satisfies the evidence *and* what disqualifies it.** Each task below carries a `Disqualifies` clause. An inconclusive verification is a legitimate outcome and must be reported as one — never collapsed into a pass because the command exited `0`.
2. **Green costs one line; failures print verbatim.** `npm test -- --silent` from `server/researchindicators/`. ⚠️ `npm run lint` carries `--fix` and **mutates files** — re-check `git status` after.

---

## 5. Task list

### T-01 — Extend the AI bulk payload with file contacts
- **Status:** [x]

- **Requirements covered:** R-CBU-005
- **Design refs:** §5, §8
- **Files:** `src/domain/entities/results/dto/result-ai.dto.ts`, sibling spec
- **Scope:** Add `AiContactDto` (`email` required `@IsEmail`; optional `name`, `role` enum `reporting_leader|contact_person|other`, `contract_code`) and `contacts?: AiContactDto[]` on `ProcessMedatada` with `@IsOptional() @ValidateNested({each:true}) @Type(() => AiContactDto)`. `@ApiProperty` on every field.
- **Why it is first:** `results.controller.ts:663-669` runs `forbidNonWhitelisted: true`. Until this lands, any `contacts` property the AI service sends is a hard `400`. This is the enabling step, not a nicety.
- **Tests:** validation unit tests — payload without `contacts` passes; with valid contacts passes; missing/non-string `email` rejected.
- **Done:** `npm test -- --silent` green; `/api` Swagger renders `metadata.contacts`.
- **Disqualifies:** a passing test that never exercises the real `ValidationPipe` config (`whitelist` + `forbidNonWhitelisted` + `transform`). If the DTO is validated with default pipe options, the test proves nothing about the endpoint — report inconclusive.
- **Skills:** `nestjs-expert`, `api-design-principles` · **Size:** S

---

### T-02 — Additive migration + entity columns on `bulk_upload_processes`
- **Status:** [x] — code complete, Reviewer PASS. **O-1 verified against dev 2026-08-09** (9 nullable columns, correct types, no backfill). **O-2 waived by the spec owner on static review — the revert was never executed**, so a production rollback of this migration is unrehearsed; see `execution.md` §4.

- **Requirements covered:** R-CBU-008, NFR-CBU-005
- **Design refs:** §4.1
- **Files:** `src/domain/entities/ai-reports/entities/bulk-upload-processes.entity.ts`, `src/db/migrations/<ts>-addBulkUploadNotificationMetrics.ts`, `.../notifications/enum/notification-status.enum.ts`
- **Scope:** 9 nullable columns per §4.1 + the `NotificationStatus` enum (`SENT|SKIPPED|FAILED|PARTIAL`). Generated with `npm run migration:generate -- ./src/db/migrations/<name>`.
- **Tests:** entity metadata unit test asserting every column is nullable with no default.
- **Done:** `npm run migration:dev:execute` applies cleanly on dev; `npm run migration:revert` reverses it; existing rows unchanged.
- **Disqualifies:** any generated `ALTER` that narrows a type, drops a column, or backfills. If the generated migration touches anything beyond the 9 additive columns, **do not hand-edit it into shape** — regenerate and report what leaked in. A migration diff you had to prune is evidence the datasource is out of sync, not a clean migration.
- **Skills:** `nestjs-expert` · **Size:** S

---

### T-03 — Config enums + **non-throwing** accessors + seed migration
- **Status:** [x] — code complete, Reviewer PASS. **O-3 verified against dev 2026-08-09**: both rows present, `ENABLED = 'false'` (seeded off), `CC_EMAIL = ''`, both `is_active = 1`. That last value is not incidental — the seed INSERTs omit `is_active` and rely on the DDL default, so a non-`1` would have made the flag read as absent and the feature never run while looking correctly disabled. See `execution.md` §4.

- **Requirements covered:** R-CBU-009, R-CBU-004 (source 6)
- **Design refs:** §6.3, §4.3, DD-5
- **Files:** `src/domain/entities/app-config/enum/app-config-catergory.enum.ts`, `src/domain/shared/utils/env-app-config.util.ts`, `src/db/migrations/<ts>-insertCapdevBulkNotificationConfig.ts`, sibling specs
- **Scope:** `AppConfigSubcategory.CAPDEV_BULK_UPLOAD`, `AppConfigField.CC_EMAIL`, `AppConfigField.ENABLED`; two accessors returning `{value, defaulted}`; seed rows `ENABLED='false'` and `CC_EMAIL=''`.
- **Two constraints from Judgment Day — read §6.3 before writing a line:**
  - **Do not `try/catch` around `getConfig`.** It calls `this.logger.error(...)` at `env-app-config.util.ts:43-47` *before* throwing; catching hides the throw but not the ERROR line, so a default-off environment would log an error on every upload. Query the repository directly or add a non-throwing `tryGetConfig`.
  - **The accessor must not log.** It returns the `defaulted` marker; T-09's service emits the warn, because only the service holds the process id §10 requires.
- **Tests:** absent `ENABLED` row → `{value:false, defaulted:true}`, **no throw and no error-level log**; absent `CC_EMAIL` → `{value:[], defaulted:true}`; present rows parse correctly.
- **Done:** `npm test -- --silent` green; migration applies and reverts.
- **Disqualifies:** a test that asserts only the returned value. It **must** also assert no `InternalServerErrorException` escaped *and* that no error-level log was emitted on the absent-row path — the value alone would pass even for the `try/catch` implementation this task exists to prevent.
- **Skills:** `nestjs-expert`, `error-handling-patterns` · **Size:** M

---

### T-04 — Template enum, seeded `sec_template` row, on-disk mirror
- **Status:** [x] — code complete, Reviewer PASS ×2 (conformance + risk lenses) after the **OD-2 copy amendment, 2026-08-09**. **O-4 and O-5 both verified against dev 2026-08-09**: row present and `is_active = 1`, `CHAR_LENGTH` identical to the on-disk file, em dash intact after storage. The byte-equality chain now closes end to end — disk == migration literal == **the stored row** — which is what T-08's rendering tests ultimately rest on. See `execution.md` §4.

- **⚠️ OD-2 amendment (2026-08-09) — copy change, in place.** The participants sentence's percentage clause becomes `— {{percentageWomen}} of whom were women`: the literal `%` moves out of the template into the formatter's output string, and the hardcoded praise tail `, a most noteworthy figure` is **dropped** (it was written for a headline figure and reads as sarcasm against `"<1%"`). Because the migration is **unapplied and unmerged** (O-4 still owed), the seeded string is corrected **in place** — this is not an append-only violation; there is no merged migration to preserve. The byte-equality invariant with `capdev-bulk-summary.html` binds exactly as before: **both sides change or neither does.**

- **Requirements covered:** R-CBU-007, R-CBU-006 *(the percentage clause copy)*
- **Design refs:** §4.2, §3, §6.5
- **Files:** `src/domain/shared/auxiliar/template/enum/template.enum.ts`, `src/domain/shared/auxiliar/template/template/capdev-bulk-summary.html`, `src/db/migrations/<ts>-insertCapdevBulkSummaryTemplate.ts`
- **Scope:** `CAPDEV_BULK_UPLOAD_SUMMARY = 'capdev-bulk-upload-summary'`; the approved copy as Handlebars HTML with `{{#if}}` guards on every optional clause (participants, percentage, date range, countries); insert into **`sec_template`** — *not* `templates`; that table does not exist. Follow `1772481692172-insertNewTemplateInnovationLevel.ts`.
- **Tests:** none of its own — T-08 renders this exact file.
- **Done:** migration applies; `_getTemplate(CAPDEV_BULK_UPLOAD_SUMMARY)` returns non-empty against dev.
- **Disqualifies:** an on-disk HTML that has drifted from the migration's inserted string. **KZ-001 applies:** T-08's assertions run against the on-disk file, so if the two diverge, every downstream rendering test is measuring something that is not in the database. Assert byte-equality between the file and the migration literal, or generate one from the other.
- **Skills:** `nestjs-expert` · **Size:** M

---

### T-05 — Notification repository: four grouped queries + two writes
- **Status:** [x] — code PASS on both review lenses (reliability + risk). The suspected `ER_FIELD_IN_ORDER_NOT_SELECT` in Q1's `GROUP_CONCAT` was fixed on user authorization. **O-6 discharged 2026-08-09:** all four queries executed against dev MySQL across five bulk processes, 5/5 green — parser-level rejections fire at prepare time regardless of row count, so a completed run proves the class absent. ⚠️ Two output paths (`multiPrimaryWarnings`, `findUnattributedResultIds`) returned empty on every process, so their **SQL is proven but their row-mapping is not** — that rests on the repository spec's fixtures. See `execution.md` §4 → O-6 detail.

- **Requirements covered:** R-CBU-002, R-CBU-003, R-CBU-006, R-CBU-008
- **Design refs:** §6.1
- **Files:** `.../notifications/capdev-bulk-notification.repository.ts` + spec, `.../notifications/dto/capdev-bulk-group.dto.ts`
- **Scope:** Q1 groups+people+token owner, Q2 metrics, Q3 countries (**both** `name` for the body and `isoAlpha2` for the JSON column), Q4 unattributed `result_id`s. Plus `persistProcessMetrics` and `updateNotificationStatus`.
- **The three traps, all from Judgment Day:**
  - Q1 **must** `GROUP BY ac.agreement_id`. Without it the spine returns one row per *result* → N emails for an N-result project (R-CBU-002 AC.1).
  - Multi-primary tie-break: lowest `result_contract_id` + warn log. Nothing in the schema prevents two active primary rows.
  - Q4 selects `result_id`s, **not** `COUNT(*)` — R-CBU-002 AC.3 requires the log to name them.
  - CapDev filter bound from `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`, never a literal `1`.
- **Tests:** an N-result single-contract fixture returns **exactly one** Q1 row; a 3-contract batch returns 3; errored/`result_id IS NULL`/non-CapDev rows excluded; multi-primary tie-break deterministic; query count is O(groups).
- **Done:** `npm test -- --silent` green.
- **Disqualifies:** a grouping test built on a fixture where every contract has exactly one result — that fixture cannot distinguish a correct `GROUP BY` from a missing one, which is the specific defect this task exists to prevent. At least one contract in the fixture must carry ≥3 results.
- **Skills:** `nestjs-expert`, `tdd` · **Size:** L

---

### T-06 — `capdev-recipients.builder.ts` (pure)
- **Status:** [x] — Reviewer PASS, attempt 1. Purity disqualifier verified in the spec file *and* the module. See `execution.md` → T-06.

- **Requirements covered:** R-CBU-003, R-CBU-004
- **Design refs:** §6.4
- **Files:** `.../notifications/capdev-recipients.builder.ts` + spec
- **Scope:** `build(group, fileContacts, sprmEmails, configuredCc) → {to, cc, salutation} | null`. Sanitise → validate → drop-if-in-`to` → dedupe, all case-insensitive and trimmed. Ordered three-tier salutation (staff name → `project_lead_description` → `"Colleagues"`). File contacts partitioned by `contract_code`.
- **Hard rules:** `to` is **only ever** the PI; a missing PI returns `null` and the group is skipped — never backfilled from CC. A missing *name*, by contrast, falls to tier 3 and still sends.
- **Tests:** PI-also-RA appears once, in `to`; `PI@Example.org` in `to` suppresses `pi@example.org` from cc; malformed entries (`"n/a"`, `"—"`, `"John Doe"`) dropped; every optional source absent still yields SPRM in cc; contract-scoped contact reaches only its group; unscoped contact reaches all; salutation tier 1 wins over tier 2 when both present.
- **Done:** `npm test -- --silent` green.
- **Disqualifies:** any test that reaches a database, a clock, or config. This module is pure by design precisely so its rule table can be exhausted — if a test needs a mock beyond plain objects, the seam is wrong and the module should be re-cut, not the test relaxed.
- **Skills:** `tdd` · **Size:** M

---

### T-07 — `capdev-metrics.formatter.ts` (pure)
- **Status:** [x] — Reviewer PASS attempt 1, then reopened for the **OD-2 amendment (2026-08-09)** and re-PASSed by two independent lens Reviewers (conformance + risk). OD-1 and OD-2 are both resolved (`execution.md` §6). No owed evidence. **T-08 is unblocked.**

- **⚠️ OD-2 amendment (2026-08-09).** `formatParticipants` gains the floor branch and emits the `%` sign itself. Exact rule, including the `p < 1` boundary (**not** `round(p) === 0`), in `requirements.md` → R-CBU-006 → *Women-percentage rule*. The DTO doc contract at `capdev-bulk-email-template.dto.ts:56-63` currently states *"without the `%` sign"* and *"empty whenever the computed percentage rounds to `0`"* — **both sentences are now false and must be rewritten**, not merely appended to. New tests owed: the sub-1% floor, the exact `p == 1` boundary, and `female == 0` (which stays suppressed).

- **Requirements covered:** R-CBU-006
- **Design refs:** §6.5, DD-4
- **Files:** `.../notifications/capdev-metrics.formatter.ts` + spec, `.../notifications/dto/capdev-bulk-email-template.dto.ts`
- **Scope:** raw aggregate + country list → template DTO of **pre-rendered strings**. Every degenerate case resolved here, never in Handlebars (which fails silently). Participants `0`/all-null → participants *and* percentage clauses empty; women share `<= 0` → percentage clause empty; women share `0 < p < 1` → `"<1%"`; women share `>= 1` → `"{round(p)}%"`; either date bound null → date clause empty (never a half-range); empty countries → `"multiple countries"`; `en-US` thousands separators.
- **Tests:** the full degenerate matrix, plus the R-CBU-006 "Degenerate metrics" scenario end to end.
- **Done:** `npm test -- --silent` green.
- **Disqualifies:** asserting only on the happy path. The gate is a **negative** assertion over the produced strings — no `NaN`, `Infinity`, `null`, `undefined`, `Invalid Date`, and no dangling connector (`"from  to "`). A suite without those negatives does not cover the defect class this module exists for.
- **Skills:** `tdd` · **Size:** M

---

### T-08 — Template wrapper + email assembly
- **Status:** [x] — Reviewer PASS ×2 (reliability + risk lenses), attempt 1, 2026-08-09. Both lenses independently found that **D-OD2-d was only half-delivered**: the `<1%` branch was gated but the `p >= 1` branch was not, so dropping the `%` from `capdev-metrics.formatter.ts:94` left T-08's whole suite green. Closed by a Leader-directed advisory fold (not a rework; attempt count unchanged) whose gate was **demonstrated red-then-reverted**, not asserted. **No owed evidence** — rendering runs the on-disk template through real Handlebars, and T-04's byte-equality guard couples that file to the migration literal. See `execution.md` → T-08 for D-T08-a/D-T08-b and the four recorded advisories.

- **Requirements covered:** R-CBU-007, NFR-CBU-003
- **Design refs:** §6.2, §2.2
- **Files:** `.../notifications/capdev-bulk-notification.service.ts` (assembly portion) + spec
- **Scope:** the `_getTemplate` wrapper; subject `[{agreement_id}] Training Results…`; STAR link from `AppConfig.ARI_CLIENT_HOST` + `/results-center` with the CapDev indicator tab; token-owner contact sentence; the `EmailBody`.
- **Two traps:**
  - `_getTemplate` **throws** on a missing row (`template.service.ts:12-20` destructures from a `null` `findOne`). Wrap it; treat both a throw and an empty return as `NO_TEMPLATE`, logged at **error** (R-CBU-007 AC.5).
  - The rendered HTML goes in `message.socketFile` as `Buffer.from(html)`. **Never `message.text`** — the naming invites the wrong choice and all three existing callers use `socketFile`.
- **Tests:** rendered body contains no `{{`; subject begins `[<agreement_id>]`; link starts with `ARI_CLIENT_HOST`; token owner name+email present; no `trainee_name` anywhere in the body; missing template → zero `sendEmail`, one **error** log; `message.text` unset and `socketFile` a `Buffer`.
- **⚠️ Binding correction (OD-2, 2026-08-09) — these two tests are BLOCKING, not owed.** The rendered-body assertions bind to the **amended** copy — `— {{percentageWomen}} of whom were women`, with no `%` in the template and no `, a most noteworthy figure` tail. Required here, not only in T-07:
  1. a sub-1% fixture renders the floor clause — **assert the escaped form** `"— &lt;1% of whom were women"`, or decode the body first. `{{percentageWomen}}` is a double stache and Handlebars escapes the `<`; the reader still sees `<1%`. **Do not "fix" this by switching to `{{{percentageWomen}}}`** — a raw `<` in HTML text is invalid markup that survives only because `<1` cannot begin a tag name (D-OD2-c).
  2. a `female == 0` fixture renders the participants clause with **no** women clause at all.
  **Why blocking (D-OD2-d):** D-OD2-b — the `%` living in the formatter rather than the template — is a **cross-file invariant with no gate**. Byte-equality couples the on-disk HTML to the migration literal; nothing couples either to the formatter. Re-add `%` to the template and the body renders `58%%`; drop it from the formatter and it renders `— 58 of whom were women`. Neither goes red until these tests exist.
- **⚠️ Binding correction (OD-1, 2026-08-06):** the degenerate-scenario rendered-body test must assert `"across multiple countries"` is **present**. R-CBU-006's scenario previously said the country clause was omitted; that sentence was wrong and has been corrected. An empty country set renders the `"multiple countries"` fallback — a non-empty string, so `{{#if countries}}` passes. Asserting its absence fails against a *correct* formatter.
- **Done:** `npm test -- --silent` green.
- **Disqualifies:** **stubbing the template (KZ-001).** Rendering assertions must run Handlebars against the real `capdev-bulk-summary.html` from T-04. A `template: ''` stub makes "no `{{` remaining" and "no `NaN`" pass vacuously — that exact failure mode consumed four instances in a prior spec.
- **Skills:** `nestjs-expert`, `error-handling-patterns` · **Size:** M

---

### T-09 — `CapdevBulkNotificationService` orchestration
- **Status:** [x] — Reviewer PASS ×2 (reliability + data-semantics lenses), attempt 1, 2026-08-11. A prior spawn died on a network error before writing code; that is an environment failure and consumed no attempt. Three Leader-directed folds: **AC.4 made structural** (`sent_at` derived from the status, not from a count), **AC.6 gated** (an unmocked dispatch compares the rendered trainings count against the same run's persisted value — the T-08 ungated-invariant shape, closed here), and **Q2 `is_active` + `total_results`** per spec-owner decisions D-T09-a/b/c. **O-6 re-verified against dev** after the Q2 change, 5/5 on five processes. See `execution.md` → T-09.

- **Requirements covered:** R-CBU-001, R-CBU-002, R-CBU-008, R-CBU-009, R-CBU-011, NFR-CBU-002
- **Design refs:** §2.1, §6.6, §10
- **Files:** `.../notifications/capdev-bulk-notification.service.ts` + spec
- **Scope:** `dispatch(processId, fileContacts)` in the §2.1 step order; per-group try/catch; the `notification_status` decision; every §10 log line, with the config-defaulted warn emitted **here** (the accessor has no batch context).
- **Step order is the requirement, not a detail:** the flag check sits **after** `persistProcessMetrics`. Gating the queries behind it satisfies "no email" while silently failing R-CBU-008 and R-CBU-009 AC.1/AC.2.
- **`notification_status` derivation** — write this table into the code as the single source:

  | flag | groups | dispatched | status |
  | --- | --- | --- | --- |
  | any | 0 | — | `SKIPPED` (`sent_at` null) |
  | off | >0 | 0 | `SKIPPED` (`sent_at` null) |
  | on | >0 | = groups | `SENT` |
  | on | >0 | 0 | `FAILED` |
  | on | >0 | 0 < n < groups | `PARTIAL` |

  *(Closes ledger entry JD-S8, which flagged this derivation as defined only for `PARTIAL`.)*
- **Tests:** flag `false` → metrics **written**, status `SKIPPED`, zero `sendEmail`; flag row absent → same + one warn; zero CapDev results → `SKIPPED`, no email; group 1 throwing still dispatches group 2 → `PARTIAL`; unresolvable PI skips that group only; info logs carry counts and **no email address**.
- **Carried forward from T-08's review (2026-08-09) — three things this task inherits and must decide, not discover:**
  1. **`sendGroupNotification` is T-08's; consume it, don't re-implement it.** Signature and outcome type in `execution.md` → T-08. A `sendEmail` rejection **propagates by design** so this task's per-group `try/catch` is the single logger — do not add a second catch inside the send path or R-CBU-010 AC.5's "exactly one error log" breaks.
  2. **The token-owner parameter is non-nullable (D-T08-a).** `CapdevBulkGroupDto.token_owner` is nullable, so the call site here **will not compile** until this task states the guarantee. That compile error is deliberate. Decide explicitly — skip the group, or fall back to a support address — and record the choice; do **not** silence it with an empty string, which ships `contact direct them to  ().` to a Project Leader.
  3. **`SENT` means "handed to the broker", not "delivered."** `MessageMicroservice.sendEmail` is `client.emit` — fire-and-forget, no acknowledgement. The `notification_status` table above inherits that weaker guarantee: a broker-side failure will never produce `FAILED` or `PARTIAL`. Correct existing platform behaviour, not a defect to fix here — but the status column's meaning should be documented in the code so a dashboard reader is not misled.
- **One advisory worth folding in while you are here:** `safeGetTemplate` uses a bare `catch`, so a transient DataSource error is reported as `NO_TEMPLATE` — logged at error as "the template row is missing" — rather than as a group failure. Conforms to design §6.2, but blurs R-CBU-011 AC.3's skipped-vs-failed distinction for a cause that is neither. A distinguishing log field costs one line.
- **Done:** `npm test -- --silent` green.
- **Disqualifies:** a flag-off test asserting only `sendEmail` was not called. That passes for the *wrong* implementation (flag first). It must **also** assert the metrics write happened and `notification_status = 'SKIPPED'` was persisted.
- **Skills:** `nestjs-expert`, `error-handling-patterns` · **Size:** L

---

### T-10 — Wire into `ResultsService` + module registration
- **Status:** [x] — Reviewer PASS ×2 (conformance/reliability + risk/resilience), attempt 1, 2026-08-11, plus one comment-only Leader-directed fold (no attempt consumed). Full Done clause discharged on the Leader's own runs: `npm test` 2186/2186, **`npm run test:e2e` green (1/1)**, and **the app boots with 0 DI resolution errors**. A dev-MySQL (VPN) outage during briefing made the Leader mis-diagnose the e2e harness and open an owed-evidence item (O-7); both were retracted once the DB returned — see `execution.md` → T-10 → *The environment scare*. Two corrections to the spec's own record landed here: **JD-S7's mechanism is DB-shaped, not broker-shaped**, and **§3's flag-off claim holds only as written** (5 reads + 2 writes run per upload regardless of the flag). **T-11 and T-12 are unblocked.**

- **Requirements covered:** R-CBU-001, R-CBU-010
- **Design refs:** §2.1, §3, §6.6
- **Files:** `src/domain/entities/results/results.service.ts` (~`:1058`), `src/domain/entities/ai-reports/ai-reports.module.ts`, specs
- **Scope:** capture `AiReportsService.create`'s return; call `dispatch(process.id, metadata?.contacts)` wrapped so nothing escapes. Module delta is more than "register providers" — `AiReportsModule` has **no `imports` array** today and `TemplateModule` is not `@Global()`: add `imports: [TemplateModule]`, `MessageMicroservice` to providers, the new service+repository to providers, and the service to exports.
- **Tests:** `sendEmail` throwing → endpoint still `201` with unchanged `data`; repository throwing → same; results created before the failure remain persisted; the `data` payload is byte-identical to pre-change for the same input.
- **Done:** `npm test -- --silent` green; `npm run test:e2e` green; app boots (no DI resolution error).
- **Disqualifies:** a passing unit suite alone. DI wiring failures surface at **bootstrap**, not in unit tests with hand-built providers — an app that boots is part of the evidence, and a suite that mocks the module graph cannot supply it.
- **Skills:** `nestjs-expert` · **Size:** M

---

### T-11 — E2E: the payload contract holds both ways
- **Status:** [x] — Reviewer PASS attempt 1 (lens-checklist mode), 2026-08-11, plus two Leader-directed folds (comment + type-only; no attempt consumed). `npm run test:e2e` **4/4 green and the process exits** on the Leader's own run. **The inherited non-exit needed BOTH fixes** — `app.close()` alone left jest alive 5+ minutes across two independent runs; `"forceExit": true` in `test/jest-e2e.json` is the load-bearing part, and `--detectOpenHandles` named no handle, so the leak is **masked, not diagnosed** (advisory A-1). Zero writes *and* zero queries reach the shared dev DB (`SetUpInterceptor` short-circuits before any query). **D-T11-b:** the documented path `/api/v1/results/ai/formalize/bulk` **does not exist** — `main.ts:53-56` sets no `defaultVersion` and the handler declares no `@Version()`, so it mounts unversioned; corrected across 6 spec sites + 2 constitution guides, both sweep directions closed. AC.3 is not owed here (discharged at `capdev-recipients.builder.spec.ts:135-155`), but a **cross-group CC leak is gated only at unit level**. See `execution.md` → T-11.

- **⚠️ Inherited harness defect, assigned here by spec-owner decision 2026-08-11.** `npm run test:e2e` **passes** but the process **never exits** — jest holds open handles (DB pool, RMQ, cron) and the script carries no `--forceExit`. Verified by A/B with T-10 stashed: pre-change `PASS 4.461 s` then no exit; post-change identical. **Pre-existing, not introduced by T-10.** Left unfixed, a CI runner blocks until it times out, and locally the run looks like a hang with no output (it cost the Leader an 18-minute dead wait).
  - **Do not widen this into a timeout fix.** A first Leader diagnosis also called the suite red on a 5000 ms hook timeout — that was the app retrying an unreachable dev MySQL during a VPN outage, not a harness defect. With the DB up, the boot is ~3.6 s, comfortably inside the default. **Only the non-exit is real.**
  - Whatever T-11 adds must exit on its own; asserting a green result is not enough if the process then hangs.

- **Requirements covered:** R-CBU-005
- **Design refs:** §5, defect class D4
- **Files:** `test/` (jest-e2e)
- **Scope:** supertest against `POST /api/results/ai/formalize/bulk` — legacy payload **without** `contacts` → `201`; payload **with** valid contacts → `201` and they reach CC; contact with a malformed `email` → `400` in the `GlobalExceptions` envelope, batch not persisted.
- **Done:** `npm run test:e2e` green.
- **Disqualifies:** a "legacy payload" fixture that isn't actually the pre-change shape. Capture it from the current `RootAi` **before** T-01 merges, or the regression this guards against is untested — a fixture written after the DTO change will happily include the new field.
- **Skills:** `nestjs-expert` · **Size:** M

---

### T-12 — Failure-isolation and data-minimisation sweep
- **Status:** [x] — Implementer attempt 1, **Reviewer PASS ×2** (conformance/reliability + risk/security/data-minimisation lenses), 2026-08-11, plus a 5-item Leader-directed fold batch (no attempt consumed). Full unit suite **2196/2196**, `test:e2e` **4/4**, `lint --quiet` clean with `git status` re-checked — all on the Leader's own gate. **R-CBU-004 AC.4 closed**: the builder now returns `dropped: string[]` and the service `_debug`s it, with T-06's purity disqualifier verified intact by the conformance lens. Two spec-owner decisions landed here: **D-T12-a** — R-CBU-010 AC.3 promised per-group isolation for a metric-query failure that the grouped-read architecture never provided (Q2/Q3/Q4 precede the loop; a read failure suppresses the **whole batch**), corrected in the design's favour because NFR-CBU-001 forbids the fan-out the old AC implied, both sweep directions closed. **D-T12-b** — `design.md` §9's "addresses only at debug" is not an installed control (`main.ts` sets no log levels), rollout-gated on the §14 security sign-off rather than folded here. Fold 3 also closed a KZ-001-shaped seam and, in the same move, covered the one *genuine* per-group query failure (`TEMPLATE_QUERY_ERROR`) through `dispatch()`. See `execution.md` → T-12. **Last task in the spec — 12/12.**

- **Requirements covered:** R-CBU-010, R-CBU-011, NFR-CBU-002, NFR-CBU-003, **R-CBU-004 AC.4**
- **Design refs:** §6.6, §9, §10
- **Files:** cross-cutting specs, **plus `capdev-recipients.builder.ts` + spec and the `dispatch()` loop** (see the orphaned-AC item below)
- **Scope:** the R-CBU-010 "Broker down" scenario end to end; isolation under three distinct failure modes — **send throws** and **template missing/erroring** are per-group; **metric query throws** is batch-wide and is gated at the outer boundary in `ResultsService` (**D-T12-a** — see `requirements.md` R-CBU-010 AC.3 and `design.md` §6.6; the original "per-group" wording for this mode described an architecture that was never built); assert exactly one error log per caught failure carrying the process id; assert no email address at info level; assert no `trainee_name` in any rendered body.
- **⚠️ Orphaned AC, assigned here by spec-owner decision 2026-08-11.** **R-CBU-004 AC.4** — "a malformed entry is dropped and **logged at debug level**" — is unimplemented **feature-wide**, not merely unfinished. T-06 owns R-CBU-004 and shipped without it; the T-09 review found it while diffing §10 row by row. No other remaining task claimed it.
  - **Why it could not land in T-09:** `capdev-recipients.builder.ts` returns `{ to, cc, salutation } | null`; drops happen inside `buildCc` via a bare `continue` that retains nothing, so there is **no data at the orchestration layer to log**. `tasks.md` told T-09 to implement "every §10 log line" while its **Files** clause denied it the file needed — a spec-internal contradiction, not implementer drift.
  - **Fix:** widen the builder's return to `{ to, cc, salutation, dropped: string[] }` and `_debug` it in the per-group loop. ~4 lines across two files.
  - **T-06's purity disqualifier survives** — `dropped` is a return value, not a side effect. No DB, no clock, no config. Do not "simplify" this into a logger call inside the builder; that would break the purity gate T-06 was reviewed against.
  - **Test it as a drop, not as a log call:** feed a malformed address, assert it is absent from `cc` **and** that a debug line names it. A spy on `_debug` alone passes for a builder that logs everything and drops nothing.
- **Done:** `npm test -- --silent` and `npm run test:e2e` green; full-suite run clean (KZ-003 — this task touches a shared service; a targeted run confirms the brief was followed, not that the blast radius is clean).
- **Disqualifies:** counting log calls without inspecting their level and payload. "One log emitted" is not the requirement — "exactly one **error**-level log, carrying the bulk process id, and no address at info" is. A spy asserting only call count cannot tell those apart.
- **Skills:** `error-handling-patterns`, `systematic-debugging` · **Size:** M

---

## 6. Requirement → task coverage

| Requirement | Tasks |
| --- | --- |
| R-CBU-001 | T-09, T-10 |
| R-CBU-002 | T-05, T-09 |
| R-CBU-003 | T-05, T-06 |
| R-CBU-004 | T-03, T-06 |
| R-CBU-005 | T-01, T-11 |
| R-CBU-006 | T-04 *(percentage clause copy, OD-2)*, T-05, T-07, T-08 |
| R-CBU-007 | T-04, T-08 |
| R-CBU-008 | T-02, T-05, T-09 |
| R-CBU-009 | T-03, T-09 |
| R-CBU-010 | T-10, T-12 |
| R-CBU-011 | T-09, T-12 |
| NFR-CBU-001 | T-05 |
| NFR-CBU-002 | T-09 |
| NFR-CBU-003 | T-08, T-12 |
| NFR-CBU-004 | all |
| NFR-CBU-005 | T-02, T-03, T-04 |

Every requirement appears in ≥1 task; every task cites ≥1 requirement.

---

## 7. Risks & blockers

| Risk | Owner | Mitigation |
| --- | --- | --- |
| Q1/Q2 open questions (STAR link query string, PA in CC) unresolved at T-05/T-08 | Product | Design stance recorded (§15): PA included, link degrades to a correct page. Both are one-line reversals in tested code. |
| AI service not yet sending `contacts` | AI team | ARI tolerates absence indefinitely; only rollout step 3 waits. |
| `ARI_SPRM_EMAIL` unset in a target environment | DevOps | Rollout step 0; the service reads defensively so it degrades rather than throwing. |
| 9 open ledger entries (`judgment.md`) | Eng lead | All non-severe, recorded. JD-S7 (no dispatch timeout) is the one most likely to matter in production. |

---

## 8. Done definition

- [x] All 12 tasks `done` — **2026-08-11**, every one on a Reviewer PASS
- [~] `npm test -- --silent` and `npm run test:e2e` green; coverage ≥ 60% not regressed — **tests green (2196 unit / 4 e2e)**; the coverage half is **owed**: `npm run test:cov` was never run, so NFR-CBU-004's floor is discharged by inference, not measurement. Belongs to `/akili-test`.
- [x] `npm run lint -- --quiet` clean, `git status` re-checked (the script carries `--fix`) — run by the Leader at the T-12 gate; `--fix` touched no file beyond the 5 in the diff
- [ ] Migrations apply and revert on dev — **apply verified** (O-1/O-3/O-4/O-5 against dev 2026-08-09); **revert never executed** (O-2 waived by the spec owner on static review), so production rollback of the T-02 migration remains unrehearsed
- [ ] Flag still seeded `false` at merge — **the feature ships dark**. Seeded `false` and verified at T-03 (O-3); **re-confirm against dev immediately before merge**, not from this record
- [ ] Rollout steps 0–2 executed, including the **human review of a real received email** (defect classes D7/D8 have no automated gate). Step 4 additionally gated by **D-T12-b** — the security sign-off must adjudicate the debug-channel finding (`requirements.md` §14)
