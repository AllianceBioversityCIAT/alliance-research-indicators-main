# Tasks — My PI Delegates (Frontend / STAR)

- **Module:** my-pi-delegates-ui (client only) · **Spec id:** 2026-09-my-pi-delegates-ui
- **Linked:** ./requirements.md · ./design.md · ./proposal.md
- **Backend:** shipped + archived (`archive/2026-09-11-changes--my-pi-delegates`). GETs (by-project/by-person enriched), POST (sync), DELETE (bulk) exist. **People + Projects picker endpoints do NOT exist → stubbed (T-UI-08); user wires later.**
- **Scope:** the two tabs (By-project default + By-person) with enriched tables + per-row "X" + search, and the Assign/Edit modal (reuse `app-modal`, inner = 2 `app-multiselect`, SYNC-aware). **History panel deferred** (no read endpoint).
- **Last updated:** 2026-09-11

## 1. Dependency graph
```mermaid
graph TD
  U01[T-UI-01 API methods + interfaces] --> U02[T-UI-02 Client service (signals cache)]
  U02 --> U04[T-UI-04 Page shell + tabs + summary]
  U04 --> U05[T-UI-05 By-project tab + row X + search]
  U04 --> U06[T-UI-06 By-person tab + row X + search]
  U08[T-UI-08 Stub picker sources] --> U07
  U02 --> U07[T-UI-07 Assign/Edit modal (SYNC)]
  U04 --> U03[T-UI-03 Nav entry + lazy route]
  U05 --> U09[T-UI-09 Tests]
  U06 --> U09
  U07 --> U09
```

## 2. Requirement → task coverage
| Requirement | Task(s) |
| --- | --- |
| R-UI-001 (nav + route) | T-UI-03 |
| R-UI-002 (By-project default) | T-UI-04, T-UI-05 |
| R-UI-003 (By-person) | T-UI-06 |
| R-UI-004 (summary counters) | T-UI-04 |
| R-UI-005/006/007 (assign/edit SYNC + confirm) | T-UI-07 |
| R-UI-008 (revoke row "X") | T-UI-05, T-UI-06 |
| R-UI-010 (single source of truth) | T-UI-02 |
| NFR-UI-001/002/003 (tokens, a11y, states) | T-UI-05/06/07 + T-UI-09 |
| picker endpoints (stub) | T-UI-08 |

## 3. Tasks

### T-UI-01 — API methods + response interfaces
- **Covers:** the 4 shipped endpoints.
- **Files:** `shared/services/api.service.ts` (+ `shared/interfaces/pi-delegates.interface.ts`).
- **Desc:** `GET_PIDelegatesByProject(projectId)`, `GET_PIDelegatesByDelegate(delegateUserId)` (both **query-param**), `POST_PIDelegates({assignments})`, `DELETE_PIDelegates(body)` — via `this.TP.*`, `MainResponse<T>`. Interfaces mirror the backend response DTOs (`ProjectDelegates`, `DelegateProjects`, `DelegateSummary`, `ProjectSummary`).
- **Done:** [x] methods compile + typed; [x] `by-delegate` uses `?delegate_user_id=`; [x] DELETE carries a body (2 shapes).
- **Effort:** S · **Skills:** angular-developer · **Status:** [x] PASS (2026-09-11)

### T-UI-02 — Client feature service (signals, single source of truth)
- **Covers:** R-UI-010.
- **Files:** `pages/platform/pages/my-pi-delegates/services/pi-delegates.client.service.ts` (+spec).
- **Desc:** signals `byProjectCache`/`byPersonCache`/`loading`/`error`; `assign(assignments)` (POST→refetch), `revokePair(projectId, delegateUserId)`/`revokeById` (DELETE→refetch). ONE cache feeds both tabs + counters — no second mutated copy (KZ-002).
- **Done:** [x] after a write, state comes from a refetch (not an optimistic divergent copy); [x] loading/error modeled.
- **Dep:** T-UI-01 · **Effort:** M · **Skills:** angular-developer · **Status:** [x] PASS (2026-09-11) · ⚠ carries advisory: `byPersonCache` refresh deferred to T-UI-06

### T-UI-03 — Nav entry + lazy route
- **Covers:** R-UI-001.
- **Files:** `shared/components/alliance-sidebar/alliance-sidebar.component.ts`, `app.routes.ts`.
- **Desc:** add a **"Principal Investigator"** group → **"My PI Delegates"** child (icon), mimic the existing group/resource pattern (do NOT rename existing items); lazy `loadComponent` route under the platform shell + existing auth guard. Visibility = eligibility-driven (≥1 managed project) or authenticated + page empty-state.
- **Done:** [x] entry renders + routes; [x] no existing nav item renamed/removed.
- **Dep:** T-UI-04 · **Effort:** S · **Skills:** angular-developer · **Status:** [x] PASS (2026-09-11) · advisory: sidebar hex-detox is a separate task

### T-UI-04 — Page shell + tabs + summary header
- **Covers:** R-UI-002 AC.1, R-UI-004.
- **Files:** `my-pi-delegates.component.{ts,html,scss,spec.ts}` (default export standalone).
- **Desc:** `p-tabView` — **By-project (default)** + **By-person**; tab state persists (signal). Summary header: Total PI projects · People in review team (distinct) · Projects without a delegate — all `computed` from the T-UI-02 cache; refresh after writes without full reload. STAR tokens; loading/empty/error states.
- **Done:** [x] opens on By-project; [x] counters correct + reactive; [x] no hex.
- **Dep:** T-UI-02 · **Effort:** M · **Skills:** angular-developer, ui-ux-pro-max · **Status:** [x] PASS (2026-09-11) · swap point `getProjectIds()` → T-UI-08

### T-UI-05 — By-project tab (enriched table + row "X" + search)
- **Covers:** R-UI-002, R-UI-008, NFR-UI-002.
- **Files:** `tabs/by-project/by-project.component.{ts,html,scss,spec.ts}`.
- **Desc:** `p-table` of the enriched payload — code, name, pool-funding (**icon/text, not colour-only**), status, start/end date, delegates cell (name+email chips). Per-row **X** on a delegate → confirm → `DELETE {project_ids:[code], delegate_user_ids:[id]}` → refetch. No-delegate row → "No PI Delegate assigned" **non-colour cue**. Search filters rows **by person or project** (`computed`). An "Assign" affordance opens the modal pre-filled to that project (→ T-UI-07).
- **Done:** [x] table renders enriched fields; [x] row X revokes + refetches; [x] search filters; [x] no-colour-only cue.
- **Dep:** T-UI-04 · **Effort:** M · **Skills:** angular-developer, ui-ux-pro-max · **Status:** [x] PASS (2026-09-11)

### T-UI-06 — By-person tab (enriched table + row "X" + search)
- **Covers:** R-UI-003, R-UI-008.
- **Files:** `tabs/by-person/by-person.component.{ts,html,scss,spec.ts}`.
- **Desc:** `p-table` of person (name+email) + their projects (code+name chips). Per-row **X** on a project → `DELETE {project_ids:[code], delegate_user_ids:[personId]}` → refetch. **Must NOT** show projects the user doesn't manage (R-UI-003 AC.2). Search by person or project. Opening Assign pre-fills that person (→ T-UI-07).
- **Done:** [x] renders person→projects; [x] row X revokes; [x] no unmanaged projects shown.
- **Dep:** T-UI-04 · **Effort:** M · **Skills:** angular-developer, ui-ux-pro-max · **Status:** [x] PASS (2026-09-11) · **refinement:** by-person = `computed` inversion of `byProjectCache` (dissolves T-UI-02 advisory; **reconcile design §5/§6 at archive**)

### T-UI-07 — Assign/Edit modal (reuse `app-modal`, SYNC-aware)
- **Covers:** R-UI-005, R-UI-006, R-UI-007.
- **Files:** `assign-modal/assign-pi-delegate.component.{ts,html,scss,spec.ts}`; register in `shared/components/all-modals/all-modals.component.{ts,html}`; new `ModalName` in `shared/types/modal.types.ts`.
- **Desc:** **inner content only** — two `app-multiselect`s (People, Projects; searchable). Self excluded (R-UI-005 AC.3). Accept **disabled until ≥1 person AND ≥1 project** (→ modal `disabledConfirmIf`). **SYNC:** pre-load current delegates (from By-project) or current projects (from By-person) so Save never revokes by accident; build `assignments` = each selected project's **full desired delegate list** → `POST`. **Confirmation names ADDED and REMOVED** (the sync delta) before write; success toast; error → error state + refetch.
- **Named red input:** open on a project with existing delegates, select a subset → confirm must list the ones being **removed**; deselect all → "revoke all" is explicit, not silent.
- **Done:** [x] reuses `app-modal` (no bespoke modal); [x] Accept gated; [x] pre-load prevents accidental revoke; [x] confirm shows add+remove delta; [x] POST sends per-project full lists.
- **Dep:** T-UI-02, T-UI-08 · **Effort:** XHIGH · **Skills:** angular-developer, ui-ux-pro-max · **Status:** [x] PASS (2026-09-14, 2 attempts — parallel lens review; tokens FAIL→fixed)

### T-UI-08 — Stub the People + Projects picker sources
- **Covers:** DD-UI-STUB (endpoints user-provided-later).
- **Files:** a single stub source (control-list entry or a static signal) behind one swap point.
- **Desc:** back both `app-multiselect`s with a clearly-marked stub returning empty/mock data, isolated so swapping in the real service later is a one-line change. `// TODO(user endpoint)` markers. No picker data hardcoded into components.
- **Done:** [x] multiselects render from the stub; [x] one documented swap point; [x] no component depends on stub-specific shape.
- **Effort:** S · **Skills:** angular-developer · **Status:** [x] PASS (2026-09-11) · swap point: `pi-delegate-picker-stub.service.ts` `signal([])` + locator cases `piDelegatePeople`/`piDelegateProjects`

### T-UI-09 — Tests
- **Covers:** R-UI-002/003/005/006/007/008/010, NFR-UI-002/003.
- **Files:** co-located `*.spec.ts` for the page, both tabs, the modal, the service.
- **Desc:** service single-cache derivation (no drift, KZ-002); By-project/By-person render + row-X revoke calls the right `DELETE` body; search filters; assign modal — Accept gating, pre-load, the add+remove **delta** in confirm, POST payload shape (per-project full lists); a11y markup asserts (non-colour cue present — rendered contrast is a human/T6 check, KZ-001); states arranged as the **transition** (K-015).
- **Disqualifies:** a stub child that doesn't evaluate what the real one does (K-001); asserting the modal end-state without arranging the open→edit transition (K-015).
- **Done:** [x] `npm run test:coverage` green + floors met (40/20/45/30) — 6869/6869, 97.97/95.66/98.28/97.45; [x] `npx tsc -p tsconfig.spec.json --noEmit` clean (module files; sidebar 7 errors pre-existing baseline).
- **Dep:** T-UI-05, T-UI-06, T-UI-07 · **Effort:** M · **Skills:** angular-developer, tdd · **Status:** [x] PASS (2026-09-14)

## 4. Estimated & strategy
~9 client tasks · ~2 review rounds · **client-only** (no server change; the backend is shipped). First task: **T-UI-01**.

## 5. Risks & open items
| # | Item | Note |
| --- | --- | --- |
| RB-1 | Accidental mass-revoke via SYNC | Mitigated by pre-load + add/remove delta confirm (T-UI-07) |
| RB-2 | Picker endpoints missing | Stubbed (T-UI-08); user wires later — swap point isolated |
| RB-3 | Design fidelity (mockup ≠ STAR) | Use STAR tokens/components; no hex (NFR-UI-001) |
| RB-4 | a11y colour-only | Non-colour cues (NFR-UI-002); rendered contrast = human/T6 |
| OQ-UI-2 | Exact nav label/placement in the PI area | Confirm during T-UI-03 |
| — | History panel | Deferred (no read endpoint); separate later increment |

## 6. Done definition
- [x] T-UI-01…09 done.
- [x] Two tabs (By-project default + By-person), enriched tables, per-row "X" revoke, search by person/project.
- [x] Assign/Edit reuses `app-modal` + two `app-multiselect`s; SYNC-aware with pre-load + add/remove delta confirm; Accept gated.
- [x] STAR tokens only, no hex; non-colour a11y cues; loading/empty/error/success states.
- [x] Single signals cache feeds all views (no drift). Coverage floors met.
- [x] Picker sources stubbed behind one swap point (user endpoints pending).

> **✅ SPEC COMPLETE (2026-09-14):** 9/9 tasks PASS. Full suite 6869/6869 green; coverage floors met; module spec files tsc-clean. See `execution.md` Summary + carried items for `/akili-validate` → `/akili-archive` (notably: reconcile design §5/§6 for the By-person inversion refinement).
