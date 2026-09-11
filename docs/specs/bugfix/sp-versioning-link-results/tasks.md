# Tasks — `SP_versioning` copies `link_results`

| Depth | Mode | Tasks | Est. LOC | PR strategy |
| --- | --- | --- | --- | --- |
| Lite | Bug | 2 | ~1,080 (≈14 genuinely new) | **Single PR** — one migration plus its fixture; splitting would land a red test with no fix |

---

## T-01 — Regression fixture: a versioned result keeps its links

| Field | Value |
| --- | --- |
| Status | `[x]` — PASSed, reopened for the approved A1/A2/A3 amendment, PASSed again (2nd Reviewer verdict, no advisories) |
| Size | S |
| Depends on | — |
| Requirements | R-SPL-001 (all clauses), R-SPL-002 |
| Design | DD-2, Verification Strategy |
| Skills | `nestjs-expert`, `systematic-debugging` |

### Scope

Add `test/fixtures/sp-versioning-link-results.fixture-spec.ts`, modelled on `test/fixtures/sp-versioning-objective-blocks.fixture-spec.ts` (same seeding/teardown contract, same "call the real SP" stance).

Cases:

1. **Copy** — seed an active non-snapshot STAR result + one active `link_results` row it owns; `CALL SP_versioning`; assert a row exists on the new snapshot's `result_id` with `other_result_id` and `link_result_role_id` preserved and a **fresh** `link_result_id`.
2. **Negative clauses of R-SPL-001** — an `is_active = FALSE` row is not copied; a row where the versioned result is only `other_result_id` is not copied; the source row is unchanged.
3. **Delete round-trip** — version → `CALL SP_delete_result_version` → version again, the `sp-versioning-roles-id` T-02b sequence, proving the copied rows do not block the physical delete (MySQL 1451).

**Amendment (2026-09-11, user-approved after the first Reviewer PASS).** Two assertions are added because, as first written, two cases could not fail for the reason they exist:

- **A1 — case 3 gains a target-side query.** It asserted only `WHERE result_id = <snapshot>`, so a T-02 block that remapped the **target** (`new_result_id AS other_result_id … WHERE lr.other_result_id = temp_result_id`) writes a row that query cannot see, and the case stays green. Add a companion `SELECT … WHERE other_result_id = <snapshot>` expecting zero rows. This closes the second of DD-2's two violation shapes.
- **A2 — case 4 must assert its own premise.** Its purpose is *"copied rows do not block the physical delete"*, yet it never checks a copied row is present before `CALL SP_delete_result_version`. Post-T-02 it would pass identically whether the copy landed or silently did not. Assert `link_results WHERE result_id = snapshot1Id` is non-empty **before** the delete — the exemplar does exactly this (`sp-versioning-objective-blocks.fixture-spec.ts:279-288`).

**A2 adds a second red on current `main`, and that is correct** — it is the same missing copy, observed at a second point. Expected after the amendment: still **6** failing suites, now **2** failing tests inside this one.

### Verification

```
npm run migration:test:bootstrap
npm run test:fixtures
```

- **Done when:** the fixture is **RED on current code** — case 1 fails because no row is copied.
- **Input that makes it fail:** current `main`. This is the required red; a fixture that is green before T-02 is testing nothing and must be rewritten.
- **Disqualifier — do not report a pass on any of these:** the scratch schema was not bootstrapped; the run errored before assertions (a count over a failed command is a confident zero, K-014); the suite was invoked as `npm test` (`rootDir: src`, never reaches `test/fixtures/`, KZ-017); or the seeded rows were left behind, which makes the next run's result meaningless.
- **Cannot prove:** nothing about Dev or Prod. Only the scratch schema is exercised.

---

## T-02 — Migration: add the `link_results` block to `SP_versioning`

| Field | Value |
| --- | --- |
| Status | `[ ]` |
| Size | S (logic) / L (bytes — DD-4) |
| Depends on | T-01 |
| Requirements | R-SPL-001, R-SPL-002, NFR-SPL-001, NFR-SPL-002 |
| Design | DD-1, DD-3, DD-4 |
| Skills | `nestjs-expert` |

### Scope

New append-only migration re-declaring `SP_versioning`.

- **Source of truth for the body:** the **currently deployed** procedure (`1788878752646-UpdateVersionSp.ts` `up()`), copied verbatim. Do not reconstruct it by hand (DD-4).
- Insert exactly one block after `result_innovation_use`:

```sql
INSERT INTO link_results (
    created_at, created_by, updated_at, updated_by, is_active, deleted_at,
    result_id, other_result_id, link_result_role_id
)
SELECT
    lr.created_at, lr.created_by, lr.updated_at, lr.updated_by, lr.is_active, lr.deleted_at,
    new_result_id AS result_id,
    lr.other_result_id,
    lr.link_result_role_id
FROM link_results lr
WHERE lr.is_active = TRUE
  AND lr.result_id = temp_result_id;
```

- `down()` re-declares the pre-change body verbatim (NFR-SPL-001).
- **Out of scope:** every delete routine (audited, already correct); `delete_result`'s one-direction soft delete; any schema change.

### Verification

```
npm run migration:test:bootstrap && npm run test:fixtures
npm run build && npx eslint src/db/migrations/<new-file>.ts
diff <(old body) <(new body)        # R-SPL-002
```

- **Done when:** T-01's fixture is **green**, all three of its cases pass, and the body diff shows **exactly one added hunk**.
- **Input that makes it fail:** dropping `AND lr.result_id = temp_result_id` (copies other results' links → case 2 red); omitting `is_active = TRUE` (→ case 2 red); including `link_result_id` in the column list (→ case 1's fresh-id assertion red); any stray edit in the re-pasted body (→ diff shows a second hunk).
- **Disqualifier:** a diff with more than one hunk is a FAIL even if every test is green — the fixture covers one table, not the other 30. `npm run lint` is **not** a gate here (it carries `--fix`, K-001); use bare `npx eslint`.
- **Cannot prove:** that Dev or Prod received the change. Applying it is a separate human decision (K-015) and is **not** part of this task's done criteria.

---

## Coverage

| Requirement / clause | Owned by |
| --- | --- |
| R-SPL-001 main scenario | T-01 case 1, T-02 |
| R-SPL-001 `BUT not is_active = FALSE` | T-01 case 2 |
| R-SPL-001 `BUT not target-side rows` | T-01 case 3, **both** query shapes (amendment A1) |
| R-SPL-001 `AND IT MUST leave the source untouched` | T-01 case 1 (corrected 2026-09-11 — this table said case 2; the assertions live in case 1) |
| R-SPL-001 fresh `link_result_id` | T-01 case 1 |
| R-SPL-002 | T-02 body diff |
| NFR-SPL-001 | T-02 `down()` |
| NFR-SPL-002 | T-02 scope (no DDL) |
