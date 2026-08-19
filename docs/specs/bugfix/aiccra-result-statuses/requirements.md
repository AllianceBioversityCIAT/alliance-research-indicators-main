# Requirements — Bugfix / AICCRA result statuses

- **Module:** results (result_status catalog)
- **Spec id:** 2026-08-aiccra-result-statuses
- **Status:** in-review
- **Owner:** David / STAR backend
- **Linked PRD section:** `docs/prd.md` §1 (AICCRA as partner platform)
- **Linked tickets:** none
- **Extends:** ./proposal.md
- **Last updated:** 2026-08-19
- **Mode:** Bug Mode (Lite)

---

## 1. Context

AICCRA/MARLO exposes four result statuses: Submitted, Completed, Extended, On Going. ARI already has rows **21 Editing in AICCRA** (unused) and **22 Submitted in AICCRA**. The catalog must match the four labels without deleting 21 and without rewriting merged migrations.

---

## 2. Functional requirements

### R-ARS-001 — Enum matches the live AICCRA catalog

- **As a** System Admin / developer
- **I want** `ResultStatusEnum` to name Submitted (22) and the three missing AICCRA statuses
- **So that** code can reference them without magic numbers

**Acceptance criteria:**
- [ ] AC.1 — `SUBMITTED_IN_AICCRA = 22`
- [ ] AC.2 — `COMPLETED_IN_AICCRA = 26`, `EXTENDED_IN_AICCRA = 27`, `ON_GOING_IN_AICCRA = 28`
- [ ] AC.3 — `ResultStatusNameEnum` uses `Submitted in AICCRA`, `Completed in AICCRA`, `Extended in AICCRA`, `On Going in AICCRA`
- [ ] AC.4 — no `EDITING_IN_AICCRA` member

### R-ARS-002 — Soft-deactivate unused Editing (21)

- **As a** System Admin
- **I want** row 21 inactive, not deleted
- **So that** historical FKs stay valid

**Acceptance criteria:**
- [ ] AC.1 — a new migration sets `result_status.is_active = 0` where `result_status_id = 21`
- [ ] AC.2 — that migration does not `DELETE` id 21
- [ ] AC.3 — `down()` restores `is_active = 1` for id 21

### R-ARS-003 — Insert only missing statuses

- **As a** MEL / AICCRA consumer
- **I want** Completed, Extended, On Going in `result_status`
- **So that** the catalog matches the AICCRA filter

**Acceptance criteria:**
- [ ] AC.1 — insert ids 26, 27, 28 with the names in R-ARS-001
- [ ] AC.2 — do not insert a second Submitted (22 already exists)
- [ ] AC.3 — `down()` deletes 26, 27, 28 and does not delete 22

### R-ARS-004 — Append-only migrations

- **As a** developer
- **I want** only a new migration file
- **So that** merged history stays the source of truth

**Acceptance criteria:**
- [ ] AC.1 — `1767821369314-insertAndUpdateNewStatus.ts` still contains the Editing/Submitted AICCRA inserts
- [ ] AC.2 — no other pre-existing migration file is modified

---

## 3. Non-goals

Workflow, STAR UI, applying the migration on shared Dev without explicit approval (K-015).
