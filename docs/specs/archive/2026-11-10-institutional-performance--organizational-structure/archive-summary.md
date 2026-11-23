# Archive Summary — Institutional Performance / Organizational Structure

> **Outcome: delivered and validated.** A global, 4-level, year-versioned organizational structure is now in STAR. The server module has a save engine, lifecycle, change log and consumer contract, and the Center Admin page offers a tree and a table. A 117-entry seed carries 83 directors and 1 delegate. Final validation: **0 FAIL · 31 PASS · 0 WARN**. **Not yet merged to `dev`**: the requester keeps the work local (RB-3).

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `institutional-performance/organizational-structure` (spec id `2026-10-organizational-structure`) |
| Parent family | [`../family.md`](../../institutional-performance/family.md), child 2 of 5 (`institutional-performance`) |
| Requester | Hector F. Tobón |
| Branch | `institutional-kpis` (not pushed; ~270 commits ahead of `origin/institutional-kpis`) |
| Archived by | `/akili-archive`, 2026-11-10 |
| Commits | 27 tagged `[SPEC:institutional-performance/organizational-structure]`, from `9e69c79a` (2026-10-08) to `8947cb31` (2026-11-10) |

## 2. Original Spec Path

`docs/specs/institutional-performance/organizational-structure/`

## 3. Archive Date

2026-11-10

## 4. Final Status

| Item | Status |
| --- | --- |
| Tasks | T-01…T-15 **done**, each with an independent Reviewer PASS (T-06 is human, with the requester's quotes) |
| Validation | **0 FAIL · 31 PASS · 0 WARN**: `validation-report.md` §14 |
| `test-report.md` | **Not produced.** `/akili-test` was not run as a separate phase. Test evidence was produced per task (red first, then green, plus falsifiers) and audited by `/akili-validate` §5 and §9. Absence accepted at archive |
| Done definition | 6 of 7 checked; RB-3 is held open by the requester (§9) |

## 5. Requirements Delivered

| Area | Delivered |
| --- | --- |
| R-ORG-001…003 | Global structure with no portfolio; permanent `ORG-###` codes and proposals; 4-level hierarchy rules |
| R-ORG-004…006 | Per-year versions (half-open ranges); save engine with in-place edit, split and propagation; back-dating; year views |
| R-ORG-007…009 | Inactivate/reactivate with successor; logical/physical delete; append-only change log and history |
| R-ORG-010…011 | Consumer contract (`resolve`, `ancestors`, `successors`, usage registry); Control Lists *Level* wiring (`usedBy`, errno 1451 → 409) |
| R-ORG-012…014 | Center Admin page (tree + table, filters, export, panel with Details / History / Linked data); admin-only writes |
| R-ORG-015 | Seed: 117 entries (3 / 19 / 1 / 94), 83 directors from the June 2026 sheet, 1 seeded delegate (`…006`) |
| R-ORG-016…017 | Director (active staff) and delegates as a **versioned** field (pivot D-ORG-24) |
| NFR-ORG-001…006 | p95 budget met (verdict *inconclusive*, accepted); integrity; append-only log; **no write reachable by machine tokens** (T-13); a11y; Swagger |

## 6. Files Changed Summary

| Area | Files |
| --- | --- |
| Server module | `src/domain/entities/organizational-structure/`: 29 top-level files plus 26 in `dto/`, `repositories/`, `entities/`. Two services (a request-scoped writer and a singleton reader), timeline and hierarchy utils, usage registry, level provider, clock |
| Server shared | `src/domain/shared/guards/human-credential.guard.ts` (+ spec), new and reusable; `src/db/helpers/staff-carnet-column.ts` |
| Control Lists | `control-lists.service.ts`: errno 1451 → `ConflictException` (additive) |
| Migrations | `1791000000000`…`1791000000006`: 4 tables, the seed, the delegate re-key, the delegate seed. Seed data in `src/db/seeds/org-structure.seed.ts` |
| Server tests | 8 integration suites `test/org-structure-*.integration-spec.ts` + sibling unit specs |
| Client | `pages/platform/pages/administration/center-admin/organizational-structure/` (25 files: page, `org-tree`, `org-unit-panel`, `org-unit-form`, `org-lifecycle-dialog`, utils); `ApiService` methods; sidebar item; route with `centerAdminGuard`; modal `orgUnitLifecycle`; `shared/interfaces/org-structure.interface.ts` |

## 7. Test Evidence Summary

| Suite | Last result (2026-11-10, no worker active) |
| --- | --- |
| Server unit (`npm test`) | `2 failed, 473 passed, 475 total` · `3 failed, 4996 passed`. The 2 reds are pre-existing and unrelated: `capdev-bulk-summary.template.spec.ts`, `result-innovation-use/entity-metadata.spec.ts` |
| Server coverage | 90.76 % statements / 77.26 % branches (floor 60 %) |
| Integration `org-structure\|control-lists` | `1 skipped, 14 passed` · `3 skipped, 283 passed, 286 total` (local MySQL) |
| Client unit | `358 passed` · `8418 passed`; coverage 96.98 / 92.42 / 95.87 / 97.47 |
| Builds / lint | server `tsc` 0, `nest build` ok; client `ng build` complete, `ng lint` clean |
| Performance | NFR-ORG-001 budget met with a ≥ 7× margin; *inconclusive* by the spread rule, accepted |
| Human | T-06 + per-item answers at validation (Center-Admin user, tree, arrow keys, column resize) |

## 8. Validation Summary

`validation-report.md`. The first pass (2026-11-06) found **1 FAIL**: NFR-ORG-004, where machine tokens could reach the writes. It also found 8 WARN and 7 cross-document figure drifts. Close-out:

- **T-13** closed the FAIL (`HumanCredentialGuard`).
- **T-14** owned the seed edits made after T-05.
- **T-15** fixed advisories A-1, A-2, T13-a and T14-a, and A-4 was verified on a full boot.
- The requester confirmed each human item, and the docs were amended (D-ORG-26, D-ORG-27).

Final: **0 FAIL · 31 PASS · 0 WARN**.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner / trigger |
| --- | --- | --- |
| F-1 | **RB-3: merge to `dev`.** On deploy the Dev pipeline applies `…000`–`…006` and the seed to the **shared** Dev DB. The requester holds it ("seguimos trabajando en local") | Requester approval before any merge to `dev`; re-measure whether the **Prod** pipeline applies migrations before `main` |
| F-2 | **RB-4: `AllianceUserStaffService.findBySearch`** `AND`/`OR` precedence lets inactive staff match by last name or email (other screens; this module has its own search) | Deferred ("difierelo"); candidate `/akili-propose bugfix/...` |
| F-3 | **RB-5:** the `alliance_user_staff.carnet` charset in Prod is not measured (FK migrations read it at run time, D-ORG-16) | Before the first Prod run |
| F-4 | **RB-6:** cross-entry race (`FOR UPDATE` locks the saved entry only) | Accepted (A-6) |
| F-5 | Dark-mode contrast of the panes (`--ac-white-1` `#e5e5e5` with `#c2c2c2` text) | Accepted ("dejalo asi") |
| F-6 | Accepted advisories A-3, A-5, A-7, A-8, T13-b (other admin APIs still accept machine tokens), T14-b | Accepted at validation |
| F-7 | `npm run migration:scan` points to a missing `scripts/scan-migration-placeholders.js` (pre-existing) | Repo hygiene |
| F-8 | Branch not pushed; `origin/staging` has advanced since the last merge | Merge `staging` before opening a PR |

## 10. Historical Notes

- **Pivot (2026-10-22, D-ORG-24):** delegates moved from one list per entry to a versioned field of each version (`…005` re-keys the table). It added T-12 and raised the review cap from 12 to 14.
- **Seed source changed (2026-10-28):** directors come from the requester's June 2026 sheet (83), replacing the mockup's 11. Two-person cells were decided on 2026-11-09 (Deissy Martinez Baron director, Christopher Kettle delegate).
- **Premise corrected (2026-11-09, D-ORG-27):** design §8 had asserted that machine tokens get no admin role. They inherit the app secret's responsible user's roles.
- **Rollout note (done definition):**
  1. Merge order: this branch → `dev` only after RB-3 is approved; the Dev deploy runs `migration:execute`, so `…000`–`…006` run in order (`…003` and `…005` back to back on an empty table, then `…006` seeds the delegate).
  2. No feature flag: admin-only, additive page.
  3. Backout: revert the code, then `down` `…006` → `…000`. Run `…006` first: it removes the seeded delegate, and `…005`'s `down` refuses while delegate rows exist. This is safe while no consumer stores unit ids.
  4. Before `main`: confirm that the Prod pipeline applies migrations, and the Prod `carnet` charset (F-1, F-3).
- **Local DB:** `stardb` holds the seed with 83 directors and the `…006` delegate (migration rows 392, 394, 413). The requester's earlier browser test data was removed with their approval (2026-11-06).

## 11. Diagrams

The spec has no `diagrams/` folder; design §2 holds an inline Mermaid component diagram. Baseline diagram slots this spec made stale, as follow-ups (recorded as pending items, spec branch):

- TRD §2.2 C4 Container: no change (no new container).
- TRD §4.1 / §4.2 module lists: they gain `organizational-structure` (server) and the Center Admin page (client). Recorded as `guide-sync` / `factual-sweep` pending items in `docs/specs/kaizen/institutional-performance--organizational-structure.md`.
