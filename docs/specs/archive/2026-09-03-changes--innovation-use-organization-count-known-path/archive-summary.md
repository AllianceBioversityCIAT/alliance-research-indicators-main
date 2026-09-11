# Archive Summary — Organization count belongs to the unknown-organization path only

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/changes/innovation-use-organization-count-known-path` |
| Archive path | `docs/specs/archive/2026-09-03-changes--innovation-use-organization-count-known-path` |
| Archive date | 2026-09-03 |
| Type | **Change** · Depth **Lite** · Approval Mode **gated** |
| Branch | `AC-1679-Create-the-innovation-use-section` (**spec branch** — shared-file writes deferred) |
| Escalated from | `/akili-quick` — failed the triviality gate on control flow, spec reversal, and data semantics |
| **Final status** | ✅ **COMPLETE** — 3/3 tasks PASS, 0 rework, 0 HALTs, 0 pivots |

---

## 2. What shipped

In the Innovation Use organization card, **Organization count** now renders — and persists — only when the row identifies an institution **type**. A row that names one specific CLARISA institution is no longer asked "how many organizations?", because the answer can only be one.

Three production lines:

| File | Change |
| --- | --- |
| `innovation-use-organization-item.component.html` | The `organization_count` `app-input` block **moved** inside the `@else` (unknown) branch |
| `innovation-use-details.component.ts:526` | `organization_count: known ? null : row.organization_count` |
| `innovation-use-details.component.ts:92` | `organization_count?: number \| null` — the widening the four sibling fields already had |

---

## 3. Requirements delivered

| ID | Requirement | Status |
| --- | --- | --- |
| `R-IUC-001` | The count field renders only when the organization is not known | ✅ 3 scenarios, 4 ACs, every clause test-owned |
| `R-IUC-002` | A known-path row persists no organization count | ✅ 2 scenarios, 4 ACs |
| `NFR-IUC-001` | The server tier is untouched | ✅ 11 paths changed, **0 under `server/`** |
| `NFR-IUC-002` | Numeric hygiene survives on the surviving surface | ✅ `c6` unmodified and green |

---

## 4. Files changed

**11 paths** — 4 client, 7 docs. Code: 102 insertions / 21 deletions; production alone: 14 / 14.

| Group | Files |
| --- | --- |
| Client production | `innovation-use-organization-item.component.html`, `innovation-use-details.component.ts` |
| Client tests | the two matching `*.spec.ts` |
| Archive amended | `2026-08-26-innovation-use--details-page/{design.md,tasks.md}` — §5.5, `tasks.md:309`, `DD-4`, §16 index row |
| This spec | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md` |

Commits: `b7eafa25` (T-01) · `93568e1c` (T-02) · `3ecb3672` (T-03) · `96e74916` (D-7 close) · `5a1e4d76` (validation + test gaps).

---

## 5. Test evidence

**317 suites / 6798 tests green** · `npm run build` exit 0 · `npx eslint` exit 0.

All **11** defect classes closed. Every gate this spec claimed had a red was **observed failing first** (K-004), and the reds were *discriminating*, not uniform — `D-3`'s reverted ternary reddened 3 of 4 assertions, the unknown-path case correctly staying green.

`D-7` (card layout) had **no automated gate by design** — jsdom cannot evaluate layout — and was closed by the user's browser check on both paths.

---

## 6. Validation

**PASS — 0 FAIL, 0 open WARN.** The substantive audit was delegated to an independent read-only reviewer because the validator had authored the spec documents; that delegation produced **all four WARNs**, at least two of them textbook same-author blind spots that three per-task Reviewer passes had missed. All closed before archive.

---

## 7. Accepted follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| **A-1** | No spec in the client package drives a PrimeNG checkbox through its rendered element — deleting an `(onChange)` binding would ship green. | **Carried out of the spec.** Pre-existing, repo-wide, outside this change's surface. Never converted into a task: unapproved scope is not scope. Earns its own proposal if it is to be fixed. |
| **A-2** | `spec.ts:334`'s `?? 0` cannot distinguish "`[min]` blocked the paste" from "the paste was inert". | Pre-existing, inside a block `NFR-IUC-002` forbids editing. Not actionable within this spec's fence. |
| **A-3** | `R-IUC-002` Sc.1's row-inclusion clause is reasoned, not measured. | Accepted: the predicate is provably absent from the diff, confirmed at source by two reviewers. |

---

## 8. Historical notes

**Why this was not a quick fix.** It arrived as `/akili-quick` and was refused: it added a conditional, reversed an approved design decision protected by a pinning test, and changed what the save payload carries. The refusal was load-bearing — the change as originally scoped **did not compile**, and the client's `npm test` gate could not have caught it (`isolatedModules: true` means jest type-checks nothing). A quick fix would have shipped a broken build behind a green suite.

**What the process found that the proposal did not:**

| Source | Finding |
| --- | --- |
| Step 2.3 reversion challenge | The payload edit did not compile — the interface was never widened (`DD-6`) |
| Step 2.3 reversion challenge | A **second** Lens B guard breaks, not only `spec.ts:183` (`D-11`) |
| T-02 Reviewer | `D-4` had a named falsifying input but was never run red — closed inline |
| T-03 Reviewer | Success criterion 8 demanded erasing frozen history — corrected |
| Validation audit | A `T-04` that never existed; the archive's **live** `DD-4` still asserting "both paths"; a path count that was wrong and listless; "~90 LOC met exactly" never measured |

**The decision this spec reversed** had no recorded rationale: the archived `design.md` §5.5 claimed to mirror a reference card that has no `organization_count` at all.

**`OQ-1` dissolved by user ruling:** Innovation Use is still in development, the captured counts are consumed by nothing, and any matching rows are disposable test data. Confirmed at source that `resolveOrganizationCount` returns `{}` for any role other than `INNOVATION_USE`, so Innovation Dev was structurally unreachable from this change.
