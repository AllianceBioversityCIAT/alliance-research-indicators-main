import { TestBed } from '@angular/core/testing';
import { PfmPipelineCardComponent } from './pfm-pipeline-card.component';
import { PfmPipeline } from '../../pfm.interfaces';

// Distinct value per stage so a swapped binding is visible (KZ-001, KZ-004); rejected is 0.
const PIPELINE: PfmPipeline = {
  total: 100,
  in_scope: 95,
  not_synced: 60,
  in_prms: 33,
  out_of_scope: 5,
  stages: [
    { key: 'mapping_not_started', group: 'in_star', value: 20 },
    { key: 'mapping_incomplete', group: 'in_star', value: 15 },
    { key: 'ready_to_sync', group: 'in_star', value: 25 },
    { key: 'pending_review', group: 'in_prms', value: 11 },
    { key: 'approved', group: 'in_prms', value: 22 },
    { key: 'rejected', group: 'in_prms', value: 0 },
    { key: 'no_sp_contribution', group: 'out_of_scope', value: 5 }
  ]
};

function render(pipeline: PfmPipeline = PIPELINE) {
  const fixture = TestBed.createComponent(PfmPipelineCardComponent);
  fixture.componentRef.setInput('pipeline', pipeline);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (sel: string) => el.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim();
  return { el, q };
}

describe('PfmPipelineCardComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PfmPipelineCardComponent] }));

  it('renders header figures from the server values', () => {
    const { q } = render();
    expect(q('[data-testid="pfm-pipeline-total"]')).toBe('100');
    expect(q('[data-testid="pfm-pipeline-total-sub"]')).toBe('results · 95 in PRMS scope');
    const fig = (k: string, part: string) => q(`[data-testid="pfm-pipeline-fig-${k}"] [data-testid="pfm-fig-${part}"]`);
    expect(fig('not_synced', 'value')).toBe('60');
    expect(fig('not_synced', 'text')).toBe('in STAR, not synced yet · 60%');
    expect(fig('in_prms', 'value')).toBe('33');
    expect(fig('in_prms', 'text')).toBe('in PRMS · 33%');
    expect(fig('out_of_scope', 'value')).toBe('5');
    expect(fig('out_of_scope', 'text')).toBe('out of scope · 5%');
  });

  it('renders 7 stage tiles with label, group and value', () => {
    const { el, q } = render();
    expect(el.querySelectorAll('[data-testid="pfm-pipeline-stages"] > li')).toHaveLength(7);
    const tile = (k: string, part: string) => q(`[data-testid="pfm-stage-${k}"] [data-testid="pfm-stage-${part}"]`);
    expect(tile('mapping_not_started', 'label')).toBe('Mapping not started');
    expect(tile('mapping_not_started', 'value')).toBe('20');
    expect(tile('ready_to_sync', 'value')).toBe('25');
    expect(tile('pending_review', 'label')).toBe('Pending review in PRMS');
    expect(tile('approved', 'value')).toBe('22');
    expect(tile('approved', 'group')).toBe('In PRMS');
    expect(tile('rejected', 'value')).toBe('0');
    expect(tile('no_sp_contribution', 'group')).toBe('Out of scope');
    expect(tile('mapping_incomplete', 'group')).toBe('In STAR');
  });

  it('a zero stage renders no segment, so no zero-width element can take focus', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="pfm-segment-rejected"]')).toBeNull();
    expect(el.querySelectorAll('[data-testid="pfm-pipeline-bar"] li')).toHaveLength(6);
    // the zero stage keeps its tile with the value 0
    expect(el.querySelector('[data-testid="pfm-stage-rejected"]')).not.toBeNull();
  });

  // Data binding only: real proportional width is a HITL visual check (jsdom cannot lay out).
  it('binds flex-grow to the stage value (data binding, not proof of proportion)', () => {
    const { el } = render();
    const seg = el.querySelector<HTMLElement>('[data-testid="pfm-segment-ready_to_sync"]');
    expect(seg?.style.flexGrow).toBe('25');
  });
});
