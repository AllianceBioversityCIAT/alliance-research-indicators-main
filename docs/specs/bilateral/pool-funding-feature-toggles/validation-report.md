# Validation Report — Bilateral / Pool Funding Feature Toggles

> **Verdict: PASS WITH WARNINGS — archive-ready once the Leader's Phase 3 gate run is green.**
> No FAIL. 17 PASS · 6 WARN · 0 FAIL · 1 BLOCKED (Phase 3 build integrity, by session constraint).
> All delivered behaviour is present in today's working tree and has reached `origin/dev`, `origin/staging` and `origin/main`. Later specs changed the code around it, but the flag semantics still hold.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/pool-funding-feature-toggles` |
| Depth | Lite |
| Validated at | branch `institutional-kpis`, working tree (clean), 2026-11-13 |
| Implementation commits | `a95a81e4` (T-01) · `b1cd1ece` (T-02) · `bd8edb13` (T-03) · `b383472f` (T-04) · `a927aba3` (T-07) · `492b39b8` (T-06) |
| Auditor | T3 Auditor (Claude Opus). Implementer was Grok `grok-4.7-high`, so author ≠ auditor holds |
| Inputs read | root `CLAUDE.md`, `client/research-indicators/src/CLAUDE.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`. There is no `proposal.md` and no `test-report.md`, so coverage was checked directly against the code and the co-located specs |
| Session constraints | No build/test/lint/type-check run, because sibling auditors share this checkout (root guide §4.3). No UI detector run |

---

## 2. Summary

| Area | Result | Note |
| --- | --- | --- |
| Task completion | PASS (6) · WARN (1) | T-07 was executed and committed but is not in `tasks.md` |
| File existence | PASS | All 12 delivered source/spec files and both migrations are present |
| Build integrity | **BLOCKED** | Pending the Leader's gate run (§5) |
| Requirement coverage | 6 PASS · 1 WARN | R-PFT-003 has two absent-value paths without their own test |
| Code quality | PASS (advisories) | One Swagger documentation gap (WARN) |
| Design conformance | PASS · 3 WARN | Stale K-015 claim, UI design gate unverified, doc hygiene |
| Drift since close | PASS | `pool-funding-reporting-year` reshaped the rules around the flags. The flags themselves are intact |

---

## 3. Task Completion

| Task | Status | Execution evidence | Result |
| --- | --- | --- | --- |
| T-01 Seed rows + keys | `[x]` | Migration executed on scratch, `down()` round trip, re-apply (`execution.md` T-01) | PASS |
| T-02 Fail-open parser | `[x]` | 12-row table on both tiers; inversion falsifier showed 8 rows red per tier | PASS |
| T-03 Server gate | `[x]` | Both falsifiers observed red (`persistsRow`, order); SQL run read-only against Dev | PASS |
| T-04 Client flags + choke point | `[x]` | Override falsifier showed 8 assertions red; spec type-check compared as a set | PASS |
| T-05 Full gates | `[x]` | Server 390/3383, client 325/7356, lint and build clean (recorded 2026-09-24) | PASS (historical; re-run pending, §5) |
| T-06 Admin toggle | `[x]` | Branch-deletion falsifier showed 4 red; owner visual confirmation recorded | PASS |
| T-07 Categorise rows | **not in `tasks.md`** | `execution.md:411-482`, commit `a927aba3`, migration `1790280318260` | **WARN** (W-1) |

---

## 4. File Existence

| File | Status |
| --- | --- |
| `server/researchindicators/src/db/migrations/1790258215513-seedPoolFundingFeatureToggles.ts` | present, unchanged since `a95a81e4` |
| `server/researchindicators/src/db/migrations/1790280318260-categorisePoolFundingFeatureToggles.ts` | present, unchanged since `a927aba3` |
| `server/.../app-config/enum/app-config-key.enum.ts:6-7` | both keys present |
| `server/.../shared/utils/feature-flag.util{,.spec}.ts` | present, unchanged |
| `server/.../result-prms-sync/eligibility/sync-gate.ts:101` | `feature_enabled` is the first entry |
| `server/.../result-prms-sync/repositories/result-prms-sync-log.repository.ts:118` | `loadPrmsSyncButtonEnabled()` present |
| `client/.../shared/constants/application-configuration-keys.ts:4-5` | both keys present |
| `client/.../shared/utils/feature-flag.util{,.spec}.ts` | present, unchanged |
| `client/.../shared/services/pool-funding-flags.service{,.spec}.ts` | present, unchanged |
| `client/.../result-sidebar/result-sidebar.component.{ts,html,spec.ts}` | present (changed later by other specs, see §8.3) |
| `client/.../edit-environment-variable-modal.component.{ts,html,spec.ts}` | present, unchanged since `492b39b8` |
| `client/.../app.config.ts:54-55`, `cognito.service.ts:96` | `PoolFundingFlagsService.load()` still wired in both places |

Result: **PASS**.

---

## 5. Build Integrity — **BLOCKED (pending Leader gate run)**

Not run by this auditor, by session constraint. Run these **sequentially**, one package at a time, with no delegated agent active:

**Server** (`server/researchindicators/`)

```bash
npx jest src/domain/entities/result-prms-sync src/domain/shared/utils/feature-flag.util.spec.ts --silent
npm test -- --silent
npx eslint src/domain/entities/result-prms-sync src/domain/shared/utils/feature-flag.util.ts src/domain/shared/utils/feature-flag.util.spec.ts src/domain/entities/app-config/enum/app-config-key.enum.ts src/db/migrations/1790258215513-seedPoolFundingFeatureToggles.ts src/db/migrations/1790280318260-categorisePoolFundingFeatureToggles.ts
npx tsc -p tsconfig.json --noEmit   # includes specs; tsconfig.build.json excludes them (K-004)
```

**Client** (`client/research-indicators/`)

```bash
npx jest --config jest.config.ts src/app/shared/utils/feature-flag.util.spec.ts src/app/shared/services/pool-funding-flags.service.spec.ts src/app/shared/components/result-sidebar src/app/shared/components/all-modals/modals-content/edit-environment-variable-modal --silent
npm test -- --silent
npm run lint -- --quiet
npx tsc -p tsconfig.spec.json --noEmit   # compare as a normalized error SET for the touched files, never a total
npm run build
```

Expected baseline, from `execution.md` T-05: the touched spec files add no new type errors, and the client project total is about 944 with no parse-abort collapse.

---

## 6. Requirement Coverage

| Req · scenario / clause | Code evidence | Test evidence | Result |
| --- | --- | --- | --- |
| R-PFT-001 · flag off hides a qualifying result (item, divider, button) | `result-sidebar.component.ts:126` (`hiddenByExistingRules \|\| !sectionEnabled()`) | `result-sidebar.component.spec.ts` "row 2": asserts item, `sidebar-optional-divider` and rendered button are absent | PASS |
| R-PFT-001 · `BUT` no stored alignment data altered | No write path touched; the flag service is read-only (`pool-funding-flags.service.ts`) | By scope / inspection | PASS |
| R-PFT-001 · flag on does not override (`AND IT MUST`, pre-existing reason) | OR for hiding at `:126`; existing rules evaluated first at `:125` | "row 4" (non-qualifying contract + flags on, still hidden); override falsifier recorded 8 red | PASS |
| R-PFT-002 · button off, section on | `result-sidebar.component.html:179` (`poolFundingFlags.prmsSyncButtonEnabled() && …` nested in `@if (hasPoolFundingOption())` at `:177`) | "row 3" asserts the item present and the rendered button absent | PASS |
| R-PFT-002 · `BUT` result-code caption kept | Caption/card branches at `html:202-222` sit outside the button `@if` | "row 3" asserts `sidebar-prms-result-code` contains `54321` | PASS |
| R-PFT-002 · section off wins | Button host is inside `@if (hasPoolFundingOption())`, which reads the same filtered list | "row 2" | PASS |
| R-PFT-003 · missing row | server: `repository.ts:128-131`; client: `res?.data?.simple_value` → `undefined` → enabled | server: `repository.spec.ts:588` "stays enabled when the row is missing". **Client: no test with `{ data: null }`**, which is the real 200 response for a missing key (`app-config.service.ts:29-33` returns `findOne` → `null`) | WARN (W-2) |
| R-PFT-003 · `NULL` / empty / whitespace / unrecognised | `feature-flag.util.ts` (both tiers) | 12-row table on each tier; client service spec "simple_value is absent" (`null`) | PASS |
| R-PFT-003 · request fails | server `catch` at `repository.ts:133`; client `.catch(() => true)` | server `repository.spec.ts:597` "config read throws"; client "fails open when a read rejects" | PASS |
| R-PFT-003 · request **times out** | Client signals start `true`, so a request that never settles stays enabled. Server: no timeout; the sync waits | Indirect only: client "starts enabled before any read resolves". **No test frames the timeout path**, as the clause "explicit test per path" requires | WARN (W-2) |
| R-PFT-004 · stale tab refused, message names feature | `sync-gate.ts:101-106` (503, "PRMS sync is disabled as an administrative pause…") | `sync-gate.spec.ts:107-120` | PASS |
| R-PFT-004 · `AND IT MUST` refuse before any PRMS call | Gate evaluated at `service.ts:135`; it throws before `claimAttempt` (`:165`) and before transport | `sync-gate.spec.ts:113-120` (`transport.ingest` not called); `:122-132` first-in-ladder even when the result is missing | PASS |
| R-PFT-004 · `BUT` no attempt number, no `REFUSED_BY_STAR` row | `persistsRow: false`; `service.ts:138` only inserts when `persistsRow` | `sync-gate.spec.ts:118` asserts `persistsRow === false`; service-level behaviour for `persistsRow:false` is pinned generically by `service.spec.ts:319` (advisory A-2) | PASS |
| R-PFT-005 · admin sees on/off control, not text | `modal.component.html:98-115` (`p-toggleswitch`, `trueValue 'true'` / `falseValue 'false'`) | `modal.component.spec.ts:195` (rendered toggle present, text input absent, both keys) | PASS |
| R-PFT-005 · saving writes canonical encoding | `onPoolFundingFlagChange` at `modal.component.ts:119-122` | `modal.component.spec.ts:210` writes `'false'` then `'true'` | PASS |
| R-PFT-005 · `BUT` no free text | Flag keys never reach the free-text `@else` (`html:116`) | `:195` asserts `simpleValueInputExists() === false` | PASS |
| R-PFT-005 · rows exist after migration | Seed `1790258215513` + categorise `1790280318260` | Executed migration evidence (`execution.md` T-01, T-07); no automated gate (accepted risk, `requirements.md:174`) | PASS |
| NFR-PFT-001 · no restart on server | `loadPrmsSyncButtonEnabled()` queries per call, no memo | By inspection; the save toast says only "Data saved successfully" (`variable-configuration.service.ts:163`), so no UI claims instant effect | PASS |
| NFR-PFT-002 · single choke point | `allOptionsWithGreenChecks` → `shouldHidePoolFundingTab` → `hasPoolFundingOption` (`ts:84-126, 208-210`) | "row 2" (divider, item and button disappear together) | PASS |

Result: **6 PASS · 1 WARN** at requirement level.

---

## 7. Linting & Code Quality

### 7.1 Spec-relevant findings

| # | Finding | Evidence | Result |
| --- | --- | --- | --- |
| W-3 | Swagger's 503 response describes only transport failure, not the new administrative-pause refusal. Root guide §4.1 requires accurate Swagger for every endpoint | `result-prms-sync.controller.ts:147-150` → `PRMS_SYNC_HTTP_DESCRIPTIONS.transportOrRetryable` (`dto/prms-sync.dto.ts:18`: "PRMS transport failed or the ingest is retryable"); pinned by `controller.spec.ts:153` | WARN |
| — | Token-only styling in the new toggle block (`atc-primary-blue-600`, `atc-grey-600`) | `modal.component.html:100-113` | PASS |
| — | Parser has no catch, so fail-open is structural (D-2) | `feature-flag.util.ts` both tiers | PASS |

### 7.2 4R advisories (not spec violations)

| # | Lens | Advisory |
| --- | --- | --- |
| A-1 | Readability | Sidebar spec "row 5" (`result-sidebar.component.spec.ts:2744`) sets both signals to `true` and calls it "a failed read". At component level it duplicates row 1 and proves nothing about failure. The real failure path is covered in `pool-funding-flags.service.spec.ts`. Rename it, or drive it through a rejecting `ApiService` |
| A-2 | Reliability | No service-level test drives `prms_sync_button_enabled: false` through `ResultPrmsSyncService.sync()` and asserts that `insertRefusedByStar` and `claimAttempt` are never called. Today this holds because the service path is generic over `persistsRow`. A dedicated test would pin R-PFT-004's `BUT` clause at the boundary where it actually matters |
| A-3 | Risk | The server enforces only the **button** flag. With section = `false` and button = `true`, a stale tab can still sync. This is in scope as written (R-PFT-004 names the button flag only), but "section off wins" holds on the client tier only |
| A-4 | Resilience | Admin toggle: if a flag row's `simple_value` is not exactly `'true'`/`'false'` (for example `NULL` after a manual edit), the switch renders **off** while the label reads **Enabled** (`html:104-112`). Seeded rows are `'true'`, so this is latent. Normalising `ngModel` through `isFeatureFlagEnabled` would align them |
| A-5 | Risk | `PoolFundingFlagsService.loadPromise` is cached for the tab's lifetime, so a logout/login in the same tab does not re-read the flags. This is consistent with D-4 (once per session) and recorded only for awareness |
| A-6 | Readability | Pre-existing hex literals on the PRMS SYNC button (`result-sidebar.component.html:181-187`) were not introduced by this spec. Noted for a future token sweep |

---

## 8. Design Conformance

### 8.1 Decisions

| Decision | Implementation | Result |
| --- | --- | --- |
| D-1 dotted key family, two registries | Both keys in `AppConfigKey` and `APPLICATION_CONFIGURATION_KEY` | PASS |
| D-2 only exact `false` disables | `value?.trim().toLowerCase() !== 'false'` | PASS |
| D-3 first entry, 503, `persistsRow:false` | `sync-gate.ts:101-106` | PASS |
| D-4 direct read, single-flight, fail-open | `pool-funding-flags.service.ts`; wired at `app.config.ts:54-55`, `cognito.service.ts:96` | PASS |
| D-5 OR-to-hide / AND-to-show | `ts:126`, `html:179` | PASS |
| D-6 fourth modal branch | `html:98` | PASS |
| D-7 seeded enabled, then categorised `FRONT`/`SECTIONS` (§6 correction) | Both migrations | PASS |

### 8.2 Cross-document and constitution findings

| # | Finding | Evidence | Result |
| --- | --- | --- | --- |
| W-4 | The spec asserts K-015 ("pipeline deploys code, not migrations") as current fact, but the root guide recorded a correction on **2026-08-27**, a month before this spec: the Dev pipeline runs `migration:execute` on every deploy. The accepted-risk row and the "not applied anywhere" notes were stale when written. The code is now on `origin/dev`, so both migrations were most likely applied there automatically (not verified: no DB access). Prod parity is unmeasured | `requirements.md:174`, `design.md:192`, `execution.md:60-61, 480-482` vs root `CLAUDE.md` §4.3 "Correction (2026-08-27…)" | WARN |
| W-5 | UI design gate is unverified. No impeccable/detector run was possible in this session, and the sidebar visibility change has no visual check. The admin toggle has only the owner's informal confirmation ("el toggle lo veo bien", `execution.md`) | — | WARN (unverified) |
| W-6 | Doc hygiene: (a) `design.md:206-208` has a blank line that splits the §6 data-model table in two, so `category`/`subcategory`/`field` render as a separate headerless table; (b) `tasks.md:42` forbids any `?` in migration SQL, yet both shipped migrations use `?` placeholders with parameter arrays and executed successfully, so the rule as written is contradicted by its own evidence; (c) budget was 6 tasks (`design.md:35`, `tasks.md:4`) and execution was 7, with no recorded escalation | as cited | WARN |
| — | Baseline-dated facts are now outdated but correctly labelled `Verified at 37d8f875`: "7 entries" (`requirements.md:40`, `design.md:64`; now 9) and the `version_locked` rule (`requirements.md` R-PFT-003 note) | — | Informational |

### 8.3 Drift since the spec closed

Commits after `492b39b8` touching delivered files came from `bilateral/pool-funding-reporting-year` (`2fde5e00`, `7a4bbca2`, `502d5a78`, `bb244570`) and PRMS-sync work (`75d2e259`, `a9f88670`, `d555c261`, …):

- Sidebar hiding now uses `eligible === false && display_only !== true` and `version_locked && !has_pool_funding_data`, instead of the baseline's plain `eligible === false || version_locked`. The section flag is still OR-ed after these rules (`ts:126`).
- The button `@if` gained `version_locked !== true && display_only !== true`. The button flag is still the first conjunct (`html:179`).
- The ladder gained `reporting_year`. `feature_enabled` is still first.
- The legacy PRMS code caption is now one branch of a card/legacy switch. It is still outside the button `@if`, and row 3 still asserts it.

Result: **PASS**. The delivered semantics survived the later edits.

### 8.4 Design Review (UI)

| Item | Value |
| --- | --- |
| Skill source / engine | Not probed: the session forbids running the detector |
| Scan matrix | `Unevaluated (no detector run in this session)` |
| First-visit pass | Not performed |
| Waivers | None |
| Gate | **WARN (unverified)**, counted as W-5 |

---

## 9. Test Evidence Summary

| Suite | Tests relevant to this spec | Last recorded run |
| --- | --- | --- |
| Server parser | `feature-flag.util.spec.ts`, 12 rows | green, inversion red 8/12 (`execution.md` T-02) |
| Server gate | `sync-gate.spec.ts:107-132` | green, two falsifiers red (T-03) |
| Server repository | `result-prms-sync-log.repository.spec.ts:554, 568-606` | green (T-03) |
| Client parser | `feature-flag.util.spec.ts`, 12 rows | green, inversion red 8/12 (T-02) |
| Client service | `pool-funding-flags.service.spec.ts`, 5 tests | green (T-04) |
| Client sidebar | `result-sidebar.component.spec.ts:2646-2759`, matrix rows 1-5 on rendered DOM | green, override falsifier 8 red (T-04) |
| Client modal | `edit-environment-variable-modal.component.spec.ts:195-224` | green, branch removal 4 red (T-06) |
| Migrations | Executed up/down/up on scratch | T-01, T-07 |

All runs are dated 2026-09-24. The current tree has not been re-measured, so §5 must be run.

---

## 10. Agent Guide / Constitution Impact

`execution.md` has no `## Constitution Impact` section. The spec added no module, no boundary and no endpoint; it extended existing structures, and no child guide needs a sync. **PASS.**

One constitution-facing item is carried to `/akili-archive`: W-4 shows the spec copied K-015 forward after the root guide had already corrected it. That is a Kaizen input, not a guide edit.

---

## 11. Remediation

| # | Severity | Action | Owner hint |
| --- | --- | --- | --- |
| R-1 | Blocking for archive | Run the §5 gates and record the results | Leader |
| R-2 (W-1) | Low | Add T-07 to `tasks.md` (status `[x]`, linked to `execution.md` T-07) so the task list matches what was executed | docs |
| R-3 (W-2) | Medium | Add a client service test with `GET_ConfigurationByKey` resolving `{ data: null }` (missing row). Add a timeout-framed test, for example a never-settling promise asserting both signals stay `true`, or document the "pending = enabled" mapping as the timeout evidence in `requirements.md` | client |
| R-4 (W-3) | Low | Extend the 503 `@ApiResponse` description (and the pinning spec) to cover the administrative-pause refusal | server |
| R-5 (W-4) | Low | Correct the K-015 statements in `requirements.md:174`, `design.md:192` and `execution.md` notes to match the 2026-08-27 Dev-pipeline correction. Confirm both migrations show as executed on Dev (`npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts`, a human decision against a shared DB) | Leader / human |
| R-6 (W-5) | Low | Do a manual visual check of the sidebar with each flag off, light and dark | owner |
| R-7 (W-6) | Trivial | Remove the blank line at `design.md:207`. Reword `tasks.md:42` to "no bare `?` without a parameter array". Note the 6→7 task budget overrun | docs |

Remediation count: 1 blocking (gate run) + 6 non-blocking.

---

## 12. Archive Readiness Recommendation

**Conditionally ready.** No FAIL; all required tasks are `[x]`; all strict clauses except two R-PFT-003 sub-paths have direct test evidence; delivered behaviour survived later changes and is on `main`.

Archive after:

1. The Leader runs the §5 gates green (R-1).
2. The owner accepts W-1 to W-6, or schedules R-2 to R-7 as follow-ups.

```text
/akili-archive bilateral/pool-funding-feature-toggles
```
