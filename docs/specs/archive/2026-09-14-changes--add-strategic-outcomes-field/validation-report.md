# Validation Report — Alliance Alignment / Strategic (Impact) Outcomes for Innovation Use

## Verdict: **PASS — archive-ready**

All three requirements (R-ALN-001/002/003) are implemented at every site the spec names, verified independently (fresh read of current code, different model than the Implementer/Leader). No FAIL findings. 4 WARN-level items — all low-risk, none blocking — with a remediation menu below.

| Area | Result |
| --- | --- |
| Task completion (T-01…T-05) | ✅ PASS |
| File existence vs. design.md's file tree | ✅ PASS (exactly the 5 sites named, no 6th found) |
| Build integrity (lint) | ✅ PASS (client clean; server clean on content, CRLF-only noise) |
| Build integrity (tests) | ✅ PASS — client 322/322 suites / 7214/7214 tests; server 364/366 suites / 3113/3116 tests (2 pre-existing failures, unrelated to this spec) |
| Requirement coverage | ⚠️ PASS with 2 WARN (clause-level test gaps, near-zero risk) |
| Design conformance | ⚠️ PASS with 1 WARN (stale claim in execution.md, traced and confirmed benign) |
| Agent Guide / Constitution Impact | N/A — no module created/reshaped |

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/add-strategic-outcomes-field` |
| Validated on branch | `AC-1753-Include-the-Strategics-Outcomes-in-alliance-allignment` |
| Validation date | 2026-09-14 |
| Validator (Leader) | Sonnet 5 — **same model as the spec's Implementer wrapper**; flagged per protocol, registry recommends `opus` for T3 |
| Independent conformance audit | `akili-reviewer` wrapper (Opus) — fresh context, no prior-review assumptions, delegated specifically for author ≠ auditor independence on this final audit |
| `test-report.md` | Not present — this spec folded testing into the `/akili-execute` Implementer/Reviewer loop rather than running `/akili-test` separately; coverage verified directly against Jest evidence in `execution.md` instead |

---

## 2. Summary

`add-strategic-outcomes-field` makes the Impact Outcomes field on Alliance Alignment (Portfolio 2) behave for Innovation Use (`indicator_id 6`) exactly as it already does for OICR/Policy Change — across 5 sites (2 client, 2 server, 1 SQL validator migration). All 5 tasks PASSed during execution (one rework round on T-04 only), the code was merged to `staging` → `dev` → deployed, and the user confirmed the migration is live and enforcing on Testing/Dev as of 2026-09-14.

This validation re-derives conformance from the current code and constitutional docs — it does not merely re-state `execution.md`'s claims. The independent auditor traced every acceptance-criterion clause to an actual test or code line, performed its own line-by-line diff of the migration against its base file, and chased one factual drift to its actual runtime consequence rather than filing it as a bare observation.

---

## 3. Task Completion

| Task | Status | Evidence |
| --- | --- | --- |
| T-01 — Client show/save | ✅ done | PASS attempt 1; execution.md §T-01 |
| T-02 — Server persist/return | ✅ done | PASS attempt 1; execution.md §T-02 |
| T-03 — Migration | ✅ done | PASS attempt 1 (2 parallel lens reviewers); execution.md §T-03 |
| T-04 — Manual DB verification | ✅ done | FAIL attempt 1 → PASS attempt 2 (full remediation documented); execution.md §T-04 |
| T-05 — Pre-flight measurement + go/no-go | ✅ done | GO recorded 2026-09-09; execution.md §T-05 |

All tasks carry execution notes and verification evidence in `execution.md`, in the order Step 3's evidence-before-checkbox rule requires (PASS recorded before the `tasks.md` checkbox flip, in every case).

---

## 4. File Existence

Design.md §2.1 names exactly 5 changed sites (no new files except the migration). Independently confirmed — 5 sites found, no 6th:

1. `alliance-alignment-p2.component.ts:31-34` (client visibility)
2. `alliance-alignment.component.ts:105-107` + `:356` (client save gate)
3. `portfolio-2-alignment.handler.ts:110-116` (server save)
4. `portfolio-2-alignment.handler.ts:257-263` (server find)
5. `1788972162238-includeInnovationUseImpactOutcomes.ts:118` (SQL validator)

Matches the "5 sites" figure asserted consistently across `proposal.md` §5, `requirements.md` §7, and `design.md` DD-1 — cross-document figure check **PASS**.

---

## 5. Build Integrity

| Check | Command | Result |
| --- | --- | --- |
| Client lint (4 files) | `npx eslint <paths>` | 0 errors, 2 known "File ignored" warnings on `*.spec.ts` (K-002 pre-existing gap) |
| Server lint — handler + spec | `npx eslint <paths>` | `handler.ts` clean; `handler.spec.ts` shows CRLF-only errors (whole-file, `core.autocrlf` artifact) — content-normalized re-check: clean, exit 0 |
| Server lint — migration | `npx eslint <path>` | Same CRLF-only pattern; content-normalized re-check: clean, exit 0 |
| Client full suite | `npm test -- --silent` | **322/322 suites, 7214/7214 tests, PASS** |
| Server full suite | `npm test -- --silent` | **364/366 suites, 3113/3116 tests** — 2 failing suites, both pre-existing and unrelated (see below) |

**The 2 server failures are not regressions from this spec:**
- `domain/entities/result-innovation-use/entity-metadata.spec.ts` — a different feature's (Innovation Use / DC-7) own test uses `globSync` with a `__dirname`-based pattern that mixes Windows backslashes and forward slashes; returns 0 matches on this checkout. TypeORM's real entity loader is unaffected (confirmed earlier this session by successfully booting the server and seeing entity-backed routes map).
- `domain/shared/auxiliar/template/template/capdev-bulk-summary.template.spec.ts` — byte-equality check between an on-disk HTML file (CRLF per `core.autocrlf`) and an embedded LF string literal.

Both are Windows-checkout artifacts in specs from unrelated work already merged onto this branch, confirmed pre-existing by direct inspection (not merely asserted).

---

## 6. Requirement Coverage

| Req | Verdict | Clause-level trace |
| --- | --- | --- |
| **R-ALN-001** (client) | PASS, 2 WARN | See below |
| **R-ALN-002** (server) | PASS | All 4 ACs + both scenarios traced to specific test lines; C-2 negative test correctly constructs the payload **without** the key (not `undefined`), matching tasks.md's disqualifier |
| **R-ALN-003** (migration) | PASS | `up()`/`down()` independently re-diffed line-by-line against the base migration (135-line body, exactly 1 differing line, correctly scoped to the `portfolio_id = 2` branch); behavioral proof (AC.1–AC.5) inherited from T-04's attempt-2 record — not re-executed in this audit (no DB access in the auditor's toolset), but T-04 already re-proved it independently at execution time |

**R-ALN-001 clause trace:**

| Scenario clause | Discharged by | Status |
| --- | --- | --- |
| THEN "Impact Outcomes" appears for 6 | `alliance-alignment-p2.component.spec.ts:58-63` | ✅ |
| AND WHEN saves → PATCH includes `impact_outcomes` | `alliance-alignment.component.spec.ts:315-374` | ✅ |
| BUT must NOT be **sent** for `{1, 2}` | ind.1 `:376-392`, ind.2 `:394-410` | ✅ |
| BUT must NOT **appear** for `{1, 2}` | ind.1 `alliance-alignment-p2.component.spec.ts:65-72` — **ind.2: no test** | ⚠️ WARN-1 |
| AND IT MUST leave SDG visibility unaffected | ind.1/5 covered on the visibility spec; ind.6 covered only on the **save** path (`result_sdgs` present in the PATCH) — **ind.6 render-path SDG visibility: no test** | ⚠️ WARN-2 |

**WARN-1 / WARN-2 risk:** near-zero. `[4,5,6].includes(2)` is structurally false regardless of any future edit that doesn't touch this exact array; the missing assertions are tripwires, not currently-failing behavior. tasks.md itself only mandated the indicator-2 case on the **save** gate, not the **visibility** gate — so this is a spec-authoring gap that shipped forward, not an implementer miss.

**requirements.md's own acceptance-criteria checkboxes (`[ ]`) were never ticked**, even though the equivalent checks in `tasks.md` and the evidence in `execution.md` confirm them satisfied. Doc-hygiene gap, not a functional one — flagged in Remediation.

---

## 7. Linting & Code Quality (incl. 4R advisory)

Lint: see §5 (clean).

**4R lens findings carried forward from `execution.md`'s own ADVISORY blocks** (recorded there during execution, still relevant, non-gating):
- READABILITY (T-01) — `isInnovationUseIndicator` uses `Number(...) === 6` while its two siblings use bare `===`; deliberate (S-5) but uncommented.
- RISK (T-02) — `ResultImpactOutcomesService.create`'s replace-all semantics mean a PATCH omitting `impact_outcomes` now silently clears previously-saved outcomes instead of throwing. Spec-mandated, tests confirm it; worth naming in the PR description.
- RESILIENCE (T-02) — sibling unguarded `payload.strategic_objectives.map(...)` has the identical shape; pre-existing, correctly out of scope, candidate for a separate ticket.

**New finding from this validation's independent audit (F-2, advisory):** `judgment.md` S-5's stated rationale — "use `Number(...)` at both client sites… so a string-typed `indicator_id` cannot desync visibility from the save gate" — was applied only to the **new** `isInnovationUseIndicator` signal. `isOicrIndicator`/`isPolicyChangeIndicator` (`alliance-alignment.component.ts:105-106`) still use strict `===`, so the named hazard class remains technically open for indicators 4/5 (not 6). The auditor could not construct a reachable path where `indicator_id` arrives as a string — recorded as advisory because the task record implies full closure when only partial closure actually shipped.

---

## 8. Design Conformance

All 4 Design Decisions (DD-1…DD-4) hold, independently re-verified:
- DD-1 (hardcoded allow-list, no shared config) — confirmed, 5 independent sites, no shared constant introduced.
- DD-2 (new migration, never edit merged one) — confirmed; `1783021729548` untouched.
- DD-3 (verbatim `up()` body copy) — confirmed via the auditor's own 135-line pairwise diff; exactly 1 differing line, correctly scoped.
- DD-4 (no Jest gate for SQL logic, manual substitute) — confirmed; T-04 is that substitute and PASSed on attempt 2.

`design.md` §11's rollout-order correction and go/no-go record match `execution.md` T-05's entry verbatim — no drift.

**F-1 (WARN, traced to a benign outcome):** `execution.md`'s T-03 entry claims the migration was "correctly the newest" of all migration files at review time. Since then, 3 unrelated Innovation-Use-feature migrations with later timestamps merged onto this branch via `dev`. The auditor chased this rather than filing it as a bare drift note: TypeORM's timestamp-order validity check is disabled in the vendored library (`MigrationExecutor.js:150-151`), the later migrations don't redefine `alignment_validation` (re-confirmed by grep), and `migration:revert`'s target selection uses insertion order (`id` DESC) not timestamp order — so the documented backout path in `design.md` §11 still resolves correctly. **No code or rollout change needed; only the stale sentence in `execution.md` should be corrected.**

**Cross-document figure check:** all task/site counts (5 sites, T-01…T-05, 28-result population / 27-flip count in T-05) are internally consistent across `requirements.md`, `design.md`, `tasks.md`, and `execution.md` — no contradiction found.

**Constitutional drift noted in passing (out of this spec's scope, not a finding against it):** while re-reading Phase 0 baseline docs, root `AGENTS.md` was found stale relative to root `CLAUDE.md` (missing the K-015 pipeline-migration correction, the `agy models` re-probe update, and the `db/baseline/` repo-layout addition) — both are supposed to mirror each other per the repo's own convention. Not caused by this spec and not remediated here; worth a separate doc-sync pass.

---

## 9. Test Evidence Summary

| Requirement | Automated evidence | Manual evidence |
| --- | --- | --- |
| R-ALN-001 | `alliance-alignment-p2.component.spec.ts`, `alliance-alignment.component.spec.ts` — new + existing cases, both re-confirmed passing in the fresh full-suite run | — |
| R-ALN-002 | `portfolio-2-alignment.handler.spec.ts` — new + existing cases, re-confirmed passing | — |
| R-ALN-003 | No Jest gate possible (documented, DD-4) | T-04's 8-case fixture matrix against a disposable MySQL copy of production data, attempt 2 PASS, independently reviewed at execution time; T-05's Dev pre-flight count (27/28 flip) with explicit GO |

No `PRODUCT_BUG` or unresolved `FAIL`/`GAP` entries anywhere in the evidence trail.

---

## 10. Agent Guide / Constitution Impact

`execution.md` contains no `## Constitution Impact` block — correctly, since this spec created no module, moved no boundary, and changed no public surface (design.md §2's own "LITE" sizing call). Nothing to sync at `/akili-archive` on this front. **N/A.**

---

## 11. Remediation

None of the following block archiving. Offered as an optional cleanup pass:

| # | Finding | Severity | Suggested fix |
| --- | --- | --- | --- |
| 1 | WARN-1 — no test for `shouldShowImpactOutcomes()` returning `false` for indicator 2 | Low | One assertion in `alliance-alignment-p2.component.spec.ts`, mirroring the existing indicator-1 case |
| 2 | WARN-2 — no test that "Contribution to SDG" stays visible for indicator 6 on the render path | Low | One assertion alongside WARN-1's fix |
| 3 | F-1 — `execution.md` T-03 entry's "correctly the newest migration" claim is now stale | Low (doc-only) | One-sentence correction noting later unrelated migrations merged in, with the traced-benign conclusion |
| 4 | F-2 — S-5's coercion-consistency rationale is only fully closed for indicator 6, not 4/5 | Advisory | No reachable defect found; optional follow-up to harmonize `isOicrIndicator`/`isPolicyChangeIndicator` to `Number(...)` in a future change where AC.4's "byte-for-byte unchanged" constraint no longer binds |
| 5 | `requirements.md`'s own AC checkboxes were never ticked | Low (doc hygiene) | Flip `[ ]` → `[x]` for R-ALN-001/002/003's ACs, referencing this report |

---

## 12. Archive Readiness Recommendation

**Ready to archive.** All required tasks are `[x]`, no FAIL findings, both WARN-level test gaps are near-zero risk and independently traced (not guessed), all constitutional cross-checks pass, and the one documentation drift found was chased to a confirmed-benign runtime outcome rather than left as an open question.

```text
/akili-archive changes/add-strategic-outcomes-field
```
