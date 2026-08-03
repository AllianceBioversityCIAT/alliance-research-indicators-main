# Bilateral module — PRMS context

> **Author role:** Product Owner.
> **Status:** Context-gathering (NOT a feature spec yet).
> **Last updated:** 2026-05-15.

This folder is the **PRMS-side context dossier** for the upcoming **bilateral module** in ARI/STAR. It exists to give engineers and reviewers a shared, ARI-relevant understanding of how the PRMS bilateral module works **before** we draft the actual ARI feature spec under `docs/specs/bilateral-module/<feature>/`.

The context for the new ARI bilateral module is composed of two halves:

1. **PRMS context** (this folder) — what the existing PRMS implementation does and how it maps onto ARI.
2. **Jira user stories** — sibling folder [`../jira-us/`](../jira-us/) capturing the business asks from STAR product backlog.

---

## What is in this folder

| File | Purpose | Audience |
| --- | --- | --- |
| [`README.md`](./README.md) | Orientation (this file). | All. |
| [`01-prms-backend-summary.md`](./01-prms-backend-summary.md) | Distilled summary of the PRMS bilateral backend (ingestion + review halves). | Engineers + reviewers reading PRMS for the first time. |
| [`02-ari-mapping.md`](./02-ari-mapping.md) | Side-by-side mapping of PRMS concepts onto ARI's NestJS/TypeORM/MySQL/OpenSearch stack. | Engineers preparing to implement. |
| [`03-reuse-and-decisions.md`](./03-reuse-and-decisions.md) | What ARI can reuse, what must be added, and the explicit decisions needed before specifying. | PM + engineering lead. |
| [`04-glossary.md`](./04-glossary.md) | CGIAR + PRMS + ARI vocabulary in one place. | All. |

---

## Read order

1. **Start with [`01-prms-backend-summary.md`](./01-prms-backend-summary.md)** to get the shape of the existing system.
2. Move to [`02-ari-mapping.md`](./02-ari-mapping.md) to see how each PRMS concept lands in ARI.
3. Read [`03-reuse-and-decisions.md`](./03-reuse-and-decisions.md) to understand what is still open.
4. Keep [`04-glossary.md`](./04-glossary.md) handy as a side reference.

---

## Source of truth

### PRMS-side (external repository — read-only reference)

- `/Users/jcadavid/Desktop/DEV/Desarrollos/onecgiar_pr/docs/bilateral-module/`
  - `README.md`
  - `frontend.md`
  - `backend.md`
  - `integration-contracts.md`
  - `replication-checklist.md`
- Authoritative field-level export contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.

> The PRMS docs are the canonical source. This folder is a **filtered summary** — when in doubt, follow the upstream docs and update this folder if anything material changes there.

### ARI-side (this repository)

- [`docs/prd.md`](../../../prd.md) — ARI product baseline.
- [`docs/system-design/design.md`](../../../system-design/design.md) — ARI UX-of-the-platform blueprint.
- [`docs/detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) — ARI technical baseline (envelope, auth, modules, status workflow).
- [`docs/specs/general-setup/`](../../general-setup/) — SDD methodology templates that the future feature spec MUST follow.
- [`CLAUDE.md`](../../../../CLAUDE.md) and [`server/researchindicators/src/CLAUDE.md`](../../../../server/researchindicators/src/CLAUDE.md) — agent working manuals.

---

## How this folder feeds into the SDD workflow

```
this folder (prms-context/)              jira-us/
        \                                /
         \                              /
          \                            /
           v                          v
   docs/specs/bilateral-module/<feature>/
        ├── requirements.md   ← follows docs/specs/general-setup/requirements.md
        ├── design.md         ← follows docs/specs/general-setup/design.md
        └── task.md           ← follows docs/specs/general-setup/task.md
```

- This `prms-context/` folder is an **input** to the feature spec. It does not replace the spec.
- The feature spec will quote and link from here, not duplicate it.
- The open decisions captured in [`03-reuse-and-decisions.md`](./03-reuse-and-decisions.md) must be **resolved** (or explicitly carried forward) before `requirements.md` and `design.md` are written.

---

## Out of scope of this folder

- Frontend (STAR) work. PRMS frontend is documented in `onecgiar_pr/docs/bilateral-module/frontend.md`. The STAR frontend module will be specified separately.
- Implementation code. The feature spec under `docs/specs/bilateral-module/<feature>/` and the SDD `task.md` drive code changes.
- Jira tickets. See [`../jira-us/`](../jira-us/).
- Deployment / CI / infra changes — covered in ops docs.

---

## Maintenance

- Treat the four content files in this folder as **living docs**.
- When the PRMS upstream changes, update [`01-prms-backend-summary.md`](./01-prms-backend-summary.md) first, then propagate to [`02-ari-mapping.md`](./02-ari-mapping.md) and [`03-reuse-and-decisions.md`](./03-reuse-and-decisions.md) as needed.
- When an open decision is resolved, move it from [`03-reuse-and-decisions.md`](./03-reuse-and-decisions.md) into the relevant spec's decisions log.
- Do **not** check in PRMS source code copies here — link to paths instead.
