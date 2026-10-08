import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ApiService } from '@services/api.service';
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
  chip_counts: { all: 0, attention: 0, mapping: 0, ready: 0, pending: 0, prms_rejected: 0, synced: 0 },
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
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const kpiValue = (key: string) => q(`pfm-kpi-${key}`)?.querySelector('[data-testid="pfm-kpi-value"]')?.textContent?.trim();
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PooledFundingMonitorComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PooledFundingMonitorComponent);
    el = fixture.nativeElement;
  }

  beforeEach(() => {
    api = { GET_PfmSummary: jest.fn(), GET_PfmQueue: jest.fn().mockResolvedValue(ok(queue)) };
  });

  it('shows skeletons while loading, then the 4 KPI values (load -> data, KZ-015)', async () => {
    const pending = deferred<ReturnType<typeof ok<PfmSummary>>>();
    api.GET_PfmSummary.mockReturnValue(pending.promise);
    await create();
    fixture.detectChanges();

    expect(q('pfm-kpi-skeleton')).not.toBeNull();
    expect(q('pfm-kpi-cards')).toBeNull();
    // toggle and tabs stay usable while loading (R-PFM-016)
    expect(q('pfm-scope-all')?.hasAttribute('disabled')).toBe(false);
    expect(q('pfm-tab-queue')?.hasAttribute('disabled')).toBe(false);

    pending.resolve(ok(summary('mine')));
    await flush();

    expect(q('pfm-kpi-skeleton')).toBeNull();
    expect(kpiValue('projects')).toBe('2');
    expect(kpiValue('monitored')).toBe('5');
    expect(kpiValue('need_attention')).toBe('3');
    expect(kpiValue('synced')).toBe('1');
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
    expect(kpiValue('need_attention')).toBe('123');
    expect(q('pfm-kpi-projects')?.querySelector('[data-testid="pfm-kpi-sub"]')?.textContent?.trim()).toBe('of 40 in portfolio');
  });

  it('PI with no projects: shows the empty state, no KPI values, and switches to portfolio on click', async () => {
    api.GET_PfmSummary.mockImplementation((scope: PfmScope) => Promise.resolve(ok(summary(scope, scope === 'all'))));
    await create();
    fixture.detectChanges();
    await flush();

    expect(q('pfm-pi-empty')?.textContent).toContain('You are not PI of any project contributing to Pool funding');
    expect(q('pfm-pi-empty-switch')?.textContent?.trim()).toBe('View whole portfolio');
    expect(q('pfm-kpi-cards')).toBeNull();
    expect(el.querySelector('[data-testid="pfm-kpi-value"]')).toBeNull();
    expect(q('pfm-panel-coverage')).toBeNull();

    q('pfm-pi-empty-switch')?.click();
    await flush();
    await flush();

    expect(q('pfm-pi-empty')).toBeNull();
    expect(q('pfm-scope-all')?.getAttribute('aria-pressed')).toBe('true');
    expect(kpiValue('need_attention')).toBe('123');
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
      chip_counts: { all: 41, attention: 7, mapping: 5, ready: 3, pending: 11, prms_rejected: 2, synced: 13 },
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
    api.GET_PfmSummary.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(ok(summary('mine')));
    await create();
    fixture.detectChanges();
    await flush();

    expect(q('pfm-summary-error')).not.toBeNull();
    expect(q('pfm-coverage-error')).not.toBeNull();
    expect(q('pfm-kpi-cards')).toBeNull();

    q('pfm-tab-queue')?.click();
    await flush();
    expect(q('pfm-queue-error')).toBeNull();
    expect(q('pfm-panel-queue')).not.toBeNull();

    q('pfm-summary-retry')?.click();
    await flush();
    await flush();
    expect(q('pfm-summary-error')).toBeNull();
    expect(kpiValue('projects')).toBe('2');
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
});
