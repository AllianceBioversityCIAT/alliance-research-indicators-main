# Validation Report — Control Lists: global lists read by key, values applicable per portfolio

> **Verdict: PASS WITH WARNINGS. Archive-ready once the requester decides W-1.**
> Every requirement scenario and every `BUT it must NOT` / `AND IT MUST` clause is implemented and evidenced. No FAIL. 7 open WARNs: 1 behavior gap (W-1), 2 test gaps, 4 document-drift items for `/akili-archive`.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/control-lists-global-scope/` (id 2026-10-control-lists-global-scope) |
| Branch / HEAD | `institutional-kpis` @ `8ac59ec1` (T-00 `0d3dbacf`, T-01 `f0da74b3`, T-02 `e081da56`) |
| Date | 2026-10-14 |
| Validator | Claude Code, Opus 5.5 (T3). Implementers were sonnet, so author ≠ auditor holds |
| Method | Two independent read-only auditors (`akili-reviewer`/opus): **A** server + DB, **B** client + UI. Build, lint, type-check and coverage run by the validator. No `test-report.md` exists; test evidence comes from `execution.md` and the spec files |
| Visual reference | Mockup artboard 1 — `docs/specs/institutional-performance/mockup/ControlledLists.dc.html` |

## 2. Summary

| Area | Result |
| --- | --- |
| Tasks T-00…T-03 | **PASS** — all `[x]`, each with an `execution.md` entry and Reviewer PASS (T-00/T-03 HITL) |
| File existence (design §2.1) | **PASS** — all rows as designed; 3 extra test files explained in `execution.md` T-02 |
| Build / lint / types / coverage | **PASS** — details in §5 |
| Requirement coverage | **PASS** on all scenarios and clauses, **WARN** on two: R-CLG-009 AC.2 for inactive-only values (W-1) and the in-use restriction scenario (W-2) |
| Design conformance | **PASS** — 1 unexplained drift (W-4), rest explained by D-EX-1…7 |
| Constitution impact | **WARN** — guides and baseline docs do not yet reflect the change (W-5) |

## 3. Task Completion

| Task | Status | Evidence | Result |
| --- | --- | --- | --- |
| T-00 HITL — revert old migrations | `[x]` | `execution.md` T-00: hosts, four reverts quoted (D-EX-1), `migration:show` pending ×4 | PASS |
| T-01 Slice 1 — global lists, key reads, menu, roles | `[x]` | Attempt 1 PASS by two lens Reviewers; falsifiers 1–7 red; full suites | PASS |
| T-02 Slice 2 — values per portfolio | `[x]` | Attempt 1 PASS by two lens Reviewers; falsifiers 1–5 red; full suites; spec tsc | PASS |
| T-03 HITL — roles, menu, mockup | `[x]` | Requester's per-step answers (role named per step), full-app Swagger seen | PASS (requester-reported, not captured) |
| Done definition (tasks.md §5) | 2 of 5 ticked | "Every row of §3 closed" and "Coverage green" are closed **by this report**; RB-3 is `/akili-archive` work | WARN → closes at archive |

## 4. File Existence

| Area | Result | Notes |
| --- | --- | --- |
| Server/DB rows of design §2.1 (26) | PASS | Migrations `…000–…003`, seed module, entities, DTOs, service, lookup, controller, module, specs, `package.json` `!**/db/seeds/**` (`:141`), kaizen `:106`/`:136` |
| `test/control-lists-isolation.integration-spec.ts` | PASS | Deleted as designed |
| Extra: `control-lists-applies-to`, `control-lists-module-wiring` integration suites, `test/support/control-lists-providers.ts` | PASS (explained) | Not in §2.1; accepted in `execution.md` T-02 |
| Client rows of design §2.1 (12) | PASS | Page folder moved to `administration/configuration/control-lists/`; old folder gone; `mock-services.mock.ts` n/a (mocks nothing) |

## 5. Build Integrity

Run by the validator on 2026-10-14, tree quiet (only read-only auditors active).

| Check | Command (package) | Result |
| --- | --- | --- |
| Server build | `npm run build` (server) | exit 0 |
| Server lint (no `--fix`) | `npx eslint src/domain/entities/control-lists src/db/seeds src/db/migrations/17909000000*.ts test/control-lists-*.ts test/support/control-lists-providers.ts` | exit 0 |
| Server types incl. specs and `test/` | `npx tsc --noEmit -p tsconfig.json` (no `include` → whole project) | exit 0, **0 errors** |
| Server coverage | `npm run test:cov -- --silent` | All files **90.49 / 76.48 / 86.85 / 90.18** (stmts/branch/func/lines) vs 60% floor; `control-lists` module 99.23% stmts. Exit 1 only from the 3 baseline failures below |
| Server tests (in the cov run) | same | `Tests: 3 failed, 4250 passed, 4253 total` — the 3 = archive baseline (`capdev-bulk-summary.template` ×1, `result-innovation-use/entity-metadata` ×2), unchanged |
| Client build | `npx ng build` | exit 0; "Error occurs in the template…" lines are pre-existing warnings in other components; 0 mention control-lists |
| Client lint | `npm run lint -- --quiet` | All files pass linting |
| Client tests + coverage floors | `npm test -- --silent` (Leader, `execution.md` T-02) | 345 suites / 7,973 tests, exit 0 (floors enforced by jest) |
| Client spec types | `npx tsc -p tsconfig.spec.json --noEmit` (`execution.md` T-02) | 945 errors = documented pre-existing total; 0 in the control-lists spec |
| Integration (local DB) | `npm run test:integration -- control-lists` (server Implementer, `execution.md` T-02) | 7 suites / 104 tests, run twice. Not re-run here (it writes to the local DB) |

**What these gates cannot reach (KZ-017):** the integration harness mounts neither `GlobalExceptions` nor `JwtMiddleware` (the envelope is pinned in unit specs); no gate touches the shared Dev DB; rendered layout was seen only by the requester at T-03.

## 6. Requirement Coverage

Clause-level tables are in the auditor reports (summarized here; each row was checked against its quoted clause, owning task, code line and test).

| Requirement | Scenarios / clauses | Result | Where it is proven |
| --- | --- | --- | --- |
| R-CLG-001 Global lists | *One set* + BUT no portfolio; *Stale caller* + MUST NOT write; AC.1–2 | PASS | `control-lists.validation.spec.ts` (real pipe, no repo write); seed-int `SHOW COLUMNS`; F4 red |
| R-CLG-002 Unique category names | *Duplicate name* + MUST DB index; AC.1 | PASS | Raw INSERT → errno 1062; `SHOW INDEX` `Non_unique = 0`; stubbed-1062 → 409 |
| R-CLG-003 Unique keys, key is the reference | *Duplicate key* + BUT not created + MUST DB index; *Reference shown* + BUT no `P<id> ·`; *Move to any category*; AC.1–2 | PASS | lists-int raw 1062 + F3 red; page spec `Key: <key>`; lists-int move → 200 |
| R-CLG-004 Consumer contract by key | *Read by key* + MUST NOT need a portfolio; *Value from another list* + BUT not via former portfolio; AC.1–2 | PASS | usage-int L1…L4 with no parameter; lookup pass/400/404 |
| R-CLG-005 Page without a portfolio | *Opening the page* + BUT no selector; *Empty module*; AC.1–2 | PASS | page spec (four states, one `p-select` only in values panel, parallel load) |
| R-CLG-006 Rewritten migrations + seed | *Fresh run* + MUST no `portfolio_id`; *Run twice*; *Old local schema* + BUT detect skipped revert; AC.1–2 | PASS | T-00/T-01/T-02 migration output; seed-int 0 rows; `…003` `down` proven |
| R-CLG-007 Removed behavior | *Removed endpoint* → 404; AC.1 | PASS | validation.spec A2 → 404; route inventory; client method gone |
| R-CLG-008 Menu + roles | *Menu placement* + BUT not under PM + MUST NOT change others; *TS allowed*; *Center Admin denied* + BUT no data change; *Consumer read open*; AC.1–3 | PASS | Roles test over discovered handlers + F5; values-int TS 201 / CA 403 no change; sidebar exact arrays + F7; routes spec + F6; T-03 step 1 with a Center-Admin-only user |
| R-CLG-009 Values per portfolio | *One portfolio only* + BUT not for P1; *No filter*; *Unknown portfolio*; *Deactivated after linking* + MUST NOT be offered/shown as all; *Partial save impossible*; AC.1, 3, 4, 5 | PASS | applies-to-int on real SQL (7 cases + other-list canary, F1 red); atomicity errno 1452 (F4 red); deactivation (F5 red); client filter literals |
| R-CLG-009 *Restricting a value already in use* + MUST keep records valid | "change is saved (200)" | **WARN (W-2)** | Code holds by structure (`updateValue` never consults usage); only the membership half is tested |
| R-CLG-009 AC.2 "empty means all" | inactive-only value | **WARN (W-1)** | `control-lists.component.ts:751-752` omits `[]` for such a value (D-EX-5); hint says "None ticked = applies to all" (`:368-372`) |
| NFR-CLG-001 / 002 / 003 | DB uniqueness; regression; Swagger | PASS | Raw 1062 + `SHOW INDEX`; full suites vs baseline; decorators + reduced boot + T-03 full Swagger |

## 7. Linting & Code Quality

**Constitution checks (PASS):** `ServerResponseDto` via `ResponseUtils.format` on every handler · `@UseGuards(RolesGuard)` + `@Roles` on A1, A3–A12, none on A13 · audit fields via `currentUser.audit` (link table exempt by D-CLG-12) · `LoggerUtil`, no `console.*` · Swagger `@ApiTags/@ApiBearerAuth/@ApiOperation/@ApiBody/@ApiQuery` · client: standalone + `loadComponent`, HTTP only via `ApiService`, `MainResponse` handled, signals, no hex literals.

**4R advisory findings (not gating):**

| ID | Lens | Finding | Source |
| --- | --- | --- | --- |
| ADV-1 | Resilience | Two concurrent A11 PATCHes with `portfolioIds` can deadlock (errno 1213) and surface as a bare 500; not executed | T-02 A-ADV-2 |
| ADV-2 | Risk | applies-to suite toggles `is_active` on the two lowest portfolios; prints but does not fail fast on a non-local host | T-02 A-ADV-3 |
| ADV-3 | Reliability | Seed `affectedRows ?? 0` never seen above 0 | T-01 A-ADV-2 |
| ADV-4 | Readability | categories-int 409 test checks status only; seed loader-test comment names one error form | T-01 A-ADV-3/4 |
| ADV-5 | Readability | `portfolioIds` 400 has two shapes (pipe array vs `{description, field}`); both name the field | VA-11 |
| ADV-6 | Resilience | Values-level error state has no Retry (page-level does) | VB-5 |
| ADV-7 | A11y | Filter `aria-label` duplicates its `<label>`; hint/note lack `aria-describedby` | VB-6, T-02 B-ADV-4 |
| ADV-8 | Readability | `bg-white` panels and arbitrary font utilities (pre-existing) do not follow dark-mode tokens | VB-8 |
| ADV-9 | Test | No client test for a `portfolioIds` 400; `P<n> ·` absence test covers 3 regions, never red-tested; old-path test asserts `not.toBe` | VB-10, VB-11, T-01 B-ADV-3 |
| ADV-10 | Scope | No UI to move a list between categories (API-only capability) | VB-12 |

## 8. Design Conformance

| Item | Result |
| --- | --- |
| D-CLG-1…14 | All as built (server and client) |
| §5 rule 4 — `portfolioIds` validation "inside" the transaction | **WARN (W-4)** — runs before `dataSource.transaction` (`service.ts:422`, `:504`); no D-EX. Effect: a time-of-check gap that D-CLG-14 hides on read |
| §5 rule 5 / client filter | PASS — client `appliesToAll ∨ appliesTo ∋ P` is equivalent to A13 (`activeOnly=false`) |
| Explained drift | D-EX-1 (four reverts) · D-EX-2 (portfolios load moved to T-02) · D-EX-3 (5 spec-only route hits) · D-EX-4 (reduced Swagger boot) · D-EX-5 (`portfolioIds` omitted in two states) · D-EX-6 (`name`, not short names) · D-EX-7 (`tdd`) |
| Proposal intent / non-goals | Aligned — no portfolio on lists or categories; codes, ids, ordering, in-use protection, `DataTable` unchanged |
| Mockup artboard 1 | WARN (accepted) — 14 differences itemized by Auditor B (below); requester accepted "minor differences" at T-03 |

**Cross-document figure check**

| Figure | Result |
| --- | --- |
| Seeded ids 2 / 6 / 23; "three rewritten + a fourth" migration; 11 admin handlers + A13 | Consistent across requirements, design, tasks, execution, code |
| Design §10 "lists the **four** control-list migrations" vs seed-int loader glob `{00,01,02}` (three) | **Contradiction → W-3** |
| Requirements §8 "A9–A11 gain `portfolioIds`" vs design §4 (A9 gains `appliesTo`/`appliesToAll`); §8 "A1, A3, A6, A7" vs AC.2 "A1, A3, A4, A6, A7" | Contradiction, minor → W-7 |
| Design §14 ~2,950 LOC vs actual ~8,360 | Overrun reported and accepted (`execution.md` T-02); design not annotated → W-7 |
| tasks.md T-00 "three reverts / pending ×3" vs four | Explained (D-EX-1, annotated) |

**Mockup differences (Auditor B, M-1…M-14; requester-accepted as "minor"):** description drops the consumer sentence · filled vs outlined *+ New category* · categories not collapsible, extra category Delete icon · *Add value*/*Export* placement · *Delete list* always shown (mockup stale, CR-2) · extra ID column (D-CTL-14) · *Applies to* plain text with full `name`, not a "P2 only" pill (D-EX-6) · *In use* bare number / *Active* badge · PrimeNG `p-select` filter · filtered-empty copy differs · value-modal title/layout/labels differ · longer none-ticked hint (design §6 asks for it) · no Category select in the list modal · no "New" sidebar badge.

## 9. Test Evidence Summary

| Suite | Count | Source |
| --- | --- | --- |
| Server full (unit) | 4,250 pass / 3 baseline failures | Validator `test:cov`, 2026-10-14 |
| Server `control-lists` unit | 18 suites / 289 tests | `execution.md` T-02 |
| Server integration (local DB) | 7 suites / 104 tests | `execution.md` T-02 |
| Client full | 345 suites / 7,973 tests | `execution.md` T-02 (Leader) |
| Falsifiers observed red | T-01: 7 (+1 guard) · T-02: 5 server (+5 extra) + 4 client | `execution.md` |
| Manual (HITL) | T-03 steps 1–4 + full Swagger, role per step | `execution.md` T-03 (requester-reported) |

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` block was written during execution. The auditors found these are now stale. All go to `/akili-archive` (W-5).

| Document | Stale content |
| --- | --- |
| `docs/ux-ui/design.md` :83-88, :228-259, decisions log | IA has no *System admin* group; no screen-inventory row for `/administration/configuration/control-lists`; no entry for the menu/role move (D-CLG-7/8) |
| `docs/trd/trd.md` | No Control Lists entry at all: module, `control_list_value_portfolios`, consumer contract `assertValueInList(valueId, listKey)` + A13 `?portfolioId=` |
| Root `CLAUDE.md` §4.1 | "Every domain entity extends `AuditableEntity`" — no exception for pure join tables (D-CLG-12) |
| `server/researchindicators/src/CLAUDE.md` §2, §3, §9 | No `src/db/seeds/` convention (seed SQL outside the migrations glob); coverage exclusions miss `db/seeds/**` |
| `client/research-indicators/src/CLAUDE.md` :60-62, :67 (+ `AGENTS.md` mirror) | Folder tree lacks `administration/configuration/`; guards list lacks `appConfigurationGuard` |
| `docs/specs/kaizen/institutional-performance--control-lists.md` :125-126 (pending P8) | Would write the removed route into `docs/ux-ui/design.md` |
| CodeGraph | Re-index pending (page folder moved; new link entity) |

## 11. Remediation

| ID | Severity | Finding | Recommended action | Owner / when |
| --- | --- | --- | --- | --- |
| **W-1** | WARN (behavior) | A value linked only to inactive portfolios cannot be set back to "all" from the page, while the modal hint says "None ticked = applies to all portfolios" (`control-lists.component.ts:368-372`, `:751-752`). Conflicts with R-CLG-009 AC.2 for that state | **Requester decides:** (a) follow-up fix — distinct hint for this state + explicit "Apply to all portfolios" that sends `[]`, with tests; or (b) accept and record the limitation in requirements R-CLG-009 + design §6 | Requester, before archive |
| W-2 | WARN (test) | *Restricting a value already in use* → 200 has no test with `inUse > 0` | Add one usage-int test: PATCH `portfolioIds` on the in-use value → 200, links replaced | Follow-up (small) |
| W-3 | WARN (test/doc) | Committed loader regression covers `…000–…002`, design §10 says four | Widen the seed-int glob to `{00,01,02,03}`, or amend design §10 | Follow-up or archive |
| W-4 | WARN (doc) | §5 rule 4 places validation inside the transaction; code validates before | Amend design §5 rule 4 (behavior is acceptable per D-CLG-14) | `/akili-archive` |
| W-5 | WARN (constitution) | Baseline docs and child guides stale (§10) | Constitution & Graph Sync | `/akili-archive` |
| W-6 | WARN (doc) | Kaizen P8 (`:125-126`) points at the removed route | Rewrite P8 to *System admin*, `/administration/configuration/control-lists` before it is applied | `/akili-archive` |
| W-7 | WARN (doc) | Spec drift: design §6 "short names" → `name`; design §14 budget not annotated; tasks.md T-02 falsifier 1 wrong prediction; requirements §8 handler lists; design §6 filter should say `activeOnly=false`; tasks.md "Last updated" | Correct in place with correction closure (grep forward/backward) | `/akili-archive` |
| — | Resolved | VA-1 coverage never measured | Closed by §5 (`test:cov`) | — |

## 12. Archive Readiness Recommendation

**Ready for `/akili-archive` after the requester decides W-1.**

- [x] All tasks `[x]` with evidence
- [x] No FAIL findings
- [x] Key requirements and scenarios covered by automated tests (+ HITL for UI/roles)
- [x] Build, lint, types and coverage green (3 known baseline failures, unchanged)
- [x] Implementation drift recorded (D-EX-1…7); remaining doc drift listed for archive (W-4…W-7)
- [ ] W-1 accepted or scheduled as a follow-up
- [ ] W-2 / W-3 accepted or scheduled
- [ ] Requester has reviewed this summary

Next command, once the boxes above are settled:

```text
/akili-archive changes/control-lists-global-scope
```
