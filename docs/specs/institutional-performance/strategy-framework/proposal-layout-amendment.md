# Proposal — Strategy Framework layout amendment (Organizational Structure pattern)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `institutional-performance/strategy-framework` — **amendment** of family child 3, not a new child |
| Slug | `strategy-framework-layout` — given by the user; resolved as an amendment because child 3 is still open (T-17 HITL in progress) and a new child would need a `family.md` row first |
| Type | Change |
| Deliverable | software (client only) |
| Approval Mode | gated |
| Requested by | Dev lead / owner, 2026-11-24, during T-17 HITL |
| Requirement source | Owner's chat request with 6 screenshots (Organizational Structure tree and side panel; current Framework drawer and inline name) |
| Date | 2026-11-24 |

## 2. Intent

Make **Framework** and **Institutional Objectives** work like **Organizational Structure**:

- the tree is an expandable table;
- clicking a row opens its fields in a panel that stays on the same page;
- names are edited only in that panel.

## 3. Problem / Current Behavior

| Today (strategy-framework) | Evidence |
|---|---|
| The Framework editor is a card outline. Each row has a level label, a code badge, an **inline name `<input>`** that saves on Enter or blur, counts, **+ child**, an edit icon and a delete icon. | design §6.3; `ods-admin/framework/components/outline-row/` |
| Editing opens a **modal `p-drawer`** from the right. It is reached through the pencil icon (outline) or the row action (tables). | design §6.5; `element-panel.component.ts` |
| Institutional Objectives is a flat `app-data-table`. Each row has actions, and editing opens the same kind of `p-drawer`. | design §6.6; `objective-panel.component.ts` |
| Organizational Structure uses `p-treeTable` with the columns Name (chevron, indent, child count), Code, Level, Responsible director and Status (with the **+** add-child button). Clicking a row selects it. A sticky `<aside>` takes 40 % of the width and shows the details form, with *"Select an entry to see its details."* when nothing is selected. | `center-admin/organizational-structure/components/org-tree/org-tree.component.html:1-80`; `organizational-structure.component.html:150-176` |

The two patterns differ inside one admin area. The owner prefers the Organizational Structure one.

## 4. Proposed Outcome

1. **Framework, Tree view** (replaces the outline editor):
   - It is a `p-treeTable` like `org-tree`.
   - **Name** column: chevron, indent, read-only name text and a child count (*"6 dimensions"*).
   - **Code** column (pill), **Level** column (*Performance Area / Dimension / Indicator*), **Responsibles** column (indicators only).
   - Last column: **+ <next level>**, hidden on the deepest level.
   - Clicking a row (or pressing Enter on it) selects it.
2. **Side panel instead of the drawer**, on both pages:
   - A sticky right `<aside>` in a 60/40 split, as in Organizational Structure, with *"Select an entry to see its details."* when nothing is selected.
   - It contains today's panel content: header, Code, Name, Description, Parent, derived ancestors, Responsibles, plus **Delete / Cancel / Save**.
   - **+ <level>** and **New …** open the same panel in create mode, with the parent preselected.
3. **Name is read-only text** everywhere outside the panel. The inline name editor, its state machine and the inline draft rows go away.
4. **Institutional Objectives**: the table stays. Clicking a row selects it and fills the side panel (Code, Year, Statement, Linked indicators, Delete). The row edit icon is removed.
5. **Framework, Table view**: the per-level tables stay (R-STF-008, F-7, export). Clicking a row selects it and fills the same side panel instead of opening the drawer.

## 5. Scope

- Client only, under `ods-admin/`: the framework page, a new `framework-tree` component, element-panel hosting, the IOB page and objective-panel hosting, and their specs.
- Reuse the org-tree conventions: chevron `aria-label`/`aria-expanded`, selected-row class, `aria-selected`, sticky panel with `overflow-x: clip` (D-ORG-20).
- The search box and the expand state survive a refresh, carried over from HITL round 2 and applied to the tree table.
- Spec documents: R-STF-007, R-STF-009 (UI part), design §6.2–§6.6, D-STF-17 and D-STF-14 (raw input row), and the **F-4 child-3 exception in `family.md`**, which is withdrawn because inline edit is gone. New tasks are added after T-17.

## 6. Non-Goals

- No server, API, migration or seed change. The A1e, A5–A9 and A3 contracts stay as they are.
- No History or Linked data tabs, and no Inactivate (Organizational Structure features that the framework does not have).
- No change to the xlsx export, the delete rules or the delete dialog (`FrameworkDeleteHandler`).
- No change to the shared `data-table` or to Organizational Structure.

## 7. Affected Users, Systems, And Specs

- ODS Admin (role 11) and System Admin users of both pages.
- Spec `institutional-performance/strategy-framework` (requirements, design, tasks) and `family.md` F-4.
- The outline-editor and outline-row components are retired, along with their specs (the round-2 collapse and search tests move to the tree).

## 8. Visual Reference

- Source: screenshots in the chat (2026-11-24) plus the live Organizational Structure page (`/administration/center-admin/organizational-structure`).
- The dev-lead mockup (`../mockup/`) stays the reference for the panel content (header eyebrow, pill, derived ancestors). Its outline layout is **superseded** by this amendment.

## 9. Requirement Delta Preview

### MODIFIED
- **R-STF-007**: the "inline outline editor" becomes a "tree table + side details panel". The name is edited only in the panel with Save, Cancel and Delete. The rule that adding a child creates an inline draft becomes: adding a child opens the panel in create mode with the parent set.
- **R-STF-008**: selecting a row in the table view opens it in the side panel (it was the drawer).
- **R-STF-009 / design §6.6**: the IOB form lives in the side panel and the row edit action is removed.
- **NFR-STF-004**: the drawer focus trap is no longer needed, because the panel is not modal. New requirements:
  - selecting a row moves focus to the panel heading;
  - Cancel and Save return focus to the selected row;
  - rows are reachable by keyboard (Tab or arrow keys, Enter selects).

### REMOVED
- Inline name `<input>` and its state machine (§6.3), inline draft rows, the D-STF-17 / F-4 exception, and the `p-drawer` (§6.5) together with the Escape-overlay guard on the drawer.

### ADDED
- Empty-panel state, selected-row highlight, and **unsaved-changes guard**: when the form is dirty and another row is selected, the page asks before discarding (see Q-1).

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. `p-treeTable` + side panel, mirroring org-structure** | New `framework-tree` built on `p-treeTable`, with the column/row conventions of `org-tree`. Panels become non-modal content in an `<aside>`. | Same look and behaviour as Organizational Structure. Proven sticky panel (D-ORG-20). Panel internals and their tests are mostly reused. | The outline components and their tests are rewritten. Losing the area accent colours (D-STF-25) is a visual choice (Q-3). |
| B. Keep the outline and restyle it as a table | Restyle `outline-row` to look like rows and drop the input. | Smaller diff. | A fake table means weaker table semantics for a11y and a second tree pattern to maintain. |
| C. Share one generic tree-table component with org-structure | Extract `org-tree` to `shared/`. | One implementation. | Touches a finished, archived module (larger blast radius). Different data models. |

## 11. Recommended Approach

**Option A.** It matches the requested look exactly and keeps Organizational Structure untouched (narrow blast radius). Most of the work is moving the existing element and objective panels from `p-drawer` into an `<aside>`.

Proposed tasks, roughly 4:
1. Framework tree table.
2. Side panel hosting on Framework, both views.
3. Side panel on IOB.
4. Docs, family F-4 and the HITL re-check.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R-1 | This reopens UI already PASSed (T-13, T-15, T-16) and T-17 HITL. The commit `795c30084` is pushed, so the change goes on top with new commits (no rewrite). |
| R-2 | A 40 % panel next to a 4-column tree may be tight at 1280 px; the Indicators names are long. Re-measure live (KZ-017). |
| R-3 | KZ-015 / KZ-001: tests must drive row clicks and the panel's Save, not set signals. |
### Owner decisions (2026-11-24)

| # | Decision |
|---|---|
| Q-1 | **Ask before discarding.** Selecting another row, or starting a create, while the panel form is dirty asks *"Discard changes?"*. Cancel keeps the current row and its edits. |
| Q-2 | **Keep the search box** (*Find by code or name*) above the tree, with the round-2 behaviour: ancestors of matches stay visible and the expand state is restored when the search is cleared. |
| Q-3 | **Keep the area colours, inherited.** Each performance area keeps its `--ac-framework-accent-*` thin left bar, and **every descendant row under that area shows the same thin bar** (green area → green bar on all its dimensions and indicators). **Indentation per level must be clearly larger than in Organizational Structure**, where `rowNode.level * 16` px reads poorly at a glance. The exact step is set in design and checked live. |
| Q-4 | **Delete at the top of the panel**, red outlined, under the header, as in Organizational Structure. Cancel and Save stay at the bottom. |
| Q-5 | **The whole panel must fit the viewport.** It scrolls internally and the page never needs a scroll to reach its end. Organizational Structure has this defect: its panel scrolls inside **and** the section still has to scroll to show the rest. Measure the cause live in Organizational Structure (sticky `top` / `max-height` versus the header and the page padding) and fix it in the ODS Admin pages. Organizational Structure itself stays out of scope (narrow blast radius; see the open item below). |

Q-5 likely cause (`UNVERIFIED — confirm at source before relying on it`, to be measured live at specify):
- `organizational-structure.component.ts:83-84` sets `max-height: calc(100vh - (navbar + header + 32px))`. That height is only right once the panel is **stuck at its `top`**.
- In its resting position the panel starts lower, below the page title and the count chips. Its bottom then falls below the viewport until the section scrolls.

Open item for the owner (not blocking): whether to also fix the same Q-5 panel-height defect in Organizational Structure, as a separate `/akili-quick` or bugfix.

## 13. Success Criteria

- Framework shows a tree table visually matching Organizational Structure: chevrons, counts, code, level, responsibles and **+**. Names are plain text.
- Clicking any row, in the tree or in the table view, fills the right panel. Save updates the row without a reload, and Delete works from the panel.
- Institutional Objectives behaves the same with its flat table.
- No `p-drawer` and no inline name input remain under `ods-admin/`.
- Client tests are green and the build stays within the style budgets. The owner approves the look live in Chrome (KZ-017).

## 14. Next Step

After approval:

```text
/akili-specify institutional-performance/strategy-framework   (amendment: rev 4 — layout)
```

That command amends requirements, design and tasks (new T-18…T-22 — the design added a fifth task for the opt-in `DataTable` keyboard input) and `family.md` F-4. Then run `/akili-execute institutional-performance/strategy-framework`.
