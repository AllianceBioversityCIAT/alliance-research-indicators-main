import { TestBed } from '@angular/core/testing';
import { PfmSpCoverageCardComponent } from './pfm-sp-coverage-card.component';
import { PfmScope, PfmSpCoverage } from '../../pfm.interfaces';

const ROWS: PfmSpCoverage[] = [
  { code: 'SP01', name: 'Breeding for Tomorrow', synced: 5, total: 40 },
  { code: 'SP02', name: 'Sustainable Farming', synced: 10, total: 20 }
];

function render(scope: PfmScope) {
  const fixture = TestBed.createComponent(PfmSpCoverageCardComponent);
  fixture.componentRef.setInput('rows', ROWS);
  fixture.componentRef.setInput('scope', scope);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (sel: string) => el.querySelector(sel)?.textContent?.trim();
  return { el, q };
}

describe('PfmSpCoverageCardComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PfmSpCoverageCardComponent] }));

  it('renders "{code} — {name}" and "{synced} / {total}" per row, in server order', () => {
    const { el, q } = render('all');
    expect(el.querySelectorAll('li')).toHaveLength(2);
    expect(q('[data-testid="pfm-sp-row-SP01"] [data-testid="pfm-sp-label"]')).toBe('SP01 — Breeding for Tomorrow');
    expect(q('[data-testid="pfm-sp-row-SP01"] [data-testid="pfm-sp-count"]')).toBe('5 / 40');
    expect(q('[data-testid="pfm-sp-row-SP02"] [data-testid="pfm-sp-count"]')).toBe('10 / 20');
  });

  it('Portfolio copy, with a line on how to read the chart', () => {
    const { q } = render('all');
    expect(q('[data-testid="pfm-sp-sub"]')).toBe('Results mapped to each program, and how many are already in PRMS');
    expect(q('[data-testid="pfm-sp-how"]')).toContain('Green = already in PRMS, grey = not in PRMS yet');
    expect(q('[data-testid="pfm-sp-legend-synced"]')).toBe('In PRMS');
    expect(q('[data-testid="pfm-sp-legend-unsynced"]')).toBe('Not in PRMS yet');
  });

  it('PI copy', () => {
    const { q } = render('mine');
    expect(q('[data-testid="pfm-sp-sub"]')).toBe('Your results mapped to each program, and how many are already in PRMS');
  });

  // The bug: a fixed-width grey track behind every bar left a filler that read as a third state.
  it('draws no track behind a bar: the bar cell has no background, only the bar as long as its total', () => {
    const { el } = render('all');
    const total = el.querySelector<HTMLElement>('[data-testid="pfm-sp-row-SP02"] [data-testid="pfm-sp-total-bar"]')!;
    const cell = total.parentElement!;
    expect(cell.className).not.toMatch(/\bbg-/);
    expect(cell.style.backgroundColor).toBe('');
    // synced (green) + not synced (grey) are the two segments of THIS bar. jsdom drops var() colours
    // from the CSSOM, so assert the values the template binds.
    const fixture = TestBed.createComponent(PfmSpCoverageCardComponent);
    expect(fixture.componentInstance.syncedFill).toBe('var(--ac-state-done-fill)');
    expect(fixture.componentInstance.unsyncedFill).toBe('var(--ac-state-empty)');
    expect(total.querySelector('[data-testid="pfm-sp-synced-bar"]')).not.toBeNull();
  });

  // Data binding only: real rendered proportion is a HITL visual check.
  it('binds widths: outer = total / max total, inner = synced / own total (data binding)', () => {
    const { el } = render('all');
    const w = (code: string, bar: string) => el.querySelector<HTMLElement>(`[data-testid="pfm-sp-row-${code}"] [data-testid="${bar}"]`)?.style.width;
    expect(w('SP01', 'pfm-sp-total-bar')).toBe('100%');
    expect(w('SP02', 'pfm-sp-total-bar')).toBe('50%');
    expect(w('SP01', 'pfm-sp-synced-bar')).toBe('12.5%');
    expect(w('SP02', 'pfm-sp-synced-bar')).toBe('50%');
  });
});
