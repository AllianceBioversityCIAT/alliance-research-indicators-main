# Judgment Day — findings ledger

> ## ⚠️ FROZEN — this lineage was SPLIT on 2026-09-14. Read this before acting on any finding below.
>
> This ledger is a **point-in-time record of the parent spec** and is deliberately left unedited. Its
> findings are still accurate about the document they judged; that document no longer exists in one
> piece.
>
> | Where each finding went | |
> | --- | --- |
> | **F-3** (the role-grant assertion) | **Stayed here.** Fixed in `requirements.md` R-AGS-004 AC.4 as **both** set- and count-equality, which is what Judge B showed neither achieves alone |
> | **F-4** (stale budget), **F-6** (gate miscount), **F-7** (broken table) | **Stayed here.** Closed in `design.md` §14, §10 and §12 |
> | **W-2** (PAD SPACE), **W-4** (column widths), **W-8**/**G-3** (NFR-AGS-002 gate), **S-3** (Agresso `status`) | **Stayed here.** Addressed in `requirements.md` §5, R-AGS-002/003, NFR-AGS-002 and RSK-9 |
> | **F-1, F-2, F-5, F-8, F-10, F-11, W-1, W-6, W-9, W-10, RSK-6** | **Left with `R-AGS-005`** → [`../agresso-staff-deactivation/`](../agresso-staff-deactivation/proposal.md). They are **not patched — they are out of scope here**, because each is a defect in machinery this spec no longer contains |
> | **F-9** (no carnet-over-email tie-break) | **DISSOLVED** by the user's 2026-09-14 email-only matching ruling. There is no second key, so the finding has no target in either spec |
>
> **Two user rulings postdate this ledger and invalidate premises it reasons from.** Matching is now
> **email only** (so every carnet-key argument here is moot), and **`OQ-5` was reversed** — a returning
> staff member **is** reactivated, so *"deactivation is one-way; reversal is a human action"* is no
> longer true. J-4's remediation, the `matchedInactive` class and RSK-1's mitigation were all written
> under the old premise. **Re-read them; do not re-apply them.**


**Frozen 2026-09-14. Round 1 of at most 2.** Merged by the parent orchestrator from two blind, read-only judges that never saw each other's output.

| Field | Value |
| --- | --- |
| Target | `design.md` (primary) + `requirements.md` (in scope for contradiction-checking) |
| Mode | `judgment_day` — blind dual review |
| Judge A | `akili-reviewer`, opus, fresh context |
| Judge B | `akili-reviewer`, **fable** — deliberately a different model family |
| Author | Opus 5 (this session) |
| Verdicts | **A:** 6 SEVERE / 8 WARNING / 1 SUGGESTION · **B:** 5 SEVERE / 5 WARNING / 4 SUGGESTION |
| Terminal state | *pending round-1 correction decision* |

**Author ≠ auditor, honestly stated:** the model registry maps **both** T1 Architect and T3 Auditor to `opus`, so model-level separation from the author is not achievable by configuration. Compensated two ways: both judges ran in fresh context with no view of the authoring conversation, and Judge B was placed on a different model family. Judge B independently produced 5 of the 6 confirmed severe findings, which is the evidence that the separation was real rather than nominal.

---

## Confirmed SEVERE — both judges, independently

### J-1 — An empty or truncated Agresso payload passes the completeness guard and deactivates everyone

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `design.md` §5.1, DD-2, G-4 |

`findNumberOfPages` returns `Math.round(0/1000) + (0 % 1000 !== 0 ? 1 : 0)` = **0** for `totalElements = 0`. The loop `for (i = 1; i <= 0; i++)` never runs, `base()` is never called, `allStaff = []`, and the guard evaluates `0 !== 0` → false → **reconciliation proceeds**. Every active non-external non-admin account is unmatched and is deactivated across three tables.

Judge A's sharpest observation: the guard is **safe against `undefined`** (which yields `NaN` pages and aborts) and **unsafe against zero** — the opposite of what you would want.

Judge B widened it: any Agresso-side condition returning `200` with a small `totalElements` — an empty backing view, a scoped service account, an ERP data migration — produces a proportional mass deactivation, not just the zero case.

**Failing input:** `{"content":[],"totalElements":0,"totalPages":0}`.

**This is the defect G-4 declares unreachable, reached *through* the guard rather than around it.**

**Remediation (merged):** require `totalElements > 0`; add a **relative floor** — abort if the would-be deactivation set exceeds a configurable fraction of the active population; log both at `error`.

---

### J-2 — `R-AGS-001` AC.3 and `R-AGS-005` AC.1 demand opposite outcomes for the same row

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `requirements.md:95`, `:103` vs `:256`; `design.md` Document Control + §5.3 |

`R-AGS-001` AC.3: *"A `sec_users` row whose carnet and email match no staff member … is left **byte-identical** — every column, `updated_at` included."*
`R-AGS-005` AC.1: *"An active, non-external, non-admin account matching no staff member has `is_active = 0` after the run."*

Identical input set, opposite required outcomes. `design.md` silently follows `R-AGS-005` while its Document Control claims to satisfy both.

**Origin, on the record:** these are pre-split acceptance criteria left in place when the deactivation was folded back in the same day. **The author's own backward sweep missed it** — the sweep searched for references to the sibling *spec*, not for contradictions of *behaviour*. That is the reusable lesson.

**Remediation:** scope `R-AGS-001` AC.3 and its scenario line to **excluded** rows (EX-1/EX-2) and the abort path; cross-reference `R-AGS-005` for the rest.

---

### J-3 — The lowest-`sec_user_id` tie-break deactivates the account the person actually uses

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `design.md` §5.2 ambiguity rule; `requirements.md` RSK-1 |

§5.2 claims the rule *"never deduplicates — repairing the data is out of scope."* **Its own §5.3 contradicts that:** the losing candidate matched no staff member by construction, so it lands in the Deactivate set — its roles revoked and its `app_secrets` killed. That is deduplication by lockout.

Both judges independently noted the tie-break picks the **oldest** row, i.e. statistically the stale one, retiring the newer account that is more likely to be live.

Judge B added a point the design missed: **the code *can* tell the candidates apart.** When the carnet key is ambiguous, one candidate's email also matches the staff member and the other's does not. The design throws that signal away in favour of the lowest id.

**Failing input (B):** `{id: 5, carnet: '12345', email: 'old.name@cgiar.org'}` and `{id: 900, carnet: '12345', email: 'j.doe@cgiar.org', last_login_at: yesterday}`; staff `{resourceId: '12345', email: 'j.doe@cgiar.org'}` → id 5 refreshed, **id 900 deactivated**. The live login is locked out.

**Remediation (merged):** prefer the candidate whose *other* key also matches, then `last_login_at` recency; and decisively — **exclude every candidate of an ambiguous match from the deactivation set** (a third exclusion: *ambiguous, needs a human*), reported in the summary.

---

### J-4 — Deactivated accounts are invisible to matching, so a re-listed staff member gets a second account

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `design.md` §3, §5.2, §5.3; `requirements.md` OQ-5, R-AGS-003 AC.1 |

The bulk read is scoped to **active** rows in three places. An account this spec deactivated is therefore invisible on the next run, so its owner is classified **Create** — inserting a second row for the same person with the same email, and granting it `CONTRIBUTOR`.

Three consequences, all violations of approved text:

| Consequence | Violates |
| --- | --- |
| Two `sec_users` rows, one person, one email | `R-AGS-003` AC.1 (*"exactly one row"*) |
| Access restored automatically on a new id | `OQ-5` (*"deactivation is one-way; reversal is a human action"*) |
| Attribution and roles on the old row orphaned | — |

**The spec becomes a duplicate factory:** every account `R-AGS-005` retires becomes a new duplicate the moment its staff member reappears — feeding J-3, which then deactivates the wrong one.

**Failing input:** run 1 deactivates `{id: 50, carnet: 'A100', email: 'a@cgiar.org'}` (unpaid leave, payroll gap); run 2 the member returns → new row id 1100, same email, same carnet.

**Remediation:** read **all** `sec_users` rows for matching, active and inactive; classify an inactive match as *matched but not refreshed and not reactivated* (honouring OQ-5), never as Create.

---

### J-5 — DD-7's re-select by email hands `CONTRIBUTOR` to rows this spec did not create

| | |
| --- | --- |
| Judges | **A** (SEVERE, as consequence (b) of its matching finding) · **B** (SEVERE, standalone) |
| Location | `design.md` §5.4, DD-7; `requirements.md` R-AGS-004 AC.2 |

DD-7 avoids the auto-increment trap correctly, then reintroduces the same class of bug through the key it re-selects on: **`sec_users.email` has no unique index.** The design asserts the grant is *"restricted to the ids just created"*, but that id set is **derived** from a non-unique key, so the restriction is claimed rather than achieved.

Combined with J-4, the normal rehire shape guarantees a collision: a deactivated row with the same email is returned by the re-select and receives an active `role_id = 3` row — silently re-authorizing an account a previous run retired.

**Failing input:** existing `{id: 50, email: 'a@cgiar.org', is_active: 0}`; new staff with the same email → INSERT id 1100 → `SELECT … WHERE email IN ('a@cgiar.org')` → `[50, 1100]` → CONTRIBUTOR inserted for **both**. Directly violates `R-AGS-004` AC.2.

**Remediation:** re-select by **carnet** (present on every created row by construction) **and** `is_active = 1` **and** `created_at >= run_start`; assert the returned count equals the inserted count and abort the transaction otherwise.

---

### J-6 — The `app_secrets` write cannot join DD-5's transaction

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (WARNING) — *same defect, same verified mechanism; severity split recorded* |
| Location | `design.md` DD-5, §2.2, §3 |

`AppSecretRepository` extends `Repository<AppSecret>` bound to the **injected root `EntityManager`**, so anything issued through it runs on its own connection and its own implicit transaction. §2.2 and §3 mandate the one mechanism that structurally cannot participate in DD-5's transaction — on the single table that gates machine-token auth.

Both judges cited the correct in-repo pattern: `app-secrets.service.ts:44-53` uses `this.dataSource.transaction(async (manager) => …)`, i.e. the manager handed in by the transaction, never the injected repository.

**Failing input (A):** the `app_secrets` update commits on its own connection; the enclosing transaction then hits a lock-wait timeout on the chunked `sec_user_roles` update and rolls back. Final state: **every user still active, every role intact, and the integrations' secrets permanently dead** — precisely the "secrets orphaned" state DD-5 names as its own reason for existing.

**Remediation:** issue the `app_secrets` update through `manager.getRepository(AppSecret)` inside the transaction; delete §2.2's *"uses its repository rather than raw SQL"* line.

---

## Suspect — one judge only, NOT auto-fixed

### S-1 — The row-count guard counts fetched rows, not distinct staff *(Judge A, SEVERE)*

`base()` returns `save(modifyData)`, one element per input element — the count of **fetched rows**, not distinct persisted rows. Since `carnet` is the PK of `alliance_user_staff` and `save()` upserts, a duplicated carnet inflates the count by exactly as much as an omission deflates it, so the two cancel and the guard reports "complete".

**Failing input:** unstable ERP pagination — 5 employees shift position between page reads; page 2 repeats 5 carnets and omits 5 others. `allStaff.length === totalElements` → guard passes → the 5 omitted employees are deactivated.

Judge B did not raise it. Recorded as suspect; the author's assessment is that the mechanism is verified and the remediation is one line (`new Set(allStaff.map(s => s.carnet)).size`), making it cheap to adopt alongside J-1's fix.

### S-2 — Without the cascade a dead user's token still authenticates, as a null user *(Judge B, WARNING)*

`validation()` (`app-secrets.service.ts:72-128`) computes `isValid` from bcrypt and the host whitelist and returns `{ isValid, user }` — **`isValid` does not depend on `user`**. So `jwr.middleware.ts:79-82` passes the request through with `req.user = null`; only `RolesGuard` refuses, and only on `@Roles`-decorated handlers.

**This falsifies a claim in both spec documents.** §7 of each asserts that deactivating a responsible user already breaks their secrets, so the cascade only adds *visibility*. It does not: without the cascade, a null-user request reaches every unguarded handler. **The cascade is necessary for correctness, not merely for the record.**

### S-3 — The Agresso `status` field is never examined *(Judge B, WARNING)*

`AgressoStaffRawDto.status` is mapped into `alliance_user_staff.status` and **nothing in `src/` ever reads it**. If the employees endpoint returns terminated or on-leave staff with a distinguishing status, the spec creates accounts and grants `CONTRIBUTOR` to departed people, and `R-AGS-005` never fires for them because they still "arrive". The whole G-1 premise rests on an unstated assumption about payload semantics.

---

## Confirmed WARNING — both judges

| # | Finding | A | B |
| --- | --- | --- | --- |
| W-1 | **EX-1's `status_id = 4` is unverified.** `user_status` is schema-only, no seed migration, no enum in the codebase. If 4 is not "external", the exclusion shields the wrong population — B's counter-example: `{1: Active, 2: Inactive, 3: External, 4: Pending}` mass-deactivates every external | ✔ | ✔ |
| W-2 | **The carnet index has no null/empty/whitespace rule**, unlike the email index. §5.4's own SQL guard (`carnet IS NULL OR carnet = ''`) proves empty carnets exist, yet §5.2 never excludes them from the index. B adds: `utf8mb3` PAD SPACE means `'123 ' = '123'` in SQL but not in a JS `Map` | ✔ | ✔ |
| W-3 | **`~1,093` and `~11` are `AUTO_INCREMENT` high-water marks** from a schema-only snapshot, not row counts — and §10 itself declares that snapshot uninformative about Dev/Prod. Both documents repeat the figure; that is one derivation copied forward, not corroboration | ✔ | ✔ |

## Suspect WARNING — one judge

| # | Finding | Judge |
| --- | --- | --- |
| W-4 | Pre-write validation guards `carnet` (already constrained upstream by the PK) but omits `first_name`/`last_name` ≤ 60 and `email` ≤ 150, which are narrower on the target than the source. Under strict mode one long name rolls back the whole run | A |
| W-5 | *"Failures surface only in logs"* is false — there is no `.catch()` and no global `unhandledRejection` handler, so a rejection on the unawaited promise **terminates the process** | A |
| W-6 | The guard aborts **healthy** runs: `totalElements` is read before the page loop, so any hire or edit mid-run shifts the total by one. Also, a string `"1500"` from the API makes `!==` never match — a permanent silent no-op | A |
| W-7 | DD-9's dry-run is unmoored from any requirement, has no gate, no budget line, and inverts `R-AGS-005`'s default outcome. No test distinguishes "dry run wrote nothing" from "deactivation is broken" | A |
| W-8 | `NFR-AGS-002` has no gate in `design.md` §10, even though `requirements.md` §10 defines one. The NFR constraining DD-3, the design's central structural choice, is the one with no plan | A |
| W-9 | DD-5's transaction has no stated isolation level, lock timeout, chunk ceiling, or id ordering. Row locks on hundreds of `sec_users` rows block concurrent logins writing `last_login_at`; unordered chunks invite deadlocks | A |
| W-10 | `AppSecretRepository` depends on `CurrentUserUtil`, which is `Scope.REQUEST`; injecting it drags request scope through a service the controller does not await. And there is no "existing audit path" for raw SQL — `createUserInSecUsers` sets no `created_by` | B |

## SUGGESTION

| # | Finding | Judge |
| --- | --- | --- |
| G-1 | `totalPages` is already on the same response envelope; NG-4's workaround is deferred by choice, not by necessity | A, B |
| G-2 | `findNumberOfPages` does not actually return `totalElements` — it discards it. The wiring task must change the return shape | B |
| G-3 | `NFR-AGS-002`'s wording ("bounded by page count") will fight a compliant chunked implementation; reword to `O(⌈n/chunk⌉)` and fix the chunk size so a fixture can assert an exact count | B |
| G-4 | Rollback semantics unstated: §9 lists only success-path fields, so a rollback may surface as a stack trace with no counts | B |

---

## Merge summary

| Class | Count |
| --- | --- |
| **Confirmed SEVERE** (both judges) | **6** |
| Suspect SEVERE (one judge) | 1 |
| Confirmed WARNING (both judges) | 3 |
| Suspect WARNING (one judge) | 7 |
| SUGGESTION | 4 |
| **Contradictions between judges** | **0** |

**No contradictions.** Where the judges differed it was severity (J-6) or coverage, never opposing claims about the same fact — which raises confidence in the confirmed set.

**Where the design held up:** neither judge challenged DD-1 (placement), DD-3's bulk-read structure, DD-4 (raw SQL over new entities), DD-8 (leaving the three existing call sites alone), DD-10 (guard on the controller, not in the service), or `R-AGS-006`. The architecture is sound; **the defects are concentrated in the destructive branch and its edge cases** — which is exactly where a design gets this treatment.

**Author's note for `/akili-archive`:** five of the six confirmed severe findings concern behaviour the author reasoned about but did not falsify — the guard, the tie-break, the active-only read, the re-select key, and the transaction boundary. Each was defensible prose over an unverified mechanism. That is the Kaizen signal, not the individual bugs.

---

## Round 1 — correction delta (applied 2026-09-14)

User authorised: **the 6 confirmed severe findings, plus S-1 and S-2.** S-3 and every WARNING/SUGGESTION remain recorded and unfixed.

| ID | Applied |
| --- | --- |
| **J-1** | Guard split into three preconditions. **C-1** `totalElements > 0`, **C-2** distinct-carnet equality, **C-3** volume ceiling. New scenario in `R-AGS-001`; new `DD-11` |
| **S-1** | C-2 counts **distinct carnets**, not fetched rows; `Number(totalElements)` coerced explicitly; duplicate carnets logged at `warn`. New scenario |
| **J-2** | `R-AGS-001` AC.3 rescoped to **excluded** rows; the scenario's `AND IT MUST` line rewritten; new AC.4 for the abort path |
| **J-3** | New **EX-3** (ambiguous candidates exempt from deactivation). Tie-break now prefers the cross-key match, then `last_login_at`. §5.2 rewritten |
| **J-4** | Bulk read covers **all** rows, active and inactive. New `matchedInactive` class in `R-AGS-001`, `R-AGS-003` AC.5, and §5.3 |
| **J-5** | Re-select keyed on `carnet` + `is_active` + `created_at >= runStart`, **never email**, with a count assertion that aborts. New `R-AGS-004` AC.4 |
| **J-6** | `app_secrets` written through the transaction's `manager.getRepository(AppSecret)`. §2.2, §3 and `DD-5` amended |
| **S-2** | The false machine-token claim corrected **in both documents**: without the cascade the token still authenticates with `req.user = null`. New **RSK-6** for the underlying `validation()` defect |

**Also updated:** 7 new defect-class gates (23 rows total), 3 new summary fields (`excludedAmbiguous`, `matchedInactive`, `abortReason`), architecture tree, and the budget — re-baselined from 8 tasks / ~1,220 LOC to **9 / ~1,560**.

**Not fixed, by decision:** S-3 (the Agresso `status` field is never examined), W-4…W-10, and all four suggestions.

---

## Round 1 — scoped re-judgment (2026-09-14)

Same two judges, same models, narrow scope: verify the eight corrections and hunt **fix-caused** defects.

| | A | B |
| --- | --- | --- |
| Verdict | 2 SEVERE / 7 WARNING / 3 SUGGESTION | 1 SEVERE / 6 WARNING / 3 SUGGESTION |

**Verified clean by both:** J-2 (contradiction gone everywhere round 1 cited), J-6 (all three sites swept; mechanism correct), S-2 (accurate in both documents against `app-secrets.service.ts`, `app-secret.repository.ts:30` and `jwr.middleware.ts`), J-1's C-1 (the zero case is unreachable; `undefined`/`NaN` also abort), S-1's core mechanism, and the budget LOC arithmetic (210+420+130+70+330+400 = 1,560 ✓).

### Confirmed by both — round 2 scope

| # | Finding | A | B |
| --- | --- | --- | --- |
| **R-1** | **J-4's fix landed in 2 of 4 places.** `design.md` §3 (the table an implementer writes SQL from) still says *"read all active"*, and **DD-3 — the decision of record — was never touched.** The document now specifies both behaviours with no precedence rule. A's failing input reproduces the entire J-4 duplicate factory unchanged | SEVERE | WARNING |
| **R-2** | **C-3 is a symbol, not a rule.** No value, no config key, no default, no `activePopulation` definition, no unset behaviour, no K-016 TTL note, no operator procedure on breach. It single-handedly decides whether the spec's only defence against the class C-1/C-2 cannot see ever fires — and `requirements.md` §10 states no gate can measure the right value | SEVERE | WARNING |
| **R-3** | **EX-3's scope is ambiguous, and under the procedural reading the J-3 lockout survives.** `requirements.md` defines it structurally (a key mapping to >1 row); `design.md` places it as step 3 of a resolution procedure, and the step table reads as short-circuit. Both judges built the same shape: carnet resolves to **one** row, the email ambiguity is never consulted, and a live account is deactivated | WARNING | **SEVERE** |
| **R-4** | **C-2 created a new permanent-abort class.** Any duplicate carnet in a *complete* payload makes `distinct < totalElements` → abort, every run, forever. Neither document states this trade, and empty/over-length carnets are uncounted | WARNING | WARNING |
| **R-5** | **`runStart` has no stated clock source.** `created_at` is stamped by MySQL; `runStart` will default to a Node `Date`. App/DB skew of a few hundred ms makes the re-select return zero and the count assertion roll back the whole transaction on every run | WARNING | WARNING |
| **R-6** | **`requirements.md` sweep incomplete.** `:318` still asserts *"the exclusion list is exactly two entries"* — framed as a ruling, the phrasing most likely to be trusted over the table. AC.7 still breaks the count down by EX-1/EX-2 only; NFR-AGS-003's list omits `excludedAmbiguous`, `matchedInactive`, `abortReason`; RSK-1 still documents the retired lowest-id tie-break | WARNING | WARNING |
| **R-7** | Ledger says 25 gate rows; the real count is 23 | SUGG | SUGG |

### Suspect — one judge

| # | Finding | Judge |
| --- | --- | --- |
| **S-4** | **C-3 aborts the dry run that DD-9 and §11 exist to produce.** The run most likely to breach the ceiling is the first one, whose entire purpose is to report how large the deactivation set is. Fix-caused: before C-3, a dry run always produced counts | A |
| **S-5** | **`R-AGS-004` AC.4's count assertion has no gate that can go red.** The nearest gate falsifies the re-select *key*, not the assertion; an implementer who keys correctly and omits the check leaves every gate green | A |
| **S-6** | **`R-AGS-002` was not swept for the active/inactive split.** Its Inputs say "a matched `sec_users` row" with no activity qualifier, so AC.1 claims matched-inactive rows the design says must be left alone | A |
| **S-7** | The rewritten tie-break is blind to `is_active`, which J-4 just made relevant — an inactive candidate can win on `last_login_at` and mis-classify a live account as `matchedInactive` | B |

### The pattern, recorded for Kaizen

**Three of the seven round-2 findings are incomplete sweeps** (R-1, R-3, R-6) — the same failure that produced J-2 in round 1. Corrections were applied where the finding pointed and not swept across the documents. This is the third occurrence in one spec and it is the reusable lesson, not the individual residues: **a correction is not applied when the cited site is fixed; it is applied when the superseded claim is gone from everywhere it lived.**

Two findings (R-3's live-account lockout, S-4's dry-run abort) are **defects the corrections themselves introduced** — the specific thing a scoped re-judgment exists to catch, and neither would have been found by re-reading the round-1 findings.

---

## Round 2 — correction delta (applied 2026-09-14)

User authorised **R-1…R-7 plus all four suspects (S-4…S-7)** — the full set. This is the final fix round the protocol permits.

| ID | Applied |
| --- | --- |
| **R-1** | `design.md` §3 and **DD-3** now read *"ALL rows — active and inactive"*. Both cells carry the J-4/R-1 amendment note |
| **R-2** | C-3 fully specified: `max(0.05 × activePopulation, 10)`, two named `app_config` keys, `activePopulation` defined as active rows at bulk-read time before exclusions, explicit abort on unset/non-numeric/`<= 0`, K-016 TTL note, and a stated operator path for a legitimate breach |
| **R-3** | **EX-3 hoisted out of the resolver into a standalone pre-pass** over both indexes, and **both lookups are now always evaluated, never short-circuited**. Requirements and design carry the same definition |
| **R-4** | C-2 counts distinct **non-empty** carnets against `totalElements` minus pre-write-skipped members; the duplicate-abort trade is stated outright; `abortReason = C-2` carries the duplicate list |
| **R-5** | `runStart` comes from `SELECT NOW(6)` **on the transaction's connection**; the grant assertion is **set-equality of carnets**, not count-equality; empty/whitespace carnets added to pre-write skip |
| **R-6** | `requirements.md` swept: `:318` "two entries" → three, AC.7 broken down by EX-1/EX-2/EX-3 + `matchedInactive`, NFR-AGS-003's list extended, RSK-1's mitigation rewritten |
| **R-7** | Ledger 25 → 23 |
| **S-4** | C-3 **reports instead of aborting in dry-run mode**; new AC.8 requires an aborted run to emit full counts + `abortReason`; §11 step 2 states the first run is expected to breach |
| **S-5** | New gate: correct re-select key with the count check omitted → assert rollback, no role row |
| **S-6** | `R-AGS-002` scoped to a matched **active** row, pointing matched-inactive at `R-AGS-001`'s third route |
| **S-7** | Tie-break rule 1 is now *prefer active over inactive*; `NULL last_login_at` sorts last |

**Also:** §11 gained step **2b** — read `user_status` and confirm id 4 is the external status, the one thing that would make EX-1 shield nobody. Architecture tree updated. Gate count 23 → **31**. `§10`'s table was silently broken into three by blank lines with one header between them — repaired. References table now cites the two files S-2's correction rests on.

### Closure sweep — both directions, run explicitly this time

Forward: every superseded phrasing (`read all active`, `One bulk read of active`, `exactly two entries`, `lowest sec_user_id wins`, `configured fraction`, `ceiling × activePopulation`, `EX-1/EX-2,`, `seven distinct gates`, `counts rows and not pages`) returns **zero live occurrences**. The four remaining textual hits are quotations of the retired text inside amendment notes, plus one gate's falsifier mutation — correct usages.

Backward: `EX-3`, `matchedInactive`, `abortReason`, `excludedAmbiguous`, `C-1`, `C-2`, `C-3` and `runStart` all appear in **both** documents.

**This is the sweep that was skipped in round 1 and produced three of round 2's seven findings.**

---

## Round 2 — final scoped re-judgment (2026-09-14)

| | A | B |
| --- | --- | --- |
| Verdict | 2 SEVERE / 4 WARNING / 4 SUGGESTION | 2 SEVERE / 7 WARNING / 2 SUGGESTION |

**Verified clean by both:** R-1 (all four sites), R-3's pre-pass mechanism — B tried the cross-key, same-key, OQ-3 and case/whitespace shapes and **could not build a lockout through it** — R-5's DB clock, R-6's four residues, R-7, S-6, S-7, AC.8, §11 step 2b, and the §10 table repair. Counts verified: 9 requirements, EX-1/2/3, DD-1…DD-11, RSK-1…6.

### Confirmed — still open

| # | Finding | A | B |
| --- | --- | --- | --- |
| **F-1** | **C-2's skip subtraction is arithmetically wrong.** Only the empty-carnet skip removes a carnet from the distinct count; a null-email or over-length-carnet member is counted on the left *and* subtracted on the right → `N ≠ N−1` → **permanent abort on a schema-permitted input**. A null email is not an edge case: `R-AGS-003` AC.3 mandates skipping it and §9 reserves a counter for it. R-4 reintroduced the exact class it was written to prevent. The formula also landed in **2 of 5 sites** — three inconsistent statements of C-2 now exist | SEVERE | WARNING |
| **F-2** | **C-3's "default" and "unset → abort" are mutually exclusive.** If unset aborts, `0.05`/`10` are seed values — and the spec forbids the only seeding mechanism this repo has (`design.md:306` "No migration is involved"), budgets no task, adds no enum members. B verified the platform has no fallback convention at all: `AppConfigService.getEnv` **throws** on an unset key and `updateConfig` **throws** for an unknown key, so the two keys cannot even be created through the API. Following §11 literally, the first live run aborts and writes nothing, forever | SEVERE | WARNING |
| **F-3** | **The R-5 grant assertion is incoherent across the documents and insufficient in either form.** A: set-equality landed in **1 of 5 sites** — AC.4 and the only gate still mandate the count check the design rejects. B: **set-equality alone is also wrong** — a returned set with a *duplicate* carnet has the same set and a different count, so a concurrent `createUserInSecUsers` for the same new hire lands `CONTRIBUTOR` on a row this spec did not create. Neither assertion is sufficient alone; the spec states one in three places and the other in one | WARNING | SEVERE |
| **F-4** | **Budget never re-baselined for round 2.** Still 9 tasks / ~1,560 LOC with a justification that names round 1 only, "seven new gates", and "R-AGS-005's nine gates" (actually 13). §14 is `/akili-execute`'s tripwire, so a stale budget converts a real overrun into a false escalation | WARNING | WARNING |
| **F-5** | **Dry-run C-3 has no field to report into and no gate.** §9 carries no `activePopulation`, `ceiling` or `ceilingBreached`; `abortReason` is set only on abort. So a dry-run breach reports `deactivated = N` with nothing saying the live run will stop. And "raise the ceiling for one run" has **no step restoring it** — a forgotten restore disables the spec's only defence indefinitely and invisibly | WARNING | WARNING |
| **F-6** | Gate count is **29**, not the 31 this ledger claimed. R-7's miscount class recurred within one round of being corrected, in the opposite direction | SUGG | SUGG |
| **F-7** | **`design.md` §12 carries the identical broken-table defect repaired in `requirements.md` §10** — a blank line at `:324` orphans DD-10 into a headerless one-row table. The repair was applied where the finding pointed and not swept to the sibling document | SUGG | SUGG |

### Suspect — one judge, and one of them is a lockout

| # | Finding | Judge |
| --- | --- | --- |
| **F-8** | **Pre-write-skipped staff members drop out of matching entirely, so their live accounts fall to `R-AGS-005`.** R-4 wired the skip set into C-2's arithmetic, which forces the skip to be decided *before* matching. Nothing says a skipped member still participates in matching, and nothing exempts the row it would have matched. A staff member **on the Alliance list** who arrives with a null email has their account deactivated across three tables — J-3's outcome, reintroduced by R-4/R-5's plumbing | **B** (SEVERE) |
| **F-9** | The merged A ∪ B tie-break has **no carnet-over-email rule**, contradicting OQ-3, §5.2, DD-6 and ASM-2 — and can backfill a carnet onto an email-matched row, *manufacturing* the RSK-1 duplicate the spec declines to repair | B |
| **F-10** | The pre-pass counts **inactive** rows toward key ambiguity, so any already-inactive duplicate shields its active sibling from deactivation permanently | B |
| **F-11** | **Seven round-2 rules are stated but ungated**, including C-3's dry-run behaviour, C-3's unset abort, the C-2 skip adjustment, set-equality, and matched-inactive's no-refresh rule | A |
| **F-12** | **Sweep residues the author's pattern list did not cover** — `requirements.md:272` still states the retired lowest-id tie-break in the present tense, inside the `R-AGS-005` rationale. The sweep matched exact phrases, not stems | B |

---

# TERMINAL RECEIPT

| Field | Value |
| --- | --- |
| Target | `design.md` + `requirements.md`, `docs/specs/changes/agresso-staff-sec-users-sync` |
| Mode | `judgment_day` — blind dual review, different model families |
| Rounds | **2 of 2 fix rounds used · 2 of 2 scoped re-judgments used — lineage exhausted** |
| Round 1 | 6 confirmed SEVERE · 8 fixed (6 + S-1 + S-2) |
| Round 2 | 7 confirmed + 4 suspects · 11 fixed |
| Final | **7 confirmed open (2 severe-class), 5 suspect open (1 severe-class)** |
| Contradictions between judges | **0**, across all three passes |

## `JUDGMENT: ESCALATED ⚠️`

The protocol permits no further correction on this lineage. **Two fix rounds did not converge**, and the reason is visible in the data rather than a matter of opinion.

### What the three passes actually show

**Every severe finding in three rounds falls into one of two places.** The destructive branch and its guard produced J-1, J-3, J-4, J-6, R-1, R-2, R-3, R-4, F-1, F-2, F-8. The id-resolution for the role grant produced J-5, R-5, F-3 — the same defect surviving two corrections in three different forms.

**Nothing else was ever found.** `R-AGS-002`'s refresh rules, `R-AGS-006`'s guard, DD-1, DD-3's structure, DD-4, DD-8, DD-10 and the whole additive path drew **zero** findings across three passes and two judges on different model families.

**Three of the four sweep failures were mine, and the fourth recurred inside the round that corrected it.** J-2, R-1, R-3, R-6, F-7 and F-12 are all the same failure: a correction applied where the finding pointed and not swept. The final round's sweep was explicit, listed its patterns, and *still* missed `requirements.md:272` because it matched phrases rather than stems.

### The honest reading

The additive half is stable and has been since the first draft. The destructive half has needed three adversarial passes and is still producing severe findings — twice by *reintroducing* the class the previous correction removed (R-4 → F-1; J-5 → R-5 → F-3).

That is not a sign the destructive requirement is wrong. It is a sign that **`R-AGS-005` and its guard are a spec of their own**, and that carrying them inside a spec whose other half was finished after round 1 is what exhausted this lineage.

### Recommendation to the human

Split, and let each half take the review it needs:

| | |
| --- | --- |
| **Ship** | `R-AGS-001` … `R-AGS-004`, `R-AGS-006` — additive, zero open findings, plus **F-3** which must be fixed as *both* assertions (count **and** set) |
| **Re-spec** | `R-AGS-005`, EX-1/2/3, C-1/C-2/C-3, the three-table cascade, the dry run — as a fresh spec, carrying F-1, F-2, F-5, F-8, F-9, F-10 and this ledger as its starting evidence |

**Nothing in this ledger is lost by splitting.** Every finding above is written against a requirement id that survives the split, and the re-spec starts from a settled rule set rather than rediscovering it.

**Do not resume this lineage.** Its rounds are spent, and a third correction pass inside it would be exactly the "never reset or extend an exhausted lineage" the protocol forbids.

---
---

# Judgment Day — LINEAGE 2 (post-split), Round 1

**Frozen 2026-09-14.** A **new** lineage, not a continuation of the exhausted one above. Target: the post-split `requirements.md` + `design.md`, scoped to content that had never been judged.

| Field | Value |
| --- | --- |
| Target | `requirements.md` + `design.md`, scoped to **R-AGS-007, DD-12, DD-13, the F-3 fix, and split integrity** |
| Mode | `judgment_day` — blind dual review, parallel, neither judge saw the other or the author's reasoning |
| Judge A | `akili-reviewer`, opus, fresh context |
| Judge B | `akili-reviewer`, **fable** — deliberately a different model family |
| Author | Opus 5 (same session that performed the split) |
| Verdicts | **A:** 5 SEVERE / 7 WARNING / 2 SUGGESTION · **B:** 4 SEVERE / 7 WARNING / 2 SUGGESTION |
| Rounds used | **0 of 2 fix rounds · 0 of 2 scoped re-judgments** |
| Terminal state | *pending round-1 correction decision* |

**Author ≠ auditor, honestly stated:** the registry maps both T1 Architect and T3 Auditor to `opus`, so model-level separation from the author is unachievable by configuration. Compensated as before: fresh context for both, and Judge B on a different model family. **Judge B independently produced all four confirmed severe findings**, which is the evidence the separation was real.

---

## Contradiction between judges — ONE, resolved by direct verification

| | |
| --- | --- |
| Judge A | Listed *"Nothing in `src/` reads the Agresso `status` field (RSK-9)"* as **verified correct** |
| Judge B | Filed **B-8**: that claim is **false** |
| **Resolution** | **Judge B is correct; Judge A reported a false green.** Verified directly: `AllianceUserStaffRepository.findDataForOpenSearch` issues `this.find({ where })` — full entity, every column — and `AllianceStaffOpensearchDto.status` is declared `@OpenSearchProperty({ type: 'keyword' })` at `alliance-staff.opensearch.dto.ts:24-27`. The field **is** read and indexed into OpenSearch today |

**Not escalated to the human**, because the disagreement was over a mechanically checkable fact, not a judgment. Recorded here in full so the resolution is auditable rather than a silent choice between judges.

**The reusable lesson (KZ-017 recurrence):** three independent parties — the author, Judge A, and Judge B's own first attempt — ran the same `grep` scoped to `src/domain/tools/agresso/` and got the same confident zero. **A check narrower than the claim it backs returns green forever.**

---

## CONFIRMED SEVERE — both judges, independently

### M-1 — `runStart` is sampled *after* the inserts, so the re-select is always empty and every run with a new hire rolls back

| | |
| --- | --- |
| Judges | **A-1** (SEVERE) · **B-2** (SEVERE) |
| Location | `design.md` §2.1 tree lines 74–77 — the only place the transaction is sequenced; §5.4 Create and `requirements.md` R-AGS-004 are both silent on ordering |

MySQL's `NOW(6)` returns the time the **statement** began; it is not frozen at transaction start. Issued *after* the chunked `INSERT`, it returns a timestamp strictly later than every `created_at` the insert stamped, so `created_at >= runStart` matches **zero** rows. Count `0 ≠ N` → AC.4 fires → the whole transaction rolls back.

**Failing input:** any payload with one staff member whose email matches no `sec_users` row. Insert at T₀, `SELECT NOW(6)` → T₁ > T₀, re-select → 0 rows, abort. **No account is ever provisioned, on any run.**

**Why no gate catches it (both judges, same analysis):** the only `runStart` gate asserts the clock *source*, and is structurally incapable of evaluating statement *order*. Its falsifier is a Node `Date`, which a correct-source implementation already passes.

**This is the J-5 → R-5 → F-3 lineage surviving into a fourth form.** R-5 fixed the clock source; the split-era rewrite lost the ordering the fix depended on.

**Remediation:** make `runStart` the transaction's **first** statement, stated in §2.1, §5.4, DD-7 and R-AGS-004; add a gate whose falsifier moves the `SELECT NOW(6)` after the insert.

---

### M-2 — The role-3 reactivation `UPDATE` flips every matching row, so a user can end with two active `CONTRIBUTOR` rows

| | |
| --- | --- |
| Judges | **A-2** (SEVERE) · **B-4** (SEVERE) |
| Location | `design.md` §5.4 "Reactivate role" line 210; `requirements.md` R-AGS-007 AC.2, AC.6, behavior table |

`UPDATE sec_user_roles SET is_active = 1 WHERE user_id IN (…) AND role_id = 3 AND is_active = 0` is unbounded per user. `sec_user_roles` has **no unique index on `(user_id, role_id)`** — both documents say so. The requirement's three-way per-user rule (flip / insert / no-op) has **no SQL realization**; the design realizes only "flip anything inactive, insert if none".

**Failing input (a):** user 50 inactive, holding **two** inactive `(50, 3)` rows — reachable because the sibling spec sets `is_active = 0` on *every* active role row, so a pre-existing duplicate grant deactivates as a pair. Staff member reappears → both flip → **two active role-3 rows**, violating AC.2 and AC.6.
**Failing input (b):** one active + one inactive `(50, 3)` row on an inactive user → requirement says *nothing is written*; the SQL flips the inactive one → two active.

**Why no gate catches it:** the nearest gate seeds *"an **active** role-3 row on an inactive user"* — the single shape the specified SQL handles correctly. No gate seeds two role-3 rows.

**Remediation:** compute the UPDATE's id list as *"reactivated users with **no** active role-3 row"* and flip at most one row per user (`MIN(sec_user_role_id)`); state it in §5.4 and DD-13; add a two-inactive-rows fixture.

---

### M-3 — A staff member matching two or more inactive rows is unrouted in `requirements.md` and silently reactivated in `design.md`

| | |
| --- | --- |
| Judges | **A-3** (SEVERE) · **B-3** (SEVERE) |
| Location | `requirements.md` R-AGS-007 Inputs (*"matched **exactly one** row, and that row is inactive"*) and AC.1 vs `design.md` §5.2 step 5 / §5.3 (*"non-empty and **entirely inactive**"* / *"one **or more** rows, all inactive"*) |

Under the requirements such a member satisfies **no** route: not R-AGS-002 (no active row), not R-AGS-003 (matched something), not R-AGS-007 (not exactly one). That directly falsifies R-AGS-001's *"routed to exactly one of"*. Under the design the §5.2 tie-break picks a row and turns it on. RSK-1's mitigation wording silently sides with the design against R-AGS-007's own Inputs.

**Failing input:** rows `{id:10, is_active:0, last_login_at:2024-01-01}` and `{id:20, is_active:0, last_login_at:2025-06-01}`, both `j.doe@alliance.org`; member arrives with that email. Requirements → unrouted. Design → id 20 reactivated.

**Reachability is asserted by the documents themselves:** RSK-1 says duplicate emails exist in live data, and the sibling's F-10 records that *already-inactive* duplicates are the common shape.

**Same class as the exhausted lineage's J-2** — two documents demanding different outcomes for one input.

**Remediation:** rewrite R-AGS-007 Inputs to *"one or more rows, all inactive; the §5.2 tie-break selects the one reactivated"*; add the AC, the scenario and the gate; align RSK-1's wording.

---

### M-4 — Nothing deduplicates the **payload**, so two staff members sharing an email each get a new account — manufacturing the RSK-1 duplicate the spec declines to repair

| | |
| --- | --- |
| Judges | **A-4** (SEVERE) · **B-1** (SEVERE) |
| Location | `design.md` §5.2 (the index is built over `sec_users` **only**), §5.3 Create, §5.1's *"benign by construction"* table, DD-12 rationale; `requirements.md` R-AGS-003 AC.1, R-AGS-001 AC.1 |

Matching indexes the `sec_users` side. **Nothing indexes, deduplicates or counts the payload side.** Two members with the same email that match no row are both classified *create* → two active rows, two `CONTRIBUTOR` grants. The ambiguity report is computed from the **pre-insert** bulk read, so it does not fire: the summary says `created = 2`, `ambiguousMatches = 0`.

**The F-3 double assertion cannot catch it** — both set and count are computed from the *inserted* list. Two inserts of carnet `A100` → inserted set `{A100}`, count 2; re-select returns 2 rows, set `{A100}`, count 2 → **both checks pass**.

**Failing input (A):** payload carries `{A100, j.doe@alliance.org}` and `{B200, j.doe@alliance.org}` — a rehire issued a new employee id, a contractor→staff conversion, or a shared mailbox — with no `sec_users` row for that email. `alliance_user_staff.email` is nullable with **no unique index**; `carnet` is the PK, so two rows for one email are a normal state.
**Failing input (B):** unstable ERP pagination repeats `{A100, a@alliance.org}` across two pages (the exhausted lineage's verified S-1 shape) with no existing row.

**Consequence beyond this spec:** `findUserByEmail` (`LIKE … LIMIT 1`) then resolves that person **non-deterministically** for `tip-integration`, `prms.opensearch` and `results.service`.

**Split-caused.** C-2 (distinct-carnet equality) was the only rule that aborted a payload containing the same person twice. It left with `R-AGS-005`, and §5.1 now declares such a payload *"benign by construction"*. **That claim is false**, and it is the author's own reasoning, not an inherited one.

**DD-12's stated benefit is half true:** *"no path by which a carnet backfill manufactures the RSK-1 duplicate"* holds for the **backfill** path and fails for the **create** path — which the email-only ruling made the only path that matters.

**Remediation:** collapse `allStaff` to one member per `lower(trim(email))` before classification, with a stated winner rule; report collisions in the summary; add a gate; delete the "benign" row from §5.1.

---

## SUSPECT SEVERE — one judge, NOT auto-fixed

### M-5 — The F-3 assertion rolls back the *entire* run, and the split removed the only field that could report it *(Judge A, SEVERE)*

DD-5 puts the whole reconciliation in one transaction. AC.4 says *"either check failing aborts the transaction and grants nothing"* — neither document states what **else** is lost: every create, every backfill, every name refresh and **every reactivation**.

Three facts compound it:

1. **The abort is reachable in normal operation.** `createUserInSecUsers` writes `carnet` whenever an active `alliance_user_staff` row with that carnet exists — which **this very sync guarantees**, because `base()` writes `alliance_user_staff` page by page *before* reconciliation runs. Any concurrent STAR/TIP/PRMS lookup for a just-synced member inserts a second row with the same carnet inside the window.
2. **§9's summary has no `abortReason` and no failure field at all.** That field existed in the parent (round 2, R-2/S-4) and travelled out with `R-AGS-005` — but the abort **path** stayed. §9 itself declares the summary *"the only feedback channel"*.
3. The controller does not `await` and has no `.catch()`, so the operator already holds a `200`.

**Failing input:** a run over ~1,000 staff. Page 1 writes `alliance_user_staff` carnet `A100`. Mid-run a result author triggers `createUserInSecUsers` for that person. Re-select returns 2 rows for 1 inserted carnet → count check fails → **1,000 refreshes, every backfill and every reactivation discarded**, `200` already returned, nothing recorded, no retry. The next run races identically.

Judge B did not raise it. The author's assessment: the mechanism is verified against source and the blast radius is the largest of any finding in this round.

---

## CONFIRMED by direct verification (judges contradicted)

### M-6 — `RSK-9`'s "nothing in `src/` reads `status`" is false; the field is read and indexed into OpenSearch today

Raised by **B-8**; Judge A listed the opposite as verified-clean. Resolved above in favour of B, by direct inspection.

Consequences: the claim of record in `requirements.md` RSK-9 and `design.md` §15 is wrong, and **OQ-8's *"its value set is unknown"* is overstated** — a terms aggregation on the `alliance_user_staff` OpenSearch index yields the value set without touching Dev MySQL. The risk RSK-9 describes (provisioning departed staff) is **unaffected**; only the evidence and the cheapest pre-flight change.

---

## CONFIRMED WARNING — both judges

| # | Finding | A | B |
| --- | --- | --- | --- |
| **M-7** | **`rolesLeftInactive` is mandated by `design.md` §9 and absent from `requirements.md` NFR-AGS-003's 13-field list**, whose gate is *"assert the summary is emitted with the right counts"*. An implementer testing to the NFR passes with the field missing — and that log is RSK-7's **entire** mitigation for a returning CENTER_ADMIN silently losing elevated access. No §10 gate row covers it | A-9 | B-7 |
| **M-8** | **`R-AGS-007`'s *"also refreshed per `R-AGS-002`"* imports `R-AGS-002` AC.4** (*"`is_active` holds the same value before and after"*), which contradicts `R-AGS-007` AC.1 (*"`is_active = 1` after the run"*) for the same row. B adds the sweep residue: `R-AGS-002` still says `is_active` is *"never written **by this spec**"* — literally false post-split, and exactly the F-12 phrasing class | A-11 | B-5 |
| **M-9** | **The round-2 correction adding empty/whitespace carnets to the pre-write skip did not survive into either document.** Unlike C-1/C-2/C-3, its removal carries **no rationale anywhere** — the signature of a lost correction rather than a decision. It matters because carnet is now the *sole* key of the R-AGS-004 re-select. *(Severity split: A WARNING, B SUGGESTION. Neither judge could construct a failing input — `alliance_user_staff.carnet` is the PK under PAD SPACE, so `''` and `'   '` collide there.)* | A-12 | B-13 |
| **M-10** | **§14's re-baseline itemization does not reconcile.** A: *"three preconditions, three exclusions, **the volume ceiling**"* double-counts C-3, which **is** the volume ceiling. B: *"five new gates"* is wrong — counting rows that could not have existed in the parent gives **7**. *(The totals themselves are correct and both judges independently re-derived them: 22 gates, 1,240 LOC, 1,560 − 520 + 200.)* | A-13 (S) | B-6 (W) |

## SUSPECT WARNING — one judge

| # | Finding | Judge |
| --- | --- | --- |
| **A-6** | `R-AGS-001` AC.1 (*"every one of the N has **exactly one** matching row"*) is falsified by this spec's own "Two accounts share an email" scenario twelve lines below, which requires both rows to survive. A fixture written literally against AC.1 fails on a conforming implementation | A |
| **A-7** | **The pre-write skip removes a member from *matching*, not just from writes** — §5.2 step 1 says *"participates in nothing"* — so a member skipped for an over-long carnet is never refreshed and never reactivated. **The callout claiming this is *"inert here"* is false**, and it instructs the sibling spec to inherit the rule. *(A could not reach it through the production path: `base()`'s `save()` is unguarded, so an 11-char carnet throws before reconciliation — which is also evidence that gate line 524 exercises an input production cannot produce.)* | A |
| **A-8** | **DD-12's rationale is factually false against the schema**, and copied into both documents: *"email is the only column on which `sec_users` and `alliance_user_staff` can be compared"* — both carry `carnet`, and `findUserByEmailOrCarnet` already tries carnet **first**. The *ruling* is the user's and stands; the *justification* recorded for it is wrong, in the one place a future reader will look | A |
| **A-10** | **The PAD SPACE justification for the count assertion is unreachable under the design's own predicate.** The re-select is keyed on `created_at >= runStart` too, so a *pre-existing* `'A100 '` row is excluded regardless of collation. §5.4's two "independent" witnesses for why count-equality is necessary are **one** witness | A |
| **A-14** | The `sec_user_roles` **read** for reactivation targets appears in §3 and is **missing from §5.4's statement table**, and is unchunked. NFR-AGS-002's gate demands an *exact* statement count — an implementer and a fixture author will derive different numbers | A |
| **B-9** | **The "role granted to a pre-existing account" gate is now falsified by `R-AGS-007`.** A pre-seeded *inactive* account with no role-3 row **must** gain one; the gate asserts *"no role row appears"*. Split-caused premise drift | B |
| **B-10** | **§8 cites an "existing audit path" for `created_by`/`updated_by` that does not exist for raw SQL.** `createUserInSecUsers` inserts no `created_by`; the controller calls the service with no argument and does not await, so the detached run has no `request.user` and the design specifies no parameter. *(This is the half of the exhausted lineage's W-10 that targets **this** spec's writes — the frozen banner files all of W-10 as having left with `R-AGS-005`. Split-integrity mislabel.)* | B |
| **B-11** | **Whether reactivating `sec_users.is_active` restores *login* is not verifiable in this repo.** For a ROAR JWT, `req.user` comes from the external validate-token call; nothing here shows ROAR consulting these tables. The demonstrable in-repo readers of the flag are `findUserByEmail` and the **machine-token** path — so the provable effect of `R-AGS-007` is that a hand-suspended user's machine token resolves a user again, via the one table the spec says it never touches | B |
| **B-12** | **DD-13's "role pinned in SQL" guarantee does not cover the INSERT branch.** `role_id = 3` is a `WHERE` predicate only in the UPDATE; the insert carries it as a bound value from the batch builder — exactly the code path the claim says cannot re-grant `SYSTEM_ADMIN` | B |

---

## Merge summary

| Class | Count |
| --- | --- |
| **Confirmed SEVERE** (both judges) | **4** |
| Suspect SEVERE (one judge) | 1 |
| Confirmed by direct verification (judges contradicted) | 1 |
| Confirmed WARNING (both judges) | 4 |
| Suspect WARNING (one judge) | 9 |
| **Contradictions between judges** | **1 — resolved, not escalated** |

### The pattern, recorded for Kaizen

**Three of the four confirmed severe findings are defects the split itself introduced**, and none is an inherited one:

- **M-1** — a correction (`R-5`'s DB clock) survived the rewrite while the ordering it depends on did not.
- **M-4** — a guard was removed with an argument (*"benign by construction"*) that is **true for the guard's stated purpose and false for a purpose it also served silently**. C-2 defended against mass deactivation *and* against payload duplicates; only the first was reasoned about.
- **M-2 / M-3** — a **new** requirement written as prose whose per-user rule has no SQL realization, and whose input predicate disagrees with its own design.

**The reusable lesson is M-4's shape:** when removing machinery, enumerate what it *does*, not what it was *for*. The author verified that C-1/C-2/C-3 existed to prevent mass deactivation — correctly — and inferred from that they were unnecessary without deactivation. One of them was also the only payload-side duplicate check in the spec.

---

## Lineage 2 — Round 1 correction delta (applied 2026-09-14)

User authorised: **the 4 confirmed severe findings, plus M-5 (suspect severe) and M-6 (resolved contradiction).** The 4 confirmed warnings and 9 suspects remain recorded and unfixed.

| ID | Applied |
| --- | --- |
| **M-1** | `runStart` is now the transaction's **first** statement, before any insert — restated in `design.md` §2.1's tree, §5.4's new "Why `runStart` is first" paragraph, and `requirements.md` R-AGS-004 Details. New **AC.6** and a new gate whose falsifier moves the `SELECT NOW(6)` below the insert |
| **M-2** | Reactivation's role write is now **three disjoint id lists** from one chunked read: (a) already-active → **no statement**, (b) inactive-only → update **one** `sec_user_role_id` per user (`MIN`), never `WHERE user_id IN`, (c) none → insert. `role_id = 3` is a **literal constant** in both statements. `design.md` §5.4 + DD-13, `requirements.md` R-AGS-007 behavior table + AC.2. **Two** new gates (two inactive rows; active + stale inactive) |
| **M-3** | `R-AGS-007` Inputs rewritten to *"one or more rows, **all inactive**"*, with the §5.2 tie-break naming which one is reactivated and the losers left byte-identical. New **AC.8**, a new scenario, a new gate. §5.2 step 5 and RSK-1 aligned |
| **M-4** | New **`DD-14`**: the payload is collapsed to one member per `lower(trim(email))` before matching, lowest carnet winning, losers counted in `payloadEmailCollisions`. Realized as step 0 in §5.2, a new §5.3 row, R-AGS-003's *Payload collisions* clause and **AC.6**, a new gate. **§5.1's false "benign by construction" claim is called out in place** rather than quietly deleted. DD-12's half-true F-9 benefit is scoped |
| **M-5** | New **`DD-15`**: create + grant run inside a **`SAVEPOINT create_grant`**; a failed F-3 assertion rolls back **only that sub-batch**, so refreshes and reactivations commit. `abortReason = GRANT_ASSERTION` restored to §9 and NFR-AGS-003. `R-AGS-004` AC.4 restated, new **AC.5**, the concurrency scenario rewritten, a new gate |
| **M-6** | RSK-9 corrected in `requirements.md` and `design.md` §15 with the two reader sites named; OQ-8 rewritten — its **value set** is the unknown, not its readability — and the OpenSearch terms aggregation added to §11 step 2 as a pre-flight needing no Dev MySQL |

**Also updated:** gate table **22 → 28** (counted, not asserted); budget re-baselined a third time to **9 tasks / ~1,580 LOC / 5 rounds** with the full three-step history shown; sibling proposal gained **NEW-4** and a `DD-14` inheritance note.

**Not fixed, by decision:** M-7…M-10 (confirmed warnings) and all nine suspects — including **A-8** (DD-12's "only column" rationale is false against the schema; the *ruling* stands, its justification does not), **B-9** (the pre-existing-account gate is now falsified for inactive accounts), **B-10** (§8 cites an audit path that does not exist for raw SQL) and **B-12** (DD-13's SQL-pinning claim does not cover the INSERT branch).

### Closure sweep — both directions, run explicitly

**Forward.** Every superseded string returns **zero live occurrences**: `matched **exactly one**` (as R-AGS-007's predicate), `WHERE user_id IN (…) AND role_id = 3`, `nothing in src/ reads`, `22 gates`, `Gate count is **22**`, `| Tasks | **8** |`, `Review rounds | **4** |`. The three surviving textual hits are the phrase reused in its **new** meaning, a correction note quoting the retired claim, and the historical row of §14's baseline table.

**Two real residues were caught by the sweep and fixed** — the exact class that produced three of lineage 1's round-2 findings:

1. `R-AGS-004`'s concurrency **scenario** still said *"the transaction aborts"* after M-5 had scoped the rollback to the savepoint everywhere else. The correction had reached the Details, the AC and the design and **not** the scenario.
2. §14's before/after table still presented **8 tasks / ~1,240 LOC** as the current budget while the table above it read 1,580. Rebuilt as a three-step history.

**Backward.** The only document referencing the changed sections is the sibling proposal; it was updated (`NEW-4`, `DD-14` inheritance note). No other file in `docs/` references this spec path. Budget arithmetic independently re-derived: 240+350+50+30+60+320+530 = **1,580** ✓. No broken markdown tables in either document (F-7 class check, automated).

---

## Lineage 2 — Round 2 scoped re-judgment (2026-09-14)

Same two judges, same model separation, narrow scope: verify the six round-1 corrections and hunt **fix-caused** defects.

| | A | B |
| --- | --- | --- |
| Verdict | 4 SEVERE / 6 WARNING / 3 SUGGESTION | 1 SEVERE / 5 WARNING / 5 SUGGESTION |

**Verified clean by both:** **M-3** (input predicate swept to all eight sites; the two multi-row scenarios are complementary, not contradictory), the **28-gate count** (both counted rows independently), and the **budget arithmetic** (240+350+50+30+60+320+530 = 1,580; 1,240 + 340 = 1,580). **M-1**'s and **M-2**'s *mechanisms* were verified correct by both — `MIN(sec_user_role_id)` is chunk-safe because the read chunks by `user_id`, so all of a user's role rows land in one chunk. **M-6**'s mechanism verified correct by both, against the real source.

### Confirmed — both judges

| # | Finding | A | B |
| --- | --- | --- | --- |
| **N-1** | **Two gates in §10 demand opposite outcomes for the same input.** `:550` still mandates *"assert the **transaction** rolls back"*; `:561` mandates *"refresh and reactivation **still committed**"*. M-5 scoped the rollback in AC.4, AC.5, the scenario, DD-15, §5.4 and §2.1 — **and not in §10**, whose table round 1 re-counted (22 → 28) without re-reading. A fixture written to `:550` reddens against correct code, and the natural "fix" reintroduces M-5 | SEVERE | WARNING |
| **N-2** | **`DD-14`'s "lowest carnet wins" is both undefined and wrong.** `resourceId` is a `string`, so `'10' < '9'` lexicographically and `9 < 10` numerically — no ordering is named. And in DD-14's own motivating case (a rehire with a new employee id) lowest-wins picks the **retired** record. A's failing input: a 2019 payload row and a current one share an email; the stale row wins and **overwrites the live account's `first_name`/`last_name`**, every run, identically | SEVERE | WARNING |
| **N-3** | **`design.md` specifies two incompatible orders for collapse vs. pre-write validation.** §2.1's tree says validate → collapse; §5.2 says collapse → validate. With null emails the two orders produce different `skippedUnusableEmail` counts, and `NFR-AGS-003`'s gate demands *"the right counts"* with no single right answer. B's second input: an over-length carnet wins the collapse under §5.2's order, is then skipped, and **nobody is provisioned** | WARNING (via RA-8) | SEVERE |
| **N-6** | **M-6's retired claim survives in `requirements.md` §10** — *"The value set is unknown **and unread**."* The round-1 sweep searched the string `nothing in src/ reads`; this residue states the same proposition in different words. **Third recurrence of the F-12 class** (*"the sweep matched exact phrases, not stems"*), inside the round that recorded it | WARNING | WARNING |
| **N-7** | **M-6's new evidence path does not exist.** `design.md` cites `.../complementary-entities/alliance-user-staff/repositories/...`; the file is at `.../entities/alliance-user-staff/repository/...` — wrong on two segments. A correction that exists *because* three parties looked in the wrong place now sends the fourth to a wrong place | WARNING | WARNING |
| **N-8** | **M-4's §5.3 classification row was never added**, though the round-1 delta claims it was. A collapsed loser belongs to none of Skipped/Create/Refresh/Reactivate/Untouched, while `NFR-AGS-003` requires them counted | WARNING | SUGG |
| **N-9** | **The transaction's isolation level is stated nowhere**, so DD-15's *"reachable in ordinary operation"* is order- and isolation-dependent. A grepped all of `src/`: every transaction is `dataSource.transaction(…)` with no isolation argument, so the run is InnoDB default **REPEATABLE READ** — under which the concurrent row may be invisible to the re-select entirely. Lineage-1 **W-9**, now load-bearing for a decision of record | WARNING | SUGG |
| **N-10** | **DD-5 was never amended for DD-15.** It still reads *"Partial application of either is worse than no run"* with *"per-operation commits — rejected"* as its alternative, while DD-15 deliberately commits a partial run. The two **are** reconcilable — DD-5's account-level atomicity survives — but that reconciliation lives only in DD-15 | SUGG | SUGG |

### Confirmed by direct verification — one judge raised, author verified against source

| # | Finding |
| --- | --- |
| **N-4** *(A, SEVERE)* | **M-2 deleted the `role_id` SQL guard that four sites still promise.** The specified branch-(b) statement is `UPDATE … WHERE sec_user_role_id IN (…)` — **no `role_id` predicate, no `is_active` predicate** — while §3, §8, DD-13 and §5.4's own trailing clause all assert `role_id = 3` is pinned in SQL. **Verified by reading the text.** Failing input: an id-list builder that groups by `user_id` before filtering to role 3 emits `MIN = 700` over a `role_id = 1` row and **restores SYSTEM_ADMIN**; the existing gate's falsifier (*"reactivate all role rows"*) a correct builder already passes. **This is lineage-1 B-12 made materially worse by the correction meant to harden the statement.** |
| **N-5** *(A, SEVERE)* | **DD-15's guarantee — *"an account is never created without its role"* — is false in the exact collision DD-15 is written for.** Verified against `result.repository.ts:593-617`: `createUserInSecUsers` issues **one** `INSERT INTO sec_users` and **no** `sec_user_roles` insert. After `ROLLBACK TO create_grant` the foreign row survives, active and roleless. Next run: its email matches an **active** row → §5.2 step 4 → *refresh*, never create — and `R-AGS-004` AC.2 forbids granting a role to a pre-existing account *"whatever roles it holds or lacks"*. **The person holds a permanent, roleless account that no run repairs and no summary reports.** Also falsifies NFR-AGS-001's literal wording: N=1 creates nobody, N=2 creates everybody |

### Suspect — one judge, not verified by the other

| # | Finding | Judge |
| --- | --- | --- |
| **RB-3** | **The M-5 gate cannot go red as written.** *"Seed a concurrent same-carnet row"* reads as pre-seeding — but the bulk read precedes the transaction, so it **sees** that row, classifies the member *refresh*, no insert happens, and the assertion never runs. The gate stays green under a whole-transaction-rollback implementation too. Exactly the "gate that cannot fail" class this spec has produced twice before | B |
| **RA-7** | **M-1 never reached DD-7**, the decision of record for the whole re-select mechanism — the **R-1** shape the ledger has already paid for twice. Plus an unstated fix-caused effect: moving `runStart` to the transaction's first statement **widens** the `created_at >= runStart` bracket across the entire refresh and reactivate phase, making M-5's abort strictly *more* reachable | A |
| **RA-9** | **`R-AGS-007` AC.2 is unsatisfiable for a user holding two pre-existing *active* role-3 rows**, and branch (a) (*"no statement is issued"*) guarantees it stays that way — while reducing them would need an `is_active = 0` write, which **NG-6** forbids outright | A |
| **RA-10** | **After a savepoint rollback, `created` and `rolesGranted` are undefined** on the run's only feedback channel. NFR-AGS-003's gate demands "the right counts" with no defined right answer; an implementer reports `created = 47` for a run that created nobody | A |
| **RB-9** | `SELECT NOW(6)` returned through mysql2 becomes a **JS `Date`** (millisecond precision) unless `dateStrings` is set, so `runStart` round-trips through the Node type the design says it never uses. Truncation is downward so the `>=` predicate survives — the guarantee is wrong, not the behaviour | B |
| **RB-6b** | DD-14's winner rule, even corrected, writes the **older** employee id into `sec_users.carnet`, which `R-AGS-002` then makes permanent — defeating ASM-3's stated purpose for keeping carnet at all | B |
| **RA-13** | M-6's OpenSearch alternative reached §11 and OQ-8 but **not** `design.md` §10, which still offers only the Dev MySQL query | A |
| **RA-12** | §14 still says *"One review round is already spent"*; two are. `R-AGS-007`'s **AC.8 sits between AC.1 and AC.2** | A |
| **RB-10** | Reactivation branch (c)'s INSERT increments neither `rolesReactivated` (a flip) nor, by §9's definition, `rolesGranted` (*"the provisioning path"*) — the counter is unassigned | B |

### The pattern — and it is the sharpest signal in either lineage

**Three of the five severe-class findings are defects the round-1 corrections introduced**, and one is a *regression of a finding the same round was told about*:

| Correction | What it broke |
| --- | --- |
| **M-2** — written to harden the role UPDATE | **Removed** the `role_id` predicate from it (N-4), making lineage-1's B-12 worse |
| **M-4 / DD-14** — written to stop duplicate accounts | Reintroduced **"lowest id wins"** (N-2) — the exact heuristic **M-3 had just corrected away** in `sec_users`' tie-break, one table over. J-3's lesson, relearned in the same round it was applied |
| **M-5 / DD-15** — written to bound a rollback | Created a **permanently roleless account** its own rationale claims is impossible (N-5) |

**And the sweep failed a third time in the same class.** Round 1's forward sweep searched `nothing in src/ reads`; the residue said **"unread"** (N-6). The ledger recorded *"the sweep matched exact phrases, not stems"* as lineage-1's lesson, in this very file, and the next sweep matched exact phrases.

---

## Lineage 2 — Round 2 correction delta (applied 2026-09-14) — FINAL, UNAUDITED

User authorised **"fix and escalate the rest"**. Four user rulings arrived with that instruction and closed three open questions outright.

### The four rulings

| # | Ruling | What it closed |
| --- | --- | --- |
| 1 | **"El primero que llega es el primero que se guarda"** — first arrival wins the email collapse | `OQ-D5`, and **N-2 entirely**: first-arrival needs no comparator, so neither of N-2's objections (undefined string ordering; lowest-picks-the-retired-record) has a target |
| 2 | **A roleless active account is NOT touched** — those are normally externals on a different flow; staff are created *with* the role | `OQ-D6`. **N-5's orphan is reported, never repaired**; `R-AGS-004` AC.2 stands unqualified. New `RSK-10` |
| 3 | **Staff users are governed by the staff list.** Only externals are genuinely suspended, and externals never appear in an Alliance staff payload | `OQ-7` — and **downgrades RSK-8 from "needs a ruling" to "accepted — out of model"**. This was the largest open risk in the spec |
| 4 | **The `status` pre-flight could not be run** — no database access (VPN) | `OQ-8` stays open as an **owed pre-flight**, blocking *trust in a first Prod run*, not implementation |

### Findings applied

| ID | Applied |
| --- | --- |
| **N-1** | §10's three contradictory gates rewritten to *"rollback to `create_grant`, refreshes intact"*; `design.md`'s "roll back every run" scoped to the create sub-batch |
| **N-2** | Winner rule replaced by **first arrival wins**, with the two accepted consequences stated (per-run determinism only; a stored carnet does not override arrival order) |
| **N-3** | Order fixed as **validate → index → collapse**, in both §2.1 and §5.2, with the reason stated in place |
| **N-4** | `AND role_id = 3 AND is_active = 0` restored to branch (b)'s `WHERE`; `MIN(sec_user_role_id)` scoped **among that user's role-3 rows**; insert's `role_id` made a literal. **New gate** seeding a `role_id = 1` row |
| **N-5** | DD-15's guarantee narrowed to *"no account **this spec creates**"*; orphan reported as `accountsWithoutRole` per ruling 2 |
| **N-6** | The `"unread"` residue removed from §10; RSK-9's row title changed from *"never examined"* to *"never branched on"* |
| **N-7** | Evidence path corrected to `src/domain/entities/alliance-user-staff/repository/...` |
| **N-8** | §5.3 gained its **Collapsed** row |
| **N-9 / OQ-D7** | Isolation stated as **REPEATABLE READ** (platform default) and recorded as **non-blocking** — the assertion fires less often than DD-15's prose implies, which is safe in the direction that matters. Bulk-read placement pinned as load-bearing |
| **N-10** | DD-5 amended: *"atomicity is per account, not per run — see DD-15"* |
| **RA-7** | Ordering added to **DD-7**, the decision of record, with the widened-window consequence stated |
| **RA-9** | `R-AGS-007` AC.3 scoped — two pre-existing **active** role-3 rows stay two; reducing them needs an `is_active = 0` write that **NG-6** forbids |
| **RA-10** | `created = 0` / `rolesGranted = 0` defined after a savepoint rollback; `createsDiscarded` added |
| **RA-12** | Round counter corrected; `R-AGS-007`'s ACs renumbered in order |
| **RA-13** | The OpenSearch aggregation added to `design.md` §10 |
| **RB-3** | Both F-3 gates and the M-5 gate given a **different-email** trigger — same-email is classified *refresh*, no insert happens, and the assertion never runs |
| **RB-9** | `runStart` kept server-side as `@run_start`, never round-tripped |
| **RB-10** | `rolesGrantedOnReactivation` added for branch (c) |

**Also:** gate table **28 → 30** (counted); `R-AGS-007` ACs renumbered 1–8; `RSK-10` added; `payloadEmailCollisions`, `accountsWithoutRole`, `createsDiscarded`, `rolesGrantedOnReactivation` added to the summary contract.

**Not fixed, recorded:** **M-10** (§14's itemization double-counts C-3 and its "five new gates" derivation never reconciled — the *totals* are independently verified), **A-8** (DD-12's *"only column"* rationale is false against the schema; the **ruling** stands, its justification does not), **B-10** (§8 cites an audit path that does not exist for raw SQL — `createUserInSecUsers` sets no `created_by`, and the detached run has no `request.user`), **B-11**, **A-6**, **A-7**, **RB-6b**, **RB-7**.

### Closure sweep

**Forward — zero live occurrences:** `lowest carnet wins` (survives only in its own retirement note), `and unread`, `never examined`, `needs a ruling`, `escalated to the user`, `28 gates`, `complementary-entities/alliance-user-staff`, and the unguarded `WHERE sec_user_role_id IN (…)`. The branch-(b) statement now greps as carrying `AND role_id = 3 AND is_active = 0`.

**Backward:** no document outside this folder references the changed sections; the sibling proposal was updated in round 1 and its `NEW-4` still holds under the first-arrival rule. Gate count re-counted (30), budget arithmetic re-derived (1,580), no broken tables in any of the three documents, all nine requirements carry task coverage.

---

# TERMINAL RECEIPT — LINEAGE 2

| Field | Value |
| --- | --- |
| Target | `requirements.md` + `design.md`, `docs/specs/changes/agresso-staff-sec-users-sync` |
| Mode | `judgment_day` — blind dual review, different model families, fresh lineage post-split |
| Rounds | **2 of 2 fix rounds used · 2 of 2 scoped re-judgments used — lineage complete** |
| Round 1 | 4 confirmed SEVERE + 1 suspect + 1 contradiction-resolved · **6 fixed** |
| Round 2 | 6 confirmed + 2 verified-by-author + 9 suspects · **18 fixed** |
| Contradictions between judges | **1**, resolved by direct verification rather than escalation (the `status` field) |

## `JUDGMENT: APPROVED ✅ — with one stated caveat`

Every finding **confirmed by both judges** across both rounds is closed, as is every severe-class finding raised by one judge and verified by the author against source. The four user rulings closed the three questions that blocked implementation and downgraded the spec's largest open risk.

> ### ⚠️ The caveat, stated rather than buried
>
> **This final correction round was not re-judged** — the lineage's two re-judgments were spent. Eighteen
> edits, including the restored `role_id` guard and the first-arrival collapse rule, carry **no
> independent audit**. That is the protocol working as designed, not a gap in it, but it is a real
> difference from the round-1 fixes, which were audited and found to contain three fix-caused severes.
>
> The mitigation is **T-09**: every one of the 30 gates must be observed **failing** before it is cited
> (K-004), and the two gates most likely to be wrong — the F-3 and M-5 triggers — carry their required
> shape in the task text.

### What the five rounds across two lineages actually bought

| | |
| --- | --- |
| **The spec was split** | Because the evidence said so: 0 severe findings in the additive half, all of them in the destructive half, across three passes |
| **Four mass-failure modes closed** | An empty payload deactivating everyone (J-1); a live account locked out by a tie-break (J-3); a duplicate factory (J-4); a guard that made every run roll back (M-1) |
| **Three fix-caused severes caught** | Each introduced by a correction: M-2 removed the guard it was written to harden; DD-14 reintroduced *"lowest id wins"* one table over from where M-3 had just retired it; DD-15 created the orphan its own rationale called impossible |
| **The recurring lesson** | A correction is applied when the superseded claim is gone from **everywhere it lived** — and a sweep matching exact phrases is not that sweep. Three occurrences, in three consecutive rounds, including one inside the round that recorded the lesson |
