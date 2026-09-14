// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-07)
//
// Inner content of the Assign / Edit PI Delegate modal.
// Covers: R-UI-005 (two searchable multiselects; self-exclusion; Accept gating),
//         R-UI-006 (SYNC pre-load from By-project or By-person context),
//         R-UI-007 (named add/remove delta confirm; success toast; error + refetch).
//
// Design §7 — SYNC semantics: the modal receives open-context from
// AllModalsService.assignPiDelegateContext (the existing service-signal pattern;
// see AllModalsService.contactPersonModalData / addContactPersonConfirm for the idiom).
// On open it pre-seeds both multiselects from service.byProjectCache() so Save never
// silently revokes a delegate that was not explicitly removed (RB-1).

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllModalsService } from '@services/cache/all-modals.service';
import { CacheService } from '@services/cache/cache.service';
import { PiDelegatesClientService } from '../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import type { DelegateSummary } from '@interfaces/pi-delegates.interface';

// ─── Local form-state shape ───────────────────────────────────────────────────

interface PersonOption {
  delegate_user_id: number;
  name: string;
  email: string;
}

interface ProjectOption {
  project_code: string;
  project_name: string | null;
}

/**
 * Shape used by app-multiselect for People.
 * signalOptionValue path = 'selected_people'
 */
interface PeopleFormState {
  selected_people: PersonOption[];
}

/**
 * Shape used by app-multiselect for Projects.
 * signalOptionValue path = 'selected_projects'
 */
interface ProjectsFormState {
  selected_projects: ProjectOption[];
}

@Component({
  selector: 'app-assign-pi-delegate',
  standalone: true,
  imports: [CommonModule, MultiselectComponent],
  templateUrl: './assign-pi-delegate.component.html',
  styleUrl: './assign-pi-delegate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignPiDelegateComponent implements OnInit {
  // ─── Dependencies ─────────────────────────────────────────────────────────────

  readonly allModalsService = inject(AllModalsService);
  private readonly cache = inject(CacheService);
  readonly piService = inject(PiDelegatesClientService);
  private readonly actions = inject(ActionsService);

  // ─── Current user (self-exclusion, R-UI-005 AC.3) ─────────────────────────────
  // `sec_user_id` from CacheService.dataCache().user — same pattern used by isMyResult.
  readonly currentUserId = computed(() => this.cache.dataCache().user?.sec_user_id ?? null);

  // ─── Form state: the two multiselects' signals ─────────────────────────────────

  readonly peopleSignal: WritableSignal<PeopleFormState> = signal({ selected_people: [] });
  readonly projectsSignal: WritableSignal<ProjectsFormState> = signal({ selected_projects: [] });

  // ─── Derived helpers for delta computation ────────────────────────────────────

  private readonly selectedPeople = computed(() => this.peopleSignal().selected_people ?? []);
  private readonly selectedProjects = computed(() => this.projectsSignal().selected_projects ?? []);

  // ─── Accept gating (R-UI-005 AC.4) ────────────────────────────────────────────
  /**
   * Accept is disabled until ≥1 person AND ≥1 project are selected.
   * This is wired to app-modal's [disabledConfirmIf] via AllModalsService.
   * The signal is exposed so all-modals.component.html can read it.
   */
  readonly disabledConfirmIf: Signal<boolean> = computed(
    () => this.selectedPeople().length === 0 || this.selectedProjects().length === 0
  );

  // ─── Self-exclusion filter (R-UI-005 AC.3) ────────────────────────────────────
  /**
   * Returns a filter function that excludes the current user from People options.
   * Passed to app-multiselect [optionFilter].
   */
  readonly selfExclusionFilter = computed(() => {
    const userId = this.currentUserId();
    return (option: PersonOption) => option.delegate_user_id !== Number(userId);
  });

  // ─── Open-close tracking (to reset + pre-load on open) ────────────────────────

  private wasOpen = false;

  // ─── On init: register confirm/disabled into AllModalsService ─────────────────

  ngOnInit(): void {
    // Register the confirm action and disabled guard into the modal config so that
    // the app-modal footer buttons call back into this component.
    this.allModalsService.modalConfig.update(modals => ({
      ...modals,
      assignPiDelegate: {
        ...modals.assignPiDelegate,
        cancelText: 'Cancel',
        confirmText: 'Accept',
        cancelAction: () => this.onCancel(),
        confirmAction: () => this.onConfirm(),
        disabledConfirmAction: () => this.disabledConfirmIf()
      }
    }));
  }

  constructor() {
    // Watch the modal open/close cycle (same pattern as AddContactPersonModalComponent).
    effect(() => {
      const isOpen = this.allModalsService.isModalOpen('assignPiDelegate')?.isOpen ?? false;
      if (!this.wasOpen && isOpen) {
        // Transition: closed → open: pre-load from context (SYNC guard, R-UI-006).
        this.preLoadFromContext();
      }
      if (this.wasOpen && !isOpen) {
        // Transition: open → closed: clear state.
        this.clearState();
      }
      this.wasOpen = isOpen;
    });
  }

  // ─── Pre-load (R-UI-006 / design §7 SYNC guard) ───────────────────────────────

  /**
   * Seeds both multiselects from the open-context + the byProjectCache so that
   * closing the modal without editing does NOT revoke anyone.
   */
  private preLoadFromContext(): void {
    const ctx = this.allModalsService.assignPiDelegateContext();
    if (!ctx) {
      this.clearState();
      return;
    }

    if (ctx.source === 'byProject') {
      // Pre-select the project and seed its current delegates as the People selection.
      const projectEntry = this.piService.byProjectCache().find(
        p => p.project_code === ctx.projectCode
      );
      if (projectEntry) {
        this.projectsSignal.set({
          selected_projects: [
            { project_code: projectEntry.project_code, project_name: projectEntry.project_name }
          ]
        });
        // Seed current delegates — this is the anti-revoke guard: if user saves without
        // changing the people selection, the POST will include exactly the current delegates.
        this.peopleSignal.set({
          selected_people: projectEntry.delegates.map(d => ({
            delegate_user_id: d.delegate_user_id,
            name: d.name,
            email: d.email
          }))
        });
      } else {
        // Project not yet in cache — pre-select just the project, empty people.
        this.projectsSignal.set({
          selected_projects: [{ project_code: ctx.projectCode, project_name: null }]
        });
        this.peopleSignal.set({ selected_people: [] });
      }
    } else {
      // source === 'byPerson': pre-select the person + all projects they are currently
      // assigned to (derived from byProjectCache inversion — same as ByPersonComponent).
      const allProjects = this.piService.byProjectCache();
      const personProjects: ProjectOption[] = allProjects
        .filter(p => p.delegates.some(d => d.delegate_user_id === ctx.delegateUserId))
        .map(p => ({ project_code: p.project_code, project_name: p.project_name }));

      // Find the person's identity from any project that has them as a delegate.
      const delegateEntry: DelegateSummary | undefined = allProjects
        .flatMap(p => p.delegates)
        .find(d => d.delegate_user_id === ctx.delegateUserId);

      this.projectsSignal.set({ selected_projects: personProjects });
      this.peopleSignal.set({
        selected_people: delegateEntry
          ? [
              {
                delegate_user_id: delegateEntry.delegate_user_id,
                name: delegateEntry.name,
                email: delegateEntry.email
              }
            ]
          : []
      });
    }
  }

  // ─── Confirm (delta, POST, feedback) ─────────────────────────────────────────

  /**
   * On "Accept":
   * 1. Compute the add/remove delta per project (SYNC semantics, design §7).
   * 2. Show a named-delta confirmation (R-UI-007 AC.1 — MUST name both added AND removed).
   * 3. On confirm: POST full desired lists via service.assign → success toast / error state.
   */
  onConfirm(): void {
    const selectedPeople = this.selectedPeople();
    const selectedProjects = this.selectedProjects();

    // Build the delta for each selected project (SYNC: anyone currently a delegate
    // but not in the new selected-people list is BEING REVOKED).
    const allProjects = this.piService.byProjectCache();
    const deltaLines: string[] = [];
    const allRemoved: DelegateSummary[] = [];
    let hasRevoke = false;

    for (const proj of selectedProjects) {
      const currentEntry = allProjects.find(p => p.project_code === proj.project_code);
      const currentDelegateIds = new Set<number>(
        (currentEntry?.delegates ?? []).map(d => d.delegate_user_id)
      );
      const selectedIds = new Set<number>(selectedPeople.map(p => p.delegate_user_id));

      const added = selectedPeople.filter(p => !currentDelegateIds.has(p.delegate_user_id));
      const removed = (currentEntry?.delegates ?? []).filter(d => !selectedIds.has(d.delegate_user_id));

      if (removed.length > 0) hasRevoke = true;
      allRemoved.push(...removed);

      const projLabel = proj.project_name
        ? `${proj.project_code} — ${proj.project_name}`
        : proj.project_code;

      const addedNames =
        added.length > 0 ? `+ Added: ${added.map(p => p.name).join(', ')}` : null;
      const removedNames =
        removed.length > 0
          ? `— Removed (revoked): ${removed.map(d => d.name).join(', ')}`
          : null;
      const unchangedPeople = selectedPeople.filter(p =>
        currentDelegateIds.has(p.delegate_user_id)
      );
      const unchangedNames =
        unchangedPeople.length > 0
          ? `= Unchanged: ${unchangedPeople.map(p => p.name).join(', ')}`
          : null;
      const revokeAll =
        selectedPeople.length === 0 && (currentEntry?.delegates ?? []).length > 0
          ? 'This will REVOKE ALL delegates for this project.'
          : null;

      const parts = [
        `Project: ${projLabel}`,
        addedNames,
        unchangedNames,
        removedNames,
        revokeAll
      ]
        .filter(Boolean)
        .join('\n');
      deltaLines.push(parts);
    }

    // Build the detail message — explicitly warn about revoke-all (named red input).
    const revokeAllWarning =
      hasRevoke && allRemoved.length > 0
        ? `\n\n⚠ REMOVAL: ${[...new Set(allRemoved.map(d => d.name))].join(', ')} will be REVOKED from their assigned projects in this selection.`
        : '';

    const deltaDetail =
      deltaLines.join('\n\n') +
      revokeAllWarning +
      (selectedPeople.length === 0
        ? '\n\n⚠ No people selected — this will REVOKE ALL delegates from each selected project.'
        : '');

    // Build POST payload: per selected project, the FULL desired delegate list (SYNC).
    const assignments = selectedProjects.map(proj => ({
      project_id: proj.project_code,
      delegates: selectedPeople.map(p => ({ delegate_user_id: p.delegate_user_id }))
    }));

    // Show delta confirmation before writing (R-UI-007 AC.1).
    this.actions.showGlobalAlert({
      severity: 'confirm',
      summary: 'Confirm PI Delegate Assignment',
      detail: deltaDetail || 'Confirm the current delegate selection for the selected projects.',
      confirmCallback: {
        label: 'Save',
        event: () => {
          void this.executeAssign(assignments);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      }
    });
  }

  private async executeAssign(
    assignments: { project_id: string; delegates: { delegate_user_id: number }[] }[]
  ): Promise<void> {
    await this.piService.assign(assignments);

    if (!this.piService.error()) {
      // R-UI-007 AC.2: success toast.
      this.actions.showToast({
        severity: 'success',
        summary: 'PI Delegates updated',
        detail: 'The delegate assignments have been saved successfully.'
      });
      this.allModalsService.closeModal('assignPiDelegate');
    } else {
      // R-UI-007 AC.3: error state — service.assign already refetches; show error.
      this.actions.showToast({
        severity: 'error',
        summary: 'Assignment failed',
        detail: this.piService.error() ?? 'An error occurred. The screen has been refreshed.'
      });
    }
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────────

  onCancel(): void {
    this.allModalsService.closeModal('assignPiDelegate');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private clearState(): void {
    this.peopleSignal.set({ selected_people: [] });
    this.projectsSignal.set({ selected_projects: [] });
  }

  /**
   * Helper used by the template to derive a display-safe list of current project
   * delegates for the People multiselect label (used in selected-item template).
   */
  getSelectedPeopleList(): PersonOption[] {
    return this.selectedPeople();
  }

  getSelectedProjectsList(): ProjectOption[] {
    return this.selectedProjects();
  }
}
