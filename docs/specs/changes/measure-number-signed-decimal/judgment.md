# Judgment Day — Measure `Number` accepts signed decimals

> Findings ledger for the blind dual review of `design.md`, run at the `/akili-specify` Phase 2 **Review Design** gate by explicit user selection.
> Persisted here so `/akili-archive`'s Kaizen *Measure* step can read severe confirmed findings as a signal row.

---

## Transaction

| Field | Value |
| --- | --- |
| Target (immutable) | `docs/specs/changes/measure-number-signed-decimal/design.md` |
| In-scope context | `requirements.md`, `proposal.md`, root `CLAUDE.md`, `docs/trd/trd.md`, `docs/prd.md`, `docs/specs/innovation-use/family.md`, `docs/specs/kaizen-log.md` (Active Lessons only), `docs/specs/general-setup/*` |
| Mode | `judgment_day` — replaces ordinary 4R for this target; both were **not** run |
| Round | **1** of at most 2 |
| Fix ceiling | 2 fix rounds, 2 scoped re-judgments |
| Started / frozen | 2026-08-26 |
| Terminal state | **`escalated`** — see §Outcome |

## Judge protocol

| | Judge A | Judge B |
| --- | --- | --- |
| Mode | blind, read-only, background | blind, read-only, background |
| Model | `opus` (T3 Auditor) | `opus` (T3 Auditor) |
| Scope & criteria | identical prompt, 11 mandated verification areas | identical |
| Tool calls | 94 | 83 |
| Self-reported | 42 claims confirmed correct · **5 severe, 12 warning, 5 suggestion** | 34 claims confirmed correct · **4 severe, 12 warning, 3 suggestion** |
| Corroboration | two-judge agreement. **`review-refuter` was NOT launched** (Hard Rules) | — |

Both judges read real source, including `node_modules` (`class-validator`, `mysql2`, `typeorm`, `primeng`) to verify library semantics rather than assuming them.

### ⚠️ Recorded degradation — `author ≠ auditor`

The design was authored on `opus` (T1 Architect); both judges ran on `opus` (T3 Auditor). The registry maps both tiers to the same alias, so the roles cannot be separated by model without dropping a judge below the mandated auditor tier — and because the merge rule fixes only what **both** judges confirm, a weaker judge would **suppress** the stronger one's real findings rather than merely miss its own. Independence here is by **context and role** (fresh context, no access to the author's reasoning, read-only tools, identical criteria), not by model.

### Regions neither judge could inspect

- **No MySQL instance was reachable.** Every SQL-semantics judgement (`TRIM`, `TRUNCATE`, `CAST … AS SIGNED` overflow, `DOUBLE` notation, `report_field` output) is reasoned from documented semantics and transcribed bodies — **not** from executed query output.
- **The live Dev and Prod databases** — actual MySQL version, actual `result_quantifications` contents, and whether the live `report_oicr` body matches `1780694172676`'s text.
- **No browser** — PrimeNG's effective fraction limit when `maxFractionDigits` is `undefined` is read from source, not observed rendering.
- **`tasks.md` does not exist**, so §14's budget could not be checked against any decomposition.

## Skill resolution

| Skill | Resolved | Used by |
| --- | --- | --- |
| `judgment-day` | `~/.claude/skills/judgment-day` | parent orchestrator |
| its `references/` and `_shared/` files | **not packaged** | fell back to the contract in the skill body, as instructed |

---

## Findings ledger (frozen)

**28 findings.** `A` = Judge A, `B` = Judge B, `P` = parent verification.

### Confirmed by both judges — SEVERE

| ID | Finding | A | B |
| --- | --- | --- | --- |
| **J-01** | **OICR's integrality was never enforced anywhere except the `bigint` column, so the `ALTER` silently widens a live production surface the spec declares out of scope.** Neither OICR call site passes `maxFractionDigits` (`oicr-details.component.html:60,81`); the shared card's default is `undefined`, and PrimeNG then resolves `maximumFractionDigits` to **3**; `UpdateOicrDto:50-54` carries **no class-validator decorators**; `result-oicr.controller.ts:38-41` applies **no `ValidationPipe` at all**. Design §3 claims roles 1 & 2 are "enforced at its call site" — nothing enforces them. Consequence: `R-MSD-002`'s scenario and `R-MSD-007` AC.3 ("both are refused, exactly as today") are **not satisfiable** — `2.5` is not refused at OICR today, so a test written to that AC is red or asserts a falsehood | F-1 | F-1 |
| **J-02** | **§10's "the fixture tier structurally cannot see `report_field` formatting inside a view" is false**, so `DC-7`'s human substitute is unfounded. `src/db/baseline/baseline.sql` contains `CREATE FUNCTION report_field` (`:6559`) and the full `report_oicr` view, and fixtures already issue arbitrary SQL. Both `DC-7` and `DC-14` have a cheap, red-able automated gate in the same fixture directory the design is already editing. This is the `KZ-017` failure the design cites approvingly: a limit asserted rather than probed | F-2 | F-4 |

### Confirmed by both judges — severity split (A: severe · B: warning)

| ID | Finding | A | B |
| --- | --- | --- | --- |
| **J-03** | **`DD-10`'s superseding expression is asserted `exact`, `version-portable` and `down()`-safe but is never written as SQL** — `grep` for SQL in `design.md` finds only §16's `SELECT *`. Its portable reading, `CAST(x AS SIGNED)`, is bounded at 19 digits, while `DECIMAL(24,4)` holds **20** integer digits *by DD-1's deliberate choice* — so the "exact" branch clamps or errors on exactly the range DD-1's precision argument was written to protect. `DD-8` removes `@IsInt()`/`@Min(0)` with **no `@Max`**, and `isNumber(1e21, {maxDecimalPlaces: 2})` returns `true`, so the DTO admits magnitudes the expression cannot render. Also: `down()` on a 20-digit value does **not** merely round as `AR-2` says — it can **fail** | F-3 (S) | F-8 (W) |
| **J-04** | **§2.3 certifies a read-back against "every" `BUT it must NOT` / `AND IT MUST` clause; there are 21 and roughly half are covered.** Both judges counted independently (10 + 11). Missing most consequentially: **both clauses of `R-MSD-003`'s untouched-row scenario** — including *"AND IT MUST be exercised with a value that came from a real read, never with a hand-written literal"* (`K-012`). So the design's own headline defect (`DC-13`) has **no verification design**: nothing requires the test to seed from a real read, which is the only construction under which it can go red | F-5 (S) | F-9 (W) |

### Single-judge SEVERE — parent-verified, confirmed

> Per the merge rules these are `suspect`, not `confirmed`. I verified all three myself because they are cheap to check and change the decision; the verification command and output are recorded.

| ID | Finding | Judge | Parent verification |
| --- | --- | --- | --- |
| **J-14** | **§8's security posture is false.** It claims the endpoint "keeps `@Roles(...)`, `RolesGuard`, `ResultStatusGuard`, and chunk 2's four protections including `assertInnovationUseOwnership`." | A F-4 | ✅ **Confirmed.** `result-innovation-use.controller.ts:29` states verbatim: *"No `@Roles(...)` (DD-5): section access is JWT + `ResultStatusGuard` only."* The `@Patch` carries only `@UseGuards(ResultStatusGuard)` (`:58`). And `assertInnovationUseOwnership` exists **only** in `result-actors.service.ts:342` and `result-institution-types.service.ts:362` — **there is no ownership check on the quantification path** |
| **J-15** | **`DD-8` introduces a `500`.** `@IsNumber({ maxDecimalPlaces: 2 })` throws an unhandled `TypeError` for any `\|value\| < 1e-6`, where `@IsInt()` safely returned `400` | B F-2 | ✅ **Confirmed by execution.** `isNumber(1e-7, {maxDecimalPlaces:2})` → `THROWS TypeError: Cannot read properties of undefined (reading 'length')`; same for `-1e-7`. Cause: `class-validator` does `value.toString().split('.')[1].length`, and JS switches to exponential below `1e-6`. Also confirmed: `1e21` → `true` (feeds **J-03**). Clean cases behaved as designed (`2.555` → `false`, `-1500`/`-0.75`/`0`/`2.5` → `true`) |
| **J-16** | **`DD-2`'s rejection rationale rests on a false premise:** "there are **zero** other `DECIMAL` columns", and `RK-10`/`R-MSD-009`'s "no in-repo precedent" | B F-3 | ✅ **Confirmed.** **Seven** declarations in four entities: `agresso-contract.entity.ts:20,29,141,150`, `clarisa-country.entity.ts:34,42`, `result-pool-funding-toc-alignment.entity.ts:61` (`decimal(18,2)`, typed `number?`, on a `results`-adjacent child table, **no transformer**). My grep used `type: 'decimal'` and structurally could not match the positional `@Column('decimal', …)` form — **a `KZ-017` scope failure in my own authoring.** "Zero transformers" *is* correct (`grep -rn "transformer:" src/domain` → nothing) |

### Confirmed by both judges — WARNING

| ID | Finding | A | B |
| --- | --- | --- | --- |
| **J-05** | "The **seven** sibling count fields" — there are **six**. The DTO has seven `@Min(0)` total, one of which is `quantification_number` itself. `requirements.md` contradicts itself (AC.1 "six" vs the scenario's "seven" vs `DC-3`'s "all eight") | F-6 | F-12 |
| **J-06** | §2.1's "**No new files** except the migration" and "the only irreversible artifact" contradict `DD-10`'s **second** append-only migration, which §9 and §11 both require. It appears in no composition row — and the view it must reproduce is ~180 lines, against a stated "≈ 260 production" LOC total | F-7 | F-6 |
| **J-07** | `oicr-details.component.ts:117` does not document `number \| string` — it is unrelated code. `:183,205` are correct. The real declaration is `oicr-creation.interface.ts:118`. A citation **added during design** that points at nothing | F-9 | F-13 |
| **J-08** | **`quantification_number` is a composite *identity* key in the upsert** (`upsertByCompositeKeys(…, ['quantification_number','unit','description'], …)`, keyed with `String(value)` in `base-service.ts`), so the rollout hazard is not only a `400`. On the **OICR** path — which has no validators at all (J-01) — a read/write shape mismatch silently deactivates existing rows and inserts duplicates, with no error and no log. Falsifies `A-5` ("no other reader") | F-10 | F-15 |
| **J-09** | `NFR-MSD-002` is a **Must** whose target is literally *"`design.md` records the executed pre-flight command **and its output**"* — and §3 instead argues *"no measurement gates the choice"*, which the NFR pre-emptively says is not a substitute. Nothing downstream will notice it is unmet | F-11 | F-10 |
| **J-10** | Kaizen citations **name no lineage**, which the log mandates in bold (`⚠️ Colisión de IDs sin reconciliar … Al citar una lección, nombra el linaje`). `KZ-008` means different things in the two live lineages, and **`KZ-016` — cited as §2.3's authority — is retired** | F-14 | F-14 |
| **J-11** | "The four lifecycle routines enumerate this column **by name**" — **only `SP_versioning`'s copy path does.** The other three reference the table only. `requirements.md`'s glossary and ADR-11 both carry the qualifier *"on the copy path"*; the design dropped it. So only one routine can lose a value under an unchanged column name | F-15 | F-7 |
| **J-12** | §9's "not the four the proposal estimated" **misquotes** the proposal, which counted migration *files* (correctly — there are exactly four). Meanwhile the one genuinely false upstream claim is left standing: `R-MSD-010` and `RK-5` attribute two of them to "the two SP-versioning families", and **no SP-versioning migration contains that expression** | F-18 | F-16 |

### Single-judge WARNING — recorded as suspect, not fixed

| ID | Finding | Judge |
| --- | --- | --- |
| **J-17** | **`DD-3` as specified does not compile.** A *second* declaration types this field — `innovation-use-details.component.ts:80-85`'s `InnovationUseQuantificationPayload` — and `buildPayload()` at `:435` assigns the widened type into it. §2.1 lists only the shared interface, and `DD-3`'s coercion sits in the **read** adapter, not on the write path | A F-8 |
| **J-18** | **Scope item `S-10` is silently dropped.** No design section owns "amend `R-IUP-008`; record `FR-12`", `R-MSD-007` AC.4 (a Must), or `DC-12`'s sweep. And **`FR-12` does not exist** in `family.md` (the table runs FR-1…FR-11). The superseded text at `R-IUP-008:458` is still live — the exact `KZ-005`/`KZ-013` failure both cited in §16 | A F-12 |
| **J-19** | **`R-MSD-006` AC.2 has no mechanism, and its state is unreachable.** `DD-7` touches only the counting unit; `inputValid()` has no `maxFractionDigits` branch and the template renders only two messages. Meanwhile `maxFractionDigits: 2` makes PrimeNG *prevent* a third decimal at the input, so the "out of rule" state §6.5 tabulates cannot occur at the client | A F-13 |
| **J-20** | **§16's `SELECT *` reference implementation cannot be reused as-is.** `fetchFullRow` asserts `expect(rows).toHaveLength(1)` and is used against a one-row-per-result table; `result_quantifications` routinely holds several rows per `result_id`, including deactivated ones. `DD-9` never states the row-matching key — which is the value itself, i.e. the very thing under test | A F-16 |
| **J-21** | **`DD-7`'s "blast radius is provably nil" is false.** Six of seven `app-input` number call sites pass no `maxFractionDigits`, so PrimeNG resolves to 3 decimals and a fractional value is producible in all of them today. Cosmetic in effect, but the justification for not testing outside the IU field does not hold — and `KZ-002` is cited in the same design | A F-17 |
| **J-22** | **The stated *cause* of today's read shape is wrong.** `bigNumberStrings: false` is **inert** without `supportBigNumbers`, which is set nowhere; the `number` comes from mysql2's default. Deleting `orm.config.ts:53` would change nothing. Worse, `result-innovation-use.service.ts:287-288` — inside the file the design cites — asserts the **opposite** ("`bigint` … which the MySQL driver returns as a `string` at runtime"), and `result-actors.service.ts:377-384` refuses to assume either. The *conclusion* (DD-2 is needed) survives; the mechanism does not, and §2.3's mandated cross-check against module doc comments missed a direct contradiction in the same file | B F-5 |
| **J-23** | **`DD-2` does not state its `null` contract, and TypeORM applies the transformer to `null`** (`MysqlDriver.js:510-514`). A naive `from: v => Number(v)` yields `Number(null) === 0`, which breaks the `null ≠ 0` invariant §6.5 asserts, stops `quantificationRowAbsent` from dropping blank rows, and fails `R-MSD-001` AC.6/AC.7 and `R-MSD-009` AC.4 — on the path the design calls its *single normalising point* | B F-11 |

### Single-judge SUGGESTION

| ID | Finding | Judge |
| --- | --- | --- |
| **J-13** | `T-07` / `T-10` are cited in §2.3 as this spec's tasks; no `tasks.md` exists and neither id resolves. Two of twelve compliance rows discharge a clause against a non-existent artifact | **both** (A F-19, B F-17) |
| **J-24** | `DD-2` specifies only the **read** direction of the transformer. `to` is exercised on every re-save of an unchanged row — the exact path `DC-13` is about | A F-20 |
| **J-25** | §6.4 places `OQ-IUP-8`'s 2.378:1 defect "in this component"; `family.md` puts it in `custom-fields.scss` / `.section-title`. Only `RB-5` is in `quantification-item` | A F-21 |
| **J-26** | `OQ-5` is narrowable from the repo: the live `report_field` body uses `REGEXP_REPLACE`, which needs MySQL ≥ 8.0.4 — so Dev/Prod are provably 8.0.4+, and the open window is **8.0.4 … 8.0.16 only** | A F-22 |
| **J-27** | §13's consumer enumeration omits **`oicr_validation`**, which *does* read the column (`1780519377343-UpdateOicrGreen.ts:41-60`, `rq.quantification_number IS NOT NULL`). Sign- and scale-agnostic, so the verdict survives — but `A-5` claims verification "against the green check" in the singular | B F-18 |
| **J-28** | The **16-round** estimate is 1.45 rounds/task, below both comparable measurements in the same family the design cites for calibration (chunk 2: 2.00, chunk 3: 1.64). A tripwire set below the only actuals will fire on normal execution and train reviewers to wave it through | B F-19 |

### Contradictions between judges

**None on any fact.** Two severity splits (`J-03`, `J-04`), where both judges confirmed the finding and rated it differently.

---

## Merge tally

| Class | Count |
| --- | --- |
| Confirmed by both — SEVERE | **2** (J-01, J-02) |
| Confirmed by both — severity split, higher rating SEVERE | **2** (J-03, J-04) |
| Single-judge SEVERE, **parent-verified confirmed** | **3** (J-14, J-15, J-16) |
| Confirmed by both — WARNING | **8** |
| Single-judge WARNING (suspect) | **7** |
| SUGGESTION | **6** |
| Judge contradictions | 0 |
| **Total** | **28** |

---

## Round 1 — fix applied

**Scope decision that unblocked the escalation** (product owner, 2026-08-26): Option C (a separate column) rejected as mediocre; instead **the storage widens for all three roles, and OICR is held to integers by explicit enforcement** — client pinned *and* the API validated. `NG-1` withdrawn deliberately. Scale set to **4** in UI, DTO and column. Magnitude **derived from the scale**. Migration gets a **backup table + whole-table diff**.

`design.md` was **rewritten**, not patched — the findings touched almost every section. The superseded draft is not retained in the spec folder; its errors are recorded above, which is the durable record.

| ID | Disposition |
| --- | --- |
| **J-01** | **Resolved by scope decision** → `DD-12` (pin both OICR call sites) + `DD-13` (validators + the endpoint's first `ValidationPipe`) + new **`R-MSD-011`**. `NG-1` withdrawn; `A-3` marked withdrawn |
| **J-02** | **Fixed** → `DD-11`. `DC-7`'s human substitute withdrawn; a fixture gate replaces it, including the `bigint` branch via `migration:test:revert` |
| **J-03** | **Fixed** → `DD-10` + **§9.2 writes the SQL out**. `CAST(… AS SIGNED)` replaced with `CAST(TRUNCATE(…) AS CHAR)` — no 64-bit bound. `AR-2` corrected: `down()` can **fail**, not only round |
| **J-04** | **Fixed** → §2.3 now enumerates **all 21** clauses, including the two the previous cross-check omitted, and `DD-19` gives `DC-13` its falsifying construction |
| **J-05** | **Fixed** → six, not seven, in `DD-8`; requirements' three-way contradiction (six/seven/eight) swept |
| **J-06** | **Fixed** → the `report_oicr` migration is in §2.1, sized at ~200 lines, and folded into the budget |
| **J-07** | **Fixed** → `:117` removed; the real declaration cited (`oicr-creation.interface.ts:118`) |
| **J-08** | **Fixed** → Executive Summary Finding 2, §5.3, and new **`R-MSD-013`** + **`DC-16`**. `A-5` marked falsified |
| **J-09** | **Fixed** → `NFR-MSD-002`'s target moved from `design.md` (which cannot reach a database) to the migration task's `execution.md` entry. A target no phase can satisfy is a gate that fails by construction |
| **J-10** | **Fixed** → §16 names the lineage per lesson; `KZ-016` replaced with its live home, `general-setup/design.md` §2 |
| **J-11** | **Fixed** → `DD-9` scoped to `SP_versioning`'s copy path; the other three routines can orphan rows but cannot lose a value |
| **J-12** | **Fixed** → §9 corrected (the proposal counted *files*, correctly) **and** the false SP-versioning attribution swept out of `R-MSD-010` |
| **J-14** | **Fixed** → §8 rewritten to match `result-innovation-use.controller.ts:29`; the absent ownership check on the quantification path named |
| **J-15** | **Fixed** → `DD-17` replaces `@IsNumber({maxDecimalPlaces})` with a custom constraint; new **`DC-15`** with the executed red |
| **J-16** | **Fixed** → `DD-2`'s rejection rationale corrected to seven columns; the authoring grep's scope failure recorded; the live instance filed as **`O-2`** |
| **J-17** | **Fixed** → `DD-15` reconciles the second payload type declaration |
| **J-18** | **Fixed** → `S-10`'s two files added to §2.1; `FR-12` and the `R-IUP-008` amendment now have an owning artifact |
| **J-19** | **Fixed** → `DD-16` adds the mechanism **and** identifies paste as the only reachable route, since keystroke entry is prevented |
| **J-20** | **Fixed** → `DD-20`: multi-row-aware comparison, matched on `(result_id, role, unit)`, never on the value under test |
| **J-21** | **Fixed** → `DD-7`'s "provably nil" withdrawn; the change is asserted rather than excused |
| **J-22** | **Fixed** → §5.4 corrects the mechanism; the dead config filed as **`O-3`** |
| **J-23** | **Fixed** → `DD-2` states the null contract explicitly; §2.3 clause 2 maps to it |
| **J-24** | **Fixed** → `DD-2` specifies the `to` direction and why it is exercised |
| **J-25** | **Fixed** → §6.5 splits the two defects to their real files |
| **J-26** | **Fixed** → `OQ-5` narrowed to 8.0.4 … 8.0.16 via `report_field`'s `REGEXP_REPLACE`; no longer gates the view migration |
| **J-27** | **Fixed** → `oicr_validation` added to §13's enumeration; `A-5` corrected |
| **J-28** | **Fixed** → budget re-baselined to 1.8 rounds/task (≈ 25), above both family actuals |
| **J-13** | **Fixed** → `T-07`/`T-10` references removed; §2.3 no longer discharges a clause against a non-existent artifact |

**28 of 28 addressed.** No finding was waved through, and none was closed by citing a different requirement.

### What the fix round added that no judge asked for

Recorded so the re-judgment can attack it as new surface, not inherited:

| # | Addition | Origin |
| --- | --- | --- |
| 1 | `R-MSD-011`, `R-MSD-012`, `R-MSD-013` and `NFR-MSD-005` | the scope decision — none existed at judgment time |
| 2 | `DD-12`…`DD-20` — nine new design decisions | the scope decision plus the fixes |
| 3 | §9.2's SQL expression | written for the first time; **never executed** (`U-1`) |
| 4 | §17 — an explicit register of this document's four unverified claims | not requested; added because a design that hides them is the `KZ-017` failure |

---

## Outcome

**Round 1: `ESCALATED ⚠️` → escalation resolved by product-owner ruling → fix applied.**

Ledger frozen above. **One fix round and two scoped re-judgments remain available**; the lineage was neither reset nor extended.

**The re-judgment has not been run.** It is the contract's step 5, and there is a specific reason to want it here: the fix round rewrote a document in response to 28 findings and **added ~9 new design decisions and 4 new requirements that no judge has ever seen**. Re-judgment is explicitly permitted to record fix-caused defects, and this fix delta is large enough to have them.

Terminal state stays **`escalated`** until a scoped re-judgment returns and the ledger closes as `approved`.

---
---

# Round 2 — scoped re-judgment (ledger frozen)

| Field | Value |
| --- | --- |
| Scope | (A) the 28 round-1 dispositions · (B) the fix delta: `DD-12`…`DD-20`, `R-MSD-011/012/013`, `NFR-MSD-005`, `DC-15/16`, `RK-12`, §9.2's SQL, §17, the rewritten §2.3 |
| Judges | 2, blind, read-only, `opus`, identical prompts · 67 and 54 tool calls |
| Judge A | **9 severe, 16 warning, 6 suggestion** · `DISPOSITIONS-VERIFIED: 23 of 28` (false: J-01, J-03, J-04, J-05, J-19) |
| Judge B | **7 severe, 11 warning, 5 suggestion** · `DISPOSITIONS-VERIFIED: 15 of 28` |
| Fix rounds used | 1 of 2 · Re-judgments used | 1 of 2 |
| Terminal state | **`escalated`** |

## Contradictions between judges — resolved by parent verification

| # | Disagreement | Verdict |
| --- | --- | --- |
| C-1 | Number-typed `app-input` call sites: A said **7**, B said **13** | **B is right — 13.** Two syntaxes exist: `[type]="'number'"` (7 occurrences, 3 files) and `type="number"` (6 occurrences, 3 files). Exactly **one** passes `maxFractionDigits`, so the figure is **12 of 13**. The design said "6 of 7"; Judge A said "7". **A grep bound to one syntax structurally cannot see the other** — `KZ-017` again, and this time it caught a judge as well as the author |
| C-2 | `oicr-creation.interface.ts` — A said `:118` was correct, B said `:117` | **B is right — `:117`.** `:118` is `unit: string;`. The design's replacement citation is still off by one, on the exact citation `J-07` was about |

## Confirmed by BOTH judges — SEVERE

| ID | Finding | Class | A | B |
| --- | --- | --- | --- | --- |
| **K-01** | **`DD-13`'s `ValidationPipe({ whitelist: true })` on a DTO with zero decorators destroys OICR data on the first save.** `UpdateOicrDto` carries no `class-validator` decorator on any of its ~16 properties, and `whitelist: true` **deletes** every undecorated property before the handler runs. Decorating only the two quantification arrays therefore discards `sharepoint_link`, `tagging`, `outcome_impact_statement`, `maturity_level_id`, `link_result`, `result_impact_areas` and the rest. Judge A traced the consequences into the service: `sharepoint_link` → `null`, and `upsertByCompositeKeys` with an empty array runs `entityManager.update(whereData, { is_active: false })` — *"If no data, deactivate all existing records"* — so tags, external links and impact areas are all deactivated. **The fix round added a pipe to close a validation hole and opened a data-destruction hole on the same live endpoint.** The design never mentions `whitelist` semantics; the repo documents the hazard class at `result-innovation-use.controller.ts:26-28` | FIX-CAUSED | R2-01 | R2-01 |
| **K-02** | **`DD-14`'s magnitude bound re-opens Finding 1's exact failure shape.** The field previously permitted up to `Number.MAX_SAFE_INTEGER` (16 digits); `DD-14` narrows the Innovation Use DTO to 11 integer digits — roughly five orders of magnitude. `buildPayload()` resends untouched rows verbatim, so an existing role-3 row above 99,999,999,999 now `400`s on a save the user never made — the identical chain the Executive Summary exists to close, caused by magnitude instead of type. `NFR-MSD-002`'s pre-flight, the one measurement that would detect such a row, is declared **"confirmatory, not blocking"**. §13's reversion challenge never challenges the narrowing, and `A-4`/`AR-1`/§4.3 still assert "no new magnitude bound is introduced" | FIX-CAUSED | R2-02 | R2-03 |
| **K-03** | **§2.3 certifies "all 21 clauses"; the patched requirements now hold 25, and the four uncovered are the fix round's own.** Both judges counted independently: `BUT it must NOT` → 12, `AND IT MUST` → 13. The omissions are `R-MSD-011`'s *"must NOT be silently rounded to 3 and stored"* and *"AND IT MUST be announced to consumers"*, and `R-MSD-013`'s *"must NOT deactivate either row"* and *"AND IT MUST be seeded from a real read, never from hand-written literals"* — the last being the exact `K-012` clause `J-04` was about. **`J-04` reproduced with a larger denominator**, by enumerating the clauses that existed at judgment time while adding four more in the same edit | DISPOSITION-FALSE | R2-03 | R2-04 |
| **K-04** | **`DD-13`'s per-row validators are not implementable on the surface §2.1 names.** `actual_count` / `extrapolate_estimates` are typed with the TypeORM **entity** (`ResultQuantification[]`), which carries only `@Column`/`@ApiProperty`. class-validator will not descend without `@ValidateNested({each:true})` + `@Type(() => …)` and a decorated nested class — which exists for the IU path (`InnovationUseQuantificationDto`) and **nowhere for OICR**, and appears in no composition row. Judge A adds the compounding case: decorating the shared **entity** instead makes `whitelist` delete each row's undecorated `unit` and `description`, collapsing `generateCompositeKey` to number-only — so rows sharing a number but differing in unit deactivate each other, which is `DC-16`'s own failure mode | FIX-CAUSED / NEW-SURFACE | R2-07 | R2-02 |

## Confirmed by BOTH — severity split (higher rating shown)

| ID | Finding | Severity | A | B |
| --- | --- | --- | --- | --- |
| **K-05** | **`DD-17` is under-specified in the dimension that decides whether it crashes, over-rejects, or silently rounds — and the design's stated crash condition is false.** The claim *"throws for any `\|value\| < 1e-6`"* is wrong: executed, `1e-7`/`-1e-7`/`5e-7` throw but **`1.5e-7` returns `true`** — it is *accepted today* and would store as `0.0000`. The real condition is *"the exponential string contains no `.`"*. Three readings of "a fixed-notation representation" each fail somewhere: `(2.55).toFixed(20)` → `"2.54999999999999982236"` **rejects legal values**; `(1e-7).toFixed(4)` → `"0.0000"` **silently rounds to zero**, contradicting `DD-1`; `(1e21).toFixed(20)` → `"1e+21"`, so if scale derivation runs before the bound check **the `TypeError` recurs**. `DD-17` mandates no ordering, and never says a non-`number` input is rejected — which Finding 1's chain depends on | **SEVERE** (B) / warning (A) | R2-20 | R2-06 |
| **K-06** | **`requirements.md` states both answers, in both directions, on the two decisions the fix round turns on.** `:637` still reads *"RESOLVED at this gate → **2** in UI/DTO"*; `:638` *"Does it extend to OICR? → **no**"*; `R-MSD-001`'s title and the ID index still say *"two-decimal"*; `R-MSD-003`'s Behavior still says *"at most **2** fractional digits. Rejects a third"*; `:37` still says *"the **seven** count fields"*; `:109` still says *"`NG-1`…`NG-5` carry over **unchanged**"*. Judge A rates one instance SEVERE on its own: **`R-MSD-003` AC.3 asserts `2.555` is rejected `400`, and at scale 4 it is accepted** — executed: `isNumber(2.555,{maxDecimalPlaces:4})` → `true`. A Must AC that is red against a correct implementation | **SEVERE** (A) | R2-05, R2-10, R2-11, R2-12, R2-13 | R2-07 |
| **K-07** | **`AR-2` and `R-MSD-004` AC.4 were never corrected**, though the ledger records it. Both still say `down()` *rounds*; only `design.md` says it can **fail**. `NFR-MSD-001`'s target — *"`up()` and `down()` both execute cleanly"* — is unreachable on real data, and a tester writing to AC.4 will treat a `1264`/`1406` error as a test bug | **SEVERE** (A) / warning (B) | R2-04 | R2-13 |
| **K-08** | **`J-14`'s falsehood survives in the approval artifact, and the security-review waiver is discharged by citing it.** `requirements.md:214` still says *"the endpoint's existing `@Roles(...)`, `RolesGuard`, … and `assertInnovationUseOwnership` are untouched"*, and `:671` waives security review *"(`R-MSD-003` Permissions)"* — on a spec that adds a `ValidationPipe` to a previously unvalidated mutation endpoint. `design.md` §8 was corrected; the requirements were not | **SEVERE** (A) / warning (B) | R2-06 | R2-16 |
| **K-09** | **`DD-7` makes the digit warning unreachable everywhere — it ships dead code.** The guard fires at **18 digits**, while `DD-14` caps scale-4 at 15 digits and scale-0 at 16. No configured call site can reach 18. `DD-7` removes a live false positive *and the true positive with it*; §6.4's *"still fires"*, §2.3 clause 16, `R-MSD-006` AC.3/AC.4 and `DC-10`'s falsifier all govern a state that can no longer occur | **SEVERE** (A) / warning (B) | R2-09 | R2-12 |

## Single-judge SEVERE — suspect

| ID | Finding | Judge |
| --- | --- | --- |
| **K-10** | **`DD-16`'s "paste is the reachable route" is false.** PrimeNG's paste path runs `formatValue` through `Intl.NumberFormat`, which **silently rounds**: executed, `Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(2.55555)` → `"2.5556"`. And `app-input`'s own `@HostListener('paste')` returns unless `type === 'text'`. So `R-MSD-006` AC.2 remains a Must with **no reachable trigger** — `J-19` closed by asserting a route that was never tested | A R2-08 |
| **K-11** | **The four new requirements have zero design traceability.** `grep -c` over `design.md`: `R-MSD-011` → 0, `R-MSD-012` → 0, `R-MSD-013` → 0, `NFR-MSD-005` → 0. §1's G-5 restates `R-MSD-012`'s title verbatim and maps to `R-MSD-001/002`. Judge A found the mirror image: `requirements.md` §4.2's scope register (`S-1`…`S-10`) was never patched either, so five files the design mandates are formally out of scope, and `S-7`'s "**one** migration" and `S-8`'s "**do not build a new harness**" both contradict the design | B R2-05 (+ A R2-26) |

## Confirmed by BOTH — WARNING (abbreviated)

| ID | Finding | A | B |
| --- | --- | --- | --- |
| **K-12** | §9.2 omits **`NULL`**, and its `down()`-safety proof is false for it: `NULL = TRUNCATE(NULL,0)` → `NULL`, so `IF()` takes the **else** branch — the branch called unreachable. Outcome is benign (`'Not provided'`), the proof is not, and NULL is a seventh case absent from `R-MSD-010` AC.2's mandated six | R2-18 | R2-09 |
| **K-13** | `REGEXP_REPLACE` is in **`valid_text`** (`:24`), not in `report_field`'s body (`:31-49`). The 8.0.4+ conclusion survives, but the cited evidence is in the wrong routine — the `D-10` failure the same section invokes, and `OQ-5`'s downgrade rests on it | R2-23 | R2-10 |
| **K-14** | **`DD-14`'s premise is false.** "Exactly representable as an IEEE-754 double" does not hold for values the rule admits (`0.1`, `2.55`). Judge A executed round-trips and confirms **15 is the right budget** (`Number("9999999999999999")` → `10000000000000000`) and found no violating pairing, but the property delivered is 15-digit *round-trip fidelity*, not exactness — and the scale-0 exemption is 16 digits, violating the stated rule, safe only under a *different* guarantee. Judge B proposes the coherent formulation `value × 10^scale ≤ 2⁵³−1`, under which **scale 0 needs no exemption** and scale 4's cap is ≈ 900,719,925,474 — **~9× larger** than `DD-14`'s | R2-19 | R2-08 |
| **K-15** | **§17's register of unverified claims is incomplete** — at least five same-class claims are absent, two of them demonstrably false (`DD-16`'s paste route, §9's `REGEXP_REPLACE`). §17's own framing makes omission worse than absence: a four-row register implies the rest are verified | R2-24 | R2-18 |
| **K-16** | **The budget's rounds axis was corrected and the LOC axis was not.** 1.8 rounds/task is above chunk 3 (1.64) but **below chunk 2 (2.00)** — the migration-bearing chunk — so the ledger's "above both actuals" is false; and **chunk 1 is a third actual (≈0.93)** neither the design nor the ledger acknowledges. The ≈930 test-LOC figure sits ~5× below the only measured fixture tier in the family (chunk 2: 4,619 LOC; chunk 3: 6,133 total against ~3,400 written, +80.4%) | R2-25 | R2-14 |
| **K-17** | §2.1 claims "**every** new file" while omitting **every unit-test file** the defect classes require (`DC-1`, `-2`, `-3`, `-6`, `-9`, `-10`, `-15`), and §10's "Server unit … including the `1e-7` case" has no owning file. Judge A adds: `R-MSD-013` AC.4 and `DC-16` require an **OICR-path fixture**, and no fixture exercises `updateOicr` at all | R2-22 | R2-15 |

## Single-judge WARNING / SUGGESTION — suspect

| ID | Finding | Judge |
| --- | --- | --- |
| **K-18** | **`O-2` overstates, and the design misses a real precedent.** `bilateral.service.ts:669-686` **already** coerces `quantitative_contribution` null-safely, documented and tested (`bilateral.service.spec.ts:349,381,396`), in exactly the shape `DD-2` mandates. So (a) `O-2` is not a live defect, and (b) there **is** an in-repo precedent — a service-layer coercion — which `DD-2`'s "Rejected" list never names and `RK-10` still denies exists | B R2-17 |
| **K-19** | **§9.2's trim branch is dead once `DD-13` lands.** `report_oicr` reads roles 1 and 2 only; `DD-12`+`DD-13` enforce integers there, and the column was `bigint` before, so no fractional row can exist in the view's domain. `CAST(TRUNCATE(x,0) AS CHAR)` alone would discharge `R-MSD-010` with strictly less irreversible surface in a migration the design itself calls unable to be edited after deploy | A R2-17 |
| **K-20** | **`DD-20`'s matching key does not uniquely identify a row.** Row identity is `['quantification_number','unit','description']` per role, so two active rows may share a `unit`. `(result_id, role, unit)` selects a **set** — the same ambiguity, one column wider, that made `fetchFullRow`'s `toHaveLength(1)` the `J-20` defect. The value-free identity is `(result_id, role, unit, description)` | A R2-21 |
| **K-21** | **The `> 2⁵³` hydration case is unstated.** `DD-2` hydrates via `Number(...)`, so a legacy 19-digit value round-trips as `Number("9223372036854775807.0000")` = `9223372036854775808` and is written back one unit off on the next save — *after* `DD-18`'s whole-table diff has run and cannot see it. Today's `bigint` path loses the same precision symmetrically so keys still match, but nothing says so | B R2-23 |
| **K-22** | `requirements.md` residuals the ledger records as fixed: `:383`/`RK-10` still claim zero `DECIMAL` precedent; `RK-11` still cites the inert `bigNumberStrings` mechanism; **`RK-5` still names the human substitute `DC-7` withdrew**; `R-MSD-005:284` still says all four routines enumerate the column by name | A R2-14/15/16, B R2-16 |
| **K-23** | `DC-15` appears in no row of the requirement index — the gate for a parent-verified SEVERE has no requirement obliged to exercise it. `NFR-MSD-005` is mapped to `DC-16`, an unrelated class, and inserted out of numbering order | A R2-27 |
| **K-24** | §2.3 says the `service.ts:287-288` contradiction is "Reconciled in §5.4"; §5.4 asserts the opposite mechanism and never mentions the comment. One contradicting comment is scheduled for correction (`quantification-item:29`), the other is declared reconciled without being touched | A R2-30 |
| **K-25** | **`OQ-5` denotes three different questions** across the three documents, and `A-1` cites `OQ-1` unqualified — resolvable only against the *proposal's* numbering. The document violates the disambiguation rule it issues | A R2-29, B R2-20 |
| **K-26** | **`proposal.md` was never patched** and now contradicts the spec on six points (`NG-1` live, `OQ-2` "enforce 2", `OQ-3` "no OICR", "seven" counts, `RK-3` "zero precedent", `RK-5`'s false SP-versioning attribution) — while `requirements.md:109` and `:615` **import from it by reference** | A R2-28, B R2-22 |
| **K-27** | The cross-check rule's live home (`general-setup/design.md`) **still cites the retired `KZ-016`** as its own authority, and it sits before §2, not in it. Lineage naming is partial: `design.md:35` and `DD-4` cite `KZ-017`/`KZ-002` unqualified; `requirements.md` names no lineage anywhere | A R2-31, B R2-21 |
| **K-28** | `oicr-creation.interface.ts:118` → **`:117`** (parent-verified, C-2) | B R2-19 |

## Merge tally — round 2

| Class | Count |
| --- | --- |
| Confirmed by both — SEVERE | **4** (K-01…K-04) |
| Confirmed by both — severity split, higher rating SEVERE | **5** (K-05…K-09) |
| Single-judge SEVERE (suspect) | **2** (K-10, K-11) |
| Confirmed by both — WARNING | **6** (K-12…K-17) |
| Single-judge WARNING / SUGGESTION (suspect) | **11** (K-18…K-28) |
| Judge contradictions | **2 — both resolved by parent verification, both in Judge B's favour** |
| **Total** | **28** |

**Dispositions that did not verify: 5 by Judge A's count (J-01, J-03, J-04, J-05, J-19), 13 by Judge B's.** The union includes `J-04` reproduced at a larger denominator and `J-01` reproduced as a worse defect.

---

## Outcome — round 2

**`JUDGMENT: ESCALATED ⚠️`**

The round-one fix **made the design worse in two verifiable ways** — `K-01` would destroy OICR data on the first save through the endpoint the fix was meant to protect, and `K-02` re-opens the same `400` the fix was built to close, by magnitude instead of type. Both were introduced by the correction, not found in the original.

**One fix round and one scoped re-judgment remain** — the lineage is neither reset nor extended. But the final fix round is **not** being spent on the author's own judgment, because three of the four both-severe findings need a **decision**, not an edit:

| # | Decision the user owns |
| --- | --- |
| 1 | **`DD-13`.** As designed it is dangerous (`K-01`) and not implementable as scoped (`K-04`). Options: validate inside the service with no pipe; fully decorate `UpdateOicrDto` plus a new nested OICR DTO (a materially larger spec); or revert to UI-only pinning and route the API hole to its own spec — the original `NG-1` position, now better supported than when it was overridden |
| 2 | **`DD-14`'s bound** (`K-02`, `K-14`). Adopt Judge B's formulation (`value × 10^scale ≤ 2⁵³−1` → ≈ 900,719,925,474 at scale 4, no scale-0 exemption needed), or make `NFR-MSD-002`'s pre-flight **blocking** so an out-of-bound existing row stops the change |
| 3 | **`DD-10`'s expression** (`K-19`). If `DD-13` lands, the trim branch is unreachable and the append-only view migration can carry less irreversible surface |

Everything else — the `requirements.md` contradictions, the citations, §17, §2.3's count, the budget's LOC axis, `proposal.md`'s divergence — is mechanical and belongs in the final fix round once those three are settled.

---

# Round 2 — fix applied (FINAL fix round)

**Scope decisions from the product owner at the round-2 escalation:**

| Decision | Effect |
| --- | --- |
| **`DD-13` → validate in the service, no pipe** | `K-01` and `K-04` closed at the root. `UpdateOicrDto` and `result-oicr.controller.ts` are **no longer touched at all**, so nothing can be whitelisted away and no nested DTO is needed |
| **`DD-14` → `max = ⌊(2⁵³ − 1) / 10^scale⌋`, and the pre-flight becomes BLOCKING** | Scale 4 rises from 99,999,999,999 to **900,719,925,474** (~9×); scale 0 lands **exactly** on `Number.MAX_SAFE_INTEGER`, so the special case disappears; and an existing out-of-bound row now **stops** the change instead of `400`-ing later |

## Dispositions — round 2

| ID | Disposition |
| --- | --- |
| **K-01** | **Closed at the root** → DD-13 rewritten: service-layer validation, no pipe, no DTO decorators. §2, §2.1, §4, §8, §11 and `R-MSD-011` all propagated |
| **K-02** | **Closed** → DD-14's new formula (9× larger at scale 4) **and** `NFR-MSD-002`'s pre-flight promoted to **blocking**. `AR-1` corrected to admit the bound exists |
| **K-03** | **Closed** → §2.3 regenerated from line numbers at **25** clauses, with the four previously-uncovered ones bolded. **The durable fix is the standing instruction** now written into §2.3: regenerate on every edit that adds a scenario. A count is not a fix; a regeneration rule is |
| **K-04** | **Closed by K-01's root fix** — no nested OICR DTO is needed, because no pipe is added |
| **K-05** | **Closed** → DD-17 now mandates an **evaluation order** (reject non-`number` → reject non-finite → **bound check before any string conversion** → derive scale without high-precision `toFixed`), and records that the crash condition is *"exponential with no `.`"*, not `\|v\| < 1e-6` — `1.5e-7` is accepted today |
| **K-06** | **Closed** → `R-MSD-001`'s title and index entry, `R-MSD-003`'s Behavior, **AC.3 (`2.555` → `-10.00005`)**, `:37`'s "seven", `:109`'s "carry over unchanged", and `OQ-6`/`OQ-7`'s stale answers all corrected — then **swept** (below) |
| **K-07** | **Closed** → `AR-2` and `R-MSD-004` AC.4 now say `down()` can **fail**, not only round; AC.5 added for restoration from the backup table |
| **K-08** | **Closed** → `R-MSD-003`'s Permissions block corrected, and the security-review sign-off flipped from **"not required"** to **REQUIRED** |
| **K-09** | **Closed** → DD-7 now **removes** the guard rather than re-uniting it; `R-MSD-006`'s scenario, AC.3 and `DC-10` reframed around prevention |
| **K-10** | **Closed** → DD-16 **withdrawn**. No scale message; §6.4's row says no such state exists |
| **K-11** | **Closed** → new **§2.3b** traceability table for `R-MSD-011/012/013` and `NFR-MSD-005`, plus `S-7`/`S-7b`/`S-7c`/`S-8`/`S-9b` in the requirements' scope register |
| **K-12** | **Closed** → §9.2 adds `NULL` as a **seventh** case, states that `IF()` takes the else branch for it, and withdraws the "unreachable" claim. `R-MSD-010` AC.2 raised to seven cases |
| **K-13** | **Closed** → `REGEXP_REPLACE` re-attributed to `valid_text` |
| **K-14** | **Closed by K-02's formula** — the false "exactly representable" premise is gone |
| **K-15** | **Closed** → §17 grows from 4 to **9** rows (`U-5`…`U-9`), and states that the two *false* round-1 claims were corrected out of the document rather than listed, because a register cannot launder a wrong claim |
| **K-16** | **Closed** → budget re-baselined: **15 tasks · ≈ 2,400 LOC · ≈ 30 rounds** at 2.0/task, matching chunk 2 — the only comparable that also carried a migration. Chunk 1's ≈ 0.93 now acknowledged as a third actual |
| **K-17** | **Closed** → §2.1 adds the unit-spec row **and** a new OICR-path fixture file |
| **K-18** | **Closed** → `O-2` downgraded to "not a live defect, **no ticket owed**", and the precedent it revealed is now named in DD-2's rejected-alternatives list |
| **K-19** | **Answered, not removed** → §9.2 states plainly that the trim branch is unreachable in production and is retained as a **declared defensive case**, with the trade recorded so it is a decision |
| **K-20** | **Closed** → DD-20's key is now `(result_id, role, unit, description)` |
| **K-21** | **Closed** → new observation **`O-4`** records the `> 2⁵³` hydration case and that the symmetry is load-bearing and undocumented |
| **K-22** | **Closed** → `RK-5`, `RK-10`, `RK-11` and `R-MSD-005`'s Details all corrected in `requirements.md` |
| **K-23** | **Closed** → `DC-15` added to `R-MSD-003`'s index row; `NFR-MSD-005`'s wrong `DC-16` mapping removed |
| **K-24** | **Closed** → the service doc comment gets its own **composition row**; "reconciled in prose" replaced with "must be corrected in code" |
| **K-25** | **Closed** → design's `OQ-5` renamed **`OQ-D5`**; `R-MSD-010` AC.6 and `A-1`'s citation repointed |
| **K-26** | **Closed** → `proposal.md` gains a **SUPERSEDED IN PART** banner listing all eight divergences, since the requirements import from it by reference |
| **K-27** | **Reported, not fixed** → the template's own blockquote still cites the retired `KZ-016` and sits before §2. Upstream, outside this spec |
| **K-28** | **Closed** → `:118` → `:117` |
| **C-1** | **Closed** → the call-site figure is **twelve of thirteen**, with the two-syntax cause recorded in DD-7 |

**28 of 28 addressed.** `K-19` and `K-27` are answered-with-reasons rather than changed; the rest are corrected.

## The process fix, not just the content fix

Round 1's failure mode was not wrong judgment — it was **patching without sweeping**, which is `KZ-005` exactly ("a correction relocated, not applied"). Two changes address the cause rather than the instances:

1. **A residual sweep was run after patching, and it caught real survivors** — `R-MSD-011`'s Behavior still naming the pipe, §8 still saying the endpoint "gains its first `ValidationPipe`", `R-MSD-012` still carrying the old formula and cap, §6.2's superseded rule sentence, and `R-MSD-010` AC.2's six-case list. All were fixed and the sweep re-run clean.
2. **§2.3 now carries a standing regeneration instruction** rather than a number. `K-03` was `J-04` recurring because the fix enlarged its own denominator; a count cannot prevent that, a rule can.

---

## Terminal state

**`JUDGMENT: ESCALATED ⚠️` — lineage exhausted.**

| Budget | Used |
| --- | --- |
| Judgment rounds | **2 of 2** |
| Fix rounds | **2 of 2** |
| Scoped re-judgments | 1 of 2 |
| Judge dispatches | 4 |
| Findings raised | **56** (28 + 28) |

**The final fix round has been applied but NOT judged.** That is the honest terminal state, and the reason it is not called `approved` is specific: across two rounds, this author's own dispositions verified at **15/28** and **23/28**. A third self-assessment is not evidence, and the fix rounds that would act on a third judgment are spent.

**What a reader should take from this ledger:** the spec's *decisions* have been through four independent adversarial reviews and two rounds of correction, and the four both-severe findings of each round are closed at their roots. What has **not** been independently checked is this last round of edits — including DD-13's rewrite, DD-14's new formula, and §2.3's regeneration.

One scoped re-judgment remains available. Acting on what it finds would require an explicit human decision to extend the lineage, which this protocol does not grant on its own.

---
---

# Round 3 — final scoped re-judgment (ledger frozen)

| Field | Value |
| --- | --- |
| Scope | (A) the 28 round-2 dispositions · (B) the round-2 fix delta · (C) **the residual sweep's own claim of completeness** |
| Judges | 2, blind, read-only, `opus`, identical prompts · 43 and 36 tool calls |
| Judge A | **7 severe, 12 warning, 2 suggestion** · `DISPOSITIONS-VERIFIED: 24 of 28` (false: K-01, K-09, K-10, K-14, plus `C-1`) · **`SWEEP-SURVIVORS: 23 sites`** |
| Judge B | **5 severe, 12 warning, 3 suggestion** · `DISPOSITIONS-VERIFIED: 22 of 28` · **`SWEEP-SURVIVORS: 17`** |
| Judgment rounds | **3** · Fix rounds **2 of 2** · Re-judgments **2 of 2** |
| Terminal state | **`escalated` — lineage exhausted** |

## The headline: the sweep's completeness claim is falsified

Round 2's ledger claimed *"All were fixed and the sweep re-run clean."* Both judges independently hunted survivors and found **17 and 23**. The sweep ran against **the ledger's list of sites** rather than against **the claim** — which is `KZ-005` (*"sweep every axis"*) failing in the very round that cited `KZ-005` as its process fix. Third recurrence of the same shape.

## Confirmed by BOTH — SEVERE

| ID | Finding | A | B |
| --- | --- | --- | --- |
| **L-01** | **`DD-14`'s new bound is worse than the one it replaced.** The adopted criterion — *"`value × 10^scale` inside the exact-integer range"* — is **not** the condition the spec needs. What it needs is `ulp(v) ≤ 10^-scale`, which at scale 4 holds only below **2³⁹ = 549,755,813,888**. Above that the double spacing exceeds the 4-decimal grid and distinct values collide. Executed independently by both: `900719925474.0003` → `900719925474.0002`; **904 of 5,000** adjacent grid pairs collapse at the new bound; **3,616 of 20,000** values fail to round-trip. At the **round-1 bound (99,999,999,999): zero failures.** So the round-2 "fix" — adopting the judges' 9×-wider formula — **discarded the only bound that delivered the property**, while correcting a premise that was indeed false. `R-MSD-001`'s *"reaches the body exactly as entered"*, `R-MSD-004` AC.1/AC.2 and `R-MSD-009` are all falsifiable inside the accepted set, and nothing gates it | R3-3 | R3-1 |
| **L-02** | **`DD-7`'s removal is not local.** `showMaxReachedMessage` is **shared with the `type === 'text'` branch**: written by `handlePasteText` (`:83,93`) and `shouldPreventTextInput` (`:142,145`), both reachable today; the effect at `:161-175` has **both** branches (`MAX_SAFE_INTEGER` and `MAX_SAFE_TEXT = 40000`); the message block at `input.component.html:70` serves **both**, and the signal drives the text border at `:30`. §2.1's *"remove the character-count guard **and its message**"* and `R-MSD-006` AC.5's *"the producing code is **gone**"* executed literally **delete the only user feedback for 40,000-character paste truncation on every `app-input` in the app**, turn three existing green specs red with no owning task, and `DC-10`'s gate goes **green on that regression** | R3-4 | R3-2 |
| **L-03** | **`K-01`'s disposition is false for `R-MSD-011`.** `:462` AC.2 still reads *"**`UpdateOicrDto` rejects** …"* — two lines above AC.3, which says no pipe is added and the DTO gains no decorators. The title (`:448`), the index (`:666`) and `A-3` (`:609`) still say *"three tiers"* while the design says two. **AC.2 is a Must whose only satisfying implementation is the change `K-01` proved destroys OICR data** | R3-2 | R3-4 |
| **L-04** | **`K-10`'s disposition is false for `R-MSD-006`.** The title (`:314`), AC.2 (`:331`), the index (`:661`) and `NFR-MSD-004` (`:556`) all still mandate the scale message that `DD-16` withdrew — and AC.2 sits directly below the paragraph explaining the message has no reachable trigger. **`J-19` → `K-10` → `L-04`: the same unreachable Must, three rounds running** | R3-1 | R3-5 |
| **L-05** | **`C-1`'s parent verification was itself wrong — third wrong value for one figure.** Seven of the thirteen number call sites **do** pass `maxFractionDigits`: `innovation-use-actor-item.component.html:99,109,119,129,141`, `innovation-use-organization-item.component.html:127`, and `quantification-item.component.html:18`. So it is **six of thirteen unbounded**, not "exactly one" (round 0), not "six of seven" (round 1), not "twelve of thirteen" (round 2). The round-2 verification checked *which syntaxes existed* and never grepped `maxFractionDigits` against the resulting list | R3-5 (S) | R3-6 (W) |
| **L-06** | **`K-02`'s disposition is false in two of the three sites it named.** `A-4` (`:610`) still reads *"**No new magnitude bound is introduced**"*, and `design.md` §13 still has **no row for `DD-14`** while its closing note cites *"**DD-14's scale-0 exemption**"* — a construct `DD-14` deleted. Only `AR-1` and §4.3 were fixed. `RK-4` (`:629`) additionally still says the pre-flight is *"confirmatory … rather than blocking"*, 91 lines after `NFR-MSD-002` says it is blocking | R3-9, R3-12 | R3-3, R3-8, R3-11 |

## Single-judge SEVERE — suspect

| ID | Finding | Judge |
| --- | --- | --- |
| **L-07** | **"Prevented at the control" is false, and what is delivered is a silent clamp.** In PrimeNG 19.0.6, `this.max` is consulted in exactly two places — the `End` key handler and `validateValue` — and `validateValue` runs only from the spinner step, Tab/Enter, and `onInputBlur`. The **per-keystroke path never checks `max`**, so an over-bound value is enterable, propagates to the model on every keystroke, and is then **silently replaced by `max` at blur**. §2.3 clause `:342` and `R-MSD-006`'s rewritten scenario are unsatisfiable as written, and the actual behaviour is the *"accepts input and then truncates"* failure `requirements.md:35` names as the reason all three tiers must move together — and is forbidden by `R-MSD-001`'s own `:164` clause (*"must NOT round, clamp…"*) | A R3-7 |
| **L-08** | **`R-MSD-013` AC.4 / `DC-16` are not satisfiable on the OICR path, and `DD-2` does not cover it.** `oicr-details.component.ts` sends `quantification_number: q.number ?? 0` while its read path preserves `null`. `generateCompositeKey` maps `isEmpty(value)` → `''` and `isEmpty(0)` is **false**, so a stored `NULL` keys as `'\|kg\|note'` and the resend keys as `'0\|kg\|note'` — **no match → the row is deactivated and duplicated on a save the user never made.** NULLs demonstrably occur. The new OICR fixture §2.1 commissions will go red for a reason the design does not predict, and no `DD` owns the `null → 0` coercion | A R3-14 |

## Confirmed by BOTH — WARNING (abbreviated)

| ID | Finding | A | B |
| --- | --- | --- | --- |
| **L-09** | `DD-7`'s removal rationale (*"DD-14 caps every configuration below 18 digits"*) is false — twelve call sites keep `max = Number.MAX_SAFE_INTEGER` (it is not even an `@Input` today), where 18 characters is reachable: `-1234567890123.456` is 18 chars and inside `max`. So `R-MSD-006` AC.5 asserts something false **before** the guard is removed, and cannot demonstrate the removal is safe | R3-6 | R3-7 |
| **L-10** | §5.3 still credits *"**DD-13's pipe** closes that door too"* — 34 lines below §4's *"Pipe \| none added, deliberately"*. §5.3 is the section `R-MSD-013`/`DC-16` trace to | R3-8 | R3-10 |
| **L-11** | The six→seven report-case change was applied twice and missed three times (`design.md:438`, `DC-7`, `DC-14` all still say "six cases") — **and the two seven-case lists do not match**: the design has a `bigint` case the AC lacks, the AC has a positive two-decimal case the design lacks. `NULL`, the case `K-12` forced, is the one a six-case gate drops | R3-10 | R3-9 |
| **L-12** | `requirements.md:50` still states the **superseded 15-digit budget and the false "exactly representable" premise**, in the Executive Summary; `design.md:202` (§3) states it too. Given `L-01`, the retained sentence describes a *better* rule than the one adopted | R3-11 | R3-12 |
| **L-13** | §14 was re-baselined to ≈ 2,400 LOC and its PR-splitting sentence seven lines later still reads *"**≈ 1,410 LOC needs three PRs**"* | R3-15 | R3-14 |
| **L-14** | `proposal.md`'s SUPERSEDED banner is accurate on all eight listed rows but **misses the `DD-7`/`DD-16` divergences** — Scope item 3 (*"count digits, not characters"*), `RK-7`, the ADDED bullet and **`SC-3`**, all still mandating the withdrawn message. Judge A adds that the banner's budget row cites a figure `proposal.md` never states | R3-13 | R3-15 |
| **L-15** | `R-MSD-004` now carries **two ACs numbered AC.5**, and `R-MSD-006`'s ACs run 1, 2, 3, 5, 4 — the exact numbering defect `K-23` raised, reproduced twice in the round that closed it | R3-16 | R3-16, R3-19 |
| **L-16** | §17 grew to nine rows and **still omits** the round-2 fix's own load-bearing claims: `DD-14`'s round-trip property (false — `L-01`), `DD-7`'s "caps below 18 digits" (false — `L-09`), and "prevented at the control" (false — `L-07`) | R3-18 | R3-17 |

## Single-judge — suspect

| ID | Finding | Judge |
| --- | --- | --- |
| **L-17** | `R-MSD-009:393` still asserts *"there is **no in-repo precedent**"* — the claim `J-16`, `K-18` and `RK-10` were each raised to kill. The sweep hit the four sites the ledger named and not the fifth | B R3-13 |
| **L-18** | The scope register was patched but **`S-3` still commissions the abandoned fix** (*"counts characters where it means digits"*) and **`S-1` omits `max`**, the input that carries `DD-14`'s bound | A R3-17 |
| **L-19** | **`base-service.ts:278-283` exposes `createCustomValidation`** — *"Override this method to add custom validation"* — invoked at `:345` immediately before `generateCompositeKey`, on `ResultQuantificationsService`, the one service **both** paths pass through. It is the idiomatic seam for `DD-13`, would cover IU, OICR and any future writer at once, and §2.2's "patterns reused rather than invented" misses it. A **second public writer** (`upsertQuantificationsByRole`, with its own key builder) exists with no production caller | A R3-19, B R3-20 |
| **L-20** | `DD-13` states no evaluation order or type contract — the dimension `K-05` made mandatory for `DD-17` in the same round | A R3-20 |
| **L-21** | §7's `:117` correction is self-contradictory: it now says `:117` is both the right citation and "unrelated code" (the superseded draft cited a **different file**) | B R3-18 |
| **L-22** | Chunk 1's rounds/task is stated as 0.93 (13/14); `family.md` says *"T-03 extracted and carries no checkbox"*, so the denominator is 13 → **1.00** | A R3-21 |

## Verified clean — stated explicitly, because a clean result is evidence too

Both judges independently confirmed:

| # | What held |
| --- | --- |
| 1 | **§2.3's 25 clauses — fully verified.** `grep -c` → 12 + 13 = 25, matching the table exactly; **every one of the 25 cited line numbers contains the clause the table quotes**; no clause certified without coverage and none uncovered. The standing regeneration instruction is present. **`K-03`/`J-04` is properly closed** — the one recurrence that stopped recurring |
| 2 | **`DD-13`'s service-layer approach is sufficient and implementable — both judges attacked it and it held.** `ResultOicrService.updateOicr` is the **only** production writer of roles 1/2: no OICR creation path, no AI/import path, no TypeORM cascade, and `ResultQuantificationsController` declares no route. The user's decision is sound |
| 3 | **§6.2's arithmetic is exact** at every row, and scale 0 lands **precisely** on `Number.MAX_SAFE_INTEGER`. The computation is right; the criterion is not (`L-01`) |
| 4 | **`R-MSD-003` AC.3 verified by execution:** `isNumber(-10.00005, {maxDecimalPlaces:4})` → `false`; `isNumber(2.555, …)` → `true`. And it rejects for the **scale** reason, not the bound reason — consistent with `DD-17`'s mandated order |
| 5 | **§9.2's `NULL` reasoning is correct MySQL**, verified against the transcribed bodies; `K-13`'s `REGEXP_REPLACE` re-attribution to `valid_text` is correct |
| 6 | **§14's family figures** (chunk 2 = 2.00 and 4,619 fixture LOC; chunk 3 = 1.64 and +80.4%) and its arithmetic all check out |
| 7 | **Dispositions verified without qualification by both:** `K-03`, `K-04`, `K-05`, `K-08`, `K-11`, `K-13`, `K-17`, `K-18`, `K-19`, `K-20`, `K-21`, `K-23`, `K-24`, `K-25`, `K-27`, `K-28` |

---

## Terminal state

**`JUDGMENT: ESCALATED ⚠️` — the lineage is exhausted and is NOT being extended.**

| Budget | Used |
| --- | --- |
| Judgment rounds | **3** |
| Fix rounds | **2 of 2 — exhausted** |
| Scoped re-judgments | **2 of 2 — exhausted** |
| Judge dispatches | **6** |
| Findings raised | **78** (28 + 28 + 22) |

Per the protocol's terminal gate — *"Any issue remains after round two → Escalate and stop"* — no further correction is applied. **Extending the lineage requires an explicit human decision.**

### What this ledger establishes

**The decisions are sound; the propagation is not.** Every architectural choice that was attacked held: `DD-13`'s service-layer validation (both judges tried to break it and could not), `DD-2`'s transformer, `DD-1`'s column, `DD-9`'s scoping, `DD-10`'s expression and NULL analysis, §2.3's regeneration. What failed, three rounds running, is **carrying a decision into every document that states it** — 17–23 surviving sites, and two dispositions (`K-01`, `K-10`) that left a **Must AC mandating the exact thing its own design decision forbids**.

### The two findings that change a user decision

1. **`L-01` — the round-2 bound is wrong, and the round-1 bound was right.** The product owner chose "the judge's formula" over a blocking pre-flight alone. Both round-3 judges show that formula admits values that silently change in the browser, while the bound it replaced had **zero** such values. The correct scale-4 bound is **2³⁹ = 549,755,813,888** (or the round-1 `99,999,999,999`, which is safely under it). This is a decision to revisit, not an edit to apply.
2. **`L-02` — `DD-7`'s removal is unsafe as scoped.** Deleting the shared signal removes text-paste feedback app-wide. If the guard is to go, the removal must be scoped to the `type === 'number'` branch — which is a different decision from the one recorded.

---

## ACCEPTED BY THE PRODUCT OWNER — 2026-08-26

**The spec is accepted at `ESCALATED`, not corrected to `APPROVED`.** Explicit human ruling, recorded here rather than resolved away:

> *"acepto el spec, realmente no es un ajuste complejo hablando de la lógica"*

**The reasoning is sound and is worth preserving as a signal, not just a decision.** The change's logic is one field accepting negatives and decimals. Three judgment rounds, six judge dispatches and 78 findings were spent on a spec whose behavioural surface is that sentence — and the ledger's own summary is that *the decisions held and the propagation failed*. Continuing to correct propagation defects in four documents was judged a worse use of effort than executing against a spec whose defects are enumerated.

### Four known defects ship with this acceptance

Named here because two of them will actively mislead an implementer, and one is a data-destruction path:

| ID | Defect | Consequence if followed literally |
| --- | --- | --- |
| **L-03** | `R-MSD-011` AC.2 mandates `UpdateOicrDto` rejection, contradicting AC.3 and `DD-13` | ⚠️ **An implementer satisfying AC.2 re-introduces `K-01`** — the `whitelist: true` path that nulls `sharepoint_link` and deactivates every tag, link and impact-area row |
| **L-04** | `R-MSD-006`'s title, AC.2, index row and `NFR-MSD-004` mandate a scale message `DD-16` withdrew | An unsatisfiable Must; the AC cannot go green against the design |
| **L-01** | `DD-14`'s scale-4 bound (900,719,925,474) admits values that silently change in the browser | Correct bound is **2³⁹ = 549,755,813,888**, or round 1's 99,999,999,999 |
| **L-02** | `DD-7`'s removal is not scoped to the `type === 'number'` branch | Deletes 40,000-character paste feedback on every `app-input` in the app |

**`design.md` is authoritative wherever it and `requirements.md` disagree** — it carries the round-2 decisions; the requirements' surviving text does not. That precedence rule is the acceptance's one binding condition.

### Terminal

| | |
| --- | --- |
| State | **`ESCALATED` — accepted, not approved** |
| Judgment rounds | 3 · Fix rounds 2/2 · Re-judgments 2/2 · Judge dispatches 6 |
| Findings | **78** |
| Accepted by | Product owner, 2026-08-26, explicitly |

**Kaizen signal for `/akili-archive`:** a spec whose behavioural change is one sentence consumed three adversarial rounds and 78 findings, of which the four both-severe-per-round findings were real and the remainder were overwhelmingly **propagation defects across four documents stating the same decisions**. The recurring failure was never judgment — it was that one decision lives in four places and no round's sweep closed all four. The candidate lesson is about *document count*, not about sweep discipline: the third sweep failed the same way as the first.

---

# Post-acceptance revision — additive-defaults ruling, 2026-08-26

**Product-owner design ruling, applied after acceptance:**

> *"los cambios que se tienen que hacer tienen que quedar con opciones por defecto que no requieran modificar otros sitios del sistema, así solo se agrega en donde se necesita … como una función con parámetros opcionales, y si no se mandan entonces se agregan por defecto para que no afecte el funcionamiento normal"*

This is the first ruling in the whole lineage that attacks the **root cause** the 78 findings kept circling: one decision restated across four documents and edited into several files, with no sweep ever closing all of them. Fewer edited files ⇒ fewer places for propagation to fail.

## What changed

| Decision | Before | After |
| --- | --- | --- |
| **DD-12** | Pin `oicr-details.component.html`'s two call sites | The card's `maxFractionDigits` **default becomes `0`**. **OICR's template is not edited** |
| **DD-13** | v1 a `ValidationPipe` (`K-01`: destroys data) → v2 `ResultOicrService` | Override **`createCustomValidation`** on `ResultQuantificationsService` — called by `base-service.ts:134,345` on **both** upsert paths. **No file under `result-oicr/` is edited** |
| **DD-7** | Change the guard's unit → then remove the guard (`L-02`: deletes paste feedback app-wide) | **WITHDRAWN.** `app-input`'s guard is not touched |
| **DD-14** | v1 digit budget (false premise) → v2 `⌊(2⁵³−1)/10^s⌋` (`L-01`: 3,616 collisions) | **`max = 2^(53 − ⌈log₂(10^scale)⌉) − 1`** → 549,755,813,887 at scale 4. **Verified by execution: zero collisions, zero round-trip failures at every scale.** `max` becomes an `@Input` defaulting to today's value |

## Effect on the accepted defects

| Accepted defect | Status |
| --- | --- |
| **L-02** — removal deletes paste feedback app-wide | **UNREACHABLE** — the edit is gone |
| **L-03** — `R-MSD-011` AC.2 mandates a data-destroying change | **UNREACHABLE** — AC.2 now names the shared validator; no DTO is edited |
| **L-04** — `R-MSD-006` mandates a withdrawn message | **RESOLVED** — the requirement is amended to claim only what the control does, and `L-07`'s clamp-vs-prevention distinction is written into a new AC.6 |
| **L-01** — the bound admits colliding values | **FIXED and EXECUTED** — the only numeric claim in the design now backed by a run rather than a derivation |
| **L-05, L-09** — the call-site enumeration (four wrong figures) and the guard's reachability | **DISSOLVED** — nothing in the spec depends on knowing who passes what any more |

Also swept in the same pass: `L-06` (`A-4`, `RK-4`), `L-07` (new `R-MSD-006` AC.6), `L-08` (recorded on the OICR fixture as a pre-existing client defect the fixture must expect), `L-11`/`L-12`/`L-13`/`L-14`/`L-15`/`L-17`, and `L-19` — which is what supplied `DD-13`'s new seam.

## The sweep, done properly this time

Round 2's sweep ran against **the ledger's list of sites** and left 17–23 survivors. This one ran against **the claim**, iterated until clean, and the iteration is what mattered:

| Pass | Real survivors found |
| --- | --- |
| 1 | 1 (`requirements.md` "Agreed values" — in no judge's list) |
| 2 | 3 (the proposal banner, `R-MSD-012` Details, `AR-1`) |
| 3 | 0 |

Two passes after the first "clean" result still found survivors. **A single clean pass is not evidence; the fixed point is.** That, not "sweep harder", is the lesson.

## Budget

**≈ 2,400 → ≈ 1,500 LOC · 15 → 11 tasks · 30 → ≈ 22 rounds · 3 → 2 PRs.** The first time this section has moved **down**.

## State

**Still `ESCALATED`, still accepted — and now with one fewer accepted defect and three made unreachable.** The revision is **not judged**: no re-judgment budget remains. What is different from the pre-revision state is that the un-judged surface is *smaller* than what the judges already reviewed, because the change is the **removal** of edits, not the addition of them.
