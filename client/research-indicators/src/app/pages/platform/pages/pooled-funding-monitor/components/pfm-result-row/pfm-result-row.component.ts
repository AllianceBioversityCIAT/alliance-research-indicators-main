// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-004, 012, 013, 014)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESULT_ENTRY_SOURCE_QUERY, RESULT_ENTRY_SOURCE_VALUE_PFM_MONITOR } from '@shared/constants/result-entry-source';
import { buildResultLink } from '@shared/utils/result-link.util';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { PfmResultRow } from '../../pfm.interfaces';
import { PfmStatusBadgeComponent } from '../pfm-status-badge/pfm-status-badge.component';

/** Column template shared by the group's header row and every result row (R-PFM-012 order). */
export const PFM_ROW_GRID =
  'grid min-w-[84rem] grid-cols-[7.5rem_minmax(16rem,2.4fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(12rem,1.4fr)_minmax(7.5rem,0.8fr)_minmax(6.5rem,0.7fr)_5.5rem] items-start gap-x-6';

/** One result of a project group. Values are rendered as received; View is the only action (R-PFM-014). */
@Component({
  selector: 'app-pfm-result-row',
  imports: [RouterLink, PfmStatusBadgeComponent],
  templateUrl: './pfm-result-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmResultRowComponent {
  row = input.required<PfmResultRow>();
  readonly grid = PFM_ROW_GRID;

  platformColors = computed(() => PLATFORM_COLOR_MAP[this.row().platform_code]);
  /** Same padding as the Results Center code chip (formatResultCode). */
  codeNumber = computed(() => String(this.row().official_code ?? '').padStart(3, '0'));
  fullTitle = computed(() => this.row().title || this.row().result_code);

  link = computed(() => {
    const r = this.row();
    const base = buildResultLink({
      platform_code: r.platform_code,
      result_official_code: r.official_code,
      result_status_id: r.star_status_id,
      snapshot_years: r.snapshot_years
    });
    // `from` makes the result breadcrumb start at the monitor queue instead of Projects.
    return { commands: base.commands, queryParams: { ...base.queryParams, [RESULT_ENTRY_SOURCE_QUERY]: RESULT_ENTRY_SOURCE_VALUE_PFM_MONITOR } };
  });
}
