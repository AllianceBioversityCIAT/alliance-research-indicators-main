// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-07
// Expected values come from requirements R-PFM-002/009/011/014/016 and design §6.4.
// ApiService and Router are mocked; assertions are on the resulting signal values.

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ApiService } from '@services/api.service';
import { PfmStoreService } from './pfm-store.service';
import { PfmGroup, PfmQueue, PfmResultRow, PfmSummary, pfmQueryString } from '../pfm.interfaces';
import { PfmGroupView, PfmReturnState, savePfmReturnState } from '../pfm-return-state';

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
  chip_counts: { all: 1, attention: 0, mapping: 0, ready: 0, prms_rejected: 0, synced: 0 },
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

  describe('remembers the scope for the result breadcrumb', () => {
    beforeEach(() => sessionStorage.clear());

    it('setScope(all) remembers all', async () => {
      const store = build();
      store.init();
      await new Promise(r => setTimeout(r));
      store.setScope('all');
      expect(sessionStorage.getItem('ari.pfm.lastScope')).toBe('all');
    });

    it('init with ?scope=all remembers all', async () => {
      const store = build({ scope: 'all' });
      store.init();
      await new Promise(r => setTimeout(r));
      expect(sessionStorage.getItem('ari.pfm.lastScope')).toBe('all');
    });

    it('init without ?scope= keeps the default mine and remembers it', async () => {
      sessionStorage.setItem('ari.pfm.lastScope', 'all');
      const store = build();
      store.init();
      await new Promise(r => setTimeout(r));
      expect(store.scope()).toBe('mine');
      expect(sessionStorage.getItem('ari.pfm.lastScope')).toBe('mine');
    });
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

  // Coverage-tab click: the queue must show exactly what was clicked, so earlier filters go.
  it('openQueue clears the filters, applies the quick view / SP, switches to the queue tab and loads once', async () => {
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    store.setFilter('project', 'P1');
    store.setFilter('type', 3);
    await new Promise(r => setTimeout(r));
    api.GET_PfmQueue.mockClear();
    router.navigate.mockClear();

    store.openQueue({ chip: 'ready_to_sync' });
    expect(store.tab()).toBe('queue');
    expect(store.chip()).toBe('ready_to_sync');
    expect(store.filters()).toEqual({ project: null, sp: null, type: null });
    expect(api.GET_PfmQueue).toHaveBeenCalledTimes(1);
    expect(api.GET_PfmQueue).toHaveBeenLastCalledWith(expect.objectContaining({ chip: 'ready_to_sync', project: null, type: null }));
    expect(router.navigate).toHaveBeenCalled();

    store.openQueue({ sp: 'SP06' });
    expect(store.chip()).toBeNull();
    expect(store.filters().sp).toBe('SP06');
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

  describe('default scope (admins open on the whole portfolio, HITL 20)', () => {
    beforeEach(() => sessionStorage.clear());

    it('init({ defaultScope: all }) without ?scope= loads and remembers all', async () => {
      const store = build();
      store.init({ defaultScope: 'all' });
      await new Promise(r => setTimeout(r));
      expect(store.scope()).toBe('all');
      expect(api.GET_PfmSummary).toHaveBeenCalledWith('all');
      expect(sessionStorage.getItem('ari.pfm.lastScope')).toBe('all');
    });

    it('an explicit ?scope=mine wins over defaultScope all', async () => {
      const store = build({ scope: 'mine' });
      store.init({ defaultScope: 'all' });
      await new Promise(r => setTimeout(r));
      expect(store.scope()).toBe('mine');
      expect(api.GET_PfmSummary).toHaveBeenCalledWith('mine');
    });

    it('an unknown ?scope= falls back to defaultScope', () => {
      const store = build({ scope: 'bogus' });
      store.init({ defaultScope: 'all' });
      expect(store.scope()).toBe('all');
    });
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
    it('drops empty values and is an empty string when nothing remains', () => {
      expect(pfmQueryString({ scope: 'mine', project: '', sp: null, type: null, chip: null })).toBe('?scope=mine');
      expect(pfmQueryString({ project: null, sp: undefined } as never)).toBe('');
    });

    it('omits empty params', () => {
      expect(pfmQueryString({ scope: 'mine', project: '', sp: null, type: 3, chip: 'synced' })).toBe(
        '?scope=mine&type=3&chip=synced'
      );
    });
  });

  describe('restoring the state saved when leaving for a result', () => {
    const view: PfmGroupView = { first: 10, rows: 5, search: 'x', sortField: 'title', sortOrder: -1 };
    const saved = (over: Partial<Omit<PfmReturnState, 'v' | 'savedAt'>> = {}) =>
      savePfmReturnState({
        scope: 'all',
        tab: 'queue',
        filters: { project: 'P1', sp: 'SP01', type: 3 },
        chip: 'synced',
        openGroups: ['P1', 'P2'],
        groupViews: { P1: view },
        resultCode: 'STAR-9',
        ...over
      });

    beforeEach(() => sessionStorage.clear());

    it('restores scope, tab, filters, chip, views and open groups, reopens the rows and syncs the URL', async () => {
      saved();
      const store = build();
      store.init();
      await new Promise(r => setTimeout(r));

      expect(store.scope()).toBe('all');
      expect(store.tab()).toBe('queue');
      expect(store.filters()).toEqual({ project: 'P1', sp: 'SP01', type: 3 });
      expect(store.chip()).toBe('synced');
      expect(store.groupViews()).toEqual({ P1: view });
      expect([...store.openGroups()]).toEqual(['P1', 'P2']);
      expect(store.focusResult()).toBe('STAR-9');
      expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { scope: 'all', tab: 'queue' } }));
      expect(api.GET_PfmProjectResults).toHaveBeenCalledWith('P1', expect.objectContaining({ scope: 'all', chip: 'synced' }));
      expect(api.GET_PfmProjectResults).toHaveBeenCalledWith('P2', expect.anything());
      expect(Object.keys(store.groupRows()).sort()).toEqual(['P1', 'P2']);
    });

    it('ignores a saved scope that is not allowed and a saved tab that is unknown; missing views and groups default to empty', async () => {
      saved({ scope: 'all', tab: 'bogus' as never, openGroups: undefined as never, groupViews: undefined as never });
      const store = build();
      store.init({ allowedScopes: ['mine'] });
      await new Promise(r => setTimeout(r));

      expect(store.scope()).toBe('mine');
      expect(store.tab()).toBe('coverage');
      expect(store.groupViews()).toEqual({});
      expect(store.openGroups().size).toBe(0);
      expect(api.GET_PfmProjectResults).not.toHaveBeenCalled();
    });
  });

  it('saveReturnState stores the current view so a later init restores it', () => {
    sessionStorage.clear();
    const first = build();
    first.setTab('queue');
    first.setFilter('sp', 'SP02');
    first.toggleGroup('P7');
    first.setGroupView('P7', { first: 20, rows: 10, search: '', sortField: null, sortOrder: 1 });
    first.saveReturnState('STAR-1');
    TestBed.resetTestingModule();

    const second = build();
    second.init();

    expect(second.tab()).toBe('queue');
    expect(second.filters().sp).toBe('SP02');
    expect([...second.openGroups()]).toEqual(['P7']);
    expect(second.groupViews()['P7'].first).toBe(20);
    expect(second.focusResult()).toBe('STAR-1');
  });

  it('setScope to the current scope and setTab to the current tab do nothing', async () => {
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    api.GET_PfmSummary.mockClear();
    api.GET_PfmQueue.mockClear();
    router.navigate.mockClear();

    store.setScope('mine');
    store.setTab('coverage');

    expect(api.GET_PfmSummary).not.toHaveBeenCalled();
    expect(api.GET_PfmQueue).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('resetFilters clears filters and chip, empties the groups and reloads the queue', async () => {
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    store.setFilter('project', 'P1');
    store.setChip('synced');
    store.toggleGroup('P1');
    await new Promise(r => setTimeout(r));
    api.GET_PfmQueue.mockClear();

    store.resetFilters();
    await new Promise(r => setTimeout(r));

    expect(store.filters()).toEqual({ project: null, sp: null, type: null });
    expect(store.chip()).toBeNull();
    expect(store.groupRows()).toEqual({});
    expect(api.GET_PfmQueue).toHaveBeenCalledTimes(1);
  });

  it('retrySummary reloads the summary after a failure', async () => {
    api.GET_PfmSummary.mockRejectedValueOnce(new Error('boom'));
    const store = build();
    store.init();
    await new Promise(r => setTimeout(r));
    expect(store.summaryState().error).toBe(true);

    await store.retrySummary();

    expect(store.summaryState()).toEqual({ loading: false, error: false });
    expect(store.summary()?.scope).toBe('mine');
  });

  describe('unsuccessful or empty responses are errors', () => {
    it.each([
      ['unsuccessful', { successfulRequest: false, data: summary('mine') }],
      ['empty data', { successfulRequest: true, data: null }],
      ['no response', undefined]
    ])('summary: %s', async (_name, res) => {
      api.GET_PfmSummary.mockResolvedValue(res);
      const store = build();
      await store.loadSummary();
      expect(store.summaryState()).toEqual({ loading: false, error: true });
      expect(store.summary()).toBeNull();
    });

    it.each([
      ['unsuccessful', { successfulRequest: false, data: queue('A') }],
      ['empty data', { successfulRequest: true, data: null }]
    ])('queue: %s', async (_name, res) => {
      api.GET_PfmQueue.mockResolvedValue(res);
      const store = build();
      await store.loadQueue();
      expect(store.queueState()).toEqual({ loading: false, error: true });
      expect(store.queue()).toBeNull();
    });

    it.each([
      ['unsuccessful', { successfulRequest: false, data: [row('r')] }],
      ['empty data', { successfulRequest: true, data: null }]
    ])('group rows: %s', async (_name, res) => {
      api.GET_PfmProjectResults.mockResolvedValue(res);
      const store = build();
      store.toggleGroup('P1');
      await new Promise(r => setTimeout(r));
      expect(store.groupState()['P1']).toEqual({ loading: false, error: true });
      expect(store.groupRows()['P1']).toBeUndefined();
    });
  });

  describe('stale responses are dropped (success and failure)', () => {
    const deferred = () => {
      let resolve!: (v: unknown) => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    it('summary: an older success and an older failure do not overwrite the newer result', async () => {
      const store = build();
      const slowOk = deferred();
      api.GET_PfmSummary.mockImplementationOnce(() => slowOk.promise);
      const first = store.loadSummary();
      await store.loadSummary(); // newer, resolves with 'mine'
      slowOk.resolve(ok(summary('all')));
      await first;
      expect(store.summary()?.scope).toBe('mine');

      const slowFail = deferred();
      api.GET_PfmSummary.mockImplementationOnce(() => slowFail.promise);
      const second = store.loadSummary();
      await store.loadSummary();
      slowFail.reject(new Error('late'));
      await second;
      expect(store.summaryState()).toEqual({ loading: false, error: false });
    });

    it('queue: an older failure does not overwrite the newer result', async () => {
      const store = build();
      const slowFail = deferred();
      api.GET_PfmQueue.mockImplementationOnce(() => slowFail.promise);
      const first = store.loadQueue();
      await store.loadQueue();
      slowFail.reject(new Error('late'));
      await first;
      expect(store.queueState()).toEqual({ loading: false, error: false });
      expect(store.queue()?.groups.map(g => g.code)).toEqual(['P1', 'P2']);
    });

    it('group rows: a response arriving after the key changed is dropped, whether it succeeds or fails', async () => {
      const store = build();
      const slowOk = deferred();
      api.GET_PfmProjectResults.mockImplementationOnce(() => slowOk.promise);
      store.toggleGroup('P1');
      store.setChip('synced'); // new key: rows reset
      slowOk.resolve(ok([row('late')]));
      await new Promise(r => setTimeout(r));
      expect(store.groupRows()['P1']).toBeUndefined();

      const slowFail = deferred();
      api.GET_PfmProjectResults.mockImplementationOnce(() => slowFail.promise);
      store.toggleGroup('P2');
      store.setChip(null);
      slowFail.reject(new Error('late'));
      await new Promise(r => setTimeout(r));
      expect(store.groupState()['P2']).toBeUndefined();
    });
  });
});
