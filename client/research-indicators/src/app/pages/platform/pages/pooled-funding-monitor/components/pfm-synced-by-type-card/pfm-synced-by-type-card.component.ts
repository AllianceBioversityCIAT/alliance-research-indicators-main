import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PfmEmptyStateComponent } from '../pfm-empty-state/pfm-empty-state.component';
import { PfmSyncedType } from '../../pfm.interfaces';

/**
 * Stats tab: results already in PRMS by result type. The longest bar is the type with the most
 * results, so types compare by size. OICRs never appear: they stay in STAR and are not synced.
 */
@Component({
  selector: 'app-pfm-synced-by-type-card',
  imports: [TooltipModule, PfmEmptyStateComponent],
  templateUrl: './pfm-synced-by-type-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmSyncedByTypeCardComponent {
  types = input.required<PfmSyncedType[]>();

  /** The steel blue of the Sync activity scale; the track is the card's neutral background. */
  readonly barFill = 'var(--ac-pfm-month-5)';
  readonly trackFill = 'var(--ac-pfm-neutral-bg)';

  view = computed(() => {
    const rows = this.types().filter(t => t.synced > 0);
    const max = Math.max(1, ...rows.map(t => t.synced));
    return rows.map(t => ({ ...t, width: `${(t.synced / max) * 100}%` }));
  });
}
