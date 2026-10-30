// @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (T-BIL-CAM-03, T-BIL-CAM-05)
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements (T-BTE-03 / T-BTE-04 / R-BTE-001..005)
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from '@services/clarity.service';
import {
  BilateralMappingListMeta,
  BilateralMappingSource,
  BilateralProjectMapping,
  ClarisaBilateralProjectOption
} from '@interfaces/bilateral/bilateral-project-mapping.interface';
import { BilateralMappingCoverageComponent } from './components/bilateral-mapping-coverage/bilateral-mapping-coverage.component';
import { AutomapperDialogComponent } from './components/automapper-dialog/automapper-dialog.component';

export type MappingStatusFilter = 'all' | 'mapped' | 'pending' | 'inactive';
type DialogMode = 'create' | 'edit';

/** Values the confirmation acts on. Captured when Save is pressed, not read again later. */
interface StatusChangePlan {
  id: number;
  agreementId: string;
  target: 'activate' | 'deactivate';
  /** Trimmed justification. Always set on deactivate; set on activate only when non-blank. */
  justification?: string;
  /** Present only when Notes differ from the snapshot. */
  notes?: string;
  /** Present only on activate, and only when the project differs from the snapshot. */
  clarisa_project_id?: number;
}

/** Option shape used by p-select in filter dropdowns. */
interface SelectOption<T extends string> {
  label: string;
  value: T;
}

/** AGRESSO contract option as returned by the service */
interface AgressoOption {
  agreement_id: string;
  description: string;
}

const NOTES_MAX_LENGTH = 500;

export const STATUS_OPTIONS: SelectOption<MappingStatusFilter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Mapped', value: 'mapped' },
  { label: 'Pending', value: 'pending' },
  { label: 'Inactive', value: 'inactive' }
];

type SourceFilter = 'all' | BilateralMappingSource;

const SOURCE_OPTIONS: SelectOption<SourceFilter>[] = [
  { label: 'All sources', value: 'all' },
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Derived', value: 'DERIVED' },
  { label: 'AI Suggested', value: 'AI_SUGGESTED' },
  { label: 'AI Auto', value: 'AI_AUTO' }
];

@Component({
  selector: 'app-bilateral-mapping',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    TableModule,
    PaginatorModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    DialogModule,
    TextareaModule,
    ToggleSwitchModule,
    PopoverModule,
    TooltipModule,
    BilateralMappingCoverageComponent,
    AutomapperDialogComponent
  ],
  templateUrl: './bilateral-mapping.component.html',
  styleUrl: './bilateral-mapping.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class BilateralMappingComponent implements OnInit, OnDestroy {
  private readonly service = inject(BilateralMappingService);
  private readonly actions = inject(ActionsService);
  private readonly clarity = inject(ClarityService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();
  /** Debounced AGRESSO filter stream — pushes a server search on each keystroke. */
  readonly agressoFilter$ = new Subject<string>();
  /** Debounced CLARISA filter stream — pushes a server search on each keystroke. */
  readonly clarisaFilter$ = new Subject<string>();

  // --- List state ---
  readonly rows = signal<BilateralProjectMapping[]>([]);
  readonly meta = signal<BilateralMappingListMeta | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  // --- Filter / pagination / sort state (R-BTE-003, R-BTE-004) ---
  readonly search = signal('');
  readonly statusFilter = signal<MappingStatusFilter>('all');
  readonly sourceFilter = signal<SourceFilter>('all');
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly sortField = signal<string>('updated_at');
  readonly sortOrder = signal<number>(-1);

  // --- Option lists for filter dropdowns ---
  readonly statusOptions = STATUS_OPTIONS;
  readonly sourceOptions = SOURCE_OPTIONS;

  // Backward compatibility alias for legacy tests
  get activeFilter() {
    return this.statusFilter;
  }
  get activeOptions() {
    return this.statusOptions;
  }

  // --- Dialog state (T-BIL-CAM-05) ---
  readonly dialogOpen = signal(false);
  readonly dialogMode = signal<DialogMode>('create');
  readonly editingId = signal<number | null>(null);

  // Picker options
  readonly agressoOptions = signal<AgressoOption[]>([]);
  readonly clarisaOptions = signal<ClarisaBilateralProjectOption[]>([]);
  readonly optionsLoading = signal(false);
  /** True while a debounced AGRESSO server search is in flight. */
  readonly agressoOptionsLoading = signal(false);
  /** True while a debounced CLARISA server search is in flight. */
  readonly clarisaOptionsLoading = signal(false);

  // Form field signals
  readonly selectedAgreement = signal<string | null>(null);
  readonly selectedProjectId = signal<number | null>(null);
  readonly notes = signal('');

  // For edit: snapshot of values at the time the dialog opens — used to compute dirty state
  private editSnapshot: { clarisa_project_id: number | null; notes: string } | null = null;

  // The selected CLARISA project object (for science-program preview)
  readonly selectedProject = computed(() => {
    const id = this.selectedProjectId();
    if (id === null) return null;
    return this.clarisaOptions().find(p => p.id === id) ?? null;
  });

  // For EDIT mode: AGRESSO agreement is read-only; shown as text, not picker
  readonly editingAgreementId = signal<string | null>(null);

  // Saving state
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** Notes length cap (mirrors JUSTIFICATION_MAX_LENGTH pattern). */
  readonly notesMaxLength = NOTES_MAX_LENGTH;

  // Status lives in the Edit modal. initialActive is the only record of the row's
  // status at open — editSnapshot stays project + notes.
  readonly statusActive = signal(true);
  readonly initialActive = signal<boolean | null>(null);
  readonly justification = signal('');
  /** Last stored status_justification, shown read-only. Empty when the row has none. */
  readonly lastJustification = signal('');
  readonly confirmPending = signal(false);
  /**
   * CLARISA pick stashed while the admin is inactivating.
   * `undefined` means nothing is stashed; `null` is a cleared picker.
   */
  private pickedProjectId: number | null | undefined = undefined;
  /**
   * Project shown on the row when Edit opened. Kept in the picker options when the
   * loaded cohort does not include it, so the select can render its label.
   */
  private currentProjectOption: ClarisaBilateralProjectOption | null = null;

  readonly statusChanged = computed(
    () => this.dialogMode() === 'edit' && this.initialActive() !== null && this.statusActive() !== this.initialActive()
  );
  readonly isInactivating = computed(() => this.statusChanged() && !this.statusActive());

  // --- Computed save-enable logic ---

  /**
   * CREATE: both pickers must be set (AC-05.3).
   * EDIT without a status change: at least one field changed (AC-06.4); a missing snapshot blocks only this row.
   * EDIT inactivating: a non-blank justification. EDIT activating: a project must stay selected.
   * The button also stays disabled while a confirmation or a request is in flight.
   */
  readonly canSave = computed(() => !this.saving() && !this.confirmPending() && this.formSavable());

  ngOnInit(): void {
    // Debounce the search input stream (AC-04.1)
    this.searchInput$.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(term => {
      this.search.set(term);
      this.page.set(1);
      void this.load();
    });

    // Lazy server-side AGRESSO search: debounce keystrokes → server fetch → replace options.
    // distinctUntilChanged avoids repeat calls for identical terms (e.g. focus/blur noise).
    this.agressoFilter$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(term => {
      this.agressoOptionsLoading.set(true);
      void this.service.loadAgressoOptions(term || undefined).then(opts => {
        this.agressoOptions.set(opts);
        this.agressoOptionsLoading.set(false);
      });
    });

    // Lazy server-side CLARISA search: same debounce pattern.
    this.clarisaFilter$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(term => {
      this.clarisaOptionsLoading.set(true);
      void this.service.loadClarisaProjectOptions(term || undefined).then(opts => {
        this.clarisaOptions.set(this.withCurrentProject(opts));
        this.clarisaOptionsLoading.set(false);
      });
    });

    void this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.rows.set([]);

    const sf = this.statusFilter();
    const src = this.sourceFilter();

    const result = await this.service.list({
      page: this.page(),
      limit: this.limit(),
      ...(this.search().trim() ? { search: this.search().trim() } : {}),
      ...(sf !== 'all' ? { status: sf } : {}),
      ...(src !== 'all' ? { source: src as BilateralMappingSource } : {})
    });

    // NF-06: always resolve to a terminal state — never leave spinner forever.
    if (result === null) {
      this.loadError.set(true);
    } else {
      this.rows.set(result.items);
      this.meta.set(result.meta);
    }
    this.loading.set(false);
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  onStatusFilterChange(value: MappingStatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
    void this.load();
  }

  onActiveFilterChange(value: string | MappingStatusFilter): void {
    const val = (value === 'active' ? 'mapped' : value) as MappingStatusFilter;
    this.onStatusFilterChange(val);
  }

  onSourceFilterChange(value: SourceFilter): void {
    this.sourceFilter.set(value);
    this.page.set(1);
    void this.load();
  }

  onPageChange(event: PaginatorState): void {
    // PrimeNG paginator is zero-based; backend is 1-based (AC-03.2)
    this.page.set((event.page ?? 0) + 1);
    void this.load();
  }

  // ── Column Sorting (R-BTE-004) ─────────────────────────────────────────────
  onSort(event: { data?: BilateralProjectMapping[]; field?: string; order?: number }): void {
    if (!event.data || !event.field || !event.order) return;
    const field = event.field as keyof BilateralProjectMapping;
    const order = event.order;
    event.data.sort((data1: BilateralProjectMapping, data2: BilateralProjectMapping) => {
      let val1 = data1[field] ?? '';
      let val2 = data2[field] ?? '';
      if (typeof val1 === 'string') val1 = val1.toLowerCase();
      if (typeof val2 === 'string') val2 = val2.toLowerCase();
      if (val1 < val2) return -1 * order;
      if (val1 > val2) return 1 * order;
      return 0;
    });
  }

  /** Human-readable source label for display in the table badge. */
  sourceLabel(source: BilateralMappingSource): string {
    switch (source) {
      case 'MANUAL':
        return 'Manual';
      case 'DERIVED':
        return 'Derived';
      case 'AI_SUGGESTED':
        return 'AI Suggested';
      case 'AI_AUTO':
        return 'AI Auto';
      case 'UNMAPPED':
        return 'Unmapped';
    }
  }

  // ── Automapper dialog state & handlers (T-06 / R-APM-007) ────────────────
  readonly automapperDialogOpen = signal(false);
  /** Set from the coverage strip once it loads. Null until then — no literal fallback. */
  readonly reportingYear = signal<number | null>(null);

  /** Child coverage strip viewChild for programmatic refresh on automapper apply. */
  readonly coverageComponent = viewChild(BilateralMappingCoverageComponent);

  onReportingYear(year: number): void {
    if (typeof year === 'number' && Number.isFinite(year)) {
      this.reportingYear.set(year);
    }
  }

  openAutomapperDialog(): void {
    this.automapperDialogOpen.set(true);
  }

  onAutomapperApplied(): void {
    void this.load();
    void this.coverageComponent()?.loadCoverage();
  }

  // ── Dialog / form (T-BIL-CAM-05) ──────────────────────────────────────────

  /** Opens the dialog in CREATE mode and loads picker options (NF-01 / NF-06). */
  openCreateDialog(): void {
    this.dialogMode.set('create');
    this.editingId.set(null);
    this.editingAgreementId.set(null);
    this.selectedAgreement.set(null);
    this.selectedProjectId.set(null);
    this.notes.set('');
    this.saveError.set(null);
    this.editSnapshot = null;
    this.currentProjectOption = null;
    this.resetStatusDraft(null);
    this.dialogOpen.set(true);
    void this.loadPickerOptions();
  }

  /** Opens create dialog prefilled with project info when clicking "+ Map" on a pending row. */
  openMapDialogForPending(row: BilateralProjectMapping): void {
    this.dialogMode.set('create');
    this.editingId.set(null);
    this.editingAgreementId.set(null);
    const agressoId =
      row.agresso_agreement_id && row.agresso_agreement_id !== '—' && !row.agresso_agreement_id.includes('Derived') ? row.agresso_agreement_id : null;
    this.selectedAgreement.set(agressoId);
    this.selectedProjectId.set(row.clarisa_project_id);
    this.notes.set('');
    this.saveError.set(null);
    this.editSnapshot = null;
    this.currentProjectOption = null;
    this.resetStatusDraft(null);
    this.dialogOpen.set(true);
    void this.loadPickerOptions();
  }

  /** Opens the dialog in EDIT mode pre-filled with the row's values (AC-06.1). */
  openEditDialog(row: BilateralProjectMapping): void {
    this.dialogMode.set('edit');
    this.editingId.set(row.id);
    this.editingAgreementId.set(row.agresso_agreement_id);
    this.selectedAgreement.set(row.agresso_agreement_id);
    this.selectedProjectId.set(row.clarisa_project_id);
    this.notes.set(row.notes ?? '');
    this.saveError.set(null);
    // Snapshot for dirty detection (AC-06.4)
    this.editSnapshot = {
      clarisa_project_id: row.clarisa_project_id,
      notes: row.notes ?? ''
    };
    this.currentProjectOption = this.projectOptionFromRow(row);
    this.resetStatusDraft(row.is_active);
    this.lastJustification.set(row.status_justification?.trim() ?? '');
    this.dialogOpen.set(true);
    void this.loadPickerOptions();
  }

  /**
   * Ignores a hide request while a confirmation or a save is in flight.
   * A false value at any other time closes the dialog (one-way visible binding).
   */
  onDialogVisibleChange(visible: boolean): void {
    if (visible) return;
    if (this.confirmPending() || this.saving()) return;
    this.finishClose();
  }

  /** Closes the dialog and resets transient state. No-op while a confirmation or save is in flight. */
  closeDialog(): void {
    if (this.confirmPending() || this.saving()) return;
    this.finishClose();
  }

  private finishClose(): void {
    this.dialogOpen.set(false);
    this.saveError.set(null);
    this.editSnapshot = null;
    this.currentProjectOption = null;
    this.lastJustification.set('');
  }

  /** Row fields the picker can label even when the CLARISA cohort omits this project. */
  private projectOptionFromRow(row: BilateralProjectMapping): ClarisaBilateralProjectOption {
    const shortName = row.clarisa_project_short_name?.trim() || `Project ${row.clarisa_project_id}`;
    const fullName = row.clarisa_project_full_name?.trim();
    const externalCode = row.clarisa_external_code?.trim();
    return {
      id: row.clarisa_project_id,
      short_name: shortName,
      ...(fullName ? { full_name: fullName } : {}),
      ...(externalCode ? { external_code: externalCode } : {})
    };
  }

  private withCurrentProject(options: ClarisaBilateralProjectOption[]): ClarisaBilateralProjectOption[] {
    const current = this.currentProjectOption;
    if (!current || options.some(option => option.id === current.id)) return options;
    return [current, ...options];
  }

  private resetStatusDraft(initial: boolean | null): void {
    this.confirmPending.set(false);
    this.pickedProjectId = undefined;
    this.justification.set('');
    this.lastJustification.set('');
    this.initialActive.set(initial);
    this.statusActive.set(initial ?? true);
  }

  /**
   * Dirty / required-field check. confirmPending and saving are not included here so
   * onSave's re-entry guard is what stops a second confirmation.
   */
  private formSavable(): boolean {
    if (this.dialogMode() === 'create') {
      return !!this.selectedAgreement() && this.selectedProjectId() !== null;
    }
    if (this.statusChanged()) {
      if (this.isInactivating()) return this.justification().trim().length > 0;
      return this.selectedProjectId() !== null;
    }
    const snap = this.editSnapshot;
    if (!snap) return false;
    return this.selectedProjectId() !== snap.clarisa_project_id || this.notes() !== snap.notes;
  }

  onStatusToggle(value: boolean): void {
    const initial = this.initialActive();
    const was = this.statusActive();
    const enteringInactivating = initial === true && was === true && value === false;
    const leavingInactivating = initial === true && was === false && value === true;
    this.statusActive.set(value);

    if (enteringInactivating) {
      this.pickedProjectId = this.selectedProjectId();
      this.selectedProjectId.set(this.editSnapshot?.clarisa_project_id ?? null);
    } else if (leavingInactivating && this.pickedProjectId !== undefined) {
      this.selectedProjectId.set(this.pickedProjectId);
      this.pickedProjectId = undefined;
    }

    if (was !== value) {
      this.justification.set('');
    }
  }

  onJustificationInput(value: string): void {
    const clipped = value.length > NOTES_MAX_LENGTH ? value.slice(0, NOTES_MAX_LENGTH) : value;
    this.justification.set(clipped);
  }

  private blurFocus(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }

  private focusSaveButton(): void {
    queueMicrotask(() => {
      const btn = document.querySelector('[data-testid="dialog-save-btn"]');
      if (btn instanceof HTMLElement) btn.focus();
    });
  }

  /**
   * Lazy-loads the first 50 options for each picker when the dialog opens (NF-01).
   * Also resets per-picker loading flags so stale indicators from a previous open
   * don't bleed into the new session.
   */
  private async loadPickerOptions(): Promise<void> {
    this.optionsLoading.set(true);
    this.agressoOptionsLoading.set(false);
    this.clarisaOptionsLoading.set(false);
    const [agresso, clarisa] = await Promise.all([this.service.loadAgressoOptions(), this.service.loadClarisaProjectOptions()]);
    this.agressoOptions.set(agresso);
    this.clarisaOptions.set(this.withCurrentProject(clarisa));
    this.optionsLoading.set(false);
  }

  /** Handles textarea input and clips at max length (mirrors JUSTIFICATION_MAX_LENGTH pattern). */
  onNotesInput(value: string): void {
    const clipped = value.length > NOTES_MAX_LENGTH ? value.slice(0, NOTES_MAX_LENGTH) : value;
    this.notes.set(clipped);
  }

  /**
   * Called by p-select (onFilter) on the AGRESSO picker.
   * Pushes the typed term into the debounced server-search stream.
   * Empty string → reload the initial 50 (no query param sent to API).
   */
  onAgressoFilter(term: string): void {
    this.agressoFilter$.next(term ?? '');
  }

  /**
   * Called by p-select (onFilter) on the CLARISA picker.
   * Pushes the typed term into the debounced server-search stream.
   */
  onClarisaFilter(term: string): void {
    this.clarisaFilter$.next(term ?? '');
  }

  /** Human-readable label for an AGRESSO option (shown in the picker). */
  agressoOptionLabel(opt: AgressoOption): string {
    return opt.description ? `${opt.agreement_id} — ${opt.description}` : opt.agreement_id;
  }

  /** Human-readable label for a CLARISA project option (shown in the picker). */
  clarisaOptionLabel(opt: ClarisaBilateralProjectOption): string {
    const code = opt?.external_code?.trim() || opt?.short_name?.trim() || '';
    const title = opt?.full_name?.trim() || '';

    if (!title) return code;
    if (!code) return title;
    if (code.toLowerCase() === title.toLowerCase()) return title;
    return `${code} — ${title}`;
  }

  /** Dispatches create, update, or a confirmed status change depending on the dialog. */
  async onSave(): Promise<void> {
    if (this.confirmPending() || this.saving()) return;
    if (!this.formSavable()) return;

    if (this.dialogMode() === 'edit' && this.statusChanged()) {
      this.openStatusConfirmation();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    if (this.dialogMode() === 'create') {
      await this.handleCreate();
    } else {
      await this.handleUpdate();
    }

    this.saving.set(false);
  }

  private openStatusConfirmation(): void {
    const id = this.editingId();
    if (id === null) return;

    const activating = this.statusActive();
    const notesEdited = this.editSnapshot !== null && this.notes() !== this.editSnapshot.notes;
    const projectId = this.selectedProjectId();
    const projectChanged = activating && this.editSnapshot !== null && projectId !== null && projectId !== this.editSnapshot.clarisa_project_id;
    const trimmedJustification = this.justification().trim();
    const plan: StatusChangePlan = {
      id,
      agreementId: this.editingAgreementId() ?? '',
      target: activating ? 'activate' : 'deactivate',
      ...(activating ? (trimmedJustification.length > 0 ? { justification: trimmedJustification } : {}) : { justification: trimmedJustification }),
      ...(notesEdited ? { notes: this.notes().trim() } : {}),
      ...(projectChanged && projectId !== null ? { clarisa_project_id: projectId } : {})
    };
    this.confirmPending.set(true);
    this.blurFocus();

    const verb = activating ? 'Activate' : 'Inactivate';
    const participle = activating ? 'activated' : 'inactivated';
    this.actions.showGlobalAlert({
      severity: activating ? 'confirm' : 'secondary',
      summary: `${verb} mapping`,
      detail: `The mapping for agreement ${plan.agreementId} will be ${participle}. Continue?`,
      hideCloseButton: true,
      confirmCallback: {
        label: verb,
        event: () => {
          void this.applyStatusChange(plan);
        }
      },
      cancelCallback: {
        label: 'Cancel',
        event: () => {
          this.confirmPending.set(false);
          this.focusSaveButton();
        }
      }
    });
  }

  private async applyStatusChange(plan: StatusChangePlan): Promise<void> {
    this.confirmPending.set(false);
    this.saving.set(true);
    this.saveError.set(null);

    try {
      const activateOpts = this.activateOptions(plan);
      const result =
        plan.target === 'deactivate'
          ? await this.service.deactivate(plan.id, plan.justification ?? '', ...(plan.notes !== undefined ? [plan.notes] : []))
          : activateOpts
            ? await this.service.activate(plan.id, activateOpts)
            : await this.service.activate(plan.id);

      if (result.ok) {
        this.saving.set(false);
        this.finishClose();
        this.actions.showToast({
          severity: 'success',
          summary: 'Bilateral Mapping',
          detail: plan.target === 'deactivate' ? 'Mapping inactivated' : 'Mapping activated'
        });
        void this.load();
        void this.coverageComponent()?.loadCoverage();
        this.clarity.trackEvent(plan.target === 'deactivate' ? 'bilateral.mapping.deactivated' : 'bilateral.mapping.activated', {
          mapping_id: plan.id as unknown as string,
          agresso_agreement_id: plan.agreementId as unknown as string
        });
        return;
      }

      this.saveError.set(result.message || 'An error occurred. Please try again.');
      this.focusSaveButton();
    } finally {
      this.saving.set(false);
    }
  }

  private activateOptions(plan: StatusChangePlan): { notes?: string; clarisa_project_id?: number; justification?: string } | undefined {
    if (plan.notes === undefined && plan.clarisa_project_id === undefined && plan.justification === undefined) return undefined;
    return {
      ...(plan.notes !== undefined ? { notes: plan.notes } : {}),
      ...(plan.clarisa_project_id !== undefined ? { clarisa_project_id: plan.clarisa_project_id } : {}),
      ...(plan.justification !== undefined ? { justification: plan.justification } : {})
    };
  }

  /** Executes the POST create flow (AC-05.4 / AC-05.5 / AC-05.6). */
  private async handleCreate(): Promise<void> {
    const agresso_agreement_id = this.selectedAgreement();
    const clarisa_project_id = this.selectedProjectId();

    // Guarded at canSave, but TypeScript needs the narrowing
    if (!agresso_agreement_id || clarisa_project_id === null) return;

    const result = await this.service.create({
      agresso_agreement_id,
      clarisa_project_id,
      ...(this.notes().trim() ? { notes: this.notes().trim() } : {})
    });

    if (result.ok) {
      // R-APM-006: the response distinguishes created vs updated. A missing outcome
      // stays on the created toast so older payloads keep the previous wording.
      const updated = result.data.outcome === 'updated';
      this.finishClose();
      this.actions.showToast({
        severity: 'success',
        summary: 'Bilateral Mapping',
        detail: updated ? 'Mapping updated' : 'Mapping created'
      });
      void this.load();
      this.clarity.trackEvent(updated ? 'bilateral.mapping.updated' : 'bilateral.mapping.created', {
        agresso_agreement_id: agresso_agreement_id as unknown as string,
        clarisa_project_id: clarisa_project_id as unknown as string
      });
      return;
    }

    // AC-05.5: 409 conflict — keep dialog open, surface message from result.message
    // (already resolved to errorDetail.errors by the service; NOT errorDetail.description)
    // AC-05.6: 400 validation — same inline surface
    this.saveError.set(result.message || 'An error occurred. Please try again.');
  }

  /** Executes the PATCH update flow (AC-06.2 / AC-06.3). */
  private async handleUpdate(): Promise<void> {
    const id = this.editingId();
    if (id === null || !this.editSnapshot) return;

    // Send only changed fields (AC-06.2)
    const body: { clarisa_project_id?: number; notes?: string } = {};
    if (this.selectedProjectId() !== this.editSnapshot.clarisa_project_id && this.selectedProjectId() !== null) {
      body['clarisa_project_id'] = this.selectedProjectId()!;
    }
    if (this.notes() !== this.editSnapshot.notes) {
      body['notes'] = this.notes().trim();
    }

    const result = await this.service.update(id, body);

    if (result.ok) {
      // AC-06.2: close, toast, reload, telemetry
      this.finishClose();
      this.actions.showToast({ severity: 'success', summary: 'Bilateral Mapping', detail: 'Mapping updated' });
      void this.load();
      const projectId = this.selectedProjectId();
      this.clarity.trackEvent('bilateral.mapping.updated', {
        mapping_id: id as unknown as string,
        clarisa_project_id: (projectId ?? '') as unknown as string
      });
      return;
    }

    // AC-06.3: 400 — surface result.message inline (PATCH never returns 409)
    this.saveError.set(result.message || 'An error occurred. Please try again.');
  }
}
