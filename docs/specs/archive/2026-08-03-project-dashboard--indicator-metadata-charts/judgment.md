# Judgment Day — Design Review Ledger

- **Target:** `design.md` (draft, 2026-07-30) against `requirements.md`, `proposal.md`, `mockup/index.html`, and the live codebase
- **Mode:** `judgment_day` — two blind, parallel, read-only judges, identical scope and criteria
- **Round:** 1 of max 2
- **Judges:** Judge A, Judge B — independent contexts, neither saw the other's findings, neither saw the design author's reasoning
- **Author ≠ auditor:** the design was authored in the orchestrator context; both judges ran in fresh isolated contexts
- **Status:** **ledger frozen — awaiting user decision on round-one correction**
- **Date:** 2026-07-30

---

## Tally

| Class | Count |
| --- | --- |
| **SEVERE — confirmed by both judges** | **4** |
| SEVERE — reported by one judge (suspect, no auto-fix) | 1 |
| WARNING (info) | 8 |
| SUGGESTION (info) | 4 |
| Contradictions between judges | **0** |

The judges did not contradict each other anywhere. Where only one reported a finding, the other was silent — not opposed.

---

## Confirmed SEVERE — both judges, independently

### F-1 — The pool arithmetic is wrong: baseline is 8 queries, not 6, so DD-1 lands at 12, over the limit

- **Where:** `design.md` §1 (exec summary + table), §3 diagram, §12 DD-1, §14 R-4; inherited into `requirements.md` §2 and R-1, and `proposal.md` §3.
- **Claim:** "Total goes 6 → 10, which sits *at* the pool limit."
- **Evidence:** `agresso-contract.repository.ts:1172-1186` awaits six *methods*, but `getGeoScopeReport` runs its own nested `Promise.all` of **three** queries at `:739-743` (summary, regions, countries-matrix). The nested promises are entered synchronously by the outer one, so **8** queries are in flight. 8 + 4 = **12** — two over `connectionLimit: 10`.
- **Impact:** DD-1's entire justification is falsified by the code it cites. The implementer would build the consolidation believing the pool risk is closed when it is not. Both judges additionally note that even *at* 10 a single dashboard request monopolises the whole pool, so the "at limit" framing understates the problem either way.
- **Correction:** Re-baseline to 8 citing `:739`. State the post-change total as 12. Then either consolidate further, or promote R-4 (`poolSize` / `extra.connectionLimit`) from a deferred recommendation to a **prerequisite**. Fix `requirements.md` §2 and R-1 in the same pass.

### F-2 — The OICR fact table is `result_oicrs` (plural)

- **Where:** `requirements.md` §4.1 row 4; `design.md` §4 and §6.1 Q2.
- **Evidence:** `result-oicr/entities/result-oicr.entity.ts` declares `@Entity('result_oicrs')`. The folder is singular, the table is plural. No `result_oicr` table exists.
- **Impact:** Q2 fails at runtime with `ER_NO_SUCH_TABLE`. This is precisely defect class **DC-4**, which §4.1 exists to prevent — and §4.1 asserts it was verified from decorators and lists exactly three irregular names, so an implementer has no reason to re-check. **The "verified source map" was wrong while claiming completeness**, which is worse than not having claimed it.
- **Correction:** Fix to `result_oicrs`; make the irregular list four entries; re-derive the whole §4.1 table from decorators rather than trusting the prior pass.
- **Both judges independently re-verified the other 13 names as correct.**

### F-3 — DD-4 rests on a false premise; the enums already exist and the Training id is seeded

- **Where:** `design.md` §3.1, §6.3, §6.4, §12 DD-4; `requirements.md` A-2, OQ-1.
- **Claim:** format/length ids are "bare literals in client templates" and must become new enums; the Training id "is asserted nowhere, so hardcoding would be a guess".
- **Evidence:** All three claims are false.
  - `session-formats/enums/session-format.enum.ts` **already exists** — `SessionFormatEnum { INDIVIDUAL = 1, GROUP = 2 }`, already imported by migration `1731441738756`.
  - `session-lengths/enum/session-lengths.enum.ts` **already exists** — `SessionLengthEnum { SHORT_TERM = 1, LONG_TERM = 2 }`.
  - Seed migration `1727119632564-InsertDataControl.ts` asserts every id: `session_types (1,'Training'),(2,'Engagement')`; `session_formats (1,'Individual'),(2,'Group')`; `session_lengths (1,'Short-term'),(2,'Long-term')`; `gender (1,'Male'),(2,'Female'),(3,'Non-binary')`; `degrees (1,'PhD'),(2,'MSc'),(3,'BSc'),(4,'Other')`. Migrations are append-only, so this is *stronger* authority than the client templates the design cites.
  - Repo precedent runs the other way: `degrees/enum/degrees.enum.ts` and `policy-types/enum/policy-types.enum.ts` are enums whose doc comments cite that very migration.
- **Impact:** §3.1 instructs the implementer to create **duplicate** enum files, forking constants that already exist in the same source tree. §6.3's Training-by-name join is fragile (`session_types.name` is `TEXT`; a label edit silently empties the Degree chart with no error) and was adopted to avoid a "guess" that is not a guess. It also partly answers A-1/B-D2's "confirm lookups are populated".
- **Correction:** Delete the two new enum files from §3.1; import the existing ones. Add `SessionTypeEnum { TRAINING = 1, ENGAGEMENT = 2 }` following the `DegreesEnum` doc-comment convention, citing migration `1727119632564`. Rewrite DD-4 and §6.3; correct `requirements.md` A-2 and downgrade the seeded half of A-1.

### F-4 — `visibleLimit` semantics are inverted: leaving it unbound *engages* the expansion machinery

- **Where:** `design.md` §7.2, §14 R-5.
- **Claim:** "`visibleLimit` is left unbound → defaults to `null` → today's behaviour, so DD-12/DD-14's expansion machinery is **not** engaged."
- **Evidence:** `null` is precisely the **expanded** state (`project-dashboard-card.component.ts`):
  - `canExpand = items().length > COLLAPSED_ITEM_LIMIT` (5)
  - `expandedOverlay = visibleLimit() === null && canExpand()`
  - `layoutItems = visibleLimit() === null ? items().slice(0, 5) : visibleItems()`
  - `toggleLabel = visibleLimit() === null ? 'Show less' : 'Show more'`
  - template `:65` renders the toggle under `@if (canExpand() && variant() === 'card')`
- **Impact:** Any new card with **more than 5 categories** renders an out-of-flow `absolute inset-0 overflow-y-auto` overlay, an `invisible`/`aria-hidden` duplicate underneath, and a permanently-stuck **"Show less"** button wired to an `expandToggled` output the new host never handles. Because that overlay **is** the T-09 scroll container, R-5's assurance is exactly inverted: the spec would **widen** the known keyboard gap, violating NFR-IMC-002's explicit "MUST NOT widen that gap".
- **The "low-cardinality" premise is unsafe and self-contradicted.** §7.3 itself specifies a `rows` layout "for 5+ categories". Seeded lookups are safe (gender 3, degrees 4, policy_stage 3, formats/types 2), but the three **CLARISA-synced** lookups are not: `clarisa_innovation_readiness_levels` carries a `level` column over the IRL 0–9 scale. The mockup shows readiness at exactly 5 rows — the boundary, not a bound.
- **Neither the mockup nor the §10 measurement gate would catch this**, because the mockup caps every list at 5.
- **Correction:** Bind an explicit numeric `visibleLimit` large enough that `canExpand()` stays false (or add a card input that opts out of expansion). Rewrite §7.2 and R-5 against the real semantics. Add a spec asserting `expandedOverlay()` is false and no toggle renders for a metadata card fed >5 categories. Re-examine DD-6 in this light.

---

## Suspect SEVERE — one judge only (recorded, NOT auto-fixed)

### F-5 — DD-3's "byte-for-byte unchanged" repository method breaks the TypeScript build *(Judge A)*

- **Evidence:** `getFullContractReports` at `:1165-1167` returns `Promise<ContractFullReportsDto>` with a 7-property object literal at `:1188-1200`. Every field in `dto/reports-full.dto.ts:24-45` uses definite-assignment `!` (required). Adding 10 required fields makes that literal fail `TS2739`. The signature must change — which is an edit.
- **Also:** the service method is **not new**. `agresso-contract.service.ts:208-210` already exists as a pass-through and will be edited, so §3's "NEW composition seam" is inaccurate and DD-3's "structurally true" claim covers only the six repository-produced sections, not the merge.
- **Correction:** Split into `ContractBaseReportsDto` (7 fields) and `ContractFullReportsDto extends` it (+10); repository returns the base type. Restate DD-3 as "the method **body** is unchanged" and drop "NEW" from §3.
- **Status:** single-judge, so no auto-fix under the protocol. **But the mechanism is trivially checkable and the orchestrator independently agrees it is correct** — flagged to the user as a recommended inclusion in round one.

---

## WARNING (info — not auto-fixed)

| ID | Finding | Judges |
| --- | --- | --- |
| W-1 | **Gender-group branch is not union-compatible.** "Three summed scalars" is a 1-row/3-column shape that cannot union with `(section, id, name, count)`. Also §3 says "4 raw shapes", §6.1 says "4 branches" then lists **five**. | A + B |
| W-2 | **Repeated `contract-id` binding unaddressed.** `buildPrimaryContractResultsSubquery()` embeds one positional `?`; a 5-branch union needs it 5×, interleaved in exact order with the per-branch enum params. An off-by-one binds a contract id into a `session_type_id` comparison and **silently returns zero rows**. Existing repo already solves this with a CTE (`:766-769`) and `extra.namedPlaceholders` is already `true`. | A + B |
| W-3 | **Per-branch `ORDER BY` inside `UNION ALL` is invalid or non-deterministic** in MySQL. Must be a single union-level `ORDER BY section, count DESC, id ASC`, or sorted in the grouper. R-IMC-001's AC makes ordering a hard criterion. | A + B |
| W-4 | **R-IMC-012 only ¼ answered** (AC.1 only); AC.2/AC.3/AC.4 have no design answer or owning task. **AC.3 is itself mis-specified** — PERF-5 counts *client HTTP requests* (4), not SQL queries, and this spec changes neither. | A + B |
| W-5 | **390 px was never measured.** `proposal.md` §8 records 500 (headless floor) / 768 / 1440. §7.3's "measured at three widths" lets the reader infer the NFR's widths were the ones measured. DC-7 has no jest gate, so this *is* the substitute evidence. | A + B |
| W-6 | **`@ApiProperty` alone will not put the fields in `/swagger`.** The handler at `agresso-contract.controller.ts:156-176` has no `@ApiOkResponse`/`@ApiResponse`/`@ApiExtraModels`, so `ContractFullReportsDto` is not referenced by any schema and is not emitted at all today. | A |
| W-7 | **Band visibility and section content are scoped differently.** `indicatorsWithResults()` derives from `project().indicators.count_results` with no primary/non-primary distinction; the aggregations filter `rc.is_primary = TRUE`. A project whose results are all non-primary shows a visible band claiming "the field is unanswered on all N results" — false and misleading to the exact persona R-IMC-010 serves. Not covered by DC-6. | A |
| W-8 | **NFR-IMC-004 (coverage floors) has no design answer** — absent from §10's coverage table. | B |

---

## SUGGESTION (info)

| ID | Finding | Judge |
| --- | --- | --- |
| S-1 | Client `contract-full-reports.interface.ts` and `testing/contract-full-reports.mock.ts` are missing from §3.1's file inventory, though both are mandatory edits the budget derives from. | A |
| S-2 | Test LOC (~500) is light for the gating §10 demands; likely a tripwire breach that is a budgeting artefact, not real scope. Suggest ~650–700. | A |
| S-3 | DD-2 leaves the `id` undefined for a group category that matches no `gender` row. Defensive only — the seed guarantees the three exist. Consider keying the merge on `gender_id` (1/2/3, fixed by the same migration) rather than normalised names — strictly more robust. | A + B |
| S-4 | DD-3's "structurally true" is narrower than stated (see F-5). | B |

---

## What the judges verified as CORRECT

Recorded so the next reader knows what was actually validated rather than merely unexamined.

- **The pool is genuinely un-configured** — `orm.config.ts:58-61` has `extra: { namedPlaceholders, charset }` only; neither `app.module.ts:41` nor `app-microservice.module.ts:23` overrides it; mysql2 `^3.11.5` defaults to 10. **Both judges confirmed.**
- **A `Promise.all` of N queries really does hold N pool connections** — `Repository.query` creates a `QueryRunner` per call → `pool.getConnection()`. DD-1's underlying *mechanism* is sound; only its arithmetic was wrong. **Both judges confirmed.**
- `buildPrimaryContractResultsSubquery()` at `:642` with the four filters exactly as §4.2 describes.
- The `InstitutionRolesEnum` / `UserRolesEnum` precedent at `:976` / `:1121`.
- `indicatorsWithResults` at `project-dashboard.component.ts:121`.
- `clearDegreeIdIfNotLongTerm` at `capacity-sharing.component.ts:85-93`; `session_format_id !== 1 / !== 2` at `capacity-sharing.component.html:42 / :86`.
- **13 of 14 table names correct** (all but `result_oicrs`); every fact column exists; all four fact tables extend `AuditableEntity`, so the `is_active` predicate is valid on each.
- **All four fact tables are 1:1 with `results`** (`result_id` is PK on each), so `COUNT(*)` after the DISTINCT subquery join cannot double-count.
- INNER JOIN on the lookup does exclude NULL FKs, so R-IMC-001 AC.2 needs no separate predicate.
- The 7 existing payload fields match R-IMC-007 AC.1 exactly.
- OQ-3 is a real, correctly-scoped open question — `clarisa_innovation_readiness_levels` genuinely has both `level` and `name`; `maturity_levels` genuinely has both `name` and `full_name`.
- DD-7's layout values match the mockup byte-for-byte, including the two-class media-query specificity point.
- TRD anchors `:128` (PERF-5) and `:299` ("six sections") are both real.
- `gender` is seeded with exactly Male/Female/Non-binary, making DD-8's pass-through defensive rather than necessary — harmless and correctly justified.

## Unverifiable from the repo

- **Row counts of the three CLARISA-synced lookups** (readiness, innovation types, characteristics) — populated by sync, not seeded. This is what makes F-4 *unverifiable-and-unsafe* rather than merely wrong; the IRL 0–9 scale makes >5 highly likely. **Must be confirmed against a live environment.**
- OQ-3's resolution (`level` vs `name`; `name` vs `full_name`) — needs live rows.
- NFR-IMC-001 latency baseline — needs a running database.
- Whether 390 px actually overflows — CSS read, browser not run.
- Whether `indicator.count_results` is primary-scoped at source (bears on W-7) — traced to `project().indicators` but not to its server origin.

---

## Lifecycle

| Step | State |
| --- | --- |
| Round 1 judgment | ✅ complete, both judges returned, ledger frozen |
| Round-one correction | ✅ **applied 2026-07-30**, authorised by the user ("Fix and Re-judge") |
| Scoped re-judgment (round 2) | ✅ **complete**, both judges returned — see §Round 2 |
| Final re-judgment (round 3) | ✅ **complete** — both judges returned **ESCALATE** |
| Terminal state | ⚠️ **ESCALATED** — lineage exhausted (2 fix rounds, 2 re-judgments) |
| Round-two correction | ✅ **applied 2026-07-30**, authorised by the user ("Fix + re-judge final") |

Fix budget: **exhausted.** No further rounds may be run — an exhausted lineage is never reset or extended.

---

## Round-1 correction — what was changed

The author independently re-verified every confirmed finding against the source before editing; none was accepted on the judges' word alone. All four confirmed SEVERE were reproduced exactly (`@Entity('result_oicrs')`; both enums present; seed migration `1727119632564` lines 6/9/12/15/18; nested `Promise.all` at `:739-743`; the `visibleLimit`/`canExpand`/`expandedOverlay` computeds).

**One judge suggestion was found insufficient and not applied as given.** Both judges proposed binding a large numeric `visibleLimit` (e.g. `999`) to suppress the overlay. That is incomplete: `canExpand` is computed from `items().length` alone and does **not** read `visibleLimit`, so the toggle button would still render — now labelled "Show more" — and still emit `expandToggled` into a host that ignores it. The applied fix instead has the metadata cards **join** the expansion contract (new **DD-10**), which uses the card's existing protocol rather than trying to suppress it.

| Finding | Applied resolution |
| --- | --- |
| F-1 | DD-1 revised: baseline restated as 8; **2** new queries instead of 4; pool sizing promoted from deferred R-4 to **prerequisite T-00** |
| F-2 | `result_oicrs` corrected in `requirements.md` §4.1 + R-IMC-002 and `design.md` §4/§6.1; irregular list now four, with a warning about the earlier false completeness claim |
| F-3 | DD-4 rewritten — existing `SessionFormatEnum`/`SessionLengthEnum` imported (no duplicates), `SessionTypeEnum` added, Training resolved by **id**; `requirements.md` A-1 narrowed and A-2 corrected |
| F-4 | §7.2 rewritten; **DD-10** added; `requirements.md` NFR-IMC-002's "MUST NOT widen T-09" renegotiated as unsatisfiable-as-written; new **OQ-6** puts the scope decision to the user |
| F-5 | DD-3 revised — `ContractBaseReportsDto` / `ContractFullReportsDto` split; "byte-for-byte" downgraded to "body unchanged"; "NEW composition seam" corrected (the service method already exists) |
| W-1 | Gender group emitted as **three literal branches**, giving every branch the uniform 4-column shape; branch counts reconciled (2 queries, 13 branches, 10 sections) |
| W-2 | **CTE** wrapping the primary-contract subquery so the contract id binds once; new defect class **DC-12** for the silent-zero-rows failure mode |
| W-3 | Ordering moved to a single union-level `ORDER BY section, count DESC, id ASC` |
| W-4 | Documentation tasks given owners in §11; **AC.3 restated** (PERF-5 counts HTTP requests, not queries — original wording was unsatisfiable) |
| W-5 | §7.4 now names the widths actually measured (500/768/1440); 390 px recorded as outstanding evidence in NFR-IMC-003 |
| W-6 | `@ApiOkResponse` added to §3.1/§5 and to R-IMC-012 AC.1 |
| W-7 | Empty-state copy constrained so it does not assert *why* a section is empty; "all non-primary" spec case added |
| W-8 | Coverage row added to §10 |
| S-1…S-4 | Client interface + fixture added to the file inventory; test LOC raised; gender merge keyed on `gender_id`; DD-3 wording narrowed |
| — | New **OQ-5** (CLARISA lookup cardinality) and **DC-13** (unintended overlay engagement) |

---

# Round 2 — Scoped Re-judgment

Both judges re-ran blind over the frozen ledger plus the immutable fix delta, instructed **not** to accept revision 2's claims at face value (round 1's failure mode was confidently-stated falsehoods).

## Ledger disposition — merged

| Item | Re-judge A | Re-judge B | Merged |
| --- | --- | --- | --- |
| F-1 pool | PARTIAL | PARTIAL | **PARTIAL** — baseline 8 and T-00 both independently confirmed sound; `proposal.md` still carries the falsified claim |
| F-2 `result_oicrs` | RESOLVED | PARTIAL | **PARTIAL** — correct everywhere in design/requirements; `proposal.md` still says `result_oicr` |
| F-3 enums | RESOLVED | RESOLVED | ✅ |
| F-4 `visibleLimit` | RESOLVED | RESOLVED | ✅ — both confirmed DD-10 correct **and** confirmed the rejected `999` fix would indeed have left a live toggle |
| F-5 DTO split | RESOLVED | RESOLVED | ✅ |
| W-1 union shape | RESOLVED | RESOLVED | ✅ 13 branches / 10 sections reconciles |
| W-2 binding | RESOLVED | RESOLVED | ✅ both proved `namedPlaceholders:true` does **not** conflict with positional `?` (mysql2 short-circuits on array values) |
| W-3 ordering | **PARTIAL** | RESOLVED | **PARTIAL** — sufficient for the 8 SQL-ordered sections, *not* for `gender_distribution` (see N-2) |
| W-4 docs | RESOLVED | **PARTIAL** | **PARTIAL** — AC.3 restated correctly but the PERF-5 edit has no owning task |
| W-5 390 px | RESOLVED | RESOLVED | ✅ |
| W-6 Swagger | RESOLVED | RESOLVED | ✅ |
| W-7 scoping | RESOLVED | RESOLVED | ✅ |
| W-8 coverage | RESOLVED | RESOLVED | ✅ |
| S-1 file inventory | RESOLVED | RESOLVED | ✅ |
| S-2 test LOC | RESOLVED | RESOLVED | ✅ |
| S-3 `gender_id` keying | **PARTIAL** | RESOLVED | **PARTIAL** — keying fixed, but the clause added alongside it is defective (N-1) |
| S-4 DD-3 wording | RESOLVED | RESOLVED | ✅ |

**13 of 17 fully resolved.** The four partials reduce to three causes: `proposal.md` was never updated, the gender merge has two loose ends, and one doc edit is unowned.

## New findings

### N-1 — SEVERE (fix-caused) — the skip-and-warn clause erases gender data for group-only projects
*Reported by Re-judge A. Re-judge B marked S-3 RESOLVED and explicitly endorsed the same clause — so this is single-judge under the protocol. **The orchestrator independently verified A is right and B's endorsement is wrong.***

§6.2 emits the three group branches with **both id and name as literals**, so such a row is already complete — there is nothing to look up. The clause added in round 1 nonetheless says the util "skips and logs at warn" if a group branch's literal id "matches no `gender` row". But the util is pure and has no access to the `gender` table (§6.2, §10) — the only rows it can match against are the `gender_individual` results. Under the only implementable reading, a project whose capacity-sharing results are **all group format** yields zero individual rows, all three group branches are "unmatched", and `gender_distribution` returns **empty despite real reported participants**.

Worse, §10 mandates a spec asserting *"unmatched group id skipped+logged"*, which would **test-lock the wrong behaviour**. The clause also contradicts the principle stated two sentences earlier in the same paragraph ("silently dropping reported data is worse than an unexpected category") and R-IMC-005, which makes group trainings a first-class contributor independent of individual ones.

**Root cause of the regression:** revision 1 keyed the merge on normalised names, where "no match" was a real state. S-3's literal-id fix removed that state; the clause survived it.

**Correction:** delete the clause. The merge is `individual ⊕ group` summed on `gender_id`, ids present on either side alone carried through unchanged; the zero-total rule already suppresses empty extras. Replace the §10 spec line with its inverse — *a group-only fixture still yields the three categories with their summed counts*.

### N-2 — WARNING — `gender_distribution` is not ordered
*Re-judge A. Follows directly from N-1's area; B marked W-3 resolved without considering the post-SQL merge.*

§5 guarantees every section is ordered `count DESC, id ASC` and defers to §6.1, which applies ordering **only in SQL**. But `gender_distribution` is the one section whose final counts are produced *after* SQL, by addition in the util — and addition changes the ranking. Individual Male=1, Female=5 → SQL emits Female first; group adds Male +20 → Male=21, Female=5, still emitted Female first. §10's gender-util spec list has no ordering assertion.

**Fix-caused** by the interaction of W-1's fix (post-SQL merge) and W-3's fix (ordering moved wholly into SQL).

**Correction:** the util re-sorts after summing; assert it in §10; qualify §5.

### N-3 — SEVERE — `proposal.md` was never corrected and now contradicts the design
*Reported by both (B as SEVERE, A as WARNING). **Confirmed.** B found strictly more.*

The correction round touched `design.md`, `requirements.md` and `judgment.md` only. `proposal.md` is live, linked from `requirements.md:8`, and unmarked as stale:

| Line | Stale content | Contradicts |
| --- | --- | --- |
| `:40` | "runs **exactly 6 queries**" — the sentence the ledger named under F-1 | Baseline is 8 |
| `:167`, `:176` | "6 → 16 parallel queries" | 8 → 10 |
| `:59`, `:116` | `result_oicr` | No such table |
| `:87` (B-2) | "10 aggregations added to `getFullContractReports`'s `Promise.all`" | **DD-1** (2 queries) *and* **DD-3** (repository body unchanged) |
| `:179` (B-R5) | "**Prefer resolving by lookup name**" | **DD-4**, which drops name resolution as the *more* fragile option |

The last two are the dangerous ones: they would steer an implementer starting from the proposal into the two architectures revision 2 explicitly rejected.

**Correction:** supersession banner + strike B-2/B-R5 (cheaper, matches the proposal's point-in-time role), or apply all four corrections.

### N-4 — WARNING — T-00's scope growth is not reflected in `requirements.md`
*Re-judge B.*

Promoting an env-driven `poolSize` edit to a shared infra file into a blocking prerequisite changed the spec's scope and sign-off profile, but `requirements.md` §4.3's In column lists no pool work, §2's depth rationale still says "no migration, no auth change… trivial backout (revert both packages)" when backout is now three-part, and §12 still records **"DevOps — n/a (no infra change)"**. Design §15 — the table that exists precisely so requirement edits are explicit — enumerates seven amendments and **omits the largest one**.

### N-5 — WARNING — the 10-vs-8 figure depends on an unstated composition choice
*Re-judge B as a finding; Re-judge A independently flagged the same gap under UNVERIFIABLE. **Effectively confirmed by both.***

§3 shows the service calling both repositories as siblings with no ordering. **Awaited in parallel, peak is 10; awaited sequentially, peak stays at 8** — unchanged from today — and T-00's *necessity* evaporates. The design never says which, yet DD-1's arithmetic, the T-00 prerequisite, and R-IMC-012 AC.3's "10 concurrent SQL queries" note all depend on it. The sequential option is never evaluated even though it costs one extra round-trip and removes a shared-infra prerequisite. (mysql2 defaults `waitForConnections: true`, `queueLimit: 0`, so over-subscription queues rather than errors — which is what makes sequential viable rather than merely slower.)

Also: T-00 has no concrete value or formula — "comfortably above the concurrent-query ceiling" is not implementable.

### N-6 — SUGGESTION — traceability gaps
*Re-judge B.* OQ-6 is absent from design §14's table (it lives only in `requirements.md`); `requirements.md` DC-6's gate text was not extended with the all-non-primary case design §10 attributes to it; §13 points at `tasks.md`, which does not exist and which the methodology names `task.md`.

## What round 2 confirmed as correct

Both re-judges independently re-derived and confirmed: the **baseline of 8**; that **T-00 is technically effective** (`MysqlDriver.js:1000` maps `poolSize → connectionLimit`, not shadowed by `extra`); **all 14 table names** and the four-name irregular set; **both existing enums** and the absence of a session-types enum; the **entire `visibleLimit`/`canExpand` chain** including why the `999` fix would have failed; the **DTO split** resolving TS2739; **`namedPlaceholders` not conflicting** with positional `?`; **PERF-5 counting HTTP requests**, validating the AC.3 restatement; and DD-7's layout values against the mockup.

One caveat worth carrying: Re-judge B notes the repository has **no existing precedent for a CTE referenced across UNION branches** — its CTEs feed single SELECTs. Valid MySQL 8 (the repo demonstrably uses CTEs and window functions), but unexecuted here.


---

## Round-2 correction — what was changed

The user chose **sequential composition** (DD-11) and a **final fix + re-judge**. Sequential composition resolved two findings at once: N-5 directly, and N-4 by dissolution — with no T-00 there is no scope growth, no shared-infra edit, and no DevOps sign-off to renegotiate.

| Finding | Applied resolution |
| --- | --- |
| **N-1** (SEVERE, fix-caused) | ⚠️ **THIS ENTRY WAS FALSE WHEN WRITTEN — see the Post-terminal record below.** It claimed the clause was deleted; it was removed from §6.2 only and survived in DD-8 (§12) until after the lineage closed. What was true at the time: §6.2 was rewritten §6.2 now specifies the merge as a **symmetric sum over the union of `gender_id`s**, with a standing warning against reintroducing any rule that subordinates group rows to individual rows. §10's spec line was **inverted** — it now asserts a group-only fixture yields all three categories. New **R-IMC-005 AC.6** and a *Group-only project* scenario; **DC-3** extended to require the group-only fixture explicitly, noting that a defective merge passes the mixed fixture and fails only this one. |
| **N-2** | The util re-sorts `count DESC, id ASC` after summing (§6.2); §5 qualified to distinguish the nine SQL-ordered sections from `gender_distribution`; §10 asserts it with a fixture where summing reorders the ranking; new **R-IMC-005 AC.7**. |
| **N-3** | Supersession banner at the top of `proposal.md` naming all five superseded claims, with **B-2** and **B-R5** explicitly marked *Rejected* — those were the two that would have steered an implementer into the rejected architectures. |
| **N-4** | **Dissolved** by DD-11. No pool change, so `requirements.md` §4.3, §2 and §12's "DevOps — n/a" all remain correct as written. |
| **N-5** | **DD-11** added: sequential composition, stated in §1, drawn in the §3 diagram with an explicit "must not be raced" note, and recorded in §12 with the rejected `Promise.all` alternative and its cost. `requirements.md` §2 and R-1 restated around **peak concurrency 8, unchanged**. |
| **N-6** | OQ-6 added to design §14; `requirements.md` DC-6 extended with the all-non-primary case; `tasks.md` → `task.md`. |
| — | T-00 removed from §3.1's file inventory and §11; §14 R-4 downgraded to a standalone recommendation; budget 17 → **16 tasks, ~1,580 LOC**. |

**Note on judge disagreement.** Re-judge B marked S-3 resolved and explicitly endorsed the clause that N-1 identifies as defective. The orchestrator sided with Re-judge A after independently tracing the consequence: the util is pure and cannot see the `gender` table, so the only population a group id could be matched against is the individual result set — empty for a group-only project. B's endorsement was not a contradiction of A (B never considered the group-only case); it was an omission. Recorded because a single-judge SEVERE that the other judge *endorsed away* is exactly the kind of finding a two-judge protocol can lose.


---

# Round 3 — Final Re-judgment · TERMINAL

Both judges returned **ESCALATE**, confirming the **same single SEVERE**.

## Disposition of the round-2 findings

| Finding | Judge A | Judge B | Merged |
| --- | --- | --- | --- |
| N-1 gender merge | PARTIAL | PARTIAL | **PARTIAL — the reason for escalation** |
| N-2 ordering | RESOLVED | RESOLVED | ✅ |
| N-3 `proposal.md` | RESOLVED | RESOLVED | ✅ |
| N-4 T-00 scope | PARTIAL (prose residue) | RESOLVED | ✅ substantively; one stale line |
| N-5 composition | PARTIAL (latency claim) | RESOLVED on composition, PARTIAL on latency | ✅ composition; **latency claim overstated** |
| N-6 traceability | RESOLVED | RESOLVED | ✅ |

## The escalating defect

**SEVERE — `design.md:314` (DD-8) still specifies the rule that erases group-only gender data, and `judgment.md:278` claims it was deleted.**

```
| **DD-8** | 2026-07-30 | Unmatched gender categories pass through; unmatched group id skipped + logged. | …
```

The round-2 correction removed the clause from **§6.2 only**. It survives verbatim in **§12, the normative Design Decisions Log** — the section an implementer reads as the authoritative summary of what was decided — with three live inbound pointers (`design.md:177`, `design.md:343`, `requirements.md:415`, the last closing OQ-2 by routing the reader *at DD-8*).

`design.md` therefore now contains **two mutually contradictory normative statements about the same merge, ~140 lines apart**, and the one in the decision register is the wrong one.

**Mitigating:** §6.2's prohibition, §10's inverted spec line, DC-3 and R-IMC-005 AC.6 all test-gate the correct behaviour, so the realistic worst case is a failing spec and rework rather than a shipped bug.

**Aggravating, and the actual reason both judges refused to approve:** this is the **third consecutive round** in which this specific defect outlived a correction that claimed to have removed it, and the **fourth occurrence in this lineage of a correction record asserting something the source does not support**. Judge B's words: *"must not be closed on the fixer's word again."*

**The author verified the finding directly and confirms it: `judgment.md:278` was false when written.** The claim was made after editing §6.2, without checking the mirror decision in §12.

## Remaining non-blocking findings (recorded, not fixed — lineage exhausted)

| ID | Severity | Item |
| --- | --- | --- |
| R3-1 | WARNING | **DD-11's latency cost is understated and asserts an unmeasured result.** "One extra round trip… comfortably inside NFR-IMC-001's 1.5× budget" is wrong on both counts: the real cost is the full serialised duration of Q1/Q2 (`T_total = T_existing + T_metadata`), so the 1.5× bound actually requires `T_metadata ≤ 0.5 × T_existing` — never stated, never estimated, and not obviously true for two multi-branch UNIONs. **NFR-IMC-001 is the binding risk of DD-11 and the design does not flag it as such.** Both judges. Fallback if measurement breaches 1.5×: `Promise.all` **plus** the `poolSize` prerequisite — not silent acceptance. |
| R3-2 | WARNING | **DD-1's "would have peaked at 18"** is parallel-world arithmetic (8+10). Under DD-11, ten un-consolidated queries peak at `max(8,10) = 10`. The conclusion (consolidate) survives; the figure does not. Both judges. |
| R3-3 | WARNING | **§15 under-reports its own edits** — the round-2 correction made four `requirements.md` changes (R-IMC-005 AC.6, AC.7, the Group-only scenario, DC-3) and recorded none. This is the same traceability defect N-4 raised, recurring inside the fix that dissolved N-4. Judge B. |
| R3-4 | SUGGESTION | Cosmetic residue: `design.md:326` budget prose still names T-00; §14 lists OQ-6 before OQ-5; §16 titled "Revision 2 Change Record" in a revision-3 document; §17 calls this a "round-1 ledger"; `judgment.md:280`'s "(§17)" cites a section that does not exist in `proposal.md`; the new enum path should pick deliberately between the sibling `enum/` and `enums/` conventions. |

## Carried open items (not review defects)

OQ-3 (label columns), **OQ-5** (CLARISA lookup cardinality — gates §7.2 and decides how much T-09 surface the spec creates), **OQ-6** (T-09 scope, a live user decision with no default), 390 px measurement, and the unexecuted CTE-across-UNION-branches pattern (valid MySQL 8, no repo precedent — needs a real-schema smoke run early).

---

# JUDGMENT: ESCALATED ⚠️

**Target:** `design.md` revision 3 · **Rounds:** 3 (1 judgment + 2 scoped re-judgments) · **Fix rounds used:** 2 of 2 · **Confirmed severe across lineage:** 5 (4 in round 1, 1 fix-caused) · **Resolved:** 4 of 5 · **Contradictions between judges:** 0

Escalated because one confirmed SEVERE remains live and the lineage cannot be extended. The remedy is a one-line deletion in `design.md:314` plus a correction to `judgment.md:278` — but under this protocol it may not be closed on the fixer's assertion, which is precisely what failed three times. **Any fix applied from here is outside the judged lineage and carries no judgment warrant.**


---

# Post-terminal record — user-authorised fixes applied AFTER escalation

**These edits are outside the judged lineage and carry no judgment warrant.** The review terminated **ESCALATED**; it was not reopened, reset, or extended. The user authorised the remedy with the escalation in hand.

## The false ledger entry, corrected

`judgment.md`'s round-2 correction table asserted *"The skip-and-warn clause is **deleted**."* **That was false.** The clause was removed from §6.2 and survived verbatim in `design.md` §12's DD-8 — the normative decision register — with three inbound cross-references. The author wrote the claim after editing §6.2 without checking the mirror decision in §12, and both final judges caught it.

This is the failure mode the lineage kept surfacing: **a correction record asserting more than the source supports.** It occurred four times across three rounds. Recording it plainly here is the point — the value of the escalation is that the pattern is now documented rather than closed on assertion for a fourth time.

## Applied

| Item | Change |
| --- | --- |
| **SEVERE** | `design.md:314` DD-8 rewritten: unmatched categories pass through **from either side**, cross-referencing DD-2's symmetry rule, with the defective rule explicitly named as prohibited so a future reader cannot reinstate it as an oversight. Inbound pointers corrected at `design.md` §14 OQ-2 and `requirements.md` OQ-2. |
| **R3-1** | DD-11's cost restated across four locations: `design.md` §1 (additive model `T_total = T_existing + T_metadata`, derived condition `T_metadata ≤ 0.5 × T_existing`, marked unverified), §12 DD-11 (acceptance contingent on measurement), §11 (early-measurement ordering note), `requirements.md` NFR-IMC-001 and R-1. Fallback stated: `Promise.all` **plus** `poolSize` — an architecture change, not a tolerance. |
| **R3-2** | DD-1's "peaked at 18" → `max(8,10) = 10` under DD-11, with the superseded figure explained. |
| **R3-3** | `design.md` §15 gained the six amendment rows the round-2 correction failed to record. |
| **R3-4** | Cosmetic residue cleared: budget prose no longer names T-00; §16 retitled; §17 describes the ledger accurately. |

## Not applied — carried into execution

**OQ-3** (label columns), **OQ-5** (CLARISA lookup cardinality — gates design §7.2 and determines how much T-09 surface the spec creates), **OQ-6** (T-09 scope — a live user decision with no default), the **390 px** measurement, and the **CTE-across-UNION-branches** pattern (valid MySQL 8, no repo precedent, unexecuted — needs a real-schema smoke run early). None is a review defect; all need a live environment or a product decision.

**Standing instruction for execution:** DD-11 is contingent. Measure NFR-IMC-001 early. A breach invalidates sequential composition and forces an architecture change — discovering it late is the expensive path.
