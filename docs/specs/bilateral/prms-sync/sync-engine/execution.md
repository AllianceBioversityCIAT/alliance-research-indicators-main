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

---

### T-03 — Entity + outcome enum (+ user-approved T-05 cleanup)

- **Status:** ✅ **PASS on attempt 2 of 3**
- **Date:** 2026-09-15
- **Executor change:** Codex hit **94 % quota**, so the user re-routed implementation to **Cursor**,
  which `docs/model-routing.md` already names *"a viable fallback executor for server work"*. The
  Leader raised this rather than taking implementation inline — taking it would have cost
  `author ≠ auditor` on the author axis, which the user's own 2026-09-15 ruling exists to protect.
- **Orca provenance:** run `run_3ed0320bedc0`
  | Attempt | Role | Task | Dispatch | Worker |
  |---|---|---|---|---|
  | 1 | Implementer | `task_8af0c0df9a38` | `ctx_13cd6726cd45` | Cursor `cursor-grok-4.6-high-fast` |
  | 1 | Reviewer | `task_4ca6cbeca3f9` | `ctx_442b115b3f20` | Cursor `gpt-5.6-sol-high` |
  | 2 | Implementer | `task_80755617ac92` | `ctx_3553ca162645` | Cursor `cursor-grok-4.6-high-fast` |
  | 2 | Reviewer | `task_4d27adbb415f` | `ctx_ee1a82d6f7fc` | Cursor `gpt-5.6-sol-high` |

  Three distinct families across the loop: author **xAI**, auditor **OpenAI**, Leader **Anthropic**.

#### Item 1 — the approved T-05 cleanup (wave-1 advisory, user-approved)

Deleted `it.skip('detects a seventh STAR indicator without an outbound map entry')` and with it
`Object.assign(IndicatorsEnum, { OUTBOUND_TOTALITY_FIXTURE: 7 })`, whose global mutation would have
polluted sibling suites had anyone removed the `.skip`. The live `is total over the current
IndicatorsEnum members` test is untouched and remains the gate. **Leader-verified by the suite itself:
skipped count went 1 → 0.**

#### Attempt 1 — Reviewer verdict: ❌ **STATUS: FAIL** (one issue)

Items A, B, C, E, F passed: cleanup bounded, entity/migration one-for-one, exact eight-member
vocabulary, scope clean (no module/controller/service, **no early registration** in
`entities.module.ts` or `main.routes.ts`), spec placement per child guide §9.

> **Discovered Issue:** la prueba de `APPROVED_BY_SP` es una comprobación estática disfrazada de
> comportamiento. **Violated Rule:** `tasks.md` §3 T-03 Done check 3 y su cláusula de evidencia
> descalificada, junto con `design.md` §5.4 / **KZ-001**, porque el caso sí se pondría rojo si la
> metadata de la entidad cambiara a `enum`, **pero no si el esquema generado/activo fuera `enum`
> mientras los archivos estáticos siguieran diciendo `varchar`**, y la asignación al POJO mediante
> cast no ejerce persistencia. **Remediation:** sustituir la lectura del texto de migración y la
> asignación en memoria por una prueba contra el esquema scratch que inserte y recupere
> `APPROVED_BY_SP`, de modo que un MySQL ENUM real haga rojo el gate.

⚠️ **The Leader had accepted this test before the audit ran.** On inspection it asserted against the
migration's SQL *text* rather than only the decorator, and that looked sufficient. It was not: the
migration file is **also a proxy**. The property *"a future verdict needs no DDL"* lives in the live
database schema and nowhere else. **A Leader auditing its own judgement would have shipped this
defect with a PASS** — which is precisely what `author ≠ auditor` exists to prevent.

#### Attempt 2 — the Leader's architectural ruling (endorsed by the Reviewer)

The obvious fix — a DB round-trip — collided with the test architecture. The unit suite is
`rootDir: "src"`, `testRegex: ".*\.spec\.ts$"`, **no `globalSetup`, no DB bootstrap**: DB-free by
design. Putting a round-trip there would make `npm test` require Docker for everyone. The integration
suite already exists for exactly this (`test/jest-integration.json`, `npm run test:integration`,
precedent `test/bilateral-primary-contributing-sp.integration-spec.ts`). The rework brief ruled the
test into the integration suite and asked the Reviewer to challenge that call; it
**endorsed it**: *"ubicar el round-trip en `test:integration` es la decisión correcta."*

#### Attempt 2 — the falsifier, observed (K-004)

The brief mandated proving the new gate discriminates **against a real schema defect**, on the
disposable scratch schema:

| Step | Result |
|---|---|
| Green at `varchar(40)` | 3 passed |
| `ALTER TABLE result_prms_sync_log MODIFY outcome ENUM(…eight members…) NOT NULL` | **RED — `QueryFailedError: Data truncated for column 'outcome'`** |
| Restore `MODIFY outcome varchar(40) NOT NULL` | green again |

**Leader-verified afterwards:** scratch `outcome` is back to `varchar(40)` and the table holds **0
leftover rows**. That matters — T-11 and T-14 use this table.

New file `test/result-prms-sync-log-outcome.integration-spec.ts`, three tests:
1. connects via `ARI_TEST_MYSQL_*`, **never** `ARI_MYSQL_*` — a guard against the shared Dev database,
   the hazard `orm.test.config.ts`'s own header warns about. Not requested; the worker added it.
2. active column type is `varchar(40)`, not `ENUM` — read from **live `information_schema`**.
3. inserts and reads back `APPROVED_BY_SP`, a verdict deliberately *not* among the current eight.

#### Attempt 2 — Reviewer verdict: ✅ **STATUS: PASS**

> La nueva integración consulta `information_schema` sobre el esquema activo y hace INSERT/SELECT de
> `APPROVED_BY_SP`, por lo que cualquier ENUM real falla ya sea por la aserción de tipo o por
> rechazo/truncamiento; la prueba unitaria ya declara su alcance estático, KZ-017 identifica
> correctamente que `npm test` no la recoge, el datasource usa solo `ARI_TEST_MYSQL_*`, el teardown
> elimina primero el log y después su resultado **incluso ante fallos ordinarios a mitad de prueba**,
> no hay DDL, y ubicar el round-trip en `test:integration` es la decisión correcta.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **373 suites · 3155 passed · 0 skipped** (was 371/3138/1-skipped) |
| New integration spec, isolated | **3 passed** |
| `npx eslint`, unpiped | **exit 0** |
| Done check 2 falsified | exactly **8** members, matching design §5.4 verbatim |
| Done check 1 arithmetic | 18 live columns = 1 `@PrimaryGeneratedColumn` + 11 `@Column` + 6 inherited from `AuditableEntity` |

#### Declared limit (KZ-017) — carried forward

`npm test` (`rootDir: "src"`) **never runs the integration config**. The extensibility proof therefore
requires `npm run test:integration` **and a live scratch schema**. Anyone reading only the unit
suite's green does not have this proof. Stated in the spec file itself.

#### Notes

- **Scope creep, corrected.** The attempt-1 worker also wrote
  `docs/specs/.../t-03-implementer-report.md`, outside its declared scope. The Leader **deleted** it:
  a second audit document beside `execution.md` is two places asserting the same facts, which is what
  KZ-005 ("a measured figure gets ONE home") exists to prevent. Its content is folded in here.
- **Pre-existing, not this task's:** an unfiltered `npm run test:integration` fails in
  `test/support/t13-data-source.ts` because `T13_MYSQL_PASSWORD` is unset. That file is tracked and
  untouched by this change, and its refusal to fall back to a default password is a deliberate guard.

---

### T-06 — Common-fields builder

- **Status:** ✅ **PASS on attempt 2** (the largest task in the spec, effort L)
- **Date:** 2026-09-15
- **Orca provenance:** run `run_3ed0320bedc0`
  | Dispatch | Role | Task | Worker |
  |---|---|---|---|
  | `ctx_4b99c6a09b2b` | Implementer a1 | `task_9d52d0f1c823` | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_57922feebea4` | Reviewer a1 | `task_9782a9704dd3` | Cursor `gpt-5.6-sol-high` |
  | `ctx_a7f11fb7cc43` | Implementer a2 | `task_2f7eb05f6f29` | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_9365d67ebc7f` | Implementer a2b (scope ext.) | `task_3f8b6e385459` | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_467b6ef3b801` | Reviewer a2 | `task_d164eab8ae92` | Cursor `gpt-5.6-sol-high` |

**Files (5):** `dto/prms-sync-aggregate.ts` · `builders/common-fields.builder.ts` + spec ·
`entities/result-prms-sync/repositories/result-prms-sync-aggregate.repository.ts` + spec.

**Architecture held (design §2.1).** The builder contains **zero** references to `DataSource`,
`Repository`, `httpService` or `axios` — Leader-verified. The repository loads the aggregate, the
builder maps it, and every payload assertion runs with no DB and no HTTP. That separation is the
tactic behind DC-1/DC-2/DC-4/DC-5.

#### Attempt 1 — Reviewer verdict: ❌ **FAIL** (2 issues)

Items A, B, D, E, F, G, H passed. Notably **B** (the disqualifier) held: expected values are
independent literals traceable to `homologation.md`, not echoes of the builder. **G** confirmed the
positional `?` placeholders receive arrays and mysql2 preserves them even with `namedPlaceholders`
enabled. **C3** (`grant_title`) was adjudicated acceptable: the composition is unproven, but the risk
stays explicitly open in `homologation.md` §4.6 / R-3 and the builder correctly **throws** on an empty
`agreement_id` rather than emitting a partial title.

> **Issue 1:** `submitted_by.submitted_date` elige `submission_history.created_at` sin justificar por
> qué descarta `custom_date`. **Violated:** `homologation.md` §4 exige *"pick one and say why"*.
>
> **Issue 2:** `created_by` se resuelve mediante `results.created_by → sec_users.sec_user_id → email`,
> mientras el único join por `carnet` pertenece al contacto principal y no al creador. **Violated:**
> `homologation.md` §4 define la identidad del creador por `alliance_user_staff` con join en `carnet`
> — una desviación silenciosa **DC-1**.

⚠️ **The Leader had cleared Issue 2 before the audit.** Checking the worker's declared assumptions, the
Leader grepped `carnet`, saw it present in the file, and wrote *"the carnet join the spec requires is
there"* — **without ever reading the `ON` clause of the creator join**. The `carnet` seen belonged to
the *main-contact* query. Seeing the token and inferring the relationship is **KZ-002** exactly:
enumerating by a convenient proxy instead of by the real thing. Second time this session the Leader's
verification was looser than the Reviewer's.

#### Attempt 2 — the fixes

**Issue 1 — closed with a substantive reason**, not a formality: `created_at` is the *immutable audit
timestamp* of the approval transition and the same column that ranks "latest"
(`ORDER BY sh.created_at DESC`), whereas `custom_date` is a nullable, later-editable display date
(`green-checks updateChageStatusDate`) whose rewrite would desynchronise the selected row from the
reported timestamp.

**Issue 2 — closed:** `ON creator.carnet = su.carnet`, keeping `su.sec_user_id = r.created_by` as the
id-resolution hop.

#### ⚠️ Leader-initiated scope extension — and a Leader process error

Attempt 2 fixed the creator join and **honestly reported in Not Done** that the `submitted_by` staff
join still matched on email. The worker was right to stay inside the two-fix scope; **the Leader's
boundary was wrong.** The same hop (`sec_users.sec_user_id → alliance_user_staff`) was left resolved
two different ways in one file — worse than either form applied consistently. Extended per **KZ-005**:
*sweep the CLAIM, not the literal string the reviewer cited.*

**Process error, recorded:** the Leader first sent the extension as a message to the **already-settled
dispatch** (`worker_done` at 15:02:04; the send went out after). Orca accepted it (`ok: true`) and
nobody received it — the worker had ended its turn. This is `.agents/leader.md`'s *"idle is not
delivered"* in a variant not previously covered: it is not enough to verify a send **arrived**, one
must verify **someone still has an open turn to receive it**. `dispatch-show` costs one call before
sending; discovering it afterwards cost two empty wait windows, and was only caught because the user
asked *"¿estás esperando algo?"*. The fix was a fresh task (`task_3f8b6e385459`), not another message.

#### The pin, and its observed RED (K-004)

All three identity joins now resolve by `carnet`; **zero** `LOWER(TRIM` remain in the file:

| Join | Form |
|---|---|
| creator → staff | `ON creator.carnet = su.carnet` |
| main contact → staff | `ON aus.carnet = ru.user_id` (already correct) |
| submitter → staff | `ON aus.carnet = su.carnet` |

The spec pins **both** queries on the SQL *actually issued* to `dataSource.query`, positively and
negatively:

```
expect(headerSql).toMatch(/LEFT JOIN alliance_user_staff creator\s+ON\s+creator\.carnet\s*=\s*su\.carnet/)
expect(headerSql).not.toMatch(/LEFT JOIN alliance_user_staff creator\s+ON\s+LOWER\(TRIM\(creator\.email\)\)/)
```
…and the equivalent pair for `submissionSql`. **Red observed:** with the email form restored, the
`submissionSql` carnet assertion failed; green after restoring.

#### Attempt 2 — Reviewer verdict: ✅ **STATUS: PASS**

> Issue 1 queda cerrado porque la elección de `created_at` está justificada junto a la consulta con
> una razón correcta y localizable, y el Issue 2 queda cerrado porque ambos creadores se resuelven
> desde `sec_users` por `carnet`. La prueba examina las cadenas SQL realmente entregadas a
> `dataSource.query`, exige `carnet` y rechaza la forma anterior por email en ambas consultas, por lo
> que cualquiera de las dos regresiones falla; **la extensión del submitter es correcta porque
> `alliance_user_staff.carnet` es clave primaria y `sec_users.carnet` es el puente de identidad
> estable, mientras email no es único.**

**The Reviewer's justification is stronger than the Leader's was.** The Leader argued *"email is
mutable"*; the Reviewer identified that **email is not unique**, so the old join could match
**multiple rows** — a correctness bug, not merely fragility. **Leader-verified against the live
schema:** `alliance_user_staff.carnet` → `PRI` (PRIMARY KEY, unique); `email` → **no index at all**.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **375 suites · 3176 passed · 0 skipped** |
| Integration spec (T-03's separate gate) | 3 passed — still green |
| `npx eslint`, unpiped | **exit 0** |
| Builder DB/HTTP references | **0** (design §2.1 holds) |
| `LOWER(TRIM` remaining on identity paths | **0** |

---

## 5. BUDGET TRIPWIRE — fired 2026-09-15 at 6/14 tasks, escalated, user ruled

`design.md` §13 budgets ≈ 2 000 LOC (≈ 1 150 production, ≈ 850 tests) and 2 review rounds.

| Metric | Budget | Actual at 6/14 tasks | Delta |
|---|---|---|---|
| Production | ≈ 1 150 | **1 275** | **+11 %** |
| Tests | ≈ 850 | **1 737** | **+104 %** |
| **Total** | **≈ 2 000** | **3 012** | **+51 %** |

**Cause: the overrun is almost entirely test code, and it is what this spec's own rules buy.** Expected
values transcribed from `homologation.md` rather than snapshotted; both disaggregation modes because a
single-mode test passes under an inverted implementation; all six degree × session-term crossings
because `DegreeHomologation` is not injective; assertions against emitted SQL rather than returned
objects; and an observed-red falsifier per gate. None of that is free, and each line traces to a named
defect class.

**User ruling — continue, with a LIGHTER test policy from here on.** Applies to T-06d and every
remaining task:

| Keep | Trim |
|---|---|
| One **observed-red K-004 falsifier** per gate, for that task's highest-risk property | Exhaustive table-driven coverage of every combination |
| Defect-class assertions (**DC-1…DC-11**) | Restating a property already asserted elsewhere in the same spec file |
| **Both-mode** assertions wherever a boolean could silently invert | Redundant fixtures that vary nothing discriminating |
| Assertions on **generated output** (SQL, serialized JSON) — KZ-001 | |

Target: the smallest test set that still fails if the property under test is broken.
`design.md` §13's budget row is to be re-baselined at `/akili-archive` with the measured figure and
this rationale, so the tripwire stops firing on a number everyone has now accepted.

---

## 6. SEAM GAP between T-06 and T-07/T-08 — found, escalated, user approved closing it (T-06d)

**Every task passed its own Done check while the feature was broken end to end.** The aggregate
repository loads all four type rows and the Innovation Use role rows, but produced **none** of the
three *enriched* fields the type builders consume:

| Field | In repository | Consequence |
|---|---|---|
| `implementing_organizations` | 0 occurrences | `policy-change.builder` **throws on every real row** (its R-PRMS-006 AC.1 guard is correct — the data simply never arrives) |
| `innovation_type` | 0 | `innovation-development.builder` cannot build `innovation_typology` |
| `innovation_readiness` | 0 | `innovation-development.builder` cannot build `innovation_readiness_level` |

**Two of the four type builders were dead on arrival against real data**, and `tasks.md` assigns the
work to nobody: T-06 is *"the `data` block shared by every type — homologation §4"* (common fields),
T-07/T-08 are the builders (and the builders are **correct**, throw included), T-09 is envelope
assembly, not data loading. A decomposition gap, not anyone's defect.

**Surfaced by the T-08 worker in its own `Not Done` field** rather than left silent — exactly the
behaviour the Not-Done contract exists for. Escalated to the user, who approved closing it now as
sub-task **T-06d** (`task_9c2ac82ccde4`, dispatch `ctx_ca80806f6d59`, Cursor `cursor-grok-4.6-high-fast`).
It is **already-approved scope**, not new: R-PRMS-005 AC.1/AC.2 and R-PRMS-006 AC.1 require these
fields.

**Leader-verified schema facts handed to the worker** so it would not rediscover them:
`InstitutionRolesEnum.POLICY_CHANGE = 4` (and the *different* `InstitutionTypeRoleEnum` numbers
`INNOVATION_DEV=1`/`INNOVATION_USE=2` — a real confusion hazard); `clarisa_innovation_types` is keyed
on **`code`**, not `id`; `clarisa_innovation_readiness_levels` carries `id`, `level`, `name`. The brief
also forbids widening the readiness shape to include `level`, since T-07 deliberately chose `{id, name}`
and recorded it as unproven at the persistence layer.

---

### Wave 2 — T-07, T-08 (parallel) + T-06d (seam) + T-07b (evidence)

- **Status:** ✅ **PASS** — T-08 and T-06d on attempt 1; T-07 on attempt 2 (evidence only)
- **Date:** 2026-09-15 · Run `run_3ed0320bedc0`
  | Dispatch | Task | Role | Worker |
  |---|---|---|---|
  | `ctx_bd227c1c3fcd` | `task_6407514d9094` | T-07 impl | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_6379c04f7cd6` | `task_4aa89b243e03` | T-08 impl | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_ca80806f6d59` | `task_9c2ac82ccde4` | T-06d seam | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_d9f3a4e06a38` | `task_6ae0ca1d9452` | Reviewer | Cursor `gpt-5.6-sol-high` |
  | `ctx_9a7a6bc815b5` | `task_416bcad4204b` | T-07b evidence | Cursor `cursor-grok-4.6-high-fast` |

**Leader dispatch error, recorded.** The parallel `worker-start` loop printed `None` for both tasks
because the Leader's parser read the wrong JSON level. Reading the **raw** output showed T-07 had in
fact started (`state: accepted`). Checking dispatches per task before reacting showed T-07 had exactly
one and T-08 none — so only T-08 was relaunched. **A `None` from the Leader's own parser is not
evidence that a command failed**; reacting to it would have put two workers on the same files.

#### T-07 — Capacity Sharing + Innovation Development

`length_training` across PhD/MSc/BSc/Other × both session terms; `delivery_method` for all three
modalities; `unknown` and `innovation_developers` absent (P-1 / DC-5); D-B nesting under
`data.capacity_sharing` / `data.innovation_development`.

**The readiness shape — the task text was stale and the brief corrected it.** `tasks.md` T-07 says
*"the shape **T-01 proved**"*; T-01 proved **no shape** — it settled the schema layer only (all three
forms accepted, none named in any error) while **which key persists is open**, because every
`innovation_development` call was stopped earlier by an unrelated `innovation_typology` catalogue
rejection. The worker chose `{id, name}`, recorded it as **UNPROVEN at the persistence layer** in a
file comment, in the test name *"(persistence unproven)"*, and asserted
`expect(readiness).not.toHaveProperty('level')`. Following the task text literally would have written a
guess as settled fact.

**The lossiness is demonstrated, not merely described:** the BSc+Long-term test asserts that *both*
BSc and Other yield `"Long-term"`, so the collision is visible in the assertion itself, and the test
name records *"indistinguishable from a non-degree long course in PRMS"*.

The `innovation_typology` live-rejection signal (D-F) was **reported, not encoded** — as briefed.

#### T-08 — Policy Change + Innovation Use (highest defect density in the spec)

All four silent traps handled, with the decisive falsifier observed:
**`id=3` stub emitted `level 3` against seeded `level 2`** — i.e. a level whose `id` and `level`
genuinely differ, which is the only fixture shape that *can* fail. Both disaggregation modes asserted;
role filters by enum (`2`/`2`/`3` — three different numbers for one concept); policy `type`/`stage` by
**name**, corroborated live by T-01 (PRMS resolved names to internal ids `2`/`6`, proving
PRMS-internal ids ≠ STAR/CLARISA ids). Innovation Use **fully built though gated** (R-F6).

#### T-06d — the seam, closed

Three enriched fields added to the aggregate repository, each respecting a constraint that could have
been widened silently:
- `implementing_organizations` via **`InstitutionRolesEnum.POLICY_CHANGE`** — not the literal `4`, and
  not the similarly-named `InstitutionTypeRoleEnum` whose numbering differs.
- `innovation_type` as `{code, name}` joined on **`clarisa_innovation_types.code`** — that catalogue
  has no `id` column.
- `innovation_readiness` as `{id, name}`, **not `level`**. The only occurrence of the word `level` in
  the whole repository is the comment explaining why it is excluded: *"T-07 chose { id, name } and
  recorded it as unproven at the persistence layer."* The decision was respected **and** its reason
  left where the next reader will find it.

Falsifier: **`params [11, 3]` vs expected `[11, 4]`** when the role filter was pointed at `PARTNERS` —
asserted on the parameters actually passed. Invariants held: zero `LOWER(TRIM`, the three identity
joins still on `carnet`, existing SQL pins still passing.

#### Reviewer verdict (wave): ❌ FAIL on T-07 only → ✅ resolved by T-07b

> T-08 y T-06d cumplen sus propiedades de mapeo, filtros por enum, formas serializadas, invariantes SQL
> y alcance sin registro anticipado. El único bloqueo pertenece a T-07: **K-004 no está satisfecho**
> para el falsificador BSc + Long-term; el único rojo observado fue un `TypeError` causado por la
> **ausencia del módulo**, no un fallo de la expectativa `length_training` — **aunque la prueba actual
> sí discriminaría una implementación incorrecta.**

**The Leader had flagged exactly this in the brief and the Reviewer independently confirmed it.** The
distinction matters and the Reviewer stated it precisely: the *test* was sound, the *evidence* was not.
A gate seen failing only because the module did not exist yet proves the runner runs, not that the
assertion catches the defect. So the remediation was **evidence only — no new tests, no test edits.**

#### T-07b — the correct red, observed

| Step | Result |
|---|---|
| Targeted spec, green | 14/14 |
| Force `BSc + LONG_TERM` → `'Short-term'` | **RED on the expectation**: test `BSc + Long-term falls through to "Long-term"` **and** the `it.each degree 3 × session 2` row, both `Expected "Long-term"` / `Received "Short-term"` |
| Restore | byte-identical, sha1 `06af02cae83bf3a708ebddbf4d6aff745d270f3c` |
| Final run | 14/14 green |

**Leader-verified independently:** `shasum` of the restored file matches the claimed sha1 exactly, and
no falsifier residue remains in any builder. That check matters — a deliberate break that is not
reverted is worse than never having made it.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **379 suites · 3213 passed · 0 skipped** |
| Integration gate (T-03) | 3 passed |
| `npx eslint`, unpiped | **exit 0** |
| LOC (after the lighter policy on T-06d) | production 1 365 · tests 1 865 · **total 3 230** |

---

### Wave 3 — T-09 (payload builder) + T-10 (eligibility gate)

- **Status:** ✅ **PASS** — T-09 on attempt 1; T-10 on attempt 2 (one missing test case)
- **Date:** 2026-09-15 · Run `run_3ed0320bedc0`
  | Dispatch | Task | Role | Worker |
  |---|---|---|---|
  | `ctx_42cf9525565e` | `task_bf0c2fe3eea6` | T-09 impl | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_2672455b8dd4` | `task_2bafe6545c61` | T-10 impl | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_611b1dd4eb9c` | `task_c9fdc575dd07` | Reviewer | Cursor `gpt-5.6-sol-high` |
  | `ctx_d9a89b6ab93c` | `task_37c7e25a0935` | T-10b fix | Cursor `cursor-grok-4.6-high-fast` |

#### T-09 — payload builder — PASSED FIRST ATTEMPT

Merges T-06's common block with the four type builders into the homologation §2 envelope. Envelope
constants exact; **all four types build through it, including the two gated ones** (Innovation Use and
policy type 1) — the stated disqualifier was *"testing only the two ungated types"*, which would let
the gated builders rot until the PRMS PO meeting and make lifting a gate new development instead of a
list edit (family R-F6). `indicator_id` `3`/`5`/out-of-range **raise `PrmsPayloadBuildError`** rather
than emitting `type: undefined` — the T-05 map returns `null` for the unmappable pair deliberately, and
that `null` is converted here rather than propagated. Nesting boundary respected: common fields flat at
the `data` root, type blocks under their same-named sub-object, neither double-nested nor flattened.

#### T-10 — eligibility gate — the shape IS the requirement

One ordered `SYNC_GATE_ENTRIES` list with first-failure-wins `evaluateSyncGate`. **Data, not scattered
conditionals** — which is what makes **QA-5** measurable and family **R-F6** true.

The eight entries in order: `result_exists` · `not_already_synced` · `approved` · `alignment_green` ·
`pool_funding_contributor` · `indicator_mappable` · `indicator_not_gated` · `policy_type_not_gated`.

**Entries 6/7/8 carry genuinely distinct descriptions that explain *why*,** as R-PRMS-001 AC.2 demands
— a user can tell the three refusals apart:
- *"Indicator is unmappable to a PRMS type; Knowledge Product and OICR cannot be sent"*
- *"Innovation Use is gated: STAR holds no investment declarations (usd_budget / is_determined)"*
- *"Policy type Program, Budget, or Investment is gated: STAR holds no status_amount or amount fields"*

Entry 5 names the specific contract: `` `Primary contract ${agreementId} is not a pool-funding contributor` ``.

**`persistsRow` encodes design §5.1's JD-3 table exactly** — entries 1–2 `false` (no row), entries 3–8
`true` (`REFUSED_BY_STAR`). The gate **returns** that decision and persists nothing; persistence is
T-11's. The worker respected the boundary rather than reaching into the next task.

#### Reviewer verdict: ❌ FAIL on T-10 only → ✅ resolved by T-10b

> **T-09 cumple** — el sobre usa las constantes en sus posiciones correctas, los cuatro builders
> (incluidos Innovation Use y policy-type-1) se ejecutan directamente, el anidamiento es correcto y los
> indicadores 3, 5 y fuera de rango lanzan `PrmsPayloadBuildError`.
>
> **Discovered Issue (T-10):** no existe ningún caso con `pool_funding_alignment_green = false`, por lo
> que la negativa `alignment_green` **es la única de las ocho que no afirma que el transporte no fue
> llamado**, y la suite seguiría verde si esa entrada dejara pasar el resultado.
> **Violated:** `tasks.md` T-10 Done check 3 y `requirements.md` R-PRMS-001 AC.3.

**Leader-confirmed before dispatching the fix:** the spec held **7** transport-not-called assertions for
**8** gate entries. The reviewer's count was exact. This is the highest-value hole it could have found —
Done check 3 requires *every* refusal to prove no outbound call happened, and a non-green alignment
slipping through would have reached PRMS with the suite still green.

**The Reviewer also settled the Leader's open question** on Done check 4: the QA-5 entry-removal proof
**is behavioural**, *"porque cambia la decisión de refused a allowed y observa una llamada al transporte
sin tocar builders"* — not a dressed-up presence-assertion.

#### T-10b — the missing refusal case

One case added to `sync-gate.spec.ts` only: `eligible({ pool_funding_alignment_green: false })` asserting
`entryId === 'alignment_green'`, its own description, `persistsRow === true`, and
`transport.ingest not.toHaveBeenCalled()`. Coverage now **8 of 8**.

**K-004 red observed and correctly targeted:** with `alignment_green.fails` forced to `false`, **only the
new case failed** — `Expected: false Received: true` on `decision.allowed` (`sync-gate.spec.ts:135`),
i.e. the gate allowing what it must refuse. **Implementation restored byte-identical**, SHA-256
`55b2105d…76f61`, 5 419 bytes — **Leader-verified independently**; the only lasting change is the test.

#### ⚠️ Leader error: a corrupted brief, caught and corrected in flight

The T-10b task spec was dispatched with a word missing — backticks around `` `fails` `` were taken as
shell command substitution, leaving *"make the alignment_green entry's ___ predicate return false"*.
Found by reading the task **as stored in Orca**, not as the Leader believed it had been written.
`dispatch-show` confirmed the dispatch was still **open** (the check that was missing in the T-06 incident),
and a correction restating the whole task followed immediately — per `.agents/leader.md`: *"never
economize on correcting a delegation you already know is malformed."* Cost: one message. Shipping it
would have cost the wait, a wrong result and a re-dispatch.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **381 suites · 3231 passed · 0 skipped** |
| `npx eslint`, unpiped | **exit 0** |
| Restored `sync-gate.ts` | SHA-256 + byte size match the pre-mutation values |

---

### T-11 — Claim-then-settle, expiry, persistence

- **Status:** ✅ **PASS on attempt 2 of 3** — the spec's most delicate logic
- **Date:** 2026-09-15 · Run `run_3ed0320bedc0`
  | Dispatch | Task | Role | Worker |
  |---|---|---|---|
  | `ctx_7b3429d56ecb` | `task_380f40403f11` | impl a1 | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_616a14478866` | `task_779bb4e82e6e` | Reviewer a1 | Cursor `gpt-5.6-sol-high` |
  | `ctx_b54a61a83974` | `task_f0d487bfeb7a` | impl a2 | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_616a14478866`→`ctx_…` | `task_…` | Reviewer a2 | Cursor `gpt-5.6-sol-high` |

**Files (6):** `result-prms-sync.service.ts` + spec · `result-prms-sync.constants.ts` ·
`repositories/result-prms-sync-log.repository.ts` + spec ·
`test/result-prms-sync-claim-concurrency.integration-spec.ts`.

Constants named rather than magic: `PRMS_TRANSPORT_CEILING_MS = 30_000` (BaseApi's own timeout) +
`PRMS_CLAIM_EXPIRY_MARGIN_MS = 60_000` → §5.1b's 90 s threshold.

#### Attempt 1 — Reviewer verdict: ❌ **FAIL, five issues**

Passed and left alone thereafter: the four claim branches inside **one** short transaction; the send
**outside** it; **expiry-to-`UNKNOWN` without supersession** (the trap this design was corrected for
twice — the worker avoided it); the AC.5 `409` reading *"Attention required: attempt … Verify … before
re-sending"*; `persistsRow` consumed with correct NULLs; redaction before write; scope clean.

> **(1)** El supuesto DC-11 es contención InnoDB real, pero **sólo existe un claim mientras un
> QueryRunner crudo retiene el lock y el segundo claim empieza después de terminar el primero**; además
> **nunca ejecuta `ResultPrmsSyncService`, POST, settle, `ACCEPTED` ni `409`** — viola R-PRMS-013 AC.2,
> T-11 Done check 1 / DC-11 y QA-7.
> **(2)** Esa prueba DB-dependiente vive en la suite unitaria DB-free y **convierte MySQL inaccesible en
> pending/verde**, contra child guide §9 y **KZ-017**, mientras **T-03 demuestra el límite correcto**.
> **(3)** Los settles de agregado ausente y `PrmsPayloadBuildError` **ignoran el retorno late**: una
> expiración concurrente escribe cero pero **no emite el `_warn`** de AC.4 / §9.
> **(4)** Los `REFUSED_BY_STAR` por fallo de build **no llaman `logAttempt`** (NFR-003 / §9).
> **(5)** `insertRefusedByStar` asigna `MAX(attempt_number)+1` **fuera de transacción y sin bloquear
> `results`**: dos rechazos concurrentes pueden recibir el mismo número, violando §3.

⚠️ **The Leader had cleared DC-11 before the audit — wrongly, for the second time this spec.** The lock
contention *was* genuine InnoDB contention, and the Leader concluded it proved at-most-once. **It
proved the lock blocks; it did not prove the invariant the lock exists to guarantee.** The test
instantiated the repository directly, never constructed the service, and asserted no POST count and
neither outcome. **Testing the mechanism is not testing the property** — the same class of error as the
`carnet` clearance earlier in this run.

⚠️ **Issue (5) is a concurrency bug introduced while fixing a concurrency problem**, on the path nobody
watches because "it only writes a refusal". Leader-confirmed in the code before re-dispatch:
`SELECT COALESCE(MAX(attempt_number), 0)` with no `FOR UPDATE` and no surrounding transaction.

#### Attempt 2 — the fixes, with both falsifiers observed

| Break | Observed RED | Restored |
|---|---|---|
| Drop `FOR UPDATE` | **2 POSTs** where 1 is required | one POST / one `ACCEPTED` / one `409` |
| Unlock `MAX+1` | duplicate `attempt_number` **[1, 1]** | **[1, 2]** |

The first red is precisely what attempt 1 could not produce: **the end-to-end invariant failing**,
not merely a blocked lock.

DC-11 rebuilt as `test/result-prms-sync-claim-concurrency.integration-spec.ts`, driving **two
concurrent `service.sync` calls started before either settles**. Moved out of the unit suite;
`beforeAll` calls `dataSource.initialize()` with **no try/catch**, so a missing scratch schema **fails
the file** instead of skipping. The header carries an explicit **KZ-017** declaration that `npm test`
(`rootDir: "src"`) never collects it — the proof requires `npm run test:integration`.

Late-settle handling centralised through `settleAttempt` so **every** path — including missing
aggregate and `PrmsPayloadBuildError` — emits `_warn` on a late return; all terminal branches log; and
`REFUSED_BY_STAR` numbering now runs under the **same** `results` row lock the claim path takes.

#### Attempt 2 — Reviewer verdict: ✅ **STATUS: PASS**

> La nueva integración lanza **dos `service.sync` antes del settle** y afirma **exactamente un POST, un
> resultado `ACCEPTED` persistido y un `ConflictException` 409 de colisión**; inicializa MySQL TEST **sin
> catch/skip** y declara correctamente que `npm test` no la recolecta. Todos los settle, incluidos
> agregado ausente y `PrmsPayloadBuildError`, pasan por `settleAttempt`, que emite `_warn` en retorno
> late y `LoggerUtil` en settle terminal; los `REFUSED_BY_STAR` del gate y de build también se
> registran. **El bloqueo de `MAX+1` usa una transacción y el mismo `SELECT` sobre `results` por
> `result_id` con `FOR UPDATE` del claim**, sin regresiones en atomicidad, settle condicional ni
> expiración sin supersesión.

#### Leader falsification note

The Leader flagged a surviving `pending(` in the new integration spec and was **wrong a third time**:
the occurrence sits **inside a comment** — `// A missing scratch schema FAILS THIS FILE — it does not
pending() or skip.` The grep measured the documentation, not the code. Checking the context before
reporting is what kept a false alarm from becoming someone's work.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **383 suites · 3249 passed · 0 skipped** |
| Integration (both specs) | **2 suites · 6 tests passed** |
| `npx eslint`, unpiped | **exit 0** |

---

### T-12 — Response interpreter (the 207 rule) + T-12b (fixture)

- **Status:** ✅ **PASS on attempt 1** (plus T-12b, a regression fix the Leader's re-measure caught)
- **Date:** 2026-09-15 · Run `run_3ed0320bedc0`
  | Dispatch | Task | Role | Worker |
  |---|---|---|---|
  | `ctx_629be1ba59ed` | `task_3984bde4479c` | T-12 impl | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_51e2592b299e` | `task_6356958a70c3` | T-12b fixture | Cursor `cursor-grok-4.6-high-fast` |
  | `ctx_da914ea5fb7d` | `task_39797e878676` | Reviewer | Cursor `gpt-5.6-sol-high` |

`tasks.md` calls this **the spec's load-bearing logic**: it is what makes *"synced"* mean **PRMS
accepted this row** rather than **the HTTP status was 2xx**.

**Files:** `tools/prms-normalizer/response/prms-sync-response.interpreter.ts` + spec ·
`result-prms-sync.service.ts` settle path + spec · `test/…claim-concurrency.integration-spec.ts` (T-12b).

#### What landed

The tri-state mapped onto §5.4: `null` → `TRANSPORT_FAILED` · `401` → `AUTH_FAILED` · `503` →
`RETRYABLE` · `422` → `REJECTED_BY_PRMS` from `rejected[]` · `2xx` → **per row**.

⚠️ **DD-18 implemented, not the pre-amendment rule.** A `2xx` whose row failed is classified **by the
cause in `results[].error`** — a **downstream 5xx** settles `RETRYABLE`, a genuine validation/business
rejection settles `REJECTED_BY_PRMS`. **This is the A-01 amendment reaching code.** Without the T-01
spike (which caught two live `207`s wrapping `HTTP 502: Proxy Error` / `HTTP 503: Service Unavailable`
from the Normalizer's **own** `/api/bilateral/create` hop — discovery-log D-D), the original rule would
have been implemented and every transient PRMS outage would have been recorded **durably** as a PRMS
rejection, with nothing failing to reveal it.

**DD-8 honoured:** our row is located with `results.find(...)` on `external_reference`, never by index.
**OQ-6 applied:** `result_code` read **only** from `results[].result.result_code`, and its absence
recorded explicitly as `PRMS_RESULT_CODE_ABSENT` rather than a silent NULL (Done check 4).

**K-004 red, correctly targeted:** the two-row / ours-**second** `207` produced
`Expected REJECTED_BY_PRMS, Received ACCEPTED` under an index lookup — exactly the defect DD-8 names —
then green after restoring find-by-reference.

#### ⚠️ Regression caught by the Leader's re-measure — and it was good news

The worker reported *"T-11 claim/expiry/late-settle is unchanged"* and 17 suites / 142 tests passing,
and that was **true for the tests it ran** — it ran only the scoped **unit** tests, as briefed. The
Leader's re-measure found the **integration** suite had gone from 2 suites / 6 passing to **1 failed**:

```
● T-11 … two service.sync calls … produce one POST, one ACCEPTED row, and one 409
  Expected: "ACCEPTED"   Received: "RETRYABLE"
```

**This is precisely why the Leader re-measures after every worker.** A worker forbidden from running
the full suite *cannot* see what it broke outside its own scope.

**Diagnosis: T-12 was right and the fixture was stale.** T-11's stub returned
`{ status: 200, body: { requestId } }` — a 200 with **no `results[]` at all** — which satisfied T-11's
*provisional* "2xx = ACCEPTED" rule. Under the correct interpreter there is no row carrying our
`external_reference`, so it settles `RETRYABLE`. **That is the honest outcome**: if PRMS does not
return our row, we cannot prove it accepted us, and saying `ACCEPTED` would be the exact failure this
whole spec exists to prevent. A weaker interpreter would have passed silently.

**T-12b** made the stub realistic — `success: true`, `external_reference` taken **from the built
payload** rather than hardcoded, `result.result_code: 9199` — after **reading the interpreter first**
to match field names (`row.success`, `row.external_reference`, `row.result.result_code`). A fixture
with invented field names would pass and prove nothing. Its own falsifier: a non-matching
`external_reference` returns `RETRYABLE`, then green on restore — so the assertion depends on the
interpreter *finding* our row, not on the stub merely existing. **The concurrency proof is now stronger
than before**: it runs through the real interpreter end to end.

#### Reviewer verdict: ✅ **STATUS: PASS** — including three judgement calls put to it

- **B — the 422 fallback.** `const chosen = match ?? rejected[0]` is *"un fallback defendible **sólo**
  para el 422 request-level de este envío monofila y **no comparte ruta** con el 2xx per-row."* No index
  semantics leak into the per-row path.
- **C — the absent-reference outcome.** A `2xx` without our reference settles `RETRYABLE`, *"no
  `ACCEPTED` ni `UNKNOWN` **porque `UNKNOWN` está reservado al claim abandonado**"* — a sharper
  vocabulary argument than the Leader's own: `UNKNOWN` carries a specific §5.4 meaning and reusing it
  here would blur it.
- **H — the Leader's regression ruling, confirmed.** T-11 *"tenía un fixture provisional obsoleto, cuya
  corrección ahora atraviesa el intérprete real"*.

Also confirmed: the flip happens **only** on `ACCEPTED` in the same transaction; `requestId` persisted
on every branch; the K-004 falsifier targets the index defect; **T-11's machinery intact**; and **no
comment, test name or report claims DC-3** — it remains T-14's, against live TEST.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **384 suites · 3261 passed · 0 skipped** |
| Integration (both specs) | **2 suites · 6 tests passed** |
| `npx eslint`, unpiped | **exit 0** |

---

## HALT: T-13 — rework ceiling reached (3 attempts), production code VERIFIED CORRECT

- **Date:** 2026-09-15 · Run `run_3ed0320bedc0`
- **Status in `tasks.md`:** `[~]` — started, not complete
- ⚠️ **Automatic Rollback NOT executed.** Escalated to the user first — see *Why* below.

### What is CLOSED and reviewer-verified across the three attempts

| Item | Evidence |
|---|---|
| Two-step registration | Both sites present; the **module-graph gate** went RED on removing the `entities.module.ts` import **while the mocked controller spec stayed GREEN** — the demonstration of why the mocked spec cannot be the gate |
| DD-11 / DD-11b | Guard triad present; `ResultStatusGuard` **absent** (0 occurrences) |
| `GET` read surface | `request_payload` excluded at **SQL, mapper and Swagger DTO** |
| Error descriptions | Seven distinct named constants; the `409` covers all three cases incl. *"an unconfirmed attempt requires attention"* (R-4 → the user) |
| POST `404`/`409` | Full six-field contract, `attempt_number` **null, never 0** (JD-8); tests drive **real** `NotFoundException`/`ConflictException`; K-004 red `Expected null Received 0` |
| **Done check 2 — `/swagger`** | **Leader-verified against the generated document**, not decorators: `POST` and `GET /api/results/{resultCode}/prms-sync`, both `security=[{"bearer":[]}]`, POST carrying `200,404,409,422,502,503` out of 212 total paths |
| POST `422` production path | Reviewer: *"producción usa directamente `inserted.attemptNumber` o `claim.attemptNumber`, conserva 404/409 con null y **no altera** la transacción de claim, el envío externo, la expiración a UNKNOWN, el settle condicional, los `_warn` tardíos, el logging `REFUSED_BY_STAR` ni el bloqueo de `attempt_number`"* |

### The single remaining defect — a TEST fidelity gap, not a code defect

> **Discovered Issue:** la prueba del controller **fabrica `PrmsSyncPersistedRefusalException` desde el
> mock de `sync`**, así que **nunca ejecuta `ResultPrmsSyncService` ni `insertRefusedByStar`** y no
> demuestra un `422` realmente persistido de extremo a extremo.
> **Violated Rule:** `design.md` §4 y §5.1, and criterion 3 of the Leader's own review brief.
> **Remediation:** conectar el controller a una instancia real del servicio en la prueba, hacer que la
> dependencia de persistencia devuelva `attemptNumber 5`, invocar `controller.sync` y afirmar tanto la
> escritura como el contrato `422` completo.

**Leader-confirmed independently:** `sync.mockRejectedValue(new PrmsSyncPersistedRefusalException(…))`,
and `new ResultPrmsSyncService` appears **0 times** in that spec. The test proves the controller
*formats* a persisted refusal correctly; it does not prove the service *produces* one carrying a real
number from `insertRefusedByStar`.

**This is the same defect class as T-11's DC-11 issue** — testing the mechanism rather than the
end-to-end property — and it is the third time in this spec that a test asserted the half it could
reach. That recurrence is itself the finding.

### Why Automatic Rollback was NOT executed

`/akili-execute` Step 4 mandates `git restore .` + `git clean -fd` on HALT, with the rationale *"do not
leave broken code for the user to clean up."* **That premise does not hold here.** The Reviewer
explicitly verified the production code as correct and regression-free; what is insufficient is one
test's fidelity on one path.

A rollback would discard: the controller, the module, **both registration sites**, the status reader,
the DTOs, the service threading, three attempts of reviewer-verified work, and the Leader's Swagger
verification — to fix a test that does not exercise what it claims. Destroying correct, audited code to
remedy a weak assertion is disproportionate, and the working tree is **not** in a broken state:
**387 suites / 3287 passed / 0 skipped**, integration **2 suites / 6 tests**, `eslint exit 0`.

Escalated to the user with options rather than executed unilaterally.

### Leader's hypothesis on the root cause

Not spec ambiguity and not missing context — the brief named criterion 3 explicitly (*"a test drives a
**genuinely persisted** 422 refusal through the controller"*). The pattern across all three attempts is
that **the controller spec is built entirely on mocks**, and each fix was made *within* that frame
rather than stepping outside it. Wiring a real `ResultPrmsSyncService` into a spec whose every other
case mocks `sync` is a structural change to the test file, and three successive briefs each asked for
the assertion without asking for that restructuring. **The next brief must name the restructuring, not
the assertion.**

### T-13 — RESOLVED on attempt 4 (user-authorised after the HALT above)

- **Status:** ✅ **PASS** — the HALT recorded above is **lifted**; `tasks.md` moves `[~]` → `[x]`
- **Date:** 2026-09-15 · Run `run_3ed0320bedc0`
- **Attempts:** impl `ctx_d006b01412df` → `ctx_83b4ca90fd36` → `ctx_…` (T-13c) → **T-13d**;
  Reviewer `gpt-5.6-sol-high` throughout.

#### Why three attempts failed, and what changed on the fourth

**The Leader's briefs were the defect, not the worker's effort.** The controller spec builds its
module as `{ provide: ResultPrmsSyncService, useValue: { sync } }` — the **entire service replaced by a
one-method stub**. Inside that frame, `insertRefusedByStar` is **unreachable by construction**. Three
successive briefs asked for the *assertion* ("drive a genuinely persisted 422"); none asked for the
*restructuring* that would make the assertion possible. The worker did the only thing its frame
allowed, three times.

The attempt-4 brief named the restructuring explicitly and opened with why: *"no patch inside that
frame can ever exercise `insertRefusedByStar` — which is exactly why three successive assertion-level
fixes did not close it."* It closed on the first try.

**Generalisable:** when a worker fails the same way three times, the useful hypothesis is rarely *"it
did not try"* — it is *"I am asking for something its frame does not permit."* Changing the ask cost one
attempt; repeating it would have cost three more.

#### What attempt 4 added — one file, one `describe`

A nested `describe` constructing a **real `ResultPrmsSyncService`**, mocking only persistence and
outbound collaborators, driving an **`alignment_green`** refusal (a `persistsRow: true` entry) with
`insertRefusedByStar` returning `attemptNumber: 5`. It asserts **both** halves:

```
expect(insertRefusedByStar).toHaveBeenCalledTimes(1);
expect(insertRefusedByStar).toHaveBeenCalledWith({ … });
```
…plus the full six-field `422` contract carrying `attempt_number: 5`.

**Leader-verified markers, before and after:** `new ResultPrmsSyncService` **0 → 1**;
`insertRefusedByStar` **0 → 7**.

**K-004, and the shape mattered:** probing with `attemptNumber: 7` failed **`Expected 5 / Received 7`**
— proving the assertion reads the value **produced by the write**, not a constant the test supplied. The
brief warned in advance that a red from re-fabricating the exception, or from a missing mock, would
**not** count; that is precisely the confusion behind the three earlier failures, and the same class as
T-11's DC-11 issue.

#### Reviewer verdict: ✅ **STATUS: PASS**

> Confirmé **mediante el código y el historial exacto de edición** que el intento 4 sólo añadió los
> imports necesarios y un `describe` nuevo, **sin alterar producción ni ninguno de los casos
> existentes**. El caso inyecta un `ResultPrmsSyncService` real, alcanza la negativa persistente
> `alignment_green`, prueba la llamada a `insertRefusedByStar` y el contrato `422` completo de seis
> campos con `attempt_number 5`; el falsificador `Expected 5 / Received 7` demuestra que la respuesta
> lee el número devuelto por esa escritura y **no debilitó aserciones previas**.

#### The two refusal classes now distinguishable at the HTTP edge

| Gate entries | Row written | `attempt_number` |
|---|---|---|
| 1–2 (not found, already synced) | none | **`null`** — never `0`, which would read as a real attempt (JD-8) |
| 3–8 (status, alignment, contract, unmappable, gated type, gated policy) | `REFUSED_BY_STAR` | **the real number from the write** |

Children 2–4 can now tell a first refusal from a fifth, and the durable record R-PRMS-012 AC.1 promises
the Center-Admin persona is visible at the edge.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **387 suites · 3288 passed · 0 skipped** |
| Integration (both specs) | **2 suites · 6 tests passed** |
| `npx eslint`, unpiped | **exit 0** |
| Swagger (Done check 2) | Leader-inspected **generated document**: both paths, bearer on both, POST `200,404,409,422,502,503` |

#### Note on scope discipline (second occurrence)

The attempt-3 worker wrote `.akili-t13c-attempt3-report.md` into the repo root — out of scope, and the
**second** worker in this spec to create a stray report file (T-03 was the first). The Leader deleted
it: `execution.md` is the single audit trail, and a parallel report beside it is two places asserting
the same facts, which is what KZ-005 exists to prevent. The attempt-4 brief forbade it explicitly and
no file was created.

---

### T-14 — Live TEST e2e: the DC-3 proof and the guard matrix

**Attempt 1 — Implementer: Cursor `cursor-grok-4.6-high-fast` · Reviewer: Cursor `gpt-5.6-sol-high` · Verdict: `STATUS: FAIL` (2 issues)**

Scope delivered: one new file, `server/researchindicators/test/prms-sync.e2e-spec.ts`. No production change.

**What the Reviewer confirmed (not re-litigated on rework):**

| Check | Finding |
|---|---|
| A — alignment PATCH ordering | Occurs **after** the 207 and would fail with the flag set |
| B — the 207 is real | Genuine partner response with a real `requestId`; **no mock of the ingest** |
| D — contributor personas | Correctly pinned |
| E — refusal categories | Three categories carry **exact** messages, with no transport call |
| G — scope | One new file, nothing else touched |

**Issue 1 — the K-004 falsifier did not discriminate.** Reviewer, verbatim:

> "el falsificador K-004 con enlace válido no alcanzó ACCEPTED ni hizo fallar la aserción DC-3, sino que
> cayó antes por el 400 de aprovisionamiento de `t14-owner@example.org`"

Violates `tasks.md` T-14 *Failing input* and CLAUDE.md §4.3 K-004/KZ-014. A red produced by a provisioning
400 proves the request was rejected **earlier**, not that the assertion discriminates — the same distinction
that failed T-07, where a red from an absent module did not count.

**Issue 2 — a PROD-traffic safety hole.** Reviewer, verbatim:

> "la suite afirma Never PROD pero conserva cualquier `ARI_PRMS_NORMALIZER_HOST` preexistente mediante OR
> lógico, por lo que un entorno configurado con PROD lo usaría"

The line, at `test/prms-sync.e2e-spec.ts:42-44`:

```js
process.env.ARI_IS_PRODUCTION = 'false';
process.env.ARI_PRMS_NORMALIZER_HOST =
  process.env.ARI_PRMS_NORMALIZER_HOST || TEST_NORMALIZER_HOST;
```

The `||` **preserves** a pre-existing value. This suite sends real ingests, so a shell or CI exporting the
PROD host (`v6a9z2e4y5…`, per `family.md:69` / `homologation.md:481`) would have this suite writing live
results into **production PRMS**, for which there is no un-sync path. Violates NFR-PRMS-001
(`requirements.md:438` — *zero PROD Normalizer calls reachable from local/dev/staging*).

**Leader verification of Issue 2's blast radius** (read-only, run while the rework was dispatched):

| Question | Measured |
|---|---|
| Every reference to the var, package-wide | **8**, of which one is `.env.example:36` (commented) and two are the defective lines |
| Does a `.env` on disk preload it? | `.env` exists but **does not define it** — only `.env.example` names it, commented out |
| Does `jest-e2e.json` load dotenv or a setup file? | **No** `setupFiles`/`setupFilesAfterEnv` — the only injection path is an exported shell/CI variable |
| Is the host read once at boot? | **No** — `app-config.util.ts:54-55` is a **live getter** over `process.env`, so a snapshot check is not enough; the fix must assert-and-abort |

This is a **reachable** instance of **DC-7** (`requirements.md:108`, *"Non-prod environment reaching the
PROD Normalizer"*), which the spec had recorded as structurally unprovable for the production *build*.
DC-7's declared limit covers the deployed artifact; it does not excuse the hole inside our own suite.

**Rework dispatched** as T-14b (`task_107a82a5b46a` / `ctx_a363f9fdedde`), effort bumped per the rework
rule. Issue 2 is unconditional. For Issue 1 the brief states explicitly that **declaring T-14 BLOCKED with
DC-3's falsifier uncovered is an acceptable outcome** if PRMS TEST accepts no usable identity — consistent
with the task's own disqualifier (*"If TEST is unreachable, the task is BLOCKED — and DC-3 is recorded as
uncovered rather than quietly closed"*). Claiming a falsifier that did not discriminate would not be.

**Worker accounting.** `worker-release` on the attempt-1 Implementer returned `retained`, not `released`.
`worker-list` explains it: `ownershipState=user_owned`, `retainedReason=user_takeover` — the human took
that terminal over, so Orca correctly refuses to reclaim it. Not an orphan. Run `run_3ed0320bedc0` totals
**45 workers: 41 released · 3 `failed`/`external_terminal` (the dead agy dispatches) · 1 `user_owned` ·
1 active.**

**Leader measurement error, recorded.** `orca orchestration dispatch-list` **does not exist**; the Leader
ran it, parsed the failure envelope, and reported *"total dispatches: 0"* — a count over a failed command,
the exact K-014 trap ("check for an error in the raw output before you count it"). Corrected by reading
`orchestration --help` and re-running through `worker-list`. Ninth Leader measurement error this run.

**Attempt 2 (T-14b) — Implementer: Cursor `cursor-grok-4.6-high-fast`, effort bumped per the rework rule**

Both issues addressed in the single file; no production change.

**Issue 2 — closed.** The `||` is gone. The suite now aborts at **module scope, before the app boots**:

```ts
if (incomingNormalizerHost === PROD_NORMALIZER_HOST ||
    (Boolean(incomingNormalizerHost) &&
     incomingNormalizerHost !== TEST_NORMALIZER_HOST)) {
  throw new Error(`T-14 abort before app boot: ARI_PRMS_NORMALIZER_HOST must be exactly ${TEST_NORMALIZER_HOST}; refusing ${incomingNormalizerHost}. Never PROD.`);
}
```

PROD is named and rejected explicitly, any other non-TEST value is rejected, and only *unset* falls through to the TEST default. The same `abortUnlessExactly` / `requireInherited` pattern was extended to the inherited MySQL credentials and the API key, and the file now **enumerates the env vars it deliberately does not set** with the reason they cannot redirect ingest — a KZ-017 declaration of scope, in the code.

**Leader-verified the load-bearing claim** behind that argument (*"PrmsNormalizerService reads only `ARI_PRMS_NORMALIZER_HOST`"*): the service reads exactly two config values — `appConfig.ARI_PRMS_NORMALIZER_HOST` (line 26) and `AppConfigKey.ARI_CLARISA_API_KEY` (36-37). No third env read exists, so the host guard genuinely controls the ingest destination. Claim confirmed rather than assumed.

**Issue 1 — closed, branch (a).** The owner identity was pinned to `ari-spike-tester@cgiar.org` (PRMS user id 1160) — the identity T-01's spike had already reached ACCEPTED with three times. The falsifier switch was verified to flip the **variable genuinely under test**, not merely relabel: `EVIDENCE_LINK = K004_VALID ? VALID_EVIDENCE_LINK : BAD_EVIDENCE_LINK` (line 152), Drive link → `https://www.cgiar.org/research/`, plus a fresh `external_reference` so a duplicate cannot short-circuit the run.

**Leader re-measurement — independent live runs, not the Implementer's report.** Both were re-executed by the Leader after the worker was released; the requestIds differ from the worker's, which is what proves these are fresh partner calls and not a replay.

| Run | Result |
|---|---|
| Committed default (bad Drive link) | **4 passed / 4 total.** `external_reference=910150901` · `http_status=207` · `outcome=REJECTED_BY_PRMS` · `request_id=Root=1-6aa9a29a-2f4dd2883d4f660631007ece` · PRMS reason: *"Links to file storage platforms (Google Drive, Dropbox, SharePoint, OneDrive) are not accepted as evidence"* · alignment PATCH `{"status":200,"description":"Pool funding alignment updated"}` — **not 409, still writable** |
| K-004 falsifier (`PRMS_E2E_K004_VALID=1`) | **1 failed / 3 passed / 4 total.** `external_reference=910150913` · `http_status=200` · `outcome=ACCEPTED` · `request_id=Root=1-6aa9a2bc-2a3ef24e03ddf6ce0c4f9375` · red lands on **`expect(synced).toBe(false)` — `Expected: false / Received: true`** |

The falsifier **reached ACCEPTED and then failed on the DC-3 discriminator**, with the other three tests still green — the isolation that distinguishes a real gate from the provisioning-400 collapse that invalidated attempt 1. **DC-3 is covered.**

**New-defect check on the one restructuring.** `expect(synced).toBe(false)` was moved ahead of the `http_status !== 207` UNCOVERED throw so an ACCEPTED falsifier reddens on the discriminator. The committed path is **not** weakened: the 207 gate still exists and still throws immediately after, followed by the full `REJECTED_BY_PRMS` / `request_id` / `failure_reason` / log-row assertions.

#### Leader-measured gates

| Gate | Result |
|---|---|
| Unit suite | **387 suites · 3288 passed · 0 skipped** — unchanged, no regression |
| Integration (`result-prms-sync` suites) | **2 suites · 6 tests passed** |
| `npx eslint test/prms-sync.e2e-spec.ts`, unpiped | **exit 0** |
| Live e2e, committed default | **4 / 4 passed** |
| K-004 falsifier | **seen RED on the DC-3 discriminator** |
| Credential sweep | **0** occurrences of the literal key value (swept the value read from `.env`, not the variable name — KZ-005) |

#### Declared limits (KZ-017)

`npm run test:integration` selects **three** suites, not two. The third,
`bilateral-primary-contributing-sp.integration-spec.ts`, fails 9 tests solely because `T13_MYSQL_PASSWORD`
is unset in the Leader's environment — it refuses by design to fall back to a committed default credential.
That suite belongs to a **different spec** (`bilateral/primary-contributing-sp`) and is untouched by T-14.
Recorded as an unmet environment precondition, not a defect and not a regression.

**Leader bookkeeping error, recorded.** Earlier entries in this log cite the integration baseline as
"2 suites / 6 tests". That figure came from a **filtered** invocation (`-- result-prms-sync`), not the full
config — a K-014 error ("a filtered view is not the output") in the Leader's own record. The full config has
always selected three suites. The corrected reading is above. Tenth Leader measurement error this run.

**Scope discipline — third occurrence.** The worker wrote
`docs/specs/bilateral/prms-sync/sync-engine/t14b-attempt2-implementer.md`. Unlike T-13 attempt 3, **this
brief did not forbid it** — the omission was the Leader's. Evidence salvaged, file deleted; `execution.md`
remains the single audit trail.

**Attempt 2 — Reviewer: Cursor `gpt-5.6-sol-high` · Verdict: `STATUS: FAIL` (1 issue)**

The Reviewer **confirmed all three items it was asked to audit**: the K-004 falsifier does reach ACCEPTED and
does fail the DC-3 assertion; the host guard does block every preexisting non-TEST host before boot; and the
committed path retains its checks after `expect(synced)`. It also agreed the `T13_MYSQL_PASSWORD` failure in
a sibling spec's suite is out of scope. **Issues 1 and 2 are closed.** One new issue was raised, verbatim:

> "el supuesto `external_reference` fresco no está garantizado, porque `Date.now() % 11` reutiliza solo once
> códigos persistentes y el título también reutiliza ese código, de modo que una ejecución posterior puede
> caer antes en el rechazo por duplicado"

**The Leader judged this in scope and material.** `test/prms-sync.e2e-spec.ts:140` is
`OFFICIAL_BAND_START + 10 + (Date.now() % 11)` — **eleven** possible codes (910150911–910150921). Every
successful K-004 run ACCEPTS a result that **persists in PRMS TEST and cannot be cleaned from our side**.
The evidence that the slots are already being consumed is in this log: the attempt-2 worker drew **910150916**
and the Leader drew **910150913** — two of eleven, in two runs.

The failure mode on collision is worse than a plain error: PRMS rejects the duplicate, `synced` stays false,
**`expect(synced).toBe(false)` PASSES**, and the run instead dies on the `http_status !== 207` UNCOVERED
throw. A red for the wrong reason — the same disqualifier that failed attempt 1 as a provisioning 400. A gate
that silently stops being a gate after a handful of runs belongs to the same class as `npm run lint` carrying
`--fix` (K-001), which is exactly what K-004 exists to catch.

A constraint the remediation must respect, found by the Leader while confirming the defect: local cleanup at
line ~774 spans `[OFFICIAL_BAND_START, OFFICIAL_BAND_START + 20]`, so the generated code and the cleanup range
have to move together or the scratch schema orphans rows.

**Attempt 3 dispatched** as T-14c (`task_135f87003e04` / `ctx_5b6e78ec9005`). **This is the 3-attempt ceiling —
a FAIL here HALTs T-14.** The brief narrows scope to this single issue, forbids touching the three confirmed
behaviors, forbids a stray report file (third occurrence), and requires the worker to **demonstrate** the
uniqueness property rather than assert it.

**Attempt 3 (T-14c) — Implementer: Cursor `cursor-grok-4.6-high-fast`**

`Date.now() % 11` replaced by a genuinely unique generator:

```ts
const K004_UNIQUE_BAND = 6_000_000_000_000_000;
let k004OfficialSeq = 0;
function uniqueK004OfficialCode(): number {
  k004OfficialSeq += 1;
  const code = K004_UNIQUE_BAND + Date.now() * 1000 + k004OfficialSeq;
  if (!Number.isSafeInteger(code) || code < K004_UNIQUE_BAND) {
    throw new Error(`T-14 abort: K-004 official code ${code} is not a safe bigint integer`);
  }
  return code;
}
```

The committed default stays fixed at `OFFICIAL_BAND_START` (910150901) — correct, because PRMS always rejects
the Drive link, so that code never persists and determinism costs nothing. Local cleanup was widened to span
**two** ranges, `[OFFICIAL_BAND_START, OFFICIAL_BAND_END]` and `[K004_UNIQUE_BAND, MAX_SAFE_INTEGER]`, so the
generated code cannot orphan a row in the scratch schema.

**Leader structural check.** The generator is called **once per run** (`CODE.dc3`), so `seq` never approaches
the 1000-wide millisecond slot boundary the uniqueness argument depends on. Headroom below
`MAX_SAFE_INTEGER`: `6e15 + Date.now()*1000 ≈ 7.79e15` against `9.007e15`, i.e. roughly 38 years, and the
`isSafeInteger` guard fails loud rather than wrapping.

#### Leader-measured gates — all re-run after the worker was released

| Gate | Result |
|---|---|
| Live e2e, committed default | **4 / 4 passed** · `external_reference=910150901` · `http_status=207` · `REJECTED_BY_PRMS` · `request_id=Root=1-6aa9a517-6f82a6b806f488e832b97b1f` · alignment PATCH `{"status":200}` — **not 409** |
| K-004 falsifier | **1 failed / 3 passed.** `external_reference=7789502747755001` · `http_status=200` · **ACCEPTED** · red lands on **`expect(synced).toBe(false)` — `Expected: false / Received: true`** |
| Unit suite | **387 suites · 3288 passed · 0 skipped** |
| `npx eslint`, unpiped | **exit 0** |
| Credential sweep (literal value from `.env`) | **0** occurrences |

**Uniqueness demonstrated, not asserted (KZ-002).** The Implementer's run drew **7789502665762001**; the
Leader's later, independent run drew **7789502747755001**. Two different codes in the same band, from two
separate processes — the property is measured across runs rather than argued from the formula.

**Review dispatched** (`task_41508ef0bf17` / `ctx_96783bc958fc`) to Cursor `gpt-5.6-sol-high` — the same
Reviewer model that raised the issue, and still ≠ the Implementer model, preserving `author ≠ auditor`.

**Attempt 3 — Reviewer: Cursor `gpt-5.6-sol-high` · Verdict: `STATUS: PASS`**

> "Audité exclusivamente el cierre del defecto de unicidad de T-14c y confirmé **contra el repositorio** que la
> banda generada queda separada de todas las bandas de fixtures existentes, que la secuencia evita colisiones
> intraproceso y que los valores seguros quedan cubiertos por la limpieza con fallo explícito al agotar el
> rango. La ruta por defecto sigue fija y conserva la prueba DC-3, el falsificador usa código y título frescos
> y no queda trabajo de remediación."

The Reviewer checked the band-separation claim **against the repo rather than against the code comment that
asserted it** — the KZ-002 discipline, applied to the Leader's own brief.

**T-14 is DONE after 3 attempts and 3 review rounds.** No `Not Done` field, no outstanding remediation.

#### T-14 Done checks — each backed by a Leader-run measurement

| Done check (`tasks.md:346-349`) | Evidence |
|---|---|
| Malformed row leaves `is_synced_to_prms = false`, records `REJECTED_BY_PRMS`, alignment PATCH non-409 | Live run: `http_status=207`, `outcome=REJECTED_BY_PRMS`, PATCH `{"status":200,"description":"Pool funding alignment updated"}` |
| Allowed and denied guard cases both pass, denied using a non-owner `CONTRIBUTOR` | Both green; the denied persona is a plain `CONTRIBUTOR` not on the result, never `CENTER_ADMIN` |
| `indicator_id` 3, 5, 6 and PRMS policy type `1` each refused with their own reason | Green; three distinct exact messages, no transport call |
| Full suite green: `npm test -- --silent` | **387 suites · 3288 passed · 0 skipped** |

**DC-3 is covered**, with a falsifier that has been **seen failing for the right reason** — ACCEPTED reached,
then a specific red on `expect(synced).toBe(false)` — which is what K-004 demands and what attempts 1 and 2
could not deliver.

#### What T-14 does NOT cover — declared, not discovered later (KZ-017)

- **DC-7** (`requirements.md:108`) — a non-prod environment reaching the PROD Normalizer — remains
  **structurally uncoverable**. The suite now aborts before boot on any non-TEST host, which closes the hole
  *inside this repo*, but no test here can prove the deployed production build resolves the right host. That
  is verified at deploy time, and stays an accepted risk.
- `npm test` (rootDir `src`) never runs this suite; `test:e2e` is a separate config and is not part of any
  default gate.
