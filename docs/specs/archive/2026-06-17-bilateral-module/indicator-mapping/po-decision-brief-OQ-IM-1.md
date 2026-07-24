# PO decision brief — OQ-IM-1 (contribution body shape)

> **Audience:** Product Owner (MEL).
> **Decision needed from you:** one yes/no answer (§1).
> **By when:** ideally **2026-06-03** (one calendar week from this brief). Each week of delay shifts the ship date by ~one week. See §5.
> **Asked by:** ARI backend + STAR FE teams jointly. The FE is blocked on this answer; the backend is not (see §6).
> **Status of related FE deliverables:** see §6 — three path-independent fixes are starting in parallel regardless of your answer.
> **Date:** 2026-05-27.
> **Prepared by:** ARI backend team.
> **References:** [`./backend-response-to-fe.md`](./backend-response-to-fe.md) §2 (where this question originally surfaced); [`../requirements.md`](../requirements.md) R-BIL-031 (the requirement under review).

---

## 1. The one question we need you to answer

> **Should we replace the current 5-type polymorphic contribution body with a unified `{ reason_code, quantitative_contribution_value? }` shape?**
>
> ☐ **Path A — Yes.** Retire R-BIL-031. Backend rebuilds contributions as one shape. FE redesign simplifies. We lose per-type field richness (women/men counts, KP metadata, policy stage, innovation typology) for downstream consumers.
>
> ☐ **Path B — No.** Affirm R-BIL-031. Backend keeps the 5 polymorphic handlers. FE either builds 5 form variants (extra ~2–3 weeks of design + build) or coerces every card into the "narrative-only" NOOP shape (data debt, UX confusion).

The rest of this document explains what each path means in practice, what you're locking in, and the deadline impact of waiting.

You're being asked to decide on **one requirement: R-BIL-031.** Two related design decisions (D5 + D12) are sometimes mentioned alongside, but they become downstream consequences of your choice on R-BIL-031 — you don't need to think about them separately. See [§8](#8-precision-note) for why.

---

## 2. Path A — Simplify (retire R-BIL-031)

### What changes

**Contribution body becomes:**

```jsonc
{
  "indicator_type": "<same value as today, kept for routing>",
  "reason_code": "direct_contribution | aligned_with | reference_only | other",  // taxonomy TBD by BA — see OQ-IM-4
  "quantitative_contribution_value": 42.5,        // optional decimal — only when the indicator type is quantitative
  "narrative": "operator-supplied free text"      // optional
}
```

That's it. Same body for every indicator, regardless of type.

### What backend has to do

| Step | Effort | Notes |
|---|---|---|
| Migration on `result_pool_funding_indicator_mapping` — deprecate 4 polymorphic FK columns (`result_capacity_sharing_id`, `result_knowledge_product_id`, `result_policy_change_id`, `result_innovation_dev_id`), add 2 new columns (`reason_code VARCHAR(64)`, `quantitative_contribution_value DECIMAL(15,4)`). | S | Forward migration is safe. Old columns kept nullable for one release cycle for audit-trail readability before being dropped. |
| Retire 4 of 5 handlers (`capacity-sharing`, `knowledge-product`, `policy-change`, `innovation-development`); keep `noop` as the new unified writer. | S | Files exist; just remove from the DI graph. |
| Refactor `BilateralService.upsertContribution` to write the new flat shape. | M | ~1 day including specs. |
| Update DTO (`ContributionDto` collapses to the simplified shape). | S | |
| Update audit trail (`ResultReviewHistory.payload_before/after`) to serialize the new shape. | S | Historical rows stay readable (they're JSON snapshots). |
| Decide backfill strategy for existing rows — see §4. | M | Could be a few days depending on PO/BA call. |
| Doc updates (handoff §4.5 + §7 + change log). | S | |

**Backend estimate: ~1 week of focused work after PO approves AND OQ-IM-4 closes** (reason_code taxonomy values defined by BA). Both must close before backend can start.

### What FE has to do under Path A

One form per indicator card with two inputs: a "reason" dropdown (5–10 values from OQ-IM-4) and a "quantitative value" number input. No type-specific variants. Matches the simplified mockups the FE already has.

**FE estimate (per FE team): ~2 weeks of build after backend ships.**

### What we LOSE under Path A

| Data captured today | Lost under Path A | Workaround if needed later |
|---|---|---|
| `capacity_sharing`: women / men / non_binary counts, `has_unkown_using`, `capdev_term_id`, `capdev_delivery_method_id` | All gone from bilateral contributions. The underlying `result_capacity_sharing` table is still maintained by other STAR flows; bilateral just stops linking to it. | Reintroduce as optional `extra_metadata` JSON column in a Phase 3 migration if the data turns out to be needed. |
| `knowledge_product`: `handle`, `licence`, `peer_reviewed`, `is_isi`, `accessibility`, `knowledge_product_type` | Same pattern. | Same. |
| `policy_change`: `policy_type_id`, `policy_stage_id`, `implementing_organizations[]`, `amount` | Same. | Same. |
| `innovation_development`: `innovation_typology`, `innovation_developers`, `readinness_level_id` | Same. | Same. |
| `narrative` (already on NOOP today) | **Kept** — preserved as the optional `narrative` field. | n/a |

**Important nuance:** the 4 per-type tables (`result_capacity_sharing` etc.) are **not bilateral-owned**. They're general STAR result tables used across the platform. Bilateral was just **linking** to them via FKs. Path A drops the link, not the tables — STAR's other flows that write to those tables are unaffected.

---

## 3. Path B — Keep polymorphic-5 (affirm R-BIL-031)

### What stays the same

Everything on the backend. Zero changes to schema, services, DTOs, handlers, audit trail. R-BIL-031 + D5 + D12 stay in force as written.

### What FE has to do under Path B

One of two sub-options, and the FE team needs you to pick (this is a designer/PO call, not engineering):

| Sub-option | Description | Cost |
|---|---|---|
| **B1 — Five form variants** | FE builds 5 distinct form components, one per `indicator_type`. The card opens a different layout depending on whether the indicator is `capacity_sharing` (women/men/non_binary inputs), `knowledge_product` (handle + DOI + peer-review checkbox), `policy_change` (stage + type + org picker), `innovation_development` (typology + readiness level), or `NOOP` (narrative only). | ~2–3 weeks design pass + ~2–3 weeks build. **Total: ~4–6 weeks of FE.** |
| **B2 — Coerce-to-NOOP** | FE saves every card as `indicator_type: "NOOP"` regardless of the indicator's actual type. Only the narrative field is collected. Same UX as Path A from the user's POV. | Cheap to ship (~1 week FE). **But:** introduces data debt — the per-type fields stay in the schema, expecting data the FE never sends. Downstream consumers (search, push, audit) see incomplete records for every non-NOOP indicator. Effectively a worse Path A: you keep the costs of the polymorphic schema while losing the richness. |

### What we KEEP under Path B (vs Path A)

Per-type richness for downstream consumers — assuming the FE actually fills those fields in (B1) and not just NOOPs everything (B2):
- **AC-1440 audit trail** keeps the structured per-type payload visible in history events
- **Future PRMS push payload** (Phase 3, blocked on OQ-US5-3/6) keeps the option of pushing typed contributions if PRMS ever accepts them
- **Future CGSpace/MQAP knowledge-product integration** (Phase 2 follow-up per D9) has the metadata it needs

### Risk if you pick B but the FE silently does B2

This is the worst outcome — schema says one thing, data says another. Backend can't tell which contributions were authored under "real" B1 forms vs B2 stubs. Search and audit go stale. Recommend: if you pick Path B, **explicitly require B1** (or pick Path A instead).

---

## 4. What's locked under each path

| Locked decision | Path A | Path B |
|---|---|---|
| **R-BIL-031** | Retired. New requirement (R-BIL-031-v2 or new ID) replaces it with the simplified body. | Affirmed as-is. |
| **D5** (whether to add `result_innovation_use` as a 6th type) | Becomes moot — no per-type tables linked anymore. | Stays as written ("defer Phase 1"). Could be revisited later. |
| **D12** (preserve backend-compatible typos like `has_unkown_using`) | Becomes moot — those fields go away. | Stays in force. FE must keep the typos. |
| **R-BIL-032** (contribution amount/quantification per indicator type) | Replaced by `quantitative_contribution_value` field; per-type quantification rules collapse. | Stays as written. |
| **R-BIL-041** (PRMS push payload — also references D12) | Reopens as a Phase 3 question: does the simplified body push to PRMS as-is, or do we need a transform layer? | Stays as written. |
| **AC-1440 (Jira)** | Closed with a Phase 2 follow-up issue documenting the simplification. | Stays in scope. |

---

## 5. Deadline impact — concrete dates

| PO decision lands by | Path A ships by | Path B (variant B1) ships by | Net delay vs Path A baseline |
|---|---|---|---|
| **2026-06-03** (1 week from now — recommended) | **~2026-06-24** (3 weeks: backend ~1 wk + FE ~2 wk, parallel where possible) | **~2026-07-22** (5–6 weeks: backend 0 + designer pass 2–3 wk + FE build 2–3 wk) | Path B = ~4 weeks slower |
| 2026-06-17 (2 weeks from now) | ~2026-07-08 | ~2026-08-05 | every PO-week-delayed = one ship-week-delayed |
| 2026-07-01 (1 month from now) | ~2026-07-22 | ~2026-08-19 | same |
| **No decision** | indefinite hold on the indicator-mapping write flow | indefinite hold | FE picks up unrelated work; bilateral indicator mapping ships only when this answer lands |

**The bilateral SP picker / HLO panel / read-only gate already shipped (2026-05-27).** Operators can already align results to SPs. What's blocked is the per-indicator contribution write flow — the form that opens when an operator clicks an HLO/indicator card and wants to say "yes, my result contributes to this, because X, with quantitative value Y."

There is **no external deadline forcing a fast call** (no MEL deadline, no demo, no contract milestone we're aware of). The cost of delay is opportunity cost on FE and a slipped Phase 2 launch — not a missed external commitment. **A measured 1–2 week decision window is reasonable**; longer than that and FE starts to drift onto unrelated work.

---

## 6. What ships regardless of your answer (no engineering idling)

Three FE fixes are **already in flight** in parallel with this brief. They fix real, user-visible bugs in the alignment section that just shipped — they don't depend on Path A vs B:

| Fix | What it does | Estimated FE effort |
|---|---|---|
| SP picker endpoint switch | Replace the call to `/api/tools/clarisa/science-programs` (always returns 13 SPs) with `/api/v1/results/:resultCode/pool-funding-alignment/science-programs` (scoped to the result's mapped CLARISA project). Today users on D527 / STAR-19793 see all 13 SPs in the picker — should see only the 2 SPs CLARISA links to that contract's project. | ~half day |
| `is_read_only` union handling | Distinguish "synced to PRMS" (existing badge) from "owned by PRMS" (new state — `platform_code === 'PRMS'`). Different copy, same disabled inputs. | ~half day |
| `unknown_sp_codes` 400 handler | When PATCH alignment is rejected with `errors.unknown_sp_codes: ["SPxx"]`, surface the rejected codes as field-level errors on the form (today it likely shows a generic toast). | ~half day |

**Total: ~2–3 days of FE work, shipping visible value this week**, independent of your decision on R-BIL-031.

This means: even if you take a month to decide on Path A vs B, the user experience on the alignment section keeps improving in the meantime. Engineering is not blocked, only **the indicator-mapping write flow** is.

---

## 7. Who else cares about your answer

| Stakeholder | Why they care | Impact under Path A | Impact under Path B |
|---|---|---|---|
| **STAR FE team** | Builds the indicator-mapping cards. Can't ship the redesign until this is decided. | Unblocks ~2 weeks of work. | Forces a decision between B1 (~4–6 wk) and B2 (debt). |
| **MEL data consumers** (PO + reporting) | Use the per-type data downstream (women/men breakdowns for capacity sharing, KP metadata for knowledge products, etc.). | **Lose access** to these fields on bilateral contributions. Other STAR flows (non-bilateral) still capture them. | Keep current data quality. |
| **PRMS push team** (future T-25..T-28 — currently blocked) | Will design the PRMS push payload when push unblocks. | Push payload becomes simpler. May need a transform layer if PRMS expects typed contributions. | Push payload can use the polymorphic data as-is. |
| **Search team** (OpenSearch — `result_pool_funding_indicator_mapping` is indexed) | Bilateral mapping search uses 4 indexed fields: `lever_code`, `indicator_code`, `indicator_type`, `is_stale`. **None of the polymorphic FKs are individually indexed.** | **No search-team impact.** Verified 2026-05-27 in the entity's `@OpenSearchProperty` decorators. | No impact (status quo). |
| **Audit-trail consumers** (`ResultReviewHistory` for INDICATOR_MAPPING_CHANGED events) | Show "what changed" diffs in admin tools. | Audit payload shrinks to `{reason_code, quantitative_contribution_value, narrative}`. Historical rows (already serialized JSON snapshots) remain readable as-is. | No change. |
| **BA / requirements team** | Owns R-BIL-031 + D5 + D12 + the open questions (OQ-IM-1, OQ-IM-4). | Need to draft the `reason_code` taxonomy (OQ-IM-4) — gating for backend to start. | OQ-IM-4 becomes moot. |
| **AC-1440 Jira ticket** (original "Map results to indicators" user story) | Authoritative business requirement for the per-indicator contribution flow. | Needs a Phase 2 follow-up ticket noting the simplification. | Stays as-is. |

---

## 8. Precision note — what's actually on the table

The FE's original framing of this question (in `indicator-mapping/backend-response-to-fe.md`) suggested retiring three things together: **R-BIL-031 + D5 + D12**. A backend audit on 2026-05-27 found the framing was slightly loose:

- **R-BIL-031** is the actual polymorphic-5 contract (AC.1 lists the 5 types; AC.2 references the 4 existing typed tables). **This is the one thing you're being asked to retire or affirm.**
- **D5** is a sub-decision under R-BIL-031 about whether to add a 6th type (`result_innovation_use`). It was already deferred ("option C — defer Phase 1"). Becomes moot under Path A, unchanged under Path B.
- **D12** is about preserving typos in field names like `has_unkown_using`. Only relevant if the polymorphic schema stays (Path B). Becomes moot under Path A because those fields go away.

So **the brief here treats this as a single yes/no question on R-BIL-031**, with D5 + D12 as automatic downstream consequences. You don't need to think about three things — just one.

---

## 9. Recommendation (from backend, not binding)

We recommend **Path A** if any of the following apply:

- Mockups already exist for the simplified per-card form (FE has indicated they do).
- The per-type fields lost under Path A are **not actively used** by MEL today on bilateral contributions (worth a 5-min check with MEL — if no one reads `women/men/non_binary` for bilateral capacity sharing today, dropping it is free).
- A 2–3 week ship window matters more than full data parity with the rest of STAR.
- You're willing to revisit per-type richness in a Phase 3 spec if/when the data turns out to be needed (the `extra_metadata` JSON column fallback is cheap to add later).

We recommend **Path B (variant B1)** if:

- MEL or downstream reporting actively consumes the per-type fields on bilateral contributions today (verify this with the reporting team).
- The ~4–6 week ship cost is acceptable.
- The PRMS push payload (Phase 3) is expected to include typed contributions.

We recommend **against Path B variant B2** in all cases — it has the worst-of-both-worlds property.

---

## 10. How to answer

Reply to this brief with one of:

- **"Path A — retire R-BIL-031."** Backend starts on the migration the same week (assuming BA closes OQ-IM-4 in parallel).
- **"Path B variant B1 — affirm, FE builds 5 form variants."** Backend stays out of the way; FE starts the 4–6 week sequence.
- **"Path B variant B2 — affirm, FE coerces to NOOP."** Backend stays out of the way but please understand the data-debt implications (see §3).
- **"I need more information before deciding."** Tell us what you need; we'll add it to this brief or set up a call.

---

## 11. Appendix — files to read if you want more context

- [`./backend-response-to-fe.md`](./backend-response-to-fe.md) §2 — where this question originally came from (the FE's audit + the three Paths they sketched).
- [`../requirements.md`](../requirements.md) §R-BIL-031 (line 320 onward) — the requirement under review.
- [`../design.md`](../design.md) §D5 (line 1037), §D12 (line 1044) — the two design decisions sometimes mentioned alongside.
- [`../frontend-handoff.md`](../frontend-handoff.md) §4.5 + §7 — the current contract the FE is shipping against.
- [`../frontend-data-model.md`](../frontend-data-model.md) — context on the new bilateral data model overall (per-result SP picker, AOW derivation, etc.) — useful background but not directly affected by this decision.

---

## 12. Change log

| Date | Change | Author |
|---|---|---|
| 2026-05-27 | Initial brief. Drafted in response to the FE team's request for a path-agnostic one-pager to escalate OQ-IM-1 to the PO without committing engineering to a direction. | ARI backend team |
