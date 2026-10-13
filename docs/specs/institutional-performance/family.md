# Spec Family — Institutional Performance (STAR)

## 0. Document Control

- **Family path:** `docs/specs/institutional-performance/`
- **Parent spec / Feature:** Institutional Performance / Alliance Strategy 2026–2030 configuration, KPI planning and KPI reporting in STAR
- **Date created:** 2026-09-25
- **Last updated:** 2026-10-13 — requester decisions: control lists are global, read by key, and move to *System admin* (Admin + Technical Support); Organizational Structure sits in *Center admin* outside Portfolio Management; F-2 and F-3 amended by [`changes/control-lists-global-scope`](../changes/control-lists-global-scope/proposal.md). Previous: 2026-10-08 — requester decision: Organizational Structure is global (not portfolio-scoped), versioned per year, and keeps every entry visible in earlier years; F-2/F-3 amended, child 2 row updated. Previous: 2026-09-26 — former child 1 split into three (Control Lists, Organizational Structure, Strategy Framework)
- **Spec-family status:** `open`
- **Owner / Squad:** Hector F. Tobón (requester, on behalf of PISA4 / Strategy Refresh)
- **Source ideas:** `STAR Module ideas/00_README_Institutional-Performance-Ideas.md` and `Idea-1/2/3_*.md` (OneDrive · Strategy Refresh · KPI Validation, 2026-09-25)
- **Linked PRD section:** [`docs/prd.md`](../../prd.md) — Center Admin tools (portfolio management)
- **Linked TRD section:** [`docs/trd/trd.md`](../../trd/trd.md) — backend/frontend architecture
- **JPD idea:** [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258) — *Institutional Performance - Systematization of the Alliance Strategy and Organizational Structure* (Q3 2026; covers children 1–3). Earlier overlapping ideas PARI-224, PARI-230, PARI-219 are left for the BA to reconcile
- **Shared mockup:** https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP (private) · local copy [`mockup/`](mockup/)

---

## 1. Context & Splitting Rationale

Idea 1 (reference data) was split into three children because each one is useful on its own and each depends on the one before it:

- **Control Lists** holds the vocabularies that the other two read, including the organizational levels. Since 2026-10-13 every list is global and read by its key (`changes/control-lists-global-scope`).
- **Organizational Structure** holds the versioned org units that own dimensions, objectives and, later, KPIs and mapped records. It is **one living tree, not tied to a portfolio** (2026-10-08); portfolio-scoped children refer to its units by permanent ID.
- **Strategy Framework** holds the strategy and monitoring hierarchies plus the annual Institutional Objectives. It uses owner units from the structure.

Ideas 2 (KPI planning) and 3 (KPI reporting) follow. A mapping module (results and other records → indicators and org units) is expected after this family's reference data; it is not yet a row here.

---

## 2. Child Specs Manifest

| # | Spec Path | Title / Scope | Depends on | Parallel-safe | Status | Owner |
|---|---|---|---|---|---|---|
| 1 | `institutional-performance/control-lists` | Control lists: categories, lists and values, with in-use protection. Delivered portfolio-scoped; made global and read by key by `changes/control-lists-global-scope` (2026-10-13) | `none` | `no` (shared nav + table pattern introduced here) | `done` (archived: `archive/2026-10-08-institutional-performance--control-lists/`) | Hector F. Tobón |
| 2 | `institutional-performance/organizational-structure` | **Global** (no portfolio) living 4-level org structure (L1 Division › L2 Department › L3 Office › L4 Unit): permanent IDs, versions per year, year views that include later-deleted/inactivated entries, inactivate/successor, logical delete, append-only change log | `control-lists` | `no` | `pending` | Hector F. Tobón |
| 3 | `institutional-performance/strategy-framework` | IO → SO, EN; PA → DIM → IND; annual Institutional Objectives. Extends `impact_outcomes` / `strategic_objectives` | `organizational-structure` | `no` | `pending` | Hector F. Tobón |
| 4 | `institutional-performance/institutional-indicators` | Idea 2 — KPI definition, planning cycles, published view, edit mode for directors and delegates | `strategy-framework` | `no` | `pending` | Hector F. Tobón |
| 5 | `institutional-performance/kpi-reporting` | Idea 3 — achievement capture per period, evidence, review workflow, assisted extraction | `institutional-indicators` | `no` | `pending` | Hector F. Tobón |

Children 1–3 have a folder with a `proposal.md`. Children 4 and 5 get their folder when they are proposed.

### Status Vocabulary
- `pending`: Child spec is proposed, drafted, or awaiting prerequisite child completion.
- `active`: Child spec is currently approved and in active implementation (`/akili-execute`).
- `done`: Child spec implementation and testing (`/akili-test`) are complete and verified.
- `blocked`: Child spec is blocked by external dependencies or prerequisite child blockers.

---

## 3. Dependency Graph

```mermaid
graph TD
    C1["1. control-lists"] --> C2["2. organizational-structure"]
    C2 --> C3["3. strategy-framework"]
    C3 --> C4["4. institutional-indicators"]
    C4 --> C5["5. kpi-reporting"]
```

---

## 4. Shared Rules (bind every child)

Decided by the requester on 2026-09-25 and 2026-09-26. Children cite these IDs instead of restating them.

| ID | Rule |
| --- | --- |
| **F-1 Access** | Center Admin and System Admin can read and write everything. Client: `centerAdminGuard` (`canAccessCenterAdmin` already admits role 1 Admin and role 9 Center Admin — `client/…/shared/services/cache/roles.service.ts:9-10,34`). Server: `@Roles(...)` for the same roles; `SYSTEM_ADMIN` bypasses. No new roles **Exception (2026-10-13): Control Lists** is used by the System admin roles — Admin and Technical Support — and not by Center Admin (`changes/control-lists-global-scope` R-CLG-008) |
| **F-2 Portfolio scope** | Every strategy-framework element (and, later, KPI planning and reporting data) belongs to a portfolio; control lists and the organizational structure do not (see the two notes below). Only **Portfolio 2 (2026–2030)** is configured now; Portfolio 1 appears in the selector as "not configured". **Control lists are not portfolio-scoped (2026-10-13):** every list is global and read by its key; when a screen needs a portfolio-specific vocabulary, that screen's spec decides how (`changes/control-lists-global-scope`). **Exception (2026-10-08): the Organizational Structure is global** — one living tree with no portfolio; portfolio-scoped elements reference its units by permanent ID (F-9) |
| **F-3 Navigation** | Menu placement (amended 2026-10-13): **Control Lists** under *System admin* (after Prompt Manager); **Organizational Structure** under *Center admin*, as its own item outside Portfolio Management; **Strategy Framework** nested under *Center admin › Portfolio Management*. A page that holds portfolio-scoped data has a portfolio selector, defaulting to the portfolio whose dates contain today. **Control Lists has none** (global, 2026-10-13); **Organizational Structure** has a *Structure year* selector instead (2026-10-08). Existing Center admin items and the Portfolio Management page are **not changed** |
| **F-4 CRUD** | Admins add, edit and delete; the only form actions are **Save**, **Cancel** and **Delete**. No lifecycle statuses, no per-element source, no workbook import |
| **F-5 Delete protection** | Nothing with children or associated information can be deleted. The dialog names the blocker and offers the alternative (deactivate a value, close an org entry) |
| **F-6 Codes** | Codes are proposed automatically, editable, and unique within their scope |
| **F-7 Table standard** | Every **new** table: rows per page (10 / 25 / 50 / 100), resizable columns, click-to-sort headers with an indicator, **default sort by code or ID ascending** in natural numeric order, search, **Export .xlsx** of the filtered and sorted rows. Existing tables are out of scope (see §5) |
| **F-8 Data** | Seeded with example data for review by a colleague; each module also works when empty. Framework: `Alliance-Strategy-2026-2030_20260902.xlsx`. Master Monitoring Framework: organizational structure only |
| **F-9 Stable links** | Any record linked to an org unit or a framework element links to its **permanent ID**, never to its name, code or parent |

---

## 5. Deferred Work (not a child; tracked here so it is not lost)

| Item | Why deferred |
| --- | --- |
| Apply F-7 to the 10 existing tables — `results-table`, `project-results-table`, `results-center-table`, `my-projects`, `select-linked-results-modal`, `authors-contact-persons-table`, `portfolio-management`, `bilateral-mapping`, `prompt-manager`, `variable-configuration` | Today 5 have a paginator, all sort on some columns, none have resizable columns, and export exists only in the results center and my-projects. Retrofitting touches live screens and their specs; do it as its own change (`/akili-propose changes/table-standard-retrofit`), ideally by first extracting the shared table pattern built in child 1 |
| Configure Portfolio 1 (2010–2025) from what STAR already holds | Results are already mapped to P1 levers (CLARISA levers are linked to a portfolio), IO/SO, SDGs and OICRs. Whether those become a P1 structure is a separate decision |

---

## 6. Closed-Set Rule (Non-Negotiable)

> [!IMPORTANT]
> **Closed-Set Rule:** The child table in Section 2 is the **exhaustive child set** of this spec family.
> - No AKILI command or agent may create or execute a child spec folder without a prior registered row in this manifest.
> - Adding, removing, or re-ordering child specs requires a Human-In-The-Loop (HITL) approved manifest edit.
> - The spec family is considered `complete` only when all child specs in this manifest have achieved `done` status and have been verified.
