# US6 — Sync bilateral contributions with the W3 Registry

> Original Jira title (Spanish): _"Sincronizar las contribuciones de bilaterales con W3 registy"_ — translated to English here for clarity; the Jira ticket is the source of truth.

| Field | Value |
| --- | --- |
| Jira id | [AC-1593](https://cgiarmel.atlassian.net/browse/AC-1593) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open |
| Priority | Medium |
| Source | **DRAFT (PO-authored)** — Jira ticket has no description yet |
| Designs | [Figma file](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR) — node TBD |

> ⚠️ **DRAFT.** This file is a PO proposal. The BA must validate and replace before the SDD feature spec is written.

---

## Story (DRAFT)

> **As a** STAR system (with manual override available to admins),
> **I want** to pull the latest list of bilateral projects + their Pool Funding contributions from the W3 / Bilateral Registry on a scheduled cadence,
> **so that** the Pool Funding Contributor tags (US1) and the project ↔ SP/Accelerator associations (US2 source) stay accurate without manual data entry.

---

## Context (DRAFT)

US1 introduces the Pool Funding Contributor tag at the project level. **The validated list of which bilateral projects qualify is owned by the CGIAR System Office** (see OQ-B at the folder level) and reflected in the W3 / Bilateral Registry. Without an automated sync, the STAR-side tags will drift out of date as the registry evolves quarterly.

US6 establishes the **pull** half of the integration: W3 Registry → STAR. US5 is the **push** half: STAR → PRMS.

---

## Acceptance criteria (DRAFT)

- **AC.1** A scheduled job runs at the agreed cadence (OQ-C — recommend daily; tunable per env).
- **AC.2** The job fetches the current bilateral-contributions list from the W3 Registry source of truth (OQ-B).
- **AC.3** For each bilateral project on the list, STAR sets `is_pool_funding_contributor = true` on the matching AGRESSO contract.
- **AC.4** For each bilateral project that has been **removed** from the list, the tag is set to `false` — but existing result mappings (US2 / US4) are **preserved** with a "stale" flag (matching US1 OQ-US1-2 policy when finalized).
- **AC.5** The job writes a `sync_process_log` row capturing: started_at, finished_at, source URL/dataset id, # added, # removed, # unchanged, errors.
- **AC.6** Failures (network, schema mismatch, parse error) **do not corrupt** the existing tag state — the sync is transactional or applies a snapshot strategy.
- **AC.7** OpenSearch indexes for projects are reindexed after a successful sync so STAR filters reflect new state within minutes.
- **AC.8** Admins (`SYSTEM_ADMIN`, `TECHNICAL_SUPPORT`, `CENTER_ADMIN`) can **manually trigger** a sync from the admin SSR panel (`/admin`).
- **AC.9** A failed sync raises an alert (log + email / Slack / equivalent operational channel — out of scope to define here).
- **AC.10** Sync supports `dry-run` mode (admin-only) that computes the diff without applying changes.

---

## Out of scope (DRAFT)

- Editing the W3 Registry from STAR.
- Pushing STAR data back to the W3 Registry (US5 covers PRMS, not the W3 Registry).
- Per-Center scoped syncs (Phase 1: one global sync covers all Centers).

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | **US1** must be live (the tag must exist). Feeds US2 (SPs associated with project). |
| ARI backend | New cron job `w3-registry.cron.ts` under `domain/tools/cron-jobs/`. New integration module `domain/tools/w3-registry/` exposing a Nest service that fetches + parses + diffs. |
| External | W3 / Bilateral Registry source — API, file drop, SharePoint, or equivalent. **Definition required (OQ-B).** |
| Admin panel | `/admin/sync` (or similar) page surfaces job runs + manual trigger + dry-run. |

---

## Open questions

- **OQ-US6-1.** **Source of the W3 Registry list** — confirm format (Excel? CSV? REST API? CLARISA table? OneCG endpoint?). Same as OQ-B at the folder level.
- **OQ-US6-2.** **Cadence** — daily? weekly? Aligns with OQ-C.
- **OQ-US6-3.** **Authentication to source** — credentials, API key, OAuth? Where are they stored (likely `app_secrets`)?
- **OQ-US6-4.** **Authoritative key** — what identifier in the registry maps to AGRESSO contract code? Project code? Grant ID? Contract number? Document the mapping rule.
- **OQ-US6-5.** **Conflict resolution** (OQ-D) when a manual override has been applied to a tag and the next sync would revert it.
- **OQ-US6-6.** **History retention** — keep all sync_process_log rows forever, or prune after N months?
- **OQ-US6-7.** **First-run behavior** — bulk-apply all current registry entries, or require admin to approve the first run as a dry-run?

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1593
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- PRMS-context (cron + sync_process_log pattern): [`../prms-context/01-prms-backend-summary.md` §5, §17](../prms-context/01-prms-backend-summary.md)
- PRMS-context (integration rules): [`../prms-context/02-ari-mapping.md` §10](../prms-context/02-ari-mapping.md)

---

## Notes for the SDD feature spec

- **ARI side**:
  - New `domain/tools/w3-registry/` module: connection service + DTO definitions + mapper.
  - New cron job in `domain/tools/cron-jobs/` writing to `sync_process_log`.
  - New admin SSR page under `/admin/sync/w3-registry` (or general `/admin/sync`).
  - `LoggerUtil` with structured fields; never log credentials.
- **STAR side**:
  - Not directly. STAR consumes the tag (US1) and SP-association data; how it gets refreshed is invisible.
  - Could surface "last sync at" in the project header.
- **Test coverage**:
  - Diff computation (added / removed / unchanged).
  - Conflict policy.
  - Dry-run does not mutate.
  - Failure paths (network, parse, partial).
  - OpenSearch reindex trigger.
- **Risk**: this US is tightly coupled to OQ-B; **do not start implementation until the source is defined**.
