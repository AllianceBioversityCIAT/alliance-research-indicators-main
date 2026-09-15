# Judgment Day — Results / CapDev Bulk Upload Notification

- **Target:** `./design.md` (immutable at review time)
- **In-scope context:** `./requirements.md`, root `CLAUDE.md`, `docs/specs/general-setup/design.md`, live server source
- **Mode:** judgment_day — blind dual review
- **Rounds:** 2 of 2 (both consumed)
- **Date:** 2026-08-06
- **Transaction state:** `approved` — see the terminal receipt at the foot of this file

## Skill resolution

| Role | Model | Rationale |
| --- | --- | --- |
| Author (design.md) | Opus | `/akili-specify` Phase 2, T1 Architect |
| Judge A | Opus (fresh blind context) | T3 Auditor per registry |
| Judge B | Sonnet | second model axis — *author ≠ auditor* enforced on both judges |

Both judges were read-only, launched in parallel, with identical scope and criteria, and could not see each other's output.

## Round-1 tallies

| Judge | SEVERE | WARNING | SUGGESTION |
| --- | --- | --- | --- |
| A | 4 | 10 | 4 |
| B | 5 | 4 | 2 |

- **Confirmed (both judges):** 8
- **Suspect (one judge):** 13 — of which **5 independently verified true** by the orchestrator against source
- **Contradictions:** 0 (no factual disagreement; two severity splits and one 1-line range discrepancy)

---

## Frozen ledger — CONFIRMED (both judges)

Severity = the higher of the two judges' ratings where they split.

### JD-01 — Flag check ordered before metric computation · SEVERE · `A-S3` + `B-S1`
§2.1 puts `CAPDEV_BULK_UPLOAD_ENABLED()` at step 1, gating steps 2–5. R-CBU-009 AC.1 requires **metrics still written** when the flag is off, and R-CBU-008 AC.2 requires `notification_status = 'SKIPPED'` to be persisted. As drawn, a disabled feature writes neither.
**Fix:** move the flag check between step 5 (`persistProcessMetrics`) and step 6 (per-group dispatch).

### JD-02 — `EnvAppConfigUtil` throws on an absent row; "absent ⇒ disabled" unachievable · SEVERE · `A-S2` + `B-S2`
`env-app-config.util.ts:43-51` — `if (!config) { logger.error(...); throw new InternalServerErrorException(...) }`. Every accessor, including the cited precedent `EMAIL_READINESS_LEVEL_7_TO`, delegates to it. A missing `ENABLED` row throws (swallowed by the outer catch ⇒ no metrics, no status — breaks R-CBU-009 AC.2); a missing `CC_EMAIL` row throws inside the group build (breaks R-CBU-004 AC.6).
**Fix:** specify the two new accessors as defaulting wrappers (`try/catch` → `false` / `[]`) with a warn log, and drop the "same shape as `EMAIL_READINESS_LEVEL_7_TO`" reuse claim.

### JD-03 — Q1 has no stated `GROUP BY`; duplicate emails per group · SEVERE · `B-S3` (severe) + `A-W5` (warning)
The Q1 spine returns one row **per bulk-upload row**, not per contract; Q2/Q3 state their `GROUP BY` and Q1 does not. Iterating raw Q1 rows sends N emails for an N-result project — violating R-CBU-002 AC.1. Judge A adds that nothing in the schema constrains a result to exactly one `is_primary AND is_active` contract, so a double-primary row would double-count in Q2 (violating R-CBU-006 AC.6).
**Fix:** state `GROUP BY ac.agreement_id` on Q1 explicitly, note how single-valued PI/RA/PA survive grouping, and define the tie-break when a result has >1 active primary contract (plus a warn log).

### JD-04 — "3 reads + 1 write, constant" is false · SEVERE · `A-S4` (severe) + `B-W1` (warning)
`template.service.ts:11-22` issues a `findOne` on **every** `_getTemplate` call — once per group. Each `EnvAppConfigUtil` accessor issues its own `findOne`. §6.1 itself adds a 4th `COUNT(*)`, and §2.1 has two writes. The design contradicts its own §11 ("O(groups) query count") and NFR-CBU-001.
**Fix:** restate as "4 grouped reads + 2 writes, plus 1 template read and 1 config read per group — O(groups), never O(results)" everywhere the count appears (Executive summary, §6.1 heading, DD-2).

### JD-05 — The `NO_TEMPLATE` path is specified wrongly · SEVERE · `B-S5` (severe) + `A-W2` (warning)
Two independent mechanisms, same defective path:
- **B:** §10 logs `NO_TEMPLATE` at **warn** in the "group skipped" row; R-CBU-007 AC.5 mandates an **error** log.
- **A:** the branch is unreachable anyway — `template.service.ts:12-20` destructures `.then(({ template }) => template)`, so a missing row makes `findOne` resolve `null` and the destructuring throws `TypeError`, landing in the generic per-group failure catch.

**Fix:** specify that the service wraps `_getTemplate` and treats *both* a throw and an empty return as `NO_TEMPLATE`, logged at **error** level per AC.5.

### JD-06 — DD-3's `CurrentUserUtil` justification does not hold · WARNING · `A-W8` + `B-W2`
- **A:** the stated reason ("request-scoped, so the token owner would be unresolvable") is factually wrong — `current-user.util.ts:9-29` holds a hard reference to the Express `Request`; a closure keeps it readable after the response.
- **B:** the dependency is unnecessary *and* contradicts DD-2 — `results.service.ts:1043` already persists `created_by` on the process row, so the token owner is durably resolvable by DB join, which is what DD-2's "seam for a future async dispatch" actually requires.

**Fix:** resolve the token owner via `bulk_upload_processes.created_by → sec_users`, drop `CurrentUserUtil` from the service's dependencies, and replace DD-3's rationale with the surviving arguments (unhandled rejection, lost log correlation, nowhere to record `notification_status`).

### JD-07 — Methodology conformance gaps vs `general-setup/design.md` · WARNING · `B-W4` + `A-G4`
Missing the mandated `**Linked detailed design:** ../../../trd/trd.md (sections X, Y)` header field; no "Workflows & business rules" section — which is precisely where the R-CBU-010 "outside any transaction" claim should have been substantiated; no Date column on the decisions log.
**Fix:** add the header field, add a short "Workflows & transactional boundaries" section, add the Date column.

### JD-08 — `results.controller.ts` line-range drift · SUGGESTION · `A-G2` + `B-G1`
Design cites `666-672`. Verified: the `@UsePipes(...)` block is **663–669**; line 672 is `@Body()`. (Judges split 663-669 vs 664-669; the orchestrator's read confirms the decorator opens at 663.) Judge A additionally notes `LoggerUtil.error` does not exist — the methods are `_log/_error/_warn/_debug/_verbose/_fatal`.

---

## Suspect (single judge) — VERIFIED TRUE by the orchestrator

Recorded as suspect per protocol (not auto-fixable), but independently checked against source. Verification evidence is the orchestrator's own, not a second judge's.

| ID | Finding | Verification |
| --- | --- | --- |
| **JD-S1** `A-S1` · SEVERE | The template table is **`sec_template`**, not `templates`. Design names `templates` in §4.2 and §3. | ✅ `template.entity.ts:11` → `@Entity('sec_template')`. `grep` of `src/db/migrations`: **17** files reference `sec_template`, **0** reference a `templates` table. A migration written per the design fails at runtime. |
| **JD-S2** `A-W6` · WARNING | `AppConfig.SPRM_EMAIL_ARRAY` throws when `ARI_SPRM_EMAIL` is unset, defeating R-CBU-004 AC.5. | ✅ `app-config.util.ts:318-320` → `return process.env.ARI_SPRM_EMAIL.split(',')` — unguarded. Plausible on dev during rollout step 2. |
| **JD-S3** `A-W9` · WARNING | `npm run migration:run` — the only automated gate mapped to defect class D5 — is not a script in this package. | ✅ `package.json:28-32` defines `migration:empty`, `:generate`, `:revert`, `:execute` (dist), `:dev:execute` (src). No `migration:run`. |
| **JD-S4** `B-W3` · WARNING | The rendered HTML must be passed as `message.socketFile`, not `message.text`; the design never says so. | ✅ All three existing callers use `socketFile: Buffer.from(template)` — `result-oicr.service.ts:183`, `green-checks.service.ts:582`, `function-handler.service.ts:66`. Naming would mislead an implementer toward `text`, and §11's tests assert body *content*, not the field. |
| **JD-S5** `B-S4` · SEVERE | The "fourth cheap `COUNT(*)`" cannot produce the `result_id` list that §10 and R-CBU-002 AC.3 both require to be logged. | Logical contradiction internal to the design; no external verification needed. |

## Suspect (single judge) — NOT independently verified

| ID | Finding | Severity |
| --- | --- | --- |
| JD-S6 `A-W1` | Two of the nine §4.1 columns have no producing query: `total_results` ("all indicators") is unreachable through indicator-filtered queries, and `countries` is specced as ISO alpha-2 JSON while Q3 selects `name`. | WARNING |
| JD-S7 `A-W3` | §1's goal "can never … delay a bulk upload" contradicts DD-3 (inline await) and NFR-CBU-001 (≤2 s budget); §6.4 claims timeouts are contained but no timeout is specified anywhere. `client.emit` on a lazily-connecting `ClientProxy` can stall. | WARNING |
| JD-S8 `A-W4` | `notification_status` derivation is defined only for `PARTIAL`; no rule for zero-dispatched-with-groups, flag-off-with-groups, or all-unattributed. Three ACs untestable as written. | WARNING |
| JD-S9 `A-W7` | The PI salutation fallback chain (staff name → `project_lead_description` → "Colleagues") and token-owner resolution have no owning component; `project_lead_description` is in no described query. | WARNING |
| JD-S10 `A-W10` | The design silently downgrades Q3 ("before implementation") and Q4 ("before T-03") from the blocking status the approved requirements gave them. | WARNING |
| JD-S11 `A-G1` | Module delta understated: `AiReportsModule` has no `imports` array; `TemplateModule` is not `@Global()`, so `imports: [TemplateModule]` + `MessageMicroservice` in providers are required. (Judge A independently confirmed the **no-cycle** conclusion is correct.) | SUGGESTION |
| JD-S12 `A-G3` | Hard-coded `indicator_id = 1` in §6.1 rather than binding `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`. | SUGGESTION |
| JD-S13 `B-G2` | `GROUP_CONCAT` default `group_concat_max_len` (1024 bytes) could silently truncate the country list. | SUGGESTION |

---

## What both judges independently confirmed as CORRECT

Recorded because a clean result is evidence too, and it bounds the blast radius of the fix round:

- The PI join at `result-status-workflow.repository.ts:94` — verbatim accurate.
- `results.service.ts:1032` / `:1058` / `:166` line citations.
- `MessageMicroservice.sendEmail`, `EmailBody` DTO shape.
- `AppConfig.SPRM_EMAIL_ARRAY` (`:318`) and `ARI_CLIENT_HOST` (`:257`) exist.
- All asserted entity columns on `agresso_contracts`, `alliance_user_staff`, `result_capacity_sharing`, `result_contracts`, `bulk_upload_results`, `bulk_upload_processes`.
- `RootAi` / `ProcessMedatada` shape and the `ValidationPipe` with `forbidNonWhitelisted` on the endpoint.
- `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT = 1`.
- **No circular dependency** from the module placement (`results.module.ts:89` imports `AiReportsModule`; `TemplateModule` imports nothing).
- Result creation genuinely does **not** run in a transaction — the R-CBU-010 rollback claim holds.
- The `/results-center` client route exists.

---

## Decision gate — round 1

Per the Hard Rules: *fix only severe findings confirmed by both judges; ask before round-one correction; single-judge findings are recorded suspect and not auto-fixed.*

- **Auto-fixable under protocol (confirmed SEVERE):** JD-01, JD-02, JD-03, JD-04, JD-05
- **Confirmed but non-severe (remain info unless the human elects otherwise):** JD-06, JD-07, JD-08
- **Suspect, verified true — require explicit human approval to fix:** JD-S1, JD-S2, JD-S3, JD-S4, JD-S5
- **Suspect, unverified:** JD-S6 … JD-S13

**Human decision (2026-08-06):** fix the confirmed SEVERE set **plus** the five verified suspect findings. The eight unverified suspect findings remain recorded as info. → design.md **r2**.

---

# Round 2 — scoped re-judgment

Both judges re-ran against the frozen ledger + the immutable r2 fix delta, restricted to two questions: *is each of the ten fixes real* and *did the edit break anything else*. JD-06/07/08 and JD-S6…S13 were explicitly out of scope as known-open.

| Judge | Fixes confirmed | Partial | New SEVERE | New WARNING | New SUGGESTION |
| --- | --- | --- | --- | --- | --- |
| A | 8/10 | 2 (JD-04, JD-S1) | **0** | 3 | 3 |
| B | 9/10 | 1 (JD-S1) | **0** | 2 | 0 |

**Zero new SEVERE from either judge.** All ten substantive corrections were independently re-verified against source (`env-app-config.util.ts:43-51`, `template.service.ts:11-20`, `app-config.util.ts:318`, `package.json:28-32`, `template.entity.ts:11`, the three `socketFile` callers, and the absence of any unique index on `result_contracts`). Both judges also independently confirmed the tie-break premise: nothing in the schema prevents two active primary contracts.

### Round-2 confirmed (both judges) — all coherence, no functional defect

| ID | Finding | Disposition |
| --- | --- | --- |
| **R2-01** | DD-3 still carried the retracted "3 queries" cost, contradicting DD-2 in the adjacent table row — the JD-04 sweep missed it | **fixed in r3** |
| **R2-02** | §7 still said the copy is "stored in the `templates` table", contradicting the corrected §4.2 — the JD-S1 sweep missed it | **fixed in r3** |
| **R2-03** | §6 subsections read 6.1 → 6.5 → 6.6 → 6.2 → 6.3 → 6.4; the new subsections were appended, not placed (A: SUGGESTION, B: WARNING) | **fixed in r3** — renumbered to physical order, all four cross-references updated |

### Round-2 suspect (Judge A only) — verified and fixed anyway

| ID | Finding | Disposition |
| --- | --- | --- |
| **R2-S1** | §6.3 put the absent-config warn log in the accessor while §10 requires it to carry the bulk process id — `EnvAppConfigUtil` depends only on `DataSource` and has no batch context. The two new r2 statements could not both be implemented. | **fixed in r3** — accessor returns a `defaulted` marker; the service emits the log |
| **R2-S2** | Catching around `getConfig` suppresses the throw but **not** the `logger.error` it emits first (`env-app-config.util.ts:43-47`), so the expected default-off path would log an ERROR on every upload | **fixed in r3** — accessors must query the repository directly / via a non-throwing `tryGetConfig`, never catch around `getConfig` |
| **R2-S3** | The tie-break cited `result-contracts.service.ts:52` as enforcing single-primary; that line is a `where` clause in a **read**, not a constraint | **fixed in r3** — reworded; the real conclusion is *stronger* (nothing anywhere enforces it) |

---

# TERMINAL RECEIPT

| | |
| --- | --- |
| **Target** | `docs/specs/results/capdev-bulk-upload-notification/design.md` |
| **Mode** | judgment_day — blind dual review, Opus + Sonnet, author ≠ auditor on both judges |
| **Rounds consumed** | 2 fix rounds, 2 scoped re-judgments (ceiling reached) |
| **Round 1** | 8 confirmed / 13 suspect / 0 contradictions |
| **Round 2** | 10/10 fixes verified real · **0 new SEVERE** · 3 confirmed + 3 suspect coherence findings, all swept in r3 |
| **Closed after the receipt (human elected)** | **JD-06** — DD-3's false `CurrentUserUtil` rationale replaced; token owner now resolved via a `bulk_upload_processes.created_by → sec_users` join, and `CurrentUserUtil` dropped from the service's dependencies. **JD-S9** — the salutation fallback chain assigned to `capdev-recipients.builder` as an ordered three-tier resolution, and the token owner given an owning query. → design.md **r4** |
| **Closed incidentally in `tasks.md`** | **JD-S8** — the `notification_status` derivation table (flag × groups × dispatched → status) is written into T-09 as the single source. **JD-S11** — the module delta (`imports: [TemplateModule]`, `MessageMicroservice` as provider) is spelled out in T-10. **JD-S12** — the `IndicatorsEnum` binding is mandated in T-05. |
| **Open by human decision** | JD-07, JD-08 (confirmed, non-severe) and JD-S6, JD-S7, JD-S10, JD-S13 (suspect, unverified) — **6 entries**. Most consequential: **JD-S7**, no timeout bounds the inline dispatch, so a stalled broker connect can hang the HTTP response. |
| **Final revision** | design.md **r4** |

**JUDGMENT: APPROVED ✅**

No SEVERE finding remains unresolved. The eleven open entries are recorded, non-severe, and were left open by explicit human scope decision — not by omission. `/akili-archive` should read this file as the Kaizen Measure signal for this spec.
