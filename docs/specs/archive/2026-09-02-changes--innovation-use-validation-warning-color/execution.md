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

**Continue/pause gate:** `gated` mode — presented to the user with the merge condition above. The user
chose **"Sí, arrancar T-03"**, and for AC.10 chose **"Ruta nativa, y lo mirás vos"** (native route, user
performs the observation).

---

### T-03 — Realign assertions, extend the R3 WCAG harness, and verify visually

| Field | Value |
| --- | --- |
| **Final status** | **`[~]` — code work PASS, AC.10 outstanding, and a Pivot Record filed** |
| Date | 2026-09-02 |
| Implementer attempts | **1** (Reviewer PASS on the delivered scope) |
| Reviewer rounds | 1 |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, **`systematic-debugging`** |
| Skill deviation | `systematic-debugging` is a **Leader addition** beyond the task's list: T-03's first act is reading a failing test run, which is precisely that skill's trigger. Recorded per `.agents/leader.md` → *Delegation Discipline* |
| Effort assigned | `high` (task sized `M`; raised because the `DD-9` exception is precision work and `AC.7` required reasoning about a reachable multi-error state) |
| Requirements covered | `R-IUW-002` scenarios 1–3 incl. every `BUT` / `AND IT MUST` clause; `NFR-IUW-002` (AC.10 — **not yet discharged**) |
| Design refs honoured | `§6`, `DD-8`, `DD-9`, `AR-1` |

#### Why this task is `[~]` and not `[x]`

Two independent reasons, either sufficient on its own:

1. **AC.10 is not discharged.** It is a human visual check and the Implementer was explicitly barred from
   it. Per the task's own **Evidence disqualifier**, an inconclusive or absent visual check is never a
   pass, and per `/akili-execute` Step 2.3.0 a task with outstanding scope never reaches `[x]` **even on a
   Reviewer PASS** — the Reviewer audits what was written, not what was omitted.
2. **A Pivot Record is filed against this task** (below). The Pivot Protocol marks the task `[~]` even
   when rework attempts remain.

#### The `K-018` run — the realignment list came from the failing run, not a grep

Command: `npx jest --testPathPattern innovation-use --coverage=false`, run **before** any edit:

```
Test Suites: 1 failed, 5 passed, 6 total
Tests:       1 failed, 229 passed, 230 total
```

The complete failure list — exactly one entry:

```
● InnovationUseActorItemComponent › c8 — missing actor type shows the required message and error border
  › renders the required message and a red-token border on the select

  expect(received).toContain(expected)
  Expected substring: "border-[var(--ac-red-1)]"
  Received string:    "border-2 border-[var(--ac-warning-1)] fs-[14] rounded-md w-full …"
    at innovation-use-actor-item.component.spec.ts:264:48
```

**The `230/230` baseline in `design.md` §6 and `tasks.md` AC.11 is confirmed** — 229 + 1 = 230.

The pre-flight grep had predicted exactly this one site, and `K-018` requires treating that prediction as
a hypothesis to falsify rather than as the list. **The Reviewer falsified it independently** and the
prediction survived: a grep for `ac-red-1|ac-warning-1` across **every** `*.spec.ts` under
`client/research-indicators/src` matches exactly **2 files**, and before T-03 the details spec contained
**zero** token references while the actor-item spec's only one was `:264`. The sibling specs for the
organization-item and level-stepper components assert text and icon presence but never a colour class. So
one realigned assertion is genuinely the complete set — a verified exhaustive list, not a lucky match.

#### Attempt 1 — files changed (2 files, 194 insertions, 5 deletions; test files only)

| File | Change |
| --- | --- |
| `…/innovation-use-actor-item/…component.spec.ts` | +42/−4 — realigned the `c8` border assertion to the warning token; added AC.3 (`fs-[14]` + icon), AC.4 (asterisk still `text-red-500`), AC.5 (remove button still `--ac-red-1`) as negative guards over the same render |
| `…/innovation-use-details.component.spec.ts` | +152/−1 — extended the R3 `loadFailed` test with border+icon red guards (AC.6); new paired `:114`/`:249` test (AC.7, `DD-8`); new `describe('validation role …')` with two role tests + a falsifier and the cited exception (AC.8) |

#### WCAG arithmetic — three independent derivations agreeing

`AR-1`'s figures had already been corrected once in this spec (an earlier reviewer reported 2.10 / 1.95
and was wrong), so `KZ-007` applies: a corrected figure is the highest-risk artifact class. All three
derivations used the same sanity anchors — black-on-white = **21.00** and WCAG's canonical `#767676`
on white = **4.54** — so the instrument was shown to discriminate before its output was trusted.

| Pair | Leader | Implementer | Reviewer | `AR-1` claims |
| --- | --- | --- | --- | --- |
| amber `#e69f00` on `--ac-grey-100` `#f4f7f9` | 2.0934 → **2.09** | 2.093 → **2.09** | **2.09** | 2.09 ✅ |
| amber on `--ac-white-1` `#fff` | 2.2523 → **2.25** | 2.253 → **2.25** | **2.25** | 2.25 ✅ |
| red `#cf0808` on `--ac-grey-100` | 5.2878 → **5.29** | 5.288 → **5.29** | — | 5.29 ✅ |
| red on `--ac-white-1` | 5.6890 → **5.69** | 5.689 → **5.69** | — | 5.69 ✅ |

**`AR-1`'s light-mode figures are confirmed correct.** *(A Leader first pass produced 2.07 / 5.22 by using
`#f5f5f5` — which is `--ac-background` — instead of `--ac-grey-100`'s actual `#f4f7f9`. Recorded because
the sanity anchors passed while the answer was wrong: a validated instrument does not validate its
inputs.)*

#### `K-004` / `KZ-014` — every new assertion was observed FAILING before being cited

| Mutation | Observed |
| --- | --- |
| actor-item `c8` mutated to a self-contradictory pair | `1 failed, 24 passed, 25 total` |
| 4 independent mutations in the details spec (AC.6 banner border/icon · AC.7 `:114`/`:249` · AC.8 grey-100 role · the AC.8 falsifier itself) | `4 failed, 208 passed, 212 total` |
| All files restored | `diff` confirmed **RESTORED IDENTICAL**, suite re-ran `234 passed, 234 total` |

#### Final verification

| Check | Result |
| --- | --- |
| `npx jest --testPathPattern innovation-use --coverage=false` | `Test Suites: 6 passed, 6 total` · `Tests: 234 passed, 234 total` — **230 → 234**, ≥ baseline (AC.11 ✅) |
| `npm run lint -- --quiet` | `All files pass linting.` |
| `grep -nE '#[0-9a-fA-F]{3,8}'` over the **whole route directory** (Reviewer widened this beyond the two touched files) | no matches, comment blocks included (AC.9 ✅) |
| `npx tsc -p tsconfig.spec.json --noEmit` | **0** errors in either touched file — run by the Implementer unprompted, and load-bearing: root `CLAUDE.md` §4.3 records that this exact gate once hid 945 type errors behind a report of 3 |

**Reviewer verdict: `STATUS: PASS`**

> T-03 discharges AC.1–AC.9 and AC.11 on a test-files-only diff (2 `.spec.ts`, 194 insertions). The single
> realigned assertion is verifiably the complete set, AC.7's fixture genuinely reaches both render blocks,
> the DD-9 exception covers the validation role with measured (not `>= 4.5`) values and a correctly-inverted
> falsifier, and the dark-mode arithmetic the Implementer escalated is correct.

#### Per-AC closure

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC.1 | ✅ | List derived from the failing run (1 failure of 230); exhaustiveness independently falsified by the Reviewer's repo-wide spec grep; counts recorded 230 → 234 |
| AC.2 | ✅ | `actor-item.spec.ts` asserts `border-[var(--ac-warning-1)]` present **and** `border-[var(--ac-red-1)]` absent |
| AC.3 | ✅ | Same test asserts the `warning` icon and the message span's `fs-[14]`; colour asserted on the containing div, where the utility actually sits (`actor-item.component.html:3`) |
| AC.4 | ✅ | `span.text-red-500` containing `*` asserted present — and the selector is itself a class query, so an over-applied warning token makes `.find()` return `undefined` and the test fail |
| AC.5 | ✅ | Remove button asserted `text-[var(--ac-red-1)]` and **not** `--ac-warning-1` |
| AC.6 | ✅ | R3 `loadFailed` test extended: banner border + icon both asserted red, both asserted not-warning |
| AC.7 | ✅ | See the dedicated analysis below — verified non-vacuous from the component source |
| AC.8 | ✅ | Validation role added to R3 on both backgrounds, asserting the **measured** ratio and `toBeLessThan(4.5)` — never `>=`; cites `AR-1`, `DR-1`, `DD-9`, `D-7`; falsifier included; the `KZ-017` light-mode-only scope of the whole block declared in-file |
| AC.9 | ✅ | Zero hex literals across the entire route directory, comments included |
| **AC.10** | ⛔ **OUTSTANDING** | Human visual check. Native stack started for the user's observation; nothing may be recorded here until their words are quoted |
| AC.11 | ✅ | 234/234, ≥ 230 |

#### AC.7 — the assertion worth auditing, audited

`AC.7` is the clause that pays for `DD-8`, so the Reviewer verified the fixture actually reaches the state
rather than accepting that it does:

- `idForLevel(7)` → id `8`; `LEVELS_FIXTURE` (`:25`) maps id 8 → `level: 7`; `resolvedLevel()` (`:196`)
  returns 7 ≥ `JUSTIFICATION_MIN_LEVEL = 6` → `showJustification()` true → the `@if` at
  `…component.html:86` opens, making the `:113` `@if (justificationError())` block reachable. The R3
  `beforeEach` loads `idForLevel(3)`, so the `body.set` is a **real state change, not a no-op**.
- `justificationError()` (`:283`) filters case-insensitively for `innovation_use_level_explanation` and
  returns `matches.join(' ')`, so the interpolation equals the exact string the `.find()` compares.
- `unaddressedSaveErrors()` (`:296`) is the strict complement, so `'actors.0.actor_type_id must not be
  empty'` lands there and the `@if` at `:243` opens.
- Both `.find()` results are guarded by `toBeTruthy()`, so a missing element **fails** rather than passing
  vacuously.

**One genuine `KZ-001` instance was found and is recorded rather than waived.** The test's final line —
`expect(justificationBlock.className.includes('…red-1')).toBe(unaddressedBlock.className.includes('…red-1'))`
— is **tautological**. By the time it runs, the two preceding `toContain` assertions have forced both
operands to `true`; if either had failed, Jest never reaches the line. It compares `true` to `true` and
cannot discriminate, and it does **not** establish the property its comment claims ("never one warning and
one red") — that property is established by the two `.not.toContain('…warning-1')` assertions above it.
AC.7 is fully discharged **without** this line. Left in place (it is harmless and the AC closes regardless);
recorded here because a cohort assertion standing in for something it does not evaluate is exactly
`KZ-001`, recurrence 13, and the honest disposition is to name it, not to count it as evidence.

#### The AC.8 falsifier — direction deliberately inverted, and correctly so

The existing R3 falsifier idiom (`~:2481`) mutates **pass → fail** (`substituting --ac-grey-600 … reports
2.91:1 and fails 4.5:1`), because it guards a *passing* assertion. T-03's new falsifier mutates
**fail → pass** (substituting `--ac-red-1` reports `5.29:1` and passes), because it guards a *failing*
assertion. Same instrument, mirrored — and the mirror is required: the risk it closes is that
`contrastRatio()` might be structurally incapable of returning ≥ 4.5 (broken formula, swapped numerator),
which would make "measured 2.09, below 4.5" meaningless. Feeding it the role's own pre-token value and
getting a pass rules exactly that out. **Honest limit:** the falsifier covers only the arithmetic half of
AC.8; the class-presence half rests on the `.not.toContain` complements plus the K-004 mutation.

#### Decisions made — the two judgment calls, both ruled for the Implementer

- **AC.6 added by extending the existing `loadFailed` test rather than as a dedicated `it()`.** Accepted:
  the AC's wording is *"an assertion proves"*, not *"a test proves"*; the `it` title was updated to name
  the new claim, preserving discoverability; and colocating avoids duplicating the `loadFailed.set(true)`
  arrange. The trailing `component.loadFailed.set(false)` will not run if an earlier assertion throws, but
  the R3 `beforeEach` rebuilds the fixture per test, so no leakage is possible.
- **AC.8 asserts representative sites, not all 8.** Accepted: AC.8's object is *"the validation **role**"*,
  singular, and R3 is organized by role with each existing role asserting one representative element — two
  tests (one per background) is *more* than the block's own pattern requires. Per-site presence at all 8 is
  carried by T-02 AC.1's verified 8/7 partition, and §3's rows map the S1 clauses to AC.2/AC.3, which the
  actor-item guards assert directly. No coverage row is left uncredited.

#### `KZ-015` sweep (fixture arranges the TRANSITION, not the end state)

All three new/changed arrangements were checked against the client child guide's rule and none violates it:

- **AC.8 grey-100 test** — relies on the `describe`'s own `beforeEach`, which loads
  `actors: [new InnovationUseActor()]` through `GET_InnovationUseDetails` and `await component.getData()`.
  `actorTypeMissing` is `!this.body().actor_type_id` (`actor-item.component.ts:90`) — unconditional, no
  `touched()` gate. A server-loaded draft actor row with no type is a reachable product state.
- **AC.8 white-1 test** — constructs at `idForLevel(3)` (message absent), renders, **then** clears to
  `undefined` and re-renders. That is the compliant ordering, and `undefined` is the product's own initial
  state (`new GetInnovationUseDetails()`), which is what `@if (!selectedLevel)` exists for.
- **actor-item `c8`** — sets inputs before the single `detectChanges()`, but the component is a pure
  `@Input` card created inside the parent's `@for` with `[actor]` already bound, so initial binding **is**
  the product path. Also the file's pre-existing universal idiom, unchanged by T-03.

#### `ADVISORY` findings (4R lens checklist — advisory only, never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| Readability | `actor-item.component.spec.ts:259` — the `describe` title still says *"error border"* while the `it` beneath it now says "warning-token border". Realign on a future touch so the block does not read as pre-T-02 |
| Readability | The new `it` name is ~170 characters; Jest wraps it and the failure line becomes hard to scan. A shorter title with clause IDs in a leading comment matches the file's own shape elsewhere |
| Readability | The actor-item spec locates the select with `By.directive(Select)`; the new R3 test uses `By.css('p-select')`. Same host element (the details spec does not import `Select`) — cosmetic, noted so no future reader infers a difference in intent |
| Reliability | The K-004 mutation evidence is **coarser than per-AC**: one self-contradictory mutation inside `c8` proves *the test* can redden, not that each of AC.2–AC.5's four assertions independently discriminates. The Reviewer reasoned through each and found each structurally discriminating, so it was not filed as an issue — but `c8` is the test where four ACs share one `it` and one mutation |
| Resilience | The `:247` **outer border** of the unaddressed-save-errors block is asserted nowhere in the DOM. `R-IUW-002` S3's THEN reads *"its **border** and messages remain `var(--ac-red-1)`"*; AC.7 narrows to `:114`/`:249` and the border half is carried by T-02's verified 7-site kept-red count — so the clause **is** covered, by a grep rather than by the DOM. A one-line guard mirroring AC.6's banner-border assertion would close that at essentially zero cost |
| Risk | The dark-mode gap — see the Pivot Record below. Reachability verdict: **reachable today**, and no assertion in this repo can redden on it |

#### Scope declarations — what these checks structurally CANNOT reach (`KZ-017`)

| Region | Why | Owner |
| --- | --- | --- |
| **The rendered pixel** (`D-6`) | Every assertion is a jsdom class-presence check over markup. R3's own header says the class assertions prove which token name won the element, never the painted pixel | **AC.10 — outstanding** |
| **Dark mode** | Every constant in the R3 block is a `:root` (light) value, so the instrument is light-mode-only **for every role**, not just the new one. Nothing in this repo can redden on a dark-mode contrast failure | Pivot Record below |
| The full client suite | `--testPathPattern innovation-use` is narrower than `npm test`; the full suite was **not** run. Both changed files are page-local `*.spec.ts` with no exports, so nothing outside the pattern should exercise them — **but that was not verified by running `npm test`.** The Leader owes the full-suite re-measure per root `CLAUDE.md` §4.3 |
| What the browser paints | The WCAG math is pure-function arithmetic over hand-transcribed RGB triples. It proves formula consistency and agreement with `AR-1` — not font antialiasing, OS colour management, or the actual composited pixel | AC.10 (partially) |
| Production build | `npm run build` not run — test-files-only change, no `.ts`/`.html` production delta |

---

## Pivot Record: T-03

**Filed 2026-09-02. Status: RESOLVED the same day — user chose option A; see *Pivot resolution* below.**
**When filed, this read "awaiting user decision, execution is stopped, not merely paused"** — kept visible because the
stop actually happened and the record of a halted run is part of the audit trail, not noise to tidy away.

### The blocker

`AR-1` (`requirements.md` §8) states: *"Dark mode passes at 6.29:1; the failure is light-mode only."*
`DD-5` (`design.md` §7) rests the whole no-lightening decision on the same claim: *"It also needs no
lightening: measured 6.29:1 on the dark card, comfortably AA."*

**That claim is true for 5 of the 8 sites and false for the other 3.** Independently derived by the Leader,
then confirmed by both the Implementer and the Reviewer, all three using the validated sanity anchors:

| Site group | Dark background | Ratio | Verdict |
| --- | --- | --- | --- |
| `actor:3,34,41,52` · `org:3` (5 sites) | dark `--ac-grey-100` = `#2b2b2b` (`colors.scss:143`) | **6.29:1** | passes AA — `AR-1` correct here |
| `details:107`, `details:147`, `stepper:4` (3 sites) | dark `--ac-white-1` = `#e5e5e5` (`colors.scss:153`) | **≈1.79:1** | **fails, and is worse than light mode's 2.25:1** |

The site→background mapping was verified in the markup, not taken from the spec's table: `details:107` and
`details:147` sit inside cards at `innovation-use-details.component.html:12` and `:124`, both
`bg-[var(--ac-white-1)]`; the stepper renders at `:44`, inside the `:12` card.

### Why this is a Pivot and not an advisory

1. **The falsified claim is load-bearing for an approved decision.** `DD-5` chose "same value in both
   themes, do not lighten" *because* dark mode was believed to pass. At 1.79:1 that premise is gone, so
   `OQ-3` — recorded as settled in `design.md` §9 — **reopens as a live design question**.
2. **It is load-bearing for an already-ticked acceptance criterion.** `requirements.md` `R-IUW-001` AC.2
   justifies the dark value with *"it already clears AA on the dark surface at 6.29:1"*. The AC's
   mechanical content (a `[data-theme='dark']` definition exists at `#e69f00`) is satisfied and stays
   ticked; its **stated rationale** is false.
3. **It is reachable and unguarded.** Any user with `[data-theme='dark']` active on this page sees amber on
   `#e5e5e5` at ≈1.79:1 today — a live PRD `C-4` deviation that `AR-1` currently documents as a non-issue.
   And because every R3 constant is a light value, **no assertion in this repo can ever redden on it.**
   That is precisely the `D-7` gap this spec was written to close, reopened on the dark axis.
4. It is **worse than the deviation `DR-1` accepted.** `AR-1` accepted 2.09 / 2.25 knowingly. 1.79 was
   never presented to the user, so it has not been accepted by anyone.

### What was NOT done, deliberately

- **No spec document was amended.** The Pivot Protocol calls for mapping the revised plan into
  `requirements.md` / `design.md` — but the direction is a **user decision** (see alternatives), and
  writing a plan in the wrong direction would be worse than writing none. The amendments are held pending
  the user's choice.
- **No dark-mode assertion, constant, or test was added**, and the amber value was not touched. Widening
  R3 to dark mode is not in T-03's scope, and `DR-1` fixes the colour.
- **No code was changed on account of this finding.** T-03's delivered diff matches the approved `DD-5`
  exactly (identical value in both blocks). The code is not wrong; the recorded reason for it is.
- The finding is currently recorded **in-comment** in the R3 exception block. The Reviewer ruled that the
  correct action for a test-files-only task and the **insufficient resting place** — the erroneous claim
  lives in two documents the comment does not reach.

### Alternatives for the user

| # | Option | Consequence |
| --- | --- | --- |
| **A** | **Correct the documents, keep the value and the scope.** Amend `AR-1` and `DD-5` to state the deviation's real extent (5 sites pass dark, 3 fail worse than light), reopen `OQ-3` with "accepted for now", add `RB-5`, and file the owed design-system ticket covering **both** axes | Cheapest and fully honest. The 1.79:1 deviation ships, but knowingly and recorded. Does not touch code |
| **B** | **A, plus lighten the dark value only.** Give `--ac-warning-1` a lighter `[data-theme='dark']` value so the 3 white-1 sites clear AA in dark mode | Overturns `DD-5` (which `DR-1` does *not* fix — `DR-1` fixes the *brand light* amber; the dark counterpart was this spec's own choice). Small code change, but the 22 unmigrated files would then differ from Innovation use in dark mode — the exact divergence `DD-5` was written to avoid |
| **C** | **A, plus extend R3 to dark mode.** Add dark-theme constants and assert the dark ratios with their own documented exception | Closes the `D-7` gap on the dark axis so the deviation is at least *detectable*. Adds test scope to an already over-budget task |
| **D** | Defer entirely; ship as-is with only the in-comment record | Not recommended. `RB-4` already forbids merging T-02 without T-03, and this would merge a live, undocumented, undetectable `C-4` deviation |

---

## Budget Tripwire: fired at T-03

`design.md` §8 sets **3 tasks · ~40 LOC · 1 review round** and instructs `/akili-execute` to stop and
escalate if actuals exceed it. Tasks (3) and review rounds (1 per task, **zero rework across the whole
spec**) are on budget. **LOC is not.**

### Line-item reconciliation (`git --numstat`, excluding spec bookkeeping)

| Budget line item (`design.md` §8) | Expected | Actual | Delta |
| --- | --- | --- | --- |
| 2 token lines | 2 | `colors.scss` **+2** | ✅ exact |
| 1 doc row | 1 | `docs/ux-ui/design.md` **+1** | ✅ exact |
| 8 template lines | 8 | 4 templates **+8** | ✅ exact |
| 1 updated assertion | 1 | `actor-item…spec.ts` **+42/−4** | **+41** |
| ~25 lines for the `DD-9` R3 role | 25 | `details…spec.ts` **+152/−1** | **+127** |
| **Total** | **~37 (stated ~40)** | **205** | **+168 (≈5.1×)** |

**T-01 and T-02 hit their budget lines exactly.** The entire overrun sits in T-03's two test files: 194
actual against 26 budgeted.

### Cause — the budget under-priced the task; the Implementer did not over-build it

The §8 breakdown priced only `DD-9` (the R3 role) plus one realignment. It priced **AC.2 through AC.7 at
zero** — six acceptance criteria that each explicitly demand a new assertion, three of which (AC.6, AC.7,
and AC.8's two-background structure) need their own fixture arrangement. Those ACs are not invented scope:
they are the `BUT it must NOT` / `AND IT MUST` clauses of `R-IUW-002`'s three scenarios, and `tasks.md` §3's
coverage table assigns each of them to T-03 by name.

So the budget was derived from the **design decisions log** rather than from the **task's own AC list** —
both written in the same `/akili-specify` pass. This is the `K-008` family (*writing a coverage table does
not make it exhaustive — the same pass authored the requirements and the table*), and it is a candidate
Kaizen entry for `/akili-archive`: **price the budget from `tasks.md`'s AC list, not from `design.md`'s
decision rows.**

The composition supports the same reading: ~72 comment / ~122 code lines.

### Genuinely surplus content the Reviewer itemized (≈17 of 194 lines)

| Location | Lines | Disposition |
| --- | --- | --- |
| `details…spec.ts` ~`:2417–2419` — AC.7's tautological equality line + its comment | 3 | Recorded above as the `KZ-001` instance. Removable; AC.7 closes without it |
| `details…spec.ts` `:2438–2449` — the dark-mode discrepancy paragraph inside the `KZ-017` scope note | ~12 | **Worth keeping today** — currently the only durable record of the `AR-1` error. Its correct home is `AR-1` itself; once corrected (option A/B/C), collapse to a one-line pointer |
| `actor-item…spec.ts` `:262`, `:264` — `actorNumber = 4` and `disabled = false` | 2 | Redundant against the `@Input` defaults, but defensible as explicit arrange for the remove-button guard, which does depend on `!disabled` |

Everything else traces to an approved AC.

### Leader recommendation

Accept the overrun. Every line above the estimate traces to an acceptance criterion the user approved, the
work passed review on the first attempt with zero rework, and the surplus is ≈17 lines of the 194. The
mis-sizing is a defect in the **estimate**, not in the delivery — and the correct remedy is the Kaizen
entry, not a retro-trim of tested assertions.

**Continue/pause gate:** `gated` mode, and two exceptions have fired (Pivot + budget tripwire), neither of
which pre-approval would absorb even under a different mode. Stopped for the user.

### Pivot resolution — user decision 2026-09-02

**Option A selected: correct the documents, keep the token value and the scope.** The user also
**accepted the budget overrun** (rather than trimming the ≈17 surplus lines or re-sizing the spec).

Option **B** (lighten the dark value only) was offered and declined; option **C** (extend R3 to dark mode)
and **D** (defer with only the in-comment record) likewise. Recorded because the *rejected* options are
what make the accepted residual legible: **the dark-mode deviation ships documented but ungateable.**

#### Amendments applied

| Document | Site | Change |
| --- | --- | --- |
| `requirements.md` | §8 `AR-1` | Rewritten as the **single home** of this spec's contrast figures (`KZ-005`), carrying the deriving method and the three-way independent derivation. The dark claim is corrected in place with the superseded sentence quoted, and the disposition (option A) plus the ungateable residual recorded |
| `requirements.md` | §3 `R-IUW-001` AC.2 | Restated figure replaced by a pointer to `AR-1`; the false rationale corrected while noting the criterion's **mechanical content is unaffected and still holds** |
| `requirements.md` | §9 `OQ-3` | **Reopened, then accepted.** Marked as answered *by decision*, not settled *by measurement* |
| `design.md` | §7 `DD-5` | **Rule unchanged, rationale corrected.** The withdrawn measurement sentence is struck through rather than deleted; the decision now rests on consistency with the 22 unmigrated files + `DR-1`'s authority limit |
| `design.md` | §9 | The claim *"`OQ-3` settled by `DD-5`"* corrected — it was never settled by measurement |
| `proposal.md` | after §11 | **Correction notice added; the approved rows left byte-identical.** A proposal is a point-in-time record and its decision rows are never edited in place |
| `tasks.md` | §5 `RB-1` | Widened — the deviation is both themes, not light-mode only; figures de-duplicated to a pointer |
| `tasks.md` | §5 `RB-5` | Marked **resolved — residual accepted** |
| `tasks.md` | §6 | Owed design-system ticket must now cover **both** themes; budget line and full-suite line ticked |

#### Correction closure — two-direction sweep (`/akili-specify` Correction Closure, `K-003`, `KZ-005`)

**The forward sweep was run BEFORE editing, and it is what made the correction complete.** Grepping the
claim across the whole spec folder on 8 phrasings found it in **8 sites across 4 files** — where the
finding itself had cited only two (`AR-1` and `DD-5`). The three sites a citation-driven amendment would
have missed:

- `requirements.md:48` — `R-IUW-001` AC.2's parenthetical rationale, on an **already-ticked** criterion
- `requirements.md:186` — `OQ-3`'s recorded default
- `proposal.md:203` / `:209` — the approved proposal's own `AR-1` and `OQ-3` rows

This is `KZ-005` recurrence 6's own lesson landing: *a correction sweep must bound its search space on
every axis — phrasing, token, file set — not only the axis that last failed.*

**Forward re-grep after editing:** every surviving occurrence of the superseded claim is now a
**quotation inside a correction record** (the Pivot Record, `RB-5`, the `proposal.md` notice, or the
struck-through `DD-5` text). **No site asserts it any more.** Repo-wide, the only `6.29` outside this
spec is an unrelated coverage figure in an archived spec.

**Backward sweep:** grepping citations *of* the corrected sections returns 82 hits for
`AR-1`/`DD-5`/`OQ-3`/`RB-1` across `docs/` — and **none is a reference to this spec.** They are **ID
collisions**: `docs/prd.md` has its own `OQ-3`, `bugfix/innovation-use-draft-save` its own `DD-5`, and
`docs/specs/innovation-use/OPEN-ITEMS.md` its own `AR-1`/`RB-1`. Nothing outside this spec depends on the
corrected text, so no downstream document was left asserting a falsehood.

> **Finding worth carrying to Kaizen: spec IDs are not globally unique, so a naive backward sweep is
> ~100% false positives.** A backward sweep must match the ID **together with its spec path or a
> distinguishing phrase**, never the bare ID. Grepping `DD-5` alone would have produced 26 hits and
> either buried a real dependency or invited an edit to the wrong spec's decision row.

#### New values introduced by the correction, re-grepped (`KZ-005`'s second clause) — **and the re-grep caught the Leader**

This is the clause that earned its place. Having just declared `AR-1` the **single home** of the contrast
figures and cited `KZ-005` while doing it, the Leader then **restated the new `1.79` figure in four
separate documents** — `requirements.md` (the home, correct), plus `design.md` §9, `proposal.md`'s
correction notice, and `tasks.md` `RB-5`. Three sites too many, seeded by the very edit that invoked the
rule against them.

The re-grep is what surfaced it. Fixed immediately: `design.md`, `proposal.md` and `tasks.md` now say
*"worse than in light mode"* and **point** to `AR-1` for the number.

| Value | Live sites after de-duplication | Verdict |
| --- | --- | --- |
| `1.79` (derived ratio) | `requirements.md` **×1** (`AR-1`, the home) + `execution.md` ×6 (audit trail) | ✅ one home |
| `6.29` (derived ratio) | Everywhere it still appears, it is a **quotation of the superseded claim inside a correction record**, plus the one live corrected figure in `AR-1` | ✅ |
| `#e5e5e5`, `#2b2b2b` (token values) | 2–3 live sites each | ✅ **deliberately not de-duplicated** — these are *facts of `colors.scss`*, not derived figures. They cannot go stale from a re-measurement, only from a token edit, and naming the actual background is what makes the correction notices readable. `KZ-005` governs **derived** figures; over-applying it to raw constants would cost clarity for no staleness benefit |

**The distinction in that last row is the point of the lesson, not an exemption from it:** a figure needs
one home because it is *computed* and goes stale when the tree changes. A hex literal copied out of
`colors.scss` has a different failure mode and a different fix.

**An earlier draft of this very section claimed the re-grep found nothing.** That sentence was written
before the grep was run and was false. It is replaced by the account above — recorded rather than quietly
overwritten, because a correction record asserting an unperformed check is precisely `KZ-007` (*a
correction record is the highest-risk artifact class*) committed inside a `KZ-007` write-up.

#### Provenance of the error — recorded because it is the interesting part

`proposal.md`'s `OQ-3` row was **precise**: *"already measures 6.29:1 on the dark **card**"*. The
imprecision was introduced **downstream**, when `requirements.md` §8 `AR-1` generalised it to *"Dark mode
passes at 6.29:1; the failure is light-mode only."* The claim became **less** accurate as it moved
between documents, then `DD-5` inherited the generalisation and built a decision on it. That is `KZ-007`
exactly — *a correction record is the highest-risk artifact class; it reads as settled fact, is rarely
re-verified, and propagates* — and this instance shows the mechanism: nobody introduced a wrong number,
someone dropped a **qualifier**.

#### Outstanding after the Pivot resolution

| # | Item | Owner |
| --- | --- | --- |
| 1 | **AC.10** — performed 2026-09-02. **RESULT: FAIL — a real rendering defect, see the dedicated section below.** | User (observed) / Leader (investigating) |
| 2 | ~~A stale in-code comment introduced by this very correction~~ — **DONE 2026-09-02.** The `SCOPE OF THIS EXCEPTION (KZ-017)` paragraph (`innovation-use-details.component.spec.ts:2438–2444`) said the `AR-1` correction was *pending at the source document*; true when written, false once `405908b1` landed. Replaced with a pointer to the corrected `AR-1` + `RB-5`, 11 comment lines → 7, comment-only diff, suite unchanged at 234/234. **Reviewer PASS** — it verified all six pointer claims at source, which mattered because the Leader wrote both the documents and the brief and was therefore not an independent auditor of the pointer's truth | ✅ closed |
| 3 | The owed design-system ticket (`AR-1`, `RB-1`, done-definition) — now scoped to both themes | User |
| 4 | `docs/specs/innovation-use/OPEN-ITEMS.md` is the innovation-use surface's open-items register and does **not** know about `RB-5`. Adding it is outside option A's scope; flagged, not done | Observation |

---

## AC.10 — human visual check: **FAILED**, and it found what no command could

**Performed 2026-09-02 by the user (D. Casañas) on the running native stack, with two screenshots.**

### The observation, quoted (`KZ-002` / the task's own Evidence disqualifier)

> *"esta el texto en ambar pero el borde no esta con el color"*
> — with a screenshot of `ACTOR # 5`: the `Actor type` select empty, the *"⚠ This field is required"*
> message rendering **amber**, and the select's border rendering as the **ordinary light PrimeNG
> border — no coloured outline at all.**

> *"adjunto de imagen de muestra de como deberia quedar"*
> — with a reference screenshot of the **`Contribution to SDG`** field: a **2px amber rounded border**
> around the select **plus** the amber message below it. That is the intended treatment.

**This discharges the disqualifier's requirement.** The observation names the *validation* amber on an
*invalid actor card* and compares it against a reference field on the same surface, and it is specific
about **which property** diverges (the border, not the text). It is not a "looks right".

### Verdict against the criterion

AC.10 asks that *"an invalid actor card and the `Justification` field are compared on the same rendered
screen; the amber is indistinguishable between them and no layout shifted."* The amber is **not**
indistinguishable: the message colour matches, the border does not render at all. **AC.10 fails.** It
stays `[ ]`, and `T-03` stays `[~]`.

### Why this matters more than the defect itself

Every automated gate in this spec passed over it, and each one passed **correctly** — none of them was
broken or badly written:

| Gate | Result | Why it could not see this |
| --- | --- | --- |
| `grep -c 'ac-warning-1'` = 8 | ✅ green | The token name **is** in the markup at `actor:34`. Presence is all it claims |
| Token cross-check (`D-3`) | ✅ green | `--ac-warning-1` **does** exist in `colors.scss`. No typo |
| `npx jest --testPathPattern innovation-use` | ✅ 234/234 | jsdom has no layout engine, no cascade resolution, no computed colour |
| T-03 AC.2's assertion | ✅ green | It asserts `className` **contains** `border-[var(--ac-warning-1)]`. It does. The class is present **and inert** |
| Full client suite | ✅ 6790/6790 | Same limitation, 6790 times over |
| `npm run lint -- --quiet` | ✅ clean | Lint has no opinion on whether a utility class wins the cascade |
| R3 contrast harness | ✅ green | Pure arithmetic over RGB triples — it never touches the DOM's painted state |

**This is `D-6` landing exactly as `requirements.md` §6 predicted it would**, and it is the strongest
possible vindication of that section: *"`npm test` and a grep both pass over a page that renders wrong.
The gate is a person looking at the screen — stated here so it is not quietly skipped."* Had AC.10 been
waived as bureaucracy, this spec would have shipped a validation state with **no visible border**, with
six green gates and a Reviewer PASS behind it.

It is also a textbook `KZ-001` instance at the highest severity the log records (Critical, recurrence
13): *a cohort assertion that doesn't evaluate what it stands in for produces a green suite over broken
behavior — a property that lives in generated output must be asserted there.* The assertion proved the
token name **won the attribute**. Nobody proved it **won the cascade**.

### Open question the investigation must answer first

**Did the RED border ever render?** `requirements.md` §3's site table and the original proposal
screenshots both describe a red border on this select before the change. If red rendered and amber does
not, the cause is specific to this change. If the red border came from somewhere else entirely — PrimeNG's
own invalid styling, or a global rule in `custom-prime-force-styles.scss` — then **`actor:34`'s Tailwind
arbitrary class never painted anything**, the site was mis-enumerated from the start, and `DD-4`
(*"the Tailwind risk is closed, not deferred"*) is falsified for the `p-select` case.

A read-only scout is investigating. The distinction decides whether this is a bug fix inside T-03 or a
second Pivot, so **no code will be changed until it is settled.**

---

## Pivot Record: T-02 / T-03 — `DD-4` is falsified

**Filed 2026-09-02 after AC.10 failed. Status: awaiting user decision. No code changed.**

### Root cause: CSS Cascade Layers, not the token, not the DOM

Investigated by a read-only scout, then **each load-bearing claim re-verified by the Leader
independently** (`K-004` — the crux of a Pivot may not rest on a single report):

| Claim | Verified |
| --- | --- |
| PrimeNG draws the border with its own rule on the same element | ✅ `node_modules/primeng/fesm2022/primeng-select.mjs:28` — `border: 1px solid ${dt('select.border.color')}`; `primeng-inputtext.mjs:17` — same shape |
| PrimeNG's CSS is **unlayered** | ✅ `client/research-indicators/src/app/app.config.ts:29–36` — `providePrimeNG({ theme: { preset, options: { darkModeSelector } } })`. **`cssLayer` is never set**, and it defaults to `false`, so nothing is wrapped in `@layer` |
| Tailwind emits every utility **inside `@layer utilities`** | ✅ Tailwind v4 is a cascade-layers engine by architecture, and it is loaded **only** as the runtime browser CDN (`src/index.html:12–15`, `@tailwindcss/browser@4.1.6`); `grep -c tailwind package.json` = **0**, so there is no build-time config that could change this |
| The reference field paints its border with an **inline style**, not a class | ✅ `custom-fields/select/select.component.html:20` — `[style]="isInvalid() ? { width: '100%', border: '2px solid #E69F00' } : { width: '100%' }"`; `multiselect.component.html:20` is identical |

**The mechanism:** per the CSS Cascade Layers spec, **unlayered author CSS unconditionally beats layered
author CSS** for the same property on the same element — regardless of selector specificity or source
order. So `.p-select { border: 1px solid … }` (unlayered) always defeats `border-2
border-[var(--ac-warning-1)]` (layered), and no amount of specificity, ordering, or class placement can
change that. The class **is generated, does land on the right element, and is inert.**

The text renders amber because nothing unlayered contests `color` on a plain `<div>`. There is no cascade
fight to lose there.

### The finding that reframes the whole change: **the red border never rendered either**

`actor:34` and `actor:52` carried `border-[var(--ac-red-1)]` before `6e33707f`, subject to the **identical**
defeat. No project SCSS colours a `.p-select` / `.p-inputtext` border, and PrimeNG's own red invalid
border needs `.p-select.ng-invalid.ng-dirty` — which requires Angular Forms validators, while this
component uses one-way `[ngModel]` with plain boolean getters (`innovation-use-actor-item.component.ts:90,94`)
and declares no `Validators` anywhere.

**So this spec did not break these two sites. It inherited them broken and renamed an inert rule.**

### What is falsified

| Artifact | Status |
| --- | --- |
| **`DD-4`** — *"The Tailwind risk is **closed, not deferred**"* | **FALSIFIED for PrimeNG elements.** `DD-4` verified that the runtime JIT **generates** the class and that the remote `colors.css` holds no competing utility rules. Both true. But the risk it declared closed was *"will the class exist"*, while the actual failure is *"will the class win the cascade"* — a different question it never asked. **This is `KZ-017` in the design phase: a verification narrower than the claim it backed, returning a confident green.** The `DD-4` investigation even fetched a remote stylesheet to rule out interference, and never checked the one thing that mattered |
| **`requirements.md` §3's site table** | Mis-enumerated. `actor:34` (*"invalid `p-select` border"*) and `actor:52` (*"invalid 'Specify other' input border"*) are listed as sites that render a coloured border. They render none |
| **`R-IUW-002` AC.2 / AC.3** | *"Colour is the only delta"* and *"border sites keep `border-2`"* cannot both hold with the fix: the fix **replaces the mechanism** at these 2 sites |
| **`T-02`** | Marked `[x]`, and its AC.1 is literally true — the 8 sites do reference the token. **2 of the 8 reference it inertly**, so the requirement's *intent* is unmet at 25% of its surface |
| **`T-03` AC.2** | Asserts `className` contains `border-[var(--ac-warning-1)]`. It passes over the defect and would keep passing after a wrong fix |
| **`AR-1`'s SC 1.4.11 note** | *"below the 3:1 SC 1.4.11 asks of the two border sites"* — measured against borders that do not exist. The real a11y state is **worse** than a low-contrast border: an invalid select has **no** non-text indicator at all |

### The fix, and why it improves on the reference it copies

Match the established pattern — a `[style]` object binding, which Angular applies as a genuine inline
style (`Renderer2.setStyle`), and **inline style outranks every stylesheet rule, layered or not**:

- `actor:34` — `[style]="actorTypeMissing || duplicateType ? { border: '2px solid var(--ac-warning-1)' } : {}"`
- `actor:52` — `[style]="otherNameMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"`

**One deliberate divergence from the reference:** `select.component.html:20` hardcodes `'2px solid
#E69F00'` — a **hex literal**, exactly what `DD-7` bans and what the other 22 unmigrated files do. The fix
uses `var(--ac-warning-1)` instead, which works identically in an inline style. So `NFR-IUW-001` (zero hex
literals) still holds, and the fix is *more* compliant than the pattern it imitates. Recorded because
"follow the exemplar" would have introduced the violation this whole spec exists to remove.

`radio-button.component.scss:12–17` (`::ng-deep` + `!important`) is the fallback for when the paint node
is a **descendant** PrimeNG cannot reach with a host-level `[style]`. Not needed here — both sites paint
on their own element.

### Blast radius beyond this spec (flagged, not actioned)

**Any Tailwind `border-*` utility on any PrimeNG element anywhere in this app is inert**, by the same
mechanism. `custom-fields/input/input.component.html:49,55` already hedges with *both* a Tailwind class
**and** an `[style]` carrying `!important` — evidence the team has hit this before without naming it.
`DR-2` (Option A) scopes this spec to Innovation use, so a repo-wide audit is **out of scope here** and
belongs in its own proposal.

### Why this is a Pivot and not a bug fix inside T-03

`T-03` is test-files-only, and the change needed is in a **template** — inside `T-02`, which is closed and
committed. More importantly the approved design is **wrong about how this works**: `DD-4` cleared a risk
that was live, and `R-IUW-002` AC.2's *"colour is the only delta"* is not satisfiable at these 2 sites.
Proceeding without amending the spec would mean implementing against a design that has been shown false.

### Alternatives for the user

| # | Option | Consequence |
| --- | --- | --- |
| **A** | **Fix it in this spec.** Amend `DD-4`, the §3 site table, `R-IUW-002` AC.2/AC.3; reopen `T-02` for the 2 border sites with the `[style]` pattern; update `T-03` AC.2's assertion to read the inline style ~~(which jsdom **can** see — `element.style.border` is real there, unlike a class's cascade outcome)~~ **← this parenthetical was WRONG, and it was in the option text the user chose.** `cssstyle@2.3.0` drops the whole shorthand for a `var()` colour, so `element.style.border` is `''` either way (confirmed from source by the `T-04` Reviewer; see `design.md` §6). **The decision itself is unaffected** — the cascade question is still decidable, just via an accessor spy rather than a DOM read-back, and `T-04` delivered exactly that. Recorded because a decision record that misstates its own basis is the highest-risk artifact class in a spec (`KZ-007`), and this one was authored by the Leader inside a correction of the same error class (`KZ-017`); re-run and re-verify AC.10 | Delivers what was actually asked (validation that looks like the reference, border included). Costs one more T-02 + T-03 round. **Recommended** |
| **B** | **Fix only the colour scope; file the border defect separately.** Accept that `actor:34`/`actor:52` show no border — as they never did — close this spec on the 6 text sites, and raise a new proposal for the PrimeNG/Tailwind cascade defect app-wide | Defensible: the defect is **pre-existing** and this spec did not cause it. But it closes a spec whose stated goal is visual parity with the reference, while 2 of 8 sites visibly diverge |
| **C** | **A, plus widen to the app-wide audit** | Honest about the blast radius, but `DR-2` explicitly scoped the app-wide migration out, and the budget already overran 5× |

### Pivot resolution — user decision 2026-09-02

**Option A selected: fix it in this spec.** B and C declined. Spec amended in `39fd519c` (`DD-4` struck
and superseded by `DD-10`, §5.2 revised, §6 gains an inline-style row, `R-IUW-002` AC.2 carved out and
AC.3 replaced, defect class `D-8` added, `AR-1`'s SC 1.4.11 clause withdrawn, `T-04` created, `T-02`
annotated as superseded at 2 sites without reopening it).

---

### T-04 — Render the two border sites (Pivot: `DD-4` falsified)

| Field | Value |
| --- | --- |
| **Final status** | **`[~]` — code work PASS, AC.8 (human re-check) outstanding** |
| Date | 2026-09-02 |
| Implementer attempts | **1** |
| Reviewer rounds | 1 |
| Skills assigned | `angular-developer`, `ui-ux-pro-max` |
| Effort assigned | `high` — raised above the task's `S` sizing because a prior round produced correct-looking work by faithfully following a false design |
| Requirements covered | `R-IUW-002` AC.3 (revised), scenario 1 THEN (border half), `NFR-IUW-001` |
| Design refs honoured | `DD-10`, §5.2 (revised), §6, defect class `D-8` |

#### The `K-018` run

| Run | Result |
| --- | --- |
| Baseline (before any edit) | **234 / 234 passed** |
| After the 2 template edits, before spec realignment | **232 passed, 2 failed** — the realignment list, derived from the run |
| Final | **237 / 237 passed** (234 + 3 new tests) |
| Full client suite | `npm test -- --silent` → **317 suites / 6793 tests passing**, coverage 98.2 / 96.3 / 97.76 / 98.5 (floors 40 / 20 / 45 / 30) |
| `npm run build` | clean, exit 0 |

#### The change

```html
<!-- actor:34 — was: class="fs-[14] w-full {{ … ? 'border-2 rounded-md border-[var(--ac-warning-1)]' : '' }}" -->
class="fs-[14] w-full"
[style]="actorTypeMissing || duplicateType ? { border: '2px solid var(--ac-warning-1)' } : {}"

<!-- actor:52 — was: class="rs-mt-[12] w-full {{ … ? 'border-2 border-[var(--ac-warning-1)]' : '' }}" -->
class="rs-mt-[12] w-full"
[style]="otherNameMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"
```

Both ternary conditions byte-for-byte unchanged. `rounded-md` was dropped with the rest of the dead
fragment — **the Reviewer confirmed this is harmless**: it was inert by the same `DD-10` mechanism
(PrimeNG sets `border-radius` in the same unlayered rule that beat `border-*`), and the reference field
the user screenshotted renders a *rounded* amber border with no Tailwind radius class anywhere.

**The exemplar's hex was NOT copied.** `custom-fields/select/select.component.html:20` hardcodes
`'2px solid #E69F00'`; `T-04` uses `var(--ac-warning-1)`, so `NFR-IUW-001` holds and the fix is more
compliant than the pattern it imitates. The Implementer also caught and fixed one of its own comments
that had spelled the hex out.

#### The novel technique, and why the literal AC could not be met

`AC.5` named `element.style.border`. **That mechanism is structurally unreachable in this jsdom**, and the
Reviewer confirmed it from `cssstyle@2.3.0` source rather than accepting the Implementer's word:
`border`'s `shorthandSetter` returns without writing when any part fails to parse; `shorthandParser`
requires every part to validate; `border-color` demands `TYPES.COLOR`; and `valueType()` has **no `var()`
branch**, so `var(--ac-warning-1)` falls through to `KEYWORD` and fails. The whole declaration is dropped
atomically — `element.style.border === ''` **and** `getAttribute('style') === null`, *identically whether
the binding is right or wrong*. Longhands do not rescue it. With a literal colour it reads back fine,
which is exactly why the five sibling hex-valued bindings are readable and this one is not.

The substitute is `jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set')`, which observes the exact
string Angular hands the CSSOM — the same call a real browser would receive and paint. The Reviewer
verified the spy is correctly wired (jsdom's `element.style` is a `cssstyle.CSSStyleDeclaration` and the
global constructor is the same one, so prototype and instance share accessors).

**Reviewer verdict: `STATUS: PASS`**

> T-04's markup matches `DD-10` byte-for-byte, AC.1–AC.4 and AC.6 verify at source, and the replacement
> assertions — contrary to my first reading — do discriminate per-site in the states they assert, because
> the only other `style.border` writers in the render tree emit a *different string*. AC.5's literal
> wording is structurally unreachable in this jsdom, which I confirmed from `cssstyle` source; the
> substitution is justified and disclosed.

#### The Reviewer corrected the Implementer's own reasoning — record this, it matters

The Leader asked whether the **global** prototype spy is a `KZ-001` cohort assertion, since
`toContainEqual(['2px solid var(--ac-warning-1)'])` proves *"some element received that string"*, not
*"this element did"*. The cohort is genuinely not size 1: `custom-fields/input/input.component.html:30,55`
writes `style.border` too, and `app-input` renders **four times** per actor card.

**What saves it:** every sibling writer emits `'2px solid #E69F00'` — a hex string. Sites 34 and 52 are
the only producers of the *token* string in the repo, and in each asserted state exactly one of them is
live. So a broken binding at either site reddens its own test.

**But two of the Implementer's claims were wrong and are not carried forward:**

1. **The `K-004` falsifier does not show what it claimed.** Reverting `actor:34` left `c8b` green *because
   site 34 is inactive in `c8b`'s state* — not because `c8b` discriminates per-site. What the falsifier
   **does** prove, and it is valuable, is that with site 34's binding removed **nothing else in a fully
   rendered card writes `border` at all** (`Received array: []`).
2. **The negative tests are the stronger half and the actual differential control.**
   `not.toHaveBeenCalled()` cannot be fooled by the wrong element, and each negative renders the *same
   tree* as its positive twin with exactly one flag flipped. Zero-vs-one across a single-variable delta is
   what pins the producer — never the `toContainEqual` alone.

This is why the Reviewer gate is not collapsible: the Implementer's evidence was **sound in conclusion
and wrong in argument**, and only an independent auditor separated the two.

#### The R3 toggle — the Reviewer rejected both of the Leader's framings

The R3 realignment toggles the actor row valid → invalid to defeat Angular's style memoization. The Leader
offered two readings: (a) a `KZ-015` violation, or (b) legitimate because clearing a selection is a real
product transition. **Both were wrong.**

- **(b) fails on its own premise:** the select has no `showClear` (`innovation-use-actor-item.component.html:27–39`)
  and `onActorTypeChange` only ever fires with a chosen value, so **a user cannot clear a previously-valid
  actor type back to `undefined` on the same row.** The Reviewer tried to construct the sequence and could
  not.
- **(a) fails too:** `KZ-015`'s failure mode is *asserting on a state the product never reaches*. The state
  **under assertion** is `actor_type_id: undefined` — the row's natural first-render state, which every
  user sees on a fresh actor row.

**Ruling: honest instrument scaffolding, not a fake transition.** The real criticism is different and is
filed as an advisory: the border assertion **does not belong in that test at all** — it is redundant with
`c8`, sits inside a *text*-contrast measurement where a border participates in no ratio, and is the sole
reason the toggle exists.

#### Per-AC closure

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC.1 | ✅ | Both `[style]` bindings present; proven by the K-004 falsifier and by dedicated negative-state tests |
| AC.2 | ✅ | `grep -n 'border-\[var(--ac-warning-1)\]'` over the 4 templates → **0**; `ac-warning-1` total still **8** (2 dead class fragments out, 2 inline-style refs in — net zero) |
| AC.3 | ✅ | Both conditions and all non-border classes byte-identical; `rounded-md` drop confirmed harmless |
| AC.4 | ✅ | Zero hex in both templates **and** both spec files, comments included |
| AC.5 | ✅ **with a documented, Reviewer-confirmed deviation** | Assertions read the inline-style *assignment* via an accessor spy, not `element.style.border` — which is unreachable, not merely awkward. Old class assertions replaced, not kept alongside |
| AC.6 | ✅ | Every `--ac-*` in the 4 templates resolves in `colors.scss` |
| AC.7 | ✅ | 237 / 237, above the 234 baseline |
| **AC.8** | ⛔ **OUTSTANDING** | Human visual re-check. Leader-owned; the Implementer was barred from it and complied |

#### Scope deviation: a third file (Leader's briefing error)

The brief said *"two files only"*. The Implementer also touched
`innovation-use-details.component.spec.ts`, because `T-03`'s R3 block asserted the **same dead class** on
the same `<p-select>`, so removing the fragment per `DD-10` necessarily broke it and `AC.7` was
unreachable without realigning it. The Reviewer established this as **necessary, not merely argued** — the
intermediate run's two failures locate one there.

**This was the Leader's error.** The file list came from the `T-04` task text the Leader wrote, and the
Leader did not grep for other assertions on that class — despite having seen T-03's R3 block assert it in
the T-03 diff hours earlier. The Implementer surfaced the conflict instead of silently violating either
the rule or `AC.7`, which is the correct behaviour.

#### `ADVISORY` findings (recorded; never gate, and per `/akili-execute` they may **not** become tasks in this spec)

| Lens | Finding |
| --- | --- |
| Reliability / Risk | The positive spy assertions discriminate **only** because the five other `style.border` writers emit hex rather than the token string — and **nothing in the test says so**. `mock.contexts` (jest 29.7.0) would bind each call to its element in one line per test, and on the `p-select` would additionally record *which* node receives the border (host vs PrimeNG's inner root), which is currently unknown |
| Reliability | The two `not.toHaveBeenCalled()` negatives are **global** over a tree containing four `app-input`s that write their own border when invalid. Safe direction (no false pass) but a **false-failure** surface: a future fixture change that invalidates a count field would redden a test about the actor-type border |
| Readability | The R3 border assertion is redundant with `c8` and is the sole cause of the artificial toggle. Deleting it and citing `c8`/`c8b` would also have been the more minimal form of an already-unlisted-file deviation |
| Coverage | Nothing pins the **second operand** of `actorTypeMissing \|\| duplicateType`. A row with a valid type **and** `duplicateType: true` must also paint the border; `c9` renders the duplicate message but entangles the two operands |
| Readability | An in-file comment claims `setProperty` *"is never called for this binding"*. The Reviewer could not confirm it read-only and notes it is **unnecessary** — `cssstyle`'s `setProperty` dispatches to the same accessor, so the spy fires either way. A `K-004`-style over-claim in an explanatory comment is how the next reader inherits a wrong premise |

#### 🔴 Leader correction owed and applied: `KZ-017` recurred inside its own correction

The Reviewer confirmed the jsdom read-back claim was **false** — and that claim was written **by the
Leader, in `DD-10` and §6, while correcting `DD-4` for exactly this failure mode**: a verification narrower
than the claim it backs. It then propagated to **four** sites, which the Reviewer enumerated rather than
leaving to a citation-driven sweep:

| Site | Corrected |
| --- | --- |
| `design.md` §6 inline-style row | ✅ struck through with the `cssstyle` source chain recorded |
| `design.md` `DD-10` prose | ✅ verified — the row does not itself repeat the claim; `DD-10`'s load-bearing statement (inline style outranks every stylesheet rule) **stands**, corroborated by the user's own reference screenshot |
| `requirements.md` `D-8` Mitigation | ✅ corrected to name the accessor spy as the observable |
| `execution.md` Pivot **option A** — *the text the user chose* | ✅ struck through in place. **The decision is unaffected** (the cascade question is still decidable, just via a spy), but a decision record that misstates its own basis is the highest-risk artifact class in a spec (`KZ-007`) |

**Kaizen candidate, and the sharpest one this run produced:** `KZ-017` was invoked *by name* in the very
edit that committed it again. Knowing a lesson and citing it did not prevent the recurrence — the
Leader corrected `DD-4`'s "verified generation, claimed rendering" and immediately wrote "verified that
inline styles win, claimed jsdom can read them back". **The pattern is asserting a mechanism's
*observability* without running the observation.**

#### Final verification

237 / 237 route suite · 317 suites / 6793 tests full client suite · `npm run build` clean ·
`npm run lint -- --quiet` clean · zero hex · AC.2 grep zero · `tsc -p tsconfig.spec.json` no new errors.

**What none of it proves:** the composited pixel. **AC.8 is the only remaining gate**, and per the
Reviewer it must be asked more sharply than "is the border amber now" — see below.

#### AC.8 — human visual re-check: **PASSES for `actor:34`, and is NOT yet discharged for `actor:52`**

**Performed 2026-09-02 by the user with a screenshot of `ACTOR # 5`.**

**On the evidence, and on the disqualifier.** The user's words were *"ahora si se ve bien"* (*"now it does
look right"*). Taken alone **those words are exactly what this spec's Evidence disqualifier rejects** —
*"a report that the page 'looks right' or that 'the section renders' does not discharge it."* What
discharges the criterion is the **attached screenshot**, which the Leader read directly. A rendered image
is strictly stronger evidence than a sentence about it, because it can be interrogated against criteria
the observer was not asked about. Recorded this way so the trail does not credit a disqualified phrase
with work the image did.

**Read off the screenshot, against the Reviewer's sharpened questions:**

| Question the Reviewer insisted on | Observed |
| --- | --- |
| Is there **one** 2px amber border, not two concentric outlines? | ✅ **One.** This was the live open question — which node of the `p-select` receives the inline border (host vs PrimeNG's inner root div). A double outline would have meant both. It does not occur |
| Is PrimeNG's normal corner radius preserved after `rounded-md` was dropped? | ✅ Rounded corners present, matching the reference field's appearance. Confirms the Reviewer's ruling that `rounded-md` was inert and PrimeNG supplies its own radius |
| Same amber, same 2px weight as the reference? | ✅ Visually indistinguishable from the `Contribution to SDG` reference image the user supplied earlier |
| Did any layout shift? | ✅ No. Label, select, message, checkbox and the four count fields hold the spacing of the pre-fix screenshot |
| Message treatment intact? | ✅ Amber text + `warning` icon, unchanged |
| Negative guards visible in the same frame? | ✅ `Actor type*` asterisk still **red**; the remove (⊗) button still **red** — `D-2`'s two negative guards confirmed *visually*, not just by assertion |

**So the border half of `R-IUW-002` scenario 1's THEN clause is delivered and observed** — for the first
time in this spec's history, since it never rendered before `T-04`.

#### ⛔ The gap: `actor:52` is not visually verified, and it is a materially different code path

The screenshot cannot show it. With `Actor type` **empty**, the `Specify other` input is not rendered at
all (`@if (body().actor_type_id === otherActorTypeId)`), so the frame that proves `:34` structurally
excludes `:52`.

**This is not pedantry, and the reason is specific.** The two sites lose the same cascade fight, but they
**apply** the inline style through different mechanisms:

- `actor:34` is a **`p-select` component**, which declares `style` as an `@Input` and re-applies it to its
  host through PrimeNG's own compiled `ɵɵstyleMap` host binding.
- `actor:52` is a native `<input>` carrying the **`pInputText` directive**, which declares no `style`
  input — Angular writes the style straight onto the element.

The unit tests cover both (`c8b`'s pair asserts `:52` in its invalid and valid states), and the mechanism
is sound in both. But the whole reason `AC.8` exists is that this spec has already shipped one defect
where every assertion passed and the pixel was wrong, on precisely a *"the mechanism is obviously the
same"* assumption (`DD-4`). **Extending an observation of `:34` to `:52` would repeat that inference.**

Per the disqualifier — *"if the observation covers an adjacent property, say which and leave it
blocked"* — `AC.8` stayed **`[ ]`** pending one more frame: `Actor type` set to **Other** with the
`Specify other` name left empty.

#### AC.8 — **DISCHARGED.** The second frame arrived, and it proved more than it was asked to

**Second observation, 2026-09-02, user screenshot of `ACTOR # 5` with `Actor type = Other`:**

> *"igual sale bien"* — with a screenshot showing `Actor type` set to **Other**, the `Specify other`
> input **empty and carrying a single 2px amber rounded border**, the amber *"⚠ This field is required"*
> message beneath it, and the red asterisk and red remove button unchanged.

| Claim | Observed |
| --- | --- |
| `actor:52` renders a 2px amber border via its own (`pInputText` directive) code path | ✅ present, single outline, radius intact |
| Message treatment beneath it | ✅ amber text + `warning` icon |
| `D-2` negative guards | ✅ asterisk red, remove button red |
| Layout | ✅ no shift; the four count fields and `Total` hold their spacing |

**The frame also settled something nobody asked for — and it is the most valuable part.** With
`Actor type = Other` the select now holds a **valid** value, and the screenshot shows it with **no amber
border at all**. That is the `{}` branch of `actor:34`'s ternary, **confirmed in a real browser**. Until
this frame that branch was proven only in jsdom, by the two `not.toHaveBeenCalled()` negatives — whose own
limitation the `T-04` Reviewer had flagged as a *global* negative over a tree containing four other border
writers. A human looking at the screen closed a gap the test suite could only approximate.

So both sites are verified through **both** of their distinct application mechanisms, in both states:

| Site | Mechanism | Invalid | Valid |
| --- | --- | --- | --- |
| `actor:34` (`p-select` component, `style` re-applied via PrimeNG's host binding) | ✅ border (frame 1) | ✅ **no** border (frame 2) |
| `actor:52` (`pInputText` directive on a native input, Angular writes directly) | ✅ border (frame 2) | — covered by unit test `c8b`'s negative |

**`AC.8` is discharged. `T-04` closes.**

#### Disposition of `T-03`'s `AC.10`

`AC.10` **failed**, and that failure is the most productive event in this run — it produced the Pivot,
`DD-10`, defect class `D-8`, and `T-04`. Its substance (a human confirming visual parity) is now
delivered by `AC.8`'s two frames, so it is marked discharged **by `T-04` AC.8** rather than re-run.

**One honest deviation from its literal wording.** `AC.10` names the **`Justification`** field as the
side-by-side reference; the user compared against **`Contribution to SDG`** instead. That is the same
shared-component treatment — both are `custom-fields/` components applying `'2px solid #E69F00'` through
an inline `[style]` (`select.component.html:20`, `textarea.component.html:35`) — so the comparison is
equivalent in substance. Recorded rather than glossed, because substituting a reference is exactly the
kind of quiet drift `KZ-002` recurrence 6 was about (*"the proxy was a human's answer to a different
question"*). Here the substitution is defensible and stated; it is not being credited as the literal
criterion.

---

---

## 3. Summary — spec complete

**All four tasks `done`. 2026-09-02, one session, `gated` mode.**

### Outcome

| Task | Status | Attempts | Reviewer |
| --- | --- | --- | --- |
| T-01 — define `--ac-warning-1`, register in §7.1 | `[x]` | 1 | PASS |
| T-02 — 8 call sites to the token | `[x]` (superseded at 2 sites) | 1 | PASS |
| T-03 — assertions + R3 validation role | `[x]` | 1 | PASS |
| T-04 — make the 2 borders render (Pivot) | `[x]` | 1 | PASS |
| *(follow-up)* R3 comment repointed after the doc correction | — | 1 | PASS |

**Five Reviewer rounds, five PASSes, all on the first attempt. Zero rework, zero HALTs.** The two
exceptions that stopped the run were a **budget tripwire** and **two Pivots** — neither an implementation
failure.

### Verification, final

| Check | Result |
| --- | --- |
| Route suite | `npx jest --testPathPattern innovation-use --coverage=false` → **237 / 237** (baseline was 230) |
| Full client suite | `npm test -- --silent` → **317 suites / 6793 tests passing** |
| Coverage | 98.2 / 96.3 / 97.76 / 98.5 (floors 40 / 20 / 45 / 30) |
| Build | `npm run build` clean |
| Lint | `npm run lint -- --quiet` clean |
| Hex literals | zero in all touched templates and spec files, comments included |
| Human visual | **2 frames, both sites, both mechanisms, both states** |

### Budget, final

| Metric | Expected | Actual |
| --- | --- | --- |
| Tasks | 3 | **4** (T-04 from the Pivot) |
| LOC (code + `docs/ux-ui`) | ~40 | **+300 / −14** |
| Review rounds | 1 | **1 per task** (5 total, zero rework) |

Overrun **escalated, not absorbed**, and accepted by the user. Composition: 13 lines of production
change (2 token definitions, 1 doc row, 8 class swaps, 2 `[style]` bindings) against ~290 lines of test
and comment. **The estimate's defect was that it priced the acceptance criteria at zero** — `design.md`
§8 costed `DD-9` plus "1 updated assertion" while `tasks.md` demanded eleven more assertions by name.

### What this run actually produced

The token change was trivial. **The value was in what the process caught.**

1. **`DD-8` — a new defect class the repo did not have a name for.** A generated, correctly-placed
   utility class that loses the cascade and paints nothing. Silent in a way `D-3` (a misspelled token) is
   not: a typo at least leaves a name a grep can flag.
2. **`DD-10` — a rule for the whole codebase.** Never colour a PrimeNG element's border with a Tailwind
   utility; PrimeNG's CSS is unlayered and beats `@layer utilities` unconditionally. Use an `[style]`
   object binding.
3. **`AR-1` corrected in both directions** — the dark-mode claim was false for 3 of 8 sites, and the
   SC 1.4.11 clause was measuring borders that did not exist.
4. **The human gate paid for itself twice.** AC.10's failure produced the Pivot; AC.8's second frame
   closed a negative-case gap the unit tests could only approximate.

### Kaizen candidates for `/akili-archive`

| # | Candidate | Evidence from this run |
| --- | --- | --- |
| 1 | **Asserting a mechanism's *observability* without running the observation.** `KZ-017`'s sharpest recurrence yet: the Leader corrected `DD-4` for "verified generation, claimed rendering" and, **in the same edit, citing `KZ-017` by name**, wrote "verified inline styles win, claimed jsdom can read them back". Knowing and naming the lesson did not prevent it. | `DD-4` → `DD-10`; the four-site correction |
| 2 | **Price the budget from `tasks.md`'s AC list, not `design.md`'s decision rows.** Both are written in the same `/akili-specify` pass, so the decision log looks complete while the AC list is where the work lives. | 205 LOC vs ~40, with T-01/T-02 exactly on budget |
| 3 | **A backward correction sweep must match the ID *with* its spec path.** Spec IDs are not globally unique: `AR-1`/`DD-5`/`OQ-3`/`RB-1` returned 82 hits across `docs/`, **none** referencing this spec. A naive sweep is ~100% false positives and could invite an edit to another spec's decision row. | The `RB-5` closure sweep |
| 4 | **A quoted human observation can be disqualified while its attached artifact discharges the criterion.** *"ahora si se ve bien"* is precisely the phrasing the disqualifier rejects; the screenshot is what proved the case, and it answered questions the observer was never asked. Evidence rules should name the artifact, not only the sentence. | AC.8, both frames |
| 5 | **An Implementer's evidence can be sound in conclusion and wrong in argument.** The `T-04` K-004 falsifier "proved" per-site discrimination; it did not (the other site was inactive in that state). Only an independent auditor separated the two — the case against ever collapsing the Reviewer gate for efficiency. | `T-04` Reviewer, concern 1 |

### Outstanding — outside execution, user-owned

| # | Item |
| --- | --- |
| `RB-3` | Engineering-lead formal sign-off on adding a colour family to §7.1, if process requires it (`DR-3` flagged it as possibly owed) |
| `RB-1` / `RB-5` | The design-system ticket for the amber's contrast, now scoped to **both** themes. **The dark-mode deviation ships documented but ungateable** — every R3 constant is a light-theme value |
| `RB-4` | **Still binding: this branch is not PR-ready as T-02 alone.** T-02 + T-03 + T-04 merge together or not at all |
| Advisory | `docs/specs/innovation-use/OPEN-ITEMS.md` does not know about `RB-5`; adding it was outside the approved scope |
| Blast radius | **Any Tailwind `border-*` on any PrimeNG element app-wide is inert** by `DD-10`'s mechanism. `DR-2` scoped this spec to Innovation use, so a repo-wide audit needs its own proposal |
