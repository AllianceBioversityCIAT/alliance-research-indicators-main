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

**Continue/pause gate:** `gated` mode — presented to the user; the user chose **"Continuar con T-02"**.

---

### T-02 — Swap the 8 client-side validation sites to the warning token

| Field | Value |
| --- | --- |
| **Final status** | **PASS** |
| Date | 2026-09-02 |
| Implementer attempts | **1** |
| Reviewer rounds | 1 |
| Skills assigned | `angular-developer`, `ui-ux-pro-max` — as recommended by the task, no deviation |
| Effort assigned | `medium` |
| Requirements covered | `R-IUW-002` (AC.1–AC.4), `NFR-IUW-001` |
| Design refs honoured | `§5.2`, `§5.3`, `DD-3`, `DD-4`, `DD-8` |

#### Leader pre-flight (anchor validation, K-011)

The spec writes the template paths with `…/` elisions that do **not** match the real tree. Resolved
before dispatch and passed to the worker explicitly:

```
client/research-indicators/src/app/pages/platform/pages/result/pages/innovation-use-details/
```

(not `.../results/.../result-detail/...`). All 15 `--ac-red-1` occurrences and both `text-red-500`
asterisks were grepped at their spec-claimed line numbers and every one matched, so the brief carried a
verified 8-change / 7-keep partition rather than the spec's line numbers on trust.

#### Attempt 1

**Files changed** (4 files, 8 insertions, 8 deletions — a pure one-for-one line replacement):

| File | Lines touched |
| --- | --- |
| `innovation-use-details.component.html` | `107`, `147` |
| `components/innovation-use-actor-item/…component.html` | `3`, `34`, `41`, `52` |
| `components/innovation-use-organization-item/…component.html` | `3` |
| `components/innovation-use-level-stepper/…component.html` | `4` |

**Implementer verification** — 6 checks, all run from `client/research-indicators/`:

| # | Check | Result |
| --- | --- | --- |
| 1 | `ac-warning-1` occurrences (`grep -o \| wc -l`) | **8** (details 2 · actor 4 · org 1 · stepper 1) ✅ |
| 2 | `ac-red-1` occurrences | **7** (details 5 · actor 1 · org 1 · stepper 0) ✅ |
| 3 | `text-red-500` occurrences | **2** (details 1 · actor 1) ✅ |
| 4 | Hex ban `grep -nE '#[0-9a-fA-F]{3,8}'` | no output, exit 1 ✅ |
| 5 | Token cross-check (`D-3`) | every referenced `--ac-*` present in `colors.scss` ✅ |
| 6 | `npm run lint -- --quiet` | `ng lint --quiet` → `All files pass linting.` ✅ |

**K-004 / KZ-014 — the gate was observed FAILING before it was cited.** Check 5 is the task's only
defence against `D-3`, the silent-typo class, and it was new, so the Implementer was required to break it
on purpose rather than assert it works:

- **RED:** `--ac-warning-1` temporarily renamed to `--ac-warning-l` (lowercase L) at
  `innovation-use-details.component.html:107`. The cross-check reported `MISSING --ac-warning-l`,
  `check_failed=1`.
- **Reverted** from a pre-mutation backup copy.
- **GREEN:** re-extraction `diff`ed IDENTICAL to the pre-mutation token set; cross-check re-ran with all
  names `FOUND`, `check_failed=0`.

The check demonstrably **discriminates** — it is evidence, not decoration. This matters more than usual
here: a misspelled CSS custom property throws no error, fails no build, and reddens no test. It silently
renders the inherited colour, so `D-3` is invisible to every other gate in the spec.

**Implementer `Not Done / Assumptions`:** *"None. All 8 sites changed as specified, all 7 stay-red sites
and 2 asterisks confirmed untouched, no formatter run, no `.spec.ts` touched, no commit made,
`tasks.md`/`execution.md` untouched."* — No outstanding scope.

**Reviewer verdict: `STATUS: PASS`**

> All 8 client-side validation sites now reference `var(--ac-warning-1)` with colour as the only delta;
> the 7 stay-red sites and 2 `text-red-500` asterisks are intact, including the `DD-8` trap at
> `details:114`; every referenced `--ac-*` resolves in `colors.scss` in both theme blocks, no hex literal
> was introduced, and no `.spec.ts` was touched.

The Reviewer audited **at the source, not from the diff** — deliberately, because the critical half of
T-02 is what must *not* have changed, and a diff cannot show an absence. It read all four templates in
full, matched every occurrence to its line, and ran its own independent count.

#### Per-AC closure

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC.1 | ✅ | 8 occurrences of `ac-warning-1`, confirmed twice (Implementer `grep -o`, Reviewer's own regex sweep) |
| AC.2 | ✅ | Each of the 8 lines keeps its `material-symbols-rounded !text-[14px]` `warning` icon, its `fs-[14]` span, its spacing classes, **and its class order** — the token sits in the same final position on every line |
| AC.3 | ✅ | `actor:34` retains `border-2 rounded-md` and the `actorTypeMissing \|\| duplicateType` ternary; `actor:52` retains `border-2` and the `otherNameMissing` ternary |
| AC.4 | ✅ | Zero hex literals in the 4 templates — and none pre-existed either (Reviewer) |
| AC.5 | ✅ | All 10 live `--ac-*` references resolve in `colors.scss`, in **both** theme blocks; falsified per K-004 above |

#### Decisions made

- **`DD-8`'s trap held, and it was checked on the code rather than on the spec's account of the code.**
  `details:114` is still `text-[var(--ac-red-1)]`, inside `@if (justificationError())`, immediately below
  the `:107` block that correctly went amber. The Reviewer went further and re-derived `DD-8` from source:
  `justificationError()` (`:283`) and `unaddressedSaveErrors()` (`:296`) are complementary filters over the
  one `saveErrors()` array set at `:599`, and all three of their render sites (`:114`, `:247`, `:249`)
  remain red. **The "one server error array rendered in two colours" state that `DD-8` exists to prevent
  is therefore unreachable in this tree** — the decision is now verified, not just argued.
- **The `org:3` / `actor:41` classification was confirmed against the code, not their wording.** Neither
  message reads like a "required field" message (*"This row does not identify an organization yet"*,
  *"This actor type has already been reported on another row"*), so their amber classification rests
  entirely on `R-IUW-002`'s source-based discriminator. Both check out as genuinely client-side:
  `showNotIdentifiedMessage` is `this.touched() && !this.identitySatisfied`
  (`innovation-use-organization-item.component.ts:186`), reading only the row's own `body()`;
  `duplicateType` is an `@Input()` (`innovation-use-actor-item.component.ts:37`) fed by
  `duplicateActorTypeIndexes()` (`innovation-use-details.component.ts:250`), a pure computed over
  `body().actors`. Neither component references `saveErrors()` at all.
- **A minor correction to the Implementer's evidence, caught by the Reviewer.** The Implementer reported
  11 distinct `--ac-*` names referenced in the templates; the live count is **10**. The 11th,
  `--ac-grey-600`, occurs only inside the `DD-17` comment at `details:19`, not as a real reference. It
  exists in `colors.scss` anyway (`:33`, `:148`), so no AC is affected — recorded because an
  over-inclusive extraction is the *safe* direction for a cross-check and the count should not silently
  enter the record wrong (`KZ-007`: a correction record is a high-risk artifact; this one is verified).
- **Skill/effort selection:** no deviation from the task's recommendation. Effort `medium` rather than
  `low` despite the task's `S` sizing, because the two interpolated class strings (`DD-4`) and the
  adjacent-line trap (`DD-8`) are precision work, not mechanical substitution.

#### Issues encountered

None in the work. One in the **orchestration**, recorded because it nearly contaminated the audit: the
Leader mistyped the final hunk's removed line as `--ac-warning-1` (instead of `--ac-red-1`) when
transcribing the diff into the Reviewer's brief. The error was caught and corrected inside the same
brief, with the correct line quoted and an explicit instruction to verify at the source rather than trust
either version of the paste. The Reviewer did so and named the residual limit in its own scope
declaration (see below). No verdict rested on the bad paste.

#### `ADVISORY` findings (4R lens checklist)

**None filed.** The Reviewer swept all four lenses and reported nothing rising to a fileable advisory:
the change is a one-for-one token substitution with no new branch, no new state, and no error path.

#### Scope declarations — what these checks structurally CANNOT reach (`KZ-017`)

Recorded because a check narrower than its claim returns a confident green:

| Region | Why it is unreachable here | Who owns it |
| --- | --- | --- |
| **The rendered pixel** (`D-6`) | grep and lint are presence assertions over markup text. jsdom paints nothing, and the Tailwind arbitrary values (`text-[var(--ac-warning-1)]`) are generated by a runtime browser CDN JIT invisible to all static tooling | `T-03` AC.10 (human) |
| **Behavioral regression** (`D-5`) | Neither agent ran the Jest suite — a deliberate scope boundary, since `T-03` must derive its realignment list from the failing run (`K-018`). **There is no evidence either way on `D-5` in this task** | `T-03` AC.11 |
| Template compilation | `npm run lint -- --quiet` applies static `.ts`/`.html` rules; it does not compile templates and does not type-check `.spec.ts` | `T-03` |
| `grep -c` line-vs-occurrence gap | `grep -c` counts lines, so a line with two hits would count once. Cross-verified with `grep -o \| wc -l`; both agreed (8/8, 7/7, 2/2), so no line carries two hits of the same pattern | closed |
| The 8 sites' **pre-edit** values | The Reviewer verified the end state, not each line's prior value (it runs no commands). Conformance is a property of the end state, and `--stat`'s 8 insertions / 8 deletions is consistent with it | closed |
| Scope-cleanliness of `.spec.ts` | Rests on `--stat` (4 files, all `.html`) plus mtime ordering showing all four `.spec.ts` older than all four templates. **mtime ordering is corroborating, not proof** | closed |

#### ⚠️ Merge condition raised by the Reviewer (Leader-escalated to the user)

> *"As of this diff the page ships text at 2.09:1 / 2.25:1 against PRD **C-4**, and the one instrument
> built to catch that (`innovation-use-details.component.spec.ts:2284`) is silent about the new role — the
> precise failure mode R3 was created to remediate. If T-02 ever lands on `dev` without T-03, the
> deviation is live *and* undetectable, which is a materially worse state than the pre-spec red. I would
> treat 'T-02 and T-03 merge together' as a hard condition rather than a preference, and I would not
> accept a `[x]` on T-02's done-check as licence to open a PR on its own."*

The Reviewer confirmed `AR-1` is genuinely tracked in three live places (`tasks.md` T-03 AC.8 unchecked ·
`RB-1` status `open` · the §6 done-definition line for the follow-up design-system ticket), so the
tracking is real rather than a comment. **This is not an advisory and not a new task** — it adds no scope.
It is a constraint on *when this branch may merge*, and it is logged as `RB-4` in `tasks.md` §5 and
surfaced to the user at this task's gate.

#### ➡️ Forward pointers to `T-03` (Leader-owned; MUST be copied verbatim into T-03's brief)

1. **From T-01's Reviewer:** `AR-1`'s contrast deviation is now *reachable on screen* — the `DD-9` R3
   documented exception must not be deferred past this point. T-03 AC.8 owns it.
2. **From T-02's Reviewer:** the merge condition above — T-03 is what makes T-02 safe to ship, so T-03
   cannot be deprioritised or split off.
3. **From T-02's execution:** the suite was **not** run in T-02, so `D-5` is entirely open and T-03's run
   is the first evidence on it. T-03 must derive its broken-assertion list from that failing run and record
   the run's count (`K-018`, AC.1) — the pre-flight grep's single prediction
   (`innovation-use-actor-item.component.spec.ts:264`) is a hypothesis to falsify, not the list.

#### Final verification result

6/6 checks pass, with the `D-3` cross-check proven able to fail. `npm run lint -- --quiet` clean.
**What this cannot prove** (task's own declaration): that the rendered pixel is amber — every check here is
a presence assertion over markup (`KZ-001`). Deferred to `T-03` AC.10's human check, which is this spec's
only gate that touches rendering.

**Continue/pause gate:** `gated` mode — presented to the user with the merge condition above.

---
