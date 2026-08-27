# Next session — handoff

**Paused 2026-08-26. Resume 2026-08-27.**

> **Start here, then read `judgment.md`'s last section (*Post-acceptance revision*), then `design.md`.**
> Do **not** re-read the whole ledger to get going — it is 78 findings of history. The two paragraphs below are the state.

---

## Where the spec stands

| | |
| --- | --- |
| Phase | `/akili-specify` **Phase 2 complete** (`requirements.md` + `design.md` approved). **Phase 3 (`tasks.md`) not started** |
| Judgment | 3 rounds, 6 blind judges, **78 findings**. State: **`ESCALATED` — accepted by the product owner, not approved** |
| Then revised | After acceptance, an **additive-defaults ruling** rewrote `DD-7`, `DD-12`, `DD-13`, `DD-14`. It made three accepted defects **unreachable** and fixed the fourth |
| Budget | **11 tasks · ≈ 1,500 LOC · ≈ 22 review rounds · 2 PRs** |
| Branch | `AC-1679-Create-the-innovation-use-section` |

**The one binding condition of the acceptance:** `design.md` is authoritative wherever it and `requirements.md` disagree.

---

## ⚠️ Do this first: the work is UNCOMMITTED

`git status` shows the entire folder as `??` — untracked. Four documents, ~190 KB, on `AC-1679-…`. **Nothing is in git.** Commit before doing anything else, or a stray `git clean` loses three rounds of judgment.

Suggested: `docs(specs): add measure-number-signed-decimal spec through Phase 2`

---

## Tomorrow's plan, as agreed

### 1. ONE more review round — then stop reviewing

> **Explicit product-owner decision, 2026-08-26:** *"mañana comenzaremos con otra revisión, solo una más, y ya nos vamos a las tareas."*

This is a **deliberate extension of the judgment lineage**, which the protocol requires a human to authorize — and this is that authorization, recorded. The budget was exhausted (2 fix rounds, 2 re-judgments); this adds **one** round and **one** fix pass, and then the spec goes to tasks regardless of what the round finds.

**What the round must target — the un-judged surface only.** Everything the six judges reviewed is already in the ledger; re-reviewing it wastes the round. What no judge has seen:

| # | Un-judged | Why it matters |
| --- | --- | --- |
| 1 | **`DD-12`** — the card's `maxFractionDigits` default changing `undefined` → `0` | The only default whose *value* changes. Rests on `U-11`/`U-4`, which is contested and needs a browser |
| 2 | **`DD-13`** — the `createCustomValidation` override + per-role rule map | Two judges verified the *seam* exists and that `ResultQuantificationsService` is the only path; **none has reviewed the rule map itself**, including whether the default entry reproduces today's behaviour for roles 1 and 2 |
| 3 | **`DD-14`** — the new bound and its `@Input` plumbing | The formula **is** executed (zero collisions). The *plumbing* — `max` as an `@Input` on `app-input`, defaulting to today's value — is not reviewed |
| 4 | **`DD-7` withdrawal** | Withdrawing an edit should be safe, but nobody has confirmed nothing else depended on it |
| 5 | **The three-pass sweep's fixed point** | Passes found 1 → 3 → 0 survivors. A judge should hunt independently; three rounds running, my "clean" was wrong |
| 6 | `R-MSD-002`'s amended scenario, `R-MSD-006`'s new AC.6, `R-MSD-011` AC.2, `R-MSD-012` AC.2 | All rewritten after the last judge saw them |

**Suggested framing for the round:** two blind read-only judges on `opus`, identical prompts, scoped to the six rows above plus an independent survivor hunt. Same protocol as before — merge only what both confirm, ask before fixing. It is in `judgment.md`'s round-1 and round-3 sections if you want the prompt shape.

### 2. Then `tasks.md` — and stop

11 tasks, 2 PRs. The natural seam is in `design.md` §14: **(1) server** — entity transformer, the shared validator override, both migrations; **(2) client** — the card's inputs and defaults, the Innovation Use call site, the read/write type reconciliation. The client depends on (1)'s transformer existing.

`design.md` §2.1 already lists every file with its responsibility, so the decomposition is mostly transcription, not design.

---

## Carry these into execution — they bite

| # | Thing |
| --- | --- |
| **A** | **`NFR-MSD-002`'s pre-flight is BLOCKING.** If any existing role-3 row exceeds 549,755,813,887, the change **stops**. It is not a formality |
| **B** | **Code first, migrations second, never the reverse.** Applying the `ALTER` before `DD-2`'s transformer ships puts a string on the wire with no normaliser → `400` on the Innovation Use path and **silent row replacement** on the OICR path |
| **C** | **`L-08`, a pre-existing client defect this spec does not fix:** `oicr-details.component.ts` sends `q.number ?? 0` while its read preserves `null`, so a `NULL`-valued OICR row churns on save even with `DD-2`. The new OICR fixture **must expect this**, not be surprised by it |
| **D** | **The migration is applied by a human.** The pipeline deploys code but **not** migrations (`K-015`). A merge does not ship this schema |
| **E** | **Session hygiene:** run every `/akili-*` command with cwd = `alliance-research-indicators-main`. From `-management` the model wrappers and the tasks-gate hook silently do not load |

---

## Still open, with owners

| ID | Question | Owner |
| --- | --- | --- |
| `OQ-1` | `report_oicr`: accept `10.0000` in OICR exports, or ship `DD-10`'s normalising expression? Recommendation: ship it | Product owner + eng lead |
| `OQ-3` | Target branch — stay on `AC-1679-…` or branch from `main`? | You |
| `OQ-D5` | Dev and Prod MySQL versions. Narrowed to **8.0.4 … 8.0.16**; `DD-10` needs nothing above 8.0.4, so it no longer gates anything | DevOps |
| `S-10` | Amend `R-IUP-008` in the archived spec, and add the `FR-12` row to `docs/specs/innovation-use/family.md`. **Neither is done** | This spec, at execution |

**Reported, not owned — worth tickets, none opened:** `O-1` (Innovation Use measures reach no report view at all), `O-3` (`orm.config.ts:53` is dead config), `L-19`'s second uncalled quantification upsert, and the still-open `FR-7` / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718).

---

## The one thing worth remembering about how this went

The decisions held under six adversarial judges. What failed, three rounds running, was **propagation** — one decision restated across four documents, with no sweep closing all of them. The additive-defaults ruling was the first change that attacked that instead of patching its symptoms: fewer edited files, fewer places to fall out of sync. **The budget went down for the first time in the whole process.**

And the sweep lesson, which is not "sweep harder": passes 2 and 3 still found survivors **after** pass 1 reported clean. A single clean pass is not evidence — the fixed point is.
