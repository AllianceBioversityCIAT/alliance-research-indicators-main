# Validation Report — PRMS / Pending-review lock

> **Verdict: PASS** (after remediation, 2026-11-19). The first pass was **PASS with WARN**: All 5 tasks are done, and every requirement, scenario and `BUT` / `AND IT MUST` clause has owning code and a proving test (or the HITL the spec names). Builds, lint and type-checks are clean, and all unit suites pass. There is **no FAIL**. One clause is partly covered: S-19 says "or times out", and there is no timeout path (F-1). The other four WARNs are document hygiene (F-3 to F-6).

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/prms-pending-review-lock` |
| Branch / HEAD | `fix/prevent-prms-resubmission-during-active-review` @ `f0aa46df0` (unpushed) |
| Diff audited | `265d639eb..HEAD`, 30 code files |
| Date | 2026-11-19 |
| Auditors | **Conformance (Phases 4–6):** a fresh Claude Opus `akili-reviewer`, read-only. **Build and test runs (Phase 3):** the session (Claude Opus 5.5). The implementer was Grok, so author ≠ auditor holds |
| Inputs | proposal, requirements, design (with the 2026-11-19 amendments), tasks, execution, judgment. There is no `test-report.md`, so coverage was verified directly |

## 2. Summary

| Area | Result |
| --- | --- |
| Task completion | PASS, 5 of 5 |
| File existence | PASS |
| Build integrity | PASS |
| Requirement coverage | PASS. One WARN: F-1, the S-19 timeout clause |
| Design conformance | PASS. Every DD-1…DD-9 and §5.x item matches, and both amendments are recorded |
| Cross-document figures | WARN on F-3 to F-6 (documents only) |
| Constitution and quality | PASS. Advisories are listed in §7 |
| Remediation items | 5 WARN, 0 FAIL |

## 3. Task Completion

| Task | Status | Evidence | Result |
| --- | --- | --- | --- |
| T-01 Pure rule, reader, SQL fixture | `[x]` | `c3851a247`. Re-run by a non-author: VERIFIED. Reviewer: PASS | PASS |
| T-02 Gate entry, typed refusal | `[x]` | `95c9c89dc`. VERIFIED. Reviewer: PASS | PASS |
| T-03 GET `pushYear` + `push_status` | `[x]` | `d562c1f7e`. VERIFIED. Reviewer: PASS | PASS |
| T-04 Version-selector warning | `[x]` | `1d4e5e7d3`. VERIFIED. Reviewer: PASS. Owner HITL approved | PASS |
| T-05 Sidebar lock + HITL | `[x]` | `1d4e5e7d3`, `f0aa46df0`. VERIFIED. Reviewer: PASS. Owner HITL steps 1–4 quoted | PASS |

## 4. File Existence

All 14 paths in design §2.1 exist and carry the described change. The fixture `test/fixtures/prms-push-status.fixture-spec.ts` (band 901000–901009) is collected by `test:fixtures`. Files outside §2.1 are test-only: the TIP service spec and 3 integration specs whose only change is a constructor argument. All of them are listed in `execution.md`. **PASS.**

## 5. Build Integrity

Commands run at validation on HEAD `f0aa46df0`:

| Package | Command | Result |
| --- | --- | --- |
| server | `npm run build` | exit 0 |
| server | `npx eslint <21 changed files>` | exit 0 |
| server | `npm test -- --silent` (full) | 459 of 459 suites, 4815 of 4815 tests |
| server | `npm run test:fixtures -- prms-push-status` (disposable TEST MySQL :3307) | 7 of 7 |
| server | `npm run test:integration -- prms-platform-identity tip-prms-push result-prms-sync-claim-concurrency` | 2 suites pass. `claim-concurrency` fails 3 tests with `Unknown column 'result_id'`. That failure predates this spec (stale TEST schema, A-9) |
| client | `npm test -- --silent` (full) | 379 of 380 suites, 8930 of 8930 tests. `pool-funding-flags.service.spec.ts` failed with zero failed tests, then passed 5 of 5 on its own: the flaky-runner signature |
| client | `npm run lint -- --quiet` | exit 0 |
| client | `npx tsc -p tsconfig.app.json --noEmit` | exit 0 |
| client | `npx tsc -p tsconfig.spec.json --noEmit` | touched files: 20 errors in the sidebar spec and 6 in `api.service.spec.ts`. These are the same as the recorded baseline (`execution.md`, T-04 and T-05), and none is new |

**What these checks cannot reach (KZ-017):**
- jsdom paints nothing, so styling and focus were checked only by the owner HITL.
- Swagger was checked through decorator metadata, not by opening `/swagger`.
- The claim-concurrency integration test gives no evidence until the TEST bootstrap is fixed.

## 6. Requirement Coverage

The full clause-level table, with file:line references, is in the auditor's report. It is summarised here:

| Requirement | Scenarios / clauses | Task | Result |
| --- | --- | --- | --- |
| R-PRL-001 push status from history | S-1…S-6, S-26, S-27. Includes the BUTs *must NOT order by timestamps*, *must NOT read `result_status_id`/`is_synced_to_prms`/log*, *not the live row's year*, *imported must NOT outrank real* | T-01 | PASS |
| R-PRL-002 server gate | S-7…S-10. Includes *no Normalizer call*, *must NOT write a log row*, and *AND IT MUST apply to every role and to TIP* | T-02 | PASS |
| R-PRL-003 GET `pushYear` | S-11, S-12, and the "no version" half of S-4. Guards unchanged | T-03 | PASS |
| R-PRL-004 update warning | S-13…S-18 and S-20: PASS. **S-19: WARN (F-1)** | T-04 | PASS with WARN |
| R-PRL-005 sidebar lock | S-21…S-25 | T-05 | PASS |
| NFR-PRL-001 at most one GET | counted in the S-20 deferred test | T-04 | PASS |
| NFR-PRL-002 a11y | specs, plus HITL steps 3–4 confirmed by the owner | T-04/T-05 | PASS (advisories A-11, A-12) |
| NFR-PRL-003 client cannot override | fail-closed read, falsifier observed | T-02 | PASS |
| NFR-PRL-004 one rule | one `derivePrmsPushStatus`. The client has 0 `event_source`/`decision` reads | T-01/04/05 | PASS |

**HITL on Dev (owner, 2026-11-19).**
- Approved on result 698.
- One apparent mismatch came up: the card showed REJECTED while the warning said pending. It was traced, read-only, to local-timezone `occurred_at` data and not to code. The owner corrected the data.
- The rule orders by `id`, so timestamps cannot affect it.

## 7. Linting & Code Quality

The constitution checks all pass:
- the envelope is used on every path;
- no `/v1` route;
- Swagger decorators are present;
- the auth guards are unchanged, and there is no role bypass;
- no migration;
- no `console.*` on the server;
- the client uses `ApiService` only, signals, and no new hex literal.

**4R advisories (advisory only; they never gate).**

From earlier tasks:

| ID | Lens | Finding |
| --- | --- | --- |
| A-2 | Reliability | No test covers the `correlation_outcome = 'CORRELATED'` predicate (`prms-push-status.reader.ts:30`). Seed a `NO_REFERENCE` REJECT in a spare fixture slot |
| A-3 | Readability | `statusOf` maps any non-APPROVE decision to `rejected`. This is safe only because `decides()` filters first |
| A-4 | Reliability | No test pins the 503 `feature_enabled` response, which now carries `data` |
| A-5 | Readability | `entryId` is typed `string` with `?? ''` instead of the `SyncGateEntryId` union, and one fallback can never run |
| A-6 | Risk | A NULL `report_year_id` reads as year 0, which gives `never_pushed` |
| A-7 | Readability | There are 5 module-local copies of `platformCodeOf` |
| A-8 | Risk (KZ-017) | Swagger is checked through decorator metadata only |
| A-9 | Reliability | The TEST bootstrap breaks at `CreatePiDelegates1787600000000` (errno 3780). This is outside the spec |
| A-10 | Readability | `#409acd` on the *Update result* span was moved, not added |
| A-11 | a11y | The *Update result* `<span>` has no `tabindex`/`role="button"`, so `aria-busy` never reaches assistive tech. This predates the spec |
| A-12 | a11y | The held reason is a tooltip on a native `disabled` button, which cannot take focus. The existing tooltips use the same pattern |
| A-13 | Reliability | The `successfulRequest: false` fail-open branch is untested |
| A-14 | Readability | The `isPrmsResubmittableGate` fallback, the broadened sidebar `beforeEach`, and the S-22/S-24 fixture years |

New from this audit:

| ID | Lens | Finding |
| --- | --- | --- |
| A-1 | Readability | Swagger has three gaps: the POST 409 description doesn't mention the "not resubmittable" refusal; `pushYear` has no `type`/description; the GET declares no 400 response |
| A-15 | Risk / perf | The sidebar sends one extra GET on every result view and version change, even when the PRMS block is hidden or the user is not the owner (then `ResultOwnerGuard` refuses it). Whether that shows an error toast was not verified |
| A-16 | Resilience | The gate is fail-closed (accepted in design §5.2). An outage reading history blocks every PRMS push, including the TIP cron |

## 8. Design Conformance

The following all match the code:
- §5.1.1 to §5.1.7: the rule, the event year, the relevant rows, the order and `PUSH_EVENTS_SQL`;
- §5.2: the gate entry, its position, `persistsRow:false`, fail-closed, and the verbatim descriptions;
- §4 GET and POST;
- §5.3: the client flow and the busy state;
- §5.4: the sidebar;
- DD-1…DD-9.

The intentional drift consists of two design amendments (§5.1.1 widens `decision`; §4 POST adds the typed refusal for every no-row gate entry) and one tasks amendment. All three are recorded in `execution.md`. The proposal's intent and non-goals hold: there is no override, and no new PRMS call. **PASS.**

## 9. Test Evidence Summary

No `test-report.md` exists, so the evidence comes from `execution.md` and the validation runs above.

| Kind | Evidence |
| --- | --- |
| Red-first | Observed and quoted for T-01 to T-05 |
| Falsifiers | Observed red and reverted. T-01: (a) and (b). T-02: (a) and (b). T-03: year. T-04: (a) guard and (b) year. T-05: (a) precedence and (b) reset |
| Unit | Full server suite: 4815 tests. Full client suite: 8930 tests |
| SQL | The fixture runs on real MySQL: 7 of 7 |
| HITL | Owner on Dev: steps 1–4 approved. Step 5 was not run (optional) |

## 10. Agent Guide / Constitution Impact

`execution.md` has no `## Constitution Impact` notes. No module was created, and no public surface changed beyond the additive `push_status` and `gate_entry_id`. There is nothing for the guides. **PASS.**

## 11. Remediation

| ID | Level | Finding | Proposed fix |
| --- | --- | --- | --- |
| F-1 | WARN | S-19 says *"the push-status request fails **or times out**"*. `checkThenSubmit` has no client timeout (`version-selector.component.ts:269`), so a hung GET keeps *Update result* busy until the browser or proxy errors. No test covers it | **Pick one:** (a) add `timeout()` to this call, with a test (a worker task); or (b) narrow the S-19 clause to "fails" and accept the browser timeout |
| F-3 | WARN | The clause *"AND IT MUST apply to every caller and role, `SYSTEM_ADMIN` included, and to the TIP sync origin"* is in **S-10**, but `tasks.md` §2 (rows 43–44) and `design.md:238` label it **S-7** | Relabel to S-10 (docs only) |
| F-4 | WARN | `execution.md` gives two different T-01 LOC figures (190/520 vs 163/514). "662 code lines" matches neither sum | Add one corrected line to the T-01 totals (docs only) |
| F-5 | WARN | `execution.md:333` T-05 still says "stays open (not `[x]`) … uncommitted" | Update it to done, committed in `1d4e5e7d3` (docs only) |
| F-6 | WARN | The status fields are stale: requirements say `draft` with the sign-off unchecked; design says `draft`; tasks say `in-progress` | Set them to approved/done. The sign-off is the owner's to tick |

### Remediation outcome (2026-11-19)

| ID | Outcome |
| --- | --- |
| F-1 | **Fixed.** `checkThenSubmit` races the read against 10 s. Two tests (hung read; late response) with red-first and three falsifiers. Reviewer PASS; evidence re-run VERIFIED. See `execution.md` → *Validation remediation* |
| F-3 | Fixed: relabelled to S-10 in `tasks.md` and `design.md` |
| F-4 | Fixed: T-01 measured at 163 production / 514 test lines (`c3851a247`) |
| F-5 | Fixed: the T-05 status note is updated |
| F-6 | Fixed: status fields set. **The requirements sign-off checkboxes stay with the owner** |

## 12. Archive Readiness Recommendation

**Ready to archive.** All five WARNs are resolved, and the F-1 code is committed after the owner's check. The advisories never gate. A-2, A-11 and A-15 are the ones worth a follow-up.

```text
/akili-archive changes/prms-pending-review-lock
```
