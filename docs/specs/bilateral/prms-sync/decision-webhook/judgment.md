# Judgment Day — Bilateral / PRMS Sync — Decision Webhook

- **Target:** `design.md` (immutable), contrasted against `requirements.md`, `proposal.md`, `../family.md`, and the in-repo PRMS contract `[WH]`
- **Mode:** `judgment_day` — blind dual review, two read-only judges in parallel
- **Round:** 1
- **Verified at:** `e0c8c443`
- **Date:** 2026-09-21
- **Judges:** A = `Explore`/**opus** (T3 Auditor) · B = `Explore`/**fable** — cross-family, so agreement is corroboration rather than one model agreeing with itself. Both read-only with shell, both able to re-run the ledger's citations.
- **Author ≠ auditor:** the design was authored on Opus 5; judge B is a different model family. Judge A shares the author's family — recorded as a **known weakening** of the separation, not hidden.
- **Terminal state:** *pending round-one correction decision (HITL)*

---

## 1. Premise Ledger attack — both judges, independently

Both judges re-ran all 14 rows. **Agreement was total on 12 of 14.**

| Row | Judge A | Judge B | Merged verdict |
|---|---|---|---|
| P-1 … P-3, P-5, P-8 … P-13 | REPRODUCED | REPRODUCED | **Confirmed** |
| P-4 | REPRODUCED, "under-read" | REPRODUCED | **Confirmed but incomplete** → JD-8 |
| P-6 | REPRODUCED, "scope too narrow" | REPRODUCED, "incomplete as a consumer sweep" | **Confirmed as scoped; scope wrong** → JD-6 |
| **P-7** | **REFUTED — settleable at source, and TRUE** | **REFUTED — settleable at source, and TRUE** | **JD-3 (confirmed severe)** |
| **P-14** | **CONTRADICTED (consequence)** | **CONTRADICTED** | **JD-5 (confirmed severe)** |

Both judges independently reached the repository for `@nestjs/core@10.4.15`'s middleware source and for migration `1781879906673`. Neither accepted the `UNVERIFIED` marker as settled — which is what the rule asks of them.

---

## 2. Frozen findings ledger

### 2.1 CONFIRMED SEVERE — both judges (eligible for round-one fix)

| # | Finding | A | B |
|---|---|---|---|
| **JD-1** | **The callback secret is echoed into the response body and the logs by the two global wrappers the design lists as unmodified "reuse."** `response.interceptor.ts:50` sets `path: request.url` on **every** success envelope and passes `request.url` to the logger at `:66-75`; `global.exception.ts:31,34-38` does the same on every error. The secret is *in the path*, so `request.url` **is** the secret. This violates `R-PWH-004 AC.4` — which names `ServerResponseDto.path` explicitly — and `NFR-PWH-002`, on the happy path, every time. **No premise row covers what the inherited envelope emits.** | F-1 | F-4 |
| **JD-2** | **The nominated settler for P-7 is inert.** Both existing e2e suites stub `JwtMiddleware.prototype.use` unconditionally (`test/prms-sync.e2e-spec.ts:228-234`; `test/results-ai-formalize-bulk.e2e-spec.ts:98-109`, which documents that `.overrideProvider` does not take). With `use` stubbed, excluded and non-excluded routes are indistinguishable: `R-PWH-004 AC.2` passes vacuously and **AC.3 cannot go red at all** (the stub injects a user, so the absent-token case yields `403`, not `401`). `DC-3`'s falsifier cannot redden. | F-2 | F-2 |
| **JD-3** | **P-7 was settleable at source and is TRUE — it should never have shipped `UNVERIFIED`.** `@nestjs/core@10.4.15`: `middleware/route-info-path-extractor.js` returns `prefixPath + addLeadingSlash(path)` for any non-wildcard entry, and `exclude-route.util.js` normalizes the leading slash on the matching side too. So `reports/:code/pdf` and `/admin(.*)` are handled identically, and `prms-callback(.*)` becomes `/api/prms-callback(.*)`. The design's single declared live-path hazard was absorbing attention a real hazard (JD-1, JD-2) needed. | F-2 | F-3 |
| **JD-4** | **`requirements.md` §9 and `design.md` §5 specify different route trees, and the deviation is undeclared.** Requirements: `POST /api/prms-webhook/registration` + `POST /api/prms-webhook/callback/:secret`, *"disjoint **below `prms-webhook/`**"*. Design: `POST /api/prms-webhook` + `POST /api/prms-callback/:secret`, *"neither is a prefix of the other."* Under requirements' layout the two routes **share** a prefix — the exact property DD-3 claims to have eliminated. §13's reversion challenge declares no deviation. An executor inherits whichever document it opens first. | F-4 | F-5 |
| **JD-5** | **P-14 is two premises, and its failure mode is the wrong HTTP status.** Migration `1781879906673-AddNewEnvCl.ts` **inserts the `app_config` row** — a primary, in-repo source for exactly the claim P-14 says only the owner attests (and `family.md` OQ-F8, which the design cites, names that migration in the same sentence it quotes the owner from). Row *presence* is settled. What is genuinely open is a **different** claim: `simple_value` being populated per environment — which the migration proves the code does not supply. Further: `app-config.service.ts:78-84` throws `NotFoundException` → **404**, not `503`, when the row is missing or inactive. `503` fires only when the row exists and `simple_value` is empty. §12 step 3's operator diagnostic is therefore wrong and will misdiagnose the field. | F-5 | F-1 |

### 2.2 CONFIRMED, severity divergent (A: severe · B: warning)

| # | Finding | A | B |
|---|---|---|---|
| **JD-6** | **DD-1's consumer walk is under-counted, and there is a second, hand-maintained copy of the enum in the *client* package.** `client/.../shared/interfaces/prms-sync.interface.ts` mirrors all 8 `PrmsSyncOutcome` members as a string-literal union plus a `PrmsSyncResponse` shape. P-6's pattern (`PrmsSyncStatusDto\|sync_state\|last_attempt`) is repository-wide and reproduces exactly — but it cannot hit a file that duplicates the enum *by value*. So P-6's headline *"Client: none"* is true of the `GET` call and **false of the response-shape family**, which is the evidence DD-1 leans on. **DD-1's conclusion survives and is in fact better supported** — extending the enum would have required a hand-edit in a second package. The count and the trigger coverage are what is wrong. | F-3 | F-6 |

### 2.3 CONFIRMED WARNING — both judges

| # | Finding | A | B |
|---|---|---|---|
| **JD-7** | **DD-5's stated mechanism is wrong, and the residual failure is not the one it names.** Both judges independently derived the same consequence: under REPEATABLE READ (no isolation level is configured anywhere — `grep -rn "isolation" src` → no matches) an empty `FOR UPDATE` range read takes gap locks, and **gap locks are mutually compatible** — two transactions both take them, then each `INSERT` needs an insert-intention lock that waits on the other's gap. Genuine simultaneity yields a **deadlock and a rolled-back transaction** — a delivery *never recorded* — not a double-applied verdict. That contradicts `R-PWH-005` (*every delivery is recorded*) and `NFR-PWH-005`. The hedge itself stands ([WH] §5 spaces retries 1/2/4/8 min, so simultaneity is unreachable), but the row states the wrong consequence for the state it excludes. A judge also noted the repo's own anchor-row idiom at `result-prms-sync-log.repository.ts:185-194,306-315`, which DD-5 does not cite. | F-6 | F-7 |

### 2.4 SUSPECT (single judge) — but **orchestrator re-ran and confirmed TRUE**

Recorded as suspect per protocol; the re-run is attached so the architect need not re-derive.

| # | Finding | Raised by | Orchestrator re-run |
|---|---|---|---|
| **JD-8** | **§6.4 and DD-6 drop `platform_code` from the live-result convention they cite.** The convention has **three** predicates, not two. | A/F-8 | `sed -n '30,50p' src/domain/shared/utils/results.util.ts` → `where.platform_code = reportingPlatforms;` precedes `result_official_code` / `is_active` / `is_snapshot`. **CONFIRMED.** (Judge A's *file path* was wrong — the file is `domain/shared/utils/`, not `domain/entities/results/utils/` — the *content* claim is right.) |
| **JD-9** | **Migration specs are not siblings in this repo** — they live in `src/db/migration-specs/`. §3.1's file list is short by one. | B/F-9 | `ls src/db/migration-specs \| wc -l` → **11**, including the exact analogue `1789479131116-createResultPrmsSyncLogTable.spec.ts`. **CONFIRMED.** |
| **JD-10** | **`requirements.md` DC-4 names `npm run migration:run`, which does not exist.** | B/F-10 | `node -e "console.log(require('./package.json').scripts['migration:run'])"` → **`undefined`**. `migration:revert` does exist. **CONFIRMED** — and per K-004 a gate that cannot be invoked is not a gate. |
| **JD-11** | **`R-PWH-009 AC.5` demands committing the TEST secret to `.env.example`; §8 refuses.** | A/F-7 | Doc-vs-doc: `requirements.md` AC.5 says *"**Both** … with the TEST value shown"*; `design.md` §8 says the secret is *"commented, **no value**"*. **CONFIRMED** — the design is right on security grounds; the AC is the defect. |

### 2.5 SUSPECT / INFO — single judge, not acted on

| # | Finding | Raised by |
|---|---|---|
| JD-12 | The budget (≈1,800 LOC) is contradicted by the nearest analogue: `result-prms-sync/` + its migration + specs measures **4,525** lines for a *smaller* surface. | B/F-8 |
| JD-13 | §3.1 Composition lists no e2e spec file, yet §11 / DC-3 gate on `npm run test:e2e`. | A/F-9 |
| JD-14 | Citation line drift on four rows (`main.ts:53`→`:54`; `app.module.ts:102-105`→`:101-104`; `main.routes.ts:412`→`:413`; `base-api.ts` `getRequest`/`postRequest` transposed). No verdict changes; all four fail a literal re-run. | A/F-10 |
| JD-15 | If anyone later adds `@Version('1')` to the callback controller, the route moves to `/api/v1/prms-callback/…` while the exclusion stays at `/api/prms-callback(.*)` — **every delivery silently `401`s**. P-7's failure reached by another door; worth a sentence in DD-3. | A/F-11 |
| JD-16 | `requirements.md` §1 cites *"(**P-6**, §11 R-1)"* for Dev routability; the ids are `C-15`/`C-16`. `P-6` is a design ledger id meaning the consumer sweep. | B/F-11 |

---

## 3. Contradictions between judges

**None substantive.** The only divergence is severity on **JD-6** (A: severe · B: warning); both judges assert the same fact and both agree DD-1's conclusion survives. No escalation for human arbitration is required on that basis.

---

## 4. Counts

| Class | Count |
|---|---|
| **Confirmed SEVERE (both judges)** | **5** (JD-1 … JD-5) |
| Confirmed, severity divergent | 1 (JD-6) |
| Confirmed WARNING (both judges) | 1 (JD-7) |
| Suspect, orchestrator-confirmed true | 4 (JD-8 … JD-11) |
| Suspect / INFO, not acted on | 5 (JD-12 … JD-16) |
| Judge contradictions | 0 |
| Judge A: severe / warning / suggestion | 5 / 3 / 4 |
| Judge B: severe / warning / suggestion | 5 / 4 / 2 |

---

## 5. What the round found, in one line

The design's Premise Ledger was **accurate on 12 of 14 rows and wrong on the two it flagged as open** — one was settleable and true, the other was two premises wearing one row. Meanwhile the two genuinely severe defects (**JD-1**, **JD-2**) were in territory *no* row covered: what the inherited response envelope emits, and whether the repo's e2e harness can observe middleware at all. **A premise ledger is only as good as the premises it thought to doubt.**

---

## 6. Round-one correction — APPLIED

**HITL decision (2026-09-21):** scope = **JD-1 … JD-11** (confirmed severe + severity-divergent + confirmed warning + the four suspects the orchestrator re-ran and confirmed). JD-1's remedy = **redact in both wrappers AND bypass the interceptor**.

| # | Applied | Where |
|---|---|---|
| **JD-1** | **DD-10** added: `@Res()` bypass of `ResponseInterceptor` on the callback handler **plus** redaction of the callback prefix in `GlobalExceptions` — both, because the secret guard's `404` is raised before the controller runs. New premise row **P-16**. New defect class **DC-11** with its falsifier. `R-PWH-004` gains AC.7. §3.2 moves both wrappers out of "reuse, unmodified". | `design.md` §3.1, §3.2, §9, §13 · `requirements.md` R-PWH-004, §10 |
| **JD-2** | **DD-11** added + new premise row **P-17**. `DC-3` rewritten with the harness precondition. `R-PWH-004` gains AC.8. §3.1 gains `test/prms-webhook.e2e-spec.ts` as an explicit line item. | `design.md` §3.1, §11, §13 · `requirements.md` R-PWH-004, §10 |
| **JD-3** | **P-7 flipped to VERIFIED**, citing `@nestjs/core@10.4.15` `route-info-path-extractor.js` + `exclude-route.util.js:12-18`. §11's E2E tier no longer claims to settle it. | `design.md` §2, §11 |
| **JD-4** | `requirements.md` §9 amended to the design's disjoint **top-level** paths, with the contradiction named. DD-3 now declares the deviation instead of presenting it as inherited. | `requirements.md` §9 · `design.md` §13 |
| **JD-5** | **P-14 split into P-14 (verified, migration `1781879906673` inserts the row) and P-14b (`simple_value` populated — the claim the code actually depends on, still `UNVERIFIED`, owner T-03).** §5 and `R-PWH-001` gain the `404` branch; §12's operator diagnostic corrected. `R-PWH-001` gains AC.7. | `design.md` §2, §5 · `requirements.md` R-PWH-001 |
| **JD-6** | DD-1's count restated; new premise row **P-15** for the client enum mirror; P-6 narrowed to the GET shape; the `consumer` trigger now declared as firing twice. | `design.md` §2, §13 |
| **JD-7** | DD-5's mechanism restated (gap locks are mutually compatible → **deadlock**, not serialization); §6.3 gains step **3b**, a single retry on `ER_LOCK_DEADLOCK`; the repo's anchor-row precedent now cited. | `design.md` §6.3, §13 |
| **JD-8** | `platform_code` restored to the correlation query — all **four** predicates. C-7, P-4, §6.4, DD-6 and `R-PWH-007` updated; `R-PWH-007` gains AC.5, the falsifier for a query that drops it. | `design.md` §2, §6.4 · `requirements.md` C-7, R-PWH-007 |
| **JD-9** | Migration specs relocated to `src/db/migration-specs/` in §3.1 and DC-4. | `design.md` §3.1, §11 · `requirements.md` §10 |
| **JD-10** | `npm run migration:run` (**does not exist**) replaced with `migration:test:execute` / `migration:test:revert`. | `requirements.md` §10 |
| **JD-11** | `R-PWH-009` AC.5 narrowed: the URL variable shows its TEST value, the **secret shows none**. | `requirements.md` R-PWH-009 |

**Also corrected, beyond the agreed scope, for artifact coherence:** JD-14's citation drift on the two rows that survived the rewrite (`main.routes.ts:412`→`:413`, `app.module.ts:102-105`→`:101-104`), re-verified by the orchestrator. A ledger whose contract is *citations as run* cannot knowingly ship citations that do not reproduce.

**Consequential re-sizing:** the budget moved from 9 tasks / ≈1,800 LOC to **11 tasks / ≈2,600 LOC** — DD-10 and DD-11 are new work, and the draft had no line item for the e2e spec or the migration spec. Judge B's measured analogue (**4,525** lines) is recorded beside it rather than silently adopted.

**Fix-caused defect caught in-flight (self-reported):** adding P-14b/P-15/P-16/P-17 immediately falsified the count line, which still read "16 rows". It was corrected by **deriving the count from the table** instead of restating it — the durable form of **KZ-005**, whose escalation says the fix is fewer sites asserting a derived figure, not better sweeps.

### Correction closure

- **Forward sweep** over the spec folder for every superseded literal (`prms-webhook/registration`, `prms-webhook/callback`, `migration:run`, `disjoint below`, `14 rows`, `8 non-spec consumers`, `1,800`, `9 tasks`): every surviving hit was inspected and is an **intentional quotation inside a correction note** or the "draft estimate" column of the budget table. No live instruction still carries a superseded value.
- **Backward sweep:** `requirements.md` §9 was the document other sections cite for paths; §10 (DC-3, DC-4) and the Requirement ID Index were re-read against the amendment and are consistent.

### Left open by the agreed scope (recorded, not fixed)

| # | Item |
|---|---|
| JD-12 | The budget may still be optimistic — the measured analogue is 4,525 lines. Recorded beside the estimate; the tripwire will catch it. |
| JD-13 | Partially addressed — the e2e spec is now a §3.1 line item; the harness it needs is DD-11. |
| JD-15 | **Worth carrying forward:** if anyone later adds `@Version('1')` to the callback controller, the route moves to `/api/v1/prms-callback/…` while the exclusion stays at `/api/prms-callback(.*)` — every delivery silently `401`s. P-7's failure by another door. |
| JD-16 | `requirements.md` §1 cites `P-6` where it means `C-15`/`C-16`. |

---

## 7. Scoped re-judgment (round 1) — RESULT

Both judges returned. **No contradictions.** Every landed correction (JD-1…JD-11) was independently confirmed **factually correct where it landed** — but two (**JD-5, JD-8**) landed only partially: the Premise Ledger row was fixed, the **Design Decisions Log entry citing the same fact was not**. Judge A found this at DD-6 and §12; judge B found the identical pattern independently.

### Fix-caused defects confirmed by BOTH judges (round 2 scope)

| # | Finding | A | B |
|---|---|---|---|
| **FC-A** | **DD-10's `@Res()` bypass does not do what it claims, breaks its own gate, and undeclared-deviates from a PRD AC.** `@Res()` (non-passthrough) only skips Nest's response *serialization*; `ResponseInterceptor.intercept` still runs, still builds `path: request.url`, still logs it — the bypass stops nothing. Even granting the claimed mechanism, DC-11 gates on `data.path`, which does not exist under `@Res()` — the gate passes with or without the fix, the exact vacuous-gate class JD-2 found elsewhere, reproduced by JD-1's own remedy. And dropping `ServerResponseDto` from one endpoint is an undeclared deviation from PRD `AC-API-Surface`, which requirements §7 treats as an inherited default. | F-2, F-3 | FC-2, FC-3 |
| **FC-B** | **A third global wrapper leaks the secret and had no row.** `LoggingInterceptor` — a **second**, separately-registered `APP_INTERCEPTOR` ahead of `ResponseInterceptor` (`app.module.ts:58-61`) — independently reads `request.url` (`:29`) and logs it under `ARI_SEE_ALL_LOGS` (`:45`). P-16 named two wrappers; there are three. This is the same miss-class JD-1 was raised to close, reintroduced one wrapper over by JD-1's own fix. | — | FC-1 |
| **FC-C** | **DD-6 was never updated**, though the round-1 record claimed it was. Still read the pre-correction two-predicate query and the stale `:41-43` citation, contradicting the corrected §6.4/C-7/P-4/R-PWH-007. The Design Decisions Log — the section an executor reads for the *why* — retained the defective query. | F-6 | FC-4 |
| **FC-D** | **§12 rollout step 3 was never updated**, though the round-1 record claimed it was. Still collapsed `404`/`503` into "a `503` here means the row is missing" — the exact diagnosis JD-5 existed to split — and cited **P-14**, which round 1 had just closed; the open claim is **P-14b**. | F-4 | FC-3 |
| **FC-E** | **DD-5's isolation-level citation does not reproduce.** `grep -rn "isolation" src` → **17 matches**, not the claimed "no matches" — the underlying claim (no MySQL isolation level configured) is true under the *correct* search (`isolationLevel\|READ COMMITTED\|…` → 0), but the cited command was imported from a re-judge's report rather than run. K-004/KZ-014 applied reflexively to the correction itself. | F-5 | FC-5 |
| **FC-F** | **Step 3b (deadlock retry) shipped with no owner, no requirement, no AC, no defect class**, and named only `ER_LOCK_DEADLOCK` (1213), not the sibling `ER_LOCK_WAIT_TIMEOUT` (1205). | F-7 | FC-7 |
| **FC-G** | **P-14's "active" claim over-reached its own evidence.** The migration inserts the row but never sets `is_active`; "active" rested on an unstated column default, not on the cited migration text. | — | FC-6 |
| **FC-H** | **AC insertions broke checklist sequence** in R-PWH-001 and R-PWH-004 (no duplicates, but out of numeric order) — cosmetic, but every design/requirements cross-reference cites an AC number. | F-9 | FC-9 |
| **FC-I** | **DC-3's falsifier no longer models a widening** under the corrected disjoint top-level paths — `prms-webhook(.*)` is a *swap* against `prms-callback(.*)`, not a widening, and it also un-excludes the callback. | F-8 | — |
| **FC-J** | **New citation drift, introduced by the round-1 fix itself:** `test/prms-sync.e2e-spec.ts:228-234` cited in three places (P-17, R-PWH-004 AC.8, DC-3) is the stub at `:230-235`. | F-10, F-11 | FC-11 |

### Applied — round 2

| # | Fix |
|---|---|
| FC-A / FC-B | **DD-10 → DD-10 v2.** Single shared helper `path-redaction.util.ts`, called from the one `request.url` read site inside **all three** wrappers (`LoggingInterceptor`, `ResponseInterceptor`, `GlobalExceptions`). No `@Res()`. `ServerResponseDto` preserved on every response, PRD `AC-API-Surface` untouched. DC-11 widened to a two-part assertion (redacted on the callback, unchanged elsewhere) so it is falsifiable in both directions. |
| FC-C | DD-6 rewritten to the four-predicate query, citing `:38,41-43`. The `Correlation` Glossary entry in `requirements.md` — a **third** site carrying the same stale two-predicate claim, found by the orchestrator during this pass, not by either judge — corrected too. |
| FC-D | §12 step 3 rewritten: names P-14 (closed) vs P-14b (open) explicitly, and states the 404-vs-503 diagnosis instead of collapsing it. |
| FC-E | DD-5's citation replaced with the command that actually returns zero hits. |
| FC-F | Step 3b given an owner (`prms-webhook-delivery.repository.ts`), a new defect class (**DC-12**), and a new AC (`R-PWH-006 AC.7`); both `ER_LOCK_DEADLOCK` and `ER_LOCK_WAIT_TIMEOUT` named. |
| FC-G | P-14 gained the `app_config.is_active DEFAULT 1` citation (`1752097721168-addAppConfigTable.ts:8`) plus a grep confirming no later migration touches the row. |
| FC-H | ACs renumbered into sequence in both requirements. |
| FC-I | DC-3's falsifier corrected to a same-family-widening mutation (`prms-webhook(.*)`→ a pattern matching both routes) that actually reddens the assertion it claims to. |
| FC-J | All four citing sites corrected to `:230-235`. |

### Ground-truth drift (2026-09-22) — logged separately, not a Judgment Day finding

Between round-1 correction and round-2 fix, `sync-engine` (sibling family child, `pending`) merged a real, committed refactor onto this branch (`482aec11`, HEAD moved `e0c8c443`→`170da206`): `result_prms_sync_log` dropped its `result_id`/FK entirely and re-keyed on `(external_reference, result_year)`. **Five Premise Ledger rows cited files this merge moved or changed:** P-2 (substantively — its FK evidence no longer exists; conclusion survives on stronger grounds), P-3, P-4, P-8 (citation only), P-5 (substantively — the query shape changed, conclusion unchanged). All five re-verified against `170da206` and corrected; `requirements.md` C-4/C-5/C-6/C-11 and its Glossary corrected in parallel. **No design decision changed as a result** — DD-1 in particular is now better corroborated, not weakened. Full detail: design.md §2's dated callout.

### Correction closure (round 2)

- **Forward sweep** for `@Res()`/bypass framing outside correction notes, for the stale `:228-234` citation, and for the two-predicate correlation query: each swept clean except the one Glossary row named above, itself corrected in this pass.
- **Backward sweep:** requirements DC-11/DC-3/R-PWH-006 re-read against the design changes they must mirror — consistent.
- **Count line re-derived**, not restated: 18 rows, 17 verified, 1 `UNVERIFIED` (P-14b) — unchanged from round 1, since round 2 corrected existing rows rather than adding or removing any.

---

## 8. Final scoped re-judgment (round 2) — RESULT

Both judges returned. **Nine of ten scoped corrections landed and reproduce exactly** at `170da206`; all five ground-truth-drift rows re-verified clean. **FC-F landed partially** — the judges diverged (A: landed; B: partial), and **B is right**, confirmed by the orchestrator: `design.md:220` §6.3 step 3b still names only `ER_LOCK_DEADLOCK`, while DD-5, `R-PWH-006 AC.7` and DC-12 all require both 1213 and 1205.

### Confirmed by BOTH judges — and independently re-run by the orchestrator

| # | Finding | Severity |
|---|---|---|
| **FC2-1** | **DD-10 v2's mechanism statement is false against the code it names.** `grep -rn "request\.url" src/domain/shared/Interceptors/ src/domain/shared/error-management/` returns **five** read sites in the three wrappers, not three: `logging.interceptor.ts:29` (the only one that assigns to a variable), `response.interceptor.ts:50` **and `:73`**, `global.exception.ts:31` **and `:36`**. DD-10 v2 says *"the single `request.url` read site inside each"* and *"the same variable each wrapper already assigns"* — true only of `LoggingInterceptor`. §3.1 and `R-PWH-004 AC.4` both list only `:29`, `:50`, `:31`. **The two unnamed sites are precisely the logger paths** — and the wrong-secret `404` is raised by the guard before the controller, so it is handled entirely by `GlobalExceptions`, whose logger read at `:36` is the one the design does not name. Implemented literally, the credential still reaches the log on the `2xx` and the attacker's guess still reaches it on the `404`. | **SEVERE** |
| **FC2-2** | **P-16 — the premise row that owns the leak claim — was never widened to three wrappers**, and `§14`'s budget prose still says *"two shared files"* / *"two globally-registered cross-cutting units"*. Every other site (§3.1, §3.2, §9, DD-10 v2, AC.4, DC-11) says three. The *exact* FC-C/FC-D pattern the round existed to close, reproduced by the round's own fix — and §7's "forward sweep swept clean" claim does not hold for it. | WARNING |
| **FC2-3** | **§6.3 step 3b names only `ER_LOCK_DEADLOCK`**, contradicting DD-5, `R-PWH-006 AC.7` and DC-12, which all require `ER_LOCK_WAIT_TIMEOUT` (1205) too. The workflow table is the section an executor implements from. | WARNING |
| **FC2-4** | **Both documents' headers contradict their own bodies.** `design.md:10` still reads *"Verified at: commit `e0c8c443` — **every** citation below was run against this commit"* and both files say `Last updated: 2026-09-21`, while six rows carry `170da206` and the drift callout is dated 2026-09-22. For a ledger whose contract is *citations as run*, the header is the one line a reader trusts to pick which tree to re-run against. | WARNING |
| **FC2-5 / FC2-6** | Step 3b has two owners (DD-5 → repository; AC.7 → "delivery service"; §3.1 splits the transaction across both). C-6 cites `result.entity.ts:59-64` where the index ends at `:63` (`:64` is a different index) — design P-4 has it right. | SUGGESTION |

### What the judges independently cleared

- **DC-12 is not vacuous** — it names a forced 1213/1205 rejection and asserts one retry; its red path is real.
- **DC-11 is not vacuous** and would in fact **catch FC2-1**, because assertion (a) covers *"the logger arguments"*. Both judges noted the same uncomfortable inversion: **the gate is stronger than the design it gates.**
- **The wrapper sweep is otherwise complete.** `grep -rn "APP_INTERCEPTOR\|APP_FILTER\|APP_GUARD\|APP_PIPE" src` → only `app.module.ts:59,63,67` and `app-microservice.module.ts:33,37,41` (the same three classes, RPC branch, never touches `request.url`). The only other `NestMiddleware` is `JwtMiddleware`, whose `req.url` log (`jwr.middleware.ts:40`) sits inside the `LOCAL_AUTH_BYPASS` dev branch and is unreachable for an excluded route. `LoggerUtil` formats whatever `url` it is handed; it never reads the request.

---

## 9. TERMINAL RECEIPT

**`JUDGMENT: ESCALATED ⚠️`**

| Signal | Value |
|---|---|
| Target | `design.md` (+ `requirements.md` as the amended sibling) |
| Rounds | 2 fix rounds, 2 scoped re-judgments — **both permitted rounds exhausted** |
| Judges | 4 dispatches across 2 models (opus / fable), blind, read-only, cross-family |
| Round 1 | 5 confirmed SEVERE, 1 severity-divergent, 1 confirmed WARNING, 4 orchestrator-verified suspects → all fixed |
| Round 2 | 10 fix-caused findings (FC-A…FC-J) → 9 fixed cleanly, 1 partial |
| Round 2 re-judgment | **1 SEVERE (FC2-1), 3 WARNING, 2 SUGGESTION — still open** |
| Judge contradictions | 1, resolved by orchestrator re-run (FC-F: B correct) |
| Ground-truth drift | 1 external event (`482aec11`), 5 rows re-verified, **no design conclusion changed** |
| Terminal state | **ESCALATED** — protocol forbids a third in-review fix round |

**Why ESCALATED and not APPROVED.** The design's load-bearing security decision, DD-10, has now had its *mechanism statement* falsified in **three consecutive rounds** — round 0 (no premise row at all), round 1 (`@Res()` does not skip the interceptor), round 2 ("one read site per wrapper" does not exist). The decision itself has been right since round 1: **redact the callback path inside the shared wrappers.** What keeps failing is the description of how, and each failure was found the same way — by running the citation the sentence rests on.

**What is NOT wrong.** The architecture, the data model, DD-1 through DD-9, the Premise Ledger's 18 rows (17 verified, 1 `UNVERIFIED` with a named owner), and every gate. FC2-1 is a **documentation defect in one decision row and one composition table** — an enumeration that lists three sites where the code has five. The fix is to name the other two.

**RESOLVED 2026-09-22 — bounded correction applied outside the protocol, on explicit user approval.** All six items landed and were re-verified by the orchestrator:

| # | Item | Landed |
|---|---|---|
| 1 | All **five** `request.url` read sites enumerated in §3.1, DD-10 v2 and `R-PWH-004 AC.4` — with the two logger sites (`response.interceptor.ts:73`, `global.exception.ts:36`) called out as the ones that matter most, and `:36` flagged as carrying the wrong-secret `404` end to end | ✅ |
| 2 | **P-16** widened to three wrappers / five sites, with its own `grep` as the citation and an explicit sweep-completeness note (no fourth wrapper; the RPC app registers the same three classes and never reads `request.url`; `JwtMiddleware`'s dev-only URL log is unreachable for an excluded route). §2's blast-radius line and §14's budget prose widened to match | ✅ |
| 3 | `ER_LOCK_WAIT_TIMEOUT` (1205) added to §6.3 step 3b beside 1213 | ✅ |
| 4 | Both headers corrected to state the **two** commits actually in play (`170da206` for the six re-run rows, `e0c8c443` for the rest), with each row's own *Verified at* declared authoritative; both `Last updated` → 2026-09-22 | ✅ |
| 5 | Step 3b given **one** owner — `prms-webhook-delivery.repository.ts` — in DD-5, §3.1, §6.3 and `R-PWH-006 AC.7`; §3.1's service row amended to say it does **not** own the transaction | ✅ |
| 6 | `C-6`'s index citation corrected to `result.entity.ts:59-63` (`:64` is a different index), matching P-4 | ✅ |

**Closing sweep:** no surviving "two wrappers", "two shared files" or "single read site" claim outside an explicit correction note; step 3b names both error codes and one owner; the five-site enumeration appears in every place that lists the sites.

**What this round cost, recorded for Kaizen.** DD-10 needed **four** passes to state a mechanism correctly — and the decision itself was right from the second. Every failure was the same shape: *a sentence about the code, written without running the command that would falsify it.* Round 1 asserted a framework behaviour (`@Res()`) without testing it; round 2 asserted a code shape ("one read site") without grepping it; the round-2 closure sweep asserted itself clean while P-16 still said two. The durable lesson is not "sweep harder" — it is that **a mechanism sentence is a claim about the repository and belongs in the Premise Ledger with a citation, not in a decision cell as prose.** P-16 now carries its own `grep`; had it done so at round 1, FC2-1 could not have happened.

**Original escalation recommendation, retained for the record:** apply the bounded correction (enumerate all five read sites in §3.1 / DD-10 v2 / `R-PWH-004 AC.4`; widen P-16 and §14 to three wrappers; add 1205 to §6.3 step 3b; correct both headers to `170da206` / 2026-09-22; pick one owner for step 3b; fix C-6's `:59-63`) **outside the Judgment Day protocol**, then proceed to Phase 3. The alternative — shipping to `tasks.md` as-is — is survivable precisely because DC-11 would redden, but it spends an execution cycle to learn what one `grep` already told us.
