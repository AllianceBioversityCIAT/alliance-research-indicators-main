# Execution log — Results Center / Innovation Use filter chip

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `bugfix/results-center-innovation-use-filter` |
| Approval Mode | gated |
| Leader | Cursor Grok 4.6 (this session) — T1; no Claude this run |
| Implementer | Composer 2.5 (T2) |
| Reviewer | Cursor Grok 4.5 (T3; ≠ Implementer, ≠ Leader) |
| Started | 2026-08-24 |
| Status | T-01 **PASS** (attempt 1 of 3) |

---

## T-01 — Admit indicator 6 on the Results Center chip allowlist

| Field | Value |
| --- | --- |
| Final status | **PASS** |
| Date | 2026-08-24 |
| Attempts | 1 |
| Implementer | Composer 2.5 |
| Reviewer | Cursor Grok 4.5 — `STATUS: PASS` |
| Requirements | R-RCF-001, R-RCF-002, NFR-RCF-001, NFR-RCF-002 |
| Skills | `angular-developer` · `systematic-debugging` (as tasked; no deviation) |
| Effort | medium |

### Attempt 1

**Files changed**

- `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.ts` — allowlist `[0, 1, 2, 3, 4, 5, 6]`
- `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.spec.ts` — named effect example rewritten (find-by-id; fixture 1–6 and 7); `onSelectFilterTab(6)` case added
- `docs/specs/innovation-use/family.md` — **FR-10** in Cross-cutting Risks (Children table unchanged)
- `docs/specs/innovation-use/OPEN-ITEMS.md` — N-1 points at this spec

**c7:** `git diff --exit-code -- client/research-indicators/src/app/shared/services/control-list/indicators.service.ts` → exit 0 (Leader re-checked).

**c1 RED** (Implementer, before allowlist edit; `toBe(true)` on id 6; received `false`):

```
FAIL …/results-center.service.spec.ts
  ● ResultsCenterService › onChangeList effect › should prepend All Indicators and set able by indicator_id when isLoading is false
    Expected: true
    Received: false
    > expect(list.find(i => i.indicator_id === 6)?.able).toBe(true);
Test Suites: 1 failed, 1 total
Tests:       1 failed, 173 skipped, 7 passed, 181 total
```

**c2 GREEN** (same expect; after adding `6`):

```
Test Suites: 1 passed, 1 total
Tests:       173 skipped, 9 passed, 182 total
Ran all test suites matching results-center.service.spec.ts with tests matching "onChangeList effect|onSelectFilterTab".
```

Includes `✓ should set indicator-codes-tabs to [6] and active tab when indicatorId is 6`.

**Environment:** bare `npx jest` from a checkout whose PATH resolves the **server** Jest. Implementer used `npm test` / `--config jest.config.ts` **from `client/research-indicators`**. Pattern used unescaped `|` (9 tests ran — not the 0-test vacuous gate).

**c8** post-fix: `[0, 1, 2, 3, 4, 5]` gone from `client/`; `[0, 1, 2, 3, 4, 5, 6]` at `results-center.service.ts:419`; `server/` 0. DD-6: `targetIndicatorIds = [1, 2, 4, 5, 6]` untouched.

**c11:** `npm test -- --silent` from `client/research-indicators` — 316 suites / **6696** tests passed. `npm run lint -- --quiet` lint_exit=0.

**Reviewer:** `STATUS: PASS` — allowlist is membership plus 6 (id 3 kept); named example asserts by find; `onSelectFilterTab(6)` asserts filter `[6]` and `active`; FR-10 / N-1 with no Children row.

**ADVISORY:** none (diff < 50 LOC; Reviewer suppressed per `.agents/reviewer.md`).

**Decisions:** none beyond the spec. `@akili-spec` comment omitted — one-integer allowlist, not a complex addition.

**Issues:** Leader corroboration of the targeted command from the session shell resolved to the **repo-root** husky `package.json` (`Error: no test specified`). Evidence for c1/c2/c11 is the Implementer's runs from `client/research-indicators`, plus Leader `git diff` / `rg` on the allowlist and c7.

---

## Summary

All tasks in this spec: **T-01 PASS**. Client-only. No migration. No Swagger. N-2 and option B remain out of spec.

