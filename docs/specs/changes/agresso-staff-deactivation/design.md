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
