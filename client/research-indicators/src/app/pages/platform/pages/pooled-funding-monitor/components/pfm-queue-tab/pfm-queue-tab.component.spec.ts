import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PfmQueueTabComponent } from './pfm-queue-tab.component';
import { PfmStoreService } from '../../services/pfm-store.service';
import { PfmChip, PfmFilters, PfmQueue, PfmScope } from '../../pfm.interfaces';

// Distinct per-chip counts (KZ-004): a component that derives or swaps them cannot pass.
const QUEUE: PfmQueue = {
  filter_options: {
    projects: [{ code: 'P100', name: 'Alpha project' }],
    science_programs: [{ category: 'Accelerators', items: [{ code: 'ACC1', name: 'Climate Acc' }] }],
    types: [{ id: 3, name: 'Innovation development' }]
  },
  chip_counts: { all: 41, attention: 7, mapping: 5, ready: 3, prms_rejected: 2, synced: 13 },
  groups: [
    {
      code: 'P100',
      name: 'Alpha project',
      lead_pi: 'A. PI',
      donor: 'Donor',
      result_count: 4,
      attention: 1,
      counts: { approved: 1, pending: 1, rejected: 1, out_of_scope: 0, not_sent: 1 }
    }
  ],
  totals: { results: 41, projects: 6, monitored_total: 99 }
};
const EMPTY: PfmFilters = { project: null, sp: null, type: null };

function setup(over: { queue?: PfmQueue | null; scope?: PfmScope; chip?: PfmChip | null; filters?: PfmFilters; loading?: boolean } = {}) {
  const store = {
    queue: signal(over.queue === undefined ? QUEUE : over.queue),
    scope: signal<PfmScope>(over.scope ?? 'all'),
    chip: signal<PfmChip | null>(over.chip ?? null),
    filters: signal<PfmFilters>(over.filters ?? EMPTY),
    queueState: signal({ loading: over.loading ?? false, error: false }),
    openGroups: signal<ReadonlySet<string>>(new Set()),
    groupRows: signal({}),
    groupState: signal({}),
    toggleGroup: jest.fn(),
    retryGroup: jest.fn(),
    groupViews: signal({}),
    setGroupView: jest.fn(),
    setFilter: jest.fn(),
    setChip: jest.fn(),
    resetFilters: jest.fn()
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [PfmQueueTabComponent], providers: [{ provide: PfmStoreService, useValue: store }] });
  const fixture = TestBed.createComponent(PfmQueueTabComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { store, fixture, el, q: (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null };
}

describe('PfmQueueTabComponent', () => {
  it('renders each chip count from the server chip_counts, in owner order, with no Need attention quick view', () => {
    const { el } = setup();
    const chips = Array.from(el.querySelectorAll('[data-testid="pfm-chips"] button'));
    // visible text only: the sr-only explanation is checked in its own test
    const visible = (c: Element) => {
      const clone = c.cloneNode(true) as Element;
      clone.querySelectorAll('.sr-only').forEach(n => n.remove());
      return clone.textContent?.replace(/\s+/g, ' ').trim();
    };
    expect(chips.map(visible)).toEqual([
      'All results 41',
      'Mapping pending 5',
      'Ready to sync 3',
      'Synced with PRMS 13'
    ]);
  });

  it('single selection: the active chip has aria-pressed and a non-color check marker; null chip means All results', () => {
    const { q, el } = setup({ chip: 'ready_to_sync' });
    expect(q('pfm-chip-ready_to_sync')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('pfm-chip-ready_to_sync')?.querySelector('[data-testid="pfm-chip-check"]')).not.toBeNull();
    expect(el.querySelectorAll('[aria-pressed="true"]').length).toBe(1);
    const none = setup({ chip: null });
    expect(none.q('pfm-chip-all')?.getAttribute('aria-pressed')).toBe('true');
  });

  it("treats the 'all' chip value like null", () => {
    const { q } = setup({ chip: 'all' });
    expect(q('pfm-chip-all')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a chip sets it; clicking All clears it; clicking the active chip does nothing', () => {
    const { q, store } = setup({ chip: 'synced' });
    q('pfm-chip-synced')?.click();
    expect(store.setChip).not.toHaveBeenCalled();
    q('pfm-chip-ready_to_sync')?.click();
    expect(store.setChip).toHaveBeenCalledWith('ready_to_sync');
    q('pfm-chip-all')?.click();
    expect(store.setChip).toHaveBeenCalledWith(null);
  });

  it('Reset delegates to the store (which restores all three filters and the chip)', () => {
    const { q, store } = setup({ filters: { project: 'P100', sp: 'ACC1', type: 3 }, chip: 'synced' });
    q('pfm-reset')?.click();
    expect(store.resetFilters).toHaveBeenCalledTimes(1);
  });

  it('maps the All sentinel to null and passes real values through', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.onFilter('project', '__all__');
    expect(store.setFilter).toHaveBeenLastCalledWith('project', null);
    fixture.componentInstance.onFilter('type', 3);
    expect(store.setFilter).toHaveBeenLastCalledWith('type', 3);
  });

  it('offers three data-driven filters (SP grouped by category), no Status filter and no year filter', () => {
    const { fixture, el, q } = setup();
    const c = fixture.componentInstance;
    expect(el.querySelectorAll('p-select').length).toBe(3);
    expect(q('pfm-filter-status')).toBeNull();
    expect(q('pfm-chip-awaiting_pi')).toBeNull();
    expect(q('pfm-filters-card')?.textContent).toContain('Project contributing to CGIAR Portfolio');
    expect(c.projectOptions().map(o => o.label)).toEqual(['All projects', 'P100 — Alpha project']);
    expect(c.spOptions().map(g => g.label)).toEqual(['All Science Programs', 'Accelerators']);
    expect(c.spOptions()[1].items[0]).toEqual({ label: 'ACC1 — Climate Acc', value: 'ACC1' });
    expect(c.typeOptions().map(o => o.label)).toEqual(['All types', 'Innovation development']);
    expect(el.textContent?.toLowerCase()).not.toContain('year');
  });

  it('count line copy for portfolio and PI scope (singular project); no colour legend any more', () => {
    const all = setup({ scope: 'all' });
    expect(all.q('pfm-count-line')?.textContent?.trim()).toBe('Showing 41 results across 6 projects · 99 flagged portfolio-wide');
    expect(all.q('pfm-legend')).toBeNull();
    const mine = setup({ scope: 'mine', queue: { ...QUEUE, totals: { results: 1, projects: 1, monitored_total: 99 } } });
    expect(mine.q('pfm-count-line')?.textContent?.trim()).toBe('Showing 1 results across 1 project where you are PI');
  });

  it('every quick view explains itself (tooltip + sr-only) and carries its state colour', () => {
    const { el, q } = setup();
    for (const key of ['all', 'mapping_incomplete', 'ready_to_sync', 'synced']) {
      const chip = q('pfm-chip-' + key)!;
      const help = el.querySelector('#pfm-chip-help-' + key)?.textContent?.trim();
      expect(help?.length).toBeGreaterThan(10);
      expect(chip.getAttribute('aria-describedby')).toBe('pfm-chip-help-' + key);
    }
    // jsdom drops var() colours from the CSSOM: assert the dot is rendered and the colour it is bound to.
    expect(q('pfm-chip-all')?.querySelector('[data-testid="pfm-chip-dot"]')).toBeNull();
    expect(q('pfm-chip-mapping_incomplete')?.querySelector('[data-testid="pfm-chip-dot"]')).not.toBeNull();
    const chips = TestBed.createComponent(PfmQueueTabComponent).componentInstance.chips;
    const dot = (key: string) => chips.find(c => c.key === key)?.dot;
    expect(dot('all')).toBeNull();
    expect(dot('synced')).toBe('var(--ac-state-done-fill)');
    expect(dot('ready_to_sync')).toBe('var(--ac-state-ready-fill)');
    expect(dot('mapping_incomplete')).toBe('var(--ac-status-mapping-pending)');
  });

  it('shows the empty state with Reset when groups is empty', () => {
    const { q, store } = setup({ queue: { ...QUEUE, groups: [] } });
    expect(q('pfm-queue-empty')?.textContent).toContain('No results match these filters');
    q('pfm-empty-reset')?.click();
    expect(store.resetFilters).toHaveBeenCalled();
  });

  it('keeps filters and chips rendered while refetching; only the groups area shows a skeleton', () => {
    const { q } = setup({ loading: true });
    expect(q('pfm-groups-skeleton')).not.toBeNull();
    expect(q('pfm-filter-project')).not.toBeNull();
    expect(q('pfm-chip-all')).not.toBeNull();
    expect(q('pfm-queue-empty')).toBeNull();
  });

  it('renders nothing before the first queue arrives', () => {
    expect(setup({ queue: null }).q('pfm-queue-tab')).toBeNull();
  });

  // Owner 2026-10-21: Rejected by PRMS is not a quick view any more.
  it('has no Rejected by PRMS quick view', () => {
    const { q, el } = setup();
    expect(q('pfm-chip-rejected')).toBeNull();
    expect(el.querySelector('[data-testid="pfm-chips"]')?.textContent).not.toContain('Rejected by PRMS');
    expect(q('pfm-hidden-chip')).toBeNull();
  });

  // "Fix and send again" on the coverage tab still opens the rejected results: never filter invisibly.
  it('when the rejected view is active (from the coverage tab) it shows as a removable tag', () => {
    const { q, store } = setup({ chip: 'rejected' });
    expect(q('pfm-hidden-chip')?.textContent).toContain('Showing: Rejected by PRMS');
    q('pfm-hidden-chip-clear')?.click();
    expect(store.setChip).toHaveBeenCalledWith(null);
  });

  // Owner 2026-10-22: Need attention is not a quick view; an old ?chip=need_attention link still filters, visibly.
  it('has no Need attention quick view; an old link to it shows as a removable tag', () => {
    expect(setup().q('pfm-chip-need_attention')).toBeNull();
    const { q, store } = setup({ chip: 'need_attention' });
    expect(q('pfm-hidden-chip')?.textContent).toContain('Showing: Need attention');
    q('pfm-hidden-chip-clear')?.click();
    expect(store.setChip).toHaveBeenCalledWith(null);
  });

  describe('fallbacks', () => {
    it('shows no tag for a chip that is neither a quick view nor a known hidden view', () => {
      const { fixture } = setup({ chip: 'bogus' as PfmChip });

      expect(fixture.componentInstance.hiddenChip()).toBeNull();
    });

    it('before the first queue: only the "All" options, an empty count line', () => {
      const { fixture } = setup({ queue: null });
      const cmp = fixture.componentInstance;

      expect(cmp.projectOptions()).toEqual([{ label: 'All projects', value: '__all__' }]);
      expect(cmp.spOptions()).toEqual([{ label: 'All Science Programs', items: [{ label: 'All Science Programs', value: '__all__' }] }]);
      expect(cmp.typeOptions()).toEqual([{ label: 'All types', value: '__all__' }]);
      expect(cmp.countLine()).toBe('');
    });
  });
});
