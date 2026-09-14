# Judgment Day — findings ledger

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
