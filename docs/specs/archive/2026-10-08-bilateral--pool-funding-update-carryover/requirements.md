# Requirements — Bilateral / Pool Funding carry-over on "Update result"

## 1. Document Control

| Field | Value |
| --- | --- |
| Module | bilateral (server only) |
| Spec id | 2026-10-pool-funding-update-carryover |
| Depth | Standard (narrow) |
| Type | Enhancement |
| Approval Mode | `pre-approved` — owner instruction 2026-10-08: "judgment once, a second round only if needed, then continue automatically". Every routine gate below is logged as `auto-approved (pre-approved mode)` |
| Owner | d.casanas@cgiar.org |
| Baseline commit | `d59c5d6db` |
| Related specs | `archive/2026-10-08-bilateral--pool-funding-reporting-year` (R-PRY-007 display-only), `bugfix/pool-funding-alignment-versioning` (SP_versioning copies Pool Funding to the snapshot) |
| Gate log | Phase 1 — auto-approved (pre-approved mode), 2026-10-08 |

## 2. Executive Summary

**Problem.** When a result is approved, `SP_versioning` *moves* its Pool Funding section to the new snapshot (copy, then deactivate on the live row). When the user later clicks **Update result**, the live result goes back to Draft with the chosen reporting year — but its Pool Funding section is empty, even when the chosen year already has an approved version holding that data.

**Change.** On **Update result**, if the selected reporting year already has an approved version (snapshot) of the result, the server copies that version's active Pool Funding data onto the live result, in the same transaction that moves the live result to Draft. The live result is never created or deleted — only its status/year change, and its Pool Funding rows are replaced.

**Not changed.** Whether the Pool Funding section is *shown* on the live result keeps the normal rules (eligible primary contract + reporting year, spec `pool-funding-reporting-year`). The carried-over data is stored regardless; visibility is decided at read time as today.

## 3. Glossary

| Term | Meaning |
| --- | --- |
| Live result | The `results` row with `is_snapshot = false` for a `result_official_code`. Never created or deleted by this flow |
| Version / snapshot | A `results` row with `is_snapshot = true`, one per approved reporting year |
| Update result | The STAR button (version selector) that calls `PATCH results/green-checks/new-reporting-cycle/:code/year/:year`; allowed only while the live result is Approved |
| Pool Funding section | The active rows of `result_pool_funding_alignment`, `result_pool_funding_alignment_sp`, `result_pool_funding_toc_alignment`, `result_pool_funding_indicator_mapping` for a result |
| Carry-over | Copying the snapshot's active Pool Funding section onto the live result |

## 4. System Context & Scope

Current behavior (cited; full rows in design §11 Premise Ledger):

- `newReportingCycle` only updates `report_year_id` and `result_status_id = DRAFT` on the live row and writes a history row — `green-checks.service.ts:592-650`.
- `SP_versioning` copies the live Pool Funding rows to the new snapshot and deactivates them on the live row (only when an alignment row existed) — `1791468452856-UpdateSPVersionDeletePRMSPhase.ts:820-904`.
- The year picker lists years with `has_reported` (a snapshot exists for that year) and still lets the user pick them, with a warning that the update will overwrite that version on approval — `report-year.repository.ts:12-45`, `global-alert.component.html:56-64`.

**In scope:** server carry-over inside `newReportingCycle`.
**Out of scope:** client changes (the page refetches after the update); the visibility rules (R-PRY-003/004/007 unchanged); years with no snapshot (live stays as it is today); backfilling results already updated before this change; `SP_versioning` behavior.

## 5. Stakeholders / Personas

| Persona | Need |
| --- | --- |
| Result contributor (STAR) | Re-opening an approved year keeps the Pool Funding work already approved, so it is edited instead of re-typed |
| Owner / MEL | The re-approved version contains the same Pool Funding data unless deliberately changed |

## 6. Functional Requirements

### Requirement R-PUC-001: Carry over Pool Funding from the selected year's version

The system SHALL, when **Update result** is confirmed for year *Y* and an active snapshot of the same result exists for *Y*, replace the live result's Pool Funding section with a copy of that snapshot's active Pool Funding section.

#### Scenario S-1: Year with a version

- GIVEN result *C* is Approved, its live row has no active Pool Funding rows, and its active 2025 snapshot holds an active alignment (`has_contribution`), 2 active SP rows, 1 active ToC row and 1 active indicator mapping
- WHEN the user confirms Update result with year 2025
- THEN the live result is Draft with year 2025
- AND the live result holds exactly one active alignment with the snapshot's `has_contribution`, the same 2 SP rows (`sp_code`, `sp_role`) attached to that new alignment, the same ToC row values, and the same indicator mapping values
- AND IT MUST leave every snapshot row unchanged (same ids, still active)
- BUT it must NOT copy snapshot rows that are inactive

#### Scenario S-2: Live already holds active Pool Funding rows

- GIVEN the live result still holds active Pool Funding rows (e.g. ToC rows left active because no alignment existed when it was versioned)
- WHEN Update result is confirmed for a year that has a version
- THEN the live alignment, SP and ToC rows are deactivated (`is_active = false`, `deleted_at` set), the live indicator-mapping rows (active and inactive) are replaced, and the snapshot's rows are copied
- AND IT MUST end with at most one active alignment on the live result
- AND IT MUST succeed, and leave a state a later re-approval can version, when the live result holds an active and/or inactive indicator mapping with the same (lever, indicator) key as a snapshot mapping — the mapping table's unique index includes `is_active` (design P-10)
- BUT it must NOT delete or re-create the live `results` row, must NOT touch any snapshot row, and must NOT hard-delete any live row outside `result_pool_funding_indicator_mapping` (design D-9)

#### Scenario S-3: Year without a version

- GIVEN no active snapshot of *C* exists for the selected year
- WHEN Update result is confirmed
- THEN the live result becomes Draft with that year exactly as today
- BUT it must NOT touch any Pool Funding row

#### Scenario S-4: Version has no Pool Funding data

- GIVEN the selected year's snapshot has no active Pool Funding rows
- WHEN Update result is confirmed
- THEN the live result's active alignment/SP/ToC rows (if any) are deactivated, its indicator mappings removed, and nothing is inserted — the live section mirrors the version (empty)

#### Scenario S-8: Repeated cycles

- GIVEN result *C* has gone through approve → Update result (carry-over) once — including the case where the live result still held an **active** mapping sharing a key with the snapshot when the carry-over ran
- WHEN it is approved again (`SP_versioning`) and Update result is confirmed again for a year that has a version
- THEN both the re-approval and the second carry-over succeed (no duplicate-key error) and the live result ends with the snapshot's rows active

### Requirement R-PUC-002: Indicator-mapping links point at the live result

The system SHALL write each carried-over indicator mapping's non-null section link (`result_capacity_sharing_id`, `result_knowledge_product_id`, `result_policy_change_id`, `result_innovation_dev_id`) as the live result's id, and keep a null link null.

#### Scenario S-5

- GIVEN the snapshot mapping has `result_knowledge_product_id` set and the other three null
- WHEN it is carried over
- THEN the live copy has `result_knowledge_product_id = <live result_id>` and the other three null
- BUT it must NOT keep a link pointing at the snapshot or at any other result

### Requirement R-PUC-003: All-or-nothing

The status/year change and the carry-over SHALL commit together.

#### Scenario S-6

- GIVEN any carry-over statement fails
- WHEN Update result is confirmed
- THEN the request fails with an error envelope, the live result stays Approved with its previous year, and no Pool Funding row changed
- AND IT MUST NOT write the Approved→Draft history row for the failed attempt

### Requirement R-PUC-004: Visibility unchanged

The live Pool Funding section SHALL keep the existing visibility rules; carry-over adds data, never visibility.

#### Scenario S-7

- GIVEN the carried-over live result's primary contract is not a Pool Funding contributor and the live result has no PRMS code and was never synced
- WHEN the user opens the live result
- THEN the Pool Funding section is hidden exactly as before this change

## 7. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-PUC-001 | Audit: inserted rows carry the acting user in `created_by`/`updated_by`; deactivated rows carry it in `updated_by` |
| NFR-PUC-002 | No schema change, no migration |
| NFR-PUC-003 | Endpoint contract (path, body, response envelope) unchanged |

### Defect classes → gate

| Defect class | Gate |
| --- | --- |
| Wrong SQL (column order, missing column, wrong id remap, unique-index collision incl. multi-cycle) | Real-MySQL fixture `npm run test:fixtures` (T-02). Mocked unit tests cannot see SQL semantics (KZ-017) |
| Service wiring (branch taken, transaction, history order) | Unit tests `green-checks.service.spec.ts` (T-01) |
| Type contract | `npx tsc --noEmit -p tsconfig.json` |
| Real flow in the app | Owner check on Dev after deploy (T-03, HITL) — no automated E2E covers this button |

## 8. Requirement ID Index

| ID | Scenarios | Tasks |
| --- | --- | --- |
| R-PUC-001 | S-1, S-2, S-3, S-4, S-8 | T-01, T-02 |
| R-PUC-002 | S-5 | T-01, T-02 |
| R-PUC-003 | S-6 | T-01 |
| R-PUC-004 | S-7 | T-03 (no code change) |
| NFR-PUC-001..003 | — | T-01, T-02 |
