# Next session — handoff

**Updated 2026-08-27, at the end of `/akili-specify` Phase 3. The spec is COMPLETE and ready to execute.**

> **Start here, then read `tasks.md`. You do not need `judgment.md` to execute** — it is 667 lines of history and its ledger is frozen. Read it only if you want to know *why* a decision has the shape it does.

---

## Where the spec stands

| | |
| --- | --- |
| Phase | `/akili-specify` **COMPLETE** — `requirements.md`, `design.md`, `tasks.md` all written and approved |
| Judgment | **4 rounds · 8 blind judges · 92 findings.** State: **`ESCALATED` — accepted by the product owner, not approved.** Ledger **frozen**, no further rounds authorized |
| Budget | **12 tasks · ≈ 1,560 LOC · ≈ 24 review rounds · 2 PRs** |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Depth | `Full` |

**The one binding condition of the acceptance:** `design.md` is authoritative wherever it and `requirements.md` disagree.

---

## What round 4 changed, in one paragraph

The authorized extra review round found **14 merged findings**, and one of them mattered enormously: **`DD-13` was not implementable at the seam it named.** `createCustomValidation` takes one argument and never receives the role, so the per-role rule map would have sent every Innovation Use value to the default rule and **rejected the exact values this spec exists to enable**. It is now v4 — an optional `dataRole` parameter on `base-service.ts`, the spec's only shared-file edit. Round 4 also found that the `bigint` column is **signed**, so the "default entry restores today's behaviour" rationale was false on the sign axis (a genuine new tightening, now gated by a second pre-flight query), and that `R-MSD-006` AC.3 was **unsatisfiable** — proven by execution, twice, independently.

**It also resolved `U-4`, which three rounds had recorded as "unresolvable without a browser."** It was resolvable by reading `node_modules`: both camps were right about different code paths.

---

## Start execution

```text
/akili-execute docs/specs/changes/measure-number-signed-decimal
```

**Start it in a fresh session.** Everything execution needs is in the three spec files; nothing lives only in the specify conversation.

---

## Carry these into execution — they bite

| # | Thing |
| --- | --- |
| **A** | **`T-01`'s pre-flight is BLOCKING, and it is now TWO queries.** Query 1 is magnitude (any role-3 row above 549,755,813,887 stops the change). **Query 2 is sign, by role** — added at round 4 — because the `bigint` column is signed and an existing negative role-1/2 row would `400` on a save its reporter never made. Neither is a formality |
| **B** | **Code first, migrations second, never the reverse.** Applying the `ALTER` before `T-02`'s transformer ships puts a `DECIMAL` string on the wire with no normaliser → `400` on the Innovation Use path and **silent row replacement** on the OICR path |
| **C** | **`L-08`, a pre-existing client defect this spec does not fix:** `oicr-details.component.ts` sends `q.number ?? 0` while its read preserves `null`, so a `NULL`-valued OICR row churns on save even with `DD-2`. The `T-07` OICR fixture **must expect this**, not be surprised by it |
| **D** | **The migration is applied by a human.** The pipeline deploys code but **not** migrations (`K-015`). A merge does not ship this schema. `T-05` needs `ALGORITHM=COPY`, which locks writes for a full table rebuild |
| **E** | **Session hygiene: run every `/akili-*` command with cwd = `alliance-research-indicators-main`.** From `-management` the `akili-*` model wrappers and the tasks-gate hook silently do not load. **This actually happened during round 4** — the judges were dispatched with a manual substitute and it is recorded in the ledger. Do not repeat it during execution, where the `akili-reviewer` read-only binding matters far more |
| **F** | **Three declared-and-unfixed risks live in `T-03`'s blast radius:** `RK-13` (`updateOicr` is not transactional, so DD-13's `400` lands on a partially-committed update), `RK-15` (`upsertQuantificationsByRole` bypasses the validator), `RK-16` (the `Maximum reached` false positive survives). **Do not silently fix any of them** — each is out of scope by decision, not by oversight |

---

## Still open, with owners

| ID | Question | Owner |
| --- | --- | --- |
| `OQ-1` | `report_oicr`: accept `10.0000` in OICR exports, or ship `DD-10`'s normalising expression? Recommendation: ship it. **Gates `T-06`'s merge** | Product owner + eng lead |
| `OQ-3` | Target branch — stay on `AC-1679-…` or branch from `main`? | You |
| `OQ-D5` | Dev and Prod MySQL versions. Narrowed to **8.0.4 … 8.0.16**; `DD-10` needs nothing above 8.0.4, so it no longer gates anything | DevOps |
| `S-10` | Amend `R-IUP-008` in the archived spec, and add the `FR-12` row to `docs/specs/innovation-use/family.md`. **Neither is done — now owned by `T-12`** |
| Sign-off | **Security review and DevOps are both REQUIRED**, not optional | Eng lead to schedule |

**Reported, not owned — worth tickets, none opened:** `O-1` (Innovation Use measures reach no report view at all), `O-3` (`orm.config.ts:53` is dead config), `RK-13`, `RK-15`, and the still-open `FR-7` / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718).

---

## The two things worth remembering about how this went

**1. A verified seam is not a verified mechanism.** Two judges confirmed `createCustomValidation` exists, is called on both upsert paths, and is unoverridden. Neither checked whether it receives the argument the rule map needs. That gap survived a whole revision and would have reached an implementer as a design that cannot be built.

**2. The count reconciling is not the citations resolving.** `design.md` §2.3's anchors went stale for all 25 clauses while its count (12 + 13 = 25) stayed perfect — and round 4's own repair broke 21 of them again by capturing line numbers *before* writing that round's edits. The durable fix is an **ordering** rule, now written into §2.3 and into `tasks.md` §4: regenerate the table **last**, then verify each anchor resolves to a line actually containing its clause.

Both are the same lesson the ledger has been circling for four rounds: **the decisions held; the propagation failed.** What finally moved the budget down was structural — fewer documents stating a decision — not better sweeping.
