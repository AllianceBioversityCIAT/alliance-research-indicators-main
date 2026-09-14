// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-05)
//
// By-project tab: enriched p-table with per-delegate "X" revoke.
// searchQuery and statusFilter are now input() signals, driven by the shell filter bar.
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
  input
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

  // ─── History output ───────────────────────────────────────────────────────────
  // History button emits project code + name; the shell opens the history modal.
  @Output() readonly historyRequested = new EventEmitter<{
    projectCode: string;
    projectName: string | null;
  }>();

  // ─── Input signals from shell filter bar ─────────────────────────────────────
  readonly searchQuery = input<string>('');
  readonly statusFilter = input<string>('All');

  /** Derived filtered view: applies status + search. Never mutates the cache. */
  readonly filteredRows = computed<ProjectDelegates[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    return this.service.byProjectCache().filter(row => {
      const matchesStatus = status === 'All' || row.status === status;
      const matchesQuery = !query || this.matchesQuery(row, query);
      return matchesStatus && matchesQuery;
    });
  });

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

  // ─── History affordance ───────────────────────────────────────────────────────

  onHistory(project: ProjectDelegates): void {
    this.historyRequested.emit({
      projectCode: project.project_code,
      projectName: project.project_name
    });
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

  // ─── Private ──────────────────────────────────────────────────────────────────

  matchesQuery(row: ProjectDelegates, query: string): boolean {
    // Match by project code or name
    if (row.project_code.toLowerCase().includes(query)) return true;
    if (row.project_name?.toLowerCase().includes(query)) return true;
    // Match by any delegate name or email
    return row.delegates.some(
      d => d.name.toLowerCase().includes(query) || d.email.toLowerCase().includes(query)
    );
  }
}
