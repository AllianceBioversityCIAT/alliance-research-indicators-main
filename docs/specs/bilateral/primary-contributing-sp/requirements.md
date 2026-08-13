# Requirements — Bilateral / Primary vs Contributing Science Programs

- **Module:** bilateral
- **Spec id:** 2026-08-primary-contributing-sp
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §3.1 (Result Contributor), §3.2 (MEL Regional Expert)
- **Linked tickets:** [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) · Epic [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385)
- **Last updated:** 2026-08-13
- **Extends:** `docs/specs/archive/2026-08-13-bilateral--toc-optional-mapping` (C1 — shipped)
- **Parent proposal:** [`../mapping-adjustments/proposal.md`](../mapping-adjustments/proposal.md) · [`./proposal.md`](./proposal.md)

> **Depth: Full.** This spec carries a schema migration, an FE-visible API contract change, a displaced error-ordering contract, and a rollout/backout path. That is the depth table's definition of Full, not a judgment call.
>
> *(Corrected 2026-08-13, Judgment Day F-9. This line previously read "a schema migration, **a backfill over legacy production rows**, …" — contradicting §1.1, R-BIL-126, OQ-2 and D-C2-3, all of which establish there is no backfill. The author's own correction sweep grepped four semantic variants and never this literal phrase, which is exactly the K-003 failure mode the spec claims to apply. Depth still resolves to Full on the remaining grounds.)*

---

## 1. Context

STAR stores the Science Programs (SPs) selected for a bilateral result as a **flat, role-less list**. PRMS does not treat them as equal: exactly one **Primary SP** owns the result's approval verdict, and **Contributing SPs** only accept or decline their own slice after the Primary approves.

This spec adds that distinction — a role per selected SP, an "exactly one Primary" invariant enforced server-side and at the database, and Theory-of-Change (ToC) mapping restricted in STAR to the Primary SP.

### 1.1 Environment data state — read this before assessing migration risk

**Stated by the product owner, 2026-08-13:** the Science-Program mapping data currently in the system is **fake test data seeded in DEV**. **Production holds no mapped SP information.**

This single fact reshapes several risk assessments in this spec, so it is recorded here rather than buried:

| Consequence | Where it lands |
| --- | --- |
| There are **no legacy production rows** to backfill, promote, or protect | R-4 → downgraded; OQ-2 → closed empirically as well as technically |
| The migration runs against an **effectively empty production table** | D-2 defect class → severity drops; the manual gate is retained for DEV, where seeded rows do exist |
| No production user currently holds a bilateral SP selection | R-5′ and the deployment-order note (`design.md` §10) → real-user impact is theoretical, coordination still required |
| `is_read_only` legacy alignments are a **DEV-only** scenario today | R-BIL-126 AC.3 stays specified — the design must be correct before production data exists, not after |

**This lowers risk; it does not remove requirements.** Every requirement below remains as written. A nullable column with write-time-only enforcement is the right design whether or not legacy rows exist — and it is the design that stays correct once production *does* accumulate them. Nothing here is relaxed on the strength of a table being empty today.

**What is explicitly NOT changing:**

- The per-SP ToC table `result_pool_funding_toc_alignment` and its partial-unique `(result, sp)` row — **retained**, not collapsed to a single Primary row (parent proposal §11 condition 2).
- `is_read_only` semantics (PRMS-sourced ∪ synced-to-PRMS). Not widened, not narrowed (R-9′).
- C1's partial-ToC validator relaxation, the `contribution_without_indicator` code, and the null contract on partial rows.
- Pool-funding tag derivation, the ToC catalog source (`toc-integration/`), and `reviewDecision()` (still `NotImplementedException` — the PRMS round-trip is a separate user story).
- **A7 — the "enable on Principal-Investigator approval" gate.** Deferred; see **OQ-1** in §10.

---

## 2. Requirement numbering

Requirements use `R-BIL-<NNN>`, continuing the module sequence. C1 consumed `R-BIL-110`–`R-BIL-119`; this spec starts at **`R-BIL-120`**.

Numbered in dependency order: persistence (120–123) → behavior (124–126) → client (127–129) → **non-regression (130)**.

---

## 3. Functional requirements

### R-BIL-120 — Each selected Science Program carries a role

- **As a** Result Contributor
- **I want** each Science Program I select to be recorded as either Primary or Contributing
- **So that** STAR expresses the routing PRMS actually enforces

**Details:**
- Inputs: `PATCH /api/v1/results/:result-code/pool-funding-alignment` body — `sp_codes: string[]` (all selected SPs, unchanged meaning) **plus** new `primary_sp_code: string`.
- Behavior:
  - The role of each persisted SP row is **derived**, not transmitted per-row: `sp_code === primary_sp_code ? 'PRIMARY' : 'CONTRIBUTING'`.
  - Persisted on `result_pool_funding_alignment_sp.sp_role`.
  - `primary_sp_code` is required when `has_contribution === true`; ignored (and no SP rows written) when `has_contribution === false`, matching existing R-BIL-014 behavior.
- Outputs: `ServerResponseDto` wrapping `AlignmentResponse`; `status: 200`, `description: "Pool funding alignment updated"`.
- Errors: `400` with `errors.primary_sp` (see R-BIL-121 / R-BIL-122).
- Permissions: unchanged — `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` + `RolesGuard` + `ResultOwnerGuard`.

**Acceptance criteria:**
- [ ] AC.1 — A PATCH with `has_contribution: true`, `sp_codes: ["SP06","SP09"]`, `primary_sp_code: "SP06"` persists two active rows: `SP06` with `sp_role = 'PRIMARY'`, `SP09` with `sp_role = 'CONTRIBUTING'`.
- [ ] AC.2 — A PATCH with `has_contribution: false` persists zero SP rows and does not require `primary_sp_code`.
- [ ] AC.3 — `sp_codes` retains its existing meaning (the full selected set, Primary included). No caller has to send the Primary twice.
- [ ] AC.4 — The legacy `lever_codes` back-compat path still resolves; a body using `lever_codes` + `primary_sp_code` behaves identically to one using `sp_codes`.

#### Scenario: Primary and Contributing are persisted with distinct roles

- GIVEN an eligible, non-read-only bilateral result whose CLARISA project exposes `SP06` and `SP09`
- WHEN the contributor PATCHes `has_contribution: true`, `sp_codes: ["SP06","SP09"]`, `primary_sp_code: "SP06"`
- THEN the response is `200` and `selected_science_programs` reports `SP06` with `role: "PRIMARY"` and `SP09` with `role: "CONTRIBUTING"`
- AND exactly one active `result_pool_funding_alignment_sp` row for that alignment has `sp_role = 'PRIMARY'`
- BUT it must NOT write a role onto any row when `has_contribution === false`
- AND IT MUST derive the role solely from `primary_sp_code` — the wire carries no per-row role field

**Out of scope (for this requirement):** the visual treatment of the two roles (R-BIL-127).

---

### R-BIL-121 — Exactly one Primary SP per bilateral alignment

- **As a** MEL Regional Expert
- **I want** every submitted bilateral alignment to name exactly one Primary SP
- **So that** PRMS always has an unambiguous owner for the approval verdict

**Details:**
- Behavior — enforced at **two** layers, deliberately:
  1. **Service (≥ 1):** `has_contribution === true` with `primary_sp_code` absent, empty, or whitespace → `400`, `errors.primary_sp.code = "primary_sp_required"`.
  2. **Database (≤ 1):** a STORED GENERATED column non-NULL only for active `PRIMARY` rows, plus a UNIQUE index — the same pattern already proven in this module by migration `1779190000015` and `1779190000014`.
- The wire shape makes "two Primaries" **unrepresentable** (`primary_sp_code` is a single string), so no `400` code exists for it. The DB index is the backstop against a bypassed service path, not a user-facing error.
- Errors: `400` `errors.primary_sp: { code, description }`.

**Acceptance criteria:**
- [ ] AC.1 — `has_contribution: true` with `primary_sp_code` omitted returns `400` and `errors.primary_sp.code === "primary_sp_required"`; nothing is persisted.
- [ ] AC.2 — `primary_sp_code: ""` or `"   "` is treated as absent and returns the same `400`.
- [ ] AC.3 — Inserting a second active `PRIMARY` row for one `alignment_id` directly against the database fails on the UNIQUE index.
- [ ] AC.4 — Deactivated (`is_active = 0`) `PRIMARY` rows do not collide with the active one — the alignment can be re-saved any number of times.

#### Scenario: Saving with no Primary is rejected atomically

- GIVEN an eligible bilateral result
- WHEN the contributor PATCHes `has_contribution: true`, `sp_codes: ["SP06"]` and no `primary_sp_code`
- THEN the response is `400` carrying `errors.primary_sp.code = "primary_sp_required"`
- AND the previously saved alignment is unchanged
- BUT it must NOT create a new alignment row, deactivate the previous one, or write any SP row
- AND IT MUST reject before opening the transaction, so no partial write is observable

#### Scenario: The database refuses a second active Primary

- GIVEN an alignment that already has one active `PRIMARY` SP row
- WHEN a second active row with `sp_role = 'PRIMARY'` is inserted for the same `alignment_id` outside the service
- THEN the insert fails on the UNIQUE index over the generated column
- AND IT MUST still permit any number of active `CONTRIBUTING` rows for that alignment

---

### R-BIL-122 — Primary must be one of the selected Science Programs

- **As a** Result Contributor
- **I want** the Primary to always be an SP I actually selected
- **So that** the alignment can never name an owner outside its own SP set

**Details:**
- Behavior — **two checks, in this order** (corrected 2026-08-13, Judgment Day F-6):
  1. `primary_sp_code` is **not a valid SP for this result at all** (absent from `getScienceProgramsForResult`'s catalog) → the existing `400 errors.unknown_sp_codes` contract, carrying the offending code.
  2. `primary_sp_code` is valid for the result but **not in the effective `sp_codes`** → `400`, `errors.primary_sp.code = "primary_sp_not_selected"`.
- Mutual exclusion ("Primary ∉ Contributing") is **structural**: one row per `(alignment, sp_code)` carrying exactly one role, and the wire cannot express an SP in both roles. No runtime check is needed, and none is added.

> **Why check 1 must exist explicitly.** `normalizeLeverCodes` (`bilateral.service.ts:1296-1337`) validates only codes drawn from `dto.sp_codes` / `dto.lever_codes` — it **never inspects `primary_sp_code`**. An earlier draft assumed an unknown Primary would be caught there; it would not. Without check 1, `sp_codes: ["SP06"], primary_sp_code: "SP99"` returns `primary_sp_not_selected` and **AC.2 below is undischargeable**. The Primary must be validated against the full per-result catalog, not merely against the selected subset.

**Acceptance criteria:**
- [ ] AC.1 — `sp_codes: ["SP06"]`, `primary_sp_code: "SP09"` (a valid SP for the result, but unselected) returns `400` with `errors.primary_sp.code === "primary_sp_not_selected"`.
- [ ] AC.2 — `sp_codes: ["SP06"]`, `primary_sp_code: "SP99"` (**not** a valid SP for the result) returns the pre-existing `400 errors.unknown_sp_codes` carrying `SP99` — the legacy contract is not shadowed. **This AC requires the full-catalog check above; it cannot be discharged by the selected-subset check alone.**
- [ ] AC.3 — No persisted state can represent one `sp_code` as both Primary and Contributing on the same active alignment.
- [ ] AC.4 — AC.1 and AC.2 are proven by **two distinct tests with different error payloads**. A single test covering only the unselected case does not discharge AC.2.

#### Scenario: A Primary outside the selection is rejected

- GIVEN a result whose valid SPs are `SP06` and `SP09`
- WHEN the contributor PATCHes `sp_codes: ["SP06"]` with `primary_sp_code: "SP09"`
- THEN the response is `400` with `errors.primary_sp.code = "primary_sp_not_selected"`
- BUT it must NOT report this as `unknown_sp_codes` — `SP09` is a legitimate SP for the result, merely unselected
- AND IT MUST leave the stored alignment untouched

---

### R-BIL-123 — The read-back exposes each SP's role

- **As a** STAR client (and any API consumer)
- **I want** the alignment read-back to tell me each SP's role
- **So that** the UI can render the two groups without a second call or a guess

**Details:**
- Outputs: `AlignmentResponse.selected_science_programs[]` gains `role: 'PRIMARY' | 'CONTRIBUTING' | null`.
- `null` means **role not yet chosen** — only reachable on legacy rows written before this migration (R-BIL-126). It is never produced by a write that passes R-BIL-121.
- `GET` and `PATCH` return byte-identical payloads for the same state (the existing R-BIL-096 invariant), so the role appears on both.

**Acceptance criteria:**
- [ ] AC.1 — After a successful save, `selected_science_programs` reports exactly one entry with `role: "PRIMARY"`.
- [ ] AC.2 — `GET` and `PATCH` return the same `selected_science_programs` array (including `role`) for the same stored state.
- [ ] AC.3 — Every other field of `AlignmentResponse` is unchanged in name, type, and nullability — `role` is purely additive.
- [ ] AC.4 — Swagger documents `role` including the `null` case and what it means.

#### Scenario: Role survives a round-trip

- GIVEN a saved alignment with `SP06` Primary and `SP09` Contributing
- WHEN the client re-fetches the alignment
- THEN `selected_science_programs` contains `SP06` with `role: "PRIMARY"` and `SP09` with `role: "CONTRIBUTING"`
- AND IT MUST preserve the existing ordering contract of the array (`sp_code` ascending)
- BUT it must NOT add, remove, or retype any pre-existing field on the envelope

---

### R-BIL-124 — STAR accepts a ToC alignment only for the Primary SP

- **As a** Result Contributor
- **I want** the detailed ToC mapping to belong to the Primary SP alone
- **So that** STAR matches the AC-1676 rule that only the Primary is ToC-mapped in STAR

**Details:**
- Behavior: inside `validateTocAlignments`, an entry whose `sp_code` is selected but is **not** the Primary is rejected with the per-alignment code `toc_alignment_not_primary_sp`, in the existing `errors.toc_alignments[{ sp_code, field, error }]` channel.
- Ordering relative to the existing codes: `sp_not_selected` still fires first for an unselected SP; a *selected but non-Primary* SP gets the new code.
- This restricts **who STAR lets write**. It does not delete, deactivate, or hide anything already stored (R-BIL-125).
- All C1 validation stays exactly as shipped for the Primary's own entry: the Level + HLO floor, conditional catalog checks, and `contribution_without_indicator`.

**Acceptance criteria:**
- [ ] AC.1 — A `toc_alignments` entry for a selected Contributing SP returns `400` with `error: "toc_alignment_not_primary_sp"` for that `sp_code`.
- [ ] AC.2 — A `toc_alignments` entry for an *unselected* SP still returns `sp_not_selected`, not the new code.
- [ ] AC.3 — The Primary's own entry validates exactly as it did under C1 — same floor, same conditional catalog checks, same `contribution_without_indicator`.
- [ ] AC.4 — The `400` remains atomic: all per-alignment errors are collected and returned together, and nothing is persisted.
- [ ] AC.5 — A request whose only `toc_alignments` entry is the Primary's succeeds unchanged.

#### Scenario: A Contributing SP cannot be ToC-mapped from STAR

- GIVEN a saved alignment with `SP06` Primary and `SP09` Contributing
- WHEN the contributor PATCHes a `toc_alignments` entry for `SP09` with `aligns_with_toc: true`, a valid level and a valid `toc_result_id`
- THEN the response is `400` and `errors.toc_alignments` contains `{ sp_code: "SP09", error: "toc_alignment_not_primary_sp" }`
- AND no ToC row is written or modified for `SP09`
- BUT it must NOT deactivate or delete any ToC row that already exists for `SP09`
- AND IT MUST report the error atomically alongside any other per-alignment errors in the same request

---

### R-BIL-125 — Existing Contributing-SP ToC rows are retained

- **As a** platform owner
- **I want** ToC rows belonging to non-Primary SPs to survive
- **So that** the deferred PRMS round-trip story is not foreclosed by this chunk

**Details:**
- Behavior:
  - The existing SP-deselection cascade is **unchanged**: a ToC row is deactivated only when its SP leaves `sp_codes` entirely.
  - **No new cascade is added.** Demoting an SP from Primary to Contributing, or promoting another SP, deactivates nothing.
  - Rows for non-Primary SPs continue to be returned by `toc_alignments[]` on the read-back — the read is not filtered by role.
- Rationale: parent proposal §11 condition 2. Deleting these rows would be expensive to reverse once PRMS begins returning Contributing-SP ToC data inbound.

**Acceptance criteria:**
- [ ] AC.1 — Changing `primary_sp_code` from `SP06` to `SP09`, with both still selected, leaves both SPs' active ToC rows intact.
- [ ] AC.2 — `toc_alignments[]` on the read-back still returns the demoted SP's row.
- [ ] AC.3 — Removing an SP from `sp_codes` still deactivates its ToC row — the pre-existing cascade is untouched.
- [ ] AC.4 — A test pins the pre-existing cascade behavior **before** the role change is implemented, so a regression is attributable.

#### Scenario: Demotion preserves the demoted SP's ToC row

- GIVEN a saved alignment where `SP06` is Primary with a saved ToC alignment, and `SP09` is Contributing
- WHEN the contributor PATCHes the same `sp_codes` but `primary_sp_code: "SP09"`
- THEN the save succeeds
- AND `SP06`'s ToC row is still active and still present in `toc_alignments[]`
- BUT it must NOT be deactivated, deleted, or blanked as a side effect of the role change
- AND IT MUST remain excluded from STAR's writable surface while `SP06` is not Primary (R-BIL-124)

---

### R-BIL-126 — Legacy alignments survive the migration unbroken

- **As a** platform owner
- **I want** alignments saved before this change to keep working
- **So that** no existing result — least of all a PRMS-locked one — is left in an unrepairable state

> **Scope note (§1.1).** Production holds no mapped SP data, so the legacy rows this requirement protects exist **only in DEV** today. The requirement is specified in full regardless: the migration must be correct before production accumulates data, and the DEV rows are real enough to break. Verification runs against DEV's seeded data.

**Details:**
- Behavior:
  - `sp_role` is **nullable**. The migration backfills nothing; every pre-existing row keeps `sp_role = NULL`, meaning *"Primary not yet chosen"*.
  - The "exactly one Primary" invariant is enforced **on write only**. Reads never reject, never throw, and never synthesise a Primary.
  - A read-only alignment (PRMS-sourced or synced) with `sp_role = NULL` reads back cleanly with `role: null` on every SP and remains read-only. The user cannot fix it and is never asked to.
- **Why no auto-promotion:** promoting the highest-allocation SP is not implementable in a SQL migration — allocations are not stored in the database. They are fetched per-result from the CLARISA project mapping at request time (`deriveScienceProgramMetaByCode`). A migration has no access to them. This closes OQ-2 on a technical constraint rather than a preference — and §1.1 closes it a second time empirically, since production has nothing to promote.

**Acceptance criteria:**
- [ ] AC.1 — After the migration, every pre-existing `result_pool_funding_alignment_sp` row has `sp_role = NULL` and remains `is_active` as before.
- [ ] AC.2 — `GET` on a legacy alignment returns `200` with `role: null` on every entry of `selected_science_programs`.
- [ ] AC.3 — A legacy alignment that is `is_read_only` is not mutated by the migration and still returns `is_read_only: true`.
- [ ] AC.4 — A legacy, editable alignment can be repaired by one normal PATCH that supplies `primary_sp_code`.
- [ ] AC.5 — The migration's `down()` drops the column, the generated column, and the index, and restores the table to its prior shape.

#### Scenario: A PRMS-locked legacy alignment is left alone

- GIVEN an alignment saved before this migration whose result is synced to PRMS (`is_read_only: true`)
- WHEN the migration runs and a user then opens the section
- THEN the alignment loads with `role: null` on every SP and `is_read_only: true`
- AND the section renders read-only exactly as it did before
- BUT it must NOT be blocked, error, or prompt the user to choose a Primary they cannot save
- AND IT MUST NOT have had any row rewritten by the migration

---

### R-BIL-127 — The selector distinguishes Primary from Contributing

- **As a** Result Contributor
- **I want** to designate one Primary SP and see the two roles clearly apart
- **So that** I understand which SP owns the result's fate before I submit

**Details:**
- Both roles display the established format `SP06 — 10% - Climate Action` (already shipped; C1 regression R-BIL-115).
- Exactly one SP can hold Primary at a time in the form; choosing a new Primary releases the previous one to Contributing.
- Save is blocked while `has_contribution === true` and no Primary is chosen, with an inline message — the client must not rely on the server `400` for this.
- Read-only and version-locked states disable the Primary control exactly as they disable the existing picker.

**Acceptance criteria:**
- [ ] AC.1 — Selecting a Primary marks that SP as Primary and leaves all other selected SPs Contributing.
- [ ] AC.2 — Choosing a different Primary demotes the previous one to Contributing in the same interaction.
- [ ] AC.3 — With `has_contribution: true` and no Primary chosen, `canSave()` is false and an inline message names what is missing.
- [ ] AC.4 — Deselecting the SP that currently holds Primary clears the Primary and re-blocks save.
- [ ] AC.5 — When the section is read-only or version-locked, the Primary control is disabled alongside the existing picker.
- [ ] AC.6 — The two roles are distinguishable by a **non-colour-only** cue (text label or icon plus colour), satisfying PRD C-4 / WCAG 2.1 AA.

#### Scenario: Choosing a new Primary demotes the old one

- GIVEN the contributor has selected `SP06` and `SP09`, with `SP06` marked Primary
- WHEN they mark `SP09` as Primary
- THEN `SP09` renders as Primary and `SP06` renders as Contributing
- AND the save payload carries `primary_sp_code: "SP09"` with both codes still in `sp_codes`
- BUT it must NOT leave two SPs marked Primary at any point, including mid-interaction
- AND IT MUST convey the distinction without relying on colour alone

---

### R-BIL-128 — The ToC block renders for the Primary SP only

- **As a** Result Contributor
- **I want** the detailed ToC cascade offered only for the Primary SP
- **So that** the UI matches what the server will accept

**Details:**
- The per-SP ToC block renders for the Primary SP alone. Contributing SPs render without one.
- The save gate (`canSave`) evaluates ToC completeness for the Primary's draft only — a Contributing SP without an answer must not block save.
- C1's reworded question and its Level + HLO floor apply unchanged to the Primary's block.
- The PATCH body carries at most one `toc_alignments` entry, for the Primary.
- When no Primary is chosen, no ToC block renders.

**Acceptance criteria:**
- [ ] AC.1 — With `SP06` Primary and `SP09` Contributing, exactly one ToC block renders, for `SP06`.
- [ ] AC.2 — `canSave()` ignores the absence of a ToC answer for `SP09`.
- [ ] AC.3 — The submitted `toc_alignments` array contains at most one entry, whose `sp_code` is the Primary.
- [ ] AC.4 — Changing the Primary moves the rendered block to the new Primary.
- [ ] AC.5 — With no Primary chosen, no ToC block renders and save is already blocked by R-BIL-127 AC.3.
- [ ] AC.6 — C1's Level + HLO floor and reworded question are unchanged inside the rendered block.

#### Scenario: Only the Primary gets a ToC block

- GIVEN `has_contribution: true` with `SP06` (Primary) and `SP09` (Contributing) selected, and a catalog offering at least one level
- WHEN the ToC section renders
- THEN exactly one `app-sp-toc-alignment-block` is present, bound to `SP06`
- AND save is not blocked by `SP09` having no ToC answer
- BUT it must NOT render a ToC block, question, or cascade for `SP09`
- AND IT MUST still enforce C1's Level + HLO floor on `SP06`'s own answer before allowing save

---

### R-BIL-129 — Saved ToC alignments for non-Primary SPs stay visible, read-only

- **As a** Result Contributor
- **I want** to still see a ToC alignment that belongs to an SP that is no longer Primary
- **So that** data that is still stored — and still bound for PRMS — does not vanish from the screen

**Details:**
- A saved, active ToC row whose `sp_code` is **not** the current Primary renders as a **read-only** summary, reusing the existing stale-snapshot presentation pattern (`staleSnapshots`).
- It is display-only: not editable, never included in the PATCH body, and it does not participate in `canSave()` or `isDirty()`.
- This exists because R-BIL-125 retains those rows. Without it, demoting an SP would make live persisted data silently invisible.

**Acceptance criteria:**
- [ ] AC.1 — A saved ToC alignment for a non-Primary SP renders as a read-only summary identifying its SP.
- [ ] AC.2 — It exposes no editable control.
- [ ] AC.3 — It is never included in the `toc_alignments` PATCH payload.
- [ ] AC.4 — It does not make the form dirty and does not affect `canSave()`.
- [ ] AC.5 — A row that is *both* non-Primary and stale renders once, not twice.

#### Scenario: A demoted SP's saved alignment stays on screen

- GIVEN `SP06` has a saved ToC alignment and the contributor changes the Primary to `SP09`
- WHEN the section re-renders
- THEN `SP06`'s saved alignment is shown as a read-only summary
- AND `SP09` gets the single editable ToC block
- BUT it must NOT be included in the next PATCH payload, and must NOT mark the form dirty
- AND IT MUST render exactly once even if it also qualifies as a stale snapshot

---

### R-BIL-130 — The shipped `409 toc_mapping_version_locked` keeps firing first

*(Added 2026-08-13, Judgment Day F-2.)*

- **As an** API consumer
- **I want** the version gate to keep winning over the new Primary validation
- **So that** a shipped error contract is not silently displaced by this spec

**Details:**
- Today the version gate is the **first statement inside** `validateTocAlignments` (`bilateral.service.ts:867-876`), so on a version-locked result carrying `toc_alignments` it fires before every per-alignment `400`.
- Inserting the new Primary validation ahead of `validateTocAlignments` would move `400 primary_sp_required` **in front of** that `409`, changing the observable outcome of a shipped, tested contract (C1's R-BIL-097 AC.2).
- **Required behavior:** the version gate is evaluated **before** Primary validation. Its existing trigger condition is unchanged — it fires only when `toc_alignments` is present, so legacy bodies still bypass it entirely (R-BIL-097 AC.3).
- Mechanism is a design concern (`design.md` D-C2-13); the requirement fixes only the observable ordering.

**Acceptance criteria:**
- [ ] AC.1 — A PATCH with `has_contribution: true`, `toc_alignments` present, a non-2026 live version, **and no `primary_sp_code`** returns `409` with `code === "toc_mapping_version_locked"` — **not** `400 primary_sp_required`.
- [ ] AC.2 — The existing test at `bilateral.service.updateAlignment.tocAlignments.spec.ts:216` (R-BIL-097 AC.2) passes **unmodified**. If it must be edited to pass, the ordering has been changed and this requirement is violated.
- [ ] AC.3 — A legacy body (no `toc_alignments`) on a non-2026 version still bypasses the version gate and is validated normally, including Primary validation.
- [ ] AC.4 — On a **2026** result, `primary_sp_required` still fires as specified in R-BIL-121 — the gate does not mask Primary validation when it does not apply.

#### Scenario: The version gate still wins on a locked result

- GIVEN a pool-funding-eligible result whose live version is 2025
- WHEN a contributor PATCHes `has_contribution: true` with `toc_alignments` present and no `primary_sp_code`
- THEN the response is `409` with `code = "toc_mapping_version_locked"`
- AND nothing is persisted
- BUT it must NOT return `400 primary_sp_required` — that would displace a shipped contract
- AND IT MUST leave the R-BIL-097 AC.2 test passing without edits

---

## 4. Non-functional requirements

Inherited defaults are not restated (`ServerResponseDto`, `/api/v{n}`, `AuditableEntity`, `GlobalExceptions`). Only deltas below.

### NFR-BIL-120 — Migration is non-destructive and reversible

- **Category:** reliability
- **Target:** `up()` adds a nullable column, a generated column, and an index. It rewrites **no existing row's data** — every legacy row keeps `sp_role = NULL`, hence `active_primary_alignment = NULL`, and the `(id, alignment_id, sp_code, is_active)` checksum is preserved. `down()` restores the prior table shape. Both run cleanly against a database holding legacy alignments, including `is_read_only` ones.
- **⚠ Physical caveat** *(added 2026-08-13, RA-10 — this became checkable only once the normative DDL landed)*: `ADD COLUMN … STORED` cannot be done in place. MySQL forces `ALGORITHM=COPY`, a **full table rebuild** that writes a computed value into every row and holds a metadata lock proportional to table size. "Rewrites zero rows" is true of the **logical content**, not the physical operation — and that distinction is what determines deploy lock duration. Mitigated by combining both `ADD COLUMN`s into a single `ALTER` (`design.md` §3.1) so the table is rebuilt once, not twice. Low impact today given §1.1 (no production rows), but it must not be described as an in-place change.
- **How verified:** `npm run migration:dev:execute` then `npm run migration:revert` against a seeded database, with row counts and a checksum of `(id, alignment_id, sp_code, is_active)` compared before and after. **This is not covered by Jest** — migrations are excluded from coverage (see §8 D-2).

### ~~NFR-BIL-121 — `sp_role` is indexed in OpenSearch~~ — **WITHDRAWN 2026-08-13**

**Withdrawn on a false premise (Judgment Day F-1; user decision 2026-08-13).**

This NFR asserted that `sp_code` is already indexed and that `sp_role` should join it. **`sp_code` is not indexed.** The `@OpenSearchProperty({ type: 'keyword' })` on `ResultPoolFundingAlignmentSp.sp_code` (`result-pool-funding-alignment-sp.entity.ts:38`) is **inert metadata that nothing reads**:

- The mapping is generated only from the class registered as `_openSearchEntity` (`base-open-search-api.ts:318`), recursing solely through `options.nestedType`.
- `OpenSearchResultApi` registers `ResultOpensearchDto` (`result.opensearch.api.ts:24`); `ResultPoolFundingAlignmentSp` is not in that tree, and appears nowhere outside `domain/entities/bilateral/` and its own migration.
- The indexed *document* is a hand-written SQL projection (`result.repository.ts` → `findDataForOpenSearch`) whose only SP-ish field is `Levers`, drawn from `result_levers` / `clarisa_levers` — a different table.

**Decorating `sp_role` would therefore change nothing.** No decoration is added, and no reindex is required.

> **Recorded platform gap (not this spec's to fix).** Bilateral SP alignment — **including `sp_code` today** — is invisible to OpenSearch, and the inert decorator makes it look otherwise to anyone reading the entity. Making it searchable means adding fields to `ResultOpensearchDto` *and* to the `findDataForOpenSearch` projection: cross-module work in the results OpenSearch tree, outside C2's boundary. Captured here so it is a known gap rather than a silent one. **R-7 is restated accordingly: there is no OpenSearch drift axis to widen, because this entity was never on the axis.**

> **`NFR-BIL-121` is RETIRED, not reused.** The ID stays permanently attached to the withdrawn OpenSearch NFR above. *(Corrected 2026-08-13, round-two re-judgment RA-03 — an intermediate draft recycled the vacated ID for the latency NFR below, which briefly gave one ID two meanings and made every downstream citation ambiguous against `judgment.md`, where `NFR-BIL-121` denotes the OpenSearch NFR. **A numbering hole costs nothing; a recycled ID costs traceability permanently.** Caught before `tasks.md` existed, which is the only cheap moment to catch it.)*

### NFR-BIL-122 — `GET` adds no query round-trip

- **Category:** performance
- **Target:** `GET` issues no additional query. `sp_role` rides the existing `findActiveAlignmentByResultId` join — no new round-trip, no new upstream call.
- **How verified:** query count asserted in **`repositories/result-pool-funding-alignment.repository.spec.ts`** — a **new file**; this repository has no spec today (Judgment Day F-4). Listed in `design.md` §2.1 and §9 and owned by a named task.

---

## 5. Data requirements

**Affected entity:** `server/researchindicators/src/domain/entities/bilateral/entities/result-pool-funding-alignment-sp.entity.ts`

| Change | Detail |
| --- | --- |
| Column added | `sp_role varchar(20) NULL` — domain `'PRIMARY' \| 'CONTRIBUTING'`; `NULL` = role not yet chosen (legacy only) |
| Generated column added | `active_primary_alignment` **`bigint`** STORED — holds `alignment_id` when `is_active = 1 AND sp_role = 'PRIMARY'`, else `NULL`. **See `design.md` §3.1 for the normative DDL** — the expression's *value* must be `alignment_id` alone and must **not** include `sp_role`, or the index would reject a second active Contributing SP |
| Index added | `UNIQUE INDEX idx_rpfas_active_primary (active_primary_alignment)` — enforces ≤ 1 active Primary per alignment |
| OpenSearch | **None.** No decoration added — this entity is not in the OpenSearch tree (withdrawn NFR, §4) |
| Backfill | **None.** Legacy rows keep `sp_role = NULL` (R-BIL-126) |

The generated column is **not** mapped on the entity — TypeORM would otherwise attempt to write it. Same treatment as `active_result_sp` on `result_pool_funding_toc_alignment` (migration `1779190000015`) and `result_pool_funding_alignment` (`1779190000014`).

Migration filename pattern: `<timestamp>-addSpRoleToAlignmentSp.ts`, append-only, under `src/db/migrations/`.

**Unchanged:** `result_pool_funding_toc_alignment` — no column added, no row deleted, constraint intact (R-BIL-125).

---

## 6. API surface delta

### PATCH /api/v1/results/:result-code/pool-funding-alignment

- **Controller:** `bilateral.controller.ts` (existing handler — no new endpoint)
- **Roles / guards:** unchanged — `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)`, `RolesGuard`, `ResultOwnerGuard`
- **Body DTO:** `dto/update-pool-funding-alignment.dto.ts` — **adds** `primary_sp_code?: string`
- **Versioning:** stays `/v1`. See the breaking-change note below.
- **New errors:**

| Status | `errors` key | Code | Fires when |
| --- | --- | --- | --- |
| 400 | `primary_sp` | `primary_sp_required` | `has_contribution: true`, no usable `primary_sp_code` |
| 400 | `primary_sp` | `primary_sp_not_selected` | `primary_sp_code` ∉ effective `sp_codes` |
| 400 | `toc_alignments[]` | `toc_alignment_not_primary_sp` | a `toc_alignments` entry names a selected non-Primary SP |

- **Swagger:** `@ApiProperty` on `primary_sp_code`; the existing `@ApiResponse` 400 description extended with the three codes.

### GET /api/v1/results/:result-code/pool-funding-alignment

- Response `AlignmentResponse.selected_science_programs[]` gains `role: 'PRIMARY' | 'CONTRIBUTING' | null`. Purely additive.

**Breaking-change assessment — why `/v1` is kept.** The change is additive on the response and additive-but-required on the request. An un-updated client that omits `primary_sp_code` receives a `400` with a named code — it **fails loudly**, which is exactly what R-5′ demands, rather than silently saving an alignment with no owner. Because `ValidationPipe` on this handler runs with `forbidNonWhitelisted: true`, a client that sends `primary_sp_code` against an un-deployed server also fails loudly. No silent-corruption path exists in either deployment order, so a `/v2` split would add a parallel surface without preventing anything. Recorded as a design decision, not assumed.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| **OpenSearch** | **No impact, and none is possible.** `ResultPoolFundingAlignmentSp` is not reachable by the mapping generator and is not in the indexed document. No decoration, no mapping change, **no reindex** (§4, Judgment Day F-1) |
| **Socket.IO** | `result.pool-funding-alignment.changed` payload is **unchanged** — it carries `result_code`, `by_user_id`, `at` only, none of which are role-dependent. No new event. |
| **CLARISA** | No contract change. Allocations continue to arrive per-result via `getScienceProgramsForResult`. |
| **PRMS** | No outbound or inbound behavior in this spec. `reviewDecision()` stays `NotImplementedException`. |
| **STAR client** | In scope for this spec (the monorepo holds both tiers): `pool-funding-alignment.interface.ts`, `pool-funding-alignment.component.*`, `sp-toc-alignment-block.component.*`, `bilateral.service.ts` |
| **Docs** | `docs/ux-ui/design.md` §12.2 gains a decision entry for the two-role selector |

---

## 8. Defect classes and their gates

The classes of defect this spec can actually produce, and the command that catches each. A gate blind to the dominant class is not a gate.

| # | Defect class | Catching gate | Blind spot |
| --- | --- | --- | --- |
| **D-1** | Invariant not enforced (zero/two Primaries, Primary unselected, ToC accepted for a Contributing SP) | `npm test` — service unit specs asserting each `400` code and the persisted rows | None. This is the class unit tests are good at. |
| **D-2** | **Migration corrupts or fails on legacy data** — *severity reduced by §1.1: production has no mapped SP rows, so the blast radius is DEV's seeded data plus all future production data* | **No automated gate.** Migrations are excluded from Jest coverage and no migration harness exists in this repo. | **Substituted:** a mandatory manual `migration:dev:execute` → `migration:revert` cycle against DEV's seeded data with before/after row checksums, recorded as evidence in the task. Retained at full strength despite the reduced severity — an empty production table today is not evidence the DDL is correct tomorrow, and a green `npm test` says *nothing* here either way. |
| **D-3** | Client type error shipped green | `npm run build` (client). **Kaizen K-002:** Jest runs `isolatedModules: true` and ESLint ignores `*.spec.ts`, so 6,239 passing tests once coexisted with a `TS2345` build failure. `npx tsc -p tsconfig.spec.json --noEmit` covers the specs. | Suite-green ≠ compile-green. Both commands are required. |
| **D-4** | Lint/format regression | `npx eslint <path>` (no `--fix`). **Kaizen K-001:** `npm run lint` is `eslint --fix` — it makes the thing it checks true and cannot verify. | `npm run lint` must never be cited as evidence. |
| **D-5** | **Primary/Contributing not visually distinguishable** | **No automated gate.** jsdom cannot measure layout or contrast; `axe` cannot evaluate a rendered raster. A test asserting a CSS class is a **presence-assertion** — it proves the class is in the markup, not that the roles read as different. | **Substituted:** human visual check at the Phase-3 HITL pause, against the mockups **if they land**. If they do not, see the accepted risk below. |
| **D-6** | Role semantics drift between tiers (client sends a Primary the server reads differently) | Server spec asserting the derivation, client spec asserting the payload shape, and a **`TEST`-datasource integration test** over the PATCH → read-back round-trip. *(Corrected 2026-08-13, F-7 + user decision: the original gate named a server **e2e**. There is no e2e harness — `test/` holds only `jest-e2e.json` and a 746-byte `GET /` smoke test, and booting `AppModule` pulls in MySQL, DynamoDB and RabbitMQ. Building one is harness construction, not test authoring, and was neither sized nor budgeted.)* | **Stated limitation:** an integration test exercises the service and repository against a real schema but **does not execute the client**. Genuine client↔server drift therefore remains only *partially* gated — the shared contract is asserted from both sides independently, never in one run. Recorded as a known limit, in the manner of C1's R-BIL-118 lapse condition, rather than described as full coverage. |
| **D-7** | Retained Contributing ToC rows silently deleted by an unintended cascade | R-BIL-125 AC.4 — a test pinning the pre-existing cascade **before** the role change lands | Without the before-test, a cascade regression is indistinguishable from intended behavior. |
| **D-8** | **A new error displaces a shipped error contract by reordering validation** — the F-2 class | R-BIL-130 AC.2: the existing `409` test must pass **unmodified**. An edit to that test to make it green is the defect, not the fix. | The subtle part is that a reordering defect leaves every *new* test green — it is only visible from the *old* test's perspective, which is why the AC forbids editing it. Named because this spec's own reversion challenge missed it. |
| **D-9** | **A test is re-based to pass rather than re-pointed at what it proved** — the class the five-file re-base creates | Each re-based assertion must either keep its original claim (with `primary_sp_code` merely added to the fixture) or have its claim **relocated** to a named new home. A re-based test whose original assertion simply disappeared is a coverage loss disguised as a green suite. | Not automatable — a deleted assertion leaves no trace. Enforced by review: the re-base task must list, per file, which assertions moved where. This is the D-2-shaped risk of the largest task in the spec. |

### Accepted risks

- **The canonical mockups have not been ingested** (parent proposal §7; nothing under `docs/specs/bilateral/**/mockup/`, verified 2026-08-13). The 2026-05-24 decision in `docs/ux-ui/design.md` §12.2 makes Figma/mockups canonical for this tab, and a prior remediation pass on this exact component exists *because* it drifted from the design. **D-5 therefore has neither an automated gate nor its intended human reference.** Accepted risk: the selector ships to a reasonable-but-unverified visual treatment, subject to a follow-up correction once the mockups land. This is recorded rather than silently absorbed.
- **A7 (PI-approval enablement gate) is not delivered.** OQ-1 is unanswerable from the repository (§10).

---

## 9. Assumptions, dependencies, risks

### Assumptions (require BA confirmation; none block implementation)

| # | Assumption | If wrong |
| --- | --- | --- |
| **A-1** | Any allocation percentage is eligible to be Primary — there is no minimum threshold. | A threshold check joins R-BIL-122. |
| **A-2** | The Primary may be changed freely until the alignment becomes read-only. | R-BIL-125 / R-BIL-129 would need a lock instead. |
| **A-3** | Contributing-SP ToC rows are retained (OQ-3 working assumption, inherited from parent §11 condition 2). | If the BA rules they should be deleted, R-BIL-125 and R-BIL-129 invert — and the deferred PRMS story loses its inbound landing zone. |
| **A-4** | A result with exactly one selected SP makes that SP the Primary by explicit user choice, not automatically. | An auto-select shortcut joins R-BIL-127. |

### Dependencies

- **C1 (`toc-optional-mapping`)** — shipped and archived 2026-08-13. Satisfied.
- **Mockups** — not ingested. Non-blocking for the server tier; degrades D-5 for the client tier (§8).
- **CLARISA per-result SP list with allocations** — already wired via `getScienceProgramsForResult`. No change.

### Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| **R-4** | Legacy rows have no role, violating "exactly one Primary" | Write-time-only enforcement + nullable column (R-BIL-126). **Downgraded by §1.1** — no production rows exist. Closed. |
| **R-5′** | Required-role semantics are an FE-visible contract change | Both deployment orders fail loudly (§6). **Downgraded by §1.1** — no production user currently holds an SP selection to break. Closed. |
| **R-6** | **2,983** lines of existing client spec across the two components (`pool-funding-alignment.component.spec.ts` 1,728 + `sp-toc-alignment-block.component.spec.ts` 1,255, measured 2026-08-13), with a 20% branch floor. **Supersedes the 2,645 figure carried by both proposals** (Judgment Day F-11) | Spec updates are their own task, not folded into implementation tasks |
| **R-7** | ~~OpenSearch drift if the role is not indexed~~ | **Restated (F-1): there is no drift axis to widen.** `ResultPoolFundingAlignmentSp` is not in the OpenSearch tree and never was — the `@OpenSearchProperty` on `sp_code` is inert. The risk as originally written does not exist; the *real* finding is that bilateral SP data is invisible to search altogether, recorded as a platform gap in §4 and out of C2's scope |
| **R-9′** | Temptation to widen `is_read_only` so locked legacy rows can be repaired | **Do not.** R-BIL-126 AC.3 pins current behavior |
| **R-C2-1** | ToC rows orphaned by a role change | R-BIL-125 + the pin-first test (AC.4) + R-BIL-129 visibility |
| **R-C2-2** | **Budget overrun.** C1 ran **3.2×** its estimate (1,719 vs ~530 insertions) and ≥14 review rounds vs 10, and `design.md` §9 required an escalation that was never raised. | `design.md` §12 records a budget calibrated against C1's actuals; `/akili-execute` must escalate on breach rather than continue |

---

## 10. Open questions

| # | Question | Owner | Target | Blocks |
| --- | --- | --- | --- | --- |
| **OQ-1** | **What is "approved by the Principal Investigator"?** Verified 2026-08-13: no PI approval state, transition, or role exists. `SecRolesEnum` has no PI entry. `principal_investigator` appears only as a display field resolved from `alliance_users` for OICR/status email templates (`result-status-workflow.repository.ts:77-80`). `ResultStatusEnum` does carry `BILATERAL_PENDING_REVIEW/APPROVED/REJECTED` (23/24/25), but those are PRMS-review states, not a PI gate. **A7 is deferred out of this spec.** | BA | before A7 is scheduled | A7 only |
| **OQ-2** | Primary-SP backfill. **Closed twice over.** *Technically:* allocations live in CLARISA, not the database, so a SQL migration cannot auto-promote by allocation. *Empirically (§1.1):* production has no mapped SP rows, so there is nothing to backfill. Resolution: leave rows unset (R-BIL-126). | — | — | closed |
| **OQ-3** | Retain Contributing-SP ToC rows? **Working assumption: yes** (A-3). Deleting them would foreclose the deferred PRMS story. | BA | before execute | R-BIL-125, R-BIL-129 |
| **OQ-5** | May the Primary change after selection? **Working assumption: yes, until read-only** (A-2). | BA | before execute | R-BIL-127 |
| **OQ-C2-1** | Wire shape. **Resolved in design** as `sp_codes[]` + `primary_sp_code` — see `design.md` D-C2-1. | — | — | closed |
| **OQ-7** | Carried over: **OQ-V2-3** (one-alignment-per-SP cardinality) now interacts with the Primary-only rule — with ToC restricted to one SP, per-SP cardinality is moot in STAR but not for PRMS-inbound rows. | BA | with the PRMS story | — |

---

## 11. Requirement ID index

| ID | Title | Tier | Scenarios | Covered by |
| --- | --- | --- | --- | --- |
| R-BIL-120 | Each selected SP carries a role | server | 1 | T-03, **T-06** |
| R-BIL-121 | Exactly one Primary SP | server + db | 2 | **T-06** (service, ≥1), **T-02** + **T-13** (db, ≤1) |
| R-BIL-122 | Primary must be selected | server | 1 | T-05, **T-06** |
| R-BIL-123 | Read-back exposes role | server | 1 | **T-08**, T-09, T-13 |
| R-BIL-124 | ToC accepted for Primary only | server | 1 | **T-07** |
| R-BIL-125 | Contributing ToC rows retained | server | 1 | **T-01** (AC.4 pin-first), **T-07** (AC.1; AC.2 write-half; AC.3 structurally), **T-08** (AC.2 read-back half — reassigned 2026-08-13), **T-11** (AC.3 discharged — pins green) |
| R-BIL-126 | Legacy alignments survive | server + db | 1 | **T-02**, T-06, T-08, T-13, T-14 |
| R-BIL-127 | Selector distinguishes roles | client | 1 | **T-14**, T-16 |
| R-BIL-128 | ToC block for Primary only | client | 1 | **T-15**, T-16 |
| R-BIL-129 | Non-Primary saved ToC stays visible | client | 1 | **T-15**, T-16 |
| R-BIL-130 | `409` version gate keeps firing first | server | 1 | T-01, **T-04**, T-11 |
| NFR-BIL-120 | Migration non-destructive | db | — | **T-02** (manual gate only) |
| NFR-BIL-122 | `GET` adds no query round-trip | server | — | T-08, **T-09** (sole home) |

**Clause-level closure** — requirement-ID presence is not coverage. Every scenario and every `BUT it must NOT` / `AND IT MUST` clause above is mapped to a named owning task in [`tasks.md`](./tasks.md) §4, together with the three items that are **uncovered by construction and stated as such**: D-5 (visual distinction — no gate, no mockup reference), D-6 (cross-tier drift — partial), and A7 (deferred).

**Preserved C1 guarantee:** R-BIL-118 AC.1/AC.3 (per-SP ToC isolation) can no longer be demonstrated through the service PATCH path and is **relocated**, not dropped — **T-12**. C1's AC.2 structural discharge is verified **not tripped** (this spec's migration targets `result_pool_funding_alignment_sp`, not `result_pool_funding_toc_alignment`).

**Withdrawn and retired:** `NFR-BIL-121` (OpenSearch indexing) — false premise, Judgment Day F-1. **The ID is not reused**; it stays bound to the withdrawn requirement so every citation resolves unambiguously (RA-03). There is deliberately no live `NFR-BIL-121`.

**Deferred, not specified here:** A7 (PI-approval enablement gate) — OQ-1.

---

## 12. Sign-off

- [ ] Engineering lead — Juan Carlos Cadavid
- [ ] MEL / product owner — Manuel Ricardo Almanzar Villa (needs: **OQ-3**, **OQ-5**. OQ-2 is closed — no confirmation outstanding.)
- [ ] Security review — not required (no auth, secrets, or PII surface changes)
- [ ] DevOps — **not required.** The OpenSearch reindex step was withdrawn with its NFR (F-1); no infra action remains beyond the ordinary migration deploy

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
