# Requirements — results / cross-platform-duplicate-resolution

- **Module:** results
- **Spec id:** 2026-08-cross-platform-duplicate-resolution
- **Status:** draft
- **Owner:** ARI server squad (David Casañas)
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — external result ingestion & result lifecycle
- **Linked tickets:** _pending Jira id_ (user story "There is a risk of storing duplicated information from different systems: PRMS, AICCRA, and TIP")
- **Last updated:** 2026-08-05
- **Extends:** commit `21f61a44` (`refactor(save-result-service)`) — the first, partially-working implementation of these rules
- **Depth:** Full · **Bug Mode:** yes (**eleven** confirmed defects, D1–D11 — root causes read from source, and for D11 confirmed by tracing the call path, not only the method body)
- **Rev 3 (2026-08-05) — PRMS publication identity.** D11 below: for PRMS, `results.public_link` is **not** the publication link, so the whole spec was matching the wrong column for one of its three platforms. Rev 2's headline measurement — *"zero cross-platform groups involve PRMS"* — was an artifact of that, not a fact about the data. Re-measured under the corrected identity: **2,359 groups, 2,254 of them involving PRMS**, against rev 2's 116 / 0. Amendment scope: R-RES-001 (identity source), **new R-RES-010**, R-RES-005 (basis), A3 retired, OQ-3 recounted, DC-9/DC-10 added.

---

## 1. Context

Three reporting platforms — **PRMS**, **TIP**, **AICCRA** — write into the same `results` table, distinguished only by `platform_code`. The same publication can be reported from more than one of them, producing duplicated information. An approved user story defines which platform prevails and states the loser "must not be stored".

That story was implemented in commit `21f61a44` (`duplicate-result-priority.util.ts` + `SaveResultService.duplicateResultValidation`). On review, operators reported that **duplicated rows were still present after a sync run**. Root-cause analysis confirms nine distinct defects (§3.0), the dominant one being that the "deletion" is a *soft* delete that leaves the row — and its `public_link` — in `results`.

A second gap is structural, not a coding defect: **PRMS and TIP have automated sync pipelines that call `SaveResultService`; AICCRA does not.** AICCRA data is loaded by a person running a MySQL script, so no code path ever evaluates the rules with AICCRA as the incoming result. The two rules that require AICCRA to *displace* stored PRMS/TIP rows therefore never execute.

A third gap — **D11, found 2026-08-05 during T-11 manual validation — is that the matching key is the wrong column for PRMS.** `PrmsOpenSearchService` writes `item.pdf_link` into `results.public_link` and `item.prms_link` into `external_link`; the publication's **handle** goes to `result_evidences.evidence_url`. Measured: **0 of 3,947** live PRMS `public_link` values are handle-format, against **8,474 of 8,474** for TIP. So for a third of the platforms in scope, deduplication was comparing a CGSpace bitstream URL against other platforms' handles — a comparison that can never match.

This is what produced rev 2's most consequential wrong conclusion. §0.1 of `design.md` reported *"Cross-platform duplicate groups today: 116 · Platforms involved: TIP ↔ AICCRA only. Zero groups involve PRMS"* and drew from it that *"the problem is TIP↔AICCRA, not PRMS; PRMS handling is inherited correctness, not the target."* Under the corrected identity the same scan returns **2,359 groups, 2,254 involving PRMS** — PRMS is not absent from the problem, it is the **dominant** population, and rev 2 was blind to **95%** of it. The defect class is DC-9: a detector that reads the wrong field reports zero and is indistinguishable from a clean corpus.

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
| **DC-9** | **Wrong identity field** — the detector reads a column that does not hold the publication link for some platform, finds nothing, and **a zero result is indistinguishable from a clean corpus**. This is the rev-2 defect: PRMS matched on `pdf_link` and reported 0 groups where 2,254 exist | A **per-platform cross-platform-matchability assertion** (R-RES-001 AC.7): each platform's normalized identity set must intersect at least one other's. A **total** group-count gate cannot see this class — the wrong field yields a plausible 116 rather than an error. Rev 2 *did* record the discriminating per-platform figure ("zero groups involve PRMS") and read it as a fact about the data: **what was missing was an assertion over the metric, not the metric** (JD3-S-10) | ✅ `npm test` for the SQL shape; ⚠️ the intersection assertion needs a populated DB → **T-14** |
| **DC-10** | **False identity from cited evidence** — a handle appearing in a result's evidence list because the result *cites* that publication, not because it *is* it, makes the row a spurious group member and it is hard-deleted | Three layers, because no single one is sufficient: **(1)** identity confined to `indicator_id = 3`, where handles are 1:1 (2,387 results / 2,387 handles) — this bounds *ambiguity*, not ownership; **(2)** **ownership corroborated by title agreement — 2,156 of 2,266 pairs (95.1%)**; **(3)** the **110 disagreeing pairs reported as a distinct review section** of the plan, which is the only real gate on the residual. The two discriminators the mapper would have provided (`evidence_description = 'Handled'`, `result_knowledge_products.citation`) are **unavailable** — measured empty/zero — because the code that sets them never runs | ✅ `npm test` for the scope filter and the refusal branch; ⚠️ ownership is **not fully automatable** → the 110-pair review is a **HITL gate**, per R-RES-008's dry-run; the rates are re-asserted by **T-14** |

**DC-5, re-measured (2026-08-04).** Six cumulative normalization levels were run against live dev data (`TRIM` → lowercase → strip scheme → strip `www.` → strip trailing `/` → unify `dx.doi.org`). **All six find the same 116 duplicate groups**, and exactly one normalized key has more than one raw variant. Cross-platform URL variance is therefore not a source of missed duplicates, the persisted normalized column is dropped (`design.md` D-dup-5), and DC-5's residual risk shrinks accordingly. It remains an accepted risk rather than a closed one — the normalization still runs, and future data can carry variance this snapshot does not.

> **Rev 3 note on that measurement.** It stands as written — normalization still buys no additional detection — but its **scope** was narrower than it appeared: it varied the normalization while holding the *identity field* fixed, so it could only ever have found variance in TIP/AICCRA `public_link` values. It could not have surfaced DC-9, and did not. Varying one dimension of a matching rule proves nothing about the others; DC-9's gate is a per-platform identity assertion precisely because no amount of normalization testing substitutes for it.

**DC-8 was added after Judgment Day round 1**, where it was found as a severe defect that DC-1's declared gate structurally could not detect. **DC-9 and DC-10 were added in rev 3**, after the reported PRMS gap showed that every gate in this table took the identity field as given.

---

### R-RES-001 — Duplicate matching is normalized, platform-crossing, and live-rows-only

- **As a** MEL data steward
- **I want** duplicate detection to compare the *same publication* even when platforms store its URL differently, and to ignore rows that are already deleted or are historical snapshots
- **So that** real duplicates are found and phantom duplicates are not

**Details:**
- Inputs: the incoming row's **publication identity** (R-RES-010 — *not* unconditionally `public_link`), `platform_code`, `indicator_id`, `report_year_id`.
- Behavior:
  - The matching key is a **normalized publication identity**. Which field supplies it is **platform-dependent** and is defined by R-RES-010: `results.public_link` for TIP and AICCRA, the principal handle evidence for PRMS. `external_link` MUST NOT be used on any platform — it points at the source platform portal and never matches across platforms.
  - Normalization is applied to **both** sides of the comparison (incoming and stored), not just the incoming value, and is the **same expression regardless of which field supplied the value** — a per-platform identity source must not become a per-platform normalization.
  - Normalization SHALL cover, at minimum: trim, lowercase scheme+host, drop `www.`, unify `dx.doi.org`/`doi.org`/`https://doi.org/`, strip a single trailing `/`, strip empty query/fragment. It SHALL NOT strip path case (handles are case-sensitive) and SHALL NOT strip meaningful query parameters.
  - A row with no resolvable identity means "no link" → no deduplication, on every platform.
  - Candidates MUST be restricted to `is_active = true` **and** `is_snapshot = false` **and** `platform_code IN (PRMS, TIP, AICCRA)`.
- Outputs: internal; observable via R-RES-009's report.
- Errors: none new.
- Permissions: n/a (runs inside sync).

**Acceptance criteria:**
- [ ] AC.1 — Two rows whose identities differ only by scheme, `www.`, trailing slash, `dx.doi.org` vs `doi.org`, or surrounding whitespace ARE detected as the same publication.
- [ ] AC.2 — Two rows whose identities differ in path case or in a non-empty query parameter are NOT detected as the same publication.
- [ ] AC.3 — A row with `is_active = false` is never returned as a duplicate candidate.
- [ ] AC.4 — A row with `is_snapshot = true` is never returned as a duplicate candidate.
- [ ] AC.5 — `external_link` equality alone never produces a duplicate.
- [ ] AC.6 — **The normalization applied to a PRMS handle taken from evidence is byte-identical to the one applied to a TIP `public_link`.** A TIP row storing `https://hdl.handle.net/10568/141764` and a PRMS row whose principal handle evidence is `https://hdl.handle.net/10568/141764/` ARE detected as the same publication.
- [ ] AC.7 — **For every platform in scope, its normalized identity set MUST intersect at least one other platform's identity set.** A platform whose identities match nothing anywhere is a DC-9 signal and MUST be reported as a fault, never silently treated as "no duplicates" (asserted by T-14 against a populated DB).

  *Rev 3, JD3-S-01 — this AC was rewritten because its first form could not detect the defect it exists for.* It originally read *"the field the scan reads is non-empty for a material share of that platform's live rows."* Under rev 2 PRMS `public_link` was non-empty for **3,947 of 3,947** live rows — a 100% share — and contributed 3,947 identities, **none of which could ever match**. Non-emptiness is orthogonal to matchability, and only the handle-format rate (0%) discriminated. A rate assertion cannot be generalised either: AC.6 forbids a format filter on `public_link`, so TIP and AICCRA have no format predicate at all, and D11 recurring on either of them would again yield a non-zero count and pass. **Intersection is the weakest assertion that actually fails on the rev-2 corpus** — PRMS ∩ TIP was 0 — which is the test any DC-9 gate must pass to be worth declaring.

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

- **Consistency gate.** A group SHALL be classified `UNRESOLVED_CONFLICT` — reported in full, **nothing deleted, no omission recorded** — when the pairwise verdicts admit **no single consistent ordering** of the group's platforms. See **OQ-9**: the contradiction is in the acceptance criteria, not in the implementation.

  **Rev 3 correction (JD3-05) — the earlier wording was wrong and rev 3 is what made it dangerous.** This gate previously read *"if any row both **wins ≥1 pair and loses ≥1 pair**"*. That fires on the middle element of any consistent total order: in `{AICCRA CS, PRMS KP, TIP KP}` the ordering AICCRA > TIP > PRMS is coherent and fully resolvable, yet TIP wins one pair and loses another. The shipped resolver already rejects the win-and-lose formulation explicitly (`duplicate-result-priority.util.ts:45-48`) and implements an ordering check instead, so **requirement and code have disagreed since rev 2** — harmlessly, because PRMS was in zero groups and no three-platform composition existed. Rev 3's own numbers make roughly **11–22 three-platform groups live**, so the divergence now decides real deletions: the old wording would refuse them all, the code resolves them. The normative text is corrected to the code's ordering semantics rather than the reverse, because the code's reading is the correct one.

  **The "measured cost: zero" figure attached to this gate is a rev-2 number and has NOT been re-measured.** It described 116 groups containing no PRMS row. Its true cost over the 2,359-group corpus is unknown and MUST be measured before `apply` — a stated-zero baseline that turns out non-zero is exactly how the previous two revisions' tripwires got waived.
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
- [ ] AC.3 — Every deletion is preceded by an audit record containing `result_id`, `result_official_code`, `platform_code`, `indicator_id`, `report_year_id`, the raw + normalized **publication identity**, and its **source** (`PUBLIC_LINK` | `HANDLE_EVIDENCE`) per R-RES-009 AC.4. *(Rev 3, JD3-03: this said "raw + normalized `public_link`", which for a PRMS participant does not exist as an identity — R-RES-010 AC.2 forbids it. The audit record is the only surviving trace of a hard delete, so a wrong field here is unrecoverable ambiguity.)*
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
- [ ] AC.1 — Two rows with the same `platform_code` and the same normalized identity produce no winner, no deletion, and no omission.
- [ ] AC.2 — Such a group is still *reported* (informational) but flagged `SAME_SYSTEM_IGNORED`.

*Rev 3: the basis of this requirement changed for PRMS. "Same normalized link" was `public_link`; for PRMS it is now the normalized principal handle (R-RES-010), so PRMS↔PRMS ambiguity is detected by handle. The rule is unchanged — the population it applies to is not.*

#### Scenario: Same-system duplicates are reported, never corrected

- GIVEN two PRMS Knowledge Product results whose principal handle evidence is the same normalized handle
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
  - Scans for groups spanning more than one of PRMS/TIP/AICCRA on the **normalized publication identity of R-RES-010** — `results.public_link` for TIP/AICCRA, the principal handle evidence for PRMS — restricted to `is_active = true` and `is_snapshot = false`. *(Rev 3, JD3-03: this bullet said "normalized-`public_link` groups", which is false for the platform supplying 95% of the groups. An implementer building the sweep against the old wording would have reproduced D11 exactly, and AC.8 below could never have passed.)*
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
- [ ] AC.4 — **The audit record names the identity source per participant** (`PUBLIC_LINK` or `HANDLE_EVIDENCE`) alongside the raw and normalized value. Under a hard delete this is the only way to reconstruct *why* a row was considered a member of its group.

---

### R-RES-010 — PRMS publication identity comes from its publication handle

> **Rev 4 (2026-08-05) — the incoming-side field is corrected, measured against the live wire payload.** Rev 3 specified the incoming identity as `ExternalMappersDto.evidence.evidence[]`, populated by reviving `processKnowledgeProduct`. **That mapper reads `item.result_knowledge_product_array`, which does not exist on the PRMS searcher payload** — 0 of 13,507 real staged rows, and absent from a live KP item. The correct source is **`item.knowledge_product_summary.handle`**, a purpose-built scalar. Measured over 400 live items (277 KP): present and handle-format on **277/277**, exactly one handle per KP, and identical to the single handle in that KP's `evidences[]` on 277/277. Full evidence in [`./execution.md`](./execution.md) → *Pivot Record: T-13 — RESOLVED BY OBSERVATION*. This is the **fourth** correction of the same root cause in this spec, and the first to be closed by observing the wire rather than reading code.
>
> **The stored side is unchanged** — it still reads `result_evidences.evidence_url`. The two sides now read *different fields of different systems* that carry the same handle, which changes what T-15 can assert (see the note under its AC list).

- **As a** MEL data steward
- **I want** a PRMS result compared on the publication handle other platforms also store, not on the PDF link only PRMS stores
- **So that** PRMS duplicates are actually detectable instead of reporting as absent

**Details:**
- **Identity source, per platform.** This is the whole requirement; everything else follows.

  **The identity field is per-platform AND per-side.** The stored side (the sweep, reading rows already in `results`) and the incoming side (the sync path, reading the payload before the row exists) read different fields for PRMS, because the payload is not the database.

  | Platform | Side | Identity field | Format filter | Measured coverage |
  | --- | --- | --- | --- | --- |
  | TIP | both | `results.public_link` / `dto.public_link` | **none** | 8,474 / 8,474 rows are handle-format anyway |
  | AICCRA | both | `results.public_link` / `dto.public_link` | **none** | 315 / 584 handle-format — a format filter here would **drop 269 rows out of scope**, so it MUST NOT be applied |
  | PRMS | **stored** | `result_evidences.evidence_url` | **handle format, required** | 2,387 KP results, 2,387 identities |
  | PRMS | **incoming** | **`item.knowledge_product_summary.handle`** (rev 4) | **handle format, required** | **277 / 277** live KP items carry it, all handle-format |

- **PRMS identity predicate, STORED side — all four conditions, conjunctively:**
  1. `result_evidences.evidence_role_id = 1` (`EvidenceRoleEnum.PRINCIPAL_EVIDENCE`);
  2. `COALESCE(is_private, FALSE) = FALSE`;
  3. `COALESCE(is_active, TRUE) = TRUE` — measured to change nothing today (2,792 rows either way), and required anyway so a retracted evidence cannot confer identity;
  4. the **normalized** value matches the canonical handle shape `hdl.handle.net/<digits>/<digits>` exactly.

- **PRMS identity predicate, INCOMING side (rev 4) — two conditions:**
  1. the item is a Knowledge Product — `indicator_category.code = 6` (`ResultTypeEnum.KNOWLEDGE_PRODUCT`, which homologates to `IndicatorsEnum.KNOWLEDGE_PRODUCT = 3`; **the payload uses 6, not 3** — an earlier probe of this spec tested 3 and was wrong);
  2. the **normalized** `knowledge_product_summary.handle` matches the canonical handle shape.

  The role/privacy/active conditions have **no incoming counterpart and no longer need one**: `knowledge_product_summary` is not an evidence list, so there is no role to check, nothing to mark private, and nothing to retract. Rev 3 recorded the missing three conditions as an *accepted risk* of reading an evidence array; reading the dedicated field **retires that risk rather than accepting it** — the handle-format filter is now the only predicate on either side, and both sides genuinely share it.

  **`evidences[].link` is NOT the incoming source, and the reason is measured.** A KP item's `evidences[]` does carry the same handle (277/277), so it would work for KP — but **41 of 123 live non-KP items carry a handle-format link in `evidences[]`**, and those are publications the result *cites*. Using `evidences[]` would make DC-10 a filtering problem; using `knowledge_product_summary` makes KP-only scope a **property of the field**, since it exists only for the result's own publication.
- **PRMS identity is confined to `indicator_id = 3` (KNOWLEDGE_PRODUCT).** On a KP row the handle *is* the result's own publication; on a non-KP row a handle in the evidence list is a publication the result **cites**, and treating a citation as identity is DC-10 — a hard delete driven by someone else's handle. Measured, and this is what makes the scope decidable rather than a preference:

  | Property | KP only (`indicator_id = 3`) | All indicators |
  | --- | --- | --- |
  | Groups found | 2,359 | 2,622 |
  | PRMS results with >1 handle (multi-identity) | **0** | 154 |
  | PRMS results landing in >1 group | **0** | 132 |
  | Cross-year groups needing review | 56 | 260 |

  KP handles are **1:1 by measurement** — 2,387 results, 2,387 distinct handles, no exceptions. Every multi-identity row in the corpus is non-KP.
- **The format filter applies only to the PRMS side.** It is what excludes the non-handle principal evidence (the "x" attachment) that KP rows carry alongside the handle. It MUST NOT be applied to `public_link`, per the AICCRA measurement above.

- **The two sides of the comparison have different sources, and one of them must be built (JD3-01/JD3-02).**

  | Side | Where the handle comes from | State today (rev 4, measured) |
  | --- | --- | --- |
  | **Stored** (the sweep) | `result_evidences` rows already in the database | **2,792 rows exist**, and their writer is **not on the PRMS sync path** — `SaveResultService.saveAllSections` never touches evidence, and the only production writers are the AI/bulk-upload path and STAR authoring. Provenance is a legacy load or a superseded sync version. Treat this corpus as **static**, not maintained. **Rev 4 explains why:** the sync path never carried the handle because nothing read the field that has it. This confirms RB-9 rather than merely restating it. |
  | **Incoming** (the sync path) | **`item.knowledge_product_summary.handle`** on the searcher payload | **Present and unread.** The wire carries it on 277/277 live KP items; ARI's `ResultResponseMapper` never declared the field, so `processData` drops it. Nothing needs to be *built* on the PRMS side — a field needs to be **read**. |

  **Rev 3's two successive errors here, both now closed by observation.** It first asserted the incoming side "already carries" the handle in `ExternalMappersDto.evidence.evidence[]` — read off TIP's mapper, which does populate that field. Corrected to "populate it by reviving `processKnowledgeProduct`" — but **that mapper reads `item.result_knowledge_product_array`, which is not on the wire at all** (0 of 13,507 staged rows; absent from a live KP item). Both errors were true of *some* code and false of the path that runs. The requirement no longer depends on `processKnowledgeProduct` in any form; reviving it is **forbidden**, because it also writes `body.knowledgeProduct`, which has a live reader that would overwrite `result_knowledge_products.citation`/`type` on 2,388 PRMS rows per sync (measured: `citation` populated on 8,476/8,476 TIP rows and **0/2,388 PRMS**, so §0.5's provenance baseline is exact and destroying it is a real loss).

  **Why the payload alone is sufficient, and persisting is not required here.** With the field read, a re-synced PRMS row resolves its identity in memory, is judged a loser, and is **omitted — never created**. That closes the hole where `apply` deletes a PRMS row, PRMS re-creates it, and the duplicate becomes permanently undetectable. Persisting the handle as evidence would additionally let the *sweep* see PRMS rows created after this change, but it would also start writing evidence rows — a data change outside this spec's scope. See **OQ-12**.
- **PRMS never wins a cross-platform pair.** Under R-RES-002's rule table PRMS is the losing side of Rule 1 (TIP prevails), Rule 2 (AICCRA prevails) and Rule 3 (AICCRA CS prevails). Measured counterparts: TIP 2,249 pairs, AICCRA 16. So this requirement can only ever cause **PRMS** rows to be deleted — it cannot put a TIP or AICCRA row at risk that was not already at risk. This is a safety invariant and is asserted as one.
- **A result that resolves to more than one identity is refused, not resolved.** The **result itself** is classified `UNRESOLVED_CONFLICT`: never deleted, never counted as an omission, and reported in full. The **remaining members of each group it touches resolve normally** — a row that lost to every survivor lost regardless, and freezing it because an unrelated participant is ambiguous would be under-deletion (this preserves R-RES-005/D-dup-9's "freeze those rows only, not the group"). Group membership is a partition only when identity is 1:1; multi-identity makes it a graph, and the rules were approved for partitions.

  **This applies to the sync path too, but there it is a net rather than live logic (corrected in rev 4).** When the incoming payload resolves to more than one identity the sync path MUST refuse it: create or update the row normally, count no omission, and delete **nothing** — never pick the first handle. *Rev 3 originally called this "a standing net for data that does not yet exist"; round 2 (JD3-S-03) overturned that to "reachable today", reasoning that `processKnowledgeProduct` loops a `PrmsKnowledgeProductDto[]` and a two-KP item yields two handles. **Rev 4 restores the original reading on firmer ground:** that array is not on the wire at all, and the field the sync path actually reads — `knowledge_product_summary.handle` — is a **scalar**, so multi-identity is unreachable by construction on the incoming side (277/277 live KP items carry exactly one handle). Keep the refusal, because a scalar today is a fact about the payload rather than a guarantee, but do not describe it as guarding a live scenario.* On the **stored** side (AC.8) the refusal remains genuinely load-bearing — that corpus is an evidence array.

- **Stored-side measured cost: zero** — all 2,387 stored KP handles are 1:1. **Incoming-side cost: zero, and now structural rather than measured (rev 4)** — `knowledge_product_summary.handle` is a **scalar**, so an incoming payload cannot present two identities through it. Rev 3 called this cost "unmeasured, because it depends on how often PRMS reports a multi-KP item"; that concern was an artifact of reading an *array* (`PrmsKnowledgeProductDto[]`) that is not on the wire. Confirmed over 400 live items: exactly one handle per KP, 277/277.
- Outputs: internal; observable in R-RES-009's report via the per-participant identity source (AC.4).
- Errors: none new.

**Acceptance criteria:**
- [ ] AC.1 — A PRMS KP result whose handle equals a TIP row's normalized `public_link`, same report year, IS detected as a cross-platform duplicate. **Stored side:** the handle comes from its principal handle evidence. **Incoming side:** from `knowledge_product_summary.handle`.
- [ ] AC.2 — A PRMS result's `public_link` (its `pdf_link`) NEVER contributes an identity — matching it against anything is forbidden on PRMS. *Measured structurally: 0 of 400 live items have a handle-format `pdf_link`, so it cannot match by construction.*
- [ ] AC.3 — **(stored side only)** A PRMS evidence that is private, non-principal (`evidence_role_id <> 1`), inactive, or not handle-format contributes NO identity. Four separate negative cases. **The incoming side has no counterpart and needs none** — `knowledge_product_summary` is not an evidence list, so there is no role, privacy or retraction state to filter (rev 4 retires rev 3's accepted-risk asymmetry).
- [ ] AC.4 — **(stored side only)** A PRMS KP result with two principal evidences — one handle-format, one not — yields **exactly one** identity, the handle.
- [ ] AC.5 — A PRMS result yields no identity when it is not a Knowledge Product, even when it carries a qualifying handle. **Stored side:** `indicator_id <> 3`. **Incoming side:** `indicator_category.code <> 6` — note the payload uses `ResultTypeEnum` (KP = **6**), not ARI's post-homologation `IndicatorsEnum` (KP = 3). *Live relevance: 41 of 123 non-KP items carry a handle-format link in `evidences[]`, i.e. cited publications — this AC is what keeps DC-10 out.*
- [ ] AC.6 — An AICCRA row whose `public_link` is not handle-format is STILL in dedup scope (guards the 269 rows a misplaced format filter would drop).
- [ ] AC.7 — **Invariant:** no TIP or AICCRA row is ever scheduled for deletion by a rule whose pair partner is a PRMS row.
- [ ] AC.8 — A PRMS result carrying two qualifying handles is itself classified `UNRESOLVED_CONFLICT` and never appears in any `toDelete`; **the other members of each group it touches still resolve and are still deleted if they lost.**
- [ ] AC.9 — An **incoming** PRMS payload that resolves to more than one identity is refused: the row is created/updated, no omission is counted, and nothing is deleted. It MUST NOT resolve on the first handle found.
  > **Rev 4 — this is now a defensive net, and it must be described as one.** Rev 3 justified AC.9 as *"live logic, not a net"* because `processKnowledgeProduct` loops a `PrmsKnowledgeProductDto[]` and a two-KP item would yield two handles. **That array is not on the wire.** Reading the scalar `knowledge_product_summary.handle` makes multi-identity **unreachable by construction** on the incoming side. Keep the refusal — a scalar field is a current fact about the payload, not a guarantee, and the branch costs nothing — but **no PR may claim it guards a live scenario.** The refusal remains genuinely load-bearing on the **stored** side (AC.8), where the corpus is an evidence array.
- [ ] AC.10 — **The PRMS sync payload actually carries the handle, and ARI reads the field that has it.** A `processData` run over a real KP item yields an incoming identity equal to that item's `knowledge_product_summary.handle`.
  > **Rev 4 — AC.10 may NOT be closed by a unit test alone, and rev 3's version of it was closed by a fixture that lied.** The attempt-1 test asserted this against `result_knowledge_product_array`, a field the Implementer added to the DTO and supplied in its own fixture — green suite, zero wire coverage. **Two artifacts are required:** (1) a unit test over `processData` proving ARI propagates the field, and (2) **a recorded observation of the live payload** — the field list of a real KP item — attached to this spec. Requirement (2) is what makes this AC falsifiable; a mapper test can only ever prove ARI is self-consistent. Baseline recorded 2026-08-05: 277/277 live KP items carry it (`execution.md` → *Pivot Record: T-13 — RESOLVED BY OBSERVATION*).

#### Scenario: The reported gap — a PRMS duplicate becomes visible (regression, D11)

- GIVEN a live PRMS Knowledge Product result whose `public_link` is a CGSpace `pdf_link`
- AND whose principal, non-private, active evidence is `https://hdl.handle.net/10568/141764`
- AND a live TIP result in the same report year whose `public_link` is `https://hdl.handle.net/10568/141764`
- WHEN duplicate detection runs
- THEN the two rows are one cross-platform group and TIP prevails under Rule 1
- AND the PRMS row is the loser
- BUT it must NOT have been matched on `public_link`, which cannot match by construction
- AND IT MUST record `HANDLE_EVIDENCE` as the PRMS participant's identity source in the audit record

#### Scenario: A cited handle on a non-KP result confers no identity (DC-10)

- GIVEN a live PRMS `INNOVATION_DEV` result whose principal evidence list contains `https://hdl.handle.net/10568/141764`
- AND a live TIP Knowledge Product result whose `public_link` is that same handle
- WHEN duplicate detection runs
- THEN no cross-platform group is formed
- BUT the PRMS row must NOT be scheduled for deletion
- AND IT MUST NOT appear as a participant in any group

**Out of scope:** extending identity to non-KP PRMS indicators — **370 real duplicate PRMS rows across indicators 1, 2, 4 and 6 are knowingly left undetected** by the KP scope. This is a measured, accepted limitation, not an oversight; see OQ-10.

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
| `result_evidences` | **No change — read-only, new join (rev 3).** Becomes the identity source for PRMS (R-RES-010) via `result_id`, filtered on `evidence_role_id`, `is_private`, `is_active` and handle format. No column is added and no row is written or deleted by this spec. **`evidence_url` is `text`**, so like `public_link` it cannot be indexed for this predicate and none is wanted — the join is over 3,394 PRMS rows with evidence. |
| Index | **None.** At 14,682 rows a scan is free; the rev-1 performance NFRs were sized for a table two orders of magnitude larger. The rev-3 evidence join does not change this: it adds ~3.4k joined rows, and the group scan already reads the table. |
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
- **PRMS / OpenSearch** — `src/domain/tools/open-search/prms/prms.opensearch.service.ts:231`. **Rev 3: this is now the dominant path, not inherited correctness.** 2,254 of 2,359 groups involve PRMS, and PRMS loses every cross-platform pair it enters (R-RES-010), so PRMS is where nearly all deletion volume lands. Hard-deleted results must be removed from the OpenSearch index.

  **The mapper DOES change, contrary to rev 3's first draft (JD3-01) — but NOT in the way rev 3 then specified (rev 4).** `processData` must read **`item.knowledge_product_summary.handle`** for KP items and carry it into the payload's identity slot (T-13). It must **NOT** call `processKnowledgeProduct`: that method reads `item.result_knowledge_product_array`, absent from all 13,507 measured payloads, *and* writes `body.knowledgeProduct`, which has a live reader that would overwrite `result_knowledge_products.citation`/`type` on 2,388 PRMS rows per sync. What does **not** change: `public_link = pdf_link` and `external_link = prms_link` stay exactly as they are — this spec reads a different field for matching rather than rewriting what PRMS stores. **Blast radius:** the DTO field carrying the identity has **no production reader other than R-RES-010's own identity resolution**, so populating it is inert on every path except the one this spec adds — and `dto.knowledgeProduct` must remain `undefined`, asserted by a test.
- **AICCRA** — no code integration exists (by design). The sweep is the substitute; the loader script's owner must be told to run it after each load.
- **STAR (`client/`)** — no change required. Results disappearing from the API are already handled as absent results, but the protection rule (R-RES-004) is what keeps linked ones visible. No STAR spec needed.
- **Socket.IO** — no new events.

---

## 8. Assumptions, dependencies, risks

**Assumptions**
- A1 — AICCRA rows are historical mirror data: re-loadable from source, containing no STAR-authored content. This is what makes hard delete acceptable.
- A2 — PRMS and TIP rows are likewise re-syncable from their source systems.
- ~~A3~~ — **RETIRED, rev 3 (2026-08-05).** *"`public_link` is the only cross-platform publication identifier available."* **False for PRMS**, and it was the assumption every other measurement in this spec inherited. Measured: 0 of 3,947 live PRMS `public_link` values are handle-format; the handle lives in `result_evidences.evidence_url`. Replaced by A5–A7. `external_link` remains platform-local — that half of A3 stands and is why it is still excluded on every platform.
- **A5** — The **canonical handle host is `hdl.handle.net`** across all three platforms, so a single normalization brings all identities to `hdl.handle.net/<prefix>/<suffix>` and no handle-extraction step is needed. Verified for TIP (8,474/8,474 handle-format). **A CGSpace-hosted variant (`cgspace.cgiar.org/handle/…`) would NOT normalize to the same key** — none is present today, and T-14 is what would catch its arrival.
- **A6** — On a PRMS **Knowledge Product** row, the principal handle evidence is the result's *own* publication rather than one it cites. **Measured by title agreement: of the 2,266 cross-platform pairs this identity forms, 2,156 (95.1%) have an identical title on both sides; 110 (4.9%) do not.** Same handle *and* same title is the signature of one publication reported twice, which is precisely what deduplication targets; a merely cited handle would sit on a result whose title describes something else.

  *Rev 3 round 2 (JD3-S-06) — this assumption previously cited "2,387 results / 2,387 handles, zero exceptions". A judge correctly rejected it: that measures **uniqueness**, and a row carrying one **cited** handle is fully consistent with 1:1. Both discriminators available in the mapper turned out to be unusable against real data — `result_knowledge_products.citation` is **empty for all 2,387** rows, and **zero** rows carry `evidence_description = 'Handled'` (both are set by `processKnowledgeProduct`, which never runs — see D11). Title agreement is the discriminator that does exist, and it is measured over the population that actually gets deleted rather than over the corpus as a whole.*

  **The 110 disagreeing pairs are the residual DC-10 exposure, and they are bounded and reviewable.** They MUST be surfaced as a distinct section of the `plan` output so the human reviewer sees them separately rather than inside 2,359 groups. This converts an unverifiable property over 2,254 groups into a 110-row eyeball check.
- **A7** — On a PRMS **non-KP** row a handle in the evidence list may be a publication the result merely cites. This is why R-RES-010 is scoped to KP, and it is the assumption behind knowingly leaving 370 detectable duplicates unresolved (OQ-10).
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
| OQ-3 | **Report-year scope.** R-RES-006 keeps auto-deletion same-year and reports cross-year as `CROSS_YEAR_REVIEW`. ~~Measured: 11 of the 116 live groups span 2 years.~~ **RECOUNTED rev 3: 56 of the 2,359 groups span >1 year** (the all-indicator variant would have been 260). Same business question, five times the manual-review queue. Confirm this is the intended reading. Non-blocking: the assumed default preserves today's behavior. | MEL / product owner | before `apply` |
| OQ-4 | **Retroactive cleanup.** Soft-deleted duplicates created by the current buggy path — **measured: 21 AICCRA rows** (`is_active = 0`, `result_status_id = 8`): leave, or hard-delete them in the sweep? Assumed **leave as-is** and excluded from matching. | ARI ops | before rollout |
| **OQ-7** | **7 inactive STAR link rows** would be destroyed by a hard delete of their mirror — the live delete function clears `link_results` with no `is_active` predicate, and R-RES-004 protects only active links. Extend protection to inactive links, or accept the loss? Recommend **extend**: a soft-deleted link is recoverable today and would stop being so. | Engineering lead | **blocks `apply`** |
| **OQ-8** | **Live machine-token exposure, independent of this spec.** All 4 `app_secrets` rows have zero `app_secret_host_list` entries (so the origin check is skipped), and `app_secret_id 8` resolves to a user holding `System Admin`. Who owns remediating this? | Security / eng lead | before Deploy 2 |
| **OQ-10** | **370 detectable PRMS duplicates are knowingly left unresolved.** R-RES-010 scopes identity to KP because non-KP handles may be citations (A7). Measured cost: 405 non-KP PRMS results carry a qualifying handle, and **370 of them do match a live TIP/AICCRA row**. Extending the scope would find them, at the price of 154 multi-identity rows, 132 multi-group refusals, and DC-10 exposure on every one. Recommend **hold at KP** and revisit as a separate spec once the KP sweep has run — the 370 are not going anywhere, and the KP population is 2,254 groups of unambiguous work. Needs MEL confirmation that leaving them is acceptable. | MEL / product owner | before rollout (non-blocking for `plan`) |
| **OQ-12** | **Should the sync path PERSIST `dto.evidence`?** Today `SaveResultService` ignores it, so the field is written by TIP's mapper and read by nobody, and PRMS rows created after this spec will carry no stored handle — invisible to the **sweep**, though still caught by the **sync path** at ingest (which is when duplicates actually arise). Persisting it would make the stored corpus self-maintaining, but would also start writing evidence rows for ~8,476 TIP results — a data change well outside deduplication. Recommend **defer**: take the payload-only fix now (T-13), and treat persistence as its own spec with the TIP blast radius assessed properly. **Consequence of deferring, stated plainly:** the stored PRMS identity corpus (2,792 rows) is static and will slowly cover a smaller share of PRMS results over time. | Engineering lead | before rollout |
| **OQ-11** | **The blast radius grew 22×** — `apply` now targets 2,254 PRMS-involving groups where rev 2's runbook was written for 234 TIP/AICCRA rows. PRMS is re-syncable (A2), which is the mitigating half; the other half is that the human review artifact that gates DC-5 is now a 2,359-group document. Does the operator want `apply` batched (e.g. by report year, or PRMS↔TIP first) rather than one sweep? Recommend **batching by `report-year`**, which the existing filters already support with no code change. | ARI ops | **blocks `apply`** |

---

## 10. Sign-off

- [ ] Engineering lead — _pending_
- [ ] MEL / product owner — _pending_ (required: OQ-1, OQ-3, **OQ-10**)
- [ ] **Rev 3 re-sign-off — required.** The identity change moves the deletion population from 234 rows to 2,254 groups. Sign-off given against rev 2's measured baseline does not carry over.
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
| **R-RES-010** | **PRMS identity from principal handle evidence, scoped to KP** | **D11** |
| NFR-RES-001..005 | Safety, performance ×2, observability, authorization | — |

**Defect index.** D1–D10 are the rev-1/rev-2 defects enumerated in §3.0 and `design.md` §0.4. **D11 (rev 3):** duplicate detection read `results.public_link` for PRMS, which holds the `pdf_link`, not the publication handle — so PRMS was structurally excluded from cross-platform matching and reported as having zero duplicates while 2,254 groups involve it.
