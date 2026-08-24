# Proposal — Results Center "Innovation Use" filter chip is unselectable

The chip renders greyed out with `pointer-events: none`. The server already returns indicator 6. The client overwrites `able` with a hardcoded list that stops at 5. Add `6` to that list, prove it with a red-before/green-after test, and confirm no third copy of the same omit-6 allowlist remains.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/results-center-innovation-use-filter` |
| **Slug** | `results-center-innovation-use-filter` — supplied as a path, not derived |
| **Type** | **Bug** |
| **Mode** | **Lite / Bug Mode** — requires a regression test, red before the fix and green after |
| **Approval Mode** | **gated** |
| **Depends on** | none |
| **Parallel-safe** | **yes vs other packages**; **no vs another client full-suite run** (root `CLAUDE.md` §4.3). Files are disjoint from `innovation-use/details-page` and from N-2 |
| **Related family** | [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) — **not a manifest child**. Same treatment as `bugfix/innovation-use-draft-save`: a follow-up/risk row, not a child row (closed-set rule) |
| **Indexed as** | `docs/specs/innovation-use/OPEN-ITEMS.md` §0 **N-1** |
| **Reported by** | Product owner, live on **test**, 2026-08-21. No Jira cited; family ticket is [AC-1679](https://cgiarmel.atlassian.net/browse/AC-1679) |
| **PRD** | `docs/prd.md` **R-6** (search/filter by indicator) · **US-MEL-1** (filter results by indicator) |
| **UX** | `docs/ux-ui/design.md` screen inventory #7 — Results Center `/results-center` |
| **Date** | 2026-08-24 |

---

## 2. Intent

A user on Results Center must be able to click the **INNOVATION USE** chip and filter the table to indicator 6, the same way the other indicator chips already work.

---

## 3. Problem / Current Behavior

On Results Center (`/results-center`), the **INNOVATION USE** chip is greyed out and cannot be selected. Capacity Sharing, Innovation Development, Knowledge Product, Policy Change, and OICR chips work.

It is not permissions and not missing data. The chip is in the DOM; CSS then disables it.

---

## 4. Proposed Outcome

| Behavior | Today | After |
| --- | --- | --- |
| INNOVATION USE chip | Grey (`opacity: 0.45`), `pointer-events: none`, `cursor: not-allowed` | Same visual and interaction as the other able chips: opaque, clickable, filters `'indicator-codes-tabs'` to `[6]` |
| Other chips (1–5) + All Indicators (0) | Selectable | Unchanged |
| A non-catalog id (the spec's sentinel `7`) | `able: false` | Still `able: false` — the list still discriminates |
| Create-result Indicator dropdown | Already includes 6 (`indicators.service.ts`) | Untouched |

---

## 5. Scope

**Client only.** One production line, one spec file, one grep evidence block.

| Item | Detail |
| --- | --- |
| Allowlist | `results-center.service.ts` `onChangeList` effect — change `[0, 1, 2, 3, 4, 5]` to include `6` |
| Regression spec | `results-center.service.spec.ts` → `onChangeList effect` / *should prepend All Indicators and set able by indicator_id*. Today's fixture never includes id 6, so it would stay green after the fix without proving anything (**KZ-001**, **K-012**). Add id 6 and assert `able: true`. Keep id 7 as `able: false` |
| Allowlist sweep | Grep the same defect shape across `client/` and `server/` **before calling the task closed**. Record every hit, including files with zero findings (**KZ-007**) |
| Family index | Add a follow-up/risk row to `innovation-use/family.md` (not a child row). Flip OPEN-ITEMS **N-1** once the spec lands |

No template, SCSS, or `onSelectFilterTab` change — those already do the right thing once `able` is true.

---

## 6. Non-Goals

- **N-2** (clear justification when the use level drops). Separate bug, open product decisions.
- **Deleting the hardcoded list** and trusting `GET /indicators` (`is_active`). Structurally better; a different product decision — see §10 option B.
- **Unifying this list with the create-result allowlist.** They are intentionally different: create-result is `[1, 2, 4, 5, 6]` (excludes Knowledge Product = 3); Results Center includes 0 (All) and 3 (federation filter). Merging them would hide KP from the table filter.
- **Extracting a shared constant / `IndicatorsEnum` on the client.** Same reason.
- **Server, migrations, sidebar, details page, T-13 human gate.**
- **Detokenizing the chip SCSS** (hex literals, pre-existing, out of blast radius).

---

## 7. Affected Users, Systems, And Specs

| | |
| --- | --- |
| **Users** | Anyone filtering Results Center by indicator — Contributors (**R-6**) and MEL (**US-MEL-1**). Today they cannot isolate Innovation Use rows |
| **Client** | `ResultsCenterService.onChangeList` · `results-center.service.spec.ts`. Chip bar `app-indicators-tab-filter` renders **only** on `/results-center` (KZ-002: one screen) |
| **Server** | None. `IndicatorsService.findAll()` already returns `is_active` rows including 6 |
| **Specs** | This folder · `innovation-use/family.md` follow-up row · `OPEN-ITEMS.md` N-1 |
| **Not affected** | Create-result dropdown (already admits 6, T-13 Pivot PV-T13-1) · Innovation Use details page · table-filters-sidebar Indicator multiselect |

---

## 8. Visual Reference

- **Source:** None
- **Location:** n/a
- **Notes:** Restores an existing chip to the state its siblings already have. No new UI, no Figma, no mockup. The chip bar is `indicators-tab-filter.component.html`; enabled vs disabled is class `able` in `indicators-tab-filter.component.scss`.

---

## 9. Bug Diagnosis

### Observed Symptom

The Results Center **INNOVATION USE** filter chip is grey and unselectable. Other indicator chips work. Reported by the product owner on the **test** environment, 2026-08-21, against work already deployed.

### Reproduction Steps

1. Open STAR Results Center (`/results-center`) as any role that can see the page.
2. Look at the indicator chip bar above the table.
3. **Expected:** INNOVATION USE is clickable; click filters the table to indicator 6.
4. **Actual:** the chip is dimmed; click and Enter do nothing (`pointer-events: none`).

Deterministic. Independent of whether Innovation Use results exist in the table.

### Root Cause (confirmed)

Client-side hardcoded allowlist in `ResultsCenterService.onChangeList`. After `GET /indicators` (`api.indicatorTabs`) returns, the effect **overwrites** each row's `able`:

```
able: [0, 1, 2, 3, 4, 5].includes(indicator.indicator_id)
```

`IndicatorsEnum.INNOVATION_USE = 6` is not in the array, so `able` is `false`.

The template binds `[class.able]="filter.able"`. Without that class, SCSS sets `opacity: 0.45`, `pointer-events: none`, `cursor: not-allowed`. Click and `keydown.enter` never reach `onSelectFilterTab`.

The server is not the defect: `IndicatorsService.findAll()` filters only on `is_active`. Indicator 6 is active and is returned. `able` is a **client-only overlay** (`GetAllIndicators.able?`); the API field that exists is `is_active`.

This is the **second site** of the same omit-6 allowlist. The first was the create-result dropdown (`indicators.service.ts` `targetIndicatorIds = [1, 2, 4, 5]`), fixed at the `details-page` T-13 Pivot (`695b5248` / `@akili-spec … T-13 Pivot — PV-T13-1`, now `[1, 2, 4, 5, 6]`). That fix did not reach Results Center.

The list reads as "ids through 5", not a curated subset: Knowledge Product (3) is included here even though create-result still excludes it. Innovation Use was added as id 6 after OICR (5); the upper bound was never extended.

### Impact & Scope

| Axis | Finding |
| --- | --- |
| **Blast radius** | One service method, one route. The chip component is not reused elsewhere |
| **Data / security** | None. Filtering is a read. `onSelectFilterTab(6)` already accepts any id |
| **Allowlist sweep (2026-08-24)** — same *shape* (hardcoded numeric indicator-id list that can omit 6) | **(1)** `results-center.service.ts` `[0, 1, 2, 3, 4, 5]` — **this bug**. **(2)** `indicators.service.ts` `[1, 2, 4, 5, 6]` — **already includes 6**, exclude-3 is a create-result product rule, not this defect. **Zero other `able: [...]` sites in `client/`**. Server `ipAvailables` and `createResultType` already include `IndicatorsEnum.INNOVATION_USE`. Re-run the sweep at specify/execute; this table is a snapshot |
| **Recurrence** | Two sites, one already fixed. A third will appear the next time an indicator is added unless option B is chosen later |

### Fix Strategy

Smallest safe correction: add `6` to the array and extend the existing effect spec so it **fails today** on id 6 and **passes after**.

**Not `/akili-quick`:** `able` is logic, CSS gates interaction from it, and Bug Mode requires a discriminating regression test.

**Route:** `/akili-specify bugfix/results-center-innovation-use-filter` in **Bug Mode (Lite)**.

---

## 10. Approach Options

| | Option | Trade-off |
| --- | --- | --- |
| **A (recommended)** | Add `6` to `[0, 1, 2, 3, 4, 5]` | Smallest. Matches the create-result precedent. Leaves the next new indicator as a third patch |
| **B** | Stop overwriting `able`; treat every `is_active` row from `GET /indicators` as selectable | Stops the recurrence. Changes a second-guesser into a pass-through. Would also enable any future `is_active` indicator before its UI is ready — a product call this bugfix should not smuggle |
| **C** | Shared client catalog of "filterable indicators" | Two lists have different membership (0, 3). A shared constant would be a lie. Out of scope |

---

## 11. Recommended Approach

**A.** The reporter asked to enable the chip; the diagnosis is one omitted integer; the create-result fix of the same shape already shipped as a one-line allowlist edit.

Keep the id-7 sentinel in the spec so the list still rejects unknown ids (**KZ-001**: a test that only asserts 1 and 2 stay `true` would stay green if 6 were omitted again).

Do **not** expand to B inside this spec. Record B as the way to stop paying this tax on every new indicator; it needs its own product ruling.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Severity |
| --- | --- | --- |
| **KZ-001** (linaje innovation-use) | Today's effect spec never feeds id 6, so it cannot go red for this bug. Specify must name id 6 as the failing input | High — otherwise Bug Mode is theatre |
| **KZ-005 / KZ-007** | "Grep other allowlists" is a search-space claim. Bound it (phrasing + file set) and report zeros | Medium — this is the second occurrence; assuming two is how the first fix missed this site |
| **R1** | Option A does not prevent a third site when indicator 7 appears | Accepted; option B is the follow-up, not this spec |
| **R2** | Click is CSS-gated. A unit test on `able` does not prove the chip is clickable in the browser. The SCSS rule is the mechanism; asserting `able: true` on the service is the right seam for this change. A human click on test is the visual close, not a task gate | Accepted |
| **OQ-1** | None that block specify. No Jira of their own; no Figma |

No environment dependency: the unit spec does not need the stack. A human smoke on test needs the client deploy (B3 of OPEN-ITEMS still applies to the family, not to this one-line client change).

---

## 13. Success Criteria

- [ ] On Results Center, the INNOVATION USE chip is selectable and filters to indicator 6.
- [ ] Chips 0–5 keep today's `able` values.
- [ ] A fixture with `indicator_id: 6` asserts `able === false` **before** the fix and `able === true` **after** (verbatim both runs). Removing `6` from the array makes that assertion fail.
- [ ] A sentinel `indicator_id: 7` stays `able === false`.
- [ ] Allowlist sweep recorded with per-file lines, including zeros. No remaining `[0, 1, 2, 3, 4, 5]` in `client/`.
- [ ] `family.md` follow-up row added; OPEN-ITEMS N-1 points here.

---

## 14. Next Step

```text
/akili-specify bugfix/results-center-innovation-use-filter
```

Bug Mode, Lite. Converts this diagnosis into a fix plan and the mandatory red-before/green-after regression test.
