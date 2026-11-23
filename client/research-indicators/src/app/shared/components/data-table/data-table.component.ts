import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ContentChild, EventEmitter, Input, Output, signal, TemplateRef } from '@angular/core';
import { TableModule, TablePageEvent } from 'primeng/table';
import { CustomProgressBarComponent } from '../custom-progress-bar/custom-progress-bar.component';
import { naturalCompare } from '@shared/utils/natural-compare.util';
import { exportRowsToXlsx } from '@shared/utils/xlsx-export.util';

/**
 * `code` gets its own token-styled chip rendering (design §6.4); `badge` renders a
 * boolean field as an Active/Inactive pill; `number` right-aligns. Default is `text`.
 */
export type DataTableColumnType = 'text' | 'code' | 'badge' | 'number';

export interface DataTableColumn<T> {
  field: keyof T & string;
  header: string;
  /** A CSS width, e.g. '96px'. Column resizing (design §6.3) overrides this once dragged. */
  width?: string;
  sortable?: boolean;
  type?: DataTableColumnType;
}

interface SortEvent {
  field?: string;
  order?: number;
}

// @akili-spec institutional-performance/control-lists T-03 (client half) — design §6.3 (F-7),
// requirements R-CTL-009. A reusable table standard for every NEW table in the app (family.md
// F-7); existing tables are explicitly out of scope (family.md §5 deferred retrofit).
//
// KZ-001 (reworded, T-03 rework — reliability finding 3): sorting is wired through the RENDERED
// `<p-table [customSort]="true" (sortFunction)="onSortFunction($event)">` binding below, not only
// an instance method. Observed directly (not assumed) against the exact-order click-sort test in
// `data-table.component.spec.ts` ("sorts by a clicked header using the natural comparator,
// toggling ascending/descending on click"): removing EITHER `[customSort]="true"` or
// `(sortFunction)="onSortFunction($event)"` reddens that test's `toEqual([...])` exact-row-order
// assertion (the rows come back in the wrong order — PrimeNG's own default/no-op sort instead of
// our natural comparator). Neither mutation moved the `aria-sort` assertion in that same test;
// the row-order assertion is the one load-bearing against this binding.
//
// Resize persistence (R-CTL-009 AC.2): `[resizableColumns]="true" columnResizeMode="expand"`
// hands column-width persistence to PrimeNG's own `Table` instance, which is not destroyed
// across a page or sort change — jsdom cannot measure rendered column widths, so that behavior
// is NOT asserted by this component's spec (tasks.md T-03 disqualifier; the same disclaimer is
// repeated in `data-table.component.spec.ts`, next to the tests it bounds); T-05 covers it with a
// real browser.
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, TableModule, CustomProgressBarComponent],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T extends object> {
  @Input({ required: true }) columns: DataTableColumn<T>[] = [];
  @Input() loading = false;
  @Input() exportFileName = 'export.xlsx';
  @Input() searchPlaceholder = 'Search';
  @Input() emptyMessage = 'No records found.';
  /** Fields the local search box filters over (design §6.3 "search fields"). */
  @Input() searchFields: (keyof T & string)[] = [];
  /**
   * Opt-in row selection (organizational-structure D-ORG-20): when `selectable`, a row click emits
   * `rowSelected`, and the row whose `id` equals `selectedKey` is highlighted. Off by default.
   */
  @Input() selectable = false;
  @Input() selectedKey: string | null = null;
  @Output() rowSelected = new EventEmitter<T>();

  // Row-actions slot (design §6.3 "an actions template"). The parent projects
  // `<ng-template #rowActions let-row>…</ng-template>` as content of <app-data-table>.
  @ContentChild('rowActions') rowActionsTemplate: TemplateRef<{ $implicit: T }> | null = null;
  @ContentChild('emptyState') emptyStateTemplate: TemplateRef<unknown> | null = null;

  private readonly rowsSignal = signal<T[]>([]);
  readonly searchTerm = signal('');
  readonly pageSize = signal(10);
  readonly sortField = signal('');
  readonly sortOrder = signal<1 | -1>(1);
  readonly exporting = signal(false);

  readonly pageSizeOptions = [10, 25, 50, 100];

  @Input()
  set rows(value: T[]) {
    this.rowsSignal.set(value ?? []);
  }
  get rows(): T[] {
    return this.rowsSignal();
  }

  // Design §6.3 "defaulting to the first `code` column ascending" (F-7 / R-CTL-009 "Natural sort").
  private readonly defaultSortField = computed<string>(() => {
    const codeColumn = this.columns.find(column => column.type === 'code');
    return (codeColumn ?? this.columns[0])?.field ?? '';
  });

  // `columns` is a plain @Input (set before Angular calls ngOnInit), so the default sort field
  // (design §6.3: "defaulting to the first `code` column ascending") is resolved here — before
  // the first template render, so the table opens already sorted (no flash of unsorted rows).
  ngOnInit(): void {
    if (!this.sortField()) {
      this.sortField.set(this.defaultSortField());
    }
  }

  readonly filteredRows = computed<T[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const rows = this.rowsSignal();
    if (!term || this.searchFields.length === 0) return rows;
    return rows.filter(row => this.searchFields.some(field => String(row[field] ?? '').toLowerCase().includes(term)));
  });

  // Leader-adjudicated defect (T-03 rework): a search that excludes every row is NOT the same
  // state as the list genuinely having zero rows — the old single `displayRows().length === 0`
  // check collapsed both into the parent's "No values yet for this list. + Add value" empty
  // state, which is wrong (and misleading) while a search is active. `hasNoRows` drives that
  // true-empty state (and unmounts `<p-table>`, same as before); `hasNoMatches` instead keeps the
  // table mounted and renders PrimeNG's own `emptymessage` template (design §6.3 / R-CTL-008).
  readonly hasNoRows = computed<boolean>(() => this.rowsSignal().length === 0);
  readonly hasNoMatches = computed<boolean>(() => !this.hasNoRows() && this.displayRows().length === 0);

  // Filtered AND sorted, across every page — this is exactly what `exportValues()` hands to the
  // export util (R-CTL-009 "Export respects filter and sort"; falsifier 5 forbids slicing to the
  // current page here or anywhere upstream of it).
  readonly displayRows = computed<T[]>(() => {
    const field = this.sortField() as keyof T & string;
    const order = this.sortOrder();
    const rows = [...this.filteredRows()];
    if (!field) return rows;
    return rows.sort((a, b) => naturalCompare(String(a[field] ?? ''), String(b[field] ?? '')) * order);
  });

  trackByIndex = (_: number, row: T): unknown => (row as Record<string, unknown>)['id'] ?? row;

  onSearchInput(term: string): void {
    this.searchTerm.set(term);
  }

  onPage(event: TablePageEvent): void {
    // AC.1 (R-CTL-009): a page-size change must NOT touch sortField/sortOrder/searchTerm —
    // falsifier 6 is exactly "reset the sort on a page-size change".
    if (typeof event.rows === 'number') {
      this.pageSize.set(event.rows);
    }
  }

  // Bound to `<p-table [customSort]="true" (sortFunction)="onSortFunction($event)">`. PrimeNG's
  // `pSortableColumn` directive calls this on header click, and the table itself re-emits it
  // whenever `[sortField]`/`[sortOrder]` are (re)bound on init — this is why the table opens
  // already sorted by the default code column without an extra click.
  onSortFunction(event: SortEvent): void {
    if (!event.field) return;
    this.sortField.set(event.field);
    this.sortOrder.set(event.order === -1 ? -1 : 1);
  }

  badgeLabel(value: unknown): string {
    return value ? 'Active' : 'Inactive';
  }

  isSelected(row: T): boolean {
    const key = (row as Record<string, unknown>)['id'];
    return this.selectedKey !== null && key !== undefined && String(key) === this.selectedKey;
  }

  onRowClick(row: T): void {
    if (this.selectable) this.rowSelected.emit(row);
  }

  cellValue(row: T, column: DataTableColumn<T>): unknown {
    return row[column.field];
  }

  async exportValues(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      await exportRowsToXlsx({
        columns: this.columns.map(column => ({ field: column.field, header: column.header })),
        rows: this.displayRows(),
        fileName: this.exportFileName
      });
    } finally {
      this.exporting.set(false);
    }
  }
}
