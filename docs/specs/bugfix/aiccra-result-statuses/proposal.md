# Proposal — Restore AICCRA status catalog without rewriting merged migrations

> **Headline:** Four commits on `AICCRA-OICR-error` are untrusted because one of them edited a merged TypeORM migration. Those commits are discarded. The product work is a **new append-only migration** plus `ResultStatusEnum`: deactivate unused **21 Editing in AICCRA**, keep **22 Submitted in AICCRA**, and insert only the missing AICCRA statuses from the screenshot (**Completed**, **Extended**, **On Going**).
>
> **Hard rule:** never edit a merged migration. Compensate with a new file under `src/db/migrations/`.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/aiccra-result-statuses/` |
| **Slug** | `aiccra-result-statuses` — **derived from free-text argument** (*reset four corrupt commits; add/update Submitted, Completed, Extended, On Going; deactivate 21; keep 22*), not a supplied path |
| **Type** | **Bug** — methodology violation (edited merged migration) plus catalog gap |
| **Approval Mode** | `gated` |
| **Module** | `bugfix/` · server (`server/researchindicators`) — `result_status` catalog + `ResultStatusEnum` |
| **Depends on** | none |
| **Parallel-safe** | **yes vs `AC-1679`** (other worktree). **no** vs a second task in `server/researchindicators` |
| **Date** | 2026-08-19 |
| **Requested by** | David (this session) |

---

## 2. Intent

Have STAR/ARI represent the four AICCRA statuses from the MARLO filter (**Submitted**, **Completed**, **Extended**, **On Going**) in `ResultStatusEnum` and `result_status`, without deleting historical rows and without rewriting history in already-applied migrations.

---

## 3. Bug Diagnosis

### Observed Symptom

- The four commits on `AICCRA-OICR-error` cannot be trusted.
- Commit `23993dd8` **rewrote** `1767821369314-insertAndUpdateNewStatus.ts` (already merged) to delete the AICCRA seed block. That is forbidden: TypeORM will not re-run that file on databases that already applied it, and rewriting it desynchronizes git history from production schema history.

### Reproduction Steps

1. Inspect `git log AICCRA-OICR-error -- server/researchindicators/src/db/migrations/1767821369314-insertAndUpdateNewStatus.ts`.
2. **Expected:** that file is unchanged after merge.
3. **Actual (before reset):** `23993dd8` modified it. Earlier commits in the same four also invented duplicate Submitted IDs (22 vs 26) and added `EDITING_IN_AICCRA` that is not in the screenshot.

### Root Cause (confirmed)

1. **`/akili-quick` was the wrong entry** for a catalog + migration change (data/schema). The gate should have escalated; it did not stop the work.
2. When asked to “adjust migrations” after removing Editing from the enum, the implementer **edited the merged seed** instead of appending a compensating migration. Constitution: *migrations are append-only; never edit a merged migration.*
3. **IDs 21 and 22 already exist in the live catalog** (seeded by `1767821369314`). Treating Submitted as a new consecutive ID (26) would duplicate the name `Submitted in AICCRA`.

### Impact & Scope

- Any environment that already ran `1767821369314` still has rows 21/22 regardless of a rewritten file.
- A rewritten merged migration can break checksums / review trust and future `migration:revert` of that class.
- **K-015:** CI/CD does **not** apply migrations; a correct new file still needs an explicit apply decision.

### Fix Strategy

1. **Discard the four commits** on `AICCRA-OICR-error` (already reset locally to `7597872e`; remote requires `--force-with-lease` — not `main`/`master`).
2. **Append** one new migration + enum update only.
3. Route remaining implementation through `/akili-specify` **Lite, Bug Mode** (regression: migration must not touch `1767821369314`; 21 must remain as a row with `is_active = 0`).

---

## 4. Problem / Current Behavior

| ID | Name (today) | In screenshot? | Action |
| --- | --- | --- | --- |
| 21 | Editing in AICCRA | No | **Soft-deactivate** (`is_active = 0`). Do **not** `DELETE`. |
| 22 | Submitted in AICCRA | Yes (Submitted) | **Keep**. Map in enum. Do not insert a second Submitted. |
| — | Completed | Yes | **Insert** (missing). |
| — | Extended | Yes | **Insert** (missing). |
| — | On Going | Yes | **Insert** (missing). |

`ResultStatusEnum` on a clean `AICCRA-OICR-error` has no AICCRA members (last catalog IDs: bilateral 23–25).

---

## 5. Proposed Outcome

After the new migration and enum:

| Enum | ID | Name | Active |
| --- | --- | --- | --- |
| *(no enum member)* | 21 | Editing in AICCRA | **false** |
| `SUBMITTED_IN_AICCRA` | 22 | Submitted in AICCRA | true |
| `COMPLETED_IN_AICCRA` | 26 | Completed in AICCRA | true |
| `EXTENDED_IN_AICCRA` | 27 | Extended in AICCRA | true |
| `ON_GOING_IN_AICCRA` | 28 | On Going in AICCRA | true |

IDs **23–25** stay bilateral. Display names keep the `in AICCRA` suffix already used for 21/22 and for PRMS/TIP.

---

## 6. Scope

- `ResultStatusEnum` + `ResultStatusNameEnum` only for **22, 26, 27, 28**.
- **One new** TypeORM migration: deactivate 21; insert 26–28 (22 already present).
- `down()`: reactivate 21; delete 26–28; leave 22 untouched.
- Work only on **`AICCRA-OICR-error`** (isolated worktree). Do not touch `AC-1679`.

---

## 7. Non-Goals

- Workflow / transitions / OICR mapper / STAR UI chips.
- Physically deleting row 21.
- Editing `1767821369314` or any other merged migration.
- Adding `EDITING_IN_AICCRA` to the enum (unused).
- Applying the migration against the shared Dev DB without an explicit human decision (**K-015**).

---

## 8. Affected Users, Systems, And Specs

- **Systems:** `result_status` catalog; any code that reads `ResultStatusEnum`.
- **Users:** AICCRA/MARLO consumers of STAR status labels; MEL seeing AICCRA result status.
- **Specs:** none dependent. PRD federation (STAR / TIP / PRMS / AICCRA) is the product context, not a delta to rewrite.

---

## 9. Visual Reference

- Source: screenshot of the AICCRA status filter (user-provided, this session).
- Location: chat assets (`image-1677ed3a-ccf9-4de8-8ac0-43dbe565280a.png` and earlier copies).
- Notes: backend catalog only; no STAR screen change in this spec. Labels in the image: **Submitted**, **Completed**, **Extended**, **On Going**.

---

## 10. Requirement Delta Preview

### ADDED

- Catalog + enum for Completed / Extended / On Going in AICCRA (IDs 26–28).
- Enum member for existing Submitted in AICCRA (ID 22).

### MODIFIED

- Row 21: `is_active` false (still in the table).

### REMOVED

- Nothing physically deleted.
- The four untrusted commits on `AICCRA-OICR-error` (git history of that branch only).

---

## 11. Approach Options

| Option | What | Trade-off |
| --- | --- | --- |
| **A (recommended)** | Deactivate 21; keep 22; insert 26–28; new migration only | Matches “create what is missing”; no duplicate Submitted |
| **B** | Insert all four as 26–29; also deactivate 22 | Two Submitted rows; wasteful |
| **C** | Rewrite `1767821369314` again | Repeats the methodology failure; does not fix DBs that already applied it |

---

## 12. Recommended Approach

**Option A.** Smallest safe path: append-only migration + enum. Recover the branch by resetting the four commits (`force-with-lease` on `AICCRA-OICR-error` only).

---

## 13. Risks, Dependencies, And Open Questions

| Risk | Mitigation |
| --- | --- |
| **K-015** — merge ≠ apply | Do not run `migration:execute` on shared Dev unless the user authorizes it |
| FK/results still pointing at 21 | Deactivate, do not delete; existing FKs stay valid |
| Force-push rewrites remote `AICCRA-OICR-error` | Explicitly requested; `--force-with-lease`; never `main`/`master` |
| Open: exact display strings | Recommend keep `Submitted in AICCRA` on 22; new rows `Completed in AICCRA`, `Extended in AICCRA`, `On Going in AICCRA` |

---

## 14. Success Criteria

- [ ] `git log AICCRA-OICR-error` does not contain the four `[SPEC:quick/aiccra-result-statuses]` commits.
- [ ] `1767821369314-insertAndUpdateNewStatus.ts` matches `origin` before those commits (AICCRA 21/22 inserts intact).
- [ ] New migration is the only schema file in the change; it sets 21 inactive and inserts 26–28.
- [ ] Enum exposes 22, 26, 27, 28 — not 21.
- [ ] No physical `DELETE` of 21.

---

## 15. Next Step

```text
/akili-specify docs/specs/bugfix/aiccra-result-statuses
```

Lite depth, **Bug Mode** — convert this diagnosis into a fix plan and a regression that fails if a merged migration is edited or if 21 is deleted.
