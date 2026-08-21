# Design — Innovation Use drafts must save while incomplete

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-draft-save` |
| **Depth** | Lite · Bug Mode |
| **Requirements** | [`./requirements.md`](./requirements.md) |
| **Proposal** | [`./proposal.md`](./proposal.md) — option **A** confirmed |
| **Migration** | **None** |
| **Skills loaded** | `nestjs-expert` (server), `angular-developer` (client). `software-architect` **not** loaded — no new module, integration, data flow, or topology change |
| **Leader deviation** | Phase gates combined into one presentation (see `requirements.md` Document Control) |

---

## 2. Executive Summary

Delete one server guard, drop one condition from one client `if`, and stop rendering one duplicate message. Nothing is added, nothing is moved, and no shared code is touched.

---

## 3. The change

### 3.1 Server — `result-innovation-use.service.ts`

Remove the call at `:183` and the `validateLevelExplanation` method at `:307-326`. Nothing else in the service references it, so no other control flow shifts.

> ⛔ **Corrected 2026-08-21 at T-01's review — this paragraph asserted a falsehood.** It read: *"The surrounding effective-explanation resolution (`:168-171`, key-present ? payload : stored) is **unchanged** — it is what makes the never-typed case preserve the stored value."*
>
> **`:168-171` is not what preserves the stored value, and never was.** The write at `:216-222` uses the **raw DTO value**, not the resolved one. Preservation comes from **step 6's partial merge**: an omitted key is `undefined`, which TypeORM's `UpdateQueryBuilder` omits from the `SET` list. The resolution at `:168-171` **never reached the write** — its only consumer was the validator being deleted, so after the deletion it is **dead code**. The service's own DD-14 comment at `:212-215` already said this; the design doc contradicted a comment sitting eleven lines from the code it described.
>
> **Consequence:** `:168-171` carries no behaviour to protect. T-01's scope instruction to leave it untouched was therefore based on a false premise, and it produced retained dead code (`_effectiveExplanation`) whose deletion is directed by the T-01 review — see `execution.md` → *T-01* → *Reviewer directive*.

### 3.2 Client — `innovation-use-details.component.ts`

Remove `!this.justificationMissing()` from the save gate at `:497-503`. The other four conditions stay. `justificationMissing()` itself at `:173` **stays** — the template's required message is driven by it, and R-IUD-003 keeps that message.

`buildPayload` at `:394` is **not touched** — see **DD-3**.

### 3.3 Client — the duplicate message

**Make the two messages disjoint rather than suppressing one.** *(Corrected 2026-08-21 after T-02 attempt 1 — this paragraph prescribed suppression, which this spec's own falsifying input forbids. See `requirements.md` §6 R-IUD-003 for the full correction.)*

`app-textarea`'s untrimmed `isInvalid()` already owns the **raw-empty** cases (`undefined`, `null`, `''`) and is silent on whitespace. Gate the page-owned block on the complementary subset — **whitespace-only**, i.e. `justificationMissing()` AND a non-empty raw value — and the two sources become mutually exclusive by construction: exactly one message, never zero, never two. `app-textarea`'s bindings stay **untouched**, which satisfies **DD-2** and R-IUD-003 AC.6 without needing a suppressing input at all.

---

## 4. Why deletion and not relocation

The obvious-looking alternative — keep the method, gate it on "is this a submit" — **cannot be built**, and this is the design's load-bearing finding.

| Question | Answer |
| --- | --- |
| Does submission call `ResultInnovationUseService`? | **No.** It goes through `result-status-workflow`, which dispatches `completenessValidation` by name from workflow config |
| So where would a relocated check live? | Nowhere. A `isSubmitting` parameter would never be passed `true` |
| Is the rule then unenforced? | **No.** It is already in `innovation_use_validation` (`… AND IF(useLevel >= 6, explanationValid, TRUE) …`), which **is** the `innovation_use` green check, which gates the Submit button |

The rule already lives at the submit boundary. The save-time throw was a second copy in the wrong place, and the correct action on a duplicate in the wrong place is removal.

---

## 5. Design decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| **DD-1** | **Delete the guard rather than enable `completenessValidation` on `DRAFT → SUBMITTED`** (option A over A′) | `proposal.md` §15: the flag is `false` on that transition for **every** indicator, so enabling it for indicator 6 alone would make one indicator stricter than five, enforce *all* green checks rather than this rule, and require a write to the shared non-disposable dev DB. A platform gate belongs on for all six or none — that decision is bigger than a bugfix and is **filed, not actioned** |
| **DD-2** | **Do not edit `TextareaComponent`** | T-09's ruling, on blast-radius grounds, and it still holds. The shared component renders across the app; a required-message change there is a platform change. **Leave its bindings alone entirely** and make the page-owned block cover only the complementary case (§3.3) — *corrected 2026-08-21; this cell previously ended "Suppress from the call site instead", which the falsifying input rules out. The decision itself is unchanged; only the prescribed mechanism was wrong* |
| **DD-3** | **Do not add a trim to `buildPayload`** | It looks like a cleanup and is a **bug**. Trimming to `undefined` omits the key; the server's *key-present ? payload : stored* rule then preserves the old value, so a user deleting their justification would find the deletion did not persist. Whitespace reaching the column is harmless because `valid_text` strips all whitespace before measuring — the green check already reads it as absent |
| **DD-4** | **Keep `justificationMissing()`** even though it leaves the save gate | It still drives the page-owned required message — **one of two disjoint sources R-IUD-003 keeps**, not "the surviving one" *(phrasing corrected 2026-08-21; both message sources survive, each owning a complementary case)*. Only its use *in the gate* is removed |
| **DD-5** | **Keep the `hasDuplicateActorType()` save block** | A duplicate actor type is invalid data the server rejects (R-IUP-009); blocking it client-side is mirroring, which the PRD requires. Different category from an unfinished draft |
| **DD-6** | **The regression fixture asserts both halves** — the save succeeds **and** the green check stays `false` | Asserting only the save cannot distinguish *"the bug is fixed"* from *"all enforcement is gone"*. One assertion, two failure modes, is not a gate |

---

## 6. Reversion challenge (Step 2.3)

**Triggered.** DD-1 removes a guard the codebase already ships — chunk 2 authored `validateLevelExplanation` deliberately, and it has five unit tests and a dedicated fixture. The question: **what does removing it break?**

| Candidate breakage | Verdict |
| --- | --- |
| An incomplete result becomes submittable | **No.** `innovation_use_validation:134` keeps the rule, and the client gates Submit on all green checks — **confirmed empirically by the reporter**: the button activates only when every tick is green, and the transition then succeeds |
| The server loses its only defense on `DRAFT → SUBMITTED` | **Partly true, and it is the real cost.** `completenessValidation` is `enabled: false` on that transition, so after the deletion the justification is client-gated on a first submit — exactly like every other completeness rule already is. **The guard was an anomaly, not a floor.** Recorded as the accepted trade-off and filed as a platform finding |
| Whitespace reaches the database | **True and harmless.** `valid_text` strips all whitespace; `NULL`, `''` and `'   '` all read as absent |
| A stored justification gets wiped | **No** — but *(corrected 2026-08-21)* by a different mechanism than this row originally named. It read *"`:168-171` preserves the stored value"*; the actual mechanism is **step 6's partial merge** — the never-typed case omits the key, and TypeORM's `UpdateQueryBuilder` omits an `undefined` from the `SET` list. `:168-171` never reached the write. The conclusion is unchanged, and it is still why DD-3 refuses the trim. **Proven at the real-MySQL tier** by `innovation-use-section-round-trip.fixture-spec.ts:955` + `:1008-1014`, which PATCHes with the key omitted and reads the column back by raw SQL |
| `REVISED → SUBMITTED` loses enforcement | **No.** Row id 30 has `completenessValidation` `enabled: true`; that path is untouched |

**Outcome: the challenge names one real cost** — server-side first-submit enforcement of this one field, which was unique on the platform and is now consistent with it. **No design change required.** The cost is stated in `requirements.md` §4 *Out of scope* and carried as the filed finding.

---

## 7. Budget (Step 2.4)

| | Original estimate | **Re-baselined 2026-08-21** | Actual |
| --- | --- | --- | --- |
| **Tasks** | 3 | 3 | 3 |
| **LOC (net)** | ~180 | **~300** | **295** (T-01 199 + T-02 96) |
| **Review rounds** | ~4 | ~4 | **3** (T-01 ×1, T-02 ×2) |

**Re-baselined by user ruling after the tripwire fired at 295 net (+64% over ~180).** The escalation happened as designed — the number's job was to force a stop, and it did.

**Cause, diagnosed not guessed: spec-tier density, not scope creep.** The production change landed at **≈ −30 net**, which is *exactly* the original estimate. The entire overrun is test authoring: 384 lines in the boundary-fixture redesign, 288 in the unit spec, 123 in the fifth file the cited-site list missed. **This is the same diagnosis the sibling spec `innovation-use/details-page` recorded across eight tasks** — every task shipping new spec files over-runs, and the over-run is always in the test tier while implementation lines track the estimate closely. Third occurrence in this project.

**What the original tripwire got wrong, worth carrying into the next estimate:** it predicted the right *cause* — *"the likely cause would be the boundary fixture"* — but bound the trigger to **review rounds**, which came in **under** budget (3 of ~4). LOC is what breached. A tripwire is only as good as the axis it watches, and the axis that fails is the one the estimate was weakest on.

> **Tripwire, re-baselined.** Actuals above **~380** net or beyond **6** review rounds stop execution and escalate.

### Deferred by user ruling, 2026-08-21 — not oversight

The T-01 review left two items open. **Both were deliberately deferred to prioritise a stable test deployment**, on the user's explicit instruction that the deploy is to show progress and iteration continues afterward. **Neither affects runtime behaviour:**

| Item | Why deferring is safe |
| --- | --- |
| Remove `_effectiveExplanation` + three stale rationale paragraphs (`result-innovation-use.service.ts:263-264`, `:269-271`, `:278-284`) and the false comment at `innovation-use-section-round-trip.fixture-spec.ts:992-994` | Deleting an unused variable and correcting comments. **Zero functional effect.** `tasks.md` T-01 scope item 1 is already amended to permit it |
| **`ADVISORY R1`** — assert that `result_status_workflow` row **id 30** dispatches `completenessValidation` with `enabled: true` | **Test-only.** It closes a *future* exposure (a migration flipping the flag would leave every test green), not a present defect. The Reviewer called it the single highest-value addition, and it stays owed |

**R1 is the one to pick up first when iteration resumes** — it is the only unasserted premise in R-IUD-002's chain.

---

## 8. Test strategy

| Tier | Job |
| --- | --- |
| **Server unit** | Invert the five rejection tests (`:284, 559, 575, 688, 1136`). Each must assert the **positive** outcome — the save proceeds, child services are called, values are written — never merely that nothing threw (**KZ-001**) |
| **Server fixture (Bug Mode)** | Redesign `innovation-use-level-boundary.fixture-spec.ts` around the mirror assertion: **save accepts, green check stays `false`, `REVISED → SUBMITTED` still rejects.** Red before the fix, green after, recorded verbatim |
| **Client unit** | Invert T-09 c5's assertions to *"one `PATCH` issued **and** the message renders"*. Add the message-count assertions of R-IUD-003 (1 / 1 / 0) |
| **Full suites** | `npm test -- --silent` in **both** packages, unfiltered. A filtered run is inconclusive (**KZ-003**) |

**Harness pre-flight (KZ-004) already done** at proposal time: `test:fixtures`, `docker-compose.test.yml`, `scripts/load-baseline.js`, `orm.test.config.ts` and `src/db/baseline` all present, Docker active, and chunk 2 ran the tier green twice. No waiver is needed.

---

## 9. Rollout

- **One PR, both tiers.** Server deploys first per `docs/infrastructure.md`, which makes the intermediate window server-only — the harmless half (the client still refuses to send, so nothing changes for users until the client lands).
- **No migration, no feature flag, no data backfill.**
- **Backout:** revert the commit. Rows saved with a blank justification stay valid — the column is nullable and their green check is already `false`, so restoring the guard makes them un-saveable again but corrupts nothing.
- **No comms needed.** The change only *adds* the ability to save.
