# Execution Log — Innovation Dev card in the OICR selected-card style

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/innovation-use/dev-card-oicr-style` · Depth **Lite** |
| Budget (`design.md` §7) | **5 tasks · ~260 LOC · ~7 review rounds** |
| Approval Mode | **pre-approved (user, 2026-09-10)** — *"ejecuta todo a menos que salga un fatal fail ahi paras"* |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Started | 2026-09-10 |

### 1.1 How pre-approval is being applied — stated, not assumed

The user's mandate names **one** stopping condition. The command's default list names four (HALT, Pivot,
budget tripwire, `FATAL_FAIL`). Reconciled as follows, so the deviation is on the record rather than
improvised at the moment it matters:

| Event | Action |
| --- | --- |
| Routine continue/pause gate after a PASS | **Auto-pass**, logged per task |
| **`FATAL_FAIL`** | **Stop immediately**, as instructed |
| HALT (3 failed attempts) | Park the task `[~]` with its full attempt history and **continue with independent tasks** — honouring *"ejecuta todo"*. **The automatic `git restore .` + `git clean -fd` is NOT run**: it destroys work, and a destructive action is not something a run-through mandate covers. Reported at the end |
| Pivot (the spec itself is wrong) | Stop — a pivot means the approved plan is invalid, and continuing would build against a spec the user has not re-approved |
| Budget tripwire | Record and continue, report at the end. The budget is `Lite` and the figure to watch is **review rounds (~7)**, not LOC |

### 1.2 Lane

All five tasks are **client**. Per the user's standing ruling, client work is delegated to
**Antigravity** (`gemini-3.1-pro-high`, print mode) and reviewed here by `akili-reviewer` (Opus) —
`author ≠ auditor` across hosts.

**Sequential, not parallel.** T-03, T-04 and T-05 are logically independent once T-02 lands, but all
four write to the same component and the same spec file; `CLAUDE.md` §4.3 forbids concurrent tasks in
one package.

---

## 2. Task Execution History

### T-01 — Carry `result_status` and `year` into the card's object — `PASS` ✅ (1 attempt)

| Field | Value |
| --- | --- |
| Status | **PASS**, first attempt · gate **auto-approved (pre-approved mode)** |
| Date | 2026-09-10 |
| Lane | client — Antigravity (`gemini-3.1-pro-high`) → `akili-reviewer` (Opus) |
| Requirements | `R-OICR-001`, `R-OICR-002` |
| Files | interface **4/0** · component **3/1** · spec **23/0** — 30 LOC |

**The change:** `linked_innovation_dev` gains `result_status?: ResultStatus` and `year?: string`, both
optional, populated from the picker option inside `onInnovationDevSelected`'s synchronous rebuild.

**Falsifier observed red at the construction site.** Making `result_status` non-optional reddened
`ng build` with `TS2345` pointing at `component.ts:232` — `this.body.update(current => {` — i.e. the
compiler rejecting *that callback's return type*, which is the literal under test. The Reviewer
confirmed the object is built at `:236-244`, so the red landed on the construction site rather than
somewhere incidental.

**Gates:** suite **317 suites / 6952 tests** (+1, matching the one new test) · `npm run build` exit 0 ·
`tsc -p tsconfig.spec.json` **934** baseline / **0** in file.

**Disqualifier cleared.** The new test builds a picker option, installs it via
`jest.spyOn(innoDevService, 'list')`, then `await component.onInnovationDevSelected(1)` and asserts on
`component.body().linked_innovation_dev`. **It never assigns the signal** — the product path
(`list().find(o => o.result_id === resultId)`) is genuinely driven (`KZ-015`).

#### Two findings worth more than the verdict

1. **The `ResultStatus` import is right on *both* ends, so no silent divergence is possible.** Three interfaces share that name in this codebase and only `result-config.interface.ts`'s carries `config?: StatusConfig` — the colours `DD-2` needs. The Reviewer went further than asked and checked the **source** side too: `result/result.interface.ts:1` imports `ResultStatus` from **the same** `../result-config.interface`, so producer and consumer resolve to one declaration. There is no structural near-miss that would compile while shipping a `config`-less variant.
2. **T-09's merge preserves the two new keys.** It spreads `...current.linked_innovation_dev!`, so `result_status` and `year` **survive the async enrichment** rather than being dropped by it. Recorded because T-02 depends on it and nobody would re-derive it.

#### `ADVISORY` → **carried into T-02's brief as a forward pointer**

The test fixture's `result_status` is `{ id, name, description, is_active }` cast with **`as any`** — not
the imported `ResultStatus` shape (`result_status_id`, `config`, …). **It carries no `config`, so T-02
must NOT reuse this fixture**: it cannot exercise `DD-2`'s server-supplied colours. Also, its comment
*"Falsifier: this literal must compile exactly as is"* is inaccurate — `as any` means this literal's
compile-safety is **not** what was proved; the product build was.

**Constitution impact:** none.
