# Design — project-dashboard / degree-chart-empty

- **Module:** agresso (server) + project-dashboard (client)
- **Spec id:** 2026-08-degree-chart-empty
- **Status:** draft
- **Depth:** **Lite** + **Bug Mode**
- **Requirements:** `./requirements.md` (R-DCE-001, R-DCE-002, NFR-DCE-001/002)
- **Last updated:** 2026-08-03
- **Delegation note:** the Step 2.3 reversion challenge was run **inline**, not delegated — this session's operating policy forbids spawning subagents unless the user asks. Recorded per the command's inline-fallback rule; its outcome is §7.

---

## 1. Executive summary

**Delete one predicate and its positional parameter. Reword one string. Invert the tests that pinned the old rule.**

```
 WHERE f.is_active = TRUE
-  AND f.session_type_id = ?      -- Training   ← remove (and its param)
   AND f.session_length_id = ?    -- Long-term  ← keep
```

There is no schema change, no contract change, no new module, no new query. The `degree` section keeps its type, its position in the payload, and its place in the union.

---

## 2. Change points

| # | File | Change | Requirement |
| --- | --- | --- | --- |
| 1 | `server/.../agresso-contract/repositories/indicator-metadata-reports.repository.ts:317` | Remove `AND f.session_type_id = ?` from the `degree` branch | R-DCE-001 |
| 2 | same file, `:370-378` | Remove `SessionTypeEnum.TRAINING` from `params` — array goes **7 → 6** | R-DCE-001 / DC-A |
| 3 | same file, doc comment above `getCapacitySharingMetadata` | Update the prose that describes the degree branch as a conjunction | R-DCE-001 |
| 4 | `server/.../repositories/indicator-metadata-reports.repository.spec.ts:311-366` | Invert the three DC-2 assertions to the corrected contract | DC-A, DC-B |
| 5 | `client/.../project-dashboard/indicator-metadata-bands.mapper.ts:81` | Reword `DEGREE_FILTER_SCOPE_NOTE` | R-DCE-002 |
| 6 | `client/.../indicator-metadata-bands.mapper.spec.ts` | Update the pinned note string | DC-D |

Whether `SessionTypeEnum` remains imported in the repository depends on other uses in the file — it has none, so the import goes too, or lint will say so.

---

## 3. Data model

**Unchanged.** No migration, no entity change, no index. `result_capacity_sharing.degree_id` and `session_length_id` already exist and are already read.

---

## 4. API design

**Unchanged.** `GET /api/agresso/contracts/reports/full?contract-id=…` keeps its shape; `degree: MetadataEntryDto[]` keeps its type and position. Swagger is untouched, so `agresso-contract.swagger.spec.ts` needs no edit (NFR-DCE-002).

The observable difference is **values only**: `degree: []` → `degree: [{ id, name, count }]` on contracts that have long-term engagements with a recorded degree.

---

## 5. Backend module design

The `degree` branch becomes a single-predicate filter over the same union:

- Scope: unchanged — the shared `buildPrimaryContractResultsScopeSql()` CTE.
- `INNER JOIN degrees l ON l.degree_id = f.degree_id` — unchanged, and it is what enforces "has a recorded degree": a NULL `degree_id` cannot join, so no explicit `IS NOT NULL` is needed or wanted.
- `AND f.session_length_id = ?` — retained as the stale-degree guard.
- Grouping, ordering, bucketing, and the `_debug` per-section log line — all unchanged.

**The parameter array is the hazard, not the SQL.** `params` is positional and shared by all seven branches. Removing the predicate without removing `SessionTypeEnum.TRAINING` shifts `LONG_TERM` into the degree slot and every `SessionFormatEnum` one place left — which, per the project's DC-12 note, **returns wrong rows rather than erroring**. The gate is the whole-array positional assertion, which after the fix reads:

```
[contractId, LONG_TERM, INDIVIDUAL, GROUP, GROUP, GROUP]   // 6, not 7
```

---

## 6. Frontend design

One exported constant, one sentence. No component, template, layout, token, or state change — the card, its empty state, and its pill position are all unchanged (R-IMC-006 AC.4 survives; only its wording moves).

| | Text |
| --- | --- |
| Before | `Includes only long-term training records with a recorded degree.` |
| After | `Includes only long-term records with a recorded degree.` |

Dropping the single word `training` is the whole change: the sentence still declares the two conditions that are actually applied (long-term, has a degree) and still stops the number being read as "all degrees".

---

## 7. Reversion challenge (Step 2.3)

**DD-1 removes a shipped predicate, so it gets challenged: what does removing `session_type_id = Training` break?**

| Candidate breakage | Verdict |
| --- | --- |
| Another consumer depends on the training-only degree count | **No.** `SessionTypeEnum.TRAINING` appears exactly **twice** in non-spec server source — both in this one `params` array (`grep` over `src`, migrations excluded). The result-level PDF handler (`cap-sharing-pdf-section.handler.ts`) reads the record's own fields and applies no such filter |
| Stale degrees get readmitted | **No.** The retained `session_length_id = Long-term` is the predicate that guards staleness. R-IMC-006 AC.2's scenario (Training + Short-term + MSc) still fails to qualify, and it stays asserted as its own test (DC-B) |
| A row switched Training → Engagement keeps a degree it should not have | **Not a breakage.** The form still shows and *requires* Degree for Engagement + Long-term, so the value remains one the user was asked for. Only a switch **away from Long-term** orphans a degree, and that case is caught by the retained predicate |
| Counts jump for historical/imported rows (TIP/PRMS/AICCRA) | **Real and intended.** Any long-term row carrying a degree now counts. That is the corrected semantic, not a side effect. Worth naming at the HITL check so a jump in a familiar number is not mistaken for a new bug |

**Corroboration the challenge surfaced — the report was the only outlier of three independent definitions of this rule:**

| Definition | Condition for a Degree to exist | Session type in it? |
| --- | --- | --- |
| Angular form | `session_length_id === 2` | **No** |
| MySQL section-completeness function (`1753460254629-createFunctions.ts:404`) | `IF(session_length_id = 2, degree_id IS NOT NULL, TRUE)` | **No** |
| Q2 report query | `session_type_id = 1 AND session_length_id = 2` | **Yes** ← the outlier |

The server's own validation function — the thing that decides whether the CapSharing section counts as complete — agrees with the form. **Two of three sources already implement the corrected rule.** The challenge found nothing the design must address.

---

## 8. Design decisions

| Id | Decision | Rationale / rejected alternative |
| --- | --- | --- |
| **DD-1** | Remove `session_type_id = Training` from the degree branch; keep `session_length_id = Long-term` | The report must state the rule the user was asked to satisfy. **Supersedes R-IMC-006 AC.1** — see DD-4 |
| **DD-2** | Do **not** replace the predicate with `degree_id IS NOT NULL` | The `INNER JOIN degrees` already excludes NULLs. An explicit predicate would be redundant, and *substituting* it for the long-term guard would readmit stale degrees — the failure R-IMC-006 was right to prevent |
| **DD-3** | Rows with `session_length_id` NULL stay excluded | Rejected alternative: `session_length_id = 2 OR session_length_id IS NULL`. A degree with no recorded length is data the form cannot produce and the completeness function rejects; admitting it would trade a false-negative bug for a false-positive one. Any such rows are a **data** question for MEL, outside this fix |
| **DD-4** | Record the supersession here; do **not** edit the archived spec | Root `CLAUDE.md` treats `docs/specs/archive/` as point-in-time records. R-IMC-006 AC.1 was approved on a rationale that misread the form; the correction belongs in the superseding spec. This is an **AC** supersession, not an ADR — no TRD ADR is overturned, so no `superseded` flip is needed |
| **DD-5** | Reword the note rather than remove it | The pill exists so the count is not read as "all degrees" (R-IMC-006 AC.4). That reason survives the fix; only the word `training` becomes false |

---

## 9. Budget (Step 2.4)

| Metric | Expected |
| --- | --- |
| Tasks | **3** |
| Net LOC changed | **~45** (production: ~4; specs and copy: the rest) |
| Review rounds | **1** |

**Sizing re-check:** the design confirms **Lite** was right. It does *not* collapse to `/akili-quick` — a one-line SQL edit that inverts an approved acceptance criterion, shifts a positional parameter array, and changes user-facing copy is exactly the class of "trivial-looking" change that quick-tracking gets wrong.

**Tripwire for `/akili-execute`:** production changes beyond the two lines in §2 rows 1-2, or a fourth task appearing, means the diagnosis was incomplete — **stop and escalate** rather than widening the fix.

---

## 10. Verification strategy

| Gate | Command / check | Covers |
| --- | --- | --- |
| Regression (red → green) | `npm test -- --silent indicator-metadata-reports.repository.spec` | DC-A, DC-B, R-DCE-001 |
| No collateral damage | `npm test -- --silent` (server, full) | DC-C, NFR-DCE-002 |
| Client copy pinned | `npm test -- --silent indicator-metadata-bands.mapper.spec` | DC-D |
| Live confirmation | Owner: `reports/full?contract-id=A100` returns `PhD` **and** the card renders it | DC-E |

**No-pass clause.** The regression test counts as evidence only if it was observed **failing before** the production edit. A test written after the fix has never proven anything about the bug — report that as inconclusive, not as a pass.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
