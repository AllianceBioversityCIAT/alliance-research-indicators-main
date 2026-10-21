import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PfmGroup, PfmResultRow, PfmSectionState } from '../../pfm.interfaces';
import { PfmStoreService } from '../../services/pfm-store.service';
import { matchesPfmSearch, PfmProjectGroupComponent, toTableRow } from './pfm-project-group.component';

const GROUP: PfmGroup = {
  code: 'P100',
  name: 'Alpha project',
  lead_pi: 'A. PI',
  donor: 'Donor X',
  result_count: 7,
  attention: 2,
  counts: { approved: 3, pending: 2, rejected: 0, out_of_scope: 1, not_sent: 1 }
};
const row = (over: Partial<PfmResultRow>): PfmResultRow => ({
  result_code: 'STAR-1',
  platform_code: 'STAR',
  official_code: 1,
  report_year: 2025,
  snapshot_years: [],
  title: 'R',
  type: 'T',
  creator: null,
  star_label: 'Draft',
  star_status_id: 1,
  star_status_name: null,
  star_status_config: null,
  star_status_description: null,
  star_approved_label: null,
  science_programs: [],
  pi_line: '',
  mapping_state: 'Pending',
  mapping_note: '',
  sp_line: '',
  primary_sp: null,
  contributing: [],
  prms_status: 'Not sent',
  prms_hint: '',
  updated_at: '—',
  ...over
});

function setup(group: PfmGroup = GROUP) {
  const store = {
    openGroups: signal<ReadonlySet<string>>(new Set()),
    groupRows: signal<Record<string, PfmResultRow[]>>({}),
    groupState: signal<Record<string, PfmSectionState>>({}),
    toggleGroup: jest.fn((code: string) => {
      const s = new Set(store.openGroups());
      if (s.has(code)) s.delete(code);
      else {
        s.add(code);
        store.groupState.update(m => ({ ...m, [code]: { loading: true, error: false } }));
      }
      store.openGroups.set(s);
    }),
    retryGroup: jest.fn()
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PfmProjectGroupComponent],
    providers: [{ provide: PfmStoreService, useValue: store }, provideRouter([])]
  });
  const fixture = TestBed.createComponent(PfmProjectGroupComponent);
  fixture.componentRef.setInput('group', group);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { store, fixture, el, q: (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null };
}

describe('PfmProjectGroupComponent', () => {
  it('starts collapsed with aria-expanded=false and no body', () => {
    const { q } = setup();
    expect(q('pfm-group-toggle')?.getAttribute('aria-expanded')).toBe('false');
    expect(q('pfm-group-body')).toBeNull();
  });

  it('header shows code, name, lead PI · donor, count and the attention flag', () => {
    const { q } = setup();
    expect(q('pfm-group-code')?.textContent?.trim()).toBe('P100');
    expect(q('pfm-group-name')?.textContent?.trim()).toBe('Alpha project');
    expect(q('pfm-group-lead')?.textContent?.trim()).toBe('Lead PI: A. PI · Donor X');
    expect(q('pfm-group-count')?.textContent?.trim()).toBe('7 results');
    expect(q('pfm-group-flag')?.textContent?.trim()).toBe('2 need attention');
  });

  it('flag copy: singular, plural and All clear; singular result count', () => {
    expect(
      setup({ ...GROUP, attention: 1, result_count: 1 })
        .q('pfm-group-flag')
        ?.textContent?.trim()
    ).toBe('1 needs attention');
    const clear = setup({ ...GROUP, attention: 0 });
    expect(clear.q('pfm-group-flag')?.textContent?.trim()).toBe('All clear');
    expect(
      setup({ ...GROUP, result_count: 1 })
        .q('pfm-group-count')
        ?.textContent?.trim()
    ).toBe('1 result');
  });

  it('bar renders only non-zero segments, each with a title from server counts', () => {
    const { el } = setup();
    const segs = Array.from(el.querySelectorAll('[data-testid="pfm-group-bar"] > span'));
    expect(segs.map(s => s.getAttribute('title'))).toEqual([
      '3 approved in PRMS',
      '2 pending review',
      '1 no SP contribution · out of PRMS scope',
      '1 not synced yet'
    ]);
    expect(el.querySelector('[data-testid="pfm-group-seg-rejected"]')).toBeNull();
    // The bar is decorative; its text alternative lives in the button (no list inside a button).
    expect(el.querySelector('[data-testid="pfm-group-bar"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('[data-testid="pfm-group-toggle"] ul')).toBeNull();
    const summary = el.querySelector('[data-testid="pfm-group-bar-summary"]') as HTMLElement;
    expect(summary.className).toContain('sr-only');
    expect(summary.textContent).toBe('3 approved in PRMS, 2 pending review, 1 no SP contribution · out of PRMS scope, 1 not synced yet');
  });

  it('a native button toggles on click: aria-expanded flips and the call goes to the store', () => {
    const { store, fixture, q } = setup();
    const btn = q('pfm-group-toggle') as HTMLButtonElement;
    // A native <button type=button> gives Enter/Space activation in browsers; jsdom only models the click.
    expect(btn.tagName).toBe('BUTTON');
    btn.click();
    fixture.detectChanges();
    expect(store.toggleGroup).toHaveBeenCalledWith('P100');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-controls')).toBe(q('pfm-group-body')?.id);
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('expand shows 3 skeleton rows, then rows when the deferred load resolves', () => {
    const { store, fixture, q, el } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelectorAll('[data-testid="pfm-row-skeleton"]').length).toBe(3);
    expect(el.querySelector('[data-testid="pfm-result-row"]')).toBeNull();
    store.groupRows.set({ P100: [row({ result_code: 'STAR-1' }), row({ result_code: 'STAR-2', official_code: 2 })] });
    store.groupState.set({ P100: { loading: false, error: false } });
    fixture.detectChanges();
    expect(q('pfm-rows-skeleton')).toBeNull();
    expect(el.querySelectorAll('[data-testid="pfm-result-row"]').length).toBe(2);
  });

  it('per-group error shows Retry that calls the store', () => {
    const { store, fixture, q } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    store.groupState.set({ P100: { loading: false, error: true } });
    fixture.detectChanges();
    expect(q('pfm-group-error')).not.toBeNull();
    (q('pfm-group-retry') as HTMLButtonElement).click();
    expect(store.retryGroup).toHaveBeenCalledWith('P100');
  });

  it('header lists the columns in order, with Creator after Indicator and Science Programs after the mapping', () => {
    const { store, fixture, q, el } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    store.groupRows.set({ P100: [row({})] });
    store.groupState.set({ P100: { loading: false, error: false } });
    fixture.detectChanges();
    const labels = Array.from(el.querySelectorAll('[data-testid="pfm-group-table"] thead th')).map(s => s.textContent?.trim());
    expect(labels).toEqual([
      'Code',
      'Result',
      'Indicator',
      'Creator',
      'STAR status',
      'CGIAR Portfolio mapping',
      'Science Programs',
      'PRMS status',
      'Updated'
    ]);
  });

  it('every row (incl. out-of-scope and mapping-pending) opens the result from its title; no other action; no dialog on click', () => {
    const { store, fixture, q, el } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    store.groupRows.set({
      P100: [
        row({ result_code: 'STAR-1', official_code: 1, mapping_state: 'No SP contribution', sp_line: 'Not reported to PRMS' }),
        row({
          result_code: 'STAR-2',
          official_code: 2,
          mapping_state: 'Pending',
          star_status_id: 6,
          star_label: 'Approved',
          snapshot_years: [2024, 2025]
        })
      ]
    });
    store.groupState.set({ P100: { loading: false, error: false } });
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="pfm-row-view"]')).toBeNull();
    const views = Array.from(el.querySelectorAll<HTMLAnchorElement>('[data-testid="pfm-row-title"]'));
    expect(views.map(v => v.getAttribute('href'))).toEqual([
      '/result/STAR-1?from=pfm-monitor',
      '/result/STAR-2/general-information?version=2025&from=pfm-monitor'
    ]);
    views[0].addEventListener('click', e => e.preventDefault());
    views[0].click();
    expect(el.querySelector('[role="dialog"], p-dialog, p-drawer, dialog')).toBeNull();
    expect(el.textContent).not.toMatch(/Sync|Request approval|Complete mapping/);
  });

  it('table body scrolls horizontally inside the card (NFR-PFM-005)', () => {
    const { store, fixture, q } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    store.groupRows.set({ P100: [row({})] });
    store.groupState.set({ P100: { loading: false, error: false } });
    fixture.detectChanges();
    expect(q('pfm-group-table')?.parentElement?.className).toContain('overflow-x-auto');
  });

  // ─── Results Center table recipe: sort icons, paginator, search + Clear ───
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      row({
        result_code: `STAR-${i + 1}`,
        official_code: i + 1,
        title: i === 4 ? 'Seed banking for drought' : `Result number ${i + 1}`,
        creator: i % 2 ? 'Ana Gomez' : 'Luis Perez',
        updated_at_iso: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00.000Z`
      })
    );

  function openWith(rows: PfmResultRow[]) {
    const ctx = setup();
    (ctx.q('pfm-group-toggle') as HTMLButtonElement).click();
    ctx.store.groupRows.set({ P100: rows });
    ctx.store.groupState.set({ P100: { loading: false, error: false } });
    ctx.fixture.detectChanges();
    const bodyRows = () => Array.from(ctx.el.querySelectorAll('[data-testid="pfm-group-table"] tbody tr[data-testid="pfm-result-row"]'));
    return { ...ctx, bodyRows };
  }

  it('nine columns, no Action column, and every column has a sort icon', () => {
    const { el } = openWith([row({})]);
    const ths = Array.from(el.querySelectorAll('[data-testid="pfm-group-table"] thead th'));
    expect(ths).toHaveLength(9);
    expect(ths.every(th => !!th.querySelector('p-sorticon, p-sortIcon'))).toBe(true);
  });

  it('opens on 5 rows per page with the Results Center page report', () => {
    const { el, bodyRows } = openWith(many(23));
    expect(bodyRows()).toHaveLength(5);
    expect(el.querySelector('.p-paginator-current')?.textContent?.trim()).toBe('Showing 1 to 5 of 23 results');
  });

  it('the rows-per-page dropdown opens on the body, so the group card cannot clip it', () => {
    const { el, fixture } = openWith(many(23));
    const table = fixture.debugElement.query(sel => sel.nativeElement?.getAttribute?.('data-testid') === 'pfm-group-table');
    expect(table.componentInstance.paginatorDropdownAppendTo).toBe('body');
    expect(el.querySelector('.p-paginator-rpp-dropdown')).not.toBeNull();
  });

  it('keeps the page size the user picks', () => {
    const { fixture, bodyRows } = openWith(many(23));
    fixture.componentInstance.pageSize.set(10);
    fixture.detectChanges();
    expect(bodyRows()).toHaveLength(10);
  });

  it('search narrows by every word (AND) and goes back to page 1; Clear restores everything', () => {
    const { fixture, el, bodyRows } = openWith(many(23));
    const cmp = fixture.componentInstance;
    cmp.first.set(10);
    cmp.setSearch('seed drought');
    fixture.detectChanges();
    expect(cmp.first()).toBe(0);
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0].textContent).toContain('Seed banking for drought');
    cmp.setSearch('seed nothing-like-this');
    fixture.detectChanges();
    expect(bodyRows()).toHaveLength(0);
    expect(el.querySelector('[data-testid="pfm-group-empty"]')?.textContent?.trim()).toBe('No results match “seed nothing-like-this”.');
    cmp.clear();
    fixture.detectChanges();
    expect(cmp.search()).toBe('');
    expect(bodyRows()).toHaveLength(5);
  });

  it('the search box is the shared one, with Clear and without Apply Filters', () => {
    const { el } = openWith([row({})]);
    const box = el.querySelector('[data-testid="pfm-group-search"]')!;
    expect(box.querySelector('app-search-export-controls')).not.toBeNull();
    expect(box.textContent).toContain('Clear Filters');
    expect(box.textContent).not.toContain('Apply Filters');
  });

  it('sorting Updated uses the real instant, not the "dd Mon, HH:mm" label', () => {
    const rows = [
      row({ result_code: 'STAR-1', official_code: 1, updated_at: '02 Jan, 10:00', updated_at_iso: '2026-01-02T10:00:00.000Z' }),
      row({ result_code: 'STAR-2', official_code: 2, updated_at: '01 Feb, 10:00', updated_at_iso: '2026-02-01T10:00:00.000Z' })
    ];
    const { el, fixture, bodyRows } = openWith(rows);
    (el.querySelector('[data-testid="pfm-col-updated_sort"]') as HTMLElement).click();
    fixture.detectChanges();
    // label order would put "01 Feb" first; the instant puts 2 Jan first
    expect(bodyRows().map(r => r.querySelector('[data-testid="pfm-row-updated"]')?.textContent?.trim())).toEqual(['02 Jan, 10:00', '01 Feb, 10:00']);
  });
});

describe('project table search helpers', () => {
  const r = toTableRow({
    result_code: 'STAR-90011',
    platform_code: 'STAR',
    official_code: 90011,
    report_year: 2026,
    snapshot_years: [],
    title: 'Climate seed vault',
    type: 'Innovation Use',
    creator: 'Daniela Zuniga',
    star_label: 'Approved',
    star_status_id: 6,
    star_status_name: 'Approved',
    star_status_config: null,
    star_status_description: null,
    star_approved_label: null,
    science_programs: [{ code: 'SP13', name: 'Genebank', primary: true, color: null }],
    pi_line: '',
    mapping_state: 'Complete',
    mapping_note: '',
    sp_line: '',
    primary_sp: null,
    contributing: [],
    prms_status: 'Rejected',
    prms_hint: '',
    updated_at: '—'
  });

  it.each([
    ['STAR-90011', true],
    ['90011', true],
    ['climate VAULT', true],
    ['daniela', true],
    ['genebank', true],
    ['sp13 rejected', true],
    ['complete approved', true],
    ['climate drought', false],
    ['', true]
  ])('"%s" -> %s', (term, expected) => {
    expect(matchesPfmSearch(r, term)).toBe(expected);
  });

  it('sort values: lower-case title, SP codes, ISO updated ("" when unknown)', () => {
    expect([r.title_sort, r.sp_sort, r.updated_sort, r.star_sort]).toEqual(['climate seed vault', 'SP13', '', 'Approved']);
  });
});
