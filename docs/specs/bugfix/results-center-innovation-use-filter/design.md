# Design — Results Center / Innovation Use filter chip

- **Module:** results-center (STAR client)
- **Spec id:** 2026-08-results-center-innovation-use-filter
- **Status:** specified (Phase 3 complete; not executed)
- **Owner:** Engineering / product owner (AC-1679)
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked detailed design:** n/a — no TRD surface; client overlay only
- **Last updated:** 2026-08-24

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/results-center-innovation-use-filter` |
| **Depth** | Lite · Bug Mode |
| **Proposal** | [`./proposal.md`](./proposal.md) — option **A** |
| **Migration** | **None** |
| **Skills loaded** | `angular-developer`. `software-architect` **not** loaded — no new module, data flow, or topology |
| **KZ-016** | Cross-check of every `BUT` / `AND IT MUST` vs this design: §9 |

---

## 2. Goals & non-goals

**Goals**

- Indicator 6 is `able` on the Results Center chip bar (**R-RCF-001**).
- Ids 0–5 stay `able`; create-result’s list is untouched (**R-RCF-002**).
- A Bug-Mode test that is red on current code (**NFR-RCF-001**), plus an allowlist sweep with zeros reported (**NFR-RCF-002**).

**Non-goals** — same fence as `requirements.md` §4: N-2, option B (delete the list), unifying the two client lists, server, details page, chip SCSS. The `onSelectFilterTab` **method body** is untouched; §7 adds one unit call with id 6 (**DD-5**, R-RCF-001 AC.2).

---

## 3. Architecture

STAR Results Center only. Data path already exists:

`GET /indicators` → `api.indicatorTabs` → `ResultsCenterService.onChangeList` overwrites each row’s `able` → template `[class.able]` → SCSS enables click.

This spec changes **only the overwrite**. The template, SCSS, `onSelectFilterTab` method body, and the API stay as they are.

```mermaid
flowchart LR
  API["GET /indicators"] --> Tabs["indicatorTabs"]
  Tabs --> Effect["onChangeList sets able"]
  Effect --> Chip["chip class able"]
  Chip --> Click["onSelectFilterTab"]
```

**Composition — files touched**

| Path | Change |
| --- | --- |
| `client/.../results-center/results-center.service.ts` | Admit `6` in the `able` allowlist inside `onChangeList` |
| `client/.../results-center/results-center.service.spec.ts` | **Replace** (do not extend-in-place) the named `onChangeList` example’s index asserts; add one `onSelectFilterTab(6)` assertion — see §7 |
| `docs/specs/innovation-use/family.md` | Follow-up/risk row, not a child row |
| `docs/specs/innovation-use/OPEN-ITEMS.md` | Point **N-1** at this spec |

**Reuse:** `onSelectFilterTab`, `IndicatorsTabFilterComponent`, chip SCSS. Do not duplicate filter logic. Do not import a server `IndicatorsEnum` into the client (create-result already uses a numeric literal for the same reason).

**No data model. No API. No admin SSR. No integrations.**

---

## 4. The change

One integer in one array: the `able` allowlist becomes the current membership **plus 6**.

Do **not** replace it with the create-result list `[1, 2, 4, 5, 6]`. That list omits `0` (All Indicators, prepended separately but 0 is also in today’s Results Center list) and omits `3` (Knowledge Product). Adopting it would fail **R-RCF-002**’s `BUT`.

Do **not** delete the overwrite (proposal option B). That is a product ruling for a later spec.

Do **not** change the effect’s lifecycle (`destroy()` after the first non-loading run, `allowSignalWrites: true`).

---

## 5. Design decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| **DD-1** | Add `6` to the existing Results Center allowlist (option A) | Smallest correction of the confirmed root cause. Matches the create-result precedent without copying that list’s membership |
| **DD-2** | Keep a hardcoded list; do not trust `is_active` | Option B would auto-enable any future catalog row. Out of this bugfix (**R1**) |
| **DD-3** | Assert `able` **by `indicator_id`**, never by array index | Today’s spec uses indices. Inserting id 6 would remap the sentinel slot and the test would stay green for the wrong row (**KZ-001**, linaje innovation-use) |
| **DD-4** | The effect fixture must include ids **1–6 and 7** (plus the synthetic 0 the effect prepends) | Otherwise R-RCF-001’s sentinel clause and R-RCF-002 AC.1 are not observable. Today the fixture has only 1, 2, 7 — it cannot go red for this bug |
| **DD-5** | Add **one** `onSelectFilterTab(6)` assertion; do not duplicate the rest of that suite; do not change the production method | R-RCF-001 AC.2 cannot be discharged by citing AC.1 (`able === true`). Existing cases cover ids `0` and `1` only. The method already writes `'indicator-codes-tabs': [id]` for any id — the new case only proves id 6 is in that contract |
| **DD-6** | Create-result file is a `git diff --exit-code` gate, not an edit | R-RCF-002 AC.2. Exemption from the omit-6 sweep: that list already contains 6 — quote this cell (**KZ-007**) |

---

## 6. Reversion challenge (Step 2.3)

**Triggered on DD-1.** Enabling a chip the product shipped disabled is an invert of shipped UI. Question: **what does making id 6 `able` break?**

| Candidate breakage | Verdict |
| --- | --- |
| Filter request 404s or is unauthorized | **No.** `onSelectFilterTab` already writes `'indicator-codes-tabs': [id]` for any id; the list was the only gate |
| Empty table if no Innovation Use rows exist | **Correct filter behavior**, not a break |
| Knowledge Product chip disappears | **No**, provided DD-1 does not copy the create-result list |
| Create-result dropdown changes | **No**, provided DD-6 holds |
| A non-catalog chip becomes clickable | **No** — sentinel 7 stays out of the list (R-RCF-001 `AND IT MUST`) |

**Outcome:** no design change. The invert is the fix.

Skipped for option B (not chosen). No other DD removes shipped behavior.

---

## 7. Testing strategy

Edit target for the effect spec: the **first** `describe('onChangeList effect')` / `it('should prepend All Indicators and set able by indicator_id when isLoading is false')`. Do **not** edit the later duplicate `describe('onChangeList effect')` (`it('should update indicator list when isLoading is false')`, sentinel 99).

**Replace** that named example’s index asserts. Do not keep `listSignal()[n].able` or `expect(listSignal().length).toBe(4)` — after **DD-4** the slot `[3]` is id 3, not sentinel 7.

| Gate | Job |
| --- | --- |
| **Bug Mode (NFR-RCF-001)** | Fixture per **DD-4** (ids 1–6 and 7). Assert **by id** (**DD-3**): `list.find(i => i.indicator_id === n)?.able` — `6` → `true`, `7` → `false`, `0–5` → `true`. The expect on id 6 is **always** `toBe(true)`. **Red on current code** means that expect fails (actual is `false`); green after. Do **not** write `expect(false)` and then flip it (**KZ-014**). Record both runs verbatim. Falsifier: drop `6` from the allowlist → the id-6 assertion MUST fail |
| **R-RCF-001 AC.2** | In the existing `describe('onSelectFilterTab')`, add one case: seed the lazy tab list with a row `indicator_id: 6`, spy `main`, call `onSelectFilterTab(6)`, then `resultsFilter()['indicator-codes-tabs']` equals `[6]` and that row has `active === true`. Do not rewrite the cases for ids `0` and `1`. Production method untouched (**DD-5**) |
| **R-RCF-002 AC.2** | `git diff --exit-code -- client/research-indicators/src/app/shared/services/control-list/indicators.service.ts` |
| **NFR-RCF-002** | Working directory: repo root. File set: `client/` and `server/` (exclude `docs/specs/archive/`). **Pre-fix** (must hit the defect site; record every file including zeros): `rg -n '\[0,\s*1,\s*2,\s*3,\s*4,\s*5\]' client server --glob '!**/archive/**'`. **Post-fix:** the same pattern is gone from `client/`; re-grep the new membership `rg -n '\[0,\s*1,\s*2,\s*3,\s*4,\s*5,\s*6\]' client server --glob '!**/archive/**'` (KZ-005). Quote **DD-6** for `indicators.service.ts` `targetIndicatorIds` — that file is an exemption from “omit-6”, not from the re-grep. Per-file line, including `0` when a path has no match (KZ-007). **Cannot reach:** generated `dist/`, `node_modules/`, or a string that does not look like a bracketed int list (KZ-017) |
| **Targeted red/green** | Command in the fenced block below this table (K-020). Then full suite `npm test -- --silent` from `client/research-indicators/` |

**What the unit gate cannot prove (D6):** clickability in the browser. jsdom does not apply the chip SCSS. Accepted risk; not a task gate. AC.2’s unit call does **not** close D6.

**KZ-004:** the command exists (`results-center.service.spec.ts` already runs under `npm test`). No harness waiver.

Targeted red/green (from `client/research-indicators/`). The `|` is regex alternation — do **not** backslash it (a `\|` matches a literal pipe and runs **zero** tests with exit 0):

```bash
npx jest src/app/pages/platform/pages/results-center/results-center.service.spec.ts --coverage=false --testNamePattern='onChangeList effect|onSelectFilterTab'
```

---

## 8. Security & observability & rollout

- **Security:** read-only filter. No role, status-guard, or token change.
- **Observability:** none.
- **Rollout:** client-only. No coupling with the server (unlike `bugfix/innovation-use-draft-save`). No flag. Backout: revert the commit; chips 0–5 restore by construction.
- **Comms:** none required. The chip becomes usable.

---

## 9. KZ-016 clause cross-check

| Clause | Where the design owns it |
| --- | --- |
| R-RCF-001 **AC.1** + **BUT** not leave 6 `able === false` | §4 add `6`; §7 assert id 6 `toBe(true)` by `find` |
| R-RCF-001 **AC.2** select → `'indicator-codes-tabs': [6]` | §7 `onSelectFilterTab(6)`; **DD-5** |
| R-RCF-001 **AND IT MUST** sentinel 7 false | §7 assert id 7 false; 7 stays out of the allowlist |
| R-RCF-002 **AC.1** ids 0–5 stay `able === true` | §7 assert `0–5` true by id |
| R-RCF-002 **BUT** not adopt the create-result list | §4 explicit prohibition; DD-1 |
| R-RCF-002 **AND IT MUST** / **AC.2** leave create-result untouched | DD-6; §7 `git diff --exit-code` |
| NFR-RCF-001 red before / green after | §7 Bug Mode row; expect on 6 is always `true` |
| NFR-RCF-002 grep + zeros + re-grep | §7 committed `rg` commands |
| Effect lifecycle (implementation guardrail, not a requirements clause) | §4 do not change `destroy()` |
| Child guide: no server-path imports in client | §3 reuse — numeric literal, not `IndicatorsEnum` |

---

## 10. Budget (Step 2.4)

| | Estimate |
| --- | --- |
| **Tasks** | **1** |
| **LOC (net)** | **~50** (one production token + fixture expansion + one `onSelectFilterTab(6)` case + docs rows) |
| **Review rounds** | **~2** |

Matches **Lite**. Not `/akili-quick`: Bug Mode needs a discriminating red-before/green-after test.

**Tripwire:** actuals above **~80** net LOC or beyond **3** review rounds stop `/akili-execute` and escalate.

---

## 11. Open questions

None. Option B remains a later product ruling, not an OQ on this spec.

---

## 12. References

- [`./requirements.md`](./requirements.md) · [`./proposal.md`](./proposal.md)
- Create-result precedent: `indicators.service.ts` `targetIndicatorIds` (T-13 Pivot PV-T13-1) — **do not copy membership**
- `docs/ux-ui/design.md` screen #7 Results Center
