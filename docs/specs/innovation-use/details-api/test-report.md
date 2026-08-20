# Test Report — Results (Innovation Use) / Details API

> **Overall: FAIL — 5 unresolved failures. Superseded by `validation-report.md` (2026-08-20).** Originally issued as *PASS with 6 recorded gaps*; both the verdict and the count were wrong. There are **7** gaps, not 6 — the enumeration below always ran G-1…G-7 while three headings said "6", in a document whose own thesis is that counts must be grepped rather than asserted. And `/akili-validate` found a **second, un-gated variant** of G-1 that falsifies four ACs this report marked ✅. Retained as a point-in-time record; read `validation-report.md` for the current verdict. Original summary followed: PASS with 6 recorded gaps — one of which is a confirmed product defect and one of which needs a human.** No test was rewritten to hide a failure. Every gap below is a decision with a reason, not an omission.

- **Module:** results (`innovation-use`) · **Spec id:** 2026-08-innovation-use-details-api
- **Spec path:** `docs/specs/innovation-use/details-api/`
- **Parent spec:** [`../family.md`](../family.md) — chunk 2 of 3
- **Package:** `server/researchindicators` (server-only chunk)
- **Branch:** `AC-1679-Create-the-innovation-use-section`
- **Report date:** 2026-08-20

---

## Document Control

| Field | Value |
| --- | --- |
| Overall status | ⚠️ **SUPERSEDED — see `validation-report.md`.** Issued as PASS with 6 gaps; actually **7** gaps and **FAIL** |
| Suites in scope | 3 of 4 — backend unit, integration/fixtures, **E2E blocked (see gap G-3)**; frontend N/A |
| Testers spawned | **1** (integration/fixture tier). The other suites were **cited, not re-authored** |
| Backend unit | ⏳ **figures pending the closing run** — deliberately not restated here. This line has been stale twice (2264 → 2275 → changing again with the FAIL-B fix in flight). Per both auditors' recommendation, all figures are to be derived from **one** run that closes validation and recorded in this document and `tasks.md` §7 together |
| Integration (fixtures) | **14 suites / 54 tests** — all green, on **two consecutive runs** |
| Coverage | 89.69 statements · 75.61 branches · 85.13 functions · 89.14 lines — all ≥ the 60% floor |
| Product defects found | **1 — `R-IUA-009 AC.3`, FIXED 2026-08-20** (option A). Plus a **second variant** `/akili-validate` found un-gated (same-result cross-role), fixed by the same change. Both quarantine markers inverted to passing; **zero `it.failing` remain**. ⚠️ **`customSaveInnovationDev` deliberately retains the defect** — the platform exposure is now *asymmetric* and needs its own ticket |
| Gaps requiring a human | **1** — the `/swagger` observation (`R-IUA-013 AC.3`) |

---

## Summary

**This run authored very little and verified a great deal, deliberately.** The spec's test suites were written during `/akili-execute` — 336 unit suites across T-01…T-08, and five real-MySQL fixtures (F-A…F-E) across T-09…T-13. This command's own rule is to **cite, not rewrite** author-produced coverage; duplicating it would be waste paid on every future test run. So one Tester was spawned, with its entire budget aimed at **two properties that three separate Reviewers had independently found unowned at every tier**.

| Suite | Disposition | Detail |
| --- | --- | --- |
| Backend unit | **Cited** | 336 suites / 2264 tests **repo-wide**; this spec authored **8** of those suite files (T-01…T-08) — the original wording "authored T-01…T-08" wrongly attributed the whole repo's suite count to this spec. `tdd` was assigned at T-08; its red→green files are cited, not rewritten |
| Integration / fixtures | **Cited + extended by 1 Tester** | F-A…F-E authored T-09…T-13 (49 tests). The Tester added **5 tests** closing the two unowned properties → 54 |
| Frontend unit | **N/A — not a gap** | `design.md` scopes this chunk **server-only**; the STAR client is chunk 3 (`details-page`). Recorded so the absence reads as a decision |
| E2E | **BLOCKED — gap G-3** | Infrastructure exists but cannot be used without writing to a **shared** database. See G-3 |

**Effort/skills selected by the Leader:** the one Tester ran at `high` with `nestjs-expert` + `systematic-debugging` — the latter because DD-14 turns on an operator distinction (`!== undefined` vs `??`) that a surface reading misses.

---

## The two properties this run closed

Both had been proven only over **mocked repositories**, and `design.md` §10.1 states that tier *"cannot prove … anything about actual persistence."* Both are now proven against real MySQL through the real service.

### DD-14 — the partial-PATCH contract

DD-14 requires validation to run against the **effective post-write row**, resolved as `key present ? payload : stored`, and is explicit that **the operator is `!== undefined`, not `??`** — because `??` treats an explicit `null` as absent and reopens the bypass DD-14 exists to close.

| Case | Expected | Result |
| --- | --- | --- |
| `{ innovation_use_level_explanation: null }` against a stored level 6 | rejected `400` | ✅ rejected; stored row unchanged |
| `{ …: '' }` | rejected `400` | ✅ rejected; row unchanged |
| `{ …: '   ' }` | rejected `400` | ✅ rejected; row unchanged |
| a PATCH **omitting** the key, changing an actor count | **accepted**, justification preserved | ✅ accepted |
| the same save, read back by raw SQL | stored explanation **byte-identical** | ✅ unchanged in the DB |

**The last two rows are the point.** Only they distinguish `!== undefined` from `??`; the three rejections alone would not have tested DD-14.

**The falsification is the strongest evidence in this spec.** Replacing `!== undefined` with `??` did not merely fail an assertion — **it reproduced the actual bypass**: the `null`-explanation PATCH was silently **accepted**, and because step 6's write does not skip an explicit `null` the way it skips `undefined`, **the stored justification was really nulled in the database**, cascading into the next tests' preconditions. That is the exact state `R-IUA-006` exists to prevent, demonstrated rather than argued. Reverted; `git diff -- src/` empty.

### T-08 advisory B-4 — that `create` honors its `manager`

`create(resultId, manager)` uses `selectManager` to prefer a passed transaction manager. Nothing proved it *used* it: T-08 proved it is passed, T-05's unit test calls `create(42)` with no manager, and T-12's F-E calls `createResultType` with two arguments so the manager is `undefined` and the transaction arm never runs — **F-E structurally cannot bind it**, which retires T-05's forward pointer naming F-E as its owner.

Closed with a rolled-back transaction: `create(id, m)` inside `dataSource.transaction`, forced rollback, then assert **no row survives**. ✅ Falsified by forcing `selectManager` to receive `undefined` — the row **survived the rollback** (`Received: { result_id: 35340 }` where `toBeUndefined()` was expected).

---

## Suites

### Backend unit — 336 suites / 2264 tests, green

Authored during execute; cited here. The mutation discipline is why they are credible rather than merely numerous: T-07 ran a **two-axis, 16-mutation** sweep (7 wiring + 9 DTO-rule); T-03 a 12-mutation sweep; T-04 M1–M9 **up front**, which is the change that turned T-03's three review rounds into T-04's one.

**What this tier structurally cannot prove** (`design.md` §10.1): anything about persistence, HTTP, auth, the envelope on the wire, or Swagger.

### Integration / fixtures — 14 suites / 54 tests, green on two consecutive runs

Real MySQL, scratch container at `127.0.0.1:3307`. The **double run is a gate, not a courtesy** — T-13's C-4 cleanup risked orphaning a `reporting_platforms` row that only a *second* run would collide with.

| Fixture | Proves |
| --- | --- |
| **F-A** section round trip *(+ this run's 5 tests)* | Save→read equality, edit preserving row id, selective removal soft-deleting **exactly** that row across all three collections, the four-way audit branch structure, `results.updated_at` advancing, NFR-IUA-001's query bound, **DD-14**, **B-4** |
| **F-B** role isolation | Innovation Dev rows byte-identical by whole-row `SELECT *` diff (ADR-11) across both saves, against a result deliberately holding **both** indicators' rows. **The 2 formerly-quarantined tests now pass**, plus a third for the cross-role variant — assertions 18 → 24 |
| **F-C** level boundary | The `id 6`/`id 7` discriminating pair in one test body against the real seeded catalog — the family's signature `id = level + 1` trap |
| **F-D** catalog order | Levels read `0…9`. **Declared weak on the record — see G-5** |
| **F-E** creation + green checks | Both child rows land, `created_by` from the acting user, the `innovation_use` key present for indicator 6 and absent for indicator 2 (exact 9-key set), `completness` **both ways** |

### Frontend unit — not applicable

`design.md` scopes this chunk server-only. The STAR client is chunk 3.

### E2E — blocked, see G-3

---

## Coverage & Traceability

| Requirement | Scenario / clause | Tier | Evidence | Result |
| --- | --- | --- | --- | --- |
| R-IUA-001 | detail row from creation; audit from `request.user` | unit + F-E | `results.service.spec.ts`; F-E | ✅ |
| R-IUA-002 | read the section; round-trips identically | unit + F-A | `result-innovation-use.service.spec.ts`; F-A | ✅ |
| R-IUA-002 AC.7 | `401` unauthenticated | unit (mechanism) | exclude-list assertion, **DD-16** | ⚠️ **G-4** — mechanism only |
| R-IUA-003 | atomic write; soft-delete; audit; `last_updated_date` | unit + F-A | T-06 suite; F-A | ✅ |
| R-IUA-004 | counts, exclusive modes, derived `total` | unit (pipe spec) | `result-innovation-use.controller.spec.ts` — **the only committed gate**, 27 cases | ✅ |
| R-IUA-005 | duplicate actor types rejected | unit | T-06 suite | ⚠️ **G-6** — one case's falsifier unrun |
| R-IUA-006 AC.1–AC.4 | level ≥ 6 justification; the off-by-one pair | unit + **F-C** | T-06 suite; F-C | ✅ |
| R-IUA-006 AC.5 / DD-14 | effective-row validation | unit + **F-A (this run)** | 5 new tests + the bypass-reproducing falsification | ✅ **closed this run** |
| R-IUA-007 AC.1–AC.3, AC.5 | organizations carry a count; removal soft-deletes | unit + F-A | T-04 suite; F-A | ✅ |
| R-IUA-007 **AC.4** | no Dev row read, **written** or deactivated | F-B | ✅ **CLOSED 2026-08-20** — the written half is protected by rejection-before-write; the guard's own `find` is role-scoped, so it reads no Dev row either | ✅ |
| R-IUA-008 | other quantitative measures | unit + F-A | T-05/T-06; F-A | ✅ |
| R-IUA-009 AC.1/AC.2 | role isolation | **F-B** | ✅ **CLOSED 2026-08-20** — `assertInnovationUseOwnership` rejects before any write; save #3 asserts the Dev row byte-identical after a payload carrying its id | ✅ |
| R-IUA-009 **AC.4** | *"every deactivate/update predicate names the role column"* | **F-B** | ⚠️ **NARROWED, not satisfied as written.** Every *deactivate* predicate names the role. The *id-present save*'s predicate is still the primary key — pre-validated against `(result_id, role)`, which is rejection-before-write rather than a role-bearing predicate. **Awaiting the user's ruling on amending the AC text** The id-present save path is PK-keyed, carries no `result_id`, and **assigns** the role rather than filtering by it. AC.4's "every predicate names the role column" is false there |
| R-IUA-009 **AC.3** | no cross-result write | **F-B** | 2 tests **`it.failing`** | ❌ **G-1 — PRODUCT DEFECT** |
| R-IUA-010 AC.3 | catalog order `0…9` | **F-D** | F-D green | ⚠️ **G-5** — cannot falsify |
| R-IUA-011 | IP Rights row; `completness` both ways | unit + **F-E** | F-E | ✅ |
| R-IUA-011 scenario | *"the submit transition is permitted"* | — | — | ⚠️ **G-2** — unowned |
| R-IUA-012 | green checks reflect the save; no push (DD-7) | unit + F-E | F-E | ✅ |
| R-IUA-013 AC.1/AC.2/AC.4/AC.5/AC.6/AC.7 | envelope, exceptions, decorators, registration, no `console`, audit | unit + F-A/F-E | T-07 suite; `entities.module.spec.ts` | ✅ |
| R-IUA-013 **AC.3** | Swagger surface | **human** | — | ❌ **G-7 — awaits the user** |
| NFR-IUA-001 | ≤ 5 queries at 50 actor rows | **F-A** | measured **exactly 5** with 52 active rows | ✅ at the ceiling |
| NFR-IUA-002 | fixtures collected & green from a fresh bootstrap | F-A…F-E | 54 tests, twice | ✅ |
| NFR-IUA-003 | coverage ≥ 60% | `test:cov` | 89.69/75.61/85.13/89.14 | ✅ |

**Negative constraints (`BUT it must NOT`) explicitly asserted:** no hard-delete (F-A, unfiltered id read-back) · no cross-role deactivation (F-B, 3 falsifications) · `total` not rejected when client-sent, and stripped (T-07 Case 9) · no `GreenChecksRepository` call on the write path (DD-7, grep = 0) · neither `innovation_use` nor `ip_rights` in `VISUAL_ONLY_GREEN_CHECKS` (F-E + grep) · no `@Roles` on the controller (DD-5) · level never resolved by FK or by name (F-C + grep).

---

## Gaps — all 7, with reasons *(the heading said "6"; the list always had seven)*

### G-1 · ✅ **CLOSED 2026-08-20** — was: `R-IUA-009 AC.3` is not satisfied by the product

A payload for result 1 submitting **result 2's row ids** overwrites result 2's rows. Reproduced against real MySQL: `actor_type_id` 900853→900854, `actors_count` 900882→900883 *(this report originally said `900893`, which is the **organization** row's post-value — two rows' sentinels conflated; `execution.md`, `tasks.md` and the fixture's own comment all say `900883`)*, **`result_id` still pointing at result 2**. Root cause: both hand-written id-present branches build their save payload from a **caller-supplied primary key with no `result_id` and no ownership check**. `result_quantifications` is structurally immune — `upsertByCompositeKeys` matches on the composite key scoped to the calling result and ignores a supplied id.

**Shared with `customSaveInnovationDev`** — pre-existing platform behaviour, not introduced by this spec.

**Held under `it.failing`, not `.skip`**, so the assertions still execute and turn **red the moment the defect is fixed**. A green suite therefore *positively proves* the defect is still open. **Remediation: options A (fix here) or D (its own spec) — the user's open decision.** Option C (narrow the AC) was declined.

### G-2 · `R-IUA-011`'s *"the submit transition is permitted"* — unowned

Asserted nowhere and **no task owns it**. Structurally implied: `function-handler.service.ts` runs the byte-identical fold over the identical object, so `completness: true` entails that gate passes. The remainder is roles/workflow, outside this spec (DD-5). **Remediation:** adopt in chunk 3, or accept as structurally implied.

### G-3 · The HTTP tier is unreachable without writing to a shared database

Not proven at any tier: that Nest **invokes** the `@UsePipes` pipe at request time (trap 1 — proven only by decorator metadata plus a spec-built pipe), the `ServerResponseDto` envelope on the wire, `ResultStatusGuard`'s `400` through the real pipeline, and a live `401`.

**Why it is blocked rather than skipped.** `test/app.e2e-spec.ts` uses `Test.createTestingModule({ imports: [AppModule] })`, so `main.ts`'s `microservice()` never runs and **no RabbitMQ consumer attaches** — that part is safe. But `AppModule` binds the **CORE** datasource, i.e. the shared dev DB at `192.168.20.210`. A read is defensible; a `PATCH` e2e would **write to a shared database**, which root `CLAUDE.md`'s boundary rule makes a human decision, not an agent's.

**Remediation:** point an e2e Jest project at the scratch container (override the datasource token, reusing T-09's harness pattern), then assert the four properties above. That is a **spec task**, not an improvisation inside `/akili-test` — runner/config decisions belong to the TRD.

### G-4 · `R-IUA-002 AC.7` — mechanism proven, live `401` not

Per **DD-16**, discharged by asserting the route is absent from `AppModule`'s `JwtMiddleware` `exclude` list — the actual mechanism producing the `401`. It does **not** prove a live `401`; that needs G-3's seam. Recorded by DD-16's own terms rather than closed.

### G-5 · `R-IUA-010 AC.4` — ordering has no behavioural gate at any tier

F-D is green and that green **proves nothing about ordering**: because `id = level + 1`, primary-key order is coincidentally correct, so **F-D stays green with T-01's `order` override deleted** — confirmed by running exactly that mutation. T-01's unit gate is itself only a presence assertion over a mocked `find`. F-D is kept as a **seed-shape tripwire**, not a correctness gate. **Remediation:** a re-seed breaking the coincidence, or accept.

### G-6 · `R-IUA-005 AC.2`'s exclusive falsifier was never run

T-06 attempt 1 recorded: *"the mutation that actually reds N4 — exempt `OTHER` from the dedup set entirely — **was not run**."* No later entry records it running, so closure is inferable only from a passing round — **KZ-002's substitution**. The behaviour *is* asserted by a committed test. **Remediation:** run that one mutation and record it (~10 minutes), or accept with the residual stated, as `tasks.md` now does.

### G-7 · ✅ **CLOSED 2026-08-20** — was: `R-IUA-013 AC.3`, the `/swagger` human check

The **only** gate this AC has. ESLint has no Swagger rule, `/swagger` renders an undecorated handler without complaint, and the reference controller carries neither decorator — so "matches the neighbours" is not evidence either. **No substitute was authored, simulated, or grepped**; doing so would have fabricated the gate.

A **stronger reason than the spec records** was found while looking for a safe automated path: the document cannot be produced at all without booting the app, and `main.ts`'s `microservice()` is **unconditional** — it registers a live consumer on a **shared durable RabbitMQ queue**, where it can consume messages meant for another instance. The artifact cannot be produced without a side effect on shared infrastructure.

**Remediation — the user runs it.** It unblocks **three** checkboxes, not one: T-13 c6 plus T-01 c1 and c4, which are transitively gated on it.

---

## Remediation summary

| Gap | Owner | Action |
| --- | --- | --- |
| **G-1** | ✅ **CLOSED** | User ruled **A**. `assertInnovationUseOwnership` scopes the id-present save by `(result_id, role)` in both services; both halves proven load-bearing by four permanent unit tests; deleting either guard now reddens `npm test`. **Dev's exposure remains — separate ticket** |
| **G-7** | **User** | Run the `/swagger` observation — unblocks 3 checkboxes |
| G-3 | Follow-up spec | An e2e project pointed at the scratch container |
| G-6 | Optional | Run the one unrun mutation, or accept the stated residual |
| G-2, G-4, G-5 | Accepted | Recorded with reasons; each is structurally bounded |

## Accepted gaps

**G-2, G-4, G-5** are accepted as recorded. Each is a *stated limit of a tier*, not missing work: the submit transition is structurally implied and outside this spec's authorization surface; AC.7's mechanism is proven and DD-16 scoped the claim deliberately; and F-D's weakness is documented in three places rather than dressed up.

**Not accepted, and not to be read as accepted:** G-1 is an open product defect and G-7 is an unperformed gate. Neither is a limitation of testing.
