# Design — CLARISA projects phase as an admin-editable variable

- **Spec id:** 2026-08-clarisa-phase-config-variable
- **Status:** draft
- **Depth:** Standard
- **Last updated:** 2026-08-18
- **Requirements:** `requirements.md` (`R-CPC-001`…`R-CPC-005`, `NFR-CPC-001`…`NFR-CPC-004`)

---

## 1. Executive Summary

Three moving parts, in dependency order:

| # | Part | Package | Serves |
| --- | --- | --- | --- |
| 1 | Seed migration for one `app_config` row | server | `R-CPC-001` |
| 2 | Read-only endpoint returning the phases present in the cached CLARISA payload | server | `R-CPC-003`, `NFR-CPC-002` |
| 3 | Key-aware editable year selector in the config edit modal | client | `R-CPC-004` |

Nothing changes in `MappingPhaseResolver` — Tier 2 already reads this key. The spec exists to populate a tier that was built and never used.

---

## 2. Architecture Overview

```
Admin ──► Configuration Variables screen
            └─ edit modal
                 ├─ control dispatch  ──► year selector (editable)
                 └─ years  ◄── GET /api/tools/clarisa/projects/phases
                                  └─ ClarisaProjectsService.getCachedAll()   [5-min TTL, no new upstream call]

Picker ──► GET /api/tools/clarisa/projects/bilateral
             └─ MappingPhaseResolver.resolvePhase()
                  Tier 2 ──► app_config.ARI_CLARISA_PROJECTS_PHASE   ← the row this spec seeds
```

The phase endpoint and the picker endpoint read the **same cached payload**, so the years offered and the projects filtered can never come from different snapshots within a TTL window.

---

## 3. Extended Directory Structure

| Path | Change |
| --- | --- |
| `server/…/src/db/migrations/<ts>-SeedClarisaProjectsPhase.ts` | **new** |
| `server/…/src/domain/tools/clarisa/projects/clarisa-projects.service.ts` | + one read-only method |
| `server/…/src/domain/tools/clarisa/projects/clarisa-projects.controller.ts` | + one `@Get` handler |
| `server/…/src/domain/tools/clarisa/projects/dto/` | + response type for the phases endpoint |
| `server/…/.env.example` | + documented variable |
| `client/…/shared/services/api.service.ts` | + one GET method |
| `client/…/all-modals/modals-content/edit-environment-variable-modal/` | + control branch, + year loading |

No new module, no new route node, no schema change.

---

## 4. Data Model

One additive row in the existing `app_config` table. Column values are fixed by `R-CPC-001` §5. `json_value` stays `NULL` — this is a simple value.

The migration is **INSERT-only**. It adds no column, no index, no constraint, and its `down()` is a single scoped `DELETE`.

---

## 5. API Design

### New: phases available for selection

- **Method / path:** `GET` on the existing CLARISA projects controller, sibling to `bilateral`.
- **Roles:** `CENTER_ADMIN`, `SYSTEM_ADMIN` — identical to `bilateral`. No new auth path (`NFR-CPC-003`).
- **Envelope:** `ServerResponseDto` via `ResponseUtils.format`, like every sibling.
- **Swagger:** `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` — mandatory per the server guide.
- **Payload shape (conceptual):** an ordered collection of the distinct phases present, each with the number of eligible projects carrying it, plus a separate count of projects whose phase is absent.

The absent-phase count is not decoration — it is what lets the client satisfy `R-CPC-003`'s production scenario by saying *"CLARISA publishes no phase data"* instead of implying there are no projects.

---

## 6. Backend Module Design

### 6.1 Service method — phases from the eligible cohort

A new read-only method on `ClarisaProjectsService`:

1. Reads `getCachedAll()` — the same cache the picker uses. **No new upstream call** (`NFR-CPC-002`).
2. Applies `isBilateralFunding` **and** `isAllianceProject`, and deliberately **not** `matchesPhase` — the phase is what we are enumerating, so filtering by it would be circular.
3. Groups the survivors by phase, counting each, and counts the phase-absent remainder separately.
4. Returns years in descending order.

Reuses the existing predicates from `project-selector.util.ts` rather than re-deriving them. If those predicates change, the offered years follow automatically — the coupling is intentional and single-sourced.

### 6.2 Controller handler

Thin: delegate, wrap in `ResponseUtils.format`, annotate for Swagger. No filtering logic in the controller — mirroring how `bilateral` delegates its eligibility rules to the service.

### 6.3 Migration

Follows the exemplar `1781879906673-AddNewEnvCl.ts` in shape, with two deliberate departures recorded in `DD-6`.

---

## 7. Frontend / UX Component Architecture

### 7.1 Control dispatch

The edit modal already dispatches on value shape — structured-JSON editor versus simple input. This adds a **third branch**, selected by key, ahead of the simple-input fallback. The JSON branch is untouched (`R-CPC-004` negative constraint).

### 7.2 The selector

- A `p-select` bound to `simple_value`, populated from the phases endpoint.
- **`editable` is ON** — see `DD-3`. The list guides; typing remains possible.
- Options are labelled with their project count (`DD-7`).
- The currently configured value is always present in the option set, injected client-side when the derived set does not contain it (`R-CPC-003`).
- When the derived set is empty, the control still renders with the configured value and shows an explanatory hint.

### 7.3 States

| State | Behaviour |
| --- | --- |
| Loading | Selector disabled with the modal's existing loading affordance |
| Loaded, years present | Options listed descending, each with its count |
| Loaded, no years (production today) | Configured value offered; hint states that CLARISA publishes no phase data |
| Request failed | Selector falls back to editable-only entry; failure is surfaced, **not** silently rendered as "no options" — this spec does not repeat the swallow-into-empty pattern that made the original defect invisible |
| No `canEditAppConfiguration()` | Read-only, matching the screen today |

### 7.4 Styling

Token utilities and the PrimeNG Aura preset only. No hex literals. The selector reuses the same `p-select` treatment as the bilateral picker so the two read as one system.

---

## 8. Shared Contracts

One client-side interface mirroring the endpoint's response, declared alongside the existing bilateral interfaces. No shared package change.

---

## 9. Design Decisions

| ID | Decision | Rationale | Rejected alternative |
| --- | --- | --- | --- |
| **DD-1** | Seed `simple_value = '2026'` | Behaviour-neutral **by construction**: `2026` is exactly what the literal default already yielded, so deploying the row changes nothing anywhere. It converts an invisible constant into a visible, editable one | `NULL` (leaves dev broken, matches exemplar); `2025` (fixes dev but lands a semantically wrong value in production — **K-005**: a discriminator must not be collapsed to one global value) |
| **DD-2** | Derive years from the **eligible** cohort (bilateral + Alliance), not all CLARISA projects | Deriving from all 299 projects could offer a year with projects but **zero eligible** ones — which still empties the picker, i.e. the exact defect this spec prevents. Resolves `OQ-2` | Deriving from the full payload; simpler but does not satisfy `R-CPC-003` |
| **DD-3** | The selector is **editable** (`p-select [editable]`) | **Outcome of the Step 2.3 reversion challenge — see §10.** Preserves the free-entry capability the current text field provides, while the derived list guides the common case | A closed select (loses a real capability); a toggle between select and text (two controls for one value) |
| **DD-4** | Control-type knowledge lives as a **client-side key constant**, not in the entity's unused `field` column | There are exactly **two** keys in `AppConfigKey`. A metadata-driven registry for one typed key is speculative generality, and it would commit the team to a contract nobody has designed | Using `field` as a type hint — the natural evolution when a *third* typed key appears, deliberately deferred |
| **DD-5** | The phases endpoint reads the existing cache | `NFR-CPC-002`. Also guarantees years and filtered projects come from one snapshot | A dedicated upstream call — extra load, and two snapshots that can disagree |
| **DD-6** | Migration uses a fully parameterized `INSERT`, and `down()` **backticks** the `key` column | `namedPlaceholders: true` makes any bare `?` or `:word` outside parameters throw before MySQL parses — including inside comments. And `KEY` is a MySQL reserved word, so the exemplar's unescaped `WHERE key =` is a latent defect not to inherit | Copying the exemplar verbatim |
| **DD-7** | Options display a per-year project count | Makes a thin year visible before it is chosen; the count is already computed by `DD-2`'s grouping, so it is free. Resolves `OQ-1` | Bare year labels |

---

## 10. Reversion Challenge (Step 2.3)

**Trigger:** `R-CPC-004` replaces a free-text field with a selector — that removes a capability admins have today.

**Question put to the challenge:** *what does removing free-text entry break?*

**Concrete breakage found:** at a portfolio rollover, ops may need to pre-set a year **before** CLARISA publishes any project carrying it — e.g. setting `2027` while CLARISA still only serves `2026`. A closed select derived from live data makes that impossible, and the workaround would be a DB write, which is precisely the thing this spec exists to eliminate.

**Design changed in response:** `DD-3` — the selector is `editable`. Verified against the installed PrimeNG 19.0.6: `Select.editable` is documented as *"custom value instead of predefined options can be entered using the editable input field."*

Without this challenge the design would have shipped a closed select and re-discovered the gap at the first rollover.

---

## 11. Budget (Step 2.4)

| Metric | Expected |
| --- | --- |
| Tasks | **4** |
| LOC | **~450** (≈200 production, ≈250 tests) |
| Review rounds | **~6** |

*Revised at Phase 3 (2026-08-18): the phases endpoint's service method, DTO, and controller handler are one vertical slice — splitting them would create a task that cannot be verified without its sibling. 5 → 4 tasks, 7 → 6 rounds. LOC unchanged.*

Depth re-checked against the finished design: **Standard holds.** Five tasks across two packages with a migration is above Lite and well below the alternatives/rollout apparatus Full exists for.

`/akili-execute` trips on these numbers. Exceeding them is information to escalate, not a failure to hide.

---

## 12. Risks Carried Into Execution

| # | Risk | Handling |
| --- | --- | --- |
| X-1 | Migration compiles, lints, and still cannot run (**K-006**) | Verification is executing it against a scratch schema **and reverting**, not `npm run build` |
| X-2 | The gate for X-1 has never been seen failing (**K-004**) | The task must break it on purpose once — a `?` in a comment — confirm it reddens, then restore |
| X-3 | Production's all-`null` phases make the derived set empty (**K-013**) | `R-CPC-003` scenario 2 is a required test, not an edge case |
| X-4 | Visual correctness of the selector has **no automated gate** (`requirements.md` D-7) | Human check at the Phase-3 HITL pause; recorded as an accepted blind spot |
| X-5 | Two packages touched | Server and client tasks are cross-package and editable in parallel; full-suite runs are **not** — the Leader re-measures after each worker reports (root `CLAUDE.md` §4.3) |

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
