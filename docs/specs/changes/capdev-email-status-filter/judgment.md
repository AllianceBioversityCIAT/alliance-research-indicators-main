# Judgment Day — CapDev Email Status Filter (Design review)

- **Target:** `docs/specs/changes/capdev-email-status-filter/{requirements,design}.md` (+ proposal context)
- **Mode:** judgment_day (akili-specify Step 2.5 Review Design)
- **Worktree:** `/Users/pelitos/Documents/CIAT/alliance-research-indicators-ac1607-capdev-email`
- **Date:** 2026-08-26

## Judges

| Judge | Model | Round 1 | Round 2 |
| --- | --- | --- | --- |
| A | `composer-2.5-fast` | PASS (0 severe) | PASS (0 severe) |
| B | `cursor-grok-4.6-high-fast` | PASS (0 severe) | PASS (0 severe) |

---

## Round 1 — Initial review

**JUDGMENT: APPROVED ✅** (0 confirmed severe; 5 WARNING, 4 SUGGESTION — advisory)

Key WARNINGs: tautological repo tests (J-B-W1), service mixed-status conflict (J-B-W2), zero-eligible wording (J-B-W3), shared helper drift (J-A-W1), OD-3 attribution gap (J-A-W2).

---

## Round 1 fixes applied (2026-08-26)

| ID | Fix |
| --- | --- |
| J-B-W1 | design §9.1 mandatory structural QB asserts + falsifier table |
| J-B-W2 | design §2.1 + §9.2 — service tests orchestration-only; no mixed-status filter in service |
| J-B-W3 | design §5.4 — authoritative skip = `groups.length === 0`; eligible-but-unattributed-only documented |
| J-A-W1 | design §5.0 — `ELIGIBLE_RESULT_STATUSES` + `applyEligibleResultStatusFilter` mandatory on spine + unattributed |
| J-A-W2 | requirements R-CESF-004 AC.1 attributed wording + eligible-but-unattributed scenario |

Also: explicit INNER join rule; e2e blind spot noted in §9.4.

---

## Round 2 — Scoped re-judgment

### Confirmed SEVERE

*None.*

### Round 1 resolution

| ID | Status |
| --- | --- |
| J-B-W1 | **fixed** (both judges) |
| J-B-W2 | **fixed** |
| J-B-W3 | **fixed** |
| J-A-W1 | **fixed** |
| J-A-W2 | **fixed** |

### New issues (Round 2)

| Class | Count | Notes |
| --- | --- | --- |
| SEVERE | 0 | — |
| WARNING | 0 | — |
| SUGGESTION | 2 | J-A2-G1: cross-ref R-CESF-004 AC.4 ↔ §5.4; J-B2-G1: clarify §9.1 fail cell = leftJoin **Result** only (not all leftJoins) |

Correction rounds used: **1 / 2**. Re-judgment rounds: **1 / 2**.

---

## Terminal receipt

**JUDGMENT: APPROVED ✅**

Design + requirements cleared for Phase 3 (`tasks.md`). Residual suggestions are optional polish for tasks phase.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
