# Validation Report — results-center / url-filters

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/results-center/url-filters` |
| **Spec id** | 2026-08-url-filters |
| **Validated** | 2026-08-13 |
| **Validator model** | `opus` (T3 Auditor) |
| **Author ≠ auditor** | ✅ Implementer ran on `sonnet`; this audit on `opus` |
| **Phase before** | EXECUTE complete (12/12), TEST phase skipped by user decision |
| **TEST phase** | **Deliberately skipped** — user chose validate→archive directly. T-11 and T-12 were themselves test-authoring tasks; no `test-report.md` exists and none is expected. Coverage evidence was re-derived here from a live full-suite run rather than reused |

---

## 2. Summary

**Verdict: PASS — 0 FAIL. Archive is blocked on exactly one item, and it is a human action, not a defect.**

| Result | Count | Detail |
| --- | --- | --- |
| **FAIL** | **0** | — |
| **WARN** | **5** | 1 open (W-1), 1 recorded and routed to Kaizen (W-2), 3 corrected during this phase (W-3…W-5) |
| **BLOCKED** | 0 | — |
| **Advisory** | 5 | 4 carried forward from `execution.md`; 1 of them independently re-verified here |

Every functional and non-functional requirement is implemented and gated by a test that can fail. Both suites are green, both packages lint clean, the client type-checks. The single thing standing between this spec and archive is the **D6 manual cross-package check** — the blind spot the spec itself named up front and never pretended to have closed.

**The three documentation corrections applied here are all the same defect class this spec has been fighting all along:** a figure or citation that was true when written, carried forward after it stopped being true. That is the fourth recurrence, and it is the Kaizen datum.

---

## 3. Task Completion

| Check | Result |
| --- | --- |
| T-01 … T-12 all `[x]` | **PASS** — 12/12 |
| Every completed task carries execution notes | **PASS** — `execution.md` (1,306 lines) records every task, both reviewer lenses, and all three rework rounds |
| Rework within the per-task budget of 3 | **PASS** — T-08, T-11, T-12 consumed one round each; nine of twelve passed on attempt 1; no task reached attempt 3 |
| HALTs / FATAL_FAILs / pivots | 0 HALTs · 1 Pivot (T-11 → D-URL-17, user-decided, option C) |

---

## 4. File Existence

Verified against `design.md` §2.1. **PASS — every file present.**

| File | State |
| --- | --- |
| `…/results-center/url/results-center-url.vocabulary.ts` | ✅ new · 205 L |
| `…/results-center/url/results-center-url.codec.ts` | ✅ new · 531 L |
| `…/results-center/url/results-center-url.codec.spec.ts` | ✅ new · 561 L |
| `…/results-center/url/results-center-url.vocabulary.spec.ts` | ✅ new · 236 L |
| `…/results-center/results-center.component.ts` | ✅ modified · 621 L |
| `…/results-center/results-center.component.spec.ts` | ✅ rewritten · 1,836 L |
| `…/results-center/results-center.service.ts` | ✅ modified · 1,143 L |
| `…/results-center/results-center.service.spec.ts` | ✅ extended |
| `…/home/components/data-overview/*`, `…/main-actions/*` | ✅ modified |
| `…/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` | ✅ extended |
| `…/project-detail`, `…/select-linked-results-modal`, `…/links-to-result` specs | ✅ extended |
| `server/…/notifications/capdev-bulk-notification.service.ts` (+ `.spec.ts`) | ✅ modified |

> The dashboard spec lives at `project-detail/components/project-dashboard/`, not at a top-level `project-dashboard/`. `design.md` cites it by call site (`project-dashboard.component.ts:215`), which resolves correctly.

---

## 5. Build Integrity

All commands run fresh during this validation, on a tree with no uncommitted code changes.

| Check | Command | Result |
| --- | --- | --- |
| Client tests | `npm test -- --silent` | **PASS** — 309/309 suites · 6,479/6,479 tests · 21.1 s |
| Client coverage | (same run) | **PASS** — statements **99.27%** · branches **98.09%** · functions **99.17%** · lines **99.5%** |
| Server tests | `npm test -- --silent` | **PASS** — 328/328 suites · 2,217/2,217 tests · 21.5 s |
| Client lint | `npm run lint -- --quiet` | **PASS** — all files pass |
| Server lint | `npm run lint -- --quiet` | **PASS** — exit 0 |
| Client type-check | `npx tsc --noEmit -p tsconfig.app.json` | **PASS** — exit 0 |
| Lint mutation check | `git status --short` after both lint runs | **PASS** — the `--fix` flag changed nothing |

Coverage floors (40/20/45/30) are cleared by a margin of roughly 60 points on every axis.

**Environment boot smoke:** not run. `docs/infrastructure.md` states there is no local database and each package runs against remote shared infrastructure; booting adds no signal this spec's suites do not already provide, and the one thing a boot *would* prove is exactly the D6 manual check (W-1), which is reserved for the human.

---

## 6. Requirement Coverage

Verified at **scenario and clause granularity** — every `BUT it must NOT` and `AND IT MUST` traced to a named, falsifiable test.

| Req | Verdict | Evidence |
| --- | --- | --- |
| **R-RCU-001** — canonical vocabulary | **PASS** | Six params in `CANONICAL_PARAM_NAMES`. AC.3 (`?CONTRACT=a100`) asserted with that literal. AC.4 bidirectional parity + uniqueness in `vocabulary.spec.ts`. AC.5 — slugs byte-identical to `QueryIndicatorsEnum`; `cap_sharing` absent from the URL layer |
| **R-RCU-002** — deep link applies | **PASS** *(AC.4 as narrowed by D-URL-17)* | Read path `results-center.component.ts:327-436`. AC.3 state parity asserted on rendered DOM after control-list resolution. AC.6/AC.7 scope resolution covered both directions. **AC.4 is verified only for the URL layer** — see the scope-correction note below |
| **R-RCU-003** — filters written back | **PASS** | `urlWriteEffect` `:213-260`. Six tests, one per canonical param. AC.2 round-trip property. AC.3 zero extra fetches. AC.4 history depth — `replaceUrl`, `relativeTo`, `queryParamsHandling: 'merge'` pinned on **every** call. R2-1 guard asserts the resulting URL **string**, not the serializer output |
| **R-RCU-004** — URL beats session | **PASS** | `hadRecognizedParam` gate. AC.3 (`?utm_source=email` alone does not suppress restore) explicitly asserted |
| **R-RCU-005** — invalid degrades | **PASS** | Per-token validation; bounds `MAX_LIST_PARAM_VALUES = 50` / `MAX_PARAM_TOKEN_LENGTH = 64`; `getAll()` flattening. AC.2 one toast per navigation. AC.3 satisfied structurally — the toast names **counts, never values**, which is stronger than escaping |
| **R-RCU-006** — legacy forever | **PASS** | **R3-3 verified by direct read**: `LEGACY_PARAM_NAMES = ['indicatortab','statustab','statuslabel']` stored **folded** (`vocabulary.ts:162`), so folded incoming keys match. This is the single line that, if regressed, silently breaks every delivered email. AC.3 — `statusLabel`'s value never reaches the chip (label resolved from the control list per D-URL-10) |
| **R-RCU-007** — one scheme | **PASS** | AC.1/AC.1b — both Home cards emit `{ status\|indicator: slug, tab: 'my' }` (`data-overview.component.ts:105,114`); `main-actions` emits `{ tab: 'my' }`. AC.2 — server emits the notified group's own `agreement_id`, proven across two differing ids. **AC.3 independently re-verified**: a word-boundary grep across both packages finds **zero** producers of `indicatorTab`/`statusTab`/`statusLabel` |
| **NFR-RCU-001** — no loop/dup fetch | **PASS** *(as narrowed)* | Loop guard compares the **merged** result, not the raw serialization (`:238-243`). Entry-value guard `:214-217` no-ops the mandatory creation run **by explicit guard, not by comparison luck** |
| **NFR-RCU-002** — drift detection | **PASS** | Layer 1 parity test + layer 2 runtime completeness effects (`:107`, `:128`). The spec states plainly that layer 1 cannot see a server-side addition — that honesty is the requirement, and it is met |
| **NFR-RCU-003** — no user ids in URL | **PASS** | `serialize` emits only `tab`. Asserted on the written URL **string** for both scopes, with the sentinel seeded into `create-user-codes` — the same signal key production writes to — after attempt 1's version was found structurally incapable of failing |
| **NFR-RCU-004** — history hygiene | **PASS** | `replaceUrl: true` pinned on every navigate call |
| **NFR-RCU-005** — shared-consumer isolation | **PASS** | All four consumers carry real-service isolation blocks. The dashboard block uses the **real** `ResultsCenterService` with a **positive control** (asserts the fixed `status-codes: [5]` filter actually landed), so it cannot pass against deleted production wiring — KZ-001 discipline correctly applied |

### The one narrowed claim, restated plainly

**R-RCU-002 AC.4 and NFR-RCU-001 do not mean a Results Center load issues one request.** Today it issues **two**. The second comes from the results table's own `lazyLoadOnInit` → `handleResultsTableLazyLoad` → unconditional `void this.main()`, wiring that is present on `main` and predates this spec entirely. This spec owns the URL layer's contribution — exactly one request, seeded before it fires — and that is what passes. The whole-page defect is real, is **not** absorbed into documented behavior, and is tracked in `docs/specs/bugfix/results-center-double-fetch`.

This narrowing was a user decision (D-URL-17, option C), taken at a pivot with two named alternatives rejected on the record. It is legitimate scope management, not a silent retreat — and the spec found the defect without being asked to.

---

## 7. Linting & Code Quality

Lint, type-check and both suites are clean (§5). The 4R sweep found **no spec violations**. Advisory findings follow — none gate archive.

### Carried forward from `execution.md` (T-12 review)

| # | Lens | Finding |
| --- | --- | --- |
| **A-1** | reliability | **The two GREEN mutation cells are correct but *incidental*.** `initializeProjectDashboardResultsTable` and `clearAllFiltersWithPreserve` don't increment the counter today, so a counter-gated leak is unobservable there — correctly. Add a bump to either and those blocks silently become unfalsifiable **with no test turning red**. The durable pin is one line each: `expect(realResultsCenterService.userFilterMutations()).toBe(mutationsBefore)`. Not actioned: §2.4 forbids an advisory widening a task |
| **A-2** | risk | **A live production defect, out of scope, needs its own spec** — re-verified independently below |
| **A-3** | readability | The four T-12 block comments (20–45 lines each) carry mutation-testing rationale for mutants that were reverted, so it corresponds to no code in the tree. Content is correct; its durable home is `execution.md`, where it now also lives |
| **A-4** | risk | `TestBed.flushEffects()` is `@developerPreview` on this Angular version, superseded by `TestBed.tick()` later. Already used in **19** spec files, so this diff adds no new exposure — but an Angular bump touches all of them at once |

### A-2 — independently re-verified during this validation

The advisory is **confirmed**. Traced through source rather than taken on report:

| Step | Location | Effect |
| --- | --- | --- |
| 1 | `results-center.service.ts:996` | `withPreservedIndicators` sets `'indicator-codes-tabs': preserved` |
| 2 | `:1006-1007` | applied to **both** `resultsFilter` and `appliedFilters` |
| 3 | `:1023` | calls `onSelectFilterTab(0, { skipBump: true })` |
| 4 | `:740`, `:747` | unconditionally sets `'indicator-codes-tabs': indicatorId === 0 ? [] : [indicatorId]` → with `0`, **`[]`** on both signals |

**`clearAllFiltersWithPreserve`'s `preserveIndicatorCodes` parameter is dead.** Both call sites — `select-linked-results-modal.component.ts:262` and `links-to-result.component.ts:169` — pass `[...MODAL_INDICATOR_CODES]` (`[1,2,3,4,6]`) in the apparent belief the modal's indicator-tab scoping survives. It does not.

**Not a FAIL for this spec.** url-filters' only requirement on this method is that it must *not* advance `userFilterMutations`, which it correctly satisfies via `skipBump: true`. The defect is pre-existing and untouched. It is the **second** live production defect this spec surfaced without being asked to. Disposition: record, do not fix here, let `/akili-propose` decide.

---

## 8. Design Conformance

Every structural decision verified by reading the implementation, not the report.

| Decision | Conforms | Evidence |
| --- | --- | --- |
| **D-URL-9** — write is component-scoped, never a service method | ✅ | `urlWriteEffect` lives on `ResultsCenterComponent` `:213`. No `router.navigate` anywhere in `results-center.service.ts` |
| **D-URL-15** — counter is the effect's **only** tracked dependency | ✅ | `:214` reads the counter; everything else inside `untracked()` `:220` |
| — entry guard is explicit, not comparison luck | ✅ | `writeEffectEntryMutationCount` captured at field-init `:211`; guard `:215-217` |
| **D-URL-16** — nulls for every inactive canonical key | ✅ | `codec.ts:502-518` |
| **R3-2** — legacy keys nulled too, in **original camelCase** | ✅ | `codec.ts:526-528` iterates `LEGACY_PARAM_NAMES_ORIGINAL_CASE` — correct, since the URL carries camelCase while lookups are folded |
| **R3-4** — `tab` emitted only for `my` | ✅ | `codec.ts:517` — `scope === 'my' ? 'my' : null` |
| **R3-3** — recognized-key list stored folded | ✅ | `vocabulary.ts:162` |
| **D-URL-14** — tab-strip sync reads both deps above the guard | ✅ | `:177-179` |
| **D-URL-17** — table's lazy fetch out of scope | ✅ | Documented in requirements §3, design §12, and split into its own spec |
| Step 4 compares the **merged** result | ✅ | `:238-243` |
| §6.1 step 9 — `initializeState` performs no navigation | ✅ | Both wipes gone; `:447` comment records the handoff to `urlWriteEffect` |

### Cross-document figure check

Four figure/citation defects found. Three corrected during this validation; one routed to Kaizen.

| # | Finding | Disposition |
| --- | --- | --- |
| **W-2** | **Final LOC is 5,810** code insertions (`*.ts`+`*.html`, 15 commits) vs the **~4,600** of re-baseline #2 — **+26%** | **Recorded, routed to Kaizen.** The overage was *already caught in flight*: `execution.md` §11 recorded ~4,889 at 11/12 tasks and **deliberately declined a fourth re-baseline**. What that note still under-called is the size — it projected ~5,100 on a T-12 estimate of ~200; T-12 landed **607**. So the estimation-basis error recurred **inside the note that diagnosed it**. Added as a note to `design.md` §13 |
| **W-3** | `design.md` §13 review-rounds cell read *"still holding at 10 of 12 tasks: only T-08 consumed rework"* — true pre-T-11, contradicted by `tasks.md` §6 and `execution.md` | ✅ **Corrected** — now records 9 of 12 on attempt 1; T-08/T-11/T-12 one round each |
| **W-4** | `design.md` §10.2 and `tasks.md` T-11 carried **1,639 lines / 1,316 ins / 1,297 del** — T-11 **attempt 1**'s figures. Committed (`d934f1fe`) is **1,836 / 1,514 / 1,298** | ✅ **Corrected** in both files. `execution.md` §9 had it right all along |
| **W-5** | `requirements.md` §6 and `tasks.md` §6 cited **`CAPDEV_INDICATOR_TAB_QUERY`** in the present tense. T-10 **deleted** that constant; a repo-wide grep finds it nowhere in `server/…/src` | ✅ **Corrected** in both. `proposal.md`/`execution.md` hits are correct point-in-time records and were left alone |

**Correction closure applied.** Each corrected value was swept forward across the whole spec folder (sites the finding did not cite) and backward (documents citing the corrected section). The `1,639` sweep found and fixed two sites beyond the one that surfaced it; the `CAPDEV_INDICATOR_TAB_QUERY` sweep found four more hits and confirmed all four are legitimate historical records.

### Proposal alignment

`proposal.md` has no **Visual Reference** section — this spec changes no visual design, only URL behavior. Intent, scope, non-goals and success criteria all hold. The `lever` exclusion and the "no `indicators.slug` column" non-goal are both honoured.

---

## 9. Test Evidence Summary

No `test-report.md` exists — the TEST phase was skipped by user decision. Coverage was therefore **re-derived here from a live run** rather than reused, which is the stronger evidence path.

| Defect class | Gate | Status |
| --- | --- | --- |
| **D1** — codec maps wrong / drops values | Codec units + round-trip property | ✅ Closed |
| **D2** — navigation loop / duplicate fetch | Component test on a **real rendered tree** | ✅ Closed for the URL layer. *Was blind under the old overridden-template harness; re-armed by T-11 — which is how the pre-existing double fetch was discovered* |
| **D3** — state desync | Rendered chip + tab strip asserted **after** control lists resolve | ✅ Closed |
| **D4** — vocabulary drift | Layer 1 parity (blind to server-side additions by construction) + layer 2 runtime warning | ⚠️ **Partly, by design and by explicit statement** |
| **D5** — shared-consumer regression | **Full** client suite, 309 suites | ✅ Closed |
| **D6** — server emits a URL the client can't parse | Twin literals + **manual check** | ⚠️ **Half closed — see W-1** |

### W-1 — the one open item

**Substitute control 1 (twin literals): VERIFIED during this validation.** Traced to source on both sides and compared byte for byte on the *same* query string:

| Side | Location | Literal |
| --- | --- | --- |
| Server producer | `capdev-bulk-notification.service.ts:575-579` via `COMPLETE_CLIENT_HOST` (`app-config.util.ts:261-263`, plain concatenation) | `${ARI_CLIENT_HOST}/results-center?indicator=${QueryIndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}&contract=${agreementId}` |
| Server enum | `indicators/enum/indicators.enum.ts:26` | `'capacity-sharing-for-development'` |
| Server pin | `capdev-bulk-notification.service.spec.ts:428-433` | asserts the href for **two groups with different ids** (`A100`, `B200`) — KZ-004 satisfied |
| Client vocabulary | `results-center-url.vocabulary.ts:48` | `['capacity-sharing-for-development', 1]` |
| Client pin | `results-center-url.codec.spec.ts:210-220` | parsing that same pair yields `indicator === 1`, `contract === ['A100']` |

**Substitute control 2 (human check): NOT PERFORMED. This is what blocks archive.**

Both pins are unit-level. Neither renders the Results Center, so neither can show the parsed filter actually reaching the table, the chip and the tab strip on a real page. That is the half of D6 only a running client answers.

**The exact string to paste** (test host, from `ARI_CLIENT_HOST`), substituting a real CapDev `agreement_id`:

```
https://allianceindicatorstest.ciat.cgiar.org/results-center?indicator=capacity-sharing-for-development&contract=A100
```

Pass conditions: (1) the view loads already filtered, with no unfiltered flash-then-jump; (2) the tab strip sits on *Capacity Sharing for Development*; (3) a contract chip shows that `agreement_id`; (4) no "dropped parameters" toast; (5) the URL is unchanged in the address bar after load.

---

## 10. Agent Guide / Constitution Impact

| Check | Result |
| --- | --- |
| `## Constitution Impact` notes in `execution.md` | **None** — no module boundary moved, no public surface changed. Consistent with the change's shape: a new `url/` folder inside an existing feature |
| `docs/ux-ui/design.md` decisions log | ✅ **Done during this closing pass** — §12.2, entry dated 2026-08-13, recording the six canonical parameters, the cross-package literal and its D6 blind spot, per-token-class case policy, bounds, the no-deprecation-date legacy keys, the `sec_user_id` exclusion, and the component-owns-the-write-path guard |
| `client/research-indicators/src/CLAUDE.md` | ⚠️ **WARN — no mention of the `url/` codec layer.** Not stale (nothing there is now false), but a new architectural surface a future agent should be pointed at. **Pending work for `/akili-archive`'s Constitution & Graph Sync**, not a blocker |
| `docs/trd/trd.md:370` | ✅ Still accurate — URL state owned by the Angular Router |

---

## 11. Remediation

| # | Item | Severity | Owner | Status |
| --- | --- | --- | --- | --- |
| **W-1** | Perform the D6 manual cross-package check | **Blocks archive** | **Human (d.casanas)** | ⏳ **OPEN** |
| W-2 | Final LOC +26% over re-baseline #2; projection error recurred a 4th time | Process | `/akili-archive` Kaizen | Recorded in `design.md` §13 |
| W-3 | Stale review-rounds cell | Doc | — | ✅ Fixed |
| W-4 | Attempt-1 figures for the component spec | Doc | — | ✅ Fixed |
| W-5 | Deleted constant cited in present tense | Doc | — | ✅ Fixed |
| A-1 | Pin the two non-incrementing consumers with a counter assertion | Advisory | Follow-on decision | Not actioned (§2.4) |
| A-2 | `preserveIndicatorCodes` is dead — live production defect, 2 call sites | Advisory | `/akili-propose` | Recorded |
| A-3 | T-12 block comments describe reverted mutants | Advisory | — | Content preserved in `execution.md` |
| A-4 | `flushEffects()` is `@developerPreview` (19 files repo-wide) | Advisory | Future Angular bump | Recorded |
| G-1 | Point `client/src/CLAUDE.md` at the `url/` codec layer | Guide sync | `/akili-archive` | Pending |

**Nothing in this table requires a code change.** W-1 is a human observation; W-2 and the advisories are knowledge to carry forward; G-1 belongs to the archive phase by design.

---

## 12. Archive Readiness Recommendation

| Criterion | Status |
| --- | --- |
| All required tasks `[x]` | ✅ 12/12 |
| No unresolved FAIL | ✅ 0 FAIL |
| WARNs accepted or followed up | ✅ 3 fixed here · 1 routed to Kaizen · **1 open (W-1)** |
| Tests cover key requirements and scenarios | ✅ Both suites green; coverage ~60 points above every floor |
| Drift reflected in the docs | ✅ Four figure/citation defects corrected with closure sweeps |
| User has reviewed the summary | ⏳ Pending |

### Verdict

> **READY TO ARCHIVE — conditional on one human action.**

The implementation is complete, conformant and well-gated. **Do not archive until the D6 manual check (W-1) has been performed and its result recorded in `tasks.md` §6.** That check is the spec's own declared blind spot; archiving without it would convert an acknowledged gap into an unrecorded one, which is precisely the failure mode this spec's methodology exists to prevent.

Once W-1 is recorded:

```
/akili-archive docs/specs/results-center/url-filters
```

**Carry into the archive phase — the three things worth more than the code:**

1. **KZ candidate (highest value): a re-baseline must correct the *basis*, not just the total.** This spec breached its LOC budget three times and mis-projected a fourth, every time by carrying a superseded per-item estimate under a corrected sum. The fourth instance occurred *inside the note diagnosing the third*. Task count and review rounds never moved once — only the estimate did.
2. **A-2 is a live production defect** with two call sites relying on behavior that does not exist. Needs `/akili-propose`.
3. **KZ-001 reached recurrence 5** — found by the very task written to end the pattern (T-11). The kaizen log already flags that a third variant should merge KZ-001 and KZ-004 into one lesson: *prove the test can fail*. This is the datum that justifies the merge.

---

*Validated 2026-08-13 · AKILI-SPECS `/akili-validate` · T3 Auditor (`opus`), author ≠ auditor satisfied*
