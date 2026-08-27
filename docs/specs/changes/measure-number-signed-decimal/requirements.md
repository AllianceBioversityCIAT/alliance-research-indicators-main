# Requirements — Results / Measure `Number` accepts signed decimals

- **Module:** results (client `innovation-use-details`, `oicr-details`, shared `quantification-item`, shared `custom-fields/input`; server `result-innovation-use`, `result-oicr`, `result-quantifications`, **two** migrations)
- **Spec id:** `2026-08-measure-number-signed-decimal`
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Depth:** **Full** — append-only migration on a shared MySQL database, a shared column read by three roles, and a shared component rendered by two pages
- **Linked PRD section:** [`docs/prd.md` §3.1 Result Contributor](../../../prd.md) · US-RC-2 · R-2 · AC-Role-Correctness
- **Linked TRD sections:** §2.4 **ADR-5** (append-only migrations), §2.4 **ADR-11** (lifecycle routines + its blind spot (i)), §5.1 (persistence), §8.5 (forms — client mirrors server, server wins)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Extends:** `docs/specs/archive/2026-08-26-innovation-use--details-page/` — **amends `R-IUP-008`**
- **Linked tickets:** none yet
- **Last updated:** 2026-08-26


> ## ✅ REVISED UNDER THE ADDITIVE-DEFAULTS RULING — 2026-08-26
>
> Accepted at `ESCALATED` after three Judgment Day rounds (78 findings, [`judgment.md`](./judgment.md)), then **revised** on a product-owner design ruling: *every change must have a default that requires no edit elsewhere in the system, so the change is added only where it is needed.*
>
> **What that removed.** Three of the four accepted defects and two chronic findings are no longer fixed — they are **unreachable**, because the edits that produced them are gone:
>
> | Was | Now |
> | --- | --- |
> | Pin OICR's two call sites (`L-05`: four wrong figures for one enumeration) | The shared card's `maxFractionDigits` **default becomes `0`**. `oicr-details` is not edited |
> | A `ValidationPipe` (`K-01`: data destruction), then OICR's own service | Override **`createCustomValidation(dataArray, dataRole)`** on `ResultQuantificationsService` — `base-service.ts:134,345` calls it on **both** upsert paths, and gains an **optional** `dataRole` parameter so the map can key on the role at all (Round 4, `M-01`). **No OICR file is edited**; `base-service.ts` is the spec's only shared-file edit |
> | Remove `app-input`'s character guard (`L-02`: deletes paste feedback app-wide) | **Withdrawn.** The guard is not touched |
>
> **`design.md` is authoritative wherever it and this document disagree.**
>
> **One accepted defect remains, and it is a corrected value, not a structure:** `DD-14`'s bound is now `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1` → **549,755,813,887** at scale 4, **verified by execution** (zero grid collisions and zero round-trip failures at every scale, against 3,616 collisions for the superseded bound).

---

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Approval Mode | `gated` |
| Depth | **Full** (re-checked against the design in `design.md` §Budget) |
| Parent Spec | none — see proposal `OQ-5` |
| Parallel-safe | no |
| Resolved before Phase 1 | §10's `OQ-5` → **Innovation Use details** · `OQ-6` → **4 decimals in UI/DTO and in the DB** *(revised at the Judgment Day escalation from "2 in UI, 4 in DB" — user ruling: UI scale equals column scale, so nothing rounds silently)* · `OQ-7` → **OICR IS in scope** *(reversed at the same escalation — `J-01` proved it could not be left alone safely; `NG-1` withdrawn)*. *(These were `OQ-1`/`OQ-2`/`OQ-3` in `proposal.md`; renumbered here to free those ids — cite the document with the id.)* |
| Session hygiene | ⚠️ downstream `/akili-*` commands must run with cwd = `alliance-research-indicators-main` |

---

## 1. Context

The **Number** field of *Other quantitative measures* on the Innovation Use details page accepts only non-negative integers. The requirement is that it accept **positive, negative and decimal** values.

The cap is enforced independently at three tiers — a UI clamp (`[min]="0"` + `[maxFractionDigits]="0"`), a server DTO (`@IsInt()` + `@Min(0)`), and the MySQL column type (`bigint`) — so relaxing one tier alone ships a field that accepts input and then truncates, rejects, or `400`s. **All three are relaxed only for Innovation Use, and only by opting out of a default** (`design.md` DD-12, DD-13, DD-14).

**Explicitly not changing:** the **six** actor/organization **count** fields, `app-input`'s `min = 0` default, and the two light-theme contrast defects already shipped (`RB-5` in this component; `OQ-IUP-8` in `custom-fields.scss`).

**Changed at the Judgment Day escalation:** OICR's *Actual count* / *Extrapolated estimates* **are** in scope. They share the column, and `K-01`/`J-01` established that their integrality was enforced by nothing but the `bigint` type this spec removes — so leaving them alone was not a smaller change, it was an unenforced one. See `R-MSD-011`.

---

## 2. Executive Summary

| | |
| --- | --- |
| **What** | One field's accepted value set widens from `ℕ₀` to signed decimals with **4** fractional digits |
| **Where the work is** | Not in the widening — in **proving nothing else widened**. One shared component, one shared column, three consuming roles, four stored routines |
| **Agreed values** | UI + DTO: **4 decimal places**. Magnitude **derived from the scale**: `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1` → **549,755,813,887** at scale 4, and **exactly `Number.MAX_SAFE_INTEGER`** at scale 0, so no special case is needed. DB: **`DECIMAL(24,4)` NULL**. *(Third and final value for this bound — the only one verified by execution; `design.md` §6.2.)* |
| **Why the UI and the column carry different *magnitude* limits** | The column is sized for data that **already exists** (19 `bigint` digits, or the `ALTER` truncates). The UI is sized so the double's spacing never exceeds the decimal grid (`ulp(v) ≤ 10^-scale`) — otherwise distinct values a user types collapse onto the same double **before** the database sees them. *(Two earlier formulations were wrong: a digit budget on a false "exactly representable" premise, then a scaled-integer bound that admitted 3,616 colliding values in 20,000 — `L-01`.)* |
| **Why `p − s = 20`** | Lossless **by construction** for any signed `bigint` (max 19 digits), so the `ALTER` cannot truncate existing data regardless of what the table currently holds |
| **The dominant defect class** | Silent data loss under an **unchanged column name** — TRD **ADR-11** blind spot (i). A routine-body diff structurally cannot see it; only a behavioral fixture against real MySQL can |
| **The gap that must be closed** | No fixture asserts that `SP_versioning` copies `result_quantifications` at all. Level, actor counts and organization counts are covered (`F13a`/`F13b`/`F13c`); quantifications are not |

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Measure** | One row of *Other quantitative measures* on the Innovation Use details page: Number + Unit + Comments. Persisted as a `result_quantifications` row with `quantification_role_id = 3` (`INNOVATION_USE`) |
| **Scale** | The number of fractional digits a value may carry (the `s` of `DECIMAL(p,s)`) |
| **Precision** | Total significant digits (the `p`) |
| **The shared card** | `QuantificationItemComponent` (`shared/components/quantification-item/`), rendered by both the Innovation Use details page and the OICR details page |
| **The four lifecycle routines** | `SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, `delete_result` — MySQL routines that enumerate child tables, and on the copy path every column, **by name** (ADR-11) |
| **Fixture tier** | `npm run test:fixtures` — Jest against a **real, disposable** MySQL schema bootstrapped by `migration:test:bootstrap`. The only tier that executes SQL |
| **Wire type** | The JSON type `quantification_number` arrives as. Today already `string` in places — existing code coerces with `Number(...)` |

---

## 4. System Context & Scope

### 4.1 The three tiers and who owns the rule

```
[ Innovation Use details page ]  R-MSD-001, R-MSD-006, R-MSD-008, R-MSD-009
        │  binds min / maxFractionDigits / placeholder
        ▼
[ QuantificationItemComponent ]  ← ALSO rendered by OICR details    R-MSD-002, R-MSD-007
        │  (shared card — defaults must reproduce today's OICR exactly)
        ▼
[ app-input → p-inputNumber ]    R-MSD-001, R-MSD-006
        │  POST /api/v1/result-innovation-use/...
        ▼
[ InnovationUseQuantificationDto ]  R-MSD-003, R-MSD-007
        │
        ▼
[ result_quantifications.quantification_number ]  R-MSD-004
        │  roles 1 ACTUAL_COUNT · 2 EXTRAPOLATE_ESTIMATES · 3 INNOVATION_USE
        ├──▶ [ four lifecycle routines ]   R-MSD-005
        └──▶ [ OICR report views ]         R-MSD-010
```

### 4.2 In scope

| # | Surface |
| --- | --- |
| S-1 | Client — parameterize the shared card (`min`, **`max`**, `placeholder`) additively, and change the `maxFractionDigits` default to `0`. `max` also becomes an `@Input` on `app-input`, defaulting to today's value |
| S-2 | Client — the Innovation Use call site's bindings |
| ~~S-3~~ | ~~`app-input`'s digit-length guard~~ — **out of scope.** `DD-7` withdrawn; the guard's pre-existing false positive is not this spec's problem, and removing it would delete paste feedback app-wide (`L-02`) |
| S-4 | Client — the read path for a decimal wire value |
| S-5 | Server — `InnovationUseQuantificationDto.quantification_number` validation |
| S-6 | Server — entity column type + read shape |
| S-7 | Server — **two** append-only migrations: the column `ALTER` (with backup table + whole-table diff) and the `report_oicr` recreation |
| S-7b | Server — **override `createCustomValidation(dataArray, dataRole)` on `ResultQuantificationsService`** with a per-role rule map, plus the **optional `dataRole` parameter** on `base-service.ts` that makes the map keyable (`R-MSD-011`). The **default** entry is *non-negative integer* — ⚠️ **today's behaviour on the fraction axis only; the sign axis is a genuine tightening**, because the `bigint` column is signed (`RK-14`). Deliberately **not** a `ValidationPipe` and **not** OICR's own service — `design.md` DD-13 |
| S-7c | Client — the shared card's `maxFractionDigits` **default becomes `0`**, so OICR is correct without being edited (`R-MSD-011`, `design.md` DD-12). **No OICR file is in scope** |
| S-8 | Verification — extend the existing round-trip and lifecycle fixtures, **and add one new fixture file** for `report_oicr` rendering (`design.md` DD-11). *No new **harness*** — the existing `migration:test:bootstrap` tier is reused; a new spec **file** on that tier is not a new harness. Clarified at the round-2 re-judgment (`K-11`), where the earlier wording read as prohibiting the file DD-11 requires |
| S-9b | Verification — client and server **unit** suites for the defect classes (`DC-1`, `-2`, `-3`, `-6`, `-9`, `-10`, `-15`) and an **OICR-path** fixture for `DC-16` |
| S-9 | Reporting — a **decided** answer for decimal rendering in the OICR report views |
| S-10 | Spec hygiene — amend `R-IUP-008`; record `FR-12` in the family manifest |

### 4.3 Out of scope

`NG-2`…`NG-5` of [`proposal.md`](./proposal.md#non-goals) carry over. **`NG-1` is withdrawn** at the Judgment Day escalation (see above and `design.md` §1). Additionally out of scope: a `ValidationPipe` on the OICR controller (rejected — `design.md` DD-13), and any fix for the platform-wide `DECIMAL`-typed-as-`number` class (`design.md` `O-2`).

---

## 5. Stakeholders / Personas

| Persona (PRD §3) | Interest |
| --- | --- |
| **Result Contributor / Researcher** (§3.1) | Primary actor. Enters and re-reads the measure. `R-2`: partial progress must survive a reload |
| **MEL Regional Expert** (§3.2) | Reads submitted measures during review; a truncated value misrepresents the result |
| **OICR reporters** (same §3.1 persona, different section) | **Must observe no change.** Their field shares the component and the column |
| **Downstream consumers** (§3.5) | Read `quantification_number` through report views; `R-MSD-010` protects them |

---

## 6. Functional Requirements

> ID pattern `R-MSD-<NNN>` / `NFR-MSD-<NNN>`, numbered in dependency order (input → validation → storage → lifecycle → reporting).

---

### R-MSD-001 — The measure Number accepts signed, four-decimal values

- **As a** Result Contributor
- **I want** to enter a negative or fractional quantity in a measure's Number
- **So that** I can report changes, deltas and rates, not only whole positive counts

**Details**

- Inputs: keyboard entry, paste, and the spinner controls on the measure's Number field.
- Behavior: the accepted set is any value with **at most 4 fractional digits**, of either sign, including `0`, within the scale-derived magnitude bound (`design.md` DD-14).
- Enforcement is at **input, at blur, and on paste** — not only at submit.
- Outputs: the value reaches the page body exactly as entered, with no sign flip and no rounding.

**Acceptance criteria**

- [ ] AC.1 — Typing `-1500` yields `-1500` in the body.
- [ ] AC.2 — Typing `2.5` yields `2.5`, not `3`.
- [ ] AC.3 — Typing `-0.75` yields `-0.75`.
- [ ] AC.4 — Pasting `-1500` yields `-1500`.
- [ ] AC.5 — Pasting `2.5` yields `2.5`.
- [ ] AC.6 — `0` is accepted and is distinct from absent (`null`).
- [ ] AC.7 — An empty field stays absent — the measure block is optional (`fieldsRequired = false`) and this does not change.

#### Scenario: A negative fraction survives entry

- GIVEN a measure row on the Innovation Use details page in an editable status
- WHEN the Contributor types `-0.75` into **Number**
- THEN the page body holds `-0.75`
- AND the field renders `-0.75`
- BUT it must NOT round, clamp to `0`, or drop the sign at any point during entry
- AND IT MUST treat `0` as a value, never as empty.

#### Scenario: The spinner does not reintroduce the floor

- GIVEN a measure whose Number holds `0`
- WHEN the Contributor presses the decrement spinner control
- THEN the value goes below zero
- BUT it must NOT stop at `0`
- AND IT MUST step by a whole unit, not by the fractional scale.

**Out of scope (for this requirement):** any coupling between the chosen Unit and the allowed sign or scale.

---

### R-MSD-002 — The shared card gains the capability without changing its existing consumers

- **As a** maintainer
- **I want** the shared card parameterized rather than re-pointed
- **So that** the OICR details pages that render it are unaffected

**Details**

- `QuantificationItemComponent` exposes `min`, **`max`** and `placeholder` as inputs, all **defaulting to today's values**, exactly as `T-03` did for `fieldsRequired` / `maxFractionDigits`.
- **`maxFractionDigits`'s default changes from `undefined` to `0`** — the one changed default in this spec, and the reason no OICR file is edited (`design.md` DD-12).
- **Only the Innovation Use call site passes non-default values.** No other consumer is edited, so "unaffected" is a property of the code rather than a claim to be enumerated.

**Acceptance criteria**

- [ ] AC.1 — With no `min` passed, the card forwards `0` to the number input.
- [ ] AC.2 — With no `placeholder` passed, the card forwards today's copy.
- [ ] AC.3 — The value passed reaches the **real `app-input` instance**, asserted on that instance — not on a call sequence, and not on a stub that cannot forward it (**KZ-001**).
- [ ] AC.4 — The Unit field's `min` / `maxFractionDigits` / `placeholder` are unaffected by the Number field's values.
- [ ] AC.5 — **With no `maxFractionDigits` passed, the card forwards `0`.** *(Added at Round 4. This is the one default in the spec whose **value** changes, `undefined` → `0`, and it had no acceptance criterion at all — it was asserted only in Details and inside a `BUT` clause. `design.md` §2.3 nominates "the **default itself**" as what discharges the `:220` clause, and until now nothing required it.)* **This AC turns two currently-green specs red on purpose** — `quantification-item.component.spec.ts:158` and `:163` both assert `toBeUndefined()`; updating them is in scope and is the visible proof the default moved.
- [ ] AC.6 — **With no `max` passed, the card forwards `Number.MAX_SAFE_INTEGER`** — today's value, so promoting `max` to an `@Input` is inert for every existing consumer.

#### Scenario: OICR keeps its floor because the card's defaults say so

- GIVEN the OICR details page rendering *Actual count* and *Extrapolated estimates*
- WHEN a reporter attempts `-1` or `2.5` in either card's Number
- THEN both are refused, exactly as today
- BUT it must NOT be asserted by **enumerating** which call sites pass what — that enumeration produced **four** different wrong figures across three rounds (`J-21`, `C-1`, `L-05`), which is the argument for relying on the default instead of counting consumers. **Amended under the additive-defaults ruling:** assert the card's default once, and assert the **rendered** integer behaviour once per OICR block (**KZ-002** still binds — the assertion is on what renders, it is simply no longer a census)
- AND IT MUST hold for **both** OICR blocks, not only the first.

---

### R-MSD-003 — The server accepts a signed, scale-bounded decimal, for this field only

- **As a** platform maintainer
- **I want** the relaxation confined to one DTO field
- **So that** no count field silently loses its floor

**Details**

- Inputs: `InnovationUseQuantificationDto.quantification_number` in the Innovation Use save body.
- Behavior: accepts any finite number with at most **4** fractional digits, either sign, within the scale-derived magnitude bound. Rejects a **fifth** fractional digit, a non-finite value, and a non-`number`.
- Outputs: `ServerResponseDto` — `201`/`200` with the saved section on success.
- Errors: `400` with the field-named message in `errors` for a value beyond the accepted scale.
- Permissions: unchanged — but **not** what the earlier text claimed. **Corrected at the round-2 re-judgment (`K-08`):** this endpoint has **no `@Roles(...)` and no `RolesGuard`** — `result-innovation-use.controller.ts:29` states *"section access is JWT + `ResultStatusGuard` only"* — and `assertInnovationUseOwnership` does **not** cover the quantification path. Nothing on the authorization axis is added or removed by this spec; the validation axis changes.

**Acceptance criteria**

- [ ] AC.1 — `-1500` is accepted (`2xx`).
- [ ] AC.2 — `2.5` is accepted.
- [ ] AC.3 — `-10.00005` is rejected `400`, and `errors` names `quantification_number`. *(Was `2.555` — **corrected at the round-2 re-judgment (`K-06`)**: at scale 4, `2.555` is **accepted**. Verified by execution: `isNumber(2.555, {maxDecimalPlaces: 4})` → `true`. The old AC was red against a correct implementation.)*
- [ ] AC.4 — `0` is accepted.
- [ ] AC.5 — `actors_count`, the four disaggregated counts and `organization_count` **still** reject `-1` and `2.5` with `400`.
- [ ] AC.6 — The envelope shape is unchanged on both the success and the `400` path.
- [ ] AC.7 — **A save whose measure row was never edited succeeds.** The value the client resends is whatever the previous read produced, and the endpoint's pipe carries no implicit conversion — so a read shape that is not a `number` turns an untouched row into a `400`. Added at the Phase 2 gate; see `design.md` §Executive Summary.

#### Scenario: An untouched measure row does not break the save

- GIVEN a saved Innovation Use section holding a measure whose Number is `2.5`
- WHEN the Contributor edits only the justification text and saves, never touching the measure
- THEN the save succeeds and the measure keeps `2.5`
- BUT it must NOT `400` — the resent value originates from the read path, not from the input control
- AND IT MUST be exercised with a value that came from a real read, never with a hand-written literal: a literal is always the right type and so can never go red (**K-012**).

#### Scenario: The relaxation does not leak to the siblings

- GIVEN a save body whose measure Number is `-2.5` and whose `actors_count` is `-1`
- WHEN the body is validated
- THEN the request is rejected `400`
- AND the `errors` payload names `actors_count`
- BUT it must NOT name `quantification_number` — that value is now valid
- AND IT MUST keep rejecting `2.5` on every one of the **six** count fields — the DTO carries seven `@Min(0)` in total, one of which is `quantification_number` itself, so there are six siblings, not seven (`J-05`).

---

### R-MSD-004 — Storage preserves sign and scale

- **As a** Result Contributor
- **I want** the number I saved to be the number I read back
- **So that** a reported quantity is not silently altered by the database

**Details**

- `result_quantifications.quantification_number` becomes `DECIMAL(24,4) NULL`.
- The `ALTER` is **non-destructive by construction**: `p − s = 20 > 19`, the maximum digit count of a signed `bigint`, so no existing value can be truncated whatever the table holds.
- Data requirement: no backfill. Existing integer values are representable unchanged.
- Migration filename pattern `<timestamp>-<camelCaseAction>.ts` under `src/db/migrations/`; append-only (**ADR-5**).

**Acceptance criteria**

- [ ] AC.1 — Saving `2.5` and reading the row back from MySQL yields `2.5`, not `3`.
- [ ] AC.2 — Saving `-1500` yields `-1500`.
- [ ] AC.3 — Every pre-existing row's value is unchanged after the migration, asserted by comparing before/after over the whole table, not a sample.
- [ ] AC.4 — The migration's `down()` restores `bigint NULL` and is executed to prove it. **A fractional value rounds, and a value wider than a signed `bigint` makes `down()` FAIL, not round** — corrected at the round-2 re-judgment (`K-07`). A test asserting only rounding will read a range error as a test bug.
  - ⚠️ **AMENDED 2026-08-27 — assert the PROPERTY, not an error number.** This AC previously named MySQL `1264`/`1406`. Those were **predictions** made in a reasoning round with no MySQL reachable to any judge. **Measured: the actual failure is `1292` / `ER_TRUNCATED_WRONG_VALUE`, sqlState `22007`.** A test asserting `errno === 1264` would go **red against correct behaviour** — the inverse of the very hazard this AC's own last sentence warns about. Assert instead: **(a)** the statement fails (any error), **(b)** the column type is unchanged afterwards, **(c)** no row is partially written. `1292` is the observed instance, not the contract — an errno is version- and `sql_mode`-dependent; the three-part property is not.
  - ⚠️ **Precondition:** whole-statement failure requires strict `sql_mode` (`STRICT_TRANS_TABLES` or `STRICT_ALL_TABLES`). Under a non-strict mode the same `ALTER` **clamps with a warning** instead — the one case that loses data silently. Measured on the scratch container (`8.0.46`): `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`. **Dev and Prod are unverified** — add `SELECT @@GLOBAL.sql_mode;` to `NFR-MSD-002`'s pre-flight at rollout.
- [ ] AC.5 — Restoration from `DD-18`'s backup table is executed at least once, because a bare `down()` cannot recover a fraction.
- [ ] AC.6 — The section read endpoint returns the fractional value such that the client renders it exactly (see `R-MSD-009`). *(Renumbered from a duplicate `AC.5` — `L-15`.)*

#### Scenario: A fraction survives the database

- GIVEN the migration applied to a schema holding a measure
- WHEN `2.5` is written through the Innovation Use save endpoint and the row is read directly with SQL
- THEN the stored value is `2.5`
- BUT it must NOT be `3`, `2`, or `2.5000` re-read as a different number
- AND IT MUST be proven at the **fixture tier against real MySQL** — a mocked repository cannot observe a column type (**KZ-017**).

---

### R-MSD-005 — The value survives the four lifecycle routines

- **As a** platform maintainer
- **I want** version, snapshot and delete to carry the new value shape
- **So that** a decimal is not silently rounded or dropped when a result is versioned

**Details**

- **Only `SP_versioning`'s copy path** names `quantification_number` (`1787083305648:367,380`) — corrected at the round-2 re-judgment (`K-22`). The other three routines reference the **table** only, so they can orphan rows but cannot lose a value. No routine body needs editing. **That is exactly why this requirement exists:** ADR-11's blind spot (i) is a schema change hidden under a name the routine already lists — a structural body diff cannot see it, and it applies to `SP_versioning` alone.
- Behavior: a measure carrying a negative fractional value is copied to the new version with sign and scale intact, and is not orphaned on delete.

**Acceptance criteria**

- [ ] AC.1 — After `SP_versioning`, the new version's `result_quantifications` row for role 3 holds the **same** value, including sign and fraction.
- [ ] AC.2 — The copy is compared by `SELECT *` on both sides with the identity/PK columns deleted before comparing — never against a hand-written column list (**ADR-11** column-coverage method).
- [ ] AC.3 — `SP_delete_result_version` leaves no orphaned row.
- [ ] AC.4 — `full_delete_result_version` leaves no orphaned row.
- [ ] AC.5 — `delete_result` deactivates in place without hard-deleting.
- [ ] AC.6 — The routine bodies are **unchanged** by this spec, and that is asserted, not assumed.

#### Scenario: Versioning does not round the fraction

- GIVEN an Innovation Use result whose measure Number is `-12.75`
- WHEN `SP_versioning` runs for that result
- THEN the new version's measure row holds `-12.75`
- BUT it must NOT be evidenced by diffing the routine's body — the body does not change, so a body diff reports green while the value is lost
- AND IT MUST be evidenced by a behavioral fixture that reads both rows out of MySQL.

> **Named gap this requirement closes.** `innovation-use-lifecycle-routines.fixture-spec.ts` covers `F13a` (level + explanation), `F13b` (actor counts) and `F13c` (`organization_count`). **No case covers `result_quantifications`.** The copy path for measures is unasserted today, at any tier.

---

### R-MSD-006 — A value beyond the supported scale is prevented at the control

- **As a** Result Contributor
- **I want** to be told the rule while typing
- **So that** I do not discover a `400` after filling the section

**Details**

- Behavior: a **fifth** fractional digit is prevented at the input. The client mirrors the server rule; the server remains the authority (**TRD §8.5**, PRD **AC-Role-Correctness**).
- **Reworked at the round-2 re-judgment.** Two claims this requirement rested on were falsified:
  - **`K-10`** — a message naming the scale limit has **no reachable trigger**. `p-inputNumber` prevents an over-scale keystroke, and its paste path runs `Intl.NumberFormat`, which **silently rounds** (executed: `format(2.55555)` with `maximumFractionDigits: 4` → `"2.5556"`). `app-input`'s own paste handler returns unless `type === 'text'`. So there is no client state in which an over-scale value exists to be reported.
  - **`K-09`** — the `Maximum reached` guard fires at 18 units. Counting **digits** instead of characters would make it unreachable at every call site *if* the scale-derived bound capped every configuration below 18 digits. ⚠️ **That premise was falsified by execution at Round 4:** `input.component.ts:166` measures `value.toString().length` — **characters, not digits** — and the string includes the sign and the decimal point. `-549755813886.9999` is **inside** DD-14's scale-4 bound and is **exactly 18 characters**, so the guard still fires. The "dead code" argument therefore dissolves.
- Resolution: the local rule is **prevention, not messaging** — the control refuses the fifth digit and the paste rounds it, and the server's `400` remains the authority for anything that reaches it. **The digit guard is NOT touched: `DD-7` is withdrawn, so it is neither re-united nor removed.** *(Round 4: this line previously read "removed rather than re-united". That was `DD-7` v2 residue and it contradicted `design.md` DD-7 four sections away.)* The surviving false positive on a long signed decimal is **pre-existing, cosmetic and out of scope** — declared as `RK-16` rather than designed away.

**Acceptance criteria**

- [ ] AC.1 — A fifth fractional digit does not reach the body — by prevention at the control, asserted on the rendered value.
- [ ] AC.2 — **No message is required, and none is added.** *(Was "the message names the limit" — **withdrawn**: `L-07`/`K-10` established there is no client state in which an over-scale value exists to report, because `p-inputNumber` prevents the keystroke and rounds a paste. `DD-16` is withdrawn; `app-input`'s existing messages are untouched.)*
- [ ] AC.6 — **`max` is a clamp, not a prevention, and the spec says so.** `L-07`: PrimeNG checks `max` only on blur/Tab/Enter/spinner, then silently clamps. Only `maxFractionDigits` is enforced per keystroke. This AC exists so no test asserts prevention where the control clamps.
- [ ] AC.3 — **The `Maximum reached` false positive is PINNED, not denied. It fires at scales 1–4; only scale 0 is clean.** ⚠️ **AMENDED 2026-08-27 (measured at `T-09`) — this is the SECOND correction of this AC, and the first one was still wrong.**

  **History, because it matters:** the original universal form (*"no in-bound value raises `Maximum reached` at any configured scale"*) was **UNSATISFIABLE**, and both Round-4 judges proved it by execution. Round 4 rewrote it to confine the exception to **scales 3–4**. **That rewrite fixed the direction of the claim but not its extent, and was itself false.**

  **Measured at `T-09`.** The guard is `value.toString().length >= 18` (`input.component.ts:167`, threshold at `:48` — a constant confusingly *named* `MAX_SAFE_INTEGER` while equalling `18`). Executed against `DD-14`'s bounds:

  | scale | largest in-bound signed rendering | `toString()` length | warns? |
  | --- | --- | --- | --- |
  | 0 | `-9007199254740990` | 17 | **no** |
  | 1 | `-562949953421310.5` | 18 | **YES** |
  | 2 | `-70368744177662.99` | 18 | **YES** |
  | 3 | `-8796093022206.999` | 18 | **YES** |
  | 4 | `-549755813886.9999` | 18 | **YES** |

  **So the false positive is not a scale-3/4 edge case — it fires on any in-bound value whose rendering reaches 18 characters, which is reachable at every scale except 0.** Scale 0 is clean not by design but by arithmetic: its bound is 16 digits, so with a sign it cannot exceed 17 characters.

  **What is required:** assert the warning is **absent** for in-bound values at **scale 0**, and **present** for the 18-character in-bound signed values at **scales 1–4**. Pin the defect where it actually is.

  ⚠️ **This widens `RK-16`.** The `Maximum reached` false positive has been treated throughout this spec as a narrow scale-3/4 artifact. It is a property of *character length versus a fixed threshold of 18*, and the affected surface is correspondingly larger. `RK-16` remains **declared and unfixed** — `DD-7` was withdrawn after three failed attempts because the guard's signal is shared with the `type === 'text'` 40,000-character paste path (`L-02`), and removing it would delete that feedback on every `app-input` in the application.

  **`T-09`'s tests are correct and are not invalidated by this amendment.** They pinned the representative values Round 4 named, and their `KZ-017` declaration explicitly disclaimed the universal quantifier — which is how this error was found. Extending the pin to scales 1–2 is a follow-up, routed to `T-12`, not a `T-09` defect.
- [ ] AC.5 — **The digit guard is asserted UNCHANGED** — same threshold, same unit (characters), same `type === 'number'` branch, and the `type === 'text'` paste-feedback path it shares is untouched. *(Round 4: this AC previously mandated *"the code that produced it is gone rather than merely unreachable"* — it required the very edit `DD-7`'s withdrawal removed, making it unsatisfiable by construction. `L-02` is the reason the edit was withdrawn: the signal is shared with the text branch, and deleting it removes 40,000-character paste feedback on **every** `app-input` in the app.)*
- [ ] AC.4 — The client rule is a mirror, not a replacement — the server's `400` path (`R-MSD-003` AC.3) still exists and is still exercised.

#### Scenario: No value inside the bound is warned about, and no value outside it is entered

- GIVEN the measure Number field at any configured scale
- WHEN the Contributor enters a negative value with four decimals at the top of the derived bound
- THEN the fifth fractional digit is refused at the control, and any `Maximum reached` warning that appears is the **known, pinned, pre-existing** character-count false positive — not a new defect and not a blocker
- BUT it must NOT be fixed by re-uniting the guard's threshold **or by removing the guard** — `DD-7` is withdrawn and `app-input` is not touched, because the signal is shared with the `type === 'text'` branch and removing it deletes paste feedback app-wide (`L-02`)
- AND IT MUST distinguish the two enforcement shapes instead of asserting one for both: **`maxFractionDigits` is a prevention** — refused per keystroke — while **`max` is a clamp**, checked only on blur/Tab/Enter/spinner (`L-07`, AC.6). **`min` is a prevention**: `allowMinusSign()` is `this.min == null || this.min < 0` (`primeng-inputnumber.mjs:1270`), so a `min` of `0` refuses the minus key per keystroke. Assert each on the rendered value, never on the absence of a message.

---

### R-MSD-007 — Every other numeric field keeps its floor and its integrality

- **As a** MEL Regional Expert
- **I want** person and organization counts to stay whole and non-negative
- **So that** a count remains a count

**Details**

- This is the **surviving scope of `R-IUP-008`**, restated here because that requirement's single clause is being split.
- Fields: `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`, `actors_count`, `organization_count`, plus OICR's *Actual count* and *Extrapolated estimates* Numbers.

**Acceptance criteria**

- [ ] AC.1 — Each of the six Innovation Use count inputs still refuses `-1` and `2.5` at the client.
- [ ] AC.2 — Each still returns `400` at the server (`R-MSD-003` AC.5).
- [ ] AC.3 — Both OICR quantification blocks still refuse `-1` and `2.5` (`R-MSD-002`).
- [ ] AC.4 — `R-IUP-008` in the archived spec is amended in writing to say which fields it still governs — the old text must not survive anywhere claiming `quantification_number` (**KZ-005**: sweep every axis, and re-grep the value the correction introduces).

---

### R-MSD-008 — The field's copy states the real rule

- **As a** Result Contributor
- **I want** the placeholder to describe what is allowed
- **So that** I am not told the opposite of the rule

**Details**

- The shared card's Number placeholder is today the literal `Enter a positive number`, and is now false for the Innovation Use call site.
- The OICR call sites keep the current copy via the input default (`R-MSD-002` AC.2).

**Acceptance criteria**

- [ ] AC.1 — The Innovation Use measure's Number placeholder does not contain the word "positive".
- [ ] AC.2 — The rendered placeholder is asserted in the DOM, not on the component property alone — a property assertion proves presence, not what the user sees.
- [ ] AC.3 — The OICR pages' placeholder is unchanged.

---

### R-MSD-009 — A decimal read from the API renders exactly

- **As a** Result Contributor
- **I want** the reloaded page to show what I saved
- **So that** `R-2` (resume without losing data) holds for decimals

**Details**

- MySQL `DECIMAL` is returned by the driver as a **string**. **Corrected (`L-17`):** seven `@Column('decimal', …)` declarations exist in four entities, and `bilateral.service.ts:669-686` already performs the null-safe read coercion, documented and unit-tested. Zero *transformers* is the one true half. The read shape still needed deciding; it did not need inventing.
- Evidence that the wire type is already loose: `oicr-details.component.ts:183,205` handles `number | string`, and `innovation-use-section-round-trip.fixture-spec.ts` compares with `Number(q.quantification_number)`. The Innovation Use client interface, by contrast, types it strictly `number | undefined`.

**Acceptance criteria**

- [ ] AC.1 — A section response carrying `-0.75` renders `-0.75` in the field.
- [ ] AC.2 — The same holds when the wire value arrives as the **string** `"-0.7500"`.
- [ ] AC.3 — Trailing zeros from the column's scale are not shown to the user as significant digits.
- [ ] AC.4 — No value renders as `NaN`, empty, or `0` when the wire value is a non-null decimal.
- [ ] AC.5 — The chosen read shape (transformer vs. widened client type) is applied on **one** path only — the two paths must not diverge, since both read the same column.

#### Scenario: A string on the wire is not a broken field

- GIVEN a saved measure whose Number is `-0.75`
- WHEN the page reloads and the API returns the value as the string `"-0.7500"`
- THEN the field renders `-0.75`
- BUT it must NOT render `-0.7500`, `NaN`, `0`, or empty
- AND IT MUST behave identically whether the wire type is `string` or `number`.

---

### R-MSD-010 — Reporting output for a decimal is decided, not discovered

- **As a** downstream consumer
- **I want** the OICR report output to remain correct
- **So that** a change scoped to Innovation Use does not silently alter an OICR export

**Details**

- Four migration **files** contain `report_field(rq.quantification_number, TRUE, TRUE)`: `1779903441021`, `1780590538118`, `1780672573009`, `1780694172676`. **Corrected at the Phase 2 gate (`J-12`):** the earlier text named two of them and attributed the other two to "the two SP-versioning families" — **no SP-versioning migration contains that expression.** Only the latest definition is live: **`report_oicr`** (`1780694172676:5`, sites at `:41` and `:48`), which filters `quantification_role_id = 1` and `= 2`, so **role 3 appears in no report view at all**.
- `DECIMAL(24,4)` renders `10.0000` where `bigint` rendered `10`, because `report_field`'s first parameter is `MEDIUMTEXT` and MySQL casts the column on the way in.
- Behavior: the rendering for both an integer and a fractional value is **stated** in `design.md` and verified before deploy.

**Acceptance criteria**

- [ ] AC.1 — `report_field` is **transcribed by reading it**, not described from memory (**D-10**).
- [ ] AC.2 — The rendered output is recorded verbatim from an executed query over **seven** cases: positive integer, **negative integer with trailing zeros (`-10.0000`)**, one decimal, two decimals, negative decimal, zero, and **`NULL`**. *(`NULL` added at the round-2 re-judgment — `K-12`: the column is nullable, NULLs demonstrably occur, and `NULL = TRUNCATE(NULL,0)` is `NULL`, so `IF()` takes the branch the design called unreachable.)*
- [ ] AC.3 — A decision is recorded: accept the new rendering, or normalise it — with the owner named.
- [ ] AC.4 — If normalising is chosen, it does not change the rendering of any other column.
- [ ] AC.5 — **The chosen expression is correct for a `bigint` column too.** A normaliser that is only correct while the column is `DECIMAL` is a latent corruption: `down()` reverts the column but not the view, and a trailing-zero trim then renders `'10'` as `'1'` with no error and no log. Added at the Phase 2 gate — see `design.md` §9.1.
- [ ] AC.6 — The expression uses no syntax gated on a MySQL version the Dev and Prod servers are not known to run (`design.md` `OQ-D5`). A view migration is append-only (**ADR-5**) and cannot be edited after it breaks a deploy.

#### Scenario: The OICR export does not change shape by accident

- GIVEN the OICR report view over a result holding an integer measure
- WHEN the view is queried after the migration
- THEN the rendered value is the recorded, decided string
- BUT it must NOT be asserted from reasoning about `DECIMAL` formatting — SQL formatting is outside every Jest tier (**ADR-11**)
- AND IT MUST be observed from an executed query whose output is pasted into the spec
- AND IT MUST include the `-10.0000` case, which is the one that distinguishes a `down()`-safe expression from a `DECIMAL`-only one.

---

---

### R-MSD-011 — OICR's Number is enforced as a non-negative integer, by default, with no OICR file edited

- **As a** OICR reporter
- **I want** my Actual count and Extrapolated estimates to keep behaving exactly as they do today
- **So that** a change made for another section does not alter my data

**Details**

- Added at the Judgment Day escalation. `J-01` established that OICR's integrality was enforced **only** by the `bigint` column: neither call site passed `maxFractionDigits`, `UpdateOicrDto` carries no `class-validator` decorators, and `result-oicr.controller.ts` applies **no `ValidationPipe` at all**. `DD-1` removes that column, so the protection has to be rebuilt explicitly.
- Behavior: both OICR blocks accept only non-negative integers, enforced **in one place — `ResultQuantificationsService.createCustomValidation(dataArray, dataRole)`, below both endpoints**. *(Round 4: this line previously named "(1) the call site's bound inputs and (2) `ResultOicrService`, immediately before the upsert" — a superseded **v2** mechanism that survived the additive-defaults sweep. `design.md` DD-12/DD-13 are authoritative: **no OICR file is edited**, and the client-side bound is a default the card supplies, not something a call site passes.)* **Revised at the round-2 re-judgment (`K-01`):** a `ValidationPipe` was the round-1 answer and is now explicitly rejected — `UpdateOicrDto` has no decorators on ~16 properties, so `whitelist: true` would delete every undecorated one, nulling `sharepoint_link` and deactivating all tags, links and impact areas on the first save. `design.md` DD-13 carries the reasoning.

**Acceptance criteria**

- [ ] AC.1 — **Neither OICR call site passes anything; both inherit the card's defaults of scale `0` and floor `0`, and the *rendered* integer behaviour is asserted once per OICR block.** ⚠️ **Rewritten at Round 4 — the previous form ("Both call sites pass an explicit scale of `0` and a floor of `0`") was the withdrawn round-1 DD-12 pin, and it was unsatisfiable without editing `oicr-details.component.html`, which `design.md` §4 forbids.** It also directly contradicted the `BUT` clause of `R-MSD-002`'s own scenario, which exists to stop exactly this enumeration. Assert the **default** on the card (`R-MSD-002` AC.5/AC.6) and the **rendered** behaviour per block (**KZ-002**).
- [ ] AC.2 — **`ResultQuantificationsService.createCustomValidation(dataArray, dataRole)` rejects** a negative, fractional, or out-of-range `quantification_number` for roles 1 and 2, on **both** upsert paths, with `400` — **selecting the rule from the `dataRole` parameter, never from a `quantification_role_id` on the payload.** *(The parameter source is load-bearing, not stylistic: `update-oicr.dto.ts` types its arrays as the full entity and its controller applies no pipe, so a payload-keyed map would let a client send `quantification_role_id: 3` and buy the permissive rule — Round 4, `M-01`.)* *(Was "`UpdateOicrDto` rejects" — **corrected under the additive-defaults ruling**. An undecorated DTO cannot reject anything, and decorating it would re-introduce `K-01`'s data destruction. `update-oicr.dto.ts` is not edited.)*
- [ ] AC.3 — **The rejection surfaces as a `400` through `GlobalExceptions`, raised from the shared validator — and `result-oicr.service.ts` is asserted UNCHANGED (`git diff --exit-code` on the file).** ⚠️ **Rewritten at Round 4.** The previous form mandated *"`ResultOicrService` rejects a violating row before the upsert runs"*, i.e. an edit to an OICR file — the superseded **v2** DD-13, contradicting AC.2 immediately above it and `design.md` §4. AC.2 was corrected by the additive-defaults sweep; AC.1 and AC.3, on either side of it, were not. **No `ValidationPipe` is added to this controller** — `design.md` DD-13 records why: `UpdateOicrDto` carries no decorators on ~16 properties, and `whitelist: true` would delete every undecorated one, nulling `sharepoint_link` and deactivating all tags, links and impact areas on the first save (`K-01`).
- [ ] AC.6 — **A `null` or omitted `quantification_number` is accepted on roles 1 and 2, not rejected as "not a non-negative integer".** *(Added at Round 4.)* The column is `nullable: true` and `DD-2`'s `null → null` contract is load-bearing for `quantificationRowAbsent`; the rule map must skip null explicitly on **every** entry including the default. The two paths deliver different null shapes — OICR coerces `q.number ?? 0` client-side (`L-08`, pre-existing and unfixed here), Innovation Use preserves `null` — so this is asserted on the **server**, per role, not inferred from either client.
- [ ] AC.7 — **An existing negative role-1/2 row is enumerated before the change ships.** *(Added at Round 4 — see `RK-14`.)* The `bigint` column is **signed**, so negatives were storable; the pre-flight in `NFR-MSD-002` must report whether any exist, because after this change such a row `400`s on a save the reporter never made.
- [ ] AC.4 — OICR's magnitude cap is **unchanged** — scale `0` keeps `Number.MAX_SAFE_INTEGER`. A 12-digit value already in use must still be accepted.
- [ ] AC.5 — The `quantification-item` comment stating that the `undefined` default "reproduces today's Intl resolution exactly" is updated; it documents an intent this requirement supersedes.

#### Scenario: The API stops silently rounding

- GIVEN a machine client that sends `2.5` as an OICR actual count
- WHEN the request is validated
- THEN it is rejected `400`, naming the field
- BUT it must NOT be silently rounded to `3` and stored, which is today's behaviour
- AND IT MUST be announced to consumers before it ships — this is a contract tightening on a live endpoint (`NFR-MSD-005`).

---

### R-MSD-012 — Scale and magnitude are parameters with a declared domain

- **As a** maintainer
- **I want** the field's scale and bound configured per call site, within a validated range
- **So that** a future section can be given decimals without re-deriving what is numerically safe

**Details**

- Scale is a parameter whose domain is **0–4**; 4 is the column's scale, and a larger value would let the UI accept precision the database drops.
- The magnitude bound is **derived from the scale**, never set independently: `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1`, `min = −max`. **Third formulation, and the only one verified by execution.** The condition that matters is that the double's spacing never exceed the decimal grid — `ulp(v) ≤ 10^-scale`. Round 1 used a digit count on a false premise (`0.1` and `2.55` are admitted and are not exactly representable); round 2 used `⌊(2⁵³−1)/10^scale⌋`, which keeps the *scaled integer* representable but not the *value* — `L-01` measured **3,616 of 20,000** values colliding near its scale-4 bound. This formula measures **zero** collisions and **zero** round-trip failures at every scale, and scale 0 falls out as `Number.MAX_SAFE_INTEGER` with no exemption.
- `max` is an `@Input` on `app-input` whose **default is today's `Number.MAX_SAFE_INTEGER`**, so no call site outside the shared card is affected.

**Acceptance criteria**

- [ ] AC.1 — A scale outside `0…4` is rejected as a configuration error, not silently clamped.
- [ ] AC.2 — At scale 4 the bound is ±**549,755,813,887**; at scale 0 it is ±`Number.MAX_SAFE_INTEGER` **as a consequence of the formula, not as a special case**. *(The scale-4 value was 99,999,999,999, then 900,719,925,474; only this one is verified by execution — `design.md` §6.2.)*
- [ ] AC.3 — **The bound is DERIVED from the scale at the point of configuration, not passed independently** — the Innovation Use call site computes `max` from its scale rather than hard-coding a literal, so the two cannot drift apart. ⚠️ **Rewritten at Round 4.** The previous form — *"The bound cannot be set to a value inconsistent with the scale"* — asserted an **impossibility the design does not provide**: `max` and `maxFractionDigits` are two independent `@Input`s with no cross-check anywhere, so scale `4` with `max = 9007199254740991` is trivially settable. An AC demanding that a settable thing be unsettable can never go green. If a stronger guarantee is wanted later, the card would have to derive `max` internally from `maxFractionDigits` — a different decision, **not** what DD-14 specifies.
- [ ] AC.4 — Both bounds are asserted on the **real** `app-input` instance, not on a call sequence (**KZ-001**).

---

### R-MSD-013 — A save preserves row identity

- **As a** Result Contributor
- **I want** saving to update my existing measure rows
- **So that** their ids, audit fields and version references survive

**Details**

- Added at the Phase 2 gate. `quantification_number` is part of the upsert's **composite identity key** (`['quantification_number','unit','description']`, compared as a string). A read/write shape mismatch therefore does not merely fail validation — it fails to *match*, and the upsert deactivates the existing row and inserts a duplicate.
- On the OICR path, which has no validation today, this happens with **no error and no log**.

**Acceptance criteria**

- [ ] AC.1 — Saving a section whose measure rows are unmodified leaves their primary keys unchanged.
- [ ] AC.2 — `created_by` / `created_at` are unchanged on those rows. ⚠️ **AMENDED 2026-08-27 — the two halves have DIFFERENT causes and only one is satisfiable.**
  - **`created_at` — SATISFIABLE, now asserted** (`T-07`). It is a `@CreateDateColumn` (`auditable.entity.ts`) appearing in **no** `audit()` payload, so TypeORM never writes it on an update. Asserted by raw SQL before/after an untouched resave at three sites (the IU round-trip and both OICR role tests); `created_at`/`created_by` are `select: false`, so raw SQL is the only route.
  - **`created_by` — UNSATISFIABLE against current code, and the unsatisfiability is a REACHABLE PRE-EXISTING DEFECT this AC correctly identified.** Mechanism, verified at source: `base-service.ts:440-446` applies `...this.currentUser.audit(SetAuditEnum.BOTH)` via `.map()` to **every** row in `finalDataToSave`, **including the reused/untouched branch** at `:394-402`; `current-user.util.ts:57-59` shows `BOTH` returns `{ created_by, updated_by }`. So `created_by` is rewritten to the acting user on **every** resave.
  - **The reachable failure, as ordinary collaborative editing:** user A saves a measure row → user B opens the same section and saves **without touching it** → `created_by` becomes **B**. Row authorship is destroyed, with no error and no log.
  - **Not fixed here.** `base-service.ts` is a shared base class every entity service inherits; changing its audit semantics is far outside this spec's scope. **Routed to [`tasks.md`](./tasks.md) §8's *Reported, not owned* list as `AUDIT-1`, for a ticket.** Do **not** assert `created_by` immutability in a fixture — it would assert something false against shipped code.
- [ ] AC.3 — No row is deactivated and re-inserted as a side effect of an unmodified save.
- [ ] AC.4 — The same holds on the **OICR** path, asserted separately.
- [ ] AC.5 — Proven at the fixture tier by reading primary keys before and after — a unit test cannot observe row identity.

#### Scenario: An unmodified save does not churn rows

- GIVEN a saved section with two measure rows read back from the API
- WHEN the section is saved again with no field modified
- THEN both rows keep their primary keys and audit fields
- BUT it must NOT deactivate either row or insert a duplicate
- AND IT MUST be seeded from a real read, never from hand-written literals (**K-012**).

## 7. Non-Functional Requirements

### NFR-MSD-001 — The migration is non-destructive and reversible

- **Category:** reliability / data integrity
- **Target:** zero rows altered in value; `up()` and `down()` both execute cleanly against a bootstrapped scratch schema; `p − s ≥ 19` so truncation is impossible **by construction**, not by measurement
- **How verified:** `migration:test:bootstrap` then `migration:test:execute`, a whole-table before/after value comparison, then `migration:test:revert`
- **Constraint:** the Dev database is **remote and shared, not disposable** (root `CLAUDE.md` §4.3). Applying this migration to Dev is a **human decision**, and the pipeline deploys code but **not** migrations (**K-015**) — a merge does not ship the schema

### NFR-MSD-002 — The precision choice carries its evidence

- **Category:** dx / auditability
- **Target:** the **migration task's `execution.md` entry** records the executed pre-flight command **and its output**, not a derived claim. *(Revised at the Phase 2 gate: the earlier target named `design.md`, which cannot reach a database — `J-09` correctly found it unmet, and a target no phase can satisfy is a gate that fails by construction.)*
- **How verified:** **two** queries, both with output pasted verbatim.
  1. `SELECT COUNT(*), MIN(quantification_number), MAX(quantification_number), MAX(LENGTH(TRIM(LEADING '-' FROM quantification_number))) FROM result_quantifications;`
  2. **Added at Round 4** — `SELECT quantification_role_id, COUNT(*) FROM result_quantifications WHERE quantification_number < 0 GROUP BY quantification_role_id;`
- **Why query 2 exists, and why query 1 could not answer it:** query 1 has **no role filter**, so it reports a global `MIN` that says nothing about *which* role holds it. `baseline.sql:3789` shows the column is `bigint` — **signed** — so `DD-13`'s default entry refusing negatives on roles 1 and 2 is a **new** restriction rather than the restoration `design.md` DD-13 originally claimed. **If query 2 returns any row for role 1 or 2, that row `400`s on the next OICR save the reporter never made** (`oicr-details.component.ts` resends every row), and the change stops for a ruling exactly as an over-bound role-3 row does. The UI has always passed `[min]="0"`, so such rows could only have arrived via a machine client or a direct write — plausibly zero, **but unproven, and "plausibly zero" is not a measurement** (`RK-14`)
- **Note — changed at the round-2 re-judgment (`K-02`): the pre-flight is now BLOCKING.** The column `ALTER` is lossless regardless of the data (`p − s = 20 > 19`), so *that* half stays confirmatory. But `design.md` DD-14's scale-4 bound **narrows the accepted magnitude** of a live field, so the query must also report whether any existing role-3 row exceeds it — and if one does, the change **stops** rather than `400`-ing on a save the user never made. A precision claim with no executed command behind it remains the `KZ-008` failure mode

### NFR-MSD-003 — Existing quality floors hold

- **Category:** dx
- **Target:** server Jest coverage ≥ 60%; client floors ≥ 40 statements / 20 branches / 45 lines / 30 functions; `angular.json` budgets unchanged; both packages' lint clean via the **gate** invocations (`npx eslint <path>` server, `npm run lint -- --quiet` client — `npm run lint` on the server carries `--fix` and cannot verify, **K-001**)
- **How verified:** `npm test -- --silent` in each package, `npm run build`
- **Explicit non-target:** SQL logic sits **outside** the Jest coverage figure (**ADR-11**). A green 60% must not be read as coverage for `R-MSD-004`, `R-MSD-005` or `R-MSD-010`

### NFR-MSD-005 — The OICR API tightening is communicated before it ships

- **Category:** compliance / dx
- **Target:** MEL / product owner, the OICR reporting owner, and any partner platform using `PATCH /api/v1/result-oicr/:result-code` are notified before the validation lands, because a request that succeeds today with a rounded value will return `400`
- **How verified:** a comms record in `execution.md` naming who was notified and when. **There is no automated gate for this** — it is a human step, recorded as such rather than assumed

### NFR-MSD-004 — No new accessibility regression from the changed states

- **Category:** a11y
- **Target:** **no message is added** (`DD-16` withdrawn), so this NFR reduces to: the field keeps its label association, its existing messages are unchanged, and it remains keyboard-operable including the spinner
- **How verified:** client a11y assertions in the component spec, plus a human visual check at the HITL pause (see `DC-11`)
- **Accepted pre-existing debt, NOT introduced here:** `RB-5`'s eyebrow at **2.9115:1** and `OQ-IUP-8`'s `.section-title` at **2.378:1** remain live and unticketed

---

## 8. Defect classes and their gates

**A gate blind to the defect class this spec most often produces is not a gate.** Enumerated first, then mapped.

| # | Defect class | Concrete failure | Gate that catches it | Can it go red? |
| --- | --- | --- | --- | --- |
| **DC-1** | UI clamp not actually relaxed | bindings added but `p-inputNumber` still refuses `-1` | client unit test asserting the effective value **on the real `app-input`/`p-inputNumber` instance** | yes — revert `min`, test reddens |
| **DC-2** | **Shared-card regression** — OICR silently widens | OICR accepts `2.5` | OICR call-site assertions **+ full client suite**, never a targeted run (**KZ-003**) | yes — drop the OICR default, test reddens |
| **DC-3** | Server validation mis-scoped | `@Min(0)` dropped from a sibling count, or scale/magnitude left unbounded | DTO unit test over an accept/reject table covering **all seven** numeric fields in the DTO (six siblings + `quantification_number`) | yes — remove a sibling `@Min(0)`, test reddens |
| **DC-4** | **Storage truncation** | `2.5` stored as `3` | **fixture tier** round-trip against real MySQL | yes — omit the migration, fixture reddens |
| **DC-5** | **Lifecycle data loss under an unchanged column name** (ADR-11 blind spot i) | `SP_versioning` copies the column but loses the fraction | **behavioral fixture** reading both rows out of MySQL | yes — seed a fractional value against the un-migrated column, fixture reddens |
| **DC-6** | Read-shape defect | field renders `NaN` / `0` / `-0.7500` | client unit test with a **string** wire value + fixture round-trip | yes — feed the string form, test reddens |
| **DC-7** | **Report-view formatting regression** | OICR export shows `10.0000` | **fixture query against `report_oicr` in the scratch schema** over the **seven** cases — `baseline.sql:6559` ships `report_field` and the view, so this gate exists after all (`J-02`) | yes — query the un-normalised view, `10.0000` renders |
| **DC-8** | Precision loss on the `ALTER` | an existing 19-digit value truncated | `p − s ≥ 19` (structural) + whole-table before/after comparison | yes — set `p − s = 18`, comparison reddens |
| **DC-9** | Stale copy | placeholder still says "positive" | client unit test on the **rendered DOM** placeholder | yes — revert the copy, test reddens |
| **DC-10** | **False `Maximum reached` on a legitimate signed decimal** | *(reframed again at Round 4)* the guard counts **characters** at a threshold of 18, and an in-bound signed 4-decimal value reaches exactly 18 — so it fires on a legitimate value. The round-2 framing offered "dead **or** false" as the two defect shapes; execution settled it as **false**, and `DD-7`'s withdrawal means the code stays | client unit test **pinning** the boundary: no warning for any in-bound value at scales 0–2, warning **present** for the known 18-character signed values at scales 3–4 (`R-MSD-006` AC.3), plus an assertion that the guard and its shared `type === 'text'` paste path are byte-unchanged | yes — change the threshold or the unit, the pinned boundary reddens |
| **DC-11** | **Visual/a11y regression in the changed field states** | the new message is unreadable in light theme | ⚠️ **no automated gate** — jsdom cannot measure contrast or layout | n/a |
| **DC-14** | **Report normaliser correct only for `DECIMAL`** (found at the Phase 2 gate) | `down()` reverts the column, the view keeps a trailing-zero trim, and every OICR integer ending in `0` renders one order of magnitude smaller | executed query over the **seven** cases **including `NULL` and a `bigint` column**, not only the migrated one | yes — run the trim against a `bigint` column, `'10'` renders `'1'` |
| **DC-15** | **Validation crash instead of rejection** (found at the Phase 2 gate) | a body carrying `1e-7` raises an unhandled `TypeError` inside `class-validator` and surfaces as a `500`, where `@IsInt()` returned a clean `400` | server unit test asserting a `400` for `1e-7`, `-1e-7` and `1e21` | yes — verified by execution: `isNumber(1e-7, {maxDecimalPlaces:2})` throws today |
| **DC-16** | **Silent row replacement on save** | an unmodified save deactivates existing rows and inserts duplicates, because the value is part of the upsert key and the read shape changed. **No error, no log** — and on the OICR path no validation fires first | fixture comparing primary keys and audit fields across an unmodified save, on **both** paths | yes — remove the transformer, keys change |
| **DC-13** | **Resave of an untouched row rejected** (found at the Phase 2 gate) | editing only the justification `400`s because the measure's resent value is not a `number` | server DTO test + fixture round-trip **seeded from a real read**, never a literal | yes — remove the read transformer, test reddens |
| **DC-12** | Correction not closed | `R-IUP-008` still claims to govern `quantification_number` | forward **and backward** grep sweep of the superseded clause (**KZ-005**, **KZ-013**) | yes — leave one site, sweep reddens |

### Classes with no automated gate — substituted, not ignored

| # | Why no automated check | Substitute |
| --- | --- | --- |
| ~~DC-7~~ | **Withdrawn.** The claim that no Jest tier executes the views was **false** — `migration:test:bootstrap` loads `baseline.sql`, which contains both `report_field` (`:6559`) and the `report_oicr` view, and fixtures already run raw SQL. `DC-7` and `DC-14` are automated (`design.md` DD-11). Asserting a limit is honest only when the limit is real (**KZ-017**) |
| **DC-11** | jsdom cannot evaluate contrast or rendered layout, and a checker that returns "incomplete" without failing has evaluated nothing | **Human visual check at the HITL pause**, or a **T6 Multimodal** review of a screenshot of the field in both themes and in error state |

### Accepted risks — unmeasurable and unsubstituted

| # | Risk | Why accepted |
| --- | --- | --- |
| **AR-1** | JS `number` loses integer precision above 2⁵³, so a value near the column's ceiling cannot round-trip exactly through the client | **Corrected at the round-2 re-judgment (`K-02`).** The earlier text claimed this spec introduces no magnitude bound. It does: the scale-derived bound. Under the revised formula (`design.md` DD-14) scale 0 lands **exactly** on `Number.MAX_SAFE_INTEGER`, so the integer-only case is genuinely unchanged; scale 4 caps at **549,755,813,887**. **The narrowing for scale-4 values is real and is gated** — `NFR-MSD-002`'s pre-flight is now **blocking**: an existing row above the bound stops the change rather than `400`-ing on a save the user never made |
| **AR-2** | A `down()` revert rounds any fractional value already saved, **and FAILS outright on a value wider than a signed `bigint`** | Inherent to reverting a scale. Corrected at the round-2 re-judgment (`K-07`) — the earlier text said only "rounds", which made `NFR-MSD-001`'s "both execute cleanly" unreachable on real data without saying so. `DD-18`'s backup table is the restoration path; `R-MSD-004` AC.4/AC.5 carry it |

---

## 9. Assumptions, dependencies, risks

### Assumptions

| # | Assumption | If wrong |
| --- | --- | --- |
| A-1 | The target is the **Innovation Use** details page (confirmed before Phase 1; `proposal.md` `OQ-1`, renumbered here as `OQ-5` — see the Document Control note, `K-25`) | The whole spec targets the wrong surface |
| A-2 | **4** decimals in UI, DTO **and** column (revised by user ruling at the escalation) | The DTO value and `maxFractionDigits` change; the column does not, by design |
| ~~A-3~~ | ~~OICR is excluded~~ — **WITHDRAWN at the Judgment Day escalation.** `J-01` established that OICR's integrality was enforced **only** by the `bigint` column, which `DD-1` removes, so excluding OICR was not a smaller change — it was an unenforced one. OICR is now protected at two tiers, **both by default** (`R-MSD-011`) |
| ~~A-4~~ | ~~No new magnitude bound is introduced~~ — **FALSE, corrected (`L-06`).** `DD-14` does introduce one for scale-4 callers. It is declared as a genuine narrowing in `design.md` §13 and **gated by `NFR-MSD-002`'s blocking pre-flight**. Scale-0 callers are unaffected, because the formula lands them on today's value |
| ~~A-5~~ | ~~No other reader beyond the three roles, the four routines and the report views~~ — **FALSIFIED** (`J-08`). Two readers were missed: **`upsertByCompositeKeys`**, which uses the value as part of the row's *identity* key, and **`oicr_validation`**, which tests `quantification_number IS NOT NULL` (`J-27`). The first is why `R-MSD-013` exists; the second is sign-agnostic and unaffected |

### Dependencies

| Dependency | State |
| --- | --- |
| `innovation-use` family chunks 1–3 | all **archived**; this modifies their shipped code |
| Fixture tier (`test:fixtures`, `migration:test:bootstrap`) | **exists and is in use** — 13 innovation-use fixtures. No new harness needed (**KZ-006** cost avoided) |
| `innovation-use-section-round-trip.fixture-spec.ts` | exists; already round-trips two quantifications with integer sentinels. Extend it |
| `innovation-use-lifecycle-routines.fixture-spec.ts` | exists; **has no quantification case**. Add one |
| A disposable MySQL schema | required for `R-MSD-004`, `R-MSD-005`, `R-MSD-010` |

### Risks

`RK-1`…`RK-8` from [`proposal.md`](./proposal.md#risks-dependencies-and-open-questions) carry forward. Updated by this phase:

| ID | Change since the proposal |
| --- | --- |
| **RK-4** | **Downgraded from High to Low.** The proposal treated `(p,s)` as blocked on a measurement. Choosing `p − s = 20` makes the `ALTER` lossless **by construction** for any `bigint`, so the losslessness half of the pre-flight is confirmatory. **But the pre-flight itself is BLOCKING** (`NFR-MSD-002`, `L-06`), because `DD-14`'s scale-4 bound narrows a live field and an existing row above it must stop the change |
| **RK-5** | **Unchanged in severity, now owned** by `R-MSD-010` with an **automated fixture gate** (`design.md` DD-11). *(Corrected at the round-2 re-judgment `K-22`: this row still named the human substitute that `DC-7` withdrew.)* |
| **RK-9** *(new)* | **The measure copy path is unasserted at every tier** — no fixture covers `result_quantifications` in `SP_versioning`. Discovered while surveying the fixture set. Owned by `R-MSD-005` |
| **RK-10** *(new)* | ~~`DECIMAL` has no precedent in this repo~~ — **FALSE, corrected twice.** **Seven** `@Column('decimal', …)` declarations exist in four entities (`J-16`), and `bilateral.service.ts:669-686` **already performs exactly the null-safe read coercion `DD-2` mandates**, documented and unit-tested (`K-18`). The authoring grep searched `type: 'decimal'` and could not match the positional form — a `KZ-017` scope failure in this spec's own authoring. "Zero transformers" is the one true half. The read-shape decision still needed making; it did **not** need inventing |
| **RK-13** *(new, Round 4)* | **The OICR rejection is not atomic.** `updateOicr` (`result-oicr.service.ts:190`) opens no transaction and threads no `EntityManager`, unlike the Innovation Use path. It commits the header (`:199`), tags (`:220`) and external OICRs (`:228`) **before** the quantification upserts (`:234`, `:241`) — so `DD-13`'s `400` arrives with those writes persisted, and an invalid *estimate* rejects after `actual_count` rows were already deactivated and reinserted. **Today's silent rounding has no such failure mode; this one is created by moving the rule below the endpoint.** Accepted because the fix — wrapping `updateOicr` in a transaction — is an OICR-file edit this spec exists to avoid, and doing it here would smuggle a behaviour change through the wrong door (family `FR-9`'s lesson). **Declared, not closed**; worth its own ticket |
| **RK-14** *(new, Round 4)* | **The default rule tightens the SIGN axis, not just the fraction axis, and this was mis-stated for three revisions.** `bigint` is signed (`baseline.sql:3789`), so negatives on roles 1 and 2 were storable and are now refused. Every prior statement calling the default entry *"today's effective behaviour"* was false on this axis. **Gated** by `NFR-MSD-002`'s second pre-flight query and `R-MSD-011` AC.7; if a negative role-1/2 row exists, the change stops for a ruling |
| **RK-15** *(new, Round 4)* | **`DD-13`'s "a future caller cannot bypass it" is true for every live writer, and false in the absolute.** `upsertQuantificationsByRole` (`result-quantifications.service.ts:32-115`) writes via `this.mainRepo.save` at `:112` without traversing the base class, and duplicates the composite-key logic at `:56-62` — so it is also a second, independent site of §5.3's identity hazard. It has **no production caller** (only its own spec and a mock at `result-oicr.service.spec.ts:184`), but it is `public` and unit-tested, so it reads as maintained API. Accepted as-is; the honest claim is *"structural for both live paths"* |
| **RK-16** *(new, Round 4)* | **`app-input`'s `Maximum reached` false positive survives on long signed decimals.** The guard counts **characters** at a threshold of 18 (`input.component.ts:166`), and an in-bound scale-4 value such as `-549755813886.9999` is exactly 18. `DD-7` is withdrawn, so the guard is not touched. **Pre-existing, cosmetic, and now pinned by `R-MSD-006` AC.3 rather than denied** — the round-2 design had reasoned it out of existence on a digit-counting premise that execution falsified |
| **RK-12** *(new, Phase 2 escalation)* | **`R-MSD-011` tightens a live API contract.** A machine client sending a fractional OICR count receives `2xx` + a rounded value today and a `400` after. No such client is enumerable from the repo, and the endpoint accepts machine tokens. **Mitigation is comms (`NFR-MSD-005`), not code** — recorded rather than dismissed |
| **RK-11** *(new, Phase 2)* | **The naive migration breaks the save path for untouched rows.** `mysql2` returns `DECIMAL` as a **string** by default; the page resends the read value verbatim; the endpoint's pipe has no implicit conversion → `400`. *(Mechanism corrected at the round-2 re-judgment `K-22`: `bigNumberStrings: false` is **inert** without `supportBigNumbers`, which is set nowhere — today's `number` comes from mysql2's default `LONGLONG` parse. Deleting `orm.config.ts:53` would change nothing.)* **Severity High, closed by DD-2**, and it is why `R-MSD-003` AC.7 exists. Every manual test that *types* in the field would have passed |

---

## 10. Open questions

| ID | Question | Owner | Target | Blocks |
| --- | --- | --- | --- | --- |
| **OQ-1** | Report rendering (`R-MSD-010` AC.3): accept `10.0000` in OICR exports, or trim trailing zeros at the view? | Product owner + engineering lead | before the migration task | the `R-MSD-010` decision only; nothing upstream |
| ~~OQ-2~~ | ~~Read shape: transformer or widened client type?~~ **RESOLVED at the Phase 2 gate → `design.md` DD-2** (server column transformer as the single normalising path) **+ DD-3** (defensive coercion at the existing client adapter) | — | — | — |
| **OQ-3** | Target branch — continue on `AC-1679-Create-the-innovation-use-section`, or branch from `main`? The task template says branch from `staging`/the current integration branch and **confirm with the engineering lead** | You | before execution | execution setup |
| ~~OQ-4~~ | ~~Spinner step: whole units or `0.01`?~~ **RESOLVED at the Phase 2 gate → `design.md` DD-6**: keep `p-inputNumber`'s default of `1`. No binding, no code | — | — | — |
| ~~OQ-5~~ | ~~Which page?~~ **RESOLVED at this gate → Innovation Use details** (`A-1`) | — | — | — |
| ~~OQ-6~~ | ~~How many decimals?~~ **RESOLVED → 4 in UI, DTO and column** (`A-2`). *(This row said "2 in UI/DTO, scale 4 in DB" until the round-2 re-judgment — `K-06`. Revised by user ruling at the Judgment Day escalation.)* | — | — | — |
| ~~OQ-7~~ | ~~Does it extend to OICR?~~ **RESOLVED → YES, it does** — `R-MSD-011`. *(This row said "no" until the round-2 re-judgment — `K-06`. Reversed by user ruling at the escalation; `A-3` is struck and `NG-1` withdrawn.)* | — | — | — |

---

## 11. Requirement ID Index

| ID | Title | Tier | Priority | Defect classes |
| --- | --- | --- | --- | --- |
| R-MSD-001 | Measure Number accepts signed, four-decimal values | client | Must | DC-1 |
| R-MSD-002 | Shared card parameterized without changing existing consumers | client | Must | DC-2 |
| R-MSD-003 | Server accepts a signed, scale-bounded decimal — this field only | server | Must | DC-3, **DC-15**, DC-13 |
| R-MSD-004 | Storage preserves sign and scale | db | Must | DC-4, DC-8 |
| R-MSD-005 | The value survives the four lifecycle routines | db | Must | DC-5 |
| R-MSD-006 | Out-of-rule values prevented at the control | client | Must | DC-10 |
| R-MSD-007 | Every other numeric field keeps its floor and integrality | both | Must | DC-3, DC-2, DC-12 |
| R-MSD-008 | The field's copy states the real rule | client | Must | DC-9 |
| R-MSD-009 | A decimal read from the API renders exactly | client | Must | DC-6, DC-13 |
| R-MSD-010 | Reporting output for a decimal is decided, not discovered | db/reporting | Should | DC-7, DC-14 |
| R-MSD-011 | OICR's Number enforced as a non-negative integer, by default, no OICR file edited | both | **Must** | DC-2, DC-16 |
| R-MSD-012 | Scale and magnitude are parameters with a declared domain | client | Must | DC-1, DC-3 |
| R-MSD-013 | A save preserves row identity | both | **Must** | DC-16 |
| NFR-MSD-001 | Migration non-destructive and reversible | db | Must | DC-8 |
| NFR-MSD-002 | Precision choice carries its evidence | dx | Must | — |
| NFR-MSD-005 | The OICR validation tightening is communicated before it ships | comms | Must | — *(a comms NFR has no automated defect class; the earlier `DC-16` mapping was wrong — `K-23`)* |
| NFR-MSD-003 | Existing quality floors hold | dx | Must | DC-2 |
| NFR-MSD-004 | No new accessibility regression | client | Should | DC-11 |

---

## 12. Sign-off

- [ ] Engineering lead — pending
- [ ] MEL / product owner — pending (owns `OQ-1`; `OQ-4` closed at the Phase 2 gate by DD-6)
- [ ] Security review — **REQUIRED**. *(Was "not required", waived by citing `R-MSD-003` Permissions — a sentence the judges falsified. Corrected at the round-2 re-judgment, `K-08`.)* No role, guard or secret changes, but the spec adds **validation to a previously unvalidated mutation endpoint** (`R-MSD-011`) over live production data, and it does so in the service layer rather than a pipe for a reason a reviewer should see (`design.md` DD-13)
- [ ] DevOps — **required**: the migration is applied to a shared database by human decision, and the pipeline does not apply migrations (`NFR-MSD-001`)
