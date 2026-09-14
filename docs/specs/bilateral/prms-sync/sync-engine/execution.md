# Execution Log — Bilateral / PRMS Sync Engine

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/sync-engine` |
| Spec id | `2026-09-prms-sync-engine` |
| Approval Mode | **gated** (from `proposal.md` §1 Document Control) — every continue/pause gate stops for the user |
| Branch | `AC-1441-US5-Push-Results-into-the-PRMS` |
| Budget (design §13) | 14 tasks · ≈ 2 000 LOC · 2 review rounds — a **tripwire**; an overrun escalates rather than continues |
| Rework ceiling | 3 attempts per task |
| Execution started | 2026-09-14 |
| Leader | Claude Opus 5 (T1) · Implementer `akili-implementer` (T2 sonnet) · Reviewer `akili-reviewer` (T3 opus, read-only) |

---

## 2. Pre-execution environment record (2026-09-14)

Run before any task was dispatched, per `/akili-execute` Step 2.1 (environment-dependent
verification) and `.agents/leader.md` → *Deferring a check*. Recorded here because three of these
findings change what a task may claim.

| Probe | Command / method | Result |
|---|---|---|
| TEST Normalizer reachability | `curl -X POST https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/ingest -d '{}'` | **HTTP 401 in 1.55 s** — reachable. **RB-1 CLEARED**; T-01 is not blocked |
| Shared Dev database (`ARI_MYSQL_*`) | `mysql2` connect, 8 s timeout | **ETIMEDOUT** — unreachable (remote; likely VPN) |
| Scratch schema (`ARI_TEST_MYSQL_*`) | `mysql2` connect, 8 s timeout | **ECONNREFUSED** |
| Docker daemon | `docker info` | **not running** (`docker-compose.test.yml` present; `npm run compose:test:up` would start it) |
| API key availability | `grep -q '^ARI_CLARISA_API_KEY=' .env` | present in `server/researchindicators/.env` (47 chars). Value never printed |

### 2.1 Consequence for T-01 — key source substituted, with its limit declared

The task text reads the key via `AppConfigService.getEnv(AppConfigKey.ARI_CLARISA_API_KEY)`. With
both databases unreachable that path cannot run, so the spike was briefed to use the `.env` value
instead. **Declared limit (KZ-017):** a `401` under the `.env` key is *ambiguous* — it cannot
separate *"assumption A-1 is false (the key is not valid for the Normalizer)"* from *"`.env`'s value
differs from the `app_config` row"*. A **non-401 is unambiguous** and confirms A-1 for that value.
The spike must not collapse the two readings.

### 2.2 Defect found in T-02's own Done check — verification command corrects to the scratch route

T-02 Done check 1 reads *"`npm run migration:dev:execute` against a scratch schema"*. Those name two
different targets:

| Script | Datasource | Target |
|---|---|---|
| `migration:dev:execute` | `src/db/config/mysql/orm.config.ts` | `dataSourceTarget.CORE` → `ARI_MYSQL_*` = the **shared, non-disposable Dev database** |
| `migration:test:bootstrap` / `migration:test:execute` / `migration:test:revert` | `src/db/config/mysql/orm.test.config.ts` | `dataSourceTarget.TEST` → `ARI_TEST_MYSQL_*` = the **disposable scratch schema** |

`orm.test.config.ts`'s own header states: *"Never point `ARI_TEST_MYSQL_*` at `ARI_MYSQL_*` (the
shared, non-disposable dev database) — see root CLAUDE.md §4.3."* Followed literally, T-02's Done
check would apply DDL to the shared remote Dev database, which root `CLAUDE.md` §4.3 makes a
**human-decided** step.

**Leader ruling:** T-02 will be briefed and verified against the **scratch** route
(`migration:test:bootstrap` → `migration:test:execute` → `migration:test:revert`). `tasks.md` T-02
carries the same wording and needs the same correction before the task is dispatched. DC-9's
substance is unchanged — the migration must still be **run**, not compiled.

---

## 3. Task Execution History

_(entries appended per task, on Reviewer PASS or on HALT)_

### T-01 — SPIKE: validate the contract against the TEST Normalizer

- **Status:** IN PROGRESS — attempt 1 FAILED review, attempt 2 dispatched
- **Date:** 2026-09-14
- **Requirements covered:** OQ-1, OQ-2, OQ-5, OQ-6 (gates every field claim downstream)
- **Skills assigned:** `api-design-principles` (attempt 1). **Deviation, attempt 2:** dropped —
  the rework is a documentation correction with no API-design content; the Implementer persona's
  own §*Correction sweeps* (KZ-005) is the discipline that applies instead.
- **Effort:** attempt 1 `high` → attempt 2 **`xhigh`** (rework bump)

#### Attempt 1 — Implementer

**Files changed (13):** `spike/README.md`, `spike/discovery-log.md`, `spike/requests/*.json` (5),
`spike/responses/*.json` (5), `homologation.md` (3 hunks: §4.3, §4.6, §10). **Zero `src/` changes**
— scope bound held, verified by the Leader via `git status --porcelain`.

**Verification:** no npm gate on this task; the evidence *is* the verification. 12 live calls to the
TEST Normalizer (`https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/ingest`), 5 committed as
decisive with verbatim response bodies and `requestId`s.

**Results:**

| OQ | Outcome | Decisive `requestId` |
|---|---|---|
| OQ-1 `grant_title` | **ANSWERED — premise FALSIFIED.** A deliberately garbage title got `200 success:true`, identical to a well-formed guess; **both** returned `"bilateral_projects":[]`. An unresolvable title does **not** fail the row | `Root=1-6aa852e8-42962254355b61c50e0b74df` |
| OQ-2 `innovation_readiness_level` | **ANSWERED at schema layer; persistence layer STILL OPEN.** `id`/`name`, `level`, and all three together all pass schema. No `innovation_development` row reached full ACCEPTED — blocked by an unrelated `innovation_typology` catalogue validation, no valid value reachable with the DB down | `Root=1-6aa8532c-5bc036d21bb27f3109931c8a` |
| OQ-5 `geo_focus.scope_code = 50` | **ANSWERED.** Accepted end-to-end, no companion geo rows required; `scope_label` must be the literal `"This is yet to be determined"` (the guess `"To be determined"` is schema-rejected) | `Root=1-6aa852fe-601bb8603e18414f743047c8` |
| OQ-6 PRMS result code | **ANSWERED — family OQ-F7 closed.** Returns **synchronously** at `results[].result.result_code` (3 calls: `9197`, `9198`, `9199`). Distinct from the Normalizer's own `resultId`, a deterministic idempotency key present even on failed calls | `Root=1-6aa852c3-48a0354007f30b9b35e91024` |

**Failing input (as mandated):** deliberately malformed `grant_title` → PRMS **accepted** it. Recorded
as the finding it is, not as a green. This is the task's own K-004 falsifier and it fired.

**Credential hygiene:** the literal 47-char `.env` key value appears **0 times** across the spec
folder — **independently re-verified by the Leader**, not taken on the worker's report. Referenced
only as the placeholder `<ARI_CLARISA_API_KEY>` or read from env at call time. DC-8 / NFR-PRMS-002
hold for this artifact.

#### Attempt 1 — Reviewer verdict: **STATUS: FAIL**

The Reviewer verified every quotation character-by-character against the committed response bodies
(9 claim rows + all 5 `requestId`s): **no paraphrase masquerading as a quote, no misattributed
`requestId`** — the task's stated disqualifier did not fire. Differences are pretty-print whitespace
and explicit `...` elisions only.

**Type coverage adjudicated COMPLIANT** (the Leader had raised it as an open question, not a
finding): "supported type" resolves to the three types v1 *sends*. `homologation.md:276` uses
"removed from the **supported set**" for the refused `knowledge_product`, and `:121` puts
`innovation_use` in the same refused class; `requirements.md:44-45` separates "Builds … all four"
from "**Actually sends** … three"; family R-F6 is literally "build ≠ send" and the spike *sends*.
Decisive: `homologation.md:262-268` records that with `usd_budget`/`is_determined` not built (D-1),
**every** Innovation Use payload is rejected by PRMS before Reporting — a spike call could only have
re-confirmed a known refusal. DD-10 / RB-2's `id`-vs-`level` off-by-one belongs to **T-08**, whose
done check asserts against the seeded `clarisa_innovation_use_levels`, not a live call.

**FAIL issues, verbatim:**

> **Issue 1 — Discovered Issue:** `spike/README.md:193-211` ("`homologation.md` updates made")
> misstates the change set in two ways. It opens "**Two** rows were edited" and then lists **three**
> (§4.3, §4.6, §10). More seriously, it states: *"`innovation_readiness_level` (§6) was **not**
> edited beyond a pointer to this spike"* — **no pointer exists**. `homologation.md:286-302` is
> untouched by the diff (the diff carries exactly three hunks, none in §6) and still closes with
> "*what is not knowable from the docs is which one the schema accepts. **Spike it***" — as though
> T-01 never ran. §6's field table meanwhile still lists only `innovation_readiness_level.id` ✅
> EXACT and `.name` ✅ EXACT, with no `level` row and no trace of the spike's finding that the schema
> tolerates all three keys at once. The one document T-07 will consult to build the Innovation
> Development block carries neither the answer nor a route to it, while the spike report asserts it
> does.
> **Violated Rule:** `tasks.md:105` — T-01 done check 3, "`homologation.md` updated where the spike
> contradicts it"; compounded by root `CLAUDE.md` §5 ("Do NOT silently let docs and code drift") and
> K-004 (an unobserved state may not be asserted — here, an edit that was never made).
> **Remediation Suggestion:** Add the pointer to `homologation.md` §6 that the report claims is
> already there — amend the blockquote at `homologation.md:296-300` to record, in one or two lines,
> that the **schema layer** is settled (no shape is rejected; `id`+`name`+`level` together pass)
> while **which key persists is still open**, citing `spike/README.md` § OQ-2 and
> `spike/responses/02-…json` / `03-…json`. Then fix `spike/README.md:195` ("Two rows" → "Three
> rows") and rewrite the §6 sentence at `:208-211` to describe what was actually done. Do **not**
> re-run any call — the evidence already on disk supports this edit.

> **Issue 2 — Discovered Issue:** The spike closed three open questions in the body of
> `homologation.md` but left the document's own open-question register asserting the opposite, so the
> file now contradicts itself. `homologation.md:433` (§10, edited) declares "Family OQ-F7 is
> **closed**", while `homologation.md:476` (§11) still lists **OQ-F7** — "Where (or whether) the
> PRMS-assigned result code returns" — as open with "Closed by: **Spike**". Identically, §4.3's edit
> declares scope 50 "**CONFIRMED**" while `homologation.md:475` still lists **OQ-H9** ("`scope_code =
> 50` — accepted, and under what conditional rule?") as open/Spike; **OQ-H6** at `:474` is untouched
> despite its schema half being answered; and `homologation.md:478` still reads "The spike is
> **unblocked**". §11 is the register a downstream reader (and T-07/T-08) consults to learn what is
> still open, and it now points the reader away from the answers three sections earlier in the same
> file. The document already owns the convention for this — `~~OQ-H1'~~ | **CLOSED — option (a)** …`
> at `:470-472` — and it was used in the body edits but not in the index.
> **Violated Rule:** `tasks.md:105` — T-01 done check 3, "`homologation.md` updated where the spike
> contradicts it". The spike's own §10 edit contradicts §11's OQ-F7 row inside one document.
> **Remediation Suggestion:** In `homologation.md` §11, close **OQ-F7** and **OQ-H9** using the
> file's existing strike-through convention, each citing the spike path + `requestId` already
> recorded in §10/§4.3. Amend **OQ-H6** to "partially answered — schema layer only; persistence open
> (see `spike/README.md` § OQ-2)". Amend **OQ-H5** to carry the falsified premise (an unresolvable
> title does *not* fail the row) while keeping the composition itself open. Drop or date-stamp the
> "The spike is unblocked" line at `:478`.

#### Attempt 1 — ADVISORY (4R lens findings — recorded, never gating, never minting a task)

Per `/akili-execute` §2.4 these are recorded here and die here. Two of them, however, bear on
**future** tasks and are carried to the user at the Step 5 gate — that is Leader forward-planning,
not scope-widening of T-01.

1. **RISK (KZ-017) — one phrase asserts an unobserved status.** `spike/README.md:166` says the code
   returns in the "`200`/`207`" response. All three `result_code` observations came from plain `200`
   bodies; **no 207 carrying a *successful* row was ever produced**. The only 207s seen wrapped
   upstream `502`/`503` and carried no code. Blast radius small — T-12's done check already requires
   recording the absence of a code rather than a silent NULL. `homologation.md:433` is correctly
   worded and needs no change.
2. **RELIABILITY — the load-bearing scope-50 quotation has no committed body.** The allowed-values
   list now load-bearing at `homologation.md:220-222` appears only as a **transcription** in
   `discovery-log.md:23,56`; the 422 body it came from
   (`requestId Root=1-6aa851eb-4ec93ae925475b33182f3ccf`) is one of seven discarded discovery
   responses, committed nowhere. §4.3's citation points at `responses/01-…json`, where the string is
   not found (recoverable one hop away via README § OQ-5 → discovery-log D-C).
3. ⚠️ **RESILIENCE — `discovery-log.md` D-D falsifies `design.md:316`, and T-01 has no authority to
   fix it.** Two live calls returned **`207` wrapping `HTTP 502: Proxy Error` / `HTTP 503: Service
   Unavailable`** under `results[0].error`, from the Normalizer's own downstream
   (`/api/bilateral/create`). Under `design.md:310-317` step 5, a `2xx` whose row failed maps to
   **`REJECTED_BY_PRMS`** — which would durably record a **transient downstream outage as a PRMS
   rejection**. *Reachability: observed live, twice, on an identical payload.* Squarely T-12's
   problem; **the design needs amending before T-12 starts.**
4. ⚠️ **RISK — D-E: `success:false` may not mean "nothing persisted".** A retry with a
   previously-failed title returned *"A result with the title … already exists."* although the
   earlier attempt reported `success:false`. If the downstream persists a partial record before its
   catalogue checks run, `REJECTED_BY_PRMS` does **not** imply "safe to re-send" — the same family as
   accepted residual risk **R-4**, and it would widen R-4 from `UNKNOWN` to some `REJECTED_BY_PRMS`
   rows. Observed once; the spike states two readings and rules out neither. Belongs on the PRMS PO
   agenda (`homologation.md` §11.1), not in a builder.
5. **READABILITY — the A-1 substitution is declared exactly as it should be** (`README.md:4-17`):
   it names the narrower claim it supports ("this specific `.env` value is valid for the Normalizer"
   ≠ A-1), cites KZ-017, and asks for re-confirmation once DB access returns. **This is a claim to
   RE-CHECK, not to accept permanently — it must reappear in T-04's evidence**, where the key is read
   through `AppConfigService` for real.
6. ⚠️ **READABILITY — the discovery log is the highest-value artifact here and no task points at
   it.** D-A (`toc_mapping` unconditionally required at the root of `data`) and D-B (type-specific
   fields nest under a same-named sub-object, **not** flat in `data`) **contradict how
   `homologation.md` §4/§7/§9 lay out every field table**, and will break T-06/T-07/T-08's builders
   on the first real call if nobody carries them forward.

#### Attempt 2 — Implementer (rework) + Leader scope correction

**Effort:** `xhigh` (rework bump from `high`).

**Edits:** `homologation.md` §6 (schema-settled / persistence-open record, citing both response files
and both `requestId`s) and §11 (register reconciled — `~~OQ-H9~~`/`~~OQ-F7~~` struck closed, OQ-H5
and OQ-H6 amended to partial, the "spike is unblocked" line replaced with a dated summary).
`spike/README.md` "updates made" section corrected.

**Leader scope correction, mid-attempt (recorded as a Leader error, not a worker error).** The
Implementer's sweep found two further stale sites in `homologation.md` — §1 `:46` and §1.2 `:119` —
and left them because the Leader's brief said "§6 and §11 only". **That boundary was wrong:** T-01
done check 3 reads *"`homologation.md` updated where the spike contradicts it"* with **no section
limit**. The Leader authorized both mid-attempt via a follow-up message rather than spending a
review round on its own briefing defect. `:119` was the serious one — it read *"Only OQ-H6
(`readiness_level` shape) pending, **and the spike settles it**"*, which is **false** and is the exact
claim T-07 would rely on to pick a readiness shape, against T-07's own disqualifier.

Final change set: **seven** sections of `homologation.md` (§1, §1.2, §4.3, §4.6, §6, §10, §11).
The three attempt-1 edits confirmed byte-identical via `git diff -U0`.

**Worker self-catch, disclosed:** its first draft of the README section said "Three sections" then
listed five — the same count-slip defect that failed attempt 1. It caught this on re-read and
corrected it before reporting.

#### Attempt 2 — Reviewer verdict: **STATUS: FAIL** (1 issue)

**Issues 1 and 2 of attempt 1: both CLOSED**, verified by the Reviewer opening each of the seven
described sites — all seven edits exist as described, both `requestId`s correctly paired with their
files, the register consistent with the body on all four axes, and the README's count matching its
own list (7 stated / 7 bullets / 7 verified).

**The "no third stale site" claim was FALSE.** New issue, same defect class:

> **Discovered Issue:** `homologation.md:467` (§10, *Authentication & webhooks*, "Key scope" row)
> still reads: *"Must be requested from PRMS Tech Support for STAR, TEST **and** PRODUCTION. **Not
> yet obtained — this is now the critical-path blocker.**"* The spike falsifies that for TEST, with
> evidence already committed and already verified in attempt 1: 12 authenticated calls got past the
> API-key gate with zero `401`s, and all three ACCEPTED responses show PRMS resolved the caller to
> `"external_platform_id": 34, "external_platform_code": "STAR"`. The key in hand **is** the STAR
> platform identity in TEST — precisely what that row says has not been obtained and is blocking.
> The row also half-*confirms* itself, so it is half-proven and half-disproven, and only the
> disproven half is labelled a critical-path blocker. Same shape as Issue 2: the adjacent row at
> `:466` already states the value was "**verified present in both TEST and PROD**", so §10's table
> now contradicts itself, and `tasks.md:370` (RB-1) and `requirements.md:516` (D-1) already carry the
> corrected state.
> **Violated Rule:** `tasks.md:105` — T-01 done check 3, the same no-section-limit reading the Leader
> applied to authorize §1 and §1.2.
> **Remediation:** Amend `:467` only — no new calls. Keep the per-environment scope rule and the
> platform-identity claim (the spike *confirms* both); replace the blocker sentence with the measured
> state — a valid **TEST** key is in hand and PRMS resolves it to platform `STAR`, while
> **PRODUCTION** remains unobtained and is the residual critical-path item. Carry the A-1 limit
> already declared at `spike/README.md:4-17`.

**Leader independently confirmed the finding** (not taken on report): `:466` and `:467` do
contradict each other; committed evidence shows `"external_platform_code": "STAR"` ×3 and `401` ×0.

**The Reviewer declared its own sweep limit (KZ-017), and this is the load-bearing fact for
attempt 3:** it ran two grep passes and *"Issue 1 was found **only** by the second pass"*. It stated
what neither pass can reach — *"a stale assertion phrased with none of those markers (e.g. a bare ⚠️
verdict in a field-table row that the spike silently disproved)"* — and that it read §4.3, §4.6, §6,
§8.3, §10, §11, §12.1, §12.4 in full but **did not read every field row**. It estimated 58 such rows;
the Leader measured **99** (`grep -c '^| \`'`). The unswept region is larger than the Reviewer
believed.

**Adjudications upheld (recorded so they are not re-litigated):**
- §8.3/§12.4 `sex_and_age_disaggregation` "prove it in the spike" is **NOT stale** — four reasons:
  the spike made no claim about it and never sent an `innovation_use` payload; both sites still read
  "NOT yet proven" so they mislead nobody; the spec assigns the proof to **T-08**; and T-01
  *structurally could not* have proven it, since D-1 makes every Innovation Use payload
  guaranteed-rejected. Residual: "in the spike" is now a mildly wrong pointer, for T-08 to retarget.
- Also adjudicated NOT stale: `:13`, `:215` (≥2-country rule — never exercised), `:412`/`:545-546`
  (§12.1 policy ids — positively corroborated by call 04), `:505` (§11.1 agenda item 5).

#### Attempt 2 — ADVISORY (recorded; never gating, never minting a task)

1. **New positive evidence for T-08.** Call 04 sent `policy_type: {"name": "Legal instrument"}` /
   `policy_stage: {"name": "Stage 1"}` and PRMS resolved them to internal `id: 2` / `id: 6`
   (`responses/04-policy-change.json:336-348`). Live confirmation of **DD-7 / §12.1** *and* a concrete
   demonstration that PRMS-internal ids are not the STAR/CLARISA numbers — the exact trap §12.1 warns
   about. Worth a line in §12.1 when T-08 runs.
2. ⚠️ **RISK — `innovation_typology` has a live negative signal only the discovery log records.**
   `homologation.md:290` asserts `innovation_typology.code` is "✅ EXACT — same CLARISA catalogue on
   both sides", yet PRMS TEST **rejected every value tried** (`"Unsupported innovation typology code
   \"1\""`, `"Unsupported innovation typology name \"Technology\""` — discovery-log D-F). Observed
   live 3×. Correctly **not** filed as gating (the guesses had no authoritative source, and §'s
   preamble already disclaims proving CLARISA-id equality) — **but it will land on T-07/T-14 as a loud
   rejection.** Must go into T-07's brief.
3. **READABILITY — one recurrence of the count-slip family.** `spike/README.md:195` says "Seven
   sections … across **two** passes" but enumerates three passes. The *section* count (the one Issue 1
   was about) is correct and verified; only the *pass* count is off.
4. **READABILITY — the "Closed by" column mixes two vocabularies** (`Decided`/`Spike (partial)` =
   mechanisms, alongside `Closed` = a state). Unambiguous in practice because the
   `~~struck~~`/`**bold**` convention carries state. Cosmetic.

---

## BUDGET TRIPWIRE — fired 2026-09-14, escalated to the user before attempt 3

`design.md` §13 budgets **2 review rounds**. T-01 has consumed **2** (attempt 1 review, attempt 2
review) and a third would exceed it, on **task 1 of 14**. Per `/akili-execute` §2.4 the Leader stops
and escalates with the delta and the cause rather than continuing on the assumption that finishing is
what was wanted.

**Cause — and it is not the spike work.** The empirical deliverable passed review on attempt 1 and has
never been challenged since: 12 live calls, every quotation verified character-by-character, all five
`requestId`s correctly attributed, type coverage adjudicated compliant. **Every failure has been
documentation consistency in `homologation.md`** — a 636-line document the spike invalidated in
several places at once, where each review round has surfaced a further stale site the previous sweep's
phrasing could not reach (2 sites → 2 more → 1 more).

**Leader's read:** this is convergent, not runaway — the sites are each smaller and the Reviewer has
now *named the region it could not inspect*. The risk is spending the last attempt on `:467` alone and
HALTing on a fourth round over site number six.

#### Attempt 3 — Implementer (exhaustive close-out, user-approved after the budget tripwire)

**Effort:** `xhigh` held (tier↔effort rule forbids `max` on a T2 tier; the fix for an incomplete
sweep is a better **procedure**, not a higher dial).

**Protocol deviation, recorded:** the rework loop says spawn a *fresh* Implementer. The Leader reused
the same worker instead. Rationale: the fresh-context rule guards against anchoring on a failed
*approach*, but these were **coverage** failures, and the worker's accumulated map of a 664-line
document is an asset for an exhaustive read. Judged the better trade at attempt-3-or-HALT stakes.

**Method change — the actual fix.** Three rounds each found their site via a *different* grep
phrasing than the last. That is evidence the technique was wrong, not that the sweeps were careless.
Attempt 3 was briefed: *"Grepping for phrasings has now failed three times. Stop grepping for
phrasings."* It **read every row** and classified each UNAFFECTED / CONFIRMED / CONTRADICTED, with a
**per-section completeness line for every section including zero-finding ones** — because silence
about a section is indistinguishable from not having read it, which is what let three sites through.

**The worker corrected the Leader's own figure.** The brief said 99 field rows (from
`grep -c '^| \`'`). The worker read **178** table-and-prose rows, explaining that the Leader's pattern
missed rows starting `| **`, `| ~~`, `| —`. Leader confirmed: `grep -c '^| '` = 212 including
headers/separators. **The Leader's count would have licensed a completeness claim over roughly half
the document** — the same defect class the sweep existed to close, one level up.

**Two new CONTRADICTED sites fixed:**

1. **`:472` §10 "Key scope"** — the Reviewer's cited issue. Kept the two halves the spike *confirms*
   (per-environment scope; the key **is** the platform identity), grounded in
   `"external_platform_id": 34, "external_platform_code": "STAR"`, carrying the A-1 limit by
   reference.
2. ⚠️ **`:188-194` §4.1 — found only by the all-row read, missed by all three grep rounds, and the
   most consequential edit in the task.** The text claimed `toc_mapping` could be *"**omitted** in
   favour of `contributing_programs`"*. Finding **D-A** falsifies it: a call omitting it was rejected
   with `"(root) must have required property 'toc_mapping'"` (`requestId
   Root=1-6aa851eb-4ec93ae925475b33182f3ccf`). **This is a build rule, not cosmetic staleness** — it
   is unconditionally required at the root of `data`, *including* for an `aligns_with_toc: false`
   row. Left standing it would have taught **T-06** that a required field is optional, failing at the
   live call in T-14 rather than in unit tests.

**Exhaustive-pass audit record** (committed here per the Reviewer's advisory — it is the artifact
proving *which* rows were examined, without which a later reader cannot distinguish "swept and found
clean" from "not swept"). 39 sections/subsections · 178 rows · 664 lines:

| Section | Rows | Affected | Section | Rows | Affected |
|---|---|---|---|---|---|
| §0 Document Control | 6 | 0 | §4.6 `contributing_bilateral_projects[]` | 4 | 2 → fixed |
| Legend | 5 | 0 | §5 `knowledge_product` | 0 | 0 |
| §1 Executive summary | prose | 1 → fixed | §6 `innovation_development` | 5+bq | 2+bq → fixed |
| §1.0 Governing principle | 0 | 0 | §7 `capacity_sharing` | 6 | 5 confirmed |
| §1.1 Decisions D-1…D-7 | 7 | 2 confirmed | §8 `innovation_use` intro | 0 | 0 |
| §1.4 What P-1 removes | 3 | 0 | §8.1 `innovation_use_level` | 2 | 0 (untested, gated) |
| §1.3 Centre map | 2 | 1 confirmed | §8.2 `current_..._numbers` | 4 | 0 |
| §1.2 What v1 delivers | 6 | 3 → fixed/confirmed | §8.3 `actors[]` | 11 | 0 (untested) |
| §2 Envelope | 5 | 5 confirmed | §8.4 `organization[]` | 3 | 0 |
| §3 Result type mapping | 7 | 3 confirmed | §8.5 `measures[]` | 2 | 0 |
| §4 Common fields | 12 | 2 partial | §9 `policy_change` | 6 | 3 confirmed |
| §4.1 `toc_mapping` | 5+bq | **1 bq → fixed (D-A)** | §10 Response handling | 6 | 1 → fixed + 2 flagged |
| §4.2 `contributing_programs[]` | 4 | 0 (never sent) | §10.1 API key behaviours | 3 | 0 (untestable by HTTP) |
| §4.3 `geo_focus` | 5 | 2 → fixed | §10 Auth & webhooks | 5 | **1 → fixed** |
| §4.4 Institutions | 3 | 0 (untested) | §11 Open questions | 7 | 7 → fixed |
| §4.5 `evidence[]` | 4 | 0 (never sent) | §11.1 PO agenda | 6 | 0 (product decisions) |
| §12 Inverting inbound | 10 | 0 (untestable) | §12.1 Policy ids | prose | 0 |
| §12.2 `length_training` | 2 | 0 | §12.3 `indicator.homologation` | 2 | 0 |
| §12.4 `sex_and_age_disagg.` | 2 | 0 (**T-08's**, not T-01's) | §12.5 Role filter | 3 | 0 |
| §12 Provenance | 15 | 0 (outside spike's reach) | | | |

**Declared gaps (KZ-017) — the Reviewer ruled none disqualifying:**
- §10 `422`/`rejected[]` shape — unconfirmable from committed evidence (the full 422 body was never
  committed, only an excerpt). Belongs to **T-12** (`design.md:316` step 4) and **T-14** (DC-3).
- §10 `503` dual cause — D-D shows a second cause (a downstream `/api/bilateral/create` hop).
  Already scoped into the deferred `design.md` amendment.
- §8 `innovation_use` nesting — declared **inferred by analogy, NOT confirmed**; the type is gated and
  was never callable.
- §12 Provenance (15 rows) — static-analysis pointers, outside the spike's evidentiary domain per the
  document's own scope note at `:8-14`.

#### Attempt 3 — Reviewer verdict: ✅ **STATUS: PASS**

> T-01's three done checks are met — one verbatim, committed response per sent type with its own
> `requestId`; all four OQs answered with the answering response text quoted, with OQ-1's falsified
> premise and OQ-2's open persistence half explicitly recorded and now propagated to every place a
> downstream task will read them (§1, §1.2, §6, §11); and `homologation.md` updated at **nine** sites,
> the last two found by an all-row read after phrase-grepping was shown to be insufficient, with the
> remaining imperfect sites either declared beyond the spike's reach or deliberately deferred to a
> separately-reviewed amendment pass.

**Reviewer spot-checks of sections it had not previously read in full** — §7 (0 contradicted, several
confirmed: `female_using 3 / male_using 2 / non_binary_using 0` against the 3/2/0 sent;
`training_length "Short-term"`, `delivery_method "Virtual / Online"` resolved; `unknown` omitted and
accepted) · §9 (0 contradicted; `policy_type`/`policy_stage` by **name** resolved to internal ids
`2`/`6`, which *corroborate* §9's "id alignment unproven" caution) · §8.1–8.5 (UNAFFECTED, correct) ·
§12.x (0 contradicted). It also noted §4.1's edit cites **D-A directly with D-A's own `requestId`**,
rather than a committed response file that does not contain the string — fixing, unprompted, the
citation-precision problem it had raised as an advisory in round 1.

#### Attempt 3 — ADVISORY (recorded; never gating, never minting a task)

1. ⚠️ **The Reviewer's own remediation text was wrong, and the worker implemented it verbatim.**
   `:472` says "**PRODUCTION** remains **unobtained**"; the accurate word is **unverified**. `:466`
   records the PO verified the value **present in both TEST and PROD** on 2026-09-14, and PROD was
   never called (correctly — nobody should call PROD from a spike). "must still be requested from
   PRMS Tech Support" asserts a procurement fact **nobody measured**. → **added to the amendment
   queue.**
2. **Third recurrence of the count slip, in the same sentence.** `spike/README.md:195` says "Nine
   sections … across **three** passes" then enumerates **four** groupings. All load-bearing counts
   (nine sections / nine bullets / nine verified) are correct, so this is history-keeping, not an
   evidence claim — but the sentence itself is now the defect. → amendment queue: replace the prose
   narrative with the bullet list alone.
3. **§4.1's finding has a named consumer: T-06.** "`toc_mapping` is unconditionally required at the
   root of `data`, even for an `aligns_with_toc: false` row" is a build rule. T-06 derives expected
   values from homologation §4, which now carries it — **but it must be named explicitly in T-06's
   brief**, since a builder omitting it fails at T-14's live call, not in unit tests.

---

### T-01 — FINAL: ✅ **PASS on attempt 3 of 3**

- **Requirements covered:** OQ-1 (premise falsified), OQ-2 (schema settled / persistence open),
  OQ-5 (closed), OQ-6 (closed — family OQ-F7 closed with it)
- **Files:** 12 new under `spike/`, `homologation.md` at 9 sites. **Zero `src/` changes.**
- **Verification:** the evidence *is* the verification — 12 live TEST calls, 5 committed with
  verbatim bodies + `requestId`s; every quotation verified character-by-character by the Reviewer.
- **Credential hygiene:** literal key value appears **0 times**; Leader-verified independently, twice.
- **Review rounds:** 3 (budget 2 — tripwire fired and was escalated; the user approved the third as an
  exhaustive close-out rather than a one-line fix). Every failure was documentation consistency in
  `homologation.md`; **the empirical work passed on attempt 1 and was never challenged.**
