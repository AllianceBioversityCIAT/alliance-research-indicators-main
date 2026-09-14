# T-01 — SPIKE: contract validated against the TEST Normalizer

- **Host:** `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com`, `POST /ingest`.
- **Auth:** header `x-api-key: <ARI_CLARISA_API_KEY>`. **Substitution recorded, per the Leader's
  brief:** both the shared Dev and scratch TEST MySQL databases were unreachable this session
  (`ETIMEDOUT` / `ECONNREFUSED`, Docker off), so the key could not be read via
  `AppConfigService.getEnv(AppConfigKey.ARI_CLARISA_API_KEY).simple_value` as `tasks.md` assumes.
  The value was instead read from `server/researchindicators/.env` (`ARI_CLARISA_API_KEY`, 47
  chars, plain alphanumeric — confirmed by format check, never printed) directly into a shell
  variable inside a throwaway script, and never written to any file, any request record, or this
  report. **What this substitution can and cannot show:** every call below got past the API-key
  gate (no `401` was seen on any of the 12 calls made this session) — that is unambiguous
  confirmation that **this specific `.env` value is valid for the Normalizer**, which is a
  strictly narrower claim than assumption A-1 ("the `app_config` row is valid for the
  Normalizer"). The two values were not compared to each other in this session (no DB access), so
  a reader should take this spike as confirming A-1 **for the `.env` value only** — re-confirm
  once DB access is restored, per KZ-017.
- **Traffic hygiene:** every row used `external_reference` in `ARI-SPIKE-20260914-0{1..5}`, never
  a real `result_official_code`, and every `title`/`description` states it is synthetic
  spike/probe data not to be processed.
- **Total calls:** 12 against the TEST endpoint (7 discovery iterations, logged in
  [`discovery-log.md`](./discovery-log.md); 5 decisive calls, evidence below). The higher-than-planned
  count is itself a finding: `homologation.md` and `design.md` under-describe the envelope
  structure (see discovery log, findings D-A/D-B/D-C) — the hand-written payloads that matched
  the documented field tables were schema-rejected three different ways before any OQ could be
  probed at all.

---

## OQ-1 — `grant_title` composition — **ANSWERED (premise falsified)**

**Requirements.md's own framing of the risk (R-3) was: "an unresolvable title fails the row
inside a 207." This spike shows that premise is false.**

Three separate ACCEPTED (`200`, not even a `207` partial failure) calls were made with three
different `grant_title` values in `contributing_bilateral_projects[]`:

| Call | `grant_title` sent | Result |
|---|---|---|
| 04 (`policy_change`) | `"D-000000-ARI SPIKE Contract Title Test"` (plausible-format guess at the `<agreement_id>-<description>` composition) | `200`, `success: true` |
| 05 (`capacity_sharing`, **the failing input**) | `"THIS IS A DELIBERATELY INVALID ARI SPIKE GRANT TITLE THAT MATCHES NO CLARISA PROJECT"` — no code prefix, no resemblance to any real CLARISA project | `200`, `success: true` |
| 01 (`capacity_sharing`, scope-50 case) | `"D-000000-ARI SPIKE Contract Title Test"` (same guess as 04) | `200`, `success: true` |

**In all three, the persisted result's `bilateral_projects` array came back empty:**

From [`responses/04-policy-change.json`](./responses/04-policy-change.json) (`requestId
Root=1-6aa852c3-48a0354007f30b9b35e91024`), the top-level created object includes
`"bilateral_projects":[]` — despite `contributing_bilateral_projects` having been sent, echoed
unchanged in the request-mirror (`"data":{...,"contributing_bilateral_projects":[{"grant_title":
"D-000000-ARI SPIKE Contract Title Test","is_lead":true}],...}`), and the row still succeeding
(`"statusCode":201,"message":"Results Bilateral created successfully."`).

From [`responses/05-capacity-sharing-failing-grant-title.json`](./responses/05-capacity-sharing-failing-grant-title.json)
(`requestId Root=1-6aa852e8-42962254355b61c50e0b74df`), the deliberately-garbage title produced
the **identical** outcome: `200`, `"message":"All results processed successfully"`,
`"bilateral_projects":[]`.

**The one-line conclusion:** PRMS does **not** reject a row for an unresolvable `grant_title` —
neither the plausible-format guess nor the deliberately invalid string caused a rejection, a
`207` partial failure, or any error at all. Both cases silently produced a result with **no**
bilateral-project link. This falsifies OQ-1's implicit premise (that PRMS resolves and validates
`grant_title` against CLARISA `/api/projects` as a gate) and falsifies requirements.md R-3's
stated mitigation shape ("fails the row"). The correct mitigation shape is different: **STAR
cannot detect a silently-dropped bilateral-project link from the ingest response alone** — the
row reads as fully successful either way. Flagged for the Leader; not fixed here (out of this
task's authority).

**What this spike could not settle, honestly declared (KZ-017):** whether a *genuinely real,
CLARISA-verified* `grant_title` would populate `bilateral_projects` — this session had no DB
access to obtain one, and no example payload from PRMS's own documentation was available in the
repo (`homologation.md`'s Source Artifacts row already flags those payload examples as "currently
outside the repo"). What would settle it: one ACCEPTED call using a `grant_title` composed from a
real `agresso_contract.agreement_id` + `projectDescription` pair, read from a reachable Dev/TEST
database, checked against whether `bilateral_projects[]` is then populated.

---

## OQ-2 — `innovation_readiness_level`: `id`/`name` or `level`? — **ANSWERED at the schema layer; persistence layer STILL OPEN**

Three `innovation_development` calls were made varying the `innovation_readiness_level` shape:

| Call | Shape sent | Result |
|---|---|---|
| — (discovery, not kept as a decisive artifact — see discovery-log D-F) | `{"id": 3, "name": "Piloted"}` alone | Schema passed; got as far as a downstream title-uniqueness check (`400`, unrelated field) |
| 03 | `{"level": 3}` alone | Schema passed; downstream rejected on `innovation_typology`, not `innovation_readiness_level` |
| 02 | `{"id": 3, "name": "Piloted", "level": 3}` — **all three keys together**, to test whether the schema is a strict `oneOf` or a loose object | Schema passed; downstream rejected on `innovation_typology`, not `innovation_readiness_level` |

From [`responses/03-innovation-development-level-only.json`](./responses/03-innovation-development-level-only.json)
(`requestId Root=1-6aa852b9-3fe9d93047debe46758a3a33`):
```
"error":"HTTP 400: Bad Request - {\"response\":{\"message\":\"Unsupported innovation typology name \\\"Technology\\\".\",...
```

From [`responses/02-innovation-development-combined-readiness.json`](./responses/02-innovation-development-combined-readiness.json)
(`requestId Root=1-6aa8532c-5bc036d21bb27f3109931c8a`), sending `id`, `name`, **and** `level`
together produced the **same and only** error:
```
"error":"HTTP 400: Bad Request - {\"response\":{\"message\":\"Unsupported innovation typology name \\\"Technology\\\".\",...
```

**The one-line conclusion:** across three separate submissions — `id`/`name` alone, `level`
alone, and all three keys together — **`innovation_readiness_level` was never once named in a
validation error**, at either the JSON-schema layer or the one downstream check we could reach
(`/api/bilateral/create`). The schema is not a strict `oneOf` that rejects the "wrong" shape or
extra keys on this field (contrast `lead_contact_person`, which the doc states rejects additional
properties) — it tolerates `id`, `name`, and `level` simultaneously. **This settles the "will
either shape be rejected?" question: no.**

**What this spike could not settle, honestly declared (KZ-017):** which key the downstream system
actually **reads and stores** when more than one is present, because no `innovation_development`
call reached persistence — every one of the three was blocked earlier by an unrelated
`innovation_typology` catalog-validation failure (see discovery-log D-F), and this session had no
way to obtain a valid typology value (DB unreachable, no example payload in repo). **What would
settle it:** one ACCEPTED `innovation_development` call (needs a real `innovation_typology`
code/name from CLARISA) with `innovation_readiness_level` sent as `{"level": N}` only, then
inspecting the persisted `innovation_readiness_level` (or equivalent `_summary`) block in the
response — by direct analogy with how `policy_type`/`policy_stage` names were resolved to
internal ids in the ACCEPTED `policy_change` call (see OQ-6 below), the returned object should
show plainly which key drove it.

---

## OQ-5 — `geo_focus.scope_code = 50` behavior — **ANSWERED**

Call 01 (`capacity_sharing`) sent `"geo_focus": {"scope_code": 50, "scope_label": "This is yet to
be determined"}`, with **no** `regions[]`, `countries[]`, or `subnational_areas[]` (matching the
"to be determined" semantics — nothing to enumerate).

First attempt at scope 50 (discovery, see discovery-log D-C) used the guessed label `"To be
determined"` and was schema-rejected:
```
"/geo_focus/scope_label must be equal to one of the allowed values. Allowed values: [\"Global\",\"Regional\",\"Multi-national\",\"National\",\"Sub-national\",\"This is yet to be determined\"]"
```
This is itself part of the answer: **scope 50 has a specific, non-obvious required label spelling.**

With the corrected label, the same payload went all the way through to `200`/`success: true`. From
[`responses/01-capacity-sharing-scope50.json`](./responses/01-capacity-sharing-scope50.json)
(`requestId Root=1-6aa852fe-601bb8603e18414f743047c8`):
```
"geographic_scope_id":50, "obj_geographic_scope":{"id":50,"name":"This is yet to be determined","description":""}
```

**The one-line conclusion:** `scope_code = 50` is a fully accepted, real value — schema-valid with
the exact label `"This is yet to be determined"`, and persisted end-to-end with **no** companion
regions/countries/sub-nationals required or rejected. This settles OQ-5 and the ⚠️ flagged gap in
`homologation.md` §4.3 ("Behaviour unknown — spike it"). `homologation.md` is updated accordingly
(see below).

---

## OQ-6 — where the PRMS result code returns — **ANSWERED**

From the first fully ACCEPTED call (04, `policy_change`),
[`responses/04-policy-change.json`](./responses/04-policy-change.json)
(`requestId Root=1-6aa852c3-48a0354007f30b9b35e91024`):
```
"result":{ ..., "result_id":11665, "result_code":9197 },
"externalApiResponse":{"response":{"source":"API","id":"11665","result_code":"9197", ...
```

Corroborated by calls 05 (`result_code: 9198`) and 01 (`result_code: 9199`) — each ACCEPTED call
returned a distinct, incrementing `result_code` synchronously.

**The one-line conclusion:** the PRMS-assigned `prms_result_code` (called `result_code` in the
live response) **returns synchronously in the same `200`/`207` `POST /ingest` response body**, at
`results[].result.result_code` (and echoed again inside
`results[].externalApiResponse.response.result_code`) — **not** only via the decision webhook, and
not absent as family OQ-F7 worried. This closes OQ-6/OQ-F7: `sync-engine`'s response interpreter
can and must read `result_code` directly off the ingest response and persist it in the same
transaction that flips `is_synced_to_prms` (design.md §5.3 step 6), with no dependency on the
webhook child.

**Also observed, worth flagging (not one of the four OQs, so not further chased here):** the
`resultId` field (`prms.result-management.api:<type>:dataset.ingest.requested:auto-<hash>`) that
appears **before** a call succeeds (see discovery-log D-D, D-E) is **not** the PRMS result code —
it is the Normalizer's own deterministic idempotency key, present even on `502`/`503`/`400`
failures where no PRMS record was created. A response interpreter must not confuse the two.

---

## Failing-input result (deliberately wrong `grant_title`)

Call 05 used a `grant_title` with no code prefix and no resemblance to any real project title:
`"THIS IS A DELIBERATELY INVALID ARI SPIKE GRANT TITLE THAT MATCHES NO CLARISA PROJECT"`.

**Result: `200`, `success: true`, `bilateral_projects: []`** — identical shape to the "normal"
guessed-composition call. **PRMS accepted it.** Per the task's own instruction, this is recorded
as the finding it is, not read as a green: **OQ-1's premise — that PRMS resolves/validates
`grant_title` as a gate that can fail a row — is false.** See the full OQ-1 section above.

---

## `homologation.md` updates made

Nine sections were edited across three passes: three in the first pass because this spike
directly contradicts what they asserted or flagged as unknown (§4.3, §4.6, §10 response handling);
two more in a rework pass after review found §6 left with no edit at all — despite an earlier
draft of this report claiming one existed — and §11's open-question register still asserting the
opposite of what §4.3/§10 already said (§6, §11); two more in a second rework pass after the
Leader's own §6/§11 boundary was found to have hidden two further sites that still asserted the
spike as pending rather than run (§1, §1.2); and two more in a third, exhaustive all-row pass
after review found the first three passes' phrase-grepping could not reach a stale claim carrying
none of the grepped markers (§4.1, §10 Authentication & webhooks). Every edit quotes the response
text that forced it. See the diff in `homologation.md` §1, §1.2, §4.1, §4.3, §4.6, §6, §10
(response handling), §10 (Authentication & webhooks) and §11:

- **§1 Executive summary** — "what remains open is the TEST-env spike (§11)" is replaced with a
  one-sentence post-spike state: the spike ran 2026-09-14 and §11 now shows two items closed
  (OQ-F7, OQ-H9) and two open at the persistence/composition layer (OQ-H5, OQ-H6).
- **§1.2 `innovation_development` row** — "Only OQ-H6 (`readiness_level` shape) pending, and the
  spike settles it" is replaced: the spike settled the **schema** layer only (`id`+`name`+`level`
  together pass, none rejected); **which key persists is still open**, since no
  `innovation_development` call ever reached persistence (each was blocked earlier by an
  unrelated `innovation_typology` catalogue rejection). Points to §6.
- **§4.1 `toc_mapping` blockquote** — "or omitted in favour of `contributing_programs`" is
  replaced: `toc_mapping` is **unconditionally required at the root of `data`** (finding D-A) — a
  first call that left it out was rejected with `"(root) must have required property
  'toc_mapping'"`. For a "No" row it must still be built from `science_program_id` alone;
  `contributing_programs` is a separate, additional field, never a substitute.
- **§4.3 `geo_focus`** — the "Behaviour unknown — spike it" note on scope 50 is replaced with the
  confirmed behavior and the exact required `scope_label` string, quoting
  `responses/01-capacity-sharing-scope50.json`.
- **§4.6 `contributing_bilateral_projects[]` / `grant_title`** — the "prove it in the spike" note
  is replaced with the falsified-premise finding, quoting `responses/04-policy-change.json` and
  `responses/05-capacity-sharing-failing-grant-title.json`.
- **§10 response handling / `prms_result_code`** — the "still not located in the contract" note
  is replaced with the confirmed field path, quoting `responses/04-policy-change.json`.
- **§10 Authentication & webhooks / "Key scope"** — "Not yet obtained — this is now the
  critical-path blocker" (which contradicted its own neighbour row, and evidence already on
  disk) is replaced: a valid **TEST** key is in hand and confirmed by all 3 ACCEPTED calls
  resolving to `"external_platform_id": 34, "external_platform_code": "STAR"`, with zero `401`s
  across all 12 calls; **PRODUCTION remains unobtained** and is the residual blocker. Carries the
  A-1 limit (the spike proves the `.env` value works against the Normalizer, not that it equals
  the `app_config` row).
- **§6 `innovation_readiness_level`** — the "what is not knowable from the docs is which one the
  schema accepts — Spike it" note is replaced with what the spike actually showed: the **schema**
  layer is settled (`id`/`name`, `level`, or all three keys together — none rejected, quoting
  `responses/02-innovation-development-combined-readiness.json` and
  `responses/03-innovation-development-level-only.json`), while **which key persists** is still
  open, per OQ-2 above.
- **§11 open-question register** — closed **OQ-H9** and **OQ-F7** (using the file's own
  strike-through convention) to match the §4.3/§10 body edits above; amended **OQ-H6** to
  "partially answered — schema layer only, persistence open" to match the §6 edit; amended
  **OQ-H5** to carry the falsified premise from OQ-1 above while keeping the `grant_title`
  composition itself open; and replaced the stale "the spike is unblocked" line with a dated
  summary of what the spike actually closed.

---

## Credential grep

```
KEY=$(awk -F'=' '/^ARI_CLARISA_API_KEY=/{print $2; exit}' server/researchindicators/.env)
grep -rlF "$KEY" <every file written this session, scratch + docs/specs/.../spike/>
```
**Result: 0 hits**, across all 5 request payloads, all 12 response bodies (kept and discarded),
`discovery-log.md`, and this `README.md`. Confirmed before this report was finalized.
