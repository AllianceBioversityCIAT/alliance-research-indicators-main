# Execution — Changes / Innovation Use validation warning colour

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-validation-warning-color` |
| Spec id | `2026-09-innovation-use-validation-warning-color` |
| Module | client — `innovation-use-details` |
| Depth | **Lite** |
| Approval Mode | **gated** (from `proposal.md` §1) — the continue/pause gate stops for the user after every task |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Budget (`design.md` §8) | 3 tasks · ~40 LOC · 1 review round |
| Rework ceiling | 3 attempts per task |
| Leader model | `opus` (T1) |
| Implementer model | `sonnet` (T2, via `.claude/agents/akili-implementer.md`) |
| Reviewer model | `opus` (T3, via `.claude/agents/akili-reviewer.md`) — `author ≠ auditor` enforced by wrapper configuration |
| Execution started | 2026-09-02 |
| Last updated | 2026-09-02 |

### Task state at start

| Task | Title | Status at start |
| --- | --- | --- |
| T-01 | Define `--ac-warning-1` and register it in §7.1 | `todo` |
| T-02 | Swap the 8 client-side validation sites to the warning token | `todo` |
| T-03 | Realign assertions, extend the R3 WCAG harness, and verify visually | `todo` |

### Leader pre-flight (anchor validation, K-011)

Before dispatching T-01 the Leader verified every anchor the brief cites, so the worker was not
sent against a stale line reference:

| Anchor claimed by the spec | Verified state |
| --- | --- |
| `colors.scss:47` — `--ac-red-1` in `:root` | ✅ `  --ac-red-1: #cf0808;` |
| `colors.scss:~154` — `--ac-red-1` in the dark block | ✅ `  --ac-red-1: #ff4d4d;` (dark block opens at `:121`) |
| `--ac-warning-1` absent today | ✅ zero hits in `colors.scss` |
| `docs/ux-ui/design.md` §7.1 token table | ✅ heading at `:340`, `--ac-red-1` row at `:353`, header `\| Family \| Token range \| Use \|` |

Working tree was clean at execution start (`git status` — no modified files), so each attempt's
`git diff` is an exact record of that attempt's change set.

---

## 2. Task Execution History

<!-- Entries are appended below, one section per task. -->

### T-01 — Define `--ac-warning-1` and register it in §7.1

| Field | Value |
| --- | --- |
| **Final status** | **PASS** |
| Date | 2026-09-02 |
| Implementer attempts | **1** |
| Reviewer rounds | 1 (budget allows 1 — on budget) |
| Skills assigned | `ui-ux-pro-max` — as recommended by the task, no deviation |
| Effort assigned | `medium` |
| Requirements covered | `R-IUW-001` (AC.1–AC.4) |
| Design refs honoured | `§5.1`, `DD-1`, `DD-2`, `DD-5`, `DD-6` |

#### Attempt 1

**Files changed** (2 files, 3 insertions, 0 deletions):

| File | Change |
| --- | --- |
| `client/research-indicators/src/styles/colors.scss` | +1 line at `:48` (`:root`), +1 line at `:156` (`[data-theme='dark']`) |
| `docs/ux-ui/design.md` | +1 line at `:354` (§7.1 token table) |

**Implementer verification** — command and verbatim output:

```
$ grep -n 'ac-warning-1' client/research-indicators/src/styles/colors.scss docs/ux-ui/design.md
client/research-indicators/src/styles/colors.scss:48:  --ac-warning-1: #e69f00;
client/research-indicators/src/styles/colors.scss:156:  --ac-warning-1: #e69f00;
docs/ux-ui/design.md:354:| Warning | `--ac-warning-1` | Validation warnings, non-blocking field errors |
```

**Implementer `Not Done / Assumptions`:** *"None on the assigned scope. One judgment call: `colors.scss`
has no per-token trace comment convention anywhere in the file (only section-header comments like
`// Background and red`), so per the brief's own conditional instruction I did not add a
`// @akili-spec` comment there; skipped in the markdown doc as instructed."* — No outstanding scope.
The Reviewer independently confirmed the judgment call matches the file's comment idiom.

**Reviewer verdict: `STATUS: PASS`**

> T-01 defines `--ac-warning-1: #e69f00` at the correct insertion point inside both `:root` and
> `[data-theme='dark']` with identical values (`DD-5`), leaves the `$colors` Sass map untouched
> (`DD-6`), and registers the token in `docs/ux-ui/design.md` §7.1 in the same change with the exact
> wording and format the task prescribed (`DD-2`). AC.1–AC.5 all discharge; scope is clean with no
> template touched.

#### Per-AC closure

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC.1 | ✅ | `colors.scss:48` — `--ac-warning-1: #e69f00;`, inside `:root` (block spans `1–51`) |
| AC.2 | ✅ | `colors.scss:156` — same declaration, inside `[data-theme='dark']` (block spans `122–159`) |
| AC.3 / AC.4 | ✅ | Both hits are the byte-identical literal `#e69f00` — no lightening (`DD-5`) |
| AC.4 (doc) | ✅ | `docs/ux-ui/design.md:354`, between the `Red` (`:353`) and `White` (`:355`) rows, three columns, same shape as its neighbours |
| AC.5 | ✅ | `$colors` map (`colors.scss:83–117`) unchanged; still ends `'red-1': #cf0808` with no `warning-1` entry (`DD-6`) |

#### Decisions made

- **The ambiguous hunk header was resolved by reading, not inferring.** `git diff`'s second hunk header
  renders as `@@ … @@ $colors: (` because git's function-context heuristic reaches back to line 83. On its
  face that reads as an insertion *into the `$colors` Sass map*, which is exactly what `DD-6` forbids. The
  Reviewer read the whole file to establish the block boundaries (`:root` 1–51 · mixin 53–80 · `$colors`
  83–117 · `@include` 120 · `[data-theme='dark']` 122–159) and confirmed the `:156` insertion is in the
  dark block, not the map. Recorded because a diff-only audit would have had to guess here, and the
  plausible guess is the wrong one.
- **No `// @akili-spec` trace comment in `colors.scss`.** The file has no per-token comment convention —
  only section headers (`// Grey`, `// Background and red`). The brief made the comment conditional on
  fitting the existing idiom; it does not, so it was omitted. Applies to the doc row as well.
- **Skill/effort selection:** no deviation from the task's recommendation (`ui-ux-pro-max`), effort
  `medium` rather than `low` because `DD-5` (identical dark value) and `DD-6` (no map entry) are precise
  negative constraints that a mechanical pass tends to violate.

#### Issues encountered

None. First-attempt PASS, no rework.

#### `ADVISORY` findings (4R lens checklist — advisory only, never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| Readability | The `:root` section header at `colors.scss:45` reads `// Background and red` and now also covers `--ac-warning-1` (as it already, pre-existing, covers the two `--ac-pool-funding-*` tokens). Not worth an edit inside this spec's budget; a future change touching that block could restore accuracy. |
| Reliability | No gate ran over the changed stylesheet — the client guide exposes `npm run s-lint` for SCSS, and T-01's `Verification` field deliberately names only the grep. Risk is near-zero for two custom-property declarations inside existing blocks (no Sass syntax, no map, no mixin invocation); `T-02`'s `npm run lint -- --quiet` and `T-03`'s suite exercise the token in anger. Recorded so the absence is visible rather than assumed. |
| Risk | `AR-1`'s accepted light-mode contrast deviation (2.25:1 on `--ac-white-1`, 2.09:1 on `--ac-grey-100`) is **not reachable from this diff** — T-01 defines an unused variable and paints nothing. It becomes reachable **as of T-02**. |

#### ➡️ Forward pointer to a later task (Leader-owned; must be copied into that task's brief)

**→ `T-03`.** The Reviewer's risk lens asks the Leader to carry forward that `AR-1`'s contrast deviation
becomes *reachable* the moment T-02 points call sites at the token, so the `DD-9` R3 documented exception
must not be deferred past T-02. T-03 already owns this (AC.8), so no scope moves — but this pointer is to
be re-read and copied verbatim when T-03's Implementer brief is composed. A pointer filed here is not
carried by having been filed.

#### Final verification result

`grep -n 'ac-warning-1' client/research-indicators/src/styles/colors.scss docs/ux-ui/design.md` →
3 hits, exactly as required (2 in `colors.scss`, 1 in the §7.1 table). **What it cannot prove** (task's own
declaration, `KZ-001`): that any component uses the token, or that it renders. Presence only — by design at
this task; rendering is `T-03` AC.10's human check.

**Continue/pause gate:** `gated` mode — presented to the user, awaiting their decision before T-02.

---
