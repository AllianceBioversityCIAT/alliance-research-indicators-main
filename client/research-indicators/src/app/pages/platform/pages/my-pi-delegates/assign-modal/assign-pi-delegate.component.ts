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
  QueryList,
  Signal,
  ViewChildren,
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
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { TooltipModule } from 'primeng/tooltip';
import { ProjectUtilsService, type ProjectType } from '@services/project-utils.service';
import { PiDelegatePeoplePickerStubService } from '../services/pi-delegate-picker-stub.service';
import type { DelegateSummary, ProjectDelegates } from '@interfaces/pi-delegates.interface';

// ─── Local form-state shape ───────────────────────────────────────────────────

interface PersonOption {
  delegate_user_id: number;
  name: string;
  email: string;
  /** sec_users.carnet — rendered in the option row when present. */
  carnet?: string | null;
  /** Carried from DelegateSummary.is_active when seeded from byProjectCache.
   *  undefined for newly-picked options (active-users endpoint — always active). */
  is_active?: boolean;
}

/**
 * Project option. The extra fields feed the option row (status, dates, pool
 * funding, delegate count) and are seeded from byProjectCache so a pre-loaded
 * chip shows exactly what a freshly-picked one shows.
 */
interface ProjectOption {
  project_code: string;
  project_name: string | null;
  status?: string | null;
  start_date?: Date | null;
  end_date?: Date | null;
  is_pool_funding_contributor?: boolean;
  delegate_count?: number;
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
  imports: [CommonModule, MultiselectComponent, CustomTagComponent, TooltipModule],
  templateUrl: './assign-pi-delegate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignPiDelegateComponent implements OnInit {
  // ─── Dependencies ─────────────────────────────────────────────────────────────

  readonly allModalsService = inject(AllModalsService);
  private readonly cache = inject(CacheService);
  readonly piService = inject(PiDelegatesClientService);
  private readonly actions = inject(ActionsService);
  private readonly peoplePicker = inject(PiDelegatePeoplePickerStubService);
  private readonly projectUtils = inject(ProjectUtilsService);

  // ─── Current user ─────────────────────────────────────────────────────────────
  // `sec_user_id` from CacheService.dataCache().user — same pattern used by isMyResult.
  // NOT used to hide yourself from the picker: you may delegate to yourself on any
  // project you are not the PI of (see the self-exclusion note below).
  readonly currentUserId = computed(() => this.cache.dataCache().user?.sec_user_id ?? null);

  // ─── Form state: the two multiselects' signals ─────────────────────────────────

  readonly peopleSignal: WritableSignal<PeopleFormState> = signal({ selected_people: [] });
  readonly projectsSignal: WritableSignal<ProjectsFormState> = signal({ selected_projects: [] });

  // ─── Derived helpers for delta computation ────────────────────────────────────

  readonly selectedPeople = computed(() => this.peopleSignal().selected_people ?? []);
  private readonly selectedProjects = computed(() => this.projectsSignal().selected_projects ?? []);

  // ─── Projects picker disabled (CHANGE 1) ─────────────────────────────────────
  /**
   * When the modal is opened from a project row, the project is pre-fixed and
   * cannot be changed — only the People picker remains interactive.
   */
  readonly projectsDisabled = computed(
    () => this.allModalsService.assignPiDelegateContext()?.source === 'byProject'
  );

  // ─── "Assign New Delegate" mode (@akili-spec docs/specs/changes/my-pi-delegates-admin-scope) ──
  /**
   * Opened from the By-person tab's "Assign New Delegate" button: nothing is
   * pre-selected, ONE person is picked, and any number of projects.
   *
   * Available to every user, not only administrators — the projects a PI or
   * delegate can pick are still only their own, because the picker is fed by the
   * same cache their table is.
   */
  readonly isNewDelegateMode = computed(
    () => this.allModalsService.assignPiDelegateContext()?.source === 'newDelegate'
  );

  /**
   * In this mode Save may only ADD.
   *
   * The by-person flow treats the Projects picker as the full desired list, so
   * clearing a project revokes that delegation. Starting from an EMPTY picker,
   * that same rule would revoke every delegation the chosen person already has
   * anywhere — the exact opposite of "assign a new one". So the removal pass is
   * skipped entirely here.
   */
  readonly isAddOnlyMode = computed(() => this.isNewDelegateMode());

  // ─── People picker disabled (CHANGE 3) ───────────────────────────────────────
  /**
   * Mirror of projectsDisabled: when the modal is opened from a person row,
   * the person is pre-fixed and cannot be changed — only the Projects picker
   * remains interactive.
   */
  readonly peopleDisabled = computed(
    () => this.allModalsService.assignPiDelegateContext()?.source === 'byPerson'
  );

  // ─── Field descriptions (rendered by app-multiselect under each label) ───────

  /** People field description — swaps for the locked copy when the person is fixed. */
  readonly peopleDescription = computed(() => {
    if (this.peopleDisabled()) {
      return 'Opened from this person — only the projects can be changed here.';
    }
    return this.isNewDelegateMode()
      ? 'Select the person who will act as PI Delegate. One person at a time.'
      : 'Select the people who will act as PI Delegates.';
  });

  /**
   * Projects field description — swaps for the locked copy when the project is
   * fixed, and tells an administrator that the picker spans the whole platform
   * (@akili-spec docs/specs/changes/my-pi-delegates-admin-scope).
   */
  readonly projectsDescription = computed(() => {
    if (this.projectsDisabled()) {
      return 'Opened from this project — only the people can be changed here.';
    }
    if (this.isNewDelegateMode()) {
      return this.piService.isAdminView()
        ? 'Select the projects this person will be a delegate on. Any project on the platform is available, and existing delegations elsewhere are left untouched.'
        : 'Select the projects this person will be a delegate on. Existing delegations elsewhere are left untouched.';
    }
    return this.piService.isAdminView()
      ? 'Select the projects for this delegation. As an administrator you can pick any project on the platform.'
      : 'Select the projects for this delegation. Only your manageable projects will appear.';
  });

  // ─── Inactive delegate warning (CHANGE 2) ────────────────────────────────────
  /**
   * Pre-loaded delegates that have is_active === false.
   * Only appears for chips seeded from byProjectCache; newly-picked options are
   * always active (active-users endpoint).
   */
  readonly inactiveSelectedPeople = computed(() =>
    this.selectedPeople().filter(p => p.is_active === false)
  );

  /** Comma-separated names of inactive pre-loaded delegates — used directly in the template. */
  readonly inactiveNames = computed(() =>
    this.inactiveSelectedPeople()
      .map(p => p.name)
      .join(', ')
  );

  // ─── Accept gating (R-UI-005 AC.4) ────────────────────────────────────────────
  /**
   * Accept is disabled until ≥1 person AND ≥1 project are selected.
   * This is wired to app-modal's [disabledConfirmIf] via AllModalsService.
   * The signal is exposed so all-modals.component.html can read it.
   */
  readonly disabledConfirmIf: Signal<boolean> = computed(
    () => this.selectedPeople().length === 0 || this.selectedProjects().length === 0
  );

  // ─── Self-exclusion: REMOVED (was R-UI-005 AC.3) ─────────────────────────────
  //
  // The picker used to drop the signed-in user from the options. That hid a
  // legitimate action behind a rule the platform does not actually have: neither
  // PiDelegatesService.assign() nor GET /api/users/active excludes the caller —
  // the only exclusion on the write path is PI-of-that-project (R-PID-008).
  //
  // So the user now appears like anyone else, and the ONE case where they may not
  // be picked is already handled, by the same mechanism that handles it for
  // everybody: piDisabledPeople greys out the PI of any selected project. That
  // gives exactly the three behaviours the product wants —
  //   • PI of the selected project  → visible, greyed out (the API would 400),
  //   • delegate on it              → selectable,
  //   • admin on a project they neither lead nor delegate → selectable.

  // ─── PI exclusion in the People picker (backend rule R-PID-008) ──────────────
  //
  // The API rejects assigning the PI of a project as a delegate of that same
  // project with a 400. Rather than letting the user hit that error, the PI is
  // greyed out in the picker as soon as their project is selected.
  //
  // The PI comes from ProjectDelegates.pi_user_id — the same sec_user_id the
  // backend rule resolves — so the match is by id, never by name.

  /** People to grey out: the PI of any currently-selected project. */
  readonly piDisabledPeople: WritableSignal<PersonOption[]> = signal([]);

  /** True when this option is greyed out because they are a selected project's PI. */
  isProjectPi(person: { delegate_user_id: number } | null | undefined): boolean {
    if (!person) return false;
    return this.piDisabledPeople().some(p => p.delegate_user_id === person.delegate_user_id);
  }

  /** Names of those people — shown as a hint under the People picker. */
  readonly piDisabledNames = computed(() =>
    this.piDisabledPeople()
      .map(p => p.name)
      .join(', ')
  );

  /** sec_user_ids of the PIs of the currently-selected projects. */
  private readonly selectedProjectPiIds = computed(() => {
    const selectedCodes = new Set(this.selectedProjects().map(p => p.project_code));
    return new Set(
      this.piService
        .byProjectCache()
        .filter(project => selectedCodes.has(project.project_code))
        .map(project => project.pi_user_id)
        .filter((id): id is number => id != null)
    );
  });

  // ─── Option-row helpers (picker templates) ───────────────────────────────────

  /** Maps a cached project row to the picker's option shape (same fields the row renders). */
  private toProjectOption(project: ProjectDelegates): ProjectOption {
    return {
      project_code: project.project_code,
      project_name: project.project_name,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      is_pool_funding_contributor: project.is_pool_funding_contributor,
      delegate_count: project.delegates.length
    };
  }

  /**
   * Status chip data for <app-custom-tag> — the same mapping the By-project
   * table uses, so a project shows one status design across the feature.
   */
  statusDisplay(project: { status?: string | null } | null | undefined): {
    statusId: number;
    statusName: string;
  } {
    return this.projectUtils.getStatusDisplay({
      contract_status: project?.status
    } as unknown as ProjectType);
  }

  /** dd MMM yyyy, or an em dash when the date is absent. */
  formatDate(value: Date | string | null | undefined): string {
    if (value == null) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ─── Open-close tracking (to reset + pre-load on open) ────────────────────────

  private wasOpen = false;

  /** Both pickers, so their search boxes can be emptied when the modal closes. */
  @ViewChildren(MultiselectComponent) private readonly pickers?: QueryList<MultiselectComponent>;

  // ─── On init: register confirm/disabled into AllModalsService ─────────────────

  ngOnInit(): void {
    // The Cancel / Accept buttons are rendered by THIS component at the end of
    // its content (the Edit environment variable pattern), so they scroll with
    // the form. app-modal's footer must therefore stay empty — leaving a
    // cancelAction/confirmAction registered would render a second pair.
    this.allModalsService.modalConfig.update(modals => ({
      ...modals,
      assignPiDelegate: {
        ...modals.assignPiDelegate,
        cancelAction: undefined,
        confirmAction: undefined,
        disabledConfirmAction: undefined
      }
    }));
  }

  constructor() {
    // Watch the modal open/close cycle (same pattern as AddContactPersonModalComponent).
    effect(() => {
      const isOpen = this.allModalsService.isModalOpen('assignPiDelegate')?.isOpen ?? false;
      if (!this.wasOpen && isOpen) {
        // Transition: closed → open. Discard whatever the previous opening left
        // behind BEFORE seeding — otherwise a modal opened from By person can
        // still show the selection of the By project session that preceded it.
        this.clearState();
        this.preLoadFromContext();
      }
      if (this.wasOpen && !isOpen) {
        // Transition: open → closed: clear state.
        this.clearState();
      }
      this.wasOpen = isOpen;
    });

    // Selected projects (or the loaded people list) changed → refresh the PI set.
    effect(() => {
      const piIds = this.selectedProjectPiIds();
      const people = this.peoplePicker.list();
      this.piDisabledPeople.set(
        piIds.size === 0 ? [] : people.filter(person => piIds.has(person.delegate_user_id))
      );
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

    // "Assign New Delegate": nothing to seed — the anti-revoke guard the other
    // two modes need does not apply, because this mode never revokes.
    if (ctx.source === 'newDelegate') {
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
          selected_projects: [this.toProjectOption(projectEntry)]
        });
        // Seed current delegates — this is the anti-revoke guard: if user saves without
        // changing the people selection, the POST will include exactly the current delegates.
        // is_active is carried so the inactive-delegate warning can surface them.
        this.peopleSignal.set({
          selected_people: projectEntry.delegates.map(d => ({
            delegate_user_id: d.delegate_user_id,
            name: d.name,
            email: d.email,
            carnet: d.carnet ?? null,
            is_active: d.is_active
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
        .map(p => this.toProjectOption(p));

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
                email: delegateEntry.email,
                carnet: delegateEntry.carnet ?? null,
                is_active: delegateEntry.is_active
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
    const allProjects = this.piService.byProjectCache();
    const isAddOnly = this.isAddOnlyMode();
    // Add-only edits the SAME axis as by-person — one person across projects —
    // so it shares that branch and only skips the removal pass below.
    const isPersonMode =
      isAddOnly || this.allModalsService.assignPiDelegateContext()?.source === 'byPerson';

    // ── Desired delegate list per project ────────────────────────────────────
    //
    // The POST is a per-project SYNC: whoever is missing from a project's list is
    // revoked. What "the full list" means depends on which axis the modal is
    // editing, and getting that wrong revokes people the user never touched:
    //
    //   • Opened from a PROJECT — the People picker is the edited axis, so the
    //     selection IS that project's desired list (removing a chip revokes).
    //   • Opened from a PERSON — the Projects picker is the edited axis. Only
    //     THAT person may be added to or removed from a project; every other
    //     delegate of those projects must survive untouched.
    const desiredByProject = new Map<string, PersonOption[]>();

    const currentDelegatesOf = (projectCode: string): PersonOption[] =>
      (allProjects.find(p => p.project_code === projectCode)?.delegates ?? []).map(d => ({
        delegate_user_id: d.delegate_user_id,
        name: d.name,
        email: d.email,
        is_active: d.is_active
      }));

    if (isPersonMode) {
      const person = selectedPeople[0];

      // Selected projects: this person joins whoever is already there.
      for (const proj of selectedProjects) {
        const current = currentDelegatesOf(proj.project_code);
        const alreadyThere = current.some(d => d.delegate_user_id === person?.delegate_user_id);
        desiredByProject.set(
          proj.project_code,
          alreadyThere || !person ? current : [...current, person]
        );
      }

      // Projects dropped from the selection: this person leaves, nobody else does.
      // Skipped in add-only mode, where "not selected" means "not touched" — the
      // picker started empty, so every existing delegation would look dropped.
      if (person && !isAddOnly) {
        const selectedCodes = new Set(selectedProjects.map(p => p.project_code));
        for (const project of allProjects) {
          const hasPerson = project.delegates.some(d => d.delegate_user_id === person.delegate_user_id);
          if (hasPerson && !selectedCodes.has(project.project_code)) {
            desiredByProject.set(
              project.project_code,
              currentDelegatesOf(project.project_code).filter(
                d => d.delegate_user_id !== person.delegate_user_id
              )
            );
          }
        }
      }
    } else {
      for (const proj of selectedProjects) {
        desiredByProject.set(proj.project_code, selectedPeople);
      }
    }

    // ── Confirmation text: only what changes, per project ────────────────────
    const deltaBlocks: string[] = [];
    let hasRevoke = false;

    // Names inline, comma-separated: a bullet per person turned a 20-delegate
    // change into a screenful.
    const nameList = (names: string[]): string => names.join(', ');

    for (const [projectCode, desired] of desiredByProject) {
      const entry = allProjects.find(p => p.project_code === projectCode);
      const currentIds = new Set((entry?.delegates ?? []).map(d => d.delegate_user_id));
      const desiredIds = new Set(desired.map(p => p.delegate_user_id));

      const added = desired.filter(p => !currentIds.has(p.delegate_user_id));
      const removed = (entry?.delegates ?? []).filter(d => !desiredIds.has(d.delegate_user_id));
      if (removed.length > 0) hasRevoke = true;

      const projectName =
        entry?.project_name ??
        selectedProjects.find(p => p.project_code === projectCode)?.project_name ??
        null;

      // Lead line, then ONE blank line, then the changes — no other spacing.
      const sections: string[] = [
        `<div>The following changes were made in project <strong>${projectCode}</strong>${
          projectName ? ` — ${projectName}` : ''
        }</div>`,
        '<div>&nbsp;</div>'
      ];
      if (added.length > 0) {
        sections.push(`<div><strong>Added:</strong> ${nameList(added.map(p => p.name))}</div>`);
      }
      if (removed.length > 0) {
        sections.push(`<div><strong>Removed:</strong> ${nameList(removed.map(d => d.name))}</div>`);
      }
      if (added.length === 0 && removed.length === 0) {
        sections.push('<div>No changes for this project.</div>');
      }
      deltaBlocks.push(sections.join(''));
    }

    // alert-detail-left opts this detail out of the dialog's centred text.
    const deltaDetail =
      `<div class="alert-detail-left">` +
      deltaBlocks.join('<div>&nbsp;</div>') +
      (!isPersonMode && selectedPeople.length === 0 && hasRevoke
        ? '<div>&nbsp;</div><div><strong>No people selected — every delegate above loses access.</strong></div>'
        : '') +
      `</div>`;

    // POST payload: the same desired lists the confirmation just described.
    const assignments = Array.from(desiredByProject, ([project_id, delegates]) => ({
      project_id,
      delegates: delegates.map(p => ({ delegate_user_id: p.delegate_user_id }))
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
    // A search typed into either dropdown must not survive into the next opening.
    this.pickers?.forEach(picker => picker.clearSearchFilter());
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
