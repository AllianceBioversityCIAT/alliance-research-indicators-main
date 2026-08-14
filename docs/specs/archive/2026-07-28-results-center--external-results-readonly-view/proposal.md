# Proposal — External System Results Open in Read-Only STAR Forms (Not a Modal)

## 1. Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Spec path | `results-center/external-results-readonly-view` |
| Proposal file | `docs/specs/results-center/external-results-readonly-view/proposal.md` |
| Status | Draft — pending approval |
| Author | Claude (pair) |
| Requested by | David Felipe Casañas Hernández |
| Date | 2026-07-27 |
| Requirement source | Jira user story pasted directly (Summary/Context/Acceptance Criteria), no ticket key given — no Jira MCP lookup performed |
| Related specs | None yet under `docs/specs/results-center/` (new module folder) |

## 2. Intent

When a user opens a result whose origin is an external system (**TIP, PRMS, AICCRA**), STAR must show the **same section forms** used for native STAR results — fully populated, **non-editable** — instead of the current minimal summary modal. The user should see everything a STAR result shows (General information, Alliance alignment, Partners, Geographic scope, Evidence, IP rights, etc.), just locked, plus the sync date and a public-link shortcut at the top.

## 3. Problem / Current Behavior

Today, clicking a TIP/PRMS/AICCRA row in Results Center never opens the sections page. `results-center-table.component.ts` intercepts every entry point (row click, link click, keyboard/href, table capture-click) and branches on `platform_code`:

- `openResult()` (`results-center-table.component.ts:280-301`), `onResultLinkClick()` (`:364-374`), `handleRowClickResult()` (`:457-494`), and `getResultRouteArray()`/`getResultHref()` (`:314-348`) all check `platform_code === PRMS/TIP/AICCRA` and, when true, set `AllModalsService.selectedResultForInfo` and open the `resultInformation` modal instead of navigating.
- Only STAR results (`platform_code === PLATFORM_CODES.STAR`, `:458`) — and, incidentally, results with no route match — reach `router.navigate(['/result', resultCode], ...)`, the full sections shell (`result.component.ts` → `ResultSidebarComponent` + tab routes under `result/pages/*`).
- The modal (`result-information-modal.component.{ts,html}`) shows only: platform badge/code, indicator, title, status, primary project, primary lever, reporting year, contributing projects, main contact person, "Open public link", "Open result in {platform}". Everything else in the STAR forms (partners, geographic scope, evidence, IP rights, capacity-sharing details, alliance alignment, etc.) is not shown at all for external results.

This matches image #2 (the `Result information` modal) — the behavior the ticket says should disappear — versus image #3 (a native STAR result already rendering the full section shell), which is the destination the ticket wants external results routed into.

**A relevant piece of plumbing already exists:** `SubmissionService.isEditableStatus()` (`submission.service.ts:60-81`) already returns `false` whenever `cache.getCurrentPlatformCode()` is not `'STAR'` (and not empty) — before it even checks status/role. Most section pages already bind `[disabled]="!submission.isEditableStatus()"` on their fields (confirmed in `general-information.component.html:11,19,27,35,49` and referenced across ~30 files: oicr-details, evidence, geographic-scope, alliance-alignment, partners, ip-rights, capacity-sharing, policy-change, innovation-details, links-to-result). So **once an external result is routed into `/result/:code`, most fields likely go read-only "for free"** — the work is mainly (a) routing, (b) the two new top-of-form elements, (c) auditing the tabs/actions that are *not* gated by `isEditableStatus()` yet (save/submit affordances, sidebar progress, action buttons), and (d) sourcing the sync-date field.

## 4. Proposed Outcome

1. Opening a TIP/PRMS/AICCRA result from Results Center (row click, link click, any entry point currently intercepted in `results-center-table.component.ts`) navigates to `/result/:code` — the same STAR section shell used today — instead of opening `resultInformation`.
2. Every section/tab renders with real data, and every field is non-editable, for any result whose `platform_code !== 'STAR'`.
3. Each section form shows, near the top (alongside/inside `FormHeaderComponent`):
   - The last update/synchronization date of the result.
   - A control to open the public link with the complete metadata (reusing `result.public_link` / `openDocumentLink()` behavior already in the modal).
4. The `resultInformation` modal and its trigger logic are removed for this flow (see Non-Goals for what, if anything, still needs it).

## 5. Scope

- **Client only** (`client/research-indicators`).
- Entry-point routing in `results-center-table.component.ts` (all four branch points listed in §3) — replace "open modal" with the same navigation STAR results already get.
- `result.component.ts` / `ResultSidebarComponent` / `SectionSidebarComponent`: hide or adapt elements that assume an editable in-progress result (progress counter "X/7 sections completed", "Submit Result" button, status-change dropdown) when the result is external.
- Add a "last synced" date + "Open public link" affordance to the top-of-form area (`FormHeaderComponent` or an equivalent shared header), gated on `platform_code !== 'STAR'`.
- Audit every section under `result/pages/*` (12 tabs) for field controls **not yet** gated by `submission.isEditableStatus()` (or an equivalent readonly signal) — add the missing bindings so "all fields non-editable" is actually true everywhere, not just where the existing pattern happened to reach.
- Audit action buttons/menus that mutate a result (evidence upload, add partner, links-to-result actions, the 3-dot menu in the result header, PDF/report export) for whether they should also be hidden/disabled for external results.
- Remove (or intentionally keep only as dead code pending cleanup) the `resultInformation` modal trigger wiring once nothing depends on it — confirm no other caller opens it for a purpose unrelated to this ticket first (see Non-Goals).

## 6. Non-Goals

- No backend/API contract change is assumed necessary for the sections themselves — external results already populate the same metadata endpoints STAR results use (§3 shows `isEditableStatus()` already special-cases `platform_code`, implying the metadata payload already flows through the same pipes). If the sync-date field genuinely does not exist yet in any API response (§9 open question), exposing it **is** a small backend addition — flagged, not assumed.
- No change to how TIP/PRMS/AICCRA data enters ARI (the `tip.cron.ts` sync, `tip-integration` tool module) — this is a read-side/display change only.
- No change to the "Open result in {TIP|PRMS|AICCRA}" external-system deep link behavior — it is preserved, just relocated from the modal into the section header.
- No change to search-a-result, home "latest results", or project-detail entry points unless they also route through the same modal-opening logic — confirmed in scope only for `results-center-table.component.ts`; `search-a-result.component.ts` and `my-latest-results.component.ts` also reference `platform_code`/the modal and should be checked at `/akili-specify` time, but are not pre-committed here.
- No redesign of the STAR section forms' visual layout — the ticket asks for the *existing* forms in read-only mode, not new ones.

## 7. Affected Users, Systems, And Specs

- **Users:** any STAR user browsing Results Center (and any other entry point found in scope-check above) who opens a TIP/PRMS/AICCRA result.
- **Systems:** client only — `results-center-table.component.ts`, `result.component.ts`, `ResultSidebarComponent`, `SectionSidebarComponent`, `FormHeaderComponent`, all 12 `result/pages/*` tab components, `all-modals.service.ts` (`resultInformation` modal), `SubmissionService`.
- **Specs:** new module folder `docs/specs/results-center/` — no prior spec exists for this area to extend.

## 8. Visual Reference

- Source: Screenshots (provided directly in the request, not Figma/generated mockup).
- Location: not persisted as files under this spec folder (chat-attached images only — image #1 Results Center table with the "READ ONLY" tag already visible per row at `results-center-table.component.html:142`; image #2 the current `Result information` modal to remove; image #3 an existing native STAR section-form screen at `/result/:code`, which is the destination screen this change must route into).
- Notes: image #3 is not a mockup to build — it is the existing STAR result shell already implemented at `result.component.ts` / `ResultSidebarComponent`. The design work is making that same shell (a) reachable for external results and (b) correctly read-only with the two new top-of-form elements. No new screen needs to be designed from scratch.

## 9. Requirement Delta Preview

### ADDED Requirements

- Navigating to a TIP/PRMS/AICCRA result MUST land on `/result/:code` with all applicable section tabs, not a modal.
- The top of each section form MUST display the result's last update/synchronization date when the result is external.
- The top of each section form MUST offer an "Open public link" action when the result is external and `public_link` is present.

### MODIFIED Requirements

- `results-center-table.component.ts` entry-point handlers (`openResult`, `onResultLinkClick`, `handleRowClickResult`, `getResultRouteArray`, `getResultHref`) change from "open `resultInformation` modal for non-STAR platforms" to "navigate like STAR results, but the destination renders read-only."
- Every section under `result/pages/*` must be provably non-editable for non-STAR results — extending the existing `isEditableStatus()`-driven disabling pattern to any field/control that doesn't already use it.
- `ResultSidebarComponent`'s progress ("X/7 sections completed") and "Submit Result" affordance must not display (or must display a state that makes sense) for external results, since these concepts don't apply to a synced, non-editable result.

### REMOVED Requirements

- The `resultInformation` modal is no longer opened from Results Center for TIP/PRMS/AICCRA rows. (Full removal of the modal component/service wiring vs. leaving it unused is a `/akili-specify`-time decision — see Non-Goals.)

## 10. Approach Options

### Option A — Reuse the existing STAR section shell as-is, gate everything on `platform_code`
Route external results into `/result/:code` unchanged, rely on/extend `SubmissionService.isEditableStatus()` (already `false` for non-STAR) as the single source of truth for "can this field be edited," and add the sync-date/public-link elements to `FormHeaderComponent` gated the same way.

- ➕ Maximum reuse — no new page, no new routing concept, leverages plumbing that already treats non-STAR platforms as non-editable.
- ➕ Smallest change surface: one shared header change + an audit/fix pass on any field not yet wired to `isEditableStatus()`.
- ➖ Requires a careful audit across 12 tabs to guarantee zero editable field slips through (some controls may not consult `isEditableStatus()` yet, e.g. modals-within-tabs like "add partner", "upload evidence").
- ➖ Sidebar concepts built for an in-progress STAR draft (submit button, section-completion count) need explicit hide/adjust logic or they'll show nonsensical state ("0/7 sections completed" on a fully-populated external result).

### Option B — New dedicated read-only result-viewer route/shell for external results
Build a parallel, purpose-built read-only shell (own component tree) that renders the same field templates but is guaranteed non-editable by construction (no disabled-binding audit needed), reusing section sub-components in a "view" mode.

- ➕ No risk of a missed `isEditableStatus()` binding silently leaving a field editable.
- ➖ Much larger surface: effectively forks or heavily refactors 12 tab components into dual-mode (edit/view) or duplicates templates.
- ➖ Higher maintenance cost long-term (STAR form changes now need mirroring), contradicts the ticket's framing of "the same STAR forms."

### Option C — Middle ground: keep the existing shell, but introduce one explicit shared `isReadonlyResult()` signal that every tab's fields bind to (superset of `isEditableStatus()`)
Same as Option A, but instead of relying solely on the existing `isEditableStatus()` naming/semantics (which is about *status-based* editability), introduce/confirm a single readonly signal on `CacheService` (e.g. `cache.isExternalResult()` derived from `platform_code`) that section components AND the sidebar both consult, so "is this an external result" is one flag, not folded silently into an unrelated-sounding method.

- ➕ Clarifies intent in code (a reviewer reading `isExternalResult()` immediately understands why fields are locked, versus inferring it from `isEditableStatus()`'s platform check).
- ➕ Sidebar/header components get an explicit hook to hide submit/progress UI, not just disable fields.
- ➖ Slightly more to introduce than Option A (one new computed + call-site updates), though it can be additive (delegate to the existing `isEditableStatus()` logic rather than duplicating it).

## 11. Recommended Approach

**Option C.** It is Option A's reuse with one small, worthwhile addition: an explicit `isExternalResult` (or equivalently named) signal that the sidebar and form header can key off directly, while every field-level disable continues to flow through `isEditableStatus()` (already correct for non-STAR platforms). This keeps the change small — routing fix + header additions + an audit pass — while giving `/akili-specify` a clean seam to hide the submit button and progress counter without overloading a status-editability method with UI-visibility meaning.

Smallest safe path, in order:
1. Fix the four entry-point handlers in `results-center-table.component.ts` to navigate instead of opening the modal for non-STAR platforms.
2. Add sync-date + public-link elements to the shared form header, gated on the external flag.
3. Adjust `ResultSidebarComponent` (submit button, progress count) for the external case.
4. Audit and close gaps in field-level `isEditableStatus()` (or the new flag) coverage across the 12 section tabs and their nested action buttons/modals.
5. Decide and execute cleanup of the now-unused `resultInformation` modal wiring (or confirm another caller still needs it — see §12).

## 12. Risks, Dependencies, And Open Questions

- **Sync-date data source is unconfirmed.** No client interface (`Result`, `GetMetadata`) currently exposes a synchronization/last-update timestamp specific to the external-platform sync. The server `Result` entity has `last_updated_date` (`server/.../entities/results/entities/result.entity.ts` usages in specs/tests) which may already be the right field — needs confirmation at `/akili-specify` whether it reflects "last synced from TIP/PRMS/AICCRA" specifically or any modification, and whether it's already returned by the metadata endpoint the client calls.
- **Coverage risk on "all fields non-editable."** `isEditableStatus()` is referenced in ~30 files but not verified exhaustively here to cover every input, every nested modal-triggered mutation (e.g., "add partner," "upload evidence," "add other reference" in OICR details), and every action menu item (3-dot menu, PDF export, submit/status dropdown). A field that doesn't consult this flag would violate the acceptance criteria silently. **This needs a dedicated audit task in `/akili-specify`, not an assumption.**
- **Other entry points into the same modal.** `search-a-result.component.ts` and `my-latest-results.component.ts` (home page) also reference `platform_code` and likely open the same `resultInformation` modal or a similar external-link flow — in scope for `/akili-specify` to confirm and align, not pre-committed here (§6).
- **Sidebar/progress semantics for a read-only result.** "0/7 sections completed" and "Submit Result" have no meaning for an already-synced external result; the exact replacement treatment (hide entirely vs. show a "Synced" state) is a UX decision to make explicit in `/akili-specify`, not implied by the ticket text.
- **Modal component fate.** Whether `result-information-modal` is deleted outright or just stops being triggered from Results Center is an open decision — deleting requires confirming no other flow depends on it.

## 13. Success Criteria

1. Clicking/opening a TIP, PRMS, or AICCRA result from Results Center navigates to `/result/:code` and renders the full STAR section shell (all applicable tabs), not the `Result information` modal.
2. Every field across every visible section for that result is rendered disabled/non-editable — verified per tab, not just spot-checked.
3. The top of each section form shows the result's last sync/update date and an "Open public link" action when a public link exists.
4. Save/Submit/edit-only affordances (Save buttons, Submit Result, add/upload actions) do not appear as active for external results.
5. STAR-origin results are completely unaffected (still editable per existing status/role rules).
6. `npm test` / `npm run lint` / `npm run build` green in `client/research-indicators`; new/updated `*.spec.ts` cover the entry-point routing change and the readonly-gating audit fixes.

## 14. Next Step

```text
/akili-specify results-center/external-results-readonly-view
```
