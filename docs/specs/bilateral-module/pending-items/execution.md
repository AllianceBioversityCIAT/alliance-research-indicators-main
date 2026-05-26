# Execution log — Bilateral / Pending items (v2)

- **Module:** bilateral
- **Spec id:** 2026-05-bilateral-pending-items
- **Linked spec:** [`./requirements.md`](./requirements.md) · [`./design.md`](./design.md) · [`./tasks.md`](./tasks.md)
- **Branch:** `AC-1594-bilateral-module-v2`
- **Started:** 2026-05-25

---

## Task execution history

### [x] T-15.13 — Migration + entity for `bilateral_project_mapping`

- **Date:** 2026-05-25
- **Requirements covered:** R-BIL-079
- **Files added:**
  - `server/researchindicators/src/db/migrations/1779190000011-createBilateralProjectMapping.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/entities/bilateral-project-mapping.entity.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/enum/mapping-source.enum.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/repositories/bilateral-project-mapping.repository.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.module.ts`
- **Decisions made:**
  - Implemented D-PI-9 (MySQL partial-unique) via a STORED GENERATED column `active_agreement_id = IF(is_active = 1, agresso_agreement_id, NULL)` plus a UNIQUE index `uk_bpm_active_agreement` on that column. The generated column is intentionally NOT mapped on the TypeORM entity (TypeORM would otherwise try to write to it).
  - `BilateralProjectMappingModule` is minimal at this task — only registers the entity + repository. The service + controller arrive in T-15.14. Module is NOT yet imported into `AppModule`, so no DI graph change to verify yet.
  - `AuditableEntity` already provides `created_at / created_by / updated_at / updated_by / is_active / deleted_at`, so the entity defines only the bilateral-specific columns.
- **Issues encountered:** none.
- **Verification:**
  - `npx tsc --noEmit -p tsconfig.build.json` → clean.
  - `npm run migration:dev:execute` → applied as `CreateBilateralProjectMapping1779190000011`.
  - `SHOW INDEXES FROM bilateral_project_mapping` confirms `uk_bpm_active_agreement` (UNIQUE), `idx_bpm_agreement`, `idx_bpm_clarisa_project`, plus PRIMARY.
  - **Partial-unique exercise** (manual MySQL session):
    1. Insert active row for `agresso_agreement_id='T-15.13-TEST'` → ✓
    2. Insert second active row for same id → `ERROR 1062 Duplicate entry 'T-15.13-TEST' for key 'uk_bpm_active_agreement'` ✓
    3. Deactivate first row (`is_active=0`) → `active_agreement_id` becomes NULL ✓
    4. Insert replacement active row for same id → ✓ (final state: one inactive `id=1`, one active `id=3`, both preserved)
  - `npm run migration:revert` → table dropped cleanly.
  - `npm run migration:dev:execute` re-apply → ✓ (idempotent).
  - `npx eslint --fix` on new files → clean.
- **Status:** [x] completed
- **Commit:** `8b59a099`

---

### [x] T-15.14 — `BilateralProjectMappingService` + controller + DTOs

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-080 (REST surface) + R-BIL-078 (lookup helper)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/create-bilateral-project-mapping.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/update-bilateral-project-mapping.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/list-bilateral-project-mappings.query.dto.ts`
- **Files modified:**
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.module.ts` (registers controller + service)
  - `server/researchindicators/src/domain/entities/entities.module.ts` (imports + exports `BilateralProjectMappingModule`)
  - `server/researchindicators/src/domain/routes/main.routes.ts` (registers the new sub-resource at `/api/bilateral-project-mappings`)
- **Decisions made:**
  - Service is singleton-scoped (per parent design.md §3.4 Constraint A and design D-PI-8); receives the `User` from controller via `@Req()`, not from `CurrentUserUtil`.
  - `create` runs inside `dataSource.transaction` with `setLock('pessimistic_write')` on the active-row lookup → 409 ConflictException is deterministic; the DB-level partial-unique (D-PI-9) remains as the safety net.
  - `update` intentionally does NOT allow changing `agresso_agreement_id` — operators deactivate and re-create instead (preserves audit history).
  - `deactivate` is idempotent: calling it on an already-inactive row returns the row without re-writing.
  - Controller does NOT use `SetUpInterceptor` (would require `ResultsUtil`, which is REQUEST-scoped and unnecessary here — admin endpoints have no `:resultCode` token).
- **Issues encountered → Pivot Record #1.**
- **Verification:**
  - Typecheck: `npx tsc --noEmit -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral-project-mapping` → **21/21 passing** (service: 13 covering R-BIL-078 lookup + R-BIL-080 create/409/update/deactivate/list with filters; controller: 8 covering role-gate metadata + handler delegation + 201/200 envelopes).
  - Lint: `npx eslint --fix` → clean.
  - Boot: Nest application successfully started; all 5 routes registered at `/api/bilateral-project-mappings[/...]`.
  - **End-to-end smoke** via `Authorization: bypass` (SYSTEM_ADMIN injected):
    1. `/api/v2/results` → 200 (DI gate green).
    2. `POST /api/bilateral-project-mappings` → 201 with audit fields populated.
    3. Duplicate `POST` same `agresso_agreement_id` → 409 with `"Active mapping already exists for this contract"`.
    4. `GET` with search → returns the row + paginated `meta`.
    5. `PATCH /:id/deactivate` → 200, `is_active:false`, `deleted_at` set, `notes` recorded.
    6. `POST` again after deactivate → 201 (partial-unique slot freed).
    7. DB cleanup.
- **Status:** [x] completed
- **Commit:** `b7bdc237`

---

### [x] T-15.10 — `ClarisaProjectsService` tool + 5-min cache

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-076 (data source) + NFR-BIL-073 (upstream resilience)
- **Files added:**
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.module.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.spec.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/dto/clarisa-project.types.ts`
- **Decisions made:**
  - Reused the existing `Clarisa` connection class (`src/domain/tools/clarisa/clarisa.connection.ts`) — it already handles the CLARISA Bearer-token flow via `auth/login`. My probe earlier used Basic auth (which CLARISA also accepts), but Bearer matches the rest of the codebase; no need to introduce a second auth path.
  - Service is singleton-scoped (per parent design.md §3.4 Constraint A and design D-PI-7) — no `CurrentUserUtil` / `ResultsUtil`. The picker hot path can call this freely without re-introducing the empty-shell DI cycle.
  - Cache: in-memory `{data, fetchedAt}`, TTL 5 min, no event invalidation (per D-PI-12). Project↔SP changes are rare; admin refresh endpoint is a future enhancement.
  - Resilience (per NFR-BIL-073): warm-cache-serve-on-error keeps the picker working during short CLARISA hiccups; cold-cache → `ServiceUnavailableException` so the response envelope is a clean 503 instead of leaking an upstream stack trace.
  - Added `resetCacheForTests()` test seam — lets specs reset cache between cases without waiting 5 minutes. Marked non-public in the JSDoc.
  - Stubbed the internal `connection` field directly in the service spec (rather than mocking the entire `HttpService` axios chain). Cleaner test, focuses assertions on caching + resilience.
- **Issues encountered:** none.
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/tools/clarisa/projects` → **7/7 passing** (bilateral filter, cache hit, findProjectById happy / not-found / NaN-id short-circuit, warm-cache-serve-on-error, cold-503).
  - Lint: `npx eslint --fix` → clean.
  - Live wiring not exercised here (module isn't imported into any consumer yet). Will be exercised end-to-end in T-15.11 (per-result SP endpoint) and T-15.15 (admin SSR project picker).
- **Status:** [x] completed
- **Commit:** `f9f6f851`

---

### [x] T-15.11 — `GET .../pool-funding-alignment/science-programs` endpoint + service

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-076 (per-result SP endpoint) + R-BIL-078 (result→project resolution)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-science-programs.response.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.getScienceProgramsForResult.spec.ts` (focused-scope spec; full bilateral.service spec lands in T-15.6)
- **Files modified:**
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.ts` — extended `PoolFundingAlignmentContext` with `agresso_agreement_id` and `platform_code`; extended the SQL to project both. `platform_code` is added now so T-15.2 can reuse the same context lookup.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — new method `getScienceProgramsForResult(resultId, resultCode)` chains result → agreement_id → `BilateralProjectMappingService.findActiveByAgreementId` → `ClarisaProjectsService.findProjectById` → filter (Confirmed + activePortfolio) → enrich from local catalog. Sorted by code.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts` — new `@Get('science-programs')` under existing controller (lands at `/api/v1/results/:resultCode/pool-funding-alignment/science-programs`).
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.module.ts` — imports `ClarisaProjectsModule` + `BilateralProjectMappingModule`.
  - `server/researchindicators/src/domain/shared/utils/env.utils.ts` — new `ENV.BILATERAL_ACTIVE_PORTFOLIO` getter (default `"P25"`, env-driven via `ARI_BILATERAL_ACTIVE_PORTFOLIO`).
- **Decisions made:**
  - "Unmapped" covers three cases: (a) result has no AGRESSO contract, (b) no active row in `bilateral_project_mapping`, (c) mapping points at a project CLARISA no longer exposes. All return 200 with `mapping_status: "unmapped"` + empty `science_programs`. Case (c) also surfaces the snapshot `clarisa_project` so ops can spot drift.
  - Active-portfolio filter is env-driven, not hard-coded. Default `"P25"` matches the current 2025–2030 portfolio. When the next portfolio rolls out, ops flips one env var, no code change.
  - `icon_key` is sourced from the local catalog `clarisa_science_programs.icon_key`, which doesn't exist yet (T-15.4 ships it). For now the field is always `null`; T-15.4 just adds the column + seeds it. The response shape is stable either way.
  - Sorted `science_programs[]` by code (`SP01 → SP13`) so the FE picker is deterministic regardless of CLARISA's mapping array order.
- **Issues encountered → Pivot Record #2.**
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral/bilateral.service.getScienceProgramsForResult` → **8/8 passing** (404, unmapped-no-contract, unmapped-no-row, unmapped-stale-project, mapped-happy, non-Confirmed filter, multi-portfolio filter, deterministic sort).
  - Lint clean.
  - Nest boot: route registered at `/api/v1/results/:resultCode(\d+)/pool-funding-alignment/science-programs` (version 1). DI gate `/api/v2/results` → 200.
  - **Live end-to-end smoke against CSICAP (result 19792, AGRESSO contract D527):**
    1. Pre-mapping → `mapping_status: "unmapped"`, empty list, 200 ✓
    2. Created mapping `D527 → CLARISA project 1` (T-PJ-003262, IITA, Nigeria) via `POST /api/bilateral-project-mappings` → 201
    3. Re-fetch → `mapping_status: "mapped"`, `clarisa_project.short_name` populated from CLARISA, `science_programs: [SP09 25%, SP10 75%]` with colors enriched from local catalog (#ec4899, #8b5cf6). EXACTLY what CLARISA defines for that project. ✓
    4. Mapping row cleaned up.
- **Status:** [x] completed
- **Commit:** `92e2fd52`

---

### [~] T-15.7 — Rollout (dev leg done; staging + prod queued for DevOps)

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-075 (dev leg), NFR-BIL-072 (zero-500 post-rollout)
- **Files added:**
  - `docs/specs/bilateral-module/pending-items/rollout-checklist.md` — env-by-env rollout commands, smoke curls (A/B/C/D), rollback sequence (LIFO `migration:revert`), per-env sign-off blocks, safety-export instructions for `bilateral_project_mapping`, and a known-risks table.
- **Files modified:**
  - `docs/specs/bilateral-module/pending-items/tasks.md` — T-15.7 marked `[~] in progress`; dev leg ticked; staging + prod linked to the new checklist.
- **Decisions made:**
  - **Dev leg is the only part I could fully execute** without staging/prod creds. Marked done with the migration round-trip evidence already captured during T-15.3 / T-15.4 / T-15.13 development.
  - **Smoke set widened from the spec's original 2 checks to 4** (A: catalog + icon_key, B: DI sanity `/api/v2/results`, C: mapping endpoint registered, D: per-result picker on a known bilateral result). C and D are new — they catch regressions specific to the Phase 1.5 surfaces, not just the parent catalog endpoint. NFR-BIL-072's "zero 500s" target is more directly verified by C + D than by A alone.
  - **`bilateral_project_mapping` safety export is in the rollback path.** Catalog tables are regenerable from migrations; the mapping table holds operator-created data that survives between environments. Documented explicitly to avoid an accidental destructive revert in prod.
  - **Operator-validation step added to staging sign-off** (a STAR FE engineer creates one mapping end-to-end via the admin SSR page and confirms the per-result picker only shows that project's SPs). Catches the integration seam between the admin module (T-15.15) + the per-result picker (T-15.11) + the catalog enrichment (T-15.4) in a way curl alone can't.
- **Issues encountered:**
  - First live verification hit a transient `read ETIMEDOUT` on the MySQL connection pool (stale connection from earlier dev work). Retry was clean; flagged as a known interaction in the checklist so DevOps doesn't mistake a transient pool issue for a rollout failure.
- **Verification (dev leg only — staging + prod blocked on DevOps):**
  - Migration ledger: `npm run migration:dev:execute` → `No migrations are pending`.
  - Smoke A: `GET /api/tools/clarisa/science-programs` → `status=200`, 13 rows, all `icon_key` populated. Sample: `SP01 → icon_key=SP01, color=#ef4444`.
  - Smoke B: `GET /api/v2/results?limit=1` → 200.
  - Smoke C: `GET /api/bilateral-project-mappings?limit=1` → 200, `meta.total=3` (the 3 inactive D527 rows from prior smokes).
  - Smoke D: (already verified end-to-end during T-15.11) — result `19792` (CSICAP) → AGRESSO `D527` → CLARISA project `1` (T-PJ-003262 IITA) → `SP09 25% + SP10 75%` Confirmed in P25.
- **Status:** [~] dev leg completed; staging + prod tracked in the checklist (awaiting DevOps owner assignment + off-peak window confirmation).
- **Commit:** (pending — this entry + checklist + tasks.md flip)

---

### [x] T-15.6 — Sibling spec backfill

- **Date:** 2026-05-26
- **Requirements covered:** NFR-BIL-070 (spec coverage)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts` — canonical service spec. Covers `getAlignment` (happy / eligible-false / not-found), `listIndicators` (empty / stale grouping / `indicator_type` filter), `upsertContribution` (happy / unknown indicator type / lever not in alignment), `deleteContribution` (happy / 404). The private `toSelectedSciencePrograms` is exercised transitively via `getAlignment`.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.spec.ts` — handler-level coverage. 7 delegation tests (each GET/PATCH/POST/DELETE handler) + role-metadata table assertion that the 4 mutation endpoints carry `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` and the 3 read endpoints do not (RolesGuard short-circuits on missing metadata).
  - `server/researchindicators/src/domain/tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service.spec.ts` — `findAll` (active filter + ASC sort), `findByCode` (happy + null on miss).
  - `server/researchindicators/src/domain/tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.controller.spec.ts` — 200/404 envelope wiring for `findAll` + `findByCode`.
- **Decisions made:**
  - **Kept the 3 focused specs (T-15.1 / T-15.2 / T-15.11) alongside the canonical one** instead of consolidating. They own the deep R-BIL-070 / R-BIL-071 / R-BIL-076 scenarios verbatim and were already commit-anchored in the execution history. The canonical `bilateral.service.spec.ts` covers the methods those focused specs don't touch.
  - **Mocked `manager.getRepository().save` to echo back the payload** (TypeORM's actual behavior) so `savedMapping` in `upsertContribution` carries the `lever_code` / `indicator_code` / `indicator_type` fields the service's response builder reads.
  - **Override RolesGuard + ResultOwnerGuard with passthrough** in the controller spec via `.overrideGuard()` rather than providing the full DI graph (`ResultUsersService`, `Reflector`, etc.). Handler tests don't exercise guards; the role-metadata block asserts the decorator wiring directly via the `Reflector`.
  - **`getHlosByScienceProgramsForResult` is NOT specced here** — the method doesn't exist yet (T-15.12 blocked on OQ-RV-2). Will land with that task; the canonical spec file is the natural home.
- **Issues encountered:**
  - First run: `bilateral.controller.spec.ts` failed at Nest's testing-module compile step because `RolesGuard` + `ResultOwnerGuard` were being instantiated and pulled in `ResultUsersService`. Fixed with `.overrideGuard()` for both.
  - First run: `bilateral.service.spec.ts` `upsertContribution` happy path asserted `lever_code: 'SP01'` on the response but the mock `save` returned a bare `{ id: 1 }` without echoing the payload. Fixed by mocking `save` with a payload-echoing implementation.
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - **87/87 tests passing** across the bilateral + bilateral-project-mapping + clarisa-science-programs + clarisa-projects + admin suites (11 spec files total).
  - Lint clean.
  - **Module-level coverage** (`npx jest --coverage --testPathPattern=...`):
    - `bilateral/` — **80.42% stmts**, 66.99% branches, 93.33% funcs, **80.29% lines**
    - `bilateral-project-mapping/` — **86.73% stmts**, 84% branches, 100% funcs, **87.91% lines**
    - `clarisa-science-programs/` — **75% stmts**, 100% branches, 100% funcs, **76.92% lines**
    - Both controller files: 100% across the board.
    - `bilateral.service.ts`: 88.94% stmts / 91.11% funcs / 88.5% lines (uncovered: `markIndicatorMappingsStale` 411–422 + a few defensive branches in `getEditableContributionContext`).
  - The global jest threshold warning (`60% not met`) is expected when running a subset of suites — the project has hundreds of suites; running ~11 of them gives a global aggregate below threshold even though the targeted modules are well above. NFR-BIL-070 specifies the **module** target (≥70%) which we cleared.
- **Status:** [x] completed
- **Commit:** `0a1b1c66`

---

### [x] T-15.9 — Re-price Phase 3+ tasks (T-21..T-38)

- **Date:** 2026-05-26
- **Requirements covered:** (operational — no R-ID)
- **Files modified:**
  - `docs/specs/bilateral-module/tasks.md` — updated the inline `Status:` line on T-21 through T-38 (18 entries). Each now carries a current status note and a back-link to §15 "Re-price log". Notable changes: T-24 marked **landed** with commit `e838e2f8`; T-31 marked **scope narrowed → S/M** (catalog half covered by T-15.4 + T-15.11 + the live CLARISA proxy; only the HLO indicators-per-SP surface remains, now T-15.12); T-32 marked **likely DROPPED** (replaced by the on-demand live proxy pattern from T-15.12). §15 re-price log already in place from T-15.8.
- **Decisions made:**
  - **Inline `Status:` lines were normalized from "pending" → either "open (blocker)", "landed", "not started", or "scope narrowed" / "likely DROPPED"** to remove the ambiguity of "pending" (which conflated "blocked", "not started", and "in progress"). Each line carries a one-line context so a reader doesn't have to scroll to §15 for the gist.
  - **Hyperlinked each inline status back to `#15-re-price-log`** so the relationship between the per-task line and the summary table is explicit. The §15 table stays authoritative; per-task lines defer to it.
  - **T-28 + T-30 (admin SSR pages)** carry an extra note: their SSR shells are now unblocked by T-15.15's `basename="/api"` fix — when the push and W3 services land, the admin pages can ship without re-debugging admin routing.
- **Issues encountered:** none.
- **Verification:**
  - Spot-check: every T-2X and T-3X task header now has a current `Status:` line. (No other content touched.)
  - §15 "Re-price log" cross-link anchor (`#15-re-price-log`) is the lowercased section heading, which matches GitHub-flavored markdown's anchor generation.
  - The other parent-spec content + the pending-items sub-spec content remain unchanged outside this update.
- **Status:** [x] completed
- **Commit:** `daca84ac`

---

### [x] T-15.8 — Doc updates to parent specs

- **Date:** 2026-05-26
- **Requirements covered:** NFR-BIL-071 (doc alignment)
- **Files modified:**
  - `docs/specs/bilateral-module/design.md` — new §3.6 ("CLARISA-source SPs + admin-owned project mapping (Phase 1.5)") + §3.7 ("Source-based read-only gate (Phase 1.5)"). Each cross-links to the pending-items sub-spec and to the relevant T-15.N task IDs / commit hashes / Pivot Records.
  - `docs/specs/bilateral-module/tasks.md` — appended §14 "Phase 1.5 deltas — pending-items sub-spec" (T-15.1..15.16 status table + Pivot Records list + carried-forward bug callout) + §15 "Re-price log" (Phase 3+ re-evaluation dated 2026-05-25).
  - `docs/specs/bilateral-module/frontend-handoff.md` — §4.2 (union `is_read_only` semantic + new `icon_key` / `allocation` fields on `selected_science_programs[]`), §4.3 (catalog-aware 400 with structured `errors.unknown_sp_codes` payload), §4.6 (rewritten — per-result picker is now the source; legacy catalog demoted to display-only fallback), new §4.7 (HLO endpoint stub returning interim 503), new §4.8 (admin module pointer), §12 changelog entry for 2026-05-26.
- **Decisions made:**
  - **Numbered the new tasks.md sections §14 + §15** rather than the spec-idealized §10 + §11 because the parent file already had sections §10–§13 (Cross-cutting / Risks / DoD / Sign-off). Renumbering existing sections would break cross-refs across the spec tree; appending preserves them.
  - **Kept the legacy `GET /api/tools/clarisa/science-programs` endpoint documented as a deprecated fallback** instead of removing the doc entirely. It's still live (returns the 13 SPs with `icon_key` from T-15.4) — the FE may need it transiently if the per-result enrichment path can't reach CLARISA. Removal is a future cleanup once the FE stops keying off it.
  - **Cross-linked each pending-items entry from the parent** rather than duplicating content. Parent specs stay as the high-level reference; `pending-items/` carries the depth (12 design decisions, 11 functional requirements, 16 task entries, 3 Pivot Records, full execution history).
- **Issues encountered:** none.
- **Verification:**
  - Pre-existing parent-spec content untouched outside the new sections.
  - All cross-refs (`./pending-items/...`, `./pending-items/execution.md`, anchor links within `frontend-handoff.md`) resolve.
  - `frontend-handoff.md` §4 numbering preserved (no renumber of §4.1–§4.5).
  - `tasks.md` §13 Sign-off kept in place; new §14/§15 append cleanly at the end.
- **Status:** [x] completed
- **Commit:** `8a00dcfc`

---

### [x] T-15.15 — Admin SSR page + sidebar entry

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-080 (UI surface)
- **Files added:**
  - `server/researchindicators/src/admin/client/pages/BilateralProjectMappings.tsx` — single-file React page (list table, create/edit modal, deactivate button, AGRESSO+CLARISA pickers, SP allocation preview).
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.ts` — admin-gated picker endpoint `GET /api/tools/clarisa/projects/bilateral?search=...` returning the trimmed shape `{id, short_name, source_of_funding, science_programs[]}`.
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.controller.spec.ts` — 3 tests (role-gate metadata, trim to Confirmed + entity_type 22, search filter).
- **Files modified:**
  - `server/researchindicators/src/admin/admin.module.ts` — imports `BilateralProjectMappingModule`.
  - `server/researchindicators/src/admin/services/admin.service.ts` — adds `listBilateralProjectMappings(query)` delegating to `BilateralProjectMappingService.list`.
  - `server/researchindicators/src/admin/services/admin.service.spec.ts` — wires the new dependency + asserts the delegation.
  - `server/researchindicators/src/admin/controllers/admin.controller.ts` — adds `@Get('bilateral-project-mappings')` SSR handler.
  - `server/researchindicators/src/admin/controllers/admin.controller.spec.ts` — covers the new handler.
  - `server/researchindicators/src/admin/client/App.tsx` — registers `/admin/bilateral-project-mappings` route.
  - `server/researchindicators/src/admin/client/components/Sidebar.tsx` — adds "Bilateral mappings" entry between Users and Settings.
  - `server/researchindicators/src/admin/client/entry-server.tsx` + `entry-client.tsx` — adds `basename="/api"` to both routers (see Pivot Record #3 below).
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.module.ts` — registers the new controller.
  - `server/researchindicators/src/domain/tools/clarisa/routes/clarisa.routes.ts` — mounts `ClarisaProjectsModule` at `/api/tools/clarisa/projects`.
- **Decisions made:**
  - **Single-file React page** matching the existing Users/Settings convention rather than the 3-file split the task suggested. Page is ~400 LOC; splitting would mostly trade one big read for several small ones for the same content.
  - **Picker endpoint lives outside `/api/admin/...`** (mounted at `/api/tools/clarisa/projects/bilateral`) for the same reason T-15.14 moved the REST surface out: the JWT middleware exclude `/admin(.*)` would otherwise bypass auth. RolesGuard provides the actual gating (`CENTER_ADMIN`, `SYSTEM_ADMIN`).
  - **AGRESSO picker reuses existing `GET /api/v1/agresso/contracts?pool-funding-contributor=true`** with a client-side `funding_type ∈ {BLR, BILATERAL}` filter — no new backend endpoint.
  - **SP allocation preview** comes straight from the picker payload (the new controller pre-trims `project_mappings_array` to Confirmed + entity_type 22 = Science programs) — so the form doesn't need a second round-trip when the operator selects a project.
  - **Hybrid SSR + client-fetch**: SSR powers the first paint; all CRUD + refresh + picker loads go through the client. `credentials: 'include'` on fetches so the JWT cookie / dev bypass middleware reaches the API surface.
  - **Edit form locks `agresso_agreement_id`** — operators must deactivate + re-create to change the contract (preserves audit history, matches the service-side rule).
- **Issues encountered → Pivot Record #3** (admin SSR `basename`).
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/admin src/domain/tools/clarisa/projects src/domain/entities/bilateral` → **58/58 passing** (3 new clarisa-projects-controller + 2 new admin-service/controller + the 37 from prior tasks).
  - Lint clean.
  - **Live smoke (dev :3001 with `ARI_LOCAL_AUTH_BYPASS=true`):**
    1. Picker endpoint: `GET /api/tools/clarisa/projects/bilateral?search=IITA` → 200, returned 5 CLARISA bilateral projects with the trimmed shape (id, short_name, science_programs[]).
    2. SSR page: `GET /api/admin/bilateral-project-mappings` → 200, fully rendered:
       - Sidebar shows the new "Bilateral mappings" entry.
       - Page heading "Bilateral Project Mappings" + subheading "AGRESSO contract ↔ CLARISA bilateral project" present.
       - "New mapping" button, search/filter controls, and pagination meta all present.
       - `window.__INITIAL_DATA__.mappings` carries the 3 inactive D527 rows from previous smokes.
    3. Regression: `GET /api/admin/dashboard` — also now SSRs the body (was previously empty for every admin page; see Pivot #3).
  - **Browser-side full CRUD** not exercised in this run — the picker payload + REST surface are both unit-tested + smoke-verified at the API layer; the React page only orchestrates those calls. End-to-end CRUD via the UI was already proven during T-15.14 (curl) and the page just wraps the same endpoints.
- **Status:** [x] completed
- **Commit:** `9b539a7d`

---

## Pivot Record #3 — Admin SSR routes need `basename="/api"`

- **Task affected:** T-15.15 (side discovery affecting every existing admin page)
- **Date:** 2026-05-26
- **Discovery:** Live smoke of the new page returned a 200 with the layout (sidebar + header + footer) but an empty `<div class="content-wrapper"></div>`. Same shape on `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/settings` — all existing admin pages have been SSR-rendering with empty bodies. Root cause: `app.setGlobalPrefix('api')` (in `main.ts`) prefixes every controller route, so the actual served URL is `/api/admin/<page>`. But the React Router on both sides (StaticRouter on server, BrowserRouter on client) had no `basename`, so they tried to match `/api/admin/dashboard` against routes defined as `/admin/dashboard` and matched nothing. The empty body wasn't visible to anyone before because the admin panel hadn't seen significant traffic — the React Router silently renders nothing when no route matches.
- **Fix:** Two-line change — added `basename="/api"` to both `entry-server.tsx`'s `<StaticRouter>` and `entry-client.tsx`'s `<BrowserRouter>`. With basename in place, the router strips `/api` from the incoming URL before matching, so `/api/admin/dashboard` matches the `/admin/dashboard` route. `<Link to="/admin/...">` components automatically get the `/api` prefix prepended, so existing sidebar entries already work.
- **Verification after pivot:**
  - `/api/admin/bilateral-project-mappings` SSR body renders all expected markers (page heading, button, search, pagination meta).
  - Regression on `/api/admin/dashboard` — body now renders (StatsCards + heading) where it was previously empty.
  - No code changes to `App.tsx`, individual page components, or `Sidebar.tsx` Link targets.
- **Spec impact:** None on `requirements.md` / `design.md` — this is an implementation fix to a pre-existing bug, not a behavioral spec change. Noted here for future maintainers.

---

### [x] T-15.2 — Source-based read-only gate

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-071 (all 4 scenarios) — modifies R-BIL-015 / R-BIL-034 (union semantic on `is_read_only`)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.sourceReadOnlyGate.spec.ts` — focused-scope spec covering all 4 R-BIL-071 scenarios.
- **Files modified:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — adds private `isPrmsSourced(platformCode)` and `assertPrmsSourceWritable(platformCode)` helpers. `getAlignment` returns `is_read_only = isPrmsSourced || isSyncedToPrms` (union of the two gates). `updateAlignment` and `getEditableContributionContext` (shared by `upsertContribution` + `deleteContribution`) call the assert helper before any other domain check.
  - `server/researchindicators/src/domain/entities/bilateral/dto/update-pool-funding-alignment.dto.ts` — `AlignmentResponse.is_read_only` docstring documents the union semantic.
- **Decisions made:**
  - **Gate placement: before the contributor-eligibility check.** R-BIL-071 says "BEFORE role/owner checks" (architectural). Live smoke against PRMS result 28731 showed the existing contributor check was firing first and leaking 400 "not a Pool Funding Contributor" — which is misleading. Real reason is "PRMS owns this result, period." Moved the gate up; PRMS results now always surface the locked 409 wording.
  - **Reused `context.platform_code`** from `PoolFundingAlignmentContext` (added in T-15.11 for exactly this purpose). No second query.
  - **Locked the 409 wording.** `"Result is PRMS-sourced; bilateral alignment is read-only in STAR"` — FE may key off it. Hard-coded in the helper, asserted verbatim in the unit test, smoke-verified live.
  - **Union semantic on `is_read_only`** keeps the FE simple — one flag covers both gates. `is_synced_to_prms` is still exposed so existing FE telemetry that distinguishes the two reasons keeps working.
  - **Helper kept private + small** — no new interface surface; the architectural decision lives in one file. The full spec backfill for `BilateralService` (T-15.6) will pick it up.
- **Issues encountered:** none — the gate-ordering discovery was caught in the live smoke before commit.
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral` → **37/37 passing** (4 new T-15.2 + 4 T-15.1 + 8 T-15.11 + 21 bilateral-project-mapping).
  - Lint clean.
  - **Live smoke (dev :3001):**
    1. **Scenario 1** — `GET /api/v1/results/28731/pool-funding-alignment?reportingPlatforms=PRMS` → 200 with `is_read_only: true`, `is_synced_to_prms: false`. ✓
    2. **Scenario 2** — `PATCH` same → **409 ConflictException**, errors = `"Result is PRMS-sourced; bilateral alignment is read-only in STAR"` (verbatim). ✓
    3. **Scenario 3** — covered by unit test (regression: STAR + synced still returns "Result is already synced to PRMS").
    4. **Scenario 4** — `GET /api/v1/results/19792/pool-funding-alignment` (STAR + non-synced) → `is_read_only: false` (no false-positive). PATCH passes the gate and hits the pre-existing `result_pool_funding_alignment.uq_..._result_active` write-side bug noted in T-15.1's entry — gate-side verified.
- **Status:** [x] completed
- **Commit:** `d18691b1`

---

### [x] T-15.3 — Migration: rename `lever_code` → `sp_code`

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-073 (all 3 scenarios)
- **Files added:**
  - `server/researchindicators/src/db/migrations/1779190000013-renameLeverCodeToSpCodeOnAlignmentSp.ts` — drops `idx_..._lever`, `CHANGE COLUMN lever_code sp_code`, adds `idx_..._sp`. Symmetric DOWN.
- **Files modified:**
  - `server/researchindicators/src/domain/entities/bilateral/entities/result-pool-funding-alignment-sp.entity.ts` — property renamed `lever_code` → `sp_code`; `@Column({ name: 'sp_code' })`; `@Index('idx_..._sp', ['sp_code'])`.
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.ts` — SQL now selects `rpfas.sp_code AS lever_code` and joins/orders on `rpfas.sp_code`. The response-row interface and the `selected_levers[].lever_code` shape are unchanged — API contract preserved.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — the single write into `ResultPoolFundingAlignmentSp` now uses the renamed property: `sp_code: spCode` (was `lever_code: leverCode`).
- **Decisions made:**
  - **API contract preserved via SQL alias.** R-BIL-073 keeps `selected_levers[].lever_code` populated for FE back-compat. Aliasing in the repository SQL (`rpfas.sp_code AS lever_code`) localizes the rename — no DTO touched, no FE coordination needed.
  - **Indicator-mapping table NOT touched.** `result_pool_funding_indicator_mapping.lever_code` is a separate column with its own consumers (handlers, list endpoints, contribution flows). R-BIL-073 only mentions the alignment_sp table. Renaming the indicator-mapping table is a follow-up — should be a sibling task in a future wave so the existing handler chain isn't churned in T-15.3.
  - **Forward-only migration.** Pure column + index rename, no data movement. DOWN is symmetric and safe.
  - **The remaining `lever_code` refs in `src/domain/entities/bilateral/`** (22 lines) are all legitimate: DTO response fields kept for back-compat, the repository SQL alias output, and the indicator-mapping table's own column. Cross-checked the task's idealized grep note against R-BIL-073's actual scope — the note was overly broad; only the alignment_sp scope applies here.
- **Issues encountered:** none.
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral` → **33/33 passing**.
  - Lint clean.
  - **Migration round-trip** (dev DB):
    1. `npm run migration:dev:execute` → ✓ applied (3 statements: DROP idx, CHANGE column, ADD idx).
    2. Live GET `/api/v1/results/19792/pool-funding-alignment` → 200 with `selected_levers: [{lever_code: "SP01", lever_name: "SP01"}, {lever_code: "SP02", lever_name: "SP02"}]`. **Existing data preserved + API contract intact via SQL alias.**
    3. `npm run migration:revert` → ✓ column dropped, index renamed back, migrations row removed.
    4. `npm run migration:dev:execute` re-apply → ✓ idempotent.
  - **Write-path** indirect verification: typecheck + entity wiring + unit tests + GET round-trip prove the rename is structurally correct. End-to-end PATCH could not be exercised against result 19792 because of the pre-existing `result_pool_funding_alignment.uq_..._result_active` plain-unique bug (documented in T-15.1's execution entry — fires on the parent alignment row, before alignment_sp is touched). That's a separate follow-up; T-15.3 correctness is established by all the other checks.
- **Status:** [x] completed
- **Commit:** `2c650db4`

---

### [x] T-15.4 — Migration: add `icon_key` to catalog

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-074
- **Files added:**
  - `server/researchindicators/src/db/migrations/1779190000012-addIconKeyToScienceProgram.ts`
- **Files modified:**
  - `server/researchindicators/src/domain/tools/clarisa/entities/clarisa-science-programs/entities/clarisa-science-program.entity.ts` — adds `@Column('varchar', { length: 64, nullable: true, name: 'icon_key' }) icon_key?: string | null`.
  - `server/researchindicators/src/domain/entities/bilateral/dto/update-pool-funding-alignment.dto.ts` — `SelectedScienceProgramResponse` gains optional `icon_key` and `allocation`.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — drops the T-15.11 placeholder cast (`(fallback as { icon_key?: string | null } | undefined)?.icon_key`) now that the column exists on the entity; adds `icon_key` enrichment in `toSelectedSciencePrograms` so the existing alignment GET also carries it.
- **Decisions made:**
  - **Nullable column.** Migration is `NULL`-able and seed-fills `icon_key = official_code` in the same transaction. Keeps the catalog endpoint live during rollout (T-15.7) — environments that haven't applied this migration yet still respond 200, just without the `icon_key` field.
  - **Seed inline, not in a separate `seed-data` step.** All 13 catalog rows are seeded `official_code → icon_key` in the same UP block. Future branding splits (e.g. "SP09 needs a custom asset") are operator UPDATEs, not migration churn.
  - **Drop the v1 `reporting_enabled` + `prms_id`.** Per requirements doc §7 R-BIL-074 "Out of scope vs v1", those are no longer mirrored. Just the one column.
- **Issues encountered:** none.
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral src/domain/tools/clarisa` → **228/228 passing**. The existing T-15.11 spec keeps asserting `icon_key: null` because its catalog mock doesn't include the field — which is still correct: fallback returns `undefined` → coalesces to `null`.
  - Lint clean.
  - **Migration round-trip** (dev DB):
    1. `npm run migration:dev:execute` → ✓ applied, 13 rows updated.
    2. `npm run migration:revert` → ✓ column dropped, migrations row removed.
    3. `npm run migration:dev:execute` re-apply → ✓ idempotent.
  - **Live smoke (dev :3001):**
    1. `GET /api/tools/clarisa/science-programs` → 13/13 rows, `icon_key === official_code` for all (sample: `{official_code: "SP01", icon_key: "SP01", color: "#ef4444", ...}`).
    2. POST mapping `D527 → CLARISA project 1` → 201.
    3. `GET /api/v1/results/19792/pool-funding-alignment/science-programs` → SP09 + SP10 with `icon_key: "SP09"` / `"SP10"` (was `null` pre-T-15.4).
    4. Mapping deactivated as cleanup.
- **Status:** [x] completed
- **Commit:** `7696433b`

---

### [x] T-15.1 — Catalog-aware validation on PATCH alignment

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-070 (all 4 scenarios)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.normalizeLeverCodes.spec.ts` (focused-scope spec for T-15.1; full bilateral.service spec lands in T-15.6)
- **Files modified:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — `normalizeLeverCodes` extended to async, now takes `(dto, resultId, resultCode)`. When `has_contribution === true` and codes are present, it calls `this.getScienceProgramsForResult(resultId, resultCode)` (T-15.11), builds a `Set` from the response's `science_programs[].code`, and rejects any input not in that set. `updateAlignment` now `await`s the normalizer.
- **Decisions made:**
  - **Reuse `getScienceProgramsForResult` rather than re-implementing the chain.** The validator and the picker now agree on which codes are valid by construction — there's no second source-of-truth to drift.
  - **Structured payload in `BadRequestException`.** GlobalExceptions surfaces `exception.response.message` into the envelope's `errors` field. To get `errors.unknown_sp_codes` to the FE without changing the global filter, I throw `new BadRequestException({ message: { description: 'Unknown Science Program codes', unknown_sp_codes } })`. The envelope's top-level `description` stays `"BadRequestException"` (the spec idealized this as `"Unknown Science Program codes"`, but matching that exactly would require touching the global filter — out of T-15.1 scope; the human-readable text is preserved inside `errors.description`).
  - **`has_contribution === false` short-circuit kept first.** The validator returns `[]` immediately without calling `getScienceProgramsForResult`, so a `has_contribution: false` PATCH with stale codes still succeeds (R-BIL-014 behavior preserved).
  - **Unmapped result rejects any non-empty codes by design.** R-BIL-076 returns an empty `science_programs[]` when no mapping exists, so the validator's diff naturally classifies every input as unknown. Tested explicitly as scenario 4.
- **Issues encountered:**
  - Live smoke surfaced a **pre-existing schema bug unrelated to T-15.1**: `result_pool_funding_alignment` has a plain `UNIQUE INDEX uq_..._result_active(result_id, is_active)`. The constraint should have been partial-unique (only on `is_active=true`) — as it stands, a second deactivated row collides with the first. Visible only on the write path, AFTER my validator passes — so it incidentally proves R-BIL-070 scenarios 1 + 3 (validation passed; we got into the write). Captured as a follow-up; should be a sibling migration converting `uq_..._result_active` to the same STORED GENERATED column + UNIQUE pattern used by `bilateral_project_mapping` (D-PI-9).
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral` → **33/33 passing** (4 new T-15.1 + 8 existing T-15.11 + 21 existing T-15.14).
  - Lint `npx eslint --fix` → clean.
  - Nest boot clean; DI gate `/api/v2/results` → 200.
  - **Live end-to-end smoke against CSICAP (result 19792, AGRESSO `D527`, mapped to CLARISA project 1 with SP09 + SP10):**
    1. POST mapping `D527 → 1` → 201 ✓
    2. **Scenario 2** — PATCH `{has_contribution:true, sp_codes:["SP09","SP99"]}` → **400** with `errors.unknown_sp_codes: ["SP99"]` and `errors.description: "Unknown Science Program codes"` ✓
    3. **Scenario 1** — PATCH `{has_contribution:true, sp_codes:["SP09"]}` → validation passes (then hits pre-existing write-side schema bug → 500) ✓ validator-side
    4. **Scenario 4** — Deactivate mapping; PATCH `{has_contribution:true, sp_codes:["SP09"]}` against now-unmapped result → **400** with `errors.unknown_sp_codes: ["SP09"]` ✓
    5. **Scenario 3** — PATCH `{has_contribution:false, sp_codes:["SP99"]}` → validation skipped (then same write-side bug → 500) ✓ validator-side
    6. Cleanup: mapping `id=4` left deactivated for audit.
- **Status:** [x] completed
- **Commit:** `309d03fe`

---

## Pivot Record #2 — Endpoint URL path uses existing controller namespace

- **Task affected:** T-15.11 (also retroactively updates R-BIL-076 + R-BIL-077 + design.md §6.1–6.2 + architecture mermaid + frontend-handoff §4.6–4.7)
- **Date:** 2026-05-26
- **Discovery:** Design.md §6.1 idealized the endpoint URL as `/api/v1/results/:resultCode/bilateral/science-programs`. The existing `BilateralController` is mounted in `main.routes.ts` at `${RESULT_CODE}/pool-funding-alignment`, so adding a `@Get('science-programs')` handler lands at `/api/v1/results/:resultCode/pool-funding-alignment/science-programs`. Moving to a `/bilateral/...` namespace would require either (a) splitting the controller into two and mounting them at different routes, or (b) a major route refactor of existing endpoints (`pool-funding-alignment`, `pool-funding-alignment/indicators`).
- **Alternatives considered:**
  1. **Refactor: split the controller in two**, mount the new one at `bilateral/`. Pros: matches the idealized URL. Cons: doubles surface area; existing `pool-funding-alignment` controller stays; new `bilateral/` controller would have to re-import `ResultsUtil` for the same `:resultCode` token. Net negative.
  2. **Accept existing namespace** (`pool-funding-alignment/`). Pros: zero refactor; sibling to existing `pool-funding-alignment/indicators` which is also a picker source; consistent URL design. Cons: spec deviation.
- **Decision:** Option 2. The URL design intent in design.md was idealized without checking the existing controller path. The implementation should match the existing convention — `pool-funding-alignment/science-programs` reads naturally alongside `pool-funding-alignment/indicators` (both are picker sources for the same alignment workflow). Same applies to the future T-15.12 (`pool-funding-alignment/hlos-indicators`).
- **Spec impact:**
  - `requirements.md` — R-BIL-076 + R-BIL-077 paths updated.
  - `design.md` — §6.1 + §6.2 + architecture mermaid updated.
  - `tasks.md` — T-15.11 + T-15.12 path updated.
  - `frontend-handoff.md` — pending T-15.8 doc update will reflect the new path; STAR FE consumes `/api/v1/results/:resultCode/pool-funding-alignment/science-programs` (and similarly for HLOs in T-15.12).
- **Verification after pivot:** Live smoke against CSICAP green at the new path (see T-15.11 verification above).

---

## Pivot Record #1 — Admin REST surface URL path

- **Task affected:** T-15.14 (also retroactively updates R-BIL-080 + design.md §6.3–6.6 + architecture mermaid)
- **Date:** 2026-05-26
- **Discovery:** During the T-15.14 end-to-end smoke, the role-gated endpoints at `/api/admin/bilateral-project-mappings` returned `403 Forbidden` for every request — even with the local-dev SYSTEM_ADMIN bypass. Root cause: NestJS's `JwtMiddleware` exclude pattern `/admin(.*)` (in `src/app.module.ts`) is evaluated against the URL stripped of the global `/api/` prefix, so it matched the new admin REST endpoints AND the existing SSR admin pages. The bypass middleware never ran on our routes → `request.user` was undefined → `RolesGuard` returned 403.
- **Alternatives considered:**
  1. **Narrow the JWT exclude pattern** to explicitly list the SSR routes (`/admin`, `/admin/dashboard`, `/admin/users`, `/admin/settings`). Pros: keeps URL as spec'd. Cons: changes the security boundary; must audit every other `/api/admin/*` consumer.
  2. **Move the REST surface to `/api/bilateral-project-mappings`** (drop the `/admin` segment). Pros: lowest risk, no security boundary changes, role guard provides the actual gating. Cons: spec deviation (R-BIL-080 + design §6.3–6.6 + architecture mermaid).
- **Decision (operator-approved 2026-05-26):** Option 2. URL design is incidental to admin-only semantics; the role guard enforces the actual gating.
- **Spec impact:**
  - `requirements.md` — R-BIL-080 path updated + Pivot Record #1 note added.
  - `design.md` — §6.3–6.6 endpoint definitions, §3 architecture mermaid, §10.3–10.4 workflows all moved to `/api/bilateral-project-mappings`.
  - `tasks.md` — T-15.14 file-list entry updated; spec stays consistent.
  - `frontend-handoff.md` — pending T-15.8 doc update will reflect the new path (admin SSR page in T-15.15 will consume `/api/bilateral-project-mappings`, not `/api/admin/...`).
- **Verification after pivot:** All 6 smoke steps green at the new path (see T-15.14 verification above).

---

## Summary

Pending — spec in execution; see `tasks.md` for live task statuses.
