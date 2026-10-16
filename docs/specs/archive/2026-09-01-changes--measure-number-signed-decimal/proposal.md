# Proposal — Measure `Number` accepts signed decimals

> **One field, three tiers.** The *Other quantitative measures* → **Number** input on the Innovation Use details page must accept **positive, negative and decimal** values. Today it is blocked at all three tiers independently: the shared UI card, the server DTO, and the MySQL column type.


> ## ⚠️ SUPERSEDED IN PART — read this first
>
> This proposal is the **point-in-time intent record**. It is retained verbatim; several of its decisions and two of its factual claims were overturned downstream, and `requirements.md` §4.3 / §9 import from this file **by reference**, so the divergence is listed here rather than left for a reader to discover (`K-26`).
>
> | This proposal says | Current decision |
> | --- | --- |
> | `NG-1` — OICR's *Actual count* / *Extrapolated estimates* are a non-goal | **WITHDRAWN.** OICR is in scope — `R-MSD-011`, `design.md` DD-12 + DD-13 |
> | `OQ-2` → "enforce 2 decimals in UI + DTO, store scale 4" | **4 decimals in UI, DTO and column** |
> | `OQ-3` → "No, it does not extend to OICR" | **Yes** — the column is shared and nothing else enforced OICR's integrality |
> | `OQ-7` → "no business floor; bound only by the column" | Bounded by `design.md` DD-14: `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1` → **549,755,813,887** at scale 4 |
> | `RK-3` — "**zero** `type: 'decimal'` columns and **zero** transformers; no precedent to copy" | **False.** Seven `@Column('decimal', …)` in four entities, and `bilateral.service.ts:669-686` already performs the coercion. Zero transformers is the one true half |
> | `RK-5` — two of the four report migrations are "the two SP-versioning families" | **False.** All four are OICR report-view migrations; no SP-versioning migration contains that expression |
> | "the **seven** person-count fields" (§Problem, §Delta) | **Six** siblings — the seventh `@Min(0)` is `quantification_number` itself |
> | Scope item 3 + `RK-7` — "count **digits**, not characters" in `app-input`'s guard | **WITHDRAWN.** The guard is not touched at all (`design.md` DD-7) — removing or re-uniting it deletes paste feedback app-wide (`L-02`) |
> | ADDED bullet + **`SC-3`** — "refused locally, with a message **naming the limit**" | **WITHDRAWN** (`DD-16`). There is no client state in which an over-scale value exists to report |
> | `OQ-1`/§Scope — pin or edit OICR's call sites | **Not done.** The shared card's `maxFractionDigits` default becomes `0`; **no OICR file is edited** (`DD-12`) |
> | Budget: ≈ 700 LOC *(this figure is `design.md`'s "Round 0" column, not stated in this proposal — `L-14`)* | **12 tasks · ≈ 1,560 LOC · ≈ 24 rounds · 2 PRs** (`design.md` §14) |
>
> **Four** Judgment Day rounds produced **92 findings** across eight blind judges. The ledger is [`judgment.md`](./judgment.md). *(This line read "Two … 56 findings … four blind judges" until Round 4 — the banner whose entire job is to state the current position was two rounds behind, and its budget row was one revision behind. Both are fixed above; the recurrence is the argument for the document-count lesson, not for sweeping harder.)*

---

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/measure-number-signed-decimal/` |
| Slug | `measure-number-signed-decimal` — **derived from the free-text `/akili-propose` argument** (*"para la seccion de innovation dev detail … el campo de number para el mesure … acepte positivos negativos y decimales"*). The full text is proposal context, not a directory name |
| Type | **Change** |
| Approval Mode | `gated` (no end-to-end mandate was given) |
| Parent Spec | none. **Deliberately not a fourth child of `docs/specs/innovation-use/`** — see `OQ-5` |
| Depends on | none. Chunk 3 (`innovation-use/details-page`) is archived; this modifies its shipped code |
| Parallel-safe | **no** — it edits `shared/components/quantification-item/`, a shared DB column, and an append-only migration sequence |
| Tier | **full stack** — client + server DTO + MySQL migration |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` (current), see `RK-6` |
| Modifies (archived) | `docs/specs/archive/2026-08-26-innovation-use--details-page/` → **`R-IUP-008`** |
| Created | 2026-08-26 |
| Session hygiene | ⚠️ This proposal was authored from a session rooted at `alliance-research-indicators-management/server/app-authorization`. Every downstream `/akili-*` command **must be launched with cwd = `alliance-research-indicators-main`**, or the `.claude/agents/akili-*` model wrappers and the tasks-gate hook load silently not at all (`author ≠ auditor` degrades to a prompt) |

---

## Intent

A Result Contributor reporting *Other quantitative measures* on an Innovation Use result can enter **any real number** in the **Number** field — negative, zero, positive, whole or fractional — and it round-trips through save, reload and reporting unchanged.

---

## Problem / Current Behavior

The field is capped at **non-negative integers**, and each tier enforces that independently. Relaxing only one tier ships a field that accepts input and then fails, truncates, or `400`s at save.

| # | Tier | Site | What blocks it |
| --- | --- | --- | --- |
| 1 | UI — hard clamp | `shared/components/quantification-item/quantification-item.component.html:18` | `[min]="0"` is passed to `p-inputNumber` as a literal. Negatives cannot be typed |
| 2 | UI — fraction clamp | `innovation-use-details.component.html:204` | The call site passes `[maxFractionDigits]="0"`, so `2.5` is rounded on entry |
| 3 | UI — copy | `quantification-item.component.html:19` | Placeholder reads **"Enter a positive number"**, hardcoded in the shared card (the screenshot's visible symptom) |
| 4 | Server — validation | `create-result-innovation-use.dto.ts:178-182` | `InnovationUseQuantificationDto.quantification_number` carries **`@IsInt()` + `@Min(0)`** → `400` on a negative or a fraction |
| 5 | **Storage — type** | `result_quantifications.quantification_number` is **`bigint`** (`1760653582914-createQuantificationTables.ts:14`, made nullable by `1760713349516`) | **Negatives already fit** (MySQL `bigint` is signed). **Decimals do not** — MySQL silently rounds on insert. This is the only tier needing a migration |

**Why the UI clamp is not simply a default to change.** `app-input`'s `@Input() min = 0` (`input.component.ts:35`) is the default for **every** number input in the app — the five actor counts, `organization_count`, and the pool-funding SP block all rely on it. The fix must be a **per-call-site input**, never a change to that default.

**Requirement of record.** `R-IUP-008 — "Counts accept non-negative integers only"` (archived `requirements.md:450-480` ⚠️ *range corrected by `T-12`, was `:450-478`*) binds `quantification_number` in the *same clause* as the **six** person-count fields ⚠️ *(corrected by `T-12`/`S-10` — this previously said "seven," the same double-count `J-05`/`DD-8` flagged: the DTO carries seven `@Min(0)` total, one of which is `quantification_number` itself, leaving six siblings)*. This change splits that clause; it does not delete it.

---

## Proposed Outcome

| Behavior | Before | After |
| --- | --- | --- |
| Typing `-1500` in a measure Number | impossible (clamped) | accepted, saved, reloaded as `-1500` |
| Typing `2.5` | rounded to `3` on entry | accepted, saved, reloaded as `2.5` |
| Pasting `-0.75` | refused | accepted |
| `0` | accepted | accepted (unchanged) |
| Empty | accepted — optional field | unchanged |
| Placeholder copy | "Enter a positive number" | states the real rule (e.g. *"Enter a number"*) |
| OICR *Actual count* / *Extrapolated estimates* | non-negative integers | **unchanged** — same component, explicit call-site values |
| Actor & organization **counts** | non-negative integers | **unchanged** — `R-IUP-008` stays in force for them |

---

## Scope

**In scope**

1. **Client — shared card.** Parameterize `QuantificationItemComponent`: a `min` input (replacing the literal `0`) and a `placeholder` input, both **defaulting to today's values** so the OICR call sites stay byte-identical. This is the same additive pattern `T-03` already used for `fieldsRequired` / `maxFractionDigits`.
2. **Client — Innovation Use call site.** Pass a negative `min`, a non-zero `maxFractionDigits`, and the new placeholder copy.
3. **Client — number input hygiene.** `app-input`'s `updateMaxReachedMessage` measures `value.toString().length` against `MAX_SAFE_INTEGER = 18` (`input.component.ts:161-175`); a minus sign and a decimal point now consume budget, so a legitimate value trips *"Maximum reached"* early. Count **digits**, not characters.
4. **Server — DTO.** `InnovationUseQuantificationDto.quantification_number`: `@IsInt()` + `@Min(0)` → `@IsNumber({ maxDecimalPlaces: <N> })`. **This field only** — the sibling `@Min(0)`s on `actors_count`, the four disaggregated counts and `organization_count` stay.
5. **Server — migration.** `ALTER` `result_quantifications.quantification_number` from `bigint NULL` to `DECIMAL(p,s) NULL`, preceded by the precision **pre-flight** in `RK-4`.
6. **Server — entity + read shape.** `ResultQuantification.quantification_number` column type, plus the string→number decision of `RK-3`.
7. **Round-trip proof** across the three tiers, and a decision (not an assumption) on the report-view formatting in `RK-5`.

**Out of scope**

- The two live light-theme AA contrast defects already shipped in this component (`RB-5`, `2.9115:1`) — untouched, still unticketed.
- `FR-7` / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718) and the other open items in `docs/specs/innovation-use/OPEN-ITEMS.md`.

---

## Non-Goals

| # | Non-goal | Why |
| --- | --- | --- |
| NG-1 | Relaxing OICR's *Actual count* / *Extrapolated estimates* to signed decimals | Different surface, unspecified ACs, live production data. The requirement named the Innovation Use measure. → `OQ-3` |
| NG-2 | Relaxing the actor / organization **count** fields | A negative or fractional *person* is not a reportable quantity. `R-IUP-008` stays in force there. → `OQ-4` |
| NG-3 | Changing `app-input`'s `min = 0` default | Platform-wide blast radius for a one-call-site need |
| NG-4 | A unit catalog, or any coupling between the chosen unit and the allowed sign/scale | Family decision **D-2**: unit is free text, in any chunk |
| NG-5 | OpenSearch / PRMS homologation of the new range | Family decision **D-8**: indicator detail fields are not indexed |

---

## Affected Users, Systems, And Specs

**Users.** Result Contributors reporting Innovation Use results. Read-only viewers of OICR reports see the formatting consequence of `RK-5`.

**Code — enumerated by *what renders and what reads the column*, not by feature folder (`KZ-002`, family `FR-4`).**

| Tier | File | Change |
| --- | --- | --- |
| Client | `shared/components/quantification-item/quantification-item.component.{html,ts}` | `min` + `placeholder` inputs; placeholder copy |
| Client | `shared/components/custom-fields/input/input.component.ts` | digit-count fix (scope item 3) |
| Client | `.../innovation-use-details/innovation-use-details.component.html:198-206` | new bindings |
| Client | `shared/interfaces/get-innovation-use-details.interface.ts:38` | typed `number \| undefined`; `RK-3` may widen it |
| Client | `.../oicr-details/oicr-details.component.html:60,81` | **read-only in this change** — must be *proven* unchanged, not assumed |
| Client | `.../oicr-details/oicr-details.component.ts:183,205,275,280` | already tolerates `number \| string` — free evidence for `RK-3` |
| Server | `.../result-innovation-use/dto/create-result-innovation-use.dto.ts:172-193` | validation |
| Server | `.../result-quantifications/entities/result-quantification.entity.ts:21-27` | column type |
| Server | new migration in `src/db/migrations/` | `ALTER` |
| DB | `result_quantifications` — shared by roles `ACTUAL_COUNT`, `EXTRAPOLATE_ESTIMATES`, `INNOVATION_USE` | one column, three consumers |

**Specs.** Amends archived `R-IUP-008`. Worth a **cross-reference row (`FR-12`)** in `docs/specs/innovation-use/family.md` §Cross-cutting Risks — a manifest annotation, *not* a new child, so the closed-set rule is untouched.

**Verified NOT affected:** the `innovation_use_validation` green-check stored function does not read `quantification_number` at all (`1787078283929`: its only count guard is `tempFullActors > 0`). No submit-gating consequence.

---

## Visual Reference

- **Source:** Screenshot supplied in the `/akili-propose` invocation (product owner).
- **Location:** [`reference/current-number-field.png`](reference/current-number-field.png) — the *current* state, showing the "Enter a positive number" placeholder and the spinner buttons.
- **Notes:** The visual surface is one existing input's accepted values plus its placeholder copy — the layout does not change, so **no mockup is needed** and none was generated. Offered and declinable: if you want the new placeholder copy and the error/warning state reviewed visually before specify, say so and I will generate a mockup into `mockup/`.

---

## Requirement Delta Preview

### ADDED Requirements

- **The Number field of a measure accepts any value in the supported range** — negative, zero, positive, whole or fractional up to `N` decimal places — at input, at blur, and **on paste**, and it round-trips through save → reload unchanged.
- **The shared card is parameterized, and its existing consumers are unchanged by construction** — `min` and `placeholder` become inputs whose defaults reproduce today's OICR rendering exactly.
- **A value beyond the supported precision is refused locally**, with a message that names the limit rather than the generic *"Maximum reached"*.

### MODIFIED Requirements

- **`R-IUP-008` is split.** Its title and clause currently read *"Counts accept non-negative integers only"* covering the four disaggregated counts, `actors_count`, `organization_count` **and** `quantification_number` in one sentence. After this change it governs the **six count fields only** ⚠️ *(corrected 2026-08-27 by `T-12`/`S-10` — this previously read "seven," which double-counted `quantification_number` itself; the DTO carries seven `@Min(0)` decorators total, one of which is the field being carved out, leaving six siblings — `J-05`, `DD-8`, `requirements.md:266`)*; the measure Number is governed by the new requirement above. `AC.1`–`AC.5` and the paste scenario must be re-scoped, not merely re-worded — **including the "Named blind spot" note**, which cites the server's `@IsInt()` + `@Min(0)` as the authority the client mirrors.
- **Server validation** for `quantification_number`: integer-and-non-negative → bounded-decimal, unsigned constraint removed.
- **Storage type** for `result_quantifications.quantification_number`: `bigint NULL` → `DECIMAL(p,s) NULL`.
- **Placeholder copy**: "Enter a positive number" → truthful copy.

### REMOVED Requirements

- Nothing user-facing is removed. One decorator (`@Min(0)`) is removed from **one** DTO field.

---

## Approach Options

| | **A — Relax the shared column** *(recommended)* | **B — Client-only** | **C — New column for role 3** |
| --- | --- | --- | --- |
| DB | `ALTER` `quantification_number` → `DECIMAL` | none | add nullable `DECIMAL` column; keep `bigint` |
| Blast radius | one column shared by 3 roles; report-view formatting | none | forks one field into two; **all four lifecycle routines** must be amended (**D-9**) |
| OICR behavior | unchanged **by call-site values**, must be proven | unchanged | unchanged |
| Honest? | yes | **no** — server `400`s and MySQL rounds; ships a field that lies | yes |
| Long-term cost | low — one semantics, one column | n/a | **high** — permanent dual read/write, report + snapshot forks |
| Migration risk | append-only `ALTER` on a live shared DB (**FR-3**) | none | append-only `ADD COLUMN`, lower risk, but four routine edits |

**Rejected — B** is not a smaller version of the change, it is a broken one: the UI would accept `-2.5`, the server would answer `400`, and even past the server MySQL would round it to `-3`. It fails the requirement while looking done.

**Rejected — C** buys a lower migration risk and pays for it forever. `D-9` makes it expensive immediately: `SP_versioning`, `SP_delete_result_version`, `full_delete_result_version` and `delete_result` all enumerate columns **by name**, so a new column is silently skipped on version/snapshot and orphaned on delete — with no error, log, or metric. Widening a column that already exists in all four keeps them correct without an edit. Worth reconsidering only if the `RK-4` pre-flight shows an `ALTER` cannot be done losslessly.

## Recommended Approach

**Option A**, sequenced so the irreversible step is last and gated:

1. **Pre-flight** (`RK-4`) — measure the live column before choosing `(p,s)`. Read-only, no schema change.
2. **Client** — parameterize the shared card additively; change only the Innovation Use call site; fix the digit count. Gate: **full** client suite (`KZ-003` / `FR-4`), never a targeted one.
3. **Server DTO** — relax the one field. Gate: the OICR path's validation is untouched, proven not assumed.
4. **Migration** — `ALTER` behind the human migration gate (`FR-3`). Transcribe the four lifecycle routines and the report views before writing about them (**D-10**); do not assert the `ALTER` is transparent to them from reasoning alone.
5. **Round-trip proof** — a negative and a fractional value from input to MySQL and back to the rendered field.

It is the smallest path that leaves **one** field with **one** meaning in **one** column.

---

## Risks, Dependencies, And Open Questions

### Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| **RK-1** | **`KZ-002` / `KZ-003` / family `FR-4`** — the edited component renders on **every OICR details page**. A targeted suite confirms the brief was followed, not that the blast radius is clean | **High** | Enumerate by *what renders* (table above). Mandatory **full** client suite. OICR's unchanged rendering is an assertion, not a comment |
| **RK-2** | The migration is **append-only** and lands on a **shared, non-disposable** dev DB (family `FR-3`) | **High** | Human migration gate. Pre-flight first. No destructive DDL — a widening `ALTER` only |
| **RK-3** | **TypeORM returns `DECIMAL` as a `string`** in MySQL. This repo has **zero** `type: 'decimal'` columns and **zero** numeric transformers today — no precedent to copy. `get-innovation-use-details.interface.ts:38` types the field strictly `number \| undefined` | **High** | Decide in `design.md`: a column `transformer` vs. widening the client type. OICR's path already handles `number \| string` (`oicr-details.component.ts:183,205`) — evidence, and also proof the two paths would diverge if only one is fixed |
| **RK-4** | Choosing `(p,s)` blind can make the `ALTER` **lossy**. `bigint` holds 19 digits; `DECIMAL(p,s)` needs `p − s ≥ 19` to be lossless in the worst case | **High** | **Pre-flight, before design freezes `(p,s)`:** `SELECT MAX(LENGTH(ABS(quantification_number))), MIN(quantification_number), COUNT(*) FROM result_quantifications;` Record the command **and** its output — a precision claim with no executed command behind it is exactly the `KZ-008` failure |
| **RK-5** | **Report-view formatting.** Four migrations render this column through `report_field(rq.quantification_number, TRUE, TRUE)` (`1780672573009`, `1779903441021`, and the two SP-versioning families). `DECIMAL(p,4)` renders `10.0000` where `bigint` rendered `10` — a user-visible change in **OICR** exports, from a change scoped to Innovation Use | **Medium** | Transcribe `report_field` (**D-10**) and decide: accept, trim trailing zeros, or format at the view. Must not be discovered after deploy |
| **RK-6** | The change sits on `AC-1679-…`, whose kaizen backlog (**10 items, none applied**) is waiting for `main`, and whose PR carries an open red SonarCloud gate (`S-1`) | Medium | Confirm the target branch at the specify gate (`OQ-6`). Do not bundle the kaizen apply-phase into this change |
| **RK-7** | JS `number` loses integer precision above ~15–16 significant digits, and `app-input` already warns at 18 **characters**. A wide `DECIMAL` can hold values the client cannot represent | Medium | Bound the UI at the product-chosen scale, not at the column's. Pairs with `RK-3` |
| **RK-8** | Negatives become storable in a column three roles share. Any downstream consumer assuming `≥ 0` misreads them | Low | `D-8` (detail fields are not indexed) and the green check (verified: does not read the column) close the two known consumers. Reports are `RK-5` |

### Dependencies

- None blocking. All three `innovation-use` chunks are archived; this modifies shipped code.
- The `RK-4` pre-flight needs read access to a database whose `result_quantifications` holds representative data.

### Open Questions

| ID | Question | Owner | Blocks | Recommendation |
| --- | --- | --- | --- | --- |
| **OQ-1** | The argument says *"innovation **dev** detail"*, but the screenshot's *OTHER QUANTITATIVE MEASURES* / *MEASURE # 1* pair renders **only** on `innovation-use-details` (`innovation-use-details.component.html:194,201`); `innovation-details` (Innovation Dev) has no such block. **Confirm the page.** | Product owner | the whole spec's target | Read as **Innovation Use details**, per the rendered evidence |
| **OQ-2** | **How many decimal places** may a measure carry? | Product owner | `(p,s)`, the DTO's `maxDecimalPlaces`, the UI's `maxFractionDigits` | **Enforce 2** in UI + DTO; **store scale 4**, so widening later needs no second migration |
| **OQ-3** | Does this extend to OICR's *Actual count* / *Extrapolated estimates* (same component, same column)? | Product owner | scope size, `RK-5`'s weight | **No** (`NG-1`). Reopen as its own change if wanted |
| **OQ-4** | Do the **six** surviving count fields stay non-negative integers? *(⚠️ corrected by `T-12` rework attempt 2 — was "seven," a third instance of the same miscount already fixed at `:67` and `:160`; the `:10-22` banner supersedes this table but the cell itself should not stay wrong)* | Product owner | `R-IUP-008`'s surviving scope | **Yes** (`NG-2`) |
| **OQ-5** | Spec placement: this `changes/` folder, or a **fourth child** of the `innovation-use` family? | You | folder location only | **`changes/`.** The blast radius is platform-shared (a shared card, a shared column, the OICR page), which sits outside the family's *"Innovation Use result category"* scope; and the family's child list is a **closed set** — a child would need a manifest row approved *before* the folder existed. Record `FR-12` in the manifest instead |
| **OQ-6** | Target branch — continue on `AC-1679-…`, or branch from `main`? | You | execution setup | Confirm at the specify gate; `RK-6` |
| **OQ-7** | Is there a **floor** at all (e.g. a business minimum), or is any value in range valid? | Product owner | the UI's `min` | No business floor; bound only by the column and `RK-7` |

---

## Success Criteria

| # | Criterion |
| --- | --- |
| SC-1 | On an Innovation Use result, entering `-1500`, `0`, `2.5` and `-0.75` in a measure's **Number** — by typing **and** by paste — leaves each value intact in the form, and each survives save → reload → re-render unchanged |
| SC-2 | The value stored in MySQL for a fractional entry is the value entered, not a rounded one, verified by reading the row |
| SC-3 | A value beyond the agreed precision is refused **locally**, with a message naming the limit — the server's rejection is not the first thing the user sees |
| SC-4 | The placeholder no longer says "positive" |
| SC-5 | **OICR** *Actual count* and *Extrapolated estimates* still refuse negatives and fractions — asserted on the shared card's **defaults** plus the **rendered** behaviour of each OICR block, and enforced server-side by `ResultQuantificationsService.createCustomValidation` for roles 1 and 2. ⚠️ *Rewritten at Round 4: this criterion previously required the assertion be made "at the OICR call sites — **not** inferred from the shared component's defaults", which **forbids the mechanism `DD-12` now depends on**. A success criterion that contradicts the accepted design is the most expensive kind of survivor, because it reads as the thing the work will be judged against.* |
| SC-6 | Actor and organization **count** fields still refuse negatives and fractions (`R-IUP-008`, surviving scope) |
| SC-7 | The **full** client suite is green (not a targeted run), the full server suite is green, and the build is clean |
| SC-8 | The migration ran red-before-green on a scratch schema, and the four lifecycle routines plus the report views were **transcribed** — with the transcript recorded — before any claim about them |
| SC-9 | `R-IUP-008`'s amendment is written into the archived spec (or its amendment file), and `FR-12` is recorded in `docs/specs/innovation-use/family.md` |

---

## Next Step

Approve, then:

```text
/akili-specify docs/specs/changes/measure-number-signed-decimal
```

Run it **from `alliance-research-indicators-main`** (see Document Control → Session hygiene). `OQ-1` and `OQ-2` should be answered at or before the specify gate — `OQ-2` is the one that hard-blocks a design decision, because `(p,s)` cannot be chosen without it and the migration is append-only.
