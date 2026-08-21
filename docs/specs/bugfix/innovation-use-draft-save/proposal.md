# Proposal — Innovation Use drafts must save while incomplete

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-draft-save` |
| **Slug** | `innovation-use-draft-save` — **derived from a free-text argument**, not supplied as a slug. Core intent: *let an incomplete Innovation Use draft save.* |
| **Type** | **Bug** |
| **Mode** | **Lite / Bug Mode** — requires a regression test, red before the fix and green after |
| **Approval Mode** | **gated** — every phase gate pauses for the user (no up-front end-to-end mandate was given) |
| **Depends on** | none. **But it is deployment-coupled** — see §5.1 |
| **Parallel-safe** | **no** — two tiers, and it amends an open spec (`innovation-use/details-page`) |
| **Related family** | [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) — this is **not** a manifest child (it is a bugfix, like `bugfix/sp-versioning-roles-id` was). It should gain a **risk/follow-up row**, not a child row |
| **Reported by** | Product owner, live, 2026-08-21, during `details-page` T-13's human gate |
| **Date** | 2026-08-21 |

---

## 2. Intent

A user filling the Innovation Use section should be able to click **Save** and have their work persist, whether or not the section is finished. Completeness should be enforced when they **submit**, not when they save — which is how every other section of STAR already behaves.

---

## 3. Problem / Current Behavior

Select a use level whose resolved `level >= 6`, leave **Justification** blank, click **Save** → **nothing happens.** No request, no toast, no error. The work is not persisted and the user is given no reason.

Two extra facts make it worse than a plain validation block:

| | |
| --- | --- |
| **It is silent** | The `if` wrapping the PATCH simply evaluates false, so the click has no visible consequence beyond two inline messages that were already on screen. A user cannot tell "refused" from "broken" |
| **Two identical error messages render** | With a *pure blank* justification, both an amber and a red *"This field is required"* appear. Predicted and recorded as an advisory during `details-page` T-09 (`execution.md:1217`), then never acted on — a textbook **KZ-008** instance ("an advisory that names a reachable state is an unfiled defect"). This is its **third** recurrence |

Confirmed by the reporter: lowering the level below 6, or typing anything into the justification, makes Save work normally.

---

## 4. Proposed Outcome

| Behavior | Today | After |
| --- | --- | --- |
| Save with blank justification at `level >= 6` | Silently does nothing | **Persists.** Success toast, values re-read |
| Green check / sidebar tick for the section | (unreachable — nothing saved) | **Stays false** until the justification is filled |
| Submit an Innovation Use result with blank justification at `level >= 6` | Blocked | **Still blocked** |
| Inline required message + red asterisk on the textarea | Present (duplicated) | **Present, exactly once** |
| Whitespace-only justification | Blocked, page-owned message | **Persists as `NULL`-equivalent**; message still renders; server never receives whitespace |

---

## 5. Scope

### Server (`server/researchindicators`)

| Item | Detail |
| --- | --- |
| Remove the save-time throw | `result-innovation-use.service.ts` — `validateLevelExplanation` (defined `:307-326`, **one** caller `:183`). See §11 for why the correct action is deletion rather than relocation |
| Invert the unit tests asserting the rejection | `result-innovation-use.service.spec.ts` lines **284, 559, 575, 688, 1136** |
| Redesign the boundary fixture | `test/fixtures/innovation-use/innovation-use-level-boundary.fixture-spec.ts` — **exists entirely around this rule.** The single largest piece of work and the main size risk |
| Update a referencing comment | `test/fixtures/innovation-use/innovation-use-edit-plus-add-id-collision.fixture-spec.ts:194` |
| Regression fixture (Bug Mode) | A level-≥6 blank-justification save that **fails today and passes after**, plus a submit attempt on the same row that **stays rejected** |

### Client (`client/research-indicators`)

| Item | Detail |
| --- | --- |
| Remove the save gate | `innovation-use-details.component.ts:497-503` — drop `!this.justificationMissing()` from the `if`. **Leave `!this.hasDuplicateActorType()` in place** (see §6) |
| Fix the duplicate message | Keep the **page-owned** block (it uses `.trim()`, so it covers blank *and* whitespace); suppress the shared `app-textarea`'s own message on this field. **Constraint: do not edit the shared `TextareaComponent`** — T-09 ruled that out on blast-radius grounds, and that ruling stands |
| Preserve the payload trim | `buildPayload`'s `.trim()` stays — T-09's decision that the server must never receive whitespace is unaffected |
| Invert the T-09 c5 tests | They were deliberately hardened to assert *"blocked **and** message renders"*. Now: *"saved **and** message renders"* |

### Documents

| Item | Detail |
| --- | --- |
| Pivot in the open spec | `innovation-use/details-page`: R-IUP-006 AC.2, `design.md:380` (*"Save blocked"*), `tasks.md:428`, criterion T-09 c5, and the traceability row `tasks.md:604` |
| Superseding record for chunk 2 | `docs/specs/archive/2026-08-20-innovation-use--details-api/requirements.md` → `R-IUA-006` AC.3/AC.4 assert the rejection. It is **archived** — do **not** edit in place (repo convention: archived specs are point-in-time records). Write a superseding decision instead |
| Correction Closure sweep | Both directions, per **KZ-005**. This spec's own run has already had the forward sweep catch survivors the cited-site list missed — **twice today** |
| `family.md` | Add a follow-up/risk row |

### 5.1 Deployment coupling — not a preference

**The two tiers must ship together, or neither.** Client-only removes the client gate, the PATCH fires, and the server answers `400` — a visible error where there is currently a silent no-op, i.e. strictly worse. Server-only changes nothing a user can perceive, because the client still refuses to send.

---

## 6. Non-Goals

- **Relaxing the submit gate.** The justification stays mandatory for submission. Nobody asked to change that, and the green check already enforces it.
- **Touching `hasDuplicateActorType()`'s save block.** A duplicate actor type is *invalid data* the server rejects (R-IUP-009), not an unfinished draft. Blocking it client-side is legitimate mirroring under the PRD's `AC-Role-Correctness`. Different category, out of scope.
- **Editing the shared `TextareaComponent`.**
- **Any migration.** The green-check function is **not** modified.
- **The known dark-mode contrast failure** in this section (1.29:1 / 1.887:1 against 4.5:1). Real, recorded, and a separate `details-page` matter.
- **The investment / co-investment USD tables** — family non-goals, product-owner ruling 2026-08-14.

---

## 7. Affected Users, Systems, And Specs

| | |
| --- | --- |
| **Users** | Result Contributors reporting an Innovation Use result at use level 6–9. Today they cannot save a partial draft at all |
| **Server** | `result-innovation-use` module (service + its unit and fixture tiers) |
| **Client** | `innovation-use-details` page component + its spec |
| **Specs** | `innovation-use/details-page` (**open** — Pivot), `archive/…details-api` (**archived** — superseding record), `innovation-use/family.md` (follow-up row) |
| **Not affected** | The green-check DB function, the workflow config, every other indicator, every other section |

---

## 8. Visual Reference

- **Source:** Reporter screenshot (live app, DRAFT result STAR-19911, level 6 selected, blank justification)
- **Location:** provided in-session, not committed
- **Notes:** Shows the two stacked *"This field is required"* messages and the un-actioned Save. No new UI is introduced by this change — one message is **removed** and a save path is **unblocked**. No Figma or mockup is warranted.

---

## 9. Bug Diagnosis

### Observed Symptom

Clicking **Save** on the Innovation Use details section does nothing — no persistence, no request, no feedback — when the resolved use level is `>= 6` and Justification is blank.

### Reproduction Steps

1. Create or open an Innovation Use (indicator 6) result in `DRAFT`.
2. Open **Innovation use details**.
3. Select a stepper level whose resolved `level >= 6` (button labelled **6**–**9**).
4. Leave **Justification** empty.
5. Click **Save**.

**Expected:** the draft persists; the section tick stays false; the required message stays visible.
**Actual:** nothing happens. Network tab shows no PATCH.

**Discriminating control (confirmed by the reporter):** lower the level below 6, or type any text into Justification → Save works.

### Root Cause — confirmed, both tiers

**Client (proximate).** `innovation-use-details.component.ts:497-503`:

```ts
if (
  this.submission.isEditableStatus() && !this.loadFailed() && !this.loading() &&
  !this.hasDuplicateActorType() &&
  !this.justificationMissing()      // ← blocks the whole block, silently
) { …PATCH… }
```

`justificationMissing()` (`:173`) = `showJustification() && !body().innovation_use_level_explanation?.trim()`.

**Server (underlying).** `result-innovation-use.service.ts:307-326`, one caller at `:183`:

```ts
private validateLevelExplanation(level, explanation, resultId): void {
  if (level === undefined || level === null || level < 6) return;
  if (!explanation || explanation.trim().length === 0) {
    throw new BadRequestException([
      'innovation_use_level_explanation: required when the innovation use level is 6 or above',
    ]);
  }
}
```

It runs on **every** PATCH, with no draft-vs-submit distinction. **So the client is not inventing the rule — it is faithfully mirroring a server rule, exactly as the PRD's `AC-Role-Correctness` requires.** The defect is that the rule is enforced at the wrong moment, on both tiers.

### Why the save-time throw is redundant — traced end to end

Enforcement already exists at submit, server-side, independent of `validateLevelExplanation`:

| Hop | Evidence |
| --- | --- |
| The rule lives in the green-check function | `db/migrations/1787078283929-createInnovationUseValidation.ts:134` — `RETURN commonFields AND IF(useLevel >= 6, explanationValid, TRUE) AND …`, where `explanationValid = valid_text(riu.innovation_use_level_explanation)` and `useLevel` comes from `ciul.level` via join (correctly avoiding the family's `id ≠ level` trap) |
| That function **is** the `innovation_use` green check | `green-checks.repository.ts:59` — `innovation_use_validation(${result_key}) as innovation_use` |
| Submit is gated server-side on all green checks | `result-status-workflow/function-handler.service.ts:312-332` (`completenessValidation`): iterates every non-visual-only green check and throws `BadRequestException('There are still sections pending before the results can be submitted.')` |
| It is wired by workflow config, not a static call | Dispatched dynamically as `{"type":"validation","config":{"function_name":"completenessValidation"},"enabled":…}` — see `db/migrations/1768329933286-updateConfigWorkflow.ts` and `1772481692172-insertNewTemplateInnovationLevel.ts:78,113` |

⚠️ **One link in that chain is not yet verified — see `OQ-1`.** The `enabled` flag differs per transition in the config rows, so *"submit is gated for indicator 6"* is **not** proven yet. It is the load-bearing precondition of this whole fix and must be confirmed before the fix lands, not after.

### Impact & Scope

| | |
| --- | --- |
| **Severity** | **High for usability, zero for data integrity.** No corruption, no loss of already-saved data — work is simply refused |
| **Who hits it** | Every reporter at use level 6–9 with an unfinished justification. On a test deployment this will dominate feedback and mask other findings |
| **Blast radius of the fix** | Deliberately narrow: one server method, one client `if` condition, one duplicate message. The green-check function, the workflow config, and every other indicator and section are untouched |
| **Pre-existing state** | `innovation_use_level_explanation` is nullable (`result-innovation-use.entity.ts:46-50`), so a `level >= 6` row with a `NULL` explanation is **already** a legal database state. There is no integrity argument for the throw |

### Fix Strategy

`/akili-specify bugfix/innovation-use-draft-save` in **Bug Mode**. Not `/akili-quick`: it changes behavior across two tiers, inverts ~8 test sites, and requires a fixture redesign. The regression test is the point — red before, green after.

**KZ-004 pre-flight, done before proposing** (its lesson is that a missing verification prerequisite forces a waiver that cannot be recovered post-fix):

| Prerequisite | State |
| --- | --- |
| `npm run test:fixtures` (`test/jest-fixtures.json`) | ✅ present |
| `docker-compose.test.yml`, `scripts/load-baseline.js`, `orm.test.config.ts`, `src/db/baseline` | ✅ all present |
| Docker daemon | ✅ active |
| Harness proven | ✅ chunk 2 ran this tier green **twice** (15 suites / 71 tests) |

**Red-before-green is achievable.** No waiver needed. *(`G-3` — an e2e project pointed at the scratch container — is still owed from chunk 2 but concerns `test:e2e`, a different config, and does not block fixtures.)*

---

## 10. Approach Options

| | Option | Assessment |
| --- | --- | --- |
| **A** | **Delete the save-time validation; rely on the existing submit gate.** Server: remove the `:183` call and the now-unused method. Client: drop the gate condition | **Recommended.** Smallest change that actually fixes it. Loses no enforcement, because `completenessValidation` already covers submit. Aligns the section with every STAR sibling |
| **B** | Keep the method, add a `isSubmitting` parameter so it only throws on submit | **Rejected — the parameter would never be `true`.** Submission does not flow through `ResultInnovationUseService`; it goes through the status-workflow + green-check path. There is no submit call site to relocate the check to, which is why A is *deletion*, not *relocation* |
| **C** | Leave the server alone; add a client toast explaining the refusal | **Rejected — does not fix the reported problem.** It documents the restriction instead of removing it, and the toast becomes throwaway work the moment A lands. Retained here only as the fallback if `OQ-1` resolves badly |

---

## 11. Recommended Approach

**Option A**, both tiers in one change, plus the duplicate-message fix.

Four independent lines of evidence support removing rather than relocating:

1. **The submit gate already enforces it** (§9, traced through four hops) — subject to `OQ-1`.
2. **No STAR sibling blocks save.** `geographic-scope.component.ts:119` and `partners.component.ts:59` (`saveData`) go straight to PATCH when the status is editable, with no validity gate at all. This section is the only anomaly.
3. **The spec already ruled the opposite way for an identical case.** `details-page/tasks.md:429`: *"**Zero actor rows: save is allowed.** A draft with no actors is legal (R-IUP-014); the green check simply stays false … **Do not block the save here.**"* Two incomplete drafts, two opposite treatments, and no recorded reason for the asymmetry.
4. **The rule is mis-categorised in its own contract.** In the `400` table (`details-page/requirements.md:180-190`) every other row is *malformed or invalid data* — negative counts, duplicate types, foreign ids. This is the only row about an *unfinished draft*.

### Why now rather than after the test deployment

`innovation-use/details-page` is **still open** — T-13 is `[~]`, nothing archived. The client half therefore lands as a **Pivot inside that spec**, the same mechanism already used twice today. Deferring means closing and archiving chunk 3, then **reopening an archived spec** for the client half. Reopening is the expensive path; this is the cheap window.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Severity | Mitigation |
| --- | --- | --- | --- |
| **OQ-1** | **Is `completenessValidation` `enabled: true` on indicator 6's `DRAFT → SUBMITTED` transition?** The config rows carry the flag **per transition**, and the migrations show both `true` and `false` values. If it is `false` for indicator 6, option A removes the only server-side enforcement of the rule | **BLOCKING** | **Answer before the fix lands** — query the `result_status_workflow` config rows for indicator 6 in the target environment. If `false`, the fix becomes *enable the gate first, then remove the save throw*, and this proposal's scope grows by one config change. **Do not proceed on the assumption.** This is the KZ-002 discipline: verify the real thing, not the convenient proxy |
| **R-1** | The boundary fixture (`innovation-use-level-boundary.fixture-spec.ts`) exists entirely around the deleted rule — it needs redesign, not editing | Medium | Largest work item; size the task explicitly at specify time. Its new job is the mirror assertion: *save accepts, submit rejects* |
| **R-2** | Deployment coupling (§5.1) — a half deploy makes things worse | **High** | One PR spanning both tiers. State it in the PR description. Per `docs/infrastructure.md` the server deploys first, so the intermediate window is server-only — which is the harmless half |
| **R-3** | `R-IUA-006`'s ACs live in an **archived** spec | Low | Superseding record, never an in-place edit |
| **R-4** | **KZ-008, third recurrence.** The duplicate message sat in the advisory register with an explicit reachability verdict and was found by a human instead | Medium | Fix it in this change. Worth a Kaizen entry: an advisory carrying a reachability verdict still had no owner and no gate |
| **R-5** | Inverting 5 unit tests + T-09's hardened client tests risks weakening them into tautologies (**KZ-001**) | Medium | Each inverted test must assert the **positive** outcome (a PATCH is issued, values persist) *and* that the message still renders — never merely the absence of a throw |
| **D-1** | Shared dev DB is not disposable; destructive schema/data operations are a human decision (root `CLAUDE.md` §4.3) | — | This change needs **no** migration. `OQ-1`'s answer may require a config row change, which would be a human-approved operation |

---

## 13. Success Criteria

1. At resolved `level >= 6` with a blank justification, **Save persists the draft** and shows the success toast; a re-read returns the saved values.
2. The section's green check / sidebar tick **stays false** until the justification is filled.
3. **Submit is still rejected** for that result, with the existing *"There are still sections pending…"* message.
4. Whitespace-only justification **persists**, the server receives no whitespace, and the required message renders.
5. Exactly **one** *"This field is required"* message renders in every case — blank, whitespace, and after the level drops below 6.
6. The shared `TextareaComponent` is **byte-identical** (`git diff --exit-code` on its path).
7. `hasDuplicateActorType()` still blocks the save — unchanged.
8. A regression fixture is **red before the fix and green after**, recorded verbatim.
9. Full server suite and full client suite green, unfiltered. Lint clean, `git status` re-checked after (the lint script carries `--fix`).
10. `OQ-1` is answered with evidence quoted, not assumed.

---

## 14. Next Step

```text
/akili-specify bugfix/innovation-use-draft-save
```

Run it in **Bug Mode**. `OQ-1` should be answered during specify, before any task is written — it is the one finding that can change the shape of the fix.
