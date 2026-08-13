# Proposal — C2: Primary vs Contributing Science Programs

> **Headline:** STAR treats every selected Science Program as equal. PRMS does not — **one Primary SP owns the verdict**, Contributing SPs only accept or decline their own slice and are notified *after* the Primary approves. This chunk introduces that distinction: a role on the SP row, an "exactly one Primary" invariant, and ToC mapping restricted to the Primary SP.
>
> This is the substantive engineering chunk of AC-1676 — the only one with a schema migration and a real FE redesign.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/primary-contributing-sp/` |
| Chunk | **C2 of 2** (AC-1676 split) |
| Parent proposal | [`../mapping-adjustments/proposal.md`](../mapping-adjustments/proposal.md) |
| Jira | [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676) · Epic [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Adjustments | **A3** (SP roles) · **A4** (ToC restricted to Primary) · **A7** (PI-approval gate — **blocked, OQ-1**) |
| **Type** | **Change** |
| **Approval Mode** | **gated** |
| Depends on | **C1** ([`../toc-optional-mapping/`](../toc-optional-mapping/proposal.md)) |
| Parallel-safe | **no** — same service + same two FE components as C1 |
| Effort | **M–L** |

---

## 2. Intent

Let STAR express what PRMS enforces: exactly one Primary Science Program that owns the result's fate, plus any number of Contributing Science Programs that speak only for themselves.

---

## 3. Problem / Current Behavior

### 3.1 SPs are a flat, role-less list

`result_pool_funding_alignment_sp` (`entities/result-pool-funding-alignment-sp.entity.ts`) stores only:

| Column | Notes |
| --- | --- |
| `id` | PK |
| `alignment_id` | FK → `result_pool_funding_alignment` |
| `sp_code` | `varchar(50)`, `@OpenSearchProperty({ type: 'keyword' })` — renamed from `lever_code` in T-15.3 |

**No role column exists.** The write path accepts `sp_codes?: string[]` (`UpdatePoolFundingAlignmentDto`) — an unordered set with no notion of primacy. The read-back returns `selected_science_programs: SelectedScienceProgramResponse[]`, likewise role-free.

Consequently STAR cannot express any of these AC-1676 rules:

- Every bilateral result submitted to PRMS must have **exactly one** Primary SP.
- The Primary SP **cannot also** be a Contributing SP.
- Only the Primary SP controls overall approval/rejection.
- Only the Primary SP may be ToC-mapped in STAR.

### 3.2 ToC mapping is open to every selected SP

`validateTocAlignments` rejects an alignment only when its `sp_code` is not in the effective selection (`sp_not_selected`, `bilateral.service.ts:892-898`). Any selected SP may carry a ToC alignment, and the per-SP table is built for exactly that.

### 3.3 The enablement gate does not match the ticket

Today the section is gated on `eligible` — derived from `is_pool_funding_contributor` (`bilateral.service.ts:554`). AC-1676 says:

> Once a result has been approved by the Principal Investigator, STAR must enable the bilateral mapping section.

**No Principal-Investigator concept exists in the result lifecycle.** A repo-wide search finds the term only inside OICR email-template migrations (`{{principal_investigator}}`). This is A7's blocker — see OQ-1.

---

## 4. Proposed Outcome

In the bilateral mapping section a contributor:

1. Designates **exactly one Primary SP** from the SPs associated with the bilateral — any allocation percentage is eligible.
2. Optionally designates **one or more Contributing SPs**, mutually exclusive with the Primary.
3. Sees the two roles **visually distinguished**, each labelled `SP06 – 10% – Climate Action`.
4. Is offered the detailed ToC mapping (C1's reworded question) **for the Primary SP only**.
5. Is prevented — server-side — from saving zero or multiple Primaries, or from naming the same SP in both roles.

---

## 5. Scope

### In scope

1. **Migration** adding an SP-role discriminator to `result_pool_funding_alignment_sp` (append-only), plus the backfill decided by OQ-2.
2. **Entity + repository** updates for the new column.
3. **DTO** — express the Primary/Contributing split on the PATCH body and the read-back.
4. **Validation** — "exactly one Primary", "Primary ∉ Contributing", and ToC alignments restricted to the Primary `sp_code`, expressed in the existing per-alignment 400 vocabulary.
5. **FE** — selector redesign (Primary picker + Contributing multi-select, visually distinct) and ToC block gating.
6. **A7 enablement gate** — *only if* OQ-1 resolves in time; otherwise deferred with the gate left as-is.
7. Swagger + `docs/ux-ui/design.md` §12.2 decision entry.

### Non-goals

- **Deleting the per-SP ToC table or collapsing it to a single Primary row.** Explicitly preserved — parent §11 condition 2. STAR restricts *who may write*; the table shape stays.
- **Deleting existing Contributing-SP ToC rows.** Retention pending OQ-3.
- **Any PRMS submission or notification behavior** — descoped 2026-08-12.
- **Widening `is_read_only`** or touching pool-funding derivation.
- Re-litigating C1's validator relaxation.

---

## 6. Affected Users, Systems, And Specs

| Surface | Change |
| --- | --- |
| Result Contributor | New two-role SP selection; ToC offered for Primary only |
| MEL Regional Expert | Reads role-attributed SPs |
| `db/migrations/` | 1 append-only migration (role column + index + backfill) |
| `entities/result-pool-funding-alignment-sp.entity.ts` | New column; OpenSearch decoration decision (R-7) |
| `repositories/result-pool-funding-alignment-sp.repository.ts` | Role-aware persistence |
| `bilateral.service.ts` | `updateAlignment`, `validateTocAlignments`, `getAlignment` read-back, `findPoolFundingAlignmentContext` projection |
| `dto/update-pool-funding-alignment.dto.ts`, `dto/bilateral-science-programs.response.dto.ts` | Role on input + output |
| `pool-funding-alignment.component.*` (717 L + 275 L HTML) | Selector redesign |
| `sp-toc-alignment-block.component.*` (480 L) | Render for Primary only |
| Existing specs | ~2645 L FE + `bilateral.service.spec.ts`, `bilateral.service.updateAlignment.tocAlignments.spec.ts`, `bilateral.controller.spec.ts` |
| Socket | `result.pool-funding-alignment.changed` — payload may need role awareness |
| OpenSearch | `sp_code` is indexed; decide whether role joins it (R-7) |

---

## 7. Visual Reference

- **Source:** Jira attachments + Miro reference flow — **not yet ingested**.
- **Location:**
  - Miro: `https://miro.com/app/board/uXjVHYHjK3s=/?moveToWidget=3458764677790590965&cot=14`
  - `image-20260717-140125.png` (302 KB) — ToC Alignment block
  - `image-20260721-135915.png` (54 KB) — post-submission / review state
- **Notes:** **Blocking.** The Primary/Contributing selector is a genuine UX redesign, and the 2026-05-24 decision (`docs/ux-ui/design.md` §12.2) makes the mockups canonical for this tab — the previous remediation pass on this exact component existed because it drifted from Figma. Download to `docs/specs/bilateral/mapping-adjustments/mockup/` before `/akili-specify`.

---

## 8. Requirement Delta Preview

### ADDED

- **SP role** persisted per selected SP: Primary or Contributing.
- **Invariant: exactly one Primary** per bilateral result, enforced server-side.
- **Invariant: Primary ∉ Contributing** — mutual exclusion.
- **Visual distinction** between Primary and Contributing in the selector, each showing code – allocation% – name.
- New per-alignment / per-request 400 codes for the two invariants (naming to follow the existing `snake_case` vocabulary).

### MODIFIED

- **`sp_codes[]`** on the PATCH body — must now convey role. Shape decision belongs to design (OQ-C2-1).
- **`selected_science_programs[]`** on the read-back — gains role.
- **`validateTocAlignments`** — an alignment whose `sp_code` is not the Primary is rejected.
- **ToC block rendering** — Primary only.
- **Enablement gate** — `eligible` → PI-approved, *if* OQ-1 resolves.

### REMOVED

- Nothing. No column dropped, no endpoint retired. Contributing-SP ToC rows are **retained** pending OQ-3.

---

## 9. Risks, Dependencies, And Open Questions

| # | Risk | Why it bites | Mitigation |
| --- | --- | --- | --- |
| **R-4** | **Backfill.** Existing results carry N role-less SPs. | Post-migration every legacy result violates "exactly one Primary". | **OQ-2.** Whichever way it goes, the migration must not retro-break `is_read_only` results — those are locked and cannot be repaired by a user. |
| **R-5′** | Adding required-role semantics to `sp_codes[]` is an **FE-visible contract change**. | The STAR FE writes this body today. | Version or shape the change so an un-updated FE fails loudly, not silently into "no Primary". |
| **R-6** | ~2645 L of FE spec plus the server specs. | Selector redesign ripples widely; client branch floor is 20%. | Budget spec rewrite as its own task; assert role behavior explicitly. |
| **R-7** | `sp_code` is `@OpenSearchProperty`-decorated; D-pf-5 already records one drift axis on this module. | An unindexed role column adds a second. | Decide in design and record either way. |
| **R-9′** | Temptation to widen `is_read_only` so role can be fixed on locked results. | Would break A10, which already passes. | **Do not.** Handle locked legacy rows via the OQ-2 backfill instead. |
| **R-C2-1** | ToC rows orphaned when an SP loses Primary status or the Primary changes. | Existing SP-deselection cascade runs on *every* PATCH (Reviewer-adjudicated, T-06) — role changes may trigger it unintentionally. | **OQ-5.** Specify role-change semantics against the existing cascade explicitly; add a test that pins current cascade behavior first. |

**Dependencies:**

- **C1** must land first — shared validator and components.
- **Mockups** (§7) — blocking.
- **OQ-1 and OQ-3 answers** — blocking for A7 and the data model respectively.
- CLARISA SP list with allocations — already wired via `getScienceProgramsForResult`.

**Open questions:**

| # | Question | Impact |
| --- | --- | --- |
| **OQ-1** | **What is "approved by the Principal Investigator"?** No PI concept exists in the result lifecycle — the term appears only in OICR email templates. An existing `result_status` transition? The OICR PI flow? A new role (feeding PRD OQ-2's canonical role list)? | **Blocks A7 entirely.** C2 can ship A3+A4 without it. |
| **OQ-2** | **Backfill:** leave legacy SPs role-unset and treat as "Primary not yet chosen" in the UI, or auto-promote the highest-allocation SP? | Migration + FE empty state |
| **OQ-3** | **Ticket contradiction** (parent §9.3): only-Primary-maps vs per-SP storage and a per-SP align question. **Working assumption:** STAR *writes* Primary-only; the per-SP table is retained. **Deleting Contributing rows would foreclose the deferred PRMS story** — do not do it without an explicit BA decision. | Data model |
| **OQ-5** | Can the Primary SP be **changed** after selection? Does that cascade-delete its ToC alignment? | Cascade semantics (R-C2-1) |
| **OQ-C2-1** | Wire shape: keep `sp_codes[]` and add `primary_sp_code`, or replace with a `science_programs[{ sp_code, role }]` array? | API contract + FE |
| **OQ-7** | Carried over: **OQ-V2-3** (one-alignment-per-SP cardinality) now interacts directly with the Primary-only rule. | Schema |

---

## 10. Approach Options

| Option | Description | Trade-offs |
| --- | --- | --- |
| **A — `is_primary` boolean on the SP row** | Add `is_primary tinyint(1) default 0` + partial-unique index enforcing one true row per alignment. | ✅ Smallest migration; DB-level enforcement of the core invariant; mirrors the partial-unique pattern already used by `result_pool_funding_toc_alignment` (`1779190000015`), so it is a known-good shape in this module. ⚠️ Boolean can't express a future third role. |
| **B — `sp_role` enum column** (`PRIMARY` / `CONTRIBUTING`) | Add a varchar/enum role. | ✅ Extensible; self-documenting in queries and OpenSearch. ⚠️ "Exactly one Primary" needs a filtered unique index on `(alignment_id, sp_role) WHERE sp_role='PRIMARY'` — same mechanism as A, so no real cost difference. |
| **C — `primary_sp_code` on the parent alignment row** | Store the Primary on `result_pool_funding_alignment`; leave the SP table untouched. | ✅ No change to the SP table or its OpenSearch mapping. ❌ Splits one concept across two tables; mutual exclusion becomes application-only; a Primary could reference an SP not in the selected set. Rejected. |

---

## 11. Recommended Approach

**Option B — an `sp_role` column** with a partial-unique index enforcing one `PRIMARY` per alignment.

Reasoning:

- **Enforce the invariant in the database, not just the service.** "Exactly one Primary" is the rule the whole feature rests on, and this module already proved the partial-unique pattern works here (migration `1779190000015`).
- **Prefer the enum over the boolean** at equal migration cost. Roles are the domain vocabulary AC-1676 uses throughout, and PRMS distinguishes them behaviorally. A named role reads correctly in queries, in the OpenSearch document, and in the deferred PRMS payload — where a bare `is_primary` would need translating at every boundary.
- **Mutual exclusion becomes structural.** One row per `(alignment, sp)` carrying exactly one role makes "Primary ∉ Contributing" impossible to violate by construction, rather than a check that can be forgotten.

Sequence within C2: migration + backfill (OQ-2) → server validation + read-back → FE selector → ToC gating (A4) → A7 only if OQ-1 lands.

---

## 12. Success Criteria

- Saving **zero** or **two** Primary SPs is rejected server-side with a clear error code; the DB index makes two Primaries unreachable even if the service check is bypassed.
- The same SP cannot occupy both roles.
- A ToC alignment for a non-Primary `sp_code` is rejected.
- The ToC block renders for the Primary SP only; Contributing SPs render without it.
- Both roles display `SP06 – 10% – Climate Action` and are visually distinguishable per the mockup.
- Legacy results behave per the OQ-2 decision; **no `is_read_only` result is broken** by the migration.
- The per-SP ToC table and its partial-unique constraint survive intact.
- C1's partial-completion behavior still works for the Primary SP.
- Server Jest ≥ 60% all metrics; client floors held; full suite green.
- Migration append-only; no merged migration edited.
- `docs/ux-ui/design.md` §12.2 gains a decision entry.

---

## 13. Next Step

C1 first. Then:

```text
/akili-specify docs/specs/bilateral/primary-contributing-sp
```

Before that runs, land **OQ-1**, **OQ-2**, **OQ-3**, and the mockups (§7). OQ-3 in particular decides whether Contributing-SP ToC rows are retained — and getting that wrong would foreclose the deferred PRMS story.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
