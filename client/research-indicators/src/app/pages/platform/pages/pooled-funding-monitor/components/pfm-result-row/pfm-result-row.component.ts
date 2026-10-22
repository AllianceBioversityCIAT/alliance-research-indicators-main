// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-004, 012, 013, 014)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESULT_ENTRY_SOURCE_QUERY, RESULT_ENTRY_SOURCE_VALUE_PFM_MONITOR } from '@shared/constants/result-entry-source';
import { buildResultLink } from '@shared/utils/result-link.util';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { PfmMappingState, PfmPrmsStatus, PfmResultRow } from '../../pfm.interfaces';
import { TooltipModule } from 'primeng/tooltip';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { PRMS_STATUS_BORDER, statusColor } from '@shared/constants/pfm-status-colors';

/** Semantic token pair (foreground doubles as the outline) for a tag; bound as var() strings, never hex. */
export interface PfmTagTone {
  fg: string;
  border: string;
}
const tone = (name: string): PfmTagTone => ({ fg: `var(--ac-pfm-${name}-fg)`, border: `var(--ac-pfm-${name}-fg)` });

/** Text, outline and icon share the status colour (as the sidebar PRMS sync pill does). */
const solid = (color: string): PfmTagTone => ({ fg: color, border: color });

// Shared with the result sidebar PRMS sync card: never pick these colours here.
const MAPPING_TONES: Record<PfmMappingState, PfmTagTone> = {
  Complete: solid(statusColor({ mapping: 'Complete' })),
  Pending: solid(statusColor({ mapping: 'Pending' })),
  'No SP contribution': solid(statusColor({ mapping: 'No SP contribution' }))
};

const PRMS_TONES: Record<Exclude<PfmPrmsStatus, 'Not sent'>, PfmTagTone> = {
  'Pending Review': solid(statusColor({ prms: 'Pending Review' })),
  Approved: { fg: statusColor({ prms: 'Approved' }), border: PRMS_STATUS_BORDER.approved },
  Rejected: solid(statusColor({ prms: 'Rejected' }))
};

/** One result of a project group. Values are rendered as received; View is the only action (R-PFM-014). */
// A table row (`<tr app-pfm-result-row>`) inside the project group's p-table, one <td> per column,
// so the group gets the Results Center table behaviour (sort, paginator) without moving a column.
@Component({
  selector: 'tr[app-pfm-result-row]',
  host: { class: 'text-[14px]', 'data-testid': 'pfm-result-row', '[attr.data-result-code]': 'row().result_code' },
  imports: [RouterLink, CustomTagComponent, TooltipModule, FormatDatePipe],
  templateUrl: './pfm-result-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmResultRowComponent {
  row = input.required<PfmResultRow>();

  platformColors = computed(() => PLATFORM_COLOR_MAP[this.row().platform_code]);
  /** Same padding as the Results Center code chip (formatResultCode). */
  codeNumber = computed(() => String(this.row().official_code ?? '').padStart(3, '0'));
  fullTitle = computed(() => this.row().title || this.row().result_code);

  /**
   * STAR tag tooltip: the status description, then the approval date when there is one.
   * The date lives here, not as a line under the tag: a second line pushed the STAR tag
   * above the other single-line tags of the row (cells are vertically centred).
   */
  starTooltip = computed(() => {
    const r = this.row();
    return [r.star_status_description, r.star_approved_label].filter(Boolean).join(' · ') || undefined;
  });
  mappingTone = computed(() => MAPPING_TONES[this.row().mapping_state] ?? tone('neutral'));
  isPrmsNotSent = computed(() => this.row().prms_status === 'Not sent');
  prmsTone = computed(() => (PRMS_TONES as Record<string, PfmTagTone>)[this.row().prms_status] ?? tone('neutral'));

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
