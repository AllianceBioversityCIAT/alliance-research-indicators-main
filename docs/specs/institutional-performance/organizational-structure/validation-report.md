# Validation Report — Institutional Performance / Organizational Structure

> **Verdict (updated 2026-11-10): NOT archive-ready yet. 0 FAIL · 27 PASS · 4 WARN.** T-13 fixed the only FAIL. T-14 and the doc amendments closed 4 WARNs and all 7 figure findings. What is left is 4 WARNs that rest only on T-06's blanket statement, plus RB-4 and the advisory triage. See §13.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/institutional-performance/organizational-structure/` |
| Validated at | 2026-11-06, branch `institutional-kpis`, HEAD `a5c06455`; **updated 2026-11-09** after T-13 |
| Auditor | Leader session (Opus 5.5) + independent read-only clause audit (`akili-reviewer`, Opus); implementation was done by Sonnet / Gemini workers (author ≠ auditor) |
| Inputs | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`; no `test-report.md` exists, so coverage was verified directly |
| Result levels | PASS · WARN · FAIL · BLOCKED |

## 2. Summary

| Area | Result | One line |
| --- | --- | --- |
| Task completion | PASS | T-01…T-12 done. Each has a Reviewer PASS in `execution.md`, except T-06, which is human and has the requester's words |
| File existence | PASS (1 WARN) | Every path in design §2.1 exists; the integration suite names differ from the design's list |
| Build integrity | PASS | server `tsc` 0, `build` 0; client lint clean, `ng build` ok; 2 server suites red, both pre-existing and unrelated |
| Requirement coverage | WARN | 23 PASS · 8 WARN · 0 FAIL (NFR-ORG-004 machine tokens: FAIL → fixed by T-13) |
| Code quality | WARN | module lint clean; open advisories carried forward (§7) |
| Design conformance | WARN | director count/source drift; 6 more figure inconsistencies across documents |
| Constitution impact | WARN | child guides / TRD do not mention the module yet; CodeGraph re-index pending |

## 3. Task Completion

| Task | Status | Evidence | Result |
| --- | --- | --- | --- |
| T-01 … T-05 | done | Reviewer PASS (×2 for T-01…T-04) in `execution.md` | PASS |
| T-06 (HITL) | done 2026-11-06 | Requester: "Ya quedo todo probado. Podriamos cerrar la T-06". One blanket statement, not one quote per step. The role used for step 1 is not stated, and that is the task's own disqualifier | **WARN** |
| T-07 … T-11 | done | Reviewer PASS; their browser re-checks are covered only by T-06's blanket closure | PASS |
| T-12 (pivot) | done | Reviewers A and B PASS on attempt 2 | PASS |
| T-13 (validation fix) | done 2026-11-09 | Reviewer (Sonnet) PASS on round 1; red-first evidence in `execution.md` | PASS |
| Seed edits after T-05 (2026-10-28, 2026-11-06) | committed (`8c517446`) | Leader-verified (`tsc`, eslint, seed integration green); **no Reviewer audited them** | **WARN** |
| `tasks.md` §5 Done definition | all 7 items unchecked | see §11 | open |

## 4. File Existence

All server files in design §2.1 exist (module, controller, both services, registry, level provider, timeline util, constants, 4 entities, repositories, DTOs, `global-exceptions.spec`, migrations `…000`–`…005`, seed). All client files exist (page, `org-tree`, `org-unit-panel`, `org-unit-form`, `org-lifecycle-dialog`, `org-tree.util`, interface, `ApiService` methods, sidebar item, modal registration, route). Wiring checked: `main.routes.ts:279-280`, `entities.module.ts:212`, `app.routes.ts:333`, control-lists errno 1451 at `control-lists.service.ts:44`.

| Item | Result |
| --- | --- |
| Design names `test/org-structure-versions.integration-spec.ts`; on disk the suites are `save`, `schema`, `year-view`, `lifecycle`, `consumers`, `seed`, `module-wiring`, `performance` | WARN (doc only) |
| No sibling spec for `org-structure.constants.ts`, `organizational-structure.module.ts`, `organizational-structure.types.ts` | PASS (constants/types only; the module is covered by `org-structure-module-wiring.integration-spec.ts`) |

## 5. Build Integrity

Run sequentially with no worker active (root `CLAUDE.md` §4.3), 2026-11-06.

| Check | Command | Result |
| --- | --- | --- |
| Server type-check | `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| Server build | `npm run build` | exit 0 |
| Server lint (module) | `npx eslint` over the module, its 8 integration suites, the seed, migrations `…000`–`…005`, `control-lists.service.ts` | exit 0 |
| Server lint (whole repo) | `npx eslint "{src,test}/**/*.ts"` | exit 1: `275702 problems`, of which 275665 are `Delete ␍`, so CRLF in this Windows checkout, not code. **Not a usable gate on this machine** |
| Server unit + coverage | `npm run test:cov -- --silent` | `Test Suites: 2 failed, 472 passed, 474 total` · `Tests: 3 failed, 4968 passed, 4971 total`; All files **90.76 % stmts / 77.26 % branches / 86.75 % funcs / 90.57 % lines** (≥ 60 %). Reds: `capdev-bulk-summary.template.spec.ts` and `result-innovation-use/entity-metadata.spec.ts`, the same 2 pre-existing suites recorded since T-01 |
| Server integration | `npm run test:integration -- --silent "org-structure\|control-lists"` | `Test Suites: 1 skipped, 14 passed` · `Tests: 3 skipped, 271 passed, 274 total` (re-run after the 2026-11-06 re-seed) |
| Client lint | `npm run lint -- --quiet` | "All files pass linting." |
| Client unit + coverage | `npm run test:coverage -- --silent` | `Test Suites: 358 passed, 358 total` · `Tests: 8417 passed, 8417 total`; 96.98 / 92.42 / 95.87 / 97.47 (floors 40 / 20 / 30 / 45) |
| Client build | `npm run build` | ok; budget warnings only on files outside this spec |

**Scope this cannot reach (KZ-017):** `npm run test:e2e` was not run; no stack boot or browser run in this validation (the human browser check is T-06).

## 6. Requirement Coverage

The independent auditor checked every requirement at the scenario and clause level against code and tests. Rows that are plainly PASS are collapsed.

| ID | Clause | Owner | Evidence | Result |
| --- | --- | --- | --- | --- |
| R-ORG-001…003, 005, 007…011, 016, 017 | all scenarios and clauses | T-01…T-04, T-12 | service / controller specs, `lifecycle` + `consumers` integration (e.g. B1–B13 → 403 with rows unchanged, C1–C3 → 200) | PASS |
| R-ORG-004 | scenarios, AC.1–3 | T-01…T-03, T-12 | timeline engine specs; service spec :619 | PASS |
| R-ORG-004 | "*Applies from year* (default: the current year)" | T-10 | Code follows D-ORG-23 (the Structure year when it is ≥ the current year); `requirements.md:169` was never amended | **WARN** (doc drift) |
| R-ORG-006 | scenarios, AC.1–3 | T-01, T-03 | year-view integration | PASS |
| R-ORG-006 | "Selectable years … to the latest year that has a version start" | T-07 | The selector also offers current + 1 (D-ORG-20); `requirements.md:242` was never amended | **WARN** (doc drift) |
| R-ORG-012 | AC.1 + *Denied role* | T-01…T-04 | `consumers` integration :660 | PASS |
| R-ORG-012 | AC.2 checked with a real Center-Admin-only user | T-06 | Blanket closure, role not stated | **WARN** |
| R-ORG-013 / 014 | menu, states, form, export, natural sort | T-01…T-04 | page spec | PASS |
| R-ORG-013 / 014 | rendered tree expand/collapse/indent, column resize | T-06 | Blanket closure only | **WARN** |
| R-ORG-015 | 117 entries (3 / 19 / 1 / 94), idempotent, one `seed` log row each | T-05 | seed integration | PASS |
| R-ORG-015 | directors | T-05 + 2 later edits | 83 / 83 matched on local (2026-11-06); source changed from mockup `TREE` to the June 2026 sheet; the docs still say 11 from the mockup; no Reviewer on the edits | **WARN** |
| R-ORG-015 | seed content vs source sheet | T-06 | Blanket closure; 2 second persons in the sheet are not seeded and no one has decided what to do with them | **WARN** |
| NFR-ORG-001 | p95 targets | T-05 | Verdict *inconclusive* by the spread rule; budget met with a ≥ 7× margin | **WARN** |
| NFR-ORG-002, 003, 006 | integrity, append-only log, Swagger | T-01…T-04 | schema integration; Swagger complete on B1–B13 and C1–C3 | PASS |
| NFR-ORG-004 | every write has `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` | T-01…T-04 | controller; `consumers` integration :660 | PASS |
| **NFR-ORG-004** | **"no write reachable by machine tokens"** | **none → T-13** | A machine token gets the roles of the secret's responsible user (`jwr.middleware.ts:100-108`, `app-secret.repository.ts:18-35`); `RolesGuard` (`roles.guard.ts:28-34`) does not look at the credential; nothing in the module checks it; no test. `tasks.md` §3 closed it by ID only. **Fixed 2026-11-09 (T-13):** `HumanCredentialGuard` on B9–B13; integration test: a machine token whose user is CENTER_ADMIN + SYSTEM_ADMIN → 403 with rows unchanged, reads → 200; falsifier seen red; Reviewer PASS | ~~FAIL~~ → **PASS** |
| NFR-ORG-005 | `aria-label`, `aria-sort`, focus trap | T-01, T-03 | page, data-table and dialog specs | PASS |
| NFR-ORG-005 | tree navigable with arrow keys | T-06 | No automated test; blanket closure only | **WARN** |

**Totals:** PASS 23 · WARN 8 · FAIL 0 · BLOCKED 0 (after T-13; was 22 / 8 / 1 / 0).

## 7. Linting & Code Quality

The module lints clean (§5). Swagger: `@ApiTags` and `@ApiBearerAuth` at class level, `@ApiOperation` on all 16 handlers, every parameter declared. No `@ApiOkResponse` on B1–B3, B5, B6, C2, C3 (optional).

**Advisory (4R lens and unresolved `ADVISORY` items from `execution.md`; these do not drive the verdict):**

| # | Lens | Finding | Source |
| --- | --- | --- | --- |
| A-1 | readability | `bg-white` instead of a token on the two panes (dark mode) | `organizational-structure.component.html:85,151`; `execution.md:44` |
| A-2 | reliability | Reactivate with an open-ended last version returns 500 | `execution.md:277` |
| A-3 | resilience | C2 returns a partial ancestor chain silently; errno 1217 is not mapped | `execution.md:325` |
| A-4 | reliability | "Registered once" (level usage provider) never checked on a full `AppModule` boot; it was deferred to T-06 and the closure does not mention it | `execution.md:325,335` |
| A-5 | reliability | errno 1062 mapped by exclusion; the client compares delegate lists in order | `execution.md:187` |
| A-6 | risk | RB-6 cross-entry race (`FOR UPDATE` locks only the saved entry), widened at T-03, decision pending | `tasks.md` RB-6 |
| A-7 | reliability | Items covered only by the T-06 blanket: a top-year change resets a hand-picked *Applies from year*; stale `rows` in `dropInvalidParent`; warning vs a fast Save; a second entry selected during a save; unsaved typing discarded | `execution.md:535,543,600,606,608,641` |
| A-8 | risk | First deploy of the seed is not atomic (DDL commits the `AUTO_INCREMENT` reset) and the guards key on id only | `execution.md:400,418` |

## 8. Design Conformance

| # | Figure / statement | Conflict | Result |
| --- | --- | --- | --- |
| D-1 | Directors | `design.md:159`: "the mockup `TREE` assigns **11** directors". Today the seed has **83** from the June 2026 sheet (`org-structure.seed.ts:43-47`; seed spec `toHaveLength(83)`); `requirements.md:455-456` names only the MMF sheet | WARN |
| D-2 | Task count | `design.md:390` "Tasks: 6" vs `design.md:400` "now 12" | WARN |
| D-3 | Review-round cap | `design.md:392` "≤ 12" vs `design.md:400` "raised to 14" | WARN |
| D-4 | Tables | `proposal.md:87` lists 3 tables; `requirements.md:581` lists 4 (delegates added) | WARN |
| D-5 | T-01 migrations | `tasks.md:72` cites `…000–…002`; the scope at `:73` lists `…000–…003` | WARN |
| D-6 | Status lines | `tasks.md:5` still "in-progress"; RB-7 "open — closes when T-12 passes", but T-12 is done | WARN |
| D-7 | Integration suite names | design §2.1 vs disk (§4) | WARN |
| — | Consistent | 117 / 3-19-1-94 across requirements, design, proposal and seed test; migrations `…000`–`…005`; B1–B13 and C1–C3 match the 16 controller handlers | PASS |

The intentional deviations (D-ORG-20, D-ORG-22, D-ORG-23, D-ORG-24 pivot) are recorded in the design decisions log. D-ORG-20 and D-ORG-23 did not flow back into `requirements.md` (see §6).

## 9. Test Evidence Summary

| Layer | Evidence |
| --- | --- |
| Server unit | module services, controller, timeline util, repositories, `GlobalExceptions` wire contract; global 90.76 % statements |
| Server integration | 8 org-structure suites + control-lists: 271 passed / 3 skipped |
| Client unit | page, tree, panel, form, lifecycle dialog, tree util; 8417 passed |
| Performance | NFR-ORG-001 *inconclusive* (spread rule), budget met |
| Human | T-06 blanket closure (2026-11-06) |
| Missing | arrow-key navigation (manual only). Machine-token denial added by T-13 |

## 10. Agent Guide / Constitution Impact

`execution.md` records Constitution Impact for T-01…T-04: a new server module, a new client page, a public in-process surface (`OrgStructureReadService`, `OrgUnitUsageRegistry`), and HTTP B1–B13 / C1–C3. **None of these appear yet** in `server/researchindicators/src/CLAUDE.md`, `client/research-indicators/src/CLAUDE.md`, `docs/trd/trd.md`, `docs/ux-ui/design.md` or `docs/prd.md`. Also pending: a child-guide line for `src/db/helpers/` (`execution.md:128`) and the CodeGraph re-index. → WARN, owned by `/akili-archive`.

## 11. Remediation

| # | Severity | Action | Kind |
| --- | --- | --- | --- |
| R-1 | ~~FAIL~~ **done (T-13, 2026-11-09)** | Deny the writes B9–B13 (POST/PATCH/DELETE; B1–B8 are reads) when `req.credential === 'machine'` (403), with an allowed/denied test per handler; record NFR-ORG-004's machine-token clause as owned and closed | code + test (new task T-13) |
| R-2 | WARN | Amend `requirements.md:169` (D-ORG-23) and `:242` (D-ORG-20); design §3.4 and `requirements.md:455-456` for directors (83, June 2026 sheet as the source) | doc |
| R-3 | WARN | Fix D-2…D-7 figures and status lines; close RB-7 | doc |
| R-4 | WARN | Independent Reviewer pass on the two post-T-05 seed edits (`8c517446` and its predecessor) | review |
| R-5 | WARN | Decide on the 2 second persons from the sheet (Deissy Martinez Baron, Christopher Kettle): delegates by hand, or leave out | requester decision |
| R-6 | WARN | RB-4: file a bugfix spec or defer explicitly; RB-3: requester approval before merging to `dev` | requester decision |
| R-7 | advisory | A-1…A-8: fix, file, or accept each | triage |
| R-8 | WARN | Constitution & graph sync (§10) | `/akili-archive` |

## 12. Archive Readiness Recommendation

**Not ready yet.** R-1 (the FAIL) is done. Archive once the WARNs are fixed or accepted: R-2 to R-6 at least. R-7 needs a triage line per item. R-8 is done by `/akili-archive` itself.

## 13. Update — 2026-11-10

| Item | Was | Now | Evidence |
| --- | --- | --- | --- |
| R-1 NFR-ORG-004 machine tokens | FAIL | **PASS** | T-13, Reviewer PASS |
| R-2 R-ORG-004 default text (D-ORG-23) | WARN | **PASS** | `requirements.md` amended |
| R-2 R-ORG-006 selectable years (D-ORG-20) | WARN | **PASS** | `requirements.md` amended |
| R-2 / R-4 R-ORG-015 directors | WARN | **PASS** | T-14 (Reviewer PASS; `…006` CLI revert + run); requirements, design §3.4 and D-ORG-26 amended; requester accepted the earlier edits ("Ya veo bien la informacion de los cambios del Seed") |
| R-5 R-ORG-015 two-person cells | WARN | **PASS** | Requester decision: Deissy Martinez Baron director of ORG-027; Christopher Kettle delegate of ORG-032 (`…006`) |
| R-3 D-1…D-7 figures, RB-7 | WARN | **PASS** | design §2.1, §3.3, §3.4, §11, §14, D-ORG-26/27; proposal note; tasks T-01 range; RB-7 closed |
| R-6 RB-3 (merge to `dev`) | open | **deferred by the requester** | "no hagas paso a dev, seguimos trabajando en local" |
| R-6 RB-4 (`findBySearch` precedence) | open | open | needs a decision: bugfix spec or explicit deferral |
| R-012 AC.2 real Center-Admin-only user · R-013/014 rendered tree and column resize · NFR-ORG-005 arrow keys | WARN | WARN | only T-06's blanket statement; needs an explicit acceptance or a per-item check |
| NFR-ORG-001 p95 | WARN | WARN | *inconclusive* by the spread rule; budget met with a ≥ 7× margin; needs an explicit acceptance |
| R-7 advisories A-1…A-8 (+ T-13 and T-14 advisories in `execution.md`) | advisory | advisory | triage pending |
| R-8 constitution and graph sync | WARN | WARN | `/akili-archive` |

**Verification after the update:** server `npm test` `2 failed, 473 passed, 475 total` (the 2 pre-existing suites); `test:integration "org-structure|control-lists"` `1 skipped, 14 passed` · `3 skipped, 280 passed, 283 total`; `tsc` 0; `npx eslint` on the changed files 0. `npm run migration:scan` cannot run: its script `scripts/scan-migration-placeholders.js` does not exist. That predates this spec. The new SQL was checked by hand.

**Archive readiness:** remove the four WARNs by an explicit acceptance (one line each) or a check; decide RB-4; triage the advisories. Then run `/akili-archive docs/specs/institutional-performance/organizational-structure`.
