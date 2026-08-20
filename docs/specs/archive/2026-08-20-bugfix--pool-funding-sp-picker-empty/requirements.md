# Requirements — Bilateral / Pool Funding SP Picker Renders Empty

- **Module:** bilateral (server `domain/entities/bilateral` + `domain/tools/clarisa`, client `pool-funding-alignment`)
- **Spec id:** 2026-08-pool-funding-sp-picker-empty
- **Status:** draft
- **Owner:** ARI squad — Juan Carlos Cadavid
- **Linked PRD section:** `docs/prd.md` — bilateral pool-funding alignment reporting
- **Linked proposal:** [`./proposal.md`](./proposal.md) (Type: **Bug**, Approval Mode: `gated`)
- **Linked tickets:** AC-1676
- **Depth:** **Standard** — Bug Mode (three confirmed root causes, one migration, two packages)
- **Extends:** `docs/specs/archive/2026-08-20-bilateral--clarisa-automapper-s2` (answers its **OQ-5**), `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub` (corrects its **M-14** / **D-4**)
- **Last updated:** 2026-08-20

---

## Executive Summary

The Pool Funding Alignment Science Program picker is empty for every mapped bilateral result. The mapping is fine — **Dev reports `MAPPED 195 · PENDING 3 · REACHABLE 198` (98%)**. The picker discards its data because it accepts only CLARISA mapping `status === 'Confirmed'`, and **0 of the 198** cohort projects have one: all **283** SP rows are `Pending`.

Three confirmed causes, one blocking:

| | Cause | Blocking Dev? |
| --- | --- | --- |
| **RC-A** | SP filter accepts only `Confirmed`; the cohort is 100% `Pending` | **Yes — sole blocker** |
| **RC-B** | `clarisa_project_id` is feed-scoped with nothing pinning the feed | No — latent, reproduces on any host swap |
| **RC-C** | Stub fixture stamps `Confirmed` on all 283 rows, so RC-A cannot redden a test | No — but it is why RC-A shipped. **Resolved by removing the stub** (R-PSP-007, revised 2026-08-20) |

---

## 1. Context

A reporter mapped the 198 eligible bilateral projects with the CLARISA automapper. The mapping succeeded. Opening any of those results → **Pool funding alignment** → **Yes** shows an empty picker and *"The linked CLARISA project has no Science Programs defined."* The projects **do** have Science Programs; CLARISA has simply not marked them `Confirmed`.

`Pending` / `Confirmed` is a field **inside CLARISA** (`project_mappings_array[].status`), describing CLARISA's own project→Science-Program curation workflow. **ARI never writes it** — the only `POST` ARI makes to CLARISA is `CREATE_SECRET` (`clarisa.service.ts:217`). Running the ARI automapper cannot and did not change it. This distinction caused the original misdiagnosis and belongs in the Glossary below.

Full evidence, measurements and the superseded-claim record: [`proposal.md` § Bug Diagnosis](./proposal.md).

**Explicitly NOT changing:** the automapper's matching logic, the eligible-cohort predicates, CLARISA's own data, the ToC alignment blocks beyond what an unblocked SP list implies.

---

## 2. Glossary

| Term | Meaning | Owner |
| --- | --- | --- |
| **Bilateral project mapping** | Row in `bilateral_project_mapping`: AGRESSO contract ↔ CLARISA project. The *Bilateral Mapping* admin screen | **ARI** |
| **CLARISA project mapping** | Entry in a CLARISA project's `project_mappings_array[]`: project ↔ Science Program, each with a `status` | **CLARISA** (read-only to ARI) |
| **Accepted-status set** | The set of CLARISA mapping statuses ARI treats as usable for the SP picker. Today an inline literal `'Confirmed'`; this spec makes it a named, overridable constant | ARI |
| **Reachable / mapped / pending** (coverage strip) | `reachable` = eligible CLARISA projects; `mapped` = of those, already mapped; `pending` = `reachable − mapped`. **Unrelated** to CLARISA's `Pending` status | ARI |
| **Feed** | The CLARISA source a running ARI instance reads, set by `ARI_CLARISA_HOST` (+ `ARI_CLARISA_STUB_ENABLED`) | ARI config |
| **Stable key** | `external_code`, normalized by `normalizeExternalCode` — identifies a CLARISA project across feeds; `clarisa_project.id` does not | ARI |

---

## 3. System Context & Scope

```
result ──result_contracts(primary,active)──> agresso_contracts.agreement_id
      └──> bilateral_project_mapping (active)  [ARI owns]
              └── clarisa_project_id ──> CLARISA project   [feed-scoped ← RC-B]
                        └── project_mappings_array[].status  [CLARISA owns ← RC-A]
                                  └──> SP picker  ·  ToC catalog  ·  admin panel
```

**In scope:** the SP derivation predicate and its three call sites; the mapping's resolution key; the three empty-state messages; **removal of the CLARISA stub apparatus** (R-PSP-007).

**Out of scope:** everything listed in `proposal.md § Non-Goals`.

---

## 4. Stakeholders / Personas

| Persona | Stake |
| --- | --- |
| **Bilateral reporter** (PRD §3) | Blocked: cannot select an SP ⇒ cannot complete the section ⇒ cannot reach the HLO/ToC blocks |
| **Bilateral operations / admin** | Receives support tickets for mappings that already exist; reads the coverage strip |
| **PRMS / CLARISA curators** | Own the `Pending → Confirmed` transition this spec stops depending on |
| **ARI engineers** | Own the predicate, the resolution key and the stub's removal |

---

## 5. Decisions Carried In From the Proposal Gate

| # | Question | Decision (2026-08-20, user) |
| --- | --- | --- |
| **DEC-1** | Should `Pending` SPs be selectable? (proposal OQ-1, archive OQ-5) | **Yes** — accepted set becomes `{Confirmed, Pending}`, behind a named constant with an env override, with `Pending` visibly qualified in the UI |
| **DEC-2** | Spec scope | **All three root causes** (RC-A + RC-C + RC-B) |
| **DEC-3** | Which feed does Dev read? (proposal OQ-2) | **Real CLARISA test** (`clarisatest-back`). *(The trailing clause "the stub stays a local/offline tool" is superseded 2026-08-20 — R-PSP-007 deletes the stub.)* |

DEC-3 makes proposal **OQ-3** (backfill vs. re-run) non-blocking: the stored ids already resolve on Dev, so R-PSP-006's backfill is *defensive*, not a repair.

---

## 6. Functional Requirements

### R-PSP-001 — The SP picker accepts every CLARISA mapping status in the configured accepted set

- **As a** bilateral reporter
- **I want** the Science Programs my linked CLARISA project carries to appear in the picker even when CLARISA has not yet marked them `Confirmed`
- **So that** I can complete Pool Funding Alignment without waiting on a CLARISA curation step ARI does not control

**Details**
- Inputs: `GET /api/v1/results/:result-code/pool-funding-alignment/science-programs`
- Behavior: the SP predicate's status clause changes from `status === 'Confirmed'` to `status ∈ ACCEPTED_SP_MAPPING_STATUSES`, default `{'Confirmed','Pending'}`, overridable by env. **Every other clause is unchanged** — portfolio `= ENV.BILATERAL_ACTIVE_PORTFOLIO`, prefix `≠ AOW`, `smo_code` matches `/^SP\d/i`.
- Outputs: `ServerResponseDto` with `data.mapping_status`, `data.clarisa_project`, `data.science_programs[]`; each item gains `mapping_status` (the CLARISA status that admitted it).
- Errors: unchanged — `404` result not found; the endpoint otherwise always `200`.
- Permissions: unchanged.

**Scenario: a project whose SPs are all Pending**
- GIVEN result `STAR-2227` is mapped to CLARISA project `C-A132` (id `1442`)
- AND that project's only SP mapping row is `{smo_code: 'SP01', status: 'Pending', portfolio: 'P25'}`
- WHEN the client requests the per-result Science Programs
- THEN the response carries `mapping_status: "mapped"` and exactly one entry, `SP01`
- AND that entry reports its CLARISA status as `Pending`
- BUT it must NOT return `science_programs: []` for this project
- AND IT MUST leave the portfolio, AOW and `SP\d` clauses evaluating exactly as before — a row that fails any of those is still excluded regardless of status

**Scenario: a status outside the accepted set stays excluded**
- GIVEN a CLARISA project carrying an SP row whose status is neither `Confirmed` nor `Pending` (e.g. `Rejected`)
- WHEN the picker source is derived
- THEN that row is excluded
- BUT it must NOT cause the whole project to report zero SPs when a sibling row is acceptable
- AND IT MUST be excluded by the **named accepted set**, never by a second inline literal

**Acceptance criteria**
- [ ] AC.1 — `GET …/2227/pool-funding-alignment/science-programs` returns `mapping_status: "mapped"` and one entry `SP01`, against real CLARISA.
- [ ] AC.2 — The same call for result `3403` (project `B-A1676`, id `1403`) returns `SP02` and `SP06`.
- [ ] AC.3 — A fixture project with a `Rejected` SP row and a `Pending` SP row returns only the `Pending` one.
- [ ] AC.4 — Overriding the env var to `Confirmed` alone reproduces the old behavior (`science_programs: []` for the cohort) — proving the set is genuinely the discriminator and not a hardcoded widen.

**Out of scope:** changing which portfolio is active; changing the AOW or `SP\d` clauses.

---

### R-PSP-002 — The ToC catalog resolves the same Science Programs as the picker

- **As a** bilateral reporter
- **I want** the HLO/ToC blocks to appear for the SPs I just selected
- **So that** unblocking the picker actually unblocks the section

**Details**
- `getHlosIndicatorsForResult` shares the SP chain by design (`bilateral.service.ts:141` — *"Same rules as `deriveSciencePrograms`"*). It must inherit R-PSP-001 automatically, not by a parallel edit.

**Scenario: catalog follows the picker**
- GIVEN result `STAR-2227` now resolves `SP01` under R-PSP-001
- WHEN the ToC catalog is requested for that result
- THEN `catalogs[]` contains one entry keyed `SP01`
- BUT it must NOT return `catalogs: []` for a project the picker reports as having SPs
- AND IT MUST reach that result through the **same** predicate function, so the two can never disagree on SP codes

**Acceptance criteria**
- [ ] AC.1 — For any result, the set of SP codes in `catalogs[]` equals the set in `science_programs[]` (excluding the documented `allowed_levels: []` and version-lock short-circuits).
- [ ] AC.2 — A test asserts the two endpoints agree for a project with a `Pending`-only SP row.

---

### R-PSP-003 — One shared SP predicate, with any remaining difference recorded

- **As an** ARI engineer
- **I want** a single named predicate for "is this CLARISA mapping row a usable Science Program"
- **So that** the status rule cannot drift between the picker, the ToC catalog and the admin flag again

**Details**
- Today three predicates read the same data with different rules: `isProjectScienceProgramMapping` (portfolio + AOW + `SP\d`), `deriveScienceProgramMetaByCode` (same, duplicated), and `hasSciencePrograms` (`cgiar_entity_type_object.code === 22`).
- Per M-12 of the fixture-stub spec, code `22` is **SP01–SP08 only**; SP09 is `23` and SP10–SP13 are `24`. So `has_science_programs` can report `false` for a project the picker populates.
- This requirement unifies the **status clause** across all three. The entity-code clause is **deliberately preserved as-is** and documented, not silently harmonized (K-005: never collapse a discriminator "to simplify" — and never harmonize one without deciding).

**Scenario: status rule cannot drift**
- GIVEN the accepted-status set is changed in one place
- WHEN the picker, the ToC catalog and the admin `has_science_programs` flag are evaluated
- THEN all three reflect the change
- BUT it must NOT silently change the `code === 22` clause's meaning as a side effect
- AND IT MUST leave a recorded decision stating why `hasSciencePrograms` still narrows to code 22, or fix it explicitly

**Acceptance criteria**
- [ ] AC.1 — Exactly one exported accepted-status constant exists; a repo-wide grep finds no surviving inline `'Confirmed'` status literal in the SP predicates.
- [ ] AC.2 — A test proves the admin flag and the picker agree on **status** for the same project.
- [ ] AC.3 — The entity-code divergence is recorded in `design.md`'s decisions log with its consequence stated.

---

### R-PSP-004 — Every empty state names its true cause

- **As a** bilateral reporter
- **I want** an empty picker to tell me what is actually missing
- **So that** I do not contact the operations team about a mapping that already exists

**Details**
Three states must be distinguishable end-to-end. `mapping_status` gains a `stale` value; the client renders three distinct messages.

| State | `mapping_status` | Meaning |
| --- | --- | --- |
| Not mapped | `unmapped` | No AGRESSO contract, or no active mapping row |
| **Stale** | `stale` (new) | Active mapping row exists, but its project is not resolvable in this feed |
| Filtered out | `mapped` + `science_programs: []` | Project resolved; its SP rows were excluded by status/portfolio/AOW |

**Scenario: an existing mapping is never reported as "not linked"**
- GIVEN an active `bilateral_project_mapping` row whose project cannot be resolved in the current feed
- WHEN the per-result Science Programs are requested
- THEN `mapping_status` is `stale`
- AND the response still carries the stored snapshot so ops can diagnose the drift
- AND the client renders a message distinct from the not-linked copy
- BUT it must NOT render *"This result isn't linked to a CLARISA project yet"*
- AND IT MUST NOT instruct the user to contact operations to register a mapping that exists

**Scenario: filtered-out SPs say so**
- GIVEN a resolved project whose SP rows were all excluded by the accepted-status set
- WHEN the picker renders
- THEN the message names the filter as the reason
- BUT it must NOT claim the project has no Science Programs defined
- AND IT MUST remain accurate when the project genuinely has zero SP rows — that case needs its own wording

**Acceptance criteria**
- [ ] AC.1 — Three distinct `mapping_status` values are reachable and covered by tests.
- [ ] AC.2 — A client test asserts the stale message is **not equal** to `UNMAPPED_SP_MESSAGE`.
- [ ] AC.3 — Existing consumers of `mapping_status` handle `stale` without falling through to the picker (`showSpPicker` stays false).
- [ ] AC.4 — No message in any of the three states instructs the user to register an existing mapping.

---

### R-PSP-005 — Mappings resolve through a feed-stable key

- **As an** ARI engineer
- **I want** a mapping row to identify its CLARISA project by `external_code`, not only by the feed-local numeric id
- **So that** changing `ARI_CLARISA_HOST` does not silently unmap every row

**Details**
- Add `clarisa_external_code varchar(100) NULL` to `bilateral_project_mapping` + index; migration named per `<timestamp>-addClarisaExternalCodeToBilateralProjectMapping.ts`.
- Resolution order: stable key first (normalized via the **existing** `normalizeExternalCode` — NFR-CAM-003's rule: no second normalization is written), `clarisa_project_id` as fallback and as a drift signal.
- The automapper populates the new column on every row it writes.
- `clarisa_project_id` remains stored and returned; it stops being the sole authority.

**Scenario: a feed swap does not unmap**
- GIVEN an active mapping row for `A1676` carrying `clarisa_external_code = 'A1676'` and `clarisa_project_id = 1403`
- AND the running instance reads a feed where that project's id is `92`
- WHEN the per-result Science Programs are requested
- THEN the project resolves and `mapping_status` is `mapped`
- BUT it must NOT report `unmapped` or `stale` merely because the numeric id differs
- AND IT MUST record the id divergence in a log line so ops can see the drift

**Scenario: an unresolvable row is still unresolvable**
- GIVEN a mapping row whose stable key matches no project in the current feed
- WHEN resolution runs
- THEN `mapping_status` is `stale` per R-PSP-004
- BUT it must NOT fall back to a fuzzy or prefix-widened match — normalization is case/whitespace + the closed `{B-, C-}` prefix set only

**Acceptance criteria**
- [ ] AC.1 — Migration applies forward and reverts cleanly (`migration:revert`).
- [ ] AC.2 — An instance reading a feed that numbers projects differently from the stored `clarisa_project_id` still resolves result `3403` and returns SPs. *(Revised 2026-08-20: originally worded "with a stub-backed instance", which R-PSP-007's removal of the stub would have made unverifiable. Drive it with a mocked feed whose ids differ — the property under test is id-independence, never the stub.)*
- [ ] AC.3 — Dev coverage does not regress below its measured `195 / 198`.
- [ ] AC.4 — A row with a non-matching stable key reports `stale`, not `mapped`.

---

### R-PSP-006 — Existing mapping rows are backfilled with the stable key

- **As an** ARI operator
- **I want** the 199 existing rows to carry the stable key without re-running the automapper
- **So that** audit history is preserved and no mapping is recreated

**Details**
- Backfill derives `clarisa_external_code` from `agresso_agreement_id` (already the normalized form — M-17 of the fixture-stub spec measured 170/170 stripped codes matching `agresso_contracts`).
- Delivered as a **separate migration** from the schema change (template §5: backfill is its own requirement, never inline in a schema migration).
- **K-015:** the CI/CD pipeline deploys code only. Applying either migration is a separate human-decided step against the shared Dev database.

**Scenario: backfill is complete and idempotent**
- GIVEN 199 active mapping rows with `clarisa_external_code` NULL
- WHEN the backfill migration runs
- THEN every row has a non-null, normalized `clarisa_external_code`
- AND re-running it changes nothing
- BUT it must NOT modify `clarisa_project_id`, `agresso_agreement_id`, `source`, or any audit column
- AND IT MUST NOT deactivate, delete or recreate any row

**Acceptance criteria**
- [ ] AC.1 — `SELECT COUNT(*) FROM bilateral_project_mapping WHERE is_active=1 AND clarisa_external_code IS NULL` returns `0` after the run.
- [ ] AC.2 — Row count, `id` values and `created_at` are unchanged before/after (compared explicitly, not assumed).
- [ ] AC.3 — A second run reports zero rows affected.

---

### R-PSP-007 — The CLARISA stub apparatus is removed

> **Revised 2026-08-20** (pivot during execution, user-approved). This requirement previously read *"The stub fixture carries a representative CLARISA status mix"* and asked for harvested statuses, a regenerated fixture and an inverted D-4. **Superseded text preserved below.** The stub's own removal condition is now met, so making the fixture faithful would mean maintaining an artifact the code explicitly says to delete.

- **As an** ARI engineer
- **I want** the stub, fixture, dictionary, reference capture and converter deleted
- **So that** no second, divergent copy of the CLARISA cohort exists to disagree with the real feed

**The removal condition, verbatim** — written into `convert-export.ts`, `harvest-reference.ts`, `clarisa-stub.router.ts`, `clarisa-stub.config.ts` and the fixture provenance:

> *"when CLARISA publishes external_code and phase-2026 data, unset the flag and delete the stub, fixture, dictionary, reference capture and converter; do not maintain them"*

**Both halves measured against `clarisatest-back` on 2026-08-20** (`GET /api/projects`, 1210 projects), using the repo's own shipped predicates (`project-selector.util.ts`), not a reimplementation:

| Measure | Fixture-stub spec, 2026-08-18 | **Today** |
| --- | --- | --- |
| `external_code` populated | **0 / 299** (M-7) | **911 / 1210** |
| `phase` histogram | `{2025: 299}` (M-8) | `{2025: 299, **2026: 911**}` |
| `source_center_acronym` populated | 0 / 299 (M-9) | 911 / 1210 |
| Eligible cohort @ phase 2026 | n/a | **198, all 198 carrying `external_code`** |

The live feed reproduces the fixture's cohort exactly. **Invalidating condition (K-013):** if a CLARISA test reset drops `external_code` or phase-2026 data below full coverage of the eligible cohort, this requirement is void and the stub must be reinstated from git history.

**Details**
- Delete: `domain/tools/clarisa/stub/` in full — router, mount, config, fidelity spec, router spec, both tools, all four fixture artifacts.
- Remove the mount call from `main.ts` and retire `ARI_CLARISA_STUB_ENABLED` from `.env.example`.
- Blast radius is closed: every consumer of the fixture lives inside `stub/`, plus the one `main.ts` mount. Nothing outside reads it.
- Predicate branch coverage already lives in small in-test fixtures (**D-PSP-7**) and does not depend on the stub.

**Scenario: the divergent copy is gone**
- GIVEN the stub apparatus has been deleted
- WHEN the server boots and the bilateral suites run
- THEN no code path reads a committed CLARISA fixture
- AND the full server suite passes
- BUT it must NOT leave a dangling import, a dead env flag, or a stub route still mounted
- AND IT MUST leave the automapper, the picker and the ToC catalog reading the live feed **unchanged in behavior** — deletion removes a test double, never a production path

**Acceptance criteria**
- [ ] AC.1 — `grep -rn "clarisa-stub\|clarisa-projects.fixture" src` returns **zero** hits.
- [ ] AC.2 — `ARI_CLARISA_STUB_ENABLED` appears nowhere in `src` or `.env.example`.
- [ ] AC.3 — Full server suite green; the deletion removes suites but breaks none that remain.
- [ ] AC.4 — `npm run build` succeeds and boots; `main.ts` has no dangling mount.
- [ ] AC.5 — `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub/` carries a dated note recording that its removal condition fired, **with M-14's correction** (the `493` population was pre-filtered to `Confirmed`; the feed holds 1847 rows — 493 `Confirmed`, 1354 `Pending`). Annotate; never overwrite.

<details>
<summary><b>Superseded text (2026-08-20) — R-PSP-007 as originally approved</b></summary>

The original requirement asked for: `convert-export.ts` to source statuses from a harvested `(external_code, smo_code) → status` map instead of its hardcoded `CONFIRMED_STATUS`; the fixture regenerated; the fidelity spec's **D-4** inverted (it currently *fails* the fixture if any mapping stops being `Confirmed`, protecting the state that hid the bug); and M-14 corrected. Its measurements stand and are reproduced above. It is superseded because the removal condition makes the fixture an artifact to delete, not to repair — the same defect (a double that agrees with the bug) is closed more completely by deletion.

</details>

---

## 7. Non-Functional Requirements

### NFR-PSP-001 — Config changes state their visibility window

- **Category:** dx / observability
- **Target:** every verification step that changes CLARISA-derived behavior states the **5-minute TTL** on `ClarisaProjectsService` and `MappingPhaseResolver`, and that re-saving restarts the window.
- **How verified:** review of `tasks.md`; **K-016** has fired twice, both times reported as "returns nothing" with nothing broken.

### NFR-PSP-002 — No coverage regression on Dev

- **Category:** reliability
- **Target:** `GET /api/bilateral-project-mappings/coverage` on Dev stays at or above `mapped: 195 / reachable: 198`.
- **How verified:** measured before and after; **the before-value is captured first** — a post-only reading cannot detect a regression.

### NFR-PSP-003 — Every new gate is proven able to fail

- **Category:** dx
- **Target:** each test added by this spec has an observed FAIL recorded in `execution.md`, with the concrete input that produced it (**K-004**, **K-012**, **KZ-014**).
- **How verified:** `execution.md` review; a task whose evidence is "the test passes" is not done.

### NFR-PSP-004 — ~~The regenerated fixture reaches the build output~~ **RETIRED 2026-08-20**

- **Status:** retired by R-PSP-007's revision — there is no fixture to package once the stub is deleted.
- **Original target (preserved):** `clarisa-projects.fixture.json` exists in `dist/` after `npm run build`, verified by `npm run build && ls -l dist/**/…`, because a unit suite runs over `src` and structurally cannot see a fixture missing from `dist` (**K-017**).
- **The K-017 rule itself still binds** any future runtime artifact this spec might add. It is the *instance* that is retired, not the lesson.

---

## 8. Data Requirements

| Item | Detail |
| --- | --- |
| Entity | `src/domain/entities/bilateral-project-mapping/entities/bilateral-project-mapping.entity.ts` |
| Column added | `clarisa_external_code varchar(100) NULL` — normalized CLARISA `external_code`, feed-stable resolution key |
| Index added | `idx_bpm_clarisa_external_code` on `(clarisa_external_code)` |
| Untouched | `agresso_agreement_id`, `clarisa_project_id`, the generated column + partial-unique index (D-PI-9), all audit columns |
| Migrations | `<ts>-addClarisaExternalCodeToBilateralProjectMapping.ts` (schema) and `<ts>-backfillClarisaExternalCode.ts` (data) — **two files**, per template §5 |
| OpenSearch | None — this entity is not indexed |
| Application | **Manual, human-decided** against the shared Dev DB (K-015) |

---

## 9. API Surface Delta

| Endpoint | Change |
| --- | --- |
| `GET /api/v1/results/:result-code/pool-funding-alignment/science-programs` | `mapping_status` gains `stale`; each `science_programs[]` item gains its CLARISA `mapping_status`. **Additive** — no version bump |
| `GET /api/v1/results/:result-code/pool-funding-alignment/hlos-indicators` | Behavior only: catalogs now resolve for `Pending`-only projects |
| `GET /api/bilateral-project-mappings` / `…/coverage` | Response gains `clarisa_external_code`; coverage counts via the stable key |

Swagger annotations must be updated for every changed response shape. No breaking change ⇒ no `/v2`.

---

## 10. Cross-System Impact

| System | Impact |
| --- | --- |
| **CLARISA** | Read-only, unchanged. This spec *stops* depending on a CLARISA curation state ARI cannot set |
| **AGRESSO** | None |
| **STAR client** | `pool-funding-alignment.component.{ts,html}` — third empty state + `Pending` qualifier. Same repo (monorepo), so specified here |
| **Admin SSR** | `BilateralProjectMappings.tsx` — the "Science Programs (Confirmed, P25)" label becomes accurate to the accepted set |
| **New env var** | `ARI_BILATERAL_ACCEPTED_SP_STATUSES` (default `Confirmed,Pending`), declared in `.env.example` alongside `ARI_BILATERAL_ACTIVE_PORTFOLIO` |

---

## 11. Defect Classes And Their Gates

The command that catches each class this spec can produce. **A class with no automated check is named, not hidden.**

| # | Defect class | Gate | Can it go red? |
| --- | --- | --- | --- |
| DC-1 | Status predicate wrong / over-widened | `npm test -- --silent` on `bilateral.service.*.spec.ts`; **AC.4 pins the set as the discriminator** by reverting it to `Confirmed` and asserting the old empty result | Yes — named input: a `Rejected` SP row must be excluded |
| DC-2 | Picker and ToC catalog disagree | Cross-endpoint equality test (R-PSP-002 AC.1) | Yes — mutate one call site only; the test reddens |
| DC-3 | Empty-state copy still lies | Client spec asserting the three messages are pairwise distinct **and** that stale ≠ unmapped | Yes — collapse `stale` onto `unmapped` |
| DC-4 | Migration does not revert | `npm run migration:revert` | Yes |
| DC-5 | Backfill mutates unrelated columns | Before/after row snapshot compared explicitly | Yes — touch `updated_at` in the migration |
| DC-6 | A committed fixture diverges from the live feed | **Eliminated by construction** — R-PSP-007 deletes the fixture; there is no second copy left to diverge | n/a |
| DC-7 | Deletion leaves a dangling import, dead flag or mounted route | `grep -rn "clarisa-stub"` + `npm run build` + boot (R-PSP-007 AC.1–AC.4) | Yes — leave one import behind |
| DC-8 | **Real-feed behavior differs from every local run** | ⚠️ **No automated gate.** Suites mock the feed; the bug existed precisely because the fixture agreed with it. *(DC-8 PASSED 2026-08-20 — see `execution.md`)* | **No** |
| DC-9 | **Rendered UI state wrong** (message shown, chip qualifier) | ⚠️ jsdom asserts strings, not what a human sees | **Partial** |

**Substitutes for the ungated classes:**

- **DC-8** — mandatory **manual verification against Dev with the real CLARISA host**, on the two named results (`STAR-2227` → `SP01`; `STAR-3403` → `SP02`, `SP06`), at the HITL pause before archive. This is the single most important check in the spec and it is **not** automatable here. Recorded as **accepted risk RB-1**.
- **DC-9** — screenshot of each of the three empty states at the same HITL pause. A jsdom string assertion proves the constant is referenced, **not** that the state is reachable or legible.

---

## 12. Assumptions, Dependencies, Risks

| # | Item | Mitigation |
| --- | --- | --- |
| A-1 | Dev reads real CLARISA test per DEC-3 | Verified in the user's screenshot: mapping table shows real-feed ids (`C-S303 (id 1586)`) |
| A-2 | CLARISA will not bulk-confirm the 283 rows mid-flight | Harmless if it does — `Confirmed` stays in the accepted set |
| A-3 | `agresso_agreement_id` equals the normalized `external_code` for all rows | M-17: 170/170. **Re-measure before the backfill**, do not assume |
| R-1 | Real-feed figures are a 2026-08-20 capture of a periodically-reset host | Re-measure before relying on 283 / 493 / 1354 (**K-013**) |
| R-2 | Widening the status set changes the picker for **all** bilateral results, not just the 198 | State the expected before/after delta and measure it |
| R-3 | `hasSciencePrograms`'s `code === 22` still excludes SP09–SP13 | R-PSP-003 AC.3 forces an explicit recorded decision |
| R-4 | Migrations are not applied by CI/CD (**K-015**) | Explicit human step in `tasks.md` rollout |
| R-5 | Two full-suite runs in parallel produce phantom failures (§4.3) | Workers verify their own scope; Leader re-measures the full suite alone |

---

## 13. Open Questions

| # | Question | Owner | Due |
| --- | --- | --- | --- |
| **OQ-1** | Should the UI let a reporter *submit* an alignment built on `Pending` SPs, or warn at submit time? DEC-1 settles visibility, not submission | Product + PRMS | Before execute |
| **OQ-2** | Should `hasSciencePrograms` drop the `code === 22` narrowing (R-3)? | ARI squad | Before archive |
| ~~**OQ-3**~~ | ~~Should the stub remain the local default?~~ **CLOSED 2026-08-20** — the user pinned local to real CLARISA, and R-PSP-007's revision deletes the stub outright | ARI squad | done |

---

## 14. Requirement ID Index

| ID | Title | Root cause | Gates |
| --- | --- | --- | --- |
| R-PSP-001 | SP picker accepts the configured status set | RC-A | DC-1 |
| R-PSP-002 | ToC catalog resolves the same SPs | RC-A | DC-2 |
| R-PSP-003 | One shared SP predicate | RC-A | DC-1 |
| R-PSP-004 | Every empty state names its true cause | RC-A + RC-B | DC-3, DC-9 |
| R-PSP-005 | Mappings resolve through a feed-stable key | RC-B | DC-4 |
| R-PSP-006 | Existing rows backfilled | RC-B | DC-5 |
| R-PSP-007 | Fixture carries a representative status mix | RC-C | DC-6, DC-7 |
| NFR-PSP-001 | Config visibility window stated | — | review |
| NFR-PSP-002 | No Dev coverage regression | — | before/after |
| NFR-PSP-003 | Every gate proven able to fail | — | `execution.md` |
| NFR-PSP-004 | Fixture reaches `dist` | — | DC-7 |

---

## 15. Sign-off

- [ ] Engineering lead — Juan Carlos Cadavid
- [ ] MEL / product owner — *(DEC-1 was taken at the proposal gate; OQ-1 still open)*
- [ ] Security review — not required (no auth, secrets or PII touched)
- [ ] DevOps — required for the two migrations (K-015) and the Dev `ARI_CLARISA_HOST` pin (DEC-3)
