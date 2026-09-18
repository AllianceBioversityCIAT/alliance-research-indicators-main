# Kaizen Entry — quick/innovation-use-visual-alignment (batch of 4)

> **Outcome.** Four `/akili-quick` changes aligned Innovation use details with innovation-dev's
> visual treatment. Three of them accepted a WCAG AA shortfall. The retrospective's finding is not
> that the exceptions were wrong — they were human-decided and pinned — but that they were justified
> against **DD-17, a decision that exists only inside archived specs**, while the **live**
> constitution still asserts a contrast floor the code no longer meets in three roles.

## Document Control

| Field | Value |
|---|---|
| Spec Path | *(none — batch of 4 `/akili-quick` slugs, no spec folder by design)* |
| Covered slugs | `quick/innovation-use-add-button-style`, `quick/innovation-use-eyebrow-grey`, `quick/innovation-use-comment-chip-style`, `quick/innovation-use-level-fill` |
| Date | 2026-09-03 |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Branch Context | **Spec branch** (default = `main`, resolved via `origin/HEAD`; no `Default Branch:` pin exists) |
| Archive Run | 1 |
| Approval Mode | gated — no shared file written; every proposal recorded as a pending item |

**Why there is no archive.** `/akili-archive` could not run: it moves a spec folder, and
`docs/specs/quick/` holds only `quick-log.md`. `/akili-quick` deliberately creates no
`requirements.md` / `design.md` / `tasks.md`. This retrospective is the part of the archive flow
that does apply.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Quick changes recorded | 4 | `docs/specs/quick/quick-log.md` — 2026-09-03 |
| Escalations to a full spec | 0 | — |
| Blocking HITL questions | 2 (Add-button colour; chip icon choice) | session transcript |
| **Accepted WCAG AA exceptions** | **3** — 3.84:1, 2.91:1, 3.84:1 | quick-log + pinned tests |
| Live constitutional lines contradicted | 2 — `docs/ux-ui/design.md:481`, PRD **C-4** (`docs/trd/trd.md:519`) | grep, this pass |
| Latent test defects found & fixed | 1 (negative-filter cohort) | `innovation-use-details.component.spec.ts` |
| Tests rewritten to pin exceptions | 5, across 2 spec files | commits `e8683935`, `6e850f7b`, `7f41a2e5` |
| Gates proven able to fail (K-004) | 3 of 3 changes that touched tests | falsification probes, this session |
| Suite status at close | 237/237 (`innovation-use`) | `npx jest --testPathPattern innovation-use` |
| Reviewer FAILs / HALTs / Pivots / PRODUCT_BUGs | — *(not applicable: quick flow produces no `execution.md` / `test-report.md`)* | — |
| Drift attributable to this batch | none recorded | `docs/specs/audits/` **empty**; legacy `docs/specs/drift-report.md` is the fallback source |

## Lessons

- **KZ-quick--innovation-use-visual-alignment-1 — Three accepted AA exceptions cite an archived
  decision, so the live constitution still asserts a floor the code no longer meets.** (Product, **High**)
  - **Root cause.** Each exception was justified against **DD-17**, which exists *only* under
    `docs/specs/archive/` (`2026-09-02-changes--innovation-use-validation-warning-color/execution.md`,
    `2026-08-26-innovation-use--details-page/design.md`) — frozen history that no live document
    inherits. The constraint the changes actually breach is live and unqualified:
    `docs/ux-ui/design.md:481` ("token combinations chosen so body text ≥ 4.5:1, large text & UI
    icons ≥ 3:1") and PRD constraint **C-4** (WCAG 2.1 AA minimum). Because the reasoning pointed at
    the archive, the live pair was never touched, and the *only* record of the three exceptions now
    lives in test comments and `quick-log.md` — neither of which any AKILI command reads as
    constitution. A future token sweep reading `design.md:481` will conclude the code is broken.
  - **Evidence.** `docs/specs/quick/quick-log.md` — three 2026-09-03 rows; `docs/ux-ui/design.md:481`;
    `docs/trd/trd.md:519`; `grep -rln "DD-17" docs/specs/` returns archive paths only.
  - **Standardization:** → **P1**

- **KZ-quick--innovation-use-visual-alignment-2 — `/akili-quick`'s "Design-token safe" gate tests
  token *existence*, never decision *consistency*.** (**Methodology** — no local edit owed)
  - **Root cause.** The criterion reads *"any colour/spacing/typography change uses an existing
    approved token … not a new hardcoded value."* All three exceptions used existing approved tokens
    (`--ac-light-blue-300`, `--ac-grey-600`) and so passed the gate cleanly — while reverting a
    recorded accessibility remediation. The gate has no step asking whether the swap violates a
    constraint recorded against that *role*. A token-existence check cannot see a decision
    reversal, which is exactly the class of change most likely to arrive as a "trivial colour tweak".
  - **Evidence.** `/akili-quick` Triviality Gate, "Design-token safe" bullet, vs. the three
    quick-log rows and R3 remediation **F-1** (reversed by `quick/innovation-use-level-fill`).
  - **Standardization:** none locally. **Recommended for upstreaming to the AKILI methodology
    repository:** add a gate criterion that fails a token change contradicting a recorded decision
    on the same role, routing it to `/akili-propose` or to an explicit exception record.

## Noted, not a lesson

- **`prettier --check` fails on `innovation-use-details.component.html` and its spec on clean
  `HEAD`** (verified by `git stash`, 2026-09-03). Pre-existing, not introduced here — but it means
  prettier cannot serve as a gate for any change in these files, and `--write` would balloon a
  3-line diff. Feeds the recurrence check.
- **innovation-dev hardcodes hex throughout** (`text-[#8D9299]`, `border-[#1689CA]`,
  `bg-[#F4F7F9]`), violating the client guide's "no hex literals in components" rule — yet it is the
  visual reference these four changes were asked to match. The compliant section is chasing the
  non-compliant one.
- **No automated gate in this repo asserts a border colour, an icon colour, or vertical alignment.**
  `quick/innovation-use-comment-chip-style` is therefore verified only by template compile + a human
  browser check. Below the lesson bar; relevant if visual regressions recur.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` (§10 Accessibility, at the contrast bullet, line ~481) |
| Edit | Append: "**Accepted exceptions (Innovation use details, 2026-09-03, human-decided):** the three Add-other buttons and the stepper's selected fill measure **3.84:1** (`--ac-light-blue-300`), and the ACTOR #/ORGANIZATION # eyebrows **2.91:1** (`--ac-grey-600`), all below the 4.5:1 floor and adopted for cross-section consistency with innovation-dev. Pinned in `innovation-use-details.component.spec.ts`; see `docs/specs/quick/quick-log.md`." |
| Severity | **High** |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-001` (**`staging` lineage** — cite the lineage, not the bare ID) |
| Edit | Recurrence +1 (this batch): a cohort filter that identified the stepper's *unselected* digits by the **absence** of the selected variant's class stopped discriminating the moment that class changed — it would have reclassified the selected button as unselected and asserted the wrong text token against it. Fixed by keying positively on `bg-[var(--ac-white-1)]`, the class the unselected branch actually sets. Same root cause as KZ-001: a gate that no longer evaluates what it stands in for. |
| Severity | **Critical** (unchanged — recurrence raised, not the severity) |
| Status | pending |

**No `guide-sync`, `factual-sweep`, or `trd-adr` items.** No module gained or diverged in
conventions; the root and client guides carry no claim this batch falsified (the "no hex literals"
rule stayed satisfied — every change used tokens); and the TRD holds no accessibility ADR to
supersede (`grep` over `docs/trd/trd.md` returns only constraint **C-4**, which P1's target
document is the right home to qualify).
