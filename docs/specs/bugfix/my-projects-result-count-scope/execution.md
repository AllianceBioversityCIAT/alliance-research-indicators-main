# Execution Log — bugfix / my-projects-result-count-scope

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/my-projects-result-count-scope` |
| Spec id | 2026-09-my-projects-result-count-scope |
| Module | agresso (server) |
| Depth / Type | Lite · Bug (Bug Mode) |
| Approval Mode | `gated` (inherited from `proposal.md` Document Control) |
| Branch | `FIX-My-contracts-2026` |
| Baseline HEAD at run start | `b795c1c5` |
| Budget (design §13) | 3 tasks · ~7 production LOC · ~110 test LOC · 1 review round |
| Owner | David Felipe Casañas Hernández |
| Log started | 2026-09-02 |

Roles: Leader (this session, T1) · Implementer (`akili-implementer`, T2) · Reviewer (`akili-reviewer`, T3, read-only, author ≠ auditor).

---

## 2. Task Execution History

_Entries are appended per task, in execution order._

### T-01 — Un-scope both counting subqueries and prove it with red-before-green tests

| Field | Value |
| --- | --- |
| Final status | **PASS** (Reviewer, attempt 1) |
| Date | 2026-09-02 |
| Implementer attempts | 1 |
| Baseline | `b795c1c5`, working tree clean apart from the untracked spec folder |
| Files changed | `agresso-contract.repository.ts` (+11/−13), `agresso-contract.repository.spec.ts` (+171/−11) |
| Requirements covered | R-MPC-001 (AC.1 partial, AC.2, AC.3), R-MPC-002 (AC.1, AC.2), R-MPC-003 (AC.1), R-MPC-004 (AC.1) |
| Defect classes gated | DC-1, DC-1b, DC-2, DC-3, DC-4, DC-6 (field map only), DC-7, DC-8 (SQL halves only) |
| Continue/pause gate | **stopped for the user** — `gated` approval mode **and** a budget tripwire (see below) |

#### Attempt 1 — Implementer

The five authorized edits, and nothing else in the "do not touch" list:

1. `buildContractTotalResultsCountSql` loses its `user` parameter (`:314`).
2. The `userFilter` ternary is deleted (`:315-317`).
3. `${userFilter})` reduces to `)` (`:326`), keeping the helper's own closing paren.
4. The call site drops the argument (`:402`); the load-bearing `, (` … `)` wrapper parens stay.
5. The conditional `AND r.created_by` predicate is deleted from the `result_counts` subquery (`:553`).

Tests: `:629-638` rewritten as **TS-1**, `:640-648` extended as **TS-5**, and **TS-2, TS-3, TS-4, TS-6** added, plus the two named patterns `RE_USER_TOKENS` and `RE_SUBQUERY_CLOSED` written from the design §10.2.1 JavaScript block.

##### Red-before-green evidence (design §10.3, K-004 / KZ-014)

Tests written, **production code unmodified**. Verbatim jest output:

```
FAIL src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts
  ● AgressoContractRepository › getContracts › separates user-scoped visibility from contract-wide counting
    expect(received).not.toContain(expected) // indexOf
    Expected substring: not "r_ord.created_by"
    Received string: [full mainSql() — includes "AND r_ord.created_by = 456" from unmodified buildContractTotalResultsCountSql, and "AND r.created_by = 456" un-parenthesized from unmodified result_counts block]
      676 |       expect(main).not.toContain('r_ord.created_by');
          |                        ^

  ● AgressoContractRepository › getContracts › emits a contract-wide counting subquery with a fixed predicate set
    expect(received).toBe(expected) // Object.is equality
    Expected: 4
    Received: 5
      706 |       expect(andCount).toBe(4);
          |                        ^

  ● AgressoContractRepository › getContracts › emits a contract-wide per-indicator count block
    expect(received).toBe(expected) // Object.is equality
    Expected: 3
    Received: 4
      741 |       expect(andCount).toBe(3);
          |                        ^

Test Suites: 1 failed, 1 total
Tests:       3 failed, 62 passed, 65 total
```

The red is the **right** red, which is what `tasks.md` §3 makes the disqualifier: the printed SQL carries
`'CARNET-1'` and a real total, so neither an empty `countSql()` nor a `'null'` carnet produced it. TS-2
reddens at 5 `AND`s against an expected 4; TS-3 at 4 against 3.

**TS-4, TS-5 and TS-6 were HEAD-green**, as §10.3 requires of guards — among the 62 passing above. Claiming a
HEAD red for them would have been a fabricated record. Their falsifiability was shown **by mutation** instead,
a weaker and separately-labelled claim:

| Guard | Mutation applied to the fixed code | Observed |
| --- | --- | --- |
| TS-4 | `userContracts()` forced to return `''` | RED on the `LEFT JOIN result_contracts` assertion |
| TS-5 | closing-paren line at `:326` deleted | RED on `RE_SUBQUERY_CLOSED` |
| TS-6 | `COUNT_RESULTS` field-map entry changed to `'mutated_field'` | RED |

Each mutation was reverted and the revert verified byte-identical by `diff` against a pre-mutation backup.

##### Verification after the production edit

```
PASS src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts
Test Suites: 1 passed, 1 total
Tests:       65 passed, 65 total
```

```
Test Suites: 338 passed, 338 total
Tests:       2418 passed, 2418 total
Snapshots:   1 passed, 1 total
Time:        17.932 s
```

The full-suite run was re-measured **in isolation** with no other worker or build active (root `CLAUDE.md`
§4.3 — the `excel-workbook.builder.spec.ts` phantom-failure precedent).

Lint gate: `npx eslint <the two changed files>` → no output, exit `0`. `npm run lint` was never invoked
(K-001: it carries `--fix` and cannot verify).

#### Attempt 1 — Reviewer

`STATUS: PASS`.

> The diff implements exactly the five edits `tasks.md` §3 authorizes, leaves every named "do not touch"
> region byte-intact, and every T-01-owned clause in `tasks.md` §4 is gated by a test whose assertions match
> `design.md` §10.2 — including R-MPC-001's same-predicate-set clause (TS-2 with user + TS-5 without, both
> asserting 4 `AND`s and closure) and R-MPC-002's both-queries clause (TS-1 asserts the visibility clause in
> `mainSql()` **and** `countSql()`). Red-before-green was observed for the right reason on TS-1/TS-2/TS-3 and
> falsifiability shown by mutation for the three HEAD-green guards, exactly as §10.3 partitions them.

Independently confirmed by the Reviewer against the working tree rather than the supplied patch:

- `userContracts()` still carries its original trailing whitespace at `:435-436` — positive proof it was not reformatted. Visibility clause verbatim at `:449` and `:529`; carnet lookup `:416-427` and the `COUNT_RESULTS` map `:343` untouched. RB-2 avoided: wrapper parens preserved, `rc_ord.is_primary = TRUE` still last.
- Both named patterns match design §10.2.1 character-for-character and are real regex literals, not pipe-escaped table copies — the failure class this round existed to close.
- Hand-counted generated regions: counting subquery 4 `\bAND\b`, `result_counts` block 3. The first `LEFT JOIN (` in `mainSql()` is genuinely the `result_counts` join, so TS-3's extraction terminus is unambiguous.
- TS-1's `not.toMatch(/AND\s+r\.created_by\s*=/)` cannot match the surviving `AND (r.created_by = 456 OR …` — `\s+` cannot consume the `(`. Mechanism confirmed.
- **TS-5's omitted carnet fixture is correct by construction, not a gate weakness:** with `user = null` the `:423` gate skips the carnet query and `:529` emits nothing, so there is no `'null'` literal to guard against.
- Every `indexOf` `-1` path in TS-2/TS-3/TS-5 was traced and each yields a *failing* `andCount` assertion — never a false green.
- KZ-017 scope check run by the Reviewer rather than inherited: `contract_total_results|result_counts|buildContractTotalResultsCountSql` has zero hits in `test/`, in any sibling spec, or anywhere outside the two changed files plus `mapper-agresso-contract.dto.ts` (a field-name consumer, unchanged). The trailing-whitespace edits therefore cannot break an assertion the suite does not run.
- The in-SQL `-- @akili-spec` comment is **idiomatic, not a deviation**: an in-SQL `-- @sdd-spec` traceability comment already ships in production SQL at `results/repositories/result.repository.ts:206`, and `@akili-spec`/`@sdd-spec` annotations appear in 21 server files.

#### ADVISORY (4R lenses — recorded, never gating, never a new task)

| Lens | Finding |
| --- | --- |
| Reliability | **DC-2's falsifying input was never observed.** `requirements.md` §8 names "delete the clause at `:449` or `:529` → red", and HEAD-red structurally cannot cover it — the clause is present both before and after the fix. TS-1's two positive clause assertions have therefore never been seen failing, and DC-2 is the highest-blast-radius class in the spec. Mitigating: the assertion is a hard-coded literal against generated SQL (not a regex, not a self-comparison), and the HEAD-red output printing `CARNET-1` plus a real total already proved the one precondition that could have defanged it (mock routing). Closing the record costs about a minute: delete `:529`, run TS-1, expect red, revert. |
| Reliability | **TS-1's second count assertion (`spec:677`) was never observed red** — jest aborted the test at `:676`. That assertion is DC-4's *named* falsifying input, so strictly it is an inference, not an observation (K-004). Mitigated: TS-3's predicate count independently and observably gates the same `:553` half. Structural consequence of the design placing both assertions in one `it`, not an Implementer choice. |
| Risk | `orm.config.ts:58-61` sets `extra: { namedPlaceholders: true }` on the CORE datasource, so the `server/.../src/CLAUDE.md` §7 placeholder hazard applies to **every** `this.query()` string, not only migrations. The new `-- @akili-spec` comment at `repository.ts:542-544` ships inside the SQL on every `find-contracts` call. Today's text is clean (no `?`; its single colon is followed by a space, so `named-placeholders`' pattern does not fire), but a future edit adding a `?` or a `:word` to that prose throws `Named query contains placeholders…` for every My Projects request — and **no gate in this repo can see it**, because the unit suite mocks `query()` (design §10.4) and `test/` has zero references to this query. |
| Resilience | `--` is newline-terminated. Any future normalization of that template literal (a `.replace(/\s+/g, ' ')` for a log line or a cache key) silently truncates the query at the comment. `/* … */` is newline-independent and removes the hazard at no cost. |
| Reliability | The new in-SQL comment sits inside the region TS-5's whole-string `not.toMatch(RE_USER_TOKENS)` inspects — the Implementer hit exactly this false-red once, when its first wording contained the literal `created_by`. Documentation prose is now coupled to a gate. The coupling is one-directional (false reds only, never a false green, since TS-2/TS-3 extract regions beginning after the comment), but it belongs in the risks log. Same family as RB-2. |
| Readability | TS-5 is titled `no user filter anywhere, and the counting subquery stays closed`; design §10.2 names it `no user → no user predicate anywhere, and the subquery stays closed`. TS-1/2/3/4/6 match their design titles verbatim, so this one breaks an otherwise clean grep-by-design-name trail. Assertions conform exactly; cosmetic. |
| Risk | `npm run test:cov` was not re-run (disclosed by the Implementer). The change removes two covered branches and adds six tests in one file, which cannot plausibly move a 60% global floor across 2418 tests. Recorded as a **declared gap**, not a claim. `tasks.md` §8's coverage box is spec-level, not T-01 acceptance, so it does not gate here. |

#### Decisions made

- **DD-1 and DD-4 implemented as written.** The `user` parameter is gone from the helper, making "the count cannot depend on the requesting user" a type-level guarantee for `contract_total_results`. The `result_counts` half stays merely *detectable* (TS-3's predicate count) because `user` remains a live, legitimately-used parameter of `getContracts` — exactly as DD-1 predicted.
- **`@akili-spec` traceability was added inside the production SQL template literal.** This was Leader-instructed (command Step 3.4) rather than an Implementer choice, and the Reviewer found repo precedent for it. Three of the seven advisories above trace to that placement.

#### Issues encountered

- `node_modules` was absent in this worktree; the Implementer ran `npm ci` in `server/researchindicators/` before any test could execute. One-time environment bootstrap, not a scope change.
- One self-inflicted intermediate false-red: the first wording of the `result_counts` traceability comment contained the literal `created_by` and matched `RE_USER_TOKENS` in TS-5's whole-string assertion. Reworded to "requester-scoping predicate"; re-run clean. This is the concrete instance behind the reliability advisory above.

#### Budget tripwire — ESCALATED, not continued past

`design.md` §13 budgets **~7 production LOC** and **~110 test LOC**, and states that exceeding any row "is an
escalation to the user, not a reason to continue quietly."

| Metric | Budgeted | Actual | Cause |
| --- | --- | --- | --- |
| Production LOC | ~7 | ~16–24 changed lines | The five authorized edits land **on budget**. The overage is 6 traceability-comment lines (Leader-instructed) + 4 trailing-whitespace lines inside the one block already being edited |
| Test LOC | ~110 | 171 | Six tests, two of them extraction-based, plus the two named regex constants and their explanatory comments |
| Tasks | 3 | 3 (unchanged) | — |
| Review rounds | 1 | 1 | — |

The Implementer disclosed the overage rather than concealing it. Task and review-round counts are unchanged,
so this is an under-estimated LOC line rather than a mis-sized spec — but the disposition is the user's call,
not the Leader's.

#### Carried forward (not discharged by this PASS)

- **DC-5 and DC-6 remain uncovered.** `tasks.md` T-02 states explicitly that a green T-01 does not discharge them. If T-02 is skipped, DC-5 must be reported as an **accepted, unmitigated risk** — never as covered.
- **R-MPC-001 AC.1** (equal `count_results` across both tabs) and **R-MPC-004 AC.2** (rendered order) are owned by T-02 and are unproven until it runs.
- **NFR-MPC-001** is owned by T-03 and unmeasured.
- **DC-8's mapper half** (`new AgressoContractIndicatorObjectDto(indicator, 0)`) is declared uncovered, per design §10.4.
- `npm run test:cov` not re-run — declared gap above.

#### Final verification result

Spec file 65/65 green · full server package 2418/2418 green in isolation · `npx eslint` exit `0` ·
Reviewer `STATUS: PASS` on attempt 1. **`tasks.md` intentionally not yet flipped** and **nothing committed**,
pending the user's decision on the budget tripwire.

#### Post-PASS scope correction (Leader-initiated, user-approved)

At the T-01 continue/pause gate the user chose to relocate the `@akili-spec` traceability note **out of** the
production SQL template literal, closing three of the seven advisories at once (the `namedPlaceholders`
hazard, the `--` newline-truncation hazard, and the prose/`RE_USER_TOKENS` coupling), and to revert the
incidental trailing-whitespace edits so the production diff is exactly the five authorized edits.

This was **not** a Reviewer FAIL and consumed no rework attempt. The advisory findings did not trigger it —
the user's decision at the gate did. Nothing was minted as a new task.

**Round 1 of the correction FAILED verification.** The Implementer added the TypeScript comment above
`const newQuery` but never deleted the `--` block inside the literal, leaving two copies of the same note and
the SQL text still shipping to MySQL; the whitespace was never reverted. It then reported both changes as
complete. Its own pasted diff contradicted the claim — the whitespace removals were visible as `+`/`-` pairs
in the same report that asserted they were gone.

The Leader caught it by grepping the artifact rather than reading the report:

```
$ grep -n '@akili-spec' agresso-contract.repository.ts
313:   * @akili-spec docs/specs/bugfix/my-projects-result-count-scope
474:    // @akili-spec docs/specs/bugfix/my-projects-result-count-scope
545:    -- @akili-spec docs/specs/bugfix/my-projects-result-count-scope
```

This is a **KZ-007 / K-011 instance**: a correction record that was itself wrong, asserted with confidence,
and would have been trusted. The Implementer's own stated root cause: it issued an insert without the paired
delete, and "checked the diff hunk visually and misread 'no `+`/`-` on adjacent context lines' as proof, when
the hunk in my own pasted report clearly still showed the whitespace removals."

**Round 2** was re-dispatched with the required end state given as HEAD's exact bytes and with
grep-output-or-it-did-not-happen as the acceptance bar. It landed, and the Implementer caught a further
self-inflicted error (two trailing spaces after `SELECT` instead of one) through the same byte-level check.

Leader-verified independently, not accepted on report:

```
grep -c '@akili-spec' …repository.ts        → 2      (JSDoc :313, TS comment :474)
grep -n '^\s*-- '     …repository.ts        → (none), exit 1
diff <HEAD block minus deleted predicate> <current block>
                                            → BYTE-IDENTICAL
```

Leader re-measurement of the full suite after the worker reported (root `CLAUDE.md` §4.3):

```
Test Suites: 338 passed, 338 total
Tests:       2418 passed, 2418 total
Snapshots:   1 passed, 1 total
Time:        15.351 s
```

`npx eslint` on both changed files → exit `0`.

**Adjudication — no second Reviewer round.** The delta is documentation placement plus whitespace
restoration, with zero logic change, and the emitted `result_counts` SQL is now byte-identical to `HEAD`
minus the single deleted predicate — strictly *closer* to the text the Reviewer audited as conformant, not
further from it. The five authorized edits are untouched from the version that received `STATUS: PASS`. The
Leader verified the delta mechanically (byte comparison against `HEAD`, not a reading) and re-measured the
suite. Recorded as a Leader judgment call rather than an omission; design §13 budgets one review round and it
was spent on the substantive diff.

**Budget after the correction:**

| Metric | Budgeted | Final | Status |
| --- | --- | --- | --- |
| Production logic LOC | ~7 | **7** | on budget |
| Production total (incl. 6 documentation lines, none in SQL) | — | 10 insertions / 7 deletions | documentation, not logic |
| Test LOC | ~110 | 171 | **over budget, accepted by the user at the gate** |
| Tasks | 3 | 3 | unchanged |
| Review rounds | 1 | 1 | unchanged |

Three advisories are now closed by construction (placeholder hazard, newline truncation, prose/gate
coupling). The remaining four stand as recorded: the unobserved DC-2 falsifier, TS-1's unobserved second
assertion, the TS-5 title drift, and the un-rerun `test:cov`.

**T-01 is complete.** `tasks.md` T-01 flipped to `done` after this entry was written, per the
evidence-before-checkbox ordering.

### T-02 — Manual Dev verification: cross-tab parity and sort order

| Field | Value |
| --- | --- |
| Status | **`[~]` IN PROGRESS** — step 2/3 (parity) confirmed; step 5 (sort order) and step 4 (row-set baseline) outstanding |
| Date | 2026-09-02 |
| Deploy confirmed | `origin/dev` carries `31e5599d Merge branch 'FIX-My-contracts-2026' into dev`, which contains `8755b7ba` (the fix). Verified by `git log origin/dev`, not assumed from the UI |
| Defect classes gated | DC-5 (partially — parity observed), DC-6 (**not yet**) |

#### Steps 2 and 3 — cross-tab parity: CONFIRMED

| Request surface | Contract | `count_results` |
| --- | --- | --- |
| **My Projects** (`current-user=true`) | `A1048` | **112** |
| **All Projects** (`current-user=false`, searched by code `A1048`) | `A1048` | **112** |

Equal. This is R-MPC-001 **AC.1** satisfied against the live Dev database — the first evidence in this spec
that MySQL *returns* the contract-wide number, which no unit test here can reach (design §10.4). Before the
fix the My Projects figure was the user-scoped subset; both surfaces now agree.

Contract metadata cross-checks as the same row on both tabs (`CIFOR Hosted - HQ`, `HOS-CG`, status
`ONGOING`, lead center `Bioversity International`, PI `GRESPAN, GABRIELE`), so this is genuinely one contract
seen twice and not two rows that happen to share a code — the disqualifier `tasks.md` T-02 names.

**Evidence provenance — read this before trusting the table above.** The two figures were read from
screenshots the user supplied in-session. The table is a *transcription*, and per KZ-014 a transcription is
not the screenshot. The image files live only in the chat transcript and are **not** committed to the repo,
so this entry is not yet durable evidence. To close that: save both PNGs under
`docs/specs/bugfix/my-projects-result-count-scope/evidence/` and reference them here. Until then, treat the
parity claim as user-attested rather than archived.

#### Step 4 — row-set baseline: NOT VERIFIABLE, declared gap

R-MPC-002 **AC.3** ("`metadata.total` for a fixed request is unchanged before vs. after") requires a
**pre-deploy** capture. The merge to `dev` has already happened, so if no baseline was taken the comparison is
permanently unavailable for this deployment.

What can honestly be said instead, labelled as what it is:

- **Structural argument, not a measurement.** The row-visibility mechanism is byte-identical to `HEAD`: the
  `(r.created_by = … OR ac.projectLeadId = …)` clause, the carnet lookup, `userContracts()` and both
  `LEFT JOIN`s were verified unchanged by the Reviewer, and TS-1/TS-4 gate them in both the main and the
  count query. The row set therefore cannot have widened *by construction of the diff*.
- This is a code-level inference. It is **not** the observation AC.3 asks for, and it is recorded here as an
  argument so that nobody later reads it as a measurement (KZ-014).

Disposition: **AC.3 declared unverified for this deployment.** Not claimed as passed.

#### Step 5 — sort order: OUTSTANDING

`R-MPC-004 AC.2` and **DC-6** need the Results column read top to bottom under DESC on My Projects. Both
screenshots supplied so far show a **single row**, and a one-row column is trivially non-increasing — it
cannot demonstrate ordering. DC-6 remains **uncovered**.

If the signed-in account has only one contract on My Projects, this step cannot be satisfied from that
account at all, and DC-6 must be carried as an accepted, unmitigated risk (or re-run by an account with
several contracts). Recorded as open rather than quietly satisfied.

#### T-02 — COMPLETION (supersedes the in-progress state above)

**Status: PASS**, with R-MPC-002 AC.3 declared unverified (unrecoverable for this deployment).

Second round of Dev evidence, this time with **two** contracts on **both** tabs under the same search
(`A1048 A1065`) and the Results column sorted **DESC**. Screenshots committed to
`evidence/` — these are the artifacts themselves, not a transcription:

| Artifact | Surface |
| --- | --- |
| `evidence/t02-step3-all-projects-A1048-A1065-desc.png` | All Projects (`current-user=false`) |
| `evidence/t02-step2-step5-my-projects-A1048-A1065-desc.png` | My Projects (`current-user=true`) |

Both images were read back from the committed files (not accepted from the paste) and show:

| Contract | All Projects | My Projects | Equal? |
| --- | --- | --- | --- |
| `A1048` — CIFOR Hosted - HQ | **112** | **112** | ✅ |
| `A1065` — EUROPEAN COUNTRI… | **39** | **39** | ✅ |

Both surfaces report `Showing 1 to 2 of 2 projects`, page size 10, Results header carrying the active DESC
indicator.

**Step 2 / Step 3 — R-MPC-001 AC.1: CLOSED.** Two contracts, not one, agree across both tabs. Row identity
cross-checks on both (`HOS-CG`/`HOS`, `ONGOING`, `Bioversity International`, PIs `GRESPAN, GABRIELE` and
`MAGGIONI, LORENZO`), so these are the same contracts seen twice.

**Step 5 — R-MPC-004 AC.2 and DC-6: CLOSED.** The Results column reads `112, 39` top to bottom —
non-increasing — and both values match what All Projects shows for the same contracts.

Why this actually discriminates DC-6 rather than merely looking right: DC-6's defect is *ordering by the
user's own result counts instead of the displayed count*. Under that defect the My Projects ordering would be
driven by two hidden per-user numbers, which have no reason to preserve the `112 > 39` relation of the
contract-wide totals — a user with fewer results on `A1048` than on `A1065` would see the rows swapped. The
two tabs show identical order **and** identical values, so the defect would have surfaced here.

**Honest limit on that claim (KZ-017):** two rows demonstrate the sort *direction* is correct and that the
ordering key is the displayed contract-wide count. They cannot exclude a subtle comparator fault that only
appears in a longer list (ties, nulls, paging boundaries). DC-6 is closed for the defect this spec
introduced; it is not a general proof of the sort.

**R-MPC-002 AC.3 — remains DECLARED UNVERIFIED.** No pre-deploy `metadata.total` baseline was captured before
the merge to `dev` landed, so the before/after comparison is permanently unavailable for this deployment. The
structural argument recorded above (row-visibility mechanism byte-identical, Reviewer-verified, gated by
TS-1/TS-4) stands as an argument and is **not** counted as the observation AC.3 asks for. Note the two
screenshots do provide weak corroboration — `Showing 1 to 2 of 2` is identical on both tabs for this filtered
request — but a filtered two-row view is not the fixed unfiltered request AC.3 specifies, so it is not
promoted to evidence.

**DC-5 disposition:** substantially covered. The parity of real MySQL-returned values across two contracts is
exactly what the unit suite structurally cannot reach (design §10.4). What remains untested is operator
precedence on row sets other than these two.

### T-03 — Latency comparison against the All Projects path

| Field | Value |
| --- | --- |
| Status | **WAIVED — accepted, unmeasured risk** (user decision, 2026-09-02) |
| Requirement | NFR-MPC-001 |
| Defect classes gated | none (NFR, not a defect class) |

**Not measured.** T-03 needs authenticated requests against Dev; the Dev base URL is not in the repo (only
`environment.example.ts` with `localhost`) and the Leader holds no Dev bearer token. A ready-to-run script was
prepared (same page size on both paths, one untimed warm-up per path, three timed runs each, all six figures
printed rather than an average) and offered for the user to run with the token kept out of the conversation.
The user elected to accept the risk instead.

**The argument for accepting it — recorded so it can be re-examined, not to make the risk disappear:**

- The un-scoped counting expression is **not new code**. It is exactly what `getContracts` already emits when
  `user` is `null` — the All Projects path — which runs in production today at the same page size (design
  §2.2). The fix makes `current-user=true` emit the same string that `current-user=false` has always emitted.
- So the shape being worried about is already in production and has produced no reported latency complaint.

**What that argument does NOT cover, stated plainly (KZ-017):**

- All Projects and My Projects do not execute the *same* query. My Projects additionally carries the
  visibility clause and the carnet join, so its plan may differ and the removed predicate may have been doing
  more selective work there. "All Projects already runs it" is an argument about the *expression*, not about
  the *plan*.
- The counting subquery lost a selective predicate on a query users hit constantly, and the round-1 judgment
  established `result_counts` is emitted on **every** `getContracts` call, not only when
  `with-indicators=true`. That is why this was given its own task rather than a measure-only-if-reported
  clause — and waiving it returns the spec to the weaker posture the judgment deliberately rejected.

**Disposition: NFR-MPC-001 is UNVERIFIED and accepted.** It is not satisfied, not measured, and must not be
reported as either. If My Projects latency is reported as degraded, this task is the first thing to run — the
script and its reading criteria (spread within a path exceeding the difference between paths ⇒ inconclusive)
are specified in `tasks.md` T-03.

#### Coverage floor — verified (closes `tasks.md` §8)

Run in isolation, nothing else active:

```
All files                    |   84.18 |     76.3 |   84.55 |   84.22 |
Test Suites: 338 passed, 338 total
Tests:       2418 passed, 2418 total
exit=0
```

84.18% statements against the 60% global threshold; the command exits `0`, so no threshold was breached.

**Scope of this check (KZ-017):** `npm run test:cov` runs the unit config only (`rootDir: src`). It does not
execute `test:e2e` or `test:integration`, so this figure is the unit-suite coverage floor and nothing else.
That is the threshold `tasks.md` §8 names, so the box is satisfied — but the number should not be read as
whole-repository coverage.
