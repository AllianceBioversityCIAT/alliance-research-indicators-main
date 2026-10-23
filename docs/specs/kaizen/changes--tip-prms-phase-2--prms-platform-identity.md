# Kaizen Entry — changes/tip-prms-phase-2/prms-platform-identity

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/tip-prms-phase-2/prms-platform-identity` |
| Date | 2026-10-22 |
| Branch | AC-1761-TIP-integration-adjustments-to-push-Knowledge-Products (spec branch — default `main`, no pins) |
| Archive Run | 1 |
| Approval Mode | gated (owner standing rule: continue task to task) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 10 (7 planned + 3 owner-approved additions) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-03 ×1) + 1 Leader implicit FAIL (T-02, Dev-dump checksum) | execution.md — T-02, T-03 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 1 (T-07 — MySQL 1267 collation mix; two steps → T-08, T-09) | execution.md — ## Pivot Record: T-07 |
| PRODUCT_BUGs | 1 (T-07 worker PRODUCT finding, resolved by T-08/T-09) | execution.md — T-07 |
| Judgment-day severe findings | escalated round 2, owner-resolved (pre-execution) | judgment.md |
| Validation FAIL / WARN | 0 / 4 | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 (no skipped tasks) — but 1 HITL-found gap (KP ToC hidden, pre-existing rule) | execution.md — T-07 HITL |
| Owner discards | 1 (T-02 first attempt) | execution.md — "T-02 discarded by the owner" |

## Lessons

- **KZ-changes--tip-prms-phase-2--prms-platform-identity-1 — A data-migration `UPDATE` on a table with an `ON UPDATE CURRENT_TIMESTAMP` column rewrites every row's audit timestamp unless it assigns the column to itself.** (Product, Medium)
  - Root cause: T-02's backfill and down-restore `UPDATE`s touched every sync row; MySQL's `ON UPDATE CURRENT_TIMESTAMP(6)` bumped `updated_at` on each, so up→down changed data the requirement said must survive. Nothing in the server guide's persistence rules names the hazard, and the synthetic seed carried no meaningful `updated_at` to notice it.
  - Evidence: execution.md — "Owner-requested run on a Dev dump … implicit FAIL of attempt 1" (`CHECKSUM MATCH: false`, `updated_at` 2026-10-15 → 2026-10-22); attempt 2 fix `updated_at = updated_at`, `CHECKSUM MATCH: true`.
  - Standardization: → P1

- **KZ-changes--tip-prms-phase-2--prms-platform-identity-2 — An open question left unresolved in an archived spec silently became product behavior, and the next spec met it only at HITL.** (Methodology, Medium)
  - Root cause: `bilateral-module--toc-mapping-v2` archived with OQ-V2-5 ("other result types get `allowed_levels: []` meanwhile") still open; the placeholder `[]` shipped as the rule and nothing tracked the question after archive. This spec's TIP Knowledge Products tripped over it during the owner's HITL, adding T-10 and a review round over budget.
  - Evidence: `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-v2/requirements.md:328` (OQ-V2-5, "pre-GA"); `toc-level-rules.util.ts` "pending OQ-V2-5" note; execution.md — "T-07 HITL — partial observation" and the owner decision after it.
  - Standardization: → P2 (upstream)

## Noted, not a lesson

- Recurrence of KZ-001 recorded as P3, not a new lesson: the schema-only TEST baseline + synthetic seeds was a test double that represented neither Dev's rows nor its table/connection collations; it went green over two production defects (the `updated_at` overwrite and the MySQL 1267 collation mix) that only a restored Dev dump exposed. Owner preference adopted mid-run: DB-touching verification on a read-only Dev dump.
- RB-3 (full `migration:test:bootstrap` blocked by `CreatePiDelegates1787600000000`, pre-existing) forced every migration gate onto a targeted route — a standing tax on any migration spec until fixed.
- Two spec tensions (design §5 collision wording, §7.3 unmatched `TIP-999`) were raised by Reviewers mid-run and settled by the owner one by one; fine, but they surfaced late.
- Known client jest runner flake (failed suite, zero failed tests) hit once at T-07; re-run cleared it (memory note exists).
- Execute-time spec edits were frequent (P-21, §7.5 COALESCE, §5 pre-check + down restore, §7.2 COALESCE, §7.1 code 0) — each recorded and carried to the next Reviewer; the mechanism worked.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `server/researchindicators/src/CLAUDE.md` §7 Persistence rules (mirror `src/AGENTS.md`) |
| Edit | `- A data-migration UPDATE on a table with an \`ON UPDATE CURRENT_TIMESTAMP\` column (e.g. \`updated_at\`) must assign it to itself (\`updated_at = updated_at\`) in every backfill and revert statement, or it rewrites every row's audit timestamp.` |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-archive` Step 1 readiness: every open question (`OQ-*`) still unresolved in `requirements.md`/`design.md` must be either answered or recorded as a typed pending follow-up in the kaizen entry file (target, placeholder behavior shipped, owner) — an archived spec must not carry a silent placeholder rule. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-001 |
| Edit | Add source `changes/tip-prms-phase-2/prms-platform-identity` and recurrence note: "**Recurred 2026-10-22** — the schema-only TEST baseline with synthetic seeds (no Dev rows, server-default collation) went green over an `updated_at` overwrite and a MySQL 1267 collation mix; a restored read-only Dev dump exposed both. Proposed standard: root `CLAUDE.md` §4.3 — migrations and cross-table raw SQL are verified on a read-only Dev dump (`mysqldump --single-transaction`) restored into the TEST container." Severity stays High. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/trd/trd.md:216` and `:515` |
| Edit | Replace "MySQL (utf8mb4 / `utf8mb4_unicode_520_ci`)" and "MySQL (utf8mb4, `utf8mb4_unicode_520_ci`)" with "MySQL (utf8mb4; connection collation `utf8mb4_0900_ai_ci` since 2026-10-22, most tables `0900`, some legacy tables `utf8mb4_unicode_520_ci` / `utf8mb4_unicode_ci`)". |
| Severity | Low |
| Status | pending |
