# Requirements — TIP Integration / Knowledge-product projects and pool funding

- **Module:** tip-integration (server) — touches `bilateral` (pool funding) and `results` (alignment contracts)
- **Spec id:** 2026-10-tip-kp-project-pool-funding
- **Status:** draft
- **Owner:** David Casañas
- **Linked PRD section:** `docs/prd.md` — external result ingestion (TIP) and Pool Funding alignment
- **Linked tickets:** AC-1761 (branch `AC-1761-TIP-integration-adjustments-to-push-Knowledge-Products`)
- **Depth:** Standard
- **Approval mode:** interactive
- **Extends:** `docs/specs/archive/2026-08-13-bilateral--primary-contributing-sp`, the PRMS import bypass `BilateralService.importAlignmentFromPrms` (commit `ba11d07bf`)
- **Last updated:** 2026-10-20

---

## 1. Executive summary

TIP now sends, for every knowledge product, a `project[]` list where each project says whether it is the **primary** one, whether it **contributes to pool funding**, and — on the primary one — a **`toc_mapping`** (Science Program, ToC result, indicator, target contribution).

Today the sync keeps only `project[0]` and always marks it primary; everything else is dropped. This spec makes the sync:

1. save **every** project as a result contract, with TIP's own primary flag (Alignment section);
2. save the primary project's `toc_mapping` as the result's **pool-funding alignment and ToC row**, bypassing the rules a STAR user's save goes through — external data is TIP's record, not a user's choice;
3. show that imported alignment read-only, even when STAR does not consider the contract eligible.

Rules for results created in STAR do **not** change.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| TIP project | One item of `data[].project[]` in the TIP `/publications` response |
| Primary project | The TIP project with `is_primary: true` |
| `toc_mapping` | Object on a TIP project carrying `science_program_id`, `aow_compose_code`, `toc_result_id`, `toc_internal_id`, `result_title`, `toc_result_indicator_id` (UUID), `result_indicator_description`, `result_indicator_type_name`, `target_contribution`; or `null` |
| Result contract | A `result_contracts` row with `contract_role_id = ALIGNMENT` |
| Pool-funding alignment | The active `result_pool_funding_alignment` row + its SP rows (`result_pool_funding_alignment_sp`) |
| ToC row | The active `result_pool_funding_toc_alignment` row for an SP |
| Eligible | STAR's per-contract fact: primary contract has `agresso_contracts.is_pool_funding_contributor = 1` or an active `bilateral_project_mapping` |
| Display-only | A non-eligible result whose pool-funding alignment is still returned, read-only |
| STAR user save | `PATCH` through `BilateralService.updateAlignment` with all its gates |

## 3. System context & scope

**Current behavior** (cited at `3ee449e41`):

- `TipIntegrationService.processing` keeps only the first project: `projectId = result.project[0].agreement_id` and `contracts: [{ contract_id: projectId, is_primary: true }]` — `server/researchindicators/src/domain/tools/tip-integration/tip-integration.service.ts:231-238, 316-321`.
- `TipProjectDto` has only `agreement_id` and `description` — `tools/tip-integration/dto/response-year-tip.dto.ts:9-12`.
- No pool-funding data is written for TIP results; the PRMS import has a gate-free writer, `BilateralService.importAlignmentFromPrms` — `entities/bilateral/bilateral.service.ts:941-998`.
- Alignment contracts are replaced as a whole and, when more than one is primary, **none** stays primary — `entities/result-contracts/result-contracts.service.ts:63-71` (`unsetMultiplesPrimary`).
- `result_contracts.contract_id` has a FK to `agresso_contracts.agreement_id` — `server/researchindicators/src/db/baseline/baseline.sql:2936`; an unknown id fails the save and the whole TIP result is rolled back and counted as `ERROR` — `shared/services/save-all-sections.service.ts:262-276`.
- A user cannot edit pool funding on a TIP result (`assertNonPrmsExternalSourceWritable`, `bilateral.service.ts:1888-1905`); the read shows the alignment only if eligible or display-only — `bilateral.service.ts:653-658`.

**In scope:** server TIP sync (`tools/tip-integration/`), a TIP pool-funding import entry on `BilateralService`, the display-only read rule for TIP results.

**Out of scope:**

- Any change to `updateAlignment` or its gates (STAR user saves).
- Storing `aow_compose_code`, `toc_internal_id` or `result_indicator_type_name` — no column exists and no migration is added.
- Contributing SPs from non-primary projects (TIP sends `toc_mapping: null` for them).
- Changing `agresso_contracts.is_pool_funding_contributor` from TIP data.
- Client changes (the sidebar already honours `display_only` — `client/research-indicators/src/app/shared/components/result-sidebar/result-sidebar.component.ts:125`).
- The IPR export (`getAllIprData`), which reads contracts but is not changed.

## 4. Stakeholders

| Persona | Interest |
| --- | --- |
| MEL / reporting staff | TIP knowledge products arrive with all their projects and their pool-funding mapping, not just one contract |
| Center admins / PIs | See TIP results' pool-funding mapping read-only in STAR |
| STAR contributors | Their own save rules are unchanged |
| TIP team | Their new `project[]` attributes are consumed |

## 5. Functional requirements

### R-TIP-001 — Every TIP project becomes a result contract with TIP's primary flag

The sync SHALL save every TIP project with a non-empty `agreement_id` as an alignment contract of the result, carrying `is_primary` from TIP.

- The primary contract SHALL be chosen as follows (unknown = not in `agresso_contracts`, R-TIP-002):
  - one or more projects flagged `is_primary: true` → the **first flagged** one; every other project is saved non-primary. If that flagged project is unknown, **no** project is promoted and the result has no primary contract (R-TIP-002);
  - none flagged (older payload, or the single-object `project` form) → the **first known** project (today's behavior, minus unknown ids).
- So the result ends with exactly one primary contract unless TIP flagged an unknown project or no project is known.
- `createResult.contract_id` SHALL be the primary's `agreement_id`; when there is no primary, the first known project's `agreement_id`; null only when no project is known.
- Repeated `agreement_id`s SHALL be saved once (the first occurrence's flag wins).

#### Scenario: Three projects, one primary

- GIVEN a TIP publication with projects `A132 (is_primary true)`, `A171 (false)`, `A1824 (false)`, all present in `agresso_contracts`
- WHEN the TIP sync runs
- THEN the result has three active alignment contracts `A132, A171, A1824`
- AND only `A132` has `is_primary = true`
- BUT it must NOT keep only the first project, as it does today

#### Scenario: Two projects flagged primary

- GIVEN projects `A171 (is_primary true)`, `A132 (is_primary true)`
- WHEN the sync runs
- THEN `A171` is primary and `A132` is non-primary
- AND IT MUST still have one primary contract (never zero, which `unsetMultiplesPrimary` would produce if both were sent as primary)

#### Scenario: Legacy payload without flags

- GIVEN `project` is a single object `{ agreement_id: 'A132', description }` or an array without `is_primary`
- WHEN the sync runs
- THEN the first project is the only primary contract, exactly as today

#### Scenario: Legacy payload whose first project is unknown

- GIVEN `project` is `[ZZ999 (unknown), A171 (known)]` without `is_primary`
- WHEN the sync runs
- THEN `A171` is the only (primary) contract

#### Scenario: Re-sync moves the primary

- GIVEN a TIP result saved with `A132` primary and `A171` non-primary
- WHEN TIP later sends `A171` flagged primary and `A132` not
- THEN `A171` is the only primary contract and `A132` stays active as non-primary

### R-TIP-002 — Unknown agreement ids are skipped, not fatal

A TIP project whose `agreement_id` is not in `agresso_contracts` SHALL be left out of the contracts, with a `warn` log naming the TIP id and the agreement id; the result and its other contracts SHALL still be saved.

- When the project TIP **flagged** primary is unknown, no other project is promoted; the result is saved with its known contracts as non-primary, `createResult.contract_id` is the first known project's id (so result creation never runs with a null contract while a known one exists), and no pool-funding import runs for it (R-TIP-003 needs a primary contract).

- When **no** project is known, the result is saved with no contract and `createResult` runs with a null `contract_id` — the path an empty `project[]` already takes today (its user-to-contract link call and contract lookup run with null; the SDGs it copies are replaced by TIP's own `result_sdgs` in the same save). Accepted residual; a `warn` names the TIP id.

#### Scenario: One unknown non-primary project

- GIVEN projects `A132 (primary, known)` and `ZZ999 (unknown)`
- WHEN the sync runs
- THEN the result is saved (`createdRecords` or `updatedRecords` increments, not `errorRecords`)
- AND its contracts are `A132` only
- AND a warn line names `ZZ999`
- BUT it must NOT roll the result back

#### Scenario: Unknown primary

- GIVEN `ZZ999 (primary, unknown)`, `A171 (known)` with a `toc_mapping` on `ZZ999`
- WHEN the sync runs
- THEN the result is saved with `A171` as a non-primary contract
- AND `createResult.contract_id` was `A171`, not null
- AND no pool-funding alignment is written

### R-TIP-003 — The primary project's `toc_mapping` becomes the pool-funding alignment

When the primary project (as resolved by R-TIP-001, and known per R-TIP-002) has `is_contributing_to_pool_funding: true` **and** a `toc_mapping` with a non-empty `science_program_id`, the sync SHALL write:

| Target | Value |
| --- | --- |
| alignment `has_contribution` | `true` |
| SP rows | one row, `sp_code = science_program_id`, role `PRIMARY` |
| ToC row `aligns_with_toc` | `true` |
| ToC row `toc_result_id` | `toc_mapping.toc_result_id` |
| ToC row `level` | the level under which the ToC catalog lists that `toc_result_id` for the SP and the result's year; `null` when the catalog has no match or cannot be reached |
| ToC row `indicator_id` | the catalog indicator whose `toc_result_indicator_id` equals `toc_mapping.toc_result_indicator_id`; `null` when not found |
| ToC row `quantitative_contribution` | `toc_mapping.target_contribution` as a number (a numeric string is accepted; absent or non-numeric → null; stored at the column's 2 decimals) |
| ToC row `toc_result_title` | `toc_mapping.result_title` |
| ToC row `indicator_description` | `toc_mapping.result_indicator_description` |
| ToC row `unit_messurament`, `target_value`, `target_year` | from the matched catalog indicator when matched, else null |

- The import SHALL run only for results the save **created or updated in this run**, on the row it wrote; a result the save omitted (higher-priority duplicate) or failed SHALL NOT be imported.
- When a `toc_result_id` or indicator UUID matches more than one catalog entry, the first match in `OUTPUT`, `OUTCOME`, `EOI` order wins and a `warn` is logged.
- A re-sync SHALL leave exactly one active alignment and ToC row; when the active ones already hold the incoming values, nothing is rewritten.
- The ToC catalog being down (any level) SHALL NOT fail the result or the alignment write, and a failure on one level SHALL NOT discard a match found on another.
- When the catalog **fails** (as opposed to answering without a match) and the active ToC row already has the same `toc_result_id`, its catalog-derived columns (`level`, `indicator_id`, `unit_messurament`, `target_value`, `target_year`) SHALL be kept, never overwritten with nulls.
- A result the save counted as `ERROR` after writing (e.g. duplicate cleanup threw) is not imported in that run; the next run imports it.
- The actor recorded on the rows SHALL be the TIP submitter's STAR user when resolved, else null.

#### Scenario: Primary with full mapping

- GIVEN the sample payload (primary `A132`, `SP01`, `toc_result_id 7033`, indicator UUID `f3706ba2-…`, `target_contribution 1`)
- AND the catalog lists 7033 under `SP01:OUTPUT` with that indicator UUID mapped to integer indicator `N`
- WHEN the sync runs
- THEN the result has an active alignment with `has_contribution = true` and one SP row `SP01 / PRIMARY`
- AND one active ToC row with `toc_result_id 7033`, `level 'OUTPUT'`, `indicator_id N`, `quantitative_contribution 1`, `toc_result_title 'HLO1.AOW1.IO1 Steer to impact'`

#### Scenario: Catalog unavailable

- GIVEN the catalog call throws
- WHEN the sync runs
- THEN the ToC row is still written with `toc_result_id 7033`, TIP's title and description, `level null`, `indicator_id null`
- AND the result counts as created/updated, not error

#### Scenario: Re-sync is idempotent

- GIVEN the result was already imported with this mapping
- WHEN the sync runs again
- THEN exactly one active alignment, one active SP row and one active ToC row exist for it
- AND no alignment row was deactivated or inserted

#### Scenario: Catalog down on a later sync

- GIVEN a TIP result already imported with `level 'OUTPUT'` and `indicator_id N`
- WHEN a later sync runs while every catalog level throws, with the same mapping
- THEN the ToC row still has `level 'OUTPUT'` and `indicator_id N`
- BUT it must NOT overwrite them with null

#### Scenario: Same publication in two years

- GIVEN the same `link` is returned for 2025 (mapping `SP01 / 7033`) and 2026 (mapping `SP02 / 8001`)
- WHEN the sync runs over both years
- THEN the 2025 row carries `SP01 / 7033` and the 2026 row carries `SP02 / 8001`
- BUT it must NOT write one year's mapping onto the other year's row

#### Scenario: Result skipped as a duplicate

- GIVEN an older TIP row exists for the link and year, and the save omits the incoming result
- WHEN the sync runs
- THEN no pool-funding alignment is written to that older row

### R-TIP-004 — External import bypasses STAR save rules; STAR rules stay

The TIP pool-funding write SHALL NOT apply any `updateAlignment` gate: external-source (TIP) read-only gate, reporting-year lock, pool-funding contributor check, already-synced check, SP-catalog check, primary-SP rules, ToC level-by-result-type rule (`level_not_allowed` — Knowledge Products have no allowed level), indicator/contribution validation. It SHALL write no review-history entry and emit no socket event.

#### Scenario: Knowledge product imported at a level STAR forbids

- GIVEN a TIP knowledge product whose catalog level resolves to `OUTPUT`
- WHEN the sync runs
- THEN the ToC row is saved with `level 'OUTPUT'`
- BUT it must NOT raise `level_not_allowed`

#### Scenario: STAR rules unchanged

- GIVEN a STAR-platform knowledge product
- WHEN a contributor saves pool funding with a ToC entry at level `OUTPUT`
- THEN the save is rejected with `level_not_allowed`, as before
- **Superseded 2026-10-22 (owner decision, confirmed with product):** Knowledge Products allow the ToC level `OUTPUT`, so this STAR rejection no longer holds — a STAR knowledge product's `OUTPUT` entry is accepted and `OUTCOME` is still rejected. Delivered by `changes/tip-prms-phase-2/prms-platform-identity` T-10 (see its `design.md` §10 and `execution.md`). The external-source gate line below is unchanged.
- AND a user `PATCH` on a TIP result's pool funding is still rejected by the external-source gate

### R-TIP-005 — No mapping, no change

When the primary project has `is_contributing_to_pool_funding` not `true`, or `toc_mapping` null, or no `science_program_id`, or there is no primary project, the sync SHALL leave the result's existing pool-funding alignment and ToC rows untouched (neither created nor deactivated).

#### Scenario: Mapping disappears on re-sync

- GIVEN a TIP result already imported with an SP01 alignment
- WHEN TIP later sends its primary project with `toc_mapping: null`
- THEN the SP01 alignment and ToC row stay active and unchanged
- BUT it must NOT write `has_contribution = false`

### R-TIP-006 — Imported TIP alignment is visible read-only even when not eligible

`GET` pool-funding alignment for a **TIP-platform** result that is not eligible but has an active pool-funding alignment SHALL return it as `display_only: true` (read-only), so the Pool Funding tab shows it.

#### Scenario: TIP flag says contributing, STAR contract not eligible

- GIVEN a TIP result with an imported SP01 alignment whose primary contract has `is_pool_funding_contributor = 0` and no project mapping
- WHEN the alignment is read
- THEN the response has `eligible: false`, `display_only: true`, `is_read_only: true` and carries the SP01 alignment and ToC row

#### Scenario: Boundaries of the widening

- GIVEN a STAR-platform result that is not eligible and has an active alignment
- WHEN it is read
- THEN `display_only` is computed exactly as today (snapshot, synced, or PRMS code)
- AND a TIP result that is not eligible and has **no** active alignment stays `display_only: false`

### R-TIP-007 — Pool-funding failure is isolated per result

An error while importing one result's pool funding SHALL be logged with the TIP id and SHALL NOT fail that result's other sections, change its counter, or stop the batch.

#### Scenario: One import throws

- GIVEN two TIP results with mappings, the first one's alignment write throws
- WHEN the sync runs
- THEN the second result's alignment is written
- AND both results keep their `created`/`updated` counter
- AND an `error` log names the first TIP id

## 6. Non-functional requirements

### NFR-TIP-001 — Catalog calls stay bounded

- **Category:** performance
- **Target:** at most one catalog fetch per distinct `(SP, level, year)` per sync run — held by a per-run memo in the import step, since the existing `getTocResults` cache only holds for its 5-minute TTL and a multi-year run lasts longer; at most three level fetches per SP.
- **How verified:** unit test counting catalog calls over a batch sharing one SP.
- **Note (K-016):** `getTocResults` is TTL-cached; a catalog change can take one TTL window to appear in a re-sync.

### NFR-TIP-002 — Observability

- **Category:** observability
- **Target:** one `warn` per skipped agreement id; one `warn` per catalog miss (toc_result_id or indicator UUID not found); one `error` per failed pool-funding import. No tokens or payload dumps in logs.
- **How verified:** unit tests asserting the logger calls.

## 7. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| Wrong mapping of `project[]` → contracts (primary lost, extra primary, legacy shape broken) | `npm test -- --silent` (server) — `tip-integration.service.spec.ts` with fixtures that vary the primary flag per project |
| Two primaries reach `unsetMultiplesPrimary` and leave none | unit test on the payload `processing` builds (only one `is_primary: true`) |
| Unknown agreement id still kills the result | unit test with the agresso lookup returning a subset |
| Pool-funding write runs a STAR gate (e.g. `level_not_allowed`) | unit test calling the TIP import for a KP at `OUTPUT` and asserting the persisted args |
| STAR user-save rules regress | existing `bilateral.service.updateAlignment.*.spec.ts` suites green, plus one KP `level_not_allowed` assertion |
| Mapping written to the wrong row (other year, snapshot, skipped duplicate) | unit test: two years of one link with different mappings; an omitted save (counter unchanged) → no import call |
| Wrong catalog lookup (level / UUID → int) | unit test with a catalog fixture where the UUID maps to an integer different from any other field |
| Display-only widening leaks to STAR results | unit test on `buildAlignment` for STAR vs TIP, eligible vs not, with/without alignment |
| DTO / type mismatch (UUID into `int`) | `npm run build` (server) — the compiler is stricter than jest's transpile |
| Real TIP payload / catalog shape differs from the sample | **No automated check** — substitute: a human check at the HITL pause running the TIP sync on Dev for agreement `A132`, year 2026, and reading the result's Alignment and Pool Funding tabs |

## 8. Requirement ID index

| ID | Title |
| --- | --- |
| R-TIP-001 | Every TIP project becomes a result contract with TIP's primary flag |
| R-TIP-002 | Unknown agreement ids are skipped, not fatal |
| R-TIP-003 | Primary `toc_mapping` becomes the pool-funding alignment |
| R-TIP-004 | External import bypasses STAR save rules; STAR rules stay |
| R-TIP-005 | No mapping, no change |
| R-TIP-006 | Imported TIP alignment visible read-only when not eligible |
| R-TIP-007 | Pool-funding failure isolated per result |
| NFR-TIP-001 | Catalog calls stay bounded |
| NFR-TIP-002 | Observability |

## 9. Assumptions, risks, open questions

| # | Item | Owner |
| --- | --- | --- |
| A-1 | TIP's `science_program_id` uses the same codes as STAR's SP catalog (`SP01`…) — user-stated by sample payload | settled at HITL Dev run |
| A-2 | `toc_result_id` from TIP is the same integer id the lambda-toc catalog uses — user-stated by sample payload | settled at HITL Dev run |
| R-0 | The IPR export (`tipIntegrationMapper`) reads `result_contracts[0]`, which may now be a non-primary contract for TIP results — accepted, export out of scope | — |
| R-1 | Non-primary projects flagged `is_contributing_to_pool_funding: true` carry no SP, so they add nothing to pool funding — accepted, out of scope | — |
| R-2 | The display-only widening shows TIP mappings on contracts STAR does not consider pool-funding — accepted by the user on 2026-10-20 (external data prioritised) | — |

Decisions taken with the user on 2026-10-20: show imported TIP mappings even when not eligible (R-TIP-006); no mapping → no change (R-TIP-005); unknown agreement ids are skipped (R-TIP-002).

## 10. Sign-off

- [ ] Engineering lead — David Casañas
- [ ] MEL / product owner — <name>
