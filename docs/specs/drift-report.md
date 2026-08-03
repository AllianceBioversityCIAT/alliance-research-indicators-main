# AKILI Drift Audit Report

- **Date of Audit:** 2026-08-03
- **Code Graph Used:** **Yes** — `.codegraph/` present with a live daemon (index refreshed same day). Symbol lookups did not count toward the delegation threshold.
- **Overall Conformance Score:** **82%**

> **Remediation status — updated 2026-08-03, after the audit.** Findings below are preserved as the point-in-time record; this block tracks what has since been actioned.
>
> | Finding | Status |
> | :--- | :--- |
> | 🔴 Unauthenticated `/admin` data exposure | **Specified** — `docs/specs/bugfix/admin-ssr-data-exposure/` (proposal + requirements; awaiting design). Chunk 2: `docs/specs/changes/admin-panel-auth/` |
> | 🟡 Five undocumented tool modules | ✅ **Fixed** — TRD §4.1, §9.1, §14 |
> | 🟡 Three undocumented client pages | ✅ **Fixed** — TRD §4.2 (incl. `cache-test` flagged as an unguarded dev route) |
> | 🟡 Sibling-spec convention at ~69% | ✅ **Reconciled** — TRD §12 now states the coverage floor is the gate and sibling specs are the norm, not a satisfied invariant |
> | 🟢 Migration count stale in four places | ✅ **Fixed permanently** — the count is no longer restated anywhere; all four sites now point at the folder |
> | 🟡 Design-token hex literals (47/75) | ⏳ **Open** — recorded in TRD §13.4. Blocked on adding a stylelint color rule first, or the files regrow |
> | 🟢 Spec taxonomy tree describes absent folders | ⏳ Open |
> | 🟢 Persona injection bleed (leader lint cmd) | ⏳ Open (cosmetic) |
> | *(new, found during remediation)* `LOCAL_AUTH_BYPASS` staging gap; `ARI_PDF_VIEWER_URL` absent from `.env.example` | Recorded in TRD §13.4 |

## Executive Summary

The baseline is in good shape structurally — the TRD's architecture, module taxonomy, data model, envelope contract, and testing floors all match the code. Drift is concentrated in three places, only one of which is urgent.

**One security finding is real and verified end to end:** the `/admin` SSR panel is excluded from `JwtMiddleware`, carries no guard, and one of its four routes performs a **live database query** whose result is embedded in the returned HTML. The TRD documents the required `AdminGuard`; it does not exist in the codebase.

The other two clusters are documentation lag, not defects: **five server integrations** exist in code but appear in no doc or guide, and **47 of 75 client component stylesheets hardcode hex values** that duplicate declared design tokens — which silently breaks dark mode, since the token flips under `[data-theme="dark"]` and the literal does not.

The AKILI meta-layer (personas, Model Routing registry, Step 8E wrappers) was regenerated earlier today and audits clean, with two honest caveats recorded below.

## Identified Discrepancies

### 🔴 High Priority (Breaking/Critical)

- **Unauthenticated admin route serves live database data.** The TRD states the admin module is "excluded from JWT middleware; needs its own `AdminGuard` (see §10)." No `AdminGuard` exists anywhere in `src/`. `AdminController` declares no `@UseGuards` and no `@Roles`, and `app.module.ts:86` excludes `/admin(.*)` from `JwtMiddleware`. Three of its four routes return hardcoded placeholders (`John Doe`/`Jane Smith`, static settings, example dashboard counts) and expose nothing — but `GET /admin/bilateral-project-mappings` calls `AdminService.listBilateralProjectMappings` → `BilateralProjectMappingService.list(query)`, a **real DB read**, and SSR-embeds the first 20 rows into the HTML. The in-code comment asserts *"Auth + role gating is enforced server-side by RolesGuard on `/api/bilateral-project-mappings`; this SSR route is only the shell"* — **that claim is false for the first paint**: the SSR path calls the domain service directly and never traverses the API layer, so `RolesGuard` never runs. Anyone who can reach the host can read bilateral project mappings unauthenticated.
  - **Affected Spec File:** [docs/trd/trd.md §4.1 + §10](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md)
  - **Affected Code File:** [admin.controller.ts:78-88](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/admin/controllers/admin.controller.ts) · [admin.service.ts:15-19](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/admin/services/admin.service.ts) · [app.module.ts:86](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/app.module.ts)
  - **Remediation:** **Change the code.** Implement `AdminGuard` as the TRD already specifies and apply it to `AdminController`; or, as an immediate stopgap, delete the SSR pre-fetch and let the React page fetch through the guarded `/api/bilateral-project-mappings` endpoint it already uses for refresh — the comment shows that path exists and is protected. Already tracked as **OI-4** in `docs/infrastructure.md`; this audit raises it from "open item" to "active exposure" because a live query now sits behind it. Also correct the misleading comment at `admin.controller.ts:74-76`.

### 🟡 Medium Priority (Inconsistencies/Gaps)

- **Five server tool modules are undocumented.** `domain/tools/` contains `toc-integration/`, `prms-toc/`, `pdf-viewer/`, `core/`, and `dto/`, none of which appear in the TRD §4.1 source tree or the server child guide's integration list. `toc-integration/` is the folder implementing the "lambda-toc" row that §9.1 *does* document — the row exists, the folder is missing from the tree. `prms-toc/` and `pdf-viewer/` are full Nest modules (module + service + spec) documented nowhere at all.
  - **Affected Spec File:** [docs/trd/trd.md §4.1, §9.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md) · [server/.../src/CLAUDE.md §8](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/CLAUDE.md)
  - **Affected Code File:** [domain/tools/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/domain/tools/)
  - **Remediation:** **Update the docs.** Add `prms-toc` and `pdf-viewer` rows to the §9.1 integration table, add all five folders to the §4.1 tree, and extend the child guide's "Existing integrations" line. Note that `core/` (`base-api.ts`) and `dto/` are shared helpers, not integrations — document them as such rather than as tool modules.

- **47 of 75 client component stylesheets hardcode hex values, and it breaks dark mode.** Spot-verified that these are not arbitrary colors but literal copies of declared tokens: `#1689ca` = `--ac-light-blue-300`, `#112f5c` = `--ac-primary-blue-600`, `#8d9299` and `#e8ebed` likewise declared in `colors.scss`. Because dark mode works by re-binding those custom properties under `:root[data-theme="dark"]`, every hardcoded copy stays light-mode in dark mode. A further 10 component templates carry hex inside inline `style="…"` attributes, and at least one value (`#d1d5db`) is off-palette entirely — not in `colors.scss` at all.
  - **Affected Spec File:** [docs/ux-ui/design.md §7.1](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md) · [CLAUDE.md §4.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/CLAUDE.md)
  - **Affected Code File:** [data-overview.component.scss](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/pages/platform/pages/home/components/data-overview/data-overview.component.scss) (19 hex) · [create-oicr-form.component.scss](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/shared/components/all-modals/modals-content/create-result-modal/components/create-oicr-form/create-oicr-form.component.scss) (24 hex) · 45 more
  - **Remediation:** **Both.** (1) *Docs:* the two documents disagree — `design.md` §7.1 says "Do not hard-code hex values in **new** components" (forward-looking) while root `CLAUDE.md` §4.2 states an absolute "no hex literals in components." Reconcile them; the 63% incidence rate shows the absolute form has never been true. (2) *Code:* nothing enforces either version — `.stylelintrc` extends only `stylelint-config-standard-scss`, which has no color rule. Add `declaration-property-value-disallowed-list` or `color-no-hex` to make the rule real going forward, then migrate incrementally, prioritizing components whose hex duplicates a token (a mechanical, verifiable substitution).

- **Sibling-spec convention is ~69% honored for services.** TRD §12 states the layout is "Sibling `*.spec.ts` per controller/service/guard/interceptor/middleware." Controllers comply (129 specs / 131 controllers), services do not: **97 specs for 141 services — 44 missing.** The enforced 60% global coverage floor is met, so CI is green; the documented per-unit convention is what has drifted.
  - **Affected Spec File:** [docs/trd/trd.md §12](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md)
  - **Affected Code File:** [server/researchindicators/src/domain/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/server/researchindicators/src/domain/)
  - **Remediation:** **Pick one and state it.** Either soften §12 to "coverage floor is the gate; sibling specs are the norm for new code," or schedule spec-authoring for the 44 gaps. The current wording reads as an invariant that the codebase does not hold.

- **Three client pages exist in no document.** `pages/cache-test/`, `pages/star-report-viewer/`, and `pages/platform/pages/whats-new/` are absent from TRD §4.2's client module table and from the UX/UI §4 Screen Inventory. `cache-test` in particular reads like a development scaffold shipped into the routed app.
  - **Affected Spec File:** [docs/trd/trd.md §4.2](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/trd/trd.md) · [docs/ux-ui/design.md §4](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/docs/ux-ui/design.md)
  - **Affected Code File:** [client/.../src/app/pages/](file:///Users/pelitos/Documents/CIAT/alliance-research-indicators-main/client/research-indicators/src/app/pages/)
  - **Remediation:** **Update the docs** for `star-report-viewer` and `whats-new`. For `cache-test`, decide first whether it should ship at all — if it is a dev harness, **change the code** (remove it or gate it out of production routes).

### 🟢 Low Priority (Style/Cleanups)

- **Migration count stale in four places.** Docs say "238+ as of 2026-05"; the tree holds **303**. Appears in `CLAUDE.md:94`, `AGENTS.md:94`, `trd.md:157`, `trd.md:229`. — **Remediation:** update the docs, or replace the count with "append-only; see `db/migrations/`" so it cannot go stale again. *(Recommended: the latter — a number in four files is four places to forget.)*
- **Spec taxonomy tree describes folders that do not exist.** Root guide §2 shows `docs/specs/{results,indicators,agresso,clarisa,opensearch,reports,admin-panel}/`; none exist. Actual contents: `archive/`, `general-setup/`, `quick/`, `kaizen-log.md`. The tree is illustrative of the intended convention, but reads as an inventory. — **Remediation:** update the doc to mark it as the naming convention for folders created on demand.
- **Persona injection bleed (minor, introduced today).** `.agents/leader.md` frontmatter carries the lint command in its `verify_*` lines. Per the Step 8B injection-scope table the lint command belongs to the Implementer only. Defensible — the Leader hands verification commands to workers in its brief — but it is one more place the command can go stale. `tester.md` correctly carries **no** design-token obligation (it now states the exclusion explicitly), and `leader.md` correctly carries directory boundaries. — **Remediation:** optional manual trim; never an overwrite.
- **Admin panel is scaffolding.** Beyond the High finding, `/admin/users`, `/admin/settings`, and `/admin/dashboard` all return hardcoded example data with `// Example data - replace with real database queries` still in place. The TRD and UX/UI docs describe the admin panel as an operator surface. — **Remediation:** documentation should mark the panel's real status as scaffold, so its described capabilities are not read as shipped.

### ✅ Categories swept with no findings

| Category | Result |
| :--- | :--- |
| **Model Registry Drift** | Clean. Registry present in **both** `CLAUDE.md` and `AGENTS.md` (byte-identical), six tiers, `Updated: 2026-08`, author ≠ auditor note present, alias-first respected (no dated pins). |
| **Missing host column** | Clean. All three host columns present (Claude Code, OpenCode, Antigravity); unknown OpenCode slugs are `<CONFIRM SLUG>` placeholders, not dropped. |
| **Tier/model mismatch** | Clean. T2 `sonnet` ≠ T3 `opus` (author ≠ auditor holds); T6 Multimodal routes to vision-capable models; T4 sits on a large-context model. |
| **Antigravity wrapper gaps** | Clean. All four wrappers nested at `.agents/agents/<name>/agent.md`, all carry `subagent: true`, Leader `mainAgent: true` / other three `mainAgent: false`. Wrapper models match the registry. |
| **Step 8E wrapper ↔ registry consistency** | Clean. Registry's enforced-wrapper line matches all four Claude Code wrappers exactly (`leader→opus`, `implementer→sonnet`, `reviewer→opus`, `tester→sonnet`). |
| **Packaged persona guardrails** | Clean. `leader.md` has the Delegation Ceiling; `implementer.md` has both-directions Scope Discipline; `reviewer.md` has `FATAL_FAIL`; `tester.md` has `PRODUCT_BUG`. |
| **Coverage floors (TRD §12 vs config)** | Clean. Server 60/60/60/60 in `package.json`; client 40/20/45/30 in `jest.config.ts` — both match the TRD exactly. |
| **Response envelope / routing / auth conventions** | Clean. `/api` prefix + URI versioning confirmed in `main.ts`; `ServerResponseDto` via `ResponseInterceptor`; `JwtMiddleware` exclusion list matches the documented set. |
| **Agent guide index (`## Module Guides`)** | Clean. Both child guides exist at the indexed paths; no orphaned entries. |
| **Active spec drift** | Not applicable — no active specs. `docs/specs/` holds only `archive/` (4), `general-setup/`, and `quick/`. |

### ⚠️ Two caveats on the meta-layer

1. **Antigravity Reviewer is read-only by *instruction*, not by *configuration*.** Its wrapper deliberately omits `tools:` because `agy` is not installed on this machine, so the tool identifiers could not be confirmed against the binary — and a wrong name hangs the subagent silently. The Claude Code Reviewer **is** enforced (`tools: Read, Grep, Glob`). Reported, not a defect: the omission is documented in the wrapper itself.
2. **Effort-dial defaults have never been swept for the current model generation.** The `Updated: 2026-08` stamp reflects the registry edit, not a re-baseline run. Per the re-baseline rule, the `medium`/`high`/`xhigh` defaults should be exercised on a real spec before they are trusted as calibrated.

## Conformance Matrix

| Spec Section | Code Reality Status | Alignment Status | Notes |
| :--- | :--- | :--- | :--- |
| Product Requirements (PRD) | Personas, roles, result lifecycle, and controlled-vocabulary rules all reflected in code | **Aligned** | AC-Admin-Panel is the exception — see the High finding |
| UX/UI Design / Screen Inventory | 145 components, tokens declared in `colors.scss`/`roartheme.ts` | **Drifted** | 47/75 stylesheets bypass tokens; 3 pages missing from the inventory |
| TRD (APIs/DB) | 131 controllers, 303 migrations, envelope + versioning + auth as documented | **Drifted** | 5 undocumented tool modules; stale migration count; service-spec convention at 69% |
| Agent Guides (root + `## Module Guides` index) | Both child guides present and indexed | **Drifted** | Root §2 taxonomy tree and §3 migration count describe a repo state that no longer holds |
| Model Routing (registry + Step 8E wrappers) | Registry in both guides; 8 wrappers across 2 hosts | **Aligned** | Two caveats above are disclosures, not drift |

## Recommended Next Steps

1. **Close the admin exposure first.** `/akili-propose "guard the /admin SSR panel"` — implement the `AdminGuard` the TRD already specifies, or drop the SSR pre-fetch so the guarded API path is the only data route. Fix the false comment at `admin.controller.ts:74-76` in the same change. This is the only finding with a live security consequence.
2. **Make the design-token rule real before migrating.** Reconcile the `design.md` "new components" wording against `CLAUDE.md`'s absolute rule, then add a stylelint color rule. Enforcement first, migration second — otherwise the 47 files regrow.
3. **Refresh the TRD's module inventory** — 5 tool modules, 3 client pages, and the migration count. Cheapest fix in this report; replace the count with a pointer so it cannot restale.
4. **Decide the sibling-spec convention** — soften §12 or schedule the 44 missing service specs. Leaving an unmet invariant in the TRD trains readers to discount it.
5. **Sweep the effort-dial defaults** on the next real spec, then re-stamp the registry.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
