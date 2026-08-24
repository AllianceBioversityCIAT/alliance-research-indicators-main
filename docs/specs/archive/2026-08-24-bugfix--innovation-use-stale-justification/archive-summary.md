# Archive Summary — Innovation Use / Stale justification on level drop

A saved Innovation Use row whose effective catalog `level` is below 6 (or absent) now has `innovation_use_level_explanation = NULL` in MySQL, even when STAR re-sends the old string. At catalog `level >= 6`, omitted-key preserve and draft-save write-through are unchanged.

## Quick path

| Item | Value |
| --- | --- |
| Was | `docs/specs/bugfix/innovation-use-stale-justification/` |
| Now | `docs/specs/archive/2026-08-24-bugfix--innovation-use-stale-justification/` |
| Status | **Complete** — T-01 PASS |
| Follow-ups | No backfill (A-1). `_effectiveExplanation` deletion remains **D1** (permitted here, not done). Other conditional fields out of scope |

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bugfix/innovation-use-stale-justification/` |
| Archive path | `docs/specs/archive/2026-08-24-bugfix--innovation-use-stale-justification/` |
| Parent | Not a `family.md` child. Risk row **FR-11** in [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) |
| Indexed as | [`OPEN-ITEMS.md`](../../innovation-use/OPEN-ITEMS.md) §0 **N-2** |
| Type | Bug · Lite · Bug Mode · Approval `gated` |
| Ticket | [AC-1679](https://cgiarmel.atlassian.net/browse/AC-1679) (family; no dedicated Jira) |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Archive date | 2026-08-24 |
| Final status | **Complete** — 1/1 task PASS |

---

## 2. Final status

| Gate | Result |
| --- | --- |
| Tasks | **1 / 1** (T-01) — Reviewer PASS attempt 1 |
| Judgment Day | **Skipped** — user chose Continue from specify Phase 2 |
| `/akili-test` | **Not run** — Bug Mode evidence lives in `execution.md`. Accepted |
| `/akili-validate` | **Not run** — Lite Bug Mode. Accepted at archive (user asked to archive) |
| HALTs / Pivots | **0** |
| Migration / Swagger / client | none |

---

## 3. Requirements delivered

| ID | Delivered |
| --- | --- |
| R-IUJ-001 AC.1 | STAR shape: PATCH catalog id 3 + same justification string → column `NULL`, `2xx` |
| R-IUJ-001 AC.2 | Omitted explanation key + catalog id 3 → column `NULL` |
| R-IUJ-001 AC.3 | PATCH catalog id 6 (level 5) → column `NULL` (decision from catalog `level`, not FK) |
| R-IUJ-001 AC.4 | Present `innovation_use_level_id: null`, and leftover text with no stored level → column `NULL` |
| R-IUJ-001 AC.5 | Sentinel actor / organization / quantification values unchanged on F1 |
| R-IUJ-001 BUT / AND IT MUST | No `400`; new level id persisted; STAR shape required before calling omitted-key “fixed” |
| R-IUJ-002 AC.1 / AC.3 | Existing DD-14 `it` unmodified and green (omit explanation, keep catalog id 7) |
| R-IUJ-002 AC.2 | Existing `''` / `'   '` cases at `level >= 6` unmodified and green |
| NFR-IUJ-001 | `git diff --exit-code -- client/` 0; no new migration |
| NFR-IUJ-002 | Same `toBeNull()`: red (Received seed text) then green against scratch MySQL |

---

## 4. Files changed

Commit `c1996382` (execute) plus this archive move.

| Path | Change |
| --- | --- |
| `server/.../result-innovation-use.service.ts` | Capture `resolveInnovationUseLevel`; write `null` when catalog `level` is `< 6` or absent |
| `server/.../result-innovation-use.service.spec.ts` | Unit cases for the choice (DD-6: not Bug-Mode evidence) |
| `server/.../innovation-use-section-round-trip.fixture-spec.ts` | F1, F2, F3, AC.4; DD-14 and whitespace/`''` cases untouched |
| `docs/specs/innovation-use/family.md` | **FR-11** (not a Children row) |
| `docs/specs/innovation-use/OPEN-ITEMS.md` | N-2 points at this spec |

---

## 5. Test evidence

No `test-report.md`. Substitute: Bug Mode + full server suite in `execution.md`.

| Check | Result |
| --- | --- |
| Targeted red (F1) | `expect(after.innovation_use_level_explanation).toBeNull()` — Received seed justification text |
| Targeted green | Same expect; then 14/14 in the round-trip fixture file |
| Full server suite | 353 suites / **2672** tests |
| Lint | `npx eslint` on the three touched `.ts` paths, exit 0 |
| c11 | `client/` `git diff --exit-code` 0; no new `src/db/migrations/` file |

Scratch MySQL `research_indicators_server_test_mysql` (never `ARI_MYSQL_*`).

---

## 6. Validation summary

No `validation-report.md`. Lite Bug Mode; user requested archive 2026-08-24. Accepted in place of `/akili-validate`.

---

## 7. Accepted warnings and follow-ups

| Item | Disposition |
| --- | --- |
| A-1 — no backfill of already-stale rows | Locked in `requirements.md` §10. Going-forward only |
| A-2 — no effective level ⇒ clear | Locked; AC.4 fixtures |
| D1 — delete `_effectiveExplanation` | Permitted in T-01, not done. Still **OPEN-ITEMS** §3.1 **D1** / family **FR-8** |
| Other conditional fields | Out of scope (product owner) |
| Judgment Day skipped | User Continue at specify Phase 2. Reviewer at execute still ran |
| Budget | ~341 net LOC vs tripwire ~320; surplus is tests. Escalated in `execution.md`; spec had no further tasks |
| Reviewer advisory | Partial PATCH on an already-sub-6 row clears leftover text — accepted in `design.md` §6 |

---

## 8. Historical notes

- OPEN-ITEMS N-2 originally described only the omitted-key shape. Production STAR re-sends the hidden string after typing at level 6; the spec covered **both** shapes (F1 and F2).
- Catalog `id = level + 1` (family D-1). Comparing `innovation_use_level_id >= 6` would false-green F1 and miss F3 (id 6 = level 5).
- Specify skipped Judgment Day. Execute: Implementer Cursor Grok 4.6 / Reviewer Composer 2.5 (`author ≠ auditor`). GPT-5.6 Reviewer spawn hit Other Models quota; retried on Composer.
- Docker Desktop was down at execute start; Leader brought up scratch MySQL and bootstrapped before the Implementer ran fixtures.
