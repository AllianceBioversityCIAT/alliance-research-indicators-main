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


---

# PART II — Increment 2: The Write

> **Added 2026-09-25**, after increment 1 ran for the first time against Dev. Part I above is the
> shipped, read-only measurement half and is **unchanged** — its `R-AGD-001…005` keep their meanings
> and their 39 citations across `tasks.md`, `design.md`, `judgment.md` and `execution.md`.
>
> **`R-AGD-006` and `R-AGD-007` are retired unused.** The pre-split draft
> (`.increment2-carryover-requirements.md.bak`) assigned them to *dry-run* and *summary*; allocating
> them again would mean one id with two meanings in one folder. Increment 2 therefore starts at
> **`R-AGD-008`** — the same rule §2 applies to `R-AGS-005`, one level down.

---

## 14. What the first run settled

Increment 1 ran in Dev on 2026-09-25. Full record: [`MEASUREMENT-2026-09-25.md`](./MEASUREMENT-2026-09-25.md).

| Signal | Value | What it settles |
| --- | --- | --- |
| `activePopulation` | **1985** | C-3's denominator is no longer a guess |
| `deactivationCandidates` | **146** | The blast radius, measured |
| `excludedExternal` | **0** | `EX-1` shields nobody — see §15 |
| `excludedSystemAdmin` / `excludedAmbiguous` | 0 / 0 | Inert this run; mechanisms intact |
| `excludedUnmatchable` | 3 | The only exclusion that fired |
| `distinctCarnets` / `totalElements` | 2001 / 2001 | The fetch arrives intact |

**The counts reconcile without a remainder** — `1985 − 1835 matched − 1 ambiguous twin − 3 unmatchable = 146` — which is itself evidence the classification drops nothing.

**C-3 would breach.** `max(0.05 × 1985, 10)` = **99**, against 146 candidates: **7.36%**. The first
live run breaching the ceiling was predicted by the draft rollout; it is now measured rather than
anticipated.

---

## 15. `EX-1` is inert, and increment 2 depends on data that does not exist yet

**This is the single most consequential finding of the first run, and it is a precondition on
rollout, not a code defect.**

`user_status` in Dev holds exactly four rows — `1 Accepted · 2 Pending · 3 Rejected ·
4 External Accepted` — and **zero of 1985 active users carry `status_id = 4`**. `EX-1` is therefore
*structurally* inert: not unused, but unable to fire. `RB-2` / `JS-1` are closed on evidence.

**User ruling 2026-09-25:** the mechanism is revived **by populating the data**, not by replacing
the rule. Eight accounts with direct evidence of legitimacy are marked `status_id = 4`:

| Cohort | ids | Evidence |
| --- | --- | --- |
| Active platform users, no carnet | 8, 16, 126 | The only 3 of 146 that have ever logged in |
| Service account | 1097 | `Alliance-aiccra-kds@cgiar.org` (MARLO) |
| Other institutions | 1103, 1107, 1113, 1114 | IRI Columbia ×3, ICRISAT |

> ⚠️ **Until that `UPDATE` is applied, `EX-1` still shields nobody.** A live run executed before it
> retires all eight. This is `RSK-AGD-7` and it is owned by the rollout plan, not by a task.

**Carnet presence decides the remedy, and marking the wrong cohort external is permanent damage.**
Four candidates hold a carnet — they *are* Agresso payroll — but carry a personal or external
address in STAR: `angiesanchez9523@gmail.com` (15913), `palounohelia@gmail.com` (15806),
`Sadie.shelton@uvm.edu` (16060), `sbhamra88@gmail.com` (14897). Matching is **email only**; the
carnet never participates. Marking them external would shield real payroll **forever**, so that
their eventual departure retires nothing. Their remedy is an email correction, and they are
deliberately **excluded** from the eight.

---

## 16. Functional requirements — increment 2

### R-AGD-008 — A retired account is switched off across three tables in one transaction

- **As a** security owner
- **I want** the account, its roles and its machine credentials switched off together
- **So that** no half-retired account leaves a live credential behind

**Details:**

| Order | Table | Write |
| --- | --- | --- |
| 1 | `app_secrets` | `is_active = 0 WHERE responsible_user_id IN (…) AND is_active = 1` |
| 2 | `sec_user_roles` | `is_active = 0 WHERE user_id IN (…) AND is_active = 1` |
| 3 | `sec_users` | `is_active = 0 WHERE sec_user_id IN (…) AND is_active = 1` |

- Credentials are written first and the account last. **The order does not provide atomicity** — see the note in `design.md` §19; one transaction with no inner `catch` provides it, and the order exists for a consistent lock sequence (`JR2-3`).
- Every write SHALL go through the transaction's `manager`. The `app_secrets` write SHALL use `manager.getRepository(AppSecret)` and SHALL NOT use `AppSecretRepository`, which is bound to the injected root `EntityManager` and **structurally cannot join the transaction** (`J-6`).
- Writes SHALL be chunked at the module's existing `CHUNK = 50`, ids sorted ascending in every chunk of every table (`JD-8`, §NFR-AGD-006).
- **The pass SHALL NOT catch inside the transaction callback** (`JS-2`). A `catch` placed there commits the chunks that already succeeded. The sibling's shipped code returns its summary from inside its own callback — that is the pattern an implementer will copy, and it is the one this requirement forbids.
- The pass SHALL NOT write to `alliance_user_staff`.

**Acceptance criteria:**
- [ ] AC.1 — After a live run, a retired user has `is_active = 0` in `sec_users`, `0` on every previously-active `sec_user_roles` row, and `0` on every previously-active `app_secrets` row naming them.
- [ ] AC.2 — A failure during **any** of the three writes leaves **all three** tables byte-identical.
- [ ] AC.3 — `app_secrets` rows whose `responsible_user_id` is a shielded, excluded or matched user are untouched.
- [ ] AC.4 — Rows already `is_active = 0` before the run are not rewritten and do not inflate the reported counts.
- [ ] AC.5 — **Each of the three writes has its own falsifier** (`JG-2`): removing any one statement reddens a test that names that table. A falsification note covering `sec_users` alone does not discharge this.
- [ ] AC.6 — No `catch` exists inside the transaction callback; a forced failure in the second chunk of any table produces zero committed rows in all three.

#### Scenario: A departed employee's machine token stops authenticating

- GIVEN an unmatched active account `{id: 900}` that is the `responsible_user_id` of an active `app_secrets` row
- WHEN a live run retires it
- THEN that `app_secrets` row has `is_active = 0`
- AND IT MUST have been written through the transaction's manager, so a later failure in the same transaction reverts it
- BUT it must NOT have been written through `AppSecretRepository`
- AND IT MUST close the live auth path in which `validation()` returns `isValid = true` with `user = null` (`RSK-6`) for that credential

#### Scenario: A mid-transaction failure retires nobody

- GIVEN a deactivation set of **120** accounts, which at `CHUNK = 50` is **three** chunks, so a second-chunk failure is reachable
- AND the `sec_user_roles` update raises on the second chunk
- WHEN the sync runs live
- THEN no `sec_users`, `sec_user_roles` or `app_secrets` row has changed
- AND IT MUST report the failure with counts, not as a bare stack trace
- BUT it must NOT commit the `app_secrets` writes that had already succeeded
- AND IT MUST NOT reach that state through a `catch` inside the transaction callback (`JS-2`)

---

### R-AGD-009 — Dry-run computes the full outcome and opens no transaction

- **As a** platform administrator
- **I want** to see exactly who would be retired before anyone is
- **So that** the blast radius is inspectable while it is still reversible

> **This is the substitute control for the defect class with no automated gate** (§19). Nothing in
> this repository can tell a correct deactivation set from a plausible wrong one. A human reading a
> dry run can — and did, on 2026-09-25.

**Details:**
- Dry-run SHALL be read from `app_config` and SHALL default to **enabled** on any resolution failure, so the pass ships inert.
- In dry-run the pass SHALL execute every read, every shield, every exclusion and every precondition except C-3's abort, then report — and SHALL **open no write transaction at all**. Not a transaction that rolls back: none.
- Disabling dry-run is a deliberate operator action, and the rollout plan carries the step that restores it.

**Acceptance criteria:**
- [ ] AC.1 — A dry run over an input that would retire N accounts reports N and changes zero rows across all three tables.
- [ ] AC.2 — The dry-run flag absent, unreadable, or non-boolean resolves to **enabled**.
- [ ] AC.3 — The summary states which mode ran, in a field a reader cannot miss.
- [ ] AC.4 — In dry-run, no transaction is opened — asserted on the `DataSource`, not inferred from a zero row-delta.

#### Scenario: A dry run is indistinguishable from a live run except for the writes

- GIVEN any payload and any database state
- WHEN the sync runs in dry-run mode
- THEN the summary's counts equal what a live run on the same input would have written
- AND IT MUST report `dryRun = true`
- BUT it must NOT open a write transaction, so a bug in the write path cannot fire
- AND IT MUST still abort on C-1, C-2 and C-4 — a dry run over an untrustworthy payload reports a meaningless set

---

### R-AGD-010 — A volume ceiling withholds a live run whose set is implausibly large

- **As a** platform administrator
- **I want** a run that would retire an implausible share of the platform to stop
- **So that** a payload that is internally consistent and still not the staff list cannot become a mass lockout

**Details:**
- **C-3:** `deactivationSet.size <= max(ceilingFraction × activePopulation, absoluteFloor)`.
- `activePopulation` SHALL be the count of active `sec_users` rows at read time, **before** exclusions.
- C-3 SHALL **report instead of aborting in dry-run** — the run whose purpose is to measure the blast radius must not be stopped by its size.
- C-3 joins the C-1/C-2/C-4 family of Part I's `R-AGD-004`; it does not replace or renumber them.

**Acceptance criteria:**
- [ ] AC.1 — A live run whose set exceeds the ceiling aborts with `abortReason = C-3`, reporting `deactivationCount`, `activePopulation` and `ceiling`, and writes nothing.
- [ ] AC.2 — In dry-run a C-3 breach does **not** abort; the summary reports `ceilingBreached = true` and the full set.
- [ ] AC.3 — Either config key (`CEILING_FRACTION`, `ABSOLUTE_FLOOR`) unset, non-numeric, or `<= 0` aborts with `abortReason = C-3` — a missing ceiling never silently becomes "no ceiling".

#### Scenario: The first live run breaches the ceiling — measured, not anticipated

- GIVEN the 2026-09-25 Dev measurement: 146 candidates against `activePopulation = 1985`
- AND `ceilingFraction = 0.05`, `absoluteFloor = 10`, giving a ceiling of **99.25** (unrounded — see `design.md` §20.2)
- WHEN the sync runs with dry-run **enabled**
- THEN the summary reports `ceilingBreached = true` and all 146
- AND IT MUST NOT abort, because measuring the set is the run's entire purpose
- BUT the same input with dry-run **disabled** MUST abort with `abortReason = C-3` and write nothing

---

### R-AGD-011 — Runtime configuration is seeded, and fails safe in one direction only

- **As a** platform administrator
- **I want** the pass's four settings to exist before it first runs
- **So that** a first live run cannot abort forever on config that no migration ever created

**Details:**
- One data-only migration seeds four `app_config` keys, following `1786738949211-seedClarisaMappingPhase.ts` verbatim in shape: parameterised insert, `ON DUPLICATE KEY UPDATE`, symmetric `down()`.

| Key | Seed | Read as | On resolution failure |
| --- | --- | --- | --- |
| `ARI_STAFF_DEACTIVATION_DRY_RUN` | `'true'` | boolean | **enabled** — fails safe |
| `ARI_STAFF_DEACTIVATION_CEILING_FRACTION` | `'0.05'` | number `> 0` | **abort C-3** — fails loud |
| `ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR` | `'10'` | integer `> 0` | **abort C-3** — fails loud |
| `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID` | `'4'` | integer `> 0` | **abort C-4** — fails loud |

- **The asymmetry is deliberate:** `dryRun` fails safe; the other three fail loud. A missing ceiling must never become "no ceiling", and a missing external-status id must never become "shield nobody".
- Config SHALL be read via `dataSource.getRepository(AppConfig)`. `AppConfigService` SHALL NOT be injected — it carries `CurrentUserUtil` (`Scope.REQUEST`) and the scope bubbles to the fire-and-forget controller (Part I `NFR-AGD-005`; the repo forbids it in writing at `mapping-phase.resolver.ts:11-15`).
- This pass SHALL NOT cache config. `K-016`'s 5-minute TTL lives in *consumers* (`MappingPhaseResolver`, `ClarisaProjectsService`), not in `AppConfigService`; if this pass ever adds a cache, that window applies from that moment.

**Acceptance criteria:**
- [ ] AC.1 — The migration's `up()` creates all four keys; `down()` deletes exactly those four and nothing else.
- [ ] AC.2 — Re-running `up()` over existing keys updates rather than duplicating (`ON DUPLICATE KEY UPDATE`).
- [ ] AC.3 — Each key unresolvable produces the outcome in the table above, asserted per key.
- [ ] AC.4 — No `AppConfigService` import exists anywhere in this path.

---

### R-AGD-012 — The external status is selected by id, and an absent row refuses the run

- **As a** platform administrator
- **I want** the external cohort identified by a stable key
- **So that** renaming a `user_status` row cannot silently change who is shielded

> **This corrects a defect measured on 2026-09-25.** `W-1` replaced the original literal `4` with a
> name lookup for `'external'` *because the literal was unverifiable* — `user_status` has no seed, no
> migration and no enum in this repository. The reasoning was sound and the value was wrong: the live
> row is named **`External Accepted`**, so C-4 matched nothing and the pass refused to run. An
> auditable expression pointing at a row that does not exist. **User ruling 2026-09-25: the id is the
> selector.**

**Details:**
- C-4 SHALL resolve the external status by `user_status_id` read from `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID`, over rows that are active and not deleted.
- C-4 SHALL continue to abort when the resolution yields anything other than exactly one row, **in dry-run too** — it is a correctness precondition for `EX-1`, not a volume guard.
- The row's **name SHALL NOT participate in selection**. It MAY be logged for a human reading the summary.

**Acceptance criteria:**
- [ ] AC.1 — A `user_status` set containing `{4, 'External Accepted'}` resolves, whatever the name reads.
- [ ] AC.2 — A set containing no row at the configured id aborts with `abortReason = C-4`.
- [ ] AC.3 — A row named `External` at a **different** id does **not** resolve — a name alone never selects.
- [ ] AC.4 — The id arrives from the driver as a string and is coerced before comparison (`NFR-AGD-004`).

#### Scenario: An unverifiable status table refuses to run rather than shielding nobody

- GIVEN a `user_status` table with no active row at the configured external id
- WHEN the sync runs
- THEN the pass aborts with `abortReason = C-4`
- AND IT MUST abort in dry-run mode too
- BUT it must NOT fall back to matching on the row's name

---

### R-AGD-013 — The summary reports what the write did, on every path

- **As a** platform administrator
- **I want** one structured summary covering write, exclusion, shield, ceiling and abort
- **So that** a run that retired nobody is distinguishable from a run that failed

**Details:**
- Part I's summary DTO SHALL be extended; no second summary shape is introduced.
- New fields: `dryRun`, `ceiling`, `ceilingBreached`, `deactivated`, `rolesDeactivated`, `secretsDeactivated`.
- The summary SHALL be emitted on the abort path as well as the success path (`G-4`).

**Acceptance criteria:**
- [ ] AC.1 — A live run reports `deactivated`, `rolesDeactivated` and `secretsDeactivated` as **three separate counts**, each matching the rows that table actually changed.
- [ ] AC.2 — An aborted run emits every count it managed to compute, plus `abortReason`.
- [ ] AC.3 — `abortReason` is **absent** (not `null`, not empty string) on a successful run, so its presence alone identifies an abort.
- [ ] AC.4 — A run that retired nobody because the set was empty is distinguishable in the summary from one that retired nobody because it aborted.

#### Scenario: A run that retired nobody says why

- GIVEN a run that aborts on C-3
- WHEN the summary is logged
- THEN it carries `abortReason = 'C-3'`, `ceiling`, `ceilingBreached = true` and the counts computed before the abort
- AND IT MUST be logged at `error`
- BUT it must NOT report `deactivated = 0` without an `abortReason`, which would be indistinguishable from a healthy run with nothing to do

---

## 17. Non-functional requirements — increment 2

### NFR-AGD-006 — Lock ordering is consistent, and its limits are stated
- **Category:** reliability / concurrency
- **Target:** Ids SHALL be sorted ascending within every chunk of every table, and the three tables SHALL always be written in the `app_secrets → sec_user_roles → sec_users` order of `R-AGD-008`.
- **Stated limits (`JD-8`, carried rather than claimed closed):**
  - The cross-table order is **inverted relative to the sibling's shipped transaction**, and the trigger has **no in-flight guard** — two concurrent runs remain possible.
  - Id sorting mitigates the *within-table* dimension, which was already safe.
  - **`app_secrets` has no index on `responsible_user_id`** (verified against the baseline schema), so id sorting has no effect on that statement at all.
- **How verified:** a test asserting statement order and sorted id chunks; the limits above are recorded as accepted risk, not as a gate.
- **No isolation level and no lock timeout are set.** The codebase has no such precedent at any of its **25** transaction sites (re-counted 2026-09-25; the draft said 22 and the count drifted with the `staging` merge), including the sibling's own write transaction (`W-9`).

### NFR-AGD-007 — Audit columns: what is achievable is stated, not asserted
- **Category:** observability
- **Target:** `updated_at` moves by engine behavior (`ON UPDATE CURRENT_TIMESTAMP`). `updated_by` has **no actor** in a fire-and-forget background job.
- **Rationale (`JD-9`):** the draft's claim *"audit columns are written on every row"* is unsatisfiable-or-vacuous as stated — one column is written by the engine whatever the code does, and the other has nobody to write. Design decides between leaving `updated_by` NULL and introducing a system actor id; whichever it picks is recorded as a decision, not smuggled in as a criterion.
- **How verified:** an assertion on the column the design commits to, and an explicit statement for the one it does not.

---

## 18. Data and rollout preconditions — increment 2

**No schema change.** Three tables written (`is_active` only), two read, one untouched — as Part I §5.

**Two data operations, both human-owned, both outside the migration:**

| # | Operation | Why it is not a migration |
| --- | --- | --- |
| DO-1 | `UPDATE sec_users SET status_id = 4 WHERE sec_user_id IN (8,16,126,1097,1103,1107,1113,1114) AND is_active = 1` | Environment-specific ids. A migration carrying Dev ids would corrupt Production |
| DO-2 | Correct the STAR email of the four carnet-holding accounts in §15 | A data-quality fix, not a behavior change |

> **DO-1 is a precondition on the first live run, not on the merge.** Until it is applied `EX-1`
> shields nobody and all eight are retired (`RSK-AGD-7`).

---

## 19. Defect classes added by increment 2

| # | Defect class | Gate | Can it go red? |
| --- | --- | --- | --- |
| D-10 | Partial write — rows committed after a mid-run failure | Fixture test forcing a failure in the second chunk, asserting zero deltas in all three tables | Yes, by catching inside the callback |
| D-11 | Cascade incompleteness — account off, roles or secrets still on | Fixture asserting all three tables after one run, **one falsifier per table** (`JG-2`) | Yes, by dropping one table's write |
| D-12 | Dry-run leakage — a "dry" run writes | Assertion that no transaction is opened, on the `DataSource` | Yes, by opening the transaction |
| D-13 | Config absent → the pass aborts forever | Migration `up`/`down` test + one resolution test per key | Yes, by skipping the migration |
| D-14 | A ceiling that cannot fire | A live-mode test over a set above the ceiling, observed red before trusted (`K-004`) | Yes, by definition |
| D-15 | `EX-1` inert at run time — the §15 data not applied | **No automated gate.** Fixtures run against a scratch schema and say nothing about Dev or Prod | **No.** Substitute: DO-1 verified by query as a rollout step, and the dry run read before the live run |

**What these gates structurally cannot inspect (`KZ-017`):** `npm test` runs with `rootDir: "src"`
and never executes `test/fixtures/`, `test/*.e2e-spec.ts` or `test/*.integration-spec.ts`. **No
`npm test` result is evidence for any database claim in this spec.** A unit test over a mocked query
builder cannot represent SQL operator precedence — any `WHERE` combining `OR` and `AND` must be
asserted against generated SQL or a real database, never against a call sequence.

---

## 20. Risks added by increment 2

| # | Risk | Mitigation |
| --- | --- | --- |
| RSK-AGD-7 | **A live run before DO-1 retires the eight legitimate accounts** | DO-1 is a numbered rollout step verified by query before dry-run is disabled |
| RSK-AGD-8 | **The `?status=active` ambiguity is now quantified: 91 of 146 candidates hold a carnet.** Absence from the payload cannot distinguish "departed" from "not active in Agresso right now" | Owned by BI verification, not by code. `ASM-1` (user ruling) accepts the consequence; the dry run makes it inspectable |
| RSK-AGD-9 | **Four carnet-holding accounts with a mismatched email are candidates on every run** — retire, complain, reactivate, retire again | DO-2. Recorded because the loop is invisible in any single run's summary |
| RSK-AGD-10 | Part I's `UNUSABLE_EMAIL` dissolution argues such a member "has no account to shield". That holds for the *mechanism* — a null payload email yields no key — but **not** for the person: 163 members were skipped this run, and one with a null Agresso email may hold a STAR account under a real address, unmatched and unshielded | Open. The split of the 163 between null-email and over-length has not been measured. Named here rather than left inside a dissolution table |

---

## 21. Requirement ID index — increment 2

| ID | Title |
| --- | --- |
| R-AGD-006 | *retired unused — see the Part II banner* |
| R-AGD-007 | *retired unused — see the Part II banner* |
| R-AGD-008 | A retired account is switched off across three tables in one transaction |
| R-AGD-009 | Dry-run computes the full outcome and opens no transaction |
| R-AGD-010 | A volume ceiling withholds a live run whose set is implausibly large |
| R-AGD-011 | Runtime configuration is seeded, and fails safe in one direction only |
| R-AGD-012 | The external status is selected by id, and an absent row refuses the run |
| R-AGD-013 | The summary reports what the write did, on every path |
| NFR-AGD-006 | Lock ordering is consistent, and its limits are stated |
| NFR-AGD-007 | Audit columns: what is achievable is stated, not asserted |

---

## 22. Deferred findings — now due

Part I §12 deferred four findings to this increment. Each has an owner here.

| # | Finding | Where it lands |
| --- | --- | --- |
| **JD-8** | Cross-table lock order inverted vs the sibling; no in-flight guard; `app_secrets` has no index on `responsible_user_id` | ⚠️ **NOT DISCHARGED — carried as accepted risk, owner named.** Both judges in round 1 (`JR2-7`) flagged that `NFR-AGD-006` *restates* the hazard rather than closing it: "operational discipline" is not an acceptance criterion and no test can assert it. **The deadlock remains reachable.** Accepted because the run is manual, infrequent and `SYSTEM_ADMIN`-only; **owner: the platform admin**, who must not trigger a second run while one is in flight. An in-flight guard is the real fix and is **deferred to its own spec**, not smuggled into this one |
| **JS-2** | A `catch` inside the transaction callback commits partial chunks — and the sibling's shipped code returns from inside its callback, so it is the pattern an implementer copies | `R-AGD-008` AC.6 |
| **JD-9** | "Audit columns written on every row" is unsatisfiable-or-vacuous: `updated_at` is engine-driven, `updated_by` has no actor | `NFR-AGD-007` |
| **JG-2** | The belt-and-braces falsification note covered `sec_users` only, not all three writes | `R-AGD-008` AC.5 |

---

## 23. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>
- [ ] Security review — <name>
