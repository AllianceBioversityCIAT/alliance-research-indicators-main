// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-07
// Expected values come from requirements R-PFM-002/009/011/014/016 and design §6.4.
// ApiService and Router are mocked; assertions are on the resulting signal values.

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ApiService } from '@services/api.service';
import { PfmStoreService } from './pfm-store.service';
import { PfmGroup, PfmQueue, PfmResultRow, PfmSummary, pfmQueryString } from '../pfm.interfaces';

const ok = <T>(data: T) => ({ successfulRequest: true, data });

const group = (code: string): PfmGroup => ({
  code,
  name: `Project ${code}`,
  lead_pi: null,
  donor: null,
  result_count: 1,
  attention: 0,
  counts: { approved: 0, pending: 0, rejected: 0, out_of_scope: 0, not_sent: 1 }
});

const queue = (...codes: string[]): PfmQueue => ({
  filter_options: { projects: [], science_programs: [], types: [] },
  chip_counts: { all: 1, attention: 0, mapping: 0, ready: 0, pending: 0, prms_rejected: 0, synced: 0 },
  groups: codes.map(group),
  totals: { results: codes.length, projects: codes.length, monitored_total: codes.length }
});

const summary = (scope: 'mine' | 'all'): PfmSummary => ({
  scope,
  is_pi_of_any: true,
  kpis: { projects: 1, projects_total: 2, monitored: 3, need_attention: 0, synced: 0, in_prms_scope: 0 },
  pipeline: { total: 3, in_scope: 3, not_synced: 3, in_prms: 0, out_of_scope: 0, stages: [] },
  sp_coverage: [],
  monthly: [],
  synced_this_year: 0
});

const row = (code: string): PfmResultRow =>
  ({ result_code: code, platform_code: 'STAR', official_code: 1, snapshot_years: [2026] }) as unknown as PfmResultRow;

describe('PfmStoreService', () => {
  let api: { GET_PfmSummary: jest.Mock; GET_PfmQueue: jest.Mock; GET_PfmProjectResults: jest.Mock };
  let router: { navigate: jest.Mock };

  const build = (params: Record<string, string> = {}): PfmStoreService => {
    TestBed.configureTestingModule({
      providers: [
        PfmStoreService,
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } }
      ]
    });
    return TestBed.inject(PfmStoreService);
  };

  beforeEach(() => {
    api = {
      GET_PfmSummary: jest.fn().mockImplementation((scope: 'mine' | 'all') => Promise.resolve(ok(summary(scope)))),
      GET_PfmQueue: jest.fn().mockResolvedValue(ok(queue('P1', 'P2'))),
      GET_PfmProjectResults: jest.fn().mockImplementation((code: string) => Promise.resolve(ok([row(`${code}-r`)])))
    };
    router = { navigate: jest.fn().mockResolvedValue(true) };
  });

  it('summary error leaves queue data intact (R-PFM-016)', async () => {
    api.GET_PfmSummary.mockRejectedValue(new Error('boom'));
    const store = build();
    store.init();
    await Promise.resolve();
    await new Promise(r => setTimeout(r));

    expect(store.summaryState()).toEqual({ loading: false, error: true });
    expect(store.summary()).toBeNull();
    expect(store.queueState()).toEqual({ loading: false, error: false });
    expect(store.queue()?.groups.map(g => g.code)).toEqual(['P1', 'P2']);
  });

  it('queue error leaves summary data intact and Retry recovers', async () => {
    api.GET_PfmQueue.mockRejectedValueOnce(new Error('boom'));
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    expect(store.queueState().error).toBe(true);
    expect(store.summary()?.scope).toBe('mine');

    await store.retryQueue();
    expect(store.queueState()).toEqual({ loading: false, error: false });
    expect(store.queue()?.totals.results).toBe(2);
  });

  it('scope change refetches both sections, keeps filters/chip/tab and empties groupRows (R-PFM-002)', async () => {
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    store.setTab('queue');
    store.setFilter('sp', 'SP01');
    store.setChip('ready_to_sync');
    store.toggleGroup('P1');
    await new Promise(r => setTimeout(r));
    expect(Object.keys(store.groupRows())).toEqual(['P1']);
    api.GET_PfmSummary.mockClear();
    api.GET_PfmQueue.mockClear();

    store.setScope('all');
    await new Promise(r => setTimeout(r));

    expect(api.GET_PfmSummary).toHaveBeenCalledWith('all');
    expect(api.GET_PfmQueue).toHaveBeenCalledWith(expect.objectContaining({ scope: 'all', sp: 'SP01', chip: 'ready_to_sync' }));
    expect(store.summary()?.scope).toBe('all');
    expect(store.groupRows()).toEqual({});
    expect(store.openGroups().size).toBe(0);
    expect(store.filters().sp).toBe('SP01');
    expect(store.chip()).toBe('ready_to_sync');
    expect(store.tab()).toBe('queue');
  });

  it('filter change sets chip null and refetches the queue (R-PFM-009)', async () => {
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    store.setChip('synced');
    expect(store.chip()).toBe('synced');
    api.GET_PfmQueue.mockClear();

    store.setFilter('project', 'P1');
    await new Promise(r => setTimeout(r));

    expect(store.chip()).toBeNull();
    expect(store.filters().project).toBe('P1');
    expect(api.GET_PfmQueue).toHaveBeenCalledTimes(1);
    expect(api.GET_PfmQueue.mock.calls[0][0]).toEqual(expect.objectContaining({ project: 'P1', chip: null }));
  });

  it('second expand of the same group makes no new call (R-PFM-011)', async () => {
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));

    store.toggleGroup('P1');
    await new Promise(r => setTimeout(r));
    store.toggleGroup('P1'); // collapse
    store.toggleGroup('P1'); // re-expand
    await new Promise(r => setTimeout(r));

    expect(api.GET_PfmProjectResults).toHaveBeenCalledTimes(1);
    expect(api.GET_PfmProjectResults).toHaveBeenCalledWith('P1', expect.objectContaining({ scope: 'mine' }));
    expect(store.groupRows()['P1'].map(r => r.result_code)).toEqual(['P1-r']);
    expect(store.openGroups().has('P1')).toBe(true);
  });

  it('a failed group fetch sets only that group error and is retryable', async () => {
    api.GET_PfmProjectResults.mockRejectedValueOnce(new Error('x'));
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    store.toggleGroup('P1');
    await new Promise(r => setTimeout(r));
    expect(store.groupState()['P1']).toEqual({ loading: false, error: true });
    expect(store.groupRows()['P1']).toBeUndefined();

    await store.retryGroup('P1');
    expect(store.groupState()['P1']).toEqual({ loading: false, error: false });
    expect(store.groupRows()['P1']).toHaveLength(1);
  });

  it('init reads scope and tab from the query params and loads with that scope', async () => {
    const store = build({ scope: 'all', tab: 'queue' });
    store.init();
    await new Promise(r => setTimeout(r));
    expect(store.scope()).toBe('all');
    expect(store.tab()).toBe('queue');
    expect(api.GET_PfmSummary).toHaveBeenCalledWith('all');
  });

  it('init ignores unknown query values', () => {
    const store = build({ scope: 'bogus', tab: 'nope' });
    store.init();
    expect(store.scope()).toBe('mine');
    expect(store.tab()).toBe('coverage');
  });

  it('scope and tab changes are written to the URL (merge, replaceUrl)', async () => {
    const store = build();
    store.init();
    store.setTab('queue');
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { scope: 'mine', tab: 'queue' }, queryParamsHandling: 'merge', replaceUrl: true })
    );
    store.setScope('all');
    expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { scope: 'all', tab: 'queue' } }));
  });

  it('a stale slower queue response does not overwrite a newer one', async () => {
    let resolveFirst!: (v: unknown) => void;
    api.GET_PfmQueue.mockImplementationOnce(() => new Promise(r => (resolveFirst = r)));
    const store = build();
    store.init(); // first (slow) queue call
    api.GET_PfmQueue.mockResolvedValueOnce(ok(queue('NEW')));
    store.setFilter('sp', 'SP9');
    await new Promise(r => setTimeout(r));
    resolveFirst(ok(queue('OLD')));
    await new Promise(r => setTimeout(r));
    expect(store.queue()?.groups.map(g => g.code)).toEqual(['NEW']);
  });

  describe('pfmQueryString', () => {
    it('omits empty params', () => {
      expect(pfmQueryString({ scope: 'mine', project: '', sp: null, status: undefined, type: 3, chip: 'synced' })).toBe(
        '?scope=mine&type=3&chip=synced'
      );
    });
  });
});
