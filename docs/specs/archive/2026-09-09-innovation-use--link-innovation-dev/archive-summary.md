# Archive Summary — Innovation Use → Innovation Dev link

**A required, single-valued link from an Innovation Use result to an already-reported Innovation Development result, enforced by the section's green check. Delivered, reviewed, and verified end to end against the real database on 2026-09-09.**

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Archive date | **2026-09-09** |
| Final status | **`done`** — 14 of 14 tasks `[x]`, every one closed on an `akili-reviewer` PASS |
| Parent | `docs/specs/innovation-use/` — family child **#4** (row flipped to `done`) |
| Type / Depth | Change · **Standard** + Full-depth Rollout/Rollback (two append-only migrations) |
| Approval mode | pre-approved (d.casanas@cgiar.org) |
| Commits | **29**, `4863ace3` (specify) → `061a212c` (T-12 close) |
| Volume | **33 files, +8,718 / −119**; code alone 20 files, +3,230 / −118 |
| Decision trail | **5,454 lines** across 7 documents; `execution.md` alone is 2,835 |
| Amendments | **7**, five of them because the *spec text* was wrong rather than the code |

## 2. What shipped

| Layer | Delivery |
| --- | --- |
| Schema | Migration A seeds `link_result_roles` row **5** (`INNOVATION_USE_LINKED_DEV`) |
| Green check | Migration B appends **rule 16** to `innovation_use_validation` — `EXISTS` over an active role-5 link to an active `indicator_id = 2` result. **No grandfathering** (user ruling) |
| API | `innovation_dev_result_id` on the DTO (`@IsOptional()` + `@IsInt()`, explicit `null` permitted); write path validates the target **pre-`BEGIN`** and writes the link **inside** the transaction with `manager` threaded; read path projects both wire keys, present-and-`null` when unlinked |
| Client | A `RELATED INNOVATION DEVELOPMENT` card between *INNOVATION USE DETAILS* and *ACTORS*, with a required picker, a page-owned card rendering from the payload, a `View innovation detail ↗` anchor opening a new tab, and a card-scoped error state |

## 3. Requirements delivered

R-IUL-001 … R-IUL-013 and NFR-IUL-001 … NFR-IUL-004, closed at clause granularity through `tasks.md` §4's closure table. **R-IUL-008's persistence halves are server-side and were exercised by T-03's real-MySQL fixture plus the user's end-to-end verification**, not by mocks alone.

## 4. Files changed

| Area | Files | Notes |
| --- | --- | --- |
| Migrations | 2 new | Append-only; both **applied** 2026-09-09 (`325 of 325, 0 pending`) |
| Server | `result-innovation-use.{service,module}.ts`, its DTO, `link-result-roles.enum.ts` | +155 on the service (steps 4c and 9b, plus the read projection) |
| Server tests | 4 files incl. a new module-compile spec and a new 380-line fixture | `entities.module.spec.ts` gained the boot-order invariant |
| Client | `innovation-use-details.component.{html,ts,spec.ts}`, `get-innovation-dev-output.service.ts`, the read interface | +365 on the component spec |

Full per-task detail in `execution.md`.

## 5. Verification evidence

**Every figure below was re-measured by the Leader in isolation, never relayed from a worker's report.**

| Gate | Result |
| --- | --- |
| Server suite | **359 suites / 2,794 tests** |
| Client suite | **317 suites / 6,921 tests** |
| Client coverage | 98.23 / 96.19 / 98.00 / 98.52 against floors 40 / 20 / 30 / 45 |
| Server coverage | 90.01 / 77.51 / 85.47 / 89.57 against a 60% floor |
| `tsc -p tsconfig.spec.json --noEmit` | at the 934 baseline, **0 errors in touched files** (the drift-proof per-file gate) |
| `npm run build` (`strictTemplates`) | exit 0 |
| Lint / prettier | clean, both packages (`npx eslint` bare — `npm run lint` carries `--fix` and cannot verify, K-001) |
| **Falsifiers** | **~30 observed red**, including several that proved an existing green was incapable of failing |
| **Real database** | Both migrations applied; a link saved; the **green check verified** by the user |

## 6. Test & validation evidence — absences explicitly accepted

| Document | State | Disposition |
| --- | --- | --- |
| `test-report.md` | **absent** | **Accepted.** No separate `/akili-test` phase ran because testing was carried *inside* execution by design: T-03 is a real-MySQL fixture proving rule 16, T-06/T-07 carry the service specs, T-12 owns the client suite, and T-14 repaired two sibling fixtures. The evidence exists; it lives in `execution.md` per task rather than in one report |
| `validation-report.md` | **absent** | **Accepted by the user**, who directed the archive and stated they would proceed to testing themselves (*"comienza archivar porque yo pasare a test"*). ⚠️ **This is the one substantive gap, and it is named rather than glossed** — see below |

**What a `/akili-validate` pass would have added.** The sibling chunk (`innovation-use/details-page`) ran **two** full validation cycles and they were not ceremonial: they surfaced four product defects and two live light-theme AA defects that shipped. Validation is the phase that checks the implementation against requirements, design tokens and user flows *as a whole*, rather than task by task. **This spec has not had it.** What partly substitutes: 14 independent `akili-reviewer` audits at task granularity, ~30 observed-red falsifiers, and a human end-to-end confirmation against the real database. What does **not** substitute: a systematic sweep for cross-cutting token/flow/a11y defects of exactly the kind that shipped in chunk 3.

## 7. Accepted warnings and follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| **B-3** | Migration A's `down()` is destructive — the FK blocks deleting the role-5 catalog row while any `link_results` row references it, **and at least one now exists**. A revert means hard-deleting real data | **LIVE. Human decision only, never an agent's** |
| **R-7** | **Nothing in this repo verifies that the server boots.** `npm run test:e2e` — the only spec importing the real `AppModule` — crashes with `RangeError: Maximum call stack size exceeded` on a clean tree (verified by file-revert, not by stash) | Pre-existing, out of scope. **Kaizen / backlog** |
| **R-8** | T-05 introduced a boot-order dependency: `entities.module.ts` must require `results.module` **before** `result-innovation-use.module`, or `ResultPolicyChangeModule.imports[0]` resolves `undefined`. Now asserted by a gate with an observed-red falsifier | Closed by assertion; the graph fragility itself is backlog |
| **R-9** | `design.md` §9's **Cardinality** falsification row is owned by no task. The mechanism is tested (`array.util.spec.ts` asserts PK-preserving reactivation) and rule 16's `EXISTS` bounds the exposure, but no end-to-end DB proof exists | **Accepted.** A closing fixture would be a T-03 sibling needing its own `result_official_code` band (FP-45) |
| **R-10** | The concurrent-PATCH race (§3.2 / A8) is now **reachable** through this code — two overlapping saves can commit two active role-5 rows. No unique index is expressible in MySQL | **Accepted by design.** Rule 16's `EXISTS` keeps the check correct |
| **A-3 / A-5** | `runbook.md` advisories: its *Source of truth* section says the two files must not disagree and they already do by one comment adaptation; and it **omits `DROP FUNCTION IF EXISTS`**, so a hand re-paste after a mid-operation disconnect fails with `1304` | Open. **If applying by hand, use the migration file's SQL, not the runbook's** |
| **T-12 artifact** | Its Done bar asks for *"screenshots attached for both themes"*. The **substance** was met — a human eye confirmed a running application — but **no screenshots were retained and dark theme was not separately evidenced** | Accepted. What *is* measured: the anchor's contrast at 6.83:1 light / 7.72:1 dark, with an observed-red falsifier, after a defect that had it at **1.46:1** |
| Client `title` type | The server can return `linked_innovation_dev.title = null` (nullable column) while the committed client declares `title: string`. No live defect — the formatter's `?? ''` tolerates it and the client's own write path produces the same string | **Accepted.** Widen at the next client touch rather than reopening T-08/T-10/T-11 |

## 8. Historical notes — what this spec is actually a case study in

**Five of seven amendments corrected the spec's own text, not the code.** That is the single most transferable fact here.

| Amendment | What the text said, and what it cost |
| --- | --- |
| **03** | R-IUL-012 required a four-state control but specified the error state only as *"the section's existing error surface is used"* — and `design.md` specified **no** error surface at all. Implementing that phrase **literally** routed a dropdown's HTTP failure into the page-level gate, which unmounted the section, made *Save* a silent no-op and let *Next* discard unsaved edits. **T-09 HALTed at attempt 3**, and the implementer had done what its brief instructed |
| **04** | The anchor's URL was specified as the bare `result_official_code`. But R-IUL-002 forbids filtering the options by platform, so a PRMS/TIP/AICCRA target is selectable — and `/result/284` resolves to **STAR**. The card rendered `PRMS 284` beside a link that opened a **different result** |
| **02** | T-08's own verification command emitted into `out-tsc` and produced **157 phantom failed suites**; T-03's falsifier clause was unsatisfiable as written; and §7's *"server suite green"* structurally could not see the fixture suite where T-03 lives |
| **05 / 06** | T-05's mandated verification was **unreachable** as written, and the Leader's first attempt to say so **over-declared** it: a reachable falsifier existed via the metadata technique the repo's own child guide already prescribed. Two review rounds on a **7-line** change, five of six issues correcting the Leader's prose |
| **07** | The picker had no placeholder. **Invisible to every gate** — valid TypeScript, renders without error, breaks no assertion, looks correct in a diff. Caught by the user's eye on the first pass against a running app |

**The pattern:** a requirement phrased as a reference to something that does not exist will be implemented literally, and the implementer will be blamed for it. Three separate failures in this one spec trace to that shape.

**The counter-pattern that worked:** *"two separate specs"*. T-06's falsifier table predicted that collapsing the three-way to `??` would redden the explicit-`null` spec **while the omitted spec stayed green** — and it did, exactly. A single combined test would have missed the defect half the time. That prediction being confirmed is the strongest verification event in the run.

**Three Leader errors worth carrying forward**, all caught by a reviewer or a worker rather than by the Leader:
1. Instructing a key-presence assertion via `'k' in obj` — which is `true` for `{k: undefined}`, making the test a tautology. The worker refused and used a `JSON.stringify` round trip instead; the falsifier proved the correction necessary.
2. Asserting a boot-order invariant on the `imports` **array**, which is non-causal — TypeScript emits `require()` in **statement** order. The gate stayed green through a statement-only reorder that reversed the real order.
3. Reading `curl :4200 → HTTP 200` as evidence that this project's front was up. **It was a different project's** `ng serve`, running since the previous day. The port answered and the Leader inferred the application.

## 9. Where the evidence lives

| Artifact | Path |
| --- | --- |
| Full per-task audit trail (2,835 lines) | `execution.md` |
| Judgment Day ledger (13 corrections, 1 rejected) | `judgment.md` |
| Migration apply procedure + advisories | `runbook.md` |
| User's mock (Amendment 01) | `mockup/` |
| Retrospective | `docs/specs/kaizen/innovation-use--link-innovation-dev.md` |
| ADR | `docs/trd/trd.md` §2.4 **ADR-13** |
| Client decision record | `docs/ux-ui/design.md` §12.2, entry dated 2026-09-09 |
