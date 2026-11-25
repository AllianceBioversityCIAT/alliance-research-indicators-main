import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdsEmptyPanelComponent, OdsEmptyRow } from './ods-empty-panel.component';

// @akili-spec institutional-performance/strategy-framework T-23 — D-STF-39, R-STF-016.
// The page specs cover select and create. This one drives the panel DOM.

const FRAMEWORK_ROWS: OdsEmptyRow[] = [
  {
    depth: 1,
    icon: 'pi pi-th-large',
    label: '4 Performance Areas',
    description: 'Strategic performance areas of the portfolio.',
    accent: true
  },
  {
    depth: 2,
    icon: 'pi pi-sitemap',
    label: '2 Dimensions',
    description: 'Dimensions within each area.',
    accent: false
  },
  {
    depth: 3,
    icon: 'pi pi-chart-bar',
    label: '1 Indicators',
    description: 'Indicators, their details and responsibles.',
    accent: false
  },
  {
    depth: 4,
    icon: 'pi pi-chart-bar',
    label: '1 Sub-indicators',
    description: 'Elements at this level.',
    accent: false
  }
];

const OBJECTIVE_ROWS: OdsEmptyRow[] = [
  {
    icon: 'pi pi-flag',
    label: '3 Objectives · 2026',
    description: 'Institutional objectives for the selected year.',
    accent: false
  },
  {
    icon: 'pi pi-chart-bar',
    label: '2 Linked indicators',
    description: "Framework indicators linked to this year's objectives.",
    accent: false
  },
  {
    icon: 'pi pi-copy',
    label: 'Carry forward to 2027',
    description: "Copy this year's objectives into the next year.",
    accent: false
  }
];

describe('OdsEmptyPanelComponent', () => {
  let fixture: ComponentFixture<OdsEmptyPanelComponent>;

  const root = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(root().querySelectorAll('[data-testid="empty-level-row"]')) as HTMLElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OdsEmptyPanelComponent] }).compileComponents();
    fixture = TestBed.createComponent(OdsEmptyPanelComponent);
  });

  it('renders one row per level in depth order, including a fourth level', async () => {
    fixture.componentRef.setInput('rows', FRAMEWORK_ROWS);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="panel-empty"]')?.textContent).toContain('Explore the performance framework');
    expect(root().textContent).toContain('Select an item from the hierarchy to see its details and actions.');
    expect(rows()).toHaveLength(4);
    expect(rows().map(row => row.getAttribute('data-depth'))).toEqual(['1', '2', '3', '4']);
    expect(rows().map(row => row.querySelector('.ods-empty-panel__name')?.textContent?.trim())).toEqual([
      '4 Performance Areas',
      '2 Dimensions',
      '1 Indicators',
      '1 Sub-indicators'
    ]);
    expect(rows().map(row => row.querySelector('.ods-empty-panel__hint')?.textContent?.trim())).toEqual([
      'Strategic performance areas of the portfolio.',
      'Dimensions within each area.',
      'Indicators, their details and responsibles.',
      'Elements at this level.'
    ]);
    expect(rows().map(row => row.querySelector('i')?.className)).toEqual([
      'pi pi-th-large',
      'pi pi-sitemap',
      'pi pi-chart-bar',
      'pi pi-chart-bar'
    ]);
    expect(root().querySelector('button')).toBeNull();
    for (const row of rows()) {
      expect(row.tagName).toBe('LI');
      expect(row.hasAttribute('tabindex')).toBe(false);
      expect(row.querySelector('[tabindex]')).toBeNull();
    }
    root().querySelectorAll('i').forEach(icon => expect(icon.getAttribute('aria-hidden')).toBe('true'));
  });

  it('renders the objective copy and keeps every tile neutral', async () => {
    fixture.componentRef.setInput('circleIcon', 'pi pi-flag');
    fixture.componentRef.setInput('title', 'Explore the institutional objectives');
    fixture.componentRef.setInput('subtitle', 'Select an objective to see its statement, year and linked indicators.');
    fixture.componentRef.setInput('rows', OBJECTIVE_ROWS);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(root().querySelector('.ods-empty-panel__mark i')?.className).toContain('pi-flag');
    expect(root().textContent).toContain('Explore the institutional objectives');
    expect(root().textContent).toContain('Select an objective to see its statement, year and linked indicators.');
    expect(rows()).toHaveLength(3);
    expect(root().querySelector('.ods-empty-panel__tile--accent')).toBeNull();
    expect(root().querySelector('button')).toBeNull();
    for (const row of rows()) {
      expect(row.hasAttribute('tabindex')).toBe(false);
      expect(row.querySelector('[tabindex]')).toBeNull();
    }
    root().querySelectorAll('i').forEach(icon => expect(icon.getAttribute('aria-hidden')).toBe('true'));
  });
});
