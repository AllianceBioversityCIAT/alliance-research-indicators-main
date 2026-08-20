# Requirements — Results / Cross-year same-handle duplicate deletion

- **Module:** results
- **Spec id:** 2026-08-cross-year-duplicate-deletion
- **Depth:** Lite · **Bug Mode:** yes (root cause confirmed in `./proposal.md`)
- **Status:** approved (specify complete 2026-08-20 — ready for `/akili-execute`)
- **Owner:** ARI server squad
- **Linked tickets:** AC-1641
- **Extends:** `results/cross-platform-duplicate-resolution` (amends **R-RES-006** / OQ-3)
- **Proposal:** `./proposal.md` — approved 2026-08-20
- **Worktree:** `alliance-research-indicators-ac1641-duplicates` @ `AC-1641-Integration-improvements`
- **Last updated:** 2026-08-20

---

## 1. Context

Parent sweep matches PRMS↔TIP on normalized publication handle, then **refuses deletion** when `report_year_id` differs (`CROSS_YEAR_REVIEW`). Exemplar: PRMS official **7154** (`result_id` 23584, 2023) and TIP official **27277** (`result_id` 29308, 2022) share `hdl.handle.net/10568/129634`; audit log id **180** left both `UNTOUCHED`. Business rule (TIP wins) never runs.

**Not changing:** identity sources (R-RES-010), STAR protection, multi-identity refusal, same-system ignore, soft-delete ban, sync mapper contracts, `hard_delete_enabled` policy.

---

## 2. Defect classes → gates

| # | Defect class | Gate |
| --- | --- | --- |
| DC-A | **Under-deletion** — same-handle cross-year group stays `CROSS_YEAR_REVIEW` / empty `toDelete` | Util regression (R-CYD-001) — **red on current code, green after** |
| DC-B | **Over-deletion** — same-platform or `UNRESOLVED_CONFLICT` group becomes deletable | Existing parent util matrix + explicit negative ACs |
| DC-C | **Docs drift** — parent still says “never auto-deleted” for cross-year | Grep parent R-RES-006 / runbook / design for superseded wording |
| DC-D | Live apply surprises | HITL dry-run review before apply (inherited; not automatable here) |

---

## 3. Functional requirements

### R-CYD-001 — Same-handle cross-year groups resolve under platform rules

- **As a** System Admin running duplicate-resolution plan/apply
- **I want** groups that already share one normalized publication identity to resolve with Rules 1–3 even when participants’ `report_year_id` values differ
- **So that** losers (e.g. PRMS when TIP wins) enter `toDelete` instead of a permanent `CROSS_YEAR_REVIEW` queue

**Behavior:**
- Unequal `report_year_id` MUST NOT by itself classify a cross-platform same-identity group as `CROSS_YEAR_REVIEW` or clear its losers.
- Year MAY remain on the plan for filtering/review; it MUST NOT veto Rule 1–3 outcomes.
- Parent **R-RES-006** is amended: year is informational/filterable, not a deletion veto for same-identity groups.
- `SAME_SYSTEM_IGNORED`, STAR protection, multi-identity refusal, and `UNRESOLVED_CONFLICT` gates stay as today.

**Acceptance criteria:**
- [ ] AC.1 — Fixture shaped like the exemplar (TIP + PRMS, same normalized handle, years 2022 vs 2023) → `RESOLVED`, deciding rule `RULE_1_TIP`, TIP winner, PRMS in losers / plan `toDelete` (subject to STAR/refusal).
- [ ] AC.2 — Sweep `plan` for group key `hdl.handle.net/10568/129634` no longer returns `CROSS_YEAR_REVIEW` with empty `toDelete` for that pair (when those rows remain live).
- [ ] AC.3 — Same-platform multi-year group still → `SAME_SYSTEM_IGNORED` (no deletion).
- [ ] AC.4 — Parent docs (R-RES-006 text, design bullet on cross-year never-delete, runbook if present) no longer claim cross-year same-identity groups are never auto-deleted.

#### Scenario: Exemplar 7154 / 27277

- GIVEN active PRMS KP `result_id` 23584 (official 7154, year 2023) and TIP KP `result_id` 29308 (official 27277, year 2022) sharing normalized identity `hdl.handle.net/10568/129634`
- WHEN the reconciliation sweep builds a plan for that group
- THEN classification is `RESOLVED` with TIP as winner under Rule 1
- AND PRMS 23584 is in the expanded deletion set (unless STAR-protected or multi-identity refused)
- BUT it must NOT classify the group `CROSS_YEAR_REVIEW` solely because years differ
- AND IT MUST still refuse deletion for same-`platform_code` groups

#### Scenario: Regression test (Bug Mode)

- GIVEN the util/service test fixture with two platforms, one handle, two years
- WHEN the suite runs on pre-fix code
- THEN the assertion expecting `RESOLVED` / TIP winner **fails** (red)
- AND after the fix the same test **passes** (green)

---

### R-CYD-002 — Regression locks the corrected behavior

- **As an** engineer on AC-1641
- **I want** an automated regression that encodes Scenario “Exemplar 7154 / 27277”
- **So that** `flagCrossYear` (or equivalent) cannot silently restore under-deletion

**Acceptance criteria:**
- [ ] AC.1 — At least one unit test targets `resolveDuplicateGroup` (and/or sweep `collectGroups` planning) with the two-year same-handle shape; red before fix, green after.
- [ ] AC.2 — Verification command: `npm test -- --silent --testPathPattern=duplicate-result-priority` (and any sibling plan/service pattern touched) from `server/researchindicators/`.
- [ ] AC.3 — Disqualifier: if the test stubs away `reportYearId` or never passes `flagCrossYear`/sweep options that production uses, it is not evidence (KZ-001).

---

## 4. Non-functional

### NFR-CYD-001 — No soft-delete fallback

- **Category:** reliability
- **Target:** when hard delete is disabled, outcomes stay plan/audit only — never `delete_result` soft path.
- **How verified:** inherited parent runner behavior; no new soft path in this fix.

---

## 5. Requirement ID index

| ID | Title |
| --- | --- |
| R-CYD-001 | Same-handle cross-year groups resolve under platform rules |
| R-CYD-002 | Regression locks the corrected behavior |
| NFR-CYD-001 | No soft-delete fallback |

---

## 6. Open questions

| ID | Question | Default if unanswered |
| --- | --- | --- |
| OQ-CYD-1 | Confirm MEL/ops accept reversing parent OQ-3 / R-RES-006 (cross-year become deletable) | **Yes** — proposal Option A approved 2026-08-20 |
| OQ-CYD-2 | Keep `CROSS_YEAR_REVIEW` enum for any remaining use, or delete the branch entirely? | Remove veto path; enum may remain unused until parent cleanup |
