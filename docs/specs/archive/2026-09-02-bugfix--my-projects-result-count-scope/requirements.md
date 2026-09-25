# Requirements — bugfix / my-projects-result-count-scope

- **Module:** agresso (server)
- **Spec id:** 2026-09-my-projects-result-count-scope
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked proposal:** ./proposal.md
- **Type:** Bug (Bug Mode)
- **Depth:** Lite
- **Approval Mode:** gated
- **Linked PRD section:** `docs/prd.md` — Projects / contract portfolio
- **Last updated:** 2026-09-02

---

## 1. Context

`GET /api/agresso/contracts/find-contracts?current-user=true` (STAR → **Projects → My Projects**) passes
the current user into **two** roles at once inside `AgressoContractRepository.getContracts`: it selects
which contracts the user may see **and** it narrows the result counters reported for each of those
contracts. The Results column therefore shows *the user's own* results (2, 1, 1, 5, 6, 21…) where
All Projects shows the contract's real totals (372, 265, 112, 75…).

Root cause confirmed in `proposal.md` §Bug Diagnosis: the creator filter appended by
`buildContractTotalResultsCountSql` (`agresso-contract.repository.ts:314-327`) and the twin filter in
the `result_counts` subquery (`:553`).

**Not changing:** which contracts My Projects returns, `metadata.total`, the definition of a countable
result (`is_active` / `is_snapshot` / `rc.is_primary` / `rc.is_active`), the API response shape, any
client code, any data model.

---

## 2. Requirement numbering

`R-MPC-<NNN>` — `MPC` = My Projects Count. `NFR-MPC-<NNN>` for non-functional.

---

## 3. Functional requirements

### R-MPC-001 — Contract result count is contract-wide, independent of `current-user`

- **As a** researcher viewing My Projects
- **I want** the Results column to show every result recorded against a contract
- **So that** a project's size reads the same wherever I look at it

**Details:**
- Inputs: `current-user` query param (`true` | `false` | absent).
- Behavior: the value returned in `data[].count_results` MUST be computed from the contract alone. No
  property of the requesting user may enter the counting expression.
- Outputs: `ServerResponseDto` — `status` 200, `description` `"Contracts found"`, `data` unchanged in
  shape (`{ data: MappedContractsDto[], metadata }`).
- Errors: unchanged.
- Permissions: unchanged (JWT; no `@Roles`).

#### Scenario: Same contract, both tabs

- GIVEN contract `A1048` has 54 active primary results in total, of which the signed-in user created 21
- WHEN the client requests `find-contracts` with `current-user=true`
- THEN `data[].count_results` for `A1048` is `54`
- AND the same request with `current-user=false&contract-code=A1048` also returns `54`
- BUT it must NOT return `21`, nor any value derived from `sec_user_id`, `created_by`, or the user's carnet
- AND IT MUST emit the same counting-predicate set whether or not a user is supplied — exactly four `AND` predicates, none of them referencing the requesting user

**Acceptance criteria:**
- [ ] AC.1 — For a contract visible on both tabs, `count_results` is equal in both responses.
- [ ] AC.2 — The generated SQL contains no `created_by` predicate inside either counting subquery.
- [ ] AC.3 — The counting subquery emits exactly four `AND` predicates for both `getContracts({}, user)` and `getContracts({}, null)`, and the subquery is closed in both cases (`RE_SUBQUERY_CLOSED`). *Byte-identity itself is satisfied by construction under DD-1 — with no `user` parameter the two runs execute the same code path — and is deliberately **not** gated by a test; see design §10.4.*

**Out of scope:** exposing the user's own contribution anywhere in the payload (see OQ-1).

---

### R-MPC-002 — Contract visibility stays scoped to the current user

- **As a** researcher
- **I want** My Projects to keep listing only my contracts
- **So that** the fix to the counter does not turn My Projects into All Projects

**Details:**
- Behavior: with `current-user=true`, the returned contract set MUST remain those where the user created
  at least one active primary-linked result **or** is the contract's principal investigator
  (`ac.projectLeadId` = the user's `alliance_user_staff.carnet`). `metadata.total` MUST be unchanged.

#### Scenario: Row set is untouched by the fix

- GIVEN the same request `current-user=true&page=1&limit=10&order-field=contract-code&direction=DESC`
- WHEN it is issued before and after the change
- THEN the ordered list of `agreement_id` values is identical
- AND `metadata.total`, `page`, `limit`, `totalPages` are identical
- BUT it must NOT drop the carnet lookup or the `(r.created_by = … OR ac.projectLeadId = …)` clause from either the count query or the main query
- AND IT MUST keep the `result_contracts` / `results` LEFT JOINs that the visibility clause depends on

**Acceptance criteria:**
- [ ] AC.1 — Both generated queries still contain `AND (r.created_by = <id> OR ac.projectLeadId = '<carnet>')`.
- [ ] AC.2 — The carnet lookup against `alliance_user_staff` still runs when a user is supplied.
- [ ] AC.3 — `metadata.total` for a fixed request is unchanged before vs. after.

---

### R-MPC-003 — Per-indicator counts are contract-wide (MODIFIED)

- **As an** API consumer requesting `with-indicators=true` together with `current-user=true`
- **I want** the per-indicator counts to describe the contract, not me
- **So that** the indicator breakdown is consistent with `count_results`

**Details:**
- Behavior: the `result_counts` subquery MUST NOT filter by `created_by`. Previously it did.
- **Scope of the change:** the `result_counts` subquery is emitted on **every** `getContracts` call.
  `with_indicators` (`repository.ts:567`) only selects whether the mapper builds an indicator array — it does
  **not** gate the SQL. So this edit changes the SQL executed on every My Projects request today; only the
  *returned payload* is latent (no STAR screen requests `current-user=true` + `with-indicators=true`).
  This is why NFR-MPC-001 carries its own task rather than a measure-only-if-reported clause.

#### Scenario: Indicator breakdown matches the contract total

- GIVEN `with-indicators=true&current-user=true` for a contract with results across two indicators
- WHEN the response is read
- THEN each `indicators[].count_results` is the contract-wide count for that indicator
- BUT it must NOT be restricted to results created by the requesting user
- AND IT MUST remain `0` for indicators with no results on that contract

**Acceptance criteria:**
- [ ] AC.1 — The `result_counts` subquery in the generated SQL contains no `created_by` predicate.

---

### R-MPC-004 — `count-results` ordering follows the displayed count (MODIFIED)

- **As a** researcher sorting My Projects by Results
- **I want** the order to match the numbers I can see
- **So that** "sort by Results descending" is not ordered by a hidden figure

**Details:**
- Behavior: `order-field=count-results` orders by `contract_total_results`, which after R-MPC-001 is the
  contract-wide count. The `orderBy` field map is **not** edited; the change is a consequence of R-MPC-001.
- This is an intentional, user-visible ordering change on My Projects.

#### Scenario: Descending sort on My Projects

- GIVEN My Projects sorted by `order-field=count-results&direction=DESC`
- WHEN the page is read top to bottom
- THEN the Results column is non-increasing
- BUT it must NOT be ordered by the user's own result counts
- AND IT MUST keep the `OrderFieldsEnum.COUNT_RESULTS → 'contract_total_results'` mapping intact

**Acceptance criteria:**
- [ ] AC.1 — `orderBy(OrderFieldsEnum.COUNT_RESULTS, 'DESC')` still returns `'contract_total_results DESC '`.
- [ ] AC.2 — Manual Dev check: the Results column on My Projects is non-increasing under DESC.

---

## 4. Non-functional requirements

### NFR-MPC-001 — No latency regression on `find-contracts`

- **Category:** performance
- **Target:** p95 for `current-user=true&limit=10` stays within the p95 already observed for
  `current-user=false&limit=10` on the same environment and page size.
- **How verified:** one deliberate comparison (T-03) against the All Projects path, which already runs the
  un-scoped counting expression in production at the same page size. **Not** measure-only-if-reported: the
  round-1 judgment established that `result_counts` is on the hot path for every My Projects request, so the
  counting subquery loses a selective predicate on a query users hit constantly.
- **Disqualifier:** a measurement taken while a delegated worker is active is not evidence (root
  `CLAUDE.md` §4.3 concurrency). Re-measure in isolation or report the spread.

No other NFR differs from the inherited server defaults (`ServerResponseDto`, `/api/v{n}`, `GlobalExceptions`).

---

## 5. Data requirements

No data model changes. No migration. No new index. No OpenSearch field change.

---

## 6. API surface delta

No endpoint added, removed, renamed, or versioned. `GET /api/agresso/contracts/find-contracts` keeps its
query params, its `ServerResponseDto` envelope, and its `data[]` field names. The only change is the
**value** of `count_results` (and `indicators[].count_results`) when `current-user=true`. Swagger needs
no new annotation; the `order-field` description already reads *"count-results = total active results per
contract"*, which the fix finally makes true.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| STAR client | **Read-only consumer.** `my-projects.component.html:256` renders `project.count_results`; no client change. |
| OpenSearch / AGRESSO / CLARISA / RabbitMQ / Socket.IO / DynamoDB | None. |

---

## 8. Defect classes and their gates

Per root `CLAUDE.md` §4.3 (KZ-017) — a check narrower than its claim returns a confident green, so each
class names the region its gate **cannot** reach.

| # | Defect class this spec can produce | Gate | Falsifying input (must be observed red) | Cannot reach |
| --- | --- | --- | --- | --- |
| DC-1 | Fix applied to only one of the two counting subqueries | TS-2 (counting subquery has **exactly 4** `AND` predicates) and TS-3 (`result_counts` block has **exactly 3**) | Restore `AND r_ord.created_by` at `:316`, or `AND r.created_by` at `:553` → the predicate count reddens | Whether MySQL returns the right number |
| DC-1b | User scoping reintroduced under a **different spelling** (`updated_by`, an `EXISTS`, a re-aliased `rr.created_by`) — a substring-absence gate would pass | The same predicate-**count** assertions in TS-2 / TS-3 | Add any fifth/fourth predicate however spelled → red | A predicate that *replaces* an existing one rather than adding to it |
| DC-2 | Visibility clause removed together with the count filter → My Projects shows all contracts | TS-1 — **both** `mainSql()` and `countSql()` contain `AND (r.created_by = 456 OR ac.projectLeadId = 'CARNET-1')`. **Requires the §10.1 arrangement**: without `pagination` the count query is never built (`:441`) and without a carnet fixture the literal is `'null'` | Delete the clause at `:449` or `:529` → red | Real row sets. **And**: with no pagination the count half of this gate does not exist at all — the arrangement is part of the gate, not a detail |
| DC-3 | A visibility **join** dropped, leaving `r.created_by` unresolvable | TS-4 — both queries contain **both** `LEFT JOIN result_contracts rc …` **and** `LEFT JOIN results r ON r.result_id = rc.result_id`; and `mainSql()` contains `ac.projectLeadId = 'CARNET-1'` (SQL-level proof the carnet lookup ran and its value was used — not a call-sequence assertion, per DD-3) | Return `''` from `userContracts()`, or drop only the `results r` join → red | — |
| DC-4 | Stale test masks the fix — `should include user filter when userId is provided` (`spec:629-638`) passes **because of** the defect | TS-1 replaces it. The gate is that **TS-1's own new assertions** are observed failing on `HEAD` — not that the old test fails after the fix. Those are different tests, and only the first says anything about whether the new gate can discriminate | TS-1's `not.toMatch(/AND\s+r\.created_by\s*=/)` fails on unmodified `HEAD` | — |
| DC-5 | **SQL semantics / operator precedence / actual numbers** | **No automated gate.** The repository spec mocks `query()`; it asserts SQL *text* only | — | Everything below the string: joins, `DISTINCT`, precedence, real totals |
| DC-6 | **Ordering change unnoticed by users** — no test pins the old My Projects ordering, so nothing goes red to announce it | TS-6 gates the field map in both directions; the rendered order has no automated gate | Change the `COUNT_RESULTS` map entry → TS-6 red | The rendered column order |
| DC-7 | Syntax breakage of the **All Projects** path: the edit removes `${userFilter}` from the line `${userFilter})` (`:326`); dropping the whole line leaves the subquery one paren short for *both* tabs | TS-2 and TS-5 — `mainSql()` must match `RE_SUBQUERY_CLOSED` = `/rc_ord\.is_primary = TRUE\s*\)\s*\)\s*AS contract_total_results/` (design §10.2.1) | Delete the `${userFilter})` line entirely → one of the two closing parens disappears → red. **Round-1's stated falsifier did not work**: predicate count and extraction terminus both survive that mutation, because `AS contract_total_results` lives at `:402`, outside the helper. Both re-judges caught it | A break that keeps both parens and changes semantics |
| DC-8 | R-MPC-003's "remain `0` for indicators with no results" regresses | **Partly gated.** TS-3 covers the two SQL halves (`HAVING COUNT(r.result_id) > 0`, outer `COALESCE(result_counts.total_results, 0)`). The third half — the mapper's `new AgressoContractIndicatorObjectDto(indicator, 0)` default — is DTO construction, not SQL | Remove the `HAVING` or the `COALESCE` → red | The mapper default; declared **not covered** rather than claimed |

**Substitute for DC-5 and DC-6 (mandatory, at the HITL pause):** a manual check against Dev — pick one
contract code, request it with `current-user=true` and with `current-user=false`, and confirm
`count_results` matches; then load My Projects sorted by Results DESC and confirm the column is
non-increasing and the numbers match All Projects. Without this, DC-5 is an **accepted risk**, not a
covered class — a green unit suite here proves the SQL was *written* correctly, never that it *returns*
correctly.

---

## 9. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | `rc.is_primary = TRUE` is the intended basis for the contract total | Unchanged by this fix; All Projects already uses it. See OQ-2. |
| A-2 | No STAR screen requests `current-user=true` + `with-indicators=true` | Verified, with a caveat: `get-contracts.service.ts:50` hard-forces it (`{ ...filters, 'with-indicators': false }` — the literal wins). `my-projects.service.ts:87` only **defaults** it: `main()` builds `{ 'with-indicators': false, ...(params ?? {}) }` (`:129-131`), so the spread wins and a caller *could* override. None does today. This assumption is load-bearing for R-MPC-003's payload-latency claim — re-verify if a new consumer appears. |
| D-1 | None. Not a member of any spec family; no `Depends on`. | |
| RK-1 | Rewriting `spec:629-638` could weaken it into passing on both old and new code (KZ-001, 13 recurrences) | **Already materialised once:** the round-1 design's TS-2 was a tautology (first-match-wins helper + uncleared mock made it compare a string to itself). Mitigation now structural — predicate-**count** assertions rather than substring absence, plus TS-1/TS-2/TS-3 recorded red on `HEAD` and green after, verbatim in `execution.md`. |
| RK-2 | Counting subquery loses a selective predicate | See NFR-MPC-001. |

---

## 10. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| OQ-1 | Should My Projects surface the user's own contribution anywhere (e.g. "21 of 54 yours")? | Product | Separate proposal if wanted — explicitly out of scope here |
| OQ-2 | Is `rc.is_primary = TRUE` the intended definition of a contract's result total? | Engineering | Flagged only so the fix does not silently change it |

---

## 11. Requirement ID index

| ID | Title | Type | Tasks |
| --- | --- | --- | --- |
| R-MPC-001 AC.1/AC.2 | Contract result count is contract-wide | MODIFIED | T-01 (TS-1, TS-2), T-02 (Dev parity) |
| R-MPC-001 AC.3 | Same predicate set with and without a user | MODIFIED | T-01 (TS-2 + TS-5). Byte-identity itself: by construction under DD-1, **not** test-gated |
| R-MPC-002 | Contract visibility stays user-scoped | UNCHANGED (regression guard) | T-01 (TS-1, TS-4, TS-5), T-02 |
| R-MPC-003 | Per-indicator counts are contract-wide | MODIFIED | T-01 (TS-3) |
| R-MPC-004 AC.1 | Field map intact, both directions | MODIFIED | T-01 (TS-6) |
| R-MPC-004 AC.2 | Rendered order matches the displayed count | MODIFIED | T-02 (manual) |
| NFR-MPC-001 | No latency regression | NFR | T-03 |

---

## 12. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>
- [ ] Security review — **not required** (no auth, secret, or row-access change; the count widens to data already public on All Projects)
- [ ] DevOps — **not required** (no migration, no env var, no infra)
