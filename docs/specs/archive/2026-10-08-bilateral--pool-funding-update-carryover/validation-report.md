# Validation Report — Bilateral / Pool Funding carry-over on "Update result"

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | docs/specs/bilateral/pool-funding-update-carryover |
| Validated at | `f55827849` (2026-10-08) |
| Auditor | independent `akili-reviewer` on Sonnet (implementer: Claude Opus — author ≠ auditor) |
| Build gates | run by the Leader at the same commit |

## 2. Summary

**Verdict: WARN — READY TO ARCHIVE WITH WARNINGS.** No FAIL. All three tasks are closed with evidence. Every scenario clause maps to a task. Warnings were mechanical doc drifts, now fixed, plus three accepted evidence gaps and one advisory code hardening left as follow-up.

## 3. Task Completion

| Task | Result | Evidence |
| --- | --- | --- |
| T-01 service + repository | PASS | 1 attempt, Reviewer PASS, falsifiers f1–f3 red |
| T-02 real-MySQL fixture | PASS | 2 attempts (FAIL → PASS), falsifiers f4–f13 red |
| T-03 owner check | PASS (WARN on scope) | owner: "lo veo funcional haz commit"; does not name a non-eligible result (S-7) |

## 4. File Existence

PASS — all five files in design §3 exist; no migration, no controller change (NFR-PUC-002/003).

## 5. Build Integrity (`server/researchindicators`, as run at `f55827849`)

| Command | Result |
| --- | --- |
| `npm run build` | PASS |
| `npx tsc --noEmit -p tsconfig.json` | PASS — 0 errors |
| `npx eslint src/domain/entities/green-checks test/fixtures/pool-funding-update-carryover.fixture-spec.ts` | PASS — clean |
| `npm test -- --silent` | PASS — 424 suites / 4093 tests |
| `npm run test:fixtures -- pool-funding-update-carryover` | PASS — 6/6 (scratch DB hand-patched for `pi_delegates`, execution.md T-02) |

## 6. Requirement Coverage

| Clause | Evidence | Result |
| --- | --- | --- |
| S-1 Draft + year | T-01 (a)/(e), argument level | PASS (accepted gap) |
| S-1 exact copy / snapshot unchanged / no inactive rows | fixture S-1 (f6, f7, f11, f13) | PASS |
| S-2 deactivate + ≤1 active alignment | fixture S-2 (f4, f10, f12) | PASS |
| S-2 same-key mapping, re-approvable | fixture S-2b (f8) | PASS |
| S-2 snapshot untouched, hard-delete only in mapping table | fixture S-2b (f9) | PASS |
| S-2 no `results` delete/re-create | T-01 (e), mock only | WARN (accepted gap) |
| S-3 | T-01 (b) | PASS |
| S-4 | fixture S-4 | PASS |
| S-5 | fixture S-5 (f5) | PASS |
| S-6 rollback, no history | T-01 (c) (f1), mock only for rollback | WARN (accepted gap) |
| S-7 visibility unchanged | T-03 only, non-eligible case not named | WARN (accepted gap) |
| S-8 | fixture S-8 (f8) | PASS |
| NFR-PUC-001 audit | fixture audit helpers (f10, f12, f13) | PASS |
| NFR-PUC-002/003 | no migration / controller unchanged | PASS |

## 7. Code Quality — 4R (advisory)

- **Reliability/resilience:** the in-transaction live update does not re-filter `result_status_id = APPROVED`; two concurrent PATCHes give a duplicate history row (no data loss — the second carry-over replaces the first). Pre-existing gap; one-line hardening left as follow-up.
- **Resilience:** `saveHistory` failing after commit leaves Draft without history (D-6 residual, accepted).
- **Risk:** soft-deleted live mapping narratives are hard-deleted (D-9, accepted).
- **Readability:** repository spec indexes the DELETE by position; fixture `pick` stringifies values; fixture band comment `906_000` follows the sibling convention (`905_000` file uses the same scheme).
- **Environment:** fixture proven only on a hand-patched scratch DB; re-run once `baseline.sql` is refreshed.

## 8. Design Conformance

PASS — D-1…D-9 implemented as written. Cross-document drifts found and **fixed in this validation**:

| Drift | Fix |
| --- | --- |
| Premise count said 12 verified while P-5 was refuted | design §11 → "11 verified · 1 refuted-and-amended (P-5, Low) · 0 UNVERIFIED" |
| T-01 f3 text differed from the mutation run | tasks T-01 f3 now "drop the `newAlignmentId != null` guard" |
| T-02 listed f4–f9; f10–f13 run but undefined | tasks T-02 defines f10–f13; Red run → f4–f13 |
| Accepted gaps not stated | tasks T-01 Disqualifier (S-6, S-2 `results`), §4 S-7 row |

Correction closure: forward grep `f4–f9`/`12 verified` over the spec folder → only the historical Done line in T-02 remains, which already notes f10–f13. Budget overrun (~500 → +793/−40 LOC; 3 verdicts vs ~4 rounds) is recorded in execution.md.

## 9. Test Evidence Summary

Unit: 13 new/updated cases (service 5, repository 4, + existing). Fixture: 6 real-MySQL cases with the real `SP_versioning` / `SP_delete_result_version`. 16 falsifiers observed red across T-01/T-02.

## 10. Constitution Impact

WARN → fixed: `docs/trd/trd.md` §API representative endpoints now documents the carry-over on `PATCH /api/results/green-checks/new-reporting-cycle/:resultCode/year/:year` (service-side SQL, bypasses `pool_funding_year_locked`, visibility unchanged). No UX/PRD change (client unchanged). No child guide needed.

## 11. Remediation

| # | Severity | Item | Status |
| --- | --- | --- | --- |
| 1 | Medium | S-7 owner check did not name a non-eligible result | Accepted gap (recorded in tasks §4) |
| 2 | Low | S-6 rollback proven by mock only | Accepted gap (T-01 Disqualifier) |
| 3 | Low | Premise count line | Fixed |
| 4 | Low | Falsifier definitions f3, f10–f13 | Fixed |
| 5 | Low | TRD note | Fixed |
| 6 | Low (advisory) | Add `result_status_id: APPROVED` to the in-transaction update | Follow-up — not in approved scope |
| 7 | Trivial | Fixture band comment | No change — matches sibling convention |

## 12. Archive Readiness

**READY WITH WARNINGS.** Next: `/akili-archive bilateral/pool-funding-update-carryover`.
