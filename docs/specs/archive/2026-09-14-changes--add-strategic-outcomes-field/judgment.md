# Judgment Day — `add-strategic-outcomes-field` design.md

- **Target:** `docs/specs/changes/add-strategic-outcomes-field/design.md` (frozen at time of review)
- **Context docs:** `requirements.md`, `proposal.md`
- **Mode:** judgment_day, blind dual review
- **Round:** 1
- **Transaction state:** **ESCALATED — closed by explicit human override.** The user reviewed the FAIL verdict and confirmed corroborated findings (C-1..C-4) and chose **"Continue"** — accept `design.md` as-is and proceed to Phase 3 without a round-one fix or re-judgment. Per the terminal-states rule this lineage stays `escalated` (never silently reclassified `approved`); the override is recorded here for `/akili-archive`. `tasks.md` still folds the low-cost, non-design-reopening parts of these findings into task-level implementation notes, verification steps, and the Risks & Blockers log (see `tasks.md` §7) — narrowly, task authoring must not knowingly ship a broken verification step (e.g. S-1's wrong datasource target) even when the design itself is accepted unfixed.

Both judges' delivery contract note: neither judge's toolset exposed `ReportFindings` (read-only allowlist: `Read`, `Grep`, `Glob` only). Both delivered structured verdicts as their final message instead of staying silent (per the non-delivery rule) — treated here as their findings payload.

## Judge A — verdict: FAIL (9 findings: 2 high, 5 medium, 2 low)
## Judge B — verdict: FAIL (6 blocking, 3 advisory)

---

## CONFIRMED (both judges independently found the same defect) — eligible for round-one fix

| # | Finding | Judge A | Judge B |
| --- | --- | --- | --- |
| C-1 | **§8/§11 assert, without measurement, that no existing Policy Change (and now Innovation Use) result relies on Impact Outcomes being empty-and-submittable.** Applying the migration flips `alignment_validation` from `true`→`false` for every such result immediately (`alignment` is not in `VISUAL_ONLY_GREEN_CHECKS`, so this is a real Submit-blocking flip, not cosmetic). Sibling migration `1786679227000` set precedent: measured on Dev first ("22 of 23 would flip"), recorded the count, treated it as a human decision. | #1 (HIGH) | #4 (MEDIUM-HIGH) + #1 (HIGH, deploy-order framing of the same root risk) |
| C-2 | **`portfolio-2-alignment.handler.ts:97` — `payload.impact_outcomes.map(...)` has no optional chaining**, and `impact_outcomes` is optional on `ResultAlignmentDto`. Widening the allow-list to indicator 6 makes this newly reachable: any PATCH omitting the key (a client/server deploy-skew window, or a machine-token caller) throws → 500. Design §5 asserts "no change to method signatures... or DTO shape" and never names this. | #3 (MEDIUM) | #2 (HIGH) |
| C-3 | **The named-placeholder SQL-comment trap (server `CLAUDE.md` §7) is absent from DD-3.** A verbatim copy of the current body is clean today, but this migration family's convention is to add `[SPEC ...]`-style comments — exactly where a bare `?`/`:word` kills a parameterless migration (`1784500000000` shipped unrunnable for this reason). | #6 (MEDIUM) | Advisory #2 |
| C-4 | **Budget (§12) undercounts: "3 tasks" vs. requirements.md §7's own "T-01…T-05"; LOC (~220–280) is understated** — the migration alone carries the function body twice (verbatim `up()` + verbatim-as-`down()`), ≈285-290 lines before tests. Realistic total ≈340–420 LOC across 4-5 tasks, not 3/≈250. | #7 (MEDIUM) | Advisory #1 |

## SUSPECT (single judge only — recorded, not auto-fixed)

| # | Finding | Reported by | Severity |
| --- | --- | --- | --- |
| S-1 | DD-4's `npm run migration:dev:execute` doesn't actually target a scratch/TEST schema — `orm.config.ts` binds the exported datasource to `CORE`, and the command applies *every* pending migration, against the shared (non-disposable) Dev DB per root `CLAUDE.md` §4.3. | Judge A | HIGH |
| S-2 | A failed `CREATE FUNCTION` (DDL auto-commits) leaves `alignment_validation` **dropped entirely** with no migrations-table row — breaking the green check for *every* result/indicator, and making the stated backout ("`migration:revert` restores the exact body") false in that failure mode. | Judge B | MEDIUM-HIGH |
| S-3 | `alignment_validation`'s non-OICR branch (`if result_indicator <> 5`) also requires an active `result_sdgs` row — load-bearing for indicators 4 and 6, but never named in the manual-gate fixture (requirements §7) or in R-ALN-003's scenario. The 6-case matrix will falsely read "true" cases as failures unless the fixture also seeds contract + lever + strategic-objective + SDG rows. | Judge B | MEDIUM |
| S-4 | The function body contains **two** structurally similar `if result_indicator = 5 then` guards — one in the `portfolio_id = 1` branch (unrelated legacy OICR lever/SDG-target check), one in the `portfolio_id = 2` branch (the one to widen). Prose disambiguates correctly today, but nothing stops an implementer's mechanical find-and-replace from hitting both, silently breaking Portfolio 1. | Judge B | MEDIUM |
| S-5 | Client-side coercion inconsistency: `alliance-alignment-p2.component.ts` uses `Number(indicator_id) === ...`; design §6 prescribes a strict `=== 6` for the save-gate site, matching the *other* client file's existing style but not enforcing one convention across both. If `indicator_id` ever arrives as a string, the field could render but the save omit the key (silent data loss). | Judge A | MEDIUM |
| S-6 | R-ALN-001 AC.1's DOM assertion is structurally blind: `alliance-alignment-p2.component.spec.ts` overrides the template with an inline stub, so it can only prove the boolean, not the real template. Design §6 cites the `/akili-propose` mockup as "confirming" the real template renders correctly — a mockup is not evidence about shipped Angular code. | Judge A | MEDIUM |
| S-7 | §1's KZ-016 cross-check claim ("every clause names one of the four existing sites or the migration site") is inaccurate — R-ALN-001's SDG-visibility clause names a distinct site (`isOicrIndicator()` / the `!isOicrIndicator()` save-gate argument), not one of the four. Compounds with S-3. | Judge B | MEDIUM |
| S-8 | §13 "Open Questions: none outstanding" closes a question the proposal explicitly escalated to the user (the missing Innovation Use results-detail tab / dead "Next" navigation) by recording it as a non-goal instead of a decision. | Judge A | LOW |
| S-9 | DD-4 names the mocked object as `queryRunner.query()`; the spec actually mocks a `DataSource` stub's `query` method. Conclusion (no SQL execution) is still correct. | Judge A | LOW |
| S-10 | Two existing test names (`alliance-alignment-p2.component.spec.ts`, `alliance-alignment.component.spec.ts`) describe the old 2-indicator allow-list and will read as stale once it's 3 — safe to rename, doesn't violate AC.4's "unmodified assertions" intent. | Judge B | LOW (readability) |

## Judges' independently-verified TRUE claims (no finding)

- The "no later migration redefines `alignment_validation`" claim (both judges independently re-verified by reading the two candidate files in full).
- All cited line numbers, enum values, and the DD-2/DD-3 migration mechanics (DROP+CREATE, `down()` correctness) — sound.
- The 5-site KZ-002 enumeration is complete (no 6th site found).
- No existing test collides with/breaks under the new indicator-6 cases.
- DD-4's core conclusion (no Jest gate can execute the SQL function) is correct.
