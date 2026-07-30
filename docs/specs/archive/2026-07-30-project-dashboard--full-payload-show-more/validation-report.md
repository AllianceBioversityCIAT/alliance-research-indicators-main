# Validation Report — Project Dashboard / Full-payload migration + Show-more + title alignment

- **Spec:** `docs/specs/project-dashboard/full-payload-show-more/`
- **Phase:** `/akili-validate` — final conformance audit before archive
- **Auditor:** T3 Auditor (`opus`). Author ≠ auditor holds: all production code was written by `sonnet` Implementers, except T-06 (documented `opus` routing waiver — see §9).
- **Tree audited:** commit `8738adaf`, branch `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator`
- **Date:** 2026-07-30

---

## 1. Verdict

> ### 🟡 CONDITIONAL PASS — the code is conformant; the spec is not closeable yet.
>
> **Every functional requirement is implemented and gated by a mutation-killable test.** I ran nine of my own mutants against the shipped code and all nine reddened. The build, the full suite, coverage and lint all reproduce the reported figures exactly.
>
> **Three things block archive.** One is a real acceptance gate that has never been run (NFR-PDB-004). Two are owner decisions that were correctly escalated and never answered. Separately, I found **four live false or dangling statements in the spec documents and one in shipped production code** that the run's own closure pass missed.

| Dimension | Verdict | One-line reason |
| --- | --- | --- |
| Functional requirements (R-PDB-001…008) | ✅ **PASS** | All ACs satisfied; every one has a gate I proved can fail |
| NFR-PDB-001 request reduction | ✅ **PASS** | One `reports/full`; zero `reports/top-*` anywhere in `src/` |
| NFR-PDB-003 toggle a11y | ✅ **PASS** | Real `<button>`, `aria-expanded`, title-bearing accessible name, 5.19:1 contrast |
| **NFR-PDB-004 layout containment** | ⚠️ **UNVERIFIED — never passed** | Mechanism independently re-measured by me across 6 viewports (zero delta). The six-step human check remains **unrun**. |
| NFR-PDB-005 test/lint floors | 🟡 **PARTIAL** | `npm test` + `npm run lint` clean. **`npm run s-lint` exits 2 with 352 errors** — criterion not met as literally written |
| Design conformance (DD-1r…DD-14) | ✅ **PASS** | Every live design decision traced to code |
| Visual-reference conformance (mockup) | ✅ **PASS** | Mockup and product agree on limit, label, aria string, and mechanism |
| **Spec-document accuracy** | ❌ **FAIL** | 4 live false/stale statements in `tasks.md`/`design.md`; 1 dangling citation shipped in production code |
| Leader's own judgments (7 audited) | 6 upheld · 1 partially disputed | See §9 |

**Recommended disposition:** do **not** run `/akili-archive` yet. Fix the five documentation defects in §11 (agent-fixable, ~20 minutes), then obtain the three owner decisions. The code needs no change.

---

## 2. Scope & Method

### What I verified myself, rather than accepted

| Claim under audit | How I tested it | Result |
| --- | --- | --- |
| Full suite 304 / 6234, coverage 99.34/98.24/99.16/99.57 | Ran `npm run test:coverage` | **Exact match** |
| `npm run build` passes | Ran it | Exit 0 |
| `npm run lint` clean | Ran it | "All files pass linting." |
| `npm run s-lint` "unchanged" | Ran it | **Exit 2 · 352 errors · 0 hits in any `project-dashboard*` path** |
| A-07.6 gate is real (the run's highest-value find) | Deleted `(expandToggled)` from each of the 4 cards in turn | **4/4 reddened** |
| R-PDB-004 encoding invariance is gated | Repointed `barColor` at `visibleItems()` | Reddened |
| DD-14 geometry is gated | Uncapped `layoutItems`; dropped `absolute` from the overlay | Both reddened |
| NFR-PDB-003 is gated | Dropped `aria-expanded` | 6 cases reddened |
| DD-14 zero-delta across viewports | Re-ran the GATE-2 mockup probe in headless Chrome at **6 viewports** | **Zero delta, both directions, every mode-3 run** |
| The controls that make that zero meaningful | Same probe, mode 2 (`max-height`) | **+52 partners / +13 contacts — to the pixel** |
| R-PDB-008 deletion is complete | Repo-wide grep for all 12 retired symbol forms | **0 hits** |

### Absent artefacts — confirmed, not hunted

No `test-report.md` (`/akili-test` was never run) · no prior `validation-report.md` · **zero** `## Constitution Impact` notes in `execution.md` · `docs/infrastructure.md` has **no `## Local Environment` section** (verified: its headings run §1 Target Environment … §5 Infrastructure Rules, then Open Items).

Phase 4's "reuse the test report" shortcut was therefore unavailable — coverage was verified directly. Phase 3's environment boot smoke is **not applicable**: client-only spec, no route and no endpoint added.

### Method deviations, disclosed

1. **The six-step human check was NOT run.** It requires the running application and a project with >5 partners. My headless-Chrome work measured the **GATE-2 mockup**, which is a model of the product, not the product. NFR-PDB-004 stays UNVERIFIED.
2. **Skills loaded:** `cognitive-doc-design`, `angular-developer`, `ui-ux-pro-max`. The 4R sweep in §7 is advisory and non-gating.
3. **`git stash` was never used.** All mutation probes were restored with `git checkout HEAD -- <path>`, run from the repo root. `stash@{0}` (the labelled REJECTED T-06 diff) is intact.

### Working-tree integrity

`git status --porcelain` returns **empty** at the end of this audit — verified after every mutation batch and again at close. No probe residue. `dist/` output from `npm run build` is gitignored.

---

## 3. Phase 1 — Task Completion

| Task | Box | Attempts | Execution notes | Verification evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| T-01 data layer | `[x]` | 1 | 4 decisions (E-01.1…4), 4 advisories | `HttpTestingController` URL + encoding; `loadError` clears `payload` | ✅ |
| T-02 card contract | `[x]` | 1 | 3 decisions + a *Correction of record* retracting a faulty rationale | Encoding/structural split re-derived by the Reviewer from the template | ✅ |
| T-03 toggle + a11y | `[x]` | 2 | E-03.2 — the `[class.pr-1.5]` → `pr-1` silent-emit trap | Fix confirmed at emitted-instruction level **and** in the AOT bundle | ✅ |
| T-04 card spec | `[x]` | 1 | 3 decisions; +194 LOC over estimate, adjudicated load-bearing | **8 mutants, 7 killed, 8th proven equivalent**; coverage → 100/100/100/100 | ✅ |
| T-05 dashboard rewire | `[x]` | 1 | Narrowings traced to **server SQL**, not to the client mirror | Full suite: exactly 4 failures, all expected, no fifth | ✅ |
| T-06 expansion + geometry | `[x]` | 2 post-pivot | Full **Pivot Record** (DD-13 → DD-14); routing waiver disclosed | Two independently-built Chrome probes; both known failures reproduced as controls | ✅ |
| T-07 dashboard spec | `[x]` | 2 of 3 | 7 decisions; budget tripwire escalated | **16 Reviewer mutants, 13 killed** — the 3 survivors became A-07.6 | ✅ |
| T-08 deletion + A-07.6 | `[x]` | 1 | 4 decisions; both Leader rulings audited and upheld | **8/8 mutants killed, re-run by the Reviewer**; delta arithmetic audited term by term | ✅ |
| **T-09 keyboard overlay** | `[ ]` | — | Owner-deferred 2026-07-29, minted via the same owner-approval route as A-07.6 | n/a | ⬜ **deferred, legitimately** |

**Finding.** Every completed task carries execution notes *and* independently re-run verification evidence. The evidence standard is unusually high: in six of eight tasks the Reviewer re-derived the result rather than accepting it, and in four tasks it invented mutants the Implementer had not anticipated.

**T-09 is a real, live defect, not bookkeeping.** My probe measured the expanded overlay's scroll content at **5903px inside a 228px box** for the partners card. That content is unreachable by keyboard: the overlay is a plain `div` with no `tabindex` and no `role`. This is a WCAG 2.1.1 gap on a changed screen (PRD **C-4**). It is correctly disclosed in `docs/ux-ui/design.md` §10.1 and must not be lost at archive.

---

## 4. Phase 2 — File Inventory

Verified against the `design.md` §2.1 file tree. **All 21 rows reconcile.**

### New — 4 of 4 present

| Path (relative to `client/research-indicators/src/app/`) | Est. | Actual |
| --- | --- | --- |
| `shared/interfaces/contract-full-reports.interface.ts` | ~90 | 102 |
| `shared/services/get-full-contract-reports.service.ts` | ~75 | 66 |
| `shared/services/get-full-contract-reports.service.spec.ts` | ~110 | 151 |
| `testing/contract-full-reports.mock.ts` | ~60 | 105 |

### Deleted — 8 of 8 gone

All four `get-top-*.service.ts` and all four `get-top-*.service.spec.ts` are absent. **`get-geo-scope.service.ts` survives**, as R-PDB-008 AC.4 requires.

### Modified — 9 of 9 present, all at plausible sizes

`api.service.ts` (1201) · `api.service.spec.ts` (2213) · `project-dashboard.interface.ts` (100) · `project-dashboard.component.{ts,html,spec.ts}` (584 / 324 / 1118) · `project-dashboard-card.component.{ts,html,spec.ts}` (175 / 200 / 648).

The dashboard spec landed at 1118 lines against the "~1,124" reported at T-07 close; the card spec at 648 against the 534 reported at T-04 close (T-06 and T-08 added to it afterwards). Both consistent.

### Deletion completeness — the hard check

Repo-wide grep across `client/research-indicators/src/` for all **12** retired symbol forms (4 service classes, 4 `GET_Top*` methods, 4 endpoint path literals): **zero hits**. R-PDB-008 AC.1/AC.2/AC.3 satisfied.

**Five dead type declarations remain** in `project-dashboard.interface.ts` — `TopContributorsContractReport`, `TopPartnersReport`, `TopMainContactPersonsReport`, `TopPrimaryLeverItem`, `TopPrimaryLeversReport`. I confirmed each is referenced only by its own declaration (`TopPrimaryLeverItem` additionally by the already-dead `TopPrimaryLeversReport` — A-08.2's transitivity claim is accurate). Adjudicated in §9, call 3.

---

## 5. Phase 3 — Build Integrity

Run from `client/research-indicators/`. Server untouched — its suites were **not** run, correctly.

| Gate | Command | Result | Verdict |
| --- | --- | --- | --- |
| Tests + coverage | `npm run test:coverage` | **304 suites / 6234 tests, all passing** | ✅ |
| Coverage vs floors | same run | **99.34 / 98.24 / 99.16 / 99.57** vs **40 / 20 / 45 / 30** | ✅ |
| Production build | `npm run build` | exit 0; only pre-existing CommonJS warnings (`pdfjs-dist` etc.) | ✅ |
| TS/HTML lint | `npm run lint` | "All files pass linting." | ✅ |
| **SCSS lint** | `npm run s-lint` | **exit 2 — `✖ 352 problems (352 errors, 0 warnings)`** | ❌ **not clean** |

**Coverage-flag rule honoured.** This was a **full-suite run WITHOUT `--coverage=false`**, per the T-04 rule. No path-scoped run is cited anywhere in this report as coverage evidence.

**Per-file coverage on the spec's own surface:**

| File | Stmts / Branch / Func / Lines |
| --- | --- |
| `project-dashboard-card.component.ts` **and** `.html` | **100 / 100 / 100 / 100** |
| `project-dashboard.component.html` | 100 / 100 / 100 / 100 |
| `project-dashboard.component.ts` | 100 / 99.29 / 100 / 100 |
| `contract-full-reports.mock.ts` | 100 / 100 / 100 / 100 |
| `get-full-contract-reports.service.ts` | 94.73 / 94.11 / 100 / 93.33 (lines 60-61) |

Service lines 60-61 are the `catch` block, which E-01.1 established is **structurally unreachable** (`ToPromiseService` never rejects). The code carries an in-file comment saying exactly that. Honest, not a gap.

**s-lint, precisely characterised.** 352 errors across 44 `.scss` files. **Zero** of them land in any path matching `project-dashboard`. Neither the card nor the dashboard component directory contains a `.scss` file at all. The diff touches zero `.scss` files. So the output is provably unchanged by this spec — and equally provably **not clean**. Adjudicated in §9, call 2.

---

## 6. Phase 4 — Requirement Coverage

Every requirement traced **requirement → task → code → test**. Negative constraints (`BUT it must NOT`) and strict validations (`AND IT MUST`) are broken out separately, per the audit brief.

### 6.1 Functional requirements

| Req | AC | Task | Code evidence | Test evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| **R-PDB-001** | AC.1 one `reports/full` | T-01, T-05 | `GET_FullContractReports`; one `main()` in the load effect | service spec `issues exactly one GET to reports/full` (`HttpTestingController`) | ✅ |
| | AC.2 no `reports/top-*` | T-05, T-08 | endpoints gone from client | **Vacuous by construction** — grep: 0 hits. Correct end state; §7 DC-2 locates the live gate in the HTTP specs | ✅ |
| | AC.3 `contract-id` encoded | T-01 | `encodeURIComponent` | service spec `encodes a contract-id containing a space and a slash` | ✅ |
| | AC.4 error state + Try again | T-01, T-05 | `loadError` + `payload.set(null)`; `(retry)="reports.update()"` ×4 | service spec `a retry after a failure re-issues…`; host spec retry count-of-4 | ✅ |
| | AC.5 different contract | — | Satisfied by component recreation (D-AC5) | host spec `should start a fresh component instance fully collapsed` | ✅ |
| **R-PDB-002** | AC.1 exactly 5 collapsed | T-02 | `visibleItems` slice | card spec `renders exactly 5 rows when visibleLimit=5` | ✅ |
| | AC.2 ≤5 → no toggle | T-03 | `canExpand()` guard | card spec `renders no toggle for a section of exactly 5 items` | ✅ |
| | AC.3 top 5 descending | T-05 | explicit `.sort()` on all four computeds | host spec `should build and sort ranked service items` | ✅ |
| | AC.4 empty state | T-02 | state chain unchanged | card spec `render every state branch` | ✅ |
| | **AC.5 no binding → unchanged** | T-02 (DD-12) | `input<number \| null>(null)` | card spec `renders every item when visibleLimit is never bound`; geo card binds **0** `visibleLimit` (verified by grep) | ✅ |
| **R-PDB-003** | AC.1 all items, ranks past 5 | T-02 | `visibleItems()` in overlay | card spec `continues the rank badge past 5` | ✅ |
| | AC.2 zero network on expand | T-06 | host flips a `Set`; card is presentational — **no injection path to HTTP** | **By construction; no explicit assertion.** See finding V-9 | 🟡 |
| | AC.3 Show less restores 5 | T-03 | `toggleLabel` computed | card spec `returns to a single visible in-flow list when the card collapses again` | ✅ |
| | AC.4 one card only | T-06, T-08 | per-`ChartKey` `Set` | **4 generated A-07.6 cases** — I reddened all four myself | ✅ |
| | AC.5 no dialog/navigation | T-06 | no router call, no modal service | card spec structural (`inset-0` inside the card) | ✅ |
| | AC.6 fresh instance collapsed | T-06 | plain `signal`, component-lifetime | host spec AC.6 case; killed by Reviewer mutant M6 (×4) | ✅ |
| | **AC.7 retry preserves state** | T-06, T-07 | nothing keyed to `payload()` | host spec AC.7 case, **rewritten in T-07 attempt 2** to drive real payload identity changes; killed by M1/M11 | ✅ |
| **R-PDB-004** | AC.1 colour invariant | T-02 | `barColor` reads `items()` | card spec state-comparison loop on rendered `style.backgroundColor` — **I reddened it** | ✅ |
| | AC.2 width invariant | T-02 | `partnerBarWidthPercent` → `maxCount()` on `items()` | same case, rendered `style.width` | ✅ |
| | AC.3 collapse restores | T-02 | same asymmetry | `recollapsed` `toEqual(collapsed)` | ✅ |
| | AC.4 descending-sorted scale | T-05 | explicit sort added to all four (partners had none) | host spec out-of-order fixture section | ✅ |
| **R-PDB-005** | AC.1-AC.3 stable identity | T-05 | contacts key on `user_id`; partners `institution_id`; levers `lever_id`; contributors `contract_id` | host spec homonym case; killed by M7 | ✅ |
| **R-PDB-007** | AC.1 four exact titles | T-05 | verified in `.html:160/171/182/193` | host spec exact-string `toEqual([...])`; killed by M9 (×4) | ✅ |
| | AC.2 none begins "Top " | T-05 | none of the four does | implied by AC.1 (A-07.7 notes the explicit loop is unreachable-fail) | ✅ |
| | AC.3 by-indicator/by-status unchanged | — | bespoke markup untouched | — | ✅ |
| | **AC.4 geo `<h3>`s untouched** | fence | Verified: all three still read "Top …" | — | ✅ |
| **R-PDB-008** | AC.1-AC.3 | T-08 | 8 files deleted; 0 grep hits on 12 symbol forms | full-suite run | ✅ |
| | AC.4 `GetGeoScopeService` survives | T-08 | present | geo card suites green | ✅ |
| | AC.5 full suite passes | T-08 | — | **304 / 6234, run by me** | ✅ |

### 6.2 The negative constraints and strict validations, called out

The brief flagged R-PDB-008's scenario as carrying both. It does, and so do four others. Each is discharged:

| Scenario clause | Type | Discharged by |
| --- | --- | --- |
| R-PDB-001 · *"BUT it must NOT issue any `reports/top-*` request"* | negative | Grep: 0 references to any of the 4 endpoint literals anywhere in `src/`. Stronger than a spy — the code cannot express the call |
| R-PDB-001 · *"AND IT MUST encode `contract-id`"* | strict | `HttpTestingController` case with a literal space and `/` |
| R-PDB-002 · *"BUT it must NOT cap them at 5, because nothing asked it to"* | negative | `visibleLimit` defaults to `null`; geo card binds it **zero** times; T-06 proved the geo `variant="list"` DOM byte-identical to HEAD for n = 0/1/3/5/6/12/37 |
| R-PDB-003 · *"BUT it must NOT issue a network request, open a modal, or navigate away"* | negative | No HTTP/router/modal reachable from the card or the toggle path. **Not asserted explicitly** — see V-9 |
| R-PDB-003 · *"AND IT MUST leave every other card collapsed"* | strict | The 4 A-07.6 cases assert *only* the emitting card's key flips. I reddened all four |
| R-PDB-003 retry · *"BUT it must NOT collapse the expanded chart"* | negative | AC.7 case, mutation-proven against the exact `linkedSignal` defect it exists to kill (M1) |
| R-PDB-004 · *"BUT it must NOT recolour or resize any row already on screen"* | negative | Encoding members read `items()`; I proved the gate by repointing `barColor` → red |
| R-PDB-004 · *"AND IT MUST hold identically when collapsing again"* | strict | `recollapsed toEqual(collapsed)` |
| **R-PDB-008 · *"BUT it must NOT leave a dangling import or a skipped spec"*** | negative | Reviewer hand-checked every import in both modified specs (necessary — `eslint.config.js` ignores `**/*.spec.ts`, A-08.4). I re-verified: no `.only`/`.skip`/`fdescribe`/`xit` in the run |
| **R-PDB-008 · *"AND IT MUST be a full-suite run, not a targeted one"*** | strict | **Satisfied by my own run**: 304 suites / 6234 tests, with coverage |

### 6.3 Non-functional requirements

| NFR | Target | Status | Evidence |
| --- | --- | --- | --- |
| NFR-PDB-001 | 4 `top-*` → 1 `full` | ✅ **PASS** | Endpoints gone; `trd.md` §3.2 PERF-5 records the honest **7 → 4** basis and explicitly forbids "6 → 4" |
| NFR-PDB-003 | Toggle a11y | ✅ **PASS** | Real `<button type="button">`, `aria-expanded`, `aria-label = "${toggleLabel()}, ${title()}"`, `focus-visible` ring. Contrast `#1771b3` on white = **5.19:1** (AA needs 4.5:1). Dropping `aria-expanded` reddens 6 cases |
| **NFR-PDB-004** | Layout containment, 2 conditions | ⚠️ **UNVERIFIED** | Mechanism measured (below). **Acceptance check unrun.** |
| NFR-PDB-005 | Tests + lint + floors | 🟡 **PARTIAL** | Tests ✅, `lint` ✅, floors ✅ — **`s-lint` ❌** |

**NFR-PDB-004 — what I measured, and what it does and does not prove.**

I re-ran the GATE-2 mockup probe in headless Chrome across **six viewports** (1440×900, 1280×900, 1024×900, 900×900, 1440×700, 1920×1080). Maximum delta across `ranked`, `leftcol`, `outer`, `statusbox`, `docHeight` and the individual cards:

| Mode | 1440×900 | 1280×900 | 1024×900 | 900×900 | 1440×700 | 1920×1080 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · unbounded (control) | +6225 | +6249 | +6679 | +6679 | +6225 | +6225 |
| 2 · `max-height` (control) | **+65** | +82 | +147 | +147 | +65 | +65 |
| **3 · DD-14 (shipped)** | **0** | **0** | **0** | **0** | **0** | **0** |

Per-card at 1440×900, mode 2: partners **+52**, levers +49, contacts **+13**, contributors **+13** — reproducing the real component's audited figures **to the pixel**. Mode 3 read `0` on every metric in every state, **including collapse-again**, i.e. no shrink either. `focusableInSpacer` was `0` in all seven states, confirming no tab stop inside the `aria-hidden` subtree.

**This proves the mechanism.** A model that reproduces two known failures as controls and then reads flat is measuring something real — that is the correct epistemic standard and the run applied it.

**It does not prove acceptance.** I measured the mockup, not the product. The six-step human check in `requirements.md` §7 is still **UNRUN**, and NFR-PDB-004 is **UNVERIFIED, never passed**.

---

## 7. Phase 5 — Quality Audit (4R lens — advisory, non-gating)

### 7.1 Carried-forward advisories — none dies in this audit trail

The brief named four explicitly. All four are **live and correctly characterised**; I re-verified each at source.

| # | Finding | My verification | Disposition |
| --- | --- | --- | --- |
| **A-07.2** | `id: String(item.institution_id)` → if the endpoint ever emits `institution_id: null` for ≥2 partners, two `'null'` keys collide → Angular **NG0955** | **Confirmed live.** `project-dashboard.component.ts:173` is `id: String(item.institution_id)` with no client-side guard. E-05.2's SQL argument (`INNER JOIN clarisa_institutions` + `GROUP BY`) is sound *server-side*, but nothing enforces it at the client boundary | **Carry to a hardening spec.** Not a defect today; not this spec's to fix |
| **A-08.1** | `(retry)` coverage is per-mechanism, not per-card — all four collapse onto one `call count of 4` case | **Confirmed.** I dropped `(retry)` from Primary Levers alone: **1 test reddened**, and it names no card. So a dead retry binding is *caught but not localised* | **Spec-conformant** — `tasks.md` T-08 prescribes exactly this shape. Cheap improvement if revisited |
| **A-08.2** | **Five** dead declarations, not four — `TopPrimaryLeverItem` is transitively dead | **Confirmed exactly.** Grep counts: four at 1 hit (own declaration), `TopPrimaryLeverItem` at 2 (own + the already-dead `TopPrimaryLeversReport`) | **Carry to `../geo-scope-expansion/`**, which already retires `GeoScopeReport` from the same file |
| **A-08.4** | Spec files have **no static dead-code gate** in this repo | **Confirmed by construction:** `eslint.config.js` ignores `**/*.spec.ts`; Jest runs `isolatedModules: true` (transpile-only); `tsconfig.app.json` is `files: ["src/main.ts"]`, so no spec enters `ng build`'s graph | **Candidate Kaizen lesson.** "Lint clean" is never evidence about spec-file imports |

**Also still open from earlier tasks, and not to be lost:** A-03.3 (`#1771b3` has no `--ac-*` token — root `CLAUDE.md` §4.2 exception still undocumented in a decision log) · A-03.5 (bar `transition-[width]` ignores `motion-reduce`) · A-03.6 (Tailwind v4 leading-`!` important-modifier question, repo-wide) · A-06r.2 (collapsed state is `overflow-visible`, ~13px headroom on contacts/contributors before a visible spill) · **A-06ii.3 (dangling probe citation — now escalated by me to a live defect, see V-4)**.

### 7.2 New 4R findings from this audit

| Lens | Finding | Severity |
| --- | --- | --- |
| **Risk** | The shipped template comment (`project-dashboard-card.component.html:49`) directs a future maintainer to `scratchpad/geometry-probe.html`. **That path does not exist anywhere in the repo.** The real probes are at `./evidence/dd14-geometry-probe.html`. A-06ii.3 flagged this and it was never fixed — so a wrong pointer is now *shipped in production code*, in a comment whose whole purpose is to stop someone re-deriving DD-13 | **WARN** — see V-4 |
| Reliability | `visibleItems` does not clamp a negative `visibleLimit` (A-02.2). Nothing reachable passes one. Unchanged; noted for the public input contract | ADVISORY |
| **Touch/interaction** | The toggle is `!px-0.5` with 13px text — its hit area is well under the **44×44px** minimum. The dashboard renders single-column on mobile, so this is a reachable state | **ADVISORY (new)** |
| Accessibility | `prefers-reduced-motion` **is** honoured on the caret (`motion-reduce:transition-none`) ✅. Not on the bars (pre-existing, A-03.5) | ADVISORY |
| Performance | DD-14 eliminates content-jumping entirely — measured zero. This is *better* than the `ui-ux-pro-max` `content-jumping` guideline requires | ✅ positive |
| Readability | The card component is 175 lines with dense but accurate doc comments that name the requirement each member serves. Comment quality here is a genuine asset; T-06 attempt 1's rejected version was flagged specifically for a comment that overclaimed, and the shipped one does not | ✅ positive |

---

## 8. Phase 6 — Design & Visual Conformance

### 8.1 Design decisions → code

| DD | Decision | Traced to | Verdict |
| --- | --- | --- | --- |
| DD-1r | Card presentational: `visibleLimit` in / `expandToggled` out | `card.component.ts:49,63` | ✅ |
| DD-2r | Service exposes a `payload` signal; host holds `signal<ReadonlySet<ChartKey>>`, emits a **new** `Set` | `service.ts:39-65`; `dashboard.component.ts:208,221-231` | ✅ (M8 kills in-place mutation) |
| DD-3 | Toggle once in the `variant="card"` shell, **inside** the `@if (items().length)` arm | `card.component.html:63` sits inside the `:32` arm | ✅ (M8 killed the relocation mutant) |
| DD-4 | Encoding over the **full** list | `barColor`, `maxCount`, `totalCount`, `fillPercent`, `partnerBarWidthPercent` all read `items()` | ✅ |
| DD-5 | Four titles verbatim | `.html:160/171/182/193` | ✅ |
| DD-7 | `COLLAPSED_ITEM_LIMIT = 5` **exported** | `card.component.ts:18`, imported by the host | ✅ |
| DD-9 | Service **component-scoped** | `dashboard.component.ts:54` `providers: [...]` | ✅ |
| DD-10r | `contractId` keeps its `snapshot` derivation | no `paramMap` subscription added | ✅ |
| DD-12 | `visibleLimit` defaults to `null` | `card.component.ts:49` | ✅ |
| ~~DD-13~~ | superseded | `rankedGridIndependent` gone; ranked grid keeps `lg:items-stretch` unconditionally (`.html:157`) | ✅ correctly removed |
| **DD-14** | Freeze the geometry, mechanism (ii) | `card.component.html:52-62` — `relative` wrapper + `invisible`/`aria-hidden` in-flow spacer + `absolute inset-0 overflow-y-auto pr-[6px]` overlay | ✅ measured |

### 8.2 Conformance to the proposal's Visual Reference (the mockup)

The proposal §8 designated `./mockup/index.html` the layout contract. I checked the artefact against the shipped component:

| Property | Mockup | Shipped | Match |
| --- | --- | --- | --- |
| Collapsed cap | `const LIMIT = 5` (cites `card.component.ts:18`) | `COLLAPSED_ITEM_LIMIT = 5` | ✅ |
| Visible toggle text | `isOpen ? 'Show less' : 'Show more'` | identical | ✅ |
| Accessible name | `label + ', ' + title`, with a comment stating **no count suffix** | `` `${toggleLabel()}, ${title()}` `` | ✅ (A-8 correction landed) |
| `aria-expanded` | present, tracks state | present, tracks state | ✅ |
| Containment mechanism | mode 3 default = DD-14 in-flow spacer + absolute overlay | same | ✅ |
| Superseded rules | **zero live** `46vh` or `align-items:start` CSS — the 4 textual hits are all in explanatory comments | n/a | ✅ verified line-by-line |

**GATE-2's re-closure is sound.** The mockup no longer models a rejected design, its fidelity claims were corrected to name what is transcribed *and* what is deliberately collapsed, and I independently reproduced its result across six viewports with working controls.

### 8.3 Constitutional documents

| Doc | Records | Honesty fence |
| --- | --- | --- |
| `docs/ux-ui/design.md` §8.1 | Expandable ranked-card pattern, DD-12, frozen geometry | ✅ |
| §10.1 | Toggle a11y **plus the explicit T-09 keyboard gap** — *"Do not infer full WCAG 2.1.1 (Keyboard) conformance on this screen until T-09 lands"* | ✅ **exemplary** |
| §12.2 | DD-14 with DD-13 recorded as superseded and the one-line reason; four renamed titles as exact strings; the fifth deferred `"Top geographic scope"` | ✅ |
| §12.2 (DD-14 entry) | *"the six-step human-check acceptance … was, as of this entry, still unverified — treat that as a separate, unresolved fact"* | ✅ **no sign-off leakage** |
| `docs/trd/trd.md` §3.2 PERF-5 | 7 → 4 request reduction, explicitly forbidding "6 → 4" | ✅ |
| §6.3 | `reports/full` as the dashboard's single analytics contract; four retired methods; `GetGeoScopeService` surviving; server endpoints untouched | ✅ |

**I found no statement in either constitutional document that reads as NFR-PDB-004 sign-off or as WCAG 2.1.1 conformance.** Both fences hold.

---

## 9. Audit of the Leader's Own Judgments

The Leader adjudicated seven calls and authored spec-document edits during this run. It cannot validate itself. Each is challenged below.

### Call 1 — NFR-PDB-004 reported UNVERIFIED, never passed

**Verdict: ✅ CORRECT, and honestly recorded in every live location.**

I swept for sign-off leakage across `requirements.md` §6/§7/§11, `design.md` §6.3.2/§13, `tasks.md` header/T-06/§8, `execution.md`, `docs/ux-ui/design.md` §12.2 and `docs/trd/trd.md`. **Every one distinguishes "mechanism measured" from "acceptance verified."** Four of them carry the explicit fence **"GATE-2 ≠ NFR-PDB-004 acceptance."**

This is the single strongest piece of discipline in the run. A weaker Leader would have let a measured zero across six viewports stand in for the acceptance gate — the reasoning would even have been defensible. It did not.

**One residual risk worth naming:** `tasks.md` §8's human-check row now opens with a green *"✅ No longer blocked"* before the ❌. A hurried reader scanning for ticks could misread the row. The ❌ and the words *"STILL UNRUN … never passed"* are both present, so this is a formatting nit, not a dishonesty.

### Call 2 — `s-lint` accepted under "introduces no *new* errors"

**Verdict: ✅ ACCEPTANCE CORRECT · ❌ CRITERION NOT MET AS WRITTEN · ⚠️ OWNER DECISION STILL REQUIRED.**

I ran it: exit 2, 352 errors, 44 `.scss` files, **zero** in any `project-dashboard*` path, and neither component directory contains a `.scss` file at all. The diff touches zero `.scss` files.

**Should this be a FAIL against the literal criterion?** No — and the reasoning matters:

1. Meeting it literally means fixing 352 errors in 44 unrelated files. That is **itself a scope violation**, and on the spec's final task.
2. The criterion was **recognised as unachievable before T-08 ran** (`tasks.md` T-08 names both readings and marks the owner decision open). The Implementer did not invent the reinterpretation; the spec offered it.
3. It is recorded as **NOT MET** in three places — T-08's status line, `tasks.md` §8 (unticked `[ ]`), and `execution.md` E-08.2.

**But the box must not be ticked at archive.** The prompt notes T-08's box "says clean" — accurately, that is the *acceptance criterion text*, which is an unticked `[ ]` immediately contradicted two lines later by *"`s-lint` criterion: NOT met as literally written."* No box was ticked. **This is a criterion-authoring defect, honestly disclosed, awaiting an owner ruling — not a concealed pass.**

### Call 3 — Five dead declarations left in `project-dashboard.interface.ts`

**Verdict: ✅ UPHELD, on the strongest of the three grounds.**

- **AC.3 is not engaged.** It forbids references to a *deleted* symbol. These are *unreferenced*, not deleted. Zero dangling references in either direction — I verified by grep.
- **R-PDB-008's Details are an exhaustive enumeration** (four services + four api methods + specs). Interfaces appear nowhere in it.
- **Decisive:** `project-dashboard.interface.ts` is **not in T-08's file fence**. Editing it is what an audit should reject, not require. Had the Leader swept them, I would be writing this as a scope-violation FAIL.

**Spirit test also passes.** R-PDB-008's intent is *"one analytics data path."* Type-only declarations are erased at compile time — they are inert, not a second path. They add zero runtime surface and zero bundle weight.

**Condition:** this is real dead code and must not be lost. It is on the carry-forward list (A-08.2) with a named home (`../geo-scope-expansion/`, which already retires `GeoScopeReport` from the same file). **`/akili-archive` must transfer it, not close over it.**

### Call 4 — A-07.6 folded into T-08 on owner approval

**Verdict: ✅ LEGITIMATE — and vindicated by outcome.**

`/akili-execute` §2.4 bars the Leader from widening a task from an advisory *on its own initiative*. The owner's explicit choice is the authority, and the record uses the same route that created T-09. The Leader **declined** the Reviewer's invitation to overrule to FAIL (E-07.7) on the spec's own asymmetric wording, then escalated instead. That is the textbook path.

**The outcome settles it.** I deleted `(expandToggled)` from each of the four cards in turn: **all four reddened**. Before A-07.6, three of those mutants survived at 47/47 — two "Show more" toggles were deletable with the entire repo green, in the one PR a user notices. **This was the run's highest-value find and the gate that now catches it is real. I verified it by deleting a binding and observing red.**

**Audit limitation, stated plainly:** I audit the *record*, not the owner's actual words. I have no transcript. The record's internal consistency, the parallel T-09 precedent, and the explicit `/akili-execute` §2.4 citation are the evidence available, and they cohere.

### Call 5 — Leader-authored spec edits

**Verdict: 🟡 CORRECT WHERE MADE — but INCOMPLETE. Four live spec statements are still false.**

| Edit | Verdict | My check |
| --- | --- | --- |
| §7 **step 6** corrected to per-row equality | ✅ **Correct and important** | The ranked grid's two rows are separate `auto` tracks. Equality *is* per-row (366/366/405/405). The old wording would have produced a **false failure report on the very check this work unblocked** |
| **GATE-2 re-closed in three places** | ✅ Correct | `requirements.md` §11, `design.md` §13, `tasks.md` header now agree, are dated, state the first closure was unsound, and each carries "GATE-2 ≠ NFR-PDB-004 acceptance" |
| T-07 *"Evidence that does NOT count"* amended (E-07.2) | ✅ Correct | `strictTemplates` genuinely cannot gate spec files here — `tsconfig.app.json` `files: ["src/main.ts"]` + Jest `isolatedModules: true`. Amending a factually false clause is root `CLAUDE.md` §5, not scope creep |
| Two stale T-03 claims **struck** rather than deleted | ✅ Correct | *"taken verbatim from the mockup"* is the exact reasoning that failed; keeping it struck preserves the warning |

**But four live statements are still false.** All four are in files the closure pass edited:

- **V-1 — `tasks.md:5` (the Status header)** asserts *"its reference mockup is wrong — A-08.3"* and *"`design.md`/`trd.md` are not updated."* **Both were closed on 2026-07-30.** The header now contradicts §8 of its own file, where the docs row is `[x]` and the human-check row explicitly says *"No longer blocked — A-08.3 is closed."* The Leader corrected §8 (advisory A-3) and left the header that summarises it.
- **V-2 — `tasks.md:202` (T-06 entry)** still says *"`mockup/index.html` **still models the superseded DD-13 / `46vh`**, so the reference for that check is currently wrong."* **False.** I verified: zero live `46vh` or `align-items:start` rules.
- **V-3 — `tasks.md:338` (RB-2)** still says *"The **five**-step human check."* The Leader corrected §8's five→six and noted the correction there, but not in RB-2.
- **V-4 — `design.md:221`** cites *"a reusable geometry probe exists at `scratchpad/geometry-probe.html`."* **That path does not exist in the repo.** The probes live at `./evidence/`. **The same dangling citation is baked into shipped production code** at `project-dashboard-card.component.html:49`. This is A-06ii.3, flagged and never fixed — and it is now the *only* pointer a future maintainer has from the code to the evidence that stops them re-deriving DD-13.

There is also **V-5**: `requirements.md` §11, `design.md` §13 and `execution.md` §4 all cite `./evidence/mockup-dd14-measurements.json` as the *"raw run"* behind a claim of **seven viewports**. The committed file contains **one** (1440×1400, 22 runs). `dd14-measurements.json` likewise holds one (1440×900), against a claimed six. **The claims are true** — I reproduced them across six viewports myself — but the committed artefact under-evidences them, on the one file that exists to make the table falsifiable rather than asserted. Given this spec's own history (a mockup that could not model the defect it settled), that gap deserves naming.

**On `judgment.md` (E-C.4): 🟡 PARTIAL DISAGREEMENT.** I agree entirely that a point-in-time adjudication record must not be rewritten — rewriting history there would be dishonest, and the live gates are correctly reconciled elsewhere. **But leaving it *entirely* untouched is not the only honest option, and this spec already knows the better one:** `proposal.md` carries a prominent *"⚠️ SUPERSEDED IN PART — read `requirements.md` and `design.md` instead"* banner with a table of what changed. `judgment.md` has no such pointer, and a reader landing on its §Verdict table sees **"GATE-2 ⛔ open"** with nothing telling them where live state lives. **A one-line non-destructive banner would preserve the record and prevent the misread.** The precedent exists in this spec and was applied inconsistently.

### Call 6 — `/akili-test` skipped

**Verdict: ✅ JUSTIFIED — with one honest caveat.**

The justification is unusually strong. Every requirement has a gate, and those gates are **mutation-proven, not merely green**: 8 mutants at T-04, 16 at T-07, 8 at T-08, 7 at T-06 attempt 2 — and 9 more by me during this audit. Coverage is 99.34/98.24/99.16/99.57 against floors of 40/20/45/30, with the card component at a straight 100/100/100/100 on both `.ts` and template. `/akili-test` would author suites; the suites already exist and are demonstrably falsifiable, which is a higher bar than a passing suite.

**Caveat:** no independent Tester ever derived a test from the requirements alone. Requirement→test traceability rests on agents who also saw the implementation. That risk is mitigated — but not eliminated — by `author ≠ auditor` holding throughout (except T-06's disclosed waiver) and by Reviewers inventing mutants the Implementers had not anticipated. **Not a coverage gap in practice**, as §6.1 shows every AC mapped to a live assertion.

**One genuine residue (V-9):** R-PDB-003 AC.2 — *"Expanding issues zero network requests"* — has **no explicit assertion anywhere**. It is true by construction (the card is presentational and the host merely flips a `Set`; neither has a reachable HTTP path on the toggle). This is the one AC in the spec resting on structure alone. Low risk, worth a line at archive.

### Call 7 — Budget exceeded

**Verdict: ✅ PROPERLY HANDLED. This is the model for how to blow a budget.**

| Metric | Budget | Actual | Handling |
| --- | --- | --- | --- |
| Tasks | 8 | **9** | T-09 minted by **explicit owner approval**, not agent initiative, with the §2.4 route cited in the task body |
| Changed LOC | ≈1,600 | **≈1,470** | Under |
| **Rework rounds** | **2** | **3** ⚠️ | **The run STOPPED at T-07 attempt 1's FAIL and escalated.** Attempt 2 was not spawned until the owner decided |
| Pivots | 0 | **1** | Full Pivot Record with alternatives, costs and an owner decision |

The tripwire behaved exactly as designed: it fired, the run halted, the owner ruled, and the overrun is recorded in four places. **No overrun was absorbed quietly.** And the spend was justified by outcome — rework round 3 is what surfaced A-07.6.

---

## 10. Findings Ledger

### FAIL

| # | Finding | Location | Rule violated |
| --- | --- | --- | --- |
| **V-1** | The Status header asserts two things this run made false: *"its reference mockup is wrong"* and *"`design.md`/`trd.md` are not updated."* It contradicts §8 of the same file | `tasks.md:5` | Root `CLAUDE.md` §5 — do not let docs and reality drift |
| **V-2** | T-06's entry still says the mockup *"still models the superseded DD-13 / `46vh`"* | `tasks.md:202` | Root `CLAUDE.md` §5 |

*Both are documentation FAILs, not code FAILs. Neither affects the shipped product. Both are ~2-minute fixes.*

### WARN

| # | Finding | Location | Why it matters |
| --- | --- | --- | --- |
| **V-3** | RB-2 still says *"five-step"* human check; every other live location says six | `tasks.md:338` | The mitigation column of the risk that owns this gate understates the gate |
| **V-4** | `scratchpad/geometry-probe.html` does not exist. Cited in the design doc **and in shipped production code** | `design.md:221`; `project-dashboard-card.component.html:49` | A dangling pointer in the one comment whose job is to stop a maintainer re-deriving DD-13. A-06ii.3, thrice-flagged, never fixed |
| **V-5** | Committed raw runs hold **1 viewport each** against claims of six and seven | `evidence/mockup-dd14-measurements.json`, `evidence/dd14-measurements.json`, cited from 3 docs | Claims verified true by me, but the falsifiable artefact under-evidences them — on a spec whose defining lesson was an artefact that could not model what it certified |
| **V-6** | `npm run s-lint` exits **2** with 352 errors; NFR-PDB-005's literal criterion is unmet | `client/research-indicators/` | Correctly disclosed, but **the owner decision is still open** and the box must not be ticked at archive |
| **V-7** | **No `## Local Environment` contract** in `docs/infrastructure.md` | `docs/infrastructure.md` | Phase 3's environment boot smoke has no contract to run against. **Recommend `/akili-constitution` Step 6B** |
| **V-8** | `judgment.md` shows *"GATE-2 ⛔ open"* with no pointer to live state | `judgment.md:375` | E-C.4 is right not to rewrite it — but `proposal.md`'s "SUPERSEDED IN PART" banner is the precedent, and it was not applied here |

### ADVISORY

| # | Finding |
| --- | --- |
| **V-9** | R-PDB-003 AC.2 (*"Expanding issues zero network requests"*) has no explicit assertion — true by construction only. The only AC in the spec resting on structure alone |
| **V-10** | Toggle hit area is well under 44×44px (`!px-0.5`, 13px text). The dashboard renders single-column on mobile, so this is a reachable state |
| **V-11** | `Last updated: 2026-07-29` on all three of `requirements.md`, `design.md`, `tasks.md` — all edited 2026-07-30 |
| **V-12** | `requirements.md` carries **0 ticked / 37 unticked** AC checkboxes. Known bookkeeping, assigned to `/akili-archive` |
| — | Carried forward unresolved: **A-07.2** (NG0955 exposure) · **A-08.1** (`retry` not per-card) · **A-08.2** (five dead declarations) · **A-08.4** (no static dead-code gate for spec files) · A-03.3 (`#1771b3` token gap) · A-03.5 · A-03.6 · A-06r.2 |

### Positive findings worth carrying to Kaizen

1. **Mutation as the discriminator.** In this spec a green suite was repeatedly the *shape* of the defect. Four separate times, mutation was the only evidence that discriminated — culminating in A-07.6, where two "Show more" toggles were deletable with the whole repo green.
2. **Measurement over argument.** Three plausible CSS arguments were wrong (DD-13's `align-items`, attempt 1's `max-height`, and the original mockup's fidelity). All three died to a browser. **Headless Chrome is available locally** — this materially weakens the DC-8 "no automated gate for rendered layout" premise that RSK-4 and RB-2 were both built on.
3. **Controls make a zero mean something.** The mockup's mode-2 control reproducing +52/+13 *to the pixel* is what makes mode 3's zero trustworthy. A model that cannot reproduce a known failure cannot be trusted when it reports success — which is precisely how GATE-2's first closure passed while being wrong.
4. **Escalation discipline.** Every budget overrun, every advisory too serious to drop, and every routing waiver was surfaced at the moment it happened and routed to the owner rather than absorbed.

---

## 11. Blocking Items Before Archive

### Agent-fixable — do these first (~20 minutes, no code change)

- [ ] **V-1** — rewrite `tasks.md:5`. Drop *"and its reference mockup is wrong — A-08.3"* and *"`design.md`/`trd.md` are not updated"*. Both closed 2026-07-30.
- [ ] **V-2** — amend `tasks.md:202`; strike the *"still models the superseded DD-13"* clause, keep the UNVERIFIED status.
- [ ] **V-3** — `tasks.md:338` RB-2: five-step → **six-step**.
- [ ] **V-4** — repoint both citations at `./evidence/dd14-geometry-probe.html`. **This one touches production code** (`project-dashboard-card.component.html:49`) and therefore needs an Implementer, not a Leader edit.
- [ ] **V-5** — either commit the multi-viewport raw runs, or reword the three "seven viewports / six viewports" claims to name what the committed JSON actually covers. *(My six-viewport re-run in §6.3 can serve as the substantiating record.)*
- [ ] **V-8** — add a one-line non-destructive banner to `judgment.md`, matching `proposal.md`'s precedent.
- [ ] **V-11** — bump the three `Last updated` dates to 2026-07-30.

### Owner decisions — the spec cannot close without these

- [ ] **The six-step human check** (`requirements.md` §7). Needs a browser and a project with >5 partners. **NFR-PDB-004 is UNVERIFIED, never passed.** The reference mockup is now trustworthy and measurement-verified, so the check is unblocked.
- [ ] **The `s-lint` criterion (V-6).** Reinterpret as *"introduces no new errors"* — the reading this run assumed and evidenced — or drop the criterion. **Do not tick it silently.**
- [ ] **Product-owner acknowledgement** of the four visible changes: 4 → 5 rows · four renamed titles · the DD-4 collapsed-view colour consequence · the new "Show more" control.

### Carry forward past this spec

- **T-09** — owner-deferred, ready to run. A real WCAG 2.1.1 gap: 5903px of content in a 228px keyboard-unreachable box (measured).
- **A-08.2** — five dead declarations → `../geo-scope-expansion/`.
- **A-07.2** — NG0955 hardening candidate.
- **A-08.4 / A-06r.5** — two Kaizen lessons.
- **RB-3** — `project-detail.component.ts` route staleness, reachable in production today. File separately.
- **V-7** — `/akili-constitution` Step 6B to add the `## Local Environment` contract.

---

## 12. Sign-off

| Check | Result |
| --- | --- |
| Working tree clean at close | ✅ `git status --porcelain` empty |
| `stash@{0}` (REJECTED T-06 diff) intact with its label | ✅ verified, never touched |
| All mutation probes restored via `git checkout HEAD -- <path>` | ✅ no `git stash` used at any point |
| Probes run from repo root | ✅ |
| Server suites deliberately not run | ✅ server untouched by this spec |
| Any finding marked BLOCKED rather than guessed | None — every question reached evidence |

**Audit conclusion.** This is a well-run spec. The implementation is correct, the gates are real and I proved it by breaking them, and the run's own record is more honest than most — it names its wrong turns, preserves them as warnings, and refuses to sign off on a gate it did not run. The defects I found are **all in the documentation layer**, and they cluster in exactly one place: the closure pass corrected the sections advisories pointed at, and missed the summary lines that restate them. That is a recognisable and cheap failure mode, not a systemic one.

**One thing is worth saying plainly for a reader who did not watch this run.** The most valuable output of these three rework rounds was not the code — it was the discovery that two of the four "Show more" toggles could have shipped completely dead with a green repo. That was found by mutation, at the third rework round, past the budget tripwire. Anyone tempted to read "3 rounds vs 2 budgeted" as waste should read it as the run's return on investment.

### Next step

```text
# 1. Fix the seven agent-fixable items in §11 (V-4 needs an Implementer — it touches production code)
# 2. Obtain the three owner decisions
# 3. Then, and only then:
/akili-archive project-dashboard/full-payload-show-more
```

---

*Validated by the AKILI-SPECS T3 Auditor. AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.*
