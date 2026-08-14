# Tasks — Bilateral Alliance selector

> **Six tasks, ≈450 LOC, two PRs.** T-01 is the Bug-Mode regression suite and must be **red before the fix**. T-05 is the only migration and ships alone in PR 2.

| Field | Value |
| --- | --- |
| **Spec** | `docs/specs/bugfix/bilateral-alliance-selector/` |
| **Design** | [`design.md`](./design.md) — corrected after [`judgment.md`](./judgment.md) round 1 |
| **Execution** | agy (`gemini-3.7-flash`, effort `high`) as Implementer via Orca `/orchestration`; Claude Opus as Reviewer |
| **Budget tripwire** | 6 tasks · ≈450 LOC · 2 review rounds. Exceeding it escalates to the user, it does not silently continue |

## Dependency graph

```
T-01 (selector util + regression)  ─┐
                                    ├─► T-03 (service + module + observability) ─► T-04 (controller) ─┐
T-02 (phase resolver + config keys)─┘                                                                 ├─► T-06 (integration + full suite)
                                                                                                      │
T-05 (seed migration)  ────────────────────────────────────────────────────────────────────────────── ┘
```

T-01 and T-02 are **independent and parallel-safe** — different files, no shared symbol. T-05 depends only on T-02 (it references the `AppConfigKey` member T-02 adds) and is otherwise independent, so it may run alongside T-03/T-04.

---

## T-01 — Selector predicates and the Bug-Mode regression suite

| | |
| --- | --- |
| **Status** | `[ ]` |
| **Size** | M |
| **Depends on** | none |
| **Requirements** | R-BAS-001 (all clauses), R-BAS-002 (all clauses), R-BAS-003 phase-tolerance clauses, NFR-BAS-003 |
| **Design** | §7.1, §10 DD-1/DD-2/DD-3, §11 |
| **Skills** | `nestjs-expert`, `systematic-debugging` |
| **Files** | `src/domain/tools/clarisa/projects/utils/project-selector.util.ts` (new) · `…/utils/project-selector.util.spec.ts` (new) |

### Scope

Four pure exported functions — `normalizeToken`, `isBilateralFunding`, `isAllianceProject`, `matchesPhase` — plus exported constants for the Alliance centre set and the funding/Alliance prefixes. No Nest imports, no I/O, no DI.

`isAllianceProject` decides **per project**: `source_center_acronym` when non-blank, otherwise a normalized `ABC` prefix bounded by end-of-string or a non-alphanumeric character (so a hypothetical `ABCD` does not match).

### Tests — this is the Bug-Mode regression suite

**Fixtures MUST carry these literal byte sequences**, because they are the real production values:

```
'Bilateral'   'BILATERAL - RESTRICTED'   'Bilateral - Restricted'   'BILATERAL- RESTRICTED'
'Window 3'    'Window 3 - Restricted'    'WINDOW 3 - RESTRICTED'    'Windows 3'   'W3'   'SRV'
'ABC'   'ABC - Bioversity (Alliance)'   'IFPRI'   'ICARDA'   'IITA'   'CIMMYT'   ''
'CIAT'   'BIOVERSITY'   ' ciat '   null   undefined
```

Assert the **counts**, not merely "some rows returned": a production-shaped fixture yields **25** eligible, and the pre-fix predicate yields **1**.

### Done criteria

- [ ] All four predicates exist, are pure, and are tested without the service or the cache
- [ ] `null` / `undefined` / whitespace-only `source_of_funding` ⇒ **not** bilateral
- [ ] All five Window-3 spellings excluded (**OQ-A**)
- [ ] `'BILATERAL- RESTRICTED'` (no space) is accepted — the single-row case a naive `split(' ')` drops
- [ ] `source_center_acronym: 'IITA'` is **not** Alliance even when the legacy acronym would have matched
- [ ] Absent / null / blank `phase` ⇒ **not excluded**
- [ ] **Red before green:** the suite is committed against the current code and observed failing first

### Verification

`npm test -- --silent project-selector`

**The input that makes it fail:** delete the `- RESTRICTED` handling ⇒ the count assertion drops 25 → 1. Delete the funding predicate entirely ⇒ the 6 Window-3 rows appear and the exclusion assertion fails.

**What disqualifies the evidence:** a green run whose fixture file does not contain the literal strings above proves that *some* filter works on *some* data, not that this bug is fixed. If a reviewer cannot find those byte sequences in the spec file, the suite is not evidence.

---

## T-02 — `MappingPhaseResolver`, config key, and `ENV` getter

| | |
| --- | --- |
| **Status** | `[ ]` |
| **Size** | M |
| **Depends on** | none |
| **Requirements** | R-BAS-003 (precedence, asymmetry, cache isolation), R-BAS-007 scenarios 1–2, NFR-BAS-002 |
| **Design** | §7.2, §10 DD-4/DD-5/DD-6 |
| **Skills** | `nestjs-expert`, `error-handling-patterns` |
| **Files** | `…/projects/mapping-phase.resolver.ts` (new) · `…/mapping-phase.resolver.spec.ts` (new) · `src/domain/entities/app-config/enum/app-config-key.enum.ts` (add one member) · `src/domain/shared/utils/env.utils.ts` (add one getter) |

### Scope

Four-tier resolver. **Constructor takes `DataSource` and nothing else.**

| Tier | Source | Invalid value |
| --- | --- | --- |
| 1 | explicit argument | throw `BadRequestException` |
| 2 | `app_config` row `ARI_CLARISA_PROJECTS_PHASE` | log + fall through |
| 3 | `ENV.CLARISA_PROJECTS_PHASE` | throw `BadRequestException` |
| 4 | `2026` | — |

Cache **only** the tier 2–4 ambient resolution, TTL 5 min, with a `resetCacheForTests()` seam. An explicit argument is never written to nor served from that cache.

### ⚠️ The one thing that must not happen

**Do NOT inject `AppConfigService`.** It injects `CurrentUserUtil`, which is `@Injectable({ scope: Scope.REQUEST })`; injecting it cascades REQUEST scope into the picker's hot path and changes instantiation for endpoints already in production. Read the row via `DataSource`, following `AppConfig.DB_SUPPORT_EMAIL()` (`shared/utils/app-config.util.ts:387`). This produces working code either way — that is exactly why it is called out.

### Done criteria

- [ ] Constructor injects `DataSource` only; no `AppConfigService`, no `CurrentUserUtil`, no `Scope.REQUEST` provider anywhere in its graph
- [ ] Explicit argument and `ENV` throw on non-numeric; `app_config` logs and falls through
- [ ] A thrown database error is caught, logged once, and treated as a tier-2 miss — resolution still succeeds
- [ ] A call with an explicit argument leaves the ambient cache untouched, proven by a subsequent no-argument call returning the ambient value
- [ ] Second call within TTL performs **zero** further database reads (assert the query double's call count)
- [ ] `AppConfigKey` member and `ENV` getter added, both named `ARI_CLARISA_PROJECTS_PHASE` / `CLARISA_PROJECTS_PHASE`

### Verification

`npm test -- --silent mapping-phase.resolver`

**The input that makes it fail:** reorder tiers 2 and 3 ⇒ precedence tests fail. Cache the explicit argument ⇒ the pollution test fails. Make `ENV` fall through instead of throwing ⇒ the carried-over S1 assertion fails.

---

## T-03 — Service wiring, module registration, S1 test migration, observability

| | |
| --- | --- |
| **Status** | `[ ]` |
| **Size** | L |
| **Depends on** | T-01, T-02 |
| **Requirements** | R-BAS-001, R-BAS-002 (incl. branch logging), R-BAS-003 (single resolver), R-BAS-004 (flag computation), R-BAS-005, R-BAS-006, NFR-BAS-001 |
| **Design** | §3, §7.3, §9, §10 DD-5 |
| **Skills** | `nestjs-expert`, `systematic-debugging` |
| **Files** | `…/clarisa-projects.service.ts` · `…/clarisa-projects.service.spec.ts` · **`…/clarisa-projects.module.ts`** |

### Scope

- Rewrite `listBilateralProjects(options?)` over the T-01 predicates; `options` carries `phase` and `onlyWithSciencePrograms`.
- Compute `has_science_programs` **once, in the service, from a single helper** that the opt-in filter also uses — one expression, not two.
- Delete the private `resolvePhase`; delegate to `MappingPhaseResolver`. `listProjectsForCoverage` keeps its signature and return shape.
- **Register `MappingPhaseResolver` in `ClarisaProjectsModule.providers`.**
- Observability: `warn` naming the CLARISA host when zero projects are eligible; `debug` with per-branch counts on cache refresh. Branch counts never go to `warn`.
- **Move** S1's env-precedence and `BadRequestException` tests (`clarisa-projects.service.spec.ts:468`) into the resolver suite **still asserting the throw**. Move, do not weaken, do not delete.

### Done criteria

- [ ] `findProjectById` byte-for-byte unchanged
- [ ] TTL, stale-cache-on-error, and cold-cache `503` unchanged
- [ ] `listProjectsForCoverage` returns the same `{ all, slice, phaseUsed }` shape
- [ ] Exactly one phase resolution path exists in the codebase (**K-005**) — grep proves no second `resolvePhase`
- [ ] **Reviewer explicitly confirms the constructor's injected providers** — this is the named substitute for defect class D6, which has no automated gate
- [ ] The service spec builds the **real `ClarisaProjectsModule`**, not a hand-assembled provider list

### Verification

`npm test -- --silent clarisa-projects` then `npx eslint src/domain/tools/clarisa/projects`

**The input that makes it fail:** remove `MappingPhaseResolver` from the module's providers ⇒ `UnknownDependenciesException` at module compile. A hand-assembled testing module would hide this, which is why the real module is mandatory.

**What disqualifies the evidence:** `npm run lint` carries `--fix` and rewrites the tree while reporting success (**K-001**). It is not a gate here; use bare `npx eslint`.

---

## T-04 — Controller parameters and response fields

| | |
| --- | --- |
| **Status** | `[ ]` |
| **Size** | S |
| **Depends on** | T-03 |
| **Requirements** | R-BAS-003 (400 scenario, explicit phase), R-BAS-004, R-BAS-006 (response shape unchanged) |
| **Design** | §6, §10 DD-7/DD-9 |
| **Skills** | `nestjs-expert`, `api-design-principles` |
| **Files** | `…/clarisa-projects.controller.ts` · `…/clarisa-projects.controller.spec.ts` |

### Scope

Add `phase` (number) and `only-with-science-programs` (boolean, default **false**) query parameters, both with `@ApiQuery`. Add `phase`, `source_center_acronym`, `has_science_programs` to each response item. Additive only.

Boolean parsing uses **`QueryParseBool`** from `shared/pipes/query-parse-boolean.pipe.ts` — that exact name; `QueryParseBooleanPipe` does not exist.

### Done criteria

- [ ] `?phase=abc` returns **400** in the standard error envelope, not a silent default
- [ ] `?phase=2025` returns phase-2025 projects
- [ ] Omitting `only-with-science-programs` returns projects that have none
- [ ] Setting it returns only projects with ≥1 Confirmed Science Program
- [ ] No existing field renamed, retyped or removed — the STAR client needs no change
- [ ] `@ApiQuery` declared for both new params

### Verification

`npm test -- --silent clarisa-projects.controller`

**The input that makes it fail:** drop the pipe from the boolean param ⇒ `'false'` arrives truthy and the default-off assertion fails. Remove the phase param ⇒ the 400 test fails.

---

## T-05 — `app_config` seed migration

| | |
| --- | --- |
| **Status** | `[ ]` |
| **Size** | S |
| **Depends on** | T-02 (uses the `AppConfigKey` member) |
| **Requirements** | R-BAS-005 (exactly one migration, insert-only), R-BAS-007 scenario 3 |
| **Design** | §5, §7.4, §10 DD-8 |
| **Skills** | `nestjs-expert` |
| **Files** | `src/db/migrations/<timestamp>-seedClarisaMappingPhase.ts` (new) |

### Scope

Insert **one** row: key `ARI_CLARISA_PROJECTS_PHASE`, `simple_value` `2026`, a plain-language description, category `API`, subcategory `CLARISA`. Idempotent on re-run. `down()` deletes only that row.

**Exemplar: `1781879906673-AddNewEnvCl.ts`** — same job, and it shows the safe form (`?` placeholders **with** a parameters array).

### ⚠️ K-006

No `?` and no `:word` anywhere in the SQL **including comments**, unless a parameters array is passed. `namedPlaceholders` is enabled, so a parameterless query containing either throws before MySQL parses it — and passes lint, types, build and review on the way. A migration in this repo shipped unrunnable for exactly this reason.

### Done criteria

- [ ] Exactly one new file under `src/db/migrations/`
- [ ] No `ALTER`, no `CREATE`, no `DROP` — insert only
- [ ] Nothing touching `bilateral_project_mapping`
- [ ] No merged migration edited
- [ ] Re-running `up()` does not duplicate the row

### Verification

`npm run migration:dev:execute` against a **scratch schema** — never the shared Dev database, which is not disposable.

**The input that makes it fail:** put a `?` inside a SQL comment in a parameterless query ⇒ *"Named query contains placeholders, but parameters object is undefined."*

**What disqualifies the evidence:** lint, typecheck and build **all pass on an unrunnable migration**. Only execution is evidence here.

---

## T-06 — Integration verification and the measured re-reading

| | |
| --- | --- |
| **Status** | `[ ]` |
| **Size** | S |
| **Depends on** | T-04, T-05 |
| **Requirements** | R-BAS-005 (blast radius), R-BAS-007 scenario 1 (TTL propagation), NFR-BAS-004 |
| **Design** | §11 |
| **Skills** | `systematic-debugging` |
| **Files** | none new — verification and evidence only |

### Scope

Full-suite run plus the manual checks that no unit test can perform.

Per **KZ-003**, `ClarisaProjectsService` is consumed beyond this module, so a targeted suite confirms the brief was followed, not that the blast radius is clean.

### Done criteria

- [ ] **Full** server suite green — not only the touched files
- [ ] Coverage ≥ 60% (NFR-BAS-004)
- [ ] `evidence/probe-selector.py` re-run against both CLARISA hosts; the picker's live count matches the predicted **25** (prod) and **380** (test)
- [ ] The 4 existing `bilateral_project_mapping` rows are unchanged
- [ ] `git diff --stat` shows exactly one migration file
- [ ] Admin edit of the `app_config` row is observed taking effect within the TTL

### Verification

`npm test -- --silent` · `npm run test:cov` · `python3 docs/specs/bugfix/bilateral-alliance-selector/evidence/probe-selector.py prod test`

**What disqualifies the evidence:** the probe reads the **live** CLARISA feed. If its counts have moved since 2026-08-14, the fixtures are stale (defect class **D7**) and the mismatch is a finding about the fixtures, **not** a failure of the fix. Report the spread; do not silently adjust the assertion to match.

---

## Clause-level coverage

Closure is at scenario and clause granularity. A gap may never be discharged by citing a different requirement.

| Requirement | Clause | Owner |
| --- | --- | --- |
| **R-BAS-001** | S1 four bilateral spellings returned | T-01 |
| | S1 `BUT NOT` five Window-3 spellings | T-01 |
| | S1 `AND IT MUST` null/blank ⇒ not bilateral | T-01 |
| | S2 lower-case `'bilateral'` eligible | T-01 |
| **R-BAS-002** | S1 legacy `'ABC'` is Alliance | T-01 |
| | S1 `AND IT MUST` accept `'ABC - Bioversity (Alliance)'` | T-01 |
| | S1 `BUT NOT` other acronyms / empty | T-01 |
| | S2 `source_center_acronym` wins, lead ignored | T-01 |
| | S2 `BUT NOT` other centres even if legacy matches | T-01 |
| | S3 branch switches with no deploy | T-01 |
| | S3 `AND IT MUST` log branch distribution | **T-03** |
| **R-BAS-003** | precedence order | T-02 |
| | invalid-value asymmetry | T-02 |
| | exactly one resolver (K-005) | **T-03** |
| | ambient-only cache | T-02 |
| | S1 prod has no phase ⇒ no exclusion | T-01 |
| | S1 `AND IT MUST NOT` return empty | T-01 + T-06 |
| | S2 phase 2026 excludes 2025 | T-01 |
| | S2 caller requests 2025 | **T-04** |
| | S3 non-numeric ⇒ 400 | **T-04** |
| | S3 `BUT NOT` silent fallback | T-02 + T-04 |
| **R-BAS-004** | expose `has_science_programs` | T-03 + T-04 |
| | opt-in flag defaults off | T-04 |
| | S1 zero-mapping project returned | T-03 |
| | S1 `BUT NOT` filtered out | T-03 |
| | S2 flag on ⇒ only ≥1 Confirmed SP | T-03 + T-04 |
| **R-BAS-005** | `findProjectById` unchanged | T-03 + T-06 |
| | `listProjectsForCoverage` shape unchanged | T-03 + T-06 |
| | 4 mapping rows untouched | T-06 |
| | exactly one insert-only migration | T-05 + T-06 |
| | `BUT NOT` alter schema / edit merged / touch mapping table | T-05 |
| | `AND IT MUST` leave TTL, stale-serve, 503 | T-03 |
| **R-BAS-006** | branch counts on cache refresh | T-03 |
| | S1 `warn` naming host on zero eligible | T-03 |
| | S1 `BUT NOT` change response shape | T-03 + T-04 |
| **R-BAS-007** | row editable, applies without redeploy | T-05 + T-02 |
| | S1 edit takes effect within TTL | T-02 + T-06 |
| | S1 `AND` description + category discoverable | T-05 |
| | S1 `BUT NOT` readable/writable without roles | T-05 (inherited from `AppConfigController`; asserted by inspection) |
| | S2 missing/unreadable ⇒ fall through | T-02 |
| | S2 `AND IT MUST NOT` throw or empty the picker | T-02 |
| | S2 non-numeric stored value logged, not coerced | T-02 |
| | S3 migration runnable | T-05 |
| | S3 `AND IT MUST` no `?` / `:word` in SQL incl. comments | T-05 |
| **NFR-BAS-001** | singleton scope preserved | T-02 + T-03 (Reviewer check) |
| **NFR-BAS-002** | no per-request I/O; config cached | T-02 |
| **NFR-BAS-003** | predicates independently testable | T-01 |
| **NFR-BAS-004** | coverage ≥ 60% | T-06 |

**Unowned clauses: none.** Per **K-008**, this table was written by the same pass that wrote the requirements, so it is not independent evidence of completeness — the Reviewer re-derives it from `requirements.md` on T-03 and T-04 rather than trusting it.

---

## Known gaps carried, not hidden

| ID | Gap | Why it is accepted |
| --- | --- | --- |
| **D6** | No automated gate for a DI-scope regression | The HTTP suite that would prove it is S1's unfinished artifact (follow-up F-1). Substituted by a named Reviewer check on T-03 |
| **D7** | No automated gate for fixture drift | Unmeasurable by unit test **by construction** — fixtures are a snapshot of the feed. Substituted by the T-06 probe re-run |
| **OQ-E** | The 5 test projects with mappings have zero *Confirmed* ones | One question to PRMS. Does not block: R-BAS-004 reports rather than gates |
