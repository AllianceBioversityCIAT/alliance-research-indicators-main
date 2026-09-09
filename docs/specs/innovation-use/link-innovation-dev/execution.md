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

## Task Execution History

### T-01 — `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV` + Migration A (catalog seed)

| Field | Value |
| --- | --- |
| Status | **in rework** — attempt 1 FAIL, attempt 2 dispatched |
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

#### Attempt 2 — dispatched

Effort `high`. Brief carries the Reviewer report verbatim, the Attempt History (*the two-sided
falsifier is already recorded and is not sufficient evidence — do not re-run it as the answer*), and
an explicit instruction **not** to act on any advisory finding.

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
