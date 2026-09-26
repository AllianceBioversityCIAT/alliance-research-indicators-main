# Judgment Day — control-lists / design.md

- **Target:** `design.md` (draft, 2026-09-26) + `requirements.md` + `proposal.md` + `../family.md` + codebase at `63e4a107`
- **Mode:** blind dual review, read-only judges, model `sonnet` (author ≠ auditor; design authored on `opus`)
- **Round:** 1 — findings frozen
- **Status:** **approved** — round 1 closed J-1 and J-2; J-3 and J-4 remain suspect, awaiting the user's decision

## Frozen ledger

| ID | Judges | Severity | Finding | Evidence (re-run by orchestrator) | State |
| --- | --- | --- | --- | --- | --- |
| J-1 | A-1 + B-1 (+B-4) | **SEVERE** | §5.2 claims a DB duplicate (errno 1062) is "already mapped to 409 by `sql-errors.const.ts`". False: the helper maps 1062 → **400**, has a single call site (`lever-sdg-targets.service.ts:65,87`), and `GlobalExceptions` never calls it, so a raw `QueryFailedError` surfaces as **500**. The premise has no Premise Ledger row | `sql-errors.const.ts:15-21` (`status: HttpStatus.BAD_REQUEST`); `grep -rn sqlErrorsHelper src` → 3 hits, 2 call sites; `global.exception.ts:22` (`exception?.status ?? INTERNAL_SERVER_ERROR`) | **confirmed** |
| J-2 | A-3 + B-3 | **SEVERE** | §6.2 disables portfolios with 0 categories. Portfolio 1 ships with 0, so it can never be selected, and R-CTL-003 "Same key in two portfolios" (create `org.level` in P1 → 201) is unreachable from the page | design §6.2; requirements R-CTL-001 "Default portfolio", R-CTL-003 scenario | **confirmed** |
| J-3 | A-2 only | SEVERE (single judge) — **user approved fix 2026-09-26, applied (D-CTL-12)** | `control_lists.used_by` column exists (§3), but no write path fills it, A1 does not return it, and the registry only computes value-level counts — the list-level *Used by* label in R-CTL-003 has no producer | design §3, §4 A1, §5.5, §6.2 | suspect |
| J-4 | B-2 only | SEVERE (single judge) — **user approved fix 2026-09-26, applied (D-CTL-13)** | A7 answers **409** for moving a list to another portfolio's category, but R-CTL-001 pins a cross-portfolio write at **400** | requirements R-CTL-001 "AND IT MUST … (400)"; design §4 A7, §5.1 | suspect |
| J-5 | A-4 | WARNING | `exceljs` (CommonJS) is not in `allowedCommonJsDependencies`; `ng build` may warn on the dynamic import | `grep -n allowedCommonJsDependencies angular.json` → 0 | info |
| J-6 | B-5 | WARNING | §6.1 says the parent's `routerLinkActive` stays `exact: true`; the parent is a `<button>` with no `routerLink` — only children carry `routerLinkActive` + `exact` | `alliance-sidebar.component.html:70-71` (child `<a>` with `routerLinkActiveOptions exact`) | info |
| J-7 | B-6 | SUGGESTION | PrimeNG resizable columns + custom sort is new to the repo (0 hits); flag it for the HITL check | `grep resizableColumns` → 0 | info |
| J-8 | A-5 + B-7 | SUGGESTION | `proposal.md` says L3 Office is "(optional)"; requirements/design seed omit the qualifier (the optionality is a hierarchy rule of child 2, not a list property) | proposal §5 vs requirements R-CTL-010 | info |

**Counts:** 2 confirmed severe · 2 suspect · 0 contradictions · 4 info.
**Premise Ledger:** P-1…P-12 re-run by both judges and reproduced; P-13 correctly `UNVERIFIED`; one missing depended-on premise found (J-1).
**Counts checked by both judges:** 2 / 6 / 23 seed, 13 endpoints, 13 premise rows — consistent.

## Correction plan (pending user approval)

| ID | Proposed fix |
| --- | --- |
| J-1 | Service catches `QueryFailedError` errno 1062 and throws `ConflictException` with the field name; do not use `sql-errors.const.ts`. Add Premise Ledger row P-14 with the real mapping. Add a service test that simulates errno 1062 → 409 |
| J-2 | Selector keeps every portfolio **selectable**. *Not configured* becomes a label plus an empty state with **+ New category**. A1/A2 unchanged |
| J-3 (suspect — fix proposed, not auto-applied) | Drop the `used_by` column. Derive *Used by* at read time from the registry's declared list keys and consumer names, returned on A1 |
| J-4 (suspect — fix proposed, not auto-applied) | A7 cross-portfolio move → **400**, aligning with R-CTL-001 |
| J-5, J-6, J-7, J-8 | Info only; J-5/J-6 cheap to fold in as wording fixes |

## Rounds

| Round | Fix actor | Re-judgment | Result |
| --- | --- | --- | --- |
| 1 | orchestrator (bounded: J-1, J-2 only) — design §5.2, §6.2, §10, §12 D-CTL-10/11, §13 P-14; requirements R-CTL-001; 4 mockup `<option>`s | both judges, scoped to the delta: 0 severe; 2 cosmetic suggestions (row order in §12/§13) — applied | **J-1 closed · J-2 closed** |

**JUDGMENT: APPROVED ✅** (confirmed severe findings resolved within one round; suspects J-3/J-4 then approved by the user and applied without re-judgment)
