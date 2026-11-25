import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdsEmptyPanelComponent, OdsEmptyRow } from '../ods-empty-panel/ods-empty-panel.component';
import { SidePanelLayoutComponent } from './side-panel-layout.component';

// @akili-spec institutional-performance/strategy-framework T-19 — §6.9.
// jsdom cannot judge the 60/40 widths, the 280px row, or viewport fit (KZ-017).

@Component({
  selector: 'app-side-panel-layout-host',
  standalone: true,
  imports: [SidePanelLayoutComponent],
  template: `
    <app-side-panel-layout [hasSelection]="selected" [creating]="creating" panelLabel="Element details">
      <div list data-testid="list-slot">List</div>
      <div panel data-testid="panel-slot">Panel</div>
    </app-side-panel-layout>
  `
})
class HostComponent {
  selected = false;
  creating = false;
}

const FOUR_ROWS: OdsEmptyRow[] = [
  {
    depth: 1,
    icon: 'pi pi-th-large',
    label: '4 Performance Areas',
    description: 'Strategic performance areas of the portfolio.',
    accent: true
  },
  { depth: 2, icon: 'pi pi-sitemap', label: '13 Dimensions', description: 'Dimensions within each area.', accent: false },
  {
    depth: 3,
    icon: 'pi pi-chart-bar',
    label: '31 Indicators',
    description: 'Indicators, their details and responsibles.',
    accent: false
  },
  { depth: 4, icon: 'pi pi-chart-bar', label: '2 Sub-indicators', description: 'Elements at this level.', accent: false }
];

@Component({
  selector: 'app-side-panel-layout-rich-host',
  standalone: true,
  imports: [SidePanelLayoutComponent, OdsEmptyPanelComponent],
  template: `
    <app-side-panel-layout [hasSelection]="selected" [creating]="creating" panelLabel="Element details">
      <div list data-testid="list-slot">List</div>
      <app-ods-empty-panel
        circleIcon="pi pi-sitemap"
        title="Explore the performance framework"
        subtitle="Select an item from the hierarchy to see its details and actions."
        [rows]="rows" />
      <div panel data-testid="panel-slot">Panel</div>
    </app-side-panel-layout>
  `
})
class RichHostComponent {
  selected = false;
  creating = false;
  rows = FOUR_ROWS;
}

describe('SidePanelLayoutComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent, RichHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('shows the empty text in a labelled region until something is selected or created', () => {
    const panel = root().querySelector('[data-testid="side-panel"]');
    expect(panel?.tagName).toBe('ASIDE');
    expect(panel?.getAttribute('aria-label')).toBe('Element details');
    expect(root().querySelector('[data-testid="panel-empty"]')?.textContent?.trim()).toBe('Select an entry to see its details.');
    expect(root().querySelector('[data-testid="list-slot"]')?.textContent?.trim()).toBe('List');

    fixture.componentInstance.creating = true;
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="panel-empty"]')).toBeNull();
    expect(root().querySelector('[data-testid="panel-slot"]')?.textContent?.trim()).toBe('Panel');
  });

  it('gives the list slot the same card class as the panel', () => {
    const list = root().querySelector('.side-panel-layout__list') as HTMLElement;
    expect(list.classList.contains('side-panel-layout__card')).toBe(true);
    expect(list.querySelector('[data-testid="list-slot"]')?.textContent?.trim()).toBe('List');
    expect(root().querySelector('[data-testid="side-panel"]')?.classList.contains('side-panel-layout__card')).toBe(true);
  });

  it('wraps the empty state and the form in one card', () => {
    const panel = root().querySelector('[data-testid="side-panel"]') as HTMLElement;
    expect(panel.classList.contains('side-panel-layout__card')).toBe(true);
    expect(panel.querySelector('[data-testid="panel-empty"]')).not.toBeNull();
    expect(panel.querySelector('[data-testid="panel-slot"]')).not.toBeNull();

    fixture.componentInstance.selected = true;
    fixture.detectChanges();
    expect(panel.classList.contains('side-panel-layout__card')).toBe(true);
    expect(panel.querySelector('[data-testid="panel-empty"]')).toBeNull();
    expect(panel.querySelector('[data-testid="panel-slot"]')?.textContent?.trim()).toBe('Panel');
  });

  it('projects the empty panel in place of the fallback text', () => {
    const rich = TestBed.createComponent(RichHostComponent);
    rich.detectChanges();
    const element = rich.nativeElement as HTMLElement;
    const rows = Array.from(element.querySelectorAll('[data-testid="empty-level-row"]')) as HTMLElement[];

    expect(element.textContent).not.toContain('Select an entry to see its details.');
    expect(rows).toHaveLength(4);
    const rowText = rows.map(row => row.textContent ?? '');
    expect(rowText[0]).toContain('4 Performance Areas');
    expect(rowText[1]).toContain('13 Dimensions');
    expect(rowText[2]).toContain('31 Indicators');
    expect(rowText[3]).toContain('2 Sub-indicators');
    expect(rowText[3]).toContain('Elements at this level.');
    expect(element.querySelector('[data-testid="panel-empty"] button')).toBeNull();

    rich.componentInstance.creating = true;
    rich.detectChanges();
    expect(element.querySelector('[data-testid="panel-empty"]')).toBeNull();
    expect(element.querySelector('[data-testid="panel-slot"]')?.textContent?.trim()).toBe('Panel');
  });
});
