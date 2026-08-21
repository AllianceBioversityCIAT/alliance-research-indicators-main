# Proposal — Degree chart shows no data on the Project Dashboard

> **Status: DIAGNOSED and specified — 2026-08-03.** Root cause is **neither H1 nor H2** below. Live evidence from contract `A100` (`STAR-3422`: Group / **Engagement** / Long-term / **PhD**) showed the record was captured *with* a degree and dropped *by the report*: the Q2 degree branch carries a `session_type_id = Training` predicate that the **capture rule never had**. See `./requirements.md` §1. **§4's discriminating query is no longer needed** — the screenshots settled it. §3's ruled-out list still holds and was re-confirmed.
>
> _Original framing, kept as the point-in-time record:_ open defect report, not yet diagnosed. Raised by the owner on **2026-08-03** during the DC-8 visual pass on `indicator-metadata-charts`, immediately before that spec was archived. Written down so the finding survives a branch switch — **it is not a validated root cause.**

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/degree-chart-empty/` |
| Type | **Defect** (behaviour observed on the shipped screen) |
| Raised | 2026-08-03 by d.casanas@cgiar.org |
| Source | DC-8 owner visual check on `project-detail/:id/project-dashboard` |
| Parent | `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/` — chart #10, **R-IMC-006** |
| Surfaces | **Server** (`agresso-contract` Q2 degree branch) + **Client** (card copy only) — determined 2026-08-03 |
| Branch at time of report | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| Status | **Specified** — `requirements.md` / `design.md` / `tasks.md` drafted 2026-08-03. Supersedes **R-IMC-006 AC.1** |

## 2. Observed

The **Degree** card in the *Capacity Sharing* band renders with its filter-scope note and **no data**. Reported as *"los datos del degree no se están mostrando en las tablas."*

**Not recorded and needed before diagnosis:** which contract/project was open, whether the card showed the R-IMC-010 empty state or an error state, and whether the other three Capacity Sharing cards (Training-or-engagement, Training-vs-Engagement, Gender) had data on that same project.

## 3. What was already ruled out — do not re-check these

Checked statically on 2026-08-03, at the moment the defect was reported. **All three were clean**, which is why this proposal exists instead of a one-line fix.

| Hypothesis | Verdict | Evidence |
| --- | --- | --- |
| Positional parameters mis-bound (DC-12's hazard — a mis-bind returns **zero rows instead of erroring**) | ❌ ruled out | `indicator-metadata-reports.repository.ts:281-378` — the `?` order in the SQL text is contractId (CTE) → TRAINING → LONG_TERM → INDIVIDUAL → GROUP ×3, and `params` at `:370-378` is that exact sequence |
| Wrong enum values | ❌ ruled out | `SessionTypeEnum.TRAINING = 1`, `SessionLengthEnum.LONG_TERM = 2` — both match seed migration `1727119632564` |
| Client mapping / rendering broken | ❌ ruled out | `indicator-metadata-bands.mapper.ts:235-256` maps `payload.degree` → its own card and attaches the filter-scope note; `project-dashboard.component.html:327-332` binds it like the other nine. The other nine cards render, and they share this code path |

## 4. The two live hypotheses, and the one query that separates them

**H1 — The section is legitimately empty, and the real problem is that it will be empty for almost every project.** *(Most likely.)*

R-IMC-006 restricts Degree to `session_type_id = Training` **AND** `session_length_id = Long-term`. T-01 measured the strict filter **database-wide** at the time of implementation: **54 rows loose → 36 rows strict**, against 1,701 capacity-sharing results and 14,647 results total. **36 qualifying rows spread across every contract in the system** means a typical project has **zero**, and the card correctly shows R-IMC-010's empty state.

If this is it, **the code is right and the requirement is the problem** — a chart that is empty on nearly every project reads as broken to a project lead regardless of correctness. That is a **product** decision (relax the filter? merge Degree into another card? hide it when empty rather than showing an empty state?), not a bug fix, and it belongs to the owner and MEL — **not** to whoever picks this up.

**H2 — `session_length_id` is NULL or unpopulated on rows that are genuinely long-term training.** The form clears the field via `clearDegreeIdIfNotLongTerm` (`capacity-sharing.component.ts:85-93`), and historical/imported rows (TIP/PRMS/AICCRA) may never have carried it. The conjunction would then drop rows that a human would say *do* have a degree.

If this is it, **the requirement is right and the data is the problem** — and the fix is a data question, not a query change.

### Run this first — it decides which, in about two minutes

```sql
-- Replace <CONTRACT> with the contract code that was on screen.
SELECT
  COUNT(*)                                                           AS cs_rows,
  SUM(f.degree_id IS NOT NULL)                                       AS has_degree,
  SUM(f.session_type_id = 1)                                         AS training,
  SUM(f.session_length_id = 2)                                       AS long_term,
  SUM(f.session_length_id IS NULL)                                   AS length_null,
  SUM(f.session_type_id = 1 AND f.session_length_id = 2)             AS passes_conjunction,
  SUM(f.session_type_id = 1 AND f.session_length_id = 2
      AND f.degree_id IS NOT NULL)                                   AS would_chart
FROM result_capacity_sharing f
INNER JOIN result_contracts rc ON rc.result_id = f.result_id
WHERE rc.contract_id = '<CONTRACT>' AND rc.is_primary = TRUE
  AND f.is_active = TRUE;
```

**Reading it:**

| Result | Means | Then |
| --- | --- | --- |
| `would_chart = 0` **and** `passes_conjunction = 0` **and** `length_null` is high | **H2** — the length field is not populated | Data/backfill question. Take it to MEL before touching the query |
| `would_chart = 0` **and** `long_term` is genuinely 0 | **H1** — this project has no long-term training | **Not a bug.** Owner + MEL decide whether the chart earns its place |
| `would_chart > 0` but the card is still empty | **A real defect** — none of §3's ruled-out causes explains it | Escalate; start at the scoping CTE (`primary-contract-results.util.ts`) and the `_debug` line below |

**Free instrumentation, no code change needed.** Q2 already logs per-section row counts at debug: `indicator-metadata-reports.repository.ts:402-406` emits `Q2 capacity-sharing union — contract_id=… bySection={…}`. **Read that line for the affected contract before writing any SQL** — it tells you directly whether `degree` came back empty from the database or was lost after it, which splits server from client in one step.

## 5. Explicitly not yet decided

- Whether this is a **defect** at all (H1 says no).
- Whether the fix is server, client, data, or requirement.
- Whether it blocks anything. **It does not block the archived spec** — R-IMC-006's ACs were verified against the SQL and against live rows (`G228` loose 6 → strict 2; `A1618` excludes an Engagement/MSc row), and the DC-2 fixture gates the conjunction in CI. This report is about **what a user sees on a real project**, which is a different claim from the one those gates make.

## 6. Next step

```text
/akili-propose project-dashboard/degree-chart-empty
```

— **after** §4's query has been run. Proposing a solution before knowing which hypothesis holds would design against a guess, and §3 already shows the obvious guesses are wrong.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
