# Requirements — bilateral / clarisa-fixture-stub

- **Module:** clarisa (served from `bilateral/` because it exists for the bilateral mapping work)
- **Spec id:** 2026-08-clarisa-fixture-stub
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked PRD section:** `docs/prd.md` — bilateral project↔contract mapping
- **Linked tickets:** AC-1676
- **Last updated:** 2026-08-18
- **Extends:** `docs/specs/bilateral/clarisa-fixture-stub/proposal.md`
- **Unblocks:** `docs/specs/bilateral/clarisa-automapper-s2` (development only, not shipping)
- **Depth:** Standard

---

## 1. Context

CLARISA's `/api/projects` does not yet carry the data the bilateral mapping work needs: `external_code` is `null` in **299/299** projects on the test host, and only **25** projects pass the shipped eligibility predicates. A PRMS export dated 2026-08-18 carries the same projects with **198 rows, 170 eligible, and 198/198 populated unique codes**.

This spec converts that export **once** into CLARISA's own response shape, serves it from two routes on our own server behind an env flag, and points `ARI_CLARISA_HOST` at it. The CLARISA consumption path — `ClarisaProjectsService`, `project-selector.util.ts`, `MappingPhaseResolver`, the controller and its DTOs — **does not change**. Only the URL differs, and that is already environment-configurable.

**Explicitly NOT changing:** `ClarisaProjectsService` and its predicates; the phases resolver; the picker UI; the client's error handling; CLARISA's own database.

---

## 2. Measurement provenance (K-013, KZ-008)

Every number in this spec was produced by a command, not inferred. **Each row names what was executed.** All measurements are dated **2026-08-18** and carry an invalidating condition.

| # | Claim | What was executed | Result |
|---|---|---|---|
| M-1 | Export has 198 data rows × 56 columns | `exceljs` read of `prms-projects-20260818.xlsx`, sheet `Projects` | 198 rows, 56 headers |
| M-2 | 170 rows are eligible | The shipped predicates from `project-selector.util.ts` (`isBilateralFunding` ∧ `isAllianceProject`) re-implemented verbatim over the export | **170** |
| M-3 | Codes are populated and unique | count + `Set` over the `Code` column | **198/198 populated, 198 unique** |
| M-4 | Code prefixes are exactly `{B-, C-}` | 2-char prefix histogram | `B-`: 53, `C-`: 145, **0** outside the set |
| M-5 | The prefix encodes the **center**, not project identity | prefix vs `Center Acronym` cross-check | **0 mismatches** — `B-`⟺BIOVERSITY (53), `C-`⟺CIAT (145) |
| M-6 | CLARISA returns exactly 32 project fields | key-union over a live `GET /api/projects` capture (`clarisatest-back`, 299 projects, 1.15 MB) | **32 keys**, all present in 299/299 |
| M-7 | Production/test carry no `external_code` | populated-count over the same capture | **0/299** |
| M-8 | Real `phase` is a **number** | value histogram over the capture | `{2025: 299}` |
| M-9 | Real `source_center_acronym` is **null everywhere** | value histogram over the capture | `{null: 299}` |
| M-10 | Live eligible cohort is 25, **all via the lead-institution branch** | shipped predicates over the capture at phase 2025 | 25 eligible, **25/25** via `lead_institution_object.acronym` = `"ABC - Bioversity (Alliance)"` |
| M-11 | `cgiar_entity_type_object.code` is **not** 22 for every program | entity-code histogram over 493 real mappings | `{22: 339, 23: 66, 24: 88}` |
| M-12 | Program→entity-code is deterministic and unambiguous | per-`smo_code` entity-code and id sets over 493 mappings | **0 ambiguous**; SP01–SP08 = 22, SP09 = 23, SP10–SP13 = 24 |
| M-13 | The export uses only programs the real feed defines | export program codes minus real-feed dictionary keys | **0 unknown** (13 of 13 covered: SP01–SP13) |
| M-14 | Real mapping status is uniformly `Confirmed` | status histogram over 493 real mappings | `{"Confirmed": 493}` |
| M-15 | Real HML vocabulary is lowercase words; the export uses letters | value histograms on both sides | real `{high, medium, low}` · export `{H, M, L}` |
| M-16 | `ResponseInterceptor` silently destroys both stub payloads | executed the interceptor against a raw array and a token object (`npx jest`) | both became `{"data":[],"status":200,"description":"Unknown message"}` |
| M-17 | Prefix-stripped codes are AGRESSO agreement ids | `SELECT COUNT(DISTINCT agreement_id) … WHERE agreement_id IN (170 stripped codes)` against Dev `agresso_contracts` (3,347 rows) | **170/170 stripped match · 0/170 unstripped match** |
| M-18 | The CLARISA picker is **not** capped at 50 | read `loadClarisaProjectOptions` / `loadAgressoOptions` | AGRESSO passes `limit = 50`; **CLARISA passes no limit** |
| M-19 | A bootstrap `app.use(prefix, …)` runs **before** Nest's `MiddlewareConsumer` middleware, is **not** matched by a sibling prefix, and leaves other routes alone | booted a minimal Nest app with a JWT-like `forRoutes('*')` middleware plus a bootstrap-registered mount, then issued three unauthenticated requests (`ts-node`) | stub: **200 + raw array**, Nest middleware never ran · `/api/clarisa-stubx`: **not** matched (fell through to 401) · `/api/ping`: Nest middleware ran normally |

**Invalidating condition for all of the above:** the export is a point-in-time snapshot; PRMS moves on, and CLARISA's test host is periodically reset. Any row re-measured after **2026-08-18** may differ. `M-6`…`M-15` must be re-measured against a fresh capture before the fixture is regenerated from a newer export.

---

## 3. Resolved open questions

### OQ-1 — RESOLVED: `Code` is the join key S2 needs

The proposal flagged this as *"OQ-1 should be answered before design approval — it decides whether S2 can rely on this data at all."*

**Answer: yes, at 100% coverage.** Stripping the `{B-, C-}` prefix — exactly the operation `clarisa-automapper-s2` §81 specifies — turns all 170 eligible codes into `agresso_contracts.agreement_id` values that exist in the Dev database (**M-17**). Keeping the prefix matches **zero**, which independently confirms the strip rule.

**Two honest qualifications, both material:**

1. The `{B-, C-}` prefix set is **fully explained by the two Alliance centers** (M-5), not by project identity. The proposal treated the prefix match as evidence that `Code` is CLARISA's `external_code`; it is weaker evidence than it reads, because any center-scoped PRMS code would produce the same two prefixes. **What carries the claim is M-17, not M-4.**
2. M-17 proves `Code` is *the AGRESSO join key*. It does **not** prove CLARISA will publish that same value under the field name `external_code`. That remains CLARISA's naming decision. The consequence is bounded: S2's matcher can be built and measured now, and if CLARISA later publishes a different value in `external_code`, S2 re-measures — it does not rebuild.

### OQ-2 — RESOLVED: `api/projects` only

`ClarisaProjectsService` is the only consumer reached through `ARI_CLARISA_HOST` for this work, and it calls exactly one path. Other CLARISA control lists are served from the local database by their own synced modules and are unaffected. **Out of scope** (R-CFS-007).

### OQ-3 — UNRESOLVED, escalated, and blocking for dev only

*"Who sets `ARI_CLARISA_STUB_ENABLED` on dev, and who owns turning it off?"* has **no owner**. Per **K-015**, an unowned removal condition is exactly the pattern that leaves a merged artifact live indefinitely. This spec records the removal condition (R-CFS-008) but **cannot assign it**. Local development proceeds without an answer; **switching dev on requires one.**

---

## 4. Glossary

| Term | Meaning |
|---|---|
| **The export** | `prms-projects-20260818.xlsx`, sheet `Projects`, 198 rows × 56 columns. Stays **out** of the repository |
| **The fixture** | A committed JSON file holding all 198 export rows rendered in CLARISA's 32-field response shape |
| **The converter** | A committed, re-runnable script that produces the fixture from the export + the dictionary |
| **The dictionary** | The 13 real `global_unit_object` values (SP01–SP13) harvested verbatim from a live CLARISA capture, keyed by `smo_code` |
| **The reference capture** | A committed, trimmed real `GET /api/projects` response used as the fidelity baseline |
| **The stub** | Two env-gated routes on our own server that serve the fixture in CLARISA's wire shape |
| **Eligible** | Passes `isBilateralFunding` ∧ `isAllianceProject` ∧ `matchesPhase` — the shipped predicates, unmodified |

---

## 5. System context & scope

| In scope | Out of scope |
|---|---|
| The converter (export → fixture), deterministic and re-runnable | Any edit to `ClarisaProjectsService`, `project-selector.util.ts`, or `MappingPhaseResolver` |
| The dictionary + the reference capture, both committed | Implementing S2's matcher |
| The fixture, committed with inline provenance | Loading data into CLARISA's own database |
| Two stub routes: `POST auth/login`, `GET api/projects`, 404 unless enabled | Any UI change |
| **Serving the stub outside the Nest request pipeline**, so the global `ResponseInterceptor` is never reached | The client's error-swallow behaviour |
| ~~One JWT `exclude` entry~~ — **not needed** (M-19); `app.module.ts` stays untouched | Automating the stub's lifecycle |
| A fidelity check that names what the export cannot supply | Fixing CLARISA's endpoints |
| `.env.example` documentation + a recorded removal condition | Serving CLARISA control lists other than `api/projects` |

---

## 6. Stakeholders

| Persona | Interest |
|---|---|
| Center admin (bilateral mapping) | Exercises the picker at ~170 options instead of 25 |
| ARI developer | Develops and measures S2's matcher against real AGRESSO contracts |
| Security reviewer | Must approve an **unauthenticated route served outside the Nest pipeline** (R-CFS-006) |
| DevOps / Product | Owns `ARI_CLARISA_STUB_ENABLED` on dev and the removal (OQ-3) |

---

## 7. Functional requirements

### R-CFS-001 — The fixture reproduces CLARISA's response shape exactly

- **As an** ARI developer
- **I want** the fixture to carry exactly the fields CLARISA returns, with their real types and nesting
- **So that** the consumption path exercises real structure instead of a convenient fiction (**KZ-001**)

**Details**
- The fixture is a JSON array of **198** objects — the whole export, not the eligible subset, so the shipped filters are genuinely exercised (28 `window3` rows MUST be excluded by the service, not pre-excluded by the fixture).
- Each object carries **exactly the 32 keys** enumerated in M-6 — no more, no fewer.
- `phase` is the **number** `2026` (M-8 — a string would be a type drift the consumer tolerates but the reference does not).
- Fields the export cannot supply take the value CLARISA itself returns for them: `null` for the seven `source_*` fields, `external_project_id`, `external_record_id`, `external_source`, `last_synced_at`; `[]` for `project_countries_array` (observed empty in 67/299 real projects).
- `source_center_acronym` **is** populated from the export's `Center Acronym`, even though CLARISA returns `null` today (M-9). See R-CFS-005 — this is a deliberate, recorded behavioural difference.

**Acceptance criteria**
- [ ] AC.1 — The fixture parses as an array of length **198**.
- [ ] AC.2 — The set of keys on every fixture element equals the 32-key set of the reference capture, asserted as set equality in both directions.
- [ ] AC.3 — `typeof element.phase === 'number'` and the value is `2026` for all 198.
- [ ] AC.4 — `external_code` is populated, non-blank and unique across all 198.

#### Scenario: The fixture is shape-identical to a real response

- GIVEN the committed reference capture of a real `GET /api/projects`
- WHEN the fixture's key set is compared to the reference's key set
- THEN the two sets are equal
- BUT it must NOT contain any field CLARISA does not return — including `Principal Investigator Name` / `Email`, which have no CLARISA counterpart and MUST be absent from the fixture and from git history
- AND IT MUST fail the check if a single key is added or dropped on either side

---

### R-CFS-002 — Nested program mappings are built from real CLARISA objects, never synthesized

- **As an** ARI developer
- **I want** each `project_mappings_array[].global_unit_object` to be a verbatim real CLARISA object
- **So that** `hasSciencePrograms` evaluates the same nesting and the same entity codes it evaluates in production

**Details**

This is the requirement the whole fidelity argument rests on. `hasSciencePrograms` reads `project_mappings_array[].status === 'Confirmed' && …global_unit_object.cgiar_entity_type_object.code === 22`. The export supplies only a program **code** (`SP13`), an allocation, and two HML letters — none of the nesting.

- The dictionary supplies each `global_unit_object` **verbatim** from the reference capture, keyed by `smo_code`. All 13 codes the export uses are covered (M-13); the converter MUST fail loudly on an unknown code rather than invent one.
- `cgiar_entity_type_object.code` therefore comes from real data: **22 for SP01–SP08, 23 for SP09, 24 for SP10–SP13** (M-12). It is **not** uniformly 22 (M-11).
- `program_id` equals the dictionary entry's `id`; `project_id` equals the parent project's `id` — matching the real feed's own invariant.
- `status` is `'Confirmed'`, which is what CLARISA returns for **493/493** real mappings (M-14).
- `complementarity` / `efficiencies` are translated from the export's `H|M|L` to CLARISA's `high|medium|low` (M-15).
- `allocation` is a **number** (M-15), not a string.
- Mapping-level keys are exactly the 11 the real feed returns, including `source_program_code` and `source_program_name` (`null`).

**Acceptance criteria**
- [ ] AC.1 — Every `global_unit_object` in the fixture is byte-equal to a dictionary entry.
- [ ] AC.2 — Across the fixture, the `cgiar_entity_type_object.code` histogram contains **all three** of 22, 23 and 24 — never 22 alone.
- [ ] AC.3 — `has_science_programs` is `true` for exactly **140** of the 170 eligible projects (and `false` for 30).
- [ ] AC.4 — `complementarity` and `efficiencies` values are drawn only from `{high, medium, low}`; no `H`, `M` or `L` appears anywhere in the fixture's mappings.
- [ ] AC.5 — `allocation` is `typeof 'number'` for all 283 mappings, and per-project allocations sum to 100.

#### Scenario: A naive converter is caught by the count

- GIVEN a converter that hardcodes `cgiar_entity_type_object.code = 22` for every program — the reading the proposal's §10 invites
- WHEN the eligible cohort's `has_science_programs` count is measured
- THEN the check reports **170** instead of **140** and FAILS
- AND IT MUST fail on this exact input — this is the named falsifier for R-CFS-002, and the gate is worthless if it passes here
- BUT it must NOT be satisfied by asserting only that the field is *present*; presence proves nothing, the **count** is the behavioural proof

#### Scenario: An unknown program code stops the converter

- GIVEN a future export containing a program code absent from the dictionary (e.g. `SP14`)
- WHEN the converter runs
- THEN it exits non-zero naming the unknown code
- BUT it must NOT emit a fixture with a fabricated `global_unit_object`
- AND IT MUST NOT silently drop the mapping

---

### R-CFS-003 — The stub serves CLARISA's raw wire shape, not the ARI envelope

- **As** the CLARISA connection inside our own server
- **I want** the stub's responses to be byte-shaped exactly like CLARISA's
- **So that** `Clarisa.get()` and `getToken()` behave identically against the stub and the real host

**Details**

The proposal did not account for this and the stub as proposed **cannot work**. Every HTTP response passes through the global `ResponseInterceptor` (`APP_INTERCEPTOR` in `app.module.ts`), which recognises only `ServiceResponseDto` and `StreamableFile`. A raw array and a raw token object match neither, so both are replaced by the interceptor's default (**M-16**, executed):

```
[{...198 projects...}]   →   {"data":[],"status":200,"description":"Unknown message",…}
{"access_token":"stub"}  →   {"data":[],"status":200,"description":"Unknown message",…}
```

The failure is **silent and misdirecting**: HTTP 200, no error, an empty `data`. `ClarisaProjectsService` then calls `.filter` on an object, throws, is caught by `getCachedAll`, and surfaces as `503 CLARISA /api/projects temporarily unreachable` plus the existing *"Zero eligible bilateral projects"* warning — pointing the developer at CLARISA, which is not where the fault is.

- `GET api/projects` MUST return a **bare JSON array** as the response body root.
- `POST auth/login` MUST return a bare `{ "access_token": "<string>" }`, ignoring credentials.
- The stub MUST be served **ahead of the Nest pipeline** so the interceptor is never reached (M-19). Every other route keeps the `ServerResponseDto` envelope, and `ResponseInterceptor` itself is **not modified**.

**Acceptance criteria**
- [ ] AC.1 — `curl … /api/clarisa-stub/api/projects | jq 'type'` returns `"array"` and `length` returns `198`.
- [ ] AC.2 — The response body has **no** `status`, `description`, `errors`, `timestamp` or `path` key at its root.
- [ ] AC.3 — `POST …/auth/login` returns a body whose root has exactly the key `access_token`, with a non-empty string value.
- [ ] AC.4 — An unrelated endpoint (e.g. `GET /api/clarisa/projects/bilateral`) still returns the full `ServerResponseDto` envelope.

#### Scenario: The envelope leak is caught at the wire, not by trust

- GIVEN the stub is enabled and the bypass has been removed or mis-scoped
- WHEN the stub's `api/projects` route is called
- THEN the shape assertion FAILS because the root is an object, not an array
- AND IT MUST fail even though the HTTP status is **200** — status is not evidence here, shape is
- BUT it must NOT be verified by reading the controller's return type; the interceptor runs *after* the controller, so only an over-the-wire assertion can see the defect

#### Scenario: The end-to-end path resolves the fixture

- GIVEN `ARI_CLARISA_HOST` points at the stub (with its **trailing slash**) and the stub is enabled
- WHEN `GET /api/clarisa/projects/bilateral` is called by an authorized center admin
- THEN the envelope's `data` holds **170** projects
- AND the phases endpoint reports exactly one phase, `{ phase: 2026, count: 170 }`
- BUT it must NOT require any change to `ClarisaProjectsService`, its predicates, or the resolver — `git diff` MUST show those files untouched

---

### R-CFS-004 — The stub is absent unless explicitly enabled

- **As a** security reviewer
- **I want** the stub to be indistinguishable from not existing when its flag is unset
- **So that** production carries no reachable substitute data source

**Details**
- Both routes return **404** when `ARI_CLARISA_STUB_ENABLED` is not set to an explicit truthy value.
- Default-off: an unset, blank, or unrecognised value means **disabled**. There is no "enabled by absence" path.
- The fixture MUST NOT be loaded into memory when the flag is off.

**Acceptance criteria**
- [ ] AC.1 — With the flag unset, both routes return 404.
- [ ] AC.2 — With the flag set to a truthy value, both routes return 200.
- [ ] AC.3 — With the flag set to an unrecognised value (e.g. `maybe`), both routes return 404.
- [ ] AC.4 — With the flag unset, the app boots without reading the fixture from disk.

#### Scenario: Production is unaffected by the merged code

- GIVEN a deployment where `ARI_CLARISA_STUB_ENABLED` is unset
- WHEN either stub route is requested
- THEN the response is 404
- BUT it must NOT be a 401, 403, or 500 — those disclose that a handler exists
- AND IT MUST behave this way for **both** routes, not only `api/projects`

---

### R-CFS-005 — The fidelity check names what the export cannot supply

- **As an** ARI developer
- **I want** the divergences between fixture and reality enumerated in a committed, executable check
- **So that** an acknowledged blind spot never becomes a silent one (**KZ-001**)

**Details**

The check is a **deliverable, not a nicety**. It compares the generated fixture against the committed reference capture and asserts the known-divergence list is exactly as recorded — so a *new* divergence fails, and a *recorded* one does not.

Divergences that MUST be enumerated, each already measured:

| # | Divergence | Consequence |
|---|---|---|
| D-1 | `source_center_acronym` is populated in the fixture, `null` in CLARISA (M-9) | The fixture exercises **branch 1** of `isAllianceProject`; production today exercises **branch 2** for all 25 eligible (M-10). The `ABC`-prefix fallback is **not covered** by the stub |
| D-2 | The export has no phase column; all 198 get `2026` | `getEligiblePhases()` returns a **single** option. The phase selector's multi-option behaviour is **not covered** |
| D-3 | The export has two funding spellings (`bilateral`, `window3`); CLARISA has **eleven**, including `BILATERAL - RESTRICTED`, `W3`, `SRV`, `''` | The messy-spelling tolerance in `isBilateralFunding` is **not exercised** at stub volume |
| D-4 | All mappings are `Confirmed` | The non-`Confirmed` branch of `hasSciencePrograms` is **not covered** (faithful to M-14, but still a gap) |
| D-5 | `interim_director_review`, `project_results` have no export counterpart | Present as `null`; any consumer of them sees nothing |
| D-6 | `lead_institution_object` / `funder_institution_object` are `null` | The export carries names but no institution ids; synthesizing them would invent CLARISA identifiers |
| D-7 | PI name/email are dropped | Intentional (no CLARISA counterpart), with the welcome side effect of keeping contact details out of git |
| **D-8** | **`organization_code` / `funder_code` are `null`** — the export carries no institution ids, and synthesizing them would invent CLARISA identifiers (DD-2). Measured: `organization_code` is `null` in **198/198** fixture projects and populated in **5/5** reference projects (45, 45, 45, 49, 5); `funder_code` is `null` in 198/198 fixture and **4/5** reference | Present as `null`; any consumer of them sees nothing. Same rationale as D-6 and same consequence wording as D-5 |

> **D-8 was added on 2026-08-19, during execution, after T-04's Reviewer ruled its absence a FAIL.**
> The converter's behaviour is **correct and unchanged** — nulling these fields is right, because
> populating them would fabricate CLARISA identifiers. Only the *record* was missing. The row was
> owed from the start: three authors independently filed these two fields under D-6's rationale
> (T-02's Reviewer, T-04's Implementer, and `convert-export.ts`'s own header, which cites DD-2/D-6 by
> name) and none of them wrote the row. See `execution.md` → T-04 attempt 1.
>
> **Why the `annual` precedent did not extend to them.** Design §5.2 step 3 is one sentence with two
> halves — *"Map the fields the export supplies; set **the rest** to the value CLARISA returns."*
> `annual` was ruled immaterial because it sits in the **first** half (the export supplies it).
> `organization_code` sits in the **second**. And D-5 is the standing proof that a nulled field with
> no consumer still earns a row: `interim_director_review` and `project_results` are not even in the
> shipped `ClarisaProject` DTO, so they have strictly *fewer* consumers than these two, which are
> declared at `clarisa-project.types.ts:74-75`.

**Acceptance criteria**
- [ ] AC.1 — The check runs in CI (`npm test`) and fails on any key-set or type mismatch against the reference capture.
- [ ] AC.2 — The **eight** divergences above are asserted as the **complete** expected set; a **ninth** divergence fails the check.
- [ ] AC.2b — D-8's assertion covers the **fixture side for both fields** (`organization_code` and `funder_code` are `null` in all 198) but the **reference side for `organization_code` only** (populated in 5/5). `funder_code` is populated in just 1 of 5 reference projects, so asserting its reference side would be an n=5 sampling artefact, not a divergence check.
- [ ] AC.3 — The check reports the divergence list in its output, so a reader of a passing run still sees the gaps.

#### Scenario: A new divergence is not absorbed silently

- GIVEN a future export that introduces a field CLARISA does not return
- WHEN the fidelity check runs
- THEN it FAILS naming the unexpected field
- BUT it must NOT pass merely because the recorded divergences are still present
- AND IT MUST distinguish "recorded divergence" from "new divergence" in its failure message

---

### R-CFS-006 — The stub's mount is narrow, and the JWT exclude list is not widened at all

- **As a** security reviewer
- **I want** the stub's unauthenticated surface to be exactly its own prefix, with no change to the JWT `exclude` list
- **So that** no existing route's protection is altered by this work

**Details**

The proposal expected to add one `exclude` entry to `app.module.ts`. **That is no longer necessary.** Serving the stub from a bootstrap-registered mount places it ahead of `JwtMiddleware` in the Express stack (**M-19**, executed), so the middleware never runs for the stub and the `exclude` list is untouched.

This trades one risk for a different, smaller one, and the review target changes rather than disappearing:

- **Gone:** any modification to the shared `exclude` list, and with it the chance of over-matching an existing route.
- **Remains:** an unauthenticated route is added to the application, reachable without a JWT **by construction** rather than by an exclude entry. That still warrants security review — arguably more attentively, because the protection is absent structurally rather than by a listed exception. Its containment is R-CFS-004 (404 unless explicitly enabled).
- The mount prefix MUST NOT match sibling paths. Verified: `/api/clarisa-stubx` is not matched (M-19).

**Acceptance criteria**
- [ ] AC.1 — `git diff` shows **zero** lines changed in `app.module.ts`, and the `.exclude(...)` list is byte-identical to `main`.
- [ ] AC.2 — With the stub enabled, a protected route unrelated to the stub still returns 401 without a JWT.
- [ ] AC.3 — With the stub enabled, a sibling path sharing the prefix substring (`/api/clarisa-stubx/...`) does **not** reach the stub and is still handled by the normal pipeline.
- [ ] AC.4 — With the stub enabled, `GET /api/clarisa-stub/api/projects` returns 200 **without** any `Authorization` header.
- [ ] AC.5 — The security review of the unauthenticated route is recorded, by name, at the HITL pause.

#### Scenario: The mount does not over-match its neighbours

- GIVEN the stub is enabled and mounted at its prefix
- WHEN `/api/clarisa-stubx/api/projects` is requested without a JWT
- THEN it does NOT reach the stub, and the normal pipeline handles it (401 or 404, not the fixture)
- BUT it must NOT be verified by reading the mount string — only an executed request can see a routing over-match
- AND IT MUST be re-checked if the prefix is ever renamed

#### Scenario: The shared exclude list is provably untouched

- GIVEN the implementation is complete
- WHEN `git diff app.module.ts` is run
- THEN the output is empty
- AND IT MUST fail the task if any `exclude` entry was added "just in case" — an unnecessary widening is the exact risk this design avoids

---

### R-CFS-007 — Regenerating the fixture is deterministic

- **As an** ARI developer
- **I want** the converter to produce byte-identical output across runs
- **So that** a regenerated fixture diffs cleanly and a real data change is visible

**Details**
- Running the converter twice on the same export produces byte-identical files.
- No timestamps, run ids, or unordered iteration inside the payload. Provenance lives in a **sibling metadata file**, not interleaved in the array.
- Row order follows the export's row order.

**Acceptance criteria**
- [ ] AC.1 — Two consecutive runs produce a zero-byte diff.
- [ ] AC.2 — The provenance record names the source filename, the export date, the reference-capture date and host, and the removal condition.

#### Scenario: Determinism is falsifiable

- GIVEN a converter that stamps generation time inside the emitted array
- WHEN it is run twice and the outputs are compared
- THEN the diff is non-empty and the check FAILS
- AND IT MUST compare raw bytes — a check that parses both sides and compares objects would normalize the difference away and report green

---

### R-CFS-008 — The stub carries its own removal condition

- **As** Product / DevOps
- **I want** the exit condition recorded where anyone who touches the stub will read it
- **So that** it does not become another merged artifact nobody is assigned to remove (**K-015**)

**Details**
- The condition — *"when CLARISA publishes `external_code` and phase-2026 data, unset the flag and **delete** the stub, fixture, dictionary, reference capture and converter; do not maintain them"* — appears in the provenance record, in `.env.example`, and in a header comment on the stub controller.
- `ARI_CLARISA_STUB_ENABLED` and the stub's `ARI_CLARISA_HOST` values are documented in `.env.example` alongside the existing CLARISA vars.
- **OQ-3 remains open**: the condition has no assigned owner. This requirement records the condition; it cannot record a name.

**Acceptance criteria**
- [ ] AC.1 — The removal condition appears verbatim in all three locations.
- [ ] AC.2 — `.env.example` documents both new variables and the trailing-slash requirement on `ARI_CLARISA_HOST`.
- [ ] AC.3 — The absence of an OQ-3 owner is stated in the spec, not quietly omitted.

---

## 8. Non-functional requirements

### NFR-CFS-001 — No added latency on the picker hot path
- **Category:** performance
- **Target:** The stub reads and parses the fixture **once** per process and serves it from memory. `GET api/projects` responds in ≤ 100 ms locally after the first call.
- **How verified:** Timed local requests. **Disqualifier:** if three consecutive runs vary by more than the 100 ms budget itself, the measurement is not evidence — report the spread instead of a pass.

### NFR-CFS-002 — The consumption path is byte-for-byte unchanged
- **Category:** dx / maintainability
- **Target:** `git diff` touches **zero** lines in `clarisa-projects.service.ts`, `project-selector.util.ts`, `mapping-phase.resolver.ts`, `clarisa-projects.controller.ts`, `clarisa.connection.ts`, `app.module.ts`, `response.interceptor.ts`, and their specs. `main.ts` is the **only** existing shared file this spec edits.
- **How verified:** `git diff --stat` over that file list must be empty. **This is the requirement that keeps the change a transport substitution rather than the K-005 branch-inside-the-consumer shape.**

### NFR-CFS-003 — Fixture size stays reviewable
- **Category:** dx
- **Target:** The fixture is a single committed JSON file ≤ 2 MB (the real 299-project response is 1.15 MB; 198 projects with 283 mappings should land below it).
- **How verified:** `wc -c` on the committed file. If it exceeds 2 MB, escalate rather than silently commit.

### NFR-CFS-004 — Enabling the stub does not change production behaviour
- **Category:** security
- **Target:** With the flag unset, the app's routing table, boot time and memory footprint are unchanged apart from the registered-but-404ing handlers.
- **How verified:** Boot with the flag unset and confirm both routes 404 (R-CFS-004 AC.1) and no fixture read occurs (AC.4).

---

## 9. Defect classes and their gates

**Mandated mapping.** Each class this spec can produce, and the command that catches it. A gate blind to the dominant defect class is not a gate.

| # | Defect class | Gate | Named falsifying input | Can it FAIL? |
|---|---|---|---|---|
| DC-1 | **Envelope leak** — stub returns `ServerResponseDto` instead of raw shape | Over-the-wire `jq 'type'`/`length` assertion (R-CFS-003 AC.1–2) | Remove the bypass | **Proven** — executed at spec time (M-16) |
| DC-2 | **Nesting fiction** — synthesized entity codes make `hasSciencePrograms` wrong | Asserted count: 140 of 170, plus the three-code histogram (R-CFS-002 AC.2–3) | Hardcode `code: 22` ⇒ 170 ≠ 140 | Yes — arithmetic difference, not presence |
| DC-3 | **Vocabulary drift** — `H` where CLARISA has `high` | Value-domain assertion over all 283 mappings (R-CFS-002 AC.4) | Skip the HML translation | Yes |
| DC-4 | **Key-set drift** — fixture invents or drops a field | Set equality in both directions vs the reference capture (R-CFS-001 AC.2) | Add `principal_investigator_email` | Yes |
| DC-5 | **Type drift** — `phase` as string, `allocation` as string | `typeof` assertions (R-CFS-001 AC.3, R-CFS-002 AC.5) | Emit `"2026"` | Yes |
| DC-6 | **Stub reachable in production** | 404 assertions across unset / truthy / unrecognised flag values (R-CFS-004) | Delete the guard | Yes |
| DC-7 | **Unauthenticated surface wider than the stub's own prefix** | `git diff app.module.ts` empty + executed requests on an unrelated protected route and on the sibling prefix (R-CFS-006 AC.1–4) | Mount at `/api` instead of `/api/clarisa-stub` ⇒ the sibling/unrelated requests stop returning 401 | Yes |
| DC-8 | **Non-determinism** — fixture churns on regeneration | Byte diff of two runs (R-CFS-007 AC.1) | Stamp a timestamp inside the array | Yes — **byte** compare; a parsed compare would normalize it away |
| DC-9 | **Consumer contamination** — the "no change" claim quietly becomes false | `git diff --stat` over the named file list (NFR-CFS-002) | Add an `if (stub)` branch to the service | Yes |
| DC-10 | **Picker breakage at 170 options** — rendering, filtering, scroll, label truncation | **No automated gate exists.** jsdom cannot measure layout or rendering, and the CLARISA picker is uncapped (M-18) | — | **N/A — substituted** |
| DC-11 | **Snapshot staleness** (K-013) | **No automated gate is possible** — nothing in CI knows PRMS moved on | — | **N/A — accepted risk** |

**DC-10 — substitute gate.** A **mandatory human visual check at the HITL pause**: open the bilateral-mapping dialog against the stub and confirm the CLARISA picker renders, filters and scrolls at 170 options, with labels intact. Route to **T6 Multimodal** if a screenshot review is preferred over a live check. This is the spec's dominant *user-visible* defect class and it has no green-light command — do not let the other ten passing gates stand in for it.

**DC-11 — accepted risk.** Mitigated, not gated: the provenance record carries the source filename, the export date, the reference-capture date and host, and the removal condition (R-CFS-007 AC.2, R-CFS-008). A future reader can tell how old the data is; nothing will tell them automatically.

---

## 10. Cross-system impact

| System | Impact |
|---|---|
| `ClarisaProjectsService` + predicates + resolver | **None.** Exercised, never modified (NFR-CFS-002) |
| `clarisa.connection.ts` | **None.** Same call, different `ARI_CLARISA_HOST` |
| `app.module.ts` | **None.** The `exclude` list is not widened (M-19, R-CFS-006) |
| `main.ts` | **+1** unconditional mount block in bootstrap (DD-9) |
| `nest-cli.json` | **+1** `assets` entry so the fixture reaches `dist` (DD-10, added 2026-08-19) |
| `ResponseInterceptor` | **Unchanged and never reached** by the stub, which is served ahead of the Nest pipeline (R-CFS-003) |
| Swagger | The stub is **not** documented, by design — it is a temporary substitute, not API surface |
| `ARI_CLARISA_HOST` | Gains a **third** possible target (**K-005**). Today: line 11 test (active), line 12 prod (commented). The stub becomes a third commented option |
| `bilateral/clarisa-automapper-s2` | **Development unblocked**, and its match premise now **proven** at 170/170 (M-17). Shipping stays blocked on CLARISA |
| Bilateral picker (client) | First exercise at 170 options; **no code change** |
| Dev MySQL | **Read-only** during this spec's measurements. No schema or data change, no migration |
| DevOps | No pipeline step — the stub ships with the app. **But** OQ-3's flag owner is unassigned |

---

## 11. Assumptions, dependencies, risks

**Assumptions**
- A-1 — The export's `Code`, prefix-stripped, is the AGRESSO join key. **No longer an assumption** — measured 170/170 (M-17).
- A-2 — The reference capture from `clarisatest-back` is representative of the field *shape* prod returns. Field **values** differ (prod `phase` is `null`, test is `2025`); the 32-key shape is what this spec relies on.
- A-3 — 170 options is within PrimeNG `p-select`'s comfortable range. **Unverified** — this is DC-10.

**Dependencies** — none. The stub ships with the application.

**Risks**

| # | Risk | Mitigation |
|---|---|---|
| R-1 | **KZ-001** — a double that doesn't evaluate what it stands in for | R-CFS-002 harvests real nesting; R-CFS-005 enumerates every divergence; the 140-vs-170 count makes the failure arithmetic |
| R-2 | **The envelope trap** — the stub's silent-empty failure looks like a CLARISA outage | R-CFS-003, with the diagnosis written into the requirement so the next reader does not re-derive it |
| R-3 | **K-005** — `ARI_CLARISA_HOST` gains a third target | Each environment's value stays visible in its own config; the phase selector already surfaces the resulting cohort in the UI |
| R-4 | **K-015 / OQ-3** — an unowned removal condition outlives its purpose | Recorded in three places (R-CFS-008); **the missing owner is escalated, not papered over** |
| R-5 | **K-013** — the snapshot ages | DC-11, accepted risk with dated provenance |
| R-6 | Temporary controller lives in production code | 404-gated by default (R-CFS-004); removal condition inline |
| R-7 | **170 options may break picker assumptions** — the CLARISA picker has **no** limit while AGRESSO's has 50 (M-18) | DC-10's human check. Findings become their own bugfix specs, not scope creep here |
| R-8 | The reference capture is committed and could itself drift | It is a *fixed baseline* by design; regenerating it is a deliberate act that re-dates the provenance record |

---

## 12. Open questions

| # | Question | Owner | Blocking |
|---|---|---|---|
| **OQ-3** | Who sets `ARI_CLARISA_STUB_ENABLED` on dev, and who owns turning it off and deleting the stub? | **Unassigned** — needs DevOps / Product | **Yes, for dev only.** Local work proceeds |
| **OQ-4** | Will CLARISA publish the AGRESSO join key under the field name `external_code`? | CLARISA team | No — S2 can build and measure now; a rename means re-measure, not rebuild |

*Resolved during this phase: **OQ-1** (yes, 170/170 — §3), **OQ-2** (`api/projects` only — §3).*

---

## 13. Requirement ID index

| ID | Title | Gates |
|---|---|---|
| R-CFS-001 | The fixture reproduces CLARISA's response shape exactly | DC-4, DC-5 |
| R-CFS-002 | Nested mappings are built from real CLARISA objects | DC-2, DC-3, DC-5 |
| R-CFS-003 | The stub serves CLARISA's raw wire shape | DC-1 |
| R-CFS-004 | The stub is absent unless explicitly enabled | DC-6 |
| R-CFS-005 | The fidelity check names what the export cannot supply | DC-4, DC-10, DC-11 |
| R-CFS-006 | The stub's mount is narrow, and the JWT exclude list is not widened at all | DC-7 |
| R-CFS-007 | Regenerating the fixture is deterministic | DC-8 |
| R-CFS-008 | The stub carries its own removal condition | DC-11 |
| NFR-CFS-001 | No added latency on the picker hot path | — |
| NFR-CFS-002 | The consumption path is byte-for-byte unchanged | DC-9 |
| NFR-CFS-003 | Fixture size stays reviewable | — |
| NFR-CFS-004 | Enabling the stub does not change production behaviour | DC-6 |

---

## 14. Sign-off

- [ ] Engineering lead — Juan Carlos Cadavid
- [ ] MEL / product owner — <name>
- [ ] **Security review (unauthenticated route served outside the Nest pipeline, R-CFS-006)** — <name> — **required.** Note the review target changed during Phase 2: the JWT `exclude` list is no longer widened (M-19), but the stub is unauthenticated **by construction**, contained only by R-CFS-004's default-off gate
- [ ] DevOps (OQ-3: flag ownership on dev) — <name> — **required before dev is switched on**

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
