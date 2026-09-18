# Kaizen Entry — bugfix/results-center-innovation-use-filter

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bugfix/results-center-innovation-use-filter` |
| Date | 2026-08-24 |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Archive Run | 1 |
| Approval Mode | gated |
| Branch Context | **spec branch** (current ≠ `origin/main`; no `Default Branch:` pin in root guides) |

## Metrics

| Signal | Value | Source |
| --- | --- | --- |
| Tasks executed | 1 | `tasks.md` T-01 |
| Reviewer FAIL rework attempts | 0 | `execution.md` — T-01 attempt 1 PASS |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | n/a (`/akili-test` not run) | — |
| Judgment-day severe findings | **3 confirmed** (C-1, C-2, C-3) + **1 fix-caused** (N-1, severity split) | `judgment.md` |
| Validation FAIL / WARN | n/a (`/akili-validate` not run; owner confirmed on test) | archive-summary §6 |
| `/akili-quick` escalation | no | — |

Execute was a clean run. Specify Judgment Day was not — lessons below come from that gate, not from rework.

## Lessons

- **KZ-bugfix--results-center-innovation-use-filter-1 — A Jest `--testNamePattern` that contains `\|` must not live in a markdown table cell.** (Product + Methodology, Medium)
  - Root cause: CommonMark requires `\|` inside a table cell. Copied into a shell single-quoted string, Jest compiles a regex for a **literal pipe**, runs **zero** tests, and exits 0 — vacuous green (KZ-014 family, distinct mechanism).
  - Evidence: `judgment.md` — Scoped re-judgment 1, N-1; Node probe `new RegExp('onChangeList effect\\\\|onSelectFilterTab')` matches no describe names; closed by moving the command to a fenced `bash` block.
  - Standardization: → P1

- **KZ-bugfix--results-center-innovation-use-filter-2 — An acceptance criterion is not discharged by making a different AC reachable.** (Product + Methodology, Medium)
  - Root cause: DD-5 said R-RCF-001 AC.2 (select → `'indicator-codes-tabs': [6]`) was covered because AC.1 (`able === true`) made `onSelectFilterTab` reachable. Judgment Day: a gap may not be discharged by citing a different requirement. Existing cases covered ids 0 and 1 only.
  - Evidence: `judgment.md` — C-3 (Judge B F-2 SEVERE / Judge A F-3 WARNING); closed by inverting DD-5 and adding `onSelectFilterTab(6)`.
  - Standardization: → P2

## Noted, not a lesson

- C-1 (assert by index / `length === 4` vs fixture expansion) is a recurrence of digest **KZ-001** (linaje `staging`), not a new lesson. → P3
- C-2 (grep “shape” with no committed regex) is KZ-005 / KZ-007 already applied in root `CLAUDE.md` §4.3.
- Leader session shell resolved `npm test` to the repo-root husky package (`Error: no test specified`). Client gates must `cd client/research-indicators`. Friction, not a new rule — child guide already says run from the package root.
- `/akili-test` and `/akili-validate` skipped on a Lite overlay; owner click on test closed D6.

## Pending Items

### P1

| Field | Value |
| --- | --- |
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Testing strategy) |
| Edit | Add: a shell command whose regex contains `\|` (Jest `--testNamePattern`, `rg` alternation) MUST be authored in a fenced code block, never a markdown table cell — CommonMark’s `\|` makes Jest match a literal pipe and exit 0 with zero tests. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
| --- | --- |
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (KZ-016 / testing) |
| Edit | Add: an AC is not discharged by citing a different AC as “now reachable”. Give it its own executable gate, or move it to an accepted-risk D-id. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
| --- | --- |
| Kind | digest-update |
| Target | `KZ-001` (linaje `staging`) |
| Edit | Recurrence +1 from `bugfix/results-center-innovation-use-filter` Judgment C-1: the named `onChangeList` example asserted `able` by array index and `length === 4`; expanding the fixture to include id 6 remapped the sentinel slot. Source spec union this path. |
| Severity | Critical (unchanged; already Critical) |
| Status | pending |
