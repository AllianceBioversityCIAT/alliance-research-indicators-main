# Judgment Day — findings ledger

| Field | Value |
| --- | --- |
| Target | `requirements.md` + `design.md`, `docs/specs/changes/agresso-staff-deactivation` |
| Mode | `judgment_day` — blind dual review, parallel, read-only |
| Lineage | **Fresh.** The parent spec's lineage was `ESCALATED` and is not resumed |
| Round | **1 of 2** fix rounds · 0 of 2 scoped re-judgments used |
| Judges | **A** and **B**, different models from each other and from the author |
| Author | Opus 5 (the `/akili-specify` session) |
| Date | 2026-09-15 |
| Contradictions between judges | **0** |

> **Author ≠ auditor caveat, recorded rather than glossed.** Both judges ran on models different from
> each other; the author is a third. No judge shared the author's model. Every **confirmed** finding
> below therefore passed a genuine cross-model check — which is the corroboration the protocol buys.

---

## Merge summary

| Class | Count |
| --- | --- |
| **Confirmed SEVERE** (both judges, independently) | **4** |
| Suspect SEVERE (one judge) | 2 |
| **Confirmed WARNING** (both judges) | **5** |
| Suspect WARNING (one judge) | 7 |
| SUGGESTION | 5 |
| **Contradictions** | **0** |

**Where the design held up.** Neither judge challenged DD-D1 (placement), DD-D2 (the `ceil` page-count
fix, independently re-verified by A), DD-D4 (snapshot reuse), DD-D7 (dry-run opens no transaction),
DD-D9 (migration seeding), the `app_secrets`-first write ordering as a *concept*, or the split
invariant. **Every confirmed finding falls in three places:** C-2's re-derivation, the `R-AGD-002`
dissolution argument, and the document-to-document consistency of counts and criteria.

---

## Confirmed SEVERE — both judges, independently

### JD-1 — C-2 counts fetched rows, not distinct people, reintroducing the parent lineage's `S-1`

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `design.md` §5.1, DD-D3; `requirements.md` R-AGD-004 C-2 |

`allStaff` is appended once per **row** inside the mapper closure, so `allStaff.length` is a count of
fetched rows, not of distinct staff. C-2's accumulation clause compares it against `totalElements`,
a count of distinct records. Under unstable offset pagination a duplicate inflates the count by
exactly what an omission deflates it — **the two cancel**. This is `S-1` verbatim
(`judgment-inherited.md:140-146`), which round 1 of the parent lineage closed by counting distinct
carnets, and which DD-D3 **demoted to a `warn` that never aborts**.

DD-D3 invokes the Kaizen rule *"enumerate what machinery does, not what it was for"* and then does
the opposite: what the distinct-carnet count **did** was measure distinctness; the replacement
measures volume.

**Failing input (A):** `totalElements = 2000`, two pages; 5 employees shift across the page boundary
between reads. Page 2 repeats 5 carnets and omits 5 others. `allStaff.length = 2000`; no page empty;
C-2 passes; 5 employed people are retired across three tables.

**Failing input (B):** 30 employees onboarded between the page-1 and page-2 fetches; the window
shifts; 30 already-seen records repeat and 30 tail records fall off. Counts match exactly.

---

### JD-2 — `driftTolerance` absorbs a direction that cannot occur, and licenses up to 5 wrong retirements per run

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `design.md` §5.1; `requirements.md` R-AGD-004 C-2 |

The tolerance is justified as absorbing *"a hire or edit landing mid-run (`W-6`)"*. Both judges
checked the direction independently and found the justification empty: `totalElements` is read
**before** the page loop, so a mid-run hire produces a **surplus** — which the design already says
never aborts — and an edit changes no count. The only drift producing a shortfall is a departure.

So the tolerance has no legitimate case to absorb. Its sole reachable effect is a **per-run budget of
up to five people wrongly retired**, each losing their account, their roles and their machine
credentials. Neither document states that trade — which is the exact fault the parent ledger recorded
against `R-4` (*"Neither document states this trade"*).

**Failing input (B):** a gateway returns HTTP 200 with a partial `content` array (396 of 400 rows) —
`base()`'s `.catch` is never reached. `2396 < 2400 − 5` is false. Four live employees are retired.

---

### JD-3 — The `UNUSABLE_EMAIL` dissolution is false: the predicate measures the raw string, the key measures the trimmed one

| | |
| --- | --- |
| Judges | **A** (SEVERE) · **B** (SEVERE) |
| Location | `requirements.md` R-AGD-002 AC.2 + dissolution table; `design.md` §5.3 |

Both documents dissolve this form with one argument: *an over-length payload email cannot equal any
stored email, because `sec_users.email` is `varchar(150)`*. **The argument substitutes the raw payload
string for the match key.** They are different strings produced by different expressions in the same
file: `isUsableEmail` rejects on `email.length > 150` — **untrimmed** — while the index and match key
are `email.trim().toLowerCase()`.

A payload email whose *raw* length exceeds 150 only because of padding has a trimmed key of ≤ 150
characters that matches a stored row exactly. That member is skipped, never indexed, and contributes
no shield. The account is unmatched, unshielded, and retired across three tables.

**This is a fourth form, and it is not a fourth pipeline stage.** `F-8`, `NEW-2` and `NEW-4` are all
*"which stage dropped the member"*. This one is a **predicate/key mismatch** — which is why no prior
pass found it, and why `R-AGD-002`, organised by stage, structurally cannot see it.

**Failing input (B):** `{resourceId: 'A1234', email: 'maria.gomez@cgiar.org' + 140 spaces}` (raw 161)
against an active row `{id: 812, email: 'maria.gomez@cgiar.org'}`. A fixed-width ERP export padded to
a column width produces this for **every member at once** — and C-3 cannot catch a single-account case.

**Second head (B):** `sec_users.email` is `NOT NULL` but not non-empty. A stored row with `email = ''`
normalizes to `''`, as does a whitespace-only payload email — so that row is reachable too.

---

### JD-4 — `R-AGD-002` AC.2 cannot go red, and it is the gate that would have caught JD-3

| | |
| --- | --- |
| Judges | **B** (SEVERE, standalone) · **A** (SEVERE, as the second half of its `UNUSABLE_EMAIL` finding) |
| Location | `requirements.md` R-AGD-002 AC.2 |

AC.2 states it *"is satisfied by proving the reachability argument, not by a shield"*. It constrains
no output: removing the shield satisfies it, adding one satisfies it, a wrong one satisfies it. No
implementation change can redden it.

`requirements.md` §10 row D-9 nevertheless claims this class is gated (*"Dedicated tests named per
skip reason … Yes, by validating before shielding"*). Under AC.2 there is no test to name. **The
spec's own §10 criterion — a gate that cannot go red is a finding — is met by the spec's own AC**, and
the defect it fails to catch is JD-3, a wrong destructive write.

---

## Suspect SEVERE — one judge, NOT auto-fixed

| # | Finding | Judge |
| --- | --- | --- |
| **JS-1** | **C-4 verifies that a row named `External` exists, not that external accounts point to it.** W-1 is relocated, not closed. The only in-repo code that inserts `sec_users` writes literal `status_id = 1`, and the column is `bigint DEFAULT NULL`. If externals carry `1` or `NULL`, C-4 passes, EX-1 shields zero rows, and every external is retired — bounded only by C-3. No AC or rollout step requires `excludedExternal` to be checked against an expectation | **A** |
| **JS-2** | **A catch placed inside the transaction callback commits partial chunks.** §5.7 requires the pass to never throw; `dataSource.transaction` rolls back only if the callback rejects. The sibling's shipped precedent returns a summary from *inside* the callback — the pattern an implementer will copy — producing dead `app_secrets` and roles with a live `sec_users` row, the exact half-retired state R-AGD-005 exists to prevent | **A** |

---

## Confirmed WARNING — both judges

| # | Finding |
| --- | --- |
| **JD-5** | **`AppConfigService` is REQUEST-scoped by cascade; §2.2 lists it under "Reuse", reintroducing the `W-10` the design claims to have avoided.** It injects `CurrentUserUtil` (`Scope.REQUEST`), which bubbles to the service, the staff service and the fire-and-forget controller. **The repository forbids this in writing** — `mapping-phase.resolver.ts:11-15` says *"Do NOT inject AppConfigService … it would cascade REQUEST scope"* — in the very file `requirements.md` §5 cites as evidence for its TTL claim. B adds: `AgressoStaffModule` imports only `HttpModule`, so the dependency is not even resolvable without importing `AppConfigModule` |
| **JD-6** | **`R-AGD-004` AC.7 and the dry-run rule specify opposite behaviour for an unset ceiling key**, and the migration seeds dry-run `true`, so *every run until rollout step 4* hits the ambiguity. The dry run is the spec's sole substitute control for its ungateable class, and its behaviour on a config resolution failure is unspecified |
| **JD-7** | **EX-3 is incoherent.** A: `requirements.md` AC.3 says both rows of an ambiguous pair are counted `excludedAmbiguous`, but when the key has a payload match one of them is the chosen `refresh` target and is never a candidate. B: §5.3's shield set covers *every* payload member, so step 3 removes any row whose key is in the payload — which makes step 1 (`matchedIds`) dead code and **makes EX-3's stated `J-3` rationale unreachable**, since that case by definition has the key in the payload |
| **JD-8** | **Cross-table lock order is inverted relative to the sibling's shipped transaction**, and the trigger has no in-flight guard, so two overlapping runs hold `sec_users` wanting `sec_user_roles` against holding `sec_user_roles` wanting `sec_users`. "Ids sorted ascending" mitigates the *within-table* dimension, which was already safe. B adds: `app_secrets` has **no index on `responsible_user_id`**, so that statement locks in primary-key order and id sorting has no effect on it at all — while DD-D10 declines isolation controls *on the ground that* chunking and id-ordering are the real mitigations |
| **JD-9** | **"Audit columns are written on every row" has no actor and is unsatisfiable-or-vacuous.** `updated_at` is `ON UPDATE CURRENT_TIMESTAMP`, so it is written regardless; `updated_by` has no request user in a background job, and the only way to obtain one is `CurrentUserUtil` — the `Scope.REQUEST` dependency JD-5 and DD-D8 exist to avoid. The sibling's repository states the ruling for this exact path and deliberately omits the column |

---

## Suspect WARNING — one judge

| # | Finding | Judge |
| --- | --- | --- |
| JS-3 | C-2's accumulation clause has **no acceptance criterion and no gate row** — AC.2 covers only the zero-row page, so an implementation dropping the clause passes every AC | A |
| JS-4 | **`abortReason` is a single field already owned by the sibling** (`'GRANT_ASSERTION'`). Adding `C-1…C-4` to it makes "its presence alone identifies an abort" false: a sibling savepoint rollback plus a completed deactivation reads as an aborted deactivation. The two are independent and need two fields | A |
| JS-5 | **C-2's two clauses carry incompatible drift models** — clause 1 tolerates nothing, clause 2 tolerates five. After the `ceil` fix the last page holds `totalElements mod 1000` rows, so one mid-run departure empties it and aborts a run clause 2 calls healthy. `W-6` is not dissolved; it is sharpened | B |
| JS-6 | **DD-D5 destroys the falsifiability AC.3 is sold on.** Once both sides call one shared util, `expect(f(x)).toBe(f(x))` is a tautology; no edit to the util can redden it, and the only change that could — a call site abandoning the util — is exactly what a key-equality assertion cannot observe | B |
| JS-7 | **Three ACs demand summary contents the exhaustive field list does not contain** — the C-2 page number, `deactivationCount` (the field is `deactivated`), and a per-account shield reason. `design.md` §9 silently resolves this into the *log* line instead of the summary. Since the endpoint is fire-and-forget, the summary is the operator's only feedback channel | B |
| JS-8 | **C-4's `user_status` read ignores `is_active` and `deleted_at`**, and the schema has no unique index on `name`. One soft-deleted `External` row aborts **every run, live and dry** — including the rollout's measurement run — with no indication the cause is a dead row | B |
| JS-9 | **"Usable as a key" is undefined**, and the two readings produce different systems: the strict one (`isUsableEmail`) *is* JD-3; the loose one applies `normalizeEmail` — which has no null guard — to the raw payload before the only thing that guards null, so one `email: null` member throws and aborts the pass permanently | B |

---

## SUGGESTION

| # | Finding | Judge |
| --- | --- | --- |
| JG-1 | **§14's budget contradicts its own stated basis.** It claims to carry the sibling's measured **2.3×** test ratio, then states 750/1,450 = **1.93×**; 2.3× over 750 gives ~2,475, not 2,200. `F-4` recorded that a budget whose basis does not match its number converts a real overrun into a false escalation | B |
| JG-2 | §10's belt-and-braces note asserts the in-memory filter shadows the SQL predicate for all three writes; it is true only for `sec_users`. Routing the two unit-falsifiable statements to the fixture tier on a false premise | B |
| JG-3 | EX-1 compares two `bigint` columns from raw reads with strict equality; NFR-AGD-004 mandates coercion for `is_active` only. Extend it to every raw-read column used in a branch | A |
| JG-4 | *"the three existing sync call sites"* (§1) — `cloneAllAgressoStaff` has exactly **one** call site. The phrase was copied from the sibling, where it referred to `findUserByEmailOrCarnet` | A |
| JG-5 | `user_status` carries `is_active`; C-4 does not say whether an inactive row counts toward "exactly one" *(overlaps `JS-8`)* | A |

---

## Author's reading, for `/akili-archive`

**All four confirmed severe findings are in text this session authored, and two of them are the same
failure the parent lineage was escalated for.** `JD-1` and `JD-2` are `C-2`'s re-derivation reopening
`S-1` — a class round 1 of the parent had explicitly closed — while the design's own §5.1 callout
congratulates the correction for retiring `F-1`, `R-4` and `W-6`. The callout was right about the
three it named and blind to the one it reopened.

The reusable signal is not "C-2 was wrong". It is that **a correction was validated against the
findings it was written to close, and the class it broke was one no open finding pointed at.** The
same session caught `DD-D2` by running the arithmetic rather than reading it, and missed `JD-1` by
reading the replacement rather than diffing what the replaced machinery *measured*.

`JD-3` is the more valuable finding: a defect class the parent's three passes and two judges never
reached, because every prior form was organised by pipeline stage and this one is a predicate/key
mismatch. Both judges found it independently, from source, within the same round.

---

# Round 2 — Increment 2 (Part II), 2026-09-25

**Target:** `requirements.md` §14–§22 · `design.md` §17–§27. Part I out of scope.
**Protocol:** blind dual review, two judges, parallel, identical prompt, neither aware of the other.
**author ≠ auditor across model families** — the design was authored by Claude Opus 5; neither judge is Claude.

| Judge | Host | Model | Verdict |
| --- | --- | --- | --- |
| A | Antigravity | `gemini-3.1-pro-high` | **REJECT** — 2 SEVERE · 3 WARNING · 1 SUGGESTION |
| B | Codex | `gpt-5.6-terra` | **REJECT** — 1 SEVERE · 3 WARNING · 1 SUGGESTION |

## Premise Ledger — attacked at source by both, independently

**P-1 … P-8: CONFIRMED by both judges**, each re-running or re-reading the citation itself. P-7's
counts were re-derived independently by both (25 `.transaction(` sites; the single isolation hit is a
comment). **P-9: `NOT_RE_RUN` by both**, each stating the correct reason — business legitimacy of
eight human accounts is structurally unreachable by code search (`D-15`).

The ledger survived the attack. No citation failed to reproduce.

## Merged findings

Severity below is the **Leader's merge**, not either judge's label. Every row marked *verified by
Leader* was re-checked against the source before being accepted — agent findings are not taken at
face value.

| # | Finding | Raised by | Status |
| --- | --- | --- | --- |
| **JR2-1** | `MEASUREMENT` §3's four cohorts read as a partition of the 146 but leave **19 carnet-less `@cgiar.org` accounts classified by nothing** (11+3+22 = 36 of 55) | A (SEVERE) | **CONFIRMED — verified by Leader.** The 19 enumerated |
| **JR2-2** | The dry-run a human approves is **not bound to the set the live run writes** — separate invocations, fresh fetch, no hash/window/equality gate. Missing ledger row | B (SEVERE) | **CONFIRMED — verified by Leader.** Real design gap |
| **JR2-3** | §19's *"credentials die first … so a failure can never leave the account off with a live credential"* attributes to **statement order** an atomicity the **transaction boundary** already provides | A (SEVERE) | **CONFIRMED — verified by Leader.** False causal claim; order still earns its place for lock consistency (§19.2) |
| **JR2-4** | The 2026-08-24 block remainder is **17, not 14** (22 − 5 exempt) | A (WARNING) | **CONFIRMED — verified by Leader** |
| **JR2-5** | `requirements.md:707` says **22** transaction sites; `design.md` §19.2 says **25** and explains the drift — self-contradiction between this spec's own documents | B (WARNING) | **CONFIRMED — verified by Leader.** A forward-sweep failure (`K-003`) in the authoring pass |
| **JR2-6** | The rollback scenario specifies **40 accounts failing on the second chunk**; `CHUNK = 50`, so 40 accounts produce **one** chunk. The falsifier cannot fire | B (WARNING) | **CONFIRMED — verified by Leader.** An inert fixture in the spec text |
| **JR2-7** | `JD-8` is **restated as accepted risk, not discharged** — "operational discipline" is not an acceptance criterion | **BOTH** (B WARNING, A SUGGESTION) | **DUAL-CONFIRMED** |
| **JR2-8** | The **163** `UNUSABLE_EMAIL` figure appears in requirements and design but **not in `MEASUREMENT`**, so no reader can corroborate it | **BOTH** (B SUGGESTION, A WARNING) | **DUAL-CONFIRMED.** *(A's derivation of 166 conflates skips with the 3 payload collisions; the figure 163 is correct — the record is what is missing)* |
| **JR2-9** | The sibling's `applyCreateAndGrant` **returns from inside its own transaction callback** — the sole in-repo precedent justifying `DD-D11`/`JS-2` — and carries **no Premise Ledger row** | A (missing premise) | **CONFIRMED — verified by Leader** at `sec-user-reconciler.service.ts:325` |
| **JR2-10** | Budget `≈400` implementation LOC is inflated; the work is "~50 lines" | A (WARNING) | **DISPUTED by Leader.** A's estimate ignores chunking, id validation, driver coercion and this repo's comment density. Recorded, not accepted |

**Protocol note.** Neither SEVERE was raised by both judges, so none is auto-fix eligible under the
two-judge gate. Six single-judge findings were nonetheless **independently verified by the Leader
against source**, because arithmetic and a self-contradiction are matters of fact, not of judgment.
`JR2-10` is the one finding the Leader disputes, and it is recorded rather than silently dropped.

## Correction round 1 — applied 2026-09-25, **re-judgment NOT run** (user ruling: "fix only")

Nine of the ten merged findings applied. `JR2-10` disputed and left unapplied, with its reason on the
record. **The user elected "Fix only" over "Fix and re-judge", so round 2 was not run** — the lineage
keeps **1 fix round and 1 scoped re-judgment** unspent. These fixes are therefore **unaudited**: no
judge has seen them, and nothing here claims otherwise.

| # | Applied as |
| --- | --- |
| JR2-1 | `MEASUREMENT` §3 — the cohorts no longer read as a partition; **group ⑤ added and enumerated** (19 ids), plus a fourth question for BI. The 19 are institutional, `Accepted`, carnet-less and login-less — larger than groups ① and ② combined |
| JR2-2 | `design.md` §18 claim retracted in place; **new §19.4** with the bounds/non-bounds table; **`DD-D15`** accepts the divergence rather than preventing it, and says so; **`P-11`** added to the ledger; rollout residual assigned to the operator |
| JR2-3 | The false causal claim corrected in **both** documents — atomicity is the transaction boundary's, the order buys lock consistency (§19.2) and nothing else |
| JR2-4 | 14 → **17** in `design.md` §22 and `OQ-D4` |
| JR2-5 | `requirements.md:707` 22 → **25**, with the drift reason inline |
| JR2-6 | Rollback scenario 40 → **120 accounts**, which at `CHUNK = 50` is three chunks, so the second-chunk falsifier can actually fire |
| JR2-7 | `JD-8` relabelled **NOT DISCHARGED** in both documents, with a named owner and the in-flight guard deferred to its own spec |
| JR2-8 | `skippedUnusableEmail 163` added to `MEASUREMENT` §1, with the judge's `166` arithmetic corrected (163 skips + 3 collisions) |
| JR2-9 | **`P-10`** added — the sibling's in-callback return, verified at `sec-user-reconciler.service.ts:325` |
| JR2-10 | **NOT APPLIED — disputed.** The `~50 lines` estimate ignores chunking, id validation, driver coercion and this repo's comment density |

**Correction Closure run in both directions.** Forward: every superseded value (`22 transaction
sites`, `14 further`, `set of 40 accounts`, `die first and the account last`, `same set the live run
retires`) greps to zero outside its own retraction note. Backward: no document cites a corrected
section. Premise Ledger count line re-checked against its rows — **11 declared, 11 present**.

**Part I verified byte-identical in both documents after every edit**, and the increment-1 citation
counts are unchanged.

**TRANSACTION STATE: `escalated`** — REJECT stands unretracted. Two judges rejected; the fixes were
applied without re-judgment by explicit user ruling, so no judge has cleared them.
