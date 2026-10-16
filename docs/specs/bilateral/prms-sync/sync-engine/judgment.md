# Judgment Day — Findings Ledger

> Blind dual review of `design.md`, run from `/akili-specify` Phase 2 Step 2.5 at the user's
> explicit request. This file is the persisted transaction and findings ledger; `/akili-archive`
> reads it as evidence.

## Transaction

| Field | Value |
|---|---|
| **Target** | `docs/specs/bilateral/prms-sync/sync-engine/design.md` |
| **Mode** | `judgment_day` (blind dual, two-judge corroboration) |
| **In-scope context** | `requirements.md`, `homologation.md`, `proposal.md`, `../family.md`, `server/researchindicators/src/CLAUDE.md`, plus any source file under `server/researchindicators/src` |
| **Opened** | 2026-09-14 |
| **Round** | 1 |
| **State** | **`escalated`** — terminal |
| **Author model** | Opus 5 (1M context) |
| **Judge model** | Sonnet x2 — **author != auditor** preserved (AKILI model routing) |
| **Judges** | A and B, launched in parallel, identical scope and criteria, blind to each other |
| **Fix ceiling** | 2 rounds, 2 scoped re-judgments (skill Hard Rules) |
| **Refuter** | Not launched — two-judge agreement is the corroboration mechanism |
| **Skill references** | `references/prompts-and-formats.md` and `_shared/review-ledger-contract.md` are **not packaged** on this machine; the run proceeds on the skill document's own contract, as it instructs |

## Merge rules in force

- Fix **only** severe findings **confirmed by both** judges.
- One judge alone → recorded as `suspect`, not auto-fixed.
- Judges contradicting each other → escalate for explicit human decision.
- WARNING / SUGGESTION rows remain `info`.
- Terminal states: `approved` | `escalated` only.

## Round 1 — merged findings

Both judges returned. A: 3 SEVERE / 2 WARNING / 2 SUGGESTION. B: 3 SEVERE / 3 WARNING / 0 SUGGESTION.

### Confirmed by both judges — SEVERE

| ID | Finding | A | B | Independently verified by the orchestrator |
|---|---|---|---|---|
| **JD-1** | **`ResultStatusGuard` would block the endpoint.** The guard throws `BadRequestException` unless the status is `DRAFT`/`REVISED`/`SCIENCE_EDITION`/`KM_CURATION`, bypassing only `SYSTEM_ADMIN`/`TECHNICAL_SUPPORT`/`CENTER_ADMIN`. The endpoint requires `APPROVED (6)` — the guard runs first, so a Contributor gets `400` before the §5.1 gate is ever reached. Breaks R-PRMS-001 AC.1 for its primary persona | A1 | B1 | ✅ `result-status.guard.ts:28-40, 50-66` read verbatim |
| **JD-2** | **R-PRMS-013 AC.2 (concurrency) is unmet and §2.4 disclaims it.** No lock, unique constraint, or transactional compare-and-flip spans the `is_synced_to_prms = false` read and the flip. Two simultaneous requests both pass the gate and both POST. DC-10 only tests the *sequential* case | A3 | B2 | ✅ self-contradiction between `requirements.md` R-PRMS-013 AC.2 and `design.md` §2.4 |

### Confirmed by both judges — severity split (A: WARNING, B: SEVERE)

| ID | Finding | A | B | Verified |
|---|---|---|---|---|
| **JD-3** | **No refusal path persists a log row.** §2.1's pipeline is `eligibility → build → send → interpret → persist`, so `persist` is unreachable from a gate or build refusal — yet §5.4 defines `REFUSED_BY_STAR` and §3's `failure_reason` documents a "STAR-side refusal reason". Either the value is dead, or the pipeline is wrong. Bears directly on R-PRMS-012 AC.1 ("every attempt leaves exactly one row") and the Center-Admin persona's stated need | A-W1 | B3 | ✅ contradiction internal to `design.md` |

> Both judges identified the same defect; they graded it differently. The Decision Gate's
> "judges contradict" clause covers contradicting **findings**, not differing severity on the same
> finding — recorded as confirmed, severity escalated to B's grade for the fix round.

### Suspect — one judge, but independently verified TRUE

| ID | Finding | Raised by | Verified |
|---|---|---|---|
| **JD-4** | **DD-11's rationale is built on a false premise.** The design asserts *"Grep-confirmed: zero `RESULT_CODE`-scoped controllers declare `@Roles`"*. `bilateral.controller.ts` — mounted at exactly `${RESULT_CODE}/pool-funding-alignment`, the node shape §4 says it mirrors — declares `@Roles(...)` **and** `@UseGuards(RolesGuard, ResultOwnerGuard)` on four mutations, plus class-level `RolesGuard`. It is invisible to a grep for the literal `RESULT_CODE` because it reads `resultsUtil.resultCode` from the route prefix instead of importing the constant | A2 | ✅ `bilateral.controller.ts:52, 230, 236, 271, 277, 309, 315, 346, 352` |

> Protocol note: a single-judge finding is normally recorded `suspect` and not auto-fixed. This one
> was **independently verified against source by the orchestrator**, so it is a established fact
> rather than an unverified claim. **KZ-017 instance:** a check narrower than the claim it backed,
> returning a confident green. ⚠️ **The false claim originates in `server/researchindicators/src/CLAUDE.md` §4** (the "15 controllers carrying `RESULT_CODE`, zero declare `@Roles`" figure), was inherited unverified by this design, and needs correcting **there** as well — a backward-sweep item beyond this spec.

### Confirmed by both judges — WARNING (info)

| ID | Finding | A | B | Verified |
|---|---|---|---|---|
| **JD-5** | **"fourteen tables read"** in §13 Budget contradicts §5.2's own "twelve related tables" and `requirements.md` §1's explicit twelve-item enumeration. The figure is not derivable from any stated arithmetic | A-W2 | B5 | ✅ `design.md:207` vs `design.md:322` vs `requirements.md:31` |

### Suspect — one judge (WARNING, info)

| ID | Finding | Raised by | Verified |
|---|---|---|---|
| **JD-6** | §10 collapses DC-3's two mandatory artifacts into one row. `requirements.md` DC-3 reads "**T-SPIKE + one e2e against TEST, both mandatory**" — the spike proves per-type happy paths, the e2e proves the 207-with-failed-row branch. An implementer reading `design.md` alone could build only the spike and consider DC-3 closed | B4 | ✅ `requirements.md` §6 DC-3 row |
| **JD-7** | `family.md` child row 1 still reads **"payload builders (5 types)"**, stale since D-4 dropped Knowledge Product. Contradicts `design.md` §1 and `homologation.md` D-4 | B6 | ✅ `family.md:35` |

### Info — SUGGESTION (no correctness consequence, not fixed)

| ID | Finding | Raised by |
|---|---|---|
| JD-8 | §4's response `data` shape leaves `attempt_number` undefined for a gate refusal that writes no row | A-C1 |
| JD-9 | §4's `GET` surface lists no guard row, unlike the `POST` row | A-C2 |

### Areas both judges found sound

- **Defect-class coverage:** all of DC-1…DC-10 are present and mapped in §10 (A).
- **Codebase citations:** `base-api.ts:56-71, 89`, `base-api.spec.ts:112-122`, `tip-integration.service.ts:120-127`, `main.routes.ts:81`, `prms.opensearch.service.ts:564`, `AppConfigService.getEnv`, the `PdfViewerService` constructor pattern, the id/level off-by-one, the migration shape and `AuditableEntity` columns — **all verified accurate** (A).
- **Requirement coverage:** R-PRMS-002…012 and 014 each traceable to a design section; none silently dropped (A).

## Round 1 — corrections applied

HITL approval received 2026-09-14: *adopt the Bilateral precedent*. Work units:

| JD | Applied |
|---|---|
| **JD-1** | `design.md` §4 — guards replaced with `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` + `@ResultOwner()` + `RolesGuard` + `ResultOwnerGuard`; `ResultStatusGuard` removed with the reason quoted inline. New **DD-11b**. Mirrored in `requirements.md` R-PRMS-001 permissions and §10 |
| **JD-2** | New `design.md` §5.1b **claim-then-settle** protocol (`SELECT … FOR UPDATE` → `IN_FLIGHT` row → send outside the transaction → settle), plus abandoned-claim supersession. New **DD-15**, new **QA-7**. §2.4's disclaimer corrected. `requirements.md` R-PRMS-013 gains AC.3 and a falsifiability clause on AC.2; new defect class **DC-11** |
| **JD-3** | New per-gate persistence table in `design.md` §5.1 naming which refusals write a `REFUSED_BY_STAR` row and which do not; `IN_FLIGHT` added to §5.4. `requirements.md` R-PRMS-012 AC.2 amended to permit the single `IN_FLIGHT → terminal` transition |
| **JD-4** | **DD-11 rewritten.** The false grep premise is quoted and withdrawn; OQ-3 closed in both documents |
| **JD-5** | Bare "fourteen tables read" replaced with the explicit enumeration in §5.2 and §13 |
| **JD-6** | `design.md` §10 splits DC-3 into **T-SPIKE** and a separate **malformed-row e2e**, plus an explicit executed-migration row for DC-9 |
| **JD-7** | `family.md` child row 1 → "payload builders (4 types — KP dropped by D-4)" |
| **JD-8 / JD-9** | Info, fixed opportunistically: `attempt_number` is `null` on a no-row refusal; the GET surface states its guard triad |

### Backward sweep — beyond the target

**`server/researchindicators/src/CLAUDE.md` §4 corrected.** The false claim originated there, not in
this spec: *"Result section controllers do NOT use `@Roles` … of the 15 controllers carrying
`RESULT_CODE`, zero declare `@Roles`"*. The grep's population is *files importing the literal
`RESULT_CODE`* — narrower than the claim it supported. `bilateral.controller.ts` is route-scoped via
`main.routes.ts` and never imports the constant. The guide now states the real rule (read-mostly
section → JWT + `ResultStatusGuard`; write endpoint acting on an Approved result → Bilateral's
triad) and records that **route-scoping is invisible to a grep for the constant**.

## Round 1 — scoped re-judgment

Both re-judges agreed exactly: **Q1 FIXED 5 / PARTIAL 2 / NOT FIXED 0**, same two partials, same cause.

| ID | Finding | A | B | Verified |
|---|---|---|---|---|
| **RA1 / RB2** | **SEVERE — the JD-1/JD-4 fix was relocated, not applied.** The corrected guard/role spec landed at §4 and §12, but the superseded claim survived at **§2.2** (Reuse table listing `ResultStatusGuard`) and **§8** (*"any authenticated user … JWT + `ResultStatusGuard`. No `@Roles` — DD-11"*) — §8 being the section a security reviewer reads first, and citing DD-11 for a conclusion DD-11 now contradicts | ✅ | ✅ | ✅ `design.md:65, :300` |
| **RA2 / RB1** | **SEVERE — fix-caused.** The new abandoned-claim supersession is a time-triggered **automatic retry**, contradicting §2.4's own rejection of automatic retry *for exactly the stated reason*. Elapsed time cannot distinguish *died before the POST* from *PRMS accepted but the settle died* → duplicate ingest with no un-sync path. B added a second-order break: a merely **slow** process could settle after supersession wrote a terminal outcome, violating the append-only invariant the fix had just introduced | ✅ | ✅ | ✅ `design.md:244-248` vs `:107` |
| **RA3 / RB4** | WARNING — the claim step's literal condition and the stale-row settle's transaction boundary were unspecified | ✅ | ✅ | ✅ |
| **RA4** | WARNING — the per-gate persistence table omitted the `IN_FLIGHT`-collision 409, a third distinct refusal path | ✅ | — | ✅ |
| **RB3** | WARNING — `ResultOwnerGuard`'s `SYSTEM_ADMIN`/`CENTER_ADMIN` early return undocumented; a *"denied: CENTER_ADMIN"* test would encode a **false** expectation | — | ✅ | ✅ `result-owner.guard.ts:26-31` |
| **RA5** | WARNING — the corrected `CLAUDE.md` §4 rule was itself an **n=1** generalization stated as settled: `ResultOwnerGuard` appears in exactly **one** controller. The same evidentiary error the correction was written to fix | ✅ | — | ✅ `grep -rl ResultOwnerGuard --include="*.controller.ts"` → 1 |

## Round 2 — final bounded fix round (applied)

| ID | Correction |
|---|---|
| **RA1/RB2** | §2.2 and §8 rewritten to the Bilateral triad; §2.2 marks `ResultStatusGuard` as deliberately **not** reused. Grep-verified: all five surviving mentions are explicit negations |
| **RA2/RB1** | **Supersession removed entirely.** An aged claim is swept to a new **`UNKNOWN`** outcome — *"we do not know whether PRMS took this"* — never auto-retried; the settle is now conditional on the row still being `IN_FLIGHT`. DD-15 revised; `requirements.md` AC.3 rewritten, AC.4 added |
| **RA3/RB4** | Step 1 states the check-and-insert is one locked transaction and that age is irrelevant to it |
| **RA4** | Claim-collision row added to the persistence table |
| **RB3** | Admin early-return documented in `design.md` §8 and `requirements.md` R-PRMS-001, with the denied-case test constraint |
| **RA5** | `CLAUDE.md` §4 split into **established** (the guard rejects `APPROVED` — from its own code) vs **not established** (n=1; promote only after a second corroborating endpoint) |

## Final scoped re-judgment — round 2

Both re-judges agreed: **Q1 CLOSED 6 / PARTIAL 0 / OPEN 0.** Every round-2 correction landed and
survived a grep for its superseded wording. Both independently re-verified the `CLAUDE.md` split
against source (`result-status.guard.ts:50-66`; `ResultOwnerGuard` in 1 controller vs
`ResultStatusGuard` in 11).

**But two SEVERE defects remain open:**

| ID | Finding | A | B |
|---|---|---|---|
| **FB1** | **The `IN_FLIGHT → UNKNOWN` sweep has no owning mechanism.** §5.1b asserts an aged row "is swept to `UNKNOWN`" but names no actor. It cannot be the claim transaction (which now refuses on *any* `IN_FLIGHT` row, "age is irrelevant"), and §7 states "**New cron:** None." **This is a regression of round 2's own fix:** the removed supersession was self-contained inside the claim transaction and needed no external actor; removing it for correctness removed the only thing that ever touched an aged row. As written, `R-PRMS-013 AC.3` is unimplementable. B sharpened it: the promised human re-drive would itself hit the unconditional `409` against a row nothing ever swept — so the stated consequence is unreachable too | ✅ | ✅ |
| **FB2** | **The re-drive safety argument cites a non-goal.** §5.1b argues a re-drive is safe because *"`external_reference` … PRMS returns it on every row **and on the decision webhook**, so a reconciliation read can establish the truth before anyone re-sends."* **Decision webhooks are an explicit non-goal of this spec** (`design.md` §1, `proposal.md` §6, `family.md`). Nothing in child 3 forces a reconciliation either. So the duplicate-ingest risk was not eliminated — it was **moved from an automatic trigger to an unguarded manual one**, and §2.4's physics apply equally to a manual retry with no reconciliation | — | ✅ |

Info (not fixed): `§3`'s nullability notes do not yet enumerate `UNKNOWN` as a third reason for a
NULL `http_status` / `prms_type`; the claim-collision row is unsequenced relative to gate entries
1–8; the "late settle" event is absent from §9's observability table.

---

## Terminal receipt

| Field | Value |
|---|---|
| **Target** | `docs/specs/bilateral/prms-sync/sync-engine/design.md` |
| **Rounds used** | 2 fix rounds, 2 scoped re-judgments — **budget exhausted** |
| **Round 1** | confirmed severe **2** · confirmed (severity split) **1** · suspect-but-verified **1** · confirmed warning **1** · suspect warning **2** · info **2** |
| **Round 1 re-judgment** | Q1 FIXED 5 / PARTIAL 2 / OPEN 0 · new severe **2** (both confirmed) · warning **3** |
| **Round 2 re-judgment** | Q1 CLOSED 6 / PARTIAL 0 / OPEN 0 · **new severe 2 — one confirmed by both (FB1), one single-judge but factually verified (FB2)** |
| **Contradictions between judges** | none in any round — both judges agreed on every finding they both raised |
| **Correction work units** | 8 (round 1) + 6 (round 2) across `design.md`, `requirements.md`, `family.md`, `server/researchindicators/src/CLAUDE.md` |
| **Artifacts** | this ledger · `design.md` · `requirements.md` · `family.md` · `CLAUDE.md` §4 |
| **Skill resolution** | `judgment-day` (references not packaged — ran on the skill document's own contract) · `software-architect` (design authoring) |
| **Author ≠ auditor** | preserved throughout: Opus 5 authored, Sonnet judged |

**JUDGMENT: ESCALATED ⚠️**

Two severe findings remain after the permitted rounds. Per the skill's Hard Rules the lineage is
**never reset or extended** — FB1 and FB2 are handed to the user as open decisions, not carried into
an unauthorised third round. Neither invalidates the design's structure; both are scoped to the
abandoned-claim path of §5.1b.

---

## Post-judgment corrections (user-directed, outside the lineage)

The terminal state above stands: the judgment lineage is **not** reset or extended. The user
elected, after the escalation, to apply the two corrections the escalation handed them. Recorded
here for traceability, **not** as a third round and **not** re-judged.

| Open item | Decision | Applied |
|---|---|---|
| **FB1** — the `UNKNOWN` sweep had no actor | **Option A:** the **next claim attempt** expires an aged `IN_FLIGHT` to `UNKNOWN` **and then refuses `409`**, without claiming. No cron; no side-effecting read; supersession is not reintroduced because the expiring attempt stops at the refusal — reaching PRMS again takes a second, separate human action | `design.md` §5.1b claim branch + expiry rule, §5.1 persistence table, **DD-16** |
| **FB2** — the safety argument cited a non-goal | **Option C:** the duplicate risk on re-driving an `UNKNOWN` is **accepted as residual risk R-4** and controlled by a runbook step, with the withdrawn webhook claim removed rather than repaired | `design.md` §5.1b residual-risk block, **DD-17**; `requirements.md` R-4 and R-PRMS-013 AC.5 |

Also folded in (info-level, both re-judges): §3's nullability notes now enumerate `UNKNOWN` as a
third reason for a NULL `http_status` / `prms_type`; §9 gains **late settle** and **claim expiry**
rows — the late-settle `_warn` is the operator-side signal for R-4, and without it the one case that
can duplicate would be invisible.
