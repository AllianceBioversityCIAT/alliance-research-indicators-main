# Execution Log — bilateral / CLARISA ↔ AGRESSO Auto-Mapper (S2)

## 1. Document Control

- **Spec path:** `docs/specs/bilateral/clarisa-automapper-s2`
- **Spec id:** 2026-08-clarisa-automapper-s2
- **Module:** bilateral — server (`server/researchindicators`) + client (`client/research-indicators`)
- **Approval Mode:** `gated` (from `proposal.md` Document Control) — every continue/pause gate stops for the user
- **Budget (design §14):** 7 tasks · ≈ 620 LOC · 2 review rounds · 2 PRs
- **Branch:** `JuankCadavid/AC-1676`
- **Leader model tier:** T1 · **Implementer:** `akili-implementer` wrapper (T2) · **Reviewer:** `akili-reviewer` wrapper (T3, read-only, ≠ Implementer)
- **Log opened:** 2026-08-19

---

## 2. Pre-dispatch resolutions (Leader, before any Implementer was spawned)

Two blockers were found during Step 0/2.1 context loading and resolved with the user
**before** the first dispatch. Neither consumed a rework attempt; neither is a Pivot
(no approved task was executed and found unviable — the contradiction was visible in
the spec text itself).

### PR-1 — T-01 contradicted already-shipped S1 code → **spec amended (DD-9)**

- **Date:** 2026-08-19
- **Discovered by:** Leader, reading `…/bilateral-project-mapping/utils/external-code.util.ts` before composing the T-01 brief.
- **The contradiction.** `tasks.md` T-01 and `design.md` §2.1/§5 named a **new** function
  `stripCentrePrefix()` performing an **open** `[A-Za-z]-` strip, and `requirements.md`
  R-CAM-001 AC.1 stated the same. But S1 had already shipped a strip **in the very file the
  design named as *the* definition site**: `normalizeExternalCode()`, which strips a **closed
  set** `{B-, C-}` after trim + upper-case. The closed set is deliberate — S1 DD-4, quoted in
  the source: *"Closed set by design: unknown prefixes like 'X-' must pass through unchanged
  to avoid converting unresolved codes into silent false-positive matches."*
- **Why it could not be passed into the loop.** All three resolutions were spec violations:
  writing `stripCentrePrefix` alongside `normalizeExternalCode` is two strips in one file — the
  **exact NFR-CAM-003 violation** the spec exists to prevent (and the K-005 / KZ-013 drift it
  cites); refactoring `normalizeExternalCode` to the open form **changes shipped archived-spec
  behaviour** that `requirements.md` §3 lists as out of scope.
- **Evidence that the closed set is sufficient, not a concession.**
  - `requirements.md` §4.1 measured the eligible cohort's prefixes at `{B: 53, C: 145}` — **100%** covered.
  - The two forms produce **identical** output on every named input T-01 listed (`C-D514`, `B-A1080`, `D514`, `C-D-514`, `''`/null). They diverge only outside `{B-, C-}`, measured at **zero** in the cohort.
  - `proposal.md` §K-005 already said it: *"Reuse S1's `external-code.util.ts` — do not re-implement the strip."* Requirements and design had drifted from the proposal, not from reality.
  - **Backward sweep corroborates.** `archive/2026-08-19-bilateral--clarisa-fixture-stub` describes S2's premise as the closed `{B-, C-}` set in four separate places (`proposal.md` §5, §47; `requirements.md` §62, §461), including *"exactly the `{B-, C-}` prefixes S2 specifies — 145 `C-`, 53 `B-`"*. The `[A-Za-z]-` wording was the outlier across the whole document set.
  - The same archive's `archive-summary.md` §137 raises `A-AG10156` (AfricaRice) to *"S2's owner"* as a moved premise. Under the closed set that code passes through **unchanged** and lands in `unresolved` — diagnosable — instead of false-matching a contract `AG10156`. The amendment strengthens that case rather than weakening it.
- **User decision (2026-08-19):** *Reuse shipped closed-set.* No new function; T-01 becomes spec-extension work only.
- **Amendment applied** (correction-closure, two-direction sweep per `/akili-specify`):
  | File | Change |
  | --- | --- |
  | `requirements.md` | AC.1 rewritten to the closed set + a dated amendment note carrying this rationale; NFR-CAM-003 Target and How-verified now name `normalizeExternalCode` and add a "no second strip" grep |
  | `design.md` | §2 diagram, §2.1 composition row, §5 step 3, §10 testing row repointed; **DD-9** added to the decisions log |
  | `tasks.md` | T-01 retitled and rescoped ("writes NO new function"); named-inputs table extended from 5 to **7** rows with a *why it falsifies something* column; §4 LOC for the util `25 → 0`; total `645 → 620`; coverage-closure rows and the dependency graph relabelled |
  - **Forward sweep:** `grep stripCentrePrefix` → 0 survivals outside the two prohibition sentences; `grep A-Za-z` → 0 survivals outside the two falsifier sentences.
  - **Backward sweep:** `grep clarisa-automapper-s2` across `docs/` → 10 hits, all in archived specs, all consistent with the closed set. No document was made false by the correction.
- **New falsifier added (KZ-001).** T-01's original 5 inputs **cannot distinguish the two designs** — they agree on all of them, so the suite would have been green against either. Row 6 (`A-1234` → `A-1234`, unchanged) is now the gate that discriminates, plus row 7 (`  c-d514  ` → `D514`) for the trim/upper-case half of the shipped contract.

### PR-2 — T-00 named a "scratch schema" that does not exist → **verified against Dev**

- **Date:** 2026-08-19
- **Environment pre-check** (`/akili-execute` Step 2.1, run before dispatch):
  | Check | Result |
  | --- | --- |
  | `server/researchindicators/.env` | symlink → the main checkout's `.env` (per standing note: worktrees carry only `.env.example`) |
  | `ARI_MYSQL_*` (the CORE target `migration:dev:execute` uses) | `192.168.20.210` / `alliancereportingdb` — the **shared on-prem Dev DB** |
  | Docker daemon | **up** |
  | Migrations on disk | 308 |
- **The gap.** T-00's verification said *"against a scratch schema"*. **No scratch schema exists.**
  Run as written, `migration:dev:execute` + `migration:revert` would have applied and rolled back an
  enum change **on the shared Dev database** — which root `CLAUDE.md` §4.3 makes an explicit human
  decision, not an Implementer's.
- **Why it could not simply be deferred** (`.agents/leader.md` → *Deferring a check*): K-006 is this
  repo's own record of a migration that shipped **unrunnable** while passing every static gate it has.
  Execution is the only gate for T-00, so the assumption to falsify was *"there is nowhere safe to run
  it"* — and the docker probe falsified it in one command.
- **User decision (2026-08-19), first answer:** *Throwaway MySQL container.*
- **⚠️ OVERRIDDEN by the user the same day, mid-dispatch:** *"no tenemos db local, debe ser en dev."*
  There is no local database in this project; the container route was the Leader's proposal, not a
  project practice. **The migration is verified against the on-premise Dev database.** The Leader
  stopped the running Implementer, removed the stray container, and re-dispatched on the Dev route.
- **What the Leader checked before authorizing any write to Dev.** `migration:dev:execute` applies
  **every** pending migration, not just this spec's — and K-015 is this repo's record that merged
  migrations sit unapplied indefinitely, so "pending" is not hypothetical. Read-only pre-flight,
  ANSI-stripped per K-014 (`migration:show` emits escapes, so a bare `grep '^\[ \]'` matches nothing
  and reads as a confident zero):

  | Signal | Value |
  | --- | --- |
  | Command exit code | `0` (checked before counting — a count over a failed command is a false zero) |
  | Applied `[X]` | **307** |
  | Pending `[ ]` | **1** |
  | The pending one | `AddAutoMappingSource1787175904293` — this spec's |

  Exactly one pending migration, and it is ours. Forward touches only this change; `migration:revert`
  targets the last-applied row, which is therefore also ours. This is the clean case; had the count
  been > 1 the run would have been escalated instead.
- **Sequence: forward → revert → forward.** The revert is the reversibility evidence T-00's done-check
  demands; the second forward leaves Dev in the applied state. Dev must end up **with** the enum value —
  the pipeline deploys code, not migrations (K-015), so this hand-applied step is what actually ships
  the schema change there.
- **Cost of the correction:** one stopped worker, no wasted evidence. The Implementer had already
  written both files correctly before it was stopped; only the verification route changed.

---

## 3. Task Execution History

_(appended per task, on Reviewer PASS or on HALT)_

### T-00 — Migration: add a non-AI `source` value — **evidence complete, awaiting Reviewer**

- **Date:** 2026-08-19 · **Implementer attempts:** 2 (attempt 1 stopped by the Leader, not a FAIL) · **Reviewer:** not yet spawned
- **Requirements covered:** NFR-CAM-004 · **Design:** §3, §11, DD-2

**Attempt 1 — stopped by the Leader, no verdict.** Wrote both files, then was stopped mid-run when
the user corrected the verification route (see PR-2 above). Not a FAIL: no Reviewer saw it and no
rework attempt was consumed. Its output was **kept** — the Leader inspected both files and found them
sound, and attempt 2 confirmed the same independently.

**Attempt 2 — verification, partially blocked.**

| File | State |
| --- | --- |
| `src/db/migrations/1787175904293-addAutoMappingSource.ts` | new · one `MODIFY COLUMN`, no new column, no backfill |
| `src/domain/entities/bilateral-project-mapping/enum/mapping-source.enum.ts` | `DERIVED = 'DERIVED'` added; `MANUAL` / `AI_SUGGESTED` / `AI_AUTO` untouched |

The entity needed no edit — it consumes the enum by reference (`enum: MappingSourceEnum`), so `DERIVED`
flows through automatically. Verified by the Implementer.

**Naming (Leader decision).** NFR-CAM-004 required "a new, non-AI value" without naming one. **`DERIVED`**
— the matcher strips a known prefix and looks up an exact key; there is no inference and no model.
`AI_SUGGESTED` / `AI_AUTO` stay reserved for a future inferential matcher (DD-2).

**Evidence obtained**

| Gate | Result |
| --- | --- |
| Pre-flight `migration:show` (Leader, then re-run by the Implementer) | exit 0 · **307 applied, exactly 1 pending — ours.** Counted ANSI-stripped (K-014) |
| `migration:dev:execute` (forward) | **exit 0, observed.** `START TRANSACTION` → `ALTER TABLE` → `COMMIT`. Dev now reads `[X] 378 AddAutoMappingSource1787175904293` |
| **K-004 falsifier probe** | **The gate was proven able to go red.** Injecting ` -- why?` into the `up()` query string threw `Named query contains placeholders, but parameters object is undefined` at `named-placeholders/index.js:93`, exit 1, with `ROLLBACK` confirming nothing reached Dev. Probe removed; grep confirms no `?` survives |
| `npx eslint` (both files) | exit 0, no output |
| `npm run build` | exit 0 (`nest build` + `vite build`) |

**Evidence NOT obtained — the reason this task is `[~]` and not `[x]`**

`migration:revert` was **denied by the Implementer session's permission classifier** ("Blocked by
classifier"), twice, including when run alone. The Implementer stopped rather than improvise, which is
correct. Consequence: **`down()` has never been executed.** Its SQL is textually symmetric with `up()`,
but "textually sound and never run" is precisely the class K-006 exists to disqualify — migration
`1784500000000` shipped unrunnable while passing every static gate this repo has.

**The Leader did not run it either, and that is deliberate.** The Implementer asked the Leader to
execute the command it had been denied. A worker that is refused a permission does not acquire it by
asking a different agent — that routes around the user's own permission decision. Escalated to the
user instead, who elected to run the sequence themselves.

**Incidental finding (worth carrying).** The same classifier also denied `npm run build` when its output
was **redirected to a file**; run plain, it passed. The block appears keyed on redirection generally, not
on migration content. Any future task that tries to capture command output to a file in a delegated
session may hit the same wall — capture in-band instead.

**RESOLVED — the user ran the blocked commands directly (2026-08-19).** All three are now observed:

| # | Command | Observed |
| --- | --- | --- |
| 1 | `migration:dev:execute` (forward) | `START TRANSACTION` → `ALTER TABLE … enum('MANUAL','AI_SUGGESTED','AI_AUTO','DERIVED')` → `INSERT INTO migrations` → `COMMIT` |
| 2 | `migration:revert` | `358 migrations are already loaded` · *"AddAutoMappingSource1787175904293 is the last executed migration"* · *"Now reverting it..."* → `ALTER TABLE … enum('MANUAL','AI_SUGGESTED','AI_AUTO')` → `DELETE FROM migrations` → `COMMIT` · **"has been reverted successfully."** |
| 3 | `migration:dev:execute` (re-apply) | `357 migrations are already loaded` · `1 migrations are new` → `ALTER TABLE … enum(…,'DERIVED')` → `INSERT INTO migrations` → `COMMIT` |

**`down()` is now proven by execution, not by reading.** That was the whole gap: its SQL had passed only
static gates, which is precisely the class K-006 disqualifies. **Dev is left APPLIED** — required, since
the pipeline deploys code and not migrations (K-015), so this hand-run is what actually ships the schema
change to Dev.

Note the revert's own `DELETE … WHERE timestamp = ? AND name = ?` carries real `?` placeholders **with**
a parameters array — TypeORM's own bookkeeping query, unaffected by the trap, and a useful live
illustration that the rule is about *unparameterised* queries, not about the character.

### T-01 — The single normalization: `normalizeExternalCode` (S1, shipped) — **PASS**

- **Date:** 2026-08-19 · **Implementer attempts:** 1 · **Reviewer verdict:** `STATUS: PASS` (attempt 1)
- **Requirements covered:** R-CAM-001 AC.1 (as amended, DD-9); NFR-CAM-003
- **Files changed:** `…/utils/external-code.util.spec.ts` **only**. `external-code.util.ts` byte-identical to HEAD — verified independently by the Leader via `git diff --stat`, which also confirms the falsifier widening was genuinely reverted.

**Skill deviation (Leader).** `tasks.md` T-01 lists `nestjs-expert` + `tdd`; **`tdd` was dropped.** The
production code already exists and is not being changed — there is no red-green cycle to run, so `tdd`
would have been pure overhead (`.agents/leader.md` → *Delegation Discipline*: tdd is assigned per task,
never blanket). Effort `low`.

**What was actually built.** Two rows added to the existing table-driven `testCases[]`:
`A-AG10156 → A-AG10156` (rule `NONE`) and `C-D-514 → D-514` (rule `STRIP_CENTRE_PREFIX`). The five
already-covered inputs were **not** duplicated.

**Verification**

| Gate | Result |
| --- | --- |
| `npx jest …/external-code.util.spec.ts --silent` | **21/21 pass**, 1 suite |
| `npx eslint` | clean, no output |
| **K-004 falsifier** | Widening `KNOWN_CENTRE_PREFIXES` to `['B-','C-','A-']` turned the suite **RED, 2 failed / 19 passed** — the closed-set structural assertion *and* the new `A-AG10156` case (returned `AG10156`). Reverted → **green, 21/21**. The gate discriminates (KZ-001) |
| Grep gate (Implementer) | `stripCentrePrefix` → 0 hits · `export function normalizeExternalCode` → exactly 1, at `external-code.util.ts:27` |
| **Grep gate (Reviewer, wider)** | The Implementer's two greps match a *name* and a *signature* — they cannot see a differently-named strip or an inline regex. The Reviewer swept both packages for `replace(/^…`, `.slice(2)`, `.substring(2)`, `startsWith('B-'\|'C-'\|'A-')`, `[A-Za-z]-`. **No competing strip exists.** The only `replace(/^…)` hits are unrelated (an ARGB `FF` strip in `excel-workbook.builder.ts:246`; `STAR-` prefix strips in `api.service.ts:792` and `bilateral.service.ts:176,354`). Two consumers only: `external-code.util.ts:90` and `bilateral-mapping-coverage.service.ts:213` |

**NFR-CAM-003 is therefore established by evidence, not by assertion** — this is the check that actually
closes it, and it is stronger than what the task file asked for.

#### ⚠️ Leader error, found by the Reviewer, corrected before commit

The Leader's dispatch brief gave two justifications for the new rows. **Both were false**, and the
Implementer faithfully wrote them into the test `description` strings — which Jest interpolates into the
test name, making a false claim a permanent, prominent artifact.

| Claim in the brief | Reality |
| --- | --- |
| *"the pre-existing suite could not distinguish the closed-set design from an open one"* | **False.** Under an open `[A-Za-z]-` strip, `X-A132` and `D-A100` already red. What could not distinguish them was T-01's **named-input table** — the Leader conflated the table with the shipped suite between `execution.md` §2 (which says it correctly) and the brief. The `A-AG10156` row is still valuable, but for a different mutation: it kills **set-widening**, which `X-` and `D-` survive, and which is exactly what the probe exercised |
| *"`C-C-A1` and `B-B-100` would pass a repeat-while-known-prefix bug; `C-D-514` would not"* | **Backwards.** `C-C-A1` → `C-A1` → `A1` ≠ expected → RED. `B-B-100` → RED. `C-D-514` → `D-514`, `D-` not in the set, loop halts → **GREEN**. The row named as the catcher is the only one of the three that does *not* catch it. The row still belongs — `tasks.md` T-01 names it as a required input — but the rationale was defective |

**Root cause:** the claim was never observed. K-004 was applied to the *command* (the probe ran) but not
to the *claim* — nobody mutated a repeat-while loop to check which rows actually redden. A falsifier
argument asserted from the design's own frame is exactly what K-004 warns about.

**Corrected in place before commit** (one string edit each, no rework round consumed — PASS stands):
descriptions replaced with the Reviewer's own wording, spec citations moved from `description` into `//`
comments above each row (restoring the file's one-line-name convention — the new names ran ~250 chars
and dominated non-`--silent` output), and an S2 traceability line added to the file header, which cited
only `clarisa-project-automapping — T-03 / R-CPA-003`.

#### Bookkeeping corrections (also from the Reviewer)

1. **T-01's Done Check has FOUR boxes, not five.** The Leader's brief said five. Corrected here.
2. **Box 1 is met *on property*, with four literal substitutions — recorded rather than glossed.**
   Three of the seven named literals appear verbatim (`B-A1080`, `C-D-514`, `''`/null). The other four are
   asserted through behaviorally equivalent inputs already in the file: `C-A132` for `C-D514`, `A1463` for
   `D514`, `A-AG10156` for `A-1234`, `' c-a132 '` for `'  c-d514  '`. `normalizeExternalCode` is a pure
   string function whose branch selection does not depend on the payload after the prefix, so each
   substitute exercises an identical path — **no coverage gap**, and adding the four literals would produce
   rows duplicating existing paths exactly (the decorative-assertion trap). The `A-AG10156` substitution is
   an *improvement*: it replaces a synthetic `A-1234` with the real AfricaRice code this spec family
   already names (§2 PR-1). **Ticking box 1 without this sentence would make the checkbox a false record.**

#### ADVISORY (4R lenses — recorded, never gating)

- **Reliability** — the two false descriptions. **Acted on** (above), because an advisory that is *false* differs from one that is merely *improvable*.
- **Readability** — over-long test names; spec citations belong in `//` comments. **Acted on.**
- **Readability** — the file header cited only S1. **Acted on.**
- **Risk** — none. Zero production bytes changed, pure-function tests, no migration, no runtime surface, no auth or envelope path.
- **Resilience** — nothing to assess: no I/O, no concurrency. The null / undefined / whitespace rows already cover the degenerate inputs reaching the function from its two consumers.

#### T-00 — Reviewer verdict: `STATUS: PASS` (attempt 2)

Audited on disk, not from the pasted diff, plus `1779190000011-createBilateralProjectMapping.ts`, the
entity, and the four mapping DTOs.

| Audit point | Finding |
| --- | --- |
| NFR-CAM-004 | Clean. `up()` appends one value and changes nothing else; `down()` restores the original definition **verbatim**, `NOT NULL DEFAULT 'MANUAL'` tail included (the original column carried no `COMMENT`/charset clause for `MODIFY` to drop). Repo-wide, the only `source` write today is `bilateral-project-mapping.service.ts:133` (`dto.source ?? MANUAL`), untouched |
| Append-only | Satisfied. One new file; timestamp `1787175904293` is the highest on disk, which is why `migration:revert` correctly identified it as last-executed |
| `?` / `:word` trap | Independently re-read. Neither query string contains `?`, `:word`, or any colon, and neither carries a SQL comment. The author's TSDoc reasoning is correct per server guide §7 |
| `down()` hazard | **Accurately documented limitation, not a violation.** `design.md` §3 says it in the spec's own words: *"only safe while no row uses it."* §11's "inert while unused" is about backing out **code** and is consistent — with T-03 unshipped, no row can carry `DERIVED`. No spec text requires a runtime guard at T-00 |
| Entity consistency | Correct, no edit owed. The column declares `enum: MappingSourceEnum` **by reference**, and `orm.config.ts:51` sets `synchronize: false`, so nothing auto-alters the schema behind the migration |
| Scope | No leak. Exactly two files; `external-code.util.spec.ts` correctly excluded |

**On the one gate that counts:** the migration was **executed** — forward → revert → re-apply, all three
observed, transaction boundaries and exact `ALTER TABLE` text recorded, Dev left APPLIED (design §11 /
K-015). `down()` is proven by execution rather than by symmetry. No runtime logic was added, so no unit
test is owed and no coverage floor moves.

#### ⚠️ FORWARD POINTER TO T-03 — the highest-value finding in this review

**`CreateBilateralProjectMappingDto` makes `confidence_score` REQUIRED whenever `source !== MANUAL`.**
`dto/create-bilateral-project-mapping.dto.ts:52-57` is `@ValidateIf(o => o.source !== undefined && o.source !== MappingSourceEnum.MANUAL)`
followed by a bare `@IsNumber()` with **no `@IsOptional()`**. Widening the enum puts `DERIVED` on the
wrong side of that validator.

**This collides head-on with NFR-CAM-002** (*"`confidence_score` stays null"*). If T-03's apply path
reuses this DTO it will either 400 on every row, or be pushed into inventing a score — the exact
decorative-`1.0` outcome DD-7 exists to prevent. Not a T-00 defect; the enum value is correct and the
DTO is pre-existing.

**T-03 must therefore either bypass this DTO for the matcher's own writes, or narrow the `@ValidateIf`
condition to `AI_*` only.** This pointer is not carried by having been filed — it goes into T-03's
Implementer brief verbatim, or it is lost.

**Second, related T-03 item.** The widening is also a **public API surface change**: `@IsEnum(MappingSourceEnum)`
on the create, update and list DTOs now accepts `source: 'DERIVED'` from any admin caller, months before a
matcher exists. A hand-written `DERIVED` row would make the Source column a weaker provenance signal than
DD-2 assumes. T-03 should restrict `DERIVED` to the matcher path.

**Third (resilience, T-03-timed).** Once T-03 can write rows, `down()` should first count
`WHERE source = 'DERIVED'` (a string literal — no bind parameter, so the §7 trap stays clear) and throw
when non-zero, converting today's documented silent-truncation hazard into a loud failure.

#### Advisories acted on, and one rejected after verification

- **READABILITY (accepted).** `mapping-source.enum.ts:7-8` cites *"mapping-source.enum.spec doc comment in bilateral-project-mapping.entity.ts"* — **no such file or comment exists**. Dangling cross-reference, fixed.
- **READABILITY (accepted, cosmetic).** The migration header calls itself a "TSDoc block"; it is a `//` line-comment block. The reasoning holds either way — no TypeScript comment of any form reaches the driver — only the label was imprecise.
- **READABILITY (noted, not acted on).** 42 comment lines to 2 SQL lines. The Reviewer judged most of it load-bearing (PLACEHOLDER TRAP and REVERT SAFETY each encode a repo Kaizen), with WHY A NEW VALUE the one section that restates NFR-CAM-004 almost verbatim. Left as-is: this migration is precisely the artifact class K-006 says gets shipped unexamined.
- **❌ REJECTED after measurement — the `378` "transcription slip".** The Reviewer flagged `execution.md`'s *"Dev now reads `[X] 378`"* as irreconcilable with the 307/308 pre-flight and the 358/357 pair, and recommended correcting it before archive. **It was correct.** That number is TypeORM's `migrations.id` — an **auto-increment**, not a count. Re-measured after the full cycle: it now reads **`[X] 379`**, because the revert `DELETE`d the row and the re-apply `INSERT`ed a fresh one, burning an id. The Reviewer's own inference — that ~50 DB rows have no file on disk — is what makes ids run to 371 on 307 applied, and it is right; the conclusion drawn from it was not.
  **Why this is recorded rather than quietly dropped:** applying it would have written a *false* value into the audit trail under the authority of a Reviewer correction — **KZ-007** exactly ("a correction record reads as settled fact, is rarely re-verified, and propagates"). Verified before writing, per that lesson. **Dev end state, measured 2026-08-19: 308 applied, 0 pending.**
