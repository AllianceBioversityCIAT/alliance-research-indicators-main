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
  it('leads with what is in PRMS, then what to do next; the charts live in the Stats tab', () => {
    const { el, q } = render(SUMMARY);
    for (const chart of ['pfm-sp-card', 'pfm-prms-status-card', 'pfm-sync-card', 'pfm-type-card']) {
      expect(q(chart)).toBeNull();
    }
    const order = ['pfm-progress-card', 'pfm-next-steps-card'].map(id =>
      Array.from(el.querySelectorAll('[data-testid]')).indexOf(q(id) as Element)
    );
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // synced 9 of 9 + 18 need attention
    expect(q('pfm-progress-percent')?.textContent?.trim()).toBe('33%');
    expect(q('pfm-progress-left')?.getAttribute('aria-label')).toBe('18 results still need action. Click to see them.');
    expect(el.querySelector('[data-testid="pfm-next-mapping_incomplete"] [data-testid="pfm-next-value"]')?.textContent?.trim()).toBe('12');
  });

  it('next to Reported to PRMS, a card with the total of results that should contribute', () => {
    const { q } = render(SUMMARY);
    expect(q('pfm-total-card')?.textContent).toContain('Results that should contribute to the CGIAR Portfolio');
    expect(q('pfm-total-value')?.textContent?.trim()).toBe('31'); // chip_counts.all
    // same row, total first, then the progress card
    const row = q('pfm-total-card')!.parentElement!;
    expect(row).toBe(q('pfm-progress-card')?.closest('app-pfm-progress-card')?.parentElement);
    expect(row.firstElementChild).toBe(q('pfm-total-card'));
    expect(q('pfm-total-card')!.className).toContain('text-center');
  });

  it('the old multi-colour charts are gone', () => {
    const { q } = render(SUMMARY);
    expect(q('pfm-alliance-card')).toBeNull();
    expect(q('pfm-prms-card')).toBeNull();
    expect(q('pfm-pipeline-card')).toBeNull();
  });

  it('every click asks the page to open the queue on a quick view', () => {
    TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
    const fixture = TestBed.createComponent(PfmCoverageTabComponent);
    fixture.componentRef.setInput('summary', SUMMARY);
    fixture.componentRef.setInput('scope', 'all');
    fixture.detectChanges();
    const targets: unknown[] = [];
    fixture.componentInstance.openQueue.subscribe(t => targets.push(t));
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('[data-testid="pfm-next-ready_to_sync"]') as HTMLElement).click();
    (el.querySelector('[data-testid="pfm-progress-done"]') as HTMLElement).click();
    (el.querySelector('[data-testid="pfm-progress-left"]') as HTMLElement).click();
    expect(targets).toEqual([{ chip: 'ready_to_sync' }, { chip: 'synced' }, { chip: 'need_attention' }]);
  });

  describe('the journey of a result', () => {
    const WITH_JOURNEY: PfmSummary = {
      ...SUMMARY,
      journey: {
        projects: { total: 3, with_results: 2, without_results: 1 },
        star: { draft: 4, submitted: 5, approved: 22 },
        answer: { not_answered: 2, contributes: 18, no_sp: 2 },
        mapping: { incomplete: 3, complete: 15 },
        sync: { ready: 6, synced: 9, rejected: 3 }
      },
      portfolio_projects: [
        { code: 'P-1', name: 'One', lead_pi: 'Lead One', status: 'Ongoing', delegates: [], results: 20 },
        { code: 'P-2', name: 'Two', lead_pi: 'Lead Two', status: 'Ongoing', delegates: [], results: 11 },
        { code: 'P-3', name: 'Three', lead_pi: 'Lead Three', status: 'Ongoing', delegates: [], results: 0 }
      ]
    };

    it('replaces the previous cards with the five stages, the projects table under stage 1', () => {
      const { q } = render(WITH_JOURNEY);
      expect(q('pfm-journey-card')).not.toBeNull();
      expect(q('pfm-portfolio-projects')).not.toBeNull();
      expect(q('pfm-total-card')).toBeNull();
      expect(q('pfm-progress-card')).toBeNull();
      expect(q('pfm-next-steps-card')).toBeNull();
    });

    it('the projects table belongs to stage 1 only', () => {
      TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
      const fixture = TestBed.createComponent(PfmCoverageTabComponent);
      fixture.componentRef.setInput('summary', WITH_JOURNEY);
      fixture.componentRef.setInput('scope', 'all');
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      (el.querySelector('[data-testid="pfm-journey-stage-2"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="pfm-portfolio-projects"]')).toBeNull();
      expect(el.querySelector('[data-testid="pfm-journey-kicker"]')?.textContent?.trim()).toBe('Stage 2 of 5');
    });

    it('a stage action opens the Results queue on its quick view', () => {
      TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
      const fixture = TestBed.createComponent(PfmCoverageTabComponent);
      fixture.componentRef.setInput('summary', WITH_JOURNEY);
      fixture.componentRef.setInput('scope', 'all');
      fixture.detectChanges();
      const targets: unknown[] = [];
      fixture.componentInstance.openQueue.subscribe(t => targets.push(t));
      const el = fixture.nativeElement as HTMLElement;
      (el.querySelector('[data-testid="pfm-journey-stage-5"]') as HTMLElement).click();
      fixture.detectChanges();
      (el.querySelector('[data-testid="pfm-journey-cta"]') as HTMLElement).click();
      expect(targets).toEqual([{ chip: 'ready_to_sync' }]);
    });

    it('the stage 1 action brings the table back to the projects without results', () => {
      TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
      const fixture = TestBed.createComponent(PfmCoverageTabComponent);
      fixture.componentRef.setInput('summary', WITH_JOURNEY);
      fixture.componentRef.setInput('scope', 'all');
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const rows = () => el.querySelectorAll('[data-testid^="pfm-project-row-"]').length;
      (el.querySelector('[data-testid="pfm-projects-chip-all"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(rows()).toBe(3);
      (el.querySelector('[data-testid="pfm-journey-cta"]') as HTMLElement).click();
      fixture.detectChanges();
      expect(rows()).toBe(1);
    });
  });

  it('falls back to the KPI figures when the server does not send chip_counts yet', () => {
    const { chip_counts, ...older } = SUMMARY;
    expect(chip_counts).toBeTruthy();
    const { q } = render(older);
    // kpis: synced 11, need_attention 7, out of scope 2
    expect(q('pfm-progress-done')?.getAttribute('aria-label')).toBe('13 results done: 11 in PRMS and 2 with no SP contribution. Click to see the results synced with PRMS.');
    expect(q('pfm-progress-left')?.getAttribute('aria-label')).toBe('7 results still need action. Click to see them.');
  });

  // Owner: an empty monitor must look the same everywhere.
  it('with no results every card shows the same "Nothing yet" state', () => {
    const empty: PfmSummary = {
      ...SUMMARY,
      kpis: { projects: 0, projects_total: 0, monitored: 0, need_attention: 0, synced: 0, in_prms_scope: 0 },
      pipeline: { total: 0, in_scope: 0, not_synced: 0, in_prms: 0, out_of_scope: 0, stages: [] },
      sp_coverage: [],
      monthly: [{ month: '2026-09', synced: 0 }, { month: '2026-10', synced: 0 }],
      synced_this_year: 0,
      chip_counts: { all: 0, attention: 0, mapping: 0, ready: 0, prms_rejected: 0, synced: 0, awaiting_pi: 0, no_sp: 0 }
    };
    const { el } = render(empty);
    const states = Array.from(el.querySelectorAll('[data-testid="pfm-empty-state"]')).map(e => e.textContent?.trim());
    expect(states).toEqual(['Nothing yet', 'Nothing yet']);
    for (const card of ['pfm-progress-card', 'pfm-next-steps-card']) {
      expect(el.querySelector(`[data-testid="${card}"] [data-testid="pfm-empty-state"]`)).not.toBeNull();
    }
  });
});
