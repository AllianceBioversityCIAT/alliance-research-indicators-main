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
  prms_rejection_reasons: [{ reason: 'Wrong ToC', count: 2 }]
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
  it('opens with the progress bar, then our side vs. PRMS side, then the SP and sync activity detail', () => {
    const { el, q } = render(SUMMARY);
    const order = ['pfm-progress-card', 'pfm-alliance-card', 'pfm-prms-card', 'pfm-sp-card', 'pfm-sync-card'].map(id =>
      Array.from(el.querySelectorAll('[data-testid]')).indexOf(q(id) as Element)
    );
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // done = in PRMS (11) + out of scope (2) = 13 of 31
    expect(q('pfm-progress-percent')?.textContent?.trim()).toBe('41%');
    expect(el.querySelector('[data-testid="pfm-sp-row-SP06"] [data-testid="pfm-sp-count"]')?.textContent?.trim()).toBe('3 / 8');
    expect(el.querySelector('[data-testid="pfm-month-2026-07"] [data-testid="pfm-month-label"]')?.textContent?.trim()).toBe('Jul');
    expect(q('pfm-behind-P-1')).not.toBeNull();
    expect(q('pfm-prms-reasons')?.textContent).toContain('Wrong ToC');
  });

  it('the old multi-number pipeline card is gone', () => {
    const { q } = render(SUMMARY);
    expect(q('pfm-pipeline-card')).toBeNull();
    expect(q('pfm-pipeline-total')).toBeNull();
  });

  it('still renders when the server does not send project_progress / rejection reasons yet', () => {
    const { project_progress, prms_rejection_reasons, ...older } = SUMMARY;
    expect(project_progress && prms_rejection_reasons).toBeTruthy();
    const { q } = render(older);
    expect(q('pfm-progress-card')).not.toBeNull();
    expect(q('pfm-alliance-behind-empty')).not.toBeNull();
    expect(q('pfm-prms-reasons-empty')).not.toBeNull();
  });
});
