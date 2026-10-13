// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-004, 012, 013, 014)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESULT_ENTRY_SOURCE_QUERY, RESULT_ENTRY_SOURCE_VALUE_PFM_MONITOR } from '@shared/constants/result-entry-source';
import { buildResultLink } from '@shared/utils/result-link.util';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { PfmMappingState, PfmPrmsStatus, PfmResultRow } from '../../pfm.interfaces';
import { TooltipModule } from 'primeng/tooltip';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';

/**
 * Column template shared by the group's header row and every result row (R-PFM-012 order).
 * Min-width arithmetic (rem): columns 7.2+8.1+5.5+6+6.5+6.5+6.5+6+6+4.2 = 62.5, gaps 9 x 0.5 = 4.5, row padding px-6 = 3 -> 70.
 */
export const PFM_ROW_GRID =
  'grid min-w-[70rem] grid-cols-[7.2rem_minmax(8.1rem,2.6fr)_minmax(5.5rem,1fr)_minmax(6rem,0.9fr)_6.5rem_minmax(6.5rem,1.4fr)_minmax(6.5rem,1.3fr)_6rem_6rem_4.2rem] items-start gap-x-2';

/** Semantic token pair (foreground doubles as the outline) for a tag; bound as var() strings, never hex. */
export interface PfmTagTone {
  fg: string;
  border: string;
}
const tone = (name: string): PfmTagTone => ({ fg: `var(--ac-pfm-${name}-fg)`, border: `var(--ac-pfm-${name}-fg)` });
const WARNING_TONE: PfmTagTone = { fg: 'var(--ac-pfm-warning-fg)', border: 'var(--ac-pfm-warning-border)' };

const MAPPING_TONES: Record<PfmMappingState, PfmTagTone> = {
  Complete: tone('success'),
  Incomplete: WARNING_TONE,
  'Not started': tone('neutral'),
  'No SP contribution': tone('success')
};

const PRMS_TONES: Record<Exclude<PfmPrmsStatus, 'Not sent'>, PfmTagTone> = {
  'Pending Review': WARNING_TONE,
  Approved: tone('success'),
  Rejected: tone('danger')
};

/** One result of a project group. Values are rendered as received; View is the only action (R-PFM-014). */
@Component({
  selector: 'app-pfm-result-row',
  imports: [RouterLink, CustomTagComponent, TooltipModule],
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

  mappingTone = computed(() => MAPPING_TONES[this.row().mapping_state] ?? tone('neutral'));
  isPrmsNotSent = computed(() => this.row().prms_status === 'Not sent');
  prmsTone = computed(() => (PRMS_TONES as Record<string, PfmTagTone>)[this.row().prms_status] ?? tone('neutral'));
  neutralTone = tone('neutral');

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
