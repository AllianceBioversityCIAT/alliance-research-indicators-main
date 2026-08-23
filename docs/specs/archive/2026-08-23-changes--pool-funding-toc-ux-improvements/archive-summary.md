# Archive Summary — Changes / Pool Funding ToC UX/UI Enhancements (`pool-funding-toc-ux-improvements`)

**Outcome:** shipped. The ToC alignment block gained a Primary-SP header with badge and guidance banner, structured Level/HLO/Indicator dropdowns (code pills, `✓ Recommended` badges, group accents), and a 3-stat quantitative contribution card.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/pool-funding-toc-ux-improvements` |
| Type | Change (client) |
| Approval Mode | gated |
| Executed by | Antigravity (Leader/Implementer/Reviewer) · 2026-08-20 |
| Archived by | Claude (Fable 5) · 2026-08-23 · **spec branch** — pending items only |

## 2. Original Spec Path
`docs/specs/changes/pool-funding-toc-ux-improvements/` → `docs/specs/archive/2026-08-23-changes--pool-funding-toc-ux-improvements/`

## 3. Archive Date
2026-08-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | T-PTU-01/02/03 all done · Reviewer PASS recorded for 01 and 03 |
| **T-PTU-02 execution entry** | **missing from the log** — evidence recovered at archive from the repo (execution.md addendum 2026-08-23): commit `4296d578` (+176 template / +100 spec lines), 4 `pTemplate` blocks shipped, covered by the 350/350 suite run |
| `test-report.md` / `validation-report.md` | absent — **accepted** |
| Unresolved FAIL | none on record |

## 5. Requirements Delivered

| Requirement | Evidence |
|---|---|
| R-PTU-001 Primary SP header + banner | T-PTU-01 (82/82 tests) |
| R-PTU-002/003/004 structured dropdown templates, pills, group accents | recovered evidence (addendum): `4296d578` + shipped `pTemplate` blocks + suite green |
| R-PTU-005 3-stat contribution card | T-PTU-03 (350/350 suite) |
| NFR-PTU-001..003 | Reviewer audits (01, 03); tokens/a11y asserted in specs |

## 6. Files Changed Summary
`sp-toc-alignment-block.component.{ts,html,spec.ts}` (+ `pool-funding-alignment` suite updates). Main commit `4296d578` (2026-08-20, **untagged**).

## 7. Test Evidence Summary
82/82 (T-PTU-01) → 350/350 full pool-funding suite (T-PTU-03, spans T-PTU-02's spec additions). Lint 0 errors.

## 8. Validation Summary
No validation report. All recorded Reviewer verdicts PASS. T-PTU-02's verdict was never logged — accepted at archive on recovered repo evidence, not on the summary's bare "All PASS" claim.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| T-PTU-02 log entry missing while §3 claimed 3/3 All PASS | Closed via addendum; KZ-014-family recurrence recorded in Kaizen |
| T-PTU-01 "Attempt 1-4" compressed, no per-attempt verdicts | Noted in Kaizen |
| Commit `4296d578` untagged | Noted |

## 10. Historical Notes
Sibling of `pool-funding-ux-improvements` (same day, same component family, same Antigravity session). Later refined by several `/akili-quick` entries (banner copy, help modal, skeletons).
