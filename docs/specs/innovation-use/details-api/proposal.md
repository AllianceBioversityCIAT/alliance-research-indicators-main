# Proposal — Innovation Use: Details API

> **Chunk 2 of 3** in the `innovation-use` spec family. Server-only. Exposes the read/write contract the STAR page consumes.

---

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/details-api/` |
| Parent Spec | `docs/specs/innovation-use/` |
| Slug | `details-api` — derived from the free-text `/akili-propose` argument |
| Type | Change |
| Approval Mode | gated |
| Depends on | `docs/specs/innovation-use/data-model-and-catalog` |
| Parallel-safe | no |
| Tier | server (`server/researchindicators`) |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Created | 2026-08-14 |

---

## Intent

Expose one versioned REST contract that reads and writes the whole Innovation Use details section — level, explanation, actors, organizations, quantitative measures — plus the catalog endpoint for the 0–9 use levels, so the STAR page has a single save call and a single load call.

---

## Problem / Current Behavior

Chunk 1 leaves tables with no way to reach them. Concretely:

- There is no `result-innovation-use` module under `domain/entities/` and no route registered in `domain/routes/main.routes.ts`.
- The 0–9 use-level catalog has no controller, so the client cannot render the level scale or its definitions.
- Server-side enforcement of the story's business rules (non-negative integers, duplicate actor types, conditional explanation for level ≥ 6, read-only total) does not exist. Without it, the client is the only validator — which fails **AC-Role-Correctness** ("authorization is the source of truth; the client mirrors but never replaces it") and lets an invalid result be saved as complete.

The nearest working analogue is `result-innovation-dev` (controller + service + DTOs + module), which this chunk mirrors.

---

## Proposed Outcome

- `GET` returns the complete Innovation Use details payload for a result; `PATCH`/`POST` persists it transactionally.
- A control-list endpoint returns the 0–9 use levels with `level`, `name`, `definition`.
- Server-side validation rejects negative or fractional counts, duplicate actor types within a result, and a missing explanation when level ≥ 6.
- `Total Actors` is **derived, never accepted** from the client.
- Every response passes through `ResponseInterceptor` as `ServerResponseDto`; every endpoint carries `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-param Swagger decorators.
- Mutations pass `ResultStatusGuard` and populate audit fields.

---

## Scope

**In**

1. New module `domain/entities/result-innovation-use/` — controller, service, DTOs, module, route registration in `main.routes.ts`.
2. Read endpoint returning: use level, explanation, actors (with counts + derived total), organizations, other quantitative measures.
3. Write endpoint persisting the full section in one transaction, including nested collection reconciliation (create / update / soft-delete) for actors, organizations, and quantifications — scoped by their Innovation Use role discriminators.
4. Control-list controller for the use-level catalog.
5. Validation: non-negative integers, duplicate-actor-type prevention, conditional explanation (level ≥ 6), actor type required before an actor row saves.
6. Green-check recalculation triggered on save, consistent with how `result-innovation-dev` does it.
7. `@Roles(...)` + `ResultStatusGuard` wiring matching the Innovation Dev section.
8. Sibling `*.spec.ts` for controller + service; e2e coverage for the save/load round trip.

**Out**

- Schema, catalog seed, and stored function → **chunk 1**.
- Any Angular change → **chunk 3**.
- Investment / co-investment endpoints (family non-goal).
- Changes to the shared General Information / Alignment / Partners / Geographic Scope / Evidence / IP Rights endpoints — these are reused as-is.

---

## Non-Goals

- Re-designing the section-save contract for other indicators.
- A bulk-upload or AI-formalization path for Innovation Use.
- Cross-platform (PRMS/TIP) push of Innovation Use records.

---

## Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| `server/.../entities/result-innovation-use/` | **new** module |
| `server/.../domain/routes/main.routes.ts` | new route registration |
| `server/.../entities/result-actors`, `result-institution-types`, `result-quantifications` | new write paths scoped by role discriminator |
| `server/.../entities/green-checks/` | recalculation call on save |
| Swagger `/swagger` | new tag + endpoints |
| Persona | Result Contributor (US-RC-1, US-RC-2, R-2, R-3) |
| PRD | G1, G3, G7; AC-API-Surface, AC-Results-Lifecycle, AC-Role-Correctness, AC-Testing |

---

## Visual Reference

- **Source:** Screenshots supplied in the `/akili-propose` invocation (2026-08-14). No Figma, no generated mockup.
- **Location:**
  - PRMS Innovation Use reporting form — **field/data reference only**, used here to enumerate the payload fields. Not a STAR mock.
  - STAR `innovation-details` page (result STAR-19530) — style reference, binding on chunk 3.
- **Notes:** API-only chunk; no visual surface of its own. The PRMS screenshot is the authority for *which* fields the contract must carry.

---

## Requirement Delta Preview

### ADDED

- Read and write endpoints for the Innovation Use details section.
- A use-level control-list endpoint.
- Server-enforced validation of counts, duplicates, and the conditional explanation.
- Derived Total Actors computed server-side.

### MODIFIED

- `main.routes.ts` gains one route registration (additive).
- Green-check recalculation now fires for indicator 6 results.

### REMOVED

- None.

---

## Approach Options

### Option A — One section endpoint, mirroring `result-innovation-dev` (recommended)

A single `GET` + a single write endpoint carrying the whole section, with the service reconciling nested collections in one transaction.

| | |
| --- | --- |
| ✅ | Matches the established per-section contract; the client's existing section-save pattern works unchanged |
| ✅ | One transaction → the section is never half-saved, so green checks never observe a torn state |
| ✅ | One green-check recalculation per save |
| ⚠️ | A larger DTO with nested validation; needs careful reconciliation logic for the repeatable rows |

### Option B — Granular sub-resource endpoints (actors, organizations, quantifications each CRUD)

| | |
| --- | --- |
| ✅ | Smaller DTOs, simpler per-endpoint validation |
| ❌ | Diverges from every other STAR section; the client would need bespoke save orchestration |
| ❌ | Partial-save states — an actor saved while the level fails leaves the section inconsistent |
| ❌ | N green-check recalculations per user save, or none at all |

### Option C — Extend the existing `result-innovation-dev` module to serve both indicators

| | |
| --- | --- |
| ✅ | No new module |
| ❌ | Conflates two indicators with genuinely different fields and different validation into one service |
| ❌ | Every Innovation Dev change now risks Innovation Use and vice versa — the opposite of the isolation the story asks for |

---

## Recommended Approach

**Option A.** It is the smallest safe path because it reuses a contract shape the client already knows how to consume, and the single-transaction boundary is what makes "invalid data must not be saved as complete" actually enforceable. Option B's partial-save states directly contradict that acceptance criterion; Option C trades a small saving now for permanent coupling between two indicators.

---

## Risks, Dependencies, And Open Questions

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R-1 | Nested collection reconciliation (which rows to create / update / soft-delete) is the classic source of orphaned or duplicated child rows. | **High** | Reconcile strictly within the Innovation Use role discriminator so Innovation Dev rows on the same result are never touched; e2e round trip covering add, edit, and remove of each repeatable row type. |
| R-2 | Duplicate-actor-type prevention enforced only in application code can be raced. | Medium | Enforce in the service; evaluate a partial unique constraint during specify. Decide explicitly rather than by omission. |
| R-3 | Accepting `total` from the client would let a saved total disagree with its parts. | Medium | Never bind `total` from the request; compute on read. Assert in a spec. |
| R-4 | Green-check recalculation timing — the client must see a fresh status right after save ("status must refresh after create, update, deletion, or conditional changes"). | Medium | Recalculate inside the save flow and return the refreshed checks, matching Innovation Dev's behavior. |
| R-5 | Missing Swagger decorators would violate a hard repo convention. | Low | Checklist item in `tasks.md`; Reviewer verifies. |
| R-6 | KZ-004 — verification gates waived for missing prerequisites. | Low | Pre-flight `node_modules` before the first gate. |

**Dependencies**

- **Hard:** chunk 1 must be merged — tables, catalog, discriminator rows, and the stored function must exist.
- CLARISA actor types and institution types (already synced).

**Open Questions**

| ID | Question | Blocks |
| --- | --- | --- |
| OQ-1 | Family **OQ-F1** — is the "linked or bundled with another CGIAR result?" Yes/No field in scope, and does it reuse `links-to-result` (currently indicator 5 only)? If yes, this chunk grows. | contract shape |
| OQ-2 | Family **OQ-F2** — are the "This is yet to be determined" controls in scope? They imply a tri-state (value / not-determined / empty), not a plain nullable number. | DTO shape |
| OQ-3 | Should duplicate actor types be a DB constraint or service-level only? | R-2 |
| ~~OQ-4~~ | ~~Do the new fields need `@OpenSearchProperty` decoration?~~ **RESOLVED** → **D-5**: yes, and chunk 1 owns it (R-IU-010). Nothing for this chunk. | — |
| OQ-5 | **Inherited trap (family D-1).** The catalog's `id` is **not** its `level` (`id = level + 1`), and `name` repeats in pairs across adjacent levels. This chunk's catalog endpoint must order explicitly by `level` — `ControlListBaseService.findAll()` has **no `order` clause** — and must never resolve a level by name, because `findByName` is a `LIKE %name%` match. | endpoint correctness |

---

## Success Criteria

- [ ] `GET` returns the full section for an indicator-6 result, with Total Actors derived and correct.
- [ ] A full save round trip persists level, explanation, actors, organizations, and quantitative measures, and re-reads identically.
- [ ] Removing a repeatable row on save removes exactly that row and leaves Innovation Dev rows on other results untouched.
- [ ] Negative, fractional, or duplicate-actor-type payloads are rejected with a `ServerResponseDto` error naming the offending field.
- [ ] A level ≥ 6 payload without an explanation is rejected; a level < 6 payload without one is accepted.
- [ ] A client-supplied `total` is ignored, not trusted.
- [ ] Green checks refresh within the save response.
- [ ] Swagger documents every new endpoint with the four required decorators.
- [ ] `npm test -- --silent`, `npm run test:e2e`, and `npm run lint -- --quiet` pass; coverage ≥ 60%.

---

## Next Step

Approve chunk 1 first. Then:

```text
/akili-specify docs/specs/innovation-use/details-api
```
