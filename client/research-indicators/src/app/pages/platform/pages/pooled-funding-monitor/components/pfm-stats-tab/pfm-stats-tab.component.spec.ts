import { TestBed } from '@angular/core/testing';
import { PfmStatsTabComponent } from './pfm-stats-tab.component';
import { PfmQueueTarget } from '../pfm-coverage-tab/pfm-coverage-tab.component';
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
  synced_by_type: [
    { id: 5, name: 'Knowledge Product', synced: 6 },
    { id: 4, name: 'Policy Change', synced: 3 },
    { id: 2, name: 'Innovation Development', synced: 2 }
  ],
  project_progress: [
    { code: 'P-1', name: 'One', lead_pi: 'Lead One', total: 20, done: 4, remaining: 16, to_map: 14, ready: 2, in_prms: 4, out_of_scope: 0, pending_review: 2, approved: 1, rejected: 1 }
  ],
  prms_rejection_reasons: [{ reason: 'Wrong ToC', count: 2 }],
  chip_counts: { all: 31, attention: 18, mapping: 12, ready: 3, prms_rejected: 3, synced: 9 }
};

function render(summary: PfmSummary) {
  TestBed.configureTestingModule({ imports: [PfmStatsTabComponent] });
  const fixture = TestBed.createComponent(PfmStatsTabComponent);
  fixture.componentRef.setInput('summary', summary);
  fixture.componentRef.setInput('scope', 'all');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, q: (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null };
}

describe('PfmStatsTabComponent', () => {
  it('shows the four charts two by two: Science Program, PRMS status, sync activity, then by type', () => {
    const { el, q } = render(SUMMARY);
    const order = ['pfm-sp-card', 'pfm-prms-status-card', 'pfm-sync-card', 'pfm-type-card'].map(id =>
      Array.from(el.querySelectorAll('[data-testid]')).indexOf(q(id) as Element)
    );
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(q('pfm-stats-tab')?.className).toContain('lg:grid-cols-2');
  });

  it('a click on a program or a PRMS status asks the page to open the queue on it', () => {
    const { fixture, q } = render(SUMMARY);
    const targets: PfmQueueTarget[] = [];
    fixture.componentInstance.openQueue.subscribe(t => targets.push(t));
    q('pfm-sp-open-SP06')!.click();
    q('pfm-prms-legend-rejected')!.click();
    expect(targets).toEqual([{ sp: 'SP06' }, { chip: 'rejected' }]);
  });

  it('a server without synced_by_type yet shows the by-type card empty, not broken', () => {
    const { synced_by_type, ...older } = SUMMARY;
    expect(synced_by_type).toBeTruthy();
    const { q } = render(older);
    expect(q('pfm-type-card')?.querySelector('[data-testid="pfm-empty-state"]')).not.toBeNull();
  });

  // Owner: an empty monitor must look the same everywhere.
  it('with no results every chart shows the same "Nothing yet" state', () => {
    const empty: PfmSummary = {
      ...SUMMARY,
      pipeline: { total: 0, in_scope: 0, not_synced: 0, in_prms: 0, out_of_scope: 0, stages: [] },
      sp_coverage: [],
      monthly: [{ month: '2026-09', synced: 0 }, { month: '2026-10', synced: 0 }],
      synced_this_year: 0,
      synced_by_type: []
    };
    const { el } = render(empty);
    for (const card of ['pfm-sp-card', 'pfm-prms-status-card', 'pfm-sync-card', 'pfm-type-card']) {
      expect(el.querySelector(`[data-testid="${card}"] [data-testid="pfm-empty-state"]`)?.textContent?.trim()).toBe('Nothing yet');
    }
    expect(el.querySelector('[data-testid="pfm-sync-bars"]')).toBeNull();
    expect(el.querySelector('[data-testid="pfm-sp-legend"]')).toBeNull();
  });
});
