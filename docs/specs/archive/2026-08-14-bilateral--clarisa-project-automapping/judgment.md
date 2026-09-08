# Judgment Day — `design.md` (S1)

- **Target:** `docs/specs/bilateral/clarisa-project-automapping/design.md` (frozen at draft-1)
- **Mode:** blind dual review, **1 round** (user-requested)
- **Date:** 2026-08-14
- **Judges:** two independent read-only reviewers (`akili-reviewer`, T3), identical scope, neither saw the other's output
- **Author ≠ auditor:** the design was authored by the orchestrating session; judges ran as separate read-only agents

---

## Protocol deviation — recorded, not hidden

Judge B returned a complete verdict. **Judge A never delivered findings** — it signalled idle/available four times across the round and returned no content through the agent return path or through any of **three** direct requests (the last of which offered `NOT COMPLETED — <where you stopped>` as an acceptable answer). The round therefore completed with **one delivered verdict instead of two**.

No inference is drawn about *why*. In particular, Judge A's silence is **not** evidence that it found nothing — an undelivered verdict carries no information in either direction, and must not be read as a second opinion agreeing with Judge B.

The skill's corroboration rule ("fix only severe findings confirmed by both judges") exists as a **proxy for truth** — two independent readers agreeing is evidence a finding is real. Here the proxy was unavailable, so the orchestrator substituted **the thing the proxy stands for**: every severe finding was independently re-verified against the repository by direct file read before any fix was applied. That is a stronger corroboration than a second opinion, not a weaker one — a second judge can agree and both be wrong; `grep` returning zero matches for `EnvUtil` cannot.

Findings are therefore marked **CONFIRMED-BY-EVIDENCE** rather than *confirmed-by-both-judges*. The distinction is recorded so `/akili-archive` reads this as a degraded round.

---

## Ledger

| ID | Sev | Finding | Verification performed | Status |
| --- | --- | --- | --- | --- |
| **B-1** | SEVERE | Design cites `EnvUtil` for the phase; **no such symbol exists** | `grep -rn "EnvUtil" src` → **0 matches**. Existing readers are `AppConfig` (DB-backed) and `EnvAppConfigUtil` — neither consumable as-is | **CONFIRMED-BY-EVIDENCE → FIXED** (DD-13) |
| **B-2** | SEVERE | The availability guard (R-CPA-005) and `alliance_selector_agreement` need the **full payload**, which no public method exposes | `getCachedAll()` is `private` (`clarisa-projects.service.ts:66`); only `listBilateralProjects()` and `findProjectById()` are public | **CONFIRMED-BY-EVIDENCE → FIXED** (§2.1, §5 step 2) |
| **B-3** | SEVERE | `@Get('coverage-report')` appended after the existing `@Get(':id')` is **shadowed** → `ParseIntPipe` rejects, endpoint returns 400 forever | `@Get(':id')` confirmed at `bilateral-project-mapping.controller.ts:69` with `ParseIntPipe` at `:72` | **CONFIRMED-BY-EVIDENCE → FIXED** (DD-12 + new gate) |
| **B-4** | SEVERE | §4 claims `/api/v1/...`; the real path has **no version segment** | `main.ts:53-56` — `setGlobalPrefix('api')` + `enableVersioning({type: URI})` with **no `defaultVersion`**; controller carries no `@Version` | **CONFIRMED-BY-EVIDENCE → FIXED** (§4) |
| **B-5** | SEVERE | Injecting `AgressoContractRepository` cascades **`Scope.REQUEST`** into a module that declares itself singleton-only, changing how existing CRUD endpoints instantiate — violating R-CPA-007 | `AgressoContractRepository` injects `CurrentUserUtil` (`repositories/agresso-contract.repository.ts:64`), declared `@Injectable({scope: Scope.REQUEST})` (`current-user.util.ts:7`). Module header at `bilateral-project-mapping.module.ts:8-12` states the singleton invariant | **CONFIRMED-BY-EVIDENCE → FIXED** (DD-11) |
| **B-6** | WARNING | §2.1 file list incomplete; §3 "no entity altered" contradicts DD-8's mandated comment edit | Entity comment still reads *"no upstream join field exists per D-PI-8"* at `bilateral-project-mapping.entity.ts:8-9` | **CONFIRMED → FIXED** (§2.1 row, §3 qualified). Items (1)/(2) dissolved by the DD-11 fix — no AGRESSO repo/module import remains |
| **B-7** | WARNING | Only `resolution` marked null on the absence path; `agresso`/`normalization`/`samples` would emit misleading zeros | §5 step 3 says steps 4–8 do not run, so those blocks have no value | **CONFIRMED → FIXED** (§4) |
| **B-8** | WARNING | DD-9's "~4×" multiplier is contradicted by the evidence it cites | `proposal.md` §4.4: full feed `bilateral` 892 vs `Bilateral` 197 → ≈5.5×, not 4×; and within the Alliance-2026 slice there are **no** `Bilateral` rows, so the picker offers 0 of 342 | **CONFIRMED → FIXED** (§12.1) |
| **B-9** | WARNING | R-CPA-006 AC.3 (403 envelope) has **no mechanism** — the existing controller spec asserts guard *presence*, not behavior, and e2e was excluded | `bilateral-project-mapping.controller.spec.ts:54-63` asserts `g === RolesGuard` — a presence assertion, exactly the anti-pattern `/akili-specify` names | **CONFIRMED → FIXED** (new integration spec, §10) |
| **B-10** | SUGGESTION | Architecture diagram's `WHERE` omits the funding-type predicate | §5 step 5 has it; diagram does not | **FIXED** |
| **B-11** | SUGGESTION | ~300 production LOC light; the DTO alone is 120–180 | Response shape has 7 blocks, 5 tiers × 4 fields | **FIXED** (budget raised, §15) |

**Totals as delivered:** severe = 5 · warning = 4 · suggestion = 2.
**Applied:** all 11 (the five severe were fixed only after independent verification).

---

## Two findings that changed the design's shape, not just its wording

**B-5 is the most valuable finding in the round.** The design's headline promise is R-CPA-007 — *"changes no existing behavior"* — and the mechanism it chose to read AGRESSO contracts would have silently re-scoped the existing bilateral mapping controller from singleton to request-scoped. The spec would have been *self-falsifying*, and no test in the plan would have shown it. Fixed by reading through `DataSource` (already injected in this module, already singleton) instead of the shared repository — see **DD-11**.

**B-3 + B-9 collapse into one gap:** the plan had *no gate that exercises the HTTP path at all*. Route shadowing and the 403 envelope are both invisible to a controller unit spec that calls methods directly. One new artifact — a bootstrapped `TestingModule` + supertest spec that replicates the real global prefix and versioning — closes both. This is the same class as Kaizen **K-004**: the original plan's gates could not go red for the two failures most likely to occur.

---

## Terminal state

**JUDGMENT: APPROVED ✅** — with the protocol deviation above recorded.

All 5 severe findings verified against source and corrected; all 4 warnings and both suggestions applied. One round only, per the user's instruction. No round-two re-judgment was run; the corrected design has **not** been re-reviewed by a judge, and that gap is stated here rather than implied away.
