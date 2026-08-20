# Proposal — Pool Funding Alignment SP Picker Renders Empty For Every Mapped Project

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bugfix/pool-funding-sp-picker-empty` |
| Proposal Path | `docs/specs/bugfix/pool-funding-sp-picker-empty/proposal.md` |
| Type | **Bug** |
| Slug | `pool-funding-sp-picker-empty` — derived from free-text argument ("hice el mapeo de los 198 … me aparece *The linked CLARISA project has no Science Programs defined*") |
| Approval Mode | `gated` |
| Depends on | none |
| Parallel-safe | yes |
| Related Kaizen | **KZ-001** (12th occurrence — a double that does not discriminate), **K-014** (a filtered view is not the output), **K-005**, **K-016** (5-min CLARISA TTL) |
| Related archived spec | `docs/specs/archive/2026-08-20-bilateral--clarisa-automapper-s2` (OQ-5), `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub` (M-11/M-12/M-14, D-4) |
| Urgency | User flagged **urgent** — blocks the whole bilateral pool-funding reporting flow |

---

## Intent

Make the Pool Funding Alignment **Science Program picker** show the Science Programs that the linked CLARISA project actually carries, for all 198 mapped bilateral projects — and make every empty-state message on that screen state the *true* reason it is empty.

---

## Problem / Current Behavior

After applying the automapper across the 198 eligible bilateral projects, the mapping is visibly working at project level: the contract carries the **"contributing to pool funding"** tag. But opening any of those results → **Pool funding alignment** → answering **Yes** produces an empty picker with one of two messages, neither of which is true:

| Message rendered | Screen state | Truth |
| --- | --- | --- |
| `The linked CLARISA project has no Science Programs defined.` | `mapping_status: mapped`, `science_programs: []` | The project **has** SPs — 283 SP rows across the 198 projects |
| `This result isn't linked to a CLARISA project yet. Contact the bilateral operations team to register the project mapping.` | `mapping_status: unmapped` | The mapping row **exists and is active** (`bilateral_project_mapping.id = 223` for `A1676`) |

Both messages send the user to the bilateral operations team for work that is already done. The user's own read is correct: *"cuando hicimos el filtro de los 198 todos tenían SPs"* — they do.

The two messages are two states of the same broken pipeline, selected by which CLARISA feed `ARI_CLARISA_HOST` happens to point at.

---

## Proposed Outcome

1. A result mapped to a CLARISA project that carries Science Programs renders those Science Programs in the picker — regardless of which CLARISA host the environment reads.
2. A mapping whose stored `clarisa_project_id` cannot be resolved in the current feed is reported as **stale mapping**, never as "not linked yet".
3. A project whose SPs were excluded by a status/portfolio filter says **why** they were excluded, never "no Science Programs defined".
4. The stub fixture exercises both the accepted and rejected status branches, so this class of failure can redden a test.

---

## Scope

**Server (`server/researchindicators`)**

- `domain/entities/bilateral/bilateral.service.ts` — `deriveSciencePrograms`, `deriveScienceProgramMetaByCode`, `isProjectScienceProgramMapping`, `getScienceProgramsForResult`, `getHlosIndicatorsForResult` (shares the same SP chain).
- `domain/tools/clarisa/projects/clarisa-projects.service.ts` — `hasSciencePrograms`, `findProjectById`.
- `domain/entities/bilateral-project-mapping/` — mapping identity (`automapper.service.ts` `newDerivedRow`, `bilateral-project-mapping.service.ts` `findActiveByAgreementId`, coverage counting), plus a migration if a resolution key column is added.
- `domain/tools/clarisa/stub/` — `tools/convert-export.ts` (`CONFIRMED_STATUS`), `fixtures/clarisa-projects.fixture.json`, `clarisa-stub.fidelity.spec.ts` (D-4).

**Client (`client/research-indicators`)**

- `pages/platform/pages/result/pages/pool-funding-alignment/pool-funding-alignment.component.{ts,html}` — the two empty-state messages and the `isUnmapped` / `hasNoSciencePrograms` discriminators.

**Admin (server SSR)**

- `admin/client/pages/BilateralProjectMappings.tsx` — the "Science Programs (Confirmed, P25)" panel and the coverage strip, which report the same filtered view.

---

## Non-Goals

- Changing the automapper's **matching** logic (external-code normalization, AGRESSO confirmation, ambiguity handling). It resolved 198/198 correctly — the join is not the defect.
- Changing the eligible-cohort predicates (`isBilateralFunding` / `isAllianceProject` / `matchesPhase`).
- Re-running or re-applying the 198 mappings as part of the fix (a data step, decided separately — see Open Questions).
- Any change to the ToC alignment blocks beyond what unblocking the SP list implies.
- Touching production CLARISA data or asking CLARISA to change project statuses.

---

## Affected Users, Systems, And Specs

| Affected | How |
| --- | --- |
| **Bilateral reporters (all users of the 198 mapped projects)** | Cannot select a Science Program ⇒ cannot complete Pool Funding Alignment ⇒ cannot reach the HLO/ToC section (`showHloSection` requires ≥1 selected SP) |
| **Bilateral operations team** | Receives support requests for mappings that already exist |
| **Admin coverage strip** | Dev reports `MAPPED 195 · PENDING 3 · REACHABLE 198` (98%) — **healthy**. The local stub stack reports `mapped: 2` (RC-B, local only) |
| **`docs/specs/archive/2026-08-20-bilateral--clarisa-automapper-s2`** | Its **OQ-5** is the unanswered question that this bug is the consequence of |
| **`docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub`** | Its **M-14** measurement and **D-4** fidelity assertion are the reason no test could redden |
| **`docs/trd/trd.md`** | The mapping-identity decision (RC-B) is an ADR-worthy change |

---

## Visual Reference

- Source: **User-provided screenshot** (Image #38, conversation attachment).
- Location: not persisted to the repo; reproduced verbatim in *Reproduction Steps* below, plus live API captures.
- Notes: screenshot shows `localhost:4200/result/STAR-3403/pool-funding-alignment`, section **Science Program Contribution**, `Yes` selected, message *"This result isn't linked to a CLARISA project yet…"*. This is a **backend data/logic bug with a copy consequence** — no new UI surface is being designed, so no mockup is needed.

---

## Bug Diagnosis

> Produced with `systematic-debugging`. Every figure below came from a command executed against the running local stack and the live CLARISA test host on **2026-08-20**; the commands are named per row so the evidence is re-runnable (K-013, KZ-008).

### Observed Symptom

Pool Funding Alignment → *"Does this result contribute to a Science Program or Accelerator?"* → **Yes** renders an empty picker with either `NO_SP_DEFINED_MESSAGE` or `UNMAPPED_SP_MESSAGE`, for results whose contract is mapped and whose CLARISA project carries Science Programs.

### Reproduction Steps

Environment: local Docker stack (`ari_server_local` :3000, `ari_client_local` :4200), Dev MySQL `192.168.20.210/alliancereportingdb`, `ARI_CLARISA_STUB_ENABLED=true`, `ARI_CLARISA_HOST=http://localhost:3000/api/clarisa-stub/`.

1. Apply the automapper over the eligible cohort (done — 199 active rows, 194 `DERIVED` + 5 `MANUAL`).
2. Open `http://localhost:4200/result/STAR-3403/pool-funding-alignment` (result 3403, contract `A1676`).
3. Select **Yes**.
4. **Expected:** picker offers SP02 and SP06. **Actual:** empty picker + *"This result isn't linked to a CLARISA project yet."*

Server-side, same state, no browser needed:

```
$ curl -s http://localhost:3000/api/v1/results/3403/pool-funding-alignment/science-programs
{"data":{"result_code":"3403","mapping_status":"unmapped",
         "clarisa_project":{"id":1403,"short_name":"B-A1676"},
         "science_programs":[]}, "status":200, …}

$ curl -s http://localhost:3000/api/bilateral-project-mappings/coverage
{"data":{"mapped":2,"pending":196,"reachable":198}, "status":200, …}
```

The endpoint returns `mapping_status: "unmapped"` while simultaneously returning the mapped project's snapshot — the contradiction is visible in a single payload.

### Root Cause (confirmed)

**Three causes. RC-A is the one the user reported; RC-B is the one in the screenshot; RC-C is why neither could fail a test.**

---

#### RC-A — The SP filter accepts only `status === 'Confirmed'`, and **0 of the 198** cohort projects have a Confirmed SP row

`bilateral.service.ts:490` (`isProjectScienceProgramMapping`):

```ts
if (!u?.smo_code || mapping.status !== 'Confirmed') return false;
```

Measured against the live CLARISA test feed (`GET https://clarisatest-back.ciat.cgiar.org/api/projects`, 1210 projects, 4.25 MB, captured 2026-08-20), restricting to `P25` + `SPxx` + non-`AOW` — i.e. the *same* predicate the picker applies, minus the status clause:

| Population | Result |
| --- | --- |
| The 198 cohort projects, found in the real feed by `external_code` | **198 / 198** |
| …carrying ≥1 SP mapping row | **198 / 198** (283 rows) |
| …with ≥1 row `status = Confirmed` → picker would show SPs | **0** |
| …whose rows are **all** `status = Pending` → picker shows "no SPs" | **198** |
| Status tally across the cohort's 283 SP rows | `{"Pending": 283}` |

The user's premise is exactly right — all 198 have Science Programs. Every one of those 283 SP rows is `Pending`, so the `Confirmed`-only clause discards all of them and `deriveSciencePrograms` returns `[]` ⇒ `mapping_status: 'mapped'`, `science_programs: []` ⇒ **`The linked CLARISA project has no Science Programs defined.`**

**This was a known, dismissed open question.** `archive/2026-08-20-bilateral--clarisa-automapper-s2/proposal.md:198` records:

> **OQ-5** — Is `Confirmed` the right science-program status filter — 5 test projects have mappings, **0** have a `Confirmed` one | **Ask PRMS.** Carried over unanswered from S1

and it was closed in `requirements.md:347` / `design.md:309` as **"No — does not affect the join."** That resolution is *correct for the automapper's join* and *wrong for the picker*: the question was answered only against the surface that did not depend on it, and the surface that does depend on it was never evaluated. The observation "0 of 5 have a Confirmed one" was the bug, recorded and shelved.

---

#### RC-B — `clarisa_project_id` is a **feed-scoped** identity with nothing pinning the feed

> **Corrected 2026-08-20, after the user supplied two Dev screenshots (KZ-007).** This section originally
> presented RC-B as the cause of the screenshot and as a live Dev outage. **It is neither.** The
> `197/198 dangling` and `mapped: 2 / 198` figures below were measured on the **local** stack, whose
> `.env` points at the CLARISA **stub**; the rows themselves were written against real CLARISA. On
> **Dev** — which reads real CLARISA — the same rows resolve and the admin strip reports
> **`MAPPED 195 · PENDING 3 · REACHABLE 198` (98%)**, with the mapping table showing real-feed ids
> (`C-S303 (id 1586)`). RC-B is therefore a **latent fragility, proven reproducible**, not the Dev
> blocker. **RC-A alone blocks Dev.** The measurement was right; its scope was overstated, and the
> superseded claim "RC-B — lo del screenshot" is withdrawn.

`bilateral.service.ts:192` calls `clarisaProjectsService.findProjectById(mapping.clarisa_project_id)`, which is a plain `find` over the cached feed (`clarisa-projects.service.ts:149-153`). On a miss the service takes its "project CLARISA no longer exposes" branch and returns `mapping_status: 'unmapped'`.

The 198 mappings were applied while `ARI_CLARISA_HOST` pointed at **real CLARISA test**; the env now points at the **stub**, and the two feeds number the same projects differently:

| | Real CLARISA test | Stub fixture |
| --- | --- | --- |
| `B-A1676` project id | **1403** | **92** |
| `B-A1676` `short_name` | `"B-A1676"` | `"UNITED KINGDOM - FCDO -iSPARK…"` |
| id range | 1..~1600 (1210 projects) | **7..376** (198 projects) |

Stored row: `{id: 223, agresso_agreement_id: "A1676", clarisa_project_id: 1403, clarisa_project_short_name: "B-A1676", source: "DERIVED", is_active: true}` — the real-feed id and the real-feed `short_name`, written faithfully by the automapper against the feed it read.

Cross-referencing all 399 mapping rows against the current feed:

| Measure | Value |
| --- | --- |
| Active mapping rows | **199** (194 `DERIVED`, 5 `MANUAL`) |
| Active rows matching a feed project by normalized `external_code` | **198** |
| …whose stored `clarisa_project_id` **≠** the feed's id for that project | **197** |
| Active rows whose `clarisa_project_id` **resolves** in the current feed | **2** |
| Active rows **dangling** | **197** |

Which is precisely the **local** coverage strip's `mapped: 2 / 198`. The **Dev** strip, reading real CLARISA, reports `MAPPED 195 · PENDING 3 · REACHABLE 198` — the same rows, resolving correctly. The defect is the *absence of a pin*, not a broken value: any host swap reproduces the local state on Dev.

The *tag* the user correctly observed keeps working throughout, because it is keyed on the contract, not the project — `pool-funding.util.ts:16`:

```sql
OR EXISTS (SELECT 1 FROM bilateral_project_mapping bpm
           WHERE bpm.agresso_agreement_id = ac.agreement_id AND bpm.is_active = 1)
```

So the mapping is simultaneously **present** (tag renders) and **unresolvable** (picker empty). Two surfaces, two different identity keys, one of which is stable and one of which is not.

**The message is also wrong on its own terms.** The code comment at `bilateral.service.ts:186-189` explicitly intends this branch to mean "mapping points at a project CLARISA no longer exposes… so ops can spot the drift" — but it collapses that state onto the same `'unmapped'` value as "no AGRESSO contract" and "no mapping row", and the client (`pool-funding-alignment.component.ts:140`) renders all three as *"This result isn't linked to a CLARISA project yet."* A distinguishable state was flattened at the boundary and the diagnostic intent was lost.

---

#### RC-C — The stub fixture stamps `Confirmed` on all 283 SP rows, so RC-A cannot redden any test

`convert-export.ts:63` hardcodes `const CONFIRMED_STATUS = 'Confirmed'` and applies it to every generated mapping. Measured status tallies (P25 / SPxx / non-AOW):

| Feed | SP-row status tally |
| --- | --- |
| Stub fixture (198 projects) | `{"Confirmed": 283}` |
| The same 198 projects in real CLARISA | `{"Pending": 283}` |
| Whole real feed (1210 projects, 1847 mapping rows, unfiltered) | `{"Confirmed": 493, "Pending": 1354}` |

Same 283 rows, opposite status. The fixture agrees with the code's filter on exactly the field that gates the feature — so every stub-backed test and every local demo shows a populated picker, and the real feed shows an empty one.

The fidelity spec then **asserts** the divergence as correct (`clarisa-stub.fidelity.spec.ts:447`):

> `D-4 — every fixture mapping is Confirmed; faithful to the real feed, but the non-Confirmed branch stays unexercised`

and fails the fixture if that ever stops being true (`:243` → *"D-4: not every fixture mapping is Confirmed anymore"*). The gate is installed **backwards**: it protects the state that hides the bug.

Its justification is `requirements.md:45`:

> `M-14 | Real mapping status is uniformly Confirmed | status histogram over 493 real mappings | {"Confirmed": 493}`

**The population was pre-filtered.** The real feed holds **1847** mapping rows, not 493 — and `493` is exactly today's `Confirmed` count. The sibling measurements confirm the same population: M-11's entity-code histogram `{22: 339, 23: 66, 24: 88}` sums to **493**, and re-measuring entity codes *by status* today returns `Confirmed {22:339, 23:66, 24:88}` — byte-identical to M-11 — beside `Pending {22:993, 23:166, 24:195}`. A status histogram computed over a set already filtered to `Confirmed` can only ever return `{"Confirmed": n}`. That is **K-014** ("a filtered view of a command's output is not the output") producing a confident, load-bearing, false fidelity claim — and **KZ-001**'s 12th occurrence: the double does not discriminate on the field it stands in for.

*Stated honestly:* an alternative reading is that the feed genuinely held only 493 Confirmed rows on 2026-08-18 and PRMS has since loaded 1354 Pending ones — `requirements.md:161` declares exactly that invalidating condition, and the capture it cites had 299 projects where the feed now returns 1210. The three histograms summing to precisely 493 favours the pre-filter reading, but the fix is identical either way, and the operative fact is not in doubt: **today, 198/198 of the cohort carry only `Pending` SP rows.**

### Impact & Scope

| Blast radius | Detail |
| --- | --- |
| **All 198 mapped bilateral projects** | SP picker empty ⇒ Pool Funding Alignment cannot be completed ⇒ HLO/ToC section unreachable (`showHloSection` needs ≥1 SP) |
| **ToC catalog endpoint** | `getHlosIndicatorsForResult` reuses the identical SP chain (`bilateral.service.ts:141` comment: *"Same rules as `deriveSciencePrograms`"*) — returns `catalogs: []` for the same 198 |
| **Admin coverage strip** | Dev: `195 / 198` (healthy). Local stub: `2 / 198` — counts by `clarisa_project_id IN cohortIds`, so it inherits RC-B wherever the feed differs from the one the rows were written against |
| **Admin mapping detail panel** | *"Science Programs (Confirmed, P25)"* → *"No Confirmed SPs in P25 for this project"* — inherits RC-A |
| **Data integrity** | **None.** No data is lost or corrupted; 199 rows are intact and correct for the feed they were written against. This is a read/resolution defect |
| **Security** | None |
| **Latent, related** | `hasSciencePrograms` (`clarisa-projects.service.ts:59`) is a **second, different** SP predicate — `status === 'Confirmed' && cgiar_entity_type_object.code === 22`. Per M-12, code 22 is SP01–SP08 only; SP09 (23) and SP10–SP13 (24) are invisible to it. So `has_science_programs` and the picker can disagree for the same project even after RC-A is fixed |

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode** — three logic changes, one likely migration, and a mandatory regression test per root cause. Not `/akili-quick`: nothing here is cosmetic, and RC-B touches persisted identity.

The regression tests must be **red before the fix** (K-004), with named failing inputs (K-012):

| # | Test | Named red input |
| --- | --- | --- |
| 1 | RC-A | A project whose only SP rows are `status: "Pending"`, P25, `SP02`/`SP06` → picker must return both, not `[]` |
| 2 | RC-B | An active mapping row whose `clarisa_project_id` is absent from the feed but whose stable key matches a feed project → must resolve, and must **not** report `'unmapped'` |
| 3 | RC-B copy | A genuinely unresolvable mapping → distinct status (`stale`), distinct message; asserted **≠** the not-linked copy |
| 4 | RC-C | Fixture carries ≥1 non-`Confirmed` SP row; the D-4 assertion is inverted to require a status mix |

---

## Approach Options

### Option 1 — Truth-first: stable mapping key + explicit accepted-status set *(recommended)*

- **RC-B:** resolve the mapping through a **feed-stable key**. `external_code` is already the automapper's own derivation source and is what matches AGRESSO (`archive/…clarisa-fixture-stub/requirements.md:M-17` — 170/170 prefix-stripped codes match `agresso_contracts`). Persist it on `bilateral_project_mapping` (migration), resolve by it, keep `clarisa_project_id` as a non-authoritative hint. Backfill is derivable from `agresso_agreement_id` for all 198 rows — no re-run needed.
- **RC-A:** replace the inline `!== 'Confirmed'` literal with one named, single-source-of-truth accepted-status set shared by `deriveSciencePrograms`, `deriveScienceProgramMetaByCode` and `hasSciencePrograms`, defaulting to **`Confirmed` + `Pending`**, overridable by env. Pending SPs render with a visible qualifier rather than being silently dropped.
- **RC-B/RC-A copy:** add a `stale` mapping status distinct from `unmapped`; make the "no SPs" message name the filter that excluded them.
- **RC-C:** fixture carries a realistic status mix; invert D-4.

**Trade-off:** the largest change (one migration, one env knob, two message states) and it presumes a default answer to OQ-5. It is the only option that leaves the screen truthful in every state and survives the next host swap.

### Option 2 — Config-only: make the accepted-status set an `app_config` value, no schema change

Ship RC-A behind `app_config`, fix the copy, leave `clarisa_project_id` as the resolution key and re-run the automapper against the correct host to repair the 197 rows.

**Trade-off:** smallest diff, no migration, PRMS can flip the filter without a deploy. But it does not fix RC-B — the next `ARI_CLARISA_HOST` change silently breaks all 198 again — and it inherits **K-016**: `ClarisaProjectsService` caches for 5 minutes, so a config save appears to do nothing for up to 5 min and **re-saving restarts the window**. Any spec taking this route must state the TTL in its verification steps.

### Option 3 — Data-only: no code change

Ask PRMS to Confirm the 283 SP rows, and re-run the automapper against the host each environment will actually use.

**Trade-off:** zero engineering risk and it does unblock the 198 — but it depends on a third party for an unbounded time, it repairs one cohort rather than the mechanism, both false messages survive verbatim for the next occurrence, and RC-C keeps the whole class untestable. Reasonable as an **interim** step alongside Option 1; not sufficient as the fix.

---

## Recommended Approach

**Option 1**, sequenced so the user is unblocked before the structural half lands:

1. **RC-A first** (smallest unblock, no schema): named accepted-status set + honest empty-state copy. This alone turns *"no Science Programs defined"* into a populated picker for all 198, once the environment points at a feed whose ids resolve.
2. **RC-C alongside it** — invert D-4 and give the fixture a status mix, so step 1's test can actually redden. Without this, step 1 ships against a double that agrees with the bug.
3. **RC-B second**: `external_code` as the resolution key + `stale` status + migration + backfill. This is what stops the next host swap from reproducing the whole incident.

Smallest safe path, because it fixes the reported symptom first, makes the gate able to fail before trusting it (K-004), and defers the schema change to its own reviewable step.

---

## Risks, Dependencies, And Open Questions

| # | Item | Type | Owner |
| --- | --- | --- | --- |
| **OQ-1** | **Should `Pending` SP mappings be selectable at all?** This is OQ-5 returning, now with its consequence measured: `Confirmed`-only means **0/198** projects are usable. If PRMS says Confirmed-only is correct, the fix is data (Option 3) plus honest copy — not a filter change | **Open — blocking the RC-A default** | PRMS |
| **OQ-2** | Which CLARISA host is each environment meant to read? The stub is on locally (`ARI_CLARISA_STUB_ENABLED=true`); the 198 were mapped against real CLARISA test. RC-B makes this survivable but the intended topology should be written down | Open | ARI team + DevOps |
| **OQ-3** | Repair path for the 197 rows: backfill `external_code` (Option 1, no re-run) or deactivate + re-run the automapper against the correct host? Backfill is preferred — it preserves audit history | Open | ARI team |
| **R-1** | A migration on `bilateral_project_mapping` **will not be applied by CI/CD** — the pipeline deploys code only (**K-015**). The 198 stay broken on Dev until a human runs it. The spec must call this out as an explicit step | Risk | Leader |
| **R-2** | Widening the accepted-status set changes what appears in the picker for **every** bilateral result, not just the 198. Coverage/admin counts move too. Needs a stated expected delta before/after | Risk | Reviewer |
| **R-3** | `hasSciencePrograms`'s `code === 22` clause excludes SP09–SP13 (M-12) — a second predicate that will still disagree with the picker after RC-A. Either unify or record as a deliberate difference (**K-005**: never collapse a discriminator "to simplify"; here the risk is the reverse — two discriminators nobody reconciled) | Risk | Reviewer |
| **R-4** | The real-feed figures are a **2026-08-20** capture of `clarisatest-back`, a host that is periodically reset. Invalidated by any CLARISA test reset or a PRMS status load. Re-measure before relying on the 283/198/493/1354 numbers (**K-013**) | Risk | Implementer |
| **R-5** | `ClarisaProjectsService` and `MappingPhaseResolver` cache **5 minutes** (**K-016**). Every verification step must state the TTL/restart window, or a correct fix will read as "still broken" | Risk | Leader |
| **D-1** | Live CLARISA test host reachable with the `.env` credentials — confirmed working this session (HTTP 200, 1210 projects) | Dependency | — |

---

## Success Criteria

- [ ] `GET /api/v1/results/3403/pool-funding-alignment/science-programs` returns `mapping_status: "mapped"` with **SP02 and SP06** in `science_programs`.
- [ ] Opening `result/STAR-3403/pool-funding-alignment` → **Yes** renders a populated picker; neither `UNMAPPED_SP_MESSAGE` nor `NO_SP_DEFINED_MESSAGE` appears.
- [ ] `GET /api/bilateral-project-mappings/coverage` on Dev stays at or above its current `mapped: 195 / 198` — the fix must not regress it; and the same call against a **stub-backed** stack no longer collapses to `mapped: 2`.
- [ ] An active mapping row whose `clarisa_project_id` does not resolve is reported as **stale**, with copy distinct from "not linked yet" — asserted by test.
- [ ] The stub fixture contains ≥1 non-`Confirmed` SP row, and the fidelity spec requires the mix rather than forbidding it.
- [ ] Each of the 4 regression tests was **observed failing** before its fix, with the failing input recorded verbatim in `execution.md` (K-004 / KZ-014 — the argument binds as tightly as the command).
- [ ] Full server suite and client suite green, re-measured by the Leader in isolation after workers report (§4.3 concurrency rule).

---

## Next Step

```text
/akili-specify bugfix/pool-funding-sp-picker-empty
```

Run in **Bug Mode** — the confirmed root causes above convert into a fix plan plus the four mandatory regression tests. **Answer OQ-1 with PRMS before the RC-A default is fixed in requirements**; RC-C and the copy fixes can be specified without it.
