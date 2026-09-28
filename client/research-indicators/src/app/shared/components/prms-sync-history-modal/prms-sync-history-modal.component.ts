import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { PrmsSyncHistoryEvent, PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { SYNC_TAG_COLOR, deriveSyncVerb, formatSyncStatus, formatSyncTimestamp, resolveActorName } from '@shared/utils/prms-sync-status.util';

interface BeforeAfter {
  before?: unknown;
  after?: unknown;
}

@Component({
  selector: 'app-prms-sync-history-modal',
  imports: [DialogModule, CustomTagComponent],
  templateUrl: './prms-sync-history-modal.component.html',
  styleUrl: './prms-sync-history-modal.component.scss'
})
export class PrmsSyncHistoryModalComponent {
  readonly visible = input(false);
  readonly history = input.required<PrmsSyncHistoryResponse>();
  readonly returnFocusTo = input<HTMLElement | null>(null);
  readonly visibleChange = output<boolean>();

  /** Second view. Null keeps the history list. Opening it with a null `changes` payload is the empty state. */
  readonly changesEvent = signal<PrmsSyncHistoryEvent | null>(null);

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
    const count = this.entries().length;
    const noun = count === 1 ? 'event' : 'events';
    const code = this.history().prms_result_code;
    const base = `${count} ${noun}`;
    return code == null ? base : `${base} · PRMS code ${code}`;
  });

  readonly changeRows = computed(() => {
    const changes = this.changesEvent()?.changes;
    if (changes == null || typeof changes !== 'object') {
      return [];
    }
    return Object.entries(changes as Record<string, unknown>).map(([field, value]) => {
      if (isBeforeAfter(value)) {
        return { field, before: formatChangeValue(value.before), after: formatChangeValue(value.after) };
      }
      return { field, before: '', after: formatChangeValue(value) };
    });
  });

  actorName(event: PrmsSyncHistoryEvent): string | null {
    return resolveActorName(event);
  }

  verb(event: PrmsSyncHistoryEvent): string {
    return deriveSyncVerb(event, this.chronological());
  }

  initials(event: PrmsSyncHistoryEvent): string {
    const raw = event.event_source === 'PRMS' ? event.reviewer_name : (event.actor_name_short ?? event.actor_name);
    const tokens = (raw ?? '')
      .trim()
      .split(/\s+/)
      .filter(token => token.length > 0);
    return tokens
      .slice(0, 2)
      .map(token => token.charAt(0))
      .join('');
  }

  tagColor(event: PrmsSyncHistoryEvent): string {
    return SYNC_TAG_COLOR[formatSyncStatus(event).tone];
  }

  statusLabel(event: PrmsSyncHistoryEvent): string {
    return formatSyncStatus(event).label;
  }

  reviewerRole(event: PrmsSyncHistoryEvent): string | null {
    const role = event.reviewer_role?.trim() ?? '';
    return role.length > 0 ? role : null;
  }

  timestamp(event: PrmsSyncHistoryEvent): string {
    return formatSyncTimestamp(event.decided_at ?? event.occurred_at);
  }

  hasComment(event: PrmsSyncHistoryEvent): boolean {
    return event.justification != null && event.justification !== '';
  }

  /**
   * Approvals only (owner decision, 2026-09-28). A rejection sends the
   * mapping back rather than editing it, and on approval the changes are
   * also applied to our own pool-funding rows — so this link opens what we
   * adopted, not merely what PRMS looked at.
   */
  showChangesLink(event: PrmsSyncHistoryEvent): boolean {
    return event.event_source === 'PRMS' && event.decision === 'APPROVE' && hasFieldChanges(event.changes);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.visible()) return;
    this.close();
  }

  onVisibleChange(open: boolean): void {
    if (open) {
      this.visibleChange.emit(true);
      this.labelDialog();
      return;
    }
    this.close();
  }

  openChanges(event: PrmsSyncHistoryEvent): void {
    this.changesEvent.set(event);
    this.labelDialog();
    setTimeout(() => document.querySelector<HTMLElement>('[data-testid="prms-history-back"]')?.focus(), 0);
  }

  closeChanges(): void {
    this.changesEvent.set(null);
    this.labelDialog();
  }

  close(): void {
    this.changesEvent.set(null);
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

  /** The portaled dialog's labelled-by id is dropped once a header template replaces PrimeNG's title span. */
  private labelDialog(): void {
    setTimeout(() => {
      const dialog = document.querySelector('.prms-history-dialog');
      if (!dialog) return;
      const titleId = this.changesEvent() ? 'prms-history-changes-title' : 'prms-history-title';
      dialog.setAttribute('aria-labelledby', titleId);
    }, 0);
  }
}

function hasFieldChanges(changes: unknown): boolean {
  if (changes == null || typeof changes !== 'object') return false;
  return Object.keys(changes).length > 0;
}

function isBeforeAfter(value: unknown): value is BeforeAfter {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  return 'before' in value || 'after' in value;
}

function formatChangeValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
