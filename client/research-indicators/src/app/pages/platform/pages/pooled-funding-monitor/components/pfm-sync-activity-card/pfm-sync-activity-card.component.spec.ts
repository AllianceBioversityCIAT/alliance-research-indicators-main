import { TestBed } from '@angular/core/testing';
import { PfmSyncActivityCardComponent } from './pfm-sync-activity-card.component';
import { PfmMonthly, PfmScope } from '../../pfm.interfaces';

const MONTHLY: PfmMonthly[] = [
  { month: '2026-02', synced: 26 },
  { month: '2026-03', synced: 0 },
  { month: '2026-04', synced: 13 },
  { month: '2026-05', synced: 52 },
  { month: '2026-06', synced: 39 },
  { month: '2026-07', synced: 7 }
];

function render(scope: PfmScope) {
  const fixture = TestBed.createComponent(PfmSyncActivityCardComponent);
  fixture.componentRef.setInput('monthly', MONTHLY);
  fixture.componentRef.setInput('syncedThisYear', 1641);
  fixture.componentRef.setInput('scope', scope);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (sel: string) => el.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim();
  return { el, q };
}

describe('PfmSyncActivityCardComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PfmSyncActivityCardComponent] }));

  it('renders six bars with month labels and values', () => {
    const { el, q } = render('all');
    expect(el.querySelectorAll('[data-testid="pfm-sync-bars"] li')).toHaveLength(6);
    expect(q('[data-testid="pfm-month-2026-02"] [data-testid="pfm-month-label"]')).toBe('Feb');
    expect(q('[data-testid="pfm-month-2026-07"] [data-testid="pfm-month-label"]')).toBe('Jul');
    expect(q('[data-testid="pfm-month-2026-05"] [data-testid="pfm-month-value"]')).toBe('52');
    expect(q('[data-testid="pfm-sync-card"] h2')).toBe('Sync activity');
  });

  it('a month without syncs still renders its label and a zero-height bar', () => {
    const { el, q } = render('all');
    expect(q('[data-testid="pfm-month-2026-03"] [data-testid="pfm-month-label"]')).toBe('Mar');
    expect(el.querySelector<HTMLElement>('[data-testid="pfm-month-2026-03"] [data-testid="pfm-month-bar"]')?.style.height).toBe('0%');
  });

  // Data binding only: real rendered bar height is a HITL visual check.
  it('binds height = value / max (data binding, not proof of proportion)', () => {
    const { el } = render('all');
    const h = (m: string) => el.querySelector<HTMLElement>(`[data-testid="pfm-month-${m}"] [data-testid="pfm-month-bar"]`)?.style.height;
    expect(h('2026-05')).toBe('100%');
    expect(h('2026-04')).toBe('25%');
  });

  it('footer switches with scope', () => {
    expect(render('all').q('[data-testid="pfm-sync-foot"]')).toBe('1,641 results synced in 2026');
    expect(render('mine').q('[data-testid="pfm-sync-foot"]')).toBe('1,641 of your results synced in 2026');
  });
});
