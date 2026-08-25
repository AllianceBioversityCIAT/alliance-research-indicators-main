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

### Attempt 2 — PASS (2026-08-24)

- **Implementer (sonnet, HIGH), scope: issue 1 only.** `Set` → `resolvedByContractId: Map<string, ContractClarisaProject | null>`; memo hit re-seats `data` from the map before returning; fetch stores the same value it publishes; `invalidate` both arities intact. +1 discriminating test A→B→A (`httpMock.verify()` proves no re-fetch).
- **K-004 red-first (verbatim):** vs old Set/early-return: `Expected: "CL-A1" / Received: "CL-B2"`. Green after fix.
- **Reviewer (opus): STATUS: PASS.** Verified the load-bearing semantics: guard is `has()` not `get()`-truthiness (a truthiness guard would have silently undone NFR-1 for unmapped contracts); `?? null` does type work not control-flow work; memo and signal cannot diverge (same value written to both); transport failure still writes no memo; route-param-reuse covered (lookup inside `load()`, lifecycle-independent). No regression (interface/ApiService/wiring byte-identical to attempt 1); rework discipline held.
- **Leader re-measurement:** full client suite 6871/6871 (delta = exactly the one new test).
- **Final status: T-02 PASS.** Covers R-EOC-001 (client side), NFR-1.
- **Advisories (recorded, never tasks):** (a) NEW — concurrent-navigation race: in-flight path publishes unconditionally, last-resolver-wins on the shared `data` signal (A resolves after B → B's dashboard holds A's record, nothing self-corrects). Same shape exists in `GetProjectDetailService` and `GetContractDashboardService`; Reviewer's view: fixing one of three is worse than none — if wanted, it is its own future proposal across all three (`latestRequestedContractId` guard before each publish). (b) carried: session-long memo of `clarisa_unavailable` degrade (two-line skip-memo-on-degrade possible); (c) carried: unescaped `agreementId` interpolation (matches sibling; theoretical).
- **Unmeasured at this task (declared):** coverage floors (targeted runs; T-07 carries them); spec-project tsc for attempt 2 delta (one test from existing constructs; 938 baseline not plausibly moved — unmeasured, not measured-clean).

---

## T-03 — `buildProjectContext` util + generation wiring — rework loop in progress

### Attempt 1 — FAIL by panel (2026-08-24)

- **Implementer (sonnet, xhigh):** pure util (section order, per-field CLARISA `??` chains, provenance return, 8k bound with whole-section drops + sentence-boundary fallback), `project_context?` on request interface, service 3rd param (defensive 8k re-cap, omit-when-empty), both call sites wired via try/catch helper. Targeted jest 197/197; build green; eslint clean; spec-tsc 938 (= pre-T-03 measured baseline: Leader's T-02-attempt-1 measurement and T-04/05 worker both read 938 — the guide's 945 is the dated documented figure). Two K-004 reds verbatim (bound disabled → 16740/11106; try/catch removed → 0 calls). Leader full suite: 6886/6886.
- **Review mode: parallel lens panel (xhigh).** correctness+reliability lens: **PASS** (verified per-FIELD preference is real; [PROJECT] undropable; both call sites; D-EOC-2 on product; adjudicated title-preference judgment call NOT a violation). risk+resilience lens: **FAIL — 1 issue.**
- **Panel FAIL issue (Leader adjudicated IN-SCOPE before consuming attempt):** cross-contract data mixing — `buildProjectContextText` reads `contractDashboard.data()` / `clarisaProject.data()` unkeyed; on A→B navigation both hold A's payload while B's fetches are in flight; if the Lambda summary GET wins the race against the dashboard aggregate, B's auto-baseline digest carries A's analytics/CLARISA block and is PERSISTED server-side under B's folder. Violates R-EOC-002 AC.1 + D-EOC-5 (§5.2 sanctions incompleteness, not another contract's content). Same hazard class as T-02's memo bug, in-flight layer; T-03 is the first consequential consumer. Remediation: thread projectId, contract-match each input (`loadedContractId()` gate; add the missing signal to GetClarisaProjectService), mismatched input → null (builder already degrades); discriminating spec case A-data-while-generating-B.
- **Effort deviation recorded:** rework rule says xhigh→max, but tier↔effort rule forbids max on T2 and tier escalation would collapse author≠auditor (auditor is opus). Kept xhigh with surgical remediation in the brief.
- **Advisories (both lenses, recorded, never gate):** (a) CONVERGENT both lenses — `provenance.projectSource` derives from CLARISA *presence*, not from a CLARISA field having actually won/been emitted; two mislabel shapes (sparse CLARISA row → "CLARISA (updated)" over all-Agresso body; dashboard-only digest → 'agresso' claimed with zero project fields). **Carried into T-06's brief as context — R-EOC-007 AC.1's truthful-label requirement makes computing this correctly T-06's own scope.** (b) empty-string CLARISA fields defeat `??` fallback (line vanishes / `Dates:  to X`); suggested firstNonEmpty helper. (c) CLARISA budget emitted without currency unit vs Agresso "USD" — mixed-unit digest invites LLM invention. (d) auto-baseline race makes CLARISA-preference a coin flip on entry (design-sanctioned §5.2; owner decision if it should await). (e) title chain prefers CLARISA short_name over Agresso full name. (f) shell-header component still regenerates ungrounded while it exists — **argues for T-08 before T-06 (Leader: reordered, T-08 next after T-03).** (g) Lambda echoing project_context into response.text would corrupt the user text resource via applyDocumentOverviewResponse — OQ-1 must stay blocking before production. (h) abbreviation cuts ("U.S.") pass the sentence-boundary regex; geo line emits superset of design's key list; donor dropped when CLARISA funder wins.
- **Cleared with scope declared:** data exposure clean (main_contacts/emails structurally available and NOT taken; server-side payload content unreachable from client diff); jwt.interceptor safe (documentOverviewDomain branch only sets headers; FormData mutation gated on textMiningDomain — K-005 unchanged); double 8k bound consistent.
- **Action:** verbatim FAIL issue to Implementer; attempt 2 dispatched.

### Attempt 2 — PASS (2026-08-24)

- **Implementer (sonnet, xhigh), scope: panel issue 1 only.** `GetClarisaProjectService.loadedContractId` signal (set only on successful resolution incl. legitimate null; never on transport failure); `buildProjectContextText(projectId)` gates dashboard + CLARISA inputs on `loadedContractId() === projectId` (the same id as the POST's project_folder — the right key); mismatch → null → builder degrades. +4 service tests, +2 component mismatch tests.
- **K-004 red-first (verbatim):** unkeyed code restored → both new tests red for the exact bug class (`"Stale Contract A Partner"` in REACH; `[PROJECT — source: CLARISA (updated)] Title: Stale Contract A CLARISA Title` where Agresso expected). Gated → 177/177.
- **Reviewer (risk lens, opus): STATUS: PASS.** Verified no false-positive window (data/id sets adjacent + synchronous on success paths; failures leave stale id paired with null data → degrades not corrupts). **Residual ruling: `this.project()` gate NOT required in T-03** — in-flight window structurally absent (component-scoped, null during flight); memo-hit window closed by `project-detail.component.ts` ngOnDestroy invalidate; requiring the GetProjectDetailService change would ripple into 3 components/4 invocations for no reachable defect — "a spec of its own". Follow-up wording recorded: the safety is load-bearing on a REMOTE lifecycle hook — a `loadedContractId` on GetProjectDetailService would make it local. No regression to correctness-lens cleared items (util byte-identical; service untouched; D-EOC-2 intact).
- **Leader re-measurement:** full client suite 6892/6892 (321 suites).
- **Final status: T-03 PASS (panel: corr PASS attempt 1, risk PASS attempt 2).** Covers R-EOC-002 (AC.1–4), R-EOC-003 (AC.1–5, OQ-1 noted in code).
- **New advisory (recorded):** dashboard-side gate has no positive component-level assertion (mismatch asserts absence; presence-on-match only covered CLARISA-side) — an always-false dashboard gate would pass the suite (KZ-001 shape). **Leader action: T-07's manual pass MUST confirm a live digest for a mapped contract contains [RESULTS ANALYTICS]/[REACH] — runtime discrimination evidence in T-07's existing scope.** Carried advisories from attempt 1 remain as recorded there; spec-tsc 938 baseline provenance already named in the attempt-1 entry.
- **Follow-up candidates ledger (never tasks in this spec):** (1) keyed-signal guard unified across GetProjectDetailService/GetContractDashboardService/GetClarisaProjectService + last-writer-wins publish guard (merges T-02 adv. (a) + T-03 residual); (2) firstNonEmpty per-field fallback vs '' CLARISA values; (3) provenance-from-fields-used (T-06 handles the rendering side within its own AC).

---

## T-08 — Deduplicate: retire shell-header Executive Overview — PASS

- **Date:** 2026-08-24 · **Status:** PASS · **Attempts:** 1 · **Covers:** R-EOC-009 (AC.1–3)
- **Implementer (sonnet, low):** deleted `components/executive-overview/` (3 files); removed import + imports-array entry + template block from `project-detail.component.{ts,html}`. Greps (totals-first, K-014): 3 patterns × 0 hits across client src; `fetchDocumentOverviewSummary` → exactly the 4 expected files. Route-scoped jest 343/343 (11 suites — the deleted spec no longer discovered); build green; bare eslint clean; porcelain 3 D + 2 M only.
- **Reviewer (opus): STATUS: PASS.** Re-ran all greps unfiltered itself. Verified: no SCSS/route/lazy-load references; single component-level DocumentOverviewService injection (dashboard); the 2 remaining fetch call sites are entry-load + explicit admin modal refresh (no double automatic fetch); no orphaned exports (all interface helpers still imported by the dashboard); shell `contractId` signal still live via 9 other uses; the deleted spec's 37 behaviors have counterparts in the dashboard spec — duplicate-coverage removal, not coverage loss.
- **Leader re-measurement:** full client suite 6855/6855 (320 suites; −37 tests/−1 suite = exactly the deleted duplicate spec).
- **Advisory (recorded):** user-visible behavior change beyond dedup — the results tab now shows NO Executive Overview (the shell instance rendered on both tabs). This is the intended reading of R-EOC-009 AC.2 per the owner decision of 2026-08-24; recorded here so it is not later rediscovered as a regression.

---

## T-06 — Provenance footer — PASS

- **Date:** 2026-08-24 · **Status:** PASS · **Attempts:** 1 · **Covers:** R-EOC-007 (AC.1–2) + provenance-computation correction (Leader scope adjudication: both T-03 lens reviewers' convergent finding; truthful-label requirement of AC.1)
- **Implementer (sonnet, medium):** util `projectSource` → 'clarisa'|'agresso'|'none' derived from fields ACTUALLY emitted (per-field `usedClarisaField` tracking; 'none' when no [PROJECT] section); digest text/sections/bounds byte-unchanged. Component: `executiveOverviewProjectProvenance` signal set only right after a same-session generation (BOTH call sites), `applyDocumentOverviewResponse` resets to null unconditionally; footer computed with independent clauses, null → static fallback. Rendered in card + reader modal. 6 new tests (KZ-015 transition on rendered DOM). K-004 reds verbatim: `Expected "none"/Received "agresso"` and `Expected "agresso"/Received "clarisa"` — the two mislabel shapes, red for the real reason.
- **Reviewer (opus): STATUS: PASS.** Verified truthfulness on every reachable path (docs clause reads `overviewSourceDocuments` not `groundedDocuments` — upload-without-regenerate cannot over-claim; error paths leave no stale claim; auto-baseline not missed); per-field guards traced incl. the non-obvious budget branch; empty-string CLARISA cannot false-positive the flag; `projectSource` union widening safe (no other consumer, grep 13 hits all in-patch); tokens only.
- **Leader measurements:** targeted 192/192; build green; spec-tsc 938 = baseline. Full-suite note: checkout shared with a concurrent foreign session (chart-explainers) — 6873/6873 at 322 suites INCLUDES its 2 suites; this task's green claim rests on targeted runs + prior clean 6855 baseline + build. T-06 commit made with pathspec-only semantics to exclude foreign staged files.
- **Advisories (recorded, never gate):** (a) "text resource" clause over-claims after save-without-regenerate (AC.1 reads as presence; the binding truthfulness rule named only project-data — recorded; comment at ts:1279 inaccurate for this clause); (b) project-data claim evaporates on opening the setup modal (fetch+apply resets — under-claim direction, visible inconsistency); (c) single boolean over mixed-source section labels "CLARISA" when ≥1 field was CLARISA (matches AC.1's binary wording); (d) footer contrast inherited-by-class-reuse is an argument, not a measurement — carried to T-07's manual pass with the existing AC.2 gap. (e) Evidence note: constitutional 945 spec-tsc baseline is stale for this branch (real: 938) — correct the child guide at archive.
