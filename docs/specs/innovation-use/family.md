# Spec Family — Innovation Use Reporting

> Parent manifest for the **Innovation Use** result category (`IndicatorsEnum.INNOVATION_USE = 6`).
> The child list below is a **closed set**: no child folder may be created without a prior row here.
> This manifest is the authority for `Depends on` / `Parallel-safe` if it and a child proposal ever disagree.

---

## Document Control

| Field | Value |
| --- | --- |
| Family slug | `innovation-use` — derived from the free-text `/akili-propose` argument ("nueva sección para innovation use") |
| Spec path | `docs/specs/innovation-use/` |
| Type | Change |
| Approval Mode | gated |
| Source of intent | User story pasted verbatim in the `/akili-propose` invocation (2026-08-14). User confirmed: *"lo que te he suministrado es el 100% la historia de usuario"* — no Jira/Figma extraction. |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Build order | RICE-scored (see §Prioritization) |
| Created | 2026-08-14 |

> **Template note:** `docs/specs/general-setup/family.md` does not exist in this repo (only `requirements.md`, `design.md`, `task.md`). This manifest follows the schema described in `/akili-propose` Step 1.1. Creating the missing general-setup template is tracked as **OQ-F4**.

---

## Why a family and not one spec

The work crosses three verification boundaries that fail differently:

| Boundary | Failure mode | Why it must not share a gate |
| --- | --- | --- |
| Schema + MySQL stored functions + catalog seeds | A bad migration is **append-only** — it cannot be edited after merge, only superseded | Needs its own review + migration gate before anything depends on it |
| REST module (`result-innovation-use`) | Contract drift, envelope/Swagger conventions, green-check wiring | Needs the schema to exist; needs its own e2e gate |
| Angular page + sidebar/route wiring | Renders shared components on many routes (KZ-002/KZ-003 territory) | Needs a **full** client suite run, not a targeted one |

A single `tasks.md` would be ~28 tasks behind one validation gate covering both an irreversible migration and a UI change. Splitting keeps each gate honest and lets the client chunk start against a frozen contract.

---

## Children

| # | Child | Spec path | Depends on | Parallel-safe | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Data model, catalog & green check | **archived** → [`docs/specs/archive/2026-08-19-innovation-use--data-model-and-catalog/`](../archive/2026-08-19-innovation-use--data-model-and-catalog/) *(was `docs/specs/innovation-use/data-model-and-catalog/`)* | **`bugfix/sp-versioning-roles-id`** — archived 2026-08-18; its two repair migrations are **committed on this branch and ordered before M6**, so the dependency is **satisfied by construction** (corrected 2026-08-18; see [`archive-summary.md`](../archive/2026-08-18-bugfix--sp-versioning-roles-id/archive-summary.md)) | no | **done — T-01…T-14 all resolved (2026-08-19); T-03 extracted and carries no checkbox.** PASS on T-14 attempt 3 of 3 (review rounds 11–13, both lenses PASS). Full server suite green (**328 suites / 2155 tests**), coverage 83.75%/74.88%/84.75%/83.76% (well above the 60% floor), cold fixture cycle green from a **provably empty** scratch schema (0 tables → 215 → 9 fixture suites / 30 tests, incl. F12/F12b/F16), falsifying-input evidence recorded — every figure independently re-run by the Leader, not relayed. ADR-11 + ADR-6 amendment filed in `docs/trd/trd.md` §2.4. **Chunk 2 is unblocked.** Undischarged advisories carried to archive by explicit user ruling (not oversight): A-1, A-2, B-1, B-2, **C-4**, C-6, C-7…C-18 — see [`data-model-and-catalog/execution.md`](../archive/2026-08-19-innovation-use--data-model-and-catalog/execution.md). **C-4 still needs a scope ruling** (a fixture *code* change). |
| 2 | Innovation Use details API | **archived** → [`docs/specs/archive/2026-08-20-innovation-use--details-api/`](../archive/2026-08-20-innovation-use--details-api/) *(was `docs/specs/innovation-use/details-api/`)* | `innovation-use/data-model-and-catalog` — **satisfied**, chunk 1 `done` 2026-08-19 | no | **`done` — archived 2026-08-20.** All 13 tasks `[x]`. *(Status swept 2026-08-20 at the second `/akili-validate`; this cell had still read "not executed … T-01, T-02, T-03 done" and had not been touched since T-03.)* `requirements.md` / `design.md` / `tasks.md` approved through the three specify gates. Budgeted **13 tasks · ~2,400 LOC · ~24 review rounds** *(rounds re-baselined from 6–8 at execution time, 2026-08-19, user ruling — the specify-time estimate was ~3× low, as chunk 1's had been)*; **actuals: 13 tasks · ≥ 26 rounds · fixture tier 4,619 LOC**. Verification: unit **336 / 2296**, coverage **89.80 / 75.82 / 85.31 / 89.27**, fixtures **15 / 71** twice, build clean. **Four product defects found across three validation rounds, all four fixed on the Use path** (cross-result and cross-role PK overwrite; id-less PK adoption; duplicate submitted PK; identity-less organization overwrite). **Archived with two human gates explicitly open, not closed:** the security review in `requirements.md` §15, and **FR-7** below. Follow-up specs owed: **FR-7**, and **G-3** (an e2e project pointed at the scratch container, which is what unblocks T-01 c1). **Specify surfaced a blocking gap chunk 1 did not close:** `ResultsService.createResultType` has no `case INNOVATION_USE` and its `ipAvailables` array excludes indicator 6, so an indicator-6 result today gets neither a `result_innovation_use` row nor a `result_ip_rights` row — and since chunk 1 added indicator 6 to the green-check `ip_rights` conjunction, such a result is **permanently unsubmittable**. User ruling 2026-08-19: closed here, both halves (R-IUA-001, R-IUA-011). Chunk 1's carried follow-up **C-4** is scoped and owned by T-13 — and was found **over-broad as logged**: only the sites guarding rows `global-setup.ts` seeds are dead; those guarding a private platform code are live teardown guards (`details-api/design.md` §11.1) |
| 3 | Innovation Use details page (STAR) | **archived** → [`docs/specs/archive/2026-08-26-innovation-use--details-page/`](../archive/2026-08-26-innovation-use--details-page/) *(was `docs/specs/innovation-use/details-page/`)* | `innovation-use/details-api` — **satisfied**, chunk 2 `done` + archived 2026-08-20 | no | **`done` — archived 2026-08-26.** All **14** tasks `[x]` (13 + `T-14` by **Amendment 01**), **120/120** criteria. Validation **WARN, 0 FAIL** after two full cycles. Verification: **316 suites / 6741 tests**, coverage **98.19 / 96.30 / 97.76 / 98.49**, build exit 0 at **1.33 MB / 274.88 kB**, lint clean with a clean tree after. Budget **6,133 LOC / 23 of ~31 rounds** against ~3,400 written / ~4,800 re-baselined — **+80.4% / +27.8%**, tripwire breached and **ruled on by the user three times**; cause is spec-tier density, not scope creep. **Four Pivot Records, every one a case of the spec being wrong rather than the code** — most consequentially `T-13`: the create-result entry point was closed all along by `indicators.service.ts:34`'s allowlist `[1, 2, 4, 5]`, because five documents had audited the **server's** `IndicatorsService` when the dropdown uses the **client's same-named class**. `OQ-IUP-2` / **FR-5** is therefore RESOLVED and was the wrong question: reachability never depended on `is_active`. **`RB-9`:** the `.rs-*` / `.fs-*` families **had no implementation anywhere in the app** while four constitutional documents mandated them; `src/styles/responsive-size.scss` was created by user ruling (+8.69 kB, no budget warning). ⚠️ **Archived on two explicit user acceptances, not on a clean bill:** (1) the final remediation was Leader-authored and its fixes are **unaudited**; (2) **two live light-theme AA defects ship** — `RB-5`'s `quantification-item` eyebrow at **2.9115:1** (blast radius: **every OICR details page**) and `OQ-IUP-8`'s `custom-fields.scss` roles, `.section-title` at **2.378:1**. Neither has a ticket. **Not closed by this chunk:** **FR-7** / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718), `RB-8`'s two product defects, and four platform-wide findings reported in [`archive-summary.md`](../archive/2026-08-26-innovation-use--details-page/archive-summary.md) §8. Retrospective: [`docs/specs/kaizen/innovation-use--details-page.md`](../kaizen/innovation-use--details-page.md) — 2 lessons, 10 pending items awaiting the apply phase on `main` |

**No chunk is parallel-safe.** Each consumes the previous one's artifact (tables → entities/DTOs → typed client interface), and all three touch shared modules (`result_actors`, `result_institution_types`, `result_quantifications`, `green-checks`). Run them sequentially in one worktree; do **not** fan them out.

> Chunk 3 may begin design work against chunk 2's approved `design.md` contract before chunk 2 finishes implementation, but its execution gate stays behind chunk 2's.

---

## Prioritization (RICE)

Scored to justify the build order, not to decide whether to build — the order is forced by the dependency chain. RICE confirms no chunk should be dropped or deferred.

| Chunk | Reach | Impact | Confidence | Effort | RICE | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 — Data model & green check | All Innovation Use reporters | 3 (blocking) | 90% | 3 | 2.7 | Must — nothing works without it |
| 2 — Details API | All Innovation Use reporters | 3 (blocking) | 85% | 3 | 2.55 | Must |
| 3 — Details page | All Innovation Use reporters | 3 (the visible deliverable) | 80% | 5 | 1.44 | Must — this is the user story's actual ask |

MoSCoW: all three **Must**. The out-of-scope investment tables are **Won't (this cycle)** — see §Family Non-Goals.

---

## Family Scope

**In scope**

- A working `Innovation Use` reporting page reachable when a user creates a result with `indicator_id = 6`.
- Seven sections: General Information, Alliance Alignment, **Innovation use details** (new), Results Partners, Geographic Scope, Evidence, IP Rights.
- The Innovation use details section: current innovation use level (0–9 scale with definitions), conditional level-justification text (level ≥ 6), repeatable Actors with sex/age **counts** and a read-only computed total, repeatable Organizations, repeatable Other quantitative measures.
- Section-level completion status (green checks) for indicator 6, including submit gating.
- Draft save/resume, existing STAR permissions, audit fields.

**Family Non-Goals** (confirmed by product owner 2026-08-14)

- W1/W2-specific reporting logic.
- Estimated total USD investment by CGIAR Programs.
- Estimated total USD investment by CGIAR W3 / bilateral projects.
- **Estimated total USD-value of (co-)investment by partners** — the user story contradicted itself (Context paragraph said out of scope; the field list said in). Product owner ruled **out of scope**; revisit as a fourth chunk if reinstated.
- Changes to existing common-section business rules, except the minimum needed for component reuse.
- OpenSearch/PRMS homologation changes for Innovation Use beyond what already exists.

---

## Cross-cutting Risks

| ID | Risk | Owner chunk | Mitigation |
| --- | --- | --- | --- |
| FR-1 | `result_actors` stores sex/age disaggregation as **booleans** (Innovation Dev semantics: "which segments apply"). Innovation Use needs **integer counts**. Extending the shared table risks Innovation Dev regressions. | 1 | Additive nullable count columns; Innovation Dev reads/writes stay on the boolean columns untouched. Full server suite + Innovation Dev e2e on the migration. |
| FR-2 | Green checks are **MySQL stored functions**, not application code. `innovation_use_validation` must be authored in SQL and kept in sync with the DTO. | 1 | Mirror `innovation_dev_validation` structure; unit-test the repository switch; document the function in `design.md`. |
| FR-3 | The shared dev DB is **not disposable** (root `CLAUDE.md` §4.3). Migrations here are append-only and hit a live shared database. | 1 | Migration review is a hard human gate. No destructive DDL on existing columns. |
| FR-4 | KZ-002 / KZ-003 — the client chunk promotes `actor-item` / `organization-item` out of `innovation-details/components/` into shared. Every screen rendering them is in the blast radius. | 3 | Enumerate by *what renders*, not by folder. Mandatory **full** client suite (`npm test -- --silent`), never targeted. |
| FR-6 | **`SP_versioning` is non-executable in `main` today**, for all six indicators — two blocks name `roles_id`, dropped by `1783022620616`. Pre-existing; discovered by chunk 1's routine transcription. Blocks chunk 1's versioning gate. | 1 | **Routed 2026-08-14 to its own spec:** [`docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id/`](../archive/2026-08-18-bugfix--sp-versioning-roles-id/), Lite/Bug Mode, red-before-green regression fixture. Chunk 1 **`Depends on`** it. → **CORRECTED 2026-08-18: this was never a merge gate.** (The clause here formerly read *"and must not start T-10 until it merges"*.) Both repair migrations are committed on branch `AC-1679-Create-the-innovation-use-section` (`9392c010`, `4dd884f6`) at timestamps ordered **before** every Innovation Use migration, so M6 inherits the repaired body by construction. The bugfix cannot merge separately — it is part of this development, on this branch. What remains is a **rollout** verification, below. Both required migrations are `[x]` done and each proven red-before-green **on the scratch schema**: `repairSpVersioningObjectiveBlocks` (T-02 — MySQL 1054 red, green after) and its mandatory companion `repairSpDeleteResultVersionObjectiveTables` (T-02b — MySQL 1451 red, green after; required by RB-5 so the repair could not ship alone). See `bugfix/sp-versioning-roles-id/execution.md` → *T-02* and *T-02b* for the verbatim evidence. **Required at ROLLOUT, not before T-10:** the pre-flight `SHOW CREATE PROCEDURE SP_versioning` check against the target database. These migrations live on branch `AC-1679-Create-the-innovation-use-section` and have not yet run against the shared dev DB — a deployment fact, not a task blocker, since they are ordered first in the migration sequence and apply automatically (see `devops-note.md` and `requirements.md` §7 Sign-off, both still open). |
| **FR-7** *(tracked as **[AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718)** — Bug, High, created 2026-08-20; linked to AC-1679)* | **`customSaveInnovationDev` accepts a caller-supplied primary key with no ownership check, so any authenticated principal who can edit *some* indicator-2 result can rewrite **any** `result_actors` / `result_institution_types` row by id — including the Innovation Use rows chunk 2 just protected.** Chunk 2 built **four** protections on its own endpoint, and the Dev endpoint has **none** of them *(restated 2026-08-20 at the second `/akili-validate` — this sentence named only the first, understating the live exposure by three whole corruption shapes)*: **(1)** `assertInnovationUseOwnership`, `(result_id, role)`-scoped, rejects `400`; **(2)** the adopted-PK reconcile / `Not(In(excludeIds))` pair, closing the id-less row that adopts an edited row's PK; **(3)** the duplicate-submitted-PK `400`; **(4)** `validateOrganizationsAreIdentified`, closing an identity-less organization row that overwrites an **arbitrary** sibling with nulls and deactivates the rest of the section. **Protection 4 matters most for this row**, because its root — `constructWhereClause`'s three-way `if` degenerating to `{ result_id, role }` — is a helper **shared** with `customSaveInnovationDev`, and `CreateResultInstitutionTypeDto` is equally permissive. So the Dev endpoint is exposed to that shape through code chunk 2 did not modify. The Innovation **Dev** endpoint was deliberately left as-is: different surface, unspecified ACs, live production data. **Read the exposure precisely — this is the part that is easy to get wrong:** the new guard is a property of the **endpoint, not of the data**. Chunk 2's rows are protected *when written through chunk 2's endpoint*, and not otherwise. Platform exposure is now **asymmetric**, and the asymmetry is what makes it easy to mis-summarise as "fixed". Discovered by chunk 2's T-10 fixture against real MySQL (cross-result variant: `actor_type_id` 900853→900854, `actors_count` 900882→900883), then found to have a **second, likelier variant** by `/akili-validate` (same-result cross-role — needs no knowledge of another result). Pre-existing platform behaviour that chunk 2 did not introduce. | **its own spec — not chunk 3** | **OPEN — owned by [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718). Needs its own Lite/Bug-Mode spec** mirroring chunk 2's fix into `customSaveInnovationDev`, with a red-before-green fixture per variant. Chunk 2's `assertInnovationUseOwnership` (both services) is the working exemplar; the shape transfers directly, but the Dev path's ACs are unwritten and its data is live, so it needs a migration-grade human review gate rather than a copy-paste. **Do not close chunk 2's archive as "authorization fixed"** — it is fixed on one of two endpoints over the same tables. *(Filed 2026-08-20 from `details-api` validation; both auditors independently recommended gating the archive on this row existing.)* |
| FR-5 | Indicator 6 is already active in the `indicators` catalog and already has `result_status_workflow` rows, so users may be able to create Innovation Use results **today** and land on a result with no indicator section. | 2 / 3 | Verify current behavior against the deployed environment before shipping; if reachable, chunk 3 closes an existing gap rather than adding a new entry point. |
| **FR-8** | **`bugfix/innovation-use-draft-save`** (not a family chunk — a bugfix that touched chunks 1 and 3's shipped code) deferred two items by explicit user ruling, to prioritise a stable test deployment: **(a)** dead code — `_effectiveExplanation` plus three stale rationale paragraphs (`result-innovation-use.service.ts:263-264`, `:269-271`, `:278-284`) and a comment in a fixture that now falsely claims a deleted validator was reached, all zero functional effect; **(b)** `ADVISORY R1` — nothing in the repo asserts `result_status_workflow` row id 30 dispatches `completenessValidation` with `enabled: true`, so a future migration silently flipping it would leave every test in that spec green while removing the section's last server-side completeness enforcement | none — owned by the bugfix spec itself; iteration continues there, not as a new family chunk | **Deferred, not dropped.** Pick up (b) first — test-only, highest-value, the one unasserted premise in that spec's R-IUD-002 chain. See `bugfix/innovation-use-draft-save/design.md` §7 *"Deferred by user ruling"* and `docs/specs/innovation-use/OPEN-ITEMS.md` §3.1 rows **D1**/**D2** |
| **FR-9** | **`completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for every indicator** (`result_status_workflow` rows 1, 7, 13, 19, 25 — uniform across indicators 1, 2, 3, 4, 6; only the `REVISED → SUBMITTED` rows have it `true`). So any API client can submit an incomplete result on a **first** submission; only the STAR client's green-check gating prevents it, and that is client-side only. Whether this is deliberate (first submit may be incomplete by design) or a config that was never switched on is **unknown from the repo** — found while diagnosing `bugfix/innovation-use-draft-save`, not caused by it | none — needs its own product/security decision, platform-wide, not one indicator | **Filed, not actioned**, at `bugfix/innovation-use-draft-save/proposal.md` §15, indexed at `docs/specs/innovation-use/OPEN-ITEMS.md` §5 row **P1**. If ever enabled, it must be enabled **uniformly** across all six indicators' `DRAFT → SUBMITTED` rows, never selectively — enabling it for one indicator inside an unrelated change would smuggle a platform behavior change through the wrong door |
| **FR-10** | Results Center chip bar hardcodes `able` in `onChangeList`; indicator 6 was omitted, leaving the Innovation Use filter greyed out despite the server returning it | none | **done (archived 2026-08-24)** — [`docs/specs/archive/2026-08-24-bugfix--results-center-innovation-use-filter/`](../archive/2026-08-24-bugfix--results-center-innovation-use-filter/) — add `6` to the Results Center allowlist without copying create-result's membership |
| **FR-11** | A saved Innovation Use row whose effective catalog `level` is below 6 (or absent) can still hold a leftover `innovation_use_level_explanation`: STAR re-sends the hidden text, and omitted-key preserve (DD-14) keeps it | none | **done (archived 2026-08-24)** — [`docs/specs/archive/2026-08-24-bugfix--innovation-use-stale-justification/`](../archive/2026-08-24-bugfix--innovation-use-stale-justification/) — server write-time clear when effective catalog `level` is `< 6` or absent. Not a family child. |
| **FR-12** | **`docs/specs/changes/measure-number-signed-decimal`** (not a family chunk — an out-of-family change spec that touched chunk 3's shipped code) split chunk 3's `R-IUP-008` (`details-page/requirements.md:450`): `quantification_number` was governed by that requirement's single "reject negatives and fractions" clause alongside six person/organization count fields, and now accepts **signed decimals** (scale ≤ 4, magnitude derived per its own `DD-14`) — the opposite rule. `R-IUP-008` is amended in place to name only the surviving **six** count fields; `quantification_number`'s new rule lives in that spec's own `R-MSD-007`/family of requirements. The column itself also changed, `bigint` → `DECIMAL(24,4) NULL`, and the shared `QuantificationItemComponent` / `app-input` cards chunk 3 built are now parameterized (`min`/`max`/`placeholder`/`maxFractionDigits`) rather than hard-coded — additive defaults reproduce OICR's prior behaviour by construction, so no OICR file is edited | none — owned by that spec itself, not chunk 3 | **This is a manifest cross-reference (`S-10`), not a new family child** — the closed-set rule above is untouched. See [`docs/specs/changes/measure-number-signed-decimal/`](../changes/measure-number-signed-decimal/) for the full spec; `R-IUP-008`'s amendment note (`docs/specs/archive/2026-08-26-innovation-use--details-page/requirements.md`) is the other half of this cross-reference. |

---

## Family Open Questions

| ID | Question | Blocks |
| --- | --- | --- |
| ~~OQ-F1~~ | ~~The PRMS screenshot shows a top-level *"Is this innovation linked or bundled with another CGIAR-reported result? (Yes/No)"*… is it in scope, and does it reuse STAR's `links-to-result` section?~~ **RESOLVED 2026-08-19 by user ruling at chunk 2's specify gate → `details-api/requirements.md` D-IUA-1: OUT OF SCOPE.** The story's field list does not contain it and D-3 makes the story govern over the screenshot. Binds chunk 3 too — the field must not reappear there | — |
| ~~OQ-F2~~ | ~~The screenshot shows *"This is yet to be determined"* radio/checkbox controls on the use-level and actor blocks. In scope?~~ **RESOLVED 2026-08-19 by user ruling at chunk 2's specify gate → `details-api/requirements.md` D-IUA-2: OUT OF SCOPE.** Fields stay plain nullable; `null` already means "not answered yet" and draft-save supports it. A tri-state would need columns chunk 1 never shipped and would change the frozen `innovation_use_validation`. Binds chunk 3 too | — |
| ~~OQ-F3~~ | ~~Does CLARISA publish an innovation use level catalog?~~ **RESOLVED 2026-08-14** → chunk 1 decision **D-1**. CLARISA's `GET /api/innovation-use-levels` returns only `{id, name}` — no `level`, no `definition`. A live sync would erase the two fields every rule depends on, so the catalog is seeded by migration with ten canonical rows. Not a parallel-taxonomy violation: the vocabulary *is* CLARISA's, only its transport is local. | — |
| OQ-F4 | `docs/specs/general-setup/family.md` is missing. Should it be authored so future families share one schema? | none (methodology hygiene) |

### Resolved family-wide decisions (2026-08-14)

| # | Decision | Binds |
| --- | --- | --- |
| D-1 | Use-level catalog seeded by migration; **`id = level + 1`**, so the FK value is never the scale point. `name` is **non-unique** (it repeats in pairs across adjacent levels). | 1, 2, 3 |
| D-2 | "Unit of measure" is **free text** — no catalog, in any chunk. | 1, 2, 3 |
| D-3 | Where the user story and the PRMS screenshot disagree, **the story governs**; the image is reference only. | 1, 2, 3 |
| D-4 | The screenshot's "How many" (disaggregation not applicable) **is the total** for that actor row — an aggregate mode, mutually exclusive with the four disaggregated counts. | 1, 2, 3 |
| ~~D-5~~ | ~~New fields are `@OpenSearchProperty`-decorated.~~ **REVISED after Judgment Day round 1 → D-8.** | — |
| D-6 | Green-check-as-stored-routine recorded as **new TRD ADR-11**, plus an **ADR-6 amendment** (the results mapping comes from a DTO, not the entity). | 1 |
| **D-8** | **OpenSearch indexing of indicator-specific detail fields is a non-goal.** The results mapping is generated from `ResultOpensearchDto`, never an entity, and no indicator has detail fields indexed. | 1, 2, 3 |
| **D-9** | **Every spec adding a table or column under `results` must amend all FOUR lifecycle routines** — `SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, and **`delete_result`** (the soft-delete path, `1764275660631:312-511`, called from three sites). **Enumerate them by call site, never by suspected name** — three consecutive review rounds got this set wrong by guessing at names. They enumerate tables and columns by name; new schema is silently skipped on version/snapshot and orphaned on delete — with no error, log, or metric. | **1, 2, 3** |
| **D-10** | **Transcribe SQL routines before writing about them.** Two Judgment Day rounds on chunk 1 found factual errors in routine claims — a wrong file citation, a non-functional datasource mechanism, and a missed third routine — every one from describing SQL instead of reading it. Chunk 1 produced [`data-model-and-catalog/routine-transcript.md`](../archive/2026-08-19-innovation-use--data-model-and-catalog/routine-transcript.md) as the fix; later chunks touching SQL should do the same. | **1, 2, 3** |

> **Carry these into chunks 2 and 3 — two are trap-shaped:**
> - **`id ≠ level`.** Any rule written `innovation_use_level_id >= 6` is off by one (id 6 is level 5). Join the catalog, compare `level`. Chunk 3's stepper must render by `level`, not by `id`.
> - **`ControlListBaseService.findAll()` has no `order` clause** and `findByName` is a `LIKE %name%` match. With names repeating in pairs, name lookup is ambiguous and scale order rests on accidental PK ordering. Chunk 2's catalog endpoint **must** order explicitly by `level` and must never resolve a level by name.

---

## Next Step

Children 1 and 2 are `done` and archived. Child 3 is **specified and approved through all three gates**; what remains is execution:

```text
/akili-execute docs/specs/innovation-use/details-page
```

Start it in a **fresh session** — everything execution needs lives in the three spec files, nothing in the specify conversation.

**Before the first task:** `OQ-IUP-4` gates one criterion of `T-11` (add a token to `colors.scss` in this spec, or defer to a separate design-system change?). It blocks nothing else, so execution can start on `T-01` while it is open.

**Not part of this chunk, and not closed by it:** **FR-7** / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718) needs its own Lite/Bug-Mode spec, and **G-3** (an e2e project pointed at the scratch container) is still owed from chunk 2.

> **Historical:** this section previously read *"Review and approve this manifest, then approve child 1: `/akili-specify docs/specs/innovation-use/data-model-and-catalog`"* — correct on 2026-08-14, stale from the moment chunk 1 archived on 2026-08-19. Updated 2026-08-20 at chunk 3's Phase-3 gate.
