// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-011)
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { SearchExportControlsComponent } from '@shared/components/search-export-controls/search-export-controls.component';
import { PfmGroup, PfmResultRow } from '../../pfm.interfaces';
import { PfmStoreService } from '../../services/pfm-store.service';
import { PfmResultRowComponent } from '../pfm-result-row/pfm-result-row.component';

// Literal class strings so Tailwind can see them. Colors are tokens only (NFR-PFM-003).
const SEGMENTS: { key: 'approved' | 'pending' | 'rejected' | 'out_of_scope' | 'not_sent'; seg: string; title: (n: number) => string }[] = [
  { key: 'approved', seg: 'bg-[var(--ac-pfm-seg-approved)]', title: n => `${n} approved in PRMS` },
  { key: 'pending', seg: 'bg-[var(--ac-pfm-seg-pending-group)]', title: n => `${n} pending review` },
  { key: 'rejected', seg: 'bg-[var(--ac-pfm-seg-rejected)]', title: n => `${n} rejected` },
  { key: 'out_of_scope', seg: 'bg-[var(--ac-pfm-seg-no-sp)]', title: n => `${n} no SP contribution · out of PRMS scope` },
  // Not synced = the 'nothing yet' grey of every progress bar, not a state colour.
  { key: 'not_sent', seg: 'bg-[var(--ac-state-empty)]', title: n => `${n} not synced yet` }
];

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
export class PfmProjectGroupComponent {
  readonly store = inject(PfmStoreService);
  group = input.required<PfmGroup>();
  readonly columns = COLUMNS;
  /** Rows per page: starts at 5, then follows the paginator dropdown. */
  readonly pageSize = signal(PFM_GROUP_PAGE_SIZE);
  private readonly table = viewChild<Table>('dt');

  /** Search box text of this group's table (words, AND). */
  readonly search = signal('');
  /** Index of the first row of the current page; back to 0 on every search / clear. */
  readonly first = signal(0);
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
    this.table()?.reset();
  }

  /** Zero segments are not rendered (a zero-width element would still be focusable / hoverable). */
  segments = computed(() => SEGMENTS.map(s => ({ ...s, n: this.group().counts[s.key] })).filter(s => s.n > 0));
  /** Text alternative of the bar for assistive tech: non-zero segments only. */
  barSummary = computed(() =>
    this.segments()
      .map(s => s.title(s.n))
      .join(', ')
  );
  countLabel = computed(() => `${this.group().result_count} ${this.group().result_count === 1 ? 'result' : 'results'}`);
  /** Flag copy is client-owned (mockup `flagLabel`). */
  flagLabel = computed(() => {
    const n = this.group().attention;
    return n ? `${n} ${n === 1 ? 'needs' : 'need'} attention` : 'All clear';
  });
}
