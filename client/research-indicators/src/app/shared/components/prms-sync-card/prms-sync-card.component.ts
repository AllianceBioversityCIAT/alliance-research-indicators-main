import { Component, computed, input, output, viewChild, ElementRef } from '@angular/core';
import { environment } from '@envs/environment';
import { PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { deriveCardTitle, formatSyncStatus, resolveActorName } from '@shared/utils/prms-sync-status.util';

@Component({
  selector: 'app-prms-sync-card',
  templateUrl: './prms-sync-card.component.html',
  styleUrl: './prms-sync-card.component.scss'
})
export class PrmsSyncCardComponent {
  readonly history = input.required<PrmsSyncHistoryResponse>();
  readonly viewHistory = output<void>();
  readonly historyButton = viewChild<ElementRef<HTMLButtonElement>>('historyLink');

  readonly latest = computed(() => this.history().events[0] ?? null);
  readonly title = computed(() => {
    const event = this.latest();
    return event ? deriveCardTitle(event) : { title: 'Synchronized with PRMS', tone: 'success' as const };
  });
  readonly pill = computed(() => {
    const event = this.latest();
    return event ? formatSyncStatus(event) : { label: 'Pending Review', tone: 'warning' as const };
  });
  readonly actorName = computed(() => {
    const event = this.latest();
    return event ? resolveActorName(event) : null;
  });
  readonly showBadge = computed(() => this.history().sync_count > 0);
  readonly showPrmsId = computed(() => this.history().prms_result_code != null);
  readonly deepLink = computed(() => {
    const { prms_result_code: code, prms_phase_id: phase } = this.history();
    if (code == null || phase == null) return null;
    return `${environment.prmsUrl}/reports/result-details/${code}?phase=${phase}`;
  });
  readonly showAdvisory = computed(() => {
    const event = this.latest();
    return event?.event_source === 'STAR' && event.status === 'PENDING_REVIEW';
  });

  focusHistoryLink(): void {
    this.historyButton()?.nativeElement.focus();
  }

  openHistory(): void {
    this.viewHistory.emit();
  }
}
