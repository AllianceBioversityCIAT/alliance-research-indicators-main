# Execution Log — CLARISA projects phase as an admin-editable variable

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/clarisa-phase-config-variable` |
| Started | 2026-08-18 |
| Leader | Claude Opus 5 (T1) |
| Implementer | `akili-implementer` wrapper (sonnet, T2) |
| Reviewer | `akili-reviewer` wrapper (opus, T3) — not yet spawned |
| Budget (`design.md` §11) | **3 tasks · ~380 LOC · ~5 review rounds** (revised by the T-01 pivot; was 4 · ~450 · ~6) |
| Approval Mode | `gated` |

---

## Task Execution History

### T-01 — Seed the `app_config` row and prove Tier 2 governs the picker

- **Status:** `[~]` — **PIVOT**, stopped before any write
- **Date:** 2026-08-18
- **Implementer attempts:** 1 (stopped at its own pre-flight stop rule; no code authored)
- **Reviewer:** not spawned — there is no diff to audit

**Pre-flight decision by the Leader.** T-01's verification requires executing a migration. The wired target (`migration:dev:execute` → `orm.config.ts:72` → `dataSourceTarget.CORE` → `ARI_MYSQL_*`) is the **shared on-premise Dev database**; no scratch schema is wired and `docker-compose.yml` defines no DB service. Root `CLAUDE.md` §4.3 makes that a human decision. Escalated to the user, who authorized running against shared Dev. Recorded before delegating.

**Implementer outcome.** The brief mandated a read-only blast-radius check before any write. It ran:

```
npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts
...
[X] 368 ScopePoolFundingValidationToPrimarySp1786679227000
[ ] SeedClarisaMappingPhase1786738949211
```

One migration pending, and **not the one T-01 would create**. The Implementer honoured its stop rule, wrote no file, ran no write command, and reported. Correct behaviour — recorded as such.

---

## Pivot Record: T-01

### Blocker

**The spec's central premise is false.** `requirements.md` §1 and the proposal both assert that the `app_config` row for `ARI_CLARISA_PROJECTS_PHASE` "has never existed" and that the spec's job is to create it. A migration that creates it **already exists on this branch**:

`server/researchindicators/src/db/migrations/1786738949211-seedClarisaMappingPhase.ts`
committed as `8431dc4b` — *"[SPEC:bugfix/bilateral-alliance-selector] feat(app-config): seed the mapping-phase row so the phase is admin-editable"*.

That commit message is, almost word for word, this spec's stated intent.

### What the existing migration already does

| Aspect | Existing migration | What T-01 specified |
| --- | --- | --- |
| Key | `ARI_CLARISA_PROJECTS_PHASE` | same |
| `simple_value` | `'2026'` | same (`DD-1`) |
| Idempotency | `ON DUPLICATE KEY UPDATE` | not specified |
| `down()` | Parameterized **and** backticks `` `key` `` | same requirement (`DD-6`) |
| `category` / `subcategory` | `API` / `CLARISA` | `CLARISA` / `PROJECTS` |

It is **better than the exemplar this spec told the Implementer to imitate**: `1781879906673-AddNewEnvCl.ts` leaves the reserved word `key` unescaped in `down()`, and the existing seed migration already fixes that. `DD-6` was written to avoid inheriting a defect that had already been avoided.

The only real divergence is `category`/`subcategory`, which is cosmetic — the resolver reads by `key` and never consults either field.

### Why the picker is still empty in dev — corrected causal chain

The migration is committed **and present in `origin/dev`**, yet `migration:show` against the Dev database reports it **pending**. So the row does not exist in Dev not because nobody wrote the migration, but because **that migration has never been applied to the Dev database**.

The symptom diagnosis in `requirements.md` §1 stands unchanged and is still evidence-backed (CLARISA test serves 299 projects, all `phase=2025`; the resolver falls through to `2026`; the funnel ends at 0). What was wrong is the *remedy*: this is an unapplied-migration problem, not a missing-migration problem.

### Root cause of the specification error — Leader's own

During `/akili-propose` the Leader searched for prior art with:

```
grep -rln "app_config" src/db/migrations/ 2>/dev/null | tail -6
```

There are **nine** such migrations. `tail -6` returned six, in `grep -l`'s arbitrary order, and the excluded three included `1786738949211-seedClarisaMappingPhase.ts` — the one file that would have prevented this entire spec from being written as it was.

The cap was silent: the output looked like a complete answer. This is the failure mode the methodology's *no silent caps* rule exists for, and it is a fresh instance of **K-003** (a search that misses its own target). Every downstream artifact — proposal §3, `requirements.md` §1 and §5, `DD-1`, T-01 — inherited the false premise without a single one of them being able to detect it.

### Alternatives

| # | Option | Effect on the spec |
| --- | --- | --- |
| **A** | **Drop T-01.** Apply the existing pending migration (an ops action, no code). Accept `API`/`CLARISA` as the row's grouping. Amend `requirements.md` §5, §1 and `DD-1` to describe applying rather than creating | Spec drops to 3 tasks. `R-CPC-001` / `R-CPC-002` are satisfied by work already merged |
| **B** | **T-01 becomes an UPDATE migration** correcting `category`/`subcategory` to `CLARISA`/`PROJECTS` | Keeps 4 tasks; spends a migration on a cosmetic relabel the resolver never reads |
| **C** | **Keep T-01 as an INSERT** | **Unviable.** `key` is the entity's `@PrimaryColumn`; a second INSERT for the same key collides once the pending migration lands |

### Recommended direction

**Option A.** The capability this spec exists to deliver — a visible, admin-editable phase row — is already implemented and merged; it is simply undeployed. Spending a migration on a cosmetic relabel (B) adds schema churn to a shared database for a field no code reads. The genuinely new work in this spec is `T-02` (phases endpoint), `T-03` (year selector) and `T-04` (`.env.example`), and none of it is affected by this pivot.

### Status

**Option A approved by the user, 2026-08-18. Pivot applied.**

- `requirements.md` — §1 carries a correction banner; `R-CPC-001` / `R-CPC-002` marked as delivered by merged work; §5 values corrected to what `8431dc4b` ships (`API` / `CLARISA`); D-1/D-2/D-3 struck from the defect-class table; R-3 marked moot; NFR-CPC-004 scoped out.
- `design.md` — §1 two parts not three; §3 migration row struck; §4 reframed; §6.3 retired; `DD-1` superseded-in-mechanism; `DD-6` moot-but-recorded; budget 4→3 tasks / ~450→~380 LOC / 6→5 rounds; X-1 and X-2 retired, **X-6 added** (the merged migration is pending on Dev).
- `tasks.md` — T-01 struck with its resolution; dependency graph, T-03's `Depends on`, coverage-closure rows and budget updated. **The task ID is kept, not renumbered**, so existing references resolve.
- `proposal.md` — **body left unedited** as the point-in-time record of what was approved; a superseded-in-part banner was prepended.

**Correction closure — two-direction sweep run and re-verified.** Forward: grepped the superseded values across the spec folder, which caught five survivors the pivot analysis had not cited (`design.md` "Three moving parts", the architecture-diagram annotation, §6.3's exemplar sentence, the Phase-3 budget note, and `requirements.md`'s OQ resolution line). Backward: grepped every reference to `DD-6`, §6.3, `R-CPC-001` and `R-CPC-002` and re-read each referrer. Re-run confirms zero survivors.

No code was written and no database was touched beyond a read-only `migration:show`.

### Ops action owed (outside this spec)

Apply `SeedClarisaMappingPhase1786738949211` to the Dev database. Until then the variable will not appear on the Configuration Variables screen and `T-03`'s human visual check cannot complete end to end (`design.md` X-6).

---
