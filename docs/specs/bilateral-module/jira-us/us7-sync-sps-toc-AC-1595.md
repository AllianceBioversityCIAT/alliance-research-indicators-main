# US7 — Sync the ToC of Science Programs / Accelerators

> Original Jira title (Spanish): _"Sincronizar el TOC de los SPs"_ — translated to English here for clarity; the Jira ticket is the source of truth.

| Field | Value |
| --- | --- |
| Jira id | [AC-1595](https://cgiarmel.atlassian.net/browse/AC-1595) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open |
| Priority | Medium |
| Source | **DRAFT (PO-authored)** — Jira ticket has no description yet |
| Designs | [Figma file](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR) — node TBD |

> ⚠️ **DRAFT.** This file is a PO proposal. The BA must validate and replace before the SDD feature spec is written.

---

## Story (DRAFT)

> **As a** STAR system (with manual override for admins),
> **I want** to pull the latest Theory of Change tree — including indicators and targets — for each Science Program / Accelerator on a scheduled cadence,
> **so that** US3 (indicator display) and US4 (indicator mapping) always show users the current ToC catalog, not a stale snapshot.

---

## Context (DRAFT)

US3 displays ToC indicators of the user-selected SPs. **The ToC tree is authored and maintained outside STAR** — in PRMS, in CLARISA's Lever data, or in a dedicated CGIAR ToC service (see decision **D3** in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)). Without a scheduled sync into STAR, US3 would either need to live-call the source on every page load (slow, fragile) or show stale data.

US7 is the **pull** half for ToC catalog data. US6 is the **pull** half for project Pool Funding tags. US5 is the **push** half for results.

---

## Acceptance criteria (DRAFT)

- **AC.1** A scheduled job runs at the agreed cadence (recommend daily; tunable per env).
- **AC.2** The job fetches the current ToC for each Science Program / Accelerator from the authoritative source (per **D3** in `../prms-context/03-reuse-and-decisions.md`).
- **AC.3** For each SP/Accelerator, ToC indicators (with code, name, type, targets) are upserted into STAR's local cache.
- **AC.4** Indicators that have been **removed** from the upstream ToC are marked as **inactive** in STAR — but existing result mappings (US4) are preserved with a "stale" flag (matches US4 AC.9).
- **AC.5** The job writes a `sync_process_log` row capturing: started_at, finished_at, source, # SPs processed, # indicators added, # updated, # marked inactive, errors.
- **AC.6** OpenSearch indexes for indicators are refreshed so US3's filter/search reflects new state within minutes.
- **AC.7** Failures **do not corrupt** the existing catalog state — sync is transactional per SP, or applies a snapshot strategy.
- **AC.8** Admins (`SYSTEM_ADMIN`, `TECHNICAL_SUPPORT`, `CENTER_ADMIN`) can **manually trigger** a sync from `/admin/sync/sp-toc` (or unified `/admin/sync`).
- **AC.9** Failed sync raises an operational alert.
- **AC.10** Sync supports `dry-run` mode that produces a diff report without mutating data.
- **AC.11** Sync respects upstream **versioning** — when the upstream ToC has a `version` field, STAR stores it so we can later show "this mapping uses ToC v2.1" on a result.

---

## Out of scope (DRAFT)

- Authoring ToC inside STAR.
- Editing indicator definitions in STAR.
- Pushing STAR-side ToC overrides upstream.

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | Feeds **US3** and **US4**. Independent of US1, US2, US5, US6 in terms of code order, but US3/US4 cannot launch with a useful UX until US7 has produced its first successful sync. |
| ARI backend | New cron `sp-toc.cron.ts` under `domain/tools/cron-jobs/`. New integration module `domain/tools/sp-toc-sync/` (or reuse `domain/tools/clarisa/` if CLARISA is the source per **D3**). |
| External | Upstream ToC source — to be confirmed (PRMS ToC API? CLARISA Lever data? OneCG ToC service?). |
| Admin panel | `/admin/sync/sp-toc` (or unified `/admin/sync`). |

---

## Open questions

- **OQ-US7-1.** **Source of the ToC** — PRMS, CLARISA, OneCG ToC service, or all of the above? Closes decision **D3** in `../prms-context/03-reuse-and-decisions.md`.
- **OQ-US7-2.** **Cadence** — daily or weekly? Aligns with OQ-C.
- **OQ-US7-3.** **Granularity** — pull every SP every run, or pull only changed-since-last-sync?
- **OQ-US7-4.** **Indicator schema** — does upstream provide explicit "indicator type" (output / outcome / 2030-outcome), or do we have to derive?
- **OQ-US7-5.** **Versioning policy** (AC.11) — does upstream actually version ToCs?
- **OQ-US7-6.** **First-run cost** — initial pull of all SPs across the Alliance. Estimate volume and runtime; consider chunking.
- **OQ-US7-7.** **Conflict / soft-delete on rename** — what happens if an indicator is renamed upstream while a STAR mapping references it? Preserve mapping using a stable code, not the display name.

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1595
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- PRMS-context (ToC mapping): [`../prms-context/02-ari-mapping.md` §7](../prms-context/02-ari-mapping.md)
- PRMS-context (decision D3): [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)
- PRMS-context (CLARISA integration patterns): [`../prms-context/02-ari-mapping.md` §10](../prms-context/02-ari-mapping.md)

---

## Notes for the SDD feature spec

- **ARI side**:
  - New `domain/tools/sp-toc-sync/` module — or **reuse** `domain/tools/clarisa/` if upstream is CLARISA.
  - Cron job writing to `sync_process_log`.
  - Decorate indicator entity with `@OpenSearchProperty` for fast US3 filter/search.
  - Preserve stable indicator codes; rename is metadata only.
- **STAR side**:
  - Not directly. STAR consumes US3's read endpoint.
  - May display a "last ToC sync" timestamp in the indicator panel header.
- **Test coverage**:
  - Add / update / inactivate flows.
  - Stable-code preservation on rename.
  - Failure isolation (one SP's failure does not corrupt others).
  - Dry-run.
- **Coupled to D3** — until D3 is closed, US7's source is undefined; do not start implementation.
