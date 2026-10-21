import { TestBed } from '@angular/core/testing';
import { PfmCoverageTabComponent } from './pfm-coverage-tab.component';
import { PfmSummary } from '../../pfm.interfaces';

const SUMMARY: PfmSummary = {
  scope: 'all',
  is_pi_of_any: true,
  kpis: { projects: 4, projects_total: 9, monitored: 31, need_attention: 7, synced: 11, in_prms_scope: 26 },
  pipeline: {
    total: 31,
    in_scope: 29,
    not_synced: 18,
    in_prms: 11,
    out_of_scope: 2,
    stages: [
      { key: 'mapping_not_started', group: 'in_star', value: 10 },
      { key: 'mapping_incomplete', group: 'in_star', value: 5 },
      { key: 'ready_to_sync', group: 'in_star', value: 3 },
      { key: 'pending_review', group: 'in_prms', value: 4 },
      { key: 'approved', group: 'in_prms', value: 5 },
      { key: 'rejected', group: 'in_prms', value: 2 },
      { key: 'no_sp_contribution', group: 'out_of_scope', value: 2 }
    ]
  },
  sp_coverage: [{ code: 'SP06', name: 'Climate Action', synced: 3, total: 8 }],
  monthly: [{ month: '2026-07', synced: 3 }],
  synced_this_year: 11,
  project_progress: [
    { code: 'P-1', name: 'One', lead_pi: 'Lead One', total: 20, done: 4, remaining: 16, to_map: 14, ready: 2, in_prms: 4, out_of_scope: 0, pending_review: 2, approved: 1, rejected: 1 }
  ],
  prms_rejection_reasons: [{ reason: 'Wrong ToC', count: 2 }],
  chip_counts: { all: 31, attention: 18, mapping: 12, ready: 3, prms_rejected: 3, synced: 9 }
};

function render(summary: PfmSummary) {
  TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
  const fixture = TestBed.createComponent(PfmCoverageTabComponent);
  fixture.componentRef.setInput('summary', summary);
  fixture.componentRef.setInput('scope', 'all');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, q: (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null };
}

describe('PfmCoverageTabComponent', () => {
  it('leads with what is in PRMS, then what to do next, then the SP and sync activity detail', () => {
    const { el, q } = render(SUMMARY);
    const order = ['pfm-progress-card', 'pfm-next-steps-card', 'pfm-sp-card', 'pfm-sync-card'].map(id =>
      Array.from(el.querySelectorAll('[data-testid]')).indexOf(q(id) as Element)
    );
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // synced 9 of 9 + 18 need attention
    expect(q('pfm-progress-percent')?.textContent?.trim()).toBe('33%');
    expect(q('pfm-progress-open-attention')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('18 need action');
    expect(el.querySelector('[data-testid="pfm-next-mapping_incomplete"] [data-testid="pfm-next-value"]')?.textContent?.trim()).toBe('12');
  });

  it('the old multi-colour charts are gone', () => {
    const { q } = render(SUMMARY);
    expect(q('pfm-alliance-card')).toBeNull();
    expect(q('pfm-prms-card')).toBeNull();
    expect(q('pfm-pipeline-card')).toBeNull();
  });

  it('every click asks the page to open the queue: quick view from the cards, SP filter from a program', () => {
    TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
    const fixture = TestBed.createComponent(PfmCoverageTabComponent);
    fixture.componentRef.setInput('summary', SUMMARY);
    fixture.componentRef.setInput('scope', 'all');
    fixture.detectChanges();
    const targets: unknown[] = [];
    fixture.componentInstance.openQueue.subscribe(t => targets.push(t));
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('[data-testid="pfm-progress-open-attention"]') as HTMLElement).click();
    (el.querySelector('[data-testid="pfm-next-ready_to_sync"]') as HTMLElement).click();
    (el.querySelector('[data-testid="pfm-sp-open-SP06"]') as HTMLElement).click();
    expect(targets).toEqual([{ chip: 'need_attention' }, { chip: 'ready_to_sync' }, { sp: 'SP06' }]);
  });

  it('falls back to the KPI figures when the server does not send chip_counts yet', () => {
    const { chip_counts, ...older } = SUMMARY;
    expect(chip_counts).toBeTruthy();
    const { q } = render(older);
    // kpis: synced 11, need_attention 7
    expect(q('pfm-progress-open-synced')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('11 in PRMS');
    expect(q('pfm-progress-open-attention')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('7 need action');
  });
});
