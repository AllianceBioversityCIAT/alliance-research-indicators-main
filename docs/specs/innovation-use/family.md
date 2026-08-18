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
| 1 | Data model, catalog & green check | `docs/specs/innovation-use/data-model-and-catalog/` | **`bugfix/sp-versioning-roles-id`** (external) | no | pending |
| 2 | Innovation Use details API | `docs/specs/innovation-use/details-api/` | `innovation-use/data-model-and-catalog` | no | pending |
| 3 | Innovation Use details page (STAR) | `docs/specs/innovation-use/details-page/` | `innovation-use/details-api` | no | pending |

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
| FR-6 | **`SP_versioning` is non-executable in `main` today**, for all six indicators — two blocks name `roles_id`, dropped by `1783022620616`. Pre-existing; discovered by chunk 1's routine transcription. Blocks chunk 1's versioning gate. | 1 | **Routed 2026-08-14 to its own spec:** [`docs/specs/bugfix/sp-versioning-roles-id/`](../bugfix/sp-versioning-roles-id/), Lite/Bug Mode, red-before-green regression fixture. Chunk 1 **`Depends on`** it and must not start T-10 until it merges. → **Closes on merge of this PR** (edited 2026-08-18 by that spec's T-03). Both required migrations are `[x]` done and each proven red-before-green **on the scratch schema**: `repairSpVersioningObjectiveBlocks` (T-02 — MySQL 1054 red, green after) and its mandatory companion `repairSpDeleteResultVersionObjectiveTables` (T-02b — MySQL 1451 red, green after; required by RB-5 so the repair could not ship alone). See `bugfix/sp-versioning-roles-id/execution.md` → *T-02* and *T-02b* for the verbatim evidence. **Still required before T-10:** the pre-flight `SHOW CREATE PROCEDURE SP_versioning` check against the target database — these migrations exist only on branch `AC-1679-Create-the-innovation-use-section` and have not yet run against the shared dev DB (see `devops-note.md` and `requirements.md` §7 Sign-off, both still open). |
| FR-5 | Indicator 6 is already active in the `indicators` catalog and already has `result_status_workflow` rows, so users may be able to create Innovation Use results **today** and land on a result with no indicator section. | 2 / 3 | Verify current behavior against the deployed environment before shipping; if reachable, chunk 3 closes an existing gap rather than adding a new entry point. |

---

## Family Open Questions

| ID | Question | Blocks |
| --- | --- | --- |
| OQ-F1 | The PRMS screenshot shows a top-level *"Is this innovation linked or bundled with another CGIAR-reported result? (Yes/No)"* and the business rules mention a Yes→No response, but no such field appears in the story's field list. Is it in scope, and does it reuse STAR's existing `links-to-result` section (today indicator 5 only)? | 2, 3 |
| OQ-F2 | The screenshot shows *"This is yet to be determined"* radio/checkbox controls on the use-level and actor blocks. Not in the story's field list. In scope? | 2, 3 |
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
| **D-10** | **Transcribe SQL routines before writing about them.** Two Judgment Day rounds on chunk 1 found factual errors in routine claims — a wrong file citation, a non-functional datasource mechanism, and a missed third routine — every one from describing SQL instead of reading it. Chunk 1 produced [`data-model-and-catalog/routine-transcript.md`](data-model-and-catalog/routine-transcript.md) as the fix; later chunks touching SQL should do the same. | **1, 2, 3** |

> **Carry these into chunks 2 and 3 — two are trap-shaped:**
> - **`id ≠ level`.** Any rule written `innovation_use_level_id >= 6` is off by one (id 6 is level 5). Join the catalog, compare `level`. Chunk 3's stepper must render by `level`, not by `id`.
> - **`ControlListBaseService.findAll()` has no `order` clause** and `findByName` is a `LIKE %name%` match. With names repeating in pairs, name lookup is ambiguous and scale order rests on accidental PK ordering. Chunk 2's catalog endpoint **must** order explicitly by `level` and must never resolve a level by name.

---

## Next Step

Review and approve this manifest, then approve child 1:

```text
/akili-specify docs/specs/innovation-use/data-model-and-catalog
```
