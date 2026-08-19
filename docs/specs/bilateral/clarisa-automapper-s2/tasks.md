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
- **Effort:** S · **Status:** todo

**Scope.** Add one value to the `bilateral_project_mapping.source` enum for automatically derived rows. `MANUAL`, `AI_SUGGESTED`, `AI_AUTO` are untouched — the latter two become **reserved** for a future inferential matcher.

**Notes.**
- No new column. **No backfill** — all 5 existing rows are `MANUAL`.
- ⚠️ **In a migration passing no parameters, never let a `?` or `:word` appear in the SQL — including inside a comment.** `namedPlaceholders: true` makes mysql2 consume it as a bind parameter and the call throws before MySQL parses it. Drop colons in bracketed refs and end comment questions with a period.
- Update the enum in `enum/mapping-source.enum.ts` in the same task, or the migration and the TypeScript disagree.

**Verification.**
```
# Scratch schema = a DISPOSABLE local container. The repo .env's ARI_MYSQL_*
# points at 192.168.20.210 / alliancereportingdb — the SHARED on-prem Dev DB.
# Never run migration:dev:execute or migration:revert against it (CLAUDE.md §4.3).
# Route resolved and authorized by the user 2026-08-19.
docker run --rm -d --name ari-scratch-mysql -p 33306:3306 \
  -e MYSQL_ROOT_PASSWORD=scratch -e MYSQL_DATABASE=scratch mysql:8
cd server/researchindicators
# point ARI_MYSQL_* at the container for this run only (inline env, never edit .env)
ARI_MYSQL_HOST=127.0.0.1 ARI_MYSQL_PORT=33306 ARI_MYSQL_USER_NAME=root \
ARI_MYSQL_USER_PASS=scratch ARI_MYSQL_NAME=scratch npm run migration:dev:execute
ARI_MYSQL_HOST=127.0.0.1 ARI_MYSQL_PORT=33306 ARI_MYSQL_USER_NAME=root \
ARI_MYSQL_USER_PASS=scratch ARI_MYSQL_NAME=scratch npm run migration:revert
docker rm -f ari-scratch-mysql
npx eslint src/db/migrations/<file> src/domain/entities/bilateral-project-mapping/enum/mapping-source.enum.ts
```
**Named failing input:** put `?` in a comment inside the migration → it throws *"Named query contains placeholders, but parameters object is undefined"* before reaching MySQL.

**What disqualifies this evidence.** A migration that is lint-clean and type-clean but **never executed** proves nothing — one shipped unrunnable and passed every static gate this repo has (K-006). **Running it is the only gate.** Do not report this task done on a build alone.

**Done check.**
- [ ] Migration applies forward and reverts cleanly against the **disposable container**, both observed, with the raw output pasted into the report
- [ ] **Nothing was run against `192.168.20.210`** — the shared Dev DB is untouched
- [ ] `mapping-source.enum.ts` carries the same new value
- [ ] `AI_SUGGESTED` / `AI_AUTO` unchanged
- [ ] No `?` or `:word` anywhere in the migration, comments included

---

### T-01 — The single normalization: `normalizeExternalCode` (S1, shipped)

- **Requirements:** R-CAM-001 AC.1; NFR-CAM-003
- **Design:** §2.2, DD-1, **DD-9**
- **Files:** `…/bilateral-project-mapping/utils/external-code.util.ts` (+ spec)
- **Skills:** `nestjs-expert`, `tdd`
- **Effort:** S · **Status:** todo

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
- [ ] All **seven** named inputs asserted, including the `A-1234` pass-through
- [ ] `grep` finds exactly **one** strip definition repo-wide — `normalizeExternalCode` — and **no** `stripCentrePrefix` (NFR-CAM-003)
- [ ] `normalizeExternalCode`'s behaviour is **unchanged**: `git diff` touches the spec file only, not `external-code.util.ts`
- [ ] eslint clean

---

### T-02 — Resolution, ambiguity, and the environment guard

- **Requirements:** R-CAM-001 (both scenarios; AC.2, AC.3, AC.4); NFR-CAM-001
- **Design:** §5 steps 1–5, DD-1, DD-4
- **Dependencies:** T-01
- **Files:** `…/automapper.service.ts` (+ spec), fixtures
- **Skills:** `nestjs-expert`, `systematic-debugging`, `tdd`
- **Effort:** M · **Status:** todo

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
- [ ] Fixture cohort resolves 198/198 with zero unresolved
- [ ] Two-projects-one-contract fixture lands in `ambiguous`, and was observed failing without the grouping step
- [ ] No-`external_code` cohort aborts with zero writes
- [ ] `grep` finds no name/description comparison in the service
- [ ] Eligibility comes from the shipped predicates — no local reimplementation
- [ ] No test asserts a fixed count against a live feed

---

### T-03 — Classification against existing rows, apply, and supersession

- **Requirements:** R-CAM-003 (scenario + AC.1–AC.3); R-CAM-005 (scenario + AC.1–AC.2); R-CAM-002 `AND IT MUST` (idempotency) + AC.2; NFR-CAM-002; NFR-CAM-004
- **Design:** §5 step 6 table, DD-2, DD-5, DD-7
- **Dependencies:** T-00, T-02
- **Files:** `…/automapper.service.ts` (+ spec)
- **Skills:** `nestjs-expert`, `tdd`
- **Effort:** M · **Status:** todo

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
- [ ] Every named input above asserted
- [ ] `grep` finds no code path assigning `agresso_agreement_id` on an update
- [ ] `grep` finds no `AI_SUGGESTED` / `AI_AUTO` written by the matcher
- [ ] Every created row has `confidence_score` null
- [ ] Idempotency proven by a count before/after a second apply

---

### T-04 — Coverage computation

- **Requirements:** R-CAM-004 AC.1–AC.3 + its `BUT it must NOT`
- **Design:** §4 (`GET …/coverage`), DD-6
- **Dependencies:** T-02
- **Files:** `…/automapper.service.ts` or a sibling, + spec
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Effort:** S · **Status:** todo

**Scope.** Return `mapped`, `pending`, `reachable`. `reachable` = the eligible-project count from the **shipped** predicates.

**Notes.** ⚠️ **No figure may use a contract-table count as a denominator** (R-CAM-004's `BUT it must NOT`). `4/3348` and `4/1545` are both true and both misleading; the 1377 unpaired `BLR` contracts are not pending work and are **not returned at all** (DD-6).

**Verification.** `npx jest <spec> --silent` · `npx eslint <files>`
**Named failing input:** compute `pending` as `contracts − mapped` → the `mapped + pending = reachable` invariant reds.

**What disqualifies this evidence.** Asserting the three numbers individually against a fixture does **not** prove the denominator is right — three hard-coded values agree with themselves. **The invariant is the gate**, and it must be asserted as an invariant.

**Done check.**
- [ ] `mapped + pending = reachable` asserted as an invariant, not as three constants
- [ ] `reachable` derives from the shipped predicates
- [ ] No contract count appears in any returned figure
- [ ] Zero-cohort case returns `reachable: 0` without dividing

---

### T-05 — Controller: preview, apply, coverage

- **Requirements:** R-CAM-002 (scenario, AC.1, AC.3, and its `BUT it must NOT` on cron)
- **Design:** §4, §8, DD-3
- **Dependencies:** T-03, T-04
- **Files:** `…/automapper.controller.ts` (+ spec), `dto/automapper-run.dto.ts`
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Effort:** M · **Status:** todo

**Scope.** Three endpoints, `@Roles`-guarded to the existing centre-admin gate, Swagger-annotated, standard envelope. The run report carries `external_code`, derived contract id, `full_name` and project id per entry.

**Notes.**
- ⚠️ **No `@Cron` anywhere** — R-CAM-002 forbids scheduling in this version.
- `preview` **writes nothing**; `apply` is the only mutating endpoint.
- Report exposes the four counts (AC.3) and the feed fetch timestamp (§7, K-016 — a run right after a feed change may read a cached cohort).

**Verification.** `npx jest …/automapper.controller.spec.ts --silent` · `npx eslint <files>` · endpoints visible at `/swagger` with the bearer lock
**Named failing inputs:** call `preview` and assert the mapping row count is unchanged — make preview write and it reds. Call as a non-admin role → must be denied.

**What disqualifies this evidence.** A `200` from `preview` proves the route exists, not that it wrote nothing. **The gate is a row count taken before and after**, not the status code.

**Done check.**
- [ ] Row count identical before and after `preview`
- [ ] Allowed-role and denied-role cases both asserted
- [ ] All three endpoints in `/swagger` with `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`
- [ ] `grep` finds no `@Cron` in the module
- [ ] Report includes the four counts and the feed timestamp

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

---

## 6. Done definition

- [ ] T-00 … T-06 all `done`
- [ ] Every R-CAM AC checked; §3 coverage table closed at clause level
- [ ] Migration observed applying **and** reverting against a scratch schema
- [ ] Server suite green (`npx eslint`, not `npm run lint`); client suite green with `--coverage=false`; `npm run build` exit 0
- [ ] Visual check on the coverage strip performed or explicitly recorded as outstanding
- [ ] OQ-5 (PRMS science-program status) carried forward, not dropped
- [ ] **Release gate acknowledged:** not runnable against production until PRMS promotes `external_code`
