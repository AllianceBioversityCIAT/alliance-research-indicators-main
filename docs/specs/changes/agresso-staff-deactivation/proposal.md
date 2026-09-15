# Proposal — Deactivate platform accounts whose staff member left the Alliance list

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/agresso-staff-deactivation` |
| Type | Change — **destructive**. Writes `is_active = 0` across three tables |
| Depth (recommended) | **Full** |
| Approval Mode | `gated` |
| Status | **Proposal — not yet specified.** `/akili-specify` has never run on this path |
| Date created | 2026-09-14 |
| Origin | Split out of [`changes/agresso-staff-sec-users-sync`](../agresso-staff-sec-users-sync/) on 2026-09-14, on the recommendation of that spec's exhausted Judgment Day lineage |
| Depends on | `changes/agresso-staff-sec-users-sync` — **not because the code depends on it**, but because this spec's matching, indexes and classification are the *same pass*. Specify this only after the sibling's design is stable |
| Inherited evidence | [`judgment-inherited.md`](./judgment-inherited.md) — the complete three-pass ledger from the parent spec. **Read it before writing requirements** |

---

## 1. Why this is its own spec

This was requirement `R-AGS-005` inside `agresso-staff-sec-users-sync`. It was split out because of what three adversarial review passes measured, not because of a scope preference.

| Half of the parent spec | Severe findings across 3 passes, 2 judges, 2 model families |
| --- | --- |
| Additive (`R-AGS-001…004`, `R-AGS-006`, DD-1/3/4/8/10) | **0** |
| Destructive (`R-AGS-005` + its guard) | **all of them** — J-1, J-3, J-4, J-6, R-1, R-2, R-3, R-4, F-1, F-2, F-8 |

Twice a correction *reintroduced* the class the previous correction removed (R-4 → F-1; J-5 → R-5 → F-3). The parent's lineage was declared **ESCALATED** with two fix rounds and two scoped re-judgments spent.

The ledger's own reading: *"`R-AGS-005` and its guard are a spec of their own, and carrying them inside a spec whose other half was finished after round 1 is what exhausted this lineage."*

**This spec therefore starts a fresh Judgment Day lineage** — with the rules already settled by user ruling, and the known defects listed below as starting evidence rather than as discoveries waiting to happen.

---

## 2. Problem

`cloneAllAgressoStaff` refreshes `alliance_user_staff` from Agresso. Once the sibling spec ships, the sync also creates and refreshes `sec_users` rows for everyone who arrives.

Nobody is ever retired. A departed employee keeps a working platform account — with its roles, and with any `app_secrets` machine token they are the responsible user for — until a human notices.

---

## 3. Intended behavior (settled by user ruling, carried verbatim)

> These are **decisions already made** by the user on 2026-09-14, not open questions. `/akili-specify` should encode them, not re-litigate them.

> ### The split boundary, as an invariant
>
> **This spec only ever writes `is_active = 0`. The sibling only ever writes `is_active = 1`.**
> Deactivation lives here; creation, refresh and **reactivation** live in `agresso-staff-sec-users-sync`.
> A requirement that turns something *on* is in the wrong document if it is here.

**Matching is by EMAIL ONLY** *(user ruling 2026-09-14)*. Carnet is **not** a match key — it is written, never matched on. This spec inherits the sibling's matching pass wholesale and must not define a second one.

> **The inherited pass gained a step on 2026-09-14** (sibling `DD-14`, from lineage-2 finding **M-4**): `allStaff` is **collapsed to one member per `lower(trim(email))` before matching**, lowest carnet winning. Two consequences bind this spec: the set of *matched* accounts is computed from the collapsed payload, and **every collapsed loser is a real staff member whose account must still be shielded from deactivation** — see `NEW-4`.

**Core rule:** an active `sec_users` row that matched **no** staff member in the payload is deactivated across three tables — unless an exclusion applies.

| Table | Write |
| --- | --- |
| `sec_users` | `is_active = 0` on the matched row |
| `sec_user_roles` | `is_active = 0` on **every** active role row for that user |
| `app_secrets` | `is_active = 0` on **every** active row whose `responsible_user_id` is that user |

**Exclusions — skip deactivation:**

| # | Rule | Basis |
| --- | --- | --- |
| **EX-1** | `sec_users.status_id = 4` — external user. Externals never appear in an Alliance staff payload, so their absence carries no information | User ruling 2026-09-14 |
| **EX-2** | The user holds an **active** `sec_user_roles` row with `role_id = 1` (`SYSTEM_ADMIN`). Evaluated against active role rows only, so an ex-admin is not shielded | User ruling 2026-09-14 |
| **EX-3** | The row is **ambiguous** — its email key maps to more than one `sec_users` row. Computed as a **standalone pre-pass** over the email index, never inside the resolver | Judgment Day J-3, refined by R-3; **simplified 2026-09-14** by the email-only ruling — the cross-key half of the original EX-3 no longer exists |

**Preconditions — abort the whole pass, write nothing:**

| # | Rule | Defends against |
| --- | --- | --- |
| **C-1** | `totalElements > 0` | An empty payload matching nothing, so every account is unmatched |
| **C-2** | Distinct non-empty carnets in the payload equals the expected total | A failed page, and duplicate carnets masking omitted staff |
| **C-3** | `deactivationSet.size <= max(ceilingFraction × activePopulation, absoluteFloor)` | A payload that is internally consistent and still not the Alliance staff list |

**Also settled:** the first production run is expected to breach C-3, and a **dry run** is what makes the blast radius inspectable before it is irreversible.

> ### ⚠️ `OQ-5` is RESOLVED, and it reverses a premise this spec's parent was built on
>
> **User ruling 2026-09-14: a returning staff member IS reactivated** — `sec_users.is_active = 1` and
> an active `role_id = 3` row, in **two** tables only. `app_secrets` is **not** restored.
>
> **Deactivation is therefore no longer one-way.** Every place the inherited ledger reasons from
> *"deactivation is one-way; reversal is a human action"* — J-4's remediation, the `matchedInactive`
> class, RSK-1's mitigation — was written under the opposite premise and **must be re-read, not
> re-applied**. The `matchedInactive` dead-end class no longer exists; it became a write path.
>
> **That write path lives in the sibling spec**, by the boundary invariant above: reactivation turns
> access *on*. This spec's only remaining interest in it is the loop it closes — an account this spec
> retires can be restored by the next sync if the person reappears, which makes a false-positive
> deactivation **recoverable** in a way the parent spec assumed it was not. That materially lowers
> this spec's risk, and C-3's ceiling should be re-argued in that light rather than inherited.
>
> **The asymmetry is deliberate and must be stated, not quietly implemented:** deactivation kills
> machine secrets, reactivation does not re-arm them. A credential silently coming back to life is
> worse than someone having to re-issue it.

---

## 4. Known defects carried in — start here, do not rediscover

These are **open, unfixed findings** from the parent's final re-judgment. Each is reproducible and each must be closed by this spec's requirements, not deferred.

| # | Severity | Defect |
| --- | --- | --- |
| **F-1** | SEVERE (A) | **C-2's skip subtraction is arithmetically wrong.** Only the empty-carnet skip removes a carnet from the distinct count; a null-email or over-length-carnet member is counted on the left *and* subtracted on the right → `N ≠ N−1` → **permanent abort on a schema-permitted input**. A null email is not an edge case — the sibling spec mandates skipping it. The formula also landed in 2 of 5 sites |
| **F-2** | SEVERE (A) | **C-3's "default" and "unset → abort" are mutually exclusive, and the config keys cannot be created.** `AppConfigService.getEnv` **throws** on an unset key and `updateConfig` **throws** for an unknown key, so neither key can be seeded through the API — and the parent forbade the only other mechanism (`"No migration is involved"`). Followed literally, **the first live run aborts and writes nothing, forever** |
| **F-5** | WARN (both) | **Dry-run C-3 has no field to report into and no gate.** No `activePopulation`, `ceiling` or `ceilingBreached` in the summary; `abortReason` is set only on abort. A dry-run breach reports `deactivated = N` with nothing saying the live run will stop. And *"raise the ceiling for one run"* has **no step restoring it** |
| **F-8** | SEVERE (B) | **Pre-write-skipped staff members drop out of matching entirely, so their live accounts are deactivated.** A staff member **on the Alliance list** who arrives with a null email has their account retired across three tables — J-3's outcome, reintroduced through R-4/R-5's plumbing |
| **F-10** | WARN (B) | **The EX-3 pre-pass counts inactive rows toward key ambiguity**, so any already-inactive duplicate shields its active sibling from deactivation permanently. **Sharper under the email-only ruling** — the email key is now the *only* key, so every duplicate-email pair in live data feeds straight into EX-3 |
| ~~**F-9**~~ | — | ~~The tie-break has no carnet-over-email rule and can manufacture an RSK-1 duplicate~~ — **DISSOLVED 2026-09-14** by the email-only matching ruling. There is no second key, so there is no cross-key tie-break and no `OQ-3` conflict. Recorded so a reader of the inherited ledger does not go looking for a fix that has no target |
| **F-11** | WARN (A) | **Seven round-2 rules are stated but ungated** — C-3's dry-run behaviour, C-3's unset abort, the C-2 skip adjustment, and matched-inactive's no-refresh rule among them |
| **W-1** | WARN (both) | **EX-1's `status_id = 4` is unverified.** `user_status` is schema-only: no seed migration, no enum in the codebase, contents never read. If `4` is not "external", EX-1 shields the wrong population — the counter-example `{1: Active, 2: Inactive, 3: External, 4: Pending}` mass-deactivates every external user |
| **W-6** | WARN (A) | C-2 can abort **healthy** runs: `totalElements` is read before the page loop, so a hire or edit mid-run shifts the total by one |
| **W-9** | WARN (A) | DD-5's transaction has **no stated isolation level, lock timeout, chunk ceiling or id ordering**. Row locks on hundreds of `sec_users` rows block concurrent logins writing `last_login_at`; unordered chunks invite deadlocks |
| **W-10** | WARN (B) | `AppSecretRepository` depends on `CurrentUserUtil`, which is `Scope.REQUEST` — injecting it drags request scope through a service the controller does not await |
| **RSK-6** | — | **Pre-existing live auth hole, not introduced here.** `AppSecretsService.validation()` returns `isValid` **independently of whether a user was resolved**, so a machine token whose responsible user is inactive authenticates with `req.user = null` and reaches every handler carrying no `@Roles` decorator. This is *why* the `app_secrets` cascade is necessary for **correctness**, not merely for the record. Worth its own bugfix spec |

**Also carried:** J-6's verified mechanism — `AppSecretRepository` extends `Repository<AppSecret>` bound to the **injected root `EntityManager`**, so it structurally cannot join a transaction. The `app_secrets` write must go through the transaction's `manager.getRepository(AppSecret)`. In-repo precedent: `app-secrets.service.ts:44-53`.

---

## 5. Open questions for `/akili-specify`

| # | Question | Default if unanswered |
| --- | --- | --- |
| ~~**OQ-5**~~ | ~~Reactivate an account when its staff member reappears?~~ | ✅ **RESOLVED 2026-09-14 (user): yes** — `sec_users` + `sec_user_roles` role 3 only, never `app_secrets`. **Implemented in the sibling spec**, not here. See the callout in §3 for what it invalidates in the inherited ledger |
| **OQ-6** | Should the first run be dry-run only? | **Yes, recommended.** Nothing else can measure the real blast radius. ⚠️ Re-argue the strength of this given that `OQ-5` now makes a false deactivation recoverable |
| **OQ-D2** | Where does the dry-run flag live — `app_config`, env var, query param? | `app_config`, matching platform convention. ⚠️ **5-minute TTL cache (K-016)** — a flip is not in effect when saved, and re-saving restarts the window |
| **NEW-1** | Given **F-2**, how do `ceilingFraction` and `absoluteFloor` actually get their first value? A seed migration, an env var, or a code constant with `app_config` as an override? | Unresolved. **This is the first thing specify must settle** — the parent spec's answer was incoherent |
| **NEW-2** | Given **F-8**, does a pre-write-skipped staff member still participate in matching? | **It must.** Skipping a *write* is not the same as declaring the person absent. Specify must state it and gate it |
| **NEW-3** | **C-2 counts distinct carnets, but matching is now by email.** A staff member with a valid carnet and a null/empty email is counted as present by C-2, yet can match nothing — so the account they *would* have matched falls to deactivation. Is the completeness measure still the right one, and should it count distinct **emails** instead? | Unresolved. This is **F-8's shape reached through a different door**, and it did not exist before the email-only ruling. Settle it alongside NEW-2. ⚠️ **Re-read this against `DD-14`** (see below) — the sibling now collapses the payload by email *before* matching, which changes what "distinct" can even mean here |
| **NEW-4** | **The sibling's `DD-14` collapses `allStaff` to one member per email before matching.** Every collapsed loser is a staff member who **is** on the Alliance list and who now participates in no match. Does the account they would have matched fall to deactivation? | **It must not** — this is `F-8`/`NEW-2` in its third form, and the most reachable one, because collapsing is now a *normal* operation rather than an error path. Specify must state that a collapsed member still shields whatever their email would have matched |

---

## 6. Verification reality, stated up front (KZ-017)

| Limit | Consequence |
| --- | --- |
| `npm test` has `rootDir: src` and **never runs `test/fixtures/`** | A green `npm test` is not evidence for any DB-level claim here |
| Fixtures run against the **disposable scratch schema** | Nothing in this repo says anything about the real composition of Dev or Prod `sec_users` |
| **No automated gate can measure the real deactivation population** | The substitute is a human pre-flight: a dry run against Dev, read before any live run. This is the accepted risk, recorded rather than solved |
| `user_status` contents were never readable (DEP-1) | **W-1 stays open until someone runs `SELECT * FROM user_status`.** One query closes it |

---

## 7. Recommended next step

```
/akili-specify docs/specs/changes/agresso-staff-deactivation
```

Start with **NEW-1** and **NEW-2** — both are unresolved contradictions, and both were produced by corrections rather than by the original design. Run `judgment-day` on the finished design with a **fresh** lineage; this spec has spent none of its rounds.

---

## ⚠️ Cross-spec impact — the payload is now filtered to ACTIVE staff (2026-09-15)

**Recorded by the sibling spec `changes/agresso-staff-sec-users-sync` during its execution. Read this before specifying deactivation.**

`agresso-staff-tools.service.ts`'s `private query()` now appends Agresso's documented **`?status=active`** parameter, so `cloneAllAgressoStaff` fetches **only active employees**. This was added to close that spec's `RSK-9` (provisioning and reactivating departed staff) at the source, after a pre-flight showed `alliance_user_staff.status` holds only `{'N', NULL}` and therefore cannot discriminate anything.

**For the additive spec this is unambiguously good. For THIS spec it moves the risk in the dangerous direction, and it changes what an absent member MEANS.**

| | Before the filter | After the filter |
| --- | --- | --- |
| A member absent from the payload | "not on the Alliance staff list" | "not on the list, **OR inactive in Agresso, OR a page that failed to fetch**" |

Deactivation decides whom to switch off **by absence**. The absent population has just grown to include everyone Agresso marks non-active — a set this spec has never measured and whose size is unknown. Concretely:

1. **`C-1` / `C-2` / `C-3` become more load-bearing, not less.** The completeness guard exists because `base()` catches a fetch error and returns `[]`, making an empty page indistinguishable from a failed one. That ambiguity now sits on top of a payload that is *already* a subset of the staff table, so a short payload is even harder to tell from a legitimately smaller one.
2. **`EX-1` (externals exempt) interacts with this.** An external user was never in the Agresso payload at all; now a *genuine but non-active* staff member is also absent, and the two are indistinguishable by absence alone.
3. **The `OQ-7` ruling assumed an unfiltered payload.** That ruling — *"staff users are governed by the staff list; only externals are genuinely suspended"* — was made when the payload carried every employee. With `?status=active`, "on the staff list" and "in the payload" are no longer the same set, and the ruling should be re-confirmed with the user rather than inherited.

**Before specifying deactivation, measure the delta:** compare `totalElements` from the employees endpoint with and without `?status=active`. If the gap is large, absence-based deactivation is operating on a much bigger candidate set than the parent spec's analysis assumed.

### ✅ User ruling 2026-09-15 — the filter STAYS; the growth is accepted

Put to the user with the trade-off stated. Ruling: *"si crece pero son cambios necesarios"* — **yes, the absent population grows, and the change is necessary anyway.** `?status=active` is permanent and is not to be reverted to make this spec's job easier.

**What the ruling settles, and what it explicitly does not.** It settles *which* trade-off the platform takes: a filtered fetch, accepting a larger absent population, rather than an unfiltered one that would provision and reactivate departed staff. It does **not** reduce this spec's obligations — it **raises** them. Deactivation still decides by absence, and absence is now a broader, less specific signal than the parent spec's analysis assumed.

**Therefore, binding on this spec:**

1. **`C-1` / `C-2` / `C-3` are not optional and not negotiable down.** They were already mandatory here; the ruling makes them the only thing standing between a short payload and a mass deactivation of people who are merely non-active in Agresso.
2. **`EX-1` must be re-derived, not inherited.** "External user" and "genuinely non-active staff member" are now both simply *absent*, and `EX-1`'s original formulation assumed absence meant only the former.
3. **`OQ-7` must be re-asked, not carried.** Its ruling — *"staff users are governed by the staff list; only externals are genuinely suspended"* — was given when the payload carried every employee. With the filter, **"on the staff list" and "in the payload" are different sets**, which is precisely the premise that ruling rested on.
4. **Measure the delta before specifying:** `totalElements` with and without `?status=active`. That number is the size of the newly-absent population, and no requirement here should be written without it.

**This note is now a recorded decision, not an open question.** What remains open is how this spec absorbs it.
