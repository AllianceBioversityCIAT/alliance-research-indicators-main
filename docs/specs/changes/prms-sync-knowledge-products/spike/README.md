# Spike — `knowledge_product` contract against the PRMS Normalizer TEST API

**Date:** 2026-09-16 · **Host:** `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/ingest` (TEST)
**Auth:** CLARISA API key in `x-api-key`, read from `app_config.ARI_CLARISA_API_KEY`. The value appears
in no file here — verified, 0 literal occurrences across these artifacts.

## Why this spike exists

`bilateral/prms-sync/sync-engine` dropped Knowledge Product by **D-4**, on two grounds: STAR has no
`handle` column, and *"KPs are not STAR's to create"*. The scope is now being reopened. The first
ground is resolved (see below); the second is a product ruling the owner has reversed.

`homologation.md:285` named the exact thing to settle first:

> *"the TIP importer still writes the DOI into `result_evidences.evidence_url`
> (`tip-integration.service.ts:347`). If KP sync is ever revived, that ambiguity is the first thing
> to settle."*

**Settled.** The importer writes **two** rows per KP, discriminated by `evidence_description`
(`tip-integration.service.ts:341-352`):

```ts
evidence: [
  { evidence_url: result.link, evidence_description: 'Handled' },  // the handle
  { evidence_url: result.doi,  evidence_description: 'DOI' },
]
```

The handle is `evidence_url WHERE evidence_description = 'Handled'`. Note `'Handled'` is almost
certainly a typo for `'Handle'`; it is nonetheless the literal discriminator and must be matched
exactly. **It is free text a user can edit** (`evidence-item.component.html:59`, bound with
`[(ngModel)]`), so it is a convention, not an enforced invariant.

## What the contract requires — CONFIRMED

`knowledge_product` has exactly **one** required field (field documentation §Knowledge Product):

| Field | Type | Required | Description |
|---|---|---|---|
| `handle` | string | ✅ | Handle **or DOI** identifier |

The documented example payload carries **no `title`, no `description`, no `geo_focus`** — PRMS
resolves the metadata from the repository via the handle. **Every call below passed schema
validation**, which confirms the minimal shape is correct: all four failures are *business rules*,
reached only after the payload was accepted as well-formed.

PRMS keys the result on the handle, echoed in its own `resultId`:

```
prms.result-management.api:knowledge_product:dataset.ingest.requested:https://hdl.handle.net/10568/181939
```

## Four business rules discovered — none of them documented

All four returned **HTTP 207 with a failed row**, i.e. the existing T-12 response interpreter handles
them unchanged.

| # | Handle | PRMS message (verbatim) | requestId |
|---|---|---|---|
| 1 | `10568/181939` | "This knowledge product has already been reported in the PRMS Reporting Tool." | `Root=1-6aaa9f92-64d5435d48ac9a3665140c4f` |
| 2 | `20.500.1176/70001` | "Please add a valid handle (received: 20.500.1176/70001). Only handles from a supported repository can be reported." | `Root=1-6aaa9fb4-13823c6431c7181574a177a8` |
| 3 | `10568/999999999` | "Reporting knowledge products from years outside the current reporting cycle (2026) is not possible." | `Root=1-6aaa9fb6-3de002b43b9044510ee250cb` |
| 4 | `10568/113505` | "Only journal articles published in 2026 are eligible for this reporting cycle… for journal articles, the reporting system automatically verifies the 'Date Issued' field in the repository when the 'Date Online' is not present." | `Root=1-6aaaa4b6-5eeb87e3059268a4465bd497` |

So PRMS **dedupes by handle**, **validates the repository**, **enforces the reporting cycle year**,
and applies **type-specific date rules** resolved from the repository record.

### Documentation defect worth reporting to the PRMS team

Case 2 is the handle printed in PRMS's **own** field documentation as the `knowledge_product`
example. Their API rejects it. Their doc teaches an invalid value.

## Design consequence — the division of responsibility

| Check | Owner | Why |
|---|---|---|
| Result has a `Handled` evidence row | **STAR**, before sending | It is STAR's own data; absence is knowable locally. A new gate entry, refused with a stated reason, never synced with a guessed value (**P-1**) |
| Already reported · supported repository · cycle year · date rules | **PRMS only** | All are PRMS-side state STAR cannot see. STAR must send and surface PRMS's message verbatim — which the existing design already does |

This makes the change **smaller than it looked**: one single-field builder, one gate entry, and the
removal of KP from the exclusions. No new response handling.

## NOT PROVEN — declared, not discovered later (KZ-017)

**No ACCEPTED was obtained for `knowledge_product`.** Four handles were tried; each hit a different
business rule. Closing this needs a handle that is simultaneously from a supported repository,
published within the 2026 cycle, and not already reported in PRMS — a *data availability* question,
not a contract one.

Residual risk is **low but real**: the envelope and success shape are already proven by T-01's three
ACCEPTED calls on other types, and the KP-specific part is a single field PRMS demonstrably parses
(it echoes the handle in `resultId` and validates it against the repository). What is unproven is
only the final success path end to end.

---

## Call 5 — a REAL STAR KP, and the finding that matters most

`results.result_id = 8741` / `result_official_code = 10855`, `indicator_id = 3`, imported from TIP,
`is_synced_to_prms = 0`. Its evidence rows are exactly the pair the importer writes:

| `result_evidence_id` | `evidence_description` | `evidence_url` |
|---|---|---|
| 13135 | `Handled` | `https://hdl.handle.net/10568/148990` |
| 13136 | `DOI` | `https://doi.org/10.1007/s10668-024-05173-5` |

**The extraction rule is confirmed against production-shaped data**, not just against the importer's
source.

Ingesting that handle returned **HTTP 207, failed row**, rule 4 again
(`requestId Root=1-6aaaa77b-4149871a11a4f51718edb66c`).

### STAR and PRMS read DIFFERENT dates from the SAME CGSpace record

| Source | Field | Value |
|---|---|---|
| STAR `result_knowledge_products.publication_date` | — | **202602** (Feb 2026) |
| STAR citation | — | *"… 2026. Using best-worst scaling …"* |
| CGSpace `dcterms.issued` ("Date Issued") | — | **2026-02** |
| CGSpace `dcterms.available` ("Date Online") | — | **2024-06-28** |
| CGSpace `dc.date.available` | — | **2024-07-09** |

PRMS's own message states the rule: *"for journal articles, the reporting system automatically
verifies the 'Date Issued' field in the repository **when the 'Date Online' is not present**."*
Here Date Online **is** present (2024), so PRMS resolves the year to **2024** and refuses. STAR/TIP
takes `dcterms.issued` and resolves **2026**.

**Neither side is reading incorrectly — they are reading different fields.** The consequence is
concrete and user-facing:

> A Knowledge Product that STAR legitimately presents as a 2026 result can be permanently ineligible
> in PRMS, and the user is shown *"Only journal articles published in 2026 are eligible"* on a result
> STAR displays as 2026. No STAR-side logic can reconcile this; `publication_date` is not the field
> PRMS decides on.

### What this means for the change

- The **build** stays small: one single-field builder, one gate entry (`Handled` row present), and
  removing KP from the exclusions.
- The **value** of the feature depends on a question only the PRMS team can answer: *is the Date
  Online preference intended?* If most TIP-imported KPs carry a CGSpace `available` date from an
  earlier year — which is normal for journal articles published online ahead of issue — then a large
  share of STAR's KPs are ineligible by construction.
- **Raise this with PRMS before building**, alongside the documentation defect (their own example
  handle is rejected by their own API). Both were found by this spike, neither is in any document.

### Second-order note for the gate

`result_status_id = 20` on result 8741 — **not 6 (Approved)**. Whatever the KP scope becomes, the
existing gate entry 3 still applies: a KP must be Approved before it can be sent. Worth confirming
that KP results in STAR do reach status 6 in practice, or the feature is unreachable for a different
reason than the date rule.
