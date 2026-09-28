# Design — Agresso / Staff Deactivation · **Increment 1: Measurement**

- **Module:** agresso
- **Spec id:** 2026-09-agresso-staff-deactivation-i1
- **Status:** implemented (increment 1) · PAUSED
- **Owner:** ARI server squad
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Judgment:** [`./judgment.md`](./judgment.md) — round 1 corrections applied
- **Last updated:** 2026-09-16

> **Absolute invariant: this increment has no write path.** No `UPDATE`, no `INSERT`, no `DELETE`, no
> transaction. Not a guarded write, not a transaction that rolls back — none at all. That is what
> makes the four confirmed-severe findings non-destructive here: each would produce a wrong *report*,
> which a human reads, rather than a wrong *retirement*, which nothing undoes.


> ⏸️ **PAUSED 2026-09-16 (priority change). Read [`HANDOFF.md`](./HANDOFF.md) first.**
> Increment 1 is code-complete, green and committed — but **has never been run**, so the four
> measurements it exists to produce do not exist yet. Increment 2 is unstarted and undated.

---

## 1. Goals & non-goals

**Goals**

| # | Goal | Requirements |
| --- | --- | --- |
| G-1 | Compute and report the exact deactivation set | R-AGD-001, R-AGD-005 |
| G-2 | Withhold the set when the payload cannot be trusted | R-AGD-004 |
| G-3 | Reuse the sibling's matching pass exactly — one index, one normalization | R-AGD-001, R-AGD-002 |
| G-4 | Produce the four measurements increment 2 must be designed against | R-AGD-005 |

**Non-goals**

| # | Non-goal | Why |
| --- | --- | --- |
| NG-1 | Deactivating anything | The whole point of the increment |
| NG-2 | The write transaction, the three-table cascade | Increment 2 |
| NG-3 | `app_config`, the seeding migration, the C-3 ceiling | Nothing to gate without writes; removes `F-2`, `JD-5`, `JD-6`, `K-015` |
| NG-4 | Reactivation, creation, refresh | The sibling's, by the split invariant |
| NG-5 | Fixing `RSK-6` | Its own bugfix spec |

---

## 2. Architecture

A fifth, read-only stage inside `cloneAllAgressoStaff`.

```
cloneAllAgressoStaff()
  1. findNumberOfPages()    ── FIXED (DD-D2): ceil, not round+1
  2. page loop              ── NEW: records a FetchReport (per-page row counts)
  3. reconciler.reconcile() ── unchanged; exposes its sec_users snapshot (DD-D4)
  4. reconciler.applyCreateAndGrant()  ── unchanged
  5. deactivation.measure() ── NEW, READ-ONLY  ◀── this increment
  6. buildSummary()         ── extended
```

### 2.1 Composition

| Path | Responsibility | New? |
| --- | --- | --- |
| `…/staff/email-key.util.ts` | The single `normalizeEmail` + the shield predicate | **new** |
| `…/staff/sec-user-deactivation.repository.ts` | **Read-only SQL.** External status, active population, candidate role rows | **new** |
| `…/staff/sec-user-deactivation.service.ts` | Shields, exclusions, preconditions, candidate set, report | **new** |
| `…/staff/sec-user-reconciler.service.ts` | Delegates normalization to the util; exposes its snapshot | modified |
| `…/staff/agresso-staff-tools.service.ts` | Page-count fix, `FetchReport`, stage 5 wiring | modified |
| `…/staff/dto/sec-user-reconciliation-summary.dto.ts` | This increment's fields | modified |
| `…/staff/agresso-staff-tools.module.ts` | Registers the two new providers | modified |

### 2.2 Reuse

- `SecUserReconcilerRepository.findSecUserRolesByUserIds` — chunked, already coerces `tinyint`. Used for EX-2.
- The reconciler's `sec_users` snapshot, its classification output, `LoggerUtil`, `CHUNK`.

**Explicitly NOT reused** *(NFR-AGD-005, `JD-5`)*: `AppConfigService`, `CurrentUserUtil`,
`AppSecretRepository`. `AppConfigService` injects `CurrentUserUtil` (`Scope.REQUEST`) and Nest bubbles
that scope up to the fire-and-forget controller; the repository forbids it in writing at
`mapping-phase.resolver.ts:11-15`. **This increment reads no config at all**, which is the cheapest
possible compliance. `AgressoStaffModule` therefore needs no new imports — it still imports only
`HttpModule`, and both new providers are plain singletons taking `EntityManager`/`DataSource`.

---

## 3. Data model

**No schema change. No migration. No row written.** Read: `sec_users`, `sec_user_roles`, `user_status`.

---

## 4. API surface

**No change.** Richer body on `GET /api/agresso/staff/clone/execute`, inside `ServerResponseDto`. No `/v1` segment — the handler declares no `@Version(...)`.

---

## 5. Workflows & business rules

### 5.1 Fetch completeness — C-2, corrected

`base()` catches a fetch error, logs it, and returns `[]`, so a failed page is indistinguishable from
a small one at the call site. C-2 has two clauses over two different measurements:

| Clause | Aborts when | Catches |
| --- | --- | --- |
| Empty page | **any page except the last** contributed `0` rows | A page whose fetch threw |
| Distinctness | `distinctNonEmptyCarnets < totalElements` | Pagination instability, where a repeat masks an omission |

> ⚠️ **Both clauses are corrections, and each replaces something that was wrong.**
>
> **The distinctness clause replaces a row count** *(`JD-1`, both judges)*. `allStaff` is appended once
> per **row** inside the mapper closure, so its length counts fetched rows, while `totalElements`
> counts distinct records. A duplicate inflates the length by exactly what an omission deflates it —
> the two cancel, and 5 employed people are retired on a run that reports healthy. That is `S-1`,
> closed by the parent lineage in round 1 and reopened by the correction written to close `F-1`.
> **Distinctness is the property; volume was never a proxy for it.**
>
> **The last-page exemption replaces a zero tolerance** *(`JS-5`)*. After `DD-D2` the final page holds
> `totalElements mod pageSize` rows — frequently a handful — so one mid-run departure empties it and
> aborts a healthy run. Exempting the final page from the empty-page clause costs nothing, because the
> distinctness clause sees the same shortfall and reports the real cause.
>
> **The `driftTolerance` is deleted outright** *(`JD-2`, both judges)*. It was justified as absorbing a
> mid-run hire, but `totalElements` is read **before** the loop, so a hire produces a *surplus* — which
> never aborts. Its only reachable effect was a per-run budget of five wrongly retired people, and
> neither document declared it.

**The trade, stated rather than discovered** *(the omission the parent recorded against `R-4`)*: with
no tolerance, a genuinely duplicated carnet aborts every run forever. Accepted because `resourceId` is
the ERP employee identifier, because the abort **names the duplicated carnets**, and because this
increment is the harmless place to find out. Comparison is **one-sided** — a surplus never aborts.

### 5.2 The candidate set (R-AGD-001)

Computed over the reconciler's snapshot; **no second read**, which also removes a TOCTOU window.

| Step | Rule |
| --- | --- |
| 1 | `candidates` = snapshot rows with `is_active = 1` |
| 2 | Remove every row whose email key is in `shieldKeys` (§5.3) |
| 3 | Remove every row an exclusion shields (§5.4) |

> **Step 1 no longer subtracts `matchedIds`** *(`JD-7`, judge B)*. Every matched row's key is in the
> payload and therefore in `shieldKeys`, so the subtraction was dead code — and keeping it made EX-3's
> stated rationale unreachable while mis-attributing counters. One removal rule, evaluated once.

### 5.3 The shield set (R-AGD-002) — keyed on what matching compares

`shieldKeys` is built from the **raw payload**, before validation and before the collapse:

> for each member: **if `email` is non-null and `email.trim()` is non-empty**, add `normalizeEmail(email)`.

> ⚠️ **The predicate is `trim().length > 0` and never `isUsableEmail`** *(`JD-3`, both judges,
> independently)*. `isUsableEmail` rejects on `email.length > 150` measured on the **untrimmed** value,
> while the index and match keys are `email.trim().toLowerCase()`. A padded address has a trimmed key
> of ≤ 150 that matches a stored row exactly, yet `isUsableEmail` rejects it — so the member is
> skipped, never indexed, shields nothing, and a live account is retired. A fixed-width ERP export
> padded to a column width produces this **for every member at once**, and no volume ceiling catches a
> single-account instance.
>
> This was the fourth form, and it is **not** a fourth pipeline stage: `F-8`, `NEW-2` and `NEW-4` all
> ask *which stage dropped the member*. This one asks *which string the predicate measured*, which is
> why `R-AGD-002` organised by stage could not see it and three adversarial passes never reached it.

**The null guard precedes `trim()`** *(`JS-9`)* — `normalizeEmail` has none, and the shield runs over
the raw payload, *before* the only thing that guards null.

| Inherited form | Covered because |
| --- | --- |
| `CARNET_TOO_LONG` skip | Email is valid; its key is in the set though the member never reached the index |
| Padded / over-length raw email (`JD-3`) | The predicate now measures the same string as the key |
| Collapsed loser (`NEW-4`) | Its key equals its winner's *by construction of the grouping* |
| Genuinely empty/null email | Produces no key — and the account side is handled by **EX-4** |

### 5.4 Exclusions (R-AGD-003)

| # | Evaluation |
| --- | --- |
| **EX-1** | `Number(row.status_id) === externalStatusId`, resolved by name (§5.5) |
| **EX-2** | ≥ 1 `sec_user_roles` row with `role_id = 1` **and** `is_active = 1`, read chunked over candidate ids only |
| **EX-3** | Over the **candidate set after shield removal**: a key held by ≥ 2 candidates excludes all of them |
| **EX-4** | The candidate's own normalized key is empty — matchable by nothing, so absence carries no information |

> **EX-3's scope is stated because the judgment round found it ambiguous** *(`JD-7`)*. Evaluated over
> candidates-after-shields, not over the index: a key present in the payload is already shielded, so
> EX-3's only reachable population is keys **absent** from it — where every row under the key is a
> candidate, making "exclude every row" and "count both" agree. Evaluating over the index was what
> produced the contradiction, because there one row could be a matched non-candidate.

### 5.5 Resolving the external status (C-4)

`SELECT user_status_id, name FROM user_status WHERE is_active = 1 AND deleted_at IS NULL` → trim and
lowercase both sides → compare against the constant `'external'`. **Exactly one** match is required;
zero or more aborts with `deactivationAbortReason = C-4` and the match count in `abortDetail`.

The `is_active` / `deleted_at` predicates are `JS-8`'s fix: the table carries both columns and no
unique index on `name`, so one soft-deleted `External` row would otherwise abort every run forever
with nothing saying why.

> **What C-4 does and does not establish** *(`JS-1`, judge A, suspect-severe — recorded, not
> dismissed)*. It proves a row **named** external exists. It does **not** prove external accounts
> carry that `status_id`: the only in-repo code inserting `sec_users` writes literal `status_id = 1`,
> and the column is `bigint DEFAULT NULL`. **This increment converts that gap from a risk into a
> measurement** — if `excludedExternal` reports 0 against known externals, EX-1 discriminates nothing,
> and we learn it before any row is written. That is the single most valuable number this increment
> produces, and increment 2 must not be designed until it is read.

### 5.6 Failure surface

There is no transaction to roll back. The pass is wrapped so it **never throws**: the controller does
not `await` it and the process has no `unhandledRejection` handler, so an escaping rejection
terminates it (`W-5`, pre-existing). Failures become a `deactivationAbortReason` plus a logged summary.

---

## 6–8. Frontend / Integration / Security

Frontend: none. Integration: AGRESSO read-only, one fewer HTTP request on ~half of runs (`DD-D2`);
nothing else touched. Security: trigger unchanged (`SYSTEM_ADMIN`); the pass grants and withdraws
nothing; all SQL parameterised with the sibling's `assertNumericIds` guard on id arrays.

---

## 9. Observability

| Level | Line |
| --- | --- |
| `error` | Every abort, with `deactivationAbortReason` and `abortDetail` |
| `warn` | Each exclusion and shield, with account id and rule |
| `log` | One structured summary line on both paths |

`deactivationAbortReason` is a **separate field** from the sibling's `abortReason` *(`JS-4`)* — one
field cannot carry two independent outcomes, and a sibling savepoint rollback would otherwise read as
an aborted measurement.

---

## 10. Testing strategy

| Tier | Command | Covers |
| --- | --- | --- |
| Unit | `npm test -- --silent` | Shields (incl. the padded-email input), all four exclusions, all three preconditions, candidate set, chunking, summary shape |
| Fixture | `npm run test:fixtures` | **Zero row deltas across all three tables** after a full run, `user_status` resolution, driver-type coercion |
| Human | Read the report against Dev | The actual population — this increment's purpose |

Every precondition test must be **observed red before it is trusted** (`K-004`). `npm test` has
`rootDir: src` and **never** runs `test/fixtures/`, so no `npm test` result is evidence for a
database-state claim (`KZ-017`).

> **The belt-and-braces caveat does not apply here** *(`JG-2`)*: with no write statements there is no
> SQL predicate shadowed by an in-memory filter. The one shadowing risk left is EX-2's `role_id = 1`,
> pinned in SQL and in memory — falsify the SQL side at the fixture tier.

---

## 11. Rollout

| Step | Action |
| --- | --- |
| 1 | Merge. **No migration to apply** — `K-015`'s hazard does not exist for this increment |
| 2 | Trigger `GET /api/agresso/staff/clone/execute` against Dev as `SYSTEM_ADMIN` |
| 3 | Read the report. The four numbers that matter: `deactivationCandidates`, `activePopulation`, `excludedExternal`, `distinctCarnets` vs `totalElements` |
| 4 | **Decide increment 2's design against those numbers**, not against the assumptions it currently carries |

**Backout:** revert the code. Nothing was written, so there is nothing to undo.

**Comms:** platform administrators — the endpoint's response body changes and the run takes marginally longer.

---

## 12. Design decisions log

| # | Decision | Rationale | Rejected |
| --- | --- | --- | --- |
| **DD-D1** | A separate read-only service + repository | Makes the no-write invariant structural: one file is the whole audit surface, and it contains no write verb | Fold into the 642-LOC reconciler |
| **DD-D2** | `findNumberOfPages` → `Math.ceil(total/pageSize)` | `round + remainder` overcounts by one whenever `total % 1000 >= 500`, producing a legitimately empty trailing page on ~half of totals. Independently re-verified by judge A | Tolerate a trailing empty page — encodes a bug as a rule |
| **DD-D3** | C-2 = distinct carnets **and** non-final empty page | Corrects `JD-1`/`JD-2`/`JS-5`. Distinctness is the property; the row count was never a proxy for it | Row count with a tolerance — reopened `S-1` and licensed 5 wrong retirements/run |
| **DD-D4** | Reuse the reconciler's snapshot | NFR-AGD-001; removes a TOCTOU window | A second read — two truths |
| **DD-D5** | One shared `normalizeEmail`, and an **explicit shield predicate beside it** | Corrects `JD-3`. The util alone is not enough — the bug was the *predicate*, not a duplicated function. Both live in one file so the pairing is visible | Reuse `isUsableEmail` — measures a different string than the key |
| **DD-D6** | EX-1 by name, C-4 aborts unless exactly one active non-deleted row matches | `user_status` has no seed, migration or enum; the literal `4` was never verifiable. `JS-8`'s predicates included | Hard-code `status_id = 4` |
| **DD-D7** | **No config, no migration, no ceiling** | Nothing to gate without writes. Deletes `F-2`, `JD-5`, `JD-6` and `K-015` from this increment at zero cost | Seed the keys now — carries `Scope.REQUEST` and an unapplied-migration hazard for no benefit |
| **DD-D8** | `deactivationAbortReason` separate from the sibling's `abortReason` | `JS-4` — one field, two independent outcomes |  Reuse the field |

---

## 13. Step 2.3 — reversion challenge

| DD | Takes away | *What does removing this break?* | Outcome |
| --- | --- | --- | --- |
| **DD-D2** | The `round + remainder` page count, shipped | The extra page is always last and always empty, so `base()` maps and writes nothing from it. `ceil(n) <= round(n)+1` for all `n >= 0`, so the fix never requests **fewer** pages than needed — a property of the arithmetic, not of the data. Only observable differences: one fewer HTTP request, one fewer log line | **Safe — adopt.** Its existing test is updated, and that update is the falsifier |

Checked and **not** reversions: exposing the snapshot (additive), extracting `normalizeEmail` (a move
with the original delegating). **Deliberately unchanged:** the controller's fire-and-forget call.

---

## 14. Budget

| Metric | Expected |
| --- | --- |
| Tasks | **5** |
| LOC | **~850** (≈ 300 implementation, ≈ 550 tests) |
| Review rounds | **2** |

**Basis, falsifiable.** The sibling shipped ~1,216 implementation lines against ~2,279 test lines in
this directory — a **1.9× test ratio**, measured on disk rather than from a diff summary. This
increment's implementation surface is roughly a quarter of the sibling's (one read repository, one
service, no transaction, no migration, no write path), and the ratio is applied to that: 300 × 1.9 ≈
570. Rounds at 2 rather than the destructive half's 6 because **nothing it can get wrong is
irreversible** — the failure mode is a wrong report a human reads.

*(Corrects `JG-1`: the previous budget claimed to carry a 2.3× ratio and then stated 1.93×, and
compared a from-scratch estimate against a diff-derived figure.)*

**Against the declared depth:** 5 tasks / ~850 LOC is **Standard**, and the document is written at
that depth. Under the ~400-LOC single-PR guidance this is two PRs — see `tasks.md`.

---

## 15. Open questions

| # | Question | Status |
| --- | --- | --- |
| OQ-1 | Does `user_status` identify externals, and do external accounts carry that id? | **Answered by running this increment** (`JS-1`, §5.5) |
| OQ-2 | Increment 2's ceiling values | Decided from this increment's output |
| OQ-3 | **When does increment 2 ship?** | **Needs a date before this increment ships** (requirements `RSK-1`) |

---

## 16. References

- [`./requirements.md`](./requirements.md) · [`./judgment.md`](./judgment.md) · [`./proposal.md`](./proposal.md) · [`./judgment-inherited.md`](./judgment-inherited.md)
- Full-scope drafts preserved for increment 2: `.increment2-carryover-{requirements,design}.md.bak`
- Archived sibling: [`docs/specs/archive/2026-09-15-changes--agresso-staff-sec-users-sync/`](../../archive/2026-09-15-changes--agresso-staff-sec-users-sync/)
- In-repo precedents: `mapping-phase.resolver.ts:11-15` (singleton config, REQUEST-scope prohibition), `sec-user-reconciler.repository.ts` (chunking, coercion, `assertNumericIds`)

---

# PART II — Increment 2: The Write

> **Added 2026-09-25.** Part I above describes the shipped measurement increment and is unchanged.
> Sections here are numbered from **§17** and cover only what increment 2 adds.

---

## 17. Scope correction — the draft was sized against an empty tree

`.increment2-carryover-design.md.bak` §2.1 lists nine files, five of them "new". **It was written
before increment 1 existed.** Measured against the tree today:

| Draft said | Reality | Increment 2's actual work |
| --- | --- | --- |
| `sec-user-deactivation.service.ts` — **new** | **Exists**, shipped, green | Add write orchestration, dry-run, C-3 |
| `sec-user-deactivation.repository.ts` — **new** | **Exists**, read-only by design | Add the three destructive statements |
| `email-key.util.ts` — **new** | **Exists** (`normalizeEmail`, `shieldKeyFor`) | Untouched |
| `sec-user-reconciler.service.ts` — modified | **Already modified** | Untouched |
| `agresso-staff-tools.service.ts` — modified | **Already modified** (page fix, `FetchReport`, stage 5) | Summary wiring only |
| summary DTO — modified | **Already modified** | Add six write/ceiling fields |
| module — modified | **Already modified** | Untouched |
| `dto/deactivation-config.dto.ts` — new | absent | **Genuinely new** |
| seed migration — new | absent | **Genuinely new** |

**The candidate set, the shield set, all four exclusions, C-1/C-2/C-4 and the summary are shipped
and were exercised against real data on 2026-09-25.** Increment 2 adds the write and the two
controls that gate it — nothing else.

> `HANDOFF.md` §4d warned that increment 1 overran because it was sized as a *fraction of the
> sibling* rather than by counting what it is. This section is that warning applied in the opposite
> direction: the draft's ~2,200 LOC counted work that has already shipped. §24 re-budgets by
> counting.

---

## 18. Architecture — what changes

```
cloneAllAgressoStaff()
  1–4  unchanged (fetch, reconcile, create/grant)
  5.   deactivation.measure(...)      ── SHIPPED: candidates, shields, exclusions, C-1/C-2/C-4
  5b.  deactivation.apply(...)        ── NEW: config resolve → C-3 → dry-run gate → transaction
  6.   buildSummary(...)              ── extended with six fields
```

`measure()` keeps its signature and its read-only guarantee. `apply()` is a new method that
**consumes** a measurement rather than recomputing one, so within **one invocation** the reported set
and the written set are the same object.

> ⚠️ **That guarantee stops at the invocation boundary (`JR2-2`, Judgment Day round 1).** An earlier
> draft claimed "the dry run a human reads is the same set the live run retires". **It is not.** A
> dry run returns before writing; the live run is a *later* invocation that re-fetches Agresso and
> re-reads `sec_users`, so it computes its own set. Nothing persists the approved set, hashes it, or
> compares the two. See §19.4 for what bounds the divergence and what does not.

### 18.1 Why `apply()` is separate from `measure()`

**DD-D10.** A single method carrying a `dryRun` flag makes the read-only guarantee a matter of
branch coverage. Splitting them makes it structural: `measure()` contains no write statement at all,
so the assertion "a dry run cannot write" is provable by reading one method rather than by
exercising every path through two.

---

## 19. The write transaction (R-AGD-008)

One `dataSource.transaction(async (manager) => …)`, chunked at the module's existing `CHUNK = 50`,
ids sorted ascending in every chunk of every table.

| Order | Statement | Via |
| --- | --- | --- |
| 1 | `app_secrets … WHERE responsible_user_id IN (…) AND is_active = 1` | `manager.getRepository(AppSecret)` |
| 2 | `sec_user_roles … WHERE user_id IN (…) AND is_active = 1` | `manager.query` |
| 3 | `sec_users … WHERE sec_user_id IN (…) AND is_active = 1` | `manager.query` |

> **What the order does and does not buy (`JR2-3`, Judgment Day round 1).** An earlier draft framed
> the order as what stops a failure leaving the account off with a live credential behind it. **That
> is false.** One transaction with no inner `catch` (§19.1) rolls the whole thing back, so
> **atomicity comes from the transaction boundary and the order contributes nothing to it.** The
> order earns its place for exactly one reason: **a consistent lock sequence** (§19.2). Recorded
> because the wrong justification invites an implementer either to "optimise" the order away or to
> weaken the boundary believing the order is the real guard.

**Every statement carries `AND is_active = 1`.** A row switched off by any other path between the
snapshot and the write is then a no-op rather than a double write, and the reported counts stay
truthful (R-AGD-008 AC.4).

**`AppSecretRepository` is never injected** — verified at `app-secret.repository.ts`: it calls
`super(AppSecret, entityManager)` with the injected root `EntityManager`, so it **structurally
cannot join the transaction** (`J-6`), and it injects `CurrentUserUtil`, which is `Scope.REQUEST`
(`W-10`). The in-repo precedent for the correct form is `app-secrets.service.ts:44-59`, which uses
`manager.getRepository(...)` for both of its writes inside a transaction.

### 19.1 No `catch` inside the callback (DD-D11, closes `JS-2`)

**The callback contains no `try`/`catch` and returns a plain value.** Error handling lives at the
call site, outside `dataSource.transaction(...)`.

This is not a style preference. A `catch` inside the callback swallows the rejection, the
transaction commits, and the chunks that already succeeded are persisted — the exact opposite of
what R-AGD-008 AC.2 promises. **The sibling's shipped `applyCreateAndGrant` returns its summary from
inside its own callback** (`sec-user-reconciler.service.ts`), so that is the shape an implementer
reading the neighbouring file will copy. The rule is stated here, given its own AC, and given a
falsifier.

### 19.4 The approved set and the written set are different objects (`JR2-2`)

**The gap, stated plainly.** Rollout §25 reads a dry run at step 4, disables dry-run at step 5 and
triggers the live run at step 6. Step 6 re-fetches. A person who joins, leaves, or changes Agresso
status between step 4 and step 6 changes the set, and **no human approved the difference**.

**What bounds it, and what does not:**

| Control | Bounds | Does NOT bound |
| --- | --- | --- |
| `C-1` / `C-2` | A failed or empty fetch — the largest source of divergence | A genuine staff change |
| `C-3` | A set that grows past the ceiling | A set that changes *composition* at constant size |
| Operator sequence | Steps 5→6 are consecutive, so the window is minutes, not days | Nothing structurally; it is discipline |

**Decision — DD-D15: the divergence is accepted, bounded and made reconstructible; it is not
prevented.** Persisting an approved set and gating the write on equality would be a new mechanism —
storage, a staleness policy, and a failure mode of its own — for a run that is manual, infrequent and
`SYSTEM_ADMIN`-only. Rejected as disproportionate.

**What this buys instead, and it is not nothing:** the live run logs its **full** candidate id list
(`R-AGD-013`, already implemented in the measurement path). The dry run logs its list too. **The two
logs make the delta reconstructible after the fact** — which is weaker than preventing it, and is
stated as such rather than dressed up.

> **The residual risk is real and is owned by the rollout, not by the code:** re-read the dry run
> **immediately** before step 6, and treat any change in `deactivationCandidates` between the two as
> a stop condition. A count match is not a set match — two people can swap — but a count *mismatch*
> is a cheap, certain signal that the approved set is stale.

---

### 19.2 Lock ordering — stated limits, not a closed finding (NFR-AGD-006, carries `JD-8`)

Verified against the tree at the time of writing:

| Claim | Evidence | Consequence |
| --- | --- | --- |
| The sibling writes `sec_users` **before** `sec_user_roles` | `sec-user-reconciler.service.ts` — `reactivateSecUsers` then `reactivateContributorRoles`/`grantContributorRoles` | Increment 2's order is **inverted** relative to it. Two concurrent runs can deadlock |
| The trigger has **no in-flight guard** | `agresso-staff-tools.controller.ts` — one `@Get('clone/execute')`, fire-and-forget, no lock | Concurrency is reachable, not theoretical |
| `app_secrets` has **no index** on `responsible_user_id` | baseline schema: `PRIMARY KEY (app_secret_id)` only | Sorting ids has **no effect** on statement 1 |

> ⚠️ **`JD-8` is NOT discharged by this section, and both round-1 judges said so (`JR2-7`).** What
> follows is an *acceptance*, not a control: the stated test asserts statement order and sorted
> chunks, and **neither prevents two runs overlapping nor resolves the cross-table deadlock**. An
> in-flight guard is the fix; it is deferred to its own spec rather than half-built here. The
> deadlock stays reachable, its owner is the platform admin, and nothing in this spec will detect it.

**These are carried as accepted risk with their mitigation named, not claimed closed.** Id sorting
addresses the within-table dimension, which was already safe. The cross-table dimension is mitigated
by operational discipline — the run is manual, infrequent and SYSTEM_ADMIN-only — not by code.

**No isolation level and no lock timeout are set** (`W-9`). Re-verified 2026-09-25: **25**
`.transaction(` sites in `src/`, **zero** setting an isolation level. *(The draft said 22 — the count
drifted with the `staging` merge. The single grep hit for `REPEATABLE READ` is a **comment** in
`sec-user-reconciler.repository.ts` describing InnoDB's default, not a level being set.)* Introducing
one here would invent a convention inside a destructive spec.

### 19.3 Audit columns — what is achievable (NFR-AGD-007, closes `JD-9`)

**DD-D12.** `updated_at` is `ON UPDATE CURRENT_TIMESTAMP` on all three tables, so it moves whatever
the code does — asserting it proves the engine works, not that this pass wrote it. `updated_by` has
**no actor**: the run is fire-and-forget and `CurrentUserUtil` is forbidden here (`NFR-AGD-005`).

**Decision: `updated_by` is left NULL and that is recorded, rather than inventing a system actor id.**
A fabricated id would have to exist in `sec_users` and would then itself be a candidate for
deactivation. The provenance of a run lives in the logged summary (`NFR-AGD-002`), which carries the
ids, the counts and the mode — strictly more than an audit column would.

---

## 20. Dry-run and the ceiling (R-AGD-009, R-AGD-010)

### 20.1 Gate order

```
resolve config  →  C-3 evaluate  →  dryRun?  →  yes: report and RETURN (no transaction)
                                             →  no:  C-3 breached? → abort
                                                                   → else: transaction
```

C-3 is **evaluated** before the dry-run branch and **enforced** after it. That is what lets a dry run
report `ceilingBreached = true` over the full set while a live run on the same input aborts
(R-AGD-010 AC.1/AC.2).

**In dry-run no transaction is opened — not one that rolls back.** DD-D10's split is what makes this
assertable on the `DataSource` itself rather than inferred from a zero row-delta, which is the
weaker claim a `transaction`-then-rollback design would force.

### 20.2 The measured first run

`max(0.05 × 1985, 10)` = **99.25** against **146** candidates = 7.36%. The first live run aborts on
C-3 by construction.

> **Corrected 2026-09-28.** This read `= **99**` in four documents and five places. The formula in
> `R-AGD-010` carries **no rounding operator**, and `T-09` implements it verbatim: `apply()` computes
> and **reports** `99.25`. The gate's behaviour is identical either way — a candidate set is an
> integer, and `146` exceeds both — but the **reported `ceiling` field** is `99.25`, and a reader who
> trusted the old figure would infer a `Math.floor` that does not exist. Adding one would introduce
> an operation the requirement never specifies (`T-09` Reviewer ruling). **This section is the
> figure's one home** (`KZ-005`); every other site now points here rather than restating it. `design.md` §11's rollout handles this with an explicit raise-then-restore pair; the
restore is a numbered step, not a reminder, because `F-5` recorded the opposite and a forgotten
restore disables the only volume defence invisibly and indefinitely.

---

## 21. Configuration (R-AGD-011, R-AGD-012)

Four keys added to `AppConfigKey` and seeded by one data-only migration following
`1786738949211-seedClarisaMappingPhase.ts` in shape.

| Key | Seed | Failure |
| --- | --- | --- |
| `ARI_STAFF_DEACTIVATION_DRY_RUN` | `'true'` | → `true` (safe) |
| `ARI_STAFF_DEACTIVATION_CEILING_FRACTION` | `'0.05'` | → abort C-3 (loud) |
| `ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR` | `'10'` | → abort C-3 (loud) |
| `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID` | `'4'` | → abort C-4 (loud) |

**Read via `dataSource.getRepository(AppConfig)`. `AppConfigService` is never injected** — verified
at `app-config.service.ts`, which takes `CurrentUserUtil` in its constructor. The prohibition is
already written into this repository at `mapping-phase.resolver.ts`, in the comment block headed
*"SINGLETON-SCOPED BY DESIGN"*; that file is also the shape to copy — `DataSource` and nothing else.
*(The draft cited `mapping-phase.resolver.ts:11-15`; the block is at `:8-16` today. Cited by anchor
per `FP-50`, since the file is outside this spec's change surface but not pinned by it.)*

**No cache.** `K-016`'s 5-minute TTL lives in config *consumers*, not in `AppConfigService`.

### 21.1 The external status: id, not name (DD-D13, R-AGD-012)

**This reverses a decision increment 1 shipped, and the reversal is challenged in §23.**

`W-1` replaced the literal `4` with a name lookup for `'external'` because the literal was
unverifiable. The live row is named **`External Accepted`**, so C-4 matched nothing and the pass
aborted on its first run. **The id is the selector; the name participates in no comparison** and is
logged only so a human can see which row was locked onto.

The `C-4` abort is retained for the absent-row case, so an environment numbering `user_status`
differently refuses to run rather than shielding the wrong cohort.

---

## 22. Premise Ledger

**Count:** 12 rows — **11 verified**, **1 `UNVERIFIED`** (Impact: High). *(P-10 and P-11 added 2026-09-25 from Judgment Day round 1 — `JR2-9` and `JR2-2` each found a premise the design depended on with no row. **P-12 added at the `/akili-specify` verification checklist**: the trigger line declared `consumer` fired and no row carried that class — the defect the judges' own rules score as severe, caught by the checklist rather than by a judge.)*
**Blast-radius triggers:** `live-path` fires (the design names a user action and a branch point);
`shared-state` fires (the write changes `is_active`, read by auth and by the sibling);
`consumer` fires (the summary DTO gains fields).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | `AppSecretRepository` binds to the injected root `EntityManager` and cannot join a transaction | `existence` | `app-secret.repository.ts` — `super(AppSecret, entityManager)` with `private readonly entityManager: EntityManager` | `7931f03c` | §19's `manager.getRepository` mandate is unnecessary; `J-6`/`W-10` dissolve. Impact **Low** — the mandated form is correct either way | — |
| P-2 | `AppSecretRepository` also injects `CurrentUserUtil` (`Scope.REQUEST`) | `existence` | same file, constructor param 3 | `7931f03c` | `W-10` dissolves. Impact **Low** | — |
| P-3 | The in-repo precedent for a transactional `app_secrets` write is `manager.getRepository(...)` | `location` | `app-secrets.service.ts:44-59` — `manager.getRepository(this.mainRepo.target)` ×2 and `manager.getRepository(AppSecretHostList)` | `7931f03c` | §19 invents a form instead of following one. Impact **Low** | — |
| P-4 | `AppConfigService` injects `CurrentUserUtil` and must not enter this path | `other` | `app-config.service.ts:23` — `private readonly currentUserUtil: CurrentUserUtil` | `7931f03c` | §21's prohibition is unnecessary. Impact **Low** | — |
| P-5 | The REQUEST-scope prohibition is already written in this repo, with the singleton shape to copy | `location` | `mapping-phase.resolver.ts`, comment block *"SINGLETON-SCOPED BY DESIGN"* (`:8-16`) | `7931f03c` | §21 states a rule with no precedent. Impact **Low** | — |
| P-6 | The sibling writes `sec_users` **before** `sec_user_roles`, so increment 2's order is inverted | `shared-state` | `sec-user-reconciler.service.ts` — `reactivateSecUsers` (`:285`) precedes `reactivateContributorRoles` (`:288`) and `grantContributorRoles` (`:293`, `:320`); no `app_secrets` write anywhere in the file | `7931f03c` | `JD-8`'s deadlock hazard dissolves and §19.2 overstates the risk. Impact **Low** — the mitigation is operational either way | — |
| P-7 | No transaction site in `src/` sets an isolation level or a lock timeout | `data-env` | `grep -rn '\.transaction(' --include='*.ts' src` → **25** hits (non-spec); `grep -rniE 'READ COMMITTED\|REPEATABLE READ\|SERIALIZABLE\|isolationLevel'` → **1** hit, a **comment** in `sec-user-reconciler.repository.ts:54`; lock-timeout grep → **0** | `7931f03c` | `W-9`'s "no precedent" argument fails and setting one here becomes defensible. Impact **Low**. *(Count corrected from the draft's 22 → 25)* | — |
| P-8 | `1786738949211-seedClarisaMappingPhase.ts` exists as the `app_config` seed-migration pattern | `existence` | `ls src/db/migrations/ \| grep seedClarisaMappingPhase` → 1 hit | `7931f03c` | §21's migration has no pattern to follow. Impact **Low** | — |
| P-9 | **The eight accounts of `DO-1` are the complete set of legitimate non-payroll users** | `data-env` | `UNVERIFIED — confirm at source before relying on it` | — | **Any legitimate account outside the eight is retired on the first live run.** The 22-account `2026-08-24` block contains **17** further `@cgiar.org`, carnet-less accounts (22 minus the 5 of `DO-1` that fall inside it) whose provenance is unconfirmed. Impact **High** | BI verification of the `2026-08-24` block; owner: the platform admin, at the rollout HITL pause before dry-run is disabled |

| P-10 | The sibling's `applyCreateAndGrant` **returns its summary from inside its own transaction callback**, so that is the shape an implementer reading the neighbouring file copies | `location` | `sec-user-reconciler.service.ts:325` — `return {` inside `this.dataSource.transaction(async (manager) => {` | `7931f03c` | `DD-D11`'s justification loses its in-repo precedent and the no-`catch` rule reads as arbitrary style. Impact **Low** — the rule stands on its own mechanics | — |
| P-11 | **A dry run and the live run that follows it are separate invocations, each computing its own candidate set** | `live-path` | `agresso-staff-tools.service.ts:84` `cloneAllAgressoStaff()` re-fetches every page and re-runs `reconcile()` per invocation; `measure()` is called at `:141` with that invocation's own snapshot. No persistence of a prior set exists anywhere in the module | `7931f03c` | §19.4 and `DD-D15` are unnecessary and the original "same set" claim would have held. Impact **High** — it is the premise that makes the approval gap real | — |

| P-12 | **Every reader of `SecUserReconciliationSummaryDto`'s deactivation fields is inside this module** — no other app, report or suite consumes them | `consumer` | `grep -rln "deactivationCandidates\|activePopulation\|deactivationDryRun\|excludedExternal" --include="*.ts" src test` from `server/researchindicators` → **6 files**: `sec-user-deactivation.service.ts`, `agresso-staff-tools.service.ts`, the DTO itself, and **3 specs** (`sec-user-reconciler.service.spec.ts`, `sec-user-deactivation.service.spec.ts`, `agresso-staff-tools.service.spec.ts`). `grep -rln SecUserReconciliationSummaryDto` → 2 files, both in-module. **No hit in `test/` at any tier** — no e2e, integration or fixture suite pins this shape | `f5e72722` | `T-10` adds six fields to a DTO something outside the module reads, and the additive change is not additive. Impact **Low** — the sweep returned no external reader, and the three in-module specs are already named in `T-10`'s `Consumers` | — |

> **P-9 is the row that matters.** Every other premise is about code and is cheap to re-check. P-9 is
> about *people*, cannot be settled by any command in this repository (`D-15`), and its falsity is
> not recoverable by a rollback — `app_secrets` is never re-armed by any automatic path.

---

## 23. Step 2.3 — reversion challenge

**DD-D13 reverts behavior increment 1 shipped** (name lookup → id lookup), so it is challenged.

**Question: what does removing the name match break?**

| Answer | Disposition |
| --- | --- |
| Nothing functional — the name matched **nothing** on the live table, which is why C-4 aborted | No action |
| A reader loses the ability to see *which row* was selected, and why | **Addressed:** the resolved row's name is logged (R-AGD-012); selection ignores it |
| A renumbered `user_status` in another environment now selects silently wrong instead of aborting loudly | **Partially addressed:** C-4 still aborts when the id resolves to no row. It does **not** detect an id that resolves to the *wrong* row. Recorded as the accepted cost of the user's stability ruling, not hidden |

No concrete breakage the design fails to address. Proceeding.

---

## 24. Budget — re-counted, not scaled

| Metric | Draft (`.bak`) | **Increment 2, counted** | Why |
| --- | --- | --- | --- |
| Tasks | 10 | **6** | The candidate set, shields, 4 exclusions, C-1/C-2/C-4 and the summary are shipped (§17) |
| LOC | ~2,200 | **~1,150** (≈400 impl, ≈750 tests) | Implementation is three statements, one orchestrator method, one config resolver, one migration |
| Review rounds | 6 | **6** | **Unchanged** — the destructive branch drew every severe finding across three adversarial passes and two judges. Rounds track risk, not volume |

**Basis, stated so it can be falsified.** Increment 1 shipped **1,657 LOC across 5 tasks** with a
test-to-implementation ratio of roughly 1.5×. Increment 2's implementation surface is three `UPDATE`
statements, an orchestrator with two gates, a four-key config resolver and one data-only migration —
smaller than increment 1's four exclusion rules and three preconditions, each with its counter and
precedence. The test tier carries increment 1's *measured* 1.5× ratio, raised for the
one-falsifier-per-table requirement (`JG-2`) and the per-key config assertions.

**Against the declared depth:** 6 tasks / ~1,150 LOC / 6 rounds remains **Full** — depth here is
driven by irreversibility, not size. Confirmed, not revised.

> ⚠️ **The budget tripwire fired on increment 1 at +95%.** Its stated cause was sizing by fraction
> instead of by count. This budget is counted; if it trips anyway, the Leader escalates rather than
> absorbing, and the cause is recorded against this basis.

### 24.1 Re-baselined 2026-09-28 — the tripwire fired again, and the cause is NOT the ratio

**Measured at the T-07 continue gate, with 3 of 6 tasks closed** (`git diff --numstat de338e97~1 HEAD
-- server/researchindicators/{src,test}`, splitting `*spec.ts` from the rest):

| Metric | Budgeted, **all six tasks** | Actual, **three tasks** | Verdict |
| --- | --- | --- | --- |
| Implementation | ~400 | **381** | 95% of the whole budget, spent on half the tasks |
| Tests | ~750 | **700** | 93% of the whole budget |
| Test : impl ratio | 1.9× | **1.8×** | **The ratio was right** |
| Tasks | 6 | 3 | — |
| Review rounds | 6 | **3** | On track; **zero rework** — every task passed first attempt |

**The estimate was not wrong in shape. It was wrong in coverage, and that is a different defect.**
§24's basis enumerated *"three `UPDATE` statements, an orchestrator with two gates, a four-key config
resolver and one data-only migration"* and priced the lot at ~400 implementation lines. Three of those
four items are now built and cost **381** — and **the orchestrator, the single largest item on that
list, has not been started.** Neither has T-10's reporting nor T-11's fixture tier, which is `L`.

So the failure mode differs from increment 1's. Increment 1 sized by **scaling a sibling** and the
*ratio* survived while the *base* collapsed. Increment 2 counted its rules honestly and the ratio
survived again — but the count **priced a four-item enumeration as though the largest item were free.**
Projection for the remaining three tasks: T-09 ≈ 250–350, T-10 ≈ 100, T-11 ≈ 300–400, for a total
near **1,750–1,950 — a 50–70% overrun.**

**Part of the delta is authorised scope, and must not be laundered into the estimate's defence.**
T-07's C-4 wiring was added mid-flight by user ruling on 2026-09-28 and was never in the original
count. It explains a slice of T-07's 654 lines. It does not explain the rest.

**Escalated to the user at the T-07 continue gate, per the warning directly above, and the user
elected to continue with the budget re-baselined rather than to stop or descope.** The overrun is one
of **volume, not of defects**: three tasks, three first-attempt PASSes, no rework rounds consumed.

**The lesson for the next estimate** — and the one worth carrying upstream — is that a counted basis
must price **each enumerated item**, not the enumeration. Both increments produced a correct test
ratio and a wrong total, by two different routes; the ratio is evidently the easy half.

---

## 25. Rollout — increment 2

| Step | Action | Restores |
| --- | --- | --- |
| 1 | Merge. **The migration is not applied by the pipeline** (`K-015`) — applying it is a separate human step | — |
| 2 | Apply the migration. The pass is present and **inert** (`dryRun = true`) | — |
| 3 | **Apply `DO-1`** — mark the eight accounts `status_id = 4`. Verify by query: the `UPDATE` must report exactly 8 rows | — |
| 4 | Trigger the sync. Read the dry-run summary. **`excludedExternal` must now be 8, not 0** — that is the check that `DO-1` took effect | — |
| 5 | If the set is correct, set `ARI_STAFF_DEACTIVATION_DRY_RUN = 'false'` | **Step 7** |
| 6 | Trigger. C-3 aborts legitimately at 146 > 99 → raise `CEILING_FRACTION` **for this run only** | **Step 7** |
| 7 | **Restore `DRY_RUN = 'true'` and the original ceiling.** Both explicit steps, not reminders | — |

> **Step 4 is the gate that `D-15` has no automated substitute for.** `excludedExternal` moving from
> 0 to 8 is the only evidence available anywhere that `EX-1` is live. A live run with that field
> still reading 0 retires all eight.

**Backout:** revert the code; the migration's `down()` deletes the four keys. **Rows already written
`is_active = 0` are not reverted by a code rollback** — recovery is the sibling's reactivation for
returning staff, and a manual `UPDATE` otherwise. **`app_secrets` is never re-armed by any automatic
path** — the deliberate asymmetry.

**Comms:** platform administrators before step 5; the security owner, because machine credentials
will be disabled.

---

## 26. Design decisions — increment 2

| # | Decision | Alternative rejected |
| --- | --- | --- |
| DD-D10 | `apply()` is a separate method from `measure()` | One method with a `dryRun` flag — makes the read-only guarantee a matter of branch coverage rather than structure |
| DD-D11 | No `try`/`catch` inside the transaction callback | Catching and reporting inside — commits partial chunks (`JS-2`), and is the shape the sibling's shipped code invites |
| DD-D12 | `updated_by` left NULL, recorded | A synthetic system actor id — it would need a `sec_users` row, which would itself become a deactivation candidate |
| DD-D13 | External status selected by id | Name matching — shipped, and aborted on its first real run (`W-1`'s correct reasoning, wrong value) |
| DD-D14 | Every write carries `AND is_active = 1` | Writing unconditionally over the snapshot — inflates counts and double-writes rows another path already retired |
| DD-D15 | The dry-run/live-run divergence is accepted, bounded and made reconstructible from the two logs (§19.4) | Persisting the approved set and gating the write on equality — a new mechanism with its own storage, staleness policy and failure mode, for a manual `SYSTEM_ADMIN`-only run |

---

## 27. Open questions — increment 2

| # | Question | Owner | Status |
| --- | --- | --- | --- |
| OQ-D4 | Are the 17 remaining `2026-08-24` accounts legitimate, or do they retire with the rest? | BI / platform admin | **Open — this is `P-9`.** Not blocking the build; blocking step 5 of rollout |
| OQ-D5 | Of the 163 `UNUSABLE_EMAIL` skips, how many have a null address versus an over-length one? | Platform admin | Open (`RSK-AGD-10`). Only the null half is unshielded |
| OQ-D6 | Should `RSK-6` — `validation()` returning `isValid` with an unresolved user — be fixed now? | Security owner | Open, out of scope. The cascade closes it for retired users only |
