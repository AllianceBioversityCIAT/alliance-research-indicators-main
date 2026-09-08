# Dispatch Brief — PR 2 (T-05 → T-04 → T-06 → T-07)

**Role:** Implementer. **Host:** `agy` · **Model:** `gemini-3.7-flash-high` · **Auditor:** separate Claude Opus session.
**Working directory:** `/Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676`
**Branch:** `JuankCadavid/AC-1676` — do not branch, do not push.

**PR 1 is committed** (`7ea518b0`, `f8f99b66`, `d01f9481`, `36164be8`). Start from a clean tree. The 198-project cohort is already unblocked and verified against real CLARISA — **PR 2 does not fix a user-visible outage.** It removes a latent fragility and makes a false message honest.

**Read first:** `requirements.md` (R-PSP-004, R-PSP-005, R-PSP-006), `design.md` (§3, §5.1, §9, §12, D-PSP-5, D-PSP-6, D-PSP-10), `tasks.md` (T-04, T-05, T-06, T-07 only), and `execution.md` — the auditor verdicts name the failure pattern this brief is written against. `dispatch-pr1.md` §3 (Hard rules) is unchanged and binding.

**Skills:** `nestjs-expert`, `systematic-debugging`.

---

## 0. The pattern, after four rounds

Every defect found in PR 1 had one shape: **a verification scoped narrower than what it claimed to verify.**

| Round | The blind gate |
| --- | --- |
| T-01 | A comparison asserted but never run |
| T-02 | `grep "'Confirmed'"` — cannot match `'Confirmed,Pending'` |
| T-08 | `grep … src` — cannot see `test/`; three jest configs, one habitually run |
| (auditor) | `--include="*.ts"` — cannot see `.tsx`. **Two of the four were mine, not yours** |

So: for every claim, ask *what input would make this check fail?* If you cannot name one, the check is not evidence. Each task below names the mutation that must redden.

**Binding reporting rules:** claim only what you ran · `not run — <reason>` is acceptable, `None` in place of a substitution is not · **Deviations includes substitutions**, including changing a verification command (`--forceExit` counted, and was missed) · do not tick `tasks.md` checkboxes · do not write `PASS`.

---

## 1. ⚠️ The migration trap — read before writing a single line of SQL

`orm.config.ts:59` sets `extra.namedPlaceholders: true`. Every query is rewritten by `named-placeholders` first, whose pattern is `/(?:\?)|(?::(\d+|[a-zA-Z][a-zA-Z0-9_]*))/`. It skips quoted strings but **has no notion of SQL comments.**

So a bare `?` or a `:word` **inside a `--` or `/* */` comment** is consumed as a bind parameter. In a migration that passes no parameters, the call throws *"Named query contains placeholders, but parameters object is undefined"* **before MySQL ever parses it**.

**Rules:** in migration SQL comments, never write `?`, and never write `:` followed by a word. Drop the colon (`[SPEC bilateral/…]`) and end questions with a period. TSDoc blocks above the class are never sent to the driver and are safe.

**And this is the part that matters most:** migration `1784500000000` shipped **unrunnable from the day it was written**, passing every static gate the repo has — valid TypeScript, lint-clean, type-clean, reviewed — because the one property that matters (*does it run*) was measured by nothing. A static scanner was attempted and withdrawn (K-006).

**The only sound gate is running it. You cannot run it here** — see §2. Say so plainly rather than implying the migrations are verified.

---

## 2. What you must NOT do

- **Never run `migration:run` / `migration:execute` / `migration:dev:execute` / `migration:revert` against the configured database.** `ARI_MYSQL_HOST` points at `192.168.20.210` — the **shared, non-disposable Dev database**. Applying migrations there is a human decision (K-015), and the CI/CD pipeline does not do it either.
- **Never edit `.env`** (symlink into another checkout). `.env.example` is yours.
- No client package, no `admin/client/`, no re-touching anything from PR 1.
- Do not run `npm run lint` as a gate — it carries `--fix` (K-001). Use `npx eslint <path>`. `npx prettier --write` is fine as a fixer.

**Known, accepted gap — state it in your report, do not paper over it:** there is no scratch MySQL available in this environment (the T13 container on `127.0.0.1:33107` is down and `T13_MYSQL_PASSWORD` is unset). So T-05 and T-07 ship **type-checked and reviewed but never executed**. Record that under *What was not run*. A human applies and verifies them against a scratch schema before merge.

---

## 3. Order — strictly sequential, report after each

`T-05 → T-04 → T-06 → T-07`. T-06 depends on both T-04 and T-05. Report and stop after each task.

---

### T-05 — Migration: add `clarisa_external_code`

Spec: `tasks.md` T-05 · design §3, **D-PSP-10**.

Add `clarisa_external_code varchar(100) NULL` plus `idx_bpm_clarisa_external_code` to `bilateral_project_mapping`, and the matching column on the entity. **Schema only — no data written here** (template §5 keeps backfill separate).

- Generate with `npm run migration:generate -- ./src/db/migrations/addClarisaExternalCodeToBilateralProjectMapping`. **Generation may require a DB connection — if it does, hand-write the migration instead** rather than pointing tooling at Dev.
- Nullable is deliberate (**D-PSP-10**): `NOT NULL` would fail against existing rows and force the backfill inside the schema migration.
- Do **not** touch the MySQL generated column or the partial-unique index (D-PI-9).

**Named red input:** none runnable here (see §2). Instead, state explicitly that `up()`/`down()` are unexecuted, and confirm by inspection that `down()` drops both the index and the column.

**Verify:** `npx tsc --noEmit` · `npx eslint src/db/migrations src/domain/entities/bilateral-project-mapping` · grep your own SQL for `?` and `:word` inside comments.

---

### T-04 — `stale` as a third `mapping_status`

Spec: `tasks.md` T-04 · design §5.1 step 4.iii, §4, **D-PSP-5**.

Add `stale` to the `MappingStatus` union and return it from `resolveMappedProject`'s unresolvable-project branch, carrying the stored snapshot. Update Swagger for both endpoints.

- `stale` replaces `unmapped` **only** on the project-unresolvable branch. No-agreement and no-mapping-row keep `unmapped`.
- Both public methods inherit it through the T-01 seam — there is no second edit site. If you find yourself editing two places, stop: the seam has been bypassed.
- Widening the union is the enforcement mechanism (**D-PSP-5**): the compiler must enumerate every consumer. Do not add a boolean flag alongside it.

**Named red input:** a mapping row whose `clarisa_project_id` is absent from the feed must return `stale`, not `unmapped` — an assertion of `unmapped` must now fail.

**What disqualifies this evidence:** a test asserting only `mapping_status === 'stale'`. It must **also** assert the snapshot is present, or the branch could return `stale` with a null project and still pass.

**Verify:** `npm test -- --silent bilateral` · `npx tsc --noEmit` · `npx eslint src/domain/entities/bilateral`

---

### T-06 — Stable-key resolution, automapper write, coverage, drift log

Spec: `tasks.md` T-06 · design §5.1, §9, **D-PSP-6**.

Add `findProjectByExternalCode`; resolve stable key → id → `stale`; populate the key in `newDerivedRow`; count coverage via the key; emit the id-divergence warn.

- Normalization is `normalizeExternalCode` **only** — no second strip is written (NFR-CAM-003).
- **`AutomapperService` must keep injecting exactly `ClarisaProjectsService` + `DataSource`.** A new constructor dependency re-introduces the REQUEST-scope cascade its own module header bans (NFR-BAS-001). The value you need is already on the candidate.
- `clarisa_project_id` stays stored and returned — it is the drift signal, not dead weight (**D-PSP-6**).

**Named red input:** a row whose stable key matches no project in the feed must return `stale` — never a fuzzy or prefix-widened match. Add `X-A1676` as a key and assert it does **not** resolve to `A1676`.

**NFR-PSP-002 — capture the before-value first.** A post-only reading cannot detect a regression. Dev coverage is currently **`mapped: 195 / pending: 3 / reachable: 198`** (measured 2026-08-20 against real CLARISA). It must not regress.

**What disqualifies this evidence:** measuring coverage while anything else heavy runs. That yields a *wrong* number, not a slow one (root guide §4.3).

**Verify:** `npm test -- --silent bilateral` · `npx tsc --noEmit` · `npx eslint src/domain/entities/bilateral src/domain/entities/bilateral-project-mapping src/domain/tools/clarisa/projects`

---

### T-07 — Migration: backfill `clarisa_external_code`

Spec: `tasks.md` T-07 · design §3, §12.

Populate the column for existing rows from `agresso_agreement_id`. **Separate file from T-05.**

- Idempotent: `WHERE clarisa_external_code IS NULL`.
- Must not write `updated_at`, `updated_by`, or any other column.
- **§1's placeholder trap applies here too** — this migration carries more SQL than T-05.

**A-3 — re-measure, do not assume.** The archived M-17 ("170/170 stripped codes match") was measured on a different date over a different population. It is *evidence for the approach*, not a fact about today's 199 rows. Confirm the `agreement_id` ⇒ `external_code` equivalence over current data **by a read-only query** before writing the backfill.

**Named red input:** a row whose `agresso_agreement_id` carries surrounding whitespace or lower case — the backfill must still normalize it, and a unit test with such a row must redden an unnormalized implementation.

**What disqualifies this evidence:** a matching row count. Counts match by coincidence. The pass condition is a before/after snapshot of `id`, `created_at`, `updated_at`, `clarisa_project_id`, `source` — **diffed explicitly** — showing `clarisa_external_code` as the only column that moved. Since you cannot execute the migration here, write that comparison as the documented verification procedure for whoever runs it, and mark it `not run`.

**Verify:** `npx tsc --noEmit` · `npx eslint src/db/migrations` · grep your SQL comments for `?` and `:word`

---

## 4. Reporting

Append one `execution.md` block per task in the established format, including **Deviations** and **What I could not verify**. Then report:

1. Task id and one-line outcome
2. Files changed
3. Every mutation's red output, verbatim, **including the `Test Suites:` / `Tests:` totals line**
4. Green results
5. Deviations (substitutions count) and everything not run — **the two migrations belong here every time**

Then stop and wait.

If a premise in this brief turns out to be false — the seam does not exist where described, `AutomapperService` cannot be extended without a new dependency, the normalization util does not do what §T-06 says — **stop and report.** A worker that surfaces a broken premise is doing its job. Silence is recorded as a runtime failure.
