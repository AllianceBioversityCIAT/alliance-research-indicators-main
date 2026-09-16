// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-06)
//
// By-person tab: reads service.byPersonCache() directly (populated by the
// GET /api/pi-delegates/by-user/people endpoint via loadByUser).
// The tab owns its own search box, paginator and summary line — all three live
// INSIDE the table card. searchQuery remains an input that seeds the local state.
// Covers: R-UI-003 (By-person view), R-UI-008 (revoke named pair only),
//         NFR-UI-002 (non-colour cues), NFR-UI-003 (states).
//
// Assign affordance: @Output() assignRequested — modal pre-fill is T-UI-07.

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  linkedSignal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { SearchExportControlsComponent } from '@components/search-export-controls/search-export-controls.component';
import { PiDelegatesClientService } from '../../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';

/** A single row in the By-person table (locally defined — not from the service). */
export interface PersonRow {
  delegate_user_id: number;
  name: string;
  email: string;
  is_active: boolean;
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
    TooltipModule,
    SearchExportControlsComponent,
    CustomTagComponent
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

  // ─── History output ───────────────────────────────────────────────────────────
  // History button emits delegate_user_id + name; the shell opens the history modal.
  @Output() readonly historyRequested = new EventEmitter<{
    delegateUserId: number;
    name: string | null;
  }>();

  // ─── Filter state ─────────────────────────────────────────────────────────────
  // The input seeds the local writable state; the in-table search box drives it.
  readonly searchQuery = input<string>('');
  readonly searchTerm = linkedSignal(() => this.searchQuery());

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
      is_active: d.is_active,
      projects: d.projects
    }))
  );

  /** Search-filtered view: never mutates personRows (R-UI-010). */
  readonly filteredRows = computed<PersonRow[]>(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.personRows();
    return this.personRows().filter(row => this.matchesQuery(row, query));
  });

  /** Clear Filters on the shared search control: resets the search term. */
  clearFilters(): void {
    this.searchTerm.set('');
  }

  // ─── Summary line (rendered inside the table card) ───────────────────────────
  // Only the inactive-delegate warning is surfaced; the counts were noise next
  // to the paginator's own "Showing x to y of N" report.
  readonly summaryInactive = computed(
    () => this.personRows().filter(row => row.is_active === false).length
  );

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

  // ─── History affordance ───────────────────────────────────────────────────────
  onHistory(row: PersonRow): void {
    this.historyRequested.emit({
      delegateUserId: row.delegate_user_id,
      name: row.name || null
    });
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
