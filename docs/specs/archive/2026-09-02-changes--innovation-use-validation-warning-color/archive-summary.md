# Archive Summary — Innovation Use validation warning colour

**Outcome: delivered and human-verified.** Innovation use's inline field validation now renders in a
registered `--ac-warning-1` token instead of `var(--ac-red-1)`, matching the treatment every other STAR
form uses. Along the way the spec found and fixed a defect class the repo had no name for: **two of the
eight sites had never rendered a coloured border at all**, in any colour, because a Tailwind utility
cannot beat PrimeNG's unlayered CSS.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path (original) | `docs/specs/changes/innovation-use-validation-warning-color` |
| Archive path | `docs/specs/archive/2026-09-02-changes--innovation-use-validation-warning-color` |
| Archive date | 2026-09-02 |
| Type | **Change** · Depth **Lite** |
| Module | client — `innovation-use-details` |
| Owner | D. Casañas |
| Approval Mode | **gated** |
| Branch | `AC-1679-Create-the-innovation-use-section` (**not** the default branch) |
| Escalated from | `/akili-quick` — failed the triviality gate on *new design token* + *scope* |
| Final status | **Complete**, with two user-owned follow-ups outside execution |

## 2. Final status

| Task | Status | Attempts | Reviewer |
| --- | --- | --- | --- |
| T-01 — define `--ac-warning-1`, register in `docs/ux-ui/design.md` §7.1 | `[x]` | 1 | PASS |
| T-02 — 8 call sites to the token | `[x]` (superseded at 2 sites by T-04) | 1 | PASS |
| T-03 — realign assertions, extend the R3 WCAG harness | `[x]` | 1 | PASS |
| T-04 — make the 2 borders actually render (**from a Pivot**) | `[x]` | 1 | PASS |
| *(follow-up)* repoint the R3 comment after the doc correction | — | 1 | PASS |

**Five Reviewer rounds, five first-attempt PASSes. Zero rework attempts, zero HALTs, zero FATAL_FAILs.**
The two events that stopped the run were a **budget tripwire** and **two Pivots** — neither an
implementation failure.

## 3. Requirements delivered

| ID | Title | Delivered by |
| --- | --- | --- |
| `R-IUW-001` | A registered warning-colour token exists | T-01 |
| `R-IUW-002` | Inline field validation renders in the warning token | T-02 (6 text sites) · **T-04** (2 border sites) · T-03 (assertions) |
| `NFR-IUW-001` | Token discipline — zero hex literals | T-02 · T-03 · T-04 |
| `NFR-IUW-002` | Visual parity with the shipped pattern | T-03 AC.10 (**failed**, produced the Pivot) → T-04 AC.8 (**discharged**, 2 frames) |

Every `AND IT MUST` / `BUT it must NOT` clause in `R-IUW-002`'s three scenarios is discharged by a named
task — see `tasks.md` §3.

## 4. Files changed

Production change is **13 lines**; the rest is test and comment.

| File | Change |
| --- | --- |
| `client/.../src/styles/colors.scss` | +2 — `--ac-warning-1: #e69f00` in `:root` and `[data-theme='dark']`, identical values (`DD-5`) |
| `docs/ux-ui/design.md` | +1 — the `Warning` row in §7.1's authoritative token table |
| `.../innovation-use-details.component.html` | 2 sites (`107`, `147`) |
| `.../innovation-use-actor-item.component.html` | 4 sites (`3`, `41` text; `34`, `52` → **`[style]` bindings**) |
| `.../innovation-use-organization-item.component.html` | 1 site (`3`) |
| `.../innovation-use-level-stepper.component.html` | 1 site (`4`) |
| `.../innovation-use-actor-item.component.spec.ts` | +122/−5 — realignment, negative guards, `c8b` block |
| `.../innovation-use-details.component.spec.ts` | +168/−1 — `:114`/`:249` paired guard, R3 validation role + exception, realignment |

**Commits** (9, all `[SPEC:changes/innovation-use-validation-warning-color]`, none pushed):
`575483b8` · `6e33707f` · `fd563498` · `405908b1` · `dc82ca1a` · `9917cd76` · `39fd519c` · `094e7e0c` ·
`3f3f5c1f` · `fe97be5a`

The `$colors` Sass map was deliberately **not** extended (`DD-6`) — no call site needs an
`.abc-*`/`.atc-*` class.

## 5. Test evidence

**`test-report.md` was not produced — `/akili-test` never ran, and its absence is explicitly accepted by
the user (2026-09-02).** What stands in its place:

| Check | Result |
| --- | --- |
| Route suite | `npx jest --testPathPattern innovation-use --coverage=false` → **237 / 237** (baseline 230) |
| Full client suite | `npm test -- --silent` → **317 suites / 6793 tests passing** |
| Coverage | 98.2 / 96.3 / 97.76 / 98.5 vs floors 40 / 20 / 45 / 30 |
| Build | `npm run build` clean |
| Lint | `npm run lint -- --quiet` clean |
| Hex literals | zero across all touched templates and spec files, comments included |
| Spec type-check | `npx tsc -p tsconfig.spec.json --noEmit` — no new errors |

**Every new gate was observed FAILING before being cited** (`K-004` / `KZ-014`): the `D-3` token
cross-check was reddened with a deliberate `--ac-warning-l` typo; T-03's five new assertions were
reddened by four independent mutations plus one self-contradictory pair; T-04's inline-style assertion was
reddened by reverting the binding. All files restored byte-identical and re-run green each time.

**Accepted gap — `author ≠ tester`.** In T-03 and T-04 the same agent wrote the production change and its
tests. Reviewers audited the tests independently (and corrected the Implementer's own falsification
reasoning in T-04), but auditing a test is not re-deriving it from the requirements. Recorded as an
accepted risk, not an omission.

## 6. Validation summary

**`validation-report.md` was not produced — `/akili-validate` never ran, and its absence is explicitly
accepted by the user (2026-09-02).** What stands in its place: five independent Reviewer rounds, each
performing per-AC closure against `requirements.md` at source, plus two human visual gates.

**No unresolved FAIL findings.** The one criterion that failed — `T-03` AC.10 — was resolved through the
Pivot Protocol and is discharged by `T-04` AC.8.

The residual gap: no single pass audited the whole spec at once. Each Reviewer saw only its own task.

## 7. Accepted warnings and follow-ups

| # | Item | Owner |
| --- | --- | --- |
| `RB-1` / `RB-5` | **The amber fails AA in both themes.** Light: 2.09:1 / 2.25:1. Dark: 6.29:1 on the card (passes) but **≈1.79:1** on `--ac-white-1` — worse than light — for `details:107,147` and `stepper:4`. Accepted per `DR-1` (fixed brand value, out of this change's authority) and recorded as an executable exception in the R3 harness (`DD-9`). **The design-system ticket is owed and must cover BOTH themes.** | User |
| `RB-3` | Engineering-lead formal sign-off on adding a colour family to §7.1, if process requires it (`DR-3`) | D. Casañas |
| `RB-4` | **This branch is not PR-ready as T-02 alone.** T-02 + T-03 + T-04 merge together or not at all — T-02 alone ships a live, undetectable `C-4` deviation | Leader / D. Casañas |
| Residual | **The dark-mode deviation ships documented but ungateable.** Every constant in the R3 block is a light-theme value, so no assertion in this repo can redden on it. This is `D-7` reopened on the dark axis, accepted knowingly | User |
| Blast radius | **Any Tailwind `border-*` utility on any PrimeNG element app-wide is inert** by `DD-10`'s mechanism. `DR-2` scoped this spec to Innovation use, so a repo-wide audit needs its own proposal | — |
| Advisory | `docs/specs/innovation-use/OPEN-ITEMS.md` does not know about `RB-5`; adding it was outside the approved scope | — |

Budget overrun (4 tasks / +300 LOC vs 3 / ~40) was **escalated, not absorbed**, and accepted by the user.

## 8. Historical notes

### The two Pivots are the story

**Pivot 1 — `AR-1`/`DD-5`'s dark-mode claim was false for 3 of 8 sites.** `AR-1` read *"Dark mode passes
at 6.29:1; the failure is light-mode only."* True on the dark card, false on `--ac-white-1`. Resolved as
option A: correct the record, keep the value. `OQ-3` reopened, then answered by decision rather than
closed by measurement.

**The provenance is the lesson.** `proposal.md` was *precise* — *"6.29:1 on the dark **card**"*. The
imprecision entered **downstream**, when `requirements.md` generalised it to *"the failure is light-mode
only"*, and `DD-5` inherited the generalisation and built a decision on it. Nobody wrote a wrong number;
someone dropped a **qualifier**.

**Pivot 2 — `DD-4` falsified: two sites had never rendered a border.** PrimeNG injects
`.p-select`/`.p-inputtext` border rules **unlayered** (`app.config.ts` never sets `cssLayer`), Tailwind v4
emits every utility inside `@layer utilities`, and unlayered author CSS beats layered unconditionally. The
class was generated, correctly placed, and **inert** — and the pre-change red was equally inert, so the
spec inherited the defect rather than causing it.

`DD-4` had declared this risk *"closed, not deferred"*. Every factual statement in its rationale is true;
it even fetched a remote stylesheet to rule out interference. It asked *"will the class be generated?"*
and never asked *"will the class win the cascade?"* — **`KZ-017` in the design phase.**

### The human gate paid for itself twice

Seven automated gates passed over the border defect, **every one of them correctly**: the grep found the
token name (it is there), the cross-check found the token defined (it is), the assertions found the class
on the element (it is), and jsdom paints nothing. The assertion proved the token **won the attribute**;
nobody proved it **won the cascade**. Only `AC.10`'s human check separated the two.

Then `AC.8`'s second frame closed a gap the tests could only approximate: with a valid `Actor type` the
select renders **no** border, confirming the ternary's empty branch in a real browser — previously proven
only by jsdom negatives whose global scope the T-04 Reviewer had flagged as imprecise.

### Two Leader errors, recorded rather than buried

1. **`KZ-017` recurred inside its own correction.** Correcting `DD-4` for *"verified generation, claimed
   rendering"*, the Leader wrote — **citing `KZ-017` by name in the same edit** — that
   `element.style.border` is readable in jsdom. It is not: `cssstyle@2.3.0` drops the whole shorthand for
   a `var()` colour. The claim propagated to four sites, including the Pivot option text the user chose.
   All four corrected.
2. **A briefing error sent T-04 against an incomplete file list.** The brief said "two files only"; T-03's
   R3 block asserted the same dead class, so `AC.7` was unreachable without a third. The Leader had seen
   that code hours earlier and did not grep for it. The Implementer surfaced the conflict instead of
   silently violating either constraint.

### What the spec produced beyond its own scope

- **`DD-10`** — a codebase-wide rule: never colour a PrimeNG element's border with a Tailwind utility; use
  an `[style]` object binding (inline style outranks every stylesheet rule). The fix deliberately uses
  `var(--ac-warning-1)` where the codebase exemplar hardcodes `#E69F00`, so it is *more* compliant than
  the pattern it imitates.
- **`D-8`** — a named defect class: a generated, correctly-placed utility class that loses the cascade and
  paints nothing. More silent than a misspelled token, which at least leaves a name a grep can flag.
- **A corrected `AR-1`** — now the single home of this spec's contrast figures, carrying its deriving
  method and three independent derivations.

## 9. References

- Kaizen entry: [`docs/specs/kaizen/changes--innovation-use-validation-warning-color.md`](../../kaizen/changes--innovation-use-validation-warning-color.md)
- Audit trail: `execution.md` — Pivot Records, both human observations, budget reconciliation
- Predecessor: [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../2026-08-26-innovation-use--details-page/) — this spec amends its `DD-7` rationale and resolves its `OQ-IUP-4`
- `docs/ux-ui/design.md` §7.1 (the token's registered home), §10 (accessibility)
