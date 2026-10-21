// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-008)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PfmMonthly, PfmScope } from '../../pfm.interfaces';

// Synced = done, so every month uses the palette's done fill (one colour; months are not states,
// so no light-to-dark tones of one hue).
const MONTH_FILL = 'bg-[var(--ac-state-done-fill)]';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-pfm-sync-activity-card',
  imports: [DecimalPipe],
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
    return m.map(x => ({ ...x, fill: MONTH_FILL, label: MONTHS[Number(x.month.slice(5, 7)) - 1] ?? x.month, height: `${(x.synced / max) * 100}%` }));
  });

  year = computed(() => this.monthly().at(-1)?.month.slice(0, 4) ?? '');
}
