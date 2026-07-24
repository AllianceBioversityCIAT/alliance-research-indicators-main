// @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (T-BIL-CAM-03, T-BIL-CAM-05)
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from '@services/clarity.service';
import {
  BilateralMappingListMeta,
  BilateralMappingSource,
  BilateralProjectMapping,
  ClarisaBilateralProjectOption
} from '@interfaces/bilateral/bilateral-project-mapping.interface';

type ActiveFilter = 'all' | 'active' | 'inactive';
type DialogMode = 'create' | 'edit';

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

const ACTIVE_OPTIONS: SelectOption<ActiveFilter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

type SourceFilter = 'all' | BilateralMappingSource;

const SOURCE_OPTIONS: SelectOption<SourceFilter>[] = [
  { label: 'All sources', value: 'all' },
  { label: 'Manual', value: 'MANUAL' },
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
    TextareaModule
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

  // --- Filter / pagination state ---
  readonly search = signal('');
  readonly activeFilter = signal<ActiveFilter>('active');
  readonly sourceFilter = signal<SourceFilter>('all');
  readonly page = signal(1);
  readonly limit = signal(20);

  // --- Option lists for filter dropdowns ---
  readonly activeOptions = ACTIVE_OPTIONS;
  readonly sourceOptions = SOURCE_OPTIONS;

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

  // --- Computed save-enable logic ---

  /** CREATE: both pickers must be set (AC-05.3). EDIT: at least one field changed (AC-06.4). */
  readonly canSave = computed(() => {
    if (this.saving()) return false;
    if (this.dialogMode() === 'create') {
      return !!this.selectedAgreement() && this.selectedProjectId() !== null;
    }
    // Edit: dirty check against snapshot
    const snap = this.editSnapshot;
    if (!snap) return false;
    return (
      this.selectedProjectId() !== snap.clarisa_project_id ||
      this.notes() !== snap.notes
    );
  });

  ngOnInit(): void {
    // Debounce the search input stream (AC-04.1)
    this.searchInput$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(term => {
        this.search.set(term);
        this.page.set(1);
        void this.load();
      });

    // Lazy server-side AGRESSO search: debounce keystrokes → server fetch → replace options.
    // distinctUntilChanged avoids repeat calls for identical terms (e.g. focus/blur noise).
    this.agressoFilter$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.agressoOptionsLoading.set(true);
        void this.service.loadAgressoOptions(term || undefined).then(opts => {
          this.agressoOptions.set(opts);
          this.agressoOptionsLoading.set(false);
        });
      });

    // Lazy server-side CLARISA search: same debounce pattern.
    this.clarisaFilter$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.clarisaOptionsLoading.set(true);
        void this.service.loadClarisaProjectOptions(term || undefined).then(opts => {
          this.clarisaOptions.set(opts);
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

    const af = this.activeFilter();
    const sf = this.sourceFilter();

    const result = await this.service.list({
      page: this.page(),
      limit: this.limit(),
      ...(this.search().trim() ? { search: this.search().trim() } : {}),
      ...(af !== 'all' ? { is_active: af === 'active' } : {}),
      ...(sf !== 'all' ? { source: sf as BilateralMappingSource } : {})
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

  onActiveFilterChange(value: ActiveFilter): void {
    this.activeFilter.set(value);
    this.page.set(1);
    void this.load();
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

  /** Returns true when the confidence score column should be shown for a row. */
  showConfidence(row: BilateralProjectMapping): boolean {
    return row.source !== 'MANUAL';
  }

  /** Human-readable source label for display in the table badge. */
  sourceLabel(source: BilateralMappingSource): string {
    switch (source) {
      case 'MANUAL': return 'Manual';
      case 'AI_SUGGESTED': return 'AI Suggested';
      case 'AI_AUTO': return 'AI Auto';
    }
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
    this.dialogOpen.set(true);
    void this.loadPickerOptions();
  }

  /** Closes the dialog and resets transient state. */
  closeDialog(): void {
    this.dialogOpen.set(false);
    this.saveError.set(null);
    this.editSnapshot = null;
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
    const [agresso, clarisa] = await Promise.all([
      this.service.loadAgressoOptions(),
      this.service.loadClarisaProjectOptions()
    ]);
    this.agressoOptions.set(agresso);
    this.clarisaOptions.set(clarisa);
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

  /** Dispatches create or update depending on the current dialog mode. */
  async onSave(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.saveError.set(null);

    if (this.dialogMode() === 'create') {
      await this.handleCreate();
    } else {
      await this.handleUpdate();
    }

    this.saving.set(false);
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
      // AC-05.4: close, toast, reload, telemetry
      this.closeDialog();
      this.actions.showToast({ severity: 'success', summary: 'Bilateral Mapping', detail: 'Mapping created' });
      void this.load();
      this.clarity.trackEvent('bilateral.mapping.created', {
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

  // ── Deactivate action (T-BIL-CAM-06) ─────────────────────────────────────

  /**
   * Shows a confirmation alert before deactivating (AC-07.2).
   * Only offered for rows where is_active === true; a no-op call on an
   * inactive row is safe (AC-07.3) but the button is hidden by the template.
   */
  requestDeactivate(row: BilateralProjectMapping): void {
    this.actions.showGlobalAlert({
      severity: 'confirm',
      summary: 'Deactivate mapping',
      detail: `Deactivate the mapping for agreement ${row.agresso_agreement_id}?`,
      confirmCallback: { label: 'Deactivate', event: () => { void this.confirmDeactivate(row); } },
      cancelCallback: { label: 'Cancel' }
    });
  }

  /**
   * Executes the deactivate request after the user confirmed (AC-07.1).
   * Updates the row in-place on success (AC-07.1), shows a success toast,
   * fires the telemetry event (design §10).
   * On failure shows an error toast — idempotent-friendly (AC-07.3).
   */
  async confirmDeactivate(row: BilateralProjectMapping): Promise<void> {
    const result = await this.service.deactivate(row.id);

    if (result.ok) {
      // AC-07.1: update the row's is_active to false in-place in the rows() signal
      this.rows.update(current =>
        current.map(r => (r.id === row.id ? { ...r, is_active: false } : r))
      );
      this.actions.showToast({
        severity: 'success',
        summary: 'Bilateral Mapping',
        detail: 'Mapping deactivated'
      });
      // Design §10 telemetry
      this.clarity.trackEvent('bilateral.mapping.deactivated', {
        mapping_id: row.id as unknown as string,
        agresso_agreement_id: row.agresso_agreement_id as unknown as string
      });
      return;
    }

    // AC-07.3: surface the error without crashing; idempotent-friendly
    this.actions.showToast({
      severity: 'error',
      summary: 'Bilateral Mapping',
      detail: result.message || 'Could not deactivate mapping. Please try again.'
    });
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
      this.closeDialog();
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
