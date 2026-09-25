// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-05)
//
// By-project tab: enriched p-table with per-delegate "X" revoke.
// The tab owns its own search box, paginator and summary line — all three live
// INSIDE the table card. searchQuery/statusFilter remain inputs that seed the
// local state, so a host can still preset a filter (there is no status UI).
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
  input,
  linkedSignal,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { SearchExportControlsComponent } from '@components/search-export-controls/search-export-controls.component';
import { ProjectUtilsService, type ProjectType } from '@services/project-utils.service';
import { PiDelegatesClientService } from '../../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import type { DelegateSummary, ProjectDelegates } from '@interfaces/pi-delegates.interface';

/** Which of the header counters the table is narrowed to. */
export type RoleFilter = 'all' | 'pi' | 'delegate';

/**
 * A table row: the project plus the caller's role on it, resolved ONCE.
 *
 * `role` is a real field rather than a template expression because p-table sorts
 * row properties — it never sees what a `{{ }}` renders. A sortable Role column
 * therefore has to carry the label on the row.
 */
export interface ProjectRow extends ProjectDelegates {
  role: string;
  /** True for the admin-only "listed by role, not by involvement" case. */
  hasNoRole: boolean;
}

/** Shown in Role when the caller is neither PI nor delegate of a listed project. */
export const NO_ROLE_LABEL = 'No role (admin)';

@Component({
  selector: 'app-by-project',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    PopoverModule,
    SearchExportControlsComponent,
    CustomTagComponent
  ],
  templateUrl: './by-project.component.html',
  styleUrl: './by-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ByProjectComponent {
  // ─── Dependencies ─────────────────────────────────────────────────────────────

  readonly service = inject(PiDelegatesClientService);
  private readonly actions = inject(ActionsService);
  private readonly projectUtils = inject(ProjectUtilsService);

  // ─── Assign output (T-UI-07 wires the actual modal) ─────────────────────────
  // Assign button emits the project code; the parent/page shell opens the modal.
  @Output() readonly assignRequested = new EventEmitter<{ projectCode: string }>();

  // ─── History output ───────────────────────────────────────────────────────────
  // History button emits project code + name; the shell opens the history modal.
  @Output() readonly historyRequested = new EventEmitter<{
    projectCode: string;
    projectName: string | null;
  }>();

  // ─── Filter state ────────────────────────────────────────────────────────────
  // The inputs seed the local writable state; the in-table toolbar then drives it.
  readonly searchQuery = input<string>('');
  readonly statusFilter = input<string>('All');

  readonly searchTerm = linkedSignal(() => this.searchQuery());
  readonly statusTerm = linkedSignal(() => this.statusFilter());

  // ─── Role quick filters (@akili-spec docs/specs/changes/my-pi-delegates-admin-scope) ──
  //
  // The three chips mirror the three counters in the page header, and each one
  // narrows the table to exactly what its counter counts — so a number and the
  // rows behind it can never disagree. 'all' is the unfiltered state.
  //
  // They matter most in the administrator view, where the table holds every
  // project on the platform and "the two I actually lead" is otherwise a search
  // the user cannot express.

  readonly roleTerm = signal<RoleFilter>('all');

  /** The chips, in the same order as the header counters. */
  readonly roleFilterOptions: readonly { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'All projects' },
    { value: 'pi', label: 'As PI' },
    { value: 'delegate', label: 'As PI delegate' }
  ];

  selectRoleFilter(value: RoleFilter): void {
    this.roleTerm.set(value);
  }

  /** Clear Filters on the shared search control: resets search + status + role. */
  clearFilters(): void {
    this.searchTerm.set('');
    this.statusTerm.set('All');
    this.roleTerm.set('all');
  }

  /** Derived filtered view: applies role + status + search. Never mutates the cache. */
  readonly filteredRows = computed<ProjectRow[]>(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusTerm();
    const role = this.roleTerm();
    return this.service
      .byProjectCache()
      .filter(row => {
        const matchesRole = this.matchesRole(row, role);
        const matchesStatus = status === 'All' || row.status === status;
        const matchesQuery = !query || this.matchesQuery(row, query);
        return matchesRole && matchesStatus && matchesQuery;
      })
      .map(row => {
        const label = this.roleLabel(row);
        return { ...row, role: label, hasNoRole: label === NO_ROLE_LABEL };
      });
  });

  /**
   * Both branches read the SAME predicates the header counters and the Role
   * column read, rather than re-deriving "am I the PI" here — that duplication
   * is how a chip ends up showing a different set than the number it sits under.
   */
  private matchesRole(project: ProjectDelegates, role: RoleFilter): boolean {
    if (role === 'pi') return this.service.isPiOf(project);
    if (role === 'delegate') return this.service.isDelegateOf(project);
    return true;
  }

  // ─── Revoke (R-UI-008) ────────────────────────────────────────────────────────

  /**
   * Opens a confirmation dialog naming the delegate + project + effect
   * (R-UI-007 AC.1), then calls service.revokePair on confirm.
   * Does NOT affect the same person on other projects (R-UI-008 AC.1).
   */
  onRevokeDelegate(project: ProjectDelegates, delegate: DelegateSummary): void {
    // Same block layout as the assign confirmation: the project on one line, a
    // blank line, then the change in bold. Left-aligned via alert-detail-left.
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
        `<div><strong>Removed:</strong> ${delegate.name}</div>` +
        `</div>`,
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

  // ─── Delegates cell overflow ─────────────────────────────────────────────────

  /** Chips shown inline; the rest move into the "+N more" popover. */
  private static readonly MAX_VISIBLE_DELEGATES = 4;

  visibleDelegates(project: ProjectDelegates): DelegateSummary[] {
    return project.delegates.slice(0, ByProjectComponent.MAX_VISIBLE_DELEGATES);
  }

  hiddenDelegateCount(project: ProjectDelegates): number {
    return Math.max(0, project.delegates.length - ByProjectComponent.MAX_VISIBLE_DELEGATES);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  /**
   * What the caller personally is on this project.
   *
   * An administrator's list contains every project on the platform, and on most
   * of them they are neither PI nor delegate — they are there by role, not by
   * involvement. Saying "PI Delegate" for those rows is simply false, and it was
   * visibly so on projects whose delegate list is empty. Those rows say so in
   * words: a bare dash leaves the reader to guess why the project is there, and
   * reads as nothing at all to a screen reader.
   *
   * For a PI or delegate NOTHING changes: service.isDelegateOf() still answers
   * yes for every project in their (already managed-only) list.
   */
  roleLabel(project: ProjectDelegates): string {
    if (this.service.isPiOf(project)) return 'Principal Investigator';
    return this.service.isDelegateOf(project) ? 'PI Delegate' : NO_ROLE_LABEL;
  }

  /** The full sentence behind the short label — tooltip and screen-reader text. */
  roleDescription(row: ProjectRow): string {
    return row.hasNoRole
      ? 'You have no role on this project — it is listed because you are an administrator'
      : row.role;
  }

  /**
   * Status chip data for <app-custom-tag>, so this table shows the same colours
   * as My Projects. The name→id mapping stays in ProjectUtilsService — the row
   * only carries the status name, which is what `contract_status` holds there.
   */
  statusDisplay(project: ProjectDelegates): { statusId: number; statusName: string } {
    return this.projectUtils.getStatusDisplay({ contract_status: project.status } as unknown as ProjectType);
  }

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
