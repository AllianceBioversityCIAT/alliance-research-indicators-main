# Requirements — Changes / Executive Overview Grounded Context

- **Module:** changes (cross-cutting: agresso + clarisa + project-dashboard client)
- **Spec id:** 2026-08-executive-overview-grounded-context
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Linked PRD section:** docs/prd.md — project detail & analytics goals; AI-assisted features
- **Linked tickets:** AC-1714 (upstream Executive Overview, merged from staging 2026-08-24)
- **Last updated:** 2026-08-24
- **Extends:** the staging AC-1714 Executive Overview feature (ported into the six-act dashboard in merge `46afb872`).

---

## 1. Context

The Executive Overview (merged from staging) generates a grounded AI summary per project, but today the AI microservice only sees (a) documents uploaded to the S3 bucket and (b) one free-text resource. It knows nothing about the structured project data STAR already has. Meanwhile the dashboard-narrative-pass work gave the client rich, cached project endpoints: `GET /api/agresso/contracts/:id/results/count` (full Agresso contract metadata + indicators) and `GET /api/agresso/contracts/reports/dashboard` (results summary, tops, geo scope, SP alignment).

**Data-source rule (verified in code, 2026-08-24):** for bilateral contracts that contribute to pooled funding, CLARISA holds richer, more current project info (`summary`, `description`, dates, `total_budget`, funder/lead institutions, Science-Program allocations). The bridge is the `bilateral_project_mapping` table (`agresso_agreement_id → clarisa_project_id`) + `ClarisaProjectsService` (5-min TTL cache). For unmapped contracts the only source is the weekly-synced `agresso_contracts` row. **No existing project-detail or dashboard endpoint merges CLARISA project info today** — the only CLARISA×Agresso merge lives in the admin mapping module.

⚠️ Polarity note: the `pooled_funding_contracts` table marks a contract as *being* pooled funding (disqualifies the bilateral tag). "Bilateral contributing to pool funding" is the `is_pool_funding_contributor` flag / the `bilateral_project_mapping` linkage — do not conflate them.

This spec also covers the UX placement pass of the Executive Overview inside the six-act dashboard (long-text disclosure, reading modal).

Not changing: the AI microservice itself (external Lambda, owned by the Executive Overview team), the grounding-docs upload flow, roles gating (admin-only setup), the 3-resource cap.

---

## 2. Requirement numbering

`R-EOC-<NNN>` — Executive Overview Context.

---

## 3. Functional requirements

### R-EOC-001 — Server: CLARISA project context for mapped bilateral contracts

- **As a** STAR user viewing a bilateral project dashboard
- **I want** the platform to expose the CLARISA-side project record linked to my Agresso contract
- **So that** downstream features (AI overview, dashboard header) can use the freshest project info when it exists

**Acceptance criteria**
1. New endpoint `GET /api/agresso/contracts/:agreementId/clarisa-project` returns the linked `ClarisaProject` fields (`id, short_name, full_name, summary, description, start_date, end_date, total_budget, annual, funder_institution_object, lead_institution_object, external_code, phase, science program allocations`) when a `bilateral_project_mapping` row exists for the contract.
2. When no mapping exists, the endpoint returns `data: null` with status 200 (not 404) — "no CLARISA record" is a normal state, not an error.
3. Response uses the standard `ServerResponseDto` envelope; endpoint requires JWT (no role restriction — read-only project info already visible to project viewers).
4. Data is served from `ClarisaProjectsService`'s existing 5-minute TTL cache; a cold-cache upstream failure degrades to `data: null` + a warning in `errors[]`, never a 5xx to the dashboard.
5. Swagger decorators present (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`).

### R-EOC-002 — Client: bounded project-context payload assembly

- **As a** STAR user generating (or auto-generating) an Executive Overview
- **I want** the generation request to carry a structured project-context digest built from data the dashboard already loaded
- **So that** the AI summary is grounded in current project facts, not only uploaded documents

**Acceptance criteria**
1. A pure builder (`buildProjectContext`) composes a plain-text digest from: Agresso detail (`GetProjectDetailService`), the CLARISA project block (R-EOC-001) when non-null, and the dashboard report (`GetContractDashboardService`: totals, results by status/year, top partners, geo scope summary, SP alignment counts).
2. **Source preference:** when the CLARISA block is present, CLARISA wins per overlapping field (description/summary, start/end dates, budget, funder, lead); Agresso fills the rest (agreement id, funding type, grant amounts USD, donor reference, division/unit, SDGs, CGIAR entities). The digest labels each section with its source ("CLARISA (updated)" / "Agresso").
3. The digest is bounded to ≤ 8,000 characters — truncated at section boundaries, never mid-sentence — so it can never crowd out the user's 20,000-char text resource.
4. The builder is deterministic and covered by unit tests (empty inputs, CLARISA-only overlap, Agresso-only, truncation).

### R-EOC-003 — Client: send context on every generation, backward compatible

- **As a** platform maintainer
- **I want** the context sent as a NEW optional field of the document-overview request
- **So that** the AI service can adopt it without breaking either side

**Acceptance criteria**
1. `DocumentOverviewRequest` gains optional `project_context?: string`; `DocumentOverviewService.generateDocumentOverview` accepts and forwards it.
2. Both call sites send it: the auto-baseline generation on dashboard entry and the manual "Regenerate summary".
3. The user's free-text resource (`text`) is untouched — never concatenated with the context, never overwritten by it.
4. If context assembly fails or the dashboard data hasn't loaded, generation proceeds WITHOUT the field (current behavior) — context is best-effort, never blocking.
5. Coordination with the AI-service team on consuming `project_context` is tracked as an open question; until then the field is inert on their side and harmless.

### R-EOC-004 — UX: overview card placement and reading-width clamp

- **As a** STAR user scanning the dashboard
- **I want** the Executive Overview to read as the Act-1 identity summary — scannable, not a wall of text
- **So that** I get the project's "what is this" in seconds without losing the narrative flow

**Acceptance criteria**
1. The card stays in Act 1 (between the hero/status region and the caveat banner), keeping the reserved `staggerMs.executiveOverview` entry delay.
2. Body text is constrained to a reading measure (~`75ch` / `max-w-prose`) — never full dashboard width — with `leading-relaxed` line height.
3. Collapsed state clamps to 4 lines. The full text NEVER renders inline beyond a threshold: if the overview exceeds the threshold ((> 700 characters or > 2 paragraphs), the expand action opens the reading modal (R-EOC-005) instead of expanding inline.
4. At or under the threshold, "View more / View less" expands inline (current behavior).
5. Metadata row (generated date, "Grounded AI Summary" chip, sources) stays visible in both states.

### R-EOC-005 — UX: reading modal for long overviews

- **As a** STAR user who wants the full overview
- **I want** a dedicated reading modal
- **So that** long AI text is comfortable to read and doesn't push the dashboard's acts off-screen

**Acceptance criteria**
1. New modal (via `AllModalsService`, e.g. `executiveOverviewReader`) rendering: title, generated-at, full paragraphs at reading width, the grounding sources list (`overviewSourceDocuments` file names + whether project data grounded it), and — for admins — shortcuts to "Grounding & Setup" and "Regenerate".
2. Modal is scrollable, max height bounded, closes with Esc and the standard modal close affordance; focus moves into the modal on open and returns to the trigger on close.
3. Trigger label is explicit ("View full overview"), with `aria-haspopup="dialog"`.

### R-EOC-006 — States: loading, error, empty (no layout jump)

- **As a** STAR user on a slow connection
- **I want** stable loading and recoverable error states
- **So that** the Act-1 region doesn't jump or dead-end

**Acceptance criteria**
1. Loading renders a text skeleton (3–4 bars at reading width) reserving approximately the collapsed card height — replacing the bare "Generating grounded summary..." line.
2. Error state offers a Retry action (re-runs `loadExecutiveOverviewSummary`/`generateExecutiveOverview` as appropriate) and never hides the setup entry point for admins.
3. Non-admins with no stored overview see nothing (current rule preserved).

### R-EOC-007 — Transparency: grounding provenance

- **As a** reader of an AI-generated summary
- **I want** to see what grounded it
- **So that** I can calibrate trust (C-4 / responsible-AI expectations)

**Acceptance criteria**
1. The card footer states the grounding basis: N document(s), text resource (if any), and "project data" once R-EOC-003 ships (source: CLARISA-updated vs Agresso, from the R-EOC-002 assembly).
2. The existing caveat banner sentence about AI features remains adjacent (Act 1 already carries it).

### R-EOC-008 — Tokens, dark mode, accessibility

- **As a** user of either theme, possibly with assistive tech
- **I want** the overview UI to meet the branch's token and a11y bar
- **So that** WCAG 2.1 AA (C-4) holds on the changed screen

**Acceptance criteria**
1. No hex literals in component code; only `var(--ac-*)` tokens / token utility classes (the merge already tokenized the ported markup — keep it that way).
2. Text contrast ≥ 4.5:1 in both themes for body and metadata text.
3. All interactive elements: visible focus ring, `cursor-pointer`, ≥ 44px touch target on mobile, aria labels on icon-only buttons (setup cog already has one).
4. `prefers-reduced-motion` respected (no new animation beyond the existing stagger, which already honors it).

---

## 4. Non-functional requirements

- **NFR-1 (performance):** context assembly reuses signals already in memory — zero additional HTTP calls on the client beyond R-EOC-001's single GET (fired once per contract entry, cacheable alongside the other dashboard loads).
- **NFR-2 (resilience):** the dashboard never blocks or errors because CLARISA is down (R-EOC-001 AC.4, R-EOC-003 AC.4).
- **NFR-3 (freshness):** CLARISA data may be up to 5 minutes stale (service TTL) — acceptable; any verification step in tasks MUST state the TTL window (K-016).
- **NFR-4 (test floors):** client coverage floors (40/20/45/30) and server 60% hold on touched files.

---

## 5. Out of scope

- Changing the AI microservice prompt/behavior (owned by the Executive Overview team; we only extend the request contract).
- Streaming generation UX.
- Chart/graph refinements (explicitly deferred by the owner to the next spec).
- Any write path to `bilateral_project_mapping` or `pooled_funding_contracts`.

---

## 6. Open questions

- **OQ-1:** AI-service team must confirm the `project_context` field name and that unknown fields are ignored (backward compat). Owner to raise with the AC-1714 team.
- **OQ-2:** Should the CLARISA block also feed the Act-1 hero chips (e.g. budget, funder) beyond the AI context? Deferred — separate UX decision.
- **OQ-3:** Reading-modal threshold (700 chars / 2 paragraphs) is a starting value — HITL may tune after seeing real summaries.
