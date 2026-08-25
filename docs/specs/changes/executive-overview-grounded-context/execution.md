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
