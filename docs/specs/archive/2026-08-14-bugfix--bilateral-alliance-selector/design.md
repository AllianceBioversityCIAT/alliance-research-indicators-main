# Design — Bilateral Alliance selector

> **In one line:** replace two unnormalized string equalities with three small pure predicates and one cached phase resolver, all reachable from a **singleton** dependency graph — because the natural way to read the new config row is the one that would silently make the picker request-scoped.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/bilateral-alliance-selector/` |
| **Depth** | Standard · **Bug Mode** |
| **Requirements** | [`requirements.md`](./requirements.md) — R-BAS-001…007, NFR-BAS-001…004 |
| **Approval Mode** | `gated` |
| **Execution** | agy (gemini-3.7-flash, effort `high`) as Implementer via Orca `/orchestration`; Claude Opus as Reviewer |
| **Migrations** | **exactly one**, insert-only (R-BAS-007) |
| **Client changes** | **none** |
| **Kaizen applied** | **K-005** (single phase resolver, §10 DD-4) · **K-006** (migration runnability gate, DD-8) · **K-004** (every gate must be able to redden, §11) |
| **Judgment Day** | Round 1 complete — [`judgment.md`](./judgment.md). **6 severe, 1 warning, 1 info; all corrected in this document.** Two would have broken the build or the boot |

---

## 2. Executive Summary

Four moving parts, in dependency order:

| # | Part | Why it exists |
| --- | --- | --- |
| 1 | **`project-selector.util.ts`** — pure predicates for funding, Alliance, and phase eligibility | Normalization is the defect; isolating it makes it testable without the service, the cache, or HTTP (NFR-BAS-003) |
| 2 | **`MappingPhaseResolver`** — singleton, `DataSource`-backed, TTL-cached, four-tier fallback | R-BAS-003 + R-BAS-007. The tiering and the caching are both load-bearing, and both are where this can go wrong |
| 3 | **`listBilateralProjects` rewrite** + observability | The bug itself (R-BAS-001/002/006) |
| 4 | **Picker DTO fields + opt-in flag**, and the **seed migration** | R-BAS-004, R-BAS-007 |

---

## 3. Architecture Overview

Nothing about the module's shape changes. The only new edge in the graph is `MappingPhaseResolver → DataSource`, and **that edge is the whole architectural risk of this spec.**

```
HTTP ─► ClarisaProjectsController ─► ClarisaProjectsService ──► Clarisa (HTTP, 5-min TTL cache)
                                              │
                                              └──► MappingPhaseResolver ──► DataSource ──► app_config
                                                       (singleton, TTL-cached)
                                              │
                                              └──► project-selector.util  (pure, no DI)
```

### The constraint that shapes everything else

`ClarisaProjectsService` is **singleton by explicit design** (`clarisa-projects.service.ts:11-16`; S1 defect class D11). `AppConfigService` — the obvious way to read `app_config` — injects `CurrentUserUtil`, declared `@Injectable({ scope: Scope.REQUEST })`. Injecting it here cascades REQUEST scope into the picker's hot path and, silently, into every already-shipped endpoint on this module.

The resolver therefore talks to `DataSource` directly. The repository already does exactly this for the same reason: `AppConfig.DB_SUPPORT_EMAIL()` reads its row off an injected `DataSource` (`shared/utils/app-config.util.ts:387-396`).

> **This is a working-code failure, not a compile failure.** Injecting `AppConfigService` produces code that builds, passes every functional test, and is wrong. It gets a named done-criterion, not general diligence.

---

## 4. Extended Directory Structure

```
src/domain/tools/clarisa/projects/
├── clarisa-projects.service.ts            MODIFIED  selector + resolver wiring
├── clarisa-projects.service.spec.ts        MODIFIED  existing phase tests extended
├── clarisa-projects.controller.ts          MODIFIED  DTO fields + phase + opt-in flag
├── clarisa-projects.controller.spec.ts     MODIFIED
├── clarisa-projects.module.ts              MODIFIED  ← REGISTER MappingPhaseResolver (J-F-2)
├── mapping-phase.resolver.ts               NEW       singleton, DataSource-backed
├── mapping-phase.resolver.spec.ts          NEW
└── utils/
    ├── project-selector.util.ts            NEW       pure predicates
    └── project-selector.util.spec.ts       NEW       ← the regression suite (Bug Mode)

src/domain/shared/utils/env.utils.ts        MODIFIED  one getter
src/domain/entities/app-config/enum/
    app-config-key.enum.ts                  MODIFIED  one enum member
src/db/migrations/<ts>-seedClarisaMappingPhase.ts   NEW  insert-only
```

---

## 5. Data Model

No schema change. **One row** is inserted into the existing `app_config` table.

| Column | Value |
| --- | --- |
| `key` | `ARI_CLARISA_PROJECTS_PHASE` — matches the env name S1 already introduced, so the two tiers are visibly the same setting |
| `simple_value` | `2026` |
| `description` | Plain-language: which CLARISA project phase the bilateral mapping picker offers |
| `category` / `subcategory` | **`API` / `CLARISA`.** Fixed values, given here rather than delegated — see below |

**On the category values (corrected — judgment finding F-5).** An earlier draft of this design pointed the implementer at `1774366474408-AddedCategoryAppData.ts` to "reuse existing values". That migration is **pure DDL and contains zero `INSERT`s**; there was nothing there to reuse. The seeded values that actually exist are `BULK_UPLOAD` / `EMBED_INFO` (`1776433682077-InsertNewRoles.ts`) and `API` / `API_KEY` (`1781879906673-AddNewEnvCl.ts`). Neither pair fits a phase setting exactly, so the values are **specified here** instead of left to invention: `API` / `CLARISA` puts this row in the same category as the only other CLARISA setting the platform exposes (`ARI_CLARISA_API_KEY`), so an administrator finds it where they would look. A new subcategory is deliberate; a new *category* would render as an orphan section.

**Exemplar for the migration:** `1781879906673-AddNewEnvCl.ts`. It is the same job — seed one `app_config` row keyed by an `AppConfigKey` member, with description, category and subcategory — and it demonstrates the safe SQL form: it uses `?` placeholders **and passes a parameters array**, which is exactly why K-006's placeholder trap does not apply to it.

`AppConfigKey` gains the matching member so the key is referenced as a constant, never as a loose string.

---

## 6. API Design

`GET /api/tools/clarisa/projects/bilateral` — same path, same roles, same envelope.

| Query param | Type | Default | Requirement |
| --- | --- | --- | --- |
| `search` | string | — | unchanged |
| `phase` | number | resolver-supplied | **R-BAS-003** — tier 1 of the resolver. A non-numeric value returns **400**. Without this the requirement's explicit-phase and 400 scenarios have no mechanism at all (judgment finding F-3) |
| `only-with-science-programs` | boolean | **`false`** | R-BAS-004 |

Response items gain three fields alongside the existing `id`, `short_name`, `source_of_funding`, `science_programs`:

| Field | Requirement |
| --- | --- |
| `phase` | R-BAS-003 — lets the caller see which phase it got |
| `source_center_acronym` | R-BAS-002 — makes the selector's branch visible per row |
| `has_science_programs` | R-BAS-004 — the reported-not-gated signal |

Additive only. No existing field is renamed, retyped, or removed, so the STAR client keeps working untouched.

Boolean parsing uses the repo's existing **`QueryParseBool`** — exported from `shared/pipes/query-parse-boolean.pipe.ts`, and imported under that exact name by `agresso-contract.controller.ts`, `results.controller.ts`, and `reports.controller.ts`. *(Corrected — an earlier draft named a class `QueryParseBooleanPipe` that does not exist anywhere in the codebase; judgment finding F-1. It would not have compiled.)*

---

## 7. Backend Module Design

### 7.1 `project-selector.util.ts` — pure predicates

Four exported functions, no imports from Nest, no I/O:

| Function | Contract |
| --- | --- |
| `normalizeToken` | upper-case, trim, collapse internal whitespace runs to one space. The shared primitive |
| `isBilateralFunding` | normalized value **starts with** `BILATERAL`. Null/undefined/blank ⇒ `false` |
| `isAllianceProject` | if `source_center_acronym` is non-blank ⇒ its normalized value ∈ `{CIAT, BIOVERSITY}`. Otherwise ⇒ normalized lead acronym is `ABC` **or** begins `ABC` followed by a non-alphanumeric character |
| `matchesPhase` | `true` when the project's `phase` is absent, null, or blank; otherwise numeric equality with the target |

Exported constants for the centre set and the funding/Alliance prefixes — the closed sets are data, and a reviewer must be able to read them without parsing control flow.

### 7.2 `MappingPhaseResolver` — the four-tier resolver

`@Injectable()`, default scope. Constructor takes **`DataSource` only**.

Resolution order, first hit wins:

| Tier | Source | On invalid value |
| --- | --- | --- |
| 1 | explicit argument (`?phase=`) | **throw `BadRequestException`** |
| 2 | `app_config` row | **log + fall through** |
| 3 | `ENV.CLARISA_PROJECTS_PHASE` | **throw `BadRequestException`** — preserves S1 unchanged |
| 4 | literal `2026` | — |

**The governing rule — corrected after judgment finding F-7, which exposed an unmade decision rather than a typo:**

> **Tiers a human edits through a UI degrade. Tiers fixed at deploy time fail loudly.**

`app_config` is edited at runtime by an administrator through a screen, so a typo there must never be able to empty the picker for every user. An explicit query argument and an `ENV` variable are set by the person who can immediately fix them, and silence there returns the wrong year to everyone who did not ask for it. The earlier draft had tier 3 falling through, which **contradicted S1's shipped behavior** — `clarisa-projects.service.spec.ts:468` asserts that a non-numeric `ARI_CLARISA_PROJECTS_PHASE` throws — while §9 simultaneously claimed that test carried over unchanged. Both could not be true. This resolution keeps S1 byte-for-byte intact.

Any *error* from the database read — connection failure, missing table, anything — is caught, logged once, and treated as a tier-2 miss. **A configuration lookup may never break the screen it configures.**

### Caching — what is cached is the ambient value, never the argument

Only the **tier 2–4 ambient resolution** is cached, under a TTL matching the projects cache (5 min). An explicit tier-1 argument is resolved per call and **never written to the cache, nor served from it**.

This is not an optimization detail; it is a correctness requirement (judgment finding F-4). Caching the *returned* value would let a single request carrying `?phase=2025` overwrite the ambient phase for every other caller until the TTL expired — one user's query silently reconfiguring the platform.

Steady-state request handling therefore performs **zero** database I/O (NFR-BAS-002), and an administrator's edit lands **within the TTL** — stated as the contract in R-BAS-007, not glossed as "instant". A `resetCacheForTests()` seam mirrors the existing one on `ClarisaProjectsService`.

### Module registration

`MappingPhaseResolver` **must be added to `ClarisaProjectsModule.providers`**, which today holds only `ClarisaProjectsService`. Omitting it does not fail at compile time — the application refuses to boot with `UnknownDependenciesException` (judgment finding F-2).

### 7.3 `ClarisaProjectsService`

- `listBilateralProjects(options?)` composes the three predicates. `options` carries **`phase`** (forwarded to the resolver as tier 1) and **`onlyWithSciencePrograms`**.
- **`has_science_programs` is computed once, in the service, from a single helper** — the same one the opt-in filter uses. The controller only reads the flag. Today the controller filters Confirmed / entity-type-22 inline; leaving the flag and the filter as two independent expressions is how they drift apart (judgment finding I-1).
- `listProjectsForCoverage` keeps its signature and return shape, but its private `resolvePhase` is **deleted** and delegated to the shared resolver — see the reversion challenge in §9.
- `findProjectById`, the TTL cache, the stale-serve path, and the cold-cache `503` are untouched.

Observability (R-BAS-006): a `warn` naming the CLARISA host when the eligible count is zero — the silent-empty class that hid this bug — plus a `debug` with the per-branch counts when the projects cache refreshes. Branch counts do not go to `warn`; a hot path that logs on every request is noise, and noise is how the next silent failure hides.

### 7.4 Seed migration

Insert-only, guarded so a re-run is a no-op. Reverts by deleting only the row it inserted.

**No `?` and no `:word` anywhere in its SQL, comments included.** `orm.config.ts` enables `namedPlaceholders`, so a parameterless migration containing either throws before MySQL ever parses it — and it passes lint, types, build, and review on the way (Kaizen **K-006**; a migration in this repo shipped unrunnable for exactly this reason).

---

## 8. Frontend / UX Component Architecture

**None.** Deliberate, and verified rather than assumed:

- STAR already ships the Environment-variables screen (`pages/platform/pages/administration/configuration/variable-configuration/`) plus `edit-environment-variable-modal`, generic over `app_config`.
- The server surface already exists: `AppConfigController` — list, get-by-key, `PATCH /:key` gated to `TECHNICAL_SUPPORT` / `SYSTEM_ADMIN`.
- The picker's response changes are **additive**, so the mapping form renders unchanged.

Inserting the row is therefore the entire UI deliverable.

> The admin **SSR** `Settings` page (`admin/client/pages/Settings.tsx`) is a stub that `console.log`s and persists nothing. It is not this surface and must not be wired to it.

---

## 9. Reversion Challenge (Step 2.3)

One decision reverts already-delivered behavior: **DD-4 deletes `resolvePhase` from `ClarisaProjectsService`**, shipped by S1 as T-02/DD-13.

**Question — what does removing it break.**

| Answer | Handling |
| --- | --- |
| **S1's existing unit tests break.** `clarisa-projects.service.spec.ts:468` asserts env-var precedence and a `BadRequestException` on a non-numeric `ARI_CLARISA_PROJECTS_PHASE`. Those assertions move to the resolver's suite **and keep asserting the same throw** — §7.2 tier 3 throws precisely so this carry-over is honest. S1's contract is *extended* by a new tier 2, not altered | T-03 must move, not weaken, those tests, and the task states this explicitly. *An earlier draft had tier 3 falling through while this row claimed the test moved unchanged — the contradiction was caught in judgment (F-7) and resolved in favour of preserving S1* |
| **`listProjectsForCoverage`'s resolved phase can now change** when an admin edits the row — the coverage report would measure a different phase than before | Intended: one setting, one meaning (K-005). Called out in R-BAS-005 deviation (b) so it is a decision, not a surprise |
| **The coverage endpoint's explicit `?phase=` must keep winning** over the new row | Preserved as tier 1 |

No further breakage found. The challenge changed the design: the env tier was going to be dropped as redundant, and keeping it is what makes this an extension rather than a silent reversal of S1.

---

## 10. Design Decisions

| ID | Decision | Rejected alternative & why |
| --- | --- | --- |
| **DD-1** | Predicates live in a module-local `utils/` file as pure functions | *Methods on the service* — untestable without DI and the cache, violating NFR-BAS-003. Follows S1's `external-code.util.ts` precedent |
| **DD-2** | Funding matched by normalized **prefix** `BILATERAL` | *Exact set of the 11 observed values* — brittle: a twelfth spelling drops silently, which is this bug. *`includes()`* — would admit a hypothetical `NON-BILATERAL` |
| **DD-3** | Alliance decided **per project**, `source_center_acronym` preferred | *Per feed* — the test feed proves both shapes coexist in one response (1066 new + 299 legacy rows), so a feed-level decision is wrong by construction |
| **DD-4** | **One** resolver, four tiers, shared by picker and coverage | *Two resolvers* — K-005 exactly: a discriminator config duplicated until the copies disagree |
| **DD-5** | Resolver injects **`DataSource`**, never `AppConfigService` | `AppConfigService` carries `CurrentUserUtil` (`Scope.REQUEST`) and would silently make the module request-scoped. Precedent: `AppConfig.DB_SUPPORT_EMAIL()` |
| **DD-6** | Explicit argument throws on invalid; stored/env values fall through | *Uniform throw* — a bad stored value would empty the picker for everyone. *Uniform fallback* — a caller's typo would silently return the wrong year |
| **DD-7** | Science programs reported + opt-in flag defaulting off | *Gate by default* — **measured 0 of 380** on the target dataset (`proposal.md` §4.4) |
| **DD-8** | Migration is insert-only, idempotent, and **proven by execution** | *Trusting static gates* — K-006: they cannot see this defect class |
| **DD-9** | Response fields are additive only | *Restructuring the picker payload* — would force a STAR client change this spec does not need |
| **DD-10** | Active-portfolio filtering (`ENV.BILATERAL_ACTIVE_PORTFOLIO`, `P25`) is **not** applied to the picker | Out of scope; the picker never filtered by portfolio. Measured moot today — every Confirmed SP on the eligible production projects is `P25`. Recorded so the next reader knows it was considered, not missed |

---

## 11. Verification Strategy — and what would make each gate red

Per K-004, a gate nobody has seen fail is a decoration.

| Gate | Covers | The input that reddens it |
| --- | --- | --- |
| `project-selector.util.spec.ts` | D1, D2, R-BAS-001/002 | Drop `- RESTRICTED` handling ⇒ the count assertion falls from 25 to 1 |
| same, negative cases | D2, OQ-A | **Delete the funding predicate entirely** (or invert it) ⇒ the 6 Window-3 rows appear and the exclusion assertion fails |
| Mixed-shape feed fixture | D3, R-BAS-002 | Hard-code either branch ⇒ one half of the fixture fails |
| Production-shaped fixture (**no `phase` key**) | D4, R-BAS-003 | Treat missing phase as a mismatch ⇒ result is empty |
| Zero-mapping fixture | D5, R-BAS-004 | Apply the SP gate by default ⇒ the project vanishes |
| `mapping-phase.resolver.spec.ts` | R-BAS-003/007 | Reorder the tiers, or throw instead of falling through ⇒ the fallback cases fail |
| `npm run migration:dev:execute` | **D8** | Put a `?` in a SQL comment ⇒ throws |
| Module compiles in a Nest testing module | **F-2** | Remove `MappingPhaseResolver` from `ClarisaProjectsModule.providers` ⇒ `UnknownDependenciesException` at module compile. **The service spec must build the real `ClarisaProjectsModule`, not hand-assemble providers** — a hand-assembled module cannot see a missing registration |
| **Reviewer constructor check** | **D6** | ⚠️ Manual. No automated gate — named as a done-criterion on T-03 |
| `evidence/probe-selector.py` | **D7** | ⚠️ Manual, post-promotion. Unmeasurable by unit test **by construction** |

**Bug Mode red-before/green-after:** the regression suite is written against the **current** service first and must fail — asserting 25 where today's code returns 1.

> **What the F-6 correction revealed, kept because it is useful.** The original falsifier for the negative gate was "swap `startsWith` for `includes`". Both judges showed it would leave the suite green: **no observed Window-3 value contains the substring `BILATERAL`**. So the prefix-vs-`includes` choice in DD-2 is *not load-bearing on real data* — DD-2 rejected `includes` on a hypothetical, and that reasoning stands as a defensive preference, not as something the suite proves. The gate now names a mutation that genuinely reddens it. **The lesson generalizes past this row: a falsifier invented from the same frame as the design tends to be a mutation the design already excludes.**

### What disqualifies the evidence

A green run over fixtures that do not contain the real production spellings proves nothing. The fixtures MUST carry the literal strings `'BILATERAL - RESTRICTED'`, `'Bilateral - Restricted'`, `'BILATERAL- RESTRICTED'` (no space), `'Bilateral'`, and the Window-3 variants. **If a reviewer cannot find those exact byte sequences in the spec file, the suite is not evidence of this fix** — it is evidence that some filter works on some data.

---

## 12. Budget (Step 2.4)

| Metric | Estimate |
| --- | --- |
| **Tasks** | **6** |
| **LOC** | **≈ 1950** (≈ 260 implementation, ≈ 1690 tests) — **re-baselined during execution, 2026-08-14, with user approval.** See below |
| **Review rounds** | **2** |

Sizing note: this exceeds `Lite` decisively, which is why Phase 1 recorded the raise to **Standard**. It sits comfortably inside Standard — no split into a spec family is warranted.

### Budget re-baseline — 2026-08-14, after T-01 and T-02

The tripwire fired at the first measurement point and the estimate, not the work, was wrong:

| | Original estimate (whole spec) | Actual after 2 of 6 tasks |
| --- | --- | --- |
| Implementation | 195 | **232** — accurate |
| Tests | 255 | **1117** — **4.4× low** |

**The implementation estimate held; the test estimate did not, and the cause is this spec's own requirements.** §11 demands fixtures carrying all eleven measured funding spellings, both Alliance encodings, present/absent/blank phase, and **asserted counts** rather than "some rows returned". That is what makes the suite evidence instead of decoration — and it does not compress without giving back the gate. A mutation test confirmed the value: breaking the funding predicate reddens 11 assertions.

Re-baselined to **≈1950** with the user's approval rather than trimming coverage. **The estimating lesson is the artifact worth keeping:** an exhaustive-fixture requirement multiplies test volume in a way a per-task LOC guess does not anticipate, and this is the second consecutive spec whose budget was wrong in the same direction.

`/akili-execute` trips on these. Exceeding them is information, not failure — but the Leader stops and escalates rather than continuing silently.

### PR strategy — two PRs, and the order matters

At ~450 LOC a split is warranted, and the fallback design makes it genuinely safe:

| PR | Contents | Standalone value |
| --- | --- | --- |
| **PR 1** | T-01…T-04 and T-06 — selector predicates, resolver (incl. `AppConfigKey` member, `ENV` getter and the tier-2 read), service rewrite, module registration, controller, observability, regression suite | **Production goes 1 → 25.** The tier-2 read finds no row and falls through to `ENV` — the designed absence path, not a degradation |
| **PR 2** | T-05 — the `app_config` seed migration, alone | Inserting the row activates tier 2. Phase becomes runtime-editable |

PR 1 carries the user-visible fix and can ship without PR 2. Reversing the order would ship a config surface for a picker that is still broken.
