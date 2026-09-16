# Requirements — Agresso / Staff Deactivation · **Increment 1: Measurement**

- **Module:** agresso
- **Spec id:** 2026-09-agresso-staff-deactivation-i1
- **Status:** implemented (increment 1) · PAUSED
- **Owner:** ARI server squad
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §G4, §US-SA-2
- **Last updated:** 2026-09-16
- **Depth:** **Standard** — read-only; the Full-depth destructive half is increment 2
- **Extends:** [`changes/agresso-staff-sec-users-sync`](../../archive/2026-09-15-changes--agresso-staff-sec-users-sync/) (archived, shipped)
- **Judgment:** [`judgment.md`](./judgment.md) — round 1, 4 confirmed SEVERE. This document carries the corrections for JD-1…JD-4


> ⏸️ **PAUSED 2026-09-16 (priority change). Read [`HANDOFF.md`](./HANDOFF.md) first.**
> Increment 1 is code-complete, green and committed — but **has never been run**, so the four
> measurements it exists to produce do not exist yet. Increment 2 is unstarted and undated.

---

> ## ⚠️ This increment MEASURES the problem. It does not solve it.
>
> After this ships, **a departed employee still keeps their account, their roles and their machine
> credentials.** Nothing is deactivated. The stated problem remains open until **increment 2**, which
> is where the destructive writes live.
>
> This is recorded as a requirement-level warning, not a footnote, because the failure mode of a
> measurement-only increment is that it is declared "done" and the loop is never closed.
> **Increment 2 needs a date before this one ships.**

---

## Executive summary

The Agresso staff sync provisions, refreshes and reactivates platform accounts. Nobody is ever retired.

Before anything can be retired safely, four numbers have to stop being guesses: **how many accounts
would be deactivated, whether `user_status` can identify an external user at all, how large the
population absent from a `?status=active` payload really is, and whether the payload arrives intact.**
Every threshold in the destructive design was invented against those unknowns.

This increment computes the full deactivation set and **reports it**, writing nothing. It is rollout
step 3 of the destructive design, delivered as its own shippable unit, so that increment 2 is designed
against measurements instead of assumptions.

**Invariant, absolute for this increment: no `UPDATE`, no `INSERT`, no `DELETE`.** The pass has no
write path at all — not a transaction that rolls back, not a guarded write. A requirement that
modifies a row is in the wrong document.

---

## 1. Context

`cloneAllAgressoStaff` fetches the Agresso employee list page by page and reconciles every member
against `sec_users` by `lower(trim(email))`. What it never computes is the complement: the active
accounts that matched nobody.

**What is NOT changing:** the matching pass, the email index, the collapse rule, `findUserByEmail`,
the trigger endpoint's shape, and — for this increment — every row in every table.

**Affected surface, by what the run touches** *(KZ-002)*: the staff sync service, the reconciler
service (two small extractions), one new read-only service, one new read-only repository, and the run
summary DTO.

**Deliberately absent from this increment** *(and each removal deletes a defect class the judgment
round found)*: the write transaction, the three-table cascade, `app_config` keys, the seeding
migration, and the dry-run flag — the whole increment is the dry run, so there is no flag to forget.

---

## 2. Requirement numbering

`R-AGD-<NNN>` / `NFR-AGD-<NNN>`. Ids are **continuous with increment 2** — the numbers this document
does not use (`R-AGD-006`, `R-AGD-007`) are reserved for the destructive requirements, so no id ever
means two things across the two increments.

---

## 3. Functional requirements

### R-AGD-001 — The deactivation set is computed from the matching pass, never re-derived

- **As a** platform administrator
- **I want** the candidate set to be exactly the active accounts the payload matched nobody against
- **So that** one matching rule governs both provisioning and retirement

**Details:**
- Inputs: the reconciliation output plus the `sec_users` snapshot it already read.
- Behavior:
  - Candidates SHALL be every `sec_users` row with `is_active = 1` whose `sec_user_id` is not the chosen row of any matched staff member, minus the shields (R-AGD-002) and exclusions (R-AGD-003).
  - Matching SHALL reuse the sibling's index and normalization. **No second index, no second normalization, no second tie-break.**
- Outputs: a reported set. **No write.**

**Acceptance criteria:**
- [ ] AC.1 — An active row whose normalized email equals a matched member's normalized email is absent from the set.
- [ ] AC.2 — An active row whose normalized email equals no payload email is present, subject to R-AGD-002/003.
- [ ] AC.3 — An **inactive** row is never a candidate.
- [ ] AC.4 — Normalization is byte-identical to the sibling's — enforced by both calling one shared function (design `DD-D5`).

#### Scenario: An account nobody on the staff list claims

- GIVEN an active row `{id: 700, email: 'Gone.Person@cgiar.org'}`
- AND no payload member normalizing to `gone.person@cgiar.org`
- WHEN the pass runs and every precondition passes
- THEN row 700 is reported as a deactivation candidate
- AND IT MUST be selected by normalized-email comparison, never by carnet
- BUT it must NOT be written to, in any table, under any circumstance

---

### R-AGD-002 — Every payload member shields an account, and the shield is keyed on what matching actually compares

> **Corrected after Judgment Day `JD-3`/`JD-4` (both judges, independently).** The previous version
> dissolved the `UNUSABLE_EMAIL` form with an argument that **substituted the raw payload string for
> the match key**. They are different strings: `isUsableEmail` measures `email.length` *untrimmed*,
> while the key is `email.trim().toLowerCase()`. A padded address — what a fixed-width ERP export
> produces for **every member at once** — is skipped, never indexed, shields nothing, and its account
> is retired. This is a **predicate/key mismatch**, not a pipeline stage, which is why three
> adversarial passes on the parent spec never reached it.

**Details:**
- Behavior:
  - `shieldKeys` SHALL be built from the **raw payload**, before validation and before the collapse, as: for each member, if `email` is non-null and `email.trim()` is non-empty, add `normalizeEmail(email)`.
  - The shield predicate SHALL be **that predicate and never `isUsableEmail`**, because `isUsableEmail` measures a different string than the key it would be gating.
  - The null guard SHALL precede `trim()`, since `normalizeEmail` has none.
  - A skipped member and a collapsed member both shield. Skipping a *write* is not a declaration that the person is absent.

**Acceptance criteria:**
- [ ] AC.1 — A member skipped `CARNET_TOO_LONG` with a usable email shields the account at that key.
- [ ] AC.2 — **A member whose RAW email exceeds 150 characters but whose TRIMMED email equals a stored row's email shields that row.** *(The `JD-3` case. This AC is satisfied only by an executed test over that input, never by an argument.)*
- [ ] AC.3 — A collapsed loser's key is shielded.
- [ ] AC.4 — A member arriving with `email: null` is skipped without throwing, and the pass completes.
- [ ] AC.5 — `shieldKeys` is derived before `validate()` and before the collapse loop.

#### Scenario: A padded email does not retire a live employee *(JD-3)*

- GIVEN a payload member `{resourceId: 'A1234', email: 'maria.gomez@cgiar.org' + 140 spaces}` — raw length 161
- AND an active row `{id: 812, email: 'maria.gomez@cgiar.org'}`
- WHEN the pass runs and the member is skipped as `UNUSABLE_EMAIL`
- THEN row 812 is **not** a deactivation candidate
- AND IT MUST be shielded because its key is derived from the trimmed value
- BUT it must NOT be shielded by `isUsableEmail`, which would reject the member and shield nothing

#### Scenario: A bad carnet does not cost a real employee their account *(F-8)*

- GIVEN a member `{resourceId: 'ABCDEFGHIJK'}` (11 chars) with `email: 'real.person@cgiar.org'`
- AND an active row `{id: 800}` at that email
- WHEN the pass runs and the member is skipped as `CARNET_TOO_LONG`
- THEN row 800 is not a candidate
- AND IT MUST be reported as shielded-by-skip **with the account id and the skip reason**, so the data problem stays visible

---

### R-AGD-003 — Four exclusions shield individual accounts

| # | Rule |
| --- | --- |
| **EX-1** | `status_id` equals the external status, resolved by name (C-4). Never a literal |
| **EX-2** | The account holds an **active** `sec_user_roles` row with `role_id = 1`. Active rows only, so an ex-admin is not shielded |
| **EX-3** | The account's email key maps to **more than one active** `sec_users` row |
| **EX-4** | The account's own normalized email key is **empty** — it can be matched by nothing, so its absence carries no information |

**Scope, stated because the judgment round found it ambiguous** *(`JD-7`)*: EX-3 is evaluated over the
**candidate set after shield removal**, never over the full index. A key present in the payload is
already shielded by R-AGD-002, so EX-3's only reachable population is keys **absent** from the payload
— exactly the rows that would otherwise be retired together. Both rows of such a pair are candidates,
so "every row under the key" and "both rows are counted" agree; the previous contradiction came from
evaluating EX-3 over the index, where one row could be a matched non-candidate.

**Acceptance criteria:**
- [ ] AC.1 — An unmatched account at the external status is not a candidate; counted `excludedExternal`.
- [ ] AC.2 — An unmatched account with an active `role_id = 1` row is not a candidate; counted `excludedSystemAdmin`.
- [ ] AC.3 — An unmatched key mapping to two **active** rows excludes both; both counted `excludedAmbiguous`.
- [ ] AC.4 — An unmatched key mapping to one active and one **inactive** row: the active row **is** a candidate; the inactive row is never one *(closes `F-10`)*.
- [ ] AC.5 — An account holding only an **inactive** `role_id = 1` row **is** a candidate.
- [ ] AC.6 — An account whose own email is empty or whitespace is not a candidate; counted `excludedUnmatchable`.

#### Scenario: An already-inactive duplicate does not shield its live twin forever

- GIVEN rows `{id: 10, is_active: 0}` and `{id: 11, is_active: 1}` sharing `twin@cgiar.org`
- AND no payload member with that email
- WHEN the pass runs
- THEN row 11 is reported as a candidate
- AND IT MUST NOT be counted `excludedAmbiguous` — ambiguity counts active rows only
- BUT it must NOT report row 10 as a candidate

---

### R-AGD-004 — Three preconditions mark the payload untrustworthy and withhold the candidate set

> In this increment a precondition does not prevent a write — there are none. It prevents a **wrong
> number reaching a human decision**, which is the only control this increment has.

| # | Precondition | Defends against |
| --- | --- | --- |
| **C-1** | `totalElements > 0` | An empty payload, under which every account is unmatched (`J-1`) |
| **C-2** | **Distinct non-empty carnets in the payload `>=` `totalElements`**, and no page except the last returned zero rows | A failed page, and pagination instability where a repeat masks an omission |
| **C-4** | The external status resolves to **exactly one** `user_status` row by name, counting active, non-deleted rows only | `user_status` semantics are unknown to this repository |

**Acceptance criteria:**
- [ ] AC.1 — `totalElements = 0` reports `abortReason = C-1` and no candidate set.
- [ ] AC.2 — A non-final page returning zero rows reports `abortReason = C-2`, **naming the page number**.
- [ ] AC.3 — `distinctCarnets < totalElements` reports `abortReason = C-2` **and lists the duplicated carnets**.
- [ ] AC.4 — A **final** page returning zero rows does **not** abort *(closes `JS-5`)*.
- [ ] AC.5 — Zero or more than one matching `user_status` row reports `abortReason = C-4`.
- [ ] AC.6 — An aborted run reports every count it computed, and **no candidate set**.

> ### C-2 is corrected, and its trade is stated rather than discovered later
>
> **What was wrong** *(`JD-1`, `JD-2`, both judges)*: the previous version compared `allStaff.length`
> — a count of **fetched rows** — against `totalElements`, a count of **distinct records**. Under
> unstable pagination a duplicate inflates the count by exactly what an omission deflates it, so the
> two cancel. That is `S-1`, which the parent lineage closed in round 1 by counting distinct carnets
> and which the correction demoted to a `warn`. A `driftTolerance` of 5 compounded it: the direction
> it claimed to absorb — a mid-run hire — produces a **surplus**, which never aborts, so its only
> reachable effect was a per-run budget of five wrongly retired people.
>
> **The trade this correction makes, stated outright** *(the omission the parent recorded against
> `R-4`)*: with distinct counting and **no tolerance**, a payload containing a genuinely duplicated
> carnet aborts **every run, forever**. That is accepted here for three reasons: `resourceId` is the
> ERP employee identifier and a stable export should not repeat it; the abort **names the duplicated
> carnets**, so it is diagnosable rather than silent; and **this increment is the safe place to find
> out** — an abort costs a re-trigger, while the same condition in increment 2 would cost accounts.
>
> **Comparison is one-sided.** A surplus never aborts: more members means fewer candidates, which is
> always the safe direction.

#### Scenario: A repeated page does not hide the people it omitted *(JD-1)*

- GIVEN `totalElements = 2000` across two pages
- AND page 2 repeats 5 carnets from page 1 and omits 5 other employees
- WHEN the pass runs
- THEN it reports `abortReason = C-2` and no candidate set
- AND IT MUST be detected because **1995 distinct carnets < 2000**, not because a count of rows differed
- BUT it must NOT pass merely because `allStaff.length` equals `totalElements`

#### Scenario: A short final page is normal, not a failure *(JS-5)*

- GIVEN `totalElements = 2001` over 3 pages, the last holding one row
- AND one employee departs between the count call and the final fetch, so page 3 returns `[]`
- WHEN the pass runs
- THEN C-2's empty-page clause does **not** fire
- BUT C-2's distinct-carnet clause **does** fire, because 2000 < 2001
- AND IT MUST report the shortfall rather than the empty page, so the operator sees the real cause

---

### R-AGD-005 — The run reports one complete, inspectable summary on every path

**Details:** the existing `SecUserReconciliationSummaryDto` is extended. **`abortReason` is not
reused** — the sibling already owns that field for `'GRANT_ASSERTION'`, and one field cannot carry two
independent outcomes *(`JS-4`)*. This increment reports `deactivationAbortReason`.

**Acceptance criteria:**
- [ ] AC.1 — The summary carries: `deactivationDryRun` (always `true`), `activePopulation`, `deactivationCandidates` (count), `candidateSample`, `excludedExternal`, `excludedSystemAdmin`, `excludedAmbiguous`, `excludedUnmatchable`, `shieldedBySkip`, `distinctCarnets`, `totalElements`, `deactivationAbortReason`, `abortDetail`.
- [ ] AC.2 — `abortDetail` carries the operand the abort names: the page number for the empty-page clause, the duplicated carnets for the distinct clause, the matched row count for C-4 *(`JS-7`)*.
- [ ] AC.3 — `deactivationAbortReason` is **absent**, not null, on a successful run.
- [ ] AC.4 — `shieldedBySkip` carries account id **and** skip reason per entry, not a bare count.
- [ ] AC.5 — The sibling's `abortReason` is untouched and independently readable.

#### Scenario: An operator can tell which page failed

- GIVEN a run aborting on C-2's empty-page clause at page 2
- WHEN the summary is returned and logged
- THEN it carries `deactivationAbortReason = 'C-2'` and `abortDetail` naming page 2
- AND IT MUST be logged at `error`
- BUT it must NOT report a candidate count without an abort reason, which would read as a healthy run

---

## 4. Non-functional requirements

### NFR-AGD-001 — Bounded database work
- **Category:** performance
- **Target:** no per-account round trip; the `sec_users` read is the sibling's existing one; role reads are chunked at the module's `CHUNK = 50`. `O(⌈n/50⌉)`, not `O(n)`.
- **How verified:** query-count assertion, proven red by removing chunking.

### NFR-AGD-002 — The increment cannot write
- **Category:** reliability / security
- **Target:** the deactivation service and repository contain **no** `UPDATE`, `INSERT` or `DELETE`, and open no transaction.
- **How verified:** a test asserting the repository's SQL surface is read-only, plus a fixture-tier assertion of **zero row deltas** across `sec_users`, `sec_user_roles` and `app_secrets` after a full run. Proven red by adding one write.

### NFR-AGD-003 — Authorization is inherited
- **Category:** security
- **Target:** no new endpoint. Runs inside `cloneAllAgressoStaff`, behind `@Roles(SecRolesEnum.SYSTEM_ADMIN)`.

### NFR-AGD-004 — Raw reads coerce driver types before branching
- **Category:** reliability
- **Target:** every raw-SQL column used in a branch is coerced — `Boolean(...)` for `is_active`, `Number(...)` for `bigint` ids and `status_id` *(`JG-3`)*.
- **Rationale:** `Repository.query` returns the raw mysql2 result with no hydration and no `typeCast`; `tinyint` arrives as `0`/`1` and is typed `boolean`. This produced a Reviewer FAIL in the sibling.
- **How verified:** a regression test per read, proven red by reverting the coercion.

### NFR-AGD-005 — No REQUEST-scoped provider enters this path
- **Category:** reliability
- **Target:** neither new class injects `AppConfigService`, `CurrentUserUtil`, `AppSecretRepository`, or anything that transitively carries `Scope.REQUEST`.
- **Rationale** *(`JD-5`)*: `AppConfigService` injects `CurrentUserUtil` (`Scope.REQUEST`), and Nest bubbles scope up to the fire-and-forget controller. The repository already forbids this in writing (`mapping-phase.resolver.ts:11-15`). This increment needs no config at all, which is the cheapest way to comply.
- **How verified:** constructor inspection in a unit test; the module compiles with both providers as singletons.

---

## 5. Data requirements

**None.** No schema change, no migration, no seed, no `app_config` key, and **no row of any table is
modified**. `sec_users`, `sec_user_roles`, `user_status` and `alliance_user_staff` are read; nothing
is written.

> Config keys, their migration and the ceiling `C-3` all move to **increment 2**, where a threshold
> has something to gate. Deferring them removes `F-2`, `JD-5`, `JD-6` and the `K-015`
> pipeline-does-not-apply-migrations hazard from this increment entirely.

---

## 6. API surface delta

**None.** `GET /api/agresso/staff/clone/execute` returns a richer body inside `ServerResponseDto`.

> The reachable path carries **no `/v1`** — the handler declares no `@Version(...)`. Anything written against `/api/v1/agresso/...` will 404.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| **AGRESSO** | Read only. One **fewer** HTTP request on ~half of runs (design `DD-D2`) |
| **STAR / `app_secrets` consumers** | **None.** Nothing is deactivated |

---

## 8. Assumptions, dependencies, risks

| # | Assumption | If wrong |
| --- | --- | --- |
| ASM-1 | Absence from the `?status=active` payload is the right signal *(user ruling 2026-09-15)* | This increment **measures** the consequence before anyone acts on it |
| ASM-2 | `resourceId` is a stable, non-repeating employee identifier | C-2 aborts and names the duplicates — diagnosable, and harmless here |

| # | Risk | Mitigation |
| --- | --- | --- |
| RSK-1 | **The problem stays unsolved when this ships** | Stated at the top as a requirement-level warning; increment 2 dated before this ships |
| RSK-2 | **`JS-1` — C-4 proves a row named "External" exists, not that external accounts point to it.** The only in-repo code inserting `sec_users` writes literal `status_id = 1`, and the column is nullable | **Converted from risk to data by this increment.** If `excludedExternal` reports 0 against known externals, EX-1 discriminates nothing — learned before a single row is written. No automated gate; the dry-run read is the control |
| RSK-3 | An operator reads the report as authority rather than as a measurement | Aborted runs withhold the candidate set entirely (AC.6) |
| RSK-4 | `RSK-6` — `validation()` returns `isValid` with an unresolved user | Untouched here; increment 2's cascade closes it for retired users. Deserves its own bugfix spec |

---

## 9. Open questions

| # | Question | Status |
| --- | --- | --- |
| OQ-1 | Does `user_status` contain a row identifying external users? | **This increment answers it.** C-4 reports the match count |
| OQ-2 | Is `0.05 / 10` a sensible ceiling? | **This increment produces the number to decide on.** Deferred to increment 2 |
| OQ-3 | How large is the population absent due to `?status=active`? | **This increment measures it directly** |

---

## 10. Verification reality and defect-class mapping

| # | Defect class | Gate | Red input |
| --- | --- | --- | --- |
| D-1 | **A wrong candidate set misleads the human decision** | Unit tests per shield and exclusion rule + fixture tier. **Partial** — see the gap below | Remove a rule |
| D-2 | `JD-3`'s predicate/key mismatch | R-AGD-002 AC.2, an executed test over the padded-email input | Swap the predicate to `isUsableEmail` |
| D-3 | `JD-1`'s row-vs-distinct count | R-AGD-004 AC.3 over the repeat-and-omit payload | Compare `allStaff.length` instead |
| D-4 | A precondition that cannot fire | One test per clause, **each observed red before it is trusted** *(`K-004`)* | By construction |
| D-5 | Driver-type coercion | Regression test per raw read | Revert the coercion |
| D-6 | **This increment writes something** | NFR-AGD-002's zero-row-delta fixture | Add one `UPDATE` |
| D-7 | REQUEST-scope cascade | NFR-AGD-005 constructor test | Inject `AppConfigService` |

**Classes with no automated gate:**

| Gap | Substitute |
| --- | --- |
| Whether the reported set is the *correct* set against real Dev data | **A human reads the report.** That is this increment's entire purpose, and it is the accepted risk |
| Whether `status_id` actually identifies externals (`RSK-2`) | The reported `excludedExternal` count, compared against known externals by a human |

**What these gates structurally cannot inspect** *(KZ-017)*: `npm test` has `rootDir: src` and **never
executes `test/fixtures/`**, so no `npm test` result is evidence for any database-state claim here.
Fixture-tier claims need `npm run test:fixtures`, single worker, against the scratch schema — which
says nothing about real `sec_users` composition.

---

## 11. Requirement ID index

| ID | Title |
| --- | --- |
| R-AGD-001 | The deactivation set is computed from the matching pass, never re-derived |
| R-AGD-002 | Every payload member shields an account, keyed on what matching actually compares |
| R-AGD-003 | Four exclusions shield individual accounts |
| R-AGD-004 | Three preconditions mark the payload untrustworthy and withhold the candidate set |
| R-AGD-005 | The run reports one complete, inspectable summary on every path |
| *R-AGD-006/007* | *Reserved — increment 2 (the cascade, the write transaction)* |
| NFR-AGD-001 | Bounded database work |
| NFR-AGD-002 | The increment cannot write |
| NFR-AGD-003 | Authorization is inherited |
| NFR-AGD-004 | Raw reads coerce driver types before branching |
| NFR-AGD-005 | No REQUEST-scoped provider enters this path |

---

## 12. Judgment disposition — increment 1

| Finding | Disposition |
| --- | --- |
| **JD-1** | **Fixed.** C-2 counts distinct carnets; the row count is gone |
| **JD-2** | **Fixed.** `driftTolerance` removed; the trade is stated in R-AGD-004 |
| **JD-3** | **Fixed.** Shield predicate keyed on the trimmed value, never `isUsableEmail`; AC.2 is an executed test |
| **JD-4** | **Fixed.** AC.2 replaced by a behavioural criterion with a named red input |
| **JD-5** | **Dissolved.** No config is read; NFR-AGD-005 forbids the injection outright |
| **JD-6** | **Dissolved.** No ceiling key, no dry-run flag — the increment is the dry run |
| **JD-7** | **Fixed.** EX-3's evaluation scope stated: candidates after shield removal |
| **JD-8** | **Deferred to increment 2** — no transaction exists here |
| **JD-9** | **Dissolved.** No row is written, so no audit column is |
| **JS-1** | **Converted to data** (RSK-2). Measured here, decided in increment 2 |
| **JS-2** | **Deferred** — no transaction callback exists |
| **JS-3** | **Fixed.** The distinct clause has AC.3 and its own gate row |
| **JS-4** | **Fixed.** `deactivationAbortReason` is a separate field |
| **JS-5** | **Fixed.** AC.4 exempts the final page |
| **JS-6** | **Accepted.** With one shared util the equality test is tautological; the real gate is AC.2's executed padded-email test, which a call site abandoning the util would redden |
| **JS-7** | **Fixed.** `abortDetail` carries the operands |
| **JS-8** | **Fixed.** C-4 counts active, non-deleted rows only |
| **JS-9** | **Fixed.** The null guard precedes `trim()`; AC.4 covers it |
| **JG-1** | **Dissolved** — this increment carries its own budget |
| **JG-2** | **Deferred** with the write statements |
| **JG-3** | **Fixed.** NFR-AGD-004 extended to every branched raw column |
| **JG-4** | **Fixed.** The "three call sites" claim is gone |
| **JG-5** | **Fixed** with `JS-8` |

---

## 13. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>
- [ ] Security review — <name>
