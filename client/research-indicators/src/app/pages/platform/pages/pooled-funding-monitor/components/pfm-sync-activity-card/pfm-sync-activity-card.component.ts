// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-008)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
import { PfmMonthly, PfmScope } from '../../pfm.interfaces';

// Navy scale of the section (owner): the busier the month, the darker its bar. Months are an
// intensity, not states, so tones of one hue are right here. Literal classes so Tailwind sees them.
export const MONTH_SHADES = [
  'bg-[var(--ac-pfm-month-2)]',
  'bg-[var(--ac-pfm-month-3)]',
  'bg-[var(--ac-pfm-month-4)]',
  'bg-[var(--ac-pfm-month-5)]',
  'bg-[var(--ac-pfm-month-6)]'
];

/** Shade for a value: the month with the most syncs gets the darkest, smaller months get lighter. */
export const monthShade = (value: number, max: number): string =>
  MONTH_SHADES[Math.min(MONTH_SHADES.length - 1, Math.max(0, Math.ceil((value / Math.max(1, max)) * MONTH_SHADES.length) - 1))];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-pfm-sync-activity-card',
  imports: [DecimalPipe, TooltipModule, PfmEmptyStateComponent],
  templateUrl: './pfm-sync-activity-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmSyncActivityCardComponent {
  monthly = input.required<PfmMonthly[]>();
  syncedThisYear = input.required<number>();
  scope = input.required<PfmScope>();

  /** Label from the 'YYYY-MM' string (no Date, so no timezone shift); height = value / max, 0 stays 0. */
  bars = computed(() => {
    const m = this.monthly();
    const max = Math.max(1, ...m.map(x => x.synced));
    return m.map(x => ({ ...x, fill: monthShade(x.synced, max), label: MONTHS[Number(x.month.slice(5, 7)) - 1] ?? x.month, height: `${(x.synced / max) * 100}%` }));
  });

  year = computed(() => this.monthly().at(-1)?.month.slice(0, 4) ?? '');
  /** Nothing synced in the window or this year: show the shared empty state, not an empty axis. */
  empty = computed(() => this.syncedThisYear() === 0 && this.monthly().every(m => m.synced === 0));
}
