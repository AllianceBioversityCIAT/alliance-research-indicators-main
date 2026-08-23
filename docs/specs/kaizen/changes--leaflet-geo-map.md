# Kaizen Entry — changes/leaflet-geo-map

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/leaflet-geo-map` |
| Date | 2026-08-23 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated |
| Branch Context | **spec branch** — pending items only; digest untouched |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 (Standard) | tasks.md |
| Reviewer FAIL rework attempts | **1** (T-07 attempt 1: exact tsc count missing from evidence) | execution.md T-07 |
| In-flight spec corrections | **2** (D-GEO-9; D-GEO-10/11) — both triggered by live Testing evidence, both closed with verbatim K-012 reds | execution.md Addenda #1/#2 |
| HALTs / FATAL_FAILs / Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — `/akili-test` absent | — |
| Validation FAIL / WARN | n/a — `validation-report.md` absent; HITL + owner confirmation accepted at archive | archive-summary.md §4 |
| Budget | respected (8 tasks · ~650 LOC · ≤2 rounds) | design.md §2.4 vs execution.md |
| `/akili-quick` escalations | 0 | quick-log.md |
| Drift attributable | 0 constitutional (Mapbox absent from all guides/TRD/ux-ui — swept 2026-08-23) | archive sweep |
| Evidence gap at archive | 1 — T-08 two-contract checkbox marked with only half the observation recorded; closed by owner confirmation (Addendum #3) | execution.md Addendum #3 |

## Lessons

- **KZ-changes--leaflet-geo-map-1 — Specify-time fixtures must sample the boundary shapes of the real data domain, not only rich exemplars.** (Product, Medium)
  - Root cause: the original requirements/design drew fixtures from multi-country contracts. Both in-flight corrections trace to boundary shapes the fixture set omitted: the **empty country set with non-empty scope** (A511 `GLOBAL 7 / REGIONAL 3 / top_countries: []` → dead grey pane) and the **single-element degenerate range** (Kenya count 1 → `min: 1` collapsed the only datum onto the invisible floor stop). A third boundary — the **unbounded container** (pane height) — rode the same correction. Each cost a correction round, a brief hand-off, and a re-verification that specify-time enumeration would have bought for one fixture row apiece.
  - Evidence: execution.md Addenda #1 and #2 (triggers + verbatim reds); requirements.md R-GEO-006 AC.4 and R-GEO-002 AC.4 (both added in-flight, not at specify).
  - Standardization: → P1

## Noted, not a lesson

- **Shared Testing data is mutable mid-spec:** A511 was the fallback exemplar on 08-22 and showed Colombia count 2 by T-08 on 08-23. Evidence that names a contract should also name the data shape *observed at that moment* (counts), which T-08 did — that habit is what made the gap detectable. Below a new-ID bar; adjacent to KZ-008 (record what was executed).
- T-07 rework was evidence-completeness (exact tsc count), not a defect — the reviewer holding the line on measured-not-claimed numbers is the system working.
- "COUNTRI…" truncation: pre-existing, correctly reported as finding without scope creep.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` — acceptance-criteria / fixture guidance |
| Edit | Add: *Fixture sets MUST include the data domain's boundary shapes — empty set (with sibling data non-empty), single element (degenerate range), and bounded-container limits — not only rich exemplars. `leaflet-geo-map` paid two in-flight correction rounds for shapes (0 countries with global scope; count 1) that one fixture row each would have caught at specify.* |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-014` |
| Edit | Recurrence +1: T-08's "two contract types checked and evidenced" checkbox was marked while the record named only one contract (the second observation existed but was unrecorded; recovered by owner confirmation at archive — execution.md Addendum #3). Source spec `changes/leaflet-geo-map`. Severity stays High. |
| Severity | High |
| Status | pending |
