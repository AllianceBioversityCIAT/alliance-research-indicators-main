# Kaizen Entry — innovation-use/details-page

## Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/innovation-use/details-page` |
| Date | 2026-08-26 |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Branch Context | **Spec branch** — default is `main` (`origin/HEAD` → `origin/main`); no `Default Branch:` pin exists in the root guides. **No shared file was written.** Every item below is `pending` |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | **14** (13 + `T-14` by Amendment 01) | `tasks.md` |
| Done criteria | **120**, all discharged | `tasks.md` |
| Review rounds | **23** of ~31 budgeted (24 with `RB-9`) | `execution.md` — `T-13` c10 |
| Reviewer FAIL rework attempts | **9 tasks needed ≥ 2 rounds**; `T-08` took 3 (the ceiling); `T-09` attempt 1 FAILed on a whitespace silent block | `execution.md` — task entries |
| HALTs / FATAL_FAILs | **0** | `execution.md` |
| Runtime non-delivery | **1** — the Phase 4/6 auditor's first turn died on an API error; recorded as non-delivery and **resumed**, not re-spawned, and the Leader did **not** substitute itself | `validation-report.md` §1 |
| Pivots | **4 Pivot Records** (`T-10` c4 self-contradiction · `T-13` create-result allowlist · `R-IUP-006`/`T-09` guard deleted underneath the spec · `DD-16` invalid id source), yielding **4 pivot fixes** totalling **215 LOC, 3.5% of the run** | `execution.md` — `## Pivot Record` blocks |
| PRODUCT_BUGs | **n/a** — no `test-report.md`; `/akili-test` was never run as a separate phase | — |
| Judgment-day severe findings | **3 closed at decomposition** (`S-3`, `I-4`, `I-6`); `I-2`/`I-3`/`I-5` left open by explicit user scope decision | `judgment.md` |
| Validation FAIL / WARN | **5 FAIL / 14 WARN / ~30 advisory** → re-issued **0 FAIL / WARN** | `validation-report.md` |
| Findings against the remediation itself | **8** (1 High, 4 Medium, 3 Low) — all upheld, all closed | `execution.md` — *Independent audit of `R4`/`R5`* |
| LOC | **6,133** actual vs ~3,400 written / ~4,800 re-baselined — **+80.4% / +27.8%**. Tripwire breached, ruled on by the user **three** times, not re-escalated | `execution.md` — `T-13` c10 |
| Drift attributable to this spec | **Not measured** — `docs/specs/audits/` does not exist and `docs/specs/drift-report.md` predates this spec. Blank row, not a blocker |

## Lessons

- **KZ-innovation-use--details-page-1 — A correction was applied at the site it cited and not at the sites it falsified, including the ones it created.** (**Product + Methodology**, **High**)
  - **Root cause (5W1H).** `/akili-specify`'s *Correction Closure* rule sweeps **forward** (sites the finding did not cite) and **backward** (documents citing the corrected section). Both sweeps assume the corrected text is *narrower or equal* to the original. **Neither sweep looks at what a correction removes.** So when `R5` narrowed `OQ-IUP-8` from a broad scope statement to *"`.description` and nothing else"*, the forward sweep found no surviving false assertion — correctly — while the narrowing silently **dropped `.section-title` (2.378:1, four sites in this section)**, a live AA failure that `F-1`'s own ratio table had named. For one commit, a defect a FAIL verdict had already raised was owned by nothing.
  - **The same shape produced 4 of the 8 audit findings**, which is what makes it a lesson rather than a slip: `N-1` (coverage dropped by a narrowing), `N-2` (a ratio kept after its only site was struck), `N-4` (two corrections recorded in one block and not applied at the six sites they falsify), `N-5` (a "single home" claim restated at six sites, one of which asserted the number and denied restating it in the same sentence).
  - **And it is self-demonstrating:** the commit that closed `F-3`/`F-4` — findings *about* uncorrected figures — reproduced the defect it was closing. `N-3` is the sharpest instance: `T-13`'s review-round value was **carried forward from the very table the new one claimed not to carry forward from**.
  - **Evidence:** `execution.md` — *Independent audit of `R4`/`R5`*, findings `N-1`…`N-5`; `validation-report.md` §8; commits `b1dc2f23` (the defect) and `c34ec73e` (the repair).
  - **Standardization:** → **P1** (Product) and → **P2** (Methodology, upstream).

- **KZ-innovation-use--details-page-2 — `author ≠ auditor` degraded from enforced to merely instructed, silently, twice, because of the working directory.** (**Product + Methodology**, **High**)
  - **Root cause.** The Step 8E wrappers (`akili-implementer` → sonnet, `akili-reviewer` → opus with a **read-only tool allowlist**) and the `akili-tasks-gate.sh` PreToolUse hook live in `.claude/` at the monorepo root. A session launched from a **sibling repo** or a subdirectory resolves the spec path by search — so the run *looks* correct and produces correct-looking output — while the wrappers and the hook are **never loaded and never announce it**. `author ≠ auditor` and evidence-before-checkbox silently fall back from *enforced by configuration* to *requested in a prompt*.
  - **Why it is High, not friction.** The reviewer persona's own text says the read-only allowlist exists *"so `author ≠ auditor` holds by configuration and not only by this instruction"*. When the allowlist does not load, the single mechanism the methodology relies on to keep an auditor honest is the prompt — and a prompt is exactly what a compromised or confused agent ignores. **It recurred:** `T-14` and the `R4`/`R5`/re-validation session both ran degraded.
  - **Evidence:** `execution.md` — `T-14` *Environment deviation, recorded because it changes what was enforced versus instructed*, and *`R4`/`R5`* Document Control; `validation-report.md` §1 *Environment deviation*.
  - **Standardization:** → **P3** (Product) and → **P4** (Methodology, upstream).

## Noted, not a lesson

- **The budget overrun is not a lesson and should not become one.** +80.4% on LOC with review rounds finishing **under** at 74% is a *sizing* error in `design.md` §12's ~1,500-line spec estimate, not a process defect: the eight tasks that recorded a tier split account for ≥ 3,408 spec lines by themselves. The user ruled on it three times with full information. Recorded so a future retrospective does not rediscover it as novel.
- **`/akili-test` was never run as a separate phase**, so this spec has no `test-report.md` and `/akili-validate` verified coverage directly. It worked, but it means the Tester persona's `PRODUCT_BUG` mechanism — AKILI's Jidoka, stop-the-line — was never available to this spec. Below the bar alone; feeds the recurrence check.
- **Four Pivot Records in one spec.** Each was individually correct (the spec was factually wrong four times, and saying so beat forcing an implementation to match it), and together they cost only 3.5% of the run. But four is high, and three of the four trace to *the same class of error*: a claim about code that was written without reading the code. Watch for a fifth.
- **The delta-scoped re-validation carried forward 19 requirements' verdicts untested.** A deliberate, user-approved economy. Recorded because "carried forward" and "verified" are not the same word, and only this note preserves the difference after archiving.

## Pending Items

> **All items are `pending`.** This retrospective ran on a spec branch, so nothing outside this file was written. They await the apply phase on `main` — *"apply pending kaizen standardizations"*.

### P1

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | **Correction Closure has a third sweep: what did this correction *remove*?** A correction that narrows a scope must state what it drops and name the new owner of each dropped item, or it is not applied — it has relocated a defect into nobody's hands. |
| Severity | **High** |
| Status | `pending` |

### P2

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | **Upstream — AKILI methodology repo**, `/akili-specify` → *Correction Closure* (no local edit) |
| Edit | Add the removal sweep to Correction Closure alongside the forward and backward greps: *a narrowing correction must enumerate what left scope and where it went.* The current two sweeps only detect surviving false text, never coverage silently dropped. |
| Severity | **High** |
| Status | `pending` |

### P3

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | root `CLAUDE.md` — §4.3 |
| Edit | **AKILI sessions must be launched with cwd = the monorepo root.** The `.claude/agents/akili-*` wrappers and `.claude/hooks/akili-tasks-gate.sh` load from the root only; from a sibling repo or a subdirectory the spec path still resolves, so a degraded run is indistinguishable from a correct one. Any command that cannot see them must record the degradation in `execution.md` before delegating. |
| Severity | **High** |
| Status | `pending` |

### P4

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | **Upstream — AKILI methodology repo**, `.agents/leader.md` (no local edit) |
| Edit | Make the Leader **assert wrapper availability before the first delegation** and refuse to claim `author ≠ auditor` when the wrappers are absent — the guarantee is a configuration property, and a role that cannot verify its own enforcement must report it, not assume it. |
| Severity | **High** |
| Status | `pending` |

### P5

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | **`KZ-001`** (staging lineage) |
| Edit | Raise recurrence and add `innovation-use/details-page` as a source, with the variant this run exposed: **a correctly-formed two-argument assertion over an unfaithful double is still a green suite over broken behaviour.** The `VersionWatcherService` double is `{ onVersionChange: jest.fn() }` in all four describe blocks and its captured callback is never invoked — deleting the constructor call leaves the suite green while the page never loads (`validation-report.md` §7, `T-1`). |
| Severity | **Critical** (unchanged) |
| Status | `pending` |

### P6

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | **`KZ-002`** |
| Edit | Raise recurrence and add this spec as a source. **Three occurrences in this run, all the Leader's**, and the durable fix is stated: *before crediting a human observation, state what the check structurally cannot see, and check whether the clause lives there.* `T-13` c7 was closed on *"todo se ve bien"* against a 2.91:1 defect, and c9 on a Tab pass that **structurally skips** a `<div>` with no `tabindex`. |
| Severity | **High** |
| Status | `pending` |

### P7

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | **`KZ-005`** (currently retired as institutionalized) |
| Edit | **Un-retire.** It recurred here in its exact original shape — three divergent running totals (`5,164`, `5,189`, `5,646`) in circulation at once, each correct when written and none retired — and the sharpened rule earned by this run belongs with it: **a derived figure acquires a second home by being superseded and not retired, not only by being wrong.** |
| Severity | **High** |
| Status | `pending` |

### P8

| Field | Value |
|---|---|
| Kind | `guide-sync` |
| Target | `client/research-indicators/src/app/CLAUDE.md` + the parent `## Module Guides` index |
| Edit | Record `shared/components/quantification-item/` as a **shared public surface**: `DD-3` promoted it out of `oicr-details/` and it now has two consumers (OICR details ×2 and the Innovation Use page). Both of its inputs are default-preserving (`fieldsRequired` → `true`, `maxFractionDigits` → `undefined`); **it carries four hex literals and one live AA failure (`RB-5`)** — do not treat its styling as tokenized. |
| Severity | **Medium** |
| Status | `pending` |

### P9

| Field | Value |
|---|---|
| Kind | `factual-sweep` |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | Sweep for claims this cycle falsified, and add the **`Default Branch: main`** pin the constitution summary is missing — its absence is what forced this retrospective's Branch Context through the fallback path. Named specifically: any statement that `.rs-*` / `.fs-*` utilities are provided by an external stylesheet (`RB-9` established they had **no implementation** and `src/styles/responsive-size.scss` was created here), and any client-tier structure list that predates `quantification-item`'s promotion. |
| Severity | **Medium** |
| Status | `pending` |

### P10

| Field | Value |
|---|---|
| Kind | `trd-adr` |
| Target | — *(none; recorded as a deliberate no-op)* |
| Edit | **No TRD/ADR item is owed.** This spec is client-tier only — zero server files, zero migrations — and none of its four Pivot Records overturned an architecture decision recorded in `docs/trd/trd.md` (whose Innovation Use entries, `ADR-11` and the `ADR-6` amendment, came from chunk 1 and are untouched). Recorded rather than omitted so a later reader can tell *considered and empty* from *never run*. |
| Severity | Low |
| Status | `pending` — no action required at apply time |
