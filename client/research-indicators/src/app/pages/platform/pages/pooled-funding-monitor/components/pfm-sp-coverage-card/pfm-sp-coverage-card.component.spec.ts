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
    expect(q('[data-testid="pfm-sp-how"]')).toContain('the dark blue part is what is already in PRMS');
    expect(q('[data-testid="pfm-sp-legend-synced"]')).toBe('In PRMS');
    expect(q('[data-testid="pfm-sp-legend-unsynced"]')).toBe('Not in PRMS yet');
  });

  it('PI copy', () => {
    const { q } = render('mine');
    expect(q('[data-testid="pfm-sp-sub"]')).toBe('Your results mapped to each program, and how many are already in PRMS');
  });

  it('fills in the section navy (not green) over the grey "not in PRMS yet" track', () => {
    const fixture = TestBed.createComponent(PfmSpCoverageCardComponent);
    // jsdom drops var() colours from the CSSOM, so assert the values the template binds.
    expect(fixture.componentInstance.syncedFill).toBe('var(--ac-pfm-accent-navy)');
    expect(fixture.componentInstance.unsyncedFill).toBe('var(--ac-state-empty)');
  });

  // Owner 2026-10-21: every bar is the same length (its own 100%) and fills with the share in PRMS.
  it('every bar has the same full length; the fill is synced / own total', () => {
    const { el } = render('all');
    const bar = (code: string, part: string) => el.querySelector<HTMLElement>(`[data-testid="pfm-sp-row-${code}"] [data-testid="${part}"]`)!;
    expect(bar('SP01', 'pfm-sp-total-bar').className).toContain('w-full');
    expect(bar('SP02', 'pfm-sp-total-bar').className).toContain('w-full');
    expect(bar('SP01', 'pfm-sp-total-bar').style.width).toBe('');
    expect(bar('SP01', 'pfm-sp-synced-bar').style.width).toBe('12.5%');
    expect(bar('SP02', 'pfm-sp-synced-bar').style.width).toBe('50%');
  });

  it('clicking a program asks to open the queue filtered by it', () => {
    const fixture = TestBed.createComponent(PfmSpCoverageCardComponent);
    fixture.componentRef.setInput('rows', ROWS);
    fixture.componentRef.setInput('scope', 'all');
    fixture.detectChanges();
    const codes: string[] = [];
    fixture.componentInstance.openSp.subscribe(c => codes.push(c));
    (fixture.nativeElement.querySelector('[data-testid="pfm-sp-open-SP02"]') as HTMLElement).click();
    expect(codes).toEqual(['SP02']);
  });

  it('a program with no results has an empty fill and nothing unsynced', () => {
    const fixture = TestBed.createComponent(PfmSpCoverageCardComponent);
    fixture.componentRef.setInput('rows', [{ code: 'SP03', name: 'Empty', synced: 0, total: 0 }]);
    fixture.componentRef.setInput('scope', 'all');

    expect(fixture.componentInstance.view()[0]).toEqual(expect.objectContaining({ unsynced: 0, wSynced: '0%' }));
  });

  it('synced is capped at the total', () => {
    const fixture = TestBed.createComponent(PfmSpCoverageCardComponent);
    fixture.componentRef.setInput('rows', [{ code: 'SP04', name: 'Over', synced: 9, total: 4 }]);
    fixture.componentRef.setInput('scope', 'all');

    expect(fixture.componentInstance.view()[0]).toEqual(expect.objectContaining({ unsynced: 0, wSynced: '100%' }));
  });
});
