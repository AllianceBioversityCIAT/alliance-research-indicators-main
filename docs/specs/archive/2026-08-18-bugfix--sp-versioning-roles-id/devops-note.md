# DevOps hand-off — versioning routine repair

**For:** DevOps, before the migration runs against the shared dev database
**From:** `bugfix/sp-versioning-roles-id`

## What to do

0. **Do not run this until the Engineering lead has approved the shared-DB run.** `design.md` §6 "Shared-DB gate" and root `CLAUDE.md` §4.3 both make this a human decision, not an agent's or this note's own — destructive schema/data operations against the shared, non-disposable dev database require sign-off first. **This note is the hand-off that *requests* the run; it is not the approval.** `requirements.md` §7 Sign-off carries two rows with distinct roles *(adopted 2026-08-18, advisory D-4/E-4)*: the **Engineering lead** row is the **approval** — check it, with name and date, before anyone proceeds to step 1. The **DevOps** row is the **executor acknowledgement** — whoever runs the migration checks that box afterward, confirming the run happened as specified below. Keeping these as two separate people, not one engineer checking both boxes for themselves, is the point of the split. Record both in `requirements.md` §7 or in this spec's `execution.md` T-03 entry.
1. Run these two migrations **in this order** (they are consecutive by timestamp, so a normal `migration:dev:execute` run already applies them in the right order — this is just confirming it, not asking for anything special):
   - `1784250000000-RepairSpDeleteResultVersionObjectiveTables.ts`
   - `1784300000000-RepairSpVersioningObjectiveBlocks.ts`
2. Do it in a **low-traffic window**. Reporting is currently **paused in production** — that pause is the ideal window; you don't need to schedule around anything else.
3. **Run both together, or not at all.** Never apply the second migration (`SP_versioning`) without the first already in place — see "Why order matters" below.
4. Confirm the run executes as the `AllianceRepUser` DB user (see "DEFINER" below) — this is a check, not a change to how you already run migrations.
5. No user-facing comms needed (see "User impact" below).

## Why order matters

Both migrations `DROP` + `CREATE` a stored procedure used by **every indicator** (versioning/snapshot is currently broken for all six). The delete-routine fix (`1784250000000`) must land first or in the same release as the versioning fix (`1784300000000`):

- The versioning fix is what lets result snapshots contain objective rows in `result_impact_outcomes` / `result_strategic_objectives` again.
- If the delete-routine fix isn't in place yet, the **next** delete-then-reversion of one of those results fails with MySQL **1451** partway through, after other child rows have already committed — leaving that snapshot's data partially destroyed and unrecoverable through the application.
- Applying them together (as ordered above) closes this before it can happen.

## Timing

`DROP`/`CREATE` briefly raises MySQL **1305** (procedure does not exist) for any concurrent `CALL` to that procedure, and the `DROP` takes an exclusive metadata lock that waits for in-flight calls to finish. Run in a quiet window — see "User impact" for why now is a good one.

## DEFINER — please confirm

Dev's current routines carry `DEFINER=\`AllianceRepUser\`@\`%\``. Neither new migration declares a `DEFINER` clause, so MySQL will recreate both procedures as `CURRENT_USER` — i.e., whichever account runs the migration. **Please confirm the migration runs as `AllianceRepUser`.** This is not a new risk specific to this change — the existing `1783029013035` migration (the one currently broken) has the identical property — but it's worth a positive confirmation on any DEFINER-affecting change.

One caveat on our own testing: the scratch-container harness we used to prove these migrations red-before-green recreates procedures with **no DEFINER at all**, so it structurally could not exercise this axis. The green fixture run is evidence that the SQL is correct — it is **not** evidence about privilege/DEFINER behavior on dev. That's this confirmation step's job.

## Revert — read before running a second one

`npm run migration:revert` reverts **exactly one** migration per run. With both migrations applied, the default single revert takes off `1784300000000` (the versioning fix) — which is already the safe choice; it simply re-breaks versioning the way it is broken today.

**The hazard is a *second* consecutive revert** (removing `1784250000000` too). Do not do this without checking first: if any result was versioned while the fix was live, its snapshot now has rows in `result_impact_outcomes` / `result_strategic_objectives`. Removing the delete-routine fix while those rows exist re-creates the exact 1451 failure this repair closes — the next delete-then-reversion of one of those results will fail partway through and strand data.

Before a second revert, check whether any such rows exist:

```sql
SELECT r.result_id FROM results r
JOIN result_impact_outcomes rio ON rio.result_id = r.result_id
WHERE r.is_snapshot = TRUE;

SELECT r.result_id FROM results r
JOIN result_strategic_objectives rso ON rso.result_id = r.result_id
WHERE r.is_snapshot = TRUE;
```

If either query returns rows, do not revert `1784250000000` — those results would be left one delete-attempt away from partial data loss with no repair in place.

## User impact: none

Reporting has been paused in production for some time, so no version/snapshot attempt has occurred and no user has hit either defect. No comms are needed. This is also why the current window is the ideal low-traffic time to run both migrations.
