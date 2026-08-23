# Proposal — Executive Overview Clear Placement

## 1. Document Control

| Field | Value |
| --- | --- |
| Type | **Change** (placement/UX; no functional regression found — see Problem) |
| Slug | `ai-overview-placement` — derived from free-text argument (*"falta lo de la descripción con AI que estaba antes… debemos ubicarlo de una forma clara"*) |
| Spec Path | `changes/ai-overview-placement` |
| Approval Mode | gated |
| Author / Date | j.cadavid@cgiar.org · 2026-08-22 |
| Status | Draft — pending approval |
| Depends on | `changes/dashboard-advanced-analytics` (done) — must respect its D-PD-9 (`[hidden]` collapse, progress-on-collapsed) invariants |
| Parallel-safe | **yes** vs `changes/leaflet-geo-map` (no shared files); **no** vs future dashboard-layout work |

## 2. Intent

Make the AI Executive Overview **clearly visible when a summary exists** — the way the previous build presented it (user evidence: ULZ53 screenshot, summary generated 13/08 shown prominently) — without re-inverting the analytics-first hierarchy the redesign fixed.

## 3. Problem / Current Behavior (diagnosed 2026-08-22)

- The whole "AI Grounding & Executive Overview" block was relocated **below the pending table, collapsed by default** (`project-dashboard.component.html:472+`, per R-PD-008/D-PD-9 of the redesign spec). Discoverability ≈ zero: a generated summary is invisible unless the user scrolls to the last card and expands it.
- **Visibility logic is NOT broken** (verified): `showExecutiveOverview` (`project-dashboard.component.ts:162-172`) shows the section to non-admins whenever `hasExecutiveOverviewData()` — the reach of the old build is intact. On A511 nothing shows simply because **no summary has been generated** for that contract; ULZ53 has one.
- The user's product judgment stands: a generated, grounded summary is high-value context and deserves placement commensurate with that value.

## 4. Proposed Outcome

- **When a summary exists:** a compact "Executive Overview" card renders **high on the dashboard** (directly below the KPI strip / beside Project Context) with the generated-on date, the first paragraph(s), "View more" expansion, and the "Grounded AI Summary" pill — mirroring the old presentation the user pointed to.
- **When none exists:** non-admins see nothing (no empty AI card); admins keep the bottom **Grounding & Setup** section exactly as-is (upload docs, generate) — administration stays separated from consumption.
- D-PD-9 invariants preserved: file input never destroyed (`[hidden]`), generation progress visible from the collapsed admin header, auto-expand on Generate.

## 5. Scope / Non-Goals

**Scope:** `project-dashboard.component.{ts,html}` template restructure only (split the presentation card from the admin section); tests for the four states (summary × role). **Non-goals:** any change to the DocumentOverview service/API, generation flow, grounding docs, or the caveat banner.

## 6. Requirement Delta Preview

**ADDED:** prominent summary card (conditional on data); state matrix admin/non-admin × with/without summary explicitly tested. **MODIFIED:** DOM position of the summary presentation (admin setup block stays at the bottom). **REMOVED:** nothing.

## 7. Recommended Approach

Single small spec, **Lite depth** (template split + rendered-DOM tests, est. 1–2 tasks, ~150 LOC). The only decision worth a design line: exact placement (below KPI strip vs merged into the Project Context card) — settle with one look at both in the browser at HITL.

## 8. Risks / Open Questions

| Item | Note |
|---|---|
| Hierarchy regression risk | The redesign's AC (analytics before AI blocks) must be re-worded, not violated: the summary card is *context*, placed with context — the admin/generation machinery stays below. Update that AC's wording in the same change (correction closure) |
| OQ-1 | Placement: standalone card under KPI strip vs inside Project Context — HITL decision |

## 9. Next Step

```text
/akili-specify changes/ai-overview-placement
```
