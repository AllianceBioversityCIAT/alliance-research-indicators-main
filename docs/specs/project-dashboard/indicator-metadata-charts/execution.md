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
- **Status:** in-progress — T-01 done, T-02 … T-17 todo

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
