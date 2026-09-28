# Validation Report — My PI Delegates (Frontend / STAR)

## Document Control

| Field | Value |
| --- | --- |
| Spec | changes/my-pi-delegates-ui |
| Validated | 2026-09-15 |
| Auditor model | opus (T3) — implementers ran on sonnet (author ≠ auditor ✓) |
| Build gates | server `npm test` 2807/2807 · client `npm test` 6944/6944 · module hex-grep 0 |
| Branch | AC-1733-pi-delegates (commits dd6f6cb7 → 0d9b80fc) |
| Verdict | **PASS with drift** — archive-ready; `/akili-archive` MUST reconcile the spec docs |

## Summary

The implemented feature **fully satisfies every original requirement and exceeds the spec's scope**. All 9 tasks are `[x]` with a recorded Reviewer PASS; every post-spec enhancement was independently reviewed (opus) and verified against the live local DB. Both full test suites are green and the module is hex-clean.

The one material finding is **documentation drift**: the spec (`requirements.md`/`design.md`) describes a *client-only* 9-task feature that stubbed its data sources. The shipped work is a large **superset** — it built the real backend the spec deferred (managed-projects + active-users + history endpoints), re-skinned the whole page to a new mockup, and derived `is_active` from account status. This is **positive drift** (more delivered, all tested), but the requirements/design docs no longer describe reality. That reconciliation is the archive step's job.

## Task Completion — PASS

| Task | Status | Evidence |
| --- | --- | --- |
| T-UI-01…09 | ✅ [x] all | `execution.md` — Reviewer PASS per task; Done-definition all `[x]` |
| Post-spec extensions | ✅ shipped + reviewed | 7 commits, each with an opus Reviewer PASS + DB verification (see Design Conformance) |

## File Existence — PASS

All files named in `design.md §3` exist (page shell, both tabs, assign modal, service, picker source, api methods, nav, route). PLUS unlisted new files from the extensions: `history/`, server `users/` module, server `pi-delegates` by-user + history handlers/DTOs.

## Build Integrity — PASS

| Gate | Result |
| --- | --- |
| Server unit suite | 2807/2807 pass (349 suites) |
| Client unit suite | 6944/6944 pass (323 suites); coverage floors held |
| tsc (app + spec) | clean throughout (per-change) |
| eslint | clean throughout |
| Hex grep (NFR-UI-001) | **0** across the whole module source |
| Runtime SQL | every backend query verified against the local DB (managed-project ids, active-users filter, is_active derivation, enriched history sentences) |

## Requirement Coverage — PASS

| Req | Status | Note |
| --- | --- | --- |
| R-UI-001 nav + route | ✅ | T-UI-03; runtime 404 (CR-01) found + fixed (`/my-pi-delegates`, not `/platform/…`) |
| R-UI-002 by-project default | ✅ | T-UI-04/05 + re-skin (Status pill, pool-funding own column, red inactive chips) |
| R-UI-003 by-person | ✅ | T-UI-06 + Email/Status columns; only managed projects shown (structural) |
| R-UI-004 summary counters | ✅ | T-UI-04; restored as header stats (Projects as PI / PI Delegates / Without) |
| R-UI-005/006/007 assign SYNC | ✅ | T-UI-07 pre-load + delta confirm + gating; modal locks (projects from-project, people from-person) + inactive warning |
| R-UI-008 revoke | ✅ | T-UI-05/06 per-row X → confirm → revokePair |
| **R-UI-009 history** | ✅ | **Was DEFERRED in the spec (no endpoint); now SHIPPED** — single endpoint + modal, granted/revoked sentences, newest-first |
| R-UI-010 single source | ✅ | T-UI-02 single cache; `loadByUser` refreshes both slices; no drift |
| NFR-UI-001/002/003 | ✅ | hex-clean, non-colour cues (icon+text), loading/empty/error/success states |

Negative constraints verified: self-exclusion (R-UI-005 AC.3), no unmanaged projects (R-UI-003 AC.2 — structural via managed-scoped queries), no accidental mass-revoke (pre-load + delta confirm, adversarial 3-lens review of T-UI-07).

## Linting & Code Quality — PASS (advisory notes)

Advisory (non-gating, carried from execution reviews):
- `name` combined field is not null-guarded in 3 server mappings → `"null Almanzar"` if a name part is NULL (pre-existing; `first_name`/`last_name` now returned separately so the client can rebuild).
- History entry appends the project suffix even in the By-project view where the subheader already names it (cosmetic).
- `alliance-sidebar` shared component carries a pre-existing file-wide hex convention (outside this module) — detox is a separate task.
- Two-cache design (byProject/byPerson) is safe by convention (both refreshed together in `loadByUser`); could be made robust-by-construction later.

## Design Conformance — WARN (doc drift)

The implementation is correct; the **design/requirements docs are stale** relative to what shipped:

| Drift | Reality shipped | Doc says |
| --- | --- | --- |
| Data sources | Real backend endpoints: `by-user/projects`, `by-user/people`, `users/active`, `history` | `requirements §5` + `design §8` say endpoints are "user-provided later"; pickers "stubbed" |
| By-person source | Reads `by-user/people` endpoint (`byPersonCache`) | `design §5/§6` describe a `computed` inversion of `byProjectCache` (itself already a T-UI-06 refinement of the original `loadByPerson`) |
| Page layout | Re-skinned to a new mockup (info→header stats, filter bar, Status filter, footer summary, status pills, red-inactive, history) | `design §6/§9/§10` describe the pre-re-skin layout |
| `is_active` semantics | Derived: active ⟺ status ∈ {Accepted(1), External Accepted(4)} | not specified (spec predates the status model) |
| Delegate shape | Enriched with first/last/carnet/status_id/is_active | `design §4` lists only id/name/email |

None of these are behavioral defects — they are **positive scope expansion** delivered through the conversation. `execution.md` captures the task-level trail but requirements/design were not rewritten.

## Test Evidence Summary — PASS

No `test-report.md` (the `/akili-test` phase was folded into per-task TDD). Evidence = ~113 co-located client tests for the module + server pi-delegates/users suites, every one behind an opus Reviewer PASS confirming the tests *discriminate* (guards reddened on removal, transitions arranged per KZ-015). Aggregate: server 2807, client 6944.

## Agent Guide / Constitution Impact — WARN

- A new server module (`domain/entities/users/`) was created — a `## Constitution Impact` note was NOT appended to `execution.md`, and no child guide entry exists. Lightweight: the server child guide (`server/…/src/CLAUDE.md`) does not list the `users` module. Flag for `/akili-archive` Constitution & Graph Sync + a CodeGraph re-index (both packages changed heavily).

## Remediation

| # | Finding | Severity | Action | Owner |
| --- | --- | --- | --- | --- |
| R1 | requirements/design describe a stubbed client-only feature; reality includes 4 backend endpoints + re-skin + history + is_active semantics | WARN | Reconcile the spec docs to record what shipped (or archive with an explicit "superseded by shipped extensions" note) | `/akili-archive` |
| R2 | `users` module created; server child guide + CodeGraph not synced | WARN | Add the module to the server `## Module Guides`; re-index CodeGraph | `/akili-archive` |
| R3 | `name` null-guard (server), redundant history project suffix, sidebar hex detox | Advisory | Optional follow-up tasks | backlog |

No FAIL findings. No unresolved WARN blocks archive — both WARNs are documentation reconciliation that `/akili-archive` performs.

## Archive Readiness Recommendation — READY

All tasks `[x]`, zero FAIL, both suites green, requirements covered (R-UI-009 upgraded from deferred to shipped), DB-verified. The two WARNs are doc-sync work owned by the archive step. Proceed:

```
/akili-archive docs/specs/changes/my-pi-delegates-ui
```
