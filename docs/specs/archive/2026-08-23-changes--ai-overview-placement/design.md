# Design — Changes / Executive Overview Clear Placement (`ai-overview-placement`)

- **Module:** changes (STAR client — `project-dashboard`)
- **Spec id:** 2026-08-ai-overview-placement · **Status:** draft · **Depth:** Lite
- **Owner:** j.cadavid@cgiar.org · **Last updated:** 2026-08-22
- **Linked requirements:** ./requirements.md

**Goals:** move summary presentation high on the dashboard (R-AIP-001), keep absence silent and admin setup untouched (R-AIP-002), fence D-PD-9 (R-AIP-003). **Non-goals:** any service/API/generation-flow change; new child components; token changes.

> **KZ-016 cross-check:** read back against every `BUT NOT` / `AND IT MUST` clause and the touched module's constraints — the D-PD-9 `[hidden]`-never-`@if` rule, the existing spec fixtures pinning it, and the caveat-banner idiom (D-PD-8) this design reuses. No contradiction found.

## Architecture (template-local; no new files)

All changes live in `project-dashboard.component.{ts,html,spec.ts}`:

1. **New top card** — a `<section>` inserted adjacent to `<app-project-context-strip>` (default: immediately **after** it, before the charts grid; HITL may flip to before it — OQ-1). Rendered when a summary exists (any role). Content: title, "Generated on" date, "Grounded AI Summary" pill, first paragraph; **View more** expands remaining paragraphs + the "Generated from" source-docs list. Markup relocated/compacted from today's bottom presentation card (template lines ~592–642); existing token/utility classes only.
2. **Bottom section becomes setup-only** — header renamed "AI Grounding & Setup"; the presentation card inside the `[hidden]` panel is removed; everything else (upload, generate, doc list, progress-on-collapsed-header, auto-expand, `[hidden]` mechanics) byte-identical.
3. **Component state** — one new signal for the View more toggle; presence computeds split so each surface has its own gate (see DDs). Entry-stagger constant gets one new key for the card, following the sibling pattern.

## State gates (semantics locked)

| Surface | Gate |
|---|---|
| Top card | `hasExecutiveOverviewData()` — data only; no loading/error surface up top (initial load stays silent for non-admins, exactly as today's non-admin branch) |
| Bottom admin section | `isAdmin && (hasGroundedDocuments \|\| executiveOverviewLoading \|\| executiveOverviewError \|\| hasExecutiveOverviewData)` — **identical to today's admin branch** of `showExecutiveOverview`, so section presence for admins never changes; only its contents shrink |

## Design decisions

| # | Decision | Rationale |
|---|---|---|
| D-AIP-1 | Template-local restructure, **no new child component** | Lite scope; extraction adds files/specs for one consumer. Revisit only if the dashboard component is refactored wholesale |
| D-AIP-2 | Default placement **after** the Project Context strip | The summary *is* project context; grouping beats interleaving with KPIs. OQ-1's alternative compared live at HITL — a one-line move either way |
| D-AIP-3 | View more reuses the caveat banner's Learn-more idiom (D-PD-8): plain text button, `aria-expanded` + `aria-controls` | Established pattern on the same page; no new overlay/component |
| D-AIP-4 | "Generated from" source list renders only when expanded | Compact card stays compact; provenance one click away |
| D-AIP-5 | Bottom-section admin gate keeps `hasExecutiveOverviewData` in the OR (even though presentation moved out) | Preserves "exactly as-is" section presence for admins (R-AIP-002 `AND IT MUST`); dropping it would hide the section for an admin whose docs were removed after generation — an unrequested behavior change |
| D-AIP-6 | `showExecutiveOverview` computed is split/renamed per the gates above; its non-D-PD-9 spec tests (spec lines ~636–655) are realigned — **site list derived from the failing run, not grep (K-018)** | The computed's old union semantics no longer name one surface |

### Step 2.3 — Reversion challenge

| Removed | What breaks? | Outcome |
|---|---|---|
| Presentation card inside the bottom `[hidden]` panel | Admins lose the in-panel view — but the top card shows in every state where the panel showed data. Spec tests asserting the old computed realign under D-AIP-6; **D-PD-9 tests are structurally untouched** (they target the file input / `[hidden]` container / auto-expand, none of which move) | **Accepted** |
| "& Executive Overview" from the bottom header title | One `aria-labelledby` heading string; no test pins the exact title text (verified via the existing spec's selectors — they query `aria-labelledby="ai-grounding-section-title"`, id unchanged) | **Accepted** |

### Step 2.4 — Budget (tripwire)

**2 tasks · ~150 net LOC · 1 review round.** Matches Lite — no depth change.

## Testing strategy

- **Four-cell rendered-DOM matrix** (R-AIP-002): each cell asserts card/section presence in `fixture.nativeElement`, not computeds alone (KZ-001). **KZ-015:** arrange the product transition — construct with no summary, first `detectChanges()`, assert absence, *then* feed the summary signals and assert appearance.
- **DOM-order assertion:** top card node precedes the charts grid node (`compareDocumentPosition`) — the rendered form of "high on the page" that jsdom *can* check; visual prominence itself is HITL's.
- View more: collapsed shows exactly one paragraph node; expanded shows all + source list; `aria-expanded` flips.
- D-PD-9 suite runs **unmodified** — its green is only meaningful because it was once observed failing (K-004 heritage from the redesign spec).
- Gates: `npm test` (full; targeted runs `--coverage=false`, K-020) · `npm run build` · `npx tsc -p tsconfig.spec.json --noEmit` vs 945 baseline · HITL browser check (placement A/B, light+dark, keyboard on View more).

## Rollout

No flag; template-only; backout = git revert. No server, data, security, or observability impact.
