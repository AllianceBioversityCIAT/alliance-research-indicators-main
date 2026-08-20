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

### T-02 — Resolution, ambiguity, and the environment guard — **rework in progress**

- **Date:** 2026-08-19 · **Effort:** `high` (Leader raised it from the task file's `M`), bumped to `xhigh` for attempt 2
- **Requirements:** R-CAM-001 (both scenarios, AC.1–AC.4); NFR-CAM-001
- **Files:** `automapper.service.ts` (new), `automapper.service.spec.ts` (new), `bilateral-project-mapping.module.ts` (provider + export)

#### Leader constraints issued before dispatch — the design document is wrong on one point

`design.md` §2 says the service *"reuses ClarisaProjectsService + AgressoContract repository"*. **Taken
literally that breaks the module.** `bilateral-project-mapping.module.ts`'s own header forbids it:
*"Do NOT import AgressoContractModule or provide AgressoContractRepository (DD-11)"* — that repository
carries `Scope.REQUEST` via `CurrentUserUtil`, and injecting it cascades REQUEST scope through the module,
re-introducing the DI cycle NFR-BAS-001 exists to prevent.

**Not escalated as a Pivot**, because a sanctioned route already ships in the same folder:
`bilateral-mapping-coverage.service.ts` reads AGRESSO via `DataSource.getRepository(AgressoContract)`,
injecting only `DataSource`. That file was given as the exemplar **for DI shape and QueryBuilder usage
only**, with an explicit warning that its *iteration direction* (contract-first) is the framing this spec
replaced. Reviewer confirmed the resulting code is project-first end to end.

#### Attempt 1 — Reviewer verdict `STATUS: FAIL` (1 issue)

**Confirmed correct and not re-opened:** project-first iteration · AC.4 (the only contract column selected
is `agreement_id`; `clarisaProjectFullName` is written and never read — the display passthrough R-5
requires) · NFR-CAM-003 (one import, one call site, no second strip) · module registration with no
REQUEST-scope leak · synthetic 198 fixture, D-7 compliant · **all three Implementer judgment calls ruled
sound and kept** (`is_active` filter, blank-id bypass of grouping, `UnprocessableEntityException`).

**The FAIL — two equality rules for one comparison.**

| Side | Rule applied |
| --- | --- |
| SQL — `contract.agreement_id IN (:...ids)` | `utf8mb4_unicode_520_ci`: **case-insensitive and PAD SPACE**. Matches a stored `d514` *and* a stored `'D514 '` |
| JS — `found.has(candidate.derivedContractId)` | **exact**, against a value already `trim().toUpperCase()`d by `normalizeExternalCode` |

The database confirms the contract exists; the JS check then discards that confirmation and routes the
project to `unresolved`. **False negatives only** — nothing is written incorrectly, a preview simply
under-reports. It violates R-CAM-001's *"proposes a mapping only after confirming that contract exists"*
(the confirmation is performed and thrown away) and, contrapositively, the unresolved scenario's own
precondition. Structurally it is NFR-CAM-003's failure mode in miniature: **normalization applied to one
side of a comparison and not the other** (K-005, KZ-013).

**The suite could not see it.** Every contract fixture was already upper-case and unpadded — KZ-001's
shape, now at recurrence 7 on this codebase.

**Remediation is one line** (`c.agreement_id?.trim().toUpperCase()`), explicitly **not**
`normalizeExternalCode` on the AGRESSO side: that would also strip a leading `B-`/`C-` from contract ids,
widening the match to the coverage service's tier-2 semantics, which no requirement asks for.

#### On the two Leader hypotheses raised at dispatch

Both were stated to the Reviewer **as hypotheses to verify or refute**, deliberately — the Leader shipped
two falsifier arguments in T-01's brief the same day and both were false, one exactly backwards.

- **H1 (case/whitespace asymmetry) — CONFIRMED.** It is the FAIL above.
- **H2 (`clarisaProjectId: p.id` unchecked coercion) — REFUTED.** `ClarisaProject.id` is declared `number`;
  the assignment is `number → number`. The coverage service's `Number(p.id)` is defensive against wire
  data, not evidence of a wider declared type. The Leader resolved this independently by reading the type
  before the Reviewer reported.
- **The K-002 worry behind H2 is also closed, and by a mechanism the Leader had not accounted for.** The
  Leader forbade `npm run build` to avoid a concurrent-run collision, and then worried aloud that `tsc`
  had therefore never seen the file. The Reviewer found `package.json:126-128` runs **ts-jest in default
  (diagnostics-on) mode** — so the jest run *did* type-check the service, and a type error would have
  surfaced as a suite failure. An isolated `npm run build` is still owed at the measurement window, but
  this was never an open K-002 hole.

#### Rework dispatched (attempt 2, effort `xhigh`)

Reviewer report passed **verbatim** (Structured Feedback rule) plus an attempt history naming what already
passed, so the fix does not churn the parts that were right. Three items folded in, all of them
**corrections to T-02's own output rather than new scope**:

- **The fix**, with a mandatory order of operations: write the `' d514 '` fixture test **first**, observe it RED against unfixed code, *then* apply the one-line normalization. A fix landed before its test is a fix with no evidence.
- **Rename `toCreate` → `resolved`.** Design §4 uses `toCreate` for the **final** bucket produced after §5 step 6. T-02's is produced after step 5 and is a strict *superset* — it still contains what step 6 will classify `alreadyMapped`, `divergent` and `supersede`. A T-03 apply path that iterates `resolution.toCreate` and inserts duplicates already-mapped rows and overwrites `MANUAL` divergences: **D-3 and D-2, the two highest-severity classes in requirements §7.** The header comment documented this correctly, but a comment is a weak guard against a name that reads as an instruction.
- **Delete a test that measures nothing.** `spec.ts:110-116` was `expect(true).toBe(true)` under the name *"proves the fixture is discriminating…"*. The property **is** covered — by the `unresolved` and `ambiguous` blocks — but this test asserted a proof in its Jest output line while measuring nothing. Same class as T-01's two false descriptions. Text moved to a `//` comment where it is true.
- **Assert the `is_active` filter**, which no test covered: deleting the `andWhere` from the service reddened nothing.

**Advisories recorded and closed here, deliberately NOT turned into work** (the advisory-never-grows-scope
rule — a task not in the approved `tasks.md` is scope nobody approved):

- **Unbounded `IN` list.** 198 ids is nothing, but the cohort denominator moved 299 → 377 → 911 in five days (RB-2). At a few thousand ids this risks `max_allowed_packet` and a planner regression. Chunking costs ~6 lines. **Not needed today**; if it ever is, it is a proposal, not a T-02 edit.
- **Forward pointer to T-06.** A project with no `external_code` reaches `unresolved` with `derivedContractId: ''` — honest in the service, but design §6.2 says *"`unresolved` shows the derived contract id"*, and an empty cell reads as missing data. **T-06 must render an explicit "no external_code"**, not nothing. This pointer goes into T-06's brief or it is lost.
- **Spec clarification owed (one line).** §4.2's "198/198 resolve" does not state whether the probe filtered `is_active`. If it did not, a live run may come in **under** 198 for a reason that is correct behaviour, not a regression. Worth stating so the next reader does not read the gap as a defect.
- Related and ruled **right**: the service deliberately does **not** filter `funding_type`. §4.2's matched set is `BLR 168 · W3R 30`, and the coverage service's `BLR/BILATERAL` filter would have silently dropped the 30 `W3R` matches.

#### T-02 — attempt 2: Reviewer verdict `STATUS: PASS`

**The fix, and why it cannot introduce the mirror bug.** `c.agreement_id?.trim().toUpperCase()` closes both
halves. The Leader asked the Reviewer specifically whether normalizing the DB side could now collapse two
distinct contracts into one key — the symmetric failure. It cannot, and the reason is structural rather
than probabilistic: **`agreement_id` is the PRIMARY KEY, and the unique index enforces the column's
collation.** Under `utf8mb4_unicode_520_ci` PAD SPACE, `'D514'`, `'d514'` and `'D514 '` **are the same
key** — MySQL will not let two such rows coexist, so there is nothing to collapse. Leading space is the
one variant the collation treats as distinct, and it is inert twice over: the `IN` list carries only
trimmed ids so such a row can never be returned, and the output's `derivedContractId` always comes from
the **project** side — no contract row is ever carried into `AutomapperCandidate`. **The Set is a
membership filter, not a join.**

**The fix is provably narrowing-only.** The Set is built from rows SQL *already returned*, so this side can
only stop discarding confirmations; it can never admit a contract the database did not match.

**NFR-CAM-003 re-checked explicitly**, since a later reader may raise it: `.trim().toUpperCase()` is **not**
a second normalization in the sense the NFR governs. That NFR's target and gate are both about the *prefix
strip*; no strip is defined here, `normalizeExternalCode` still has exactly one call site, and the
identical `.trim().toUpperCase()` already ships at `bilateral-mapping-coverage.service.ts:173` under S1's
review. The inline comment records why the util was deliberately **not** used on the AGRESSO side — doing
so would strip a leading `B-`/`C-` from contract ids and widen the match to the coverage service's tier-2
semantics, which no requirement asks for.

**The new fixture is conjunctive** — it reds if *either* `trim()` or `toUpperCase()` is dropped. One
fixture guards both halves. Test arithmetic corroborates the report independently: 11 `it()` blocks, one
deleted and one added against attempt 1's 11.

**Residual, non-gating and recorded:** `_unicode_520_ci` is accent-insensitive, so SQL could in principle
return a row differing by a diacritic that `toUpperCase()` will not fold — a false *negative*, same
direction as the original bug, and irrelevant for ASCII-alphanumeric agreement ids. No accent fold added.

**Third false test-artifact comment of the day, corrected.** The new test's comment claimed the SQL side is
*"case- and trailing-space-insensitive"* and then used `' d514 '` — with a **leading** space, which PAD
SPACE does **not** forgive, so *"SQL would confirm this contract exists"* was not true of that fixture.
**The fixture was kept** (the Reviewer noted it is a superset of the reachable case and guards both halves)
and only the prose was corrected: the comment now distinguishes what the collation forgives from what the
fixture additionally exercises on the JS side. Two such comments were corrected in T-01; this pattern —
*plausible reasoning written into a durable artifact without being observed* — is the one recurring defect
of this run, and it has been caught by the Reviewer every time, never by the author.

**Leader's full-suite measurement, taken in the quiet window after every worker reported (§4.3):**

| Gate | Result |
| --- | --- |
| `npm test -- --silent` (whole server package) | **330 suites / 2365 tests, all passing** · 134.7 s |
| `npm run build` | **exit 0**, `dist/domain/entities/bilateral-project-mapping/automapper.service.js` emitted |

That build closes the `tsc` gap the Leader created by forbidding workers to run it — and confirms the
Reviewer's finding that ts-jest's diagnostics-on mode had already been type-checking the file all along.

**Final status: PASS on attempt 2 of 3.** One rework round consumed of the design §14 budget's two.

### T-03 — Classification, apply, and supersession — **rework in progress (attempt 2 of 3)**

- **Date:** 2026-08-19/20 · **Effort:** `xhigh` · **Requirements:** R-CAM-003, R-CAM-005, R-CAM-002 (idempotency + AC.2), NFR-CAM-002, NFR-CAM-004

**Effort note.** The dial says correctness-critical work deserves `max`, and this is the only task in the
spec that writes. But "never `max` a cheaper tier — escalate the tier instead", and escalating the
Implementer to the Reviewer's model would collapse `author ≠ auditor`. Resolved as `xhigh` on T2,
compensated by naming all four traps explicitly in the brief and by requiring **observed** falsifiers.

**TRAP 1 (the T-00 forward pointer) resolved — option (a).** `classify()`/`apply()` never construct
`CreateBilateralProjectMappingDto`; they write entities directly. Reviewer verified two ways: the DTO
appears in the service only inside comments, and class-validator decorators are evaluated by the HTTP
`ValidationPipe`, not by `repo.create()`/`save()`. The admin-facing contract is untouched and
NFR-CAM-002's `null` survives. **Carrying that pointer into the brief is what prevented this** — the
natural failure would have been a 400 per row, and the natural "fix" a constant `1.0`, which is exactly
what DD-7 exists to prevent.

#### Attempt 1 — Reviewer verdict `STATUS: FAIL` (1 gating issue, **test-only**)

Everything else cleared, and several points were verified rather than assumed:

| Point | Finding |
| --- | --- |
| R-CAM-003 MANUAL immutability | A **real** field-by-field snapshot, not a presence assertion — and backed by a stronger proof: `update`, `create` and `save` are the only write calls in `apply()` and all three are asserted `not.toHaveBeenCalled()`, so "none called" is complete rather than inferential |
| R-CAM-005 AC.1/AC.2 | Deactivate-by-`{id}` then a separate create. `.update(` occurs exactly once in the file; the only `agresso_agreement_id` assignment is on a **new** row. Ordering is right and non-obvious: deactivate must precede create or `uk_bpm_active_agreement` rejects the insert |
| R-CAM-002 idempotency | `apply()` re-runs step 6 **inside the transaction** rather than trusting a caller-supplied classification — which is precisely what design §5's *"idempotency comes from step 6, not from a transaction guard"* mandates |
| NFR-CAM-002 / 004 | Both created paths go through one `newDerivedRow()` hard-coding `source: DERIVED`, `confidence_score: null` |
| Audit fields / soft-delete | The deactivate payload is byte-identical to `BilateralProjectMappingService.deactivate()`. **Checked specifically:** `deleted_at` on `AuditableEntity` is a plain `@Column`, **not** a `@DeleteDateColumn` — so it triggers no automatic filtering and the superseded row stays visible through the Status filter, as R-CAM-005 AC.1 requires. A `@DeleteDateColumn` here would have silently broken that clause |
| Transaction boundaries | The whole apply, including each deactivate+create pair, is one transaction — the "contract with no active mapping" window cannot persist |
| Both judgment calls | **Ruled sound.** `DataSource.getRepository` bypasses nothing: the repository is an eleven-line shell with zero custom methods and zero overrides — audit-field and soft-delete conventions live in the *service*, which this write path correctly does not reuse |

**The FAIL — an untested guard on the one Map collision that is reachable.**

`.andWhere('bpm.is_active = :isActive', …)` on the step-6 read is load-bearing and **no test reddens if it
is deleted.** After any supersede an inactive and an active row legitimately share one
`agresso_agreement_id`; that filter is the only thing keeping the dead row out of `existingByAgreement`.
Without it `Map.set` last-write-wins picks whichever row TypeORM returns last, and a stale row can be read
as `alreadyMapped` (write silently skipped) or as `supersede` (the already-dead row re-deactivated while
the live one is bypassed) — **D-3 and D-2**. This is the identical gap closed one task ago on the AGRESSO
side. **KZ-001, recurrence 8.**

#### The Leader's hypothesis was refuted — and the Reviewer found the real variant

The Leader raised a leading-space `Map` collision, arguing T-02's safety argument (*"`agreement_id` is the
PRIMARY KEY"*) does not transfer to this table. Half of that was checked by the Leader before dispatch and
found dead: `bilateral_project_mapping` **does** enforce partial uniqueness, via a STORED generated column
`active_agreement_id GENERATED ALWAYS AS (IF(is_active = 1, agresso_agreement_id, NULL))` with
`UNIQUE INDEX uk_bpm_active_agreement`.

The other half — that PAD SPACE does not fold a *leading* space, so `' D514'` and `'D514'` could both be
active — **the Reviewer refuted, on three independent grounds**: (1) the `IN` list carries only trimmed
ids and a leading space is significant, so such a row is never returned by the query and cannot enter the
Map at all; (2) any collision would require two active rows matching the *same* normalized id, which the
unique index forbids; (3) no shipped write path can even author one — `BilateralProjectMappingService`
trims on create and has no `agresso_agreement_id` branch on update, so only direct SQL could produce it.

**The Reviewer then found the reachable variant the Leader had missed:** the collision is real, but the
axis is `is_active`, not whitespace. That is the FAIL above. *Recorded because the Leader's framing was
wrong and the correction is the more valuable half of this review.*

#### Rework dispatched (attempt 2) — test-only, plus one data-fidelity fix

- **The behavioural gate first:** a fixture returning **two** rows for `D514` — an inactive `MANUAL` at project 22 and an active `DERIVED` at project 25 — asserting `supersede` against the **active** row. One test falsifying both the missing filter and a wrong Map ordering. Plus argument-shape assertions, both to be **observed RED** with the `andWhere` deleted (K-004).
- **A real data-fidelity defect in T-03's own writes:** `newDerivedRow` stored `clarisaProjectFullName` into `clarisa_project_short_name`, whose comment reads *"Snapshot of CLARISA short_name at mapping time (D-PI-11)"*. Silently wrong, and after a run the table would show a mix of short and full names. Fixed properly by adding `clarisaProjectShortName` to `AutomapperCandidate` — which **also unblocks design §6.2's `short_name — full_name` label**, a requirement the report shape could not satisfy at all. This touches `resolve()` (already PASSed) as a one-field addition, authorised deliberately and with no logic change.
- Fourth comment-precision item of the spec: the mapping-side `' d514 '` fixture's comment must note that the leading-space half is **unreachable on this table**.

#### Budget — at the ceiling, recorded not absorbed

Design §14 budgeted **2 review rounds**. T-02 spent one; this is the second. **T-04, T-05 and T-06 remain,
and a third round breaches the budget.**

The Reviewer explicitly left the counting decision to the Leader and noted that, since production needs no
change, the T-01 precedent (*"corrected in place, no rework round consumed"*) would cover it. **It is
counted anyway.** The Reviewer issued a FAIL because the evidence did not cover the property, and that is
a real gate; not counting it would redefine the budget at the moment it starts to bind.

**But the budget is probably not the problem.** Both rounds went to the *same* defect class — a gate that
did not discriminate, first on the AGRESSO side and now on the mapping side — and neither was a design
error. That is a signal about how tests are written in this codebase, not about how the spec was sized.

#### ⚠️ FORWARD POINTERS TO T-05 — carry verbatim or they are lost

1. **`apply()` performs no validation of its `resolved` argument.** It does not confirm the contract
   exists, does not confirm eligibility, does not re-derive the id — it writes the pairs it is handed.
   Fine for a service method reached only from `resolve()`. **Not fine if T-05's controller accepts
   `resolved` from the request body:** a caller could POST arbitrary `{clarisaProjectId, derivedContractId}`
   pairs and have them written as `DERIVED` rows, bypassing R-CAM-001 entirely; a candidate with an empty
   derived id would be written as a row with an empty contract id. **T-05's apply endpoint MUST derive
   `resolved` server-side by calling `resolve()`, and MUST NOT accept a candidate list from the request.**
   *Honest consequence, which also binds T-06:* apply then re-resolves rather than replaying the preview,
   so under the 5-minute CLARISA cache (K-016, RB-6) the applied set can differ from the previewed one.
   That is the correct trade — a stale preview must not be able to write — but **the UI must not promise
   "apply exactly what you saw"**.
2. **T-00's second pointer is still open.** `@IsEnum(MappingSourceEnum)` on the create/update/list DTOs now
   lets any admin caller hand-write `source: 'DERIVED'`, weakening the provenance signal DD-2 assumes.
   T-03 correctly left it — not in its done-check — but it belongs to **T-05**, which owns the HTTP surface.

#### ADVISORY (recorded, not turned into work)

- **RISK — no `pessimistic_write` on the step-6 read.** The sibling `BilateralProjectMappingService.create()` takes that lock for exactly this reason. Two concurrent applies, or an apply racing an admin create, can both classify a contract `toCreate`; the unique index then rejects the second insert with a raw 1062 and rolls back the whole bulk apply — a 500 envelope where the sibling returns a clean 409. **No data corruption** (the index is the backstop), and R-CAM-002's *"running twice in a row"* is sequential and proven. New scope, not a T-03 edit — belongs in the risks log.
- **RESILIENCE — unbounded `IN` list, second occurrence** (now the mapping-table query too). Same conclusion as T-02: not needed today.

#### T-03 — attempt 2: Reviewer verdict `STATUS: PASS`

**The harness catch is the substantive part of this attempt, and it was the Implementer's, unprompted.**
While drafting the required test it noticed that `makeMappingQb`'s `andWhere` was a **no-op stub** — so
deleting the production `andWhere` would not have changed what `getMany()` returned, and **the test as
first drafted would not have reddened.** It found this by tracing what a stub-only double actually
verifies, *before running anything*, and strengthened the mock to filter for real.

That is **KZ-001 one level up**: not a fixture that fails to discriminate, but the *scaffold* that cannot.
Its own wording — *"a test double that doesn't evaluate what it stands in for produces a green suite over
broken behavior"* — describes this exactly. The class normally goes unnoticed because the test is green
either way. **Without the catch we would have closed a FAIL with a test that looked like coverage and
measured nothing.**

**Was the harness tuned until it passed, or until it measures?** The Leader put this to the Reviewer
directly, because the mock now encodes SQL semantics in JavaScript — a new place where the double and the
thing it stands for can drift. Ruled a **strengthening, not a tuning**, on a distinction worth keeping:
tuning-to-pass weakens a double or makes it return what the code wants; this change made the mock
**stricter** — it now *drops* rows it previously returned, and a mock that discards more of its own fixture
cannot be a concession to the code under test.

The Reviewer then enumerated the mutation space to check the double cannot manufacture a pass:

| Mutation | Mock behaviour | Result |
| --- | --- | --- |
| `andWhere` deleted | stops filtering, returns both rows | both tests red |
| clause renamed, still valid SQL | silently stops filtering | both red |
| both predicates merged into one `where` | `andWhere` never called | both red |
| gate intact | only the active row survives | green |

**No mutation makes the mock filter while production does not** — it filters only on the exact literal
clause, which the sibling shape assertion independently anchors. The two tests are complementary and
neither suffices alone: the shape test anchors the string, the behavioural test anchors the effect.

**On the active-first fixture ordering** (the Leader asked whether it was fragile): with the gate in place
the inactive row is filtered out *before* the Map is built, so **the passing path does not depend on order
at all**. Order is load-bearing only for the *falsifier* — reversed, the mutant would coincidentally land
on the right answer. And the fixture **is** the row order: a literal in the test file, not DB output, so
mutation-detection is deterministic. A comment records that the order is deliberate.

**The `short_name` fix is better than it looked.** `ClarisaProject.short_name` is **required** while
`full_name?` is optional — so the old code could write `null` into the column for a project that has a
perfectly good name. The new code structurally cannot. It improves null-safety, not just semantics. The
candidate now carries both names, closing the design §6.2 label gap flagged in attempt 1.

**Leader's full-suite measurement (quiet window, all workers idle):**

| Gate | Result |
| --- | --- |
| `npm test -- --silent` | **330 suites / 2379 tests green** · 104.7 s |
| `npm run build` | **exit 0** |

**Final status: PASS on attempt 2 of 3.**

#### ⚠️ NEW forward pointer to T-06 — `short_name` and `full_name` are the SAME STRING on the real feed

`clarisa-stub.fidelity.spec.ts:708-713` asserts, on the stub fixture **and** on the reference capture from
the live feed, that `short_name === full_name` on **every** element; `stub/tools/convert-export.ts:29`
documents the source mapping as *"Name → short_name AND full_name (verbatim, same value)"*.

Two consequences:
1. The `short_name` fix above is correct by contract but **will not visibly change the stored value** for real data. Nobody should report that as a failed fix.
2. **Design §6.2's `short_name — full_name` label will render `X — X` on every project today.** R-5's intent is *"never a bare id"*, not *"always two names"* — **T-06 must collapse the label when the two are equal.**

#### ADVISORY (recorded, not work)

- **The boundary of what the double proves.** `where` remains a plain stub, so the mock does not simulate the `IN (:...ids)` filter; the shape assertion covers the clause and its ids instead. The double proves the `is_active` semantics and **not** the IN-list semantics — that is the honest description of it.
- **One spot where the double is more permissive than reality:** the mock filters `r.is_active !== false`, keeping `undefined`, whereas SQL `is_active = true` drops NULL. Unreachable — the column is `NOT NULL DEFAULT true` and the row helper always sets it. Recorded only because the Leader asked precisely where mock and reality can diverge.

### T-04 — Coverage computation — **PASS (attempt 1)**

- **Date:** 2026-08-20 · **Effort:** `medium` · **Requirements:** R-CAM-004 AC.1–AC.3 + its `BUT it must NOT`
- **Files:** `automapper.service.ts` (+`AutomapperCoverage`, `coverage()`), `automapper.service.spec.ts` (7 new tests)
- **Reviewer verdict:** `STATUS: PASS`, attempt 1. **No review round consumed.**

**Shape:** `{ mapped, pending, reachable }`. `reachable` = `listBilateralProjects({ phase }).length` — the
character-identical call `resolve()` makes, no local filtering (AC.1). `mapped` = active
`bilateral_project_mapping` rows keyed on `clarisa_project_id IN (cohort ids)`, deduped via
`new Set(...).size`. `pending = reachable − mapped`, never queried.

**Placement** on `AutomapperService` rather than a sibling was ruled sound: a sibling would need the
identical two dependencies and would restate the cohort-call contract in a second place — the K-005 /
KZ-013 shape this spec exists to avoid.

#### The Leader's central question — answered, and the Leader's argument refuted again

The Leader asked whether project-keyed `mapped` was **forced by AC.2** (`mapped + pending = reachable`).
**It is not.** Because `pending = reachable − mapped`, the invariant is an **arithmetic tautology** and
holds under any keying — contract-keyed would satisfy AC.2 exactly and merely drive `pending` negative.
AC.2 cannot discriminate the two readings.

**The argument that does hold is better, and it is R-CAM-003's `divergent` case.** An eligible 2026 project
whose derived contract already carries an active `MANUAL` row pointing at project 22: contract-keyed calls
it *mapped*. It is not — the row points elsewhere and R-CAM-003 requires a human to adjudicate it. It is
unambiguously outstanding work. **Contract-keyed would understate `pending` at exactly the point the spec
says work remains.** Two lines make the keying structurally sound rather than conventional: the
`IN (:...ids)` cohort scope and the `Set` dedupe together guarantee `mapped ≤ reachable`, hence
`pending ≥ 0`. **The keying protects the invariant's *soundness*, not its arithmetic** — the correct
version of the Leader's claim.

*(Third time this run a Leader argument reasoned from the design's own frame was wrong and the Reviewer
substituted a better one. The pattern is consistent enough to be the run's main Kaizen candidate.)*

#### The `4 / 198` question — not stale, already governed by D-7

R-CAM-004's scenario and design §6.1's mockup say `4 / 198`; §4.4's measured data yields **1**. The Leader
suspected a stale figure needing correction. **It does not:** §7 **D-7** already states *"the spec's
numbers are a baseline for tests, never a runtime expectation."* The scenario is a **conditional** —
*GIVEN 4 are mapped … THEN coverage reads 4 / 198* — and the code satisfies it exactly when fed such a
cohort. No contradiction exists to resolve.

The "count rows instead of projects" reading also fails: §4.4 names 4 out-of-phase ids plus 1 in-phase = **5**
rows, while R-CAM-003 AC.2 names only **3** as divergent. No reading of the measured data produces "4
mapped in the current phase". The figure is illustrative, full stop.

**Action taken — annotation, not correction, and no round consumed.** Both `requirements.md` R-CAM-004 and
`design.md` §6.1 now carry a note that the figures are illustrative per D-7 and that the live strip will
read ≈ `1 / 198`. Correcting the number would have been *worse*: the scenario is conditional and the code
meets it. What was missing was not accuracy but a guard against someone filing a bug against sound code.

**Tests do not encode the stale 4:** `buildFullCohort(198)` generates synthetic ids 2001–2198 with
synthetic codes, zero contact with live ids 22/25/138/246/1516, and the file header labels the 198 as
synthetic. D-7 compliant.

#### Falsifiers — all observed, none predicted

| # | Mutation | Observed |
| --- | --- | --- |
| F1 | `pending = 3348 − mapped` | invariant red: `Expected: 198, Received: 3348` |
| F2 | cohort call replaced by a hardcoded `[]` | 3 red, incl. the delegation assertion at **0 calls** |
| F3 | added a 4th key `unpairedContracts: 1377` | the "exactly three keys" test reds on the `Object.keys` diff |

#### The advisory that was acted on — the fourth instance of one blind spot

The Reviewer found that `where('bpm.clarisa_project_id IN (:...ids)')` — **the very clause the keying
question turns on** — was unfalsifiable: `makeMappingQb`'s `where` is a pure pass-through, there was no
argument-shape corroboration either, and deleting the clause left all five tests green while live
behaviour changed to counting every active mapping, including out-of-cohort rows.

It was filed as **advisory, not a gate**, on substantive grounds (production correct; no AC or done-check
item covers cohort scoping; D-4's *named* failing input is covered and was observed as F1) — with the
budget noted only as a secondary consideration. **The Leader closed it anyway**, because this is the
**fourth** instance of the same shape in one spec: T-02's AGRESSO `is_active`, T-03's mapping `is_active`,
T-03's no-op `andWhere` stub, and now this.

The Implementer closed it better than asked: **both** a shape assertion and a *behavioural* test using a
hand-rolled query builder that actually filters — and deliberately **did not** touch the shared
`makeMappingQb` helper, to avoid changing the scaffold underneath T-02's and T-03's already-passed
fixtures. Observed RED on both, with the behavioural failure showing exactly the predicted mode:

    mapped: 1 → 2   ·   pending: 0 → -1

**Leader's measurement (quiet window):** `npm test -- --silent` → **330 suites / 2386 tests green**;
`npm run build` → **exit 0**.

### T-05 — Controller: preview, apply, coverage — **FAIL attempt 1 · BUDGET TRIPWIRE, execution paused**

- **Date:** 2026-08-20 · **Effort:** `xhigh` · **Reviewer verdict:** `STATUS: FAIL`, 2 issues, **both test-only — production code correct**

**Cleared on audit:** the three carried-forward findings are all closed. **Finding 1 (security)** — the
Reviewer could find no path, obvious or otherwise, by which a caller influences which pairs get written:
`@Body()` only, a one-property DTO, `forbidNonWhitelisted` 400s extras, transform coercion can only yield a
number or a 400, and `resolved` reaches `apply()` by **object identity** from the in-handler `resolve()`
call. It also found that there is **no global `ValidationPipe`** in `src/` — so the per-handler `@UsePipes`
is not decoration, it is the only validation. **Finding 2** closed; the sibling `confidence_score` trap
neither fixed nor worsened, correctly. **Finding 3** — Nest's controller-array order *is* the registration
order and is stable (`RoutesResolver` walks a Map whose insertion order is the array's).

**The out-of-scope touch to `clarisa-projects.service.ts` was ruled justified.** A pure read of a private
scalar, no injection change, inert for the other seven consumers, and it cannot violate NFR-BAS-001 (that
constraint is about *injecting* REQUEST-scoped providers). Every alternative was worse: timestamping in
`AutomapperService` records the **request** time — precisely the misleading value §7 exists to replace;
widening the return type hits eight consumers; a local copy is a second cache (K-005).

#### The two FAIL issues

**1. Two new public methods, zero test coverage — and the §7/K-016 timestamp is provable only by reading.**
`ClarisaProjectsService.getCacheFetchedAt()` and `AutomapperService.getFeedFetchedAt()` are both new, both
public, and neither sibling spec was extended. The controller spec proves the controller formats *whatever
its mock returns*; nothing proves the value is the cache's fetch time.
**The falsifier that settles it:** change `getCacheFetchedAt()` to `return Date.now()` — **the entire suite
stays green** and every run report starts claiming a perfectly fresh feed. That is the exact staleness lie
K-016 and RB-6 exist to prevent, made invisible.

**2. The F4 route-order test cannot detect the regression its own comment claims it detects.** The spec
builds `Test.createTestingModule({ controllers: [AutomapperController, BilateralProjectMappingController] })`
— **a literal array retyped in the spec file**, never importing the real module. Its comment says *"swap the
order in bilateral-project-mapping.module.ts's controllers array and this test must redden."* **False.**
Reordering the real array leaves the test green while `GET …/coverage` breaks in production — and the false
comment is worse than none, because the next developer reads it, reorders, sees green, and ships.
Fix is two lines: read the order off the real module via `Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, …)`
instead of retyping it, which also makes the existing comment true.

#### ⚠️ BUDGET TRIPWIRE — design §14 exceeded, execution paused for the user

| Signal | Budgeted (§14) | Actual |
| --- | --- | --- |
| Tasks | 7 | 7 — on budget |
| Review rounds | **2** | **3** (T-02, T-03, T-05) — **exceeded**, with T-06 still to run |
| LOC | ≈ 620 | ≈ 1,100+ server-side already |
| PRs | 2 | 2 — on budget |

§14's own tripwire text: *"A third PR, a fourth review round, or a diff materially past ~620 LOC means
something leaked in — most likely the review surface growing into a full queue UI, or ambiguity handling
expanding beyond DD-4's branch."*

**Neither predicted cause occurred.** The review surface has not been built yet and the ambiguity branch is
exactly DD-4's. Escalated to the user rather than absorbed — `pre-approved` mode covers routine progress,
never a budget exception.

#### The actual cause — five instances of one defect class, and not the one §14 anticipated

| # | Task | The gate that could not go red |
| --- | --- | --- |
| 1 | T-02 | AGRESSO `is_active` filter — deleting it reddened nothing |
| 2 | T-03 | mapping-table `is_active` filter — same |
| 3 | T-03 | the mock's `andWhere` was a **no-op stub**, so a correctly-written test still would not have reddened |
| 4 | T-04 | the `IN (:...ids)` cohort scope — deleting it drove `pending` negative, silently |
| 5 | T-05 | the feed timestamp — `return Date.now()` keeps the whole suite green |

**Every one was correct production code with undischarged evidence. Not one was a behaviour defect, a
design error, or scope creep.** §14 estimated review rounds on the assumption they would be spent on
implementation error; they were spent almost entirely on proving that already-correct code was correct.
Three Leader arguments reasoned from the design's own frame were also wrong, one exactly backwards — same
family: **a claim asserted without being observed.**

The methodology lesson is narrower and sharper than "write better tests": **K-004 binds the argument as
tightly as the command.** If the red has not been seen, it may not be asserted — not in a comment, not in a
brief, not in a review. That is the Kaizen candidate for this spec's archive.

#### T-05 — attempt 2: Reviewer verdict `STATUS: PASS`

Both gates genuinely closed. The Reviewer verified several things it was not asked to, and two are worth
keeping:

- **It independently confirmed the real module array is back to `[AutomapperController, BilateralProjectMappingController]`** after the falsifier swap — explicitly flagging that it checked *"because a swap-and-swap-back is exactly the operation that ships a bug when the second half is forgotten."* It was not forgotten.
- **It traced `resolve()` to validate the `cohort` derivation** rather than accepting it: every cohort project becomes exactly one candidate, and the three buckets are **disjoint and exhaustive** — a candidate cannot land in none or in two.

**On the Leader's question about partial `Date.now()` pinning:** it is not less faithful — **it is the only
version that works**, for a reason neither the Leader nor the Implementer stated. Pinning across the whole
test would make the assertion's *own* `Date.now()` return `fetchTime`, so `toBeLessThan` would compare
`1700000000000 < 1700000000000` and fail. The restore is load-bearing, not stylistic. `getCachedAll()` was
checked and reads the clock **once at entry**, so the window is exactly the right width.

**And the mutant is killed structurally, not by timing.** `fetchTime` is a hardcoded 2023 constant, so the
gap to a real `Date.now()` is years — the discrimination comes from `toBe(fetchTime)` asserted twice, and
`toBeLessThan` is documentation of intent. No flake surface.

**The §9 log line was ruled correct, and the controller the right owner** — it is the only layer that knows
preview from apply; threading a mode flag into the service would be worse coupling for no gain.

**On the Leader's contradictory instruction.** The brief said *"do not change a single line of production
code"* and then asked for the §9 log line, which inherently requires one. **The Implementer surfaced the
contradiction instead of resolving it silently**, and both the Leader and the Reviewer confirmed its
reading was right. Recorded because the failure mode here is a worker that quietly picks one horn and the
Leader never learns the brief was self-contradictory.

**Three closers applied before commit** (in-place, no round consumed): `superseded`/`divergent` added to the
apply log line — RB-3's purpose is *"the answer to 'why do I have 194 new rows'"*, and each supersede
deactivates one row and inserts another, so `created=N` alone undercounts; the log's `feedFetchedAt=.+`
assertion tightened to the exact ISO string, since `.+` matches the literal `unknown` and a hardcoded
constant would have survived it; and three `mockRestore()` calls moved into `try/finally` — they ran only
on the success path, so a failure between install and restore would pin `Date.now` to 2023 for the rest of
the file and **turn one real failure into a page of noise that hides it.**

#### Design §4 amended by the Leader (documentation fix, no round consumed)

§4 said *"four buckets"* and *"the same shape for preview and apply"*. **Both were wrong about what the
requirements demand.** Four buckets cannot satisfy R-CAM-003's *"AND IT MUST report the divergence"* or
R-CAM-005, which need `divergent` and `supersede` as **data**, not counts — §6.2 lists both candidates.
And the two shapes differ deliberately: apply re-classifies inside its transaction, which is where
R-CAM-002's idempotency comes from. Amended to describe what ships, with the consequence stated: after a
write, the authoritative divergent list is apply's, not the preview's, and they can differ under the
5-minute cache (RB-8).

#### Follow-ups carried out of this spec — recorded, NOT turned into work

Per the advisory-never-grows-scope rule. Each is real; none is in the approved `tasks.md`:

| # | Item | Why it is not done here |
| --- | --- | --- |
| 1 | No `@ApiResponse` on any handler, so **none of the output DTOs reaches the Swagger schema** — despite `automapper-run.dto.ts` stating they exist *"purely so @nestjs/swagger can generate a schema"*. `AutomapperCoverageResponseDto` is dead code | New scope. Also means a human opening `/swagger` sees three endpoints with a bearer lock and **no response schemas** |
| 2 | `apply()` could return its in-transaction classification, letting T-06 render post-apply divergence without a second round trip | Changes a PASSed service contract |
| 3 | `classify()` has no explicit `save`/`create`/`update` no-write assertion | Would make preview-writes-nothing hold at the service layer too, not only the controller |
| 4 | `apply(resolved, request.user)` passes `User \| undefined` into a `User` parameter | Unreachable (`RolesGuard` rejects when absent) and identical to the sibling controller's shipped pattern |
| 5 | The `@Cron` scan is top-level only — `readdirSync` without `{ recursive: true }` skips `dto/`, `entities/`, `enum/`, `repositories/`, `utils/` | Confirmed by grep that no scheduler exists there today; still strictly better than the 3-file list it replaced |
| 6 | §9's *"one summary"* is now one summary plus two service step lines — same values, double grep hits | Cosmetic |

**Outstanding, not a finding:** the `/swagger` render is unverified in-sandbox. **Recorded outstanding**
alongside T-06's visual check rather than claimed — the decorators are statically verified, the render is not.

### T-06 — Client: coverage strip and run surface — **PASS (attempt 2 of 3)**

- **Date:** 2026-08-20 · **Package:** `client/research-indicators` · **Reviewer verdict:** `STATUS: PASS`
- **Dispatched CROSS-HOST to Antigravity** (Gemini 3.7 Flash, effort high) via Orca orchestration —
  Run `run_60c349f2cab8`, Task `task_9ba5226f8c62`, Dispatch `ctx_d96bcb4bc809`. Reviewed on Claude/opus.

#### Why the cross-host dispatch mattered more than the tokens it saved

The user asked for agy to save context. What it also bought was **`author ≠ auditor` on model *family*,
not just instance** — and the spec's **only behaviour defect in seven tasks** was written by one family
and caught by the other. Five same-family review rounds had never needed to catch one.

#### Dispatch mechanics — three failure modes hit, all recorded because each nearly cost a wrong conclusion

1. **`worker-start --agent gemini` is disabled on this install** (`agent_unconfigured`), exactly as root `CLAUDE.md` records. The documented fallback — `terminal create` + `dispatch --inject` — is correct and preserves full Run/Task/Dispatch provenance.
2. **agy sat on its sign-in screen for ~90 s with the buffer cursor frozen.** Dispatching into it would have hit the failure the playbook names: *a target that is not live accepts the order and produces nothing, and the failure surfaces only as silence.* Held until the user confirmed, then verified the prompt at a live `>` before injecting.
3. **`dispatch --inject` returned `injected: true` BEFORE the prompt was accepted.** Per root `CLAUDE.md`, agy's TUI satisfies idle before it takes input. **The buffer was read back** and confirmed the whole brief landed (cursor 48 → 917) and that agy was already reading `.agents/implementer.md`. Trusting the `true` would have made a lost send indistinguishable from a worker thinking.

**Two Leader errors on the orchestration path, recorded because both were near-misses:**
- `check --wait` was called with `--from` (invalid; `check` takes `--terminal`/`--run` while `send` takes `--from`). It returned `ok: false`, and the Leader **almost read that as "no messages"** — a count over a failed command is a confident zero, **K-014** precisely. Caught by inspecting the raw error instead of the `count` field.
- The Run is bound to the coordinator **pane**, so reads from the Leader's own shell returned `consumer_fenced`. This background job has a terminal handle but **no stable pane identity**, so it cannot itself be an Orca coordinator; an idle `zsh` in the same worktree was used as the coordinator identity. The other live Claude session's terminal was deliberately **not** used — hijacking it would have interleaved two sessions' orchestration state.

**The worker did the work and under-reported it, twice.** Its first `worker_done` body was a prose summary
claiming the falsifiers ran; the actual jest `FAIL` output with file paths and line numbers was sitting in
its terminal buffer. *Workers reliably do the work and unreliably remember to mail it* — the evidence was
recovered from the buffer rather than re-run. Both rework `worker_done` messages were then **rejected**
(`Dispatch capability is revoked`) because the first had already settled the dispatch; their bodies were
still readable as rejected-message content.

#### Attempt 1 — `STATUS: FAIL`, and the first REAL behaviour defect of the spec

**Issue 1 — opening the dialog never loaded the preview.** The parent renders the dialog unconditionally
with `automapperDialogOpen = signal(false)`, so the component mounted **once** with `visible() === false`
and `ngOnInit` skipped the load. Clicking *Auto-map* flipped the signal and showed the dialog, but nothing
re-triggered the fetch — no `effect`, no `ngOnChanges`, no `(onShow)`. **The admin saw an empty dialog
until pressing Refresh by hand.** R-CAM-002's trigger→preview flow did not run in production.

**And the suite was green** because every dialog test called `setInput('visible', true)` **before** the
first `detectChanges()`. The fixture never reproduced the production sequence — construct-false-then-open.
**This is the spec's recurring failure mode one level up again:** not a fixture that fails to discriminate
(T-02, T-04), not a scaffold that cannot (T-03's no-op stub), but **a fixture asserting a state the product
never reaches.** The assertions were not weak; they were about a situation that does not occur.

**Issue 2 — the coverage strip never refreshed after apply.** `onAutomapperApplied()` reloaded the table
only, so after writing ~190 rows the strip still showed pre-apply figures. The dialog's own output contract
said *"so parent can reload list **and coverage**"*. The on-screen TTL note did **not** excuse it: server-side
`mapped`/`pending` come from a live mapping-table query, not the cached CLARISA cohort — the staleness
explanation pointed at the wrong cause. **K-016 in its inverse form:** a UI implying the save did *not*
take effect.

**Issue 3 — `atc-green-800` does not exist.** `colors.scss` generates `.atc-*` from a map whose green scale
stops at `green-700`. **A token that is present and does nothing** — a presence check certifying a no-op.
Plus six inert `hover:abc-grey-100` (Tailwind cannot synthesise a variant for a plain global class), so the
rows had no hover feedback at all.

#### Attempt 2 — all three fixed, each with observed red

| Issue | Fix | Observed RED |
| --- | --- | --- |
| 1 | `effect(() => { if (this.visible()) untracked(() => void this.loadPreview()); })`; `ngOnInit` removed entirely; `closeDialog()` now clears `preview` and `activeTab` | `toHaveBeenCalledTimes(1)` → `Received: 0` |
| 2 | `viewChild(BilateralMappingCoverageComponent)` + `loadCoverage()` from `onAutomapperApplied()` | `getCoverage toHaveBeenCalled` → `Received: 0` |
| 3 | `atc-green-700`; all six hovers → `hover:bg-[var(--ac-grey-100)]` | n/a — token/class correctness |

**Reviewer findings on the fix that the Leader had not seen:**
- **`untracked` is load-bearing for a reason neither the Leader nor the worker stated.** The effect's only tracked read is `visible()` — but `loadPreview()` reads `this.phase()` **synchronously**, before its `await`. Without `untracked`, that read would enter the dependency set and a phase change would re-trigger the effect. The signal *writes* were never the issue.
- **The Leader's suspicion about `visible.set(false)` was answered cleanly:** `visible` is `model<boolean>(false)`, not `input()`, so `.set()` is part of its API and propagates through the parent's `[(visible)]` binding. Had it been a plain `input()`, that line would have been a bug.
- **The `viewChild` is safe:** the coverage component sits directly in the always-rendered page body, not inside any `@if`/`@defer`/`@switch`. And the test's `getCoverage.mockClear()` is what makes it behavioural — the call it clears can only have come from the real child's `ngOnInit`, proving a genuine child instance is in the tree rather than a stub.
- **The two-element ambiguous fixture now discriminates** — both rows pinned individually, and `counts.ambiguous` updated in both fixtures so no drift can mask a future count/list mismatch.

#### Leader's measurements (quiet window)

| Gate | Result |
| --- | --- |
| `npm run build` (client) | **exit 0** — the only type gate new Angular code has (K-002) |
| Full client suite | **310/311 suites · 6465/6468 tests** |
| The 3 failures | **PROVEN pre-existing**: stashed the client changes, re-ran, same 3 red. `to-promise.service.spec.ts`, `managementApiUrl`/`mainApiUrl` env values, unrelated to the automapper. Not fixed — unapproved scope |

#### ⚠️ OUTSTANDING — the only uncovered obligation on this task

**The visual check is NOT done and is not claimed.** jsdom cannot evaluate rendered layout or contrast.
The worker's first report said *"None"* outstanding; that was wrong and was corrected. **Issue 3 and the
six dead hovers were exactly the class jsdom cannot see** — all three were caught by reading code, not by
any test. That makes the human look **load-bearing, not ceremonial**, and it is worth taking before the
spec closes rather than after. One further item belongs to it: two ambiguous rows sharing a contract id
render sequentially and **ungrouped**, with nothing guaranteeing the server returns them adjacently — whether
that reads as a collision on screen is a judgement no test here can settle.

#### ADVISORY (recorded, not work)

- **Two in-flight previews are not sequenced.** Open → close → reopen faster than the round trip leaves two `previewAutoMap` promises outstanding with no cancellation, so a slow first response can land after a fast second. Not user-visible today: reopening sets `loadingPreview` synchronously so the stale value never reaches the screen, and RB-8's server-side re-resolution means a stale preview can never write. A monotonic request counter is ~4 lines if ever worth taking.
- **The `untracked` boundary interacts with the hardcoded-`phase` follow-up.** `phase` is deliberately outside the effect's dependency set, so an open dialog will not reload if it changes. Inert today (`signal(2026)`, never written) — but whoever makes `phase` dynamic must decide whether an open dialog should refetch.
- **The divergent panel shows a bare `Project ID 22`.** Not fixable in T-06: `AutomapperReconciledEntry` carries no name for the *existing* project, and ids 22/138/246 sit outside the 198-project cohort where `full_name` is guaranteed. Server-side follow-up — the mapping row already stores `clarisa_project_short_name`.
- **`phase` is hardcoded to 2026 in three places** and always sent, so the surface ignores the admin-configured phase (`resolvePhase` treats the argument as an override). Design §6.1's mockup says *phase 2026*, so it is out of written scope; the fix needs a server-returned `phase_used`, which `AutomapperCoverage` does not carry.
