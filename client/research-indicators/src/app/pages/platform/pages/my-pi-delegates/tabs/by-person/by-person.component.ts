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

  // ─── Assign-new output (@akili-spec docs/specs/changes/my-pi-delegates-admin-scope) ──
  // No payload: the modal opens empty and the user picks both sides.
  @Output() readonly assignNewRequested = new EventEmitter<void>();

  onAssignNewDelegate(): void {
    this.assignNewRequested.emit();
  }

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

  // ─── Revoke (R-UI-008) ────────────────────────────────────────────────────────
  /**
   * Revoke this person from the named project only.
   * Names person + project + effect in the confirmation (R-UI-007 AC.1).
   * Does NOT affect the same person on other projects (R-UI-008 AC.1).
   * Uses the same ActionsService.showGlobalAlert pattern as ByProjectComponent (T-UI-05).
   */
  onRevokeProject(row: PersonRow, project: { project_code: string; project_name: string | null }): void {
    // Same block layout as the assign confirmation (project, blank line, change).
    const projectLabel = project.project_name
      ? `<strong>${project.project_code}</strong> — ${project.project_name}`
      : `<strong>${project.project_code}</strong>`;

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Revoke PI Delegate',
      detail:
        `<div class="alert-detail-left">` +
        `<div>The following changes will be made in project ${projectLabel}</div>` +
        `<div>&nbsp;</div>` +
        `<div><strong>Removed:</strong> ${row.name}</div>` +
        `</div>`,
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

  // ─── Remove-delegate affordance (inactive people only) ───────────────────────
  /**
   * Revokes the person from every project they are delegated on. Offered instead
   * of "assign projects" when the account is inactive — there is no point adding
   * projects to someone who cannot review results.
   */
  onRemoveDelegate(row: PersonRow): void {
    // One block per project, in the same shape as the assign confirmation.
    const blocks = row.projects.map(project => {
      const label = project.project_name
        ? `<strong>${project.project_code}</strong> — ${project.project_name}`
        : `<strong>${project.project_code}</strong>`;
      return (
        `<div>The following changes will be made in project ${label}</div>` +
        `<div>&nbsp;</div>` +
        `<div><strong>Removed:</strong> ${row.name}</div>`
      );
    });

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Remove PI Delegate',
      detail: `<div class="alert-detail-left">${blocks.join('<div>&nbsp;</div>')}</div>`,
      confirmCallback: {
        label: 'Remove',
        event: () => {
          void this.service.revokeDelegate(
            row.delegate_user_id,
            row.projects.map(p => p.project_code)
          );
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
