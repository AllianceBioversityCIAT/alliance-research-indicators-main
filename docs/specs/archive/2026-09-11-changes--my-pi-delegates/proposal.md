# Proposal — PI Delegates (v2 · relational, backend-only)

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/my-pi-delegates/` |
| Slug | `my-pi-delegates` |
| Type | **Change** (backend-only) |
| Approval Mode | **gated** |
| **Supersedes** | **v1 of this spec** (role-based "PI Delegate" role + full STAR screen). v1 is withdrawn — see Requirement Delta. |
| Depends on | none |
| Parallel-safe | no (touches the shared PI-determination path) |
| Related | AC-1733; existing `isPi()` in `result-status-workflow.repository.ts` |
| Status | Draft — awaiting approval |

**Terminology:** *PI* = Principal Investigator (project lead). *PI Delegate* = a user recorded in the new **`pi_delegates`** table as authorized to act with PI capabilities on a project. **There is no role** — delegation is purely a relational fact.

---

## Intent

Let a project's work be reviewed by a **PI Delegate** with the **minimum possible change**: store the delegation as a row in a new **`pi_delegates`** table, and make the **existing** PI-determination logic return `true` for a delegate too. No role, no RBAC, **no frontend change** — every existing consumer keeps working because "is this user a PI here?" simply starts answering yes for delegates.

---

## Problem / Current Behavior

Two **separate backend functions** answer "is this user the PI of this result's project?", and **both** feed behavior a delegate must inherit:

| # | Function | File | Consumed by | Effect |
| --- | --- | --- | --- | --- |
| 1 | `isPi(resultId, userId)` | `result-status-workflow/repositories/result-status-workflow.repository.ts:181` | `isPiValidation` (`function-handler.service.ts:216`) | **Authorization** for status-change/submission — throws `Forbidden` if false |
| 2 | `queryPrincipalInvestigator(user, result)` | `shared/const/gloabl-queries.const.ts:1` | `metadataPrincipalInvestigator` → `results.service.ts:830` `is_principal_investigator` | **Metadata flag sent to the client** — the frontend uses it to show PI capabilities |

> **⚠️ Key correction to the original plan:** the client's PI capabilities derive from **#2**, *not* from `isPi()` (#1). **Modifying only `isPi()` would grant backend authorization but leave the frontend still treating the delegate as non-PI.** To achieve "delegate behaves like a PI **without touching frontend**", **both #1 and #2 must be extended** (both are backend-only). This is the one substantive change to the brief.

Neither function knows about delegates today; there is no `pi_delegates` table.

**Confirmed reusable building blocks:**
- `createUserInSecUsers(newUser)` + `findUserByEmailOrCarnet(...)` (`results/repositories/result.repository.ts:593/571`) — the **existing** "create sec_user if missing" mechanism (email = identity; `status_id=1`, `is_active=true`; `carnet` optional).
- The generated-column partial-unique pattern (`1779190000014-fix…`) for the no-duplicate constraint.
- `AuditableEntity`, `@ApiTags` controller conventions, migration filename pattern.

---

## Proposed Outcome

1. New **`pi_delegates`** table: `(project_id, pi_user_id, delegate_user_id)` + audit, **unique** active `(project_id, delegate_user_id)`.
2. **CRUD** (migration → entity → DTO → repository → service → controller) following existing conventions, to create/list/verify/update/revoke delegations.
3. On **create**: find the delegate in `sec_users`; if absent, create it via the **existing** `createUserInSecUsers` mechanism **first**, then insert the `pi_delegates` row — **in one transaction** (never a delegation pointing at a non-existent user).
4. **Extend both PI-determination paths** to also return `true`/`is_principal=true` when `userId` is an active delegate of the result's primary project:
   - `isPi()` — after the existing PI check returns false, check `pi_delegates`.
   - `queryPrincipalInvestigator()` — same delegate fallback, so the client flag reflects it.
5. Result: **PI → true · PI Delegate → true · anyone else → false**, for both functions. Existing behavior for a real PI is unchanged; `pi_delegates` is only consulted when the PI check is false.

---

## Scope

**In scope (backend only):** `pi_delegates` table + migration; entity/DTO/repository/service/controller CRUD; find-or-create `sec_user` (transactional); the delegate fallback added to `isPi()` **and** `queryPrincipalInvestigator()`; unit + e2e tests.

**Non-goals:** any role or roles-table change; any RBAC permission; **any frontend change** (components, guards, results-permission logic); a separate public `isPiDelegate()` that consumers must call; changing how a *real* PI is identified.

---

## Non-Goals (explicit, per the brief)

- ❌ Create a "PI Delegate" role / modify the roles table / add role assignments or permissions.
- ❌ Modify the frontend **to make a delegate behave like a PI** (that is achieved backend-only via the two PI functions).
- ❌ Reinvent or duplicate PI identification — reuse the existing joins.
- ❌ A parallel public method that changes the contract consumers rely on.

> **Frontend management screen — separate spec.** The **"My PI Delegates" STAR screen** (where a PI creates/lists/revokes delegations) is documented in **`docs/specs/changes/my-pi-delegates-ui/`** (depends on this spec). That UI needs **three read endpoints this backend spec should absorb when the UI is scheduled**: (1) *list my PI projects + their delegates*, (2) *eligible-users* picker, (3) *history list*. The core CRUD + the `isPi`/metadata extension in this spec do **not** depend on the UI and ship first.

---

## Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| PI | Can delegate PI capabilities on their projects (via the CRUD API). |
| PI Delegate | Gains PI capabilities (authorization + client flag) with no role. |
| Server — `isPi` | +delegate fallback (behavior-preserving for real PIs). |
| Server — `queryPrincipalInvestigator` | +delegate fallback (so the client flag reflects delegation). |
| Server — new `pi_delegates` module | table + CRUD + sec_user find-or-create. |
| **Frontend** | **None.** |
| Roles/RBAC | **None.** |

---

## Visual Reference

- Source: **None** (backend-only; no UI in this scope). The prior mockup is not used here.

---

## Requirement Delta Preview

### ADDED
- `pi_delegates` table (relational source of truth) + unique-active constraint.
- CRUD API for delegations following existing conventions.
- Transactional find-or-create of the delegate in `sec_users` before inserting the delegation.
- Delegate fallback inside **both** `isPi()` and `queryPrincipalInvestigator()`.

### MODIFIED
- `isPi(resultId, userId)`: now returns true for a real PI **or** an active delegate of that result's project.
- `queryPrincipalInvestigator()`: `is_principal` now true for a real PI **or** an active delegate.

### REMOVED (withdrawing v1)
- The "PI Delegate" **role** and any roles-table/RBAC change.
- The entire **STAR frontend** (My PI Delegates screen, By-project/By-person, assign panel, history panel, guard, nav, eligibility endpoint).
- The `sec_user_id`-keyed `project_users`/`pi_delegates` *screen model* and the separate `isPiDelegate` guard on the status workflow.

---

## Approach Options

| # | Approach | Pros | Cons |
| --- | --- | --- | --- |
| **A (recommended)** | New `pi_delegates` table + extend **both** `isPi()` and `queryPrincipalInvestigator()` with a delegate fallback; CRUD + transactional sec_user create | Truly achieves "delegate behaves like PI **with zero frontend change**"; minimal; reuses existing logic | Touches two correctness-critical PI functions (system-wide authz + client flag) |
| **B** | Extend **only** `isPi()` | Even smaller | **Fails the intent** — frontend still shows delegate as non-PI (flag comes from #2), so delegate can't act in the UI |
| **C** | Role-based (v1) | — | Explicitly rejected by the user (roles, frontend, larger blast radius) |

---

## Recommended Approach

**Option A.** One migration + one small module + a delegate fallback added to the two existing PI queries + transactional sec_user create. `pi_delegates` is the single source of truth; a real PI's path is unchanged and only falls through to the delegate check when false. **Both** PI functions are extended so the "no frontend change" guarantee actually holds.

---

## Risks, Dependencies, And Open Questions

**Risks**
- **R1 (correctness-critical):** `isPi()` and the PI metadata flag gate results actions across the system. A wrong delegate fallback could over- or under-grant. Mitigation: fallback only fires when the real-PI check is false; keep the existing PI query byte-for-byte; cover PI-unchanged + delegate + neither with tests; all existing `isPi` tests must stay green.
- **R2:** the two functions identify the PI *differently* (`isPi` via `projectLeadId`; `queryPrincipalInvestigator` via `project_lead_description` name-match). The **delegate** lookup added to each is the same (`pi_delegates` by project + `sec_user_id`), but each must resolve *its own* result→project the way it already does.
- **R3:** migration must be **applied** to the shared Dev DB — a merge does not apply it (K-015).

**Open Questions**
- **OQ-A:** Confirm extending **both** PI functions (Option A) vs only `isPi()` (Option B). *Recommended: A.*
- **OQ-B:** `pi_delegates` keyed by **project** (`agresso_contracts.agreement_id`) so a delegate covers all of a project's results (mirrors how the PI works) — confirm (vs per-result).
- **OQ-C:** Who may call the CRUD (which caller can create a delegation)? Since roles/guards are out of scope, confirm the authorization expectation for the management endpoints.
- **OQ-D:** For a delegate **not** in `sec_users`, what input identifies them (email + names)? Needed for `createUserInSecUsers`.

---

## Success Criteria

- A real PI: `isPi()` and `is_principal_investigator` both **unchanged** (true), and `pi_delegates` is **not** consulted.
- An active delegate of the project: **both** return true.
- Anyone else: both false.
- A delegation never points at a non-existent `sec_user` (transactional create-then-associate).
- No duplicate active delegation per `(project, delegate)`.
- **No role created; no roles-table change; no frontend file changed;** existing `isPi` tests still green.

---

## Next Step

```text
/akili-specify docs/specs/changes/my-pi-delegates
```

Re-align `requirements.md`, `design.md`, `tasks.md` to this v2 scope (and mark the prior `judgment.md` as pertaining to the superseded v1). Resolve OQ-A…OQ-D during specify.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
