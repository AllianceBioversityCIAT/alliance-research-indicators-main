# Test Report — Results Center / External Results Readonly View

## Overall: PASS, with 4 environment-dependent gaps explicitly recorded (not faked)

- **Client:** 307 suites / **6316 tests** passing — re-run and verified by the Leader, not taken from Tester reports.
- **Server:** 321 suites / **2047 tests** passing — likewise re-verified.
- **Lint:** clean in both packages. **tsc:** only the 7 documented pre-existing unrelated errors (`environment.documentOverviewUrl`/`keyProjectOverview`).
- **Product bugs found:** none. **Vacuous tests found and corrected:** 3 coverage gaps closed (below).

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `results-center/external-results-readonly-view` |
| Phase | `/akili-test` (Leader → Tester harness) |
| Date | 2026-07-28 |
| Suites run | 3 (backend-unit, frontend-unit-A, frontend-unit-B) |
| Testers spawned | 3, **in parallel** (file slices verified disjoint before dispatch) |
| Run inline by Leader | none — all three suites were substantial and independent |
| Requirements in scope | R-RC-001…R-RC-014, NFR-RC-001/002/003 |

---

## 2. Summary

### Why this phase found anything at all

Every task already had co-located unit tests from `/akili-execute`, most adversarially reviewed. What had **never** been done was systematic requirement→scenario→test traceability. Testers were instructed that *an AC is not covered because a similarly-named test exists — read the assertion*, and that a vacuous test counts as a **gap**, not as coverage.

That framing was load-bearing: this spec had already produced **three** cases of green tests over broken behavior (a cached `computed()` making 14/15 assertions vacuous; assertions against a `Router` the component never injects; a stub whose `template: ''` meant the control under test never rendered). All three were caught only by mutation-testing, so every Tester was required to mutation-verify anything it doubted.

### Suite partition and skills

| Suite | Requirements | Skills (Leader-selected) | Effort |
| --- | --- | --- | --- |
| `backend-unit` | R-RC-011, R-RC-012, R-RC-005 AC.3/AC.4, NFR-RC-001 | `nestjs-expert` | medium |
| `frontend-unit-A` | R-RC-001, 002, 007, 013, 014 (F-1/F-2 portion) | `angular-developer` | high |
| `frontend-unit-B` | R-RC-003, 004, 005 AC.1/AC.2, 006, 008–010, NFR-RC-003 | `angular-developer`, `ui-ux-pro-max` | high |

Deviation from the spec's task-level skill lists: added `ui-ux-pro-max` to frontend-unit-B for the header/a11y requirements (R-RC-008/009/010, NFR-RC-003), which the task lists didn't anticipate as a *testing* concern.

### Gaps closed by this phase (all mutation-verified)

| # | Requirement | What was actually missing |
| --- | --- | --- |
| 1 | **R-RC-011 AC.2** | **Zero** coverage. Nothing asserted the `@ApiProperty` metadata existed — the AC ("Swagger documents the four new optional fields") was unproven. New `metadata-result.dto.spec.ts` reads the reflect-metadata directly. |
| 2 | **R-RC-012 AC.3** | Type-only. The existing test asserted `ConflictException` but never the *message*, while the AC specifically requires the description not collide with the locked PRMS 409 string that the client matches with `===`. A reword could have broken the client's toast logic with the suite still green. |
| 3 | **R-RC-001 AC.1** (title-link) | The **entire** `results-center-table.component.spec.ts` runs under `.overrideComponent(..., { template: '' })`, so every "DOM" assertion in it is against hand-built synthetic fixtures. No test proved the real `[routerLink]` on the title anchor. New block renders the real template via `provideRouter` + `RouterTestingHarness`. |
| 4 | `clearOicrSelection()` | Its method-level guard was untested — only the template guard was proven. This is the exact control where a gap survived two rework rounds, so the defense-in-depth layer needed its own coverage. |

Also reconciled: a **doc/code drift** the backend Tester flagged rather than silently fixed — `requirements.md`'s NFR-RC-001 and OQ-2 still described the author/contact `DELETE` as "the one genuinely deferred" gap after T-12 had shipped. Corrected.

---

## 3. Backend Unit Tests — PASS

**Command:** `npm test` (full) + targeted `npx jest --testPathPattern="result-status-workflow.service.spec.ts|results.service.spec.ts|bilateral.service.spec.ts|bilateral.service.sourceReadOnlyGate.spec.ts|result-users.controller.spec.ts|metadata-result.dto.spec.ts"`
**Result:** full 321 suites / 2047 tests; targeted slice 7 suites / 150 tests. Lint clean.

| Requirement | AC | Evidence | Result |
| --- | --- | --- | --- |
| R-RC-011 | AC.1 | `results.service.spec.ts` — STAR fixture + TIP fixture both return the 4 fields | covered |
| R-RC-011 | AC.2 | `metadata-result.dto.spec.ts` (**new**) — asserts `required: false` + correct type per field | covered (was a gap) |
| R-RC-011 | AC.3 | `results.service.spec.ts` baseline `toEqual` still passes with the additive fields | covered |
| R-RC-012 | AC.1 | `result-status-workflow.service.spec.ts` — asserts `mockTransaction` (wrapping the only `.update()`) is **never invoked**, proving rejection *before* DB work, not merely that an exception was thrown | covered |
| R-RC-012 | AC.2 | STAR-platform and implicit/undefined-platform cases both proceed | covered |
| R-RC-012 | AC.3 | **new** `it.each(['TIP','PRMS','AICCRA'])` — exact message + `not.toBe` the locked PRMS string | covered (was a gap) |
| R-RC-005 | AC.3 | `bilateral.service.spec.ts` — TIP/AICCRA rejected, message ≠ PRMS string, `transaction` never called | covered |
| R-RC-005 | AC.4 | `bilateral.service.sourceReadOnlyGate.spec.ts` run **unmodified** as regression; PRMS 409 byte-for-byte intact | covered |
| NFR-RC-001 | all 3 guards | bilateral (above) + submit-status (above) + `result-users.controller.spec.ts` `it.each(TIP/PRMS/AICCRA)` asserting the service was **not called** | covered |

**Mutation evidence:** removing `_assertStarSourceWritable(...)` from `changeStatus()` turns 4 tests red; stripping `@ApiProperty` off `platform_code` turns the new DTO test red.

---

## 4. Frontend Unit Tests — PASS

**Command:** `npm run test` from `client/research-indicators/`. **Result:** 307 suites / 6316 tests. Lint clean; tsc at documented baseline.

### 4a. Suite A — entry points + shared shell

| Requirement | AC / Scenario | Evidence | Result |
| --- | --- | --- | --- |
| R-RC-001 | AC.1 row click | `results-center-table.component.spec.ts` — `openResult`, `processRowClick` for PRMS | covered |
| R-RC-001 | AC.1 year-link | `openResultByYear` navigates for PRMS/TIP/AICCRA | covered |
| R-RC-001 | AC.1 title-link (real DOM) | **new** real-template block via `RouterTestingHarness` asserting `router.url === '/result/TIP-7'` | covered (was a gap) |
| R-RC-001 | AC.2 `BUT it must NOT` | `not.toHaveBeenCalledWith('resultInformation')` across all 6 entry points | covered |
| R-RC-001 | AC.3 STAR unchanged | snapshot/latest-year branch tests intact | covered |
| R-RC-001 | Scenario `AND IT MUST` (query params) | asserts `resultEntryContext` params preserved | covered |
| R-RC-002 | AC.1 | `submission.service.spec.ts` — STAR cases + `it.each` 15-case non-STAR matrix, fresh TestBed per case | covered, non-vacuous |
| R-RC-002 | AC.2 | Structural — successful injection across 5 specs + clean tsc/lint | covered (structural) |
| R-RC-007 | AC.1 / AC.2 / Scenario | `result-sidebar.component.spec.ts` — real-DOM assertions for all 4 actions, each paired with a STAR regression | covered |
| R-RC-013 | AC.1 / AC.4 | `my-latest-results.component.spec.ts` — real `RouterTestingHarness`; positive card-click navigates, `.more-vert` does not | covered, non-vacuous |
| R-RC-013 | AC.2 / AC.3 | snapshot→`general-information`+version; STAR link/params | covered |
| R-RC-014 | AC.1 | `section-header.component.spec.ts` — confirm-delete handler invoked **programmatically** does not call `DELETE_Result` | covered, non-vacuous |
| R-RC-014 | AC.2 | `submission-history-item.component.spec.ts` — `confirmEdit()` invoked directly does not call `PATCH_StatusChangeDate` | covered, non-vacuous |
| R-RC-014 | AC.5 (F-1/F-2 portion) | status_id 4/5/7 + admin regression cases | covered |

### 4b. Suite B — result tabs + form header

| Requirement | AC / Scenario | Evidence | Result |
| --- | --- | --- | --- |
| R-RC-003 | AC.1 / AC.2 / Scenario | `authors-contact-persons-table.component.spec.ts` (disabled Add + delete, no emit) and `oicr-details.component.spec.ts` (no `DELETE_AutorContact`; STAR Draft still deletes) | covered |
| R-RC-003 | AC.3 (revised) | both the STAR-editable-unchanged and the accepted STAR-non-editable-tightening cases | covered |
| R-RC-004 | AC.1 / AC.2 | `oicr-details.component.spec.ts` — real-template disabled bindings for MEL Expert + SharePoint, admin × external vs admin × STAR | covered |
| R-RC-005 | AC.1 / AC.2 | `bilateral.service.spec.ts` — false for external regardless of `is_read_only`/admin/owner; STAR unchanged | covered |
| R-RC-006 | AC.1 / AC.2 | all three components' `setSectionAndOpenModal` no-op externally, unchanged for STAR | covered |
| R-RC-008 | AC.1 / AC.2 / AC.3 | `form-header.component.spec.ts` — renders for external, absent for STAR, and **no "Invalid Date"** when `updated_at` missing | covered |
| R-RC-009 | AC.1 / AC.2 / AC.3 | opens in new tab; no dead button when `public_link` absent; never for STAR | covered |
| R-RC-010 | AC.1 / AC.2 | platform-specific copy (TIP / AICCRA→MARLO / PRMS) | covered |
| NFR-RC-003 | accessible names, native semantics | Structural — real `<button type="button">` with visible text asserted | **partial** — see gaps |

**Independent verification worth noting:** Suite B was asked to verify, not assume, the `multiselect` `#rows` projection risk in its three consumers (the same mechanism that let a gap survive two rework rounds in `select`). It confirmed the remove button lives in `multiselect`'s own template gated on `!this.disabled`, and the consumers' `#rows` templates render only display components. Verified, not assumed.

---

## 5. Integration & E2E Tests — NOT RUN (blocked, documented)

No integration or E2E suite was run. Two independent blockers, both pre-existing:

1. **No `## Local Environment` contract** in `docs/infrastructure.md` — the section `/akili-test` and `/akili-execute` are designed to consult for start/seed/health-check commands. Recommend closing via `/akili-constitution` Step 6B.
2. **The test environment cannot verify this branch.** `allianceindicatorstest.ciat.cgiar.org` serves *deployed* code; pointing a browser there would exercise the old behavior. `environment.dev.ts` targets `http://localhost:3001/api/` (needs the NestJS server + MySQL + synced TIP/PRMS/AICCRA data), and the Cognito `redirect_uri` is hardcoded to the test env, so login from `localhost:4200` doesn't close the loop.

Genuine end-to-end verification needs either a full local stack or a deployment of this branch.

---

## 6. Coverage & Traceability Summary

| Requirement | Covered | Notes |
| --- | --- | --- |
| R-RC-001 | ✅ AC.1–AC.3 + Scenario | AC.4 (`search-a-result` inherits) is a T-11 manual item — no code change was needed there |
| R-RC-002 | ✅ | AC.2 structural |
| R-RC-003 | ✅ | incl. the revised AC.3 |
| R-RC-004 | ✅ | |
| R-RC-005 | ✅ | client AC.1/AC.2 + server AC.3/AC.4 |
| R-RC-006 | ✅ | |
| R-RC-007 | ✅ | |
| R-RC-008 | ✅ | incl. degradation AC.3 |
| R-RC-009 | ✅ | incl. no-dead-button AC.2 |
| R-RC-010 | ✅ | |
| R-RC-011 | ✅ | AC.2 newly covered |
| R-RC-012 | ✅ | AC.3 newly covered |
| R-RC-013 | ✅ | |
| R-RC-014 | ✅ AC.1–AC.5 | **AC.6 is an audit, not a unit test** — satisfied separately by the independent re-sweep recorded in `execution.md` → `## AC.6 Re-sweep` |
| NFR-RC-001 | ✅ | all three server guards |
| NFR-RC-002 | ⚠️ not evaluated | performance; code-review-level only, see gaps |
| NFR-RC-003 | ⚠️ partial | structural only, see gaps |

---

## 7. Remediation

None required — no failures and no `PRODUCT_BUG` findings. The four coverage gaps found were closed within this phase.

---

## 8. Accepted Gaps (recorded, with the manual steps that would close them)

| # | Gap | Why not automated | Manual steps |
| --- | --- | --- | --- |
| 1 | **T-11's three interactive ACs** — header render/degradation in a browser, year-badge navigation in the real DOM, STAR visual baseline | Needs a running stack (§5) | Open a TIP, a PRMS and an AICCRA result end-to-end via Results Center **and** `search-a-result`; walk all 12 tabs; confirm synced-date/public-link/deep-link render and degrade; click a year badge on a multi-snapshot external row; confirm a STAR result is unchanged |
| 2 | **NFR-RC-003 full a11y** | jsdom cannot prove focus order, AT announcement, or contrast against real token values | Tab to "Open public link" / "Open result in {platform}", confirm visible focus ring and Enter/Space activation; run axe or Lighthouse on the rendered header |
| 3 | **NFR-RC-002 performance** | No load-test harness in this repo; the NFR itself specifies "verified by code review" | Confirm at review that no new eager-load/N+1 was introduced by the metadata-endpoint widening or `FormHeaderComponent` |
| 4 | **R-RC-014 AC.6** | An exhaustive static sweep, not a unit test | Already satisfied — see `execution.md` → `## AC.6 Re-sweep` (zero remaining findings, independently re-run) |

**Note on gap 1:** T-04 and T-14 are direct evidence that "unit tests pass" is insufficient for the interactive ACs specifically — in both cases the suite was green while the real DOM behavior was broken. Gap 1 should be treated as genuinely open, not as a formality.
