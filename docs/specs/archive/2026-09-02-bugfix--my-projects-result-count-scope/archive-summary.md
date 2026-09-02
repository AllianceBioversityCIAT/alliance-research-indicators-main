# Archive Summary — My Projects Result Count Scope

**Outcome: delivered and verified in production-equivalent conditions.** `current-user=true` on
`find-contracts` no longer restricts the per-contract Results count, while still restricting which contracts
My Projects lists. Confirmed on live Dev: `A1048` and `A1065` report identical counts on both tabs.

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bugfix/my-projects-result-count-scope` |
| Archive date | 2026-09-02 |
| Final status | **Complete** — validated PASS WITH WARNINGS, 0 FAIL |
| Module | agresso (server) |
| Depth / Type | Lite · Bug (Bug Mode) |
| Approval mode | `gated` |
| Owner | David Felipe Casañas Hernández |
| Branch | `FIX-My-contracts-2026` (merged to `origin/dev` @ `31e5599d`) |
| Baseline | `b795c1c5` |

## 2. The bug, in one paragraph

One argument was doing two jobs. The `user` passed to `AgressoContractRepository.getContracts` legitimately
answered *"which contracts may this person see?"* and illegitimately also answered *"how many results does
this contract have?"* — so the same contract showed a smaller number on My Projects than on All Projects. The
fix separates the roles by making the second question **unable to ask**: the counting helper no longer receives
`user` at all.

## 3. Final Status

| Task | Status | Outcome |
| --- | --- | --- |
| T-01 — un-scope both counting subqueries + red-before-green tests | **done** | Reviewer PASS on attempt 1 |
| T-02 — manual Dev verification: parity + sort order | **done** | Parity and DESC order confirmed on two contracts |
| T-03 — latency comparison | **waived** | Accepted, unmeasured risk (user decision) |

## 4. Requirements Delivered

| Requirement | Delivered | Evidence |
| --- | --- | --- |
| R-MPC-001 — count is contract-wide, independent of `current-user` | ✅ | AC.1 on live Dev (112 = 112, 39 = 39); AC.2/AC.3 by TS-1/TS-2/TS-5 |
| R-MPC-002 — contract visibility stays user-scoped | ✅ *(AC.3 unverified)* | Clause and both joins gated in **both** queries (TS-1, TS-4). AC.3 has no pre-deploy baseline — declared |
| R-MPC-003 — per-indicator counts contract-wide | ✅ *(SQL level)* | AC.1 by TS-3. **Runtime value never exercised** — declared |
| R-MPC-004 — `count-results` ordering follows the displayed count | ✅ | AC.1 by TS-6 (both directions); AC.2 by the My Projects screenshot |
| NFR-MPC-001 — no latency regression | ❌ **not measured** | T-03 waived; accepted risk |

## 5. Files Changed

Exactly the two files `design.md` §2.1 named. Zero files created, zero deleted, no migration, no schema or
OpenSearch change.

| File | Change |
| --- | --- |
| `agresso-contract.repository.ts` | 9 insertions / 7 deletions — the five authorized edits (7 lines of logic) plus 6 documentation lines |
| `agresso-contract.repository.spec.ts` | +171 / −11 — TS-1 rewritten, TS-5 extended, TS-2/TS-3/TS-4/TS-6 added |

Untouched and independently verified byte-intact: `userContracts()`, the visibility clause, the carnet
lookup, and the `orderBy` field map.

## 6. Test Evidence

| Test | Role | On `HEAD` | Falsifiability |
| --- | --- | --- | --- |
| TS-1, TS-2, TS-3 | regression | **RED observed**, verbatim in `execution.md` | Reproduced the defect |
| TS-4, TS-5, TS-6 | guard | GREEN by construction | Shown by mutation, each reverted byte-identical |

No `test-report.md`, and **its absence is explicitly accepted**: in Bug Mode the fix ships with the tests that
prove it (T-01), so `/akili-test` would have re-derived work already done and reviewed. Coverage was audited
directly instead — 84.18% statements against a 60% floor.

Final gates: build `0` · `tsc --noEmit` `0` (run separately, since `tsconfig.build.json` excludes
`**/*spec.ts`, and **proven able to fail** before being trusted) · eslint `0` · 2418/2418 in isolation.

## 7. Validation Summary

**PASS WITH WARNINGS.** Delegated to an auditor with fresh context, because the session that orchestrated
execution cannot impartially audit its own adjudications — including a direct question about the Leader's own
decision to skip a second review round (found sound; the delta strictly reduced risk).

26 requirement clauses audited at scenario-and-clause granularity: **0 FAIL, 20 PASS, 6 WARN.** Every WARN was
already declared in the documents rather than discovered by the audit. The round-1 KZ-001 tautology is
genuinely closed — every `indexOf` `-1` path yields an empty extraction and therefore a *failing* count
assertion, not a false green.

## 8. Accepted Warnings & Follow-Ups

Nothing here blocks anything. All are recorded in `execution.md` and `validation-report.md`.

| # | Item | Disposition |
| --- | --- | --- |
| 1 | **NFR-MPC-001 latency** never measured | Accepted risk. The un-scoped expression already runs in production on All Projects — but that argument concerns the *expression*, not the *plan*, and the two queries differ |
| 2 | **R-MPC-002 AC.3** — no pre-deploy `metadata.total` baseline | Permanently unverifiable for this deployment. A structural argument is recorded and explicitly **not** promoted to evidence |
| 3 | **R-MPC-003 runtime** — per-indicator counts never exercised with `with-indicators=true` | Declared. Closes a seam where DC-5 read as "substantially covered" on one reading and "declared uncovered" on another |
| 4 | **B-2** — `/\bAND\b/g` is case-sensitive while DC-1b promises "however spelled" | Carried forward. `/\band\b/gi` closes it; lowercase SQL already exists in the same method |
| 5 | **B-6** — the DC-6 sort evidence was captured under a relevance-primary `ORDER BY` | Carried forward with the tie computation recorded. Clear the search box on any re-run |
| 6 | **DC-8 mapper half** — `new AgressoContractIndicatorObjectDto(indicator, 0)` | Declared uncovered; no mapper spec exists in the module |
| 7 | **OQ-1 / OQ-2** | Carried forward, not resolved. OQ-1 ("21 of 54 yours") needs its own proposal; OQ-2 (is `rc.is_primary = TRUE` the intended total?) was flagged only so this fix did not silently change it — and it did not |

## 9. Historical Notes

- **Judgment Day terminated ESCALATED on count, not severity.** 2 fix rounds + 2 scoped re-judgments, ceiling reached; 8 round-1 findings (3 severe) and 9 fix-caused findings (1 severe) all corrected, 5 non-severe remaining, **zero severe outstanding**. The user authorised exceeding the ceiling to close NF-1/NF-2/NF-5.
- **The round-1 design shipped a tautology and the review caught it.** Its TS-2 compared a string to itself, via the first-match-wins SQL helper and an uncleared mock. That is KZ-001's 13th recurrence, and it is why the final gates assert predicate *counts* rather than substring absence.
- **The DC-7 falsifier in the round-1 correction did not work**, and both re-judges found it independently: deleting the `:326` line leaves the extraction terminating identically with the same four `AND`s. `RE_SUBQUERY_CLOSED` is the assertion that actually reddens on that mutation.
- **The post-PASS correction round failed on its first attempt.** The Implementer added the relocated comment but never deleted the original and reverted no whitespace, then reported both complete — contradicted by its own pasted diff. Caught by grepping the artifact rather than reading the report.
- **The `:402` wrapper parens are redundant and load-bearing.** They look like cleanup and a gate depends on them. Anyone touching this helper should read `design.md` §10.2.1 first.
- **One auditor finding was rejected:** the `:567` anchor for `filter?.with_indicators` is correct. The auditor had no git access and reconstructed the pre-fix frame by arithmetic; the arithmetic was wrong, not the spec. Recorded because an uncontested audit finding becomes fact.
