# Validation Report — Dashboard Advanced Analytics

- **Spec:** `changes/dashboard-advanced-analytics` · **Validated:** 2026-08-22 · **Validator:** session auditor (T3 pass, this session) at commit `b1142dba` (clean tree)
- **Evidence base:** `execution.md` (per-task PASS + reviewer audits), direct code inspection, **user-provided HITL evidence: 3 light-theme screenshots of the live app** (localhost:4200, contract A511)

## Summary — verdict first

**NOT archive-ready.** 2 FAIL, 3 WARN, rest PASS. The automated layer is genuinely green (13/13 tasks, 6,650+2,438 tests, builds, bundle, tokens, zero-hex). The live screenshots — the first real HITL input — surfaced **one rendering defect this spec shipped** (SDG chips render `[object Object]`) and **one layout defect** (triple nested scroll), and the dark/motion half of the HITL gate remains undischarged.

| Area | Result |
|---|---|
| Task completion (13/13, evidence-gated) | PASS |
| File existence (design tree present) | PASS |
| Build integrity (suites/builds at this exact clean commit) | PASS (recorded evidence current — tree unchanged since) |
| Requirement coverage | **FAIL** (R-DA-005) · PASS (R-DA-001/002/003/004/006/007/008/009 — automated halves) |
| Quality / UX audit | **FAIL** (nested scroll) + advisories |
| Design conformance | PASS (incl. endpoint-URL log correction, closed same day) |
| HITL gate D6/D9 | **PARTIAL** — light-theme half discharged by user screenshots; dark + motion + fluidity + Dev cross-check pending |

## Findings

### F-1 · FAIL · SDG chips render `SDG [object Object]` (R-DA-005 AC.3, AC.1 traceability)
- **Evidence:** user screenshot (Project Context strip); root cause confirmed in code: `project-context-strip.component.ts:114-128` maps `sdgs` with `String(item)` — but the source is `ClarisaSdg[]` **objects** (`{id, short_name, full_name, icon, color…}`, `lever-sdg-target.interface.ts:1`), so `String({…})` → `"[object Object]"` → prefixed `"SDG [object Object]"`. The mapper was written for primitives; the entity json carries objects.
- **Why the suite missed it (KZ-001 lesson):** the component spec's SDG fixtures presumably used string/number arrays — the shape the mapper expects, not the shape the server sends. The gate passed over the wrong fixture shape.
- **Remediation R-1:** map `short_name ?? full_name ?? 'SDG ' + id`; regression test with a **ClarisaSdg-object fixture** (red input: the current `String()` mapper must fail it).

### F-2 · FAIL · Triple nested scroll on the route (UX audit; layout patterns §6)
- **Evidence:** user report + screenshot (inner scrollbar visible beside the browser's). Candidate containers found: `project-detail.component.html:141` (`overflow-x-auto` tab-body wrapper), `:105` (`max-h-[132px] overflow-y-auto` contacts aside), plus the platform shell's own scroll region. Exact stack needs one live-DOM inspection.
- **Remediation R-2:** live-DOM audit of the scroll chain; collapse to **one** vertical scroll (the page); inner containers keep only horizontal overflow where tables genuinely need it.

### F-3 · WARN · HITL gate D6/D9 half-open
- Light-theme layout/hierarchy/KPI/context/toggle **verified** by the screenshots (order matches T-12's contract; caveat one-line + Learn more ✓; Bars|Heatmap toggle present ✓).
- **Missing:** dark-theme screenshots, morph keep-vs-crossfade decision, adjacency + `prefers-reduced-motion` emulation, graph fluidity on the largest Dev bilateral contract, Swagger screenshot, Dev count cross-check. SP graph itself not visible in the provided captures (below the fold) — unverified visually.

### F-4 · WARN · "Indicators covered 4 of 6 indicator types"
- PRD/TRD prose says **five** indicator types; the KPI renders "of 6" (data-driven denominator). Either the catalog grew (then the constitutional docs are stale — archive-sync item) or the denominator counts something else. Verify the source; do not silently accept either document.

### F-5 · WARN · `CENTER BUDGET $0 USD`
- **Not** a fabrication: `formatCurrencyUSD` returns `null` for null/undefined/empty (`project-context-strip.component.ts:14-21`), so the `$0` is a **real stored 0**. AC.1 holds. Advisory: product may prefer omitting or annotating true-zero center budgets — a copy decision, not a defect.

### Advisories (4R lens, non-blocking)
- "Many of the same charts": the four ranked cards remain bars **by design** (magnitude job — dataviz discipline); the new forms (graph, heatmap, timeline) are additive. Further variety = new scope (see Follow-ups).
- Total budget differs between shell header ($15,500,000) and context strip ($15,267,500) — likely `grant_amount` vs `grant_amount_usd`. Correct data, confusing adjacency: label the currency basis on both. (Copy advisory.)

## Requirement coverage detail

| Req | Verdict | Note |
|---|---|---|
| R-DA-001..004 (server) | PASS | SQL/UNKNOWN/byte-compat evidence in execution.md; endpoints verified conformant in code (query-param family form) |
| R-DA-005 | **FAIL** | F-1 (SDG); timeline-omitted-when-undated behavior verified correct in screenshot; F-5 resolved as real data |
| R-DA-006 | PASS | chart.js eradicated (grep 0); parity tests green |
| R-DA-007 | PARTIAL-PASS | init-option halves tested; visual halves → F-3 |
| R-DA-008 | PASS | 19 tokens validated both themes, monotonic ramps |
| R-DA-009 | PASS (automated) | structural table pairing enforced; visual keyboard pass → F-3 |
| NFR-DA-001 | PASS | initial 265.84 kB transfer; echarts in lazy chunk (624.71 kB transfer) |
| NFR-DA-002/005 | PENDING | Dev measurements → F-3 items |

## Out-of-scope user requests (recorded, not validation failures)

1. **Map library swap Mapbox → Leaflet** (no token, OSS tiles) — legitimate follow-up change; also retires the "Check the Mapbox access token" dev-facing error path. → propose `changes/leaflet-geo-map`.
2. **More chart-form variety on the remaining bar cards** — follow-up (the deferred Option C surface: chord/sankey candidates, dataviz-disciplined).
3. AI Executive Overview (grounded summary) — **verified present and functioning** in the screenshots (Image 2); relocated per the previous spec; no action needed, noted per the user's reminder.

## Remediation plan

| # | Action | Route |
|---|---|---|
| R-1 | Fix SDG mapper + ClarisaSdg-object regression test (red-before-green) | Bug-mode fix within this spec (rework of T-11) — blocks archive |
| R-2 | Scroll-chain live audit + single-scroll fix | Rework of T-12 — blocks archive |
| R-3 | Complete HITL: dark screenshots, morph decision, reduced-motion, SP-graph visual + fluidity, Swagger, Dev cross-check | T-13 completion — blocks archive |
| R-4 | Resolve the "6 indicator types" denominator vs PRD "five" | Verify + doc-sync note for archive |
| R-5 | Leaflet swap + chart-variety wave | New proposal (`/akili-propose`) — does not block archive |

## Archive readiness

**No** — after R-1..R-4: yes. Re-run `/akili-validate changes/dashboard-advanced-analytics` (delta check) or attach the missing evidence to `execution.md` and update this report, then `/akili-archive changes/dashboard-advanced-analytics`.
