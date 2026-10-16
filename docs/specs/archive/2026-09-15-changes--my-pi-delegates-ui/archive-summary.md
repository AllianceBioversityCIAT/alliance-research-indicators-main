# Archive Summary — My PI Delegates (Frontend / STAR)

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/changes/my-pi-delegates-ui` |
| Archive date | 2026-09-15 |
| Final status | ✅ Delivered + validated (PASS with doc drift owned here) |
| Branch | AC-1733-pi-delegates · commits dd6f6cb7 → 0d9b80fc (7) |
| Backend dependency | `archive/2026-09-11-changes--my-pi-delegates` (delegation API) |

## Final Status

The 9-task client spec shipped in full, then grew — through the conversation — into a **full-stack feature**: the backend the spec had stubbed was built, the page was re-skinned to a new mockup, and the deferred history requirement was delivered. All work was independently reviewed (opus) and DB-verified. Server 2807/2807, client 6944/6944 green; module hex-clean.

## Requirements Delivered

| Req | Delivered |
| --- | --- |
| R-UI-001 nav + route | ✅ (+ runtime 404 CR-01 fixed) |
| R-UI-002/003 tabs | ✅ re-skinned; By-person gained Email + Status columns |
| R-UI-004 counters | ✅ restored as header stats |
| R-UI-005/006/007 assign SYNC | ✅ + modal locks + inactive warning |
| R-UI-008 revoke | ✅ |
| R-UI-009 history | ✅ **upgraded from deferred → shipped** |
| R-UI-010 single source | ✅ |
| NFR-UI-001/002/003 | ✅ |

## Files Changed Summary

- **Client:** new `pages/platform/pages/my-pi-delegates/` (page shell, by-project, by-person, assign modal, history modal, service, picker service) + `shared` edits (api.service, pi-delegates.interface, modal.types, all-modals, all-modals.service, alliance-sidebar, app.routes).
- **Server:** `pi-delegates` extended (by-user/projects, by-user/people, history endpoints; enriched + status-derived `is_active`) + NEW `domain/entities/users/` module (`GET /api/users/active`).

## Test Evidence Summary

Per-task + per-extension co-located specs, each behind an opus Reviewer PASS confirming discrimination (KZ-001/014/015). Aggregate: server 2807, client 6944. Backend SQL verified against the local DB (managed ids, active-users filter, is_active derivation, enriched history sentences).

## Validation Summary

`validation-report.md` — **PASS with drift**. Zero FAIL. Two WARN (doc drift; users-module guide/CodeGraph sync) accepted here.

## Accepted Warnings / Follow-Ups

| # | Item | Disposition |
| --- | --- | --- |
| W1 | `requirements.md`/`design.md` describe the original stubbed client-only scope; reality is a full-stack superset | **Accepted** — this summary + `execution.md` are the record; the point-in-time spec docs are left as the historical baseline (not rewritten) |
| W2 | `users` server module not in the server child guide; CodeGraph stale | Recommend re-index; guide note optional (entity modules aren't individually enumerated) |
| F1 | `name` null-guard (server); redundant history project suffix; sidebar hex detox; two-cache robustness | Backlog (advisory) |
| — | People picker (`/api/users/active`) now includes status 4 | Resolved (commit 0d9b80fc) |

## Historical Notes

- **Scope growth:** began as a client-only UI over a stubbed backend; ended full-stack because the user asked for the real endpoints + a re-skin + history mid-flow. Positive drift, fully tested.
- **CR-01 (runtime nav 404):** the nav link used `/platform/…` (a prefix that doesn't exist); compiled clean, 404'd at runtime. Fixed to `/my-pi-delegates`. The exact KZ-017 gap (a check narrower than its claim) — recorded in the Kaizen log.
- **is_active semantics:** redefined to derive from account status (active ⟺ status ∈ {Accepted, External Accepted}), replacing the raw soft-delete flag.
- **By-person data path** evolved: `loadByPerson` → `computed` inversion of byProjectCache (T-UI-06) → the `by-user/people` endpoint. The spec docs describe the middle state.
