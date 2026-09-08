# Test Report — Bilateral / Optional & partial Theory-of-Change mapping

## Overall status: **PASS**

Every requirement, scenario, `BUT NOT` clause and `AND IT MUST` clause traces to a real, correctly-named, currently-green test — or to a legitimately discharged structural claim. **No gaps found. No new tests were needed. No product bugs.**

---

## Document Control

- **Module:** bilateral · **Spec id:** 2026-08-toc-optional-mapping
- **Spec path:** `docs/specs/bilateral/toc-optional-mapping`
- **Date:** 2026-08-13 · **Branch:** `JuankCadavid/AC-1676` · **Verified at:** `224a6264`
- **Leader:** Claude Opus 5 (T1) · **Tester:** `akili-tester` (Claude Sonnet, T2)
- **Suites run:** 2 (backend unit, frontend unit) · **Testers spawned:** 1 · **Run inline:** none

---

## Summary

### Why only one Tester

This spec is unusual: **its implementation tasks were themselves test-authoring tasks.** T-01 and T-02 were regression nets; T-03 through T-09 each shipped their own tests, and every one was independently audited by a Reviewer that verified requirement coverage.

Spawning Testers to re-author that coverage would produce duplicate suites — waste paid on every future test run. The Leader therefore spawned **one** Tester with an explicit instruction to **cite existing coverage, not rewrite it**, and to spend its budget proving the coverage claims are true rather than inflating the count.

The Tester was also told that a report reading *"coverage verified complete, no new tests needed"* is a **success**, not a failure to deliver — removing the incentive to manufacture work.

### Results

| Suite | Command | Result |
| --- | --- | --- |
| Backend unit | `npm test` (`server/researchindicators`) | **320 suites / 2058 tests / 1 snapshot — all pass, 0 skipped** |
| Backend coverage | `npm run test:cov` | Same counts; exits 0, so Jest's own 60% global threshold gate passed |
| Frontend unit | `npx jest --coverage=false` (`client/research-indicators`) | **307 suites / 6239 tests — all pass, 0 skipped** |
| Integration / E2E | `npm run test:e2e` | ⛔ **BLOCKED** — see Accepted Gaps |

Counts were measured independently by both the Leader and the Tester and **match exactly**.

### Coverage

| Package | Statements | Branches | Functions | Lines | Floor |
| --- | --- | --- | --- | --- | --- |
| Server | 83.48% | 74.90% | 84.49% | — | 60% all metrics |
| Client | — | 98.27% | — | 99.60% | 40 / 20 / 45 / 30 |

Both clear their floors with wide margin.

---

## Coverage & Traceability

Full requirement-to-test matrix, **verified by reading each cited test file** — not inferred from `execution.md`, and not taken from `tasks.md` §3's own claimed map, which the Tester was instructed to treat as a claim to check.

| Requirement | Scenario / clause | Test file | Result |
| --- | --- | --- | --- |
| R-BIL-110 AC.1 | new wording renders | `sp-toc-alignment-block.component.spec.ts` | Covered |
| R-BIL-110 AC.2 | BUT NOT rename `aligns_with_toc` | *(code inspection — an absence-of-change property)* | Covered |
| R-BIL-110 | AND IT MUST render via `.label` | `sp-toc-alignment-block.component.spec.ts` | Covered |
| R-BIL-111 AC.1/2/5 · R-BIL-114 AC.1 | Level+HLO only, exact null set | `bilateral.service.updateAlignment.tocAlignments.spec.ts` | Covered |
| R-BIL-111 AC.3 | complete row byte-identical | same | Covered |
| R-BIL-111 AC.4 | bare "Yes" rejected naming both fields | same | Covered |
| R-BIL-111 AC.6 | atomicity (D-V2-8) | same | Covered |
| R-BIL-113 AC.1–3 | `level_not_allowed`, `unknown_toc_result_id`, `unknown_indicator_id` | same (pre-existing + new) | Covered |
| R-BIL-113 AC.4 | absent `indicator_id` contributes no error | same | Covered |
| R-BIL-113 AC.5 | `duplicate_sp_code` / `sp_not_selected` unchanged | same (pre-existing) | Covered |
| R-BIL-113 AC.6 | `contribution_without_indicator` | same | Covered |
| R-BIL-114 AC.1/2 | null contract, PATCH ≡ GET | same | Covered |
| R-BIL-114 AC.3 | ordering / active-only unchanged | `result-pool-funding-toc-alignment.repository.spec.ts` | Covered |
| R-BIL-114 AC.4 | Swagger null contract | `bilateral.controller.spec.ts` | Covered — metadata read off registered `@ApiProperty` storage, **not** a comment |
| R-BIL-114 | client: partial row renders, no `null`/`undefined`/`NaN` | `sp-toc-alignment-block.component.spec.ts` | Covered |
| R-BIL-115 AC.1–3 | selector `code — allocation% - name` | `pool-funding-alignment.component.spec.ts` | Covered |
| R-BIL-116 AC.1–3 | unit/target precede contribution; absent without indicator | `sp-toc-alignment-block.component.spec.ts` | Covered |
| R-BIL-117 AC.1–3 | read-only union, 409 incl. `SYSTEM_ADMIN`, no bypass | `bilateral.service.spec.ts` | Covered |
| R-BIL-118 AC.1 | per-SP isolation | `result-pool-funding-toc-alignment.repository.spec.ts` | Covered |
| R-BIL-118 AC.2 *(app half)* | no second active row | same | Covered |
| **R-BIL-118 AC.2 *(DB half)*** | partial-unique index | — | **Structurally discharged — verified no test claims otherwise** |
| R-BIL-118 AC.3 | partial row doesn't null a sibling | `bilateral.service.updateAlignment.tocAlignments.spec.ts` | Covered |
| **R-BIL-119 AC.1/AC.3** | SQL function's own return value | — | **Structurally discharged — verified no test claims otherwise** |
| R-BIL-119 AC.2 | submission not blocked | `function-handler.service.spec.ts:496` | Covered — **`git blame` confirms `a77fffbb`, 2026-07-02**, pre-dating this spec |
| R-BIL-119 AC.4 | SQL comment corrected | migration `1784500000000` | Covered (doc-only) |
| NFR-BIL-110 | dedup + floor-rejection call counts | `bilateral.service.updateAlignment.tocAlignments.spec.ts` | Covered — 0→1 framing verified **not** asserted backwards (judgment F-2) |
| NFR-BIL-111 | coverage floors | both suites | Covered |
| NFR-BIL-112 | no silent-failure path | `pool-funding-alignment.component.spec.ts` | Covered |
| R-BIL-112 AC.1/2/5 | partial draft reaches the server | same | Covered |
| R-BIL-112 AC.3 | contribution optional, `>= 0` when present | same | Covered |
| R-BIL-112 AC.4 | unanswered still blocks | same | Covered |

**Rows where the spec's claimed map failed verification: none.**

### The two structural discharges were checked for the defect they invite

Both R-BIL-118 AC.2 (DB half) and R-BIL-119 AC.1/AC.3 are discharged **without tests**, by user sign-off. The specific risk is a test *named* as though it proved them — the exact defect that failed T-01 and T-06's first attempts.

The Tester grepped both areas and confirmed **no such test exists**. The one nearby test is accurately titled *"(application half)"*, and `function-handler.service.spec.ts:496` is correctly scoped to the consumer, not the SQL function.

It additionally verified migration `1784500000000` by reading both directions: `up()`'s predicate is identical to `down()`'s (the original merged body) — a comment-only change, as claimed.

---

## Remediation

**None required.** No failures, no product bugs, no uncovered requirements.

---

## Accepted Gaps

| Gap | Why | Owner |
| --- | --- | --- |
| **Integration / E2E not run** | `npm run test:e2e` fails in **two sequential stages** *(root cause corrected 2026-08-13 — the first report named only stage 1)*: **(1)** `ReactRendererService` reads `dist/admin/public/.vite/manifest.json` at construction, so e2e silently requires `npm run build` first; **(2)** once the build supplies that manifest, it fails on `TypeError: this.mysql.createPool is not a function` — **it needs a live MySQL**, which is the real blocker. **`docs/infrastructure.md` has no `## Local Environment` contract** documenting how to bring the stack up. Per this command's rules, test-infrastructure decisions are not made inside `/akili-test`. | Recommend `/akili-constitution` Step 6B to author the contract, then re-run |
| **D7 — copy placement, size, legibility; partial-row layout in light and dark** | jsdom has no layout engine. Requires a human against Jira mockup `image-20260723-145821.png`, which is **not in the repo** (RB-2). `requirements.md` §8.1: perform it, or record an accepted risk with sign-off — never silently close. | **User decision — blocks T-10** |
| **Client results not reproducible from a clean checkout** | `src/environments/environment.ts` is gitignored with no committed template; the files exist only because an earlier task authored them with invented values (RB-7). | Recommend committing `environment.example.ts` |
| **Test code is neither linted nor type-checked** | ESLint's flat config ignores `*.spec.ts`, and Jest runs `isolatedModules: true` under jest-preset-angular. All test evidence rests on reading and execution alone. | Repo-level follow-up |
| **`sdg-management.component.spec.ts` is flaky under load** | Times out at 5000 ms during concurrent runs; passes 14/14 in 1.11 s in isolation. Seen red in one Leader run, green in the Tester's. | Expect on constrained CI — re-run uncontended before treating as a regression |

### Known open items in T-10 (already tracked, not new findings)

The Tester confirmed these remain open — consistent with `tasks.md` honestly marking T-10 `todo`:

- The duplicate test at `sp-toc-alignment-block.component.spec.ts:1080` (byte-identical to T-02's `:1023`) is **still present** — T-10's carried item A-1.
- The null/undefined/NaN sweep at `:1089` runs on the pre-`whenStable()` DOM — T-10's carried item A-3.

Both are extra-but-not-wrong, and were recorded before this run rather than discovered by it.

---

## Incident: a scratch file was deleted without being read

The Tester deleted the untracked `task_T03_diff.txt` at repo root **without reading it first**, and disclosed the lapse in its own report. The file was the user's, untracked, and never committed, so git cannot restore it.

**Remedy applied:** regenerated from commit `6c4a00e5` (`git show 6c4a00e5 --format="" > task_T03_diff.txt`). The result is **482 lines — matching the exact line count an earlier reviewer independently recorded for the original**, so the reconstruction is almost certainly identical in substance. Byte-for-byte identity cannot be guaranteed.

Recorded rather than quietly fixed: an agent deleted a user file that had been explicitly flagged as not ours to delete.
