# Judgment Day — Findings Ledger (frozen)

**Target:** `docs/specs/innovation-use/data-model-and-catalog/design.md`
**Mode:** `judgment_day` · **Round:** 1 · **Date:** 2026-08-14
**Terminal state:** `ESCALATED ⚠️` (round 1) → **round 2 complete, see §Round 2 — still `ESCALATED ⚠️`**

---

## Protocol Record

| Item | Value |
| --- | --- |
| Judges | 2, blind, parallel, read-only (`akili-reviewer` — tools limited to Read/Grep/Glob) |
| Scope & criteria | Identical prompt, 8 criteria, verbatim to both |
| Author ≠ auditor | Design authored on Opus → **Judge B on Sonnet** to break author-model correlation; Judge A on Opus (T3 Auditor per registry) |
| `review-refuter` | Not launched — two-judge agreement is the corroboration mechanism |
| Partial judgment | Not accepted; both judges returned before merge |
| Reference files | `references/prompts-and-formats.md` and `_shared/review-ledger-contract.md` not packaged in this install → proceeded on the skill document's own contract, ledger persisted here |
| Fix rounds used | **0 of 2** — no correction applied; parent stopped at the "ask before round-one correction" gate |

**Raw counts:** Judge A — SEVERE 4 / WARNING 11 / SUGGESTION 4 · Judge B — SEVERE 3 / WARNING 4 / SUGGESTION 2.

---

## Merge Summary

| Class | Count | Meaning |
| --- | --- | --- |
| **CONFIRMED** (both judges) | **6** | Corroborated; C1 and C2 are severe on both scorecards |
| **PARENT-VERIFIED** (one judge, confirmed against code by the orchestrator) | **5** | Single-judge findings I checked against the working tree myself; all five hold |
| **SUSPECT** (one judge, unverified) | **10** | Recorded as info; not corrected |
| **CONTRADICTIONS** | **0** | Judges never disagreed on a fact — only on two severities |

---

## CONFIRMED — reported by both judges

### C1 — "five additive columns" should be six · SEVERE (both)

Design Executive Summary says *"five additive nullable columns on two shared tables"*. The rest of the document says six: §3.3 lists 5 on `result_actors` (4 disaggregated + `actors_count`), §3.4 adds `organization_count`, §5's M3 says *"5 columns on `result_actors`, 1 on `result_institution_types`"* with `DROP COLUMN × 6`.

**Judge A's key observation:** `requirements.md` Executive Summary carries the **same wrong figure**. That is one wrong idea copied forward, not corroboration — exactly the failure mode the cross-document rule exists to catch. `requirements.md` §8 enumerates 4+1+1 = 6 correctly.

**Impact:** the headline count an approver reads is off by one against the migration that must be written.

### C2 — Fixture F7 is unconstructable; the only reachable failure branch has no fixture · SEVERE (both)

`result_actors.actor_type_id` is `bigint NOT NULL` at the DB level (`1749957832239-createEntitiesForInnovationDev.ts:18`) and `nullable: false` in the entity (`result-actor.entity.ts:27-31`). Judge A grepped all 23 migrations touching `result_actors` and found no ALTER relaxing it.

So F7 ("actor row with `actor_type_id` NULL → `0`") cannot be seeded — it raises a constraint violation instead of exercising the function. Worse: §6.3's `otherwise actor_type_id IS NOT NULL` branch (inherited verbatim from `innovation_dev_validation`) **can never be false**, making it dead code there too. The one branch that *can* fail — `actor_type_id = 5` (OTHER) with `actor_type_custom_name IS NULL` — **has no fixture at all**.

**Impact:** R-IU-006 AC.7 is left without a working gate by the very harness that substitutes for the missing automated coverage.

### C3 — R-IU-010 / OpenSearch: internal contradiction + orphaned requirement · Severity contested (A: SEVERE, B: WARNING)

§1 Non-Goals declares indexing detail fields a settled non-goal; §7 says *"This is flagged, not decided."* Both cannot be true. Meanwhile `requirements.md` R-IU-010 is still an active *Should* requirement with three ACs, `requirements.md` §8 still lists the OpenSearch mapping change, and `family.md` D-5 still says the fields **are** decorated.

§2.1 Composition lists no OpenSearch file and §12's 9-task budget has no OpenSearch task.

**Impact:** under either ruling something is stale — keep D-5 and there is no design/task/budget; drop it and three documents still assert the opposite.

### C4 — §7's central evidence claim is false · Severity contested (A: WARNING, B: SEVERE)

§7 asserts `@OpenSearchProperty` appears *"on no `result_*` detail entity"*. Both judges disproved it independently: `result-keywords/entities/result-keyword.entity.ts:23,36,49` carries three decorations on `@Entity('result_keywords')`; `result-pool-funding-alignment-sp.entity.ts:38` carries another.

**Both judges also independently confirmed the conclusion still survives** via a different mechanism: `base-open-search-api.ts:316-344` reflects metadata only off `this._openSearchEntity`, and `result.opensearch.api.ts:25` passes `ResultOpensearchDto` — never an entity. So entity-level decoration really is inert for the results index.

**Impact:** a false premise is used to argue for overturning a product-owner decision — which is precisely what §7 accuses D-5 of. The recommendation is probably right; its stated evidence is wrong.

### C5 — Proposal's "~3 migrations" vs design's five, unreconciled · low

`proposal.md:106` estimates ~3; §5 specifies five. Expected proposal→design drift, but the design does not mark it superseded the way the proposal's own OQ table does for other figures.

### C6 — R-IU-002 AC.5 has no gate · low

AC.5 (`clarisa_innovation_readiness_levels` unchanged) has no row in §10 Testing Strategy. Low risk since M1 is additive-only, but it is an orphaned acceptance criterion.

---

## PARENT-VERIFIED — single judge, confirmed against the working tree by the orchestrator

> Protocol says a one-judge finding is recorded suspect and never auto-fixed. These five were checked against the code by the parent because of their stakes. **All five hold.** They are still not corrected — they are the substance of the escalation.

### P1 — Versioning/snapshot stored procedures silently drop the new data · **SEVERE — the most consequential finding of this review**

Judge A alone found it. **Parent verified it directly.**

`1783029013035-UpdateDeleteAndVersionSp.ts:625` performs `INSERT INTO result_actors (...) SELECT ... FROM result_actors` with an **explicit column list**: `created_at, created_by, updated_at, updated_by, is_active, deleted_at, result_id, actor_type_id, sex_age_disaggregation_not_apply, women_youth, women_not_youth, men_youth, men_not_youth, actor_role_id, actor_type_custom_name`. The four disaggregated counts and `actors_count` are **not in it**. The same explicit-list pattern repeats for `result_institution_types` at `:662` (no `organization_count`), and `result_innovation_dev` is copied by its **own dedicated block** at `:695` — meaning `result_innovation_use` would simply **never be copied at all**.

`GreenCheckRepository.createSnapshot` calls `SP_versioning` / `SP_delete_result_version` (`green-checks.repository.ts:294,307`).

**Consequence:** version or snapshot an Innovation Use result and its entire detail record vanishes, and every actor/organization count comes back `NULL`.

**The design asserts the opposite.** §6.6 states *"Side effects: None."* §2 states the change *"adds no container, no integration and no communication topology."* Neither §5's migration list, §10's testing table, nor §12's budget contains anything for the stored procedures.

This is the server-side shape of **KZ-002** — enumerate by *what reads the table*, not by where the feature lives — and it is currently unguarded.

### P2 — `npm run migration:run` does not exist · verified

`package.json` defines `migration:empty`, `migration:generate`, `migration:revert`, `migration:execute`, `migration:dev:execute`. There is no `migration:run` — that is the TypeORM subcommand wrapped by `migration:execute` (`package.json:31`). §10's DC-1 gate names it and would fail on first invocation. **KZ-004** requires pre-flighting the verification command itself.

### P3 — Indicator 6 has 12 workflow rows, not 6 · verified

6 base rows (`1767901590080`, ids 25–30) **+** 1 (`1768573722571:23`, id 49) **+** 5 bilateral (`1779190000004`, `BILATERAL_WORKFLOW_INDICATOR_IDS = [1, 2, 3, 4, 6]` × 5 transitions) = **12**.

The stale "6 rows" figure appears in `design.md` §2, `requirements.md` §3.1, and `proposal.md` — three documents agreeing on one wrong number. Non-load-bearing, but it understates how wired indicator 6 already is, which is the evidence `family.md` FR-5 leans on.

### P4 — Adding indicator 6 to `ip_rights` makes every Innovation Use result unsubmittable until IP Rights is filled · verified

`intellectual_property_validation` (`1753460254629-createFunctions.ts:95-129`) declares `validation BOOLEAN DEFAULT false`; with no active `result_ip_rights` row the `SELECT ... INTO` leaves the defaults and the function returns `FALSE`. `ip_rights` is not in `VISUAL_ONLY_GREEN_CHECKS`, and `completenessValidation` ANDs it.

This is a real, and arguably *correct*, product consequence of the decision to include IP Rights for Innovation Use — but the design neither analyses it nor fixtures it. §6.4's truth table has no `ip_rights` fixture, so a second SQL-only submit-blocking behavior enters under the same blind spot §6.5 describes, without §6.4's substitute gate.

### P5 — No scratch-schema mechanism exists; the migration scripts are bound to the shared DB · verified

`migration:revert` and `migration:dev:execute` both pass `-d ./src/db/config/mysql/orm.config.ts`, whose default export reads `ARI_MYSQL_*`. A `TEST` target driven by `ARI_TEST_MYSQL_*` exists in `orm.config.ts:34-39` but is unreachable from any npm script and is never mentioned by the design.

§10 and §13 mandate scratch-schema-only testing but specify no mechanism. An implementer following §10 literally runs migrations against the shared, non-disposable database — the exact disaster RB-2 / FR-3 name.

---

## SUSPECT — one judge, unverified, recorded as info (not corrected)

| ID | Judge | Finding |
| --- | --- | --- |
| U-1 | A (W3) | §6.4's harness "applies M1–M5 to a scratch schema" cannot run — the function depends on `results`, `result_actors`, `clarisa_actor_types`, and `valid_text()`, none created by M1–M5. §10's migration row implies the full suite; the two sections disagree |
| U-2 | A (W7) | §12 says 9 tasks but its basis enumerates six items of which the first is five → 10. The tripwire is ambiguous by one |
| U-3 | A (W8) | RB-5's mitigation is silently narrowed: requirements say the mode invariant is enforced by the API edge **and the validation function**; §3.3 says only "documented on the entity", and §6.3 never references the count columns or `sex_age_disaggregation_not_apply` |
| U-4 | A (W9) | ADR-11 and DD-5 say "five indicators"; `calculateGreenChecks` has indicator-specific cases for exactly **four** (1, 2, 4, 5). `completenessValidation`'s blast radius is six |
| U-5 | A (W10) | §7 cites "DC-11" and "§4.4" unqualified; the design's own §4 is *API Surface* with no subsections — the pointer lands in the wrong file |
| U-6 | A (W11) | The design proves TRD **ADR-6** stale ("mapping generated from decorators… co-located with the entity") but proposes no amendment. Root `CLAUDE.md` §5 requires fixing the doc rather than letting it drift |
| U-7 | B (W1) | R-IU-007's clause "the message names that sections are still pending" is unaddressed — the actual message is generic and names no section |
| U-8 | A (G2) | R-IU-006 AC.5 says "**empty** or whitespace-only"; only F5 (whitespace) exists. A one-line empty-string fixture closes it |
| U-9 | A (G4) | §3.7's "NFR-IU-001's review confirms…" is written as a completed review with no artifact. The claim itself checks out |
| U-10 | B (G2) | Pre-existing drift: `FindGreenChecksDto` declares no `ip_rights`, `innovation_dev`, `oicr`, or `link_result` though the SQL returns them. The design inherits it silently when adding `innovation_use` |

---

## Judge agreement on what is *correct*

Both judges independently verified and confirmed: `INNOVATION_USE = 6`; the `ip_rights` inclusion array's current members; `completenessValidation`'s generic key-ANDing; the three role enums' current values; `innovation_dev_validation`'s join-then-test pattern **and** its lack of role filtering (DD-3 and DD-4 both accurate); `clarisa_innovation_readiness_levels` never seeded by any migration (DD-2's precedent claim exact); `ControlListBaseService.findAll()` has no `order` and `findByName` is a `LIKE` match; `result.opensearch.dto.ts` contains no detail fields; `AuditableEntity`'s column set; and that **no test in the repository executes a stored function** — §4.1's central premise.

Judge A additionally confirmed ADR-11 is the next free ADR number.

---

## Terminal Verdict

**JUDGMENT: ESCALATED ⚠️**

Escalated rather than corrected-and-approved because two findings change **scope**, not wording, and scope is the user's call:

1. **P1** requires a sixth migration amending `SP_versioning` / `SP_delete_result_version`, plus fixtures — and reverses the design's "no side effects" claim.
2. **C3** needs the pending product ruling on R-IU-010 / OpenSearch before either reading can be made consistent.

No fix round was consumed. Both remain available.

---

# Round 2 — Scoped Re-judgment (frozen)

**Date:** 2026-08-14 · **Fix rounds used:** 1 of 2 · **Re-judgments used:** 1 of 2
**Scope:** did each round-1 finding actually close, and did the fixes introduce new defects?

## Closure audit — both re-judges agree exactly

| | Count |
| --- | --- |
| **CLOSED** | **17 / 21** |
| **PARTIAL** | 3 — P1, P5, and (A: C3 / B: U-3) |
| **OPEN** | 1 — U-7 |

Both re-judges independently returned the same headline: *Closed 17/21, Partial 3, Open 1*. They diverged only on which item was the third partial — Judge A flagged C3 (an incomplete sweep), Judge B flagged U-3 (mode consistency lacking an AC). Both are real; both are recorded below.

**New findings:** Judge A — SEVERE 6 / WARNING 6 / SUGGESTION 4. Judge B — SEVERE 2 / WARNING 2 / SUGGESTION 1.

---

## CONFIRMED by both re-judges

### R1 — §6.7's evidence cites the wrong migration for `SP_delete_result_version` · SEVERE (A) / SEVERE (B) · **parent-verified**

§6.7 attributes the delete-path evidence (`:1015-1050`) to `1783029013035-UpdateDeleteAndVersionSp.ts` and presents it as `SP_delete_result_version`.

**Parent verification:** that file defines exactly two routines — `CREATE PROCEDURE SP_versioning` (`:8`, down `:1168`) and `CREATE FUNCTION full_delete_result_version` (`:993`, down `:2099`). `grep -c "SP_delete_result_version"` on it returns **0**. Lines 1015-1050 sit inside `full_delete_result_version`, a different routine on a different code path.

The current `SP_delete_result_version` lives in `1778510205765-updatefulldelete.ts:173-334`. §14's Reference line has it right, so §6.7 and §14 contradict each other.

**Impact:** an implementer writing M6 from §6.7's citations edits the wrong routine — on a migration that cannot be edited after merge.

### R2 — The scratch-schema mechanism does not work as described · SEVERE (both) · **parent-verified** · **dangerous**

§6.5.1 step 3 says "adds an npm script wired to the `TEST` target", and §10 / `requirements.md` DC-1 assert the migration scripts are "both pointed at the `TEST` target".

**Parent verification:** `orm.config.ts:71-73` is `export const dataSource: DataSource = <DataSource>(getDataSource(dataSourceTarget.CORE, true));` — a **single instance bound to `CORE` at module load**. TypeORM's CLI `-d` imports that file and uses that exact instance; it cannot re-invoke `getDataSource` with `TEST`. `package.json:30,32` hardcode `-d ./src/db/config/mysql/orm.config.ts`.

Reaching `TEST` requires a **new sibling config module** exporting a TEST-bound `DataSource`, or making the export target-selectable. Neither is mentioned.

**Impact:** an implementer following §10 literally runs the migration suite against the **shared, non-disposable** dev database while believing the design routed them to a scratch schema. This is the exact disaster RB-2 / RB-9 / FR-3 exist to prevent, and the fix round introduced it.

### R3 — U-7 is marked applied but is not · SEVERE (A) / WARNING (B)

§15 claims U-7 closed via "§6.3 — the generic submit message is noted". §6.3 contains no such note; it covers only key-ANDing and the `VISUAL_ONLY_GREEN_CHECKS` trap. `requirements.md` R-IU-007's clause *"AND the message names that sections are still pending"* remains live and unsatisfiable — `function-handler.service.ts:330-332` throws a fixed string naming no section.

**Impact:** a requirement clause with zero design coverage, masked by a false closure claim.

### R4 — "Actor mode consistency" is new submit-blocking logic with no requirement behind it · WARNING (both)

§6.4 step 4 was added to close U-3, but `requirements.md` R-IU-006's AC.1–AC.9 contain no criterion for it, and only the aggregate-mode failure has a fixture (F9). The disaggregated-mode failure is untested. Either R-IU-006 gains an AC or step 4 moves to the API edge.

### R5 — The M6 LOC estimate is wrong · WARNING (A) / SUGGESTION (B)

§12's "M6 alone is ~1,150" counts only `up()` bodies, while §5 and §6.7 require `down()` to reproduce the prior bodies in full. Judge A measured up+down ≈ **2,290** before the third routine. Judge B notes the `SP_delete_result_version` half was derived against the wrong file (R1) and must be re-derived. Because §12 is an explicit tripwire, the undercount fires on a correctly-executed M6.

---

## PARENT-VERIFIED — single judge, confirmed against the code by the orchestrator

### R6 — A **third** enumerating routine was missed entirely · SEVERE (A) · **parent-verified**

`full_delete_result_version` (`1783029013035:993`) is a MySQL **FUNCTION** whose body is the same `DELETE FROM <table> WHERE result_id = temp_result_id` sequence. It is the **hard-delete** path, invoked at `query.service.ts:90` via `SELECT full_delete_result_version(?)` — distinct from `SP_delete_result_version`, which `green-checks.repository.ts:294` and `result-status-workflow.repository.ts:152` call via `CALL SP_delete_result_version(?, ?)`.

**Parent verification — the complete set is three routines, not two:**

| Routine | Kind | Latest definition | Caller |
| --- | --- | --- | --- |
| `SP_versioning` | PROCEDURE | `1783029013035:8` | versioning / snapshot |
| `SP_delete_result_version` | PROCEDURE | `1778510205765:173` | `green-checks.repository.ts:294`, `result-status-workflow.repository.ts:152` |
| **`full_delete_result_version`** | **FUNCTION** | **`1783029013035:993`** | **`query.service.ts:90` — hard delete** |

Judge B independently established this routine's existence, kind, and caller while diagnosing R1, but framed it as a citation error; Judge A drew the further conclusion that it is an unfixed surface. The parent confirms the conclusion.

**Impact:** the P1 defect class is unfixed on one of its three surfaces — `result_innovation_use` rows are silently orphaned on hard delete. Worse, **the incomplete two-routine rule is encoded in M6, R-IU-011's ACs, F14, the §12 budget, `family.md` D-9, and ADR-11's standing checklist** — the artifact explicitly designed to be inherited by chunks 2 and 3 and every future spec adding a table under `results`. A wrong checklist is worse than none.

### R7 — R-IU-011 AC.4 has no gate, and §6.7 claims it does · SEVERE (A)

§6.7 states "F12 guards Innovation Dev". F12 is defined as an `innovation_dev_validation` **stored-function** comparison — it exercises neither `SP_versioning` nor either delete routine. R-IU-011 **AC.4** ("versioning and deleting an Innovation Dev result behaves identically before and after M6") therefore has no fixture in F1–F14 and no row in §10.

**Impact:** the highest-blast-radius change in the chunk — `DROP`+`CREATE` of routines serving all six indicators — has no regression gate, and the design asserts it does.

### R8 — Orphaned references to the withdrawn R-IU-010 survived the C3 sweep · SEVERE (A)

`proposal.md:83` still reads "→ **now IN scope** per **D-5**; specified as requirement R-IU-010", contradicting D-8 and `proposal.md:214` in the same file. `requirements.md:25` (Depth rationale) still cites "touches the OpenSearch mapping" as depth justification — and still omits the stored-procedure work, now the chunk's largest item.

### R9 — The zero-actors case is unhandled · WARNING (A)

`innovation_dev_validation` requires `tempActors > 0` **and** `tempFullActors = tempActors` (`1758125999162:108-111`) — at least one actor row must exist. §6.4 steps 3–4 are written per-row and are **vacuously true for zero rows**, so an Innovation Use result with no actors at all would turn green. Requirements settle it either way; the divergence must be a recorded decision, not an implicit one.

### R10 — DC-12 was not swept into three enumerations · WARNING (A)

`requirements.md` §4.3 "Accepted risk", NFR-IU-004 "Known limit", and A-4 "If wrong" all still read "DC-2 / DC-3 / DC-10", while §4.2/§4.3's tables include DC-12. The document disagrees with itself about which classes are unguarded.

### R11 — The standing checklist is itself incomplete · WARNING (A)

`family.md` D-9 and ADR-11's Implications state the rule as "audit `SP_versioning` **and** `SP_delete_result_version`". Per R6 that rule is wrong, and it is the artifact designed for inheritance.

---

## Terminal Verdict — Round 2

**JUDGMENT: ESCALATED ⚠️**

17 of 21 round-1 findings closed. But the fix round **introduced 2 confirmed SEVERE defects** (R1, R2) and review surfaced a **third missed routine** (R6) that changes scope again.

**The pattern is the finding.** Two consecutive rounds have each uncovered factual errors in this design's claims about MySQL routines — first the versioning hazard itself, now a wrong file citation, a non-functional scratch-schema mechanism, and a missed third routine. The stored-routine layer is where this spec's assertions are least reliable, which is precisely the layer with **no automated gate** (§4.1). That correlation is not a coincidence: unverifiable claims stay wrong longer.

**Remaining budget:** 1 fix round, 1 re-judgment. Parent stopped and escalated rather than spending the final round unilaterally, because R6 changes scope and the user is entitled to rule on it.

---

# Round 3 — Final Re-judgment (terminal)

**Date:** 2026-08-14 · **Fix rounds used: 2 of 2** · **Re-judgments used: 2 of 2** · **Lineage EXHAUSTED**

## Closure of round 2

| Judge | R2 closed | New SEVERE | New WARNING | Transcript |
| --- | --- | --- | --- | --- |
| A | 8/11 (partial: R2, R4, R7) | 5 | 5 | **DEFECTIVE** |
| B | 10/11 (partial: R4; R6/R7/R11 closed literally, reopened in substance) | 4 | 3 | **DEFECTIVE** |

---

## CONFIRMED by both final judges

### T1 — A **fourth** lifecycle routine exists: `delete_result` · SEVERE (both) · **parent-verified**

`delete_result(result_code BIGINT) RETURNS tinyint(1)` — MySQL **FUNCTION**, `DETERMINISTIC`, latest definition `1764275660631-updateDeleteFunctions.ts:312-511`. Its body is ~28 consecutive `UPDATE <table> SET is_active = FALSE, deleted_at = … WHERE result_id = …` statements — the identical enumerate-by-name hazard — including `result_innovation_dev` (`:467`), `result_institution_types` (`:485`), and `result_actors` (`:503`). No `result_innovation_use` statement; M6 adds none.

**Parent verification — the definitive enumeration, by call site rather than by suspected name:**

| Routine | Call pattern | Sites |
| --- | --- | --- |
| `SP_versioning` | `CALL` | `green-checks.repository.ts:307`, `result-status-workflow.repository.ts:172` |
| `SP_delete_result_version` | `CALL` | `green-checks.repository.ts:294`, `result-status-workflow.repository.ts:152` |
| `full_delete_result_version` | `SELECT` | `query.service.ts:90` |
| **`delete_result`** | `SELECT` | **`query.service.ts:78`, `result.repository.ts:516`, `tip-integration.repository.ts:27`** |

**`delete_result` has more call sites than any other routine in the set.** It is *the* soft-delete path.

**Consequence:** soft-deleting an Innovation Use result leaves `result_innovation_use.is_active = TRUE` — an active orphan pointing at a deleted result. Zero fixture coverage; no acceptance criterion; not in the budget.

**Contaminated artifacts:** `routine-transcript.md` §1/§4 · `design.md` Executive Summary, §2 mermaid, §5 M6, §6.7, §12, ADR-11's standing checklist · `requirements.md` §3.1, §8, R-IU-011 · **`family.md` D-9** — the artifact designed for chunks 2 and 3 to inherit.

### T2 — `routine-transcript.md` §2 is not a complete transcription · SEVERE (both)

`SP_versioning`'s body contains **28–29** `INSERT INTO` blocks; the transcript lists **19**. The omitted blocks are those formatted with `INSERT` / `INTO` / `<table>` on separate source lines: `results`, `result_keywords`, `result_oicrs`, `result_notable_references`, `result_impact_areas`, `result_impact_area_global_target`, **`result_quantifications`**, `result_users`, **`result_innovation_tool_function`**, `result_countries_sub_nationals`.

**The transcript was derived by a single-line grep, not by reading — the exact failure mode DD-12 and the transcript itself exist to eliminate.**

Two consequences beyond the false completeness claim:

- **`result_quantifications` is already copied** (`:297-325`, with `quantification_role_id`). `design.md` §3.5 reuses that table for Innovation Use. An M6 author consulting the transcript's block list would conclude it is *not* copied and add a block → **duplicated quantification rows on every version bump, for every indicator.**
- The stated insertion point is wrong: the `result_innovation_dev` block ends at **770**, not ~795. Lines 772-794 are a `result_innovation_tool_function` block the transcript does not know exists.

*(All 19 listed line numbers, both verbatim column lists, both insertion points for the delete routines, and the impact-outcomes divergence were independently verified **correct** by both judges.)*

### T3 — F16 is bound to the wrong acceptance criterion · SEVERE (both)

`design.md` §6.5 (F16 row) and §6.7 both cite F16 against **R-IU-011 AC.4**. `requirements.md` assigns F16 to **AC.5**; AC.4 is the `full_delete_result_version` orphan criterion, gated by F15. `design.md` §15's own R7 row says AC.5 — the document contradicts itself, and the round-2 correction mis-landed in the two places an implementer reads.

### T4 — R-IU-006 AC.10's disaggregated half still has no fixture · SEVERE (both)

Round 2's R4 named this gap precisely. The AC was added; the fixture was not. F9 covers only aggregate mode. **A finding closed by adding a criterion without adding its gate is not closed.**

---

## Single-judge findings (recorded, not corrected — lineage exhausted)

| ID | Judge | Finding |
| --- | --- | --- |
| T5 | A | **`requirements.md` was not swept.** `:575` (§8 Amend row), `:612` (RB-8, still "F12 guards Innovation Dev"), `:630` (D-9) all still say **two** routines. `proposal.md:215` likewise |
| T6 | A | **R2's dangerous wording survives where it matters.** `design.md` §10 and `requirements.md` DC-1 / RB-9 still tell the reader the migration scripts are "pointed at the `TEST` target". Only §6.5.1 was corrected |
| T7 | A | `SP_delete_result_version` is mislabeled "soft delete" in both specs. **This mislabel is the likely cause of T1** — the soft-delete slot in the taxonomy was filled by the wrong routine, hiding the real one |
| T8 | A | §6.5.1's four pieces are insufficient: `orm.config.ts:46` uses `DB_PORT` for **both** targets — there is no `ARI_TEST_MYSQL_PORT`, so a Docker MySQL on a non-default port is unaddressable |
| T9 | A | DD-11 overstates its precedent: `innovation_dev_validation`'s `tempActors > 0` sits inside `IF(anticipatedUserId = 1 OR … , TRUE, …)` — conditional, not unconditional |
| T10 | B | `orm-connection-test.module.ts` exists and, despite its name, binds to **`CORE`** (`:10`) — a trap for an implementer who greps for a test module and assumes piece 1 is done |
| T11 | B | The "`down()` restores the prior body" pattern is **not** consistent precedent: `1778510205765`'s `down()` is a bare `DROP` with no recreation. M6's author cannot assume a safe copy-paste model |
| T12 | A | Ungated ACs beyond T4: R-IU-011 AC.7 (no §10 row), R-IU-001 AC.3 (no round-trip fixture), R-IU-005 AC.2 (role rows unasserted) |

---

## Terminal Verdict

**JUDGMENT: ESCALATED ⚠️** — lineage exhausted, no further fix round permitted.

### The pattern, stated plainly

Three consecutive rounds each found the routine-set claim wrong:

| Round | Claim | Reality |
| --- | --- | --- |
| 1 | "Side effects: **None**" | Two routines silently drop the data |
| 2 | "**Two** routines" | Three |
| 3 | "**Three**, not two" | **Four** — and the missed one is the most-called |

**And the artifact created in round 2 to end this failure mode reproduced it.** `routine-transcript.md` was written to replace description with transcription, then §2 was derived by a single-line grep — description wearing transcription's clothes.

### The generalizable fix

Every wrong routine claim came from enumerating by **name already suspected**. The complete set was obtained in **one command**, by enumerating **call sites**:

```
grep -rnoE "(CALL [A-Za-z_]+|SELECT [a-z_]+\(\?)" --include="*.ts" src | grep -v spec | grep -v migrations
```

Cheap, complete, and never used across three rounds. This belongs in `family.md` and ADR-11 as the required method before any "complete routine set" claim.

### Recommendation to the human

Do **not** patch further in this lineage. The spec's non-SQL layers — schema, catalog, green-check wiring, validation logic, decisions, budget discipline — were verified sound repeatedly across three rounds. The SQL-lifecycle layer needs a **fresh, evidence-first pass**: enumerate routines from `information_schema.ROUTINES` or the call-site grep above, transcribe each body by reading it, and only then write M6.
