# Archive Summary — Results (Innovation Use) / Details API

> **Delivered and archived with two human gates open, both filed and scoped.** The Innovation Use section is readable, writable and submittable through three new endpoints. **Four product defects were found across three validation rounds and all four are fixed** on this endpoint. The gates that remain are a security sign-off and **FR-7** — the sibling Innovation Dev endpoint over the same tables, which has none of the four protections built here.
>
> **The one thing this archive must not be summarised as: "authorization fixed" or "organizations fixed."** Both are fixed on **one of two endpoints over the same tables**. The asymmetry is what makes the short summary tempting and wrong.

---

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/innovation-use/details-api/` |
| Archive path | `docs/specs/archive/2026-08-20-innovation-use--details-api/` |
| Archive date | 2026-08-20 |
| Spec id | 2026-08-innovation-use-details-api |
| Parent spec | [`../../innovation-use/family.md`](../../innovation-use/family.md) — **chunk 2 of 3** |
| Package | `server/researchindicators` (server-only; no `client/` change) |
| Branch | `AC-1679-Create-the-innovation-use-section` · HEAD at archive `9b571c36` |
| Ticket | AC-1679 |
| Final status | ✅ **Delivered** · ⚠️ **2 human gates open** (security sign-off, FR-7) |
| Depth | Full |

---

## Final status

| Gate | State |
| --- | --- |
| 13 tasks | **all `[x]`** |
| Unit | **336 suites / 2296 tests** green |
| Coverage | **89.80 / 75.82 / 85.31 / 89.27** — floor 60 (NFR-IUA-003) |
| Fixtures (real MySQL) | **15 suites / 71 tests** green, **twice** on the same scratch container |
| `npm run build` | clean (`nest build` + admin Vite bundle) |
| `tsc --noEmit` | clean |
| Lint | clean, `git status` re-checked after its `--fix` |
| Validation | 2 rounds. Round 2 raised 7 FAIL; **6 closed in-session**, the 7th restated |
| Migrations | **zero**, as DD-4 required |

---

## Requirements delivered

| ID | Title | State |
| --- | --- | --- |
| R-IUA-001 | Detail row exists from creation | ✅ |
| R-IUA-002 | Read the full section | ✅ · AC.7 mechanism-only (G-4, accepted) |
| R-IUA-003 | Write the section atomically | ✅ |
| R-IUA-004 | Actor counts, exclusive modes, derived total | ✅ |
| R-IUA-005 | Duplicate actor types rejected | ✅ · AC.2's exclusive falsifier unrun (G-6, accepted) |
| R-IUA-006 | Conditional justification at level ≥ 6 | ✅ · narrowed by **DD-14** |
| R-IUA-007 | Organizations carry a count | ✅ · **gained AC.6 at archive-time validation** |
| R-IUA-008 | Other quantitative measures | ✅ |
| R-IUA-009 | Reconciliation never crosses a role | ✅ · **AC.4 amended twice and deliberately left unticked** |
| R-IUA-010 | Use-level catalog endpoint | ✅ · AC.3/AC.4 ordering has no behavioural gate (G-5, accepted) |
| R-IUA-011 | Result can actually be submitted | ✅ · scenario's *"submit transition is permitted"* unowned (G-2, accepted) |
| R-IUA-012 | Green checks reflect the save (pull) | ✅ |
| R-IUA-013 | Repo conventions on every surface | ✅ · AC.3 closed by the human `/swagger` observation |
| NFR-IUA-001 | Read cost ≤ 5 queries | ✅ **exactly 5** at 52 active actor rows — at the ceiling |
| NFR-IUA-002 | DB-backed proof is a gate | ✅ |
| NFR-IUA-003 | Coverage floor held | ✅ |

**Deliberately unticked:** all 73 AC checkboxes in `requirements.md` §7, by decision, with the signpost in §7 explaining that `test-report.md`'s matrix is the coverage authority. **`R-IUA-009 AC.4`** stays unticked because it was rewritten twice to match code that never changed.

---

## Files changed summary

**New — `domain/entities/result-innovation-use/`:** `controller`, `service`, `module`, `dto/create-*`, `dto/update-*` (+ specs).
**New — `domain/tools/clarisa/entities/clarisa-innovation-use-levels/`:** `service`, `controller`, `module` (+ specs).
**Modified, all additive:** `main.routes.ts`, `entities.module.ts`, `results.module.ts`, `clarisa.routes.ts`, `clarisa.module.ts`, `result-actors.service.ts`, `result-institution-types.service.ts`, `results.service.ts`.
**New fixtures — 6 files + harness, 4,619 LOC:** `nest-harness.ts`, F-A `section-round-trip`, F-B `role-isolation`, F-C `level-boundary`, F-D `catalog-order`, F-E `result-creation`, and `edit-plus-add-id-collision`.

**Zero migrations** (DD-4). **No file under `domain/shared/` added or changed.**

---

## Test evidence summary

| Tier | Result |
| --- | --- |
| Unit | 336 suites / 2296 tests green; coverage 89.80/75.82/85.31/89.27 |
| Fixtures | 15 suites / 71 tests green ×2, real MySQL at `127.0.0.1:3307` |
| E2E | **BLOCKED (G-3)** — `AppModule` binds the shared dev DB; a `PATCH` e2e would write to it, which is a human decision |
| Human `/swagger` | **performed** and recorded verbatim 2026-08-20 |

**The strongest single piece of evidence in the spec** is DD-14's falsification: replacing `!== undefined` with `??` did not merely fail an assertion — it **reproduced the actual bypass**, nulling a stored justification in the database and cascading into the next tests' preconditions.

**Zero `it.failing` remain.** Every quarantine marker was inverted by fixing the defect, never by softening the criterion.

---

## The four product defects

All four were found by an auditor reading code against a claim. **None was ever shown by a test run** — every one produced a `200`.

| # | Defect | Found at | Fix |
| --- | --- | --- | --- |
| 1 | **Cross-result** PK overwrite — result 1's payload carrying result 2's row ids rewrote result 2's rows | T-10 fixture, real MySQL | `assertInnovationUseOwnership`, `(result_id, role)`-scoped, rejects `400` |
| 2 | **Same-result cross-role** variant — needs no knowledge of another result, so likelier | `/akili-validate` round 1 | same fix; falsified 4 ACs recorded as PROVEN |
| 3 | **Id-less PK adoption** — an added row's identity lookup adopted the edited row's PK, so `save()` issued two PK-keyed UPDATEs against one row. Silent loss **plus a column-level hybrid matching neither payload row** | re-validation Auditor B | `Not(In(excludeIds))` on actors; `reconcileAdoptedPrimaryKey` on organizations |
| 4 | **Identity-less organization row** — `{"organizations":[{"organization_count":12}]}` overwrote an **arbitrary** sibling row with nulls and deactivated the rest of the section | `/akili-validate` round 2, Auditor B | `validateOrganizationsAreIdentified`, before `BEGIN` (**R-IUA-007 AC.6**) |

Plus two defects **inside the remediations themselves**: a duplicate submitted PK that a cosmetic `[...new Set(...)]` had hidden from the guard for two rounds, and a phantom-collision reconcile that disowned a PK nothing would write — leaving the row the caller named by id permanently inactive, **order-dependently**.

---

## Validation summary

| Round | Verdict |
| --- | --- |
| 1 | ❌ NOT ARCHIVE-READY — 5 FAIL, 21 WARN. Found defect #2 |
| 2 | ❌ NOT ARCHIVE-READY as raised — 7 FAIL, 22 WARN, 1 BLOCKED. Found defects #3-follow-on and #4. **6 of 7 FAILs closed in-session** |

Round 2 was delegated to **three independent auditors on disjoint lenses** (coverage-at-clause-granularity · adversarial defect hunt · record integrity). That decision is what surfaced all three of its most severe findings.

---

## Accepted warnings and follow-ups

### Human gates — neither is an agent's to close

| Gate | Where | Why |
| --- | --- | --- |
| **Security review** | `requirements.md` §15 | The row declared the review *not required* because no auth path changed. **This spec's own remediation falsified that**: two authorization controls now exist on tables shared with Innovation Dev. Round 2 added a second input — an unvalidated catalog FK returns `500` carrying the **database name and FK constraint name** to any authenticated caller (`GlobalExceptions` has no `QueryFailedError` branch) |
| **FR-7** | [`../../innovation-use/family.md`](../../innovation-use/family.md) | `customSaveInnovationDev` shares the same tables and has **none of the four protections**. Defect #4's root is `constructWhereClause`, a **shared** helper, so that shape reaches the Dev endpoint through code this spec never modified. Needs its own spec with a migration-grade review gate |

### Follow-up specs

| # | Item |
| --- | --- |
| **G-3** | An e2e Jest project pointed at the scratch container. Unblocks **T-01 c1** (below) and closes G-4's live `401` |
| **FR-7** | The Dev-endpoint mirror of all four protections |

### Named exception — carried deliberately, must not be "fixed" by a tick

**T-01 criterion c1** — *"the catalog `GET` returns ten rows in a `ServerResponseDto`"* — is **`[ ]`**, re-classed **BLOCKED ON G-3** at round 2 (FAIL-3). It had been ticked as released by the human `/swagger` observation, but that observation covers the page **rendering**; the wire envelope is proven at no tier. The ten rows and four columns *are* proven at the service tier. Sibling c4 — the *rendered* surface — is genuinely discharged and stays `[x]`.

**`tasks.md` §7's unflipped-checkbox count is therefore ONE, not zero.** Re-ticking c1 to reach zero would be the fifth occurrence of this spec's signature defect.

### Accepted gaps

**G-2** submit transition structurally implied · **G-4** `401` mechanism-only per DD-16 · **G-5** catalog ordering has no behavioural gate at any tier (F-D stays green with the `order` clause deleted) · **G-6** one unrun mutation on R-IUA-005 AC.2. Each is a stated limit of a tier, not missing work.

### Advisories carried forward

Unvalidated catalog FKs on four fields → raw `500` · no `@MaxLength` on five `text` columns → same `500` · `?reportYear=` retargets writes to snapshot rows with three roles bypassing `ResultStatusGuard` · collection semantics are full-replace while scalars partial-merge (correct per R-IUA-003's title, worth stating in §4 before chunk 3) · `updated_at` advances only at second granularity · unguarded `afterAll` deletes in five fixtures · the child guide's `@Roles` recipe contradicts **DD-5**.

---

## Historical notes

**Budget.** Estimated 13 tasks / ~2,400 LOC / ~24 review rounds. **Actual: 13 tasks · ≥ 26 rounds · fixture tier 4,619 LOC.** Rounds are stated as a floor, not a false exact — a review died on a session limit and was re-dispatched, and three commits landed after the closing run. Every overrun was escalated, never absorbed.

**Three Pivot Records** — T-01, T-07, T-10.

**DD-15 is the most transferable finding.** A `RouterModule` route node is **not** a registration: it stamps a path prefix, looks the module up, and **returns silently when absent**. No boot error, no warning — every handler returns `404`. Both new modules shipped that way while 2,255 tests passed. Root cause was in `design.md` §2.1, which enumerated the two route files and omitted the two module-graph files, so no Implementer had a file to touch and no Reviewer had a criterion. Now standardized in the server child guide.

**The methodology lesson, stated because it is measurable.** Every FAIL across three validation rounds was a **claim–artifact mismatch**, not a code-quality problem — and **two of the four product defects were sitting in the previous round's advisory register** before they were defects. The code was audited hard by 26 review rounds. The *record* was not audited at all until round 1.

> **The signature failure of this spec, in one line:** the number gets corrected and the sentence does not. It recurred six times, including inside the paragraph arguing that counts must be grepped, and inside the correction-closure rule written to end the class.
