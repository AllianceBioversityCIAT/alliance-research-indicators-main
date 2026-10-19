import { TestBed } from '@angular/core/testing';
import { PfmKpiCardsComponent } from './pfm-kpi-cards.component';
import { PfmKpis, PfmScope } from '../../pfm.interfaces';

// Distinct value per card so a swapped binding is visible (KZ-001, KZ-004).
const KPIS: PfmKpis = { projects: 4, projects_total: 1197, monitored: 31, need_attention: 7, synced: 11, in_prms_scope: 26 };

function render(scope: PfmScope) {
  const fixture = TestBed.createComponent(PfmKpiCardsComponent);
  fixture.componentRef.setInput('kpis', KPIS);
  fixture.componentRef.setInput('scope', scope);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const text = (key: string, part: string) => el.querySelector(`[data-testid="pfm-kpi-${key}"] [data-testid="pfm-kpi-${part}"]`)?.textContent?.trim();
  return { el, text };
}

describe('PfmKpiCardsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PfmKpiCardsComponent] }));

  it('renders four cards with the DOM values and labels', () => {
    const { el, text } = render('mine');
    expect(el.querySelectorAll('li')).toHaveLength(4);
    expect(text('projects', 'value')).toBe('4');
    expect(text('monitored', 'value')).toBe('31');
    expect(text('need_attention', 'value')).toBe('7');
    expect(text('synced', 'value')).toBe('11');
    expect(text('projects', 'label')).toBe('Projects contributing to Pool funding');
    expect(text('monitored', 'label')).toBe('Results eligible for Pool funding mapping');
    expect(text('need_attention', 'label')).toBe('Need attention');
    expect(text('synced', 'label')).toBe('Synced with PRMS');
  });

  it('PI scope sub-lines', () => {
    const { text } = render('mine');
    expect(text('projects', 'sub')).toBe('where you are PI');
    expect(text('synced', 'sub')).toBe('of 26 in PRMS scope');
    expect(text('monitored', 'sub')).toBe('can be mapped and synced');
    expect(text('need_attention', 'sub')).toBe('draft, pending mapping or pending sync');
  });

  it('portfolio scope sub-line uses the portfolio total', () => {
    const { text } = render('all');
    expect(text('projects', 'sub')).toBe('of 1,197 in portfolio');
  });

  it('card 2 binds the navy accent token, not the light-blue segment token', () => {
    const { el } = render('mine');
    const cls = el.querySelector('[data-testid="pfm-kpi-monitored"]')?.className ?? '';
    expect(cls).toContain('--ac-pfm-accent-navy');
    expect(cls).not.toContain('--ac-pfm-seg-ready');
  });
});
