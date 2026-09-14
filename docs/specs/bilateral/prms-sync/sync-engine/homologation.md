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
`/akili-specify` any more; what remains open is the TEST-env spike (§11).

### 1.1 Decisions applied (2026-09-14, product owner)

| # | Gap | Decision | Consequence — recorded, not hidden |
|---|---|---|---|
| **D-1** | **G-1** `usd_budget` / `is_determined` | **Not built for now.** STAR does not hold a per-result, per-contract USD contribution and will not add one in this cycle. | 🔴 **Innovation Use cannot pass PRMS validation.** The pair is *mandatory per `contributing_bilateral_projects[]` entry* and breaking since 2026-09: an omitted pair is rejected **before** the result reaches Reporting. See §11 **OQ-H1'** — v1 must either gate the type out or let every attempt fail. |
| **D-2** | **G-2** `status_amount` + `amount` | **Not built for now.** | ⚠️ **Reachable, not hypothetical.** STAR seeds *"Program, Budget, or Investment"* (`1730993015550`) and `PolicyTypeHomologation` maps it to PRMS `policy_type.id = 1`, which makes both fields mandatory. Policy results of that one type will be rejected; the other two types sync cleanly. |
| **D-3** | **G-3** `lead_contact_person` | **Closed — no gap.** Main contact is **mandatory on every STAR result**, so `result_users` + `MAIN_CONTACT (1)` is always populated. | ✅ No fallback chain needed. Row downgraded to **EXACT** in §4. |
| **D-4** | **G-4** `knowledge_product.handle` | **Knowledge Product is out of scope.** KPs are not STAR's to create — STAR stores imported ones but cannot author them, so it has nothing to push. | ⚫ Supported type set drops **5 → 4**. Supersedes family OQ-F2. `handle` never has to be resolved. |
| **D-5** | **G-5** `evidence[].link` | **No STAR-side restriction.** Links keep working exactly as they do today. | ⚠️ The 2026-08 PRMS rules (scheme required, file-storage hosts rejected) still apply **on their side**. With no pre-flight, the **207 per-row interpretation (R-E1) becomes the only thing standing between a refused link and a wrongly-synced result.** That single mechanism is now load-bearing. |
| **D-6** | **G-6** `title` / `description` length | **Not blocking — confirmed with the PRMS developer.** Long titles and descriptions pass. | ⚫ No guard built. ⚠️ This is a **verbal confirmation that contradicts the written contract** (which states max 30 / 150 words). Record who and when; re-check if ingest starts rejecting on length (K-013). |
| **D-7** | **G-7** centers | **Resolved via the primary contract, one institution each.** `agresso_contract.ubwClientDescription` holds `ExCIAT` or `ExBIO`: **`ExCIAT` → `46`**, **`ExBIO` → `49`** (see §1.3). | ✅ Mechanism exists and is already exercised inbound. **Confirms family OQ-F3's original 46/49 split** and supplies the field that drives it. *(Revised 2026-09-14 within the same session: an earlier reading of this decision collapsed both values onto `49` because the CIAT variant was thought inactive. The centres are active; the split stands.)* |

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
| `innovation_development` | 2 | ✅ **Syncs clean.** Only OQ-H6 (`readiness_level` shape) pending, and the spike settles it. |
| `policy_change` | 4 | ⚠️ **Syncs except one type.** *Legal instrument* and *Policy or strategy* pass; *Program, Budget, or Investment* is rejected (D-2). |
| `innovation_use` | 6 | 🔴 **Cannot pass validation** until D-1 is revisited. |
| `knowledge_product` | 3 | ⚫ **Out of scope** (D-4). |
| — | 5 (OICR) | ⚫ Excluded; PRMS has no OICR type. |

> **The honest headline:** with D-1 and D-2 as they stand, v1 delivers **two types that sync
> cleanly, one that syncs for two of its three subtypes, and one that always fails.** That is a
> perfectly reasonable first increment — but the Innovation Use row should be a *deliberate,
> visible* exclusion, not a button that reliably errors. See **OQ-H1'**.

---

## 2. Envelope

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `tenant` | ✅ | — | ⚫ Constant `"prms.result-management.api"` |
| `op` | ✅ | — | ⚫ Constant `"dataset.ingest.requested"` |
| `results[]` | ✅ | one entry per sync trigger (single-result ingest) | ⚫ |
| `results[].type` | ✅ | `results.indicator_id` → `IndicatorsEnum` | 🟢 **DERIVED** — new homologation map, see §3 |
| `results[].data` | ✅ | the Result aggregate | ⚫ |

### 3. Result type mapping (`IndicatorsEnum` → PRMS `type`)

| STAR `indicator_id` | STAR name | PRMS `type` | Verdict |
|---|---|---|---|
| 1 | Capacity Sharing for Development | `capacity_sharing` | ✅ |
| 2 | Innovation Development | `innovation_development` | ✅ |
| 3 | Knowledge Product | — | ⚫ **Out of scope (D-4).** STAR stores imported KPs but cannot author them, so it has nothing to push. |
| 4 | Policy Change | `policy_change` | ✅ |
| 5 | OICR | — | ⚫ **Excluded from sync** (family OQ-F2, closed 2026-08-21). PRMS has no OICR type. |
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

> A "No" row (`aligns_with_toc: false`) carries `null` in every ToC column. `toc_mapping` must
> then be built from `science_program_id` alone, or omitted in favour of `contributing_programs`.

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

> ⚠️ **Scope `50` (to be determined)** exists in STAR and is listed in PRMS's `scope_code`
> description, but appears in **no** conditional-validation row. Behaviour unknown — spike it.

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
| `grant_title` | ✅ | `result_contracts.contract_id` → `agresso_contract` | 🟡 **HOMOLOGABLE — composition unproven.** `projectDescription` is STAR's "Project Name" (`OrderFieldsEnum.PROJECT_NAME → ac.projectDescription`); `agreement_id` is the code. PRMS's example — `"D-200358-Enhancing Food Security…"` — reads as `<agreement_id>-<description>`, and PRMS matches against **CLARISA `/api/projects`**, not against AGRESSO. **Do not assert a composition; prove it in the spike.** A title PRMS cannot resolve fails the row. |
| `is_lead` | ⚙️ opt | `result_contracts.is_primary` | ✅ **EXACT.** |
| **`usd_budget`** | ✅ **cond — Innovation Use only** | — | 🔴 **NOT BUILT — D-1.** No per-result, per-contract USD amount exists in the model, and none is being added this cycle. `agresso_contract.grant_amount_usd` / `center_amount_usd` are **project totals**, not this result's contribution — sending either would be a fabricated figure and is explicitly ruled out. Must be **> 0** when sent; `0` is rejected. |
| **`is_determined`** | ✅ **cond — Innovation Use only** | — | 🔴 **NOT BUILT — D-1.** ⚠️ Worth noting for the revisit: `is_determined: true` alone *does* satisfy PRMS, and it needs **no monetary figure** — only a per-project boolean meaning "amount not yet determined". That is a materially smaller change than capturing USD amounts, and it would make Innovation Use syncable. Raised as **OQ-H1'**. |

> **Consequence of D-1, stated plainly:** with neither field sent, **every Innovation Use
> payload is rejected by PRMS before it reaches Reporting.** This is not a degraded mode — it is
> a guaranteed failure for that type. v1 must therefore make the exclusion *visible* (button
> disabled with a reason) rather than offer a sync that always errors. See **OQ-H1'**.

---

## 5. `knowledge_product` — **out of scope (D-4)**

STAR does not author Knowledge Products. It stores KPs imported from TIP/CGSpace, but a KP is
never created in STAR, so STAR has nothing to push to PRMS. The type is removed from the
supported set; `results.indicator_id = 3` must be **refused at the sync endpoint** with a stated
reason.

This closes **G-4** without resolving it: `result_knowledge_product` still has no `handle`/`doi`
column, and the TIP importer still writes the DOI into `result_evidences.evidence_url`
(`tip-integration.service.ts:347`). If KP sync is ever revived, that ambiguity is the first
thing to settle.

---

## 6. `innovation_development`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `innovation_typology.code` | ⚙️ ≥1 | `result_innovation_dev.innovation_type_id` → `clarisa_innovation_types.code` | ✅ **EXACT** — same CLARISA catalogue on both sides. |
| `innovation_typology.name` | ⚙️ ≥1 | `clarisa_innovation_types.name` | ✅ **EXACT.** Send both; `code` is preferred. |
| `innovation_developers` | ❌ opt | — | 🟡 **HOMOLOGABLE.** No dedicated column. Composable as a `; `-joined list from `result_users` and/or `result_institutions`. Optional → omitting is defensible for v1. |
| `innovation_readiness_level.id` | ⚙️ ≥1 | `result_innovation_dev.innovation_readiness_id` → `clarisa_innovation_readiness_levels.id` | ✅ **EXACT.** |
| `innovation_readiness_level.name` | ⚙️ ≥1 | `clarisa_innovation_readiness_levels.name` | ✅ **EXACT.** |

> ⚠️ **Contradiction inside the supplied documentation.** The field table for
> `innovation_readiness_level` declares `id` and `name` only — but `inno_dev.json` sends
> `{"level": 0}`. STAR's `clarisa_innovation_readiness_levels` carries **both** `id` and
> `level`, so either shape is producible; what is not knowable from the docs is which one the
> schema accepts. **Spike it** (this is the successor to family OQ-F5).

---

## 7. `capacity_sharing`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `number_people_trained.women` | ⚠️ ≥1 of 4 | `result_capacity_sharing.session_participants_female` | ✅ **EXACT.** |
| `number_people_trained.men` | | `session_participants_male` | ✅ **EXACT.** |
| `number_people_trained.non_binary` | | `session_participants_non_binary` | ✅ **EXACT.** |
| `number_people_trained.unknown` | | — | 🟡 **HOMOLOGABLE.** No column. `session_participants_total` may exceed the sum of the three; that remainder is the honest candidate for `unknown`. Optional → omit if the remainder is ≤ 0. |
| `length_training` | ✅ enum | `session_length_id` **and** `degree_id` | 🟢 **DERIVED — two STAR fields collapse into one PRMS enum.** PRMS accepts `"PhD" \| "Master" \| "Short-term" \| "Long-term"`. Proposed rule: `degree_id = PHD (1)` → `"PhD"`; `MSC (2)` → `"Master"`; otherwise invert `SessionLengthHomologation` (`SHORT_TERM` → `"Short-term"`, `LONG_TERM` → `"Long-term"`). ⚠️ `BSC (3)` has **no** PRMS slot — it must fall through to the session length, which means a BSc long-course and a non-degree long-course become indistinguishable in PRMS. Accept and record, or escalate to PRMS. |
| `delivery_method` | ✅ enum | `delivery_modality_id` | ✅ **EXACT — map already written.** Invert `DeliveryModalityHomologation`: `VIRTUAL` → `"Virtual / Online"`, `HYBRID` → `"Blended (in-person and virtual)"`, `IN_PERSON` → `"In person"`. |

> Both homologation tables already exist in the repo for the **inbound** direction
> (`domain/tools/open-search/prms/homologation/`). They are reusable by inversion — but an
> inverted map is only total if the forward map was injective. `SessionLengthHomologation`
> has 2 keys for 4 PRMS values, which is exactly why `degree_id` has to join the rule above.

---

## 8. `innovation_use`

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
| `innov_use_to_be_determined` | ✅ | — | 🟡 **HOMOLOGABLE.** No boolean column on `result_innovation_use`. Derivable as *"no actor rows and no quantification rows"* — but a derived flag that drives a **required/not-required** branch on the PRMS side deserves an explicit product answer, not an inference. Confirm at specify. |
| `actors[]` | ✅ unless TBD | `result_actors` | ✅ see §8.3. Empty array counts as missing. |
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
| `sex_and_age_disaggregation` | ❌ opt | `result_actors.sex_age_disaggregation_not_apply` | ✅ **EXACT — despite the names reading opposite.** Verified against the entity's own documented mode table: STAR `TRUE` = aggregate mode (`actors_count` populated, the four `*_count` NULL); PRMS `true` = *"disaggregation not available, report `how_many` only"*. **Same semantics, direct pass-through.** The inverted-sounding names make this the highest-risk row in the document — assert it explicitly in a test, both modes. |
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
| `prms_result_code` | — | ⚠️ **Still not located in the contract.** The success example shows only `results: [{...Metadata}]`. Family OQ-F7 remains **open**: confirm whether the PRMS-assigned code returns synchronously, on the decision webhook, or not at all. `results.prms_result_code` exists and is unwritten. |

### Authentication & webhooks (closes family OQ-F1)

| Item | Answer (2026-09 contract) |
|---|---|
| Transport | **Still REST `POST /ingest`.** The anticipated "hook-based model" did **not** replace ingest; hooks appear instead as **outbound decision webhooks** *from* PRMS. The family's hold reason is resolved. |
| Auth | **`x-api-key` header, a CLARISA API key.** No `Authorization: Bearer` alternative, no anonymous access. |
| Key scope | **One key per tool per environment.** The key *is* the platform identity — it is what makes `external_reference` round-trip to us and only us. Must be requested from PRMS Tech Support for STAR, TEST **and** PRODUCTION. **Not yet obtained — this is now the critical-path blocker.** |
| Environments | TEST `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com` · PROD `https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com`. One `ARI_*` var per environment (K-005: hosts are branch selectors, never collapsed). |
| Decision webhooks | Self-service `POST /webhook` with the same key. Registration carries **no platform field** — the key identifies us. **Decisions taken with no destination registered are not replayed**, so registration must precede the first result going under review. Out of scope for `sync-engine` v1; it is the natural fifth family member. |

---

## 11. Open questions after the 2026-09-14 decisions

Seven of the nine questions this homologation originally raised are **closed by D-1…D-7**. What
survives:

| ID | Question | Blocks | Closed by |
|---|---|---|---|
| **OQ-H1'** | **How should v1 handle Innovation Use?** D-1 means every Innovation Use payload is rejected by PRMS. Options: **(a)** disable the sync button for that indicator with a stated reason — *recommended*; **(b)** attempt and surface the failure; **(c)** revisit D-1 for `is_determined` only, which needs **no monetary figure** — just a per-project boolean — and would make the type syncable. | Innovation Use | HITL |
| **OQ-H2'** | **Same question for PRMS policy type `1`** (*Program, Budget, or Investment*). Recommended: refuse at the endpoint with a reason, as for KP and OICR. | 1 of 3 policy subtypes | HITL |
| **OQ-H5** | `grant_title` composition — what exactly does CLARISA `/api/projects` expose that PRMS matches on? STAR has `agresso_contract.agreement_id` + `projectDescription`; the composition is **unproven**. | Every type | Spike |
| **OQ-H6** | `innovation_readiness_level` — `id`/`name` per the field table, or `level` per `inno_dev.json`? | Innovation Development | Spike |
| **OQ-H7** | `innov_use_to_be_determined` — derive it from "no actors and no quantifications", or store it explicitly? *(Moot while OQ-H1' keeps the type out.)* | Innovation Use | HITL |
| **OQ-H8** | **STAR API keys for TEST and PRODUCTION — requested from PRMS Tech Support?** Critical path: the spike cannot run without the TEST key. | Everything | External |
| **OQ-H9** | `geo_focus.scope_code = 50` (to be determined) — accepted by PRMS, and under what conditional rule? It appears in the scope description but in **no** validation row. | Results with undetermined geography | Spike |

**Closed:** OQ-H1 → D-1 · OQ-H2 → D-2 · OQ-H3 → D-3 · OQ-H4 → D-4 (type dropped) · plus D-5, D-6, D-7.

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
