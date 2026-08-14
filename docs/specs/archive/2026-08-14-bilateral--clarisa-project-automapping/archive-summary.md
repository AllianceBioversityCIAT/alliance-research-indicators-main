# Archive Summary — Bilateral / CLARISA project auto-mapping (S1)

**Outcome: S1 delivered and its deliverable — the D8 reading — was taken.** Six of seven tasks landed with an independent Reviewer PASS; one is blocked and preserved as an artifact with a declared coverage gap.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bilateral/clarisa-project-automapping/` |
| Archive date | 2026-08-14 |
| Depth | **Standard** (corrected from the proposal's pre-design *Lite*) |
| Stage | **S1 of 2** — measurement. S2 (matcher, provenance, review queue) is **not** specified |
| Branch | `JuankCadavid/AC-1676` — 5 commits, pushed |
| Approval mode | pre-approved, with every escalation still stopping for the user |

## 2. Final Status

| | |
| --- | --- |
| Tasks | **6 `[x]` · 1 `[~]` (T-06, accepted as follow-up)** |
| Tests | **2173 passing / 325 suites** (full package) |
| Lint | `npx eslint` clean (bare, no `--fix`, per K-001) |
| Migrations | **Zero** — R-CPA-007 AC.1 holds across the whole diff |
| Reviewer | **PASS on all six completed tasks** (Opus, independent of the gemini implementer) |
| Judgment-day | 5 severe / 4 warning / 2 suggestion — **all applied** |
| **D8 reading** | ✅ **Taken 2026-08-14 over VPN against DEV, both CLARISA environments** |

## 3. Requirements Delivered

| ID | Delivered |
| --- | --- |
| R-CPA-001 | `ClarisaProject` carries `external_code`, `phase`, `source_center_acronym` — optional and nullable |
| R-CPA-002 | Alliance slice by normalized centre + configurable phase; non-numeric phase rejects with `400` naming value **and** source |
| R-CPA-003 | `normalizeExternalCode()` — closed `{B-, C-}` prefix set, stripped once, with collision detection |
| R-CPA-004 | Coverage report: 5 tiers, first-hit-wins, every percentage carrying numerator + denominator |
| **R-CPA-005** | **Absence path returns `null`, never `0`** — validated live against production |
| R-CPA-006 | Admin-only endpoint; **403 envelope uncovered** (see §6) |
| R-CPA-007 | Zero persisted state, zero DI-scope change |

## 4. Files Changed

| Area | Files |
| --- | --- |
| CLARISA integration | `clarisa-project.types.ts`, `clarisa-projects.service.ts` (+ spec) |
| Bilateral module | `bilateral-mapping-coverage.service.ts` (+ spec), `utils/external-code.util.ts` (+ spec), `dto/coverage-report{,.query}.dto.ts`, controller (+ spec), module, entity header |
| **Migrations** | **none — by design** |

~1300 production LOC / ~1700 test LOC.

## 5. Test & Validation Evidence

- **Full package:** 2173 passing. The one non-T-06 failure under full load (`excel-workbook.builder.spec.ts`) was proven a load flake — it passes in isolation (51 tests) and this spec touches no file under `reports/`.
- **K-004 falsifiability demonstrated per task** — each gate was broken on purpose and observed red before being trusted.
- **`test-report.md` and `validation-report.md` are ABSENT.** `/akili-test` and `/akili-validate` were not run; **the absence was explicitly accepted by the user at this archive gate.** Precedent: `2026-08-13-bilateral--primary-contributing-sp`.

## 6. Accepted Warnings & Follow-Ups

| # | Item | Owner |
| --- | --- | --- |
| **F-1** | **T-06 blocked** — the only gate exercising the real HTTP path. Six attempts; root cause structural (`BilateralProjectMappingRepository extends Repository` needs live TypeORM metadata). Preserved at `artifacts/` with a README. **D10 route-shadowing and D11 scope-cascade are mitigated by Leader inspection; D6 — the 403 envelope — is UNCOVERED** | Squad |
| **F-2** | **OQ-7 / RB-4** — the legacy admin picker. The D8 reading escalated this: the two Alliance selectors are **disjoint** (0 overlap), so it is not a case-folding bug but a different population | **User / product** |
| **F-3** | **OQ-5** — are the 38 `window3` projects in S2's scope? Population measured (342/38); decision outstanding | Product |
| **F-4** | **R-1 blocks S2's release** — production publishes none of the upstream fields, confirmed by the production reading | CLARISA team |
| **F-5** | Advisories recorded and deliberately **not** converted into tasks: predicate duplication in `computeClarisaSplits`; undiscriminated `matched_on`; ambient-env dependence in three phase tests; `@ApiPropertyOptional` on always-present nullable blocks | S2 |

## 7. Historical Notes

**Why staged.** The proposal killed decision **D-PI-8** ("no upstream join field exists") by measurement, then refused to specify the matcher on an unmeasured distribution — the failure **K-004** names. S1 built the instrument; the reading is the deliverable.

**What the reading proved that no test could.** Production returns 299 projects with no `external_code`, and the report emits `null` rather than `0%`. Three findings were unpredictable from the design: normalization did **9.5×** the work of exact matching (304 vs 32), **`FULL_NAME` resolved zero**, and the two Alliance selectors are **disjoint**.

**Coverage: 336 / 1543 contracts = 21.8 %, which is 88.4 % of the reachable ceiling** — only 380 Alliance-2026 projects exist to match against, so 24.6 % is the maximum. The raw "78 % unresolved" misstates the instrument fourfold.

**The most valuable review finding came from mutation, not reading.** T-04's availability guard was written *correctly* against `all`; no reader would have objected. But every fixture set `all === slice`, so mutating the guard left all 11 tests green — the gate for the spec's headline behavior was decorative. Correct code, false gate.

**Recorded Leader errors** (in `execution.md`, not smoothed over): two brief-design mistakes that cost rework — forbidding `prettier --write` alongside `npm test`, and incomplete DI guidance that consumed a T-06 attempt; one false claim about a diff, caught by a Reviewer that read the file instead of believing the summary; and one requirement clause that the clause-coverage table — written precisely to prevent this — still left unowned.

**Budget.** Tripwire fired at ~680 LOC estimated vs ~3000 actual. Escalated; the user ruled the estimate wrong rather than the code. The tripwire working is the point.
