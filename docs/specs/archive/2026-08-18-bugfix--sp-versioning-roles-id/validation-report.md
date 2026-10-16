# Validation Report — Bugfix / `SP_versioning` references the dropped column `roles_id`

- **Spec:** [`docs/specs/bugfix/sp-versioning-roles-id`](.)
- **Module:** results (lifecycle routines)
- **Date:** 2026-08-18
- **Branch:** `AC-1679-Create-the-innovation-use-section` · last commit `7ca5ea6d`

---

## Verdict — **NOT READY for archive**

| | Count |
| --- | --- |
| **FAIL** | **2** |
| WARN | 11 |
| BLOCKED | 0 |

**Both FAILs are documentation, not code.** No load-bearing technical claim in this spec could be falsified: both migrations are correct at the statement level, the repaired column lists are 9/9, `down()` restores the defective bodies byte-for-byte, the two new `DELETE`s sit immediately before the final `DELETE FROM results` and are textually identical to `full_delete_result_version`'s, and the snapshot harness delivers a genuine red on the real procedure.

What failed is **the last mile of bookkeeping on a spec that pivoted three times** — and the failure is instructive: the pivots' forward sweeps were run against the *strings* they changed and missed the *ideas* they changed. **"One migration" was never a string anyone searched for.**

Remediate F-1 (four sentences) and F-2 (one number). Neither touches code, migrations, or the harness.

---

## Document Control

| Field | Value |
| --- | --- |
| Validation tier | T3 Auditor — registry maps T3 → `opus`; session model Opus 5, at tier |
| `author ≠ auditor` | **Satisfied, and deliberately strengthened.** Implementation ran on Sonnet (`akili-implementer`). The conformance audit was **delegated to a fresh independent read-only auditor**, not performed by the Leader, because the Leader orchestrated *and adjudicated* this spec and is therefore not a blind auditor. The auditor was instructed to treat the Leader's adjudications as claims to be tested |
| Documents audited | `requirements.md`, `design.md`, `tasks.md`, `execution.md` (in full), `devops-note.md` |
| Code evidence audited at source | both migrations, the fixture, `orm.test.config.ts`, `src/db/baseline/`, `load-baseline.js`, `jest-fixtures.json`, `docker-compose.test.yml`, `package.json` |
| `proposal.md` | **Absent — not owed.** `design.md:20` records the spec as *extracted* from `innovation-use/data-model-and-catalog` on a user ruling, not proposed. Provenance chain complete without one |
| `test-report.md` | **Absent — no `/akili-test` phase ran.** Assessed as adequate for Lite/Bug Mode; see §Test Evidence |

---

## Task Completion — PASS (5/5)

| Task | Status | Result | Evidence |
| --- | --- | --- | --- |
| T-01 | `[x]` | PASS | `execution.md:23-88`; falsifying sentinel, fixture both directions, TEST-routed revert. Criterion #2 retired as never-achievable with a Pivot Record |
| T-01b | `[x]` | PASS | `:152-247`, `:284-358`. Every artifact count re-derived from `baseline.sql` matches |
| T-02 | `[x]` | PASS | `:362-416`. RED/GREEN/RE-RED verbatim; AC.4 diff and AC.5 `cmp` Leader-extracted mechanically, not accepted on report |
| T-02b | `[x]` | PASS | `:504-563`, plus four independent Reviewer verifications the brief never asked for |
| T-03 | `[~]` | **PASS — `[~]` is correct** | Attempt 1 FAIL, attempt 2 PASS, plus a disclosed second independent PASS |

**On T-03's `[~]`:** the auditor independently confirmed this is right and could find no way to argue `[x]`. `tasks.md:202`'s criterion is "DevOps **informed**" — an outward action, not an artifact.

**Verification-evidence quality was recorded as above the norm**, and it is the reason the figures below were auditable at all: load-bearing claims were re-derived by the Leader rather than adjudicated on reports at `:72-78`, `:170-172`, `:244`, `:385`, `:443-449`, `:525`.

---

## File Existence — PASS

All eleven artifacts called for by `design.md` §3, §3.1, §4 and §4.1 exist, and nothing was created that the design does not call for. `scripts/load-baseline.js` is the only artifact outside §4's four pieces; it is the npm script of `:137` made real and `design.md:149` names it.

---

## Build Integrity — PASS

Run by the Leader from `server/researchindicators` with no delegated agent active:

| Check | Result |
| --- | --- |
| `npm run build` | PASS — `nest build` + `vite build`, 47 modules, 388 ms |
| `npm test -- --silent` | PASS — **321 suites / 2042 tests / 1 snapshot, all pass**, 16.2 s |
| `npm run lint -- --quiet` | PASS — clean, no output |
| `git status` after lint | Empty — `--fix` mutated nothing; tree clean post-commit |

The build matters more than usual here: both migrations reproduce ~981-line and ~162-line procedure bodies as TypeScript template strings, which either compiles or does not.

---

## Requirement Coverage — PASS with 2 half-verified clauses

Walked at **scenario and clause granularity**, not ID level.

### R-SPV-001 — 7 of 8 clauses PASS

Every `BUT NOT` / `AND IT MUST` clause is owned by a named task with evidence at source. AC.5 was proven *stronger* than the criterion asked — `cmp` byte-identical **and** re-proven live via `migration:test:revert` → RED → execute → GREEN.

- **WARN:** AC.2's "**active** rows" qualifier is half-verified. The fixture seeds no `is_active = 0` row, so `WHERE is_active = TRUE` is asserted by nobody (advisory B-6). AC.2 does not state the negative, so this is not a violation — but the clause's discriminating half is untested.

### R-SPV-002 — 6 of 7 clauses PASS

- **WARN:** "**BUT NOT** leave children deleted while the parent survives" is proven for the *objective* tables; the seeded snapshot has no children outside them, so "the snapshot's **other** children" is vacuously satisfied (advisory B-11).

### Disqualifiers and risks

All DC-A…DC-E PASS. DC-E's disqualifier explicitly cleared — the fixture versions **twice** with the delete between. RB-1/1b/1d, RB-2, RB-3, RB-4 PASS.

- **RB-5 — PASS in structure, FAIL in prose.** Structurally guaranteed: `1784250000000 < 1784300000000`, so TypeORM's newest-first revert is safe by construction (B-13), and `devops-note.md:13` states it imperatively. **But four sites still tell a reader this is one migration** → F-1.
- **RB-1c — WARN.** Recorded "Closed as written" while the guard covers only the path that structurally cannot cause the harm → W-3.

---

## Linting & Code Quality

Lint clean, build clean, coverage 83.57% stmts / 74.76% branches / 84.62% funcs / 83.56% lines against a 60% floor, not regressed. `collectCoverageFrom` excludes `**/db/migrations/**`, so this spec's migrations cannot move the number either way — relevant to W-4.

### Advisory (4R) — the auditor's ranking of 32 carried advisories

**Act on these:**

| ID | Finding |
| --- | --- |
| **C-9** → W-5 | `routine-transcript.md:172-177` stale; **the only path by which stale prose becomes executed SQL** (DD-12 requires M6 authored from the transcript). Both T-03 Reviewers and this auditor independently ranked it strongest |
| **A-1 + B-2** → W-3 | Unguarded DDL/write paths to a potentially-shared target; highest-severity technical residual, two-line fix |
| **B-3** | `jest-fixtures.json` sets no `maxWorkers`; the fixture seeds shared lookups with a racy insert-if-absent protocol, and chunk 1 is queued to add fixtures on the same schema. Set `"maxWorkers": 1` **before** the second seeding fixture lands |
| **B-14** | ✅ **Verified closed** — fully absorbed into `devops-note.md:35-53`, both locator queries included |
| **D-2** → W-7 | Snapshot restatements disagree; one criterion will read false |

**Cheap, worth one line each:** B-4 (unguarded `afterAll` deletes; `destroy()` not in a `finally`), B-5 (`beforeAll` has no timeout override across `initialize()` + eleven inserts under Jest's 5 s default — a plausible cold-container flake whose failure mode reads like the bug), B-6 / B-17 (the two cheapest coverage widenings, and both map to the half-verified clauses above).

**Verified closed at source:** A-2, A-7, E-1. **Largely closed:** A-4 by `README.md:94-96`.

**Noise / duplicates:** B-7, B-8, B-10, B-11, B-13, B-18, A-3, A-5, A-6, C-5…C-8, C-10, C-12, D-1, D-3, D-5, E-2, E-3, E-5. The log itself labels E-3=D-5, E-4=D-4, E-5=D-1+D-3.

### New 4R observations

- **Readability** — `1784300000000:20` cites *"DD-4 / OQ-2"* as authority; both were struck and amended the same day (DD-6, R-SPV-002). The statement is still true, so cosmetic — but a reader following DD-4 lands on a struck decision. One-word fix: cite DD-6.
- **Reliability** — `orm.test.config.ts:28` `parseInt(env.ARI_TEST_MYSQL_PORT, 10)` yields `NaN` when unset (A-5, open), and it is now the sole port source for every fixture and every `migration:test:*`.
- **Risk** — `docker-compose.test.yml:13` commits a plaintext root password. Correct for a disposable loopback-bound container and the inline comment says so; nothing to do beyond not weakening it.

---

## Design Conformance — PASS, with 2 prose FAILs

Spot checks all PASS: DD-2, DD-3, DD-6/§3.1 (statements textually identical to `1783029013035:1046-1052`, placement verified), "no transaction/handler added", signature unchanged, "not `FOREIGN_KEY_CHECKS=0`" (the occurrence at `baseline.sql:14` is mysqldump's session preamble — checked and cleared rather than flagged reflexively), §6 Order, §4.1 "no business data".

### Cross-document figure check

Every figure re-derived **from the files**, not read from the log.

| Figure | Claimed | Derived | Verdict |
| --- | --- | --- | --- |
| 29 copy blocks | `design.md:26` | 29 `INSERT` in `up()` | ✅ |
| "the other 27" byte-identical | 3 documents | 29 − 2 | ✅ |
| 981-line body | `requirements.md:33`, `design.md:28` | `1783029013035:8`→`:988` = 981 | ✅ |
| 6 lines removed | `execution.md:402` | 981 − 975, = `id`+`roles_id`+`rio.id`/`rso.id` ×2 | ✅ |
| **32 child deletes + 1 parent** | `requirements.md:107`, `design.md:83`/`:116`, `routine-transcript.md:175` | `down()` = 33 `DELETE`; `up()` = 35 | ✅ |
| **"37 existing child deletes"** | **`tasks.md:155`** | **32** | ❌ **F-2** |
| "the 30 sibling deletes" | `execution.md:537` | A third figure for the same population, never reconciled. Non-material | ⚠️ |
| 303 migrations | 3 documents | 305 files = 303 + this spec's 2 | ✅ |
| "first 139 of 303" | `requirements.md:154` | Corroborated by 2 independent records; C-8's nuance correctly recorded | ✅ |
| 196 tables / 17 views / 23 routines / 1 `INSERT` | `tasks.md:95` | 196 `CREATE TABLE`; 34 `VIEW` = 17 × mysqldump's 2 passes; 19 `FUNCTION` + 4 `PROCEDURE`; 1 `INSERT` → `migrations` | ✅ |
| 348 `migrations` rows vs 303 files | `execution.md:341` | Explicitly reconciled at `README.md:37` | ✅ |
| Snapshot procedure "982 … matching 981" | `execution.md:309` | Off by one, described as a match. Dump-formatting artifact; delta unnamed | ⚠️ |
| **"~350-line delete routine"** | `design.md:18`, `tasks.md:227` | **162 lines**; the two-body file is 381, not ~700 | ❌ **W-9** |
| **"~2,050 LOC"** | **`design.md:28`** | Superseded by `design.md:18`'s own ~2,750 **in the same document** | ❌ **F-1** |
| **"one migration"** | **`requirements.md:18`, `:33`, `design.md:26`** | Two shipped; RB-5 forbids shipping one | ❌ **F-1** |
| Budget: 5 tasks | 3 documents | 5 executed | ✅ |
| Budget: ~2,750 LOC | 3 documents | ≈3,065 authored (+11%) | ⚠️ W-9 |
| Budget: 3–4 review rounds | 3 documents | **5** rounds, ~10–11 Reviewer spawns | ⚠️ W-9 |

> **Two documents agreeing was one wrong idea copied forward — twice.** "One migration" survives in three places across two documents; "~350-line" propagated from `design.md:18` to `tasks.md:227` unchallenged even after `execution.md:536` established 162.

### Pivots

| Pivot | Record | In `design.md:19` register | Result |
| --- | --- | --- | --- |
| T-01 | ✅ full structure | ✅ | PASS |
| **T-01b** | ✅ full structure | ❌ **omitted**, though `design.md:129` and DD-5 attribute themselves to it | **WARN (W-6)** |
| T-02 | ✅ full structure | ✅ | PASS |

Pivot *records* are exemplary — each names its trigger, argues why it is not rework, sizes the blast radius, presents costed alternatives, waits for a user ruling, then lists amendments and runs a two-direction sweep. The defect is that **two of the sweeps they claim to have completed did not** (F-1, F-2).

---

## Test Evidence Summary

**No `/akili-test` phase and no `test-report.md` — assessed WARN, not FAIL.**

The mandatory gate here is behavioural on a stored routine. `requirements.md:133` is correct that Jest cannot instrument SQL and the existing green-check specs are presence-assertions on emitted strings. A Tester would have had nothing to test: **no application code changed in this spec.** The delivered evidence — red→green→re-red on the *real* procedures for **both** defect classes, plus 321 suites / 2042 tests and unregressed coverage — is stronger for this defect class than any unit suite could be, and the fixture docblock names KZ-001 at `:8`.

**The real gap is downstream and unowned (W-4):** `execution.md:347` records that the main Jest runner **structurally cannot** collect `*.fixture-spec.ts` (wrong `rootDir` *and* `-spec` vs `.spec`), `:731` that coverage excludes migrations, `:733` that the fixture suite was excluded from T-03's gate. So the only real gate for this defect class runs in **no CI path**, contributes nothing to the coverage floor, and needs Docker plus a manually-loaded snapshot. That is not a Bug-Mode shortcoming — it is an unassigned residual.

---

## Agent Guide / Constitution Impact — WARN

**No `## Constitution Impact` block exists in `execution.md`, and one was owed.** This spec created a new `src/db/` directory, five npm scripts, a Docker compose file, a second Jest runner, and a committed 423 KB schema artifact — and it **falsified a constitutional statement**.

| # | Document | Drift | Severity |
| --- | --- | --- | --- |
| 1 | `docs/infrastructure.md:98` | *"no seed or reset script exists in the repo … there is nothing an agent may safely reset."* This spec built exactly that. **Now false** | **high** |
| 2 | `docs/infrastructure.md:120` (OI-7) | Partly answered by `src/db/baseline/`; not recorded | med |
| 3 | `docs/infrastructure.md:91-96` | Lists none of `compose:test:*`, `migration:test:*`, `baseline:test:load`, `migration:test:bootstrap`, `test:fixtures`. Root `CLAUDE.md` §4.3 directs agents to read this contract and *never guess* — so an agent following the guide cannot discover the harness | med |
| 4 | `server/researchindicators/src/CLAUDE.md` | No `db/baseline/` node, none of the five scripts, no `*.fixture-spec.ts` convention (a silent-zero-collection trap per C-6) | med |
| 5 | Root `CLAUDE.md` §3 tree | `db/baseline/` missing | minor |
| 6 | `docs/trd/trd.md` | `requirements.md:169` (OQ-3), `design.md:145` and `README.md:28` **all three** say a TRD note is owed. None exists; no ticket id recorded | **high** |

`.codegraph/` also needs a re-index. These are `/akili-archive`'s Constitution & Graph Sync work — but with no `## Constitution Impact` block, archive inherits no handoff list.

---

## Remediation

### FAIL — must fix before archive

**F-1 — The T-02 Pivot's forward sweep is asserted complete and is not; four sites still specify the pre-pivot single-migration design.**

*Violated:* `execution.md:490-492` ("**Forward** … All located and updated"), `requirements.md:159` RB-5, `design.md:170` §6 Order, root `CLAUDE.md` §5.

| Site | Current text |
| --- | --- |
| `requirements.md:18` | "Depth \| **Lite** (Bug Mode) — one migration, one fixture, no design latitude" |
| `requirements.md:33` | "**Fix:** one append-only migration rewriting those two blocks." |
| `design.md:26` | "One append-only migration, `DROP` + `CREATE` of `SP_versioning` …" |
| `design.md:28` | "a two-block repair costs **~2,050 LOC**" — contradicted by `design.md:18`'s own ~2,750 |

*Why FAIL, not WARN:* these are the Document Control row and the Executive Summary — the first text any reader, reviewer, or merge approver encounters. A reader who stops there is told to ship **one** migration, which is precisely the action RB-5 classifies as converting a total failure into a **partial-data-loss** failure. The prose contradicts the spec's own highest-severity risk at its most-read location.

*Fix:* four edits — "two migrations, one fixture"; "**Fix:** two append-only migrations — the `SP_versioning` repair and its mandatory `SP_delete_result_version` companion (R-SPV-002 / RB-5); never ship the first alone"; "Two append-only migrations …"; and either "~2,750 LOC" or delete the figure and point at Document Control so it cannot drift again.

**F-2 — `tasks.md:155` still states "37 existing child deletes" — the exact figure advisory B-12 declared FIXED.**

*Violated:* `requirements.md:107` (AC.4, "32 child deletes (33 statements)"), `design.md:83`, `:116`, `execution.md:568` (B-12 ✅ FIXED, naming only `requirements.md` and `design.md`), root `CLAUDE.md` §5.

*Confirmed from the file:* `1784250000000` `down()` = **33** `DELETE` (32 child + parent at `:374-376`); `up()` = 35. Corroborated by a fourth document, `routine-transcript.md:175` ("Table count 33").

*Why FAIL:* `execution.md:550` records the Leader's own reason for fixing this rather than deferring — *"leaving it would send a T-03 verifier hunting for five statements that do not exist."* **That harm is still live**, in the document a task-executing agent reads first. Two Reviewers flagged the figure independently and the remediation missed a third of its sites.

*Fix:* `tasks.md:155` → "**32** existing child deletes (33 statements including the final parent delete)", with the same *(corrected 2026-08-14, advisory B-12)* provenance the other two sites carry. Extend B-12's row at `execution.md:568` to name `tasks.md` as the third site.

### WARN

| ID | Finding | Fix |
| --- | --- | --- |
| **W-1** (high) | `tasks.md:5` `Status: not-started` with all five tasks executed; `requirements.md:5` / `design.md:5` `draft` with work implemented; `tasks.md:8` `Last updated: 2026-08-14` while `:177` records a 2026-08-18 change. (`design.md:8`'s date is **correct** — it was absent from T-03's diff) | Advance to `in-progress` / `implemented`; bump `tasks.md:8` |
| **W-2** (high) | No `## Constitution Impact` block; six drift sites, two high | Add the block listing §Constitution Impact's table + a `.codegraph/` re-index recommendation |
| **W-3** (high) | RB-1c "Closed as written" while `load-baseline.js:64`'s guard covers only the `docker exec` path that *cannot* reach a remote host; `migration:test:execute`/`:revert` run **DDL** over TCP through `orm.test.config.ts` with **no guard**, and the fixture writes through the same datasource | Restate as "closed for the load path; open for `migration:test:*` and the fixture datasource (A-1/B-2)". Closing it properly is a new proposal |
| **W-4** | The only gate for this defect class runs in no CI path and nobody owns changing that | Record as a named residual with an owner, or an explicit accepted-risk statement; document `*.fixture-spec.ts` + `npm run test:fixtures` in `src/CLAUDE.md` §9 |
| **W-5** | `routine-transcript.md:172-177` stale with **no inbound notice**, while three lower-risk chunk-1 sites got one. The boundary ruling was legitimate; the *instrument* was applied inconsistently | File the same non-editing inbound notice adjacent to `routine-transcript.md:177` |
| **W-6** | `design.md:19` Pivot register omits T-01b | Add the T-01b entry |
| **W-7** | `tasks.md:96` asserts `migration:test:execute` reports **zero** pending; with this spec's two migrations committed it reports **2**. Advisory D-2's exact defect class, raised only against chunk 1 and not against this spec's own folder | "zero pending **other than this spec's own two migrations**" |
| **W-8** | `requirements.md` §7 has **two** open sign-off rows (Engineering lead `:175`, DevOps `:176`) and `devops-note.md:8` names both, but the audit trail tracks only DevOps | Name both in T-03's `Not Done`; adopt D-4/E-4 — Engineering lead as approver, DevOps as executor acknowledgement |
| **W-9** | Budget never reconciled: LOC ≈3,065 vs ~2,750 (+11%); **5** review rounds vs 3–4; "~350-line delete routine" wrong by >2× (it is 162) | One reconciliation line in Document Control with overrun causes; correct "~350" → "~165" in both places |
| **W-10** | `tasks.md:203` says FR-6 "**closed**" where the artifact says "**closes on merge**" — a shade of the same over-claim class T-03 was reworked for, inside T-03's own checklist | "FR-6 updated to close on merge, with the residual pre-flight named" |
| **W-11** | Ten requirement ACs and the spec Done definition unchecked in the authoritative documents while `execution.md` declares them closed. An **under**-claim — closure exists with evidence | Tick at archive, leaving DevOps-dependent items open |

---

## Adjudications the auditor was asked to second-guess

| Item | Auditor verdict |
| --- | --- |
| **The FR-6 ruling** (Leader overrode a Reviewer FAIL) | **Correct — PASS.** The delivered row does not assert a completed closure: it reads "Closes on merge of this PR", retains its original criterion verbatim, and names the residual pre-flight, the branch-only state, and both open gates. The auditor tested Lens B's named harm — that a reader would treat the row as a green light past `tasks.md:130`'s stop-check — and it does not survive the delivered text, because the row names the stop-check itself. "I would not argue the row should stay open." |
| **T-03 `[~]` vs `[x]`** | **`[~]` is correct**, and for the right reason. No way to argue `[x]` |
| **Advisory labelling** (32 items) | 30 correctly non-gating. **2 mislabeled:** A-1+B-2 understate an unguarded DDL path (→ W-3), and C-11 was a *mandated* falsifier skipped — a gate omission, not a lens observation, though immaterial in effect since a doc-only diff would have measured suite sensitivity rather than the change |
| **Process deviations** (7) | **All legitimate**, each with reasoning recorded rather than taken silently. One asymmetry: the Leader corrected the *neighbour* spec's stale `Last updated` headers and left **its own** (`tasks.md:8`) stale → W-1 |

---

## Kaizen candidates worth promoting at archive

- **`execution.md:148`** — *"A verification harness can be proven correct and still be unable to run."* The auditor called this the single most transferable output of the run, and it earned itself twice: T-01 passed every per-piece check while remaining useless, and only an end-to-end criterion caught it. Currently a **candidate only**.
- **`execution.md:242` / `README.md:41`** — *grepping source finds only what the source talks about.* The 3-of-64 derivation, a 95% miss rate, caught only because the Implementer flagged its own result as unverified rather than asserting completeness.
- **KZ-004 recurrence** — `kaizen-log.md:14` still shows `1`; `execution.md:105`/`:146` record a further occurrence.
- **New candidate from this validation** — *a pivot's forward sweep must search for the **idea** it changed, not only the strings it edited.* F-1 and F-2 are both this lesson, and it is what "one migration" cost.

---

## Archive Readiness

**Not ready — but close.**

1. Fix **F-1** (four sentences) and **F-2** (one number). Pure documentation; no code, migration, or harness touched.
2. Advance **W-1**'s three status fields and one stale header; add **W-2**'s `## Constitution Impact` block so archive inherits the drift list.
3. **W-3** and **W-5** should not pass without at least a recorded owner. The remaining WARNs are legitimately archive-time or new-proposal work.
4. The spec cannot close regardless until T-03's user-owned criterion lands: send `devops-note.md`, then sign off `requirements.md` §7.

Then:

```text
/akili-archive docs/specs/bugfix/sp-versioning-roles-id
```

---

## Remediation Status

**Appended 2026-08-18 by a second remediation pass. Point-in-time record — the findings above are unchanged; this section only tracks what happened to each of them.**

| ID | Status | Note |
| --- | --- | --- |
| F-1 | **Closed** | commit `8afd2ca9` (first pass) |
| F-2 | **Closed** | commit `8afd2ca9` (first pass) |
| W-1 | **Closed** | commit `8afd2ca9` (first pass) |
| W-2 | **Closed** | commit `8afd2ca9` (first pass) |
| W-3 | **Restated, not closed (this pass)** | RB-1c's closure narrowed in `requirements.md`, `design.md`'s referenced `execution.md` row, and `execution.md` itself, to *"closed for the baseline-load path; open for `migration:test:*` and the fixture datasource — see A-1/B-2."* The guard gap itself is untouched — actually closing it needs its own proposal |
| W-4 | **Still open — needs an owner decision** | Not addressed beyond recording it here, as instructed: the only real gate for this defect class (the `*.fixture-spec.ts` suite) runs in no CI path and contributes to no coverage floor |
| W-5 | **Closed (this pass)** | A non-editing inbound notice filed at `routine-transcript.md` (adjacent to §4.1, ~`:177`), matching the shape already used at `design.md:426`/`:506`. States the post-T-02b reality and points at R-IU-011 AC.8/AC.9 as chunk 1's own gate to amend. No stale fact and no acceptance criterion was edited |
| W-6 | **Closed (this pass)** | `design.md`'s Pivot register (Document Control) now lists T-01b between T-01 and T-02, pointing at `execution.md` → *Pivot Record: T-01b* |
| W-7 | **Closed (this pass)** | `tasks.md` T-01b's Done criterion and its Verification twin both qualified: zero pending migrations **other than this spec's own two**, once committed to the tree |
| W-8 | **Partial (this pass) — the sign-offs themselves are user-owned** | `execution.md`'s T-03 `Not Done` and `tasks.md`'s T-03 Done item now name **both** the Engineering lead and DevOps rows, not DevOps alone. `devops-note.md` step 0 adopts D-4/E-4: Engineering lead is now the approving party, DevOps the executor acknowledgement. Neither box is checked — that remains a human action |
| W-9 | **Closed (this pass)** | One reconciliation row added to `execution.md`'s Document Control: 5/5 tasks as budgeted; LOC ≈3,065 vs ~2,750 (+11%); 5 review rounds vs 3–4; overrun causes named (two pivots, +1 task, +2 T-03 rounds); records that the budget tripwire never had a LOC/round trigger, only a scope one, and that no reconciliation had been recorded before now |
| W-10 | **Closed (this pass)** | `tasks.md` T-03's Done item reworded from `family.md` FR-6 "**closed**" to "**updated to close on merge**, with the residual pre-flight named" — matching the delivered row's actual wording |
| W-11 | **Closed (this pass)** | `requirements.md`'s ten ACs (R-SPV-001 + R-SPV-002) ticked, each with an `execution.md` evidence pointer. `tasks.md`'s spec-level Done definition: 4 of 6 items ticked with evidence; the other 2 (task-status roll-up naming T-03 "done", and chunk 1 "unblocked") left open as DevOps/merge-dependent, since T-03 itself is still `[~]` |

**Net effect:** every WARN with a documentation-only fix is closed or explicitly restated with its residual scope named. **Two items remain open by design, not by oversight:** W-4 (needs an owner decision on the fixture gate's CI coverage) and the sign-off boxes under W-8 (needs the named humans to act). Nothing in this pass touched code, migrations, or the test harness.
