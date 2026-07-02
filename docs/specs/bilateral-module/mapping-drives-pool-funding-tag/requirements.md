# Requirements — Bilateral / Mapping drives the Pool Funding tag

- **Module:** agresso (bilateral)
- **Spec id:** 2026-07-mapping-drives-pool-funding-tag
- **Status:** draft
- **Owner:** PO (bilateral squad)
- **Linked PRD section:** docs/prd.md — bilateral / pool-funding contributions
- **Linked tickets:** (pending)
- **Last updated:** 2026-07-01
- **Extends:** docs/specs/archive/2026-06-17-bilateral-module (bilateral_project_mapping CRUD, R-BIL-076…R-BIL-092)

---

## 1. Context

The STAR Projects table shows a **"Contributing to Pool Funding"** badge for a
contract. Today the badge is driven **only** by the manual column
`agresso_contracts.is_pool_funding_contributor`, set exclusively via the "AGRESSO
Pool Funding Tag" admin page (`PATCH /api/v1/agresso/contracts/:code/pool-funding-tag`).

When a Center Admin maps a bilateral contract to a CLARISA project in
`bilateral_project_mapping`, that mapping does **not** influence the badge. Verified
this session: **D504** has an active mapping (`id 11 → CLARISA 22`) yet shows no
badge; A511 / D527 / D335 show it only because they were tagged by hand.

This spec couples mapping → tag: a contract with an active bilateral mapping SHALL
report as a pool-funding contributor, computed at **read time**. **Not changing:**
the mapping CRUD contract, the `setPoolFundingTag` endpoint surface, the STAR client
(it already reads `is_pool_funding_contributor`), or bilateral mapping granularity.

See `proposal.md` for the approved intent and the Option A/B trade-off (Option B
adopted).

---

## 2. Requirement numbering

`R-BIL-<NNN>`, continuing the bilateral-module series (archived spec ended at
R-BIL-092). This spec uses R-BIL-100…R-BIL-105 and NFR-BIL-100.

---

## 3. Functional requirements

### R-BIL-100 — Effective pool-funding flag in the Projects table

- **As a** Center Admin / STAR consumer
- **I want** a mapped bilateral contract to show the pool-funding badge automatically
- **So that** mapping a contract is the single action needed to reflect its pool-funding identity

**Details:**
- Inputs: `GET /api/agresso/contracts/find-contracts` (existing query params).
- Behavior: the projected `is_pool_funding_contributor` becomes the **effective**
  value: `manual_tag = 1 OR EXISTS(active bilateral_project_mapping for the contract)`.
  An active mapping is a row in `bilateral_project_mapping` with `is_active = 1`
  and `agresso_agreement_id = ac.agreement_id`.
- Outputs: `ServerResponseDto` with `data.data[]` rows; each row's
  `is_pool_funding_contributor` is the effective boolean.
- Errors: unchanged (no new error).
- Permissions: unchanged from the existing find-contracts endpoint.

**Acceptance criteria:**
- [ ] AC.1 — GIVEN a contract with an active mapping and `is_pool_funding_contributor = 0`, WHEN find-contracts returns it, THEN `is_pool_funding_contributor` is `true`.
- [ ] AC.2 — GIVEN a contract with a manual tag `= 1` and no mapping, THEN the field is `true`.
- [ ] AC.3 — GIVEN a contract with neither tag nor active mapping, THEN the field is `false`.
- [ ] AC.4 — GIVEN a contract whose only mapping is `is_active = 0`, THEN the field reflects only the manual tag (mapping does not count).

**Out of scope:** OpenSearch-served views of the flag (see §7, R is read-time SQL only).

#### Scenario: D504 lights up with no manual tag
- GIVEN D504 has active mapping `id 11 → CLARISA 22` and manual tag `0`
- WHEN find-contracts includes D504
- THEN `is_pool_funding_contributor` is `true`

---

### R-BIL-101 — Pool-funding filter includes mapping-derived contracts

- **As a** STAR consumer filtering the Projects table
- **I want** the "Contributing to Pool Funding" filter to return mapping-derived contracts
- **So that** the filter result matches the badges shown

**Details:**
- Inputs: `find-contracts?pool-funding-contributor=true` (existing filter param).
- Behavior: the filter predicate uses the **effective** value (same OR/EXISTS as
  R-BIL-100), replacing the raw-column-only filter at
  `agresso-contract.repository.ts:392-393`.
- Outputs: filtered `data.data[]`.

**Acceptance criteria:**
- [ ] AC.1 — GIVEN D504 (active mapping, tag `0`), WHEN filtering `pool-funding-contributor=true`, THEN D504 is included.
- [ ] AC.2 — GIVEN a contract with neither, WHEN filtering `=true`, THEN it is excluded.
- [ ] AC.3 — GIVEN `pool-funding-contributor=false`, THEN mapping-derived contracts are excluded from the "false" set (they are effectively `true`).

---

### R-BIL-102 — Ordering reflects the effective flag

- **As a** STAR consumer sorting by pool-funding
- **I want** ordering to use the effective value
- **So that** sort order is consistent with the badge and the filter

**Details:**
- Behavior: ordering by pool-funding (`OrderFieldsEnum.POOL_FUNDING_CONTRIBUTOR`,
  `agresso-contract.repository.ts:343`) SHOULD use the effective value.

**Acceptance criteria:**
- [ ] AC.1 — GIVEN a mapping-derived contract and an untagged contract, WHEN sorting by pool-funding descending, THEN the mapping-derived contract ranks with the tagged group.

---

### R-BIL-103 — Results-level consumers report the effective flag

- **As a** STAR consumer viewing results-level data
- **I want** the pool-funding flag there to match the Projects table
- **So that** the two views never disagree

**Details:**
- Behavior: `result.repository.ts:205` currently projects
  `COALESCE(ac.is_pool_funding_contributor, FALSE)`. It SHALL project the effective
  value (same OR/EXISTS derivation).

**Acceptance criteria:**
- [ ] AC.1 — GIVEN a result whose contract has an active mapping and tag `0`, WHEN the results query returns the row, THEN its `is_pool_funding_contributor` is `true`.
- [ ] AC.2 — GIVEN the same contract, the value equals what find-contracts returns for that contract.

---

### R-BIL-104 — Deactivating the last active mapping removes the derived badge

- **As a** Center Admin
- **I want** removing the last bilateral mapping to drop the derived badge
- **So that** the badge always reflects current mapping state

**Details:**
- Behavior: with no active mapping and no manual tag, the effective flag is `false`.
  Achieved automatically by read-time derivation (deactivate sets `is_active = 0`).

**Acceptance criteria:**
- [ ] AC.1 — GIVEN D504 with only one active mapping and manual tag `0`, WHEN that mapping is deactivated (`PATCH …/:id/deactivate`), THEN find-contracts subsequently returns `is_pool_funding_contributor = false`.
- [ ] AC.2 — GIVEN a contract with a manual tag `1` whose mapping is deactivated, THEN the field remains `true` (manual tag persists).

---

### R-BIL-105 — Precedence: active mapping wins (pure OR)

- **As a** PO
- **I want** an active mapping to force the badge on, regardless of a manual `false`
- **So that** mapping is the authoritative signal and there is no hidden override state

**Details:**
- Behavior: the effective value is a pure OR — there is no manual override that can
  set the flag `false` while an active mapping exists. No tri-state / suppress column.
- The `setPoolFundingTag` endpoint continues to accept writes, but a manual `false`
  is a no-op on the reported value while an active mapping exists.

**Acceptance criteria:**
- [ ] AC.1 — GIVEN a contract with an active mapping, WHEN an admin PATCHes the tag to `false`, THEN find-contracts still returns `is_pool_funding_contributor = true`.
- [ ] AC.2 — GIVEN the same contract after the mapping is deactivated and manual tag is `false`, THEN the field returns `false`.

**Out of scope:** any UI hint that the manual toggle is overridden (client change,
tracked as an optional risk in design).

---

## 4. Non-functional requirements

### NFR-BIL-100 — No read-path regression from the derivation

- **Category:** performance
- **Target:** the paginated find-contracts query keeps its current p95 envelope; the
  added correlated `EXISTS` uses the existing index on
  `bilateral_project_mapping.agresso_agreement_id` (`idx_bpm_agreement`) — no full scan.
- **How verified:** `EXPLAIN` on the find-contracts query shows index use on the
  subquery; unit/integration tests green; manual timing on the Projects list.

---

## 5. Data requirements

- **No schema change.** No new column, no migration, no backfill (read-time derivation).
- Affected entities (read-only): `agresso_contracts` (`is_pool_funding_contributor`,
  migration `1779190000001-addPoolFundingContributorTagToAgressoContract.ts`),
  `bilateral_project_mapping` (existing indexes `idx_bpm_agreement`,
  `uk_bpm_active_agreement`).
- **OpenSearch:** `is_pool_funding_contributor` is an `@OpenSearchProperty`
  (`agresso-contract.entity.ts:136-139`); the indexed document still holds the **raw
  column**, not the derived value. This spec does not change OpenSearch (see §7 risk).

---

## 6. API surface delta

- **No new endpoints and no route/version changes.**
- `GET /api/agresso/contracts/find-contracts` — response field
  `is_pool_funding_contributor` changes semantics from raw column to effective value;
  the `pool-funding-contributor` filter and pool-funding ordering follow the effective
  value. Swagger description SHOULD be updated to note the derived semantics.
- Results-level query (`result.repository.ts`) — same field-semantics change.
- `PATCH /api/v1/agresso/contracts/:code/pool-funding-tag` — surface unchanged;
  behavior note per R-BIL-105 (manual `false` is a no-op while a mapping is active).

---

## 7. Cross-system impact

- **AGRESSO / CLARISA:** none (uses existing `bilateral_project_mapping` join by value).
- **OpenSearch:** `find-contracts` is **SQL-backed** (`service.findContracts` →
  `repository.findAllContracts`), so the Projects table is fully covered. **Risk:** any
  consumer that queries the pool-funding flag directly from the OpenSearch
  `agresso_contracts` index will see the raw column, not the derived value. Kept **out
  of scope**; see open question OQ-1.
- **STAR (`client/`):** no change — it already reads `is_pool_funding_contributor`.
  The frontend `isBilateral()` string-match bug (BLR not matched) is a **separate**
  issue and is not part of this spec.

---

## 8. Assumptions, dependencies, risks

- **Assumption:** at most one active mapping per contract (enforced by
  `uk_bpm_active_agreement`); `EXISTS` is therefore a simple presence check.
- **Dependency:** none in-flight; builds on the existing bilateral mapping CRUD.
- **Risk (OpenSearch drift):** raw column indexed → mitigation is to keep OpenSearch
  out of the pool-funding filter/read path, or a follow-up to recompute on mapping
  change (out of scope). 
- **Risk (predicate duplication):** the OR/EXISTS lives in ≥2 raw SQL strings →
  mitigation: extract a shared SQL fragment/const (design task).

---

## 9. Open questions

- **OQ-1** — Is any production read path serving the pool-funding flag from
  **OpenSearch** rather than SQL? If yes, OpenSearch must be brought in scope (recompute
  the indexed value on mapping create/deactivate). *Owner:* PO + backend. *Target:*
  before `/sdd-specify` design sign-off.

---

## 10. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>
- [ ] Security review (n/a — no auth/secrets change)
- [ ] DevOps (n/a — no infra/migration)
