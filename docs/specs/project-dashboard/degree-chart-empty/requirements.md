# Requirements — project-dashboard / degree-chart-empty

- **Module:** agresso (server report) + project-dashboard (client copy)
- **Spec id:** 2026-08-degree-chart-empty
- **Status:** draft
- **Owner:** d.casanas@cgiar.org
- **Depth:** **Lite** + **Bug Mode**
- **Linked PRD section:** `docs/prd.md` — Project Dashboard / indicator metadata
- **Linked tickets:** AC-1672 (branch `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator`)
- **Extends:** `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/` — **supersedes R-IMC-006 AC.1**
- **Last updated:** 2026-08-03

---

## 1. Executive summary

**The Degree card is empty because the report asks a stricter question than the form ever asked the user.**

| Layer | Condition under which a Degree exists | Source |
| --- | --- | --- |
| **Capture** (form) | `session_length_id = Long-term` — **any** session type | `capacity-sharing.component.html:29-36`, `capacity-sharing.component.ts:60-63, 85-93` |
| **Report** (SQL) | `session_type_id = Training` **AND** `session_length_id = Long-term` | `indicator-metadata-reports.repository.ts:310-319` |

`STAR-3422` on contract `A100` is **Group training / Engagement / Long-term / PhD**. The form required that PhD; the report discards it. `GET /api/agresso/contracts/reports/full?contract-id=A100` returns `degree: []` while `session_type` on the same payload reports `Engagement = 2`.

The extra predicate traces to R-IMC-006, whose stated rationale — *"the form only reveals Degree for long-term training"* — is a **one-condition rule transcribed as two**. R-IMC-006 **AC.1** ("an Engagement record carrying a `degree_id` is excluded") encodes that mistake and currently **passes**, which is why every automated gate is green while the screen is wrong.

**Decision (owner, 2026-08-03): the report follows the form.** The `Training` predicate is removed; `Long-term` is kept.

### Ruled out — do not re-investigate

The proposal's two hypotheses are both **dead**, and its §3 exclusions still hold:

| Hypothesis | Verdict |
| --- | --- |
| H1 — legitimately empty, filter too rare to be useful | ❌ A100 **has** a qualifying record under the capture rule |
| H2 — `session_length_id` NULL on long-term rows | ❌ `STAR-3422` carries Long-term explicitly |
| Positional parameter mis-bind / wrong enums / client mapping | ❌ ruled out in `proposal.md` §3, re-confirmed |

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Capture rule** | The condition under which the result form shows and requires a field |
| **Report rule** | The condition under which the dashboard report counts that field |
| **Stale degree** | A `degree_id` left on a row whose length was later switched away from Long-term |

---

## 3. Scope

**In scope**
- The `degree` branch of the Q2 capacity-sharing union (server).
- `DEGREE_FILTER_SCOPE_NOTE` card copy (client) — it currently says *"long-term training records"*, which becomes false.
- The specs asserting the old behaviour.

**Explicitly NOT changing**
- The form's capture rule — it is the reference, not the defect.
- The `Long-term` predicate — it stays as the stale-degree guard (R-IMC-006 AC.2 survives intact).
- Rows whose `session_length_id` is NULL — still excluded. A degree with no recorded length is data the form could not have produced; out of scope and left to MEL.
- The other nine metadata cards, the payload contract, band visibility, empty-state copy.

---

## 4. Functional requirements

### R-DCE-001 — Degree counts every long-term record with a degree, whatever its session type

The report SHALL count a capacity-sharing record in the `degree` section whenever the record is **Long-term** and carries a `degree_id`, regardless of whether it is a Training or an Engagement.

**Supersedes** R-IMC-006 AC.1 — an Engagement record carrying a `degree_id` is now **included**, not excluded.

#### Scenario: The reported failing case (A100 / STAR-3422)

- GIVEN a capacity-sharing result linked as **primary** to contract `A100`
- AND its `session_type` is **Engagement**, `session_length` is **Long-term**, `degree_id` is **PhD**
- WHEN `GET /api/agresso/contracts/reports/full?contract-id=A100` is called
- THEN the `degree` section reports `PhD = 1`
- AND the dashboard Degree card renders that bar instead of the empty state
- AND IT MUST reach that result **without** a `session_type_id` predicate on the degree branch
- BUT it must NOT change any other section of the same payload — `session_format`, `session_type`, `gender_distribution` stay byte-identical

#### Scenario: The stale-degree guard still holds

- GIVEN a record with `session_type` = Training, `session_length` = **Short-term**, `degree_id` = MSc
- AND a second record with `session_type` = Engagement, `session_length` = Long-term, `degree_id` = MSc
- WHEN the payload is built
- THEN the `degree` section reports `MSc = 1`
- AND IT MUST keep filtering on `session_length_id = Long-term`
- BUT it must NOT report `MSc = 2`

---

### R-DCE-002 — The card note describes the filter that is actually applied

The Degree card SHALL state a filter scope that matches R-DCE-001. The current text — *"Includes only long-term training records with a recorded degree."* — SHALL be reworded so it does not restrict to *training*, since engagements now count.

#### Scenario: Note and query agree

- GIVEN the Degree card renders with data drawn from an Engagement record
- WHEN a project lead reads the card's filter-scope note
- THEN the note describes **long-term records with a recorded degree**, with no session-type restriction
- AND IT MUST remain a single sentence in the existing pill position (R-IMC-006 AC.4 is preserved, only its wording changes)
- BUT it must NOT claim the number covers *all* degrees

---

## 5. Non-functional requirements

| Id | Requirement |
| --- | --- |
| NFR-DCE-001 | Removing one predicate MUST NOT change Q2's shape: still one union, one round-trip, no added fan-out. NFR-IMC-001's timing envelope carries over unmeasured — a predicate removal cannot slow the query. |
| NFR-DCE-002 | The change MUST be additive to consumers: the `degree` field's type and position on the payload are untouched. No client interface change beyond copy. |

---

## 6. Defect classes and their gates

| Class | What goes wrong | Gate |
| --- | --- | --- |
| **DC-A** | The `Training` predicate is removed but its **positional parameter is not**, shifting every later `?` — the DC-12 hazard, which returns **wrong rows rather than an error** | `indicator-metadata-reports.repository.spec.ts` asserts the full `params` array by position **and** the placeholder order in the SQL text. This is the regression gate: it must be **red** against current code |
| **DC-B** | The `Long-term` predicate is dropped along with `Training`, silently readmitting stale degrees | The stale-degree scenario of R-DCE-001, asserted as a distinct test |
| **DC-C** | Another section is disturbed by editing the shared union string | Existing full server suite, unmodified — the other six branches already have per-branch assertions |
| **DC-D** | Copy and query drift again — note says one thing, SQL does another | `indicator-metadata-bands.mapper.spec.ts` pins the new note string. **Known blind spot:** no automated check proves the sentence is *true of the SQL*; that link is human-verified at the HITL pause. **Accepted risk**, recorded here because it is the exact failure that produced this bug |
| **DC-E** | The fix is correct in tests but the real screen still shows the empty state (caching, non-primary linkage) | **No jest gate.** Substitute: owner check against live `A100` — the endpoint returns `PhD` **and** the card renders it. Named as a manual gate, not assumed |

**No-pass clause.** DC-A's test is only evidence if it **fails before the fix and passes after**. A test authored after the edit that has never been seen red is not a regression test — report it as inconclusive rather than as a pass.

---

## 7. Requirement index

| Id | Title | Surface |
| --- | --- | --- |
| R-DCE-001 | Degree counts long-term records of any session type | Server |
| R-DCE-002 | Card note matches the applied filter | Client |
| NFR-DCE-001 | Query shape unchanged | Server |
| NFR-DCE-002 | Payload contract unchanged | Server + Client |

---

## 8. Open items

- **Doc reconciliation, not a code task:** R-IMC-006 lives in an archived spec, which `CLAUDE.md` treats as an immutable point-in-time record. The supersession is recorded **here** and in `design.md`'s decision log — the archived file is **not** edited.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
