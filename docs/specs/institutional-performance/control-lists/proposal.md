# Proposal — Institutional Performance / Control Lists

> **Answer first:** a new page, *Center admin › Portfolio Management › Control Lists*, where Center Admins and System Admins create and manage, **per portfolio**, categories of lists, the lists themselves and their values. It ships with two categories: **Key Performance Indicators (KPIs)**, with 5 lists, and **Organizational structure**, with the 4 levels. Values in use cannot be deleted. It is the first child of the family, because the other two read from it.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/institutional-performance/control-lists` |
| **Slug** | `control-lists` — from the family split approved 2026-09-26 |
| **Type** | **Change** |
| **Approval Mode** | `gated` |
| **Parent Spec** | `docs/specs/institutional-performance` (`family.md`, child 1 of 5) |
| **Status** | draft — awaiting approval |
| **Last updated** | 2026-09-26 (key naming decided: portfolio kept out of the key) |
| **Branch** | `institutional-kpis` (from `staging`) |
| **JPD idea** | [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258) |
| **Depends on** | none |
| **Parallel-safe** | no — introduces the nested menu group (F-3) and the shared table pattern (F-7) the siblings reuse |
| **Shared rules** | F-1 access · F-2 portfolio scope · F-3 navigation · F-4 CRUD · F-5 delete protection · F-6 codes · F-7 table standard · F-8 data (see `../family.md` §4) |

## 2. Intent

Stop hard-coding vocabularies. The KPI forms (Idea 2) and the organizational structure need controlled values that admins can adjust without a deployment, grouped so that an admin can tell which part of the system each list serves.

## 3. Problem / Current Behavior

| # | Fact | Evidence |
| --- | --- | --- |
| 3.1 | The KPI vocabularies (unit of measure, direction, frequency, KPI level, KPI type) exist only as drop-down sheets in Excel. | tracking tool *Control Lists* sheet; Master Monitoring Framework *08. Control Lists* |
| 3.2 | STAR has no admin-managed, portfolio-scoped list of values; controlled vocabularies come from CLARISA or from seeded tables. | root `CLAUDE.md` §4.2; `UNVERIFIED — confirm at source before relying on it` that no generic lookup table already exists |

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| An admin on Control Lists (Portfolio 2) | they create a category, a list or a value | it is saved for Portfolio 2 only |
| A value | they edit its code, name, order or *Active* flag | forms that read the list reflect it; inactive values disappear from new selections but stay on existing records |
| A value used by records (e.g. *Division*, used by 3 org entries) | they press Delete | deletion is blocked and the dialog proposes deactivation |
| A system list (e.g. `org.level`) | they try to delete it | it cannot be deleted; its **system key** is fixed |
| A new list created by an admin | it is saved | it exists with no form linked (*Used by: not linked yet*) until development links it |

## 5. Scope

| Element | Fields (* required) | Rules |
| --- | --- | --- |
| Category | Name*, Description | Seed: *Key Performance Indicators (KPIs)*, *Organizational structure* |
| List | Name*, System key* (fixed once created, `[a-z0-9_.]`, **no portfolio or year segment**), Category, Description; *Used by* (read-only) | Unique per portfolio, so `org.level` exists once in each portfolio; the UI shows the qualified reference `P2 · org.level` (computed, not stored). System lists cannot be deleted; a custom list can be deleted when empty |
| Value | Code* (unique in list), Value* (unique in list), Description, Display order, Active | In-use count shown; a value in use cannot be deleted |

Seed data (F-8):
- **KPIs:**
  - Unit of measure: Percentage (%), Count, Days, Score (0-100), USD, Ratio, Yes/No
  - Direction: Increase, Decrease, Maintain within range
  - Measurement frequency: Monthly, Quarterly, Semi-annual, Annual
  - KPI level: Strategic, Tactical, Operational
  - KPI type: Institutional, Customized
- **Organizational structure:** Organizational levels — `L1` Division, `L2` Department, `L3` Office (optional), `L4` Unit

Also in scope: the nested *Portfolio Management* menu group (F-3), and the reusable table pattern (F-7) built once here and reused by the siblings.

## 6. Non-Goals
- Global (cross-portfolio) lists (F-2).
- Linking a custom list to a form without code changes.
- Changing existing Center admin pages or tables.

## 7. Affected Users, Systems, And Specs
| Area | Impact |
| --- | --- |
| Server | New module: `control_list_categories`, `control_lists` (portfolio, category, key, name), `control_list_values`; read endpoint by list key + portfolio for other modules; in-use count provider; `.xlsx` export; migration + seed |
| Client | `alliance-sidebar` (nested group under Portfolio Management), new lazy route, new page, shared table component/pattern |
| Specs | siblings `organizational-structure` (reads `org.level`), `institutional-indicators` (reads the KPI lists) |

## 8. Visual Reference
- **Source:** generated mockup (claude.ai Design canvas), working prototype.
- **Location:** https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP — artboard **1 · Control Lists** (`../mockup/ControlledLists.dc.html`).

## 9. Requirement Delta Preview
- **ADDED:** categories, lists and values per portfolio, with in-use protection; the nested menu group; the table pattern.
- **MODIFIED:** none.
- **REMOVED:** none.

## 10. Approach Options
| Option | Pros | Cons |
| --- | --- | --- |
| **A. Generic model: category → list(key) → value** | One module serves every present and future list; admins can add lists | Values are loosely typed (text + code); per-list extra attributes would need a JSON column |
| B. One table per list | Strong typing | New migration and screen for every list; no admin-created lists |

## 11. Recommended Approach
**Option A.** Consumers read by `(portfolio_id, list_key)`. The in-use count is computed by each consumer module through a small registry (e.g. `org.level` → count of org-unit versions per level), so deletion checks stay correct as new consumers appear.

## 12. Risks, Dependencies, And Open Questions
| Risk | Mitigation |
| --- | --- |
| A consumer forgets to register its usage, so a used value becomes deletable | Delete also fails at the DB level through FKs where the consumer stores the value id |
| An admin edits the system key of a list the code reads | The key is immutable after creation |

No open questions — decisions in `../family.md` §4.

## 13. Success Criteria
- An admin can create, edit and delete categories, lists and values for Portfolio 2 using only Save and Delete.
- A value in use cannot be deleted; a system list cannot be deleted.
- The values table meets F-7.

## 14. Next Step
```text
/akili-specify institutional-performance/control-lists
```
