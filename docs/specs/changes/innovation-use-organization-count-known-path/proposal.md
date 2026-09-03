# Proposal — Organization count belongs to the unknown-organization path only

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-organization-count-known-path` |
| Slug | `innovation-use-organization-count-known-path` — supplied as kebab-case by the user; used literally, not derived |
| Type | **Change** |
| Approval Mode | **gated** (no explicit end-to-end mandate given) |
| Depends on | none |
| Parallel-safe | **no** — edits `innovation-use-details.component.ts`, whose spec file is shared with every other in-flight Innovation Use change |
| Parent Spec | none (not a chunked family) |
| Status | **Draft** — awaiting user approval |
| Raised by | User (D. Casañas), 2026-09-03, with two in-app screenshots (known path and unknown path) |
| Escalated from | `/akili-quick` — failed the triviality gate on **control flow** (adds a conditional), **spec reversal** (contradicts an approved design decision protected by a pinning test), and **data semantics** (changes what the save payload carries) |
| Related archive | [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../../archive/2026-08-26-innovation-use--details-page/) (`§5.5`, `DD-4`, `R-IUP-008`), [`docs/specs/archive/2026-08-20-innovation-use--details-api`](../../archive/2026-08-20-innovation-use--details-api/) (`R-IUA-007`) |

---

## 2. Intent

Stop showing **Organization count** when the row identifies a *specific* institution, and stop persisting a count for such a row. The field stays exactly as it is on the unknown path.

The user's argument, in one line: *if you have named "WUR — Wageningen University and Research Centre", the answer to "how many organizations?" is necessarily one, so the question is meaningless.* On the unknown path the row names a **category** ("Research organizations and universities"), and "how many of them?" is the whole point of the field.

---

## 3. Problem / Current Behavior

`organization_count` renders on **both** identity paths of the Innovation Use organization card, and is sent to the API on both.

| | Known path (`is_organization_known === true`) | Unknown path |
| --- | --- | --- |
| Row identifies | one specific CLARISA institution | an institution **type** (+ optional sub-type / "other" name) |
| Count field | **rendered** ← the problem | rendered — correct |
| Count in payload | **sent** ← the problem | sent — correct |

**Where the behavior lives** — the whole current behavior is three lines:

| Site | Line | Today |
| --- | --- | --- |
| `innovation-use-organization-item.component.html` | 155–165 | the `app-input` sits **outside** both branches (the `@if`/`@else` closes at line 153) of the `@if (body().is_organization_known)` |
| `innovation-use-details.component.ts` → `buildOrganizationPayload` | 526 | `organization_count: row.organization_count,` — unconditional |
| `innovation-use-organization-item.component.spec.ts` | 183 | a pinning test asserting the field renders on the known path |

**This is a design decision, not an accident.** `design.md` §5.5 has a table row reading `both paths | organization_count … optional`, `tasks.md:309` repeats it, and `execution.md:731` records a reviewer (Lens B) catching that *nothing asserted it* — *"Deleting the count field from the known branch leaves the whole suite green while violating §5.5"* — which is why the pinning test at line 183 exists. Reversing this needs a spec, which is why `/akili-quick` refused it.

**What is genuinely weak in that decision:** §5.5 introduces the row with *"Field set and cascade behavior mirror the existing organization card's rules"* — but the reference card has **no `organization_count` at all**. `requirements.md:984` (RK-1) says so explicitly: *"the organization card has no `organization_count`"*. So "both paths" was inherited from nothing and carries **no recorded rationale** anywhere in the spec family. No requirement AC mandates it either; `requirements.md:583` lists the field path-agnostically, and `R-IUP-008` governs only its numeric hygiene (no negatives, no fractions).

**The section already models this correctly one card up.** `buildActorPayload` (line 487) nulls each count field on the branch that does not own it, in **both** directions:

```ts
women_youth_count: aggregate ? null : row.women_youth_count,
...
actors_count:      aggregate ? row.actors_count : null
```

`organization_count` is the **only** count field in the Innovation Use section sent unconditionally. The change makes organizations consistent with actors rather than inventing a new pattern.

---

## 4. Proposed Outcome

| Behavior | Today | After |
| --- | --- | --- |
| Count visible, unknown path | yes | yes — unchanged |
| Count visible, known path | yes | **no** |
| Count in payload, unknown path | sent | sent — unchanged |
| Count in payload, known path | sent | **`null`** |
| A value typed on the unknown path, then the box is ticked | silently persisted against the specific institution | **not** persisted — the row saves `organization_count: null` |
| Row submission / drop rules (`organizationIdentitySatisfied`) | unaffected by the count | unchanged — the count plays no part in whether a row is submitted (line 471) |
| Server contract | accepts the field on both paths | **unchanged** — the client simply stops sending it on one path |

---

## 5. Scope

**In scope — client only, two production lines:**

> ⚠️ **SUPERSEDED 2026-09-03 by `design.md` §6.1.** The Step 2.3 reversion challenge found a **third** required edit: `InnovationUseOrganizationPayload.organization_count` (`innovation-use-details.component.ts:92`) was never widened to `| null` like its four neighbours, so the payload change below does not compile under `"strict": true`. See `design.md` `DD-6`. The two rows below are correct but incomplete.

| File | Change |
| --- | --- |
| `.../innovation-use-organization-item/innovation-use-organization-item.component.html` | move the `organization_count` `app-input` inside the `@else` (unknown) branch, or wrap it in `@if (!body().is_organization_known)` |
| `.../innovation-use-details.component.ts` (`buildOrganizationPayload`) | `organization_count: known ? null : row.organization_count` |

**In scope — tests (rewrite, not delete):**

| File | Change |
| --- | --- |
| `innovation-use-organization-item.component.spec.ts:183` | invert the pinning assertion; keep a *positive* assertion that the field renders on the unknown path so the guard Lens B asked for still exists, pointing at the new rule |
| `innovation-use-details.component.spec.ts` | add a payload assertion: a known-path row carrying a count emits `organization_count: null` |

**In scope — documentation:** an amendment note on `design.md` §5.5 and `tasks.md:309` in the archived spec, in the same style the `measure-number-signed-decimal` change used (`⚠️ AMENDED …`), so the archive records that "both paths" was superseded and by what. Per **KZ-013**, grep the archive path across `docs/` before touching it.

**Explicitly NOT in scope (server):** `result_institution_types.organization_count` stays `int NULL`, `InnovationUseOrganizationDto` keeps accepting the field on both paths, `SP_versioning` keeps copying it, and the integration test `result-institution-types.service.spec.ts:301` — *"update path, `is_organization_known` branch: `organization_count` is still carried through"* — **stays valid and must not be edited**. It asserts the service persists what it is given; that remains true. No migration.

---

## 6. Non-Goals

- Relabelling the field on the unknown path ("Organization count" / "How many?" reads correctly there per screenshot #9).
- Making the field required, or deriving/forcing `1` on the known path — the proposal removes the question, it does not answer it with a hardcoded value.
- Changing the actor card, the measure card, or the shared `app-input`.
- Tightening the server DTO to reject a count on the known path. Worth considering later; it is a contract change with its own blast radius (`customSaveInnovationDev` shares helpers — see `family.md` FR-7) and does not belong in this change.
- A data backfill of historical rows (see OQ-1).

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| Users | Anyone editing Innovation Use → Innovation use details → ORGANIZATIONS with "Is the organization known?" ticked. |
| Client | 2 production lines + 2 spec files, one feature folder. Enumerated by **what renders** per **KZ-002**: the card renders `app-input` (shared) and `app-partner-selected-item` (shared) — neither is modified; only this call site's placement changes, so no other page is touched. |
| Server | **None.** No endpoint, DTO, entity, migration, or stored procedure changes. |
| Reports / OpenSearch | **None found** — `organization_count` appears in the server tree only in migrations, the entity, the DTO/service, and their tests; no report handler or `@OpenSearchProperty` consumes it. |
| Specs | Amends archived `2026-08-26-innovation-use--details-page` §5.5 / `tasks.md:309`. `R-IUP-008` (numeric hygiene) is unaffected — it still governs the field on the path where it renders. |

---

## 8. Visual Reference

- **Source:** User screenshots (2), 2026-09-03, in-session.
- **Location:** not persisted to disk; the two states are fully described in §3–§4 and are trivially reproducible in the running app (Result STAR-19911, ORGANIZATION # 1).
- **Notes:** Screenshot #8 = known path with the count visible (the state to remove). Screenshot #9 = unknown path with the count visible (the state to keep, endorsed by the user as correct). No new visual is needed — this change **removes** a control and adds no new UI.

---

## 9. Requirement Delta Preview

### ADDED

- **The count field renders only when `is_organization_known` is falsy.** Toggling the checkbox shows/hides it live.
- **`buildOrganizationPayload` nulls `organization_count` on the known path**, symmetric with the four fields it already nulls there and with `buildActorPayload`'s treatment of every count.

### MODIFIED

- `design.md` §5.5's `both paths | organization_count` row → unknown path only, with an amendment note recording the reversal and its rationale.
- The pinning test at `innovation-use-organization-item.component.spec.ts:183` → asserts absence on the known path, presence on the unknown path.

### REMOVED

- No requirement is removed. `R-IUP-008` survives unchanged (narrower surface, same rule).

---

## 10. Approach Options

| # | Approach | What it does | Verdict |
| --- | --- | --- | --- |
| **A** | **Hide + null in payload** | `@if` in the template **and** `known ? null : row.organization_count` in `buildOrganizationPayload`. | ✅ **Recommended** |
| **B** | Hide only (UI-only) | Template `@if`, payload untouched. | ❌ **Rejected — makes things worse** |
| **C** | Hide + clear on toggle | Template `@if`, and `onKnownToggle` sets `organization_count: undefined` when the box is ticked. | ❌ Rejected as a standalone |

**Why B is rejected.** `onKnownToggle` deliberately does not clear fields (*"Neither path clears the other's fields"*, mirroring §5.5), so `body().organization_count` survives the toggle. Hiding the input without nulling the payload creates a defect that does not exist today: the user types `12` on the unknown path, ticks the box, and saves a specific institution with an **invisible, unremovable count of 12**. Cheapest diff, worst outcome — and it is exactly the trap `/akili-quick` stopped at.

**Why C is rejected as a standalone.** Clearing on toggle handles the *session* case but not the *stored* case: a GET returning a legacy known-path row with `organization_count: 7` loads it into `body`, the field is hidden, no toggle fires, and the next save re-sends `7` forever. C also breaks the card's documented no-cross-clear invariant and loses data on an accidental mis-click. Option A subsumes it: nulling at the payload boundary covers both the session case and the stored case, and leaves `body` (and therefore the user's typing) untouched.

**Why A.** It is the smallest change that is *conceptually consistent*: it makes `organization_count` a path-specific field and treats it exactly as `buildOrganizationPayload` already treats the other four path-specific fields two lines below — *"Hazard (a): nulls the path the row is not using, symmetric with `buildActorPayload()`"*. The rule the code comment already states simply starts applying to one more field.

---

## 11. Recommended Approach

**Option A.** ~~Two~~ **three** production lines (see the §5 amendment), two test rewrites, one archive amendment. Route: `/akili-specify` at **Lite** depth.

---

## 12. Risks, Dependencies, And Open Questions

| # | Item | Severity | Handling |
| --- | --- | --- | --- |
| **R-1** | **Existing known-path rows lose their stored count on the next save of that result.** Option A nulls the column for any such row the moment a user re-saves — silently, from that user's point of view, since the field is no longer on screen. Under the new definition the value is meaningless, so this is cleanup rather than loss — but it is irreversible per row and must be a conscious decision. | **High** | Answer **OQ-1** before `/akili-execute`. Historical versions are safe: `SP_versioning` copied the column at version time and is not rewritten. |
| **R-2** | Reversing a decision protected by a test written *specifically* to catch its removal (`execution.md:731`). Deleting that test rather than inverting it would silently re-open the hole Lens B closed. | Medium | The spec must **rewrite** it to assert the new rule in both directions, and per **K-004** the rewritten test must be observed **failing** against the un-fixed template before it is trusted. |
| **R-3** | The server still accepts a count on the known path, so the invariant is client-enforced only. Any other API consumer could still write one. | Low | Accepted and recorded, not fixed here (§6). No other client is known. |
| **R-4** | **KZ-001** — a template `@if` is generated output. A test asserting "the field is hidden" must query the **rendered DOM**, not the component's flag. | Medium | Named as a test constraint in the spec. |
| **OQ-1** | **How many live rows have `is_organization_known = 1` AND `organization_count IS NOT NULL`?** Determines whether R-1 is theoretical or affects real reported data, and whether the change needs a heads-up to users. Not answerable from the repo — it needs a read against the shared Dev/Prod DB, which is a human-run step. Suggested query: `SELECT COUNT(*) FROM result_institution_types WHERE is_organization_known = 1 AND organization_count IS NOT NULL AND is_active = 1;` | **Open** | Must be answered before execute. If the count is 0, R-1 collapses to nothing. |
| **OQ-2** | Should the field also hide when the box is ticked but **no institution is chosen yet** (a half-filled known path)? The recommendation says **yes** — the condition keys on `is_organization_known`, not on `institution_id`, which keeps it a single boolean and matches how §5.5 already splits every other control. Flagged so the spec states it rather than leaving it to the implementer. | Low | Default: yes. Confirm at specify. |

---

## 13. Success Criteria

1. With "Is the organization known?" **ticked**, the Organization count field is **not** in the DOM.
2. With it **unticked**, the field renders and behaves exactly as today (`[min]="0"`, `[maxFractionDigits]="0"`, optional, `R-IUP-008` intact).
3. Toggling the checkbox shows/hides the field live, without a reload.
4. A known-path row whose `body` carries a count emits `organization_count: null` in the save payload.
5. An unknown-path row's count round-trips unchanged (save → GET → re-render).
6. Row drop/submission behavior is unchanged — `organizationIdentitySatisfied` never consulted the count.
7. Full client suite green; **no server file changed**, `result-institution-types.service.spec.ts:301` untouched and still passing.
8. `design.md` §5.5 and `tasks.md:309` in the archived spec carry an amendment note; no dangling reference to "both paths" survives (`grep` per KZ-013/K-003).

---

## 14. Next Step

```text
/akili-specify docs/specs/changes/innovation-use-organization-count-known-path
```

Lite depth. Answer **OQ-1** (the DB count) before `/akili-execute`; **OQ-2** can be settled inside specify.
