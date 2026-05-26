# Rollout checklist — Bilateral / Pending items (Phase 1.5)

- **Spec:** [`./tasks.md`](./tasks.md) T-15.7 ([§7 Apply all migrations to dev / staging / production](./tasks.md))
- **Requirements covered:** R-BIL-075, NFR-BIL-072
- **Last verified on dev:** 2026-05-26 (commit `d5a0691c` on `AC-1594-bilateral-module-v2`)
- **Owner:** DevOps + ARI backend (paired)

> The dev leg of T-15.7 is **complete** — every Phase 1.5 migration applied during code development, smoke clean, revert paths exercised. This document covers **staging → production**.

---

## 1. Migrations to apply (in order)

| # | Timestamp | File | Task | Forward effect | Revert effect |
| --- | --- | --- | --- | --- | --- |
| 1 | `1779190000010` | `createClarisaScienceProgramsAndSeed.ts` | T-15.4 prereq | Creates `clarisa_science_programs` table + seeds 13 SP rows | Drops table |
| 2 | `1779190000011` | `createBilateralProjectMapping.ts` | T-15.13 | Creates `bilateral_project_mapping` table + STORED GENERATED column + partial-unique index | Drops table |
| 3 | `1779190000012` | `addIconKeyToScienceProgram.ts` | T-15.4 | `ALTER TABLE clarisa_science_programs ADD COLUMN icon_key VARCHAR(64) NULL` + seeds `icon_key = official_code` for 13 rows | Drops column |
| 4 | `1779190000013` | `renameLeverCodeToSpCodeOnAlignmentSp.ts` | T-15.3 | DROP idx → `CHANGE COLUMN lever_code sp_code VARCHAR(50)` → ADD idx | Symmetric inverse |
| 5 | `1779190000014` | `fixResultPoolFundingAlignmentPartialUnique.ts` | T-15.17 | DROP plain UNIQUE → ADD STORED GENERATED `active_result_id` → ADD UNIQUE on it | **Forward-only in practice** — DOWN fails once the table accumulates ≥ 2 deactivated rows per result. See §3 + the migration's DOWN comment. |

Apply in **numeric order**. TypeORM's `migration:execute` does this automatically — the table `<schema>.migrations` tracks which have run.

---

## 2. Per-environment procedure

Same sequence for staging and prod:

### 2.1 Pre-flight

```bash
# On the deploy box / CI runner, against the deployed dist/:
cd server/researchindicators
git pull                    # latest AC-1594-bilateral-module-v2 OR the merged main, depending on cut
npm ci                      # exact dep tree from package-lock
npm run build               # builds dist/

# Confirm env vars target the right DB:
echo "$ARI_MYSQL_HOST $ARI_MYSQL_DATABASE"   # sanity — must match expected env
```

### 2.2 Apply migrations

```bash
# Dry-run check — lists what's pending without applying:
npm run typeorm migration:show -- -d dist/db/config/mysql/orm.config.js

# Apply:
npm run migration:execute

# Should print four "Migration ... has been executed successfully." lines
# (or fewer if some already landed in a prior wave).
```

### 2.3 Smoke (NFR-BIL-072 — zero 500s post-rollout)

Replace `$BASE` with the env base URL (e.g. `https://api-staging.example.org` / `https://api.example.org`). `$TOKEN` is a valid ROAR JWT for that env.

```bash
# A. SP catalog — must be 200 with 13 rows, each carrying icon_key:
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/tools/clarisa/science-programs" \
  | jq '.status, (.data | length), all(.data[]; .icon_key != null)'
# Expected output:
#   200
#   13
#   true

# B. DI sanity check — /api/v2/results must be 200 (catches DI cycle regressions):
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v2/results?limit=1"
# Expected: 200

# C. Bilateral mapping endpoint — must register (T-15.14 + module wiring):
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/bilateral-project-mappings?limit=1" \
  | jq '.status, .data.meta.total'
# Expected: 200, and an integer (0 if no mappings exist yet — fine).

# D. Per-result SP picker (T-15.11) — must respond 200 for any bilateral-eligible result:
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/results/<known-bilateral-result-code>/pool-funding-alignment/science-programs" \
  | jq '.status, .data.mapping_status'
# Expected: 200, and "mapped" or "unmapped" (both are valid).
```

If any of A–D fails, **stop and proceed to §3 rollback**. Don't continue to the next env.

### 2.4 Post-smoke

- Log the rollout in the team channel (env name + commit hash + timestamp + who).
- Note in the deploy ticket which migrations were already applied (the `migration:show` output) vs which were new.

---

## 3. Rollback

If any smoke fails (most likely culprit: a deploy on the same server still running with the **old** dist/ and trying to query a renamed column), the safe path is to **revert the offending migration**, redeploy the previous build, then investigate:

```bash
# Revert the most recently applied migration:
npm run migration:revert
```

Revert order is LIFO. To roll all 4 Phase 1.5 migrations back, run `migration:revert` 4 times — confirming each step.

The migrations are mostly symmetric, with one exception:
- `1779190000014` (T-15.17 partial-unique fix) — **forward-only in practice**. The DOWN tries to re-add the old plain `UNIQUE (result_id, is_active)` index, which throws 1062 once the table holds ≥ 2 deactivated rows for any single result. The migration transaction rolls back cleanly, but you cannot actually undo this one without first manually pruning deactivated alignment rows (`DELETE FROM result_pool_funding_alignment WHERE is_active = 0` if history isn't needed). **Don't include this in any blind `migration:revert` loop in production.**
- `1779190000013` (T-15.3 rename) — DOWN inverts the rename; preserves rows.
- `1779190000012` (T-15.4 icon_key) — DOWN drops the column; data loss is the seed `icon_key = official_code`, which is regenerable.
- `1779190000011` (T-15.13 mapping table) — DOWN drops the table; **data loss = all mapping rows operators created**. Before reverting in production, export the table.
- `1779190000010` (catalog seed) — DOWN drops the table; **data loss = the 13 SP rows**, regenerable from the migration.

⚠️ **Always export `bilateral_project_mapping` before reverting** if there are operator-created rows. The catalog tables are regenerable; the mapping table is not. ⚠️ **Do not attempt to revert `1779190000014` on a populated environment** — prune `result_pool_funding_alignment` first.

```bash
# Safety export (run from the deploy box, against the env DB):
mysqldump -h $ARI_MYSQL_HOST -u $ARI_MYSQL_USER -p$ARI_MYSQL_PASSWORD \
  $ARI_MYSQL_DATABASE bilateral_project_mapping > /tmp/bpm-$(date +%Y%m%d-%H%M%S).sql
```

---

## 4. Environment-by-environment rollout

### 4.1 Dev — **DONE (2026-05-26)**

- [x] Migration 1 (catalog seed) — applied earlier, 2026-05-23, commit `5d48b27b`.
- [x] Migration 2 (mapping table) — applied 2026-05-25 (T-15.13).
- [x] Migration 3 (icon_key) — applied 2026-05-26 (T-15.4); revert + re-apply round-trip clean.
- [x] Migration 4 (lever_code → sp_code) — applied 2026-05-26 (T-15.3); revert + re-apply round-trip clean.
- [x] Migration 5 (alignment partial-unique fix) — applied 2026-05-26 (T-15.17); forward verified by reproducing the prior 500 (now 200); DOWN intentionally not re-tested on populated dev (would fail by design — see §3).
- [x] Smoke A (catalog endpoint) — 200, 13 rows, all `icon_key` populated.
- [x] Smoke B (DI sanity) — `/api/v2/results` 200.
- [x] Smoke C (mapping endpoint) — 200, `meta.total` populated.
- [x] Smoke D (per-result picker) — verified end-to-end on result `19792` (CSICAP → D527 → CLARISA project 1 → SP09 + SP10).

Sign-off:
```
[x] ARI backend — verified during T-15.10..15.15 development
[ ] DevOps — N/A (dev is developer-managed)
```

### 4.2 Staging — **TODO**

- [ ] Step 2.1 (pre-flight): `npm ci && npm run build`.
- [ ] Step 2.2: `migration:show` → confirm which migrations are pending.
- [ ] Step 2.2: `migration:execute` → apply pending in order; capture stdout into the deploy ticket.
- [ ] Step 2.3 smoke A: catalog endpoint returns 200 + 13 rows + all `icon_key`.
- [ ] Step 2.3 smoke B: `/api/v2/results` returns 200.
- [ ] Step 2.3 smoke C: `/api/bilateral-project-mappings` returns 200.
- [ ] Step 2.3 smoke D: per-result picker returns 200 on a known bilateral-eligible result (pick one from the STAR FE team's test fixtures).
- [ ] Operator validation: a STAR team member tags one bilateral result via the admin SSR page (`/api/admin/bilateral-project-mappings`) and confirms the SP picker on STAR shows only that project's SPs.
- [ ] Sign-off:

```
[ ] ARI backend — <name>
[ ] DevOps — <name>
[ ] STAR FE lead — <name> (smoke D + operator validation)
```

### 4.3 Production — **TODO** (requires staging sign-off + off-peak window)

- [ ] Confirmed off-peak window: ____ / ____ between ____ and ____ (timezone).
- [ ] Step 2.1 (pre-flight): `npm ci && npm run build`.
- [ ] Step 2.2: `migration:show` → confirm pending list matches staging's.
- [ ] Safety export run: `mysqldump bilateral_project_mapping > /tmp/bpm-prod-<ts>.sql`.
- [ ] Step 2.2: `migration:execute`.
- [ ] Step 2.3 smoke A: 200 + 13 rows + `icon_key`.
- [ ] Step 2.3 smoke B: `/api/v2/results` 200.
- [ ] Step 2.3 smoke C: `/api/bilateral-project-mappings` 200.
- [ ] Step 2.3 smoke D: per-result picker 200 on a known prod bilateral result.
- [ ] First operator-tagged mapping in prod created end-to-end (R-BIL-080 DoD).
- [ ] Release note published.
- [ ] Sign-off:

```
[ ] ARI backend — <name>
[ ] DevOps — <name>
[ ] STAR FE lead — <name>
[ ] PO / MEL lead — <name>
```

---

## 5. Known interactions / risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Old dist/ on a parallel server still queries `lever_code` after migration 4 lands | medium (depends on deploy choreography) | Either (a) deploy the new dist/ to **all** instances **before** running migration 4, or (b) accept brief 500s on the old instances during the window. The API contract is preserved via SQL alias, so once the new dist/ is up the response shape is identical. |
| Operator creates a mapping during the rollout window | low | Migration 2 only **adds** the table; no risk to existing data. The operator UI is admin-only and the window is off-peak. |
| `mysqldump` blocked on prod (RDS perms) | medium | If `mysqldump` isn't available, use `SELECT * FROM bilateral_project_mapping INTO OUTFILE` or AWS RDS snapshot of the schema. Confirm with DevOps before the window. |
| CLARISA `/api/projects` unreachable during smoke D | low | The endpoint serves a 5-min in-memory cache + ServiceUnavailableException on cold cache (NFR-BIL-073). A `503` on smoke D is **not** a rollback trigger — it's an upstream issue. Document the smoke result and proceed. |
| Pre-existing alignment-table partial-unique bug (`uq_..._result_active`) | known | NOT introduced by Phase 1.5 — surfaced during T-15.1 / T-15.3 smoke. Not in T-15.7 scope; tracked as a separate follow-up (see [`./execution.md`](./execution.md) T-15.1 entry). |

---

## 6. Cross-references

- Spec: [`./tasks.md`](./tasks.md) T-15.7 + parent [`../tasks.md`](../tasks.md) §15 re-price log
- Execution: [`./execution.md`](./execution.md) entries for T-15.3 / T-15.4 / T-15.13 (the migration round-trip evidence)
- FE handoff (post-rollout): [`../frontend-handoff.md`](../frontend-handoff.md) §12 changelog 2026-05-26 entry

Once §4.3 production sign-off is checked, mark T-15.7 done in both [`./tasks.md`](./tasks.md) and [`../tasks.md`](../tasks.md) §14 and append a final execution.md entry with the production commit hash + window.
