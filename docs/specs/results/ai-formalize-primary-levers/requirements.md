# Requirements — Results / AI Formalize: Portfolio-Routed Primary Levers

- **Module:** results
- **Spec id:** 2026-09-ai-formalize-primary-levers
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD section:** `docs/prd.md` §3.1 (Result Contributor / Researcher), §3.3 (Center / General Admin — "supports bulk AI formalization"), §7 `AC-Controlled-Lists` (levers are a CLARISA-governed vocabulary)
- **Linked tickets:** —
- **Extends:** `docs/specs/results/ai-formalize-strategic-objectives` — architecturally. Reuses its portfolio resolver, reporting channel, guard pattern and handler-registry route. **Amends its `[SO] R-RES-007`** (see §7)
- **Proposal:** `./proposal.md` (owner decisions 1–3, risks R-1…R-6, questions Q-1…Q-5)
- **Depth:** Standard
- **Last updated:** 2026-09-04 *(R-RES-007 AC.2 amended — Pivot, T-03)*

---

## 1. Context

The AI formalizer today **rejects any payload carrying** `primary_levers`. The field is absent from `ResultRawAi`, and `ValidationPipe` runs with `whitelist: true` **and `forbidNonWhitelisted: true`**, so the request fails with `400 property primary_levers should not exist` — the ids the extractor already resolved never reach the database and a human must re-enter them through `PATCH /api/results/:result-code/alignments`. This is the same gap the predecessor spec closed for `strategic_objectives`, requested by the owner on 2026-09-04 with a real payload.

The field's meaning is **portfolio-dependent**, and the two portfolios disagree — which is why this is a spec and not a one-line DTO addition:

| Portfolio | What `primary_levers` means there | Persisted as |
| --- | --- | --- |
| 1 (2010–2025) | levers | `lever_role_id = ALIGNMENT (1)`, `is_primary = true` |
| 2 (2026–2030) | **research areas** | `lever_role_id = RESEARCH_AREAS_ALIGNMENT (3)` |

**Not changing:** the alignment endpoints' request/response contract, what `PATCH .../alignments` does with levers, the transaction model of `formalizeResult`, `contributor_levers` writing, any schema, and the STAR client.

**Affected surface, enumerated by what the request touches rather than by feature folder** *(KZ-002)*: the AI DTO, both portfolio alignment handlers **and** the handler-contract interface they share, the section orchestrator, `ClarisaLeversService`, `formalizeResult`'s per-item path, **and the two bulk report fields a caller reads** — `bulk_upload_results.missing_fields` and the `results_created` / `results_errors` partition. The shared `ResultAlignmentOperationsService` is **read for behavior but not modified**.

---

## 2. Requirement numbering — and a mandatory cross-spec citation convention

Ids follow the constitutional form `R-RES-<NNN>`, ordinal within *this* spec, per `docs/specs/general-setup/requirements.md` §2.

**This creates a real collision hazard and it is controlled here rather than left to chance.** Two sibling specs in module `results` are live simultaneously, they cross-reference each other's requirements, and their ordinals overlap. The collision is at its worst on `R-RES-007`, which in **both** specs is an inertness guarantee about alignment rows — `[SO] R-RES-007` is *"absence of the field leaves every other alignment table untouched"*, and `[PL] R-RES-007` is *"the AI write cannot reach a lever it did not create"*. Two same-numbered requirements that read alike and mean different things is precisely the shape a reader mis-cites.

**Convention — binding on every document in this spec, and on any review or execution log that cites across the pair:**

| Prefix | Means |
| --- | --- |
| `[SO] R-RES-NNN` | a requirement of `docs/specs/results/ai-formalize-strategic-objectives` |
| `[PL] R-RES-NNN`, or a bare `R-RES-NNN` inside this spec | a requirement of **this** spec |

An unprefixed id in a *cross-spec* context is a defect, not a shorthand. Recorded deliberately: this spec's own `/v1` sweep found a stale cross-document citation in the predecessor's surface, and citation drift is a live defect class in this repo, not a hypothetical *(KZ-006)*.

---

## 3. Functional requirements

### R-RES-001 — The field is accepted

- **As a** Result Contributor (PRD §3.1)
- **I want** the AI payload's `primary_levers` to be accepted
- **So that** ids the extractor already resolved are not discarded in transit

**Details:**
- Inputs: `primary_levers?: number[]` on each element of `RootAi.results[]` (`ResultRawAi`). Optional; array of numbers.
- Behavior: accepted on both AI-formalize endpoints. A non-array value, or an array with any non-number element, is rejected by validation with the field named. Absence is valid.
- Outputs: `ServerResponseDto` unchanged in shape.
- Errors: `400` through `GlobalExceptions`, with `primary_levers` named in `errors`.
- Permissions: unchanged from the existing AI-formalize handlers.

**Acceptance criteria:**
- [ ] AC.1 — `primary_levers: [11, 12]` passes validation.
- [ ] AC.2 — `"11,12"` (a comma-separated string) is rejected with `primary_levers` named in `errors`.
- [ ] AC.3 — `[11, "x"]` is rejected with the field named — the **per-element** rule, not merely the array rule.
- [ ] AC.4 — Omitting the field passes, and requires no other new field.
- [ ] AC.5 — `/swagger` shows it as an optional number array under `RootAi.results[]`.

#### Scenario: The field is accepted

- GIVEN an AI-formalize payload whose item carries `primary_levers: [11, 12]`
- WHEN the payload is validated
- THEN validation passes and the ids reach the formalizer
- BUT it must NOT require any other new field to be present
- AND IT MUST reject `"11,12"` and `[11, "x"]` with `primary_levers` named in `errors`

**Out of scope:** `contributor_levers` — the AI payload does not carry it.

---

### R-RES-002 — The portfolio is resolved from the item's own year

- **As a** Center / General Admin running a bulk upload (PRD §3.3)
- **I want** each item's portfolio derived from that item's year
- **So that** a mixed-year batch routes correctly without per-item configuration

**Details:**
- Inputs: the item's effective year — `result.year ?? current calendar year`.
- Behavior: resolution is a pure function of the effective year and the `portfolios` table, via the **already-shipped** `PortfoliosService.findByYear(year)`. No new resolver.
- Outputs: a portfolio, or nothing when no active portfolio covers the year (see R-RES-006).
- Permissions: unchanged.

**Acceptance criteria:**
- [ ] AC.1 — A 2026 item resolves to the portfolio covering 2026; a 2025 item to the one covering 2025.
- [ ] AC.2 — An item with **no** `year` resolves via the current calendar year.
- [ ] AC.3 — Resolution reflects the `portfolios` table, so a data change moves the routing with no code release.

#### Scenario: Two items, two years, two portfolios

- GIVEN a batch whose first item is `year: 2026` and whose second is `year: 2025`
- WHEN the batch is formalized
- THEN each item's levers are validated and written against the portfolio covering that item's own year
- BUT it must NOT reuse the first item's resolved portfolio for the second
- AND IT MUST resolve an item with an absent `year` using the current calendar year

**Out of scope:** any change to `findByYear` or its memoization. Inherited as-is.

---

### R-RES-003 — Portfolio 1 persists the ids as ALIGNMENT levers, explicitly primary

- **As a** Result Contributor
- **I want** a portfolio-1 item's levers stored the way the manual path stores them
- **So that** an AI-created result is indistinguishable from a hand-entered one on this field

**Details:**
- Behavior: for a portfolio-1 item, surviving ids are written to `result_levers` at `lever_role_id = ALIGNMENT (1)` with **`is_primary = true` set explicitly on every row**, audited from the current user, deduplicated.
- Outputs: rows in `result_levers`; a report consumed by R-RES-005 / R-RES-006 reporting.
- Errors: a throw propagates and the item compensates (see R-RES-009).

**Acceptance criteria:**
- [ ] AC.1 — Rows land at `lever_role_id = 1` for the result, one per surviving distinct id.
- [ ] AC.2 — **Every written row has `is_primary = true`, asserted by reading the written value.** A test that asserts only that a row exists for the id does **not** satisfy this AC.
- [ ] AC.3 — Audit columns are populated from the current user.
- [ ] AC.4 — A repeated id produces one row, not two.

#### Scenario: A portfolio-1 item's levers are written as primary

- GIVEN a `year: 2024` item with `primary_levers` whose ids are active portfolio-1 levers
- WHEN the item is formalized
- THEN one `result_levers` row exists per distinct id at `lever_role_id = 1`
- AND each row's `is_primary` is `true`
- BUT it must NOT create any row with `is_primary = false` or `NULL`
- AND IT MUST populate the audit columns from the request's user

> **Why AC.2 is written as a value assertion.** `result_levers.is_primary` is `NOT NULL` with a **database default of `false`**. A write that omits the flag therefore succeeds and produces a **contributor** lever where a primary was intended — with no exception, no unusual row count, and no `missing_fields` entry. Proposal R-1; defect class **DC-1** in §6.

---

### R-RES-004 — Portfolio 2 persists the ids as research areas

- **As a** Result Contributor working in the 2026+ portfolio
- **I want** the ids stored as that portfolio understands them
- **So that** the result aligns to research areas rather than to a vocabulary its portfolio does not use

**Details:**
- Behavior: for a portfolio-2 item, surviving ids are written to `result_levers` at `lever_role_id = RESEARCH_AREAS_ALIGNMENT (3)`, matching what that portfolio's own section save does with its `research_areas` payload. Deduplicated, audited.
- Rationale: the ids the extractor emits for a 2026 item **are** portfolio-2 research areas — `clarisa_levers` ids 10–17, `portfolio_id = 2`. The field name is portfolio-agnostic; each portfolio owns its interpretation.

**Acceptance criteria:**
- [ ] AC.1 — Rows land at `lever_role_id = 3` for the result, one per surviving distinct id.
- [ ] AC.2 — **No** row is written at `lever_role_id = 1` for a portfolio-2 item.
- [ ] AC.3 — Audit columns are populated from the current user.
- [ ] AC.4 — A repeated id produces one row.

#### Scenario: A 2026 item's ids become research areas

- GIVEN a `year: 2026` item with `primary_levers: [11, 12]`, both active portfolio-2 records
- WHEN the item is formalized
- THEN two `result_levers` rows exist for the result at `lever_role_id = 3`
- BUT it must NOT write any row at `lever_role_id = 1` for this item
- AND IT MUST leave every `lever_role_id = 1` row already attached to that result untouched

---

### R-RES-005 — Ids the portfolio does not own are discarded and reported

- **As a** Center / General Admin reviewing a bulk report
- **I want** rejected ids named individually
- **So that** I can tell "these three ids were wrong" from "this field did not apply"

**Details:**
- Behavior: an id survives only if it is **active** and **owned by the resolved portfolio** — the predicate is `id IN (…)` AND `portfolio_id = <resolved>` AND `is_active = true`, which covers all three rejection causes with one query. Non-survivors are discarded and reported one entry per id.
- Outputs: one `primary_levers:<id>` entry appended to that item's `missing_fields` per discarded id, distinguishable from the field-level `primary_levers` entry used by R-RES-006.

**Acceptance criteria:**
- [ ] AC.1 — A mix of valid and invalid ids writes rows only for the valid ones and reports each invalid one.
- [ ] AC.2 — An id belonging to the **other** portfolio is discarded, even when it exists and is active.
- [ ] AC.3 — An inactive id is discarded.
- [ ] AC.4 — When **every** id is discarded, zero rows are written **and no pre-existing row for that result and role is deactivated**.
- [ ] AC.5 — Discard entries are appended to what the AI reported, never replacing `missing_fields`.

#### Scenario: One valid id, two rejects

- GIVEN a `year: 2026` item with `primary_levers: [11, 999, 4]` where 11 is an active portfolio-2 record, 999 does not exist, and 4 is an active **portfolio-1** record
- WHEN the item is formalized
- THEN exactly one row exists, for id 11, at `lever_role_id = 3`
- AND `missing_fields` contains `primary_levers:999` and `primary_levers:4`
- BUT it must NOT write a row for 999 or 4, and must NOT throw
- AND IT MUST leave the entries the AI itself reported in `missing_fields` in place

#### Scenario: Every id is rejected

- GIVEN a portfolio-2 item whose every `primary_levers` id belongs to portfolio 1
- WHEN the item is formalized
- THEN zero `result_levers` rows are written for the item at role 3
- BUT it must NOT deactivate any `lever_role_id = 3` row that already existed for that result
- AND IT MUST report each discarded id

> **AC.4's `BUT` is not defensive boilerplate.** The write primitive reconciles by deactivating every row for `(result_id, role)` **absent from the incoming array**, so handing it an empty survivor list wipes the role. The predecessor spec hit this exact defect during execution; it is why the clause is stated at requirement level rather than left to implementation care.

---

### R-RES-006 — An unresolvable year writes nothing and says so

- **As a** Center / General Admin
- **I want** an item whose year matches no portfolio to be reported, not guessed
- **So that** an out-of-range year never silently attaches data to the wrong portfolio

**Details:**
- Behavior: when no active portfolio covers the effective year, the step performs **no write** and **no orchestrator call**, appends one field-level `primary_levers` entry to `missing_fields`, and logs one warning naming the year. **No fallback portfolio is selected** — not portfolio 1, not the lowest id, not the highest, not any default.
- Outputs: item still created and still counted in `results_created`.

**Acceptance criteria:**
- [ ] AC.1 — A `year: 2035` item is created, with zero lever rows written.
- [ ] AC.2 — `missing_fields` contains the field-level `primary_levers` entry.
- [ ] AC.3 — Exactly one warning is logged, naming the year.
- [ ] AC.4 — No exception is raised and the item is **not** counted in `results_errors`.

#### Scenario: A year outside every portfolio range

- GIVEN an item with `year: 2035`, which no active portfolio covers, carrying `primary_levers: [11]`
- WHEN the item is formalized
- THEN the result is created with no lever rows and the field is reported in `missing_fields`
- BUT it must NOT select any fallback portfolio, and must NOT raise
- AND IT MUST log exactly one warning naming the year 2035

---

### R-RES-007 — The AI write cannot reach a lever it did not create

- **As a** Result Contributor
- **I want** the AI lever write to be incapable of touching alignment data a human entered
- **So that** formalization can never silently destroy someone's own classification work

**Details:**
- Behavior: the AI lever write must not deactivate, delete, or reclassify **any** `result_levers` row it did not itself create in the same call. In particular it must never demote or promote a row's `is_primary`.
- **Satisfied by construction, and that construction must be proven.** `formalizeResult` has no update path: it always calls `createResult` and assigns the returned row to `resultExists` purely as a rollback handle (`results.service.ts:879-901`). The result reaching the alignment step was therefore created milliseconds earlier in the same method, so **no lever row of any kind can pre-exist for it** — no contributor to wipe, no primary to demote, no id to collide with.
- Scope: the requirement binds both portfolios. Portfolio 2 writes at role 3 and additionally cannot reach role-1 rows at all, since reconciliation scopes by `lever_role_id`.

**Acceptance criteria:**
- [ ] AC.1 — The alignment step is reached only for a result created in the same `formalizeResult` call — asserted against the code path, not inferred.
- [ ] AC.2 — **Amended 2026-09-04 (Pivot, T-03).** The write hands the reconciler **exactly** the validated survivor rows and nothing else: the handler never queries `result_levers`, never merges a pre-existing row into the array it persists, and never issues a deactivation of its own. **This is the falsifying test**: it must fail against an implementation that reads existing rows, that widens the persisted array beyond the survivors, or that deactivates anything itself. *(The superseded wording asserted that a pre-existing contributor row stays active after a portfolio-1 write. That is not achievable — `BaseServiceSimple.create` deactivates every `(result_id, role)` row absent from the persisted set, `base-service.ts:174-189` — and it contradicted this requirement's own falsifier. Same-role survival is guaranteed by **unreachability** per DD-6, not by handler code.)*
- [ ] AC.3 — A portfolio-2 write leaves every `lever_role_id = 1` row for that result untouched.
- [ ] AC.4 — Asserting only the presence of the new primary rows does **not** satisfy this requirement. For **portfolio 2**, the untouched `lever_role_id = 1` row must be asserted directly. For **portfolio 1**, the arguments handed to the reconciler must be asserted directly — that the persisted array holds exactly the survivors, and that the handler issued no deactivation of its own.

#### Scenario: The write is inert toward rows it did not create

- GIVEN a result reaching the AI alignment step — which, per DD-6, is always created by the same `formalizeResult` call, so **no `result_levers` row can pre-exist for it**
- WHEN `primary_levers` carrying valid ids is written for that result
- THEN the new primary rows exist at role 1 with `is_primary = true`
- AND the array the handler hands the reconciler contains **exactly** those survivor rows — no row it did not create, and no row it read back
- BUT it must NOT query `result_levers`, merge a pre-existing row into what it persists, or issue any deactivation of its own
- AND IT MUST hold for a portfolio-2 item, whose role-3 write leaves every role-1 row untouched — **and here genuine row survival is directly assertable**, because reconciliation scopes by `lever_role_id`

> **Why this requirement survives even though its hazard is unreachable.** The write primitive reconciles by deactivating every row for `(result_id, lever_role_id)` **absent from the incoming array**, and within role `ALIGNMENT (1)` primary and contributor levers **share the role** — `is_primary` distinguishes them, not the role. A primary-only reconciliation at role 1 would therefore wipe every contributor row for that result. That is the shape of the empty-survivor wipe the predecessor caught during execution.
>
> **Today the AI path cannot trigger it, because the result is always brand new.** The requirement is kept, and stated as an inertness property rather than a preservation duty, for two reasons: the guarantee should not silently depend on an incidental fact about `formalizeResult`, and if that method ever gains an update path the hazard returns with no test standing between it and production.
>
> **Amended 2026-09-04 (Pivot, T-03) — what is provable, and where.** The original AC.2 demanded that a pre-existing contributor row *stay active* after a portfolio-1 write. It cannot: the reconciler deactivates every `(result_id, role)` row absent from the persisted set, and primary and contributor levers share role 1. The clause also contradicted its own falsifier, which required the assertion to go **red** against the very implementation the design mandates. The requirement is therefore restated at the boundary the handler actually controls — *what it hands the reconciler* — which is falsifiable now, while **same-role survival is carried by unreachability (DD-6)** and remains on the risk register as **RK-2 / RB-2** rather than being claimed as tested. Portfolio 2 keeps the stronger, directly assertable guarantee, since role 3 cannot reach role 1. Full analysis and the rejected alternatives: `execution.md` → *Pivot Record: T-03*.
>
> Proposal R-4 (severity revised — see §8); defect class **DC-2** in §6.

---

### R-RES-008 — Absence of the field leaves every other alignment table untouched

- **As a** Result Contributor
- **I want** the new code path inert when the field is absent
- **So that** my AI-created result does not lose its contracts, SDGs, strategic objectives or levers

**Details:**
- Behavior: when `primary_levers` is absent, `null`, or `[]`, the formalizer performs **no** portfolio resolution and **no** alignment call for this field. It must never route through the section-wide alignment save, whose reconciliation deactivates every row for `(result_id, role)` absent from the incoming array — including rows the same method wrote moments earlier.
- This is the spec's highest-severity constraint. It is behavioral, not an implementation note.

**Acceptance criteria:**
- [ ] AC.1 — For a payload without the field, row counts in `result_contracts`, `result_sdgs`, `result_levers`, `result_strategic_objectives` and `result_impact_outcomes` match a run on the pre-change code.
- [ ] AC.2 — `[]` and `null` behave exactly as absent.
- [ ] AC.3 — For the absent / `[]` / `null` cases, the resolver and the orchestrator receive **zero calls** — asserted as zero interactions, not merely zero rows.
- [ ] AC.4 — No code path in the formalizer reaches the section-wide alignment save.

#### Scenario: A payload without the field is byte-identical to today

- GIVEN an item with no `primary_levers` key
- WHEN the item is formalized
- THEN the resulting database state is identical to the state the current code produces for the same payload
- BUT it must NOT deactivate or delete any `result_contracts`, `result_sdgs`, `result_levers`, `result_strategic_objectives` or `result_impact_outcomes` row
- AND IT MUST behave the same for `primary_levers: []` and `primary_levers: null`

---

### R-RES-009 — Each bulk item routes on its own year, with no leakage and clean rollback

- **As a** Center / General Admin uploading a mixed-year file
- **I want** per-item isolation
- **So that** one item's levers never attach to another item's result

**Details:**
- Behavior: portfolio resolution and the write happen per item. No request-scoped portfolio state is read or mutated by this path — the portfolio is passed as an argument. A failure part-way through an item compensates that item and the batch continues.

**Acceptance criteria:**
- [ ] AC.1 — In a three-item mixed-year batch, each item's rows hang off that item's own `result_id`.
- [ ] AC.2 — Reversing item order produces the identical per-item outcome.
- [ ] AC.3 — After an item fails following its lever write, no `result_levers` row survives for that item, and subsequent items resolve on their own years.
- [ ] AC.4 — No item's levers are attached to another item's result id.

#### Scenario: A mixed-year batch, and one item fails mid-way

- GIVEN a batch of a 2024 item, a 2026 item and a 2027 item, each with different `primary_levers` ids
- WHEN the batch is formalized and the 2026 item throws after its lever write
- THEN the 2024 item holds only its own ids at role 1, the 2027 item only its own at role 3
- AND the failed item is reported in `results_errors` while the others are created
- BUT it must NOT leave any `result_levers` row for the failed item
- AND IT MUST resolve every surviving item on its own year rather than on the failed item's

---

### R-RES-010 — Both AI alignment fields on one item do not disturb each other

- **As a** Result Contributor
- **I want** an item carrying `primary_levers` **and** `strategic_objectives` to end with both written
- **So that** the two features compose instead of competing

**Details:**
- Behavior: the two narrow writes are independent. Neither deactivates the other's rows, and the order in which they run does not change the outcome.
- This requirement is **new with this spec** — it cannot exist in the predecessor, which had only one field.

**Acceptance criteria:**
- [ ] AC.1 — A 2026 item with both fields ends with its `result_strategic_objectives` rows **and** its role-3 `result_levers` rows all active.
- [ ] AC.2 — The item's `result_sdgs` and ALIGNMENT `result_contracts` rows are all still active.
- [ ] AC.3 — Reversing the order of the two steps changes nothing observable.
- [ ] AC.4 — When one field is absent and the other present, the present one still writes and the absent one reports nothing.

#### Scenario: One item, both fields

- GIVEN a `year: 2026` item carrying `sdg_targets`, `strategic_objectives: [3]` and `primary_levers: [11, 12]`
- WHEN the item is formalized
- THEN the strategic-objective row, both role-3 lever rows, and every `result_sdgs` row are active
- BUT it must NOT leave any of those rows with `is_active = 0`
- AND IT MUST produce the same state regardless of which of the two alignment steps runs first

---

## 4. Non-functional requirements

### NFR-RES-001 — Portfolio lookups scale with distinct years, not with items

- **Category:** performance
- **Target:** a batch of N items spanning D distinct effective years issues **at most D** portfolio lookups for this field, not N. Inherited from the shipped per-request memoization in `PortfoliosService.findByYear`.
- **How verified:** unit test counting repository calls across a multi-item, few-distinct-year batch.

### NFR-RES-002 — One log line per item per case

- **Category:** observability
- **Target:** each degradation case (unresolvable year, discarded ids) emits exactly **one** `warn` per item, carrying the result id — never one per discarded id.
- **How verified:** unit test asserting call counts and message content on the logger.

### NFR-RES-003 — No versioned path is asserted as callable

- **Category:** dx
- **Target:** every path this spec writes is `/api/results/ai/formalize[/bulk]`. URI versioning is enabled with **no** `defaultVersion` (`main.ts:53-56`) and neither handler declares `@Version(...)`, so a `/api/v1/...` form returns `404`. The PRD's `AC-API-Surface` and the `general-setup` template both still assert `/api/v{n}`; that is known baseline drift flagged in root `CLAUDE.md` §4.1 and is **not** corrected by this spec.
- **How verified:** a **reviewed** `grep -rn "/v1"` over this spec folder and `server/researchindicators/test` — not a zero-hit sweep. Every hit must be a statement that a versioned path is *unreachable*; a hit presenting one as callable is a FAIL. Pattern derived from the claim (`/v1`), not from the citation that surfaced it (`api/v1`) *(KZ-006)*.

---

## 5. Data requirements

No schema change. No migration. No seed change.

| Table | Access | Notes |
| --- | --- | --- |
| `result_levers` | **write** | `result_id`, `lever_id`, `lever_role_id`, `is_primary` are all `NOT NULL`. `is_primary` defaults to `false` — see DC-1. `custom_lever_name` is nullable and **not written by this path** |
| `clarisa_levers` | read | Validation source. Has `portfolio_id` (nullable FK) and inherits `is_active` from `AuditableEntity`, so the three-part predicate in R-RES-005 is expressible |
| `portfolios` | read | Via the shipped `findByYear`. Owner-confirmed 2026-09-02: P1 = 2010–2025, P2 = 2026–2030 |
| `bulk_upload_results` | write | `missing_fields` only, as the reporting channel. Existing column, existing shape |
| `result_lever_strategic_outcomes`, `result_lever_sdg_targets` | **neither read nor written** | Nested children of a lever that a plain id array cannot express — see Q-1 |

**Reference data:** `clarisa_levers` ids 10–17 carry `portfolio_id = 2` (migration `1782402733402-InsertNewResearchAreas`); legacy ids were set to `portfolio_id = 1` by `1782337004400-AddedPortfolioIdClarisaLevers`. The design is written against *"the portfolio owns the id"*, **never** against a hardcoded id range, so a reference-data change moves the routing without a code release (R-RES-002 AC.3).

---

## 6. Defect classes this spec can produce, and the gate for each

Named before the verification commands were chosen, because a gate that passes while the artifact is wrong is the expensive failure — it burns rework attempts on a loop that cannot see the defect.

| # | Defect class | Why an ordinary gate misses it | Gate that actually catches it |
| --- | --- | --- | --- |
| **DC-1** | **A lever written as contributor instead of primary.** `is_primary` is `NOT NULL` default `false`, so omitting it writes a valid row with wrong meaning | No exception, no unusual row count, no `missing_fields` entry. A test asserting "a row exists for lever 11" passes | **A value assertion on the written `is_primary`** (R-RES-003 AC.2). Presence-of-row assertions are explicitly disqualified |
| **DC-2** | **Contributor levers wiped by a primary-only write.** Reconciliation scopes by role, and role 1 holds both kinds | The new rows are all present and correct; only the *absent* pre-existing rows reveal it, and nothing counts them. **Unreachable today** — `formalizeResult` always creates a fresh result — so it is invisible to any test that goes through the real code path | **An argument-level assertion on what the handler hands the reconciler** (R-RES-007 AC.2, amended 2026-09-04): exactly the survivors, no read-back, no self-issued deactivation. A *survival* assertion was tried first and is not achievable at role 1 — the reconciler deactivates same-role rows absent from the persisted set — so the residual exposure is carried by DD-6's unreachability and by **RK-2**, not by a test. Portfolio 2 is directly assertable. Row counts of the new write cannot see any of this |
| **DC-3** | **A wrong-portfolio id written** because validation filtered on id + active but not on ownership | The id exists and is active, so any two-part predicate accepts it | A fixture with an id that is **valid in the other portfolio** (R-RES-005 AC.2) |
| **DC-4** | **The section-wide save reached**, wiping SDGs and contracts the same method just wrote | The item still succeeds; the loss is in rows nobody asserted | Assert **sibling** row survival, not just absence of the new row (R-RES-008, R-RES-010 AC.2) |
| **DC-5** | **Batch-wide portfolio resolution** passing as per-item, because every fixture item shares a year | With identical fixtures a constant and a correct implementation are indistinguishable | A mixed-year fixture varying year **and** ids **and** title, asserted per `result_id` *(KZ-004)*. Plus a falsifier: the suite must go red when the portfolio is resolved once for the batch |
| **DC-6** | **A green targeted suite standing in for the blast radius.** Both handlers, the registry and the orchestrator are shared with `PATCH`/`GET .../alignments` | A targeted run confirms the brief was followed, not that the shared chain is clean | Full-package `npm test -- --silent` with a coverage figure *(KZ-003)* |
| **DC-7** | **Path drift** — a versioned path asserted as callable | A zero-hit grep passes only if scoped to miss it | The **reviewed** sweep in NFR-RES-003 |
| **DC-8** | **A cross-spec citation that has gone stale**, or an unprefixed `R-RES-NNN` read against the wrong spec | Nothing executable reads a doc citation | The §2 convention, plus the two-direction Correction Closure sweep when amending `[SO] R-RES-007` |

**Classes with no automated gate — recorded as accepted risk, substituted by a human check:**

| # | Class | Substitute |
| --- | --- | --- |
| **DC-9** | **Dev reference data not matching the migration's intent** — e.g. lever 11 not actually `portfolio_id = 2` in Dev | Owner-run read-only query. Gates the *verdict*, not the build: the design never hardcodes an id range. Open question Q-3 |
| **DC-10** | **The real extractor payload differing from the assumed shape** — names instead of ids, or a different field name | Owner-run real-payload upload against Dev, **before** any validation verdict *(KZ-007)*. A hand-written payload cannot falsify an assumption it was written from. Open question Q-4 |

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| STAR client | **None.** It reads alignment through `GET /api/results/:result-code/alignments`, whose contract does not change |
| `PATCH .../alignments` | **None.** Request-based portfolio resolution and the section-wide save are untouched |
| OpenSearch | None. No `@OpenSearchProperty` column added |
| Socket / broker / Agresso / CLARISA sync | None |
| **`docs/specs/results/ai-formalize-strategic-objectives`** | **`[SO] R-RES-007` must be amended — a required, non-silent edit** |

### The `[SO] R-RES-007` amendment

That requirement's scenario clause and its **AC.1** both name `result_levers`:

> BUT it must NOT deactivate or delete any `result_contracts`, `result_sdgs`, **`result_levers`** or `result_impact_outcomes` row
>
> AC.1 — For a payload without the field, row counts in `result_contracts`, `result_sdgs`, **`result_levers`** match a run on the pre-change code.

`AC.1` is currently **ticked as proven** by that spec's T-06, and it stops being true the moment this spec writes lever rows.

**Required amendment:** restate the guarantee as *the absence of **both** AI alignment fields leaves every other alignment table untouched, and neither new write disturbs the other* — which is what this spec's R-RES-008 and R-RES-010 now carry jointly. **`[SO] R-RES-007` AC.4 survives unchanged and becomes more important, not less**: there will be two narrow writes, and both must avoid the section-wide save.

The amendment must run the **two-direction Correction Closure sweep** — forward for `result_levers` across that spec's folder, backward for documents citing that section — and `/akili-validate` on the predecessor must not read its green T-06 as still covering `result_levers`.

---

## 8. Assumptions, dependencies, risks

### Assumptions — both pending owner confirmation, and both load-bearing

| # | Assumption | If wrong |
| --- | --- | --- |
| **A-1** | **AI-created levers carry no nested `result_lever_strategic_outcomes` or `result_lever_sdg_targets`** — a plain id array cannot express them, so this path writes bare lever rows | AI-created levers are structurally poorer than `PATCH`-created ones. May need a marker, or the field may need a richer shape. **Q-1** |
| ~~A-2~~ | ~~Pre-existing contributor levers are preserved by a primary-only AI write~~ — **retired 2026-09-04 by implementation discovery.** `formalizeResult` has no update path, so no lever row can pre-exist for a result reaching the alignment step. R-RES-007 was rewritten as an inertness property satisfied by construction; the assumption it rested on no longer exists | n/a |
| **A-3** | The extractor sends numeric ids, not names | Confirmed for `strategic_objectives` by the owner's payload; assumed to hold for `primary_levers`, which the same payload shows as `[11, 12]`. Fully closed only by Q-4 |
| **A-4** | `year` arriving as a string (`"2026"`) is acceptable | Observed in the owner's payload. `ResultRawAi.year` is declared `number` but validated `@IsOptional() @IsString()` — pre-existing drift. MySQL coerces identically for both the `findByYear` predicate and `report_year_id`, so this path is unaffected |

### Dependencies

| # | Dependency | State |
| --- | --- | --- |
| D-1 | `PortfoliosService.findByYear` | **Shipped.** No work needed |
| D-2 | An id-filtered, portfolio-scoped, active-only finder on `ClarisaLeversService` | **Missing.** It has `findAllWithPortfolio(portfolioId?)` — portfolio-scoped, **no id filter** — exactly the gap `StrategicObjectivesService` had. Expect to add one, authorized in the task rather than discovered mid-implementation |
| D-3 | Migration `1783029013035` applied wherever this deploys | **Open, owner-owned.** Same compensating-delete dependency as the predecessor's RK-6. Without it the rollback in R-RES-009 AC.3 hits FK 1451 from inside the `catch` and aborts the whole batch |
| D-4 | The predecessor's T-07 manual checks | Open, owner-owned. Does not block this spec's build |

### Risks

| # | Risk | Severity | Handling |
| --- | --- | --- | --- |
| RK-1 | DC-1 — the `is_primary` default | **High** | R-RES-003 AC.2 as a value assertion |
| RK-2 | DC-2 — contributor wipe | **Low** *(revised down 2026-09-04 from High)* — unreachable via the AI path, since the result is always newly created. It stays on the register because the guarantee would silently depend on that incidental fact | R-RES-007 AC.2 (amended 2026-09-04) proves the **handler's** inertness — exactly the survivors handed over, no read-back, no self-issued deactivation. It deliberately does **not** claim same-role row survival, which the reconciler makes unachievable; that half rests on DD-6's unreachability and is why this risk stays open |
| RK-3 | `lever_id` is a `bigint` column typed as `string`, and shipped code casts with `parseInt(x) as unknown as string` | Medium | An explicit design decision in `design.md` — replicate for consistency or clean locally. Not to be improvised |
| RK-4 | `payload?.research_areas?.map(...)` is unguarded in the portfolio-2 handler — the same class the predecessor's `[SO] R-RES-010` hardened for two sibling arrays, which left this one out | Low; **pre-existing, not caused here** | **Resolved 2026-09-04 (second Pivot, T-03):** DD-10 aligned the expression with its siblings for **type honesty**, and execution proved that neither DD-10 nor the sibling guards change behaviour — `formatDataToArray` maps `undefined` and `[]` alike to `[]`. The underlying wipe is real, pre-existing, lives in `PATCH .../alignments`, and is recorded as **RB-8** and routed to its own proposal. Remarked, as this row required |
| RK-5 | Amending a spec with a closed audit trail | Medium | §7, with the two-direction sweep |
| RK-6 | Two live sibling specs with colliding requirement ids | Medium | The §2 citation convention |

---

## 9. Open questions

| # | Question | Blocking? | Owner |
| --- | --- | --- | --- |
| **Q-1** | Should AI-created levers be written with **no** nested strategic outcomes and no lever SDG targets (A-1)? Or does the AI path need to leave a marker that these are incomplete? | **Blocks design sign-off.** R-RES-003/004 are written on A-1 | D. Casañas |
| ~~Q-2~~ | ~~For a portfolio-1 item, may a primary-only AI write coexist with contributor levers a human added earlier?~~ | **CLOSED — moot, 2026-09-04.** The situation cannot arise: `formalizeResult` always creates the result it formalizes, so there are never earlier contributor levers to coexist with. Closed by code evidence (`results.service.ts:879-901`), not by a decision | — |
| **Q-3** | In **Dev**, are lever ids 11/12 actually `portfolio_id = 2`, and are legacy levers still all `portfolio_id = 1`? | No — gates the verdict, not the build (DC-9) | D. Casañas |
| **Q-4** | Is the example payload **captured from the real extractor** or hand-written? | No — but it decides whether A-3 is evidence or assumption, for **both** specs (DC-10) | D. Casañas |
| **Q-5** | The payload carries `metadata.manually_edited: true`, which **neither spec has considered.** Should a manually-edited item route or report differently? | No — recorded so it is not discovered later as a surprise | D. Casañas |

---

## 10. Sign-off

| Role | Name | Status | Date |
| --- | --- | --- | --- |
| Spec owner | D. Casañas | pending | — |
| Requirements approved | 2026-09-04 | **Approved.** Q-1 closed by owner decision on 2026-09-04 — assumption **A-1 accepted** (AI-created levers carry no nested strategic outcomes or lever SDG targets; bare rows, no marker). Q-2 closed as moot on 2026-09-04. **R-RES-007 AC.2 amended 2026-09-04** by owner-approved Pivot (option A) during T-03 execution — see `execution.md` → *Pivot Record: T-03* | D. Casañas |

**Requirement ID index**

| ID | Title | Depends on an open question? |
| --- | --- | --- |
| R-RES-001 | The field is accepted | — |
| R-RES-002 | Portfolio resolved from the item's own year | — |
| R-RES-003 | Portfolio 1 persists as ALIGNMENT levers, explicitly primary | **Q-1** (A-1) |
| R-RES-004 | Portfolio 2 persists as research areas | **Q-1** (A-1) |
| R-RES-005 | Unowned ids discarded and reported | — |
| R-RES-006 | Unresolvable year writes nothing and says so | — |
| R-RES-007 | The AI write cannot reach a lever it did not create | — *(was Q-2-dependent; Q-2 closed as moot)* |
| R-RES-008 | Absence leaves every other alignment table untouched | — |
| R-RES-009 | Per-item routing, no leakage, clean rollback | — |
| R-RES-010 | Both AI alignment fields compose | — |
| NFR-RES-001 | Lookups scale with distinct years | — |
| NFR-RES-002 | One log line per item per case | — |
| NFR-RES-003 | No versioned path asserted as callable | — |
