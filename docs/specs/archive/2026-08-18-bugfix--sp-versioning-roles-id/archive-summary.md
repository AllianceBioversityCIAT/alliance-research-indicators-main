# Archive Summary — Bugfix / `SP_versioning` references the dropped column `roles_id`

## Outcome

**Delivered and validated. Archived with three readiness gates deliberately unmet, on explicit user instruction (2026-08-18, request repeated after the gates were presented).**

Two append-only migrations repair a stored procedure that was **non-executable in `main` for all six indicators**, plus the repo's first disposable-MySQL harness and a committed schema-only baseline snapshot. No application code changed in this spec.

> ## ⚠️ Read this before treating the spec as finished
>
> Archiving records that the **spec** is closed. It does **not** record that the fix has shipped. Three gates were open at archive time:
>
> | Gate | State at archive |
> | --- | --- |
> | **T-03** | `[~]`, not `[x]` — its last criterion is the DevOps hand-off |
> | **`requirements.md` §7 sign-off** | **Both** rows open — Engineering lead (approves) and DevOps (executor acknowledgement) |
> | **Branch merged** | **No.** 11 commits ahead of `main` on `AC-1679-Create-the-innovation-use-section` |
> | **W-4** | Open — no owner for the fixture gate |
>
> **The two migrations have never run against the shared dev database.** `SP_versioning` there still contains `roles_id` and is still non-executable. [`devops-note.md`](./devops-note.md) in this archive is a **live, unsent request** for that run — it is not a record of one.
>
> **Consequences that are still live:**
> - `docs/specs/innovation-use/family.md` **FR-6** is written to close *on merge*. It has not closed.
> - `innovation-use/data-model-and-catalog` **must not start T-10** until `SHOW CREATE PROCEDURE SP_versioning` returns a body with no `roles_id`. Today it still contains it.
> - Reverting a **second** consecutive migration after the run strands objective rows and re-raises MySQL 1451. `devops-note.md` carries the locator queries.

---

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bugfix/sp-versioning-roles-id/` |
| Archive path | `docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id/` |
| Archive date | 2026-08-18 |
| Depth | Lite (Bug Mode) |
| Approval mode | gated |
| Branch | `AC-1679-Create-the-innovation-use-section` (unmerged) |
| Provenance | **Extracted**, not proposed — carved out of `innovation-use/data-model-and-catalog` (migration M0 / R-IU-012 / DD-13) on a user ruling of 2026-08-14, so a cross-indicator production fix would not wait on a feature spec. Hence no `proposal.md` |
| Commits | `9392c010`, `caa4c9ae`, `4dd884f6`, `59c2490f` (T-01…T-02b) · `7ca5ea6d` (T-03) · `8afd2ca9`, `7b843a2c` (validation + remediation) · `e8a874e2` (constitution sync + Kaizen) |

---

## Final Status

| Phase | Result |
| --- | --- |
| Tasks | 5 executed — T-01, T-01b, T-02, T-02b `[x]`; **T-03 `[~]`** |
| Reviewer verdicts | All PASS. T-03 took 2 attempts; every other task passed first time |
| Pivots | **3** — T-01, T-01b, T-02, each user-ruled |
| Validation | **2 FAIL → both closed** · 11 WARN → **10 closed, 1 open (W-4)** |
| Build / tests / lint | Green — `nest build` + `vite build`; 321 suites / 2042 tests; lint clean |
| Coverage | 83.57% stmts · 74.76% branches · 84.62% funcs · 83.56% lines (floor 60%, not regressed) |

---

## Requirements Delivered

| Requirement | ACs | Status | Evidence |
| --- | --- | --- | --- |
| **R-SPV-001** — `SP_versioning` must not reference the dropped `roles_id` | 5/5 | ✅ Closed | T-02. Red MySQL **1054** before, green after, re-red via live revert. Body diff: 4 hunks, all removals; `down()` `cmp`-identical |
| **R-SPV-002** — `SP_delete_result_version` must delete the two objective tables | 5/5 | ✅ Closed | T-02b. Red MySQL **1451** before, green after, on a full re-version cycle. 2 statements added, 33 originals byte-identical |
| RB-1 / RB-1b / RB-1d — no disposable schema existed | — | ✅ Closed | T-01 + T-01b (snapshot, not replay) |
| RB-1c — a `TEST`-named variable is not a disposable target | — | ⚠️ **Partial** | Closed for the baseline-load path; **open** for `migration:test:*` and the fixture datasource (W-3) |
| RB-2 / RB-3 — append-only, shared DB, all six indicators | — | ✅ Closed | Two new files, no merged migration edited, no table DDL; full suite never targeted (KZ-003) |
| RB-4 — unknown production exposure | — | ✅ Closed | OQ-1: reporting paused in production; defect never user-reachable; no comms needed |
| RB-5 — the versioning repair must never ship alone | — | ✅ Closed **structurally** | `1784250000000 < 1784300000000`, so TypeORM's newest-first revert is safe by construction |

---

## Files Changed Summary

**Production (server/researchindicators):**

| File | Change |
| --- | --- |
| `src/db/migrations/1784300000000-RepairSpVersioningObjectiveBlocks.ts` | New — `DROP`+`CREATE` `SP_versioning`, 2 of 29 copy blocks repaired (~1,991 LOC, mostly reproduced body) |
| `src/db/migrations/1784250000000-RepairSpDeleteResultVersionObjectiveTables.ts` | New — `DROP`+`CREATE` `SP_delete_result_version`, 2 `DELETE`s added (381 LOC) |
| `src/db/config/mysql/orm.test.config.ts` | New — `TEST`-bound `DataSource` (`orm.config.ts` exports a single `CORE`-bound instance `-d` cannot retarget) |
| `src/db/baseline/baseline.sql` + `README.md` | New — schema-only snapshot: 196 tables, 17 views, 23 routines, 1 `INSERT` (`migrations` bookkeeping only) |
| `scripts/load-baseline.js` | New — snapshot loader with a same-host refusal guard |
| `test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts` | New — regression fixture, 2 tests, full re-version cycle |
| `test/jest-fixtures.json`, `docker-compose.test.yml`, `package.json`, `.env.example` | Harness wiring + 7 TEST-targeted npm scripts |

**Constitution (synced at archive):** `docs/infrastructure.md` · `docs/trd/trd.md` (**ADR-12**) · root `CLAUDE.md`/`AGENTS.md` · `server/researchindicators/src/CLAUDE.md`/`AGENTS.md`

---

## Test Evidence Summary

**No `test-report.md`; no `/akili-test` phase ran — accepted, and the validation auditor concurred.** The gate here is behavioural on a stored routine: Jest cannot instrument SQL, the existing green-check specs are presence-assertions on emitted strings, and **no application code changed**, so a Tester would have had nothing to author.

What was delivered instead is stronger for this defect class:

| Gate | Evidence |
| --- | --- |
| R-SPV-001 red → green → re-red | MySQL **1054** verbatim before (migration held outside `src/db/migrations/` so the red could not be contaminated); 2/2 green after; re-red via the real `migration:test:revert` |
| R-SPV-002 red → green → re-red | MySQL **1451** verbatim on the full re-version cycle; 2/2 green after; re-red via real revert |
| Regression | 321 suites / 2042 tests / 1 snapshot green; coverage unregressed |
| Falsifiers | T-01, T-01b, T-02, T-02b each demonstrated theirs. **T-03 did not** (W-4/C-11) — with a documentation-only diff it would have measured suite sensitivity, not the change |

⚠️ **W-4, open:** the fixture suite is the *only* real gate for this defect class and it runs in **no CI path** — the main runner's `rootDir: "src"` and `.spec` vs `-spec` regex both exclude it, coverage excludes migrations, and it needs Docker plus a manually-loaded snapshot. After merge, nothing outside `execution.md` re-observes this regression.

---

## Validation Summary

`validation-report.md` — independent T3 audit, **delegated to a fresh auditor** rather than run by the Leader that adjudicated the work, and explicitly instructed to test the Leader's own adjudications.

| | Result |
| --- | --- |
| **F-1** four sites still specified the pre-pivot single-migration design | ✅ Closed (`8afd2ca9`) |
| **F-2** `tasks.md` still said "37 child deletes" after B-12 was recorded fixed | ✅ Closed (`8afd2ca9`) |
| W-1, W-2 | ✅ Closed (`8afd2ca9`) |
| W-3, W-5…W-11 | ✅ Closed (`7b843a2c`) |
| **W-4** | ⚠️ **Open** — needs an owner |

**Adjudications the auditor upheld:** the FR-6 merge-conditional ruling (which overrode a Reviewer FAIL), T-03's `[~]` status, and all seven recorded process deviations. It found **two mislabeled advisories** — `A-1+B-2` understating an unguarded DDL path (→ W-3), and `C-11`'s skipped mandated falsifier.

---

## Accepted Warnings / Follow-Ups

| # | Item | Owner |
| --- | --- | --- |
| 1 | **Send `devops-note.md`; close both §7 sign-off rows** — flips T-03 to `[x]` | User |
| 2 | **Merge the branch** — closes `family.md` FR-6 and unblocks chunk 1's T-10 | User |
| 3 | **W-4** — fixture gate runs in no CI path; needs an owner or a recorded accepted risk | Unassigned |
| 4 | **W-3** — `migration:test:*` runs DDL over TCP through an unguarded datasource; a same-host assertion in `orm.test.config.ts` covers every fixture and migration path. **Needs its own proposal** | Unassigned |
| 5 | **OQ-3** — the 303-migration history is not replayable from empty. Filed as **ADR-12**; no ticket id exists | Unassigned |
| 6 | **C-9** — `routine-transcript.md` is stale post-T-02b. Inbound notice filed (W-5); **amending R-IU-011 AC.8/AC.9 is chunk 1's gate**, and DD-12 makes that transcript the source M6's SQL is authored from | Chunk 1 |
| 7 | **B-3** — `jest-fixtures.json` sets no `maxWorkers` while the fixture seeds shared lookups racily. Set `"maxWorkers": 1` **before** chunk 1 adds its fixtures | Chunk 1 |
| 8 | KZ-005 / KZ-006 methodology upstreams | AKILI repo |

---

## Historical Notes

**The spec exists because of a Judgment Day finding in another spec.** Chunk 1's round-3 routine *transcription* — reading the SQL rather than describing it — found `SP_versioning` non-executable in `main` for all six indicators: two blocks name `roles_id`, dropped by `1783022620616` and still named by `1783029013035`. That became family risk **FR-6** and was routed here.

**Three pivots, each a discovery the design could not have made up front:**

1. **T-01** — the harness needed a fourth piece nobody identified: 10 migrations write to `sec_template` and **none of the 303 creates it**. The `sec_*` tables predate the repo's adoption of TypeORM migrations.
2. **T-01b** — the migration history is **not replayable from empty** at all. Two independent blockers in the first 139 of 303, 164 never exercised. Replay was replaced by a committed snapshot, and a done-criterion was retired as never-achievable. → **ADR-12**.
3. **T-02** — the repair *activates* a latent failure. Because `SP_versioning` could never run, no snapshot ever had objective rows; once it can, `SP_delete_result_version` hits a **RESTRICT** FK and fails partway through with rows already committed. Fixing one defect without the other converts a total failure into **partial data loss** → R-SPV-002, DD-6, RB-5.

**The most transferable lesson is about sweeps, not SQL.** Validation found two FAILs, and both were the same error: a pivot changed a value, and the correction sweep searched for *the strings it had edited* rather than every place the *idea* was restated. "One migration" was never a string anyone grepped for, so it survived in both Executive Summaries. When the remediation finally grepped the **concept**, it found six further sites — including a third stale figure (`~2,110`) propagated into a neighbouring spec in five places that nobody knew existed. → **KZ-005**.

**Second lesson: a harness can pass every check and still not run.** T-01 satisfied every per-piece criterion — falsifying sentinel, fixture green with the container up and red with it down, untouched files confirmed — while being unable to produce a schema, because no criterion exercised the mechanism end to end. → **KZ-006**, now in the task template all future specs are written from.

**Worth imitating:** every pivot stopped the line rather than working around the blocker (*jidoka*); load-bearing claims were re-derived rather than adjudicated on report; workers overruled their briefs correctly three times; and `author ≠ auditor` was defended when a Reviewer spawn died on an API 529 — the inline fallback was refused, and when the "dead" spawn later completed, the two PASS verdicts were recorded as **asymmetric** rather than as two clean confirmations.
