# US2 — Configure Pool Funding Alignment Contribution for STAR Results

| Field | Value |
| --- | --- |
| Jira id | [AC-1594](https://cgiarmel.atlassian.net/browse/AC-1594) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open (**current working branch** `AC-1594-bilateral-module`) |
| Priority | Medium |
| Source | **Jira (full description + AC)** |
| Designs | [Figma — US2](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=32471-129337&t=75DyZixpTfjtK6tu-0) |

---

## Story

> **As a** Result owner (Creator, PI, contact, or admin) of a STAR result tied to a Pool Funding Contributor project,
> **I want** a dedicated "Pool Funding Alignment" section on my result where I can declare whether this result contributes to Pool Funding and, if yes, select the relevant Science Programs / Accelerators,
> **so that** the result becomes traceable as a CGIAR Pool Funding contribution and is eligible for the indicator mapping (US3 / US4) and PRMS push (US5).

---

## Context (from Jira)

Once a bilateral project is tagged as a **Pool Funding Contributor** (US1), STAR results created under that project must expose an additional section called **"Pool Funding Alignment."** This section is the user-facing entry point for indicating contributions to Science Programs or Accelerators.

US2 is **the trigger** that enables the indicator-mapping flow (US3 / US4) and the PRMS push (US5).

---

## Acceptance criteria (from Jira)

- **AC.1** For STAR results in a **Pool Funding Contributor project**, the **"Pool Funding Alignment"** section is displayed.
- **AC.2** For STAR results **not** in a Pool Funding Contributor project, the section **is not displayed**.
- **AC.3** If **"No"** is selected for contribution, **no Science Program selection** is displayed.
- **AC.4** If **"Yes"** is selected, the user can select **one or multiple Science Programs / Accelerators**.
- **AC.5** Only Science Programs / Accelerators **associated with the bilateral project** are displayed when enabled.
- **AC.6** Selected values are **stored persistently** in the STAR database.
- **AC.7** Only users with **permissions to the result** can edit this section: **Creator, PI, contact, admins**.

### Additional rules (from Jira "Other information")

- **AR.1** The section is editable **regardless of result status**, including **Approved** results.
  > _Open: "como afecta esto las versiones" — clarify how this interacts with ARI's snapshot/versioning model. See OQ-US2-2 below._
- **AR.2** The section becomes **read-only after synchronization** (US5 push to PRMS).
- **AR.3** Pool Funding Alignment fields are **not part of the result-submission validator** — users can submit results without completing these fields.

---

## Out of scope (for this US)

- Displaying the ToC indicators of the selected SP (that is **US3**).
- Mapping the result to indicators / capturing contribution data (that is **US4**).
- Pushing the result + alignment to PRMS (that is **US5**).
- Editing the SP / Accelerator master list (sourced from CLARISA / W3 Registry).

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | **US1** must be live (without the project tag, AC.1 cannot fire). Blocks US3, US4, US5. |
| ARI backend | New entity (or extension of `result_lever` / `result_initiative`) capturing the result→SP alignment with `is_pool_funding=true` flag + audit. New endpoints `GET /api/v1/results/:result-code/pool-funding-alignment`, `PATCH .../pool-funding-alignment`. See [`../prms-context/02-ari-mapping.md` §4–§5](../prms-context/02-ari-mapping.md) and decision **D2** (contributor model) in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md). |
| Authorization | Reuse ARI's `RolesGuard` + new ownership check ("Creator, PI, contact, admins"). Must NOT use `ResultStatusGuard` to block editing (per AR.1). |
| Master data | List of SPs/Accelerators allowed for the project — sourced from US6 sync output. |

---

## Open questions

- **OQ-US2-1.** **Who counts as "contact"** for AC.7? Result-level role table in ARI (e.g. `result_users` rows with a specific role) or a denormalized field?
- **OQ-US2-2.** **Versioning interplay (AR.1):** if a result is already Approved (and snapshot per decision D10) and the user edits Pool Funding Alignment, does the change apply to the live record or create a new version? Block-of-the-spec.
- **OQ-US2-3.** **Read-only-after-sync (AR.2):** after US5 push, how is the section unlocked if PRMS rejects the result? Auto-unlock on rejection?
- **OQ-US2-4.** **Multi-SP semantics:** is each selected SP equally weighted, or does the user pick a primary + contributors? (Mirrors PRMS pattern of `initiative_role_id = 1` vs `2`.)
- **OQ-US2-5.** **Empty-state UI:** how should AC.5 behave when no SPs are associated with the project? (Show empty list? Hide section entirely?)

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1594
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- Figma: https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=32471-129337&t=75DyZixpTfjtK6tu-0
- PRMS-context (data model + endpoints): [`../prms-context/02-ari-mapping.md`](../prms-context/02-ari-mapping.md) §4, §5
- PRMS-context (open decisions D2, D6, D10): [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)
- PRMS-context (terminology): [`../prms-context/04-glossary.md`](../prms-context/04-glossary.md)
- Current branch: `AC-1594-bilateral-module`

---

## Notes for the SDD feature spec

This is the most-detailed user-facing story; its spec must address:

- **ARI side**:
  - Decide whether to store alignment as a new `result_pool_funding_alignment` entity OR as flagged rows on `result_lever` / `result_initiative` (decision D2 in `../prms-context/03-reuse-and-decisions.md`).
  - New endpoints under `/api/v1/results/:result-code/pool-funding-alignment` (GET + PATCH) using ARI's `RESULT_CODE` token + `@GetResultVersion()`.
  - Authorization: custom guard combining `@Roles(...)` + a per-result ownership check (Creator, PI, contact, admin) — likely a new `ResultOwnerGuard`.
  - Audit columns via `AuditableEntity`; emit a Socket.IO event `result.pool-funding-alignment.changed` for cross-user awareness (gated on OQ-G).
  - **No** `ResultStatusGuard` — AR.1 explicitly allows editing in Approved state.
  - OpenSearch: index the boolean `has_pool_funding_alignment` + array of SP codes.
- **STAR side**:
  - Conditionally render the section based on the project tag (AC.1).
  - Yes/No toggle with reveal/hide on the SP selector.
  - Multi-select SP component populated from project-associated SP list (US6 sync output).
  - Disable editing once `is_synced_to_prms = true` (AR.2).
  - Permission check on render + on save.
- **Test coverage**:
  - Section visibility matrix (tagged vs untagged project).
  - Permission denial paths.
  - Save with Yes + SPs, save with No, switch back-and-forth (does it clear prior selections?).
  - Read-only state after sync.
  - Edit in Approved state — verify no `ResultStatusGuard` blocks.
- **Decisions to resolve before writing requirements.md**:
  - D2 (contributor model) and D10 (snapshot on approval) from the PRMS-context dossier are blockers.
