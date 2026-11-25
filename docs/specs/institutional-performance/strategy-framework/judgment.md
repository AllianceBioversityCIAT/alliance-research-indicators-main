# Judgment Day — Strategy Framework design

- **Target:** `design.md` sha256 `5ce9ec7c762b5087…`, against `requirements.md` rev 2 (`db52c4c5e88c8c6a…`) and `../family.md` (`0093db6d27cc0b3c…`)
- **Mode:** `/akili-specify` Step 2.5 *Review Design*, chosen by the dev lead 2026-11-17
- **Judges:** A (`akili-reviewer`, opus) · B (`akili-reviewer`, sonnet). Blind, read-only, identical brief; both delivered
- **Round:** 1 — findings merged; awaiting the dev lead's decision on round-one correction

## Ledger verdicts (both judges)

| Row | Judge A | Judge B | Merged |
| --- | --- | --- | --- |
| P-3 | contradicted | contradicted | **contradicted** — cited lines are the impersonation branch; normal JWT roles come from ROAR (`jwr.middleware.ts:112-118`) |
| P-7 | contradicted | partly contradicted | **contradicted** — not the sole consumer; `alliance-sidebar.component.html:73` gates the whole block |
| P-14 | contradicted | partly confirmed | **contradicted** — sole production caller is `data-table.component.ts:181` |
| P-1, 2, 4, 5, 6, 8, 9, 10, 12, 13 | confirmed | confirmed | confirmed |
| P-19, P-20 | confirmed | partly / not re-run | confirmed (A) |
| P-11, 15, 16, 17, 18 | not re-run | not re-run | not re-run (git, workbooks, DB, decision) |

## Confirmed by both judges

| ID | Judges | Severity | Finding |
| --- | --- | --- | --- |
| CF-1 | JA-1 · JB-2 | severe | Role migration `down` queries `user_roles` (no `role_id`); assignments are `sec_user_roles` (+ `sec_user_role_contracts`, `sec_user_role_results`); inactive rows still block the FK |
| CF-2 | JA-2 · JB-1 | severe | P-3 citation is the impersonation branch; whether ROAR returns role 11 in `roles` is unverified (High) |
| CF-3 | JA-3 · JB-3 · JB-4 | severe | `alliance-sidebar.component.html:73` hides the whole Administration block unless Center admin or App configuration; an ODS-only user never sees the group. P-7 "sole consumer" false |
| CF-4 | JA-5 (severe) · JB-5 (warning) | severe | `ALTER TABLE … AUTO_INCREMENT` is DDL and commits; contradicts "one transaction" (NFR-STF-002); no seed injected-failure test |
| CF-5 | JA-7 (severe) · JB-10 (warning) | severe | P-14 / D-STF-9 callers wrong; the consumer is `DataTable` |
| CF-6 | JA-8 (severe) · JB-9 (warning) | severe | `DataTable` has no cell template; chips/tooltips/"(inactive)" impossible; arrays export as `[object Object]` |
| CF-7 | JA-10 (severe) · JB-12 (warning) | severe | R-STF-009 default-year rule orphaned |
| CF-8 | JA-11 (severe) · JB-11, JB-12 (warning) | severe | Orphans: seed link assertions, NFR-STF-001 timing test, R-STF-006 "way out" text, R-STF-001 400 naming the field |
| CF-9 | JA-13 · JB-4 | warning | Sidebar spec mock lacks `canAccessOdsAdmin` → existing tests throw |
| CF-10 | JA-18 · JB-7 | warning | Code-proposal scan scope must be portfolio-wide (moved DIM keeps its code) |
| CF-11 | JA-19 · JB-8 | warning | 1062/1452 races unmapped outside codes (carry forward, responsibles, parent deleted) |
| CF-12 | JA-15, JA-16 · JB-16, JB-17 | warning | Requirements header "seven new tables" vs six; budget lists 13 items for 14 tasks; LOC low |
| CF-13 | JA-20 · JB-14 | warning | P-17 impact understated: a throwing role migration blocks the Dev deploy |
| CF-14 | JA-21 · JB-19 | warning | Seed must bind parameters (`namedPlaceholders`), gated by a real migration run |

## Reported by one judge (suspect — not auto-fixed)

| ID | Severity | Finding |
| --- | --- | --- |
| JA-4 | severe | `PortfoliosService` is request-scoped (via `CurrentUserUtil`); injecting it into the singleton read service drags it into request scope; `validatePortfolio` throws 400, not 404 |
| JA-6 | severe | `org-tree.component.html:56` is not the expander (it is at 24-35) |
| JA-9 | severe | R-STF-008 row actions and per-level **+ <Kind>** buttons not designed |
| JA-12 | warning | Generator must assert 36 *distinct* pairs after alias mapping |
| JA-14 | warning | Nothing writes `alliance_user_staff.is_active`; "active staff" may never change |
| JA-17 | warning | family F-8 still names the strategy workbook / MMF for org only |
| JA-22 | warning | R-STF-013 AC.2 (403 on another admin area) has no test |
| JA-23…25, JB-13, JB-15, JB-18, JB-20, JB-21 | warning / suggestion | `kind` per row and `text` field; wrapped form fields; TRIM names; one clock; responsibles re-run idempotency; URL codec; collation `utf8mb4_unicode_520_ci`; client role `is_active` filter |

## Contradictions between judges
None (severity differences only: CF-4…CF-8).

## Round 1 correction (dev lead chose *Fix and re-judge*, 2026-11-17)

Fixed in `design.md` (now sha256 `05d11c18d5a5ee9a…`): CF-1…CF-14, plus suspects verified at source by the architect: JA-4 (`portfolios.service.ts:20-28`), JA-6 (`org-tree.component.html:26-33`), JA-9, JA-12, JA-14 (Grep `is_active` over `domain/tools/agresso` → 0), JA-17, JA-22, JA-23, JA-24 (recorded as D-STF-14), JA-25, JB-13, JB-15, JB-18, JB-20 (siblings use `utf8mb4_unicode_ci`). Also `requirements.md` header (six tables; `671aee603b4263b7…`) and `family.md` F-8 exception (`fd3de951b0ad0680…`).
Not changed: JB-21 (client role `is_active` filter) — server is the authority; display-only.

| Finding | Where fixed |
| --- | --- |
| CF-1 | §3.3 `down` over every FK to `sec_roles` (P-22) |
| CF-2 | P-3 re-cited, UNVERIFIED High; §10 Dev check |
| CF-3, CF-9 | §2.1 sidebar row, §6.1 gate at `.html:73`; P-7, P-25 |
| CF-4 | §3.4 no `ALTER … AUTO_INCREMENT`; seed failure test |
| CF-5, CF-6 | P-14, P-23, D-STF-9, D-STF-12; §6.3/§6.5 flattened fields |
| CF-7 | A9 `defaultYear`; §6.5 |
| CF-8 | §3.4 generator assertions; §5.4 way-out texts; A10 `errors.field`; §10 NFR-STF-001 test |
| CF-10 | §5.3 portfolio-wide scan |
| CF-11 | §5.2 step 5, §5.5 lock + 1062 |
| CF-12 | requirements header; §14 15 enumerated tasks, LOC 5,600 |
| CF-13 | P-17 High; §11 pre-merge check |
| CF-14 | §3.3 SQL text rule + real migration run |

## Scoped re-judgment (round 1)

Both judges re-checked every listed fix at the source. **No severe finding remains.**

| | Judge A | Judge B |
| --- | --- | --- |
| Resolved | 24 | 22 |
| Partial | CF-8 (Dev timing; codes in the 400 text), CF-11 (IOB create vs carry forward) | CF-11 (per-FK 1452 mapping; IOB create vs carry forward) |
| Fix-caused defects | 8, all warning/suggestion (JA2-1…8) | 6, all warning/suggestion (JB2-1…6) |

Agreed by both: selector source (JA2-1 = JB2-1), seed atomicity in the deploy batch (JA2-2 = JB2-3), IOB create race (JA2-6 = JB2-2b), `p-multiSelect` precedent (JA2-7 = JB2-5).

## Info fixes after approval — fixed, not re-judged

Applied 2026-11-17 to `design.md` and `requirements.md`: JA2-1…JA2-8, JB2-1…JB2-6, CF-8 (a, b), CF-11 gap. New ledger row P-26 (UNVERIFIED, Low; settled by T-08's batch run). R-STF-011 AC.3 now reads "with the staff table unchanged".

## Status
JUDGMENT: APPROVED ✅ — round 1 lineage (severe findings resolved and re-judged); later warning-level edits are recorded above as *fixed, not re-judged*.

## Later revision

2026-11-17 — the dev lead amended the scope at the Phase 2 gate (requirements rev 3: one self-referencing table, outline-editor mockup, Institutional Objectives page). `design.md` r4 is a **new target**; the approval above covers r3 only.

---

# Lineage 2 — design r4 (`a2a5d8f57f96d0d4…`), requirements rev 3 (`623273cdd281bd79…`), family (`f2db1ac448f44a4d…`)

Judges: A (`akili-reviewer`, opus) · B (`akili-reviewer`, sonnet); fresh, blind, identical brief; both delivered. A: 5 severe / 13 warning / 3 suggestion. B: 2 severe / 11 warning / 2 suggestion.

## Confirmed by both judges

| ID | Judges | Severity | Finding |
| --- | --- | --- | --- |
| L2-1 | JA-1 (severe) · JB-3 | severe | Seed "own transaction boundary" unspecified and, nested in TypeORM `all` mode after DDL implicit commits, only a SAVEPOINT — no atomicity; P-26 impact understated |
| L2-2 | JA-2 · JB-1 | severe | R-STF-006 "an IOB is blocked only by a registered dependant" has no mechanism (registry counts elements only) |
| L2-3 | JA-8 · JB-2 (severe) | severe | No `--ac-*` lime token; accent palette premise false and unrowed |
| L2-4 | JA-4 (severe) · JB-11(2) | severe | Title assumes portfolio name "Strategy 2026–2030"; seeded name is `'Portfolio 2'` |
| L2-5 | JA-9 · JB-6 | warning | Root code proposal scans root-depth only; collides with a hand-typed `5` elsewhere; no 30-char guard on proposals |
| L2-6 | JA-14 · JB-4 · JB-5 | warning | Cycle check unreachable through the API; `parentId: null` / depth-1 `parentId` semantics undefined; cross-portfolio status ambiguous |
| L2-7 | JA-12 · JB-7 | warning | "Exactly one indicator level" unenforced; flag move leaves stale responsibles/links |
| L2-8 | JA-16 · JB-8 | warning | F-4 has no child-3 exception for inline commit |
| L2-9 | JA-10 · JA-11 · JB-9 | warning | Inline state machine gaps: typing during `saving`, refresh overwriting dirty rows/drafts, two drafts with the same proposed code, draft code 409 |
| L2-10 | JA-15 · JB-10 | warning | Count line overstates "verified" (P-15, P-18, P-27 have no commit); P-1 open clause |
| L2-11 | JA-18 · JB-11(3) | warning | No precedent row for inline-edit fields or a recursive component |

## Reported by one judge (suspect)

JA-3 (severe: a portfolio with no levels cannot be used), JA-5 (severe: NFR-STF-004 focus trap, combobox label, icon `aria-label`s not designed), JA-6 (`HumanCredentialGuard` missing vs sibling), JA-7 (third portfolio years unknown), JA-13 (`AREA` label not in levels table), JA-17 (canvas `kpi-framework.json` undeclared seed source), JA-19…21; JB-11(1, 4, 5) (client role list source; self-FK multi-row delete order; 500 cap unenforced), JB-12 (second sidebar mock at spec `:615`), JB-13 (`blockers`/`usage` on the consumer read), JB-14 (error helper + client `errors` typing), JB-15 (budget low), JB-16, JB-17.

## Lineage 2 — round 1 correction (dev lead: *Fix and re-judge*, 2026-11-17)

Fixed in `design.md` r5, `requirements.md` and `family.md`: L2-1 (D-STF-24 dedicated query runner; P-26 High), L2-2 (`countByObjectiveIds`; IOB `deletable`), L2-3 (four existing tokens; P-29), L2-4 (title from years, D-STF-23; P-28), L2-5 (root scan over all codes; 30-char guard), L2-6 (A6 `parentId` semantics; cycles structural, util-tested; AC.2 restated), L2-7 (generated-column unique index, flag never moves; D-STF-21; P-30), L2-8 (F-4 exception), L2-9 (read-only while saving; drafts send no code + `reserve`; merge-by-id refresh), L2-10 (Count line by class; P-1 closed), L2-11 (P-29). Verified suspects also fixed: JA-3 (lazy `DEFAULT_LEVELS`), JA-5 (`p-drawer` focus trap, labels), JA-6 (`HumanCredentialGuard`, D-STF-20), JA-7 (P-31), JA-13 (`short_label`), JA-17 (canvas source declared), JA-19…21, JB-11 (client role source in P-3; P-32 per-depth delete; 500 cap I-8), JB-12 (P-25 both mocks), JB-13 (admin-only A1e, D-STF-22), JB-14 (`framework-errors.ts`, client narrowing type), JB-15 (budget 9,000 LOC, mid tripwire), JB-16, JB-17 (`migration:scan`).

## Lineage 2 — scoped re-judgment of r5

| | Judge A | Judge B |
| --- | --- | --- |
| Ledger items | 20 resolved, 1 partial (JA-5) | 15 resolved, 4 partial (L2-3, L2-7, L2-9, JB-11(5)) |
| Fix-caused | 3 severe (JA3-1 drawer has no focus trap; JA3-2 A1 virtual levels break R-STF-012 AC.1; JA3-3 global error toast on every domain 400), 6 warning, 3 suggestion | 6 warning, 2 suggestion |

Both: lazy-levels race (JA3-5 = JB3-1), dark-mode accents (JA3-7 = JB3-2), draft badge codes (JA3-11 = JB3-3), generated-column mapping (JA3-4 = JB3-4), stale text (JA3-6/9 = JB3-6), P-30 baseline version (JA3-10 = JB3-7), invariant order (JA3-12 = JB3-8). JA3-1, JA3-3 and JA3-8 verified at source by the architect (`primeng-drawer.mjs` focus count 0; `http-error.interceptor.ts:15-23`; `responses.interface.ts:1-17`).

## Lineage 2 — round 2 correction (final round allowed)

`design.md` r6, `requirements.md` rev 3.1: JA3-1…12 and JB3-1…8 fixed — `pFocusTrap` + page focus return (P-33, D-STF-26); A1 empty lists, virtual levels only in A1e; interceptor exemption (P-34); `generatedType` mapping (P-35) and `EXTRA` check; portfolio-row lock on every create; `--ac-framework-accent-1…4` tokens (D-STF-25); draft badge *New*; R-STF-003 500 cap; R-STF-012 registry text; stale D-STF-10 / A2 / §16 text; P-30 cites `baseline.sql:5`; invariants reordered.

## Lineage 2 — final scoped re-judgment of r6 (round 2)

| | Judge A | Judge B |
| --- | --- | --- |
| Ledger items | all 12 JA3 + JA-5 resolved | JB3-1…5, 7, 8 resolved; JB3-6, ErrorDetailLike citation, A1/AC.1 partial |
| Fix-caused | 0 severe, 5 warning (JA4-1…5), 1 suggestion (JA4-6) | 0 severe, 5 warning (JB4-1…4, 6), 1 suggestion (JB4-5) |

Agreed: stale A1 references after the split (JA4-1 = JB4-2), interceptor exemption too narrow / DTO 400 silent (JA4-2 = JB4-1), shared surfaces and the `docs/ux-ui/design.md` §7 token rule (JA4-3 = JB4-5), R-STF-005 scenario wording (JA4-4 = JB4-2).

## Info fixes after approval — fixed, not re-judged (r7)

JA4-1…6 and JB4-1…6 applied to `design.md` r7 and `requirements.md` rev 3.1: both views read A1e; interceptor exempts every `4xx` except `401` on `/strategy-framework`; module-local `frameworkErrorOf` handles object, string and string-array payloads; `maxlength` on inline fields; framework errors bypass `ActionsService.handleBadRequest` (new row P-36); token rule includes `docs/ux-ui/design.md` §7; blast-radius line updated; portfolio lock wording scoped to creates; draft flow drops A3/`reserve`; focus target after delete; R-STF-005 scenario and R-STF-012 AC.1 reworded.

## Status
**JUDGMENT: APPROVED ✅** — lineage 2 (design r4 → r6), no severe finding after round 2; warning-level follow-ups recorded above as *fixed, not re-judged* (r7).

---

## Lineage 3 — rev 4 layout amendment (design r8), 2026-11-24

- **Target (frozen, uncommitted):** `design.md` r8 — §6.2–§6.6, §6.9, D-STF-29…35, P-38…P-44, §13a, §14 rev-4 row; against `requirements.md` rev 4 and `proposal-layout-amendment.md`. Base commit `db07f43dc`.
- **Judges:** A and B, blind, read-only (`akili-reviewer` on Sonnet; design authored on Opus — author ≠ auditor). Skills passed: none beyond the reviewer persona.
- **Round 1 result:** 3 confirmed severe, 2 single-judge severe (both re-checked at source by the orchestrator, see below), 6 shared warnings, several singles.

### Round 1 ledger

| ID | Severity | Judges | Finding | Evidence | Status |
|---|---|---|---|---|---|
| JC-1 | severe | A-1, B-1 | Shared `DataTable` rows are click-only (no `tabindex`, no keydown, no row key in the DOM); NFR-STF-004 keyboard selection and "focus back to the selected row" cannot hold in the Table view or on IOB; P-40 proves click only | `data-table.component.html:58-59`, `data-table.component.ts:164-171` | confirmed — needs owner decision (shared component) |
| JC-2 | severe | A-2, B-3 | Row `keydown.enter/space` also fires from the **+** button and the chevron (keydown bubbles; only click propagation is stopped); Space scrolls the list without `preventDefault`; chevron keyboard reach unspecified (Org's toggler is `tabindex=-1`) | `org-tree.component.html:20,27` | confirmed |
| JC-3 | severe (A) / warning (B) | A-4, B-7 | "Panel never shows an element absent from the visible list" is broken by the Tree↔Table toggle, and by search or collapse hiding the selected row | design §6.9, §13a #3 | confirmed by both; fixed with the severe set |
| JS-1 | severe | B-2 only | Selected-row style (`box-shadow: inset 3px` on `td:first-child`) overrides the area bar painted by the same property on the same cell → a selected row loses its area colour | `org-tree.component.scss:13-15` | suspect — **re-checked at source by the orchestrator: holds** |
| JS-2 | severe | A-3 only | PrimeNG `[ttRow]` already sets `tabindex="0"`, `role=row`, `aria-expanded`, `aria-level` and owns Tab/arrow navigation (`onTabKey` keeps only the highlighted row tabbable); the design's own `tabindex="0"` conflicts; no premise row | `node_modules/primeng/fesm2022/primeng-treetable.mjs:5232-5246,5292,5303` | suspect — **re-checked at source by the orchestrator: holds** |
| JW-1 | warning | A-5, B-4, B-5 | Viewport-fit geometry has no premise row (`.content` is the scroller with padding-top = navbar + header; page wrapper padding/margins must be zero or subtracted); no `min-height` for the split row at 650 px | `platform.component.scss:5,19-23`, `platform.component.html:9,20` | info |
| JW-2 | warning | A-6, B-6 | Under 1024 px the page scrolls, contradicting R-STF-016 "at every scroll position" (no width qualifier) | requirements R-STF-016 | info — owner decision |
| JW-3 | warning | A-11, B-9 | Budget 5 tasks (T-18…T-22) vs proposal 4 (T-18…T-21) | proposal §11, §14 | info |
| JW-4 | warning/suggestion | A-10, B-12 | P-38 citation lacks `:23`; `outline-filter` listed as retired but §6.3 moves it | design §13, §14 | info |
| JW-5 | warning | B-8 | D-STF-32 says "six triggers"; §6.9 lists nine | design §12 vs §6.9 | info |
| JW-6 | warning | B-10 | `depth × 28` ambiguous (PrimeNG `level` is 0-based) | `org-tree.component.html:23` | info |
| JW-7 | warning | A-7 | Tree's serialized URL slug not stated (`editor` default omitted by the codec; its spec pins `editor`) | `framework-url.codec.ts:8-10` | info |
| JW-8 | warning | A-8, A-9 | Create-mode dirty baseline (prefilled code/parent) and highlight during create undefined; D-STF-26 failed-save clause missing from §6.5 | requirements R-STF-016 | info |
| JW-9 | suggestion | A-12, A-13, A-14, B-11 | Rows need `id` / string `selectedKey`; clicking the selected row while dirty and stacked alerts; Q-3 label clash; "parity" widths/380 px | `data-table.component.ts:164-167`, `actions.service.ts:186` | info |

**Premise rows:** P-38, P-39, P-41, P-43 confirmed by both; P-40 confirmed for click only (refuted for keyboard → JC-1); P-42 source and arithmetic confirmed, live numbers not re-run; P-44 confirmed by A, not re-run by B. Missing rows: DataTable keyboard, `.content` geometry, shared first-cell box-shadow, `ttRow` tabindex/keys.

**Next:** ask the owner before the round-1 correction (JC-1 needs a decision).

### Round 1 correction (orchestrator, 2026-11-24)
Owner decisions before the fix: JC-1 → opt-in `keyboardSelectable` on `DataTable` (D-STF-36); JW-2 → viewport fit from 1024 px wide (R-STF-016 amended). Fixes applied to `design.md` r9 for JC-1…3, JS-1, JS-2, JW-1…9; new rows P-45…P-48.

### Scoped re-judgment 1 (both judges, Sonnet, blind)
- **Judge A:** all 14 ledger IDs RESOLVED. New: W-1 the 280 px fit claim asserted as checked while P-46 is UNVERIFIED (warning); W-2 the `p-treeTableToggler` adds its own `level × 16px` margin (warning); W-3 requirements' guard list narrower than the design's nine triggers, and the scenario lacks the ≥ 1024 px qualifier (warning); S-1…S-4 suggestions.
- **Judge B:** JC-1…3, JS-1, JS-2, JW-2…9 RESOLVED (JC-3 "weak", JW-3/JW-4 partial); JW-1 NOT RESOLVED (same as A's W-1). New: the 280 px claim (warning); Framework tables' `keyboardSelectable` only implied (suggestion); chip switch on the Tree→Table toggle not specified for dirty forms (warning); create-mode stale key (suggestion). P-45 toggler citation `:5372`, not `:5346`.
- **No severe finding left.** Warnings and suggestions from both judges applied as follow-ups in r9 (280 px stated as an estimate gated on T-19's measurement, with a compact-header fallback; own chevron button rather than the PrimeNG toggler; requirements' guard list and scenario aligned; `keyboardSelectable` explicit on Framework tables; chip switch keeps edits without a second prompt; create token; Enter/Space-only stopPropagation; Tab-roving note; outline HITL check; LOC split; total ledger count; `:5372`). These follow-ups are *fixed, not re-judged*.

## Status — lineage 3
**JUDGMENT: APPROVED ✅** — lineage 3 (design r8 → r9). Round 1 fixed 3 confirmed severe findings plus 2 single-judge severe findings that the orchestrator re-checked at source. The scoped re-judgment found no severe finding. Its warnings were applied as *fixed, not re-judged*.
