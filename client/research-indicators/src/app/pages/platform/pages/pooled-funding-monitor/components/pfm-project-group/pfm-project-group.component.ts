// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-011)
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { SearchExportControlsComponent } from '@shared/components/search-export-controls/search-export-controls.component';
import { PfmGroup, PfmResultRow } from '../../pfm.interfaces';
import { PFM_STATE, PFM_STATE_EMPTY } from '@shared/constants/pfm-status-colors';
import { PfmStoreService } from '../../services/pfm-store.service';
import { formatPersonName } from '@shared/utils/person-name.util';
import { PfmResultRowComponent } from '../pfm-result-row/pfm-result-row.component';


/** Columns in their fixed order; `sort` is the row field p-table sorts on. No Action column: the title opens the result. */
const COLUMNS: { header: string; sort: keyof PfmTableRow }[] = [
  { header: 'Code', sort: 'official_code' },
  { header: 'Result', sort: 'title_sort' },
  { header: 'Indicator', sort: 'type' },
  { header: 'Creator', sort: 'creator' },
  { header: 'STAR status', sort: 'star_sort' },
  { header: 'CGIAR Portfolio mapping', sort: 'mapping_state' },
  { header: 'Science Programs', sort: 'sp_sort' },
  { header: 'PRMS status', sort: 'prms_status' },
  { header: 'Updated', sort: 'updated_sort' }
];

/**
 * A result row plus the plain values p-table sorts on. p-table sorts ROW FIELDS, never what a cell
 * renders, so every sortable column needs its value on the row (cf. My PI Delegates `ProjectRow`).
 */
export type PfmTableRow = PfmResultRow & {
  title_sort: string;
  star_sort: string;
  sp_sort: string;
  /** ISO instant; '' when unknown, so undated rows sort together. */
  updated_sort: string;
  /** Lower-cased text the search box matches against. */
  haystack: string;
};

export const toTableRow = (r: PfmResultRow): PfmTableRow => {
  const star = r.star_status_name ?? r.star_label;
  const sps = r.science_programs.map(sp => sp.code).join(' ');
  return {
    ...r,
    title_sort: (r.title || r.result_code).toLowerCase(),
    star_sort: star,
    sp_sort: sps,
    updated_sort: r.updated_at_iso ?? '',
    haystack: [
      r.result_code,
      String(r.official_code),
      String(r.official_code).padStart(3, '0'),
      r.title,
      r.type,
      r.creator,
      star,
      r.mapping_state,
      r.prms_status,
      ...r.science_programs.flatMap(sp => [sp.code, sp.name])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  };
};

/** Every word must appear somewhere in the row (AND), case-insensitive; blank matches all. */
export const matchesPfmSearch = (row: PfmTableRow, search: string): boolean =>
  search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(word => row.haystack.includes(word));

/** Rows per page when a group opens (owner: 5 by default). */
export const PFM_GROUP_PAGE_SIZE = 5;

/** Collapsible project group: header summary + lazily loaded result rows. */
@Component({
  selector: 'app-pfm-project-group',
  imports: [TableModule, SearchExportControlsComponent, PfmResultRowComponent],
  templateUrl: './pfm-project-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmProjectGroupComponent implements OnInit {
  readonly store = inject(PfmStoreService);
  group = input.required<PfmGroup>();
  readonly columns = COLUMNS;
  readonly doneFill = PFM_STATE.done.fill;
  readonly emptyFill = PFM_STATE_EMPTY;
  /** Rows per page: starts at 5, then follows the paginator dropdown. */
  readonly pageSize = signal(PFM_GROUP_PAGE_SIZE);
  private readonly table = viewChild<Table>('dt');

  /** Search box text of this group's table (words, AND). */
  readonly search = signal('');
  /** Index of the first row of the current page; back to 0 on every search / clear. */
  readonly first = signal(0);
  /** Column the user sorted by (p-table row field) and its direction; null = server order. */
  readonly sortField = signal<string | null>(null);
  readonly sortOrder = signal<1 | -1>(1);

  /** Every change of page, page size, search or sort is kept in the store, so a return from a result restores it. */
  private readonly rememberView = effect(() => {
    const view = { first: this.first(), rows: this.pageSize(), search: this.search(), sortField: this.sortField(), sortOrder: this.sortOrder() };
    this.store.setGroupView(this.group().code, view);
  });

  /** Back from a result: start where the user left this project's table. */
  ngOnInit(): void {
    const view = this.store.groupViews()[this.group().code];
    if (!view) return;
    this.search.set(view.search ?? '');
    this.pageSize.set(view.rows || PFM_GROUP_PAGE_SIZE);
    this.sortField.set(view.sortField ?? null);
    this.sortOrder.set(view.sortOrder === -1 ? -1 : 1);
    this.first.set(view.first ?? 0);
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField.set(event.field);
    this.sortOrder.set(event.order === -1 ? -1 : 1);
  }
  readonly skeletons = [0, 1, 2];

  open = computed(() => this.store.openGroups().has(this.group().code));
  rows = computed(() => this.store.groupRows()[this.group().code]);
  state = computed(() => this.store.groupState()[this.group().code]);
  loading = computed(() => !!this.state()?.loading || (!this.rows() && !this.state()?.error));
  error = computed(() => !!this.state()?.error);

  /** Server-ranked rows (R-PFM-012), narrowed by the search; p-table sorts and pages them. */
  tableRows = computed(() => {
    const term = this.search().trim();
    const rows = (this.rows() ?? []).map(toTableRow);
    return term ? rows.filter(r => matchesPfmSearch(r, term)) : rows;
  });

  setSearch(value: string): void {
    this.search.set(value);
    this.first.set(0);
  }

  /** Clear = empty search, back to the server order, first page. */
  clear(): void {
    this.search.set('');
    this.first.set(0);
    this.sortField.set(null);
    this.sortOrder.set(1);
    this.table()?.reset();
  }

  /**
   * Same rule as the coverage tab's Reported to PRMS bar: done = in PRMS (pending review or approved)
   * or no SP contribution, in ONE green; the rest (Need attention, rejected included) is the grey track.
   */
  progress = computed(() => {
    const g = this.group();
    const done = g.counts.approved + g.counts.pending + g.counts.out_of_scope;
    const total = g.result_count;
    return { done, width: total ? `${(done / total) * 100}%` : '0%' };
  });
  /** Text alternative of the bar for assistive tech. */
  /**
   * "Principal Investigator: Daniela Zuniga Pino" (owner: labelled, first name first, not Agresso's
   * "ZUNIGA PINO, DANIELA"; the donor is not shown anywhere else, so not here either). Empty when there is no PI.
   */
  leadLine = computed(() => {
    const pi = formatPersonName(this.group().lead_pi);
    return pi ? `Principal Investigator: ${pi}` : '';
  });

  barSummary = computed(() => `${this.progress().done} of ${this.group().result_count} done: in PRMS or with no SP contribution`);
  /** "{done} of {total} results": the green part of the bar, out of the project's results. */
  countLabel = computed(() => {
    const total = this.group().result_count;
    return `${this.progress().done} of ${total} ${total === 1 ? 'result' : 'results'}`;
  });
  /** Flag copy is client-owned (mockup `flagLabel`). */
  flagLabel = computed(() => {
    const n = this.group().attention;
    return n ? `${n} ${n === 1 ? 'needs' : 'need'} attention` : 'All clear';
  });
}
