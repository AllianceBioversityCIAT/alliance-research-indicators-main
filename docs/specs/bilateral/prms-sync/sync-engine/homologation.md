# Field Homologation — PRMS Normalizer ⟷ STAR

> **What this is.** A field-by-field reconciliation between what the **PRMS Normalizer
> `POST /ingest`** contract demands and what the **STAR** data model actually holds today.
> Every row answers one of four questions: *we have it*, *we can derive it*, *we have
> something that could serve*, or *it does not exist and must be built*.
>
> **Scope of evidence (KZ-017 — what this document CANNOT reach).** Every ✅/⚠️/❌ below was
> read from the **TypeORM entity definitions and enums in the working tree** on 2026-09-14.
> It therefore does **not** prove: (a) that the live MySQL schema matches the entities,
> (b) that any given column is *populated* in practice, (c) that CLARISA ids in STAR seeds
> equal the ids PRMS resolves against, or (d) that the PRMS Normalizer accepts any payload
> built this way. (c) and (d) are closed only by the **TEST-env spike** (T-SPIKE in the
> proposal), never by reading code.

---

## 0. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/sync-engine` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md)) |
| Date | `2026-09-14` |
| Contract revision | PRMS Normalizer – Technical Field Documentation, **2026-09** revision (with 2026-08 breaking changes) |
| Source artifacts | `PRMS Normalizer – Technical Field Documentation*.md` + 7 payload examples (`cap-sharing`, `inno_dev`, `inno_use`, `kp`, `other_outcome`, `other_output`, `policy`) — currently outside the repo, see R-F5 |
| Status | **Revision 2 — 2026-09-14, decisions D-1…D-7 applied** (see §1.1). Gaps G-1…G-7 are all resolved by a product decision; none blocks `/akili-specify`. |

### Legend

| Mark | Meaning |
|---|---|
| ✅ **EXACT** | STAR holds the value directly; a 1:1 read. |
| 🟢 **DERIVED** | STAR holds the parts; the value is computed with a rule stated in the row. |
| 🟡 **HOMOLOGABLE** | No direct equivalent, but an existing STAR field can serve. **The row names the candidate and what must be decided.** |
| 🔴 **MISSING** | Does not exist in STAR. Needs a new column, a new UI, or an explicit product decision. |
| ⚫ **N/A** | Constant, or legitimately omitted (optional field STAR has no concept of). |

---

## 1. Executive summary

Of the **58 contract fields** reconciled below, **51 are satisfiable today** from the STAR model.
The other **7 (G-1…G-7) were put to the product owner on 2026-09-14 and all 7 are now decided** —
§1.1 records each decision and what it costs. Nothing in this homologation blocks
`/akili-specify` any more; the TEST-env spike ran 2026-09-14 and §11 now shows two items closed
(OQ-F7, OQ-H9) and two open at the persistence/composition layer (OQ-H5, OQ-H6).

### 1.0 Governing principle — **P-1: what we do not have, we do not send**

> **STAR never authors reporting data on the user's behalf.** If a value was not entered,
> confirmed, or accepted by a reporting user, it is not sent to PRMS — not as a default, not as an
> inference, and not as a "technically true" placeholder that makes a payload validate.
>
> The distinction that matters: *STAR does not hold the value* and *the user has declared the
> value is undetermined* are *different statements*. The first is about our schema; the second is a
> reporting claim with an author. Emitting the second because the first is true would put STAR's
> assumption into the user's report under their name.
>
> **This overrides convenience, and it overrides passing validation.** Where a field cannot be
> filled from data a user actually provided, the correct outcome is that the result is **not
> synced** — visibly, with a stated reason — never that it is synced with a value we chose.
>
> *(Established 2026-09-14 by the product owner, rejecting a proposal to emit
> `is_determined: true` on every bilateral project because STAR structurally never determines the
> amount. The reasoning was wrong in exactly the way this principle names.)*
>
> **P-1 binds every child of this family and every future field decision.** §1.4 lists what it
> removes beyond Innovation Use.

### 1.1 Decisions applied (2026-09-14, product owner)

| # | Gap | Decision | Consequence — recorded, not hidden |
|---|---|---|---|
| **D-1** | **G-1** `usd_budget` / `is_determined` | **Not built, and not substituted (P-1).** STAR holds no per-result, per-contract USD contribution. Emitting `is_determined: true` instead was **considered and rejected**: it would assert a reporting claim the user never made. | 🔴 **Innovation Use is not synced in v1** — gated out at the endpoint with a stated reason (OQ-H1' closed → option (a)). Revisit only after the **PRMS PO meeting** (§11.1). |
| **D-2** | **G-2** `status_amount` + `amount` | **Not built, and not substituted (P-1).** | ⚠️ **Reachable, not hypothetical.** STAR seeds *"Program, Budget, or Investment"* (`1730993015550`) and `PolicyTypeHomologation` maps it to PRMS `policy_type.id = 1`, which makes both fields mandatory. That **one subtype is gated out** at the endpoint (OQ-H2' closed → option (a)); *Legal instrument* and *Policy or strategy* sync cleanly. Revisit at the PRMS PO meeting. |
| **D-3** | **G-3** `lead_contact_person` | **Closed — no gap.** Main contact is **mandatory on every STAR result**, so `result_users` + `MAIN_CONTACT (1)` is always populated. | ✅ No fallback chain needed. Row downgraded to **EXACT** in §4. |
| ~~**D-4**~~ | **G-4** `knowledge_product.handle` | **REVERSED 2026-09-16 by the product owner.** D-4 read: *"Knowledge Product is out of scope. KPs are not STAR's to create — STAR stores imported ones but cannot author them, so it has nothing to push."* The technical half of that argument is resolved — the handle **is** available, see **D-4b** below. The product half was a judgement and the owner has reversed it: KPs **will** be sent. | 🟡 Supported type set returns to **5**. `handle` is resolved from `result_evidences`. |
| **D-4b** | **G-4** `knowledge_product.handle` | **2026-09-16 — the handle's source, measured.** The TIP importer writes **two** evidence rows per KP, discriminated by `evidence_description` (`tip-integration.service.ts:341-352`): `'Handled'` carries the handle, `'DOI'` carries the doi. `'Handled'` is almost certainly a typo for `'Handle'`; it is the literal value in the data and is matched **exactly**. Confirmed on a real Dev row: `result_id 8741` → evidence `13135` (`Handled`, `https://hdl.handle.net/10568/148990`) and `13136` (`DOI`). **Only TIP-imported KPs are syncable** — a KP arriving by any other route has no such row and is refused, never sent with a guessed value (P-1). | ✅ Closes G-4, which D-4 had closed *without resolving*. Full live evidence: [`docs/specs/changes/prms-sync-knowledge-products/spike/`](../../../changes/prms-sync-knowledge-products/spike/README.md) |
| **D-5** | **G-5** `evidence[].link` | **No STAR-side restriction.** Links keep working exactly as they do today. | ⚠️ The 2026-08 PRMS rules (scheme required, file-storage hosts rejected) still apply **on their side**. With no pre-flight, the **207 per-row interpretation (R-E1) becomes the only thing standing between a refused link and a wrongly-synced result.** That single mechanism is now load-bearing. |
| **D-6** | **G-6** `title` / `description` length | **Not blocking — confirmed with the PRMS developer.** Long titles and descriptions pass. | ⚫ No guard built. ⚠️ This is a **verbal confirmation that contradicts the written contract** (which states max 30 / 150 words). Record who and when; re-check if ingest starts rejecting on length (K-013). |
| **D-7** | **G-7** centers | **Resolved via the primary contract, one institution each.** `agresso_contract.ubwClientDescription` holds `ExCIAT` or `ExBIO`: **`ExCIAT` → `46`**, **`ExBIO` → `49`** (see §1.3). | ✅ Mechanism exists and is already exercised inbound. **Confirms family OQ-F3's original 46/49 split** and supplies the field that drives it. *(Revised 2026-09-14 within the same session: an earlier reading of this decision collapsed both values onto `49` because the CIAT variant was thought inactive. The centres are active; the split stands.)* |

### 1.4 What P-1 removes beyond Innovation Use

Re-reading this homologation against P-1 caught **three further places** where an earlier draft
proposed to infer a reporting value. All three are withdrawn:

| Field | What was proposed | Why P-1 removes it |
|---|---|---|
| `number_people_trained.unknown` | Map the remainder of `session_participants_total` minus women + men + non_binary | That remainder is an **arithmetic artefact**, not a reported figure. Nobody ever declared "N participants of unknown gender"; it could equally be a data-entry slip in the total. **Omit the field.** |
| `innovation_developers` | Compose a `; `-joined list from `result_users` / `result_institutions` | STAR captures those people under *different questions* (contacts, partners). Re-labelling them as *developers* is our interpretation of their role, not theirs. Optional field → **omit.** |
| `innov_use_to_be_determined` | Derive it from "no actor rows and no quantification rows" | Same shape as the `is_determined` proposal P-1 was established to reject: absence of data in STAR inferred into a positive declaration. *(Moot while Innovation Use is gated out, but it must not return through the back door when the type comes back.)* |

**What P-1 does NOT remove:** arithmetic over values a user actually entered. `women` =
`women_youth_count + women_not_youth_count` is a sum of two figures the user typed, not a new
claim — both parts exist, and the total is what they add up to. The test is *"did a person supply
this?"*, not *"is a computation involved?"*.

### 1.3 Centre map (D-7)

| `agresso_contract.ubwClientDescription` | CLARISA institution | Acronym | Name |
|---|---|---|---|
| `ExCIAT` | **`46`** | `ABC RH - CIAT (Alliance)` | Alliance of Bioversity and CIAT – Regional Hub (International Center for Tropical Agriculture / Centro Internacional de Agricultura Tropical) |
| `ExBIO` | **`49`** | `ABC - Bioversity (Alliance)` | Alliance of Bioversity and CIAT – Headquarter (Bioversity International) |

> The split is **internally corroborated**: the inbound `AcronymExContractEnum`
> (`enum/rsult-type.enum.ts`) already maps `'ABC RH' → EXCIAT` and `'ABC' → EXBIO`, and PRMS's own
> `lead_center` table gives `46` the acronym `CIAT (Alliance)` / Regional Hub and `49`
> `Bioversity (Alliance)` / Headquarter. The two catalogues agree on which is which — reuse the
> enum rather than re-deriving the comparison, and keep its `.toUpperCase().trim()` normalisation.
>
> ⚠️ A wrong branch here is **silent**: both ids are valid institutions, so PRMS accepts either
> and the result is simply attributed to the wrong centre. Assert **both** values, not one.

### 1.2 What v1 can actually deliver, per type

| PRMS type | STAR indicator | v1 outcome |
|---|---|---|
| `capacity_sharing` | 1 | ✅ **Syncs clean.** No open gap. |
| `innovation_development` | 2 | ✅ **Syncs clean.** OQ-H6 (`readiness_level` shape) — the TEST spike settled the **schema** layer only (`id`+`name`+`level` together pass; no shape is rejected). **Which key persists is still open** — no `innovation_development` call reached persistence, each blocked earlier by an unrelated `innovation_typology` catalogue rejection. See §6. |
| `policy_change` | 4 | ⚠️ **Two of three subtypes.** *Legal instrument* and *Policy or strategy* sync; *Program, Budget, or Investment* is **gated out** (D-2). |
| `innovation_use` | 6 | ⛔ **Not synced in v1** — gated out with a stated reason (D-1 + P-1). |
| `knowledge_product` | 3 | 🟡 **In scope since 2026-09-16 (D-4 reversed).** Mapped — one field, `handle`. **Built but still gated**: `KNOWLEDGE_PRODUCT` remains in `UNMAPPABLE_INDICATORS`, so the endpoint still refuses it. See D-4b and D-4c. |
| — | 5 (OICR) | ⚫ **Never sent — product decision, 2026-09-16.** PRMS has no OICR type *and* the owner has confirmed OICRs will **never** be pushed. This is not a limitation awaiting a PRMS feature: if PRMS ever adds an OICR type, this stays excluded. |

> **The honest headline:** v1 delivers **two types that sync cleanly and one that syncs for two of
> its three subtypes.** Innovation Use waits. Nothing is attempted-and-failed: every exclusion is
> refused up front with a reason the user can read, which is what P-1 requires and what makes the
> increment defensible rather than merely small.

---

## 2. Envelope

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `tenant` | ✅ | — | ⚫ Constant `"prms.result-management.api"` |
| `op` | ✅ | — | ⚫ Constant `"dataset.ingest.requested"` |
| `results[]` | ✅ | one entry per sync trigger (single-result ingest) | ⚫ |
| `results[].type` | ✅ | `results.indicator_id` → `IndicatorsEnum` | 🟢 **DERIVED** — new homologation map, see §3 |
| `results[].data` | ✅ | the Result aggregate | ⚫ **Envelope rule (D-B):** common fields in §4 remain flat at the `data` root; each type-specific block nests under its same-named object (for example, `data.capacity_sharing`). Confirmed by `spike/responses/01-capacity-sharing-scope50.json` (`requestId Root=1-6aa852fe-601bb8603e18414f743047c8`), `02-innovation-development-combined-readiness.json` (`requestId Root=1-6aa8532c-5bc036d21bb27f3109931c8a`), and `04-policy-change.json` (`requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`); see discovery-log D-B. |

### 3. Result type mapping (`IndicatorsEnum` → PRMS `type`)

| STAR `indicator_id` | STAR name | PRMS `type` | Verdict |
|---|---|---|---|
| 1 | Capacity Sharing for Development | `capacity_sharing` | ✅ |
| 2 | Innovation Development | `innovation_development` | ✅ |
| 3 | Knowledge Product | `knowledge_product` | 🟡 **In scope since 2026-09-16 (D-4 reversed).** Handle from the `'Handled'` evidence row (D-4b). Mapping built; **flow deliberately not built** (D-4c). |
| 4 | Policy Change | `policy_change` | ✅ |
| 5 | OICR | — | ⚫ **Never sent — product decision, 2026-09-16.** Previously recorded as a technical limitation (*"PRMS has no OICR type"*, family OQ-F2). The owner has since confirmed it is permanent policy, so the exclusion does **not** lapse if PRMS adds the type. |
| 6 | Innovation Use | `innovation_use` | ✅ |
| — | — | `other_output`, `other_outcome` | ⚫ PRMS accepts them; **STAR has no such indicator**. Nothing to map. |

> The map covers STAR's 6 indicators and leaves 3 PRMS types unused (`knowledge_product`,
> `other_output`, `other_outcome`). A result whose `indicator_id` is **`3` (KP) or `5` (OICR)**
> must be **refused at the endpoint** with a stated reason, not silently skipped.

---

## 4. Common fields (`common_fields.json` — every type)

| PRMS field | Req | STAR source | Verdict & rule |
|---|---|---|---|
| `external_reference` | ❌ opt | `results.result_official_code` | ✅ **EXACT.** Max 191 chars; send as string. **Send it always** — it is the only correlator on the decision webhook and it is the field that identifies a *rejected* row back to the user. |
| `keep_editing` | ❌ opt | — | ⚫ **Product decision, not a data gap.** `false`/absent → the result lands in PRMS *Pending review*. `true` → *Editing*, and a PRMS user completes the non-MDS fields. Recommend `false` for v1 (STAR results are already Approved). Must sit **inside `data`** — at the top level it is dropped before validation. |
| `created_date` | ✅ | `results.created_at` (`AuditableEntity`) | ✅ **EXACT.** ISO-8601. |
| `created_by.email` | ✅ | `results.created_by` → `alliance_user_staff.email` | ✅ **EXACT** (join on `carnet`). |
| `created_by.name` | ✅ | `alliance_user_staff.first_name` + `last_name` | 🟢 **DERIVED** — concatenation. |
| `submitted_by.email` / `.name` | ✅ | `submission_history` → `created_by` → `alliance_user_staff` | 🟢 **DERIVED.** Needs a stated selection rule: *the latest row whose `to_status_id` is the approval transition*. Ambiguous today — decide at specify. |
| `submitted_by.submitted_date` | ✅ | `submission_history.created_at` (or `custom_date`) | 🟡 **HOMOLOGABLE** — two candidate columns; pick one and say why. |
| `submitted_by.comment` | ❌ opt | `submission_history.submission_comment` | ✅ **EXACT.** |
| **`lead_contact_person.email` / `.name`** | ✅ **MANDATORY** | `result_users` where `user_role_id = UserRolesEnum.MAIN_CONTACT (1)` → `alliance_user_staff` | ✅ **EXACT — G-3 closed by D-3.** Main contact is mandatory on every STAR result, so the row is always present; no fallback chain is needed. Omission would still be a hard rejection (`(root) must have required property 'lead_contact_person'`), so the builder must fail loudly rather than send a partial object. Only `email` and `name` are allowed — **no additional properties**. |
| `lead_center.institution_id` / `.acronym` / `.name` | ⚠️ ≥1 of 3 | **`agresso_contract.ubwClientDescription`** on the result's **primary** contract | ✅ **EXACT — D-7.** `ExCIAT` → **`46`**, `ExBIO` → **`49`**; full map in §1.3. Confirms family OQ-F3's split and names the driving field. ⚠️ Separately, the doc's `lead_center` table lists CGIAR System Organization as `11605 / SO` while `contributing_center` lists `221 / SMO` — the two tables are not the same catalogue. Irrelevant to the Alliance today. |
| `title` | ✅ (≤ 30 words *per the doc*) | `results.title` (`text`, nullable) | ✅ **EXACT — G-6 closed by D-6.** No guard built: the PRMS developer confirmed long titles pass. ⚠️ Verbal confirmation **contradicting the written contract** — re-check if rows start failing on length (K-013). |
| `description` | ✅ (≤ 150 words *per the doc*) | `results.description` (`text`, nullable) | ✅ **EXACT — D-6.** Same as `title`. |

### 4.1 `toc_mapping` (the **Primary** Science Program)

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `science_program_id` | ✅ | `result_pool_funding_alignment_sp.sp_code` where `sp_role = 'PRIMARY'` | ✅ **EXACT.** This is exactly what the Pool Funding Alignment section captures. |
| `aow_compose_code` | ❌ opt | — | 🔴→⚫ **Does not exist per result.** The legacy `(SP, AOW)` pair fan-out was removed from this flow (`bilateral.service.ts:360`, R-BIL-090 AC.2). Field is **optional** → omit. Not a gap; a deliberate absence worth recording so nobody re-derives it. |
| `result_title` | ❌ opt | `result_pool_funding_toc_alignment.toc_result_title` (same `sp_code`) | ✅ **EXACT** — snapshot column, exactly the right provenance. |
| `result_indicator_description` | ❌ opt | `result_pool_funding_toc_alignment.indicator_description` | ✅ **EXACT.** |
| `result_indicator_type_name` | ❌ opt | — | 🟡 **HOMOLOGABLE.** No column. Candidates: `result_pool_funding_indicator_mapping.indicator_type`, or the STAR indicator display name (`INDICATORS_ENUM_DISPLAY_NAME`). PRMS's own examples use labels like *"Number of knowledge products"*, which match **neither** verbatim. Optional → safest v1 is to omit rather than send a value PRMS cannot resolve. |

> A "No" row (`aligns_with_toc: false`) carries `null` in every ToC column. **`toc_mapping` cannot
> be omitted — CONTRADICTED by the TEST spike, 2026-09-14 (T-01).** The object is unconditionally
> required at the root of `data`: a first call that left it out was rejected with `"(root) must
> have required property 'toc_mapping'"` (`spike/discovery-log.md` finding D-A, `requestId
> Root=1-6aa851eb-4ec93ae925475b33182f3ccf`). For a "No" row, `toc_mapping` must still be built
> from `science_program_id` alone; `contributing_programs` is a separate, additional field, never
> a substitute for `toc_mapping` itself.

### 4.2 `contributing_programs[]` (the **Contributing** Science Programs)

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `science_program_id` | ✅ | `result_pool_funding_alignment_sp.sp_code` where `sp_role = 'CONTRIBUTING'` | ✅ **EXACT.** |
| `aow_compose_code` | ❌ | — | ⚫ same as §4.1 |
| `result_title` / `result_indicator_description` | ❌ | `result_pool_funding_toc_alignment` rows for those `sp_code`s | ✅ **EXACT.** |
| `result_indicator_type_name` | ❌ | — | 🟡 same as §4.1 |

> ⚠️ `sp_role` is nullable on rows written before the `primary-contributing-sp` migration
> (R-BIL-126). A legacy alignment therefore yields **no** `PRIMARY` row and `toc_mapping`
> cannot be built. The endpoint must treat a null-role alignment as *not syncable*, not as
> *contributing*.

### 4.3 `geo_focus`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `scope_code` | ⚠️ ≥1 | `results.geo_scope_id` → `ClarisaGeoScopeEnum` | ✅ **EXACT — identical numbering.** 1 Global, 2 Regional, 3 Multi-national, 4 National, 5 Sub-national, 50 To-be-determined. Both sides use the same CLARISA scale. |
| `scope_label` | ⚠️ ≥1 | `clarisa_geo_scope.name` | ✅ **EXACT.** |
| `regions[].um49code` / `.name` | cond (scope 2) | `result_regions.region_id` → `clarisa_regions.um49Code` / `.name` | ✅ **EXACT** — the column is literally `um49Code`. |
| `countries[].id` / `.name` / `.iso_alpha_3` / `.iso_alpha_2` | cond (3–5) | `result_countries.isoAlpha2` → `clarisa_countries.code` / `.name` / `.isoAlpha3` / `.isoAlpha2` | ✅ **EXACT.** `id` ← `clarisa_countries.code` (CLARISA numeric code). |
| `subnational_areas[].id` / `.name` | cond (5) | `result_countries_sub_nationals.sub_national_id` → `clarisa_sub_nationals.id` / `.name` | ✅ **EXACT.** |

**Conditional rules STAR must pre-validate (PRMS rejects otherwise):** scope 1 → *no* regions/countries/sub-nationals; 2 → ≥1 region; 3 → **≥2 countries**; 4 → ≥1 country; 5 → ≥1 country **and** ≥1 sub-national. STAR does not enforce the ≥2-country rule for Multi-national — confirm before relying on it.

> ✅ **Scope `50` (to be determined) — CONFIRMED by the TEST spike, 2026-09-14 (T-01).** Accepted
> end-to-end with **no** companion regions/countries/sub-nationals, and with one specific,
> non-obvious required label: `scope_label` must be the literal string
> **`"This is yet to be determined"`** (not `"To be determined"` — a first attempt with that
> guess was schema-rejected: `"/geo_focus/scope_label must be equal to one of the allowed
> values. Allowed values: [\"Global\",\"Regional\",\"Multi-national\",\"National\",\"Sub-national\",
> \"This is yet to be determined\"]"`). With the corrected label, the row was fully `ACCEPTED`
> (`200`) and persisted as `"geographic_scope_id":50,"obj_geographic_scope":{"id":50,"name":
> "This is yet to be determined","description":""}`. See
> `spike/README.md` § OQ-5 and `spike/responses/01-capacity-sharing-scope50.json`
> (`requestId Root=1-6aa852fe-601bb8603e18414f743047c8`).

### 4.4 Institutions

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `contributing_center[].institution_id` / `.acronym` / `.name` | opt (≥1 if array sent) | **`agresso_contract.ubwClientDescription`** on the primary contract | ✅ **EXACT — G-7 closed by D-7.** There is no *contributing center* institution role, and none is needed: the centre is parameterised by the primary contract, exactly as `lead_center` is. Same map as §1.3 — `ExCIAT` → `46`, `ExBIO` → `49`. Reuse `AcronymExContractEnum` (`prms.opensearch.service.ts:665-676`) rather than re-deriving the comparison. |
| `contributing_partners[].institution_id` / `.acronym` / `.name` | opt (≥1 if array sent) | `result_institutions` role `PARTNERS (3)` → `clarisa_institutions` | ✅ **EXACT.** No split needed any more — with D-7 the centre comes from the contract, so every `PARTNERS` row is a partner. |
| — | — | `results.is_partner_not_applicable` | ⚫ When true, send **no** `contributing_partners` array at all (an empty array violates "at least one option"). |

### 4.5 `evidence[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `link` | ✅ (per item) | `result_evidences.evidence_url` | ✅ **Sent as-is — D-5.** No STAR-side restriction; evidence keeps working exactly as today. ⚠️ PRMS still enforces its 2026-08 rules (`http(s)` scheme required; SharePoint / OneDrive / Google Drive / Dropbox rejected) and does so **on its side**, as a failed row inside HTTP 207. |
| `description` | ❌ opt | `result_evidences.evidence_description` | ✅ **EXACT.** |
| — | — | `result_evidences.is_private` | ⚫ **Filter.** Confidential evidence has **no route through this API** — private rows must be excluded, never sent and hoped over. |
| — | — | `result_evidences.evidence_role_id` | ⚫ `PRINCIPAL_EVIDENCE (1)` is the only role today. |

> **Why this matters more than it looks — and more so after D-5.** A bad link is *not* a 4xx.
> It comes back as a **failed row inside `results[]` with HTTP 207**, while `rejected[]` (422)
> stays empty. A naive "2xx ⇒ success" check marks the result synced when PRMS refused it —
> and because flipping `is_synced_to_prms` 409-locks the alignment for everyone including
> SYSTEM_ADMIN (R-F3), that mistake is not self-correcting.
>
> With **no pre-flight validation (D-5)**, the per-row 207 interpretation is now the *only*
> mechanism preventing this. It stopped being one safeguard among several and became the
> load-bearing one — so it gets a test with a deliberately malformed link against the real TEST
> endpoint, never a mocked 207 (KZ-001, K-004).

### 4.6 `contributing_bilateral_projects[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `grant_title` | ✅ | `result_contracts.contract_id` → `agresso_contract` | ⚠️ **PREMISE FALSIFIED by the TEST spike, 2026-09-14 (T-01).** The assumption that "a title PRMS cannot resolve fails the row" is **wrong**. Two ACCEPTED (`200`) calls used a plausible-format guess (`"D-000000-ARI SPIKE Contract Title Test"`) and one used a deliberately-garbage string with no code prefix at all (`"THIS IS A DELIBERATELY INVALID ARI SPIKE GRANT TITLE THAT MATCHES NO CLARISA PROJECT"`) — **both succeeded identically**, and in every case the persisted result's `bilateral_projects` array came back **empty** (`"bilateral_projects":[]`), with no error, no `207` partial failure, nothing. See `spike/README.md` § OQ-1, `spike/responses/04-policy-change.json` (`requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`) and `spike/responses/05-capacity-sharing-failing-grant-title.json` (`requestId Root=1-6aa852e8-42962254355b61c50e0b74df`). **Consequence: `sync-engine` cannot detect a silently-dropped bilateral-project link from the ingest response alone** — a row that reads as fully synced may have lost its project association. The composition itself (`<agreement_id>-<description>`) remains **unproven** — the spike had no reachable CLARISA-verified project to test with a genuinely real title; see `spike/README.md` § OQ-1 for what would settle that half. |
| `is_lead` | ⚙️ opt | `result_contracts.is_primary` | ✅ **EXACT.** |
| **`usd_budget`** | ✅ **cond — Innovation Use only** | — | 🔴 **NOT BUILT — D-1.** No per-result, per-contract USD amount exists in the model, and none is being added this cycle. `agresso_contract.grant_amount_usd` / `center_amount_usd` are **project totals**, not this result's contribution — sending either would be a fabricated figure and is explicitly ruled out. Must be **> 0** when sent; `0` is rejected. |
| **`is_determined`** | ✅ **cond — Innovation Use only** | — | 🔴 **NOT BUILT — D-1.** ⚠️ Worth noting for the revisit: `is_determined: true` alone *does* satisfy PRMS, and it needs **no monetary figure** — only a per-project boolean meaning "amount not yet determined". That is a materially smaller change than capturing USD amounts, and it would make Innovation Use syncable. Raised as **OQ-H1'**. |

> **Consequence of D-1, stated plainly:** with neither field sent, **every Innovation Use
> payload is rejected by PRMS before it reaches Reporting.** This is not a degraded mode — it is
> a guaranteed failure for that type. v1 must therefore make the exclusion *visible* (button
> disabled with a reason) rather than offer a sync that always errors. See **OQ-H1'**.

---

## 5. `knowledge_product` — **in scope since 2026-09-16 (D-4 reversed)**

> **D-4c — scope of what was built (2026-09-16).** The product owner asked for **the JSON mapping
> only, not the flow**. The builder and the indicator mapping exist and are unit-tested;
> `KNOWLEDGE_PRODUCT` deliberately **stays** in `UNMAPPABLE_INDICATORS`, so the sync endpoint still
> refuses indicator 3. A test asserts that refusal holds even when every other gate entry would pass,
> so the boundary is verifiable rather than promised. Enabling KP later is one line — removing that
> set member — and that test turns red to say the boundary moved on purpose.
>
> The reason for building ahead: a pooled-funding development for KPs is expected and will use the
> same section, so the mapping is ready when it lands.

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `handle` | ✅ **the only required field** | `result_evidences.evidence_url` where `evidence_description = 'Handled'` (D-4b) | ✅ **EXACT.** PRMS resolves title, description and the rest from the repository, so the type block carries nothing else. Verified live — see the spike. |

**Five business rules PRMS enforces on KP, none of them documented by PRMS**, each returned as
HTTP 207 with a failed row (so the existing response interpreter handles them unchanged): already
reported (dedupe by handle) · handle must be from a supported repository · publication year must be
in the current reporting cycle · type-specific date rules resolved from the repository · and for
journal articles specifically, *Date Online* is preferred over *Date Issued*.

**That last one is a contract mismatch, not a bug.** STAR/TIP takes `dcterms.issued`; PRMS takes
`dcterms.available` when present. On the same CGSpace record that is 2026-02 versus 2024, so a KP
STAR legitimately shows as 2026 can be told *"only 2026 is eligible"*. No STAR-side logic reconciles
it — `publication_date` is not the field PRMS decides on. **Open question for the PRMS team.**

**Two blockers precede all of that** (measured on Dev, 9,161 KP results): **zero** are in
`result_status_id = 6` — KPs sit in status 20 *"Completed in TIP"* — and **zero** have a Pool Funding
Alignment row. KPs do not travel STAR's approval workflow because STAR does not own their lifecycle.
Until that changes, no KP reaches the point where PRMS could apply any rule above.

**Never obtained: an ACCEPTED.** Four handles were tried, each hit a different rule. The builder is
proven in its *shape*, not in its *result*.

---

## 6. `innovation_development`

> **Nesting rule (D-B, confirmed):** keep §4 common fields flat at the `data` root, but place every field in this section inside `data.innovation_development`. Evidence: `spike/responses/02-innovation-development-combined-readiness.json` (`requestId Root=1-6aa8532c-5bc036d21bb27f3109931c8a`) and `03-innovation-development-level-only.json` (`requestId Root=1-6aa852b9-3fe9d93047debe46758a3a33`).

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `innovation_typology.code` | ⚙️ ≥1 | `result_innovation_dev.innovation_type_id` → `clarisa_innovation_types.code` | ✅ **EXACT** — same CLARISA catalogue on both sides. |
| `innovation_typology.name` | ⚙️ ≥1 | `clarisa_innovation_types.name` | ✅ **EXACT.** Send both; `code` is preferred. |
| `innovation_developers` | ❌ opt | — | ⚫ **Omitted (P-1, §1.4).** No dedicated column. Composing it from `result_users` / `result_institutions` would re-label people STAR captured under a different question. Optional → send nothing. |
| `innovation_readiness_level.id` | ⚙️ ≥1 | `result_innovation_dev.innovation_readiness_id` → `clarisa_innovation_readiness_levels.id` | ✅ **EXACT.** |
| `innovation_readiness_level.name` | ⚙️ ≥1 | `clarisa_innovation_readiness_levels.name` | ✅ **EXACT.** |

> ⚠️ **Contradiction inside the supplied documentation — SCHEMA layer settled by the TEST spike,
> 2026-09-14 (T-01); PERSISTENCE layer still open.** The field table for
> `innovation_readiness_level` declares `id` and `name` only — but `inno_dev.json` sends
> `{"level": 0}`. STAR's `clarisa_innovation_readiness_levels` carries **both** `id` and
> `level`, so either shape is producible. The spike sent `id`+`name` alone, `level` alone
> (`spike/responses/03-innovation-development-level-only.json`, `requestId
> Root=1-6aa852b9-3fe9d93047debe46758a3a33`), and all three keys together
> (`spike/responses/02-innovation-development-combined-readiness.json`, `requestId
> Root=1-6aa8532c-5bc036d21bb27f3109931c8a`) — in every case `innovation_readiness_level` was
> never named in the validation error; the schema **rejects none of the three shapes**. What
> remains open is which key the downstream system actually reads and stores: every one of the
> three calls was blocked earlier by an unrelated `innovation_typology` catalog rejection
> (`"Unsupported innovation typology name \"Technology\""`), so none reached persistence. See
> `spike/README.md` § OQ-2 for the full account and what would settle the remaining question.

---

## 7. `capacity_sharing`

> **Nesting rule (D-B, confirmed):** keep §4 common fields flat at the `data` root, but place every field in this section inside `data.capacity_sharing`. Evidence: `spike/responses/01-capacity-sharing-scope50.json` (`requestId Root=1-6aa852fe-601bb8603e18414f743047c8`); discovery-log D-B records the initial flat form's `"(root) must have required property 'capacity_sharing'"` rejection (`requestId Root=1-6aa851eb-4ec93ae925475b33182f3ccf`).

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `number_people_trained.women` | ⚠️ ≥1 of 4 | `result_capacity_sharing.session_participants_female` | ✅ **EXACT.** |
| `number_people_trained.men` | | `session_participants_male` | ✅ **EXACT.** |
| `number_people_trained.non_binary` | | `session_participants_non_binary` | ✅ **EXACT.** |
| `number_people_trained.unknown` | | — | ⚫ **Omitted (P-1, §1.4).** No column, and the `session_participants_total` remainder is an arithmetic artefact rather than a reported figure. Optional → send nothing. |
| `length_training` | ✅ enum | `session_length_id` **and** `degree_id` | 🟢 **DERIVED — two STAR fields collapse into one PRMS enum; full analysis in §12.2.** PRMS accepts `"PhD" \| "Master" \| "Short-term" \| "Long-term"`. Proposed rule: `degree_id = PHD (1)` → `"PhD"`; `MSC (2)` → `"Master"`; otherwise invert `SessionLengthHomologation` (`SHORT_TERM` → `"Short-term"`, `LONG_TERM` → `"Long-term"`). ⚠️ `BSC (3)` has **no** PRMS slot — it must fall through to the session length, which means a BSc long-course and a non-degree long-course become indistinguishable in PRMS. Accept and record, or escalate to PRMS. |
| `delivery_method` | ✅ enum | `delivery_modality_id` | ✅ **EXACT — map already written.** Invert `DeliveryModalityHomologation`: `VIRTUAL` → `"Virtual / Online"`, `HYBRID` → `"Blended (in-person and virtual)"`, `IN_PERSON` → `"In person"`. |

> Both tables exist in the repo for the **inbound** direction
> (`domain/tools/open-search/prms/homologation/`), but neither inverts cleanly on its own:
> `SessionLengthHomologation` covers 2 of the 4 PRMS values, and `DegreeHomologation` is **not
> injective** (`Master` and `MSc` both → `MSC`). `DeliveryModalityHomologation` is the one
> genuinely bijective map in the whole set. See **§12** for the full review of all ten inbound
> artefacts and which are safe to invert.

---

## 8. `innovation_use`

> **Nesting rule — INFERRED BY ANALOGY, NOT CONFIRMED:** if this v1-gated type is later enabled, its type-specific fields are expected to nest inside `data.innovation_use`, while §4 common fields remain flat at the `data` root. T-01 made no `innovation_use` call; this is an inference from D-B's confirmed `capacity_sharing`, `innovation_development`, and `policy_change` shapes, not tested evidence.

### 8.1 `innovation_use_level`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `level` | ⚙️ ≥1 | `result_innovation_use.innovation_use_level_id` → `clarisa_innovation_use_levels.level` | ✅ **EXACT.** STAR carries the **same CLARISA catalogue** with both `id` (1–10) and `level` (0–9). PRMS says `level` is **preferred over the name** — send `level`. |
| `name` | ⚙️ ≥1 | `clarisa_innovation_use_levels.name` | ✅ **EXACT.** |

> ⚠️ The `id`/`level` off-by-one is a trap: `id = 2` is `level = 1`, and PRMS's example
> `{"level": 2}` is `id = 3` (*Partners*). Sending `innovation_use_level_id` into the `level`
> key would silently shift every result one stage. **This is precisely the kind of mapping a
> green test over a mocked catalogue would not catch** (KZ-001) — assert it against the seeded
> catalogue, not against a fixture.

### 8.2 `current_innovation_use_numbers`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `innov_use_to_be_determined` | ✅ | — | 🔴 **No source, and not inferable (P-1, §1.4).** No boolean column on `result_innovation_use`. Deriving it from "no actors and no quantifications" is the same move P-1 was established to reject. A second reason Innovation Use is gated out of v1 — even with D-1 resolved, **this field would still have no honest source.** Raise it at the PRMS PO meeting alongside `usd_budget`. |
| `actors[]` | ✅ unless TBD | `result_actors` **where `actor_role_id = ActorRolesEnum.INNOVATION_USE (2)`** | ✅ see §8.3. ⚠️ The role filter is mandatory — the table also holds Innovation *Development* actors (§12.5). Empty array counts as missing. |
| `organization[]` | ⚙️ opt | `result_institution_types` where `institution_type_role_id = INNOVATION_USE (2)` | ✅ see §8.4. |
| `measures[]` | ✅ **always** | `result_quantifications` where `quantification_role_id = INNOVATION_USE (3)` | ✅ see §8.5. |

> ⚠️ **Changed 2026-09 — the rule used to be an *or*.** Any one of actors / organization /
> measures satisfied it. Now `actors` and `measures` are demanded **separately**, and
> `organization` satisfies neither. `measures` is required **even when**
> `innov_use_to_be_determined` is `true`.

### 8.3 `actors[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `result_actors_id` | ❌ opt | `result_actors.result_actors_id` | ✅ **EXACT.** |
| `actor_type_id` | ⚙️ ≥1 | `result_actors.actor_type_id` → `clarisa_actor_types.code` | ✅ **EXACT.** ⚠️ PRMS documents exactly **5** actor types (1–5). Confirm STAR's seeded `clarisa_actor_types` holds the same 5 and no more — an id outside PRMS's table is **rejected** since 2026-08. |
| `actor_type_name` | ⚙️ ≥1 | `clarisa_actor_types.name` | ✅ **EXACT.** Prefer the id: since 2026-08 an unresolvable *name* is rejected, and **before** 2026-08 a name-only actor was **silently dropped while the request still returned 200**. |
| `other_actor_type` | cond (`actor_type_id = 5`) | `result_actors.actor_type_custom_name` | ✅ **EXACT.** |
| `sex_and_age_disaggregation` | ❌ opt | `result_actors.sex_age_disaggregation_not_apply` | ⚠️ **Pass-through by both contracts — but NOT yet proven, see §12.4.** STAR `TRUE` = aggregate mode (`actors_count` populated, the four `*_count` NULL); Normalizer `true` = *"disaggregation not available, report `how_many` only"*. Same meaning → send unchanged. **However** the existing inbound code negates the same-named field (`prms.opensearch.service.ts:564`) for a *different* PRMS surface. **Highest-risk row in this document.** Prove both modes in the spike, assert on the serialized JSON, and never copy `:564` as precedent. |
| `how_many` | cond (required when the flag is `true`) | `result_actors.actors_count` | ✅ **EXACT.** In disaggregated mode `actors_count` is NULL **by design** (it is not a stored total — DD-7) and PRMS does not require it. Omit; never compute a substitute. |
| `women` | ❌ opt | — | 🟢 **DERIVED:** `women_youth_count + women_not_youth_count`. |
| `women_youth` | ❌ opt | `result_actors.women_youth_count` | ✅ **EXACT.** Must be ≤ `women` — guaranteed by the derivation above. |
| `men` | ❌ opt | — | 🟢 **DERIVED:** `men_youth_count + men_not_youth_count`. |
| `men_youth` | ❌ opt | `result_actors.men_youth_count` | ✅ **EXACT.** ≤ `men` by construction. |
| `previousWomen` | ❌ opt | — | ⚫ No equivalent; historical field, omit. |

> 🚨 **Do not use `women_youth`, `women_not_youth`, `men_youth`, `men_not_youth`.** Those four
> are **booleans**, not counts — the entity comments them as *legacy* columns that **Innovation
> Development** still reads and writes. The Innovation Use counts are the `*_count` columns.
> A mapper that reaches for the shorter name gets `true`/`false` where PRMS expects a number.
>
> Since 2026-08 PRMS validates `women_youth ≤ women` and `men_youth ≤ men` and **rejects**
> violations; before that, `women: 10, women_youth: 999` was stored as sent.

### 8.4 `organization[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `institution_types_id` | — | `result_institution_types.institution_type_id` → `clarisa_institution_types` | ✅ **EXACT.** |
| `how_many` | — | `result_institution_types.organization_count` | ✅ **EXACT.** |
| — | — | `is_organization_known`, `institution_type_custom_name`, `sub_institution_type_id` | ⚫ STAR holds richer detail than PRMS accepts; drop it. |

### 8.5 `measures[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `unit_of_measure` | ✅ | `result_quantifications.unit` | ✅ **EXACT.** Must not be blank or whitespace. |
| `quantity` | ✅ | `result_quantifications.quantification_number` | ✅ **EXACT.** `0` **is valid** ("we measured, and the answer is none"); blank/absent is not. A whole number is now accepted — the old string workaround is obsolete. |

> At least **one** entry must carry **both** halves. Incomplete extras are tolerated but do not
> satisfy the rule — so filter to complete pairs and fail the result if none survives, rather
> than sending a partial array and reading the 207 as success.

---

## 9. `policy_change`

> **Nesting rule (D-B, confirmed):** keep §4 common fields flat at the `data` root, but place every field in this section inside `data.policy_change`. Evidence: `spike/responses/04-policy-change.json` (`requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`).

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `policy_type.id` / `.name` | ⚙️ ≥1 | `result_policy_change.policy_type_id` → `policy_types` | 🟡 **HOMOLOGABLE — id alignment unproven.** `policy-type.homologation.ts` exists for the inbound direction and is invertible. Whether STAR's seeded `policy_types.id` equals CLARISA's is **not** established by reading code. Prove it before sending an id. |
| **`policy_type.status_amount.id` / `.name`** | **cond — required iff `policy_type.id = 1`** | — | 🔴 **NOT BUILT — D-2.** |
| **`policy_type.amount`** | **cond — required iff `policy_type.id = 1`** | — | 🔴 **NOT BUILT — D-2.** `result_policy_change` has no amount column and none is being added this cycle. |
| `policy_stage.id` / `.name` | ⚙️ ≥1 | `result_policy_change.policy_stage_id` → `policy_stages` | ✅ **EXACT** (`policy-stage.homologation.ts` invertible; same id caveat as above). |
| `implementing_organization[].institutions_id` / `.institutions_acronym` / `.institutions_name` | ✅ **min 1** | `result_institutions` where `institution_role_id = POLICY_CHANGE (4)` → `clarisa_institutions` | ✅ **EXACT.** Each item needs ≥1 of the three, and **no other properties are allowed**. |
| — | — | `result_policy_change.evidence_stage` | ⚫ No PRMS equivalent; drop. |

> **D-2's real shape — verified, not assumed.** The gap bites only when a STAR policy result
> maps to PRMS `policy_type.id = 1`. That case **is reachable**: STAR seeds *"Program, Budget, or
> Investment"* (migration `1730993015550-insertLinkResultRole`) and the existing
> `PolicyTypeHomologation` maps it to exactly that PRMS id. So one of STAR's three policy types
> becomes unsyncable; *Legal instrument* and *Policy or strategy* sync cleanly.
>
> v1 should therefore refuse that subtype at the endpoint with a stated reason, the same way it
> refuses KP and OICR — not attempt it and surface a PRMS row failure.
>
> ⚠️ Note the asymmetry: if `policy_type.id ≠ 1`, the two fields are **not allowed** — sending
> them anyway is a rejection. The branch cuts both ways, so the builder must omit them
> deliberately, not merely leave them undefined by accident.

---

## 10. Response handling (not fields, but the contract that decides "synced")

| Signal | Meaning | Consequence for STAR |
|---|---|---|
| HTTP `207` + `results[]` rows | Per-row outcome. **A row can fail here while the HTTP status is a success.** | `is_synced_to_prms` may be flipped **only** for a row that actually succeeded. Reading the HTTP status alone is the defect this table exists to prevent. |
| HTTP `422` + `rejected[]` | Schema rejection before processing. | Log verbatim; `external_reference` is present on rejected rows too, which is how the failing row is shown to the user. |
| `401` | No key, or CLARISA says the key is invalid. | **Do not retry** — fix the key. |
| `503` | CLARISA unreachable to validate the key. | **Retryable**; the key may be fine. |
| `requestId` | AWS trace id, present in every body. | Persist on every attempt — it is what PRMS support asks for. |
| `prms_result_code` | — | ✅ **LOCATED by the TEST spike, 2026-09-14 (T-01).** Returns **synchronously**, in the same ingest response, at `results[].result.result_code` (echoed again at `results[].externalApiResponse.response.result_code`) — not only via the decision webhook. Confirmed on 3 separate ACCEPTED calls with distinct, incrementing values (`9197`, `9198`, `9199`); see `spike/README.md` § OQ-6 and `spike/responses/04-policy-change.json` (`requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`): `"result":{...,"result_id":11665,"result_code":9197}`. Family OQ-F7 is **closed**. ⚠️ Do not confuse this with the Normalizer's own `resultId` field (`prms.result-management.api:<type>:dataset.ingest.requested:auto-<hash>`), which is a deterministic idempotency key present even on failed calls and is **not** the PRMS-assigned code. |

### 10.1 Reading the API key — two behaviours to design around

`AppConfigService.getEnv` is a direct `findOne` on `app_config` filtered by
`key = … AND is_active = true`, returning `{ json_value, simple_value }`.

| Behaviour | Consequence for `sync-engine` |
|---|---|
| **Throws `NotFoundException`** when the row is missing **or `is_active = false`** | ✅ Good: a deactivated key fails loudly instead of sending an empty header and collecting a PRMS `401`. Let it propagate as a clear STAR-side error; do not swallow it into a generic sync failure. |
| **No caching** — one query per call | ✅ A rotated key takes effect immediately. The cost is one indexed read per sync, negligible for a user-triggered action. **Not** subject to the 5-minute TTL trap of K-016 — that applies to `MappingPhaseResolver` / `ClarisaProjectsService`, not here. |
| ⚠️ **`PdfViewerService`'s pattern is the one to avoid** | It calls `setApiKey()` **in its constructor**, so it reads once at boot and a rotated key needs a process restart. `sync-engine` must read **per request**, not at construction — otherwise key rotation silently keeps working with the old value until the next deploy. |

> **Environment split comes free here.** Because the value lives in each environment's own
> database, TEST and PROD are separated by the database itself — no `ARI_*` variable is needed for
> the key. **The Normalizer HOST still needs one var per environment** (K-005 / R-F2); only the
> credential is DB-resident.

### Authentication & webhooks (closes family OQ-F1)

| Item | Answer (2026-09 contract) |
|---|---|
| Transport | **Still REST `POST /ingest`.** The anticipated "hook-based model" did **not** replace ingest; hooks appear instead as **outbound decision webhooks** *from* PRMS. The family's hold reason is resolved. |
| Auth | **`x-api-key` header, a CLARISA API key — CLOSED 2026-09-14.** No `Authorization: Bearer` alternative, no anonymous access. **Source: the `app_config` DB row `ARI_CLARISA_API_KEY`** (`AppConfigKey`, seeded by migration `1781879906673`), read through **`AppConfigService.getEnv(AppConfigKey.ARI_CLARISA_API_KEY)` → `.simple_value`** — the same manager and the same key `PdfViewerService` already uses. The value was **verified present in both TEST and PROD** by the product owner on 2026-09-14. See §10.1 for the two behaviours this manager imposes. |
| Key scope | **One key per tool per environment — CONFIRMED for TEST by the TEST spike, 2026-09-14 (T-01).** The key *is* the platform identity: all 3 ACCEPTED calls resolved to `"external_platform_id": 34, "external_platform_code": "STAR"` (e.g. `spike/responses/04-policy-change.json`, `requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`), and none of the 12 calls this session drew a `401`. **This confirms the `.env` TEST value works and identifies STAR** (A-1 limit per `spike/README.md:4-17`: the spike shows the `.env` value is valid for the Normalizer, not that it equals the `app_config` row — re-confirm once DB access is restored). **PRODUCTION is unverified and untested, not known missing:** the product owner verified a value is present in both TEST and PROD on 2026-09-14, but T-01 correctly made no PROD call. |
| Environments | TEST `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com` · PROD `https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com`. One `ARI_*` var per environment (K-005: hosts are branch selectors, never collapsed). |
| Decision webhooks | Self-service `POST /webhook` with the same key. Registration carries **no platform field** — the key identifies us. **Decisions taken with no destination registered are not replayed**, so registration must precede the first result going under review. Out of scope for `sync-engine` v1; it is the natural fifth family member. |

---

## 11. Open questions after the 2026-09-14 decisions

Under **P-1**, the questions that were *"how do we fill this?"* collapse into *"we do not, and the
type waits."* What survives is four spike-derived items — two closed by the TEST spike (T-01,
2026-09-14), two still open — and one meeting.

| ID | Question | Blocks | Closed by |
|---|---|---|---|
| ~~OQ-H1'~~ | **CLOSED — option (a).** Innovation Use is **gated out of v1** with a stated reason. Substituting `is_determined: true` was rejected under P-1. | — | Decided |
| ~~OQ-H2'~~ | **CLOSED — option (a).** PRMS policy type `1` (*Program, Budget, or Investment*) is **gated out** the same way; the other two subtypes sync. | — | Decided |
| ~~OQ-H7~~ | **CLOSED — no honest source.** `innov_use_to_be_determined` cannot be inferred (P-1, §1.4). Folded into the PRMS PO agenda below. | — | Decided |
| ~~OQ-H9~~ | **CLOSED — TEST spike, 2026-09-14 (T-01).** `geo_focus.scope_code = 50` is accepted end-to-end with the exact required label `"This is yet to be determined"`, with no companion regions/countries/sub-nationals required or rejected. See §4.3, `spike/README.md` § OQ-5, `spike/responses/01-capacity-sharing-scope50.json` (`requestId Root=1-6aa852fe-601bb8603e18414f743047c8`). | — | Closed |
| ~~OQ-F7~~ | **CLOSED — TEST spike, 2026-09-14 (T-01).** The PRMS-assigned result code returns synchronously in the same ingest response, at `results[].result.result_code`. See §10, `spike/README.md` § OQ-6, `spike/responses/04-policy-change.json` (`requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`). | — | Closed |
| **OQ-H5** | `grant_title` composition — **premise falsified by the TEST spike, 2026-09-14 (T-01):** an unresolvable title does **not** fail the row — both a plausible-format guess and a deliberately-garbage title returned `200`/`success: true` with `bilateral_projects: []`. What remains open is the composition itself: what exactly CLARISA `/api/projects` expects, and whether a genuinely CLARISA-verified title populates `bilateral_projects`. See §4.6, `spike/README.md` § OQ-1, `spike/responses/04-policy-change.json` / `05-capacity-sharing-failing-grant-title.json`. | Every type | Spike (partial) |
| **OQ-H6** | `innovation_readiness_level` — **partially answered by the TEST spike, 2026-09-14 (T-01): schema layer only, persistence layer still open.** The schema tolerates `id`/`name`, `level`, or all three together — none rejected. No call reached persistence (each was blocked earlier by an unrelated `innovation_typology` catalog rejection), so which key is actually read/stored is still unknown. See §6, `spike/README.md` § OQ-2. | Innovation Development | Spike (partial) |

> The spike ran on 2026-09-14 (T-01) — the API key was already in `app_config` in TEST and PROD
> (§10.1). Two items closed outright (OQ-H9, OQ-F7); two remain open at the persistence/composition
> layer (OQ-H5, OQ-H6) after the schema/premise layer was settled — see `spike/README.md` for what
> would close each.

### 11.1 Agenda for the PRMS PO meeting

The items below cannot be settled by reading the contract or by a spike; they need PRMS's product
side. They are what stands between v1 and full type coverage.

| # | Item | Why it needs PRMS |
|---|---|---|
| **1** | **Innovation Use investment** — `usd_budget` / `is_determined` is mandatory per bilateral project since 2026-09. STAR captures no per-result contribution amount and will not assert one (P-1). | Either PRMS relaxes the requirement for producers that do not hold the figure, or the Alliance decides to start capturing it — a reporting-process change, not an engineering one. |
| **2** | **`innov_use_to_be_determined`** — required, and STAR has no field behind it. ⚠️ **Even if item 1 is resolved, this still blocks the type.** Worth raising together: Innovation Use has **two** missing declarations, not one. | Same shape: whose declaration is it, and what does a producer send when nobody has made it? |
| **3** | **Policy type 1** — `status_amount` + `amount` mandatory when the policy is *Program, Budget, or Investment*. STAR holds neither. | Same decision as item 1, for a narrower slice. |
| **4** | **`keep_editing`** — should STAR results land in PRMS as *Editing* (the reporting user completes them there) or *Pending review*? | Changes who finishes the result and which queue it enters. A workflow decision, theirs to make with us. |
| **5** | **Doc contradictions** — `innovation_readiness_level` `id`/`name` vs `{"level": 0}`; `scope_code = 50` absent from the validation table; CGIAR System Organization listed as `11605 / SO` in `lead_center` but `221 / SMO` in `contributing_center`. | The written contract disagrees with its own examples; a spike can reveal current behaviour but not intent. |
| **6** | **Title / description length** — the contract says 30 / 150 words; a PRMS developer confirmed verbally that longer values pass (D-6). | A verbal exception to a written contract needs an owner and a date, or it silently expires (K-013). |

---

## 12. Inverting the inbound homologations

STAR already homologates PRMS values when **importing** (`domain/tools/open-search/prms/`). The
obvious move is to invert them for sending. **Six of the ten are reusable; four are not**, and one
of the four is a trap that would silently corrupt every actor row.

| Artefact | Inbound mapping | Invertible? | Outbound verdict |
|---|---|---|---|
| `delivery-modality.homologation.ts` | 3 PRMS labels ↔ 3 STAR values | ✅ **Bijective** | **Reuse by inversion.** The only clean one. |
| `AcronymExContractEnum` *(inline)* | `'ABC RH' → EXCIAT`, `'ABC' → EXBIO` | ✅ Bijective | **Reuse** — already the basis of D-7 (§1.3). Keep its `.toUpperCase().trim()`. |
| `policy-type.homologation.ts` | PRMS ids `1,2,3` ↔ STAR enum | ✅ Bijective | **Reuse, with a caveat** — see §12.1. |
| `policy-stage.homologation.ts` | PRMS ids `6,7,8` ↔ STAR `1,2,3` | ✅ Bijective | **Reuse, same caveat** — §12.1. |
| `session-length.homologation.ts` | 2 PRMS terms ↔ 2 STAR values | ⚠️ **Partial** | PRMS's outbound enum has **4** values, this map covers 2. Must combine with degree — §12.2. |
| `degree.homologation.ts` | 5 keys → 4 STAR values | ❌ **Not injective** | `Master` *and* `MSc` both → `MSC`, so the inverse is ambiguous — §12.2. |
| `indicator.homologation.ts` | PRMS `ResultTypeEnum` (numeric `1–11`) → STAR `IndicatorsEnum` | ❌ **Wrong vocabulary** | Not an inversion at all — §12.3. |
| `ip-rights-application.homologation.ts` | `Yes` / `No` / `Not sure` ↔ STAR IP option | — | ⚫ **No outbound counterpart.** The Normalizer's `innovation_development` block has only `innovation_typology`, `innovation_developers`, `innovation_readiness_level` — **no IP rights field.** Not needed. |
| `prms-innovation-question.homologation.ts` | question ids `101` / `102` | — | ⚫ **No outbound counterpart.** Same reason. |
| `ResultPrmsStatusMapper` *(inline)* | PRMS status → STAR `*_IN_PRMS` statuses | ❌ | ⚫ **Not sent.** PRMS decides the status; STAR does not propose one. Becomes relevant only for the future **decision webhook**, which is the inbound direction again. |

> The catalogue lookups (`innovation_typology`, `innovation_readiness_level`, `actor_type`,
> `institution_type`, countries, regions, sub-nationals) are **not** homologations — inbound they
> resolve CLARISA by name or code through `Clarisa*Service`. Outbound they are direct reads of the
> same CLARISA ids STAR already stores. Nothing to invert.

### 12.1 Policy ids — the provenance is not the same

`PolicyTypeHomologation` and `PolicyStageHomologation` document their PRMS side as coming from
**`policy_change_summary`** — PRMS's *internal* ids, reached through OpenSearch. The Normalizer,
by contrast, points at **CLARISA** (`/api/policy-types`, `/api/policy-stages`) and its example
sends `policy_stage: { "name": "Stage 1" }`.

**PRMS-internal ids and CLARISA ids are not established to be the same numbers.** Inverting the map
and sending the id is therefore a guess wearing the costume of an existing, tested mapping — the
most convincing kind of wrong.

> **Rule for v1:** send the **`name`**, which both catalogues agree on, or prove the id in the
> spike. The contract accepts either (`id` *or* `name`). ⚠️ Note the labels are not verbatim
> identical: the inbound file documents PRMS type `1` as *"Program, budget or investment"*, while
> the Normalizer's field table calls it *"Budget or investment"* and `policy.json` sends
> *"Program, budget or investment"*. Send the form the examples use, and confirm at the PO meeting
> (agenda item 5).

### 12.2 `length_training` — two STAR fields, one PRMS enum, and a lossy inverse

The Normalizer accepts exactly `"PhD" | "Master" | "Short-term" | "Long-term"`. STAR splits that
across `session_length_id` and `degree_id`, and the inbound pair reflects it: `SessionLength`
carries the *term*, `Degree` carries the *name*, and the inbound comment notes degree **only
applies when the term is Long-term**.

Inverting hits two problems:

| Problem | Detail |
|---|---|
| **`degree` is not injective** | `Master` **and** `MSc` both map to `DegreesEnum.MSC`. Inverting `MSC` is ambiguous — resolve it by the *target* vocabulary: the Normalizer's enum contains `"Master"`, not `"MSc"`, so `MSC → "Master"`. The ambiguity disappears only because the destination is narrower than the source. |
| **Two STAR degrees have no PRMS slot** | `BSc` and `Other` do not exist in `length_training`. They must fall through to the session term, which means **a BSc long course and a non-degree long course become indistinguishable in PRMS.** Record it; do not invent a value (P-1). |

**Proposed outbound rule:** `degree_id = PHD → "PhD"` · `MSC → "Master"` · otherwise invert
`SessionLengthHomologation` (`SHORT_TERM → "Short-term"`, `LONG_TERM → "Long-term"`).

### 12.3 `indicator.homologation.ts` is not invertible — different vocabularies

This is the one most likely to be reached for and the one that fits worst.

| | Inbound | Outbound (Normalizer) |
|---|---|---|
| PRMS side | `ResultTypeEnum` — **numbers** `1–11` (`POLICY_CHANGE = 1`, `KNOWLEDGE_PRODUCT = 6`, …) | `type` — **strings** (`"policy_change"`, `"knowledge_product"`, …) |
| Source | PRMS OpenSearch `indicator_category.code` | The ingest contract |

They are two different vocabularies for the same concept, and the numbers do **not** correspond to
anything in the Normalizer. The outbound map in §3 is a **new artefact**, not an inversion — write
it fresh and keep it beside the inbound one so the difference stays visible.

> It also carries six `null` entries (`CAPACITY_CHANGE`, `OTHER_OUTCOME`, `OTHER_OUTPUT`,
> `IMPACT_CONTRIBUTION`, `INNOVATION_USE_IPSR`, `COMPLIMENTARY_INNOVATION`) — PRMS types STAR
> cannot represent. Inverting a partial function yields a partial function; §3's map is total over
> STAR's six indicators instead, which is the property the outbound side actually needs.

### 12.4 ⚠️ `sex_and_age_disaggregation` — the inbound code and the Normalizer doc disagree

**This is the finding that justifies the whole review.**

`prms.opensearch.service.ts:564` **negates** the field:

```ts
dto.sex_age_disaggregation_not_apply = !actor.sex_and_age_disaggregation;
```

But reading the two contracts side by side, the outbound direction is a **pass-through**:

| | `true` means |
|---|---|
| **Normalizer doc** (`innovation_use.actors[]`) | *"⚠️ Reads as 'does not apply'"* — disaggregation **not** available, report `how_many` only |
| **STAR entity** (`result_actor.entity.ts` mode table) | Aggregate mode — `actors_count` populated, the four `*_count` NULL |

Same meaning. So `sex_age_disaggregation_not_apply` → `sex_and_age_disaggregation` **unchanged**,
and the inbound line would be its opposite.

**Both can still be correct**, and that is the point: they are *different PRMS surfaces*. The
inbound line reads `innovation_development_summary…demand.actors[]` from PRMS **OpenSearch** and
writes STAR actors with `ActorRolesEnum.INNOVATION_DEV`; the outbound writes the **Normalizer's**
`innovation_use.actors[]` from actors with `ActorRolesEnum.INNOVATION_USE`. Two APIs, two actor
roles, one field name — and the Normalizer doc flags its own semantics with a ⚠️, which is what a
contract does when a name reads backwards.

> **Rules, non-negotiable:**
> 1. **Do not cite `:564` as precedent.** It governs a different surface. Copying it inverts every
>    actor row in the outbound payload — and because both values are valid booleans, PRMS accepts
>    the payload and silently records the wrong disaggregation mode.
> 2. **Prove the outbound direction in the spike**, with one actor in each mode, read back.
> 3. Assert it on the **serialized JSON**, never on the DTO (KZ-001, KZ-017).
> 4. The mode also selects which numbers are populated at all (§8.3) — a flipped flag sends
>    `how_many` where PRMS expects `women`/`men`, or the reverse.

### 12.5 Selecting the right rows — the Innovation Use role filter

Three STAR tables serve both Innovation Development and Innovation Use, discriminated by a role
column. The outbound builders must filter, or they mix the two indicators' data:

| Table | Filter for Innovation Use |
|---|---|
| `result_actors` | `actor_role_id = ActorRolesEnum.INNOVATION_USE (2)` |
| `result_institution_types` | `institution_type_role_id = InstitutionTypeRoleEnum.INNOVATION_USE (2)` |
| `result_quantifications` | `quantification_role_id = QuantificationRolesEnum.INNOVATION_USE (3)` |

> ⚠️ The three enums use **different numbers for the same concept** (`2`, `2`, `3`). A copy-pasted
> literal is wrong in exactly one of the three. Use the enum, never the number.

---

## 12. Provenance

Every STAR claim above is anchored in a file read on 2026-09-14:

| Claim area | File |
|---|---|
| Result core, sync flags | `domain/entities/results/entities/result.entity.ts` |
| Audit columns | `domain/shared/.../auditable.entity.ts` |
| Actors, mode table, `*_count` vs legacy booleans | `domain/entities/result-actors/entities/result-actor.entity.ts` |
| Quantifications + role enum | `domain/entities/result-quantifications/` · `QuantificationRolesEnum` |
| Institution types + role enum | `domain/entities/result-institution-types/` · `InstitutionTypeRoleEnum` |
| Institution roles | `domain/entities/institution-roles/enums/institution-roles.enum.ts` |
| User roles | `domain/entities/user-roles/enum/user-roles.enum.ts` |
| Evidence + roles | `domain/entities/result-evidences/` · `EvidenceRoleEnum` |
| Contracts | `domain/entities/result-contracts/` · `domain/entities/agresso-contract/` |
| Pool-funding alignment (SP, ToC) | `domain/entities/bilateral/entities/*.entity.ts` |
| CLARISA catalogues | `domain/tools/clarisa/entities/{actor-types,countries,regions,sub-nationals,innovation-types,innovation-readiness-levels,innovation-use-levels,geo-scope}` |
| Existing inbound homologations | `domain/tools/open-search/prms/homologation/*.ts` |
| KP DOI → evidence URL | `domain/tools/tip-integration/tip-integration.service.ts:347` |
| Indicator + status enums | `domain/entities/indicators/enum/indicators.enum.ts` · `result-status/enum/result-status.enum.ts` |
| Sync button rule | `client/.../result-sidebar/result-sidebar.component.ts:98-112` |
