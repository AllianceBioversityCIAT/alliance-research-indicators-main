# Design — Clarisa / Bilateral Project Picker Fields

- **Spec id:** 2026-08-bilateral-picker-fields
- **Status:** draft
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Depth:** Standard, Bug Mode
- **Last updated:** 2026-08-18

---

> ## ⚠ AMENDED 2026-08-18 — Pivot, Option A + C
>
> The CLARISA feed reset mid-implementation: both hosts now return 25 Alliance bilateral rows, **0** with `phase = 2026`, **0** with `external_code`, and `short_name == full_name` on **25 of 25**. The label shipped by T-02/T-03 therefore renders every option's name twice.
>
> Figures below that cite 342 rows are point-in-time and kept for the reasoning trail. **DD-9** and **DD-10** carry the amendment; the budget in §11 is superseded by §11.1.

---

## 1. Executive Summary

Three edits in one atomic change, plus one decision the user must make.

| Layer | Edit | Requirement |
| --- | --- | --- |
| Server projection | Add `full_name` + `description` to the picker item | R-BPF-001 |
| Server search + order | Match `short_name` **OR** `full_name` **OR** `external_code`; return sorted by name | R-BPF-002, R-BPF-006 |
| Client picker | Composed label + `filterBy` widened to mirror the server | R-BPF-003, R-BPF-004, R-BPF-005 |

Nothing is invented. The target shape is the **AGRESSO picker in the same template** (`bilateral-mapping.component.html:285-318`), whose label function, `item`/`selectedItem` templates, and truncation CSS all already ship and are already reviewed.

---

## 2. Architecture Overview

No new module, service, endpoint, version, or dependency. The change lives entirely inside two files that already exist plus their specs.

```
GET /api/tools/clarisa/projects/bilateral
        │
        ├─ ClarisaProjectsService.listBilateralProjects()   ← UNTOUCHED (cache, phase, Alliance predicate)
        │
        └─ ClarisaProjectsController.listBilateral()        ← the whole server change
              ├─ search predicate       (widened)
              ├─ sort                   (new)
              └─ response projection    (2 fields added)
                        │
                        ▼
        ┌───────────────┴────────────────┐
        │                                │
  STAR client picker              Admin SSR panel
  (this spec)                     (second consumer — DD-8)
```

**The service layer is deliberately untouched.** `listBilateralProjects` owns the cache, the phase resolution, and the Alliance predicate — all shipped and archived two weeks ago. Everything this spec changes is presentation of an already-correct result set, and confining it to the controller keeps the blast radius at one server file (R-BPF-005 blast-radius discipline inherited from the previous bugfix).

---

## 3. Extended Directory Structure

| Path | Change |
| --- | --- |
| `server/.../clarisa/projects/clarisa-projects.controller.ts` | modified |
| `server/.../clarisa/projects/clarisa-projects.controller.spec.ts` | modified |
| `client/.../bilateral-mapping/bilateral-mapping.component.html` | modified |
| `client/.../bilateral-mapping/bilateral-mapping.component.ts` | modified |
| `client/.../bilateral-mapping/bilateral-mapping.component.spec.ts` | modified |
| `client/.../shared/interfaces/bilateral/bilateral-project-mapping.interface.ts` | modified |
| `server/.../admin/client/pages/BilateralProjectMappings.tsx` | modified — DD-8 (approved) |
| `client/.../bilateral-mapping/bilateral-mapping.component.scss` | **none** — the truncation classes already exist at `:118` and `:130` |

---

## 4. Data Model

**No schema change. No migration.** `full_name` and `description` are already declared on `ClarisaProject` (`dto/clarisa-project.types.ts:66,68`) and already arrive in the fetched upstream payload — the projection simply stops discarding them.

---

## 5. API Design

**Endpoint, method, version, guards, roles, and query parameters are all unchanged.** The delta is confined to the shape of each `data[]` item and to the order of the array.

| Field | Before | After |
| --- | --- | --- |
| `id`, `short_name`, `source_of_funding`, `phase`, `source_center_acronym`, `has_science_programs`, `science_programs` | present | **unchanged** |
| `full_name` | — | **added**, optional |
| `description` | — | **added**, optional |
| `external_code` | — | **added** by the Pivot, optional — DD-9 |

The Swagger annotation for `search` must be updated: it currently claims *"substring match on `short_name`"*, which this change makes false. A stale annotation is a documented lie, and the endpoint's only other consumer reads that description to decide what the parameter does.

---

## 6. Backend Module Design

**Search predicate (R-BPF-002).** The single-field `includes` becomes a match over `short_name` OR `full_name`, both normalised the same way as today (trim + lowercase). An item missing `full_name` must fall through to the `short_name` comparison rather than throwing — the existing optional-chaining discipline extends to the new field.

`description` is **not** in the predicate (OQ-1): 18.4% populated on the test feed, so it would contribute noise far more often than matches.

**Ordering (R-BPF-006 / DD-3).** The controller sorts the filtered set by `full_name`, case-insensitively, before projecting. Items without `full_name` sort by `short_name` in the same sequence rather than clustering at either end. The comparator must be deterministic — two calls on identical input produce identical order — because a non-deterministic order would make the gate's assertion flaky rather than false.

**Projection (R-BPF-001).** Two fields added. The `science_programs` sub-projection and the `has_science_programs` derivation are untouched.

---

## 7. Frontend / UX Component Architecture

The CLARISA picker adopts, field for field, the structure the AGRESSO picker beside it already uses.

| Concern | Mechanism | Source |
| --- | --- | --- |
| Label composition | A component method returning `"<short_name> — <full_name>"`, degrading to `"<short_name>"` when the name is missing or blank | Mirrors `agressoOptionLabel()` (`component.ts:345`) |
| List rendering | `ng-template pTemplate="item"` bound to that method, with `[title]` carrying the untruncated string | Mirrors AGRESSO `html:311-317` |
| Collapsed rendering | `ng-template pTemplate="selectedItem"` bound to the **same** method | Mirrors AGRESSO `html:306-310` |
| Truncation | Existing `.bil-picker-option-label` / `.bil-picker-selected-label` (`scss:118,130`, `text-overflow: ellipsis`) | **Reused — no new CSS** |
| Client filtering | `filterBy="short_name,full_name"` | Must mirror the server predicate exactly — DD-5 |
| Option type | `ClarisaBilateralProjectOption` gains `full_name?` and `description?`, both optional | The server may omit either |

**`optionLabel="short_name"` stays.** See DD-4 — this is the outcome of the reversion challenge, not an oversight.

**Accessibility (NFR-BPF-002) — and an honest limit.** `[title]` gives a mouse tooltip and puts the full string in the DOM. It does **not** reliably reach assistive technology: screen-reader support for `title` is inconsistent, and it is widely held to be insufficient as the *sole* mechanism for content the eye cannot read.

So `title` is necessary here but may not be sufficient, and a task that adds `title` and asserts the attribute exists would satisfy its own gate while leaving NFR-BPF-002 unmet — the exact blindness this spec's §6 exists to prevent. The AGRESSO picker ships `title` alone; matching it buys consistency, not proven coverage. **The mechanism is OQ-4**, and the requirement stands regardless of how it is answered.

---

## 8. Shared Contracts

`ClarisaBilateralProjectOption` (`client/.../interfaces/bilateral/bilateral-project-mapping.interface.ts:56-61`) is the client's mirror of the server projection. Both new fields are declared **optional**, which keeps the interface truthful for an item the server returns without them and keeps every existing construction site compiling.

---

## 9. Design Decisions

### DD-1 — Extend the existing projection; do not version the endpoint

The change is purely additive (NFR-BPF-001), and `/v2` for two added fields would fork a contract for no consumer's benefit. Both consumers ignore unknown fields.

### DD-2 — Widen the search to `full_name`, not to `description`

Resolves **OQ-1**. `full_name` is 100% populated and is what a human types; `description` is 18.4% populated on the test feed. Matching a field that is usually absent produces a search whose behavior varies per row for reasons the user cannot see.

### DD-3 — Sort on the **server**, not in the client *(my call — flag it if you disagree)*

You approved "order by name" without picking a layer. I am placing it server-side for one reason: **it is the only layer where the order has an automated gate.** A controller spec asserts the returned sequence directly; the client render layer is the one D-4 established cannot be verified in this harness. Putting a behavior where it can be tested beats putting it where it is marginally more convenient.

Two consequences worth naming: PrimeNG's internal filter preserves array order, so the server order survives client filtering; and the admin SSR panel inherits the improved order for free (DD-8).

### DD-4 — Keep `optionLabel="short_name"`; add templates alongside it

**Outcome of the Step 2.3 reversion challenge.** The obvious move is to drop `optionLabel` once templates render the label — and it breaks two things that are not visible in the template:

1. PrimeNG's `searchFields()` falls back to `[this.optionLabel]` when `filterBy` is absent (`primeng-select.mjs:2397`). Removing `optionLabel` leaves a latent trap for anyone who later removes `filterBy`.
2. `getOptionLabel()` still feeds accessibility and keyboard type-ahead independently of the visual templates.

The AGRESSO picker keeps `[optionLabel]="'agreement_id'"` **and** its templates for exactly this reason. Nothing is removed; the composed label is added. **Challenge outcome: design changed — the original intent to replace `optionLabel` was dropped.**

### DD-5 — The client `filterBy` and the server predicate are one coupled invariant

This is the defect (proposal §4). PrimeNG filters internally whenever a term is set (`primeng-select.mjs:1674-1683`); `(onFilter)` fires *in addition*, never instead. So the two field sets must be kept identical, and a comment at each site must say so — the next person to widen one will not otherwise know the other exists.

**K-005 applies** — the same value used as a discriminator in two places must not be allowed to drift. The gate for the coupling is R-BPF-003's behavioral test, not the presence of the attribute.

### DD-6 — No new CSS

The truncation classes already exist and already ship. Writing new ones would create a second styling path for the same concern.

### DD-7 — Fixtures pinned to measured values (**KZ-001**)

Every fixture uses spellings drawn from `evidence/`: `A1806`, `B-A1080`, `C-A480`, and a 255-character `full_name` — the measured upstream maximum. An invented `PROJ-1` fixture is a Reviewer FAIL, because a double that does not represent the feed produces a green suite over broken behavior.

### DD-8 — The admin SSR panel is a second consumer *(decision needed)*

Not in the proposal — found during this design pass by enumerating **what calls the endpoint** rather than what lives in the feature folder (**KZ-002**).

`server/.../admin/client/pages/BilateralProjectMappings.tsx:148` fetches the same endpoint and renders `[{p.id}] {p.short_name}` at line 543 — **the identical code-not-name defect, in a second surface.**

| | |
| --- | --- |
| What it inherits automatically | The added fields (ignored harmlessly) and the improved sort order |
| What stays broken | Its dropdown still renders `[42] A1806` |
| Cost to fix | **One line** at `:543`, plus its local interface at `:35` |
| Skill | `react-doctor` (React 19 admin SSR) |

**APPROVED 2026-08-18** — included as **T-03**. Leaving a one-line fix undone in the second consumer of the very endpoint this spec exists to fix is how a defect gets rediscovered in three months as a new bug. The proposal scoped it out before this consumer was known; that scoping was made on incomplete information.

### DD-9 — The code is `external_code`, falling back to `short_name` *(Pivot, Option C)*

`external_code` is CLARISA's real project code — the field S1 measured and the key S2's auto-mapper joins on. It is **null on all 25 live rows** and blocked on PRMS.

Preferring it *now*, with `short_name` as the fallback, means the label becomes a genuine *code + title* on the day PRMS delivers, with no second change and no second review cycle. It also aligns the picker with the identifier S2's review queue will show, so the two surfaces will not diverge later.

Requires the server projection to carry `external_code` (additive, like `full_name` before it) and the search predicate to match it (R-BPF-002 amended) — a user who can see a code will type it.

### DD-10 — De-duplicate when the code and the name are the same string *(Pivot, Option A)*

**This is the actual defect the user reported.** The original R-BPF-004 specified two cases and omitted the third; `full_name == short_name` was 0 of 342 when it was written and is 25 of 25 now.

Comparison is on the trimmed, case-folded values, so `"  A1806 "` and `"a1806"` count as equal. It is applied against **whichever code won under DD-9**, not against `short_name` unconditionally — otherwise the bug returns the moment `external_code` lands and happens to equal the name.

De-duplication is required under every option the user was offered; it is the correction, and DD-9 is the forward-compatibility.

**Rejected alongside:** prefixing the numeric `id` (the offered Option B). It guarantees a visible identifier today but shows users an internal database number; the user did not take it, and it is recorded here so the choice is not silently re-litigated later.

---

## 10. Rejected Alternatives

| Alternative | Why rejected |
| --- | --- |
| Client-only: point `optionLabel` at `full_name` | The field is not in the payload. Even with it, search stays code-only |
| Server-only: add fields + widen search | **The tempting one.** `filterBy="short_name"` re-filters client-side and drops every name match — the user sees no change (proposal §10 Option C) |
| Replace `optionLabel` with templates | Breaks the `searchFields()` fallback and the a11y label path — DD-4 |
| Sort in the client | No automated gate; see DD-3 |
| Add `description` to the search | 18.4% populated — DD-2 |
| A new `/v2` endpoint | Additive change, two tolerant consumers — DD-1 |

---

## 11.1 Budget amendment — Pivot, 2026-08-18

The original budget below is **superseded**. The pivot adds three tasks:

| Metric | Original | Pivot delta | New total |
| --- | --- | --- | --- |
| Tasks | 4 | +3 (T-05 server, T-06 client, T-07 admin) | **7** |
| LOC | ~280 | +~100 | **~380** |
| Review rounds | 2 | +2 | **4** |

Actuals against the original ran ~40% over on LOC, entirely in tests — production code came in *under*. The pivot's own tasks are small; the cost here is review cycles, not code.

---

## 11. Budget *(Step 2.4 — superseded by §11.1)*

| Metric | Expected | Note |
| --- | --- | --- |
| **Tasks** | **4** | One per package, the approved admin one-liner (DD-8), and the human visual check that substitutes for the D-4 gap |
| **LOC** | **~280** | ~100 production, ~180 tests. The tests are the bulk, and that is correct for Bug Mode |
| **Review rounds** | **1** expected, **2** budgeted | The design is small and the exemplar is in-repo |

**Depth re-check:** the proposal said `Lite`. Lite prescribes one strictly focused task; this resolves to four across two packages. **Standard is correct** — this is the re-check the depth guess could not have made before the design existed.

Exceeding any of these is information, not failure — but the Leader must **stop and escalate** rather than continue past them.

---

## 12. Rollout, Observability, Rollback

| | |
| --- | --- |
| **Rollout** | Ordinary branch promotion. No feature flag: the change is additive and the current behavior is the defect |
| **Atomicity** | **Server and client must ship in one PR.** Splitting them recreates the exact invisible-partial-fix failure this spec exists to prevent — a half-landed change looks identical to no change |
| **Observability** | None added. No new failure mode: no new call, no new persistence, no new error path |
| **Rollback** | Revert the commit. No migration, no data written, nothing to undo |
| **Verification limit** | **Production returns 0 rows for this picker** (phase 2026 = 0 of 299). Verified against CLARISA test only — stated so nobody reads a green run as production coverage |
