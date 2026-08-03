# Validation Report — Project Dashboard / Indicator-metadata charts

> **Verdict: PASS with conditions. No FAIL findings.** The implementation satisfies every functional and non-functional requirement in `requirements.md`, and all gates re-ran green today.
>
> **The four documentation findings were remediated in this same session** (W-3, W-6, W-7, W-8 — see §11). What remains is **not code and not documentation**: the spec's own done-definition carries two owner-owned items — the **DC-8 visual check**, this spec's declared *dominant* defect class, and the product-owner acknowledgement.
>
> **Archive readiness: hold on the DC-8 pass.** Everything mechanical is earned. See §12.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/indicator-metadata-charts/` |
| Spec id | `2026-07-indicator-metadata-charts` |
| Validated | 2026-07-31 |
| Branch | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` @ `4ca27010` |
| Working tree | clean before and after all gate runs |
| Documents read | `proposal.md`, `requirements.md`, `design.md` (rev 4), `tasks.md`, `execution.md`, `evidence/t16-report.md`, `mockup/index.html` reference |
| Test report | **absent by design** — this spec ran `/akili-execute` with per-task Reviewer PASSes; test evidence lives in `execution.md` and `evidence/t16-report.md`, which were reused as the coverage substrate and cross-checked against a fresh run |
| Auditor model | Opus 5 (1M context). `## Model Routing` maps T3 Auditor → `opus`; the session model is a **newer generation** than that entry, so the tier is satisfied. **Registry entry is stale, not violated** — flagged for update, no downgrade recommended. |

---

## 2. Summary

| Dimension | Result | Note |
| --- | --- | --- |
| Task completion | **PASS** | 17 / 17 done, each with a Reviewer PASS in `execution.md` |
| File existence | **PASS** | All 20 files in design §3.1 present; no unexpected deletions |
| Build integrity | **PASS** | Server + client lint / build / full suite / coverage all green, re-run today |
| Requirement coverage | **PASS** | R-IMC-001…012 and NFR-IMC-001…005 all satisfied with code + test evidence |
| Linting & code quality | **PASS** | Clean both packages; 5 advisory 4R notes carried forward |
| Design conformance | **PASS** | DD-1…DD-12 honoured; DD-7's correction landed; DD-6's one exception is owner-authorised |
| Test evidence | **PASS** | 324 / 2069 server · 306 / 6292 client · coverage far above every floor |
| Constitution impact | **WARN → resolved** | One assigned doc hand-off (`--ac-chip-blue-*` → UX/UI §7.1 registry) was dropped; **folded in during this session** |
| Done-definition | **WARN** | 2 owner-owned items outstanding; 4 stale tracking documents **corrected during this session** |

**Counts:** PASS 8 · WARN 9 (4 remediated here, 5 carried) · FAIL 0 · BLOCKED 0.

---

## 3. Task Completion

All 17 tasks carry `Status: done` with a dated Reviewer PASS and an `execution.md` entry.

| Task | Status | Attempts | Evidence |
| --- | --- | --- | --- |
| T-01 recon | PASS | inline (Leader) | `execution.md` § T-01 — live rows, 10 joins executed |
| T-02 DTO split | PASS | 1 | § T-02 |
| T-03 / T-04 Q1+Q2 | PASS | 1 (joint) | § T-03 + T-04 |
| T-05 gender util | PASS | 1 | § T-05, mutation-verified |
| T-06 composition | PASS | 1 | § T-06 |
| T-07 server specs | PASS | 2 (1 rework) | § T-07 + retained attempt-1 trail |
| T-08 NFR-IMC-001 | PASS | 3 attempts (2 blocked) | § T-08 + § *Pivot Record* |
| T-09 Swagger | PASS | 1 | § T-09, document-level proof |
| T-10 client data | PASS | 1 | § T-10 |
| T-11 mapper | PASS | 1 | § T-11 |
| T-12 band component | PASS | 2 (1 rework) | § T-12 |
| T-13 host wiring | PASS | 1 | § T-13 |
| T-14 host specs | PASS | 1 | § T-14, commit `876ccf39` |
| T-15 a11y overlay | PASS | 1 | § T-15, commit `a3fbf5dd` |
| T-16 measurement | PASS | 1 | § T-16 + `evidence/t16-report.md` |
| T-17 doc currency | PASS | 3 (2 rework) | § T-17 |

**Execution-note quality — PASS.** Every task records what was proven and *how*, and — unusually — records what was **not** proven. Three self-corrections are retained rather than overwritten (T-14's stale status line, T-15's vacuous geometry probe, T-17's own misattributed correction record). That is the audit trail behaving as designed.

**W-1 (WARN) — budget tripwire breached and declared.** 4 rework rounds against a 2–3 budget. Declared in `execution.md` Document Control with the cause isolated (all of T-17's overrun was meta-work on the spec's own correction records, none on the feature). Surfaced at the moment it happened, per `/akili-execute` §2.4 — **acceptable, not absorbed**.

---

## 4. File Existence

Design §3.1's inventory verified file-by-file. **All present. No gaps.**

| Package | New | Modified | Verified |
| --- | --- | --- | --- |
| Server | `indicator-metadata-reports.repository.ts` (+spec), `reports-indicator-metadata.dto.ts`, `gender-distribution.util.ts` (+spec), `primary-contract-results.util.ts` (+spec), `session-type.enum.ts`, `agresso-contract.swagger.spec.ts` | `reports-full.dto.ts`, `agresso-contract.repository.ts`, `.service.ts`, `.controller.ts`, `.module.ts` | ✅ |
| Client | `indicator-metadata-bands.mapper.ts` (+spec), `indicator-metadata-band.component.{ts,html,scss,spec.ts}` | `contract-full-reports.interface.ts`, `contract-full-reports.mock.ts`, `get-full-contract-reports.service.ts`, `project-dashboard.component.{ts,html,spec.ts}`, `project-dashboard-card.component.{html,spec.ts}`, `styles/colors.scss` | ✅ |

Two files exist **beyond** design §3.1 and both are justified in the record: `primary-contract-results.util.ts` (RB-10 extraction, owner-authorised, `requirements.md` §4.2 amended to cite it) and `agresso-contract.swagger.spec.ts` (DC-10 CI gate, owner-authorised 2026-07-31). Neither is undeclared scope creep.

---

## 5. Build Integrity

Both packages, this validation session, clean tree before and after.

| Gate | Command | Result |
| --- | --- | --- |
| Server lint | `npm run lint` | ✅ exit 0, no fixes applied (tree still clean) |
| Server build | `npm run build` (`nest build` + admin `vite build`) | ✅ exit 0 |
| Server suite | `npm run test:cov` | ✅ **324 / 324 suites · 2069 / 2069 tests** |
| Server coverage | — | **84.21 / 74.62 / 84.76 / 84.27** vs floor **60** ✅ |
| Client lint | `npm run lint` | ✅ "All files pass linting" |
| Client build | `npm run build` | ✅ succeeded |
| Client suite | `npm run test:coverage` | ✅ **306 / 306 suites · 6292 / 6292 tests** |
| Client coverage | — | **99.33 / 98.03 / 99.14 / 99.56** vs floors **40 / 20 / 45 / 30** ✅ |

**Build warnings — pre-existing, not this spec's.** Three component-style budget warnings (`data-overview`, `result-ai-item`, `features`) and two CommonJS bailouts (`mapbox-gl`, `pdfjs-dist`). None names a file this spec touched. `indicator-metadata-band.component.scss` is inside budget.

**W-2 (WARN) — server coverage baseline is approximate.** My re-run reads **84.21 / 74.62 / 84.76 / 84.27**; `evidence/t16-report.md` recorded **84.16 / 74.62 / 84.67 / 84.22** on the same source. A ≤0.09 pp delta, direction-positive, far above the floor — **not a regression**, but it means the "not regressed" claim rests on numbers that are not byte-reproducible. T-16 already stated this limitation itself rather than rounding it up, which is why this is WARN and not FAIL.

**Environment boot smoke — not run.** `docs/infrastructure.md` still has **no `## Local Environment` contract** (RB-2, verified again here). The spec's own behavior was proven against the live `alliancereportingdb` during T-01/T-03/T-04/T-08, so nothing is unverified — but the documentation gap stands. **Recommend `/akili-constitution` Step 6B** so the next spec does not rediscover it.

---

## 6. Requirement Coverage

Every requirement traced to task → code → gate. Coverage evidence reused from `execution.md` and `evidence/t16-report.md`, cross-checked against the fresh suite run and against the source directly.

| Req | Task(s) | Code evidence | Gate | Result |
| --- | --- | --- | --- | --- |
| R-IMC-001 nature/type/readiness | T-03, T-07 | `indicator-metadata-reports.repository.ts:160,166` — `clarisa_innovation_types` joins on **`code`**, readiness label `CONCAT(l.level,'. ',l.name)`; union-level `ORDER BY section, count DESC, id ASC` at `:200` | `indicator-metadata-reports.repository.spec.ts` branch-position-pinned SQL assertions | **PASS** |
| R-IMC-002 OICR maturity | T-03, T-07 | `:175-180` — `result_oicrs` (plural) → `maturity_levels`, label `full_name` | same | **PASS** |
| R-IMC-003 policy type/stage | T-03, T-07 | `:193-198` — singular `policy_stage`, join `policy_stage_id`, label **`description`** | same + real-schema execution (T-03) | **PASS** |
| R-IMC-004 session format/type | T-04, T-07 | `:298-305` grouped independently | Q2 spec | **PASS** |
| R-IMC-005 gender combined | T-04, T-05, T-13 | `gender-distribution.util.ts:58-84` — one `Map` keyed on `id`, **two symmetric `accumulate` calls**, zero-totals filtered, re-sorted `count DESC, id ASC`. AC.5 note at `indicator-metadata-bands.mapper.ts:77` bound via the card's `description` input | `gender-distribution.util.spec.ts` incl. **group-only** fixture, mutation-killed both directions | **PASS** |
| R-IMC-006 degree conjunction | T-04, T-07, T-13 | `:309-319` — `session_type_id = ?` **AND** `session_length_id = ?`, **no** `degree_id IS NOT NULL`. AC.4 pill at mapper `:80` | DC-2 fixture (Engagement row + Short-term row, both carrying `degree_id`) | **PASS** |
| R-IMC-007 additive contract | T-02, T-06, T-07 | `ContractFullReportsDto extends ContractBaseReportsDto implements IndicatorMetadataSectionsDto` — all 10 fields non-optional by construction; repository body untouched | Service spec asserts the 17-field merge with the 7 base fields identical; empty-payload case asserts `[]` | **PASS** |
| R-IMC-008 bands + per-card binding | T-11, T-13, T-14 | Mapper `:166-189` — the 10 titles verbatim from §4.1; host `project-dashboard.component.html:313-334`, one `@for` | **10 separate per-instance assertions** (KZ-005 / DC-5), mutation-killed by cross-wire | **PASS** |
| R-IMC-009 band visibility | T-11, T-13, T-14 | Driven by the existing `indicatorsWithResults()`; `@if` wraps the **heading itself**; no `display:none` / `[hidden]` path in the added markup | 4 visibility cases incl. **all-non-primary** (DC-6) | **PASS** |
| R-IMC-010 unanswered-field state | T-11, T-13, T-14 | `empty: items.length === 0` at mapper `:246`; copy is two **separate** sentences so the emptiness claim is not bound to `N` | Exact-string assertion + A-1's hardened `card.emptyMessage` W-7 gate | **PASS** |
| R-IMC-011 loading/error/retry | T-13, T-14 | Inherited from `ProjectDashboardCardComponent`; `(retry)="reports.update()"` on every metadata card | Loading/error/retry asserted across all 10 cards | **PASS** |
| R-IMC-012 doc currency | T-09, T-17 | See below | — | **PASS** |
| ↳ AC.1 Swagger | T-09 | `@ApiOkResponse({ type: ContractFullReportsDto })` | `agresso-contract.swagger.spec.ts` — **CI-gated**, asserts the 200 carries a `$ref` and **no `$ref` dangles**; mutation-verified | **PASS** |
| ↳ AC.2 `trd.md:299` | T-17 | Reads "**17 fields (16 sections + `contract_id`)**"; zero "six sections" text survives (grep confirms) | verified against the DTO | **PASS** |
| ↳ AC.3 PERF-5 | T-17 | `trd.md:128` carries the **10 queries / two sequential batches / peak concurrency 8** note and explicitly does **not** claim the 4-request client count changed | re-derived from code by the implementer | **PASS** |
| ↳ AC.4 UX/UI record | T-17 | `docs/ux-ui/design.md:443-445` band pattern in the chart inventory; `:544-547` dated DD-5 / DD-7 / DD-9 / DD-10 in the decisions log | — | **PASS** |
| NFR-IMC-001 latency | T-08 | (a) p95 **174.5 ms** ≤ 3 s · (b) `max(Q1,Q2)` **92.7 ms** ≤ 250 ms · (c) server-side **19.45 ms** ≤ 50 ms via `SHOW PROFILES` | Verdict `pass`, DC-9 noise floor characterised first | **PASS** |
| NFR-IMC-002 a11y | T-12, T-15 | Band toggle is a real `<button>` with per-indicator accessible name; DD-14 overlay gained `tabindex="0" role="group" [attr.aria-label]="title()"` | `document.activeElement` assertions, not attribute presence | **PASS** (see W-8) |
| NFR-IMC-003 responsive | T-16 | 0 px overflow at **390 / 768 / 1440** at document, page-wrapper **and** grid level; KZ-006 control `control_forced_390` reproduces 594/598 px while the document metric reads 0 | `evidence/t16-report.md` §C | **PASS** |
| NFR-IMC-004 coverage | T-16 | §5 above | re-verified today | **PASS** |
| NFR-IMC-005 blast radius | T-15, T-16 | **Full** client suite, not targeted — 306/6292 green after the multi-host card edit | re-verified today | **PASS** |

### Negative constraints and strict validations — checked individually

| Clause | Where | Verified |
| --- | --- | --- |
| *BUT it must NOT* emit an entry for a NULL metadata id | R-IMC-001 | ✅ `INNER JOIN` on the lookup excludes it structurally, no separate predicate |
| *AND IT MUST* order `count DESC, id ASC` | R-IMC-001 | ✅ union-level `ORDER BY` (`:200`, `:367`), never per-branch |
| *AND IT MUST NOT* count a stage-less policy row in `policy_stage` | R-IMC-003 | ✅ independent branches, per-branch inner join |
| *AND IT MUST* treat NULL participant columns as 0 | R-IMC-005 AC.2 | ✅ `COALESCE(SUM(...),0)` in all three `gender_group` branches |
| *BUT it must NOT* emit a zero-total Non-binary entry | R-IMC-005 AC.3 | ✅ `.filter(row => row.count > 0)` |
| *AND IT MUST* report a **group-only** project's full distribution | R-IMC-005 AC.6 | ✅ symmetric `accumulate` — the prohibited subordinating rule is absent, and its absence is mutation-killed by the group-only fixture |
| *AND IT MUST* order **after** summing | R-IMC-005 AC.7 | ✅ `.sort()` after the merge, gated by a fixture where summing reorders |
| *AND IT MUST* apply the degree filter as a conjunction | R-IMC-006 | ✅ `AND` in SQL; **not** `degree_id IS NOT NULL` |
| *AND IT MUST* be asserted separately for each of the 10 instances | R-IMC-008 AC.2 | ✅ 10 distinct per-instance assertions |
| *AND IT MUST NOT* render a hidden/collapsed band for a zero-result indicator | R-IMC-009 AC.1 | ✅ `@if` removes from DOM; no CSS-hiding branch exists to regress into |

---

## 7. Linting & Code Quality

Clean in both packages. Architecture, API, security and design-system checks below; **4R findings are advisory** — none is a spec violation and none drives the verdict.

### Compliance checks

| Check | Result | Evidence |
| --- | --- | --- |
| Server envelope / routing / auth unchanged | ✅ | Read-only additive fields on an existing handler; no guard, role or route touched |
| Swagger completeness (root guide §4.1) | ✅ | `@ApiProperty` on every field **plus** `@ApiOkResponse` — and CI-gated, which exceeds the guide |
| Single shared scoping predicate (§4.2) | ✅ | `buildPrimaryContractResultsScopeSql()` is the one source; the old method is a one-line delegate, so its 8 call sites are untouched |
| Client standalone / signals / no NgRx | ✅ | Signal-backed collapse + expansion sets; `computed` accessors off one `payload` signal |
| No `HttpClient` in components | ✅ | Everything through `GetFullContractReportsService` |
| Design tokens, no hex literals | ✅ | `--ac-chip-blue-*` added per the client guide's new-token path; band dot bound from `indicatorSummaries()`'s colour |
| WCAG 2.1 AA contrast | ✅ | 6.00:1 light / 7.09:1 dark, computed not asserted; the light pair is identical to the live values, so **zero visual drift in light mode** |
| Security / authorization | ✅ | Gender emitted as aggregate totals only, never per participant. No new surface |
| Observability | ✅ | Both queries emit `LoggerUtil._debug` with `elapsedMs`, `totalRows`, per-section counts — and T-08 consumed them as its measurement source |

### Advisory — 4R lens sweep (does not affect the verdict)

| # | Lens | Finding |
| --- | --- | --- |
| A-1 | risk | **`MetadataCountDto.name!: string` over-promises.** Three label columns (`clarisa_innovation_types.name`, `clarisa_innovation_characteristics.name`, `policy_stage.description`) are nullable in their entities and the SQL deliberately does not `COALESCE`. The client models this honestly (`name: string \| null`); the **server DTO does not**, and this spec's `@ApiOkResponse` publishes that schema for the first time. Cheapest to correct now — no consumer to break. Owner-escalated in T-10, still open. |
| A-2 | readability | `indicator-metadata-band.component.scss:114` still comments *"4-card bands use a wider track so they land 2x2 instead of a 3+1 orphan row"* — the claim DD-7 **retracted**. T-17 was barred from CSS and the owner declined the layout change, so a retracted claim is alive in code where the next reader will meet it first. |
| A-3 | reliability | **Chip contrast has no CI gate.** Reverting the token pair leaves 15/15 green (mutation-confirmed). The escalation established that a *declared token pair* is computable (~25 LOC) even though rendered contrast is not — so DC-8's "cannot be automated" premise is overbroad here. Escalated, deliberately not minted. |
| A-4 | resilience | `toSafeCount` guards `null`/`undefined` but not `NaN`; a `NaN` would drop the whole category including the valid side. Unreachable from current SQL (`COALESCE` guarantees numerics) — a trap only if the util's input surface widens. |
| A-5 | readability | `@ApiOkResponse({ type: ContractFullReportsDto })` documents the **unwrapped** payload while the wire response is `ServerResponseDto` via `ResponseInterceptor`. Spec-conformant as prescribed, but a consumer reading `/swagger` would think the body *is* the DTO. Repo precedent `bilateral.controller.ts:113` pairs the pattern with a description naming the wrapper. |

Two "0 % branch coverage" readings (`if (!bucket) continue;` ×2, and the gender util's defensive guards at 70 %) are **unreachable by construction** and documented as such in three places. Correctly **not** to be "fixed".

---

## 8. Design Conformance

| Decision | Conformance |
| --- | --- |
| DD-1 two CTE-bound queries | ✅ Q1 6 branches, Q2 7 branches, one contract-id bind each |
| DD-2 / DD-8 symmetric gender merge | ✅ The prohibited subordinating rule is **absent** and its absence is mutation-gated — the exact place this design failed review three times |
| DD-3 base/full DTO split | ✅ Repository diff is the return type + import only |
| DD-4 existing enums + new `SessionTypeEnum` | ✅ No duplicate `SessionFormatEnum` / `SessionLengthEnum` created |
| DD-5 data-driven band model | ✅ One pure mapper, one `@for` |
| DD-6 do not modify the card | ⚠️ **One exception**, T-15 — attribute-only, owner-authorised via OQ-6, KZ-003 satisfied with a **full** suite. Recorded in RB-5. Conforms as authorised. |
| DD-7 grid | ✅ **Corrected 2026-07-31** in both spec and constitutional docs to describe real reflow behaviour incl. the sidebar-state dependency; the 768 px half-fix hazard was avoided |
| DD-9 in-memory collapse | ✅ Host signal, not persisted |
| DD-10 cards join the expansion contract | ✅ `[visibleLimit]` + `(expandToggled)` bound per card, keyed by `sectionKey`; DC-13 asserted at **both** directions of the 5-category boundary |
| DD-11 sequential composition | ✅ Step 1 awaited to resolution before step 2; `callOrder` gate retained |
| DD-12 step 2 is `Promise.all([Q1,Q2])` | ✅ Gated by the dedicated "both invoked before either resolves" assertion T-07 added, because `callOrder` provably cannot see it |

**Proposal alignment — PASS.** Intent ("10 new charts across 4 indicators, and nothing else"), non-goals (no drill-down, no `results_by_status` migration, no new CLARISA vocabularies, no charts for unnamed indicators) and success criteria B-SC1…B-SC7 all hold. Where `proposal.md` disagrees with `design.md`/`requirements.md`, its supersession banner already routes the reader correctly.

**Visual Reference — PARTIAL, and honestly so.** `mockup/index.html` is the designated visual reference. Delivered structure matches M-1…M-6 (bands not a flat grid, volume-ordered bands, cardinality-driven chart layout, collapsible default-open, Gender provenance note, Degree filter pill), and the per-indicator dot colours were corrected in T-12's rework after the Reviewer went to the mockup. **But the mockup's own layout numbers were never fidelity-transferred to the new band DOM**, and T-16's charter amendment says so explicitly rather than letting replica numbers stand in for app numbers. The app itself was then measured directly. This is the right resolution.

---

## 9. Test Evidence Summary

| Suite | Owner | Result |
| --- | --- | --- |
| `indicator-metadata-reports.repository.spec.ts` | T-07 | ✅ Branch-position-pinned SQL semantics; fails **closed** on reorder |
| `gender-distribution.util.spec.ts` | T-05 | ✅ Group-only + mixed + reorder fixtures, mutation-killed both directions |
| `primary-contract-results.util.spec.ts` | RB-10 | ✅ Each filter asserted individually; mutation-verified |
| `agresso-contract.service.spec.ts` | T-06 + T-07 | ✅ Sequencing, 17-field merge, "step 2 = 2 concurrent", empty-payload |
| `agresso-contract.swagger.spec.ts` | owner item 2 | ✅ DC-10 promoted from manual to CI; mutation-verified |
| `indicator-metadata-bands.mapper.spec.ts` | T-11 | ✅ 10 per-entry assertions (DC-5 / KZ-005) |
| `indicator-metadata-band.component.spec.ts` | T-12 | ✅ Real template; `document.activeElement`, not attribute strings |
| `project-dashboard.component.spec.ts` | T-13/T-14/T-15 | ✅ 4 visibility cases, 10 per-instance bindings, DC-13 both directions, A-1 + A-2 |
| `project-dashboard-card.component.spec.ts` | T-15 | ✅ No stub, real template — the only place overlay focusability is expressible |
| Full suites | T-16 | ✅ Re-verified in this session, identical counts |

**No `PRODUCT_BUG`, no `FAIL`, no flaky entry, no `AUTOMATION_DEFERRED` anywhere in the record.**

**Defect classes with no automated gate — as declared, not as drift:**

| Class | State |
| --- | --- |
| DC-4 wrong-but-valid label mapping | Declared ungateable in `requirements.md` §9 before this spec existed. `gender_group` id/name pairing is the residual instance, disclosed in T-07 |
| DC-7 layout regression | Substituted by real-Chrome measurement with a reproduced control ✅ **discharged** |
| DC-8 visual quality | **Owner's personal check is the gate of record — no record of it having run.** See §11 |

---

## 10. Agent Guide / Constitution Impact

`execution.md` carries no `## Constitution Impact` section, and none is owed — no module was created or reshaped and no boundary moved. Child guides `server/researchindicators/src/CLAUDE.md` and `client/research-indicators/src/CLAUDE.md` are unaffected by this spec's shape, and the parent `## Module Guides` index is current.

**W-3 (WARN → ✅ resolved 2026-07-31 in this session).** `design.md` §7.6 states the `--ac-chip-blue-*` fold-in *"does **not** touch the constitutional `docs/ux-ui/design.md` §7 token registry — that fold-in is owned by **T-17**"*, and T-12's carry-forward flags it as *"⚠ T-17 inherits one item"*. **T-17's charter and all eight acceptance boxes never carried it**, and the tokens are absent from `docs/ux-ui/design.md` §7.1 — a section headed *"Client tokens (authoritative)"*. They exist correctly in `styles/colors.scss` and `client/.../README.md`. Effect: the registry that calls itself authoritative was incomplete, while the precedent for a purpose-built pair already sat in that same table (`--ac-pool-funding-*`).

**Applied 2026-07-31 in this session:** a `Chip blue` row now sits in §7.1 carrying both themes' computed ratios (6.00:1 / 7.09:1) **and the failing near-neighbour** (`--ac-primary-blue-100` over `-300` → 3.88:1 light / 1.55:1 dark), so the next reader learns *why* it is a new pair rather than assuming the family was simply not checked. Nothing remains for `/akili-archive`'s Constitution & Graph Sync on this item.

---

## 11. Remediation

No FAIL findings. Nine WARNs, sorted by what actually matters.

### Blocking the spec's own done-definition (owner-owned)

| # | Finding | Action |
| --- | --- | --- |
| **W-4** | **DC-8 owner visual check not recorded.** `requirements.md` §9 designates it this spec's **dominant** defect class (spacing, contrast, truncation, band order, colour ramp — every one invisible to the 323 suites), names the owner as gate of record, and states plainly: *"the spec is not done when the tasks are done."* `execution.md` records the **commitment** (§ Owner decisions, item 4) but nothing records the **check**. | Run it on the rendered dashboard, record the result in `execution.md`. Or explicitly report DC-8 unguarded — `requirements.md` §9 permits that, as a decision. |
| **W-5** | **Product-owner acknowledgement unrecorded** (`tasks.md` §8, last box). | Record it, or strike the box with a reason. |

### Tracking drift — ✅ ALL FOUR REMEDIATED 2026-07-31 in this validation session

Owner-authorised at the `/akili-validate` pause. **Documentation only — zero test, fixture or source files touched**, so no gate was re-opened and none needed re-running.

| # | Finding | Applied |
| --- | --- | --- |
| **W-6** | `tasks.md:5` read **"in-progress — T-01 done; T-02 … T-17 todo"** and `:12` **"Last updated: 2026-07-30"** — stale by sixteen tasks. `/akili-resume` reading only that header would have re-dispatched the whole spec. | ✅ Flipped to complete / 2026-07-31, with the stale text **quoted and dated** rather than silently overwritten — same convention the rest of this spec uses. |
| **W-7** | **47 AC checkboxes unchecked, 0 checked.** `tasks.md` §8 requires each checked or explicitly recorded unverified. The evidence existed; the tracking was unfilled. | ✅ All 47 ticked, with a §6 header pointing at this report's per-AC trace and stating explicitly that **DC-8 is not an AC** and the §12 sign-offs remain the owner's. `requirements.md` Status flipped from `draft`. `tasks.md` §8's boxes filled: **9 of 11 `[x]` with their evidence inline, 2 left `⬜ OPEN — owner's`.** |
| **W-8** | `tasks.md` §7 status column stale: RB-3 discharged in T-03's body, RB-4's gate cleared by T-08, both reading `open`. | ✅ Both closed with the discharging evidence named. RB-1/2/5/6/7/8/9 left as-is — genuinely open or informational. |
| **W-3** | `--ac-chip-blue-*` absent from `docs/ux-ui/design.md` §7.1 *"Client tokens (authoritative)"* (see §10). | ✅ Added as its own family row, carrying both themes' computed ratios **and the failing near-neighbour** (3.88:1 / 1.55:1) that explains why it is a new pair rather than a reuse. |

**Deliberately not swept:** ~40 task-level acceptance boxes in `tasks.md` §3 (T-08's and T-09's most visibly) still read `[ ]` while their Status blocks record the evidence in full. Same drift class, but flipping boxes on tasks this validation did not individually re-audit would be **exactly the move RB-1 names as this spec's recurring failure mode** — a record asserting more than its source supports. Recorded as a note in §8 for whoever next touches those tasks.

### Carried advisories — owner's call, no action required to archive

| # | Finding |
| --- | --- |
| **W-9** | **`MetadataCountDto.name!: string` over-promises** against three genuinely nullable label columns, and this spec publishes that schema for the first time (advisory A-1). Cheapest to fix now; nothing breaks. |
| **W-10** | `indicator-metadata-band.component.scss:114` carries the 2×2 claim DD-7 retracted (advisory A-2). Recorded as *"Open, owner's call"* in T-17. |
| **W-11** | **T-15's box *"scrollable by keyboard alone"* was never observed on the shipped overlay.** T-16 measured an equivalent-shape `tabindex="0"` / `overflow-y:auto` container (`scrollTop` 0 → 120), and both `evidence/t16-report.md` and `docs/ux-ui/design.md` §10.1 disclose — precisely, unprompted — that the probe's own `ariaLabel` proves it was not the shipped element. **Focusability is proven; scrolling is inferred from native behaviour.** The disclosure is exemplary; the box is not literally earned. |
| **W-2** | Server coverage baseline is directional, not byte-precise (see §5). |
| **W-1** | Budget tripwire breached 4 vs 2–3, declared with cause isolated (see §3). |

**No spec drift requiring a doc update.** Every intentional divergence found — the RB-10 predicate extraction, the DD-6 exception, the DC-10 CI gate, the retired 1.5× bound, the DD-7 correction — is already recorded in `requirements.md` / `design.md` / `execution.md` with its authorisation and date. That is unusually clean.

---

## 12. Archive Readiness Recommendation

**Recommendation: HOLD for the DC-8 pass, then archive.**

| Criterion | State |
| --- | --- |
| All required tasks `[x]` | ✅ 17 / 17 |
| No unresolved FAIL | ✅ zero |
| WARNs accepted or followed up | ⚠️ W-3 / W-6 / W-7 / W-8 **remediated in this session**; W-1 / W-2 / W-9 / W-10 / W-11 accepted with the record; **W-4 / W-5 unresolved — they are the spec's own done-definition** |
| Tests cover key requirements + scenarios | ✅ |
| Drift reflected in docs | ✅ |
| User has reviewed this summary | pending |

The engineering work is finished and verified: every requirement satisfied, every gate green, every intentional deviation documented and authorised. What remains is the one thing this spec correctly refused to automate away — **the owner looking at the rendered dashboard.** `requirements.md` §9 anticipated exactly this moment: *"The spec is not done when the tasks are done."*

**W-3 / W-6 / W-7 / W-8 are already applied**, so the DC-8 pass is the only gate left. Once it is recorded, the spec is ready:

```text
/akili-archive project-dashboard/indicator-metadata-charts
```

Archiving before the DC-8 pass is defensible **only** if the owner chooses to record DC-8 as explicitly unguarded — which `requirements.md` §9 permits as a decision, not an oversight.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
