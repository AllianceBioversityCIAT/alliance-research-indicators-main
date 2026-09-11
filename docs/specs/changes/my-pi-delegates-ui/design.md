# Design — My PI Delegates (Frontend / STAR)

- **Module:** my-pi-delegates-ui (client `research-indicators` only)
- **Spec id:** 2026-09-my-pi-delegates-ui · **Depth:** Standard
- **Requirements:** ./requirements.md · **Proposal:** ./proposal.md (see the 2026-09-11 alignment) · **Backend (shipped):** `archive/2026-09-11-changes--my-pi-delegates`
- **Last updated:** 2026-09-11

## 1. Executive summary

A STAR page **My PI Delegates** under a new **Principal Investigator** sidebar section. Two tabs — **By-project** (default) and **By-person** — each an enriched `p-table` with a per-row **"X"** that revokes directly (`DELETE`). An **Assign/Edit** flow reuses the existing `app-modal` (only the inner content is new: two `app-multiselect`s — people × projects, both searchable) and writes via `POST` **per-project SYNC**. History panel is **deferred** (no read endpoint yet). The people/projects picker data sources are **stubbed** until the user wires their endpoints.

## 2. STAR patterns reused (from the codebase map)

| Concern | Reuse | File anchor |
| --- | --- | --- |
| Page shell (standalone, lazy) | mimic `my-projects` | `pages/platform/pages/my-projects/` + `app.routes.ts` `loadComponent` |
| Tabs | PrimeNG `p-tabView` / `p-tabPanel` | (as in `notifications.component.html`) |
| Sidebar entry | a collapsible group `{id,label,icon,children:[{label,link}]}` | `shared/components/alliance-sidebar/alliance-sidebar.component.ts` + `administration-nav.interface.ts` |
| Modal | `app-modal` (do NOT build one) | `shared/components/modal/modal.component.ts` + host `all-modals/all-modals.component.html`; open via `AllModalsService.openModal(name)`; register a new `ModalName` |
| Multiselect | `app-multiselect` (searchable, virtual scroll) | `shared/components/custom-fields/multiselect/multiselect.component.ts` |
| HTTP | `ApiService` → `ToPromiseService`; `MainResponse<T>` envelope, unwrap `res.data` | `shared/services/api.service.ts` |
| Table + row delete | `p-table` + `pi pi-times` action button | `.../portfolio-management/portfolio-management.component.html` |
| State | signals (`signal`/`computed`/`effect`), tokens `.abc-*`/`.atc-*`/`var(--ac-*)`; no hex | e.g. `sdg-management.component.ts` |

## 3. Directory structure (client)
```
pages/platform/pages/my-pi-delegates/
  ├─ my-pi-delegates.component.ts|html|scss|spec.ts   # page shell + p-tabView (default export)
  ├─ tabs/
  │   ├─ by-project/by-project.component.*             # enriched table + row X + search
  │   └─ by-person/by-person.component.*               # enriched table + row X + search
  ├─ assign-modal/assign-pi-delegate.component.*        # INNER content only (2 app-multiselect + confirm)
  └─ services/pi-delegates.client.service.ts (+spec)    # signals cache + API calls
shared/services/api.service.ts                          # + GET/POST/DELETE PI-delegates methods
shared/components/all-modals/all-modals.component.{ts,html}   # + register the assign modal
shared/components/alliance-sidebar/alliance-sidebar.component.ts  # + "Principal Investigator" group
app.routes.ts                                           # + lazy route
```

## 4. API layer (ApiService methods)

`MainResponse<T>` envelope; unwrap `res.data`.
- `GET_PIDelegatesByProject(projectId: string)` → `GET pi-delegates?projectId=<id>` → `ProjectDelegates` `{ project_code, project_name, is_pool_funding_contributor, status, start_date, end_date, delegates:[{delegate_user_id,name,email}] }`.
- `GET_PIDelegatesByDelegate(delegateUserId: number)` → `GET pi-delegates/by-delegate?delegate_user_id=<id>` → `DelegateProjects` `{ delegate_user_id, name, email, projects:[{project_code,project_name}] }`. *(query param, not a path param.)*
- `POST_PIDelegates(body: { assignments: {project_id: string; delegates: ({delegate_user_id:number}|{email,first_name,last_name})[]}[] })` → `POST pi-delegates`.
- `DELETE_PIDelegates(body: { project_ids?: string[]; delegate_user_ids?: number[] } | { pi_delegate_ids?: number[] })` → `DELETE pi-delegates` (body-carrying DELETE, as `TP.delete(url, body)`).

Define response TS interfaces in `shared/interfaces/` mirroring the backend response DTOs.

## 5. Feature service — single source of truth (R-UI-010)

`PiDelegatesClientService` (signals): `byProjectCache`, `byPersonCache`, `loading`, `error`. All tabs/counters derive from ONE cache — **no second separately-mutated copy** (KZ-002/R-UI-010). Methods: `loadByProject(projectIds)`, `loadByPerson(...)`, `assign(assignments)` (POST then refetch), `revokePair(projectId, delegateUserId)` / `revokeById(...)` (DELETE then refetch). After any write → refetch the affected slice; never optimistic-mutate a divergent copy.

## 6. The two tabs (R-UI-002/003) + row "X" (R-UI-008)

- `p-tabView`: **By-project** (default, `pTabPanel` first) + **By-person**. Tab state persists while on screen (a `signal`).
- **By-project table:** columns from the enriched payload — code, name, pool-funding (icon/text, not colour-only — NFR-UI-002), status, start/end date, and a delegates cell (chips: name + email). Per-row **X** on a delegate → confirm → `DELETE {project_ids:[code], delegate_user_ids:[id]}` → refetch. A project with **no delegate** shows the "No PI Delegate assigned" empty cell with a **non-colour cue** (icon+text).
- **By-person table:** person (name+email) + their projects (code+name chips). Per-row **X** on a project → `DELETE {project_ids:[code], delegate_user_ids:[personId]}`.
- **Search (R-UI-005/filter):** a search box filters the visible rows **by person or project** (client-side over the loaded cache; `computed` filtered signal).

## 7. Assign / Edit modal (R-UI-005/006/007) — SYNC-aware

- **Reuse `app-modal`** (`modalName:'assignPiDelegate'`), register in `all-modals.component.html`; open via `AllModalsService.openModal('assignPiDelegate')`. **Author only the inner `assign-pi-delegate.component`.**
- **Inner content:** two `app-multiselect`s — **People** and **Projects** (both searchable). *(Data sources: see §8 stub.)* Accept button **disabled until ≥1 person AND ≥1 project** (`computed`), wired to the modal's `disabledConfirmIf`.
- **⚠ SYNC semantics (DD-M backend):** the modal edits the **desired set per project**. On open from **By-project** it **pre-loads that project's current delegates** (R-UI-006 AC.1) so Save doesn't revoke anyone by accident; on open from **By-person** it pre-loads that person's current projects. On Save, it builds `assignments` = for each selected project, its **full desired delegate list** (current-kept + newly-added, minus removed) → `POST`. Anyone removed from the list is **revoked by the backend sync**.
- **Confirmation (R-UI-007 AC.1):** a dialog that names **who/what will be ADDED and who/what will be REMOVED** (the sync delta), then Save. Success toast; on error, error state + refetch (no partial-success implied).
- **Self-exclusion (R-UI-005 AC.3):** the People multiselect excludes the current user (`optionFilter`/`optionsDisabled`).

## 8. Stubbed picker data sources (user provides endpoints later)

The People and Projects endpoints **do not exist yet** (user will wire them). `app-multiselect` sources data via `serviceName: ControlListServices`. **DD-UI-STUB:** back both multiselects with a clearly-marked **stub source** (a temporary control-list entry or a static signal) returning empty/mock data, isolated behind one swap point, with a `// TODO(user endpoint)` marker — so replacing it with the real service is a one-line change and no other UI code depends on the stub shape. Tasks must NOT hardcode picker data into components.

## 9. Nav entry (R-UI-001)

Add a **Principal Investigator** group to the sidebar (`{ id:'pi', label:'Principal Investigator', icon:'pi-users', children:[{ label:'My PI Delegates', link:'/platform/my-pi-delegates' }] }`) — mimic the existing group/resource pattern; do NOT rename existing items. **Visibility:** shown when the user has ≥1 managed project (eligibility-driven, not a new role) — derive from the loaded By-project data (or a lightweight eligibility check); if that signal is not cheaply available, show it for authenticated users and let the page handle the empty state. Route: lazy `loadComponent` in `app.routes.ts` under the platform shell + existing auth guard.

## 10. Design fidelity + a11y

Mockup (`mockup/My-PI-Delegates.html` + the Claude-design link) is **layout/flow/copy only** — the look uses STAR tokens (`.abc-*`/`.atc-*`/`.rs-*`/`.fs-*`, `var(--ac-*)`, PrimeNG Aura), **no hex literals** (NFR-UI-001). Non-colour cues for no-delegate + any status badge (NFR-UI-002; rendered-contrast is a human/T6 check — jsdom can't measure it). Loading/empty/error/success states per view (NFR-UI-003).

## 11. Design decisions
| DD | Decision | Rationale |
| --- | --- | --- |
| DD-UI-A | Reuse `app-modal` + `app-multiselect`; author only inner content | Product mandate; no bespoke modal/select |
| DD-UI-B | Assign = per-project SYNC (pre-load current, delta confirm) | Matches backend DD-M; prevents accidental mass-revoke |
| DD-UI-C | Single signals cache feeds both tabs + counters | R-UI-010 / KZ-002 — no drift |
| DD-UI-D | Row "X" → bulk `DELETE` by (project, delegate) pair | Backend DELETE Shape B; targeted, not sync |
| DD-UI-E | Picker data behind one stubbed swap point | Endpoints user-provided-later; isolate the TODO |
| DD-UI-F | History panel deferred | No history read endpoint yet |

## 12. Budget (tripwire)
~9 client tasks · ~2 review rounds · client-only (no server change). Coverage floors: statements 40 / branches 20 / lines 45 / functions 30 (`jest.config.ts`). Test discipline: K-015 (arrange the transition), K-001 (stubs discriminate), K-020 (`--coverage=false` for single-file runs).
