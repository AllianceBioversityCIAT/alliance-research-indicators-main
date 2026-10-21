// One empty state for every coverage card, so an empty monitor looks the same everywhere.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-pfm-empty-state',
  template: `
    <div
      class="mt-4 flex items-center gap-2 rounded-lg bg-[var(--ac-pfm-neutral-bg)] px-4 py-3 text-[13px] text-[var(--ac-pfm-neutral-fg)]"
      role="status"
      data-testid="pfm-empty-state">
      <i class="pi pi-inbox !text-[14px]" aria-hidden="true"></i>
      <span>{{ message() }}</span>
    </div>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmEmptyStateComponent {
  /** Defaults to the shared "Nothing yet"; only "nothing left to do" uses another line. */
  message = input('Nothing yet');
}
