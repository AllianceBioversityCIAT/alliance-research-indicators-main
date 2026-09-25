import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { environment } from '@envs/environment';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { SYNC_TAG_COLOR, formatSyncDayMonth, formatSyncStatus, presentActorName } from '@shared/utils/prms-sync-status.util';

@Component({
  selector: 'app-prms-sync-card',
  imports: [CustomTagComponent],
  templateUrl: './prms-sync-card.component.html',
  styleUrl: './prms-sync-card.component.scss'
})
export class PrmsSyncCardComponent {
  readonly history = input.required<PrmsSyncHistoryResponse>();
  readonly viewHistory = output<void>();
  readonly historyButton = viewChild<ElementRef<HTMLAnchorElement>>('historyLink');

  readonly latest = computed(() => this.history().events[0] ?? null);
  readonly status = computed(() => {
    const event = this.latest();
    return event ? formatSyncStatus(event) : { label: 'Pending Review', tone: 'warning' as const };
  });
  readonly tagColor = computed(() => SYNC_TAG_COLOR[this.status().tone]);
  /**
   * Pending is the resting state of every push. Only an approve or reject
   * from PRMS tints the box; a malformed decision stays neutral.
   */
  readonly boxModifier = computed((): 'neutral' | 'approved' | 'rejected' => {
    switch (this.status().tone) {
      case 'success':
        return 'approved';
      case 'danger':
        return 'rejected';
      case 'warning':
        return 'neutral';
    }
  });
  readonly actor = computed(() => {
    const event = this.latest();
    if (!event) return null;
    const presented = presentActorName(event);
    if (!presented) return null;
    return { ...presented, when: formatSyncDayMonth(event.decided_at ?? event.occurred_at) };
  });
  readonly showSyncCount = computed(() => this.history().sync_count > 0);
  readonly showCode = computed(() => this.history().prms_result_code != null);
  readonly deepLink = computed(() => {
    const { prms_result_code: code, prms_phase_id: phase } = this.history();
    if (code == null || phase == null) return null;
    return `${environment.prmsUrl}/reports/result-details/${code}?phase=${phase}`;
  });

  focusHistoryLink(): void {
    this.historyButton()?.nativeElement.focus();
  }

  openHistory(event: Event): void {
    event.preventDefault();
    this.viewHistory.emit();
  }
}
