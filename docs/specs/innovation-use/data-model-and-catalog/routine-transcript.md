# Lifecycle Routine Transcript

> **Authority for M6.** This file is the transcription of the four MySQL lifecycle routines that enumerate result child tables by name. **M6 is written from this file, not from `design.md` prose** (DD-12).
>
> **Revision 2 — 2026-08-14.** Revision 1 was graded **DEFECTIVE** by both Judgment Day round-3 judges: it claimed three routines (there are four) and its block list was derived by a single-line `grep` rather than by reading, missing 10 of 29 copy blocks. This revision was produced by the method in §0 and every block below was read in full.

---

## 0. The method that produced this file

Three steps, in order. Steps 1 and 2 are cheap; skipping either is what produced three consecutive wrong routine-set claims.

**Step 1 — enumerate by call site, never by suspected name.**

```
grep -rnoE "(CALL [A-Za-z_]+|SELECT [a-z_]+\(\?)" --include="*.ts" src \
  | grep -v spec | grep -v migrations
```

Run 2026-08-14. Returns **exactly eight call sites resolving to four routines** — the complete set, reproduced in §1. Authoritative cross-check when a database is reachable:

```sql
SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE();
```

**Step 2 — resolve each routine's *latest* definition.** Every routine is redefined across many migrations; the newest migration is not necessarily the one that defines a given routine. `SP_delete_result_version` lives in `1778510205765`, and `1783029013035` — the newest lifecycle migration — contains **zero** occurrences of that name. `delete_result` was last defined in `1764275660631`, six migrations earlier still.

**Step 3 — transcribe each body by reading it.** A `grep`-derived list may **not** be labelled a transcription. Blocks formatted with `INSERT` / `INTO` / `<table>` on separate source lines are invisible to a single-line grep, and in revision 1 that silently dropped `result_quantifications` — a table that **is** already copied, and would have been duplicated by an author trusting the list.

---

## 1. The routine set — four routines

| Routine | Kind | Signature | Latest definition | `up()` body | `down()` |
| --- | --- | --- | --- | --- | --- |
| `SP_versioning` | **PROCEDURE** | `(IN resultCode BIGINT)` | `1783029013035-UpdateDeleteAndVersionSp.ts` | `:8` – `:988` | `:1168` (full recreate) |
| `SP_delete_result_version` | **PROCEDURE** | `(IN resultCode BIGINT, IN reportYear INT)` | `1778510205765-updatefulldelete.ts` | `:173` – `:334` | `:337` — **bare `DROP`, no recreate** |
| `full_delete_result_version` | **FUNCTION** | `(resultCode BIGINT) RETURNS tinyint(1)`, `READS SQL DATA` | `1783029013035-UpdateDeleteAndVersionSp.ts` | `:993` – `:1163` | `:2099` (full recreate) |
| **`delete_result`** | **FUNCTION** | `(result_code BIGINT) RETURNS tinyint(1)`, `DETERMINISTIC` | `1764275660631-updateDeleteFunctions.ts` | `:312` – `:511` | `:813` (full recreate) |

### 1.1 Call sites — the complete set

| Routine | Call pattern | Sites |
| --- | --- | --- |
| `SP_versioning` | `CALL` | `green-checks.repository.ts:307`, `result-status-workflow.repository.ts:172` |
| `SP_delete_result_version` | `CALL` | `green-checks.repository.ts:294`, `result-status-workflow.repository.ts:152` |
| `full_delete_result_version` | `SELECT` | `query.service.ts:90` |
| **`delete_result`** | `SELECT` | `query.service.ts:78`, `result.repository.ts:516`, `tip-integration.repository.ts:27` |

### 1.2 Semantics — name each routine by what it does, not by what it is called

Revision 1 mislabeled `SP_delete_result_version` "soft delete". That mislabel filled the soft-delete slot in the taxonomy with the wrong routine and is the probable reason the real one stayed invisible for three review rounds.

| Routine | What it actually does |
| --- | --- |
| `SP_versioning` | Copies a live result and its children into a new **snapshot** row (`is_snapshot = TRUE`) |
| `SP_delete_result_version` | **Hard-removes a snapshot version** — `DELETE FROM` on 33 tables, keyed by `result_official_code` + `reportYear`, `is_snapshot = TRUE` |
| `full_delete_result_version` | **Hard-removes any result** — `DELETE FROM` on 35 tables, keyed by `result_id` |
| **`delete_result`** | **The soft delete** — `UPDATE … SET is_active = FALSE, deleted_at = NOW()` on 29 tables, and `results.result_status_id = 8` |

---

## 2. `SP_versioning` — all 29 copy blocks, in body order

Absolute line of each `INSERT` keyword in `1783029013035-UpdateDeleteAndVersionSp.ts`.

| # | Line | Target | # | Line | Target |
| --- | --- | --- | --- | --- | --- |
| 1 | 45 | `results` | 16 | 496 | `result_evidences` |
| 2 | 93 | `result_keywords` | 17 | 526 | `result_capacity_sharing` |
| 3 | **116** | **`result_impact_outcomes`** ⚠️ §2.4 | 18 | 584 | `result_ip_rights` |
| 4 | **143** | **`result_strategic_objectives`** ⚠️ §2.4 | 19 | **625** | **`result_actors`** |
| 5 | 170 | `result_oicrs` | 20 | **662** | **`result_institution_types`** |
| 6 | 214 | `result_notable_references` | 21 | **695** | **`result_innovation_dev`** ← template, ends **770** |
| 7 | 240 | `result_impact_areas` | 22 | 772 | `result_innovation_tool_function` (ends 794) |
| 8 | 266 | `result_impact_area_global_target` | 23 | 796 | `result_sdgs` |
| 9 | **297** | **`result_quantifications`** ← already copied | 24 | 819 | `result_policy_change` |
| 10 | 328 | `result_users` | 25 | 847 | `result_regions` |
| 11 | 354 | `result_contracts` | 26 | 871 | `result_countries` |
| 12 | 382 | `result_levers` | 27 | 898 | `result_countries_sub_nationals` |
| 13 | 412 | `result_lever_sdg_targets` | 28 | 930 | `result_languages` |
| 14 | 441 | `result_lever_strategic_outcome` | 29 | 956 | `submission_history` |
| 15 | 470 | `result_institutions` | | | |

**Two facts that revision 1 got wrong, restated because both are traps:**

- **`result_quantifications` IS already copied** (block 9, `:297`, including `quantification_role_id`). `design.md` §3.5 reuses that table for Innovation Use. **M6 must NOT add a copy block for it** — doing so duplicates quantification rows on every version bump, for **every** indicator.
- **The `result_innovation_dev` block ends at line 770, not ~795.** Lines 772–794 are the `result_innovation_tool_function` block.

**Insertion point for `result_innovation_use`:** immediately after line **770** (the end of the `result_innovation_dev` block), before the `result_innovation_tool_function` block at 772.

**Not copied by `SP_versioning` at all:** `result_knowledge_products`, `link_results`, `result_institution_ai`, `result_user_ai`, `result_initiatives`, `result_tags` — all six are deleted by the delete routines but never versioned. Pre-existing; out of scope.

### 2.1 `result_actors` column list (block 19, line 625) — verbatim

```
created_at, created_by, updated_at, updated_by, is_active, deleted_at,
result_id, actor_type_id, sex_age_disaggregation_not_apply,
women_youth, women_not_youth, men_youth, men_not_youth,
actor_role_id, actor_type_custom_name
```

15 columns; the `SELECT` mirrors them with alias `ra.`, substituting `new_result_id AS result_id`. Filter: `WHERE ra.is_active = TRUE AND ra.result_id = temp_result_id`.

**M6 appends five:** `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`, `actors_count` — to the column list **and** the `SELECT` list.

### 2.2 `result_institution_types` column list (block 20, line 662) — verbatim

```
created_at, created_by, updated_at, updated_by, is_active, deleted_at,
result_id, institution_type_id, institution_type_role_id,
sub_institution_type_id, institution_type_custom_name,
is_organization_known, institution_id
```

13 columns; `SELECT` alias `rit.`, same substitution and filter.

**M6 appends one:** `organization_count` — to both lists.

### 2.3 `result_innovation_dev` block (block 21, line 695) — the template's shape

Audit prefix (`created_at, created_by, updated_at, updated_by, is_active, deleted_at`), then `result_id`, then 26 domain columns. The `SELECT` substitutes `new_result_id AS result_id` and takes the rest from alias `rid.`, filtered `WHERE rid.is_active = TRUE AND rid.result_id = temp_result_id`.

**The `result_innovation_use` block mirrors this exactly**, with domain columns `innovation_use_level_id` and `innovation_use_level_explanation`.

### 2.4 ⚠️ Blocks 3 and 4 are non-executable — a pre-existing defect discovered by this transcription

`SP_versioning` **cannot run today, for any indicator.** Blocks 3 (`result_impact_outcomes`, `:116`) and 4 (`result_strategic_objectives`, `:143`) each carry three independent defects:

| # | Defect | Evidence |
| --- | --- | --- |
| 1 | **References a dropped column.** Both column lists include `roles_id`. `1783022620616-UpdateRoleColumnObjetives.ts:13,29` runs `ALTER TABLE … DROP COLUMN roles_id` on **both** tables. No later migration re-adds it (migrations run to `1784211738931`). → MySQL error **1054, Unknown column** | Column created `1782486943935:15,21`; dropped `1783022620616:13,29`; still referenced `1783029013035:126,153` |
| 2 | **Column/value count mismatch.** 11 columns against 10 `SELECT` expressions in both blocks | `:117-127` vs `:129-138`; `:144-154` vs `:156-165` |
| 3 | **Copies the source PK into an AUTO_INCREMENT PK.** Both `SELECT`s include `rio.id` / `rso.id` against an `id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY`, so the value collides with the row it was read from → error **1062, Duplicate entry** | `1782486943935:15,21` declares the PK; `:135`, `:162` copy it |

Migration order confirms the defect is live: `1783022620616` (drops `roles_id`) executes **before** `1783029013035` (recreates `SP_versioning` still naming it).

**Why this is M6's problem.** M6 must `DROP` + `CREATE` `SP_versioning`, reproducing the whole body. Three consequences:

1. Reproduced verbatim, M6 re-emits a procedure that raises 1054 on first call — so fixtures **F13** and **F16** cannot pass, and their failure would be **misattributable to Innovation Use**.
2. M6's `down()` would restore a body that is equally broken.
3. Any versioning fixture is un-runnable until the blocks are repaired, which makes **DC-12 ungated** regardless of how well M6 is written.

**Ruling: DD-13** (`design.md` §11) — the repair lands in its own migration **M0**, ahead of M6, and is verified by fixture **F18** independently of Innovation Use. See the escalation note in `design.md` §12: this is a pre-existing production defect affecting all six indicators, and the user may prefer to extract it into its own bugfix spec.

---

## 3. `SP_delete_result_version` — 33 deletes (`1778510205765:173-334`)

Guarded by a `temp_result_id` lookup on `is_active = TRUE AND is_snapshot = TRUE AND report_year_id = reportYear AND result_official_code = resultCode`; **`SIGNAL SQLSTATE '45000'`** when null. Then `DELETE FROM <table> WHERE result_id = temp_result_id` in this order:

`result_oicrs` (192) · `result_notable_references` (196) · `result_knowledge_products` (200) · `result_quantifications` (204) · `result_impact_area_global_target` (208, subquery) · `result_impact_areas` (214) · `link_results` (218, `result_id` **OR** `other_result_id`) · `result_innovation_tool_function` (223) · `result_keywords` (227) · `result_institution_ai` (231) · `result_user_ai` (235) · `result_initiatives` (239) · `result_tags` (243) · `result_users` (247) · `result_contracts` (251) · `result_lever_sdg_targets` (255, subquery) · `result_lever_strategic_outcome` (261, subquery) · `result_levers` (267) · `result_institutions` (271) · `result_evidences` (275) · **`result_innovation_dev` (279)** · `result_actors` (283) · `result_institution_types` (287) · `result_ip_rights` (291, keyed `result_ip_rights_id`) · `result_capacity_sharing` (295) · `result_policy_change` (299) · `result_regions` (303) · `result_sdgs` (307) · `result_countries_sub_nationals` (311, subquery) · `result_countries` (317) · `result_languages` (321) · `submission_history` (325) · `results` (329)

**Insertion point:** after the `result_innovation_dev` delete, i.e. after line **281**.

> **`down()` is a bare `DROP`** (`:337-344`) — it drops both routines and recreates **neither**. The "down restores the prior body" pattern is **not** consistent precedent in this repo; M6's author must write `down()` deliberately rather than copying a neighbour.

---

## 4. `full_delete_result_version` — 35 deletes (`1783029013035:993-1163`)

Guarded by a `temp_result_id` lookup on `result_id = resultCode` only; **`RETURN FALSE`** when null (*not* `SIGNAL` — the two routines diverge on null handling). Same `DELETE FROM` shape:

`result_oicrs` (1010) · `result_notable_references` (1014) · `result_knowledge_products` (1018) · `result_quantifications` (1022) · `result_impact_area_global_target` (1026, subquery) · `result_impact_areas` (1032) · `link_results` (1036) · `result_innovation_tool_function` (1042) · **`result_impact_outcomes` (1046)** · **`result_strategic_objectives` (1050)** · `result_keywords` (1054) · `result_institution_ai` (1058) · `result_user_ai` (1062) · `result_initiatives` (1066) · `result_tags` (1070) · `result_users` (1074) · `result_contracts` (1078) · `result_lever_sdg_targets` (1082, subquery) · `result_lever_strategic_outcome` (1088, subquery) · `result_levers` (1094) · `result_institutions` (1098) · `result_evidences` (1102) · **`result_innovation_dev` (1106)** · `result_actors` (1110) · `result_institution_types` (1114) · `result_ip_rights` (1118, keyed `result_ip_rights_id`) · `result_capacity_sharing` (1122) · `result_policy_change` (1126) · `result_regions` (1130) · `result_sdgs` (1134) · `result_countries_sub_nationals` (1138, subquery) · `result_countries` (1144) · `result_languages` (1148) · `submission_history` (1152) · `results` (1156) → `RETURN TRUE`

**Insertion point:** after the `result_innovation_dev` delete, i.e. after line **1108**.

### 4.1 Pre-existing divergence between the two hard-delete routines — do NOT harmonize

| | `SP_delete_result_version` | `full_delete_result_version` |
| --- | --- | --- |
| `result_impact_outcomes` | **absent** | deletes (1046) |
| `result_strategic_objectives` | **absent** | deletes (1050) |
| Null-result handling | `SIGNAL SQLSTATE '45000'` | `RETURN FALSE` |
| Table count | 33 | 35 |

Both tables **are** copied by `SP_versioning` (blocks 3–4), so `SP_delete_result_version` leaves them orphaned. **This is pre-existing and out of scope.** It is recorded so M6's author does not "helpfully" harmonize the two and silently change delete behavior for every indicator. R-IU-011 AC.8 asserts the divergence survives M6 intact.

> **Inbound notice — filed 2026-08-18 by `bugfix/sp-versioning-roles-id`'s validation-remediation pass (W-5). The table and the prose above are left exactly as written; this notice edits no claim in this file and no acceptance criterion anywhere.** That spec's T-02b (`[x]` done, Reviewer PASS 2026-08-14) closed the table-enumeration half of the divergence above, in its own separate migration (`1784250000000`): `SP_delete_result_version` now deletes `result_impact_outcomes` / `result_strategic_objectives`, mirroring `full_delete_result_version`.
>
> **⚠️ UPDATED 2026-08-18 — the conditional in this notice has already fired.** *(Residual site of correction item 1, KZ-005; this notice formerly read "pending merge of `bugfix/sp-versioning-roles-id` … Once that migration merges … verify with `SHOW CREATE PROCEDURE SP_delete_result_version`".)* **That migration is committed on this branch and ordered before every Innovation Use migration, so it is already in force.** Therefore, **for M6's purposes right now**: "**absent**" (both rows) and "Table count 33" in §4 / §4.1 above describe the routine's **pre-T-02b** state and are **stale** — the current body deletes those two tables and its table count is **35**. **T-10 must transcribe `SP_delete_result_version` from migration `1784250000000`, not from this section's table and not from `main`.** Only the `SIGNAL` vs `RETURN FALSE` half of this divergence remains pre-existing as of M6. **R-IU-011 AC.8/AC.9 have been amended accordingly** (2026-08-18 correction pass, item 2) — they now require only the `SIGNAL` vs `RETURN FALSE` divergence and `delete_result`'s six soft-delete gaps to survive, and explicitly forbid restoring the closed table-enumeration divergence. The parallel notices are at `design.md:426` and `:506` (both marked resolved).

---

## 5. `delete_result` — the soft delete, 29 updates (`1764275660631:312-511`)

Guarded by `SELECT r.result_id INTO resultId FROM results r WHERE r.is_active = TRUE AND r.result_id = result_code LIMIT 1`; `RETURN FALSE` when null. Then `UPDATE <table> SET is_active = FALSE, deleted_at = deleteDate WHERE result_id = resultId AND is_active = TRUE`, in this order:

`results` (331 — **also sets `result_status_id = 8`**) · `result_keywords` (338) · `result_knowledge_products` (344) · `result_oicrs` (350) · `result_notable_references` (356) · `result_quantifications` (362) · `result_impact_area_global_target` (368, `INNER JOIN`) · `result_impact_areas` (375) · `result_innovation_tool_function` (381) · `result_institution_ai` (387) · `result_user_ai` (393) · `result_users` (399) · `result_contracts` (405) · `result_levers` (411) · `result_institutions` (417) · `result_countries_sub_nationals` (423, `INNER JOIN`) · `result_countries` (431) · `result_regions` (437) · `result_evidences` (443) · `link_results` (449) · `result_policy_change` (455) · `result_capacity_sharing` (461) · **`result_innovation_dev` (467)** · `result_ip_rights` (473, keyed `result_ip_rights_id`) · `result_languages` (479) · `result_institution_types` (485) · `result_tags` (491) · `result_initiatives` (497) · `result_actors` (503) → `RETURN TRUE`

**Insertion point:** after the `result_innovation_dev` update, i.e. after line **471**:

```sql
UPDATE result_innovation_use riu
SET riu.is_active = FALSE,
    riu.deleted_at = deleteDate
WHERE riu.result_id = resultId
    AND riu.is_active = TRUE;
```

### 5.1 Six tables this routine does not soft-delete

`result_sdgs`, `result_impact_outcomes`, `result_strategic_objectives`, `result_lever_sdg_targets`, `result_lever_strategic_outcome`, `submission_history`. Pre-existing; out of scope; recorded so the gap is not mistaken for one M6 introduced.

---

## 6. M6's complete change set — six edits across four routines

| # | Routine | Edit | Insert after line |
| --- | --- | --- | --- |
| 1 | `SP_versioning` | Append 5 count columns to the `result_actors` block — column list **and** `SELECT` list (§2.1) | within block at 625 |
| 2 | `SP_versioning` | Append `organization_count` to the `result_institution_types` block — both lists (§2.2) | within block at 662 |
| 3 | `SP_versioning` | **New** `result_innovation_use` copy block, shaped per §2.3 | **770** |
| 4 | `SP_delete_result_version` | `DELETE FROM result_innovation_use WHERE result_id = temp_result_id;` | **281** |
| 5 | `full_delete_result_version` | Same `DELETE` | **1108** |
| 6 | **`delete_result`** | **`UPDATE result_innovation_use SET is_active = FALSE, deleted_at = deleteDate …`** (§5) | **471** |

**Explicitly NOT in the change set:**

- No copy block for `result_quantifications` — already copied (§2, block 9).
- No delete/update change for `result_actors` or `result_institution_types` — both are already removed wholesale by row on all three delete paths. Only the versioning **copy lists** need the new columns.
- No harmonization of the delete divergence (§4.1) or the soft-delete gaps (§5.1).
- The M0 repair of blocks 3–4 (§2.4) is a **separate migration**, not folded into M6.

**Migration mechanics.** Each routine is `DROP` + `CREATE` reproducing the full body. `down()` restores each prior body verbatim — noting that `SP_delete_result_version`'s own historical `down()` does **not** follow that pattern (§3), so it must be written, not copied.

### 6.1 Body sizes for the LOC estimate

`down()` reproduces each prior body in full, so every routine counts twice.

| Routine | `up()` body | ×2 for `down()` |
| --- | --- | --- |
| `SP_versioning` | 981 | 1,962 |
| `SP_delete_result_version` | 162 | 324 |
| `full_delete_result_version` | 171 | 342 |
| **`delete_result`** | **200** | **400** |
| **Total** | **1,514** | **~3,028** |

Plus ~45 lines of new statements → **M6 ≈ 3,070 LOC**. M0 (§2.4 repair) adds a further `SP_versioning` DROP+CREATE pair ≈ **1,960 LOC**.

---

## 7. What this transcript does *not* establish

- It does **not** prove M6 will be correct. The transcript is the input; the §6.5 fixture harness (F13–F18) is the only evidence the amended routines behave.
- It does **not** cover routines outside the result lifecycle. Re-run §0 step 1 before any future "complete set" claim — do not trust this table for a different change.
- **Line numbers drift** the moment a migration is added above these. Re-verify at implementation time. The routine names, kinds, call sites, semantics, column lists, and insertion *anchors* ("after the `result_innovation_dev` block") are the stable part; the absolute numbers are not.
