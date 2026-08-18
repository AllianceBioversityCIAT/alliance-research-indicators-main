# Proposal — S2: the CLARISA ↔ AGRESSO auto-mapper

> **Headline:** S1 built an instrument and took a reading. The reading says **336 of 1543 AGRESSO bilateral contracts resolve automatically** to a CLARISA project — **88.4% of everything reachable**. Today four mappings exist, all typed by hand. This spec turns that measurement into rows.
>
> **The database has been waiting for this since June.** `MappingSourceEnum` already declares `AI_SUGGESTED` and `AI_AUTO`; `confidence_score` already carries the comment *"Populated only when source != MANUAL"*. The columns exist and nothing writes them.
>
> **One hard dependency, one soft one.** Hard: CLARISA production still publishes **no `external_code`**, the field the whole match keys on — PRMS promotes it, and this cannot ship before they do. Soft: the picker currently shows project **codes instead of names**, and S2's review queue would inherit that defect.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bilateral/clarisa-automapper-s2/` |
| **Slug** | `clarisa-automapper-s2` — derived from the free-text argument; the sentence is proposal context, not a directory name |
| **Type** | **Change** (new capability on an existing module) |
| **Approval Mode** | `gated` (no end-to-end mandate given) |
| **Depends on** | `docs/specs/archive/2026-08-14-bilateral--clarisa-project-automapping/` (S1 — measurement) · **PRMS promoting the CLARISA contract to production** |
| **Blocked by** | **Upstream.** See §12 R-1 |
| **Parallel-safe** | **no** — shares `bilateral_project_mapping` and the CLARISA projects client |
| **Recommended prerequisite** | `bugfix/bilateral-picker-fields` — see §9. Small, unblocked, and S2's review queue depends on it |
| **Evidence** | S1's D8 reading (2026-08-14, both CLARISA environments over VPN) + live re-measurement 2026-08-14 |

---

## 2. Intent

Stop asking humans to hand-type a join the data can compute, and give them a review surface for the cases where it cannot.

---

## 3. Problem / Current Behavior

| | |
| --- | --- |
| **Mappings today** | **4**, all `MANUAL`, `confidence_score` null |
| **AGRESSO bilateral contracts** | **1543** |
| **Mappable CLARISA projects** | **342** (test) · **25** (production, pre-promotion) |
| **Automation** | none — `AI_SUGGESTED` and `AI_AUTO` are declared and unused |

Manual mapping is not a scale problem that better UX solves. At 1543 contracts it is not work anyone will finish, and every unmapped contract is a project silently missing from pool-funding attribution.

---

## 4. The measured evidence — this is what S1 exists to have produced

| Tier | Contracts resolved | Share of 1543 |
| --- | --- | --- |
| `EXACT_CODE` | 32 | 2.1% |
| **`NORMALIZED_CODE`** | **304** | **19.7%** |
| `FULL_NAME` | **0** | 0% |
| `AMBIGUOUS` | **0** | 0% |
| `UNRESOLVED` | 1207 | 78.2% |

### Three findings that shape the design, none of them guessable

**① The ceiling is 24.6%, not 100%.** Only 380 Alliance-2026 projects exist to match 1543 contracts against. Resolved 336 is **88.4% of the reachable maximum**. Quoting "78% unresolved" without that denominator misrepresents the instrument by a factor of four — the 1207 are overwhelmingly contracts with no corresponding project at all.

**② Prefix normalization does 90% of the work.** 304 normalized vs 32 exact — **9.5×**. The `{B-, C-}` centre-prefix strip *is* the matcher. Exact matching alone would deliver 2%.

**③ `FULL_NAME` matching resolved exactly zero.** The S1 proposal positioned name comparison as the fallback for the residue. On real data it contributed **nothing**. It should not be built.

**④ Zero collisions on live data.** No contract matched more than one project, so the normalization is injective in practice — the precondition for auto-applying anything.

---

## 5. Proposed Outcome

- Every resolvable contract carries a mapping row with **provenance** (`AI_SUGGESTED`/`AI_AUTO`), a **confidence score**, and the evidence for why it matched.
- A human reviews suggestions and accepts or rejects them, in bulk.
- Re-running the matcher is **safe and idempotent**, and **never touches a `MANUAL` row**.
- Coverage becomes an observable number, not an impression — the S1 coverage report already exists to report it.

---

## 6. Scope

| In | Out |
| --- | --- |
| Matcher service: normalize `external_code`, strip the closed `{B-, C-}` prefix set, join to AGRESSO bilateral contracts | `FULL_NAME` matching — **measured zero**, deliberately not built |
| Write `AI_SUGGESTED` rows with `confidence_score` and match evidence | Changing what a mapping *means* downstream (pool-funding attribution is unchanged) |
| Review queue: list, filter by confidence, accept/reject, bulk actions | Re-designing the existing manual mapping form |
| Idempotent re-run; `MANUAL` rows are immutable to the matcher | Any change to AGRESSO ingestion |
| Trigger surface (admin-initiated and/or scheduled) | The picker field defect — **separate spec**, see §9 |

---

## 7. Non-Goals

- Not inventing a fuzzy/ML matcher. The measured winner is a deterministic prefix strip; adding similarity scoring buys nothing against a 0-collision, 0-name-match dataset.
- Not auto-applying anything on day one — see §10.
- Not touching the 4 existing `MANUAL` mappings.

---

## 8. Affected Users, Systems, And Specs

| | |
| --- | --- |
| **Users** | `CENTER_ADMIN`, `SYSTEM_ADMIN` (review queue) · pool-funding reporting consumers (downstream) |
| **Server** | `bilateral-project-mapping/` (service, controller, new matcher) · `clarisa/projects/` · AGRESSO contract read path |
| **Client** | **STAR** — new review-queue surface under `administration/center-admin/bilateral-mapping` |
| **Schema** | Likely **none** — `source` and `confidence_score` already exist. A match-evidence column may be needed |
| **Specs** | Consumes S1's coverage report as its own progress metric |

---

## 9. The picker defect — found 2026-08-14, and it lands on S2

Measured on the live feed while validating the S1 bugfix:

| Field | In CLARISA | In the picker response |
| --- | --- | --- |
| `full_name` (the real project name) | **342 / 342 populated** | ❌ **not returned** |
| `description` | 63 / 342 (18.4%) | ❌ **not returned** |
| `short_name` | 342 / 342 — but it is a **bare code** (`A1463`) in the new feed | ✅ returned |

Consequence: the dropdown lists `A1463`, `A1796`, `A411`… and the **search filters on `short_name` only**, so typing a project name finds nothing. With 342 options that makes the list unusable.

**Why it belongs to S2's critical path:** the review queue renders the same project identity. Ship it as-is and reviewers approve mappings against codes they cannot read.

**Recommendation: fix it first, in its own small spec** (`bugfix/bilateral-picker-fields`). It is unblocked by PRMS, it unblocks manual mapping *today*, and it is roughly one DTO plus one filter predicate.

---

## 10. Approach Options

### Option A — Suggest-only, human accepts ✅ *recommended for v1*

Matcher writes `AI_SUGGESTED` rows. Nothing becomes active until a human accepts it in the review queue.

| | |
| --- | --- |
| ✅ | No wrong mapping can reach pool-funding attribution without a human having seen it |
| ✅ | Produces the labelled data that justifies (or refutes) auto-apply later |
| ✅ | `AI_AUTO` stays available as the seam for phase two |
| ⚠️ | 336 suggestions still need human passes — but reviewing is minutes, typing is weeks |

### Option B — Auto-apply above a confidence threshold

`AI_AUTO` above the line, `AI_SUGGESTED` below.

| | |
| --- | --- |
| ✅ | Near-zero human effort on the confident majority |
| ⚠️ | **Confidence is currently synthetic.** With 0 collisions and a deterministic strip, every match scores the same — there is no measured distribution to place a threshold on |
| ❌ | A wrong auto-mapping mis-attributes pool funding **silently**, and nobody is looking |

### Option C — Full auto, no review

| | |
| --- | --- |
| ✅ | Cheapest to build |
| ❌ | Reporting-critical data with no human in the loop and no measured error rate. Not defensible |

---

## 11. Recommended Approach

**Option A**, with `AI_AUTO` left wired but unused.

The reasoning is the same one that killed `FULL_NAME`: build what the measurement supports. The data says the join is deterministic and collision-free — but "collision-free" is a property of *today's* 380 projects, and it was measured on **test**, not on the production dataset this will actually run against. Option A converts the first production run into evidence; Option B assumes the evidence already exists.

**Sequence:**

```
1. bugfix/bilateral-picker-fields   ← unblocked, ships now, makes names readable
2. PRMS promotes external_code to production
3. re-run evidence/probe-selector.py   ← the numbers must be re-measured, not assumed
4. S2 matcher + review queue
```

Step 3 is not ceremony. Every figure above describes `clarisatest-back`; production currently has 299 rows and none of the upstream fields. **Designing S2's thresholds against test numbers and shipping against production numbers is precisely the failure S1 was built to prevent.**

---

## 12. Risks, Dependencies, And Open Questions

| ID | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | **Hard block: production has no `external_code`.** The match key does not exist there | PRMS owns it. S2 cannot ship before it lands. Re-measure the day it does |
| **R-2** | The 88.4% figure is a **test-feed** measurement | Re-run the probe post-promotion; treat any figure here as provisional |
| **R-3** | A matcher re-run overwrites or duplicates existing rows | Idempotency + a hard rule that `MANUAL` is immutable to automation, both asserted by tests |
| **R-4** | `confidence_score` becomes a decorative constant | Either derive it from something real (match tier, code-length, prefix-strip depth) or **do not populate it** — a field everyone reads as meaningful and that is always `1.0` is worse than null |
| **R-5** | 336 suggestions arrive as one undifferentiated queue | Bulk accept, filter by tier, sort by contract value or result count |
| **KZ-001** | Building the matcher against fixtures that do not mirror the real feed | Pin fixtures to the measured spellings, as the S1 bugfix did |
| **K-005** | Two normalization implementations drifting apart | Reuse S1's `external-code.util.ts` — do not re-implement the strip |

### Open questions

| ID | Question | Recommendation |
| --- | --- | --- |
| **OQ-1** | What triggers the matcher — admin button, cron, or both | **Admin-initiated first.** A cron that writes rows nobody expected is hard to reason about; add scheduling once the output is trusted |
| **OQ-2** | Does `confidence_score` get populated in v1 | **Only if it varies.** See R-4 |
| **OQ-3** | What happens to the 1207 unresolved — surfaced, or silent | **Surfaced as a count**, not a list. S1's coverage report already computes it |
| **OQ-4** | Do the 38 `window3` projects participate | Inherit **OQ-A** from the bugfix: excluded |
| **OQ-5** | Is `Confirmed` the right science-program status filter — 5 test projects have mappings, **0** have a `Confirmed` one | **Ask PRMS.** Carried over unanswered from S1 |

---

## 13. Success Criteria

- [ ] A production run resolves **≥ 80% of the reachable ceiling**, re-measured post-promotion — not the test-feed 88.4% assumed
- [ ] Every automated row carries provenance and the evidence for its match
- [ ] Re-running the matcher twice produces no duplicates and changes no `MANUAL` row
- [ ] A reviewer can accept or reject in bulk, seeing **project names** (requires §9)
- [ ] The S1 coverage report shows the before/after delta — the instrument reports on its own successor
- [ ] Zero pool-funding attributions change without a human having approved the mapping

---

## 14. Next Step

**Do not specify S2 yet.** It is hard-blocked on PRMS and every number in it is provisional until re-measured.

Ship the unblocked fix first:

```
/akili-propose bugfix/bilateral-picker-fields
```

Then, once PRMS promotes and the probe is re-run:

```
/akili-specify bilateral/clarisa-automapper-s2
```

Expect **Full** depth, and expect `/akili-specify` to propose splitting it — the matcher and the review queue are a server concern and a client concern with a clean seam between them.
