# Archive Summary — Changes / Pool Funding Alignment UX/UI Enhancements (`pool-funding-ux-improvements`)

**Outcome:** shipped. Science-Program selection in Pool Funding Alignment moved from dropdowns to interactive cards: single-SP auto-selection with a Primary badge, multi-SP card grid with inline "Make Primary" toggle, `Pending` tag removed, and skeleton loaders for the ToC block.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/pool-funding-ux-improvements` |
| Type | Change (client) |
| Approval Mode | gated |
| Executed by | Antigravity (Leader/Implementer/Reviewer) · 2026-08-20 |
| Archived by | Claude (Fable 5) · 2026-08-23 · **spec branch** — pending items only |

## 2. Original Spec Path
`docs/specs/changes/pool-funding-ux-improvements/` → `docs/specs/archive/2026-08-23-changes--pool-funding-ux-improvements/`

## 3. Archive Date
2026-08-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | T-PFU-01 PASS (2 att.) · T-PFU-02 PASS (1 att.) · T-PFU-03 PASS (2 att.) · 14/14 checkboxes |
| `test-report.md` / `validation-report.md` | absent — **accepted**; per-task jest evidence (200/200 final combined run) |
| Unresolved FAIL | none (both Reviewer FAILs remediated in-attempt) |

## 5. Requirements Delivered

| Requirement | Evidence |
|---|---|
| R-PFU-001 single-SP auto-selection + card | T-PFU-01 (118/118 tests incl. a11y asserts) |
| R-PFU-002 multi-SP interactive cards, inline Primary | T-PFU-02 (124/124; `role="checkbox"`, keyboard handlers) |
| R-PFU-003 `Pending` tag + legacy Primary radio removed | T-PFU-02 |
| R-PFU-004 ToC skeleton loaders | T-PFU-03 (DD-4 exact dims, `aria-busy`) |
| NFR-PFU-001..003 (tokens, a11y, no service change) | Reviewer audits; both FAILs were precisely these gates holding |

## 6. Files Changed Summary
`pool-funding-alignment.component.{ts,html,scss,spec.ts}` + `sp-toc-alignment-block.component.{ts,html,spec.ts}`. Main commit `c5b04bfa` (2026-08-20, **untagged**). No service/route/server changes.

## 7. Test Evidence Summary
Targeted jest per task (`--coverage=false`, K-020): 118/118 → 124/124 → 200/200 combined. Lint 0 errors (per execution log).

## 8. Validation Summary
No validation report. Reviewer FAILs: T-PFU-01 att.1 (hex literal `#ffffff` + missing `tabindex`), T-PFU-03 att.1 (missing `aria-busy` + DD-4 dims) — both fixed and re-audited PASS. Accepted at archive.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| Commit `c5b04bfa` untagged | Noted; traceability recovered here |
| Both Reviewer FAILs were already-codified conventions (§4.2 no-hex, a11y) | Review caught them — noted in Kaizen, no new lesson |

## 10. Historical Notes
Executed same-day as `pool-funding-toc-ux-improvements` on the same component family; the 10 `/akili-quick` pool-funding entries of 2026-08-20/21 built on this surface afterwards.
