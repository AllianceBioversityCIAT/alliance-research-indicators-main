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

---

## 4. Execution-host change — standing arrangement adopted 2026-09-15

The user's ruling in `docs/model-routing.md` (main checkout, updated 2026-09-15) is now the default
for every AKILI activity in this repo: **Claude Code plans, reviews and adjudicates; it does not
write production code.** Implementation goes to another host and the independent audit to a third,
so `author ≠ auditor` holds across **model families**, not two instances of one family.

| Role | Host | Model |
|---|---|---|
| Leader | Claude Code | `opus` (T1) |
| Implementer — server | **Codex** `codex exec` | `gpt-5.6-terra`, effort `medium` |
| Implementer — client | **Cursor** `cursor-agent -p` | `cursor-grok-4.6-*` (n/a for this spec — design §6: no `client/` change) |
| Reviewer | **Antigravity** `agy` | `gemini-3.1-pro-high` (never `*-flash`) |

Orchestration runs through **Orca** (`Run → Task → Dispatch`), never generic subagent spawns.
Run for this spec: `run_3ed0320bedc0`.

**Hosts smoke-tested before first dispatch** (the routing doc's own rule: *"Always smoke-test, never
trust the login line"*): Codex → `CODEX_OK` (`gpt-5.6-terra`, no `402`); Cursor → `CURSOR_OK`
(requires `--force`, this worktree is not trusted); Antigravity → `AGY_OK`; `orca status` → ready.

**Three drifts found in the canonical routing doc, reported to the user:** `agy models` returns
**14** slugs, not the 15 the doc states (the list contents match exactly; only the count is wrong —
and the correct number was in the `CLAUDE.md` mirror, so the error entered the canonical table);
`opencode` is now **not installed at all**, not merely unusable; and Cursor needs `--force` on
untrusted worktrees.

> ⚠️ **T-01 ran under the PREVIOUS arrangement** — Claude subagents for both Implementer (sonnet)
> and Reviewer (opus), outside Orca. Stated plainly per the orchestration skill's own rule (*"do not
> retroactively describe the external worker as orchestrated"*). T-01's PASS is therefore **not**
> cross-family independent. Its empirical core — 12 live calls with verbatim bodies — does not depend
> on which model reviewed it, but the independence guarantee was not met for that task. A
> cross-family re-review of T-01 is **available and not yet requested**.

---

### A-01 — Post-T-01 spec reconciliation (user-approved amendment, not a `tasks.md` task)

- **Status:** ✅ **PASS on attempt 1**
- **Date:** 2026-09-15
- **Why it exists:** the user approved amending two spec defects the T-01 spike exposed **before**
  the tasks that depend on them run. Recorded here as an amendment, **not** minted as a new task —
  advisories may never grow the approved scope; only the user may authorize work outside `tasks.md`.
- **Orca provenance:** run `run_3ed0320bedc0` · task `task_7bffae9eb91d` · dispatch `ctx_82598ca044c3`
- **Implementer:** Codex `gpt-5.6-terra` (effort `medium`) — `launch.effective` confirmed
- **Reviewer:** Antigravity `gemini-3.1-pro-high` — task `task_6a1a8451b63f`, dispatch `ctx_357ae70e36f9`

**Files changed (4):** `design.md`, `requirements.md`, `homologation.md`, `spike/README.md`.
29 insertions / 29 deletions. **Zero `src/` changes**, Leader-verified via `git status --porcelain`.

**Edits landed:**

1. ⚠️ **`design.md` §5.3 step 5 — the 207 rule (the highest-value edit).** Previously *any* 2xx with
   a failed row mapped to `REJECTED_BY_PRMS`. Discovery-log **D-D** falsified this: two live `207`s
   wrapped `HTTP 502: Proxy Error` / `HTTP 503: Service Unavailable` from the Normalizer's **own**
   `/api/bilateral/create` hop — not a rejection of our data. A transient outage would have been
   recorded durably as a PRMS rejection. Now classified **by the cause in `results[].error`**:
   downstream 5xx → `RETRYABLE`; validation/business → `REJECTED_BY_PRMS`. §5.4 vocabulary updated to
   match. **The load-bearing invariant is untouched** — `is_synced_to_prms` flips only on `ACCEPTED`,
   same transaction — and the Reviewer confirmed the blockquote after step 5 is unharmed.
2. **`design.md` §12 — `DD-18` added.** Number verified free against all 18 entries. Notably it
   **declares its own evidentiary limit unprompted**: D-D's two discovery-response bodies were not
   retained, so D-D is the sole contemporaneous evidence for those exact errors. That is KZ-017
   discipline applied without being asked for it.
3. **`homologation.md` §2/§6/§7/§9 — the D-B nesting rule.** Type-specific fields nest under a
   same-named sub-object; §4 common fields stay **flat** at the `data` root. Each section cites its
   own evidence. **§8 `innovation_use` recorded as INFERRED BY ANALOGY, NOT CONFIRMED** — that type
   is gated and was never called, so no evidence exists. This is what protects T-06/T-07/T-08 from
   building flat payloads that fail on the first live call.
4. **`homologation.md` "Key scope"** — PROD is now **unverified/untested**, not "unobtained". The PO
   verified a value present in both TEST and PROD; PROD was simply never called. *(This corrected an
   error in the T-01 **Reviewer's own** remediation text, which the worker had implemented verbatim.)*
5. **OQ tables reconciled** in `requirements.md` §13 + §12 R-3 + R-PRMS-005 AC.2 and `design.md` §14
   + the T-SPIKE testing-strategy row: OQ-5/OQ-6 struck closed; OQ-1 premise falsified with
   composition still unproven; OQ-2 schema-layer only with persistence open.
6. **`spike/README.md`** — the thrice-miscounted pass-count sentence replaced by the bullet list
   alone, per the T-01 advisory (the sentence itself was the defect, not the number).

**Reviewer verdict — `STATUS: PASS`:**

> The diff accurately reconciles the spec with the T-01 spike evidence, maintaining high citation
> fidelity and introducing no overclaims. The 207 cause-classification rule and D-B nesting rule are
> correctly documented without violating the `is_synced_to_prms` invariant, and all factual
> corrections and OQ state updates have been applied without creating self-contradictions.

**Leader's independent falsification of the verdict's central claim.** The audit ran in ~3 minutes,
so citation fidelity was re-checked inline rather than taken on trust: **all 6 `requestId`s cited in
the new text resolve to exactly the evidence file each is attributed to** (5 to their
`spike/responses/*.json`, and the discovery-only `Root=1-6aa851eb-…` to `discovery-log.md`, correctly
cited as such). The claim holds.

**Reviewer finding handed to the Leader** (`tasks.md` was off-limits to it): T-01's *"Requirements
covered: **closes** OQ-1, OQ-2, OQ-5, OQ-6"* overstated the outcome, matching the `design.md` row
Codex had already fixed. **Leader corrected it.** The Reviewer also called §6's done-definition item
stale — it is **not**: its text reads *"closed by T-01, **or carried forward explicitly**"*, and the
Reviewer's paraphrase dropped the disjunct that makes it satisfiable. Grep-falsified before flipping
(KZ-002): `~~OQ-5~~`/`~~OQ-6~~` struck closed in **both** documents, OQ-1/OQ-2 carried forward
explicitly in both. Criterion met → flipped `[x]`.

**Orca lifecycle note, recorded honestly.** `worker-start --terminal` returned
`[failed] stage=dispatch_input — agent_prompt_stalled` for the Antigravity worker. **This was a false
negative of the transport, not of the work:** `terminal read` showed the agent had already read
`.agents/reviewer.md` and `CLAUDE.md` and run `git diff`. The consequence was real, though — the
dispatch capability was revoked, so Orca **rejected** the `worker_done`
(`dispatch_capability_invalid`) while preserving its body, which is how the verdict was recovered.
The task was settled by explicit `task-update --status completed` recovery, not by an accepted
`worker_done`. **The audit is genuine and cross-family; its lifecycle settlement was manual.**

---

### Wave 1 — T-02, T-04, T-05 (parallel) + T-02b

- **Status:** ✅ **PASS on attempt 1** (all three, one shared audit)
- **Date:** 2026-09-15
- **Orca provenance:** run `run_3ed0320bedc0`
  | Task | Orca task | Dispatch | Worker |
  |---|---|---|---|
  | T-02 migration | `task_1aa9bccdfffc` | `ctx_bd2c5eada77f` | Codex `gpt-5.6-terra` / `medium` |
  | T-04 transport | `task_64456b552b19` | `ctx_feb1951195ad` | Codex `gpt-5.6-terra` / `medium` |
  | T-05 maps | `task_b561721a954e` | `ctx_5415ad5d7694` | Codex `gpt-5.6-terra` / `medium` |
  | T-02b lint fix | `task_3763dbbca7bf` | `ctx_4bbc0a3e8c9a` | Codex `gpt-5.6-terra` / `low` |
  | Wave review | `task_61a8d8a47717` | `ctx_1ab5f9fdf574` | **Cursor `cursor-grok-4.6-high-fast`** |

**Parallelism justification.** `tasks.md` §1 declares the `{T-04}`, `{T-05}` and `{T-02}` lanes
file-disjoint; root `CLAUDE.md` §4.3 forbids concurrent **full-suite runs**, not concurrent editing.
Every worker was therefore briefed: *"NEVER run `npm test` with no path"*, run only its own scoped
tests, and the **Leader re-measures the full suite after all workers report**. Scratch DB was brought
up by the Leader (`compose:test:up`) and verified (`ari_scratch_test`, 216 tables) before T-02 was
dispatched — Docker had been started by the user but the container had not.

**Files (14):** migration + migration-spec · `prms-normalizer.{module,service}.ts` + spec + `dto/` ·
three `homologation/*.ts` + three specs · `app-config.util.ts` · `.env.example`.

#### Leader-measured gates (tree quiet, no worker active)

| Gate | Result |
|---|---|
| Full suite `npm test -- --silent` | **371 suites passed · 3138 passed · 1 skipped · 3139 total** |
| `npx eslint` over the wave, **unpiped** | **exit 0**, zero files with errors |
| Migration **forward** on scratch | 18 columns; `idx_result_prms_sync_log_result` + `idx_result_prms_sync_log_request_id` + PRIMARY; `information_schema` types/nullability match design §3 incl. the `UNKNOWN` three-NULL case |
| Migration **revert** | proven — the table was **absent** before the Leader's forward run, which is what the worker's revert left |

#### Failing inputs — each gate was observed RED (K-004)

- **T-02:** a `?` inside a SQL comment → `Named query contains placeholders, but parameters object is
  undefined` + `ROLLBACK`; clean `COMMIT` after removal. **This is the trap the task exists for** —
  migration `1784500000000` shipped unrunnable past every static gate this repo has.
- **T-04:** a bare `{ validateStatus: () => true }` → `Expected: password normalizer-password and
  username normalizer-user, Received: undefined`. The proof that `_defaultConfig`'s `auth` really is
  dropped wholesale; green 10/10 after restoring the spread form.
- **T-05:** a seventh `IndicatorsEnum` member → red diff missing `7`; green after removal.

#### Reviewer verdict (Cursor `cursor-grok-4.6-high-fast`): ✅ **STATUS: PASS**

> T-02, T-04 and T-05 match their Done checks and the cited design/homologation rules. No
> spec-conformance defect.

All nine audit items A–I confirmed with quoted evidence. The two that matter most:

- **A — the sharpest line.** `prms-normalizer.service.ts` captures `const defaultConfig =
  this._defaultConfig`, then passes `{ ...defaultConfig, headers: { ...defaultConfig.headers,
  'x-api-key': apiKey }, validateStatus: () => true }`. **Both** the top-level spread **and** the
  nested `headers` re-spread are present before `validateStatus` — the exact form design §2.3/§2.5
  mandate given `base-api.ts:89`'s `config ?? this._defaultConfig`.
- **B — KZ-001.** The assertion reads the object *passed to* `httpService.post`:
  `const configActuallyPassedToHttpPost = httpService.post.mock.calls[0][2];` — and the Reviewer
  traced `BaseApi.request` to confirm it posts that same `requestConfig` as the third argument. The
  property is asserted in the generated output, not on the call sequence that produced it.

Also confirmed: DC-7 declared as config-resolution-only in both the test comment and the spec; the
key read **inside `ingest()`**, never the constructor (DD-6), with a missing row raising a clear STAR
`ServiceUnavailableException` rather than an empty header and a PRMS `401` (R-PRMS-009 AC.2);
`indicator-type.homologation.ts` a **new artefact** that neither imports nor inverts the inbound map
(DD-13), total over six members with explicit `null` for the unmappable ids 3 and 5; both `ExCIAT`
and `ExBIO` asserted through the `.toUpperCase().trim()` path (R-PRMS-003 AC.2); no `?`/`:word` in
the migration and its spec correctly in `db/migration-specs/` (child guide §7/§9).

#### ADVISORY (recorded; never gating, never minting a task)

1. **T-05 — delete the permanent `it.skip`.** `indicator-type.homologation.spec.ts` retains
   `it.skip('detects a seventh STAR indicator without an outbound map entry')`, which still contains
   `Object.assign(IndicatorsEnum, { OUTBOUND_TOTALITY_FIXTURE: 7 })`. Reachable hazard: removing
   `.skip` mutates the **global** enum for later suites. The Reviewer adjudicated it *not* a FAIL —
   the live gate is the preceding "is total over the current IndicatorsEnum members" test, which
   makes the same comparison — and recommends deleting the skipped fixture now that its K-004 red is
   recorded. **Carried to the user at the gate; not actioned unilaterally.**
2. **T-05 — `length-training` inverts inbound maps at call time** with `as PrmsLengthTraining`.
   §12.2 mandates that inversion and the Master/MSc target-vocabulary resolution, which the code
   handles. Reachable only if a later edit drops `'Short-term'` from `SessionLengthHomologation`,
   where `BSC + SHORT_TERM` would return `undefined`. No action for this wave.

#### Incidents — recorded because they are signal for later sessions

1. **Cross-worker contamination (real, harmless).** The T-04 worker ran `prettier --write` across the
   whole `prms-normalizer` directory, reformatting T-05's then-untracked files. **It self-reported
   via escalation.** Leader verified `prettier --check` passes on all six and content is coherent;
   the **Reviewer independently confirmed** no truncation, merge residue or semantic alteration
   (item H). Impact: whitespace only. The brief had allowed `prettier --write` **on the worker's own
   files**; the over-broad glob is what tripped.
2. **T-02 shipped 4 lint errors and never ran eslint.** Found by the Leader (`npx eslint`, exit 1),
   fixed by a scoped follow-up dispatch (T-02b, effort `low`), re-verified by the Leader at exit 0.
   The fixer belongs to the worker and the gate to the Leader — no single command may do both (K-001).
3. ⚠️ **`npm run migration:scan` is BROKEN in this repo.** It maps to
   `node ./scripts/scan-migration-placeholders.js`, and **that file does not exist**
   (`MODULE_NOT_FOUND`). It was offered to T-02 in its brief as an available helper. T-02 did not
   rely on it and closed DC-9 by an actual run, which is what the task required. **A gate that looks
   mandated and cannot execute is the K-004 failure mode at the tooling level** — worth fixing or
   removing from `package.json`.
4. ⚠️ **Antigravity Reviewer died mid-audit, twice** (`gemini-3.1-pro-high`). Attempt 1 exited after
   reading `.agents/reviewer.md`; attempt 2 — re-briefed via a **file pointer** instead of a ~7 KB
   inline prompt — got as far as audit item E before exiting. Both left `Resume with -c` and a shell
   prompt. This is a **runtime failure, not a work FAIL**. Per `/akili-execute`'s fallback table the
   Reviewer is **never** taken inline (the Leader auditing work it supervised breaks
   `author ≠ auditor`, and a runtime failure does not suspend a correctness constraint), so the
   options were escalated to the user, who chose **Cursor**. The failed review task had already
   circuit-broken (`task_not_startable: only a ready Task can start`), so a fresh task was created
   rather than forcing the old one.
5. **Orca transport quirks worth knowing.** `worker-start --terminal` on Antigravity reports
   `[failed] stage=dispatch_input — agent_prompt_stalled` while the prompt **has** landed and the
   agent is working — read the terminal before believing it. A revoked dispatch capability makes Orca
   **reject** a `worker_done` while preserving its body. `check --wait` can return **exit 0 with
   `ok:false`** (`runtime_unavailable`) — read the body, not the exit code. Only **one** actionable
   waiter per Run exists; a second returns `waiter_exists`.

#### Leader falsification of the verdict (KZ-002)

Done checks were grep-falsified before flipping. One check disagreed with the Reviewer — the key-read
grep returned **0**. Investigated rather than reported: the call is split across two lines
(`getEnv(\n  AppConfigKey.ARI_CLARISA_API_KEY,\n)`), so the single-line pattern **structurally could
not match**. **The Reviewer was right and the Leader's measurement was wrong** — K-014 again, a
confident zero over a pattern that could not have found the fact.
