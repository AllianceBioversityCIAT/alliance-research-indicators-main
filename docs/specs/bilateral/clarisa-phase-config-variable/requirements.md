# Requirements — Bilateral / CLARISA projects phase as an admin-editable variable

- **Module:** clarisa (consumer: bilateral project mapping)
- **Spec id:** 2026-08-clarisa-phase-config-variable
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked PRD section:** `docs/prd.md` — administration / controlled vocabularies
- **Linked tickets:** —
- **Last updated:** 2026-08-18
- **Extends:** `docs/specs/archive/2026-08-18-bugfix--bilateral-picker-fields/`
- **Depth:** Standard

---

## 1. Context

The phase that filters the bilateral CLARISA project picker is resolved in four tiers. Tier 2 — an `app_config` row — was designed to be operator-editable but **the row has never existed**, so every environment falls through to the hardcoded `DEFAULT_CLARISA_MAPPING_PHASE = 2026`.

Measured 2026-08-18: CLARISA test serves 299 projects, **all `phase = 2025`**. The dev picker therefore returns **0** of the 25 otherwise-eligible projects. Local works only because it points at CLARISA production, where `phase` is `null` and `matchesPhase` treats `null` as a wildcard.

This spec makes the phase visible and selectable on `/administration/configuration/variables`, so an admin can correct it in ≤5 minutes with no deploy.

**Not changing:** `DEFAULT_CLARISA_MAPPING_PHASE`; the `null`-is-wildcard semantics of `matchesPhase`; the client's swallowing of API errors into an empty list; dev's `ARI_CLARISA_HOST`.

---

## 2. Requirement numbering

`R-CPC-<NNN>` / `NFR-CPC-<NNN>`. `CPC` = **C**LARISA **P**hase **C**onfig, following the per-spec abbreviation style already used by `R-BPF-*` and `R-BAS-*` rather than the template's module-wide slug. Numbered foundational-first.

---

## 3. Functional requirements

### R-CPC-001 — The variable exists and is visible

- **As a** Center/System admin
- **I want** `ARI_CLARISA_PROJECTS_PHASE` to appear on the Configuration Variables screen
- **So that** I can see and change the CLARISA phase without a developer

The system SHALL seed one `app_config` row with `key = ARI_CLARISA_PROJECTS_PHASE`, `category = CLARISA`, `subcategory = PROJECTS`, `simple_value = '2026'`, and a description an operator can act on.

#### Scenario: Row appears after migration

- GIVEN the migration has been applied
- WHEN an admin opens `/administration/configuration/variables`
- THEN a row shows category `CLARISA`, subcategory `PROJECTS`, key `ARI_CLARISA_PROJECTS_PHASE`, value `2026`
- **BUT it must NOT** change the effective phase in any environment — `2026` is exactly what the default already resolved to, so deploying this row is behaviour-neutral by construction
- **AND IT MUST** be removable: `down()` deletes the row and leaves the table as it was

### R-CPC-002 — The seeded row governs the picker

The system SHALL resolve the phase from the `app_config` row (Tier 2) ahead of `ENV` and the literal default, taking effect without a deploy or restart.

#### Scenario: Admin corrects dev

- GIVEN an admin sets the value to `2025`
- WHEN the bilateral picker requests projects after the resolver's 5-minute TTL elapses
- THEN `targetPhase` is `2025` and the picker returns the 25 eligible projects
- **BUT it must NOT** require a deploy, a restart, or a DB console
- **AND IT MUST** fall through to `ENV` then the literal default — preserving today's behaviour exactly — when the value is blank, non-numeric, or the row is inactive

### R-CPC-003 — Offered years are derived from live CLARISA data

The system SHALL expose the distinct `phase` values actually present in the CLARISA project payload, so an admin cannot select a year that has no projects.

#### Scenario: Only real years are offered

- GIVEN CLARISA serves projects whose only phase is `2025`
- WHEN the year selector loads
- THEN `2025` is offered
- **BUT it must NOT** offer `2026`, because selecting it would silently empty the picker — the exact defect this spec exists to prevent
- **AND IT MUST** include the currently configured value even when it is absent from the derived set, so an admin can always see and change what is configured today

#### Scenario: CLARISA publishes no phases (production today)

- GIVEN every project returns `phase: null` — the current state of CLARISA production
- WHEN the year selector loads
- THEN the derived set is empty and the selector still offers the currently configured value
- **AND IT MUST NOT** render an empty, unusable control or block saving
- **AND IT MUST** make clear that no phase data is available upstream, rather than implying there are no projects

*This scenario is mandatory, not defensive padding: it is the live state of production on 2026-08-18, and Kaizen **K-013** is exactly the lesson that a requirement derived from a feed's current shape must name the condition that invalidates it.*

### R-CPC-004 — The edit control becomes a selector for this key

The system SHALL render a year selector instead of a free-text field when editing this key.

#### Scenario: Selector replaces text input

- GIVEN an admin with `canEditAppConfiguration()` opens the edit modal for `ARI_CLARISA_PROJECTS_PHASE`
- WHEN the modal renders
- THEN a year selector is shown
- **BUT it must NOT** change the control rendered for any other key, and must NOT disturb the existing structured-JSON branch
- **AND IT MUST** remain read-only for a user without `canEditAppConfiguration()`, matching the screen's current authorization behaviour

### R-CPC-005 — Tier 3 becomes discoverable

The system SHALL document `ARI_CLARISA_PROJECTS_PHASE` in `.env.example`.

#### Scenario: A new environment is set up

- GIVEN a developer configures a fresh environment from `.env.example`
- WHEN they read the file
- THEN the variable is present with a comment explaining that it overrides nothing when the `app_config` row is set
- **AND IT MUST** state the literal fallback (`2026`) so the silent default stops being invisible

---

## 4. Non-functional requirements

### NFR-CPC-001 — Effect without deploy
A saved value SHALL take effect within the resolver's existing 5-minute TTL, with no restart.

### NFR-CPC-002 — No added upstream load
The year-derivation endpoint SHALL read the payload the CLARISA service already caches. It MUST NOT trigger an additional call to CLARISA.

### NFR-CPC-003 — Authorization unchanged
Reading and editing SHALL require the same roles the config screen already enforces (`CENTER_ADMIN`, `SYSTEM_ADMIN`). No new auth path.

### NFR-CPC-004 — Migration runnable and reversible
The migration SHALL be proven to execute and revert against a real schema, not merely to compile and lint (Kaizen **K-006**).

---

## 5. Data requirements

| Column | Value |
| --- | --- |
| `key` | `ARI_CLARISA_PROJECTS_PHASE` (already in `AppConfigKey`) |
| `category` | `CLARISA` |
| `subcategory` | `PROJECTS` |
| `simple_value` | `'2026'` |
| `description` | Operator-facing: what it filters and what happens if unset |
| `json_value` | `NULL` — this is a simple value, not a structured one |

Additive INSERT only. No schema change, no column added, no index.

---

## 6. API surface delta

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | *(new, under the existing CLARISA projects controller)* | Returns the distinct `phase` values present in the cached payload, with a count per year |

Exact path, envelope, and roles are a design decision (`design.md`). It inherits `ServerResponseDto`, `@ApiBearerAuth`, and `RolesGuard` like every sibling endpoint.

---

## 7. Cross-system impact

| Area | Impact |
| --- | --- |
| `MappingPhaseResolver` | **None** — Tier 2 already reads this key |
| `ClarisaProjectsService` | Read-only reuse of the existing cache |
| `edit-environment-variable-modal` | One new branch in the existing control dispatch |
| `bilateral/clarisa-automapper-s2` | S2's review queue inherits the picker; a correct phase is a precondition |
| CLARISA upstream | No new calls |

---

## 8. Defect classes this spec can produce, and the gate for each

| # | Defect class | Gate | Input that makes it FAIL |
| --- | --- | --- | --- |
| D-1 | Migration does not run (placeholder hazard; reserved word `key` unescaped) | `npm run migration:dev:execute` then `npm run migration:revert` against a scratch schema | A `?` inside a comment, or `WHERE key =` without backticks — both throw before MySQL parses |
| D-2 | Row seeded with wrong column values | Server unit test asserting the exact inserted tuple | Change `category` to `API` → assertion fails |
| D-3 | Tier 2 stops winning over ENV/default | Resolver unit tests across all four tiers | Make Tier 2 return `undefined` → the 2025 case falls to 2026 and fails |
| D-4 | Year endpoint adds an upstream CLARISA call | Test asserting `connection.get` call count is unchanged | Bypass the cache → count increments and fails |
| D-5 | Selector renders for the wrong key, or breaks the JSON branch | Client unit tests on the modal's control dispatch | Drop the key guard → a JSON key renders a year select and fails |
| D-6 | Empty-year edge (all phases `null`) renders an unusable control | Client + server tests with an all-`null` payload | Return `[]` with no fallback → the configured value disappears and fails |
| **D-7** | **The selector is visually wrong, misaligned, or unreadable** | **NONE — no automated gate.** jsdom cannot measure layout, and the repo has no visual-regression harness | *n/a* |

**D-7 is an acknowledged blind spot, substituted not ignored.** The mitigation is a **human visual check at the Phase-3 HITL pause** — an admin opens the modal on the running dev stack and confirms the selector. Recording it here is the point: an unacknowledged blind spot is what consumes rework attempts.

*Section added beyond the general-setup template, per the `/akili-specify` defect-class mapping rule.*

---

## 9. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | `AppConfigKey.ARI_CLARISA_PROJECTS_PHASE` already exists in the enum | Verified 2026-08-18 — no enum change needed |
| A-2 | Seeding `2026` is behaviour-neutral | True **because** `2026` is what the literal default already yields. This assumption dies if the default changes |
| R-1 | **K-013** — production tolerates any phase only while CLARISA leaves `phase` `null`. The day it populates the field, production behaves like dev does now | Measured 2026-08-18; R-CPC-003's second scenario encodes the condition |
| R-2 | **K-005** — the phase is a **discriminator**, not a destination. It selects which CLARISA cohort is eligible | The tier cascade stays intact; no collapsing to a single global value |
| R-3 | The exemplar migration's `down()` uses `WHERE key = '…'` unescaped, and `KEY` is a MySQL reserved word | Do not copy it; use backticks |
| R-4 | The dev DB is shared and not disposable (root `CLAUDE.md` §4.3) | Single additive INSERT with a working `down()` |

---

## 10. Open questions

| # | Question | Owner | Needed by |
| --- | --- | --- | --- |
| OQ-1 | Should the year selector display a project count per year (e.g. `2025 (25)`)? It would make an empty year obvious before selecting it | BA | design |
| OQ-2 | Should the derived years come from **all** CLARISA projects or only **bilateral + Alliance-eligible** ones? The eligible set is what the picker actually shows | BA | design |
| OQ-3 | Should `phase: null` keep meaning "matches everything"? Out of scope here; it is why production has never exercised this filter | Product | future spec |

*Resolved before drafting: seed value = `2026`; years derived from CLARISA; category/subcategory = `CLARISA` / `PROJECTS`.*

---

## 11. Sign-off

| Role | Name | Status |
| --- | --- | --- |
| Requester | Juan Carlos Cadavid | pending |
| Spec author | AKILI-SPECS | drafted 2026-08-18 |

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
