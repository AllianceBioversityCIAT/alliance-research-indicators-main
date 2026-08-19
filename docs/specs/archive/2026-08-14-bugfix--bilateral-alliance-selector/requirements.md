# Requirements — Bilateral Alliance selector

> **In one line:** the bilateral project picker must offer every Alliance-led bilateral project in whichever CLARISA environment it points at — **25 in production instead of 1, 380 in test instead of 0** — and must keep doing so when the upstream contract changes shape, without a code change.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/bilateral-alliance-selector/` |
| **Type** | **Bug** — Bug Mode active: a regression test that is **red before / green after** is mandatory |
| **Depth** | **Standard** — raised from the proposal's `Lite`. Lite means "one strictly focused task"; this resolves to **six**, changes what a production screen returns, and adds a config surface. Recorded as a deviation, not a silent upgrade |
| **Approval Mode** | `gated` (inherited from `proposal.md`) |
| **Source of truth** | [`proposal.md`](./proposal.md) §4 Bug Diagnosis — confirmed root cause, live-probed 2026-08-14 |
| **Execution strategy** | **agy (gemini-3.7-flash, effort high) as Implementer via Orca `/orchestration`; Claude Opus as Reviewer** — user direction, 2026-08-14. Preserves `author ≠ auditor` across providers. Applies at `/akili-execute`; this document was authored on T1 (opus) per the Model Routing registry |
| **Requirement prefix** | `R-BAS-` / `NFR-BAS-` |
| **Depends on** | none. S1 (`archive/2026-08-14-bilateral--clarisa-project-automapping`) supplies the baseline measurement |
| **Blocks** | S2 (auto-mapper) — S2 inherits whichever selector this spec settles |

### Decisions carried in from the proposal's open questions

The user approved the proposal by invoking `/akili-specify` without amending it. The recommended answers are therefore adopted, and flagged here so they are overrulable at the Phase 1 gate rather than buried:

| OQ | Adopted answer | Consequence if wrong |
| --- | --- | --- |
| **OQ-A** | `WINDOW 3 - RESTRICTED` projects are **excluded** from the picker (6 rows in prod) | One predicate; the negative fixture inverts |
| **OQ-B** | **Phase is a runtime-editable `app_config` row** — user decision at the Phase 1 gate, 2026-08-14, choosing the durable option over the query-parameter shortcut | **Supersedes the proposal's "zero migrations" commitment.** One seed migration is now in scope. See R-BAS-003 and R-BAS-007 |
| **OQ-C** | Science-program filter ships **visible and off** | Default flips; no structural change |

> **What the decision bought, and what it cost.** Investigation after the gate found the client cost is **zero**: STAR already ships a generic Environment-variables screen (`pages/platform/pages/administration/configuration/variable-configuration/`) plus an edit modal, backed by a complete server surface (`AppConfigController` — list, get-by-key, and `PATCH /:key` restricted to `TECHNICAL_SUPPORT` / `SYSTEM_ADMIN`). Adding a row makes it appear and be editable with no client change. The real cost is one seed migration and one carefully-scoped read path — see R-BAS-007's DI constraint, which is the load-bearing risk of this decision.

---

## 2. Executive Summary

`listBilateralProjects()` joins two unnormalized exact-string comparisons. Both are wrong against real data, in different environments, for different reasons:

| Defect | Production effect | Test effect |
| --- | --- | --- |
| `source_of_funding === 'Bilateral'` — the real values are `BILATERAL - RESTRICTED` and variants | **1 of 25** eligible projects survive | 892 rows spelled `bilateral` are dropped |
| `acronym === 'ABC'` — the new feed renamed it to `ABC - Bioversity (Alliance)` and added `source_center_acronym` | matches 32 (correct today) | matches **0** |

This spec normalizes both, tolerates both feed shapes, and makes phase a decision rather than a literal — while explicitly **not** gating on science programs, because gating there is measured to return zero on the very dataset the team wants to map.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Picker** | `GET /api/tools/clarisa/projects/bilateral` — the dropdown source for the bilateral mapping admin form |
| **Legacy feed shape** | CLARISA rows with no `external_code` / `phase` / `source_center_acronym`. All 299 production rows, and 299 phase-2025 rows in test |
| **New feed shape** | Rows carrying the promoted contract. 1066 phase-2026 rows in test; **none in production yet** |
| **Alliance** | Alliance of Bioversity International and CIAT. Encoded as `acronym = 'ABC'` (legacy) or `source_center_acronym ∈ {CIAT, BIOVERSITY}` (new) — **both centres together constitute the Alliance** |
| **Eligible project** | Alliance-led, bilateral-funded, and — when the feed states one — in the configured phase |

---

## 4. System Context & Scope

```
CLARISA /api/projects ──► ClarisaProjectsService (5-min TTL cache, singleton)
                                │
                                ├─ listBilateralProjects()   ◄── THIS SPEC
                                ├─ findProjectById()             untouched
                                └─ listProjectsForCoverage()     untouched
                                │
                          ClarisaProjectsController ──► admin mapping form
```

**In scope:** `listBilateralProjects`, a shared normalization helper, a shared phase resolver, the picker DTO, an `ENV` getter, one insert-only `app_config` seed migration, and the sibling specs.
**Out of scope:** the S2 auto-matcher, any *schema* migration, any `bilateral_project_mapping` row or schema change, **and any STAR client change** — the Environment-variables screen is already generic over `app_config` and needs none.

---

## 5. Stakeholders / Personas

| Persona | Stake |
| --- | --- |
| **CENTER_ADMIN / SYSTEM_ADMIN** | Uses the picker. Today can map 1 project; needs 25 |
| **Pool-funding reporting** | Consumes the mappings downstream; under-mapping under-reports |
| **PRMS / CLARISA team** | Owns the contract promotion and the missing phase-2026 science-program mappings. This spec must not require them to move first |

---

## 6. Functional Requirements

### R-BAS-001 — Funding source is matched by normalized prefix, not by literal

The system SHALL treat a project as bilateral when its `source_of_funding`, upper-cased with internal whitespace collapsed, **begins with** `BILATERAL`.

#### Scenario: The production spellings all resolve

- **GIVEN** a CLARISA feed containing the observed values `'Bilateral'`, `'BILATERAL - RESTRICTED'`, `'Bilateral - Restricted'`, and `'BILATERAL- RESTRICTED'` *(note: no space before the dash)*
- **AND** each is on an Alliance-led project
- **WHEN** the picker is requested
- **THEN** all four are returned
- **BUT** it must NOT return `'Window 3'`, `'Window 3 - Restricted'`, `'WINDOW 3 - RESTRICTED'`, `'Windows 3'`, `'W3'`, or `'SRV'`
- **AND IT MUST** treat a `null`, `undefined`, or whitespace-only `source_of_funding` as **not bilateral** (1 such row exists in production)

#### Scenario: The lower-case test feed resolves

- **GIVEN** the test feed, where 892 rows are spelled `'bilateral'`
- **WHEN** the picker is requested
- **THEN** those rows are eligible on the funding predicate

---

### R-BAS-002 — The Alliance selector reads the better field when present and the legacy field when not

The system SHALL identify an Alliance project by `source_center_acronym ∈ {CIAT, BIOVERSITY}` **when that field is populated on the project**, and otherwise fall back to a normalized `ABC` prefix on `lead_institution_object.acronym`.

The decision SHALL be made **per project**, not per feed — the test feed proves both shapes coexist in one response (1066 new rows alongside 299 legacy rows).

#### Scenario: Legacy production row

- **GIVEN** a project with `source_center_acronym: null` and `lead_institution_object.acronym: 'ABC'`
- **WHEN** the selector evaluates it
- **THEN** it is Alliance
- **AND IT MUST** also accept `'ABC - Bioversity (Alliance)'`, the string the new feed uses
- **BUT** it must NOT accept `'IFPRI'`, `'ICARDA'`, `'IITA'`, `'CIMMYT'`, or an empty acronym

#### Scenario: New-contract row

- **GIVEN** a project with `source_center_acronym: 'CIAT'` (or `'BIOVERSITY'`, or either with padding/lower case)
- **WHEN** the selector evaluates it
- **THEN** it is Alliance **without consulting `lead_institution_object` at all**
- **BUT** it must NOT be Alliance when `source_center_acronym` is `'IITA'`, `'IFPRI'`, or any other centre — **even if the legacy acronym would have matched**

#### Scenario: The promotion happens with no deploy

- **GIVEN** production rows today have `source_center_acronym: null`
- **WHEN** CLARISA promotes the contract and the field becomes populated
- **THEN** the selector switches branch on its own
- **AND IT MUST** log the branch distribution (see R-BAS-006) so the switch is observable rather than silent

---

### R-BAS-003 — Phase is filtered only when the feed states one, and is chosen without editing source

The system SHALL exclude a project whose `phase` is present and does not equal the configured phase, and SHALL **not** exclude a project whose `phase` is absent, null, or empty.

The configured phase SHALL be resolvable, in precedence order: an explicit request argument → the `app_config` row → `ENV` → the built-in default `2026`.

On an invalid value, the tiers SHALL behave asymmetrically: **the request argument and `ENV` throw; the `app_config` row logs and falls through.** The rule is *tiers a human edits through a UI degrade; tiers fixed at deploy time fail loudly* — a runtime typo by an administrator must never be able to empty the picker for everyone, while a deploy-time typo should be loud. This preserves S1's shipped `ENV` behavior unchanged.

There SHALL be exactly **one** phase resolver in the codebase, shared by the picker and `listProjectsForCoverage`. Two independent resolvers reading different sources is the **K-005** failure — a discriminator config duplicated until the two copies disagree.

The resolver SHALL cache only the ambient (`app_config` → `ENV` → default) resolution. An explicit request argument SHALL never be written to, nor served from, that cache — otherwise one caller's `?phase=` silently reconfigures the phase for every other caller until the TTL expires.

#### Scenario: Production, which has no phase field at all

- **GIVEN** all 299 production projects carry no `phase`
- **WHEN** the picker is requested with the default configuration
- **THEN** no project is excluded on phase grounds
- **AND IT MUST NOT** return an empty list because the field is missing — *this is the single failure that would make the fix worse than the bug*

#### Scenario: Test, mixed phases

- **GIVEN** the test feed holds 1066 phase-2026 and 299 phase-2025 rows
- **WHEN** the picker is requested with phase `2026`
- **THEN** phase-2025 rows are excluded
- **AND** a caller requesting phase `2025` receives the 2025 rows instead

#### Scenario: Invalid phase

- **GIVEN** a caller supplies a non-numeric phase
- **WHEN** the picker is requested
- **THEN** the response is **400** in the standard error envelope
- **BUT** it must NOT fall back silently to the default — a typo that silently returns the wrong year is worse than an error

> **Note on where the setting does *not* live.** The admin SSR `Settings` page is a **stub** — it `console.log`s and persists nothing (`admin/client/pages/Settings.tsx:17`). It is not the Environment-variables screen and must not be used as the surface. The real surface is the STAR client's variable-configuration screen, backed by `AppConfigController`.

---

### R-BAS-004 — Science-program coverage is reported, never gated by default

The picker SHALL expose, per project, whether it carries at least one **Confirmed** Science-Program mapping, and SHALL return projects that carry none.

An opt-in request flag MAY restrict the list to projects that do carry one. That flag SHALL default to **off**.

#### Scenario: A project with no science programs is still offered

- **GIVEN** an Alliance bilateral project with an empty `project_mappings_array`
- **WHEN** the picker is requested with default options
- **THEN** the project is returned
- **AND** it is marked as having no science programs
- **BUT** it must NOT be filtered out

#### Scenario: The opt-in flag, once the data exists

- **GIVEN** the caller sets the science-programs-only flag
- **WHEN** the picker is requested
- **THEN** only projects with ≥1 Confirmed Science-Program mapping are returned

> **Measured justification.** Of the 380 Alliance-2026 projects in test, **5** have any mapping and **0** have a Confirmed Science Program — the phase-2026 records have not been mapped upstream yet. Gating would return an empty picker on exactly the dataset this work targets. In production the gate would be nearly free (21 of 25 qualify), which is precisely why a single default cannot serve both, and why it is a flag.

---

### R-BAS-005 — Nothing else changes

The change SHALL be confined to project **selection** and the phase-configuration surface.

#### Scenario: Blast radius is closed

- **WHEN** the change is applied
- **THEN** `findProjectById` resolves the same ids to the same projects, including non-Alliance ones
- **AND** `listProjectsForCoverage` returns the same `{ all, slice, phaseUsed }` **shape**
- **AND** the 4 existing `bilateral_project_mapping` rows are untouched
- **AND** exactly **one** new migration exists — the `app_config` seed of R-BAS-007 — and it only **inserts a row**
- **BUT** it must NOT alter any existing table's schema, edit any merged migration, or touch `bilateral_project_mapping` in any way
- **AND IT MUST** leave the 5-minute TTL, the stale-cache-on-error path, and the cold-cache `503` exactly as they are

> **Two stated deviations, both consequences of the OQ-B decision — recorded rather than absorbed silently.**
> **(a) The proposal's "zero migrations" no longer holds.** One insert-only seed migration is in scope. Nothing else about the proposal's §7 non-goals changes.
> **(b) `listProjectsForCoverage`'s *resolved phase* may now differ** — it reads the shared resolver, so an `app_config` edit moves it too. That is the point of a single source of truth (R-BAS-003); its output *shape*, tier logic, and query are untouched.

---

### R-BAS-006 — The selector reports which branch it took

The service SHALL log, once per cache refresh, the count of projects resolved via the new-contract branch versus the legacy branch, and the resulting eligible count.

#### Scenario: The silent-empty class becomes visible

- **GIVEN** a feed in which no project satisfies the selector
- **WHEN** the picker is requested
- **THEN** a `warn` is logged naming the CLARISA host and the branch counts
- **BUT** the HTTP response must NOT change shape — this is observability, not a contract change

> This requirement exists because the bug's defining property was that **nothing reported it**. A 200 with a near-empty list looked identical to "there are few bilateral projects" for months.

---

### R-BAS-007 — The mapping phase is editable at runtime by an administrator

The system SHALL expose the mapping phase as an `app_config` row, editable through the existing STAR Environment-variables screen, and SHALL apply an edit **without a redeploy**.

#### Scenario: An administrator changes the mapping phase

- **GIVEN** a `SYSTEM_ADMIN` (or `TECHNICAL_SUPPORT`) on the Environment-variables screen
- **WHEN** they edit the mapping-phase entry from `2026` to `2027` and save
- **THEN** the picker begins returning phase-2027 projects **within the cache TTL**, with no restart and no deploy
- **AND** the entry carries a human-readable description and the same category grouping as its neighbours, so it is discoverable rather than an unexplained key
- **BUT** it must NOT be readable or writable by a caller without those roles — inherited from `AppConfigController`, not re-implemented

#### Scenario: The row is missing or unreadable

- **GIVEN** the `app_config` row is absent, inactive, empty, or the database read fails
- **WHEN** the phase is resolved
- **THEN** resolution falls through to `ENV`, then to the default `2026`
- **AND IT MUST NOT** throw, and must not leave the picker empty — *a configuration lookup must never be able to break the screen it configures*
- **AND** a non-numeric stored value SHALL be rejected in favour of the fallback **and logged**, never silently coerced

#### Scenario: The seed migration is runnable

- **GIVEN** the new seed migration
- **WHEN** the migration suite is executed against a scratch schema
- **THEN** it applies cleanly
- **AND IT MUST** contain no `?` and no `:word` anywhere in its SQL **including inside comments** — see the D8 defect class in §8 (Kaizen **K-006**)

> **The load-bearing constraint on this requirement is dependency injection, not SQL.** `AppConfigService` injects `CurrentUserUtil`, which is `@Injectable({ scope: Scope.REQUEST })`. Injecting that service into `ClarisaProjectsService` would cascade REQUEST scope into the picker's hot path — precisely what the service header forbids (`clarisa-projects.service.ts:11-16`) and what S1 catalogued as defect class D11. The read MUST therefore go through a singleton path, for which the repository already has a precedent: `AppConfig.DB_SUPPORT_EMAIL()` reads its row straight off an injected `DataSource` (`shared/utils/app-config.util.ts:387`).

---

## 7. Non-Functional Requirements

| ID | Requirement | Verification |
| --- | --- | --- |
| **NFR-BAS-001** | The service SHALL remain **singleton-scoped**. No `Scope.REQUEST` provider may be introduced | Existing header constraint in `clarisa-projects.service.ts:11-16`; reviewed on the diff |
| **NFR-BAS-002** | Selection SHALL remain a pure in-memory filter over the cached array — no additional upstream call. The `app_config` read SHALL be **cached with its own TTL**, so steady-state request handling performs no database I/O. An administrator's edit therefore takes effect **within the TTL**, which R-BAS-007 states as the contract rather than promising instant propagation | Diff review; the resolver's cache is unit-tested with a clock double |
| **NFR-BAS-003** | Normalization SHALL be a pure, side-effect-free, independently testable function | Unit-tested in isolation from the service |
| **NFR-BAS-004** | Server unit coverage SHALL stay at or above the repo's 60% threshold | `npm test -- --silent` |

---

## 8. Defect classes this spec can produce, and the gate against each

Per the AKILI rule that a gate blind to the dominant defect class is not a gate:

| # | Defect class | Gate | Can it actually fail. |
| --- | --- | --- | --- |
| **D1** | Normalization **too narrow** — a real spelling still dropped | Fixtures pinned to **all 11 observed production values**, asserting the exact count 25 | Yes — remove one variant from the predicate, count drops |
| **D2** | Normalization **too broad** — Window-3 admitted | Negative fixtures for all 5 Window-3 spellings | Yes — a `contains` instead of a prefix test reddens it |
| **D3** | Fallback branch never fires, or always fires | Two fixtures: legacy-shaped and new-shaped, in **one** feed | Yes — hard-code either branch, one fixture reddens |
| **D4** | Phase filter excludes rows that have no phase → production returns 0 | A production-shaped fixture (no `phase` key) asserting a non-empty result | Yes — treat missing phase as a mismatch, it reddens |
| **D5** | Science-program gate applied by default | Fixture with zero mappings asserting the project **is** returned | Yes — add the gate, it reddens |
| **D6** | **DI scope regression** — injecting `AppConfigService` (or anything else carrying `CurrentUserUtil`) cascades `Scope.REQUEST` into the picker, silently changing instantiation for already-shipped endpoints | ⚠️ **No automated gate exists.** The HTTP suite that would prove it is the unfinished S1 artifact (`artifacts/coverage-report.http.spec.ts.wip`, follow-up F-1) | **No.** See below |
| **D7** | **Fixture drift** — fixtures stay green while CLARISA's real values change | ⚠️ **No automated gate.** `evidence/probe-selector.py`, run manually | **No.** See below |
| **D8** | **The seed migration is unrunnable** — a `?` or `:word` in its SQL, comments included, makes it throw before MySQL ever parses it | `npm run migration:dev:execute` against a scratch schema. **Static gates cannot see this class** — a migration once shipped unrunnable while passing lint, types, build, and review (Kaizen **K-006**) | Yes — add a `?` to a comment and it throws |

### D6 became a live risk with the OQ-B decision — it is no longer hypothetical

Before the phase moved into `app_config`, D6 was a "don't do the obvious wrong thing" note. Now the requirement itself asks the picker to read from the database, and **the most natural way to do that is the wrong one**: injecting `AppConfigService`, which carries `CurrentUserUtil` (`Scope.REQUEST`). An Implementer who reaches for the service rather than a `DataSource` produces working code, green tests, and a silent scope change across the module's already-shipped endpoints.

Substitute gate: **explicit Reviewer check of the constructor signature**, named as a done-criterion on the task rather than left to general diligence. Accepted residual risk — a reviewer who skims it passes it.

### D7 is unmeasurable by construction — stated, not implied

Fixtures are a snapshot of the upstream feed, so no unit test can detect that the feed moved. The substitute is procedural: **re-run `probe-selector.py` after CLARISA's promotion** (proposal risk R-4). Recorded as an **accepted risk**, because an acknowledged blind spot is recoverable and an unacknowledged one is what burns rework attempts.

---

## 9. Requirement ID Index

| ID | Title | Priority |
| --- | --- | --- |
| R-BAS-001 | Funding source matched by normalized prefix | **Must** |
| R-BAS-002 | Alliance selector tolerant of both feed shapes | **Must** |
| R-BAS-003 | Phase filtered only when stated; configurable | **Must** |
| R-BAS-004 | Science programs reported, not gated | **Must** |
| R-BAS-005 | No change to anything else | **Must** |
| R-BAS-006 | Branch observability | Should |
| R-BAS-007 | Phase editable at runtime via `app_config` | **Must** |
| NFR-BAS-001 | Singleton scope preserved | **Must** |
| NFR-BAS-002 | Pure in-memory selection | **Must** |
| NFR-BAS-003 | Normalization independently testable | Should |
| NFR-BAS-004 | Coverage ≥ 60% | **Must** |

---

## 10. Open questions

| ID | Question | Status |
| --- | --- | --- |
| **OQ-D** | Should a **durable, admin-editable** phase setting be built | **Closed** at the Phase 1 gate, 2026-08-14 — **yes**. Now R-BAS-007. The client cost turned out to be zero (the screen is generic); the real cost is one migration and the DI constraint |
| **OQ-E** | The 5 test projects that have mappings have **zero Confirmed** ones. Is `Confirmed` the wrong status filter, or is the data genuinely unmapped | **Open** — one question to PRMS. Does not block: R-BAS-004 reports rather than gates either way |
