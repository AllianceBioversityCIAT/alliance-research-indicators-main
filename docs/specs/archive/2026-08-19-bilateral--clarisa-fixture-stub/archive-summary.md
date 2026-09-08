# Archive Summary — bilateral / clarisa-fixture-stub

> **Outcome:** 7 of 8 tasks delivered and committed. The stub serves the real PRMS phase-2026 data through CLARISA's own wire shape, and the numbers predicted from live measurement during `/akili-specify` held end-to-end against a running app: **170 eligible, 140 with science programs**. `ClarisaProjectsService` and its predicates were never touched.
>
> **T-08 is archived incomplete, by explicit user acceptance.** Its API half passed; its **DC-10 human picker verdict and the switch-back were not performed**. DC-10 is the spec's *only* substituted gate for its dominant user-visible defect class — this is a **waiver, not a pass**.
>
> **The four Reviewer FAILs are the story.** Three of the four defects passed every automated check available to them. One shipped a gate blind to a divergence in the data it certified; one shipped a fixture that never reaches `dist`, invisible to all 20 of its tests.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bilateral/clarisa-fixture-stub/` |
| **Archive path** | `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub/` |
| **Archive date** | 2026-08-19 |
| **Spec id** | 2026-08-clarisa-fixture-stub |
| **Type** | Change · **Depth** Standard · **Approval Mode** `gated` → **autonomous** (user, mid-run) |
| **Final status** | **Delivered with one accepted follow-up (T-08)** |
| **Commits** | 8 on `JuankCadavid/AC-1676`, `7bbb4e06` → `ca6b3b7b` |

---

## 2. Final Status

| Task | Status | Attempts |
| --- | --- | --- |
| T-01 Harvest reference capture + dictionary | `[x]` | 1 |
| T-02 Converter (export → fixture) | `[x]` | 1 |
| T-03 Generate + commit fixture | `[x]` | folded into a Leader verification |
| T-04 Fidelity gate | `[x]` | **2** |
| T-05 Stub router + env gate | `[x]` | **2** |
| T-06 Bootstrap mount + e2e | `[x]` | **2** |
| T-07 `.env.example` + removal condition | `[x]` | **2** |
| **T-08 HITL picker at 170 (DC-10)** | **`[~]`** | API half PASS; **human verdict outstanding** |

**0 HALTs · 0 Pivots · 0 FATAL_FAILs · 4 Reviewer FAILs · 4 rework attempts**

---

## 3. Requirements Delivered

| Requirement | Delivered by | Evidence |
| --- | --- | --- |
| R-CFS-001 fixture reproduces CLARISA's 32-field shape | T-01, T-02, T-03 | Key-set equality vs a committed real capture |
| R-CFS-002 nested mappings from real objects, never synthesized | T-02, T-04 | `has_science_programs` **140/170**, not 170 |
| R-CFS-003 raw wire shape, no envelope | T-05, T-06 | e2e: bare 198-length array, no `Authorization` header |
| R-CFS-004 absent unless enabled | T-05, T-06 | 404 across unset / truthy / unrecognised, both routes |
| R-CFS-005 fidelity check names what the export cannot supply | T-04 | 8 divergences as a closed set (D-8 added mid-run) |
| R-CFS-006 narrow mount, exclude list untouched | T-06 | `app.module.ts` byte-clean; sibling prefix 401s |
| R-CFS-007 deterministic regeneration | T-02 | sha256 identical across runs |
| R-CFS-008 removal condition in three places | T-01, T-05, T-07 | literal present in 5 files |
| NFR-CFS-002 consumption path unchanged | all | `git diff 7bbb4e06 -- <7 protected paths>` **empty** |
| **DC-10 picker at 170 options** | **T-08 — NOT VERIFIED** | **Waived; see §6** |

---

## 4. Files Changed Summary

**New — 9 files, all under `src/domain/tools/clarisa/stub/` unless noted:**

| File | Lines | Note |
| --- | --- | --- |
| `tools/harvest-reference.ts` | 335 | One-shot live capture → dictionary + reference |
| `tools/convert-export.ts` | 632 | Deterministic converter |
| `tools/convert-export.spec.ts` | 405 | 31 tests |
| `clarisa-stub.fidelity.spec.ts` | 820 | 26 tests — the KZ-001 gate |
| `clarisa-stub.router.ts` | ~170 | Two raw-shape routes |
| `clarisa-stub.config.ts` | 42 | Default-deny flag |
| `clarisa-stub.router.spec.ts` | ~280 | 23 tests |
| `clarisa-stub.mount.ts` | 32 | Added by DD-11 |
| `test/clarisa-stub.e2e-spec.ts` | ~250 | 7 tests — the only ordering proof |

**Generated (committed):** `clarisa-projects.fixture.json` (198 projects, 844 KB) · `clarisa-global-units.dictionary.json` (13 entries) · `clarisa-reference-capture.json` (5 projects) · `clarisa-projects.provenance.json`

**Modified existing — 3, exactly as design §2.1 (amended) states:** `src/main.ts` (**+8 insertions**), `nest-cli.json` (**+5**, DD-10), `.env.example` (~39 lines, T-07)

**Hand-written LOC: ~3,000 against a ~800 budget (3.7×).** See §7.

---

## 5. Test Evidence Summary

**No `test-report.md` — absence accepted.** `/akili-test` was not run; verification lived inside the execution loop, where every gate was demonstrated able to fail.

| Suite | Result |
| --- | --- |
| Unit (full, final committed state) | **329 suites / 2,351 tests, 0 failures** |
| Arithmetic reconciliation | 2,271 + 31 + 26 + 23 = **2,351** — no suite silently dropped |
| E2E | **7/7, self-terminating, 8.9 s wall, exit 0** (from a killed 18m40s hang) |
| Coverage | `test:cov` **exit 0** — the 60% global floor held. *Exact % not captured (see LE-2)* |
| Lint | `npx eslint` clean (bare; never `npm run lint` — K-001) |

**Gates observed FAILING, not merely asserted (K-004):** the SP09 ambiguity check · the timestamp-in-array determinism check (792-line diff) · the SP14 unknown-code abort (`shasum -c` OK/OK after) · the hardcoded-`code:22` mutation (**170 vs the required 140**) · key-set equality in both directions · `phase` as string · a ninth divergence via `total_budget` (a field no D-row covers) · D-8 on a mutated clone · the DD-10 packaging gate (`ls` red → green) · three log-field removals · four router mutations.

---

## 6. Validation Summary & Accepted Warnings

**No `validation-report.md` — absence accepted.** `/akili-validate` was not run.

### The one open gate — DC-10, waived

`requirements.md` §9 records DC-10 (the picker at ~170 options) as having **no automated gate**: jsdom cannot measure rendering, and `loadClarisaProjectOptions` sends no limit while AGRESSO's sends 50. Its substitute is *"a mandatory human visual check at the HITL pause, or a T6 Multimodal screenshot review."*

**Neither was performed.** Browser automation was unavailable (extension not connected), and the user elected to archive before supplying screenshots.

| DC-10 status | Not verified |
| --- | --- |
| **What is known** | The endpoint returns 170; phases returns `{2026, 170}`; 140/170 carry science programs |
| **What is unknown** | Whether the picker **renders, filters and scrolls** usably at 170 options with labels intact |
| **Follow-up** | Perform the check, plus the switch-back to CLARISA (25 eligible / phase 2025). Findings become their own bugfix specs (R-7) |

**This is the spec's own warning turned real:** *"a gate blind to the defect class the spec most often produces is not a gate"* — and the substituted gate is the one that went unexercised. Ten green gates do not cover it.

### Accepted advisories (recorded, non-gating)

| Origin | Advisory |
| --- | --- |
| T-02 | `allocation` has **no NaN guard** — a non-numeric cell would serialize as `null` on a future regeneration. Latent; T-04's `typeof` assertion is the live backstop |
| T-02 | `mergeProvenance` drops unknown top-level keys |
| T-02 | **R-CFS-007 AC.1 has no CI-able form** — the file-level byte diff is transient because DD-7 keeps the export out of the repo. A spec limitation, not a gap |
| T-05 | The `jest.spyOn` seam comment describes a seam the spec says does not work; the Implementer deliberately declined to fix it within its budget |
| T-05 | A disabled stub path returns an empty 404 while a sibling returns 401 — inherent to the 404-not-401 rule the spec mandates. **Hand to the R-CFS-006 security reviewer** |
| T-07 | *"indistinguishable from routes that do not exist"* is a mild overclaim; `198` vs the picker's `170` may briefly confuse a configurer |

### Open follow-ups leaving this spec

| # | Item | Owner |
| --- | --- | --- |
| **T-08** | DC-10 human verdict + switch-back | **User** |
| **RB-5** | Security review of an unauthenticated route (R-CFS-006 AC.5) | Security reviewer |
| **RB-6** | **`ClientGateway` never closes its socket** — pre-existing, `@Global()`, caused the 18m40s hang. Closed only in one e2e teardown; **production untouched**. Needs its own bugfix spec | Server / DevOps |
| **OQ-3** | Nobody owns enabling the flag on dev or deleting the stub | DevOps / Product |
| **The removal condition is too loose** | Written as *presence* (`external_code` + phase 2026) when it needed *completeness*. **CLARISA now satisfies it literally** — 78/377 codes, phase 2026 — but yields **50** eligible vs the stub's **170**, with `has_science_programs` **0/50**. A literal reading would delete a stub still carrying 120 projects | **Leader's authoring error** |
| **S2's premise moved** | `clarisa-automapper-s2` assumes a closed `{B-, C-}` prefix set. CLARISA now emits **`A-`** (AfricaRice), shaped `A-AG10156` vs `B-A1649` | S2's owner |

---

## 7. Historical Notes

### The four FAILs, and why they matter more than the passes

| Task | What shipped that every automated check accepted |
| --- | --- |
| **T-04** | A fidelity gate **blind to a divergence sitting in the data it certified** — 25 tests green, six mutations observed red. Its falsifier was *fitted to the net*: it introduced its "extra divergence" through the single invariant Layer 2 already checked |
| **T-05** | A router whose fixture **never reaches `dist`** (`nest-cli.json` assets covered only `reports/`; the Dockerfile copies `dist` without `src`). **All 20 tests passed**, because ts-jest runs over `src` where `__dirname` resolves differently. It would have surfaced as a CLARISA outage |
| **T-06** | An unrecorded change to the production entry point's boot semantics (`require.main` guard) — correct today, catastrophic under a future bundler, **ungated anywhere in the repo** |
| **T-07** | A **false index in the document that claims to be the index** — "three places" where a grep returns five, omitting the canonical one, under an instruction not to paraphrase |

### Spec amended four times during execution, all behaviour-preserving

**D-8** (an eighth divergence: `organization_code`/`funder_code`) · **DD-9** (T-06 must mount **unconditionally** — a conditional mount returns 401 and violates R-CFS-004) · **DD-10** (`nest-cli.json` assets entry) · **DD-11** (helper moved out of `main.ts`, guard deleted, diff 44 → 8 lines). Every amendment closed with a two-direction Correction Closure sweep; two false positives were deliberately left untouched ("the seven `source_*` fields", `DD-7`).

### Budget: ~800 → ~3,000 LOC (3.7×), two distinct causes

Re-baselined once at the user's instruction, then exceeded again. The causes separate cleanly:

1. **The spec's rigor requirements are themselves code.** T-01 was 4.8× on *implementation*: K-014 fetch guards, fail-loud paths, the K-004 falsifier export seam and disqualifier logic all add lines a "what does this task do" estimate never prices.
2. **Test volume** dominated T-02 and T-04 — the **third** consecutive occurrence of the Kaizen "Watch", which by its own rule promotes to a lesson.

### Runtime incidents and Leader errors

**3 runtime incidents:** K-009 non-delivery ×3 (two Reviewers, one Implementer twice) · **2 quota deaths** mid-task. Every one was a delivery or environment failure, never bad work — in each case the artifact was correct or in progress.

**7 Leader errors recorded (LE-1…LE-7)**, because an audit trail that only records worker mistakes is not one: a mis-addressed poke from an unnoticed `-2` name suffix · **K-014 committed twice on the lesson the Leader had copied into two worker briefs** · a concurrency-rule breach · line-number drift from formatting after capturing evidence · a measurement handed to a worker whose turn could not outlive it · a falsifier whose predicted mechanism was wrong · an imprecise claim propagated into two briefs.

### What the methodology caught that nothing else would have

`author ≠ auditor` **caught the Leader**, not the Implementer, twice: the `annual` ruling (a divergence framing that would have forced a needless rework or spec edit) and the `organization_code` FAIL (where the Leader carried a precedent across a sentence it could not cross). The Delegation Ceiling names the Leader's own design decisions as the unguarded position — this run is the evidence.

---

## 8. Constitution Impact

- **Created** `server/researchindicators/src/domain/tools/clarisa/stub/` — a new folder inside an existing tool module, **not** a new package. **No child guide is owed**: the folder is temporary by construction and carries an explicit removal condition; a guide for it would be a document nobody would remember to delete.
- **CodeGraph re-index pending** — the new folder is not in the index.
- For the convention sweep: the harvester's header uses `[SPEC …]` where the codebase convention is `// @akili-spec docs/specs/…`. Left as authored deliberately (editing an audited artifact for cosmetics would make the committed diff differ from the reviewed one).
