# Tasks — bilateral / CLARISA ↔ AGRESSO Auto-Mapper (S2)

- **Module:** bilateral — server + client
- **Spec id:** 2026-08-clarisa-automapper-s2
- **Status:** not-started
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked design:** [./design.md](./design.md)
- **Last updated:** 2026-08-19
- **Budget (design §14):** 7 tasks · ≈ 620 LOC · 2 review rounds · **2 PRs**

---

## 1. Dependency graph

```
T-00 migration ─────────────────────────┐
                                        ▼
T-01 strip (S1)──► T-02 resolve ──► T-03 classify+apply ──► T-05 controller ──┐
                          │                                                    ├──► T-06 client
                          └──────────► T-04 coverage ────────────────────────┘
```

`T-00` and `T-01` are independent and may run in parallel. Everything else is sequential on the chain shown.

---

## 2. Task list

### T-00 — Migration: add a non-AI `source` value

- **Requirements:** NFR-CAM-004
- **Design:** §3, DD-2
- **Files:** `src/db/migrations/<timestamp>-addAutoMappingSource.ts`
- **Skills:** `nestjs-expert`
- **Effort:** S · **Status:** ✅ **done** — Reviewer `STATUS: PASS` 2026-08-19 (see `execution.md`)

**Scope.** Add one value to the `bilateral_project_mapping.source` enum for automatically derived rows. `MANUAL`, `AI_SUGGESTED`, `AI_AUTO` are untouched — the latter two become **reserved** for a future inferential matcher.

**Notes.**
- No new column. **No backfill** — all 5 existing rows are `MANUAL`.
- ⚠️ **In a migration passing no parameters, never let a `?` or `:word` appear in the SQL — including inside a comment.** `namedPlaceholders: true` makes mysql2 consume it as a bind parameter and the call throws before MySQL parses it. Drop colons in bracketed refs and end comment questions with a period.
- Update the enum in `enum/mapping-source.enum.ts` in the same task, or the migration and the TypeScript disagree.

**Verification.**
```
# Run against the on-premise Dev database. There is no local DB in this project.
# Route decided by the user 2026-08-19, overriding the Leader's container proposal.
#
# PRE-FLIGHT (read-only) — run this FIRST and read it before anything else.
# migration:dev:execute applies EVERY pending migration, not only this one.
#   npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts
# Strip ANSI before counting, or `grep '^\[ \]'` silently matches nothing (K-014):
#   ... | sed -E 's/\x1b\[[0-9;]*m//g' | grep -c '^\[ \]'
# Measured 2026-08-19 by the Leader: 307 applied, exactly 1 pending (this one).
# If the pending count is ever > 1, STOP and escalate — you would be applying
# someone else's unmerged-but-unapplied schema change (K-015).

cd server/researchindicators
npm run migration:dev:execute   # forward  -> applies this migration to Dev
npm run migration:revert        # reverts it (it is the last applied)
npm run migration:dev:execute   # forward again -> leaves Dev in the applied state

# The revert is the reversibility proof, not the end state. Dev must be left
# WITH the enum value: the pipeline deploys code, not migrations (K-015), so
# this hand-applied step is what actually ships the schema change to Dev.
npx eslint src/db/migrations/<file> src/domain/entities/bilateral-project-mapping/enum/mapping-source.enum.ts
```
**Named failing input:** put `?` in a comment inside the migration → it throws *"Named query contains placeholders, but parameters object is undefined"* before reaching MySQL.

**What disqualifies this evidence.** A migration that is lint-clean and type-clean but **never executed** proves nothing — one shipped unrunnable and passed every static gate this repo has (K-006). **Running it is the only gate.** Do not report this task done on a build alone.

**Done check.**
- [x] `migration:show` pre-flight run and read before any write; pending count confirmed as exactly 1 (ANSI-stripped, exit-checked — K-014)
- [x] Migration applies forward, reverts, and re-applies cleanly against **Dev** — all three observed with transaction boundaries and exact `ALTER TABLE` text. `down()` is proven by **execution**, not by symmetry (K-006). The revert step was run by the user directly, after the Implementer session's permission classifier denied it
- [x] Dev left in the **applied** state — re-measured after the full cycle: **308 applied, 0 pending** (K-015: the pipeline ships code, not migrations, so this hand-run is what put the schema change on Dev)
- [x] `mapping-source.enum.ts` carries `DERIVED`. No entity edit needed — the column declares `enum: MappingSourceEnum` by reference and `orm.config.ts` sets `synchronize: false`
- [x] `AI_SUGGESTED` / `AI_AUTO` unchanged and unwritten — Reviewer confirmed the only `source` write in the repo is `bilateral-project-mapping.service.ts:133` (`dto.source ?? MANUAL`)
- [x] No `?` or `:word` anywhere in the migration, comments included — verified by the Implementer, re-verified independently by the Reviewer on disk, and re-checked by the Leader after the comment edits. **Falsifier observed:** injecting ` -- why?` threw `Named query contains placeholders…` with `ROLLBACK`, exit 1 (K-004)

---

### T-01 — The single normalization: `normalizeExternalCode` (S1, shipped)

- **Requirements:** R-CAM-001 AC.1; NFR-CAM-003
- **Design:** §2.2, DD-1, **DD-9**
- **Files:** `…/bilateral-project-mapping/utils/external-code.util.ts` (+ spec)
- **Skills:** `nestjs-expert`, `tdd`
- **Effort:** S · **Status:** ✅ **done** — Reviewer `STATUS: PASS` 2026-08-19 (see `execution.md`)

**Scope.** ⚠️ **Amended 2026-08-19 (DD-9, user-approved before dispatch) — this task writes NO new function.** S1 already shipped the strip: `normalizeExternalCode()` in `…/utils/external-code.util.ts`, removing **exactly one** leading prefix from the **closed set `{B-, C-}`**, at most once, after trim + upper-case. A prefix outside the set (`A-`, `X-`) passes through **unchanged** — deliberate, per S1 DD-4, so an unresolved code never becomes a silent false-positive match.

The work is therefore: **confirm the shipped strip satisfies R-CAM-001 AC.1 and NFR-CAM-003, and extend `external-code.util.spec.ts` with the named inputs below.** Do **not** add `stripCentrePrefix`; do **not** change `normalizeExternalCode`'s behaviour. A second strip in that file is the exact NFR-CAM-003 violation this spec exists to prevent.

**Named inputs (K-012).**

| Input | Output | Why it falsifies something |
| --- | --- | --- |
| `C-D514` | `D514` | the happy path |
| `B-A1080` | `A1080` | the second member of the closed set |
| `D514` (no prefix) | `D514` | over-stripping reds here |
| `C-D-514` (second hyphen) | `D-514` — only the **first** prefix goes | strip-at-most-once |
| `''` / null | `''` | null-safety |
| **`A-1234`** (prefix outside the closed set) | **`A-1234` — unchanged** | **the closed set itself.** An open `[A-Za-z]-` strip returns `1234` and this assertion reds. Without this row the suite cannot tell the two designs apart (KZ-001) |
| `  c-d514  ` (whitespace + lower case) | `D514` | trim + upper-case are part of the shipped contract |

**Verification.** `npx jest …/external-code.util.spec.ts --silent` · `npx eslint <files>`
**Named failing input:** widen `KNOWN_CENTRE_PREFIXES` to an open `[A-Za-z]-` regex → the `A-1234` pass-through assertion reds. Strip two characters instead of one → the no-prefix case breaks.

**What disqualifies this evidence.** A test suite that only feeds `B-`/`C-` codes cannot detect over-stripping **or** distinguish the closed set from an open one — the no-prefix, second-hyphen and **`A-1234` pass-through** rows are the ones that falsify it. Their absence makes the suite decorative (KZ-001).

**Done check.**
- [x] All seven named inputs asserted — **three verbatim** (`B-A1080`, `C-D-514`, `''`/null), **four via behaviorally equivalent inputs already in the file** (`C-A132` for `C-D514`, `A1463` for `D514`, **`A-AG10156` for `A-1234`**, `' c-a132 '` for `'  c-d514  '`). `normalizeExternalCode` is a pure string function whose branch selection does not depend on the payload after the prefix, so each substitute exercises an identical path — no coverage gap, and adding the literals would duplicate existing paths (Reviewer-verified). `A-AG10156` is an upgrade on the synthetic `A-1234`: it is the real AfricaRice code this spec family already names
- [x] `grep` finds exactly one strip definition repo-wide — `normalizeExternalCode` at `external-code.util.ts:27` — and no `stripCentrePrefix`. **Reviewer widened this beyond a name/signature grep**, sweeping both packages for `replace(/^…`, `.slice(2)`, `.substring(2)`, `startsWith('B-'|'C-'|'A-')`, `[A-Za-z]-`: no competing strip exists (NFR-CAM-003 closed by evidence)
- [x] `normalizeExternalCode`'s behaviour unchanged — `external-code.util.ts` byte-identical to HEAD, confirmed by the Leader after the falsifier probe was reverted
- [x] eslint clean · targeted jest 21/21 · falsifier probe observed RED (2 failed) then green again

---

### T-02 — Resolution, ambiguity, and the environment guard

- **Requirements:** R-CAM-001 (both scenarios; AC.2, AC.3, AC.4); NFR-CAM-001
- **Design:** §5 steps 1–5, DD-1, DD-4
- **Dependencies:** T-01
- **Files:** `…/automapper.service.ts` (+ spec), fixtures
- **Skills:** `nestjs-expert`, `systematic-debugging`, `tdd`
- **Effort:** M → raised to `high`, then `xhigh` for the rework · **Status:** ✅ **done** — Reviewer `STATUS: PASS` on attempt 2 of 3 (see `execution.md`)

**Scope.** Load the eligible cohort **using the shipped predicates**, derive contract ids, group them, look them up in AGRESSO, and classify into `toCreate` / `ambiguous` / `unresolved`. No writes in this task.

**Notes.**
- ⚠️ **Iterate projects, not contracts** (R-CAM-001's `AND IT MUST`). Contract-first is the framing this spec replaced.
- ⚠️ **Reuse `isBilateralFunding` / `isAllianceProject` / `matchesPhase`.** Re-deriving eligibility creates a second definition that will disagree with the picker.
- **No name comparison anywhere** (AC.4). S1 measured `FULL_NAME` at exactly **0** resolutions.
- Ambiguity branch is required **even though the measured feed has zero collisions** (DD-4).
- `unresolved` entries carry the **derived contract id**, not just the project.
- **NFR-CAM-001:** cohort non-empty AND zero projects carrying `external_code` → abort, write nothing, explicit message.

**Verification.**
```
cd server/researchindicators
npx jest …/automapper.service.spec.ts --silent
npx eslint <files>
```
**Named failing inputs:**
- Feed a fixture where two projects derive the same contract id → must land in `ambiguous`, neither in `toCreate`. Remove the grouping step and this reds.
- Feed a cohort with `external_code` stripped from every row → must abort. Remove the guard and it reports "0 to do" instead.

**What disqualifies this evidence.** ⚠️ **Do not assert a hard-coded 198 against a live feed (D-7).** The fixture pins 198/198 because that is what was measured on 2026-08-19; a live run reports whatever it finds. A test that hits the network and expects 198 will pass today and mislead within days — the feed moved 299 → 377 → 911 in five days.

**Done check.**
- [x] Synthetic fixture cohort resolves 198/198 with zero unresolved (D-7: generated locally, no network, labelled synthetic in the file)
- [x] Two-projects-one-contract fixture lands in `ambiguous`, neither in `resolved` — **observed failing** with the grouping step removed (`Expected: [1, 2]` / `Received: []`)
- [x] No-`external_code` cohort aborts (422) with zero writes, proven by `expect(mockDataSource.getRepository).not.toHaveBeenCalled()` — **observed failing** with the guard removed (`Received promise resolved instead of rejected`)
- [x] No name/description comparison — the only contract column selected is `agreement_id`; `clarisaProjectFullName` is written and never read (the display passthrough R-5 requires). Reviewer-confirmed
- [x] Eligibility comes from `ClarisaProjectsService.listBilateralProjects` — zero hits for `isBilateralFunding|isAllianceProject|matchesPhase` in the new service
- [x] No test asserts a fixed count against a live feed
- [x] **AGRESSO existence check is case/whitespace-symmetric** — the FAIL from attempt 1. Fixture `' d514 '` observed RED before the fix and green after; the assertion is conjunctive, reddening if either `trim()` or `toUpperCase()` is dropped
- [x] `is_active` filter asserted — observed reddening when the `andWhere` is removed
- [x] The step-5 bucket is named `resolved`, not `toCreate` — design §4's `toCreate` is the *final* bucket produced after step 6, and reusing the name would invite T-03 to insert a superset (D-3 duplicate rows, D-2 overwritten `MANUAL` rows)
- [x] Full server suite **330 suites / 2365 tests green**; `npm run build` **exit 0** (Leader, quiet window)

---

### T-03 — Classification against existing rows, apply, and supersession

- **Requirements:** R-CAM-003 (scenario + AC.1–AC.3); R-CAM-005 (scenario + AC.1–AC.2); R-CAM-002 `AND IT MUST` (idempotency) + AC.2; NFR-CAM-002; NFR-CAM-004
- **Design:** §5 step 6 table, DD-2, DD-5, DD-7
- **Dependencies:** T-00, T-02
- **Files:** `…/automapper.service.ts` (+ spec)
- **Skills:** `nestjs-expert`, `tdd`
- **Effort:** M → raised to `xhigh` · **Status:** ✅ **done** — Reviewer `STATUS: PASS` on attempt 2 of 3 (see `execution.md`)

**Scope.** For each resolved pair, consult the existing mapping and act per the §5 table. Implement apply.

| Existing row | Action |
| --- | --- |
| none | create, `source` = the new non-AI value, `confidence_score` **null** |
| active, same project | `alreadyMapped`, no write |
| active `MANUAL`, different project | **`divergent` — reported, never touched** |
| active non-`MANUAL`, different project | **supersede**: deactivate + create |

**Notes.**
- ⚠️ **`MANUAL` is immutable to automation.** Not "usually" — never. A divergence is *reported*, because a silent skip and a clean agreement are indistinguishable in the output.
- ⚠️ **Never update `agresso_agreement_id` on an existing row** (R-CAM-005 AC.2). The edit dialog states the contract is immutable after creation; automation inherits it. Supersession is deactivate + create, **two rows**.
- `confidence_score` stays `null` (NFR-CAM-002). A constant `1.0` is worse than empty.
- `source` uses **T-00's new value**, never `AI_*` (NFR-CAM-004).

**Named inputs (K-012).**

| Fixture | Expected |
| --- | --- |
| Existing `MANUAL` row → matcher derives a different project | row byte-identical; entry in `divergent` |
| Existing rows at CLARISA ids 22, 138, 246 (pre-2026) | all three `divergent`, none rewritten |
| `D514 → 1516` (matcher agrees) | `alreadyMapped`, untouched |
| Existing non-`MANUAL` row, different project | two rows after: one inactive, one active |
| Apply the same preview twice | row count unchanged after the first apply |

**Verification.** `npx jest …/automapper.service.spec.ts --silent` · `npx eslint <files>`
**Named failing inputs:** allow writes when `source = MANUAL` → the byte-identity assertion reds. Update the existing row instead of superseding → the two-row assertion reds. Remove the already-mapped skip → the idempotency count doubles.

**What disqualifies this evidence.** A test asserting only that the `MANUAL` row *still exists* is a presence-assertion and proves nothing — it must assert the row is **unchanged**, field by field, including `clarisa_project_id`, `source` and `notes`. "Still there" passes against a row that was rewritten.

**Done check.**
- [x] Every named input asserted. `MANUAL` immutability is a **real field-by-field snapshot**, not a presence assertion — and backed by a stronger proof: `update`, `create` and `save` are the only write calls in `apply()` and all three are asserted `not.toHaveBeenCalled()`
- [x] No code path assigns `agresso_agreement_id` on an update — `.update(` occurs exactly once and its payload is `{ is_active, deleted_at, updated_by }`; the only `agresso_agreement_id` assignment is on a **new** row (R-CAM-005 AC.2)
- [x] No `AI_SUGGESTED` / `AI_AUTO` written — the only hits are comments. Both create paths go through one `newDerivedRow()` hard-coding `source: DERIVED`
- [x] Every created row has `confidence_score` null. **The DTO trap was avoided by bypassing the DTO entirely** — `CreateBilateralProjectMappingDto` requires `confidence_score` when `source !== MANUAL`, and `DERIVED` lands on that side; the matcher writes entities directly, so the validator never fires and the admin contract is untouched
- [x] Idempotency proven by a count before/after a second apply — `apply()` re-runs step 6 **inside the transaction** rather than trusting a caller-supplied classification, which is what design §5 mandates
- [x] **The `is_active` gate on the step-6 read is falsifiable** — the reachable Map collision (an inactive and an active row sharing a contract id after a supersede). Behavioural two-row test observed RED with the `andWhere` deleted. **The mock's `andWhere` had to be strengthened from a no-op stub first**, or the test would not have reddened at all (KZ-001 at the scaffold level)
- [x] `clarisa_project_short_name` stores the **short** name, not the full name — observed RED against the old line
- [x] Full server suite **330 suites / 2379 tests green**; `npm run build` **exit 0** (Leader, quiet window)

---

### T-04 — Coverage computation

- **Requirements:** R-CAM-004 AC.1–AC.3 + its `BUT it must NOT`
- **Design:** §4 (`GET …/coverage`), DD-6
- **Dependencies:** T-02
- **Files:** `…/automapper.service.ts` or a sibling, + spec
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Effort:** S → run at `medium` · **Status:** ✅ **done** — Reviewer `STATUS: PASS` on attempt 1 (see `execution.md`)

**Scope.** Return `mapped`, `pending`, `reachable`. `reachable` = the eligible-project count from the **shipped** predicates.

**Notes.** ⚠️ **No figure may use a contract-table count as a denominator** (R-CAM-004's `BUT it must NOT`). `4/3348` and `4/1545` are both true and both misleading; the 1377 unpaired `BLR` contracts are not pending work and are **not returned at all** (DD-6).

**Verification.** `npx jest <spec> --silent` · `npx eslint <files>`
**Named failing input:** compute `pending` as `contracts − mapped` → the `mapped + pending = reachable` invariant reds.

**What disqualifies this evidence.** Asserting the three numbers individually against a fixture does **not** prove the denominator is right — three hard-coded values agree with themselves. **The invariant is the gate**, and it must be asserted as an invariant.

**Done check.**
- [x] `mapped + pending = reachable` asserted as an invariant (the three constants sit *after* it as corroboration, never as the gate) — F1 observed reddening it. **Note:** the invariant is an arithmetic tautology given `pending = reachable − mapped`; what makes it *sound* is the cohort-scoped, deduped `mapped`, which guarantees `mapped ≤ reachable`
- [x] `reachable` derives from the shipped predicates — the call is character-identical to `resolve()`'s, with no local filtering between it and the count
- [x] No contract count in any returned figure, and no fourth figure exists (DD-6) — F3 observed. `AgressoContract` is never reached from `coverage()`
- [x] **The cohort-scoping `IN (:...ids)` clause is falsifiable** — shape *and* behavioural assertions; deleting the clause drives `pending` to `-1`. Fourth instance of this blind-spot class in the spec, closed rather than recorded
- [x] Zero-cohort returns `reachable: 0` before any query — the test additionally asserts the mapping table is **never queried**, stronger than the done-check asked
- [x] Full server suite **330 suites / 2386 tests green**; `npm run build` **exit 0** (Leader, quiet window)

---

### T-05 — Controller: preview, apply, coverage

- **Requirements:** R-CAM-002 (scenario, AC.1, AC.3, and its `BUT it must NOT` on cron)
- **Design:** §4, §8, DD-3
- **Dependencies:** T-03, T-04
- **Files:** `…/automapper.controller.ts` (+ spec), `dto/automapper-run.dto.ts`
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Effort:** M → raised to `xhigh` · **Status:** ✅ **done** — Reviewer `STATUS: PASS` on attempt 2 (see `execution.md`)

**Scope.** Three endpoints, `@Roles`-guarded to the existing centre-admin gate, Swagger-annotated, standard envelope. The run report carries `external_code`, derived contract id, `full_name` and project id per entry.

**Notes.**
- ⚠️ **No `@Cron` anywhere** — R-CAM-002 forbids scheduling in this version.
- `preview` **writes nothing**; `apply` is the only mutating endpoint.
- Report exposes the four counts (AC.3) and the feed fetch timestamp (§7, K-016 — a run right after a feed change may read a cached cohort).

**Verification.** `npx jest …/automapper.controller.spec.ts --silent` · `npx eslint <files>` · endpoints visible at `/swagger` with the bearer lock
**Named failing inputs:** call `preview` and assert the mapping row count is unchanged — make preview write and it reds. Call as a non-admin role → must be denied.

**What disqualifies this evidence.** A `200` from `preview` proves the route exists, not that it wrote nothing. **The gate is a row count taken before and after**, not the status code.

**Done check.**
- [x] **Preview writes nothing** — asserted as `expect(service.apply).not.toHaveBeenCalled()`, observed red when preview calls apply. ⚠️ **This is a substitution, recorded rather than glossed:** no test in this spec takes a literal row count, which is structurally unavailable in a DB-less suite. What makes it sound is that `preview`'s entire call graph contains **no write method at all**, and the one method that writes is asserted never invoked; T-03 carries the write-side count assertions
- [x] Allowed-role and denied-role both asserted against a **real `Reflector` + real `RolesGuard`** reading the controller's actual decorators — not a double. Removing `@Roles` flips both denied cases
- [x] All three carry `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` (+ `@ApiBody`/`@ApiQuery`) — statically verified. ⚠️ **The `/swagger` render itself is OUTSTANDING**, not claimed: unverifiable in-sandbox. And until the `@ApiResponse` follow-up is taken, a human opening it will see three endpoints with a bearer lock and **no response schemas**
- [x] No `@Cron` in the module — the gate was widened from a 3-file hardcoded list to a directory scan over every non-spec `.ts`, with a `productionFiles.length > 3` assertion so the widening itself is checked
- [x] Report includes the four counts (plus `divergent`/`supersede` as **data**, which R-CAM-003 and R-CAM-005 require and design §4 wrongly described as four — §4 amended) and the feed timestamp
- [x] **`apply` cannot be handed a candidate list** — one-property DTO, `forbidNonWhitelisted`, and `resolved` reaches `apply()` by **object identity** from the in-handler `resolve()`. Observed red when the handler reads a forged body
- [x] **`GET coverage` resolves above `@Get(':id')`** — the test now reads the **real module's** `controllers` array via `Reflect.getMetadata`; swapping the real array was observed returning **400**
- [x] **A client-submitted `source: 'DERIVED'` is rejected** by both create and update DTOs (`@IsNotIn`), observed red with the decorator removed
- [x] **Design §9's log line implemented** — it reached T-05 unassigned, since `tasks.md` §3's coverage table is clause-level for requirements only
- [x] Full server suite **333 suites / 2421 tests green**; `npm run build` **exit 0** (Leader, quiet window)

---

### T-06 — Client: coverage strip and run surface

- **Requirements:** R-CAM-004 AC.4 + its `AND IT MUST` (denominator on screen); R-CAM-002 scenario (preview then apply); R-CAM-003 `AND IT MUST` (divergence visible); R-5 (labels)
- **Design:** §6.1, §6.2, DD-6
- **Dependencies:** T-05
- **Files:** `client/…/bilateral-mapping/` — coverage strip + run surface components (+ specs)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Effort:** M · **Status:** todo

**Scope.** Three-card strip above the existing table, plus the run surface: trigger, preview grouped by bucket, explicit apply.

**Notes.**
- ⚠️ **Print the denominator on screen** — `Coverage 4 / 198 · 2% (eligible CLARISA projects, phase 2026)`. The figure must not be quotable without it.
- ⚠️ **Three cards only.** No fourth card for unpaired contracts (DD-6) — it invites `4 / 1545`.
- **Loading shows a skeleton, never `0`** — a flashed zero reads as "nothing to do".
- Error: the strip reports unavailability **and the table still renders**.
- Empty: `reachable = 0` explains the feed has no eligible projects rather than showing `0/0`.
- **Every project is labelled `short_name — full_name`, never a bare id.** The picker already does this; the table does not (R-5). `full_name` is present on 198/198.
- `ambiguous` and `divergent` list **both candidates** so a human can act; `unresolved` shows the derived contract id.
- Existing utility classes only — no new colour, no new primitive.

**Verification.**
```
cd client/research-indicators
npx jest <specs> --silent --coverage=false      # the flag is mandatory (K-020)
npm run lint -- --quiet
npm run build
```
**Named failing input:** render the strip with `mapped: 4, pending: 194, reachable: 198` and assert the printed denominator string — remove it and the assertion reds.

**What disqualifies this evidence.** ⚠️ **A targeted client jest run without `--coverage=false` exits 1 with every test passing** (K-020, measured). An exit code from such a run is not a signal. And **jsdom cannot evaluate rendered layout or contrast** — the card arrangement and the visual weight of the grey/omitted treatment are **not** covered by any test here. **Substitute: a human look at the screen at the HITL pause.** Record it performed or explicitly outstanding.

**Done check.**
- [ ] The denominator string is asserted, not just the numbers
- [ ] Exactly three cards; no unpaired-contract figure anywhere in the component
- [ ] Loading, error and empty states each asserted
- [ ] Labels use `short_name — full_name`; no bare id in the run surface
- [ ] `ambiguous` and `divergent` show both candidates
- [ ] `npm run build` exit 0 (new client code is not type-checked by jest or ng lint — K-002)
- [ ] Visual check performed **or** explicitly recorded as outstanding

---

## 3. Coverage closure

Clause-level. Each row quotes the clause it claims.

| Requirement | Clause | Owner |
| --- | --- | --- |
| R-CAM-001 | THEN derive contract id from `external_code` | T-01, T-02 |
| R-CAM-001 | AND confirm the contract exists before proposing | T-02 |
| R-CAM-001 | **BUT NOT** infer from names | T-02 (grep gate) |
| R-CAM-001 | **AND IT MUST** iterate projects, not contracts | T-02 |
| R-CAM-001 | THEN unresolved → no mapping; AND reported with derived id; **BUT NOT** silently dropped | T-02 |
| R-CAM-001 | AC.1 strip (closed set `{B-, C-}`, DD-9) · AC.2 198/198 · AC.3 ambiguity · AC.4 no name match | T-01, T-02 |
| R-CAM-002 | THEN preview reports without writing; AND apply is separate | T-05 |
| R-CAM-002 | **BUT NOT** run on a schedule | T-05 (no-`@Cron` gate) |
| R-CAM-002 | **AND IT MUST** be idempotent | T-03 |
| R-CAM-002 | AC.1 zero writes · AC.3 four counts | T-05 |
| R-CAM-002 | AC.2 second apply changes nothing | T-03 |
| R-CAM-003 | THEN MANUAL left as is; AND divergence surfaced | T-03 |
| R-CAM-003 | **BUT NOT** deactivate, re-point or overwrite | T-03 |
| R-CAM-003 | **AND IT MUST** report, not silently skip | T-03 |
| R-CAM-003 | AC.1 byte-identical · AC.2 the three pre-2026 rows · AC.3 D514 | T-03 |
| R-CAM-003 | Divergence visible to the admin | T-06 |
| R-CAM-004 | THEN coverage reads 4 / 198; AND three actionable counts | T-04, T-06 |
| R-CAM-004 | **BUT NOT** a contract-total denominator | T-04, T-06 (DD-6) |
| R-CAM-004 | **AND IT MUST** state the denominator on screen | T-06 |
| R-CAM-004 | AC.1 shipped predicates · AC.2 invariant · AC.3 no contract denominator | T-04 |
| R-CAM-004 | AC.4 loading / error / empty states | T-06 |
| R-CAM-005 | THEN deactivate + create; AND both visible via Status | T-03 |
| R-CAM-005 | **BUT NOT** re-point the existing row | T-03 (grep gate) |
| R-CAM-005 | **AND IT MUST** apply only to non-`MANUAL` | T-03 |
| R-CAM-005 | AC.1 two rows · AC.2 no `agreement_id` update | T-03 |
| NFR-CAM-001 | Abort on a feed with no `external_code` | T-02 |
| NFR-CAM-002 | `confidence_score` null | T-03 |
| NFR-CAM-003 | One normalization — S1's `normalizeExternalCode`, no second strip (DD-9) | T-01 (grep gate) |
| NFR-CAM-004 | Non-AI source value | T-00, T-03 |

---

## 4. Estimated LOC & PR strategy

| Item | LOC |
| --- | --- |
| Migration + enum | ~20 |
| `external-code.util.ts` | **0 — shipped by S1 (DD-9); spec additions only** |
| `automapper.service.ts` | ~200 |
| Controller + DTO | ~60 |
| Client strip + run surface | ~140 |
| Tests (server + client) | ~200 |
| **Total** | **≈ 620** |

**Two PRs**, split at the API boundary — past the ~400 LOC single-PR threshold.

**PR 1 — server (T-00 … T-05).**
*Review first:* `automapper.service.ts` §5 step 6 — the classification table is the whole behaviour, and the half worth scrutinising is that `MANUAL` rows are never written and supersession creates two rows rather than mutating one.
*Out of scope by design:* the selection predicates, pool-funding tagging, any cron.
*Note:* contains a migration. The pipeline deploys code, not migrations (**K-015**) — applying it is a separate human step.

**PR 2 — client (T-06).** Depends on PR 1's endpoints.
*Review first:* the coverage strip's denominator. The number is meaningless without it, and the omission of unpaired contracts is deliberate (DD-6), not an oversight.

---

## 5. Risks & blockers log

| # | Date | Risk | Mitigation | Status |
| --- | --- | --- | --- | --- |
| RB-1 | 2026-08-19 | **Production has 0 `external_code`** — the matcher cannot run there | NFR-CAM-001 aborts rather than reporting "nothing to do"; the guard is the feature flag (DD-8) | open — release gate |
| RB-2 | 2026-08-19 | **Measured figures age fast** (299→377→911 in 5 days) | Fixtures pin; live runs report. No test asserts a fixed count against a live feed (D-7) | open |
| RB-3 | 2026-08-19 | A 194-row bulk write surprises an admin | Preview-then-apply (DD-3) + one `LoggerUtil` summary per run | open |
| RB-4 | 2026-08-19 | Migration merged but never applied (**K-015**) | Named in PR 1's description; check `migration:show` before assuming | open |
| RB-5 | 2026-08-19 | Zero collisions today ≠ zero collisions always | Ambiguity branch built anyway (DD-4) | closed by design |
| RB-6 | 2026-08-19 | The 5-minute CLARISA cache makes a fresh run read stale projects (**K-016**) | The run report states the feed fetch timestamp | open |
| RB-7 | 2026-08-20 | **Concurrent applies are not serialized.** The step-6 classification SELECT takes no lock, while the sibling `BilateralProjectMappingService.create()` deliberately takes `setLock('pessimistic_write')`. Two concurrent applies — or an apply racing an admin create — can both classify a contract `toCreate`; `uk_bpm_active_agreement` then rejects the second insert with a raw 1062 and **rolls back the entire bulk apply** (a 500 envelope, where the sibling returns a clean 409) | **No data corruption** — the unique index is the backstop — and R-CAM-002's *"running twice in a row"* is sequential and proven. Accepted for v1; the matcher is admin-triggered, not scheduled (R-CAM-002 forbids a cron), so concurrent runs require two admins acting simultaneously | open — accepted |
| RB-8 | 2026-08-20 | **Apply re-resolves rather than replaying the preview.** T-05's apply endpoint must derive `resolved` server-side (otherwise a caller could POST arbitrary pairs and bypass R-CAM-001), so under the 5-minute CLARISA cache the applied set can differ from the previewed one | The correct trade — a stale preview must never be able to write. **T-06's UI must not promise "apply exactly what you saw"**; it states the feed timestamp instead (RB-6) | open — binds T-05 and T-06 |
| RB-9 | 2026-08-20 | **The coverage strip can be up to 5 minutes stale with nothing on screen saying so.** `coverage()` inherits `ClarisaProjectsService`'s 5-minute cache exactly as `resolve()` does. Design §7 requires the *run report* to carry a fetch timestamp; §6.1's strip has no freshness indicator and `AutomapperCoverage` carries no timestamp field. An admin who applies a run and immediately reloads may see a pre-apply `reachable` | **K-016 is explicit that a UI must never imply a save took effect immediately.** Decide at T-06 while the DTO is still one field wide: either add a `measuredAt` to the coverage shape and print it, or state the cache window on the strip | open — binds T-06 |
| RB-10 | 2026-08-20 | **Unbounded `IN` list, now at three occurrences** (T-02 AGRESSO lookup, T-03 mapping read, T-04 coverage read). Recorded as one row rather than three isolated advisories so the recurrence is visible | Fine at 198 ids. The cohort denominator moved 299 → 377 → 911 in five days (RB-2); at a few thousand this risks `max_allowed_packet` and a planner regression. Chunking is ~6 lines **per site** — if it is ever done it should be one shared helper, not three copies (K-005) | open — accepted |
---

## 6. Done definition

- [ ] T-00 … T-06 all `done`
- [ ] Every R-CAM AC checked; §3 coverage table closed at clause level
- [ ] Migration observed applying **and** reverting against a scratch schema
- [ ] Server suite green (`npx eslint`, not `npm run lint`); client suite green with `--coverage=false`; `npm run build` exit 0
- [ ] Visual check on the coverage strip performed or explicitly recorded as outstanding
- [ ] OQ-5 (PRMS science-program status) carried forward, not dropped
- [ ] **Release gate acknowledged:** not runnable against production until PRMS promotes `external_code`
