# Validation Report — Results / CapDev Bulk Upload Notification

## 1. Document Control

- **Spec path:** `docs/specs/results/capdev-bulk-upload-notification`
- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Module / package:** `results` (implementation in `ai-reports`) — **server** (`server/researchindicators`)
- **Branch:** `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` · working tree clean at validation
- **Phase:** `/akili-validate`, run after `/akili-test` closed `PASS`
- **Validator:** Claude Opus 5 (T3 Auditor) — **≠ Implementer** (`sonnet`, per `.claude/agents/akili-implementer.md`), so author ≠ auditor holds on both axes
- **Date:** 2026-08-11
- **Inputs read:** `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `judgment.md`, `test-report.md`, the production diff (`main...HEAD`), and the constitutional baseline. No `proposal.md` exists for this spec.

---

## 2. Summary

**Overall: `PASS` — 0 FAIL, 7 WARN, 8 advisories. Archive-ready once four documentation drifts are corrected.**

Every gate was re-run independently rather than inherited from `test-report.md`, on a quiet tree with no agents active:

| Gate | Command (my run) | Result |
| --- | --- | --- |
| Type check | `npx tsc -p tsconfig.build.json --noEmit` | **exit 0** |
| Lint | `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` — deliberately **not** `npm run lint`, which carries `--fix` | **exit 0**, `git status` clean after |
| Unit + coverage | `npm run test:cov -- --silent` | **328 suites / 2,214 tests passed** |
| Coverage floor (60 ×4) | same run | **83.98 / 75.06 / 85.15 / 83.99** — no breach |
| **E2E** | `npm run test:e2e` | **2 suites / 4 tests passed, 5.175 s, exit 0** |

**The one blocking evidence item is now closed.** `test-report.md` §9 **R1a** recorded the `testTimeout: 120000` fix as *committed but never observed green* — every prior attempt hit a dev-MySQL outage. Dev MySQL was reachable at validation time (TCP probe to `192.168.20.210:3306` succeeded) and the suite ran **4/4 in 5.175 s and the process exited**. R1a is discharged by measurement.

**No requirement failed, and no code defect was found.** All seven WARNs are either documentation that drifted from the code it describes (4) or human/environment work the spec always knew it could not automate (3). The implementation itself conforms: the flag gate sits after the metric write, `to` is only ever the PI, the `%` lives in the formatter, the migrations are additive with reversing `down()`s, and the outer containment boundary is where `design.md` §6.6 says it is.

### What changed the verdict from "clean" to "seven WARNs"

Three of the four documentation findings are the **same failure mode**: a correction was applied, its sweep was run with a pattern narrower than the claim, and a surviving site now contradicts the corrected one. The spec's own `Correction Closure` discipline caught most sites — these are the residue, and they are worth naming because a document that contradicts itself is how the `/api/v1` defect entered this run in the first place.

---

## 3. Task Completion

**Result: `PASS`.** 12/12 `[x]`, each carrying execution notes and a named Reviewer verdict.

| Task | Status | Evidence quality |
| --- | --- | --- |
| T-01 … T-12 | all `[x]` | Reviewer PASS on every task; 7 of 12 passed **two** independent review lenses. Attempt counts, Leader-directed folds, and environment failures are distinguished from rework in `execution.md`. |

Owed-evidence markers (`O-1` … `O-7`) are all discharged **except `O-2`** (migration revert — waived by the spec owner on static review). That waiver is carried forward as WARN-5, not silently absorbed.

Spot-checked rather than trusted: five test names claimed by `test-report.md`'s matrix were verified to exist at the cited files (`svc::3 distinct contracts → 3 sendEmail` at `capdev-bulk-notification.service.spec.ts:1393`, the flag-flip test at `:1540`, the cross-project isolation test at `:1426`, `e2e::AC.4` at `results-ai-formalize-bulk.e2e-spec.ts:391`, and the two Swagger-metadata tests at `result-ai.dto.spec.ts:260,283`).

---

## 4. File Existence

**Result: `PASS`.** Every file in `design.md` §3's tree exists on disk — 19/19 checked individually, 0 missing.

Two additions beyond the design tree, both improvements rather than drift:

- `capdev-bulk-summary.template.spec.ts` — the byte-equality guard coupling the on-disk HTML to the migration literal (the KZ-001 control §3 describes in prose but never listed as a file).
- `env-app-config.util.spec.ts`, `bulk-upload-processes.entity.spec.ts`, `result-ai.dto.spec.ts`, `test/results-ai-formalize-bulk.e2e-spec.ts` — sibling specs required by NFR-CBU-004.

> **Scope note for the PR.** The branch carries work beyond this spec (a `results.service.ts` read-model change adding `platform_code` / `public_link` / `external_link` / `updated_at`, plus an entire archived client spec). It sits in a different method than `createResultFromAiBulk` and does not touch the notification path, so it does not threaten R-CBU-001 AC.4 — but the PR description should not claim the diff is this spec alone.

---

## 5. Build Integrity

**Result: `PASS`.**

- **Type check** and **lint** both clean, with lint run read-only so the audit could not mutate the tree it was auditing. `git status` confirmed empty afterwards.
- **Boot smoke:** not run as a separate step because the e2e supersedes it — `results-ai-formalize-bulk.e2e-spec.ts` compiles the real `AppModule` against dev MySQL and calls `app.init()`. An app that boots is part of T-10's evidence and it re-boots on every e2e run.
- **`docs/infrastructure.md` `## Local Environment` contract** exists and was honoured: no local DB was assumed, nothing was started with Docker, and no write reached the shared dev database.

---

## 6. Requirement Coverage

**Result: `PASS` (11/11 functional, 5/5 non-functional).** `test-report.md`'s requirement-to-test matrix was cross-checked against `requirements.md` at **scenario and clause granularity** — every `BUT it must NOT` and `AND IT MUST` clause has a named owning test, not merely an ID present in a table.

| Requirement | Verdict | Note |
| --- | --- | --- |
| R-CBU-001 … R-CBU-003 | PASS | AC.4's byte-identical payload gated at both unit and e2e level. |
| R-CBU-004 | PASS | AC.4 (the orphaned AC) closed in T-12 via `dropped: string[]` as a **return value** — T-06's purity gate survives, verified in source. |
| R-CBU-005 | PASS | e2e proves all three directions: legacy `201`, contacts `201` reaching CC, malformed `400` in the `GlobalExceptions` envelope. |
| R-CBU-006 | PASS | The OD-2 floor rule is implemented exactly as specified — `p < 1` as an exact comparison, not `round(p) === 0` (`capdev-metrics.formatter.ts:91`). |
| R-CBU-007 | PASS | AC.6 static-only — see WARN-5. |
| R-CBU-008 | PASS | AC.5 static-only — see WARN-5. |
| R-CBU-009 … R-CBU-011 | PASS | Flag read once per dispatch, never memoised; step order verified in source at `capdev-bulk-notification.service.ts:231-250`. |
| NFR-CBU-001 | PASS (count) | Query count is O(groups); wall-clock timing is accepted gap **A3**. |
| NFR-CBU-002 | PASS | Structural — `dispatch()` called once per process, no retry path. |
| NFR-CBU-003 | PASS (substitute) | A5's structural substitute (closed token set / closed data-key set) was mutation-proven at M7. |
| NFR-CBU-004 | **PASS — measured** | 83.98 / 75.06 / 85.15 / 83.99 on my own run. The `[~]` in `tasks.md` §8 is now dischargeable. |
| NFR-CBU-005 | PASS (static) | See WARN-5. |

**No `PRODUCT_BUG`, no `FAIL`, no flaky test, no `AUTOMATION_DEFERRED` without an accepted remediation.** The seven accepted gaps (A1–A7) each carry a stated reason why automation is impractical, and A5's substitute was proven by mutation rather than asserted.

---

## 7. Linting & Code Quality

Lint and type check are clean (§5). The findings below are the **4R lens sweep** — none is a spec violation, and none blocks archive.

### 4R advisories (new, from this audit)

| Lens | Finding |
| --- | --- |
| Resilience | `capdev-bulk-notification.repository.ts:364` — `GROUP_CONCAT(DISTINCT cc.name ...)` inherits MySQL's 1,024-byte `group_concat_max_len`. A group spanning ~40+ countries silently truncates the list mailed to a Project Leader. Independently rediscovered here; already on the ledger as **JD-S13**. |
| Risk | `capdev-bulk-summary.html:21` — `{{{starLink}}}` is a triple stache (unescaped). Sourced from `AppConfig.ARI_CLIENT_HOST` plus a fixed query string, so it is not user-reachable; the raw form is what keeps `&` intact in the href. Low, recorded for completeness. |
| Reliability | `capdev-recipients.builder.ts:84` — a file contact's `contract_code` is matched to `agreement_id` **case-sensitively** (trimmed only), while every address comparison in the same module is case-insensitive. A contact scoped to `abc-123` silently reaches no group. No requirement specifies the comparison. |
| Readability | `env-app-config.util.ts` sits at **31.57% branch** coverage. The global floor is met and the two new accessors are fully covered; the uncovered branches are the pre-existing `getConfig`/`formatResponse` paths this spec did not touch. |

### Carried forward from `execution.md` / `judgment.md` (unresolved, by decision)

| ID | Finding |
| --- | --- |
| **JD-S7** | No timeout on `dispatch()`. `client.emit` on a lazily-connecting `ClientProxy` can stall, and NFR-CBU-001's ≤ 2 s budget has no enforcement mechanism. **The open ledger entry most likely to matter in production.** |
| **A-1** (T-11) | The e2e non-exit is **masked by `forceExit`, not diagnosed** — `--detectOpenHandles` named no handle. Reproduced in this validation run: *"A worker process has failed to exit gracefully and has been force exited."* |
| **A-2** (T-11) | The e2e replicates `main.ts`'s bootstrap (`setGlobalPrefix` + `enableVersioning`) instead of sharing an exported `configureHttpApp(app)`. A future bootstrap change lands in one place and the e2e keeps passing against a configuration production no longer has. |
| T-07 advisory | No **upper** clamp on `percentageWomen`: `SUM(female) > SUM(participants)` renders e.g. `"150%"`. Same defect class as the `<1%` floor, at the other end of the range, covered by no requirement. |

---

## 8. Design Conformance

**Result: `PASS` on behavior, `WARN` on four documentation figures.** The implementation follows the design everywhere it was checked in source; the design document has drifted from the implementation in three places, and `requirements.md` from `tasks.md` in one.

### WARN-1 — `AGENTS.md:125` still asserts `/api/v1` (constitution mirror unsynced)

`execution.md` → *Constitution Impact: T-11* records the D-T11-b correction as landing in **two** constitution guides. Root `CLAUDE.md` §4.1 and `server/researchindicators/src/CLAUDE.md` §1 both carry the corrected text. **`AGENTS.md` — the mirror other hosts read — does not:**

> `- **Routing:** global `/api` prefix; URI versioning (`/api/v1`, `/api/v2`).`

This is the *exact* sentence whose inaccuracy already cost this run: it put a non-existent endpoint into three documents of this spec before T-11 booted the app and found the truth. Severity is raised above "stale doc" for that reason.

**Remediation:** copy `CLAUDE.md` §4.1's corrected paragraph into `AGENTS.md:125`, then re-run the backward sweep across `.agents/` and `.claude/agents/` for the same claim.

### WARN-2 — `design.md:190` contradicts `design.md:179`

§5's correction note (line 179) states the `/v1` route does not exist. Eleven lines later, a surviving bullet reads:

> `- Stays on `/v1`: purely additive and backward compatible, so a `/v2` would be ceremony without a consumer.`

**Mechanism worth recording:** `execution.md:1030` documents the forward sweep as `grep -rn "api/v1"` — which cannot match a line that says only `/v1`. The sweep was correct for the pattern it used and the pattern was narrower than the claim.

### WARN-3 — `design.md` §6.1's query budget is contradicted by the code *and* by `execution.md`

| Source | Claim |
| --- | --- |
| `design.md:203` | "Query budget — `4 grouped reads + 2 writes`, plus `1 template read + 1 config read per group`" |
| `design.md` §2.1 | composition block lists steps 1–5 with four reads |
| **the code** | `capdev-bulk-notification.service.ts:190-195` — **five** reads (`countTotalResults` was added in T-09 for §4.1's `total_results`), and the two config reads happen **once per dispatch, outside the loop**, not per group |
| `execution.md` → T-10 | already records "**5 reads + 2 writes** run per upload regardless of the flag" |

Two documents disagree, and the one that agrees with the code is the execution log. **No functional impact:** `countTotalResults` is one unjoined scalar query, so NFR-CBU-001's "no per-result query fan-out" still holds, and the per-group config figure is pessimistic rather than optimistic. It is a figure a future reader would rely on and find wrong.

### WARN-4 — `requirements.md` §13 disagrees with `tasks.md` §6 on 11 of 16 rows

Both tables claim to answer "which tasks cover this requirement". §13 is the pre-execution mapping and was never updated; §6 was maintained throughout. Examples:

| Requirement | `requirements.md` §13 | `tasks.md` §6 (correct) |
| --- | --- | --- |
| R-CBU-003 | T-03 | T-05, T-06 |
| R-CBU-004 | T-04 | T-03, T-06 — **and T-12**, where AC.4 actually landed |
| R-CBU-006 | T-05 | T-04, T-05, T-07, T-08 |
| R-CBU-010 | T-07, T-09 | T-10, T-12 |

The R-CBU-004 row is the one that matters: §13 points a reader away from the task that closed its most-contested acceptance criterion.

### Conformance points verified positively in source

Recorded because a clean result is evidence too:

- **Step order (§2.1, JD-01)** — the flag read at `:241` is strictly after `persistProcessMetrics` at `:231`. Gating the write behind the flag was the defect this ordering exists to prevent, and it is not present.
- **Both defensive wrappers (§6.2, §6.3)** — `safeGetTemplate` treats a throw and an empty return identically; the two new config accessors use `tryGetConfig` (a genuinely non-logging, non-throwing path) rather than a `try/catch` around `getConfig`, which is what JD-02 required and what a `try/catch` would have faked.
- **Migrations (§4.1, §4.2, §4.3)** — 9 nullable columns, no defaults, no backfill; `down()` drops them in reverse order; the template and config seeds delete exactly what they inserted, keyed by `name` / `key`. Additive per NFR-CBU-005.
- **OD-2 copy invariant** — the seeded HTML carries no `%` and no praise tail, and the on-disk mirror is byte-identical to the migration literal (guarded by a spec that fails if either side moves).
- **Module wiring (JD-S11)** — `imports: [TemplateModule]`, `MessageMicroservice` in providers, service exported. Confirmed by an app that boots.

---

## 9. Test Evidence Summary

| Suite | Deployment | My run | `test-report.md` | Agreement |
| --- | --- | --- | --- | --- |
| Backend unit | `npm run test:cov -- --silent` | 328 suites / **2,214 tests** | 328 / 2,214 | ✅ exact |
| Coverage | same | 83.98 / 75.06 / 85.15 / 83.99 | 83.97 / 75.03 / 85.15 / 83.99 | ✅ within run-to-run noise |
| Backend e2e | `npm run test:e2e` | 2 suites / **4 tests**, 5.175 s | 4 / 2 suites | ✅ exact — **and R1a now green** |
| Frontend unit | — | not applicable | not applicable | this spec touches no client code |

`test-report.md` is **not stale** relative to the current tree: the numbers reproduce exactly, and `git status` is clean at the validated commit.

The audit phase that produced it closed six ungated ACs by mutation — proving each gap, closing it, then re-proving red under the same mutation. That is stronger evidence than a passing count, and it is why §6 above reuses the matrix rather than re-deriving it.

---

## 10. Agent Guide / Constitution Impact

| Guide | State |
| --- | --- |
| Root `CLAUDE.md` §4.1 | ✅ carries the corrected versioning paragraph, including the instruction to verify a path before writing a client/test/doc against it |
| `server/researchindicators/src/CLAUDE.md` §1 | ✅ corrected — "Don't assume a `/v1` segment — check the decorator" |
| `## Module Guides` index (root) | ✅ present, both children listed and reachable |
| **`AGENTS.md:125`** | ❌ **unsynced** — see WARN-1. Pending work for `/akili-archive`'s Constitution & Graph Sync step. |

No module boundary moved and no public surface changed beyond the additive DTO field, so no new child guide is owed.

---

## 11. Remediation

| ID | Item | Severity | Owner | State |
| --- | --- | --- | --- | --- |
| **V-1** | Sync `AGENTS.md:125` with `CLAUDE.md` §4.1's versioning paragraph; re-sweep `.agents/` for the same claim | WARN | — | ✅ **APPLIED** — `AGENTS.md:125` now carries `CLAUDE.md`'s text verbatim; the sweep also found and fixed **`.agents/implementer.md:45`**, the persona briefing every Implementer, which carried the identical stale claim |
| **V-2** | Delete/rewrite the `Stays on /v1` bullet at `design.md:190`; re-run the forward sweep on the bare pattern `/v1`, not `api/v1` | WARN | — | ✅ **APPLIED** — bullet now reads "Stays unversioned", with an inline note recording what it said and why the original sweep missed it |
| **V-3** | Correct `design.md` §6.1's query budget; add `countTotalResults` to §2.1's step list | WARN | — | ✅ **APPLIED** — §6.1 line 204 corrected with a dated note, §2.1 gained step `4b`, and the forward sweep caught two further sites carrying the same figure (**DD-2** and **DD-3** in §13) |
| **V-4** | Replace `requirements.md` §13's "Covered by" column with the maintained mapping | WARN | — | ✅ **APPLIED** — §13 rebuilt from each task's own `Requirements covered:` clause. The backward sweep found `tasks.md` §6 was *also* incomplete: R-CBU-004 omitted T-12 (where AC.4 landed) and NFR-CBU-002 omitted T-12. Both fixed. |
| **V-8** | Tick `tasks.md` §8's `[~]` coverage item | housekeeping | — | ✅ **APPLIED** — flipped to `[x]` with the measured figures; `test-report.md` §9 **R1a** also flipped from *Open — blocking evidence* to **CLOSED** |
| **V-5** | Migration `down()` rehearsal on dev (O-2, waived) — production rollback of T-02 remains unrehearsed | WARN | Spec owner | open — human decision |
| **V-6** | Re-confirm `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED = 'false'` against dev **immediately before merge**, not from any record | WARN | Spec owner | open — ~2 min, at merge |
| **V-7** | §14 sign-offs: engineering lead, MEL/product owner, **security (must adjudicate D-T12-b)**, DevOps. Plus rollout steps 0–2 including the human review of a real received email (D7/D8) | WARN | Named owners | open — gated on rollout |
| **V-9** | Record the *fixture-discriminating-power* lesson in `kaizen-log.md` (`test-report.md` R2), distinct from KZ-001 | housekeeping | `/akili-archive` | open |
| — | Advisories in §7 (JD-S7, JD-S13, A-1, A-2, upper clamp, case-sensitive `contract_code`) | advisory | Eng lead | no action required |

**No production code was touched by any remediation.** V-1…V-4 and V-8 are documentation-only; the type check, lint, unit suite, and e2e results in §2 remain valid for the tree as it stands.

### V-1's sweep found a wider drift — reported, deliberately NOT fixed here

The backward sweep for the `/v1` claim was run across the whole repository, not only `.agents/`. Beyond the three sites corrected above (`AGENTS.md`, `.agents/implementer.md`, and `docs/trd/trd.md:291`, which named **this spec's own endpoint** at a path that `404`s), the same stale assumption survives in:

| Site | Claim |
| --- | --- |
| `docs/trd/trd.md:95` | **ADR-3** — "URI API versioning (`/api/v1`, `/api/v2`) under global `/api` prefix" |
| `docs/prd.md:250` | "All HTTP endpoints mounted under `/api` with URI versioning (`/api/v1/...`, `/api/v2/...`)" |
| `docs/ux-ui/design.md:175-176` | flow diagram calling `POST /api/v1/results`, `PATCH /api/v1/results/:code/...` |
| `docs/specs/general-setup/requirements.md:126` | template guidance — "keep existing `/v1` unless adding a breaking change" |
| `docs/pr-staging-to-main.md` | ~10 endpoint paths under `/api/v1` |

**Not fixed here on purpose.** These are platform-wide claims about routes this spec neither owns nor touched, and verifying each one requires checking its handler's decorator. That is a spec-to-code drift audit — `/akili-audit`'s job, not a validation phase's. Recorded so it is a known finding rather than a rediscovery. `docs/specs/general-setup/requirements.md:126` is the highest-leverage of the five: it is a **template**, so it propagates the assumption into every future spec.

---

## 12. Archive Readiness Recommendation

**Recommendation: `APPROVED FOR ARCHIVE`. The conditions are met — V-1 … V-4 and V-8 were applied during this validation (see §11).**

Against the readiness criteria:

| Criterion | State |
| --- | --- |
| All required tasks `[x]` | ✅ 12/12, every one on a Reviewer PASS |
| No unresolved FAIL | ✅ zero FAIL findings |
| WARNs accepted or with follow-ups | ✅ V-1…V-4 fixed (docs that contradicted shipped code). V-5…V-7 are accepted human/environment items, already recorded in `tasks.md` §8 and `requirements.md` §14 |
| Tests cover key requirements and scenarios | ✅ clause-level, mutation-proven, independently re-run |
| Drift reflected in docs or execution notes | ✅ closed by V-1…V-4; the wider platform-wide `/v1` drift is reported in §11 for `/akili-audit` |
| User has reviewed the validation summary | ✅ reviewed 2026-08-11; remediation option "fix V-1…V-4 now" chosen |

**Merge is separately gated** by V-6 (flag re-confirmation) — archive readiness is a property of the spec, deployment readiness is not.

```
/akili-archive docs/specs/results/capdev-bulk-upload-notification
```

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
