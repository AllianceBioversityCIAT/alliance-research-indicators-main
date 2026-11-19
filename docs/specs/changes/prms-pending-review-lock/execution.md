# Execution Log — PRMS / Pending-review lock

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/prms-pending-review-lock` |
| Branch | `fix/prevent-prms-resubmission-during-active-review` |
| Started | 2026-11-19 |
| Approval mode | `gated` in the spec. The run follows the owner's standing rule: execute task to task, and stop only on `FATAL_FAIL`, HALT, Pivot or budget tripwire. The client tasks (T-04, T-05) are not committed before the owner sees them working |
| Routing | Implementer: Grok (`grok-4.7-*`) through Orca `worker-start --agent cursor`. Reviewer: a fresh Claude `akili-reviewer` (Opus). The Leader is Claude Opus 5.5. `author ≠ auditor` holds on both axes |
| Budget (design §12) | 5 tasks · about 300 production LOC + 550 test LOC · about 7 review rounds |

## 2. Task Execution History

### T-01 — Pure rule, history reader, and SQL fixture → **PASS**

- **Date:** 2026-11-19
- **Final status:** PASS, on attempt 1.
- **Requirements covered:** R-PRL-001. Scenarios S-1…S-6, S-26, S-27, and the "no rows" half of S-4.
- **Skills / effort:** `nestjs-expert` and `tdd`, as the task lists. Effort `high` instead of the default `medium`, because this is the core rule and its SQL semantics.
- **Attempts:** 1.

#### Attempt 1

- **Worker:** Orca dispatch `ctx_47897486477c` (task `task_d6556a8099ce`), Cursor · `grok-4.7-high`.
- **Files changed:**
  - new `server/researchindicators/src/domain/entities/result-prms-sync/eligibility/prms-push-status.ts` and its `.spec.ts`
  - new `server/researchindicators/src/domain/entities/result-prms-sync/prms-push-status.reader.ts` and its `.spec.ts`
  - `server/researchindicators/src/domain/entities/result-prms-sync/result-prms-sync.module.ts` (provider)
  - new `server/researchindicators/test/fixtures/prms-push-status.fixture-spec.ts`, band `901000`–`901009`
- **Implementer verification:**
  - `npm test -- --silent prms-push-status` → 2 suites, 9 tests passed.
  - `npm run test:fixtures -- prms-push-status` → 7 passed.
  - `npx eslint <6 files>` → exit 0.
  - `npm run build` → exit 0.
- **Falsifiers.** Each was observed red, quoted by the Implementer, and reverted:
  - **(a)** The stable sort was replaced with a `localeCompare` on `occurredAt`. The 698 case went red: expected `"status": "pending_review"` with `"resubmittable": false`, received `"status": "rejected"` with `"resubmittable": true` for `"year": 2026`. S-27 also turned `rejected`.
  - **(b)** The `phase_year` projection was changed to `h.result_year`. S-26 went red: expected `"status": "never_pushed"`, received `"status": "rejected"` for `"year": 2027`.
  - **(c)** `raw_headers IS NOT NULL` was dropped from `imported`. The push row went red: `Expected: 0`, `Received: null`.
  - **(d)** The `CAST` was dropped. The string-year case went red: `Expected: 2026`, `Received: "2026"`.
- **Consumers sweep:** `git grep -n "PrmsPushStatusReader\|derivePrmsPushStatus" -- server` returned 0 hits before the task and 2 after, both in `result-prms-sync.module.ts`. The new files were untracked at that point, so git grep did not see them.
- **What the checks cannot reach (KZ-017, Implementer):**
  - The reader spec reads the text of `PUSH_EVENTS_SQL` but never runs `read()`.
  - The fixture cannot exercise falsifier (a), because the reader passes no timestamps. Only the rule unit test catches it.
  - `npm run build` excludes spec files and the fixture.
- **Evidence re-run (non-author, Leader inline) → `VERIFIED`.** The Leader rebuilt the TEST container (see *Issues encountered*) and created the history table from the migrations' own SQL. Results:
  - unit 9/9 passed;
  - fixture 7/7 passed;
  - smoke 1/1 passed;
  - eslint exit 0;
  - build exit 0.

  These match the Implementer's report.
- **Reviewer verdict:** `STATUS: PASS` from a fresh Claude `akili-reviewer` in checklist mode. Summary: the rule, the reader SQL, the fixture and the provider registration match T-01 and design §5.1.1–5.1.7. All four falsifiers were observed red. Issues: none.
- **runtime events:** none.
- **spawns:**
  - Implementer: about 70 calls (the worker's own count), tokens not reported by the host. It ended complete. 70 calls is past the persona's 60-call checkpoint bound, and the worker did not report a checkpoint. This is recorded as information only.
  - Reviewer: calls and tokens not reported by the host. It ended complete.

#### ADVISORY (4R, from the final Reviewer verdict; never gates)

1. **Readability / spec drift.** `PrmsPushEvent.decision` is typed `string | null`, while design §5.1.1 says `'APPROVE' | 'REJECT' | null`. The task's "unknown verb" unit test needs the wider type, and the reader still emits only APPROVE/REJECT. This was resolved by the spec edit recorded under *Decisions made*.
2. **Reliability (falsifier gap).** No test exercises the `correlation_outcome = 'CORRELATED'` predicate. If it were dropped, no test would go red. A `NO_REFERENCE` REJECT row seeded in a spare band slot (901005/7/8) would close the gap. The task does not require that row, so it is recorded here and not turned into work (Advisory Never Becomes A Task).
3. **Readability.** `statusOf` maps any non-APPROVE decision to `rejected`. That is correct only because `decides()` filters first. An explicit `=== 'REJECT'` would be more robust.
4. **Risk / KZ-017.** The reader spec checks the SQL text only. Falsifier (a) is caught only by the rule unit test. This is covered as designed by DD-2.

#### Decisions made

- **Execute-time spec edit:** `design.md` §5.1.1, amended 2026-11-19. The rule's input type `decision` is widened to `string | null` and the reader still emits only `'APPROVE' | 'REJECT' | null`. This aligns the design with the T-01 "unknown verb" test. It does not change what R-PRL-001 means. It is carried as a named conformance check in the T-02 Reviewer brief.
- The Leader kept the TEST container rebuilt from scratch rather than the worker's partially migrated one.

#### Issues encountered

- **The TEST scratch bootstrap is broken, and that predates this spec (open item).**
  - On a fresh container, `npm run migration:test:bootstrap` fails at `CreatePiDelegates1787600000000` with `Referencing column 'project_id' and referenced column 'agreement_id' in foreign key constraint 'FK_pi_delegates_project_id' are incompatible.` (errno 3780).
  - Every later migration therefore never runs on the scratch schema, `1790086170692-createPrmsWebhookDeliveryTable` included.
  - The worker had also run `migration:test:execute` on the old container, which failed part-way (`clarisa_innovation_use_levels already exists`). It then created the table by hand.
  - The Leader discarded that container (`compose:test:down` → `up` → `migration:test:bootstrap`, which failed as above). It then created `result_prms_sync_history` from the exact `up()` SQL of 1790086170692, 1792673320363 (`platform_code` column + index) and 1792681023849 (collation). The fixture evidence rests on that copy.
  - The bootstrap defect needs its own fix and is out of scope here.
- **Implementer over the call bound:** see *spawns* above.

#### Running totals (Budget Tripwire)

- Tasks: 1 of 5.
- LOC: `git diff --stat` at commit (see the commit). Production is about 190 lines (rule + reader + module). Tests are about 520 lines (rule spec + reader spec + fixture). That is within budget for now, but the tests already consume most of the 550-line estimate.
- Review rounds: 1 of about 7.
