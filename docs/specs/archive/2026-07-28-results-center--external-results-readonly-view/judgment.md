# Judgment Day — Design Review Ledger

- **Target:** `requirements.md` + `design.md` + `tasks.md` (spec: `results-center/external-results-readonly-view`)
- **Mode:** judgment_day (blind dual review, `/akili-specify` Step 2.3 "Review Design")
- **Round:** 1
- **Judges:** two independent `general-purpose` agents, model `sonnet` (author of the spec was `opus` — author ≠ auditor satisfied)
- **Date:** 2026-07-27
- **Status:** findings merged, correction round pending user decision

---

## Merged Findings (deduplicated, most severe first)

### F-1 — [SEVERE, CONFIRMED by both judges] NFR-RC-001 / Design Decision D-2 mischaracterize the pool-funding-alignment PATCH as fully unguarded server-side

`bilateral.service.ts:659` calls `assertPrmsSourceWritable(context.platform_code)` before any other check; `isPrmsSourced()` (~lines 1332-1342) already rejects the mutation when `platform_code === 'PRMS'` (`ConflictException`, covered by an existing test suite from a prior spec). **Only TIP and AICCRA remain unguarded on this endpoint** — not all three platforms, as requirements.md §7 and design.md §8 currently state. Generalizing the existing PRMS-only gate to `platform_code !== 'STAR'` is a small, low-risk change to an already-tested code path, not the "ballooning a UI ticket into security hardening" that D-2 uses to justify full deferral.

**Both judges independently confirmed** this against `bilateral.service.ts`, `bilateral.controller.ts`'s Swagger text, and the existing `bilateral.service.sourceReadOnlyGate.spec.ts` test suite.

### F-2 — [SEVERE, CONFIRMED by both judges] D-1 (sync-date = `updated_at`) and D-2 (defer submit-status hardening) are in direct, unacknowledged tension

`result-status-workflow.service.ts` `changeStatus()` has zero `platform_code` check and calls `manager.getRepository(Result).update(resultId, { result_status_id, ...audit })`. Because `updated_at` is a TypeORM `@UpdateDateColumn`, TypeORM auto-populates it on **any** `.update()`/`.save()` call, regardless of which fields are explicitly set. This means the exact endpoint NFR-RC-001 already flags as unguarded is a confirmed, mechanical way to silently corrupt the very "last synced" date this spec's own R-RC-008 depends on. D-1's assumption ("only the sync ingestion path writes to non-STAR rows") is not just theoretically risky — it is falsified by a code path the design itself already investigated, and neither decision cross-references the other.

**Both judges independently confirmed** via `result-status-workflow.service.ts` and `auditable.entity.ts`'s `@UpdateDateColumn`.

### F-3 — [SEVERE, CONFIRMED by both judges] `search-a-result.component.ts` is not "possibly the same pattern" — it is already fully unguarded in production today

`search-a-result.component.ts:42-45` `openResult()` navigates to `/result/{platformCode}-{code}/general-information` **unconditionally**, for every `platform_code`, no modal, no branch. Design Decision D-3 and `tasks.md` T-10 frame this as "verify whether the same pattern exists" — but it doesn't need verifying, it's already confirmed absent. This means **all five readonly gaps (R-RC-003…007) are already reachable in production right now**, independent of whether this spec ships, via this entry point. (Both judges also independently confirmed `my-latest-results.component.ts` genuinely *is* gated today via `opensResultInformationModal()` — D-3's framing is correct for that file, just not for `search-a-result`.)

### F-4 — [MODERATE, CONFIRMED — same pattern found independently in two different files] Design's Composition/Reuse section (§2.1/§2.2) omits new DI wiring at least two components need

- Judge A: `BilateralService` (`bilateral.service.ts:52-54`) injects only `ApiService`, `RolesService`, `CurrentResultService` today — the R-RC-005 fix (`this.cache.isExternalResult()`) requires adding a `CacheService` injection the design never calls out.
- Judge B: `organization-item.component.ts` (Innovation Details) similarly injects only `SubmissionService` today — the R-RC-006 fix there needs the same new injection.

Neither is architecturally risky (`CacheService` has no dependencies, no circularity), but an implementer following design.md's Composition list as exhaustive would be surprised mid-task in both places.

### F-5 — [MODERATE, CONFIRMED by both judges] `result-sidebar.component.html` line citations for Submit/Unsubmit and Review don't match the actual template

Cited: Submit/Unsubmit `:74-76`, Review `:80-88`. Actual: `:74-76` is the **shared outer wrapper** for all three buttons (Submit/Unsubmit/Review/Approve); Review's own block is `:77-88` (not 80-88); Submit/Unsubmit's own block is `:89-105` (not 74-76). Approve (`:106-120`) and the OICR-dropdown citations are exact. Functionally the fix still closes the gap either way (editing the shared wrapper once covers all three), but literal line-following would misdirect an implementer for two of the four items.

### F-6 — [SUSPECT — single judge (Judge B), not cross-confirmed] A sixth Results Center entry point, `openResultByYear()`, is missing from R-RC-001/T-04's scope

`results-center-table.component.ts:303-312` branches on `platform_code` and does a bare `return` (dead click, no modal, no navigation) for external platforms, wired from the snapshot-years column (`results-center-table.component.html:204-205`, `:221-222`). If only the four named handlers are fixed, this becomes a newly-inconsistent dead click (the row navigates correctly, but a specific year-link on the same row does nothing) after T-04 ships. Per protocol, single-judge findings are recorded as suspect, not auto-fixed — but this is cheap for the orchestrator to independently verify given the file was already open during design.

### F-7 — [SUSPECT — single judge (Judge A), not cross-confirmed] The OICR Authors/Contact fix incidentally changes existing STAR behavior in non-editable statuses

Today, the Add-button click always opens the modal (only its *confirm* action is gated by `isEditableStatus()`); the design's proposed `disabled` input on the table itself would newly disable the Add button one level earlier for STAR results in a non-editable status too — a scope-widening side effect R-RC-003's AC.3 doesn't test for. (Judge B separately, and consistently with this theme, flagged that `onDeleteContactPerson()` has no method-level `isEditableStatus()` guard at all today for STAR either — a related, pre-existing, non-external-specific gap explicitly out of this spec's stated scope.)

### F-8 — [Verified, no issue — both judges] Core architecture (R-RC-002 / D-6, `isExternalResult` + `isEditableStatus()` delegation) is sound

No circular dependency, no signal-computation-order risk, behavior-preserving for STAR results — confirmed independently by both judges against the actual `cache.service.ts` / `submission.service.ts` code.

### F-9 — [Verified, no issue — both judges] All 5 originally-named gaps (R-RC-003…007) are accurately diagnosed at the code level, and no *additional* unguarded control of the same class exists elsewhere in the 12 tabs

Both judges independently re-swept the tab set and found nothing beyond what requirements.md already lists.

---

## Verdict Summary

| Question | Verdict |
| --- | --- |
| Q1 — Are the 5 gaps closed by the design? | Yes at the named lines, modulo F-4 (missing DI) and F-5 (citation drift) as implementation-guidance risks, not logic risks. |
| Q2 — Is deferring server hardening (D-2/T-12) acceptable? | Weaker than presented — F-1 shows one endpoint is only partially open (cheap to close), F-2 shows the deferred submit-status gap actively undermines this same spec's own sync-date feature. |
| Q3 — Is the `isExternalResult`/`isEditableStatus()` design sound? | Yes, cleanly confirmed by both judges. |
| Q4 — Is the `updated_at` sync-date assumption (D-1) safe to ship? | No — confirmed falsifiable via the same submit-status path already flagged (not fixed) by this spec. |
| Q5 — Missed entry points / inconsistencies? | Yes — `search-a-result` (F-3, confirmed) is a live gap today, not a "maybe"; `openResultByYear` (F-6, suspect) is a likely sixth entry point; sidebar citations (F-5) need correcting. |

## Overall Recommendation (both judges independently converged)

**NEEDS CORRECTION BEFORE PROCEEDING** — on documentation accuracy and scope-decision inputs, not on the core architecture. `R-RC-002`/D-6 is sound and doesn't need to change. Recommended before task execution begins:
1. Correct NFR-RC-001/D-2's factual claim (F-1) and reconsider whether the trivial PRMS→non-STAR generalization on the bilateral PATCH ships with this spec instead of full T-12 deferral.
2. Resolve the D-1/D-2 tension (F-2) — either bring the submit-status guard in-scope, or explicitly document the residual sync-date-corruption risk as accepted rather than silent.
3. Re-scope T-10 (F-3) from "verify" to "fix" for `search-a-result` — it's already a confirmed live gap, not a symmetrical check alongside `my-latest-results`.
4. Independently verify F-6 (`openResultByYear`) and fold it into R-RC-001/T-04 if confirmed.
5. Correct the sidebar line citations (F-5) and note the two DI additions (F-4) in design.md's Composition section.

---

## Round 1 Correction — Status

**User selected "Fix only"** — corrections applied to `requirements.md`, `design.md`, and `tasks.md` without a scoped re-judgment round. Per protocol, only the SEVERE, both-judges-confirmed findings (F-1, F-2, F-3) plus the MODERATE both-judges-confirmed findings (F-4, F-5) were corrected as findings; F-6 (single-judge) was independently re-verified directly against the source file by the orchestrator before being folded in, since it was cheap to confirm. F-7 (single-judge) was resolved as an explicit scope decision rather than a code workaround (documented in requirements.md R-RC-003).

**Corrections applied:**
- **F-1** — `requirements.md` §4/§7 (NFR-RC-001), R-RC-005; `design.md` §1/§4/§6.5/§8/Design Decisions (D-2, new D-7); `tasks.md` T-08 expanded, T-12 narrowed. New server-side scope: TIP/AICCRA gate on the bilateral PATCH, using a distinct error message (not the locked PRMS string).
- **F-2** — new requirement **R-RC-012** added; new task **T-13** added (required, not optional); `design.md` §1/§4/§8/Design Decisions (D-1, D-2); `tasks.md` dependency graph, PR strategy, Risks log, Done Definition all updated.
- **F-3** — `requirements.md` R-RC-001 (AC.4 added, "Out of scope" corrected), OQ-3 resolved; `design.md` §1/§6.2/Design Decisions (D-3, revised); `tasks.md` T-10 re-scoped from "fix if needed" to "verify, add to T-11," T-11 verification matrix expanded.
- **F-4** — `requirements.md` R-RC-005/R-RC-006 Details; `design.md` §2.1 Composition; `tasks.md` T-08/T-09 implementation notes — both new `CacheService` injections now called out explicitly.
- **F-5** — `requirements.md` R-RC-007; `design.md` §6.4; `tasks.md` T-06 — corrected line citations, simplified to a single shared-wrapper edit instead of three separate ones.
- **F-6** — independently re-verified by the orchestrator (`results-center-table.component.ts:303-312` read directly, confirmed as reported) — folded into R-RC-001, `design.md` §6.2/§2.1/Design Decisions (new D-8), `tasks.md` T-04/T-11.
- **F-7** — resolved via explicit scope decision in `requirements.md` R-RC-003 (accepted as an in-scope tightening, not a defect to avoid) and `tasks.md` T-07; the related pre-existing STAR-only gap noted by Judge B is recorded as explicitly out of scope in `requirements.md` §10.

**Not re-judged** (per user's "Fix only" choice) — the corrections above were applied directly by the orchestrator with independent verification against source code for every citation touched, but a second blind judge pass was not run to confirm the corrected documents. If higher confidence is wanted later, this can be resumed with a scoped round-2 re-judgment limited to the correction delta.

**Final status:** `approved` (fix-only path, no re-judgment requested).
