# Validation Report — Results / "Update result" asks for the viewed version's year first

> **Verdict: CONDITIONAL PASS — not archive-ready until the Leader gate run is green.**
> 0 FAIL · 5 WARN · 2 BLOCKED · 16 PASS.
> The code in the working tree matches every requirement scenario, and each scenario has a test. Phase 3 (build, lint, spec type-check, suites) was **not run by this auditor**, by instruction: two sibling validations shared the checkout (root `CLAUDE.md` §4.3 concurrency rule). §5 lists the exact commands. Open item (c), the K-004 proof of the spec `tsc` gate, is one of them.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/update-result-year-prompt` (spec id `2026-10-update-result-year-prompt`) |
| Validated at | working tree of branch `institutional-kpis`, 2026-11-13 |
| Implementation commits | `b18ab9e1` (T-01, server) · `6d181b02` (T-02, T-03, T-04, client) |
| Baseline commit | `162348264` |
| Auditor | Claude Opus 5.5 (T3). The Implementer was Sonnet, so author ≠ auditor holds |
| Inputs read | root `CLAUDE.md`; client and server `src/CLAUDE.md`; `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `judgment.md`; every touched source and spec file; `docs/ux-ui/design.md` and `docs/trd/trd.md` (grep for the touched surfaces) |
| `test-report.md` | **Absent.** Coverage was verified directly against the code and the co-located `*.spec.ts` files (§6, §9) |
| Commands NOT run | No npm/npx/ng/jest/tsc. Phase 3 is BLOCKED and handed to the Leader (§5) |

## 2. Summary

| Area | Result | One-line reason |
| --- | --- | --- |
| Task completion | PASS | 4/4 `[x]`, each with a Leader re-run and a Reviewer verdict in `execution.md` |
| File existence | PASS | Every file in the design tree exists. The extra `global-alert.component.scss` is recorded in T-02 attempt 2 |
| Build integrity | **BLOCKED** | Not run by instruction. Commands are in §5 |
| Requirement coverage | PASS (1 WARN) | 11/11 scenarios and 3/3 NFRs have code and tests. S-1's date assertion depends on the host timezone (open item b) |
| Code quality and 4R | PASS, with advisories | No spec violation. Advisories are in §7 |
| Design conformance | WARN | D-5/O-1 is still "open" in `design.md` and `tasks.md`, but T-04 decided it. The design gate is unverified |
| Drift since 2026-10-09 | PASS | No commit after `6d181b02` touches any delivered file |
| Constitution impact | WARN | Client guide pipe inventory not synced; no `## Constitution Impact` section |

**Open items carried from `execution.md`**

| # | Item | Verdict | Remediation |
| --- | --- | --- | --- |
| (a) | Dark-theme modal background is hard-coded white | **WARN — accepted, out of scope** | Backlog item (§11 R-3). Not a blocker |
| (b) | Date tests depend on the host timezone | **WARN — confirmed by reading; red not yet observed** | Leader runs G-6 (§5) to see it red, then applies the one-line fix (§11 R-1) |
| (c) | Spec `tsc` gate never proven able to go red (K-004) | **BLOCKED** | Leader runs G-5 (§5). Until then, no spec type-check claim may be cited |

## 3. Task Completion

| Task | Status | Evidence in `execution.md` | Result |
| --- | --- | --- | --- |
| T-01 server `updated_at` | `[x]` | Red quoted (`- "updated_at": true`). Leader: 178/178, eslint 0, tsc 0, full server suite 4097/4097. Reviewer PASS | PASS |
| T-02 shared alert | `[x]` | f1–f4 observed red and quoted. Attempt 1 Reviewer FAIL (card layout); attempt 2 PASS. Leader: 117/117, lint clean, full client suite 7904/7904, build complete | PASS |
| T-03 version selector | `[x]` | f1–f5 observed red and quoted. Leader: 159/159, lint, full suite 7918/7918, build. Reviewer PASS | PASS |
| T-04 owner HITL | `[x]` | Verdict verbatim ("lo veo super haz commit"); O-1 decided; `REVIEW_SKIPPED` block present | PASS |

Notes:

- T-02's predicted falsifier f3 → g2 did not go red, because g2 uses a mocked `replaceGlobalAlert`. a1 caught f3 instead. The deviation is recorded, and a1 is a valid gate (`actions.service.spec.ts:108-115`).
- Budget tripwire: +513/−54 against ~380 LOC, mostly tests. Escalated at T-04 and approved by the owner.

## 4. File Existence

| Design §3 path | Change | Present | Result |
| --- | --- | --- | --- |
| `shared/interfaces/global-alert.interface.ts` | M, +3 optional fields | `:29-31` | PASS |
| `shared/interfaces/get-transform-result-code.interface.ts` | M, `updated_at?: string \| null` | `:6` | PASS |
| `shared/pipes/exclude-years.pipe.{ts,spec.ts}` | N | both | PASS |
| `shared/services/actions.service.{ts,spec.ts}` | M, `replaceGlobalAlert` | `.ts:189-191`; spec `:108-122` | PASS |
| `shared/components/global-alert/global-alert.component.{ts,html,spec.ts}` | M | all three | PASS |
| `…/version-selector/version-selector.component.{ts,spec.ts}` | M | both | PASS |
| `server/…/results/results.service.{ts,spec.ts}` | M | `.ts:766`; spec `:2435-2455` | PASS |
| `global-alert.component.scss` | **not in design tree** | `:126-156` (`.info-card`) | PASS — added by T-02 attempt 2 and recorded in `execution.md` |
| `version-selector.component.html` | must NOT change (tasks T-03) | unchanged since baseline (`git show --stat 6d181b02`) | PASS |

## 5. Build Integrity

**BLOCKED — pending Leader gate run.** By session instruction, this auditor ran no build, test, lint or type-check command.

Run these **one at a time**, with no delegated agent active, in the order shown.

**Server** (`server/researchindicators/`)

| ID | Command | Expect |
| --- | --- | --- |
| G-1 | `npm test -- --silent src/domain/entities/results/results.service.spec.ts src/domain/entities/results/results.controller.spec.ts` | green |
| G-2 | `npx eslint src/domain/entities/results/results.service.ts src/domain/entities/results/results.service.spec.ts` | exit 0 (never `npm run lint`, K-001) |

**Client** (`client/research-indicators/`)

| ID | Command | Expect |
| --- | --- | --- |
| G-3 | `npx jest src/app/shared/pipes/exclude-years.pipe.spec.ts src/app/shared/services/actions.service.spec.ts src/app/shared/components/global-alert/global-alert.component.spec.ts src/app/pages/platform/pages/result/components/version-selector/version-selector.component.spec.ts src/app/shared/components/all-modals/modals-content/submit-result-content/submit-result-content.component.spec.ts --coverage=false` | green (`--coverage=false` is required, K-020) |
| G-4 | `npm run build` then `npm run lint -- --quiet` | "Application bundle generation complete"; "All files pass linting" |
| G-5a | `npx tsc -p tsconfig.spec.json --noEmit 2>&1 \| grep -E 'exclude-years.pipe.spec\|actions.service.spec\|global-alert.component.spec\|version-selector.component.spec' \| sed -E 's/\([0-9]+,[0-9]+\)//' \| sort > "$SCRATCH/after.txt"`; also record the total with `npx tsc -p tsconfig.spec.json --noEmit 2>&1 \| grep -c 'error TS'` | Save the set. No line may fall inside a hunk that `6d181b02` added: compare positions against `git diff 162348264 6d181b02 -U0 -- <those 4 files>` |
| G-5b, **K-004 proof for item (c)** | Append `const __k004Probe: number = 'red';` to the end of `version-selector.component.spec.ts`. Re-run the G-5a grep **and** the total. Then restore with `git checkout -- src/app/pages/platform/pages/result/components/version-selector/version-selector.component.spec.ts` and confirm with `git status` | One **new** `TS2322` line for that file, and the total goes up by exactly 1. A drop in the total means a parse abort (K-004 mode), not green. Only after this red is seen may G-5a be cited |
| G-6, **settles item (b)** | `TZ=Pacific/Kiritimati npx jest src/app/pages/platform/pages/result/components/version-selector/version-selector.component.spec.ts --coverage=false -t "v1"`, then the same with `TZ=UTC` and `TZ=Pacific/Pago_Pago`. Pre-check that Node honours `TZ` on this host: `TZ=Pacific/Kiritimati node -e "console.log(new Date('2026-03-15T12:00:00Z').getDate())"` must print `16` | Kiritimati (UTC+14) **red**, with "Received … 16 Mar 2026". UTC and UTC−11 green. Then apply §11 R-1 and re-run all three: all green |
| G-7 | After the targeted gates, run the full suites **sequentially, never in parallel** (§4.3 narrowing 2026-08-18): `npm test -- --silent` in the client, then in the server | client ≥ 7918 green; server ≥ 4097 green (counts may have grown since 2026-10-09) |

## 6. Requirement Coverage

Coverage is checked at clause level. "Code" cites the working tree; "Test" cites the spec that would go red.

| Scenario / clause | Owner task | Code evidence | Test evidence | Result |
| --- | --- | --- | --- | --- |
| **S-1** latest copy, chip, caption, buttons | T-03, T-02 | `version-selector.component.ts:222-236` | v1 `version-selector.component.spec.ts:433-446`; g1 `global-alert.component.spec.ts:509-515` | **WARN**: v1's expected "15 Mar 2026" is host-TZ dependent (§11 R-1) |
| S-1 BUT no dropdown | T-03, T-02 | prompt config has no `selectorLabel`/`serviceName` (`:227-236`); dropdown renders only under `@if (alert.selectorLabel)` (`global-alert.component.html:25`) | v1 (`serviceName` undefined); g1 (`p-select` null) | PASS |
| **S-2** older copy, chip, caption, button | T-03 | `:222`, `:225`, `:230` | v2 `:448-458` | PASS |
| S-2 BUT not "most recent" | T-03 | `isLatest` = max over `approvedVersions()` (`:222`) | v2 `not.toContain('most recent')` on detail and caption; f5 observed red | PASS |
| **S-3** year not allowed / request failed / no versions → picker | T-03 | `:213-216` | v4 ×2 `:466-480`; v5 `:482-488` | PASS |
| S-3 AND IT MUST behave as before | T-03, T-02 | `pickerAlert([])` equals the baseline config at `162348264` (`updateResult()` there, `:193-241`) plus `selectorExcludeValues: []`, which the pipe passes through as the same reference (`exclude-years.pipe.ts:11-13`). `showGlobalAlert` still calls `clearService` | v4/v5 (`serviceName`, `[]`); p2; g6; g4 | PASS |
| **S-4** missing / null / empty / unparseable date | T-03 | `:224` (`typeof === 'string' && !== '' && !isNaN(...)`) | v6 `it.each([undefined, null, '', 'not-a-date'])` `:490-494`, exact caption | PASS |
| S-4 BUT no empty / "Invalid Date" / "null" / 1970 | T-03 | same guard | v6 exact `toBe('Latest reporting version')`; f2 observed red ("31 Dec 1969") | PASS |
| **S-10** no chip → max year | T-03 | `reduce` max fallback `:211` | v3 `:460-464`, versions seeded `[2024, 2026, 2025]` | PASS |
| S-10 BUT not API order | T-03 | same | v3; f1 observed red | PASS |
| **S-11** one modal on repeated clicks | T-03 | `updating` guard + `try/finally` `:200-206` | v9 `:534-545` (deferred promise; one `main`, one `showGlobalAlert`) | PASS |
| S-11 AND IT MUST ignore clicks in flight | T-03 | same | v9; f3 observed red | PASS |
| **S-5** Yes → one PATCH with Y; success and failure as today | T-03 | `confirmCallback.event` → `submitReportingCycle(String(year))` `:234`; body moved verbatim `:261-298` (diffed against baseline) | v7 ×2 `:496-521` | PASS (advisory A-2) |
| S-5 BUT no picker | T-03 | `submitReportingCycle` opens only "RESULT UPDATED" | v7 checks the last alert is "RESULT UPDATED" | PASS (advisory A-2: no explicit negative assertion) |
| **S-6** same modal switches in place | T-02 | `onCancel` → `replaceGlobalAlert` with no `closeAlert` (`global-alert.component.ts:273-287`) | g2 `:517-531` (length 1, same `.alert-overlay` node, `p-select` rendered, no `hideGlobalAlert`) | PASS |
| S-6 BUT not close and re-open | T-02 | `track $index`; `alertAnimation` is not bound in the template | g2; f1 observed red. Flicker: T-04 owner check | PASS |
| S-6 must NOT list 2026 | T-02, T-03 | pipe on the binding (`global-alert.component.html:33`); `cancelSwapsTo: pickerAlert([year])` (`:233`) | g3 (rendered options `[2028, 2027, 2025]`); p1; v8; f4 observed red | PASS |
| S-6 confirm as today; Cancel/× close with no request | T-03, T-02 | the swapped picker has no `cancelSwapsTo` and no cancel event | v8 (PATCH `'2025'`); g4; g5 | PASS |
| S-6 resets warning and selection | T-02 | `:285-286` | g7 | PASS |
| **S-7** × closes, no request, no swap | T-02 | × still calls `closeAlert($index)` (`html:6`) | g5 `:549-557` | PASS |
| **S-8** other pickers unchanged, opt-in | T-02 | pipe returns the input reference when the exclusion is empty or absent | g6 (`toBe(years)`); p2; f2 observed red | PASS |
| **S-9** `updated_at` on `live` and `versions`; nothing removed or renamed | T-01 | `results.service.ts:760-792`, one shared `select` | `results.service.spec.ts:2435-2455`, exact `toEqual` on both calls | PASS (mocked repo; live proof at T-04) |
| NFR-URP-001 a11y | T-02, T-04 | both are `p-button` (native `<button>`); chip and caption are text nodes | g1 `textContent` | PASS (advisory A-4) |
| NFR-URP-002 no route, endpoint or migration | T-01 | select-only change | — | PASS |
| NFR-URP-003 opt-in | T-02 | all three fields optional; each branch is inert when absent | g4, g6 | PASS |

## 7. Linting & Code Quality

Lint was **not run** (§5 G-2, G-4). Code reading only.

**Spec-rule checks**

| Rule | Finding | Result |
| --- | --- | --- |
| No hex literals in component code (client guide) | New code uses tokens only: `.info-card` uses `--ac-grey-300/100`, `--ac-green-500`, `--ac-white-1`, `--ac-grey-800`; the prompt's `buttonColor` is `var(--ac-light-blue-400)`. One hex remains: `pickerAlert` `buttonColor: '#035BA9'` (`version-selector.component.ts:253`). It was carried over unchanged from the baseline config, as design §7.2 requires ("keeps today's `buttonColor`"). The other hex literals in `global-alert.component.html` (e.g. `:99` `#035BA9`, `:17` `#4C5158`) predate this spec | PASS (pre-existing; see A-5) |
| Standalone, signals, `ApiService` only | Pipe is standalone and pure; `updating` is a signal; no `HttpClient` | PASS |
| Server envelope / Swagger | No new endpoint; additive select only | PASS |

**4R advisory findings** (not spec violations)

| ID | Lens | Finding |
| --- | --- | --- |
| A-1 | reliability | v1 hard-codes "15 Mar 2026" for `'2026-03-15T12:00:00.000Z'`. `formatDate` formats in the host timezone, so the test goes red at UTC+12 to UTC+14 (open item b). The product behaviour is correct: users see their local date |
| A-2 | reliability | v7 asserts only one of the four cache clears (`lastResultId`) and never asserts that no picker alert was raised. Code reading confirms both, because `submitReportingCycle` is a verbatim move |
| A-3 | readability | The max-year scan is computed twice: the `reduce` (`:211`) and `Math.max` (`:222`). Harmless |
| A-4 | risk (a11y, pre-existing) | The × icon is an `<i>` with click/keydown but no `tabindex` or role (`global-alert.component.html:6`), so the keyboard cannot reach it. `docs/ux-ui/design.md:489` says `global-alert` uses ARIA live regions; the template has none. Both predate this spec and are outside NFR-URP-001 ("both buttons") |
| A-5 | readability | The prompt uses the token and the picker uses hex for the same colour. A follow-up could switch `pickerAlert` to `var(--ac-light-blue-400)`. In dark theme that resolves to `#23466b`, a visible change, so it needs its own check |
| A-6 | resilience | RK-1 (options follow the last alert in the list) is still latent. The swap keeps one entry, so it is unaffected |
| A-7 | risk | T-03 Reviewer advisory: whether the overlay blocks a second "Update result" click while the modal is open. Code: `.alert-overlay` is fixed, full-viewport, `z-index: 1200` (`scss:1-16`), so the button underneath cannot be clicked. Resolved by reading |

## 8. Design Conformance

| Item | Finding | Result |
| --- | --- | --- |
| §2 flow, §7.1 options, §7.2 algorithm | Implemented as designed. `offered` is computed after the await; `replaceGlobalAlert` does not call `clearService` (D-8); `pickerAlert` is built fresh on each call (single-use note at `:239`) | PASS |
| D-1 (reuse global alert, not `all-modals`) | A justified deviation from the client guide's modal rule, recorded in design D-1 and accepted at the Phase 1 gate | PASS |
| **D-5 / O-1 still marked open** | `design.md:155` (D-5 "**Open** … has not answered yet"), `design.md:184` (O-1 "Waiting for the owner") and `tasks.md:219` still read open. `execution.md:151` records the decision: ship without the warning | **WARN**: doc drift. Fix at archive (§11 R-2) |
| Cross-document figures | Premise count "16 verified (P-1..P-15 plus P-9b)" checks out. Budget ~380 LOC vs +513/−54 actual is recorded and approved. `requirements.md` S-1 says `{d MMM yyyy}` while the design uses `'d MMM y'`; Angular's `y` prints the full year, so the output is the same | PASS |
| `judgment.md` JD-8 "prompt omits `buttonColor`" | Superseded by N-1 (`buttonColor: var(--ac-light-blue-400)`) in round 2. Code follows N-1 | PASS |
| **Open item (a)**: dark-theme modal white | `global-alert.component.scss:20` (`background-color: white`) predates the spec. In dark theme `.info-card` resolves `--ac-grey-100` to `#2b2b2b` (`colors.scss:165`), so a dark card sits inside a white modal. Text contrast inside the card still holds (`#c2c2c2` on `#2b2b2b`). Requirements §4 puts the shared alert chrome out of scope | **WARN**: accepted; backlog (§11 R-3) |
| **Design gate (UI)** | No `impeccable-bridge` detector or browser session was possible here (read-only, no app running). Visual fidelity was T-04, an owner HITL check on Dev: `execution.md:150`, verdict "lo veo super haz commit", which covers chip, date, button colour, the in-place switch without flicker, the older-version copy and ×. That check was in light theme only; no first-visit fold check is recorded | **WARN (unverified)**: detector rows `Unevaluated (engine not run in this session)` |

**Design Review**

| Field | Value |
| --- | --- |
| Skill source / engine | Not probed: read-only auditor session, no running app |
| Scan matrix | Unevaluated (engine not run) |
| Waivers | none |
| Human evidence | T-04 owner check on Dev (light theme) |

## 9. Test Evidence Summary

`test-report.md` is absent. The evidence comes from `execution.md` (Leader re-runs from 2026-10-09) plus this auditor's reading of the specs.

| Suite | Tests mapped | Falsifiers observed red | Last green (recorded) |
| --- | --- | --- | --- |
| `exclude-years.pipe.spec.ts` | p1–p3 | f2 | 2026-10-09 |
| `actions.service.spec.ts` | a1, a2 | f3 | 2026-10-09 |
| `global-alert.component.spec.ts` | g1–g7 (transition arranged, KZ-015) | f1, f2, f4 | 2026-10-09 |
| `version-selector.component.spec.ts` | v1–v9 + 5 rewritten reversion tests | f1–f5 | 2026-10-09 |
| `results.service.spec.ts` | `findResultVersions` select | T-01 red | 2026-10-09 |
| Full suites | client 7918 · server 4097 | — | 2026-10-09; **not re-run here** (G-7) |

**Drift check (item 4):**

- `git log 6d181b02..HEAD` over every delivered file (client shared alert, pipe, actions service, both interfaces, version selector, server results service and spec) returns **no commits**. The delivered behaviour is unchanged since 2026-10-09.
- `26c82466` (global-alert z-index) predates the implementation.

## 10. Agent Guide / Constitution Impact

| Item | Finding | Result |
| --- | --- | --- |
| `## Constitution Impact` in `execution.md` | Absent | — |
| Client guide pipe inventory | `client/research-indicators/src/CLAUDE.md:69` lists `format-date, s3-image-url, filter-by-text-with-attr`; the new `exclude-years` is missing | WARN, for `/akili-archive` |
| Shared component contract | `GlobalAlert` gained `infoCard`, `selectorExcludeValues` and `cancelSwapsTo`, and `ActionsService` gained `replaceGlobalAlert`. `docs/ux-ui/design.md` (§8 / `:441`) mentions `global-alert` only by name, so a one-line note on the opt-in options would help future callers | WARN, for `/akili-archive` (TRD/UX sync) |
| API surface | `GET results/versions/:code` adds `updated_at`. The TRD has no per-field contract for this endpoint, so nothing is stale | PASS |

## 11. Remediation

| ID | Severity | Action | Owner / when |
| --- | --- | --- | --- |
| R-0 | BLOCKER for archive | Run G-1…G-7 (§5) and record the outputs, including the G-5b red, verbatim in `execution.md` or this report | Leader, now |
| R-1 | WARN (item b) | After G-6 shows the red: change the v1 fixture to a timezone-free value. Use a local-time ISO string without `Z`, e.g. `updated_at: '2026-03-15T12:00:00'` at `version-selector.component.spec.ts:409`; JS parses it as local time, so "15 Mar 2026" holds in every zone. Re-run G-6 in all three zones. Do not pin `TZ` globally in Jest, because that hides the product's local-date behaviour | Leader / Implementer, small |
| R-2 | WARN | Mark D-5 and O-1 decided in `design.md:155` and `:184`, and close the `tasks.md:219` risk row, citing `execution.md:151`. Apply correction closure: grep the spec folder for "O-1" and "Open" | `/akili-archive` |
| R-3 | WARN (item a) | Backlog item: global-alert modal chrome is hard-coded `white` (`global-alert.component.scss:20`), so in dark theme it ignores tokens. Fixing it means touching every alert, so it needs its own spec and a dark-theme visual check | Backlog / new spec |
| R-4 | WARN | Sync the client guide pipe list and the UX design note on the `GlobalAlert` opt-in options (§10) | `/akili-archive` |
| R-5 | advisory | A-2: add `expect(actions.showGlobalAlert).toHaveBeenCalledTimes(2)` to v7 success. A-5: tokenise the picker `buttonColor`, with a dark-theme check | optional |

## 12. Archive Readiness Recommendation

**Not yet.** No FAIL is open, but Phase 3 is BLOCKED and item (c) needs its K-004 red. Once R-0 is green and R-1 is applied (or accepted as a known limitation), the spec is archive-ready. R-2 and R-4 are routine `/akili-archive` sync work, and R-3 goes to the backlog.

```text
/akili-archive changes/update-result-year-prompt
```
