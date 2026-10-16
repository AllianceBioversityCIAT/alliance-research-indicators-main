# Proposal — Clear the Innovation Use justification when the level drops below 6

The server is the system of record. When a save lands with an effective catalog `level` below 6, it must write `innovation_use_level_explanation = NULL` — even if the STAR client still sends the old text. The client does not change. Other conditional fields do not change. Existing rows are not backfilled.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-stale-justification` |
| **Proposal path** | `docs/specs/bugfix/innovation-use-stale-justification/proposal.md` |
| **Slug** | `innovation-use-stale-justification` — supplied as a path. Free-text argument becomes proposal context, not a directory name: *al bajar el nivel de uso por debajo de 6, la justificación queda en la DB; limpiar solo ese campo en el servidor* |
| **Type** | **Bug** (data hygiene: a stored value that no longer applies) |
| **Mode** | **Lite / Bug Mode** — requires a regression test, red before the fix and green after |
| **Approval Mode** | **gated** — no end-to-end mandate was given |
| **Depends on** | none |
| **Parallel-safe** | **no** — edits `ResultInnovationUseService.update`, the same method `bugfix/innovation-use-draft-save` just changed, and the fixture files that prove DD-14 |
| **Related family** | [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) — **not** a manifest child (same pattern as `bugfix/innovation-use-draft-save` and the archived Results Center chip fix). Gains a **risk/follow-up row**, not a child row |
| **Indexed as** | **N-2** in [`docs/specs/innovation-use/OPEN-ITEMS.md`](../../innovation-use/OPEN-ITEMS.md) §0 |
| **Source of intent** | Product owner, 2026-08-21, after the test deployment. Scoped here by the `/akili-propose` argument: *server only, justification field only*. No Jira extracted this session |
| **Date** | 2026-08-24 |

---

## 2. Intent

A justification exists only to explain use levels 6–9. After a save whose effective catalog `level` is below 6 (or absent), that column must be empty in the database, so reports and re-reads cannot show a filled justification next to a level that does not require one.

---

## 3. Problem / Current Behavior

A reporter saves an Innovation Use result at level 6–9 with a justification, then lowers the stepper to a level that does not require one (e.g. 2) and saves again. The textarea is hidden. The text **stays in MySQL**.

The green check does not catch it: `innovation_use_validation` evaluates `IF(useLevel >= 6, explanationValid, TRUE)`, so a stale justification at level 2 **blocks nothing**. It only pollutes the row.

This is **N-2** in the Innovation Use open-items index. The product owner already ruled the scope: **the justification field only**, and **the server is the safe place**.

---

## 4. Proposed Outcome

| Behavior | Today | After |
| --- | --- | --- |
| Save after lowering catalog `level` from ≥ 6 to < 6 | Column keeps the old text | Column is **`NULL`**. GET returns `null`. STAR's post-save re-read empties the hidden field |
| Same-session lower → raise **without** saving | Text stays in the client signal (R-IUP-006 AC.3) | **Unchanged.** Server-on-save means they keep the draft text until they persist the lower level |
| Save at catalog `level >= 6` with the explanation key omitted | Column preserved (DD-14 / R-IUD-001 sc.1) | **Unchanged** — that rule still holds |
| Save at catalog `level >= 6` with a present explanation (`''`, `'   '`, or text) | Written through verbatim | **Unchanged** |
| API consumer PATCHes a sub-6 level **and** still sends the old explanation | Column rewritten with the stale text | Column **`NULL`** — the server overrides the payload |
| Other columns (actors, organizations, quantifications, the level itself) | Untouched by this rule | **Untouched** |
| Rows already inconsistent in the shared DB | Stay as they are | Stay as they are until the next save of that row (**OQ-1**) |

---

## 5. Scope

### Server (`server/researchindicators`)

| Item | Detail |
| --- | --- |
| One write-time rule in `ResultInnovationUseService.update` | After `resolveInnovationUseLevel` returns the catalog `level` (already computed, currently **discarded**), if that scalar is `undefined` or `< 6`, the step-6 `update` must pass `innovation_use_level_explanation: null` — **not** the DTO value, **not** `undefined` (TypeORM skips `undefined`; only `null` SETs the column). If the scalar is `>= 6`, keep today's write: DTO value as-is (`undefined` = preserve) |
| Compare `level`, never the FK | Family **D-1**: `id = level + 1`, so catalog **id 6 is level 5**. `resolveInnovationUseLevel` already joins the catalog and `Number(row.level)`s the bigint. Capture its return. Do **not** write `innovation_use_level_id >= 6` |
| Delete `_effectiveExplanation` while in the same method | Deferred item **D1** from `bugfix/innovation-use-draft-save`. It has **zero readers**. N-2 needs the *level* resolution, not that unused explanation merge. Deleting it here is cheaper than a follow-up that re-opens the same function. Also drop the three stale rationale paragraphs that claim it preserves a stored justification (that is step 6's partial merge, already documented) |
| Regression fixture (Bug Mode) | Against **real MySQL**, assert the **column** via raw `SELECT` (KZ-001 / KZ-017 — a mocked `UpdateQueryBuilder` cannot represent SET-NULL vs skip). Natural home: extend `innovation-use-level-boundary.fixture-spec.ts` (its job is the 5/6 threshold) **or** a new `*.fixture-spec.ts` on the next unused `result_official_code` band (**`903_000`** — grep sibling headers first, do not copy a list). See §9 for the falsifying inputs |
| Unit tests | Invert or add cases in `result-innovation-use.service.spec.ts` so a sub-6 update is asserted to pass `null` for the explanation. These do **not** replace the fixture |

### Documents

| Item | Detail |
| --- | --- |
| `innovation-use/family.md` | Add a follow-up/risk row (next free `FR-*`) pointing at this spec |
| `innovation-use/OPEN-ITEMS.md` | Mark N-2 as in-flight once this spec is approved |
| Correction Closure | Sweep `R-IUP-006` AC.3 ("hiding must not clear") so specify does not accidentally move the clear onto `onLevelSelected`. Sweep DD-14 / R-IUD-001 sc.1 so the ≥ 6 omitted-key preserve is not "fixed" |

### 5.1 Deployment

Server-only. STAR already re-reads after save (`getData()`), so a `NULL` column empties the hidden textarea without a client change. No coupling window.

No migration. The column is already nullable.

---

## 6. Non-Goals

- **Any client edit** — including `onLevelSelected`, `buildPayload`, and `showJustification()`. R-IUP-006 AC.3 stays: hiding the textarea must not clear the in-memory value. Clearing on the client would lose the text on a same-session lower→raise *before* save, which is worse UX than server-on-save.
- **Other conditional fields** (actors, organizations, quantifications, IP rights). Product owner: *justification only, this cycle*.
- **A backfill migration** of rows that are already inconsistent. Shared, non-disposable DB (root `CLAUDE.md` §4.3). **OQ-1**.
- **Historical / approved snapshots.** `ResultStatusGuard` already blocks mutations on non-editable statuses. Versioning copies stay as they were when snapshotted.
- **Changing the green-check SQL.** It already ignores the explanation below 6. This spec does not make a stale value fail a check it currently passes.
- **Re-introducing save-time completeness** (`validateLevelExplanation`). Deleted by `bugfix/innovation-use-draft-save`. Below-6 clearing is a hygiene write, not a 400.
- **Enabling `completenessValidation` on `DRAFT → SUBMITTED`** (OPEN-ITEMS **P1** / family **FR-9**).
- **Executing deferred D2** (assert workflow row 30). Unrelated.

---

## 7. Affected Users, Systems, And Specs

| | |
| --- | --- |
| **Users** | Result Contributors / MEL experts who lower an Innovation Use level after having justified a 6–9. Downstream report readers who would otherwise see a justification that does not apply |
| **Server** | `result-innovation-use` module — `update` only. Catalog lookup already exists |
| **Client** | None in this spec. STAR benefits via the existing post-save GET |
| **Specs** | `innovation-use/family.md` (follow-up row). Does **not** Pivot `details-page`: R-IUP-006 AC.3 (don't clear on hide) remains true. Does **not** edit archived `details-api` — write a superseding note only if specify finds an AC that asserted "sub-6 may keep a stored explanation" |
| **Not affected** | Green-check function, workflow config, every other indicator, every other section, OpenSearch (family **D-8**) |

---

## 8. Visual Reference

- **Source:** None
- **Location:** —
- **Notes:** Backend-only persist rule. No new UI, no Figma, no mockup. The STAR textarea already hides below level 6 (`showJustification`). What changes is the value that comes back from GET after save.

---

## 9. Bug Diagnosis

### Observed Symptom

After lowering the Innovation Use stepper from a level that requires a justification (`>= 6`) to one that does not, and saving, the justification text is still stored on `result_innovation_use.innovation_use_level_explanation`.

### Reproduction Steps

1. Open an Innovation Use (indicator 6) result in `DRAFT`.
2. Select stepper level **6** (catalog **id 7** — family D-1 trap).
3. Type a justification. Save. Confirm GET / DB holds the text.
4. Select stepper level **2** (catalog **id 3**). The textarea hides. Save.

**Expected:** column is `NULL`; a re-read shows no justification.
**Actual:** column still holds the text from step 3.

**Discriminating control:** raising back to 6 without saving keeps the in-memory text (client never cleared it). Saving at 6 again would persist it — which is correct. The defect is only the **persisted** sub-6 row.

### Root Cause (confirmed)

Two cooperating writes. Either one is enough to leave the stale value; STAR hits **both**.

**1. STAR re-sends the hidden field.** `onLevelSelected` updates only the id:

```ts
// innovation-use-details.component.ts — onLevelSelected
this.body.update(current => ({ ...current, innovation_use_level_id: levelId }));
```

The file comments this as required: *"`innovation_use_level_explanation` is never touched here — hiding the textarea below level 6 must not clear it (R-IUP-006 AC.3)"*. Then `buildPayload` sends `current.innovation_use_level_explanation ?? undefined`. A present string is a present JSON key. The PATCH after a level drop therefore **rewrites** the old text.

**2. The server trusts that payload.** Step 6 of `ResultInnovationUseService.update` writes the raw DTO:

```ts
await manager.getRepository(this.mainRepo.target).update(resultId, {
  innovation_use_level_id: createResultInnovationUseDto?.innovation_use_level_id,
  innovation_use_level_explanation:
    createResultInnovationUseDto?.innovation_use_level_explanation,
  ...
});
```

TypeORM's `UpdateQueryBuilder` skips `undefined` and SETs everything else. So:

| Incoming explanation | Effective catalog `level` | What happens today |
| --- | --- | --- |
| present string (STAR after a drop) | < 6 | **SET to the stale text** |
| omitted / `undefined` (API partial PATCH) | < 6 | **column untouched** — also stale if a prior ≥ 6 save left text |
| omitted / `undefined` | ≥ 6 | preserved — **correct**, R-IUD-001 sc.1 / DD-14 |
| present `null` / `''` | ≥ 6 | written through — **correct**, draft-save |

`resolveInnovationUseLevel(effectiveLevelId, resultId)` already returns the catalog `level` as a real `number` (bigint coerced). The call site **discards** that return and uses the method only for the unknown-id `400`. The missing rule is: *use that scalar to decide the explanation write.*

`_effectiveExplanation` is unrelated dead code (D1). OPEN-ITEMS N-2 item 3 warned that deleting it would throw away "the shape this change needs". That warning is **stale**: N-2 needs the *level* return value, not the unused explanation merge. Confirmed by grep this session: `_effectiveExplanation` has zero readers; `effectiveLevelId` has one consumer (`resolveInnovationUseLevel`).

The OPEN-ITEMS write-up also said the client *omits* the key when the field was never touched. That is true of a never-typed field (`?? undefined` drops `null`). It is **not** the STAR path for this bug: after typing at level 6, the string is still in `body()` and **is sent**. Specify must test **both** shapes, or the STAR path can stay broken while the omitted-key fixture goes green.

### Impact & Scope

| | |
| --- | --- |
| **Severity** | **Low for workflow, real for data hygiene.** Save works. Submit is not blocked. Reports and a later editor see a justification that does not apply |
| **Who hits it** | Anyone who saves at 6–9, then lowers the level and saves again. API consumers who PATCH a sub-6 level without sending `null` |
| **Blast radius of the fix** | One assignment in `update`'s step-6 write, plus capturing a return value that already exists. Client byte-identical. No migration |
| **What must not regress** | DD-14 omitted-key preserve at `level >= 6` (`innovation-use-section-round-trip.fixture-spec.ts` — the PATCH that omits the explanation while changing an actor count). Draft-save of blank / whitespace at `level >= 6` |

### Fix Strategy

`/akili-specify bugfix/innovation-use-stale-justification` in **Bug Mode**. Not `/akili-quick`: it changes persist behavior, must not break DD-14, and needs a fixture that asserts the column.

**Falsifying inputs the regression must go red on today** (K-004 / K-012 — name the concrete input, not "level drop"):

| # | PATCH (after a stored catalog id 7 + non-blank explanation) | Assert via raw `SELECT` |
| --- | --- | --- |
| **F1 — STAR shape** | `{ innovation_use_level_id: <id for level 2>, innovation_use_level_explanation: "<old text>" }` | column is **still the old text** today → must become **`NULL`** |
| **F2 — omitted key** | `{ innovation_use_level_id: <id for level 2> }` (no explanation key) | column **untouched** today → must become **`NULL`** |
| **F3 — trap** | `{ innovation_use_level_id: 6 }` (catalog **id 6 = level 5**) | must become **`NULL`**. A bug that compares the FK as `>= 6` would **keep** the text here and look fixed on F1 |
| **F4 — preserve** | omit explanation, keep catalog id 7 (level 6) | column **unchanged** — today's DD-14 fixture; must stay green |

F1 is the one that matches production STAR. F3 is the one that catches `id` vs `level`. A green F2 with a red-unwritten F1 is a false close.

**KZ-004 pre-flight:** `npm run test:fixtures` (`test/jest-fixtures.json`), `docker-compose.test.yml`, `scripts/load-baseline.js`, `orm.test.config.ts`, `src/db/baseline` — all present; this family has run the fixture tier green. Red-before-green is achievable. No waiver.

---

## 10. Approach Options

| | Option | Assessment |
| --- | --- | --- |
| **A** | **Server write-time clear.** Capture `resolveInnovationUseLevel`'s return. If `undefined` or `< 6`, pass `null` into step 6; otherwise keep the DTO value. Client untouched | **Recommended.** Matches the user's scope, closes both STAR and API paths, keeps R-IUP-006 AC.3 (in-session text survives a lower→raise without save), needs no migration |
| **B** | Client clears `body().innovation_use_level_explanation` inside `onLevelSelected` when the new resolved level is `< 6` | **Rejected.** Breaks R-IUP-006 AC.3. Loses same-session text. Leaves API consumers free to store inconsistent data. The user already ruled the server |
| **C** | Client omits the key *and* server clears | **Rejected as extra work.** Once A is in, STAR's re-sent string is discarded. Changing `buildPayload` would also risk R-IUD-001 sc.1 (a user who deletes their text at level ≥ 6 must send a present empty key, not omit) |
| **D** | Backfill migration `UPDATE … SET explanation = NULL WHERE level < 6` | **Out of scope this cycle** (OQ-1). Shared DB, versioning copies, approved snapshots. Hygiene-on-next-save covers live editable rows without a data rewrite |

---

## 11. Recommended Approach

**Option A.**

Why this is the smallest safe path:

1. The catalog `level` is **already resolved** on every PATCH; only the return is unused.
2. `null` in the `update()` payload is a SET; `undefined` is a skip — the same TypeORM fact DD-14 documented. The fix is one ternary on a write that already exists.
3. STAR's post-save GET already refreshes the form. No client change, no deploy coupling.
4. Same-session lower→raise without save **keeps** the draft text — the better answer to OPEN-ITEMS N-2 question 2, obtained by *not* clearing in the client.
5. Folding D1 (`_effectiveExplanation`) into the same method edit avoids a follow-up that only deletes comments.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Severity | Mitigation |
| --- | --- | --- | --- |
| **OQ-1** | **Backfill existing inconsistent rows?** Product owner did not ask for a migration. Recommendation: **going-forward only**. A later save of a sub-6 row cleans it | Low | Record the ruling at specify. Do not author a migration unless asked |
| **OQ-2** | **No level selected (`effectiveLevelId` null/undefined)** — clear or leave? Recommendation: **clear**. A justification with no level does not apply, same as sub-6 | Low | Default to clear; confirm at specify if the user disagrees |
| **R-1** | **Family D-1 trap** (`id ≠ level`). A threshold written on the FK treats catalog id 6 (level 5) as "still needs a justification" | **High** | F3 in §9. Reuse `resolveInnovationUseLevel`; never `innovation_use_level_id >= 6` |
| **R-2** | **False close on the omitted-key fixture.** STAR sends the string. A test that only omits the key can go green while production stays stale | **High** | F1 is mandatory. Cite KZ-001: assert the column, not the call sequence |
| **R-3** | **Regress DD-14 / R-IUD-001 sc.1.** Over-eager clearing at `level >= 6` would delete justifications the user never touched | **High** | F4; do not rewrite the ≥ 6 branch |
| **R-4** | **KZ-002 / R-IUP-006 AC.3.** A reviewer who "also" clears in `onLevelSelected` changes in-session UX the product already specified | Medium | Non-goal, stated. Correction Closure on that AC |
| **R-5** | Fixture band collision if a new file is added | Medium | Grep every `*.fixture-spec.ts` header; next unused band is **`903_000`** as of this proposal. Re-grep at execute time |
| **KZ-001** (staging lineage) | A mocked `update()` that is *called with* `null` is not evidence the column is NULL | — | Fixture + raw `SELECT` |
| **KZ-014 / K-004** | Do not claim the gate is red from reasoning | — | Run F1 against current HEAD before the fix |
| **KZ-017** | `npm test` (`rootDir: "src"`) never runs `test:fixtures` | — | The Bug-Mode evidence is `npm run test:fixtures`, named as such |

---

## 13. Success Criteria

1. After a PATCH that sets catalog `level` to **2** while still sending the old explanation string (STAR shape), a raw `SELECT` of `innovation_use_level_explanation` is **`NULL`**.
2. The same, with the explanation key **omitted**.
3. A PATCH to catalog **id 6** (level **5**) clears; a PATCH that keeps catalog **id 7** (level **6**) and omits the explanation **preserves** the stored text (DD-14 still green).
4. Blank / whitespace-only explanation at `level >= 6` still persists verbatim (`bugfix/innovation-use-draft-save` unchanged).
5. `_effectiveExplanation` is gone; `effectiveLevelId` + `resolveInnovationUseLevel` remain.
6. Client tree is **byte-identical** for this spec (`git diff --exit-code` on `client/`).
7. No migration added.
8. Regression is **observed red on current HEAD, then green after**, verbatim. Full server suite green in a quiet window. `npx eslint` clean on touched files (not `npm run lint` — K-001).

---

## 14. Next Step

```text
/akili-specify bugfix/innovation-use-stale-justification
```

Run it in **Bug Mode**. Confirm **OQ-1** (no backfill) and **OQ-2** (clear when no level) at the requirements gate if either ruling should change; the recommendations above are the defaults this proposal carries.
