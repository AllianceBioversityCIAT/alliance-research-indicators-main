// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-004, 012, 013, 014)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { buildResultLink } from '@shared/utils/result-link.util';
import { PfmResultRow } from '../../pfm.interfaces';
import { PfmStatusBadgeComponent } from '../pfm-status-badge/pfm-status-badge.component';

/** Column template shared by the group's header row and every result row (R-PFM-012 order). */
export const PFM_ROW_GRID =
  'grid min-w-[62rem] grid-cols-[minmax(15rem,2.2fr)_minmax(9rem,1fr)_minmax(12rem,1.4fr)_minmax(7.5rem,0.8fr)_minmax(6.5rem,0.7fr)_5.5rem] items-start gap-x-6';

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

  link = computed(() => {
    const r = this.row();
    return buildResultLink({
      platform_code: r.platform_code,
      result_official_code: r.official_code,
      result_status_id: r.star_status_id,
      snapshot_years: r.snapshot_years
    });
  });
}
