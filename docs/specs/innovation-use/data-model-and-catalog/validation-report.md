# Validation Report — Innovation Use / Data Model, Catalog & Green Check

> ## ✅ VERDICT: **PASS — archive-ready**, with 7 WARNs, none blocking.
> **0 FAIL · 0 BLOCKED · 51 of 51 live ACs verified against evidence.**
> Every WARN is a **record-keeping or scope-boundary** finding. None indicates broken or missing behavior.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/data-model-and-catalog/` |
| Parent spec | [`../family.md`](../family.md) — chunk 1 of 3 |
| Validated | 2026-08-19 |
| Auditor tier | T3 · **author ≠ auditor satisfied** — implementation authored by `sonnet` Implementers; this audit run on `opus`, which wrote no production code in this spec |
| Method | Direct source verification. Test names extracted from the fixture and migration-spec files themselves; `tsc`, suite, coverage, lint and a cold DB cycle re-run by the auditor |
| Inputs | `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `routine-transcript.md`, `proposal.md`, `HANDOFF.md` |
| `test-report.md` | **Absent** — `/akili-test` never run (WARN-5). Coverage verified directly instead |

---

## 2. Summary

Chunk 1 delivers its schema, catalog, stored function, green-check wiring and lifecycle-routine amendments. **All 51 live acceptance criteria are backed by executable evidence** — 30 fixture tests against a real MySQL, 53 migration-spec tests, and unit specs for the green-check layer.

The spec's dominant risk — *stored-routine logic has no automated gate in this repository* — is genuinely mitigated, not merely acknowledged: the fixture harness executes every routine and function against a disposable MySQL, and every fixture was observed red against its target defect.

**One auditor self-correction is recorded in `execution.md` and commit `d1e57ead`:** the T-14 finalize write briefly asserted "Every AC … is checked" while all 59 checkboxes were unflipped. That claim was retracted before this validation ran. This report is what legitimately discharges it.

---

## 3. Task Completion

| Check | Result | Evidence |
| --- | --- | --- |
| All tasks `[x]` | **PASS** | T-01 … T-14, 13 of 13 (T-03 extracted to `bugfix/sp-versioning-roles-id`, carries no checkbox) |
| Every task has execution notes | **PASS** | `execution.md`, 2456 lines, per-attempt Reviewer verdicts throughout |
| Every completed task has verification evidence | **PASS** | Each task entry records its command and outcome verbatim |
| Task Done-item checkboxes ticked | **WARN-2** | **T-12 and T-13 carry `[x]` status lines while their own 10 Done-item checkboxes remain unticked** (`tasks.md` ~388–392, ~415–419). Bookkeeping only — both have full Reviewer-PASS evidence, and this audit independently confirms the underlying work (F9b exists; F13–F16/F18 all present and green) |

---

## 4. File Existence

Design §4's file tree verified against disk.

| Expected | Found | Result |
| --- | --- | --- |
| Six migrations M1…M6 | `1787066437593`, `1787068132517`, `1787070034303`, `1787071463485`, `1787078283929`, `1787083305648` — **exactly six** | **PASS** |
| Two repair migrations ordered before M1 | `1784250000000-RepairSpDeleteResultVersionObjectiveTables.ts`, `1784300000000-RepairSpVersioningObjectiveBlocks.ts` — both `< 1787066437593` | **PASS** |
| `result_innovation_use` entity | `src/domain/entities/result-innovation-use/entities/result-innovation-use.entity.ts` | **PASS** |
| Catalog entity | `src/domain/tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity.ts` | **PASS** |
| TEST datasource | `src/db/config/mysql/orm.test.config.ts`, bound to `dataSourceTarget.TEST` | **PASS** |
| Fixture harness | 9 `*.fixture-spec.ts` files, `global-setup.ts`, `jest-fixtures.json` | **PASS** |
| M6 migration **name** | design says `updateLifecycleRoutinesForInnovationUse`; disk is **`Amend`**`LifecycleRoutinesForInnovationUse` | **WARN-3** |

Entity registration is by glob (`orm.config.ts:19-23`), and both entity files sit under globbed paths — so registration is structural, and `tsc --noEmit` is clean.

---

## 5. Build Integrity

Every figure below was **re-run by the auditor**, in a quiet window with no delegated agent active (root guide §4.3), not carried over from the execution log.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **CLEAN** |
| `npm test -- --silent` | **328 suites / 2155 tests pass** |
| `npm run test:cov` | **83.75 / 74.88 / 84.75 / 83.76** — floor 60, no regression |
| `npm run lint -- --quiet` + `git status` re-check | **clean**; `--fix` mutated nothing |
| Cold DB cycle | scratch schema verified **0 tables** → `migration:test:bootstrap` → **215 tables**, all six routines present → `test:fixtures` **9 suites / 30 tests pass** → torn down |

The cold-cycle result is load-bearing and was confirmed genuinely cold: `docker-compose.test.yml` declares **no volumes**, so `down` destroys the data layer.

---

## 6. Requirement Coverage

**51 of 51 live ACs PASS.** R-IU-010 is a withdrawn non-goal (D-8); R-IU-012 was extracted to `bugfix/sp-versioning-roles-id` and its ACs are that spec's.

| Req | ACs | Result | Primary evidence |
| --- | --- | --- | --- |
| **R-IU-001** detail record | 4/4 | **PASS** | `createResultInnovationUse.spec.ts` (10 tests) · fixture *"persists innovation_use_level_id, …_explanation, and the audit columns, retrievable by result_id"* · `entity-metadata.spec.ts` · `tsc` clean |
| **R-IU-002** level catalog | 5/5 | **PASS** | `createClarisaInnovationUseLevels.spec.ts` (9 tests); **exactly 10 seed tuples** in one `INSERT`, ids 1–10 / levels 0–9. AC.4 passes under the adjudicated reading (fresh scratch → baseline → migrate → identical ten rows, verified twice); its literal *"from empty"* premise is known false — TRD **ADR-12** |
| **R-IU-003** actor counts | 4/4 | **PASS** | `addInnovationUseCountsToSharedTables.spec.ts` (9 tests) — five nullable count columns, pre-existing rows unchanged, no derivable total stored |
| **R-IU-004** organization count | 3/3 | **PASS** | same migration spec — one nullable column, existing rows `NULL` |
| **R-IU-005** role discriminators | 3/3 | **PASS** | `actor-roles.enum.ts` `INNOVATION_USE = 2` · `institution-type-role.enum.ts` `= 2` · `quantification-roles.enum.ts` `= 3` — one new member each, no existing value changed · `insertInnovationUseRoles.spec.ts` (7 tests) |
| **R-IU-006** `innovation_use_validation` | 11/11 | **PASS** | `createInnovationUseValidation.spec.ts` (18 tests) + **11 live fixtures**: F1, F2, **F3→1 / F4→0** (the DC-10 off-by-one pair), F5, F6, F7, F8, **F9 + F9b** (AC.10's two halves), F11, F17. AC.9 by F12 (body-identical) **and** F12b-1/F12b-2 (behavioral) |
| **R-IU-007** green checks + submit gating | 4/4 | **PASS** | `green-checks.repository.spec.ts` *"calculateGreenChecks adds innovation_use and IP for INNOVATION_USE"* · `find-green-checks.dto.spec.ts` *"does not contain innovation_use (T-11 — R-IU-007 AC.3)"* · fixture F10 (`intellectual_property_validation` returns 0 with no IP row) |
| **R-IU-008** Innovation Dev not regressed | 4/4 | **PASS** | Auditor-re-run suite/coverage/lint. **AC.2 discharged structurally:** zero `result-innovation-dev` files touched across the entire task set |
| **R-IU-009** migrations safe + reversible | 4/4 | **PASS** | AC.1 apply→revert→re-apply verified twice on live scratch MySQL (M6's `has_riu` 1→0→1 three-state cycle). AC.3 verified by the auditor: **only** `1787078283929` contains `innovation_use_validation`. AC.4 — all testing on `dataSourceTarget.TEST` |
| **R-IU-011** lifecycle survival | 9/9 | **PASS** | F13a/b/c (versioning copies level+explanation, four counts + `actors_count`, `organization_count`), F14, F15, F18 (soft delete deactivates in place), **F16a–d** (all four routines byte-identical for Innovation Dev). AC.7–AC.9 by T-10's statement-by-statement body diff, post-revert query returning four rows |

### Negative constraints and strict validations

| Clause | Result |
| --- | --- |
| R-IU-002 *must NOT seed ids 13–20* | **PASS** — exactly ten tuples |
| R-IU-002 *must NOT modify readiness levels* | **PASS** — asserted by migration spec |
| R-IU-003 *must NOT alter/drop/repurpose existing columns* | **PASS** — additive nullable only |
| R-IU-003 *must NOT add a disaggregated total* | **PASS** — AC.4 asserted |
| R-IU-003 *BUT NOT populate both modes* | **WARN-4** — **not gated in chunk 1, by design.** F9/F9b gate the *completeness* half; the mutual-exclusion write guard is chunk 2's API edge (RB-5 layer 3). Declared in `tasks.md` §3, not a silent gap |
| R-IU-006 *must NOT touch another `*_validation`* | **PASS** — auditor-verified, only M5 names it |
| R-IU-008 *must NOT be made green by editing an Innovation Dev spec* | **PASS** — zero such files touched |
| R-IU-009 *must NOT run against the shared DB* | **PASS** — TEST target only |
| R-IU-011 *must NOT add a `result_quantifications` block; divergences survive* | **PASS** — T-10 AC.8, amended for the bugfix's T-02b closure |

---

## 7. Linting & Code Quality — 4R advisory sweep

Lint clean. No spec violations found. Advisory findings, carried forward from `execution.md` so they surface here rather than dying in the audit trail:

| ID | Lens | Finding |
| --- | --- | --- |
| **C-4** | reliability | `platformSeeded` / `innovationDevRoleSeeded` in the fixture harness are **structurally always `false`** — dead branches. **Still needs a scope ruling**; it is a fixture *code* change and was excluded from the docs-only T-14 |
| **C-13** | risk | `RB-11` / D-11 assert *"F19 is that spec's gate"*, but the token `F19` **appears nowhere** in the extracted spec. True under `design.md:335`'s label mapping; one hop from false if that mapping is dropped |
| **C-6** | reliability | T-02's *"fails with the container down"* criterion is no longer literally reproducible — `globalSetup` throws first |
| A-1, A-2, B-1, B-2 | readability / reliability | TRD §12 lacks a cross-ref to ADR-11; ADR-6's stale clause retained verbatim above its amendment; FP-46's justification narrower than its premise; §13 Backout cites "§14 precedent list" rather than the two migration filenames |
| C-7 … C-12, C-14 … C-18 | readability | Correction parentheticals now longer than the text they correct; `family.md`'s cell over-long for an index table; singular/plural drift on "repair migration(s)"; three residual true-but-legacy `M0` labels |

**All were excluded from execution by explicit user ruling** (`/akili-execute` §2.4 — an advisory may not widen an approved task), not by oversight.

---

## 8. Design Conformance

| Check | Result |
| --- | --- |
| Six migrations, one per concern | **PASS** — matches §5 one-for-one |
| `id = level + 1` (D-1, the off-by-one trap) | **PASS** — F3/F4 are the discriminating pair; the function joins the catalog and compares `level`, never the FK |
| Four lifecycle routines amended (D-9) | **PASS** — set re-derived **by call site**; F16a–d prove all four unchanged for Innovation Dev |
| No OpenSearch decoration (D-8) | **PASS** — none added |
| ADR-11 + ADR-6 amendment filed (D-6) | **PASS** — `docs/trd/trd.md` §2.4, ADR-11 in its reserved number, reservation note removed |
| Green checks as stored routines (ADR-11) | **PASS** |
| **Cross-document figure check** | **PASS** — "six migrations" (design §5, §4 tree) reconciles with six files on disk; "ten rows" reconciles with ten seed tuples; "9 fixture suites / 30 tests" reconciles with 9 files and **30** `it()` blocks counted by the auditor; "four routines" reconciles with four call-site-enumerated routines |
| Proposal intent & non-goals | **PASS** — no endpoint, no UI, no investment tables; chunk stays inert by construction |
| M6 migration **name** | **WARN-3** — `design.md` §5 says `updateLifecycleRoutinesForInnovationUse`; disk says `Amend…`. **Migration filenames are immutable (ADR-5), so the spec is what must change** |

---

## 9. Test Evidence Summary

`test-report.md` is **absent** (WARN-5) — `/akili-test` was never run. Coverage was therefore verified directly, and the underlying evidence is real and executable:

| Layer | Count | Status |
| --- | --- | --- |
| Fixture tests (real MySQL, stored routines) | 9 suites / **30 tests** | all green from a provably cold schema |
| Migration specs (M1–M5) | **53 tests** | green |
| Full server suite | 328 suites / **2155 tests** | green |
| Falsifying-input discipline | every fixture observed **red** against its target defect | recorded per task |

M6 has no migration-spec file by design — it is gated behaviorally by F13–F16/F18, which is stronger than a structural body diff.

---

## 10. Agent Guide / Constitution Impact

| Check | Result |
| --- | --- |
| `## Constitution Impact` blocks in `execution.md` | None — no module created, no boundary moved, no public surface changed |
| `server/researchindicators/src/CLAUDE.md` | **PASS** — five fixture-harness gotchas added (FP-45/46/48/49/50) |
| TRD sync | **PASS** — ADR-11 filed, ADR-6 amended (not superseded) |
| `family.md` child row | **PASS** — chunk 1 flipped to `done` in the same commit as the `tasks.md` checkbox |
| CodeGraph | `.codegraph/` exists → **re-index recommended** at archive |

---

## 11. Remediation

**Nothing blocks archive.** Seven WARNs, each with a disposition:

| # | Finding | Disposition |
| --- | --- | --- |
| **WARN-1** | 51 AC checkboxes were unflipped in `requirements.md` | **Resolved by this report** — each AC verified against evidence above, then flipped |
| **WARN-2** | T-12 / T-13 Done items unticked despite `[x]` status | **Accept.** Bookkeeping; underlying work independently confirmed here (F9b present, F13–F16/F18 green) |
| **WARN-3** | M6 name drift: design `update…` vs disk `Amend…` | **Fix the spec** — filenames are immutable under ADR-5. One-line correction |
| **WARN-4** | R-IU-003's *"must NOT populate both modes"* not gated in chunk 1 | **Accept and carry.** Declared in `tasks.md` §3 as chunk 2's API edge (RB-5 layer 3) |
| **WARN-5** | No `test-report.md` | **Accept.** Evidence exists and exceeds what a report would summarize; the missing artifact is the report, not the tests |
| **WARN-6** | C-4 dead branches need a scope ruling | **Carry to archive** — the one advisory that is a real code defect |
| **WARN-7** | C-13's `F19` label claim | **Carry.** True under the documented mapping; recommend naming the fixture file directly |

---

## 12. Archive Readiness Recommendation

**✅ READY.**

- all required tasks `[x]` — 13 of 13
- **0 FAIL, 0 BLOCKED**
- all 7 WARNs accepted or assigned above
- key requirements and scenarios covered by executable tests
- drift reflected in the spec docs and this report
- `validation-report.md` now exists; `test-report.md`'s absence explicitly accepted (WARN-5)

```text
/akili-archive docs/specs/innovation-use/data-model-and-catalog
```

Carry into archive: **C-4 needs a user scope ruling**, WARN-3 is a one-line spec fix, and a CodeGraph re-index is recommended.
