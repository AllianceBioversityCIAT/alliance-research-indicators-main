# Tasks — Innovation Use drafts must save while incomplete

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/innovation-use-draft-save` |
| **Depth** | Lite · Bug Mode |
| **Requirements** | [`./requirements.md`](./requirements.md) · **Design** [`./design.md`](./design.md) · **Proposal** [`./proposal.md`](./proposal.md) |
| **Budget** | 3 tasks · ~180 LOC · ~4 review rounds (`design.md` §7). **If T-01 exceeds two review rounds, stop and re-scope the fixture** |
| **Concurrency** | **T-01 and T-02 are parallel-safe** — different packages, and the client tests mock HTTP so they need no server change. Root `CLAUDE.md` §4.3 permits one server + one client task concurrently. **T-03 is not** |
| **Deployment** | One PR, both tiers. Never ship half |

---

## 2. Tasks

### T-01 — Server: delete the save-time guard, invert its tests, redesign the boundary fixture

- **Status:** `[x]` **done** — Reviewer PASS on attempt 1 (1 review round); see `execution.md` → *T-01* · **Size:** M · **Dependencies:** none
- **Requirements covered:** R-IUD-001 (AC.3), R-IUD-002 (AC.1, AC.3, AC.4), NFR-IUD-001, NFR-IUD-002
- **Design references:** §3.1, §4, DD-1, DD-6, §8
- **Skills:** `nestjs-expert` · `systematic-debugging` (on any failure)

**Scope**

1. `result-innovation-use.service.ts` — remove the call at `:183` and the `validateLevelExplanation` method at `:307-326`.

   > ⛔ **Amended 2026-08-21 at T-01's review.** This item said: *"**Leave `:168-171` (the key-present ? payload : stored resolution) untouched** — it is what preserves a stored justification when the field was never typed into."* **The premise was false** — preservation comes from step 6's partial merge, not from that resolution, which never reached the write (`design.md` §3.1). The instruction therefore protected dead code for a reason that was never true, and the Implementer complied by retaining it as `_effectiveExplanation`. **The amended instruction: `:168-171` may be deleted, together with the now-stale rationale paragraphs at `:263-264`, `:269-271`, `:278-284` and the false comment at `innovation-use-section-round-trip.fixture-spec.ts:992-994`.** Pending the user's ruling, bundled with the budget escalation.
2. Invert the five unit tests at `result-innovation-use.service.spec.ts` `:284, 559, 575, 688, 1136`.
3. Redesign `test/fixtures/innovation-use/innovation-use-level-boundary.fixture-spec.ts` around the mirror assertion.
4. Update the referencing comment at `innovation-use-edit-plus-add-id-collision.fixture-spec.ts:194`.

**Do not** add a migration. **Do not** touch `innovation_use_validation`. **Do not** change the workflow config.

**Done criteria**

- [ ] c1 — **Bug Mode regression, red before / green after.** A fixture saving a level-≥6 result with a blank justification **fails on current code** (the `400`) and **passes after** the deletion. Record both runs verbatim.
- [ ] c2 — **The mirror half, in the same fixture:** after that save, the section's green check is **`false`**, and a `REVISED → SUBMITTED` attempt on the same row is **still rejected**. *(DD-6 — asserting only the save cannot distinguish "fixed" from "all enforcement gone".)*
- [ ] c3 — Whitespace-only (`'   '`) saves, is stored **verbatim**, and the green check is still `false`. **Assert the green check, not the column contents** — whitespace in the column is expected.
- [ ] c4 — The five inverted unit tests each assert the **positive** outcome — the save proceeds and child services are invoked with the expected arguments. **A test whose only assertion is `not.toThrow()` fails this criterion** (KZ-001).
- [ ] c5 — `grep` for `validateLevelExplanation` across `server/` returns **zero** hits outside comments.
- [ ] c6 — `npm test -- --silent` **full and unfiltered**; coverage above the 60% floor. `npm run lint -- --quiet`, then `git status` re-inspected (the script carries `--fix`).
- [ ] c7 — `git diff --exit-code` clean on `src/db/migrations/` and on `1787078283929-createInnovationUseValidation.ts`.

**Falsifying input** — restore the method and its call: **c1 and c2 must both FAIL.** If c1 fails but c2 still passes, c2 is not testing what it claims. Additionally, stub the green check to `true`: **c2 must FAIL** — otherwise the mirror assertion is decorative.

**Disqualifiers**

| Signal | Disqualifier |
| --- | --- |
| `npm test` | A filtered or targeted run is **inconclusive**, never a pass (KZ-003) |
| Fixture run | A green fixture that never ran red is not Bug-Mode evidence. Both directions or nothing (KZ-004) |
| `npm run lint` | Mutates files. Evidence must include the post-run `git status` |
| Inverted tests | A pass reached by weakening an assertion is a regression disguised as green (KZ-001) |

---

### T-02 — Client: drop the save gate condition and the duplicate message

- **Status:** `[x]` **done** — Reviewer PASS on attempt 2 of 3 (2 review rounds); see `execution.md` → *T-02* · **Size:** S · **Dependencies:** none *(parallel-safe with T-01)*
- **Requirements covered:** R-IUD-001 (AC.1, AC.2, AC.4, AC.5), R-IUD-003 (all 6)
- **Design references:** §3.2, §3.3, DD-2, DD-3, DD-4, DD-5
- **Skills:** `angular-developer` · `ui-ux-pro-max` (message rendering) · `systematic-debugging` (on any failure)

**Scope**

1. `innovation-use-details.component.ts:497-503` — remove **only** `!this.justificationMissing()`. The other four conditions stay, **including `!this.hasDuplicateActorType()`** (DD-5).
2. **Make the two required messages disjoint** — do **not** suppress either. *(Corrected 2026-08-21 after attempt 1; this item said "suppress the shared `app-textarea`'s own required message … from the call site only", which c2's falsifying input forbids.)* `app-textarea`'s untrimmed check already owns the raw-empty cases; gate the page-owned block on **whitespace-only** (`justificationMissing()` AND a non-empty raw value) so the two never overlap. **Leave `app-textarea`'s bindings untouched.**
3. Invert T-09 c5's assertions and add R-IUD-003's message counts.

**Do not** touch `buildPayload` (**DD-3** — trimming there is a bug, not a cleanup). **Do not** remove `justificationMissing()` itself (**DD-4** — it drives the page-owned message, one of the two disjoint sources). **Do not** edit `TextareaComponent` (**DD-2**).

**Done criteria**

- [ ] c1 — Blank justification at resolved `level >= 6`: exactly **one** `PATCH` on `HttpTestingController`, **and** the required message renders. Both in the same test.
- [ ] c2 — Whitespace-only: one `PATCH`, message renders, and the payload carries the whitespace **verbatim**.
- [ ] c3 — **Message count is exactly 1 / 1 / 0** across blank / whitespace-only / real text. Count rendered nodes, not class strings.
- [ ] c4 — At resolved `level < 6`: textarea absent, message absent, and the save still fires.
- [ ] c5 — The red asterisk still renders at `level >= 6`.
- [ ] c6 — **`buildPayload` is byte-identical** — `git diff --exit-code` on nothing less than the method's lines; a never-typed justification **omits the key**, a typed-then-deleted one sends `''`.
- [ ] c7 — **`TextareaComponent` is byte-identical** (`git diff --exit-code` on its path). Its own spec passes unmodified.
- [ ] c8 — A duplicate actor type **still blocks** the save (DD-5 unchanged).
- [ ] c9 — `npm test -- --silent` **full and unfiltered**; coverage above 40/20/45/30. `npm run lint -- --quiet`, then `git status` re-inspected.

**Falsifying input** — restore `!this.justificationMissing()` in the gate: **c1 must FAIL.** Delete the page-owned block: **c2's whitespace case must FAIL** while c1's blank case still passes — that asymmetry is the whole reason the page-owned block exists and is the check that proves you kept the right one of the two messages.

**Disqualifiers**

| Signal | Disqualifier |
| --- | --- |
| Message count | Asserting a CSS class is present proves presence, not that one node renders. Count nodes |
| `npm test` | Filtered runs are inconclusive (KZ-003) |
| c6/c7 | An "equivalent" refactor of `buildPayload` or the shared component is a FAIL regardless of green tests — byte-identity is the criterion |

---

### T-03 — Amend the affected specs and close the verification gate

- **Status:** `[x]` **done** — Reviewer PASS on attempt 3 of 3 (3 review rounds); see `execution.md` → *T-03* · **Size:** S · **Dependencies:** T-01, T-02
- **Requirements covered:** NFR-IUD-003 · closure for all three requirements
- **Design references:** §9, and `proposal.md` §5 *Documents*
- **Skills:** `cognitive-doc-design`

**Scope — documents**

1. **Pivot the open `details-page` spec** (it is `[~]` at T-13, nothing archived): R-IUP-006 AC.2, `design.md:380` (*"Save blocked"*), `tasks.md:428`, criterion **T-09 c5**, and the traceability row `tasks.md:604`. Record it as a Pivot in that spec's `execution.md`, pointing here.
2. **Superseding record for archived chunk 2** — `docs/specs/archive/2026-08-20-innovation-use--details-api/requirements.md` → `R-IUA-006` AC.3/AC.4 assert the rejection. **Do not edit the archived file in place**; archived specs are point-in-time records. Write the supersession where this spec can be found from it. **Done:** [`docs/specs/archive/2026-08-20-innovation-use--details-api/save-time-justification-superseded.md`](../../archive/2026-08-20-innovation-use--details-api/save-time-justification-superseded.md) — also covers AC.1, superseded by the same mechanism (see that note's per-AC table).
3. **`docs/specs/innovation-use/family.md`** — add a **follow-up/risk row**, not a child row (this is a bugfix, not a family chunk).
4. **File the platform finding** from `proposal.md` §15 — `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for every indicator — somewhere it has an owner. It is **not** fixed here.

**Done criteria**

- [ ] c1 — **Correction Closure, both directions (KZ-005).** *Forward:* grep `Save blocked`, `save-block`, and `blocked` across `docs/specs/innovation-use/` — every hit is updated or explicitly recorded as intentionally kept. *Backward:* grep for references **to** the amended sections and re-read what each asserts. **Report a per-file line, including files with zero findings** (KZ-007).
- [ ] c2 — The archived chunk-2 file is **byte-identical** (`git diff --exit-code` on its path); the supersession lives elsewhere.
- [ ] c3 — `family.md`'s child table is **unchanged**; the new row is in a risk/follow-up table.
- [ ] c4 — **Both** full suites green and both lints clean, run in a **quiet window with no delegated agent active** — a measurement taken during a spawn is wrong, not slow (root `CLAUDE.md` §4.3).
- [ ] c5 — The PR description states the **deployment coupling** (both tiers or neither, server first) and names what to review first.
- [ ] c6 — `details-page` **T-09 c5 is not left asserting the old behavior.** It was hardened to assert *"blocked and message renders"*; leaving it would make that spec's own history contradict the shipped code.

**Falsifying input** — run the forward grep **before** amending: it must return hits. A sweep that finds nothing on a spec known to contain `Save blocked` in at least three places means the grep is wrong, not the spec clean. *(This spec's run has already had the forward sweep catch survivors the cited-site list missed — twice.)*

---

## 3. Requirement → task coverage, at clause level

**Requirement-ID presence is not closure.** Every scenario and every `BUT` / `AND IT MUST` clause is owned below.

| Requirement | AC / clause | Owner |
| --- | --- | --- |
| R-IUD-001 | AC.1, AC.2 | **T-02** c1 |
| R-IUD-001 | AC.3 | **T-01** c1 |
| R-IUD-001 | AC.4 | **T-02** c4 |
| R-IUD-001 | AC.5 | **T-02** c6 |
| R-IUD-001 · sc.1 | *BUT must NOT clear a stored justification when never typed into* | **T-02** c6 (key omitted) + **`innovation-use-section-round-trip.fixture-spec.ts:955`/`:1008-1014`** — an omitted-key PATCH against real MySQL, column read back by raw SQL, unchanged by T-01 and green. *(Citation corrected 2026-08-21: this row credited "**T-01** scope item 1 (`:168-171` untouched)", which is the wrong mechanism entirely — see `design.md` §3.1's correction. The clause was always evidenced, just not by what the table cited.)* |
| R-IUD-001 · sc.1 | *AND IT MUST leave the green check false* | **T-01** c2 |
| R-IUD-001 · sc.2 | *BUT must NOT be normalized to `undefined` in `buildPayload`* | **T-02** c6 |
| R-IUD-001 · sc.2 | *AND IT MUST keep Submit disabled* | **T-01** c2, c3 |
| R-IUD-002 | AC.1 | **T-01** c2, c3 |
| R-IUD-002 | AC.2 | **T-01** c2 (the green-check flip) |
| R-IUD-002 | AC.3 | **T-01** c2 |
| R-IUD-002 | AC.4 | **T-01** c7 |
| R-IUD-002 · sc.1 | *BUT must NOT report the section complete on a successful save* | **T-01** c2 |
| R-IUD-002 · sc.1 | *AND IT MUST turn green once real text is saved* | **T-01** c2 |
| R-IUD-003 | AC.1–AC.3 | **T-02** c3 |
| R-IUD-003 | AC.4 | **T-02** c4 |
| R-IUD-003 | AC.5 | **T-02** c5 |
| R-IUD-003 | AC.6 | **T-02** c7 |
| R-IUD-003 · sc.1 | *BUT must NOT render a second message in a different color* | **T-02** c3 |
| R-IUD-003 · sc.1 | *AND IT MUST still appear for whitespace-only* | **T-02** c2, c3 |
| NFR-IUD-001 | — | **T-01** c7, **T-02** c7 |
| NFR-IUD-002 | — | **T-01** c6, **T-02** c9 |
| NFR-IUD-003 | — | **T-03** c5 |

**8 of 8 scenario clauses owned. 15 of 15 ACs owned.**

---

## 4. Sequencing and PR strategy

```
T-01 (server) ──┐
                ├──> T-03 (docs + gate)
T-02 (client) ──┘
```

**T-01 and T-02 run concurrently** — different packages, and T-02's tests mock HTTP so they do not wait on the server. This is the one legitimate parallelism here; two tasks in the same package would not be.

**One PR, ~180 LOC — below the ~400 threshold, so no split.** Splitting would be actively wrong: the tiers are deployment-coupled, and a client-only PR turns a silent no-op into a visible `400`.

PR description should lead with the server deletion and the `valid_text` reasoning, since that is the part a reviewer is most likely to challenge — *"you removed a validation"* is the obvious objection, and the answer is that the rule still lives in the green check that gates Submit.

---

## 5. Not in this spec

| | |
| --- | --- |
| `completenessValidation` `enabled: false` on `DRAFT → SUBMITTED` | Platform-wide, every indicator. **Filed by T-03 c-scope 4, fixed nowhere here** |
| The submit gate | Reporter-verified working: the button activates only on all-green, and the transition succeeds |
| `hasDuplicateActorType()` | DD-5 |
| Dark mode | `details-page` DD-14 |
| Investment / co-investment USD tables | Family non-goals |
