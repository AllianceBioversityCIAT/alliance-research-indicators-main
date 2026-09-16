# Requirements — Innovation Use / Stale justification on level drop

- **Module:** results (`result-innovation-use`)
- **Spec id:** 2026-08-innovation-use-stale-justification
- **Status:** specified (Phase 3 complete; not executed)
- **Owner:** Engineering / product owner
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §3.1 Result Contributor · §1 server as system of record
- **Linked tickets:** none extracted; family [AC-1679](https://cgiarmel.atlassian.net/browse/AC-1679)
- **Last updated:** 2026-08-24
- **Extends:** persist contract of archived `innovation-use/details-api` (DD-14) and `bugfix/innovation-use-draft-save` (R-IUD-001 sc.1)
- **Indexed as:** **N-2** in [`docs/specs/innovation-use/OPEN-ITEMS.md`](../../innovation-use/OPEN-ITEMS.md) §0 — not a family child

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-stale-justification` |
| **Depth** | **Lite** · **Bug Mode** (regression test mandatory) |
| **Type** | Bug |
| **Approval Mode** | `gated` |
| **Proposal** | [`./proposal.md`](./proposal.md) — option **A** (server write-time clear). `/akili-specify` this session treats it as approved intent |
| **Root cause** | Confirmed: STAR re-sends the hidden justification; the server writes the DTO as-is. See `proposal.md` §9 |
| **OQ-1 / OQ-2** | **Resolved in this document** as the proposal defaults (no backfill; clear when no level). Overturn at this gate if needed |
| **Date** | 2026-08-24 |

---

## 2. Executive Summary

A justification exists only for catalog `level` 6–9. After a save whose **effective** catalog `level` is below 6 or absent, `innovation_use_level_explanation` MUST be `NULL` in MySQL — even if the caller still sent the old text.

This spec does not change the STAR form, the green check, or any other field. It does not backfill rows that are already inconsistent.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Catalog `level`** | `clarisa_innovation_use_levels.level`, reached by joining on `innovation_use_level_id`. **`id = level + 1`**: catalog **id 7 is level 6**; catalog **id 6 is level 5**. Comparing the FK as `>= 6` is the family D-1 trap |
| **Effective post-write row** | Payload merged over the stored row. An omitted scalar key keeps the stored value (DD-14). The clear/preserve rule uses **this** row's catalog `level`, not "did the level key arrive in this PATCH" |
| **STAR shape** | PATCH that still includes `innovation_use_level_explanation: "<old text>"` after the stepper dropped below 6. This is what STAR sends today (`onLevelSelected` never clears the signal) |
| **Omitted-key shape** | PATCH with no `innovation_use_level_explanation` key |

---

## 4. System Context & Scope

**In scope:** the Innovation Use section `PATCH` persist path. After the write, if the effective catalog `level` is `< 6` or there is no level, the justification column is `NULL`. GET of that section returns `null` for it. A Bug-Mode regression that is red on current HEAD (STAR shape) and green after.

**Out of scope**

| Excluded | Why |
| --- | --- |
| Any file under `client/` | Product owner: server only. STAR already re-reads after save. R-IUP-006 AC.3 (hiding must not clear in-memory text) stays |
| Other conditional fields | Product owner: justification only this cycle |
| Backfill of already-inconsistent rows | **OQ-1 → going-forward.** Next save of a sub-6 row cleans it. Shared DB is not disposable |
| Green-check SQL / workflow config | Already ignores the explanation below 6. This is hygiene, not a 400 |
| Re-introducing `validateLevelExplanation` | Deleted by `bugfix/innovation-use-draft-save` |
| Historical / approved snapshots | Status guard already blocks those writes |
| Deferred D1 (`_effectiveExplanation`) as a requirement | Unrelated dead code (Bug Mode: do not fold cleanup). **Permitted** if the same method is edited; not a done-criterion |
| Deferred D2 / P1 | Unrelated |

**Renders on:** no UI change. Observable via the existing section GET after PATCH.

---

## 5. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| **Result Contributor** (PRD §3.1) | After lowering the use level and saving, must not see a leftover justification on re-read |
| **MEL / report consumer** | Must not read a filled justification next to a level that does not require one |
| **API consumer** | Direct PATCH of a sub-6 level cannot keep storing inconsistent data |

---

## 6. Functional Requirements

### R-IUJ-001 — A saved row below level 6 has no justification

- **As a** Result Contributor or API consumer
- **I want** the stored justification cleared when the effective use level no longer requires one
- **So that** the database does not keep a value that does not apply

**Details**

- Inputs: existing Innovation Use `PATCH` body. No new fields.
- Behavior: after persist, if the effective post-write catalog `level` is `< 6` **or absent**, `innovation_use_level_explanation` SHALL be `NULL`. A present explanation in the payload SHALL NOT prevent the clear.
- Outputs: existing envelope, `2xx`. GET `data.innovation_use_level_explanation` is `null`.
- Errors: none new. This is not a `400`.
- Permissions: unchanged (`ResultStatusGuard` + existing section access).

**Acceptance criteria**

- [ ] AC.1 — **STAR shape.** Stored catalog id 7 (level 6) + non-blank explanation, then `PATCH { innovation_use_level_id: <id for level 2>, innovation_use_level_explanation: "<old text>" }` → column is `NULL`. Envelope `2xx`.
- [ ] AC.2 — **Omitted-key shape.** Same stored row, then `PATCH { innovation_use_level_id: <id for level 2> }` with no explanation key → column is `NULL`.
- [ ] AC.3 — **D-1 trap.** Same stored row, then `PATCH { innovation_use_level_id: 6 }` (catalog id 6 = **level 5**) → column is `NULL`.
- [ ] AC.4 — **No level.** Same stored row, then a PATCH whose effective level id is `null` / omitted-with-no-stored-level → column is `NULL`.
- [ ] AC.5 — Actors, organizations, quantifications, `innovation_use_level_id`, and audit fields follow **today's** persist rules. This requirement SHALL NOT rewrite or deactivate them as a side effect of the clear.

#### Scenario: STAR save after dropping to level 2 *(the reported bug)*

- GIVEN an editable Innovation Use result whose stored catalog id is **7** (level **6**) and whose justification is a non-blank string
- WHEN a `PATCH` sets the level to catalog id **3** (level **2**) **and still sends that same justification string**
- THEN the response is `2xx` and GET `data.innovation_use_level_explanation` is `null`
- AND a raw read of `result_innovation_use.innovation_use_level_explanation` for that `result_id` is `NULL`
- BUT it must NOT reject the save (`400`) because of the justification
- AND IT MUST still persist the new `innovation_use_level_id`

#### Scenario: Partial PATCH that only changes the level

- GIVEN the same stored row
- WHEN a `PATCH` sets catalog id **3** and **omits** `innovation_use_level_explanation`
- THEN the column is `NULL` (omission does not preserve a now-inapplicable value)
- BUT it must NOT be accepted as "fixed" if the STAR-shape scenario above still fails

#### Scenario: Catalog id 6 is level 5, not "still requires a justification"

- GIVEN the same stored row
- WHEN a `PATCH` sets `innovation_use_level_id` to **6**
- THEN the column is `NULL`
- AND IT MUST decide from the catalog `level` (5), never from the FK value 6
- BUT it must NOT keep the text on this input — that is the false-green of a `>= 6` written on the id

---

### R-IUJ-002 — A saved row at level 6–9 keeps today's justification contract

- **As a** Result Contributor
- **I want** lowering-the-level hygiene not to delete a justification that still applies
- **So that** draft-save and omitted-key preserve still work

**Details**

- When the effective catalog `level` is `>= 6`, persist of `innovation_use_level_explanation` SHALL be unchanged from `bugfix/innovation-use-draft-save` / DD-14: omitted key preserves; present `''` / `'   '` / text is written through.

**Acceptance criteria**

- [ ] AC.1 — Stored catalog id 7 + non-blank explanation, `PATCH` that **omits** the explanation key and does not lower the level → column is **byte-identical** to before.
- [ ] AC.2 — At effective `level >= 6`, a present blank or whitespace-only explanation still persists verbatim (R-IUD-001 sc.2 unchanged).
- [ ] AC.3 — The existing DD-14 fixture (omitted explanation while changing an actor count, level stays ≥ 6) stays green.

#### Scenario: Omitted key at level 6 still preserves

- GIVEN an editable Innovation Use result at catalog id **7** (level **6**) with a stored justification
- WHEN a `PATCH` omits `innovation_use_level_explanation` and does not change the level to one whose catalog `level` is `< 6`
- THEN the stored justification is unchanged
- BUT it must NOT write `NULL` on this path
- AND IT MUST leave `bugfix/innovation-use-draft-save` behavior intact at `level >= 6`

---

## 7. Non-Functional Requirements

### NFR-IUJ-001 — Server-only, no schema change

- **Category:** dx / reliability
- **Target:** `git diff --exit-code -- client/` for this spec. Zero new migrations. Column stays nullable; no backfill.
- **How verified:** `git status` / `git diff --name-only` after the change. A file under `client/` or `src/db/migrations/` is a FAIL.

### NFR-IUJ-002 — Regression evidence is the column, observed red then green

- **Category:** dx
- **Target:** At least F1 (STAR shape) is **observed red on current HEAD** against real MySQL, then green after the fix. Assertion is a raw `SELECT` of the column, not that an in-memory `update()` was called with `null`.
- **How verified:** `npm run test:fixtures` (KZ-017: `npm test` with `rootDir: "src"` never runs this config). K-004: a reasoned "would be red" is not evidence.

---

## 8. Data, API, Cross-system

| Topic | This spec |
| --- | --- |
| **Data** | No columns added/changed/removed. `innovation_use_level_explanation` is already nullable. No OpenSearch (family D-8). No backfill |
| **API** | Existing Innovation Use section `PATCH`. Same URL, DTO, guards, Swagger. Behavior change on one field when effective catalog `level` `< 6` or absent |
| **STAR** | No spec and no code change. Post-save GET already empties the hidden textarea once the column is `NULL` |
| **Family docs** | `family.md` gains a follow-up/risk row at execute/specify close; not a new child |

---

## 9. Defect classes this spec can produce, and the gate for each

| Class | Gate | Input that makes it FAIL |
| --- | --- | --- |
| **D1 — STAR path still stale** | Fixture F1: PATCH level 2 **with** the old explanation string; raw `SELECT` is `NULL` | Current HEAD (no fix): column still holds the text. After fix: restore DTO-passthrough write → FAIL |
| **D2 — Omitted-key path still stale** | Fixture F2: PATCH level 2 with no explanation key; raw `SELECT` is `NULL` | Current HEAD: column untouched. A fix that only overrides a *present* key leaves this red |
| **D3 — Threshold written on the FK** | Fixture F3: PATCH catalog **id 6** (level 5); column `NULL` | `if (innovation_use_level_id >= 6)` keeps the text here while F1 looks fixed |
| **D4 — Over-clear at level ≥ 6** | Existing DD-14 fixture + R-IUJ-002 AC.1 | Writing `null` whenever the explanation key is omitted, ignoring level → FAIL |
| **D5 — False close on a mock** | Forbidden as Bug-Mode evidence. Unit "called with `null`" MAY exist; it MUST NOT be the regression cited for R-IUJ-001 | A green unit spec with F1 unwritten or skipped is **inconclusive**, never a pass (KZ-001 / KZ-017) |
| **D6 — Client or migration touched** | `git diff --exit-code -- client/` and no new file under `src/db/migrations/` | Any client byte or new migration → FAIL |
| **D7 — 400 reintroduced** | F1/F2 return `2xx` | Restoring `validateLevelExplanation` → FAIL |

**No class is unsubstituted.** This spec produces no visual output.

> **Disqualifier:** `npm test` is **not** the Bug-Mode gate (it cannot see `test/fixtures`). A targeted or filtered fixture run is **inconclusive** (KZ-003). A red that was not observed is not a red (KZ-014 / K-004).

---

## 10. Assumptions, dependencies, risks

| ID | Item |
| --- | --- |
| **A-1** | OQ-1: **no backfill**. Inconsistent rows already in the shared DB stay until their next save |
| **A-2** | OQ-2: **no effective level ⇒ clear**, same as sub-6 |
| **D-1 trap** | Catalog `id ≠ level`. Owned by R-IUJ-001 AC.3 |
| **Depends on** | none. Must not invert R-IUD-001 / DD-14 at `level >= 6` |
| **Parallel-safe** | no — same `update` method as `bugfix/innovation-use-draft-save` |

---

## 11. Open questions

None blocking. OQ-1 and OQ-2 are recorded as **A-1** and **A-2**. Overturn them at this gate if the product owner wants a backfill or wants a missing level to preserve the text.

---

## 12. Requirement ID Index

| ID | Behavior | Scenarios | ACs |
| --- | --- | --- | --- |
| R-IUJ-001 | Clear justification when effective catalog `level` `< 6` or absent | 3 | 5 |
| R-IUJ-002 | Preserve today's contract at `level >= 6` | 1 | 3 |
| NFR-IUJ-001 | Server-only, no migration | — | — |
| NFR-IUJ-002 | Column-level red-then-green fixture | — | — |

---

## 13. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner (OQ-1 / OQ-2 defaults)
- [ ] Security review — not required (no auth/secrets)
- [ ] DevOps — not required (no infra, no migration)
