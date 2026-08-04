# Requirements — results / cross-platform-duplicate-resolution

- **Module:** results
- **Spec id:** 2026-08-cross-platform-duplicate-resolution
- **Status:** draft
- **Owner:** ARI server squad (David Casañas)
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — external result ingestion & result lifecycle
- **Linked tickets:** _pending Jira id_ (user story "There is a risk of storing duplicated information from different systems: PRMS, AICCRA, and TIP")
- **Last updated:** 2026-08-04
- **Extends:** commit `21f61a44` (`refactor(save-result-service)`) — the first, partially-working implementation of these rules
- **Depth:** Full · **Bug Mode:** yes (nine confirmed defects, root causes read from source)

---

## 1. Context

Three reporting platforms — **PRMS**, **TIP**, **AICCRA** — write into the same `results` table, distinguished only by `platform_code`. The same publication can be reported from more than one of them, producing duplicated information. An approved user story defines which platform prevails and states the loser "must not be stored".

That story was implemented in commit `21f61a44` (`duplicate-result-priority.util.ts` + `SaveResultService.duplicateResultValidation`). On review, operators reported that **duplicated rows were still present after a sync run**. Root-cause analysis confirms nine distinct defects (§3.0), the dominant one being that the "deletion" is a *soft* delete that leaves the row — and its `public_link` — in `results`.

A second gap is structural, not a coding defect: **PRMS and TIP have automated sync pipelines that call `SaveResultService`; AICCRA does not.** AICCRA data is loaded by a person running a MySQL script, so no code path ever evaluates the rules with AICCRA as the incoming result. The two rules that require AICCRA to *displace* stored PRMS/TIP rows therefore never execute.

**Explicitly NOT changing:** the STAR authoring lifecycle, `result_status_workflow`, the PRMS/TIP mapper contracts, the OpenSearch indexing pipeline shape, BILATERAL and STAR platform rows (both out of dedup scope), and the AICCRA loader's MySQL-script workflow itself.

---

## 2. Requirement numbering

Requirements use `R-RES-<NNN>` / `NFR-RES-<NNN>`, numbered in dependency order (matching foundation first, then rules, then deletion, then the AICCRA reconciliation surface).

---

## 3. Functional requirements

### 3.0 Defect classes this spec can produce — and the gate for each

This spec **deletes production data**. The defect classes are asymmetric: under-deletion leaves a cosmetic duplicate, over-deletion destroys a record. Gates are sized accordingly.

| # | Defect class | Gate that catches it | Automated? |
| --- | --- | --- | --- |
| DC-1 | **Over-deletion** — a row deleted that the rules never authorized (wrong winner, wrong indicator scope) | `duplicate-result-priority.util.spec.ts` table-driven cases over the full platform × indicator matrix, incl. every AC-negative case | ✅ `npm test -- --silent` |
| DC-2 | **Under-deletion** — duplicate survives the run (year scope, normalization miss, soft-delete) | Regression specs for D1–D4 + D9; post-run verification query must return zero groups classified `RESOLVED` that still have a stored loser. **It must NOT assert "zero unresolved cross-platform groups"** — `CROSS_YEAR_REVIEW` (11 groups today) and `SAME_SYSTEM_IGNORED` are *correct* permanent non-resolutions, so that assertion could only ever fail, and a gate that can only fail is a gate that gets waived | ✅ `npm test`, ⚠️ verification query needs a populated DB |
| DC-3 | **Blocked legitimate sync** — an inactive/deleted row keeps `shouldOmit` true forever | Regression spec: candidate with `is_active = false` MUST NOT block an incoming result | ✅ `npm test` |
| DC-4 | **Referential breakage** — deleting a row a STAR result points at | `StarRelationshipGuard` specs (both link directions × platform of counterpart) + e2e on the `TEST` datasource | ✅ `npm test`, `npm run test:e2e` |
| DC-5 | **Normalization false positive** — two genuinely different publications collapse to one key and one is destroyed | Adversarial table tests on the normalizer **plus** the mandatory **dry-run report reviewed by a human** before any destructive sweep | ⚠️ partially unautomatable → HITL gate (R-RES-008). **Blast radius measured as near-zero — see below.** |
| DC-6 | **Same-system duplicate "corrected"** — explicitly forbidden by the story | Spec asserting a same-`platform_code` candidate is never a duplicate | ✅ `npm test` |
| DC-7 | **Silent no-op** — the sweep reports success while deleting nothing (this is the defect being fixed; the fix must not be able to reintroduce it invisibly) | Every verification MUST assert on **counts**, and a run that finds zero candidates MUST be reported as `INCONCLUSIVE`, never as a pass | ✅ enforced per-task in `tasks.md` |
| DC-8 | **Over-deletion by group composition** — a rule condition satisfied by one row causes a *different* row to be deleted | A **composition** matrix (3+ row groups, multiple rows per platform), not a member matrix — see `design.md` §10 | ✅ `npm test`, but only with the composition matrix; a (platform × indicator) matrix **cannot see this class** |

**DC-5, re-measured (2026-08-04).** Six cumulative normalization levels were run against live dev data (`TRIM` → lowercase → strip scheme → strip `www.` → strip trailing `/` → unify `dx.doi.org`). **All six find the same 116 duplicate groups**, and exactly one normalized key has more than one raw variant. Cross-platform URL variance is therefore not a source of missed duplicates, the persisted normalized column is dropped (`design.md` D-dup-5), and DC-5's residual risk shrinks accordingly. It remains an accepted risk rather than a closed one — the normalization still runs, and future data can carry variance this snapshot does not.

**DC-8 was added after Judgment Day round 1**, where it was found as a severe defect that DC-1's declared gate structurally could not detect.

---

### R-RES-001 — Duplicate matching is normalized, platform-crossing, and live-rows-only

- **As a** MEL data steward
- **I want** duplicate detection to compare the *same publication* even when platforms store its URL differently, and to ignore rows that are already deleted or are historical snapshots
- **So that** real duplicates are found and phantom duplicates are not

**Details:**
- Inputs: incoming `public_link`, `platform_code`, `indicator_id`, `report_year_id`.
- Behavior:
  - Matching key is a **normalized** form of `public_link` only. `external_link` MUST NOT be used — it points at the source platform portal and never matches across platforms.
  - Normalization is applied to **both** sides of the comparison (incoming and stored), not just the incoming value.
  - Normalization SHALL cover, at minimum: trim, lowercase scheme+host, drop `www.`, unify `dx.doi.org`/`doi.org`/`https://doi.org/`, strip a single trailing `/`, strip empty query/fragment. It SHALL NOT strip path case (handles are case-sensitive) and SHALL NOT strip meaningful query parameters.
  - A blank/whitespace-only `public_link` means "no link" → no deduplication.
  - Candidates MUST be restricted to `is_active = true` **and** `is_snapshot = false` **and** `platform_code IN (PRMS, TIP, AICCRA)`.
- Outputs: internal; observable via R-RES-009's report.
- Errors: none new.
- Permissions: n/a (runs inside sync).

**Acceptance criteria:**
- [ ] AC.1 — Two rows whose `public_link` differ only by scheme, `www.`, trailing slash, `dx.doi.org` vs `doi.org`, or surrounding whitespace ARE detected as the same publication.
- [ ] AC.2 — Two rows whose `public_link` differ in path case or in a non-empty query parameter are NOT detected as the same publication.
- [ ] AC.3 — A row with `is_active = false` is never returned as a duplicate candidate.
- [ ] AC.4 — A row with `is_snapshot = true` is never returned as a duplicate candidate.
- [ ] AC.5 — `external_link` equality alone never produces a duplicate.

#### Scenario: A soft-deleted duplicate no longer blocks a legitimate sync (regression, D1+D2)

- GIVEN a PRMS result whose duplicate TIP row was previously resolved and now has `is_active = false`
- WHEN the PRMS sync processes that result again
- THEN the PRMS result is created or updated normally
- AND the inactive TIP row is not reported as a duplicate
- BUT it must NOT be counted toward `shouldOmit`
- AND IT MUST NOT be re-submitted for deletion

#### Scenario: Snapshot rows are invisible to deduplication (regression, D9)

- GIVEN a live TIP result and three of its snapshot versions, all sharing one `public_link`
- WHEN a PRMS result with the same normalized link is synced
- THEN exactly one duplicate participant (the live TIP row) is considered
- BUT it must NOT schedule any snapshot `result_id` for deletion independently of its live row

**Out of scope:** fuzzy/title-similarity matching; matching on DOI extracted from free-text abstracts.

---

### R-RES-002 — Winner selection follows the approved acceptance criteria exactly

- **As a** MEL data steward
- **I want** the prevailing platform decided by the story's rules and nothing broader
- **So that** no result is deleted under a rule nobody approved

**Details:**
- Behavior — priority is evaluated **pairwise over every cross-platform pair in the group**, and a rule applies only to the two rows it actually names. A rule condition satisfied by one row MUST NOT decide the fate of a row that condition never compared.

  | Rule | Applies to the pair | Winner of that pair |
  | --- | --- | --- |
  | Rule 3 (story AC.1) | one side AICCRA + **Capacity Sharing for Development**, other side PRMS/TIP + **Knowledge Product** | the AICCRA row |
  | Rule 1 (story AC.2) | one side TIP, other side not TIP | the TIP row |
  | Rule 2 (story AC.3) | one side AICCRA, other side PRMS | the AICCRA row |
  | — | both sides share one `platform_code` | not comparable — no pair |

- **Consistency gate.** If any row both **wins ≥1 pair and loses ≥1 pair**, the rules contradict each other for this composition: the group SHALL be classified `UNRESOLVED_CONFLICT`, reported in full, with **nothing deleted and no omission recorded**. See **OQ-9** — the contradiction is in the acceptance criteria, not in the implementation.
- A row is a loser **only** if a rule named it as the losing side of a pair it participated in, and only when the group is consistent. A row no rule ever names is untouched.
- Several never-loses rows may survive together. Same-platform survivors are a **same-system duplicate** → those rows untouched (R-RES-005), **but a cross-platform row that lost to every survivor is still deleted** — it loses regardless of which survivor prevails.
- **Rule 3 is scoped to Knowledge Product** on the PRMS/TIP side (OQ-1, closed). Measured: governs 30 of the 116 live groups.

*Rev 1 specified this as group-membership ranks, which let a condition satisfied by one row crown a different one; the pairwise form above replaces it.*

**Acceptance criteria:**
- [ ] AC.1 — TIP prevails over PRMS.
- [ ] AC.2 — TIP prevails over AICCRA when the AICCRA row is not Capacity Sharing.
- [ ] AC.3 — AICCRA prevails over PRMS when no TIP row is in the group.
- [ ] AC.4 — AICCRA Capacity Sharing prevails over a PRMS Knowledge Product.
- [ ] AC.5 — AICCRA Capacity Sharing prevails over a TIP Knowledge Product.
- [ ] AC.6 — AICCRA Capacity Sharing does **not** prevail over a TIP row whose indicator is not Knowledge Product; Rule 1 applies and TIP prevails.
- [ ] AC.7 — Resolution is order-independent: the same group yields the same winner regardless of which member is the "incoming" row.

#### Scenario: Rule 3 stays inside its authorized scope (regression, D5)

- GIVEN a stored TIP result with indicator `INNOVATION_DEV` and an AICCRA `CAPACITY_SHARING_FOR_DEVELOPMENT` result sharing one normalized public link
- WHEN the group is resolved
- THEN the TIP result prevails under Rule 1
- BUT the AICCRA row must NOT be treated as the winner
- AND IT MUST NOT schedule the TIP row for deletion

#### Scenario: Three-way conflict resolves the whole group (regression, D8)

- GIVEN a group containing an AICCRA Capacity Sharing row, a PRMS Knowledge Product row, and an incoming TIP Knowledge Product row, all on one normalized link
- WHEN the group is resolved
- THEN the AICCRA Capacity Sharing row is the single winner
- AND the incoming TIP result is omitted
- AND IT MUST also schedule the stored PRMS row for deletion
- BUT it must NOT leave any non-winning row stored merely because the incoming row lost

---

### R-RES-003 — The non-prevailing result is not stored

- **As a** MEL data steward
- **I want** the losing row to be genuinely absent from `results`, not flagged inactive
- **So that** "the result that does not prevail must not be stored" is verifiable with a plain query

**Details:**
- Behavior:
  - **Incoming loser** → never created or updated (existing `shouldOmit` path). Its family, if a row already exists from a prior run, is submitted for deletion under the same rules.
  - **Stored loser** → deleted via the **hard**-delete path (`full_delete_result_version`), scoped by `QueryService.resolveResultDeleteTargetIds` (live row → whole family incl. snapshots).
  - Deletion is skipped, never partial: a row either passes R-RES-004 and is fully deleted, or it is retained and reported.
  - Before deleting, the row's identifying payload is captured into the audit record of R-RES-009 — hard delete removes the only other trace.
- Outputs: deletion counts in the R-RES-009 report.
- Errors: a failed deletion MUST NOT abort the surrounding sync; it is recorded as `FAILED` for that `result_id` and the run continues.

**Acceptance criteria:**
- [ ] AC.1 — After resolution, `SELECT * FROM results WHERE result_id = <loser>` returns zero rows.
- [ ] AC.2 — Deleting a live loser also removes its snapshot family; deleting a snapshot-only seed removes only that row.
- [ ] AC.3 — Every deletion is preceded by an audit record containing `result_id`, `result_official_code`, `platform_code`, `indicator_id`, `report_year_id`, and the raw + normalized `public_link`.
- [ ] AC.4 — A deletion failure on one row leaves other rows in the run unaffected and is reported.

#### Scenario: The loser is actually gone (regression — the reported failure, D1)

- GIVEN a stored PRMS result that loses to an incoming TIP result on the same normalized public link, with no STAR relationships
- WHEN the sync completes
- THEN the PRMS `result_id` is absent from `results`
- AND the audit record for that deletion exists
- BUT it must NOT be left as an `is_active = false` row
- AND IT MUST NOT retain a `public_link` value that could re-match on a later run

---

### R-RES-004 — Deletion requires the absence of any STAR relationship

- **As a** STAR user
- **I want** an external result I have linked from my own result to survive deduplication
- **So that** my result never loses its evidence or breaks a reference

**Details:**
- Behavior — a candidate loser is **protected from deletion** when any of these holds:
  1. a `link_results` row exists with `other_result_id` = the loser and the counterpart `result_id` belongs to a `STAR` result;
  2. a `link_results` row exists with `result_id` = the loser and the counterpart `other_result_id` belongs to a `STAR` result;
  3. any additional STAR-owned relationship found by the `information_schema` FK inventory in `design.md` §0.3 references it — measured as **38 FKs** to `results`, whose cross-result reference shapes are `link_results` (both directions) and the four cross-result columns of `result_pool_funding_indicator_mapping` (table currently empty).
- Protection MUST be evaluated for **every** `result_id` in the resolved deletion target set, not only the loser's seed id — family expansion adds ids the guard would otherwise never see (`design.md` §5.4).
- Protection is evaluated against **active** link rows only. **Measured exposure:** 19 dedup-scope rows are referenced by a STAR result via `other_result_id`, plus **7 inactive** STAR link rows that a hard delete would destroy — the live delete function clears `link_results` with no `is_active` predicate. Whether to extend protection to inactive links is **OQ-7, and it blocks `apply`**.
- A protected loser is retained, reported, and — critically — **still loses**: the winner is stored normally and the pair is surfaced for manual resolution.
- Permissions: n/a.

**Acceptance criteria:**
- [ ] AC.1 — A loser referenced as `link_results.other_result_id` by a STAR result is NOT deleted and appears in the protected list.
- [ ] AC.2 — A loser referenced as `link_results.result_id` pointing at a STAR result is NOT deleted (this direction is currently unchecked).
- [ ] AC.3 — A loser referenced only by a non-STAR (PRMS/TIP/AICCRA) result IS deleted — a mirror-to-mirror link must not block cleanup.
- [ ] AC.4 — Protection never blocks the winner from being stored.
- [ ] AC.5 — The relationship check runs before every deletion, in both the sync path and the reconciliation sweep.

#### Scenario: A STAR link on either side blocks deletion (regression, D6)

- GIVEN a stored PRMS result that loses to TIP
- AND a `link_results` row where `result_id` is a STAR result and `other_result_id` is the PRMS loser
- WHEN resolution runs
- THEN the PRMS row is retained and listed as protected
- AND a warning is logged with both `result_id` values
- BUT it must NOT be deleted
- AND IT MUST still be reported as the non-prevailing row so a human can resolve it

#### Scenario: A mirror-to-mirror link does not over-protect

- GIVEN a PRMS loser referenced as `other_result_id` by a TIP result (no STAR involvement)
- WHEN resolution runs
- THEN the PRMS row IS deleted
- BUT it must NOT be reported as protected

---

### R-RES-005 — Duplicates inside one platform are never touched

- **As a** platform owner
- **I want** ARI to leave same-system duplicates alone
- **So that** each source system stays authoritative over its own records

**Acceptance criteria:**
- [ ] AC.1 — Two rows with the same `platform_code` and the same normalized link produce no winner, no deletion, and no omission.
- [ ] AC.2 — Such a group is still *reported* (informational) but flagged `SAME_SYSTEM_IGNORED`.

#### Scenario: Same-system duplicates are reported, never corrected

- GIVEN two PRMS results sharing one normalized public link
- WHEN resolution runs
- THEN both rows remain stored
- AND the group appears in the report as `SAME_SYSTEM_IGNORED`
- BUT it must NOT schedule either row for deletion
- AND IT MUST NOT set `shouldOmit` for either row

---

### R-RES-006 — Report-year scope is explicit and conservative

- **As a** MEL data steward
- **I want** automatic deletion confined to duplicates within the same report year, while cross-year duplicates are surfaced for review
- **So that** a publication legitimately re-reported in a later year is never destroyed by an automated run

**Details:**
- The **automatic sync path** matches within the same `report_year_id` (preserving today's conservative scope).
- The **reconciliation sweep** (R-RES-008) additionally detects **cross-year** groups but classifies them `CROSS_YEAR_REVIEW` — reported, never auto-deleted.
- The boundary is a named constant/config, not a literal, so widening it later is a one-line reversible change.

**Acceptance criteria:**
- [ ] AC.1 — A PRMS 2024 row and a TIP 2025 row on one normalized link are NOT auto-deleted by the sync path.
- [ ] AC.2 — The same pair appears in the sweep report as `CROSS_YEAR_REVIEW` with both years shown.
- [ ] AC.3 — Same-year cross-platform groups are resolved and deleted normally.

---

### R-RES-007 — Resolution is idempotent and re-runnable

- **As an** operator
- **I want** a second run to change nothing
- **So that** re-running after a partial failure is safe

**Acceptance criteria:**
- [ ] AC.1 — Running resolution twice over unchanged data produces zero deletions on the second run.
- [ ] AC.2 — A run interrupted mid-way leaves no group half-resolved (the winner is stored before losers are deleted; never the reverse).
- [ ] AC.3 — A group whose only loser is protected reports identically on every run without retrying deletion.

#### Scenario: Winner-first ordering survives interruption

- GIVEN a group where the incoming row is the winner
- WHEN the process is interrupted after the winner is stored but before losers are deleted
- THEN no data is lost
- AND the next run deletes the remaining losers
- BUT it must NOT have deleted any loser before the winner was durably stored

---

### R-RES-008 — AICCRA reconciliation: a rules sweep independent of any sync pipeline

- **As an** ARI administrator
- **I want** to run the same duplicate rules across all stored results on demand, in dry-run first
- **So that** AICCRA data loaded by MySQL script is deduplicated even though AICCRA has no automated sync

**Details:**
- Inputs: **two endpoints**, not one `mode` parameter — `GET …/plan` (dry-run; the only safe default is a separate, non-mutating verb) and `POST …/apply`. Optional filters on both: `report-year`, `platform`, `indicator`, `limit`. Rev 1 specified a single `mode=dry-run|apply` query param; the ACs below are worded against the two-endpoint surface that `design.md` §4 ships.
- Behavior:
  - Scans `results` for normalized-`public_link` groups spanning more than one of PRMS/TIP/AICCRA, restricted to `is_active = true` and `is_snapshot = false`.
  - Applies R-RES-002 group resolution, R-RES-004 protection, R-RES-005/006 classification.
  - `dry-run` performs **zero writes** and returns the full plan.
  - `apply` executes deletions and returns the same shape plus outcomes.
  - `apply` MUST be refused unless a `dry-run` for the same filter ran within a bounded window — the operator confirms a plan, not a promise (see design.md for the confirmation-token mechanism).
  - Runs are recorded in `sync_process_log` and the audit record of R-RES-009.
- Outputs: `ServerResponseDto` wrapping a summary + per-group plan (`groupKey`, `participants`, `winner`, `toDelete`, `protected`, `classification`).
- Errors: `400` invalid filter or `apply` without a valid dry-run token; `401`/`403` per roles; `409` when a sweep is already running.
- Permissions: `@Roles(SecRolesEnum.SYSTEM_ADMIN)` + `RolesGuard`.

**Acceptance criteria:**
- [ ] AC.1 — `GET …/plan` returns a complete plan and mutates nothing (verified by row counts before/after).
- [ ] AC.2 — `POST …/apply` without a matching prior plan, or with an expired digest, returns `400`/`409` and mutates nothing.
- [ ] AC.3 — `POST …/apply` deletes exactly the **fully expanded** deletion set of the confirmed plan — no more. The plan MUST list expanded family ids, not loser seed ids: a digest over seed ids alone would let rows created between plan and apply be deleted without ever appearing in the reviewed artifact, and that artifact is the only gate for DC-5.
- [ ] AC.4 — A non-`SYSTEM_ADMIN` caller receives `403` (denied-role case).
- [ ] AC.5 — A `SYSTEM_ADMIN` caller receives `200` with the envelope's `data` holding the plan (allowed-role case).
- [ ] AC.6 — A concurrent second sweep returns `409`.
- [ ] AC.7 — A sweep that finds zero groups reports `INCONCLUSIVE` with the filter echoed back, never a bare success.
- [ ] AC.8 — An AICCRA Capacity Sharing row loaded outside any sync pipeline causes the PRMS Knowledge Product duplicate to be deleted when the sweep is applied.

#### Scenario: AICCRA data loaded by script is reconciled (closes D7)

- GIVEN an AICCRA Capacity Sharing row inserted directly by the loader script
- AND a stored PRMS Knowledge Product row with the same normalized public link, same report year, no STAR relationships
- WHEN an administrator runs the sweep in `dry-run` and then in `apply`
- THEN the dry-run lists the PRMS row under `toDelete` with the AICCRA row as winner
- AND the apply run removes the PRMS row from `results`
- BUT it must NOT delete anything absent from the confirmed dry-run plan
- AND IT MUST leave the AICCRA row untouched

**Out of scope:** building an automated AICCRA ingestion pipeline; changing the loader script; scheduling the sweep on a cron (deliberately manual — see OQ-2).

---

### R-RES-009 — Every resolution decision is auditable

- **As an** operator asked "did it actually delete the duplicates?"
- **I want** a durable, queryable record of every decision
- **So that** verification does not depend on reading debug logs

**Details:**
- Behavior — one audit record per resolved group, per run, capturing: run id, source (`SYNC_PRMS`/`SYNC_TIP`/`SWEEP`), mode, normalized group key, every participant's identifying payload, the winner, the rule that decided it, deletions attempted/succeeded/failed, protected rows with the blocking relationship, and classification.
- Omitted incoming results MUST be counted — today the `shouldOmit` early return skips the counter entirely, so an omission is invisible in the sync summary.
- Log levels: `warn` for protected rows and failed deletions; `log` for applied deletions; `debug` for no-op groups.

**Acceptance criteria:**
- [ ] AC.1 — Every deletion, omission, and protection produces exactly one traceable record naming the deciding rule.
- [ ] AC.2 — The sync counters distinguish `CREATED`, `UPDATED`, `OMITTED_DUPLICATE`, `ERROR`.
- [ ] AC.3 — An operator can answer "which rows did run X delete, and why" from stored data alone, with no log access.

---

## 4. Non-functional requirements

### NFR-RES-001 — Deletion safety
- **Category:** reliability
- **Target:** zero rows deleted outside a confirmed plan; every hard delete preceded by a durable audit record; `dry-run` provably write-free.
- **How verified:** unit + e2e row-count assertions before/after `dry-run`; code review of the write path.

### NFR-RES-002 — Sweep bounded work
- **Category:** performance
- **Target:** the sweep processes groups in batches and never holds a single transaction across the whole run. **No latency target is set:** `results` holds 14,682 rows, of which 13,438 are in dedup scope — the rev-1 target of "≤ 30 s" was sized for a table two orders of magnitude larger and would have been met by any implementation, making it a gate that cannot fail.
- **How verified:** code review of the batching and transaction boundaries; timed `dry-run` recorded for information, not as a pass/fail threshold.

### NFR-RES-003 — Family deletion is atomic and ordered
- **Category:** reliability
- **Target:** a family's deletion runs in one transaction with snapshots ordered before the live row, so a mid-family failure rolls back rather than leaving orphan snapshots. Orphans are unrecoverable in practice: every participant set filters `is_snapshot = false`, so no later run can see them.
- **How verified:** unit test forcing a failure on the second family member and asserting full rollback. (Replaces rev 1's index/`EXPLAIN` NFR, which is moot without an index.)

### NFR-RES-004 — Observability
- **Category:** observability
- **Target:** one `sync_process_log` entry per sweep run; structured `LoggerUtil` lines for protected/failed rows including both `result_id`s.
- **How verified:** unit tests on the logger calls; manual inspection of one sweep run.

### NFR-RES-005 — Authorization, including an explicit machine-token block
- **Category:** security
- **Target:** the sweep endpoints are reachable only by `SYSTEM_ADMIN`, **and a request authenticated by machine token MUST be rejected with `403` regardless of the token's roles.**
- **Rev 1 stated this target incorrectly** ("not reachable with a machine token unless an explicit `app_secret_host_list` entry exists") and it inverted the mechanism. Measured in `AppSecretsService.validation`: `app_secret_host_list` is an origin allowlist **for the whole token**, and a secret with **zero** host rows skips the origin check entirely. All 4 live `app_secrets` rows have zero host rows, and `app_secret_id 8` resolves to a user holding **`System Admin`**. A machine token that satisfies `@Roles(SYSTEM_ADMIN)` from any origin therefore exists **today**, so the control must be **built**, not assumed.
- **How verified:** allowed-role test, denied-role test, **and a test asserting a machine-token principal receives `403`**. An e2e without a bearer token is necessary but not sufficient — it cannot see this class.
- **Note:** the live exposure is independent of this spec and is tracked as **OQ-8**.

---

## 5. Data requirements

| Concern | Detail |
| --- | --- |
| `results` | **No change.** A persisted normalized-link column and its index were specified in rev 1 and **dropped** after measurement showed zero detection benefit over 14,682 rows (see DC-5 above and `design.md` §0.2, D-dup-5). Normalization is computed symmetrically in the query instead — applied to the stored side and the incoming side alike. |
| Index | **None.** At 14,682 rows a scan is free; the rev-1 performance NFRs were sized for a table two orders of magnitude larger. |
| Audit storage | A new table for R-RES-009 records (`result_duplicate_resolution_log`) — entity extends `AuditableEntity`. |
| `full_delete_result_version` | Redefined to cover the **7** FK-holding tables it omits, plus the cross-result columns of `result_pool_funding_indicator_mapping`. The table list MUST be derived from `information_schema`, never from a TypeORM entity walk — `result_cap_sharing_ip` has no entity, which is why rev 1 missed it. |
| Migrations | Append-only, `npm run migration:generate -- ./src/db/migrations/<camelCaseAction>`. **Two** migrations: the audit table and the delete-function redefinition. |
| OpenSearch | No new searchable field. Hard-deleted results must be removed from the index — path confirmed in design.md §3.4. |

---

## 6. API surface delta

| Method + URL | Roles / Guards | DTO | Response `data` |
| --- | --- | --- | --- |
| `GET /api/v1/results/duplicate-resolution/plan` | `@Roles(SYSTEM_ADMIN)`, `RolesGuard` | query DTO under `entities/results/dto/` | resolution plan (summary + groups) |
| `POST /api/v1/results/duplicate-resolution/apply` | `@Roles(SYSTEM_ADMIN)`, `RolesGuard` | body DTO carrying the dry-run confirmation token | plan + per-row outcomes |

Both REQUIRE `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery`/`@ApiBody`. Envelope is `ServerResponseDto` (implicit). Version stays `/v1` (additive). Exact paths confirmed against `domain/routes/main.routes.ts` in design.md.

---

## 7. Cross-system impact

- **TIP** — `src/domain/tools/tip-integration/tip-integration.service.ts:184` (`bulkSaveAllSections` caller). Behavior change: omissions now counted; deletions now hard.
- **PRMS / OpenSearch** — `src/domain/tools/open-search/prms/prms.opensearch.service.ts:231`. Same. Hard-deleted results must be removed from the OpenSearch index.
- **AICCRA** — no code integration exists (by design). The sweep is the substitute; the loader script's owner must be told to run it after each load.
- **STAR (`client/`)** — no change required. Results disappearing from the API are already handled as absent results, but the protection rule (R-RES-004) is what keeps linked ones visible. No STAR spec needed.
- **Socket.IO** — no new events.

---

## 8. Assumptions, dependencies, risks

**Assumptions**
- A1 — AICCRA rows are historical mirror data: re-loadable from source, containing no STAR-authored content. This is what makes hard delete acceptable.
- A2 — PRMS and TIP rows are likewise re-syncable from their source systems.
- A3 — `public_link` is the only cross-platform publication identifier available; `external_link` is platform-local.
- A4 — The AICCRA loader script runs infrequently and its operator can be asked to trigger the sweep afterward.

**Dependencies**
- The `full_delete_result_version` MySQL function must delete the complete dependency graph of a result — a hard delete against an incomplete function throws MySQL errno 1451. **The authoritative baseline is the definition dumped from the live database**, which was measured as identical to `src/db/migrations/1783029013035-UpdateDeleteAndVersionSp.ts` — the highest-timestamp of five migrations defining the function. Do **not** baseline on `1778510205765-updatefulldelete.ts`: it is superseded, and taking it as current is the error that invalidated the first revision of this spec. Coverage MUST be re-derived from `information_schema`, never from a TypeORM entity walk (`result_cap_sharing_ip` has no entity).

**Risks**

| id | Risk | Mitigation |
| --- | --- | --- |
| RK-1 | Normalizer false positive destroys a distinct publication (DC-5) | Two-phase dry-run → confirmed apply; audit record captures the pre-delete payload; conservative normalization rules (no path-case folding, no query stripping) |
| RK-2 | Hard delete is irreversible where soft delete was recoverable | Audit record retains identity; A1/A2 make re-sync the recovery path; sweep is admin-only and confirmation-gated |
| RK-3 | The backfill of the normalized column mis-normalizes at scale | Backfill is idempotent and re-runnable; its own verification query compares JS and SQL normalization on a sample |
| RK-4 | Widening Rule 3 later (OQ-1) would change which rows get deleted | Rule table is data-driven and unit-test-pinned; a change is a one-line rank edit plus new test rows |
| RK-5 | Deleting rows that OpenSearch still indexes leaves phantom search hits | Index removal is part of the deletion path, verified in design.md |

---

## 9. Open questions

| id | Question | Owner | Needed by |
| --- | --- | --- | --- |
| ~~OQ-1~~ | **CLOSED 2026-08-04 — Rule 3 scope = Knowledge Product only.** Owner decision at the Phase 1 gate. AICCRA Capacity Sharing prevails only when the PRMS/TIP counterpart is a Knowledge Product; against any other PRMS/TIP indicator, Rule 1 applies and TIP prevails. This **narrows** the behavior shipped in `21f61a44`. → design decision D-dup-1. | MEL / product owner | ✅ closed |
| ~~OQ-2~~ | **CLOSED 2026-08-04 — Sweep is manual, admin-only.** No cron in this spec: an unattended destructive sweep has no human gate for DC-5. A scheduled variant may be proposed as a separate spec after the dry-run has been exercised on real data. → design decision D-dup-4. | ARI ops | ✅ closed |
| ~~OQ-5~~ | **CLOSED 2026-08-04 — Losers are hard-deleted, with a preceding audit record.** Confirms R-RES-003. → design decision D-dup-2, challenged in design.md §12.1. | Engineering lead | ✅ closed |
| OQ-3 | **Report-year scope.** R-RES-006 keeps auto-deletion same-year and reports cross-year as `CROSS_YEAR_REVIEW`. **Measured: 11 of the 116 live groups span 2 years.** Confirm this is the intended business reading. Non-blocking: the assumed default preserves today's behavior. | MEL / product owner | before `apply` |
| OQ-4 | **Retroactive cleanup.** Soft-deleted duplicates created by the current buggy path — **measured: 21 AICCRA rows** (`is_active = 0`, `result_status_id = 8`): leave, or hard-delete them in the sweep? Assumed **leave as-is** and excluded from matching. | ARI ops | before rollout |
| **OQ-7** | **7 inactive STAR link rows** would be destroyed by a hard delete of their mirror — the live delete function clears `link_results` with no `is_active` predicate, and R-RES-004 protects only active links. Extend protection to inactive links, or accept the loss? Recommend **extend**: a soft-deleted link is recoverable today and would stop being so. | Engineering lead | **blocks `apply`** |
| **OQ-8** | **Live machine-token exposure, independent of this spec.** All 4 `app_secrets` rows have zero `app_secret_host_list` entries (so the origin check is skipped), and `app_secret_id 8` resolves to a user holding `System Admin`. Who owns remediating this? | Security / eng lead | before Deploy 2 |

---

## 10. Sign-off

- [ ] Engineering lead — _pending_
- [ ] MEL / product owner — _pending_ (required: OQ-1, OQ-3)
- [ ] Security review — not required (no auth/secret surface change beyond an admin-only endpoint)
- [ ] DevOps — required (migration + backfill ordering)

---

## Requirement ID index

| id | Title | Fixes |
| --- | --- | --- |
| R-RES-001 | Normalized, platform-crossing, live-rows-only matching | D2, D4, D9 |
| R-RES-002 | Winner selection matches the approved ACs | D5, D8 |
| R-RES-003 | The non-prevailing result is not stored | **D1** |
| R-RES-004 | Deletion requires no STAR relationship | D6 |
| R-RES-005 | Same-platform duplicates untouched | — (guard against regression) |
| R-RES-006 | Explicit, conservative report-year scope | D3 |
| R-RES-007 | Idempotent and re-runnable | — |
| R-RES-008 | AICCRA reconciliation sweep | **D7** |
| R-RES-009 | Auditable decisions | D10 (no evidence trail) |
| NFR-RES-001..005 | Safety, performance ×2, observability, authorization | — |
