# Validation Report — My Projects Result Count Scope

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/my-projects-result-count-scope` |
| Spec id | 2026-09-my-projects-result-count-scope |
| Verdict | **PASS WITH WARNINGS** |
| Archive readiness | **READY** — no FAIL findings; all WARNs declared or folded into `execution.md` |
| Date | 2026-09-02 |
| Module | agresso (server) |
| Commits validated | `8755b7ba` (fix + tests) · `32c8e71c` · `6a74a6a0` · `9e784bf3` · baseline `b795c1c5` |
| Deployed | `origin/dev` @ `31e5599d` (merge of `FIX-My-contracts-2026`) |
| Auditor | `akili-reviewer`, fresh context, read-only (Read/Grep/Glob) |
| Author ≠ auditor | ✅ Implementer `sonnet` · Reviewer `opus` · Validator `opus` (fresh context) |

**Independence note, stated up front.** The session that orchestrated execution also drove this validation, and
it cannot impartially audit its own adjudications. The judgment-heavy phases (4–6) were therefore delegated to
an auditor with **no** prior context and no knowledge of the Leader's conclusions, explicitly including a
question about the Leader's own decision to skip a second review round. The mechanical phases (1–3) were run
directly. Two findings below correct the Leader; one corrects the auditor.

---

## 2. Summary

The fix is correct, minimally scoped, and genuinely gated. `current-user=true` no longer restricts the
per-contract Results count while still restricting which contracts appear.

| Phase | Result |
| --- | --- |
| 1. Task completion | **PASS** — T-01 `done`, T-02 `done`, T-03 `waived` (user decision) |
| 2. File existence | **PASS** — exactly the 2 files design §2.1 names; 0 added, 0 deleted |
| 3. Build integrity | **PASS** — build `0`, `tsc --noEmit` `0` (gate proven falsifiable), eslint `0`, 2418/2418, coverage 84.18% |
| 4. Requirement coverage | **PASS WITH WARNINGS** — 26 clauses audited; 0 FAIL, 6 WARN, all declared |
| 5. Quality audit | **PASS** — 6 advisory findings |
| 6. Design conformance | **PASS** — DD-1…DD-5 implemented as written, no substantive drift |

**Headline:** the round-1 KZ-001 tautology is genuinely closed. The auditor traced every assertion in
TS-1…TS-6 for a can-never-fail path — including the `indexOf` `-1` branches, the usual false-green vector —
and found none. Every `-1` path produces an *empty* extraction and therefore a **failing** count assertion.

---

## 3. Task Completion

| Task | Status | Evidence | Result |
| --- | --- | --- | --- |
| T-01 | `done` | Red-before-green verbatim in `execution.md`; Reviewer PASS attempt 1; 2418/2418 | **PASS** |
| T-02 | `done` | Two committed PNGs under `evidence/`, read back from the committed files | **PASS** |
| T-03 | `waived` | Not measured; user-accepted risk with the counter-argument recorded | **WARN** (accepted) |

---

## 4. File Existence

`git diff --stat b795c1c5..HEAD` over `server/` and `client/`: **2 files**, matching design §2.1 exactly.
`--diff-filter=A` and `--diff-filter=D` both empty — no file created or deleted. No `## Constitution Impact`
notes, consistent with a single-function fix that moved no module boundary.

---

## 5. Build Integrity

| Gate | Command | Result |
| --- | --- | --- |
| Server build | `npm run build` | exit `0` |
| Type-check **including specs** | `npx tsc -p tsconfig.json --noEmit` | exit `0` |
| Lint | `npx eslint <both files>` | exit `0` |
| Unit suite | `npm test -- --silent` | 338 suites / 2418 tests, isolated |
| Coverage | `npm run test:cov` | 84.18% stmts vs 60% floor, exit `0` |

**K-004 applied to the gates themselves.** `tsconfig.build.json` excludes `**/*spec.ts`, so `npm run build`
cannot type-check the test file this spec changed — exactly the trap root `CLAUDE.md` §4.3 documents. A
separate `tsc -p tsconfig.json --noEmit` was run, `--listFiles` confirmed the spec file is in that program,
and the gate was **proven able to fail**: injecting `const __probe: number = "not a number"` into the spec
file moved it from exit `0` to exit `1`, then the revert was confirmed byte-identical.

`npm run lint` was never used as a gate (K-001 — it carries `--fix` and mutates what it inspects).

---

## 6. Requirement Coverage

26 clauses audited at scenario-and-clause granularity — every scenario line, every `BUT it must NOT`, every
`AND IT MUST` taken separately. `tasks.md` §4 was treated as a claim to verify, not as evidence.

**0 FAIL. 20 PASS. 6 WARN, every one of them declared rather than discovered here.**

| Requirement | Result | Note |
| --- | --- | --- |
| R-MPC-001 (count is contract-wide) | **PASS** | AC.1 confirmed on live Dev for two contracts; AC.2/AC.3 gated by TS-1/TS-2/TS-5 |
| R-MPC-002 (visibility stays scoped) | **PASS** / AC.3 **WARN** | Clause and joins gated in *both* queries (TS-1, TS-4). AC.3 has no pre-deploy baseline — declared |
| R-MPC-003 (per-indicator contract-wide) | **PASS** / runtime **WARN** | AC.1 gated by TS-3 at SQL level. Runtime value never exercised — see §11 G-2 |
| R-MPC-004 (ordering) | **PASS** | AC.1 by TS-6 both directions; AC.2 by the My Projects screenshot |
| NFR-MPC-001 (latency) | **WARN** | T-03 waived, unmeasured, user-accepted |

The auditor's verdict on the traceability table: *"`tasks.md` §4's claims held on every row I checked, which
is not the usual outcome for a traceability table."*

Independently re-derived and confirmed correct: the `exactly 4` / `exactly 3` predicate counts (hand-counted
against the emitted regions), and the load-bearing corrected fact that `result_counts` is emitted on **every**
`getContracts` call — `with_indicators` appears once, inside the mapper branch, and never gates the SQL. That
fact is what promoted NFR-MPC-001 from measure-if-reported to its own task, and it checks out.

---

## 7. Linting & Code Quality

Lint and type-check clean. Six **advisory** findings (advisory never gates, and never becomes a task in this
spec):

| Lens | Finding |
| --- | --- |
| Reliability | `/\bAND\b/g` is case-sensitive while DC-1b promises "however spelled". `/\band\b/gi` closes it at zero cost. Folded into `execution.md` as B-2 |
| Reliability | TS-1 packs four independently-meaningful assertions into one `it`, so `spec.ts:677` could not be observed red — jest aborts at the first failure. Splitting the two count assertions would have closed it at authoring time |
| Readability | TS-5's title diverges from design §10.2's wording; the other five match verbatim, so this one break costs the grep-by-design-name trail |
| Risk | `orm.config.ts` sets `namedPlaceholders: true`, so any future `?` or `:word` in **any** `this.query()` template literal in this file throws for every request, and no gate in the repo can see it. The child guide frames this as migration-only — worth widening to raw `this.query()` strings |
| Resilience | A stale advisory count in an archive record reads as an open item forever. Corrected |
| Risk | The DC-6 evidence rests on a relevance tie. Clearing the search box on any re-run removes the reconstruction from the argument |

---

## 8. Design Conformance

**PASS, no substantive drift.** All five authorized production edits present; every "do not touch" region
verifiably intact, including `userContracts()`'s original trailing whitespace as positive proof it was not
reformatted. DD-1…DD-5 implemented as written, and DD-1's own caveat holds exactly as predicted: `user`
remains live and legitimately used elsewhere in `getContracts`, so the `result_counts` half stays
*detectable* (TS-3's predicate count) rather than impossible.

**Cross-document figure check.** One real error found and corrected: `execution.md` reported *10 insertions*
where `git diff --numstat` reports **9**. The auditor derived 9 from the file without git access and flagged
the discrepancy; git settled it. One anchor (`:529`, a pre-fix line number cited in a post-fix sentence) and
one stale advisory count also corrected. All corrections carry a closure sweep.

**Disclosed drift (advisory):** six documentation lines live in the production file that design §2.1's
composition table does not authorize. Leader-instructed, disclosed as the budget overage at the gate, then
relocated out of the SQL literal at the user's direction — discovered by the process, not by this audit.

**One auditor finding rejected.** The `:567` anchor for `filter?.with_indicators` was reported off by one. It
is correct — `git show b795c1c5:…` line 567 is exactly that expression. The auditor reconstructed the pre-fix
frame by arithmetic without git; the arithmetic was wrong, not the spec. Recorded because an uncontested audit
finding becomes fact, and this one is false.

---

## 9. Test Evidence Summary

No `test-report.md` exists — correct for Bug Mode, where the fix ships with the tests that prove it (T-01),
so `/akili-test` would be redundant. Coverage was audited directly.

| Test | Role | HEAD | Falsifiability |
| --- | --- | --- | --- |
| TS-1 | regression | **RED** observed | Red on the `r_ord.created_by` assertion, verbatim in `execution.md` |
| TS-2 | regression | **RED** observed | 5 `AND`s vs expected 4 |
| TS-3 | regression | **RED** observed | 4 `AND`s vs expected 3 |
| TS-4 | guard | GREEN | Shown by mutation (`userContracts()` → `''`), reverted |
| TS-5 | guard | GREEN | Shown by mutation (`:326` paren deleted), reverted |
| TS-6 | guard | GREEN | Shown by mutation (field map changed), reverted |

The guard/regression split is honest: no HEAD red was claimed for a guard, and mutation results are labelled
as the weaker claim they are rather than laundered into reproduction evidence.

**Two named falsifiers were never observed** (both declared, neither a discrimination gap): DC-2's
(structurally unreachable by a HEAD red, since the visibility clause exists before *and* after the fix) and
TS-1's second assertion (jest aborts at the first failure). The auditor independently confirmed both
mechanisms are sound and that neither assertion can be vacuous — `countSql()` returning `''` produces a
*failure*, not a pass.

**What this suite structurally cannot reach (KZ-017):** it mocks `query()`. It proves the SQL was *written*
correctly and nothing about what MySQL returns. That gap is why T-02 was mandatory, and T-02 closed it for the
contract-level count on two real contracts — but **not** for the per-indicator count (§11 G-2).

---

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` notes; none owed. No module created or reshaped, no boundary moved, no public
surface renamed — field names are unchanged and only the value widens.

Pending for `/akili-archive`: **CodeGraph re-index** (the index predates these commits), and the advisory
suggestion to widen `server/researchindicators/src/CLAUDE.md` §7's placeholder warning from migrations to raw
`this.query()` strings.

---

## 11. Remediation

All items below are **folded into `execution.md` already** — none blocks archiving.

| # | Finding | Severity | Disposition |
| --- | --- | --- | --- |
| G-2 | `proposal.md` Success Criterion 3 (per-indicator counts with `with-indicators=true`) was never exercised at runtime; T-02 ran with `with-indicators=false`. It sat in a seam between DC-5 "declared uncovered" and DC-5 "substantially covered" | **WARN** | **Declared.** DC-5's disposition corrected: contract-level count confirmed against live MySQL, per-indicator count confirmed at SQL-text level only |
| B-2 | `/\bAND\b/g` case-sensitive vs DC-1b's "however spelled" | **WARN** | **Carried forward** as a known gate limitation. Optional one-character fix: `/\band\b/gi` |
| B-6 | DC-6 evidence captured under a relevance-primary `ORDER BY`; holds only by a relevance tie the record never established | **WARN** | **Carried forward** with the tie computation recorded |
| E-8 | T-02 used the search box instead of the prescribed `contract-code` filter | advisory | Recorded; root cause of B-6 |
| E-3 | `execution.md` reported 10 insertions; git reports 9 | advisory | **Corrected**, with closure sweep |
| C | Stale pre-fix anchor `:529` and stale "four advisories" count | advisory | **Corrected**, with closure sweep |
| — | R-MPC-002 AC.3, NFR-MPC-001, DC-8 mapper half | **WARN** | Declared, not claimed. Verified by the auditor as genuinely declared in every document rather than asserted covered elsewhere |

**Optional before archive** (neither required): apply `/\band\b/gi` to close B-2, and re-run T-02 step 5 with
the search box cleared to close B-6 without a reconstruction.

---

## 12. Archive Readiness Recommendation

**READY.**

No FAIL findings. Six WARNs, every one declared in the documents rather than surfaced by this audit — which
is the outcome the declaration discipline is supposed to produce. The three unverified items
(R-MPC-002 AC.3, NFR-MPC-001, per-indicator runtime) are each recorded as *not satisfied and not measured*,
in the documents a future reader will actually open.

```
/akili-archive docs/specs/bugfix/my-projects-result-count-scope
```

Archive will additionally want: the CodeGraph re-index, and a Kaizen entry — this run produced two genuine
recurrences worth logging (a correction record that was itself wrong, KZ-007/K-011; and a worker asserting
completion contradicted by its own pasted diff).
