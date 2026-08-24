# Archive Summary — Project Dashboard v3 · F3 Indicator Deep-Dive

## 1. Document Control
- **Spec id:** 2026-08-project-dashboard-v3-f3 · **Owner:** JuanCode · **Type:** Change (Full depth)
- **Parent Spec:** `changes/project-dashboard-v3` (`family.md` child 3/4 — row flipped to `done`)

## 2. Original Spec Path
`docs/specs/changes/project-dashboard-v3/f3-indicator-deep-dive/`

## 3. Archive Date
2026-08-24

## 4. Final Status
**Delivered and owner-verified.** 10/10 tasks PASS. Two Leaders across two hosts (Antigravity T-01…T-07; Claude Code T-08…T-10 after a quota cut), 1 rework loop (T-08, 2 attempts), 1 owner-approved addendum (radar null-gap), 3 runtime quota incidents — zero lost work. Budget: 10 tasks est./10 actual · 2 review rounds est. / 1 loop + 1 addendum actual.

## 5. Requirements Delivered
R-DD-001…006 + NFR-DD-001/003/004 (NFR-DD-002 latency: inconclusive/pending — see §9). Endpoint `GET /api/v1/agresso/contracts/reports/indicator-details` aggregating the 6 satellite tables + monthly reporting velocity (`{total_results, n}` per section, labels resolved server-side, omitted/null/sparse tri-state); lazy tabbed deep-dive panel in the dashboard's F1 slot; Pie/Funnel/Radar registered in viz-chart; 17 chart builders paired 1:1 with accessible tableModels; quantifications as HTML table (D-F3-6); radar on `answered_count` basis with null-gap for zero-answered axes.

## 6. Files Changed Summary
Server: `agresso-contract` repository (+7 section queries + composition), service, controller, DTOs; `test/agresso-contract-indicator-details.integration-spec.ts` (HTTP-path, in-process — the spec whose T-05 amendment produced guide rule K-021). Client: `contract-indicator-details.interface.ts`, `get-indicator-details.service.ts`, `components/indicator-deep-dive/*`, viz-chart registrations, dashboard mount. Commits `ba07ae49…3ce933c6` under `[SPEC:changes/project-dashboard-v3/f3-indicator-deep-dive]`.

## 7. Test Evidence Summary
No separate `test-report.md` (**absence accepted** — evidence in `execution.md`): server 338 suites / 2480 green, cov 85/75/84/85 (floor 60); F3 integration suite PASS in-process (K-021 pattern); client 316 suites / 6720 green, cov 97.98/92.82/97.34/98.35; tsc-spec 937 = baseline; build green, Initial total 1.12 MB = F2 baseline (NFR-DD-003 met). K-004 reds observed on this spec's own gates (TS18047; radar falsifier; retry/laziness falsifiers).

## 8. Validation Summary
No `validation-report.md` (**absence accepted**): owner HITL 2026-08-24 (live light-mode screenshot: velocity + tabs + sparse Policy tab on real A511 data) — approved. Reviewer trail: T-08 FAIL (2 real behavioral defects: inert retry, empty-during-load) → PASS attempt 2; T-09 PASS attempt 1; addendum PASS.

## 9. Accepted Warnings Or Follow-Ups
- **NFR-DD-002 latency: inconclusive/pending** — only reachable local server ran a stale build; measure post-deploy on dev (3× curl recipe in `execution.md` §T-10).
- **Dark-mode HITL not evidenced** (debt carried since F1 — next dashboard HITL owes it).
- T-13 bilateral integration suite unreachable without `T13_MYSQL_PASSWORD` (deliberate env gate, unrelated).
- Radar fixture no longer pins legitimate-0% rendering (Reviewer note — re-cover if the ternary is touched).
- F4's client tasks gate on this spec's landing — now open.

## 10. Historical Notes
The T-05 "supertest e2e" ambiguity cost a 26-minute AppModule hang against the shared dev DB and produced K-021 (applied to all four guides mid-spec by owner mandate). The quota-driven Leader handoff (Antigravity → Claude Code) worked solely because `execution.md` carried complete state — the audit trail is the handoff.
