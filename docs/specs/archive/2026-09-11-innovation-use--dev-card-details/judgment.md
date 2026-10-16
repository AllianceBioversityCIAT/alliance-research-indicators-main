# Judgment Day — `design.md` (round 1)

| Field | Value |
| --- | --- |
| Target | `docs/specs/innovation-use/dev-card-details/design.md` (immutable during judgment) |
| In-scope contrast documents | `requirements.md`, `proposal.md`, `../family.md`, root `CLAUDE.md` §4, `client/.../src/CLAUDE.md` |
| Protocol | Blind dual review, two judges, read-only, fresh context, no shared state |
| Judge A | opus, `Explore` (read-only tool set) — **6 SEVERE / 7 WARNING / 3 SUGGESTION** |
| Judge B | sonnet, `Explore` (read-only tool set) — **2 SEVERE / 4 WARNING / 2 SUGGESTION** |
| Round | 1 of at most 2 |
| Status | **ESCALATED** — awaiting user decision before round-one correction |
| Date | 2026-09-10 |

> **`author ≠ auditor` — honest degradation.** The design was authored on `opus`, and the model
> registry maps T3 Auditor to `opus` on this host, so full model separation was not available. It
> degraded to what root `CLAUDE.md` documents as the expected fallback: **fresh context in both
> judges** (neither saw the author's reasoning) and **different models from each other**, so no single
> model corroborated itself. Judge B is the one that shares no model with the author.
>
> **Independent verification by the parent orchestrator.** The two judges agreed on only **one**
> severe, which under the strict protocol would leave six as `suspect`. Rather than discard them, the
> orchestrator re-verified each A-only and B-only severe **directly against the working tree**.
> Direct verification against source is stronger evidence than agreement between two judges, and it
> is recorded per finding below. `S3` is the one severe confirmed by reasoning about documented
> library semantics rather than by command output, and is labelled as such.

---

## Confirmed SEVERE

### S1 — There is no response DTO to extend; §2.1 and §4 instruct editing a file that does not exist
- **Judges:** A (F-A2) **+** B (F-B1) — *both*
- **Orchestrator verification:** `ls .../result-innovation-use/dto/` → `create-…dto.ts`, `create-…dto.spec.ts`, `update-…dto.ts`. No response DTO. `findOne()` carries `@ApiOperation` and **no** `@ApiOkResponse`, no response type.
- **What the design says:** *"the response DTO's `@ApiProperty` declarations are extended in place"*, and lists `dto/…` as an edited file.
- **Why severe:** one of five files in the composition table is fictional. Honoring §4 requires a **new file** plus a **new decorator**, contradicting the document's own headline *"No new file, no new export, no migration."* `requirements.md` §6 carries the same false premise — copied forward, not corroborated.

### S2 — §4 and §9 assert guards the GET path does not have; the module header says so verbatim
- **Judges:** A (F-A1)
- **Orchestrator verification:** the controller header reads, verbatim: *"No `@Roles(...)` (DD-5): section access is JWT + `ResultStatusGuard` only."* `@UseGuards(ResultStatusGuard)` sits on the **`@Patch`** only; the `@Get` handler carries only `@GetResultVersion()` and `@ApiOperation`.
- **What the design says:** *"**Guards / roles:** unchanged — inherits the endpoint's existing `@Roles(...)` and result-status guard"* and *"Read-only, on an existing guarded endpoint."*
- **Why severe:** §9's whole security argument rests on an authorization layer that is not on the read path — while the change deliberately returns three fields belonging to a **different** result without re-checking permission on it. The conclusion may still hold on child #4's `R-IUL-002` grounds (any active Innovation Dev result is linkable by anyone), but the stated premise is false, and it contradicts a module-header constraint, which this repo treats as constitution.

### S3 — §5.1's single `relations` read plus §3.2's `is_active` filter would drop the whole parent row
- **Judges:** A (F-A3)
- **Orchestrator verification:** **by documented library semantics, not by command output** — labelled honestly. A nested relation predicate (`where: { result_id, result_innovation_dev: { is_active: true } }`) lands in the `WHERE` clause against a `LEFT JOIN`, so a target with **no** detail row or an inactive one yields `child.is_active IS NULL` and the parent `Result` is excluded. The read returns `null` and **`description` and `geo_scope` are lost too**.
- **Why severe:** it contradicts the design's own §5.1 rules table, which promises those two keys are null only when their own column is NULL. `innovation_readiness_id` is nullable **and** the detail row is optional, so this is the common path, not an edge. §11 limit 3 explicitly declines to assert the emitted SQL, so nothing in the plan would catch it.

### S4 — The client builds `linked_innovation_dev` locally from the picker option; the design neither edits nor mentions that call site
- **Judges:** A (F-A4)
- **Orchestrator verification:** `innovation-use-details.component.ts` — `onInnovationDevSelected()` does `this.body.update(...)` and constructs `linked_innovation_dev` with **exactly four keys** taken from `innoDevOutputService.list()`. The picker's source (`GET /api/v1/results?indicator-codes=2`) is an explicit **non-goal**, so it carries none of the three new fields.
- **Why severe — two distinct failures:**
  1. **Type break.** The interface declares the four keys non-optionally. Widening it with non-optional new keys makes that object literal incomplete and fails the build. The design's file list omits this call site.
  2. **Behavioral gap, and it hits the exact moment the request targets.** Immediately after a reporter selects a link, the card renders title + anchor and **nothing else** until a server re-read. The reviewer asked for these details *on the card*; at selection time they would not be there. Worse, §11's `KZ-015` instruction (*"set `linked_innovation_dev` then `detectChanges()`"*) describes a transition **the product does not perform** — a fixture seeding a full 7-key object stays green while the real path renders nothing. That is the `KZ-015` defect class reproduced inside the design's own test instruction.
- **Scope consequence:** this may reopen a user ruling. See `E-1` below.

### S5 — §5.2 claims to map *each* explicit clause and does not; one omission is a reachable forbidden render
- **Judges:** A (F-A5, severe) **+** B (F-B4, F-B5, warning) — *table omission confirmed by both; the reachable render is A-only*
- **Orchestrator verification:** `clarisa_innovation_readiness_levels.level` and `.name` are **both** `nullable: true`. §8.1 guards with an `@if` on the whole `innovation_readiness` **object**, and DD-9 renders `Level <n> - <name>`. So `{ id: 7, level: null, name: 'X' }` renders literally **`Level null - X`**, and both-null renders a bare **`Readiness level:`** — two strings `requirements.md` R-IUC-003 forbids **by name**.
- **Why severe:** not bookkeeping. A forbidden output is reachable from the schema the design itself reads, with no `@if`, no formatter guard and no gate. The second omission (R-IUC-006's *"not an object when there is no link"*) does have a mechanism at §4 and is a table-completeness defect only.

### S6 — `NFR-IUC-002` covers the description text; the design assigns it no color token
- **Judges:** A (F-A6)
- **Orchestrator verification:** the card `div` sets `bg-[var(--ac-grey-100)]` and **no** text color; the title `span` carries its own `text-[var(--ac-grey-800)]`. §8.1 gives the new description `<p>` no color class, and nothing else in the design assigns one. Judge A traced the inherited value to the UA default black, computing **≈ 1.45:1** against dark-theme `--ac-grey-100 #2b2b2b`.
- **Why severe:** `requirements.md` NFR-IUC-002 targets the two labels **and the description text**. DD-5 and §8.3 cover only the labels, so the one NFR the design's own opening flags as carrying "real risk" is discharged for half its scope — and the unstated half fails AA by roughly threefold in the theme the spec partly exists to protect.

### S7 — The clamp precedent is real, but belongs to a different defect class; presented as this repo's verified history and propagated into two documents
- **Judges:** B (F-B3)
- **Orchestrator verification:** the sentence originates at `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub/tasks.md:154`, where **"clamp" means "a bound the test only checked by presence"** — the actual case was a boolean data-fidelity field proved by *140-vs-170 arithmetic*, with no CSS, no layout and no `line-clamp` involved. `grep -rln "line-clamp" docs/specs/` returns no recorded incident of a CSS clamp shipping non-functional.
- **Why severe:** this is the **`KZ-007` artifact class** — a precedent record reads as settled fact, is rarely re-verified, and propagates. It reached `design.md` §11/DD-6 **and** `requirements.md` §4/§8. The underlying conclusion (jsdom does not lay out) stands on its own merits; the argument offered for it did not, and `KZ-014` binds the argument as tightly as the command.

---

## Confirmed WARNING

| ID | Finding | Judges | Verification |
| --- | --- | --- | --- |
| **W1** | §8.3's `--ac-grey-600` **dark** figure is **4.67:1**, not the stated `6.2:1` — `6.2` is grey-700's dark value, copied one row up | A (F-A7) **+** B (F-B2) — *both* | Both judges independently recomputed **4.6676**; orchestrator recomputed **4.667**. Every other figure in the table verified exact (2.9115 / 3.9075 / 6.2373 / 7.4352 / 7.9490). DD-5's conclusion is unaffected — grey-800 was chosen — but the design instructs these figures be re-derived in the gating test, and a test written from this table would encode a false expectation |
| **W2** | §13's budget provenance misstates child #4: it budgeted **~20** rounds at depth **Standard**, not "23–31 rounds, Full tier". Child #4's real ratio scales to ≈8.6 for six tasks, not the derived "~11–13" | A (F-A12) **+** B (F-B6) — *both* | Two of three inputs to the tripwire's stated derivation are wrong; the "~10" conclusion survives on the generous side, by luck rather than by the arithmetic given |
| **W3** | The client harness is **Jest + jsdom**, not "Karma + jsdom" | A (F-A8) | `"test": "jest --config jest.config.ts"`; no `karma.conf.*` anywhere. **Not cosmetic:** Karma is a real-browser runner that *does* lay out — had the name been right, §11 limit 1 and `NFR-IUC-003`'s entire "no automated gate for layout" premise would be wrong. Only the reasoning matched reality. `requirements.md` repeats the error |
| **W4** | §11 triggers `NFR-IUC-001`'s own disqualifier and then clears it with prose | A (F-A9) | The requirement says: *"If the implementation uses TypeORM `relations` rather than an explicit join, assert the generated SQL instead."* §5.1 step 3 prescribes exactly a `relations` load, and §11 substitutes a call-count assertion plus a citation to §3.1. A mocked repo returns the fixture regardless of emitted SQL — the gate cannot fail for the defect it is named against (`KZ-017`, `K-004`) |
| **W5** | §8.2 names `R-IUC-003` AC.6 as the assertion holding the anchor-centering fix; AC.6 cannot detect it | A (F-A10) | AC.6 covers *"text, href format and accessible name"* — nothing about vertical alignment or right-edge placement. The breakage is pure layout, which the design's own lane table lists as unreachable. The most prominently advertised save in the document is protected **only** by the human visual check; saying otherwise removes the reason to look |
| **W6** | DD-7 rejects `justify-between` on a false CSS premise | A (F-A11) | `space-between` places a lone item at main-start, and a `<span>` has `flex-grow: 0`, so it does not stretch. The chosen option is still defensible **on wrap behavior**, but the recorded trade-off is not the real one |
| **W7** | **There is no Tailwind in the build.** Every utility class the design adds is generated at runtime by a third-party CDN script | A (F-A13) | Verified: `0` tailwind hits in `package.json`, no `tailwind.config.*`, and `src/index.html:13` loads `https://unpkg.com/@tailwindcss/browser@4.1.6/dist/index.global.js`. Consequences neither document states: a CDN outage or SRI mismatch silently removes the clamp, the flex row and the wrap — **DC-8's "clamp is a no-op" with an external trigger**; and the utilities can never exist under jsdom, which is the *structural* reason §11 limit 1 is true, a reason the design misattributes to jsdom's lack of layout alone |

---

## Confirmed SUGGESTION

| ID | Finding | Judges |
| --- | --- | --- |
| **G1** | The CLARISA catalog is `clarisa_geo_scope` (**singular**), not `clarisa_geo_scopes`. Wrong in `design.md` §7 *and* `requirements.md` §5/§7 — copied forward | A (F-A15) **+** B (F-B7) |
| **G2** | Line-citation drift: §8.1's `:196-211` is really `:198-212` with the flex row at `:199`; §2.2's `:240-242` for the `@ManyToOne` is really `:235-238`; `:123-139` for the two formatters is really `:123-146`; §4's `GET /api/v1/link-results` is really `.../link-results/details/:code`. Judge A also recorded, for the record, the **many** citations that verified exact | A (F-A15) **+** B (F-B8) |
| **G3** | "**Public endpoint**" overstates `link-results.controller.ts` — it carries `@ApiBearerAuth()` and is not in `JwtMiddleware`'s exclusion list, so it is *authenticated and generic*, not anonymous. DD-1's conclusion holds on the three-caller blast radius alone | A (F-A16) |
| **G4** | §5.1's *"target row not found"* rule cites `R-IUC-001` AC.3, which is about a **different** case (no link at all), and the state is unreachable anyway — the existing code dereferences `innovationDevLink.other_result.result_id` unguarded, so it would already throw | A (F-A14) |

---

## Contradictions between judges

**None.** The judges did not disagree on any finding; Judge B simply reported a smaller subset. Per the
decision gates, contradiction — not asymmetry — is what forces escalation to a human. The escalation
below is driven by finding **count and kind**, and by `E-1`.

---

## Escalation

### E-1 — `S4` may reopen a user ruling made on incomplete information

On 2026-09-10 the user was asked whether the new data should appear *"only in the card"* or *"also in
the dropdown options"*, and ruled **card only**. That ruling was sound on the information presented —
but the option list did **not** disclose what `S4` has since established: the card is populated
**locally, from the chosen dropdown option**, at selection time. So "card only" and "the details are
visible when I link" are not simultaneously satisfiable by the design as written.

This is a **scope question the orchestrator must not settle alone**. It is recorded here rather than
patched.

### Verdict

**JUDGMENT: ESCALATED ⚠️**

7 confirmed SEVERE, 7 confirmed WARNING, 4 confirmed SUGGESTION, 0 contradictions, round 1 of 2
consumed. No correction has been applied — the protocol requires asking before round-one correction,
and `E-1` requires a human decision that changes what the correction should say.

The design's **conclusions** largely survive; its **evidence and mechanisms** did not. Two of the
seven severes (`S1`, `S7`) are false factual claims the author propagated into `requirements.md` as
well, so any correction round must sweep **both** documents, forward and backward, per the Correction
Closure rule.

---
---

# Judgment Day — round 2 (scoped re-judgment)

| Field | Value |
| --- | --- |
| Scope | The frozen round-1 ledger **plus** the fix delta only — `design.md` rev 2, revised `requirements.md`, `proposal.md` Amendment 01 |
| Judge A | opus — **14 RESOLVED / 4 PARTIAL / 0 UNRESOLVED / 0 REGRESSED**, + 2 NEW SEVERE, 2 NEW WARNING, 2 NEW SUGGESTION |
| Judge B | sonnet — **18 RESOLVED / 0 PARTIAL / 0 UNRESOLVED / 0 REGRESSED**, + 1 NEW SEVERE, 1 NEW WARNING, 2 NEW SUGGESTION |
| Round | **2 of 2 — the lineage is now exhausted** |
| Terminal state | **ESCALATED ⚠️** |
| Date | 2026-09-10 |

## Round-1 verdicts (merged, stricter judge wins)

| ID | Verdict | Note |
| --- | --- | --- |
| S1 S2 S3 S4 S6 S7 | **RESOLVED** | Both judges, each re-verified against code. `S3`'s *mechanism* is fixed; its **gate** is not — see `N-3` |
| W1 W2 W3 W5 W6 W7 | **RESOLVED** | Both judges. `W1`'s corrected 4.67 independently recomputed three times (both judges + orchestrator) |
| G1 G4 | **RESOLVED** | Both judges |
| **S5** | **PARTIAL** | The reachable forbidden render (`Level null`) is genuinely fixed and verified. The **completeness claim was re-broken**: §5.4's heading says "all 14" and its footnote explains what "14" counts, but `grep -c` gives **10** `BUT it must NOT` + **11** `AND IT MUST` = **21**. Revision 2 added seven clauses, not six. Row 11 merges two `R-IUC-005` clauses; row 21 is not a clause at all. **This is the S5 defect class reproduced by its own fix** — a completeness table asserting a count it does not hold |
| **W4** | **PARTIAL → escalated to SEVERE** | See `N-3` |
| **G2** | **PARTIAL** | `design.md` converted to symbol citations; **`requirements.md` did not** and retains two of the four items G2 named, plus new drift (`:19` is a blank line) |
| **G3** | **PARTIAL** | `requirements.md:262` still reads **"Public endpoint"**. Corrected in `design.md` and `proposal.md`, missed in the document `design.md` cites as authoritative for `R-IUC-005` |

## New findings (fix-caused)

### N-1 — The new endpoint **does** widen read access, and `R-IUC-008` cannot detect it
- **Severity:** SEVERE · Judge A · **orchestrator-verified**
- **Claim:** §4.2 — *"it is guarded no more loosely than the section read"*; `R-IUC-008` — *"expose nothing the section read does not already expose."*
- **Verified false.** The section read's target is pinned by `SetUpInterceptor` → `ResultsUtil.setup()`, which hard-filters **`platform_code`**, **`is_active = true`** and **`is_snapshot = false`**. The cited premise, child #4's `R-IUL-002`, bounds its universe by `is_active = TRUE` **and** `indicator_id = 2`. The new endpoint as designed applies **none** of these to the id it is handed, and §5.1's table closes with *"Target result row does not exist → all three `null`. Never throws."* `GET /api/results` also hard-filters `is_active = TRUE AND is_snapshot = FALSE`.
- **The genuine delta:** (i) soft-deleted **and snapshot** results' `description` / `geo_scope` / readiness become readable — **which no existing endpoint permits**; (ii) loss of link-mediation — an arbitrary-id reader rather than a link-scoped one.
- **And the requirement cannot catch it:** `R-IUC-008`'s five ACs constrain the response shape, input arity, HTTP method, middleware and Swagger. **None constrains the target set.** The requirement written to prevent widening is structurally blind to it.
- **The bounding mechanism already exists and the design failed to invoke it:** `ResultsService.filterResultByIndicators` filters `indicator_id: In(indicators)` **and** `is_active: true`, and `LinkResultsService.saveLinkResults` already uses it to bound the linkable set.
- **Why severe:** this is the one genuinely new attack surface the spec adds. An implementer following §4.2 and DD-4 literally ships an arbitrary-result reader, and every acceptance criterion still passes.

### N-2 — The security-review waiver stands on a ground the same document contradicts
- **Severity:** SEVERE · Judge A · self-evident in the document
- `requirements.md` §12: *"Security review — **not required**: read-only, no auth change, **no new endpoint**, no secret."*
- §6 of the same revised file: *"**One new endpoint**."* Plus `R-IUC-008` exists solely to govern its authorization posture.
- The line was carried from revision 1 unedited by the sweep. **The reviewer whose sign-off it waives is precisely the one who would have caught `N-1`.** A gate disabled by a stale sentence.

### N-3 — `S3` was fixed in mechanism and left unverifiable; three compounding causes
- **Severity:** SEVERE · Judge A (as `W4` PARTIAL)
- 1. **The `getQuery()` assertion is routed to no lane.** §11's three lanes cover DC-1…DC-8 and DC-10…DC-13; none hosts it, and the only lane that could declares *"a mocked repo's emitted SQL"* structurally unreachable. A tier that could reach real SQL exists (`test:fixtures`) but is not one of §11's lanes.
- 2. **No defect class covers the `S3` failure.** Nothing in `requirements.md` §8 names *"the read drops the parent row, losing `description` and `geo_scope`, when the detail row is absent or inactive"* — so `K-004`/`KZ-014` are unsatisfied for round 1's sharpest severe.
- 3. **`NFR-IUC-001` was not swept and is now self-cancelling.** Its disqualifier fires only *"if the implementation uses TypeORM `relations` rather than an explicit join."* DD-3 now uses a `QueryBuilder` — an explicit join — so **the disqualifier no longer fires**, and the governing verification reverts to exactly the mocked-repo call-count assertion `W4` said cannot detect the defect. §11 limit 3 attributes the SQL assertion to a disqualifier that, as written, no longer mandates it.
- **Why severe:** the single edit that reintroduces `S3` (move the predicate from `ON` to `WHERE`) is caught by no named gate in any named harness, while **both documents read as though it is gated**.

### N-4 — No guard against out-of-order enrichment responses
- **Severity:** SEVERE · **Judge A *and* Judge B — the only new finding both reached independently** · orchestrator-verified
- Select A (read fires) → quickly select B (synchronous rebuild clears) → **A's response settles late and merges onto B's object.** The card then shows A's readiness, description and scope under **B's title and anchor** — the exact inverse of `R-IUC-007`'s purpose.
- Verified: `onInnovationDevSelected` is a plain synchronous `signal.update`; nothing in §5.3, §2.1 or `R-IUC-007` prescribes cancellation, `switchMap`, or an id guard on the merge. `switchMap` appears in **3** non-spec client files, none a picker selection — no precedent exists.
- The one guard §5.3 names (`current.linked_innovation_dev?.result_id !== resultId`) guards **re-selection of the same id**, not late arrival of a superseded request.
- **`DC-12`'s gate cannot see it:** *"select A, select B, assert none of A's values remain"* stays green whenever the stub resolves promptly — the `KZ-015` vacuous-fixture shape this very document warns about two sections later.
- Fix is one line (compare the resolved id against the current selection before merging) **but it must be prescribed**.

### N-5 — The endpoint paths, the `/v1` prefix, and the new route are all wrong or unstated
- **Severity:** SEVERE (Judge A filed WARNING; raised — `DD-2` rests on it) · Judge A + Judge B (route-not-stated half) · **orchestrator-verified**
- **There is no `/v1` and no `result-innovation-use` segment.** `main.ts` sets `setGlobalPrefix('api')` and URI versioning with **no `defaultVersion`**; `ResultInnovationUseController` carries **zero** `@Version`. `main.routes.ts` registers `path: 'results'` as parent and `path: 'innovation-use'` for this module. The **already-shipped client** settles it: `api.service.ts` builds `` `results/innovation-use/${resultCode}` ``.
- **Real route:** `GET /api/results/innovation-use/:resultCode`. Both documents said `GET /api/v1/result-innovation-use/:code` — wrong on **three** counts. `link-results` likewise: `/api/link-results/details/:resultCode`.
- **`DD-2` records a versioning decision** (*"`/v1` stays, no coordinated release"*) **about a prefix that does not exist on this endpoint.**
- **And §4.2 still states no path for the new endpoint**, though `requirements.md` §6 explicitly deferred that decision *to the design* (*"Exact path is a design decision"*). The controller's only existing `@Get` is the bare `RESULT_CODE = ':resultCode(\\d+)'` at the controller root, so a carelessly-named second bare-digit route collides or is shadowed by declaration order.
- **Why raised to severe:** revision 2's opening claimed citations were re-verified and switched to symbols — but **URL paths are not symbols and were never re-checked**, so a `G2`-class error survived a rewrite whose stated purpose was to eliminate it, and this one is load-bearing.

### Lower severity

| ID | Finding | Judge |
| --- | --- | --- |
| **N-6** | A failed enrichment for id `A` is **never retryable**: the early return fires whenever the picked id equals the stored one, so re-picking `A` cannot re-trigger the call. The card stays bare until a save + section re-read. Partially defeats `R-IUC-007`'s purpose in exactly the failure state `DD-12` exists to make survivable | A (SUGGESTION) |
| **N-7** | `DC-9` is defined only in prose — outside §8's numbered table (which jumps DC-8 → DC-10) and outside every §11 lane, so it alone lacks the mandated Gate and falsifying-input columns. Bookkeeping only; it is an accepted ungated risk | A (SUGGESTION) |
| **N-8** | §5.4's table is not the 1:1 enumeration it claims: row 11 merges two clauses, row 21 is not a clause. Same shape as `S5`, non-reachable | B (SUGGESTION) |
| **N-9** | §13 averages a **measured** ratio (child #3, 23 rounds ran) with an **estimated** one (child #4, ~20 budgeted — no final tally is recorded anywhere) and calls both "real ratio[s]" | B (SUGGESTION) |

## Contradictions between judges

**None.** Judge B returned `RESOLVED` where Judge A returned `PARTIAL` on four IDs (`S5`, `W4`, `G2`, `G3`); on each, Judge A's stricter reading was **re-verified as correct by the orchestrator**. That is asymmetric thoroughness, not disagreement — the decision gates reserve escalation-for-contradiction for judges asserting incompatible facts, which did not occur in either round.

## Terminal receipt

**JUDGMENT: ESCALATED ⚠️**

| Round | Confirmed severe | Outcome |
| --- | --- | --- |
| 1 | 7 | All 7 fixed — 6 fully, `S5` partially |
| 2 | **5 new** (`N-1`…`N-5`) + 4 partials carried | **Lineage exhausted** |

Per the protocol the lineage **is not reset or extended**: two fix rounds and two scoped
re-judgments were permitted and both are consumed. Remediation of `N-1`…`N-9` is therefore **not** a
third judgment round — it belongs to `/akili-specify` Phase 2's ordinary **Adjust** loop, and requires
explicit user authorization.

**What the two rounds actually bought.** Round 1 caught a query that would have silently dropped two
of the three fields, and a client path that made the feature invisible at the moment it was requested.
Round 2 caught the **new attack surface introduced by round 1's own fix** (`N-1`), the
**security review waived on a ground the same file contradicts** (`N-2`), a **gate that did not exist
for round 1's sharpest finding** (`N-3`), a **reachable mis-render across two innovations** (`N-4`),
and **URL paths wrong in every document** (`N-5`). Five of those are consequences of the corrections,
not of the original draft — which is the argument for the second round having been worth running, and
also the argument for not assuming a third would converge.

---
---

# Remediation (ordinary Adjust round — NOT a third judgment round)

**Authorized by the user 2026-09-10** after the terminal `ESCALATED` receipt above. The judgment
lineage stays exhausted; this is `/akili-specify` Phase 2's Adjust loop.

| ID | Applied |
| --- | --- |
| **N-1** | `R-IUC-008` gains **AC.6–AC.9**: target set bounded by `indicator_id = 2`, `is_active = TRUE`, `is_snapshot = FALSE`, **and out-of-bounds indistinguishable from unknown** (no existence oracle). `design.md` **DD-13** names the mechanism already in the repo — `ResultsService.filterResultByIndicators` (`indicator_id: In(...)` + `is_active: true`), which `saveLinkResults` already uses. New scenario *"Out-of-bounds target"*. New `DC-16` |
| **N-2** | Security-review waiver **revoked**. §12 now reads **REQUIRED**, with the contradiction recorded verbatim |
| **N-3** | Three causes, three fixes: **`DC-14`** created for the `S3` failure class (it had none); a **`test:fixtures` lane** added to §11 to host the `getQuery()` assertion (revision 2 prescribed it into a table that declared it unreachable); and `NFR-IUC-001`'s disqualifier **rewritten to hold unconditionally** — its `relations`-only wording had stopped firing the moment DD-3 adopted a `QueryBuilder` |
| **N-4** | `R-IUC-007` **AC.7**; `design.md` **DD-14** prescribes the id comparison before the merge; **`DC-15`** created because `DC-12`'s falsifier passes green whenever the stub resolves in order. New scenario *"Responses settle out of order"* |
| **N-5** | All routes corrected to `api/results/innovation-use/:resultCode` (no `/v1`, parent `results`) across all three documents; `link-results` → `api/link-results/details/:resultCode`; `DD-2`'s versioning note rewritten. **The new endpoint's route is now decided**, which revision 2 left unstated despite `requirements.md` delegating it: `GET /api/results/innovation-use/innovation-dev-card/:resultCode(\d+)` — **literal segment first**, so it cannot collide with the controller's bare `:resultCode(\d+)` by declaration order |
| **N-6** | `R-IUC-007` **AC.8** + DD-14's second rule: the same-id early return is conditioned on the prior attempt having **succeeded**, so one failure is not a dead end for the session |
| **N-7** | `DC-9` moved into §8's numbered table and given a row in §11's lane table, marked *ungated by decision, not by oversight* |
| **N-8** | §5.4's merged `R-IUC-005` row split into `11` / `11b` |
| **N-9** | §13 no longer averages a measured ratio with an estimate. It states the only **measured** figure (child #3: 1.64 rounds/task → ≈16 for ten tasks) and labels `~14` as **a judgement, not a derivation** |
| **S5** (partial) | §5.4 **states no total at all** — a count is a moving target and a stale one removes the reason to recount. It instructs the two `grep -c` commands instead |
| **W4** | Folded into N-3 |
| **G2** (partial) | `requirements.md` swept to symbol citations (`ResultInnovationDev.innovation_readiness_id`, `ClarisaGeoScope.name`, …) |
| **G3** (partial) | `requirements.md`'s last **"Public endpoint"** replaced with *"generic authenticated endpoint"*, matching the other two documents |

## Independent final verification (protocol step 6)

Run after remediation, over the three documents:

| Check | Result |
| --- | --- |
| Superseded values outside correction records (`api/v1`, "Public endpoint", the waiver's "no new endpoint") | **0** |
| Clause coverage — `grep -c "BUT it must NOT"` (12) + `grep -c "AND IT MUST"` (14) vs §5.4's clause rows | **26 = 26 — matches** |
| §8 defect-class table ordering | **DC-1…DC-16 sequential** |
| Revision history ordering | **1, 2, 3** |
| Real routes present in both documents | ✅ |

**Two orchestrator-caused defects were found by this sweep and fixed, and both are recorded rather
than quietly corrected:**

1. **A regex written to reorder the revision-history table over-matched §5.4's numbered rows and
   interleaved the two tables**, moving a clause row into the revision history and revision 3's entry
   into the clause map. Repaired by content-matching instead of line index.
2. **§5.4 rows `27` and `28` were exact duplicates of `19` and `20`** — added in revision 3 without
   checking what the table already held. Removed and the tail renumbered. This is the `S5` defect
   class in its *inverse* form: revision 1 had fewer rows than clauses, revision 3 briefly had more.
   The `26 = 26` check above is what caught it, and it is the reason §5.4 now prescribes a command
   rather than asserting a number.

## Final state

| | |
| --- | --- |
| Judgment lineage | **ESCALATED** (terminal, round 2 of 2, not reset) |
| Post-remediation state | All 7 round-1 severes, all 5 round-2 severes, 7 warnings, 4 suggestions and 4 carried partials **applied**; 2 orchestrator-caused defects found and fixed by the final sweep |
| Outstanding | `OQ-1` (readiness format), `OQ-3` (does geo scope ship), `OQ-4` (section-read Swagger retrofit — separate spec), `OQ-5` (`GetGeoFocusService` → CLARISA — separate spec). **`OQ-3` is the only one that would change this spec's scope.** |
| Human gate now owed | **Security review** — `N-2` revoked its waiver. `R-IUC-008` AC.6–AC.9 are what it signs off on |
