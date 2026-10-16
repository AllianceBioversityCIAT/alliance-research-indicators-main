# Design — bugfix / my-projects-result-count-scope

- **Module:** agresso (server)
- **Spec id:** 2026-09-my-projects-result-count-scope
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** ./requirements.md
- **Linked proposal:** ./proposal.md
- **Linked TRD:** `docs/trd/trd.md` — Agresso module / query layer
- **Depth:** Lite · **Type:** Bug (Bug Mode)
- **Last updated:** 2026-09-02

---

## 1. Goals & non-goals

**Goals**

1. Make the two result-counting expressions in `getContracts` structurally incapable of depending on the requesting user (R-MPC-001, R-MPC-003).
2. Leave every user-scoping mechanism that governs **row visibility** byte-identical (R-MPC-002).
3. Replace the test that currently certifies the defect with one that certifies the fix (R-MPC-001 AC.2, DC-4). AC.3 is gated separately by TS-2 + TS-5 (see §10.4); only the *byte-identity* phrasing it originally carried is satisfied by construction under DD-1 rather than by a test.

**Non-goals**

- Editing the `orderBy` field map — R-MPC-004 is a *consequence* of goal 1, not a separate change.
- Adding a user-scoped count anywhere in the payload (OQ-1).
- Revisiting `rc.is_primary = TRUE` as the definition of a countable result (OQ-2).
- Any client, DTO, entity, migration, or Swagger change.

---

## 2. Architecture

One file changes in production code. No new file, no new class, no new dependency, no DI change.

```
AgressoContractController.findContracts        (unchanged)
  └─ AgressoContractService.findAgressoContracts   (unchanged — still passes currentUser.user)
       └─ AgressoContractRepository.getContracts   ◄── the only edit
            ├─ buildContractTotalResultsCountSql()  ── drop the `user` parameter
            ├─ result_counts LEFT JOIN subquery     ── drop the `created_by` predicate
            ├─ userContracts() joins                ── UNTOUCHED
            ├─ visibility WHERE clause              ── UNTOUCHED
            ├─ carnet lookup                        ── UNTOUCHED
            └─ orderBy() field map                  ── UNTOUCHED
```

The bug is a **conflation of two roles in one argument**: the `user` passed to `getContracts` legitimately
answers *"which contracts may this person see?"* and illegitimately answers *"how many results does this
contract have?"*. The design separates them by making the second question unable to ask.

### 2.1 Composition

| Path | Change |
| --- | --- |
| `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts` | `buildContractTotalResultsCountSql` loses its `user` parameter and its `userFilter` ternary (`:314-317`, `:326`); its call site at `:402` loses the argument; the `result_counts` subquery at `:553` loses its conditional `created_by` predicate. **Note:** `result_counts` is emitted on *every* `getContracts` call — `with_indicators` (`:567`) only selects whether the mapper builds an indicator array, so this edit changes the SQL executed on every My Projects request, not a latent path |
| `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` | **Two** tests modified — `:629-638` rewritten as TS-1 and `:640-648` extended as TS-5 — and **four** added (TS-2, TS-3, TS-4, TS-6) |

No other file. `MappedContractsDto`, the service, the controller, the DTOs and the client all read the same
field names as before — only the value widens.

### 2.2 Reuse

Nothing new is introduced. The un-scoped counting expression already exists and already runs in production:
it is exactly what `getContracts` emits today when `user` is `null` (the All Projects path). This fix makes
the `current-user=true` path emit the same string.

---

## 3. Data model

No data model changes. No migration, no index, no OpenSearch decoration, no backfill.

---

## 4. API surface

No endpoint added, changed, versioned, or deprecated. `GET /api/agresso/contracts/find-contracts` keeps its
method, path, query parameters, roles (none — JWT only), guards, `ServerResponseDto` envelope, and `data[]`
field names. Swagger requires no edit: the existing `order-field` description already declares
*"count-results = total active results per contract"*.

**Not a breaking change by shape; a behavior change by value.** `count_results` under `current-user=true`
returns a larger number than before. Recorded in R-MPC-001 / R-MPC-004 so the STAR team is not surprised.

---

## 5. Workflows & business rules

1. Controller receives `current-user=true` → service passes `this.currentUser.user` (unchanged).
2. Repository resolves the user's carnet from `alliance_user_staff` (unchanged — still gated on `user?.sec_user_id`).
3. Repository builds the **row filter** from `user` (unchanged): the `userContracts()` LEFT JOINs plus
   `AND (r.created_by = <id> OR ac.projectLeadId = '<carnet>')`, applied to both the count query and the
   paginated inner query.
4. Repository builds the **counting expressions** with **no reference to `user`** (changed).
5. `contract_total_results` → `MappedContractsDto.count_results` → the client's Results column (unchanged path).

No audit field, no transaction, no side effect, no OpenSearch reindex, no socket emit, no RabbitMQ message.
`getContracts` is a read.

---

## 6. Frontend (Admin SSR panel) impact

None. No admin page touched. STAR client is a read-only consumer and needs no change
(`my-projects.component.html:256` already renders whatever `count_results` holds).

---

## 7. Integration impact

None. No external system, env var, cron, or message contract is touched.

---

## 8. Security & authorization

| Question | Answer |
| --- | --- |
| Who can call it? | Unchanged — any authenticated caller; no `@Roles`, no status guard. |
| Does row access widen? | **No.** The visibility clause is untouched; the same contracts are returned to the same users. |
| Does data exposure widen? | The *aggregate count* widens to the contract total — a figure already served publicly on the All Projects tab of the same endpoint to the same authenticated audience. No result content, author, or identity is exposed. |
| New secrets / PII? | None. |

Security review is therefore **not required** for this spec.

---

## 9. Observability

No new log line, no `sync_process_log` row, no metric. `ResponseInterceptor` logging is unchanged.

---

## 10. Testing strategy

All assertions target the **generated SQL string** (DD-3 / KZ-001). Every test below states the arrangement
it needs — the round-1 judgment found that unstated preconditions were the difference between a real red and
a red for the wrong reason.

### 10.1 Mandatory arrangement (was missing; caused two severe findings)

```
user            = { sec_user_id: 456 }
carnet fixture  = mockQueryBySql({ carnet: [{ carnet: 'CARNET-1' }], count: [{ total: 1 }], main: [] })
pagination      = { page: 1, limit: 10 }        // REQUIRED
```

Two facts make this non-optional:

1. **No pagination → no count query.** `countSql()` is built only inside `if (!isEmpty(offset))`
   (`repository.ts:441`), and `offset` stays `null` without `pagination.limit` (`:409-414`). Any assertion on
   `countSql()` in an unpaginated call compares against `''` and fails for the wrong reason.
2. **No carnet fixture → the literal is `'null'`.** `userCarnet` comes from `response[0]?.carnet || null`
   (`:425`), and the spec file contains **zero** `CARNET` fixtures today. Without the stub the emitted text is
   `ac.projectLeadId = 'null'`.

**Capturing SQL across two runs:** `sqlContaining` is **first-match-wins** (`spec:522-527`) and
`repository.query` is only re-created in `beforeEach` (`spec:99`; `:98` is the comment above it). A test that calls `getContracts` twice and
reads `mainSql()` after each gets **run 1 both times**. Any two-run test MUST capture the string immediately
after each call, or `mockClear()` between them. (This is what made the round-1 draft of TS-2 a tautology.)

### 10.2 Test list

| # | Test | Assertion | On HEAD | Concrete falsifier (K-012) |
| --- | --- | --- | --- | --- |
| **TS-1** | `separates user-scoped visibility from contract-wide counting` *(rewrite of `spec:629-638`)* | `mainSql()` **and** `countSql()` contain `AND (r.created_by = 456 OR ac.projectLeadId = 'CARNET-1')`; `mainSql()` does **not** contain `r_ord.created_by`; `mainSql()` does **not** match `/AND\s+r\.created_by\s*=/` | **RED** — the last two assertions fail | Restore `:316` or `:553` → red. Delete the visibility clause at `:449`/`:529` → red |
| **TS-2** | `emits a contract-wide counting subquery with a fixed predicate set` | Extract the substring from `(SELECT COUNT(DISTINCT r_ord.result_id)` to `AS contract_total_results`, then assert **exactly 4** `\bAND\b` matches; each of `rc_ord.contract_id = ac.agreement_id`, `r_ord.is_active = 1`, `r_ord.is_snapshot = FALSE`, `rc_ord.is_active = 1`, `rc_ord.is_primary = TRUE` present; no match for `RE_USER_TOKENS`; **and** `mainSql()` matches `RE_SUBQUERY_CLOSED` | **RED** — HEAD emits **5** `AND`s and contains `r_ord.created_by` | Add **any** fifth predicate, however spelled (`r_ord.updated_by`, an `EXISTS`, a re-aliased `rr.created_by`) → the count assertion reddens |
| **TS-3** | `emits a contract-wide per-indicator count block` | Extract from `LEFT JOIN (` to `) result_counts ON`, then assert **exactly 3** `\bAND\b` matches; `HAVING COUNT(r.result_id) > 0` present; no match for `RE_USER_TOKENS`. Separately: the outer SELECT contains `COALESCE(result_counts.total_results, 0) as count_results` | **RED** — HEAD emits **4** `AND`s and contains `r.created_by` | Restore `:553`, or add any differently-spelled user predicate → red |
| **TS-4** | `retains both visibility joins and the resolved carnet in both queries` | `mainSql()` **and** `countSql()` each contain `LEFT JOIN result_contracts rc ON rc.contract_id = ac.agreement_id` **and** `LEFT JOIN results r ON r.result_id = rc.result_id`; `mainSql()` contains `ac.projectLeadId = 'CARNET-1'` | **GREEN** — this is a **guard**, not a regression test | Make `userContracts()` return `''`, or drop only the `results r` join, or skip the carnet lookup → red |
| **TS-5** | `no user → no user predicate anywhere, and the subquery stays closed` *(extends the existing null-user test)* | With `user = null` and pagination: `mainSql()` does not match `RE_USER_TOKENS`; the counting subquery still has **exactly 4** `AND`s; **and** `mainSql()` matches `RE_SUBQUERY_CLOSED` (below) | **GREEN** — guard for the All Projects path | Delete the whole `${userFilter})` line at `:326` → the second `)` disappears, `RE_SUBQUERY_CLOSED` fails → red |
| **TS-6** | `orderBy maps count-results in both directions` | `orderBy(OrderFieldsEnum.COUNT_RESULTS, 'DESC')` returns `'contract_total_results DESC '` (the existing test covers `ASC` only, `spec:488-491`) | **GREEN** — closes R-MPC-004 AC.1 | Change the field map entry → red |

### 10.2.1 Named patterns (write these in the spec file verbatim — do NOT copy them out of a table cell)

The two patterns below are referenced by name in the table above. They are given here as real JavaScript so
the markdown pipe-escaping inside a table cell cannot be copied into a regex literal by mistake — a
`/created_by\|updated_by/` pasted from a table matches only the literal string `created_by|updated_by` and is
a permanently-passing assertion, which is precisely the class this round is closing.

```js
// any spelling of a user-scoping token; used as .not.toMatch(...)
const RE_USER_TOKENS = /created_by|updated_by|sec_user/;

// the counting subquery is CLOSED: both the helper's own paren (:326) and the :402 wrapper.
// Deleting the `${userFilter})` line at :326 removes one of the two and this stops matching.
const RE_SUBQUERY_CLOSED = /rc_ord\.is_primary = TRUE\s*\)\s*\)\s*AS contract_total_results/;
```

**Why `RE_SUBQUERY_CLOSED` is needed and a paren-balance count is not enough.** The closing paren of the
subquery is not the helper's alone: `:402` wraps the helper output — `, (${helper}) AS contract_total_results`
— so the extracted region legitimately carries one more `)` than `(`. A naive balance assertion would fail on
correct code. More importantly, the round-1 correction's stated falsifier for DC-7 **did not work**: deleting
`:326` leaves the extraction still terminating at `AS contract_total_results` with the same four `AND`s, so
every other TS-5 assertion stays green over a subquery that is one paren short. Both re-judges caught this
independently. `RE_SUBQUERY_CLOSED` is the assertion that actually reddens on that mutation.

**Two caveats the implementer must know about this pattern** (both raised in the final re-judgment):

- It is coupled to the **redundant** `:402` wrapper. The helper already returns a self-contained
  `(SELECT … )`, so `:402` emits `, ((SELECT … )) AS contract_total_results`, and the pattern's second `\)` is
  that redundant paren. T-01 already edits `:402` — **do not also remove the wrapper parens as a cleanup**, or
  this gate goes red on correct code. Same for reordering the four WHERE predicates: the pattern pins
  `rc_ord.is_primary = TRUE` as the last one. Both failures are loud, not silent, but neither is a defect.
- The DC-7 falsifier is written against **pre-fix** source. After DD-1, `:326` reads `          )` — there is no
  `${userFilter})` line left to delete, and on HEAD that physical line also carries the closing backtick and
  semicolon, so a literal whole-line deletion is a syntax error rather than a runnable mutant. The mutation
  that actually exercises the gate is: **delete the closing-paren line at `:326` from the fixed code.**

**Why a predicate *count*, not only a substring absence.** A `not.toContain('created_by')` gate passes against a
reintroduction spelled `AND r.updated_by = 456` or `AND EXISTS (SELECT 1 FROM sec_users …)`. Asserting the exact
number of predicates makes **any** additional filter red regardless of spelling. It also stays falsifiable after
DD-1 lands — unlike a user-vs-no-user identity comparison, which becomes structurally incapable of failing the
moment the parameter is gone.

### 10.3 Red-before-green protocol (K-004 / KZ-014)

**TS-1, TS-2 and TS-3 are the regression tests.** They MUST be run against unmodified `HEAD`, and the failure
output captured verbatim in `execution.md`, *before* the production edit. TS-1 must be red for the **right**
reason — the two count assertions, not a missing count query.

**TS-4, TS-5 and TS-6 are guards and are HEAD-green by construction.** Claiming a HEAD red for them would be a
fabricated record. Their ability to fail is demonstrated **by mutation** (the falsifier column), which is a
different and weaker claim than reproducing the defect — recorded as such, not laundered into the same evidence.

### 10.4 What this suite cannot reach (KZ-017)

These tests mock `query()`. They prove the SQL was **written** correctly. They **cannot** prove MySQL returns
the right number, cannot evaluate `AND`/`OR` precedence, and cannot see a real row set. A green run is **not**
sufficient evidence that the bug is fixed — the manual Dev check (T-02) is a required part of the evidence. If
T-02 is skipped, DC-5 stands as an **accepted, unmitigated risk** and must be reported as one.

**AC.3 is gated by TS-2 + TS-5; only its original *byte-identity* phrasing is by construction.** The round-1
draft gated it with a user-vs-null identity comparison; that was the C-1 tautology, and §10.1 now warns
against two-run tests generally. No test in §10.2
compares the two counting subqueries as strings — TS-2 runs with a user, TS-5 without, and they assert equal
*predicate sets*, not identical *text*. Once DD-1 removes the parameter the two runs execute the same code
path, so byte-identity is a property of the signature rather than of the output. AC.3 has therefore been
reworded to the predicate-count-and-closure property, which **is** test-gated: TS-2 asserts it with a user,
TS-5 without one (`requirements.md` §11 maps AC.3 to exactly those two). The withdrawn identity phrasing is
gone from `requirements.md` and `proposal.md` rather than left asserting a test that does not exist.

One clause remains partly ungated: R-MPC-003's "remain `0` for indicators with no results". TS-3 gates its two
SQL halves (`HAVING COUNT(...) > 0` and the outer `COALESCE(..., 0)`), but the third half —
`new AgressoContractIndicatorObjectDto(indicator, 0)` in the mapper — is DTO construction, not SQL, and is
covered only by the mapper's existing behavior. Recorded as **DC-8**, not claimed as covered.

Command: `npm test -- --silent agresso-contract.repository.spec` from `server/researchindicators/`.
Lint gate: `npx eslint <changed files>` — **not** `npm run lint`, which carries `--fix` and mutates (K-001).

## 11. Rollout

| Item | Value |
| --- | --- |
| Migration order | n/a — no schema change |
| Feature flag | none; the fix is unconditional |
| Deploy | code-only, standard CI/CD (merge to `dev` → On-Premise Dev). No migration to apply, so K-015's pending-migration trap does not apply here |
| Backout | revert the commit; no data or schema state to unwind |
| Comms | STAR / MEL should know the Results column on My Projects will show larger numbers and that "sort by Results" now sorts globally — this is the intended correction, not a new defect |

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-1** | 2026-09-02 | **Remove the `user` parameter from `buildContractTotalResultsCountSql` entirely** — do not keep it and pass `undefined` | Passing `undefined` leaves a live branch that a future edit can re-enable, and leaves the invariant unenforceable by anything but vigilance. With no `user` in scope, "the count cannot depend on the requesting user" becomes a **type-level** guarantee the compiler holds. Cheapest possible enforcement of R-MPC-001 **for `contract_total_results`**. It does **not** cover the second count: the `result_counts` block is inline in `getContracts` (`:542-556`) where `user` is still a live parameter (`:353`) and legitimately used at `:419`/`:423`/`:447`/`:449`/`:526`/`:529`, so `:553` can be re-added with no compiler objection. DC-1 therefore stays **detectable** (TS-3's predicate count), not impossible. |
| **DD-2** | 2026-09-02 | **Do not touch `orderBy`'s `COUNT_RESULTS → 'contract_total_results'` mapping** | The sort already points at the count column. Once the column is contract-wide, the sort follows for free. Editing the map would be a second, independent change to justify — and would decouple the sort from the displayed number, which is the defect in a new costume. R-MPC-004 is satisfied by doing nothing here. |
| **DD-3** | 2026-09-02 | **Assert on the generated SQL string, never on the call sequence or on mock arguments** | KZ-001 (13 recurrences): a property that lives in generated output must be asserted there. The property under test *is* a substring of the emitted SQL. |
| **DD-4** | 2026-09-02 | **Un-scope BOTH counting subqueries in the same change, not just `contract_total_results`** | Proposal option B (fix only the visible one) leaves `sum(indicators) ≠ count_results` for any consumer requesting both, shipping a second latent copy of the same bug. One rule with no exception — *the user scopes the row set, never the numbers* — is cheaper to hold than two rules with a carve-out. |
| **DD-5** | 2026-09-02 | **Proceed with DD-1 and DD-4 unmodified** — the reversion challenge found no breakage | An independent reviewer with fresh context searched five categories for concrete breakages and returned **none found** in four of them, plus the one already-known test. `getContracts` has exactly one caller; `buildContractTotalResultsCountSql` has exactly one call site; nothing in the client branches on the count. See §12.1 for the searched regions. |

### 12.1 Reversion challenge (Step 2.3)

DD-1 and DD-4 remove behavior the codebase already ships, and that behavior has both a test covering it
(`spec:629-638`) and a visible surface (the Results column) — so the Lite-depth skip does **not** apply and
the challenge is mandatory.

**Question put to the reviewer:** *what breaks if we remove the `created_by` filter from the two counting
subqueries?*

**Outcome: PROCEED — no breakage found.** An independent reviewer (fresh context, read-only) reported:

| Category searched | Result |
| --- | --- |
| (a) Other **server** consumers of `getContracts` / `contract_total_results` | **None.** One controller → one service method → one repository method; `buildContractTotalResultsCountSql` has exactly one call site. The other count-bearing endpoints (`results/current-user` → `findContractsByUser`, `:contractId/results/count` → `findOneContract`) build their own counts and never touch the edited helper. No `@MessagePattern`, OpenSearch indexer, cron, or export reads it. |
| (b) **Client** consumers relying on the count being user-scoped | **None.** `my-projects.service.ts:86` is the only service that sends `current-user: true` (set by `my-projects.component.ts:484` and `:776` and passed through `main()`), and `:87` **defaults** `with-indicators: false` — `main()` builds `{ 'with-indicators': false, ...(params ?? {}) }` (`:129-131`), so a caller *could* override it; none does. The other **five** `GET_FindContracts` call sites never send `current-user` (`create-oicr-form.component.ts:326`, `bilateral.service.ts:113`, `bilateral-mapping.service.ts:126`, `get-contracts.service.ts:50` and `:94`), so they already receive the un-scoped count today. The dashboard/indicator widgets are fed by `GET_ResultsCount` (the untouched `:contractId` endpoint), not by `find-contracts`. |
| (c) Anything branching on `count_results === 0` or its truthiness | **None.** `my-projects.component.html:256` is a plain interpolation with `?? 0` — no `@if`, no row hide/show, no threshold. `count_results` appears in `globalFilterFields` at `:124`, but the table is `[lazy]="true"` (`:111`), so that client-side filter never runs. |
| (d) Other tests that break | **None beyond the known one.** The reviewer confirmed the mechanism at `spec:629-638`: it breaks *only* because of the `:553` removal — the surviving visibility clause emits `AND (r.created_by = 456 OR …`, and the open paren blocks `stringContaining('AND r.created_by = 456')`. Confirmed still-green: `:640-648` (null-user), `:488-491` (orderBy map), `:543-610` / `:680-865` (filters, pool funding, pagination), both sibling server specs, `test/` (zero hits for `find-contracts` / `count_results`), and every client spec (they assert on request params, never on a returned count). No Cypress/Playwright suite exists. |
| (e) Docs asserting a user-scoped count | **None.** `docs/prd.md`, `docs/ux-ui/`, `docs/trd/` have zero hits for `count_results` / `contract_total_results`. The only hits under `docs/` are this spec's own files and an archived bilateral spec that names `getContracts` solely as the pool-funding edit site. |

**Two behavior changes flagged with no current consumer** (recorded, not blocking):

1. **External API clients** can reach `current-user=true&with-indicators=true`, a combination no in-repo caller produces. Their `indicators[].count_results` will widen. Already required by R-MPC-003; the comms note in §11 is the mitigation. **Corrected in round-1 judgment:** only the *returned payload* is latent — the `result_counts` SQL itself is emitted unconditionally (`:542-556`), so every My Projects request today already runs this subquery and will run the widened one after the fix. That is why NFR-MPC-001 now gets its own task (T-03) instead of a measure-only-if-reported clause.
2. **The `count-results` sort on My Projects** changes from user-scoped to contract-wide, and **no test pins the old ordering** — so nothing will go red to announce it. This is exactly why R-MPC-004 AC.2 is a *manual* check: the change is real, intended, and invisible to the suite.

**Design change required by the challenge: none.** DD-1 and DD-4 stand as written.

---

## 13. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Expected |
| --- | --- |
| Tasks | **3** |
| Production LOC changed | **~7** — 4 deletions (`:315-317` the `userFilter` ternary, `:553` the predicate) + 3 edits (`:314` signature, `:326` `${userFilter})` → `)`, `:402` call site) |
| Test LOC added/changed | **~110** (six tests, two of them extraction-based) |
| Total LOC | **~117** |
| Review rounds | **1** (round-1 judgment already consumed at spec time; see `judgment.md`) |

**Depth re-check against the finished design:** the production diff is tiny, but this is **not** a
`/akili-quick` candidate — it changes query logic, flips a test that currently certifies the defect, and
carries a user-visible sort-order consequence. `/akili-quick` is scoped to cosmetic changes with no logic.
**Lite is the correct depth and is confirmed**, not merely inherited from Phase 0.

Exceeding any row above is an escalation to the user, not a reason to continue quietly.

---

## 14. Open questions

Carried from `requirements.md` §10: **OQ-1** (surface the user's own contribution anywhere?) and **OQ-2**
(is `rc.is_primary = TRUE` the right basis for a contract total?). Neither blocks this fix.

---

## 15. References

- `proposal.md` §Bug Diagnosis — confirmed root cause, `:314-327` and `:553`
- Root `CLAUDE.md` §4.3 — K-001 (lint is a fixer, not a gate), K-004 / KZ-014 (observe the red), KZ-001 (assert on generated output), KZ-017 (declare what the check cannot reach), concurrency (do not measure while a worker is active)
- `bilateral/mapping-drives-pool-funding-tag` — shares this query's pool-funding clause; untouched here
- Introducing commit of the defect: `78886d5f`
