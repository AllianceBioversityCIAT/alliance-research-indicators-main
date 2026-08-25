# Execution Log — Changes / Executive Overview Grounded Context

## Document Control

- **Spec id:** 2026-08-executive-overview-grounded-context
- **Spec path:** docs/specs/changes/executive-overview-grounded-context
- **Approval mode:** gated (no proposal.md; owner approved execution verbally 2026-08-24 — "dale, ejecutemos el spec")
- **Leader session model:** Fable 5 (T1 registry maps `opus`; session model is a newer generation — registry floor satisfied, entry flagged for update at archive)
- **Rework ceiling:** 3 attempts/task
- **Started:** 2026-08-24

## Task Execution History

### Finding (pre-T-04): duplicate Executive Overview implementations — 2026-08-24

Reported by Implementer (T-04/05) before writing code; Leader verified against source:

- `components/executive-overview/executive-overview.component.*` renders unconditionally in the project-detail SHELL header (`project-detail.component.html:28`), from commit `5b506f42` (2026-08-23, deliberate branch decision superseding the old dashboard-tab section).
- The staging merge `46afb872` (2026-08-24) re-introduced the richer AC-1714 grounding block INSIDE the dashboard tab (spec target of this spec).
- Net: dashboard tab shows the overview twice; both fetch `fetchDocumentOverviewSummary` independently.

Adjudication: T-04/T-05 proceed on `project-dashboard.component.*` (the approved spec's target). Deduplication (which placement survives) is a spec gap — escalated to the owner as a decision; NOT minted as a task from an advisory. Pending user decision recorded below when made.

**Owner decision (2026-08-24):** Dashboard Act 1 survives; shell-header instance retired. Spec amended: R-EOC-009 added to requirements.md, T-08 added to tasks.md (serialized after T-04/T-05). Correction-closure sweep: spec folder greps for `executive-overview.component`/shell-header references — none existed prior to this amendment (spec never referenced the shell instance); no backward citations to repoint.

---

## T-01 — Server: `GET /agresso/contracts/:agreementId/clarisa-project` — PASS

- **Date:** 2026-08-24 · **Status:** PASS · **Attempts:** 1 · **Covers:** R-EOC-001 (AC.1–AC.5), NFR-2
- **Implementer:** akili-implementer (sonnet, effort medium) · **Reviewer:** akili-reviewer (opus, lens-checklist mode) — author ≠ auditor held.

**Files changed (attempt 1):** `dto/contract-clarisa-project.dto.ts` (new), `agresso-contract.service.ts` (+`findClarisaProjectByAgreementId`, moduleRef lazy resolve, degrade paths), `agresso-contract.controller.ts` (new GET route + Swagger), `agresso-contract.module.ts` (+ClarisaProjectsModule, +BilateralProjectMappingModule — one-directional, no cycle), `agresso-contract.service.spec.ts` (+7), `agresso-contract.controller.spec.ts` (+4), `test/agresso-contract-clarisa-project.integration-spec.ts` (new, K-021-scoped, 4 cases incl. non-SUE rethrow → 500).

**Implementer verification (observed):** targeted jest 70/70 PASS; integration 4/4 PASS; bare eslint 0 problems; `npm run build` green. **K-004 falsification:** degrade branch short-circuited (`if (false && ...)`) → unit AND integration went RED (integration: expected 200 got 503); reverted, green.

**Leader re-measurement:** full server suite 2540/2540 (340 suites). Coverage (`npx jest --coverage`): statements 85.38%, branches 74.85%, functions 85.01%, lines 85.53% — NFR-4 60% floor met, exit 0 (closes Reviewer advisory #2).

**Reviewer verdict:** STATUS: PASS. All 5 ACs + design §2.1/§3/§4/§10 met; independently verified beyond the diff: class-level Swagger decorators, module export/import graph (no cycle), entity column names (`findOne` order/where cannot throw `EntityPropertyNotFoundError`), CLARISA `ServiceUnavailableException` is the exact cold-cache type, route-shadowing checked against every `@Get` in the controller.

**Advisories (4R — recorded, never gate):**
1. *Risk/evidence accuracy:* integration-spec KZ-017 comment claimed module-graph wiring "proven by `npm run build`" — false (`nest build` compiles; DI resolves at bootstrap). **Closed by Leader before commit** (comment reworded to the Reviewer's suggested text; comment-only change, no behavior).
2. *Reliability/NFR-4:* coverage floor unmeasured at report time. **Closed by Leader** — measured above.
3. *Resilience:* `moduleRef.resolve()` returns the singleton only while `ClarisaProjectsService` has a static dependency tree; if it ever gains a scoped dep, `resolve()` silently hands back per-request instances with cold caches (CLARISA traffic multiplies, no error). `moduleRef.get(..., {strict:false})` would fail loudly instead. Pre-existing repo idiom (design §2.1 asked for it) — recorded, dies here.
4. *Observability:* `this.logger.warn` bypasses `LoggerUtil.formatMessage` (only `_warn`/`_error` apply it) — component tag inert; design §9 still satisfied (agreementId in message body). Recorded, dies here.
5. *Readability/API contract:* Swagger `@ApiResponse` description omits the ≤5-min staleness window (design §4/NFR-3). Recorded, dies here.

**KZ-017 declarations (what checks cannot reach):** unit specs ≠ route registration/envelope (integration covers via supertest); integration ≠ real DI boot (covered by module-graph read, NOT by build — see advisory #1); JWT/401 out of scope (jwr.middleware.spec.ts); repository SQL shape unasserted (TypeORM base untouched); NFR-3 TTL inherited from ClarisaProjectsService, not re-verified.

**Decisions:** moduleRef.resolve kept per design §2.1 literal instruction (matches existing OpenSearch idiom); Implementer judgment call recorded.

---

## T-04 + T-05 (batched) — rework loop in progress

**Batching adjudication:** T-04 AC.3 routes the long-text action to T-05's modal; separate landings would ship a dead trigger in the intermediate commit. Same files, strictly sequential — one Implementer run, one Reviewer audit covering both scopes.

### Attempt 1 — FAIL (2026-08-24)

- **Implementer (sonnet, medium):** threshold `isLongOverview` (>700 chars / >2 ¶), 75ch measure + leading-relaxed, permanent clamp for long, skeleton (role="status", reserved height), Retry with load-vs-generate branch, `executiveOverviewReader` modal (types + all-modals config + sibling app-modal, 70ch, sources chips, admin footer). Targeted jest 231/231; build green; spec type-check 938 < 945 baseline (0 in touched files); eslint clean; two K-004 red-first observations. Leader re-measured full client suite: 6852/6852.
- **Not Done/Assumptions adjudicated by Leader:** (1) duplicate shell-header overview → handled as T-08; (2) focus-return on shared host's X icon is a pre-existing app-wide gap (~10 modals) — AC.2 focus-return read as satisfied on feature-owned close paths, gap recorded; (3) provenance line → T-06 scope.
- **Reviewer (opus): STATUS: FAIL — 1 issue.** Esc cannot close the reader modal for non-admins: only Escape handler bound on a projected *descendant* div (`html:602`); shared host's `onKeydown` is Tab-trap only (`modal.component.ts:74-75`); for non-admins the projected content has zero focusables so `focusFirstElement()` falls through to `#modalRoot` (ancestor, tabindex=-1); keydown bubbles upward only → handler unreachable. Reachable path confirmed (non-admin + stored long overview; also admins after clicking paragraph text). Violates R-EOC-005 AC.2 ("closes with Esc"). Remediation: `@HostListener('document:keydown.escape')` gated on `isModalOpen('executiveOverviewReader')`; test must dispatch a real KeyboardEvent, not call the close method directly.
- **Advisories (recorded, never gate):** (a) two reader admin buttons omit cursor-pointer + focus-visible ring pair others carry (UA default outline still present — no AC violation); Tailwind preflight cursor default unresolved (no tailwind.config found from Reviewer's position); (b) R-EOC-008 AC.2 contrast has no measurable evidence in jsdom — claim limited to "reuses already-validated `--ac-*` tokens", recorded as gap not coverage; (c) empty `<header>` rendered when generated-at is null (`html:603-607`); (d) two modal-content tests assert against the unconditional stub — prove composition, not gating (open/close tests cover that).
- **Action:** verbatim Reviewer report passed to Implementer; attempt 2 dispatched, effort bumped medium→high; scope: issue 1 only.

### Attempt 2 — PASS (2026-08-24)

- **Implementer (sonnet, HIGH — bumped per rework rule), scope: Reviewer issue 1 only.** Descendant `(keydown.escape)` removed; `@HostListener('document:keydown.escape')` on the component gated on `isModalOpen('executiveOverviewReader')?.isOpen` → existing `closeExecutiveOverviewReader()`. Spec's allModalsServiceMock upgraded to track real per-modal open state; +2 tests (real bubbled KeyboardEvent from `document.body` with modal open as non-admin → closeModal called; Escape inert when closed).
- **K-004 red-first (verbatim):** before fix, new Escape test failed `Expected: "executiveOverviewReader" / Number of calls: 0` (event never reached descendant handler — confirms Reviewer's root cause). Green after fix.
- **Implementer verification:** targeted jest 172/172 (--coverage=false); build green (pre-existing warnings only); bare eslint 0; spec type-check 938 (=, <945 baseline, 2 pre-existing errors shifted to 575/1731).
- **Reviewer (opus): STATUS: PASS.** Verified: fix at right layer (document-level, insensitive to focus position); mock shape matches REAL `isModalOpen` contract (returns ModalConfig, `?.isOpen` correct — a boolean-returning real method would have made the test a false green; it is not); non-admin geometry exercised via real event from outside the projected div; no regression — all attempt-1-cleared items byte-identical; advisories NOT acted on (rework discipline held).
- **Leader re-measurement (after all workers reported):** full client suite 6854/6854 (319 suites).
- **Final status: T-04 PASS + T-05 PASS.** Requirements covered: R-EOC-004 (AC.1–5), R-EOC-005 (AC.1–3, with the shared-host X-icon focus-return gap recorded as pre-existing app-wide limitation per Leader adjudication), R-EOC-006 (AC.1–3), R-EOC-008 (AC.1, AC.3, AC.4; **AC.2 contrast carried as recorded gap** — jsdom measures no color; claim limited to reuse of already-validated `--ac-*` tokens; HITL/manual check owed at T-07).
- **Open advisories carried in the record (never tasks):** reader admin buttons missing cursor-pointer/focus-visible pair; empty `<header>` when generated-at null; stub-based content tests prove composition not gating.

---

## T-02 — Client: `GET_ContractClarisaProject` + `GetClarisaProjectService` — rework loop in progress

### Attempt 1 — FAIL (2026-08-24)

- **Implementer (sonnet, medium):** interface `ContractClarisaProject` (mirror del DTO field-for-field), `GetClarisaProjectService` (signals + in-flight dedupe + session memo + invalidate), `ApiService.GET_ContractClarisaProject`, dashboard effect wiring + TestBed mock. 17 service tests. Targeted jest 188/188; build green; bare eslint clean. **Deliberate deviation flagged:** memoize-on-null (unmapped/degraded = normal permanent state; re-fetch per re-entry would violate NFR-1).
- **Leader re-measurement:** full client suite 6870/6870 (320 suites); spec-project tsc 938 errors (unchanged; new spec contributes 0).
- **Reviewer (opus): STATUS: FAIL — 1 issue.** Adjudication first: memoize-on-null deviation **upheld** (design.md:51 binds structure, not memo policy; D-EOC-6 + NFR-1 support it). Issue: shared `data` signal + per-id memo with early return serves the WRONG contract's CLARISA record after back-navigation (A→B→A leaves `data()`=B while viewing A; exemplar's staleness was bounded by `project-detail.component.ts:220` ngOnDestroy invalidate, which the root-provided new service never gets). Downstream: T-03 would build A's AI summary from B's CLARISA data labeled "CLARISA (updated)". Violates R-EOC-001 ("record linked to MY contract"), design.md:51/:117. Remediation: Map<string, value> resolved-value cache + `data.set(cached)` on memo hit (also covers route-param reuse without destroy); discriminating A→B→A test with no second HTTP request.
- **Advisories (recorded, never gate):** (a) `clarisa_unavailable` degrade memoized for whole session — transient outage suppresses CLARISA grounding until reload; not an AC violation (no client AC distinguishes the two nulls) — candidate consideration for T-03/future; (b) two-ids test name claims independence it doesn't assert; (c) `agreementId` interpolated unescaped — matches sibling GET_ResultsCount, file internally inconsistent vs pool-funding-tag; theoretical; (d) doc drift: requirements AC.1 named `funder_institution_object`/`lead_institution_object` vs DTO/design `funder_institution`/`lead_institution` — **closed by Leader** (requirements.md corrected, sweep clean; root CLAUDE.md §5: fix the doc).
- **Action:** verbatim report to Implementer; attempt 2 dispatched, effort medium→high; scope: issue 1 only, in-service Map fix preferred.
