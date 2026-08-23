# Execution Log — Changes / Executive Overview Clear Placement (`ai-overview-placement`)

- **Module:** changes (STAR client)
- **Spec id:** 2026-08-ai-overview-placement
- **Status:** done (archived 2026-08-23)
- **Owner:** j.cadavid@cgiar.org
- **Last updated:** 2026-08-22

---

## T-01 — Template split + state gates + four-cell rendered-DOM tests

- **Status:** PASS
- **Attempts:** 2
- **Completed:** 2026-08-22
- **Skills used:** `angular-developer`, `ui-ux-pro-max`
- **Files touched:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.ts`
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html`
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts`

### Attempt 1:
- **Implementer summary:** Added `executiveOverview: 150` stagger delay, `executiveOverviewExpanded` signal, `hasExecutiveOverviewExpandableContent` and `showGroundingSection` computeds. Rendered top Executive Overview card after `app-project-context-strip` with expandable view and source documents. Renamed bottom section to "AI Grounding & Setup", removed old presentation card. Added 4-cell rendered DOM tests and DOM order test.
- **Verification evidence:** `npx jest --testPathPattern=project-dashboard.component.spec.ts --coverage=false` 87/87 passed; `npm run build` success; `tsc` spec baseline clean.
- **Reviewer verdict:** FAIL
  - **Discovered Issue:** The error message for failed summary generation was entirely removed from the template when the bottom presentation card was deleted.
  - **Violated Rule:** R-AIP-003.
  - **Remediation:** Restore error feedback (alert block in panel / toast in catch).

### Attempt 2:
- **Implementer summary:** Restored `@if (executiveOverviewError())` alert block inside Grounding & Setup panel, added error toast on generation failure, ensured error resets on new upload and generation retry, and added spec tests covering DOM error alert, toast, and reset behavior.
- **Verification evidence:** `npx jest --testPathPattern=project-dashboard.component.spec.ts --coverage=false` (88/88 passed); `npm run build` (code 0, clean bundle); `npx tsc -p tsconfig.spec.json --noEmit` (0 diagnostics in project-dashboard).
- **Reviewer verdict:** PASS. All architectural decisions, state gates, 4-cell matrix tests, D-PD-9 invariants, and error handling verified.

---

## T-02 — HITL placement decision + visual verification

- **Status:** PASS
- **Attempts:** 1
- **Completed:** 2026-08-22
- **Skills used:** `ui-ux-pro-max`
- **Files touched:** None (Option A default confirmed by user)

### Placement Decision & Verification:
- **OQ-1 Decision:** Confirmed **Option A** (immediately after `<app-project-context-strip>`, above analytics charts). Grouping the summary with the context strip provides logical flow from high-level project narrative to detailed analytics.
- **Visual Verification:**
  - Compact Executive Overview card renders at top when summary data exists.
  - Light & dark theme tokens verified (`var(--ac-*)`).
  - "View more" toggle expands smoothly without layout breakage.
  - Absence remains silent for non-admins when no summary exists.
  - Admin bottom section remains intact as setup-only ("AI Grounding & Setup").
- **Accessibility Verification:**
  - "View more" button is keyboard accessible (Tab, Enter/Space).
  - `aria-expanded` and `aria-controls="executive-overview-details"` properly reflect state.

---

## Addendum — Post-spec drift recorded at archive (2026-08-23)

- **Commit:** `04599a35` — `fix(project-dashboard): ensure AI Grounding & Setup is always accessible for admins on projects with 0 initial files` (2026-08-22 22:12, **untagged**, landed after T-02 PASS).
- **What changed:** `showGroundingSection` collapsed from `canAccessGroundingSetup() && (docs || loading || error || data)` to `canAccessGroundingSetup()` alone. The Cell-3 spec test was rewritten: it no longer asserts the bottom section is **absent** for an admin with zero docs; it now asserts presence, then persistence after a doc is added.
- **Spec clauses affected:** R-AIP-002 `AND IT MUST keep the admin bottom section's visibility condition semantically identical to today's admin branch` and **D-AIP-5** are **superseded** by this commit. The D-AIP-5 "failing input" (drop `hasExecutiveOverviewData` from the OR ⇒ red) no longer exists because the OR no longer exists.
- **Why it was right to change:** the frozen gate had a bootstrap hole — an admin on a project with **0 documents** could never reach the only UI that uploads the first document. Preserving "today's gate" preserved that defect. Product call, taken by the owner in-browser; recorded here so the archive does not read as if D-AIP-5 still holds.
- **Not affected:** R-AIP-001, R-AIP-003 (D-PD-9 `[hidden]` collapse, progress-on-collapsed, auto-expand — untouched by `04599a35`), the four-cell card matrix (card presence is still summary-gated).
- **Kaizen:** see `docs/specs/kaizen/changes--ai-overview-placement.md` (KZ-changes--ai-overview-placement-1).
