# Proposal — The bilateral project picker selects a population that barely exists

> **Headline:** `GET /api/tools/clarisa/projects/bilateral` — the picker behind the bilateral mapping admin form — returns **1 project in production**. Not 32, as previously reported in session, and not zero. **One.**
>
> **25 are eligible.** The picker compares `source_of_funding` against the exact literal `'Bilateral'`, but Alliance-led bilateral projects in CLARISA production carry **`'BILATERAL - RESTRICTED'`** (23 rows), plus `'BILATERAL- RESTRICTED'` (1, note the missing space) and `'Bilateral'` (1). The literal matches one row out of twenty-five.
>
> **This is a data-normalization defect, not a missing feature, and it is fixable today** — it needs nothing from CLARISA, nothing from PRMS, and no new field. Normalizing the compare takes the production picker from **1 → 25** immediately.
>
> **One stated criterion must not ship as a filter.** Gating on "has science programs" is correct for today's production rows (21 of the 25 qualify) but **empties the picker for the phase-2026 dataset you actually want to map**: of the 380 Alliance-2026 projects, **5 have any mapping and 0 have a Confirmed Science Program.** Report it, surface it, make it an optional toggle — do not gate on it until PRMS attaches the mappings.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/bilateral-alliance-selector` |
| **Slug** | `bilateral-alliance-selector` — derived from the free-text argument; the full sentence is proposal context, not a directory name |
| **Type** | **Bug** (silent data-selection defect — the endpoint returns 200 with a near-empty list) |
| **Approval Mode** | `gated` (default — no end-to-end mandate given for this change) |
| **Depends on** | none for the fix. `docs/specs/archive/2026-08-14-bilateral--clarisa-project-automapping/` (S1) supplies the measurement baseline |
| **Parallel-safe** | **no** — touches `clarisa-projects.service.ts`, shared with any live bilateral spec |
| **Blocks** | S2 (the auto-mapper). S2 must pick one Alliance selector deliberately; this bugfix is where that choice is made |
| **Evidence date** | **2026-08-14**, live probes of both CLARISA environments over VPN. Every figure below regenerates from [`evidence/probe-selector.py`](./evidence/probe-selector.py) and [`evidence/probe-deep.py`](./evidence/probe-deep.py) — the scripts are committed, the 3 MB payloads deliberately are not, so the numbers stay falsifiable rather than being an unverifiable snapshot |
| **Prior art** | S1's D8 reading (`evidence/D8-reading-2026-08-14.md` in the archive) established the selectors are disjoint. This proposal establishes *why*, and that the disjointness is only half the defect |
| **Kaizen** | **K-005** — *"config values the code uses as discriminators must never be collapsed"*. This is the mirror image: a **data** value used as a discriminator, compared **without normalization**. Same failure class, opposite direction |

---

## 2. Intent

Make the bilateral project picker return the projects that are actually eligible, in both CLARISA environments, without breaking when the upstream contract changes shape next week.

---

## 3. Problem / Current Behavior

`ClarisaProjectsService.listBilateralProjects()` (`clarisa-projects.service.ts:45-52`) is two exact-string comparisons joined by `AND`:

```
p.source_of_funding === 'Bilateral'  &&  p.lead_institution_object?.acronym === 'ABC'
```

Both operands are unnormalized. Both are wrong against real data, in different ways, in different environments.

### What the user sees

The bilateral mapping admin form's project dropdown is effectively empty. Four mappings exist in the system, all typed by hand, all `source: Manual`. That was previously read as "the feature works, it is just manual." It does not work — **the picker offers one option out of twenty-five.**

---

## 4. Bug Diagnosis

### 4.1 Observed symptom

| Environment | Picker returns | Should return |
| --- | --- | --- |
| **Production** (`api.clarisa.cgiar.org`, 299 projects) | **1** | **25** |
| **Test** (`clarisatest-back`, 1365 projects) | **0** | 380 (Alliance-2026 slice) |

### 4.2 Reproduction steps

```bash
# read-only, no auth needed, ~30s over VPN
python3 docs/specs/bugfix/bilateral-alliance-selector/evidence/probe-selector.py prod test
```

`GIVEN` CLARISA production publishes 299 projects
`WHEN` the picker filters `source_of_funding === 'Bilateral' AND acronym === 'ABC'`
`THEN` exactly 1 project survives
`AND` 24 further Alliance-led bilateral projects are silently discarded
`BUT` the endpoint returns HTTP 200 with a well-formed envelope — **nothing reports the loss**

### 4.3 Root cause — confirmed, two independent defects

#### Defect A — `source_of_funding` is compared to a literal, and the real values are variants

The **whole production feed** carries eleven distinct spellings:

| Value | Rows |
| --- | --- |
| `'Bilateral'` | 197 |
| `'Window 3'` | 61 |
| **`'BILATERAL - RESTRICTED'`** | **20** |
| `<empty>` | 6 |
| `'Window 3 - Restricted'` | 5 |
| `'Bilateral - Restricted'` | 3 |
| `'W3'`, `'SRV'`, `'WINDOW 3 - RESTRICTED'`, `'BILATERAL- RESTRICTED'`, `'Windows 3'` | 1–2 each |

Restrict that to the **32 Alliance-led projects**, and the distribution inverts:

| Value on ABC-led projects (upper-cased, whitespace collapsed) | Rows | Matches `=== 'Bilateral'` |
| --- | --- | --- |
| `'BILATERAL - RESTRICTED'` | 23 | ❌ |
| `'WINDOW 3 - RESTRICTED'` | 6 | ❌ (correctly excluded — not bilateral) |
| `'BILATERAL- RESTRICTED'` | 1 | ❌ — *missing space; a naive `split(' ')` would also fail* |
| `'Bilateral'` | **1** | ✅ |
| `<empty>` | 1 | ❌ |

Before normalization those 23 are two distinct raw strings — `'BILATERAL - RESTRICTED'` (20) and `'Bilateral - Restricted'` (3). The regression fixtures need the raw forms, not the folded ones.

**Alliance bilateral projects are almost never spelled `'Bilateral'`.** They are `BILATERAL - RESTRICTED`. The one row that matches is the exception, not the rule.

> This is *not* primarily the case-sensitivity defect logged as OQ-7. Lower-casing the compare changes production from 1 to 1 — **zero improvement**. The defect is the **suffix**, and only a normalized *prefix* test recovers the 25. OQ-7's diagnosis was directionally right and mechanically wrong; the case problem is real but lives in the **test** feed (892 rows spelled `'bilateral'`), not in production.

#### Defect B — `acronym === 'ABC'` is exact-match on a field whose value differs per feed

| Feed | How "Alliance" is encoded | `=== 'ABC'` matches |
| --- | --- | --- |
| Production (299 rows) | `lead_institution_object.acronym === 'ABC'` | **32** ✅ |
| Test, legacy phase-2025 rows (299) | same shape, carried over | 0 |
| Test, new phase-2026 rows (1066) | `lead_institution_object.acronym === 'ABC - Bioversity (Alliance)'` (140 rows) **and** `source_center_acronym ∈ {CIAT, BIOVERSITY}` (380 rows) | **0** ❌ |

Three encodings of one concept, and the code knows one. In the new contract the acronym string itself was renamed **and** a better field (`source_center_acronym`) was added — and the two do not even agree with each other (140 vs 380).

### 4.4 The finding that reshapes the fix — mapping data and phase-2026 data are disjoint record sets

Applying your four stated criteria to the test feed, cumulatively:

| Criterion | Surviving |
| --- | --- |
| C1 — centre ∈ (CIAT, BIOVERSITY) | 380 |
| C2 — + phase 2026 | 380 |
| C3 — + has project mappings | **5** |
| C4 — + has Confirmed Science Programs | **0** |

Independently, the same feed has 312 projects with mappings and 250 with Confirmed Science Programs. They are simply **not the same projects**:

- The **1066 phase-2026 rows** are freshly synced from source centres. They carry `external_code`, `source_center_acronym`, `last_synced_at` — and **almost no science-program mappings**.
- The **299 phase-2025 rows** are the legacy curated set — byte-identical in shape to today's production feed. 298 of 299 have mappings, 250 have Confirmed SPs, and **none** has `external_code`, `phase`, or `source_center_acronym`.

**The mapping work simply has not been done on the phase-2026 records yet.** That is upstream data state, not a code defect — and it is precisely part of what PRMS is addressing next week.

### 4.5 Impact & scope

| | |
| --- | --- |
| **Blast radius** | One method, two consumers: the admin picker endpoint, and `findProjectById` (**unaffected** — resolves by id, so existing mappings keep rendering). `listProjectsForCoverage` is separate and already correct |
| **Data integrity** | **No corruption.** Nothing was written wrongly; eligible projects were never *offered*. The 4 existing manual mappings stay valid |
| **Security** | None |
| **Why it went unnoticed** | The endpoint returns 200 with a valid envelope. An empty-ish list is indistinguishable from "there are few bilateral projects". The existing service spec asserts filtering behavior against **fixtures that use the literal `'Bilateral'`** — the suite is green and blind, the K-004 pattern exactly |

### 4.6 Fix strategy

Normalize both operands and tolerate both feed shapes, so the picker is correct today **and** migrates itself when CLARISA promotes the contract — no second coordinated deploy.

| # | Change | Effect |
| --- | --- | --- |
| 1 | `source_of_funding`: uppercase, collapse whitespace, **prefix** test on `BILATERAL` | prod **1 → 25** |
| 2 | Alliance: use `source_center_acronym ∈ {CIAT, BIOVERSITY}` when the field is populated; otherwise fall back to a normalized `ABC` **prefix** on the lead acronym | test 0 → 380 · prod unchanged at 32 |
| 3 | Phase: filter **only when the field is present**. Absent ⇒ do not exclude | prod (no phase field) keeps working; test narrows to 2026 |
| 4 | Science programs / mappings: **surface, do not gate** — with an off-by-default opt-in filter | prod picker keeps all 25 (21 have SPs); test keeps 380 instead of 0 |

Route: **`/akili-specify` (Lite) in Bug Mode** — a regression test that is red before and green after is mandatory, and here it writes itself: pin the real production spellings as fixtures and assert 25, not 1.

---

## 5. Proposed Outcome

- The picker offers every Alliance-led bilateral project in whichever CLARISA environment it is pointed at.
- The selector survives the upcoming contract promotion with **no code change** — it reads the better field when present and the legacy field when not.
- The phase to map is a **decision the team makes**, not a literal in a source file.
- Science-program coverage is **visible** on each option rather than an invisible gate.

---

## 6. Scope

| In | Out |
| --- | --- |
| `listBilateralProjects()` normalization + fallback | `findProjectById` — correct, untouched |
| A shared `normalizeFundingSource` / `isAllianceProject` helper | `listProjectsForCoverage` — already correct |
| Phase filter, tolerant of absence, configurable | The S2 auto-matcher |
| Picker DTO: expose `phase`, `source_center_acronym`, `has_science_programs` | ~~Any DB migration~~ → **superseded at the Phase 1 gate (2026-08-14):** one insert-only `app_config` seed migration is in scope. See `requirements.md` R-BAS-007 |
| Regression suite pinned to **real production spellings** | Changing the 4 existing manual mappings |

---

## 7. Non-Goals

- Not fixing CLARISA. The missing phase-2026 science-program mappings are PRMS's, and this fix is designed to be correct before *and* after they land.
- Not building the auto-mapper.
- Not touching `bilateral_project_mapping` rows, schema, or the admin write path.

---

## 8. Affected Users, Systems, And Specs

| | |
| --- | --- |
| **Users** | `CENTER_ADMIN`, `SYSTEM_ADMIN` using the bilateral mapping admin form |
| **Code** | `clarisa-projects.service.ts`, `clarisa-projects.controller.ts`, `dto/clarisa-project.types.ts`, sibling specs |
| **Specs** | Unblocks S2. Supersedes **OQ-7** and answers **OQ-5** and **OQ-2** from the archived spec |
| **Upstream** | CLARISA contract promotion (PRMS, ~next week) — a dependency this fix deliberately does **not** wait on |

---

## 9. Visual Reference

- **Source:** None — backend selector fix. The consuming surface (`/admin/bilateral-project-mappings`) already exists and needs no redesign.
- **Notes:** The one open UI question was **where phase gets chosen** — closed at the Phase 1 gate. **Corrected after investigation:** the admin *SSR* `Settings` page is a stub that persists nothing; the working surface is the **STAR client's** Environment-variables screen, which is already generic over `app_config` and needs **no client change**.

---

## 10. Approach Options

### Option A — Normalize + tolerant dual-shape selector, SPs reported not gated ✅ *recommended*

Prefix-normalized funding test; Alliance via `source_center_acronym` with a legacy-acronym fallback; phase filtered only when present; science programs surfaced with an off-by-default filter.

| | |
| --- | --- |
| ✅ | Production goes 1 → 25 **today**, no upstream dependency |
| ✅ | Test goes 0 → 380 — S2 finally has a real population to build against |
| ✅ | Self-migrating: when PRMS promotes, the better branch activates with no deploy |
| ✅ | Every criterion you named is implemented; the one that would empty the picker ships as a **toggle**, not a gate |
| ⚠️ | Two code paths to maintain until the legacy feed is retired |

### Option B — Literal implementation of the four criteria

`centre IN (CIAT, BIOVERSITY) AND phase = 2026 AND has mappings AND has science programs`.

| | |
| --- | --- |
| ✅ | Exactly as stated |
| ❌ | **Production picker → 0.** Prod has no `source_center_acronym` and no `phase`; every row fails C1 |
| ❌ | **Test picker → 0.** Measured, not predicted (§4.4) |
| ❌ | Ships a screen that is empty in both environments and stays empty until two separate upstream events land |

### Option C — Fix funding normalization only, defer the Alliance selector

| | |
| --- | --- |
| ✅ | Smallest possible diff; prod 1 → 25 |
| ✅ | Zero risk to the test path |
| ❌ | Test picker stays at 0 — S2 stays blocked |
| ❌ | Guarantees a second bugfix when the contract promotes, at which point prod silently drops to 0 |

---

## 11. Recommended Approach

**Option A.** It is the only one that is correct in both environments simultaneously, and the only one that does not require a coordinated deploy on the day CLARISA promotes.

The load-bearing judgment: **your four criteria are individually right and jointly unsatisfiable today.** C1 and C2 select the right population; C3 and C4 select a population that upstream has not built yet. Shipping C3/C4 as reporting rather than filtering keeps all four visible in the product while leaving the picker usable — and the day PRMS attaches the mappings, flipping the toggle is a config change, not a spec.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | Prefix-matching `BILATERAL` also admits a future `BILATERAL - SOMETHING-ELSE` we would not want | Enumerate the 11 observed values in the regression fixtures; a new value shows up as a test diff, not a silent behavior change |
| **R-2** | The `ABC` fallback also prefix-matches — could a non-Alliance institution start with `ABC`. | Measured: the only values are `'ABC'` (prod) and `'ABC - Bioversity (Alliance)'` (test). Pin both; assert nothing else matches |
| **R-3** | Prod picker jumps 1 → 25 — users see 24 new options overnight | Intended, and the point. Worth a heads-up to the admin users; no data changes |
| **R-4** | When CLARISA promotes, prod rows gain `source_center_acronym` and the branch flips **without a deploy** | Exactly the design intent — but it means the promotion must be re-measured. Re-run `probe-selector.py` the day it lands |
| **R-5** | The 5 test projects with mappings have **zero** Confirmed SPs — possibly a status or entity-code mismatch, not absent data | The proposal treats it as absent. Worth one question to PRMS; does not block the fix |

### Open questions

| ID | Question | Recommendation |
| --- | --- | --- |
| **OQ-A** | Do the 6 `WINDOW 3 - RESTRICTED` Alliance projects belong in the picker. Your criteria did not name a funding filter, but the endpoint is `/bilateral` | **Exclude** — the module is bilateral by name and the pool-funding semantics differ. One line to change if wrong |
| **OQ-B** | Where does phase get chosen | **CLOSED 2026-08-14 (Phase 1 gate): a runtime-editable `app_config` row**, surfaced on STAR's existing Environment-variables screen. Costs one insert-only migration; costs zero client work. Now `requirements.md` R-BAS-007 |
| **OQ-C** | Should the science-program filter ship visible-but-off, or hidden until PRMS lands | **Visible and off.** It documents the intent and makes the flip a click |

---

## 13. Success Criteria

- [ ] Production picker returns **25** Alliance bilateral projects (was 1) — asserted against pinned real-world spellings
- [ ] Test picker returns **380** Alliance-2026 projects (was 0)
- [ ] A regression test fails on the pre-fix code and passes after — including the `'BILATERAL- RESTRICTED'` missing-space row
- [ ] Neither `findProjectById` nor `listProjectsForCoverage` changes behavior
- [ ] Phase is resolvable without editing source
- [ ] Each picker option exposes whether it has Confirmed Science Programs
- [ ] Exactly one migration — the insert-only `app_config` seed — and it is **proven runnable** against a scratch schema, not merely lint-clean (K-006)

---

## 14. Next Step

```
/akili-specify bugfix/bilateral-alliance-selector
```

Bug Mode, **Lite** depth. The confirmed root cause becomes the fix plan; the reproduction becomes the mandatory regression test.
