import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DataTableColumn, DataTableComponent } from './data-table.component';
import * as xlsxExportUtil from '@shared/utils/xlsx-export.util';

interface ValueRow extends Record<string, unknown> {
  id: number;
  code: string;
  value: string;
  isActive: boolean;
}

// 12 rows / page size 10: the disqualifier in tasks.md T-03 is explicit — "a table test with
// fewer rows than one page cannot tell all pages from the current page". 11 of the 12 contain
// "Alpha" so a search can exclude exactly one, giving the falsifier-5 fixture its "11, not 12 and
// not 10" shape. Codes include a two-digit suffix (UOM-10/UOM-11/UOM-12) — the other disqualifier
// ("a comparator fixture without a two-digit number cannot tell natural from lexical order").
//
// Resize persistence (R-CTL-009 AC.2, tasks.md T-03 disqualifier): jsdom cannot measure rendered
// column widths, so "a column resize survives a page/sort change" is NOT asserted anywhere in
// this file — T-05 checks it in a real browser. This is the same disclaimer as the one next to
// `[resizableColumns]` in `data-table.component.ts`, copied here per the Leader's brief (T-03
// rework) so the gap is visible from the spec, not only from the component source.
function buildRows(): ValueRow[] {
  const rows: ValueRow[] = [];
  for (let i = 1; i <= 12; i++) {
    rows.push({ id: i, code: `UOM-${i}`, value: i === 7 ? 'Score (0-100)' : `Alpha value ${i}`, isActive: i % 2 === 0 });
  }
  return rows;
}

const columns: DataTableColumn<ValueRow>[] = [
  { field: 'code', header: 'Code', sortable: true, type: 'code' },
  { field: 'value', header: 'Value', sortable: true, type: 'text' },
  { field: 'isActive', header: 'Active', sortable: false, type: 'badge' }
];

@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `<app-data-table
    [columns]="columns"
    [rows]="rows()"
    [searchFields]="['value']"
    exportFileName="values.xlsx"
  ></app-data-table>`
})
class HostComponent {
  columns = columns;
  rows = signal<ValueRow[]>(buildRows());
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function renderedCodeColumn(): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="cell-code"]')).map(el =>
      el.textContent!.trim()
    );
  }

  function headerCell(field: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="column-header-${field}"]`) as HTMLElement;
  }

  // ─── Default natural sort by the first `code` column, ascending (design §6.3 / F-7) ──────

  it('renders rows already sorted naturally by the first code column, ascending, on open', async () => {
    await setup();

    // Natural order: UOM-1, UOM-2 … UOM-9, UOM-10, UOM-11, UOM-12 — a LEXICAL sort would read
    // UOM-1, UOM-10, UOM-11, UOM-12, UOM-2, … instead. Only the first page (10) is rendered.
    expect(renderedCodeColumn()).toEqual([
      'UOM-1',
      'UOM-2',
      'UOM-3',
      'UOM-4',
      'UOM-5',
      'UOM-6',
      'UOM-7',
      'UOM-8',
      'UOM-9',
      'UOM-10'
    ]);
  });

  it('exposes aria-sort on the default-sorted header, and "none" on the others', async () => {
    await setup();

    expect(headerCell('code').getAttribute('aria-sort')).toBe('ascending');
    expect(headerCell('value').getAttribute('aria-sort')).toBe('none');
  });

  // ─── Sort through the RENDERED <p-table [customSort] (sortFunction)> binding (KZ-001) ─────
  // Clicking the real header — not calling an instance method — is what must turn red if the
  // `[customSort]`/`(sortFunction)` wiring is removed from the template (tasks.md T-03 KZ-001).
  //
  // Tightened (T-03 rework, reliability finding 3): the previous version asserted only
  // `toContain('Alpha value 1')`, which also matches "Alpha value 10/11/12" and so could not
  // tell a natural sort from a lexical one. This asserts the EXACT first page, ascending then
  // descending. Fixture reminder: row 7's value is "Score (0-100)", not "Alpha value 7" — natural
  // ascending order is therefore 1,2,3,4,5,6,8,9,10,11 (7 is the odd one out, not missing).

  function renderedValueColumn(): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="cell-value"]')).map(el =>
      el.textContent!.trim()
    );
  }

  it('sorts by a clicked header using the natural comparator, toggling ascending/descending on click', async () => {
    await setup();

    headerCell('value').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(headerCell('value').getAttribute('aria-sort')).toBe('ascending');
    // Ascending by `value`, natural compare: "Alpha value 2" < "Alpha value 10" (NOT the lexical
    // "Alpha value 10" < "Alpha value 2"), and "Score (0-100)" sorts after every "Alpha value *"
    // (first page only shows the first 10 of the 11 "Alpha value" rows — "Score" is row 11 of 12).
    expect(renderedValueColumn()).toEqual([
      'Alpha value 1',
      'Alpha value 2',
      'Alpha value 3',
      'Alpha value 4',
      'Alpha value 5',
      'Alpha value 6',
      'Alpha value 8',
      'Alpha value 9',
      'Alpha value 10',
      'Alpha value 11'
    ]);

    headerCell('value').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(headerCell('value').getAttribute('aria-sort')).toBe('descending');
    expect(renderedValueColumn()).toEqual([
      'Score (0-100)',
      'Alpha value 12',
      'Alpha value 11',
      'Alpha value 10',
      'Alpha value 9',
      'Alpha value 8',
      'Alpha value 6',
      'Alpha value 5',
      'Alpha value 4',
      'Alpha value 3'
    ]);
  });

  // ─── Local search over the configured fields ───────────────────────────────────────────────

  it('filters rows locally over the configured search fields', async () => {
    await setup();

    const input = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="data-table-search"]') as HTMLInputElement;
    input.value = 'Score';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="data-table-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Score (0-100)');
  });

  // ─── AC.1 — a page-size change keeps the current sort AND search (falsifier 6) ────────────

  it('keeps the current sort and search when the page size changes', async () => {
    await setup();
    const hostDebugDataTable = fixture.debugElement.children[0];
    const dataTable = hostDebugDataTable.componentInstance as DataTableComponent<ValueRow>;

    // Sort descending by value, and narrow the search to the 11 "Alpha" rows first.
    headerCell('value').click();
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="data-table-search"]') as HTMLInputElement;
    input.value = 'Alpha';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dataTable.sortField()).toBe('value');
    expect(dataTable.searchTerm()).toBe('Alpha');

    // A page-size change (the real (onPage) contract: {first, rows}) must not reset either.
    dataTable.onPage({ first: 0, rows: 25 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dataTable.pageSize()).toBe(25);
    expect(dataTable.sortField()).toBe('value');
    expect(dataTable.searchTerm()).toBe('Alpha');
    // With the search still active (11 rows, the only "Score" row excluded) and the new page
    // size covering all of them in one page, every one of the 11 filtered rows renders.
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="data-table-row"]');
    expect(rows.length).toBe(11);
  });

  // ─── Export: filtered + sorted rows, across ALL pages (falsifier 5) ────────────────────────

  it('exports the filtered and sorted rows of ALL pages, not only the current page', async () => {
    await setup();
    const dataTable = fixture.debugElement.children[0].componentInstance as DataTableComponent<ValueRow>;
    const exportSpy = jest.spyOn(xlsxExportUtil, 'exportRowsToXlsx').mockResolvedValue(undefined);

    // Search narrows 12 rows to 11 (the "Score" row is excluded) while the page size (10) would
    // only show the first page — the export must still carry all 11, not 10 and not 12.
    const input = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="data-table-search"]') as HTMLInputElement;
    input.value = 'Alpha';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    await dataTable.exportValues();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const [callArg] = exportSpy.mock.calls[0];
    expect(callArg.rows).toHaveLength(11);
    expect(callArg.rows.some(row => row.value.includes('Score'))).toBe(false);
    expect(callArg.fileName).toBe('values.xlsx');

    exportSpy.mockRestore();
  });

  // ─── No rows vs. no matches (R-CTL-008, Leader-adjudicated defect, T-03 rework) ────────────
  // A search that excludes every row is not the same state as the list genuinely being empty:
  // the old code rendered the parent's "No values yet for this list. + Add value" empty state
  // (and unmounted `<p-table>`) for BOTH, which is a false empty state while a search is active.

  it('shows a "no matches" message (table still mounted) when a search excludes every row, not the true-empty state', async () => {
    await setup();

    const input = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="data-table-search"]') as HTMLInputElement;
    input.value = 'nothing matches this';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="data-table"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="data-table-no-matches"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="data-table-empty"]')).toBeFalsy();
  });

  // ─── Loading / empty slots (R-CTL-008) ─────────────────────────────────────────────────────

  it('shows the empty state when there are no rows and not loading', async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.rows.set([]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="data-table-empty"]')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="data-table"]')).toBeFalsy();
  });

  it('shows the loading indicator while loading', async () => {
    @Component({
      standalone: true,
      imports: [DataTableComponent],
      template: `<app-data-table [columns]="columns" [rows]="[]" [loading]="true"></app-data-table>`
    })
    class LoadingHost {
      columns = columns;
    }

    await TestBed.configureTestingModule({
      imports: [LoadingHost],
      providers: [provideNoopAnimations()]
    }).compileComponents();
    const loadingFixture = TestBed.createComponent(LoadingHost);
    loadingFixture.detectChanges();

    expect((loadingFixture.nativeElement as HTMLElement).querySelector('[data-testid="progress-bar"], p-progressbar')).toBeTruthy();
  });
});
