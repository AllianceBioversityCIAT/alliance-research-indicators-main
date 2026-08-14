# Test Report — Results / CapDev Bulk Upload Notification

## 1. Document Control

- **Spec path:** `docs/specs/results/capdev-bulk-upload-notification`
- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Module / package:** `results` (implementation in `ai-reports`) — **server** (`server/researchindicators`)
- **Branch:** `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics`
- **Phase:** `/akili-test`, run after execution closed 12/12
- **Leader:** Claude Opus 5 (T1) · **Tester:** one worker via `.claude/agents/akili-tester.md`, **model overridden to `opus`** (see Summary → *Leader deviations*)
- **Date:** 2026-08-11

---

## 2. Summary

**Overall status: `PASS`. No product defect found.**

The shipped suite was already strong — 12 tasks, every one on a Reviewer PASS, at a ~1:1 test-to-production ratio. The audit's value was not in raising the count but in a single question asked of every acceptance criterion: *would this test fail if the behavior broke?* For **six** ACs and negative-constraint clauses, the answer was no. Each was proven ungated by mutation, closed, and re-proven red under the same mutation.

| Signal | Baseline | After audit |
| --- | --- | --- |
| Unit tests | 2,196 / 328 suites | **2,214 / 328 suites** (+18) |
| E2E tests | 4 / 2 suites | **4 / 2 suites** (unchanged) |
| Production files touched | — | **0** |
| Global coverage (floor 60 all four) | not measured | **83.97 / 75.03 / 85.15 / 83.99** — no breach |
| `PRODUCT_BUG` findings | — | **0** |

### The root cause behind all six gaps

Every one shared a shape. Multi-group `dispatch()` fixtures were built from `makeMetricsRow(id)` with **identical defaults** (`trainings_count: 5`) and identical PI/RA fixtures. Group A and group B were indistinguishable, so per-group scoping had no observable consequence, and a batch-wide regression rendered output identical to the correct one. The tests were not wrong; the fixture could not express the difference they asserted.

The fix was one fixture with genuinely distinct groups — 5/2/7 trainings, distinct PIs, distinct RAs, contract-scoped contacts.

> This is a near-relative of **KZ-001** (*a test double that doesn't render what it stands in for*) but not the same lesson. KZ-001 is about a **double's fidelity**; this is about a **fixture's discriminating power**. A perfectly faithful double fed undifferentiated data still proves nothing about scoping. Recommended for the Kaizen log at `/akili-archive`.

### Suites run

| Suite | Deployment | Result |
| --- | --- | --- |
| backend-unit | Delegated (1 Tester) | PASS — 2,214 |
| backend-e2e | Same Tester (shares the package's jest, `node_modules`, build output — a second worker would contend) | PASS — 4 |
| frontend-unit | **N/A, not a gap** — `design.md` §7: *"None. No client change."* | — |
| Coverage measurement | **Leader inline** — one command; the Deployment Rule says don't delegate trivial work | PASS |

One Tester, not parallel. All suites live in one package, which is the same constraint that forced execution to serialize.

### Leader deviations, recorded

| Deviation | Reason |
| --- | --- |
| Tester on **`opus`**, not the wrapper's T2 `sonnet` | The Implementer ran on `sonnet`; spawning the Tester there would collapse `author ≠ tester` at the one gate whose purpose is catching what the author's loop missed. The work is audit-shaped, closer to T3 than T2 — a tier escalation, not a `max`-a-cheaper-tier violation. |
| Added **`error-handling-patterns`** to the skill set | Most of this matrix is failure paths. |

### Verification, on the Leader's own runs

`npm test -- --silent` → **2,214 / 2,214, 328 suites**. `npm run test:e2e` → **4 / 4, 2 suites**. `npm run lint -- --quiet` → clean, `git status` re-checked after (`--fix` touched nothing beyond the 3 spec files).

---

## 3. Mutation evidence

The audit's standard of proof, inherited from execution: a coverage claim is settled by breaking the behavior and watching a test go red — not by reading the test. Every mutation was reverted individually with `git status` verified clean before the next.

| # | Mutation | Before the fill | After |
| --- | --- | --- | --- |
| M1 | per-group metrics → batch-wide sum | **green** (116/116) | RED |
| M2 | `totalCapdevResults +=` → `=` (last group wins) | **green** | RED |
| M3 | drop the file-contact `contract_code` filter | red in builder spec, **green at `dispatch()`** | RED in both |
| M4 | memoise the kill-switch flag on the instance | **green** | RED |
| M5 | `agreementId: group…` → `groups[0]…` | RED — already gated | — |
| M6 | PI falls back to RA/PA email | **green** | RED |
| M7 | add `traineeNames: [...]` to template data | **green** | RED |
| M8 | info log emits addresses instead of counts | RED — already gated | — |
| M9 | remove `@ApiProperty` from `contacts` | **green** | RED |

### The two worth reading twice

**M6 — R-CBU-003's data-protection clause was ungated.** The scenario says *"BUT it must NOT promote a CC recipient into the `To` slot."* Every existing unresolvable-PI fixture left `ra`, `pa`, and contacts **empty** — so a coalescing regression had nothing to coalesce onto and passed. A one-line `||` fallback would have shipped green and mailed project data to the wrong person. This is the audit's most valuable finding.

**M7 — the NFR-CBU-003 assertion was string-shaped, not contract-shaped.** The shipped test checks for the literal `trainee_name`; a leak named `traineeNames` sails past it. The substitute pins the template's token set **and** the Handlebars data object's key set as a closed aggregate contract, so any future participant-level slot goes red regardless of what it is called.

---

## 4. Backend unit tests

18 tests added across 3 spec files. No production file touched.

| File | Added | Closes |
| --- | --- | --- |
| `capdev-bulk-notification.service.spec.ts` | +13 | R-CBU-002 AC.2 + cross-project scenario, R-CBU-006 AC.6, R-CBU-008 AC.1, R-CBU-009 AC.3, R-CBU-011 AC.1/AC.2, R-CBU-004 AC.2/AC.6, NFR-CBU-003 substitute |
| `capdev-recipients.builder.spec.ts` | +3 | R-CBU-003 AC.3 + the `must NOT promote CC→To` clause |
| `result-ai.dto.spec.ts` | +2 | R-CBU-005 AC.5 (Swagger documents `contacts`) |

---

## 5. Frontend unit tests

**Not applicable — and this is a design decision, not a gap.** `design.md` §7 states: *"None. No client change. The email links to the existing `results-center` route; nothing in `client/research-indicators` is touched by this spec."* The only human-facing surface is the email body, whose correctness gate is human (defect class D7 — see A6).

---

## 6. Integration tests

No separate integration suite. Cross-module behavior is proven at two boundaries instead:

- **Service-level integration** — tests that drive the real `dispatch()` → `buildRecipients` → `formatCapdevMetrics` → `sendGroupNotification` chain without stubbing the middle, including the real Handlebars template. These carry the per-group scoping proofs (M1, M3, M6).
- **HTTP-level** — the e2e suite below.

The DB-less constraint recorded in `design.md` §14.1 is why: every SQL claim is proven twice, structurally against the QueryBuilder and behaviorally against an extracted pure mapper, rather than once against a live database.

---

## 7. E2E tests

`test/results-ai-formalize-bulk.e2e-spec.ts` (3) + `test/app.e2e-spec.ts` (1) — **4/4 passing**, process exits.

Covers R-CBU-005 AC.1 (legacy payload without `metadata.contacts` → 201), AC.2 (valid contact reaches `EmailBody.cc` through the real chain), AC.4 (malformed contact → 400 in the `GlobalExceptions` envelope, batch not persisted).

No database is touched — `SetUpInterceptor` short-circuits before any query, so zero reads and zero writes reach the shared dev MySQL.

### ⚠️ Latent harness flake — diagnosed, not fixed

**The Tester saw `test:e2e` fail 4/4 twice mid-session, then pass consistently afterwards.** It chased this to root cause rather than dismissing it as noise, and the diagnosis is sound:

- The visible error (`Cannot read properties of undefined (reading 'mockClear')`) is a **cascade**, not the cause. The real failure is `Exceeded timeout of 5000 ms for a hook` in `beforeAll`.
- `test/jest-e2e.json` sets **no `testTimeout`**, so Jest's 5,000 ms default applies. The suite's own comment records `AppModule` boot at **~3.6 s** — a 1.4 s margin.
- Measured boot under concurrent load: **78.5 s**. External dependencies were all fast at the time (MySQL TCP 34 ms, CLARISA 161 ms, OpenSearch 260 ms), so this is compile time plus contention, not network.
- Raising only the timeout (`--testTimeout=240000`, nothing else changed) made all 4 pass — the logic is sound.

**Not caused by this spec.** Reproduced on a pristine tree with the audit's edits stashed, and it also hit `app.e2e-spec.ts`, which this spec never touches. The Leader's own gate run passed in 5.3 s on a quiet tree, which is consistent with a load-dependent failure rather than a contradiction of it.

**Remediation is one line** — `"testTimeout": 120000` in `test/jest-e2e.json`. Deliberately **not applied**: framework config is out of scope for `/akili-test` by rule, and this file carries the load-bearing `forceExit` from T-11. See §9 R1 — it is a spec-owner decision.

---

## 8. Coverage & traceability

### Coverage — NFR-CBU-004 discharged by measurement

Measured by the Leader inline (`npm run test:cov`), replacing the inference recorded at the T-12 gate.

| Scope | Stmts | Branch | Funcs | Lines |
| --- | --- | --- | --- | --- |
| **Global** (floor 60 on all four) | **83.97** | **75.03** | **85.15** | **83.99** |
| `ai-reports/notifications` | 98.29 | 81.69 | 98.27 | 98.50 |
| `capdev-metrics.formatter.ts` | 100 | 100 | 100 | 100 |
| `capdev-recipients.builder.ts` | 100 | 88 | 100 | 100 |
| `capdev-bulk-notification.service.ts` | 97.05 | 79.31 | 94.44 | 96.89 |
| `capdev-bulk-notification.repository.ts` | 98.68 | 68.57 | 100 | 100 |
| `notifications/dto/*` | 0 | 100 | 100 | 0 |

**No threshold breach.** Two apparent anomalies were investigated and both are correct as they stand:

- **Repository 68.57% branch** — the uncovered arms are defensive coercion guards: `toNullableNumber`'s `''`/`NaN` arms, `toNullableDate`'s invalid-date arm, `mapStaffPerson`'s null-carnet arm, `mapTokenOwner`. **None corresponds to an acceptance criterion**, and their behavioral outcomes (`0` not `NaN`, `null` not `Invalid Date`, null person objects) are all asserted. The uncovered branches are the redundant halves of guards whose live halves are tested. Not worth chasing.
- **DTO folder 0%** — **inert and expected.** `capdev-bulk-group.dto.ts` and `capdev-bulk-email-template.dto.ts` are pure type declarations: property signatures only, no decorators, no constructors, no methods. TypeScript emits a class shell whose body never executes. The contrast that proves the rule is `result-ai.dto.ts`, which *does* carry `class-validator`/`@ApiProperty` decorators with genuine runtime behavior — and that one got tests (R-CBU-005 AC.5, gap M9).

### Requirement-to-test matrix

`[NEW]` = added by this audit. File abbreviations: `svc` = `capdev-bulk-notification.service.spec.ts` · `bld` = `capdev-recipients.builder.spec.ts` · `fmt` = `capdev-metrics.formatter.spec.ts` · `repo` = `capdev-bulk-notification.repository.spec.ts` · `rsvc` = `results.service.spec.ts` · `e2e` = `test/results-ai-formalize-bulk.e2e-spec.ts`.

| Req · AC | Type | Test | Result |
| --- | --- | --- | --- |
| **001** AC.1 one email/group | unit | `svc::3 distinct contracts → 3 sendEmail` **[NEW]** | PASS |
| 001 AC.2 all errored → none | unit | `svc::zero CapDev results…SKIPPED`; `repo::STRUCTURAL excludes errored` | PASS (structural) |
| 001 AC.3 non-CapDev → none | unit | `repo::STRUCTURAL binds CapDev filter from enum` | PASS (structural) |
| 001 AC.4 payload byte-identical | unit + e2e | `rsvc::pre-change shape`; `e2e::AC.1 Legacy caller` | PASS |
| 001 Scenario happy path | unit | `svc::renders the real template…correct subject`; `svc::AC.6 same-run` | PASS |
| **002** AC.1 3 contracts → 3 sends | unit | `svc::…3 sendEmail calls` **[NEW]** | PASS (M1/M5) |
| 002 AC.2 own counts only | unit | `svc::each group's rendered body reports that group's own training count` **[NEW]** | **was GAP (M1)** |
| 002 AC.3 unattributed excluded + warn | unit | `svc::logs the unattributed result_id list`; `repo::BEHAVIORAL returns result_id list` | PASS — see A2 |
| 002 Scenario cross-project `BUT` | unit | `svc::no group's PI or RA appears in another group's to or cc` **[NEW]** | **was GAP (M3)** |
| 002 Scenario `IT MUST` subject token | unit | `svc::…3 sendEmail calls` (subject-keyed lookup) **[NEW]** | PASS (M5) |
| **003** AC.1 `To == [pi]` | unit | `bld::PI who is also the RA appears exactly once`; `svc::cross-project` **[NEW]** | PASS |
| 003 AC.2 no staff row → skip + warn | unit | `bld::no staff row returns null`; `svc::unresolvable PI skips only that group` | PASS |
| 003 AC.3 null/blank email | unit | `bld::missing PI address`; `bld::whitespace-only PI address` **[NEW]** | PASS |
| 003 AC.4 cleaned name wins | unit | `bld::tier 1 wins over tier 2` | PASS |
| 003 Scenario `BUT must NOT promote CC→To` | unit | `bld::returns null even when every CC source has a usable address` **[NEW]**; `bld::malformed PI address` **[NEW]**; `svc::Unresolvable PI (integration)` **[NEW]** | **was GAP (M6)** |
| 003 Scenario `MUST NOT abort other groups` | unit | `svc::Unresolvable PI (integration)` **[NEW]** + existing PARTIAL test | PASS |
| **004** AC.1–AC.4 | unit | `bld::` sanitisation suite; `svc::T-12 dropped recipient` | PASS |
| 004 AC.5 SPRM survives | unit | `bld::every optional source absent`; `svc::AC.6 remaining CC sources` **[NEW]** | PASS |
| 004 AC.6 `CC_EMAIL` absent → still sends | unit | `svc::AC.6 with the CC_EMAIL row absent, still sent` **[NEW]** | **was thin** |
| 004 AC.2 cross-source dedupe at dispatch | unit | `svc::configured CC and SPRM same address → one entry` **[NEW]** | PASS |
| **005** AC.1 / AC.2 / AC.4 | e2e | `e2e::AC.1`, `e2e::AC.2`, `e2e::AC.4` | PASS |
| 005 AC.3 contract scoping | unit | `bld::contract-scoped`; `svc::AC.3 (integration)` **[NEW]** | PASS (M3) |
| 005 AC.5 Swagger documents `contacts` | unit | `result-ai.dto.spec::Swagger model metadata` ×2 **[NEW]** | **was GAP (M9)** |
| **006** AC.1–AC.5, AC.7, AC.8 | unit | `fmt::` 25-test suite (incl. `<1%` floor, `[0.5,1)` boundary, half-range) | PASS |
| 006 AC.6 group not batch | unit | `svc::own training count` **[NEW]** | **was GAP (M1)** |
| 006 Scenario degenerate + `BUT NOT` | unit | `fmt::Degenerate metrics`; `svc::OD-1 across multiple countries` | PASS |
| **007** AC.1–AC.5 | unit | `svc::` happy path, `NO_TEMPLATE` ×2, token-owner fallback | PASS |
| 007 AC.6 migration additive / `down()` | — | code review + `capdev-bulk-summary.template.spec.ts` byte-equality | **A1** |
| **008** AC.1 sum of per-group counts | unit | `svc::persisted total_capdev_results is the SUM` **[NEW]** | **was GAP (M2)** |
| 008 AC.2 / AC.3 / AC.4 | unit | `svc::zero CapDev…SKIPPED`; `group 1 throws…PARTIAL`; `deriveNotificationStatus` table | PASS |
| 008 AC.5 existing rows unaffected | unit | `bulk-upload-processes.entity.spec::nullable with no default` ×9 | PASS (entity); DB-level = **A1** |
| 008 AC.6 stored == emailed | unit | `svc::AC.6 …no sendGroupNotification stub` | PASS |
| **009** AC.1 flag off | unit | `svc::Disqualifies-guard flag false`; `svc::metrics still persisted on flag-off` **[NEW]** | PASS |
| 009 AC.2 row absent | unit | `svc::flag row absent`; `env-app-config.util.spec` | PASS |
| 009 AC.3 flip between runs | unit | `svc::flag flipped between two bulk runs…never memoised` **[NEW]** | **was GAP (M4)** |
| **010** AC.1 / AC.4 / AC.5 | unit | `rsvc::` outer-boundary suite (5 tests) | PASS |
| 010 AC.2 per-group isolation | unit | `svc::mode 1 (send throws)`; `svc::mode 3 (template query throws)` | PASS |
| 010 AC.3 batch-wide at outer boundary | unit | `svc::mode 2 (metric query throws)`; `rsvc::exactly one ERROR-level line` | PASS — per **D-T12-a** |
| 010 Scenario broker down | unit | `svc::T-12 RabbitMQ unreachable` | PASS |
| **011** AC.1 3 groups → 3 info logs | unit | `svc::a 3-group batch produces 3 info logs` **[NEW]** | **was 1-group only** |
| 011 AC.2 no address at info | unit | `svc::none carrying an email address` **[NEW]** + existing | PASS (M8) |
| 011 AC.3 skipped distinguishable | unit | `svc::reason=NO_PI`; `cause=TEMPLATE_QUERY_ERROR` vs `_MISSING_OR_INACTIVE` | PASS |
| **NFR-001** O(groups) | unit | `repo::query count is O(groups)` ×4 | PASS (count); timing = **A3** |
| **NFR-002** no duplicate per process | — | structural + documented limitation | **A4** |
| **NFR-003** no address at info | unit | `svc::` info-log assertions | PASS |
| NFR-003 no `trainee_name` values | unit | `svc::closed aggregate contract` ×2 **[NEW]** | **substitute PASS (M7)** — see A5 |
| **NFR-004** coverage ≥ 60% | — | Leader-measured, no breach | PASS |
| **NFR-005** migration safety | unit | entity spec + code review | partial → **A1** |

---

## 9. Remediation

| ID | Item | Owner | Status |
| --- | --- | --- | --- |
| **R1** | `test/jest-e2e.json` has no `testTimeout`, so Jest's 5,000 ms default governs a `beforeAll` that boots `AppModule` in ~3.6 s quiet and **78.5 s under load**. Fix is one line: `"testTimeout": 120000`. | Spec owner | **Applied 2026-08-11 on the spec owner's decision — ⚠️ verification OWED.** See R1a. |
| **R1a** | **The R1 fix is committed but never observed green.** Every attempt to re-run `test:e2e` after applying it hit a dev-MySQL outage (`connect ETIMEDOUT` → `Unable to connect to the database. Retrying (1..9)`), so the suite reported `2 failed / 0 tests` for environmental reasons. **Re-run `npm run test:e2e` with the VPN up and confirm 4/4 before merge.** The last green e2e run (4/4, 5.3 s) was on the Leader's gate **before** this edit. | Spec owner | **CLOSED 2026-08-11 by `/akili-validate`.** Dev MySQL reachable (TCP probe to `192.168.20.210:3306`), then `npm run test:e2e` → **2 suites / 4 tests passed, 5.175 s, exit 0**, with the R1 edit in place. The fix is now observed green rather than merely committed. See `validation-report.md` §5. |
| **R1b** | **Trade-off discovered while attempting R1a, not known when R1 was decided.** Raising the timeout raises the cost of an *environment* failure from ~6 s to **471 s** (~8 min) per run, because the suite now waits instead of failing fast. TypeORM's own retry policy (10 attempts × ~13 s ≈ 130 s) dominates that path — the `testTimeout` is not even the binding constraint during an outage, it merely stops truncating it. The fix remains justified for the load case it was chosen for; the fail-fast-on-outage concern is a separate lever (TypeORM `retryAttempts`) and out of this spec's scope. | Spec owner | Informational — revisit if CI outages become common |
| **R2** | Record the *fixture-discriminating-power* lesson in `docs/specs/kaizen-log.md` — distinct from KZ-001, and the single root cause of all six gaps found here. | `/akili-archive` | Open |
| **R3** | Spec LOC is now **6,205** (5,547 at execution close + 658 from this audit), against the ~5,600 re-baseline. The `/akili-execute` tripwire does not bind this phase, but the figure should be stated in the PR rather than discovered. | Spec owner | Informational |

No failing tests. No `PRODUCT_BUG`. Nothing blocks validation.

---

## 10. Accepted gaps

| ID | Gap | Why automation is impractical |
| --- | --- | --- |
| **A1** | R-CBU-007 AC.6, R-CBU-008 AC.5, NFR-CBU-005 — migration additive / `down()` reverses / existing rows unaffected | Needs `migration:run` + `migration:revert` against the **shared dev MySQL**, which is not disposable; destructive schema operations there are a human decision. `requirements.md` §7 already classes this **D5** (code review + manual run). Entity-level nullability *is* automated — 9 tests. Note **O-2 was waived on static review**, so the revert remains unrehearsed. |
| **A2** | R-CBU-002 AC.3 — live SQL→row shape for `findUnattributedResultIds` / `multiPrimaryWarnings` | Both returned empty on all five dev processes during O-6, so no live row ever exercised the mapping. Constructing one needs seeded CapDev results with a deliberately missing or duplicated primary contract — a write to shared dev, hence A1's constraint. **Mapping and alias *are* gated** by fixtures (`repo::BEHAVIORAL` drives the real `rows.map(toNumber)`); only the driver's column-name fidelity is not. |
| **A3** | NFR-CBU-001 timing (≤ 2 s for 100 results across ≤ 10 groups) | Query **count** is automated (4 tests proving O(groups), not O(results)). Wall-clock needs a timed run against dev with a realistic batch — a measurement, not an assertion, and inherently flaky as a CI gate. `requirements.md` itself specifies a "timed integration run", not a unit test. |
| **A4** | NFR-CBU-002 — one process never produces a second email set | Guaranteed structurally: `dispatch()` is called exactly once per process from `createResultFromAiBulk`, with no retry path inside it. A test would assert the absence of code that does not exist. The cross-process case (retry → new process row) is **accepted, not deduplicated**, per DD-7. |
| **A5** | NFR-CBU-003 — asserting the body excludes `trainee_name` **values** | Structurally unconstructible: no DTO on the path carries a participant-level field, so no fixture contains a value whose absence could be asserted. A **structural substitute** was built instead — closed template-token set, closed Handlebars data-key set, all-values-are-strings — mutation-proven at M7 to catch the leak the literal test was meant to catch. The intent is discharged; the literal clause is not. |
| **A6** | D7 (copy, tone, mail-client rendering) and D8 (wrong real person via bad Agresso data) | Already recorded as unautomatable in `requirements.md` §7, with HITL substitutes: a real send to an internal address, and a dry run with redirected recipients. **Still owed before rollout** — no automated gate exists or can exist. |
| **A7** | `notification_status` stays `NULL` when a batch read rejects | Uncovered **by design**. A recorded limitation in `design.md` §6.6, not a defect; no AC specifies it, so no test asserts it. Authoring one would invent a requirement. |

---

## 11. What this phase did not change

No production code was touched. No requirement was reinterpreted. No failing test was rewritten to pass. The spec's behavior at the end of `/akili-test` is byte-identical to its behavior at the end of `/akili-execute` — only the evidence about that behavior improved.
