// Delegation History inner component — read-only modal content.
//
// Opened from:
//   • By-project tab (context.source === 'byProject') → fetches by project_id.
//   • By-person tab  (context.source === 'byPerson')  → fetches by delegate_user_id.
//
// Pattern mirrors AssignPiDelegateComponent:
//   • effect() on isModalOpen('piDelegateHistory').isOpen with wasOpen guard (KZ-015).
//   • Reads piDelegateHistoryContext() on closed→open transition.
//   • Clears state on open→close transition.
//
// NFR-UI-001: STAR tokens only — no hex literals.
// Styling is Tailwind in the template; the component has no stylesheet.
// NFR-UI-002: Non-colour cues (badge icon + text, not colour-only).

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllModalsService } from '@services/cache/all-modals.service';
import { ApiService } from '@services/api.service';
import type { PiDelegateHistoryEntry } from '@interfaces/pi-delegates.interface';

@Component({
  selector: 'app-pi-delegate-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pi-delegate-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PiDelegateHistoryComponent {
  // ─── Dependencies ─────────────────────────────────────────────────────────────

  readonly allModalsService = inject(AllModalsService);
  private readonly api = inject(ApiService);

  // ─── State signals ────────────────────────────────────────────────────────────

  readonly entries = signal<PiDelegateHistoryEntry[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ─── Open-close tracking (KZ-015: arrange the transition) ─────────────────────

  private wasOpen = false;

  constructor() {
    effect(() => {
      const isOpen = this.allModalsService.isModalOpen('piDelegateHistory')?.isOpen ?? false;

      if (!this.wasOpen && isOpen) {
        // Transition: closed → open. Read context and fetch.
        void this.loadHistory();
      }

      if (this.wasOpen && !isOpen) {
        // Transition: open → closed. Clear state.
        this.clearState();
      }

      this.wasOpen = isOpen;
    });
  }

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  private async loadHistory(): Promise<void> {
    const ctx = this.allModalsService.piDelegateHistoryContext();
    if (!ctx) {
      this.clearState();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.entries.set([]);

    try {
      const params =
        ctx.source === 'byProject'
          ? { project_id: ctx.projectCode }
          : { delegate_user_id: ctx.delegateUserId };

      const res = await this.api.GET_PIDelegatesHistory(params);

      if (res.successfulRequest) {
        this.entries.set(res.data ?? []);
      } else {
        this.error.set('Could not load delegation history. Please try again.');
      }
    } catch {
      this.error.set('Could not load delegation history. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Helpers exposed to the template ─────────────────────────────────────────

  /**
   * Returns the subheader text based on the current context.
   * Called once per render cycle — context is stable while the modal is open.
   */
  get subheader(): string {
    const ctx = this.allModalsService.piDelegateHistoryContext();
    if (!ctx) return '';
    if (ctx.source === 'byProject') {
      return `PI Delegate changes on project ${ctx.projectCode}`;
    }
    return `PI Delegate changes for ${ctx.name ?? 'Unknown'}`;
  }

  /**
   * Formats an ISO timestamp as "DD/MM/YYYY at h:mm A (TZ)".
   * Example: "14/03/2026 at 10:12 AM (CET)"
   * Uses Intl.DateTimeFormat so the timezone abbreviation reflects the browser locale.
   */
  formatDate(isoString: string): string {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const datePart = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);

    // 12-hour time with short timezone name (e.g. "10:12 AM (CET)")
    const timeParts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).formatToParts(date);

    const hour = timeParts.find(p => p.type === 'hour')?.value ?? '';
    const minute = timeParts.find(p => p.type === 'minute')?.value ?? '';
    const dayPeriod = timeParts.find(p => p.type === 'dayPeriod')?.value ?? '';
    const tz = timeParts.find(p => p.type === 'timeZoneName')?.value ?? '';

    return `${datePart} at ${hour}:${minute} ${dayPeriod} (${tz})`;
  }

  /**
   * Returns the two-letter initials of a name for the avatar circle.
   * "Jane Doe" → "JD"; single word → first letter; null → "?".
   */
  getInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  private clearState(): void {
    this.entries.set([]);
    this.loading.set(false);
    this.error.set(null);
  }
}
