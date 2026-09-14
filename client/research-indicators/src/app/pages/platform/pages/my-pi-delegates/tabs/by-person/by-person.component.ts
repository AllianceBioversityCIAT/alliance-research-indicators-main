// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-06)
//
// By-person tab: reads service.byPersonCache() directly (populated by the
// GET /api/pi-delegates/by-user/people endpoint via loadByUser).
// Covers: R-UI-003 (By-person view), R-UI-008 (revoke named pair only),
//         NFR-UI-002 (non-colour cues), NFR-UI-003 (states).
//
// Source change: personRows is now a `computed` of service.byPersonCache() rather than a
// byProjectCache inversion.  After every write, _reloadForUser() refreshes BOTH caches,
// so byPersonCache stays authoritative and the inversion Map is no longer needed.
// R-UI-003 AC.2 (never show an unmanaged project) is guaranteed by the endpoint: the
// backend only returns projects the queried user manages.
//
// Assign affordance: @Output() assignRequested — modal pre-fill is T-UI-07.

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

/** A single row in the By-person table (locally defined — not from the service). */
export interface PersonRow {
  delegate_user_id: number;
  name: string;
  email: string;
  projects: { project_code: string; project_name: string | null }[];
}

@Component({
  selector: 'app-by-person',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule
  ],
  templateUrl: './by-person.component.html',
  styleUrl: './by-person.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ByPersonComponent {
  // ─── Dependencies ─────────────────────────────────────────────────────────────

  readonly service = inject(PiDelegatesClientService);
  private readonly actions = inject(ActionsService);

  // ─── Assign output (T-UI-07 wires the actual modal) ─────────────────────────
  // Assign button emits the delegate_user_id; the parent/page shell opens the modal.
  @Output() readonly assignRequested = new EventEmitter<{ delegateUserId: number }>();

  // ─── Search ───────────────────────────────────────────────────────────────────
  readonly searchQuery = signal('');

  // ─── byPersonCache read (R-UI-003 / R-UI-010 / by-user/people endpoint) ──────
  /**
   * Derived: maps service.byPersonCache() (populated by GET /api/pi-delegates/by-user/people)
   * into PersonRow[].  DelegateProjects.name/email are string|null; we coalesce to '' for
   * display.  After any write, _reloadForUser() reloads byPersonCache reactively.
   *
   * Source: service.byPersonCache() — NOT a byProjectCache inversion.
   */
  readonly personRows = computed<PersonRow[]>(() =>
    this.service.byPersonCache().map(d => ({
      delegate_user_id: d.delegate_user_id,
      name: d.name ?? '',
      email: d.email ?? '',
      projects: d.projects
    }))
  );

  /** Search-filtered view: never mutates personRows (R-UI-010). */
  readonly filteredRows = computed<PersonRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.personRows();
    return this.personRows().filter(row => this.matchesQuery(row, query));
  });

  readonly hasSearch = computed(() => this.searchQuery().trim().length > 0);

  // ─── Revoke (R-UI-008) ────────────────────────────────────────────────────────
  /**
   * Revoke this person from the named project only.
   * Names person + project + effect in the confirmation (R-UI-007 AC.1).
   * Does NOT affect the same person on other projects (R-UI-008 AC.1).
   * Uses the same ActionsService.showGlobalAlert pattern as ByProjectComponent (T-UI-05).
   */
  onRevokeProject(row: PersonRow, project: { project_code: string; project_name: string | null }): void {
    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Revoke PI Delegate',
      detail:
        `Remove ${row.name} (${row.email}) as PI Delegate from project ${project.project_code}` +
        (project.project_name ? ` — ${project.project_name}` : '') +
        `? This will revoke their delegate access for this project only.`,
      confirmCallback: {
        label: 'Revoke',
        event: () => {
          void this.service.revokePair(project.project_code, row.delegate_user_id);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      }
    });
  }

  // ─── Assign affordance ────────────────────────────────────────────────────────
  onAssign(row: PersonRow): void {
    this.assignRequested.emit({ delegateUserId: row.delegate_user_id });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  clearSearch(): void {
    this.searchQuery.set('');
  }

  // ─── Private ──────────────────────────────────────────────────────────────────
  private matchesQuery(
    row: PersonRow,
    query: string
  ): boolean {
    // Match by person name or email
    if (row.name.toLowerCase().includes(query)) return true;
    if (row.email.toLowerCase().includes(query)) return true;
    // Match by any project code or name
    return row.projects.some(
      p =>
        p.project_code.toLowerCase().includes(query) ||
        (p.project_name?.toLowerCase().includes(query) ?? false)
    );
  }
}
