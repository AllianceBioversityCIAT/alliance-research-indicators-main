# Tasks — Changes / Executive Overview Grounded Context

- **Module:** changes
- **Spec id:** 2026-08-executive-overview-grounded-context
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Requirements:** ./requirements.md · **Design:** ./design.md
- **Last updated:** 2026-08-24

---

## 1. Task numbering

`T-NN`, dependency order. Skills per task from the root Skill Map.

## 2. Dependency graph

```
T-01 (server endpoint) ──► T-02 (client service+interface) ──► T-03 (context builder + wiring)
T-04 (card states + threshold) ──► T-05 (reading modal)
T-03, T-05 ──► T-06 (provenance footer)
T-04/T-05 ──► T-08 (dedup shell header; owner decision 2026-08-24)
all ──► T-07 (validation sweep)
```

T-01 and T-04 are independent — safe to start either first, but NOT two concurrent full-suite runs (root guide concurrency rule).

---

## 3. Task list

### T-01 — Server: `GET /agresso/contracts/:agreementId/clarisa-project`

- [x] **Covers:** R-EOC-001 · **Skills:** `nestjs-expert`, `api-design-principles` · **Effort:** medium
- Add `ContractClarisaProjectDto` (design §3), `findClarisaProjectByAgreementId()` in `AgressoContractService` (mapping lookup → `ClarisaProjectsService.findProjectById` via `moduleRef`), controller route + Swagger.
- Degrade paths: unmapped → `data: null`; CLARISA cold-cache `ServiceUnavailableException` → `data: null` + `errors: ['clarisa_unavailable']` + `LoggerUtil` warn.
- Tests: service spec (mapped/unmapped/degrade), controller spec, integration spec per design §10 (K-021 bootstrap scope: controller+service only, `overrideProvider` for mapping repo + ClarisaProjectsService; NO AppModule).
- **Verify:** `npm test -- --silent` (server), bare `npx eslint <touched paths>`, `npm run test:integration`. State what each cannot reach (KZ-017: unit specs cannot verify route registration — the integration spec covers the HTTP path).

### T-02 — Client: `GET_ContractClarisaProject` + `GetClarisaProjectService`

- [x] **Covers:** R-EOC-001 (client side), NFR-1 · **Skills:** `angular-developer` · **Effort:** medium
- `ApiService.GET_ContractClarisaProject(agreementId)` → `agresso/contracts/${id}/clarisa-project`; interface `ContractClarisaProject`; signal service mirroring `GetProjectDetailService` (session memo + `invalidate`); dashboard effect adds `load(contractId)`.
- Tests: service spec with `HttpTestingController` on the `MainResponse<T>` envelope (data, null-data, error → loadError signal).
- **Verify:** `npx jest <specs> --coverage=false`, `npm run build`.

### T-03 — Client: `buildProjectContext` util + generation wiring

- [x] **Covers:** R-EOC-002, R-EOC-003 · **Skills:** `angular-developer`, `error-handling-patterns` · **Effort:** xhigh (source-preference + truncation correctness)
- Pure util `@shared/utils/project-context.util.ts` per design §5.1 (section order, per-field CLARISA preference, provenance labels, 8k bound at section boundaries, all-null → `undefined`).
- `DocumentOverviewRequest.project_context?`; `generateDocumentOverview(projectId, text?, projectContext?)`; both dashboard call sites (auto-baseline + regenerate) pass the built context; builder failure ⇒ field omitted, generation unchanged.
- Tests: util matrix (CLARISA-wins per field, Agresso-only, STAR-analytics sections, truncation boundary, undefined case); dashboard spec asserts the POST body field on both call sites and the omission path.
- **Verify:** `npx jest <specs> --coverage=false`, `npm run build`, `npx tsc -p tsconfig.spec.json --noEmit` against the 945 baseline.

### T-04 — UX: Act-1 card states, reading measure, disclosure threshold

- [x] **Covers:** R-EOC-004, R-EOC-006, R-EOC-008 · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** medium
- `max-w-prose` body, `leading-relaxed`; 4-line clamp; `isLongOverview` computed (>700 chars or >2 paragraphs) routing to modal trigger vs inline expand; skeleton loading state (`role="status"`, reserved height); error state with Retry.
- Tokens only; verify both themes; focus rings + touch targets.
- Tests (KZ-015 — arrange the transition): construct loading → resolve → assert clamp; short vs long routing; retry re-invokes load.
- **Verify:** `npx jest <spec> --coverage=false`, `npm run build`, `npm run lint -- --quiet`.

### T-05 — UX: `executiveOverviewReader` modal

- [x] **Covers:** R-EOC-005 · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** medium
- Add modal name to `modal.types.ts` + `all-modals.service.ts` config; modal content per design §6.2 (70ch column, paragraphs, generated-at, sources, admin actions bridging to setup modal / regenerate).
- Tests: opens via trigger only when long; admin actions visible only for admins; sources render.
- **Verify:** `npx jest <specs> --coverage=false`, `npm run build`.

### T-06 — Provenance footer

- [ ] **Covers:** R-EOC-007 · **Skills:** `angular-developer` · **Effort:** low
- Footer line composing docs count, text-resource presence, and project-data source (CLARISA vs Agresso) from the T-03 builder's provenance output; shown in card + modal.
- **Verify:** `npx jest <spec> --coverage=false`.

### T-08 — Deduplicate: retire shell-header Executive Overview

- [x] **Covers:** R-EOC-009 · **Skills:** `angular-developer` · **Effort:** low
- Remove `<app-executive-overview>` from `project-detail.component.html` (+ its import in `project-detail.component.ts`); delete `components/executive-overview/executive-overview.component.{ts,html,spec.ts}`.
- Constraint: serialize AFTER T-04/T-05 (same client package); touches only shell files, not the dashboard component.
- **Verify:** `npx jest src/app/pages/platform/pages/project-detail --coverage=false` (route-level specs still green), `npm run build`, grep `app-executive-overview`/`ExecutiveOverviewComponent` returns no live references.

### T-07 — Validation sweep

- [ ] **Covers:** all ACs · **Skills:** `systematic-debugging` · **Effort:** high
- Full client suite `npm test -- --silent`; full server suite; `npm run build`; spec type-check vs baseline; token validation `npm run tokens:validate`; manual pass on a mapped bilateral (CLARISA block present — remember the 5-min TTL, K-016) and an unmapped contract (Agresso-only).
- Record PASS evidence in `execution.md` BEFORE flipping any checkbox (guardrail hook).

---

## 4. Testing expectations

Per design §10. Single-file jest runs need `--coverage=false` (K-020). No concurrent full-suite runs across packages. Every gate must have been seen failing once before it is cited (K-004).

## 5. Risks & blockers log

| Risk | Mitigation |
|---|---|
| AI service ignores `project_context` (OQ-1 unconfirmed) | Field is additive + inert; feature still improves nothing until confirmed — track with the AC-1714 team |
| CLARISA cohort fetch cold-start on first dashboard hit | Endpoint degrades to `null`; UI unaffected |
| Threshold (700 chars) wrong for real summaries | OQ-3: HITL tune after first real generation |

## 6. Done definition

All ACs verified with evidence in `execution.md`; suites green; build green; no hex literals introduced; docs (this spec) status flipped to `implemented`.
