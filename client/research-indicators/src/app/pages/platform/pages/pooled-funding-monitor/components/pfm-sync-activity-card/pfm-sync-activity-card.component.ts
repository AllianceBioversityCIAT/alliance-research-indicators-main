// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-008)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PfmMonthly, PfmScope } from '../../pfm.interfaces';

// Literal class strings so Tailwind sees them; oldest month lightest, current darkest.
const MONTH_FILLS = [
  'bg-[var(--ac-pfm-month-1)]',
  'bg-[var(--ac-pfm-month-2)]',
  'bg-[var(--ac-pfm-month-3)]',
  'bg-[var(--ac-pfm-month-4)]',
  'bg-[var(--ac-pfm-month-5)]',
  'bg-[var(--ac-pfm-month-6)]'
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-pfm-sync-activity-card',
  imports: [DecimalPipe],
  templateUrl: './pfm-sync-activity-card.component.html',
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
    return m.map((x, i) => ({ ...x, fill: MONTH_FILLS[Math.max(0, Math.min(MONTH_FILLS.length - 1, i + MONTH_FILLS.length - m.length))] ?? MONTH_FILLS[5], label: MONTHS[Number(x.month.slice(5, 7)) - 1] ?? x.month, height: `${(x.synced / max) * 100}%` }));
  });

  year = computed(() => this.monthly().at(-1)?.month.slice(0, 4) ?? '');
}
