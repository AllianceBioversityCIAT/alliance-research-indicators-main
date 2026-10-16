# Proposal — My Projects result count is scoped to the current user

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bugfix/my-projects-result-count-scope` |
| Slug | `my-projects-result-count-scope` — derived from the free-text argument (4 words); the original text is recorded in *Intent*, never in the path |
| Type | **Bug** |
| Approval Mode | `gated` (no explicit end-to-end mandate given) |
| Depends on | none |
| Parallel-safe | yes |
| Surface | Server only (`server/researchindicators`) |
| Date | 2026-09-02 |
| Branch | `FIX-My-contracts-2026` |

---

## Intent

In **My Projects** (`GET /api/agresso/contracts/find-contracts?current-user=true`), keep the contract
*row set* scoped to the current user, but make the **Results** count show **all results of that
contract**, exactly as **All Projects** already does.

The user's framing: *"los proyectos que salen en My Projects siguen igual — el desarrollo funciona
bien; lo que necesitamos ajustar es que el count muestre no solo los resultados del current user
sino todos los resultados de ese contrato."*

## Problem / Current Behavior

| | My Projects (`current-user=true`) | All Projects (`current-user=false`) |
| --- | --- | --- |
| Which contracts appear | User's own (creator of a result, or contract PI) — **correct** | All — correct |
| **Results** column | Count of **the user's own** results on that contract (2, 1, 1, 1, 5, 6, 21…) | Count of **all** results on that contract (372, 265, 112, 75…) |

The same contract therefore reports two different totals depending on which tab you are on, and the
My Projects number silently answers a question nobody asked ("how many results did *I* create here?")
under a column labelled simply **Results**.

## Proposed Outcome

For a given contract, the **Results** number is identical on both tabs. `current-user=true` filters
**which rows** are returned; it no longer filters **the numbers inside a row**.

## Scope

| In scope | Out of scope |
| --- | --- |
| `AgressoContractRepository.getContracts` — the two count expressions | The row-visibility filter (`AND (r.created_by = … OR ac.projectLeadId = …)`) and the `userContracts()` joins — these stay exactly as they are |
| `contract_total_results` (→ DTO `count_results`, the Results column) | The pagination `total` in `metadata` (already counts contracts, not results) |
| The `result_counts` per-indicator subquery (emitted on **every** call; `with-indicators` gates only the mapper, not the SQL) | Any client change — the client already renders whatever the API returns |
| Regression tests in `agresso-contract.repository.spec.ts` | `findContractsByUser` / `findOneContract` (separate endpoints, separate counts) |

## Non-Goals

- Changing which contracts appear in My Projects.
- Adding a second, user-scoped count column to the UI.
- Touching `rc.is_primary` / `is_active` / `is_snapshot` semantics of what counts as a result.

## Affected Users, Systems, And Specs

| Item | Detail |
| --- | --- |
| Users | Anyone on **Projects → My Projects** (`/platform/my-projects`) |
| Endpoint | `GET /api/agresso/contracts/find-contracts` with `current-user=true` |
| Server code | `server/.../agresso-contract/repositories/agresso-contract.repository.ts` — `buildContractTotalResultsCountSql` (**:314-327**), its use at **:402**, and the `result_counts` subquery at **:553** |
| Server tests | `agresso-contract.repository.spec.ts` **:629-638** — see *Impact & Scope*, this test currently passes **because of the defect** |
| Client (read-only) | `my-projects.component.html:256` binds `project.count_results`; `my-projects.service.ts:87` defaults `with-indicators: false` (a caller could override; none does) — no client edit needed |
| Related specs | `bilateral-module/mapping-drives-pool-funding-tag` (same query, pool-funding clause — untouched) |

## Visual Reference

- **Source:** User-supplied screenshots (3), attached to the request — not persisted as files.
- **Location:** n/a — backend-only change; the UI is already correct.
- **Notes:** Screenshot 1–2 = My Projects Results column (2, 1, 1, 1, 5, 6, 21). Screenshot 3 = All Projects Results column (372, 265, 112, 75, 68, 66, 57, 54) — the target behavior.

---

## Bug Diagnosis

### Observed Symptom

On My Projects, the **Results** column shows only the results the signed-in user created on each
contract, instead of the contract's total. The same contracts on All Projects show far larger,
correct totals.

### Reproduction Steps

1. Sign in to `https://main-allianceindicatorstest.ciat.cgiar.org`.
2. `GET /api/agresso/contracts/find-contracts?current-user=true&page=1&limit=10&with-indicators=false&order-field=contract-code&direction=DESC`
3. Note `data[].count_results` for a contract (e.g. `2`).
4. Repeat with `current-user=false&contract-code=<that contract>`.
5. **Expected:** the same `count_results`. **Actual:** a much larger number on step 4.

### Root Cause (confirmed)

`buildContractTotalResultsCountSql(user)` conditionally appends a creator filter to the count
subquery (`agresso-contract.repository.ts:314-327`):

```ts
const userFilter = user?.sec_user_id ? `AND r_ord.created_by = ${user.sec_user_id}` : '';
return `(SELECT COUNT(DISTINCT r_ord.result_id) … ${userFilter})`;
```

`AgressoContractService.findAgressoContracts` passes `this.currentUser.user` whenever
`current-user=true`, so the same `user` object that drives **row visibility** also silently narrows
the **count**. The value flows straight to the UI: `contract_total_results` → `MappedContractsDto.count_results`
(`mapper-agresso-contract.dto.ts:104–108`) → `my-projects.component.html:256`.

The identical mistake exists a second time in the per-indicator `result_counts` subquery
(`:553`): `AND r.created_by = ${user?.sec_user_id}`.

Row visibility is a **separate, correct** clause (`:449`, `:529`):
`AND (r.created_by = <id> OR ac.projectLeadId = '<carnet>')` — plus the `userContracts()` LEFT JOINs
at `:429`. Nothing here needs to change; the two concerns simply got fused into one `user` argument.

Not a regression: the user filter was present in `contract_total_results` from its introducing commit
`78886d5f` (`feat(agresso-contract): add 'count-results' field to order options…`).

### Impact & Scope

| Area | Effect |
| --- | --- |
| **Results column, My Projects** | The reported defect. |
| **Sorting by `count-results`** | `orderBy` maps `COUNT_RESULTS → contract_total_results` (`:343`). Today My Projects sorts by the user-scoped total — i.e. by a number the user cannot see meaningfully. After the fix it sorts by the displayed global total. **Intended side effect, must be stated in requirements.** |
| **Per-indicator counts** | Also user-scoped. **The SQL is not latent** — the `result_counts` block (`:542-556`) is emitted on *every* `getContracts` call; `with_indicators` (`:567`) gates only whether the mapper builds an indicator array. Only the *returned payload* is latent: no in-repo caller combines `current-user=true` with `with-indicators=true` (`my-projects.service.ts:87` defaults it off; `get-contracts.service.ts:50` hard-forces it off). Public API, and it would contradict the contract total if fixed only halfway. |
| **Existing test `should include user filter when userId is provided`** (`spec:629-638`) | Asserts `expect.stringContaining('AND r.created_by = 456')`. The visibility clause renders as `AND (r.created_by = 456 …` — with a parenthesis — so it does **not** match. The only clause producing that exact string is the `result_counts` filter at `:553`. **This test currently green-lights the defect and will go red on the fix; it must be rewritten to assert the visibility clause.** |
| Data integrity / security | None. The change widens a *count*, not row access; contract rows returned are unchanged, and result-level data is not exposed. Totals are already public on All Projects. |

### Fix Strategy

Stop passing the user into the two counting expressions; keep passing it everywhere it governs
visibility. Route: **`/akili-specify` (Lite) in Bug Mode** — it is a logic/behavior change with a
sort-order side effect and a test that must flip, not a cosmetic edit, so `/akili-quick` does not apply.

---

## Approach Options

| # | Approach | Change | Trade-off |
| --- | --- | --- | --- |
| **A** ✅ | **Un-scope both counts** — drop the `userFilter` from `buildContractTotalResultsCountSql` and the `AND r.created_by` from `result_counts` | ~7 lines | One rule, no exceptions: *the user scopes the row set, never the numbers.* My Projects and All Projects report identical figures for the same contract. Changes `count-results` sort basis (desired — it now matches what is displayed). |
| B | Un-scope only `contract_total_results` | ~6 lines | Smallest diff, but leaves the indicator breakdown user-scoped, so `sum(indicators) ≠ count_results` for any consumer that asks for both. Ships a second latent version of the same bug. |
| C | Return both — add `count_results_current_user` alongside the global count | Repo + DTO + client | Preserves the user-scoped number for a future "my contribution" view nobody has asked for. Widens a backend bugfix into an API-contract change and a client change; not warranted by the request. |

## Recommended Approach

**A.** It is the smallest change that leaves no half-fixed variant behind, needs no client edit, no
DTO change, no migration, and no API-contract change — the field names and shapes are identical; only
the number widens. Option B is smaller in lines but larger in residual risk, which is the wrong
trade for a query that three screens read.

**Regression test (Bug Mode, red-before-green):** assert on the **generated SQL string** (KZ-001 — a
property that lives in generated output must be asserted there) that with a user present the SQL
contains the visibility clause `AND (r.created_by = <id> OR ac.projectLeadId =` **and** contains no
`created_by` filter inside either counting subquery — and that the counting subquery emits the same
four-predicate set with and without a user. (Byte-identity itself follows by construction once the `user`
parameter is gone and is deliberately not test-gated; see `design.md` §10.4.) The red must be *observed*
before the fix (K-004 / KZ-014).

## Risks, Dependencies, And Open Questions

| # | Item | Type | Mitigation |
| --- | --- | --- | --- |
| R1 | Rewriting `spec:629-638` could weaken it into passing on both old and new code | Risk (**KZ-001**, 13 recurrences) | New assertion must be shown failing against current `main` before the fix lands, and passing after — both runs recorded verbatim in `execution.md` |
| R2 | The repository spec mocks `query()`, so it validates **SQL text only** — it cannot prove the emitted SQL returns the right numbers, nor operator precedence | Limitation (**KZ-017**) | Declare the unreachable region in the spec; pair it with one manual Dev-DB check: same contract code on both tabs must report the same `count_results` |
| R3 | Un-scoping the count makes the `count-results` sort global on My Projects — a visible ordering change | Behavior change | Record as an explicit MODIFIED requirement; it is the consistent outcome (sort matches the displayed number), not a side effect to hide |
| R4 | The count subquery loses a selective predicate and may scan more rows per contract | Performance | **Upgraded during specify:** `result_counts` is emitted on *every* `getContracts` call, so this sits on the hot path — it is **one deliberate measurement (task T-03)**, not measure-only-if-reported. Baseline is the All Projects path, already in production at the same page size. **Do not measure while a delegated worker is active** (§4.3 concurrency) |
| OQ1 | Should My Projects surface the user's own contribution *anywhere* (e.g. a tooltip "3 of 372 yours")? | Open | Out of scope here. If wanted, a separate proposal — option C is its starting point |
| OQ2 | Is `is_primary = TRUE` the intended basis for the contract total? Both counts use it today, and All Projects uses it too | Open | Unchanged by this fix; flagged only so specify does not silently alter it |

## Success Criteria

1. For any contract visible on both tabs, `count_results` from `current-user=true` **equals** `count_results` from `current-user=false` for the same contract code.
2. The set of contracts returned by `current-user=true` is **unchanged** (same `agreement_id`s, same `metadata.total`) before and after the fix.
3. With `with-indicators=true&current-user=true`, the per-indicator counts are global and consistent with the contract total.
4. Sorting `order-field=count-results` on My Projects orders by the number the Results column displays.
5. A regression test observed **red** on current code and **green** after the fix, asserting on the generated SQL.
6. `npx eslint <changed files>` clean; `npm test -- --silent` green in `server/researchindicators` (full suite re-measured in isolation, per §4.3).

## Next Step

```
/akili-specify bugfix/my-projects-result-count-scope
```

Run it in **Bug Mode** — the confirmed root cause above becomes the fix plan plus a mandatory
regression test (red before the fix, green after).
