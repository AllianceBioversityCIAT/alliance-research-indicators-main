# Scratch-schema snapshot

- **Spec:** [`docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id`](../../../../../docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id/) — task **T-01b**
- **Source environment:** the shared dev database (`ARI_MYSQL_*`), database `alliancereportingdb`
- **Date taken:** 2026-08-14
- **Model:** **snapshot, not replay.** See *Why replay was abandoned* below — this is a pivot from this artifact's first version, not the original design.

## What's here

`baseline.sql` — a single schema-only `mysqldump`:

| Content | Count | Flags |
| --- | --- | --- |
| Base tables | **196** | `--no-data` |
| Views | **17** | `--no-data` (views carry no data of their own) |
| Stored routines (procedures + functions) | **23** | `--routines` — includes `SP_versioning`, present **and broken** (see below) |
| `migrations` table rows | **348** | the one deliberate data exception — bookkeeping, not business data (see *The one data exception*) |

No triggers (`--skip-triggers` — migrations own those). Zero business-data `INSERT` statements anywhere else in the file.

## Why replay was abandoned (RB-1d / OQ-3)

The first version of this artifact was a **replay** harness: dump the ~64 tables migrations never create, then apply the full 303-migration suite on top from empty. Execution disproved the premise. Two independent, unrelated defects surfaced in the first 139 of 303 migrations:

1. `1751474908040-InsertTemplates.ts` — `sec_template` doesn't exist (MySQL 1146). Fixed by the schema piece of the replay dump.
2. `1759786024597-createStaffGroups.ts` — hardcodes five specific `carnet` values with an FK to `alliance_user_staff`, a table populated by a runtime staff-sync process and **never** by any migration (MySQL 1452, `ER_NO_REFERENCED_ROW_2`). No schema-only dump can fix this without inventing employee data, which is explicitly forbidden.

**164 migrations remained unexercised.** The migration history assumes a pre-existing environment in both schema *and* data — it cannot be replayed from empty, full stop. This is now a repo-level finding (`requirements.md` RB-1d, OQ-3), out of scope for this bugfix to fix. Attempting to patch `CreateStaffGroups1759786024597` or any other unreplayable migration is explicitly **not** this task's job.

**The snapshot model sidesteps the problem instead of solving it — and that turns out to be strictly better evidence for this spec.** A snapshot of dev's actual database reproduces a state dev really has been in (unlike a synthetic replay-from-empty, which dev has never actually passed through). And it delivers exactly what this bugfix's regression fixture (T-02) needs: `SP_versioning`, present and broken, so `CALL SP_versioning(<code>)` on the scratch schema is a **genuine** MySQL 1054 red on the real procedure — not a hypothetical one.

## Derivation

Two numbers matter for this artifact, both re-confirmed live on 2026-08-14 via read-only queries against `ARI_MYSQL_*`:

- **213** live objects in `alliancereportingdb` (`information_schema.TABLES`): **196 `BASE TABLE`** + **17 `VIEW`**. All 213 are in the snapshot — this model takes everything, not a derived subset.
- **348** rows in the live `migrations` bookkeeping table. Diffed against all 303 current migration-file names (matched via each file's explicit `name = '...'` field, falling back to the exported class name when a file has no explicit field): **0 of the 303 current files are missing from the live table.** The other 45 rows are historical/orphaned entries with no corresponding file in the current tree (migrations run once, since renamed, squashed, or removed) — harmless, since TypeORM's pending-check only looks for *files* absent from the table, never complains about *extra* rows.

### Lesson carried over from the replay-model attempt (still true, still worth keeping)

A grep-based "which legacy tables does migration source *talk about*" derivation is not a substitute for enumerating the live schema directly. Tried during the replay attempt: grepping the 303 migration files for table names referenced in `FROM`/`JOIN`/`INTO`/`UPDATE` found only 3 of the 64 tables migrations never create (`sec_template`, `sec_roles`, `sec_users`) — a 95% miss rate. The other 61 (13 more `sec_*`, all 33 `TIP_*`, all 8 `AICCRA_*`, 7 more with zero migration references at all) are queried exclusively through application code, never through a raw SQL string inside any migration — a source grep has no way to see them. **The rule generalizes:** for "what does the live database have that the migration history doesn't account for," there is no substitute for querying the live database. This snapshot model sidesteps the question by taking everything, but the lesson stays relevant for any future derived-subset artifact.

**Tooling note, also worth keeping:** comparing two sorted name lists with `comm` silently produces wrong results if the two files were sorted under different locale collations. `sort` without `LC_ALL=C` reordered punctuation/case differently between two files that "looked" sorted, and `comm` — which trusts its inputs are sorted in its own collation — treated correctly-shared lines as unique to one side. Always `LC_ALL=C sort` (or `sort -u`, consistently) on both sides before diffing identifier lists this way.

## The one data exception: `migrations` table rows

The snapshot's `--no-data` pass covers all 196 base tables and 17 views. Immediately after, a **second**, separate `mysqldump` pass (`--no-create-info`, still `--skip-triggers`) dumps **only** the `migrations` table's rows, appended to the same file. This is deliberate and is the **only** data of any kind in `baseline.sql`.

**Why this is not a "no data" violation.** `migrations` is TypeORM's own bookkeeping table — it records which migration *names* have run, nothing about the application domain. Loading its rows is what makes `migration:test:execute` see all 303 current migrations as already applied and report zero pending, instead of trying (and failing) to replay history from empty. It is infrastructure state, not business data, and it is the entire point of the snapshot model (design.md §4.1, DD-5 revised).

## Post-processing applied to the raw `mysqldump` output (mechanical, not a fidelity change)

Two fixes were needed to make the dump loadable on a plain disposable container — neither touches schema, routine logic, or data:

1. **`log_bin_trust_function_creators`** — `mysqldump --routines` output was rejected on load with MySQL error 1418 (`This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA... binary logging is enabled`). `docker-compose.test.yml`'s `mysql:8.0` image ships with `log_bin` ON by default. Fixed by adding `--log-bin-trust-function-creators=1` to that compose file's `command:` — a setting on **our own disposable scratch container only**, never appropriate on anything pointed at `ARI_MYSQL_*`.
2. **`DEFINER` clauses stripped** — the raw dump's views/routines carried `DEFINER=\`AllianceRepUser\`@\`%\`` (40 occurrences, one literal string, mechanically substituted to nothing). That user doesn't exist on the scratch container, which only has `root`, and loading failed with MySQL error 1449 (`the definer... does not exist`). Removing `DEFINER=...` lets MySQL default to `CURRENT_USER` at creation time — this affects only the SQL-security execution context of views/routines (who they run *as*), never their logic, columns, or the procedure body text itself. `roles_id` inside `SP_versioning` is untouched (verified below).

## Verification (2026-08-14, this session — fresh scratch container each time)

**Zero business-data `INSERT`s** — `grep -c "^INSERT" baseline.sql` → **`1`** total, and that one statement's target table:
```
grep "^INSERT" baseline.sql | sed -E 's/INSERT INTO `([^`]+)`.*/\1/' | sort | uniq -c
   1 migrations
```

**Zero pending migrations after load** — fresh empty container → `npm run baseline:test:load` → `Baseline loaded.` → `npm run migration:test:execute`:
```
No migrations are pending
```

**`SP_versioning` present and broken** — `SHOW CREATE PROCEDURE SP_versioning` against the loaded scratch schema contains `roles_id` (both broken blocks, `result_impact_outcomes` and `result_strategic_objectives`):
```
122:                                    roles_id,
149:                                    roles_id,
```
This is the handoff T-02 depends on: without it, T-02 has no real MySQL 1054 to observe as its red.

**Falsifying input, reconfirmed** — fresh empty container, snapshot load **skipped**, `npm run migration:test:execute` → fails immediately (same defect as always, now reached fast rather than after 138 migrations): `Table 'ari_scratch_test.sec_template' doesn't exist`, errno 1146, at `InsertTemplates1751474908040`.

**Loaded-object sanity** — `SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='ari_scratch_test'` → `213` (matches 196 + 17). `SELECT COUNT(*) FROM migrations` → `348` (matches the live source).

## Load order

```
npm run compose:test:up          # bring up the disposable scratch container
npm run migration:test:bootstrap # = baseline:test:load THEN migration:test:execute, in that order
npm run compose:test:down        # tear the container down (schema is disposable)
```

`migration:test:bootstrap` (in `package.json`) chains load → execute so the two cannot run out of order. The load step is `scripts/load-baseline.js` (Node, not bash — several `.env` values contain unquoted shell metacharacters that break a naive `source .env`; it uses the `dotenv` package instead, already a dependency).

**Safety, enforced in code:** the script reads the *resolved* `ARI_TEST_MYSQL_HOST` and refuses to run if it equals `ARI_MYSQL_HOST` — the shared, non-disposable database (root `CLAUDE.md` §4.3; `requirements.md` RB-1c records the exact prior incident this guards against). Unchanged from the replay-model version of this artifact.

## How the snapshot was produced (for the record — do not repeat without re-deriving)

Read-only against `ARI_MYSQL_*` only: `information_schema.TABLES` (table/view split, row-count sanity), and two `docker run --rm mysql:8.0 mysqldump` passes — `--no-data --skip-triggers --routines` over the whole database (no table list — everything), then `--no-create-info --skip-triggers` scoped to just `migrations`. No `INSERT`/`UPDATE`/`DELETE`/DDL statement was ever issued against the shared database. If this snapshot is ever regenerated, re-derive the counts above — do not assume 196/17/23/348 are still correct; the shared DB is live and will have moved on.
