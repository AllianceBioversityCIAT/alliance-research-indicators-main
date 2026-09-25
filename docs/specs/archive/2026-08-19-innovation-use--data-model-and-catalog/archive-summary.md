# Archive Summary — Innovation Use / Data Model, Catalog & Green Check

> **✅ COMPLETE — validated PASS, archived 2026-08-19.**
> Chunk 1 of 3 in the `innovation-use` spec family. **Chunk 2 (`details-api`) is unblocked.**
> Server-only, inert by construction: no endpoint, no UI. 13 tasks, 0 FAIL, 0 HALT, 0 Pivot.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/innovation-use/data-model-and-catalog/` |
| Archive path | `docs/specs/archive/2026-08-19-innovation-use--data-model-and-catalog/` |
| Parent spec | [`../../innovation-use/family.md`](../../innovation-use/family.md) — chunk 1 of 3 |
| Type | Change · Approval mode `gated` |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Archive date | 2026-08-19 |
| Final status | **PASS — validated, archive-ready** |

## 2. Final Status

| Gate | Result |
| --- | --- |
| Tasks | **13 / 13** (T-03 extracted to `bugfix/sp-versioning-roles-id`) |
| Validation | **PASS** — 0 FAIL, 0 BLOCKED, 7 WARN, all accepted |
| Acceptance criteria | **51 / 51 live ACs verified and recorded** (R-IU-012's 4 owned by the extracted spec) |
| Full server suite | 328 suites / **2155 tests** green |
| Coverage | 83.75 / 74.88 / 84.75 / 83.76 — floor 60 |
| Fixture harness | 9 suites / **30 tests** green from a provably cold schema |
| HALTs / Pivots / FATAL_FAILs | **0** |

## 3. Requirements Delivered

| Req | Delivered |
| --- | --- |
| R-IU-001 | `result_innovation_use` detail table + entity, `result_id` PK, audit columns |
| R-IU-002 | `clarisa_innovation_use_levels` — ten canonical rows seeded by migration, **`id = level + 1`** |
| R-IU-003 | Five nullable count columns on `result_actors` (four disaggregated + `actors_count` aggregate) |
| R-IU-004 | `organization_count` on `result_institution_types` |
| R-IU-005 | One new role discriminator in each of three enums + catalogs |
| R-IU-006 | `innovation_use_validation` stored function — 11 ACs, all fixture-gated |
| R-IU-007 | Green-check assembly for indicator 6 (`innovation_use` + `ip_rights`) and submit gating |
| R-IU-008 | Innovation Dev provably not regressed — zero `result-innovation-dev` files touched |
| R-IU-009 | Six append-only migrations, each `down()` verified on a scratch schema |
| R-IU-011 | All **four** lifecycle routines amended; data survives versioning, both hard deletes, and soft delete |
| ~~R-IU-010~~ | **Withdrawn** — OpenSearch indexing of detail fields is a non-goal (D-8) |
| ~~R-IU-012~~ | **Extracted** to `bugfix/sp-versioning-roles-id` |

## 4. Files Changed

| Area | Detail |
| --- | --- |
| Migrations | **6** — `1787066437593` … `1787083305648` (M1…M6), append-only. Two repair migrations from the extracted spec are timestamp-ordered **before** them |
| Entities | `result-innovation-use`, `clarisa-innovation-use-levels` |
| Enums | `actor-roles`, `institution-type-roles`, `quantification-roles` — one member each |
| Green checks | `green-checks.repository.ts` (INNOVATION_USE case + `ip_rights`), `find-green-checks.dto.ts` |
| Test harness | `orm.test.config.ts`, `docker-compose.test.yml`, `jest-fixtures.json`, `global-setup.ts`, 9 fixture specs |
| Migration specs | 5 (M1–M5); **53 tests**. M6 is gated behaviourally by F13–F16/F18 |
| TRD | **ADR-11** filed (green checks + lifecycle as stored routines, with its call-site checklist method); **ADR-6 amended** — mapping source is the DTO, not the entity |
| Guides | `server/researchindicators/src/CLAUDE.md` — five fixture-harness gotchas |

## 5. Test Evidence

| Layer | Evidence |
| --- | --- |
| Stored routines | 9 fixture suites / 30 tests against a real disposable MySQL — F1–F9, **F9b**, F10, F11, F12/F12b, F13a–c, F14, F15, F16a–d, F17, F18 |
| Migrations | 53 migration-spec tests |
| Falsifying input | **Every fixture observed red against its target defect** — the discipline that makes the harness evidence rather than decoration |
| Cold cycle | Schema verified at **0 tables** before bootstrap → 215 tables → 9/30 green. `docker-compose.test.yml` declares no volumes, so the cycle cannot silently become warm |

**`test-report.md` is absent** — `/akili-test` was never run (WARN-5, accepted). The missing artifact is the report; the tests themselves exist, run, and exceed what a report would have summarized.

## 6. Validation Summary

See [`validation-report.md`](./validation-report.md). **PASS**, 0 FAIL, 7 WARN — every WARN a record-keeping or scope-boundary finding, none indicating broken or missing behaviour. One real drift corrected during validation: `design.md` named M6 `updateLifecycleRoutinesForInnovationUse` while the immutable file on disk is `Amend…` (WARN-3).

## 7. Accepted Warnings & Follow-Ups

| # | Item | Disposition |
| --- | --- | --- |
| **C-4** | `platformSeeded` / `innovationDevRoleSeeded` in the fixture harness are structurally always `false` — dead branches. **The one advisory that is a real code defect.** | **Follow-up for chunk 2** (user ruling 2026-08-19). Chunk 2 will be in these files and can verify removal in context |
| WARN-2 | T-12 / T-13 Done-item checkboxes unticked despite `[x]` status | Accepted — bookkeeping; underlying work independently confirmed at validation |
| WARN-4 | R-IU-003's *"must NOT populate both modes"* is not gated here | **Chunk 2's API edge** (RB-5 layer 3), declared in `tasks.md` §3 |
| WARN-5 | No `test-report.md` | Accepted |
| C-13 | *"F19 is that spec's gate"* — `F19` appears nowhere in the extracted spec; it is this spec's label via `design.md:335` | Accepted; recommend naming the fixture file directly if reused |
| A-1, A-2, B-1, B-2, C-6, C-7…C-12, C-14…C-18 | Documentation advisories | Excluded by explicit user ruling under `/akili-execute` §2.4 — recorded, not oversight |

## 8. Historical Notes

**Three traps this spec proved the hard way — chunks 2 and 3 inherit them:**

1. **`id ≠ level`.** Any rule written `innovation_use_level_id >= 6` is off by one (id 6 is level 5). Join the catalog and compare `level`. Fixtures F3→`1` / F4→`0` are the discriminating pair.
2. **Four lifecycle routines, enumerated by call site — never by name.** Three consecutive review rounds got the set wrong (2 → 3 → 4) by guessing. ADR-11 now carries the method, not just the answer.
3. **`ControlListBaseService.findAll()` has no `order` clause**, and `findByName` is a `LIKE %name%` match. Catalog names repeat in pairs, so name lookup is ambiguous and scale order rests on accidental PK ordering. Chunk 2's endpoint **must** order explicitly by `level`.

**Process record.** 13 review rounds against a budgeted 4–5 (2.6×), authorized and never silent. Six rework attempts across T-12/T-13/T-14, all tracing to two root causes now standardized into the personas (KZ-002, KZ-005) plus one new lesson (KZ-007). Judgment Day ran three rounds, all ESCALATED, 44 findings. Zero HALTs, zero pivots, zero product bugs.

**The methodological finding worth carrying furthest:** KZ-005 recurred four times in this one spec because it had been standardized into the *Leader* persona while every recurrence happened inside a *worker*. A lesson applied to the orchestrator does not reach the agent that performs the action.
