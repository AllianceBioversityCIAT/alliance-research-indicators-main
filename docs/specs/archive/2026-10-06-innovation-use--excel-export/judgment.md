# Judgment Day — innovation-use/excel-export design

| Field | Value |
| --- | --- |
| Target | `requirements.md` (sha256 `fee49961cc0b4ce9…`) + `design.md` (sha256 `82fc2726d88b3128…`), repo `f9d57147` |
| Mode | judgment_day, `/akili-specify` Step 2.5 — Review Design |
| Judges | A and B, blind, read-only (`Explore`, model `sonnet` ≠ design author `opus`) |
| Round | 1 (initial judgment) |
| State | **closed — `JUDGMENT: APPROVED ✅` on user choice "Fix only" (2026-10-05).** Round-one fixes applied by the architect and **not re-judged**, so the fixes themselves are unaudited |

## Frozen ledger — round 1

### Confirmed (both judges)

| ID | Sev | Judge refs | Finding | Fix scope |
| --- | --- | --- | --- | --- |
| JD-1 | **SEVERE** | A-2 · B-1 | §3.3 rule 6 adds a condition the green check does not have ("id **or name** NULL"). An `institution_id` with a missing or NULL catalog name gives check TRUE and a cell with `Not provided`, which breaks NFR-IUX-002's "if and only if". The same class applies to every catalog-name slot (actor type, institution type, sub-type, `ciul.name`) | `Not provided` only on the function's predicate. A missing catalog name renders a non-NP fallback. Add fixtures for "id set, catalog row missing" |
| JD-2 | **SEVERE** (A) / WARNING (B) | A-1 · B-8 | NFR-IUX-001 says "no materialized derived table", but a `LATERAL` is materialized per outer row, so a healthy plan always shows `Materialize (invalidate on row from root)`. `report_general_information` already materializes three derived tables. A string-absence check keyed on alias `iu` is vacuous once the view merges. The Phase 2 SQL is a local inside `findStarResultsMetadataRows`, and the design does not say how the gate gets it | Reword NFR-IUX-001 and §10 as a **positive** match: no view-level materialization, and each lateral reads `Index lookup … (result_id=root.result_id)`. The gate gets the SQL text from the repository's `queryRunner.query` call (existing spec pattern) |
| JD-3 | WARNING | A-3 · B-5 | `riu.is_active = TRUE` is not stated in the join's ON clause (rule 14, `findOne`) | State it, add a fixture |
| JD-4 | WARNING | A-8 · B-6 | A NULL `sex_age_disaggregation_not_apply` takes the disaggregated branch (`= TRUE` test), and the same trap exists for `is_organization_known`. Neither is pinned | State both, add fixtures |
| JD-5 | WARNING | A-8 · B-2 | Col 80 is not NULL-safe: `title` and `platform_code` are nullable, so a plain `CONCAT` gives NP while the check is TRUE | Use `CONCAT_WS` with a branch for a null platform; add a fixture |
| JD-6 | WARNING | A-7 · B-4 | Rollout window: layout rows applied before the code mean the old code paints an INNOVATION USE band and dictionary rows over columns that do not exist. Backout has the same window | Record the window, or ship the layout migration with the code. The view migration goes first |
| JD-7 | WARNING | A-10 · B-7 | The laterals run for **every** exported row, all indicators, because `indicator_id = 6` lives only in the cell. Cost-based claims are unproven (empty tables) | Put `root.indicator_id = 6` inside each lateral's WHERE. Re-measure on seeded rows |
| JD-8 | SUGGESTION | A-12 · B-10 | Requirements/design prose for `deriveActorTotal` is wrong: all four NULL → `null`, not 0 | Reword |
| JD-9 | SUGGESTION | A-13a · B-12 | The review-round budget is 4×2+3 = **11**, not ~10 | Correct |
| JD-10 | SUGGESTION | A-14 · B-9 | The legacy actor booleans (`women_youth`…`men_not_youth`) and `innovation_dev_result_id` are neither shown nor listed as excluded | Add an explicit exclusion |
| JD-11 | SUGGESTION | A-16 · B-14 | The design names T-01…T-05 owners before `tasks.md` exists | Expected at this phase. Resolved by Phase 3 |

### Suspect (one judge only — recorded, not auto-fixed)

| ID | Sev | Judge | Finding | Architect settling (as run) |
| --- | --- | --- | --- | --- |
| S-1 | WARNING | B-3 | `MAX(sort_order)+k` is NULL on an empty table, and `sort_order` is NOT NULL | Confirmed by reading: the scratch tables are empty and NOT NULL per B's `SHOW CREATE`. Fix is cheap (`COALESCE`, scoped by `workbook_key`) |
| S-2 | WARNING | A-4 | Readiness path `result_innovation_dev` (active in the ON) → catalog is not named in §3.2 | Valid omission |
| S-3 | WARNING | A-5 | The requirements' D5 round trip and the NFR timing run are missing from design §10 | Valid |
| S-4 | WARNING | A-6 | No CI runs `test:fixtures`, so transcription drift is caught only manually | `ls .github/workflows` → only `jenkins-trigger-monorepo.yml`, `sonarcloud-analysis-backend.yml`. Confirmed |
| S-5 | WARNING | A-9 | Rows missing: 61-table join limit; `SET LOCAL group_concat_max_len` persists on the connection, so the comment at `star-results-export.repository.ts:49` is false (pre-existing) and the fixtures must set it; collation mixing (probed, no error); rule-16 role id from the enum | Confirmed by reading `:45-52`, `:192-196` |
| S-6 | WARNING | A-11 | The migration spec asserts no `?` only; `:word` is also forbidden | Valid |
| S-7 | SUGGESTION | A-13b–d | DD-4 "three tables" (4 are read); DD-3 "45 columns" (44); "rules 2–16" (there is no rule 12, and 13 was removed) | Valid |
| S-8 | SUGGESTION | A-15 | `report_innovation_dev` exists on Dev (`baseline.sql:2589`, `:8026`) but in **no** migration. It is the nearest precedent and the export does not use it | `grep -rln report_innovation_dev server/researchindicators/src` → baseline only. Confirmed |
| S-9 | SUGGESTION | A-17 | `migration:revert ×2` may target the wrong migrations if another lands in between | Valid |
| S-10 | SUGGESTION | B-13 | "Same line format as `report_oicr`" over-claims (OICR's comment is mandatory, with no `<>0` guard) | Valid |
| ~~S-11~~ | — | B-11 | "Wrong citation `src/CLAUDE.md` §7" | **Refuted:** the rule is at `server/researchindicators/src/CLAUDE.md:206`. Discarded |

### Contradictions

None on substance. JD-2's severity differs (A severe, B warning) while both judges identify the same defect.

### Premise Ledger verdicts (merged)

Confirmed by both: P-1, P-2, P-3, P-6, P-7 (with JD-8/JD-10 caveats), P-8, P-9, P-10 (scope widened by S-8), P-13, P-14, P-15, P-17. Not re-run (unreachable, not refuted): P-4, P-11, P-12, P-16. P-5: structurally corroborated by both judges' inline EXPLAIN. View merging is not reproducible without re-creating views, and it was measured on empty tables at 364 migrations, not HEAD (A-10).

## Rounds

| Round | Action | Result |
| --- | --- | --- |
| 1 | Judgment | 2 severe confirmed, 5 warnings confirmed, 4 suggestions confirmed, 9 suspect, 1 refuted |
| 1-fix | User chose **Fix only** (option 2). Applied JD-1…JD-10 and S-1…S-10 (S-11 refuted, not applied). JD-11 is resolved by Phase 3 | `requirements.md` + `design.md` edited; correction-closure sweep: `grep -n "2–16\|~10\|45 columns\|three shared\|id or the name"` → 0 stale hits; Premise Ledger 17 → 20 rows (P-18…P-20) |

## Fix map

| Finding | Where fixed |
| --- | --- |
| JD-1 | req §3 exclusions note; design §3.1 last row, §3.2 col 75, §3.3 rows 2, 6, 7 |
| JD-2 | req NFR-IUX-001 target + how verified; design §10 EXPLAIN row |
| JD-3 | design §3.1 1:1 row |
| JD-4 | req R-IUX-003/004; design §3.3 selector rows |
| JD-5 | req R-IUX-006 table; design §3.2 col 80 |
| JD-6 | req NFR-IUX-003; design §11 |
| JD-7 | design §3.1 lateral row |
| JD-8 | req R-IUX-003; design §3.4 |
| JD-9 | design §15 |
| JD-10 | req exclusions; design §1 non-goals |
| S-1 | design §5 step 2 · S-2 design §3.2 col 81 · S-3 design §10 rows · S-4 req §9 R3, design §10 · S-5 design §1, §3.1, P-18…P-20 · S-6 design §10 · S-7 DD-3, DD-4, goals, §10 · S-8 design §2.2, P-10 · S-9 design §11 · S-10 req R-IUX-005 |

JUDGMENT: APPROVED ✅ (user-accepted, fix-only; no scoped re-judgment ran)
