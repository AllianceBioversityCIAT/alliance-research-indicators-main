# Measurement Record — 2026-09-25, Dev

> Increment 1 was **run for the first time** on 2026-09-25, 15 months of assumptions later. This
> file is the point-in-time record of what it measured and what that measurement settled. It is
> append-only: correct it with a dated note below, never by editing an entry above.
>
> **Nothing has been committed.** Standing user barrier (2026-09-25): *no commit on this work until
> it is validated with real data that the right users are deactivated and no wrong ones are.*

---

## 0. What had to be fixed before the measurement could happen at all

The first trigger aborted on `C-4` with `externalStatusMatches: 0`.

`user_status` in Dev is exactly four rows:

```
1  Accepted        2  Pending        3  Rejected        4  External Accepted
```

`resolveExternalStatusId` matched `name.trim().toLowerCase() === 'external'`. The live row is named
**`External Accepted`**, so nothing matched and the pass refused to run — correctly, by `W-1`'s
design, but for a reason that was a defect rather than a data problem.

**The irony is worth keeping.** The original implementation used the literal `4`. `W-1` replaced it
with a name lookup *because `4` was unverifiable* — `user_status` has no seed, no migration and no
enum anywhere in this repository. The reasoning was right and the replacement value was wrong: an
auditable expression pointing at a row that does not exist.

**Fix applied (uncommitted):** selection by `EXTERNAL_STATUS_ID = 4`, per a user ruling that an id
is the stable selector — a rename cannot move it. The `C-4` abort is **retained** for the absent-row
case, so an environment that numbers `user_status` differently still refuses to run rather than
silently shielding the wrong cohort. Proven able to fail (`K-004`): reverting production to the name
match reddened **3 tests**, observed.

A second change makes the candidate set readable: `candidateSample` is capped at 50 and the set is
larger, so the full list is now emitted on its own log line. Measurement only; nothing acts on it.

---

## 1. The measurement — §6 of `HANDOFF.md`, filled

```
Date:                     2026-09-25
Environment:              Dev
deactivationCandidates:   146
activePopulation:         1985
excludedExternal:         0        <-- a real 0 this time; see §2
excludedSystemAdmin:      0
excludedAmbiguous:        0
excludedUnmatchable:      3
shieldedBySkip:           []
distinctCarnets:          2001
totalElements:            2001
deactivationAbortReason:  (absent — the pass completed)
```

Creation half on the same run, confirming idempotence (`NFR-AGS-001`): `staffFetched 2001`,
`matched 1835`, `created 0`, `reactivated 0`, `carnetBackfilled 0`, `namesRefreshed 1835`,
**`skippedUnusableEmail 163`**, `skippedCarnetTooLong 0`, `carnetConflicts 6`,
`payloadEmailCollisions 3`, `ambiguousMatches 1`.

> **`skippedUnusableEmail: 163` added 2026-09-25** after Judgment Day round 1 (`JR2-8`): both judges
> found the figure asserted in `requirements.md` and `design.md` with **no source in this record**, so
> no reader could corroborate it. It comes from the run's own summary line. *(One judge derived 166
> from `2001 − 1835` and called 163 unsupported; that subtraction conflates the 163 skips with the 3
> payload collisions — `163 + 3 = 166`. The figure was right; the record was incomplete.)*

**The counts reconcile exactly**, which is itself evidence the classification is not dropping rows:

```
1985 active − 1835 matched                          = 150
− 140 (d.gaviria's twin, shielded by the same key)  = 149
− 3 excludedUnmatchable                             = 146   ✓ as reported
```

**C-3 ceiling:** `max(0.05 × 1985, 10)` = **99.25** (unrounded — see `design.md` §20.2). With 146 candidates the ceiling is breached at
**7.36%**, exactly as `design.md` §11 step 3 predicted. In dry-run this reports; with dry-run off it
would abort and write nothing.

---

## 2. `RB-2` / `JS-1` / `D-3` — CLOSED. `EX-1` shields nobody.

`excludedExternal: 0` is now a **measurement**, not an artifact of the abort (see the trap in §4).

Of **1985** active users, **zero** carry `status_id = 4`. The distribution is
`Accepted 1975 · Pending 8 · Rejected 2 · External Accepted 0`.

So `EX-1` is **structurally inert**, not merely unused: no user in the system is marked external, so
the exclusion can never fire. `JS-1` said *"C-4 proves a row named external exists, not that
external accounts carry that id."* The row exists. Nobody carries it.

**Three of the four exclusions protected nobody on this run:**

| Exclusion | Count | Reading |
| --- | --- | --- |
| `EX-1` external | **0** | **Structurally dead** — nobody has status 4 |
| `EX-2` system admin | 0 | Inert today: no candidate holds an active admin role. Mechanism is fine, no case arose |
| `EX-3` ambiguous | 0 | Inert **by design** — `d.gaviria`'s two rows share a key that is in the payload, so the shield set removed both before exclusions ran (`JD-7`) |
| `EX-4` unmatchable | 3 | The only one that fired |

**The shield set is doing all the protective work**: the exclusions contributed 3 of 1,839 shields.
Increment 2 cannot rely on `EX-1` for the cohort it was bought to protect.

---

## 3. Who the 146 are — classification, pending BI sign-off

The list was handed to BI on 2026-09-25 for verification. A user spot-check of several entries
confirmed they are genuine leavers, which supports **group ④** — the largest group. Groups ② and ③
are not covered by that sample.

**The decisive split: 91 of 146 carry a carnet** (once Agresso payroll); **55 do not** (never
payroll — the cohort `EX-1` was supposed to shield).

> ⚠️ **The cohorts below do NOT partition the 146 — corrected 2026-09-25 after Judgment Day round 1
> (`JR2-1`).** As first written, groups ① ② ③ accounted for 11 + 3 + 22 = **36** of the 55 carnet-less
> accounts, and the remaining **19 were described by nothing** while the surrounding prose read as a
> complete breakdown. They are now group ⑤, and they are not a footnote: every one is an
> institutional `@cgiar.org` address in state `Accepted` with **no carnet and no login**, which is
> the single most ambiguous position in the whole set.

**① Test and junk accounts — 11. Deactivating them is desirable.**
Disposable domains (`wixiw83685@ptiong.com`, `jokiga1797@insfou.com`), names like `test test`,
`Lulito 189`, `Maria Camila 2 Giraldo 2`; six personal-mail accounts in `Pending`/`Rejected`. No
carnet, never logged in.

**② Active platform users who are not Agresso staff — 3. The real hazard.**

| id | email | last login |
| --- | --- | --- |
| 8 | `julian.sanchez@cgiar.org` | 2025-11-12 |
| 16 | `s.galvez@cgiar.org` | 2025-11-11 |
| 126 | `n.higuita@cgiar.org` | 2025-10-29 |

These are the **only 3 of 146 that have ever logged in**; the other 143 never have. Institutional
mail, no carnet, real usage. Increment 2 as designed would take their access away.

**③ The 2026-08-24 bulk load — 22 accounts, identical `created_at`, none with a carnet.**
Contains `MARLO SuperAdmin` (`Alliance-aiccra-kds@cgiar.org`) — a service-account name — and four
collaborators at other institutions: `steve@iri.columbia.edu`, `arose@iri.columbia.edu`,
`jhansen@iri.columbia.edu` (IRI Columbia) and `nouroudine.yessoufou@icrisat.org` (ICRISAT). The
names in the block point at AICCRA. Provenance unconfirmed.

**④ Former payroll with a carnet — 91. The question STAR cannot answer.**
Legitimate candidates *if* absence from the payload means departure. But the sync queries Agresso
with **`?status=active`**, the hazard the creation spec explicitly handed to this one: someone on
leave or suspended disappears from the payload and lands here. **Separating "gone" from "not active
right now" requires an Agresso-side query without the status filter.** It is not derivable from
STAR.

**A subgroup that would loop forever — 4.** Carnet present, but the STAR address is personal or
external: `angiesanchez9523@gmail.com` (15913), `palounohelia@gmail.com` (15806),
`Sadie.shelton@uvm.edu` (16060), `sbhamra88@gmail.com` (14897). Matching is **email only** — the
carnet does not participate — so if Agresso holds their institutional address they can never match,
and they are candidates on **every** run. Deactivate → complaint → reactivate → deactivated again.

**⑤ Carnet-less institutional accounts described by no other group — 19.**

```
 21  30  34  72  77  78  81  87  95  99
129 142 148 150 159 160 171 172 176
```

All `@cgiar.org`, all `Accepted`, **none has a carnet and none has ever logged in.** They are not
test accounts (① is enumerated and closed), not the 2026-08-24 load (③ is timestamp-bounded), and
not payroll (④ is carnet-bounded). What they are is **unknown**, and 19 is larger than groups ① ②
combined. Nothing in STAR distinguishes "a person who left before carnets were recorded" from "a
collaborator who never was payroll" — the same question `RSK-AGD-8` asks of group ④, with no carnet
to anchor it.

### Open with BI

1. **The 91 with a carnet: are they in Agresso today under a non-`active` status, or genuinely absent?** This is the question that decides whether those 91 are retired.
2. **The 2026-08-24 block: what produced it, and must those accounts stay alive?** `MARLO SuperAdmin` above all.
3. **The 3 active non-staff users: why do they have accounts at all?** Their answer defines what replaces `EX-1`.
4. **The 19 of group ⑤ — carnet-less, institutional, never logged in: departed pre-carnet, or never payroll?** Larger than groups ① and ② together, and the only group with no anchoring attribute (`JR2-1`).

---

## 4. Traps found while measuring — each one produced a wrong answer first

| # | Trap |
| --- | --- |
| M-1 | **A `C-4` abort returns the EMPTY report.** `checkAborts` runs before candidates are computed and returns `{...emptyReport, activePopulation}`, so `deactivationCandidates: 0` and `excludedExternal: 0` after an abort are **not measurements**. Only `activePopulation` is real. Reading that 0 as "nobody to deactivate" is the dangerous misread — and the two zeros look identical in the log. The discriminator is the presence of `deactivationAbortReason`. Same family as `K-014` |
| M-2 | **`alliance_user_staff` cannot identify current staff.** `base()` uses `repository.save()` — an upsert on the `carnet` primary key that **never deletes** — so the table is cumulative and holds people who left years ago. Joining `sec_users` against it over-shields and under-reports candidates, i.e. it errs in the unsafe direction for planning. It is the obvious table to reach for, and it is wrong |
| M-3 | **`updated_at` does not mark "touched by this run".** MySQL does not fire `ON UPDATE CURRENT_TIMESTAMP` when an `UPDATE` changes no value, so ~272 of the 450 refreshed rows kept an old timestamp. A query filtering on it returned **422** where the true candidate set is 146. Enumerate by the code's own candidate computation, never by a proxy (`KZ-002`) |

---

## 5. State of the tree at the time of writing

Branch `new-spec-auto-sync-sec-users`, `staging` merged at **`7931f03c`** (zero conflicts — the
branch and `staging` share no file). **No commit** carries the changes below; they exist only in the
working tree, per the standing barrier.

| File | Change |
| --- | --- |
| `sec-user-deactivation.repository.ts` | `EXTERNAL_STATUS_ID = 4`; selection by id, `C-4` abort retained |
| `agresso-staff-tools.service.ts` | Full candidate list on its own log line |
| `sec-user-deactivation.repository.spec.ts` | Tests re-pinned to id selection, incl. the live-defect regression and its inverse |

Gates after the change: `npm test -- --silent` **396 suites / 3,514 tests**, `tsc --noEmit` exit 0
with 0 errors, `npx eslint src` (bare, no `--fix`) exit 0 with 0 errors. Mutation probe observed red
(3 tests) before restoring.

**What these gates cannot reach (`KZ-017`):** `npm test` runs with `rootDir: "src"` and collects
none of the e2e, integration or fixture tiers. No database claim in this file rests on them — every
figure above comes from the Dev run itself.

---

## 6. What this does NOT settle

- **`D-1` — increment 2's date.** Still unset. `RB-1` stands: until it ships, a departed employee keeps their account, roles and machine credentials.
- **`D-2` — the C-3 ceiling.** Now informed, not decided: `0.05` yields 99.25 against 146 candidates. Either the first cleanup raises the ceiling for one run (and `design.md` §11 step 6 restores it), or it runs in batches. Whether `0.05` is right for steady state is still open.
- **What replaces `EX-1`.** `D-3` is closed as a finding, not as a design. Increment 2 needs a shield for legitimate non-Agresso users, or a human-reviewed allowlist, before it writes anything.
- **The `?status=active` ambiguity.** Unresolvable inside STAR; needs Agresso.
