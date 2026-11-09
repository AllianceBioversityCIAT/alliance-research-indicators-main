# Judgment Day — Innovation Development / Excel export design

| Field | Value |
| --- | --- |
| Target | `design.md` vs `requirements.md`, frozen at `13310040` (uncommitted spec files) |
| Mode | judgment_day, blind dual review |
| Judges | A and B, both `sonnet` (author ≠ auditor: the design was written on `opus`), read-only, identical prompt; read-only SELECT/EXPLAIN on scratch only |
| Round | 1 |
| Status | **Round 1 fixed, not re-judged** (user chose *Fix only*, 2026-10-06) |

## Confirmed (both judges)

| ID | Severity | Finding | A | B | Architect check |
| --- | --- | --- | --- | --- | --- |
| C-1 | **SEVERE** (both) | §5 matches the 27 seed rows by `field_label`, but `Actors` and `Organizations` also exist as active **Innovation Use** dictionary rows (`1791400000000` `DICTIONARY_ROWS`, fill `FF6A1B9A`). The UPDATE would rewrite them, or the "count = 27" guard sees 29 and throws everywhere. P-10 ("every other row untouched") refuted | J-1 | J-1 | Accepted on the judges' scratch reads |
| C-2 | SEVERE (B) / WARNING (A) | `applies` for cols 85, 95, 112 compares nullable columns but §3.2 wraps only `U`/`L7`/`T`. `report_field` treats NULL `applies` as TRUE → variety NULL gives 85 = `NP` (function TRUE), ks NULL gives 95 = `NP` beside 94, ep NULL gives 112 = `NM`. Breaks NFR-IDX-002 | J-5 | J-2 | Accepted — the §3.1 general sentence existed, the table contradicted it |
| C-3 | SEVERE (A) / WARNING (B) | `down()` "restores from seed constants" cannot be exact: (a) `1780690000000:38-39` (and `1781215000000`) shift every dictionary row with `sort_order >= 26` by +1, so the seed's 58–84 are not the live values; P-6 partly refuted, and its grep could not see this; (b) the seed loader stores `''` as NULL (`1777025000000:45-60`); (c) `MAX + k` inside a self-referencing UPDATE hits error 1093 unless read once through a derived table, as the precedent does | J-2, J-9 | J-4 | (a) re-run by the architect: `1780690000000…ts:38-39` `AND sort_order >= 26` → **confirmed** |
| C-4 | WARNING | Requirements not updated for DD-1: NFR-IDX-001 still says the view merges "under Phase 2" and is verified on "the real Phase 2 SQL"; NFR-IDX-003 says "restores the previous view state" while DD-6 drops the view | J-4 | J-6, J-7 | Accepted |
| C-5 | WARNING | Merge plan under-specified: no fill when Phase 3 lacks a row (cells blank instead of `NA`), key typing (bigint → number/string), and the repository spec pins call indexes that shift | J-8 | J-8 | Accepted |

## Suspect (one judge — not auto-fixed)

| ID | Severity | Finding | Judge |
| --- | --- | --- | --- |
| S-1 | **SEVERE** | The view name is owned on Dev by `1781300000000-CreateReportInnovationDevView` (branch `origin/dev`), whose `down()` is `DROP VIEW IF EXISTS report_innovation_dev`. If Thursday's removal runs that `down()` after this view is deployed, Dev's view disappears and every Dev export 500s. Conflicts with HITL ruling 2 → **user decision** | A J-3 |
| S-2 | WARNING | Yes/No cells (84, 89, 94, 99) need a NULL-safe mapping; `IF(b,'Yes','No')` turns NULL into `No` and hides the `NP` of 94/99 | B J-3 |
| S-3 | WARNING | The 32 final labels are not listed; "remove newlines" taken literally yields `Formulation:Is it…` | B J-5 |
| S-4 | WARNING | Org type-78 custom name: the check uses `IS NOT NULL`, not `valid_text`; the design states it only for actors | A J-6 |
| S-5 | WARNING | NFR-IDX-002 is unconditional, but the design names two divergences (inactive `rid`, role ≠ 1) | A J-7 |

## INFO (suggestions)

B J-9 (NULL `is_organization_known` / flag fixtures) · B J-10 (P-12 narrows to `role <> 1`, roles are NOT NULL FKs) · B J-11 / A J-11 (OQ-1/OQ-2 still open; budget buffer — precedent ended at 7 tasks) · B J-12 / A J-8 (`SET LOCAL` is session-scoped, pre-existing) · A J-10 (duplicate headers `Actors`/`Organizations` across sections are intended).

## Held under attack

DD-1 evidence reproduced by both (60 top-level tables; +2 → 56 with `report_innovation_use` un-merged; lateral wrapper → 61). Green-check transcription matches the live function apart from C-2/S-4/S-5. Counts reconcile (32 = 81–112 = 27 + 5; 4 laterals). Enums for 5, 78, dissemination 2, expansion 2 exist.

## Premise Ledger verdicts (merged)

Confirmed: P-1, P-2, P-3, P-4, P-5, P-9, P-11, P-15. **Refuted:** P-6 (sort range, collision), P-10 (C-1). Not re-run: P-7, P-8, P-12, P-13, P-14. Missing rows: label collision (C-1), real `sort_order` after the +1 shifts (C-3), Dev-chain ownership of the view name (S-1), `report_field` NULL-applies semantics, seed `''` → NULL.

## Rounds

| Round | Fixes | Re-judgment | Result |
| --- | --- | --- | --- |
| 1 | C-1…C-5 and S-2…S-5 applied to `design.md` (§3.1, §3.2, §3.2a, §3.3, §3.4, §5, §10, §11, DD-1, P-6, P-10, P-12, P-16…P-20) and `requirements.md` (§1, R-IDX-006, D5, NFR-IDX-001/002/003). S-1 not fixed: HITL ruling 2 keeps the name; rollout rule added (§11, P-18) | not run (user: Fix only) | Accepted by the user without re-judgment. Under the skill's terminal states this is **not** `APPROVED`: the fix delta is unaudited |
