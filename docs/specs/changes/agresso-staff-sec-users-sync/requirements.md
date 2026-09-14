# Requirements — Agresso Staff / Provision and restore platform accounts from the staff sync

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/agresso-staff-sec-users-sync` |
| Depth | **Full** — no DDL and nothing destructive, but the spec **grants authorization** (`CONTRIBUTOR`), **restores** it (`R-AGS-007`), and mutates `sec_users`, the table Cognito identities resolve against |
| Mode | Change |
| Type | Change — platform accounts provisioned and restored from the Alliance staff sync |
| Status | **Draft** — awaiting Phase 1 approval |
| Date | 2026-09-14 |
| Approval Mode | gated |
| Related | `result.repository.ts` — `findUserByEmailOrCarnet` / `createUserInSecUsers` / `unpdateCarnetUser`, the existing find-or-create pattern this spec is the fourth consumer of |
| Sibling spec | [`changes/agresso-staff-deactivation`](../agresso-staff-deactivation/proposal.md) — the destructive half |

---

> ## The split, and the invariant that defines it
>
> **This spec only ever writes `is_active = 1`. Its sibling only ever writes `is_active = 0`.**
>
> On 2026-09-14 this spec's Judgment Day lineage was declared **ESCALATED** — two fix rounds and two
> scoped re-judgments spent without convergence. The ledger's measurement was unambiguous:
>
> | Half | Severe findings across 3 passes, 2 judges, 2 model families |
> | --- | --- |
> | Additive (`R-AGS-001…004`, `R-AGS-006`) | **0** |
> | Destructive (`R-AGS-005` + its guard) | **all of them** |
>
> `R-AGS-005` — deactivation, EX-1/EX-2/EX-3, C-1/C-2/C-3, the three-table cascade and the dry run —
> **moved out** to the sibling spec, which starts a fresh review lineage carrying the full ledger as
> evidence. Requirement IDs are **not renumbered**: every finding in [`judgment.md`](./judgment.md)
> still maps to the id it was written against. `R-AGS-005` appears in §11's index as *moved*, never
> reused.
>
> **The one open finding that stayed here is `F-3`** (the role-grant assertion), fixed in `R-AGS-004`
> AC.4 below. `F-1`, `F-2`, `F-5`, `F-8` and `F-10` left with `R-AGS-005` — not patched, **removed by
> construction**, because every one of them is a defect in machinery that no longer exists here.

---

## 1. Context

### Executive summary

`cloneAllAgressoStaff` refreshes `alliance_user_staff` from Agresso and stops there. Nothing propagates into `sec_users`, so a new Alliance employee has no platform account until some *other* flow happens to create one — today that happens incidentally, as a side effect of a TIP, PRMS, or result-authoring lookup.

This spec makes the staff sync **own the provisioning of platform accounts**: every synced staff member is reconciled against `sec_users` and routed to exactly one of three outcomes — **created** if they have no account, **refreshed** if they have a working one, or **reactivated** if they have one that was switched off while they were away.

**Nothing here can take access away.** The spec inserts rows, fills empty fields, and turns accounts on. The only access it narrows is the sync endpoint's own trigger (`R-AGS-006`), which it restricts to `SYSTEM_ADMIN`.

### Two rulings that shape everything below

| Ruling (user, 2026-09-14) | Consequence |
| --- | --- |
| **Matching is by `email` only.** It is the only column on which `sec_users` and `alliance_user_staff` can be compared | `carnet` is **written, never matched on**. `ASM-2` (carnet as the stronger key) is withdrawn; `OQ-3` and Judgment Day `F-9` **dissolve** — with one key there is no cross-key conflict and no tie-break between keys |
| **A returning staff member is reactivated** — `sec_users` + `sec_user_roles` (role 3 only), never `app_secrets` | The `matchedInactive` dead-end class becomes a **write path** (`R-AGS-007`). Deactivation is no longer one-way, which makes a sibling-spec false positive **recoverable** |

### The problem, concretely

| Today | Consequence |
| --- | --- |
| `cloneAllAgressoStaff` writes only `alliance_user_staff` | A new hire exists as *staff* but has no `sec_users` row |
| Account creation is a side effect of `tip-integration`, `prms.opensearch` and `results.service` | An employee who is never referenced by an integration never gets an account |
| `sec_users.carnet` is nullable and often empty | Staff-to-account joins in **other** callers (`findUserByEmailOrCarnet`) fail silently for accounts created before their carnet was known |
| An account switched off while someone was away stays off | A returning employee is locked out even though they are back on the staff list |

### Glossary

| Term | Meaning |
| --- | --- |
| **carnet** | Alliance employee id (`resourceId` in the Agresso payload). PK of `alliance_user_staff`; nullable, non-unique column on `sec_users`. **Not a match key in this spec** |
| **staff member** | A row arriving in the Agresso employees payload for this run |
| **platform account** | A `sec_users` row — what authorization and attribution resolve against |
| **reconcile** | Match a staff member to a platform account by email, then create, refresh, or reactivate it |

### System context & scope

**In scope:** the reconciliation pass that runs as part of `cloneAllAgressoStaff`, writing to `sec_users` and `sec_user_roles`.

**Out of scope, explicitly:**

| Excluded | Why |
| --- | --- |
| **Deactivating** any account, role, or secret | Moved to [`changes/agresso-staff-deactivation`](../agresso-staff-deactivation/proposal.md). This spec writes no `is_active = 0`, anywhere |
| **`app_secrets`**, in any direction | Deactivation is the sibling's; re-arming a machine credential on reactivation is **ruled out** (`R-AGS-007`). This spec never reads or writes the table |
| Changing `findUserByEmail`'s `LIKE` matching for its three existing callers | Shared method; changing it alters `tip-integration`, `prms.opensearch` and `results.service` behaviour. See `R-AGS-002` for what this spec does instead |
| **Deduplicating** pre-existing `sec_users` rows that share an email | RSK-1. Matching resolves ambiguity deterministically and reports it; repairing the data is not this spec's job |
| Restoring **roles other than `CONTRIBUTOR`** on reactivation | User ruling. A returning center admin comes back as a contributor; re-granting the rest is a human act (`R-AGS-007`, RSK-7) |
| Syncing `alliance_user_staff.position` | The Agresso payload (`AgressoStaffRawDto`) carries no position field; the column is unmapped today and stays unmapped |

### Stakeholders

| Persona | Interest |
| --- | --- |
| Alliance staff member | Has a working platform account from day one, without a support ticket |
| Returning staff member | Gets their account back when they return to the staff list |
| MEL / center admin | Does not hand-create or hand-restore accounts |
| Platform operator | Runs the sync and needs it to be safely re-runnable |

---

## 2. Requirement numbering

Module slug **`AGS`** (Agresso Staff). Ids are stable across the split — see the callout above.

---

## 3. Functional requirements

### R-AGS-001 — The staff sync reconciles every synced member against `sec_users`

- **As a** platform operator
- **I want** the Agresso staff sync to reconcile each staff member against `sec_users`
- **So that** platform accounts follow the Alliance staff list instead of being created by accident

**Details:**

- **Inputs:** the staff members returned by the current run, and **every** `sec_users` row — active *and* inactive (Judgment Day J-4).
- **Matching key:** **`email` only**, compared exactly on both sides after trimming and lower-casing. Never `LIKE`.
- **Behavior:** after `alliance_user_staff` is written, each staff member is matched to at most one `sec_users` row and routed to exactly one of: **refresh** (`R-AGS-002`), **create** (`R-AGS-003`), or **reactivate** (`R-AGS-007`).
- **Outputs:** no API response change. `GET clone/execute` keeps returning its fire-and-forget acknowledgement.
- **Permissions:** `SYSTEM_ADMIN` only, enforced at the trigger by `R-AGS-006`.

**Acceptance criteria:**

- [ ] AC.1 — After a run over N staff members with usable emails, every one of the N has exactly one matching `sec_users` row — **counting inactive rows**, so a returning employee never receives a second account.
- [ ] AC.2 — Running the sync twice over identical input produces the **same** `sec_users` and `sec_user_roles` row counts as running it once.
- [ ] AC.3 — A `sec_users` row that matches no staff member is left **byte-identical** — every column, `updated_at` included. This spec has no unmatched-row write path at all.
- [ ] AC.4 — The run reconciles only staff members whose email is usable; the rest are skipped and counted (`R-AGS-003` AC.3).

#### Scenario: Matching does not cross to a different person

- GIVEN `sec_users` contains `ana@alliance.org` and the payload carries a staff member with email `susana@alliance.org`
- WHEN reconciliation matches that staff member
- THEN it resolves to the `susana@alliance.org` account, or to none
- BUT it must NOT resolve to `ana@alliance.org`
- AND IT MUST use exact matching, not the substring `LIKE` used by `findUserByEmail`

#### Scenario: An account nobody matched is not touched

- GIVEN an active `sec_users` row whose email appears in no staff member of this run
- WHEN reconciliation completes
- THEN that row is byte-identical, `updated_at` included
- BUT it must NOT be deactivated — **this spec has no deactivation path**; that behaviour belongs to the sibling spec
- AND IT MUST NOT have its roles altered in any direction

#### Scenario: A failed page reconciles less, and nothing more

- GIVEN page 2 of 3 fails to fetch, so `base()` returns an empty array for it
- WHEN the run reaches the reconciliation pass
- THEN the members from pages 1 and 3 are reconciled normally and the failure is logged at `error`
- BUT it must NOT abort — a partial payload here means *fewer people provisioned this run*, which the next run corrects
- AND IT MUST leave `alliance_user_staff` exactly as the successful pages wrote it

> **Why there is no completeness guard here, and why the sibling has three.** In the parent spec, an
> incomplete payload meant *"these people are not staff"* and fed a mass deactivation — the single most
> damaging failure available. The guard (`C-1`/`C-2`/`C-3`) existed entirely to make that unreachable.
> With no deactivation path, a short payload is **benign by construction**: it provisions fewer people
> and the next run picks them up. The guard moved out with the requirement it was defending, and
> `F-1`/`F-2` — both defects *in that guard* — left with it. **The sibling spec must reintroduce all
> three; they are not optional there.**

#### Scenario: Two accounts share an email

- GIVEN two `sec_users` rows carry `j.doe@alliance.org` — one active, one inactive — and a staff member arrives with that email
- WHEN reconciliation resolves the match
- THEN the **active** row is chosen and refreshed
- AND both candidates are reported as an ambiguous match in the run summary
- BUT it must NOT reactivate the inactive row — a second active row for one person is the duplicate this spec declines to create
- AND IT MUST resolve deterministically, so two runs over the same data choose the same row

---

### R-AGS-002 — An existing active account is refreshed, and its carnet is only ever filled in, never overwritten

- **As an** Alliance staff member who already has an account
- **I want** my name kept current and my carnet filled in if it was missing
- **So that** attribution and staff joins resolve correctly

**Details:**

- **Inputs:** a matched **active** `sec_users` row and its staff member. A staff member matching only a deactivated row is `R-AGS-007`'s, not this requirement's.
- **Behavior:**
  - `first_name` and `last_name` are set from the staff member, **truncated to 60 characters** (the column width) rather than rejected — a name is display data, and failing a whole run over a long one is the worse outcome.
  - `carnet` is set **only when the stored value is null, empty or whitespace-only**. A stored carnet is never replaced.
  - `email` is **not** written — it is the match key and the Cognito login identity. See OQ-2.
  - `status_id`, `is_active`, `last_login_at` and `deleted_at` are never written by this spec.
- **Permissions:** unchanged.

**Acceptance criteria:**

- [ ] AC.1 — An account with `carnet = NULL` matched by email receives the staff member's carnet.
- [ ] AC.2 — An account with a non-empty carnet that differs from the staff member's keeps **its own** stored carnet, and the conflict is logged at `warn` with both values.
- [ ] AC.3 — `first_name` and `last_name` reflect the staff member after the run, truncated at 60 characters.
- [ ] AC.4 — `status_id`, `is_active` and `email` hold the same values before and after the run.

#### Scenario: Carnet backfill on an account that lacks one

- GIVEN a `sec_users` row with `carnet = NULL` whose email matches a staff member
- WHEN reconciliation runs
- THEN that row's `carnet` is the staff member's carnet
- AND its `first_name` / `last_name` match the staff member
- BUT it must NOT change `status_id`, `is_active`, or `email`
- AND IT MUST NOT create a second `sec_users` row for the same person

#### Scenario: A stored carnet is authoritative

- GIVEN a `sec_users` row whose `carnet` is `'12345'` and whose email matches a staff member carrying carnet `'99999'`
- WHEN reconciliation runs
- THEN the row's carnet is still `'12345'`
- BUT it must NOT be overwritten with `'99999'` — a carnet conflict is reported, not resolved
- AND IT MUST apply the empty-check in **SQL**, so a bug in the batch-building code still cannot overwrite a stored carnet

#### Scenario: An over-length name does not fail the run

- GIVEN a staff member whose `firstName` is 75 characters and whose email matches an account
- WHEN reconciliation runs
- THEN the account's `first_name` holds the first 60 characters and the truncation is logged at `warn`
- BUT it must NOT abort the run or roll back the transaction — under MySQL strict mode an unhandled over-length value would do exactly that *(Judgment Day W-4)*
- AND IT MUST apply the same rule to `last_name`

---

### R-AGS-003 — A staff member with no account gets one

- **As a** new Alliance employee
- **I want** a platform account to exist as soon as I appear in the staff list
- **So that** I can be assigned work without a support request

**Details:**

- **Inputs:** a staff member whose email matched **no `sec_users` row at all — active or inactive**. A match against a deactivated row is a reactivate, never a create (Judgment Day J-4).
- **Behavior:** a `sec_users` row is created with `first_name`, `last_name` (truncated at 60), `email` and `carnet` from the staff member, `is_active = TRUE`, and **`status_id = 1`** — the same value `createUserInSecUsers` already uses (user ruling 2026-09-14, closing OQ-1).
- **Payload collisions:** the payload is **collapsed to one member per `lower(trim(email))`** — **the first member in payload order wins** *(user ruling 2026-09-14)*; every later member with that key is counted in `payloadEmailCollisions` and logged at `warn` with both carnets. Validation runs **before** the collapse, so a skipped member is never reported as a collision. Two staff records may legitimately carry one email (`alliance_user_staff.email` is nullable with no unique index; `carnet` is the PK), and without this both would be classified *create* *(lineage-2 **M-4**)*.
- **Errors — skipped and logged, never inserted:**
  - email null, empty, or whitespace-only — `sec_users.email` is `NOT NULL`, and it is the match key;
  - email longer than **150** characters (the column width) — truncating an identity is never correct;
  - carnet longer than **10** characters — the column width; the carnet is written, so it must fit.

**Acceptance criteria:**

- [ ] AC.1 — A staff member absent from `sec_users` has exactly one row after the run, carrying their carnet.
- [ ] AC.2 — A second run over the same payload creates **no** additional row for that person.
- [ ] AC.3 — A staff member whose email is null, empty or over 150 characters produces no row and one `warn` log naming their carnet; a carnet over 10 characters does the same.
- [ ] AC.4 — The created row's `is_active` is `TRUE` and its `status_id` is `1`.
- [ ] AC.5 — A staff member whose only `sec_users` row is deactivated produces **no** new row — they are `R-AGS-007`'s.
- [ ] AC.6 — Two staff members sharing an email produce **exactly one** `sec_users` row between them, one `CONTRIBUTOR` grant, and one `payloadEmailCollisions` entry naming both carnets.

#### Scenario: New hire is provisioned

- GIVEN a staff member whose email matches no `sec_users` row
- WHEN reconciliation runs
- THEN one `sec_users` row exists for them with their carnet, names and email
- AND `is_active` is `TRUE`
- BUT it must NOT create a duplicate when the sync runs again with the same payload
- AND IT MUST NOT insert a row when the staff member's email is null, empty, or over 150 characters

> **A skipped member is skipped, not declared absent.** They are excluded from *writes* only. This
> distinction is inert here — nothing happens to an unmatched account — but it is the exact shape of
> Judgment Day **F-8** in the sibling spec, where treating a skipped member as absent deactivates the
> live account of someone who is **on the staff list**. Stated here so the sibling inherits the rule
> rather than rediscovering the defect.

---

### R-AGS-004 — A newly created account receives the `CONTRIBUTOR` role

- **As a** platform operator
- **I want** every account this sync creates to carry the baseline role
- **So that** a provisioned user can actually use the platform

**Details:**

- **Inputs:** a `sec_users` row created by `R-AGS-003`.
- **Behavior:** one `sec_user_roles` row is inserted with `role_id = 3` (`SecRolesEnum.CONTRIBUTOR`, verified at `src/domain/shared/enum/sec_role.enum.ts:4`) and `is_active = TRUE`.
- **The target id set MUST NOT be resolved by email** — `sec_users.email` has no unique index, so an email-keyed re-select can return rows this spec did not create (Judgment Day J-5). It is resolved by `carnet` + `is_active = 1` + `created_at >= runStart`, where `runStart` is read from the **database clock on the transaction's own connection**, never a Node `Date` *(Judgment Day R-5)*, **and is the transaction's FIRST statement, issued before any insert** *(lineage-2 **M-1**)*. `NOW(6)` returns the start of its own statement, so a `runStart` sampled after the insert is later than every `created_at` it is meant to bracket — the re-select returns nothing and AC.4 aborts every run that creates anybody.
- **Blast radius of a failed assertion:** create and grant run inside a **`SAVEPOINT`**, so a failure rolls back **only that sub-batch**. Refreshes (`R-AGS-002`) and reactivations (`R-AGS-007`) already applied in the same transaction **survive and commit**, and the run reports `abortReason = GRANT_ASSERTION` *(lineage-2 **M-5**)*.
- **Permissions:** this requirement **grants authorization**. It applies only to rows this spec creates.

**Acceptance criteria:**

- [ ] AC.1 — An account created by this sync has exactly one active `sec_user_roles` row with `role_id = 3`.
- [ ] AC.2 — An account that already existed gains **no** role row from this requirement, whatever roles it holds or lacks — including a pre-existing deactivated row that shares an email with a newly created one.
- [ ] AC.3 — Two runs over the same payload leave exactly one role row for a created account, not two.
- [ ] AC.4 — **The grant proceeds only when the re-selected rows match the inserted rows on BOTH counts: the set of carnets is equal, AND the row count is equal.** Either check failing rolls back to the `create_grant` savepoint and grants nothing.
- [ ] AC.5 — When that rollback fires, **no `sec_users` row is created and no role row is granted, while every refresh and every reactivation from the same run is still committed**, and the summary carries `abortReason = GRANT_ASSERTION`, **`created = 0` and `rolesGranted = 0`** — the *attempted* figure, if kept at all, goes in `createsDiscarded`. *(Judgment Day **RA-10**: with no defined value, an implementer reports `created = 47` for a run that created nobody — on the run's only feedback channel.)*
- [ ] AC.6 — `runStart` is read **before** the first insert. A run whose `runStart` is sampled after the insert creates no account at all — that is the failure this criterion exists to make visible.

#### Scenario: The baseline role is granted once

- GIVEN a staff member with no `sec_users` row
- WHEN reconciliation creates their account
- THEN exactly one `sec_user_roles` row exists for them with `role_id = 3` and `is_active = TRUE`
- BUT it must NOT grant a role to an account that already existed before this run
- AND IT MUST NOT create a second role row when the sync runs again — `sec_user_roles` has **no** unique index on `(user_id, role_id)`, so idempotence is the code's responsibility

#### Scenario: A concurrent insert of the same new hire aborts the grant

- GIVEN this run inserts one account with carnet `A100`
- AND another code path (`createUserInSecUsers`) inserts a second row with the same carnet inside the same window
- WHEN the re-select runs
- THEN it returns **two** rows for carnet `A100`, so the **count** differs from the inserted count while the **carnet set** is identical
- AND the run **rolls back to the `create_grant` savepoint**, granting nothing and creating nobody
- AND every refresh and every reactivation already applied in the same transaction **still commits**, with `abortReason = GRANT_ASSERTION` in the summary
- BUT it must NOT roll back the whole transaction — this collision is reachable in ordinary operation, and discarding a thousand refreshes over one concurrent insert is the disproportionate outcome `M-5` exists to prevent
- BUT it must NOT pass on set-equality alone — a duplicate carnet has the same set and a different count, which is exactly how a role lands on a row this spec did not create
- AND IT MUST NOT pass on count-equality alone either — one missed insert plus one foreign row balances the count while addressing the wrong rows

> **Judgment Day F-3, the one open severe finding that stayed with this spec.** The parent documents
> stated **set**-equality in one place and **count**-equality in four, and Judge B demonstrated that
> *neither is sufficient alone*. AC.4 requires **both**, and the scenario above is the input that
> falsifies each one separately. This is the only inherited finding fixed by amendment rather than by
> removal.

---

### R-AGS-007 — A returning staff member's deactivated account is reactivated

> **New requirement, user ruling 2026-09-14.** It reverses `OQ-5`'s former default and replaces the
> parent spec's `matchedInactive` dead-end class with a write path.

- **As a** returning Alliance staff member
- **I want** my existing account switched back on when I reappear on the staff list
- **So that** I keep my identity, my id, and my history instead of getting a second account

**Details:**

- **Inputs:** a staff member whose email matched **one or more** `sec_users` rows, **all of them inactive**. Exactly one of them is reactivated — selected by the tie-break in `design.md` §5.2 — and every other candidate **stays inactive** and is reported. A staff member matching *any* active row is `R-AGS-002`'s, not this requirement's. *(Corrected 2026-09-14, Judgment Day lineage-2 **M-3**: this read "matched **exactly one** row", which left a member matching two inactive rows satisfying no requirement at all while `design.md` quietly reactivated one — the same contradiction class as the first lineage's J-2.)*
- **Behavior — two tables only:**

| Table | Write |
| --- | --- |
| `sec_users` | `is_active = 1` on the matched row. `status_id`, `email`, `deleted_at` and `last_login_at` are **not** written |
| `sec_user_roles` | The user ends the run holding **exactly one active `role_id = 3` row**, by three disjoint cases: **(a)** an active one already exists → **no statement is issued**; **(b)** one or more *inactive* `role_id = 3` rows and no active one → **exactly one** of them is set `is_active = 1` (the lowest `sec_user_role_id`) and the rest stay inactive; **(c)** no `role_id = 3` row at all → one is inserted. *(Case (b)'s "exactly one" is load-bearing — `sec_user_roles` has **no unique index on `(user_id, role_id)`**, so an update keyed on `user_id` flips a pre-existing duplicate pair into two active rows. Judgment Day lineage-2 **M-2**.)* |

- **The account is also refreshed** — names and carnet backfill per `R-AGS-002` — because a returning employee's details are as stale as anyone's.
- **Explicitly NOT written:**
  - **`app_secrets`** — a machine credential is never silently re-armed. Re-issuing one is a human act.
  - **Any role other than 3.** A user who held `CENTER_ADMIN` before deactivation returns as a plain contributor; those rows stay inactive.

**Acceptance criteria:**

- [ ] AC.1 — A staff member whose matching accounts are all inactive has **exactly one** of them `is_active = 1` after the run, **with its original `sec_user_id`**.
- [ ] AC.2 — When two or more inactive rows match, the rows the tie-break did **not** select are byte-identical after the run, and all candidates appear in `ambiguousMatches`.
- [ ] AC.3 — That user ends the run holding **at least one active `role_id = 3` row, and no more of them than before**. Starting from one inactive, two inactive, one active, or none, the result is exactly one. *(Scoped per Judgment Day **RA-9**: a user who already held **two active** role-3 rows keeps two — branch (a) issues no statement, and reducing them would need an `is_active = 0` write, which **NG-6** forbids outright. That is RSK-1's class: reported, not repaired.)*
- [ ] AC.4 — No `sec_users` row is created for that staff member.
- [ ] AC.5 — Role rows other than `role_id = 3` are **byte-identical** after the run, including any inactive `role_id = 1` or `role_id = 9`.
- [ ] AC.6 — No `app_secrets` row changes. This spec issues no statement against that table.
- [ ] AC.7 — Two runs over the same payload leave the same number of active `role_id = 3` rows as one run.
- [ ] AC.8 — The run summary reports `reactivated`, `rolesReactivated` (case b) and `rolesGrantedOnReactivation` (case c) as **distinct** counts *(RB-10: branch (c)'s insert previously incremented neither)*.

#### Scenario: A rehired employee gets their original account back

- GIVEN a `sec_users` row with `is_active = 0`, `sec_user_id = 50`, email `a@alliance.org`, and an inactive `role_id = 3` row
- WHEN a staff member with that email arrives in the payload
- THEN row 50 has `is_active = 1` and its `role_id = 3` row has `is_active = 1`
- AND its names and carnet are refreshed per `R-AGS-002`
- BUT it must NOT create a new `sec_users` row — the person keeps id 50, and with it their attribution history
- AND IT MUST NOT reactivate any `app_secrets` row, nor any role other than 3

#### Scenario: A returning admin comes back as a contributor

- GIVEN an inactive account holding an inactive `role_id = 1` row and no `role_id = 3` row
- WHEN their staff member reappears
- THEN the account is active and holds exactly one active `role_id = 3` row
- AND the `role_id = 1` row is still inactive
- BUT it must NOT restore the admin role — re-granting elevated access is a human decision, never a side effect of a staff sync
- AND IT MUST log the reactivation at `warn` naming the roles left inactive, so the gap is discoverable by whoever needs to restore them

#### Scenario: Two dormant accounts share the returning employee's email

- GIVEN two `sec_users` rows both carrying `j.doe@alliance.org`, both `is_active = 0` — `{id: 10, last_login_at: NULL}` and `{id: 20, last_login_at: 2025-06-01}`
- WHEN that staff member reappears in the payload
- THEN exactly one row is reactivated — id 20, by the tie-break's `last_login_at` rule
- AND row 10 is byte-identical, `updated_at` included
- AND both ids are reported in `ambiguousMatches`
- BUT it must NOT reactivate both — that hands one person two working accounts, which is the duplicate this spec exists not to create
- AND IT MUST resolve deterministically, so a second run selects the same row

> ### The suspension question, ruled — `OQ-7` CLOSED
>
> The concern was: `R-AGS-007` reactivates accounts deactivated by *any* means, and nothing in
> `sec_users` records *why* a row was switched off — so a hand-suspended account held by a current
> staff member would come back on every run.
>
> **User ruling 2026-09-14: this is not a real scenario, and the staff list is the authority.**
> Every user who appears in the Alliance staff list is governed *by* that list. The only accounts
> anyone would genuinely suspend are **external users** — and externals never appear in an Alliance
> staff payload, so `R-AGS-007` never sees them. There is presently no mechanism to distinguish a
> suspension from an offboarding, and **none is needed**, because for staff the two are the same
> event and the staff list already decides it.
>
> **Consequence, stated so it is a decision and not a discovery:** if someone ever *does* hand-suspend
> a staff member who remains on the Alliance list, this sync will reactivate them. That is the ruled
> behaviour, not a defect. **RSK-8 is downgraded to `accepted — out of model`**, and the sibling
> spec's `EX-1` (externals exempt from deactivation) is the same rule seen from the other side.

---

### R-AGS-006 — Only a system admin can trigger the sync

- **As a** platform operator
- **I want** the staff-sync endpoint restricted to system admins
- **So that** an operation that creates accounts and grants roles is not reachable by every logged-in user

**Details:**

- **Inputs:** an authenticated request to `GET …/agresso/staff/clone/execute`.
- **Behavior:** the controller enforces `RolesGuard` with `@Roles(SecRolesEnum.SYSTEM_ADMIN)` — the pattern `ImpactOutcomesController` already uses (`impact-outcomes.controller.ts:38,143`). `SYSTEM_ADMIN` bypasses role checks platform-wide, so no second rule is needed.
- **Errors:** a caller without the role receives the standard `GlobalExceptions` forbidden response in the `ServerResponseDto` envelope.
- **Verified 2026-09-14:** `agresso-staff-tools.controller.ts` today carries only `@ApiBearerAuth()` and `@ApiTags()` — Swagger decorators, not guards — and the handler does **not** `await` the service.

> **Why this is in scope.** The endpoint's authorization gap is pre-existing, but this spec is what
> changes its consequence — from "resynced a lookup table" to "created accounts and granted roles".
> User ruling 2026-09-14, closing OQ-D1.

**Acceptance criteria:**

- [ ] AC.1 — A caller holding `SYSTEM_ADMIN` gets the existing acknowledgement and the sync starts.
- [ ] AC.2 — An authenticated caller **without** `SYSTEM_ADMIN` is refused, and **no** reconciliation runs.
- [ ] AC.3 — An unauthenticated caller is still refused by `JwtMiddleware`, unchanged.

#### Scenario: A contributor cannot trigger the sync

- GIVEN an authenticated user whose only role is `CONTRIBUTOR` (3)
- WHEN they call `GET …/agresso/staff/clone/execute`
- THEN the request is refused
- AND no `sec_users` or `sec_user_roles` row changes
- BUT it must NOT change behaviour for a `SYSTEM_ADMIN` caller
- AND IT MUST refuse **before** the service is invoked — the controller does not await the sync, so a guard that ran late would let the work start and still return a refusal

> **A second effect, worth naming.** `RolesGuard` denies a null `req.user` **only on `@Roles`-decorated
> routes**. Adding the decorator therefore also closes this route against RSK-6's null-user machine
> token. It is a side benefit on one endpoint, **not** a fix for RSK-6 — see §8.

---

## 4. Non-functional requirements

### NFR-AGS-001 — Reconciliation is idempotent

- **Category:** reliability
- **Target:** running the sync N times over an unchanged payload produces the same `sec_users` and `sec_user_roles` row counts, and the same `is_active` values, as running it once.
- **How verified:** a fixture that runs the reconciliation twice and asserts both counts and the active-role count.

### NFR-AGS-002 — Reconciliation does not degrade the sync into per-row round trips

- **Category:** performance
- **Target:** statement count is **`O(⌈n / CHUNK⌉)`** with `CHUNK` a fixed constant, **not `O(n)`** *(reworded per Judgment Day G-3 — the parent's "bounded by page count" fought a compliant chunked implementation and could not be asserted exactly)*.
- **How verified:** a fixture seeding ≥ 50 members counts statements and asserts the **exact** expected number for the fixed chunk size; a second run at ≥ 100 members asserts the count grows by chunk, not by member.

### NFR-AGS-003 — Every write is attributable

- **Category:** observability
- **Target:** the pass logs, at `log` level, a per-run summary: `staffFetched`, `matched`, `created`, `carnetBackfilled`, `namesRefreshed`, `namesTruncated`, `rolesGranted`, **`reactivated`**, **`rolesReactivated`**, `skippedUnusableEmail`, `skippedCarnetTooLong`, `carnetConflicts`, `ambiguousMatches`, **`payloadEmailCollisions`** *(M-4)*, **`rolesLeftInactive`**, **`rolesGrantedOnReactivation`** *(RB-10)*, **`accountsWithoutRole`** *(`OQ-D6` / RSK-10)*, **`createsDiscarded`**, and **`abortReason`** *(M-5; absent on a clean run, `GRANT_ASSERTION` when the savepoint rolled back — in which case `created` and `rolesGranted` are `0`, per `R-AGS-004` AC.5)*.
- **How verified:** unit test asserting the summary is emitted with the right counts.

> Inherited defaults not restated: `ServerResponseDto` envelope, `GlobalExceptions`, `AuditableEntity` audit fields.

---

## 5. Data requirements

Schema read from `src/db/baseline/baseline.sql` and re-verified 2026-09-14. **No DDL is added by this spec.**

| Table | Columns this spec writes | Constraint that matters |
| --- | --- | --- |
| `sec_users` | `first_name` / `last_name` (`varchar(60)`), `email` (insert only, `varchar(150) NOT NULL`), `carnet` (insert, or backfill when empty, `varchar(10)`), `status_id` (insert only), `is_active` (insert `TRUE`; **set `1` by `R-AGS-007`**) | PK `sec_user_id`; **no unique index on `email` or `carnet`**; `status_id` FK → `user_status`; charset `utf8mb3` |
| `sec_user_roles` | `user_id`, `role_id` (insert only), `is_active` (insert `TRUE`; **set `1` by `R-AGS-007`**) | FKs → `sec_users`, `sec_roles`; **no unique index on `(user_id, role_id)`** |
| `app_secrets` | **none — never read, never written** | — |
| `alliance_user_staff` | *(unchanged — written by the existing sync)* | PK `carnet` |

**The two missing unique indexes are the reason `NFR-AGS-001` exists.** The database will not stop a duplicate; only the code will.

**`utf8mb3` is PAD SPACE**, so `'A100 '` and `'A100'` compare equal in SQL but not in a JS `Map`. This no longer touches matching — the match key is `email`, indexed after trimming and lower-casing on both sides — but it **does** touch `R-AGS-004`'s re-select, where `carnet IN (…)` can return a stored `'A100 '` for an inserted `'A100'`. AC.4's count assertion is what catches it *(Judgment Day W-2, narrowed after the email-only ruling)*.

---

## 6. API surface delta

**None.** No new endpoint, no changed route, no changed response shape. `GET clone/execute` keeps its current contract.

**One delta: who may call it.** `R-AGS-006` restricts the route to `SYSTEM_ADMIN`. This is a **breaking change for any non-admin caller** — see the reversion challenge in `design.md` §12.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| `tip-integration`, `prms.opensearch`, `results.service` | **None required.** They keep their own find-or-create paths. This spec is a fourth consumer of the same pattern — see `design.md` for whether it reuses or duplicates |
| Cognito / login | **No identity is rewritten** (`R-AGS-002` does not write `email`). `R-AGS-007` restores access to an account that already exists |
| Authorization | **Widened only.** Created accounts gain `CONTRIBUTOR` (`R-AGS-004`); reactivated accounts regain it (`R-AGS-007`). Nothing is revoked |
| **Machine-token integrations** | **None.** This spec never reads or writes `app_secrets`. The cascade — and RSK-6's analysis that made it necessary — moved to the sibling spec |
| `alliance_user_staff` | Read as the reconciliation source. Not written by this spec |

---

## 8. Assumptions, dependencies, risks

| # | Item | Type | Note |
| --- | --- | --- | --- |
| ASM-1 | `role_id = 3` is `CONTRIBUTOR` | Assumption — **verified 2026-09-14** | `src/domain/shared/enum/sec_role.enum.ts:4` |
| ~~ASM-2~~ | ~~Carnet is the stronger match key, email the fallback~~ | **WITHDRAWN** | Superseded by the user's email-only ruling. Carnet is written, never matched on |
| ASM-3 | `carnet` continues to be **written** (created and backfilled) even though it is no longer a match key | Assumption — **stated, not ruled** | The ruling governs *comparison*, not storage. Backfill still serves `findUserByEmailOrCarnet`'s three existing callers, and the carnet is the only key that can identify this run's inserts (`R-AGS-004`). **Flagged for confirmation at the Phase 1 gate** |
| RSK-1 | `sec_users` has no unique index on `email` | Risk | Pre-existing duplicates make matching ambiguous. Mitigation: resolve deterministically (prefer active, then `last_login_at` recency, then lowest `sec_user_id`), report every candidate, and **never reactivate a second row for a person who already has an active one** |
| RSK-2 | `findUserByEmail` matches with `LIKE '%email%'` | Risk | Tolerable for a one-off lookup, wrong for a ~1,000-row sweep. Mitigated by `R-AGS-001`'s exact-match clause |
| RSK-3 | `GET clone/execute` has **no `@Roles(...)` guard** — only `@ApiBearerAuth()`, a Swagger decorator | Risk — **CLOSED by `R-AGS-006`** | Verified 2026-09-14 against the controller source. The route is not in the `JwtMiddleware` exclusion list, so it always required a token; what it lacked was a *role* check |
| RSK-4 | The service call is **not awaited** by the controller | Risk — **pre-existing, NOT fixed** | Verified 2026-09-14. The caller gets `200` before any work happens, so failures surface only in logs. Unchanged by this spec; it makes the run summary the sole feedback channel |
| RSK-5 | Two sibling endpoints share the same missing-guard shape: `agresso-tools.controller.ts:12` and `clarisa.controller.ts:32` | Risk — **out of scope, recorded** | Only the staff endpoint is fixed here. The other two are worth their own pass |
| RSK-6 | `AppSecretsService.validation()` returns `isValid` **independently of whether a user was resolved**, so a machine token whose responsible user is inactive authenticates with `req.user = null` and reaches any handler without `@Roles` | Risk — **pre-existing, out of scope** | Found by Judgment Day S-2. `R-AGS-006` closes it on *this* route only, as a side effect. **Still a live authorization hole elsewhere** and worth its own bugfix spec |
| **RSK-7** | A reactivated user comes back **without** their non-contributor roles | Risk — **accepted by ruling** | An admin or center admin who returns must have their elevated role re-granted by a human. `R-AGS-007`'s `warn` log is what makes the gap discoverable |
| ~~**RSK-8**~~ | ~~`R-AGS-007` reactivates accounts deactivated by hand~~ | **ACCEPTED — out of model** (user ruling 2026-09-14) | Staff users are governed by the staff list; the only accounts anyone would genuinely suspend are **externals**, who never appear in an Alliance staff payload. No mechanism to tell suspension from offboarding is needed, because for staff they are the same event. `OQ-7` closed |
| **RSK-10** | An active `sec_users` row carrying **no** active `role_id = 3` row is never repaired | Risk — **accepted by ruling** (`OQ-D6`) | Normally an **external user provisioned by a different flow**, which is why this spec must not grant to it. It is also where a savepoint-rollback orphan lands (`R-AGS-004` AC.5). Reported as `accountsWithoutRole`, never granted |
| **RSK-9** | The Agresso `status` field is **never branched on** (it *is* read and indexed by OpenSearch) | Risk — **pre-existing, sharpened here** | `AgressoStaffRawDto.status` is mapped into `alliance_user_staff.status` by `alliance-staff.mapper.ts:14`. ⚠️ *Corrected 2026-09-14 (lineage-2 **M-6**): an earlier version of this row claimed "nothing in `src/` reads it". **That was false.** `AllianceUserStaffRepository.findDataForOpenSearch` issues `this.find({ where })` — every column — and `AllianceStaffOpensearchDto.status` is an `@OpenSearchProperty({ type: 'keyword' })`, so the value **is read and indexed into OpenSearch today**. The false claim came from a grep scoped to `tools/agresso/`; **three independent parties ran that same narrow grep and got the same confident zero** — KZ-017 in its purest form. No business logic branches on the field, which is the part that was right.* If the employees endpoint returns terminated or on-leave staff, this spec **creates accounts and grants `CONTRIBUTOR` to departed people** — and `R-AGS-007` reactivates them. Judgment Day S-3, never fixed. See **OQ-8** |
| DEP-1 | Docker was unavailable when this spec was written | Dependency | `user_status` contents could not be queried. **No longer affects this spec** — OQ-1 was ruled `status_id = 1` on consistency grounds. It still blocks EX-1's verification, which the **sibling** spec inherits |

---

## 9. Open questions

| # | Question | Blocking? | Default if unanswered |
| --- | --- | --- | --- |
| ~~**OQ-1**~~ | ~~Which `status_id` should a created account carry?~~ | — | ✅ **RESOLVED 2026-09-14 (user): `status_id = 1`**, matching `createUserInSecUsers` |
| ~~**OQ-3**~~ | ~~Carnet matches one account, email a different one — which wins?~~ | — | ✅ **DISSOLVED 2026-09-14** by the email-only ruling. There is no second key |
| ~~**OQ-5**~~ | ~~Reactivate on reappearance?~~ | — | ✅ **RESOLVED 2026-09-14 (user): yes** — `R-AGS-007` |
| **OQ-2** | Should `email` be refreshed from Agresso on an existing account? | No | **No.** It is the match key *and* the Cognito login identity; overwriting it can lock a user out |
| ~~**OQ-7**~~ | ~~Should `R-AGS-007` skip deliberately suspended accounts?~~ | — | ✅ **RESOLVED 2026-09-14 (user): no.** Staff users are governed by the staff list; only **externals** are genuinely suspended, and externals never arrive in the payload. RSK-8 accepted out of model |
| ~~**OQ-D5**~~ | ~~Which payload member wins an email collision?~~ | — | ✅ **RESOLVED 2026-09-14 (user): first arrival wins** — `design.md` §5.2 |
| ~~**OQ-D6**~~ | ~~Grant `CONTRIBUTOR` to a matched active account that has no role?~~ | — | ✅ **RESOLVED 2026-09-14 (user): no** — usually an external on a different flow. Reported, never granted. RSK-10 |
| **OQ-8** | Should the Agresso `status` field gate account creation and reactivation? | **No — but a pre-flight is owed before Prod** | **Not in v1.** No business logic branches on the field, though OpenSearch indexes it (RSK-9, corrected). Its **value set** is what is unknown. ⚠️ **Attempted 2026-09-14 and BLOCKED** — the owner could not reach the database (VPN). Two pre-flights close it when connectivity returns: `SELECT DISTINCT status FROM alliance_user_staff`, or a terms aggregation on the `alliance_user_staff` OpenSearch index. **This blocks trusting a first Prod run, not implementation** |
| **OQ-4** | Should this reuse `result.repository.ts`'s find-or-create, or keep a separate path? | No | A `design.md` decision, not a requirement |

---

## 10. Defect classes and their gates

| Defect class this spec can produce | Gate that catches it | Input that makes it FAIL |
| --- | --- | --- |
| Matching resolves to the **wrong person** (substring email collision) | Fixture seeding `ana@` / `susana@`, asserting which row moved | Reintroduce `LIKE '%…%'` → the wrong row updates |
| A stored carnet is **overwritten** | Fixture seeding a conflicting carnet, asserting the stored value survives | Drop the SQL empty-check → it changes |
| **Duplicate** `sec_users` rows on re-run | Fixture running reconciliation twice, asserting row count | Skip the match step → the count doubles |
| **Duplicate** `sec_user_roles` rows on re-run | Same fixture, asserting one active role row | Insert unconditionally → the count doubles |
| A role is granted to a **pre-existing** account | Fixture with a pre-seeded account, asserting no role row appears | Grant outside the create branch → it appears |
| **Per-row round trips** at scale (NFR-AGS-002) | Statement count over ≥ 50- and ≥ 100-member fixtures, asserting the **exact** chunked count | A per-member loop → the count scales linearly |
| A staff member with an unusable email is inserted | Fixture with null / empty / 151-char emails, asserting no row and a `warn` each | Drop the guard → the insert throws on `NOT NULL` or truncates |
| A carnet longer than 10 chars is inserted | Fixture with an 11-char carnet, asserting skip + `warn` | Drop the guard → strict mode aborts the transaction |
| An **over-length name** aborts the run | Fixture with a 75-char `firstName`, asserting the row is written truncated and the run completes | Pass the raw value → strict mode rolls back the whole transaction |
| **A returning employee gets a second account** | Fixture: deactivate a row, then run with that member present; assert no new row and the **same** `sec_user_id` | Read only active rows → a duplicate appears |
| **A reactivated user does not get role 3 back** | Fixture with an inactive `role_id = 3` row, asserting it is active afterwards | Skip the role branch → the user returns without a role |
| **A reactivated user gets a *second* role-3 row** | Fixture with an **active** `role_id = 3` row on an inactive user, asserting exactly one afterwards | Insert unconditionally instead of checking → two rows |
| **Reactivation restores a role it must not** | Fixture with an inactive `role_id = 1` row, asserting it is still inactive | Reactivate all role rows → the admin role returns |
| **Reactivation touches `app_secrets`** | Fixture seeding an inactive secret for the returning user, asserting it is byte-identical | Add the table to the reactivation set → it flips |
| **An unmatched account is modified** | Fixture asserting every unmatched row is byte-identical, `updated_at` included | Add any unmatched-row write path → `updated_at` moves |
| **The grant assertion passes on set-equality alone** (F-3) | Fixture pre-seeding a row with the **same carnet**, `is_active = 1`, `created_at` inside the window and a **different email** — not the same email, which the bulk read would see, classifying the member *refresh* so no insert happens and the assertion never runs *(N-1/RB-3)*; assert **rollback to `create_grant`**: no `sec_users` row, no role row, any refresh in the same run **still committed** | Check only the carnet set → the count differs and it grants anyway |
| **The grant assertion passes on count-equality alone** (F-3) | Fixture where one insert is missing and one foreign row matches the predicate; assert rollback to `create_grant` with refreshes intact | Check only the count → the sets differ and it grants to the wrong row |
| **The re-select is keyed on email** (J-5) | Fixture: inactive row sharing a created row's email; assert only the new id gains a role | Re-select by email → both receive one |
| **`runStart` skew rolls back a healthy run** (R-5) | Fixture asserting `runStart` is read server-side (`@run_start`), never round-tripped through the app | Take `new Date()` in Node against a DB clock set ahead → the create sub-batch aborts on every run |
| **Ambiguous email resolves nondeterministically** | Fixture with two rows sharing an email, run twice, asserting the same row moved both times | Resolve without a total ordering → the chosen row varies |
| **An ambiguous match reactivates a second row** | Fixture: one active + one inactive row sharing an email; assert the inactive one stays inactive | Route on "matched an inactive row" without checking for an active sibling → two active rows |
| **`runStart` is sampled AFTER the insert** (M-1) | Fixture with one new hire, asserting the account **exists** after the run | Move the `SELECT NOW(6)` below the insert → the re-select returns 0, the assertion rolls back, and no account is created |
| **Two inactive role-3 rows are both flipped** (M-2) | Fixture: inactive user with **two** inactive `(user, 3)` rows; assert **exactly one** is active afterwards | Key the UPDATE on `WHERE user_id IN (…)` instead of one `sec_user_role_id` per user → both flip |
| **A stale inactive role-3 row is flipped beside an active one** (M-2) | Fixture: inactive user with one **active** and one **inactive** role-3 row; assert exactly one active afterwards and that case (a) issued no statement | Omit the "already has an active row" branch → the inactive one flips → two active |
| **Two inactive rows sharing an email are both reactivated** (M-3) | Fixture: two inactive rows, same email; assert exactly one `is_active = 1`, the other byte-identical, both in `ambiguousMatches` | Route on "all matches inactive" without applying the tie-break → both flip |
| **Two payload members sharing an email create two accounts** (M-4) | Fixture: payload carries `{A100, x@}` and `{B200, x@}`, no existing row; assert **one** `sec_users` row, **one** role row, one `payloadEmailCollisions` entry | Skip the collapse step → two rows, two grants, and both F-3 checks still pass |
| **A failed grant assertion discards the whole run** (M-5) | Fixture: force the assertion with a pre-seeded same-carnet row carrying a **different email** *(RB-3 — same-email would be classified refresh and never insert)*, plus one refresh and one reactivation; assert **both still committed**, `created = 0`, `rolesGranted = 0`, `abortReason = GRANT_ASSERTION` | Roll back the transaction instead of the savepoint → the refresh and the reactivation vanish |
| **The branch-(b) reactivation UPDATE re-grants an elevated role** (N-4) | Fixture: inactive user holding `{id 700, role_id 1, is_active 0}` and `{id 701, role_id 3, is_active 0}`; assert the `role_id = 1` row is **still inactive** afterwards | Compute `MIN(sec_user_role_id)` over the user's inactive rows **before** filtering to `role_id = 3`, or drop `AND role_id = 3` from the `WHERE` → id 700 flips and `SYSTEM_ADMIN` is restored |
| **A roleless active account is granted a role** (`OQ-D6`, RSK-10) | Fixture: active `sec_users` row with no role rows, its email in the payload; assert **no** role row appears and its id is listed in `accountsWithoutRole` | Grant on the refresh path → the row appears |
| A non-admin can still trigger the sync (`R-AGS-006`) | Controller spec asserting `RolesGuard` + `@Roles(SYSTEM_ADMIN)` metadata, plus a refusal case | Remove the decorator → the refusal case passes the request through |

**30 gates.** *(Counted row by row, never asserted — 22 at the split, 28 after lineage-2 round 1, 30 now. F-6 and R-7 were both miscounts of this same table, in opposite directions, one round apart.)*

**Scope limits of these gates, stated (KZ-017):**

- `npm test` has `rootDir: src` and **never runs `test/fixtures/`**. A green `npm test` is not evidence for any DB-level claim in this spec.
- The fixture tier runs against the **disposable scratch schema** only. Nothing here says anything about Dev or Prod data.
- **No gate covers `sec_users` rows that pre-date the sync and hold duplicate emails** (RSK-1). Real Dev/Prod data may contain shapes the scratch schema has never held. **Accepted risk** — a pre-flight duplicate-email count against Dev is the human check that would close it.
- **No gate can distinguish a deliberate suspension from an offboarding** (RSK-8 / OQ-7), because nothing in the schema records the difference. This is an **unmeasurable class with no automated substitute**; the substitute is the operator ruling requested in OQ-7.
- **No gate covers the semantics of the Agresso `status` field** (RSK-9 / OQ-8). **Its value set is unknown and no business logic branches on it** — the field *is* read and indexed by OpenSearch *(N-6: an earlier draft said "unread" here — the retired claim in different words, which is exactly why a sweep matching exact phrases missed it)*. The substitute is a one-query pre-flight, not a test, and it is **owed** — see OQ-8.

---

## 11. Requirement ID index

| ID | Title |
| --- | --- |
| R-AGS-001 | The staff sync reconciles every synced member against `sec_users` (email only) |
| R-AGS-002 | An existing active account is refreshed; carnet is filled in, never overwritten |
| R-AGS-003 | A staff member with no account gets one |
| R-AGS-004 | A newly created account receives the `CONTRIBUTOR` role |
| ~~R-AGS-005~~ | **MOVED** → [`changes/agresso-staff-deactivation`](../agresso-staff-deactivation/proposal.md). The id is retired here and never reused, so every finding in `judgment.md` keeps its target |
| R-AGS-006 | Only a system admin can trigger the sync |
| **R-AGS-007** | **A returning staff member's deactivated account is reactivated** (two tables, role 3 only) |
| NFR-AGS-001 | Reconciliation is idempotent |
| NFR-AGS-002 | No per-row round trips — `O(⌈n / CHUNK⌉)` |
| NFR-AGS-003 | Every write is attributable |
