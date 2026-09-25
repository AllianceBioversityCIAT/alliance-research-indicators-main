import { Component, HostListener, computed, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { PrmsSyncHistoryEvent, PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { deriveHeadline, formatSyncStatus, formatSyncTimestamp, resolveActorName } from '@shared/utils/prms-sync-status.util';

@Component({
  selector: 'app-prms-sync-history-modal',
  imports: [DialogModule],
  templateUrl: './prms-sync-history-modal.component.html',
  styleUrl: './prms-sync-history-modal.component.scss'
})
export class PrmsSyncHistoryModalComponent {
  readonly visible = input(false);
  readonly history = input.required<PrmsSyncHistoryResponse>();
  readonly returnFocusTo = input<HTMLElement | null>(null);
  readonly visibleChange = output<boolean>();

  readonly entries = computed(() => {
    const events = [...this.history().events];
    events.sort((a, b) => {
      const latestFirst = this.instant(b) - this.instant(a);
      if (latestFirst !== 0) return latestFirst;
      return b.id - a.id;
    });
    return events;
  });

  readonly chronological = computed(() => [...this.entries()].reverse());

  readonly subHeader = computed(() => {
    const count = this.history().events.length;
    const noun = count === 1 ? 'synchronization' : 'synchronizations';
    const code = this.history().prms_result_code;
    const base = `${count} ${noun}`;
    return code == null ? base : `${base} · PRMS ID ${code}`;
  });

  headline(event: PrmsSyncHistoryEvent): string {
    return deriveHeadline(event, this.chronological());
  }

  pill(event: PrmsSyncHistoryEvent): { label: string; tone: string } {
    return formatSyncStatus(event);
  }

  timestamp(event: PrmsSyncHistoryEvent): string {
    return formatSyncTimestamp(event.decided_at ?? event.occurred_at);
  }

  subline(event: PrmsSyncHistoryEvent): string {
    const name = resolveActorName(event);
    const chrono = this.chronological();
    const index = chrono.findIndex(row => row.id === event.id);
    if (event.event_source === 'STAR') {
      const earlierStar = index > 0 && chrono.slice(0, index).some(row => row.event_source === 'STAR');
      if (!earlierStar) {
        const code = this.history().prms_result_code;
        if (name && code != null) return `${name} · PRMS ID ${code} assigned`;
        if (code != null) return `PRMS ID ${code} assigned`;
        return name ?? '';
      }
      const previous = index > 0 ? chrono[index - 1] : undefined;
      const afterRejection = previous?.event_source === 'PRMS' && (previous.decision === 'REJECT' || previous.decision === 'REJECTED');
      if (afterRejection) {
        return name ? `${name} · mapping corrected and sent again` : 'mapping corrected and sent again';
      }
      return name ?? '';
    }
    const role = event.reviewer_role?.trim() ?? '';
    if (name && role.length > 0) return `${name} · ${role}`;
    return name ?? '';
  }

  commentName(event: PrmsSyncHistoryEvent): string | null {
    return resolveActorName(event);
  }

  hasComment(event: PrmsSyncHistoryEvent): boolean {
    return event.justification != null && event.justification !== '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.visible()) return;
    this.close();
  }

  onVisibleChange(open: boolean): void {
    if (open) {
      this.visibleChange.emit(true);
      return;
    }
    this.close();
  }

  close(): void {
    if (this.visible()) {
      this.visibleChange.emit(false);
    }
    this.restoreFocus();
  }

  private instant(event: PrmsSyncHistoryEvent): number {
    const parsed = Date.parse(event.decided_at ?? event.occurred_at);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private restoreFocus(): void {
    const target = this.returnFocusTo();
    if (!target) return;
    setTimeout(() => target.focus(), 0);
  }
}
