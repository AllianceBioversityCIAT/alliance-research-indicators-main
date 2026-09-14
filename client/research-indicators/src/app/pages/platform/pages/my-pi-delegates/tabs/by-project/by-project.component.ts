// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-05)
//
// By-project tab: enriched p-table with per-delegate "X" revoke + client-side search.
// Covers: R-UI-002 (by-project view), R-UI-008 (revoke named pair only),
//         NFR-UI-002 (non-colour cues), NFR-UI-003 (states).
//
// Assign affordance: emits @Output() assignRequested — modal wiring is T-UI-07.

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PiDelegatesClientService } from '../../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import type { DelegateSummary, ProjectDelegates } from '@interfaces/pi-delegates.interface';

@Component({
  selector: 'app-by-project',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule
  ],
  templateUrl: './by-project.component.html',
  styleUrl: './by-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ByProjectComponent {
  // ─── Dependencies ─────────────────────────────────────────────────────────────

  readonly service = inject(PiDelegatesClientService);
  private readonly actions = inject(ActionsService);

  // ─── Assign output (T-UI-07 wires the actual modal) ─────────────────────────
  // Assign button emits the project code; the parent/page shell opens the modal.
  @Output() readonly assignRequested = new EventEmitter<{ projectCode: string }>();

  // ─── Search (R-UI-010: filter over the cache, never mutate it) ───────────────
  readonly searchQuery = signal('');

  /** Derived filtered view: matches by person (name/email) OR project (code/name). */
  readonly filteredRows = computed<ProjectDelegates[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.service.byProjectCache();
    return this.service.byProjectCache().filter(row => this.matchesQuery(row, query));
  });

  readonly hasSearch = computed(() => this.searchQuery().trim().length > 0);

  // ─── Revoke (R-UI-008) ────────────────────────────────────────────────────────

  /**
   * Opens a confirmation dialog naming the delegate + project + effect
   * (R-UI-007 AC.1), then calls service.revokePair on confirm.
   * Does NOT affect the same person on other projects (R-UI-008 AC.1).
   */
  onRevokeDelegate(project: ProjectDelegates, delegate: DelegateSummary): void {
    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Revoke PI Delegate',
      detail:
        `Remove ${delegate.name} (${delegate.email}) as PI Delegate from` +
        ` project ${project.project_code}` +
        (project.project_name ? ` — ${project.project_name}` : '') +
        `? This will revoke their delegate access for this project only.`,
      confirmCallback: {
        label: 'Revoke',
        event: () => {
          void this.service.revokePair(project.project_code, delegate.delegate_user_id);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      }
    });
  }

  // ─── Assign affordance ────────────────────────────────────────────────────────

  onAssign(project: ProjectDelegates): void {
    this.assignRequested.emit({ projectCode: project.project_code });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Safely formats an ISO date string or Date object to a readable date.
   * Dates from the API arrive as ISO strings despite the Date|null type (T-UI-01 advisory).
   */
  formatDate(value: Date | string | null | undefined): string {
    if (value == null) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  private matchesQuery(row: ProjectDelegates, query: string): boolean {
    // Match by project code or name
    if (row.project_code.toLowerCase().includes(query)) return true;
    if (row.project_name?.toLowerCase().includes(query)) return true;
    // Match by any delegate name or email
    return row.delegates.some(
      d => d.name.toLowerCase().includes(query) || d.email.toLowerCase().includes(query)
    );
  }
}
