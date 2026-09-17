# PRMS Sync — handoff, 2026-09-17

Written to survive a session clear. Everything below is measured or committed; nothing is
recollection. Where something is unproven it says so.

**Previous handoff (2026-09-16) is superseded by this one**, except the sections reproduced at
the bottom, which are still current.

---

## 1. What this session did: the sync was exercised end to end, and it worked

Before today the sync had never been run against Dev by a human. Doing so found **six defects**.
Result `19949` was the probe, but **none of them were specific to it** — every one blocked the
entire environment. They surfaced one at a time because P-1 refuses on the first missing field.

The chain reached PRMS on attempt 7: **HTTP 207 with a real `requestId`** — transport, envelope,
gate, version resolution and all four builders working end to end. What failed at that point was a
PRMS-side validation rule, not our code. That is the milestone.

| # | Defect | Where | Scope it blocked |
|---|---|---|---|
| 1 | Versions refused with `404 "Result not found"` | 5 queries re-filtered `is_snapshot = FALSE` | Every version, i.e. every Approved result |
| 2 | `created_by` never resolved | staff joined on `sec_users.carnet`, NULL for **279/279** Approved creators | Every payload |
| 3 | `length_training` required a degree | builder threw before the homologation could decide | Every non-degree training |
| 4 | Individual trainings unsendable | builder only understood the group shape | **42 of 126** Approved CapDev versions |
| 5 | Blank `number_people_trained` buckets omitted | PRMS rejects an absent `women` | Every partially-reported training |
| 6 | Failed requests looked **silent** in the UI | interceptor read `error.error.errors` only | Every endpoint whose envelope uses `description` |

### 1.1 The structural one worth understanding (defect 1)

`ResultsUtil.setup()` (`results.util.ts:43-48`) deliberately resolves **the version** when
`reportYear` is present, and the client's `result.interceptor.ts:42-44` adds it from the browser's
`?version=`. Five queries in the PRMS module then re-asserted `is_snapshot = FALSE` and refused the
very row the endpoint had just selected. Half the endpoint resolved a version on purpose; the other
half refused versions on purpose. **`design.md` and `requirements.md` never mention versions at
all** — it was never decided, not decided wrongly. The e2e only ever called without `reportYear`
(`test/prms-sync.e2e-spec.ts:220`), so it never touched the version path.

Product rule, stated by the owner and now implemented: **versions are what PRMS receives, because
versions are the Approved rows.**

Side effect: `is_snapshot` is nullable and `NULL = FALSE` is NULL in SQL, so a live row with a null
flag had been refused too, while the rest of the codebase treats null as live. That hole is gone.

### 1.2 Decisions taken by the product owner, 2026-09-17

1. **Individual capacity sharing counts its trainee as 1 in their gender's bucket**
   (`gender` catalogue: 1 Male, 2 Female, 3 Non-binary → `men` / `women` / `non_binary`).
   Not the `unknown` arithmetic §1.4 rejected: the participant and their gender were both entered.
2. **Blank buckets are sent as `0`, group trainings included.** For an individual this is entailed
   (one participant of known gender). **For a GROUP it asserts a zero nobody typed** — accepted
   deliberately, and recorded in the code and tests so the trade-off stays visible.
3. **A group that reported no counts at all still refuses**, rather than claiming nobody was
   trained. A false zero that PRMS accepts silently is worse than a refusal.

---

## 2. Where the code is right now

| Item | State |
|---|---|
| `AC-1441-US5-Push-Results-into-the-PRMS` | `5824ab6e` — the six fixes |
| `dev` | `1b981a07` — merge of the branch into dev, **6 commits ahead of `origin/dev`** |
| Pushed? | **No.** The owner pushes; never push from a session |
| Server suite (on dev) | 413 suites / 3865 tests, build exit 0 |
| Client suite (on dev) | 335 suites / 7707 tests, `ng lint` clean, build exit 0 |
| Migrations | **None needed.** Dev reports **0 pending** of 333 (`migration:show`, ANSI-stripped) |

**Direction rule the owner set, still binding: this branch goes TO `dev`, `dev` never comes back
into the branch.** The merge was done by checking out `dev` and merging the branch into it; the
branch still sits at `5824ab6e` with nothing of dev inside.

### 2.1 A test `dev` had silently lost, restored in that merge

The `answered "No" — nothing to sync` pin from `f37eea44` was **missing on `dev`**. `git log -S`
finds only the commit that ADDED it, so it was dropped inside an earlier merge with no conflict.
`dev` still carried the tooltip branch that pin exists to protect, so the bugfix's own message had
been running untested. It is restored; mutating `contributesToPoolFunding` away now reddens **both**
pins again, as it did in `f37eea44`. Before the restore it reddened only one.

Watch for this shape: when the target branch deleted a region the source did not touch, git takes
the deletion **without a conflict**.

### 2.2 Pre-existing lint debt on `dev` — not ours, left untouched

`npx eslint "src/**/*.ts"` on the server reports **181 prettier errors across 9 files**. Each was
checked against the merge's own file list: **none are files this work touches**. They were already
on `dev`. If a pipeline gate uses full-repo lint, it will fail on those, not on this work.

---

## 3. To resume testing in a new session

### 3.1 Environment prerequisite — without this nothing is testable

`ARI_PRMS_NORMALIZER_HOST` is an **environment variable, not code**, and `design.md:339` forbids a
hardcoded default. Dev/TEST needs the **TEST** host:

```
https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com
```

(PROD is `v6a9z2e4y5…` and must never appear outside production.)

**The backend must be restarted after setting it** — `PrmsNormalizerService` reads the host in its
constructor, not per request. Without it the endpoint returns
`503 "PRMS Normalizer host is not configured"`, which is the fail-loud design, not a defect.

Second prerequisite for any environment other than Dev: migration `1789586388552`
(pool funding copied onto the version) must be **applied**. The pipeline deploys code only (K-015).
Without it, versions carry no alignment row and the button never enables. Dev has it applied.

### 3.2 What has been tested, and what has not

**Tested: Capacity Sharing (`indicator_id = 1`) only**, via result `19949` / version `33968` —
an *individual* training, `gender_id = 1`, no participant counts.

**Not yet tested: Innovation Development (2) and Policy Change (4).** Those builders have unit
coverage but have never been exercised against the live TEST Normalizer.

Gated by design, and expected to refuse with their own message — a refusal is the correct result,
not a failure to debug:
- **Knowledge Product (3)** — mapped and built, deliberately left in `UNMAPPABLE_INDICATORS`.
- **OICR (5)** — permanent product policy, never to be sent.
- **Innovation Use (6)** — built but gated (family R-F6).

### 3.3 Measurement still owed

Per-indicator counts of Approved versions that carry a pool-funding-alignment row were **not
measured**: the Dev database went `ETIMEDOUT` twice at the end of this session. **Do not assume
candidates exist.** What *was* measured earlier, for CapDev: of 126 Approved CapDev versions,
**exactly one** (`19949`) had a `result_pool_funding_alignment` row, because that copy only started
happening with migration `1789586388552`. Expect the same scarcity for other indicators, and expect
to have to create and approve a fresh result per indicator to get a testable version.

Query to run first thing (adapt the indicator filter):

```sql
SELECT r.indicator_id, COUNT(*) AS approved_versions,
       SUM(pfa.result_id IS NOT NULL) AS with_pool_funding_row,
       SUM(pfa.has_contribution = 1)  AS contributing,
       SUM(r.is_synced_to_prms = 1)   AS already_synced
FROM results r
LEFT JOIN result_pool_funding_alignment pfa
  ON pfa.result_id = r.result_id AND pfa.is_active = TRUE
WHERE r.is_active = TRUE AND r.result_status_id = 6
  AND r.is_snapshot = TRUE AND r.platform_code = 'STAR'
GROUP BY r.indicator_id ORDER BY r.indicator_id;
```

### 3.4 How to read a failure fast

`result_prms_sync_log` holds every attempt, including the **verbatim `request_payload`** (API key
redacted before the write). Reading the row is faster and more reliable than re-deriving what was
sent:

```sql
SELECT attempt_number, outcome, http_status, request_id, failure_reason, request_payload
FROM result_prms_sync_log WHERE result_id = <version row id>
ORDER BY attempt_number DESC LIMIT 1;
```

Outcome vocabulary: `REFUSED_BY_STAR` = our gate or a builder refused, nothing was sent ·
`REJECTED_BY_PRMS` = PRMS evaluated and refused · `TRANSPORT_FAILED` = no HTTP response at all
(network or the 30 s ceiling) · `ACCEPTED` = the only outcome that flips `is_synced_to_prms`.

---

## 4. Open with the PRMS team / BA

### 4.1 `number_people_trained` — a documented contract that the API contradicts

PRMS's own field documentation says *"At least one sub-field must be provided."* Its API rejected a
payload carrying only `men`:

```
data.capacity_sharing.number_people_trained.women must not be less than 0
data.capacity_sharing.number_people_trained.women must be a number conforming to the specified constraints
```

Those two statements cannot both be true. The spike never caught it because the single accepted
`capacity_sharing` call sent all three buckets (`{"women": 3, "men": 2, "non_binary": 0}`) — a
partial object was never tried. `homologation.md:351` records "≥1 of 4" transcribed from that
documentation; **that line is now falsified by measurement and should be corrected.**

Still unknown, and worth one probe against TEST: the error named `women` but **not** `non_binary`,
so it is unclear whether all three buckets are required or only some.

Two questions for the BA:
1. Which sub-fields does `number_people_trained` actually require?
2. If all are required, how should STAR represent *"not reported"* versus *"zero"*? They are
   different facts, and the current answer sends `0` for both.

### 4.2 Second PRMS documentation defect

The `knowledge_product` handle in PRMS's own field documentation is rejected by their own API as an
unsupported repository. (Carried over from the 2026-09-16 handoff; still open.)

---

## 5. Carried forward from 2026-09-16, still current

### 5.1 Open exit criteria (`sync-engine/tasks.md` §Definition of Done)

| Criterion | Owner |
|---|---|
| Someone exercises the sync in the running product — **before** `/akili-validate` issues a verdict | **Human.** Partially done: CapDev reached PRMS; other indicators untested |
| Migration applied forward **and reverted clean** | **Human.** On the local scratch (`migration:test:*`), **not** against shared Dev |
| Every requirement-level AC at clause granularity | `/akili-validate` |
| Budget checked against actuals | **Human.** Measured: 9,724 LOC vs a ~2,000 budget (3,708 production, 1.9×); review rounds 14 vs 2. Escalated, not self-closed |

**Sequence matters:** exercise in product → `/akili-validate` → archive. Archiving earlier freezes a
spec whose own checklist is unmet. The owner has said explicitly they are **not archiving yet**.

### 5.2 Product decisions recorded in `homologation.md`

1. **D-4 reversed — Knowledge Products will be sent** (D-4/D-4b/D-4c).
2. **Only TIP-imported KPs are syncable** — the handle is the `evidence_url` of the row whose
   `evidence_description` is exactly `'Handled'` (a typo for "Handle" in the importer; matched
   exactly on purpose, with a comment in the builder saying why).
3. **Mapping only, no flow.** `KNOWLEDGE_PRODUCT` stays in `UNMAPPABLE_INDICATORS`; a test asserts
   that refusal holds when every other gate entry would pass. Enabling it later is one line, and
   that test reddens to confirm the boundary moved deliberately.
4. **OICRs will never be sent — permanent product policy**, not a limitation awaiting a feature.

### 5.3 Still open from before

- **Gate message splits KP from OICR.** One entry says *"Indicator is unmappable to a PRMS type;
  Knowledge Product and OICR cannot be sent"* — now **false for KP** (mappable, just gated) and
  **understated for OICR** (permanent, not technical). Splitting it changes no behaviour; both stay
  refused with 422. **Not done: awaiting approval**, because KP work was scoped to "no flow logic".
- **No `ACCEPTED` was ever obtained for `knowledge_product`.** The builder is proven in shape, not
  in result.
- **Date contract mismatch.** STAR/TIP reads `dcterms.issued`; PRMS prefers `dcterms.available`
  when present. Same record, 2026-02 vs 2024. No STAR-side logic reconciles it.
- **Decision-webhook child does not exist.** Urgent property: *a decision taken while no destination
  is registered is never replayed* — there is no backlog. The callback is **unsigned today**
  (`x-prms-signature` reserved, not sent), and the URL must be public HTTPS — Dev's on-prem private
  range is refused.
- **Two blockers make KP unreachable regardless of mapping.** Measured on Dev over 9,161 active KP
  results: **zero** in `result_status_id = 6` (they sit in status 20, *"Completed in TIP"*) and
  **zero** with a Pool Funding Alignment row. KPs do not travel STAR's approval workflow because
  STAR does not own their lifecycle. **Open design question:** will KPs pass through Pool Funding
  Alignment and an Approved status like any other result — leaving gate entries 3 and 4 exactly as
  they are — or will they sync from *"Completed in TIP"*, which needs a type-aware exception?
