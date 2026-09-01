# Next session — handoff

**Updated 2026-08-27, at the end of `/akili-execute`. All 12 tasks are IMPLEMENTED and reviewed.
The spec is NOT closed: two items require a human and cannot be done by an agent.**

> **Do not re-run `/akili-execute`.** There is no eligible task left. The previous version of this
> file said "ready to execute" and was stale for exactly one day — if anything here contradicts
> `tasks.md`'s status header or `execution.md`, those two win and this file is the one to fix.

---

## Where the spec stands

| | |
| --- | --- |
| Phase | `/akili-execute` **COMPLETE** — `T-01`…`T-12` all implemented, each gated by an independent Reviewer (`author ≠ auditor`) |
| Closure | ⚠️ **NOT closed.** 56 acceptance boxes ticked, 9 open — see below |
| Dev DB | **Migrations applied 2026-09-01** (user-reported). The HITL visual check is now actually performable — before this it could not pass, since the column was still `bigint` |
| Last commit | `de1d6b98` on `AC-1679-Create-the-innovation-use-section`. **Not pushed** — the user pushes |
| Audit trail | `execution.md` (~2,270 lines, append-only). Read the entry for a task, not the whole file |
| Binding condition | `design.md` is authoritative wherever it and `requirements.md` disagree |

---

## The two blocking items — both need a person, not an agent

### 1. HITL visual gate — `tasks.md:335` (`T-11` item 8, `DC-11` / `NFR-MSD-004`)

No automated substitute exists. Open an Innovation Use (indicator 6) result **in an editable
status** → `/result/:id/innovation-use-details` → *OTHER QUANTITATIVE MEASURES* → add a row.
Check in **both light and dark**:

- placeholder reads "Enter a number"
- `-12.75` survives entry: sign kept, not rounded, not clamped to `0`
- the spinner steps by a **whole unit** and does not stop at `0`
- `-549755813886.9999` trips the amber "Maximum reached" — **this is EXPECTED.** It is `RK-16`'s
  pinned false positive (`R-MSD-006` AC.3), deliberately not fixed. Judge legibility only.

**Two pre-existing defects live on that page. Do NOT file them as regressions of this spec:**
duplicate DOM id `minmax-buttons` on every number field, and no `<label for>` on the Number field.

### 2. Comms record — `tasks.md:358` (`T-12` item 3, `NFR-MSD-005` / `RK-12`)

The OICR API gets validation it never had: `UpdateOicrDto` previously enforced integrality through
**nothing but the `bigint` column type**. Consumers that were silently rounded will now get a `400`.
A draft message is in `execution.md` → `### T-12` → "Comms draft". It must name the **MEL/product
owner**, the **OICR reporting owner**, and any **partner-platform contact**, by name and date.
Tick the box only after it is actually sent.

---

## Also open (not blocking implementation)

- **`OQ-1`** — gates `T-06`'s **merge**, not its implementation (`tasks.md:204`).
- **Two `T-10` acceptance items** (`:277`, `:279`) left conservatively unticked; the reasoning is
  recorded in place.
- **Four sign-off roles** (`:469`–`:472`). Security review and DevOps are marked **REQUIRED**.
- **Five ticketed findings** in `§8`: `AUDIT-1`, `BACKUP-1`, `OFGB-1`, `TESTFIX-1`, `STUB-1`.
- **One out-of-scope defect found during `T-12`'s verification:** `TS2552 SimpleChanges` errors in
  `quantification-item.component.spec.ts` (it imports `SimpleChange`, singular). Pre-existing —
  `git blame` puts them at `c0645b58` under the file's old `oicr-details` path, inherited when the
  component was promoted to `shared/`. Inside the 934 `tsc` baseline on both sides.

---

## Migrations — APPLIED to the shared Dev database (2026-09-01)

**Reported by the user on 2026-09-01: both migrations have been applied to the shared Dev
database.** Not verified by an agent — no read-only confirmation was run at the time of writing, so
if you need certainty, check before relying on it:

```
npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts
```

(`migration:show` is **not** an npm script; its output carries ANSI escapes, so normalize before
counting — `K-014`. And check the raw output for an error before counting it: a count over a failed
command is a confident zero.)

**Two consequences of applying them, both live now:**

1. **`BACKUP-1` is now a real object in a shared database.** The first migration creates
   `result_quantifications_backup_1787260000000` — a **full copy** of `result_quantifications` — and
   **nothing ever drops it**. That is deliberate (the backout path in `design.md` §11 needs it) but
   unbounded: it will sit there until someone removes it. Confirmed present in the scratch schema by
   direct `information_schema` query on 2026-09-01; expect the same on Dev. **Decide explicitly when
   it goes**, and do not drop it until the change is confirmed good, because dropping it removes the
   backout path.
2. **`report_oicr` was recreated.** The second migration rebuilds the view. Recreating a view resets
   its definer; if anything depended on the previous `SQL SECURITY DEFINER` context, verify it still
   resolves.

**What remains unmeasured even now:** the `ALTER … ALGORITHM=COPY` has still never been *timed*
against a populated table, and the fixtures suite runs only against the disposable scratch schema
(`ari_scratch_test` @ `127.0.0.1:3307`), so no automated test in this repo has ever touched Dev's
actual data.

---

## Before merging — what the CI pipeline will NOT do

1. **The pipeline deploys code, not migrations** (`K-015`). Dev is done (see the section above),
   but **Production is not** — a merge to `main` deploys the code and leaves the column as
   `bigint`, which is the exact shape that produces a `400` on saving an untouched row. The
   Production migration is its own human-decided step, and it must be sequenced with the deploy,
   not after it.
2. **The migration needs strict `sql_mode`** to fail loudly rather than truncate. Dev was measured
   on 2026-08-27 at MySQL **8.0.45**, outside the spec's recorded 8.0.4–8.0.16 window (`OQ-D5`),
   and **without** `ONLY_FULL_GROUP_BY`.

---

## Verification baseline (re-measured by the Leader, in isolation, 2026-08-27)

Server **355/355** suites · **2727/2727** tests · fixtures **17/17, 90/90** · client **317/317** ·
**6786/6786** · both lints exit `0` · both builds exit `0` · client `tsc -p tsconfig.spec.json`
**934** errors.

**934 is a tripwire, not a gate.** Compare the *normalized error set* (positions stripped, sorted),
not the total — `934 = 934` can mask N new errors against N fixed. The method that works:
`git stash push -- <changed files>`, re-run, `diff` the two sorted sets.
