# Proposal — C1: Optional / partial Theory-of-Change mapping

> **Headline:** Contributors currently **cannot save** a bilateral result when they answer "Yes" to ToC alignment but don't yet know the full Level → HLO → Indicator chain — the server returns an atomic `400 missing_required_fields`. This chunk relaxes that validator, rewords the question that triggers it, and locks in regression tests for four AC-1676 rules the module **already satisfies**.
>
> **Smallest safe path.** One string, one validator, and a regression net. No schema change, no new endpoint, no contract break beyond the documented 400-code relay.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/toc-optional-mapping/` |
| Chunk | **C1 of 2** (AC-1676 split) |
| Parent proposal | [`../mapping-adjustments/proposal.md`](../mapping-adjustments/proposal.md) |
| Jira | [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) · Epic [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Adjustments | **A1**, **A5** (implement) · **A2**, **A6**, **A10**, **A11** (verify) |
| **Type** | **Change** |
| **Approval Mode** | **gated** |
| Depends on | **none** — ship first |
| Parallel-safe | **no** — shares `bilateral.service.ts` and both FE components with C2 |
| Blocks | **C2** ([`../primary-contributing-sp/`](../primary-contributing-sp/proposal.md)) |
| Effort | **S** |

---

## 2. Intent

Make Theory-of-Change mapping genuinely optional, and stop asking a question whose answer is already implied.

---

## 3. Problem / Current Behavior

### 3.1 The blocking defect-shaped requirement (A5)

`BilateralService.validateTocAlignments` (`bilateral.service.ts:905-917`) treats `aligns_with_toc: true` as a promise that all three catalog references are present:

```ts
const missingFields = (['level', 'toc_result_id', 'indicator_id'] as const)
  .filter((field) => entry[field] === undefined || entry[field] === null);
if (missingFields.length) {
  for (const field of missingFields) {
    errors.push({ sp_code: entry.sp_code, field, error: 'missing_required_fields' });
  }
  continue;
}
```

Errors accumulate and throw as one atomic `400` (D-V2-8) — **nothing persists**. A contributor who knows the HLO but not the indicator cannot save at all.

AC-1676 explicitly requires the opposite:

> Users may submit: HLO/Outcome only. HLO/Outcome and Indicator. HLO/Outcome, Indicator, and Quantitative Contribution. No TOC information. **Missing TOC information must not prevent submission**, provided that a Primary SP has been selected.

### 3.2 The question no longer matches the model (A1)

`sp-toc-alignment-block.component.ts:160`:

```ts
readonly ALIGN_QUESTION = "Does this result align with the Program's TOC indicators?";
```

Per AC-1676, association with a Science Program **already implies** alignment. The question should ask about *intent to map*, not *fact of alignment*.

### 3.3 Four rules that already work

Confirmed in the working code. These need **tests, not code**:

| Rule | Evidence |
| --- | --- |
| **A2** — selector shows `SP06 – 10% – Climate Action` | `pool-funding-alignment.component.html:151,165` renders `{{code}} — {{allocation}}% - {{name}}` |
| **A6** — unit + target shown before contribution | `TocAlignmentReadbackResponse` carries `unit_of_measurement`, `target_value`, `target_year`; FE defines `UNIT_LABEL`, `TARGET_LABEL`, and a contribution callout |
| **A10** — read-only after PRMS submission | `is_read_only = isPrmsSourced \|\| isSyncedToPrms` (`bilateral.service.ts:575`); `409` on write at `:667` and `:1320` |
| **A11** — per-SP ToC isolation | partial-unique active row per `(result, sp)`, migration `1779190000015` |

---

## 4. Proposed Outcome

A contributor mapping the Primary SP's ToC can stop at any depth and still save:

| Answered | Saves? | Snapshot fields |
| --- | --- | --- |
| No | ✅ | all null (unchanged behavior) |
| Yes + Level only | ✅ **new** | ToC refs partially null |
| Yes + Level + HLO | ✅ **new** | indicator fields null |
| Yes + Level + HLO + Indicator | ✅ | populated (unchanged) |
| Yes + all four | ✅ | populated (unchanged) |

The question reads: **"Would you like to complete the detailed Theory of Change mapping for this result?"**

---

## 5. Scope

### In scope

1. **A1** — reword `ALIGN_QUESTION`; align surrounding helper copy if the mockup requires.
2. **A5** — relax `validateTocAlignments`: drop `missing_required_fields`; make `level_not_allowed`, `unknown_toc_result_id`, `unknown_indicator_id` fire **only when the field is present**.
3. **Null-tolerance contract** — define and test what the read-back returns for partial rows; ensure the FE renders partial state without throwing.
4. **A2 / A6 / A10 / A11** — regression tests asserting current behavior.
5. Swagger description updates on the PATCH body where the field-presence rules are documented.

### Non-goals

- **Primary vs Contributing SP** — that is C2. C1 keeps today's flat SP model.
- **Renaming `aligns_with_toc`** — the column and wire field keep their names; only the *meaning* shifts (parent §9 R-1). A rename mid-flight would break the FE for no user benefit.
- **Removing the version gate** — pending OQ-4.
- **Deleting or restructuring the per-SP ToC table** — explicitly preserved (parent §11 condition 2).
- Anything touching `pool-funding.util.ts` or its three call sites.

---

## 6. Affected Users, Systems, And Specs

| Surface | Change |
| --- | --- |
| Result Contributor | Can save partial ToC; sees the reworded question |
| `bilateral.service.ts` | `validateTocAlignments` (~lines 855-990) |
| `dto/update-pool-funding-alignment.dto.ts` | `@ApiPropertyOptional` descriptions on `TocAlignmentInputDto` state "required when aligns_with_toc is true" — must be corrected |
| `sp-toc-alignment-block.component.ts` | `ALIGN_QUESTION` + partial-state rendering |
| Existing specs | `bilateral.service.updateAlignment.tocAlignments.spec.ts`, `sp-toc-alignment-block.component.spec.ts` (1063 L), `pool-funding-alignment.component.spec.ts` (1582 L) |
| Docs | `docs/ux-ui/design.md` §12.2 decision entry (copy + semantic shift) |

---

## 7. Visual Reference

- **Source:** Jira attachment — **not yet ingested**.
- **Location:** `image-20260723-145821.png` (111 KB) on [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) — shows the reworded question.
- **Notes:** Canonical for A1's exact wording and placement, per the 2026-05-24 decision in `docs/ux-ui/design.md` §12.2 ("trust the Figma mockups as canonical UX" for this tab). Download to `docs/specs/bilateral/mapping-adjustments/mockup/` before `/akili-specify`.

---

## 8. Requirement Delta Preview

### ADDED

- A "Yes" ToC answer may omit `level`, `toc_result_id`, `indicator_id`, and `quantitative_contribution` in any suffix combination and still persist.
- A defined null-contract for partial rows on the read-back.

### MODIFIED

- **`ALIGN_QUESTION`** → *"Would you like to complete the detailed Theory of Change mapping for this result?"*; `aligns_with_toc` semantics shift from *"is aligned"* to *"opted into detailed mapping"*.
- **`validateTocAlignments`** — catalog checks become conditional on field presence.
- **Swagger** — `TocAlignmentInputDto` field descriptions.

### REMOVED

- **`missing_required_fields`** leaves the per-alignment 400 vocabulary. The other five codes (`duplicate_sp_code`, `sp_not_selected`, `level_not_allowed`, `unknown_toc_result_id`, `unknown_indicator_id`) remain. This is an FE-visible contract change — see R-5.

---

## 9. Risks, Dependencies, And Open Questions

| # | Risk | Mitigation |
| --- | --- | --- |
| **R-3** | Partial rows produce null `indicator_description` / `unit_of_measurement` / `target_value` in snapshots and read-back. | Make the null contract an explicit acceptance criterion — it is also what keeps the deferred PRMS story buildable (parent §11 condition 2). |
| **R-5** | Dropping `missing_required_fields` changes the frozen RB-4 relay the STAR FE branches on. | Treat as a coordinated contract change; update the RB-4 note; confirm no FE branch depends on that code before removing it. |
| **R-6** | 2645 lines of existing FE spec across the two components. | Budget spec-update effort as its own task. Client branch coverage floor is only 20%, so a silent regression can pass — assert explicitly. |
| **R-8** | `lambda-toc` DNS (RB-1, open) — catalog reads 503 cold. | Confirm infra resolution before executing, or pin `/etc/resolver/clarisa.cgiar.org` locally. |
| **R-1** | `aligns_with_toc` keeps its name while its meaning changes. | Record as a design decision. Stored values stay compatible (`true` = mapped). Do not rename. |

**Dependencies:** the Jira attachment (§7). Nothing else — C1 is deliberately unblocked.

**Open questions:**

| # | Question | Impact |
| --- | --- | --- |
| **OQ-4** | Does the version gate (`MAPPABLE_LIVE_VERSION = 2026`, `409 toc_mapping_version_locked`) still apply once mapping is optional? | If yes, unchanged. If no, C1 grows. **Answer before specify.** |
| **OQ-C1-1** | Is there a **minimum** depth for a "Yes"? Can a user answer Yes and supply *nothing*, or must at least `level` be present? AC-1676's list starts at "HLO/Outcome only", implying Level+HLO is the floor — but "No TOC information" is also listed as valid. | Decides whether Yes-with-nothing is a distinct state from No. |
| **OQ-C1-2** | Should a partially-filled row still be **upserted** when the user later completes it, or is each PATCH a full replace? Today's per-SP upsert semantics should carry over unchanged — confirm. | Persistence semantics |

---

## 10. Approach Options

| Option | Description | Verdict |
| --- | --- | --- |
| **A** | **Relax in place** — keep one validator, gate each check on field presence. | ✅ **Recommended.** Smallest diff, single code path, preserves atomicity (D-V2-8) and every other error code. |
| **B** | Introduce a `draft` vs `complete` alignment state with different validation per state. | Rejected — invents a state machine AC-1676 never asks for, and adds a column C2 would then have to reconcile. |
| **C** | Move validation to the FE and let the server accept anything. | Rejected — violates PRD AC-Role-Correctness ("authorization/validation is the source of truth; the client mirrors but never replaces it") and would let bad catalog refs persist. |

---

## 11. Recommended Approach

**Option A.** Gate each existing check on field presence rather than restructuring:

- `aligns_with_toc: false` → skip (unchanged).
- `aligns_with_toc: true` → validate **only the fields actually supplied**. `level` present → must be in `allowedLevels`. `toc_result_id` present → must resolve in the `(sp, level)` catalog. `indicator_id` present → must resolve within the chosen ToC result.
- Catalog fetch already keys on `(sp_code, level)`; entries without a level simply contribute no combo, so the cached fan-out (NFR-BIL-090/091) needs no redesign.
- Atomic-400 behavior, the remaining five error codes, and snapshot writing all stay as-is.

The result is *fewer* reasons to reject, with no new code paths — which is exactly what "the module is working fine" argues for.

---

## 12. Success Criteria

- A contributor answers Yes with **only Level + HLO** selected and saves successfully; read-back returns the row with null indicator fields; the FE renders it without error.
- A contributor answers Yes with **nothing else** — behavior matches the OQ-C1-1 decision.
- Supplying an **invalid** `toc_result_id` or `indicator_id` still returns `400` with the correct code — relaxation must not become blanket acceptance.
- The reworded question renders and matches the mockup.
- A2 / A6 / A10 / A11 each carry a regression test that fails if the behavior is removed.
- Server Jest ≥ 60% all metrics; client floors held; full suite green against the **measured** baseline of **320 server suites**. *(Corrected 2026-08-12: the original "291 suites / 1790 tests" figure matched no ref that ever existed — see `execution.md` → CF-1.)*
- No change to `is_read_only`, pool-funding derivation, catalog reads, or the per-SP table shape.

---

## 13. Next Step

```text
/akili-specify docs/specs/bilateral/toc-optional-mapping
```

Answer **OQ-4** and **OQ-C1-1** first — both change the acceptance matrix. Pull `image-20260723-145821.png` for the exact wording.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
