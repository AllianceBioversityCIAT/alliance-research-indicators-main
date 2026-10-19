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

  it('Portfolio copy', () => {
    const { q } = render('all');
    expect(q('[data-testid="pfm-sp-sub"]')).toBe('Projects mapped to each program, and how many of them are already syncing');
    expect(q('[data-testid="pfm-sp-legend-synced"]')).toBe('Syncing to PRMS');
    expect(q('[data-testid="pfm-sp-legend-unsynced"]')).toBe('Not syncing');
  });

  it('PI copy', () => {
    const { q } = render('mine');
    expect(q('[data-testid="pfm-sp-sub"]')).toBe('Your results mapped to each program, and how many are already synced to PRMS');
    expect(q('[data-testid="pfm-sp-legend-synced"]')).toBe('Synced to PRMS');
    expect(q('[data-testid="pfm-sp-legend-unsynced"]')).toBe('Not synced');
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
