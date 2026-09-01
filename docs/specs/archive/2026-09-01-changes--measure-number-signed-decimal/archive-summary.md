# Archive Summary — `measure-number-signed-decimal`

> **Outcome:** delivered and verified on the shared Dev database. One field on the Innovation Use
> details page now accepts **signed 4-decimal** values, on a column shared with OICR — and OICR's
> behaviour is preserved **by construction**, not by luck.

## 1. Document Control

| | |
| --- | --- |
| Spec | `measure-number-signed-decimal` |
| Type | `changes` (out-of-family change spec) |
| Branch | `AC-1679-Create-the-innovation-use-section` (**not merged** — 25 commits ahead of `origin/dev` at archive time) |
| Archived on | 2026-09-01 |
| Commits | 13 with the `[SPEC:changes/measure-number-signed-decimal]` prefix |
| Related | `docs/specs/archive/2026-08-26-innovation-use--details-page/` (amended by this spec); `docs/specs/innovation-use/family.md` → `FR-12` |

## 2. Original Spec Path

`docs/specs/changes/measure-number-signed-decimal/`

## 3. Archive Date

2026-09-01

## 4. Final Status

**Delivered.** 12/12 tasks implemented, each gated by an independent Reviewer (`author ≠ auditor`).
Verified end-to-end on Dev by a human. **57 of 65 acceptance items closed**; the 8 open are all
human-owned and **none is an implementation gap**.

| Gate | Result |
| --- | --- |
| Implementation | `T-01`…`T-12` complete |
| Independent review | Every task PASSed; `T-03`, `T-10` and `T-12` needed rework first (`T-12` twice) |
| Server suite | 355 suites / **2727** tests green |
| Fixtures | 17 suites / **90** tests green |
| Client suite | 317 suites / **6786** tests green |
| Type-check | client `tsc -p tsconfig.spec.json` — **934 = 934**, compared as a normalized **set**, not a total |
| Lint + build | both packages, exit `0` |
| Migrations | both applied to Dev by the user, 2026-09-01 |
| HITL | discharged on Dev in light theme |

## 5. Requirements Delivered

| Requirement | Delivered by |
| --- | --- |
| `R-MSD-001` signed decimals persist and round-trip (**AC.7** — untouched-row resave) | `T-02` transformer, `T-03` service, `T-05` migration |
| `R-MSD-002` the column stores scale 4 | `T-05` `bigint` → `DECIMAL(24,4)` |
| `R-MSD-003` spinner steps a whole unit, no clamp at `0` | `T-09`, `T-10` |
| `R-MSD-005` `0` is a value, never an absence; `null` stays `null` | `T-02` (`DD-2`), `T-11` read adapter |
| `R-MSD-006` the character-guard false positive is **pinned, not denied** | `T-09` + `T-12` (scales 1–4, amended on measured evidence) |
| `R-MSD-007` every other numeric field keeps its floor | `T-04` (six sibling fields), `T-12` (`R-IUP-008` amendment) |
| `R-MSD-010` OICR renders numbers unchanged | `T-06` view migration, `T-08` fixtures |
| `R-MSD-011` the API stops silently rounding | `T-03` per-role rule map |
| `R-MSD-012` scale domain `0…4` enforced as configuration error | `T-10` real `@Input` setter guard |
| `R-MSD-013` client bounds derived, not hardcoded | `T-11` `deriveMaxForScale` util |
| `NFR-MSD-003` quality floors hold | `T-12` full-suite verification |
| `NFR-MSD-004` visual gate | HITL, 2026-09-01 |
| `NFR-MSD-005` OICR tightening communicated | **open — accepted as follow-up** (§9) |

## 6. Files Changed Summary

**28 code files, +3,118 / −41.**

| Area | Key files |
| --- | --- |
| Server — entity | `result-quantification.entity.ts` (`quantificationNumberTransformer`, the spec's most load-bearing change) |
| Server — service | `result-quantifications.service.ts` (per-role rule map), `shared/global-dto/base-service.ts` (`dataRole` param — the only shared-file edit) |
| Server — DTO | `create-result-innovation-use.dto.ts` (range check **before** string conversion) |
| Server — migrations | `1787260000000-alterQuantificationNumberToDecimal.ts`, `1787270000000-normaliseQuantificationNumberInReportOicr.ts` |
| Server — fixtures | 4 files; 2 new (`oicr-quantification-save`, `report-oicr-number-rendering`) |
| Client | `input.component.ts` (`max` promoted to `@Input`), `quantification-item.component.ts` (4 inputs + scale guard), `innovation-use-details.component.ts` (bindings + read coercion), new `quantification-number-bound.util.ts` |

## 7. Test Evidence Summary

**No `test-report.md` — absence explicitly accepted.** This spec ran `/akili-execute`, not
`/akili-test`; its evidence is the per-task Reviewer verdicts and verification tables in
`execution.md`, which is a stronger record than a single report would have been (every attempt and
every FAIL is preserved). Final measured state is in §4.

`KZ-017` — what the suites structurally cannot reach: `npm test` uses `rootDir: "src"` and never runs
`test:e2e` or `test:integration`. Both were run post-close on 2026-09-01 and **both fail for reasons
proven unrelated** — `test:integration` refuses to run without `T13_MYSQL_PASSWORD` (another spec's,
and it declines a committed default credential); `test:e2e` crashes with a Nest DI `RangeError`
reproduced **identically** in a worktree at `eca8e68f`, before this spec's first code change.

## 8. Validation Summary

**No `validation-report.md` — absence explicitly accepted.** Validation was continuous rather than
terminal: 13 independent Reviewer gates during execution, plus Judgment Day's **4 rounds / 8 blind
judges / 92 findings** during specify (terminal state `ESCALATED` — accepted by the product owner,
not approved, with `design.md` authoritative wherever it and `requirements.md` disagree).

No unresolved FAIL findings. What execution caught that reading had not:

- a scale predicate rejecting **12.74%** of the legal 4-decimal grid (`Number.isInteger(v*10000)` is a floating-point trap)
- two of four mandated validation steps pinned by no test at all
- a migration whose retry path **certainly** failed on the spec's own prescribed backout
- a fixture passing against the wrong schema
- a guard admitting `null` and silently undoing `DD-12` (`null <= 4` is `true` in JS)
- `created_by` overwritten on every resave
- **four spec-text errors** found only by running the checks, including an in-range falsifier literal and a falsifier stated backwards

## 9. Accepted Warnings Or Follow-Ups

| Item | State |
| --- | --- |
| **`NFR-MSD-005` comms** | **Owed, not waived.** Risk measured: the OICR **UI cannot** send negatives or decimals (it passes neither `min` nor `maxFractionDigits`, taking the scale-0 defaults — `DD-4`/`DD-13`'s additive-defaults design), and **no internal integration touches quantifications** (`grep src/domain/tools/` → zero). Residual exposure is direct API callers, unenumerable from this repo. **Nothing has been sent.** |
| **`OQ-1`** | Open; gates `T-06`'s **merge**, not its implementation. Product owner. |
| **`BACKUP-1`** | **Live in a shared database.** The migration creates `result_quantifications_backup_1787260000000` — a full table copy — and nothing drops it. Deliberate (the backout path needs it) but unbounded. Dropping it removes the backout. |
| **`THEME-1`** *(new)* | `quantification-item.component.html` hardcodes `#F4F7F9`, `#E8EBED`, `#8D9299`, `#CF0808`, violating root `CLAUDE.md:145`. Origin `d2f6a15e` — the **previous** spec. Card is shared with OICR, so it renders theme-blind on both. Belongs with the app-wide light/dark work. |
| `AUDIT-1`, `OFGB-1`, `TESTFIX-1`, `STUB-1` | Ticketed in `tasks.md` §8. |
| `TS2552 SimpleChanges` | Pre-existing (`c0645b58`, inherited at component promotion); inside the 934 baseline on both sides. |
| Four sign-off roles | Open. **Security review and DevOps marked REQUIRED.** |
| **Production migration** | **Not applied.** A merge to `main` ships the code against a `bigint` column — the exact shape that `400`s on saving an untouched row. Must be sequenced *with* the deploy. |

## 10. Historical Notes

**Why this spec was hard.** The column is shared with OICR (roles 1 and 2). Three findings worth not
rediscovering:

1. `mysql2` returns `DECIMAL` as a **string** where `bigint` came back a number, and the page resends
   read values verbatim → `400` on saving an **untouched** row. Closed by a null-safe two-way
   transformer.
2. `quantification_number` is part of the upsert's **composite identity key**, so a read/write shape
   mismatch does not fail validation — it **deactivates the row and inserts a duplicate**, silently.
3. OICR's integrality was enforced by **nothing but the `bigint` type** — no validator on
   `UpdateOicrDto`, no `ValidationPipe` on its controller.

**The methodology lesson, and it is the durable one.** Decisions held under eight judges;
**propagation** across documents failed repeatedly. `T-12` — pure bookkeeping — took **two Reviewer
FAILs**, both for the same root cause in different clothes: *evidence that could not support the
claim made on it.* A sweep keyed on two literals co-occurring on one line was structurally blind to
every survivor that named the field without naming the requirement. Its seeded-survivor test used an
exact copy of the superseded sentence, in the file already being edited, so it proved only that
`grep` matches a literal. Its "fixed point" was the same command run twice against an unchanged tree
— a tautology. And a `grep -v "A|B|C"` pasted as evidence is a **BRE no-op**: the exclusion never
ran, so the number printed beneath it could not have come from that command.

**The fix that worked was structural, not diligence:** additive defaults, so fewer documents state
the decision at all — which is also why OICR survived untouched. See `judgment.md` and
`execution.md` → `### T-12` for the full trail.
