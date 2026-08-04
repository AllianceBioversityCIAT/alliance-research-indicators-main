# Runbook — cross-platform duplicate resolution

- **Spec:** [`results/cross-platform-duplicate-resolution`](./tasks.md)
- **Audience:** ARI administrators and the AICCRA loader's owner
- **Last verified on dev:** 2026-08-04

---

## 0. Read this first — the asymmetry that decides everything

**Deletion is irreversible from ARI.** Recovery is a re-sync from the source platform.

| Platform | Recovery if a row is deleted in error |
| --- | --- |
| TIP | automatic sync re-creates it |
| PRMS | automatic sync re-creates it |
| **AICCRA** | **no automatic sync.** A person must re-run the MySQL loader script |

And on the live data, **AICCRA is the platform that loses most often.** Measured from the dev dry run of 2026-08-04 — 116 groups, 105 planned deletions:

| Loser | Deciding rule | Count | Share |
| --- | --- | --- | --- |
| **AICCRA** | `RULE_1_TIP` — TIP prevails | **76** | **72 %** |
| TIP | `RULE_3_AICCRA_CS_OVER_KP` | 29 | 28 % |

**Roughly three of every four deletions fall on the one platform that cannot be re-synced automatically.** That is the single most important thing to understand before running `apply`. Treat every AICCRA deletion as permanent.

(The 29 TIP losers are recoverable by re-sync, so the risk is not symmetric even where the counts look comparable.)

---

## 1. Current posture

Everything is deployed and **nothing deletes**. The hard-delete flag is seeded `false`.

| Config key | Value | Meaning |
| --- | --- | --- |
| `duplicate_resolution.hard_delete_enabled` | `false` | The **sync path** detects, guards and audits duplicates but deletes nothing. It never falls back to a soft delete — the soft delete is the defect this spec fixes. |
| `duplicate_resolution.protect_inactive_star_links` | `true` | An inactive `link_results` row from a STAR result still protects its counterpart. Conservative default pending **OQ-7**. |
| `duplicate_resolution.plan_ttl_minutes` | `30` | How long a reviewed plan stays valid for apply. |
| `duplicate_resolution.sweep_lock` | *empty* | Free. Set to `holderId\|expiryEpochMs` while a sweep runs. |

All four keys are **`SYSTEM_ADMIN`-only to write**, enforced by `ProtectedConfigKeysGuard`. `PATCH /api/configuration/:key` is otherwise open to `TECHNICAL_SUPPORT`, and without that guard a role which cannot call either sweep endpoint could have armed irreversible deletion on the sync path.

---

## 2. The two endpoints

Both are `SYSTEM_ADMIN`-only, and both reject machine tokens — a partner integration must never be able to trigger deletions.

```
GET  /api/v1/results/duplicate-resolution/plan    ← writes nothing to results
POST /api/v1/results/duplicate-resolution/apply   ← irreversible
```

`apply` is gated three ways, each covering a different failure:

| Gate | Catches |
| --- | --- |
| Role + auth type | an unauthorized or non-human caller |
| Confirmation digest | a plan nobody reviewed, or one whose data has moved |
| TTL (30 min) | a plan reviewed too long ago to still describe the data |

---

## 3. Procedure — reviewing and applying

### 3.1 Take a plan

```
GET /api/v1/results/duplicate-resolution/plan
```

Optional filters: `reportYear`, `platform`, `indicator`, `limit`.

Expect it to take a couple of minutes — the dev run over 14,682 rows took **~154 s**. There is no latency gate; the scan is deliberately un-indexed because normalization cannot be index-satisfied on a `TEXT` column.

Keep the `runId` and `confirmationDigest` from the response.

### 3.2 Review it — this is the gate, not a formality

The plan is the **only** control over one defect class that cannot be automated: a normalization false positive, where two genuinely different publications collapse into one group and one is deleted. No test can rule that out over real-world URLs.

Read, at minimum:

- [ ] **`status`** — `INCONCLUSIVE` means the scan matched nothing. That is **not** proof there are no duplicates; check the filter before concluding the data is clean.
- [ ] **`rowsToDelete` against `groupCount`** — on dev these were 105 and 116. A number far from your expectation is a reason to stop.
- [ ] **`byClassification`** — `CROSS_YEAR_REVIEW` groups are reported and never auto-deleted (11 on dev). `UNRESOLVED_CONFLICT` groups are where the approved rules contradict each other and nothing is deleted (see OQ-9).
- [ ] **A sample of `groups[].toDelete`** — spot-check that the `groupKey` really is the same publication in each participant. This is where a normalization false positive would show.
- [ ] **How many losers are AICCRA rows** — see §0. Each one is permanent.

### 3.3 Apply

Within the TTL:

```
POST /api/v1/results/duplicate-resolution/apply
{ "runId": "<from the plan>", "confirmationDigest": "<from the plan>" }
```

Refusals and what they mean:

| Response | Meaning | Action |
| --- | --- | --- |
| `400` no plan found | wrong `runId`, or the plan was never taken | take a plan first |
| `409` expired | reviewed more than `plan_ttl_minutes` ago | take a fresh plan and review it again |
| `409` data changed | the digest no longer matches — rows moved since you looked | take a fresh plan and review it again |
| `409` already running | another sweep holds the lock | wait; the lock expires after 15 minutes |

**A `409` is the system working.** Nothing was deleted.

### 3.4 Verify afterwards

The audit table is the durable answer to "what did that run delete, and why" — not the logs, which rotate.

```sql
SELECT classification, deleted_count, protected_count, failed_count, noop_count,
       winner_result_id, deciding_rule, reason
  FROM result_duplicate_resolution_log
 WHERE run_id = '<applyRunId>';
```

- `NOOP` means the row was already gone — never conflated with a deletion.
- `PROTECTED` means something that must survive references it; the reason names what.
- `FAILED` means the delete was attempted and failed; the reason carries the error.

---

## 4. After every AICCRA load — required

AICCRA reaches `results` through a MySQL script, not a sync pipeline, so **no code evaluates the duplicate rules when AICCRA data arrives.** That is the gap this feature exists to close, and the sweep is the only thing that closes it.

**The loader's owner must run the plan endpoint after each load**, review it, and apply it. If that step is skipped, duplicates accumulate exactly as before and the feature is inert.

---

## 5. Enabling deletion on the sync path

Separate decision from the sweep, and a bigger one: the sync path has **no dry run, no digest and no TTL**. It resolves and deletes inline as PRMS and TIP data arrives.

Only enable it once the sweep has been applied at least once and its audit trail reviewed:

```
PATCH /api/configuration/duplicate_resolution.hard_delete_enabled   { "simple_value": "true" }
```

`SYSTEM_ADMIN` only. To disable, set it back to `false` — the off state is "detect and audit, do not delete", which is safe to sit in indefinitely.

---

## 6. Backout

| What | How |
| --- | --- |
| Stop all deletion immediately | set `hard_delete_enabled` to `false`. The sweep still requires an explicit `apply`, so this alone halts the sync path |
| Roll back the code | ordinary deploy rollback. The schema is additive and safe to leave |
| Roll back the schema | `npm run migration:revert` ×4. Verified as a round trip on dev 2026-08-04: the delete function returned to its exact pre-migration body (7,295 bytes) and the audit table, counter column and config rows disappeared and returned |
| **Recover deleted rows** | **not possible from ARI.** Re-sync from TIP/PRMS; for AICCRA, re-run the loader script. The audit table retains each deleted row's identity — official code, platform, indicator, report year, raw and normalized link — which is what makes a targeted re-load possible |

---

## 7. Open questions that gate this

| id | Question | Blocks |
| --- | --- | --- |
| **OQ-7** | 7 inactive STAR `link_results` rows would be destroyed by a hard delete of their mirror. Extend protection to inactive links, or accept the loss? The flag currently **protects** them. | `apply` |
| **OQ-8** | All four `app_secrets` rows have zero `app_secret_host_list` entries, so the origin check is skipped, and one resolves to a `System Admin`. Independent of this spec; the route-level block is in place, the underlying exposure is not fixed. | Deploy 2 sign-off |
| OQ-3 | Cross-year groups are reported, never auto-deleted (11 on dev). Confirm this is the intended business reading. | `apply` |
| OQ-4 | 21 AICCRA rows were already soft-deleted by the previous buggy path. Leave them, or hard-delete them? Currently **left**, and excluded from matching. | rollout |
| OQ-9 | `R-RES-002` AC.2 and AC.5 contradict each other for groups holding an AICCRA Capacity-Sharing row, a PRMS/TIP Knowledge Product **and** a PRMS/TIP non-KP row. Such groups are reported and nothing is deleted. **Zero on dev.** MEL may supply an explicit precedence, which would strictly increase what gets cleaned. | nothing today |

---

## 8. Reproducible verification

Three scripts, each runnable in one command from `server/researchindicators`, each exiting non-zero on failure:

```bash
# FK inventory + delete-function coverage, from information_schema
node ../../docs/specs/results/cross-platform-duplicate-resolution/fk-inventory.gen.js

# Normalization behavior, including the negative control on the binary collation
node -r ts-node/register/transpile-only \
  ../../docs/specs/results/cross-platform-duplicate-resolution/verify-normalization.js

# The dry run: row-count write-freedom, the real run lock, and the plan itself
NODE_PATH=$PWD/node_modules TS_NODE_PROJECT=./tsconfig.json npx ts-node -T \
  --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
  ../../docs/specs/results/cross-platform-duplicate-resolution/run-dry-run.ts
```

Last dev run of all three: **all green**, 116 groups, 105 rows to delete, zero row-count movement across eight tables, and the run lock correctly rejecting the second of two concurrent sweeps.
