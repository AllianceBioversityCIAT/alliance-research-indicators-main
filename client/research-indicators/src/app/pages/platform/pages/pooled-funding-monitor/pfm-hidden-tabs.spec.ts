import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiService } from '@services/api.service';
import { RolesService } from '@shared/services/cache/roles.service';
import PooledFundingMonitorComponent from './pooled-funding-monitor.component';
import { PfmStoreService } from './services/pfm-store.service';
import { PFM_HIDDEN_TABS, PFM_VISIBLE_TABS, PfmQueue, PfmSummary } from './pfm.interfaces';
import { savePfmReturnState } from './pfm-return-state';

// Today only the Stats tab is shown: Portfolio coverage and Results queue are hidden.
const ok = <T>(data: T) => ({ successfulRequest: true, data });

const summary: PfmSummary = {
  scope: 'all',
  is_pi_of_any: true,
  kpis: { projects: 1, projects_total: 1, monitored: 1, need_attention: 0, synced: 0, in_prms_scope: 0 },
  pipeline: { total: 0, in_scope: 0, not_synced: 0, in_prms: 0, out_of_scope: 0, stages: [] },
  sp_coverage: [],
  monthly: [],
  synced_this_year: 0
};

const queue: PfmQueue = {
  filter_options: { projects: [], science_programs: [], types: [] },
  chip_counts: { all: 0, attention: 0, mapping: 0, ready: 0, prms_rejected: 0, synced: 0 },
  groups: [],
  totals: { results: 0, projects: 0, monitored_total: 0 }
};

describe('CGIAR Portfolio Contribution Monitor with hidden tabs', () => {
  let navigate: jest.Mock;

  async function create(params: Record<string, string> = {}) {
    navigate = jest.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [PooledFundingMonitorComponent],
      providers: [
        {
          provide: ApiService,
          useValue: { GET_PfmSummary: jest.fn().mockResolvedValue(ok(summary)), GET_PfmQueue: jest.fn().mockResolvedValue(ok(queue)) }
        },
        { provide: Router, useValue: { navigate, events: new Subject<unknown>() } },
        { provide: RolesService, useValue: { isAdmin: signal(true), canAccessPooledFundingMonitor: signal(true) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(PooledFundingMonitorComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, store: fixture.debugElement.injector.get(PfmStoreService) };
  }

  beforeEach(() => sessionStorage.clear());

  it('hides Portfolio coverage and Results queue, leaving only Stats', () => {
    expect(PFM_HIDDEN_TABS).toEqual(['coverage', 'queue']);
    expect(PFM_VISIBLE_TABS).toEqual(['stats']);
  });

  it('shows only the Stats tab, selected, and its panel', async () => {
    const { el, store } = await create();

    const tabs = Array.from(el.querySelectorAll('[role="tab"]')).map(tab => tab.getAttribute('data-testid'));
    expect(tabs).toEqual(['pfm-tab-stats']);
    expect(el.querySelector('[data-testid="pfm-tab-stats"]')?.getAttribute('aria-selected')).toBe('true');
    expect(store.tab()).toBe('stats');
    expect(el.querySelector('[data-testid="pfm-panel-stats"]')).not.toBeNull();
  });

  it.each(['coverage', 'queue'])('ignores ?tab=%s and opens Stats', async tab => {
    const { store } = await create({ tab });
    expect(store.tab()).toBe('stats');
  });

  it('ignores a saved return state on a hidden tab', async () => {
    savePfmReturnState({ scope: 'all', tab: 'queue', filters: { project: null, sp: null, type: null }, chip: null, openGroups: [], groupViews: {}, resultCode: null });
    const { store } = await create();
    expect(store.tab()).toBe('stats');
  });

  it('a hidden tab cannot be selected, and a chart click does not open the Results queue', async () => {
    const { store } = await create();

    store.setTab('queue');
    store.openQueue({ chip: 'rejected' });

    expect(store.tab()).toBe('stats');
    expect(store.chip()).toBeNull();
  });
});
