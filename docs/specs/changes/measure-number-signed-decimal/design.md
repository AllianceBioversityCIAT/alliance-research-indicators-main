# Design — Results / Measure `Number` accepts signed decimals

- **Module:** results (client `innovation-use-details`, `oicr-details`, shared `quantification-item`, shared `custom-fields/input`; server `result-innovation-use`, `result-oicr`, `result-quantifications`, two migrations)
- **Spec id:** `2026-08-measure-number-signed-decimal`
- **Status:** draft — **rewritten 2026-08-26 as the Judgment Day round-one correction** (see [`judgment.md`](./judgment.md), 28 findings). The superseded draft is not in this folder; its errors are recorded in the ledger.
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD sections:** §2.4 **ADR-5**, §2.4 **ADR-11** (+ blind spot (i)), §5.1, §6.1, §8.5
- **Last updated:** 2026-08-26

---

## Executive Summary

**One shared column widens. The design is about the two failure modes discovery forced open, and the four premises Judgment Day proved false.**

> ### ⚠️ Finding 1 — the migration breaks the save path unless the read shape is handled
>
> `mysql2` returns `DECIMAL` as a **string** (`decimalNumbers` is set nowhere; verified in `mysql2/lib/parsers/text_parser.js`). The Innovation Use page reseeds `body()` from the API response (`innovation-use-details.component.ts:316`) and `buildPayload()` resends `quantification_number` **verbatim** (`:435`). The endpoint's pipe is `new ValidationPipe({ whitelist: true, transform: true })` (`result-innovation-use.controller.ts:61`) — **no `enableImplicitConversion`**.
>
> **Chain:** migrate → reads become `"10.0000"` → an **untouched** measure row resends a string → validation rejects → **`400` on save.** Every manual test that *types* in the field passes, because an edited row carries a fresh `number`. Closed by **DD-2**.

> ### ⚠️ Finding 2 — the same mismatch silently destroys rows on the OICR path
>
> `quantification_number` is a **composite identity key** in the upsert: `upsertByCompositeKeys(…, ['quantification_number','unit','description'], …)`, keyed with `String(value)` in `base-service.ts`. A read/write shape mismatch does not merely fail validation — it **fails to match the existing row**, so the upsert deactivates it and inserts a duplicate. On the OICR path, which has **no validation at all** today, nothing rejects it first: silent `is_active` churn, lost primary keys, lost audit fields, orphaned snapshot references. No error, no log.
>
> This makes **DD-2 load-bearing for two independent reasons**, and it falsifies `A-5` ("no other reader").

**Four premises Judgment Day falsified.** Recorded because each one shaped a decision:

| Premise the superseded draft asserted | Truth |
| --- | --- |
| OICR's integrality is "enforced at its call site" | **Nothing** enforced it server-side: `UpdateOicrDto` has zero validators and `result-oicr.controller.ts` has **no `ValidationPipe`**. MySQL's `bigint` rounding was the only backstop, and `DD-1` removes it. Resolved by **DD-12** + **DD-13** |
| The fixture tier "structurally cannot" see `report_field` inside a view | **False.** `baseline.sql:6559` ships `report_field` and the `report_oicr` view into the scratch schema, and fixtures already run arbitrary SQL. `DC-7` had an automatable gate all along — **DD-11** |
| "Zero other `DECIMAL` columns, no in-repo precedent" | **Seven** exist in four entities. The authoring grep used `type: 'decimal'` and could not match the positional `@Column('decimal', …)` form — a **`KZ-017` scope failure in this spec's own authoring** — **DD-2** |
| The endpoint keeps `@Roles(...)` and `RolesGuard` | It has **neither**. `result-innovation-use.controller.ts:29`: *"No `@Roles(...)`: section access is JWT + `ResultStatusGuard` only"* — §8 rewritten |

---

## 1. Goals & non-goals

| # | Goal | Requirements |
| --- | --- | --- |
| G-1 | Widen the Innovation Use measure Number to signed values with **4** decimals, end to end | R-MSD-001, R-MSD-003, R-MSD-004 |
| G-2 | Keep OICR at non-negative integers — **explicitly, at the control and in the service**, not by a library default or a column type | R-MSD-002, R-MSD-007, R-MSD-011 |
| G-3 | Prove the value survives storage, the copy path, and the report view, at tiers that can actually see each | R-MSD-004, R-MSD-005, R-MSD-010 |
| G-4 | Keep the read shape a `number`, so no consumer learns a new wire type and no upsert key shifts | R-MSD-009 |
| G-5 | Make the field's scale and magnitude **parameters with a declared domain**, not literals | R-MSD-001, R-MSD-002 |
| G-6 | Make the migration's data safety **auditable**, not assured | NFR-MSD-001, NFR-MSD-002 |

**Non-goals.** `NG-2`…`NG-5` of the proposal stand. **`NG-1` is deliberately withdrawn** by user ruling at the Judgment Day escalation: OICR *is* now in scope, because `J-01` proved it could not be left alone safely. Also out: no global driver-option change; no reporting surface for Innovation Use measures (none exists — `O-1`); no fix for the platform-wide `DECIMAL`-typed-as-`number` class (`O-2`).

---

## 2. Architecture

```
CLIENT  client/research-indicators/src/app/
  shared/components/custom-fields/input/input.component.ts
        + max as @Input (default = today's value). Guard NOT touched     DD-7, DD-14
  shared/components/quantification-item/
        + min, max, placeholder inputs · maxFractionDigits domain 0–4    DD-4, DD-14
  pages/.../oicr-details/*   ← NOT TOUCHED. Gets integers from the
        shared card's new default of 0                                  DD-12
  pages/.../innovation-use-details/
        [maxFractionDigits]="4" · derived max · placeholder              DD-5, DD-6, DD-14
        quantificationsView coercion · payload type reconciliation       DD-3, DD-15
  shared/interfaces/get-innovation-use-details.interface.ts              DD-3
                            │
                            ├── PATCH /api/v1/result-innovation-use/:result-code
                            └── PATCH /api/v1/result-oicr/:result-code   ← NOT TOUCHED
                            ▼
SERVER  server/researchindicators/src/
  .../result-innovation-use/dto/create-result-innovation-use.dto.ts
        custom scale+range constraint, this field only                   DD-8, DD-17
  .../result-quantifications/result-quantifications.service.ts
        override createCustomValidation(dataArray, dataRole)             DD-13
        — per-role rule map keyed on the ROLE PARAMETER, + default entry
  .../shared/global-dto/base-service.ts
        ADDITIVE: createCustomValidation gains an OPTIONAL 2nd           DD-13
        parameter dataRole, forwarded at :134 and :345. Nothing in
        the tree overrides the hook today, so no caller changes.
        NO OICR file is touched: no pipe, no DTO, no controller, no service
  .../result-quantifications/entities/result-quantification.entity.ts
        column type + null-safe two-way transformer                      DD-1, DD-2
  db/migrations/<ts>-alterQuantificationNumberToDecimal.ts
        backup table → ALTER → whole-table diff                          DD-1, DD-18
  db/migrations/<ts>-normaliseQuantificationNumberInReportOicr.ts        DD-10
                            ▼
DB      result_quantifications.quantification_number  DECIMAL(24,4) NULL
          ├─ role 1 ACTUAL_COUNT ─────┐ integers by DEFAULT at both tiers
          ├─ role 2 EXTRAPOLATE_EST ──┘ (previously: only by the column type)
          └─ role 3 INNOVATION_USE ──── signed, ≤ 4 decimals
                    ├──▶ upsertByCompositeKeys — the VALUE is part of the row key   DD-2
                    ├──▶ SP_versioning copy path — the ONLY routine naming it       DD-9
                    └──▶ view report_oicr — roles 1 & 2 only                        DD-10
```

### 2.1 Composition — every new file

| Path | Responsibility | Change |
| --- | --- | --- |
| `src/db/migrations/<ts>-alterQuantificationNumberToDecimal.ts` | backup table → `ALTER` → whole-table diff | **new** |
| `src/db/migrations/<ts>-normaliseQuantificationNumberInReportOicr.ts` | recreate `report_oicr` with DD-10's expression. **~200 lines of view SQL** — the higher-risk of the two, since it embeds an expression that cannot be edited after deploy (**ADR-5**) | **new** |
| `test/fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts` | the gate `DC-7`/`DC-14` were wrongly told they could not have | **new** |
| `test/fixtures/innovation-use/oicr-quantification-save.fixture-spec.ts` | **new** — `R-MSD-013` AC.4 / `DC-16` on the **OICR** path. Still needed: `L-08` found that `oicr-details.component.ts` sends `q.number ?? 0` while the read preserves `null`, so a `NULL`-valued row churns even with DD-2. **That coercion is a pre-existing client defect this spec reports, does not fix, and the fixture must expect** | **new** |
| Unit specs (`input.component.spec.ts`, `quantification-item.component.spec.ts`, `oicr-details.component.spec.ts`, `innovation-use-details.component.spec.ts`, the IU DTO spec, `result-quantifications.service.spec.ts`) | own `DC-1`, `-2`, `-3`, `-6`, `-9`, `-10`, `-15`. Listed because §2.1 claims "every new file" and round 1 omitted them entirely (`K-17`). *(**Round 4:** `result-oicr.service.spec.ts` was struck from this list — it was DD-13 v2 residue, and no `result-oicr/` file is touched. `result-quantifications.service.spec.ts` replaces it and is where the rule map's coverage lives; `base-service.ts` has **no** spec file today, so the override's coverage cannot come from one.)* | modified |
| `.../result-quantification.entity.ts` | column type + two-way, null-safe transformer | modified |
| `.../result-innovation-use/result-innovation-use.service.ts` | correct the `:287-288` doc comment that contradicts §5.4 (`K-24`) | modified |
| `.../result-innovation-use/dto/create-result-innovation-use.dto.ts` | custom scale+range constraint on one field | modified |
| `.../result-quantifications/result-quantifications.service.ts` | override `createCustomValidation(dataArray, dataRole)` with the per-role rule map (DD-13). **No OICR file is touched at all** | modified |
| `.../shared/global-dto/base-service.ts` | **Round 4, and the only shared-file edit in this spec.** `createCustomValidation` gains an **optional** `dataRole` second parameter, forwarded from the two existing call sites (`:134`, `:345`). Two lines plus a signature. Additive by construction: `grep -rn "createCustomValidation" src` returns exactly those two call sites and the declaration — **nothing in the tree overrides the hook**, so no existing behaviour can change. Required because the hook otherwise receives no role at all — see DD-13 | modified |
| `shared/components/custom-fields/input/input.component.ts` | `max` becomes an `@Input` with today's value as its default. **Nothing else** — the character guard is not touched (DD-7 withdrawn) | modified |
| `shared/components/quantification-item/*` | `min`, `max`, `placeholder` inputs; scale domain guard; update the `:29` comment DD-12 supersedes | modified |
| `pages/.../innovation-use-details/innovation-use-details.component.{html,ts}` | bindings, read coercion, payload type | modified |
| `shared/interfaces/get-innovation-use-details.interface.ts` | one type | modified |
| `test/fixtures/.../innovation-use-section-round-trip.fixture-spec.ts` | sentinels + **untouched-row resave seeded from a real read** | modified |
| `test/fixtures/.../innovation-use-lifecycle-routines.fixture-spec.ts` | **new case** — closes `RK-9` | modified |
| `docs/specs/archive/2026-08-26-innovation-use--details-page/requirements.md` | amend `R-IUP-008` (`S-10`) | modified |
| `docs/specs/innovation-use/family.md` | add the `FR-12` cross-reference row (`S-10`) | modified |

### 2.2 Reuse

Consumed unchanged: `ResultQuantificationsService`, `ResultInnovationUseService`, `ResultOicrService`, `ResultStatusGuard`, `AuditableEntity`, `ApiService`/`MainResponse<T>`, `p-inputNumber` via `app-input`, the `test:fixtures` tier, `migration:test:bootstrap`.

**Patterns reused rather than invented:**

| Need | Existing pattern followed |
| --- | --- |
| A custom validation constraint (DD-17) | `IsActorCountModeExclusiveConstraint` — **in the same DTO file** (`create-result-innovation-use.dto.ts:35-72`) |
| Additive component inputs defaulting to today's literals | `T-03`'s `fieldsRequired` / `maxFractionDigits`, in the same component |
| A column type change, both directions | `1774373269393-IncreaseAppConfigKeyLengthTo255.ts` (`varchar(100)` ↔ `varchar(255)`) |
| Raw SQL from a fixture against the scratch schema | `innovation-use-section-round-trip.fixture-spec.ts:281` |

**Deliberately not built:** a new verification harness (**KZ-006**, `innovation-use` lineage — a new mechanism owes its own end-to-end criterion before it can carry anyone else's evidence). The one new fixture file reuses `migration:test:bootstrap` rather than replacing it.

### 2.3 Cross-check against `requirements.md` — all 25 clauses

Counted **after** the round-2 edits, not before: `grep -c "BUT it must NOT"` → **12**, `grep -c "AND IT MUST"` → **13**. Round 1 claimed "all 21" and both re-judges found 25 (`K-03`) — the four uncovered were the ones the fix round itself added, so the certification enlarged its own denominator. This table is regenerated from the line numbers, and **must be regenerated on every edit that adds a scenario**; that instruction is the durable fix, not the count.

> ⚠️ **Round 4 — the instruction above is necessary and was not sufficient, demonstrated on this very table.** Round 3 rewrote requirement clauses without regenerating, and **all 25** anchors went stale (the content mapping stayed correct, so nothing looked wrong; the citations were simply unusable). Round 4 then regenerated them — **from line numbers captured before its own requirements edits landed** — and broke 21 of the 25 a second time, in the same pass that was fixing them.
>
> **The rule is therefore an ordering rule, not a diligence rule: regenerate this table LAST, after every `requirements.md` edit in the round has been written, and verify each anchor resolves to a line actually containing its clause.** A count that reconciles (12 + 13 = 25) proves the clauses exist; it does **not** prove the citations point at them. Those are two different claims and only the second one is what a reader uses.

| Clause (line) | Where satisfied |
| --- | --- |
| `:181` must NOT round, clamp, or drop the sign | DD-5 (scale 4, symmetric derived bounds) |
| `:182` AND IT MUST treat `0` as a value | **DD-2's null contract** — `null` maps to `null`, never `0` |
| `:189` must NOT stop at `0` | DD-5 — `min` is negative |
| `:190` AND IT MUST step by a whole unit | DD-6 — PrimeNG's `step` default of `1`, no binding |
| `:222` must NOT be refused only because the component defaults that way | ⚠️ **This clause is now inverted by design, and the requirement is amended.** `DD-12` deliberately relies on the default — because four rounds of enumerating call sites produced four wrong figures. What is asserted instead is the **default itself**, plus a rendered assertion that OICR shows integer behaviour. See `R-MSD-002`'s amended scenario |
| `:223` AND IT MUST hold for **both** OICR blocks | Holds **by construction** — both render the same card and both pass nothing. Asserted once on the card's default and once per block on the rendered value |
| `:256` must NOT `400` — the value originates from the read path | DD-2 + DD-15 |
| `:257` AND IT MUST use a value from a real read, never a literal (**K-012**) | **DD-19** |
| `:265` must NOT name `quantification_number` in the `400` | DD-8 / DD-17 — one field |
| `:266` AND IT MUST keep rejecting on the **six** count fields | DD-8 keeps all six; DD-13 covers OICR's two |
| `:297` must NOT be `3`, `2`, or `2.5000` re-read differently | DD-1 (scale 4) + DD-2 |
| `:298` AND IT MUST be proven at the fixture tier | DD-9 |
| `:327` must NOT be evidenced by a routine body diff | DD-9 — "bodies unchanged" is a separate assertion |
| `:328` AND IT MUST read both rows out of MySQL | DD-9 + **DD-20**'s four-column match |
| `:362` must NOT be fixed by re-uniting the guard's threshold | **DD-7 withdrawn** — the guard is not touched at all, so neither re-uniting nor removing occurs. `R-MSD-006` is amended accordingly. **Round 4:** the clause's own tail still read *"the guard is **removed**"*; corrected in `requirements.md`, since withdrawal means neither |
| `:363` AND IT MUST instead be prevented at the control | ⚠️ **Partly false and amended — and Round 4 found the amendment never landed on the clause itself.** `L-07` established that PrimeNG checks `max` only on blur/Tab/Enter/spinner and then **silently clamps**; the per-keystroke path never checks it. So `max` is a *clamp*, not a prevention. The amendment was written as a new AC.6 while this clause kept saying *"not enterable"* — the two contradicted each other for a whole revision. **The clause is now rewritten, not merely annotated.** Asymmetry worth keeping in view: **`min` genuinely IS a prevention** — `allowMinusSign()` is `this.min == null \|\| this.min < 0` (`primeng-inputnumber.mjs:1270`, refused at `:1316`), so with `[min]="0"` the minus key is rejected per keystroke |
| `:430` must NOT render `-0.7500`, `NaN`, `0`, or empty | DD-2 + DD-3 |
| `:431` AND IT MUST behave identically for `string` or `number` | DD-3 — the coercion is idempotent |
| `:461` must NOT be asserted from reasoning about `DECIMAL` formatting | **DD-11** — automated fixture |
| `:462` AND IT MUST be observed from an executed query | DD-11. **Still unexecuted — §17 `U-1`** |
| `:463` AND IT MUST include the `-10.0000` case | DD-10's seven cases |
| **`:495`** must NOT be silently rounded to `3` and stored | **DD-13** — service-layer rejection before the upsert |
| **`:496`** AND IT MUST be announced to consumers before it ships | **DD-13** + §11 Comms + `NFR-MSD-005` |
| **`:545`** must NOT deactivate either row or insert a duplicate | **DD-2** (§5.3) + DD-13 |
| **`:546`** AND IT MUST be seeded from a real read, never literals | **DD-19**, extended to the OICR-path fixture (`K-17`) |

*The four bolded lines are the clauses round 1 certified without covering.*

### 2.3b Traceability for the requirements the fix round added

Round 1 added four requirements and referenced **none** of them anywhere in this document (`K-11`). Closed here:

| Requirement | Design sections that own it |
| --- | --- |
| **R-MSD-011** — OICR held to non-negative integers | **DD-12** (client pin), **DD-13** (service validation), §3 role table, §4 OICR block, §13's first challenge |
| **R-MSD-012** — scale and magnitude are parameters with a declared domain | **DD-4** (inputs), **DD-14** (derived bound), §6.1, §6.2 |
| **R-MSD-013** — a save preserves row identity | Executive Summary Finding 2, **§5.3**, **DD-2**, DD-20, and the new OICR-path fixture in §2.1 |
| **NFR-MSD-005** — the tightening is communicated | §11 **Comms** row, `RK-12`, DD-13 |

**Module constraints re-read** (general-setup §2 designates module headers and doc comments as constitution too):

| Constraint | Status |
| --- | --- |
| `result-innovation-use.controller.ts:29` — *"No `@Roles(...)`: JWT + `ResultStatusGuard` only"* | §8 rewritten to match. The superseded draft contradicted this header (`J-14`) |
| `result-innovation-use.service.ts:287-288` — *"`bigint` … the driver returns as a `string` at runtime"* | **Contradicts §5.4 and must be corrected in code, not "reconciled" in prose** (`K-24`). Round 1 declared it reconciled and left the comment live; it now has a composition row |
| `result-actors.service.ts:377-384` — *"the driver can hydrate it as **either** a `number` or a `string`"* | Adopted as this design's stance: DD-3 coerces rather than trusting either |
| `quantification-item.component.ts:29` — *"No default: `undefined` reproduces today's Intl resolution exactly"* | **DD-12 supersedes this intent for OICR.** The comment must be updated, not left contradicting the code |
| `app-input`'s `min = 0` default | never touched — threaded per call site |
| ADR-5 append-only | two forward migrations; `down()` semantics declared in DD-18, not discovered |

---

## 3. Data model

### `result_quantifications.quantification_number`

| | Before | After |
| --- | --- | --- |
| Type | `bigint NULL` (signed — `baseline.sql:3789`) | **`DECIMAL(24,4) NULL`** |

**Why the column and the UI carry different limits — the crux of the sizing question.**

| | The column | The UI + DTO |
| --- | --- | --- |
| Sized for | data that **already exists** | values entered **from now on** |
| Hard constraint | must hold 19 integer digits, or the `ALTER` truncates live data | must be exactly representable as an IEEE-754 double, in the browser **and** in JSON |
| Value | 20 integer digits + 4 decimals | DD-14's derived rule |

- **Lossless by construction:** a signed `bigint` is at most 19 digits; `p − s = 20`. No existing value can truncate, whatever the table holds. `p = 24` is far inside MySQL's `DECIMAL` ceiling of 65.
- **Scale 4** now matches the UI (user ruling), so nothing rounds silently between what a user types and what is stored.
- **Indexes:** none exist on this column; none added.
- **OpenSearch:** none — family **D-8**; the results mapping comes from `ResultOpensearchDto`, never the entity (**ADR-6** amendment).
- **Backfill:** none. Existing integers are representable unchanged.

### The three roles

| Role | Written by | Integrality enforced **before** | **After** |
| --- | --- | --- | --- |
| 1 `ACTUAL_COUNT` | OICR details | ⚠️ **the `bigint` column only** | the card's **default** scale of `0` (DD-12) + the shared validator's **default** rule (DD-13) — **no OICR file edited** |
| 2 `EXTRAPOLATE_ESTIMATES` | OICR details | ⚠️ **the `bigint` column only** | same |
| 3 `INNOVATION_USE` | Innovation Use details | `@IsInt()` + `@Min(0)` | signed, ≤ 4 decimals, bounded (DD-8 / DD-17) |

Roles 1 and 2 end this change **more** protected than they began — at two tiers instead of one — **and not one line of OICR code is edited to achieve it.** Both tiers protect them by *default*; Innovation Use is the only caller that opts out. *(Round 1 claimed three tiers via a `ValidationPipe`; round 2 two via OICR's own service; this version needs no OICR edit at all.)*

---

## 4. API surface

No endpoint added, removed, or versioned.

### `PATCH /api/v1/result-innovation-use/:result-code`

| Aspect | Change |
| --- | --- |
| Body | `quantification_number` accepts signed values, ≤ 4 decimals, bounded per DD-14 |
| Response | `quantification_number` stays a **`number`** — DD-2 preserves this; the naive migration would have made it a `string` |
| New `400` | scale > 4; magnitude outside the derived bound; non-finite |
| Removed `400` | negative; non-integer |
| Guards | unchanged — JWT + `ResultStatusGuard`. **No `@Roles`** (§8) |
| Version | not bumped — an input relaxation with a preserved output type |

### `PATCH /api/v1/result-oicr/:result-code` — not touched

| Aspect | Change |
| --- | --- |
| Controller, pipe, DTO, service | **none.** No file under `result-oicr/` is edited |
| Where the rule lives | `ResultQuantificationsService.createCustomValidation(dataArray, dataRole)` — **below** this endpoint and below the Innovation Use one, on the path both traverse (DD-13) |
| New `400` | a negative, fractional, or out-of-range number in `actual_count` / `extrapolate_estimates` — **previously accepted and silently rounded by MySQL**. Raised from the shared validator, surfacing through `GlobalExceptions` |
| ⚠️ Behaviour change | Still a real tightening on a live surface: a machine client sending `2.5` receives `3` today and a **`400`** after. The *mechanism* moved below the endpoint; the *contract change* did not go away. §11 comms, `RK-12`, `NFR-MSD-005` |
| ⚠️ **Partial write on rejection** | **Found at Round 4, and it is a consequence of moving the rule below the endpoint.** `updateOicr` (`result-oicr.service.ts:190`) is **not transactional** — it threads no `EntityManager` and opens no `dataSource.transaction`, unlike the Innovation Use path. It commits the header (`:199`), tags (`:220`) and external OICRs (`:228`) **before** reaching the quantification upserts (`:234`, `:241`). So DD-13's `400` lands with those writes already persisted, and an invalid *estimate* rejects after `actual_count` rows were already deactivated/inserted. **Today's silent rounding has no such mode.** Recorded as `RK-13`; the fix is out of scope (wrapping `updateOicr` in a transaction is an OICR-file edit this spec exists to avoid), so it is **declared, not closed** |

## 5. Workflows & business rules

### 5.1 Write path (Innovation Use)

1. `p-inputNumber` emits a **`number`**, bounded by `min` / `max` / `maxFractionDigits`.
2. `onQuantificationUpdate` writes it into `body()`.
3. `buildPayload()` copies it verbatim, dropping absent rows.
4. `ValidationPipe` runs DD-17's constraint: finite, scale ≤ 4, within DD-14's bound.
5. `upsertByCompositeKeys` matches on `['quantification_number','unit','description']` — **the value is part of the row's identity** (§5.3).
6. No side effects: no OpenSearch reindex, no socket emit, no `sync_process_log`.

### 5.2 Read path

1. MySQL returns `DECIMAL` as a **string**.
2. **DD-2's transformer** yields a `number` — or `null` for `null` — at the entity boundary. Single normalising point.
3. The service returns entities unchanged (`result-innovation-use.service.ts:482`).
4. The page reseeds `body()` (`:316`).
5. `quantificationsView` adapts to the card's shape and **coerces defensively** (DD-3).
6. `buildPayload()` resends a `number` → 5.1 step 4 passes.

### 5.3 Why the read shape is an identity concern, not only a validation one

`base-service.ts` builds the upsert key with `String(value)` over rows loaded from the DB, then **deactivates every active row whose key was not matched and inserts the unmatched incoming rows**.

| Scenario | Existing row's key | Incoming key | Result |
| --- | --- | --- | --- |
| With DD-2 | `"10\|kg\|note"` | `"10\|kg\|note"` | matched, updated in place ✔ |
| Without DD-2 | `"10.0000\|kg\|note"` | `"10\|kg\|note"` | **no match** → original deactivated, duplicate inserted |

On the Innovation Use path validation fires first, so the symptom is a `400`. On the **OICR** path there is no validation today, so the symptom is silent row replacement. DD-13's pipe closes that door too, but **DD-2 is what makes the keys agree**, and it is the only fix that serves both paths.

### 5.4 The read shape's actual mechanism — corrected

The superseded draft attributed today's `number` to `orm.config.ts:53`'s `bigNumberStrings: false`. That line is **inert**: `mysql2` consults it only when `supportBigNumbers` is true, and `supportBigNumbers` is set nowhere in the repo. Today's `number` comes from mysql2's default `parseLengthCodedInt(false)` for `LONGLONG`; `DECIMAL`/`NEWDECIMAL` default to `readLengthCodedString`. Deleting line 53 would change nothing (`O-3`).

The conclusion is unaffected — `bigint` → `number`, `DECIMAL` → `string`, so DD-2 is still required — but the mechanism matters: a reader who trusted the old text might "fix" the read shape by editing dead configuration.

### 5.5 Untouched rows are the risk case

An **edited** row always carries a fresh `number` from the control. An **untouched** row carries whatever the read produced. That asymmetry is why this would have shipped: every manual test that types in the field passes. It is also why **DD-19** mandates the fixture seed from a real read — a hand-written literal is always the right type and could never go red (**K-012**).

---

## 6. Frontend / UX component architecture

### 6.1 `QuantificationItemComponent` — parameterization by default

**Every input's default is the value the system behaves with today, except one — and that one is the point.**

| Input | Default | OICR passes | Innovation Use passes |
| --- | --- | --- | --- |
| `maxFractionDigits` | **`0`** — ⚠️ the **only** changed default (was `undefined`), and the reason `oicr-details` needs no edit | *nothing* | `4` |
| `min` | `0` (today's literal) | *nothing* | derived negative bound |
| `max` | `Number.MAX_SAFE_INTEGER` (today's value) | *nothing* | derived from scale (DD-14) |
| `placeholder` | today's copy | *nothing* | copy without "positive" |

All forward to the **Number** field only; the Unit field is untouched.

**Scale domain 0–4, guarded.** 4 is the column's scale; above it the UI would accept precision the database drops. A value outside the range is a configuration error surfaced at development time, not rounded quietly.

### 6.2 The derived magnitude bound (DD-14)

**Rule: `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1`, `min = −max`.** One formula, no special case. `max` is an `@Input` on `app-input` whose **default is today's `Number.MAX_SAFE_INTEGER`**, so no call site outside the card changes.

| Scale | Derived max | Reads as |
| --- | --- | --- |
| **0** | 9,007,199,254,740,991 | **exactly `Number.MAX_SAFE_INTEGER`** — today's value, so scale-0 callers are untouched |
| 1 | 562,949,953,421,311 | ~562 billones |
| 2 | 70,368,744,177,663 | ~70 billones |
| 3 | 8,796,093,022,207 | ~8.8 billones |
| **4** | **549,755,813,887** | **~549 mil millones** — Innovation Use |

**The condition, and why the two earlier attempts were wrong.** What must hold is that the double's spacing never exceed the decimal grid: `ulp(v) ≤ 10^-scale`. Round 1 used a digit count on a false premise ("exactly representable" — `0.1` and `2.55` disprove it at any budget). Round 2 used `⌊(2⁵³−1)/10^scale⌋`, which keeps the *scaled integer* representable but not the *value*: at scale 4 the spacing exceeds the 0.0001 grid above 2³⁹, and `L-01` measured **3,616 of 20,000** values failing to round-trip near that bound.

**Executed, not reasoned** (the discipline `L-01` exists to enforce):

| Bound | Grid collisions in 20,000 | Round-trip failures |
| --- | --- | --- |
| **This formula, every scale 0–4** | **0** | **0** |
| Round 2's `⌊(2⁵³−1)/10⁴⌋` = 900,719,925,474 | **3,616** | — |

Scale 0 landing exactly on `Number.MAX_SAFE_INTEGER` is a consequence of the formula, not an exemption bolted onto it.

**The scale-4 bound is still a narrowing of a live field** (today it accepts up to `Number.MAX_SAFE_INTEGER` at any scale) — ~5.5× wider than round 1's bound, but narrower than today. `NFR-MSD-002`'s pre-flight is therefore **blocking**: an existing role-3 row above it stops the change (`K-02`).

### 6.3 Why a default and not a pin

Round 1 pinned OICR's two call sites. Three separate judge findings then went into *which* call sites pass *what* — `J-21`, `C-1` and `L-05`, producing **four** different figures for one number ("provably nil", "six of seven", "twelve of thirteen", and finally six of thirteen). Every one of them was an enumeration, and enumerations of a shared component's consumers are what `KZ-002` exists to warn about.

**Changing the default removes the question rather than answering it.** OICR passes nothing, receives `0`, and is correct without being edited or counted. Nothing in this spec now depends on knowing who passes what — which is the only durable answer to a figure that was wrong four times.

It also settles `U-4` by making it moot: whichever reading of PrimeNG's `undefined` default is right, an explicit `0` is stricter than or identical to it.

### 6.4 UI states

| State | Behaviour |
| --- | --- |
| Loading | unchanged — `p-skeleton` |
| Empty | placeholder shown, value **absent** (`null`, never `0` — DD-2's null contract) |
| Error — scale | **none — no such state exists.** `p-inputNumber` prevents an over-scale keystroke and rounds an over-scale paste; DD-16 is withdrawn (`K-10`) |
| Error — digit budget | **unchanged.** `app-input`'s character guard is not touched (DD-7 withdrawn). Its pre-existing false positive on a long signed decimal is out of scope |
| Success | value rendered exactly, no trailing zeros |
| Read-only / external | unchanged |

### 6.5 Design tokens & accessibility

None added or changed; no visual redesign. **Out of scope and unticketed:** `RB-5`'s eyebrow at 2.9115:1 **in this component**, and `OQ-IUP-8`'s `.section-title` at 2.378:1 **in `custom-fields.scss`** — a different file. The superseded draft placed both here (`J-25`).

**DD-16 is withdrawn, so no message is added** — `NFR-MSD-004` now applies only to the states that already exist, and `DC-11`'s human/T6 check covers the field in both themes unchanged.

---

## 7. Shared contracts

`get-innovation-use-details.interface.ts:38` types this field `number | undefined`. That declaration was **false before this spec**: the runtime type depended on driver behaviour three layers away. DD-2 makes it true at the source; DD-3 widens it defensively and coerces at the existing adapter.

**Evidence the wire type has always been loose** — corrected citations (`J-07`): `oicr-details.component.ts:183` and `:205` coerce `number | string | null | undefined`, and the loose type is *declared* at `oicr-creation.interface.ts:117`. The superseded draft also cited `:117`, which is unrelated code.

**A second declaration exists** (`J-17`): `innovation-use-details.component.ts:80-85`'s `InnovationUseQuantificationPayload`, which `buildPayload()` at `:435` assigns into. **DD-15** reconciles it — widening only the shared interface would not compile.

No cross-package contract changes. **ADR-1** holds.

---

## 8. Security & authorization — corrected

The superseded draft claimed the endpoint keeps `@Roles(...)`, `RolesGuard`, and `assertInnovationUseOwnership`. **It has none of them.**

| | Actual state |
| --- | --- |
| `result-innovation-use.controller.ts:29` | *"No `@Roles(...)` (DD-5): section access is JWT + `ResultStatusGuard` only."* |
| `@Patch` decorators (`:56-61`) | `@GetResultVersion()`, `@UseGuards(ResultStatusGuard)`, Swagger, `@UsePipes(ValidationPipe)` |
| `assertInnovationUseOwnership` | exists only in `result-actors.service.ts:342` and `result-institution-types.service.ts:362` — **not on the quantification path** |

**What this change does to the posture:** nothing on the authorization axis — no guard, role, or ownership check added or removed, and **no file under `result-oicr/` is edited at all**. It **improves** the validation axis: `quantification_number` gains its first validation on **both** mutation paths, in `ResultQuantificationsService.createCustomValidation` — below every writer, so the guarantee is structural rather than enumerated (DD-13). **Not a `ValidationPipe`, and not OICR's own service** — round 1 proposed the pipe (`K-01`: would delete ~14 undecorated properties and deactivate tags, links and impact areas on the first save); round 2 proposed OICR's service (correct, but left the guarantee resting on today's writer list).

**Pre-existing exposure this does not close, and must not be read as closing:** there is no ownership check on the quantification write path in either service, and `FR-7` / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718) remains open on `customSaveInnovationDev` over these same tables.

**Observability:** no new log lines or metrics. Rejections flow through `GlobalExceptions`. DD-17 exists partly so a rejection is a `400` and not an unhandled throw.

---

## 9. Reporting impact

**Transcribed, not described (D-10).** `report_field(data_field MEDIUMTEXT, mandatory BOOLEAN, applies BOOLEAN)` (`1779920000000-ExpandReportFieldMediumtext.ts:31-49`) takes a **`MEDIUMTEXT`** first parameter, so MySQL casts the column to a string on the way in and returns it unchanged when content is present. Its callee **`valid_text`** uses `REGEXP_REPLACE` (`1779920000000:24`) — **corrected at round 2 (`K-13`)**: the round-1 text placed it in `report_field`'s own body, which contains no regex. Since `report_field` calls `valid_text` and both are live, the inference still holds: MySQL ≥ **8.0.4** — so Dev and Prod are provably 8.0.4+, narrowing `OQ-5` to the 8.0.4 … 8.0.16 window (`J-26`).

**Consequence:** `bigint 10` renders `'10'`; `DECIMAL(24,4) 10` renders **`'10.0000'`**.

**Scope, by enumeration.** Four migration files contain `report_field(rq.quantification_number`: `1779903441021`, `1780590538118`, `1780672573009`, `1780694172676`. That count of *files* is what the proposal stated, **correctly** — the superseded draft misread it as a count of fixes (`J-12`). Only the **latest** definition is live: **`report_oicr`**, from `1780694172676-UpdateReportView.ts:5`, two sites at `:41` and `:48`, filtering `quantification_role_id = 1` and `= 2`.

**Correction owed upstream:** `requirements.md` `R-MSD-010` and proposal `RK-5` attribute two of those four to "the two SP-versioning families". **No SP-versioning migration contains that expression.** Swept in the requirements amendment (`S-10`).

**Role 3 appears in no report view** — `grep "quantification_role_id = 3"` over the migrations returns nothing. So Innovation Use's new decimals reach no report (`O-1`), and the trailing-zero regression is **OICR-only**, on values Innovation Use never wrote.

### 9.1 The `-10.0000` case, and the expression's two failed rationales

Raised by the product owner: *does the design accept `-10.0000`?* On the write/read path, **yes, losslessly** — for a reason worth recording:

| Path | `-10.0000` |
| --- | --- |
| Typed | scale 4 permits it; the value is `-10` |
| Sent as JSON | JSON has one numeric type — `-10.0000` **parses to `-10`** before any validator runs |
| Stored | `-10.0000` in `DECIMAL(24,4)` |
| Read | transformer → `-10`; renders `-10` |

> **Encode this in the tests, do not rediscover it in review:** a scale rule governs **significant** decimals, never written ones. No validator can reject `-10.0000`, because it is indistinguishable from `-10`. At scale 4 the rejection case is `-10.00005`.

Where it bites is the report expression, and it falsified two successive rationales:

| Candidate / rationale | Verdict |
| --- | --- |
| *"a trailing-zero trim empties `0.0000`"* | ❌ **Wrong.** `TRIM(TRAILING '0' FROM '0.0000')` → `'0.'`; the decimal point halts the trim. Both judges confirmed |
| The real trap | The trim maps `'10'` → `'1'` on a value with **no decimal point** — unreachable while the column is `DECIMAL`, **reachable the moment `down()` reverts it to `bigint`.** A reverted column plus a trimmed view divides every OICR integer ending in zero, silently |
| `CAST(x AS DOUBLE)` | ❌ needs MySQL ≥ 8.0.17, and renders wide values in scientific notation |
| *"a truncation-equality conditional, exact"* — the superseded draft's replacement | ❌ **Also wrong, and never written as SQL.** Its portable reading, `CAST(x AS SIGNED)`, is bounded at 2⁶³−1 (19 digits) while the column holds 20 by DD-1's deliberate choice. Both judges caught it; Judge A rated it severe |

### 9.2 DD-10's expression, written out

```sql
IF(rq.quantification_number = TRUNCATE(rq.quantification_number, 0),
   CAST(TRUNCATE(rq.quantification_number, 0) AS CHAR),
   TRIM(TRAILING '0' FROM rq.quantification_number))
```

| Property | Why it holds |
| --- | --- |
| **Exact** | `TRUNCATE` on a `DECIMAL` returns a `DECIMAL`, and `CAST(… AS CHAR)` of a `DECIMAL` has no 64-bit bound. This is exactly what `CAST(… AS SIGNED)` got wrong |
| **`down()`-safe** | for a `bigint` column `x = TRUNCATE(x,0)` is always true, so the trim branch is **unreachable** |
| **Version-portable** | `IF`, `TRUNCATE`, `TRIM`, `CAST … AS CHAR` all long predate 8.0.4 |
| **Type-stable** | both branches are `CHAR`, so `IF()` cannot re-widen the result to `DECIMAL` and reintroduce trailing zeros |

Expected renders — **seven** cases, not six: `10.0000`→`10` · `-10.0000`→`-10` · `2.5000`→`2.5` · `-0.7500`→`-0.75` · `0.0000`→`0` · `bigint 10`→`10` · **`NULL`→`'Not provided'`**.

⚠️ **The `down()`-safety proof above is wrong for `NULL`, and `NULL` is reachable** (`K-12`, both judges). `NULL = TRUNCATE(NULL,0)` evaluates to `NULL`, which `IF()` treats as false — so the **else** branch runs, the one called unreachable. The *outcome* is benign (`TRIM` of `NULL` is `NULL`, `valid_text(NULL)` is false, `report_field` returns `'Not provided'` — today's behaviour), but the claim was false and `NULL` was missing from the mandated case list. `oicr_validation`'s `IS NOT NULL` guard is the evidence NULLs occur.

**Why the conditional is kept even though its trim branch is unreachable in production** (`K-19`): `report_oicr` reads roles 1 and 2 only, and DD-12 + DD-13 hold those to integers, so no fractional row can enter the view's domain. `CAST(TRUNCATE(x,0) AS CHAR)` alone would discharge `R-MSD-010` today with less irreversible surface. The branch is retained **as a declared defensive case, not as a live path** — the column is shared, and a future role or a future relaxation would silently produce `10.0000` in an OICR export if the view could not handle a fraction. That trade is recorded here so it is a decision rather than an oversight.

⚠️ **That row is a prediction, not evidence.** No MySQL instance was reachable while authoring, and neither judge could execute SQL. `R-MSD-010` AC.2 requires it proven from executed output over all six cases — now automatable per DD-11, not deferred to a human paste. See §17 `U-1`.

---

## 10. Testing strategy

| Tier | Command | Can see | **Structurally cannot** |
| --- | --- | --- | --- |
| Client unit | `npm test -- --silent` | bindings on real instances, rendered DOM, coercion | column types, SQL, contrast, layout |
| Server unit | `npm test -- --silent` | validator accept/reject tables, **including the `1e-7` case** | column types, stored routines, views |
| **Fixture** | `npm run test:fixtures` | **real MySQL** — storage, round-trip, `SP_versioning` behaviour, **`report_field` and `report_oicr` output** | the live Dev/Prod databases; browser rendering |
| Build | `npm run build` | packaging, budgets, **type errors like `J-17`'s** | runtime behaviour |
| Lint | `npx eslint <path>` · `npm run lint -- --quiet` | style | everything else. Server `npm run lint` carries `--fix` and cannot gate (**K-001**) |
| **Human / T6** | HITL pause | `DC-11` visual & a11y in both themes | — |

**The fixture row is the correction.** The superseded draft listed `report_field` formatting as structurally unreachable and substituted a human check. `baseline.sql` ships `CREATE FUNCTION report_field` (`:6559`) and the `report_oicr` view into the bootstrapped scratch schema, and fixtures already run raw SQL — so `DC-7` and `DC-14` get a real, red-able gate, including the `bigint` branch via `migration:test:revert`. Asserting a limit is honest only when the limit is real (**KZ-017**, `staging` lineage).

**The client suite runs in full, never targeted** (**KZ-003**, `innovation-use` lineage; family `FR-4`) — the shared card renders on every OICR details page, and **DD-12 changes a default that OICR silently inherits**. *(Round 4: this sentence previously read "and this change now edits OICR deliberately" — DD-13 v2 residue. No OICR file is edited; the blast radius is inheritance, not editing, which is the **stronger** reason for a full run, since an inherited change touches call sites nobody thought to look at.)*

**Coverage:** server ≥ 60%, client ≥ 40/20/45/30. **SQL sits outside the Jest coverage figure (ADR-11)** — a green 60% is not evidence for `R-MSD-004`, `R-MSD-005` or `R-MSD-010`.

**Concurrency:** never two full-suite runs at once; never a measurement while a delegated worker is active (root `CLAUDE.md` §4.3).

---

## 11. Rollout

| Step | Detail |
| --- | --- |
| 1 | **Client + server code merges first.** ⚠️ **CORRECTED 2026-08-27:** the previous text read *"Behaviour does not change yet — the DTO relaxation cannot produce a decimal while the column still rounds"*, and that is **false for one path**. In the interim window, with `T-03`/`T-04`'s relaxed validators merged and the column still `bigint`, a `PATCH` of `quantification_number: -12.75` on the Innovation Use section endpoint returns **`2xx` with `-13` stored**, where today it returns a clean `400` from `@IsInt()`. The relaxation *does* put a decimal on the wire; the column silently rounds it. OICR is unaffected — that is already its behaviour. **`K-015` means this window can last indefinitely**: a merge does not ship the schema |
| 2 | Pre-flight (`NFR-MSD-002`): run the recorded query, paste its output into `execution.md`. **BLOCKING, not confirmatory** — the column `ALTER` is lossless by construction, but DD-14's scale-4 bound narrows the accepted magnitude, so an existing role-3 row above it must **stop** the change rather than `400` on a later save (`K-02`) |
| 3 | Confirm both migrations are pending via the typeorm passthrough (`migration:show` is **not** an npm script) and **normalise the output before counting** — it emits ANSI escapes, and a naive grep has already read "zero pending" over a pending migration (**K-014**) |
| 4 | Migration 1 (backup → `ALTER` → diff), applied by **human decision**. The pipeline deploys code but **not** migrations (**K-015**) |
| 5 | Migration 2 (`report_oicr`) in the **same window**, or OICR exports render `10.0000` in the gap |
| **Ordering hazard** | Applying migration 1 **before** the code carrying DD-2 puts a string on the wire with no normaliser: a `400` on the Innovation Use path and **silent row replacement on the OICR path** (§5.3). **Code first, migrations second, never the reverse** |
| **Coupling** | If the column is ever reverted, **migration 2 must be reverted with it.** §9.1's trim trap is a coupling between the two, not a property of either |
| Feature flag | none — a validation change, not a switchable behaviour |
| Backout | ⚠️ **ORDER CORRECTED 2026-08-27:** code rollback, then **restore from the backup table FIRST**, then `migration:revert` (DD-18). A bare revert rounds fractions and can **fail** on a wide value (`AR-2`) — so reverting first runs the lossy step on the data you are trying to save. Restoring first makes the subsequent `down()` **guaranteed** to succeed, because the restored rows are the pre-`up()` `bigint` values: integral and in range by construction. **Restore into the surviving table (`DELETE` + `INSERT … SELECT *`, wrapped in a transaction), NEVER by `RENAME`** — a CTAS backup carries no `PRIMARY KEY`, `AUTO_INCREMENT`, index or FK, so promoting it fails the first insert with `1364` and permits duplicate ids. The previous text enumerated *"`migration:revert` plus restore"*, which reads as revert-first |
| **Comms** | **Required, not optional.** DD-13 tightens a live surface: a machine client sending `2.5` to the OICR endpoint gets `3` today and a **`400`** after. MEL / product owner, the OICR reporting owner, and any partner platform on that endpoint (`RK-12`, `NFR-MSD-005`) |

---

## 12. Design decisions log

| # | Decision | Rationale |
| --- | --- | --- |
| **DD-1** | `quantification_number` → **`DECIMAL(24,4) NULL`** | `p − s = 20 > 19` (max signed-`bigint` digits) makes the `ALTER` lossless **by construction**. Scale 4 matches the UI, so nothing rounds silently between entry and storage |
| **DD-2** | **A two-way, null-safe column `transformer`** normalises the driver's `DECIMAL` string to a `number` on read and passes values through on write | Load-bearing for **two** independent reasons: without it an untouched row `400`s (Finding 1), **and** the upsert's composite key stops matching, replacing rows silently (Finding 2). **`null` must map to `null`, never `0`** — TypeORM applies the transformer to null *before* any type branch (`MysqlDriver.js:510-514`), and a naive `Number(v)` would break the `null ≠ 0` invariant, `quantificationRowAbsent`, and three ACs (`J-23`). **The `to` direction must be specified too** — `upsertByCompositeKeys` re-saves hydrated entities, so it runs on every save of an unchanged row (`J-24`). **Rejected: `decimalNumbers: true` on the datasource** — a connection-level option whose real blast radius is **seven existing `DECIMAL` columns** plus every raw query, not the "zero" the superseded draft claimed (`J-16`). **Also considered, and this is the precedent round 1 denied existed (`K-18`): a service-layer coercion.** `bilateral.service.ts:669-686` already does exactly this for `quantitative_contribution` — null-safe, documented, unit-tested (`bilateral.service.spec.ts:349,381,396`). Rejected here only because a column transformer normalises **every** reader of the column at once, including the upsert's key construction (§5.3), where a service-local coercion would leave `ResultOicrService` reading a different shape |
| **DD-3** | Widen the client interface and coerce inside the **existing** `quantificationsView` adapter | A defensive assertion of DD-2's invariant, not a second normaliser. `result-actors.service.ts:377-384` already refuses to assume the driver's hydration type; this adopts that stance |
| **DD-4** | `min`, `max`, `placeholder` become inputs on the shared card, defaulting to today's literals | The `T-03` precedent in the same file. Additive, so untouched consumers are unchanged by construction — and still asserted at their own call sites (**KZ-002**) |
| **DD-5** | Innovation Use passes scale **4**, the derived symmetric bound, and new placeholder copy | User ruling: UI scale equals column scale, so nothing is silently rounded |
| **DD-6** | **Do not bind `step`** | PrimeNG's default of `1` already gives whole-unit stepping across zero |
| **DD-7** | **WITHDRAWN. `app-input`'s character guard is NOT touched.** | **Withdrawn at the additive-defaults ruling, after three failed versions.** Round 0 changed its unit and called the blast radius "provably nil"; round 1 corrected the figure (wrongly, twice); round 2 removed the guard — and `L-02` showed the signal is **shared with the `type === 'text'` branch**, so removing it deletes the only user feedback for 40,000-character paste truncation on **every `app-input` in the app**, turns three green specs red, and `DC-10`'s gate goes green on that regression. The "Maximum reached" false positive on a long signed decimal is **pre-existing and cosmetic, and is not this spec's problem.** The only change to `app-input` is additive: `max` becomes an `@Input` defaulting to today's value (DD-14) |
| **DD-8** | Relax `quantification_number`'s validation, **this field only**; the **six** sibling count fields keep their decorators. ⚠️ **Round 4 correction — what the `bigint` column actually enforced:** `baseline.sql:3789` is `` `quantification_number` bigint DEFAULT NULL `` — **signed**, no `UNSIGNED`, no CHECK. So the column enforced **integrality only, never non-negativity**. Every statement in this spec that called DD-13's default entry *"today's effective behaviour"* was therefore false on the sign axis: refusing a negative on roles 1 and 2 is a **new** restriction, not a restoration. The fractional half is a restoration; the sign half is not. Consequence, and it is reachable: an **existing** negative role-1/2 row would `400` on the next OICR save even if untouched, because `oicr-details.component.ts` resends every row. Gated by the extended pre-flight in `NFR-MSD-002` and tracked as `RK-14` | The superseded draft said "seven" — the DTO has seven `@Min(0)` total, one of which is this field (`J-05`). Requirements' own contradiction (six / seven / eight) is swept in `S-10` |
| **DD-9** | Storage and copy-path evidence goes into the **existing** fixtures; routine bodies are **not edited** and are asserted unchanged | **Corrected scope:** only **`SP_versioning`'s copy path** names this column (`:367`, `:380`). The other three routines reference the table only, so they can orphan rows but cannot lose a value (`J-11`). ADR-11 blind spot (i) therefore applies to `SP_versioning` alone — exactly where no fixture exists today |
| **DD-10** | Recreate **`report_oicr`** in one new migration, using the expression **written out in §9.2** | Two earlier candidates were disqualified — §9.1. This one is exact without a 64-bit bound, `down()`-safe, version-portable and type-stable. `R-MSD-010` AC.1 demanded transcription over description; the superseded draft applied that to `report_field` and exempted its own expression |
| **DD-11** | **`DC-7` and `DC-14` get an automated fixture gate**, replacing the human substitute | `baseline.sql` ships `report_field` (`:6559`) and `report_oicr` into the scratch schema, and fixtures already run raw SQL. The "structurally cannot" claim was false (`J-02`, both judges) |
| **DD-12** | **The shared card's `maxFractionDigits` default becomes `0`. `oicr-details.component.html` is NOT touched.** | **Rewritten at the product owner's additive-defaults ruling.** Round 1 pinned OICR's two call sites; round 2's judges then spent three separate findings on *which* call sites pass *what* (`J-21` → `C-1` → `L-05`, three wrong figures for one number). **Changing the default deletes the question.** OICR passes nothing and receives `0`, so its template is not edited, its behaviour is fixed **by construction**, and no enumeration of call sites is load-bearing anywhere. **This is the one default that changes value** (`undefined` → `0`). **Round 4 resolved `U-4` from source instead of leaving it contested, and both camps were right about different code paths** — the disagreement was never about behaviour, it was about which branch each side had read. **Keystroke path:** `primeng-inputnumber.mjs:1333-1343` guards the decimal separator with `else if (decimalCharIndex === -1 && this.maxFractionDigits)` — `undefined` is **falsy**, so the separator is never inserted and **decimals are already refused when typing at OICR today.** The product owner's live observation was correct and is explicable from source. **Intl path:** `:834-838` passes `maximumFractionDigits: this.maxFractionDigits ?? undefined`, which resolves to **3** — the judges' reading was also correct, but it governs *formatting and paste*, not keystrokes. **The direction claim survives:** decimals refused before and after, and a pasted `"2.5"` goes from rendering `2.5` to rendering `3` — stricter or identical, never looser. **What does not survive is this row's earlier reasoning**, which credited the tightening to a fraction limit that never gated the keystroke path at all. `min` and `max` keep today's values as defaults |
| **DD-13** | **Override `createCustomValidation(dataArray, dataRole)` on `ResultQuantificationsService`, with a per-role rule map and a default entry. `base-service.ts` gains the optional `dataRole` parameter — the spec's only shared-file edit. `result-oicr.service.ts`, `update-oicr.dto.ts` and `result-oicr.controller.ts` are NOT touched.** | **Fourth version. Round 4 found v3 was not implementable at the seam it named, and this is the repair.** Round 1 added a `ValidationPipe` (`K-01`: would delete ~14 undecorated properties and deactivate every tag, link and impact-area row on the first save). Round 2 moved the rule into `ResultOicrService` — correct but still an OICR-file edit. Round 3 (the additive-defaults ruling) moved it to `createCustomValidation`, which is the right seam — **but the hook takes exactly one argument.** `base-service.ts:279-281` declares `createCustomValidation(dataArray)`; the role travels as the separate `dataRole` parameter of `upsertByCompositeKeys` and is attached to the rows only at `:354-355`, **after** the hook has already run. On the Innovation Use path the role is not merely late, it is **absent by construction**: `InnovationUseQuantificationDto` declares only `id`, `quantification_number`, `unit`, `description`, and the controller's `whitelist: true` strips any injected `quantification_role_id`. **A payload-keyed map would therefore have sent every role-3 row to the default rule and rejected the exact values this spec exists to enable** — and on the OICR side, whose DTO is entity-typed with no pipe, a client could have set `quantification_role_id: 3` to buy the permissive rule. **The repair is additive, per the same ruling:** an *optional* second parameter, forwarded at the two existing call sites. `grep -rn "createCustomValidation" src` returns exactly `base-service.ts:134`, `:278`, `:345` — **no override exists anywhere in the tree**, so no caller's behaviour can change, and the role now arrives from the *parameter*, never from client-controllable payload. **Rule map:** the **default** entry (roles 1, 2, any future role) is *non-negative integer*; role **3** opts in to *signed, ≤ 4 decimals, bounded*. ⚠️ **The default entry is NOT a restoration of today's behaviour on the sign axis** — see the correction under DD-8 and `RK-14`. ⚠️ **Null contract, mandated:** `null` and `undefined` are **accepted and skipped by every entry**, including the default. `quantification_number` is `nullable: true` and DD-2 makes `null → null` load-bearing for `quantificationRowAbsent` and three ACs; a rule map that reads `null` as "not a non-negative integer" would reject a legitimately empty measure row. The two write paths deliver *different* null shapes to this validator — OICR coerces `q.number ?? 0` client-side (`L-08`, pre-existing), Innovation Use preserves `null` — so the skip must be explicit, not incidental. **Scope of the structural claim, stated honestly (Round 4):** the check sits below **both production writers**, so no live caller bypasses it and a future caller of `upsertByCompositeKeys` cannot. It is **not** true that *no* bypass exists — `upsertQuantificationsByRole` (`result-quantifications.service.ts:32-115`) writes via `this.mainRepo.save` at `:112` without traversing the base class. It has no production caller today (only its own spec and a mock in `result-oicr.service.spec.ts:184`), but it is `public` and unit-tested, so it reads as maintained API. See `RK-15` |
| **DD-14** | **`max = 2^(53 − ⌈log₂(10^scale)⌉) − 1`, `min = −max`, exposed as an `@Input` on `app-input` whose default is today's `Number.MAX_SAFE_INTEGER`** | **Third version, and the first verified by execution.** Round 1 used "integer digits + decimals ≤ 15" on a false premise ("exactly representable" — `0.1` and `2.55` disprove it). Round 2 adopted `⌊(2⁵³−1)/10^scale⌋`, and `L-01` showed it **admits values that silently change in the browser**: **3,616 of 20,000** values near its scale-4 bound fail to round-trip, where round 1's bound had **zero**. The condition that actually matters is that the double's spacing not exceed the decimal grid — `ulp(v) ≤ 10^-scale` — which this formula states. **Executed at every scale: zero grid collisions, zero round-trip failures**, and scale 0 lands *exactly* on `Number.MAX_SAFE_INTEGER`, so no exemption is needed. Scale 4 → **549,755,813,887**, still ~5.5× round 1's bound. Because `max` is an `@Input` with today's value as its default, **no call site outside the card is affected** |
| **DD-15** | Reconcile the **second** payload type declaration in the page component | `innovation-use-details.component.ts:80-85` also types this field and `buildPayload():435` assigns into it; widening only the shared interface does not compile (`J-17`) |
| **DD-16** | **WITHDRAWN. No scale message is added. The digit guard is NOT touched either — DD-7 is withdrawn.** | **Reversed at the round-2 re-judgment (`K-10`, `K-09`), then corrected again at Round 4.** Round 1 claimed paste was the reachable route for an over-scale value. It is not: `p-inputNumber`'s paste path runs `Intl.NumberFormat`, which **silently rounds** — executed, `format(2.55555)` at `maximumFractionDigits: 4` → `"2.5556"` — and `app-input`'s own paste handler returns unless `type === 'text'`. So no client state exists in which an over-scale value is present to report, and a message for it would be dead UI. ⚠️ **The rest of this row previously read "the digit guard is REMOVED … removed, not re-united", and that was DD-7 v2 residue surviving inside the decision log four rows below DD-7's own withdrawal — the design contradicting itself.** The `K-09` reasoning that produced it (once DD-14 caps every configuration below 18 digits, the guard can no longer fire, so it is dead code) rested on a premise Round 4 **falsified by execution**: `input.component.ts:166` measures `value.toString().length`, i.e. **characters, not digits**, and a signed 4-decimal value *inside* DD-14's scale-4 bound is exactly 18 characters (`-549755813886.9999`). The guard therefore still fires, the "dead code" argument dissolves, and **nothing is removed**. The surviving false positive on a long signed decimal is **pre-existing and cosmetic, out of scope, and now declared as `RK-16`** rather than silently designed away. The server's `400` stays the authority |
| **DD-17** | **A custom constraint with a MANDATED evaluation order**, not `@IsNumber({ maxDecimalPlaces })` | `class-validator` does `value.toString().split('.')[1].length`, which throws `TypeError` when `toString()` yields exponential notation with no `.` — a **`500` where `@IsInt()` returned a clean `400`** (`J-15`). **Two corrections from round 2 (`K-05`):** (a) the crash condition is **not** "any `\|value\| < 1e-6"` — executed, `1e-7`/`-1e-7`/`5e-7` throw but **`1.5e-7` returns `true`**, so it is *accepted today* and would store as `0.0000`; (b) round 1 left the constraint's duties as an unordered set, and order decides everything. **Mandated order, each step gating the next:** ① reject anything that is not a `number` (the resent-string case Finding 1 depends on); ② reject non-finite; ③ reject outside DD-14's bound — **this must precede any string conversion**, or `1e21` reproduces the very `TypeError` the constraint exists to remove; ④ only then derive the scale, and derive it **without** `toFixed` at high precision — `(2.55).toFixed(20)` → `"2.54999999999999982236"` would reject a legal value, and `(1e-7).toFixed(4)` → `"0.0000"` would silently round to zero, contradicting DD-1. Follows `IsActorCountModeExclusiveConstraint` in the same file |
| **DD-18** | **Migration 1 creates a backup table, then `ALTER`s, then diffs the whole table** | User ruling. The `ALTER` is lossless by construction, so this is **not** a restore path for `up()` — it is the **only honest restore path for `down()`**, which rounds fractions and can **fail** on a wide value. Chosen over an in-table temporary column, which lives inside the table the `ALTER` rebuilds (sharing its failure mode) and forces three rebuilds instead of one. Retained until sign-off. ⚠️ A type change requires `ALGORITHM=COPY` — a full table rebuild that locks writes and needs disk headroom; on the shared Dev database that is an operational event, not a detail (`U-2`) |
| **DD-19** | The untouched-row fixture must **save → read → resave unmodified**, seeded from the read | A hand-written literal is always the right type and could never go red (**K-012**). This is the clause the superseded draft's cross-check omitted (`J-04`) |
| **DD-20** | The copy-path comparison must be **multi-row-aware** and state its matching key | §16's referenced `fetchFullRow` asserts `toHaveLength(1)` against a one-row-per-result table; `result_quantifications` holds several rows per result, including deactivated ones (`J-20`). ADR-11's `SELECT *`-minus-identity-columns method still governs; rows are matched on `(result_id, quantification_role_id, unit, description)` — **never** on the value, which is what is under test. *(Round 1 omitted `description`; `K-20` showed `(result_id, role, unit)` selects a **set**, since row identity is `['quantification_number','unit','description']` per role and two active rows may share a unit — the same ambiguity, one column wider, that made `fetchFullRow`'s `toHaveLength(1)` the `J-20` defect.)* |

---

## 13. Reversion challenge (Step 2.3)

Two decisions revert delivered behaviour.

### DD-8 removes `@Min(0)` and `@IsInt()` from `quantification_number`

| Consumer that could assume `≥ 0` or integrality | Verdict |
| --- | --- |
| `innovation_use_validation` | **does not read the column.** Its only count guard is `tempFullActors > 0` (`1787078283929:135`) |
| **`oicr_validation`** | **does read it** — `rq.quantification_number IS NOT NULL` (`1780519377343-UpdateOicrGreen.ts:41-60`), roles 1 and 2. Sign- and scale-agnostic, so unaffected. *Added: the superseded draft's enumeration omitted this function (`J-27`)* |
| OpenSearch / PRMS | **not indexed** — family **D-8**, ADR-6 amendment |
| `report_oicr` | **never sees role 3** (`1780694172676:44,51`) |
| Roles 1 & 2 | never protected by this decorator — but protected by the **column**, which DD-1 removes. **This is `J-01`**, and DD-12 + DD-13 replace that protection with explicit enforcement |
| `SP_versioning`'s copy path | sign-agnostic; it copies, it does not compare. Asserted behaviourally (DD-9) |
| `upsertByCompositeKeys` | **sensitive — but to the value's string form, not its sign.** Handled by DD-2 |

**Outcome:** one concrete breakage named — roles 1 and 2 — and it is the finding that reopened the spec's scope. Resolved by **adding** enforcement, not by narrowing the requirement.

### DD-13 adds validation where none existed — a reversion of *permissiveness*, now at the shared service

*What does adding this break?* A machine client currently sending a negative or fractional quantification number to the OICR endpoint receives a `2xx` and a silently rounded value. After DD-13 it receives a `400` — raised from the shared validator rather than from OICR's own code. **Moving the mechanism below the endpoint does not soften the contract change**, and pretending otherwise would be the easy mistake here.

No such client is known in-repo, but the endpoint accepts machine tokens and the repo cannot enumerate partner platforms. **Recorded as `RK-12`, with rollout comms as the mitigation** — not dismissed.

**Round 4 added three things this challenge had missed, and the first two are the reason the challenge is worth re-running after a design is revised:**

| # | What the original challenge did not name |
| --- | --- |
| 1 | **The tightening is bigger than stated.** The challenge assumed the default rule restored what the `bigint` column enforced. `bigint` is **signed** (`baseline.sql:3789`), so it never enforced non-negativity — refusing a negative on roles 1/2 is new behaviour, and an **existing** negative row would `400` on an untouched save. See DD-8's correction and `RK-14`; the pre-flight in `NFR-MSD-002` is extended to measure it |
| 2 | **The rejection is not atomic.** `updateOicr` is not transactional, so the `400` arrives with the header, tags and external OICRs already committed (`RK-13`). *"Receives a `400`"* understated the consequence: today's failure mode is a silently rounded value, the new one is a **half-applied update** |
| 3 | **The bypass.** `upsertQuantificationsByRole` writes without traversing the base class (`RK-15`). Dead today, `public` and unit-tested, so the guarantee is "structural for every live writer", not "structural, full stop" |

> **Not reversions:** DD-1 (`DECIMAL` is a superset of the integers stored); DD-4/DD-12/DD-14 (additive inputs whose defaults reproduce today's behaviour — the one changed default, `maxFractionDigits` `undefined`→`0`, is a *tightening* toward what OICR already does); DD-7 (withdrawn, nothing changes).
>
> **Genuine narrowings, each declared:** migration 1's `down()` (DD-18, and it can **fail**, not merely round); DD-14's scale-4 bound relative to today's `Number.MAX_SAFE_INTEGER` on the Innovation Use field — **gated by `NFR-MSD-002`'s blocking pre-flight**, since an existing row above it must stop the change rather than `400` on a save the user never made.

---

## 14. Budget

| Signal | R0 | R1 | R2 | R3 (additive-defaults) | **Now (R4)** | Why it moved |
| --- | --- | --- | --- | --- | --- | --- |
| Tasks | 11 | 14 | 15 | 11 | **12** | R3's −4 holds (`DD-7` withdrawn, `DD-12`'s OICR-template task gone, `DD-13` collapsed from *DTO + controller + service*). R4 adds **+1**: the `base-service.ts` optional-parameter edit and the rule map's null contract are a distinct, separately-reviewable unit from the entity transformer |
| LOC | ≈ 700 | ≈ 1,410 | ≈ 2,400 | ≈ 1,500 | **≈ 1,560** (≈ 350 production, ≈ 1,210 test/fixture) | +≈ 60. Production +20: the hook's signature, two forwarded arguments, the null-skip branch. Test +40: the rule map now owes a null case per role and a negative-on-role-1/2 case, neither of which existed when the map was prose |
| Review rounds | 16 | 25 | 30 | ≈ 22 | **≈ 24** | 12 × 2.0, holding chunk 2's measured rate (the only comparable that also carried a migration) |

**Depth: `Full` stands** — two append-only migrations against a shared database and a defect class no tier below the fixture tier can observe. Neither of those changed.

**The additive-defaults ruling is why this section moved down instead of up for the first time.** Three of the four accepted defects (`L-02`, `L-03`, `L-04`) and two chronic findings (`L-05`, `L-09`) were not fixed — they were made **unreachable**, by removing the edits that produced them. Fewer files stating a decision is fewer places for propagation to fail, which is the root cause 78 findings kept pointing at.

**R4's +60 LOC is the correct kind of increase, and worth naming as such.** It buys a decision that is *implementable* — `M-01` established that DD-13 v3 could not have been built as written, so the R3 figure was measuring a design that did not exist. A budget that goes up because a defect was found is honest; the one it replaces was cheap only because it was wrong.

**≈ 1,560 LOC still wants two PRs**, not three: (1) server — the entity transformer, the `base-service.ts` parameter, the shared validator override, both migrations; (2) client — the card's inputs and defaults, the Innovation Use call site, the read/write type reconciliation. The client depends on (1)'s transformer existing.

## 15. Open questions

| ID | Question | Owner | Blocks |
| --- | --- | --- | --- |
| **OQ-1** | `report_oicr`: accept `10.0000` in exports, or ship DD-10's expression? Recommendation: **ship it** — a change scoped to Innovation Use should not visibly alter an OICR export | Product owner + eng lead | `R-MSD-010` AC.3 |
| **OQ-3** | Target branch — continue on `AC-1679-…`, or branch from `main`? | You | execution setup |
| **OQ-D5** *(renamed — `OQ-5` denoted three different questions across the three documents; `K-25`)* | Dev and Prod MySQL versions. **Narrowed** (`J-26`): the live `report_field` uses `REGEXP_REPLACE`, so both are provably **8.0.4+**; the window is 8.0.4 … 8.0.16. DD-10's expression needs nothing above 8.0.4, so this no longer gates the view migration — but an append-only migration deserves the recorded answer | DevOps | nothing now |
| ~~OQ-2~~ | ~~Read shape~~ → **DD-2** + DD-3 | — | — |
| ~~OQ-4~~ | ~~Spinner step~~ → **DD-6** | — | — |

### Observations found while designing — reported, not owned

| # | Observation |
| --- | --- |
| **O-1** | **Innovation Use measures have no reporting surface.** No view exposes role 3, so the decimals this spec enables reach no report. A gap this change makes visible, not one it creates. Reachable state, no ticket — worth one |
| **O-2** | ~~The `DECIMAL`-typed-as-`number` class is already live elsewhere~~ — **overstated; corrected at round 2 (`K-18`).** The column *is* `decimal(18,2)` typed `number?` with no entity transformer, but `bilateral.service.ts:669-686` **already coerces it null-safely**, documented and unit-tested (`bilateral.service.spec.ts:349,381,396`). **Not a live defect — and it is the in-repo precedent round 1 claimed did not exist.** What survives is the *shape* of the risk (a wire type declared in TypeScript, decided in driver config), recorded as a pattern rather than a bug. **No ticket owed** |
| **O-4** | **The `> 2⁵³` hydration case is unstated anywhere** (`K-21`). DD-2 hydrates via `Number(...)`, so a legacy 19-digit value round-trips as `Number("9223372036854775807.0000")` = `9223372036854775808` and is written back one unit off on the next save — *after* DD-18's whole-table diff has run. Today's `bigint` path loses the same precision symmetrically, so the upsert keys still agree and nothing breaks; but that symmetry is load-bearing and undocumented |
| **O-3** | `orm.config.ts:53`'s `bigNumberStrings: false` is **dead configuration** — inert without `supportBigNumbers`, which is set nowhere. Harmless, but it reads as load-bearing and misled this design's own first draft |

---

## 16. References

- **ADR-5**, **ADR-6** amendment, **ADR-11** (+ blind spot (i), column-coverage method) — `docs/trd/trd.md` §2.4
- Family **D-2**, **D-8**, **D-9**, **D-10**, **FR-4**, **FR-7** — `docs/specs/innovation-use/family.md`
- The design cross-check rule — **`docs/specs/general-setup/design.md` §2**. *(The superseded draft cited `KZ-016` directly; that lesson is **retired** and its rule now lives in the template. Noted at round 2 (`K-27`): the template's blockquote **still cites `KZ-016` itself**, and sits before `## 2. Architecture` rather than inside it — the rule's live home carries its own stale citation. Reported upstream, not fixed here.)*
- Kaizen, **with lineage named**, as the log mandates: `innovation-use` lineage — **KZ-002** (enumerate by the real thing), **KZ-003** (full suite for shared components), **KZ-005** (sweep every axis), **KZ-006** (a harness owes an end-to-end criterion). `staging` lineage — **KZ-001** (a double that does not evaluate what it stands for), **KZ-013** (archiving breaks citations), **KZ-017** (declare what a check cannot reach). Methodology — **K-001**, **K-004**, **K-012**, **K-014**, **K-015**
- `R-IUP-008` — `docs/specs/archive/2026-08-26-innovation-use--details-page/requirements.md:450-478`
- Judgment Day ledger — [`./judgment.md`](./judgment.md)

---

## 17. Unverified claims in this document

Named explicitly, because a design that hides these is the failure **KZ-017** describes.

| ID | Claim | Status |
| --- | --- | --- |
| **U-1** | §9.2's expected renders for DD-10's expression | **Predicted, not executed.** No MySQL was reachable while authoring, and neither judge could run SQL. `R-MSD-010` AC.2 gates it; DD-11 makes it automatable |
| **U-2** | `ALGORITHM=COPY` rebuild cost on the live table | Not measured — the live row count is unknown from the repo. `NFR-MSD-002`'s pre-flight reports it |
| **U-3** | Whether the live `report_oicr` body matches `1780694172676`'s text | Only the migration ordering is verified. A `SHOW CREATE VIEW` at rollout settles it |
| **U-4** | PrimeNG's effective fraction limit when `maxFractionDigits` is `undefined` | ✅ **RESOLVED at Round 4, by execution against `node_modules`, and both prior camps were right about different branches.** Keystroke path (`primeng-inputnumber.mjs:1333-1343`): `this.maxFractionDigits` is falsy when `undefined`, so the decimal separator is never inserted — **decimals are already refused when typing.** Intl path (`:834-838`): resolves to **3**, governing formatting and paste only. The row previously said this was *"unresolvable without a browser"* and that DD-12 *"makes it moot by pinning"* — **both false**: the decisive lines are readable in the repo, and DD-12 no longer pins anything |
| **U-5** | §9.2's four **property** claims (Exact / `down()`-safe / Version-portable / Type-stable) | **Reasoned, not executed.** "Exact" depends on `TRUNCATE(DECIMAL(24,4), 0)` returning scale 0; no MySQL was reachable to any of the six judges |
| **U-10** | **`DD-14`'s bound is now the one numeric claim in this document that IS executed.** Zero collisions and zero round-trip failures at every scale 0–4, against 3,616 collisions for round 2's bound — see §6.2's table. Listed here so the contrast with `U-5` is explicit: it is no longer unverified | ✅ **verified by execution** |
| **U-11** | `DD-12`'s claim that defaulting `maxFractionDigits` to `0` leaves OICR *identical or stricter* | **Narrowed at Round 4, not closed.** With `U-4` resolved the **direction** is now established from source rather than assumed: decimals refused before and after, paste rendering goes `2.5` → `3`. Executed alongside it: at `maximumFractionDigits: 0` PrimeNG's `getDecimalChar()` yields `""`, so `_decimal` degenerates to an empty character class that matches nothing and the separator is refused by a *different* branch (`onInputKeyPress`, code 46 ∉ 48–57) than the one that refuses it today. Same outcome, different mechanism. **What is still unverified is the rendered end-to-end claim** — no browser was reachable, and the interaction of `showButtons`, blur/`validateValue` and `ngModel` write-back was traced but never observed firing. `DC-3`'s rendered assertion is the gate |
| **U-6** | §2.1's "~200 lines" and §14's LOC split | **Estimates**, now labelled. Round 1 presented them unqualified |
| **U-7** | DD-20's four-column matching key uniquely identifies a row | Follows from the upsert's own identity tuple, but **not executed** against the live table |
| **U-8** | The charset/collation of DD-10's two `IF()` branches inside `CONCAT_WS` | **Unsettled.** The live view already needs `convert(report_field(...) using utf8mb3)` on another column (`baseline.sql:8080`) — direct evidence that collation aggregation here is not safely assumable. A judge flagged it and could not resolve it either |
| **U-9** | That any existing role-3 row sits **inside** DD-14's scale-4 bound | Unknown from the repo — exactly what `NFR-MSD-002`'s now-**blocking** pre-flight measures (`K-02`) |
| **U-12** | That `ResultQuantificationsService` is the only path reaching `result_quantifications`, making DD-13 structural | **Verified by four judges now** against the current tree (no OICR creation path, no AI/import path, no cascade, an empty 9-line controller; `grep -rn "createCustomValidation" src` → exactly `base-service.ts:134`, `:278`, `:345`, with no override anywhere). ⚠️ **Narrowed at Round 4:** the hook sits below both **live** writers, but `upsertQuantificationsByRole` bypasses the base class entirely (`RK-15`). The defensible claim is *"structural for every production writer"*, not *"no bypass exists"* |

> **Two claims round 1 asserted that turned out false are corrected out of this document rather than listed here:** DD-16's "paste is the reachable route" (`K-10`) and §9's `REGEXP_REPLACE`-in-`report_field` attribution (`K-13`). A register of unverified claims cannot launder a wrong one.
