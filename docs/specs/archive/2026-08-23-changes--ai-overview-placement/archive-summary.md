# Archive Summary — Changes / Executive Overview Clear Placement (`ai-overview-placement`)

**Outcome:** shipped. The AI Executive Overview renders as a compact card right after the Project Context strip whenever a summary exists (any role); the admin "AI Grounding & Setup" section stays at the bottom as setup-only. One post-spec product fix (`04599a35`) widened the admin gate — recorded below, not hidden.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/ai-overview-placement` |
| Type / Depth | Change · Lite |
| Approval Mode | gated |
| Owner | j.cadavid@cgiar.org |
| Archived by | Claude (Fable 5) · session `bilateral-visual-improvements` worktree |
| Branch Context | **spec branch** (`bilateral-visual-improvements`) — no shared-file writes; pending items only |

## 2. Original Spec Path

`docs/specs/changes/ai-overview-placement/` → `docs/specs/archive/2026-08-23-changes--ai-overview-placement/`

## 3. Archive Date

2026-08-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | T-01 PASS (2 attempts) · T-02 PASS (1 attempt, HITL) · 13/13 checkboxes |
| Budget (2 tasks · ~150 LOC · 1 review round) | tasks ✓ · LOC ✓ · **review rounds 2 > 1** (tripwire tripped on T-01, not escalated — see Kaizen) |
| `test-report.md` | absent — **accepted**: T-01 evidence is frontend-unit (88/88, `--coverage=false`), no separate `/akili-test` run |
| `validation-report.md` | absent — **accepted**: T-02 HITL observation recorded in `execution.md`; no `/akili-validate` run |
| Unresolved FAIL | none |
| OQ-1 (placement side) | closed — **Option A**, after the context strip |

## 5. Requirements Delivered

| Requirement | Status | Evidence |
|---|---|---|
| R-AIP-001 — prominent card when a summary exists (content, date, pill, first paragraph, View more) | delivered | T-01 DOM tests + T-02 HITL (visible without scroll at 1280×800, both themes) |
| R-AIP-002 — four-cell state matrix; no placeholder AI card for non-admins | delivered, **one clause superseded** | Cells 1/2/4 as specified. Cell 3 + the `AND IT MUST … semantically identical` admin-gate clause superseded by `04599a35` (admin section now always present for admins) |
| R-AIP-003 — D-PD-9 invariants preserved, tests unmodified | delivered | D-PD-9 suite green and untouched; error feedback restored in T-01 attempt 2 |

## 6. Files Changed Summary

From `execution.md` (commit `d7277a07`) plus the post-spec fix (`04599a35`):

| File | Change |
|---|---|
| `client/.../project-dashboard/project-dashboard.component.ts` | `executiveOverviewExpanded` signal; `hasExecutiveOverviewExpandableContent`, `showGroundingSection` computeds; `executiveOverview: 150` stagger; error reset on upload/retry. `04599a35`: `showGroundingSection` → `canAccessGroundingSetup()` only |
| `client/.../project-dashboard/project-dashboard.component.html` | top Executive Overview card after `<app-project-context-strip>` (View more, `aria-expanded`/`aria-controls="executive-overview-details"`, source list when expanded); bottom section renamed "AI Grounding & Setup", presentation card removed, error alert block restored |
| `client/.../project-dashboard/project-dashboard.component.spec.ts` | four-cell rendered-DOM matrix, DOM-order test, View more tests, error alert/toast/reset tests. `04599a35`: Cell-3 test rewritten (presence + persistence instead of absence→presence) |

No service, route, or shared-component changes. No `## Constitution Impact` blocks.

## 7. Test Evidence Summary

| Check | Result | Source |
|---|---|---|
| `npx jest --testPathPattern=project-dashboard.component.spec.ts --coverage=false` | 88/88 (attempt 2) | execution.md T-01 |
| `npm run build` | exit 0 | execution.md T-01 |
| `npx tsc -p tsconfig.spec.json --noEmit` | 0 diagnostics in project-dashboard (≤ 945 baseline) | execution.md T-01 |
| D-PD-9 suite | green, unmodified | tasks.md T-01 |
| Declared limits | DOM-order test proves order, not prominence (T-02 HITL covers); suites run concurrently with another agent are not evidence (§4.3) | tasks.md |

## 8. Validation Summary

No `validation-report.md`. Reviewer verdicts: T-01 attempt 1 **FAIL** (error message for failed summary generation deleted with the old card — R-AIP-003) → attempt 2 **PASS**; T-02 **PASS** via HITL. Accepted at archive.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| `04599a35` supersedes D-AIP-5 / R-AIP-002 admin-gate clause | **Accepted as product decision** (bootstrap hole: admin with 0 docs could not reach the upload UI). Recorded in execution.md addendum. Spec text left as written — the addendum is the correction record |
| `04599a35` is untagged (no `[SPEC:…]` prefix) | Noted. Traceability recovered here; no rewrite of history |
| Review-round budget exceeded (2 > 1) without escalation | Noted in Kaizen; no product follow-up |
| Absent test/validation reports | Accepted (see §4) |

## 10. Historical Notes

- Proposal diagnosed that visibility *logic* was never broken — the card was merely buried in the collapsed bottom section; A511 had no summary, ULZ53 did.
- Lite depth; parallel-safe with `changes/leaflet-geo-map` (no shared files) and executed concurrently with it.
- Spec authored in this session (Claude); executed by a separate session (agy/Antigravity); archived here.
