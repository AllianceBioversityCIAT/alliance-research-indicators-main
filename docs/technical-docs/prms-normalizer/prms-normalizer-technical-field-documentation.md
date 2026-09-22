# PRMS Normalizer – Technical Field Documentation

![Isoflow Export Dec 16 2025.png](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/Isoflow_Export_Dec_16_2025.png)

## **🌐 Service URLs PRODUCTION Environment 🚀**

| **Description** | **URL** | Type |
| --- | --- | --- |
| **Swagger UI (API Reference)** | [https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/docs](https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/docs) | **Documentation** |
| **API Normal Ingest (Recommended for submitting a single result)** | [https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/](https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/ingest) | **1-10 Results** |
| **API Bulk Ingest (Recommended for sending multiple results)** | [https://bla4fsvgni.execute-api.us-east-1.amazonaws.com/ingest](https://bla4fsvgni.execute-api.us-east-1.amazonaws.com/ingest) | Bulk Upload |

## **🌐 Service URLs TEST Environment 🧪**

| **Description** | **URL** | Type |
| --- | --- | --- |
| **Swagger UI (API Reference)** | [https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/docs/](https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/docs/#/default/post_ingest) | **Documentation** |
| **API Normal Ingest (Recommended for submitting a single result)** | [https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/](https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/) | **1-10 Results** |
| **API Bulk Ingest (Recommended for sending multiple results)** | [https://0w16ghmybe.execute-api.us-east-1.amazonaws.com](https://0w16ghmybe.execute-api.us-east-1.amazonaws.com/)[/ingest](https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/ingest) | **Bulk Upload** |

---

## 🔑 Authentication

Every call to the **Normal Ingest API and Bulk Ingest API** requires a CLARISA API key in the `x-api-key` header.
There is no anonymous access and no `Authorization: Bearer` alternative.

For Bulk Ingest, the key is validated before the job is accepted. An invalid or missing key does not create a bulk job.

| **Endpoint** | **Key required** |
| --- | --- |
| `POST /ingest` | ✅ |
| `POST /webhook` · `GET /webhook` | ✅ |
| `GET /docs` · `GET /openapi.json` · `GET /health` | ❌ Open |

```bash
curl -X POST "<Normal Ingest URL>/ingest" \
  -H "x-api-key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

### 📩 How to get your key

**Keys are issued by the PRMS team — one per tool and per environment.** Do not reuse a key across tools, and do not share it between environments: your key is what identifies your platform, so a shared key makes two systems indistinguishable to PRMS.

Request yours before you start testing:

- Open a ticket with **PRMS Tech Support**, or
- Contact the PRMS team directly.

Tell us which tool it is for (STAR, MEL, TIP, …) and which environment you need (TEST or PRODUCTION).

### 🪪 Your key is your identity

PRMS resolves your platform from the key on every call. Two consequences worth knowing:

- **Webhook registration needs no platform field.** You cannot register a callback destination for anybody but yourself, and nobody can register one for you.
- **`external_reference` round-trips per platform.** The identifier you send comes back to you, and only to you.

### ❌ Error responses

| **HTTP** | **Body** | **What it means** |
| --- | --- | --- |
| **401** | `{"ok": false, "error": "unauthorized", "message": "Unauthorized", "requestId": "…"}` | No key sent, or CLARISA says the key is not valid. Do not retry — fix the key. |
| **503** | `{"ok": false, "error": "…", "message": "…", "requestId": "…"}` | CLARISA could not be reached to validate your key. **Retryable** — your key may be perfectly fine. |

> The `requestId` in the body is the one to quote when you contact support about a rejected call.
> 

---

## **🔔 Result Decision Webhooks**

Submitting a result is one half of the exchange; the other is finding out what the Science Program decided about it. PRMS can POST that decision to an HTTPS endpoint of yours — approved or rejected, with the reviewer's justification and the full enriched result.

Registration is self-service and uses the API key you already have. The endpoints sit on the **Normal Ingest** base URL above.

**→ [PRMS Result Decision Webhooks](https://app.notion.com/p/PRMS-Result-Decision-Webhooks-3c7f271224788077b369d86c5a6fd8d2?pvs=21)** — registration payload, callback contract, retries, and error responses.

---

## 🚨 Breaking changes & new capabilities

| **Date** | **Change** | **Action required** |
| --- | --- | --- |
| **2026-09** | **Breaking:** Innovation Use now requires investment data for every `contributing_bilateral_projects[]` entry. Send exactly one: a
positive `usd_budget`, or `is_determined: true`. | **Yes, for Innovation Use.** `usd_budget: 0`, `is_determined: false` alone, an omitted pair, or sending
both values is rejected before the result reaches Reporting. |
| **2026-09** | **New:** `keep_editing` in `data` — optional boolean. `true` creates the result in PRMS Reporting as **Editing** instead of **Pending review**, so the reporting user completes the non-MDS fields in PRMS and submits it from there. Absent or `false` keeps today's behaviour. |  None. Opt in **per result**, inside `data` — a flag sent at the top level of the request never reaches validation. See **keep_editing** below. |
| **2026-08** | **Breaking:** `evidence[].link` must carry an `http(s)` scheme, and links hosted on file storage platforms (SharePoint, OneDrive, Google Drive, Dropbox) are rejected. | **Yes.** Stop sending storage links and bare file names — both used to be accepted. See **Evidence links** below. |
| **2026-08** | `innovation_use` actors: `actor_type_name` is now resolved against the actor type catalogue. An unresolvable name or id is rejected. | **Yes, if you send names.** An actor identified by name alone was previously **dropped without any error**. See **Innovation use — actors** below. |
| **2026-08** | `innovation_use` actors: `women_youth` / `men_youth` are validated against their sex total and rejected when greater. | **Yes.** Check the figures before submitting. Youth is a subset of each sex, not a separate group. |
| **2026-08** | Conditional validation corrected across `common_fields`, `knowledge_product` and `innovation_use`. Several conditions used to fire when a field was **absent**, demanding fields that were never actually required. | **None.** Payloads that were wrongly rejected now pass. Nothing that was accepted before is rejected now. |
| **2026-08** | `external_reference` is returned on **every** row of the ingest response, including rows that failed and rows rejected before processing. The previously documented path now exists. | **None.** See the updated table in **external_reference**. |
| **2026-08** | **New:** `external_reference` in `data` — your own identifier for the result (consecutive, UUID, any string). Optional. Stored verbatim and returned verbatim on the decision webhook and in the ingest response. | None to keep ingesting. **Required in practice if you want to use webhooks**: without it a callback carries no field pointing at your record. |
| **2026-08** | **New:** self-service **decision webhooks**. Register an HTTPS callback with `POST /webhook` using your existing API key, and PRMS notifies you when a Science Program approves or rejects one of your results. See [**PRMS Result Decision Webhooks**](https://app.notion.com/p/cgiar-prms/link). | None to keep ingesting. To receive decisions, register a callback **before your results go under review** — decisions taken with no destination registered are not replayed. |
| **2026-08** | `lead_contact_person` (with `email` + `name`) is now **mandatory** in `data` for all result types. | Producers must add it to every payload, otherwise the request is rejected at validation (`(root) must have required property 'lead_contact_person'`). |

---

**🧩 General Structure (POST /ingest)**

Each request must follow this structure:

```json
{
  "tenant": "prms.result-management.api",
  "op": "dataset.ingest.requested",
  "results": [
    {
      "type": "knowledge_product",
      "data": { ... }
    }
  ]
}
```

| **Field** | **Type** | **Required** | **Description** | **Example** |
| --- | --- | --- | --- | --- |
| **tenant** | string | ✅ | **Identifier of the system or instance submitting the data.** | "prms.result-management.api” |
| **op** | string | ✅ | **Operation type: create, update, or delete.** | "dataset.ingest.requested" |
| **results** | array | ✅ | **List of results to be processed. Each item includes type and data.** | [ 
{ 
"**type**": "knowledge_product", 
"**data**": {...} 
} 
] |
| **type** | string | ✅ | **Type of result to validate (knowledge_product, policy_change, etc.).** | "knowledge_product" |
| **data** | object | ✅ | **Payload containing the result data according to its type.** | { "title": "Improved seed varieties..." } |
- **🧱 Common Fields (common_fields.json) All Results**
    
    ---
    
    ### **🔹 external_reference 🆕**
    
    Your own identifier for this result — the consecutive number, UUID, or internal id your system already uses. PRMS stores it exactly as you send it and hands it back exactly as you sent it, so you never have to keep a PRMS id to know which of your records a response is about.
    
    | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- |
    | **string** | ⚙️ Optional ⚠️ | Your identifier for this result. Max 191 characters. Stored and returned verbatim — no prefix, no transformation. | `"STAR-9f2c-4471"` |
    
    **Where it comes back to you:**
    
    | **Where** | **Field** |
    | --- | --- |
    | Ingest response — a row that was processed, success or failure | `results[].external_reference` |
    | Ingest response — a row rejected before processing (schema, missing `type`/`data`) | `rejected[].external_reference` |
    | Decision webhook | `external_reference` (top level) |
    
    > ℹ️ It comes back on **every** row, including the ones that failed. A rejected row is the one you most need to find again — it is the row you have to show your own user. `null` when you sent none.
    > 
    
    ```json
    {
      "type": "knowledge_product",
      "data": {
        "external_reference": "STAR-9f2c-4471",
        "created_date": "2025-10-24T19:36:04Z",
        "...": "resto de campos"
      }
    }
    ```
    
    > ℹ️ **It is optional and will stay optional.** Not every producer has an id of its own, and a bilateral result created inside the PRMS Reporting Tool has no external system behind it — those are stored as `null`, which is the honest answer rather than an invented value.
    > 
    > 
    > ⚠️ **But without it you cannot correlate.** The decision webhook tells you what was decided and why, and carries nothing that points at your row. If you plan to consume webhooks, send it.
    > 
    
    > ❗ One value per result, not per request. In a payload with several results, each one carries its own.
    > 
    
    ---
    
    ### **🔹 keep_editing 🆕**
    
    Where the result lands in PRMS Reporting once it is created. By default a result arrives in **Pending review** and goes straight to the Science Program. Set this to `true` when the reporting user still has to complete the fields PRMS asks for beyond the minimum data set: the result is created in **Editing**, visible to them, and **they** submit it for review from PRMS.
    
    | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- |
    | **boolean** | ⚙️ Optional | `true` → created as **Editing**, completed and submitted by the reporting user in PRMS. `false` or absent → **Pending review**, today's behaviour. | `true` |
    
    ```json
    "data": {
      "keep_editing": true,
      "title": "Adoption of climate-resilient seed varieties"
    }
    ```
    
    > ⚠️ **Send it per result, inside `data`.** A flag at the top level of the request is dropped before validation: the ingest handler rebuilds the envelope as `{tenant, op, jobId, results}` and keeps nothing else. Sending the same value on every result of a batch is fine — that is how you get a batch-wide effect.
    > 
    
    > ✅
    > 
    > 
    > **Validation rules (schema):**
    > 
    - Optional on every result type. Absent is treated as `false`.
    - Must be a **boolean**. A string, a number or `"true"` in quotes is rejected.
    
    > ⚠️ **New 2026-09.** The field was silently discarded before it was declared: the schemas set `additionalProperties: true`, so `keep_editing` was passed through untouched and then dropped further down by Reporting's whitelist. Sending it produced no error **and no effect**. Two things changed — it is now declared on all seven types, so a non-boolean is rejected here with the row's `external_reference` instead of being forwarded; and Reporting reads it.
    > 
    
    ---
    
    ### **🔹 created_date 🆕**
    
    | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- |
    | **string (ISO date)** | ✅ | **Original creation date of the result (if no date is available, use the current timestamp).** | "2025-10-09T12:00:00Z" |
    
    ---
    
    ### **🔹 created_by 🆕**
    
    Information about the user who created the result.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **email** | string (email) | ✅ | **User’s email address.** | "j.doe@cgiar.org" |
    | **name** | string | ✅ | **Full name of the user.** | "John Doe" |
    
    ---
    
    ### **🔹 submitted_by**
    
    Information about the user submitting the result.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **email** | string (email) | ✅ | **User’s email address.** | "j.doe@cgiar.org" |
    | **name** | string | ✅ | **Full name of the user.** | "John Doe" |
    | **submitted_date** | string (ISO date) | ✅ | **Submission timestamp.** | "2025-10-09T12:00:00Z" |
    | **comment** | string | ❌ | **Optional comment or note.** | "Initial batch upload from STAR" |
    
    ---
    
    ### **🔹 lead_center**
    
    | id | acronym | name |
    | --- | --- | --- |
    | 5 | IRRI | International Rice Research Institute |
    | 45 | IITA | International Institute of Tropical Agriculture |
    | 46 | CIAT (Alliance) | Alliance of Bioversity and CIAT - Regional Hub |
    | 49 | Bioversity (Alliance) | Alliance of Bioversity and CIAT - Headquarter (Bioversity International) |
    | 50 | CIMMYT | International Maize and Wheat Improvement Center / Centro Internacional de Mejoramiento de Maíz y Trigo |
    | 52 | AfricaRice | Africa Rice Center |
    | 66 | ILRI | International Livestock Research Institute |
    | 67 | CIP | International Potato Center / Centro Internacional de la Papa |
    | 88 | ICRAF | World Agroforestry Centre |
    | 89 | IFPRI | International Food Policy Research Institute |
    | 99 | WorldFish | WorldFish |
    | 115 | CIFOR | Center for International Forestry Research |
    | 172 | IWMI | International Water Management Institute |
    | 11605 | SO | CGIAR System Organization |
    | 1273 | ICRISAT | International Crops Research Institute for the Semi-Arid Tropics |
    | 1279 | ICARDA | International Center for Agricultural Research in the Dry Areas |
    
    ⚠️ At least one option
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **name** | string | ⚙️ Optional ⚠️ | **Name of the main center responsible for the result.** | “Alliance of Bioversity and CIAT - Regional Hub (International Center for Tropical Agriculture / Centro Internacional de Agricultura Tropical)” |
    | **acronym** | string | ⚙️ Optional ⚠️ | **Acronym of the main center responsible for the result.** | “CIAT (Alliance)” |
    | **institution_id** | number | ⚙️ Optional ⚠️ | **Code of the main center responsible for the result.** | 46 |
    
    ---
    
    ### **🔹 lead_contact_person 🚨 BREAKING — now MANDATORY**
    
    > ⚠️ **Change (2026-08):** `lead_contact_person` is now a **required** field for **all result types** (P2-3227 — MDS transversal). Payloads that omit it will be **rejected** at validation with `(root) must have required property 'lead_contact_person'`. Producers must start sending it.
    > 
    
    Lead contact person for the result (MDS field, mandatory). The server matches/creates the AD/PRMS user record by email; if no match is found, it falls back to storing the name only.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **email** | string (email) | ✅ | **Email address of the lead contact person.** | "[jane.doe@cgiar.org](mailto:jane.doe@cgiar.org)" |
    | **name** | string | ✅ | **Full name of the lead contact person.** | "Jane Doe" |
    
    > ❗ No additional properties other than `email` and `name` are allowed.
    > 
    
    ---
    
    ### **🔹 title and description**
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **title** | string | ✅ | **Short title (max 30 words).** | "Improved seed varieties adoption in drylands" |
    | **description** | string | ✅ | **Detailed description (max 150 words).** | "Summarizes adoption barriers and enabling factors across regions to inform policy and practice." |
    
    ---
    
    ### **🔹 toc_mapping**
    
    Associates the result with elements of the Theory of Change (ToC).
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **science_program_id** | string | ✅ | **ID of the Science Program (SP01–SP13).** | "SP12" |
    | **aow_compose_code** | string | ❌ | **Composite code of the Area of Work (AoW).** | "SP12-AOW01" |
    | **result_title** | string | ❌ | **Title of the associated ToC result.** | "Adoption of improved seed varieties" |
    | **result_indicator_description** | string | ❌ | **Indicator description.** | "Share of farmers adopting improved seeds" |
    | **result_indicator_type_name** | string | ❌ | **Indicator type name.** | "# Of Knowledge Products" |
    
    ---
    
    ### 🔹 contributing_programs
    
    Array of science programs contributing to the result (alternative to single `toc_mapping`).
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **science_program_id** | string | ✅ | **ID of the Science Program (SP01–SP13).** | "SP02" |
    | **aow_compose_code** | string | ❌ | **Composite code of the Area of Work (AoW).** | "SP02-AOW03" |
    | **result_title** | string | ❌ | **Title of the associated ToC result.** | "Nutrition outcomes improved" |
    | **result_indicator_description** | string | ❌ | **Indicator description.** | "Households reached with nutrition interventions" |
    | **result_indicator_type_name** | string | ❌ | **Indicator type name.** | "Outcome" |
    
    ---
    
    ### **🔹 geo_focus**
    
    Defines the geographical scope of the result.
    
    - **CLARISA Geo Scope:** [https://api.clarisa.cgiar.org/api/geographic-scopes](https://api.clarisa.cgiar.org/api/geographic-scopes)
    - **CLARISA Regions:** [https://api.clarisa.cgiar.org/api/regions/un-regions](https://api.clarisa.cgiar.org/api/regions/un-regions)
    - **CLARISA Countries:** [https://api.clarisa.cgiar.org/api/countries](https://api.clarisa.cgiar.org/api/countries)
    - **CLARISA Sub-National Scopes:** [https://api.clarisa.cgiar.org/api/subnational-scope](https://api.clarisa.cgiar.org/api/subnational-scope)
    
    ⚠️ At least one option
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **scope_code** | number | ⚙️ Optional (If **scope_label** is defined) ⚠️ | **Geographical scope (1=Global, 2=Regional, 3=Multi-national, 4=National, 5=Sub-national, 50=To be determined).** | 2 |
    | **scope_label** | string | ⚙️ Optional (If **scope_code** is defined) ⚠️ | **Descriptive label for the scope.** | "Regional" |
    | **regions** | array | Conditional (scope_code=2) | **List of regions covered.** | [ { "um49code": 145, "name": "Sub-Saharan Africa" } ] |
    | **countries** | array | Conditional (scope_code=3–5) | **List of countries involved.** | [ { "id": 170, "name": "Colombia", "iso_alpha_3": "COL", "iso_alpha_2": "CO" } ] |
    | **subnational_areas** | array | Conditional (scope_code=5) | **List of first-level administrative areas.** | [ { "id": 1, "name": "Nairobi County" } ] |
    
    **Important note:**
    
    - `scope_code = 3` (Multi-national): Requires a minimum of **2 countries** in the `countries` array.
    - `scope_code = 4` (National): Requires a minimum of **1 country** in the `countries` array.
    - `scope_code = 5` (Sub-national): Requires a minimum of **1 country** and **1 sub-national area**.
    
    ---
    
    ### **🔹 contributing_center**
    
    - **CLARISA Institutions:** [https://api.clarisa.cgiar.org/api/institutions](https://api.clarisa.cgiar.org/api/institutions)
    
    | id | acronym | name |
    | --- | --- | --- |
    | 5 | IRRI | International Rice Research Institute |
    | 45 | IITA | International Institute of Tropical Agriculture |
    | 46 | CIAT (Alliance) | Alliance of Bioversity and CIAT - Regional Hub (International Center for Tropical Agriculture / Centro Internacional de Agricultura Tropical) |
    | 49 | Bioversity (Alliance) | Alliance of Bioversity and CIAT - Headquarter (Bioversity International) |
    | 50 | CIMMYT | International Maize and Wheat Improvement Center / Centro Internacional de Mejoramiento de Maíz y Trigo |
    | 52 | AfricaRice | Africa Rice Center |
    | 66 | ILRI | International Livestock Research Institute |
    | 67 | CIP | International Potato Center / Centro Internacional de la Papa |
    | 88 | ICRAF | World Agroforestry Centre |
    | 89 | IFPRI | International Food Policy Research Institute |
    | 99 | WorldFish | WorldFish |
    | 115 | CIFOR | Center for International Forestry Research |
    | 172 | IWMI | International Water Management Institute |
    | 221 | SMO | CGIAR System Organization |
    | 1273 | ICRISAT | International Crops Research Institute for the Semi-Arid Tropics |
    | 1279 | ICARDA | International Center for Agricultural Research in the Dry Areas |
    
    ⚠️ If send the array: At least one option
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **institution_id** | number | Optional | **Numeric identifier of the center.** | 1279 |
    | **acronym** | string | Optional | **Center acronym.** | "ICARDA" |
    | **name** | string | Optional | **Full name of the center.** | "International Center for Agricultural Research in the Dry Areas" |
    
    ---
    
    ### **🔹 contributing_partners**
    
    ⚠️ If send the array: At least one option
    
    - **CLARISA Institutions:** [https://api.clarisa.cgiar.org/api/institutions](https://api.clarisa.cgiar.org/api/institutions)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **institution_id** | number | Optional | **Partner institution ID.** | 7 |
    | **acronym** | string | Optional | **Institution acronym.** | "NARO" |
    | **name** | string | Optional | **Full name of the partner institution.** | “National Agricultural Research Organization” |
    
    ---
    
    ### **🔹 evidence**
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | link | string (`http(s)` URL) | ✅ | **Publicly accessible link to the supporting evidence** (paper, report, dataset, etc.). Must include the scheme. File storage platforms are not accepted — see the rules below. | `"<https://cgspace.cgiar.org/handle/10568/181939>"` |
    | description | string | ❌ | **Brief description of the evidence.** | `"Peer-reviewed article summarizing multi-country trials."` |
    
    PRMS stores the link and **never copies the document**. Everything about what is accepted follows from that: whoever opens the link later — a reviewer, the CGIAR Results Dashboard — gets exactly what you sent, or nothing.
    
    | Rule | Detail |
    | --- | --- |
    | **Scheme required** ⚠️ *2026-08* | The link must start with `http://` or `https://`. A bare file name is rejected. |
    | **No file storage platforms** ⚠️ *2026-08* | SharePoint, OneDrive, Google Drive and Dropbox links are rejected, whatever the tenant. |
    | **Publicly reachable** | A link nobody outside your organisation can open is of no use as evidence, even when it is technically accepted. |
    
    ✅ `https://cgspace.cgiar.org/handle/10568/181939`
    ✅ `https://doi.org/10.1234/abcd.2025.01`
    ❌ `result-28808-Document-202607042143-8310.pdf` — no scheme
    ❌ `https://cgiar.sharepoint.com/sites/…` — file storage platform
    
    > ⚠️ **Both rules were already in force in the PRMS reporting tool** and stated on screen there; this API simply did not apply them. Until 2026-08 the same link was refused in the form and accepted here.
    > 
    
    > ℹ️ **Confidential evidence has no route through this API.** The API accepts links only. Evidence that cannot be public is reported through the PRMS reporting tool with **Upload file** and answering **No** to the public question: the file is then stored in the PRMS repository, kept off the Results Dashboard, and reachable only by CGIAR staff holding the repository link.
    > 
    
    **Where the rejection appears:** these two rules are applied by PRMS, not by this service's pre-checks. A bad link comes back as a failed row in `results[]` (HTTP 207), not in `rejected[]` (HTTP 422). Validate on your side if you want to catch it before submitting.
    
    ---
    
    ### **🔹 contributing_bilateral_projects**
    
    - **CLARISA bilateral Projects:** [https://api.clarisa.cgiar.org/api/projects](https://api.clarisa.cgiar.org/api/projects)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **grant_title** | string | ✅ | **Title of the bilateral or NPP project.** | "Seed Innovation Window" |
    | **is_lead** | boolean | ⚙️ Optional | **Flag to identify an Bilateral Project Lead** | false |
    | usd_budget | number | **Required:** Conditional for Innovation Use. |   • Send a positive USD value when the project's contribution amount is known.
      • 0 is not valid.
      • Must not be sent together with `is_determined`: true. | 15000 |
    | is_determined | boolean | **Required**: Conditional for Innovation Use. |   • Send only `true` when the project's contribution amount is not yet determined.
      • **`false`** alone does not satisfy the requirement; provide a positive usd_budget instead.
      • Must not be sent together with a positive `usd_budget`. | false |
    - **⚠️ Applicability**
    
    The fields `usd_budget` and `is_determined` apply exclusively to results of type **Innovation Use**.
    
    For all other result types, these fields are hidden and not stored.
    

---

- **📚 Knowledge Product Fields (knowledge_product.json)**
    
    ### **🔹 knowledge_product**
    
    Describes the knowledge product attributes.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **handle** | string | ✅ | **Handle or DOI identifier.** | "hdl:20.500.12345/abc-2025" |

---

- **⚙️ Innovation Development (innovation_development.json)**
    
    ### **🔹 innovation_development**
    
    Describe los atributos específicos del resultado de **Innovation Development**.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **innovation_typology** | object | ✅ | Typology of the innovation (by code or descriptive name). | { "code": 12, "name": "Technological innovation" } |
    | **innovation_developers** | string | ❌ | Semicolon-separated list of main developers or organizations. | "John Doe; Marie Curie; CGIAR Breeding Team" |
    | **innovation_readiness_level** | object | ✅ | Readiness level of the innovation, using PRMS readiness scale (id or name). | { "id": 14, "name": "Phase 3 - Available for uptake" } |
    
    ---
    
    ### **🔹 innovation_typology**
    
    - **CLARISA Type of Innovations:** [https://api.clarisa.cgiar.org/api/innovation-types](https://api.clarisa.cgiar.org/api/innovation-types)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **code** | number | ⚙️ Optional (if **name** is provided) ⚠️ | Numeric code representing the innovation typology. | 12 |
    | **name** | string | ⚙️ Optional (if **code** is provided) ⚠️ | Descriptive name of the innovation typology. | "Technological innovation" |
    
    > ⚠️
    > 
    > 
    > **At least one is required:**
    > 
    > **code**
    > 
    > **name**
    > 
    
    ---
    
    ### **🔹 innovation_readiness_level**
    
    - **CLARISA Innovation Readiness Levels:** [https://api.clarisa.cgiar.org/api/innovation-readiness-levels](https://api.clarisa.cgiar.org/api/innovation-readiness-levels)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **id** | number | ⚙️ Optional (if **name** is provided) ⚠️ | Identifier of the innovation readiness level in PRMS. | 14 |
    | **name** | string | ⚙️ Optional (if **id** is provided) ⚠️ | Descriptive label of the readiness level. | "Phase 3 - Available for uptake" |
    
    > ⚠️
    > 
    > 
    > **At least one is required:**
    > 
    > **id**
    > 
    > **name**
    > 
    
    ---
    
    ### **🧩 Data usage example**
    
    ```json
    "innovation_development": {
      "innovation_typology": {
        "code": 12,
        "name": "Technological innovation"
      },
      "innovation_developers": "John Doe; Marie Curie; CGIAR Breeding Team",
      "innovation_readiness_level": {
        "id": 14,
        "name": "Phase 3 - Available for uptake"
      }
    }
    ```
    

---

- **📤 Capacity Sharing For Development (capacity_sharing.json)**
    
    ### **🔹 capacity_sharing**
    
    Describes the attributes of **Capacity Sharing / Training**–related results.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **number_people_trained** | object | ✅ | Disaggregation of participants trained by gender/unknown. At least one sub-field must be provided. | { "women": 12, "men": 20 } |
    | **length_training** | string (enum) | ✅ | Duration/type of the training. | "Short-term" |
    | **delivery_method** | string (enum) | ✅ | How the training was delivered (online, in person, blended). | "Blended (in-person and virtual)" |
    
    ---
    
    ## **🔹 number_people_trained**
    
    Breakdown of how many people were trained.
    
    > ⚠️
    > 
    > 
    > **At least one field is required**
    > 
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **women** | number | ⚙️ Optional (at least one of the four is required) ⚠️ | Number of women trained. | 25 |
    | **men** | number | ⚙️ Optional (at least one of the four is required) ⚠️ | Number of men trained. | 18 |
    | **non_binary** | number | ⚙️ Optional (at least one of the four is required) ⚠️ | Number of non-binary participants trained. | 2 |
    | **unknown** | number | ⚙️ Optional (at least one of the four is required) ⚠️ | Number of participants whose gender is not reported / unknown. | 5 |
    
    > ℹ️
    > 
    > 
    > **Validation rule:**
    > 
    > **at least one**
    > 
    
    ---
    
    ### **🔹 length_training**
    
    Specifies the duration or type of training.
    
    | **Value** | **Description** |
    | --- | --- |
    | **“PhD”** | Doctoral-level training. |
    | **“Master”** | Master-level training. |
    | **“Short-term”** | Short-term training (workshop, short course, etc.). |
    | **“Long-term”** | Long-term training not classified as Master/PhD (e.g. multi-month programs). |
    
    > ✅
    > 
    > 
    > **Required**
    > 
    
    > ❗ Must be one of: "PhD", "Master", "Short-term", "Long-term".
    > 
    
    ---
    
    ### **🔹 delivery_method**
    
    How the training or capacity sharing activity was delivered.
    
    | **Value** | **Description** |
    | --- | --- |
    | **“Virtual / Online”** | Training delivered fully online. |
    | **“In person”** | Training delivered fully face-to-face. |
    | **“Blended (in-person and virtual)”** | Training combining online and in-person components. |
    
    > ✅
    > 
    > 
    > **Required**
    > 
    
    > ❗ Must be one of: "Virtual / Online", "In person", "Blended (in-person and virtual)".
    > 
    
    ---
    
    ## **🧩 Data usage example**
    
    ```
    "capacity_sharing": {
      "number_people_trained": {
        "women": 25,
        "men": 18,
        "non_binary": 2,
        "unknown": 5
      },
      "length_training": "Short-term",
      "delivery_method": "Blended (in-person and virtual)"
    }
    ```
    

---

- **🤲 Innovation Use (innovation_use.json)**
    
    ### **🔹 innovation_use**
    
    Captures how the innovation is currently being used, by **actors**, **organizations**, and optional **measures**.
    
    **⚠️ Innovation Use minimum data set**
    
    An Innovation Use result is accepted only when it includes all of the following:
    
    - An `innovation_use_level`, identified by either level or name.
    - At least one actor in c`urrent_innovation_use_numbers.actors`, unless `innov_use_to_be_determined` is `true`.
    - At least one complete measure with both `unit_of_measure` and a numeric quantity.
    - For every item in `contributing_bilateral_projects[]`, exactly one investment value: a positive `usd_budget`, or `is_determined: true` .
    - `organization` is optional and does not replace the actors or measures requirements.
    
    ```
    "innovation_use": {
      "innovation_use_level": { "level": 2 },
      "current_innovation_use_numbers": {
        "innov_use_to_be_determined": false,
        "actors": [ ... ],
        "organization": [ ... ],
        "measures": [ ... ]
      }
    }
    ```
    
    ---
    
    ### **🔹 innovation_use_level 🆕**
    
    The stage of use being claimed. Required on **every** innovation use, including one whose numbers are yet to be determined — what stage the innovation has reached is known long before how many actors are using it.
    
    | id | name | level | definition |
    | --- | --- | --- | --- |
    | 1 | No use | 0 | Innovation is not used. |
    | 2 | Project lead organization | 1 | Innovation is used by organization(s) leading the innovation development. |
    | 3 | Partners | 2 | Innovation is used by some partners involved in initial innovation development. |
    | 4 | Partners | 3 | Innovation is commonly used by partners involved in initial innovation development. |
    | 5 | Connected next-user | 4 | Innovation is used by some organizations connected to partners involved in the initial innovation development. |
    | 6 | Connected next-user | 5 | Innovation is commonly used by organizations connected to partners involved in the initial innovation development. |
    | 7 | Unconnected next-user | 6 | Innovation is used by organizations not connected to partners involved in the initial innovation development. |
    | 8 | Unconnected next-user | 7 | Innovation is commonly used by organizations not connected to partners involved in the initial innovation development. |
    | 9 | End-user / Beneficiaries | 8 | Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development. |
    | 10 | End-user / Beneficiaries | 9 | Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development. |
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **level** | integer or string | ⚙️ Optional (if **name** is provided) | Coded level, from the table above. **Preferred over the name.** | 2 |
    | **name** | string | ⚙️ Optional (if **level** is provided) | Descriptive label of the level, matched against the table above. | "Scaling" |
    
    ```json
    "innovation_use": {
      "innovation_use_level": { "level": 2 },
      "current_innovation_use_numbers": { }
    }
    ```
    
    ---
    
    ### **🔹 current_innovation_use_numbers**
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **innov_use_to_be_determined** | boolean | ✅ | Whether the use figures are still to be determined. `true` waives `actors` — nothing else. | false |
    | **actors** | array[object] | ✅ Required unless **innov_use_to_be_determined** is `true` ⚠️ | Actor groups using the innovation, with optional sex/age disaggregation. Must hold at least one. | [{ "actor_type_id": 1, "how_many": 120 }] |
    | **organization** | array[object] | ⚙️ Optional | Organizations/institutions using the innovation. | [{ "institution_types_id": 10, "how_many": 3 }] |
    | **measures** | array[object] | ✅ ⚠️ | What the use is counted in. At least one entry with **both** a unit and a numeric quantity — **required even when the numbers are to be determined**. | [{ "unit_of_measure": "Hectares", "quantity": 2500 }] |
    
    > ✅
    > 
    > 
    > **Validation rules (schema):**
    > 
    - `innov_use_to_be_determined` is **required**.
    - `actors` is **required with at least one entry**, unless `innov_use_to_be_determined` is `true`. An empty array counts as missing.
    - `measures` is **always required** with at least one complete entry. Being to-be-determined does not waive it.
    - `organization` is **optional** and unchecked.
    - `innovation_use_level` is required too, but it sits **outside** this object — see the entry above.
    
    > ⚠️ **Changed 2026-09.** Two things read differently before:
    > 
    > - The rule was an **or**: any one of `actors`, `organization` or `measures` satisfied it. Now `actors` and `measures` are demanded separately, and `organization` satisfies neither.
    > - The **Required** column had the condition backwards on all three rows — it said they were needed when `innov_use_to_be_determined` was `true`, which is exactly when actors are *not*.
    
    ---
    
    ### **🔹 actors**
    
    Represents groups of actors using the innovation.
    
    | actor_type_id | name |
    | --- | --- |
    | 1 | Farmers/ (agro)pastoralist/ herders/ fishers |
    | 2 | Researchers |
    | 3 | Extension agents |
    | 4 | Policy actors (public or private) |
    | 5 | Other |
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **result_actors_id** | string or integer | ❌ | Internal identifier for the actor record (if available). | 105 |
    | **actor_type_id** | string or integer | ⚙️ Optional (if **actor_type_name** is provided) | Coded type of actor, from the table above. **Preferred over the name.** | 5 |
    | **actor_type_name** | string | ⚙️ Optional (if **actor_type_id** is provided) ⚠️ | Descriptive label of the actor type, matched against the table above. Case-insensitive and tolerant of spacing around the slashes. An unresolvable name is rejected. | "Researchers" |
    | **other_actor_type** | string or null | Conditional | Required when `actor_type_id` = 5. Describes the specific actor type when "Other" is selected. | "Youth farmer groups" |
    | **sex_and_age_disaggregation** | boolean or null | ❌ | ⚠️ **Reads as "does not apply".** `false` (or omitted) → report `women` / `men` with their youth. `true` → the disaggregation is **not** available for this group, so report `how_many` only. | false |
    | **how_many** | string, integer or null | Conditional | Total number of actors in this group. Required when `sex_and_age_disaggregation` = `true`. | 120 |
    | **women** | string, integer or null | ❌ | Number of women in this actor group. | 60 |
    | **women_youth** | string, integer or null | ❌ | Number of women in this group who are youth. **Counted within `women`**, so it can never exceed it. | 25 |
    | **men** | string, integer or null | ❌ | Number of men in this actor group. | 40 |
    | **men_youth** | string, integer or null | ❌ | Number of men in this group who are youth. **Counted within `men`**, so it can never exceed it. | 15 |
    | **previousWomen** | string, integer or null | ❌ | Historical value of women in previous reporting (if applicable). | 50 |
    
    **How youth is reported**
    
    Youth is a subset of each sex, not a separate group:
    
    ```json
    {
      "actor_type_id": 1,
      "sex_and_age_disaggregation": false,
      "women": 400, "women_youth": 100,
      "men": 450,   "men_youth": 50
    }
    ```
    
    PRMS derives non-youth as the difference and does not store it. **There is no total-youth field** — a youth figure that is not split by sex has nowhere to go.
    
    > ✅
    > 
    > 
    > **Validation rules (schema):**
    > 
    - At least **one** must be provided: `actor_type_id` **or** `actor_type_name`.
    - If `sex_and_age_disaggregation` **is present and** = `true` → `how_many` is **required**.
    - If `actor_type_id` **is present and** is `"5"` or `5` → `other_actor_type` is **required**.
    - `women_youth` ≤ `women`, and `men_youth` ≤ `men`. ⚠️ *new 2026-08*
    
    > ⚠️ **Changed 2026-08.** Three things behaved differently before, all now fixed:
    > 
    > - An actor sent with `actor_type_name` and no `actor_type_id` was **silently dropped** — stored with no type, and the request still returned `200` with "All results processed successfully". If you send names, verify the actors you expect came back.
    > - Youth was never checked against its sex total: `women: 10, women_youth: 999` was stored as sent, and the derived non-youth clamped to 0.
    > - The last two conditional rules fired when the field was **absent**, not just when it held the triggering value. Omitting `sex_and_age_disaggregation` demanded `how_many`, and identifying an actor by name demanded `other_actor_type`. Both now require the field to be present.
    
    ---
    
    ### **🔹 measures**
    
    What the innovation use is counted in. **At least one entry must carry both halves** — a unit and a quantity. A measure with only one of the two counts for nothing.
    
    Required even when `innov_use_to_be_determined` is `true`: *what* is being counted is known long before *how many*.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **unit_of_measure** | string | ✅ | Unit the quantity is expressed in. Must not be blank or whitespace. | "# of Innovations" |
    | **quantity** | string or number | ✅ | How much of that unit. | 2 |
    
    ```json
    "measures": [
      { "unit_of_measure": "# of Innovations", "quantity": 2 },
      { "unit_of_measure": "Hectares", "quantity": 1500.5 }
    ]
    ```
    
    > ✅
    > 
    > 
    > **Validation rules (schema):**
    > 
    - The array must hold **at least one complete measure**: a non-blank `unit_of_measure` **and** a numeric `quantity`.
    - `quantity: 0` is **valid** — "we measured, and the answer is none". Blank or absent is not.
    - Extra incomplete entries alongside a complete one are tolerated, but they are not what satisfies the rule.
    
    > ⚠️ **New 2026-09.** `measures` was optional and unchecked. Two changes:
    > 
    > - The array is now **required**, with at least one complete entry.
    > - **Fixed:** a whole-number quantity used to be rejected. `quantity: 2` failed with `must match exactly one schema in oneOf`, while `1500.5` and `"2"` passed. If you had worked around this by sending quantities as strings, you can stop.
    
    ---
    
    ### **🧩 Data usage example**
    
    ```json
    "innovation_use": {
      "innovation_use_level": { "level": 2, "name": "Scaling" },
      "current_innovation_use_numbers": {
        "innov_use_to_be_determined": false,
        "actors": [
          {
            "actor_type_id": 1,
            "sex_and_age_disaggregation": false,
            "how_many": 120,
            "women": 60,
            "women_youth": 25,
            "men": 40,
            "men_youth": 15
          },
          {
            "actor_type_id": 5,
            "other_actor_type": "Local agribusinesses",
            "sex_and_age_disaggregation": true,
            "how_many": 10
          }
        ],
        "measures": [
          { "unit_of_measure": "Hectares", "quantity": 2500 },
          { "unit_of_measure": "Households", "quantity": 800 }
        ]
      }
    }
    ```
    

---

- 📃 **Policy Change (policy_change.json)**
    
    ### **🔹 policy_change**
    
    Describes the attributes of a **Policy Change** result.
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **policy_type** | object | ✅ | Type of policy change and (for some cases) the amount and status. | { "id": 1, "name": "Budget or investment", "status_amount": { "id": 2, "name": "Increased" }, "amount": 500000 } |
    | **policy_stage** | object | ✅ | Stage of the policy in the policy cycle. | { "id": 3, "name": "Implemented" } |
    | **implementing_organization** | array[object] | ✅ (min 1) | List of organizations/institutions implementing the policy change. | [ { "institutions_id": 1279 }, { "institutions_acronym": "ICARDA" } ] |
    
    > ✅
    > 
    > 
    > **Validation:**
    > 
    
    > policy_change is an object required in the payload when type = "policy_change".
    > 
    
    ---
    
    ### **🔹 policy_type**
    
    Defines the **type of policy change** and, when applicable, the **amount** and its **status**.
    
    - **CLARISA Policy Types:** [https://api.clarisa.cgiar.org/api/policy-types](https://api.clarisa.cgiar.org/api/policy-types)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **id** | integer | ⚙️ Optional (if **name** is provided) ⚠️ | Identifier of the policy type. | 1 |
    | **name** | string | ⚙️ Optional (if **id** is provided) ⚠️ | Descriptive name of the policy type. | "Budget or investment" |
    | **status_amount** | object | Conditional | Required **only if** id = 1. Describes the status of the budget/investment amount. | { "id": 2, "name": "Increased" } |
    | **amount** | integer | Conditional | Required **only if** id = 1. Numeric amount associated with the policy change (e.g., budget allocation). | 500000 |
    
    > **⚠️ Important validation rules (according to the schema):**
    > 
    - At least one of these conditions must be met:
        - policy_type.id is present, **or**
        - policy_type.name is present.
    - If policy_type.id = 1 ⇒ **status_amount and amount are mandatory**.
    - If policy_type.id ≠ 1 ⇒ **status_amount and amount fields are NOT allowed** (they must not be included in the payload).
    
    ---
    
    ### **🔹 status_amount**
    
    Status of the amount associated with the policy change (only applies to policy_type.id = 1).
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **id** | integer | ⚙️ Optional (if **name** is provided) ⚠️ | Identifier of the amount status. | 2 |
    | **name** | string | ⚙️ Optional (if **id** is provided) ⚠️ | Descriptive label of the amount status. | "Increased" |
    
    > **🔎 As with other objects: you must provide**
    > 
    > 
    > **id**
    > 
    > **name**
    > 
    
    ---
    
    ### **🔹 policy_stage**
    
    Defines the **stage of the policy** in the policy cycle.
    
    - **CLARISA Policy Stages:** [https://api.clarisa.cgiar.org/api/policy-stages](https://api.clarisa.cgiar.org/api/policy-stages)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **id** | integer | ⚙️ Optional (if **name** is provided) ⚠️ | Identifier of the policy stage. | 3 |
    | **name** | string | ⚙️ Optional (if **id** is provided) ⚠️ | Descriptive label of the policy stage. | "Implemented" |
    
    > ✅ At least one of the two: id or name.
    > 
    
    ---
    
    ## **🔹 implementing_organization**
    
    Organizations/institutions that are **implementing** the policy change.
    
    **Array:**
    
    - Type: array[object]
    - **Required:** ✅
    - **minItems:** 1 (al menos una organización)
    - **CLARISA Institutions:** [https://api.clarisa.cgiar.org/api/institutions](https://api.clarisa.cgiar.org/api/institutions)
    
    | **Field** | **Type** | **Required** | **Description** | **Example** |
    | --- | --- | --- | --- | --- |
    | **institutions_id** | integer | ⚙️ Optional ⚠️ | Numeric identifier of the institution (CLARISA ID). | 1279 |
    | **institutions_acronym** | string | ⚙️ Optional ⚠️ | Acronym of the institution. | "ICARDA" |
    | **institutions_name** | string | ⚙️ Optional ⚠️ | Full name of the institution. | "International Center for Agricultural Research in the Dry Areas" |
    
    > **⚠️ Validation rules per item:**
    > 
    - Each organization must have **at least one** of these fields:
        - institutions_id
        - institutions_acronym
        - institutions_name
    - No additional properties other than these three are allowed.
    
    ---
    
    ### **🧩 Data usage example**
    
    ```json
    "policy_change": {
      "policy_type": {
        "id": 1,
        "name": "Budget or investment",
        "status_amount": {
          "id": 2,
          "name": "Increased"
        },
        "amount": 500000
      },
      "policy_stage": {
        "id": 3,
        "name": "Implemented"
      },
      "implementing_organization": [
        {
          "institutions_id": 1279,
          "institutions_acronym": "ICARDA",
          "institutions_name": "International Center for Agricultural Research in the Dry Areas"
        },
        {
          "institutions_acronym": "MoA-Uganda"
        }
      ]
    }
    ```
    

---

## **⚙️ Conditional Validations**

| **Condition** | **Validation Rule** |
| --- | --- |
| geo_focus.scope_code = 1 (Global) | Must NOT include regions, countries, or admin1. |
| geo_focus.scope_code = 2 (Regional) | Must include regions. |
| geo_focus.scope_code = 3 (Multi-national) | Must include at least **2 countries**. |
| geo_focus.scope_code = 4 (National) | Must include at least **1 country**. |
| geo_focus.scope_code = 5 (Sub-national) | Must include at least **1 country** and **1 admin1 region**. |

---

## 📤 Complete Valid Example

The two fields added in 2026-08 are shown first: `external_reference` (yours, optional but
needed for webhooks) and `lead_contact_person` (mandatory for every result type).

```json
{
  "tenant": "prms.result-management.api",
  "op": "dataset.ingest.requested",
  "results": [
    {
      "type": "knowledge_product",
      "data": {
        "external_reference": "9d1d9aac-45b5-47cf-99d9-d78b8d6d0997" || "2342" || "STAR-9f2c-4471",
        "keep_editing": false,
        "created_date": "2025-10-24T19:36:04Z",
        "created_by": {
          "name": "Sara Jani",
          "email": "s.jani@cgiar.org"
        },
        "lead_contact_person": {
          "name": "Jane Doe",
          "email": "jane.doe@cgiar.org"
        },
        "lead_center": {
          "institution_id": 1279,
          "acronym": "ICARDA"
        },
        "toc_mapping": {
          "science_program_id": "SP01",
          "aow_compose_code": "SP01-AOW05",
          "result_title": "HLO20.AOW5.IO3 Assess performance",
          "result_indicator_description": "Availability of MELIA Report on AoWs (performance data)",
          "result_indicator_type_name": "Number of knowledge products"
        },
        "contributing_bilateral_projects": [
          {
            "grant_title": "D-200358-Enhancing Food Security and Climate Resilience in Morocco and Tunisia"
          }
        ],
        "knowledge_product": {
          "handle": "<https://hdl.handle.net/20.500.1176/70001>"
        }
      }
    }
  ]
}
```

---

## **🧾 Response Examples**

### **✅ Successful Request**

When the payload passes validation and events are successfully published to EventBridge:

```json
{
  "ok": true,
  "message": "All results processed successfully",
  "processed": 1,
  "successful": 1,
  "failed": 0,
  "rejectedCount": 0,
  "rejected": [],
  "results": [
    {...Metadata}
}
```

**Explanation:**

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| **ok** | boolean | **Indicates if the request was processed successfully.** |
| **status** | string | **Always "accepted" when all events are validated and published.** |
| **acceptedCount** | number | **Number of accepted results.** |
| **rejectedCount** | number | **Number of rejected results due to validation errors.** |
| **failedCount** | number | **Number of results that failed for technical reasons (EventBridge, etc.).** |
| **eventIds** | array[string] | **EventBridge identifiers for successfully published events.** |
| **rejected** | array[object] | **Empty array when all results are accepted.** |
| **failed** | array[object] | **Empty array when no events failed.** |
| **requestId** | string | **AWS request trace ID for correlation and debugging.** |

---

### **❌ Validation Failure Normal API**

If one or more results fail schema validation, the API will return a structured error message detailing which properties are missing or invalid.

```json
{
  "ok": false,
  "error": "validation_failed",
  "message": "Every result was rejected. See 'rejected'.",
  "acceptedCount": 0,
  "rejectedCount": 1,
  "rejected": [
    {
      "index": 0,
      "type": "knowledge_product",
      "errors": [
        "(root) must have required property 'submitted_by'"
      ]
    }
  ],
  "requestId": "Root=1-68e94068-747a2a3177dc4a6313b35cd6"
}
```

**Explanation:**

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| **ok** | boolean | **Indicates the request failed validation.** |
| **error** | string | **Error type identifier (validation_failed).** |
| **message** | string | **Describes the general reason for rejection.** |
| **acceptedCount** | number | **Always 0 if no results passed validation.** |
| **rejectedCount** | number | **Number of rejected results.** |
| **rejected** | array[object] | **Detailed list of rejected entries, including index, type, and validation errors.** |
| **requestId** | string | **AWS request trace ID for correlation.** |

---

### 📦 Bulk Ingest Response

The **Bulk Ingest API** processes results asynchronously. When a request is successfully authenticated and accepted, the API returns a `202 Accepted` response with a `job_id` and the location of the job summary.

The `job_id` can be used to track the processing outcome and reconcile the submitted results.

✅ Job Accepted — `202`

```
{
  "job_id":"415d86bf-d2a3-4955-8cc0-1037051f31de",
  "summary_location": {
    "bucket":"my-bulk-pipeline",
    "key":"summaries/415d86bf-d2a3-4955-8cc0-1037051f31de/summary.json"
  },
  "summary_url":"https://my-bulk-pipeline.s3.us-east-1.amazonaws.com/summaries/415d86bf-d2a3-4955-8cc0-1037051f31de/summary.json"
}
```

> ℹ️ A `202` response means that the job was **accepted for asynchronous processing**. It does not mean that every result was successfully ingested.
> 

#### 🔐 Authentication Errors

The `x-api-key` is validated against **CLARISA before the bulk job is created**.

| HTTP | Meaning |
| --- | --- |
| `401` | The `x-api-key` header is missing, or the API key is invalid. The job is not created. |
| `503` | CLARISA could not be reached, or the API key could not be validated due to a temporary authentication service issue. The job is not created, and the request may be retried. |

Rejected authentication requests do **not** generate a `job_id` or start the Bulk Ingest pipeline.

📊 Job Summary

Once processing starts, the job status and processing counters are available in `summary.json`.

The summary includes the number of successfully processed and failed results and provides locations for the detailed reconciliation files.

The job can have the following statuses:

- `running` — processing is still in progress.
- `succeeded` — all results were processed successfully.
- `partial_failed` — processing completed, but one or more results failed.

For completed jobs, the summary provides access to:

- `success-details.json` — details of successfully processed results.
- `failure-details.json` — details of results that could not be processed.

### Full Example per Indicators with MDS

[cap-sharing.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/cap-sharing.json)

[inno_dev.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/inno_dev.json)

[kp.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/kp.json)

[other_outcome.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/other_outcome.json)

[other_output.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/other_output.json)

[policy.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/policy.json)

[inno_use.json](PRMS%20Normalizer%20%E2%80%93%20Technical%20Field%20Documentation/inno_use.json)