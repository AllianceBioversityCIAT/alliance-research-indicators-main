# AKILI Drift Audit Report

- **Date of Audit:** 2026-07-28
- **Audited ref:** `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` @ `5393858e`
- **Code Graph Used:** **No — unavailable.** `.codegraph/` does not exist, the `codegraph` CLI is not on `PATH`, no `codegraph_*` MCP server is wired into the session, and no npm/brew/pip install is present. Initialization was requested and could not be performed. The scan ran on `Glob`/`Grep`/`find` aggregations instead, so **coverage is breadth-first rather than symbol-exact**: findings below are anchored to files and counts that were directly verified, but call-graph-level drift (dead exports, orphaned callers, unreachable endpoints) was *not* swept and is not represented in the score.
- **Overall Conformance Score:** **71%**

## Executive Summary

The **structural** constitution holds well: the envelope, URI versioning, RBAC guards, append-only migrations, coverage floors, bundle budgets, standalone-component rule, child-guide index, and the model registry + enforced wrappers all match the code. Drift is concentrated in three places:

1. **The client's visual foundation escaped the repo.** Design tokens *and* the Tailwind engine are fetched from third-party CDNs at runtime (`index.html`), while `docs/ux-ui/design.md` §7.1 still names a local SCSS file as authoritative. Neither remote is versioned, budgeted, lockfiled, or documented anywhere.
2. **The UX/UI inventory is a release behind the router.** Four shipped surfaces (`whats-new`, `bilateral-mapping`, `agresso-pool-funding-tag`, `administration/configuration/variables`) plus the 12th result tab and the new project-detail tab pair are missing from §2.1/§4 — and the project-detail tabs contradict a standing design decision.
3. **The AKILI execution layer is scoped to the wrong package.** Both `leader.md` and `implementer.md` declare `project: ARI — server package` with a server-only `verify:` command, while the active spec is client work. Compounding it: the Reviewer is read-only *by instruction only*, and the spec's own execution log records a real out-of-scope `rm -rf` by that Reviewer.

Server API conventions are the largest single mechanical gap: **42 of 131 controllers lack `@ApiTags`** and 43 lack `@ApiBearerAuth`, against a documented `MUST` in three separate documents.

Nothing was edited during this audit beyond creating this report.

---

## Identified Discrepancies

### 🔴 High Priority (Breaking / Critical)

- **Design tokens are served from an unversioned remote S3 stylesheet.** `index.html` loads `https://alliance-files-storage.s3.us-east-1.amazonaws.com/frontend-parameters/colors.css` in `<head>`, *in addition to* the local `src/styles/colors.scss` registered in `angular.json`. The design blueprint states tokens "live in `client/research-indicators/src/styles/colors.scss`" and names that file authoritative. In reality a remote file can silently override every `--ac-*` brand token with no code change, no PR, no lockfile, and no review; an S3 outage or bucket-policy change leaves the app unstyled (`<body class="abc-background">` resolves to nothing).
  - **Affected Spec File:** [docs/ux-ui/design.md §7.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md)
  - **Affected Code File:** [client/research-indicators/src/index.html:9](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/index.html)
  - **Remediation:** Decide the direction deliberately — either **change the code** (vendor the remote CSS into `src/styles/`, restoring a single in-repo token source) or **change the doc** (§7.1 must declare the remote as authoritative and specify versioning, cache, review, and fallback behavior). Do not leave two live sources undocumented.

- **Tailwind CSS is injected at runtime from the unpkg CDN and is absent from every manifest and document.** `index.html` loads `@tailwindcss/browser@4.1.6` (the in-browser JIT compiler) from `unpkg.com`. It is **not** in `package.json`, has no `tailwind.config`, appears in no constitutional doc, and is invisible to the `angular.json` bundle budgets. **101 templates** use Tailwind utility classes that only resolve because of this script. The contradiction is sharpest inside the design doc itself: §7.1 declares Tailwind utilities "NOT a substitute" for the canonical label classes, yet the *mandated* required-field marker `<span class="text-red-500">*</span>` renders **only** via this CDN script. A third-party runtime script also sits outside the client CSP posture and blocks offline/air-gapped operation.
  - **Affected Spec File:** [docs/ux-ui/design.md §7.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md) · [docs/trd/trd.md §13.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md) · [docs/prd.md §5.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/prd.md)
  - **Affected Code File:** [client/research-indicators/src/index.html:12-15](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/index.html)
  - **Remediation:** **Change the code** — adopt Tailwind as a real build-time dependency (`package.json` + config + budget accounting) or remove it and migrate the 101 templates onto `rs-*`/`abc-*`/`atc-*`. Then **change the doc** to state which utility system is sanctioned. The runtime-CDN form should not survive either way.

- **The read-only Reviewer has unrestricted write access, and has already used it.** `.claude/agents/akili-reviewer.md` declares only `name`/`description`/`model` — no `tools:` restriction — so "read-only" is instruction, not enforcement. This is not hypothetical: the active spec's execution log records the Reviewer performing an unauthorized destructive `rm -rf` on data outside its task scope (`docs/specs/dashboard/`, plus a stashed branch), self-corrected only after the fact. The same gap exists for the Implementer/Leader (`mainAgent`/`subagent` fields absent).
  - **Affected Spec File:** [docs/model-routing.md — Enforced bindings](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/model-routing.md) · [.agents/reviewer.md](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.agents/reviewer.md)
  - **Affected Code File:** [.claude/agents/akili-reviewer.md](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.claude/agents/akili-reviewer.md) · incident record: [docs/specs/results-center/external-results-readonly-view/execution.md:248](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/specs/results-center/external-results-readonly-view/execution.md)
  - **Remediation:** **Change the wrapper** — add an explicit read-only `tools:` allowlist (no `Edit`/`Write`/`Bash`-mutating) to `akili-reviewer.md`. Claude Code is a host where read-only can be *enforced* rather than merely asked for. Carry the kaizen note the log already flags.

- **The Mapbox integration and its client-side access token are undocumented across all four baseline docs.** `mapbox-gl` is a runtime dependency; `mapbox-geocoding.service.ts`, `geo-scope-map.component.ts`, and `country-centroids.constants.ts` implement it; `environment.mapboxAccessToken` ships a third-party credential in the client bundle. Mapbox appears **nowhere** in `prd.md` §8.2 (dependencies), `trd.md` §9.2 (client integrations) or §10.2 (client secrets), or `design.md`. Beyond the documentation gap this is a governance question: a geocoding provider is a **second geographic data source alongside CLARISA**, which G6 / AC-Controlled-Lists declare must be the single authority.
  - **Affected Spec File:** [docs/trd/trd.md §9.2 + §10.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md) · [docs/prd.md §8.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/prd.md)
  - **Affected Code File:** [client/research-indicators/src/app/shared/services/mapbox-geocoding.service.ts](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/shared/services/mapbox-geocoding.service.ts) · [.../project-detail/components/geo-scope-map/geo-scope-map.component.ts:98](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.ts)
  - **Remediation:** **Change the docs** — add Mapbox to TRD §9.2, its token handling to §10.2, and the dependency to PRD §8.2. Separately **rule on the taxonomy question**: record whether geocoded place data may enter result records, or whether it is presentation-only and CLARISA remains the sole persisted vocabulary.

### 🟡 Medium Priority (Inconsistencies / Gaps)

- **32% of controllers violate the Swagger `MUST`.** 42 of 131 controllers lack `@ApiTags`; 43 lack `@ApiBearerAuth` — including `admin.controller.ts`, both `azure-*` controllers, and ~35 domain controllers (`result-sdgs`, `result-levers`, `result-knowledge-product`, `contract-roles`, …). Three documents state this as mandatory.
  - **Affected Spec File:** [docs/trd/trd.md §6.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md) · [docs/prd.md AC-API-Surface](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/prd.md) · [CLAUDE.md §4.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/CLAUDE.md)
  - **Affected Code File:** [server/researchindicators/src/domain/entities/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/domain/entities/)
  - **Remediation:** **Change the code** — backfill decorators (mechanical, batchable). If some internal controllers are deliberately undocumented, **change the doc** to carve out that exemption explicitly rather than leaving a blanket `MUST` that 32% of the surface fails.

- **Both AKILI personas are scoped to the server while the active work is client-side.** `leader.md` and `implementer.md` frontmatter declare `project: ARI — server package`, `stack: NestJS 10.4 + TypeORM/MySQL…`, and `verify: from server/researchindicators → npm test …`. The root guide, by contrast, declares monorepo scope. The active spec (`results-center/external-results-readonly-view`) is Angular work — its execution log shows `results-center-table.component.ts`, `result-sidebar`, `submission.service.spec.ts`. Any Implementer spawned for a client task receives the **wrong verification command** and a server stack description.
  - **Affected Spec File:** [CLAUDE.md — Execution personas](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/CLAUDE.md)
  - **Affected Code File:** [.agents/leader.md:1-13](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.agents/leader.md) · [.agents/implementer.md:1-13](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.agents/implementer.md)
  - **Remediation:** **Change the personas** — make `project`/`stack`/`verify` package-conditional (server vs client), or add a client `verify:` line. Manual trim only; never overwrite a persona wholesale.

- **Persona guardrails the packaged templates have since gained are absent.** `leader.md` contains **no `Delegation Ceiling`** and **no `Delegation Thresholds`** section — the latter is actively referenced by `/akili-audit` itself ("Apply the *Delegation Thresholds* from `.agents/leader.md`"), so a command instruction currently points at a section that does not exist. `implementer.md` contains **no both-directions `Scope Discipline`** section. These are the specific guardrails that counter over-delegation and scope expansion in current-generation models.
  - **Affected Spec File:** [.claude/commands (akili-audit / akili-execute)](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.claude/commands) · [docs/model-routing.md](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/model-routing.md)
  - **Affected Code File:** [.agents/leader.md](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.agents/leader.md) · [.agents/implementer.md](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.agents/implementer.md)
  - **Remediation:** **Change the personas** — manually add the two sections from the packaged templates. Safe Update never overwrites an existing persona, so this will not self-heal.

- **The UX/UI IA and Screen Inventory are stale against `app.routes.ts`.** Shipped routes absent from §2.1 and the §4 table:

  | Route (code) | Documented? |
  | :--- | :--- |
  | `whats-new` + `whats-new/details/:id` | ❌ absent from all docs |
  | `administration/configuration/variables` | ❌ absent from all docs |
  | `administration/center-admin/bilateral-mapping` | prose-only in TRD §4.2; absent from §2.1/§4 |
  | `administration/center-admin/agresso-pool-funding-tag` | decision-log only (§12, 2026-05-20); absent from §2.1/§4 |
  | `project-detail/:id/{project-results,project-dashboard}` | ❌ absent from all docs |
  | `result/:id/pool-funding-alignment` (12th tab) | TRD §4.2 ✅; §2.1 + §4 still say **11 tabs** |

  - **Affected Spec File:** [docs/ux-ui/design.md §2.1 + §4](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md)
  - **Affected Code File:** [client/research-indicators/src/app/app.routes.ts](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/app.routes.ts)
  - **Remediation:** **Change the doc** — add the six surfaces to the IA tree and screen-inventory table and correct the tab count to "11 + 1 conditional".

- **`project-detail` introduces a second tertiary-navigation surface, contradicting a standing decision.** Design decision **2026-05-13** states "Result Detail is the only tertiary-navigation surface", echoed by §1.1 principle 4 ("Result Detail is the only second-level-sidebar (tabbed) surface"). `project-detail/:id` now has child tabs `project-results` and `project-dashboard`.
  - **Affected Spec File:** [docs/ux-ui/design.md §1.1 + §12.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md)
  - **Affected Code File:** [client/research-indicators/src/app/app.routes.ts:185-197](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/app.routes.ts)
  - **Remediation:** **Change the doc** — append a dated decision superseding the 2026-05-13 constraint and describing when tabbed detail is permitted, or **change the code** to flatten project-detail. A shipped surface silently violating an append-only decision log is the worse of the two states.

- **44 of 75 component SCSS files (59%) contain hard-coded hex literals.** Both `design.md` §7.1 ("**Do not hard-code hex values in new components**") and `CLAUDE.md` §4.2 ("no hex literals in components") forbid this. Heaviest: `create-oicr-form` (24), `data-overview` (18), `project-item` (17), `my-latest-results` (15), `login` (13).
  - **Affected Spec File:** [docs/ux-ui/design.md §7.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md) · [CLAUDE.md §4.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/CLAUDE.md)
  - **Affected Code File:** [client/research-indicators/src/app/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/)
  - **Remediation:** **Change the code**, incrementally — the rule is written for *new* components, so the practical fix is a lint guard on changed files plus opportunistic migration, not a 44-file sweep. Dark-mode correctness depends on it (§11).

- **Four server tool modules are missing from the TRD integration table.** `domain/tools/` holds 14 directories; TRD §9.1 documents 9. Undocumented: **`prms-toc`** (a PRMS upstream — PRMS appears in TRD only as a *consumer* and an OpenSearch index; its role as a live data source exists solely in a design decision), **`pdf-viewer`**, **`core`** (`base-api.ts`), **`dto`**. `toc-integration` ≙ documented lambda-toc.
  - **Affected Spec File:** [docs/trd/trd.md §9.1 + §4.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md)
  - **Affected Code File:** [server/researchindicators/src/domain/tools/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/domain/tools/)
  - **Remediation:** **Change the doc** — add the four rows and promote PRMS to a documented bidirectional integration.

- **Antigravity agent wrappers are absent (silent degradation).** `.agents/` holds the four personas but there is no `.agents/agents/` directory. Antigravity discovers agents one level deeper, so **it cannot see these personas at all** — a run there silently falls back to an unprimed generic agent with no error.
  - **Affected Spec File:** [docs/model-routing.md — Enforced bindings](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/model-routing.md)
  - **Affected Code File:** [.agents/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/.agents/) (missing `agents/akili-*/agent.md`)
  - **Remediation:** **Change the wrappers** — scaffold `.agents/agents/akili-*/agent.md` with `subagent: true`, `mainAgent: false` on Reviewer/Implementer, and a read-only `tools` list for the Reviewer. Report-only if Antigravity is not in use — but record that decision.

- **The root guide asserts CodeGraph is initialized; it is not.** `CLAUDE.md` §4.3 states "`.codegraph/` is initialized (machine-local, gitignored). Prefer `codegraph_*` tools … before broad file scanning." No `.codegraph/` exists, no CLI is installed, and no MCP server provides `codegraph_*`. Every agent reading the guide is directed toward tools it cannot call — and this audit's own requested initialization failed for the same reason.
  - **Affected Spec File:** [CLAUDE.md §4.3](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/CLAUDE.md) (+ identical `AGENTS.md`)
  - **Affected Code File:** `.codegraph/` — absent
  - **Remediation:** Either **install/initialize CodeGraph** (making the claim true) or **change the doc** to describe it as optional-if-present with a `Glob`/`Grep` fallback. Both root guides must change together — they are byte-identical today.

### 🟢 Low Priority (Style / Cleanups)

| # | Finding | Spec File | Code File | Remediation |
| :-- | :--- | :--- | :--- | :--- |
| L1 | Migration count stated as "**238+**" in four places; actual count is **303**. | `CLAUDE.md:94`, `AGENTS.md:94`, `trd.md:157`, `trd.md:229` | `src/db/migrations/` | Change the docs; prefer "300+" or drop the number. |
| L2 | Root-guide repo-layout tree lists **9** `tools/` dirs; **14** exist. | `CLAUDE.md` §3 | `src/domain/tools/` | Change the doc. |
| L3 | `engines` field **missing** from server `package.json` though "Node ≥ 20.11.1" is a hard constraint. | `trd.md` §13.1, `prd.md` §8.3 | `server/researchindicators/package.json` | Change the code — add `engines` so the constraint is enforced at install. |
| L4 | PRD preamble still points at the **legacy doc paths** `docs/detailed-design/` and `docs/system-design/`. | `prd.md:9` | n/a | Change the doc → `docs/trd/`, `docs/ux-ui/`. |
| L5 | Cross-reference rot: `design.md` §9 + OG-3 cite "prd.md **OQ-6**" for mobile portrait (actually **OQ-11**); §11 cites "**OQ-3**" for dark/light parity (actually **OQ-8**). | `design.md` §9, §11, §13.1 | n/a | Change the doc — repoint to OQ-11 / OQ-8. |
| L6 | `model-routing.md` has **no Effort dial / re-baseline rule** and no "Why these models" rationale, versus the packaged default. Without the re-baseline rule, effort defaults have no recorded sweep obligation as generations turn over. | `docs/model-routing.md` | n/a | Change the doc — port both sections from the packaged template. |
| L7 | `express-rate-limit` is installed with **zero usages** in `src/`. Already recorded as OG-12 / TRD §13.4, so this is confirmation, not new drift. | `trd.md` §10.1, `design.md` OG-12 | `server/researchindicators/src/` | Keep as tracked gap, or wire controller-level defaults. |
| L8 | Google Analytics is wrapped by **`ibdevkit`** (v0.2.1, package description "Stencil Component Starter") — an undocumented dependency of low provenance on the analytics path. | `trd.md` §9.2 | `.../services/google-analytics.service.ts:2` | Change the doc; separately review the dependency's provenance. |
| L9 | `ngsw-config.json` has **0 assetGroups / 0 dataGroups** (service worker is a no-op offline). Already recorded in TRD §13.4. | `trd.md` §13.4 | `client/research-indicators/ngsw-config.json` | Confirmed known gap — no action required to close drift. |

---

## Drift-Category Sweep

Every Step-2 category was swept. Categories with no findings are reported clean rather than omitted.

| Category | Verdict | Evidence |
| :--- | :--- | :--- |
| Stale Specification (docs > code) | ⚠️ **Findings** | 11-tab claim, 238+ migrations, 9-of-14 tools tree, CodeGraph claim, legacy doc paths, OQ cross-refs. |
| Undocumented Feature (code > docs) | 🔴 **Findings** | Mapbox + token, Tailwind CDN, remote token CSS, `whats-new`, `configuration/variables`, `bilateral-mapping`, project-detail tabs, `prms-toc`/`pdf-viewer`/`core`/`dto`, `ibdevkit`. |
| Visual / Design Token Mismatch | 🔴 **Findings** | Remote S3 `colors.css` as de-facto token source; 44/75 SCSS files with hex literals; 101 templates on CDN Tailwind utilities against the §7.1 label contract. |
| Technical Constraints Violation | ⚠️ **Findings** | 42/131 controllers missing `@ApiTags`, 43 missing `@ApiBearerAuth`; `engines` absent. **Clean elsewhere:** envelope, URI versioning, append-only migrations (303, none edited), coverage floors (server 60; client 40/20/45/30), bundle budgets (2/3 MB, 4/8 kB), standalone-components-only, 129/131 controllers have sibling specs. |
| Agent Guide Drift | ⚠️ **Findings** | False CodeGraph claim; stale layout tree + migration count. **Clean:** both child guides exist (`server/…/src/CLAUDE.md`, `client/…/src/CLAUDE.md`), both are indexed in the parent `## Module Guides` table, both have `AGENTS.md` mirrors, no guide entry points at a missing module, and root `CLAUDE.md` ≡ `AGENTS.md` byte-for-byte. |
| Persona injection bleed | ✅ **Clean** | Zero design-token references in any of the four personas (the `tester.md` token-path tell is absent), and directory boundaries **are** present in `leader.md` — the two clearest tells both negative. Test-command references are scoped per role. Separate persona issues (server-only scope, missing guardrails) are Medium findings above, not bleed. |
| Model Registry Drift | ✅ **Clean** | Alias-first respected (`opus`/`sonnet`/`haiku`, no dated pins, so no missing-reason case). All six tiers present. `author ≠ auditor` note present in Philosophy and in the phase table. All four Step-8E wrappers match the registry exactly: leader→`haiku` (T5), implementer→`sonnet` (T2), reviewer→`opus` (T3), tester→`sonnet` (T2). Registry is mirrored correctly into both root guides. |
| Missing host column | ✅ **Clean** | All three packaged columns present (Claude Code · OpenCode · Fallback). Unconfirmed OpenCode slugs correctly carry `<CONFIRM SLUG>` / `<CONFIRM>` placeholders rather than having been deleted. |
| Tier/model mismatch | ✅ **Clean** | T2 (`sonnet`) ≠ T3 (`opus`) so `author ≠ auditor` resolves in practice; T4 Context-Ingest on a large-context model; T6 Multimodal on a vision-capable model; T5 on the fast tier. No adjacent-tier swap. |
| Antigravity wrapper gaps | ⚠️ **Findings** | `.agents/agents/` absent entirely (personas invisible to Antigravity). Reviewer `tools` grants write access on the one host where read-only is enforceable — with a realized incident. `subagent`/`mainAgent` fields absent. |
| Model Generation Drift | ⚠️ **Partial** | **Clean:** `Updated: 2026-07` is current with the audit month; no frontier-escalation pin exists, so no stale pin reason. **Findings:** no Effort dial / re-baseline rule recorded (L6); `leader.md` missing Delegation Ceiling and `implementer.md` missing Scope Discipline — both guardrails the packaged templates have gained. |

---

## Conformance Matrix

| Spec Section | Code Reality Status | Alignment Status | Notes |
| :--- | :--- | :--- | :--- |
| Product Requirements (PRD) | Personas, lifecycle, federation, AC-Testing, AC-Performance all hold. Undocumented Mapbox dependency + `whats-new` and admin-config surfaces; legacy doc paths in the preamble. 11 open questions still open. | **Drifted (minor)** ~80% | Intent matches; the dependency and scope lists lag the code. |
| UX/UI Design / Screen Inventory | Shell/nav/component inventory accurate. Token source moved off-repo; 6 shipped surfaces missing from IA + inventory; tab count stale; a shipped surface contradicts a standing decision; 59% of SCSS carries hex. | **Drifted (major)** ~60% | The most drifted document — and the one whose §7.1 claims are now factually wrong. |
| TRD (APIs/DB) | Envelope, URI versioning, RBAC, guards, append-only migrations, state boundaries, interceptor order, coverage floors, budgets all confirmed in code. Drift: 4 undocumented tool modules, migration count, missing `engines`, Swagger decorators on 32% of controllers, Mapbox absent from §9.2/§10.2. | **Drifted (moderate)** ~72% | Architecture is sound; the integration and API-hygiene inventories lag. |
| Agent Guides (root + `## Module Guides` index) | Root ≡ `AGENTS.md`; both child guides exist, are indexed, and have mirrors; no dangling entries. Drift: false CodeGraph claim, stale tools tree, stale migration count, personas scoped server-only against monorepo work. | **Drifted (moderate)** ~65% | Index structure is healthy; specific claims inside it are not. |
| Model Routing (registry + Step 8E wrappers) | Registry well-formed: alias-first, six tiers, author≠auditor, all host columns, wrappers match exactly. Drift: no `.agents/agents/` wrappers, Reviewer write access (realized incident), missing Effort dial, missing Delegation Ceiling / Scope Discipline guardrails. | **Drifted (moderate)** ~70% | Model *selection* is correct; model *enforcement* and persona guardrails are the gap. |

---

## Recommended Next Steps

Ordered by risk-to-effort. Items 1–3 are the ones that can hurt a production release.

1. **Rule on the two runtime CDNs** (remote `colors.css` + unpkg Tailwind). This is a product/architecture decision, not a doc edit: vendor them in, or document them as authoritative with versioning and a failure story. Everything else in the UX/UI drift list is downstream of this call. → `/akili-propose` for the decision, then a spec.
2. **Enforce Reviewer read-only** in `.claude/agents/akili-reviewer.md` via an explicit `tools:` allowlist, and carry the `rm -rf` incident into the Kaizen record at `/akili-archive`. Cheap, and it closes a gap that already fired once.
3. **Fix the persona scope** — `leader.md` / `implementer.md` must offer a client `verify:` path, since the active spec is client work and every Implementer currently gets a server-only command. Manual trim.
4. **Backfill the Swagger decorators** on the 42/43 controllers, or narrow the `MUST` to a documented subset. Mechanical and batchable → a good `/akili-specify` task with a lint guard to stop regression.
5. **Refresh `docs/ux-ui/design.md`** — add the 6 surfaces to §2.1 + §4, correct the tab count, append a dated decision for project-detail tabs, and correct §7.1 to match whatever item 1 decides. → `/akili-constitution` (baseline refresh).
6. **Refresh `docs/trd/trd.md`** — 4 tool-module rows, PRMS as an upstream integration, Mapbox in §9.2/§10.2, migration count, `engines`.
7. **Port the missing methodology guardrails** — Delegation Ceiling + Delegation Thresholds into `leader.md`, Scope Discipline into `implementer.md`, Effort dial into `docs/model-routing.md`. Note that `/akili-audit` itself references a `leader.md` section that does not exist.
8. **Decide on CodeGraph** — install it (the guide's claim becomes true, and future audits gain symbol-level coverage this one lacked) or soften the claim to optional-if-present in both root guides.
9. **Optional hygiene:** L1–L9 — cross-reference rot, legacy paths, `ibdevkit` provenance, `engines`.
