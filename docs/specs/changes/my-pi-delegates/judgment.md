> ⚠️ **SUPERSEDED (2026-09-09).** This Judgment Day ran against the **v1** design (role-based "PI Delegate" + full STAR frontend), which the user **withdrew**. The current spec is **v2** (relational `pi_delegates` table, backend-only, no role, no frontend; extend `isPi()` + `queryPrincipalInvestigator()`). This ledger is retained as a point-in-time record of the v1 review; several v1 findings (identity keying, results-guard hook, the whole frontend surface) no longer apply. A fresh review, if wanted, should target the v2 `design.md`.

---

# Judgment Day — design.md (Round 1) — v1 (superseded)

- **Target:** `docs/specs/changes/my-pi-delegates/design.md` vs `requirements.md`
- **Mode:** judgment_day (two blind read-only judges, Sonnet; author was Opus → author ≠ auditor)
- **Date:** 2026-09-09
- **Judges:** Judge A (J-A-*), Judge B (J-B-*) — ran in parallel, no coordination.

## Merged ledger

### CONFIRMED SEVERE (both judges, independently) → fix

| ID | Defect | Evidence | Fix |
| --- | --- | --- | --- |
| **S1** | **MySQL can't do a filtered/partial unique index.** `idx_project_users … filtered to active rows` is unimplementable; re-grant after soft-delete would hit a duplicate-key error. | J-A-3 + J-B-1. Repo precedent: `1779190000014-fixResultPoolFundingAlignmentPartialUnique.ts` and `1779190000011-createBilateralProjectMapping.ts` (D-PI-9) both use a STORED generated column `IF(is_active=1, <key>, NULL)` + UNIQUE on it. | Adopt the generated-column pattern for `project_users`. |
| **S2** | **`PiDelegateResultGuard` hooks the wrong component.** The real approve/reject/request-changes action is `POST change-status/:resultCode/to-status/:toStatusId` in `result-status-workflow.controller.ts`, which has **no** `ResultStatusGuard`; PI enforcement today is a data-driven `isPiValidation` step (workflow config / `FunctionHandlerService`), not a guard. "Composes after ResultStatusGuard" is architecturally wrong. | J-A-2 + J-B-4. | PR3 extends **`isPiValidation`** to also accept a caller holding an active PI Delegate row on the result's primary project — not a new guard "after ResultStatusGuard". |
| **S3** | **Identity-space mismatch.** Delegates are stored as `alliance_user_staff.carnet`; PI is resolved via `sec_users.sec_user_id` name-match. The DD-4 union compares a carnet-keyed set against a sec_user_id-keyed set with no specified translation; a NULL `sec_users.carnet` silently breaks delegate lookup and self-exclusion. | J-B-2/J-B-3 (severe); corroborated by J-A-JB-1 (the shipped `isPi()` keys on `projectLeadId`=carnet). | Key **everything on carnet**: resolve caller→carnet (via `sec_users`↔`alliance_user_staff` email/carnet, per shipped `isPi()`), resolve PI projects via `agresso_contracts.projectLeadId`=carnet, delegates via `project_users.user_id`=carnet. Union becomes coherent. Handle NULL carnet explicitly. |
| **S4** | **Read endpoints are not authorized/scoped.** E1/E2/E5/E6 list only `RolesGuard` with no `@Roles` → the no-op path passes every logged-in user; E1 returns empty-200 instead of 403 (violates R-PID-002 AC.2); **E5 history has no project-scope check → any user can read another PI's history by guessing a projectId** (violates R-PID-011 AC.2). | J-A-1 (severe) + J-B-8 + J-A-JB-4 (warnings). | Add an eligibility check to E1 (403 when manageable set empty); intersect E5's `projectId` with the caller's manageable set server-side; name the base `@Roles` on all endpoints. |

### CONFIRMED / accepted WARNINGS → fix (cheap, correct, tightly coupled)

| ID | Defect | Fix |
| --- | --- | --- |
| **W1** | R-PID-001 AC.2 "STAR-origin distinguishable" has no design home (J-B-12 + J-A-JB-6). | Close structurally: **all `user_roles` rows are STAR-managed by definition**; Agresso project roles are never inserted there. Distinguishable by table membership — document it; no new column. |
| **W2** | Enum value from AUTO_INCREMENT is environment-dependent (J-B-5). Every existing `user_roles` seed hard-codes the id to match the enum. | Assign a fixed `UserRolesEnum.PI_DELEGATE` value and INSERT with an explicit `user_role_id`. |
| **W3** | Name-match PI resolution is fragile; shipped `isPi()` already uses `projectLeadId` (carnet FK) (J-A-JB-1). | Make `queryMyPiProjects` use `projectLeadId` as primary (this also delivers S3). Update DD-3. |
| **W4** | `pi_delegate_event` vs NFR-PID-004 "records extend AuditableEntity" contradiction (J-A-JB-2). | Event table **intentionally does not** extend AuditableEntity (truly append-only, no soft-delete/edit columns). Amend NFR-PID-004 wording (it refers to `project_users`, not the event log). |
| **W5** | `assign()` partial-success not stated; R-PID-008 AC.4 needs all-or-nothing (J-A-JB-5). | State the full N×M insert+events is a **single atomic transaction**; any error → full rollback + `GlobalExceptions` 5xx; client shows error state. |
| **W6** | "timestamp with tz" — MySQL has no TIMESTAMPTZ (J-B-9). | Reword design + R-PID-011 AC.1 to "UTC-stored MySQL TIMESTAMP". |
| **W7** | `ManageableProjectGuard` vs admin bypass unspecified (J-A-JB-3). Guards AND-compose, so a new guard won't auto-bypass — but state it. | Document: ManageableProjectGuard does **not** grant SYSTEM_ADMIN/CENTER_ADMIN cross-project delegate powers (aligns R-PID-001 "no admin rights"). |
| **W8** | FK `project_id → agresso_contracts.agreement_id` ON DELETE unspecified (J-B-6). | Specify `ON DELETE RESTRICT` + migration comment. |
| **D1** | Doc drift: design claims OQ-5 "pinned" while requirements marks it open; OQ-4 treated as resolved (J-B-10 + J-C-1). Budget arithmetic/ is_active seed nits (J-C-3, J-B-11). | Propose concrete defaults for OQ-4/OQ-5 marked "proposed — confirm with product", remove false "pinned" claim; split PR1/PR3 LOC; drop explicit is_active from seed. |

### Not fixed (info only)
- J-C-2 (edit-delta submission flow) — will be specified concretely in the fix (combined-delta), folded into W5/§7.

## Round 1 verdict
4 confirmed severe + 8 accepted warnings. User approved **Fix + re-judge**. All applied to `design.md` + `requirements.md`.

---

# Round 2 — scoped re-judgment (Judges C + D, blind, Sonnet)

**Verdict on the fix delta:** both judges independently confirm **all 13 Round-1 items RESOLVED, zero regressions.**

New defects surfaced (each single-judge — not mutually confirmed, so not "confirmed severe" per the two-judge rule — but all deterministic/objectively-correct, so fixed in a final bounded round rather than re-litigated):

| ID | Sev | By | Defect | Fix applied |
| --- | --- | --- | --- | --- |
| **NF-1** | SEVERE | D | `active_assignment_key` had no VARCHAR length → migration fails/truncates | `varchar(70)` pinned (§4.2) |
| **NEW-S1** | SEVERE | C | PR3 `isPiValidation` extension lacked a concrete join spec | Added `isProjectDelegate(resultId, carnet)` join + `isPi OR isProjectDelegate` shape (§6) |
| **NF-2** | WARN | D | E5 unmanaged `projectId` was "empty/403" (ambiguous) | Pinned to **403** (§5) |
| **NF-6** | WARN | D | Nullable `projectLeadId` gap (PI invisible) undocumented | Documented as accepted limitation + OQ-1 note (§6, OQ-1) |
| **NF-7** | INFO/WARN | D | `callerCarnet` described carnet-first vs shipped email-bridge | Email join declared authoritative (§6) |
| **W6-partial / NF-5** | WARN | D | "timestamp with timezone" survived in R-PID-011 Details | Reworded to UTC-stored (requirements) |
| **NF-3** | WARN | D | Requirements §5 History sentence still framed as open | Updated to the decided `pi_delegate_event` table |
| **NF-4** | WARN | D | OQ-1 not closed while design resolved it | Closed with RESOLVED annotation |

Final independent verification (deterministic grep): all fix strings present; no invalid phrasing survives (the only `Compose after ResultStatusGuard` hit is the DD-5 *rejected-alternative* citation, which is correct).

## Terminal verdict

All Round-1 severes resolved and corroborated; all Round-2 uncovered defects fixed and verified. No open severe remains.

**JUDGMENT: APPROVED ✅**  (2 rounds, within the 2-fix / 2-re-judgment ceiling; skill resolution: judgment-day; author=Opus, judges=Sonnet ×4, author ≠ auditor upheld.)
