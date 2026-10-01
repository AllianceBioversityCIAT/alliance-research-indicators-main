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

---

# Round 2 — 2026-10-01 delta (D-CTL-14…16, vertical-slice re-cut)

- **Target:** the 2026-10-01 delta of `design.md` (D-CTL-14 permanent read-only value ID with explicit seed ids, D-CTL-15 `assertValueInList` without a composite FK, D-CTL-16 vertical slices), `requirements.md` (R-CTL-004 AC.3, R-CTL-006 membership scenario + AC.2, §7) and the rewritten `tasks.md` (T-01…T-05). Context: `proposal.md`, `../family.md`, round 1 above, codebase.
- **Immutable snapshot:** scratchpad `jd2/` (`delta.diff` + full copies), taken before any round-2 edit. The later evidence-database edit (requester: no disposable schema) is **outside** this target.
- **Mode:** blind dual review, read-only judges (`akili-reviewer`, model `sonnet`; author `opus`). Composite FK excluded as a fix by the requester's decision.
- **Status:** **approved** — 0 confirmed severe; 3 single-judge severe findings recorded as **suspect**, awaiting the user's decision

## Frozen ledger — round 2

| ID | Judges | Severity | Finding | Evidence | State |
| --- | --- | --- | --- | --- | --- |
| J-9 | A-1 only | SEVERE (single judge) | R-CTL-007 AC.2 has two clauses (no menu item **and** cannot open the route). T-01 wires `canMatch: [centerAdminGuard]` but tests only menu visibility. The old T-08 done criterion "route reachable only through `centerAdminGuard`" was dropped by the re-cut | `requirements.md` R-CTL-007 AC.2; `tasks.md` T-01 Tests/Done; `delta.diff` removed line | suspect |
| J-10 | B-1 only | SEVERE (single judge) | §3 claims T-02/T-03 run a roles test over their new handlers (NFR-CTL-002), but neither task lists a roles falsifier. A6–A12 (7 of 13 endpoints) have no gate that turns red if `@Roles` is dropped or widened | `tasks.md` §3 rows NFR-CTL-002, R-CTL-007; T-02 and T-03 falsifier lists | suspect |
| J-11 | B-2 only | SEVERE (single judge) | R-CTL-008 names three empty states (no categories / no lists / no values). No task owns "category with 0 lists"; T-02 is absent from the §3 row | `requirements.md` R-CTL-008 Details + AC.2; `tasks.md` §3 row R-CTL-008 | suspect |
| J-12 | A-2 + B-4 | WARNING | `requirements.md` Depth line still says "one migration + seed"; §7 says three | `requirements.md:6` vs §7 | info |
| J-13 | A-3 + B-3 | WARNING | Slice rule and §1 say every slice ships a migration and FKs to the previous table; T-04 has no schema change and T-01 has no previous slice (same blanket claim in D-CTL-16) | `tasks.md` slice rule, §1; T-04 Scope — database; `design.md` D-CTL-16 | info |
| J-14 | A-4 (WARNING) + B-6 (SUGGESTION) | WARNING | `assertValueInList` is silent on inactive values; an implementer must guess whether it checks `is_active` | `design.md` §5 rule 10; R-CTL-006 AC.2; R-CTL-004 *Deactivate* | info |
| J-15 | B-5 | WARNING | No risk row for "a consumer forgets to call `assertValueInList`"; unlike the in-use case there is no DB backstop | `requirements.md` §11; D-CTL-15 | info |
| J-16 | A-5 | SUGGESTION | The single 400 branch "names the expected key" even when the real mismatch is the portfolio | `design.md` §5 rule 10 | info |
| J-17 | A-6 | SUGGESTION | Only T-01 carries the "no hex literals" done criterion; T-02…T-04 add screen code too (the Reviewer checklist catches it anyway) | `tasks.md` done criteria | info |

**Counts:** 0 confirmed severe · 3 suspect · 0 contradictions · 6 info.
**Counts checked by both judges:** 2 / 6 / 23 seed (7+3+4+3+2+4 = 23), explicit ids 1–2 / 1–6 / 1–23, 13 endpoints (5+3+4+1), 5 tasks, 4 PRs, ≤ 10 review rounds, 3 migrations — consistent apart from J-12. Round-1 fixes J-1…J-4 intact.

## Correction plan — round 2 (pending user decision)

| ID | Proposed fix |
| --- | --- |
| J-9 | T-01: add a routing test — `canMatch` rejects a non-center-admin user — with a falsifier (remove `canMatch` → the test fails), plus the done criterion |
| J-10 | T-02 and T-03: add a roles-metadata falsifier mirroring T-01's (add `TECHNICAL_SUPPORT` to one new handler → fails) and iterate every new write handler |
| J-11 | T-02: add a "category with 0 lists shows the empty state with + Add list" test and falsifier; add T-02 to the §3 R-CTL-008 row |
| J-12, J-13, J-14 | Info, corroborated by both judges; cheap wording fixes (J-14: state that `assertValueInList` ignores `is_active`, so records keep referencing deactivated values — R-CTL-004) |
| J-15, J-16, J-17 | Info only |

## Rounds — round 2

| Round | Fix actor | Re-judgment | Result |
| --- | --- | --- | --- |
| 2 | orchestrator, user-approved 2026-10-01 (suspects J-9, J-10, J-11 + info J-12…J-15): tasks T-01/T-02/T-03 tests, falsifiers and §3 rows; slice-rule wording; design §5 rule 10 (`is_active`, failure detail, no backstop); requirements Depth line + §11 risk row | not re-judged (no confirmed severe; additive test and wording changes) | **J-9…J-15 applied** · J-16 folded into rule 10 · J-17 info |

**JUDGMENT (round 2): APPROVED ✅** (no severe finding confirmed by both judges; suspects J-9/J-10/J-11 await the user's decision)
