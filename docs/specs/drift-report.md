# AKILI Drift Audit Report

- **Date of Audit:** 2026-08-13
- **Code Graph Used:** **No — available but not queried.** A root `.codegraph/codegraph.db` (149 MB, indexed 2026-08-13 08:32) exists and covers the monorepo, but this scan was executed via `Glob`/`Grep`/`Bash` file-system inspection at full category depth. Confidence is high on presence/absence facts (route tables, decorator counts, dependency manifests, exclude lists — all read directly from source) and correspondingly lower on call-graph-shaped questions (dead-code reachability, transitive callers of a documented-but-unwired service). Read the score below with that profile, not as a graph-backed audit. *(Note: `server/researchindicators/.codegraph/` contains only `config.json` — no `.db` — see H-7.)*
- **Overall Conformance Score:** **72%**

## Executive Summary

The constitutional baseline is unusually well-written and **broadly accurate on architecture**: the HTTP envelope, URI versioning, `SecRolesEnum` values, interceptor ordering, coverage floors, `angular.json` budgets, server module layout, and the CLARISA/AGRESSO/ROAR integration map all match the code exactly. Drift is not diffuse — it is **concentrated in four pockets**, and the two most serious are ones the docs actively assert as working.

1. **Two documented capabilities are inert in production.** The client never registers `SocketIoModule.forRoot(...)`, so every real-time behavior the PRD and TRD describe cannot execute; and **Tailwind CSS is not installed at all**, while the UX/UI blueprint mandates Tailwind classes as a binding contract and ~1,300 template sites use Tailwind arbitrary-value syntax. Both are doc-says-yes / code-says-no, the most expensive drift shape.
2. **One undocumented anonymous endpoint.** `GET reports/:resultCode/pdf` is excluded from `JwtMiddleware` but appears in no documented allowlist — directly against the "anonymous endpoints are an explicit allowlist" principle.
3. **The methodology layer has drifted hardest.** The project registry runs both Leaders on T5 where the packaged default argues at length for T1; the Antigravity host column and its `.agents/agents/` wrappers are entirely absent (a silent degradation); and `.agents/leader.md` is 6 KB against a 32 KB packaged template — missing the very *Delegation Thresholds* section that `/akili-audit` Step 1 instructs agents to apply.
4. **The agent guides mis-route CodeGraph, again.** The 2026-08-13 correction landed in `CLAUDE.md` only, and is now inverted relative to reality — the real index sits at the repo root, which the corrected line explicitly says it does not.

Nothing in this report was edited. Remediation direction is stated per finding.

---

## Identified Discrepancies

### 🔴 High Priority (Breaking/Critical)

- **H-1 — Client real-time is non-functional: `SocketIoModule` is never registered.** TRD §8.4 states "`WebsocketService` connects on app init via `ngx-socket-io`" and enumerates four live listeners; PRD `AC-Real-Time` and §5.1 promise presence, notifications, and alerts. In code, `SocketIoModule.forRoot(...)` appears **only** in `room.component.spec.ts` and in a defensive comment — it is absent from `app.config.ts` providers, so `Socket` is not injectable and `WebsocketService` cannot be constructed at runtime. The listener code exists but can never run. UX/UI §12.2 (2026-05-24) acknowledges this in passing for one tab ("app does not register `SocketIoModule.forRoot(...)` in prod"); the PRD and TRD still assert the capability outright.
  - **Affected Spec File:** [trd.md §8.4](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md) · [prd.md AC-Real-Time](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/prd.md)
  - **Affected Code File:** [app.config.ts](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/app.config.ts) · [websocket.service.ts](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/sockets/websocket.service.ts)
  - **Remediation:** **Decide, then align both sides.** If real-time is intended, fix the code (register `SocketIoModule.forRoot(...)`). If it is deferred, fix the docs — demote TRD §8.4 and PRD `AC-Real-Time`/§5.1 to "wired but not registered", and promote the §12.2 aside into a first-class open gap in §13.2.

- **H-2 — Undocumented anonymous endpoint: `GET reports/:resultCode/pdf`.** `app.module.ts` excludes `reports/${RESULT_CODE}/pdf` from `JwtMiddleware`, but that path is missing from **every** documented exclude list: PRD `AC-Auth`, TRD §10.1, UX/UI §8.2, and `CLAUDE.md` §4.1 all enumerate the allowlist and none includes it. This contradicts UX/UI §1.2 principle 2 ("Anonymous endpoints are an explicit allowlist, not the default") and means an unauthenticated route serving result PDFs exists outside the governed surface.
  - **Affected Spec File:** [trd.md §10.1](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md) · [prd.md AC-Auth](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/prd.md)
  - **Affected Code File:** [app.module.ts:101-104](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/app.module.ts)
  - **Remediation:** **Security review first, then update the doc.** Confirm the PDF route is intentionally public (it serves result content); if yes, add it to all four allowlists with its rationale. If not, add auth to the code.

- **H-3 — Tailwind CSS is mandated by the design blueprint but is not installed.** UX/UI §7.1 makes Tailwind a *binding contract* — the required-field marker is specified as `<span class="text-red-500">*</span>` (explicitly "NOT `atc-red-1`") — and ~1,300 template sites use Tailwind arbitrary-value syntax (`text-[#153C71]`, `bg-[#035BA9]`, `mt-2`, `gap-1`). But `tailwindcss` is absent from `package.json` (both dep blocks), absent from `node_modules`, and there is no `tailwind.config.*` or `postcss.config.*`. Every one of those classes is inert: the prescribed required-marker renders unstyled, and the hardcoded hex values in `text-[#...]` do nothing.
  - **Affected Spec File:** [design.md §7.1](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/design.md)
  - **Affected Code File:** [package.json](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/package.json) · [global-alert.component.html](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/components/global-alert/global-alert.component.html)
  - **Remediation:** **Decide the stack, then align.** Either install + configure Tailwind (making the §7.1 contract real), or rewrite §7.1's binding contract onto the `--ac-*` / `.atc-*` token system and schedule removal of the inert Tailwind classes. Leaving it as-is means the design doc's most precise rule is unenforceable.

- **H-4 — Phase→Tier Drift: both Leader roles run on T5 where the packaged default specifies T1.** The packaged `docs/model-routing.md` devotes a paragraph to precisely this: *"The **Leader runs on the deep-reasoning tier (T1), not a cheap one**… a weak orchestrator with strong workers poisons the whole run"* (`model-routing.md:65-72`), and its phase table sets `/akili-execute` → Leader = **T1** (`:80`, rationale: "Orchestration judgment — decomposition in flight, runtime skill selection for each Implementer, FAIL adjudication, synthesis, pivot. Writes no code, but this is reasoning, not dispatch") and `/akili-test` → Leader = **T1** (`:83`). The project registry assigns **T5** to both, and the `akili-leader` wrapper enforces `haiku`. No `> **Accepted divergence:**` record exists for either phase. **Priority is High because the packaged tier is T1.**
  - **Resolution source:** (a) packaged table hit — `npm root -g`/`akili-specs/docs/model-routing.md`. **High confidence** (table, not parsed prose).
  - **Affected Spec File:** [docs/model-routing.md](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/model-routing.md) · mirror in [CLAUDE.md § Model Routing](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Affected Code File:** [.claude/agents/akili-leader.md](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.claude/agents/akili-leader.md)
  - **Remediation:** Maintainer's call — either move both Leaders to T1 (registry + mirror + wrapper `model:`), or record the divergence with the exact marker: `> **Accepted divergence:** \`/akili-execute — Leader\` runs on \`T5\` instead of packaged \`T1\` — <reason>. (accepted 2026-08-13)`. Report-only; nothing was edited.

- **H-5 — Antigravity wrapper gaps: `.agents/agents/` does not exist.** The project carries all four `.agents/*.md` personas but no `.agents/agents/` wrapper directory. Antigravity discovers agents one level deeper, so it **cannot see the personas at all** and silently falls back to an unprimed generic agent. Nothing errors; the loop simply stops being the loop. (The `subagent: true` / `mainAgent: false` / Reviewer read-only `tools` sub-checks are moot — there are no wrappers to inspect.)
  - **Affected Spec File:** [docs/model-routing.md § Enforced bindings](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/model-routing.md)
  - **Affected Code File:** [.agents/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.agents/) *(wrapper dir absent)*
  - **Remediation:** Scaffold `.agents/agents/akili-*/agent.md` wrappers with `subagent: true` on all four, `mainAgent: false` on Reviewer and Implementer, and a read-only `tools` list on Reviewer.

- **H-6 — `.agents/leader.md` is missing the section `/akili-audit` itself depends on.** The deployed leader persona (6,057 bytes) has structurally diverged from its packaged template (31,678 bytes) — it lacks **seven** sections the template carries: `📏 Delegation Thresholds (inline vs. delegate)`, `🚧 Delegation Ceiling (when *not* to delegate)`, `🛰️ Dispatching outside your own host`, `🚢 Coordinating a fleet of sessions`, `⏳ Winding down`, `🚦 Concurrency protocol`, `⛔ Deferring a check`. This is self-referentially broken: **`/akili-audit` Step 1 instructs agents to "apply the *Delegation Thresholds* from `.agents/leader.md`"** — a section that does not exist there, so the instruction silently no-ops. The *Delegation Ceiling* absence is the highest-signal case the category names.
  - **Affected Spec File:** [~/.claude/akili/templates/leader.md](file:///Users/jcadavid/.claude/akili/templates/leader.md) *(packaged template)*
  - **Affected Code File:** [.agents/leader.md](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.agents/leader.md)
  - **Remediation:** Manual merge of the missing sections into `.agents/leader.md`, preserving the local `🔁 Orchestration Sequence` addition. **Never overwrite** — Safe Update will not do this for you, which is why the gap persists.

- **H-7 — The CodeGraph guide claim is now inverted, and only one mirror was corrected.** `CLAUDE.md:151` states the index "lives at **`server/researchindicators/.codegraph/`** … **not** at the repo root". Reality is the opposite: the root `.codegraph/` holds `codegraph.db` (149 MB, built 2026-08-13 08:32) while `server/researchindicators/.codegraph/` contains **only `config.json` — no database**. An agent following the guide passes a `projectPath` with no index, finds nothing, and concludes CodeGraph is unavailable — the exact failure the 2026-08-13 correction was written to stop.
  - **Affected Spec File:** [CLAUDE.md:151](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Affected Code File:** [.codegraph/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.codegraph/) · [server/researchindicators/.codegraph/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/.codegraph/)
  - **Remediation:** Update the doc to state that the repo-root index is authoritative (and that the server folder holds config only). Given this line has now been wrong in two opposite directions, prefer a claim that degrades safely — e.g. "probe for `.codegraph/codegraph.db` at the repo root first, then per package" — over a hardcoded path.

### 🟡 Medium Priority (Inconsistencies/Gaps)

- **M-1 — Missing host column: the registry has no Antigravity column.** Packaged default carries five columns (`Tier | Claude Code | OpenCode Go | Antigravity | Fallback`); the project registry carries four, dropping Antigravity entirely. The registry belongs to the project, not the session that wrote it — any future Antigravity session has nothing to read, and its Step 8E wrappers and every command's model checkpoint break silently. Packaged defaults that would restore it: T1 Gemini Pro (latest), T2 Gemini Flash (latest), T3 Gemini Pro *(must differ from T2)*, T4 Gemini Pro (long context), T5 Gemini Flash, T6 **Gemini Pro (vision) — the strongest column for that tier**.
  - **Affected Spec File:** [docs/model-routing.md:56-63](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/model-routing.md) · [CLAUDE.md § Model Routing](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Affected Code File:** packaged reference `akili-specs/docs/model-routing.md:116-123`
  - **Remediation:** Add the column back using the packaged families (or `<CONFIRM SLUG>` placeholders) — **never** leave a host column deleted.

- **M-2 — `AGENTS.md` and `CLAUDE.md` have diverged; the CodeGraph fix landed in only one.** The two root guides are byte-identical except line 151, where `AGENTS.md` still carries the pre-correction wording ("`.codegraph/` is initialized"). Every non-Claude host (OpenCode, Antigravity, Codex) reads `AGENTS.md` and therefore never received the 2026-08-13 correction.
  - **Affected Spec File:** [AGENTS.md:151](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/AGENTS.md)
  - **Affected Code File:** [CLAUDE.md:151](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Remediation:** Re-sync the mirror (after fixing H-7, so the *correct* text propagates, not the inverted one).

- **M-3 — Documented Socket.IO events `result-updated` and `result-created` do not exist in code.** A repo-wide search (excluding `docs/`, `node_modules/`) finds **zero** occurrences of either string in server or client source. The only real domain event is `result.pool-funding-alignment.changed` (`server.gateway.ts:11-12`). Yet TRD §7.3 step 3 specifies the AI-formalization flow "emit[s] a Socket.IO `result-created` event"; UX/UI §3.2 states "Socket.IO emits result-updated events"; UX/UI OG-10 lists `result-updated` as a *known* event; PRD `AC-Integrations`/`AC-Real-Time` promise "result-update events".
  - **Affected Spec File:** [trd.md §7.3](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md) · [design.md §3.2, OG-10](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/design.md)
  - **Affected Code File:** [server.gateway.ts](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/tools/socket/server.gateway.ts)
  - **Remediation:** **Update the docs** — reduce the documented event taxonomy to the one event that exists, and reframe OG-10 as "one event shipped" rather than listing an aspirational name as known. (Compounds with H-1: even this one event cannot reach the client.)

- **M-4 — 43 of 131 controllers lack `@ApiBearerAuth`.** PRD `AC-API-Surface`, TRD §6.2 ("Every controller MUST declare `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`"), UX/UI §8.2, and `CLAUDE.md` §4.1 all state this as mandatory. Affected controllers are mostly the `result-*` / `*-roles` entity clusters (e.g. `result-countries`, `result-levers`, `result-sdgs`, `lever-roles`, `evidence-roles`), plus `app.controller.ts` and both `azure-*` controllers.
  - **Affected Spec File:** [trd.md §6.2](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md)
  - **Affected Code File:** [src/domain/entities/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/entities/) *(43 controllers)*
  - **Remediation:** **Fix the code** — add the decorator (a mechanical sweep). Alternatively narrow the doc to "every controller exposing authenticated routes", but the current blanket MUST is being violated at ~33%.

- **M-5 — Five undocumented `domain/tools/` modules.** TRD §4.1's tree and `CLAUDE.md` §3 both enumerate the tools folder; code has five entries neither lists: **`prms-toc/`** and **`pdf-viewer/`** (full Nest modules with service + spec — real integrations absent from the TRD §9.1 integration table), **`toc-integration/`** (the lambda-toc client — described in §9.1 prose as "lambda-toc" but never named as a folder in the layout trees), and **`core/`** + **`dto/`** (helper folders holding `base-api.ts` and shared DTOs).
  - **Affected Spec File:** [trd.md §4.1, §9.1](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md) · [CLAUDE.md §3](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Affected Code File:** [src/domain/tools/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/tools/)
  - **Remediation:** **Update the docs** — add `prms-toc` and `pdf-viewer` to the §9.1 integration table and both layout trees; rename the `toc-integration` folder in the trees so prose and layout agree. See also L-5 on `core/`+`dto/`.

- **M-6 — Undocumented OpenSearch index `agresso-contract`.** PRD §5.1 and TRD §5.2/§9.1 consistently name **three** indexes (Results, Alliance Staff, PRMS feed). Code has a fourth: `tools/open-search/agresso-contract/`.
  - **Affected Spec File:** [trd.md §9.1](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md) · [prd.md §5.1](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/prd.md)
  - **Affected Code File:** [open-search/agresso-contract/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/tools/open-search/agresso-contract/)
  - **Remediation:** **Update the docs** to four indexes.

- **M-7 — Undocumented broker app `ReportMsApp`.** TRD §6.2 lists broker handlers as `AlianceManagementApp`, `AiRoarMiningApp`, `SelfApp`, `MessageMicroservice`; UX/UI §8.2 lists the first three. Code adds `report-ms.app.ts` (with a spec file, so it is live).
  - **Affected Spec File:** [trd.md §6.2](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md)
  - **Affected Code File:** [broker/report-ms.app.ts](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/tools/broker/report-ms.app.ts)
  - **Remediation:** **Update the docs.**

- **M-8 — Three shipped client routes are absent from the screen inventory and IA.** `app.routes.ts` registers `whats-new` (+ nested `details/:id`) and `administration/configuration/variables` — none appear in UX/UI §4 Screen Inventory, §2.1 IA, or TRD §4.2 client modules. `administration/center-admin/bilateral-mapping` appears in TRD §4.2 but **not** in UX/UI §4/§2.1; `administration/center-admin/agresso-pool-funding-tag` appears only in the UX/UI §12.2 decision log, not the inventory.
  - **Affected Spec File:** [design.md §2.1, §4](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/design.md)
  - **Affected Code File:** [app.routes.ts:230-320](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/app.routes.ts)
  - **Remediation:** **Update the docs** — add four rows to §4 and the matching §2.1 branches. Note §4 is the inventory the doc's own §8.1 rule requires updating "in the same change"; that rule is not holding.

- **M-9 — Result Detail tab count: docs say 11, code has 12.** UX/UI §2.1 lists 11 tabs and §4 row 10 says "11 sub-tabs"; `app.routes.ts` registers 12 (adding `pool-funding-alignment`) and `result/pages/` has 12 folders. TRD §4.2 is correct ("11 tabs + conditional Pool Funding alignment tab") and UX/UI §12.2 (2026-05-23) documents the 12th — so §2.1/§4 are internally inconsistent with the same document's decision log.
  - **Affected Spec File:** [design.md §2.1, §4](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/design.md)
  - **Affected Code File:** [app.routes.ts:88-152](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/app.routes.ts)
  - **Remediation:** **Update the docs** — reconcile §2.1/§4 with §12.2, marking the 12th tab conditional.

- **M-10 — Phase→Tier Drift (remaining differences).** Beyond H-4, comparing the project registry against packaged `model-routing.md:76-95`. No `Accepted divergence` record exists for any of these. All Medium (packaged tier is neither T1 nor T3, except where noted).
  | Phase | Local tier | Packaged tier | Packaged rationale (cited) |
  |---|---|---|---|
  | `/akili-quick` | T5 | **T2** | "A small, direct edit + light verification — no deep reasoning needed." (`:78`) |
  | `/akili-specify` → UX/UI design | **absent locally** | T6 | "Only when visual design is in scope." (`:82`) |
  | `/akili-resume` | **absent locally** | T5 | "File scanning + dashboard summarization — reasoning depth is not the bottleneck." (`:94`) |
  | `/akili-seo` | **absent locally** | T3 + T5 | "Audit findings (T3) plus setup/formatting steps (T5)." (`:95`) — *T3 → High* |
  - **Resolution source:** (a) packaged table hit via `npm root -g`. **High confidence.** Matching phases (constitution, propose, specify, execute-Implementer, execute-Reviewer, test-Tester, validate, audit, archive) produce no entry here, per this category's no-confirmations rule.
  - **Affected Spec File:** [docs/model-routing.md:32-46](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/model-routing.md)
  - **Affected Code File:** packaged reference `akili-specs/docs/model-routing.md:76-95`
  - **Remediation:** Maintainer's call per phase — align, or record with the exact `Accepted divergence` marker. Report-only.

- **M-11 — Implementer and Reviewer personas have structurally drifted from their templates.** `.agents/implementer.md` lacks the template's **`Scope Discipline (Both Directions)`** guardrail (it carries only the one-directional "Incremental Focus (No Scope Creep)" — the both-directions form is the worked example the category names), plus `Aesthetics & Coding Best Practices`, `Self-Correction (Pre-Review)`, and the **`Not Done / Assumptions`** reporting field ("what lets the Leader tell a clean `[x]` from a `[~]`"). `.agents/reviewer.md` lacks `4R Review Lenses`, `Scale your depth to the diff`, and **`Option C: FATAL_FAIL (Fail-Fast)`** — so a Reviewer has no fail-fast path. `.agents/tester.md` is structurally aligned (all template sections present, plus a local repo-specific `🧭 Suites & Commands` addition) — **no finding**.
  - **Affected Spec File:** [~/.claude/akili/templates/](file:///Users/jcadavid/.claude/akili/templates/) *(packaged templates)*
  - **Affected Code File:** [.agents/implementer.md](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.agents/implementer.md) · [.agents/reviewer.md](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.agents/reviewer.md)
  - **Remediation:** Manual merge of the missing sections. Never overwrite — local additions (server-conventions blocks, tester suites) must survive.

- **M-12 — Tier/model mismatch: T6 Multimodal is inverted vs the packaged rationale.** Project registry sets T6 = `opus` with `sonnet` fallback; packaged sets T6 = **`sonnet` (vision)** with `opus` fallback, and flags Antigravity's Gemini Pro (vision) as "the strongest column for this tier" — a column the project does not have (M-1). Separately, OpenCode slugs are stale or unfilled: T2 `opencode-go/glm-5.1` vs packaged `glm-5.2`; T1, T4, T6 sit at `<CONFIRM SLUG>` where packaged now names `opencode-go/kimi-k3`, `opencode-go/deepseek-v4-flash`, and `opencode-go/qwen3.7-max` *(the last marked "weak")*. `author ≠ auditor` **holds** (T2 `sonnet` ≠ T3 `opus`) — no finding there.
  - **Affected Spec File:** [docs/model-routing.md:56-63](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/model-routing.md)
  - **Affected Code File:** packaged reference `akili-specs/docs/model-routing.md:116-123`
  - **Remediation:** Report-only. Reconsider T6 against the packaged rationale and fill the OpenCode slugs from the packaged table.

- **M-13 — Migration count understated: 304 actual vs "238+" documented.** TRD §5.2 says "238+ as of 2026-05" and `CLAUDE.md` §3 says "238+ migrations". Actual: **304** files in `src/db/migrations/`. Technically true ("238+") but three months stale, and the append-only rule makes the number a useful drift tell.
  - **Affected Spec File:** [trd.md §5.2](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md) · [CLAUDE.md §3](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Affected Code File:** [src/db/migrations/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/db/migrations/)
  - **Remediation:** **Update the docs** to "304+ as of 2026-08".

### 🟢 Low Priority (Style/Cleanups)

- **L-1 — Visual/Design Token Mismatch: 314 hex literals across 47 of 75 component SCSS files.** UX/UI §7.1 ("Do not hard-code hex values in new components"), §11 ("**never** hard-coded hex"), and `CLAUDE.md` §4.2 all forbid this. Violations are real styling declarations, not SVG assets — e.g. `global-alert.component.scss:57,69,73,77` (`#007bff`, `#ff9800`, `#f44336`), `project-item.component.scss:46` (`#112f5c`). Worse, several template-side literals re-hardcode *documented token values*: `#153C71` is `--ac-primary-blue-400`, `#777C83` is `--ac-grey-700`, `#4C5158` is `--ac-grey-800` per the §7.1 table. Dark mode cannot follow these.
  - **Affected Spec File:** [design.md §7.1, §11](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/design.md)
  - **Affected Code File:** [src/app/shared/components/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/shared/components/) *(47 files)*
  - **Remediation:** **Fix the code**, incrementally — token-swap the literals that map to existing `--ac-*` values first (mechanical + reversible), and add a lint rule so new ones cannot land. Bundle with H-3, which is the same problem seen from the template side.

- **L-2 — Persona injection bleed: scan-derived project context repeated across all four personas.** `ServerResponseDto`, `TypeORM`, `docs/trd`, and `server/researchindicators` each appear in **all four** `.agents/*.md` files (server path: leader=5, implementer=4, reviewer=2, tester=3) rather than being scoped to the role that consumes it. Personas are re-read on every subagent spawn, so each copy is a place the test command or path can go stale silently. **One of the two named tells is present:** directory boundaries are absent from `leader.md` (zero matches for "boundar"/"director"), which it needs to judge task independence. The other is **clean** — no design-token path leaked into `tester.md`.
  - **Affected Spec File:** `/akili-constitution` Step 8B → *Injection scope*
  - **Affected Code File:** [.agents/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/.agents/)
  - **Remediation:** Manual trim, never an overwrite — scope shared context to the consuming role and add directory boundaries to `leader.md`.

- **L-3 — Spec taxonomy says "exactly three files"; active specs carry five.** `CLAUDE.md` §2 mandates `requirements.md` / `design.md` / `task.md` and nothing else. Live specs carry `proposal.md` and `judgment.md` (produced by `/akili-propose`): `bilateral/primary-contributing-sp/` has requirements + design + proposal + judgment (no `task.md` yet — normal mid-flight), `bilateral/mapping-adjustments/` has proposal only. `docs/specs/` also holds `kaizen-log.md` and `quick/quick-log.md`, neither described by the §2 tree.
  - **Affected Spec File:** [CLAUDE.md §2](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/CLAUDE.md)
  - **Affected Code File:** [docs/specs/bilateral/primary-contributing-sp/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/specs/bilateral/primary-contributing-sp/)
  - **Remediation:** **Update the guide** — describe the full lifecycle file set and the log files.

- **L-4 — PRD still points at the two legacy doc paths its own guide says moved.** `prd.md:9` reads "Technical detail lives in `docs/detailed-design/`; UX system rules live in `docs/system-design/`" — both superseded by `docs/trd/` and `docs/ux-ui/` per `CLAUDE.md`'s legacy-path note. Neither legacy directory exists.
  - **Affected Spec File:** [prd.md:9](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/prd.md)
  - **Affected Code File:** [docs/trd/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/) · [docs/ux-ui/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/)
  - **Remediation:** **Update the doc** (one-line fix).

- **L-5 — `tools/core/` and `tools/dto/` violate the tool-module rule.** TRD §4.1 defines a tool module as "Encapsulates transport; exposes **one Nest service**". `core/` holds `base-api.ts` and `dto/` holds two partner-request DTOs — neither exposes a Nest module or service, so both are shared-helper folders living in the integrations namespace.
  - **Affected Spec File:** [trd.md §4.1](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md)
  - **Affected Code File:** [tools/core/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/tools/core/) · [tools/dto/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/domain/tools/dto/)
  - **Remediation:** Either relocate them under `domain/shared/` (code) or carve out an explicit "shared tool helpers" exception in §4.1 (doc). Doc-side is cheaper and equally honest.

- **L-6 — UX/UI cross-references to PRD open questions are misnumbered.** §9 and OG-3 both cite "OQ-6" for mobile portrait, but PRD OQ-6 is the AI-formalization pipeline — mobile is **OQ-11**. §11 cites "OQ-3" for dark/light parity, but OQ-3 is the `/admin` auth model — parity is **OQ-8**. Three broken pointers into the PRD.
  - **Affected Spec File:** [design.md §9, §11, OG-3](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/ux-ui/design.md)
  - **Affected Code File:** [prd.md §9](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/prd.md)
  - **Remediation:** **Update the doc** — repoint to OQ-11 and OQ-8.

- **L-7 — Registry `Updated:` stamp and effort baselining.** The project registry is stamped `Updated: 2026-07` and carries **no Effort dial section**, while the packaged default devotes a section to it (`model-routing.md:225`) and states that a new model generation "*does* require re-reading the **Effort dial** and the behavioural notes" even though the tier table needs no edits. With Opus 5 in service and no per-tier effort defaults recorded locally, those defaults have never been swept. **No frontier escalation pin exists**, so that sub-check is clean.
  - **Affected Spec File:** [docs/model-routing.md:54](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/model-routing.md)
  - **Affected Code File:** packaged reference `akili-specs/docs/model-routing.md:225`
  - **Remediation:** Report-only. Mirror the Effort dial section and re-stamp once effort defaults are reviewed.

- **L-8 — Two controllers without sibling specs, and an untracked artifact at the repo root.** `azure-data.controller.ts` and `azure-status.controller.ts` have no `*.spec.ts`, against the "sibling spec for every controller" rule (TRD §12, `CLAUDE.md` §4.1) — **only 2 of 131**, so compliance is otherwise strong. Separately, `task_T03_diff.txt` (21.9 KB raw diff, 2026-08-13) sits untracked at the repo root and is not gitignored.
  - **Affected Spec File:** [trd.md §12](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/docs/trd/trd.md)
  - **Affected Code File:** [src/controllers/](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/server/researchindicators/src/controllers/) · [task_T03_diff.txt](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/task_T03_diff.txt)
  - **Remediation:** **Fix the code** — add the two specs; delete or gitignore the stray diff.

---

## Conformance Matrix

| Spec Section | Code Reality Status | Alignment Status | Notes |
| :--- | :--- | :--- | :--- |
| Product Requirements (PRD) | Personas, goals, scope, roles model and constraints all match. `AC-Auth` allowlist incomplete (H-2); `AC-Real-Time` asserts a capability that cannot execute (H-1); `AC-API-Surface` Swagger rule violated at ~33% (M-4). Legacy doc paths at `:9` (L-4). | **Drifted** | Intent is sound; three acceptance criteria overstate what ships. Open questions (OQ-2 roles, OQ-3 admin auth) correctly still open — `AdminGuard` absent in code exactly as flagged, so **no finding**. |
| UX/UI Design / Screen Inventory | Token system, component inventory, navigation model and dark-mode mechanism all match. Inventory misses 4 shipped routes (M-8) and understates tabs (M-9); mandates an uninstalled Tailwind (H-3); 314 hex literals violate §7.1/§11 (L-1); 3 broken PRD pointers (L-6). | **Drifted** | The §8.1 "update the inventory in the same change" rule is not holding — every recent feature landed without an inventory row. |
| TRD (APIs/DB) | Envelope, URI versioning, `SecRolesEnum`, interceptor order, guards, coverage floors, budgets, `angular.json`, client state boundaries and integration map all verified accurate. Drift: 5 undocumented tool modules (M-5), 4th OpenSearch index (M-6), `ReportMsApp` (M-7), phantom socket events (M-3), unregistered socket module (H-1), migration count (M-13), tool-folder rule (L-5). | **Drifted** | The strongest document of the three. Drift is additive — code grew modules the TRD never recorded — plus two claims that are simply untrue (M-3, H-1). |
| Agent Guides (root + `## Module Guides` index) | All three child guides exist and are correctly indexed; `## Module Guides` entries resolve; `src/AGENTS.md` mirrors present in both packages. Drift: CodeGraph claim inverted (H-7), `AGENTS.md`↔`CLAUDE.md` mirror diverged (M-2), spec taxonomy stale (L-3), migration count (M-13). | **Drifted** | Index and structure are healthy; the factual claims inside are not. H-7 is a repeat failure on the same line — worth a self-verifying formulation, not a third correction. |
| Model Routing (registry + Step 8E wrappers) | Registry well-formed and internally self-consistent with its mirror and its 4 Claude Code wrappers; `author ≠ auditor` holds. Drift: Antigravity column absent (M-1), Antigravity wrappers absent (H-5), T6 inverted + stale OpenCode slugs (M-12), no Effort dial / stale stamp (L-7). | **Drifted** | Self-consistency is masking the gaps: everything agrees with everything else, and three of the six tiers still route a phase or a host nowhere. |
| Methodology Conformance (Phase→Tier Drift + `:59(c)` persona structural check) | **Phase→Tier:** resolved via source (a) — packaged `akili-specs/docs/model-routing.md` under `npm root -g` (high confidence, table). 6 differences, 0 `Accepted divergence` records: both Leaders T5-vs-T1 (H-4, High), `/akili-quick` T5-vs-T2, and 3 packaged phases absent locally incl. `/akili-seo` T3 (M-10). 9 phases match and are reported nowhere, per the no-confirmations rule. **Persona check:** templates resolved at `~/.claude/akili/templates/` (home root; no `--local` variant exists). Leader missing 7 sections incl. *Delegation Thresholds*/*Delegation Ceiling* (H-6); Implementer missing *Scope Discipline (Both Directions)* + *Not Done/Assumptions*; Reviewer missing *4R Lenses* + *FATAL_FAIL* (M-11). **Tester aligned.** All 4 templates had a deployed counterpart — nothing absent, nothing left unscored. | **Drifted** | The most drifted layer, and self-referentially so: `/akili-audit` Step 1 tells agents to apply a `leader.md` section that no longer exists there. |

---

## Recommended Next Steps

**Ordered by damage-per-fix, not by severity label.**

1. **Resolve the two "documented but inert" capabilities (H-1, H-3).** Both need a *decision* before either code or docs can be corrected: is client real-time shipping, and is Tailwind part of the stack? Each answer determines the remediation direction for a cluster of downstream findings (M-3 depends on H-1; L-1 shares a root with H-3). Cheapest path to a large conformance gain.
2. **Security-review `GET reports/:resultCode/pdf` (H-2).** A single question — is it intentionally public? — with a one-line doc fix or a code fix behind it. Do this before any doc sweep, so the allowlist gets updated with a verified answer rather than an assumption.
3. **Repair the methodology layer (H-4, H-5, H-6, M-1, M-10, M-11, M-12, L-2, L-7).** These are cheap, self-contained, and compounding: every future `/akili-execute` run is currently orchestrated by a `haiku` Leader reading a persona missing its delegation guardrails, with Antigravity unable to see the personas at all. Suggested order — merge the persona sections from `~/.claude/akili/templates/` (manual, never overwrite), scaffold `.agents/agents/` wrappers, restore the Antigravity column, then decide each Phase→Tier divergence (align or record with the exact `Accepted divergence` marker).
4. **Fix the CodeGraph claim once, durably (H-7, M-2).** Make the line self-verifying ("probe for `.codegraph/codegraph.db` at the repo root first, then per package") rather than a hardcoded path, and propagate to `AGENTS.md` so non-Claude hosts get it too. This line has now been wrong in both directions.
5. **Run one doc-truth sweep for the additive drift (M-5, M-6, M-7, M-8, M-9, M-13, L-3, L-4, L-5, L-6).** All ten are "code grew, doc didn't" or broken cross-references — mechanical, low-risk, and best batched into a single `/akili-constitution` refresh pass over `trd.md`, `design.md`, `prd.md`, and `CLAUDE.md`.
6. **Schedule the two mechanical code sweeps (M-4, L-1, L-8).** Add `@ApiBearerAuth` to the 43 controllers; token-swap the SCSS hex literals that map to existing `--ac-*` values and add a lint rule to stop new ones; add the two azure specs; remove `task_T03_diff.txt`. Good `/akili-quick` or task-spec candidates — no design decisions required.

**Suggested command routing:** step 1–2 need a human decision first. Steps 3–4 are `/akili-quick`-sized. Step 5 is an `/akili-constitution` refresh. Step 6 is a task spec under `docs/specs/`.
