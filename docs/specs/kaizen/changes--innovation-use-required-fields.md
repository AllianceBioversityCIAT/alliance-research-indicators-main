# Kaizen Entry — `changes/innovation-use-required-fields`

| Field | Value |
| --- | --- |
| Spec | archived → `docs/specs/archive/2026-09-11-changes--innovation-use-required-fields` |
| Date | 2026-09-11 |
| Branch | `AC-1679-…` — **spec branch**, nothing outside this file written |

## Metrics

| Signal | Count |
| --- | --- |
| Tasks | 20 / 21 `[x]` (`T-16` open at archive) |
| Validation | **1 FAIL, 6 WARN, 0 code defects** |
| HALTs | **1** — `T-08` hit the 3-attempt ceiling, closed on attempt 4 under user ruling |
| Archived with FAIL open | yes, by explicit user ruling (QA sign-off + Prod release) |

## Lessons

### KZ-L1 — A sign-off gate placed after the deploy step cannot be enforced, only reported

- **Root cause.** `RB-1`'s gate was crossed *by the deploy itself* (`FAIL-1`). The spec ordered a human sign-off after an action that was already automated, so nothing could hold the release; validation could only observe afterwards that the gate had been passed over. The gate was un-closeable by construction, not by neglect.
- **Evidence.** `validation-report.md` §FAIL-1; verdict table row *"No unresolved FAIL → ❌ FAIL-1 (RB-1)"*.
- **Severity.** Medium. **Target:** Methodology.
- **Proposed standardization (`docs/specs/general-setup/task.md`):** *"A human sign-off gate must be ordered before the first irreversible step it governs. A gate downstream of a deploy is a report, not a gate — say so in the task rather than writing it as blocking."*

## Noted, not a lesson

- **Heavy, fully-recorded rework raised confidence rather than lowering it.** `T-08` HALTing and closing on a 4th attempt under explicit ruling is the process working: the ceiling fired, a human decided, and the decision is on the record.
- **Gate 2 was discharged at archive time rather than left as "never run."** The measurement (934 `.spec.ts` errors, **0 production files**) was obtainable; only the before/after delta was not.

## Pending Items

| # | Kind | Target | Content | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `standardization` | `docs/specs/general-setup/task.md` | *"A human sign-off gate must be ordered before the first irreversible step it governs. A gate downstream of a deploy is a report, not a gate."* | Medium | `pending` |
| 2 | `guide-sync` | `client/research-indicators/src/CLAUDE.md` + `src/AGENTS.md` | *"`tsc -p tsconfig.spec.json` carries ~934 pre-existing errors across ~78 files, **all in `.spec.ts`, zero in production code** (measured 2026-09-11). `npm run build` excludes `**/*spec.ts`, so these never reach a release. Treat the gate as a **delta** check, never an absolute one — and check for a `TS1000–TS1999` grammar error before counting, since one can truncate the set (K-004)."* | Medium | `pending` |
| 3 | `digest-update` | `kaizen-log.md` → **WARN-6 / guide drift** | `AGENTS.md` was again found drifted from `CLAUDE.md`. Recurrence noted; the mirror pair keeps diverging and no mechanism keeps them in sync | Low | `pending` |
