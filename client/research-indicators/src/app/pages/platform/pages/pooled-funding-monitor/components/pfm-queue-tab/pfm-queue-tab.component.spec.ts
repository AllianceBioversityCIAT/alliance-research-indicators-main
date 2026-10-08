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
  chip_counts: { all: 41, attention: 7, mapping: 5, ready: 3, pending: 11, prms_rejected: 2, synced: 13 },
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
const EMPTY: PfmFilters = { project: null, sp: null, status: null, type: null };

function setup(over: { queue?: PfmQueue | null; scope?: PfmScope; chip?: PfmChip | null; filters?: PfmFilters; loading?: boolean } = {}) {
  const store = {
    queue: signal(over.queue === undefined ? QUEUE : over.queue),
    scope: signal<PfmScope>(over.scope ?? 'all'),
    chip: signal<PfmChip | null>(over.chip ?? null),
    filters: signal<PfmFilters>(over.filters ?? EMPTY),
    queueState: signal({ loading: over.loading ?? false, error: false }),
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
  it('renders each chip count from the server chip_counts, in mockup order', () => {
    const { el } = setup();
    const chips = Array.from(el.querySelectorAll('[data-testid="pfm-chips"] button'));
    expect(chips.map(c => c.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All results 41',
      'Need attention 7',
      'Mapping incomplete 5',
      'Ready to sync 3',
      'Awaiting PI 11',
      'Rejected by PRMS 2',
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
    q('pfm-chip-rejected')?.click();
    expect(store.setChip).toHaveBeenCalledWith('rejected');
    q('pfm-chip-all')?.click();
    expect(store.setChip).toHaveBeenCalledWith(null);
  });

  it('Reset delegates to the store (which restores all four filters and the chip)', () => {
    const { q, store } = setup({ filters: { project: 'P100', sp: 'ACC1', status: 'draft', type: 3 }, chip: 'synced' });
    q('pfm-reset')?.click();
    expect(store.resetFilters).toHaveBeenCalledTimes(1);
  });

  it('maps the All sentinel to null and passes real values through', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.onFilter('project', '__all__');
    expect(store.setFilter).toHaveBeenLastCalledWith('project', null);
    fixture.componentInstance.onFilter('type', 3);
    expect(store.setFilter).toHaveBeenLastCalledWith('type', 3);
    fixture.componentInstance.onFilter('status', 'draft');
    expect(store.setFilter).toHaveBeenLastCalledWith('status', 'draft');
  });

  it('offers four data-driven filters (SP grouped by category) and no year filter', () => {
    const { fixture, el } = setup();
    const c = fixture.componentInstance;
    expect(el.querySelectorAll('p-select').length).toBe(4);
    expect(c.projectOptions().map(o => o.label)).toEqual(['All projects', 'P100 — Alpha project']);
    expect(c.spOptions().map(g => g.label)).toEqual(['All Science Programs', 'Accelerators']);
    expect(c.spOptions()[1].items[0]).toEqual({ label: 'ACC1 — Climate Acc', value: 'ACC1' });
    expect(c.typeOptions().map(o => o.label)).toEqual(['All types', 'Innovation development']);
    expect(c.statusOptions.length).toBe(7);
    expect(el.textContent?.toLowerCase()).not.toContain('year');
  });

  it('count line copy for portfolio and PI scope (singular project), plus the legend', () => {
    const all = setup({ scope: 'all' });
    expect(all.q('pfm-count-line')?.textContent?.trim()).toBe('Showing 41 results across 6 projects · 99 flagged portfolio-wide');
    expect(Array.from(all.el.querySelectorAll('[data-testid="pfm-legend"] li')).map(l => l.textContent?.trim())).toEqual([
      'Approved in PRMS',
      'Pending review',
      'Rejected',
      'Not synced'
    ]);
    const mine = setup({ scope: 'mine', queue: { ...QUEUE, totals: { results: 1, projects: 1, monitored_total: 99 } } });
    expect(mine.q('pfm-count-line')?.textContent?.trim()).toBe('Showing 1 results across 1 project where you are PI');
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
});
