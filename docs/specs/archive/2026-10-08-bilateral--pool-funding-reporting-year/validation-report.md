# Validation Report — Bilateral / Pool Funding Reporting Year

> **Verdict: WARN. The code and the tests conform. Remediation R-1, R-3 and R-4 were applied on 2026-10-08 (see `execution.md` → "Validation remediation"). The spec is archive-ready; R-2 is carried as a post-deploy rollout check.**
> No FAIL was found in code or tests. Every requirement clause has both code evidence and test evidence.
> What remains is documentation drift (two TRD/UX statements and stale spec metadata) and two evidence gaps:
> - the live seeded value was never observed
> - the HITL was approved as a blanket, not item by item

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/bilateral/pool-funding-reporting-year/` |
| Range audited | `ec490da3c..e5cb2d43d` (branch `pull-prms-result`, unpushed) |
| Date | 2026-10-08 |
| Auditors | Phase 3 by the Leader (Claude Opus 5.5). Phases 1, 2 and 4–6 by an independent fresh-context auditor (Opus), read-only |
| Implementers | Grok `grok-4.7-high` (T-01–T-07) and Claude Sonnet (T-08–T-11), so author ≠ auditor holds |
| Inputs | `requirements.md`, `design.md`, `tasks.md`, `execution.md`. There is no `test-report.md` and no `proposal.md` |

## 2. Summary

| Area | Result |
| --- | --- |
| Task completion (11 tasks) | 7 PASS · 4 WARN (evidence wording) |
| File existence | PASS: every design §2.1 / §5.x file changed, and every deletion returns 0 hits |
| Build integrity | PASS on both packages |
| Requirement coverage (29 clauses) | 26 PASS · 3 WARN · 0 FAIL |
| Code quality | PASS. 2 documentation violations, plus advisory notes |
| Design conformance | PASS for code. WARN for spec metadata and figures |
| Constitution impact | WARN: the TRD and UX log are stale on `display_only` and on one table name |

## 3. Task Completion

| Task | Result | Note |
| --- | --- | --- |
| T-01 | PASS | Reviewer PASS. Falsifiers (a)–(c) are quoted verbatim. The seed migration was run on the disposable scratch schema |
| T-02 | PASS | P-6 is recorded. Falsifiers are quoted verbatim. The env grep returns 0 |
| T-03 | WARN | The box "Integration suite run, result quoted" is ticked, but the run was environment-blocked (RB-4). The wording of the item is met, but the run does not test the behaviour |
| T-04 | PASS | Two parallel lens reviewers, both PASS. Falsifiers are quoted verbatim |
| T-05 | WARN | The integration box is ticked over `ECONNREFUSED`. That spec mocks year-less facts anyway (KZ-017) |
| T-06 | PASS | Client `tsc` stays at the 945 baseline |
| T-07 | PASS | Falsifiers are quoted verbatim. A KZ-015 flip case is present |
| T-08 | PASS | Attempt 1 FAILed on a dead 409 matcher. Attempt 2 PASSed. The `execution.md` header still reads "in progress" |
| T-09 | WARN | The HITL was one blanket owner approval ("lo veo bien haz commit"), not the item-by-item record KZ-002 requires. The live `GET /api/configuration/ARI_PRMS_SYNC` check was never recorded |
| T-10 | PASS | Falsifiers (a)–(c) are quoted verbatim |
| T-11 | WARN | Falsifier (a)'s red is paraphrased, not quoted verbatim. The header is stale ("uncommitted") |

## 4. File Existence

| Check | Result |
| --- | --- |
| Server, design §2.1: all 17 rows, plus T-10's `result.repository.ts` and its spec | PASS: every file changed |
| Client, design §2.1 plus the `hideSave` amendment and T-11: interface, `bilateral.service`, sidebar, page, `navigation-buttons` | PASS |
| Removed: `MAPPABLE_LIVE_VERSION`, `assertTocMappingVersionUnlocked`, the `AppConfig.ARI_PRMS_SYNC` getter, `PRMS_SYNC_YEAR`, `process.env.ARI_PRMS_SYNC`, the `.env.example` entry | PASS: 0 hits across server `src`, server `test` and client `src` (`dist/`, `coverage/` and `node_modules/` excluded) |
| `toc_mapping_version_locked` | 0 hits on the server. On the client, 7 hits are kept on purpose: the legacy-server matcher, its comments and its specs |

## 5. Build Integrity

The Leader ran every command on 2026-10-08, after the final commit.

| Package | Command | Result |
| --- | --- | --- |
| Server | `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| Server | `npm run build` | exit 0 |
| Server | `npx eslint <files changed since ec490da3c>` | exit 0 |
| Server | `npm test -- --silent` | **424 suites / 4086 tests passed** |
| Server | e2e boot (`app.e2e-spec.ts`, T-09) | 1/1 passed; its falsifier was observed red (DI error) |
| Client | `npm test -- --silent` | **341 suites / 7892 tests passed** |
| Client | `npm run lint -- --quiet` | "All files pass linting." |
| Client | `npx tsc --noEmit -p tsconfig.spec.json` | 945 errors, the same as the pre-existing baseline (root `CLAUDE.md` K-004) |
| Client | `npm run build` | "Application bundle generation complete". The only warnings on the page are the pre-existing NG8102 warnings |

**Cannot reach (KZ-017):**
- The integration suites (`npm run test:integration`) are environment-blocked (RB-4): credentials are unset, the scratch schema is incomplete, and the bootstrap fails.
- The full `test:e2e` run was not repeated, because `pi-delegates` writes to the shared Dev DB.
- No environment boot smoke was run.

## 6. Requirement Coverage

Coverage was checked clause by clause. Only the WARN rows are listed here; the full per-clause table, with `file:line` and the test names, is in the auditor output summarised in `execution.md` → Summary.

| Clause | Result | Why |
| --- | --- | --- |
| R-PRY-001 "Seeded value": THEN `GET /api/configuration/ARI_PRMS_SYNC` → `"2026"` | **WARN** | Proven only by the SQL text plus the scratch run. A read-only Dev query on 2026-10-08 showed **no `ARI_PRMS_SYNC` row in Dev's `app_config`**: the migration is not yet applied there, because the branch is not merged to `dev`. The live GET is still owed after deploy |
| R-PRY-002 "Change without deploy": THEN 2027 editable / 2026 read-only | **WARN** | `version_locked` is tested both ways, and so is the 409 for resolver 2027 vs a 2026 result. There is no positive "2027 result is writable when configured to 2027" test, and no end-to-end flip was performed |
| R-PRY-004: source gates run first | **WARN** | The PRMS-source ordering is tested. The TIP/AICCRA source × other-year ordering is not |

**Every other clause is PASS.** The critical paths and how they are proven:
- **R-PRY-004 client:** the 409 is matched on `errors.code` through `GlobalExceptions` → `ToPromiseService` → `extractErrorCode` → `onSave`.
- **R-PRY-004 write path:** "nothing written" is asserted as no `save`, no `emit` and no transaction.
- **R-PRY-005:** the Normalizer is not called and no log row is written, asserted at **service level**.
- **R-PRY-003:** "no Save" is enforced through `hideSave`.
- **R-PRY-007 display-only:** the STAR-20081 shape is covered.
- **R-PRY-002:** the env grep returns 0.
- **NFR-PRY-001:** stated in the rollout note.
- **NFR-PRY-002:** a failed read degrades to 2026.

## 7. Linting & Code Quality

**Spec violations, documentation only:**

| # | Finding |
| --- | --- |
| Q-1 | `docs/trd/trd.md:308` says the `reporting_year` refusal writes "no `result_prms_sync_history` row". The table it skips is `result_prms_sync_log` (repository `:336`). `result_prms_sync_history` is a different table |
| Q-2 | The TRD endpoint paragraph and the UX decisions log do not mention `display_only` or R-PRY-007. T-10/T-11 changed the public GET contract after the T-09 docs were written |

**Advisory** (4R lens; non-gating). New findings:
- The three contribution routes declare no Swagger 409.
- The display-only section uses `slate-*`/`bg-white` utility classes rather than `--ac-*` tokens. This is the existing pattern in that file. The section also reuses `.pf-stale-snapshot` for rows that are not stale.
- `ClarisaProjectsService` resolves the year itself, outside D-10's once-per-request threading.
- Authorization is clean: all four HTTP write routes are guarded, and no non-eligible write path was opened.

**Advisory** carried from `execution.md`:
- T-01:
  - `'0000'` is accepted as a year.
  - `INSERT IGNORE` does not re-activate an inactive row.
  - `down` deletes admin edits.
- T-02: old-year cache entries are retained until restart.
- T-04:
  - unconsumed `mockResolvedValueOnce` values
  - the message text reads "result year 0/NaN"
  - no null-year test
  - a transient read falls back to 2026
- T-05:
  - an extra resolve on a missing result
  - `NaN` when `reporting_year` arrives without `report_year`
- T-06: no test for center admin + locked.
- T-07:
  - the button rule is not a `computed`
  - pre-existing hex literals in the sidebar
- T-08: the legacy 409 matchers on the top-level `description` (`PRMS_SOURCED_409_DESCRIPTION`) are probably dead.
- T-10: `listIndicators` for display-only is untested.
- T-11:
  - the banner copy is singular
  - `track row.sp_code`
  - a PRMS-sourced non-eligible result shows the display-only banner

## 8. Design Conformance

The code matches design §2.1, §5 (including §5.x) and §6. Each intentional deviation is recorded:
- the `hideSave` row
- the display-only cause row
- `importAlignmentFromPrms` threading

The amendments agree with each other (§5 cause table ↔ §5.x ↔ code).

**Figure checks:** C-1 (26 hits / 7 files), P-2 (56 / 17), P-3 (10 files at baseline) and P-13 (9 files) all hold when re-measured at `ec490da3c`.

**Contradictions, all metadata:**

| # | Finding |
| --- | --- |
| D-1 | The budget in design §0 and the `tasks.md` header still says "9 tasks · ~850 LOC · ~13 rounds". Actual: **11 tasks, +2831/−389, 14 Reviewer verdicts**. The Summary's "~2.7×" was measured at T-08; the final ratio is ~3.3× |
| D-2 | The `requirements.md` §12 ID index omits R-PRY-007 |
| D-3 | The Done definition in `tasks.md` §6 still lists "T-01 … T-09" |
| D-4 | The T-08 scope cause order omits `display-only`. Design §5 carries it |
| D-5 | `requirements.md` and `design.md` status still read "draft", with sign-off unchecked, while the tasks are done |
| D-6 | Design §12.1 cites sidebar spec lines :407/:418/:455. They are now :410/:421/:458 |

## 9. Test Evidence Summary

Every reported falsifier was observed red and then reverted, except T-11 (a), whose red is paraphrased. Two tasks went through rework:
- **T-08:** the dead 409 matcher was caught by the Reviewer.
- **T-09:** the rollout note was missing.

The visual and HITL check is a blanket owner approval (T-09 WARN). There is no `test-report.md`, because `/akili-test` was not run. Coverage evidence is the per-task falsifiers, and the full suites listed in §5.

## 10. Agent Guide / Constitution Impact

No module was created or reshaped, and the child `CLAUDE.md` files are unaffected. `docs/trd/trd.md` is correct on the following:
- the paths: `/api/v1/...` for Pool Funding, and an unversioned `/api/results/:code/prms-sync`
- the 409 envelope
- §9.1

It is stale on Q-1 and Q-2, and `docs/ux-ui/design.md` is missing the display-only decision. A CodeGraph re-index is pending for `/akili-archive`.

## 11. Remediation

| # | Severity | Action | Owner |
| --- | --- | --- | --- |
| R-1 | Medium | Fix the `trd.md:308` table name (Q-1). Add `display_only` / R-PRY-007 to the TRD endpoint paragraph and the UX decisions log (Q-2) | docs fix |
| R-2 | Medium | Record the live `GET /api/configuration/ARI_PRMS_SYNC` → `"2026"` check after the merge to `dev` applies the migration. Until then, mark it open in the rollout note | owner, post-deploy |
| R-3 | Medium | Re-attest the T-09 HITL item by item, or record the owner's blanket approval explicitly as a KZ-002 exception | owner decision |
| R-4 | Low | Fix the metadata: D-1 (re-derive the budget), D-2, D-3, D-4, D-5 (flip status / sign-off), D-6, and the stale `execution.md` headers for T-08/T-09/T-11 | docs fix |
| R-5 | Low (optional) | Add tests: a 2027-result writable case, a TIP/AICCRA other-year ordering case, and a verbatim red for T-11 falsifier (a) | follow-up |
| R-6 | Advisory | Swagger 409 on the contribution routes; display-only section tokens; the follow-ups outside this spec listed in `execution.md` → Summary | follow-up |

## 12. Archive Readiness Recommendation

**Ready to archive.** R-1 (TRD and UX docs), R-3 (KZ-002 exception recorded) and R-4 (metadata) were applied on 2026-10-08. No code change was needed. The `requirements.md` §13 sign-off boxes are left for the owner.

R-2 depends on the deploy, so it stays open as a carried rollout item. R-5 and R-6 are optional follow-ups.

After the fixes, run:

```text
/akili-archive bilateral/pool-funding-reporting-year
```
