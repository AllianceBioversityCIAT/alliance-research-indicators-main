# Archive Summary — Bilateral / Primary vs Contributing Science Programs

## Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bilateral/primary-contributing-sp/` |
| **Archive date** | 2026-08-13 |
| **Module** | bilateral |
| **Spec id** | `2026-08-primary-contributing-sp` |
| **Chunk** | **C2** of the `mapping-adjustments` splitter (C1 delivered & archived; C3/C4 descoped by PM) |
| **Owner** | Juan Carlos Cadavid |
| **Final status** | **DELIVERED** — 16 of 16 tasks executed; T-02 remains `[~]` with one item dischargeable only by a deploy |

---

## Final Status

| Metric | Value |
| --- | --- |
| Tasks executed | **16 of 16** |
| Tasks fully closed | 15 (`[x]`) · **T-02 `[~]`** — see *Accepted Warnings* |
| Commits | 7 `[SPEC:…]` commits (`77f7e4f8` → `da2e0df7`) |
| Reviewer FAIL verdicts | **3** (T-08, T-13, T-16) |
| Rework attempts consumed | **2 of 3 × 16** — one on T-08, two on T-16; every other task passed on attempt 1 |
| HALTs / FATAL_FAILs | **0** |
| Pivot Records | **2**, both user-approved (T-07's unsatisfiable done-criterion; R-BIL-125 AC.2's read-back half reassigned to T-08) |
| Server suite | **2105 / 2105** unit + **9 / 9** integration |
| Client suite | **307 / 307** suites, **6267 / 6267** tests (baseline was 6242) |

---

## Requirements Delivered

| Requirement | Delivered by |
| --- | --- |
| **R-BIL-120** — no per-row role on the write wire | T-03, T-08 |
| **R-BIL-121** AC.1/AC.2 — exactly one Primary, resolution rules | T-02, T-06 |
| **R-BIL-121** AC.3/AC.4 — DB invariant enforced by index | T-02 + **T-13** (automated) |
| **R-BIL-122** (NFR) — GET adds no query round-trip | T-08, T-09 |
| **R-BIL-123** — role on the read wire, `selected_levers` unchanged | T-08, T-09 |
| **R-BIL-124** — ToC alignment restricted to the Primary | T-07 |
| **R-BIL-125** — non-Primary ToC rows retained, not nulled | T-07, T-12 |
| **R-BIL-126** — legacy `role: null` + read-only passthrough | T-08, T-13, T-16 |
| **R-BIL-127** — client Primary selector (AC.1–AC.6) | T-14, T-16 |
| **R-BIL-128** — ToC block gated to the Primary | T-15, T-16 |
| **R-BIL-129** — read-only orphan summary | T-15, T-16 |
| **R-BIL-130** — version gate precedes Primary validation | T-04, T-11 |

**Deferred by design:** **A7** — `requirements.md` OQ-1 had no answer in the repository.

---

## Files Changed Summary

| Area | Files |
| --- | --- |
| **Migration** | `1786636994078-addSpRoleToAlignmentSp.ts` — `sp_role` + a **STORED GENERATED** `active_primary_alignment` + `idx_rpfas_active_primary` |
| **Server domain** | `bilateral.service.ts` (role resolution, ToC restriction, audit payload), `result-pool-funding-alignment.repository.ts` (`sp_roles` carrier on the existing LEFT JOIN), `update-pool-funding-alignment.dto.ts`, `sp-role.type.ts` (new) |
| **Server tests** | `result-pool-funding-alignment.repository.spec.ts` (new — 0 % → 94 %), 5 re-based bilateral spec files, **`test/bilateral-primary-contributing-sp.integration-spec.ts`** + `test/support/` (new, real-MySQL) |
| **Client** | `pool-funding-alignment.component.{ts,html,scss}`, `pool-funding-alignment.interface.ts`, `shared/services/bilateral.service.ts` |
| **Client tests** | `pool-funding-alignment.component.spec.ts` (+542/−51), `bilateral.service.spec.ts` (+97), 2 `TS1005` repairs |
| **Docs** | `docs/ux-ui/design.md` §12.2 decision entry |

---

## Test Evidence Summary

| Gate | Result |
| --- | --- |
| Server unit | 2105 / 2105 |
| Server integration (real MySQL 8.0.45) | 9 / 9, three consecutive runs agreeing |
| Client suites | 307 / 307 · 6267 tests |
| `npx tsc -p tsconfig.json --noEmit` (server) | clean |
| `npx tsc -p tsconfig.spec.json --noEmit` (client) | **945 — a real baseline, established by this spec** |
| `npm run build` (client) | exit 0 |
| Branch coverage, `pool-funding-alignment.component.ts` | 82.68 % → 58.59 % → **83.26 %** (pre-T-14 → pre-T-16 → final) |

**The strongest evidence this spec produced was adversarial, not green:**

- **T-13's suite was proven to be evidence rather than theatre** — the Reviewer stopped the MySQL container and re-ran: 9/9 red, `ECONNREFUSED`, no skip, no fallback. It then mutation-tested the generation-expression matchers: green on the correct DDL, 3/4 red on the `CONCAT` trap.
- **The trap gate is not the obvious test.** "Second active `PRIMARY` rejected" stays **green** under the `CONCAT` trap. The gate is "N active `CONTRIBUTING` accepted" — exactly what `design.md` §3.1 warns about, now proven rather than assumed.
- **T-16's two defects were found by deleting code and watching the suite stay green.** See *Historical Notes*.

---

## Validation Summary

**`/akili-test` and `/akili-validate` were NOT run. Their absence is an explicitly accepted risk** (user decision, 2026-08-13, at the archive readiness gate).

**Reasoning recorded at acceptance:** in this spec the tests *were* the tasks — T-09, T-11, T-12, T-13 and T-16 are test-authoring tasks, each independently audited under `author ≠ auditor`, with **executed sabotage** in T-13 and T-16. Roughly 21 review rounds ran across the spec.

**What is therefore genuinely missing, stated plainly:** the one **cross-cutting** pass. Every Reviewer audited a single task's diff; nobody audited requirement-by-requirement conformance over the finished whole. This summary must not be read as claiming validation coverage it does not have.

---

## Accepted Warnings Or Follow-Ups

### Owed post-deploy — the only thing blocking T-02 from `[x]`

**NFR-BIL-120** (row count + checksum preserved over seeded data) cannot be verified from a workstation: it needs the migration applied over production-shaped data, which in this project's topology happens only via a DevOps branch push (`docs/infrastructure.md` §3.2). Run **after** CI/CD applies the migration to `dev`:

```sql
SELECT COUNT(*) FROM result_pool_funding_alignment_sp;
SELECT column_name, generation_expression
  FROM information_schema.columns
 WHERE table_name = 'result_pool_funding_alignment_sp'
   AND column_name = 'active_primary_alignment';
-- expect: if(((`is_active` = 1) and (`sp_role` = _utf8mb4'PRIMARY')),`alignment_id`,NULL)
SELECT COUNT(*) FROM information_schema.statistics
 WHERE table_name = 'result_pool_funding_alignment_sp'
   AND index_name = 'idx_rpfas_active_primary' AND non_unique = 0;
```

Also owed: the **`is_read_only` half of R-BIL-126 AC.3**. Its current test re-reads a *mocked* context and structurally cannot fail for any DB reason.

### Unowned on exit — these leave the spec with no assignee

| # | Item | Why it matters |
| --- | --- | --- |
| **U-1** | **Version-lock stranding.** Version-locked + deselect the Primary's SP → Primary cleared → save blocked → the control is disabled, so it cannot be re-chosen. Recovery is a reload. | A **requirements contradiction**, not a code defect: R-BIL-127 **AC.4** mandates the re-block and **AC.5** the disable; together they mandate the trap. Recorded in `docs/ux-ui/design.md` §12.2 as an OPEN BEHAVIOR with only a *suggested* mitigation. |
| **U-2** | **Dark-mode contrast.** `pool-funding-alignment.component.html:5` carries a hardcoded `bg-[#fcfcfc]` with no dark variant; token foregrounds compute to ~1.6:1 against PRD line 273's 4.5:1 floor. | Pre-existing — but **AC.6's non-colour cue now depends on those badges reading**, so a cosmetic bug became load-bearing. |
| **U-3** | **The migration chain cannot build a database from scratch.** It dies at migration **84** on `sec_template`, a table with **no DDL anywhere in version control**, while 15+ later migrations write to it. | A standing **disaster-recovery gap**. T-13 is the first task in this spec to have proven it empirically. → `/akili-propose`. |
| **U-4** | **AC.6 is NOT discharged.** No test here proves the two roles *read* as visually distinct, and the canonical mockups the 2026-05-24 decision makes authoritative **do not exist**. | D-5 has neither an automated gate nor its intended human reference. **The visual treatment must not be described downstream as approved.** |

### Advisory, recorded and not blocking

- The dead `: []` branch at `pool-funding-alignment.component.ts:724-726`: unreachable today, but ~400 lines from its guard. Any future relaxation of `canSave`'s Primary clause starts emitting `toc_alignments: []`, which is **truthy** at the server's version gate (`bilateral.service.ts:703`) and fires a spurious `409` on a save carrying no ToC intent.
- Three uncovered Primary-path branches: `:497`, `:283`, `:318`.
- `contributingSps` is asserted but consumed by no template.

---

## Historical Notes

### The highest-value catch of the run

**T-16 passed every gate on attempt 2.** The Reviewer then deleted one line — `isDirty()`'s Primary clause at `pool-funding-alignment.component.ts:360` — and ran the suite: **108/108 GREEN**.

That clause is what makes a Primary-only change dirty, and therefore saveable at all. Without it, a contributor who opens a saved alignment and changes **only** the Primary finds Save disabled and the change impossible to save. It is R-BIL-127 AC.2's own scenario, and **it would have shipped under a fully green suite** — every existing payload test set `primary_sp_code` alongside another dirtying edit, so the clause was never the sole cause of dirtiness in any fixture.

The same review found AC.4's "re-blocks save" assertion was a **tautology**: `canSave()` was already `false` before the deselect, so deleting all of AC.4's clearing logic would have left it green.

### Three mandated gates that could not fail for the reason they were mandated

This spec found a **family**, of which K-001 was only the first member:

| # | Gate | Why it could not fail |
| --- | --- | --- |
| 1 | `npm run lint` (K-001, inherited from C1) | It is `eslint --fix` — it makes the thing it checks true |
| 2 | `npm run build` for spec files | `tsconfig.build.json` excludes `**/*spec.ts` — it type-checks **zero** of them |
| 3 | `npx tsc -p tsconfig.spec.json --noEmit` | Two pre-existing `TS1005` **syntax** errors aborted the parse, suppressing semantic diagnostics across ~1300 files: the gate reported **3** errors where **945** existed |

**Gate 3 was repaired by T-16** and now functions for every future task in this repo.

### A confident negative asserted without the grep that would settle it — six times

`requirements.md:15`'s backfill phrase · `CLAUDE.md`'s CodeGraph path · T-08's Seam 1 premise · T-13's own `TEST`-datasource premise · T-13's *"no migration creates `results`"* · and a T-16 comment declaring a gap open **in the same diff that closed it**. Every one was caught by an independent reader, never by the author. This is K-003's recurrence, and it is why the archive sweep exists.

### Seam 1 closed as VOID, not discharged

T-08's review asserted that `user` feeds the eligibility computation. **It does not** — `getAlignment`'s third parameter is `_user` and is never read; eligibility is keyed on `resultId`. And because `updateAlignment` *returns `getAlignment`'s own output*, T-13's `toEqual` is a **determinism check**, not an independent GET-vs-PATCH proof. **R-BIL-123 AC.2 was structurally discharged by construction all along.**

### Estimates were the defective artifact, twice

T-13 shipped **894** lines against ~180; T-16 **739** against ~400. Both breaches were reviewed and **accepted with reasoning**, not absorbed silently: T-16's estimate was written *before T-14 and T-15 existed*, so it could not contain 31 red-test repairs, 13 fixture literals, or four obligations assigned by later reviews.

### What went right, worth preserving

- **`author ≠ auditor` was again the load-bearing control.** Every defect that mattered — the `isDirty` clause, the AC.4 tautology, the false `results` claim, the AC.2 fixture gap — was found by a reader who had not written the code.
- **Sabotage beat inspection.** Where a report said "verified by inspection", the next Reviewer executed the sabotage and twice found the inspection had been optimistic. *Executed* sabotage became the standard by the end of the run.
- **Two Pivots cost zero rework attempts**, as designed.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
