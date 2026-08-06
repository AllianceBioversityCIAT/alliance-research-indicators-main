# Judgment Day — results / cross-platform-duplicate-resolution

- **Target (immutable):** `requirements.md` + `design.md`, as of 2026-08-04
- **Spec id:** 2026-08-cross-platform-duplicate-resolution
- **Mode:** `judgment_day` · blind dual review · **Round 1**
- **Judge A:** `akili-reviewer` on `opus` (T3) · read-only
- **Judge B:** `akili-reviewer` on `sonnet` · read-only
- **Author:** Opus 5 (session orchestrator) — author ≠ auditor satisfied on the model axis for Judge B, and on the role axis for both
- **Terminal state:** **ESCALATED ⚠️ — both rounds exhausted (round 2 of 2). No further judged round is available under this contract.**

---

## Counts

| Category | Count |
| --- | --- |
| SEVERE confirmed by **both** judges | 3 |
| SEVERE raised by **one** judge, then **independently verified against source** by the orchestrator | 5 |
| WARNING | 13 |
| SUGGESTION | 3 |
| Contradictions between judges | 0 |
| Correction work units executed | **0** (escalated before round-one correction) |

**Note on the corroboration rule.** The contract fixes findings only when both judges confirm them. Five severe findings came from Judge A alone. Rather than filing them as unactionable "suspect", the orchestrator verified each against the source with a direct command; all five were confirmed as fact. Where a finding is a checkable property of the code rather than a judgment call, verification against the artifact is stronger corroboration than a second model's agreement — and it is recorded as such below, not laundered into "both judges agreed".

---

## Verified premises — where the design was wrong about the codebase

| Design claim | Verdict | Evidence |
| --- | --- | --- |
| `1778510205765-updatefulldelete.ts` is the latest `full_delete_result_version` | **FALSE** | `1783029013035-UpdateDeleteAndVersionSp.ts` (higher timestamp, line 993) redefines it. Orchestrator error: the derivation used `tail -5` on an **unsorted** `grep -rl` and treated that subset's maximum as the global maximum. |
| `link_results` is cleared in only one direction | **FALSE** | `1783029013035:1037–1039` — `WHERE result_id = temp_result_id OR other_result_id = temp_result_id`. Already both directions. |
| 8 FK-holding tables uncovered | **PARTIALLY FALSE, both ways** | `result_impact_outcomes` and `result_strategic_objectives` are already covered. Re-derived: **6** of the named tables remain uncovered — **plus at least one the method could not see** (below). |
| The comparison basis: "the 36 entities carrying a `result_id` column" | **METHOD INVALID** | `result_cap_sharing_ip` holds `result_cap_sharing_ip_id → results(result_id) ON DELETE NO ACTION` (`1744385171102:8`), has **no TypeORM entity**, and is **absent** from the live delete function. An entity-derived diff structurally cannot find it — and §3.3 instructed T-06 to repeat that method. |
| `resolveResultDeleteTargetIds` — "family scoping is already correct" (§2.2) | **FALSE** | `query.service.ts:38–44` scopes by `result_official_code + platform_code` only. No `report_year_id`, no `is_snapshot`. |
| An index over the normalized link column is creatable | **FALSE** | `public_link` is `@Column('text')` (`result.entity.ts:216`). A TEXT column in a key without prefix length → MySQL **error 1170**. |
| "Machine tokens are not granted access — no `app_secret_host_list` rows are added" (§8) | **INVERTED** | `app-secrets.service.ts:109–118`: the host list is an origin allowlist **for the token as a whole**, and **zero rows skips the origin check entirely**. Adding no rows makes the token *less* restricted, not more. No per-path machine-token gate exists anywhere. |
| Deletion runs inside the winner's `try`; the `catch` deletes the just-created winner | **TRUE** | `save-all-sections.service.ts:217` inside `try`; `:218–227` catch calls `deleteFullResultById(createNewResult.result_id)`. Both judges confirm. |
| Today's deletion is a soft delete; `normalizePublicLink` only trims; Rule 3 currently unscoped; R-RES-004 checks one direction only | **TRUE** | Confirmed by both judges against source. The bug diagnosis in §0 is sound; the *remedy premises* were not. |

The pattern: **every claim about the current defect was right, and most claims about the current delete machinery were wrong.** The diagnosis held; the derivation of what to change did not.

---

## Confirmed by both judges

### JD-01 — SEVERE — §0's factual foundation reads a superseded migration
*A: J-A-01 · B: F-1 · orchestrator: verified*

Three of §0's four factual claims are wrong (see premises table). §0 is the section explicitly framed as "the finding that shapes this design" and is what justifies D-dup-6, D-dup-7, and the §14 budget. Its narrative — "a hard delete of a row referenced as `other_result_id` raises errno 1451, which is why the current code works" — is false: that direction is already handled, so the loud DB failure the design treated as a backstop **does not exist**. A STAR-linked loser hard-deleted today would destroy the link row **silently**. The design under-states present risk on the exact axis that decides whether a guard bug is detectable at all.

### JD-02 — SEVERE — The relationship/FK enumeration is incomplete, and the method used to derive it cannot be fixed by re-running it
*A: J-A-02 (`result_cap_sharing_ip`) · B: F-2 (`result_pool_funding_indicator_mapping`) · orchestrator: both verified*

The two judges found **different tables by different routes**, which is what makes this the strongest finding in the ledger — independent confirmation that the enumeration is broken as a class, not that one row was missed.

- **Judge A — invisible to the method.** `result_cap_sharing_ip` carries a live `ON DELETE NO ACTION` FK to `results`, was backfilled one row per Capacity-Sharing result (`1744388857345`), has no TypeORM entity, and is not in the delete function. Path to failure: an AICCRA CS row loses to TIP under Rule 1 → `DELETE FROM results` → **errno 1451**.
- **Judge B — a second cross-result shape.** `result_pool_funding_indicator_mapping` (`1779190000008`) holds four FKs into *other results'* sub-rows: `result_capacity_sharing_id`, `result_knowledge_product_id`, `result_policy_change_id`, `result_innovation_dev_id`, each `→ result_*(result_id) ON DELETE NO ACTION`. Same cross-result shape as `link_results.other_result_id`, and the STAR guard never looks at it. Completing the function by the *owning* direction only (`WHERE result_id = <deleted>`) leaves a surviving STAR pool-funding result pointing at a deleted sub-row.

And `requirements.md` R-RES-004 bullet 3 delegates to a **`Relationship inventory` section of `design.md` that was never written** — the dead cross-reference is precisely where this enumeration was supposed to live.

### JD-03 — SEVERE — §5.1's rank conditions authorize deleting rows the requirements protect
*A: J-A-03 (over-deletion, severe) · B: F-3 (tie freezes group, under-deletion) · same §5.1 steps 5–7*

Judge A's case is a genuine logic bug in the rank table. Group `{AICCRA CS, TIP KP, TIP INNOVATION_DEV}`: Rank 1's condition is satisfied *by the TIP KP row*, so AICCRA CS becomes the sole winner; step 6 does not fire (no tie at the winning rank); step 7 makes every non-winner a loser — so **the TIP INNOVATION_DEV row is scheduled for hard deletion**, which R-RES-002 AC.6 and R-RES-005 AC.1 both explicitly forbid. Recurs as `{AICCRA CS, AICCRA non-CS, PRMS KP}` and `{PRMS a, PRMS b, TIP}`.

Judge B's case is the mirror: a tie at the winning rank freezes the *whole* group, so an unambiguous cross-platform loser is never resolved.

**Both are the same root defect:** the rank conditions are written over *group membership* but applied to *individual rows*, with no notion of which row satisfied the condition. And DC-1's declared gate cannot see it — a "full platform × indicator matrix" enumerates group *members*, not group *compositions*, and the defect needs three rows to appear.

### JD-04 — WARNING — OQ-6 names the wrong verification baseline
*A + B* — asks T-06 to diff the live DB against `1778510205765`; the answer is provably "no match" from the migration folder alone, producing a false drift signal that masks a real one.

---

## Raised by one judge, verified against source by the orchestrator

### JD-05 — SEVERE — Family expansion is not year-scoped and runs outside the STAR guard
*A: J-A-04 · orchestrator: verified at `query.service.ts:38–44`*

`findResultFamilyIds` matches `{result_official_code, platform_code}` with **no `report_year_id`**. PRMS keys identity on `{official_code, platform_code, report_year_id}` with `manageOfficialCode` falsy, so one official code legitimately has one live row **per report year**. Deleting the 2024 loser expands to the 2025 live row and hard-deletes it. This defeats R-RES-006 — the spec's headline conservatism control — from the *deletion* side while the *matching* side is correct, and it violates R-RES-004 AC.5: the STAR guard ran on the seed's `result_id`, and expansion then deletes siblings nobody checked. §2.2 certified this component "already correct" and reused it unchanged, so nothing downstream would have re-examined it.

### JD-06 — SEVERE — The incoming loser's own stored row is never deleted; the reported bug survives
*A: J-A-05 · orchestrator: verified against the design text and `save-all-sections.service.ts:99–115`*

R-RES-003 requires the incoming loser's existing family be submitted for deletion. §5.2 step 2 **excludes** `findResult` from candidates and step 4 returns without deleting it. Concrete: a PRMS row for link L exists; TIP later reports L; on the next PRMS sync `shouldOmit` is true, the stored PRMS row is excluded from candidates and never deleted → **the duplicate stays forever, on every run, while `OMITTED_DUPLICATE` increments to make it look handled.** This reproduces the exact operator complaint the spec exists to fix, on the PRMS path, as a silent no-op (DC-7). A requirement with no design element, in the spec's headline behavior.

### JD-07 — SEVERE — The §3.1 index cannot be created; Deploy 1 fails
*A: J-A-07 · orchestrator: verified at `result.entity.ts:216`*

`public_link` is `TEXT`; a normalized column of "the same length" is TEXT; indexing it without a prefix length raises MySQL **error 1170**. Adding a prefix is not free — it changes the selectivity NFR-RES-002 and NFR-RES-003 both rest on, and must be reconciled with InnoDB's 3072-byte key limit under `utf8mb4`. Deploy 1 is the schema step, and §11 correctly notes that a partially-applied Deploy 1 followed by code produces a total silent no-op that reads as success.

### JD-08 — SEVERE — No transaction is reachable; partial failure orphans snapshots permanently
*A: J-A-06 · orchestrator: verified at `query.service.ts:86–92`*

`deleteFullResultById` issues one autocommitted `SELECT full_delete_result_version(?)` **per family member**, unordered, unwrapped. The per-group transaction §5.3 promises is unreachable without changing a method §2.2 declares reused as-is. If the live row succeeds and a snapshot then throws, the live row is gone and the snapshots remain — and §5.1 step 1 restricts every future participant set to `is_snapshot = false`, so **no later run can ever see or clean them**, while they keep a `public_link`. Violates R-RES-007 AC.2 and NFR-RES-001; §10's e2e tests the happy path only.

### JD-09 — SEVERE — The machine-token control asserted in §8 does not exist
*A: J-A-08 · orchestrator: verified at `app-secrets.service.ts:109–118`*

§8 claims three independent gates on an irreversible delete and names authorization first. `app_secret_host_list` is an origin allowlist for the whole token, and **zero rows skips the check entirely**. `req.user` becomes the responsible user with real roles. So reachability of `POST …/apply` is decided solely by whether any `app_secrets` row's responsible user holds `SYSTEM_ADMIN` — which nothing in the spec checks, and which NFR-RES-005's named verification ("e2e without a bearer token") cannot see. Stated in a way that would stop anyone from looking.

---

## Warnings (recorded, not fixed)

| id | Finding |
| --- | --- |
| JD-W-01 | Plan hash covers loser **seed** ids, but execution expands through `resolveResultDeleteTargetIds` — rows created between dry-run and apply are deleted without appearing in the reviewed plan, violating R-RES-008 AC.3 ("no more"). Weakens the sole DC-5 gate. |
| JD-W-02 | `is_snapshot = false` does not match `NULL`, and the column is nullable with no DB default. If the AICCRA MySQL loader leaves it NULL, the sweep sees **zero AICCRA rows** — the feature's primary use case returns `INCONCLUSIVE`. One `SELECT COUNT(*) … WHERE is_snapshot IS NULL` from being settled. |
| JD-W-03 | TIP's `findOptions` keys identity on the **raw** `public_link`; matching moves to the normalized column and `tip-integration.service.ts` is not listed as reworked. An upstream `http`→`https` change creates a second TIP row, which §5.1 step 2 then declines forever as `SAME_SYSTEM_IGNORED`. Under-deletion manufactured by the fix. |
| JD-W-04 | The sweep run lock names no store. An in-process flag passes §10's unit test and fails across replicas. |
| JD-W-05 | `omittedDuplicateRecords` has no durable sink: `sync_process_log` has no such column and no entity/migration change is listed. The counter increments in memory and is discarded — R-RES-009 AC.2 unmet. |
| JD-W-06 | The §11 feature flag has no requirement, no AC, no test, and **no defined off-behavior**. Default-off is the state production runs in after Deploy 3; if "off" means soft-delete, the shipped default is indistinguishable from the bug. |
| JD-W-07 | DC-2's gate ("zero unresolved cross-platform groups") contradicts R-RES-005 AC.2 and R-RES-006 AC.2, which mandate permanently unresolved groups. A gate that can only fail is a gate that gets waived — and it is the gate for the class actually being fixed. |
| JD-W-08 | R-RES-008 specifies **one** endpoint with `mode=dry-run\|apply`; §4/§6 define **two** endpoints with no `mode` param. AC.2/AC.4/AC.5/AC.7 are written against a parameter that does not exist. Separately, the requirement's "bounded window" was silently replaced by a hash comparison with no TTL. |
| JD-W-09 | R-RES-004 protects only **active** link rows, but the delete function clears `link_results` with no `is_active` predicate — a soft-deleted STAR link, recoverable today, is destroyed. §12.1's breakage table missed it. |
| JD-W-10 | `TEMP_result_external_oicrs` carries `result_id` with no FK (confirmed) — hygiene only, no 1451 risk. |
| JD-W-11 | Dead cross-reference: `requirements.md` R-RES-004 points at a `Relationship inventory` section of `design.md` that does not exist. |
| JD-W-12 | §2.1 gives mutually exclusive route instructions: registering the controller in `ResultsModule` needs no `main.routes.ts` change, while a child node needs a separate module the design never creates. |
| JD-W-13 | §3.1 never delivers the `is_active`/`is_snapshot` index treatment that `requirements.md` §5 explicitly delegated to it; `select: false` also requires explicit `addSelect` in every read. |

---

## Sections both judges independently judged sound

- **D-dup-3** — pairwise → group resolution is the right structural fix; JD-03 is in the rank *conditions*, not the group-level approach.
- **D-dup-5** — one TypeScript normalizer, persisted, no MySQL generated column. The drift argument is correct and the backfill cost honestly priced.
- **D-dup-4** — manual, admin-only, no cron; correctly reasoned from DC-5's lack of an automated gate.
- **D-dup-7** — winner-committed-first, per-loser error boundary outside the `try`. The correct shape for the one §0 hazard that was real.
- **§3.4 backfill** — idempotent, separate from schema; "must report a **spread**, not a pass" is a genuinely stronger assertion than a sample check.
- **R-RES-001 normalization rules** — conservative in the right direction (no path-case folding, no query stripping); AC.2's negative cases well chosen.
- **DC-5 / RK-1 accepted risk** — **honest**. Judge A: "I found nothing testable being smuggled into DC-5."
- **§11 deploy ordering** — the silent-no-op rationale is right, and the ordering genuinely is the control.
- **§10 / KZ-001** — requiring a genuinely throwing deletion double, not a resolving stub, is the right test for the real hazard.
- **§12.1 as a method** — the reversion challenge did real work; incomplete (JD-W-09) but structurally sound.

---

## Verdict

**JUDGMENT: ESCALATED ⚠️**

Both judges independently returned "not safe to implement as written", with zero contradictions between them. Eight severe findings stand, all confirmed against source.

The failure is concentrated and diagnosable: **the bug diagnosis was sound, and the remedy premises were not.** Every claim the design made about the *current defect* held up under two independent reviews. Most claims it made about the *current delete machinery* were derived from the wrong artifacts — a superseded migration, and an entity walk that cannot see a table with no entity. Three components the design actively **certified as safe** (`resolveResultDeleteTargetIds`, the §8 authorization story, the errno-1451 backstop) are each a data-loss path.

This is not a patchable defect list. §0 through §3.3, §5.1's rank conditions, §5.2 steps 4/6/7, and the §8/NFR-RES-005 authorization claim all need re-derivation from the live schema and the live function definition — and the derivation *method* has to change, not just its output, because JD-02 is a finding about the method. A bounded two-round fix loop applied to this ledger would produce a document that passes review while resting on the same derivation, which is the failure mode the ledger exists to prevent.

**Escalated to the user for an explicit decision on scope.** No correction work units were executed; the target remains as reviewed.

---

## Round 1 resolution — re-derivation, 2026-08-04

The user chose **re-derivation** over the bounded fix loop. `design.md` rev 2 supersedes rev 1. Facts were re-derived from `information_schema` and the live dev database (read-only: `SELECT`/`SHOW` only).

**Measurement changed the severity ranking.** Several findings both judges ranked as severe are real in the schema but **unreachable in current data**; one warning turned out to be a live security exposure. This is why the re-derivation was the right call over patching — a fix round would have hardened the wrong things.

| id | Status after re-derivation | Measured reality |
| --- | --- | --- |
| JD-01 | **Fixed** | Live function dumped: byte-identical coverage to `1783029013035`. **No live drift** — OQ-6 answered by measurement. `link_results` already both directions. |
| JD-02 | **Fixed, and the method replaced** | 38 FKs to `results` (37 `NO ACTION`, 1 `CASCADE`). **7** tables uncovered, incl. `result_cap_sharing_ip`. **Blocking rows today: 0 in all seven.** `result_pool_funding_indicator_mapping` is empty. Real in the schema, latent in the data. FK inventory now comes from `information_schema`; the entity walk is banned in the spec. |
| JD-03 | **Fixed** | 0 AC.6-violating groups today, but **1 group holds 3 same-platform rows** — the shape is reachable. Resolver rewritten to pairwise-within-group; a rule must name **both** rows. New **DC-8** added, because DC-1's member matrix structurally could not see this class. |
| JD-04 | **Fixed** | OQ-6 closed by dumping the live definition rather than diffing a migration. |
| JD-05 | **Fixed** | **0 families span >1 report year** — latent, not active. `report_year_id` added to the predicate anyway; guard now runs per expanded id. |
| JD-06 | **Fixed** | The incoming loser's own family is now deleted. This was the reported bug reproduced by rev 1's own design. |
| JD-07 | **Dissolved** | Not fixed — **removed**. Six normalization levels all find the same **116** groups; only 1 key has multiple raw variants. The column, index, and backfill are dropped, so there is no TEXT index to fail. |
| JD-08 | **Fixed** | Family deletion is now one transaction, snapshots ordered before the live row. Became NFR-RES-003. |
| JD-09 | **Escalated as a live exposure (OQ-8) + new requirement** | Confirmed and worse than stated: all 4 `app_secrets` have **zero** host rows (origin check skipped) and `app_secret_id 8` → user 32 → **`System Admin`**. The control must be built. |
| JD-W-01 | Fixed | Digest now covers the fully expanded deletion set. |
| JD-W-02 | **Closed as a non-issue** | `is_snapshot IS NULL` and `is_active IS NULL` = **0** across all platforms. One query settled it. |
| JD-W-03 | Fixed | `tip-integration.service.ts` added to the reworked set. |
| JD-W-04 | Fixed | Lock is out-of-process. |
| JD-W-05 | Fixed | Durable sink specified for the omission counter. |
| JD-W-06 | Fixed | Flag `off` = detect + audit, **never** soft-delete. |
| JD-W-07 | Fixed | DC-2's assertion reworded; the old one could only ever fail. |
| JD-W-08 | Fixed | R-RES-008 amended to the two-endpoint surface; TTL restores "reviewed recently". |
| JD-W-09 | **Promoted to blocking OQ-7** | **7 inactive STAR link rows** would be destroyed. Neither judge ranked this blocking; the re-derived §12.1 challenge did. |
| JD-W-10..13, JD-S-* | Fixed or resolved in rev 2 | Route instructions disambiguated; index questions moot. |

**Budget moved down, not up:** 12 tasks → 9, ~1,500 LOC → ~1,050, 3 migrations → 2. Measurement retired more work than the findings added.

**Net new facts neither judge had:** the duplicate landscape is **TIP↔AICCRA only, 116 groups, zero PRMS**; Rule 1 decides 86 and Rule 3 decides 30 (so the owner's OQ-1 call governs 26% of real cases); and **AICCRA loses 86 of 116 groups while being the one platform with no automatic re-sync** — the recovery story is weakest exactly where deletion is most frequent. That asymmetry is now the headline item in the operator runbook.

**Candidate Kaizen lesson for `/akili-archive`:** rev 1's premises came from a TypeORM entity walk and an unsorted `grep | tail`; every premise that mattered was wrong. Two independent judges plus one `information_schema` query corrected them. *Derive schema facts from the schema.*

### What the re-derivation did differently

1. Derive the FK inventory from **`information_schema`** against the live database, never from TypeORM entities or migration greps. JD-02 is a method finding.
2. Dump the **live** `full_delete_result_version` and `delete_result` definitions and diff against `1783029013035`; treat the DB as the truth, migrations as intent.
3. Re-verify each of the three components the design certified as safe, individually, before reusing any of them.
4. Settle the two open empirical questions with one query each: `is_snapshot IS NULL` counts for AICCRA rows (JD-W-02), and whether any `app_secrets` responsible user holds `SYSTEM_ADMIN` (JD-09).
5. Rewrite the R-RES-002 rank logic so a rule names **which row** satisfied its condition, and extend DC-1's gate from a member matrix to a **composition** matrix (3+ row groups, multiple rows per platform).

---

# Round 2 — re-judgment of design.md rev 2

- **Scope:** the frozen round-1 ledger + the rev-2 delta (contract-scoped re-judgment)
- **Judge A:** `akili-reviewer` on `opus` · **Judge B:** `akili-reviewer` on `sonnet` · both read-only, blind
- **Terminal state:** **ESCALATED ⚠️ — rounds exhausted**

## Counts

| Category | Count |
| --- | --- |
| Round-1 findings **genuinely closed** (corroborated by both judges) | 13 |
| Round-1 findings **NOT closed** — the fix reintroduced the class | **2** (JD-03, JD-06) |
| Round-1 findings closed in `design.md` but **not swept from `requirements.md`** | **2** (JD-01, and R-RES-002's abandoned rank table) |
| **New SEVERE** (fix-caused or newly seen) | **8** |
| New WARNING | 10 |
| New SUGGESTION | 3 |
| Contradictions between judges | 0 |

## What rev 2 genuinely fixed

Both judges independently corroborated these, several from source rather than from the design's claims:

- **JD-02 — the FK inventory.** Judge A reproduced it independently: 37 FK statements in migrations + `project_indicators_results`, minus the live function's 35 DELETE targets = **exactly the 7 tables** §0.3 names. Called "the strongest closure in the ledger" and "the best-supported claim in rev 2".
- **JD-08 — the transaction is achievable.** Both judges read the full function body: pure `SELECT … INTO`, `DELETE`, `RETURN`. No DDL, no `TRUNCATE`, no `COMMIT` — **no implicit commit**, so its DML participates in the caller's transaction and rolls back. The §5.4 design is mechanically sound.
- **JD-07 — dissolved, literally.** No column ⇒ no index ⇒ no MySQL error 1170.
- **JD-01/JD-04 at the design level**, JD-W-01, JD-W-06, JD-W-08, JD-W-09, JD-W-10, JD-W-11, JD-W-12 (route registration verified against `main.routes.ts:277–281`), JD-W-13.

## The two findings the fix did not close

### JD2-01 — SEVERE — the resolver still deletes rows no approved rule authorized
*Both judges, independently, with different exemplars. Orchestrator traced and confirmed.*

§5.1 step 4 makes a row a loser if any rule named it as a losing side; step 5 crowns the row that loses no pair. **Nothing requires a pair's winner to survive the group.**

`{AICCRA CS, TIP KP, TIP INNOVATION_DEV}` — the composition rev 2 uses as its own worked example:

| Pair | Rule | Outcome |
| --- | --- | --- |
| AICCRA CS vs TIP KP | Rule 3 | AICCRA CS **wins** |
| AICCRA CS vs TIP INNOVATION_DEV | Rule 1 | AICCRA CS **loses** |
| TIP KP vs TIP INNOVATION_DEV | — | same platform, incomparable |

Winner: TIP INNOVATION_DEV. **Losers: AICCRA CS *and* TIP KP.** So the Capacity-Sharing row is hard-deleted despite winning its Rule-3 comparison, and TIP KP is deleted although the only row that ever beat it is itself a loser — and relative to the surviving winner, TIP KP is a **same-platform sibling**, which R-RES-005 AC.1 says must produce "no winner, no deletion, no omission".

Judge A's second exemplar is more likely given the measured data: `{AICCRA CS, AICCRA non-CS, TIP KP}` deletes the AICCRA non-CS row on the same mechanic.

**Rev 2's §5.1 narrative only checked that TIP INNOVATION_DEV was safe — the row rev 1 got wrong — and never traced the fate of the other two.** §10's DC-8 test is specified the same way ("asserting the TIP non-KP row is untouched"), so an implementation matching §5.1 literally would **pass the gate built to catch this class** while destroying a row the story says prevails.

**Root cause, deeper than the mechanics:** R-RES-002 AC.2 and AC.5 are **mutually inconsistent for 3-row compositions**. AC.5 gives AICCRA CS > TIP KP; AC.2 gives TIP > AICCRA. With all three rows present both hold and they contradict. No pairwise mechanic can resolve this correctly, because the approved acceptance criteria do not define a total order. **This is a business-rule gap, not an implementation bug** — see OQ-9.

### JD2-02 / JD2-03 — SEVERE — the JD-06 fix can destroy the group winner
*Judge A; orchestrator confirmed against the design text and `tip-integration.service.ts:189–191`.*

§5.2 step 4 fires on "**incoming** is not the winner" and then deletes `findResult`'s family **unconditionally** — without asking whether `findResult` lost. `findResult` is a different row from the incoming payload and can be the winner. TIP makes this reachable because `findOptions` is keyed on `public_link`, not on indicator or official code (`{ public_link: 'public_link' }`, `manageOfficialCode: true`):

> An AICCRA CS row on link L exists. A stored TIP row on L has indicator `INNOVATION_DEV`. TIP re-reports L reclassified as `KNOWLEDGE_PRODUCT`. `findResult` = the stored TIP INNOVATION_DEV row, which loses no pair ⇒ **it is the winner**. Incoming TIP KP loses to AICCRA CS under Rule 3. Step 4 deletes the winner's family; step 7 deletes AICCRA CS; the incoming row is never created. **The whole group is destroyed and nothing replaces it.**

JD2-03 compounds it: step 3 counts `findResult` and the incoming row as two participants for one physical row, so a routine re-sync of an already-stored row puts two same-platform participants in the group and fires the tie branch on the **primary sync path** — the shape of all 116 measured groups. The design then has no rule for the incoming row: one reading no-ops forever (DC-7, the reported bug), the other deletes the stored winner.

## New severe findings

| id | Finding | Status |
| --- | --- | --- |
| **JD2-04** | **Moving normalization into SQL puts matching under a case- and accent-folding collation.** `public_link` is **`utf8mb3_general_ci`** (verified live: `'abc'='ABC'` → 1, `'jose'='josé'` → 1). R-RES-001 AC.2 ("path case must NOT match") is **unsatisfiable** without an explicit `COLLATE …_bin`/`BINARY` in the predicate, and the failure direction is **over-matching → hard delete of a distinct publication** (DC-5/RK-1). Rev 1's TypeScript normalizer compared with JS `===` and did satisfy AC.2 — **this defect was created by reversing D-dup-5.** Judge A further notes the §0.2 measurement is weakened by the same collation: under `_ci`, `LOWER(a)=LOWER(b) ⟺ a=b`, so the "+ lowercase → 116" row is **vacuous as evidence**. | **Confirmed; partly mitigated.** Orchestrator measured `distinct_binary = distinct_ci = 12,849` — **no case-only variants exist today**, so the *conclusion* (normalization buys nothing) survives while its *stated evidence* was partly vacuous. The AC.2 defect stands and requires an explicit binary collation. |
| **JD2-05** | `requirements.md` R-RES-002's rank table **still specifies the abandoned group-membership semantics** — the exact text JD-03 identified as the root defect. Two normative documents now disagree about which production row is destroyed, and `requirements.md` is what the reviewer checklist audits against. | Confirmed |
| **JD2-06** | `requirements.md:417` still names `1778510205765` as the "latest definition" — byte-for-byte the JD-01 premise, in a document the ledger marks Fixed. | Confirmed by orchestrator |
| **JD2-07** | **The machine-token block has no attachment point.** `jwr.middleware.ts:81` sets `req.user = isValid.user`; `:90` sets it from the ROAR path. The two are **shape-identical**, so a guard has nothing to read. Making the control real requires modifying `JwtMiddleware`, which appears in **neither** §2.1's file lists **nor** the 9-task budget. Meanwhile §10's specified test injects a machine-token principal into a mocked context, so it **goes green against a flag production never sets** — the DC-7 silent-no-op class, on the authorization gate of an irreversible mass delete, with a passing test as its evidence. | Confirmed |
| **JD2-08** | **The one `CASCADE` FK was dismissed on FK-error grounds, not data-loss grounds.** `project_indicators_results` CASCADE means the hard delete **silently destroys** rows that belong to a project indicator, which today's soft delete preserves. No guard sees it, no audit row records it. This is the **identical class as JD-W-09**, which rev 2 itself promoted to blocking OQ-7 — and it is structurally the same reasoning error (answering the errno question, not the data question) that §2.2 promises to have corrected. Also: the table appears in **no migration**, so the schema drifts from the migration folder. | Confirmed |

## New warnings

JD2-09 `findResultFamilyIds` has **4 non-dedup callers** (`results.service.ts:364` bulk hard-delete endpoint, `:960` AI-report rollback, `prms.opensearch.service.ts:163`, `save-all-sections.service.ts:224`); year-scoping silently narrows all four, with no blast-radius analysis and no test naming them · JD2-10 the omission counter needs a **third** migration (`sync_process_logs` counter columns are NOT NULL, no default) while the budget says two, so JD-W-05 returns unchanged · JD2-11 the run lock names a store but **no atomic acquisition** (no CAS, no `FOR UPDATE`, no TTL, no seeded row — `updateConfig` throws on a missing key), and `app_config` is **world-readable** via the JWT exclude list · JD2-12 **`TECHNICAL_SUPPORT` can flip the hard-delete flag** (`PATCH /api/configuration/:key`) but cannot run either sweep endpoint — a wider write ACL than the feature, on the sync path that has no dry-run, digest, or TTL · JD2-13 the function returns `FALSE` rather than raising on a missing row, so a no-op is audited as `DELETED` · JD2-14 JD-W-03's fix is the word "reconciled" — no mechanism, requirement, AC, or test · JD2-15 "a scan is free" is a per-query claim used to justify a **per-sync-row** scan (~8.5k calls per TIP run), with the only latency gate waived and no growth tripwire · JD2-16 **the "116 groups" tripwire is a dev number used as a production gate** — it will either block every production run or be waived on first contact, recreating the "a gate that can only fail gets waived" pathology rev 2 had just corrected in DC-2 · JD2-17 stale rev-1 artifacts in `requirements.md`: RK-3 describes the dropped backfill, the DevOps sign-off names backfill ordering, and "Security review — **not required**" contradicts NFR-RES-005 and OQ-8 · JD2-18 the same-platform tie leaves R-RES-009 AC.1's mandatory "deciding rule + deciding row" undefined.

Suggestions: JD2-19 `COALESCE(is_snapshot, FALSE)` defensive predicate · JD2-20 read the family set **inside** the transaction (`FOR UPDATE`) or a concurrent snapshot is orphaned — the exact failure §5.4 exists to prevent · JD2-21 §3.1's normalization list omits "strip empty query/fragment" which R-RES-001 mandates.

## New open question

| id | Question | Owner | Blocks |
| --- | --- | --- | --- |
| **OQ-9** | **R-RES-002 AC.2 and AC.5 are mutually inconsistent for any group containing an AICCRA Capacity-Sharing row, a PRMS/TIP Knowledge Product, and a PRMS/TIP non-KP row.** AC.5 gives AICCRA CS the win; AC.2 gives TIP the win; both apply. The approved acceptance criteria **do not define a total order**, so no resolver can be correct. MEL must either (a) declare an explicit precedence for this composition, or (b) declare it unresolvable-by-machine, in which case the group is reported for manual resolution and nothing is deleted. **(b) is the safe default and is what the orchestrator recommends pending the decision.** | MEL / product owner | **the entire resolver** |

## Verdict

**JUDGMENT: ESCALATED ⚠️ — rounds exhausted. Not safe to implement.**

Rev 2's **facts** are now sound: both judges independently reproduced the FK inventory and the 7-table gap, confirmed the transaction is achievable, and confirmed the TEXT-index problem is genuinely dissolved. Thirteen round-1 findings closed for real.

But the two headline rewrites each **reintroduced the class they were commissioned to remove**, and in both cases the new gate was written so that it passes anyway. The pattern across both rounds is now legible and is the durable lesson: *each fix addressed the specific symptom the finding described, then failed to verify the whole outcome.* Round 1 fixed facts derived from the wrong artifacts. Round 2 fixed mechanisms that were verified only against the row the previous round got wrong.

The most consequential discovery is **OQ-9**: the resolver kept failing because the approved acceptance criteria are mutually inconsistent for three-row compositions. Two engineering attempts could not have succeeded — the specification, not the implementation, is underdetermined. That question belongs to MEL and it blocks the resolver.

**Recommendation: do not decompose into `tasks.md`.** Decomposing an escalated design propagates its defects to every Implementer, and the resolver — the component that decides which production row is destroyed — has no correct specification to implement yet. Resolve OQ-9 first, then re-specify §5.1 against an explicit total order, sweep `requirements.md` (JD2-05, JD2-06, JD2-17), and add the binary collation (JD2-04) before any further design round.

---

## Round-2 correction record (2026-08-04)

The user directed the two headline severes fixed and the spec taken through to `tasks.md`. **Rounds are exhausted, so these corrections are unjudged** — recorded here for `/akili-archive` and for whoever reviews the PRs.

| Finding | Correction | Verification |
| --- | --- | --- |
| **JD2-01** — resolver deletes rows no rule authorized | **D-dup-13.** Rules apply pairwise to the two rows they name. New **consistency gate**: any row that wins ≥1 pair *and* loses ≥1 pair ⇒ `UNRESOLVED_CONFLICT`, reported, **nothing deleted**. | Traced against both judges' exemplars: `{AICCRA CS, TIP KP, TIP non-KP}` and `{AICCRA CS, AICCRA non-CS, TIP KP}` now delete nothing. **Measured against live data: 0 of the 116 groups become `UNRESOLVED_CONFLICT`; all 116 still resolve.** The gate costs nothing and is a safety net for a reachable-but-absent shape. |
| **JD2-02 / JD2-03** — the JD-06 fix could destroy the group winner | **D-dup-14.** The incoming payload and `findResult` are **one** participant. Step 4 acts on that participant's verdict, not on "incoming is not the winner". Every deletion routes through the single loser loop. | Traced against the reclassified-indicator scenario; the winner is no longer reachable for deletion, and one physical deletion yields one audit row. |
| **JD2-05** — `requirements.md` kept the abandoned rank semantics | R-RES-002 rewritten to the pairwise form + consistency gate. | Both normative documents now describe the same algorithm. |
| **JD2-06** — `requirements.md` named the superseded migration | §8 Dependencies now names the **live dumped definition** as authoritative, states `1783029013035` as the measured match, and explicitly warns against baselining on `1778510205765`. | — |
| **JD2-04** — SQL comparison folds case and accents | **D-dup-15.** Explicit `COLLATE utf8mb4_bin` on every normalized comparison and grouping. | Verified live: `public_link` is `utf8mb3_general_ci`; `'abc'='ABC'` → 1, `'jose'='josé'` → 1. Mitigation measured: `distinct_binary = distinct_ci = 12,849`, so no case-only variants exist today — the 116 conclusion holds, and the guarantee is now in the predicate rather than inherited from the data. |
| **JD2-08** — the `CASCADE` FK dismissed as a non-issue | **D-dup-16.** `project_indicators_results` counts as a **protecting relationship**, same treatment as the inactive STAR links behind OQ-7. | — |
| **JD2-16** — dev group count used as a production gate | §14 tripwire scoped to **dev regression only**; the production gate is the human plan review plus non-surprising conflict/protected counts. | — |
| JD2-07, JD2-09…JD2-15, JD2-17…JD2-21 | Encoded as explicit task requirements rather than silently redesigned: T-10 (middleware attachment point + real-middleware `403`), T-07 (four callers, `FOR UPDATE`, `FALSE`-return handling), T-08 (third migration), T-09 (atomic lock), T-12 (flag ACL, runbook). | Each carries a **disqualifying-evidence clause** naming the green-gate failure it must not repeat. |
| **OQ-9** | Resolved as option (b) — `UNRESOLVED_CONFLICT` — on the owner's instruction to proceed. Left open for MEL to supply an explicit precedence, which would strictly increase what gets cleaned. | 0 live groups affected. |

**Declared budget overrun:** 12 tasks / 3 migrations against the design's 9 / 2 — T-10 and T-08's counter migration were both found in round 2. Flagged in `tasks.md` §4 and RB-4 for a scope decision rather than absorbed.

**Not corrected, by design:** JD2-14 (TIP's raw-link identity key) remains a pre-existing defect that this spec does not fix; it is documented in `design.md` §7 rather than claimed as closed.

---

# Judgment Day — Round 3 (rev 3 amendment: PRMS publication identity)

- **Date:** 2026-08-05
- **Target (immutable):** the rev-3 amendment to `requirements.md` + `design.md` — new R-RES-010, amended R-RES-001/005/009 AC.4, DC-9/DC-10, A3 retired → A5/A6/A7, OQ-10/OQ-11; in `design.md` §0.5, re-derived §0.1, §3.1.1–3.1.3, §5.1 step 8, §5.2 step 0, §7, §10, §11, D-dup-18…21, §12.2, §14.
- **Protocol:** two blind read-only judges (`akili-reviewer`, opus), identical scope, no cross-visibility.
- **Model-routing deviation, recorded:** T3 Auditor maps to `opus`, the model that authored rev 3. Author ≠ auditor was satisfied on the **context** axis (fresh blind contexts + two-judge agreement), not the model axis; downgrading the auditor tier to satisfy the rule formally would have weakened the audit.
- **Runtime note:** Judge A terminated mid-audit on an API error and was **resumed from transcript**, not restarted. Its coverage is scope items 1, 2, 3, 5 in full and item 4 **partially** — it did not line-by-line audit `duplicate-resolution.service.ts` / `star-relationship.service.ts` for the expanded-family guard. Disclosed rather than presented as complete.
- **Counts:** Judge A — 3 SEVERE / 8 WARNING / 3 SUGGESTION. Judge B — 6 SEVERE / 6 WARNING / 1 SUGGESTION.

## Confirmed by both judges

| id | Finding | Status |
| --- | --- | --- |
| **JD3-01** (A-01 / B-01) | **§5.2 step 0 rests on dead code.** `processKnowledgeProduct` is `private` at `prms.opensearch.service.ts:263` and referenced only by its own spec (`:492,:504,:520`). `processData` — the sole producer of the `ExternalMappersDto[]` passed to `bulkSaveAllSections` — never assigns `result.evidence`. So `dto.evidence` is `undefined` for every PRMS payload and the sync path resolves **no** PRMS identity. Judge A found the root cause of the authoring error: **TIP's mapper *does* populate `resultMapped.evidence` (`tip-integration.service.ts:340-352`) — rev 3 read TIP's behaviour onto PRMS.** | **CONFIRMED SEVERE** — independently verified against source by the orchestrator |
| **JD3-02** (A-02 / B-02) | **No live code writes the new identity source.** `save-all-sections.service.ts` contains zero references to evidence; the only production writers of `result_evidences` are `results.service.ts:939` (AI/bulk-upload) and `result-evidences.controller.ts:46` (STAR authoring). The 2,792 measured PRMS handle identities are a **legacy artifact of a path that no longer runs.** Consequence: after `apply` hard-deletes ~2,249 PRMS rows and PRMS re-syncs them (A2 — the recovery story), the re-created rows carry no handle evidence → invisible to both sweep and sync path. The cleanup does not stick and the duplicates become **permanently undetectable**, while the audit log records success. | **CONFIRMED SEVERE** — independently verified against source |
| **JD3-03** (A-11 / B-03) | **Surviving rev-2 text still names `public_link` as the identity.** R-RES-008's Behavior bullet ("scans `results` for normalized-`public_link` groups") governs the surface performing ~all PRMS deletion; R-RES-003 AC.3 and `design.md` §3.3 still require the audit record to carry "raw + normalized `public_link`", which R-RES-010 AC.2 forbids for PRMS. Rev 3 amended the matching foundation and not the requirements that consume it. | **CONFIRMED SEVERE** (B severe, A warning) |
| **JD3-04** (A-05 / B-04) | **The multi-group refusal is assigned to a component that cannot host it.** `resolveDuplicateGroup(participants, options)` (`duplicate-result-priority.util.ts:207`) is pure over one group; `DuplicateGroupParticipant` (`:81-84`) carries only `resultId`/`platformCode`/`indicatorId`/`reportYearId` — no identity key, no cross-group input. R-RES-010 AC.8 is unsatisfiable there, and §5.1's closing line wrongly states the resolver "receives a normalized key". | **CONFIRMED** (B severe, A warning) |
| **JD3-05** (A-08 / B-06 / B-07) | **The R-RES-002 consistency gate conflicts with the shipped resolver, and rev 3 makes the conflict live.** `duplicate-result-priority.util.ts:45-48` explicitly rejects the win-and-lose gate ("the normal position of the middle element of a total order… a gate keyed on win-and-lose would wrongly refuse it") and implements Gate A/Gate B instead. Rev 2 was unaffected — PRMS was in zero groups. Rev 3's own arithmetic (2,249 + 16 + 116 = 2,381 pair memberships over 2,359 groups) makes **~11–22 three-platform groups** live, exactly the composition where requirement and code disagree. D-dup-13's "measured cost: zero" was **not re-measured** and describes the superseded corpus. §10's mandatory matrix contains no three-platform composition. | **CONFIRMED** (B severe, A warning) |
| **JD3-06** (A-10 / B-13a) | `result-evidences.service.ts:82` is the **read** filter in `findPrincipalEvidence`; the writer hardcode is **line 67**. The citation names the wrong construct, and the writer it names is unreachable from PRMS sync — so the mechanism offered as the *reason* the role/privacy invariant holds does not apply to the population it is claimed about. `is_private` is in the writable field list, so that predicate is empirically empty, not structurally a no-op. | **CONFIRMED** |
| **JD3-07** (A-13 / B-13b) | §3.1.2 says "all four repository reads"; the repository exposes **three** (`:97`, `:125`, `:188`) — `findCrossPlatformGroupKeys` *is* the group scan. §14's LOC estimate is sized against the same wrong list. | **CONFIRMED** |
| **JD3-08** (A-14 / B-13c) | **T-15 is counted in the budget and defined nowhere.** T-14 is specified in §10; T-13 is inferable from §2.1; T-15 appears only in the budget line. | **CONFIRMED** |
| **JD3-09** (A-12 / B-13e) | **"Identity" now means two things on the deletion path** — publication identity (rev 3) and family identity (`result_official_code + platform_code`, fixed in code at `query.service.ts:39` and throughout §5.4.1 / D-dup-17). Two unrelated refusal rules share the noun on the branch that decides hard deletes. | **CONFIRMED** |

## Suspect — one judge only, not auto-fixed

| id | Finding | Judge |
| --- | --- | --- |
| **JD3-S-01** | **R-RES-001 AC.7 — the operationalised DC-9 gate — would have passed the rev-2 defect.** AC.7 asserts the read field is "non-empty for a material share" of live rows; PRMS `public_link` was non-empty for **3,947 of 3,947**. Non-emptiness is orthogonal to matchability; only the handle-format rate (0%) discriminated, and rev 3 correctly forbids a format filter on TIP/AICCRA — so no format predicate exists for two of three platforms. Proposed replacement: a **cross-platform matchability** assertion (each platform's identity set must intersect at least one other's; PRMS ∩ TIP was 0 under rev 2 and would have failed). | A-03 |
| **JD3-S-02** | **§5.1 step 8 reverses §5.1 step 6 / D-dup-9 without acknowledging it.** Step 6 established that a row losing to every survivor is still deleted ("rev 1 froze the whole group and left genuine duplicates stored — JD-03/F-3"); step 8 freezes every group a multi-identity row touches, so one such row freezes unrelated unambiguous losers. Under-deletion whose blast radius is unbounded by the multi-identity count. | A-04 |
| **JD3-S-03** | **Multi-identity is reachable from the mapper *today*, contradicting "data that does not yet exist".** `processKnowledgeProduct` loops over `PrmsKnowledgeProductDto[]` (`:268-273`) pushing one handle evidence per element (`:277-286`), so a two-KP item yields two handle identities in one payload. §5.2's table says "entries" (plural) and never states what the sync path does with two. | A-06 |
| **JD3-S-04** | **`UNION ALL` does not deduplicate.** `result_evidences` has no unique constraint on `(result_id, evidence_url)`, and the versioning SPs copy evidence rows wholesale (`1783029013035:505,518`). Two identical handle rows put one `result_id` in a group twice → duplicate audit rows and a double hard-delete attempt, or a spurious `UNRESOLVED_CONFLICT` if the refusal counts rows rather than distinct normalized identities. | A-07 |
| **JD3-S-05** | **§7's "2,249 of its 2,265 PRMS/AICCRA pairs" attributes PRMS's counterpart counts to TIP.** 2,265 = 2,249 + 16 = PRMS's two counterparts; the 16 PRMS↔AICCRA pairs contain no TIP row. TIP's own denominator is 2,249 + 116 = 2,365, and the pairs TIP *loses* are the Rule-3 ones inside TIP↔AICCRA (~30 groups under rev 2), not 16. §11's runbook asymmetry table is built on the wrong reading and understates where a TIP row is hard-deleted. | A-09 |
| **JD3-S-06** | **A6 cites a uniqueness measurement to establish ownership.** 2,387/2,387 proves one handle per KP result; it cannot distinguish "this result's own publication" from "a publication this result cites", so the measurement named as closing DC-10 cannot detect DC-10. Discriminators available and unused in the predicate: `evidence_description = 'Handled'` (`prms.opensearch.service.ts:283`) and `result_knowledge_products.citation` (`:279`). | B-05 |
| **JD3-S-07** | **§0.1 and §0.5 report different PRMS live-row counts for the same stated predicate** — 4,357 (rev 2, retained) vs 3,947 (rev 3), a 410-row gap (9.4%), in a section opening "Everything in this section is a measurement, not an inference". D-dup-18's "0 of 3,947" therefore covers a subset if §0.1's denominator is right. §12.2's "1,155 rows have no qualifying handle" also understates rows leaving scope, which is 3,947 − 2,387 = 1,560 once the KP filter applies. | B-08 |
| **JD3-S-08** | **The in-memory/SQL asymmetry fails toward over-deletion, and its gate cannot run in CI.** If a future writer stores a non-principal or private handle evidence, the SQL side denies the identity while the in-memory side grants it → the incoming row is judged a loser on an identity the sweep does not recognise, and step 4 hands `findResult`'s whole family to the hard-delete loop. T-14 sits in `test/` (jest-e2e, `TEST` datasource) but asserts a property of the populated dev corpus, so it reports `INCONCLUSIVE` in any normal CI run. §5.2 step 0 also omits `is_active` from the fields the payload lacks. | B-09 |
| **JD3-S-09** | **The 1:1 tripwire covers one direction only.** The reverse violation — two PRMS KP results sharing one handle — has no tripwire and no refusal branch. Group `{PRMS_A, PRMS_B, TIP}` resolves `RESOLVED` with survivor `{TIP}`; Gate A does not protect A/B because they share no platform with the survivor, so **both** PRMS rows are hard-deleted. If the shared handle is a data error, a distinct publication is destroyed — DC-5 on the new identity field. | B-10 |
| **JD3-S-10** | **DC-9's rationale overstates the blindness of count gates.** Rev 2's §0.1 *did* record a per-platform count ("Zero groups involve PRMS") that exposed the defect and was read as a fact about the data. What was missing was an **assertion over** the metric, not the metric. §14 states this correctly; the requirements wording generalises to all count gates. | B-11 |
| **JD3-S-11** | Surviving rev-2 text beyond JD3-03: §2's intro still calls the PRMS sync path "**inherited correctness**"; §3.3's audit-record contents omit `identitySource`, so the entity cannot satisfy R-RES-009 AC.4; DC-2's verification query is unpinned as to identity source and returns zero for PRMS by construction if written over `public_link`. | B-12 |

## Judge disagreement

No contradiction requiring escalation. **JD3-S-01** (the AC is weaker than its rationale) and **JD3-S-10** (the rationale is stronger than its evidence) approach the same underspecification from opposite ends and are jointly consistent: rev 3 needs a *matchability* assertion, and needs to stop implying per-platform counts are useless.

## Terminal state

**JUDGMENT: ESCALATED ⚠️**

No fix round was spent. **JD3-01 and JD3-02 are not spec-wording defects** — together they establish that the amendment's sync-path half is inert and that its identity source is a legacy corpus no running code maintains. Correcting them requires re-deciding the mechanism (an extra query on `findResult` vs. a PRMS mapper change that §7 currently forbids) and re-scoping what the feature delivers. That is a Phase 2 design decision for the owner, not a bounded correction, so the lineage is escalated with both ledgers intact rather than consuming a round on a patch that cannot reach the defect.

**Method note for `/akili-archive` Kaizen.** Three revisions, three instances of one root cause: rev 1 derived schema facts from TypeORM entity walks; rev 2 derived the identity field from an assumption (A3); rev 3 derived a mapper's runtime behaviour from **reading the method body without checking it is ever called**, and imported a sibling mapper's behaviour (TIP's) onto PRMS. Candidate lesson, narrower and more actionable than rev 2's "derive schema facts from the schema": **a code fact is not established until its call path to production is traced.** Each of these survived review because the claim was true *locally* and false *on the path that runs*.

## Round 3 — Fix round 1 of 2 (applied 2026-08-05)

Owner-authorised scope: the 9 findings confirmed by both judges, plus 3 single-judge findings the orchestrator independently verified. The remaining 8 suspects stay `info`, unfixed, per the one-judge rule.

| Finding | Correction |
| --- | --- |
| **JD3-01** | §5.2 step 0 rewritten around the real mechanism: **`processData` must call `processKnowledgeProduct`** (T-13, **prerequisite for `apply`**). The dead-code error and its cause (TIP's mapper read onto PRMS) are recorded in place rather than quietly replaced. New **R-RES-010 AC.10** asserts a real `processData` output carries the handle — the only gate that would have caught this. §0.5's `external_link` rationale corrected: the assignment never executes, so there was nothing to overwrite. |
| **JD3-02** | Provenance stated honestly: the 2,792 stored evidences are a **legacy artifact with no maintained writer**, and the corpus is **static**. §11 gains the ordering constraint — running `apply` without T-13 destroys the ability to ever detect the duplicate again, which is worse than not sweeping. **OQ-12** records the deferred decision to persist `dto.evidence` (and its TIP blast radius). |
| **JD3-03** | R-RES-008's Behavior bullet and R-RES-003 AC.3 restated in identity terms; both carry the note that the old wording would have reproduced D11. |
| **JD3-04** | Refusal relocated to `DuplicateResolutionService` + `SaveResultService.buildDuplicateGroup`, carried by a projected **`identityCount`**; the pure resolver stays identity-blind and §5.1's closing paragraph is corrected (it does **not** receive a normalized key). Tests moved to the two suites that can host them. **D-dup-23.** |
| **JD3-05** | R-RES-002's consistency gate rewritten from "wins ≥1 and loses ≥1" to **no consistent ordering**, following the shipped resolver's semantics rather than reversing them. D-dup-13's "measured cost: zero" struck through as a rev-2 figure and flagged **must be measured before `apply`**. §10 gains the mandatory three-platform composition `{AICCRA CS, PRMS KP, TIP KP}`. |
| **JD3-06** | Citation corrected to `result-evidences.service.ts:67` (the writer) from `:82` (a read filter); noted that `is_private` is writable, so that predicate is empirically empty rather than structurally a no-op. |
| **JD3-07** | "All four repository reads" → **three**, named with line numbers; §14 LOC re-cut. |
| **JD3-08** | **T-13, T-14, T-15 all defined** in §14 with scope and separability. T-15 was previously a budget line with no referent. |
| **JD3-09** | §2 gains a terminology table separating **publication identity** from **family key**, naming both refusal rules so they cannot be implemented in terms of each other. §2's "inherited correctness" line corrected. |
| **JD3-S-01** *(verified)* | **R-RES-001 AC.7 replaced.** Non-emptiness → **cross-platform matchability** (each platform's identity set must intersect another's). The old form passed on the rev-2 corpus, where PRMS `public_link` was non-empty for 3,947/3,947 and matched nothing. DC-9's gate column realigned, incorporating JD3-S-10's point that rev 2 *had* the discriminating metric and lacked an assertion over it. |
| **JD3-S-03** *(verified)* | "Data that does not yet exist" retracted: `processKnowledgeProduct` loops over a KP **array**, so a multi-handle payload is reachable on any sync run. Costs split stored (zero) vs incoming (**unmeasured**), and §5.2 step 0 states the sync-path rule — refuse, never resolve on the first handle. **R-RES-010 AC.9.** |
| **JD3-S-05** *(verified)* | §7's TIP denominator corrected to **2,365** (2,249 + 116); the "2,265" figure was PRMS's own counterpart counts. TIP's actual loss population named as the Rule-3 pairs inside TIP↔AICCRA, flagged not re-measured. |

**Also carried:** `DISTINCT` on `(result_id, normalized identity)` in the PRMS branch (**JD3-S-04**, verified while implementing JD3-04 — `UNION ALL` does not deduplicate and `result_evidences` has no unique constraint), and the `is_active` omission from §5.2 step 0's field list (part of **JD3-S-08**). Both were mechanically entailed by confirmed fixes rather than adopted as separate single-judge findings.

**Left as `info`, not fixed:** JD3-S-02 was **superseded** — its substance (whole-group vs participant refusal) was adopted via JD3-04. Still open and unaddressed: **JD3-S-06** (A6 measures uniqueness where DC-10 needs ownership; `evidence_description = 'Handled'` is the unused discriminator — this is the most substantive remaining finding and wants a measurement, not a wording change), **JD3-S-07** (§0.1 vs §0.5 PRMS row-count gap of 410), **JD3-S-08** (T-14 cannot gate in CI — partially addressed by restating it as a manual pre-`apply` check), **JD3-S-09** (the 1:1 tripwire is one-directional; two KP results sharing a handle would hard-delete both), **JD3-S-10** (folded into the DC-9 rewording), **JD3-S-11** (§3.3's audit-record contents and DC-2's verification query still unpinned as to identity source).

## Round 3 — Fix round 2 of 2 (applied 2026-08-05)

Round 2 was spent on measurement rather than wording: three of the remaining suspects were answerable by read-only query, and two of them changed the spec's substance.

| Finding | Measurement | Correction |
| --- | --- | --- |
| **JD3-S-06** — A6 measures uniqueness where DC-10 needs ownership | **Both proposed discriminators are unavailable:** `result_knowledge_products.citation` is empty for **all 2,387** rows, and **zero** rows carry `evidence_description = 'Handled'` — both are set by `processKnowledgeProduct`, which never runs, so JD3-01 invalidates the fix Judge B proposed for JD3-S-06. The discriminator that *does* exist: **title agreement across the pairs that actually get deleted — 2,156 of 2,266 (95.1%) identical, 110 (4.9%) not.** | **A6 re-justified on title agreement.** Same handle + same title is the signature of one publication reported twice; a cited handle would sit on a result whose title describes something else. **DC-10's gate is now three layers** — KP scope (bounds ambiguity), title agreement (corroborates ownership), and the **110 disagreeing pairs surfaced as a distinct review section of the `plan`**. Ownership is declared **not fully automatable**; the 110-pair check is a HITL gate. This converts an unverifiable property over 2,254 groups into a bounded eyeball check. |
| **JD3-S-09** — the 1:1 tripwire is one-directional | **Clean today:** all 2,387 handles resolve to exactly one PRMS KP result; **0** shared handles, and **0** shared handles that also match a TIP/AICCRA row. | **Symmetric tripwire added** anyway, with the failure spelled out: in `{PRMS_A, PRMS_B, TIP}` the survivor is TIP and Gate A protects neither PRMS row, so **both are hard-deleted**. Enforcing one direction leaves the other ending in a two-row irreversible deletion. |
| **JD3-S-07** — §0.1 vs §0.5 disagree by 410 PRMS rows | **Re-measured: 3,947 live PRMS rows, of which 3,947 carry a non-empty `public_link` and 0 do not.** Rev 2's 4,357 was simply overstated. | §0.1's row struck through and superseded with TIP 8,474 · PRMS 3,947 · AICCRA 584. D-dup-18's "0 of 3,947 are handle-format" therefore covers **100%** of the live PRMS population, not a subset — the concern is dissolved rather than mitigated. |
| **JD3-02** (provenance, carried from round 1) | All 2,387 handle evidences created **2026-07-23, 01:36:18 → 01:45:10 UTC**, one distinct day, `created_by` carrying source-system author ids. | Provenance recorded in §0.5 as a **measured fact**: a single nine-minute bulk migration. "Static by construction" is no longer an inference. |

**Not fixed, remaining as `info`:** **JD3-S-08** (T-14 cannot gate in CI) — partially addressed in round 1 by restating T-14 as a manual pre-`apply` check and listing its three mitigations with honest strengths; the underlying fact that no automated gate covers the in-memory/SQL asymmetry is recorded as an accepted risk rather than closed. **JD3-S-11** (§3.3's audit-record contents and DC-2's verification query unpinned as to identity source) — R-RES-003 AC.3 and R-RES-009 AC.4 were corrected in round 1, but §3.3's participant JSON and DC-2's query text were not; carried into `tasks.md` as task-level requirements instead of a further doc edit, since both are implementation surfaces. **JD3-S-10** folded into the DC-9 rewording. **JD3-S-02** superseded by JD3-04's fix.

## Terminal receipt

- **Target:** rev-3 amendment to `results/cross-platform-duplicate-resolution` (`requirements.md` + `design.md`)
- **Rounds:** 1 judgment round, 2 fix rounds (ceiling reached)
- **Findings:** 20 distinct — 9 confirmed by both judges, 11 single-judge
- **Corrected:** 9 confirmed + 6 suspects (3 verified by source in round 1, 3 by measurement in round 2)
- **Accepted as residual risk, explicitly:** JD3-S-08 (no CI gate for the predicate asymmetry), DC-10's 110 title-disagreeing pairs (HITL gate), OQ-10's 370 undetected non-KP duplicates
- **Carried to `tasks.md`:** JD3-S-11
- **Fix-caused defects found:** none — round 2 introduced no new claims, only replaced weaker measurements with stronger ones
- **Model routing:** judges on `opus` (T3), blind fresh contexts; author ≠ auditor satisfied on the context axis, deviation recorded above

**JUDGMENT: APPROVED ✅** — with the three residual risks above named and owner-visible, and OQ-11 still blocking `apply`.

The amendment is now sound enough to write tasks against. What earned that was not the rev-3 draft but the review: **the draft's two load-bearing anchors were both false against the code**, and neither would have been caught by any gate the draft itself declared.
