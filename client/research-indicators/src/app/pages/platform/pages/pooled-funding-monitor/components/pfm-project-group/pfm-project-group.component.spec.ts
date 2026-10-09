import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PfmGroup, PfmResultRow, PfmSectionState } from '../../pfm.interfaces';
import { PfmStoreService } from '../../services/pfm-store.service';
import { PfmProjectGroupComponent } from './pfm-project-group.component';

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
  pi_line: '',
  mapping_state: 'Not started',
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
    const { fixture, q, el } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    const labels = Array.from(el.querySelectorAll('[role="presentation"] > span')).map(s => s.textContent?.trim());
    expect(labels).toEqual([
      'Code',
      'Result',
      'Indicator',
      'Creator',
      'STAR status',
      'Pool funding mapping',
      'Science Programs',
      'PRMS status',
      'Updated',
      'Action'
    ]);
  });

  it('View is on every row incl. out-of-scope and mapping-incomplete; no other action text; no dialog on click', () => {
    const { store, fixture, q, el } = setup();
    (q('pfm-group-toggle') as HTMLButtonElement).click();
    store.groupRows.set({
      P100: [
        row({ result_code: 'STAR-1', official_code: 1, mapping_state: 'No SP contribution', sp_line: 'Not reported to PRMS' }),
        row({
          result_code: 'STAR-2',
          official_code: 2,
          mapping_state: 'Incomplete',
          star_status_id: 6,
          star_label: 'Approved',
          snapshot_years: [2024, 2025]
        })
      ]
    });
    store.groupState.set({ P100: { loading: false, error: false } });
    fixture.detectChanges();
    const views = Array.from(el.querySelectorAll<HTMLAnchorElement>('[data-testid="pfm-row-view"]'));
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
    expect(q('pfm-group-body')?.className).toContain('overflow-x-auto');
  });
});
