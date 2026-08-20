# Validation Report — Results (Innovation Use) / Details API

> ## ❌ NOT ARCHIVE-READY — 5 FAIL, 21 WARN
>
> **The blocking finding is new, and it falsifies a claim this spec recorded as proven.** The cross-result authorization defect found at T-10 has a **second, un-gated variant** that needs no knowledge of another result — so it is *more likely* — and it falsifies **four ACs** that `execution.md`, `tasks.md` and `test-report.md` all recorded as PASS. Three of the other four FAILs are documentation defects about counts, in a spec whose own thesis is that counts must be grepped rather than asserted. One is an entire design section that was never delivered and never noticed across 24 review rounds.
>
> **Nothing here was found by re-running a test.** Every FAIL came from reading an artifact against the document that claims it.

- **Spec:** `docs/specs/innovation-use/details-api/` · **Module:** results (`innovation-use`) · chunk 2 of 3
- **Package:** `server/researchindicators` · **Branch:** `AC-1679-Create-the-innovation-use-section`
- **Validated:** 2026-08-20 · **Tier:** T3 Auditor, **delegated to two independent auditors**

---

## Document Control

| Field | Value |
| --- | --- |
| Verdict | ❌ **NOT ARCHIVE-READY** |
| FAIL | **5** |
| WARN | **21** |
| BLOCKED | **1 requirement / 3 checkboxes** — `R-IUA-013 AC.3`, the human `/swagger` gate |
| Build integrity | ✅ **`npm run build` passes clean** — the first build ever run on this spec |
| Independence | The Leader authored every `execution.md` entry, spec correction and adjudication here. **Model identity satisfies `author ≠ auditor`; investment in the narrative does not** — so Phases 1/2/4 and 5/6 were delegated to two auditors with fresh context. **That decision is what surfaced FAIL-1** |

---

## Summary

**Build integrity — the one thing this validation added by running rather than reading.** `npm run build` had never been run on this spec. It passes: `nest build` with no type errors plus the admin Vite bundle. That closes T-02's standing advisory that `npm test` was weak evidence of compilation for files nothing imported yet.

**Everything else of consequence came from cross-reading.** The auditors verified at source what is statically verifiable — both DD-15 registrations, all three deactivate predicates, DD-14's `!== undefined`, the pipe options, `total`'s absence from the DTO, the `order` override, the `it.failing` count, the C-4 file arithmetic — and it held. What did not hold was the *record*.

| Phase | Verdict |
| --- | --- |
| 1 · Task completion | 11 PASS · 3 WARN · 0 FAIL |
| 2 · File existence | All expected files present · **WARN** — §2.1 still incomplete (3 spec files in no task's *Files touched*) |
| 3 · Build integrity | ✅ build · tsc · lint · 336/2264 unit · 14/54 fixtures ×2 · coverage 89.69/75.61/85.13/89.14 |
| 4 · Requirement coverage | **1 FAIL** (+ the retraction below promotes 4 more ACs to FAIL) · 1 BLOCKED · 10 WARN |
| 5 · Quality | **2 FAIL** (authorization, observability) · advisory register consolidated |
| 6 · Design conformance | **2 FAIL** (both figure defects) · 7 WARN |

---

## FAIL-1 · The authorization defect is wider than recorded, and four "PROVEN" ACs are false

**Root cause, verified at source by the Leader after the auditor raised it.** `result-actors.service.ts`'s id-present branch:

```
if (institution?.result_actors_id) {
  dataToSave.push({
    result_actors_id: institution?.result_actors_id,   // caller-supplied PK
    actor_role_id: ActorRolesEnum.INNOVATION_USE,      // ASSIGNED, not filtered
    is_active: true,                                    // ...and no result_id
```

`tempRepo.save(dataToSave)` then performs a **PK-keyed UPDATE**. `result-institution-types.service.ts`'s `buildUpdateData` is the same shape in **both** branches.

**Two distinct variants, one root cause:**

| Variant | Status |
| --- | --- |
| **Cross-result** — result 1's payload carries result 2's row id | Known. Reproduced against real MySQL at T-10. Quarantined under `it.failing`. `R-IUA-009 AC.3` = FAIL |
| **Same-result, cross-role** — result 1's payload carries result 1's own Innovation **Dev** row id | ❌ **NEW, un-gated.** Rewrites the Dev row: role flipped to `INNOVATION_USE`, data columns overwritten, `is_active: true`, and the four legacy Dev booleans stranded on a row the Dev section can no longer see |

**The new variant is the more likely of the two** — it requires no knowledge of another result, only a client that ever puts a Dev row id in an Innovation Use payload.

**ACs promoted from PASS to FAIL:**

| AC | Text | Why it fails |
| --- | --- | --- |
| R-IUA-009 **AC.1/AC.2** | *"leaves every Innovation Dev row's `is_active`, ids and column values unchanged"* | False for the id-present save path |
| R-IUA-009 **AC.4** | *"Every deactivate/update predicate in the write path names the role column"* | **False as written.** The id-present save's predicate is the **primary key**. It does not name the role column — it **assigns** it |
| R-IUA-007 **AC.4** | *"No `result_institution_types` row with role `INNOVATION_DEV` is read, **written** or deactivated"* | The *written* half is unprotected |

**Why F-B passes anyway, and why that matters more than the defect.** F-B's attack payload carries **only** result 2's ids; `devActorId` appears in the file **only inside assertions**, never inside a payload. So its test *"leaves the Innovation Dev actor row byte-identical (a second save must not newly expose it either)"* is green **because the payload contains no Dev id** — a proxy assertion, passing for a reason unrelated to the property it names. **KZ-002 again, in the fixture built to prove role isolation.**

**And it was foreseen twice and lost.** T-04's Lens A advisory says verbatim: *"A payload naming an Innovation Dev row's id would save it with `institution_type_role_id: INNOVATION_USE` and blank its type columns."* T-03's carries the actor twin. **Neither was ever reconciled against T-10's "role isolation PROVEN" conclusion.** Two advisories predicting a defect were worth less than one test.

**Remediation:** the fix already open as options **A**/**D** closes both variants — scope the id-present branch by `(result_id, role)`. The case for acting is now stronger, not weaker. **The retraction is recorded in `execution.md` → *RETRACTION*, and `tasks.md` T-10's status line and `test-report.md`'s matrix have been corrected.**

## FAIL-2 · `design.md` §9 (Observability) is entirely undelivered, and nothing noticed

§9 states imperatively: a `CgiarLogger` instance on the service *"matching `ResultInnovationDevService`"*, and a `warn` on a rejected save carrying `result_id` and the rule that fired.

**Grep over the whole `result-innovation-use/` directory for `CgiarLogger|LoggerUtil|logger`: zero matches.** The comparison target is real — `result-innovation-dev.service.ts` instantiates `CgiarLogger` and calls `this.logger.warn` at four sites — so §9's claim is checkable and false.

**No DD supersedes it. No Done criterion carries it. No execution entry, advisory or correction mentions it across 2,037 log lines.** R-IUA-013 AC.6 only forbids `console.*`, which is satisfied vacuously. **This is a section of the approved design that fell entirely outside the traceability net and survived 24 review rounds unnoticed** — the purest instance of design drift in the spec, and the one the clause-level matrix structurally could not catch, because §9 has no requirement id.

Mitigation on record: §9 itself notes `ResponseInterceptor` already logs a `400` at `warn`, so the operational loss is the rule name and the service-scoped logger, not all signal. **Closure: ~6 lines of code, or a DD recording the omission deliberately.** Lowest-severity FAIL — but a spec violation, not an advisory.

## FAIL-3 · `test-report.md` said "6 gaps" and listed seven

Three places said **6**; the enumeration always ran **G-1…G-7**, and the Remediation table accounted for all seven. **Authored by the Leader, in a document whose thesis is that counts must be grepped rather than asserted.** Corrected.

## FAIL-4 · `design.md`'s modified-file count has now been wrong three times

The cell said **6** while *already enumerating seven*, and the tree has **eight** — `results.module.ts` is modified for T-08's DI edge and appeared in neither the count nor §2.1's table, **after DD-15 re-audited that exact table for exactly this omission class**.

Trajectory: **4 → 6 → 8**, each correction by a different reader. **A count nobody can restate correctly twice is a symptom that it should be derived, not asserted.** Corrected, and §2.1 gained the missing row.

## FAIL-5 · `R-IUA-012 AC.1`'s "section save" is discharged by a different section's save

F-E's save is `ipRightsService.update` — **IP Rights**. The Innovation Use section's own completeness is seeded by **raw SQL**; `harness.innovationUseService.update()` is **never called in F-E**, and F-A never reads green checks. **No test at any tier drives this spec's section save → green-check read.**

Literally satisfiable, since IP Rights is a section. Against R-IUA-012's own user story it is not — and it is exactly the shape `/akili-validate` warns about: *the clearance substitutes an adjacent satisfied thing rather than quoting the clause*.

---

## WARN register — 21, grouped

**Requirement-level (10):** R-IUA-002 AC.7 mechanism-only (DD-16, bounded) · R-IUA-003 AC.5 guard unproven through the real pipeline · **R-IUA-003 AC.7 names `results.last_updated_date`, a column that does not exist** — `AuditableEntity` has only `updated_at`, and the fixture **silently re-mapped the requirement** rather than flagging it (seventh instance of the criterion-text-defect class, and the only one uncorrected) · R-IUA-003 S1's *"level unchanged in the database"* thin · R-IUA-004 S2's clause mis-assigned to T-02, a task whose own verification says it is unverifiable in isolation (fourth occurrence of the mis-assignment pattern) · R-IUA-005 AC.2's exclusive falsifier never run · R-IUA-009 AC.4's third table has no unit-tier owner · R-IUA-010 AC.3/AC.4 ordering has **no behavioural gate at any tier** · R-IUA-011's *"submit transition is permitted"* owned by no task · R-IUA-013 AC.1's envelope unproven on the wire.

**Figure defects (5):** LOC budget — measured fixture tier **3,225 (~3.5×)**, spec-wide **~6,450 (~2.7×)**, and **no document records a top-line actual** *(§7 item 9 un-ticked accordingly)* · `900893` where `900883` was meant, conflating two rows' sentinels *(corrected)* · "336 suites authored T-01…T-08" — the spec authored **8** suite files *(corrected)* · §7's stale "14 suites / 49 tests" against the current 54 · `execution.md` citing **DD-15** for the AC.7 adjudication, which is **DD-16** *(corrected)*.

**Documentation / process (6):** §7 item 2 named `requirements.md` §14, which **has no checkboxes**, while all **73** ACs in §7 remain unflipped *(wording corrected; ticking those 73 is separate, unstarted work)* · T-01 `[x]` with two open criteria while T-13 is `[~]` for the same reason, citing Step 2.3.0 — one status is wrong under the rule the spec quotes · three spec files in no task's *Files touched* · the child guide's §4 step 3 still prescribes `@Roles` + `RolesGuard`, which **DD-5 forbids** — an agent following it literally adds the one thing this spec ruled out (pre-existing; for `/akili-audit`) · `requirements.md` OQ-IUA-2 unstruck · §13's rollout table never absorbed DD-14's deployment consequence.

---

## Advisory register (non-gating)

**Standing, verified against the current tree:** the missing ownership check recorded as an advisory **three times** before becoming a proven defect · identity-less organization rows binding `findOne` to an arbitrary existing row (forward-pointed to T-06, never implemented — correct under the never-widen rule, but live) · four DTO typing gaps · the surviving aggregate-mode mutant (accept direction unproven) · **six** instances of the baseline capturing DDL without seed rows · unguarded `afterAll` deletes in four fixtures · `results.updated_at` advancing only at **second** granularity, so AC.7 is product-observably unreliable · **no `@MaxLength` on any free-text field and no `QueryFailedError` branch in `GlobalExceptions`**, so an over-long value returns a `500` carrying raw SQL — the identical class T-06 closed for one field only · six false-or-drifted comments in shipped code, including `entities.module.spec.ts`'s "exactly one incoming graph edge", falsified by T-08's DI edge.

**Checked and cleared:** `deriveActorTotal`'s `?? 0` would concatenate on `bigint` columns — they are `int`, verified. Safe.

---

## Agent Guide / Constitution Impact

`src/CLAUDE.md` and `src/AGENTS.md` both carry the DD-15 block **identically at all three amended sites**, and the auditor verified the mechanism description is **accurate against the code**, not merely plausible. Not stale. **WARN** only for the pre-existing `@Roles` recipe three bullets above it. CodeGraph re-index and the TRD §4.1/§6.1 check remain pending for `/akili-archive`.

---

## Remediation

| # | Finding | Owner | Action |
| --- | --- | --- | --- |
| 1 | **FAIL-1** authorization, both variants | **User** | Rule **A** or **D**. One fix — scope the id-present branch by `(result_id, role)` — closes both. Widen the quarantine to name the cross-role variant |
| 2 | **BLOCKED** `/swagger` | **User** | Run the observation. Unblocks **3** checkboxes |
| 3 | FAIL-2 §9 observability | Follow-up | ~6 lines, or a DD recording the omission |
| 4 | FAIL-5 · R-IUA-012 AC.1 | Follow-up | One F-A/F-E test driving the Innovation Use section's own save → green-check read |
| 5 | WARN · R-IUA-003 AC.7's nonexistent column | Follow-up | Correct the AC to `updated_at`; the fixture already tests the real column |
| 6 | WARN · LOC actual | Bookkeeping | Record the measured figures |
| 7 | FAIL-3, FAIL-4, 5 figure/wording defects | — | ✅ **Corrected during this validation** |

---

## Archive Readiness Recommendation

**Do not archive.** Two blockers require the user (FAIL-1's ruling, the `/swagger` observation); two require small follow-up work (FAIL-2, FAIL-5). The corrections this validation could make itself are made.

**What this spec got right is worth stating alongside the failures**, because the failures are what a good process looks like when it works: 336 unit suites and 14 fixture suites green, a production build clean, coverage at 89/76/85/89, **two genuine product defects found and neither hidden**, DD-14's operator proven load-bearing by a falsification that *reproduced the bypass*, and a quarantine that inverts so a green suite proves the defect is still open. The five FAILs are four documentation defects and one design section — and the authorization defect was found by an auditor reading code against a claim, which is precisely what this phase exists to do.

**The pattern worth carrying to Kaizen:** every FAIL here is a **claim–artifact mismatch**, not a code defect. Counts asserted rather than derived; an AC naming a column that does not exist; a design section with no requirement id and therefore no row in any matrix; a fixture green because its payload omitted the thing it claimed to test. The code was audited hard by 24 review rounds. **The record was not audited at all until now.**
