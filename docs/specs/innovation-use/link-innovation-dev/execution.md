# Execution Log — Innovation Use / Link to a reported Innovation Development output

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Requirements | [`requirements.md`](requirements.md) |
| Design | [`design.md`](design.md) draft 2 + Amendment 01 |
| Tasks | [`tasks.md`](tasks.md) — 13 tasks |
| Approval Mode | **pre-approved** — the continue/pause gate auto-passes after a PASS; a HALT, Pivot, budget tripwire or `FATAL_FAIL` always stops for the user |
| Leader | Claude Code, `opus` (T1) |
| Execution started | 2026-09-09 |

### Lane bindings in force (`tasks.md` §1, user ruling 2026-09-09)

| Lane | Tasks | Executor | Reviewer |
| --- | --- | --- | --- |
| Server | T-01 … T-07 | Claude session (`akili-implementer`, `sonnet` T2). **Never Antigravity** | `akili-reviewer`, `opus` (T3) |
| Client | T-08 … T-12 | **Antigravity** `gemini-3.8-flash-high` via Orca orchestration | `akili-reviewer`, `opus` (T3) |
| Docs | T-13 | Claude | — |

> **Leader deviation from `tasks.md` §1, recorded.** §1 assigns the server lane to "Claude,
> in-session. Not delegable" with "Claude (self-review)" as reviewer. The user's ruling was that the
> back end must not go to **Antigravity**; it did not ask the Leader to write code, and AKILI forbids
> that except after an exhausted rework loop with explicit approval. Server work therefore runs in a
> Claude `akili-implementer` subagent — still the Claude session, never Antigravity — and is audited
> by `akili-reviewer` on a **different model** (`opus` vs `sonnet`). This is strictly stronger than
> the self-review §1 contemplated: it restores `author ≠ auditor` on both axes.

---

## Transport note — the Orca ⇄ Antigravity false negative, and what it costs downstream

`tasks.md` §1 records that `worker-start` marks an Antigravity dispatch `failed` after ~8 s with
`agent_prompt_stalled` although the worker is running, and instructs: do not re-dispatch, read the
terminal. **Reproduced on the `dispatch --inject` path too, and it has a consequence §1 did not
record:**

| Observation | Evidence |
| --- | --- |
| `orca orchestration dispatch --task task_bd3a2846c92d --to <handle> --inject` returned `ok: false`, `agent_prompt_stalled` | command output, 2026-09-09 |
| The prompt **did** land; the worker read `design.md`, `requirements.md`, `tasks.md`, the client child guide | `orca terminal read` buffer showed the injected brief plus the worker's own `Read(...)` calls |
| `dispatch-show --task task_bd3a2846c92d` reports `status: failed` | command output |
| **The dispatch capability was revoked**, so the worker's lifecycle mail is dead | the worker's `heartbeat` (`phase: implementing`) came back to the coordinator as `Rejected heartbeat`, payload `{"code":"dispatch_capability_invalid","reason":"Dispatch ctx_525ff1ea0066 capability is revoked."}` |

**Consequence:** the contracted `worker_done` can never arrive on this dispatch. The Leader stopped
its `check --wait` (a wait on an impossible message) and collected the report from the terminal
buffer instead. This does **not** repeal the rule that a silent worker is a runtime failure — it
means that on this transport the silence has a *proven* cause, established by reading the terminal,
not assumed.

**Leader's own error while doing this, recorded because it is the K-014 family:** the first terminal
watcher grepped for `STATUS: (COMPLETE|BLOCKED)`, which matched the **echoed brief** in the buffer
rather than the report, and fired a false completion. `tui-idle` was then also unreliable — it was
satisfied while the worker was still running `npm test`. The watcher that worked matched
`DELTA: [0-9]`, a pattern the echoed template cannot produce. A filtered view of a buffer is not the
buffer.

**Registry drift, confirmed for T-13.** Root `CLAUDE.md` lists `gemini-3.7/3.6/3.5-flash`.
`agy models` on 2026-09-09 returned `gemini-3.8-flash-{high,medium,low}`, `3.7`, `3.6`,
`gemini-3.1-pro-{high,low}`, `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`
— **no 3.5 at all**. T-13(d) owns the correction.

---

## Measured figures — THIS SECTION IS THE ONE HOME

Per KZ-005 (6 recurrences): a measured figure gets **one** home, every other site links here instead
of restating it, and the deriving command is recorded beside the number so the next reader can
re-derive rather than trust. A figure goes stale whenever the tree changes, so **fewer sites, not
better sweeps.**

| Figure | Value | Deriving command | Taken |
| --- | --- | --- | --- |
| Server suite | **358 suites · 2772 tests · 1 snapshot**, all passing | `npm test -- --silent` from `server/researchindicators` | after T-02, in the quiet window (no worker writing) |
| Client suite | **317 suites · 6905 tests**, all passing | `npm test -- --silent` from `client/research-indicators` | after T-09, in the quiet window, **`out-tsc` removed first** — see below |
| Client coverage | statements **98.25%** · branches **96.26%** · functions **97.99%** · lines **98.53%** | same run | floors are 40 / 20 / 45 / 30 (NFR-IUL-004) — held with wide margin |
| Client `tsc` baseline | **934** pre-existing `error TS` in `tsconfig.spec.json`, unrelated to this spec | `npx tsc -p tsconfig.spec.json 2>&1 \| grep -c "error TS"` | T-08; delta 0 across T-08 and T-09 |

Deltas since the baseline at the start of this spec: the server gained **1 suite / 18 tests** (T-02's
structural spec; T-01's spec was already inside the 357/2754 reading recorded at its attempt 1).

---

## ⚠️ The spec's own T-08 verification command corrupts T-12's

**This is a spec defect, not a worker error, and it was found by re-measuring rather than by reading.**

The first full client-suite run after T-09 reported **157 failed suites / 3971 failed tests**. None of
it was attributable to this spec. Mechanism, established rather than guessed:

| Step | Evidence |
| --- | --- |
| `client/research-indicators/tsconfig.spec.json` declares `"outDir": "./out-tsc/spec"` | line 5 of that file |
| T-08's **mandated** verify command is `npx tsc -p tsconfig.spec.json` — with **no `--noEmit`** | `tasks.md` → T-08, *Verify* |
| So it **emitted** a compiled `.js` twin of every spec into `out-tsc/spec/` | `out-tsc` created `Sep 9 10:11:11 2026`, exactly when the T-08 worker ran that command |
| `jest.config.ts`'s `testPathIgnorePatterns` covers `node_modules/`, `dist/` and one spec file — **not `out-tsc`** | `client/research-indicators/jest.config.ts` |
| Jest therefore discovered and ran the compiled twins outside the Angular preset | stack traces named `out-tsc/spec/app/.../result-exists.resolver.spec.js` |
| **The arithmetic closes it with no ambiguity** | `find src -name '*.spec.ts'` = **317**; `find out-tsc -name '*.spec.js'` = **318**; **317 + 318 = 635**, exactly the `Test Suites: … 635 total` jest reported |

`out-tsc` is gitignored (`client/research-indicators/.gitignore:6`), i.e. a regenerable machine-local
artifact. Removing it and re-running produced **317/317 suites, 6905/6905 tests, green** — the figure
recorded above.

**Why this is a spec defect.** T-08's verification command, executed exactly as written, leaves the
tree in a state that breaks **T-12**'s verification (*"Full client suite; coverage floors"*). One
task's gate silently disarms a later task's gate. The worker did precisely what it was told.

**Not fixed by the Leader, by rule.** Amending a task's verify line changes the approved spec, and an
advisory may neither become a task nor widen one. **Surfaced to the user for decision** at the T-09
gate. The candidate remedies, for when that decision is made: add `--noEmit` to T-08's (and any other)
`tsc` verify line, and/or add `out-tsc` to `jest.config.ts`'s `testPathIgnorePatterns`. The second is
a client-package fix outside this spec's scope entirely.

**Leader countermeasure in force until then:** every full client-suite measurement in this run is
preceded by `rm -rf out-tsc`, and that is stated wherever a client figure is cited.

This is the K-014 family seen from a new angle. K-014 says a filtered view of a command's output is
not the output. Here the *command itself* was sound and its output was accurate — **3971 tests really
did fail** — but it was measuring a tree that a previous mandated command had polluted. A confident
number about the wrong thing.

---

## Task Execution History

### T-01 — `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV` + Migration A (catalog seed)

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round) |
| Date | 2026-09-09 |
| Requirements | R-IUL-010 (all clauses), R-IUL-011 |
| Design | §3.1 (the C3 binding note), §11.1, §11.2 |
| Skills assigned | `nestjs-expert` |
| Effort | attempt 1 `medium` → attempt 2 `high` (rework rule) |

**Leader skill-selection note.** `tasks.md` T-01 cites *Design §3.1, DD-3*. DD-3 in `design.md` §10 is
*"Validate the target before `BEGIN`"* — that is T-06's decision, not T-01's. The binding text for
this task is §3.1's blockquoted C3 / R-IUL-010 note. The Implementer brief pointed at §3.1 and said
so; the `DD-3` citation in `tasks.md` is a mis-citation, not a missed requirement.

#### Attempt 1 — Reviewer FAIL

**Files changed**

- `server/researchindicators/src/domain/entities/link-result-roles/enum/link-result-roles.enum.ts` — added `INNOVATION_USE_LINKED_DEV = 5`
- `server/researchindicators/src/db/migrations/1789000000000-insertInnovationUseLinkedDevRole.ts` — Migration A (new)
- `server/researchindicators/src/db/migration-specs/1789000000000-insertInnovationUseLinkedDevRole.spec.ts` — structural spec (new)

**Implementer verification**

| Check | Command (from `server/researchindicators`) | Result |
| --- | --- | --- |
| Lint | `npx eslint <the three changed paths>` | no output (clean) |
| Server suite | `npm test -- --silent` | `Test Suites: 357 passed, 357 total` · `Tests: 2754 passed, 2754 total` · `Snapshots: 1 passed, 1 total` |
| Falsifier 1 (two-sided) | bare literal `5` swapped in for **both** interpolations → spec re-run | RED: `Test Suites: 1 failed, 1 total` · `Tests: 2 failed, 8 passed, 10 total`. Reverted, `diff` identical, green 10/10 |
| Falsifier 2 | `down()` body emptied to `{}` → spec re-run | RED: `Test Suites: 1 failed, 1 total` · `Tests: 4 failed, 6 passed, 10 total`. Reverted, `diff` identical, green 10/10; full suite re-run 357/357, 2754/2754 |

**Implementer's declared gap (KZ-017):** the structural spec asserts SQL *text* passed to a fake
`QueryRunner.query()` plus the migration's raw source. It never opens MySQL and never proves the row
lands in `link_result_roles` — that is D-1's property, owned by T-03.

**Reviewer verdict: `STATUS: FAIL`** — one issue.

> 1. **Discovered Issue:** The assertion guarding T-01's designated binding clause is file-wide, not
>    INSERT-scoped, so the exact defect the clause forbids passes green when it appears only in
>    `up()`. The test titled *"interpolates LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV **in the
>    INSERT**, never a bare literal 5"* has the body
>    `expect(src).toContain('${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}');`. That token also
>    occurs in `down()`'s DELETE. Walking all 10 tests against the defect *"`up()` uses a bare `5`,
>    `down()` keeps the interpolation"*: the import test passes, this test passes on `down()`'s
>    occurrence, the anchored DELETE regex passes, and every `up()`/`down()` SQL-text assertion passes
>    because the enum member evaluates to `5` and `\(\s*5\s*,` matches `(5, 'Innovation Use Linked
>    Dev')` either way. **Full suite green with the forbidden bare literal in the seed SQL.** The
>    DELETE side *is* precisely protected by a statement-anchored regex; the INSERT side — the only
>    SQL R-IUL-010 §Seed is about — has no equivalent. FALSIFIER 1 reddened only because both
>    interpolations were swapped simultaneously; the one-sided form is invisible.
>    **Violated Rule:** `tasks.md` → T-01 FALSIFIER (*"Replace the interpolation with a literal `5` →
>    the structural spec must go red"*) read against the same task's binding clause; `tasks.md` §3
>    preamble (*"A check nobody has seen fail is not evidence, however green it reports — K-004 /
>    KZ-014"*); `design.md` §3.1 C3 binding note; root `CLAUDE.md` §4.3 (KZ-001 family).
>    **Remediation:** anchor the INSERT assertion to its own statement, mirroring the DELETE test
>    already in the file, align the title with the body, then re-run the **one-sided** falsifier
>    (bare `5` in `up()` only) and confirm red before reverting.

**Reviewer checks that came back clean** (verified at the source, not from the diff):

| Check | Finding |
| --- | --- |
| INSERT column list vs. the real table | **Correct.** Read against `src/db/baseline/baseline.sql:2157-2167`. Every omitted column is nullable or defaulted; the only NOT-NULL-without-default columns (`link_result_role_id`, `name`) are both supplied. Baseline `AUTO_INCREMENT=5` confirms id 5 is the next free id and cannot collide. No `?`/`:word` placeholder trap |
| Migration ordering | **Correct with headroom.** `1789000000000 > 1788878752646`; nothing higher exists |
| Append-only | **Held.** No merged migration modified |
| `src/db/migration-specs/` convention | **Correct**, and jest collects it (`rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"`), while staying outside `orm.config.ts`'s migrations glob |
| Scope | **Clean.** Nothing from T-02, T-04, T-05, T-06, T-07 |

**`ADVISORY` (4R lens — recorded, never gating, and explicitly NOT converted into work):**

- **RISK / reachability:** the migration has never been executed; `eslint` + `npm test` are both
  static over a `.ts` file. This is *declared* by the spec (T-01's own "Cannot prove", B-1, §7's
  applied-by-user item), not missed. The Reviewer notes the gap closes without new work:
  `npm run migration:test:bootstrap` applies **all** migrations to the scratch schema, so
  **Migration A's first real execution is observed as a side effect of T-03**. Recorded here so the
  gap is discharged at T-03 rather than inherited silently.
- **RELIABILITY:** `expect(calls[0]).not.toMatch(/UPDATE|DELETE/i)` in the "is pure DML" test is
  unanchored and would also match inside a string literal — harmless today, a false-red trap if a
  future role name contains "update"/"deleted".
- **READABILITY:** two test titles over-claim. *"…and is restorative (undoes exactly what up() did)"*
  asserts only that a `WHERE link_result_role_id = 5` DELETE was issued; it never compares against
  `up()`'s captured statement, so "exactly" is not measured.
- **READABILITY (positive):** the file headers resolve — every cited anchor was verified, including
  `1730900555793-addedPolicyChangeDataModel.ts:40` as the FK claimed.

#### Attempt 2 — Reviewer PASS

Effort `high`. Brief carried the Reviewer report verbatim, the Attempt History (*the two-sided
falsifier is already recorded and is not sufficient evidence — do not re-run it as the answer*), and
an explicit instruction **not** to act on any advisory finding.

**Files changed:** `server/researchindicators/src/db/migration-specs/1789000000000-insertInnovationUseLinkedDevRole.spec.ts` — one assertion. The migration and the enum are byte-identical to attempt 1.

The file-wide substring check became a statement-anchored regex, mirroring the DELETE test already in the file:

```ts
// before (attempt 1) — satisfied by either the INSERT's or the DELETE's occurrence
expect(src).toContain('${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}');

// after (attempt 2) — bound to the INSERT statement's own text
expect(src).toMatch(
  /INSERT INTO link_result_roles \(link_result_role_id, name\) VALUES \(\$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}/,
);
```

The test's title was corrected to *"in the INSERT's own statement"* so it claims only what the body verifies.

**Verification**

| Check | Command (from `server/researchindicators`) | Result |
| --- | --- | --- |
| Task spec | `npx jest src/db/migration-specs/1789000000000-insertInnovationUseLinkedDevRole.spec.ts --silent` | `Test Suites: 1 passed, 1 total` · `Tests: 10 passed, 10 total` |
| **One-sided falsifier** — bare `5` in `up()` ONLY, `down()`'s interpolation left intact | spec re-run | **RED, `Tests: 1 failed, 9 passed, 10 total`.** The failure names the anchored INSERT test; `Expected pattern` is the new regex, `Received string` shows `VALUES (5, 'Innovation Use Linked Dev')`. Reverted from backup, `diff` identical, green 10/10 |
| Full server suite (after revert) | `npm test -- --silent` | `Test Suites: 357 passed, 357 total` · `Tests: 2754 passed, 2754 total` |
| Lint | `npx eslint <the spec path>` | no output (clean). `npx prettier --write` → `unchanged`; eslint re-run → clean |

**Reviewer verdict: `STATUS: PASS`**

> The attempt-2 edit closes the attempt-1 FAIL exactly and only — the INSERT assertion is now
> statement-anchored, mirroring the DELETE test already in the file, so the forbidden bare `5` in
> `up()` alone can no longer pass green, and the one-sided falsifier red (1 of 10, the anchored INSERT
> test) is the correct and complete discrimination signature.

**Why `1 failed / 9 passed` is the right signature, not a partial gate.** The Reviewer walked all ten
tests against the one-sided defect: exactly one *can* discriminate it. The `up()` behavioral tests
assert **emitted** SQL and are structurally blind to source form (the enum evaluates to `5` either
way), and the `down()` and import tests are correctly unaffected because `down()` and the import
genuinely still hold. **The other nine tests' silence is therefore not a gap** — this is the
distinction between a check that missed a defect and a check that is out of the defect's region.

**Evidence authenticity, checked rather than assumed.** The reported `Expected pattern` is
byte-identical to line 62 of the file, the `Received string` shows the injected literal, and the
reported `10 total` matches the Reviewer's own count of the file (3 source + 4 `up()` + 3 `down()`).
That output could only have come from this file.

**Residual blind spot, named and judged non-gating.** Inherent to raw-source assertion: a bare `5` in
`up()` **plus** a hand-written comment reproducing the full SQL string verbatim would pass. That needs
two coordinated edits; `tasks.md` T-01's FALSIFIER asks for the one-edit form, which is now closed.

**Reviewer's declared scope limits (KZ-017).** Its `grep` for `VALUES \(5|link_result_role_id = 5|role_id = 5`
covers `server/researchindicators/src` **only** and would not catch a no-space `VALUES(5` — both
settled by its direct read of the migration file. No `.bak`/`.orig`/`.tmp` residue anywhere under the
package, so the pre-edit backup was cleaned up.

**Attempt 1's five cleared checks were deliberately not re-derived**, and no new violation was found
elsewhere. The three attempt-1 advisories remain non-gating: none names a clause `tasks.md` T-01
binds, and the never-executed one is discharged at T-03.

**Finalize order held:** this entry was written **before** `tasks.md` T-01 was flipped to `[x]`.

---

### T-08 — Client contract interface ⟨Antigravity⟩

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 1** |
| Date | 2026-09-09 |
| Requirements | R-IUL-007 |
| Design | §4.1 |
| Skills assigned | `angular-developer` |
| Effort | `gemini-3.8-flash-high` (effort is baked into the Antigravity model slug) |
| Implementer attempts | 1 |
| Reviewer | `akili-reviewer` on `opus` — `author ≠ auditor` on both axes (author was a Gemini worker) |

**Files changed**

- `client/research-indicators/src/app/shared/interfaces/get-innovation-use-details.interface.ts` — `innovation_dev_result_id: number | null | undefined` and `linked_innovation_dev: { result_id; result_official_code; title; platform_code } | null | undefined`, each with an `@akili-spec` trace comment

**Worker verification** (collected from the terminal buffer — see the transport note above)

| Check | Result |
| --- | --- |
| `npx tsc -p tsconfig.spec.json` baseline, **taken before the edit** | **934** errors — pre-existing and unrelated (tail showed `src/app/testing/mock-services.mock.spec.ts` failures on `GET_Contracts`, `getSubmissionHistory`, `setStatus`, `setComment`, `submit`) |
| Same command after the edit | **934** errors → **DELTA 0** |
| Falsifier | scratch spec assigning `'invalid-string'` to `innovation_dev_result_id` → **935 errors (+1)**, verbatim: `src/app/shared/interfaces/__t08-falsifier.spec.ts(6,5): error TS2322: Type 'string' is not assignable to type 'number'.` → file deleted, `grep -c "error TS"` back to **934** |

**A baseline was mandatory here, not optional.** Root `CLAUDE.md` §4.3 records that this exact
command once reported 3 errors while hiding 945 behind a syntax-aborted parse. The brief therefore
required a pre-edit baseline and a delta, and required the falsifier file to be *syntactically valid*
so the error observed is a type error rather than a parse abort. Both held.

**Leader inline check (1 file, puntual — within the inline threshold).** The falsifier's error text
names `type 'number'` rather than the full union, which would be what a narrowed declaration
produced. Read the working tree: the declaration is `number | null | undefined`. TypeScript is naming
the nearest union constituent; the falsifier does discriminate (934 → 935 → 934).

**Worker's declared gap:** `tsc` proves the declarations compile without type regressions; it cannot
prove what the server actually sends or expects at runtime, runtime serialization/null-handling in
HTTP transport, or component rendering/interaction/validation (T-09/T-10/T-11).

#### Reviewer verdict: `STATUS: PASS`

> Both keys match `design.md` §4.1 exactly in name and nullability, `platform_code` is
> `string | null` per KZ-012, the widened-type reasoning genuinely mirrors `institution_id`'s
> `JSON.stringify` argument, the diff is confined to the one file, and the falsifier discriminates —
> a red TS2322 excludes `any`/`unknown` and additionally proves `tsconfig.spec.json` actually reaches
> this production file. `result_official_code: number` matches the server entity's own declaration
> and the MySQL-sourced side of the client's split convention.

**Findings the Reviewer established at the source** (each one answers a question the diff alone could not):

| Question | Finding |
| --- | --- |
| Contract fidelity | Exactly the four keys of `design.md:151`, no extras, no renames. The `\| undefined` arm is required because the class doubles as pre-load local state — `new GetInnovationUseDetails()` at `innovation-use-details.component.ts:144,369` |
| **`result_official_code: number` — the type I most wanted checked** | **Correct, and non-arbitrary.** The server entity itself declares `@Column('bigint', { nullable: false }) result_official_code!: number` (`result.entity.ts:76-83`). The client is *not* uniform — `number` in 9 interfaces, `string`/union in 5 — but the split is principled: the `string` shapes are the **OpenSearch/search-sourced** ones (the entity indexes the column as `@OpenSearchProperty({ type: 'keyword' })`), while the MySQL/TypeORM-sourced shapes use `number`. Design §5.2 routes this payload through `findAndDetails` (TypeORM/MySQL), so `number` is the correct side of the split |
| Widened-type reasoning | Mirrors, not gestures. It carries `institution_id`'s operative mechanism (`JSON.stringify` drops `undefined` → stale server value), and it is load-bearing here because R-IUL-008 makes omitted-vs-`null` two different server paths |
| `platform_code` (KZ-012) | `string \| null`, no non-null assertion, no forced prefix. The comment's claims verified: `result.entity.ts:178-183` is `@Column('varchar', { length: 50, nullable: true })`, a separate column from the `bigint` |
| Scope | Repo-wide grep for `linked_innovation_dev\|innovation_dev_result_id` outside `docs/` returns only the two new lines. `buildPayload` (`innovation-use-details.component.ts:488-507`) is still an explicit allow-list that does not mention them, so nothing leaks into the PATCH body yet. Falsifier scratch file confirmed gone |

**The falsifier proved MORE than the worker claimed — and this is the part worth keeping.**
`client/research-indicators/tsconfig.spec.json` is `files: ["src/setup-jest.ts"]` +
`include: ["src/**/*.spec.ts", "src/**/*.d.ts"]`. This **production** file is therefore type-checked
only *transitively, via a spec that imports it*. The falsifier spec imported it and errored, which
proves `tsc` actually loaded the declaration; after deletion it stays reachable through
`innovation-use-details.component.spec.ts:20`. Without that, **"delta 0" could have been a green over
a file the compiler never read** — the precise KZ-017 failure shape.

**And one thing it proved less of, closed by other means.** The falsifier exercised
`innovation_dev_result_id` only; `linked_innovation_dev`'s typing rests on the delta-0 total plus
direct reading of the declaration. For a declaration-only task that is direct observation of the
deliverable, so the gap is closed — but not *by the falsifier*, and the log says so rather than
letting the falsifier's authority spread to a key it never touched.

**Declared limits of this audit (KZ-017).** The Reviewer holds `Read`/`Grep`/`Glob` and no shell, so
its scope check is a content-reference check, **not a tree diff** — it cannot prove zero byte changes
in an unrelated file. The Leader's `git status --porcelain` covers that axis: the only client-side
modification in the tree is the one file. The per-file error delta was also taken on the *project
total* rather than a per-file normalized set, which a matching total cannot distinguish from "one
fixed + one introduced"; tolerable here because the change is purely additive to a file with no
attributable pre-existing errors, and corroborated structurally — every literal typed as this class
is built with `new GetInnovationUseDetails()`, so none can go under-propertied by two new fields.

**The unreported `npm test` removes no evidence.** T-08 did not require it, and per
`client/research-indicators/src/CLAUDE.md` a targeted client run exits `1` on green without
`--coverage=false` anyway.

**`ADVISORY` (recorded, never gating, and NOT converted into work):**

- **RELIABILITY — `title: string` is non-null, but `results.title` is `@Column('text', { nullable: true })`** (`result.entity.ts:94-97`), and R-IUL-002 admits **draft** Innovation Dev results into the picker. Same family as the `platform_code` nullability the spec *did* pin. **Reachability: the Reviewer could not construct one** — no DB access, and STAR's creation flow requires a title (`GET_ValidateTitle`, `api.service.ts:408`), so a `NULL` is possible-by-schema but unlikely in practice; worst case is T-09/T-10's label rendering `STAR 284 - null`. Per the advisory rule this may **not** become a task or widen one: enforcing it requires a new **R-IUL-007 clause**, which is the user's call. Surfaced to the user at the T-08 gate.
- **READABILITY:** both comments say "Widened from/to", but these are brand-new fields with no prior narrower declaration, so a future `git blame` for the pre-widening version finds nothing. Phrasing traces to T-08's own task text.
- **RISK:** `linked_innovation_dev` collides by name with an unrelated pre-existing `linked_innovation_dev: boolean` in `server/.../open-search/prms/dto/prms-response.dto.ts:216`. The name is frozen by §4.1 so it must not change; noted only because it makes future repo-wide greps on this key ambiguous across packages.

**Finalize order held:** this entry was written **before** `tasks.md` T-08 was flipped to `[x]`
(evidence-before-checkbox; the committed `PreToolUse` hook enforces it).

---

### T-02 — Migration B: rule 16 in `innovation_use_validation`

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round) |
| Date | 2026-09-09 |
| Requirements | R-IUL-009 (both scenarios + all clauses) |
| Design | §3.3, §11.3, §11.4, DD-5, DD-10 |
| Skills assigned | `nestjs-expert`, `systematic-debugging` |
| Effort | **`xhigh`** |
| Review mode | **Parallel lens reviewers** — mandated, not chosen: the command requires it when a task touches migrations, security, or data-loss surfaces |

**Leader routing notes.**

*Why `xhigh` and not `max`.* The effort dial puts correctness-critical work (migrations) at `max`, but
the tier rule forbids `max` on a cheaper tier — *escalate the tier instead*. Escalating the Implementer
to a T1/T3 model would collide with `author ≠ auditor`, because the Reviewer tier is already `opus`.
Resolution: keep the Implementer at T2 (`sonnet`) on `xhigh`, narrow the brief, and spend the
correctness budget on **two** reviewers instead of one.

*Lens split, deliberately asymmetric.* Lens A audits rule 16's SQL against design §3.3 (both
`is_active` filters, `EXISTS` vs `COUNT(*) = 1`, operator precedence, byte-identity, and that
`innovation_dev_validation` never appears in emitted SQL). Lens B audits the question that usually
goes unaudited — **would this gate go red if the code were wrong?** — plus the §11.4 recovery path.

*Two suspicions the Leader planted rather than accepting the evidence at face value:*
1. **FALSIFIER 1 mutates the assertion, not the code.** KZ-014 records *"a mutated assertion offered as a code mutation"* as a real failure in this repo. It may only demonstrate that two strings compare.
2. **FALSIFIER 2 reddened 18 of 18** via a cascading `beforeAll`. A gate that reddens wholesale cannot localize the next defect — and at T-01 the Leader used the red's *signature* (which tests failed, and why the others correctly did not) as the evidence. A cascade destroys that property.

**Files changed**

- `server/researchindicators/src/db/migrations/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.ts` (450 lines, new)
- `server/researchindicators/src/db/migration-specs/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.spec.ts` (323 lines, new)

Timestamp `1789100000000` > Migration A's `1789000000000` > the superseded `1787280000000`.

**Rule 16, as appended**

```sql
AND (
    EXISTS (
        SELECT 1 FROM link_results lr
        INNER JOIN results r2 ON r2.result_id = lr.other_result_id
        WHERE lr.result_id = result_code
        AND lr.link_result_role_id = ${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}
        AND lr.is_active = TRUE
        AND r2.is_active = TRUE
        AND r2.indicator_id = 2
    )
);
```

**Byte-identity of the copied body — verified by diff, not by eye** (a Done criterion of T-02):

| Comparison | Command | Result |
| --- | --- | --- |
| `down()`'s `CREATE FUNCTION` vs `1787280000000`'s `up()` `CREATE FUNCTION` | `diff <(sed -n '282,448p' <new>) <(sed -n '121,287p' <old>)` | **empty** — re-confirmed after reverting falsifier 2 |
| new `up()`'s pre-`RETURN` body (DECLAREs + both `SELECT … INTO` blocks + comments) vs the same region of the old `up()` | `diff <(sed -n '91,251p' <new>) <(sed -n '121,281p' <old>)` | **empty** |
| the `RETURN` statement | read comparison | the only textual difference is the semicolon moving from after `AND (tempMeasureViolations = 0)` to after the new conjunct — i.e. exactly one appended conjunct |

**Verification**

| Check | Command (from `server/researchindicators`) | Result |
| --- | --- | --- |
| Targeted spec | `npx jest src/db/migration-specs/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.spec.ts --silent` | `Test Suites: 1 passed, 1 total` · `Tests: 18 passed, 18 total` |
| Lint | `npx eslint <both new paths>` | clean, after one `npx prettier --write` on the spec for two quote-style issues. The fixer was **not** cited as the gate — bare eslint was re-run afterward (K-001) |
| Falsifier 1 — naming assertion's expected value pointed at `innovation_dev_validation` | spec re-run | RED, `Tests: 1 failed, 17 passed, 18 total`: `Expected: "innovation_dev_validation" Received: "innovation_use_validation"` at `spec.ts:135` → reverted, 18/18 |
| Falsifier 2 — `down()` emptied to a no-op | spec re-run | RED, `Tests: 18 failed, 18 total` (the `beforeAll` throws on `expect(newDownCreateStmt).toBeDefined()`, cascading) → reverted from backup, 18/18, `down()` diff re-confirmed empty |
| Full server suite | run by the **Leader** in the quiet window | see *Measured figures* above |

**Implementer's declared gap (KZ-001, stated in the spec file's own header as T-02 requires):** rule
16's runtime behavior is unproven — that an active role-5 link flips the check `TRUE`, and that a
deactivated row, an inactive target, or a non-indicator-2 target flips it `FALSE`; likewise whether
rules 2–15 still discriminate once rule 16 is appended. A mocked `QueryRunner` records SQL text and
never evaluates it: it cannot resolve operator precedence, execute the `EXISTS`, or run any `IF()`
branch. **T-03 is the only proof.**

**PIVOT SIGNAL: none.** The Leader's brief pre-flagged a possible spec/code mismatch — `design.md`
§3.3 and R-IUL-009 speak of *"rules 2–15"*, but the actual function has no numbered-rule structure
(only DECLAREs plus three violation-count `SELECT`s feeding one `RETURN`). The Implementer confirmed
the wording is **shorthand for "everything already in that function's RETURN"**, preserved the whole
pre-`RETURN` body untouched, and appended rule 16 as one conjunct. No deeper conflict between the
design's model and the code. Recorded because the brief asked for a stop-and-report rather than a
silent reconciliation, and the answer is now on file instead of being re-derived by the next reader.

**Leader inline check, so no reviewer round is spent on it.** `innovation_dev_validation` appears 1×
in the migration (a header comment at line 55 explaining the constraint) and 4× in the spec (header
prose, a `describe` title, and a comment for a **negative** assertion). **None sits in emitted SQL** —
a negative assertion legitimately contains the string. Both Reviewers were told this and asked to
confirm independently.

**Implementer's NOT DONE / ASSUMPTIONS:** the class/file name
`AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000` was its own choice (only the
timestamp constraint was specified — a trivial rename if wanted); did not run the full server suite
because a client worker was active (the Leader re-measured); **not applied to any database** — that
belongs to T-03 against the scratch schema and to the human applier per §11.1.

---

### T-09 — The picker: `RELATED INNOVATION DEVELOPMENT` section card ⟨Antigravity⟩

| Field | Value |
| --- | --- |
| Status | **in rework** — attempts 1 and 2 FAIL; **attempt 3 dispatched (FINAL — the ceiling is 3)** |
| Date | 2026-09-09 |
| Requirements | R-IUL-002, R-IUL-003, R-IUL-012, R-IUL-013 |
| Design | §6.1, §6.2, §6.5, §6.6, DD-11 |
| Skills assigned | `angular-developer`, `ui-ux-pro-max` |
| Effort | `gemini-3.8-flash-high` |

**Files changed** — 3 modified, none new, **no shared component touched**:
`innovation-use-details.component.{html,ts,spec.ts}` under
`client/research-indicators/src/app/pages/platform/pages/result/pages/innovation-use-details/`.

**Verification**

| Check | Result |
| --- | --- |
| `npx jest <the page spec> --silent --coverage=false` from `client/research-indicators` | `Test Suites: 1 passed, 1 total` · `Tests: 191 passed, 191 total` · 4.763 s |
| `npx tsc -p tsconfig.spec.json 2>&1 \| grep -c "error TS"` | **934** → DELTA **0** |
| Card placement, asserted on the **rendered DOM** | `fixture.debugElement.queryAll(By.css('.section-title'))` → `detailsIndex < relatedIndex < actorsIndex`; plus `detailsCard.contains(relatedCard) === false` and `relatedCard.parentElement === detailsCard.parentElement` — non-nested sibling, no grid |
| Falsifier 1 — dropped the `!loading()` guard | RED, **one** test: *"must NOT show the empty state while loading() is true"* — `expect(component.isInnovationDevDisabled()).toBe(false)` got `true` → reverted, 191/191 |
| Falsifier 2 — removed `[isRequired]="true"` | RED, **two** tests: the asterisk (`querySelector('.text-red-500')` → `null`) and the amber/required-message (`selectComp.isInvalid()` expected `true`, got `false`) → reverted, 191/191 |
| Full client suite | run by the **Leader** in the quiet window, `out-tsc` removed first — see *Measured figures* |

Both falsifier reds were **localized** (1 test and 2 tests), not cascades — the discrimination
signature is usable, unlike T-02's falsifier 2.

**Leader inline checks — done so no reviewer round is spent re-deriving them**

| Check | Finding |
| --- | --- |
| Scope | Only the 3 page files modified. **Nothing under `src/app/shared/components/custom-fields/select/`** — the shared-component ban (R-4 / KZ-002) holds |
| **R-IUL-013's *"nothing moved out of the details card"*** | The HTML diff shows **41 deleted lines**, which is alarming for exactly this clause. Checked: they are **prettier re-wrapping**. The required content is intact and still *inside* the details card — calculator link line 64, `app-innovation-use-level-stepper` line 71, the `use-level-definitions-link` / "Click here" link lines 79-80 — all before the new card's title at line 157 and *ACTORS* at line 192. Title order: 13 → **157** → 192 → 241 → 269 |
| Shell class string | byte-identical to its four siblings |
| `buildPayload` | **not** given the new key — correct, that is T-11's scope |

**Signals the Leader found and routed to the Reviewer for adjudication (no Leader verdict issued):**

1. **A hex literal in NEW code** — both `ng-template` blocks carry `class="text-[#4C5158]"`. NFR-IUL-003 bans hex literals in new code, and design §6.2's **C15 exemption does not cover this**: C15 exempts the *inherited* `#E69F00` inside the shared `SelectComponent`. This one is newly written.
2. **`text-red-500`** for the required asterisk — a Tailwind palette class, neither a hex literal nor an `.abc-*`/`.atc-*`/`.rs-*`/`.fs-*` utility nor a `var(--ac-*)`.
3. **`optionLabel="title"` alongside the templates** — a KZ-001-shaped risk: if `#item`/`#selectedItemTemplate` are not the template names `SelectComponent` actually projects, the templates silently do not render and the label falls back to the bare title with no code prefix, breaking R-IUL-004's *"the two never disagree"*. The specs assert the label **function**; that alone would not catch it.
4. **`[customFilterBy]` and `[signal]="body"`** — not specified anywhere in the design.
5. **Reformatting of unrelated code** — prettier re-wrapped `quantificationsView`'s ternary and `buildPayload`'s `quantifications` chain (including its T-11/DD-15 comment). Semantic identity to be confirmed, especially the DD-15 `typeof … === 'string'` narrowing.
6. **The label function's null-`title` behavior** — returns `"284 - "` with a trailing separator. Same family as the T-08 advisory; asked whether T-09's own clauses make it gating.

**Worker's declared gap:** jsdom evaluates no CSS box model and no contrast, so pixel spacing, font
rendering, responsive shifts and **dark theme** are structurally unprovable here — they belong to
**T-12's human visual check**. No live backend integration. **Worker's NOT DONE / ASSUMPTIONS: none.**

#### T-02 attempt 1 — both lens Reviewers FAIL

**The two lenses converged independently on the same Issue 1.** Two separate audits, fresh contexts,
same evidence, same line numbers. That convergence is the finding's strongest credential — it is not
one reviewer's reading.

##### Issue 1 (both lenses) — GATING: the enum-provenance assertion cannot fail, because a TSDoc comment satisfies it

`spec.ts:300-302` asserted **file-wide over the raw source**:

```ts
expect(src).toMatch(
  /lr\.link_result_role_id = \$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}/,
);
```

That exact substring occurs **twice** in the migration — and the Leader confirmed the count inline
(`grep -c` → **2**):

```
 36: * `lr.link_result_role_id = ${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}`   ← TSDoc comment
262:   AND lr.link_result_role_id = ${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}  ← the SQL
```

Mutate `:262` to a bare `5` and all 18 tests stay green: `:300-302` passes **on the comment**;
`:297-299` (import present) is untouched; `:249-253` (emitted SQL contains `5`) passes because the
generated SQL is byte-identical either way. **18/18 green on the precise defect the assertion names.**

The rule-16 test cannot close the gap either: it builds its pattern as
``new RegExp(`lr\\.link_result_role_id\\s*=\\s*${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}\\b`)``,
which compiles to `…=\s*5\b` and is satisfied identically by a hand-written `5`. **By construction it
asserts the value, never the provenance.**

**This is T-01's defect returning one file later — aggravated**, because there the satisfying text was
`down()`'s DELETE, and here it is a *comment*. The correctly-anchored fix already exists in this repo
one file over, at `1789000000000-insertInnovationUseLinkedDevRole.spec.ts:62`. The spec inherited the
sibling's shape but not T-01's fix.

**Violated:** `design.md` §9 Falsification table, row *Enum in SQL* (*"a bare `5` must fail it"*) —
it does not; `tasks.md` §3 preamble (K-004 / KZ-014); `.agents/reviewer.md` §5, because
`spec.ts:58-63`'s header **claims** the property rather than recording it as a gap.

**On the compensating gate, adjudicated.** Lens A noted that
`server/researchindicators/eslint.config.mjs:53` sets `@typescript-eslint/no-unused-vars: 'error'`,
and the enum has no other use in the migration — so a bare-`5` substitution would leave the import
unused and redden `npx eslint`. **Real, but not sufficient:** it is a *different* gate (lint, not the
structural spec design §9 names), and it is incidental — it would stop compensating silently the day
the enum gains another use in that file. What cannot stand is the spec's header asserting coverage it
does not have. Fixing the assertion is a one-line change, so that is the disposition rather than
recording a gap.

##### Issue 2 (Lens B) — GATING: `down()` is not paste-ready, and §11.4 step 3's artifact does not exist

**The central risk the Leader asked about is ABSENT, and that is worth recording as a positive
finding:** `down()`'s body is **interpolation-free** — grep-verified zero `${...}` across
`migrations/…:281-448`; the only two in the whole 450-line file are `:36` (TSDoc) and `:262` (inside
`up()`). A human pasting `down()`'s `CREATE FUNCTION` needs to resolve **no TypeScript value**. The
property design §11.4 most depends on holds.

Two mechanical obstacles remain:

| # | Obstacle | Consequence |
| --- | --- | --- |
| a | `:282` carries escaped backticks — ``CREATE FUNCTION \`innovation_use_validation\`(…)`` | MySQL rejects a backslash before a backtick outside a string literal → syntax error on the recovery's **first line** |
| b | The body has internal `;` inside `BEGIN…END` with **no `DELIMITER` wrapper** | TypeORM's driver ships the whole string as one statement so the *migration* runs fine, but the `mysql` client splits on `;` and aborts at `:285`'s `DECLARE commonFields BOOLEAN DEFAULT FALSE;` |

**Reachability: constructed, not assumed** (KZ-008) — copy `:282-448`, paste into `mysql -u… <db>`,
the first statement terminates at `:285`. Reasoned from the verbatim file text plus MySQL's documented
client behavior; **not executed** (the Reviewer has no shell).

This bites in the one moment §11.4 exists for: `up()`'s `DROP` has committed, the database has **no**
`innovation_use_validation`, every caller is erroring outright, and the applier's first two paste
attempts fail for reasons that look like the migration being broken.

**Violated:** `design.md` §11.4 Mitigation-and-recovery steps 2–3 (*"The runbook handed to the applier
must carry that `down()` body as copy-pasteable SQL, so recovery does not depend on having the repo
open"*), with `tasks.md` §5 **B-2** naming the owner: *"keep `down()`'s body as copy-pasteable
recovery SQL | Claude (T-02), user (apply)"*. T-02's Design row lists §11.4.

**Leader adjudication — both halves are in scope for T-02.** Lens B offered to let the runbook be
routed to T-13. Declined: T-13's approved scope does not include it, and routing it there would be
*widening an existing task to absorb a finding*, which is exactly what the advisory rule forbids.
Creating the runbook is **not new scope either** — §11.4 is listed in T-02's own Design row and B-2
names T-02 as owner, so it is an **unmet clause of an already-approved task**. Attempt 2 delivers the
comment note (2a) **and** `runbook.md` (2b).

**Byte-identity hazard flagged into the rework brief.** The comment to extend sits at
`migrations/…:276-280`, *before* `down()`'s `queryRunner.query(...)` and therefore **outside** the
copied `CREATE FUNCTION` body. Lens A separately found a **dangling pointer inside** the copied body
(`:101-103` says *"see this file's header comment for the exact source lines"*, but this file's header
carries no such range — the source migration's header did). **That must NOT be fixed**: correcting it
would break design §3.3 property 3. Both instructions went into the brief explicitly.

##### The falsifier verdicts — the Leader's two suspicions, resolved

| Suspicion | Verdict |
| --- | --- |
| FALSIFIER 1 mutated the **assertion**, not the code (KZ-014's *"a mutated assertion offered as a code mutation"*) — does it guard anything? | **The property IS genuinely guarded** — Lens B traced the code mutation: renaming `:87` (DROP) and/or `:91` (CREATE) makes the loop at `spec.ts:132-137` collect the wrong identifier and reddens **1 of 18** (up-only) or **2 of 18** (both), never a cascade. **But the substitution was not cosmetic: Lens B judged the assertion-mutation habit to be *causally why Issue 1 shipped.*** Design §9 mandated a *code* falsifier for the enum; it was never run, and running it would have surfaced the hole in under a minute. Sharper than the Leader's own framing, and recorded as such |
| FALSIFIER 2 reddened 18/18 via a cascading `beforeAll` — does that destroy the signature property? | **Yes.** Localized, an emptied `down()` should read `:184` red (length), `:194` red (byte-identity), and `:140` **vacuously green** (a `for` loop over an empty `newDownCalls`) — and that third fact is diagnostic and currently invisible. **Mitigating:** the `expect`-in-`beforeAll` pattern is inherited verbatim from `1787280000000-updateInnovationUseValidation.spec.ts:82-104`, i.e. pre-existing repo convention, not a T-02 invention. **Aggravating:** T-02 *widened* it with two new hook guards (`:103`, `:122`), so `down()` defects now cascade where in the sibling only `up()` defects did. **Advisory, not gating** — no document mandates localization |

##### What Lens B confirmed is solid (13 of 18 assertions discriminate)

Each is anchored to its own region and per-direction. Notably: the naming tests iterate **each
direction's own** recorded calls, so T-01's fix *is* correctly applied there; both `is_active` filters
own independent `toMatch`es (dropping either reddens exactly one test); `indicator_id = 2` is
`\b`-anchored so `= 20` would not satisfy it; `EXISTS`-vs-`COUNT(*) = 1` is guarded positively **and**
negatively.

**`spec.ts:194` is the strongest assertion in the file** — `expect(newDownCreateStmt).toBe(priorCreateStmt)`,
a live byte-exact comparison against the prior migration's executed `up()`. Lens B's point: the green
run **is** the byte-identity evidence, which makes the Implementer's two shell `diff` invocations
redundant to it. Worth knowing for future migration tasks — the assertion is cheaper and stronger than
the diff.

##### `ADVISORY` from both lenses — recorded, never gating, NOT converted into work

From Lens A:
- **Readability, and it must NOT be fixed:** the copied SQL comment at `:101-103` says *"copied verbatim from the createInnovationUseValidation migration (see this file's header comment for the exact source lines)"*, but this file's header gives no line range. It sits **inside** the byte-identity region, so correcting it would break design §3.3 property 3. Record only.
- **Consistency:** `r2.indicator_id = 2` is a bare literal while `IndicatorsEnum.INNOVATION_DEV = 2` exists. Conformant — design §3.3 writes the literal and C3 binds only `LinkResultRolesEnum`, and the surrounding body already uses bare role literals (`actor_role_id = 2`, `quantification_role_id = 3`, `actor_type_id = 5`). Noted so a future reader does not read the asymmetry with line 262 as an oversight.
- **Reliability, hazard checked and clear (reachability: could not construct one):** rule 16 makes the function read `link_results`, a table it never read before. MySQL forbids a stored function from *modifying* a table used by the invoking statement, so Lens A checked the call sites: `green-checks.repository.ts` invokes it as a **SELECT projection** and the function is `READS SQL DATA` with no writes; the link save path goes through `LinkResultsService.create`, which issues no function call. **No new hazard class.**

From Lens B:
- **Reliability:** `spec.ts:271-278` computes `newReturnBody.slice(newReturnBody.indexOf('EXISTS'))`. If `EXISTS` were absent, `indexOf` returns `-1` and `slice(-1)` yields the final character, so the negative assertion passes **vacuously** in the one state where it would matter. No false green in composite (`:239` reddens first).
- **Readability:** `spec.ts:229` is titled *"appends exactly one additional top-level AND conjunct"* but only asserts the text **starts with** `AND (`. Two appended conjuncts pass it.
- **Reliability:** `spec.ts:140` (`down()` naming) iterates `newDownCalls` and passes vacuously on an empty array.
- **Resilience:** the `expect`-in-`beforeAll` cascade (see the table above).

---

## 🔭 FORWARD POINTER — DISCHARGED at T-03 (kept as the record of what was carried, and of what turned out to be wrong)

> **A pointer filed is not a pointer carried.** The record creates the appearance of ownership without
> the mechanism of transfer; the brief carries it or nobody does. Re-read this section at the moment
> T-03's brief is composed.

**T-03 is load-bearing for a property `tasks.md` attributes to T-02.** T-02's second binding property
is *"every OR/AND term individually parenthesized"* (design §3.3 property 2, KZ-017). T-02's structural
spec can only reach the **outer** wrapping of the appended conjunct (`spec.ts:266-268`); it can never
reach the **inner** `AND` chain of rule 16's `EXISTS … WHERE`. Lens B verified this: an `AND` → `OR`
swap inside that `WHERE` (e.g. `lr.is_active = TRUE OR r2.is_active = TRUE`) passes **all 18**
assertions — every individual `toMatch` still matches, `startsWith` still holds, the parenthesization
regex still matches. This is correctly *inside* T-02's declared limit (a mocked `QueryRunner` cannot
evaluate SQL semantics), which is exactly why it becomes T-03's burden.

**And T-03's currently-specified case list would not catch it either.** The six cases in `tasks.md`
T-03 — no link → `FALSE`; valid link → `TRUE`; deactivated link row → `FALSE`; inactive target →
`FALSE`; non-indicator-2 target → `FALSE`; role-4 row only → `FALSE` — **each vary exactly one of the
five predicates**, and an `OR` swap between two of them still yields the expected verdict in every
one. **T-03 needs at least one case that varies TWO predicates at once** (e.g. a deactivated link row
whose target is *also* inactive, or an active link to an inactive non-indicator-2 target) so that an
`OR` in place of an `AND` produces a *different* answer than the spec expects.

Also carried to T-03:
- **Migration A's first real execution is observed here.** `npm run migration:test:bootstrap` applies **all** migrations to the disposable TEST scratch schema, so `1789000000000` (T-01) executes as a side effect. T-01's Reviewer routed its never-executed advisory here so the gap is discharged rather than inherited silently.
- **T-03's pre-migration RED run is mandatory before T-03 may be cited** (`tasks.md` T-03 FALSIFIER: *"run this spec against the pre-Migration-B function. Every rule-16 case must go red. A suite that is green before the migration exists is testing nothing."*).
- **The disqualifier:** if the scratch schema is not provably empty at start (table count 0 → migrated), the run is not evidence — report the state instead of the result.
- **`npm test` cannot reach T-03.** Its `rootDir` is `"src"`; T-03's fixture spec lives under `test/fixtures/` and is collected only by `npm run test:fixtures` (`test/jest-fixtures.json`, whose `testRegex` matches `*.fixture-spec.ts`). **No command cited as evidence for T-02 runs T-03's proof.**

#### T-09 attempt 1 — Reviewer FAIL

**The Reviewer confirmed one Leader signal with the piece the Leader lacked, and refuted another with
evidence.** Both outcomes are recorded, because a routed signal that turns out to be wrong is as much
a part of the audit trail as one that lands.

##### Issue 1 — GATING: two hex literals in new code

`innovation-use-details.component.html:177` and `:183` both carried `class="text-[#4C5158]"`.

The Leader flagged the literal; **the Reviewer supplied what made it decisive**: `#4c5158` is the
light value of the *existing* token `--ac-grey-800` (`client/research-indicators/src/styles/colors.scss:35`),
and **this same file already uses `text-[var(--ac-grey-800)]` at lines 8 and 79**. The literal was
copied from `innovation-details.component.html:391`, a pre-token-era file — *"exactly the propagation
the rule exists to stop."*

**Violated:** NFR-IUL-003 (*"No hex literals. Token utilities … or `var(--ac-*)` only"*); `design.md`
§6.3 row *"Styling | tokens only for new rules"*; `client/research-indicators/src/CLAUDE.md`
(*"No hex literals in component code"*). Design §6.2's **C15 exemption does not reach it** — C15
exempts the *inherited* `#E69F00` inside the shared `SelectComponent`, not markup written here.

##### Issue 2 — GATING: R-IUL-012's four states do not each own an assertion, and the error state is neither implemented nor declared

| State | Finding |
| --- | --- |
| **Error** | **Not implemented and not declared.** `get-innovation-dev-output.service.ts:22-30` exposes only `list` and `loading` — no error signal — and does `this.list.set(response?.data?.results ?? [])`, swallowing the failure. **A failed options request therefore renders identically to a legitimately empty list**: disabled control plus *"There are no reported Innovation Development outputs to link."* That is not *"the section's existing error surface"* (which is `loadFailed()`, driven by the section GET, not the options request) |
| **Loading (skeleton)** | Behaviour correct **by inheritance** (`select.component.html:14-15` renders `p-skeleton` on `currentResultIsLoading()`) but **no test exercises it**. The existing test at spec ~3786 covers the *options*-request `!loading()` guard — a different clause |
| **Populated** | **No rendered assertion anywhere.** `formatInnovationDevLabel` is only unit-tested as a pure function (spec 3818-3857); the label is asserted nowhere in the DOM |
| **Empty (tooltip half)** | Asserted only as `component.innoDevTooltip()`, a computed string; nothing asserts it reaches the `pTooltip` directive |

**And the worker reported `NOT DONE / ASSUMPTIONS: none`** — a claim of completeness over an uncovered
mandated clause. That is the part that makes this a FAIL rather than a gap.

**Violated:** R-IUL-012 (*"THEN the control renders the section's existing skeleton, not an empty
dropdown … AND when the options request fails the section's existing error surface is used"*);
`tasks.md` T-09's Requirements row (*"R-IUL-012 (all four states)"*) and Done criterion (*"Control
renders in all four states"*); and `tasks.md` §4's closure table, which routes all four states to
T-09 and declares **"No orphans"** while naming only two gaps (R-IUL-003 visual, NFR-IUL-003 dark
theme) — **the error state is not among them.**

##### The Leader's `optionLabel` suspicion — mechanism refuted, risk upheld

The Leader suspected a KZ-001-shaped hole: if `#item`/`#selectedItemTemplate` were not the names
`SelectComponent` projects, the templates would silently not render and the label would fall back to
`optionLabel="title"` — the bare title with no code prefix — breaking R-IUL-004's *"the two never
disagree"*.

**The names are correct** — `select.component.ts:60-61` declares `@ContentChild('item') itemTemplate`
and `@ContentChild('selectedItemTemplate') selectedItemTemplate`, projected at
`select.component.html:78-81` and `:65-68`. **But the risk stands, because nothing in the suite would
have caught it if they were wrong:** `optionLabel="title"` is a *silent* fallback, the label lives only
in a pure-function unit test, and **a renamed ref would have shipped bare titles with 191/191 green.**
Folded into Issue 2(c) with a mandatory rename falsifier.

##### `text-red-500` — Leader signal REFUTED, and the refutation is the useful part

The Leader asked whether the asterisk's `text-red-500` violates NFR-IUL-003. **It does not**, and the
reasoning matters: `select.component.html:6` renders the shared control's own required asterisk as
exactly `<span class="text-red-500">*</span>`, and the untouched line 15 of this same page does too.
R-IUL-003's *"the same amber token and message string … not a new one"* is the **more specific** rule,
and `var(--ac-red-1)` is `#cf0808` — a **different** red from the sibling asterisks. **Swapping it
would violate R-IUL-003 in order to satisfy a stricter reading of NFR-IUL-003.** Recorded as
pre-existing palette debt, not a T-09 defect, and explicitly fenced off in the rework brief.

##### Leader signals (d) and (e) — resolved clean, no action

- **`[signal]="body"` is mandatory** (`select.component.ts:39,106,167`) — without it the control neither hydrates from nor writes to the page body. §6.2's table omits it as obvious plumbing.
- **`[customFilterBy]` is justified**: `select.component.html:32` is `[filterBy]="this.customFilterBy || this.optionLabel"`, so without it `filterBy` would be `'title'` and typing `284` would match nothing while the visible label leads with the code. **Unspecified in §6.2 but a correctness addition** — recorded here so T-13 does not read it as drift.
- **The prettier re-wrapping is semantically identical**, verified at the source: `quantificationsView` keeps the DD-2 null contract (`0` still a value) and its comment; `buildPayload` keeps the **DD-15 narrowing verbatim at line 540**, its T-11 comment, both chains, and — correctly — §6.7's counter-precedent `?? undefined` at line 527 untouched. `innovation_dev_result_id` appears nowhere in the `.ts`, so T-11's key is properly absent. **Advisory noise, not a scope violation.**

##### `ADVISORY` — recorded, never gating, NOT converted into work, and explicitly fenced off in the rework brief

- **READABILITY:** `@if (innoDevSelect.isRequired)` decides the *parent's* markup by reading a child component instance's raw `@Input` through a forward template ref. It works (falsifier 2 proves the ref resolves), but DD-11 makes the field unconditionally required, so a plain `<span class="text-red-500">*</span>` would be simpler. Note it reads `isRequired`, not `isRequiredSignal()`, so it is **not signal-reactive** — harmless only because the value is a literal `true`.
- **RELIABILITY:** `[pTooltip]` sits on the `<app-select>` host while the element that goes disabled is the inner `p-select`. PrimeNG applies `pointer-events: none` to `.p-disabled`, so **whether the tooltip fires when hovering the disabled picker is not something jsdom can answer.** Reachable state: options list legitimately empty + editable status. → **Routed to T-12's visual checklist** as one added line, since that tooltip is R-IUL-012's entire empty-state affordance.
- **RISK (dark theme) — for T-12/T-13:** computed from `colors.scss`, **not measured** against the running app: `--ac-grey-800` is `#4c5158` light but `#c2c2c2` dark, while `--ac-white-1` (the card background) is `#e5e5e5` dark. That pair computes to **~1.41:1**. The exposure is **pre-existing and page-wide** (lines 8 and 79 already use this token on these cards, and the 2026-09-09 QA sign-off covered light theme only), so **Issue 1's fix does not introduce it** — but NFR-IUL-003 requires legibility in both themes and T-12's dark pass will meet it.
- **RELIABILITY:** `formatInnovationDevLabel` returns `"284 - "` for a null `title`. Reachability **could not be constructed** — the options list is `GET_Results({'indicator-codes':[2]})` and STAR's creation flow requires a title. Same verdict as T-08. T-09 owns no title-null clause → not gating. **Routed to T-10's review**, where the card is the primary display and a trailing separator would be user-visible.

##### Reviewer's declared limits (KZ-017)

No shell: it could not re-observe 191/191, the 934-error delta, or either falsifier. What it **did**
verify is that **every line number the worker cited points at the code it claims** — 3745 (asterisk,
scoped to the related title, so line 15's pre-existing asterisk cannot mask it), 3754 (`isInvalid()`,
in a test that *also* asserts the DOM at 3759-3761), 3794. Consistent with the report; not a re-run of
it. The `git status` scope claim is the **Leader's**, corroborated by the Reviewer only by content.
Coverage floors and full-suite state out of reach — the worker's `--coverage=false` makes its exit code
meaningful for pass/fail but says nothing about the four floors (that is T-12's).

**On FALSIFIER 1's placement:** the Reviewer rated it adequate — the property is asserted on
`component.isInnovationDevDisabled()` **and** on `selectDebug.componentInstance.disabled` (spec 3798,
3806), the delivered binding, one hop from the rendered `.p-disabled`. Weaker than DOM but not a spy.
**R-IUL-003's draft-save `BUT` IS covered** (spec 3777-3784: empty field → `PATCH_InnovationUseDetails`
called).

#### T-09 attempt 2 — dispatched, on an ESCALATED TIER

Attempt 1 ran on `gemini-3.8-flash-high`. The rework rule bumps effort one level, but **`high` is
already the ceiling of that slug** (Antigravity bakes effort into the model name and accepts only
`low|medium|high`). So the tier was escalated instead, per *"never max a cheaper tier — escalate the
tier"*: attempt 2 runs on **`gemini-3.1-pro-high`** in a fresh terminal.

**Attempt 2 touches a `providedIn: 'root'` shared service** (`GetInnoDevOutputService`) to add the
error signal R-IUL-012 requires. `requirements.md` **R-4** does not forbid this — it prescribes the
verification (*"if the shared component must change, the task requires a full client suite run"*),
which the Leader performs. The brief constrains the change to **additive only**: no existing signal,
behaviour, or shape may change, because `policy-change` consumes the same service. **Surfaced to the
user** at this gate, since a shared-service change is the kind of decision they would want visibility
on even under `pre-approved`.

**The brief also carries the `out-tsc` countermeasure**: any `tsc` invocation must use `--noEmit`, and
if anything is emitted the worker must `rm -rf out-tsc`. Attempt 1's pollution is what produced the
157 phantom failed suites recorded above.

The brief fences off all five advisories by name, and carries the mandatory **`#item` → `#itemX`
rename falsifier** — the one that proves the silent-fallback hole is actually closed rather than merely
described.

#### T-02 attempt 2 — Reviewer PASS

**Files changed:** the structural spec (assertions), the migration (two comments + the TSDoc header
rewritten in prose), and **a new artifact: `docs/specs/innovation-use/link-innovation-dev/runbook.md`**
(206 lines). The migration's **SQL and the copied `CREATE FUNCTION` body are byte-unchanged.**

##### Issue 1 closed — and closed at the root rather than worked around

```ts
// before — file-wide, satisfied by the TSDoc header quoting the substring
expect(src).toMatch(/lr\.link_result_role_id = \$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}/);

// after — anchored to the emitting region, plus the negative
const emitting = src.slice(src.indexOf('public async up('));
expect(emitting).toMatch(
  /AND lr\.link_result_role_id = \$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}\s*\n\s*AND lr\.is_active = TRUE/,
);
expect(emitting).not.toMatch(/link_result_role_id\s*=\s*5\b/);
```

**The Implementer also de-collided the TSDoc header**, rewriting it in prose so the comment can no
longer satisfy any source-text check. Substring occurrences went **2 → 1** (Leader-verified inline).
That is the stronger of the two remedies on offer: the anchor alone would have *avoided* the collision;
the rewrite *removes* it. And it is self-documenting about why — the header now states the prose form
is deliberate *"so this comment cannot itself satisfy a source-text check for the interpolation it
describes"*, which makes the de-collision survive the next maintainer.

**Reviewer's near-miss sweep**, each traced by hand against both regexes:

| Mutation | Verdict |
| --- | --- |
| `= 5` trailing space · `=5` no space · rule 16 commented out + bare `5` | correctly RED (both regexes) |
| `= 05` · `= 5.0` · `= '5'` · **wrong enum member** (`INNOVATION_DEV`) | correctly RED — the anchored positive is the real gate |
| reordered `WHERE` (`is_active` above the role line) | **false RED** — the only brittleness, and it is *brittle in the safe direction*: a maintainer who legitimately reorders gets a red they must think about, not a green they should not have. Dropping the anchor to fix it would reintroduce Issue 1 |

**One hole the Reviewer specifically hunted and found closed:** a file that interpolates the enum in a
*dead* template while hardcoding `5` in the live one. Three assertions make that unsatisfiable at once
— `spec.ts:251` asserts the **recorded SQL** contains `= 5`, the anchored positive pins the
interpolation to the live line's exact shape, and the negative forbids any bare `= 5` in the emitting
region.

Design §9's falsification row is now **literally** satisfied: emitted SQL contains the enum's value
(`:251`) **and** the file imports `LinkResultRolesEnum` (`:297`) **and** a bare `5` fails it (observed).

##### The falsifier signature — the Leader's routed concern, adjudicated and DOWNGRADED with a reason

The Leader routed a title/body mismatch: the provenance assertions were added **into** an existing
test titled *"imports LinkResultRolesEnum from the domain enum module"*, so the title now says less
than the body verifies. The Reviewer **derived the signature independently and upheld the fix**, then
made a distinction worth keeping:

> **Over-claiming asserts unproven coverage — that is a violation. Under-claiming hides proven
> coverage — that is a maintenance hazard.** The rules (`tasks.md` §3 preamble, design §9,
> `.agents/reviewer.md` §5, K-004/KZ-014) bind the **over**-claiming direction. Both prior findings
> (Lens A on `:229`, Lens B on T-01's *"is restorative"*) were over-claims. This one is the inverse,
> and the red **was** seen.

Mitigating further: the enclosing `describe` at `:287` reads *"source (raw file text) — the enum is
imported and interpolated, never a bare literal 5"*, which is accurate to all three assertions and
which Jest prints in the failure path even under `--silent`; and in-file comments at `:300-309` and
`:315-319` document why the assertions live there. **Verdict: `ADVISORY` (A-1), not gating.**

**And the `1 failed / 17 passed` signature is correct** — the Reviewer verified *why* the other 17
stayed green, rather than accepting the count. Only one of the 18 assertions reads raw source text.
`spec.ts:243-254`'s role check interpolates the enum **in JS** (`…\\s*=\\s*${…}\\b` → `= 5`) and
matches against the *recorded SQL*; a source mutation to a bare `5` emits **byte-identical SQL**, so
that test **must** stay green. Its silence is the correct outcome, not a gap.

##### Issue 2 closed — `runbook.md`

| Property | Finding |
| --- | --- |
| Faithfulness | Reviewer compared **all ~166 SQL lines** against migration lines 297–463. Identical modulo uniform de-indentation, unescaped backticks, the `DELIMITER` wrapper, and the one declared adaptation. Line count corroborates: 167 → 166, exactly one fewer, consistent with the 3-line comment collapsing to 2 |
| High-risk tokens re-checked | `ciul.level` (**not** `.id`), `ciul.id = riu.innovation_use_level_id`, `useLevel >= 6`, `quantification_number <> 0`, `actor_role_id = 2`, `institution_type_role_id = 2`, `quantification_role_id = 3`, `actor_type_id = 5`, `t.parent_code IS NULL` on the parent alias only, `LIMIT 1`, every `is_active` filter, and **the absence of rule 16 from the `RETURN`**. All match |
| The one adaptation | **Acceptable.** The runbook *cannot* be byte-identical (escaping and `DELIMITER` are mandatory divergences), and §11.4 step 3 requires *"copy-pasteable SQL"*, not byte-identity. Dropping a pointer to a header the reader does not have is the same class |
| `DELIMITER` form | Correct for the `mysql` CLI: `DELIMITER //` (no terminator), `END//`, `DELIMITER ;`. Leader-verified inline: 3 occurrences = **2 directives + 1 prose mention**. Backticks genuinely unescaped, and mid-line backticks cannot close the markdown fence, so paste works from raw *and* rendered |
| Usability under pressure | Trigger condition first, one contiguous paste block, then a 2-row expected-outcome table, then an explicit warning that rule 16 is absent and this is a stopgap. *"Decision first, payload second, aftermath third"* — correct structure for a document read during an incident |
| Honesty | The `After running it` table is framed as **Expected**, not measured — it does not claim to have been executed |

##### No regressions — verified structurally, not assumed

- **`spec.ts:194`'s byte-identity `toBe` is untouchable by attempt 2.** `down()`'s new comment is at migration lines 278–295 as TS `//` line comments; the template literal opens at line 296. **Nothing added is inside a template literal, so nothing added can reach `queryRunner.query()`** — the `toBe` compares recorded SQL text only. Same for the header rewrite (lines 4–81).
- **The copied body is unchanged and the dangling pointer is intact.** `up()` lines 103–105 and `down()` lines 307–309 both still read `-- createInnovationUseValidation migration (see this file's header comment for the exact source lines).` Lens A's CRITICAL warning respected — correcting it would have broken design §3.3 property 3.
- **The Issue-2a comment is in the right place:** lines 284–295, after the `DROP` query (274–276), before the `CREATE` (296), outside the copied body.
- `spec.ts:58-63`'s header claim was **left as written and is now honest** — attempt 1's defect was a claim outrunning its evidence; the evidence has caught up.
- `tasks.md` still showed T-02 as `[ ]` at review time, so the guardrail-hook invariant held.

##### Reviewer's declared limits (KZ-017)

- **It observed no gate.** `18/18`, the clean `npx eslint`, and the `1 failed / 17 passed` falsifier are the Implementer's reports. What it did instead was **trace the mutation through each of the 18 assertions and derive the same signature** — corroboration, not measurement. A read-only reviewer cannot close this; the Leader re-measures the full suite.
- **No SQL semantics** — rule 16's behavior is T-03's, and it cannot prove the runbook's SQL *parses*.
- **The runbook comparison was a careful read, not a diff.** A single-character divergence in a scanned region could escape it; the exact line-count match and token spot-checks are corroboration, not proof. **The cheapest real gate it names: running `down()` against the TEST scratch schema — which design §11.4 step 1 already requires, and which T-03 performs.** Carried to T-03's forward pointer.
- It did not open `1787280000000` (its chain is runbook ↔ `down()`; `down()` ↔ prior is covered by `spec.ts:194`, unexecuted).

##### `ADVISORY` — all seven recorded, none actioned, none converted into work

| # | Lens | Finding |
| --- | --- | --- |
| **A-1** | Readability | `spec.ts:288`'s title under-claims its body (see the adjudication above). Remedy for a future touch: split into `it('interpolates the enum into the emitted SQL, never a bare literal 5')` |
| **A-2** | Readability — *a letter-of-the-rule violation the Reviewer deliberately did not gate on* | `spec.ts:317` cites `migrations/…:264`, a line **inside this spec's own change surface**; `src/CLAUDE.md` §9 **FP-50** permits a line citation only for files outside it. Declined as a FAIL under `.agents/reviewer.md` §7 (proportionality — *a 2-line hygiene nit must not consume the last attempt*), and the accompanying prose keeps the instruction executable if the number rots |
| **A-3** | Reliability — **reachable** | `runbook.md`'s *Source of truth* says *"If the two ever disagree, the migration file wins — update this runbook to match it."* **They already disagree**, by the one deliberate comment adaptation. A maintainer following that literally would re-import the meaningless pointer. Sequence: any diff of the two files after a `down()` edit |
| **A-4** | Risk | The runbook never *states* its SQL has not been executed against MySQL. The Implementer declared it in the report — **but the report is not the artifact handed to the applier** |
| **A-5** | Resilience — **reachable** | The runbook carries only the `CREATE FUNCTION`, omitting `down()`'s preceding `DROP FUNCTION IF EXISTS`. Spec-conformant (§11.4 step 2 scopes the artifact to *"the `CREATE FUNCTION` body from `down()`"*), but a re-paste after a connection drop that occurred *after* the CREATE committed fails with `1304 ER_SP_ALREADY_EXISTS` — **at the worst possible moment.** Sequence: paste → client disconnects before printing OK → re-paste |
| **A-6** | Readability — *considered as FAIL, declined* | The migration's TSDoc header at lines 66–70 still asserts `down()`'s body *"is the copy-pasteable recovery SQL"* — the exact overstatement Issue 2 identified. Not failed because the gating requirement (§11.4 step 3) is met by a delivered artifact, the new `down()` comment 12 lines below states the correct thing and redirects to `runbook.md`, neither lens flagged this sentence at attempt 1, and the Leader's Issue 2 statement scoped the defect to the missing artifact plus the escaping |
| **A-7** | Risk | No **spec document** links `runbook.md`; the only pointer is inside the migration's `down()`. §11.4 step 3 says the runbook is *"handed to"* the applier, and the handing is human, so this is tolerable — but a reference makes it survivable if the hand-off is verbal |

> **A-3, A-4 and A-5 concern a document a human will paste into a production database during an
> incident, so they are SURFACED TO THE USER** rather than left buried in this log. They remain
> advisory: the Leader may not action them, because an advisory may neither become a task nor widen
> one. **A-7 is partly discharged by this very entry**, which links the runbook from `execution.md`.

---

## ⛔ Pivot Record (RESOLVED — user-approved 2026-09-09): discovered at T-03 — Migration B breaks two committed fixture files, and the spec's Done definition structurally cannot see it

**Status: RESOLVED — the user chose Option A on 2026-09-09.** (History below is left as written; the resolution is at the end of this section.) `pre-approved` mode covers routine progress; it never absorbs a
Pivot. No further task is dispatched against the affected surface until this is decided.

### The finding

T-03's Implementer, having bootstrapped the scratch schema and applied Migration B, ran the whole
`test/fixtures/innovation-use` directory and reported 17 failures in two **already-committed** sibling
files. **The Leader re-measured independently rather than escalating on a worker's claim:**

```
$ npx jest --config ./test/jest-fixtures.json test/fixtures/innovation-use --silent
FAIL test/fixtures/innovation-use/innovation-use-result-creation.fixture-spec.ts
FAIL test/fixtures/innovation-use/innovation-use-validation.fixture-spec.ts
Test Suites: 2 failed, 15 passed, 17 total
Tests:       17 failed, 110 passed, 127 total
```

| File | Failures | Shape |
| --- | --- | --- |
| `innovation-use-validation.fixture-spec.ts` | 15 (F17, F23, F26, F28, F32, F35, F38–F43) | every case whose base result has **no role-5 link** and previously returned `1` |
| `innovation-use-result-creation.fixture-spec.ts` | 2 | both assert the green check flips to `true` **without ever creating a link** |

### Why this is a spec-level gap and not a T-02 or T-03 defect

**The break itself is intended.** R-IUL-009 *Scenario: No grandfathering*, user ruling OQ-1, and DD-8
all mandate it: every pre-existing Innovation Use result goes green-check `FALSE` until linked, with
no created-before cut-off of any kind. T-02 implemented exactly that and its review passed. T-03's own
scope is complete and correct.

**What nobody contemplated is that the retroactive break also invalidates committed *test* files** that
encode the pre-rule-16 expectations as assertions. The spec reasons about production data throughout
(§11.5 *Blast radius* even tells the applier to count affected rows) and never about the fixtures.

**And the Done definition cannot detect it.** `tasks.md` §7 says *"Server suite green, 60% floor
held"*, verified by `npm test`. That command's jest config sets `rootDir: "src"`, and every fixture
lives under `test/fixtures/` matching `.fixture-spec.ts$` — collected **only** by
`npm run test:fixtures`. So:

> **The spec's own completion gate is structurally incapable of observing the breakage its own
> migration causes.** This is KZ-017 at the level of the spec rather than a task: *a check narrower
> than its claim returns a confident green.* `npm test` will report 358/358 green all the way to
> archive while the fixture suite stays red.

**Why it surfaced only now:** this is the **first `test:fixtures` run since Migration B landed**, and
the pipeline never runs it (nor applies migrations — K-015). Migration B was merged at T-02 with a
green `npm test`, exactly as the Done definition asked.

### What the Leader did and did not do

- **Did:** verify by independent re-measurement; confirm the failing files and counts; establish the mechanism (`rootDir` scope) rather than infer it.
- **Did NOT:** touch either sibling file. That is not T-03's scope, and repairing them is **new work** — an advisory may never become a task, and a task absent from the approved `tasks.md` is scope the user never approved.
- **Did NOT:** revert T-02. Its implementation is correct and reviewed; the defect is in what the spec asked for, not in what was built.

### Decision required from the user

| Option | What it means | Cost |
| --- | --- | --- |
| **A — Repair the two fixture files** | Update their expectations for rule 16: seed a valid role-5 link where the base result must stay green, and assert `FALSE` where the case is genuinely link-less. Needs a new approved task | Real work on 17 assertions; makes the fixture suite green again and keeps it a usable gate |
| **B — Accept as a known break, record it** | The fixture suite stays red at 17/127. **The repo's own kaizen lesson argues against this:** `jest-fixtures.json` records that *"a gate that fails 1 in 3 gets ignored"* — a permanently-red gate is worse than an absent one | Cheap now, and the two files stop protecting anything |
| **C — Amend the Done definition only** | Declare the fixture suite out of scope for §7 and state the break explicitly | Honest, but leaves the gate red under option B's objection |

**Independent of A/B/C, §7's Done definition needs amending**, because *"Server suite green"* verified
by `npm test` cannot mean what it appears to mean. Either it must name `npm run test:fixtures`
alongside `npm test`, or it must say explicitly that the fixture suite is not part of the gate — and
saying so would itself be a decision about R-IUL-009's coverage, since **T-03 (the only proof of rule
16) lives in that very suite.**

### Related item for the same decision

The spec's **T-08 verification command corrupts T-12's** (recorded in full above): `tasks.md` T-08
mandates `npx tsc -p tsconfig.spec.json`, which emits into `out-tsc/spec` because that is the
tsconfig's `outDir`, and `jest.config.ts` does not ignore `out-tsc` — producing 157 phantom failed
suites. Candidate remedy: `--noEmit` on the verify line, and/or `out-tsc` in
`testPathIgnorePatterns`. Same class of defect (a mandated command that disarms a later gate), same
kind of decision, so it belongs in the same conversation.

#### T-09 attempt 2 — Reviewer FAIL. Issue 1 closed; Issue 2's fix is INERT.

**Issue 1 is closed.** `text-[var(--ac-grey-800)]` at HTML `:177`/`:183`, matching the file's own `:8`
and `:79`. The Reviewer **widened the Leader's grep**: a sweep for `#[0-9a-fA-F]{3,8}` across the whole
`.html` *and* the whole `.ts` returns **zero** matches, so no `bg-[#`/`border-[#` form slipped in
either. Nothing else restyled.

##### The decisive finding — `GET_Results` cannot reject, so the error state exists only in the double

The Leader routed one question as the thing that would decide whether the fix was real or inert:
*does `ApiService.GET_Results` actually reject on failure, or does it swallow and resolve?* **It
swallows.** The Reviewer traced the whole chain at the source:

`client/research-indicators/src/app/shared/services/to-promise.service.ts:15-36`:
```ts
return firstValueFrom(
  subscription.pipe(
    map(data => ({ ...data, successfulRequest: true })),
    catchError(error => {
      console.error(error);
      return [{ ...error, successfulRequest: false, errorDetail: error?.error }];
    }),
```

`catchError` returns an **array**, which RxJS emits as a values-observable, so `firstValueFrom`
**resolves**. Every `ToPromiseService` HTTP failure resolves; **none rejects.** `api.service.ts:315-316`
then hands that object to `unwrapV2ResultsResponse` (`:379-406`), which guards every access and returns
`{ ...raw, data: { results: [], total: 0 } }` — **no throw on any branch.**

So on a real failed options request: `list.set([])`, the `catch` never runs, `error()` stays `false`,
`loading.set(false)` executes normally — **byte-identical rendering to a legitimately empty list.**
The user sees the disabled dropdown and *"There are no reported Innovation Development outputs to
link."* **That is precisely the defect Issue 2 was opened for, unchanged.**

**Spec 2a is green only because it calls `innoDevService.error.set(true)` on a mock** — a double
asserting behaviour its subject cannot produce. This is **KZ-001 (Critical, 13 recurrences) in its
purest form.** Falsifier 2 proved the template wiring from `error()` to the banner; it proved nothing
about `error()` ever becoming `true`.

**Violated:** `requirements.md:379` (R-IUL-012 — *"AND when the options request fails the section's
existing error surface is used"*); `tasks.md:314` (T-09 Requirements: R-IUL-012 **all four states**)
and `:343` (Done: *"Control renders in all four states"*); `client/research-indicators/src/CLAUDE.md`
→ HTTP: *"Always handle `MainResponse<T>`"*.

**The correct idiom already exists 200 lines above, in the very component being edited** —
`innovation-use-details.component.ts:392-398` does
`if (!response.successfulRequest) { … this._loadFailed.set(true); }`. `MainResponse<T>` declares
`successfulRequest: boolean` (`responses.interface.ts:1-9`), and `unwrapV2ResultsResponse`'s
`{ ...raw, data: … }` **preserves** `successfulRequest: false`, so envelope detection is viable at the
service.

##### The consequence the Reviewer found that the Leader did NOT ask about — `error` would be sticky

Worth recording because it is the difference between a fix and a worse regression. The moment envelope
detection lands, `error` becomes genuinely reachable — **and it never clears.**
`GetInnoDevOutputService` is `providedIn: 'root'`, so its constructor-driven `main()` runs **once per
session**; the only rerun path is `SelectComponent.loadData()` (`select.component.ts:137-145`), which
requires `app-select` to **mount** — but `loadFailed()` renders the `@if` error branch
(`innovation-use-details.component.html:5-10`) and the select never mounts. So the whole Innovation Use
section would sit on the error banner **until a hard browser reload**.

**Leader adjudication:** the retry/reset stays in **T-09**, not deferred to T-12 — the Reviewer offered
that as the one judgment call, and its own argument decides it: *without the reset, the fix converts a
silent-wrong-state bug into a stuck-section bug.* Shipping that would be worse than the defect.

##### What the Reviewer cleared, so attempt 3 does not touch it

| Check | Finding |
| --- | --- |
| Additive for the other consumer | `select.component.ts:147-157` (`bindServiceSignals`) reads only `list` and `loading`; `ServiceLocatorService` returns the instance unmodified; **nothing anywhere reads `error`**; no existing member changed name, type or behaviour. `policy-change.component.html:40` unaffected |
| The forbidden enabled-empty dropdown (R-IUL-012:380) | **Unreachable today — for the same reason the fix is inert.** KZ-008 reachability: the Reviewer tried to construct a rejecting input (HTTP 4xx/5xx, network failure, malformed payload) and **could not**; all are swallowed. The original `main()` had no try/catch, so a rejection skipped `loading.set(false)` identically — the rethrow preserves that, i.e. genuinely additive |
| 2b skeleton | Real: `select.component.html:14` gates `p-skeleton` vs `p-select` on `currentResultIsLoading()`; the test asserts skeleton present / `p-select` null **inside the RELATED card** |
| 2c populated | **Genuine, and it closes attempt 1's hole.** `'STAR 456 - Populated test'` is a string `optionLabel="title"` could not produce (it would yield only `Populated test`), and the `#item` → `#itemX` falsifier reddened it |
| 2d tooltip | Asserts the `Tooltip` directive's `content` input — the best jsdom can reach |
| 2a's DOM reach | **Satisfied** — banner span, card absence, and the legitimately-empty contrast case. *"The problem is upstream of the DOM."* |
| Scope | `innovation_dev_result_id` appears nowhere in the component `.ts`, so `buildPayload` is free of T-11's key; `select.component.{ts,html}` carry no T-09 marker and no `error` reference |

##### Falsifier 1 was not run, and the worker said so plainly — adjudicated as advisory

The worker's artifact states: *"I did not add a token-compliance assertion for Fix 1 because the
instructions did not request one for this fix. The substitution … was correctly applied, but no new
spec was added to assert it. Thus, there is no red output for this falsifier."*

**That honesty is exactly right and is credited.** The Reviewer confirmed the Leader's reading:
`tasks.md:339-340` names only the `!loading()` and `isRequired` falsifiers, NFR-IUL-003
(`requirements.md:425-428`) states a *condition* which is satisfied, and its **verification is T-12's**
(`tasks.md:431`, `ui-ux-pro-max`). The token assertion was the Leader's brief addition, not a task
requirement — so its absence is an advisory, not a gate. It does mean Issue 1's fix is currently
guarded by no test.

##### Recovering the report — the transport defect cost a full worker turn

Attempt 2's worker **never printed its structured report to the terminal.** It spent its remaining
turns retrying `orca orchestration send --type worker_done` (three identical submissions, all
rejected, because the dispatch capability is revoked on this transport). The Leader recovered the
evidence by the documented step-2 fallback — *check whether the worker wrote its output to a file* —
finding it at
`~/.gemini/antigravity-cli/brain/36c3f924-…/falsifier_proofs.md`.

**Attempt 3's brief now states the transport defect outright** and instructs the worker to print its
report as plain terminal text and not to waste turns on `orchestration send`. Cost of not saying so
earlier: one worker turn, and no suite total, coverage figure, or `tsc` delta was reported at all —
**treated as absence, never as green.**

##### `ADVISORY` — recorded, not actioned

- **Reliability:** the constructor calls `initialize()` → `main()` **un-awaited**, so the current `throw e` would surface as an unhandled promise rejection if it ever fired. `SelectComponent.loadData()` wraps its own call in `try/catch {}`, so only the constructor path is exposed. **Reachability: could not construct a reaching input.** Removing the rethrow as part of the fix resolves it.
- **Risk (blast radius):** routing a *control-list* failure into `loadFailed()` blanks the **entire** Innovation Use section, including a details GET that succeeded. This is what R-IUL-012:379 literally prescribes, so it is not a violation — recorded because a partial surface (error text inside the RELATED card only) would degrade better. **That is a design-level call for T-12 or the user, not the Implementer's**, and attempt 3's brief fences it off explicitly.
- **Readability:** spec 2a bundles four distinct claims into one `it`. Once re-pointed at the envelope, splitting the empty-state contrast into its own `it` would make a future red unambiguous.

##### Reviewer's declared limits (KZ-017)

It ran nothing: it did **not** verify the four new tests pass, the suite total, coverage against the
client floors, or the `tsc` delta — the quoted falsifier reds are **accepted as reported, not
observed.** It read working-tree files rather than the git diff, so its scope claims for
`select.component.*` and `docs/specs/` rest on the Leader's diff stat — **"a file read cannot observe
the absence of a change."** Its hex sweep covered the component `.html` and `.ts` only, not
`.spec.ts` and no `.scss`. Its *"cannot reject"* claim covers the HTTP failure path through
`ToPromiseService.TP`; it could not exclude a synchronous throw during interceptor setup, though RxJS
routes such throws through the same `catchError`.

#### T-09 attempt 3 — dispatched (FINAL)

Model held at **`gemini-3.1-pro-high`**: the rework rule bumps effort, but `agy models` offers only
`gemini-3.1-pro-{high,low}` for the pro tier, so `high` is already the ceiling, and the alternatives
are a downgrade (`gpt-oss-120b-medium`) or a Claude model that would collapse `author ≠ auditor`
against the `opus` Reviewer. Compensated the same way T-02's attempt 2 was: **a surgical brief**, since
the Reviewer supplied the exact remediation code and exact `file:line` references. This is no longer an
under-thinking problem.

**If attempt 3 fails review, the task HALTS:** `[~]`, automatic rollback of the working tree, full
attempt history presented to the user. The Reviewer explicitly judged the remaining work
*"mechanically closable — do not escalate"* (~6 lines in one shared service, plus a re-pointed fixture
and one retry assertion, with the correct pattern already in-repo and in the same file), so the last
attempt is being spent rather than pre-emptively escalated.

---

### T-03 — Real-MySQL fixture spec for rule 16

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 1** |
| Date | 2026-09-09 |
| Requirements | R-IUL-009 (both scenarios), D-1 |
| Design | §9 |
| Skills assigned | `nestjs-expert`, `tdd` |
| Effort | **`xhigh`** — this is the only proof of rule 16's behavior in the spec |
| Reviewer | `akili-reviewer` on `opus` |

**File:** `server/researchindicators/test/fixtures/innovation-use/innovation-use-linked-dev-validation.fixture-spec.ts` (new).

**Leader environment pre-check, run BEFORE dispatch** (per the command's environment-dependent
verification rule, and per `.agents/leader.md` → *Deferring a check (test the assumption first)*).
Rather than record "blocked on the stack", one bounded probe was spent falsifying the assumption:
`npx jest --config ./test/jest-fixtures.json test/fixtures/smoke.fixture-spec.ts` → **`ECONNREFUSED 127.0.0.1:3307`**.
A *probe-confirmed* blocker with a named cause, not a guess wearing a status. Docker itself was up
(29.7.2), so the Leader brought up the purpose-built scratch container — `docker-compose.test.yml`
documents it as *"a schema that can be freely created, dropped, and rebuilt"*, loopback-bound, with its
own root password and a written warning never to point it at `ARI_MYSQL_*`. **`ari_scratch_test` then
held 0 tables.** The bootstrap and the emptiness *proof* were deliberately left to the Implementer,
because the Disqualifier makes that proof part of the task's evidence, where the Reviewer can audit it.

**Verification — the ordering IS the evidence**

| Step | Command | Result |
| --- | --- | --- |
| Emptiness proof (the Disqualifier) | `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='ari_scratch_test'` | **`0`**, re-verified by the Implementer before bootstrapping |
| Bootstrap | `npm run migration:test:bootstrap` | succeeded; last applied `1789100000000-AppendInnovationDevLinkRuleToInnovationUseValidation`, confirmed from `migrations ORDER BY timestamp DESC` |
| **Migration A's role-5 row exists for real** | `SELECT link_result_role_id, name FROM link_result_roles WHERE link_result_role_id = 5` | `5 \| Innovation Use Linked Dev` — **discharges the gap T-01's Reviewer routed here**, since T-01's structural spec could only assert SQL text |
| **PRE-MIGRATION RED** | `npm run migration:test:revert` (removed exactly `…1789100000000`, confirmed from output), then the fixture | `Tests: 6 failed, 2 passed, 8 total` — R16-1, R16-3, R16-4, R16-5, R16-6, R16-8 all `Expected 0, Received 1` |
| POST-MIGRATION GREEN | `npm run migration:test:execute`, then the fixture | `Test Suites: 1 passed, 1 total` · `Tests: 8 passed, 8 total` |
| Full server suite | not re-measured, **by construction**: `npm test` has `rootDir: "src"` (`package.json:131`) and this file lives under `test/fixtures/`, so the suite total cannot change. The figure in *Measured figures* stands | — |

**🎁 A gap in ANOTHER task's evidence closed for free.** The pre-migration red requires
`migration:test:revert`, which **executes Migration B's `down()`** — the exact `CREATE FUNCTION` body
`runbook.md` carries as paste-ready recovery SQL. T-02's Reviewer had declared it could *not* prove
that SQL even parses (no shell, and the runbook had never been executed). Now measured:
`SHOW FUNCTION STATUS WHERE Db='ari_scratch_test' AND Name='innovation_use_validation'` returned the
row, and `SELECT innovation_use_validation(999999999)` returned `0` without error. **The runbook's SQL
parses and runs against real MySQL**, which also converts T-02's advisory **A-4** from an unverified
caveat into a measured fact. The Leader put this in T-03's brief on purpose; it cost nothing.

##### The Reviewer verified the monotonicity premise instead of accepting it

`tasks.md` demands *"Every rule-16 case must go red"*, and only 6 of 8 reddened. The Implementer's
reasoning was upheld — **but the Reviewer checked it against the migration's own delta** rather than
trusting the argument: Migration B's `up()` RETURN (lines 254–269) and `down()`'s (458–462) differ
**only** by the appended `AND (EXISTS …)` conjunct. Appending a conjunct is **monotone** — it can only
turn `TRUE` → `FALSE`. R16-2's base is the sibling F17 shape, which returns `1` under the old body, so
**a positive case can never redden against a strictly weaker predecessor.** The only way to make it red
is to invert its expectation, which is then wrong post-migration.

**And it named R16-7's REAL falsifier, which nobody had identified.** R16-7's seed is byte-for-byte the
committed rule-2 violation shape already proven red by sibling **F8**
(`innovation-use-validation.fixture-spec.ts:598-607`), so its `0` comes entirely from
`tempActorViolations`, which pre-exists. Its falsifier is therefore **not** "pre-migration" but a
**top-level `AND` → `OR` slip**: under `… AND (tempActorViolations = 0) … OR (EXISTS …)`, MySQL
precedence yields `FALSE OR TRUE = TRUE` → `1`, and R16-7 reddens. That is exactly what the file's own
comment claims, and the claim is accurate.

##### ⚠️ A defect in the TASK TEXT, surfaced by this review

`tasks.md` T-03 says *"Every rule-16 case must go red"* while its **own case list enumerates R16-2
("valid link → `TRUE`")**. Read literally, **that clause is unsatisfiable.** §3's preamble already
provides the correct handling — *"Where a check cannot fail for the property claimed, the task says so
instead of pretending"* — so the omission is a defect in the **task text**, not the implementation.
The clause's *intent* (*"A suite that is green before the migration exists is testing nothing"*) is
comfortably met: all five negative rule-16 discriminators plus R16-8 reddened. **Added to the user's
decision batch** alongside the other two spec-text defects; not silently patched.

##### Every case asserts what its title claims

The Reviewer walked each seed against the conjunct's five predicates. **No mis-seeded case** — the
KZ-001 failure in its most direct form, and it is absent: R16-3 deactivates the **link row**
(`link_results.is_active`), R16-4 the **target** (`results.is_active`), R16-5 varies **only**
`indicator_id` (3, active), R16-6 varies **only** the role (4). `result_innovation_use.is_active` is
omitted from the insert, which is safe — `baseline.sql` confirms `is_active tinyint NOT NULL DEFAULT '1'`,
so the `SELECT … INTO` filter is satisfied and the base is genuinely `TRUE`-able. **R16-2 is the
load-bearing control that stops all six `0`-expecting cases from passing vacuously**, and its base is
identical to theirs.

##### The `INSERT IGNORE` catalog seeding — precedent verified, cross-file effect ruled out

The claimed precedent is real and byte-identical in **two** siblings
(`innovation-use-result-creation.fixture-spec.ts:389,392` and
`innovation-use-level-boundary.fixture-spec.ts:247,250`); T-03 only adds indicator id 3.
`link_result_roles` id 4 is seeded with the same name the real migration uses, verified at
`1763587336968-insertExternalLinkColumn.ts:14` → `'Link Result Section'`. **Can it change a sibling's
outcome? No** — a grep of `test/fixtures` for `link_result_roles` matches **T-03's file only**, no
fixture reads `indicators`/`indicator_types`, and indicator 3 can only affect rows T-03 itself creates.
Band `902_400` and report year `2114` are unique across the directory (the Reviewer re-derived both
lists rather than trusting the file header's grep claim).

**Isolation is sound.** Every `it` seeds its own subject and target with a fresh
`result_official_code`, and rule 16 keys on `lr.result_id = result_code`, so no case can see another's
rows; ordering is irrelevant. `afterAll` deletes `link_results` in **both** FK directions before
`results` — necessary and correct given `FK_037db…(result_id)` and `FK_a3ebe…(other_result_id)`. No DDL
anywhere in the file.

##### R16-8's honesty — upheld, with the Leader's forward pointer corrected FURTHER

The file **does** record that R16-8 catches nothing uniquely, with the correct reason
(`OR(FALSE,FALSE) = FALSE = AND(FALSE,FALSE)`) and it names R16-4/R16-5 as the cases that do catch the
slip. **That is the substance, and keeping the case is the right call.** The Reviewer found three
understatements, and the third sharpens the correction to the Leader's own pointer:

1. The leading paragraph restates the Lens B rationale in the **assertive voice** — *"This case removes that escape"* — which is precisely the claim mutant 2 falsified. It should read as the *pointer's* claim, tested and not upheld in that shape.
2. **Mutant 1's redundancy is not recorded** — the file says that slip "IS caught by this row" without noting R16-3/4/5/6 caught it too, which is the fact that makes R16-8 non-unique.
3. *"the only case proving the two `r2` predicates are AND-combined"* reads stronger than the evidence: **R16-4 alone** discriminates `AND` from `OR` between them (target inactive + indicator 2 → `OR(FALSE,TRUE)=TRUE` → returns `1`, red). R16-8's true distinction is only that both fail on **one row**, which its author's own mutant 2 showed is non-discriminating.

**Recorded against the Leader, not the worker.** The forward pointer was carried from T-02's Lens B and
asked for a case on a rationale that empirical testing then contradicted — twice over, since the
Reviewer's point 3 goes further than the Implementer's own finding. **The pointer was still worth
carrying**: it is what caused the mutants to be run at all, and the mutants are now the strongest
evidence in this task. But its stated rationale was wrong, and this log says so rather than letting the
pointer's authority survive its own falsification.

##### `ADVISORY` — recorded, not actioned

- **READABILITY:** recast R16-8's comment per the three points above. The honest framing already exists in this directory — see F43's *"coverage-of-wording only, not a new behavioral discriminator"*.
- **READABILITY (KZ-017):** the `CANNOT PROVE` block is substantive but never states that **`npm test` can never collect this file** (`rootDir: "src"`, `package.json:131`) — only `npm run test:fixtures` does. Precedent for saying so: `report-oicr-number-rendering.fixture-spec.ts:94`.
- **READABILITY:** the file does not record *why* R16-2 and R16-7 cannot redden pre-migration (monotonicity; and R16-7's `0` coming from rule 2 per sibling F8). **That reasoning is the load-bearing part of T-03's falsifier and today lives only in the Implementer's report and in this log** — one sentence per case would make the file self-evidencing. Related: R-IUL-009 Scenario 2's no-grandfathering clause is gated by **T-02's** structural spec (`…1789100000000-…spec.ts:271`), not by this file, though T-03's header cites *"both scenarios"*. The Reviewer considered proposing a backdated-`created_at` case and **rejected it**: it would duplicate T-02's regex against the same shape and would still miss a temporal predicate worded on another column (e.g. `report_year_id`), escaping both gates. That residual hole needs someone to deliberately add such a clause in a future edit.
- **RELIABILITY:** `afterAll` has no per-step error isolation and no `finally` around `dataSource.destroy()` — one failing DELETE aborts teardown and leaks the connection. **Reachability: could not construct a reaching sequence today.** Two siblings use a `tryStep` wrapper; the *closest* sibling does exactly what T-03 does, so this is idiom-consistent, not a violation.
- **RISK:** T-03 becomes the second file to create-and-conditionally-delete `clarisa_actor_types` code 5. **Reachability: NOT reachable** under the committed `jest-fixtures.json` (`maxWorkers: 1`, serial file execution) — it becomes a race only if that serialization is reverted, which the repo records happening once already in the opposite direction. Consider a file-private actor-type code, since R16-7 needs only *some* type-5-shaped violation.

##### Reviewer's declared limits (KZ-017)

**No shell**, so it observed **none** of: the emptiness count, the bootstrap, the red run, the green
run, either live mutant, the `migrations` bookkeeping query, or the `SHOW CREATE FUNCTION` diff — those
are taken from the report. What it **corroborated by reading**: the monotonicity premise (the `up()`
vs `down()` RETURN delta), every seed→predicate mapping, `LinkResultRolesEnum` (4/5) and
`IndicatorsEnum` (2/3/6), the `INSERT IGNORE` precedents, band/year uniqueness, the `link_results` FK
topology, `is_active DEFAULT '1'`, and T-02's no-grandfathering assertion. It did not observe
`git status`, so **scope containment is argued from file content plus the Leader's diff stat.**

**It also independently corroborated the Pivot Record's mechanism by reading:** T-03 is the **only**
fixture file that writes `link_results` (grep: 1 file), while `innovation-use-validation.fixture-spec.ts`
asserts `innovation_use_validation(…) === 1` at F3/F17/F18/F20/F39/F43 with **no role-5 link** — so
post-Migration-B those assertions **must** fail by construction. *"It is a T-02/spec-level consequence
with **no owning task** in `tasks.md` §3, and T-03's file neither causes nor can prevent it."*

**Finalize order held:** this entry was written before `tasks.md` T-03 was flipped to `[x]`.

---

## ✅ Pivot resolution — Option A, user-approved 2026-09-09

The user was given A / B / C with a recommendation of **A**, and approved it. Recorded here with the
reasoning, because a decision without its argument is a decision that gets re-litigated.

**Why A, and why it is a correctness fix rather than bookkeeping.** A test for rule 2 needs a base
result that satisfies *every other rule*, so the rule under test is the only variable. Adding rule 16
invalidated those bases. Repairing them by seeding a valid role-5 link **restores each case's
isolation** — it makes the case measure what its title says again. That is what defeats the usual
objection to A ("you are making the tests agree with the break"): the tests were not testing the break,
they were testing rules 2–15, and rule 16 removed the precondition that made them valid.

**Why not B.** The repo's own harness argues against it: `jest-fixtures.json` records that *"a gate
that fails 1 in 3 gets ignored"*. This would be 17 of 127, permanently — and worse than usual for two
reasons. That suite is the **regression protection for rules 2–15**, and this spec just rewrote that
function; and **T-03, the only proof of rule 16, lives in it.** A suite nobody runs makes rule 16's
proof invisible.

**Why C was never an alternative.** It is the half of A and B that has to happen anyway: §7 had to be
amended regardless, because the gate could not see its own subject.

**Sizing, measured rather than estimated** (this is what moved A from "expensive" to "cheap"):

| Fact | Value |
| --- | --- |
| TRUE-expecting assertions in `innovation-use-validation.fixture-spec.ts` | **15** — matches its 15 failures 1:1 |
| Same in `innovation-use-result-creation.fixture-spec.ts` | **0** — its 2 failures use different phrasing, so they must be read individually |
| Either file writes `link_results`? | **0** and **0** — every base lacks a role-5 link *by construction* |
| Shared helpers all cases funnel through | `seedResult()` (`:148`), `seedDetail()` (`:160`) |

**So the 15 are one helper, not 15 edits.**

### What was amended (Pivot Protocol step 3)

`tasks.md` only. **No requirement and no design decision changed** — three of the four items are
verification *text* that could not do what it claimed, and the fourth is a consequence that no task
owned.

| # | Site | Correction |
| --- | --- | --- |
| 1 | T-08 **Verify** | `npx tsc -p tsconfig.spec.json` → **`--noEmit`**, with the measured mechanism recorded inline (157 phantom suites; 317 real + 318 twins = the 635 jest reported) |
| 2 | T-03 **FALSIFIER** | *"Every rule-16 case must go red"* → *"Every **negative** rule-16 case"*, with both exemptions **stated** rather than pretended, per §3's own preamble |
| 3 | §7 **Done definition** | *"Server suite green"* split into **unit** (`npm test`) and **fixture** (`npm run test:fixtures`), because `rootDir: "src"` made the original gate structurally blind to the suite holding T-03 |
| 4 | **New T-14** | Repair the two sibling fixture files, by restoring isolation — never by relaxing assertions |

Plus every derived site the amendment invalidated: the §2 dependency graph, §4's closure row for
R-IUL-009, §6's budget reconciliation, and the Document Control task count.

### Correction closure — the two-direction sweep, and what it caught

Run per the Pivot Protocol, KZ-005 (6 recurrences) and K-003. **It caught a real survivor**, which is
the whole reason the rule exists:

> **`tasks.md:169` — T-03's `Done` line restated the corrected claim in different words:**
> *"all rule-16 cases observed red pre-migration"*. The **FALSIFIER** was amended; the **Done** line
> said the same superseded thing in another phrasing and would have survived a literal-string sweep.
> Corrected, and the exemption reason carried with it.

This is exactly KZ-005's escalation: *bound the search on every axis — phrasing, token, file set,
exemption criterion — not only the axis that last failed.*

| Direction | Checked | Result |
| --- | --- | --- |
| **Forward** — does the superseded value survive? | `Every rule-16 case` / `every rule-16 case` / `all rule-16 cases` / `rule-16 cases must`; `13 tasks` / `All 13` / `**13**`; `Server suite green`; `tsconfig.spec.json` without `--noEmit` | One survivor (above), fixed. Re-grep after: **none** in the spec's live documents. Task count `13`: **none**. All live `tsc` invocations in this spec now carry `--noEmit` |
| **Backward** — who cites the corrected sections? | `§7`, `tasks.md … Done`, `T-03 … falsifier`, `T-08 … Verify` across the spec folder; plus `family.md`'s row #4 | No document asserts a now-false claim. `family.md:47` describes the lane split and says *"pending"* — **not** falsified by Amendment 02, and its update to `done` is already **T-13(c)**'s owned scope, not a sweep casualty |
| **New values re-grepped** (KZ-005's second half) | `--noEmit` (3), `**14**` (3 sites: Document Control, §6, §7), `T-14` (5), `npm run test:fixtures` (4) | Consistent at every site |

**One thing found and deliberately NOT fixed.** The same latent defect exists in a **different, active
spec**: `docs/specs/changes/innovation-use-required-fields/tasks.md:612` mandates
`tsc -p tsconfig.spec.json` with no `--noEmit`, so it will pollute `out-tsc` the same way. That is
outside this spec's scope and belongs to whoever owns that one — **surfaced to the user, not silently
edited.** Editing another spec's approved text under cover of this pivot is precisely the scope creep
the rules forbid.

### Budget tripwire — declared, not absorbed

Tasks: design §12 expected **12**; now **14** (`+2`). T-13 was the first (Judgment Day A11 found it
had no home); T-14 is the second. Both are recorded in §6 rather than quietly absorbed, so the tick is
not mistaken for a runaway. LOC and review rounds are already over the design's estimate — this spec
has run **7 review rounds across 5 tasks** against a budget of ~20 for 12 tasks, which is on pace, but
the *rework* rate (3 of 5 tasks needed a second attempt, one needed a third) is the figure worth
watching. The recurring cause is a single defect class, recorded in the Kaizen note below.

### The defect class this spec keeps producing — for the archive Kaizen

**Four times, in four files, by three different models**, an assertion claimed a property it could not
fail on:

| Task | The assertion claimed | What actually satisfied it |
| --- | --- | --- |
| T-01 | the **INSERT** interpolates the enum | the same token in `down()`'s DELETE |
| T-02 | the **SQL** interpolates the enum | a **TSDoc comment** quoting the substring |
| T-09 (attempt 1) | the label carries the code | nothing — the label was asserted nowhere in the DOM |
| T-09 (attempt 2) | the options request failing shows the error surface | a **mock calling `error.set(true)`**, for a subject that can never reject |

All four are **KZ-001** (*a property that lives in generated output must be asserted there*), whose
recurrence count in this repo was already **13**. This spec's four instances make the case that the
lesson has not been institutionalized where it needs to be — in the *authoring* step, not only in
review. The one durable fix observed here: T-02's Implementer did not merely anchor its regex, it
**rewrote the colliding comment in prose so the collision surface no longer exists.** Removing the
surface beats guarding it.
