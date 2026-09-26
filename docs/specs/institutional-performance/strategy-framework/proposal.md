# Proposal — Institutional Performance / Strategy Framework

> **Answer first:** a new page, *Center admin › Portfolio Management › Strategy Framework*, where Center Admins and System Admins add, edit and delete the Portfolio 2 strategy hierarchy (Impact Outcomes → Strategic Objectives, Enablers), the monitoring hierarchy (Performance Areas → Dimensions → Indicators) and the annual Institutional Objectives. The existing `impact_outcomes` / `strategic_objectives` rows are **extended**, not duplicated. Indicators are the level that KPIs (Idea 2) and the future mapping module attach to.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/institutional-performance/strategy-framework` |
| **Slug** | `strategy-framework` — renamed from `strategy-org-config` at the family split approved 2026-09-26 |
| **Type** | **Change** |
| **Approval Mode** | `gated` |
| **Parent Spec** | `docs/specs/institutional-performance` (`family.md`, child 3 of 5) |
| **Source idea** | `Idea-1_Strategy-and-Organizational-Structure-Configuration.md` (OneDrive · Strategy Refresh · KPI Validation · STAR Module ideas) |
| **Status** | draft, revision 4 — awaiting approval |
| **Last updated** | 2026-09-26 |
| **Branch** | `institutional-kpis` (from `staging`) |
| **JPD idea** | [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258) |
| **Depends on** | `institutional-performance/organizational-structure` (owner units) |
| **Parallel-safe** | no — touches `impact_outcomes`, `strategic_objectives` (shared with result alignment) |
| **Shared rules** | F-1 … F-9 (`../family.md` §4) |

### Revision history
| Rev | Date | Change |
| --- | --- | --- |
| 2 | 2026-09-25 | Removed lifecycle, source, import and inconsistency report; CRUD focus |
| 3 | 2026-09-26 | Three modules; versioned org structure; table standard; delete protection |
| 4 | 2026-09-26 | Split into three child specs; this file now covers the Strategy Framework only. Control lists and org structure moved to their own proposals; shared rules moved to `family.md` |

## 2. Intent

Configure the Alliance Strategy 2026–2030 framework once in STAR, under Portfolio 2, and expose it through one read service, so every later module uses the same elements and codes.

## 3. Problem / Current Behavior

| # | Fact | Evidence |
| --- | --- | --- |
| 3.1 | No STAR entity models Enablers, Performance Areas, Dimensions, framework Indicators or Institutional Objectives. | entity folder listing `server/…/src/domain/entities/` (2026-09-25). `UNVERIFIED — confirm at source before relying on it` that the existing `indicators` entity is only the result-type indicator |
| 3.2 | STAR already stores the 5 IO and 5 SO of Portfolio 2 (name, description, `portfolio_id`), with no code or tagline. | migrations `1782400514019-CreateStrategicObjectivesTable.ts`, `1782418327772-createImpactOutcomesTable.ts` |
| 3.3 | Those rows are live: results align to them, and the AI formalizer persists `strategic_objectives`. | migration `1782486943935-CreateResultStrategicAndResultOutcomesTables.ts`; `docs/specs/results/ai-formalize-strategic-objectives/proposal.md` §3 |
| 3.4 | `Portfolio` already relates to `ImpactOutcome`, `StrategicObjective` and `ClarisaLever`. | `domain/entities/portfolios/entities/portfolio.entity.ts:61-70` |

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| The Framework tab | they press **+** on a Performance Area | an empty Dimension form opens with the parent preselected and the next code proposed; Save places it in the tree |
| Any element | they edit it and Save | the change is stored; required fields and duplicate codes are rejected inline |
| An element with children or associated information | they press Delete | it is blocked, and the reason is named: children, Enablers pointing to a PA, SOs listing an IO as contributing, Institutional Objectives linked to an IND, or results aligned to an IO/SO |
| The Table view | they choose a level | they get a table meeting F-7 with edit and delete actions |
| Institutional Objectives | they press *Carry forward* | next year gets a copy; the current year is unchanged |

## 5. Scope

| Structure | Form fields (* required) | Rules |
| --- | --- | --- |
| Impact Outcome | Code*, Title*, Tagline, Elaborated outcome | Extends `impact_outcomes` |
| Strategic Objective | Code*, Primary IO*, Title*, Tagline, Guidance, Short description, Other contributing IOs | Extends `strategic_objectives` |
| Enabler | Code*, Related PA, Title*, Tagline, Full description, Rationale | Several enablers may point to one PA |
| Performance Area | Code*, Name*, Definition; derived: related enablers, # DIM · # IND | Counts calculated |
| Dimension | Code*, PA*, Name*, Description, Owner units (org entries flagged *Manages institutional KPIs*) | Code proposed from parent |
| Indicator | Code*, Dimension*, Name*, Description; derived: PA | KPIs and mappings attach here |
| Institutional Objective | Code* (unique per year), Year*, Statement*, Owner unit, Linked indicators | Per year 2026–2030; carry forward |

Views: **Framework** tab with Tree (Strategy / Monitoring toggle) and Table (level chips); **Institutional Objectives** tab with table and side form. Copy the framework to a new portfolio; export `.xlsx`.

Seed (F-8): 5 IO · 5 SO · 5 EN · 4 PA · 14 DIM · 30 IND from `Alliance-Strategy-2026-2030_20260902.xlsx` (no *Cost Efficiency*, no *Strength of Institutional Partnerships*, no *Powering Impact…* dimension); 28 IOB as illustrative examples, IOB-7 and IOB-27 both kept.

## 6. Non-Goals
- KPIs (Idea 2), reporting (Idea 3), the mapping module.
- Changing how results align to IO/SO today.
- Relevance scoring R1–R5 and the Template for Directors.

## 7. Affected Users, Systems, And Specs
| Area | Impact |
| --- | --- |
| Server | `impact_outcomes` / `strategic_objectives` extended (additive nullable columns) + `strategic_objective_contributing_ios`; new `enablers`, `performance_areas`, `dimensions`, `dimension_owner_units`, `framework_indicators`, `institutional_objectives`, `institutional_objective_indicators`; read service; `.xlsx` export; migrations + seed; Swagger |
| Client | new page with two tabs, tree/table, per-type forms |
| Specs | `results/ai-formalize-strategic-objectives` (must not regress); siblings `organizational-structure`, `institutional-indicators` |
| Jira | **PARI-258** (this work). Related, to be reconciled by the BA: PARI-218, PARI-224, PARI-230, PARI-219 |

## 8. Visual Reference
- **Source:** generated mockup (claude.ai Design canvas), working prototype.
- **Location:** https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP — artboards **3 · Strategy Framework — Framework** (`../mockup/Main.dc.html`) and **4 · Strategy Framework — Institutional Objectives** (`../mockup/InstitutionalObjectives.dc.html`).

## 9. Requirement Delta Preview
- **ADDED:** CRUD for EN, PA, DIM, IND, IOB; tree and table views; delete protection; carry forward; copy; export.
- **MODIFIED:** `impact_outcomes` / `strategic_objectives` gain code, tagline and text fields, editable here; primary keys and result links preserved.
- **REMOVED:** none.

## 10. Approach Options
| Option | Pros | Cons |
| --- | --- | --- |
| **A. Extend IO/SO + typed tables** | One source of truth; result alignment untouched; typed forms map 1:1 | ~7 new tables plus link tables |
| B. Generic polymorphic tree | Flexible | Migrating live IO/SO and their result FKs; weak typing; highest regression risk |
| C. Parallel catalogue | No touch on existing code | Two copies of the strategy |

## 11. Recommended Approach
**Option A**, as chosen by the requester for IO/SO. Framework elements get permanent IDs (F-9), so a code change never breaks a later KPI or mapping.

## 12. Risks, Dependencies, And Open Questions
| Risk | Mitigation |
| --- | --- |
| Editing or deleting IO/SO breaks result alignment or the AI formalizer | Additive columns; delete blocked while results are aligned; regression tests on the `ai-formalize-strategic-objectives` paths |
| Matching seeded IO/SO rows by name (seed uses Title Case) | Match by `portfolio_id` + normalized name and record what was checked (**KZ-008**, linaje `staging`) |
| Shared Dev database | Migrations reach Dev only through the pipeline on merge to `dev` (root `CLAUDE.md` §4.3) |

No open questions — decisions in `../family.md` §4.

## 13. Success Criteria
- Admins can create, edit and delete every structure in §5 with only Save and Delete.
- No element with children or associated information can be deleted.
- IO-1…5 and SO-1…5 keep their primary keys; result alignment and AI formalizer tests stay green.
- Tables meet F-7; one read endpoint returns the framework for a portfolio.

## 14. Next Step
```text
/akili-specify institutional-performance/strategy-framework
```
