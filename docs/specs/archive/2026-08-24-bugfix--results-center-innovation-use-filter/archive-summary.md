# Archive Summary — Results Center / Innovation Use filter chip

The Innovation Use chip on Results Center is selectable. The client allowlist in `onChangeList` now includes indicator `6`. Confirmed on **test** by the product owner (2026-08-24).

## Quick path

| Item | Value |
| --- | --- |
| Was | `docs/specs/bugfix/results-center-innovation-use-filter/` |
| Now | `docs/specs/archive/2026-08-24-bugfix--results-center-innovation-use-filter/` |
| Status | **Complete** — T-01 PASS, shipped to test |
| Follow-ups | N-2 and option B are **not** this spec |

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bugfix/results-center-innovation-use-filter/` |
| Archive path | `docs/specs/archive/2026-08-24-bugfix--results-center-innovation-use-filter/` |
| Parent | Not a `family.md` child. Risk row **FR-10** in [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) |
| Indexed as | [`OPEN-ITEMS.md`](../../innovation-use/OPEN-ITEMS.md) §0 **N-1** |
| Type | Bug · Lite · Bug Mode · Approval `gated` |
| Ticket | [AC-1679](https://cgiarmel.atlassian.net/browse/AC-1679) (family; no dedicated Jira) |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Archive date | 2026-08-24 |
| Final status | **Complete** — 1/1 task PASS; visual close on test |

---

## 2. Final status

| Gate | Result |
| --- | --- |
| Tasks | **1 / 1** (T-01) — Reviewer PASS attempt 1 |
| Judgment Day | **APPROVED** after 2 fix rounds (`judgment.md`) |
| `/akili-test` | **Not run** — Bug Mode evidence lives in `execution.md`. Accepted |
| `/akili-validate` | **Not run** — Lite client overlay. Accepted; owner confirmed on test |
| HALTs / Pivots | **0** |
| Migration / Swagger | none |

---

## 3. Requirements delivered

| ID | Delivered |
| --- | --- |
| R-RCF-001 AC.1 | Row `indicator_id = 6` has `able === true` |
| R-RCF-001 AC.2 | `onSelectFilterTab(6)` writes `'indicator-codes-tabs': [6]` and sets that row `active` |
| R-RCF-001 BUT / AND IT MUST | 6 is not left `false`; sentinel 7 stays `false` |
| R-RCF-002 AC.1 | Ids 0–5 stay `able === true` (Knowledge Product = 3 included) |
| R-RCF-002 AC.2 | Create-result `targetIndicatorIds` byte-identical (`git diff --exit-code`) |
| NFR-RCF-001 | Same `toBe(true)` on id 6: red (`Received: false`) then green |
| NFR-RCF-002 | Old `[0, 1, 2, 3, 4, 5]` gone from `client/`; new membership at the service; DD-6 quoted |

D6 (jsdom cannot prove click) remains accepted risk. Owner click on test is the visual close.

---

## 4. Files changed

Commit `bf3f8872` (execute) plus this archive move.

| Path | Change |
| --- | --- |
| `client/.../results-center.service.ts` | `able` allowlist `[0, 1, 2, 3, 4, 5, 6]` |
| `client/.../results-center.service.spec.ts` | Named effect example asserts by `find`; `onSelectFilterTab(6)` case |
| `docs/specs/innovation-use/family.md` | **FR-10** (not a Children row) |
| `docs/specs/innovation-use/OPEN-ITEMS.md` | N-1 points at this spec |

Create-result `indicators.service.ts` untouched.

---

## 5. Test evidence

No `test-report.md`. Substitute: Bug Mode + full client suite in `execution.md`, plus owner confirmation on test.

| Check | Result |
| --- | --- |
| Targeted red | id 6 `able` Expected `true` / Received `false` (1 failed, 7 passed in that run) |
| Targeted green | 9 passed (including `onSelectFilterTab(6)`), same `toBe(true)` |
| Full client suite | 316 suites / **6696** tests |
| Lint | `npm run lint -- --quiet` exit 0 |
| c7 | `indicators.service.ts` `git diff --exit-code` 0 |

---

## 6. Validation summary

No `validation-report.md`. Lite Bug Mode; owner reported the chip working on **test** 2026-08-24. Accepted in place of `/akili-validate`.

---

## 7. Accepted warnings and follow-ups

| Item | Disposition |
| --- | --- |
| D6 — clickability in the browser | Accepted risk. Closed by owner on test, not by jsdom |
| Option B (trust `is_active`, delete the list) | Later product ruling. Recurrence risk R1 remains |
| N-2 (justification not cleared when use level drops) | Four product decisions still open in `OPEN-ITEMS.md` |
| Judgment C-1 / C-2 / C-3 | Closed in specify before execute |
| Judgment N-1 (`\|` in a markdown table) | Closed in specify round 2 |

---

## 8. Historical notes

- Same omit-6 shape as create-result `targetIndicatorIds`, already fixed at details-page T-13 Pivot PV-T13-1. That list omits Knowledge Product (3); Results Center must not copy it.
- Specify used Cursor models only (no Claude): design author Grok 4.6; Judgment Day Composer 2.5 + Grok 4.5; execute Implementer Composer 2.5 / Reviewer Grok 4.5.
- Bare `npx jest` from the session shell can resolve the **server** Jest / repo-root husky `package.json`. Client gates must run from `client/research-indicators`.
