import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

describe('SidePanelLayoutComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
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
});
