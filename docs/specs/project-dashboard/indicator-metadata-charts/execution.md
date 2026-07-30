# Execution Log — Project Dashboard / Indicator-metadata charts

## Document Control

- **Spec id:** 2026-07-indicator-metadata-charts
- **Spec path:** `project-dashboard/indicator-metadata-charts`
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md) — revision 4 (**no judgment warrant** — see `tasks.md` RB-1)
- **Linked tasks:** [`./tasks.md`](./tasks.md) — 17 tasks
- **Approval mode:** interactive (owner approves at each gate)
- **Budget (tripwire):** 17 tasks · ~1,600 LOC · 2–3 review rounds (`tasks.md` §9)
- **Started:** 2026-07-30
- **Status:** in-progress — **T-01, T-02, T-03, T-04, T-05 done** (5 of 17). Next eligible: **T-06** (sequential composition) and **T-07** (repository specs); **T-09** (Swagger) unblocks once T-06 lands.
- **Rework rounds consumed so far:** **0** — every task has passed on attempt 1. Budget allows 2–3.
- **All server queries now execute against the real schema.** RB-3 (the unexecuted CTE-across-UNION pattern) is **discharged**, so DD-1's consolidation is proven rather than assumed. The next open architectural risk is **RB-4 / DD-11**, which **T-08's measurement** decides.
- **Owner decisions pending:** none. The two advisory-derived items were authorised and applied 2026-07-30 (see `## Owner escalation`); one wording correction across three documents remains deliberately open there.
- **Branch:** all work lives on **`AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator`** as of 2026-07-30. The first two commits were briefly made on `dev` by mistake and moved by cherry-pick; `dev` was reset to `origin/dev`, and since neither commit had been pushed, **no published history was rewritten**. The move was non-trivial rather than cosmetic — `AC-1672` sits behind `dev` and their copies of `agresso-contract.repository.ts` differ by 20 lines. Those differences turned out to be **purely prettier formatting in lines 58–125**, disjoint from T-02's two edited lines (54 and the return type), so the cherry-pick auto-merged cleanly and was re-verified on the new base: `tsc` clean, `agresso-contract` **5 suites / 123 tests** green. **Side effect worth knowing:** `dev` carries the degraded formatting, so the **9 pre-existing prettier errors** T-02's Implementer proved against `HEAD` **do not exist on this branch** — that file now lints clean, and nobody should later read those 9 as this spec's doing.

---

## Task Execution History

### T-01 — Live-environment reconnaissance: close OQ-3, answer OQ-5

- **Status:** ✅ **PASS** (evidence task — see the audit note below)
- **Date:** 2026-07-30
- **Implementer attempts:** 1
- **Executed by:** Leader, **inline**. This task touches no files and produces no diff — its deliverable is recorded evidence. **It therefore carries no independent Reviewer audit**, and that is a real gap, not a formality: mitigate by re-running the three scripts, which are read-only and idempotent. Every number below is reproducible.
- **Authorisation:** owner authorised read-only queries against the **"allianza test"** environment (the active `ARI_MYSQL_*` block in `server/researchindicators/.env`), 2026-07-30.
- **Environment:** `alliancereportingdb` @ `192.16…` — the only uncommented MySQL block in `.env`. No local database exists (`docker-compose.yml` runs the app only), so this is a remote Alliance environment. No MySQL client and no `node_modules` were present; the driver was installed in the session scratchpad, **not** in the repo.
- **Method:** four read-only scripts — `t01-recon.js` (existence, columns, cardinality, volume), `t01-gender.js` (the `gender` shape), `t01-joinmap.js` (PK per lookup), `t01-joinsmoke.js` (all 10 joins executed), `t01-labels.js` (label columns). Zero writes, zero DDL.

#### OQ-3 — CLOSED. Both label questions answered, and a **third** was found.

| Lookup | Question | Live rows say | Decision |
| --- | --- | --- | --- |
| `clarisa_innovation_readiness_levels` | `level` vs `name` | **Both are populated and both are needed.** `level` is `0…9` (a bare number); `name` is `Idea`, `Basic Research`, … `Proven Innovation`. **`id` is 11–20, not 0–9** — id ≠ level | **`CONCAT(level, '. ', name)`** → *"7. Prototype"*. IRL is conventionally cited by number, and this chart has 10 categories so it uses the `rows` layout (design §7.4), which tolerates the longer label |
| `maturity_levels` | `name` vs `full_name` | **`name` is `"Level 1"` — uninformative on its own.** `full_name` = `"Level 1: Discourse/behavior changes (Sphere of Influence)"`. A third column exists: `description` = the same text without the `"Level 1: "` prefix | **`full_name`** (the answer within the question's stated options). `description` is the shorter alternative if the label proves too long in the card — owner's call, recorded rather than decided silently |
| **`policy_stage`** | *not previously asked* | **`name` is `"Stage 1"` / `"Stage 2"` / `"Stage 3"` — uninformative**, exactly the defect `maturity_levels.name` has. `description` carries the meaning: *"Research taken up by next user, policy change not yet enacted."* | **`description`**. `requirements.md` §4.1 specified `name` for this chart; that would have shipped a chart labelled *Stage 1 / Stage 2 / Stage 3*. **This is a correction to the "verified source map", found by looking at rows** |

#### OQ-5 — ANSWERED. Exactly one chart engages the expansion contract.

| CLARISA lookup | Rows | > 5? |
| --- | --- | --- |
| `clarisa_innovation_readiness_levels` | **10** | ✅ **engages** the expansion contract |
| `clarisa_innovation_types` | 4 | no |
| `clarisa_innovation_characteristics` | 4 | no |

**Consequence:** exactly **one** of the ten cards (Current Readiness) exceeds 5 categories today. That is enough to make design §7.2 / DD-10 load-bearing rather than theoretical, it gives **DC-13**'s boundary test a real subject, and it **confirms the OQ-6 decision was the right one** — there is a genuine > 5 card, so T-09's overlay really is reached by this spec's surface. T-13 still implements the contract unconditionally: row counts of a sync-populated table are not a contract.

#### Unplanned finding — **the join column is not `id`, and it follows three different conventions**

`requirements.md` §4.1 recorded the fact column, the lookup table and the label column — but **never the join column.** It is not uniform:

| Convention | Lookups |
| --- | --- |
| **`id`** | `clarisa_innovation_characteristics`, `clarisa_innovation_readiness_levels`, `maturity_levels` |
| **`code`** | **`clarisa_innovation_types`** — the only one, and unguessable |
| **`<table>_id`** | `policy_types`, `policy_stage`, `session_formats`, `session_types`, `session_lengths`, `gender`, `degrees` |

**Why this would have cost rework rather than erroring cleanly:** the first three charts in §4.1's own order join on `id`, so a developer writing them top-down establishes `.id` as the pattern — and then breaks on charts 5–10. `gender.id` does not exist (`ER_BAD_FIELD_ERROR`, observed), which is how this was found. This is the same defect class as revision 1's `result_oicr` → `result_oicrs`, the third time this spec's "verified source map" has been incomplete. **`requirements.md` §4.1 now carries a Join column column.**

#### All 10 joins executed against the real schema — every one resolves

| Section | Join | Categories | Rows |
| --- | --- | --- | --- |
| `innovation_nature` | `clarisa_innovation_characteristics.id` | 4 | 246 |
| `innovation_type` | **`clarisa_innovation_types.code`** | 4 | 245 |
| `innovation_readiness` | `clarisa_innovation_readiness_levels.id` | **10** | 265 |
| `oicr_maturity` | `maturity_levels.id` | 3 | 21 |
| `policy_type` | `policy_types.policy_type_id` | 3 | 62 |
| `policy_stage` | `policy_stage.policy_stage_id` | 3 | 61 |
| `session_format` | `session_formats.session_format_id` | 2 | 377 |
| `session_type` | `session_types.session_type_id` | 2 | 310 |
| `gender_individual` | `gender.gender_id` | 3 | 99 |
| `degree` | `degrees.degree_id` | 4 | 54 |

**This substantially de-risks T-03 and T-04** — the table names, join columns and label columns are now executed facts, not derived ones. It does **not** close **RB-3**: these were plain grouped joins, so the **CTE-across-UNION-branches** pattern is still unexecuted, and that remains T-03's own real-schema gate.

#### Two design claims moved from "argued" to "measured"

- **R-IMC-006's conjunction is worth 33 % of the answer.** `degree_id IS NOT NULL` alone matches **54** rows; `+ Training AND Long-term` matches **36**. The wrong filter **over-counts by 18 rows** from stale `degree_id` values. The spec's warning was not theoretical — DC-2's fixture is gating a defect that exists in this data today.
- **DD-8's symmetry fight was the most valuable thing in the design review.** Group format carries **275 rows summing to 6,057 male / 31,436 female / 4 non-binary participants**, against individual format's **99 records** (63/32/4). The group side **dominates by roughly three orders of magnitude.** The prohibited "skip the group row if it matches no individual row" rule would not have degraded the Gender chart — it would have **discarded ~37,000 reported participants and shown 63/32/4.** Three rounds of judgment on that clause paid for themselves here.

#### Environment volume — recorded so T-08's representativeness is auditable

`results` **14,647** · `result_innovation_dev` 939 · `result_oicrs` 127 · `result_policy_change` 208 · `result_capacity_sharing` 1,701.

The owner confirmed this environment is volume-representative for **T-08**. The numbers are recorded here so that judgement is checkable rather than remembered — if T-08's result is later disputed, this is the dataset it was measured on.

#### Also confirmed (no action — recorded so nobody re-verifies)

- **R-6 holds:** `result_id` is the PK on all four fact tables → 1:1 with `results`, so `COUNT(*)` after the DISTINCT join cannot double-count.
- **Seeded ids match migration `1727119632564` exactly:** `gender` 1/2/3 = Male/Female/Non-binary · `session_types` 1/2 = Training/Engagement · `session_lengths` 1/2 = Short-term (below 3 months)/Long-term (3 months and more) · `degrees` 1–4 = PhD/MSc/BSc/Other. **DD-4's decision to resolve Training by id is confirmed against live data**, and DD-2's literal gender branches are safe.
- All four irregular table names exist as `requirements.md` §4.1 states: `gender`, `policy_stage`, `maturity_levels`, `result_oicrs`.

#### Requirements covered

Enables R-IMC-001 AC.3, R-IMC-002, R-IMC-003; scopes NFR-IMC-002 · closes **OQ-3** · answers **OQ-5**.

#### Decisions made

| # | Decision |
| --- | --- |
| **O-01.1** | Readiness label = `CONCAT(level, '. ', name)`; maturity = `full_name`; **policy_stage = `description`, not `name`** |
| **O-01.2** | `requirements.md` §4.1 gains a **Join column** column — the map was incomplete in a way that reads as complete, for the third time |
| **O-01.3** | The 10-join smoke test was run although it is arguably T-03/T-04 scope. Justification: read-only, no repo changes, and it converts the spec's likeliest silent defect (wrong join column) into a closed question before any SQL is written. **It does not discharge T-03's real-schema gate** (no CTE, no UNION, no contract scoping) |
| **O-01.4** | `maturity_levels.description` is offered as a shorter alternative to `full_name` and left to the owner — not decided unilaterally |

#### Issues encountered

| # | Issue |
| --- | --- |
| E-01.1 | No MySQL client and no `server/researchindicators/node_modules`. Resolved by installing `mysql2` in the session scratchpad — **the repo was not touched** |
| E-01.2 | `SELECT id FROM gender` → `ER_BAD_FIELD_ERROR`. **This error is the finding**, not an obstacle: it is what exposed the non-uniform join columns |
| E-01.3 | **RB-2 stands.** `docs/infrastructure.md` still has no `## Local Environment` contract; this task worked only because `.env` happened to hold a live remote host. Recommend `/akili-constitution` Step 6B |

#### Final verification

All five scripts ran to completion against `alliancereportingdb`. Ten joins resolved, three cardinalities counted, three label decisions taken from observed rows, two design claims quantified. **No writes, no DDL, no repo changes.**

---

### T-05 — Gender merge util (pure) + its specs

- **Status:** ✅ **PASS** — Reviewer PASS on attempt 1
- **Date:** 2026-07-30
- **Implementer attempts:** 1
- **Roles:** Implementer (T2) → Reviewer (T3). `author ≠ auditor` enforced by the `.claude/agents/akili-*` wrappers' model bindings.
- **Files changed:**
  - `server/…/agresso-contract/utils/gender-distribution.util.ts` *(new, 84 lines)*
  - `server/…/agresso-contract/utils/gender-distribution.util.spec.ts` *(new, 210 lines)*

#### Implementer verification (attempt 1)

| Check | Result |
| --- | --- |
| `npx jest …/gender-distribution.util.spec.ts` | **11 passed / 11 total** |
| **Mutation (a)** — re-sort removed | **2 failed**: the AC.7 ordering case and the id-ASC tie-break. Restored; `diff` against backup byte-identical; suite green again |
| **Mutation (b)** — merge made left-biased (group rows filtered to ids present in `individualRows`) | **4 failed**: AC.6, the mixed scenario, AC.4, DD-8. The group-only case went from `[Male:10, Female:4]` to `[]`. Restored; `diff` byte-identical; suite green |
| `npx eslint` on the two new files | Clean, exit 0. One prettier error found and fixed **manually, not via `--fix`** — correct, since `npm run lint` would have auto-fixed the 26 pre-existing package-wide errors and polluted the review diff |

#### Reviewer verdict — `STATUS: PASS`

> The merge is a structurally symmetric sum over the union of `gender_id`s with no rule subordinating group rows to individual rows, satisfying design §6.2's standing prohibition, DD-2/DD-8, and R-IMC-005 AC.1–AC.4/AC.6/AC.7; I independently reproduced both mutation kills, including the group-only case collapsing from `[Male:10, Female:4]` to `[]`, so the DC-3 gate is proven live rather than asserted. Given tasks.md RB-1 designates this pass as the missing audit for design revision 4's unwarranted DD-8 fix, I record explicitly that the prohibited rule is absent from the shipped code and that its reintroduction is now test-gated.

**The Reviewer re-derived the mutation evidence rather than trusting the report**, working on copies in a scratchpad so the repo stayed untouched, and surfaced the single most important fact about this suite: **`AC.1` stays green under mutation (b).** That is precisely the hazard `tasks.md` § T-05's "Evidence that does NOT count" clause names — a mixed fixture is green over the bug — and it demonstrates the suite does not rely on it. Also confirmed: purity (input rows never mutated), and util coverage **100 % stmts / lines / funcs, 70 % branches** (above the 60 % floor; the uncovered branches are unreachable defensive guards).

**RB-1 partially discharged.** This is the independent audit that design revision 4's post-terminal DD-8 fix never received. It covers the *code*, not the design document.

#### The Reviewer's four adjudications on the Leader's flagged questions

| # | Question | Verdict |
| --- | --- | --- |
| 1 | AC.1 models "3 individual Male records" as one row with `count: 3` — faithful or a convenient shape? | **Faithful.** Design §6.2 defines `gender_individual` as grouped by `gender_id` in SQL, and `tasks.md` T-04 repeats it. The fixture models T-04's contract, and the spec comment states the justification inline so no future reader mistakes it for a shortcut |
| 2 | Name collision when the same id arrives with different `name` on both sides | **Unspecified by the spec, correctly resolved, advisory.** Individual accumulates first, so the live `gender.name` label wins over the group branch's hardcoded literal — the better of the two unspecified options under S-3's rationale (labels are editable, ids are not) |
| 3 | Local `GenderDistributionRow` instead of `MetadataCountDto` | **Spec-sanctioned, not a gap.** `tasks.md` §2 lists T-02 and T-05 as independent and T-05's dependencies as none; a pure util that must compile without T-02 has no other option. The types are structurally identical, so TS assignability makes T-06's reconciliation free |
| 4 | Does every in-scope AC have a dedicated named assertion? | **Yes** — AC.1, AC.2 (dedicated `undefined` case + the group-`NULL` case), AC.3, AC.4, AC.6 (plus a mirror individual-only case hardening symmetry in both directions), AC.7 (plus tie-break), DD-8 (**uses id 99, outside the seeded 1–3 range, which proves a genuine union rather than a hardcoded three-category shape**), and both DC-3 fixtures. AC.5 (the rendered provenance note) is correctly outside this task. Order asserted with ordered `toEqual`, not `toContain` |

#### Implementer's `Not Done / Assumptions` — carried verbatim

> - **Input type is locally defined** (`GenderDistributionRow { id, name, count }`) rather than imported from `MetadataCountDto`, because T-02 (which defines that DTO) is independent of T-05 and not yet landed in this working tree beyond an in-progress uncommitted diff I did not touch. T-06 (sequential composition/merge wiring) or a later task should confirm this shape matches `MetadataCountDto` when it lands, or add a thin adapter — I did not wire this util into any repository/service/DTO, per the scope fence.
> - All seven ACs (AC.1–AC.4, AC.6, AC.7) plus DD-8 pass-through and the DC-3 group-only gate have a dedicated, named assertion in the spec — none were left implicit.
> - I did not touch T-04's SQL, the repository, service, or any DTO/client file, per the scope fence.

**Leader adjudication:** bullet 1 is a **coupling note owed to T-06**, not scope omitted from T-05 — the scope fence forbade touching DTOs, so no other outcome was available. Bullets 2 and 3 are confirmations, not gaps. **T-06 must reconcile `GenderDistributionRow` against `MetadataCountDto` (now landed by T-02) or add a thin adapter** — recorded in `tasks.md` § T-06.

#### `ADVISORY` findings (4R lenses) — recorded, non-gating, **not converted into tasks**

Per `/akili-execute` §2.4 an advisory may not become a new task or widen an existing one on the Leader's initiative. All four are recorded here and die here unless the owner decides otherwise.

| Lens | Finding |
| --- | --- |
| **Reliability** | **A wording inconsistency across three spec documents.** `tasks.md` § T-05, `design.md` §10 and `requirements.md` §9 DC-3 all say the group-only fixture should yield *"all three categories with their summed counts"* — but the fixture gives Non-binary `count: 0`, so **AC.3 drops it** and the assertion correctly expects two entries. `requirements.md`'s own *Scenario: Group-only project* expects exactly Male=10 and Female=4, so **"all three" is literally unsatisfiable alongside AC.3 when the third is zero.** The Implementer chose correctly and the mutation kill proves the gate works, but **no test asserts three *non-zero* categories surviving a group-only merge.** The Reviewer suggested handing it to T-07 or T-16 — **the Leader declined to do that**, because it would widen an approved task from an advisory. **Escalated to the owner instead as a spec-text gap** (see the escalation note below) |
| **Resilience** | `NaN` poisoning is category-wide: `toSafeCount` guards `null`/`undefined`, but `Number('abc')` yields `NaN`, and since `NaN > 0` is false the category is dropped **including the valid contribution from the other side**. Unreachable today (both branches are `COUNT(*)` / `COALESCE(SUM(...),0)`) and `Number()` is a genuine plus for MySQL's BIGINT-as-string. Flagged so **T-06 does not widen the input surface without revisiting the guard** |
| **Readability** | Two layers of the same defensive guard — the `= []` parameter defaults make the inner `rows ?? []` and `row?.count` unreachable for any caller respecting the declared types. This is what holds branch coverage at 70 % while everything else is 100 %, so **do not read 70 % here as a coverage signal** |
| **Risk** | **The 30-line doc-comment is the real defense.** It names the prohibited rule, cites §6.2, and carries the live 6,057 M / 31,436 F measurement as the reason. The code alone does not explain why the symmetry matters, so that header is the strongest guard against a future reader "simplifying" the two `accumulate` calls back into a subordinating merge. **It must survive any future refactor of this file verbatim** |

#### Requirements covered

R-IMC-005 AC.1, AC.2, AC.3, AC.4, **AC.6**, **AC.7** · design §6.2, DD-2, DD-8 · gate **DC-3** closed. AC.5 (rendered provenance note) belongs to T-13.

#### Decisions made

| # | Decision |
| --- | --- |
| **O-05.1** | Name collision resolved individual-first, so the live `gender.name` beats the group branch's literal. Unspecified by the spec; recorded rather than left implicit |
| **O-05.2** | The advisory wording gap was **not** folded into T-07 or T-16 despite the Reviewer's suggestion. `/akili-execute` §2.4 forbids the Leader minting or widening tasks from advisories — the owner decides |

#### Issues encountered

| # | Issue |
| --- | --- |
| **E-05.1** | **Working-tree collision between the two parallel Implementers.** T-02, running concurrently, issued a malformed `git stash push` that transiently staged T-05's untracked files, then ran `git restore --staged` on them. **File contents were unaffected** (verified: 294 lines, checksum taken), but it silently undid the `git add -N` the Leader had used to generate T-05's review diff, so the Reviewer's `git diff` returned nothing. **It recovered only because the brief carried an explicit fallback to reading the two files directly.** Root cause: two Implementers sharing one working tree. **Mitigation for future parallel waves: spawn with `isolation: worktree`.** |

#### Final verification

Suite as committed: **11 / 11 green**; eslint clean on both files; both mutations independently reproduced by the Reviewer and restored. Repo untouched by the audit.

---

### T-02 — DTO surface: base/full split, metadata section DTOs, `SessionTypeEnum`

- **Status:** ✅ **PASS** — Reviewer PASS on attempt 1
- **Date:** 2026-07-30
- **Implementer attempts:** 1
- **Roles:** Implementer (T2) → Reviewer (T3), `author ≠ auditor` enforced by wrapper model bindings.
- **Files changed:**
  - `server/…/agresso-contract/dto/reports-indicator-metadata.dto.ts` *(new)* — `MetadataCountDto` + `IndicatorMetadataSectionsDto`
  - `server/…/agresso-contract/dto/reports-full.dto.ts` *(modified)* — split into `ContractBaseReportsDto` (7) and `ContractFullReportsDto extends … implements IndicatorMetadataSectionsDto` (+10)
  - `server/…/agresso-contract/repositories/agresso-contract.repository.ts` *(modified — **signature only, 2 lines**)*
  - `server/…/session-types/enum/session-type.enum.ts` *(new)*

#### Implementer verification (attempt 1)

| Check | Result |
| --- | --- |
| `npm run build` | Succeeds. No `TS2739`, no `TS2420` |
| `npm test` | **328 suites / 2,095 tests passed** — no regressions |
| Falsifiability check (**KZ-004**) | Made `degree` optional on purpose → `tsc --noEmit` failed with `TS2420`; reverted, clean again. **The safety net was verified to exist before being relied on**, which is what KZ-004 demands |
| `npx eslint` on its four files | Three clean. `agresso-contract.repository.ts` reports **9 pre-existing prettier errors at lines 61–126**, unrelated to its changed lines (54, 1164–1167). The Implementer verified this baseline **independently via a disposable `git worktree` on unmodified `HEAD`** and found the same 9 errors there |

The worktree baseline check deserves note: it is the difference between *asserting* errors are pre-existing and *proving* it, on a package where 26 such errors exist and could easily have been absorbed as this task's noise.

#### Reviewer verdict — `STATUS: PASS`

> All four T-02 acceptance boxes are satisfied — the 7 original fields are inherited unchanged via `extends`, the 10 new sections are non-optional `MetadataCountDto[]` with names matching design §5 exactly, the repository edit is import + return type only, and `tsc`/eslint/the touched suites are clean. The one addition beyond design §3.1's literal wording (`IndicatorMetadataSectionsDto`) is the mechanism T-02's own "Evidence that does NOT count" clause demands, and I verified it enforces rather than merely documents the contract.

**Independent verification the Reviewer ran** (it did not take the report on trust): `npx tsc --noEmit -p tsconfig.json` clean, zero diagnostics · `npx jest src/domain/entities/agresso-contract` → **5 suites / 122 tests passed**, including `agresso-contract.repository.spec.ts` and `agresso-contract.service.spec.ts`, the two most exposed to the signature change (**R-IMC-007 AC.3** — passing unmodified) · reproduced the `implements` guarantee **out-of-tree** with this repo's own `tsc`, which failed with `TS2416: Property 'degree' … Type 'M[] | undefined' is not assignable to type 'M[]'`. No repo file was modified during the audit.

*(The Implementer observed `TS2420` and the Reviewer `TS2416` — different positions in the same check, both genuine. The guarantee bites either way.)*

#### The Reviewer's adjudications on the Leader's flagged questions

| # | Question | Verdict |
| --- | --- | --- |
| 1 | Is `IndicatorMetadataSectionsDto` a legitimate means or scope beyond design §3.1? | **Legitimate, plainly.** T-02's own "Evidence that does NOT count" clause *orders* the non-optional shape to be assertable **by construction**, and a class alone cannot do that — nothing stops a later task adding `?`. The interface is the minimum mechanism that discharges that order; it is compile-time-only (erased, no runtime surface, no new Swagger model, no wire-contract change), lives in the file §3.1 designates, and adds no class to the DTO inventory |
| 2 | R-IMC-007 AC.1 — inherited or re-declared? | **Inherited.** Verified against `git show HEAD:…/reports-full.dto.ts`: the diff changes only the class declaration line; all 7 fields and their `@ApiProperty` decorators are unmodified context lines. **DD-3's structural protection holds** |
| 3 | R-IMC-007 AC.2 — all 10 non-optional? | **Yes** — definite assignment (`field!: MetadataCountDto[]`), none optional or nullable, and `implements` turns optionality into a compile error rather than a convention |
| 4 | Field names exact? | **Character-for-character** against design §5's table: `innovation_nature`, `innovation_type`, `innovation_readiness`, `oicr_maturity`, `policy_type`, `policy_stage`, `session_format`, `session_type`, `gender_distribution`, `degree`. T-03/T-04/T-06 and the client interface can key off these safely |
| 5 | DD-4 compliance? | **Clean.** Correct path, doc-comment citing `1727119632564-InsertDataControl`, mirroring `DegreesEnum`. **Values verified against the migration itself:** `INSERT INTO session_types (session_type_id, name) VALUES (1, 'Training'), (2, 'Engagement')`. Exactly one new enum directory; **no duplicate `SessionFormatEnum`/`SessionLengthEnum` created** — revision 1's mistake did not recur |
| 6 | R-IMC-012 AC.1 scope boundary? | **Respected.** `@ApiProperty` on all 10 new fields and `MetadataCountDto`'s 3; `agresso-contract.controller.ts` absent from the diff, so no `@ApiOkResponse` leaked in from T-09. R-IMC-007 AC.4 also holds — no version bump, no routing change |

**On the signature-only edit the Leader had already verified**, the Reviewer agreed and went further: it confirmed **no consumer breaks** — `getFullContractReports` is awaited by `agresso-contract.service.ts:208-209`, which declares no explicit return type and therefore widens by inference, and no spec or other module references `ContractFullReportsDto`.

#### Implementer's `Not Done / Assumptions` — carried verbatim

> - I found pre-existing **untracked** files `…/agresso-contract/utils/gender-distribution.util.ts` and `.spec.ts` already in the working tree at session start (T-05 scope, not T-02). I did not create, modify, or delete them — during an aborted `git stash push` command (bad `-m` flag syntax) they were transiently staged as `A` by git's internal stash mechanics; I ran `git restore --staged` on them immediately to return them to their original untracked state with contents unchanged. No file content was altered by this incident — confirmed via `git status`/`git diff` before and after.
> - I assumed the 10 section field names/order match `requirements.md` §4.1 exactly (`innovation_nature`, `innovation_type`, `innovation_readiness`, `oicr_maturity`, `policy_type`, `policy_stage`, `session_format`, `session_type`, `gender_distribution`, `degree`) — this is what design §5's field table specifies, and is the assumed contract that T-03/T-04/T-06 will need to populate.
> - Scope fence respected: no query logic, gender util, service composition, Swagger `@ApiOkResponse`, or client files were touched.

**Leader adjudication:** bullet 1 is the **E-05.1 / RB-8 collision, disclosed by the agent that caused it** — the disclosure is what made it cheap to verify (contents intact, 294 lines, checksum taken) and is exactly the reporting behaviour the `Not Done / Assumptions` field exists to surface. Bullet 2's assumption was **independently confirmed** by the Reviewer against design §5, so it is closed, not carried. Bullet 3 is a confirmation. **No scope remains owed.**

#### `ADVISORY` findings (4R lenses) — recorded, non-gating, **not converted into tasks**

| Lens | Finding |
| --- | --- |
| **Readability / citation accuracy** | The doc-comment at `reports-indicator-metadata.dto.ts:31` attributes the phrase *"Evidence that does NOT count"* to `design.md` **DD-3**. That clause is in `tasks.md` § T-02; DD-3 says only that the merge step is test-gated, not structurally guaranteed. Trivial in isolation — **but `tasks.md` RB-1 names "a correction record asserting more than the source supports" as this spec's recurring failure mode across three judgment rounds, and this is that shape exactly.** Escalated to the owner rather than fixed on Leader initiative (see below) |
| **Risk (sequencing, not code)** | After T-02, `ContractFullReportsDto` is referenced by **nothing** in `server/src` — the repository returns the base type, T-06 owns the composition, T-09 the `@ApiOkResponse`. That is the intended graph, but **until T-06 lands, the enriched contract exists only as a type declaration**; a slip there would leave 10 fields declared and never populated. **Leader is tracking this as a dependency** — legitimate tracking of an approved task, not new scope |
| **Naming** | `IndicatorMetadataSectionsDto` carries a `Dto` suffix while being an **interface**. Harmless today, but if a later task reaches for it where Nest needs a class (an `@ApiExtraModels` entry, a `ValidationPipe` target) the suffix will suggest it works when it cannot. `IndicatorMetadataSections` would signal the constraint |
| **Reliability** | No unit spec covers these files, **correctly** — `*.enum.ts` is coverage-excluded and the DTOs carry no logic; the runtime `[]` assertion belongs to T-07. No gap to close here |

#### Requirements covered

R-IMC-007 AC.1, AC.2, AC.4 · R-IMC-012 AC.1 (the `@ApiProperty` half; the `@ApiOkResponse` half is T-09) · design §3.1, §5, §6.4, DD-3, DD-4.

#### Decisions made

| # | Decision |
| --- | --- |
| **O-02.1** | `IndicatorMetadataSectionsDto` accepted as the mechanism T-02's acceptance clause requires, not as scope beyond design §3.1 — Reviewer-adjudicated, with the guarantee verified out-of-tree rather than assumed |
| **O-02.2** | The two advisory-derived items (the misattributed citation here, the three-document wording gap from T-05) were **escalated to the owner as a single decision** rather than folded into any task. `/akili-execute` §2.4 forbids the Leader widening approved tasks from advisories, and having declined the T-05 one on that basis, applying the rule inconsistently to a smaller item would be worse than applying it strictly |

#### Issues encountered

| # | Issue |
| --- | --- |
| **E-02.1** | The malformed `git stash push` → see **E-05.1** and **RB-8**. Disclosed by this Implementer in its own report |

#### Final verification

`tsc --noEmit` clean · full server suite **328 / 2,095 green** · `agresso-contract` suites **5 / 122 green** · eslint clean on the three new/rewritten files, with the repository's 9 errors proven pre-existing via a `HEAD` worktree · the `implements` guarantee reproduced out-of-tree.

---

### T-03 + T-04 — Q1 and Q2 union repositories (reviewed jointly)

- **Status:** ✅ **PASS** — one Reviewer PASS covering both, attempt 1 each
- **Date:** 2026-07-30
- **Implementer attempts:** 1 each, run **in parallel with `isolation: worktree`**
- **Why one review for two tasks:** they are one artifact. `tasks.md` lists them separately, but both methods live in one class — **auditing half a class proves nothing.** Recorded so the joint review is a visible decision, not a shortcut.

#### Files changed

| File | |
| --- | --- |
| `agresso-contract/repositories/indicator-metadata-reports.repository.ts` | **new** — Q1 (`getSimpleIndicatorSections`) + Q2 (`getCapacitySharingMetadata`) |
| `agresso-contract/utils/primary-contract-results.util.ts` | **new** — the shared scoping predicate (RB-10) |
| `agresso-contract/utils/primary-contract-results.util.spec.ts` | **new** — its gate |
| `agresso-contract/repositories/agresso-contract.repository.ts` | **modified** — the private method is now a one-line delegate |

#### The single most important outcome: **RB-3 is discharged**

The **CTE-across-UNION-branches pattern executed against the real schema.** It is valid MySQL 8 but had **no precedent in this repository and had never been run**, and DD-1's entire consolidation rested on it — a failure would have been a **Pivot**, not a rework. Q1 resolves in **~25–48 ms** with **exactly 1 parameter bind**; Q2 with **7 placeholders / 7 params** in the expected positions.

#### Live-schema evidence, through the actual class

| Contract | What it proves |
| --- | --- |
| `A1048` | Rich fixture. **All three of T-01's label decisions confirmed in output:** `18:"7. Prototype"` (`CONCAT(level,'. ',name)`), `1:"Level 1: Discourse/behavior ch…"` (`full_name`), `2:"Policy enacted."` (`description`, **not** `"Stage 2"`) |
| `A1001` | No primary results: Q1 returns **all six keys as `[]`** — empty rather than absent or null (R-IMC-007 AC.2, R-IMC-002 AC.3). Q2's `gender_group` returns **3 rows at 0** |
| `G228` | **DC-2 on production data:** the loose filter matches 6 rows (4 of them Training+**Short-term**), the shipped conjunction returns `[4:Other=2]` — the strict number |
| `A1618` | **DC-2 again:** an **Engagement**/MSc row excluded; returns `[PhD=1, BSc=1]` with the id-ASC tie-break applied |
| `A132` | `gender_group` `Non-binary=0` where the column is **NULL on all 7 group rows** — `COALESCE` yields a present row at 0, not a missing category (R-IMC-005 AC.2) |
| Global control | loose `degree_id IS NOT NULL` = **54**, conjunction = **36** — matching T-01's independent measurement exactly |

#### Reviewer verdict — `STATUS: PASS`

> Both methods conform to `requirements.md` §4.1/§4.2 and R-IMC-001…R-IMC-007 AC.2 and to `design.md` §6.1–§6.4 — every join column, label column, filter, enum reference, single-bind property and union-level ordering re-derived from the schema and matched; the Leader's graft is behaviour-preserving (byte-identical scoping SQL on both option paths, eight call sites untouched), and every reported verification reproduces, including the 321/2,041 suite figure.

**What the Reviewer did beyond checking claims:**
- **Re-derived `requirements.md` §4.1 from the schema** rather than trusting it — per `tasks.md` §10's standing instruction after that map was found incomplete three times. **No fourth gap.** It also confirmed `clarisa_innovation_types.code` is `bigint` (so `Number()` is safe), that `gender` has no `id` column, and that `result_id` is `primary: true` on all four fact tables (**R-6 holds** — `COUNT(*)` cannot double-count).
- **Proved the extraction byte-equivalent by hand**, comparing `git show HEAD:` against the util with whitespace made visible — character-identical including indentation, on **both** the default and `includeGeoScope: true` paths, the latter used by the geographic report.
- **Adjudicated the missing `GROUP BY` on the three `gender_group` branches as correct, not a latent bug:** a bare aggregate returns exactly one row regardless of matches, including zero, where `SUM` yields NULL and `COALESCE` makes it 0. **Any `GROUP BY` column would collapse to zero rows for a contract with no group records and silently drop the category** — so this is the only construction satisfying AC.2. Valid under `ONLY_FULL_GROUP_BY`.
- Re-ran everything: `tsc` clean · `eslint` **and `prettier --check`** clean on all three files (adding nothing to the ~26-error baseline) · full suite **321 / 2,041** · targeted run 8 suites / 135 tests.

#### Two residuals where `author ≠ auditor` does **not** hold — declared, not glossed

1. **The graft and the scoping extraction are the Leader's own work.** Two Implementers wrote Q1 and Q2 blind to each other; the Leader merged them, unified the row type, replaced T-04's local `MetadataCountRow` with `MetadataCountDto`, and extracted the shared predicate. That work was **written under no task brief** and was disclosed as such in the review request. The Reviewer audited it and passed it — so it *is* independently audited, which is the one place this residual is discharged.
2. **The real-schema evidence for the grafted class was produced by the Leader who wrote the graft.** The Reviewer has no DB route and could not re-run it. It accepted the evidence because it **cross-checks against T-01's independently-run recon** (the same 54/36 degree split, the same three label strings, the same group-gender dominance) — but it is recorded here as a residual alongside T-01's, **not as independently audited**.

#### `ADVISORY` findings — recorded; the two that were Leader-owned doc currency were **fixed**, not deferred

| Lens | Finding | Action |
| --- | --- | --- |
| **Readability** | `requirements.md` §4.2 still cited `agresso-contract.repository.ts:642-659` — which is now a one-line delegate. **The Reviewer named this as the same failure mode §4.2 exists to prevent:** a reader following the citation never learns where the single source is | ✅ **Fixed.** §4.2 amended to name the util as source of truth and the method as in-class entry point, with the RB-10 history recorded. This is doc currency created by the Leader's own change — not an advisory-derived task, so §2.4 does not apply |
| **Reliability** | **Nothing executable protected the extraction.** Byte-equivalence was proven by hand; `agresso-contract.repository.spec.ts` asserts nothing about `is_primary` / `is_snapshot` / `SELECT DISTINCT`. RB-10 reduced the risk from "two copies drift" to "one copy changes silently" — better, not closed. Fell **outside T-07's declared file list**, so it would have dropped through | ✅ **Fixed.** `primary-contract-results.util.spec.ts` added (5 cases): each filter asserted **individually** (a whole-string assertion would pass with one filter dropped), the single-`?` property, and that the two option paths differ **only** in selected columns. **Mutation-verified:** dropping `is_snapshot` reddens the predicate case; making one path diverge reddens **two**. Justification for the Leader doing this rather than escalating: the untested file is the Leader's own, and the standard applied to Implementers applies to the Leader |
| **Readability** | The util was missing from `tasks.md` §5's `// @akili-spec` list | ✅ Marker added to both the util and its spec |
| **Resilience** | Neither query filters the **lookup** row's `is_active`, so a soft-deleted lookup row still yields a labelled category. **This matches the six pre-existing sections** (e.g. the `clarisa_countries` join), so consistency argues for leaving it | Recorded as a decision, not changed |
| **Reliability** | Three label columns are **nullable** in their entities (`clarisa_innovation_types.name`, `clarisa_innovation_characteristics.name`, `policy_stage.description`) → a NULL yields `name: null` against `MetadataCountDto.name!: string`. No AC requires a fallback and live rows are populated | Recorded; **routed to T-10** — the client interface must not assume non-null. Prefer a client-side fallback over a `COALESCE` that would mint an unlabelled category |
| **Risk (routing)** | **Observability landed here, not in T-06** — both methods already emit the design §9 debug line, which pre-satisfies T-06's own logging acceptance box | Recorded; **T-06 briefed not to double-log**, and **T-08 should read these lines as its measurement source** |
| **Risk** | **Two dead artifacts now wait on one task:** `ContractFullReportsDto` (T-02) and this whole repository are referenced by nothing in `src` until T-06 composes them. A slip in T-06 leaves both declared and never used, with nothing failing | Recorded; tracked as T-06's dependency |
| **Reliability** | `if (!bucket) continue;` is unreachable (section values are SQL literals) and will show as an uncovered branch | Recorded; **do not read it as a coverage signal** in T-07 |

#### Environment findings from the parallel wave

**RB-9 confirmed with hard evidence.** Deleting the two worktree branches showed T-04's sat at **`a25df379`** — an unrelated old `main` commit — while T-03's sat at `53d95a9b`. **T-04 worked on a stale base for its entire run**, which is the single cause of everything it had to duplicate: no `MetadataCountDto`, no `SessionTypeEnum`, and a pre-existing `tsc` error in `test/app.e2e-spec.ts`. T-03 detected the same problem and realigned itself; T-04 did not, and instead recreated what it could not import — correctly flagging every duplicate for the graft. **Neither behaviour was a task failure**; the mechanism handed them a wrong tree.

#### Requirements covered

R-IMC-001, R-IMC-002, R-IMC-003, R-IMC-004 (all AC) · R-IMC-005 AC.1/AC.2/AC.4/AC.6 (SQL half) · R-IMC-006 (all AC) · R-IMC-007 AC.2 · §4.1, §4.2 · gates **DC-1, DC-2 (on live data), DC-12** · design §6.1–§6.4, §9, DD-1, DD-2, DD-4, DD-8.

#### Decisions made

| # | Decision |
| --- | --- |
| **O-34.1** | **Reviewed jointly.** One artifact, one audit — half a class is not auditable |
| **O-34.2** | **The graft preserved both methods' SQL verbatim.** Both were verified against live data; "improving" a proven query is how defects enter code no test covers |
| **O-34.3** | The scoping predicate was **extracted** (owner-authorised, RB-10) rather than made public or left duplicated — one copy, eight call sites untouched, mechanically gated |
| **O-34.4** | The Leader **fixed** the two Leader-owned advisory items (§4.2's stale citation, the missing spec) instead of escalating them. Neither is an approved task widened from an advisory: one is doc currency created by the Leader's own edit, the other is the missing gate on the Leader's own new file |
| **O-34.5** | Worktrees removed and their branches deleted after the graft |

#### Final verification

`tsc --noEmit` clean · `eslint` clean on all new files · full server suite **321 suites / 2,041 tests** green *(this branch's correct baseline — 626 spec files vs `dev`'s 632)* · `utils/` **17 tests** green (12 gender + 5 scoping) · both methods executed against `alliancereportingdb` across five contracts · the new scoping spec mutation-verified in both directions.

---

## Owner escalation: advisory-derived items

**Status: ✅ both items authorised by the owner 2026-07-30 and applied. Recorded below as the decision trail, since the escalation route — not the fix — is the part worth preserving.**

### Resolution as applied

| Item | Applied | Verification |
| --- | --- | --- |
| **2** — misattributed citation | `reports-indicator-metadata.dto.ts` doc-comment now attributes the *"Evidence that does NOT count"* clause to `tasks.md` § T-02, and states DD-3's narrower point separately | Reads correctly against both sources |
| **1** — AC.6 gated jointly with AC.3 | **A second group-only case was added** asserting three **non-zero** categories. The existing AC.6 case was **left untouched**, because it mirrors `requirements.md`'s *Scenario: Group-only project* verbatim (Male=10, Female=4, Non-binary=0) and editing its fixture would have broken that fidelity to close a wording gap | Suite **12/12**. **Mutation-killed:** under a left-biased merge the new case fails alongside AC.6, the mixed scenario, AC.4 and DD-8 — **5 failed / 7 passed**. Util restored byte-identical (checksum `c13397be…` before and after). `tsc --noEmit` clean; `agresso-contract` suites **5 / 123** |
| **1** (wording) | The three-document contradiction — *"all three categories"* vs. AC.3's zero-dropping — is **now moot for the gate** (AC.6 is asserted independently) but the **wording itself is still uncorrected** in `tasks.md` § T-05, `design.md` §10 and `requirements.md` §9 DC-3 | ⬜ **Open.** The gate is closed; the prose still overstates. Left recorded rather than quietly edited across three documents |

**Note on the commit body.** `53d95a9b` states *"this new case is green but its mutation-kill has not yet been run"*. That was accurate when written — the run was interrupted mid-mutation by a branch-change request, and the Leader prioritised restoring the mutated file over completing the check. **The mutation-kill has since been run and passed** (above), so that caveat is discharged. Recorded here rather than by amending the commit, so the sequence stays legible.

### Why these were escalated rather than absorbed (retained for the record)

`/akili-execute` §2.4 forbids the Leader minting a new task from an advisory or widening an approved one — an advisory is the least-vetted evidence in a run, and it is the fastest route from weak evidence to unapproved scope. Both items below are therefore **recorded and escalated, not absorbed**. Bundled into one decision so the owner is interrupted once.

### Item 1 — a spec-text contradiction across three documents (from T-05's review)

`tasks.md` § T-05, `design.md` §10 and `requirements.md` §9 DC-3 all require the group-only fixture to yield *"all three categories with their summed counts"*. But `requirements.md`'s own **Scenario: Group-only project** expects exactly Male=10 and Female=4 with Non-binary at 0, and **AC.3 mandates dropping zero totals**. So *"all three"* is **literally unsatisfiable alongside AC.3** whenever the third category is zero.

- **The shipped code is correct** — it follows the scenario, and the mutation kill proves the gate works.
- **What is genuinely missing:** no test asserts **three non-zero** categories surviving a group-only merge. AC.6 is currently gated jointly with AC.3 rather than independently.
- **Cost to close:** add `Non-binary: 2` to the existing group-only fixture, or a second group-only case — a few lines — plus a wording correction in three documents.
- **Why it is not free:** it touches an approved, completed, Reviewer-passed task, and the wording lives in a `requirements.md` acceptance criterion.

### Item 2 — a misattributed citation (from T-02's review)

`reports-indicator-metadata.dto.ts:31` attributes the phrase *"Evidence that does NOT count"* to `design.md` **DD-3**. It is in `tasks.md` § T-02. One line.

**Why this small thing is being escalated rather than silently corrected:** `tasks.md` **RB-1** names *"a correction record asserting more than the source supports"* as this spec's recurring failure mode — **four occurrences across three judgment rounds**, and the reason the design's judgment lineage terminated `ESCALATED`. A citation pointing at a document that does not contain the quoted rule is that shape in miniature. Leaving it is cheap; leaving it **unrecorded** is how the pattern survived three rounds.

### Options put to the owner

| Option | Effect |
| --- | --- |
| **Authorise both fixes now** | The Leader may touch the two completed tasks' files for these two items only, and correct the wording in the three documents. Re-review scoped to the delta |
| **Authorise Item 2 only** | Fix the one-line citation; leave the AC.6/AC.3 wording gap recorded and open |
| **Defer both** | Both stay recorded here and in `tasks.md`. Nothing is touched. The AC.6 independence gap is a known, accepted hole |
| **Reopen the spec** | Treat Item 1 as a genuine spec gap and amend `requirements.md` AC.6 / DC-3 properly via the Pivot Protocol, which re-runs the budget and approval gate |

---
