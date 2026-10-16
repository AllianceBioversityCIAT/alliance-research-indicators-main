# T-01 discovery log — iterations that preceded the decisive calls

> This file exists because the payloads that finally answered the four OQs were not the
> first ones sent. Each early attempt used the shape `homologation.md` and `design.md`
> describe from reading code, and each was rejected for a reason **neither document states**.
> Recording the iteration is itself evidence: the written contract is incomplete on
> envelope structure, independent of the open questions it was written to close.
>
> All calls below are `POST /ingest` against the TEST host
> `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com`, header `x-api-key: <ARI_CLARISA_API_KEY>`
> (value read from `server/researchindicators/.env` at call time via a shell variable, never
> written to a file or printed — see the T-01 report's credential-hygiene section).
> `external_reference` on every row is one of `ARI-SPIKE-20260914-0{1..5}`, clearly
> identifiable as synthetic probe traffic.

## Finding D-A — `toc_mapping` is unconditionally required at the root of `data`

First call (`capacity_sharing`, otherwise complete per the homologation's field list) came back
`422`:

```
"errors":["(root) must have required property 'toc_mapping'. Missing required property: toc_mapping",
"/geo_focus/scope_label must be equal to one of the allowed values. Allowed values: [\"Global\",\"Regional\",\"Multi-national\",\"National\",\"Sub-national\",\"This is yet to be determined\"]",
"(root) must have required property 'capacity_sharing'. Missing required property: capacity_sharing"]
```
`requestId: Root=1-6aa851eb-4ec93ae925475b33182f3ccf`

`homologation.md` §4.1 documents `toc_mapping.science_program_id` as a required *field*, but
neither it nor `design.md` states that the **enclosing `toc_mapping` object** is itself a
required root property on every row, independent of whether a ToC alignment exists. Adding
`"toc_mapping": {"science_program_id": "SP01"}` cleared this error on every later call — but
**whether `SP01` is a real, valid science-program code was luck, not something this spike
proves**: it happened to resolve to an active initiative ("Breeding for Tomorrow", `official_code
SP01`) in the ACCEPTED call 04 response. A different guess could have failed just as easily; this
finding is about the object being **required**, not about the value being validated for meaning.

## Finding D-B — type-specific fields must nest under a same-named sub-object, not sit flat in `data`

The same `422` shows `"(root) must have required property 'capacity_sharing'."` — even though
every `capacity_sharing`-type field from `homologation.md` §7 (`number_people_trained`,
`length_training`, `delivery_method`) was present flat inside `data`, exactly as the doc's field
table lists them (no parent key shown). The real contract nests them:

```json
"data": { "...common fields...": "...", "capacity_sharing": { "number_people_trained": {...}, "length_training": "...", "delivery_method": "..." } }
```

Confirmed identically for `innovation_development` (nests under `"innovation_development"`) and
`policy_change` (nests under `"policy_change"`) in the calls below. **Neither `homologation.md`
nor `design.md` documents this nesting** — both list type-specific fields as if they were flat
members of `data`, which is what made the first four hand-written payloads wrong in the same way.

## Finding D-C — `geo_focus.scope_label` for scope 50 is a specific enum string, not a free label

The `422` above also names the allowed `scope_label` values directly:
`["Global","Regional","Multi-national","National","Sub-national","This is yet to be determined"]`.
The hand-written guess `"To be determined"` is not in that list; the correct string is
**`"This is yet to be determined"`**. This is the schema-level half of OQ-5 — see the main
report for the full (schema + persisted) answer.

## Finding D-D — a non-401/422/207 failure mode exists: `502`/`503` from a downstream hop, unrelated to our payload

Retrying the corrected `capacity_sharing` payload (same body, same `external_reference`) twice in
immediate succession produced, in order: `207` wrapping an `HTTP 502: Proxy Error` from an
upstream/external server, then `207` wrapping an `HTTP 503: Service Unavailable` — both under
`results[0].error`, both carrying the **same** `resultId`
(`prms.result-management.api:capacity_sharing:dataset.ingest.requested:auto-407979a4e9bffdcd`)
despite different `requestId`/`correlationId` values per attempt. Neither `design.md` §5.3 nor
`requirements.md`'s outcome vocabulary lists 502/503 as a *downstream* failure mode distinct from
the Normalizer's own `503` (CLARISA-unreachable-to-validate-the-key) — this is evidently the
Normalizer forwarding to **its own** downstream (`/api/bilateral/create`, confirmed by the `path`
field seen once we got past this), and that hop was transiently unavailable. A third attempt (new
title, see call 01 in the main report) succeeded. **Recorded as an accepted-risk gap, not one of
the four OQs**: `sync-engine`'s response interpreter must treat a non-2xx/401/422/503(-from-us)
response as `RETRYABLE`, not assume the vocabulary in `design.md` §5.3 is exhaustive.

## Finding D-E — a duplicate **title** is rejected by the downstream system as a business rule

Retrying `innovation_development` (fixed for D-A/D-B, `innovation_typology.code` also fixed to
avoid a `must be integer` schema error, see below) with the **same title** as an earlier failed
attempt returned:

```
"HTTP 400: Bad Request - {\"response\":{\"message\":\"A result with the title \\\"ARI SPIKE 02 - synthetic innovation development result (do not process)\\\" already exists.\" ...
```

This is surprising because the earlier attempt using that exact title had itself failed (on an
unrelated `innovation_typology` validation error) and was never reported as `success: true`. Two
readings are both consistent with the evidence and neither is ruled out by anything available in
this environment: (a) the downstream system persists a partial/draft record before the typology
check runs, so a "failed" ingest can still leave a row behind; or (b) an internal retry inside the
Normalizer succeeded once and the failure we saw was a *different* attempt's error folded into the
same response. **This is a new, undocumented behavior worth flagging to the Leader** (title
uniqueness as a hidden business rule, and a possible mismatch between the reported `success` flag
and what was actually persisted) — it is adjacent to but distinct from the four OQs this task
closes, and outside this task's authority to resolve in `design.md`/`requirements.md`.

## Finding D-F — `innovation_typology` is validated against a real catalog neither ARI nor this spike has access to

`{"code": "TECH", ...}` → schema `422`: `"/innovation_development/innovation_typology/code must be integer"`.
`{"code": 1, ...}` → downstream `400`: `"Unsupported innovation typology code \"1\"."`
`{"name": "Technology"}` → downstream `400`: `"Unsupported innovation typology name \"Technology\"."`

None of these guesses were correct, and neither STAR's Dev/TEST database (unreachable this
session) nor the repo holds the CLARISA innovation-typology catalog values PRMS TEST accepts.
This blocked `innovation_development` from ever reaching a full `ACCEPTED` (`200`) response in
this spike — **not itself one of the four OQs**, so no further guessing was spent on it once its
irrelevance to OQ-2 was clear (see the main report's OQ-2 answer for why the schema-level
evidence gathered around this blocker is still sufficient to answer OQ-2).
