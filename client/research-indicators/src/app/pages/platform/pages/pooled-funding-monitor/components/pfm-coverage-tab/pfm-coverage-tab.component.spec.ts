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
    stages: [{ key: 'approved', group: 'in_prms', value: 11 }]
  },
  sp_coverage: [{ code: 'SP06', name: 'Climate Action', synced: 3, total: 8 }],
  monthly: [{ month: '2026-07', synced: 3 }],
  synced_this_year: 11
};

describe('PfmCoverageTabComponent', () => {
  it('hosts the pipeline, SP coverage and sync activity cards with the summary values', () => {
    TestBed.configureTestingModule({ imports: [PfmCoverageTabComponent] });
    const fixture = TestBed.createComponent(PfmCoverageTabComponent);
    fixture.componentRef.setInput('summary', SUMMARY);
    fixture.componentRef.setInput('scope', 'all');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="pfm-pipeline-total"]')?.textContent?.trim()).toBe('31');
    expect(el.querySelector('[data-testid="pfm-sp-row-SP06"] [data-testid="pfm-sp-count"]')?.textContent?.trim()).toBe('3 / 8');
    expect(el.querySelector('[data-testid="pfm-month-2026-07"] [data-testid="pfm-month-label"]')?.textContent?.trim()).toBe('Jul');
  });
});
