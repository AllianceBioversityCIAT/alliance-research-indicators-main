# Proposal — Bilateral module pending items inventory

## 1. Document control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral-module/pending-items/` |
| Status | DRAFT — awaiting approval before `/sdd-specify` |
| Author | ARI backend team (drafted in session, 2026-05-23) |
| Parent spec | [`../requirements.md`](../requirements.md) · [`../design.md`](../design.md) · [`../tasks.md`](../tasks.md) · [`../frontend-handoff.md`](../frontend-handoff.md) |
| Constitutional baseline | [`../../../prd.md`](../../../prd.md) · [`../../../system-design/design.md`](../../../system-design/design.md) · [`../../../detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) |

---

## 2. Intent

Capture in one reviewable place everything that is still pending for the bilateral module so the team can prioritize, owner-assign, and either fold each item into the existing `tasks.md` or trigger `/sdd-specify` for a new wave of full SDD docs.

The trigger for this proposal is that since the Phase 0–2 backend landed (`AC-1594-bilateral-module-v2`, commits up to `c19efe1a`), three categories of work have accumulated outside the original `tasks.md` plan:

1. **SP catalog wave hardening** (added after `5d48b27b`) — Phase 1.5 cleanups discovered while integrating the FE picker.
2. **Architectural decisions taken in-flight** that need to be reflected in `design.md` (two-upstream sync, STAR-vs-PRMS read-only gate).
3. **Pre-existing phases that are still pending or blocked** (Phase 3 push, Phase 4 W3 sync, Phase 5 SP ToC sync, Phase 6 rollout) — already enumerated in `tasks.md` but worth re-pricing against the current state of the world.

This proposal does not implement any of those items. It scopes the **inventory document** that will sit alongside `tasks.md` and feed the next `/sdd-specify` wave.

---

## 3. Problem / current behavior

- `tasks.md` was written before the SP catalog wave and does not have entries for items A1–A7 below (introduced 2026-05-23).
- `design.md` §3.4 / §3.5 documents the DI scope and local auth bypass constraints but does not yet capture the two-upstream sync model (CLARISA for name/category, PRMS Reporting for color / `reporting_enabled` / `prms_id`) or the STAR-vs-PRMS read-only gate.
- `frontend-handoff.md` §4.6 (commit `c19efe1a`) tells the FE the SP catalog is live, but several follow-on backend hardening items must land before the picker can be fully trusted (catalog validation, source-based read-only, periodic sync).
- There is no single place a new contributor can answer "what's left on the bilateral module?". Today the answer is fragmented across `tasks.md`, three open Jira AC blockers (D-push-auth, D-source-w3, OQ-US5-3/6), and undocumented in-flight architectural decisions.

---

## 4. Proposed outcome

A new sub-spec at `docs/specs/bilateral-module/pending-items/` with the standard SDD trio (`requirements.md`, `design.md`, `tasks.md`) once approved, anchored on the inventory below.

The inventory itself is the contents of §8 of this proposal — once approved, `/sdd-specify` will lift each item into formal requirements with traceability to `R-BIL-*` IDs.

---

## 5. Scope

In scope:

- Phase 1.5 (SP catalog hardening) — A1 through A7 below.
- Architectural deltas to `design.md` triggered by Phase 1.5 (two-upstream sync, source-based read-only).
- Re-validation of Phase 3–6 task statuses (T-21..T-38) and surfacing of current blockers.
- A status field on every pending item (READY, BLOCKED-BY-X, NEEDS-DECISION).

Out of scope:

- Implementing any of the pending items (this is a tracking proposal, not a delivery one).
- Re-writing the existing `tasks.md` Phase 0–2 entries — those are landed and authoritative.
- Cross-module work (W3 Registry sync depends on System Office decisions; PRMS push depends on PRMS team decisions). Captured but not specified here.

---

## 6. Non-goals

- We are **not** committing to ship every item in §8 in the next release. The proposal is scoping a backlog, not a roadmap.
- We are **not** rewriting `tasks.md` task IDs — new items will be appended as `T-15.1`, `T-39+`, etc.
- We are **not** changing the SDD methodology — this is an additional sub-spec, not a new template.

---

## 7. Affected users, systems, and specs

| Affected | How |
| --- | --- |
| ARI backend team | Owns Phase 1.5 + Phase 3+ implementation. |
| STAR frontend team | Indirectly — items A2, A5 change backend contract (404 on unknown sp_codes, read-only flag on PRMS-sourced results). |
| PRMS team | Blocks T-21, T-23 (decisions on push auth and US5 acceptance criteria). |
| System Office | Blocks T-22 (W3 Registry source decision). |
| `docs/specs/bilateral-module/tasks.md` | Will receive new T-IDs once `/sdd-specify` runs. |
| `docs/specs/bilateral-module/design.md` | Will receive new §3.6 (two-upstream sync) and §3.7 (source-based read-only). |
| `docs/specs/bilateral-module/frontend-handoff.md` | §4.6 will be amended once A2 and A5 land (validation behavior + read-only gate). |

---

## 8. Pending items inventory

### 8.A — Phase 1.5: SP catalog wave hardening (READY, near-term)

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| **A1** | STAR FE consumes new alignment shape (`selected_science_programs[]`, `sp_codes`) and fixes `STAR-19792` → `19792` URL bug | NEEDS FE OWNER | Doc: `frontend-handoff.md` §4.2/§4.3/§4.6. Icons: PRMS pattern `/assets/result-framework-reporting/SPs-Icons/{official_code}.png` — STAR should bundle, not hotlink |
| **A2** | `BilateralService.normalizeLeverCodes` must reject unknown `sp_codes` against `clarisa_science_programs` catalog | READY | Today: any string is persisted. Fix: lookup + `BadRequestException` on miss |
| **A3** | Sibling `*.spec.ts` for `BilateralService`, `BilateralController`, `ClarisaScienceProgramsService`, `ClarisaScienceProgramsController` | READY | Required by `src/CLAUDE.md` §9; 60% coverage gate at risk |
| **A4** | Rename `result_pool_funding_alignment_sp.lever_code` → `sp_code` (or document the semantic mismatch) | READY (low priority) | Column now stores SP codes, name is misleading |
| **A5** | Source-based read-only gate: `is_read_only = true` when `result.platform_code === 'PRMS'` (in addition to `is_synced_to_prms`) | NEEDS DECISION | Per session clarification: "if from PRMS, info should be mapped only, not edited" |
| **A6** | Apply migration `1779190000010` to dev / staging / prod | READY | Only ran locally so far; endpoint will 500 in any env without the seed |
| **A7** | Update `tasks.md` to include A1–A6 as `T-15.1..T-15.7` (or equivalent) | READY | Doc/code drift per `CLAUDE.md` §1 |

### 8.B — Architectural deltas to capture in `design.md`

| ID | Item | Status |
| --- | --- | --- |
| **B1** | Document two-upstream sync model: CLARISA owns `code` / `name` / `category` / `acronym`; PRMS Reporting owns `color` / `reporting_enabled` / `prms_id`. Catalog row is a join of both. | READY |
| **B2** | Document source-based read-only gate alongside A5 (linked) | READY |
| **B3** | Document SP icon strategy: bundle in STAR FE keyed by `official_code`; backend may later add `icon_key` nullable column | READY |
| **B4** | Optional follow-on migrations: `reporting_enabled BOOLEAN`, `prms_id INT UNIQUE`, `icon_key VARCHAR(64)` columns on `clarisa_science_programs` | NEEDS DECISION (vs. wait for live sync) |

### 8.C — Phase 3: Push to PRMS (BLOCKED, pre-existing in `tasks.md`)

| ID | Item | Status |
| --- | --- | --- |
| **T-21** | Close **D-push-auth** with PRMS team | BLOCKER — external |
| **T-23** | Close **OQ-US5-3** + **OQ-US5-6** with PRMS team | BLOCKER — external |
| **T-25** | `ResultToPrmsMapper` + payload-shape tests | BLOCKED by T-21 |
| **T-26** | Push service + queue consumer + retry cron | BLOCKED by T-25 |
| **T-27** | Approve transition triggers push enqueue | BLOCKED by T-26 |
| **T-28** | Admin push retry endpoint + SSR page | BLOCKED by T-26 |

### 8.D — Phase 4: W3 Registry sync (BLOCKED, pre-existing)

| ID | Item | Status |
| --- | --- | --- |
| **T-22** | Close **D-source-w3** with System Office | BLOCKER — external |
| **T-29** | W3 Registry sync module + cron | BLOCKED by T-22 |
| **T-30** | Admin W3 sync endpoint + SSR page | BLOCKED by T-29 |

### 8.E — Phase 5: SP ToC sync (READY but de-prioritized, pre-existing)

| ID | Item | Status |
| --- | --- | --- |
| **T-31** | SP ToC sync module + cron (indicators-per-SP). Catalog itself is now seeded (A6); this task is now scoped to indicators per SP, not SP metadata | READY |
| **T-32** | Admin SP ToC sync endpoint + SSR page | READY |
| **NEW** | Periodic catalog sync from CLARISA + PRMS Reporting (per B1) — covers SP metadata refresh only | READY |

### 8.F — Phase 6: Rollout (READY when Phase 3+ lands)

| ID | Item | Status |
| --- | --- | --- |
| **T-33** | Full E2E suite | DEPENDS on Phase 3 |
| **T-34** | Idempotency + failure-injection tests | DEPENDS on T-26 |
| **T-35** | CloudWatch dashboard + alarms | READY when push lands |
| **T-36** | Runbook | DEPENDS on Phase 3 |
| **T-37** | Staging dry-runs | DEPENDS on Phase 3 |
| **T-38** | Production rollout | DEPENDS on T-37 |

---

## 9. Requirement delta preview

### ADDED requirements

- **R-BIL-070** — `sp_codes` MUST be validated against `clarisa_science_programs` on PATCH alignment; unknown codes return 400 with the offending list in `errors`. (A2)
- **R-BIL-071** — Alignment is read-only (`is_read_only=true`, mutations 409) when the parent `result.platform_code === 'PRMS'`, regardless of `is_synced_to_prms`. (A5)
- **R-BIL-072** — `clarisa_science_programs` catalog SHALL be sourced from two upstreams: CLARISA `/api/cgiar-entities` (filtered to `^SP[0-9]{2}$`) for `code`/`name`/`category`, and PRMS Reporting `/api/results/admin-panel/phases/:phaseId/reporting-initiatives` for `color`/`reporting_enabled`/`prms_id`. Sync is periodic; race conditions resolved by upstream-preserves-wins on each column. (B1)

### MODIFIED requirements

- **R-BIL-015 / R-BIL-034** — extended to include the source-based read-only gate (currently only covers post-PRMS-sync state). (A5)
- **`tasks.md` T-31** — re-scoped from "SP catalog sync" to "indicators-per-SP sync" (catalog metadata sync is now covered by NEW above). (E)

### REMOVED requirements

- None.

---

## 10. Approach options

### Option 1 — Append everything inline to existing `tasks.md`

Pros: single file, no new sub-spec, fastest.
Cons: blurs the original Phase 0–2 plan with mid-flight discoveries; loses the SDD "one feature folder per change" convention; can't run `/sdd-specify` cleanly.

### Option 2 — Create `pending-items/` as a new SDD sub-spec (Recommended)

Pros: matches the convention (`docs/specs/<module>/<feature>/`); proposal here becomes inventory, `/sdd-specify` lifts it into formal `requirements.md` + `design.md` + `tasks.md`; preserves the original `tasks.md` as the Phase 0–2 baseline; gives Phase 1.5 + architectural deltas their own traceable lineage.
Cons: one extra folder; one extra hop for readers.

### Option 3 — One sub-spec per item (A1 through F38)

Pros: maximum traceability.
Cons: ceremony overload for items that are 1-line code changes (A2, A6); fragments review.

---

## 11. Recommended approach

**Option 2.** It is the smallest change that respects the SDD methodology, keeps the original tasks.md as a historical baseline, and gives the team a single approvable artifact (this proposal) that decides scope before any detailed spec work begins.

The sub-spec at `docs/specs/bilateral-module/pending-items/` will, after `/sdd-specify`, contain:

- `requirements.md` — formal versions of R-BIL-070 / 071 / 072 plus traceability for A1–A7.
- `design.md` — the two-upstream sync diagram, source-based read-only flow, icon strategy.
- `tasks.md` — new T-IDs `T-15.1..T-15.7` (Phase 1.5) plus a re-pricing of T-21..T-38 reflecting current blockers and dependencies.

---

## 12. Risks, dependencies, and open questions

| Risk / Question | Mitigation |
| --- | --- |
| Phase 1.5 items (A2, A5) change FE contract; STAR build that already consumes today's contract could break. | Both are additive at the response level (`is_read_only` already exists; 400 on bad code is correct error semantics). Coordinate landing window with STAR FE team. |
| Two-upstream sync (B1) introduces consistency risk if CLARISA and PRMS disagree on what exists. | Design intent: CLARISA wins on existence (is the SP in the portfolio at all?); PRMS only enriches existing rows. Capture this in design.md. |
| Phase 3+ blockers (T-21, T-22, T-23) are external; no internal action will unblock them. | Track in this proposal; escalate via PO; do not start dependent work until they close. |
| Static seed for catalog will drift the moment PRMS recolors an SP. | Acceptable for now; periodic sync (E) is the eventual fix. |
| Migration A6 (apply `1779190000010` to dev/staging/prod) blocks ANY environment from using the SP endpoint. | Highest-priority operational item — should land before A1 (FE consumption) in any non-local env. |

---

## 13. Success criteria

- This proposal is approved by the bilateral module PO.
- `/sdd-specify bilateral-module/pending-items` produces a clean three-file spec set.
- Every item in §8 has an owner and a status in the resulting `tasks.md`.
- `frontend-handoff.md` §12 changelog references the new spec so the FE team knows where to look for next-wave context.

---

## 14. Next step

```text
/sdd-specify bilateral-module/pending-items
```

After approval of this proposal, that command will generate the formal `requirements.md`, `design.md`, and `tasks.md` for the pending-items wave. Until then, this proposal is the canonical reference for "what's left on the bilateral module".
