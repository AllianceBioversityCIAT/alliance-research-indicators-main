# Validation Report — Innovation Use / Required-field semantics and green check

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-required-fields/` |
| Spec id | `2026-09-innovation-use-required-fields` |
| Validated | 2026-09-09 |
| Validator | Claude Opus 5 (T3 Auditor) |
| Author ≠ auditor | **Satisfied for the spec's own tasks** — T-01…T-21 were implemented by `akili-implementer` (T2 · sonnet) and reviewed by `akili-reviewer` (T3 · opus). **Declared conflict:** the six `quick/innovation-use-*` changes of 2026-09-08 (§8.3) were written by this validator. Findings about them are self-audit and should be re-checked by another reader. |
| Evidence base | `execution.md` §1.2 status board · independent re-measurement (§5) · independent execution of the fixture suites against real MySQL (§9) |
| `test-report.md` | **Absent.** Coverage derived directly per the user's ruling 2026-09-09. Recorded as `WARN-4`. |

---

## 2. Summary

**Verdict: NOT archive-ready. One FAIL, six WARN, zero code defects found.**

The implementation is materially complete and its central claim — green-check parity — is **independently confirmed**: 39 executed truth-table cases and a 42-type catalog enumeration passed against real MySQL during this validation, not merely as a recorded PASS. No functional defect was found in any of the 17 requirements.

What blocks the archive is **not code**. It is one product approval that the deploy overtook (`RB-1`), plus a task (`T-16`) that is still `[ ]` because two of its four gates are human-observation gates that this validator structurally cannot run.

**This validation moved the state forward on one item:** `T-16` **gate 2 is now discharged** (§5.2) with attribution evidence it previously lacked.

| Dimension | Result |
| --- | --- |
| Task completion | **WARN** — 20 / 21 `[x]`; `T-16` `[ ]` (2 of 4 gates open, down from 3 by this report) |
| File existence | **PASS** |
| Build integrity | **PASS** — client + server suites, builds and lint gates all green |
| Requirement coverage | **PASS** with 3 WARN — 17/17 requirements have code and test evidence |
| Code quality / 4R | **PASS** with 2 advisory |
| Design conformance | **PASS** — including the `DD-10` supersession this spec owed `docs/ux-ui/design.md` |
| Test evidence | **PASS** — strongest in the family; `test-report.md` missing (`WARN-4`) |
| Guide / constitution | **WARN** — `AGENTS.md` has drifted from `CLAUDE.md` (`WARN-6`) |

---

## 3. Task Completion

Source: `execution.md` §1.2, cross-checked against `tasks.md` and the git history. `tasks.md` carries no per-task checkbox by design — its `Status` field is document-level and the §1.2 board is the per-task record. **That is a declared convention, not drift.**

| State | Count | Tasks |
| --- | --- | --- |
| `[x]` complete, Reviewer PASS | **20** | T-01 … T-15, T-17 … T-21 |
| `[ ]` pending | **1** | **T-16** — client gates |

**Rework history is unusually heavy and fully recorded**, which raises rather than lowers confidence: T-08 reached the 3-attempt ceiling, HALTed, and closed on attempt 4 under an explicit user ruling that lifted the ceiling by one; T-04, T-10 and T-12 closed on attempt 3. Every FAIL, including three the Leader attributed to itself, is in the log.

### T-16 — gate-by-gate, restated after this validation

| Gate | Recorded state | State after this validation |
| --- | --- | --- |
| 1 — full client suite | ✅ 317 suites / 6885 tests | ✅ **PASS** — re-measured 2026-09-09: **317 suites / 6894 tests / 0 failed** |
| 2 — normalized `tsc -p tsconfig.spec.json` set diff | ❌ never run as T-16's gate | ✅ **PASS — discharged here.** See §5.2 |
| 3 — human browser check, light theme | ⚠️ performed, field list not recorded | ⚠️ **WARN-1** — QA sign-off strengthens it materially but does not meet the recorded-field-list requirement |
| 3b — one dark-theme look at `app-input` `helperText` | ⚠️ unconfirmed | ⚠️ **WARN-2** — still unconfirmed |
| Gate 3's own falsifier | never observed failing | **Accepted gap** — the code is deployed; reverting a `[style]` binding in production to prove the gate is load-bearing is no longer practical. Correctly recorded as accepted rather than pending. |

---

## 4. File Existence

Every file the spec declares exists and is committed. The changed set was derived from the git history rather than from `design.md`'s prose tree, because that tree's paths are not machine-extractable (advisory `ADV-2`).

| Surface | Files | State |
| --- | --- | --- |
| Client — innovation-use | 3 components × (`.ts`/`.html`/`.spec.ts`) | ✅ present |
| Client — shared | `input`, `quantification-item` × 3 · `get-innovation-use-details.interface.ts` | ✅ present |
| Server — migration | `1787280000000-updateInnovationUseValidation.ts` + its `migration-specs` sibling | ✅ present |
| Server — fixtures | `innovation-use-validation`, `institution-type-subtype-catalog-equivalence`, `nest-harness` | ✅ present |

---

## 5. Build Integrity

All gates run 2026-09-09 in a quiet tree with no delegated agent active (root `CLAUDE.md` concurrency rule).

### 5.1 Measured

| Gate | Command | Result |
| --- | --- | --- |
| Client suite | `npm test -- --silent` | ✅ **317 suites / 6894 tests / 0 failed** |
| Client build | `npx ng build --configuration development` | ✅ bundle complete, `strictTemplates` valid |
| Client lint | `npx eslint <changed paths>` | ✅ exit 0 — bare `eslint`, **never** `npm run lint` (it carries `--fix`; `K-001`) |
| Server suite | `npm test -- --silent` | ✅ **356 suites / 2744 tests / 0 failed** |
| Server build | `npm run build` | ✅ `nest build` + `vite build` clean |
| Server lint | `npx eslint <migration + spec>` | ✅ exit 0 |
| **Fixtures (real MySQL)** | `npm run test:fixtures` | ✅ **18 suites / 122 tests / 0 failed** — see §9 |

### 5.2 T-16 gate 2 — discharged, with attribution

`DC-8`'s target is a stale TypeScript reference in a spec file that `ng build`, `eslint` and `ts-jest` all structurally miss. The gate was never run as T-16's own.

Run here: `npx tsc -p tsconfig.spec.json --noEmit`, positions stripped, set-deduplicated, over this spec's five touched client spec files. Tripwire: **934 total diagnostics** project-wide — a real diagnostic run, not a `K-004` parse-abort collapse.

| File | Distinct diagnostics | Attribution |
| --- | --- | --- |
| `innovation-use-actor-item.component.spec.ts` | 0 | — |
| `innovation-use-details.component.spec.ts` | 0 | — |
| `input.component.spec.ts` | 0 | — |
| `quantification-item.component.spec.ts` | 1 (`TS2552` ×5 raw) | **Pre-existing** — documented verbatim in `client/.../src/CLAUDE.md` (the file imports `SimpleChange`, not `SimpleChanges`) |
| `innovation-use-organization-item.component.spec.ts` | 1 (`TS2741`, `added` missing on `GetInstitution`) | **Pre-existing** — the fixture at those lines was last written by `d0418ef6` (`details-page` T-06, now archived), and `added` has been on `GetInstitution` since `c0645b58` |

**Zero diagnostics attributable to this spec. Gate 2 = PASS.**

Attribution was established at source rather than by a before/after count, which the child guide warns cannot distinguish *unchanged* from *one fixed and one introduced*.

### 5.3 What these gates cannot reach (`KZ-017`)

- `npm test` uses `rootDir: src`. **`test:e2e` and `test:integration` were not run** and are outside this spec's declared surface.
- jsdom paints nothing. **No gate in this repo can observe a painted border, colour or line-height** — this is `DC-1`, which the spec accepts and substitutes with T-16 gate 3.
- The fixture suites run against the **disposable scratch schema**, not the shared Dev database. They prove the function's logic; they say nothing about Dev's or Production's data.
- The shared Dev database (`192.168.20.210:3306`) was **unreachable from this machine** (`ETIMEDOUT`, no VPN). Migration state there is taken on the owner's report (§7, `T-20`).

---

## 6. Requirement Coverage

All 17 functional requirements and 3 NFRs have code and test evidence. Coverage was derived directly (no `test-report.md`), so the table names the evidence rather than citing a matrix.

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| `R-IUR-001` conditional per-row validation | **PASS** | Truth-table F17, F43 (zero rows ⇒ 1) + client specs |
| `R-IUR-002` no auto-seeded actor row | **PASS** | T-11; **AC.4 verified here** — `docs/ux-ui/design.md:560` marked `SUPERSEDED 2026-09-04`, decisions-log entry at `:563` names the superseding spec and reason |
| `R-IUR-003` one visual treatment | **WARN-1** | Code + class-presence tests present; AC.5 (human browser check) is T-16 gate 3 |
| `R-IUR-004` disaggregated counts | **PASS** | F20 (0/5/0/0 ⇒ 1), F21 (all zeros ⇒ 0), **F21b** (one NULL, positive sum ⇒ 0 — the only case isolating the fill conjunction from the sum) |
| `R-IUR-005` aggregate count | **PASS** | F9, F22 |
| `R-IUR-006` known path institution | **PASS** | F23, F24 |
| `R-IUR-007` unknown path type | **PASS** | F25 |
| `R-IUR-008` sub-type conditional | **PASS** | F27, F28, F29, F42 + **T-14 enumeration: 42 types, 0 divergences**, and the naive-`EXISTS` mutation reddens on exactly the 8 predicted codes `[38,41,44,47,51,55,58,61]` |
| `R-IUR-009` unknown path count | **PASS** | F30, F31 |
| `R-IUR-010` measures | **PASS** | F33, **F34** (`0` ⇒ 0), **F35** (`-5` ⇒ 1 — the `≠ 0` not `> 0` correction), F36, F37, F38 |
| `R-IUR-011` remove "at least one actor" | **PASS** | F17 (inverted from the retired rule 13, exactly as T-18 warned); **AC.4 verified here** — the migration DROPs/CREATEs only `innovation_use_validation` |
| `R-IUR-012` green check parity | **PASS** | **39 executed cases, real MySQL, re-run by this validator.** AC.3 append-only and AC.4 `down()` verified at source |
| `R-IUR-013` shared components opt-in | **PASS** | **Figure verified here:** exactly **18** templates contain `<app-input`, **3** changed, **15** untouched; **0** inline templates, so the `.html` sweep is complete |
| `R-IUR-014` no silent data loss | **PASS** | T-13 attempt 2, 8 mutations with reds observed; AC.7's "no unmarked drop path" reasoned per row type |
| `R-IUR-015` toggle clears the leaving path | **PASS** | T-10, both directions clear to explicit `null` |
| `R-IUR-016` custom name non-blank | **PASS** | F18, F19 |
| `R-IUR-017` used type not selectable | **PASS** | T-21, rendered-overlay assertions rather than the derived array |
| `NFR-IUR-001` deployment safety | **WARN-3** | Migration applied by the owner; not verifiable from here |
| `NFR-IUR-002` a11y of the required signal | **WARN-5** | Glyph-not-colour satisfied; the inherited `--ac-warning-1` AA failure is widened |
| `NFR-IUR-003` draft saves stay permissive | **PASS** | The T-13 Pivot removed every client gate; nothing left to except |

### Negative constraints and strict validations

Every `BUT it must NOT` / `AND IT MUST` clause in §5 traces to an executed case. The three most load-bearing are all discharged by **execution**, not string-matching, which is what `DC-4`/`KZ-017` demanded:

- `R-IUR-012`'s "must NOT be verified by asserting on the SQL string alone" → 39 executed cases.
- `R-IUR-008` AC.4's "enumeration, not sampling, against the predicate's real source" → 42/42 with a working falsifier.
- `R-IUR-010`'s "reject `0`, accept negative" → F34/F35 as a discriminating pair.

---

## 7. Findings

### FAIL-1 — `RB-1` sign-off gate was crossed by the deploy

`tasks.md` §6 records `RB-1` as *"open — blocks PR 2 merge"*, and the Done-definition carries *"RB-1 signed off by MEL / the product owner before PR 2 merges"*. **PR 2 is merged, its migration is applied, and the sign-off has not happened.**

**This is not a code defect.** The code and the migration are correct and proven. It is a product decision now live in testing without the approval the spec attached to it:

- **`RSK-1`** — the submit gate is now **strictly weaker**: a result with no content at all is submittable, because `R-IUR-011` removed the zero-actor backstop. Deliberate (`D-1`), but MEL sign-off was its condition.
- **`RSK-2`** — **result `33544` passed the green check on 2026-09-07 and does not now.** No backfill by design; existing rows are re-graded silently.

**Aggravating:** the population MEL would sign against was measured on a **7-result Dev database (3 passing)**. It cannot support a Production-covering sign-off. If Production holds materially more Innovation Use results, the rule-by-rule distribution is unknown.

**Remediation:** a human action, not a code change — MEL / product owner signs off, or explicitly waives, with the Dev-sample limitation stated. Closing this is not a validator or Leader action.

### WARN-1 — T-16 gate 3: QA sign-off is strong but does not meet the recorded requirement

Two QAs reviewed the module in testing and approved the whole development (user report, 2026-09-09). That is materially stronger evidence than the earlier *"todo se ve bien"*.

It still does not close the gate **as written**: T-16 requires the checked fields **named in words**, and calls out specifically the **three `p-select` amber borders** on the organization card (`Organization type`, `Organization` on the known path, `Sub-type`) — the Leader added these after finding they had no paint owner at all. `DC-1` is explicitly substituted by this gate, so an unnamed pass leaves the substitution unfulfilled.

**Remediation (cheap):** ask the two QAs whether those three borders were among what they checked and record the answer. If yes, gate 3 closes on existing work.

### WARN-2 — T-16 gate 3b: dark theme unconfirmed

T-02's only behavioural change is `--ac-grey-600` resolving to `#949494` under `[data-theme='dark']` — the one change T-02 makes falls in the only theme gate 3 was scoped to skip. One look at an `app-input` carrying `helperText` in dark mode closes it.

### WARN-3 — `NFR-IUR-001` / `T-20`: migration state not independently verified

The owner applied all pending migrations on 2026-09-07 and **confirmed this again directly on 2026-09-09**, adding that the deploy pipeline also applies pending migrations. That second claim **contradicts `K-015`** in root `CLAUDE.md`, which records the opposite from a 2026-08-18 measurement (`8431dc4b` sat 4 days across several deploys).

Neither claim was verifiable here — Dev is unreachable without VPN, and inferring "unapplied" from a failed connection is the confident-zero error `K-014` names.

**Remediation:** whichever is true, one document is wrong. Either `K-015` is stale and should be corrected, or the pipeline does not apply migrations and the current belief is unsafe. This is worth settling once, in `CLAUDE.md`, because every future spec's deployment reasoning depends on it.

### WARN-4 — no `test-report.md`

`/akili-test` never produced one, so this validation derived coverage directly. That worked — the evidence is unusually strong — but it means no requirement-to-test matrix exists as a durable artifact, and the next reader must re-derive what §6 above assembled.

### WARN-5 — `NFR-IUR-002`: the amber AA exception is widened

`--ac-warning-1` fails WCAG AA in both themes (light 2.09:1 / 2.25:1). This is an accepted, user-owned exception inherited from `changes/innovation-use-validation-warning-color` (`RB-1`/`RB-5` there). This spec **widens its surface** to roughly a dozen new fields without re-opening it — which the spec states plainly. Recorded so the widening is visible at archive time rather than discovered later.

### WARN-6 — `AGENTS.md` has drifted from root `CLAUDE.md`

Both are constitutional baseline files that agents read. `AGENTS.md` is missing **K-004/KZ-014**, **K-016** and **KZ-017** entirely, and carries superseded text for **K-015** and **K-014**.

This is outside the spec's scope but inside this validation's Phase 6 remit, and it matters: an agent that loads `AGENTS.md` instead of `CLAUDE.md` operates without three of the repo's Kaizen rules — including `KZ-017`, which this very spec leans on in five places. Route to `/akili-archive`'s Constitution & Graph Sync.

---

## 8. Code Quality & Design Conformance

### 8.1 Advisory (4R — non-gating)

| ID | Lens | Finding |
| --- | --- | --- |
| `ADV-1` | Readability | `test/jest-fixtures.json` carries a `_comment_maxWorkers` key to document why `maxWorkers: 1` exists. Jest rejects unknown options, so **every fixture run prints a validation warning** — noise on a gate that must stay readable. `maxWorkers: 1` itself **is** correctly set (verified); the serialisation fix is live. A `.js` config with a real comment, or the note living in the spec docs, removes the warning. |
| `ADV-2` | Readability | `design.md`'s file tree is not machine-extractable — a path grep over it yields fragments (`alidation.ts`, `/innovation-use-validation.fixture-spec.ts`). Validation had to derive the changed set from git instead. Harmless here; it makes every future file-existence check manual. |
| `ADV-3` | Resilience | `npm run migration:test:bootstrap` is **not idempotent**: a second run against an already-bootstrapped scratch schema fails with `Table 'clarisa_innovation_use_levels' already exists`, because `baseline:test:load` re-runs while the migrations do not. **This validator initially mis-read that as a baseline/migration drift defect and was wrong** — a clean teardown, fresh container and single run exits 0. A reset guard or a one-line note in the script would have prevented the misdiagnosis. |

### 8.2 Design conformance

| Check | Result |
| --- | --- |
| Cross-document figure check | **PASS** — the `18 templates / 15 untouched` figure (corrected from a wrong "17" in three documents at Judgment Day round 1) is **independently confirmed correct** |
| `DD-10` supersession owed to `docs/ux-ui/design.md` | **PASS** — recorded at `:560` and `:563` |
| Migration append-only | **PASS** — one new file; no prior migration edited; the original `1787078283929-createInnovationUseValidation.ts` has exactly one commit in its history |
| Proposal intent / non-goals | **PASS** — `D-1` (weaker gate) and `D-2` (known-path institution) are user rulings recorded in both proposal and requirements |
| Two documented reversions | **PASS** — `R-IUR-002` and `R-IUR-011` each carry the "why this is a reversion" narrative the methodology asks for |

### 8.3 Post-QA drift introduced by this validator — declared

Six `quick/innovation-use-*` changes landed on 2026-09-08 and are in the deployed build the QAs reviewed. They are logged in `docs/specs/quick/quick-log.md`, not in this spec. Two carry consequences that belong in this report because they touch surfaces this spec owns:

| Quick change | Consequence |
| --- | --- |
| `quick/innovation-use-banner-body-grey-700` | Introduces **two new WCAG AA exceptions** — `--ac-grey-700` at **3.91:1** on `--ac-grey-100` and **3.51:1** on `--ac-grey-200`, against the 4.5:1 that `R-IUP-020` AC.6 / `NFR-IUP-001` require. Recorded only in the quick-log. Related to `WARN-5` but **separate from it** — a different token, a different surface, a different decision. |
| `quick/innovation-use-evidence-callout-gating` | **Reverses `R-IUP-021` AC.5** of the archived `details-page` spec. The archived requirement now contradicts shipped code, and the reversal is recorded only in the quick-log. |

Neither is a defect in *this* spec. Both are **constitutional drift that `/akili-archive` should reconcile**, and both were authored by this validator, so a second reader should confirm the characterisation.

---

## 9. Test Evidence Summary

Re-executed by this validator on 2026-09-09 against a freshly bootstrapped disposable MySQL 8.0 scratch schema (`compose:test:down` → `up` → `migration:test:bootstrap`, exit 0 on an empty database).

| Suite | Result |
| --- | --- |
| **All fixtures** | ✅ **18 suites / 122 tests / 0 failed** |
| `innovation-use-validation.fixture-spec.ts` (T-19 truth table) | ✅ **39 cases / 0 failed** — F1…F43, every rule 1–11 with a pass and a fail case, plus soft-delete (F32/F39), NULL-mode routing (F40/F41), collation (F38) and the signed-decimal pair (F34/F35) |
| `institution-type-subtype-catalog-equivalence.fixture-spec.ts` (T-14) | ✅ 42 types, **0 divergences**; naive-`EXISTS` mutation diverges on exactly the **8** predicted codes |
| `innovation-dev-validation-unchanged.fixture-spec.ts` | ✅ — discharges `R-IUR-011`'s "must leave `INNOVATION_DEV` untouched" |

**This is the strongest evidence in the family**, and it is what upgrades `R-IUR-012` from a recorded PASS to an independently confirmed one. T-14's mutation reddening on precisely the predicted codes is a working falsifier observed failing — `K-004` satisfied by observation, not assertion.

Flakiness: `FP-51`'s serialisation fix (`maxWorkers: 1`) is live and effective — **zero spurious failures across four runs** in this session, against 3-in-9 before the fix.

---

## 10. Agent Guide / Constitution Impact

| Item | State |
| --- | --- |
| `## Constitution Impact` notes in `execution.md` | None recorded — no module boundary or public surface moved |
| Child guides (`server/.../src/CLAUDE.md`, `client/.../src/CLAUDE.md`) | Present, not stale for this spec's surfaces |
| Parent `## Module Guides` index | Present and correct |
| **`AGENTS.md` vs `CLAUDE.md`** | ⚠️ **Drifted — `WARN-6`.** Route to `/akili-archive` |
| CodeGraph | Root `.codegraph/codegraph.db` reflects the last re-index, not this working tree — re-index at archive |

---

## 11. Remediation

| # | Item | Type | Owner | Blocks archive |
| --- | --- | --- | --- | --- |
| 1 | `RB-1` — MEL / product-owner sign-off on `RSK-1` + `RSK-2`, with the 7-result Dev sample limitation stated | Product approval | MEL / product owner | **Yes** |
| 2 | T-16 gate 3 — record which fields the QAs checked, specifically the three `p-select` amber borders | Evidence capture | D. Casañas / QA | **Yes** |
| 3 | T-16 gate 3b — one dark-theme look at an `app-input` `helperText` | Human check | D. Casañas | **Yes** |
| 4 | Flip `T-16` to `[x]` once 2 and 3 land (gates 1 and 2 are green) | Bookkeeping | Leader | **Yes** |
| 5 | Settle `K-015` vs the pipeline's actual migration behaviour in `CLAUDE.md` | Doc correction | D. Casañas | No |
| 6 | Sync `AGENTS.md` with `CLAUDE.md` | Doc correction | `/akili-archive` | No |
| 7 | Reconcile the two quick-change drifts in §8.3 against the archived specs | Doc correction | `/akili-archive` | No |
| 8 | `ADV-1` — remove the `_comment_maxWorkers` warning | Cleanup | Optional | No |
| 9 | `ADV-3` — add a reset guard or note to `migration:test:bootstrap` | Cleanup | Optional | No |

Items 5–9 are follow-ups, not conditions. **Only items 1–4 stand between this spec and archive, and only item 1 needs a decision rather than a measurement.**

---

## 12. Archive Readiness Recommendation

**NOT READY — three conditions, none of them code.**

| Criterion | Met |
| --- | --- |
| All required tasks `[x]` | ❌ T-16 `[ ]` |
| No unresolved FAIL | ❌ `FAIL-1` (`RB-1`) |
| WARN accepted or has follow-up | ✅ all six have named owners |
| Tests cover key requirements and scenarios | ✅ independently confirmed |
| Drift reflected in docs or execution notes | ✅ — including the reversions and the `RB-1` breach, which the Leader recorded rather than let pass |
| User reviewed the validation summary | ⏳ this document |

**Read this verdict correctly.** The engineering is done and proven to a standard well above this repo's norm: a 39-case executed truth table, a 42-type enumeration with a working falsifier, and every rework FAIL — including the Leader's own three — recorded rather than quietly closed. Nothing here suggests the code should not ship; it already has.

What remains is a **product approval that the deploy overtook** and **two human observations nobody has written down**. Once `RB-1` is signed or waived and T-16's two gates are recorded:

```text
/akili-archive changes/innovation-use-required-fields
```
