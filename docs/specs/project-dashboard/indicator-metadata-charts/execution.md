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
- **Status:** in-progress — **T-01 … T-10 done** (10 of 17). Server tier complete; **the client chain has started.** **The entire server tier is complete, gated, and live-verified.** Nothing on the server side is outstanding: the payload composes, the queries execute against the real schema, all three NFR-IMC-001 bounds are met, the CI gates are mutation-verified, and the OpenAPI schema is proven to render. All three amended NFR-IMC-001 bounds are met, so **design §11's gate on client work is released: T-10 … T-16 are unblocked.**
- **Rework rounds consumed: 1** (T-07 attempt 1 → 2), against a budget of 2–3.
- **Next eligible:** **T-09** (Swagger — needs the app booted, so the DB tunnel must be up), then the client chain **T-10 → T-11/T-12 → T-13 → T-14**, then **T-15** (the T-09 a11y carry-forward), **T-16** (390 px measurement + full suite) and **T-17** (docs).
- **Open items carried forward:** four one-line advisories from T-07's review escalated to the owner and not absorbed (`gender_group` id/name pairing, reorder-brittleness note, `ORDER BY` uniqueness, one stale "below"/"above" pointer); the three-document *"all three categories"* wording gap from T-05; and **RB-11**, the contained credential leak, whose rotation is the owner's call.
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

### T-06 — Sequential composition in the service + query observability

- **Status:** ✅ **PASS** — Reviewer PASS attempt 1
- **Date:** 2026-07-30
- **Implementer attempts:** 1 · run in the **main checkout, no worktree** (single task, no file collision — which also sidesteps RB-9 entirely)
- **Files changed:** `agresso-contract.service.ts` · `agresso-contract.module.ts` · `agresso-contract.service.spec.ts`

#### What landed

`getFullContractReports()` — the existing one-line pass-through at `:208-210` — now: `await` step 1 (the existing repository, body untouched, **8 concurrent**), **then** `await Promise.all([Q1, Q2])` (step 2, **2 concurrent**). Peak `max(8, 2) = 8`, exactly today's value, which is what removes any connection-pool prerequisite from this spec. It also gained an explicit `Promise<ContractFullReportsDto>` return type, the provider registration, and the gender merge.

#### The interpretive question, adjudicated — and why it mattered

The Implementer **flagged rather than asserted** its reading: DD-11 says *"sequentially, not with `Promise.all`"*, so is the **inner** `Promise.all([Q1, Q2])` a violation? It explicitly said "if the Reviewer reads it as also forbidding Q1‖Q2, that's a one-line change."

**The Leader adjudicated it as required-by-design, and asked the Reviewer to FAIL it if it disagreed rather than rubber-stamp.** The Reviewer confirmed and strengthened the case to **five citations**, one of which the Leader had missed:

| # | Source |
| --- | --- |
| 1 | `design.md` §3 diagram: step 2 annotated **"2 concurrent"** |
| 2 | **DD-11** itself: *"Peak becomes `max(8,2) = 8`"* — the `2` is step 2's own peak; sequential Q1/Q2 would make it `max(8,1)` |
| 3 | **DD-1**: *"two keeps step 2 at 2, so the peak stays at the existing 8"* |
| 4 | **`tasks.md` § T-06's own Description** — *"(step 2, 2 concurrent)"*. **The Leader missed this one; the Reviewer found it** |
| 5 | §1's cost model says `T_metadata_**batch**`, and T-08 must clear `T_metadata ≤ 0.5 × T_existing`. Two sequential queries would be `T_Q1 + T_Q2`, **materially raising the bar T-08 must clear** — so the categorical reading would have made DD-11 harder to satisfy than the design's own model assumes |

**The Reviewer also disclosed counter-evidence against its own conclusion** — the behaviour worth naming here. `indicator-metadata-reports.repository.ts:75-79` (written by the **Leader** during the T-03/T-04 graft, not by an Implementer) read *"awaiting **them** sequentially rather than racing them"*, which with "them" = Q1+Q2 asserts the categorical reading. It correctly ruled that an implementer-authored comment paraphrasing DD-11 does not outweigh five unambiguous spec citations — **and correctly identified it as RB-1's failure mode (*a record asserting more than its source supports*) reproduced one layer down.** ✅ **Fixed in the same session:** that doc-comment now states precisely what DD-11 requires, cites all four spec anchors, and records that `T_metadata` is `max(Q1, Q2)` rather than a sum.

#### The scope question, settled by the spec itself

T-06 also modified `agresso-contract.service.spec.ts`, which T-06's *"Files touched (intended)"* does not list and which T-07's does. **Not encroachment:** `tasks.md` **§4 Testing expectations** co-assigns that file to **T-06 and T-07** and names the exact two assertions written (*"asserts sequential composition and the 17-field merge"*). Three further supports the Reviewer identified:
- T-06's own acceptance box requires *"existing `agresso-contract.service.spec.ts` passes"* — **unachievable without editing it**, since the `TestingModule` lacked the new provider and `beforeEach` would fail Nest resolution, reddening the whole suite. The acceptance criterion *forces* the edit.
- T-06's *"Evidence that does NOT count"* clause instructs T-06 directly to assert *"that the second repository is not invoked before the first resolves"* — so the `callOrder` case **is T-06's own mandated evidence**, not borrowed.
- §2's KZ-001 rule (recurrence 5) forbids deferring a gate to a later task.

The *"Files touched (intended)"* list was simply incomplete relative to §4 — and it is labelled *intended*.

#### Verification — reproduced by the Reviewer, plus two mechanical probes it ran itself

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Clean |
| **Type-probe (Reviewer-built, against the real DTO)** | As-implemented shape **compiles**; omitting `gender_distribution` → **`TS2741`**; misnaming it `genderDistribution` → **`TS2561`**. So the explicit return type makes a missing or misnamed section a **real compile error**, not a convention. **This also discharges T-05's carried debt mechanically:** `GenderDistributionRow[]` → `MetadataCountDto[]` is assignable, no adapter needed |
| **Mutation table (Reviewer-built) on the `callOrder` gate** | As-implemented → **passes**. One `Promise.all` spanning all three → **FAILS**. Overlapped `.then` / deferred await → **FAILS**. So it reddens for **both** violation shapes T-06's acceptance box names — a real gate, not decorative |
| Real schema, `A1048` | 17 fields. Raw `individual [Male=5, Female=2]` + `group [Female=470, Male=104, Non-binary=1]` → merged **`[Female=472, Male=109, Non-binary=1]`**, sorted `count DESC`. **This matched a cross-check the Leader supplied in advance**, making it a pass/fail contrast rather than a self-assessment |
| Real schema, `A1001` / `A132` / `G228` / `A1618` | All 10 sections `[]` on the empty contract · `[Female=28, Male=25]` with the zero-total dropped · degree sections `[4:Other=2]` and `[PhD=1, BSc=1]` **matching `execution.md` § T-03+T-04 verbatim** |
| Leak check | `gender_individual` / `gender_group` **structurally excluded** via rest-destructuring (the rest binding's *type* is the 3-field `Pick`), double-gated by an explicit `not.toHaveProperty` and an exact 17-key set assertion |
| `eslint` + `prettier --check` on the 3 files | Clean — adds nothing to the ~26-error baseline |
| Full suite | **322 suites / 2,051 tests** green. Baseline was 322 / 2,046; the Reviewer verified the **+5** arithmetically (22 → 27 `it()` in that spec, no spec files added or removed) |
| Working-tree scope | `git status --porcelain` shows only the 3 files under review |

**Also checked, and it was the more dangerous thing:** `IndicatorMetadataReportsRepository` injects only `DataSource`, so constructor-injecting it into `AgressoContractService` **cascades no REQUEST scope**. That matters because this exact constructor already documents a hazard — `OpenSearchAgressoContractApi` is lazily `moduleRef`-resolved to avoid a `forwardRef` cycle. A repository with a transitive `CurrentUserUtil` dependency would have made this a regression; this one does not.

#### `ADVISORY` findings — one is a real gate gap

| Lens | Finding | Routing |
| --- | --- | --- |
| **Reliability — R-1, the important one** | **`callOrder` cannot distinguish `Promise.all([Q1,Q2])` from `await Q1; await Q2`** — the Reviewer proved both produce the identical array. So the **"step 2 = 2 concurrent"** property that DD-1's arithmetic *and* T-08's bound both rest on is **currently ungated.** A future refactor could sequentialise step 2, inflate `T_metadata`, and leave the suite green | **Owed to T-07** (~6 lines): assert both Q1 and Q2 are *invoked* before either *resolves*. Recorded in `tasks.md` § T-07 |
| **Risk — R-2** | **`T_metadata` is `max(Q1, Q2)`, not `Q1 + Q2`**, because step 2 is a `Promise.all` — and no log line records step 2's own wall clock. Computing it as a sum would inflate the number and could **manufacture a false breach of a decision the spec says a breach invalidates** | **Recorded in `tasks.md` § T-08's implementation notes** — this must be in T-08's brief |
| **Readability — R-3** | The repository doc-comment contradicting §3's "2 concurrent" | ✅ **Fixed this session** (above) |
| **Resilience — R-4** | T-05's `NaN` hazard in `toSafeCount` still stands, but this diff feeds the util exactly the shape it was written for and **widens nothing** | No action; debt stays visible |
| **Readability — R-5** | The method's doc-comment is 30 lines against 25 lines of code — unusual, and correct: it is the only artifact explaining why DD-11 is load-bearing rather than stylistic, and carries the explicit *"Do NOT wrap step 1 and step 2 in a single `Promise.all`"* prohibition | Should survive refactors verbatim, same reasoning as the gender util's header |

#### Requirements covered

R-IMC-007 AC.1, AC.2 (type + source level; runtime CI coverage of the empty case routed to T-07) · design §3, §9, **DD-11**, DD-1, DD-3 · enables **NFR-IMC-001**'s measurement (T-08).

#### Decisions made

| # | Decision |
| --- | --- |
| **O-06.1** | The inner `Promise.all([Q1, Q2])` is **required by the design**, not tolerated — five citations, Reviewer-confirmed. Sequentialising step 2 would raise the bar T-08 must clear |
| **O-06.2** | The service-spec edit is **spec-assigned** by `tasks.md` §4, not encroachment. **T-07 must EXTEND, not rewrite** — specifically, it must not touch or "consolidate" the `callOrder` block, which is DD-11's only mechanical guard |
| **O-06.3** | The logging box is satisfied by T-03/T-04's existing lines; no second layer added. Design §9 specifies content, not layer, and the repository is where timing is attributable — which is §9's stated purpose and T-08's need |
| **O-06.4** | Provider registered but **not exported** — zero consumers outside the module; exporting an unconsumed provider widens the module's surface for nothing, and it is a one-line reversal |
| **O-06.5** | The Leader fixed the repository doc-comment drift it had itself introduced during the graft. Same category as §4.2's stale citation: doc currency on the Leader's own edit, not an approved task widened from an advisory |

#### Issues encountered

| # | Issue |
| --- | --- |
| **E-06.1** | The Leader's own graft introduced a doc-comment that contradicted the design and would have led a future reader to "fix" the inner `Promise.all` — landing exactly the sequential shape R-1 cannot catch. Found by the Reviewer, fixed same session. **Notable that it was found by the auditor and not by the author**, which is the argument for the gate |

#### Final verification

`tsc` clean · `eslint` + `prettier` clean on all three files · full suite **322 / 2,051** green · both the type-probe and the composition mutation-table run independently by the Reviewer · real-schema composition verified across five contracts with the gender arithmetic matching a pre-supplied cross-check exactly.

---

### T-08 — Measure NFR-IMC-001 — `[~]` BLOCKED, not failed

- **Status:** `[~]` **blocked on environment. Zero samples collected. Nothing measured.**
- **Date:** 2026-07-30
- **Implementer attempts:** 1 (reached the blocker, did not proceed past it)
- **Reviewer:** **not spawned** — there is no measurement to audit. Spawning one would burn a review round on an empty result.

#### The blocker

The DB host is a private `192.168.x` LAN address and **the VPN tunnel is down**:

| Probe | Result |
| --- | --- |
| TCP connect to 3306 | **Hangs** — Implementer timed out on 3 attempts; **Leader independently confirmed** (60 s, no response). A closed port refuses immediately; a blackholed route hangs, which is what this is |
| ICMP | 100 % packet loss |
| Interfaces | `scutil --nwi` shows only `en0` (local Wi-Fi) with an IPv4 route. **No `utun` tunnel up.** FortiClientVPN's process is running but not tunnelling; GlobalProtect also installed |

**It was reachable earlier in this same session** — T-01's recon and T-03/T-04/T-06's real-schema runs all executed against it, the most recent about 35 minutes before T-08 started. So this is **transient, not structural**, and almost certainly one VPN reconnect away.

#### Why this is recorded as blocked rather than as a verdict

The task's acceptance box demands one of exactly three words. **None of them applies**, and that distinction is the point:

- **`pass`** or **`breach`** would be **fabrication** — there is no distribution in either arm.
- **`inconclusive`** is DC-9's word for *"three runs vary by more than the effect being measured, so the number is not evidence."* That presupposes numbers. **Zero samples is a stronger and different state**, and collapsing it into DC-9's inconclusive would make a *methodological* verdict out of an *environmental* blocker — losing the fact that the measurement is still completely open.

**DD-11 therefore remains contingent and unverified.** `T_metadata ≤ 0.5 × T_existing` is exactly as unproven as it was before this task ran. The spec ordered this measurement early precisely so a breach would cost the server PRs and not the client ones — **that ordering still holds, and the client work should not start until this resolves.**

#### What the Implementer got right

It **refused to approximate** and said so in those terms, extending the task's own rule (*"if you cannot measure without touching production code, say so instead of doing it"*) to connectivity. It then spent its remaining effort on groundwork that makes the re-run a single pass rather than a restart: both arms located and confirmed, both `_debug` line positions found, the `max(Q1, Q2)` derivation planned two independent ways, and — the useful part — **it verified from source that constructor stubs suffice to run the real methods with no production-code changes**, listing exactly which dependencies are off the call path. That is recorded in `tasks.md` § T-08.

It also **created one throwaway harness file, used the project's own `getDataSource()` rather than hardcoding anything, and deleted it** — `git status --porcelain` clean, verified by the Leader. Contrast with RB-11: same task type, opposite handling, because the brief wording was fixed.

#### Proportionate disclosure

The Implementer proactively flagged that a `ping` echoed the **host IP** once into its tool output. Recorded because it volunteered it, and the volunteering is the behaviour worth reinforcing — **but the proportionality should be stated plainly: a private LAN address is not a credential.** No username or password was printed and nothing was written to a file. This is not an RB-11-class event and should not be filed as one.

#### Not Done

Everything. No contract chosen, no samples, no ratio, no spread. **Nothing here may be read into a status as progress on the measurement.**

#### To unblock

Reconnect the VPN routing to `alliancereportingdb`, confirm with a read-only probe, then re-run using the harness design recorded in `tasks.md` § T-08. **This is an owner action** — the tunnel requires interactive login/2FA, which is not something an agent should drive on the owner's behalf.

---

### T-07 — Server specs: Q1/Q2 grouping, binding, scoping, ordering — ✅ **PASS on attempt 2**

- **Status:** ✅ **PASS** — Reviewer PASS on attempt 2. **1 rework round consumed** (budget allows 2–3).
- **Date:** 2026-07-31
- **Files:** `indicator-metadata-reports.repository.spec.ts` *(new, 14 tests)* · `agresso-contract.service.spec.ts` *(modified, **+92/−0**, additions only)*

#### Reviewer verdict — attempt 2

> Both attempt-1 FAIL issues are closed — the SQL-semantics tests give DC-2, the AC.2 "excluded" half and the union-level ORDER BY a real CI gate read off `dataSource.query.mock.calls[0]`, and the reworded comments now claim only what a mocked DataSource can see. The branch-index pinning genuinely generalises to any literal pair (verified structurally, not just for the demonstrated swap), and nothing regressed: the T-06 DD-11 `callOrder` block and the DC-12 fixture are untouched.

#### The fix was finer than the Leader specified

The Leader's remediation said *"assert each query's SQL emits its expected `'<section>' AS section` literals."* **That would have been insufficient** — a whole-SQL `toContain("'innovation_nature' AS section")` **passes under a cross-wire**, because both swapped literals still exist somewhere in the text. The Implementer instead **split the squashed SQL on `' UNION ALL '` and pinned each literal to its own branch index**, paired with that branch's `INNER JOIN … = f.<fk>` (or, for the three join-less `gender_group` branches, its distinct `COALESCE(SUM(…))` column).

**The Reviewer verified the generalisation argument structurally rather than accepting it:** Q1 splits into **6** segments, Q2 into **7**, each containing **exactly one** section literal and **exactly one** unique anchor — a bijection over distinct values, so **any** permutation across branches reddens at **both** endpoints, not merely the demonstrated `innovation_nature`/`innovation_type` pair. It also confirmed `buildPrimaryContractResultsScopeSql()` emits no `UNION`, so the CTE cannot perturb the split.

#### Both gaps independently re-verified by the Leader

| Mutation | Attempt 1 | Attempt 2 |
| --- | --- | --- |
| Cross-wire the two section literals **in production SQL** | **12/12 GREEN** — the gap | **1 failed / 13 passed**, naming the new SQL-semantics test |

Both runs were performed by the Leader on production code with a checksum-verified restore. The claim that the gap is closed is therefore **measured, not reported**.

The Implementer's own four mutations were all applied to **production** code this attempt — the correction that mattered, since attempt 1's headline mutation had been applied to the spec's own fixture.

#### `ADVISORY` findings — recorded, none blocking, **none converted into work**

| Lens | Finding |
| --- | --- |
| **Reliability** | **One unpinned pairing inside `gender_group`.** `toContain` is positionless *within* a segment, so `<n> AS id, '<Label>' AS name` is not anchored to its own `COALESCE(SUM(…))`. Swapping `1 AS id, 'Male'` with `2 AS id, 'Female'` between branches while leaving the SUM columns would mislabel the counts and stay green. **Correctly scoped by the Reviewer as DC-4** — wrong-but-valid label mapping — which `requirements.md` §9 **explicitly declares has no jest gate**. So it is not a T-07 hole; it is the one cross-wire this structure cannot see, and the spec already accepted that class of risk |
| **Resilience** | **Reorder-brittle but fail-closed.** A semantically neutral branch reorder would redden up to 12 assertions, and a future `UNION ALL` inside the scope CTE would break `toHaveLength` first. Both fail *closed*, so this is maintenance cost rather than a correctness gap — worth one docblock line noting the indices are load-bearing |
| **Readability** | **`ORDER BY` is gated for presence, not for "once at union level."** The Reviewer measured exactly one occurrence in each production query, but the assertion would also pass on a per-branch variant — which MySQL rejects, so real-schema execution catches it. `expect((squashed.match(/ORDER BY/g) ?? []).length).toBe(1)` would make the comment's "applied once" claim self-gating. **Also: the comment at `:236` says "the SQL-text assertion *below*" when it is above** (`:171` in Q1, `:354` in Q2) |

**The `:236` pointer deserves a note.** It is one wrong word — but it is a false internal reference in the very file that was FAILed twice for *asserting more than its source supports* (RB-1's pattern). The Leader **did not fix it**: doing so would widen a task that has now passed, on the basis of an advisory, which `/akili-execute` §2.4 forbids. Having declined two earlier advisories on exactly that reasoning, applying the rule inconsistently for one word would be worse than the word. **Escalated to the owner alongside the other two — all three are one-line changes if wanted.**

#### Requirements covered

R-IMC-001 … R-IMC-004, R-IMC-006, R-IMC-007 AC.2 (runtime) and AC.3 · gates **DC-1**, **DC-2**, **DC-12** now CI-durable · **NFR-IMC-004** held (coverage 83.32 % global vs the 60 % floor).

#### What is still owned elsewhere, by design

DC-2's actual **row-level** exclusion, and AC.2's row-level NULL exclusion, remain **real-schema-proven in T-03/T-04** (`G228` 6 → 2, `A1618` excludes an Engagement/MSc row, global 54 → 36) rather than fixture-proven — a mocked `DataSource` cannot execute SQL. What T-07 now adds is the **CI-durable guard on the SQL that produces those exclusions**, which is the part a future edit could silently break. Evidence and gate are different things, and this task's job was the gate.

#### Final verification

`tsc --noEmit` clean · `eslint` clean · full suite **323 suites / 2,067 tests** green (+2 vs attempt 1) · module run 7 suites / 149 tests · four production-side mutations killed with verbatim red and checksum-verified restores · the Leader's independent re-verification of the previously-green cross-wire.

---

### T-07 — attempt 1: **Reviewer FAIL** (retained as the rework trail)

- **Date:** 2026-07-31 · **Attempt:** 1 of 3 · rework in progress
- **Runtime note:** the **first Reviewer spawn failed on a harness stall** (no progress for 600 s after its opening line). Retried once per `/akili-execute`'s runtime-failure rule with a tightened, targeted brief; the retry completed. **The Leader did not review inline** — that would break `author ≠ auditor`, and a harness failure does not suspend a correctness constraint.

#### Reviewer verdict — `STATUS: FAIL`, two issues (recorded unparaphrased)

**Issue 1 — DC-2 has no CI gate at all.** The `params` array in the repository is a **standalone literal, not derived from the SQL**. Deleting `AND f.session_length_id = ?` — or the whole degree conjunction — from the query text leaves that literal untouched, so **every** assertion in the new spec stays green: `toEqual([...7 params])`, `params[1]/params[2]`, and `toContain(buildPrimaryContractResultsScopeSql())`. mysql2 ignores surplus values, there is no e2e for this route, and the service spec mocks the repository — nothing in the suite reddens. **The same structural hole silently covers two other SQL-owned ACs the task claims:** R-IMC-001/002/003 **AC.2's "excluded" half** (an `INNER JOIN` → `LEFT JOIN` mutation on any lookup is realistic and currently invisible; only the "no null-named entry" half is asserted) and the union-level `ORDER BY section, count DESC, id ASC`.

*Violated:* `tasks.md` § T-07 header (*"gates DC-1, DC-2"*) and its implementation note (*"The degree fixture must contain an **Engagement** row **and** a **Short-term** row … Without both, the conjunction is unproven"*); `requirements.md` §9 DC-2; and **`tasks.md` § T-06's carried note, which had already anticipated and rejected this exact defence** — *"those contracts are not a test asset and cannot gate CI."*

**Issue 2 — the file docblock and Q1 fixture comment assert something false.** They claim the interleaved fixture means *"a cross-wired section discriminator would misroute a row into a section whose fixture value it does not match."* Under a mocked `DataSource` that is untrue: the `row.section` the bucketing loop reads comes **from the fixture**, so swapping branch literals in the production SQL is undetectable. What the interleaving actually gates is that the loop makes no contiguous-run assumption, and that a mutated key in the `sections` initializer drops a section. *Violated:* T-07's "Evidence that does NOT count"; and **RB-1's recurring failure mode — a record asserting more than its source supports.**

#### The Leader's additional finding — worse than Issue 2's framing, and proven not inferred

Issue 2 reads as a comment-wording defect. It is more than that: **the Implementer reported mutation (i) — "cross-wired `innovation_nature`/`innovation_type` discriminators in the repository" — as a killed mutation, and that evidence is circular.** Production code buckets on `row.section` (`indicator-metadata-reports.repository.ts:217`), which the fixture supplies, so no production-side change to those literals can reach the assertion. The red output it reported (`- "Technological" / + "Product"`) is what mutating the **spec's own fixture** produces.

**The Leader proved it rather than arguing it:** cross-wired the two section literals **in the production SQL**, ran the spec → **12/12 GREEN**; restored, checksum verified identical.

So attempt 1's headline evidence for **DC-1/DC-12** is not evidence. This is precisely **KZ-004**'s failure — *a named safety net that does not apply is worse than none, because everyone believes they are covered* — and it is the second time this session that a mutation claim needed independent checking.

#### What attempt 1 did get right — carried forward, do not redo

Ordered `toEqual` throughout with no `toContain`/`arrayContaining` anywhere; the DC-12 distinct-data fixture with all 6 Q1 and all 7 Q2 branches non-empty, distinct and interleaved; `[]` for empty sections in both queries plus `gender_group`'s three always-present literals; the single-bind assertion; and **the verbatim-scope-predicate assertion, which the Reviewer confirmed is a real gate, not a tautology** — it reddens if a method reintroduces a local scoping join or calls with wrong arity, and drift *inside* the util is covered by its own clause-by-clause spec. Delegation + content is a complete pair. The **+92/−0** service-spec insertion is also confirmed clean, and **DD-12's gate is genuinely closed** — the Reviewer verified analytically that sequentialising step 2 reddens the new concurrency test while `callOrder` stays green.

#### On the cause of Issue 1 — the Leader's brief

My brief instructed the Implementer to prefer the params array over SQL-text matching, calling text matching brittle. **The Reviewer settled that against me using this repo's own convention:** `utils/primary-contract-results.util.spec.ts:24-33` already asserts `toContain('rc.is_primary = TRUE')`, `toContain('r.is_snapshot = FALSE')` clause by clause. **The Leader wrote that file earlier in this same session** — so the brief warned against a pattern the Leader had itself established one file over. Two 25-character predicates on load-bearing semantics are not a query snapshot.

---

### T-13 — Host wiring: bands, visibility, expansion contract, empty states — ✅ **PASS**

- **Status:** ✅ **PASS** — Reviewer PASS attempt 1 · **Date:** 2026-07-31 · the largest client task, and the first that produces something a user sees
- **Files:** `project-dashboard.component.ts` · `.html` · `.spec.ts` (one fixture line)

#### §7.2 / DD-10 implemented in the correct direction — both known wrong shapes absent

```ts
metadataCardVisibleLimit(sectionKey) {
  return this.expandedMetadataCards().has(sectionKey) ? null : COLLAPSED_ITEM_LIMIT;
}
```

`[visibleLimit]` is **bound** (so shape (a) — unbound, where `null` *is* the expanded state and produces an out-of-flow overlay plus a stuck "Show less" — is absent) and it is **not a magic large number** (shape (b), which still renders a toggle because `canExpand` reads item count alone). `(expandToggled)` is **handled**. Per-card state is a `signal<ReadonlySet<…>>` keyed by `sectionKey`, replaced not mutated; band collapse is a separate set keyed by `indicatorId`, empty by default so bands default **open**.

**The Reviewer's strongest observation:** the bindings are **character-for-character the same contract** as the four Chunk A ranked cards at `:159-198`. The correction the design needed was to *reuse* proven machinery, and that is literally what landed.

#### R-IMC-009 AC.1/AC.3 — structurally guaranteed, not merely untested

The Leader asked whether these DOM properties needed mechanical proof *now*, since the mapper alone cannot guarantee them. The Reviewer's answer: **the template can, and does.** There is exactly one rendering path — `@if` + `@for` — and **no `display:none`, no `[hidden]`, no CSS-hiding branch anywhere in the added markup.** So the failure mode the "evidence that does not count" clause guards against (a band hidden by CSS rather than absent) is **structurally unreachable**, not just unasserted. AC.3's `@if` wraps the **heading itself**, not merely the band list.

#### DD-6 held — and `description` was verified to actually render

`ProjectDashboardCardComponent` untouched. The Gender provenance note (R-IMC-005 AC.5) and Degree filter-scope note (R-IMC-006 AC.4) ride the card's **existing `description` input** — the only text slot DD-6 leaves available.

**The Reviewer checked the part that matters:** `project-dashboard-card.component.html:9-10` renders `description` in the header, **above** the loading/error/empty branch — so **the Degree note still shows on an empty Degree card.** An input that existed but rendered nothing would have satisfied AC.5's letter and displayed nothing.

#### The task/gate split — legitimate, with a consequence the Leader must hold

T-13 declared its seven boxes satisfied *"by inspection"* and **explicitly declined to claim mechanical proof**, because `tasks.md` §4's file table assigns the host spec to **T-14**. The Reviewer confirmed the split: §2's *"every spec lands with the behaviour it gates"* is satisfied by §5's Chunk 3 landing T-10 … T-14 in **one PR** — it constrains the PR, not the task boundary. T-13's own gates are `lint` + `build`, both green.

**The consequence, recorded so it cannot be lost: T-13 must not be read as independently verified.** Boxes 5–7 are proven now; **boxes 1–4 are structurally sound with their mechanical proof owed by T-14.** If T-14 drops or softens any of those four, **T-13's boxes go unproven with no owner.**

#### The fixture change — right fix, imperfect value

The Implementer changed `GET_ResultsCount`'s `indicator_id: 1` → `10`, because **`1` is the real `CAPACITY_SHARING_INDICATOR_ID`** the mapper now keys on; with `1`, the fixture spawned a real 4-card band and broke Chunk A's R-PDB-007 title test (4 → 8 titles).

**Isolating the fixture was correct.** The alternative — relaxing an **archived Chunk A** assertion to tolerate a superset — is worse. No assertion was weakened anywhere; only fixture *input* changed.

**But `10` matches no real indicator.** Ground truth from `1727208057174-InsertIndicators.ts` + `indicators.enum.ts`: ids are **1–6** only. **`3` (Knowledge Product) or `6` (Innovation Use) would have been band-free *and* realistic** — behaviourally identical, strictly better. Mitigating: that fixture was never realistic (its sibling is `indicator_id: 99`, a deliberate fallback case, and `'Output'` matches no real indicator name); it exercises the ranking/naming mechanism, not the taxonomy. **Advisory, not rework.**

#### ⚠ A SECOND hard prerequisite for T-14, found before T-14 started

`setup(contractId, options)` accepts only `{ isAdmin, emptyOverview, rejectOverviewFetch }` — **no `indicators` hook** — and `apiMock.GET_ResultsCount` is **hard-coded inside it**. So **T-14 cannot produce a single band** without adding one. Same failure shape as the first prerequisite: without it, ten per-instance assertions bind to nothing.

**This is the second time a review has found a T-14 blocker before T-14 ran.** Both are now recorded in its ⚠ block.

**And one way the change *helps* T-14:** the shared fixture now yields **zero bands** (10/99/null match none of 1,2,4,5), and that default state **is R-IMC-009 AC.3** — no heading at all. T-14 gets that case free and should assert it against the default fixture.

**Superset hazard for T-14:** once bands exist, `getCardDebugElements()` returns ranked **plus** metadata cards. Its ten assertions must key off the existing `getCardByTitle()` helper and **never index or count.** And if T-14 ever re-points the *shared* fixture at a band id, R-PDB-007 breaks again — the durable fix then is to scope that query to the ranked-card container, not to relax the array.

#### Also confirmed

`[color]="band.color"` passed ✓ · all five primitives individually ✓ · `cardCount = band.cards.length`, so the 4-card Capacity Sharing band deterministically hits `imb-grid-wide` ✓ · placement below *Result analytics* and before *Pending revision*, matching the section above's two-element shape ✓ · **R-IMC-011 AC.4** loading/error/retry bindings **identical** to the ranked cards, no new pattern ✓.

**W-7 satisfied:** the copy is *"No data is recorded for this field across this project's N result(s)."* — it states **no reason**.

**The layout judgment call is exact, not a stretch.** The Reviewer walked §4.1's category counts (4, 4, **10**, 3, 3, 3, 2, 2, 3, 4): every section except `innovation_readiness` is ≤ 4, and readiness is 10 *and* carries the longest labels (`CONCAT(level,'. ',name)`). §7.4's rule — *columns for ≤ 4, rows for 5+ or long labels* — maps onto that table with **no section sitting on the 5 boundary.**

#### `ADVISORY` — three, all hand-offs rather than rework

| # | Finding | Disposition |
| --- | --- | --- |
| 1 | Fixture id `10` is not a real indicator; `3` or `6` were available | Recorded. Behaviourally identical — not worth a round trip |
| 2 | **The empty-state phrase binds its claim to `N`**, and `N` (`count_results`) is *precisely* the population that diverges from the `is_primary = TRUE` aggregation. In the all-non-primary case the sentence is arguably false in a **second** way, even though it asserts no reason. Suggested separated form: *"No data is recorded for this field on this project. (N results.)"* | **Surfaced to the owner now rather than at the visual pass** — because **T-14 is about to write assertions against this exact wording**, and changing copy afterwards invalidates them. Sequencing, not aesthetics |
| 3 | T-14's second prerequisite (`setup()` needs an `indicators` hook) | ✅ Recorded in `tasks.md` § T-14's ⚠ block |

---

### T-12 — attempt 2: ✅ **PASS**. Both FAIL issues closed.

- **Date:** 2026-07-31 · **rework round 2 of 3 for T-12; 2 of 2–3 budgeted for the whole spec**
- **Files:** the four band-component files · `src/styles/colors.scss` · `client/research-indicators/README.md` · this spec's `design.md` §7.6

#### Issue 1 closed — the dot is data-driven

A fifth primitive input `color = input<string>('')`, bound `[style.background-color]="color() || null"`, with the SCSS token retained as the **unbound fallback**. The Reviewer confirmed it is **byte-for-byte the live idiom** already used one section above at `project-dashboard.component.html:253`, so no new mechanism was invented. **No hex entered component code** — the `.ts`/`.html` carry none, the `.scss` hexes are comments only, and the two in the spec are fixture *input data*, not styling. The `|| null` matters: it **removes** the inline style rather than writing `""`, so the token actually governs the unbound case. **Mutation (a):** unbinding it reddens exactly one assertion, and the Reviewer confirmed that is the only possible outcome, since jsdom leaves `style.backgroundColor === ''`.

#### Issue 2 closed — and the number is now computed three independent times

New token pair `--ac-chip-blue-bg` / `--ac-chip-blue-fg` in `colors.scss`, with a `[data-theme='dark']` override, documented in the client README and recorded in `design.md` §7.6.

| Pair | Implementer (script) | Leader (by hand) | Reviewer (recomputed) | AA 4.5:1 |
| --- | --- | --- | --- | --- |
| Light `#345b8f` on `#e8f0f7` | 6.00 | ~6.0 | **6.0012** | ✅ |
| Dark `#b0c4dd` on `#253448` | 7.09 | ~7.2 | **7.0854** | ✅ |
| Rejected light | 3.88 | ~3.8 | **3.8782** | ❌ |
| Rejected dark | 1.55 | — | **1.5457** | ❌ |

**Three independent derivations agreeing is what turns this from an assertion into a measurement** — and the original defect was precisely that this figure had been assumed.

**A finding that matters for the owner's DC-8 pass:** the Reviewer noticed the light pair is **identical to the values the chip already uses live** at `project-dashboard.component.html:250-251`. So this **tokenises the existing design rather than restyling it** — **zero visual drift in light mode**; the only new behaviour is a dark-theme override that did not previously exist.

Also folded in: `(width <= 719px)` → `(width < 720px)`, still lint-clean under `media-feature-range-notation`, and **the §7.4 specificity gotcha survives** — the media block names both `.imb-grid` (0,1,0) and `.imb-grid.imb-grid-wide` (0,2,0) and is source-ordered after the base rule, so the wide selector's tie breaks toward the mobile override.

**Scope boundaries held**, each verified rather than assumed: `docs/ux-ui/design.md` absent from `git status` (T-17's, and the hand-off is flagged **in writing** in §7.6); `colors.scss` + README are exactly the path the client guide prescribes; T-11's mapper untouched (confirmed by mtime); and `grep` for the component's selector outside its own four files returned **0 hits**, so T-13's boundary held.

#### Mutation (b) — the deliberate negative result, and its answer

Reverting the chip background to the failing token left **15/15 green. Nothing reddened.** The Implementer stated that plainly, as instructed. **So the contrast fix has no CI gate** — a regression to the old token would ship silently.

**The Reviewer's answer to the Leader's question, with the owner named as requested:** the gate **is** worth having, and **T-14 should own it.** Its reasoning is the part worth preserving — **DC-8's premise is that contrast cannot be automated because *"axe cannot evaluate contrast over rendered output."* That is true of rendered output and false of a declared token pair**, which is two hex constants and a closed-form formula. ~25 LOC of pure computation: read the two stylesheets as text, assert `.imb-chip` names both `--ac-chip-blue-*`, then assert each theme's values clear 4.5:1. It kills exactly the mutation that survived.

**Why T-14 and not T-16:** T-14 is already the designated gate task, already jest, already carries mutation-killability in its acceptance box, and **it lands in T-13's PR — so the gate would exist *before* the owner's DC-8 pass rather than after.** T-16's charter is explicitly *no source changes plus an evidence artifact*, so it would yield one-time evidence, not a CI gate. *(T-16 could instead measure **rendered** chip contrast in real headless Chrome with the old token as its KZ-006 control — stronger evidence, but still not a gate.)* Either choice pairs with a one-line **DC-8 amendment** in T-17's doc scope, recording that declared-token contrast **is** computable, so the next spec does not inherit the overbroad claim. **Escalated to the owner; not minted.**

#### Two honesty notes recorded so they are not misread later

- **T-12's `npm run build` / `strictTemplates` box is satisfied only *vacuously*.** The component is imported by nothing outside its own spec, so it is **absent from the AOT graph**; the only build-graph change is two custom properties. The TestBed run does compile the template via JIT, so this is bookkeeping rather than doubt — but **the real `strictTemplates` proof arrives with T-13**, and T-12's green build must not be read as template validation.
- The **unbound-fallback path is rendered** by the single-band host but **never asserted**. One line (`expect(dot.style.backgroundColor).toBe('')`) would pin it for free. Not required by T-12's box; recorded.

---

### T-11 ✅ PASS · T-12 ❌ FAIL attempt 1 — reviewed jointly, rework routed to T-12 only

- **Date:** 2026-07-31 · run **in parallel, blind to each other**, no worktree (disjoint files)
- **Why joint review:** each task is internally consistent; **the risk was at their seam**, and auditing them separately would have missed it. That judgement paid off — the seam produced one of the two findings.
- **T-11: PASS, no rework.** **T-12: FAIL, two issues.** Rework round **2 of 3** for T-12.

#### T-11 — clean, and the gate is real

Ten **per-entry** assertions, each checking one card's title **and** `toEqual(toRankedItems(payload.<own section>))`. The Reviewer verified the substrate that makes them non-vacuous: all ten fixture sections carry **pairwise-distinct labels and counts**, so any cross-wire reddens a specific per-card assertion. It also checked the mutation's *arithmetic*: swapping two `sectionKey`s reddens the two title assertions plus the composition-order test = **3 red of 18**, leaving 15 green. **That shape is the proof** — a mutation that reddens everything would prove nothing about per-instance gating.

Band order sorted **explicitly** (`mapper.ts:231`) against a strictly **ascending** fixture (12/30/55/90), so pass-through order would fail. Nullable label resolved once to `UNLABELLED_CATEGORY_FALLBACK = 'Unspecified'`, with a spec asserting it is never the literal `"null"`.

**On the locally-declared indicator ids 4/5 — explicitly do not send back.** No exported constant exists anywhere: the codebase writes bare `indicator_id === 5` in at least four places (`result-sidebar.component.ts:98`, `create-oicr-form.component.ts:504,533`, `alliance-alignment.component.ts:105-106`). **Two named local constants with in-file citations are strictly better than the prevailing convention**, and unifying all four would touch files outside T-11's inventory — real scope creep, correctly deferred. *(The Leader independently verified all three id citations before the review: the two exported constants, the `=== 4`/`=== 5` production gates, and `control-list/indicators.service.ts:32`'s `targetIndicatorIds = [1, 2, 4, 5]`, which filters the whole app.)*

#### T-12 Issue 1 — the seam: the per-indicator dot is **specified**, so `color` is not dead

The Leader asked whether a per-indicator dot colour was required or whether T-11's `color` field was dead weight. **The Reviewer settled it by going to the mockup** — which `design.md:10` designates as the **visual reference** — and found the four band dots at `mockup/index.html:180, 234, 300, 336` are `var(--c1)` / `var(--c3)` / `var(--cm)` / `var(--cl)`: **four different colours** from the declared ramp. Two further supports: the idiom is **already live on this exact screen one section above** (`project-dashboard.component.html:253` binds `[style.background-color]="indicator.color"` from the same `indicatorSummaries()` field), and `requirements.md` §9 **DC-8** names "colour ramp" as a defect class of this spec.

**§7.6 was not the settling document** — "Bars from `projectDashboardBarColor()`" governs bars, and its `#1689CA` is an inventory entry harvested from the live tree. Notably `#1689CA` is the ramp's **3rd** colour, so a fixed accent dot would be right for **at most one of four bands**.

**So this is the dead-artifact pattern caught one task before it materialised** — the fourth near-instance in this spec, and the first stopped pre-emptively rather than diagnosed after the fact.

#### T-12 Issue 2 — the chip token substitution fails WCAG AA in **both** themes, and it corrects the Leader

T-12 substituted `--ac-primary-blue-100` for the unavailable chip background `#E8F0F7`. But `--ac-primary-blue-100` is **`#b0c4dd`** — a mid-tone, not a tint. Computed contrast for 12 px **bold** text (which is *not* "large text", so the threshold is **4.5:1**):

| Pair | Ratio | AA |
| --- | --- | --- |
| design intent `#345b8f` on `#e8f0f7` | **6.00:1** | ✅ |
| as built, light `#345b8f` on `#b0c4dd` | **3.88:1** | ❌ |
| as built, **dark** `#253448` on `#3d5167` | **1.55:1** | ❌ effectively illegible |

**The Leader independently re-derived the light-mode figure by hand (~3.8:1) before accepting the finding** — the claim is arithmetic, not opinion.

**This corrects the Leader directly.** In the review brief I wrote that a near-miss shade would be *"inspectable"* by the owner's DC-8 check, so the risk was covered. **That was wrong, and the Reviewer's reasoning is better than mine:** DC-8 exists precisely *because* axe cannot judge contrast over rendered output — but **1.55:1 is computable**, so it should never have been queued behind a human. Worse, it would ship "behind a comment that reads as a considered trade-off": the SCSS note claiming *"nearest token in the same family"* is **true of the hue and false of the value.**

**This also breaks a constitutional hard rule, not just a spec clause:** `docs/prd.md` §8.3 **C-4** (WCAG 2.1 AA on every changed screen), echoed in the client child guide, plus **NFR-IMC-002** (category: a11y / PRD C-4) and §9 **DC-8**. And design §7.6 recording a hex with **no matching token is the documented trigger for the new-token path**, not for a family neighbour.

#### Everything else T-12 got right — confirmed, and carried into attempt 2 unchanged

- **The negative-control test is load-bearing, not theatre.** It converts *"we use the click path because jsdom cannot do keyboard"* from an author's assertion into a **demonstrated environmental fact**, and it is a live tripwire: if the harness ever gains keydown→click translation, that test reddens and tells the next maintainer the substitution is obsolete. It matches the recorded precedent at `project-dashboard-card.component.spec.ts:508-519`. *(Honest caveat, not a defect: the `Enter` and `Space` cases have byte-identical bodies — one test written twice, and the negative control is what gives them meaning.)*
- **Both stylelint deviations are provably forced, not preference.** The Reviewer ran stylelint on a BEM-named copy: `selector-class-pattern` errors on `.imb__grid` **and** `.imb__grid--wide`, and `media-feature-range-notation` errors on `max-width: 719px` — so `(width <= 719px)` is the only lint-clean form.
- **The specificity claim holds and the 720 px rule is safe** — verified rather than accepted: `.imb-grid.imb-grid-wide` is (0,2,0), the media block names **both** selectors, and the wide one is later in source order, so it wins for 4-card bands. Both classes coexist on the element exactly as `__`/`--` would have.
- Layout values reproduced exactly (`auto-fill`, `minmax(300px,1fr)`, `minmax(400px,1fr)`, `align-items: start`, one column at the media query). Collapse via `@if` **removes cards from the DOM**, which is stronger than AC.4's "hides" and safe because expansion state is host-owned. **No hex literals leaked** — Issue 2 is a *wrong token*, not a literal.
- **Primitive inputs are correct; keep them.** No spec section mandates an input shape, and §7.3 calls the component *presentational*, which primitives serve better than importing the mapper's model. Add `color` as a **fifth primitive**, do not refactor to the object.

#### The one claim the Reviewer declined to verify — and the Leader closed it

It stated plainly that it **did not run `npm run build`**, calling `strictTemplates` "plausible but unverified by me". **The Leader ran it: exit 0.** Declaring the gap instead of papering over it is what made it cheap to close.

---

### T-10 — Client data layer: interface mirror + canonical fixture extension — ✅ **PASS**

- **Status:** ✅ **PASS** — Reviewer PASS attempt 1 · **Date:** 2026-07-31 · first client-side task
- **Files:** `contract-full-reports.interface.ts` · `get-full-contract-reports.service.ts` · `contract-full-reports.mock.ts` — **182 insertions / 2 deletions, zero `*.spec.ts` touched**

#### Verified by execution, not by reading

The Reviewer **ran** the fixture rather than inspecting it: `innovation_readiness` **10** entries, `policy_type` **exactly 5**, `oicr_maturity` **3**, `policy_stage` **0**, and `session_type` the **only** section that fails a `count DESC, id ASC` check — so all five required cases are real, and the two that matter most (**>5** and **exactly 5**) are the ones DC-13 asserts a toggle at 6 and *no* toggle at 5. It also set-compared the 10 client field names against `MetadataCountDto` (identical character-for-character), confirmed `gender_individual`/`gender_group` appear **nowhere** in `client/src`, and checked deep-clone isolation plus `mockContractFullReports({...})` overrides.

**R-IMC-007 AC.3 satisfied by diff:** zero spec files in the change. Client suite **304 suites / 6,234 tests**, matching the baseline the Leader measured before delegating.

**The `tsc` exit-2 was proven pre-existing structurally**, which is stronger than the Implementer's `git stash` check: `tsconfig.app.json` declares `files: ["src/main.ts"]` and includes only `src/**/*.d.ts`, so **no `*.spec.ts` can enter the `ng build` program at all**; the three errors are `TS1005` **syntax** errors in two untouched spec files, and no change to three non-spec files can inject a syntax error elsewhere.

#### Three corrections to the Leader's framing — two of them in the Leader's favour

**1. The Leader wrongly took the blame for the `name: string | null` asymmetry.** I told the Reviewer *"my brief induced this."* It did not: **`tasks.md` § T-04's "Consumed by later tasks" block already mandated it in writing**, addressed to T-10 by name — *"T-10 must not assume non-null labels… prefer a client-side fallback over a `COALESCE` that would mint an unlabelled category."* So `string | null` is the **spec-conformant** side, and aligning the client to `string` would have violated the spec. Recorded because a Leader mis-assigning blame to itself distorts the audit trail as much as one deflecting it.

**2. The Leader's feared burden on T-11/T-12/T-13 is structurally unreachable.** I worried the nullable label would surface as a template rendering `"null"`, ungated. It cannot: the card's item type is `ProjectDashboardRankedListItem { id: string; label: string; count: number }` (`project-dashboard.interface.ts:5`), so **T-11's mapper cannot compile** without explicitly resolving `name: string | null → label: string` and `id: number → string`. Angular also interpolates `null` as `''`, never `"null"`. The type converts the feared runtime defect into a **T-11 compile error** — precisely where T-04 said the fallback belongs.

**3. On the accessors the Leader's instinct was right but the diagnosis needed narrowing.** A **typo** cannot survive — `payload()?.innovation_natrue` is a compile error against the typed interface. A **cross-wire** can: `innovationType = computed(() => payload()?.innovation_nature ?? [])` compiles cleanly, and **nothing reaches it.** `project-dashboard.component.spec.ts:108-133` replaces `GetFullContractReportsService` with `createReportsMock()`, whose accessors are **independent writable signals** set by hand — so **T-14 structurally cannot exercise the real `computed`s.** This is recurrence **3** of the dead-artifact pattern (T-02's DTO, the T-03/T-04 repository, now these).

#### The finding that matters most: **T-14 has a hard blocker, discovered before it started**

`createReportsMock` / `applyFixtureToReportsMock` **do not carry the 10 new sections.** Without extending them, T-14's ten per-instance DC-5 assertions — which its **own existing acceptance box already requires** — would bind to `undefined` and **pass vacuously.** That is the same shape as T-07's failure: a green suite over nothing.

**Recording this is not widening T-14.** Its box already demands *"Ten separate per-card data assertions"*; the mock extension is the mechanical prerequisite for satisfying a box it already owns. Booked in `tasks.md` § T-14 as a prerequisite, not as new scope.

#### `ADVISORY` — one booked as prerequisite, one escalated, one bookkeeping

| # | Finding | Disposition |
| --- | --- | --- |
| **1** | **The server is the wrong side of the nullability asymmetry.** `MetadataCountDto.name!: string` and `design.md` §5's inline `{ id: number; name: string; count: number }` now contradict both the client and the executed schema. **The Reviewer's timing argument is the strong part:** design §5 / W-6 records that `ContractFullReportsDto` reaches OpenAPI **for the first time via this spec's own `@ApiOkResponse`** — so there is **no consumer to break**, only a known-false schema to avoid publishing. **Deferring means shipping a contract that is false on day one, and the cost rises after first publication.** | **Escalated to the owner.** Leader assessment: **not critical** by the owner's standing bar — the client already declines to trust it, so no client defect exists — but it is cheapest *now*, and that timing asymmetry is the part worth deciding on rather than inheriting |
| **2** | **T-14 must own the accessors.** Add to its done-check: ten one-line accessor assertions in `get-full-contract-reports.service.spec.ts` mirroring the existing `:94-99` pattern for the six Chunk A accessors, so a cross-wire becomes killable | **Booked in `tasks.md` § T-14 as a recommendation**, alongside the mock extension which is a hard prerequisite. The accessor assertions are the part that is arguably new scope, so they are flagged rather than mandated |
| **3** | T-10's *"Files touched (intended)"* listed **2** files while its Description mandated the service accessors — the third file was authorised by the Description; the file list was the stale half | ✅ **Corrected in `tasks.md`.** Bookkeeping on the Leader's own document, so no escalation needed — and worth fixing so it is never later read as scope creep |

#### Requirements covered

R-IMC-007 AC.3 (by diff) · §4.1 field/label map mirrored · the fixture substrate for T-11, T-13 and T-14, including DC-13's two boundary cases.

---

## Owner decisions, 2026-07-31 — the four open items closed

Presented as a batch at the server/client boundary, which is the natural moment to decide them rather than when a PR is already built.

| # | Item | Owner decision | Effect |
| --- | --- | --- | --- |
| **3** | **RB-11** credential rotation | *"está bien controlado"* — **no rotation** | RB-11 **closed**. Exposure was local, ~14 min, never in git, never off the machine. Owner accepts the residual with the facts on record |
| **4** | **DC-8** visual quality — no automated gate possible | **Owner will test it personally once development is complete** | The strongest available substitute for a class that cannot be automated. Converts an *accepted risk nobody owned* into an **assigned check with an owner and a trigger**. Recorded in `requirements.md` §9. **Consequence: the spec does not close when the tasks close** — DC-8's check runs after T-10 … T-17 land |
| **2** | Permanent Swagger-emission spec | *"si lo puedes controlar rápido hazlo"* — **authorised, done** | ✅ Landed. See below |
| **1** | Six one-line advisories | **Permission to create tasks *only if* something is critical** | **Leader assessment: none meets that bar.** See the criticality read below — nothing was minted |

### Item 2 — the Swagger-emission gate landed

`agresso-contract.swagger.spec.ts` *(new, 2 tests)*. Built to the T-09 review's scope constraints exactly:

- ✅ Asserts the `reports/full` **200 carries a `$ref`** — the state that was previously `{"description":""}` with no schema at all.
- ✅ Asserts **no `$ref` in the document dangles** — the failure mode a page-eyeball check misses, because a document full of dangling refs looks populated and renders broken.
- ❌ **Deliberately does not assert the 17 field names.** That would duplicate the DTO and become churn on every additive change, turning a guard into a maintenance tax. The field-level contract is already a **compile** error via `ContractFullReportsDto implements IndicatorMetadataSectionsDto` (T-02) — belt and braces in the right places, not the same place twice.

**Mutation-verified by the Leader:** removing the exact `@ApiOkResponse` line T-09 added reddens the first assertion; the dangling-ref assertion correctly stays green, since an absent schema dangles nothing — the two tests gate different properties. Restored, checksum identical.

**`requirements.md` §9 DC-10 amended** from *"Manual `/swagger` inspection"* to CI-gated. The reasoning the Reviewer gave for wanting this holds: the defect class is silent, manual gates decay across the next spec that touches the DTO, and **this repo already contains one instance of the same class left as a code comment rather than a gate** (`bilateral-hlos-indicators.response.dto.ts:12`).

### Item 1 — criticality read: none is critical, and one is a closer call than the others

Recorded because the owner's authorisation was conditional, so the judgement needs to be on the record rather than implied by inaction.

| Advisory | Assessment |
| --- | --- |
| `:236` comment says "below" where it means "above" | **Not critical.** One word, no behavioural consequence. Minting a task for it would cost more than the error |
| Branch indices are reorder-brittle | **Not critical — and it fails *closed*.** A reorder reddens up to 12 assertions rather than passing silently. That is maintenance cost, which is the acceptable direction |
| `ORDER BY` gated for presence, not uniqueness | **Not critical.** The per-branch variant it would miss is **rejected by MySQL**, so real-schema execution already catches it |
| Three-document *"all three categories"* wording (T-05) | **Not critical.** The gate itself is closed independently; only the prose overstates |
| `@ApiOkResponse` documents the unwrapped payload, wire response is `ServerResponseDto` | **Not critical, and spec-conformant as prescribed** by design §5. A one-line description naming the wrapper would remove the misreading; worth doing whenever the controller is next touched |
| **`gender_group`'s id/name pairing is unpinned within its segment** | **The closest call, and worth stating precisely.** Swapping `1 AS id, 'Male'` with `2 AS id, 'Female'` between branches while leaving the `SUM` columns would **mislabel gender counts** — user-visible wrong data in a research reporting system. The T-09 reviewer scoped it as **DC-4**, which §9 declares un-gateable. **That scoping is right about label *correctness* and arguably too broad about pairing *consistency*:** whether `'Male'` is the right label for `gender_id = 1` is a domain fact no test can know, but whether the label is attached to its own `SUM` column **is** testable, with the same branch-pinning technique already in the file, in ~3 lines. **Still not critical** — it requires someone editing those literals wrongly, and the pairing is currently correct and real-schema-verified. **Recommended as a ~3-line addition to T-16's pass rather than a new task; flagged for the owner, not acted on** |

---

### T-09 — Swagger: make the response schema actually render — ✅ **PASS**

- **Status:** ✅ **PASS** — Reviewer PASS attempt 1 · **Date:** 2026-07-31
- **File:** `agresso-contract.controller.ts` — **4 insertions / 1 deletion.** Two imports, one `@ApiOkResponse({ type: ContractFullReportsDto })` on the `GET reports/full` handler, one `@ApiOperation` summary line.

#### The finding this task existed to fix, now demonstrated rather than argued

Design §5 / W-6 claimed that `ContractFullReportsDto` was **not emitted into the OpenAPI document at all**, because the handler referenced no response type — so T-02's `@ApiProperty` decorations changed nothing on the rendered page. **Both the Implementer and the Reviewer measured that independently**, at document level:

| | `components.schemas` | 200 response |
| --- | --- | --- |
| **BEFORE** | `['AgressoFindNamePayload', 'PoolFundingTagDto']` — **`ContractFullReportsDto` and `MetadataCountDto` absent entirely** | `{"description":""}` — **no schema** |
| **AFTER** | `ContractFullReportsDto` with **17 properties** in declaration order; all 10 new ones `array` → `items.$ref: MetadataCountDto`; `MetadataCountDto` present | `{"$ref":"#/components/schemas/ContractFullReportsDto"}` |

The BEFORE is the point: not "present but incomplete" — **absent**. `createDocument` reaches models only by traversing route response metadata, so an unreferenced class is never visited no matter how many `@ApiProperty` it carries.

#### The Reviewer improved the experiment and checked two things nobody asked for

- **Better isolation:** instead of `git stash`, it produced the BEFORE state with `Reflect.deleteMetadata` on the `swagger/apiResponse` key at runtime — **isolating the decorator as the only variable.** Same result, cleaner design.
- **Zero dangling `$ref`s** — all **12** transitively referenced DTOs (`ContractFullGeoScopeDto`, `PartnerByContractCountDto`, `SubNationalByContractCountDto`, …) are emitted, so the 7 pre-existing fields render **fully**, not as broken refs. A schema full of dangling refs looks present and is broken; nobody had checked.
- **`nest-cli.json` carries no `@nestjs/swagger` CLI plugin**, so there is no harness-vs-build divergence in decorator inference — all 17 properties are explicit. **This was a real risk the Leader had not considered:** with the plugin enabled, the build would infer properties the harness would not, and the harness would stop being representative.

#### The three judgment calls

| Question | Verdict |
| --- | --- |
| Is the BEFORE/AFTER contrast proof or a proxy? | **Proof.** It is measured on the emitted document, which *is* DC-10's defect surface |
| Is `useValue: {}` for the service stub sound? | **Sound.** `createDocument` is purely static metadata introspection; the provider only needs to satisfy DI. It cannot mask a schema defect. What it legitimately does not cover is whether the *runtime payload* matches the DTO — that is T-06/T-08's claim, not AC.1's |
| Is the missing `/api/v1/agresso/contracts` prefix a material gap? | **Orthogonal.** `components.schemas` is document-global; `RouterModule` prefixing changes only the `paths` key string, never schema binding. **The Implementer disclosed a real limitation that turned out not to be a material one** — the right instinct either way |

#### `ADVISORY` — one finding worth the owner's eye

**`@ApiOkResponse({ type: ContractFullReportsDto })` documents the *unwrapped* payload, while the wire response is `ServerResponseDto` (`{ data, status, description, … }`) via `ResponseInterceptor`.** T-09 and design §5 prescribe this decorator **literally**, so the change is spec-conformant as written — but a consumer reading the rendered page would conclude the response body *is* the DTO. The repo's one precedent, `bilateral.controller.ts:113`, pairs the same pattern with a description stating *"…inside the standard `ServerResponseDto` wrapper"*. A description of that kind here would remove the only available misreading. **Purely additive; recorded, not applied** (§2.4).

#### The deferred question — the Reviewer's answer, and it is not T-09's

The Implementer asked whether a **permanent spec** asserting Swagger emission is warranted, and correctly declined to add one. The Reviewer's read: **worth having, minimal, and in a follow-up task of its own — not here.**

Its reasoning is sound and worth preserving: the defect class is **silent** (an unreferenced DTO fails nothing, which is exactly why AC.1 had to be rewritten to name the handler decorator); **DC-10 is a manual gate, and manual gates decay** across the next spec that touches this DTO; and the harness costs ~15 lines with no DB. It also found **the pattern already repeating in this repo** — one instance of this same class left as a *code comment* rather than a gate (`bilateral-hlos-indicators.response.dto.ts:12`).

Its scope constraints, if it is ever built: assert only that **the 200 carries a `$ref`** and that **no `$ref` dangles**. **Do not assert the 17 field names** — that duplicates the DTO and turns a useful gate into churn on every additive change. **Escalated to the owner as a candidate follow-up; not minted.**

#### Requirements covered

**R-IMC-012 AC.1** — both halves: `@ApiProperty` (T-02) plus the handler decorator that makes the schema actually appear. Gate **DC-10** satisfied by document-level inspection rather than by eyeballing. The 7 pre-existing fields verified unchanged in the emitted schema.

#### Final verification

`tsc --noEmit` clean · `eslint` clean on the controller · full suite **323 suites / 2,067 tests** green, **matching baseline exactly** — correct for a decorator-only change, since both harnesses were throwaway and deleted · working tree contains only the one file.

---

### T-08 — NFR-IMC-001(c) MEASURED. All three bounds met; **T-08 closes, client work unblocked**

- **Date:** 2026-07-31 · executed by the **Leader** (measurement only, no code changes)
- **Verdict: `pass` on all three parts of the amended NFR-IMC-001.**

#### Two failed approaches before the one that worked — recorded, because the failures are the lesson

**Attempt A — paired differences.** Each `SELECT 1` issued immediately before the real query on the same connection, so both samples share link conditions; the distribution of `(query − probe)` should estimate server-side work including its spread. **It failed, and the harness's own built-in sanity clause caught it: 25 of 60 paired differences came out negative** — in 42 % of rounds the real query was *faster* than its own probe taken milliseconds earlier. That is impossible as a statement about work, so it can only mean link noise exceeded the signal even under pairing. The medians confirm it: the **no-op's** median (73.1 ms) was **higher** than Q1's (58.0 ms). The script printed `BREACH`; **that verdict was void by the script's own rule and was discarded, not reported.**

**Attempt B — `performance_schema.events_statements_history`.** The right table, but `ER_TABLEACCESS_DENIED_ERROR` for this user.

**Attempt C — `SHOW PROFILES`.** Works. Deprecated in MySQL 8 (server is 8.0.45) but functional, and it reports how long a statement took **inside the server**, so network latency and its variance are not in the number at all — it does not attempt to subtract the link, it excludes it.

#### Results — server-side execution, network excluded

| Measurement | min | med | **p95** | max |
| --- | --- | --- | --- | --- |
| `SELECT 1` — instrument floor | 0.21 | 0.29 | **0.39** | 0.42 |
| **A1578** (521 primary results) Q1 | 10.05 | 13.18 | **18.69** | 19.61 |
| **A1578** Q2 | 11.54 | 16.76 | **19.45** | 20.38 |
| **A1566** (242 primary results) Q1 | 5.62 | 8.93 | **12.80** | 15.91 |
| **A1566** Q2 | 6.88 | 11.74 | **14.15** | 14.80 |

**Bound (c): each query's server-side p95 ≤ 50 ms → worst observed 19.45 ms → MET**, with ~2.5× headroom. 25 rounds per query per contract, 3 warm-ups discarded.

#### The cross-check that makes this credible, and retroactively indicts the earlier number

**These numbers scale with data volume: 18.69 / 19.45 ms on the 521-result contract versus 12.80 / 14.15 ms on the 242-result one.** That is what a measurement of query *work* must do — and it is exactly what the VPN wall-clock measurement conspicuously failed to do (174.54 vs 173.92 ms across the same two contracts, essentially flat). **The flat number was measuring the link; this one is measuring the queries.** At 67× the instrument's own floor, it is signal rather than instrument noise.

#### NFR-IMC-001, final status — all three parts met

| Part | Bound | Measured | |
| --- | --- | --- | --- |
| **(a)** | absolute p95 ≤ 3 s | **174.5 ms** | ✅ ~17× margin |
| **(b)** | added latency `max(Q1,Q2)` ≤ 250 ms | **92.7 ms** | ✅ |
| **(c)** | server-side p95 ≤ 50 ms per query | **19.45 ms** | ✅ ~2.5× margin |

**Consequently: T-08 → `[x]`, and design §11's gate on client work is released. T-10 … T-16 are unblocked.**

#### One correction to the Leader's own earlier claim

In the Pivot Record I wrote that the retired 1.5× bound *"looks mis-calibrated."* **That was stronger than the evidence supported, and (c) narrows it.** With Q1/Q2 costing ~19 ms of server-side work, the honest statement is that the 1.5× bound was **unmeasurable in this environment** — whether it was *also* mis-calibrated depends on the existing 8-query batch's server-side time, **which was never measured.** The retirement still stands on the ground that survives: a bound whose own prescribed fallback cannot satisfy it (2.12×) is not a usable gate, and (a)+(b)+(c) are measurable where it was not. But "unmeasurable here" and "wrong" are different claims and I should not have blurred them.

#### Housekeeping

Both harness scripts were run from the package directory and deleted immediately; `git status` clean, verified. Credentials read from `.env` at runtime via a `mysql2` connection — never hardcoded, never printed. Read-only: `SELECT`s, `SET profiling`, `SHOW PROFILES`. No writes, no DDL, no production-code changes.

---

## Pivot Record: T-08 — NFR-IMC-001 is not measurable in this environment, and its ratio bound looks mis-calibrated

**Status: awaiting owner decision. No architecture was changed, no spec text amended.**

### What was measured (2026-07-30, VPN restored)

The Implementer executed the full harness: sanity check first (17-field shape confirmed by execution, so the constructor-stub assumption held), largest contract probed rather than guessed (**A1578, 521 primary results**) plus a smaller one (**A1566, 242**), 5 warm-ups discarded, **25 samples per arm**, **3-way round-robin interleaving**, and `T_metadata` captured two independent ways — harness wall clock around its own `Promise.all([Q1, Q2])`, cross-checked against `max(Q1, Q2)` from the two `_debug` lines, never the sum.

| Arm (contract A1578) | min | median | **p95** | max | spread |
| --- | --- | --- | --- | --- | --- |
| existing | 36.66 | 38.74 | **43.67** | 123.98 | 87.33 |
| composed | 71.10 | 100.27 | **174.54** | 191.39 | 120.29 |
| metadata batch alone | 35.14 | 40.73 | **92.71** | 124.50 | 89.36 |

Ratio p95 composed/existing: **3.997×** on A1578, **3.552×** on A1566, against a **1.5×** bound. `T_metadata` p95 92.71 ms against an allowance of 21.84 ms. **Absolute p95 174.5 ms against the 3 s bound — passes by ~17×.**

**The Implementer's verdict was `breach`.** Its reasoning: the p95s are stable and mutually consistent across two contracts differing >2× in volume, so the gap is far larger than run-to-run spread — a repeatable, well-resolved breach rather than noise.

### Why the Leader overrode that verdict to `inconclusive`

The Implementer characterised the *arms'* variance but not the **environment's noise floor**. The Leader measured it directly:

> **`SELECT 1` — zero query work — over this VPN: min 28.5 ms, median 79.5 ms, p95 155.5 ms, max 169.3 ms (n=30).**

**A no-op query costs more at p95 (155.5 ms) than the entire 8-query existing batch (43.67 ms).** That is only possible if the link's latency is wildly variable, and it is: a 6× range on an empty query.

Three consequences:

1. **DC-9's no-pass clause applies on its own terms.** It states: *if three runs vary by more than the effect being measured, the number is not evidence.* The alleged effect is `T_metadata ≈ 93 ms`. The environment's variation on a query that does **nothing** spans **141 ms**. The noise exceeds the effect, so the bound is not resolvable here.
2. **The ratio measures round-trip count, not query cost.** The composed path makes **two sequential round-trip windows** (step 1's parallel batch, then step 2's) where the existing path makes **one**. Over a link with a ~80 ms median RTT, "2 RTT vs 1 RTT" produces exactly the observed ~2–4× — a number that contains almost no information about the aggregations themselves.
3. **The consistency the Implementer cited as signal is equally evidence of the opposite.** The composed p95 barely moved (174.54 → 173.92) when the dataset more than halved. If the measurement tracked query work, doubling the rows should have moved it. It did not move because **row volume was never the cost.**

**So DD-11 is `unverified`, not `invalidated`.** `T_metadata ≤ 0.5 × T_existing` remains exactly as unproven as before — which is a materially different outcome from `breach`: `breach` triggers an architecture change with shared-infra and DevOps implications, and **pivoting the architecture on a VPN artifact would be the wrong call.**

None of this is a criticism of the Implementer's work. Its harness design was sound, it ran the sanity check it had flagged as assumed, it measured `T_metadata` two ways, it refused to fabricate when blocked, and it stopped without attempting a fix. The missing step — profiling the environment's noise floor before trusting a ratio — is a measurement-design gap worth carrying as a Kaizen candidate, not a task failure.

### A second finding that stands regardless of the environment

**The fallback the spec prescribes would not satisfy NFR-IMC-001 either.** DD-11's stated fallback is `Promise.all` (racing step 1 against step 2) plus an explicit `poolSize` change. Under those observed numbers, parallel composition gives `T_total ≈ max(43.67, 92.71) = 92.71 ms` → ratio **2.12×**, still above **1.5×**.

So the requirement is not merely breached by the current architecture — **it is not satisfied by the architecture the spec names as its own remedy.** That points at the requirement, not the code:

- **1.5× of a 43.67 ms baseline leaves a 21.8 ms budget** for the metadata batch — less than a single round trip on this link, and on the order of one round trip even on a fast one.
- The **absolute** bound (p95 ≤ 3 s) passes by roughly **17×**. 174 ms is objectively fine for a dashboard endpoint.
- A relative bound is a reasonable instrument when the baseline is slow; against a 44 ms baseline it mostly measures how many round trips were added, which is a **structural fact of adding any query at all**, not a regression this spec introduced.

### What the Leader recommends, and what it did not do

**Recommended:** amend **NFR-IMC-001** rather than the architecture — keep the absolute bound (which passes), and replace or supplement the 1.5× relative bound with something measurable and meaningful (e.g. a bound on the metadata batch's own **server-side execution time**, or an absolute ceiling on the added latency). Then re-measure **co-located with the database**, where per-query fixed cost is sub-millisecond and the ratio would actually reflect query work.

**Not done, deliberately:** no spec text was amended and no architecture changed. `/akili-execute`'s Pivot Protocol requires explicit owner review and approval before either, and a requirement amendment re-runs the budget and approval gate. **T-08 stays `[~]`.**

### Client work stays blocked either way

Design §11 sequences this measurement before all client work so a breach costs the server PRs and not the client ones. Whether the outcome is `inconclusive` or an amended requirement, **that ordering still holds: T-10 … T-16 should not start until NFR-IMC-001 is either met or renegotiated.**

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
