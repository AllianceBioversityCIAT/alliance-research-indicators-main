# Requirements — bilateral / CLARISA ↔ AGRESSO Auto-Mapper (S2)

- **Module:** bilateral — server (`server/researchindicators`) + client (`client/research-indicators`)
- **Spec id:** 2026-08-clarisa-automapper-s2
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — bilateral mapping / pool-funding attribution
- **Linked tickets:** Epic AC-1385
- **Last updated:** 2026-08-19
- **Depth:** **Standard**
- **Extends:** `archive/2026-08-14-bilateral--clarisa-project-automapping` (S1 — the measurement instrument)
- **Blocked for release by:** CLARISA **production** publishing `external_code` — see NFR-CAM-001

---

## 1. Executive summary

Five mappings exist, all typed by hand, against 198 mappable projects. This spec makes the join the data already declares.

**The framing changed from the proposal, and it changes the success metric.** S1 measured *contract-first*: "336 of 1543 AGRESSO contracts resolve" — 21.8%, requiring a paragraph of denominator caveats so nobody reads it as failure. Measured **project-first**, the same data reads:

> **198 of 198 eligible CLARISA projects resolve to an AGRESSO contract. 100%. Zero misses, zero collisions.**

That is not a better algorithm — it is the honest direction of the relationship. `external_code` lives on the CLARISA project and *names* the AGRESSO contract. CLARISA declares the pairing; AGRESSO never knows about it. Iterating projects reads a declaration; iterating contracts guesses at 1345 that were never paired.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Eligible project** | A CLARISA project passing the shipped predicates: bilateral-family funding, Alliance-led, matching the target phase |
| **Reachable** | The count of eligible projects — the true denominator for coverage. **Not** the AGRESSO contract count |
| **Centre prefix** | The single leading letter + `-` on `external_code` (`C-D514` → centre `C`, contract `D514`) |
| **Declared pairing** | A CLARISA project's `external_code`, which names its AGRESSO contract. The matcher reads it; it does not infer it |
| **Superseding** | Replacing a mapping for a new phase by deactivating the old row and creating a new one — never by re-pointing the existing row |

---

## 3. System context & scope

**In scope:** an admin-triggered matcher (server), a review surface for its output (client), and a coverage dashboard on the existing Bilateral Mapping screen.

**Out of scope:** any change to the shipped selection predicates (`isBilateralFunding`, `isAllianceProject`, `matchesPhase`); the pool-funding tagging path; name-similarity matching; a cron schedule.

---

## 4. Measured evidence — 2026-08-19, both sides, same day

Every figure below was measured this session against `clarisatest-back` and the local AGRESSO API. **This supersedes S1's 2026-08-14 reading** (R-2/R-5 of the proposal required exactly this).

### 4.1 The CLARISA side

| Signal | Value |
| --- | --- |
| Projects at `phase=2026` | **911** |
| With `external_code` | **911 (100%)** |
| `external_source` | **`W3_REGISTRY`** on the whole eligible cohort |
| **Eligible** (bilateral-family + Alliance + phase 2026) | **198** |
| Of which contributed by today's W3 fix | **+28** (170 → 198) |
| Centre prefixes within the eligible cohort | `{B: 53, C: 145}` — **100% covered by the `{B-, C-}` strip** |
| `external_code` unique after strip | **198 / 198 — zero collisions** |
| `full_name` present (for a reviewable label) | **198 / 198** |

> **The proposal's `{B-, C-}` premise is confirmed, not falsified.** The feed carries 14 prefixes overall (`A`,`B`,`C`,`D`,`F`,`L`,`M`,`N`,`P`,`Q`,`R`,`S`,`T`,`W`), but the other 12 belong to non-Alliance centres — the 21 `A-` projects are all AfricaRice — and never enter the cohort.

### 4.2 The AGRESSO side, and the cross-match

| Signal | Value |
| --- | --- |
| Contracts total | **3348** |
| Of which `BLR` | 1545 · `W3R` 204 · `W1/W2` 198 · null 1102 |
| **Eligible projects resolving to a contract** | **198 / 198 = 100%** |
| Misses | **0** |
| `funding_type` of the matched contracts | **`BLR` 168 · `W3R` 30** |
| `BLR` contracts with no phase-2026 project | 1377 — **not debt; no counterpart exists** |

> **The 30 `W3R` matches exist only because of the W3 funding fix shipped today.** Without it the cohort is 170 and those 30 contracts are unmappable.

> **`is_active` caveat, added 2026-08-19 during T-02 review.** The 2026-08-19 probe behind "198 / 198" does
> **not** record whether it filtered `agresso_contracts.is_active`. The shipped matcher **does** filter to
> active contracts — matching `bilateral-mapping-coverage.service.ts` and `agresso-contract.repository.ts`,
> which both treat an inactive contract as one that does not exist for platform purposes; mapping to a
> deactivated contract would create an active mapping row pointing at something the rest of the platform
> filters out. **Consequence:** a live run may resolve **fewer** than 198. That is correct behaviour, not a
> regression, and it must not be read as one. Note the matcher deliberately does **not** filter
> `funding_type` — the matched set is `BLR 168 · W3R 30`, and the coverage service's `BLR/BILATERAL` filter
> would silently drop the 30 `W3R` matches.

### 4.3 Production — the release blocker, measured not assumed

| Signal | Test | **Production** |
| --- | --- | --- |
| Projects at `phase=2026` | 911 | **299** |
| With `external_code` | 100% | **0 (0%)** |
| Eligible | 198 | **31** |
| `external_source` | `W3_REGISTRY` | **all `null`** |

Production is not one field away — the W3 Registry is not synchronised there at all.

### 4.4 Phase-scoping — a finding the proposal does not contain

CLARISA project ids are **scoped to the phase**. The 2026 feed occupies ids **1368–2278**. Four of the five existing mappings point at ids **22, 25, 138, 246**, which do not exist in the 2026 feed at all: they reference projects from an earlier phase.

The one mapping created against the current feed — `D514 → 1516` — is **exactly what the matcher would propose**. The matcher does not disagree with the humans; the older rows simply predate the phase.

---

## 5. Functional requirements

### R-CAM-001 — Mappings are resolved from CLARISA's declared reference

- **As a** center admin
- **I want** the system to read the pairing CLARISA already declares
- **So that** I stop hand-typing a join that exists in the data

**Details.** For each **eligible** project, the system derives its AGRESSO contract from `external_code` by removing the leading centre prefix. It then confirms that contract exists before proposing anything.

#### Scenario: A declared pairing resolves

- GIVEN an eligible CLARISA project whose `external_code` is `C-D514`
- WHEN the matcher runs
- THEN it derives the contract identifier `D514`
- AND proposes a mapping only after confirming that contract exists in AGRESSO
- **BUT it must NOT** infer a pairing from project or contract **names** — S1 measured name matching at **exactly zero** resolutions and the proposal forbids building it
- **AND IT MUST** iterate **projects**, not contracts. Iterating 1543 contracts produces 1345 non-results that are not failures, and a coverage figure that misrepresents the instrument by ~4×

#### Scenario: A project whose contract does not exist

- GIVEN an eligible project whose derived identifier matches no AGRESSO contract
- WHEN the matcher runs
- THEN no mapping is proposed for it
- AND it is reported as unresolved **with its derived identifier**, so the gap is diagnosable
- **BUT it must NOT** be silently dropped

**Acceptance criteria:**
- [ ] AC.1 — The prefix strip removes **exactly one** leading prefix from the **closed set `{B-, C-}`**. `C-D514` → `D514`; a code with no prefix is used unchanged; a prefix outside the set (`A-1234`) passes through **unchanged**. *(Amended 2026-08-19 — see the note below.)*

> **AC.1 amendment, 2026-08-19 (Leader, user-approved before T-01 was dispatched).** This clause originally read *"removes exactly one leading `[A-Za-z]-`"*. That is an **open** strip, and S1 already shipped a **closed-set** one — `normalizeExternalCode()` in `…/utils/external-code.util.ts`, whose closed set is deliberate (S1 DD-4: *"unknown prefixes like `X-` must pass through unchanged to avoid converting unresolved codes into silent false-positive matches"*). Implementing the open form would have meant either a **second** strip — the exact NFR-CAM-003 violation — or rewriting shipped archived-spec behaviour this spec lists as out of scope. The closed set is also **sufficient**: §4.1 measured the eligible cohort at `{B: 53, C: 145}` — 100% coverage — and the two forms produce **identical** output on every named input in `tasks.md` T-01. `proposal.md` §K-005 already said *"Reuse S1's `external-code.util.ts` — do not re-implement the strip"*; requirements and design had drifted from it. **The strip is `normalizeExternalCode`. No new function is written.**
- [ ] AC.2 — Against the measured cohort the matcher resolves **198 of 198**, with **zero** unresolved.
- [ ] AC.3 — Two eligible projects deriving the same contract identifier is treated as **ambiguous**: neither is auto-applied, both are surfaced. *(Measured today: zero such cases — the check must still exist.)*
- [ ] AC.4 — No name-similarity comparison appears anywhere in the matcher.

---

### R-CAM-002 — The matcher is admin-triggered and shows its work before writing

- **As a** center admin
- **I want** to see what a run will do before it does it
- **So that** 194 rows do not appear without anyone having chosen that

#### Scenario: Preview then apply

- GIVEN an admin on the Bilateral Mapping screen
- WHEN they trigger a matcher run
- THEN the system reports what it **would** create, skip and flag, without writing
- AND applying is a separate, explicit action
- **BUT it must NOT** run on a schedule in this version — a cron that writes rows nobody expected is hard to reason about (proposal OQ-1)
- **AND IT MUST** be idempotent: running twice in a row produces the same end state, never duplicate rows

**Acceptance criteria:**
- [ ] AC.1 — A preview run writes **zero** rows, proven by a row count taken before and after.
- [ ] AC.2 — Applying the same preview twice leaves the row count unchanged after the first apply.
- [ ] AC.3 — The run reports four counts: created, skipped-already-mapped, ambiguous, unresolved.

---

### R-CAM-003 — Manual mappings are immutable to automation

- **As** the person who typed a mapping by hand
- **I want** automation never to overwrite my decision
- **So that** human judgement outranks a derived one

#### Scenario: A hand-typed mapping is protected

- GIVEN an active mapping whose `source` is `MANUAL`
- WHEN the matcher runs and derives a *different* project for that contract
- THEN the existing mapping is left exactly as it is
- AND the divergence is surfaced for a human to adjudicate
- **BUT it must NOT** deactivate, re-point, or overwrite the manual row
- **AND IT MUST** report the divergence rather than silently skipping it — a silent skip and a clean agreement are indistinguishable in the output

**Acceptance criteria:**
- [ ] AC.1 — After a run, every pre-existing `MANUAL` row is byte-identical.
- [ ] AC.2 — The three existing rows whose CLARISA id predates the 2026 feed (22, 138, 246) are reported as divergent, not rewritten.
- [ ] AC.3 — `D514 → 1516`, where the matcher agrees, is reported as already-mapped and left untouched.

---

### R-CAM-004 — Coverage is reported against what is reachable

- **As a** center admin
- **I want** a coverage figure I can act on
- **So that** the dashboard tells me how much work is left, not how large the contract table is

#### Scenario: The dashboard is honest about its denominator

- GIVEN 198 eligible projects, of which 4 are mapped to the current phase
- WHEN the admin opens the Bilateral Mapping screen
- THEN coverage reads **4 / 198**
- AND the counts shown are mapped, pending, and reachable — each one actionable
- **BUT it must NOT** present coverage against the AGRESSO contract total. `4 / 3348` and `4 / 1545` are both true and both misleading: the 1377 `BLR` contracts without a counterpart are **not** pending work
- **AND IT MUST** state the denominator on screen, so the number cannot be quoted without it

> **The figures in this scenario are illustrative, per D-7 — annotated 2026-08-20 during T-04 review.**
> §7 D-7 already governs them: *"the spec's numbers are a baseline for tests, never a runtime
> expectation."* The scenario is a **conditional** — *GIVEN 4 are mapped … THEN coverage reads 4 / 198* —
> and the shipped code satisfies it exactly when fed such a cohort.
> **But against §4.4's measured 2026-08-19 feed the live strip will read ≈ `1 / 198`, not `4 / 198`**,
> because only `D514 → 1516` points into the 2026 cohort; ids 22, 25, 138 and 246 predate the phase and
> are therefore outside the denominator. No reading of the measured data yields "4 mapped in the current
> phase" — counting rows gives 5, and R-CAM-003 AC.2 names only 3 as divergent. **This is correct
> behaviour, not a defect.** Recorded here so the first person to open the screen does not file a bug
> against sound code.

**Acceptance criteria:**
- [ ] AC.1 — The reachable figure equals the eligible-project count, computed with the **shipped** predicates and not a reimplementation.
- [ ] AC.2 — mapped + pending = reachable, asserted as an invariant.
- [ ] AC.3 — No dashboard figure uses a contract-table count as a denominator.
- [ ] AC.4 — Empty, loading and error states are defined for the dashboard strip.

---

### R-CAM-005 — A mapping belongs to a phase, and phases supersede

- **As** the team that will run this again next year
- **I want** a new phase to add mappings rather than corrupt last year's
- **So that** history stays readable

#### Scenario: The next phase arrives

- GIVEN an active mapping to a project id from a previous phase
- WHEN the matcher runs against a new phase and derives a different project id for the same contract
- THEN the previous mapping is **deactivated** and a new active row is created
- AND both remain visible through the existing Status filter
- **BUT it must NOT** re-point the existing row's contract — the edit dialog states *"The AGRESSO contract cannot be changed after creation"*, and the same rule binds automation
- **AND IT MUST** apply only to non-`MANUAL` rows; a manual row diverging across phases is adjudicated by a human (R-CAM-003)

**Acceptance criteria:**
- [ ] AC.1 — Superseding produces two rows: one inactive, one active. Never one mutated row.
- [ ] AC.2 — No code path updates `agresso_agreement_id` on an existing row.

---

## 6. Non-functional requirements

### NFR-CAM-001 — The matcher refuses a feed that cannot support it

- **Category:** reliability / data integrity
- **Target:** if the configured CLARISA feed returns eligible projects but **zero** carry `external_code`, the run aborts with an explicit message and writes nothing.
- **Why:** production measures 299 projects, 31 eligible, **0 with `external_code`**. Running there would resolve nothing and could read as "no work to do" instead of "wrong environment".
- **How verified:** a test feeding a cohort with no `external_code` and asserting an abort plus zero writes.

### NFR-CAM-002 — `confidence_score` stays null unless it varies

- **Category:** data integrity
- **Target:** the column is populated **only** if the value differs across rows. With a single deterministic tier, it stays `null`.
- **Why:** the column comments *"Populated only when source != MANUAL"*, and a field everyone reads as meaningful that is always `1.0` is worse than empty (proposal R-4).
- **How verified:** assert `null` for every row a single-tier run produces.

### NFR-CAM-004 — The recorded source says what actually happened

- **Category:** data integrity / dx
- **Target:** an automatically created mapping is recorded under a **new, non-AI** `source` value. `AI_SUGGESTED` and `AI_AUTO` are **not** used and stay reserved.
- **Why:** the matcher performs **no inference**. It strips a prefix and looks up an exact key — deterministic, reproducible, no model. The existing enum values were added by an earlier spec *anticipating* an AI matcher; today's measurement (198/198, zero collisions, zero ambiguity) shows none is needed. Recording it as AI is false in two directions: the admin reading the Source column would treat a deterministic derivation as fallible and review what needs no review, and a genuinely inferential matcher built later would be indistinguishable from this one in the data.
- **Cost:** one migration adding an enum value. No new column, no backfill — all 5 existing rows are `MANUAL`.
- **How verified:** every row the matcher creates carries the new value; `grep` finds no `AI_` value written by the matcher path.

### NFR-CAM-003 — One normalization, not two

- **Category:** maintainability
- **Target:** the prefix strip exists in exactly one place and both the matcher and any coverage computation consume it. **That place is S1's shipped `normalizeExternalCode()` in `…/bilateral-project-mapping/utils/external-code.util.ts`** — this spec adds no strip of its own (see the AC.1 amendment under R-CAM-001).
- **Why:** **K-005** — two normalization implementations drift. **KZ-013** — and a second copy is invisible until it disagrees.
- **How verified:** the strip has exactly one definition site repo-wide. `grep` finds one `normalizeExternalCode` definition and **no** second strip function.

---

## 7. Defect classes and their gates

| # | Defect class | Gate | Input that makes it FAIL |
| --- | --- | --- | --- |
| **D-1** | **Wrong pairing written** — the matcher maps a contract to the wrong project | Fixture test over the measured cohort asserting 198 exact pairs | Change the strip to remove two characters → `-D514` matches nothing, count drops |
| **D-2** | **Manual row damaged** | R-CAM-003 AC.1 byte-identity assertion | Let the matcher write when `source = MANUAL` → assertion reds |
| **D-3** | **Duplicate rows on re-run** | R-CAM-002 AC.2 idempotency assertion | Remove the already-mapped skip → row count doubles |
| **D-4** | **Dashboard denominator wrong** — the honest-looking number that misleads | R-CAM-004 AC.2 invariant + AC.3 | Use the contract count as denominator → mapped + pending ≠ reachable |
| **D-5** | **Silent no-op in the wrong environment** | NFR-CAM-001 abort test | Point at a feed with no `external_code` → must abort, not report "0 to do" |
| **D-6** | **Phase collision** — a new phase overwrites last year's mapping | R-CAM-005 AC.1 two-row assertion | Update the existing row instead of superseding → one row, assertion reds |
| **D-7** | **The measured figures have aged** | ⚠️ **No automated gate** — see below |

**D-7 is a live blind spot, substituted not ignored.** Every figure in §4 is from **2026-08-19** and the feed is demonstrably volatile: it moved from 299 → 377 → 911 projects in five days, and `external_code` went 0% → 100% in the same window. A fixture pinned to today's 198 will keep passing while reality diverges. **Substitute:** the matcher's own run report is the live measurement — the spec's numbers are a *baseline for tests*, never a runtime expectation. **No task may assert a hard-coded 198 against a live feed.** Fixtures pin 198; live runs report whatever they find.

> **`npm run lint` is not a gate (K-001).** Server: `npx eslint <path>`. Client: `npm run lint -- --quiet`.
> **Client targeted test runs need `--coverage=false` (K-020)**, or they exit 1 with every test passing.

---

## 8. Cross-system impact

| Surface | Impact |
| --- | --- |
| `bilateral_project_mapping` entity | **One migration: a new `source` enum value** (NFR-CAM-004). `confidence_score` already exists and stays unwritten. No new column, no backfill — the 5 existing rows are all `MANUAL` |
| CLARISA projects client | Read-only consumer; the shipped predicates are reused, not reimplemented |
| AGRESSO contracts | Read-only lookup by `agreement_id` |
| Bilateral Mapping screen | Dashboard strip + a run/review surface. The existing table, Status and Source filters are reused |
| Pool-funding tagging | **Untouched.** `isBilateralTagTarget` reads the contract's own `funding_type` and never consults CLARISA — mapping a project does not make its contract a bilateral tag target |
| **Production** | **Release-blocked** by NFR-CAM-001 until PRMS promotes |

---

## 9. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | The eligible cohort is defined by the **shipped** predicates | Reused, never reimplemented (NFR-CAM-003) |
| R-1 | **Production lacks `external_code`** | **Confirmed by measurement.** Blocks release, not development — the 198-row stub mirrors test exactly |
| R-2 | Figures age fast | D-7; fixtures pin, live runs report |
| R-3 | 194 rows appear at once | R-CAM-002 preview-then-apply |
| R-4 | `confidence_score` becomes decorative | NFR-CAM-002 |
| R-5 | The list view cannot resolve 2026 project names | Pre-existing defect: the picker shows `full_name` correctly, the table shows `id 1516`. The review surface must use `full_name`, which is present on 198/198 |

---

## 10. Requirement ID index

| ID | Title | Covered by |
| --- | --- | --- |
| R-CAM-001 | Resolve from CLARISA's declared reference | T-01, T-02 |
| R-CAM-002 | Admin-triggered, preview before write | T-03, T-05 |
| R-CAM-003 | Manual mappings immutable | T-03 |
| R-CAM-004 | Coverage against reachable | T-04, T-06 |
| R-CAM-005 | Phase supersession | T-03 |
| NFR-CAM-001 | Refuse an unsupported feed | T-02 |
| NFR-CAM-002 | `confidence_score` null unless it varies | T-03 |
| NFR-CAM-003 | One normalization | T-01 |
| NFR-CAM-004 | Source value is honest, not AI | T-00, T-03 |

---

## 11. Open questions

| # | Question | Owner | Blocking |
| --- | --- | --- | --- |
| ~~OQ-1~~ | ~~What triggers the matcher?~~ **RESOLVED — admin-initiated only** (R-CAM-002). Cron deferred until the output is trusted | Engineering | Closed |
| ~~OQ-2~~ | ~~Is `confidence_score` populated in v1?~~ **RESOLVED — no** (NFR-CAM-002). A single deterministic tier gives it nothing to say | Engineering | Closed |
| ~~OQ-3~~ | ~~What happens to the unresolved?~~ **RESOLVED — they do not exist.** 198/198 resolve. The 1377 unpaired `BLR` contracts are outside the denominator entirely (R-CAM-004) | — | Closed |
| ~~OQ-4~~ | ~~Do W3 projects participate?~~ **RESOLVED — yes.** Today's W3 fix admits 28 of them, matching 30 `W3R` contracts | Product | Closed |
| **OQ-5** | Is `Confirmed` the right science-program status filter? | PRMS | **No** — does not affect the join |
| ~~OQ-6~~ | ~~Does the matcher apply directly or land as suggestions?~~ **RESOLVED 2026-08-19 — apply directly**, under a new non-AI source value (NFR-CAM-004). The pairing is a read of a declared reference, measured 100% with zero collisions; there is no judgement for a reviewer to add. The review surface remains for ambiguity and manual divergence | Product | Closed |

---

## 12. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name> (OQ-6)
- [ ] Security review — n/a (read-only integrations, no new secrets)
- [ ] DevOps — n/a (no infra change)
