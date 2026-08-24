# Execution Log — Dashboard Narrative Pass (Project Dashboard v3.1)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/dashboard-narrative-pass/` |
| Approval Mode | gated — **owner directive at launch ("rápida y eficiente"): routine PASS gates auto-approved in chain; exceptions (HALT/Pivot/tripwire/FATAL) and the T-07 HITL always stop** |
| Branch | `bilateral-visual-improvements` |
| Leader session | Claude Code (Fable 5, T1) — same-session continuity from specify (zero re-reads); Implementer wrapper (sonnet), Reviewer wrapper (opus); author ≠ auditor held |
| Started | 2026-08-24 |
| Budget (design §13) | 7 tasks · ~450–650 prod + ~700–1,000 test LOC · 2 review rounds — tripwire armed |
| Wave plan | W1: T-01+T-02+T-04 (disjoint files, targeted verification) → W2: T-03+T-06 → T-05 → T-07 (full battery + HITL) |

---

## 2. Task Execution History

### T-02 — Visual-surface inventory closure — **PASS** (attempt 1)

- **Date:** 2026-08-24 · read-only evidence task · Effort low (no skill load — Leader deviation recorded: pure inventory)
- **Reviewer verdict:** `STATUS: PASS` — independently re-ran discovery repo-wide (10 data-bar sites, no truncation K-014), all mapped; the named disqualifier surface (inline status strip) found and classified; all 3 Leader adjudications verified on evidence (progressbar aria confirms meter; Distribution strip structurally identical to composition strip; unreachable branches confirmed via caller grep + `@else if` fall-through).
- **Scope declaration (KZ-017, per Reviewer):** scan folder-scoped to `project-detail/`; the two dashboard-rendered externals (`app-results-center-table`, `app-no-data-group`) were closed by the Reviewer's own grep over `shared/components/**/*.html` — no width-%/SVG data bar reachable from the dashboard outside the table below.

#### Closure table (deliverable — 23 surfaces, 0 unclassified)

| # | Surface | File:lines | Mechanism | Classification |
|---|---|---|---|---|
| 1 | Trend chart | `results-trend-card.component.html:61` | viz-chart | viz-chart |
| 2 | Status composition strip (bar `:416-428` + per-status share bars `:456` — TWO width-% mechanisms, range **`:383-469`** corrects requirements' `:383-440`) | `project-dashboard.component.html:383-469` | custom width-% + sr-only table + drills | **composition strip (declared)** |
| 3 | Timeline elapsed-% bar | `project-dashboard.component.html:284` | `role="progressbar"` single-value | **scoped OUT of R-DN-002** (meter, not data-viz — Leader adjudication 1; recorded in T-06 §8 exclusion) |
| 4 | Results-by-indicator heatmap/bars (morph) | `:540-546`, `:631-637` | viz-chart | viz-chart |
| 5 | Distribution strip (crossfade fallback — reduced-motion/no-VT, reachable) | `:590-601` | custom width-% part-to-whole | **composition strip (declared)** (Leader adjudication 2) |
| 6-9 | Top partner / primary levers / main contact / contributing projects | `:684-734` | viz-chart `layout="viz-bar"` | viz-chart |
| 10-12 | Top regions / countries / sub-national | `geo-scope-card.component.html:32-51` → `project-dashboard-card.component.html:85-102` | custom width-% `rows-partners` | **migrate at T-03** (OQ-2-A) |
| 13 | Geo scope map | `geo-scope-map.component.html:2` | viz-chart | viz-chart |
| 14 | SP alignment graph | `sp-alignment-graph.component.html:63` | viz-chart | viz-chart |
| 15 | Indicator deep-dive (velocity + 17 charts) | `indicator-deep-dive.component.html:28,102-172` | viz-chart | viz-chart |
| 16 | Insights section (5 charts) | `insights-section.component.html:60,208,259,327,378` | viz-chart | viz-chart |
| 17-18 | `project-dashboard-card` `columns` + default-branch bars | `project-dashboard-card.component.html:59-84,152-167` | custom bars, **unreachable** (only viz-bar/rows-partners callers; `@else if :37` falls through) | out-of-spec follow-up (Leader adjudication 3 — KZ-002: doesn't render) |
| 19-20 | card `rows-stacked-lever`/`rows-stacked` | `:103-151` | text/count | n/a |
| 21-23 | Executive overview / no-data-group / identity+KPI regions | (full files) | prose/KPI | n/a |

- **ADVISORY (recorded):**
  1. **→ T-03 brief (MANDATORY):** `layout` input defaults to `'columns'` (`project-dashboard-card.component.ts:37`) — a migrated caller that drops its `layout` attribute silently revives the dead pill bars; migration must keep explicit layout or sever the default dependency.
  2. **→ T-04/T-06 briefs:** the status surface is `:383-469` with TWO width-% mechanisms (composition bar + table share bars) — both move to the hero and both get named in the §8 idiom entry.
  3. Scope-declared (not scope-lucky) — noted above.
- **Requirements covered:** R-DN-002 inventory scenario + zero-unclassified BUT (KZ-002 closure by what renders).
- **Final verification:** Reviewer's independent repo-wide re-scan = table complete.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-06 — attempt 1 — **FAIL** (Reviewer)

- **Date:** 2026-08-24 · effort low. Placement/format/zero-touch clean; two content defects (one edit fixes both): (1) line-range citations wrong in the working tree (file shifting under concurrent T-04 edits — and internally inconsistent in time: prose describes post-T-04, numbers pre-T-04) → cite by component + stable DOM anchor, never line numbers; (2) only one of the surface's two width-% mechanisms named (T-02 advisory 2 unhonored) + idiom definition claims "sr-only table" but the Distribution instance's companion is a visible list → name both mechanisms, soften to "accessible text companion". Full report relayed verbatim to attempt 2.
- **Bonus observations from the Reviewer:** T-03's working-tree state already carries explicit `layout="viz-bar"` on all three geo cards (advisory-1 hazard clear); progressbar exclusion verified at live `:278`.

### T-01 — BUG: SSR regression spec + trend-series fix — **PASS** (attempt 1)

- **Date:** 2026-08-24 · Skills: `angular-developer` + `systematic-debugging` · Effort: medium (Bug Mode)
- **Files:** `results-trend-card.component.ts` (visualMap removed → two overlapping null-padded series solid/dashed, `connectNulls:false`; local `resolveDesignToken`/`axisTokens` — ALL option colors resolved-or-omitted per D-DN-5), `results-trend-card.component.spec.ts` (assertions migrated + var-omission + tooltip-dedupe tests), NEW `results-trend-card.ssr.spec.ts` (real-echarts SSR render of the real builder output).
- **RED observed (Bug Mode mandate):** on unmodified code the SSR spec fails with `TypeError: Cannot read properties of undefined (reading 'coord') at getVisualGradient (echarts.js:42629)` — the exact probe-confirmed crash. **GREEN after fix:** SSR 2/2 (no-throw, series strokes+symbols, solid AND dashed present, zero `var(--`, visualMap undefined, contract test). Targeted 18/18 `--coverage=false` · eslint clean.
- **Scope adjudication (implementer-flagged, Reviewer-CONFIRMED within spec):** axis/grid/symbol token resolution added beyond the series color — required by design §10 assertion (d) ("zero `var(--` in the SVG"; five pre-existing literals would have made it unsatisfiable); staying file-local was right (`chart-tokens.util`'s `resolveToken` unexported; editing it would touch 8 sibling cards against §1 non-goals).
- **Reviewer verdict:** `STATUS: PASS` — D-DN-1 implemented exactly; every R-IN… R-DN-001 clause asserted on generated SVG output; dark-mode resolution verified at source (`data-theme` overrides); drill series-agnostic (`event.name`); tooltip dedupe null-safe (radar `cfcd223d` trap avoided); zero hex in component code.
- **ADVISORY (recorded):**
  1. Clause (d) passed vacuously in the red run (throw → empty svg) — covered by the specify probe record + the migrated component spec's `JSON.stringify(options)` assertion which reds without a throw; nuance recorded here per Reviewer suggestion (K-004 clause-level honesty).
  2. **Sibling trap, unassigned:** `project-dashboard.component.ts:447,450` feeds `'var(--ac-grey-…)'` into the indicator-heatmap options — no crash (standard `inRange.color`) but axis colors silently inert. Out of T-01 scope; NO task owns it — recorded; owner may propose follow-up outside this spec.
  3. SSR assertion (c) attribute-order-coupled (echarts emit order) — sound today, fragile on major bumps.
  4. Test-title overstatement + **→ T-07 brief:** include `results-trend-card.ssr.spec.ts` in the tsc-spec delta check (K-002 — its casts are otherwise untype-checked).
- **Requirements covered:** R-DN-001 all clauses; design §2.1, D-DN-1/2/5.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-06 — Design-system registry update — **PASS** (attempt 2)

- **Date:** 2026-08-24 · **Attempts:** 2 (attempt 1 FAIL above — stale line citations + single-mechanism wording) · doc-only, effort low→medium
- **Files:** `docs/ux-ui/design.md` §8.1 — Chart idiom registry entry: composition-strip idiom (when-to-use, BOTH width-% mechanisms of the hero status surface named, accessible-companion wording covering both instances), progressbar-meter exclusion, rankings-via-viz-bar note. Citations by template-structural anchors (aria id / role+label text), zero line numbers — survives T-04/T-05 reorders.
- **Reviewer verdict:** `STATUS: PASS` — every anchor verified live and unique; the Distribution companion confirmed structurally inside the same crossfade branch; unrelated §8 rows byte-identical (disqualifier not tripped); progressbar exclusion re-confirmed at source. Evidence-hygiene note recorded: implementer's brief said `:601` for the `<ul>`, it is `:602` — irrelevant to the artifact (no line numbers in it), flagged because a spot-check claim failed last round.
- **Requirements covered:** R-DN-002 declared-idiom half; T-02 advisory 2 honored.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-04 — Status semaphore into hero (OQ-1-A) — **PASS** (attempt 1)

- **Date:** 2026-08-24 · Skills: `angular-developer` + `ui-ux-pro-max` · Effort: high
- **Files:** `project-dashboard.component.html` (template-only: hero gate widened `hasAnyContext() || !statusChartEmpty()`; status block moved verbatim into hero — figure + table + both drill anchors + aria + loading/error branches; chrome dropped per mockup Variante A; old Trend&Status row retired; trend re-paired with results-by-indicator keyed `!trendEmpty() && !indicatorsEmpty()`), `project-dashboard.component.spec.ts` (KZ-015 transition, zero-context case, status-empty collapse, re-pairing cases, drill href asserts).
- **Verification:** targeted 110/110 (`--coverage=false`) · eslint clean · K-004 reds quoted (queryParams→{} → `Expected substring: "statusTab=6"` red; old pairing restored → 2 reds) · both T-02-advisory-2 width-% mechanisms survive (`:375`, `:412`).
- **Reviewer verdict:** `STATUS: PASS` — verbatim move proven by diff shape (status body as context lines); re-pairing asserted via `parentElement` identity (structural, not class presence); chrome-drop matches mockup Variante A at source; header kept correctly (aria-labelledby needs the title node).
- **Adjudication 1 — PRECISE wording (Reviewer correction, KZ-014):** the status region's own loading/error branches survive and are reachable for the contract-dashboard dimension (status skeleton/error render while that loads), **but** the block lives in the hero's `@else`: while `getProjectDetailService.loading()` is true the status region renders **nothing** — asserted by the implementer's own spec. The earlier phrasing "not gated behind hero skeleton" overstated; this is the observed behavior.
- **ADVISORY (recorded):**
  1. (= the wording correction above, applied.)
  2. **→ T-07 HITL (MANDATORY):** new coupling — if summary resolves before project detail, the strip pops into the hero on project resolve; check "hero strip insert / CLS on project resolve" alongside the R-1 `md:` mobile check.
  3. **→ T-05 brief:** zero-context + status-data case leaves the hero's `aria-label="Project context summary"` describing contents it no longer matches — address while laying act-1 wrappers (within R-DN-003's act/aria scope).
  4. Stagger `animation-delay` attributes are presence-only (no keyframes target these widgets anywhere) — PRE-EXISTING, outside this spec; recorded only.
  5. **→ T-05 brief:** stale "Trend/Status" DOM-order comment at spec `:1920` — fold the comment fix into T-05's act-order rewrite.
- **Reviewer scope declaration (KZ-017):** read-only audit; jest/eslint claims stand on the implementer's runs; `strictTemplates` on the `[class.border-…]` binding form only provable by `npm run build` → T-07's battery covers it.
- **Requirements covered:** R-DN-002 a11y AND, R-DN-004 states BUT; design D-DN-6 OQ-1-A, reversion challenge 1.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-03 — Rankings migration to viz-chart (OQ-2-A) — **PASS** (attempt 1)

- **Date:** 2026-08-24 · Skills: `angular-developer` + `ui-ux-pro-max` · Effort: medium
- **Files:** `geo-scope-card.component.{ts,html,spec.ts}` only — 3 callers switched to explicit `layout="viz-bar"` with file-local builder helpers (exemplar's are private/unexported); `project-dashboard-card.*` untouched (pointer 2 honored).
- **Verification:** targeted 2 suites / 20 tests (`--coverage=false`) · eslint clean · K-004 reds: dropped-layout → `Expected: "viz-bar" / Received: ""` red (pointer-1 pinned); hex/width-% grep clean AND proven capable against a synthetic pill string.
- **Reviewer verdict:** `STATUS: PASS` — verified independently: test counts reconcile (14+6, zero deletions — disqualifier not tripped; reversion-challenge-2 vacuous, pill specs still exercise live methods); accessible-name chain traced end-to-end; `rows-partners` caller count now zero in production; all 5 decisions match exemplar conventions.
- **ADVISORY (recorded):**
  1. **→ T-07 HITL (MANDATORY):** the viz-bar builder family (these 3 geo bars AND the 4 already-shipped F1 rankings) feeds `var(--…)` colors into echarts options — the same silent-SVG-attribute trap D-DN-5 fixed for the trend. HITL must state explicitly whether all bars paint in token colors (not black/default) in light AND dark; a negative opens a follow-up over all 7 surfaces (outside this spec) and relocates the 2 pinning assertions.
  2. Unreachable-layout follow-up list is now THREE (`rows-partners` joins `columns` + default) — recorded here; T-06's §8 entry stands (it declares idioms by what renders).
  3. **→ T-07 HITL:** narrow-breakpoint look at act 3 (label width 120 + 200px height copied from a full-width host into a third-width column — jsdom can't evaluate, KZ-017).
  4. `escapeHtml`/`extractTooltipParam` duplicated (only in-scope option); natural later home `shared/utils/chart-tooltip.util.ts` — outside this spec.
  5. Evidence hygiene: jest line omitted package root (adjudicated unambiguous); `listCards[2]` identity assertion one line short (non-null+title covered) — recorded.
- **Requirements covered:** R-DN-002 migration half + zero-hex BUT + a11y AND; design §2.2/§6, D-DN-6.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-05 — attempt 1 — **PARKED `[~]` (runtime failure: session limit)**

- **Date:** 2026-08-24 ~16:20 Bogotá. `dn-t05` died mid-task on the account usage limit (resets 6:10pm Bogotá, progress saved); Leader session at the same boundary. NOT a work FAIL — no attempt consumed.
- **Working tree (UNCOMMITTED, do not discard):** partial T-05 edits in `insights-section.component.{ts,html,spec.ts}` + `project-dashboard.component.{ts,html,spec.ts}`. Last commits: T-04 `53390e3f`, T-03 `7e574f5c`.
- **Resume:** a wake message is ALREADY QUEUED in `dn-t05`'s inbox (fires when its limit resets) — if it dies again, `SendMessage` to `dn-t05` repeats the wake; its brief + 4 carried pointers stand. On its report: diff (pathspec insights-section + project-dashboard folders) → Reviewer → finalize → **T-07** (Leader battery: client full suite + coverage + build + tsc-spec delta vs re-measured baseline incl. `results-trend-card.ssr.spec.ts` [T-01 adv. 4] + bundle ±5 kB + tokens:validate; then **HITL con el owner** — mandatory named checks: viz-bar token colors light+dark over all 7 surfaces [T-03 adv. 1], hero strip CLS on project resolve + `md:` mobile [T-04 adv. 2/R-1], act-3 narrow breakpoint [T-03 adv. 3], acts vs mockup, below-the-fold network, drills).
- **Done so far: 5/7** (T-01 `da737237`, T-02 `88f8204e`, T-03 `7e574f5c`, T-04 `53390e3f`, T-06 `b1641a58`).

### T-05 — Six-act structure: reorder, subtitles, F4 observer move — **PASS** (attempt 1; one runtime interruption, no attempt consumed)

- **Date:** 2026-08-24 · Skills: `angular-developer` + `ui-ux-pro-max` · Effort: high · Session-limit park/resume mid-task (wake queued, worker resumed with saved progress).
- **Files:** `project-dashboard.component.{html,ts,spec.ts}` (six `<section aria-labelledby="act-N-title">` acts, number-chip + question headers, card markup relocated verbatim; `hasVisibleReachRankingCards` act-3 gate; T-04 pointer fixes landed), `insights-section.component.{ts,html,spec.ts}` (**RB-2 consumed once**: `visibleCards`/`instanceId`/`description` inputs, default all-six back-compat proven by the untouched T-08 real-HTTP case; + in-flight dedup guard in `triggerLoad()`).
- **D-DN-4 clarification (Reviewer adjudication 1b — recorded so it never reads as drift):** the protected invariant is the ONE FETCH (§2.3 lazy invariant), not a literal single observer. Three per-act observers are strictly better than one: the KPI "Review queue →" scroll jumps into act 6, where a single act-4 observer could never fire and keywords would skeleton forever. The single-fetch clause is spec-proven (race specs, Expected 1 vs Received 2 red-first) — and the guard also covers the IO-undefined `ngAfterViewInit` path (3 mounts → 1 fetch).
- **In-flight guard adjudication:** WITHIN the acceptance ("or a second fetch → red") — service dedupe only fires post-completion (`service:28` verified at source); `loading.set(true)` synchronous (`:32`) so the race spec mirrors production, not a mock fiction. Service untouched.
- **Card membership:** roster re-derived by the Reviewer from the T-02 closure table against the LIVE template — every pre-T-05 card in exactly one act, six `data-card` keys exactly once. Two flagged placements accepted: Top contributing projects → act 3 (with-whom); F4 contributing levers → act 4. English act copy per §2.3's own ES/EN clause.
- **Verification:** targeted 12 suites / 308 tests (`--coverage=false`) · eslint clean · tsc-spec **937 = baseline, zero new** (run by the worker) · `npm run build` clean (the one gate that could catch the `[visibleCards]` strictTemplates binding — run once, justified) · K-004 reds quoted (guard-off → Expected 1 Received 2 ×2; act swap → wrong-subtitle red).
- **Reviewer verdict:** `STATUS: PASS` — verbatim relocation proven by diff shape; all mandatory clauses confirmed incl. zero hex, act-sequence DOM spec with observed red, first-paint set unchanged, drills/F3 intact, pending table closes act 6, tri-states preserved, shared retry re-fetches for all, zero duplicate/stale DOM ids.
- **ADVISORY (recorded):**
  1. **→ T-07 HITL (MANDATORY):** error-path request count — on a FAILED shared load, later instances legitimately re-fetch (recovery, up to 3 where pre-pass had 1); the below-the-fold network check must exercise the FAILURE path and record it.
  2. Template array literals for `[visibleCards]` re-set OnPush inputs every parent CD ×3 (invisible to the suite) — hoist to readonly fields + freeze `ALL_INSIGHT_CARD_KEYS`; recorded (cosmetic/perf, outside gates).
  3. KZ-017: multi-instance single-fetch proven at `load()` call count (1 load ⇒ 1 GET holds directionally); wire-level double-fixture assert = cheap upgrade if ever revisited.
  4. A11y notes (nested same-name regions in zero-context branch; h2-in-h2 acts) — not AA failures → **→ T-07 HITL a11y pass**.
  5. `hasVisibleRankingCards` test at spec `:2968` asserts a computed no longer tied to rendering — retitle/retire later; recorded.
  6. Bookkeeping: T-03's first tasks.md box was left `[ ]` by a sed mismatch — fixed with this entry (evidence was already recorded in T-03's PASS).
- **Requirements covered:** R-DN-003 all clauses, R-DN-004; design §2.3/§6, D-DN-3/D-DN-4 (clarified)/D-DN-6.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-07 — Full gates (automated half) — evidence

- **Date:** 2026-08-24 (Leader battery, quiet window, post-T-05):
  - Client full suite + coverage: **319 suites / 6784 tests PASS**, coverage **97.91 / 92.23 / 97.34 / 98.28** (floors 40/20/45/30 ✓).
  - `npm run build` → 0 errors; **Initial total 1.12 MB — identical to the pre-pass baseline** (F4 T-09 battery, same branch; transfer 261.53 vs 261.52 kB = +10 bytes) ⇒ NFR-DN-002 ±5 kB ✓ (same-branch states, disqualifier respected).
  - `tokens:validate` → STATUS: PASS (0 errors), ramps monotonic both themes.
  - tsc-spec delta: **937 = baseline, zero new** (includes `results-trend-card.ssr.spec.ts` — T-01 advisory 4 honored).
  - K-004 global: every cited gate observed red at least once across T-01…T-05 (per-task reds recorded above).
- **Remaining for `[x]`: HITL (KZ-014, owner)** — named checks: (1) viz-bar token colors light+dark over ALL 7 bar surfaces (T-03 adv. 1 — the var() SVG-attribute question); (2) hero strip insert/CLS on project resolve + `md:` mobile (T-04 adv. 2 / R-1); (3) act-3 narrow-breakpoint bar labels (T-03 adv. 3); (4) six acts vs approved mockup, light+dark; (5) below-the-fold network incl. the FAILURE path (T-05 adv. 1); (6) F1 drills + F3 panel click-through; (7) trend chart visibly solid→dashed (the fixed bug, on real data); (8) a11y read-pass notes (T-05 adv. 4).

### T-07 — HITL finding 1 (owner, 2026-08-24): heatmap cell labels unreadable on dark cells

- **Evidence:** owner screenshot — "Results by indicator" heatmap: values 87/95 on the darkest cells are near-invisible (dark label on dark fill); light cells read fine. Defect class = "rendered visual quality — HITL is the gate" (requirements defect table row 6): a gate failure, so remediation is in-scope for T-07's close.
- **Known mechanism:** the heatmap builder (`project-dashboard.component.ts` — flagged at T-01 advisory 2) feeds fixed/inert label colors; per-cell contrast decision absent. The repo's own solved exemplar: F4 T-09's `contrastingLabelColor()` (resolved-token luminance per node, never `isDarkMode()` branching) in `insights-section.component.ts`.
- **Bounded fix dispatched:** heatmap cell-label color chosen by cell-value luminance (light label on dark cells, dark on light) + resolve the builder's `var(--…)` option colors per D-DN-5 (T-01's binding rule). Builder-output specs with jsdom-resolvable custom properties (F4 T-09 pattern).

### T-07 — HITL progress (owner, 2026-08-24)

- ✅ **Check 1 — viz-bar token colors:** owner confirms the horizontal bars (dashboard rankings + migrated geo) paint in token colors, not black/default — the `var()`-in-SVG-attribute concern (T-03 advisory 1) is EMPIRICALLY CLEARED for live-DOM rendering (echarts writes style-resolvable attributes in the browser; the SSR-string case remains the trap D-DN-5 guards). No 7-surface follow-up needed.
- ✅ **Check 7 — trend chart:** owner confirms "Results over time" renders and works on real data (solid→dashed) — the R-DN-001 fix visually verified.
- 🔄 Check for the heatmap-label fix (finding 1) pending remediation + re-look.
- ⏳ Remaining: hero strip/CLS + mobile · acts vs mockup light+dark · act-3 narrow breakpoint · network below-fold incl. failure path · F1/F3 drills.
- ✅ **Checks 2–6, 8 (owner, 2026-08-24): "todo lo demás se ve bien"** — hero strip + mobile, six acts vs mockup (light+dark), act-3 breakpoint, below-the-fold network, F1/F3 drills, a11y read-pass: approved. Owner directed spec close; the heatmap-label re-look after finding-1's fix is covered by this blanket approval + the fix's own builder-output specs (light-on-dark asserted) — owner may reopen on next visual pass if the rendering still disappoints.

### T-07 — HITL finding-1 remediation — **PASS** (attempt 1)

- **Files:** `project-dashboard.component.{ts,spec.ts}` — per-cell label color by resolved-ramp-stop luminance (bucketed, F4 idiom; zero `isDarkMode()` branching; theme-flip reactive via `chartTokens`); BOTH axes' chrome via local `resolveDesignToken` (T-01 advisory 2 closed for this builder); ramp omits when unresolved; **coupled click fix** (object-shaped data branch — Reviewer-adjudicated necessary, not scope: without it the F1 heatmap drill dies silently; branch ordering verified non-shadowing, drill target byte-identical).
- **Exemplar deviation adjudicated CORRECT:** F4's `contrastingLabelColor()` itself returns `var()` literals (the exemplar is the one that's wrong vs D-DN-5) — this fix resolves those tokens; the F4 file left untouched.
- **Verification:** targeted 114/114 · project-detail folder 12 suites / 311 · eslint clean · build clean · 3 K-004 reds observed against the restored pre-fix body (var() literal / tuple TypeError / object-shape click) · **final full client suite post-fix: 319 suites / 6787 tests PASS, exit 0.**
- **ADVISORY (recorded):** mid-ramp cells: label chosen vs nearest stop while fill interpolates continuously — if a mid-tone cell ever reads poorly, the mechanism is known (discrete `visualMap.pieces` or two-stop interpolation closes it); `insights-section` treemap still feeds `var()` literals into itemStyle/label (same D-DN-5 trap, live today, renders fine in live DOM per owner HITL) — **bounded follow-up candidate outside this spec**; `parseHeatmapRgb` duplication — lift both copies into `chart-tokens.util` when a third consumer appears.

### T-07 — Full gates + HITL close — **PASS** · SPEC COMPLETE

- **Date:** 2026-08-24. Automated half recorded above (suite/coverage/build/bundle-identity/tokens/tsc-937/K-004-global). **HITL (owner):** checks 1 & 7 confirmed explicitly (viz-bar token colors incl. the var()-question cleared empirically; trend solid→dashed working); finding 1 (heatmap labels) remediated + Reviewer PASS + spec-asserted light-on-dark; checks 2–6, 8 approved as "todo lo demás se ve bien"; owner directed close — the heatmap visual re-look rides the blanket approval, reopenable.

---

## 3. Summary — spec complete

- **Result: 7/7 tasks.** Trend-series crash fixed with an SSR regression harness (red→green); one declared visual language (rankings migrated to viz-bar, composition strip registered in the design system, inventory of 23 surfaces closed); six-act narrative structure with question-subtitles; F4 insights split across acts on ONE deduped fetch (race guard added, red-first); status semaphore in the hero; heatmap labels contrast-correct per cell.
- **Attempts:** T-01/T-02/T-03/T-04/T-05 first-pass · T-06 second-pass · T-07's HITL finding fixed first-pass. 1 review round consumed of 2 budgeted. Two session-limit interruptions parked/resumed with zero attempt loss.
- **Budget vs actual:** 7/7 tasks (=) · review rounds 1 vs 2 (under) · LOC net ≈ +2,900 insertions across 9 commits vs ~1,150–1,650 estimate — same overrun pattern as F4 (test-heavy; the prod/test split lesson under-corrected: even the split estimate ran low; Kaizen candidate: calibrate against measured F4/DN actuals, not intuition).
- **Owed at `/akili-archive`:** kaizen retrospective (candidates above + the parked/resumed runtime-failure pattern now twice-proven) · CodeGraph re-index · design.md §8 entry shipped in-spec (no archive sync owed for it).
- **Commits:** `88f8204e` T-02 · `da737237` T-01 · `b1641a58` T-06 · `53390e3f` T-04 · `7e574f5c` T-03 · `17cb0424` park · `05068f02` T-05 · (this) T-07 close.
