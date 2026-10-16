# Dispatch Brief — PR 3 (T-09, the last task)

**Role:** Implementer. **Host:** `agy` · **Model:** `gemini-3.7-flash-high` · **Auditor:** separate Claude Opus session.
**Working directory:** `/Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676`
**Branch:** `JuankCadavid/AC-1676` — do not branch, do not push.
**Package:** `client/research-indicators` — **this task is client-only.** Do not touch `server/`.

PR 1 and PR 2 are committed (7 commits). Both migrations are applied to Dev. The server already returns three `mapping_status` values and a per-item `mapping_status`; **nothing renders them yet.** That is this task.

**Read first:** `requirements.md` R-PSP-004 (both scenarios and every clause), `design.md` §6.1, `tasks.md` T-09, and `execution.md`. `dispatch-pr1.md` §3 (Hard rules) still binds, with the client substitutions in §4 below.

**Skills:** `angular-developer`, `ui-ux-pro-max`.

---

## 0. Ground truth — verified by the auditor, so you do not rediscover it

| Fact | Where |
| --- | --- |
| `PoolFundingMappingStatus = 'mapped' \| 'unmapped'` — needs `stale` | `shared/interfaces/bilateral/pool-funding-alignment.interface.ts:73` |
| `PoolFundingScienceProgram` has **no** `mapping_status` field — the server now sends one per item | same file, ~`:88` |
| The empty-state chain is `@if (isUnmapped()) … @else if (hasNoSciencePrograms()) … @else if (showSpPicker())`, each with a `data-testid` | `pool-funding-alignment.component.html:110-122` |
| Selected SPs render one `.pf-primary-row` each, via `@for (sp of formData().selected_sps; track sp.official_code)` | same file, `:193-195` |
| `.pf-stale-tag` already exists — `var(--ac-orange-1)`, no hex — and is reused verbatim by `STALE_SNAPSHOT_TAG` and `ORPHANED_TOC_TAG` | `.component.scss:39`, `.html:297,303` |

**A trap in that last row:** `formData().selected_sps` items are keyed by `official_code` and are **not** `PoolFundingScienceProgram` objects. The CLARISA status lives on the picker source, the `sciencePrograms()` signal. So the chip needs a lookup by code — do not add `mapping_status` to the form-data type.

---

## 1. The pattern, after five rounds

Every defect this cycle had one shape: **a check narrower than the claim it backed.** Yours and mine both. The last one: behavioural tests for a SQL-grouping bug that passed with the bug reintroduced, because a mocked query builder cannot represent operator precedence.

The client analogue is sharper, and §3 is about it.

**Binding reporting rules:** claim only what you ran · `not run — <reason>` is acceptable, `None` in place of a substitution is not · **Deviations includes substitutions**, including changing a verification command · do not tick `tasks.md` checkboxes · do not write `PASS`.

---

## 2. The work

1. **Widen the type.** `PoolFundingMappingStatus` gains `'stale'`. This is the enforcement mechanism (**D-PSP-5**), not a formality — let the compiler enumerate every consumer, and handle what it surfaces. Do not add a parallel boolean.
2. **Add `mapping_status?: string \| null`** to `PoolFundingScienceProgram` — matching what the server sends.
3. **`isStale()`** computed = `mappingStatus() === 'stale'`. `isUnmapped()` **stays** `=== 'unmapped'` and must not absorb it. `showSpPicker()` gains `&& !isStale()`.
4. **Three distinct messages**, each its own `@if` branch with its own `data-testid`, matching the existing markup shape (`role="status"`, `aria-live="polite"`, token classes).
5. **`Pending` qualifier** on each selected SP whose CLARISA status is not `Confirmed`, rendered in the `.pf-primary-row` block, reusing `.pf-stale-tag` **verbatim** — only the copy differs, exactly as `ORPHANED_TOC_TAG` did (D-C2-10). No new token, no new class, **no hex literals** (root guide §4.2).

### The copy — and a trap worth more than the rest of this brief

The stale message must **not** tell the user to register a mapping. The mapping exists; what is wrong is that this feed cannot resolve it. *Register* and *reconcile* are different asks, and the whole bug being fixed is that the UI conflated them.

**And the harder one.** R-PSP-004 requires the filtered-out message to *"remain accurate when the project genuinely has zero SP rows — that case needs its own wording."*

**The server cannot currently distinguish those two cases.** A project whose SP rows were all excluded by the status filter and a project with no SP rows at all both arrive as `mapping_status: 'mapped'` with `science_programs: []`. So **you cannot branch on it**, and a message claiming *"these were excluded by a filter"* would be **false** for the genuinely-empty project.

Do not add a server field — that is out of scope. Write copy that is **true in both cases**, and say in your report which reading you optimised for. If you think this needs a server field to be done properly, say so and stop; that is a finding, not a failure.

---

## 3. DC-9 — this task's gate cannot see what matters

`tasks.md` records DC-9 as having **no automated gate**, and it is the class this task produces most.

A jsdom assertion that a message **constant is referenced** proves the constant is referenced. It does not prove the state is reachable, that the branch renders, that the text is legible, or that the chip is visible against its background. `axe` cannot judge contrast over rendered output either.

So:

- **Assert the rendered text and the `data-testid`**, not the constant. `expect(el.textContent).toContain(...)` over a rendered fixture — not `expect(component.STALE_SP_MESSAGE).toBe(...)`, which is a tautology.
- **Assert the three messages are pairwise distinct**, and specifically that the stale text **≠** `UNMAPPED_SP_MESSAGE`. Collapsing `isStale` into `isUnmapped` must redden the suite.
- **Attach screenshots of all three empty states plus the `Pending` chip.** This is the substitute gate and it is **mandatory** — the task is not reportable without it.

### KZ-015 — arrange the transition, not the end state

Set `mappingStatus` **after** the first `detectChanges()`. Setting it before tests a state the component may never actually reach in the field. This lesson was earned in this repo, in this component's own spec file.

### Named red inputs (run each, paste each)

| # | Input | Must redden |
| --- | --- | --- |
| M1 | `mappingStatus` set to `'stale'` | `showSpPicker()` must be false; a test asserting it renders the picker fails |
| M2 | Make `isStale()` return the same as `isUnmapped()` | the pairwise-distinct message test |
| M3 | Force every SP's status to `'Confirmed'` | the `Pending` chip test |

If any stays green, the test is not evidence — say so rather than moving on.

---

## 4. Verification — client commands, not server ones

```
cd client/research-indicators
npm test -- --silent
npm run lint -- --quiet          # ng lint; the server's npx-eslint rule does not apply here
```

Coverage floors (root guide §4.2): statements 40 · branches 20 · lines 45 · functions 30. Do not let this task drop them.

**Do not run the server suite.** Nothing in `server/` changes.

---

## 5. Reporting

Append one `execution.md` block in the established format, with **Deviations** and **What I could not verify**. Then report:

1. Task id and one-line outcome
2. Files changed
3. Each of M1–M3's red output, verbatim, **including the totals line**
4. Green results
5. **Screenshots of the three empty states and the chip** — without these the task is incomplete
6. Deviations and anything not run

Then stop.

If the copy trap in §2 turns out to need a server field, or the compiler surfaces a consumer the design did not anticipate: **stop and report.** This is the last task of the spec — a surfaced problem here is cheap, and a hidden one ships.
