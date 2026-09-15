# Design — Agresso Staff / Provision and restore platform accounts from the staff sync

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/agresso-staff-sec-users-sync` |
| Depth | **Full** |
| Satisfies | R-AGS-001, R-AGS-002, R-AGS-003, R-AGS-004, R-AGS-006, **R-AGS-007**, NFR-AGS-001 … NFR-AGS-003 |
| Does **not** satisfy | ~~R-AGS-005~~ — moved to [`changes/agresso-staff-deactivation`](../agresso-staff-deactivation/proposal.md) |
| Status | **Draft** — awaiting Phase 2 approval |
| Date | 2026-09-14 |

> **Split, 2026-09-14.** The destructive half left this document with `R-AGS-005`: the completeness
> guard (`C-1`/`C-2`/`C-3`), the exclusion list (`EX-1`/`EX-2`/`EX-3`), the three-table cascade, the
> `app_secrets` write and the dry-run mode are **all gone from here**. `DD-2`, `DD-9` and `DD-11` went
> with them and their numbers are **retired, not reused**, so every finding in `judgment.md` keeps its
> target. Two decisions are new: **`DD-12`** (email-only matching) and **`DD-13`** (reactivation).

---

## 1. Goals & non-goals

### Goals

| # | Goal |
| --- | --- |
| G-1 | The Agresso staff sync becomes the authority for **provisioning** `sec_users`: create, refresh, reactivate |
| G-2 | The pass is **safely re-runnable** — same input, same end state (NFR-AGS-001) |
| G-3 | Statement count is `O(⌈n / CHUNK⌉)`, not `O(n)` (NFR-AGS-002) |
| G-4 | **The pass cannot remove access.** Every write it issues turns something on or fills something empty |
| G-5 | A returning employee keeps their `sec_user_id`, and with it their attribution history |

### Non-goals

| # | Non-goal | Why |
| --- | --- | --- |
| NG-1 | Refactoring `BaseControlListSave` | Shared by every Agresso/CLARISA clone tool. Changing its error contract to serve one caller is a blast radius this spec does not need |
| NG-2 | Refactoring the three existing find-or-create call sites | `tip-integration`, `prms.opensearch`, `results.service` keep working exactly as today (DD-8) |
| NG-3 | TypeORM entities for `sec_users` / `sec_user_roles` | DD-4 |
| NG-4 | Fixing `findNumberOfPages`' rounding quirk | Pre-existing, and **now irrelevant here** — this spec no longer compares a page count or an element total against anything. It matters again in the sibling spec, where `C-1`/`C-2` depend on it |
| NG-5 | Adding a roles guard to the **sibling** endpoints `agresso-tools.controller.ts:12` and `clarisa.controller.ts:32` | They share the same shape but not this spec's consequence. Recorded as RSK-5 |
| **NG-6** | **Deactivating anything** | The whole point of the split. This design contains no `is_active = 0` statement and no `app_secrets` access |

---

## 2. Architecture

### 2.1 Composition

Three new units, all under `src/domain/tools/agresso/staff/`:

| Unit | Responsibility |
| --- | --- |
| `SecUserReconcilerRepository` | Every SQL statement this spec issues. Bulk read, chunked writes, parameterised throughout |
| `SecUserReconcilerService` | The decision logic: index, match, classify into create / refresh / reactivate, produce the run summary |
| `SecUserReconciliationSummary` (DTO) | The counts `NFR-AGS-003` requires |

`AgressoStaffToolsService.cloneAllAgressoStaff` gains one responsibility: accumulate the staff members returned across pages, then hand the assembled set to the reconciler **once**, after the loop.

```
cloneAllAgressoStaff
  ├─ findNumberOfPages()            → pages          (already exists, unchanged)
  ├─ for each page: base(...)       → saved rows     (already exists; accumulate them now)
  └─ SecUserReconcilerService.reconcile(allStaff)
       ├─ pre-write validation → skip unusable email / over-long carnet   (R-AGS-003)
       │     └─ skipped members NEVER enter the collapse                  (N-3)
       ├─ bulk read  ALL sec_users (active + inactive)                    (DD-3, J-4)
       ├─ build ONE index: lower(trim(email)) → rows                      (DD-12)
       ├─ COLLAPSE   surviving members → one per lower(trim(email)),
       │             winner chosen AGAINST the index, not blind           (DD-14, M-4)
       ├─ match in memory, exact, never LIKE                              (DD-6)
       │     ├─ matched an ACTIVE row       → refresh                     (R-AGS-002)
       │     ├─ matched, ALL matches INACTIVE → reactivate + refresh      (R-AGS-007)
       │     └─ matched nothing             → create                      (R-AGS-003)
       └─ ONE transaction — every write via its manager                   (DD-5)
            ├─ runStart    SELECT NOW(6) — THE FIRST STATEMENT, pre-insert (DD-7, M-1)
            ├─ refresh     names always (truncated); carnet only when stored value empty
            ├─ reactivate  sec_users.is_active = 1; role 3, AT MOST ONE row (DD-13, M-2)
            └─ SAVEPOINT create_grant                                      (DD-15, M-5)
                 ├─ create     chunked insert
                 ├─ re-select  by carnet + is_active + created_at >= runStart (DD-7, J-5)
                 ├─ assert     carnet SET equal AND row COUNT equal        (F-3)
                 ├─ grant      CONTRIBUTOR on the asserted id set          (R-AGS-004)
                 └─ on failure ROLLBACK TO SAVEPOINT; refresh + reactivate
                               survive; abortReason = GRANT_ASSERTION      (M-5)
```

**`runStart` is the transaction's first statement.** MySQL's `NOW(6)` returns the time *its own statement* began — it is not frozen at transaction start. Read after the insert it is strictly later than every `created_at` the insert stamped, so `created_at >= runStart` matches **zero** rows and the F-3 assertion aborts every run that creates anybody *(M-1)*.

**No precondition gate appears in this flow.** That is deliberate and it is the split's whole point — see §5.1.

### 2.2 Reuse

| Reused | How |
| --- | --- |
| `BaseControlListSave.base()` | Unchanged. Still writes `alliance_user_staff` page by page and still returns the saved rows — which is what makes accumulation free |
| `SecRolesEnum` | `CONTRIBUTOR = 3`, `SYSTEM_ADMIN = 1`, verified at `sec_role.enum.ts`. No literals in the code |
| `SecUser` DTO | `complementary-entities/secondary/user/dto/sec-user.dto.ts` — the read shape |
| `LoggerUtil` conventions | Per root `CLAUDE.md` §4.1 |

**`AppSecret` is deliberately absent from this table.** The parent design reached it through the transaction manager to satisfy Judgment Day J-6; this spec does not touch the table at all, so J-6 has no target here.

---

## 3. Data model

**No DDL.** No table, column, index or FK is added or altered.

| Table | Access | Mechanism |
| --- | --- | --- |
| `sec_users` | read **ALL rows — active and inactive** (J-4); insert; update names/carnet; **update `is_active` → 1** | Raw parameterised SQL (DD-4) |
| `sec_user_roles` | read all rows for reactivation targets; insert `role_id = 3`; **update `is_active` → 1** on `role_id = 3` only | Raw parameterised SQL (DD-4) |
| `app_secrets` | **never read, never written** | — |
| `alliance_user_staff` | not touched by this design | — |

### 3.1 The constraints that shape the design

| Constraint | Consequence |
| --- | --- |
| No unique index on `sec_users.email` | Duplicates are possible in live data, **and email is now the only match key**. Matching must be deterministic and must not assume uniqueness — DD-12 |
| No unique index on `sec_user_roles (user_id, role_id)` | The database will not stop a duplicate role grant. Idempotence is entirely the code's job — NFR-AGS-001 |
| `sec_users.email` is `NOT NULL`, `varchar(150)` | A staff member with no email cannot be inserted **and cannot be matched**; skip and log — `R-AGS-003` |
| `sec_users.first_name` / `.last_name` are `varchar(60)` | Under MySQL strict mode an over-length value **rolls back the whole transaction**. Truncate, do not reject — `R-AGS-002` *(W-4)* |
| `sec_users.carnet` is `varchar(10)` | A longer `resourceId` would truncate or error. Validate before write — §5.4 |
| `utf8mb3` is **PAD SPACE** | `'A100 '` equals `'A100'` in SQL but not in a JS `Map`. Irrelevant to matching (email is trimmed and lower-cased on both sides), **relevant to the re-select** — §5.4 *(W-2, narrowed)* |

---

## 4. API surface

**No new endpoint, no changed route, no changed response shape.** `GET …/agresso/staff/clone/execute` keeps its fire-and-forget acknowledgement.

**One delta: who may call it.** `R-AGS-006` restricts the route to `SYSTEM_ADMIN` via `RolesGuard`. A caller without the role now receives the standard forbidden response instead of an acknowledgement. This is a **breaking change for any non-admin caller** — see the reversion challenge in §12.

The other externally visible change is invisible by construction: the run now does far more work, but the controller does not `await` the service, so the caller still gets `200` immediately (RSK-4, §9).

---

## 5. Workflows & business rules

### 5.1 Why there is no completeness guard

The parent design opened with three preconditions (`C-1` zero-payload, `C-2` distinct-carnet equality, `C-3` volume ceiling). **All three are gone, and none is replaced.**

They existed for exactly one reason: `base()` catches fetch errors and returns `[]`, so **an empty page is indistinguishable from a failed page** at the call site — and under `R-AGS-005` that ambiguity meant *"these people are not staff"*, feeding a mass deactivation. Every one of the guard's own defects (J-1, S-1, R-2, R-4, F-1, F-2) was a defect in that machinery.

With no deactivation path, the same ambiguity is **benign**:

| Payload problem | Consequence here | Consequence in the sibling spec |
| --- | --- | --- |
| A page failed to fetch | Those members are not provisioned **this run**. The next run provisions them | Their accounts are **deactivated** |
| `totalElements = 0` | Nothing is reconciled. No statement is issued | **Every** active account is deactivated |
| Duplicate carnets mask omitted staff | The omitted members wait for the next run | The omitted members are **deactivated** |

> ⚠️ **One thing C-2 did is NOT replaced by its removal, and this table originally claimed otherwise.**
> C-2 was also the spec's only **payload-side** duplicate check. Losing it made a payload carrying the
> same person twice produce **two accounts**, because nothing else deduplicates `allStaff` *(Judgment
> Day lineage-2 **M-4**)*. That gap is closed by **DD-14**, not by the sibling spec. The reusable
> lesson, recorded: *when removing machinery, enumerate what it **does**, not what it was **for**.*

**This is removal by construction, not a patch.** `F-1` and `F-2` — the two open SEVERE findings the final re-judgment left standing — are both defects *inside* `C-2` and `C-3`. Neither has a target in this document.

> **Binding note for the sibling spec.** All three preconditions are **mandatory** there, and `F-1`,
> `F-2`, `W-6` and `NEW-3` are open against them. Nothing in this section should be read as an
> argument that the guard was unnecessary — it was unnecessary *for this half*.

### 5.2 Matching (`R-AGS-001`, DD-12)

**One bulk read of ALL `sec_users` rows — active *and* inactive** (Judgment Day J-4). **One index**: `lower(trim(email)) → rows`.

Each staff member resolves in this order:

**Validation runs first, then the index is built, then the payload is collapsed** (DD-14). The order is load-bearing *(N-3)*: a member with a null email has **no collapse key**, so collapsing first would group every such member under one key and report them as an email collision instead of as skipped — and an over-length carnet could win a collapse and then be skipped, provisioning nobody. And the collapse must see the index, because the stored `carnet` of the matched row is the only signal that says *which* payload member is the right one *(N-2)*.

| # | Step | Outcome |
| --- | --- | --- |
| 1 | Pre-write validation — unusable email, or carnet > 10 chars | → **skipped**, counted, logged. **Removed before the collapse**, never a collision |
| 2 | Build the `sec_users` index on `lower(trim(email))` | — |
| 3 | **Collapse the survivors by `lower(trim(email))`** — winner rule below | one member per email; losers counted in `payloadEmailCollisions` |
| 4 | Exact lookup on `lower(trim(email))`. **Never `LIKE`** | candidate set |
| 3 | Candidate set empty | → **create** (`R-AGS-003`) |
| 4 | Candidate set contains an **active** row | → **refresh** that row (`R-AGS-002`) |
| 5 | Candidate set empty | → **create** (`R-AGS-003`) |
| 6 | Candidate set contains an **active** row | → **refresh** it (`R-AGS-002`) |
| 7 | Candidate set is non-empty and **entirely inactive** — one row **or more** | → **reactivate exactly one**, chosen by the tie-break below (`R-AGS-007`). Every other candidate stays inactive and is reported *(M-3)* |

**Collapse winner rule (step 3) — FIRST ARRIVAL WINS.** *(User ruling 2026-09-14, closing `OQ-D5`: "el primero que llega es el primero que se guarda".)*

The **first** member encountered in payload order keeps the email; every later member with the same key is a collision loser. Payload order is page order, then row order within the page.

**Why this rule and not a comparator.** The first draft said *"lowest carnet wins"*, which Judgment Day `N-2` refuted on two counts: `resourceId` is a `string`, so "lowest" is undefined between `'10' < '9'` (lexicographic) and `9 < 10` (numeric); and in DD-14's own motivating case — a rehire issued a new employee id — the lowest carnet is by construction the **retired** record. **First-arrival needs no comparator, so neither objection applies to it.**

> **Two consequences, accepted rather than hidden:**
>
> 1. **Determinism is per-run, not across runs.** If the ERP reorders pages between runs (the shape lineage-1 verified as `S-1`), a different member can win the same group next time — changing the refreshed `first_name`/`last_name`, though **never** creating a second account. `payloadEmailCollisions` names both carnets every run, so a flapping pair is visible.
> 2. **A stored carnet does not override arrival order.** If the account carries `carnet = 'B200'` and the `A100` record arrives first, `A100`'s names are written. The carnet itself is safe — `R-AGS-002` never overwrites a stored one — and the conflict is logged at `warn`. Preferring the carnet-matched member was considered and **not** adopted: it is a second rule where the user asked for one.

**Why the read includes inactive rows.** Scoping it to active rows makes every deactivated account invisible, so a returning employee is classified *create* — producing a second row with the same email, granting it `CONTRIBUTOR`, and orphaning the original's attribution. Under the new reactivation ruling this is not merely a duplicate: it is the *wrong implementation of a requirement that now exists*. `R-AGS-007` is only reachable because the read covers inactive rows.

**Tie-break, when one email maps to more than one row.** The ordering must be **total**, so two runs over the same data choose the same row:

1. Prefer an **active** candidate over an inactive one — a live account is the one being used.
2. Prefer the most recent `last_login_at`; **`NULL` sorts last**.
3. Prefer the **lowest `sec_user_id`** — a pure determinism tiebreaker.

> ⚠️ **Rule 3 is the rule that caused Judgment Day J-3, and it is safe here only because this spec
> cannot deactivate.** In the parent design the losing candidate matched no staff member *by
> construction* and therefore fell into the deactivation set — retiring the newer, more likely live
> account. Here the loser is simply **not refreshed**: no column of it changes. **The sibling spec must
> NOT inherit rule 3 naively** — it needs `EX-3` (exempt every ambiguous candidate from deactivation),
> which is why that exclusion travelled with `R-AGS-005`.

**Every ambiguous match is reported** — all candidates, by id — at `warn` and in the run summary. Reporting is this spec's entire response to RSK-1; repairing duplicate data is out of scope.

**Step 4 dominates step 5.** If a person has one active and one inactive row, the active row is refreshed and the inactive one is **left inactive**. Reactivating it would give one person two active accounts, which is the duplicate this spec exists to avoid.

### 5.3 Classification

| Set | Rule | Requirement |
| --- | --- | --- |
| **Skipped** | Unusable email, or carnet > 10 chars. Removed **before** the collapse | R-AGS-003 |
| **Collapsed** | A surviving member that lost its email group to another member (DD-14). Written nowhere; counted in `payloadEmailCollisions`, logged at `warn` with both carnets *(N-8 — the round-1 delta claimed this row and it was not present)* | R-AGS-003 |
| **Create** | Email matched **no row at all**, active or inactive | R-AGS-003 + R-AGS-004 |
| **Refresh** | Email matched at least one **active** row | R-AGS-002 |
| **Reactivate** | Email matched one or more rows, **all inactive** | R-AGS-007 |
| **Untouched** | Any `sec_users` row no staff member matched | — *(no write path exists)* |

**The "untouched" row is the split's boundary made concrete.** In the parent design this set fed `R-AGS-005`. Here it feeds nothing, and `R-AGS-001` AC.3 asserts it is byte-identical including `updated_at`.

### 5.4 Writes

All batched; none per-member (NFR-AGS-002). `CHUNK` is a **fixed module constant**, so a fixture can assert an exact statement count *(G-3)*.

| Operation | Shape |
| --- | --- |
| Create | Chunked multi-row `INSERT`, then re-select by **`carnet` + `is_active = 1` + `created_at >= runStart`** to obtain ids (DD-7). **Never by email.** `runStart` is kept **server-side**: `SET @run_start = NOW(6)` as the transaction's first statement, then `WHERE created_at >= @run_start`, never round-tripped through the application. A Node `Date` skewed against the MySQL clock fails the predicate for every row *(R-5)*, and a `SELECT NOW(6)` returned through mysql2 becomes a JS `Date` at millisecond precision unless `dateStrings` is set — truncating the microseconds this predicate is written in *(RB-9)* |
| Grant role | Chunked multi-row `INSERT` into `sec_user_roles`, restricted to the ids the re-select returned — and **only if the returned carnet set equals the inserted carnet set AND the returned row count equals the inserted row count**. Either check failing **rolls back to the `create_grant` savepoint, not the whole transaction** *(F-3, M-5)* |
| Refresh names | Chunked `UPDATE … CASE` keyed by `sec_user_id`. Values truncated to 60 chars **before** the statement is built; each truncation logged |
| Backfill carnet | Same, guarded by `WHERE carnet IS NULL OR TRIM(carnet) = ''` — the guard lives in **SQL**, not only in the code that builds the batch |
| Reactivate user | Chunked `UPDATE sec_users SET is_active = 1 WHERE sec_user_id IN (…)`. No other column is written |
| Reactivate role | **Three disjoint id lists, computed from one chunked read of `sec_user_roles` over the reactivation targets** *(M-2)*: (a) users already holding an **active** `role_id = 3` row → **no statement is issued**; (b) users holding one or more **inactive** `role_id = 3` rows and no active one → `UPDATE sec_user_roles SET is_active = 1 WHERE sec_user_role_id IN (…) AND role_id = 3 AND is_active = 0` over **one id per user** (`MIN(sec_user_role_id)` **among that user's `role_id = 3` rows**), never `WHERE user_id IN (…)`, which would flip a pre-existing duplicate pair into two active rows; (c) users holding **no** `role_id = 3` row → chunked `INSERT` with `role_id` as a **literal `3`**, never a value threaded from the batch builder. ⚠️ **`AND role_id = 3` is non-negotiable in (b)'s `WHERE` clause.** The id list is new code, and a builder that computes `MIN` over a user's inactive rows *before* filtering to role 3 emits the id of a `role_id = 1` row and **restores `SYSTEM_ADMIN`**. The predicate makes that unreachable in SQL rather than merely unintended in TypeScript *(N-4 — an earlier draft specified `WHERE sec_user_role_id IN (…)` alone while four other sites promised the guard)* |

**Pre-write validation — skipped and logged:** email null, empty, whitespace-only, or over 150 characters; carnet over 10 characters. **Names are truncated, not skipped** — a 61-character name is not a reason to deny someone an account, but an unhandled one rolls back the transaction under strict mode *(W-4)*.

**Why `runStart` is the first statement (M-1).** `sec_users.created_at` defaults to `CURRENT_TIMESTAMP(6)` at INSERT time, and `NOW(6)` returns the start of **its own** statement. Sampled after the insert, `runStart` is strictly later than every row it is meant to bracket, the re-select returns nothing, and the F-3 count check rolls the batch back — on **every** run that creates anybody. The earlier draft sequenced it after the insert; R-5 had fixed the clock *source* and the ordering it depends on was never pinned.

> **The transaction's isolation level, stated because DD-15's reachability depends on it *(N-9)*.** Every transaction in `src/` is `dataSource.transaction(async (manager) => …)` with no isolation argument, so the run executes under InnoDB's default **REPEATABLE READ**. Under RR a row committed by another connection *after* this transaction's first consistent read is invisible to the re-select, so the F-3 assertion **fires less often than the paragraph below implies** — which is safe in the direction that matters: it never grants wrongly, it only aborts less. **The bulk read's placement outside the transaction is load-bearing** and must not be moved inside it, or the re-select goes blind to the collision entirely. `OQ-D7`; lineage-1 `W-9` in a load-bearing position, **not a blocker**.

**Why create+grant sit in a savepoint (M-5).** DD-5 puts the whole pass in one transaction, so without a savepoint a failed grant assertion discards **every refresh, every backfill and every reactivation** as well — and the operator already holds a `200`, because the controller does not await. The abort is reachable in ordinary operation, not only under pathological concurrency: `createUserInSecUsers` writes `carnet` whenever an active `alliance_user_staff` row with that carnet exists, and **this sync writes that table page by page before reconciliation runs**. Any concurrent user lookup for a just-synced member inserts a second row inside the window. Scoping the rollback to `create_grant` means that collision costs the run its *creates*, not its *refreshes*.

**Why both grant assertions (Judgment Day F-3).** DD-7 correctly avoids assuming consecutive auto-increment ids, and J-5 correctly moved the re-select key off the non-unique `email`. What remained wrong was the *assertion*: the documents stated **set**-equality in one place and **count**-equality in four, and Judge B showed neither is sufficient alone.

| Failure | Caught by | Missed by |
| --- | --- | --- |
| A concurrent `createUserInSecUsers` inserts the same carnet inside the run window → re-select returns 2 rows for 1 carnet | **count** equality | set equality — the set is identical |
| One insert silently missing while one foreign row satisfies the predicate → same count, different rows | **set** equality | count equality — the count balances |

**Under PAD SPACE this is not hypothetical:** a stored `'A100 '` satisfies `carnet IN ('A100')`, so the re-select can legitimately return a row the insert did not create. The count assertion is what catches it *(W-2)*.

**Why the carnet guard is in SQL.** Putting it only in the batch-building code makes the correctness of `R-AGS-002` depend on a condition no test can observe from the database. In the `WHERE` clause, a bug that mis-builds the batch still cannot overwrite a stored carnet. The same reasoning pins `role_id = 3` in the reactivation `WHERE` clause — that one guards against re-granting elevated access.

---

## 6. Frontend impact

**None.** No client change, no admin-panel change, no design tokens.

---

## 7. Integration impact

| Integration | Impact |
| --- | --- |
| `tip-integration`, `prms.opensearch`, `results.service` | **None.** Their find-or-create paths are untouched (DD-8) |
| Agresso ERP | Read-only, unchanged endpoint and pagination |
| **Machine-token integrations** | **None.** This spec never reads or writes `app_secrets`. The cascade, J-6's transaction-manager correction, and the RSK-6 analysis that justified them all moved to the sibling spec |
| Cognito | No email is ever written, so no login identity changes. `R-AGS-007` restores access to an identity that already exists |

---

## 8. Security & authorization

| Concern | Position |
| --- | --- |
| **Privilege grant** | `R-AGS-004` grants `CONTRIBUTOR` to accounts this pass creates, and to nothing else. The grant is scoped to the re-selected id set, doubly asserted |
| **Privilege restoration** | `R-AGS-007` restores **`role_id = 3` only**. `role_id` is pinned in SQL so no elevated role can be restored by a batch-building bug. Roles other than 3 stay inactive and are named in a `warn` log (RSK-7) |
| **Privilege revocation** | **None. This spec revokes nothing** |
| **Access restoration is the real risk** | `R-AGS-007` cannot tell an offboarding from a suspension, because nothing in `sec_users` records why a row was deactivated. See **RSK-8 / OQ-7** — the only open question that could change a requirement |
| **Trigger authorization** | ✅ Closed by `R-AGS-006`. Verified 2026-09-14: the controller carries only `@ApiBearerAuth()` / `@ApiTags()` — Swagger decorators, not guards. Now `SYSTEM_ADMIN` only, via `@UseGuards(RolesGuard)` + `@Roles(SecRolesEnum.SYSTEM_ADMIN)`, matching `ImpactOutcomesController` |
| SQL injection | Every statement is parameterised. Id lists are numeric-validated before interpolation |
| Audit | `created_by` / `updated_by` come from the request user via the existing audit path |

**Two sibling endpoints keep the missing-guard shape** (RSK-5): `agresso-tools.controller.ts:12` and `clarisa.controller.ts:32`. They are worth a separate, easy pass.

**`R-AGS-006` closes RSK-6 on this route only.** `RolesGuard` denies a null `req.user` only on `@Roles`-decorated handlers, so adding the decorator also shuts out a machine token whose responsible user is inactive. That is a side effect on one endpoint, **not** a fix — RSK-6 remains live everywhere else and deserves its own bugfix spec.

---

## 9. Observability

`NFR-AGS-003` requires a per-run summary at `log`:

| Field | Why it earns its place |
| --- | --- |
| `staffFetched`, `matched` | The pass's own inputs |
| `created`, `rolesGranted` | The provisioning path |
| `namesRefreshed`, `namesTruncated`, `carnetBackfilled` | The refresh path — `namesTruncated` makes W-4's silent data change visible |
| **`reactivated`, `rolesReactivated`** | `R-AGS-007`. Separate counts, because "the account came back" and "the role came back" fail independently |
| **`rolesLeftInactive`** with each user and role id | RSK-7. A returning admin who is now a contributor is otherwise invisible until they complain |
| `skippedUnusableEmail`, `skippedCarnetTooLong` | The skipped population, which would otherwise be invisible |
| `carnetConflicts`, `ambiguousMatches` with all candidate ids | RSK-1. Reporting is this spec's entire response to duplicate data |
| **`payloadEmailCollisions`** with both carnets per collision | **DD-14** *(M-4)*. Two staff records for one email is the input that used to produce two accounts; the count is what makes it visible instead of silent |
| **`accountsWithoutRole`** with each id | `OQ-D6`. A matched **active** account holding no active `role_id = 3` row is left untouched by ruling — normally an external on another flow, and also where N-5's savepoint orphan lands. Reporting is the only thing that makes it visible to a human |
| **`abortReason`** — `GRANT_ASSERTION`, or absent | **DD-15** *(M-5)*. A run whose create+grant rolled back to the savepoint still commits its refreshes and reactivations, so without this field its summary is **indistinguishable from a run that had nobody to create**. §9's own gap note makes the summary the only feedback channel |

At `warn`, individually: every carnet conflict, ambiguous match, skipped member, name truncation, and every reactivation that left a non-contributor role inactive.

**Gap, recorded not solved:** the controller does not `await` the service, so a caller gets `200` before any of this happens and **failures surface only in logs** (RSK-4). Fixing that is an API-contract change beyond this spec's scope. It means the run summary is the *only* feedback channel.

---

## 10. Testing strategy

DB behaviour is proven against a real database, never against emitted SQL strings (KZ-001).

| Tier | Command | Covers |
| --- | --- | --- |
| Unit | `npm test -- --silent` | Indexing, matching, tie-break ordering, classification, validation/skip, truncation, summary counts — all with the repository mocked |
| **Fixture** | `npm run migration:test:bootstrap && npm run test:fixtures` | Every DB-level claim: matching, idempotence, the SQL carnet guard, the double grant assertion, the pinned `role_id = 3` reactivation, PAD SPACE behaviour |
| **Statement count** | Fixture, ≥ 50 and ≥ 100 members | **NFR-AGS-002** — asserts the *exact* chunked count at both sizes, so linear growth fails *(closes Judgment Day W-8: the parent defined this gate in `requirements.md` and omitted it here)* |
| Lint | `npx eslint <paths>` (bare — `npm run lint` carries `--fix`, K-001) | |

**Scope limits, stated (KZ-017):**

- `npm test` has `rootDir: src` and **never runs `test/fixtures/`**. A green `npm test` is not evidence for any claim in §3 or §5.
- Fixtures run against the disposable scratch schema. **Nothing here says anything about the composition of Dev or Prod `sec_users`** — in particular, how many duplicate-email rows exist (RSK-1).
- **No harness can evaluate RSK-8** (suspension vs offboarding). The schema records no reason, so the property is not merely unmeasured but **unmeasurable**. The substitute is the operator ruling requested in OQ-7, not a test.
- ~~**No harness can evaluate RSK-9**~~ → ✅ **RESOLVED 2026-09-15, and no harness was needed.** The pre-flight returned `{'N', NULL}` — the column cannot discriminate — and the risk is closed upstream by Agresso's documented `?status=active` filter on the fetch. Two unit gates now assert the parameter and redden when it is removed. Original text follows, kept because the reasoning about what a harness *cannot* reach is still correct: **No harness can evaluate RSK-9** (the Agresso `status` semantics). The substitute is a one-query pre-flight, not a test: `SELECT DISTINCT status FROM alliance_user_staff`, **or a terms aggregation on the `alliance_user_staff` OpenSearch index** *(RA-13)*. ⚠️ **Still owed as of 2026-09-14** — the owner could not reach the database (VPN). This blocks *trusting a first Prod run*, not implementation.
- `migration:test:bootstrap` is **not idempotent** (FP-49): once per fresh container; recover with `compose:test:down` → `up` → `bootstrap`.
- Fixture files must be named `*.fixture-spec.ts` or they are collected by **neither** runner — a silent zero-tests pass.

---

## 11. Rollout

| # | Step | Why |
| --- | --- | --- |
| 1 | **Answer OQ-7** before merge | It is the only open question that can change a requirement. If suspensions must be respected, `R-AGS-007` needs a gate that does not exist yet |
| ~~2~~ | ✅ **DONE 2026-09-15.** ~~Read the `status` value set~~ — it is `{'N', NULL}`, which discriminates nothing. Superseded by adding **`?status=active`** to the fetch, which closes RSK-9 upstream rather than by inspection. **No longer a rollout gate** |
| 3 | **Count duplicate emails in Dev**: `SELECT email, COUNT(*) FROM sec_users GROUP BY email HAVING COUNT(*) > 1` | RSK-1's real magnitude. No fixture can tell you this |
| 4 | Deploy to Dev, run the sync, read the summary | `created`, `reactivated` and `ambiguousMatches` are the three numbers that say whether the pass did what was expected |
| 5 | Verify, then Prod | |

**Rollback:** this spec's writes are **not reversible by a flag** — created users, granted roles and reactivated accounts persist. They are, however, **additive**: nothing that worked before stops working. The one change that can break a caller is `R-AGS-006`'s guard, which is reverted by removing one decorator.

**No migration is involved.** Nothing here needs the K-015 human migration step.

**No dry-run mode.** `DD-9` existed because `R-AGS-005` was irreversible against an unmeasured population. This spec's writes are additive and its risky one (`R-AGS-007`) is reversible by an administrator switching the account back off. The dry run travelled with the requirement that needed it.

---

## 12. Design decisions log

| # | Decision | Rationale | Rejected alternative |
| --- | --- | --- | --- |
| **DD-1** | Reconciliation lives in a new `SecUserReconcilerService`, not inside `AgressoStaffToolsService` | The existing service is a 46-line paginated fetch loop. Folding account-lifecycle logic into it makes both untestable in isolation | Inline in `cloneAllAgressoStaff` — rejected: mixes fetch orchestration with authorization writes |
| **DD-3** | One bulk read of **ALL** `sec_users` rows — active *and* inactive — plus in-memory matching | Satisfies NFR-AGS-002, and it is what makes `R-AGS-007` reachable at all: an active-only read hides every account a return would restore. *(Amended after Judgment Day J-4/R-1, which found the original "active" wording surviving in two of four sites.)* | Per-member `SELECT` — rejected: ~2,000 round trips |
| **DD-4** | Raw parameterised SQL in a dedicated repository; **no** new TypeORM entities for `sec_users` / `sec_user_roles` | Matches how the codebase already reaches these tables (`result.repository.ts`, `AppSecretRepository`). Introducing entities would put TypeORM in charge of tables several raw-SQL paths already write | New entities — rejected: wide, silent blast radius on tables the app authenticates against |
| **DD-5** | The whole reconciliation runs in **one transaction**, and **every** write goes through that transaction's `manager` — **with create+grant additionally inside a savepoint (DD-15)** | A created user without a role is a broken account; a reactivated user without their role is the same. **The atomicity this decision protects is per account, not per run** *(N-10: DD-15 deliberately commits a partial run, and both of this decision's invariants survive it — create+grant sit inside the savepoint together, and reactivate-user and reactivate-role are both in the outer transaction).* *(Scope reduced with the split: two tables, not three. J-6 — the `AppSecretRepository` cannot join a transaction — has no target here, and travels to the sibling spec where it does.)* | Per-operation commits — rejected: a half-provisioned account |
| **DD-6** | Exact matching, never `LIKE` | `findUserByEmail`'s `LIKE '%…%'` is tolerable for a one-off lookup and wrong for a ~1,000-row sweep: `ana@` matches `susana@` | Reuse `findUserByEmailOrCarnet` as-is — rejected: see DD-8 |
| **DD-7** | New ids resolved by **re-select after insert**, never by assuming consecutive auto-increment; keyed on `carnet` + `is_active` + `created_at >= runStart`, and asserted on **both** set and count. **`runStart` is the transaction's FIRST statement, read before any insert and kept server-side in `@run_start`** *(N-1/RA-7/RB-9 — M-1 corrected §2.1 and §5.4 and never reached this decision, the same R-1 shape this ledger has paid for twice)*. ⚠️ **Fix-caused consequence, stated:** putting `runStart` first **widens** the `created_at >= @run_start` bracket across the whole refresh and reactivate phase, so M-1 makes DD-15's rollback strictly *more* reachable | Consecutive ids hold only under `innodb_autoinc_lock_mode=1`. Keying on `email` reintroduces the same class through a non-unique column (J-5). Asserting only one of set/count leaves a reachable hole in each direction (F-3) | `LAST_INSERT_ID()` + offset arithmetic — rejected: silently wrong under lock mode 2. Single-sided assertion — rejected: F-3 |
| **DD-8** | `findUserByEmail` and the shared find-or-create path are **not modified** | Three live callers depend on their current behaviour. Fixing the `LIKE` there is a real improvement and a **separate** change with its own regression surface | Fix it here — rejected: scope creep onto three integrations this spec does not test |
| **DD-10** | Restrict the trigger with `@UseGuards(RolesGuard)` + `@Roles(SecRolesEnum.SYSTEM_ADMIN)` on the controller, not with a check inside the service | The controller does **not** `await` the service, so a check placed inside it would let the work begin and still return a refusal. A guard refuses before the handler body runs | A permission check at the top of `cloneAllAgressoStaff` — rejected: fires too late to prevent the work |
| **DD-12** | **Matching is by `email` only.** One index, `lower(trim(email))`. Carnet is written, never matched on | User ruling 2026-09-14: email is the only column on which `sec_users` and `alliance_user_staff` can be compared. It also *removes* an entire defect class — with one key there is no cross-key tie-break, no `OQ-3` conflict, and no path by which a carnet backfill manufactures the RSK-1 duplicate the spec declines to repair (Judgment Day **F-9**, dissolved). ⚠️ **That last clause was half true and is now scoped:** it holds for the **backfill** path and failed for the **create** path, which the email-only ruling made the only path that matters — see **DD-14**, which closes it *(M-4)*. *(Open, not fixed this round: lineage-2 **A-8** — the sentence "email is the only column on which the two tables can be compared" is a factual claim the schema contradicts, since both carry `carnet`. The **ruling** stands; only its stated justification is wrong.)* | Carnet-first with email fallback — rejected by ruling, and it was the shape F-9 exploited |
| **DD-14** | **The payload is collapsed to one member per email before matching.** Lowest `carnet` wins; losers are counted and logged with both carnets | Nothing else deduplicates the payload side, and `alliance_user_staff.email` is nullable with **no unique index** while `carnet` is the PK — two rows for one email is a normal state (rehire with a new employee id, contractor→staff conversion, shared mailbox). Both would be classified *create*, and the F-3 assertion is blind to it because set and count both derive from the inserted list *(M-4)*. Collapsing also removes the unstable-pagination shape that the exhausted lineage verified as S-1 | Let both through and repair later — rejected: it manufactures the exact RSK-1 duplicate this spec declines to repair, and `findUserByEmail`'s `LIKE … LIMIT 1` then resolves that person non-deterministically for three other integrations |
| **DD-15** | **Create + grant run inside a `SAVEPOINT`; a failed F-3 assertion rolls back to it, not to the transaction** | The assertion is reachable in normal operation (see §5.4), and DD-5's single transaction would otherwise convert one concurrent insert into the loss of every refresh and every reactivation in the run. The savepoint keeps the atomicity that matters — **no account _this spec creates_ exists without its role** — while letting the rest of the pass commit. `abortReason = GRANT_ASSERTION` makes the partial outcome visible *(M-5)*. ⚠️ *Narrowed (N-5): the unqualified form was false in this decision's own trigger case. The row created by the concurrent `createUserInSecUsers` survives the savepoint rollback, and that method issues **one** `INSERT INTO sec_users` and **no** `sec_user_roles` insert (`result.repository.ts:593-617`, verified). On the next run its email matches an **active** row → refresh, never create. **User ruling 2026-09-14 (`OQ-D6`): that account is NOT repaired** — an active row carrying no role is normally an **external user, provisioned through a different flow**, and a staff sync must not hand roles to accounts it did not create. It is **reported** as `accountsWithoutRole`, never granted. `R-AGS-004` AC.2 stands unqualified.* | Roll back the whole transaction — rejected: disproportionate, and invisible given RSK-4. Commit the grant unasserted — rejected: that is J-5 |
| **DD-13** | **Reactivation writes two tables and one role.** `sec_users.is_active = 1`; `sec_user_roles` role 3 only, with `role_id = 3` a literal constant in every statement and **at most one role row written per user**. `app_secrets` untouched, other roles untouched | User ruling 2026-09-14. A literal `role_id` means a batch-building bug cannot restore `SYSTEM_ADMIN`. **The per-user cap is not cosmetic:** `sec_user_roles` has no unique index on `(user_id, role_id)`, so a `WHERE user_id IN (…)` update flips a pre-existing duplicate pair into *two* active CONTRIBUTOR rows, violating AC.2 and AC.6 *(M-2)*. Leaving `app_secrets` alone is the deliberate asymmetry: a machine credential silently coming back to life is worse than someone re-issuing it | Restore every role the user held — rejected: a staff sync must not re-grant elevated access. Restore `app_secrets` too — rejected by ruling, for the reason above |

### Reversion challenge (Step 2.3)

**Two decisions qualify.**

**DD-10 — restricting the trigger endpoint.** Removing access that exists today is exactly this step's trigger. The question: *what does removing this break?*

| Checked | Result |
| --- | --- |
| Callers of `clone/execute` anywhere in the repo — code, CI workflows, scripts, docs | **None.** The only matches are the controller declarations themselves. The endpoint is triggered by hand |
| **What this check cannot see** | A cron on a server, an ops runbook, a saved Postman collection, or any caller outside this repository. If such a caller exists without `SYSTEM_ADMIN`, it breaks on deploy — **silently**, since the endpoint is fire-and-forget and its failures already only surface in logs (RSK-4) |

**Verdict: proceed.** The in-repo evidence is clean and the change is the user's explicit ruling. The unobservable case is recorded rather than dismissed — it costs one question to whoever operates the sync.

**DD-13 — reactivation.** This one **reverts a decision rather than existing behaviour**: `OQ-5` previously ruled deactivation one-way. The question: *what does turning accounts back on break?*

| Checked | Result |
| --- | --- |
| Does any code path depend on a deactivated account **staying** deactivated? | **No such path exists in this repo.** `is_active` is read as a live flag, not as a terminal state |
| Can reactivation restore access someone deliberately removed? | **Yes — and this is a real breakage.** Nothing records *why* a row was deactivated, so a hand-suspended account held by a current staff member is reactivated every run. **Raised as RSK-8 / OQ-7 rather than absorbed** |

**Verdict: proceed to the gate, not past it.** OQ-7 is listed as the first rollout step precisely because this challenge found a concrete breakage the design cannot itself resolve.

The remaining decisions do not qualify: `base()` keeps its error contract, the three find-or-create call sites are untouched (DD-8), and no guard, cache, fallback or default is removed. **Removing `R-AGS-005` is not a reversion** — it is a relocation, and the sibling spec carries it with its full ledger.

---

## 13. Open questions

| # | Question | Blocking? | Default |
| --- | --- | --- | --- |
| ~~**OQ-D1**~~ | ~~Should the roles guard be fixed before this ships?~~ | — | ✅ **RESOLVED 2026-09-14 (user): fixed here.** Became `R-AGS-006` / DD-10 |
| ~~**OQ-D2**~~ | ~~Where should the dry-run flag live?~~ | — | **MOVED** to the sibling spec with `DD-9`. No flag exists here |
| **OQ-D3** | Should the summary also be persisted (a row per run) rather than only logged? | No | Log only. §9's gap makes a persisted record attractive, but it is new surface with no stated need |
| **OQ-D4** | Is `CHUNK` a shared constant or per-operation? | No | One module constant. NFR-AGS-002's gate asserts an exact statement count, which needs a fixed, known value |
| ~~**OQ-D5**~~ | ~~DD-14's collapse: which payload member wins?~~ | — | ✅ **RESOLVED 2026-09-14 (user): first arrival wins.** Needs no comparator, which is exactly what retired *"lowest carnet"* *(N-2)*. §5.2 records the two accepted consequences |
| ~~**OQ-D6**~~ | ~~Should a matched active account with no active `role_id = 3` row be granted one?~~ | — | ✅ **RESOLVED 2026-09-14 (user): NO.** Roleless active accounts are normally **externals on a different flow**. Left untouched, reported as `accountsWithoutRole`. `R-AGS-004` AC.2 stands unqualified; N-5's orphan is made visible, not repaired |
| **OQ-D7** | What isolation level does the reconciliation transaction run at? | **No** | **REPEATABLE READ** — the platform default; no transaction in `src/` sets one. The F-3 assertion fires less often than DD-15's prose implies, which is safe in the direction that matters. `READ COMMITTED` or `FOR UPDATE` would widen it; neither is required to ship |

---

## 14. Budget (tripwire for `/akili-execute`)

| Metric | Expected |
| --- | --- |
| Tasks | **9** |
| LOC | **~3,000** — *re-baselined 2026-09-15 during execution, user-approved at the T-03 gate. Superseded: ~1,580.* |
| Review rounds | **5** |

> **Re-baseline 4 — 2026-09-15, mid-execution, at the budget tripwire (user-approved).**
>
> After three tasks the actual was **1,385 LOC of the ~1,580 budgeted (88%) with 6 of 9 tasks still
> open**, including T-09's ~530. T-04 would have crossed the tripwire, so execution stopped and
> escalated as §14 requires.
>
> **The overrun is entirely in test code, and the implementation estimate was sound:**
>
> | | Budgeted for T-01…T-03 | Actual |
> | --- | --- | --- |
> | Implementation | ~740 | **580** |
> | Unit tests | ~320 (for the *whole* unit tier) | **805** (three tasks) |
>
> The `~320` line assumed a conventional unit tier. This spec is not one: `requirements.md` §10
> defines **30 defect-class gates**, every gate must be observed failing before it may be cited
> (K-004), and several need adversarial fixtures where the correct and incorrect rules *disagree* —
> T-02 alone rewrote two gates after finding they passed with the defect reintroduced. That work is
> the deliverable, not waste.
>
> **Ruling: the estimate was wrong, not the work.** LOC re-baselined to **~3,000**; tasks and review
> rounds unchanged. This vindicates the *"Honest caveat"* below, which predicted exactly this and was
> written before any code existed.

**Re-baselined 2026-09-14 for the split** *(closes Judgment Day F-4, which found the parent's budget still citing round 1 only, "seven new gates", and a nine-gate figure that was actually thirteen).*

| # | Baseline | Why it moved |
| --- | --- | --- |
| 1 | 9 tasks / ~1,560 LOC — *the parent, after lineage-1 round 1* | — |
| 2 | 8 tasks / ~1,240 LOC — *at the split* | **Removed:** three preconditions, three exclusions, the three-table cascade, `app_secrets` access, the dry-run flag, and every fixture for them (≈ −520). **Added:** `R-AGS-007`'s reactivation path, the second grant assertion, name truncation, and its new gates (≈ +200) |
| **3** | **9 tasks / ~1,580 LOC — current**, after lineage-2 round 1 | **Added:** the payload collapse (DD-14), the `create_grant` savepoint (DD-15), reactivation's three disjoint role branches and their extra chunked read (M-2), the all-inactive tie-break (M-3), and **six** new gates (≈ +340). Reactivation became its own task |

**Re-baselined again 2026-09-14 after the lineage-2 round-1 corrections.** The six confirmed findings added real work, not just prose: the payload collapse (DD-14), the savepoint (DD-15), reactivation's three disjoint role branches with their extra chunked read (M-2), the all-inactive tie-break (M-3), and **six new gates**. Reactivation is now heavy enough to be its own task, hence 9. **Two review rounds are already spent** — lineage 2 used both its scoped re-judgments *(RA-12)*.

Gate count is **30**, counted row by row from §10's table — 22 at the split, 28 after round 1. *(Both counts of that table in the first lineage were wrong — F-6 and R-7, one round apart, in opposite directions. It is counted here, never carried forward.)*

> **Open, deliberately not fixed this round:** lineage-2 **M-10** — §14's "Removed" itemization double-counts C-3 (which *is* the volume ceiling), and the "five new gates" derivation above the table never reconciled. The *totals* were independently re-derived and confirmed by both judges; only the itemization is wrong.

**Sized against the finished design, not the Phase 0 guess.** The estimate remains dominated by the fixture tier, which is where every DB-level claim in §3 and §5 is actually proven.

**Honest caveat:** this repo's spec budgets have been low before — the Innovation Use chunks ran ~3× over at chunk 1 and +80% at the details page. If execution trips this tripwire, the first question should be whether the estimate was wrong, not whether the work was.

Exceeding this stops execution and escalates.

---

## 15. References

| Ref | Path |
| --- | --- |
| Requirements | `./requirements.md` |
| Judgment ledger (parent lineage) | `./judgment.md` — **exhausted**; findings that left with `R-AGS-005` are tracked in the sibling spec |
| Sibling spec | `../agresso-staff-deactivation/proposal.md` |
| Current sync | `server/researchindicators/src/domain/tools/agresso/staff/agresso-staff-tools.service.ts` |
| Current controller — RSK-3 / RSK-4 evidence | `server/researchindicators/src/domain/tools/agresso/staff/agresso-staff-tools.controller.ts` |
| Staff payload DTO — RSK-9 evidence | `server/researchindicators/src/domain/tools/agresso/staff/dto/agresso-staff-raw.dto.ts` (`status: string`) |
| Staff mapper — RSK-9 evidence | `server/researchindicators/src/domain/tools/agresso/mappers/alliance-staff.mapper.ts:14` — the only **write** of `status` |
| Staff `status` **readers** — RSK-9, corrected *(M-6)* | `src/domain/entities/alliance-user-staff/repository/alliance-user-staff.repository.ts` — `findDataForOpenSearch` issues `this.find({ where })`, returning every column; `.../tools/open-search/alliance-staff/dto/alliance-staff.opensearch.dto.ts:24-27` declares `status` an `@OpenSearchProperty({ type: 'keyword' })`. **The field IS read and indexed today.** The earlier "nothing reads it" claim came from a grep scoped to `tools/agresso/` — KZ-017, and three parties reproduced the same false green |
| Shared base | `server/researchindicators/src/domain/shared/global-dto/base-control-list-save.ts` |
| Existing find-or-create | `server/researchindicators/src/domain/entities/results/repositories/result.repository.ts` |
| Roles | `server/researchindicators/src/domain/shared/enum/sec_role.enum.ts` |
| Schema | `server/researchindicators/src/db/baseline/baseline.sql` |
