import { TestBed } from '@angular/core/testing';
import { PfmKpiCardsComponent } from './pfm-kpi-cards.component';
import { PfmKpis } from '../../pfm.interfaces';

// Distinct value per card so a swapped binding is visible (KZ-001, KZ-004).
const KPIS: PfmKpis = { projects: 4, projects_total: 1197, monitored: 31, need_attention: 7, synced: 11, in_prms_scope: 26 };

function render() {
  const fixture = TestBed.createComponent(PfmKpiCardsComponent);
  fixture.componentRef.setInput('kpis', KPIS);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const text = (key: string, part: string) => el.querySelector(`[data-testid="pfm-kpi-${key}"] [data-testid="pfm-kpi-${part}"]`)?.textContent?.trim();
  return { el, text };
}

describe('PfmKpiCardsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PfmKpiCardsComponent] }));

  it('renders three cards (no projects card) with the DOM values and labels', () => {
    const { el, text } = render();
    expect(el.querySelectorAll('li')).toHaveLength(3);
    expect(el.querySelector('[data-testid="pfm-kpi-projects"]')).toBeNull();
    expect(text('monitored', 'value')).toBe('31');
    expect(text('need_attention', 'value')).toBe('7');
    expect(text('synced', 'value')).toBe('11');
    expect(text('monitored', 'label')).toBe('Results eligible for CGIAR Portfolio mapping');
    expect(text('need_attention', 'label')).toBe('Need attention');
    expect(text('synced', 'label')).toBe('Synced with PRMS');
  });

  it('sub-lines', () => {
    const { text } = render();
    expect(text('synced', 'sub')).toBe('of 26 in PRMS scope');
    expect(text('monitored', 'sub')).toBe('can be mapped and synced');
    expect(text('need_attention', 'sub')).toBe('nothing in PRMS yet');
  });

  it('card 2 binds the navy accent token, not the light-blue segment token', () => {
    const { el } = render();
    const cls = el.querySelector('[data-testid="pfm-kpi-monitored"]')?.className ?? '';
    expect(cls).toContain('--ac-pfm-accent-navy');
    expect(cls).not.toContain('--ac-pfm-seg-ready');
  });
});
