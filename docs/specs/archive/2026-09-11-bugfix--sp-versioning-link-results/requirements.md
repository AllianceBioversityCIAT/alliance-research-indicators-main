# Requirements — `SP_versioning` does not copy `link_results`

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/sp-versioning-link-results` |
| Depth | **Lite** |
| Mode | **Bug** |
| Type | Bug — data loss on version snapshot |
| Status | **Approved** 2026-09-11 (both open questions resolved by the user — see Confirmed Decisions) |
| Date | 2026-09-11 |
| Related | `docs/specs/bugfix/sp-versioning-roles-id` (same routine, same fixture pattern) · `docs/specs/innovation-use/link-innovation-dev` (writes the role-5 link) |

## Executive Summary

`SP_versioning` copies **30** child tables onto a new snapshot. `link_results` is not one of them, so **every version snapshot loses every result-to-result link** — the user-visible symptom is Innovation Use's *Related innovation development* coming back empty on a versioned result.

## Bug Diagnosis (confirmed, not assumed)

| Evidence | Finding |
| --- | --- |
| Live `SP_versioning` body (read from the DB, 2026-09-11) | 30 `INSERT INTO` blocks; **no `link_results`** |
| `link_results` across all migrations | Every occurrence is in a **delete** routine — never in `SP_versioning` |
| `link_results` FKs (`1730900555793`) | `result_id` **and** `other_result_id` → `results`, both `ON DELETE NO ACTION` |

Not a design choice — an omission. The delete side already knows the table exists; only the copy side does not.

**Delete routines were audited before proposing the copy**, because adding rows the deletes cannot remove would turn a data-loss bug into an FK failure (MySQL 1451, the exact failure `sp-versioning-roles-id` T-02b documents):

| Routine | Kind | `link_results` handling |
| --- | --- | --- |
| `SP_delete_result_version` | physical (snapshot) | `DELETE` on `result_id` **OR** `other_result_id` |
| `full_delete_result_version` | physical | `DELETE` on `result_id` **OR** `other_result_id` |
| `SP_full_delete_results_by_platform` | physical (per platform) | covered **transitively** — it owns no `DELETE`, it loops and calls `full_delete_result_version` |
| `delete_result` | logical | `UPDATE is_active = 0` on **`result_id` only** |

**Every physical delete path already clears both FK directions, so the copy is safe to add.**

## Confirmed Decisions

Both open questions were put to the user and answered on 2026-09-11. They are decisions now, not assumptions — a later reader who disagrees is reopening a settled call, not discovering an oversight.

| # | Question | Ruling |
| --- | --- | --- |
| 1 | Should the copied link point at the **live** linked result, or at a snapshot of it? | **Live result.** Consistent with every other block, which carries its foreign ids unchanged (DD-3). Accepted consequence: a version snapshot references the innovation dev as it stands *now*, not as it stood when the version was cut |
| 2 | Should `delete_result`'s one-direction soft delete be fixed here? | **No — out of scope.** A pre-existing, independent defect. Folding it in would break Bug Mode's "keep the fix scoped to the root cause" and would push this spec past Lite |

## Functional Requirements

### R-SPL-001 — A version snapshot carries the source result's active links

`SP_versioning` **SHALL** copy every **active** `link_results` row owned by the result being versioned onto the new snapshot, with no filtering by `link_result_role_id`.

#### Scenario: Innovation Use link survives versioning

- GIVEN an active, non-snapshot STAR result with an active `link_results` row (`result_id` = that result, any `link_result_role_id`)
- WHEN `SP_versioning` is called for its `result_official_code`
- THEN a `link_results` row exists whose `result_id` is the new snapshot's id
- AND its `other_result_id` and `link_result_role_id` equal the source row's
- AND it receives a fresh `link_result_id` — the source row's id is NOT reused
- BUT it must NOT copy rows where `is_active = FALSE`
- BUT it must NOT copy rows where the versioned result is only the **target** (`other_result_id`) — see DD-2
- AND IT MUST leave the source row untouched

### R-SPL-002 — Nothing else in the procedure changes

Re-declaring the procedure **MUST NOT** alter any of the 30 existing blocks.

#### Scenario: the other 30 tables still copy

- GIVEN the migration has been applied
- WHEN a result carrying rows in the previously-copied tables is versioned
- THEN those rows are copied exactly as before
- AND IT MUST be shown by diffing the new procedure body against the old one — the only difference being the added block

## Non-Functional Requirements

- **NFR-SPL-001** — `down()` restores the current procedure body verbatim.
- **NFR-SPL-002** — No schema change. No table, column, index, or FK is added or altered.

## Defect classes and their gates

| Defect class this spec can produce | Gate that catches it | Can it go red? |
| --- | --- | --- |
| The added block copies nothing / wrong columns | `test:fixtures` — calls the **real** SP against the scratch schema | Yes: red before the migration, green after |
| Transcription error in the ~1,000 re-pasted lines (MySQL has no partial `ALTER PROCEDURE`; the whole body must be re-declared) | Body diff, old vs new (R-SPL-002) | Yes: any unintended edit shows as a second hunk |
| A copied row breaks a later physical delete (FK 1451) | Fixture asserts version → delete-version → re-version, the `sp-versioning-roles-id` T-02b sequence | Yes |
| **Prod behaviour after merge** | **No automated gate.** The pipeline deploys code; applying a migration to Prod is a separate human decision (root `CLAUDE.md`, K-015) | **Accepted risk — recorded, not substituted** |

## Requirement ID Index

| ID | Title |
| --- | --- |
| R-SPL-001 | A version snapshot carries the source result's active links |
| R-SPL-002 | Nothing else in the procedure changes |
| NFR-SPL-001 | `down()` restores the current body |
| NFR-SPL-002 | No schema change |
