# Design — `SP_versioning` copies `link_results`

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/sp-versioning-link-results` |
| Depth | **Lite** |
| Satisfies | R-SPL-001, R-SPL-002, NFR-SPL-001, NFR-SPL-002 |

## Executive Summary

One `INSERT … SELECT` block added to `SP_versioning`, shaped exactly like the 30 already there. No schema change, no application code, no API.

## Data Model

`link_results` (`1730900555793`) — audit columns from `AuditableEntity` plus:

| Column | Note |
| --- | --- |
| `link_result_id` | PK, `AUTO_INCREMENT` — **never carried over**, the copy takes a fresh one |
| `result_id` | FK → `results`. The link's **owner**. Remapped to the snapshot |
| `other_result_id` | FK → `results`. The **target**. Copied as-is |
| `link_result_role_id` | FK → `link_result_roles`. Copied as-is |

## Design Decisions

### DD-1 — Follow the established block shape, do not invent one

The block mirrors the other 30: explicit column list, `new_result_id AS result_id`, `WHERE x.is_active = TRUE AND x.result_id = temp_result_id`. Audit columns are carried from the source row, as every sibling block does. Placement is immediately after the `result_innovation_use` block — adjacency to the feature that surfaced the defect, with no ordering constraint: `link_results` has no FK to any other child table.

### DD-2 — Copy only rows the result **owns** (`result_id`), not rows that **point at it**

`link_results` is the only table in this procedure with **two** FKs to `results`. Copying the `other_result_id` side too would fabricate links the source result never owned and would double-count any pair where both ends are versioned.

Consistency check with the delete side: the physical deletes use `result_id OR other_result_id` — deliberately **wider** than this copy. That asymmetry is correct. A delete must clear every FK that could block `DELETE FROM results`; a copy must reproduce only what the result owns. Copying both sides to "match" the deletes would be the wrong inference.

**Consequence, stated so it is not later mistaken for this same bug:** after versioning, a link *from another result to* the versioned one still points at the live result, never at the snapshot. That is the intended reading of "the snapshot is a copy of this result".

### DD-3 — `other_result_id` keeps pointing at the live linked result *(user-confirmed 2026-09-11)*

Every other block carries its foreign ids unchanged (`institution_id`, `contract_id`, …). `other_result_id` is different only in that it targets `results` itself — but the linked result is a separate aggregate with its own version lifecycle, and there is no snapshot of it to point at (and if there were, it would belong to a different `result_official_code`). Rewriting it would invent a relationship the source never had.

### DD-4 — The whole procedure is re-declared, and that is the main risk

MySQL cannot patch a routine body; `DROP PROCEDURE` + `CREATE PROCEDURE` re-declares all ~1,000 lines. The dominant defect class is therefore **transcription**, not logic. Mitigation is mechanical, not careful reading: build the new body by taking the **currently deployed** body verbatim and inserting one block, then diff old against new and require exactly one hunk (R-SPL-002).

### DD-5 — `delete_result`'s one-direction soft delete stays out of scope *(user-confirmed 2026-09-11)*

`delete_result` deactivates `link_results` on `result_id` only, so a logically-deleted result keeps active links pointing *at* it from elsewhere. Real, pre-existing, and independent of this bug — it predates the copy and is unaffected by adding it. Deliberately not folded in: Bug Mode requires the fix stay scoped to the root cause, and touching a second routine would push this spec past Lite depth.

### DD-6 — Reversion challenge

Not applicable: this adds a block and removes nothing. No behaviour already delivered is reverted.

## Verification Strategy

Fixture-level, against the real routine — never against emitted SQL strings (KZ-001), the stance `sp-versioning-roles-id` established for this exact procedure.

- Harness: `npm run test:fixtures` (`test/jest-fixtures.json`), `*.fixture-spec.ts` under `test/fixtures/`.
- Scratch schema: `npm run migration:test:bootstrap` (baseline load + migrations) against the **disposable TEST schema** — never the shared Dev DB.
- The fixture seeds its own minimal chain and removes it in `afterAll`, per the existing file's contract.

**Scope limit (KZ-017):** `npm test` has `rootDir: src` and never runs `test/fixtures/`. A green `npm test` is not evidence for this spec.

## Budget (tripwire for `/akili-execute`)

| Metric | Expected |
| --- | --- |
| Tasks | **2** |
| LOC | **~1,080** — of which ~1,020 is the verbatim re-declaration required by DD-4; the genuinely new logic is **~14 lines** |
| Review rounds | **1** |

Exceeding this stops execution and escalates.
