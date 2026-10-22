import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationStart, Router, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { savePfmReturnState } from './pfm-return-state';
import { signal } from '@angular/core';
import { ApiService } from '@services/api.service';
import { RolesService } from '@shared/services/cache/roles.service';
import PooledFundingMonitorComponent from './pooled-funding-monitor.component';
import { PfmQueue, PfmScope, PfmSummary } from './pfm.interfaces';

const ok = <T>(data: T) => ({ successfulRequest: true, data });

const summary = (scope: PfmScope, isPi = true): PfmSummary => ({
  scope,
  is_pi_of_any: isPi,
  // Distinct per scope so a leak between scopes shows in the DOM.
  kpis:
    scope === 'mine'
      ? { projects: 2, projects_total: 40, monitored: 5, need_attention: 3, synced: 1, in_prms_scope: 4 }
      : { projects: 40, projects_total: 40, monitored: 500, need_attention: 123, synced: 77, in_prms_scope: 400 },
  pipeline: { total: 0, in_scope: 0, not_synced: 0, in_prms: 0, out_of_scope: 0, stages: [] },
  sp_coverage: [],
  monthly: [],
  synced_this_year: 0
});

const queue: PfmQueue = {
  filter_options: { projects: [], science_programs: [], types: [] },
  chip_counts: { all: 0, attention: 0, mapping: 0, ready: 0, prms_rejected: 0, synced: 0 },
  groups: [],
  totals: { results: 0, projects: 0, monitored_total: 0 }
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

describe('PooledFundingMonitorComponent', () => {
  let fixture: ComponentFixture<PooledFundingMonitorComponent>;
  let el: HTMLElement;
  let api: { GET_PfmSummary: jest.Mock; GET_PfmQueue: jest.Mock };
  let routerEvents: Subject<unknown>;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  /** The coverage tab's "need action" figure (same summary data the KPI cards used to show). */
  const needAction = () => q('pfm-progress-left')?.getAttribute('aria-label');
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** `contributorPi`: a Contributor-only user who reaches the page as PI / delegate of a project. */
  async function create(opts: { admin?: boolean; contributorPi?: boolean; params?: Record<string, string> } = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PooledFundingMonitorComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true), events: routerEvents } },
        {
          provide: RolesService,
          useValue: { isAdmin: signal(!!opts.admin), canAccessPooledFundingMonitor: signal(!opts.contributorPi) }
        },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(opts.params ?? {}) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PooledFundingMonitorComponent);
    el = fixture.nativeElement;
  }

  beforeEach(() => {
    routerEvents = new Subject<unknown>();
    sessionStorage.clear();
    api = { GET_PfmSummary: jest.fn(), GET_PfmQueue: jest.fn().mockResolvedValue(ok(queue)) };
  });

  it('no KPI cards; the coverage panel shows a skeleton while loading, then the coverage (load -> data, KZ-015)', async () => {
    const pending = deferred<ReturnType<typeof ok<PfmSummary>>>();
    api.GET_PfmSummary.mockReturnValue(pending.promise);
    await create();
    fixture.detectChanges();

    expect(q('pfm-kpi-skeleton')).toBeNull();
    expect(q('pfm-kpi-cards')).toBeNull();
    expect(q('pfm-coverage-skeleton')).not.toBeNull();
    // toggle and tabs stay usable while loading (R-PFM-016)
    expect(q('pfm-scope-all')?.hasAttribute('disabled')).toBe(false);
    expect(q('pfm-tab-queue')?.hasAttribute('disabled')).toBe(false);

    pending.resolve(ok(summary('mine')));
    await flush();

    expect(q('pfm-coverage-skeleton')).toBeNull();
    expect(q('pfm-kpi-cards')).toBeNull();
    expect(needAction()).toBe('3 results still need action. Click to see them.');
  });

  it('defaults to the PI scope and swaps to portfolio numbers when toggled', async () => {
    api.GET_PfmSummary.mockImplementation((scope: PfmScope) => Promise.resolve(ok(summary(scope))));
    await create();
    fixture.detectChanges();
    await flush();

    expect(q('pfm-scope-mine')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('pfm-scope-all')?.getAttribute('aria-pressed')).toBe('false');
    expect(q('pfm-scope-mine')?.textContent?.trim()).toBe('Only my results as PI');
    expect(q('pfm-scope-all')?.textContent?.trim()).toBe('Whole portfolio');

    q('pfm-scope-all')?.click();
    await flush();
    await flush();

    expect(q('pfm-scope-all')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('pfm-scope-mine')?.getAttribute('aria-pressed')).toBe('false');
    expect(needAction()).toBe('123 results still need action. Click to see them.');
  });

  describe('admin default scope (HITL 20)', () => {
    const order = () => Array.from(el.querySelectorAll('[data-testid^="pfm-scope-"]')).map(b => b.getAttribute('data-testid'));

    beforeEach(() => api.GET_PfmSummary.mockImplementation((scope: PfmScope) => Promise.resolve(ok(summary(scope)))));

    it('admin without ?scope=: opens on the whole portfolio, and Whole portfolio is the first toggle button', async () => {
      await create({ admin: true });
      fixture.detectChanges();
      await flush();
      expect(order()).toEqual(['pfm-scope-all', 'pfm-scope-mine']);
      expect(q('pfm-scope-all')?.getAttribute('aria-pressed')).toBe('true');
      expect(api.GET_PfmSummary).toHaveBeenCalledWith('all');
    });

    it('non-admin: opens on mine and the order is unchanged', async () => {
      await create({ admin: false });
      fixture.detectChanges();
      await flush();
      expect(order()).toEqual(['pfm-scope-mine', 'pfm-scope-all']);
      expect(q('pfm-scope-mine')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('admin with an explicit ?scope=mine stays on mine', async () => {
      await create({ admin: true, params: { scope: 'mine' } });
      fixture.detectChanges();
      await flush();
      expect(q('pfm-scope-mine')?.getAttribute('aria-pressed')).toBe('true');
      expect(api.GET_PfmSummary).toHaveBeenCalledWith('mine');
    });
  });

  it('PI with no projects: shows the empty state, no KPI values, and switches to portfolio on click', async () => {
    api.GET_PfmSummary.mockImplementation((scope: PfmScope) => Promise.resolve(ok(summary(scope, scope === 'all'))));
    await create();
    fixture.detectChanges();
    await flush();

    expect(q('pfm-pi-empty')?.textContent).toContain('You are not PI or delegate of any project contributing to the CGIAR Portfolio.');
    expect(q('pfm-pi-empty-switch')?.textContent?.trim()).toBe('View whole portfolio');
    // HITL 20: the notice sits in the content area below the white band, not in the header card
    expect(q('pfm-band')?.contains(q('pfm-pi-empty'))).toBe(false);
    expect(q('pfm-panel-coverage')).toBeNull();

    q('pfm-pi-empty-switch')?.click();
    await flush();
    await flush();

    expect(q('pfm-pi-empty')).toBeNull();
    expect(q('pfm-scope-all')?.getAttribute('aria-pressed')).toBe('true');
    expect(needAction()).toBe('123 results still need action. Click to see them.');
  });

  describe('Contributor who is PI / delegate of a project (no other role)', () => {
    beforeEach(() => api.GET_PfmSummary.mockImplementation((scope: PfmScope) => Promise.resolve(ok(summary(scope)))));

    // Owner 2026-10-21 (DD-PFM-29): a PI / delegate only gets their own results, never the whole portfolio.
    it('offers only Only my results as PI, and opens on mine', async () => {
      await create({ contributorPi: true });
      fixture.detectChanges();
      await flush();
      const order = Array.from(el.querySelectorAll('[data-testid^="pfm-scope-"]')).map(b => b.getAttribute('data-testid'));
      expect(order).toEqual(['pfm-scope-mine']);
      expect(q('pfm-scope-all')).toBeNull();
      expect(api.GET_PfmSummary).toHaveBeenCalledWith('mine');
      expect(api.GET_PfmSummary).not.toHaveBeenCalledWith('all');
    });

    it('ignores ?scope=all in the URL and opens on mine', async () => {
      await create({ contributorPi: true, params: { scope: 'all' } });
      fixture.detectChanges();
      await flush();
      expect(api.GET_PfmSummary).toHaveBeenCalledWith('mine');
      expect(api.GET_PfmSummary).not.toHaveBeenCalledWith('all');
    });

    // The m.lundy case: PI of many projects, none of them contributing.
    it('empty PI scope while leading non-contributing projects says so, not "you are not PI", and offers no portfolio', async () => {
      api.GET_PfmSummary.mockImplementation((scope: PfmScope) =>
        Promise.resolve(ok({ ...summary(scope, false), manages_any_project: true }))
      );
      await create({ contributorPi: true });
      fixture.detectChanges();
      await flush();
      const notice = q('pfm-pi-empty')?.textContent ?? '';
      expect(notice).toContain('None of your projects contributes to the CGIAR Portfolio');
      expect(notice).not.toContain('You are not PI');
      expect(q('pfm-pi-empty-switch')).toBeNull();
    });
  });

  it('a click on a coverage card opens the Results queue on that quick view', async () => {
    api.GET_PfmSummary.mockImplementation((scope: PfmScope) =>
      Promise.resolve(ok({ ...summary(scope), chip_counts: { all: 5, attention: 3, mapping: 1, ready: 1, prms_rejected: 1, synced: 1 } }))
    );
    await create();
    fixture.detectChanges();
    await flush();
    expect(q('pfm-tab-coverage')?.getAttribute('aria-selected')).toBe('true');
    api.GET_PfmQueue.mockClear();

    q('pfm-next-ready_to_sync')?.click();
    await flush();
    await flush();

    expect(q('pfm-tab-queue')?.getAttribute('aria-selected')).toBe('true');
    expect(api.GET_PfmQueue).toHaveBeenCalledWith(expect.objectContaining({ chip: 'ready_to_sync' }));
    expect(q('pfm-chip-ready_to_sync')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('a chip change refetches without removing the filters; only the groups area shows a skeleton (T-12)', async () => {
    api.GET_PfmSummary.mockResolvedValue(ok(summary('mine')));
    await create();
    fixture.detectChanges();
    await flush();
    q('pfm-tab-queue')?.click();
    await flush();
    expect(q('pfm-filter-project')).not.toBeNull();

    const next = deferred<ReturnType<typeof ok<PfmQueue>>>();
    api.GET_PfmQueue.mockReturnValue(next.promise);
    q('pfm-chip-synced')?.click();
    fixture.detectChanges();
    expect(q('pfm-queue-skeleton')).toBeNull();
    expect(q('pfm-filter-project')).not.toBeNull();
    expect(q('pfm-groups-skeleton')).not.toBeNull();

    next.resolve(ok(queue));
    await flush();
    expect(q('pfm-groups-skeleton')).toBeNull();
    expect(q('pfm-chip-synced')?.getAttribute('aria-pressed')).toBe('true');
  });

  describe('stale queue numbers (NFR-PFM-006)', () => {
    const loaded: PfmQueue = {
      ...queue,
      chip_counts: { all: 41, attention: 7, mapping: 5, ready: 3, prms_rejected: 2, synced: 13 },
      groups: [
        {
          code: 'P100',
          name: 'Alpha',
          lead_pi: null,
          donor: null,
          result_count: 4,
          attention: 1,
          counts: { approved: 1, pending: 1, rejected: 1, out_of_scope: 0, not_sent: 1 }
        }
      ],
      totals: { results: 41, projects: 6, monitored_total: 99 }
    };
    async function openQueueLoaded(): Promise<void> {
      api.GET_PfmSummary.mockResolvedValue(ok(summary('mine')));
      api.GET_PfmQueue.mockResolvedValue(ok(loaded));
      await create();
      fixture.detectChanges();
      await flush();
      q('pfm-tab-queue')?.click();
      await flush();
      expect(q('pfm-count-line')?.textContent).toContain('41 results');
    }
    const noOldNumbers = () => {
      expect(el.textContent).not.toContain('flagged portfolio-wide');
      expect(el.textContent).not.toContain('99');
      expect(q('pfm-chip-count')).toBeNull();
      expect(q('pfm-count-line')).toBeNull();
      expect(q('pfm-group-P100')).toBeNull();
    };

    it('a failed refetch after a scope change shows only filters + error + Retry, no old counts', async () => {
      await openQueueLoaded();
      const failing = deferred<ReturnType<typeof ok<PfmQueue>>>();
      api.GET_PfmQueue.mockReturnValue(failing.promise);
      q('pfm-scope-all')?.click();
      failing.reject(new Error('boom'));
      await flush();
      await flush();
      expect(q('pfm-queue-error')).not.toBeNull();
      expect(q('pfm-filter-project')).not.toBeNull();
      noOldNumbers();
    });

    it('during an in-flight refetch no old count is visible; filters stay', async () => {
      await openQueueLoaded();
      api.GET_PfmQueue.mockReturnValue(deferred<ReturnType<typeof ok<PfmQueue>>>().promise);
      q('pfm-chip-synced')?.click();
      fixture.detectChanges();
      expect(q('pfm-filter-project')).not.toBeNull();
      expect(q('pfm-groups-skeleton')).not.toBeNull();
      noOldNumbers();
    });
  });

  it('a failed summary shows an inline error with Retry; the queue tab still works (R-PFM-016)', async () => {
    // Reject on a later tick, as a real HTTP failure does: an already-rejected mock promise is flagged
    // "uncaught" by zone.js before the store's await handles it, and the error then lands in a later test.
    api.GET_PfmSummary.mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error('boom'))))).mockResolvedValue(
      ok(summary('mine'))
    );
    await create();
    fixture.detectChanges();
    await flush();

    expect(q('pfm-summary-error')).toBeNull(); // the KPI band is gone; the coverage panel owns the error
    expect(q('pfm-coverage-error')).not.toBeNull();

    q('pfm-tab-queue')?.click();
    await flush();
    expect(q('pfm-queue-error')).toBeNull();
    expect(q('pfm-panel-queue')).not.toBeNull();

    q('pfm-tab-coverage')?.click();
    await flush();
    (q('pfm-coverage-error')?.querySelector('button') as HTMLButtonElement).click();
    await flush();
    await flush();
    expect(q('pfm-coverage-error')).toBeNull();
    expect(needAction()).toBe('3 results still need action. Click to see them.');
  });

  describe('tabs', () => {
    beforeEach(async () => {
      api.GET_PfmSummary.mockResolvedValue(ok(summary('mine')));
      await create();
      fixture.detectChanges();
      await flush();
    });

    it('renders exactly two tabs in a tablist with aria-selected', () => {
      const tabs = Array.from(el.querySelectorAll('[role="tablist"] [role="tab"]'));
      expect(tabs.map(t => t.textContent?.trim())).toEqual(['Portfolio coverage', 'Results queue']);
      expect(tabs.map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
      expect(tabs.map(t => t.getAttribute('tabindex'))).toEqual(['0', '-1']);
      // aria-controls only on the selected tab: the inactive panel is not in the DOM
      expect(tabs.map(t => t.getAttribute('aria-controls'))).toEqual(['pfm-panel-coverage', null]);
    });

    it('ArrowRight / ArrowLeft / End / Home move selection and focus', async () => {
      const press = async (id: string, key: string) => {
        q(id)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        await flush();
      };
      await press('pfm-tab-coverage', 'ArrowRight');
      expect(q('pfm-tab-queue')?.getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(q('pfm-tab-queue') ?? undefined);

      await press('pfm-tab-queue', 'ArrowRight'); // wraps
      expect(q('pfm-tab-coverage')?.getAttribute('aria-selected')).toBe('true');

      await press('pfm-tab-coverage', 'ArrowLeft'); // wraps back
      expect(q('pfm-tab-queue')?.getAttribute('aria-selected')).toBe('true');

      await press('pfm-tab-queue', 'Home');
      expect(q('pfm-tab-coverage')?.getAttribute('aria-selected')).toBe('true');
      await press('pfm-tab-coverage', 'End');
      expect(q('pfm-tab-queue')?.getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowLeft from the second tab goes to the first', async () => {
      fixture.componentInstance.selectTab('queue');
      await flush();

      q('pfm-tab-queue')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      await flush();

      expect(q('pfm-tab-coverage')?.getAttribute('aria-selected')).toBe('true');
    });

    it('ignores other keys', async () => {
      q('pfm-tab-coverage')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      await flush();
      expect(q('pfm-tab-coverage')?.getAttribute('aria-selected')).toBe('true');
    });
  });

  it('contains no Sync control and no "PRMS sync" label (R-PFM-014)', async () => {
    api.GET_PfmSummary.mockResolvedValue(ok(summary('mine')));
    await create();
    fixture.detectChanges();
    await flush();

    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent ?? '');
    expect(buttons.some(t => /sync/i.test(t))).toBe(false);
    expect(el.textContent).not.toMatch(/Sync now/i);
    expect(el.textContent).not.toMatch(/PRMS sync:/i);
    expect(el.querySelectorAll('[role="tab"]')).toHaveLength(2);
  });

  // Owner 2026-10-22: back from a result (breadcrumb or browser Back) = the same place in the queue.
  describe('return from a result', () => {
    beforeEach(() => api.GET_PfmSummary.mockImplementation((scope: PfmScope) => Promise.resolve(ok(summary(scope)))));

    it('leaving for a result opened from the monitor saves the view', async () => {
      await create();
      fixture.detectChanges();
      await flush();
      const store = fixture.componentInstance.store;
      store.openQueue({ chip: 'ready_to_sync' });
      store.setGroupView('P100', { first: 10, rows: 10, search: 'seed', sortField: 'updated_sort', sortOrder: -1 });
      routerEvents.next(new NavigationStart(1, '/result/STAR-629/general-information?from=pfm-monitor'));
      const saved = JSON.parse(sessionStorage.getItem('pfm-monitor-return-state') ?? 'null');
      expect(saved).toEqual(
        expect.objectContaining({
          tab: 'queue',
          chip: 'ready_to_sync',
          resultCode: 'STAR-629',
          groupViews: { P100: { first: 10, rows: 10, search: 'seed', sortField: 'updated_sort', sortOrder: -1 } }
        })
      );
    });

    it('coming back restores the queue view, the open projects and their table views, once', async () => {
      savePfmReturnState({
        scope: 'mine',
        tab: 'queue',
        filters: { project: null, sp: 'SP06', type: null },
        chip: 'ready_to_sync',
        openGroups: ['P100'],
        groupViews: { P100: { first: 10, rows: 10, search: 'seed', sortField: 'updated_sort', sortOrder: -1 } },
        resultCode: 'STAR-629'
      });
      (api as unknown as { GET_PfmProjectResults: jest.Mock }).GET_PfmProjectResults = jest.fn().mockResolvedValue(ok([]));
      await create();
      fixture.detectChanges();
      await flush();
      const back = fixture.componentInstance.store;
      expect(back.tab()).toBe('queue');
      expect(back.chip()).toBe('ready_to_sync');
      expect(back.filters().sp).toBe('SP06');
      expect([...back.openGroups()]).toEqual(['P100']);
      expect(back.groupViews()['P100']).toEqual({ first: 10, rows: 10, search: 'seed', sortField: 'updated_sort', sortOrder: -1 });
      expect(back.focusResult()).toBe('STAR-629');
      expect(api.GET_PfmQueue).toHaveBeenCalledWith(expect.objectContaining({ chip: 'ready_to_sync', sp: 'SP06' }));
      // read once: nothing is left for the next visit
      expect(sessionStorage.getItem('pfm-monitor-return-state')).toBeNull();
    });

    describe('scrolling back to the result', () => {
      const originalScroll = Element.prototype.scrollIntoView;
      const originalEscape = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS?.escape;
      let scrollIntoView: jest.Mock;

      beforeEach(() => {
        scrollIntoView = jest.fn();
        Element.prototype.scrollIntoView = scrollIntoView;
        const css = ((globalThis as { CSS?: object }).CSS ??= {}) as { escape?: (v: string) => string };
        css.escape = (v: string) => v;
      });

      afterEach(() => {
        Element.prototype.scrollIntoView = originalScroll;
        (globalThis as { CSS: { escape?: (v: string) => string } }).CSS.escape = originalEscape;
      });

      it('brings the row into view and clears the pending focus once the row is on screen', async () => {
        await create();
        fixture.detectChanges();
        await flush();
        const row = document.createElement('div');
        row.setAttribute('data-result-code', 'STAR-629');
        el.appendChild(row);

        fixture.componentInstance.store.focusResult.set('STAR-629');
        fixture.detectChanges();
        await new Promise(r => setTimeout(r));

        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
        expect(scrollIntoView.mock.contexts[0]).toBe(row);
        expect(fixture.componentInstance.store.focusResult()).toBeNull();
      });

      it('waits (keeps the pending focus) while the row is not rendered yet', async () => {
        await create();
        fixture.detectChanges();
        await flush();

        fixture.componentInstance.store.focusResult.set('STAR-404');
        fixture.detectChanges();
        await new Promise(r => setTimeout(r));

        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(fixture.componentInstance.store.focusResult()).toBe('STAR-404');
      });
    });

    it('a navigation that is not to a result from the monitor saves nothing', async () => {
      await create();
      fixture.detectChanges();
      await flush();
      fixture.componentInstance.store.openQueue({ chip: 'synced' });
      routerEvents.next(new NavigationStart(1, '/results-center'));
      routerEvents.next(new NavigationStart(2, '/result/STAR-1/general-information?from=results-center'));
      expect(sessionStorage.getItem('pfm-monitor-return-state')).toBeNull();
    });
  });
});
