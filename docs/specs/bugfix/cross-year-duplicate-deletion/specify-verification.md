# Specify verification — 2026-08-20

Checklist from `/akili-specify` after approval of `requirements.md`, `design.md`, and `tasks.md`.

| Check | Result |
| --- | --- |
| All 3 files exist, non-empty (+ proposal) | PASS |
| Follow `general-setup` (Lite Bug Mode) | PASS |
| Depth re-checked vs design budget (2–3 tasks, ~80–150 LOC) | PASS — Lite holds |
| `design.md` budget recorded | PASS §9 |
| Reversion challenge on R-RES-006 / `flagCrossYear` | PASS §8 — no unaddressed breakage |
| Defect classes → gates (DC-A–D) | PASS requirements §2 |
| Requirements = observable behavior | PASS |
| Key scenarios with BUT / AND IT MUST | PASS R-CYD-001 |
| Every scenario/clause owned by a named task | PASS tasks §2 coverage map |
| Tasks reference requirements + design | PASS |
| Done criteria + disqualifiers + fail inputs | PASS T-01–T-03 |
| No circular task deps | PASS T-01→T-02→T-03 |
| Bug Mode: regression red-before (T-01) | PASS |
| Spec path `bugfix/cross-year-duplicate-deletion` | PASS |
| Skills are real (nestjs-expert, systematic-debugging, cognitive-doc-design) | PASS |

**Next:** `/akili-execute bugfix/cross-year-duplicate-deletion` from worktree `alliance-research-indicators-ac1641-duplicates`.
