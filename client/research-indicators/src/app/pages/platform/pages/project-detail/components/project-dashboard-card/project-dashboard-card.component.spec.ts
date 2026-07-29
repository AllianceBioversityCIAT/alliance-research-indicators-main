// @sdd-spec docs/specs/project-dashboard/full-payload-show-more (T-04)
//
// This is the ONLY place R-PDB-002 (collapsed top-5), R-PDB-003 (in-place
// expansion) and R-PDB-004 (encoding invariance) can be gated (KZ-001,
// recurrence 4). `project-dashboard.component.spec.ts` replaces this
// component with `ProjectDashboardCardStubComponent`, so nothing asserted
// there about expansion is meaningful. Every case below therefore:
//   - instantiates the REAL `ProjectDashboardCardComponent` (no stub, no
//     mock, no `NO_ERRORS_SCHEMA`);
//   - reads styles, attributes and text off the RENDERED DOM, never by
//     re-calling a production helper (`projectDashboardBarColor`, etc.) —
//     see the "evidence that does not count" note in tasks.md § T-02/T-04.
//
// Fixture policy (client guide: never reinvent fixtures): the T-01 fixture
// `mockContractFullReports()` is the only source of section data. It is a
// `ContractFullReports` *payload*; the card consumes
// `ProjectDashboardRankedListItem[]` (`{ id, label, count }`), so the
// mapper functions below translate payload sections into card items.
// Where a case needs more rows than the fixture carries (the R-PDB-004
// invariance case and the DC-6 `columns` track-count case), the extra rows
// are DERIVED from the fixture's real partner records (`deriveLargeRankedList`)
// rather than hand-rolled as an unrelated dataset.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractFullReports } from '@interfaces/contract-full-reports.interface';
import { ProjectDashboardRankedListItem } from '@interfaces/project-dashboard.interface';
import { PROJECT_DASHBOARD_RANK_BAR_COLORS } from '@shared/constants/project-dashboard-chart-colors.constants';
import { mockContractFullReports } from 'src/app/testing/contract-full-reports.mock';
import { ProjectDashboardCardComponent } from './project-dashboard-card.component';

// ---------------------------------------------------------------------------
// Fixture → card-item mappers (T-01 fixture is a ContractFullReports payload;
// the card consumes ProjectDashboardRankedListItem[]).
// ---------------------------------------------------------------------------

function toPartnerItems(reports: ContractFullReports): ProjectDashboardRankedListItem[] {
  return reports.top_partners.map(partner => ({
    id: String(partner.institution_id),
    label: partner.acronym ?? partner.institution_name,
    count: partner.count
  }));
}

function toPrimaryLeverItems(reports: ContractFullReports): ProjectDashboardRankedListItem[] {
  return reports.top_primary_levers.map(lever => ({
    id: String(lever.lever_id),
    label: lever.short_name,
    count: lever.count
  }));
}

/**
 * Derives a large, strictly-descending ranked list from the T-01 fixture's
 * partner section (7 real institutions) by cycling through it, rather than
 * hand-rolling an unrelated dataset. Used by cases that need more rows than
 * the fixture itself carries: the R-PDB-004 invariance case (needs > 5 with
 * a clear "middle" vs "last" rank) and the DC-6 `columns` track-count case
 * (needs 40 per the task brief). Counts are unique and descending so
 * `maxCount()`-derived widths are unambiguous.
 */
function deriveLargeRankedList(size: number): ProjectDashboardRankedListItem[] {
  const base = toPartnerItems(mockContractFullReports());
  return Array.from({ length: size }, (_, index) => {
    const source = base[index % base.length];
    return { id: `${source.id}-derived-${index}`, label: source.label, count: size - index };
  });
}

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ---------------------------------------------------------------------------
// DOM query helpers — all read the RENDERED element, never the template
// source and never a re-computed value from the production helper under test.
// ---------------------------------------------------------------------------

function getToggleButton(fixture: ComponentFixture<ProjectDashboardCardComponent>): HTMLButtonElement | null {
  return fixture.nativeElement.querySelector('button[aria-expanded]');
}

function getBoundedContainer(fixture: ComponentFixture<ProjectDashboardCardComponent>): HTMLElement | null {
  return fixture.nativeElement.querySelector('.overflow-visible');
}

/** Reads rendered bar colour + width for `rows-partners` rows, in rendered order. */
function getPartnerBarStyles(fixture: ComponentFixture<ProjectDashboardCardComponent>): { color: string; width: string }[] {
  const bars: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('li [style*="background-color"]');
  return Array.from(bars).map(bar => ({ color: bar.style.backgroundColor, width: bar.style.width }));
}

function getRenderedListItemCount(fixture: ComponentFixture<ProjectDashboardCardComponent>): number {
  return fixture.nativeElement.querySelectorAll('ul > li').length;
}

describe('ProjectDashboardCardComponent', () => {
  let component: ProjectDashboardCardComponent;
  let fixture: ComponentFixture<ProjectDashboardCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDashboardCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDashboardCardComponent);
    component = fixture.componentInstance;
  });

  // ---- Pre-existing presentational-contract coverage (kept) -------------

  it('should calculate counts and percentages for max-based layouts', () => {
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 10 },
      { id: 'b', label: 'B', count: 5 }
    ]);
    fixture.componentRef.setInput('layout', 'columns');
    fixture.detectChanges();

    expect(component.maxCount()).toBe(10);
    expect(component.totalCount()).toBe(15);
    expect(component.fillPercent(10)).toBe(100);
    expect(component.fillPercent(5)).toBe(50);
    expect(component.fillPercent(0)).toBe(0);
  });

  it('should format linked results label', () => {
    expect(component.linkedResultsLabel(1)).toBe('1 result');
    expect(component.linkedResultsLabel(4)).toBe('4 results');
  });

  it('should calculate percentages for total-based layouts', () => {
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 8 },
      { id: 'b', label: 'B', count: 2 }
    ]);
    fixture.componentRef.setInput('layout', 'rows-stacked');
    fixture.detectChanges();

    expect(component.fillPercent(8)).toBe(80);

    fixture.componentRef.setInput('layout', 'rows-stacked-lever');
    fixture.detectChanges();
    expect(component.fillPercent(2)).toBe(20);

    fixture.componentRef.setInput('layout', 'rows');
    fixture.detectChanges();
    expect(component.fillPercent(10)).toBe(100);
  });

  it('should handle empty and fallback calculations', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(component.maxCount()).toBe(0);
    expect(component.fillPercent(10)).toBe(0);
    expect(component.partnerBarWidthPercent(10)).toBe(0);

    fixture.componentRef.setInput('items', [{ id: 'a', label: 'A', count: 4 }]);
    fixture.componentRef.setInput('layout', 'rows-partners');
    fixture.detectChanges();

    expect(component.partnerBarWidthPercent(4)).toBe(94);
    expect(component.partnerBarWidthPercent(0)).toBe(0);
    expect(component.fillPercent(4)).toBe(100);

    fixture.componentRef.setInput('items', [{ id: 'zero', label: 'Zero', count: 0 }]);
    fixture.componentRef.setInput('layout', 'rows');
    fixture.detectChanges();
    expect(component.fillPercent(1)).toBe(0);

    fixture.componentRef.setInput('items', [{ id: 'a', label: 'A', count: 5 }]);
    fixture.componentRef.setInput('layout', 'unknown-layout');
    fixture.detectChanges();
    expect(component.fillPercent(5)).toBe(100);

    fixture.componentRef.setInput('items', [{ id: 'a', label: 'A', count: 0 }]);
    fixture.componentRef.setInput('layout', 'unknown-layout');
    fixture.detectChanges();
    expect(component.fillPercent(5)).toBe(0);
  });

  it('should expose rank colors and render every state branch', () => {
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 4 },
      { id: 'b', label: 'B', count: 3 },
      { id: 'c', label: 'C', count: 2 },
      { id: 'd', label: 'D', count: 1 }
    ]);
    fixture.detectChanges();

    expect(component.barColor(0)).toBe('#358540');
    expect(component.barColor(3)).toBe('#112F5C');

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading chart');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Try again');

    fixture.componentRef.setInput('error', false);
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No data available');
  });

  // ---- R-PDB-002 AC.1 / AC.5 — slicing at visibleLimit=5 and at null ----

  describe('visibleLimit slicing (R-PDB-002 AC.1, AC.5)', () => {
    it('renders exactly 5 rows when visibleLimit=5 against a > 5-item section', () => {
      fixture.componentRef.setInput('items', toPartnerItems(mockContractFullReports())); // 7 items
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('layout', 'rows-partners');
      fixture.detectChanges();

      expect(getRenderedListItemCount(fixture)).toBe(5);
    });

    it('renders every item when visibleLimit=null', () => {
      const items = toPartnerItems(mockContractFullReports()); // 7 items
      fixture.componentRef.setInput('items', items);
      fixture.componentRef.setInput('visibleLimit', null);
      fixture.componentRef.setInput('layout', 'rows-partners');
      fixture.detectChanges();

      expect(getRenderedListItemCount(fixture)).toBe(items.length);
    });

    it('renders every item when visibleLimit is never bound (AC.5 — a card with no binding behaves as today)', () => {
      const items = toPartnerItems(mockContractFullReports()); // 7 items
      fixture.componentRef.setInput('items', items);
      fixture.componentRef.setInput('layout', 'rows-partners');
      // Deliberately no setInput('visibleLimit', ...) call — exercises the
      // `null` default that keeps the geographic card's three variant="list"
      // consumers byte-identical (DD-12).
      fixture.detectChanges();

      expect(getRenderedListItemCount(fixture)).toBe(items.length);
    });
  });

  // ---- R-PDB-002 AC.2 — toggle presence/absence ---------------------------

  describe('show more toggle presence/absence (R-PDB-002 AC.2)', () => {
    it('renders no toggle for a section of exactly 5 items', () => {
      fixture.componentRef.setInput('items', toPrimaryLeverItems(mockContractFullReports())); // exactly 5
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('layout', 'rows-stacked-lever');
      fixture.detectChanges();

      expect(getToggleButton(fixture)).toBeNull();
    });

    it('renders a toggle for a section of more than 5 items', () => {
      fixture.componentRef.setInput('items', toPartnerItems(mockContractFullReports())); // 7 items
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('layout', 'rows-partners');
      fixture.detectChanges();

      expect(getToggleButton(fixture)).not.toBeNull();
    });
  });

  // ---- DD-3 — toggle position pinned inside the state-chain arm ----------

  describe('toggle position inside the state-chain arm (DD-3)', () => {
    // These prove *position*, not just presence: `canExpand()` stays true in
    // all three cases (items().length > 5), so if the toggle were rendered
    // outside the `@else if (items().length)` arm — e.g. after the outer
    // state-chain <div> — it would still appear under loading/error/empty.
    // DD-3 requires it does not, because a shared-service retry sets
    // `loading` for all four cards while their section signals may still
    // hold data.
    const manyItems = toPartnerItems(mockContractFullReports()); // 7 items, canExpand() === true

    it('is absent while loading, even though items() already holds > 5 rows', () => {
      fixture.componentRef.setInput('items', manyItems);
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(getToggleButton(fixture)).toBeNull();
    });

    it('is absent while in the error state, even though items() already holds > 5 rows', () => {
      fixture.componentRef.setInput('items', manyItems);
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('error', true);
      fixture.detectChanges();

      expect(getToggleButton(fixture)).toBeNull();
    });

    it('is absent while flagged empty, even though items() already holds > 5 rows', () => {
      fixture.componentRef.setInput('items', manyItems);
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('empty', true);
      fixture.detectChanges();

      expect(getToggleButton(fixture)).toBeNull();
    });

    it('is present once none of loading/error/empty are set, for the same items/visibleLimit', () => {
      fixture.componentRef.setInput('items', manyItems);
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.detectChanges();

      expect(getToggleButton(fixture)).not.toBeNull();
    });
  });

  // ---- R-PDB-003 — expandToggled emission ---------------------------------

  describe('expandToggled emission (R-PDB-003)', () => {
    it('emits once when the toggle is activated', () => {
      fixture.componentRef.setInput('items', toPartnerItems(mockContractFullReports()));
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('layout', 'rows-partners');
      fixture.detectChanges();

      const emitted: void[] = [];
      component.expandToggled.subscribe(value => emitted.push(value));

      getToggleButton(fixture)!.click();

      expect(emitted.length).toBe(1);
    });
  });

  // ---- R-PDB-004 AC.1/AC.2/AC.3 — colour + width invariance (centrepiece) -

  describe('encoding invariance across expand/collapse (R-PDB-004 AC.1, AC.2, AC.3)', () => {
    // 37 rows, matching the requirements.md scenario, derived from the T-01
    // fixture's real partner records (not hand-rolled). Counts are strictly
    // descending and unique so widths are unambiguous.
    const largeList = deriveLargeRankedList(37);

    it('keeps the same bar colour and width for rows 1-5 after expanding, and the exact literal colours the note dictates', () => {
      fixture.componentRef.setInput('items', largeList);
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('layout', 'rows-partners');
      fixture.detectChanges();

      const collapsed = getPartnerBarStyles(fixture);
      expect(collapsed.length).toBe(5);

      // Note for the Tester (R-PDB-004): do NOT assert an absolute colour at
      // rank 5 as the `last` colour. The ramp is computed over the full
      // 37-item list, so row 5 (index 4) is `middle`, not `last`, in BOTH
      // states — asserting `last` here would be a test that cannot pass.
      expect(collapsed[4].color).toBe(hexToRgb(PROJECT_DASHBOARD_RANK_BAR_COLORS.middle));

      fixture.componentRef.setInput('visibleLimit', null);
      fixture.detectChanges();

      const expanded = getPartnerBarStyles(fixture);
      expect(expanded.length).toBe(37);

      // AC.1 / AC.2 — every row visible before expanding keeps the same
      // colour AND the same width after expanding.
      for (let i = 0; i < 5; i++) {
        expect(expanded[i].color).toBe(collapsed[i].color);
        expect(expanded[i].width).toBe(collapsed[i].width);
      }

      // Row 5 (index 4) is still `middle`, not `last`, now that the 37th
      // row is on screen and legitimately holds the `last` colour.
      expect(expanded[4].color).toBe(hexToRgb(PROJECT_DASHBOARD_RANK_BAR_COLORS.middle));
      expect(expanded[36].color).toBe(hexToRgb(PROJECT_DASHBOARD_RANK_BAR_COLORS.last));

      // AC.3 — collapsing restores the collapsed-state colours/widths exactly.
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.detectChanges();

      const recollapsed = getPartnerBarStyles(fixture);
      expect(recollapsed).toEqual(collapsed);
    });
  });

  // ---- R-PDB-003 AC.1 — rank continuity past 5 ----------------------------

  describe('rank continuity past 5 (R-PDB-003 AC.1)', () => {
    it('continues the rank badge past 5 once expanded, using rows-stacked-lever’s index+1 badge', () => {
      const largeList = deriveLargeRankedList(37);
      fixture.componentRef.setInput('items', largeList);
      fixture.componentRef.setInput('visibleLimit', null);
      fixture.componentRef.setInput('layout', 'rows-stacked-lever');
      fixture.detectChanges();

      const rows: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('ul > li');
      expect(rows.length).toBe(37);

      const badgeAt = (rowIndex: number) => rows[rowIndex].querySelector('span')?.textContent?.trim();

      expect(badgeAt(5)).toBe('6');
      expect(badgeAt(36)).toBe('37');
    });
  });

  // ---- DC-6 — columns layout: grid track count vs rendered cells ---------

  describe('columns layout track count equals rendered cells in both states (DC-6)', () => {
    it('matches visibleItems().length, not items().length, when collapsed and when expanded, for a 40-item section', () => {
      const largeList = deriveLargeRankedList(40);
      fixture.componentRef.setInput('items', largeList);
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.componentRef.setInput('layout', 'columns');
      fixture.detectChanges();

      const ulCollapsed: HTMLUListElement = fixture.nativeElement.querySelector('ul');
      const collapsedCellCount = getRenderedListItemCount(fixture);
      expect(collapsedCellCount).toBe(5);
      expect(ulCollapsed.style.gridTemplateColumns).toBe(`repeat(${collapsedCellCount}, minmax(0, 1fr))`);

      fixture.componentRef.setInput('visibleLimit', null);
      fixture.detectChanges();

      const ulExpanded: HTMLUListElement = fixture.nativeElement.querySelector('ul');
      const expandedCellCount = getRenderedListItemCount(fixture);
      expect(expandedCellCount).toBe(40);
      expect(ulExpanded.style.gridTemplateColumns).toBe(`repeat(${expandedCellCount}, minmax(0, 1fr))`);
    });
  });

  // ---- NFR-PDB-003 — toggle accessibility ---------------------------------

  describe('toggle accessibility (NFR-PDB-003)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('items', toPartnerItems(mockContractFullReports())); // 7 items
      fixture.componentRef.setInput('title', 'Results Partners');
      fixture.componentRef.setInput('layout', 'rows-partners');
    });

    it('sets aria-expanded to false when collapsed and true when expanded', () => {
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.detectChanges();
      expect(getToggleButton(fixture)!.getAttribute('aria-expanded')).toBe('false');

      fixture.componentRef.setInput('visibleLimit', null);
      fixture.detectChanges();
      expect(getToggleButton(fixture)!.getAttribute('aria-expanded')).toBe('true');
    });

    it('gives the toggle an accessible name that includes the chart title', () => {
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.detectChanges();

      const accessibleName = getToggleButton(fixture)!.getAttribute('aria-label');
      expect(accessibleName).toContain('Results Partners');
    });

    it('is a real, enabled <button> — the platform contract that makes it keyboard reachable and Enter/Space-operable', () => {
      // jsdom does not simulate the browser's native "Enter/Space on a
      // focused <button> dispatches a click" behaviour (verified: a
      // dispatched `keydown` with key 'Enter'/' ' on a bare <button> does
      // not fire a `click` listener in this test environment). The
      // platform guarantee that makes NFR-PDB-003's keyboard requirement
      // hold is that this is a semantic, enabled <button type="button">,
      // not a styled <div> — real browsers wire Enter/Space to `click` for
      // free for that element, and nothing else. So this case asserts the
      // semantic contract directly, then exercises the resulting `click`
      // path (the same path a real browser's Enter/Space activation uses).
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.detectChanges();

      const button = getToggleButton(fixture)!;
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.hasAttribute('disabled')).toBe(false);

      const emitted: void[] = [];
      component.expandToggled.subscribe(value => emitted.push(value));
      button.click();
      expect(emitted.length).toBe(1);
    });
  });

  // ---- NFR-PDB-004 condition 1 — bounded container, structural only -------

  describe('bounded scroll container (NFR-PDB-004 condition 1 — structural only, no rendered-layout claim)', () => {
    // jsdom computes no box model, so `overflow`/height propagation is
    // invisible here (DC-8). These cases assert only that the container
    // exists and is conditioned on `visibleLimit() === null`, per
    // tasks.md T-03/T-04 — nothing about the rendered outcome.
    beforeEach(() => {
      fixture.componentRef.setInput('items', toPartnerItems(mockContractFullReports())); // 7 items
      fixture.componentRef.setInput('layout', 'rows-partners');
    });

    it('is present without the bounding classes while collapsed (visibleLimit is a number)', () => {
      fixture.componentRef.setInput('visibleLimit', 5);
      fixture.detectChanges();

      const container = getBoundedContainer(fixture)!;
      expect(container).not.toBeNull();
      expect(container.classList.contains('max-h-[46vh]')).toBe(false);
      expect(container.classList.contains('overflow-y-auto')).toBe(false);
    });

    it('gains the bounding classes only when visibleLimit() === null', () => {
      fixture.componentRef.setInput('visibleLimit', null);
      fixture.detectChanges();

      const container = getBoundedContainer(fixture)!;
      expect(container).not.toBeNull();
      expect(container.classList.contains('max-h-[46vh]')).toBe(true);
      expect(container.classList.contains('overflow-y-auto')).toBe(true);
    });
  });

  // ---- variant="list" renders no toggle -----------------------------------

  describe('variant="list" (the geographic card’s contract)', () => {
    it('renders no toggle regardless of item count, and still renders its content', () => {
      const largeList = deriveLargeRankedList(10); // > COLLAPSED_ITEM_LIMIT
      fixture.componentRef.setInput('items', largeList);
      fixture.componentRef.setInput('variant', 'list');
      fixture.componentRef.setInput('layout', 'rows-partners');
      // No visibleLimit binding — mirrors the geographic card's three
      // variant="list" consumers (R-PDB-002 AC.5 / DD-12).
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button')).toBeNull();
      expect(fixture.nativeElement.querySelector('section')).toBeNull();
      expect(getRenderedListItemCount(fixture)).toBe(10);
    });
  });
});
