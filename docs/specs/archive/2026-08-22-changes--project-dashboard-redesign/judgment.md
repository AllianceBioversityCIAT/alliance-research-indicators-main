# Judgment Day Ledger — project-dashboard-redesign / design.md

- **Target (immutable):** proposal.md + requirements.md + design.md as of 2026-08-21 (post reversion-challenge amendments)
- **Mode:** judgment_day · Round: 1 · Judges: 2 × blind read-only (T3/opus; author ≠ auditor)
- **Judge A verdict:** FINDINGS(4 severe, 12 warning, 1 suggestion) · **Judge B verdict:** FINDINGS(5 severe, 13 warning, 2 suggestion)
- **State:** findings merged; awaiting user decision on round-1 correction

## Confirmed SEVERE (both judges — fix-eligible)

| ID | Finding (merged) | Sources |
|---|---|---|
| S1 | Endpoint contract contradiction: requirements.md mandates a **path param** (`/contracts/:contractId/reports/results-summary`, 3 places) while design.md specifies **query param** `contract-id` (the correct sibling-matching form); no correction closure was recorded, so the two documents build different routes | JA-3 ≡ JB-1 |
| S2 | "Partner institutions" KPI tile has **no data source**: the top-partners DTO exposes neither a total nor a distinct count, the call is limit-4, and the mockup shows two numbers (24 partners / 11 countries) no touched endpoint supplies — as designed the tile fabricates "4" for every project | JA-4 ≡ JB-2 |
| S3 | Drill-through cannot work as designed: navigating child→parent on the same `:id` **re-runs no `ngOnInit`** (no RouteReuseStrategy/onSameUrlNavigation override), `initializeState()`-style snapshot reads never execute, `activateProjectResultsState()` doesn't run — and its `isOnlyPendingRevisionStatusFilter()` reset guard would **discard exactly a status-5 drill-through** | JA-2 ≡ JB-3 |
| S4 | Dark-theme cluster: (a) the named status palette **fails the validator in both modes** — dark ramp *inverts* (`--ac-green-500` dark `#14251a` ≈ 1.10:1 on `#191919`; `--ac-light-blue-300` dark 2.41:1), so no existing green/blue ramp member can serve as a dark chart mark → **new tokens are required**, and no token-registration step exists in the design; (b) the theme-flip scenario has **no producer** — `toggleDarkMode`/`isDarkModeEnabled` have zero call sites in `src/` (orchestrator-verified: navbar only injects the service), and PrimeNG's dark selector `.dark-mode` (app.config.ts:33) matches nothing (`colors.scss` keys on `data-theme`); (c) PrimeNG chrome (p-skeleton/p-chart/pButton) theme behavior unaddressed | JA-1 + JA-9 + JA-10(part) ≡ JB-16 + JB-5 |

## Contradiction — resolved

| Between | Point | Resolution |
|---|---|---|
| JA-10 vs JB-5 | JA: navbar "consumes" `isDarkModeEnabled()`; JB: the injection is unused | **Orchestrator grep (2026-08-21):** `alliance-navbar` imports and injects the service; **no call** to `toggleDarkMode`/`loadThemePreference`/`isDarkModeEnabled` exists anywhere in `src/` outside the service and specs. JB correct. Folded into S4(b). Note: `docs/ux-ui/design.md` §11 ("signal-based `DarkModeService`… `.dark-mode` class") describes a mechanism the code does not have — baseline-doc drift to record at archive time |

## Confirmed WARNING (both judges — info rows; cheap doc fixes may ride the fix round)

| ID | Finding | Sources |
|---|---|---|
| W1 | Sibling `reports/*` count is **six**, not five (new endpoint is the seventh); the no-`@Roles` conclusion itself holds for all six | JA-5 ≡ JB-6 |
| W2 | R-PD-004's sparse-years clause (<2 years → degenerate view + caption; y-axis at 0) has **no mechanism** in the design | JA-6 ≡ JB-8 |
| W3 | R-PD-009's accessible-name + data-table duty is designed **only for the trend chart**; status/indicator regions lack it, and the `title=`-only ban is unaddressed (4 `[title]` bindings in the touched template) | JA-7 ≡ JB-18 |
| W4 | Hex inventory incomplete: +12 TS literals in `project-dashboard.component.ts` (grounding colors :87-89, alert `#E69F00`/`#035BA9` :363/:376, `#1689CA` :527, 6-hex map :552-557), +4 Mapbox paint hexes in `geo-scope-map.component.ts` (paint expressions can't take CSS vars — needs the runtime-resolution path + re-style on flip), and `section-header` (D-PD-7-touched, 8 template hexes) missing from the file tree; two in-scope hexes (`#78288c`, `#E69F00`) have **no token equivalent** → new tokens + registration | JA-8 ≡ JB-12 (+ JB-7, JB-11 overlap) |
| W5 | §13 budget cites a proposal LOC estimate (~900) that **proposal.md does not contain** | JA-11 ≡ JB-13 |
| W6 | `GET_ResultsCount` is 3 components but **4 production invocations** (section-header ×2; the second keyed by a *different* contract id from `GET_Alignments`) — dedupe key/`invalidate()` semantics must handle it | JA-13 ≡ JB-14 |
| W7 | "Pending revision" tile's in-page anchor/scroll link has no mechanism | JB-9 ≡ JA-17 |
| W8 | Table naming: entity is `report_years` (and the year value is its PK — the join is unnecessary); requirements' `result` should be `results` | JA-15 ≡ JB-19 |

## Suspect (one judge — recorded, not auto-fixed)

| ID | Finding | Source | Orchestrator note |
|---|---|---|---|
| SU1 | **`is_primary` semantics change the counts**: today's chart counts `contract-codes` links (primary or not); the shared subquery is primary-only → R-PD-001's cross-check scenario becomes unsatisfiable as written, and the drill-through table (`contract-codes` filter, no primary flag) would show different numbers than the chart | JB-4 (severe) | Evidence concrete (result.repository.ts joins without `is_primary`); recommend fixing with S-round approval |
| SU2 | `result_status_id` is **nullable** → inner-join status bucket drops NULL-status rows while `by_year` keeps them, breaking AC.2's sums; needs join type + null-status bucket stated | JB-15 | Concrete; cheap design fix |
| SU3 | The pending-revision table is one of R-PD-007's seven regions but is a shared component declared behavior-unchanged — its three-state participation is unspecified | JB-10 | Real tension between R-PD-007 and the non-goal |
| SU4 | R-PD-001 AC.4 (401 envelope) has no gate in the D1–D9 table | JB-17 | Add gate row or accepted-risk note |
| SU5 | "View all" says *full list* but the server caps at 100 and the design forbids server changes | JA-12 | Wording fix + cap disclosure |
| SU6 | D-PD-7's dead-code rationale misstates the consumer (`formatIndicatorName` is optional-chained with `full_name` as a live fallback; deletion is safe because server-supplied `full_name` survives) | JA-14 | Rationale correction only |
| SU7 | NFR-PD-004's validator script lives only in a transient skill cache, not the repo/PATH | JA-16 | State the execution context in the gate |
| SU8 | Data-region count changed 6→7 across documents with no note | JB-20 | One-line note |

## Verified-clean highlights (both judges)

Sibling pattern/`buildPrimaryContractResultsSubquery` predicates, `normalizeReportLimit`, chart.js/primeng versions + zero imports, lazy chunk, `primaryContractId.set(null)` on results-center init, 140-hex template census (34/66/28/6/6), all pinned-test line refs, `GEO_SCOPE_SUMMARY_COLORS` dead, D-PD-9's `#groundingFileInput` basis, mockup contents.

## Round log

| Round | Action | Result |
|---|---|---|
| 1 | Dual blind judgment | 4 confirmed severe (S1–S4), 8 confirmed warnings, 8 suspects, 1 contradiction (resolved by orchestrator evidence) |
| 1 | Correction — **user-authorized scope: "Fix only" (no re-judgment), severe + concrete** | Applied 2026-08-21 to requirements.md + design.md: S1 (query-param form adopted, requirements corrected in 3 places), S2 (`partner_institutions` distinct count added to the aggregate; unsourced sub-caption dropped), S3 (drill-through reworked to a shell `queryParamMap` subscription + generic `initializeScopedResultsTable` overriding the pending-revision reset guard), S4 (new `--ac-viz-*` token family D-PD-13; theme scenario reframed attribute-driven D-PD-14; jsdom contract in D-PD-5), SU1 (primary-only semantics declared, D-PD-12; cross-check re-anchored), SU2 (null-status bucket), W1–W8 mechanisms (sparse-year stat+caption, a11y contract for all three chart regions + `title=` ban, full hex inventory incl. Mapbox/section-header, budget attribution fixed, 4 invocations, pending-tile scroll link, `report_years`/no-join). SU6's rationale correction folded into the D-PD-7 edit. Forward+backward sweep run (grep of superseded forms — path param, "five sibling", old palette tokens) |
| 1 | Re-judgment | **Waived by user decision ("Fix only")** |

**JUDGMENT: APPROVED ✅** *(fix-only path explicitly authorized by the user; scoped re-judgment waived — residual suspects SU3/SU4/SU5/SU7/SU8 remain info rows for `/akili-execute` and the archive Kaizen)*
