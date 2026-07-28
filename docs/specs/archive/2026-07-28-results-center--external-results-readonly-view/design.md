# Design — Results Center / External Results Readonly View

- **Module:** results-center (client feature)
- **Spec id:** 2026-07-external-results-readonly-view
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** ./requirements.md
- **Linked baseline:** `docs/trd/trd.md` (Frontend architecture, §"Federation... read/link-only"); `docs/ux-ui/design.md` (Modal-driven action pattern, §303)
- **Reviewed:** Judgment Day round 1 (`./judgment.md`) — F-1 through F-6 corrected below (fix-only, no re-judgment run); F-7 resolved as an explicit scope decision (see requirements.md R-RC-003).
- **Last updated:** 2026-07-27

---

## 1. Goals & Non-Goals

**Goals** (each maps to requirements.md):
- Route external (TIP/PRMS/AICCRA) results into the existing STAR section shell instead of the summary modal (R-RC-001).
- Establish one explicit, reusable "is this an external result" signal that every readonly check derives from (R-RC-002).
- Close the five concrete readonly gaps found during investigation, so "all fields non-editable" is actually true, not just true where the existing pattern happened to reach (R-RC-003…007).
- Surface synced-date, public-link, and source-platform deep-link at the top of every section form (R-RC-008…010).
- Extend the metadata endpoint minimally so the header has the data it needs, with zero schema change (R-RC-011).

**Non-goals:**
- No change to TIP/PRMS/AICCRA data ingestion.
- No new column/migration — `updated_at` (existing `AuditableEntity` column) is the sync-date source for this version (Design Decision D-1), **now mitigated by R-RC-012 rather than left as an unresolved risk** — see Judgment Day correction below.
- **Corrected scope (Judgment Day round 1, F-1/F-2):** of the three mutation gaps originally believed fully open, only the OICR author/contact `DELETE` remains a deferred, optional fast-follow (Design Decision D-2, narrowed). The pool-funding-alignment PATCH's TIP/AICCRA gap and the submit-status PATCH gap are now **in scope** (R-RC-005 AC.3/AC.4, R-RC-012) because the first is a cheap extension of an already-tested pattern and the second directly threatens this spec's own sync-date feature.
- No redesign of the STAR section forms' visual layout.
- **Corrected (Judgment Day round 1, F-3):** `search-a-result.component.ts` needs no code change at all — confirmed already unconditionally routing to the shell today; it inherits this spec's read-only fixes automatically (Design Decision D-3, revised). `my-latest-results.component.ts` is confirmed already correctly gated — no change needed either.

---

## 2. Architecture Overview

This is a **client-primary** change with one small, additive server surface. No new module, no new integration, no new persistence.

```
Results Center (results-center-table.component.ts)
        │  4 entry-point handlers currently branch on platform_code
        │  to open `resultInformation` modal for TIP/PRMS/AICCRA
        ▼
   [CHANGE] → router.navigate(['/result', resultCode], ...)   (same call STAR already gets)
        ▼
ResultComponent  ──┬── ResultSidebarComponent   [CHANGE: hide status-changing actions when external]
  (/result/:code)  │
                    ├── FormHeaderComponent       [CHANGE: + synced-date, + public-link, + deep-link]
                    │        reads: CacheService.isExternalResult (NEW)
                    │               GetMetadataService → GetMetadata (+4 fields)
                    │
                    └── SectionSidebarComponent → 12 tab components under result/pages/*
                             each tab already binds [disabled]="!submission.isEditableStatus()"
                             isEditableStatus() [CHANGE: delegates to isExternalResult instead of
                                                 inlining the STAR/non-STAR check]
                             + 5 targeted gap-fixes (oicr-details ×2, pool-funding-alignment,
                               capacity-sharing/partners/organization-item "request" links)

Server: results.controller.ts → ResultsService.findMetadataResult()
        [CHANGE] select clause + MetadataResultDto: + platform_code, public_link,
                 external_link, updated_at (all pre-existing Result columns/audit field)

Server: bilateral.service.ts → updateAlignment()                    [CHANGE, corrected scope]
        existing assertPrmsSourceWritable()/isPrmsSourced() only covers platform_code==='PRMS'
        (pre-existing, tested — R-BIL-071). ADD a separate TIP/AICCRA gate with its OWN
        distinct error description — do NOT touch the locked PRMS 409 string, which the
        client (pool-funding-alignment.component.ts:110) pattern-matches on exactly.

Server: result-status-workflow.service.ts → changeStatus()           [NEW, in-scope — R-RC-012]
        confirmed zero platform_code check today; its Result.update() call auto-bumps
        updated_at (TypeORM @UpdateDateColumn) — directly threatens R-RC-008 if left open.
        ADD an early platform_code !== 'STAR' rejection before the transactional update.
```

**Owning module:** `client/research-indicators/src/app/{pages/platform/pages/{results-center,result},shared/{services/cache,components/{form-header,result-sidebar}}}`, plus `server/researchindicators/src/domain/entities/results/{results.service.ts, dto/metadata-result.dto.ts}`.

### 2.1 Composition

New/changed files, path + responsibility:

**Client**
- `shared/services/cache/cache.service.ts` — add `isExternalResult` computed (derives from existing `getCurrentPlatformCode()`; no new state).
- `shared/services/submission.service.ts` — `isEditableStatus()` delegates to `cache.isExternalResult()` instead of its own inline `isStarPlatform`/`hasNoPlatformCode` check (behavior-preserving).
- `shared/components/form-header/form-header.component.ts` / `.html` — new markup + computed signals for synced date, public link, external (deep) link; injects `CacheService` (already does) — no new service dependency required if `GetMetadata` already flows through `cache.currentMetadata()`.
- `shared/interfaces/get-metadata.interface.ts` — add 4 optional fields: `platform_code?`, `public_link?`, `external_link?`, `updated_at?`.
- `shared/components/result-sidebar/result-sidebar.component.ts` / `.html` — extend the four visibility conditions (Submit/Unsubmit, Review, Approve, OICR status dropdown) with `&& !cache.isExternalResult()`.
- `pages/platform/pages/results-center/components/results-center-table/results-center-table.component.ts` — replace the "open modal" branch (or bare `return`) in `openResult()`, `onResultLinkClick()`, `handleRowClickResult()`, the routing helpers `getResultRouteArray()`/`getResultHref()`, **and `openResultByYear()` (added — Judgment Day round 1, F-6, confirmed a sixth entry point at `:303-312` that today dead-clicks for external platforms)** with the STAR navigation path.
- `pages/platform/pages/result/pages/oicr-details/components/authors-contact-persons-table/authors-contact-persons-table.component.ts` / `.html` — add `disabled` input; gate Add button and delete icon.
- `pages/platform/pages/result/pages/oicr-details/oicr-details.component.ts` / `.html` — pass `disabled` to the authors/contact table; extend MEL Regional Expert + SharePoint field `[disabled]` bindings; guard `onDeleteContactPerson()`.
- `shared/services/bilateral.service.ts` — `editable` computed additionally requires `!cache.isExternalResult()`. **DI note (Judgment Day round 1, F-4):** this class currently injects only `ApiService`, `RolesService`, `CurrentResultService` (`:52-54`) — needs a new `CacheService` injection (safe, no circularity).
- `pages/platform/pages/result/pages/capacity-sharing/capacity-sharing.component.ts`, `.../partners/partners.component.ts`, `.../innovation-details/components/organization-item/organization-item.component.ts` (or `.html`) — gate the "request to add" link/handler on `!isExternalResult()`. **DI note (Judgment Day round 1, F-4):** `organization-item.component.ts` currently injects only `SubmissionService` — needs the same new `CacheService` injection.

**Server**
- `domain/entities/results/results.service.ts` — extend `findMetadataResult()`'s `select` object and return shape (lines ~766-833) with the 4 fields.
- `domain/entities/results/dto/metadata-result.dto.ts` — add 4 optional `@ApiProperty()`-annotated fields.
- `domain/entities/bilateral/bilateral.service.ts` — **added scope (Judgment Day round 1, F-1):** a new, separate gate for TIP/AICCRA alongside the existing `assertPrmsSourceWritable()`/`isPrmsSourced()` (~lines 1329-1342, called at `:659`). New gate uses its own distinct error description — must not alter or collide with the locked PRMS 409 string that the client hardcodes at `pool-funding-alignment.component.ts:110`.
- `domain/entities/result-status-workflow/result-status-workflow.service.ts` — **added scope (Judgment Day round 1, F-2, new requirement R-RC-012):** `changeStatus()` (`:216-290`) gains an early `platform_code !== 'STAR'` rejection before the transactional `Result.update()` at `:283-286`, which today would silently bump `updated_at` for any result regardless of platform.

### 2.2 Reuse

- `CacheService.getCurrentPlatformCode()` (existing, unchanged) — the single parsing point for platform origin; `isExternalResult` is a thin computed on top of it, not a reimplementation.
- `SubmissionService.isEditableStatus()` — remains the field-level disable source for every tab; this design only changes what it delegates to internally.
- `ResultInformationModalComponent`'s existing `openDocumentLink()` / `openExternalLink()` logic — the same URL-opening behavior is relocated, not reinvented, into `FormHeaderComponent`.
- `AllModalsService` — unchanged; still hosts the modal component (kept, not deleted — Design Decision D-4) even though Results Center no longer triggers it.
- Existing `format-date` pipe — reused for the synced-date display, no new date-formatting utility.

---

## 3. Data Model

**No data model changes.** `platform_code`, `public_link`, `external_link` are existing columns on `Result` (`result.entity.ts:177-219`); `updated_at` is inherited from `AuditableEntity`. This spec only widens what `findMetadataResult()` *selects and returns* — no new column, no index, no migration, no `@OpenSearchProperty` addition (these fields are not new to search, only newly exposed on one read endpoint).

---

## 4. API Surface

### `GET /api/v1/results/:id/metadata` (existing endpoint, additive change)

- **Controller:** `server/researchindicators/src/domain/entities/results/results.controller.ts:605-621`
- **Roles/Guards:** unchanged (no new `@Roles`/guard requirement — this is a read-widening, not a new permission surface).
- **Response DTO:** `MetadataResultDto` — add:
  - `platform_code?: string`
  - `public_link?: string`
  - `external_link?: string`
  - `updated_at?: Date`
  All `@ApiProperty({ required: false })`, matching existing optional-field Swagger style in the same DTO.
- **Response data shape:** existing fields unchanged, plus the four above. Envelope stays `ServerResponseDto<MetadataResultDto>` — implicit, no wrapper change.
- **Versioning:** stays on `/v1` — purely additive, non-breaking for existing consumers (STAR shell for STAR results simply won't render the new UI, since `isExternalResult()` is false).
- **Swagger:** update the endpoint's `@ApiOperation`/DTO annotations to document the four new optional fields.
- **Errors:** unchanged (no new error paths introduced).

### `PATCH .../pool-funding-alignment` — added scope (Judgment Day round 1, F-1)

- **Controller/Service:** `bilateral.controller.ts` → `bilateral.service.ts`'s `updateAlignment()`.
- **Change:** add a new, separate rejection for `platform_code ∈ {TIP, AICCRA}`, parallel to (not replacing) the existing `assertPrmsSourceWritable()` PRMS-only gate. New gate = new private method (e.g. `assertNonPrmsExternalSourceWritable()`) with its **own** `ConflictException` description — explicitly must NOT reuse `'Result is PRMS-sourced; bilateral alignment is read-only in STAR'`, since that exact string is a locked contract the client string-matches on (`pool-funding-alignment.component.ts:110`) to differentiate toast copy specifically for the PRMS case.
- **Errors:** existing `409` (PRMS) unchanged; new `409` (or `403`, TBD at implementation) for TIP/AICCRA with distinct wording.
- **Swagger:** update `bilateral.controller.ts`'s existing `@ApiOperation` error-cases text to mention the new TIP/AICCRA case alongside the existing PRMS one.

### `PATCH` result-status change endpoint — new (Judgment Day round 1, F-2, R-RC-012)

- **Controller/Service:** the controller fronting `ResultStatusWorkflowService.changeStatus()` (`result-status-workflow.service.ts:216-290`).
- **Change:** add an early rejection when the target result's `platform_code !== 'STAR'`, before the transaction that calls `manager.getRepository(Result).update(...)` (`:283-286`) — that call is what silently bumps `updated_at` today with no platform check at all.
- **Errors:** new `409`/`400` (TBD, follow existing service conventions) for non-STAR results.
- **Swagger:** document the new rejection case.

---

## 5. Backend Module Design

Single-service touch, no new module:

- `ResultsService.findMetadataResult()` — extend the explicit `select: {...}` TypeORM object (currently narrow by design, `results.service.ts:766-791`) to include `platform_code: true, public_link: true, external_link: true, updated_at: true` (the exact `updated_at` selector path depends on how `AuditableEntity` exposes it — confirm at implementation time whether it's a direct column or requires `withDeleted`/audit-relation access; if `AuditableEntity` already auto-selects audit columns for other endpoints, mirror that pattern rather than inventing a new one).
- Return object construction (lines ~810-833) gains the four passthrough fields — no transformation logic, straight projection.
- No new guard, no new service method, no new controller route.

---

## 6. Frontend / UX Component Architecture

### 6.1 `isExternalResult` signal (new, on `CacheService`)

```
isExternalResult = computed(() => {
  const p = this.getCurrentPlatformCode();
  return p !== '' && p !== 'STAR';
});
```

Placed on `CacheService` (not `SubmissionService`) because it is a pure fact about the currently-loaded result's origin, independent of submission/status/RBAC concerns — `SubmissionService` (which already injects `CacheService`) consumes it, not the other way around, avoiding a circular dependency.

### 6.2 Entry-point routing fix (`results-center-table.component.ts`)

The **six** branch points (`openResult`, `onResultLinkClick`, `handleRowClickResult`, `getResultRouteArray`/`getResultHref`, **and `openResultByYear` — added, F-6**) currently special-case `platform_code ∈ {PRMS, TIP, AICCRA}` to open the modal (or, for `openResultByYear`, do a bare `return`). Each branch's "open modal"/dead-return body is replaced with the exact navigation call the STAR branch already uses in the same method (including the "approved snapshot → jump to latest year" special case at `:293-297`, which is platform-agnostic and should apply identically). The modal-related calls (`selectedResultForInfo.set`, `applyResultInformationModalContext`, `openModal('resultInformation')`) are removed from these call sites; `AllModalsService` and the modal component remain otherwise untouched (D-4).

**Other entry points — corrected during Judgment Day round 1 (F-3):** `search-a-result.component.ts`'s `openResult()` was investigated directly and found to already navigate unconditionally to `/result/:code/general-information` for every `platform_code` — no modal branch exists there today, so **no routing change is needed**. Because this spec's read-only enforcement lives entirely in the destination components (§6.1, §6.3-6.5 — `isExternalResult`/`isEditableStatus` consumed by tabs, sidebar, and services), this already-existing entry point inherits full read-only behavior automatically once those fixes ship. It is added to the manual verification matrix in `tasks.md` T-11, not given its own fix task. `my-latest-results.component.ts` was also checked directly and confirmed already gated via `opensResultInformationModal()` — no change needed.

### 6.3 `FormHeaderComponent` — new top-of-form block

Currently renders only a truncated title + `VersionSelectorComponent`, gated on `cache.showSectionHeaderActions()`. Add, gated on `cache.isExternalResult()` (a sibling condition, independent of `showSectionHeaderActions()`):
- A synced-date element, sourced from `cache.currentMetadata().updated_at` (once R-RC-011 lands), formatted via the existing date-formatting pipe; renders nothing if the value is absent (R-RC-008 AC.3).
- An "Open public link" button, sourced from `cache.currentMetadata().public_link`; same open-in-new-tab behavior as the modal's `openDocumentLink()`.
- An "Open result in {platform}" button, sourced from `cache.currentMetadata().external_link` and `platform_code`, with the platform-specific copy already defined in the modal (TIP → "Open link to result", AICCRA → "Open result in MARLO", PRMS → "Open result in PRMS").

This makes `FormHeaderComponent` newly dependent on `platform_code`/`public_link`/`external_link` being present on `GetMetadata` (R-RC-011) — it should read them from `cache.currentMetadata()`, the same signal it already reads `result_title` from, rather than introducing a second data-fetch path.

### 6.4 `ResultSidebarComponent` — hide status-changing actions externally

**Corrected during Judgment Day round 1 (F-5)** — verified directly against `result-sidebar.component.html`: `:74-76` is a single shared outer `@if` wrapper (`indicator_id !== 5 && status_id not in [6,7,8]`) around all three of Review (`:77-88`), Submit/Unsubmit (`:89-105`), and Approve (`:106-120`). Adding `&& !cache.isExternalResult()` **once, to that shared wrapper**, closes all three simultaneously — simpler and more DRY than editing each nested condition separately (originally miscited as four independent expressions). The OICR status dropdown's `showOicrStatusDropdown()` (`result-sidebar.component.ts:96-99`) is a separate, independent condition and needs its own addition. The "X/Y sections completed" counter is deliberately left unguarded (Design Decision D-5) — it is read-only display of green-check state and carries no mutation risk; hiding it is optional UX polish, not a requirement.

### 6.5 Tab-level gap fixes

- **OICR — Authors/Contact table:** new `disabled` `@Input()` on `AuthorsContactPersonsTableComponent`; call site passes `[disabled]="cache.isExternalResult() || !submission.isEditableStatus()"`; both the Add button and the delete icon inside the child component consult it; `onDeleteContactPerson()` in the parent returns early when disabled.
- **OICR — MEL Regional Expert / SharePoint fields:** `[disabled]` expressions become `!isAdmin || cache.isExternalResult()`, mirroring the existing combined pattern already used for the OICR-No field.
- **Pool Funding Alignment:** `BilateralService.editable` computed gains a leading `if (this.cache.isExternalResult()) return false;` check, short-circuiting before the existing `is_read_only`/ownership/admin logic (client-side). **Server-side companion, added scope (F-1):** `updateAlignment()` gains a new TIP/AICCRA-specific gate parallel to the existing PRMS-only one — see §4's new API surface entry. The two layers are independent: the client fix prevents the UI from ever attempting the call; the server fix ensures the call is rejected even if attempted directly.
- **Capacity Sharing / Partners / Innovation Details (organization-item):** the three "request to add" link handlers/`@if` wrappers gain `!cache.isExternalResult()`.

### 6.6 Shared Contracts

- `GetMetadata` interface: add `platform_code?: string`, `public_link?: string`, `external_link?: string`, `updated_at?: string` — mirrors the DTO additions field-for-field, kept optional so STAR-only code paths that don't check them are unaffected.

---

## 7. Integration Impact

None. No CLARISA/AGRESSO/TIP/OpenSearch/DynamoDB/RabbitMQ/Socket.IO contract changes. The `tip-integration` tool module, sync crons, and OpenSearch mappings are untouched — this is purely a read-side/display change plus a client-side write-guard hardening pass.

---

## 8. Security & Authorization

- No new roles, no new guard, no new machine-token surface.
- **Narrowed during Judgment Day round 1 (F-1, F-2):** of the three mutation endpoints originally investigated, two now get a server-side `platform_code` gate as part of this spec:
  - Pool-funding-alignment `PATCH` — already had a server-side gate for PRMS (`assertPrmsSourceWritable`); this design adds the missing TIP/AICCRA half (§4, §6.5), using a distinct error description so the existing locked PRMS 409 string is untouched.
  - Submit-status `PATCH` — had zero gate; this design adds one (R-RC-012, §4), specifically because leaving it open would let this same spec's own sync-date feature (R-RC-008) be silently corrupted.
  - **Only the OICR author/contact `DELETE` remains without a server-side gate** — this design closes the client-side path to it (R-RC-003), and **Design Decision D-2 (revised)** records the explicit, narrower choice to leave only this one endpoint as an optional fast-follow (`tasks.md` T-12), since it touches a child table (`result_user`), not `Result` itself, and so cannot corrupt the sync-date feature the way the other two could have.
- No PII/donor-restricted-data change — this surfaces existing fields already visible elsewhere (Results Center list, the old modal), just relocated.

---

## 9. Observability

- No new log lines, no new `sync_process_log` row type, no new metrics/dashboards — this is a UI/read-surface change with a small DTO widening; existing request logging (`ResponseInterceptor`) covers the metadata endpoint as-is.

---

## 10. Testing Strategy

- **Client unit tests** (`*.spec.ts`, co-located):
  - `results-center-table.component.spec.ts` — assert navigation (not modal-open) for TIP/PRMS/AICCRA rows across all six entry points (including `openResultByYear`, F-6); assert STAR behavior unchanged.
  - `cache.service.spec.ts` — `isExternalResult` truth table (STAR, empty, TIP/PRMS/AICCRA).
  - `submission.service.spec.ts` — `isEditableStatus()` regression: identical outputs pre/post refactor for existing STAR test cases.
  - `form-header.component.spec.ts` — renders synced-date/public-link/deep-link only when `isExternalResult()` is true and the respective field is present; renders nothing extra for STAR.
  - `result-sidebar.component.spec.ts` — Submit/Review/Approve/status-dropdown all hidden when external, unchanged when STAR.
  - `oicr-details.component.spec.ts` / `authors-contact-persons-table.component.spec.ts` — Add/Delete disabled + `onDeleteContactPerson()` no-ops when external.
  - `bilateral.service.spec.ts` — `editable` returns `false` when external regardless of `is_read_only`/role.
  - `capacity-sharing.component.spec.ts` / `partners.component.spec.ts` — request-link gated.
- **Server unit tests:**
  - `results.service.spec.ts` — `findMetadataResult()` returns the four new fields for a fixture row; DTO validation test for the new optional properties.
  - `bilateral.service.spec.ts` — **added (F-1):** new TIP/AICCRA rejection case for `updateAlignment()`, plus a regression run of the existing `bilateral.service.sourceReadOnlyGate.spec.ts` suite to confirm the PRMS gate and its exact 409 description are untouched.
  - `result-status-workflow.service.spec.ts` — **added (F-2/R-RC-012):** `changeStatus()` rejects for a non-STAR result before touching `Result.update()`; existing STAR-transition tests still pass.
- **Coverage:** stay within existing floors (client: statements 40/branches 20/lines 45/functions 30; server: global 60%) — no exemption needed given the small, additive surface.
- **Manual verification:** open one TIP, one PRMS, and one AICCRA result end-to-end in the running app **via both Results Center and `search-a-result`** (F-3 — the latter already routes there unconditionally and must show the same read-only behavior); walk all 12 tabs confirming no control is left interactive; confirm synced-date/public-link/deep-link render correctly; confirm a STAR result is visually/behaviorally identical to before; confirm a year-badge link (`openResultByYear`, F-6) on a multi-snapshot external result navigates correctly rather than dead-clicking.

---

## 11. Rollout

- **Order:** server DTO/select change can deploy first (purely additive, no client dependency yet) or together with the client change — no ordering constraint since old clients ignore unknown response fields.
- **Feature flag:** none — this is a direct behavior fix per an approved ticket, not a gradual rollout candidate.
- **Backout:** revert is a straightforward code revert (no migration to reverse).
- **Comms:** none required beyond normal PR review — no external partner (TIP/PRMS/AICCRA) contract changes.

---

## 12. Design Decisions Log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-1 | 2026-07-27 | Use `Result.updated_at` (existing `AuditableEntity` column) as the "last synced" date source; no new column. **Revised 2026-07-27 (Judgment Day round 1, F-2):** the one confirmed corruption path (submit-status endpoint) is now mitigated by R-RC-012, not left as an open risk. | Resolves OQ-1 pragmatically — avoids a migration and keeps this Standard-depth. Residual risk (some *other*, undiscovered write path) remains an assumption, tracked in requirements.md §10/RB-1 — not silently treated as fully settled. |
| D-2 | 2026-07-27 | ~~Do not build server-side mutation hardening (author/contact delete, pool-funding PATCH, submit-status PATCH) in this spec.~~ **Revised 2026-07-27 (Judgment Day round 1, F-1/F-2):** only defer the author/contact `DELETE`. Bring the pool-funding-alignment PATCH's TIP/AICCRA gap and the submit-status PATCH gate in scope now. | The original blanket deferral was based on a factual error — PRMS already had a tested gate on the bilateral endpoint, so extending it to TIP/AICCRA is cheap, not scope-creep. The submit-status gap directly threatens this spec's own D-1/R-RC-008 — deferring it would ship a feature that undermines itself. Only the author/contact DELETE (touches a child table, not `Result`) stays a genuinely low-stakes, optional fast-follow (NFR-RC-001, `tasks.md` T-12). |
| D-3 | 2026-07-27 | ~~Do not pre-commit to fixing `search-a-result`/`my-latest-results`; add a verification task instead.~~ **Revised 2026-07-27 (Judgment Day round 1, F-3):** both were directly investigated. `search-a-result` needs no routing fix (already unconditional, inherits this spec's destination-side fixes automatically). ~~`my-latest-results` is confirmed already correctly gated.~~ **Superseded for `my-latest-results` 2026-07-28 — see D-9.** | The original "verify later" framing understated the finding — `search-a-result` isn't a symmetrical unknown, it's a confirmed-open path today that this spec closes as a side effect, which is worth stating plainly rather than deferring the finding itself. |
| D-9 | 2026-07-28 | **Extend scope to `my-latest-results` (Home cards)** — remove its `opensResultInformationModal()` special-casing so external results route into the section shell like everywhere else. New requirement R-RC-013 / task T-14. | D-3's "already correctly gated" verdict was factually right but answered *"does it have the same dead-click bug?"* (no) rather than *"should it also route to the shell now?"* (yes). Once T-04 shipped, Home became the only entry point still serving the old 9-field modal, directly contradicting the spec's headline requirement and the Jira AC. The fix is small and carries none of T-04's difficulty — this component uses an ordinary `routerLink` + click handler, with no document-level capture-phase listener involved — and its `getStarResultRouterLink()`/`getStarResultQueryParams()` helpers are already platform-agnostic, so only the special-casing is removed, no navigation logic is added. |
| D-4 | 2026-07-27 | Keep `ResultInformationModalComponent` and `AllModalsService`'s `resultInformation` registration in place; only remove Results Center's trigger calls. | Resolves OQ-4 — minimizes blast radius; deleting a shared modal component without confirming zero other callers is a separate, low-priority cleanup, not required for this ticket's acceptance criteria. |
| D-5 | 2026-07-27 | Leave the "X/Y sections completed" sidebar counter visible for external results. | It's read-only display of existing green-check state, not an edit affordance; hiding it is cosmetic polish outside this ticket's acceptance criteria, so it's deliberately left as-is rather than treated as another gap to close. |
| D-6 | 2026-07-27 | Introduce `isExternalResult` on `CacheService`, and have `SubmissionService.isEditableStatus()` delegate to it, rather than inventing a second parallel check. | Per investigation finding (§5 of the research pass), confirmed sound and behavior-preserving by both Judgment Day judges independently: `isEditableStatus()` today inlines the exact same STAR/non-STAR check ad hoc; centralizing it is the smallest change that gives the sidebar/header a name-appropriate signal without duplicating logic or risking drift between two "is external" checks. |
| D-7 | 2026-07-27 | The new TIP/AICCRA bilateral-PATCH gate uses its own error description, distinct from the existing locked PRMS 409 string. | Discovered during Judgment Day round 1 fix verification: `pool-funding-alignment.component.ts:110` hardcodes an exact string match on the PRMS 409 description to drive toast copy. Reusing or altering that string for TIP/AICCRA would either break the existing match or show a factually wrong "PRMS-sourced" message for a TIP/AICCRA result. |
| D-8 | 2026-07-27 | `openResultByYear()` is added as a sixth Results Center entry point requiring the same routing fix as the other five. | Confirmed directly against `results-center-table.component.ts:303-312` during Judgment Day round 1 (F-6, originally single-judge, independently re-verified by the orchestrator): without this, a year-badge link on an external result's row would dead-click after the other fixes ship, while the row itself worked — a newly-introduced inconsistency. |

---

## 13. Open Questions

- Whether `updated_at` genuinely reflects "last sync" in production data absent the now-mitigated submit-status corruption path (D-1's residual assumption) — owner: backend lead, resolve by first implementation PR's manual data spot-check.
- Whether the OICR author/contact `DELETE` (the one remaining deferred item after D-2's revision) should be scheduled as an immediate fast-follow or a separately tracked spec — owner: product owner, resolve at spec sign-off.
- Whether the `resultInformation` modal component should eventually be deleted outright (D-4) — owner: engineering lead, not blocking this spec.

---

## 14. References

- `docs/trd/trd.md:425` — "Federation with STAR / TIP / PRMS / AICCRA is read/link-only from the client."
- `docs/ux-ui/design.md:303` — Modal-driven action pattern (context for why the modal existed and what it's being replaced by).
- `docs/specs/results-center/external-results-readonly-view/proposal.md` — approved intent this design implements.
- No ADRs created — this change extends existing patterns without introducing a new architectural pattern requiring one.
