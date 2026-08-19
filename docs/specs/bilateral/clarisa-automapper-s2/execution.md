# Execution Log — bilateral / CLARISA ↔ AGRESSO Auto-Mapper (S2)

## 1. Document Control

- **Spec path:** `docs/specs/bilateral/clarisa-automapper-s2`
- **Spec id:** 2026-08-clarisa-automapper-s2
- **Module:** bilateral — server (`server/researchindicators`) + client (`client/research-indicators`)
- **Approval Mode:** `gated` (from `proposal.md` Document Control) — every continue/pause gate stops for the user
- **Budget (design §14):** 7 tasks · ≈ 620 LOC · 2 review rounds · 2 PRs
- **Branch:** `JuankCadavid/AC-1676`
- **Leader model tier:** T1 · **Implementer:** `akili-implementer` wrapper (T2) · **Reviewer:** `akili-reviewer` wrapper (T3, read-only, ≠ Implementer)
- **Log opened:** 2026-08-19

---

## 2. Pre-dispatch resolutions (Leader, before any Implementer was spawned)

Two blockers were found during Step 0/2.1 context loading and resolved with the user
**before** the first dispatch. Neither consumed a rework attempt; neither is a Pivot
(no approved task was executed and found unviable — the contradiction was visible in
the spec text itself).

### PR-1 — T-01 contradicted already-shipped S1 code → **spec amended (DD-9)**

- **Date:** 2026-08-19
- **Discovered by:** Leader, reading `…/bilateral-project-mapping/utils/external-code.util.ts` before composing the T-01 brief.
- **The contradiction.** `tasks.md` T-01 and `design.md` §2.1/§5 named a **new** function
  `stripCentrePrefix()` performing an **open** `[A-Za-z]-` strip, and `requirements.md`
  R-CAM-001 AC.1 stated the same. But S1 had already shipped a strip **in the very file the
  design named as *the* definition site**: `normalizeExternalCode()`, which strips a **closed
  set** `{B-, C-}` after trim + upper-case. The closed set is deliberate — S1 DD-4, quoted in
  the source: *"Closed set by design: unknown prefixes like 'X-' must pass through unchanged
  to avoid converting unresolved codes into silent false-positive matches."*
- **Why it could not be passed into the loop.** All three resolutions were spec violations:
  writing `stripCentrePrefix` alongside `normalizeExternalCode` is two strips in one file — the
  **exact NFR-CAM-003 violation** the spec exists to prevent (and the K-005 / KZ-013 drift it
  cites); refactoring `normalizeExternalCode` to the open form **changes shipped archived-spec
  behaviour** that `requirements.md` §3 lists as out of scope.
- **Evidence that the closed set is sufficient, not a concession.**
  - `requirements.md` §4.1 measured the eligible cohort's prefixes at `{B: 53, C: 145}` — **100%** covered.
  - The two forms produce **identical** output on every named input T-01 listed (`C-D514`, `B-A1080`, `D514`, `C-D-514`, `''`/null). They diverge only outside `{B-, C-}`, measured at **zero** in the cohort.
  - `proposal.md` §K-005 already said it: *"Reuse S1's `external-code.util.ts` — do not re-implement the strip."* Requirements and design had drifted from the proposal, not from reality.
  - **Backward sweep corroborates.** `archive/2026-08-19-bilateral--clarisa-fixture-stub` describes S2's premise as the closed `{B-, C-}` set in four separate places (`proposal.md` §5, §47; `requirements.md` §62, §461), including *"exactly the `{B-, C-}` prefixes S2 specifies — 145 `C-`, 53 `B-`"*. The `[A-Za-z]-` wording was the outlier across the whole document set.
  - The same archive's `archive-summary.md` §137 raises `A-AG10156` (AfricaRice) to *"S2's owner"* as a moved premise. Under the closed set that code passes through **unchanged** and lands in `unresolved` — diagnosable — instead of false-matching a contract `AG10156`. The amendment strengthens that case rather than weakening it.
- **User decision (2026-08-19):** *Reuse shipped closed-set.* No new function; T-01 becomes spec-extension work only.
- **Amendment applied** (correction-closure, two-direction sweep per `/akili-specify`):
  | File | Change |
  | --- | --- |
  | `requirements.md` | AC.1 rewritten to the closed set + a dated amendment note carrying this rationale; NFR-CAM-003 Target and How-verified now name `normalizeExternalCode` and add a "no second strip" grep |
  | `design.md` | §2 diagram, §2.1 composition row, §5 step 3, §10 testing row repointed; **DD-9** added to the decisions log |
  | `tasks.md` | T-01 retitled and rescoped ("writes NO new function"); named-inputs table extended from 5 to **7** rows with a *why it falsifies something* column; §4 LOC for the util `25 → 0`; total `645 → 620`; coverage-closure rows and the dependency graph relabelled |
  - **Forward sweep:** `grep stripCentrePrefix` → 0 survivals outside the two prohibition sentences; `grep A-Za-z` → 0 survivals outside the two falsifier sentences.
  - **Backward sweep:** `grep clarisa-automapper-s2` across `docs/` → 10 hits, all in archived specs, all consistent with the closed set. No document was made false by the correction.
- **New falsifier added (KZ-001).** T-01's original 5 inputs **cannot distinguish the two designs** — they agree on all of them, so the suite would have been green against either. Row 6 (`A-1234` → `A-1234`, unchanged) is now the gate that discriminates, plus row 7 (`  c-d514  ` → `D514`) for the trim/upper-case half of the shipped contract.

### PR-2 — T-00 had no scratch schema → **disposable container authorized**

- **Date:** 2026-08-19
- **Environment pre-check** (`/akili-execute` Step 2.1, run before dispatch):
  | Check | Result |
  | --- | --- |
  | `server/researchindicators/.env` | symlink → the main checkout's `.env` (per standing note: worktrees carry only `.env.example`) |
  | `ARI_MYSQL_*` (the CORE target `migration:dev:execute` uses) | `192.168.20.210` / `alliancereportingdb` — the **shared on-prem Dev DB** |
  | Docker daemon | **up** |
  | Migrations on disk | 308 |
- **The gap.** T-00's verification said *"against a scratch schema"*. **No scratch schema exists.**
  Run as written, `migration:dev:execute` + `migration:revert` would have applied and rolled back an
  enum change **on the shared Dev database** — which root `CLAUDE.md` §4.3 makes an explicit human
  decision, not an Implementer's.
- **Why it could not simply be deferred** (`.agents/leader.md` → *Deferring a check*): K-006 is this
  repo's own record of a migration that shipped **unrunnable** while passing every static gate it has.
  Execution is the only gate for T-00, so the assumption to falsify was *"there is nowhere safe to run
  it"* — and the docker probe falsified it in one command.
- **User decision (2026-08-19):** *Throwaway MySQL container.* Resolved commands written into
  `tasks.md` T-00's verification block (inline env only — `.env` is never edited), plus a new done-check
  row asserting `192.168.20.210` was not touched.

---

## 3. Task Execution History

_(appended per task, on Reviewer PASS or on HALT)_
