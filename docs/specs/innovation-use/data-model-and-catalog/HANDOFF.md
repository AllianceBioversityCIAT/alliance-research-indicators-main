# Handoff — Innovation Use chunk 1, SQL-lifecycle layer

> # ✅ DISCHARGED — 2026-08-14 fresh pass complete
>
> The fresh pass this handoff called for has run. **All twelve round-3 findings (T1–T12) are applied**, and the artifacts below are now current:
>
> | Artifact | State |
> | --- | --- |
> | [`routine-transcript.md`](./routine-transcript.md) | **Revision 2** — four routines, enumerated by call site; all bodies transcribed by reading; §0 records the method |
> | [`requirements.md`](./requirements.md) | R-IU-011 re-specified (9 ACs, 3 scenarios); **R-IU-012 added**; DC-13, RB-11, D-11 added; T5/T6 wording swept |
> | [`design.md`](./design.md) | §6.7 rewritten; **M0** added to §5; fixtures **F9b, F18, F19**; §6.5.1 gains pieces 2 and 5; DD-9 revised, **DD-13** added; ADR-11 checklist corrected; §12 re-budgeted |
> | [`tasks.md`](./tasks.md) | **Created** — 13 tasks, clause-level coverage matrix, 5-PR strategy |
> | [`../../bugfix/sp-versioning-roles-id/`](../../bugfix/sp-versioning-roles-id/) | **New spec** — the `SP_versioning` repair, extracted on the user ruling of 2026-08-14; chunk 1 now `Depends on` it |
>
> **One new finding, escalated and now resolved:** `SP_versioning` is **non-executable in `main` today** for all six indicators — two blocks reference `roles_id`, dropped by `1783022620616`. Discovered by the transcription; see transcript §2.4 and DD-13. **Routed 2026-08-14** to its own bugfix spec (`design.md` §12).
>
> **Retained as the record of the method**, not as a live instruction. Sections 1–5 below describe the state *before* the fresh pass.

---

> **Original note (2026-08-14).** Written at the close of a session whose Judgment Day lineage was exhausted (2 fix rounds, 2 re-judgments, terminal state `ESCALATED`). It exists so a fresh session starts with the correct method instead of rediscovering it.

---

## 1. What is approved and what is not

| Layer | Status | Notes |
| --- | --- | --- |
| Schema — `result_innovation_use`, catalog table, 6 additive columns | **Sound** | Verified correct across three review rounds |
| Catalog content + `id = level + 1` | **Sound** | Ten canonical rows fixed in `requirements.md` R-IU-002; the off-by-one trap (DC-10) is well covered |
| Role discriminators (R-IU-005) | **Sound** | |
| `innovation_use_validation` logic (R-IU-006) | **Sound**, two gaps | AC.10's disaggregated half has no fixture; DD-11 overstates its precedent (T9) |
| Green-check wiring + submit gating (R-IU-007) | **Sound** | Including the IP-Rights consequence (RB-10) |
| Decisions D-1…D-9, DD-1…DD-12, ADR-11 | **Sound** | Except D-9 / ADR-11's routine checklist, which is wrong — see below |
| **R-IU-011 + M6 + `routine-transcript.md`** | **⛔ NOT APPROVED** | **This is the whole job of the fresh pass** |
| §6.5.1 scratch-schema mechanism | **Partial** | Diagnosis correct; remedy incomplete (T8 port, T10 trap module) and the dangerous wording survives in `design.md` §10 and `requirements.md` DC-1/RB-9 (T6) |

---

## 2. Scope of the fresh pass

**In:** `requirements.md` R-IU-011 · `design.md` §6.7 + M6 + fixtures F13–F17 + §12 budget · `routine-transcript.md` (rewrite) · `family.md` D-9/D-10 · ADR-11's standing checklist · the §6.5.1 remainder (T8, T10) and the T6 sweep.

**Out:** everything in the "Sound" rows above. Do not re-litigate the schema, catalog, or validation design — three rounds verified them.

---

## 3. The method — this is the point of the handoff

Every wrong claim in three rounds came from enumerating routines **by name already suspected**. Round 1 said "no side effects"; round 2 said two routines; round 3 said three. **There are four.**

### Step 1 — enumerate by call site, not by name

```
grep -rnoE "(CALL [A-Za-z_]+|SELECT [a-z_]+\(\?)" --include="*.ts" src \
  | grep -v spec | grep -v migrations
```

Verified complete set as of 2026-08-14:

| Routine | Kind | Call pattern | Sites |
| --- | --- | --- | --- |
| `SP_versioning` | PROCEDURE | `CALL` | `green-checks.repository.ts:307`, `result-status-workflow.repository.ts:172` |
| `SP_delete_result_version` | PROCEDURE | `CALL` | `green-checks.repository.ts:294`, `result-status-workflow.repository.ts:152` |
| `full_delete_result_version` | FUNCTION | `SELECT` | `query.service.ts:90` |
| **`delete_result`** | FUNCTION | `SELECT` | `query.service.ts:78`, `result.repository.ts:516`, `tip-integration.repository.ts:27` |

Cross-check against the database when reachable: `SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE();`

### Step 2 — find each routine's *latest* definition

Several are redefined across migrations. `SP_delete_result_version` lives in `1778510205765`, **not** in `1783029013035` (which contains zero occurrences of that name, despite being the newest lifecycle migration).

### Step 3 — transcribe by reading, never by grep

A grep-derived list may not be labelled a transcription. That mistake is what made the previous transcript defective: it captured only the `INSERT INTO <table>` blocks that fit on one source line, silently dropping ~9 formatted across several — including `result_quantifications`, which **is** already copied and would have been duplicated.

### Step 4 — name the semantics correctly

`SP_delete_result_version` was mislabeled "soft delete" in the previous pass. It issues `DELETE FROM` on 25 tables — it is a hard removal of a snapshot version. **`delete_result` is the soft delete** (`UPDATE … SET is_active = FALSE`). That mislabel filled the soft-delete slot with the wrong routine and is the likely reason the real one stayed invisible for three rounds.

---

## 4. Known traps, already paid for

| # | Trap |
| --- | --- |
| 1 | `orm.config.ts:71-73` exports **one** `DataSource` bound to `CORE`. TypeORM's `-d` cannot reach `TEST` from it. A **new sibling config module** is required — an npm script alone does nothing |
| 2 | `orm-connection-test.module.ts` exists and, despite the name, binds to **`CORE`** (`:10`). Not the missing piece |
| 3 | `orm.config.ts:46` uses `DB_PORT` for **both** targets — there is no `ARI_TEST_MYSQL_PORT` |
| 4 | There is **no** `npm run migration:run`. The scripts are `migration:execute`, `migration:dev:execute`, `migration:revert` |
| 5 | `down()` is **not** a consistent precedent: `1778510205765`'s `down()` is a bare `DROP` with no recreation |
| 6 | The two delete routines diverge: `full_delete_result_version` deletes `result_impact_outcomes` and `result_strategic_objectives`; `SP_delete_result_version` does not, and they differ on null handling (`SIGNAL` vs `RETURN FALSE`). **Pre-existing — do not harmonize** |
| 7 | Fixtures live outside Jest's `rootDir: "src"` / `testRegex` — a dedicated config is needed |
| 8 | `result_actors.actor_type_id` is `NOT NULL`, so the `ELSE actor_type_id IS NOT NULL` branch copied from `innovation_dev_validation` is unreachable dead code |

---

## 5. Open findings to close (from `judgment.md` round 3)

T1 fourth routine · T2 transcript rewrite · T3 F16 bound to AC.4 should be AC.5 · T4 AC.10 disaggregated fixture · T5 `requirements.md` §8/RB-8/D-9 still say two routines · T6 TEST-target wording in `design.md` §10 and `requirements.md` DC-1/RB-9 · T7 soft-delete mislabel · T8 port · T9 DD-11 precedent · T10 trap module · T11 `down()` precedent · T12 ungated ACs (R-IU-011 AC.7, R-IU-001 AC.3, R-IU-005 AC.2).

Budget will need re-derivation: `delete_result` adds ~199 lines up, ~398 doubled.

---

## 6. Suggested entry point

```
/akili-specify docs/specs/innovation-use/data-model-and-catalog
```

…scoped to §2 above, in **Bug Mode discipline** — evidence before fix. Or `/akili-quick` if the fresh pass confirms the change is mechanical once the routine set is correct.

**Do not run `/akili-execute` on this chunk until R-IU-011 and M6 are re-specified.** Every other layer is ready.

---

## 7. Kaizen candidates

- **Enumerate by call site, not by suspected name**, before any "complete set" claim about routines, handlers, or subscribers.
- **An artifact created to prevent a failure mode can reproduce it.** `routine-transcript.md` was written to replace description with transcription, then built by grep. Verify the anti-error artifact against the error it targets.
- **A finding is not closed by adding a criterion without adding its gate** (T4: AC.10 added, fixture not).
- **Blind dual review earned its cost here:** the entire lifecycle data-loss class — four routines, five silent-orphan surfaces — was invisible to the author across three drafts and found only by independent judges.
