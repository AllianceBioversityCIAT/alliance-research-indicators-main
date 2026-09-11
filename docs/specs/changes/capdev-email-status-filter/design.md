# Design — Results / CapDev Email Status Filter

- **Module:** results
- **Spec id:** 2026-08-capdev-email-status-filter
- **Status:** approved (Phase 2 — judgment-day round 2 PASS)
- **Owner:** ARI squad
- **Linked requirements:** ./requirements.md
- **Linked proposal:** ./proposal.md
- **Linked archived design:** `docs/specs/archive/2026-08-11-results--capdev-bulk-upload-notification/design.md` §6.1 (join spine)
- **Linked TRD:** `docs/trd/trd.md` (Results domain, TypeORM query patterns, ServerResponseDto defaults)
- **Last updated:** 2026-08-26
- **Depth:** Standard
- **Worktree:** `/Users/pelitos/Documents/CIAT/alliance-research-indicators-ac1607-capdev-email`

---

## Budget (Step 2.4 tripwire)

| Signal | Estimate |
| --- | --- |
| **Expected tasks** | 3 |
| **Expected LOC** | ~120–200 production+test (mostly test fixtures); ~25–40 production |
| **Expected review rounds** | 1–2 |

`/akili-execute` MUST stop and escalate if actuals clearly exceed this (e.g. >5 tasks, >400 LOC, or >3 review rounds) without a Pivot.

---

## 1. Goals & non-goals

**Goals**

1. Single eligibility choke point for CapDev notification reads (R-CESF-001, NFR-CESF-001).
2. Email groups/metrics and CapDev persisted columns use the same eligible set (R-CESF-002, R-CESF-004).
3. Zero eligible CapDev → skip send + SKIPPED semantics (R-CESF-003, R-CESF-004).
4. Never use requested/`final_status` alone for eligibility (R-CESF-005).

**Non-goals**

- Changing `customStatus` / green-check promotion rules.
- Fixing `bulk_upload_results.final_status` write skew (document only; filter around it).
- Schema migrations, API contract, STAR UI, template copy redesign.
- Status-filtering `total_results`.

---

## 2. Architecture Overview

No new module. Narrow an existing CapDev notification stage on AC-1607:

```
ResultsService.createResultFromAiBulk
        │
        ▼
CapdevBulkNotificationService.dispatch
        │
        ├─ findGroups / findMetrics / findCountries  ← shared spine (+ status)
        ├─ findUnattributedResultIds                 ← parallel CapDev query (+ status)
        ├─ countTotalResults                         ← UNCHANGED (no status filter)
        ├─ persistProcessMetrics (CapDev cols from eligible aggregates)
        └─ sendGroupNotification per group with ≥1 eligible row
```

Eligibility is a **SQL predicate**, not a service-layer post-filter (NFR-CESF-001).

### 2.1 Composition (files touched)

| Path | Responsibility |
| --- | --- |
| `.../notifications/capdev-bulk-notification.repository.ts` | Extend `capdevSpineQuery`; mirror status predicate on `findUnattributedResultIds`; leave `countTotalResults` as created-only |
| `.../notifications/capdev-bulk-notification.repository.spec.ts` | **Primary verification:** structural QB asserts (join + status bind); skew / Draft / unattributed fixtures |
| `.../notifications/capdev-bulk-notification.service.spec.ts` | Draft-only → no send + SKIPPED; eligible-but-unattributed-only → SKIPPED + zero CapDev persist; `total_results` vs `total_capdev_results`; **no** mixed-status eligibility tests (repository owns predicate) |
| `.../notifications/capdev-bulk-notification.service.ts` | **No logic change** — aggregates already derive from repository outputs; update comments that still say “created CapDev” where they mean eligible |

Formatter / recipients / template DTO: **no change** if inputs already reflect filtered metrics.

### 2.2 Reuse

- `ResultStatusEnum.SUBMITTED` / `APPROVED` as bound parameters (never ad-hoc magic numbers without the enum).
- Existing `Result` entity join target for live `result_status_id`.
- Existing `deriveNotificationStatus` / flag-off / outer try-catch (NFR-CESF-002).

---

## 3. Data Model

**No schema changes. No migrations.**

| Entity | Role |
| --- | --- |
| `BulkUploadResults` | Batch row; still stores Draft CapDev rows |
| `Result` | **Source of truth** for eligibility via `result_status_id` |
| `BulkUploadProcesses` | CapDev metric columns written from eligible aggregates; `total_results` from unfiltered created count |

---

## 4. API Design

**No API delta.** `POST /api/.../ai/formalize/bulk` envelope unchanged. Behavior change is side-effect only (email + process columns).

---

## 5. Backend Module Design — Eligibility rules

### 5.0 Shared eligibility helper (mandatory)

Introduce one module-private source for the status bind list and its application — e.g.:

- `ELIGIBLE_RESULT_STATUSES = [ResultStatusEnum.SUBMITTED, ResultStatusEnum.APPROVED]` (module-level constant), and
- `applyEligibleResultStatusFilter(qb, alias = 'r')` — applies **`innerJoin(Result, alias, \`${alias}.result_id = bur.result_id\`)`** plus **`andWhere(\`${alias}.result_status_id IN (:...eligibleStatuses)\`, { eligibleStatuses: ELIGIBLE_RESULT_STATUSES })`**.

**Rules:**

- **INNER JOIN only** on the spine — never LEFT — so rows without a matching `results` row or with ineligible status are excluded (R-CESF-001).
- **Do not** join via `bur.final_status` / `bur.suggested_status` or their `@ManyToOne` relations (`final_status_result`, `suggested_status_result`) — those are metadata, not live status (R-CESF-005).
- Both `capdevSpineQuery` and `findUnattributedResultIds` MUST call this helper (or equivalent single function) — no duplicated literal status lists (DD-CESF-2, judgment J-A-W1).

### 5.1 Shared spine (`capdevSpineQuery`)

After existing CapDev/created predicates and before contract grouping, call `applyEligibleResultStatusFilter`.

Retain existing predicates: process id, CapDev indicator, `result_id IS NOT NULL`, `error_message IS NULL`, active-primary-contract tie-break.

**Effects:** Q1 groups, Q2 metrics, Q3 countries automatically inherit eligibility → email and CapDev persist path stay aligned (R-CESF-004 / archived R-CBU-008 AC.6).

### 5.2 Unattributed query (not on spine today)

`findUnattributedResultIds` duplicates CapDev “created” filters with a **left** join to primary contracts (unchanged shape). **Must call the same `applyEligibleResultStatusFilter`** so only eligible CapDev rows can appear in the unattributed warn (R-CESF-002 AC.4).

Do **not** refactor unattributed onto the spine (spine inner-joins a primary contract; unattributed needs the opposite contract join).

### 5.3 `countTotalResults`

**Unchanged:** all created batch rows (any indicator, any status). Documents R-CESF-004 AC.3.

### 5.4 Zero eligible (dispatch skip trigger)

**Authoritative skip condition (R-CESF-003):** `findGroups(processId)` returns **zero groups** after the eligible spine reads. This is equivalent to “zero eligible CapDev results that can be emailed” because:

- Attributed eligible rows always produce a group row.
- Ineligible (Draft) CapDev never produce a group.
- Eligible CapDev **without** a primary contract appear in `findUnattributedResultIds` but **not** in groups — they do not open a send loop iteration (archived OD-3 / R-CBU-008 AC.1: CapDev persist columns sum **per-group** counts only).

When `groups.length === 0`:

- No CapDev `sendEmail` (R-CESF-003).
- Persist CapDev zeros/empty; `notification_status = SKIPPED`; `notification_sent_at` null (R-CESF-004 AC.4).
- Existing flag-off path still persists metrics then SKIPPED (R-CESF-004 AC.5).

A contract group that would have existed only because of Draft CapDev rows simply **does not appear** in `findGroups`.

**Eligible-but-unattributed-only batch:** ≥1 eligible CapDev, all lacking primary contract → `groups.length === 0`, unattributed warn lists their ids, `total_capdev_results = 0`, zero emails — correct per OD-3 inheritance (see R-CESF-004 scenario).

### 5.5 Workflow (unchanged order)

1. Reads (groups, metrics, countries, unattributed, total_results).
2. Persist metrics (always, before flag gate).
3. Feature flag → maybe loop sends.
4. Write `notification_status`.

Only the **read population** narrows.

---

## 6. Frontend / UX

None. Server-only.

---

## 7. Shared Contracts

None. No DTO / AI payload changes.

---

## 8. Security & Observability

- Auth/roles unchanged (runs inside already-authorized bulk formalize).
- Unattributed warn: only eligible ids (R-CESF-002 AC.4). No mandatory new “excluded Draft count” log (NFR-CESF-003).

---

## 9. Testing Strategy

### 9.1 Repository — **mandatory structural asserts** (KZ-001 / KZ-017)

The existing suite mocks `QueryBuilder` / `getRawMany`. **Outcome-only mocks cannot falsify the filter** (judgment J-B-W1). Every change to `capdevSpineQuery` and `findUnattributedResultIds` MUST add or extend **STRUCTURAL** tests that capture the builder after the method runs and assert:

| Assert | Pass | Fail (disqualifies evidence) |
| --- | --- | --- |
| `innerJoin` to `Result` (alias e.g. `r`) on `r.result_id = bur.result_id` | present on spine | absent, or `leftJoin` on spine |
| `andWhere` on `r.result_status_id IN (:...eligibleStatuses)` | present on spine **and** unattributed | uses `bur.final_status` / `suggested_status` only |
| Bind `eligibleStatuses` | `[ResultStatusEnum.SUBMITTED, ResultStatusEnum.APPROVED]` | any other set or hard-coded magic numbers without enum |
| `countTotalResults` | **no** status join / **no** eligible `andWhere` | status filter applied |

**Negative falsifier:** if the implementer removes the status filter or joins `final_status_result`, the structural test MUST fail (K-004 / KZ-014).

Optional integration-style tests with real QB/SQL may be added; they are not required if structural asserts are complete.

### 9.2 Service — orchestration only (DD-CESF-5)

Service tests prove **dispatch behavior** given **already-filtered** repository return values. They do **not** prove SQL eligibility (J-B-W2).

| Case | Setup | Expect |
| --- | --- | --- |
| Draft-only batch | Mock `findGroups` → `[]`, metrics empty | zero `sendEmail`, `SKIPPED` |
| Eligible-but-unattributed-only | Mock `findGroups` → `[]`, `findUnattributedResultIds` → `[101,102]`, metrics empty | zero `sendEmail`, `SKIPPED`, `total_capdev_results = 0`, warn lists ids |
| Mixed attributed eligible | Mock groups/metrics with pre-filtered eligible counts | persist + email totals match mocks |
| `total_results` carve-out | Mock `countTotalResults` including Draft rows | persisted `total_results` unchanged by CapDev filter |

Do **not** add a service test that feeds Draft+Approved raw rows expecting the service to filter — that would require violating DD-CESF-5.

### 9.3 Fixtures

Discriminating statuses per row (KZ-004). Skew case documented in requirements R-CESF-005 scenario.

### 9.4 Out of scope / blind spots

- E2E `results-ai-formalize-bulk` spies repository methods — it will **not** exercise the SQL predicate; do not cite it as eligibility evidence (J-B-G2).
- Live mailer / PI inbox: out of scope.

---

## 10. Rollout

- Ship on branch `AC-1607-...` via existing worktree.
- No migration; code deploy only.
- Feature flag for CapDev email remains as today; eligibility applies whether flag is on or off for **metric persistence**.
- Backout: revert commit — behavior returns to “all created CapDev”.
- Comms: MEL/product aware CapDev dashboard columns may drop vs prior “all created” interpretation.

**Workers:** Cursor models only (proposal Document Control).

---

## 11. Design Decisions

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-CESF-1** | 2026-08-26 | Filter on live `results.result_status_id`, not `bur.final_status` | R-CESF-005; Submitted path can leave `final_status` Draft while DB is Submitted |
| **DD-CESF-2** | 2026-08-26 | Put status filter in `capdevSpineQuery` + mirror on unattributed | Single CapDev attributed choke point; unattributed is a separate query shape |
| **DD-CESF-3** | 2026-08-26 | Leave `countTotalResults` unfiltered by status | R-CESF-004 / OQ1 option (a) |
| **DD-CESF-4** | 2026-08-26 | No `customStatus` fix in this spec | Out of scope; eligibility reads truth from `results` |
| **DD-CESF-5** | 2026-08-26 | No service-layer post-filter of result lists | NFR-CESF-001; avoids email≠persist drift |

### Rejected alternatives

| Alt | Why rejected |
| --- | --- |
| Filter `bur.final_status` only | Drops legitimate Submitted under known skew |
| Filter in `dispatch` after fetch | Easy to miss a read; O(n) risk; dual sources of truth |
| Also status-filter `total_results` | Conflicts with R-CESF-004 AC.3 |

---

## 12. Step 2.3 — Reversion challenge

**Reverted behavior:** R-CBU treated every **created** CapDev row as notification fuel (email + CapDev metrics). This design **removes** Draft (and other non-Submitted/Approved) CapDev from that set.

**Challenge:** *What does removing this break?*

| Breakage | Assessment |
| --- | --- |
| CapDev emails with lower trainings/participants than “all created” | **Intended** — product decision B |
| `total_capdev_results` lower vs earlier AC-1607 mental model / any dashboard comparing to raw CapDev created count | **Intended**; gap now = ineligible + unattributed. Document in rollout |
| Groups that only had Draft CapDev disappear (no email for that agreement) | **Intended** (R-CESF-003) |
| Unattributed warn quieter (no Drafts listed) | **Intended** (R-CESF-002 AC.4) |
| Existing unit tests asserting “created CapDev” counts | **Must update** — not a product break; execution task |
| `total_results` / bulk HTTP success | **Unbroken** by design |

**Outcome:** Proceed. No design fix required beyond explicit `total_results` carve-out and test updates. Recorded so execute does not “restore” all-created CapDev under the guise of matching archived R-CBU wording — **this spec supersedes eligibility for the notification stage**.

---

## 13. Open Questions

None blocking Phase 3. Requirements OQ1/OQ2 closed.

---

## 14. References

- Requirements: `./requirements.md` (R-CESF-001…005, NFR-CESF-001…003)
- Proposal: `./proposal.md`
- Archived CapDev notification design §6.1 / DD-2
- Kaizen: KZ-001, KZ-004, KZ-007 (glossary correction), KZ-017

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
