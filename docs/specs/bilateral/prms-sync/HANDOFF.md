# PRMS Sync — handoff, 2026-09-16

Written to survive a session clear. Everything below is measured or committed; nothing is
recollection. Where something is unproven it says so.

## Where the work stands

| Item | State |
|---|---|
| `sync-engine` spec | **Execution complete** — 14/14 tasks, each with a Reviewer PASS in `sync-engine/execution.md` |
| Server suite | 388 suites · 3294 tests · `npx eslint` exit 0 |
| Client suite | 322 suites · 7221 tests · `ng lint` clean |
| PRMS SYNC button | **Wired** (commit `e8976190`) — out of spec, at the owner's request |
| KP mapping | **Built and deliberately gated** (commit `ae415ec9`) |
| KP spike | Committed under `docs/specs/changes/prms-sync-knowledge-products/spike/` |

Branch `AC-1441-US5-Push-Results-into-the-PRMS`, ~25 commits ahead of `dev`. The owner pushes;
never push from a session.

## The one thing that blocks testing in Dev

`ARI_PRMS_NORMALIZER_HOST` is **not set anywhere** — not in `.env`, not in `app_config`, only
commented at `.env.example:36`. It is an environment variable by design (K-005: environment
discriminators are never collapsed), and `design.md:339` forbids a hardcoded default.

Dev needs the **TEST** host: `https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com`
(PROD is `v6a9z2e4y5…` and must never appear in Dev.)

**The backend must be restarted after setting it** — `PrmsNormalizerService` reads the host in its
constructor, not per request. Without it the endpoint returns
`503 "PRMS Normalizer host is not configured"`, which is the fail-loud design, not a defect.

## Open exit criteria (`sync-engine/tasks.md` §Definition of Done)

| Criterion | Owner |
|---|---|
| Someone exercises the sync in the running product — **before** `/akili-validate` issues a verdict | **Human** (in progress) |
| Migration applied forward **and reverted clean** | **Human.** Do it on the local scratch (`migration:test:revert` / `migration:test:execute`), **not** against shared Dev |
| Every requirement-level AC at clause granularity | `/akili-validate` |
| Budget checked against actuals | **Human.** Measured: 9,724 LOC vs a ~2,000 budget, but 3,708 of that is production (1.9×); review rounds 14 vs a budget of 2 (7×). Escalated, not self-closed |

**Sequence matters:** exercise in product → `/akili-validate` → archive. Archiving earlier freezes a
spec whose own checklist is unmet.

## Decisions taken 2026-09-16 — now recorded, previously only conversational

1. **D-4 reversed — Knowledge Products will be sent.** `homologation.md` D-4/D-4b/D-4c.
2. **Only TIP-imported KPs are syncable.** The handle is the `evidence_url` of the row whose
   `evidence_description` is exactly `'Handled'` (a typo for "Handle" in the importer; matched
   exactly on purpose, with a comment in the builder saying why).
3. **Mapping only, no flow.** `KNOWLEDGE_PRODUCT` stays in `UNMAPPABLE_INDICATORS`; the endpoint
   still refuses indicator 3. A test asserts that refusal holds when every other gate entry would
   pass. Enabling KP later is one line, and that test reddens to confirm the boundary moved
   deliberately.
4. **OICRs will never be sent — permanent product policy**, not a limitation awaiting a PRMS
   feature. Previously recorded only as *"PRMS has no OICR type"*, which invited the wrong reading.

## Still open

- **Gate message splits KP from OICR.** Today one entry says *"Indicator is unmappable to a PRMS
  type; Knowledge Product and OICR cannot be sent"*. That is now **false for KP** (it is mappable,
  just gated) and **understated for OICR** (permanent, not technical). Recommended: split into two
  entries with their own ids and messages — behaviour identical, both still refused, both still 422.
  The design supports it (gate entries are ordered data, §5.1 JD-3). **Not done: awaiting approval,
  because the owner scoped KP work to "no flow logic".**
- **No ACCEPTED was ever obtained for `knowledge_product`.** Four handles, four different business
  rules. The builder is proven in shape, not in result. Closing it needs a handle that is
  simultaneously from a supported repository, in the 2026 cycle, and not already reported.
- **Date contract mismatch, for the PRMS team.** STAR/TIP reads `dcterms.issued`; PRMS prefers
  `dcterms.available` when present. Same record, 2026-02 vs 2024. A KP STAR shows as 2026 is told
  *"only 2026 is eligible"*. No STAR-side logic reconciles it.
- **PRMS documentation defect, for the PRMS team.** The handle in their own field documentation's
  `knowledge_product` example is rejected by their own API as an unsupported repository.
- **Decision-webhook child does not exist.** Urgent property: *a decision taken while no destination
  is registered is never replayed* — there is no backlog. Register before results go under review or
  those approvals are lost. Also: the callback is **unsigned today** (`x-prms-signature` reserved,
  not sent), and the URL must be public HTTPS — Dev's on-prem private range is refused.
  Full contract: `docs/specs/changes/prms-sync-knowledge-products/` is KP only; the webhook doc the
  owner supplied is not yet in the repo.

## Two blockers that make KP unreachable regardless of mapping

Measured on Dev, 9,161 active KP results: **zero** in `result_status_id = 6` (they sit in status 20,
*"Completed in TIP"*) and **zero** with a Pool Funding Alignment row. KPs do not travel STAR's
approval workflow because STAR does not own their lifecycle. The pooled-funding development for KPs
is expected to change this and is why the mapping was built ahead of it.

**Open design question, unanswered:** will KPs pass through Pool Funding Alignment and an Approved
status like any other result — in which case gate entries 3 and 4 stay exactly as they are — or will
they sync from *"Completed in TIP"*, which needs a type-aware exception?
