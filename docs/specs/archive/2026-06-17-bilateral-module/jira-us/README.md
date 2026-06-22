# Bilateral module — Jira user stories

> **Author role:** Product Owner.
> **Status:** Story-level context. Some stories are sourced verbatim from Jira; others are PO-authored DRAFTs awaiting BA finalization.
> **Last updated:** 2026-05-15.

This folder captures the user-story backlog for the **STAR bilateral module** epic (`AC-1385`) so engineers, BA, and reviewers share one ARI-aware reference. It is the second half of the bilateral-module context dossier; the first half is [`../prms-context/`](../prms-context/).

---

## Story index

| Jira | Title | Source | Status | File |
| --- | --- | --- | --- | --- |
| **PARI-194** | Discovery idea — Module to map W3/Bilateral results to CGIAR Pool Funding (SP/A) | Polaris Discovery | Delivery (in progress) | [epic-AC-1385.md](./epic-AC-1385.md) |
| **AC-1385** | Epic — Module to map W3/Bilateral results to CGIAR Pool Funding (SP/A) | STAR Product | Open | [epic-AC-1385.md](./epic-AC-1385.md) |
| AC-1386 | US0 — Create Mockups for W3/Bilateral mapping with PRMS ToC tool | Jira | Closed | [us0-mockups-history.md](./us0-mockups-history.md) |
| AC-1413 | US0 — Validate and refine mockups on how STAR results will be pushed to PRMS | Jira | Done | [us0-mockups-history.md](./us0-mockups-history.md) |
| **AC-1438** | US1 — Tag Bilateral Projects Contributing to Pool Funding | **Jira (full)** | Open | [us1-tag-bilateral-projects-AC-1438.md](./us1-tag-bilateral-projects-AC-1438.md) |
| **AC-1594** | US2 — Configure Pool Funding Alignment Contribution for STAR Results | **Jira (full)** | Open (current branch) | [us2-pool-funding-alignment-AC-1594.md](./us2-pool-funding-alignment-AC-1594.md) |
| AC-1439 | US3 — Display ToC Indicators as per selected Science Program | **DRAFT (PO)** | Open | [us3-toc-indicators-AC-1439.md](./us3-toc-indicators-AC-1439.md) |
| AC-1440 | US4 — Map results to indicators including rules (Contributions) | **DRAFT (PO)** | Open | [us4-map-results-indicators-AC-1440.md](./us4-map-results-indicators-AC-1440.md) |
| AC-1441 | US5 — Push results into the PRMS | **DRAFT (PO)** | Open | [us5-push-results-to-prms-AC-1441.md](./us5-push-results-to-prms-AC-1441.md) |
| AC-1593 | US6 — Sync bilateral contributions with W3 Registry | **DRAFT (PO)** | Open | [us6-sync-w3-registry-AC-1593.md](./us6-sync-w3-registry-AC-1593.md) |
| AC-1595 | US7 — Sync the ToC of SPs | **DRAFT (PO)** | Open | [us7-sync-sps-toc-AC-1595.md](./us7-sync-sps-toc-AC-1595.md) |

> **DRAFT** means the Jira ticket exists but has no description yet. The story body, persona, and acceptance criteria in those files are **PO proposals** informed by the epic (PARI-194), US1/US2 patterns, the [PRMS-context dossier](../prms-context/), and the Figma mockups. The BA must validate and replace as needed before the SDD feature spec is written.

---

## How to read this folder

1. **Start with [`epic-AC-1385.md`](./epic-AC-1385.md)** — the epic + discovery context (problem, opportunity, impact).
2. **Read US0 history** ([`us0-mockups-history.md`](./us0-mockups-history.md)) — to know which design decisions are already locked.
3. **Read US1 → US7 in order** — they are logically sequenced (tag → align → display → map → push → sync → sync ToC).
4. **Cross-reference each US to [`../prms-context/02-ari-mapping.md`](../prms-context/02-ari-mapping.md)** — every story implies one or more ARI backend endpoints already mapped there.

---

## Conventions used in each US file

Each `usN-*.md` file follows the template below. All fields are present, even if only a TBD placeholder is filled:

```markdown
# US<N> — <Title>

| Field | Value |
| Jira id | AC-XXXX |
| Epic | AC-1385 |
| Discovery | PARI-194 |
| Status | Open / Done / Closed |
| Priority | (Jira) |
| Designs | Figma node link |
| Source | Jira (full) | DRAFT (PO-authored) |

## Story        — As a / I want / so that
## Context      — 2–4 sentences
## Acceptance criteria — testable, observable
## Out of scope — what this story explicitly does NOT do
## Dependencies — other US + ARI backend + external systems
## Open questions
## Traceability — Jira/Epic/Discovery/PRMS-context/Figma links
## Notes for the SDD feature spec
```

---

## Cross-references

| Resource | Where |
| --- | --- |
| Discovery idea | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Figma design file | https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR |
| PRMS-context dossier | [`../prms-context/`](../prms-context/) |
| ARI baseline | [`../../../prd.md`](../../../prd.md), [`../../../detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) |
| SDD spec templates | [`../../general-setup/`](../../general-setup/) |

---

## What this folder is NOT

- It is **not** the SDD feature spec. That will be written later under `docs/specs/bilateral-module/<feature-slug>/{requirements,design,task}.md` using [`../../general-setup/`](../../general-setup/) templates, consuming this folder + the PRMS-context as inputs.
- It is **not** the Jira source of truth. When a story's Jira ticket gets updated, update the corresponding file here.
- It is **not** code or implementation. No file references concrete source paths beyond what `../prms-context/02-ari-mapping.md` already provides.

---

## Open questions surfaced across all US

These are tracked at the folder level. Story-local open questions live inside each story file.

- **OQ-A.** Reviewer persona for Pool Funding decisions in STAR — Center Admin, MEL Regional Expert, PI delegate, or a new role? (Affects US1, US2.)
- **OQ-B.** Where is the "official internal list" from System Office stored? (Excel? SharePoint? AGRESSO custom field? CLARISA table? Affects US1, US6.)
- **OQ-C.** Synchronization cadence — daily / on-demand / event-driven? (Affects US5, US6, US7.)
- **OQ-D.** Conflict policy when PRMS data and STAR data diverge after sync. (Affects US5, US6, US7.)
- **OQ-E.** Versioning policy — does approving a Pool Funding mapping create an ARI snapshot? (Decision D10 in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md).)
- **OQ-F.** Spanish-language titles US6/US7 — should Jira titles be translated, or is the team OK with mixed-language tickets?
- **OQ-G.** Real-time UX — does STAR need Socket.IO push for cross-user awareness, or is poll-on-page-load sufficient for Phase 1?
