# Kaizen Entry — changes/control-lists-global-scope

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/control-lists-global-scope` |
| Date | 2026-10-15 |
| Branch | institutional-kpis (spec branch — no `Default Branch:` pin; not `main`/`master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (T-00…T-04; T-04 added after validation, requester-approved) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-04 attempt 1 — falsifier red on an earlier assertion, target assertion never seen red) | execution.md — T-04 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no `test-report.md`) | — |
| Judgment-day severe findings | ESCALATED; R3-1/R3-2 decided by the requester | judgment.md §10 |
| Validation FAIL / WARN | 0 / 7 (W-1…W-3 fixed by T-04; W-4, W-7 corrected at archive; W-5, W-6 pending) | validation-report.md |
| Budget | LOC ≈ 8,360 vs ≈ 2,950 estimated (2.8×); tasks and review rounds within budget | execution.md — T-02 budget tripwire |
| Plan predictions wrong | 3: T-00 revert count, T-01 F2 failure shape, T-02 F1 failing case | execution.md T-00, T-01, T-02 |
| Drift attributable | n/a (no `docs/specs/audits/` report) | — |

## Lessons

- **KZ-changes--control-lists-global-scope-1 — `migration:revert` undoes the highest `id`, not the newest timestamp.** (Product, Medium)
  - Root cause: tasks.md T-00 planned "three reverts, `…000` third" from migration timestamps. TypeORM 0.3.20 `MigrationExecutor.getLatestExecutedMigration` takes row 0 of `ORDER BY id DESC`. An older-timestamp migration (`CreatePrmsWebhookDeliveryTable`, id 369) had run after `…000` (id 368), so the planned third revert would have dropped an unrelated table. A pre-check caught it; an unplanned fourth revert followed (D-EX-1).
  - Evidence: execution.md — T-00, *Deviation from the plan*; `node_modules/typeorm/migration/MigrationExecutor.js:286, :403, :447`.
  - Standardization: → P1
- **KZ-changes--control-lists-global-scope-2 — Full `main.ts` boot is not a safe local verification.** (Product, Low)
  - Root cause: tasks.md T-01/T-02 required "A1, A3–A13 in `/swagger` … (local boot)". `bootstrap()` starts `microservice()` first, which attaches a consumer to the shared AWS RabbitMQ `ARI_QUEUE`. Both Implementers had to re-derive a reduced boot (real controller + `main.ts` DocumentBuilder/prefix/versioning + stub service), and the gate was recorded as a deviation twice (D-EX-4).
  - Evidence: execution.md — T-01 *Swagger (NFR-CLG-003)*, T-02 *Swagger*; validation-report.md §5.
  - Standardization: → P2
- **KZ-changes--control-lists-global-scope-3 — The LOC budget was sized without the test volume the tasks themselves mandated.** (Methodology, Low)
  - Root cause: design §14 estimated ≈ 2,950 lines while tasks.md required, per slice, real-pipe validation suites, several DB integration suites and falsifier coverage. The actual 8,360 lines were mostly tests. The tripwire fired on volume the spec had itself ordered, not on scope creep.
  - Evidence: design.md §14 (estimate and as-built note); execution.md — T-02 *Budget tripwire*.
  - Standardization: → P3 (upstream only)

## Noted, not a lesson

- Two more falsifier **predictions** were wrong in the spec's own frame: T-01 F2 rejected on the PK instead of reporting affected rows > 0; T-02 F1 named the `activeOnly=false` case, where inactive values are legitimate. Both gates still went red. This is the queued methodology lesson K-004 ("a falsifier authored from the design's own frame tends to name a mutation the design already excludes"): +2 occurrences.
- Parallel integration suites collided on a shared `LIKE` cleanup prefix (`__t02_itest__`). The Implementer fixed it with a unique prefix. One occurrence.
- The HITL mockup check was accepted as "minor differences" without itemizing them; validation itemized 14 afterwards (M-1…M-14). One occurrence.
- A 343 KB diff was handed to the Reviewers as a validated scratch file instead of inline (K-011 check done). The rule "diff always inline" does not scale to an L slice. One occurrence.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `server/researchindicators/src/CLAUDE.md` §7 *Persistence rules*, after "Revert one with `npm run migration:revert`." (line ~205) |
| Edit | `migration:revert` undoes the row with the **highest `id`** in `migrations`, not the newest timestamp — run `SELECT id, name FROM migrations ORDER BY id DESC LIMIT 5` and plan reverts by name before running it. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `server/researchindicators/src/CLAUDE.md` §11 *Common commands* (or §9 *Tests*) |
| Edit | Do not boot the full `main.ts` to check Swagger locally: `bootstrap()` starts `microservice()` first and consumes the shared `ARI_QUEUE`. Boot the controller under `main.ts`'s DocumentBuilder/prefix/versioning with a stub service and read `/swagger-json`. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology — `/akili-specify` Step 2.4 (budget). Upstream only; no local edit |
| Edit | When tasks mandate DB integration suites or per-task falsifiers, size test LOC at ≥ 1× the production LOC in the budget row. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-014 (lineage `staging`) |
| Edit | Recurrence +1, source `changes/control-lists-global-scope`. T-04 attempt 1: a falsifier went red in the right test but on an **earlier** assertion, so the target assertion (`portfolioIds: []` body) was never seen red; the Reviewer failed it. Note: *"name the assertion, not the test — a red that stops before the target assertion is not evidence for it."* Severity stays High. |
| Severity | High |
| Status | pending |

### G1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §2 IA tree (lines ~83-88), §4 Screen Inventory, §12 Design Decisions |
| Edit | §2: under `Administration` add `└── System admin` with `Environment variables`, `Prompt Manager`, `Control Lists` (Admin + Technical Support). §4: row `/administration/configuration/control-lists` — Control Lists (global vocabularies, *Applies to* per value; `appConfigurationGuard`). §12: decision "Control Lists moved to System admin; access Admin + Technical Support (D-CLG-7/8, 2026-10-13)". |
| Severity | Medium |
| Status | pending |

### G2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `server/researchindicators/src/CLAUDE.md` §2 *Source map*, §3 *Where to put a new file* (item 5), §9 *Tests* (coverage line 232) |
| Edit | §2/§3: "Seed SQL called by migrations lives in `db/seeds/<module>.seed.ts`, outside the migrations glob — a migration file exports only its class (TypeORM loads every export under `migrations/**`)." §9: add `db/seeds/**` to the coverage exclusions. |
| Severity | Medium |
| Status | pending |

### G3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `client/research-indicators/src/CLAUDE.md` lines ~60-67 (+ the `src/AGENTS.md` mirror) |
| Edit | Folder tree: add `administration/configuration/` (`control-lists/`, `prompt-manager/`, `variable-configuration/`) beside `administration/center-admin/`. Guards line: `rolesGuard, centerAdminGuard, appConfigurationGuard`. |
| Severity | Low |
| Status | pending |

### G4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | root `CLAUDE.md` §4.1, the *Audit* bullet |
| Edit | Append: "Exception: a pure join table with no own business data (e.g. `control_list_value_portfolios`) does not extend `AuditableEntity`; every change to it goes through a write on its parent, which stamps the parent's audit fields (D-CLG-12)." |
| Severity | Low |
| Status | pending |

### G5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/specs/kaizen/institutional-performance--control-lists.md` pending item P8 (lines ~125-126) |
| Edit | Supersede P8's §2.1 part: Control Lists sits under **System admin** at `/administration/configuration/control-lists` (not under *Portfolio Management* / `center-admin`). Covered by G1; the `data-table` §8.1 half of P8 stands. Mark P8's IA half `rejected (superseded by changes/control-lists-global-scope G1)`. |
| Severity | Medium |
| Status | pending |

### G6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/specs/institutional-performance/family.md` line 8 (Document Control *Last updated*) |
| Edit | Repoint the link `](../changes/control-lists-global-scope/proposal.md)` to `](../archive/2026-10-15-changes--control-lists-global-scope/proposal.md)` — the spec folder moved at archive (KZ-013 backward sweep; the only markdown link into the folder). |
| Severity | Low |
| Status | pending |

### T1

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` — module layout / data model / API contracts (no ADR superseded; new decision) |
| Edit | Control Lists module: global controlled vocabularies read by key. Tables `control_list_categories`, `control_lists` (unique `name`/`list_key`), `control_list_values`, `control_list_value_portfolios` (value ↔ portfolio, CASCADE/RESTRICT, no audit columns). Consumer contract: `GET /api/control-lists/by-key/:listKey/values?portfolioId=&activeOnly=` (any authenticated user; `appliesTo`/`appliesToAll`) and `ControlListValueLookupService.assertValueInList(valueId, listKey)`. A cross-module read-only `TypeOrmModule.forFeature([Portfolio])` is used instead of importing `PortfoliosModule` (D-CLG-13). |
| Severity | Low |
| Status | pending |
