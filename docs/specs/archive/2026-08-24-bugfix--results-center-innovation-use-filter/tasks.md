# Tasks — Results Center / Innovation Use filter chip

- **Module:** results-center (STAR client)
- **Spec id:** 2026-08-results-center-innovation-use-filter
- **Status:** completed
- **Owner:** Engineering / product owner (AC-1679)
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Linked judgment:** [`./judgment.md`](./judgment.md) — `JUDGMENT: APPROVED`
- **Last updated:** 2026-08-24

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/results-center-innovation-use-filter` |
| **Depth** | Lite · Bug Mode |
| **Budget** | **1** task · **~50** LOC · **~2** review rounds (`design.md` §10) |
| **Tripwire** | Actuals above **~80** net LOC or beyond **3** review rounds → stop `/akili-execute` and escalate |
| **Concurrency** | One task, client package only. Do not run a second full client suite in parallel (root `CLAUDE.md` §4.3) |
| **Deployment** | Client-only. No server coupling. No migration. No flag |

---

## 2. Dependency graph

- `T-01` (production + Bug Mode spec + grep + family index) → done

---

## 3. Task list

### T-01 — Admit indicator 6 on the Results Center chip allowlist

- **Status:** `[x]` done — Reviewer PASS on attempt 1; see `execution.md` → *T-01* · **Size:** S · **Dependencies:** none
- **Requirements covered:** R-RCF-001 (AC.1, AC.2, scenario BUT / AND IT MUST), R-RCF-002 (AC.1, AC.2, scenario BUT / AND IT MUST), NFR-RCF-001, NFR-RCF-002
- **Design references:** §4, DD-1…DD-6, §7
- **Skills:** `angular-developer` · `systematic-debugging` (on any failure)

**Files touched (intended)**

- `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.ts` — add `6` to the `able` allowlist inside `onChangeList`. Membership becomes today’s list **plus 6**. Do **not** copy `[1, 2, 4, 5, 6]`.
- `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.spec.ts` — **replace** the named effect example; add one `onSelectFilterTab(6)` case. See §7 of the design.
- `docs/specs/innovation-use/family.md` — one **Cross-cutting Risks** row (`FR-10`). Not a Children row.
- `docs/specs/innovation-use/OPEN-ITEMS.md` — §0 **N-1** points at this spec.

**Edit target (spec file)**

The **first** `describe('onChangeList effect')` / `it('should prepend All Indicators and set able by indicator_id when isLoading is false')`.

Do **not** edit the later duplicate `describe('onChangeList effect')` (`it('should update indicator list when isLoading is false')`, sentinel 99).

**Do not**

- Change `onSelectFilterTab`’s method body.
- Change the effect lifecycle (`destroy()` after the first non-loading run, `allowSignalWrites: true`).
- Touch chip template or SCSS.
- Touch `indicators.service.ts` (`targetIndicatorIds`).
- Delete the allowlist (option B).
- Import a server `IndicatorsEnum` into the client.

**Order of work (Bug Mode)**

1. Rewrite the named example **first** (fixture ids **1–6 and 7**; assert by `find` on `indicator_id`; expect on 6 is always `toBe(true)`). Do **not** write `expect(false)` and flip it.
2. Run the targeted command **before** changing the allowlist — it MUST be red.
3. Add `6` to the allowlist.
4. Re-run — green.
5. Add the `onSelectFilterTab(6)` case (does not need to be red on current code; the method already accepts any id).
6. Grep, docs rows, full suite.

**Targeted command** (from `client/research-indicators/`). Copy the fenced block in `design.md` §7. The `|` is regex alternation — do **not** backslash it:

```bash
npx jest src/app/pages/platform/pages/results-center/results-center.service.spec.ts --coverage=false --testNamePattern='onChangeList effect|onSelectFilterTab'
```

**Done criteria** (one clause per row)

- [x] c1 — **Bug Mode RED.** On current code, the targeted command fails because `list.find(i => i.indicator_id === 6)?.able` is not `true`. Record the run verbatim (NFR-RCF-001).
- [x] c2 — **Bug Mode GREEN.** After adding `6` to the allowlist, the same expect still reads `toBe(true)` and the targeted command passes. Record the run verbatim. The assertion was not rewritten between red and green (NFR-RCF-001).
- [x] c3 — Named example asserts by `find`: ids **0, 1, 2, 3, 4, 5** each have `able === true` (R-RCF-002 AC.1; R-RCF-001 All Indicators).
- [x] c4 — Named example: id **7** has `able === false` (R-RCF-001 AND IT MUST).
- [x] c5 — Named example contains neither `listSignal()[` *n* `].able` nor `expect(listSignal().length).toBe(4)` (DD-3 / DD-4).
- [x] c6 — New case in `describe('onSelectFilterTab')`: seed a lazy-list row `indicator_id: 6`, spy `main`, call `onSelectFilterTab(6)`, then `resultsFilter()['indicator-codes-tabs']` equals `[6]` and that row has `active === true`. Cases for ids `0` and `1` are unmodified (R-RCF-001 AC.2, DD-5).
- [x] c7 — `git diff --exit-code -- client/research-indicators/src/app/shared/services/control-list/indicators.service.ts` (R-RCF-002 AC.2, DD-6).
- [x] c8 — **Pre-fix** (repo root): `rg -n '\[0,\s*1,\s*2,\s*3,\s*4,\s*5\]' client server --glob '!**/archive/**'` — record every hit, including a `0` line per searched root with no match (KZ-007). The defect site `results-center.service.ts` MUST appear. **Post-fix:** the same pattern is gone from `client/`. **Re-grep** `rg -n '\[0,\s*1,\s*2,\s*3,\s*4,\s*5,\s*6\]' client server --glob '!**/archive/**'` (KZ-005). Quote **DD-6** for `indicators.service.ts` `targetIndicatorIds` — exemption from omit-6, not from the re-grep (NFR-RCF-002).
- [x] c9 — `family.md` **Children** table has no new row (`git diff` on that table is empty of additions). The new row is **FR-10** under **Cross-cutting Risks**, pointing at this spec, owner `none` (not a family chunk).
- [x] c10 — `OPEN-ITEMS.md` §0 **N-1** cites `docs/specs/bugfix/results-center-innovation-use-filter/`.
- [x] c11 — Full client suite `npm test -- --silent` from `client/research-indicators/` (floors 40 / 20 / 45 / 30). Then `npm run lint -- --quiet` and re-inspect `git status` (the script may mutate files).

**Falsifying input** (name before the test exists — K-012)

- Drop `6` from the allowlist: **c2 MUST FAIL**. If c2 still passes, the id-6 assertion is not testing the list.
- Replace the Results Center list with `[1, 2, 4, 5, 6]`: **c3 MUST FAIL** on id 3.
- Restore `listSignal()[3].able` after expanding the fixture: **c4 MUST FAIL** (slot `[3]` is id 3, not 7) **or** c5 fails — either way the named example is not done.

**Disqualifiers**

| Signal | Disqualifier |
| --- | --- |
| c1 / c2 | Writing `expect(false)` then flipping it to `true` after the fix is not Bug Mode (KZ-014). Both runs must use the same `toBe(true)` |
| c1 | A targeted run that executed **zero** tests (exit 0) is vacuous. If you backslash the pipe in `--testNamePattern`, that is this failure |
| c5 | Editing only the second `describe('onChangeList effect')` leaves the named example on indices — c1 cannot have gone red for omit-6 |
| c6 | Asserting `toBeDefined()` on the tab list does not prove `'indicator-codes-tabs': [6]` |
| c8 | Grepping only the old array string, or skipping the re-grep of `[0, 1, 2, 3, 4, 5, 6]`, or omitting zeros |
| c9 | A new **Children** row. Closed-set rule |
| c11 | A filtered `npm test` is **inconclusive**, never a pass for this criterion (KZ-003). The targeted command is evidence only for c1/c2 |
| D6 | A human click on test is visual close, **not** a task gate. Do not tick any criterion with a screenshot |

---

## 4. Requirement → task coverage, at clause level

Requirement-ID presence is not closure. Every AC and every `BUT` / `AND IT MUST` is owned below.

| Requirement | AC / clause | Owner |
| --- | --- | --- |
| R-RCF-001 | AC.1 id 6 `able === true` | **T-01** c1, c2 |
| R-RCF-001 | AC.2 select → `'indicator-codes-tabs': [6]` and active tab 6 | **T-01** c6 |
| R-RCF-001 · sc | All Indicators (`0`) stays `able === true` | **T-01** c3 |
| R-RCF-001 · sc | **BUT** not leave 6 `able === false` | **T-01** c1, c2 |
| R-RCF-001 · sc | **AND IT MUST** sentinel 7 `able === false` | **T-01** c4 |
| R-RCF-002 | AC.1 ids 0–5 `able === true` | **T-01** c3 |
| R-RCF-002 | AC.2 create-result file untouched | **T-01** c7 |
| R-RCF-002 · sc | **BUT** not adopt the create-result list | **T-01** c3 (id 3) + falsifying input |
| R-RCF-002 · sc | **AND IT MUST** leave create-result untouched | **T-01** c7 |
| NFR-RCF-001 | red before / green after, same expect | **T-01** c1, c2 |
| NFR-RCF-002 | grep + zeros + re-grep + DD-6 | **T-01** c8 |

**4 of 4 scenario clauses owned. 4 of 4 ACs owned. 2 of 2 NFRs owned.**

D6 (chip clickability in the browser) has **no** task criterion — accepted risk in `requirements.md` §8.

---

## 5. Sequencing and PR strategy

One task, one PR, client-only. Below the ~400 LOC split line.

Suggested title: `fix(results-center): admit indicator 6 on the filter chip allowlist`.

Backout: revert the commit; chips 0–5 restore by construction.

---

## 6. Not in this spec

| | |
| --- | --- |
| N-2 (stale justification when the use level drops) | Four product decisions still open (`OPEN-ITEMS.md`) |
| Option B (delete the allowlist, trust `is_active`) | Later product ruling (`design.md` DD-2) |
| Unifying with create-result `[1, 2, 4, 5, 6]` | That list omits Knowledge Product (3) |
| Chip SCSS / template / `onSelectFilterTab` body | Unchanged; D6 is accepted risk |
| Server, migrations, details page, T-13 human gate | Out of blast radius |

---

## 7. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-08-24 | Option A does not stop a third omit-N site when indicator 7 is added | Filed as proposal option B; not this spec | product | open (accepted) |
| RB-2 | 2026-08-24 | jsdom cannot prove the chip is clickable (D6) | Mechanism is existing `.able { pointer-events: auto }`. Human click on test is visual close, not a gate | engineering | open (accepted) |

---

## 8. Done definition

- [x] T-01 is `done` (Reviewer PASS in `execution.md` before any done-checkbox in this file).
- [x] All rows in §4 are evidenced.
- [x] Client coverage floors still green.
- [x] No migration, no Swagger delta.
- [x] N-2 and option B remain listed as not this spec.
