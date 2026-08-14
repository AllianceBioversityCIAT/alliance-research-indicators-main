# Requirements — Bilateral / Optional & partial Theory-of-Change mapping

- **Module:** bilateral
- **Spec id:** 2026-08-toc-optional-mapping
- **Status:** draft
- **Owner:** Juan Carlos Cadavid (bilateral squad)
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §5.1 (Results domain), §6 US-RC-2, R-2 ("save partial progress on any tab and return later without losing data")
- **Linked tickets:** [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) · Epic [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385)
- **Depth:** Standard
- **Extends:** `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-v2/` (R-BIL-092…097)
- **Chunk:** C1 of 2 — parent [`../mapping-adjustments/proposal.md`](../mapping-adjustments/proposal.md), proposal [`./proposal.md`](./proposal.md)
- **Last updated:** 2026-08-12

---

## 1. Context

Theory-of-Change mapping on the bilateral Pool Funding Alignment tab is **all-or-nothing today**. A contributor who knows the High-Level Output but not yet the indicator cannot record what they know.

**The block is primarily on the client, and it fails silently.** `isDraftSaveable` requires all four ToC fields — including `quantitative_contribution`, which the server treats as optional — and `writeDtoFromDrafts` **drops an incomplete "Yes" from the request body without warning**. The user presses save, the request succeeds, and nothing was persisted. The server's `missing_required_fields` 400 is a second line that STAR rarely reaches.

AC-1676 requires the opposite: partial ToC information must persist and must never block submission. This spec makes each step after Level + HLO optional, across both tiers, and locks in regression tests for four AC-1676 rules the module **already satisfies**.

**Not changing:** the SP selection model (flat — C2 owns Primary/Contributing), the version gate, `is_read_only` semantics, the per-SP ToC table shape, pool-funding tag derivation, or the ToC catalog source.

---

## 2. Requirement numbering

Band **`R-BIL-110`…** — continues the bilateral module band (`R-BIL-001…098` toc-mapping-v2 and earlier; `R-BIL-100…105` mapping-drives-pool-funding-tag). No collision.

---

## 3. Functional requirements

### R-BIL-110 — Reworded ToC intent question

- **As a** Result Contributor (PRD §3.1)
- **I want** the ToC question to ask whether I want to map, not whether the result aligns
- **So that** I am not asked to re-assert an alignment that selecting the Science Program already implies

**Details:**
- Inputs: none (static copy).
- Behavior: the per-SP question renders as **"Would you like to complete the detailed Theory of Change mapping for this result?"**
- Outputs: rendered label in `sp-toc-alignment-block`.
- Errors: none.
- Permissions: unchanged.

**Acceptance criteria:**
- [ ] AC.1 — The rendered question is exactly *"Would you like to complete the detailed Theory of Change mapping for this result?"*.
- [ ] AC.2 — The stored field `aligns_with_toc` keeps its name and its `true`/`false` value domain; no migration, no wire rename.
- [ ] AC.3 — The Yes/No control keeps its existing required-answer behavior (unanswered still blocks save, per R-BIL-112 AC.4).

#### Scenario: Question renders with the new wording

- GIVEN a pool-funding-eligible result with at least one selected Science Program
- WHEN the contributor opens the Pool Funding Alignment tab
- THEN the per-SP ToC question reads "Would you like to complete the detailed Theory of Change mapping for this result?"
- BUT it must NOT change the persisted `aligns_with_toc` column name, its wire field name, or the meaning of previously stored values
- AND IT MUST continue to render through the canonical `.label` class (`docs/ux-ui/design.md` §7.1 binding contract), not a Tailwind substitute

---

### R-BIL-111 — Server persists a partial ToC alignment

- **As a** Result Contributor
- **I want** to save the ToC detail I have without being forced to complete the whole chain
- **So that** partial knowledge is not lost between sessions

**Details:**
- Inputs: `PATCH /api/v1/results/:result-code/pool-funding-alignment`, body `toc_alignments[]` (`TocAlignmentInputDto`).
- Behavior: for `aligns_with_toc: true`, **`level` and `toc_result_id` are required; `indicator_id` and `quantitative_contribution` are optional.** Any supplied field is still validated (R-BIL-113).
- Outputs: `ServerResponseDto` with the updated `AlignmentResponse`; `PATCH` response ≡ subsequent `GET`.
- Errors: `400` with `errors.toc_alignments[{ sp_code, field, error }]`; `409 toc_mapping_version_locked` unchanged.
- Permissions: unchanged (`@Roles`, `RolesGuard`, `ResultStatusGuard`, `is_read_only` 409).

**Acceptance criteria:**
- [ ] AC.1 — `Yes + level + toc_result_id` persists; `indicator_id`, `quantitative_contribution`, and every indicator-derived snapshot field (`indicator_description`, `unit_messurament`, `target_value`, `target_year`) are stored `null`.
- [ ] AC.2 — `Yes + level + toc_result_id + indicator_id` persists with indicator snapshot fields populated and `quantitative_contribution` `null`.
- [ ] AC.3 — `Yes` with all four fields persists exactly as it does today (no behavior change).
- [ ] AC.4 — `Yes` missing `level` **or** `toc_result_id` returns `400` with `error: 'missing_required_fields'` on the missing field(s).
- [ ] AC.5 — `No` persists with all ToC refs and snapshot columns `null` (unchanged, R-BIL-092 AC.2).
- [ ] AC.6 — Atomicity holds: any error in the batch persists nothing (D-V2-8).

#### Scenario: Level + HLO only

- GIVEN a pool-funding-eligible result in report year 2026 with `SP01` selected
- WHEN the contributor PATCHes `toc_alignments: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 42 }]`
- THEN the response is `200` and the alignment row persists with `level: 'OUTPUT'` and `toc_result_id: 42`
- AND `indicator_id`, `quantitative_contribution`, `indicator_description`, `unit_messurament`, `target_value`, **`target_year`** are `null`
- AND `toc_result_title` is populated from the catalog snapshot
- BUT it must NOT return `400 missing_required_fields` for the absent `indicator_id`
- AND IT MUST reject the same request with `400` when `toc_result_id` is absent

#### Scenario: Bare "Yes" is rejected

- GIVEN the same result
- WHEN the contributor PATCHes `{ sp_code: 'SP01', aligns_with_toc: true }` with no other field
- THEN the response is `400` with `errors.toc_alignments` naming both `level` and `toc_result_id` as `missing_required_fields`
- AND IT MUST persist nothing from the batch

---

### R-BIL-112 — Client saves partial ToC instead of silently dropping it

- **As a** Result Contributor
- **I want** the save button to work when I have partial ToC data, and my data to actually reach the server
- **So that** I never lose work I believed was saved

**Details:**
- Inputs: the per-SP draft state (`SpAlignmentDraft`).
- Behavior: `isDraftSaveable` accepts a "Yes" carrying `level` + `toc_result_id`; `writeDtoFromDrafts` **emits** such a draft rather than skipping it.
- Outputs: PATCH body containing the partial alignment.
- Errors: server-side per R-BIL-111.
- Permissions: unchanged.

**Acceptance criteria:**
- [ ] AC.1 — A "Yes" draft with `level` + `toc_result_id` and null `indicator_id` is **included** in `writeDtoFromDrafts` output.
- [ ] AC.2 — The same draft does not disable the save action.
- [ ] AC.3 — `quantitative_contribution` is no longer required for saveability; when supplied it must still be `>= 0`.
- [ ] AC.4 — An **unanswered** draft (`aligns_with_toc === null`) still blocks save (existing required-answer behavior preserved).
- [ ] AC.5 — A "Yes" draft below the Level + HLO floor is **not silently dropped**: it either blocks save with a visible message or is sent and rejected by the server — never omitted without feedback.

#### Scenario: Partial draft reaches the server

- GIVEN a contributor has answered "Yes" for `SP01` and selected Level and HLO but no indicator
- WHEN they save
- THEN the PATCH body contains a `toc_alignments` entry for `SP01` with `level` and `toc_result_id` set
- AND the saved state is visible after a reload
- BUT it must NOT silently omit the entry from the request body (today's completeness-gate behavior)
- AND IT MUST NOT report success while discarding the entry

#### Scenario: Unanswered still blocks

- GIVEN a rendered SP block whose ToC question is unanswered
- WHEN the contributor attempts to save
- THEN the save is blocked and the unanswered question is surfaced as required
- AND IT MUST remain blocked until the contributor answers Yes or No

---

### R-BIL-113 — Catalog validation is conditional on field presence

- **As a** MEL Regional Expert (PRD §3.2)
- **I want** supplied ToC references to still be validated against the live catalog
- **So that** relaxing completeness does not admit invalid data

**Details:**
- Behavior: `level_not_allowed`, `unknown_toc_result_id`, and `unknown_indicator_id` fire **only when the corresponding field is present**. Absent optional fields are skipped, not defaulted.
- Errors: unchanged codes and shape.

**Acceptance criteria:**
- [ ] AC.1 — A present but out-of-range `level` returns `400 level_not_allowed`.
- [ ] AC.2 — A present but unresolvable `toc_result_id` returns `400 unknown_toc_result_id`.
- [ ] AC.3 — A present but unresolvable `indicator_id` returns `400 unknown_indicator_id`.
- [ ] AC.4 — An **absent** `indicator_id` triggers no catalog error.
- [ ] AC.5 — `duplicate_sp_code` and `sp_not_selected` are unchanged.
- [ ] AC.6 — A `quantitative_contribution` supplied **without** an `indicator_id` returns `400` with the dedicated code **`contribution_without_indicator`** on field `quantitative_contribution`. It MUST NOT reuse `missing_required_fields`, which is reserved for the Level + HLO floor (R-BIL-111 AC.4).

#### Scenario: Contribution without an indicator is rejected

- GIVEN a result with `SP01` selected
- WHEN the contributor PATCHes a "Yes" with valid `level` and `toc_result_id`, no `indicator_id`, and `quantitative_contribution: 12`
- THEN the response is `400` with `error: 'contribution_without_indicator'` on `quantitative_contribution`
- BUT it must NOT report `missing_required_fields` for `indicator_id` — that field is optional (R-BIL-111 §5.1)
- AND IT MUST accept the identical request when `quantitative_contribution` is also omitted

> **Rationale:** a contribution is expressed *in the selected indicator's unit of measurement* (AC-1676: "The contribution value must use the selected indicator's unit of measurement"). Without an indicator the number carries no unit and is not interpretable. Unreachable from STAR — the contribution input only renders once an indicator is chosen — but the API must not accept it.

#### Scenario: Relaxation does not admit garbage

- GIVEN a result with `SP01` selected
- WHEN the contributor PATCHes a "Yes" with a valid `level`, a valid `toc_result_id`, and an `indicator_id` that does not belong to that ToC result
- THEN the response is `400` with `error: 'unknown_indicator_id'` on `indicator_id`
- BUT it must NOT persist any part of the batch
- AND IT MUST still accept the same request when `indicator_id` is omitted entirely

---

### R-BIL-114 — Read-back exposes a defined null contract for partial rows

- **As a** downstream consumer (STAR client today; the deferred PRMS submission later)
- **I want** a documented shape for partially-mapped alignments
- **So that** consumers handle nulls deliberately rather than by accident

**Details:**
- Outputs: `TocAlignmentReadbackResponse` — `indicator_id`, `indicator_description`, `unit_of_measurement`, `target_value`, `target_year`, `quantitative_contribution` are `null` when the indicator was never chosen.
- Behavior: `PATCH` response ≡ `GET` response (existing invariant, R-BIL-096).

**Acceptance criteria:**
- [ ] AC.1 — A partial row reads back with the nulls above and non-null `level`, `toc_result_id`, `toc_result_title`.
- [ ] AC.2 — `PATCH` and `GET` return byte-identical alignment objects for the same state.
- [ ] AC.3 — Rows remain ordered `sp_code ASC`, active-only (unchanged).
- [ ] AC.4 — The null contract is documented in Swagger on the response class.

#### Scenario: Partial row renders without error

- GIVEN a saved partial alignment for `SP01` with no indicator
- WHEN the contributor reopens the tab
- THEN the block renders the saved Level and HLO
- AND the indicator, unit, target, and contribution fields render as empty rather than throwing
- BUT it must NOT display `null`, `undefined`, or `NaN` as literal text
- AND IT MUST NOT present an empty indicator as a valid selection

---

### R-BIL-115 — Regression: SP selector display format *(already implemented)*

**Acceptance criteria:**
- [ ] AC.1 — Each SP renders as `<code> — <allocation>% - <name>` (e.g. `SP06 — 10% - Climate Action`).
- [ ] AC.2 — A null `allocation` renders the existing `—` placeholder, not `null`.
- [ ] AC.3 — The assertion fails if the allocation segment is removed.

---

### R-BIL-116 — Regression: unit and target precede the contribution input *(already implemented)*

**Acceptance criteria:**
- [ ] AC.1 — When an indicator is selected, its unit of measurement and target are displayed.
- [ ] AC.2 — Both appear before/alongside the quantitative-contribution input, never after it.
- [ ] AC.3 — With no indicator selected (partial row), neither is displayed and the contribution input does not present a stale unit.

---

### R-BIL-117 — Regression: alignment is read-only once PRMS-owned *(already implemented)*

**Acceptance criteria:**
- [ ] AC.1 — `is_read_only` is `true` when the result is PRMS-sourced **or** `is_synced_to_prms`.
- [ ] AC.2 — A write against either condition returns `409`, including for `SYSTEM_ADMIN`.
- [ ] AC.3 — The partial-ToC relaxation does not create a write path that bypasses this gate.

---

### R-BIL-118 — Regression: per-SP ToC isolation *(already implemented)*

**Acceptance criteria:**
- [ ] AC.1 — Writing a ToC alignment for `SP01` leaves `SP02`'s saved alignment byte-identical.
- [ ] AC.2 — The partial-unique active-row constraint per `(result, sp)` still rejects a duplicate active row.
  > **Discharge route amended 2026-08-12 (Pivot Record: T-01, user sign-off).** As originally
  > written this AC was **not dischargeable by its own owning task**: `tasks.md` §3 assigns it to
  > T-01 alone, T-01's declared files are two *unit* spec files, and `design.md` §10 forbids MySQL
  > in unit tests — while the AC names a DB artifact (the `active_result_sp` generated column and
  > `idx_rpfta_active_result_sp`, migration `1779190000015`). Both independent reviewers (Claude
  > Opus, Gemini 3.1 Pro) failed T-01 on this contradiction.
  >
  > **AC.2 is split into two halves with distinct discharge routes:**
  > - **Application half** — `upsertForSp` never issues a second insert for an already-active
  >   `(result, sp)` pair, so the constraint is never reached. **Proven by T-01's unit test**
  >   (mutation-killed: forcing the update-vs-insert branch yields two active rows).
  > - **DB-enforced half** — the index itself rejects a duplicate. **Discharged structurally, not
  >   by test.** This spec changes no DDL: `design.md` §4 records the generated column and index as
  >   untouched, and §5 below states "No data model changes". For a *regression* AC — whose purpose
  >   is "do not break what already works" — an unchanged-DDL argument is a valid discharge.
  >
  > This is a scope-and-evidence decision, **not** a weakening of the requirement's text: AC.2 still
  > asserts the constraint holds. Only the means of showing it changed.
  >
  > **Lapse condition.** This structural discharge holds only while the DDL is unchanged. If **any
  > migration alters the `result_pool_funding_toc_alignment` table** — its `active_result_sp`
  > generated column or the `idx_rpfta_active_result_sp` index in particular — the discharge lapses
  > and AC.2 reverts to requiring an integration test against the `TEST` datasource. *(Widened
  > 2026-08-12 per Reviewer advisory A-8: keyed to the **table**, not to the bilateral module, since
  > a migration authored elsewhere could touch this table without tripping a module-scoped
  > condition.)*
  >
  > The constraint was independently confirmed to be a real artifact, not a documented fiction —
  > migration `1779190000015:42–44` declares `active_result_sp` as
  > `GENERATED ALWAYS AS (IF(is_active = 1, CONCAT(result_id, ':', sp_code), NULL)) STORED` with a
  > `UNIQUE INDEX`; MySQL treats NULLs as distinct, making it a genuine partial-unique over active
  > rows only.
- [ ] AC.3 — A partial row for one SP does not null out a complete row for another.

---

### R-BIL-119 — Partial ToC does not block submission

- **As a** Result Contributor (PRD §3.1)
- **I want** to submit a result whose ToC mapping is incomplete
- **So that** partial knowledge delays nothing

> AC-1676, verbatim: *"Missing TOC information must not prevent submission."* This is the ticket's headline promise.
>
> **CORRECTED 2026-08-12 — see `execution.md` → Pivot Record: T-06 (user sign-off, option A).** This requirement originally claimed the promise was *"satisfied by accident"* because the `pool_funding_alignment_validation` SQL function tests only row presence, *"and it is untested"*. **Both halves were false.**
>
> 1. It is satisfied **structurally, not by accident.** `pool_funding_alignment` is a member of `VISUAL_ONLY_GREEN_CHECKS` (`green-checks/dto/find-green-checks.dto.ts:5-7`) and is skipped outright at `green-checks.service.ts:65` and `result-status-workflow/function-handler.service.ts:325` — the only two consumption sites in the tree. The value is computed and returned to the client as an informational field, and is excluded from the **server-side** completeness computations. ~~Even a function returning `false` cannot block submission.~~ **CORRECTED 2026-08-12 (3rd pass, T-06 re-audit):** server-side only — the client gates Submit on the raw payload (`cache.service.ts:43`, `submission.service.ts:35-38`), so a `false` DOES disable Submit. The merged migration's own commit is `a77fffbb feat(green-checks): emit **visual-only** pool_funding_alignment check` — visual-only since the day it was introduced.
> 2. It was **already tested.** A pre-existing test at `function-handler.service.spec.ts` (`HEAD:496`) already pinned that a failing `pool_funding_alignment` does not block submission.
>
> **Consequence for the ACs.** AC.2 collapses to a structural property that is already true and already covered. AC.1 and AC.3 survive only as claims about a **UI indicator**, not about submission.

**Details:**
- Behavior: a result whose selected SPs each have an *answered* ToC row passes the pool-funding green check, regardless of how deeply any "Yes" row is filled.
- Path: `pool_funding_alignment_validation` (migration `1782950000000`) → `green-checks.repository.ts` `poolFundingAlignmentValidation()` → `result-status-workflow/function-handler.service.ts`.
- Permissions: unchanged.

**Acceptance criteria:**
- [ ] AC.1 — A result whose only ToC row is partial (Level + HLO, no indicator) **passes** the pool-funding green check.
- [ ] AC.2 — Submission proceeds for that result; the status transition is not blocked by ToC incompleteness.
- [ ] AC.3 — An **unanswered** SP (no active ToC row at all) still fails the green check — this spec does not weaken that.
  > **Discharge route for AC.1 and AC.3 — amended 2026-08-12, user sign-off, option (A) structural closure.**
  > *(Pivot Record: T-06 in `execution.md`.)*
  >
  > AC.1 and AC.3 are claims about the **SQL function's own return value**. They are not dischargeable by the
  > unit tier that owns them: `design.md` §10 places these assertions at *Server unit*, while the same section
  > and `server/researchindicators/src/CLAUDE.md` §9 forbid MySQL in unit tests. This is the same contradiction
  > that produced Pivot Record: T-01.
  >
  > **Both are discharged structurally, not by test:**
  > - This spec **changes no DDL and does not alter the function's logic.** The only change is its inline
  >   comment (AC.4); the new migration `1784500000000` recreates the function with `up()`'s executable SQL
  >   **byte-identical** to the merged `1782950000000` (independently re-derived by script during review).
  > - The predicate is `toc.aligns_with_toc is not null` — **row presence, not field completeness**. A partial
  >   row therefore passes (AC.1) and an SP with no active row fails (AC.3) by direct reading of unchanged SQL.
  > - ~~**The stakes are structurally bounded:** the value is excluded from every completeness computation, so
  >   even if this reading were wrong, submission could not be blocked. AC.1/AC.3 govern a UI indicator only.~~
  >   **STRUCK 2026-08-12 — THIS SUPPORT WAS FALSE.** `VISUAL_ONLY_GREEN_CHECKS` is honored **server-side only**.
  >   `green-checks.service.ts:62-69` excludes the key from `completness` but **still returns it on the payload**,
  >   and the client re-includes it: `cache.service.ts:43` and `submission.service.ts:35-38` both run
  >   `Object.values(checks).every(Boolean)` with **no VISUAL_ONLY filter**, gating `canSubmitResult`. A `false`
  >   from this function therefore DOES disable Submit in STAR. The discharge stands on supports 1 and 2 alone
  >   (unchanged byte-identical SQL + row-presence predicate), which were independently verified — but the
  >   "stakes are bounded" claim must not be relied on.
  >
  > **Lapse condition.** This discharge holds only while the function's logic is unchanged. If **any migration
  > alters `pool_funding_alignment_validation`'s body**, or if `pool_funding_alignment` is removed from
  > `VISUAL_ONLY_GREEN_CHECKS`, the discharge lapses and AC.1/AC.3 require an integration test against the
  > `TEST` datasource.
  >
  > **Binding on the implementation:** tests may **not** be named as though they prove these ACs. A test that
  > mocks the function's return value proves the *consumer's* behavior, not the function's — that is precisely
  > what T-01 was FAILED for, and what T-06's first attempt repeated.
- [ ] AC.4 — The SQL function's inline comment is corrected: it currently asserts persisted "Yes" rows "already carry level/toc_result_id/indicator_id (enforced at save by `validateTocAlignments`)", which this spec makes false.

#### Scenario: Partial mapping still submits

- GIVEN a pool-funding-eligible result with `SP01` selected and one saved partial ToC row (Level + HLO, no indicator)
- WHEN the pool-funding green check is evaluated
- THEN it returns complete
- AND the result may transition status
- BUT it must NOT pass the check for an SP that has **no** active ToC row (unanswered)
- AND IT MUST NOT require `indicator_id` or `quantitative_contribution` to be present for the check to pass

---

## 4. Non-functional requirements

### NFR-BIL-110 — Catalog fan-out stays deduplicated

- **Category:** performance
- **Target:** `TocIntegrationService.getTocResults` is called **at most once per distinct `(sp_code, level)` combo** per PATCH. Entries rejected at the Level + HLO floor contribute **zero** calls.
- **Note — an intended increase:** an entry carrying Level + HLO but no indicator is rejected at the floor **today** (0 calls) and clears the floor **after this change**, so it contributes one combo — the call is required to validate `toc_result_id` (R-BIL-113 AC.2). This is a correct consequence of the relaxation, not a regression. **Do not write a test asserting partial entries add zero calls** — assert the dedup property and the floor-rejection property instead.
- **How verified:** unit test asserting one call per distinct combo on a mixed batch, and zero calls for a batch whose entries all fail the floor.

### NFR-BIL-111 — Coverage floors held

- **Category:** dx
- **Target:** server Jest ≥ 60% (branches / functions / lines / statements); client ≥ statements 40 / branches 20 / lines 45 / functions 30. Full suite green against the **measured** server baseline. **Corrected 2026-08-12 (see `execution.md` → CF-1, RB-6):** the previously recorded "291 suites / 1790 tests" corresponds to **no ref that has ever existed** — `HEAD` and `origin/main` both measure **320 suites**, and this spec adds no spec files. Use 320 suites; the exact test count must be **measured at T-10**, not carried forward (the reported 2033 was never independently verified).
- **How verified:** `npm run test:cov` (server), `npm run test:coverage` (client).

### NFR-BIL-112 — No silent-failure paths in the save flow

- **Category:** reliability
- **Target:** zero code paths in which a user-entered ToC draft is discarded without either persistence or a visible error.
- **How verified:** code review of `writeDtoFromDrafts` plus the R-BIL-112 AC.5 test.

*(Inherited without restatement: `ServerResponseDto` envelope (D-1), `/api/v1` versioning (D-2), `AuditableEntity` audit fields, `GlobalExceptions` error flow, Swagger decorators.)*

---

## 5. Data requirements

**No data model changes.** No migration, no new column, no new index, no OpenSearch mapping change.

Existing columns on `result_pool_funding_toc_alignment` become **nullable in practice** for partial rows — they are already nullable in schema (they hold `null` for every `aligns_with_toc: false` row today), so no DDL is required. Confirm this during design against the migration `1779190000015` definition.

---

## 6. API surface delta

No new or removed endpoints. One changed contract on the existing:

**`PATCH /api/v1/results/:result-code/pool-funding-alignment`**

| Aspect | Change |
| --- | --- |
| Body DTO | `dto/update-pool-funding-alignment.dto.ts` — `TocAlignmentInputDto` field descriptions corrected; `indicator_id` documented as optional for a "Yes" |
| Error vocabulary | `missing_required_fields` now fires only for absent `level` / `toc_result_id`. `level_not_allowed`, `unknown_toc_result_id`, `unknown_indicator_id` become conditional on their field being present. **New code `contribution_without_indicator`** (R-BIL-113 AC.6). `duplicate_sp_code`, `sp_not_selected` unchanged |
| Response | `TocAlignmentReadbackResponse` gains documented null semantics (no shape change) |
| Version | Stays `/v1` — the change **widens** what is accepted and **narrows** when errors fire; no previously-valid request becomes invalid |
| Roles / guards | Unchanged |
| Swagger | Descriptions updated on the DTO and the response class |

**Backward compatibility:** every request valid before this change remains valid. The only consumer-visible narrowing is that `missing_required_fields` fires in fewer cases — a client branching on it will simply see it less often (R-5, §8).

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| **STAR client** | Primary surface — `pool-funding-alignment.component.ts`, `sp-toc-alignment-block.component.ts`, client `bilateral.service.ts`. Same monorepo; changed here, not in a sibling repo |
| **lambda-toc** (`tools/toc-integration/`) | Read-only consumer; call pattern unchanged (NFR-BIL-110). **RB-1 open:** host may not resolve on some networks |
| **Socket.IO** | `result.pool-funding-alignment.changed` — payload unchanged |
| **OpenSearch** | No mapping change |
| **Green checks / result-status workflow** | **Consumer discovered in judgment round 1 (F-4).** SQL function `pool_funding_alignment_validation` (migration `1782950000000`) → `green-checks.repository.ts` `poolFundingAlignmentValidation()` → `result-status-workflow/function-handler.service.ts`. Tests row presence only, so partial rows already pass — R-BIL-119 pins that and corrects the function's now-false comment |
| **PRMS** | Out of scope (descoped 2026-08-12); the R-BIL-114 null contract is what keeps that story buildable |

---

## 8. Defect classes and their gates

The classes of defect **this spec can actually produce**, and the command that catches each. Two have no automated gate and are named explicitly.

| # | Defect class | Gate | Blind? |
| --- | --- | --- | --- |
| D1 | **Over-relaxation** — invalid catalog refs accepted | Server unit tests, R-BIL-113 AC.1–AC.3 | No |
| D2 | **Silent data loss** — client drops a draft without feedback | Client unit tests, R-BIL-112 AC.1/AC.5 + NFR-BIL-112 | No |
| D3 | **Null-handling crash** on partial read-back | Client component tests with partial fixtures, R-BIL-114 | Partly — see below |
| D4 | **Snapshot corruption** — a partial upsert nulls a previously complete row | Server unit test, R-BIL-118 AC.3 | No |
| D5 | **Regression in the four already-working behaviors** | R-BIL-115…118 | Partly — see below |
| D6 | **Contract break** for a consumer branching on `missing_required_fields` | Repo grep + client specs | No (single known consumer, same monorepo) |
| D7 | **Copy renders in the wrong place or with wrong styling** | — | **Yes** |
| D8 | **Submission blocked by the pool-funding green check** | **REINSTATED 2026-08-12 — the earlier strike was WRONG.** It read "structurally impossible because the check is visual-only"; that reasoning is false — `VISUAL_ONLY_GREEN_CHECKS` is server-side only, and `cache.service.ts:43` / `submission.service.ts:35-38` gate `canSubmitResult` on the raw payload. **Precise scope:** the *original trigger* (a partial row fails the check) remains **unreachable** — the SQL tests row presence, so a partial row passes and AC-1676's promise holds. What is reachable is the mechanism: a `false` from this function DOES disable Submit in STAR. For an unanswered SP that is the intended behavior (R-BIL-112 AC.4, R-BIL-119 AC.3). | Row-presence semantics (verified by reading the unchanged SQL) — **not** the visual-only argument | No |

### 8.1 Unsubstituted gaps — named, not assumed away

- **D7 — copy placement and styling.** A string assertion (`expect(component.ALIGN_QUESTION).toBe(...)`) is a **presence assertion**: it proves the constant holds the right text, not that it renders in the right position, through the canonical `.label` class, or legibly. This tab has already needed one Figma-drift remediation pass (`docs/ux-ui/design.md` §12.2, 2026-05-24). **Substitute: a human visual check at the Phase 3 HITL pause against the Jira mockup `image-20260723-145821.png`.** If the mockup is unavailable, this is an **accepted risk**, recorded here.
- **D3 / D5 partial blindness — layout of the partial state.** jsdom cannot measure layout, spacing, or contrast. A component test can prove the indicator field is empty; it cannot prove the block does not collapse, misalign, or leave a dangling label when the indicator is absent. **Substitute: the same human visual check**, exercising a saved partial row. Alternatively route to a **T6 Multimodal** review of a screenshot.
- **Contrast / a11y on the changed block** — `axe` in jsdom cannot evaluate rendered contrast. The change introduces no new color tokens, so the risk is low; recorded as accepted.

**No automated gate in this spec can see D7.** A green `npm test` must not be read as evidence that the copy change is correct.

### 8.2 Verification commands

| Command | From | Covers |
| --- | --- | --- |
| `npm test` | `server/researchindicators/` | D1, D4, D6 (server side), **D8** *(reinstated — see §8.1)* |
| `npm run test:cov` | `server/researchindicators/` | NFR-BIL-111 (server) |
| `npm test` | `client/research-indicators/` | D2, D3 (logic), D5, D6 (client side) |
| `npm run test:coverage` | `client/research-indicators/` | NFR-BIL-111 (client) |
| `npm run lint` | both | style/regression hygiene |
| **Human visual check** | Phase 3 HITL | **D7**, D3/D5 layout |

**Disqualifying conditions.** A verification is *inconclusive*, not passing, when: the suite is run scoped and the untouched suites were never executed; `lambda-toc` is unreachable and catalog-path tests were skipped rather than run (RB-1 — report the skip, do not count it as green); or the visual check was not performed and D7 remains unevaluated. An inconclusive result must be reported as inconclusive — never collapsed into a pass because the command exited `0`.

---

## 9. Assumptions, dependencies, risks

**Assumptions**

| # | Assumption |
| --- | --- |
| A-1 | **Level + HLO is the floor** for a "Yes" (user decision, 2026-08-12), matching AC-1676's shallowest listed stop, "HLO/Outcome only". A bare "Yes" is invalid; "No" expresses "not mapping". |
| A-2 | **The version gate survives unchanged** (user decision, 2026-08-12) — `MAPPABLE_LIVE_VERSION = 2026`, `409 toc_mapping_version_locked` intact. |
| A-3 | `quantitative_contribution` is optional at both tiers; the client requiring it today is an over-restriction, not a rule. |
| A-4 | The STAR client is the only consumer of the per-alignment 400 vocabulary (same monorepo, no partner integration reads it). |

**Dependencies**

- Jira attachment `image-20260723-145821.png` — needed for the D7 visual check (§8.1).
- **RB-1 (open)** — `lambda-toc.clarisa.cgiar.org` DNS. Blocks catalog-path verification if unresolved.

**Risks**

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | `aligns_with_toc` keeps its name while its meaning shifts to "opted into detailed mapping". | Documented as a design decision; stored values stay compatible. No rename (R-BIL-110 AC.2). |
| R-3 | Partial rows produce null snapshot fields consumers may not expect. | R-BIL-114 makes the null contract explicit and Swagger-documented — this is also what keeps the deferred PRMS story buildable. |
| R-5 | `missing_required_fields` fires in fewer cases — an FE-visible contract narrowing (RB-4 relay). | A-4 limits blast radius to this monorepo; grep before merging; update the RB-4 relay note. |
| R-6 | ~2645 lines of existing client spec across the two components; client branch floor is only 20%, so a silent regression can pass. | Budget spec updates as their own task; assert new behavior explicitly rather than relying on coverage. |
| R-8 | RB-1 DNS — catalog tests skip rather than fail, which reads as green. | Explicit disqualifying condition in §8.2. |
| **R-9** | **The client completeness gate is being reverted.** (Labelled `D-9` in code comments only — see design §8; it is **not** the `D-9` recorded in `docs/ux-ui/design.md` §12.1.) It refined `OQ-UX-3`, so reverting may re-open what that closed. | Reversion challenge completed in design §8 — the `OQ-UX-3` half is **kept**, only the completeness half reverts. No breakage found in five consumers. |
| **R-10** | **Baseline decision-log drift.** `docs/ux-ui/design.md` §12.2 (2026-05-23) records that `pool_funding_alignment` is *"intentionally absent from `GreenChecks`"*. ~~Migration `1782950000000` contradicts this~~ **— CORRECTED 2026-08-12: it does not.** The check is emitted but excluded from server-side completeness; the §12.2 entry is substantially right. See `execution.md` → Pivot Record: T-06 — a pool-funding green check exists. | Correct the §12.2 entry as part of this spec's doc task; the code is the truth of today (root `CLAUDE.md` §1). |

---

## 10. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| OQ-C1-3 | Should a saved **partial** row be visually marked as incomplete (badge / hint) so contributors can find rows to finish later? AC-1676 does not ask for it; it may be a natural follow-up. | PO / BA | Before Phase 3 |
| OQ-C1-4 | When a contributor **clears** an indicator from a previously complete row, is that a partial-row update or a validation error? Assumed: a normal partial update. | BA | Before Phase 3 |

*(Resolved and moved to assumptions: OQ-4 → A-2; OQ-C1-1 → A-1.)*

---

## 11. Requirement ID index

| ID | Title | Type | Status |
| --- | --- | --- | --- |
| R-BIL-110 | Reworded ToC intent question | Functional | New |
| R-BIL-111 | Server persists a partial ToC alignment | Functional | New |
| R-BIL-112 | Client saves partial ToC instead of silently dropping it | Functional | New |
| R-BIL-113 | Catalog validation conditional on field presence | Functional | New |
| R-BIL-114 | Read-back null contract for partial rows | Functional | New |
| R-BIL-115 | SP selector display format | Functional | **Regression** |
| R-BIL-116 | Unit and target precede contribution | Functional | **Regression** |
| R-BIL-117 | Read-only once PRMS-owned | Functional | **Regression** |
| R-BIL-118 | Per-SP ToC isolation | Functional | **Regression** |
| R-BIL-119 | Partial ToC does not block submission | Functional | New *(added in judgment round 1 — F-4)* |
| NFR-BIL-110 | Catalog fan-out stays deduplicated | Non-functional | New |
| NFR-BIL-111 | Coverage floors held | Non-functional | New |
| NFR-BIL-112 | No silent-failure paths in the save flow | Non-functional | New |

---

## 12. Sign-off

- [ ] Engineering lead — Juan Carlos Cadavid
- [ ] MEL / product owner — Manuel Ricardo Almanzar Villa (reporter, AC-1676)
- [ ] Security review — n/a (no auth, secrets, or permission change)
- [ ] DevOps — n/a (no infra change; RB-1 DNS is pre-existing)
