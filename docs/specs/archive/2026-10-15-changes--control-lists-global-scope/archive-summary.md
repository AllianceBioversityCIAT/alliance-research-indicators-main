# Archive Summary — Control Lists: global lists read by key, values applicable per portfolio

> **Delivered and validated.** Control lists are global and read by key, the page lives under *System admin* (Admin + Technical Support), and each value can be restricted to portfolios. Validation: PASS WITH WARNINGS. No FAIL. W-1…W-3 fixed by T-04. W-4/W-7 corrected in this folder at archive. W-5/W-6 recorded as pending items (spec branch).

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-10-control-lists-global-scope |
| Requester | Hector F. Tobón |
| Branch | `institutional-kpis` (spec branch; not pushed) |
| Approval Mode | `gated` |
| Kaizen entry | [`docs/specs/kaizen/changes--control-lists-global-scope.md`](../../kaizen/changes--control-lists-global-scope.md) |

## 2. Original Spec Path

`docs/specs/changes/control-lists-global-scope/`

## 3. Archive Date

2026-10-15

## 4. Final Status

| Task | Result | Commit |
| --- | --- | --- |
| T-00 HITL — revert the old migrations on the local DB | PASS (4 reverts, D-EX-1) | `0d3dbacf` |
| T-01 Slice 1 — global lists, key reads, System admin menu and roles | PASS, attempt 1 | `f0da74b3` |
| T-02 Slice 2 — values applicable per portfolio | PASS, attempt 1 | `e081da56` |
| T-03 HITL — roles, menu, mockup | PASS (requester, role named per step) | `8ac59ec1` |
| T-04 Validation follow-up W-1…W-3 | PASS, attempt 2 (attempt 1 FAIL: falsifier red on the wrong assertion) | `0b83a45f` |

## 5. Requirements Delivered

| Requirement | Delivered |
| --- | --- |
| R-CLG-001 | Categories and lists have no portfolio; a stale `portfolioId` → 400 with no write |
| R-CLG-002 / 003 | Category names and list keys unique module-wide, enforced by DB indexes; key shown alone |
| R-CLG-004 | `by-key/:listKey/values` and `assertValueInList(valueId, listKey)` need no portfolio |
| R-CLG-005 | Page without a selector; four UI states, with Retry on the page-level error |
| R-CLG-006 | Migrations `…000–…002` rewritten, seed moved to `src/db/seeds/`, `…003` link table |
| R-CLG-007 | A2 removed (404) with its client method and tests |
| R-CLG-008 | Menu under *System admin*; A1, A3–A12 = Admin + Technical Support; Center Admin 403 / redirected; A13 open |
| R-CLG-009 | `control_list_value_portfolios`; `portfolioIds` on A10/A11 in a transaction; `appliesTo`/`appliesToAll`; optional A13 filter; *Applies to* column, filter and field; inactive-only values can be set back to "all" (T-04) |
| NFR-CLG-001…003 | DB uniqueness, regression vs baseline, Swagger |

## 6. Files Changed Summary

| Area | Files |
| --- | --- |
| DB | `src/db/migrations/1790900000000…003`, new `src/db/seeds/control-lists.seed.ts` |
| Server module | entities (+ link entity), DTOs, types, service, lookup, controller, module, repositories, specs (+ new `control-lists.validation.spec.ts`) |
| Server tests | integration suites: categories, lists, values, usage (rewritten); new seed, applies-to and module-wiring suites; `test/support/control-lists-providers.ts`; isolation suite deleted |
| Client | page moved to `administration/configuration/control-lists/`; `control-lists.interface.ts`, `api.service.ts`, `alliance-sidebar`, `app.routes.ts`, guard spec |
| Docs | kaizen consumer guide `institutional-performance--control-lists.md` :106, :136 |
| Size | ≈ 8,360 changed lines (budget ≈ 2,950; overrun accepted at the tripwire) |

## 7. Test Evidence Summary

| Gate | Result |
| --- | --- |
| Server full (`npm test`) | 4,250 pass; the 3 failures are the archive baseline (`capdev-bulk-summary.template`, `entity-metadata` ×2), unchanged |
| Server integration (local DB) | 7 suites / 105 tests |
| Server coverage | 90.49% stmts (floor 60%); `control-lists` 99.23% |
| Client full | 345 suites / 7,975 tests |
| Builds, lint, types | green; server `tsc` incl. specs 0 errors; client spec `tsc` 945 = pre-existing total |
| Falsifiers observed red | T-01 7 (+1) · T-02 5 server (+5) + 4 client · T-04 4 |
| HITL | T-00 (requester decisions), T-03 (Center-Admin-only user, TS, filter, full Swagger) |

## 8. Validation Summary

`validation-report.md`: **PASS WITH WARNINGS**, 0 FAIL. Two independent auditors (server, client).

| WARN | State at archive |
| --- | --- |
| W-1 inactive-only value cannot become "all" | Fixed — T-04 |
| W-2 no in-use restriction test | Fixed — T-04 |
| W-3 loader test covered 3 of 4 migrations | Fixed — T-04 |
| W-4 §5 rule 4 validation placement | Corrected in `design.md` §5 rule 4 (as-built note) |
| W-5 constitution drift (guides, UX design, TRD) | Pending items G1–G4, T1 in the kaizen entry (spec branch) |
| W-6 kaizen P8 points at the removed route | Pending item G5 in the kaizen entry (spec branch) |
| W-7 spec text drift | Corrected: `design.md` §6 + §14, `requirements.md` §8, `tasks.md` T-02 falsifier 1 + T-02 scope + dates |

## 9. Accepted Warnings Or Follow-Ups

| Item | Owner | Where |
| --- | --- | --- |
| Pending guide, UX-design and TRD edits (G1–G5, T1) | Apply phase on `main` | kaizen entry `## Pending Items` |
| RB-3: update `organizational-structure` (Q-1, D-ORG-3, R-ORG-011, P-2, P-12) and resume it | Requester / next spec | `docs/specs/institutional-performance/organizational-structure/` |
| CodeGraph re-index (page folder moved, new link entity) | Developer | `.codegraph/` |
| 4R advisories (ADV-1…10: deadlock 1213 → bare 500, values-level Retry, a11y `aria-describedby`, dark-mode `bg-white`, move-list UI, …) | Requester decides | `validation-report.md` §7 |
| Mockup differences M-1…M-14 | Accepted as minor (T-03) | `validation-report.md` §8 |

## 10. Historical Notes

- Judgment Day ended **ESCALATED**; the requester decided R3-1/R3-2 without a third judgment. T-02 falsifiers 2–3 made both corrections observable (RB-1 closed).
- TypeORM 0.3.20 reverts the **highest `id`**, not the newest timestamp. The T-00 plan assumed three reverts; four were needed (D-EX-1).
- Full `main.ts` boot attaches a consumer to the shared AWS RabbitMQ queue, so Swagger was checked with a reduced boot (D-EX-4); the requester saw the full app at T-03.
- Execution decisions D-EX-1…8 are listed in `execution.md` § Summary and T-04.
