# Execution Log — Project Dashboard / Full-payload migration + Show-more + title alignment

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `project-dashboard/full-payload-show-more` |
| **Spec id** | 2026-07-full-payload-show-more |
| **Module** | project-dashboard (STAR client) |
| **Owner** | d.casanas@cgiar.org |
| **Branch** | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| **Linked docs** | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) · [`tasks.md`](./tasks.md) · [`judgment.md`](./judgment.md) |
| **Budget (tripwire)** | 8 tasks · ≈1,600 changed LOC · 2 Implementer→Reviewer rework rounds |
| **Rework ceiling** | 3 attempts per task |
| **Execution started** | 2026-07-29 |

### Triad configuration

| Role | Agent | Tier |
| --- | --- | --- |
| Leader (orchestrator, writes no production code) | this session | T1 |
| Implementer | `akili-implementer` | T2 (`sonnet`) |
| Reviewer | `akili-reviewer` | T3 (`opus`) — author ≠ auditor enforced by wrapper binding |

### Standing notes carried into every task

- **RB-1 (from `tasks.md` §7):** the spec's round-4 fix pass was never independently reviewed. The first Reviewer pass in this run is treated as that missing audit, with particular weight on T-06 (AC.6/AC.7 + DD-13).
- **RB-2:** NFR-PDB-004 has no automated gate. The five-step human check in `requirements.md` §7 is the only gate. If it is skipped, NFR-PDB-004 is reported **unverified**, never **passed**.
- **KZ-001 / KZ-003** (active Kaizen lessons, branch `dev`) are copied into every Implementer brief whose task touches a test double or a deletion sweep.
- **Task ordering deviation:** `tasks.md` §2 marks T-01 and T-02 parallelisable. This run executes them **sequentially**. Reason: a shared working tree makes per-task diff attribution fragile, two concurrent client test runs contend for the Karma port, and T-04 consumes T-01's fixture regardless. Sequencing also keeps commits aligned with the PR-1 / PR-2 boundary in `tasks.md` §6.

---

## 2. Task Execution History

<!-- One `### <Task ID> — <title>` entry per task, appended on PASS or HALT. -->

### T-01 — Client data layer: interface, api method, service, shared fixture

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Date** | 2026-07-29 |
| **Implementer attempts** | 1 |
| **Requirements covered** | R-PDB-001 (AC.1, AC.3, AC.4), R-PDB-005 (AC.3 — identity field made available), NFR-PDB-001 |
| **Defect classes gated** | DC-1, DC-2 |
| **Changed LOC** | 448 insertions, 0 deletions (design §13 estimate for these rows: ~448) |
| **PR** | 1 of 4 (`tasks.md` §6) — no user-visible change |

#### Attempt 1

**Files changed**

New:
- `client/research-indicators/src/app/shared/interfaces/contract-full-reports.interface.ts` (102) — mirror of all seven `ContractFullReportsDto` sections, `geo_scope` included
- `client/research-indicators/src/app/shared/services/get-full-contract-reports.service.ts` (66) — plain `@Injectable()`, one `payload` signal + six `computed` accessors
- `client/research-indicators/src/app/shared/services/get-full-contract-reports.service.spec.ts` (151) — `HttpTestingController` against the real `ApiService`
- `client/research-indicators/src/app/testing/contract-full-reports.mock.ts` (105) — the shared fixture

Modified:
- `client/research-indicators/src/app/shared/services/api.service.ts` (+8) — `GET_FullContractReports`, no `useResultInterceptor`
- `client/research-indicators/src/app/shared/services/api.service.spec.ts` (+15) — plain and encoded cases
- `client/research-indicators/src/app/shared/interfaces/project-dashboard.interface.ts` (+1) — `ProjectDashboardRankedItem.user_id?: string`

**Implementer verification**

| Command | Result |
| --- | --- |
| `npm run lint` (from `client/research-indicators/`) | clean |
| `npx jest --testPathPattern "get-full-contract-reports.service.spec.ts\|api\.service\.spec\.ts$" --coverage=false` | 3 suites, 238 tests passed |
| Consumer-scoped regression pass (`get-top-*`, `get-geo-scope`, `project-dashboard`, `geo-scope-card`) | 12 suites, 320 tests passed |

`jest.config.ts` sets `collectCoverage: true` globally, so any path-scoped run fails the *global* coverage thresholds by construction. Coverage is T-08's gate (NFR-PDB-005), not T-01's; not treated as a failure here.

**Reviewer verdict — `STATUS: PASS`**

> T-01 conforms on all eleven gates — the interface is an exact mirror of all seven server DTOs, DD-2r/DD-9/DD-12 are honored, the `HttpTestingController` evidence is real rather than decorative, the fixture carries all four invariants that arm T-04 and T-07, and nothing outside the declared file scope moved. All three Implementer assumptions verified true at source, including the load-bearing `ToPromiseService` claim.

The Reviewer re-ran `npm run lint` and both specs independently rather than accepting the Implementer's report, and verified the interface field-by-field against the seven server DTOs rather than against the Implementer's summary.

#### Decisions made

| # | Decision | Basis |
| --- | --- | --- |
| E-01.1 | The failure branch keys on `response.successfulRequest` rather than copying the four `GetTop*Service`s' catch-only pattern | **Verified at source by the Reviewer.** `to-promise.service.ts` uses `catchError(error => [{ ...error, successfulRequest: false, … }])` — the handler returns an **array**, which RxJS coerces to an observable that emits and completes, so `firstValueFrom` **resolves** and never rejects. A catch-only `loadError` path is unreachable in production. Copying the retired pattern would have failed the T-01 AC. |
| E-01.2 | Per-section accessor names `topPartners` / `topPrimaryLevers` / `topMainContactPersons` / `topContributors` / `staff` / `geoScope` | Not a free choice — `design.md` §2 names `topPartners()` verbatim in the architecture diagram; the rest follow that convention. **T-05 must consume these names.** |
| E-01.3 | `ProjectDashboardRankedItem.user_id` is **optional** (`user_id?: string`) | That shape is shared across all four ranked sections and only contacts carry the field; the dedicated contact interface keeps it required. |
| E-01.4 | `GET_FullContractReports` takes no `limit` argument | Confirmed against `agresso-contract.controller.ts` — unlike the four `top-*` handlers above it, `getFullContractReports` declares only `@Query('contract-id')`. |

#### Issues encountered

None. No rework round consumed.

#### Finding of record — pre-existing defect in the code being retired (not actioned)

While adjudicating E-01.1 the Reviewer established that the four `GetTop*Service`s are catch-only, so on an HTTP failure they fall through to `response?.data?.top_partners` → `undefined` → `list.set([])` with `loadError` left **false**. **They render the *empty* state on a 500, never the error state with Try again.** This is a live defect in code T-08 deletes, and the new service does not reproduce it — R-PDB-001 AC.4 is therefore a genuine fix, not just a migration. Recorded because it explains why the new failure path looks different from the pattern it replaces.

#### ADVISORY findings (4R lens — non-gating, recorded and closed here)

Per `/akili-execute` §2.4 these never trigger rework and never become tasks in this spec.

| # | Lens | Finding |
| --- | --- | --- |
| A-01.1 | Reliability | Per-section computeds use `?? []`, covering `null`/`undefined` but not a non-array value. The retired services guarded with `Array.isArray(data) ? data : []`. T-05 will run `[...x].sort()` over these, which throws on a non-array. Low likelihood given the typed contract, but the guard was strictly stronger before. |
| A-01.2 | Resilience | No in-flight sequencing: overlapping `update()` calls (rapid double-click on **Try again**) resolve in completion order, not issue order. Shape-identical to the four services replaced, so no regression — but with one shared service the blast radius is now all four cards at once instead of one. |
| A-01.3 | Readability | `api.service.ts` imports via `@shared/interfaces/…` while the service and fixture use `@interfaces/…`. Both resolve; each file is locally consistent with its neighbours. Cosmetic. |
| A-01.4 | Observability | The 500-path test emits a real `console.error` stack from `ToPromiseService` into Jest output. Harmless and pre-existing, but makes a passing suite log look like a failure on casual inspection. |

#### Final verification

`npm run lint` clean; `get-full-contract-reports.service.spec.ts` 8/8; `api.service.spec.ts` 230/230 — all re-run independently by the Reviewer. Full-suite and coverage verification is deferred to T-08 by design (`tasks.md` §4).
