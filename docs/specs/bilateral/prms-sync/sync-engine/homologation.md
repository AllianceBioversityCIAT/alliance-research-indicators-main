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
| Status | **Draft — pending HITL review.** Not an approved mapping. |

### Legend

| Mark | Meaning |
|---|---|
| ✅ **EXACT** | STAR holds the value directly; a 1:1 read. |
| 🟢 **DERIVED** | STAR holds the parts; the value is computed with a rule stated in the row. |
| 🟡 **HOMOLOGABLE** | No direct equivalent, but an existing STAR field can serve. **The row names the candidate and what must be decided.** |
| 🔴 **MISSING** | Does not exist in STAR. Needs a new column, a new UI, or an explicit product decision. |
| ⚫ **N/A** | Constant, or legitimately omitted (optional field STAR has no concept of). |

---

## 1. Executive summary — what is actually missing

Of the **58 contract fields** reconciled below, **51 are already satisfiable** from the STAR
model. The work is concentrated in **7 items**, and only **three of them are true data gaps**:

| # | Item | Severity | Nature |
|---|---|---|---|
| **G-1** | `contributing_bilateral_projects[].usd_budget` / `is_determined` | **Blocker for Innovation Use** | 🔴 Real gap — new column + new UI. STAR stores **no per-result, per-contract USD contribution**. `agresso_contract.grant_amount_usd` / `center_amount_usd` are *project-level* totals and are **not** the result's share. **Breaking since 2026-09:** an Innovation Use payload without exactly one of the pair is rejected before Reporting. |
| **G-2** | `policy_change.policy_type.status_amount` + `amount` | **Blocker for one policy type** | 🔴 Real gap — `result_policy_change` holds only `policy_type_id`, `policy_stage_id`, `evidence_stage`. When the policy type resolves to PRMS id `1` (*Budget or investment*) both fields are **mandatory**, and STAR cannot produce either. |
| **G-3** | `lead_contact_person` | **Blocker for every type** | 🟡 Mandatory since 2026-08 for all 7 types. STAR has `result_users` + `UserRolesEnum.MAIN_CONTACT`, but that role is **not guaranteed populated on every indicator**. Needs a decided fallback chain, not a hope. |
| **G-4** | `knowledge_product.handle` | **Blocker for KP** | 🟡 `result_knowledge_product` has **no** `handle`/`doi` column. The TIP importer writes the DOI into `result_evidences.evidence_url` (`tip-integration.service.ts:347`). A source of truth must be chosen and made non-ambiguous. |
| **G-5** | `evidence[].link` rules | **Silent row failure** | 🟡 Data exists; **validation does not**. Since 2026-08 PRMS rejects links without an `http(s)` scheme and links on SharePoint / OneDrive / Google Drive / Dropbox. STAR enforces neither. Rejection arrives as a **failed row inside HTTP 207**, not a 4xx — easy to mistake for success. |
| **G-6** | `title` ≤ 30 words / `description` ≤ 150 words | **Row failure** | 🟡 Both are unbounded `text` in STAR. No guard exists anywhere. |
| **G-7** | `contributing_center[]` | Cosmetic | 🟡 STAR has no *contributing center* institution role (`InstitutionRolesEnum` = TRAINEE_AFFILIATION, TRAINEE_ORGANIZATION_REPRESENTATIVE, PARTNERS, POLICY_CHANGE). CGIAR centers land in `PARTNERS` alongside everyone else and must be split out by id. |

Everything else is a read, a join, or an arithmetic derivation.

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
| 3 | Knowledge Product | `knowledge_product` | ✅ |
| 4 | Policy Change | `policy_change` | ✅ |
| 5 | OICR | — | ⚫ **Excluded from sync** (family OQ-F2, closed 2026-08-21). PRMS has no OICR type. |
| 6 | Innovation Use | `innovation_use` | ✅ |
| — | — | `other_output`, `other_outcome` | ⚫ PRMS accepts them; **STAR has no such indicator**. Nothing to map. |

> The map is total over STAR's 6 indicators and leaves 2 PRMS types unused. A result whose
> `indicator_id` is `5` must be **refused at the endpoint**, not silently skipped.

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
| **`lead_contact_person.email` / `.name`** | ✅ **MANDATORY** | `result_users` where `user_role_id = UserRolesEnum.MAIN_CONTACT (1)` → `alliance_user_staff` | 🟡 **G-3.** The role exists; universal population does **not**. Proposed fallback chain (needs approval): *main contact → contract Principal Investigator (`agresso_contract.projectLeadId` / `project_lead_description`, family OQ-F4) → `results.created_by`*. Omission = hard rejection: `(root) must have required property 'lead_contact_person'`. Only `email` and `name` are allowed — **no additional properties**. |
| `lead_center.institution_id` / `.acronym` / `.name` | ⚠️ ≥1 of 3 | `pooled_funding_contracts.cgiar_entity_code` / `cgiar_entity_name` for the result's **primary** contract | 🟡 **HOMOLOGABLE.** Family OQ-F3 (closed): CIAT → `46`, Bioversity → `49`, sent **separately**. Needs a 2-row CGIAR-entity → CLARISA-institution map. ⚠️ **Contract inconsistency to raise with PRMS:** the doc's `lead_center` table lists CGIAR System Organization as `11605 / SO`, while its `contributing_center` table lists `221 / SMO`. Irrelevant to the Alliance today, but it means the two tables are not the same catalog. |
| `title` | ✅ (≤ 30 words) | `results.title` (`text`, nullable) | 🟡 **G-6.** Value exists; the word cap does not. Guard before send. |
| `description` | ✅ (≤ 150 words) | `results.description` (`text`, nullable) | 🟡 **G-6.** Same. |

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
| `contributing_center[].institution_id` / `.acronym` / `.name` | opt (≥1 if array sent) | — | 🟡 **G-7.** No *contributing center* role exists. Rule: take `result_institutions` with `institution_role_id = PARTNERS (3)` and split by whether `institution_id` is in PRMS's 16-center list; the centers become `contributing_center`, the remainder `contributing_partners`. |
| `contributing_partners[].institution_id` / `.acronym` / `.name` | opt (≥1 if array sent) | `result_institutions` role `PARTNERS (3)` → `clarisa_institutions` | ✅ **EXACT** (after the G-7 split). |
| — | — | `results.is_partner_not_applicable` | ⚫ When true, send **no** `contributing_partners` array at all (an empty array violates "at least one option"). |

### 4.5 `evidence[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `link` | ✅ (per item) | `result_evidences.evidence_url` | 🟡 **G-5.** Value exists; the 2026-08 rules do not. Must reject/skip: no `http(s)` scheme; SharePoint, OneDrive, Google Drive, Dropbox. |
| `description` | ❌ opt | `result_evidences.evidence_description` | ✅ **EXACT.** |
| — | — | `result_evidences.is_private` | ⚫ **Filter.** Confidential evidence has **no route through this API** — private rows must be excluded, never sent and hoped over. |
| — | — | `result_evidences.evidence_role_id` | ⚫ `PRINCIPAL_EVIDENCE (1)` is the only role today. |

> **Why this matters more than it looks:** a bad link is *not* a 4xx. It comes back as a
> **failed row inside `results[]` with HTTP 207**, while `rejected[]` (422) stays empty. A
> naive "2xx ⇒ success" check marks the result synced when PRMS refused it. This is the
> single most likely silent-success defect in the whole integration (KZ-001 family).

### 4.6 `contributing_bilateral_projects[]`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `grant_title` | ✅ | `result_contracts.contract_id` → `agresso_contract` | 🟡 **HOMOLOGABLE — composition unproven.** `projectDescription` is STAR's "Project Name" (`OrderFieldsEnum.PROJECT_NAME → ac.projectDescription`); `agreement_id` is the code. PRMS's example — `"D-200358-Enhancing Food Security…"` — reads as `<agreement_id>-<description>`, and PRMS matches against **CLARISA `/api/projects`**, not against AGRESSO. **Do not assert a composition; prove it in the spike.** A title PRMS cannot resolve fails the row. |
| `is_lead` | ⚙️ opt | `result_contracts.is_primary` | ✅ **EXACT.** |
| **`usd_budget`** | ✅ **cond — Innovation Use only** | — | 🔴 **G-1. DOES NOT EXIST.** No per-result, per-contract USD amount anywhere in the model. `agresso_contract.grant_amount_usd` / `center_amount_usd` are **project totals**, not this result's contribution — sending either would be a fabricated figure. Needs a new column on `result_contracts` (or a sibling table) **and** a UI to capture it. Must be **> 0**; `0` is rejected. |
| **`is_determined`** | ✅ **cond — Innovation Use only** | — | 🔴 **G-1.** Same gap. Send `true` **only** when the amount is unknown. `false` alone does **not** satisfy the rule, and sending it **together** with a positive `usd_budget` is rejected. Exactly one of the two, per project entry. |

> **G-1 is the largest single item in this homologation.** It is *breaking since 2026-09*, it
> is per-`contributing_bilateral_projects[]`-entry (not per result), and it blocks the
> Innovation Use type entirely. It is also the one item that needs client work, which makes it
> a candidate for its own child spec rather than a line inside `sync-engine`.

---

## 5. `knowledge_product`

| PRMS field | Req | STAR source | Verdict |
|---|---|---|---|
| `handle` | ✅ | — | 🟡 **G-4.** `result_knowledge_product` holds `type`, `citation`, `open_access`, `access_status`, `collection`, `publication_date`, `tip_id` — **no handle/DOI**. Candidates, in the order they should be considered: (1) `result_evidences.evidence_url` — the TIP importer writes the DOI there (`tip-integration.service.ts:347`); (2) `results.external_link`; (3) `results.public_link`. Pick one, state the fallback, and reject the result when none resolves — a KP without a handle cannot be ingested. |

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
| **`policy_type.status_amount.id` / `.name`** | **cond — required iff `policy_type.id = 1`** | — | 🔴 **G-2. DOES NOT EXIST.** |
| **`policy_type.amount`** | **cond — required iff `policy_type.id = 1`** | — | 🔴 **G-2. DOES NOT EXIST.** `result_policy_change` has no amount column. |
| `policy_stage.id` / `.name` | ⚙️ ≥1 | `result_policy_change.policy_stage_id` → `policy_stages` | ✅ **EXACT** (`policy-stage.homologation.ts` invertible; same id caveat as above). |
| `implementing_organization[].institutions_id` / `.institutions_acronym` / `.institutions_name` | ✅ **min 1** | `result_institutions` where `institution_role_id = POLICY_CHANGE (4)` → `clarisa_institutions` | ✅ **EXACT.** Each item needs ≥1 of the three, and **no other properties are allowed**. |
| — | — | `result_policy_change.evidence_stage` | ⚫ No PRMS equivalent; drop. |

> **G-2's real shape:** the gap only bites when a STAR policy result maps to PRMS policy type
> `1` (*Budget or investment*). Two honest options: **(a)** add `status_amount` + `amount` to
> `result_policy_change` and to the UI; **(b)** refuse to sync results of that type in v1 and
> say so in the UI. Option (b) is smaller but leaves a category of results permanently
> unsyncable — a product call, not an engineering one.
>
> ⚠️ Note the asymmetry: if `policy_type.id ≠ 1`, the two fields are **not allowed** — sending
> them anyway is a rejection. The branch cuts both ways.

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

## 11. Open questions this homologation raises

| ID | Question | Blocks |
|---|---|---|
| **OQ-H1** | `usd_budget` / `is_determined` (**G-1**) — new column + UI, or refuse to sync Innovation Use in v1? | Innovation Use entirely |
| **OQ-H2** | `status_amount` + `amount` (**G-2**) — add the fields, or refuse PRMS policy type `1`? | One policy category |
| **OQ-H3** | `lead_contact_person` (**G-3**) — is the proposed fallback chain (main contact → PI → creator) acceptable? | Every type |
| **OQ-H4** | `knowledge_product.handle` (**G-4**) — which column is the source of truth? | Knowledge Product |
| **OQ-H5** | `grant_title` composition — what exactly does CLARISA `/api/projects` expose that PRMS matches on? | Every type (spike) |
| **OQ-H6** | `innovation_readiness_level` — `id`/`name` per the table, or `level` per `inno_dev.json`? | Innovation Development (spike) |
| **OQ-H7** | `innov_use_to_be_determined` — derive it, or store it explicitly? | Innovation Use |
| **OQ-H8** | STAR API keys for TEST and PRODUCTION — **requested from PRMS Tech Support?** | Everything |
| **OQ-H9** | `geo_focus.scope_code = 50` — accepted by PRMS, and with what conditional rule? | Results with undetermined geography |

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
