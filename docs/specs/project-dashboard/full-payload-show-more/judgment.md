# Judgment Day — Project Dashboard / Full-payload migration + Show-more

> ## ⚠️ POINT-IN-TIME RECORD — do not read as live state
>
> **This is the adjudication record of a design review held 2026-07-29, preserved unedited on purpose.** Rewriting it to match later outcomes would destroy the evidence of what was known when. Where it disagrees with [`./requirements.md`](./requirements.md), [`./design.md`](./design.md), [`./tasks.md`](./tasks.md) or [`./execution.md`](./execution.md), **those win.**
>
> Known stale statements, listed so nobody has to discover them:
>
> - **GATE-2 is recorded here as ⛔ open.** It was **closed 2026-07-30** — and closed *twice*: the first closure was unsound (the mockup then in use could not model the defect it settled, which is what produced DD-13 and forced the T-06 pivot), and it was re-closed on measurement against the corrected DD-14 mockup. Live status: `design.md` §13, `requirements.md` §11, `tasks.md` header.
> - **The design judged here is DD-13-era.** **DD-13 was superseded by DD-14** (`design.md` §6.3.2). This document's conclusions about bounded height and grid containment describe a mechanism that was subsequently measured to fail.
> - Its three rounds of blind review **passed** on that containment design. That is not a defect in the record — it is the record's most useful content: **three independent reviews accepted a mechanism no amount of reading could falsify, and only measurement in a real browser caught it.** See `execution.md` § T-06 Pivot Record.

- **Target:** `design.md` (draft), judged against `requirements.md` (approved)
- **Spec id:** 2026-07-full-payload-show-more
- **Mode:** `judgment_day` — blind dual review, read-only judges
- **Round:** 1 of max 2
- **Date:** 2026-07-29
- **Transaction state:** **awaiting user decision on round-one correction** (protocol requires asking before any fix)

## Protocol compliance

| Rule | Status |
| --- | --- |
| One immutable target built before launch | ✅ `design.md` frozen at write time |
| Two blind judges, parallel, identical scope + criteria | ✅ identical prompts, neither saw the other |
| Both judgments received; no partial accepted | ✅ |
| `review-refuter` never launched | ✅ two-judge agreement is the corroboration mechanism |
| Fix only severe findings confirmed by **both** | ⏸ **not started — awaiting authorisation** |
| Single-judge findings recorded as suspect, no auto-fix | ✅ see §3 |
| **Author ≠ auditor** | ⚠️ **partially satisfied.** Both judges ran as `akili-reviewer` (registry T3 → `opus`); the design was authored on Opus 5. Independence came from **fresh context + read-only access**, not model diversity — the judges never saw the author's reasoning, only the artifacts. Recorded as a deviation, not hidden. |

## 1. Result summary

| | Judge A | Judge B | Merged |
| --- | --- | --- | --- |
| Severe | 3 | 3 | **2 confirmed · 2 suspect** |
| Warning | 8 | 6 | **6 confirmed · 5 suspect** |
| Suggestion | 4 | 3 | 1 confirmed · 4 suspect |
| Contradictions between judges | — | — | **0** |

**Verdict of both judges, independently: not yet safe to convert into tasks.**

Both also independently confirmed the design's factual grounding on the ranked-card path, and both confirmed the **central encoding mechanism is sound** for the two live layouts — `rows-partners` (uses `partnerBarWidthPercent`/`barColor`) and `rows-stacked-lever` (renders no bar; its `index + 1` badge is invariant for free). The failure is concentrated on the geographic surface.

## 2. Confirmed findings (both judges) — fix candidates

### C-1 SEVERE — The geographic lists have no mechanism to expand
*A F-01 ≡ B F-1*

`expanded` / `visibleItems` are **private to the card** (DD-1, §6.1) and `variant="list"` "gets no toggle, by construction" (§6.2) — yet DD-6 puts the three geographic toggles in `GeoScopeCardComponent`. There is no `expanded` input, no `model()`, no `viewChild` plan; §5.3 explicitly forbids new inputs. **The parent's toggles have no path to the child's window.**

The only fallback — parent pre-slices `[items]` — fails twice: the child slices the already-sliced list again, and `barColor(index)`/`maxCount()` then compute over the *visible* window for exactly the `layout="rows-partners"` bar-encoding branch these three lists use, **re-creating the R-PDB-004 defect the spec exists to eliminate**.

**Root cause:** DD-3 (toggle in the shell) and DD-6 (control in the parent) collide, and the design presents the combination as complete. This is the design's own central mechanism failing on the one surface it identifies as structurally different.

**Impact:** R-PDB-006 AC.5 and its scenario unmeetable; R-PDB-004 AC.1/AC.2 silently fail for 3 of 7 ranked lists while the card spec (which only exercises `variant="card"`) stays green.

### C-2 SEVERE — Pre-existing slices make "expand to the full set" unreachable
*A F-02 ≡ B F-2*

`geo-scope-card.component.ts:57-106` already applies `.slice(0, 3)` on `top_sub_nationals` **per country** and a global `.slice(0, 6)` in `topSubNationals()`. `topSubNationalItems()` derives from both. §5.4's premise — "the same 3 its own display list already slices to" — is **mis-stated**: today's sub-national list is a global top-6 drawn from an already-truncated pool.

Nothing in §2.1 instructs lifting those slices off the display path. As designed, the sub-national list tops out at **6 rows** regardless of payload, and a country's 4th-ranked sub-national can never be shown.

Both judges additionally flagged that **`mapCountries`' required shape is unstated**: `GeoScopeMapComponent` consumes raw `GeoScopeCountry` (snake_case `top_sub_nationals`), while `topCountries()` returns `GeoScopeCountrySummary` (camelCase `subNationals`). `topCountries()` is simultaneously the map's source and the display list's source, and that split must be untangled first.

**Impact:** R-PDB-006 and R-PDB-003 AC.1 unmet for two of three geographic lists; a compile error the implementer resolves arbitrarily.

### C-3 WARNING — The `columns` branch breaks under the §5.3 rule
*A F-04 ≡ B F-4*

`project-dashboard-card.component.html:49-54` derives container geometry from the item count **outside** the `@for`: `[class.justify-center]="items().length <= 3"` and `[style.grid-template-columns]` built twice from `items().length`. These are not among the five functions §5.3 enumerates. Applied literally, a 40-item section collapsed to 5 renders **40 grid tracks holding 5 bars**.

`columns` is unused today but is the component's **default** `layout` input value, and RSK-2/§6.2 expect Chunk B to adopt it. This directly falsifies §6.2's selling point ("all five layouts gain expansion with one implementation") and RSK-2's mitigation.

### C-4 WARNING — NFR-PDB-004 containment not delivered for the geographic lists
*A F-06 ≡ B F-5*

§6.3 bounds "the `rankedList` outlet", but the `variant="list"` outlet at `project-dashboard-card.component.html:1-2` has **no wrapper element at all**. The geo card sits in the same `lg:items-stretch` stretched row, so an expanded 40-row country list grows the column and the whole row — precisely the failure NFR-PDB-004 exists to prevent, on precisely the scenario the requirements name. Worse: this is **DC-8**, the class with no automated gate, and the human check in requirements §7 is scripted around "expand each card", so it may not even be exercised.

### C-5 WARNING — §2.1's change inventory omits the largest rewire, and the DI scope is unspecified
*A F-05 ≡ B F-6*

`GeoScopeCardComponent` injects the **deleted** `GetGeoScopeService` (`:22`) and reads it in `isEmpty()`, `summaryMetrics()`, `topRegions()`, `topCountries()` plus four template bindings. §2.1's row says only "`mapCountries` limiter; per-list expansion state". Likewise the four `*Empty()` computeds read deleted services; §2.1 says only "4 item-computeds re-sourced" (~20 bindings unaccounted).

**And the DI decision is absent:** the five services are today **component-scoped providers** on `ProjectDashboardComponent:49-55`, which is how the geo card shares an instance via the element injector. The design never states whether `GetFullContractReportsService` is `providedIn: 'root'` or component-provided. A wrong choice either breaks the geo card's injection or makes it fetch again — **violating R-PDB-001 AC.1's "exactly one request"** — or retains the previous contract's data across navigation.

### C-6 WARNING — The budget is understated by roughly 3×, and it is a hard tripwire
*A F-11 ≡ B F-7*

Judge B measured the deletion set: five services (213 LOC) + their specs (406 LOC) = **619 LOC deleted**, against §13's "~−250". Plus `api.service.ts` (~25) and two blocks in `api.service.spec.ts` (~100). Two existing specs must be **rewritten, not extended** — `project-dashboard.component.spec.ts` is **848 lines** and mocks all five deleted services; `geo-scope-card.component.spec.ts` is **259 lines** and mocks `GetGeoScopeService` — and neither appears in §2.1. Realistic total **north of 1,500 changed lines**.

§13 says `/akili-execute` escalates when actuals exceed the budget. As written the tripwire fires mid-work for an **estimation error**, not a scope surprise — which teaches the loop to ignore it. "2 review rounds" inherits the same optimism, and C-1 alone will consume one.

### C-7 WARNING — Five titles attributed to a file that renders four
*A F-07 ≡ B F-10*

`project-dashboard.component.html` hosts four card titles (lines 160/170/180/190). The fifth — "Top geographic scope" → "Geographic Scope" — is at `geo-scope-card.component.html:1`, whose §2.1 row does not mention titles. R-PDB-007 AC.1 requires all five.

### C-8 SUGGESTION — OQ-4 is answerable from the repo now
*A F-12 ≡ B F-12*

`reports-main-contact-persons.dto.ts` declares `user_id!: string`; `ContractFullReportsDto.top_main_contact_persons` is typed to it. **ASM-2 holds; no composite-key fallback needed.** Carrying OQ-4 into T-01 spends a task on a settled fact. The real unnamed work item is that the client-side `ProjectDashboardRankedItem` carries neither `user_id` nor `region_id`.

Judge B also noted §4 cites `agresso-contract.controller.ts:155`; the decorator is at **156**.

## 3. Suspect findings (one judge only) — recorded, NOT auto-fixed

Per protocol these are not fix candidates. Three are **directly verifiable code facts** rather than opinion, and the orchestrator independently confirmed them against files already read this session — noted as such without upgrading their status.

| ID | Judge | Finding | Orchestrator note |
| --- | --- | --- | --- |
| S-1 | A (severe) | **`topRegions()` does not sort.** `geo-scope-card.component.ts:84-90` is a bare `.map()`; §5.3's claim that "the three geographic list computeds already sort descending" is false. R-PDB-002 AC.3 fails for a live chart. | **Independently confirmed true** — the file was read directly earlier in this session and contains no `.sort()`. B did not examine it. |
| S-2 | B (severe) | **Route snapshot is non-reactive.** `contractId` is `computed(() => this.route.parent?.snapshot.paramMap.get('id'))` — a `snapshot` read. On an in-place `:id` change the computed never re-evaluates and the `effect` never re-runs, so R-PDB-001 AC.5 / R-PDB-003 AC.6 hold **only** via component recreation — in which case **DD-2's entire justification for `linkedSignal` disappears**, since a plain `signal(false)` resets with the component. | **Independently confirmed true** — `project-dashboard.component.ts:79` reads `snapshot`. A did not examine routing. Materially undermines DD-2. |
| S-3 | B (warning) | **requirements.md's R-PDB-004 scenario is unsatisfiable under DD-4.** Its GIVEN is "the 5th rendered in the `last` colour `#112F5C`" — which under DD-4 (total = 37) it never is. A Tester transcribing it writes an impossible test, which reads as implementation failure or gets "fixed" by reverting DD-4. | **Self-inflicted contradiction between the spec's own two documents.** Verifiable by reading both. |
| S-4 | A (warning) | `project-dashboard.component.spec.ts` provides `{ provide: ApiService, useValue: apiMock }` with **no `HttpTestingController` and no `provideHttpClientTesting`**. The DC-2 request/URL-encoding assertions §10 assigns to that spec **cannot be written against its existing harness**. | Verifiable; would silently weaken the only gate for R-PDB-001/NFR-PDB-001. |
| S-5 | B (warning) | **Two umbrella-mandated deliverables are missing from this design:** the `reports/full` payload-size measurement (umbrella R-1 / proposal A-9 said "before Chunk A design closes", "recorded in the spec's design doc") and the collapsed/expanded **mockup** (umbrella + proposal §8 said "needed"). The design defers the measurement to task T-01 — after tasks are fixed — and the mockup does not exist. | Correct. The measurement gates whether the "no server change" fence is even valid. |
| S-6 | A (warning) | R-PDB-005 AC.3 ("**every** ranked section") unmet for `topRegions()`, which keys `id` on `region_name`; `RegionByContractCountDto` exposes `region_id`. | Consistent with S-1. |
| S-7 | A (warning) | §6.3's "Collapsed rendering is byte-identical to today, so the collapsed view cannot regress" is **false** and contradicts §12.1 (colour ramp changes) and R-PDB-002 (4 → 5 rows). It is the sole safety argument offered for the bounded wrapper. | Correct as written. |
| S-8 | A + B | `linkedSignal` is **`@developerPreview`** in the installed `@angular/core@19.1.6`. A raised it as a suggestion; B folded it into severe F-3. Material because DD-2's stated purpose is to have review bless a new pattern for the client guide. Also: sourcing on `items` resets `expanded` on **any** array-identity change — including a `Try again` retry of the *same* contract — broader than AC.6 requires. | Raised by both but at different severities; recorded here rather than in §2 since only B treated it as severe. |
| S-9 | A | Three `<h3>` headings inside the geo card ("Top regions", "Top countries", "Top sub-national levels") are not in DD-5's table, yet R-PDB-007 AC.2 forbids titles beginning with "Top ". A literal tester fails the build on three headings the design intends to leave alone. | Real ambiguity; one sentence closes it. |
| S-10 | B | The toggle's position relative to the card's five-way loading/error/empty state chain is unspecified — "immediately after the `rankedList` outlet" is satisfiable inside or outside the `@if (items().length)` arm. With one shared service, any card's **Try again** sets `loading` for all four while section signals still hold data, so a toggle outside the arm renders beneath the spinner. | Real; cheap to pin now. |
| S-11 | A | `mapCountries` as designed is "top 5 **by count**", but today `[countries]` binds the raw, unsorted `service.topCountries()` fetched with `limit = 5` — so the plotted pin set can **differ from today's**. A third visible change for the product owner, not listed in §11. | Correct. |

## 4. Claims both judges verified as TRUE

Recorded so round two does not re-litigate them: `linkedSignal` has zero current uses and does exist in 19.1.6 · `project-dashboard.component.spec.ts:205-226` really swaps in `ProjectDashboardCardStubComponent` · the card spec really is 114 lines · only `rows-partners` and `rows-stacked-lever` are live, and the card is rendered by exactly two templates · `variant="list"` really has no chrome · **sub-nationals are always queued for geocoding while countries with a static centroid are never queued, one request per task with a memoizing cache — so §5.4's "≤ 5 + ≤ 15 = ≤ 20" ceiling is correct** · `partnerItems()` performs no sort while the other three dashboard computeds do · `mainContactPersonItems` keys off the formatted name · the grid really is `lg:grid-cols-2 lg:items-stretch` · "Results Partners" really is at `partners.component.html:6` · `projectDashboardBarColor`'s `total >= 4 && index === total - 1` navy rule · all seven `ContractFullReportsDto` section names · `GET_FullContractReports` is absent and no client code calls `reports/full` · the Kaizen log is readable only via `git show dev:…` from `AC-1672` · **the central encoding mechanism delivers R-PDB-004 AC.1–AC.3 for both live layouts.**

## 5. Round 1 outcome

Fix round 1 authorised by the user and applied inline by the orchestrator (author of the design; independence supplied by the re-judgment, not by the fix actor). Delta: `design.md` → **revision 2**; `requirements.md` → R-PDB-004 scenario amended, DC-8 human-check script extended.

---

# Round 2 — Scoped re-judgment

- **Target:** frozen round-1 ledger + the revision-2 fix delta
- **Judges:** two, blind, parallel, identical scope; same `akios-reviewer` binding and the same author≠auditor deviation recorded in §Protocol
- **Mandate:** did the fixes close the findings, **and did they create new defects?**

## 6. Closure of round-1 findings

| | Judge A | Judge B | Merged |
| --- | --- | --- | --- |
| Fully closed | 15 / 17 | 14 / 17 | **14 closed by both** |
| Partially closed | C-6, S-5 | C-6, S-5 | **C-6, S-5 partial (both agree)** |
| Not closed | none | none | **none** |

Both judges independently verified against source that **DD-1r works**: because `barColor`, `maxCount` and `totalCount` all read `items()` in the real component, keeping `items()` as the full list makes R-PDB-004 hold for the three geographic `variant="list"` `rows-partners` lists at zero extra cost, and the single key set delivers R-PDB-003 AC.4 for the four-card path. Both also confirmed **DD-9 is factually sound** — `<app-geo-scope-card>` is rendered only by `project-dashboard.component.html:200`, inside the component declaring the providers, so element-injector inheritance resolves and the `project-results` route never instantiates a card needing it.

Closed by both against source: C-1, C-2, C-3, C-4, C-5, C-7, C-8, S-1, S-3, S-4, S-7, S-9, S-10, S-11.

## 7. Fix-caused defects confirmed by BOTH judges

### R2-1 SEVERE — DD-10 traded a benign defect for a dangerous one, and is mis-located
*A N-1 ≡ B Q2-1* — **the exact failure round 2 exists to catch**

DD-10 answered a correctly-diagnosed finding (S-2) with a change in the wrong component. `ProjectDetailComponent` reads `snapshot.params['id']` in **`ngOnInit`** (`:70`), which does not re-run, and drives the page header, `contractStaff.main()` and `bilateralService.getContract()` from it. Making only the **child** reactive yields a page showing project **A**'s header and staff beside project **B**'s analytics. Today's failure is uniformly stale and self-consistent; DD-10's is **split-brain**. `project-detail.component.ts` is listed nowhere in scope (`requirements.md` §3), so the design cannot finish the change it starts.

Judge B found two aggravating facts A did not:

1. **A cross-contract destructive call.** `groundedDocuments()` renders ungated by any loading flag (`project-dashboard.component.html:71-81`, Remove button at `:81`), and `removeGroundingDocumentAsync` calls `deleteDocumentOverviewFiles(this.contractId(), [document.fileName])` (`:380-401`). After DD-10 that is contract **B**'s id with contract **A**'s filename. Same class at `:298-311`, where `contractId()` is re-read *after* an `await`, so a mid-upload param change writes `fileKey` under the new contract's prefix.
2. **The navigation DD-10 fixes does not exist.** The real paths — `result-sidebar.component.ts:472` and `section-header.component.ts:245` — navigate to `['/project-detail', id]` **without** the `project-dashboard` child segment, which **destroys** `ProjectDashboardComponent`. DD-10 buys reactivity on a path that does not occur while leaving the reused parent broken.

**Both judges' prescription: revert DD-10 from this spec** and file the parent's non-reactivity separately against `project-detail.component.ts`. Consequence: DD-2r must re-justify `linkedSignal` without it.

### R2-2 WARNING — DD-2r's reset source does not exist in the service contract
*A N-2 ≡ B Q2-2*

DD-2r sources the `linkedSignal` on "the payload signal", but §2.1 specifies the service as `loading`, `loadError`, **per-section accessors**, `update()` — no whole-payload signal is declared. Revision 1's DD-2 sourced on `items`, which demonstrably existed; **the delta replaced a concrete source with an undeclared one**, and R-PDB-003 AC.6 depends entirely on it. Also unspecified: the chart-key namespace (4 dashboard + 3 geo), and — Judge B's addition — that toggling must produce a **new `Set`**; a `Set` mutated in place and re-`set()` fails Angular's `Object.is` equality and silently never re-renders, producing a toggle that looks wired and does nothing.

### R2-3 WARNING — The C-2 uncapping over-delivers and degrades the list
*A N-4 ≡ B Q2-4*

`topSubNationals()` is `topCountries().flatMap(c => c.subNationals)`. Removing **both** slices turns it into every sub-national of every country — **~800 rows** on the design's own 40 × 20 fixture, in one `variant="list"` card inside an `OnPush` tree. No requirement asks for a cross-country flatten; R-PDB-006's scenario asserts only "the list shows all 40 countries". Two further consequences:

- `topSubNationalItems()` projects only `{id, label, count}`, **discarding `countryName`** — tolerable at top-6, but an 800-row flat list shows repeated bare names with no country.
- **Judge B:** the **collapsed** top-5 contents change too — a country's 4th-to-20th sub-national can now displace another country's 3rd. A fourth user-visible change, absent from §11.

### R2-4 WARNING — GATE-1 is inadequately handled, from two angles
*A N-5 ≡ B Q2-8*

- **A:** the table is titled "Gates **before implementation**", yet GATE-1's owner cell reads "first action of T-01" — so the measurement deciding whether the spec's central scope fence is valid runs *after* all 11 tasks are written. Naming it a gate improved honesty, not mechanism.
- **B:** the fence is provisional **in `design.md` only**. `requirements.md` still asserts unconditionally: "No server change. No data model change. No new endpoint." (§2), "**No server change.**" (§9), "Server | **None**" (§10). If GATE-1 comes back bad the two documents disagree — and `requirements.md` is the one Testers transcribe.

Both agree GATE-2 (mockup) is the milder case, since OQ-3 carries a usable default.

### R2-5 WARNING — NFR-PDB-003 is ungated for 3 of 7 toggles, and the toggle is now implemented twice
*A N-7 ≡ B Q2-3*

DD-1r moved the geographic toggles out of the card, but §6.4's "reusing the card's toggle presentation" **names no shared artifact** — no extracted component, directive or exported `ng-template` — and §2.1 contains no extraction task. The card's toggle markup is inline, so it is not reusable as written. §10 assigns `aria-expanded`, accessible name and keyboard activation **only** to the card spec; the geo-card row lists only "three toggles independent". NFR-PDB-003 exists precisely so a screen-reader user can distinguish several "Show more" buttons — and with DD-1r there are now six or seven on one screen, clustered in the card with no a11y gate. PRD **C-4** mandates WCAG 2.1 AA on every changed screen.

### R2-6 WARNING — The grid adjacency justifying NFR-PDB-004 is factually wrong, in both documents
*A N-8 ≡ B Q2-6*

`design.md` §6.3 and the amended `requirements.md` §7 both say the geo card "sits in the same `lg:items-stretch` row as the four ranked cards". It does not: `:153` opens `lg:grid-cols-[3fr_1fr] lg:items-stretch`, the four cards live in a nested `lg:grid-cols-2` at `:157`, and `app-geo-scope-card` is at `:200` — **below** that nested grid, inside the same left column. The sibling an expanded geo list actually stretches is the right-hand *Results by indicator / Results by status* column. **The containment risk is real; the stated mechanism is wrong** — and since DC-8 has no automated gate, the human-check script *is* the gate, so it currently directs a checker to watch the wrong siblings and report green.

### R2-7 WARNING — Budget still contradicts its own inventory
*A N-6 ≡ B Q2-5*

§13 decomposes ≈1,700 as "+620 production/interface, −619 deleted, +460 test". §2.1's test rows alone sum to **690** (100 + 200 + 240 + 150), **before** `get-full-contract-reports.service.spec.ts` and the 40 × 20 `contract-full-reports.mock.ts`, both listed with **no LOC**. Realistic ≈ **2,100–2,200**. C-6's complaint was that the tripwire fires for an estimation error and thereby teaches `/akili-execute` to ignore it; revision 2 fixed the magnitude and reproduced the failure mode at ~30 %, now inconsistent with the same document two sections earlier. Judge A adds that "3 rounds — C-1 consumed one" **mis-seeds the counter**: judgment-day design rounds and Implementer→Reviewer rework rounds are different budgets.

### R2-8 SUGGESTION — §11 says "three visible changes" and lists four
*A N-10 ≡ B Q2-7* — five, counting R2-3's collapsed-contents change. This row is the product-owner sign-off checklist for R-PDB-002/007; an undercount is how a change ships unapproved.

## 8. Round-2 suspect findings (one judge)

| ID | Judge | Finding | Note |
| --- | --- | --- | --- |
| R2-S1 | A (warning) | **R-PDB-002 AC.2 ("no Show more when ≤ 5") has no owner for the geographic lists.** `canExpand` lives in the card and guards only the `variant="card"` toggle; §6.4 renders three host toggles with **no length predicate stated**. A host cannot read the child's `canExpand` without a `viewChild`, so the predicate must be duplicated — and §6.1 calls `COLLAPSED_ITEM_LIMIT` a "module constant" without saying it is **exported**, inviting a hardcoded `5` that drifts. Under DD-1 this was automatic; inverting the contract split the gate from the toggle and only one side was re-specified. | Verifiable and real. A regions list of 3 entries renders a dead "Show more" — literal AC.2 failure on 3 of 7 lists. |
| R2-S2 | B (warning, inside Q2-4) | **Both host specs stub the real card**, so the host↔card seam DD-1r created is untested. `geo-scope-card.component.spec.ts:8-26` stubs `ProjectDashboardCardComponent`; `project-dashboard.component.spec.ts:205-226` stubs it too. §10 keeps both stubbed, so "slices removed → lists reach full length" is assertable only against computed arrays, never rendered rows. | **KZ-001 recurrence on the exact surface this revision exists to fix.** The most important suspect finding of the round. |
| R2-S3 | A (suggestion) | `ProjectDashboardCardStubComponent` (`project-dashboard.component.spec.ts:20-37`) declares its `@Input()`s explicitly; under `strictTemplates` a `[visibleLimit]` binding on a stub lacking that input is a **template type-check error**. §2.1 scopes the rewrite to the provider block `:205-226` only. | Real; partly moot if DD-10 is reverted (the `parent.paramMap` mock requirement disappears). |
| R2-S4 | A (suggestion) | DD-11's rationale claims revision 1 "left `topCountries()` serving both the map and the display list" — the template actually binds the **raw service** signal (`geo-scope-card.component.html:7`), never the card's camelCase computed. The untangling DD-11 performs is still correct; its stated premise is not. | Cosmetic accuracy fix. |

## 9. Round-2 verdict

Both judges: **not yet safe to convert into tasks — but close.** Judge B: *"Four scoped edits, no further architectural change."*

Rounds remaining: **1 fix round, 0 re-judgments after it** (protocol ceiling: two of each; one of each consumed). Per the decision gates, if any issue survives the final round the transaction **escalates and stops**.

## 10. Round-2 resolution — scope reduction + fixes (authorised 2026-07-29)

The user chose **scope reduction over a final patch round**: the geographic card was split into [`../geo-scope-expansion/`](../geo-scope-expansion/proposal.md), and the non-geographic findings were fixed in place. Rationale: across both rounds the severe finding and most warnings landed on that one surface, and each fix round closed findings there while creating new ones — the signature of a mis-drawn spec boundary rather than of bad fixes.

**The cut is structural, not a promise.** `visibleLimit` now defaults to **`null`** (show all) instead of `5`, so adding the input cannot change any existing call site. Had it defaulted to `5`, splitting would have left the geographic card silently capped in a file declared untouched — its sub-national list shows up to 6 today. This is recorded as design **DD-12** and asserted by **R-PDB-002 AC.5**.

### Disposition of every finding

| ID | Disposition |
| --- | --- |
| **R2-1** SEVERE (DD-10) | **FIXED — reverted.** DD-10r: `contractId` keeps its `snapshot` derivation; this spec adds no route reactivity. R-PDB-001 AC.5 is satisfied by component recreation on every navigation path that exists (`requirements.md` D-AC5, `design.md` §12.2). The parent's latent staleness is filed separately against `project-detail.component.ts`. **Side benefit:** without DD-10, `linkedSignal` is unnecessary — the `@developerPreview` dependency (S-8) disappears |
| **R2-2** (undeclared reset source) | **FIXED.** The service now exposes a **`payload` signal** with per-section `computed` accessors (DD-2r). `ChartKey` is an exported four-member string-literal union (§5.4), so a typo is a compile error. The host emits a **new `Set`** on every toggle — the `Object.is` trap is stated in §5.2.6 and asserted in §10 |
| **R2-3** (~800-row flatten) | **MOVED** to the geographic spec as **A2-R3 / A2-OQ1**, with a proposed bound (sub-nationals of the top 20 countries) and `countryName` restored. The collapsed-contents change is recorded as A2-R4 |
| **R2-4** (GATE-1) | **FIXED.** GATE-1 reassigned to the **spec author, before `tasks.md` is generated** — not T-01. The provisional fence is now carried in **both** documents (`requirements.md` §9 and `design.md` §4/§13), so they cannot disagree if the measurement comes back bad |
| **R2-5** (toggle twice, a11y ungated) | **DISSOLVED by the split.** With the geographic card out, every toggle in this spec is rendered by `ProjectDashboardCardComponent` — one implementation, one place to gate (design §6.2). The shared-artifact extraction moved to the geographic spec as **A2-7**, where a second renderer actually exists |
| **R2-6** (wrong grid adjacency) | **FIXED in both documents.** The four cards sit in a nested `lg:grid-cols-2 lg:items-stretch` grid (`:157`), itself the left column of an outer `lg:grid-cols-[3fr_1fr] lg:items-stretch` (`:153`) whose right column holds *Results by indicator* / *by status*. The DC-8 human-check script (`requirements.md` §7) now names the row-mate **and** the right-hand column |
| **R2-7** (budget) | **FIXED.** §13 re-derived by summing §2.1's own table: **8 tasks · ≈1,260 LOC · 2 rounds**, with deletion measured by `wc -l` at **468 LOC** for the four services + specs (164 + 304). Also corrected: design-review rounds and Implementer→Reviewer rework rounds are **separate budgets** — revision 2 conflated them |
| **R2-8** (comms undercount) | **FIXED.** Four visible changes listed in `design.md` §11 and `requirements.md` §14 |
| **R2-S1** (≤5 predicate ownerless) | **DISSOLVED by the split** for this spec; `canExpand` and the toggle are co-located again. `COLLAPSED_ITEM_LIMIT` is now **exported** (DD-7) so the host cannot drift to a literal |
| **R2-S2** (KZ-001 recurrence at the seam) | **FIXED.** New defect class **DC-11**: the seam is tested from both sides — the card spec proves `visibleLimit` is honoured and `expandToggled` fires against the **real template**; the dashboard spec proves the host reacts and pushes a new limit down. Neither side alone proves it. Carried to the geographic spec as **A2-R5** |
| **R2-S3** (stub inputs) | **FIXED.** §2.1 now scopes the rewrite to the provider block **and** `ProjectDashboardCardStubComponent` (`:20-37`), which must gain the new input/output or `strictTemplates` fails the build |
| **R2-S4** (DD-11 premise) | **MOOT** — DD-11 moved to the geographic spec, where the shape untangling is restated against the correct premise (its P-3) |
| **C-6 / S-5** (round-1 partials) | **CLOSED** by R2-7 and R2-4 respectively |

## 11. Transaction state

| Field | Value |
| --- | --- |
| Rounds consumed | 2 fix rounds, 1 scoped re-judgment |
| Rounds remaining | 0 fix rounds · 1 scoped re-judgment available |
| Round-1 findings | 14 closed by both judges · 2 partial → now closed · 0 unaddressed |
| Round-2 findings | 8 confirmed + 4 suspect → **6 fixed · 4 dissolved or moved by the split · 2 moot** |
| Architectural changes in round 2 | one **reversion** (DD-10 → DD-10r) and one **scope reduction**; no new mechanism |
| Terminal state | **not yet emitted.** The fix ceiling is reached, so no further patch round is available for this target |

The user authorised spending the final re-judgment. Result below.

---

# Round 3 — Final scoped re-judgment

- **Target:** the round-2 delta (scope split, DD-10r, DD-2r, DD-12, re-derived budget, new geo spec, ledger §10)
- **Judges:** two, blind, parallel, identical scope. Same author≠auditor deviation as prior rounds.
- **Mandate:** are the §10 dispositions accurate, and did the round-2 resolution create new defects?

## 12. What both judges verified TRUE — the two things most likely to have gone wrong

**DD-10r's reliance on component recreation is a structural property, not a hopeful assertion.** Both judges independently traced it: `app.routes.ts:184-206` gives `project-detail/:id` **no default child** route, so every id-changing navigation in the codebase — `result-sidebar.component.ts:472`, `section-header.component.ts:245`, `result-exists.resolver.ts:105`, `results-center-table.component.ts:467` / `.html:183`, `select-linked-results-modal.component.ts:184`, `create-oicr-form.component.ts:508-512` — targets `/project-detail/<id>` with **no child segment**, emptying the outlet and destroying `ProjectDashboardComponent`. The only link carrying the `project-dashboard` segment is `my-projects.component.ts:613`, reachable only from a page where the dashboard is not mounted. No back/forward sequence can make two different-`:id` dashboard URLs adjacent; a typed deep link is a document load. **R-PDB-001 AC.5 is genuinely satisfied by recreation.**

**DD-12 really does make the card change additive.** Both confirmed: `visibleItems()` returns the **identical array reference** when `visibleLimit()` is `null`, so the `@for` sweep and the `columns` structural bindings are byte-equivalent for a `variant="list"` consumer; `canExpand()` is computed but unread in the list branch; the toggle is structurally confined to the card branch's `@if (items().length)` arm, which the list outlet does not have. `visibleLimit` is the only behavioural change — **subject to R3-1 below**.

**The error/empty question is clean in both directions.** Both checked independently: the four `*Empty()` computeds are `!loading() && !loadError() && …length === 0` (`:153,169,184,198`), and the template evaluates `@else if (error())` at `:21` **before** `@else if (empty())` at `:27`. Clearing `payload` on failure yields the error state with its **Try again**, not the empty state. R-PDB-001 AC.4 holds.

## 13. Disposition audit — both judges independently: 10 of 12 accurate

**Both flagged the same two rows as OVERSTATED. No row was found FALSE, and both "dissolved by the split" claims (R2-5, R2-S1) were confirmed legitimate.**

| Row | Both judges | The orchestrator's error |
| --- | --- | --- |
| **R2-2** | **OVERSTATED** | The ledger booked it FIXED because the `payload` signal was declared. But DD-2r **deleted `linkedSignal`, its only consumer, in the same edit**. The reset *source* exists; the reset *mechanism* does not. Declaring a source is not implementing a reset |
| **R2-7** | **OVERSTATED** | The ledger claimed §13 was "re-derived by summing §2.1's own table". **That summation was never performed.** §2.1's LOC column sums to **798**; its production rows alone to **288**, not the 245 claimed; and four new files carry no LOC at all. The deletion figure (468) is the only part genuinely measured |

## 14. Round-3 findings

### R3-1 — §2.1 orders the one change that would leak the split (both judges: WARNING; Judge A: "highest-priority item here")

`design.md` §2.1's card-template row says "…**bounded wrapper on both outlets**". §6.3 says the opposite: the `variant="list"` outlet is "**left alone**". The harmful reading is live — the wrapper is bounded "only when `visibleLimit() === null`", and the geographic card's three lists bind no `visibleLimit`, so `null` is **permanent** for them: they would become fixed-height scroll boxes. §2.1 is the row `tasks.md` is generated from, so the wrong document is the actionable one. It falsifies the load-bearing claim of the whole split (G5 / DD-12 / §2.3), and **nothing catches it**: R-PDB-002 AC.5 asserts *rows*, not containment, and DC-8 is an accepted blind spot whose human script walks only the four ranked cards. The geo spec independently claims this work as **A2-8 / A2-R7**, so two documents out-vote the §2.1 cell. **Fix: three words.**

### R3-2 — R-PDB-003 AC.6 has a declared source, no mechanism, no gate (**Judge B: SEVERE · Judge A: WARNING — the judges contradict on severity**)

AC.6 is "When the payload is replaced, every card returns to collapsed." Revision 2 got it free from `linkedSignal` sourced on the payload. DD-10r's side benefit — "`linkedSignal` is no longer used; a plain `signal` suffices" — is argued from **component recreation on navigation**, which is AC.5's territory. AC.6 is written about **payload replacement**, which still happens in-life through the shared service's `update()`: the per-card **Try again**. Concretely: error clears `payload` → `items()` is `[]` → the toggle vanishes; retry succeeds → the host's `Set` still holds the key → `visibleLimit` is `null` → **the card renders expanded**. §5.2 describes only the toggle path; no effect, no reset, nothing keyed to `payload()`. §10's dashboard row asserts propagation and new-`Set` identity but never the reset, and §13's index maps R-PDB-003 to DC-3/DC-11, neither of which covers it.

Both judges agree the defect is real and that the remedy is one line plus one assertion. They **disagree on whether it stops the work**: B treats an AC with no mechanism and no gate as severe (a Tester files PRODUCT_BUG, a Reviewer with no gate lets it ship unmet); A treats it as narrow enough to be a warning. **Per the protocol's decision gates, a judge contradiction escalates for explicit human decision.**

### R3-3 — §13 still contradicts §2.1 *and itself* (both: WARNING) — third occurrence of the same failure mode

The §13 table says "≈ **1,260** … deleted **468**"; the sizing sentence one line below says "≈ **1,270** … of which **476** is deletion". Two totals and two deletion figures one line apart, the second contradicting the `wc -l` measurement the same section cites. §2.1's production rows sum to **288**, not 245, and its four **new files** carry no LOC at all — so the new service, the `ContractFullReports` interface mirror and `get-full-contract-reports.service.spec.ts` are **absent from the estimate**; "tests ~510" is exactly the three *modified* spec rows. Realistic total ≈ **1,550** (B) / higher (A). C-6 → R2-7 → R3-3: magnitude improved twice, mechanism never fixed.

### R3-4 — The umbrella's Chunk A block still describes the un-split chunk (both: WARNING)

`analytics-expansion/proposal.md` records the split correctly in its intro and build-order note, but four cells below were not updated. Chunk A's Client row still has the new service replacing **`GetGeoScopeService`**, still assigns "`GeoScopeCardComponent` gains the `mapCountries` limiter (**D-1**)" to A, and still describes the **reverted** DD-1 ("internal `expanded` signal"). Retires still says "**5** client services + `GET_GeoScope`" — which **directly contradicts** Chunk A's R-PDB-008 AC.4 ("`GetGeoScopeService` and `GET_GeoScope` still exist"). The Option-2 table still promises "A ships alone: 6 requests → 2". D-1 is now assigned to both A and A2 by the same document.

### R3-5 — Chunk A's own `proposal.md` was never split; two of its success criteria are unmeetable (Judge B only)

`requirements.md` links it as "Linked proposal", but it still scopes `geo-scope-card.component.*`, claims D-1, scopes the `mapCountries` limiter, deletes `get-geo-scope.service.ts`, and asserts **A-SC1** ("the four `reports/top-*` **and `reports/geo-scope`** URLs appear in no network call") and **A-SC5** ("Geocoding calls ≤ 20 on load"). Both are **false for the reduced Chunk A**, which deliberately keeps `reports/geo-scope` and states Mapbox impact as "None in this spec". Needs the same "moved to A2" treatment `requirements.md` §0 applied to the retired IDs.

### R3-6 — D-AC5's "today's failure is uniformly stale and self-consistent" is factually wrong (Judge B only)

`project-detail/:id` is one route config, so navigating from `/project-detail/A/project-dashboard` to `/project-detail/B` **reuses** `ProjectDetailComponent` — its `ngOnInit` (`:69-83`) does not re-run, so the header, `contractStaff.main()` and `bilateralService.getContract()` stay on A. The dashboard is destroyed and, when the user clicks the Project Dashboard tab, recreated reading the parent's *updated* snapshot → B. **The split-brain page attributed exclusively to DD-10 already exists today.** The revert decision is right regardless and AC.5 holds for the dashboard's own sections, but the separately-filed `project-detail.component.ts` defect is **reachable now, not latent** — information the follow-up ticket must carry.

### R3-7 — Minor: request arithmetic and geo-spec overclaims (both: SUGGESTION)

`NFR-PDB-001` says "6 → 3 … = 4 in-flight" while ASM-3 says "6 requests to 4" — the bases differ (the 6 excludes the status call the 4 includes); the consistent pair is 6 → 3 or 7 → 4. Judge B adds that the effect also fires `initializeProjectDashboardResultsTable` and `loadExecutiveOverviewSummary`, so the true page total is ~9 on either side. Judge A adds that the geo proposal's §4 overclaims "the dashboard drops to **one** analytics request" (it drops to two, three in flight until Chunk B), and that its "Retired IDs **adopted**" language conflicts with Chunk A's "ID retired, **not reused**".

## 15. Terminal receipt

| Field | Value |
| --- | --- |
| Target | `design.md` rev 3 + `requirements.md` rev 2 + the round-2 delta |
| Rounds consumed | **2 fix rounds (ceiling), 2 scoped re-judgments (ceiling)** |
| Round-1 findings | 14 closed by both · 2 partial → closed in round 2 |
| Round-2 findings | 8 confirmed + 4 suspect → 6 fixed · 4 dissolved/moved · 2 moot |
| Round-3 findings | **0 severe by agreement · 1 contradicted severity (R3-2) · 4 warnings · 2 suggestions** |
| Disposition audit | 10 / 12 accurate; **R2-2 and R2-7 overstated by the orchestrator**, identically flagged by both judges |
| Judge contradiction | **Yes — R3-2 severity (B: SEVERE, A: WARNING).** Protocol: *escalate for explicit human decision* |
| Spec's own gates | **GATE-1 and GATE-2 remain ⛔ NOT DONE**, owner "spec author, before `tasks.md` is generated" — independent of any finding |

## **JUDGMENT: ESCALATED ⚠️**

Escalated on two independent grounds: the protocol's fix ceiling is reached with findings outstanding, and the judges contradict on R3-2's severity. Both judges' closing assessments converge on substance — the round-2 resolution was sound where it mattered, and what remains is narrow. Judge A: *"Close those two gates, fix the one cell in §2.1, name the AC.6 reset, and reconcile §13 … then this is task-ready."* Judge B: *"two edits from convertible, not … another architectural round."*

No further fix round is available inside this protocol. Continuing requires an explicit user decision.

---

# Round 4 — Out-of-protocol fix pass (user-authorised, 2026-07-29)

**Explicitly outside the judgment-day protocol**, whose fix ceiling was reached at round 2. The user authorised it after reviewing the escalation. **These fixes have NOT been independently reviewed** — that is the cost of the choice and it is recorded here rather than glossed. No re-judgment is available.

## 16. R3-2 — the contradicted finding, resolved on the ledger's own evidence

The judges split on severity (B: SEVERE, A: WARNING) and the protocol escalated it. Resolved by **narrowing the requirement to its actual intent**, not by adding the mechanism:

`R-PDB-003` AC.6 read "when the **payload** is replaced, every card returns to collapsed". That wording described an implementation, not an intent — revision 2 reset via `linkedSignal` sourced on the payload. **Round 1 had already recorded that this resets more broadly than AC.6 requires (finding S-8)**, and round 3 showed the only remaining in-life trigger is the per-card **Try again**, where collapsing a list the user deliberately opened is the wrong behaviour.

- **AC.6** now states the contract-change intent it always had — satisfied by component recreation (D-AC5), the same structural property as AC.5.
- **AC.7** is new and makes the retry behaviour explicit: expansion **survives** a same-contract retry.
- `design.md` §5.2.7 states why a plain `signal` *is* the mechanism rather than an omission; §10 adds the assertion (expansion survives `loadError` → `update()`; a fresh instance starts collapsed).

This narrows a stated criterion, so it is flagged in `requirements.md` beside the scenario rather than done silently.

## 17. GATE-1 — closed by measurement, not by argument

The user brought up the local backend mid-pass, which turned GATE-1 from "needs a live environment" into a measurement. Read-only queries replicating `buildPrimaryContractResultsSubquery` and each ranked section's `DISTINCT` grouping, over the **25 contracts with the most results**:

| Section | Worst case | Fidelity |
| --- | --- | --- |
| Partners | **137** | Exact — validated against the reference project (A1578 → 67 partners, top one at 44 results, matching the screenshot) |
| Contributors | 15 · Contacts | ≤ 35 · Levers ≤ 8 | contacts/levers are **upper bounds** (no role filter), so the total can only fall |
| Countries | 30 · Sub-nationals | 0 across the sample | sub-nationals ⚠️ least validated — carried to A2 as its first verification step |
| **Whole body** | **≈ 36 KB uncompressed / ~7 KB gzipped** | This spec's four sections ≈ 31 KB |

**Outcome: the "no server change" fence is valid, not provisional. No ceiling needed. RSK-1 is closed** — it was written against "hundreds of rows"; reality is a 137-row worst case. One self-inflicted error caught during the run: the first pass used `institution_role_id = 2` and reported 0 partners, contradicting the screenshot; the real value is `PARTNERS = 3`. The discrepancy was visible only because the screenshot provided a ground truth to check against.

## 18. Disposition of the round-3 findings

| ID | Disposition |
| --- | --- |
| **R3-1** (§2.1 leaks the split) | **FIXED** — the card-template row now reads "bounded wrapper on the **`variant="card"` outlet only**", matching §6.3 and leaving A2-8 its work |
| **R3-2** (AC.6) | **RESOLVED** — §16 above. Requirement narrowed to intent, AC.7 added, mechanism and gate stated |
| **R3-3** (budget, 3rd occurrence) | **FIXED** — §13 now shows the arithmetic line by line, the four new files carry LOC, and the total is **≈1,600**, matching both judges' independent ~1,550+ estimates. The self-contradicting sizing sentence is gone |
| **R3-4** (stale umbrella Chunk A block) | **FIXED** — Client/Retires/Key-risk rows updated for the split (4 services, not 5; `GetGeoScopeService` survives; D-1 → A2; DD-1r replaces the reverted internal signal); the "6 requests → 2" promise in two places now attributes it to A + A2 + B |
| **R3-5** (Chunk A proposal unmeetable) | **FIXED** — a `⚠️ SUPERSEDED IN PART` header maps each superseded claim, including A-SC1 and A-SC5, to its actual state |
| **R3-6** (false "uniformly stale" claim) | **FIXED** — D-AC5 now records that the split-brain page **already exists in production**, with the mechanism traced, and that the follow-up ticket must say so |
| **R3-7** (mixed request bases, geo overclaims) | **FIXED** — NFR-PDB-001 fixes one basis (**7 → 4** for this spec, 2 only after A2 + B) and names what is excluded; the geo proposal's "one request" corrected to 4 → 3; `R-PDB-006`/`NFR-PDB-002` are **retired, not adopted** — A2 numbers its own `R-GEO-###` |
| **R2-2 / R2-7 overstatements** | **ACKNOWLEDGED in place.** Both were the orchestrator's, both flagged identically by both judges. R2-2: a source was declared while its only consumer was deleted in the same edit. R2-7: the ledger claimed a summation that was never performed |

## 19. Final state

| Field | Value |
| --- | --- |
| Protocol rounds | 2 fix + 2 re-judgment (both ceilings reached) |
| Out-of-protocol pass | 1, user-authorised, **unreviewed** |
| Round-3 findings | 7 of 7 addressed · 0 outstanding |
| Gates | **GATE-1 ✅ closed by measurement** · **GATE-2 ⛔ open** (mockup) |
| Requirement changes in this pass | AC.6 narrowed to intent · AC.7 added · RSK-1 closed |
| Terminal receipt | **`ESCALATED ⚠️`** — unchanged. The escalation was resolved by user decision, not by the protocol; the round-4 delta carries no independent review |

**Remaining before `tasks.md`:** GATE-2 only.
