// @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (T-BIL-CAM-03, T-BIL-CAM-05, T-BIL-CAM-06)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import BilateralMappingComponent from './bilateral-mapping.component';
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from '@services/clarity.service';
import {
  BilateralMappingListPage,
  BilateralProjectMapping,
  ClarisaBilateralProjectOption
} from '@interfaces/bilateral/bilateral-project-mapping.interface';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { mockBilateralMapping, mockBilateralMappingListPage } from 'src/app/testing/bilateral-project-mapping.fixture';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<BilateralProjectMapping> = {}): BilateralProjectMapping {
  return {
    id: 1,
    agresso_agreement_id: 'A511',
    clarisa_project_id: 22,
    clarisa_project_short_name: 'ACIAR',
    source: 'MANUAL',
    confidence_score: null,
    is_active: true,
    notes: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
    created_by: null,
    updated_by: null,
    ...overrides
  };
}

function makePage(items: BilateralProjectMapping[], total = items.length): BilateralMappingListPage {
  return {
    items,
    meta: { total, page: 1, limit: 20, totalPages: Math.ceil(total / 20) }
  };
}

const AGRESSO_OPTIONS = [
  { agreement_id: 'A511', description: 'ACIAR Bilateral' },
  { agreement_id: 'D527', description: 'DFAT Bilateral' }
];

const CLARISA_OPTIONS: ClarisaBilateralProjectOption[] = [
  {
    id: 22,
    short_name: 'ACIAR',
    source_of_funding: 'BILATERAL',
    science_programs: [{ code: 'SP1', name: 'Food Systems', allocation: 60 }]
  },
  {
    id: 99,
    short_name: 'USAID',
    source_of_funding: 'BILATERAL',
    science_programs: []
  }
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function delayMs(ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BilateralMappingComponent', () => {
  let fixture: ComponentFixture<BilateralMappingComponent>;
  let component: BilateralMappingComponent;
  let mockService: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
    loadAgressoOptions: jest.Mock;
    loadClarisaProjectOptions: jest.Mock;
  };
  let mockActions: { showToast: jest.Mock; showGlobalAlert: jest.Mock };
  let mockClarity: { trackEvent: jest.Mock };

  beforeEach(async () => {
    mockService = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      loadAgressoOptions: jest.fn().mockResolvedValue(AGRESSO_OPTIONS),
      loadClarisaProjectOptions: jest.fn().mockResolvedValue(CLARISA_OPTIONS)
    };
    mockActions = { showToast: jest.fn(), showGlobalAlert: jest.fn() };
    mockClarity = { trackEvent: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [BilateralMappingComponent],
      providers: [
        { provide: BilateralMappingService, useValue: mockService },
        { provide: ActionsService, useValue: mockActions },
        { provide: ClarityService, useValue: mockClarity }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralMappingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── T-BIL-CAM-09: Status filter defaults to "Active" ──────────────────────

  it('defaults activeFilter to "active" and issues the initial list with is_active=true (T-BIL-CAM-09)', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));

    // Before init the default signal value is already 'active'
    expect(component.activeFilter()).toBe('active');

    fixture.detectChanges(); // triggers ngOnInit → load()
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    // The very first list() call must carry is_active: true
    const firstCall = mockService.list.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(firstCall?.['is_active']).toBe(true);
    expect(component.activeFilter()).toBe('active');
  });

  // ── AC-03.1: renders table rows on successful list ─────────────────────────

  it('renders table rows on successful list response', async () => {
    const rows = [makeRow({ id: 1 }), makeRow({ id: 2, agresso_agreement_id: 'D527' })];
    mockService.list.mockResolvedValue(makePage(rows));

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(false);
    expect(component.rows()).toHaveLength(2);

    const tableRows = fixture.nativeElement.querySelectorAll('[data-testid="mapping-row"]');
    expect(tableRows.length).toBe(2);
  });

  // ── AC-03.4: renders empty state when items is empty ──────────────────────

  it('renders the empty state when list returns an empty items array', async () => {
    mockService.list.mockResolvedValue(makePage([]));

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.rows()).toHaveLength(0);
    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState).not.toBeNull();
    const table = fixture.nativeElement.querySelector('[data-testid="mappings-table"]');
    expect(table).toBeNull();
  });

  // ── AC-03.3: renders error state with Retry when list returns null ─────────

  it('renders the error state (with role="alert") when list returns null', async () => {
    mockService.list.mockResolvedValue(null);

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.loadError()).toBe(true);
    const errorBlock = fixture.nativeElement.querySelector('[data-testid="error-state"]');
    expect(errorBlock).not.toBeNull();
    expect(errorBlock.getAttribute('role')).toBe('alert');

    const retryBtn = fixture.nativeElement.querySelector('[data-testid="retry-button"]');
    expect(retryBtn).not.toBeNull();
  });

  it('Retry button calls load() again (AC-03.3)', async () => {
    mockService.list.mockResolvedValue(null);

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    // Now fix the service and click Retry
    const successPage = makePage([makeRow()]);
    mockService.list.mockResolvedValue(successPage);

    const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="retry-button"]');
    retryBtn.click();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.loadError()).toBe(false);
    expect(component.rows()).toHaveLength(1);
  });

  // ── AC-04.1: search resets to page 1 and calls service.list with search ───

  it('entering a search term resets page to 1 and calls list with the search param', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    // Simulate being on page 2
    component.page.set(2);
    mockService.list.mockClear();

    // Trigger via the subject (bypass debounce by calling the subject directly)
    const filteredPage = makePage([makeRow({ agresso_agreement_id: 'A511' })]);
    mockService.list.mockResolvedValue(filteredPage);

    // Push directly into the subject used for debounce
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (component as any).searchInput$.next('A511');
    await delayMs(350); // past the 300 ms debounce
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.page()).toBe(1);
    const lastCall = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.['search']).toBe('A511');
  });

  // ── AC-04.2: active-state filter resets page and maps to is_active boolean ─

  it('changing active filter to "active" calls list with is_active=true and resets page', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    component.page.set(3);
    mockService.list.mockClear();
    mockService.list.mockResolvedValue(makePage([makeRow()]));

    component.onActiveFilterChange('active');
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.page()).toBe(1);
    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args?.['is_active']).toBe(true);
  });

  it('changing active filter to "inactive" calls list with is_active=false', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    mockService.list.mockClear();
    mockService.list.mockResolvedValue(makePage([]));
    component.onActiveFilterChange('inactive');
    await fixture.whenStable();
    await delayMs(0);

    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args?.['is_active']).toBe(false);
  });

  it('changing active filter to "all" omits is_active from the query', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    mockService.list.mockClear();
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    component.onActiveFilterChange('all');
    await fixture.whenStable();
    await delayMs(0);

    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args?.['is_active']).toBeUndefined();
  });

  // ── AC-04.3: source filter resets page and maps source enum ───────────────

  it('changing source filter to "MANUAL" calls list with source=MANUAL and resets page', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    component.page.set(5);
    mockService.list.mockClear();
    mockService.list.mockResolvedValue(makePage([makeRow()]));

    component.onSourceFilterChange('MANUAL');
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.page()).toBe(1);
    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args?.['source']).toBe('MANUAL');
  });

  it('changing source filter to "AI_SUGGESTED" sends source=AI_SUGGESTED', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);

    mockService.list.mockClear();
    mockService.list.mockResolvedValue(makePage([]));
    component.onSourceFilterChange('AI_SUGGESTED');
    await fixture.whenStable();
    await delayMs(0);

    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args?.['source']).toBe('AI_SUGGESTED');
  });

  it('changing source filter to "all" omits source from the query', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);

    mockService.list.mockClear();
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    component.onSourceFilterChange('all');
    await fixture.whenStable();
    await delayMs(0);

    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args?.['source']).toBeUndefined();
  });

  // ── AC-04.4: search + both filters AND-compose into ONE list() query ───────

  it('composes search + is_active + source (plus page/limit) into a single list() call', async () => {
    // Seed via the shared fixture so the mapping wire-shape is canonical.
    mockService.list.mockResolvedValue(mockBilateralMappingListPage([mockBilateralMapping()]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    // Apply source and active filters, then a search term. Each change reloads;
    // the LAST call must carry all three predicates together (AND-composition).
    component.onSourceFilterChange('MANUAL');
    component.onActiveFilterChange('active');
    await fixture.whenStable();
    await delayMs(0);

    mockService.list.mockClear();
    mockService.list.mockResolvedValue(mockBilateralMappingListPage([mockBilateralMapping()]));

    (component as unknown as { searchInput$: { next: (v: string) => void } }).searchInput$.next('ACIAR');
    await delayMs(350); // past the 300 ms debounce
    await fixture.whenStable();
    await delayMs(0);

    const args = mockService.list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(args).toEqual({
      page: 1,
      limit: component.limit(),
      search: 'ACIAR',
      is_active: true,
      source: 'MANUAL'
    });
  });

  // ── AC-03.1: confidence column hidden when source === 'MANUAL' ─────────────

  describe('showConfidence() helper — AC-03.1', () => {
    it('returns false (hidden) when source is MANUAL', () => {
      expect(component.showConfidence(makeRow({ source: 'MANUAL' }))).toBe(false);
    });

    it('returns true (shown) when source is AI_SUGGESTED', () => {
      expect(component.showConfidence(makeRow({ source: 'AI_SUGGESTED', confidence_score: 0.85 }))).toBe(true);
    });

    it('returns true (shown) when source is AI_AUTO', () => {
      expect(component.showConfidence(makeRow({ source: 'AI_AUTO', confidence_score: 0.92 }))).toBe(true);
    });
  });

  // ── DOM: confidence cell hidden when source === MANUAL ────────────────────

  it('renders "—" in confidence cell (not the score) for MANUAL rows in the table', async () => {
    const manualRow = makeRow({ source: 'MANUAL', confidence_score: 0.99 });
    mockService.list.mockResolvedValue(makePage([manualRow]));

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    // The confidence-hidden element should be present, confidence-value absent
    const hidden = fixture.nativeElement.querySelector('[data-testid="confidence-hidden"]');
    const shown = fixture.nativeElement.querySelector('[data-testid="confidence-value"]');
    expect(hidden).not.toBeNull();
    expect(shown).toBeNull();
  });

  it('renders the confidence value for AI_SUGGESTED rows in the table', async () => {
    const aiRow = makeRow({ source: 'AI_SUGGESTED', confidence_score: 0.75 });
    mockService.list.mockResolvedValue(makePage([aiRow]));

    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    const shown = fixture.nativeElement.querySelector('[data-testid="confidence-value"]');
    const hidden = fixture.nativeElement.querySelector('[data-testid="confidence-hidden"]');
    expect(shown).not.toBeNull();
    expect(hidden).toBeNull();
  });

  // ── NF-06: loading signal resets to false on both success and failure ──────

  it('loading returns to false after a successful list call', async () => {
    mockService.list.mockResolvedValue(makePage([makeRow()]));
    fixture.detectChanges(); // triggers ngOnInit → load()
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
  });

  it('loading returns to false after a failed list call', async () => {
    mockService.list.mockResolvedValue(null);
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(true);
  });

  // ── sourceLabel() helper ───────────────────────────────────────────────────

  it('sourceLabel returns human-readable labels for all enum values', () => {
    expect(component.sourceLabel('MANUAL')).toBe('Manual');
    expect(component.sourceLabel('AI_SUGGESTED')).toBe('AI Suggested');
    expect(component.sourceLabel('AI_AUTO')).toBe('AI Auto');
  });

  // ── T-BIL-CAM-05: Dialog open / picker loading ────────────────────────────

  describe('openCreateDialog (AC-05.1 / AC-05.2)', () => {
    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
      fixture.detectChanges();
    });

    it('opens the dialog in create mode and loads picker options', async () => {
      component.openCreateDialog();
      expect(component.dialogOpen()).toBe(true);
      expect(component.dialogMode()).toBe('create');
      expect(component.optionsLoading()).toBe(true);

      await fixture.whenStable();
      await delayMs(0);
      fixture.detectChanges();

      expect(component.optionsLoading()).toBe(false);
      expect(mockService.loadAgressoOptions).toHaveBeenCalledTimes(1);
      expect(mockService.loadClarisaProjectOptions).toHaveBeenCalledTimes(1);
      expect(component.agressoOptions()).toEqual(AGRESSO_OPTIONS);
      expect(component.clarisaOptions()).toEqual(CLARISA_OPTIONS);
    });

    it('resets form fields when opening create dialog', () => {
      // Set some state first
      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);
      component.notes.set('some note');
      component.saveError.set('previous error');

      component.openCreateDialog();

      expect(component.selectedAgreement()).toBeNull();
      expect(component.selectedProjectId()).toBeNull();
      expect(component.notes()).toBe('');
      expect(component.saveError()).toBeNull();
      expect(component.editingId()).toBeNull();
    });
  });

  // ── AC-05.3: Save disabled until BOTH pickers are set ─────────────────────

  describe('canSave — CREATE mode (AC-05.3)', () => {
    beforeEach(() => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      component.openCreateDialog();
    });

    it('is false when neither picker is set', () => {
      expect(component.canSave()).toBe(false);
    });

    it('is false when only AGRESSO is set', () => {
      component.selectedAgreement.set('A511');
      expect(component.canSave()).toBe(false);
    });

    it('is false when only CLARISA is set', () => {
      component.selectedProjectId.set(22);
      expect(component.canSave()).toBe(false);
    });

    it('is true when both pickers have a value', () => {
      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);
      expect(component.canSave()).toBe(true);
    });

    it('is false while saving is in progress', () => {
      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);
      component.saving.set(true);
      expect(component.canSave()).toBe(false);
    });
  });

  // ── AC-05.4: successful create → service called, toast shown, list reloaded, trackEvent ──

  describe('successful CREATE (AC-05.4)', () => {
    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('calls service.create with the correct body, shows success toast, reloads list, fires trackEvent', async () => {
      const newRow = makeRow({ id: 5, agresso_agreement_id: 'A511', clarisa_project_id: 22 });
      mockService.create.mockResolvedValue({ ok: true, data: newRow });
      mockService.list.mockResolvedValue(makePage([newRow]));

      component.openCreateDialog();
      await fixture.whenStable();
      await delayMs(0);

      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);
      component.notes.set('Test note');

      expect(component.canSave()).toBe(true);

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      expect(mockService.create).toHaveBeenCalledWith({
        agresso_agreement_id: 'A511',
        clarisa_project_id: 22,
        notes: 'Test note'
      });

      // Dialog closed
      expect(component.dialogOpen()).toBe(false);

      // Toast shown (AC-05.4)
      expect(mockActions.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Bilateral Mapping',
        detail: 'Mapping created'
      });

      // List reloaded (AC-05.4) — list() was called again after create
      expect(mockService.list).toHaveBeenCalledTimes(2); // initial + reload

      // Telemetry (AC-05.4 / design §10)
      expect(mockClarity.trackEvent).toHaveBeenCalledWith('bilateral.mapping.created', {
        agresso_agreement_id: 'A511',
        clarisa_project_id: 22
      });
    });

    it('does not include notes in the create body when notes is empty', async () => {
      const newRow = makeRow({ id: 6 });
      mockService.create.mockResolvedValue({ ok: true, data: newRow });
      mockService.list.mockResolvedValue(makePage([newRow]));

      component.openCreateDialog();
      await fixture.whenStable();
      await delayMs(0);

      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);
      component.notes.set('');

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      expect(mockService.create).toHaveBeenCalledWith({
        agresso_agreement_id: 'A511',
        clarisa_project_id: 22
      });
      expect(mockService.create.mock.calls[0][0]).not.toHaveProperty('notes');
    });
  });

  // ── AC-05.5: CREATE 409 conflict → dialog stays open, message surfaced ─────

  describe('CREATE 409 conflict (AC-05.5)', () => {
    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('keeps dialog open and surfaces result.message (from errorDetail.errors) on 409', async () => {
      const conflictMessage = 'Active mapping already exists for this contract';
      mockService.create.mockResolvedValue({ ok: false, status: 409, message: conflictMessage });

      component.openCreateDialog();
      await fixture.whenStable();
      await delayMs(0);

      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      // Dialog remains open (AC-05.5)
      expect(component.dialogOpen()).toBe(true);

      // The exact message from result.message is surfaced (not a generic string)
      expect(component.saveError()).toBe(conflictMessage);

      // No duplicate row added — list NOT reloaded on failure
      expect(mockService.list).toHaveBeenCalledTimes(1); // only initial load

      // No success toast
      expect(mockActions.showToast).not.toHaveBeenCalled();
    });

    it('message shown is result.message, not a generic string (AC-05.5)', async () => {
      const specificMessage = 'Active mapping already exists for this contract';
      mockService.create.mockResolvedValue({ ok: false, status: 409, message: specificMessage });

      component.openCreateDialog();
      await fixture.whenStable();
      await delayMs(0);
      component.selectedAgreement.set('D527');
      component.selectedProjectId.set(99);

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      // Must be the exact error text from result.message, not "ConflictException" or generic
      expect(component.saveError()).toBe(specificMessage);
      expect(component.saveError()).not.toBe('ConflictException');
      expect(component.saveError()).not.toBe('An unexpected error occurred. Please try again.');
    });
  });

  // ── AC-05.6: CREATE 400 validation error → message surfaced ───────────────

  describe('CREATE 400 validation error (AC-05.6)', () => {
    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('surfaces result.message inline on a 400 error', async () => {
      const validationMessage = 'clarisa_project_id must be a number';
      mockService.create.mockResolvedValue({ ok: false, status: 400, message: validationMessage });

      component.openCreateDialog();
      await fixture.whenStable();
      await delayMs(0);
      component.selectedAgreement.set('A511');
      component.selectedProjectId.set(22);

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      expect(component.dialogOpen()).toBe(true);
      expect(component.saveError()).toBe(validationMessage);
    });
  });

  // ── T-BIL-CAM-05: Edit mode (AC-06.1 / AC-06.4) ──────────────────────────

  describe('openEditDialog (AC-06.1 / AC-06.4)', () => {
    const editRow = makeRow({ id: 11, agresso_agreement_id: 'D504', clarisa_project_id: 22, notes: 'original note' });

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([editRow]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('pre-fills form fields from the row when opened in edit mode (AC-06.1)', () => {
      component.openEditDialog(editRow);

      expect(component.dialogMode()).toBe('edit');
      expect(component.editingId()).toBe(11);
      expect(component.editingAgreementId()).toBe('D504');
      expect(component.selectedProjectId()).toBe(22);
      expect(component.notes()).toBe('original note');
    });

    it('AGRESSO agreement shown as read-only (editingAgreementId set, not in selectedAgreement picker for edit)', () => {
      component.openEditDialog(editRow);

      // editingAgreementId holds the readonly value; selectedAgreement is set for reference
      expect(component.editingAgreementId()).toBe('D504');
    });

    it('Save is disabled when nothing changed (AC-06.4)', () => {
      component.openEditDialog(editRow);

      // No changes made — canSave must be false
      expect(component.canSave()).toBe(false);
    });

    it('Save is enabled when CLARISA project changes (AC-06.4)', () => {
      component.openEditDialog(editRow);
      component.selectedProjectId.set(99); // changed from 22

      expect(component.canSave()).toBe(true);
    });

    it('Save is enabled when notes changes (AC-06.4)', () => {
      component.openEditDialog(editRow);
      component.notes.set('updated note'); // changed

      expect(component.canSave()).toBe(true);
    });
  });

  // ── AC-06.2: successful edit → service.update called with ONLY changed fields ──

  describe('successful EDIT (AC-06.2)', () => {
    const editRow = makeRow({ id: 11, agresso_agreement_id: 'D504', clarisa_project_id: 22, notes: 'original' });

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([editRow]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('calls service.update with only the changed fields (project id changed)', async () => {
      const updatedRow = makeRow({ id: 11, clarisa_project_id: 99 });
      mockService.update.mockResolvedValue({ ok: true, data: updatedRow });
      mockService.list.mockResolvedValue(makePage([updatedRow]));

      component.openEditDialog(editRow);
      await fixture.whenStable();
      await delayMs(0);

      // Change only the project
      component.selectedProjectId.set(99);

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      // Only clarisa_project_id in body — not notes (unchanged)
      expect(mockService.update).toHaveBeenCalledWith(11, { clarisa_project_id: 99 });

      // Dialog closed
      expect(component.dialogOpen()).toBe(false);

      // Success toast (AC-06.2)
      expect(mockActions.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Bilateral Mapping',
        detail: 'Mapping updated'
      });

      // Telemetry (AC-06.2 / design §10)
      expect(mockClarity.trackEvent).toHaveBeenCalledWith('bilateral.mapping.updated', {
        mapping_id: 11,
        clarisa_project_id: 99
      });

      // List reloaded
      expect(mockService.list).toHaveBeenCalledTimes(2);
    });

    it('calls service.update with only notes when only notes changed', async () => {
      const updatedRow = makeRow({ id: 11, notes: 'new note' });
      mockService.update.mockResolvedValue({ ok: true, data: updatedRow });
      mockService.list.mockResolvedValue(makePage([updatedRow]));

      component.openEditDialog(editRow);
      await fixture.whenStable();
      await delayMs(0);

      component.notes.set('new note');

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      // Only notes in body — not clarisa_project_id (unchanged)
      expect(mockService.update).toHaveBeenCalledWith(11, { notes: 'new note' });
    });
  });

  // ── AC-06.3: EDIT 400 error → message surfaced inline ─────────────────────

  describe('EDIT 400 error (AC-06.3)', () => {
    const editRow = makeRow({ id: 11, agresso_agreement_id: 'D504', clarisa_project_id: 22, notes: 'original' });

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([editRow]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('surfaces result.message inline on a 400 PATCH error and keeps dialog open (AC-06.3)', async () => {
      const errorMessage = 'clarisa_project_id does not exist';
      mockService.update.mockResolvedValue({ ok: false, status: 400, message: errorMessage });

      component.openEditDialog(editRow);
      await fixture.whenStable();
      await delayMs(0);

      component.selectedProjectId.set(999); // change so canSave is true

      await component.onSave();
      await fixture.whenStable();
      await delayMs(0);

      expect(component.dialogOpen()).toBe(true);
      expect(component.saveError()).toBe(errorMessage);
      expect(mockActions.showToast).not.toHaveBeenCalled();
    });
  });

  // ── closeDialog resets error ───────────────────────────────────────────────

  it('closeDialog() sets dialogOpen to false and clears saveError', () => {
    component.dialogOpen.set(true);
    component.saveError.set('some error');

    component.closeDialog();

    expect(component.dialogOpen()).toBe(false);
    expect(component.saveError()).toBeNull();
  });

  // ── agressoOptionLabel helper ──────────────────────────────────────────────

  describe('agressoOptionLabel', () => {
    it('returns "id — description" when description is present', () => {
      expect(component.agressoOptionLabel({ agreement_id: 'A511', description: 'ACIAR Bilateral' }))
        .toBe('A511 — ACIAR Bilateral');
    });

    it('returns just the id when description is empty', () => {
      expect(component.agressoOptionLabel({ agreement_id: 'A511', description: '' }))
        .toBe('A511');
    });
  });

  // ── Lazy AGRESSO picker search (onAgressoFilter / agressoFilter$) ──────────

  describe('onAgressoFilter — lazy server-side AGRESSO search', () => {
    const filteredOpts = [{ agreement_id: 'PHIL001', description: 'Philippines Bilateral' }];

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('calls loadAgressoOptions with the term after debounce and updates agressoOptions', async () => {
      mockService.loadAgressoOptions.mockResolvedValue(filteredOpts);

      // Bypass debounce by pushing directly into the subject
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).agressoFilter$.next('phil');
      await delayMs(350); // past the 300 ms debounce
      await fixture.whenStable();
      await delayMs(0);

      expect(mockService.loadAgressoOptions).toHaveBeenCalledWith('phil');
      expect(component.agressoOptions()).toEqual(filteredOpts);
    });

    it('sets agressoOptionsLoading to true during the search and false after', async () => {
      let loadingDuringCall = false;
      mockService.loadAgressoOptions.mockImplementation(() => {
        loadingDuringCall = component.agressoOptionsLoading();
        return Promise.resolve(filteredOpts);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).agressoFilter$.next('phil');
      await delayMs(350);
      await fixture.whenStable();
      await delayMs(0);

      expect(loadingDuringCall).toBe(true);
      expect(component.agressoOptionsLoading()).toBe(false);
    });

    it('onAgressoFilter("") calls loadAgressoOptions with undefined (reloads initial set)', async () => {
      mockService.loadAgressoOptions.mockResolvedValue(AGRESSO_OPTIONS);

      component.onAgressoFilter('');
      await delayMs(350);
      await fixture.whenStable();
      await delayMs(0);

      // Empty string → the stream receives '' → undefined passed to service
      expect(mockService.loadAgressoOptions).toHaveBeenCalledWith(undefined);
    });

    it('onAgressoFilter(term) pushes into agressoFilter$ subject', async () => {
      mockService.loadAgressoOptions.mockResolvedValue(filteredOpts);

      component.onAgressoFilter('A5');
      await delayMs(350);
      await fixture.whenStable();
      await delayMs(0);

      expect(mockService.loadAgressoOptions).toHaveBeenCalledWith('A5');
    });
  });

  // ── Lazy CLARISA picker search (onClarisaFilter / clarisaFilter$) ──────────

  describe('onClarisaFilter — lazy server-side CLARISA search', () => {
    const filteredClarisa: ClarisaBilateralProjectOption[] = [
      { id: 55, short_name: 'USAID Kenya', source_of_funding: 'BILATERAL', science_programs: [] }
    ];

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('calls loadClarisaProjectOptions with the term after debounce and updates clarisaOptions', async () => {
      mockService.loadClarisaProjectOptions.mockResolvedValue(filteredClarisa);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).clarisaFilter$.next('kenya');
      await delayMs(350);
      await fixture.whenStable();
      await delayMs(0);

      expect(mockService.loadClarisaProjectOptions).toHaveBeenCalledWith('kenya');
      expect(component.clarisaOptions()).toEqual(filteredClarisa);
    });

    it('sets clarisaOptionsLoading to true during the search and false after', async () => {
      let loadingDuringCall = false;
      mockService.loadClarisaProjectOptions.mockImplementation(() => {
        loadingDuringCall = component.clarisaOptionsLoading();
        return Promise.resolve(filteredClarisa);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).clarisaFilter$.next('kenya');
      await delayMs(350);
      await fixture.whenStable();
      await delayMs(0);

      expect(loadingDuringCall).toBe(true);
      expect(component.clarisaOptionsLoading()).toBe(false);
    });
  });

  // ── T-BIL-CAM-06: Deactivate with confirmation (AC-07.1 / AC-07.2 / AC-07.3) ──

  describe('requestDeactivate — confirmation gate (AC-07.2)', () => {
    const activeRow = makeRow({ id: 1, agresso_agreement_id: 'A511', is_active: true });

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([activeRow]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
      fixture.detectChanges();
    });

    it('calls ActionsService.showGlobalAlert with correct shape and does NOT call service.deactivate (AC-07.2)', () => {
      component.requestDeactivate(activeRow);

      expect(mockActions.showGlobalAlert).toHaveBeenCalledTimes(1);
      const arg = mockActions.showGlobalAlert.mock.calls[0][0] as GlobalAlert;
      expect(arg.severity).toBe('confirm');
      expect(arg.summary).toBe('Deactivate mapping');
      expect(arg.detail).toContain('A511');
      expect(typeof arg.confirmCallback?.event).toBe('function');
      expect(arg.cancelCallback?.label).toBe('Cancel');

      // Not called yet — confirmation not fired
      expect(mockService.deactivate).not.toHaveBeenCalled();
    });

    it('cancel (never invoking the confirmCallback) does NOT call service.deactivate (AC-07.2)', () => {
      component.requestDeactivate(activeRow);
      // Cancel: do NOT invoke the confirmCallback.event
      expect(mockService.deactivate).not.toHaveBeenCalled();
    });

    it('invoking confirmCallback.event triggers service.deactivate (AC-07.2)', async () => {
      mockService.deactivate.mockResolvedValue({ ok: true, data: { ...activeRow, is_active: false } });
      component.rows.set([activeRow]);

      component.requestDeactivate(activeRow);
      const arg = mockActions.showGlobalAlert.mock.calls[0][0] as GlobalAlert;

      // Simulate user clicking "Deactivate" in the alert
      arg.confirmCallback?.event?.();
      await fixture.whenStable();
      await delayMs(0);

      expect(mockService.deactivate).toHaveBeenCalledWith(activeRow.id);
    });
  });

  describe('confirmDeactivate — success path (AC-07.1)', () => {
    const activeRow = makeRow({ id: 1, agresso_agreement_id: 'A511', is_active: true });

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([activeRow]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('updates the row is_active to false in-place, shows success toast, fires trackEvent (AC-07.1)', async () => {
      const deactivatedRow = { ...activeRow, is_active: false };
      mockService.deactivate.mockResolvedValue({ ok: true, data: deactivatedRow });
      component.rows.set([activeRow]);

      await component.confirmDeactivate(activeRow);
      await fixture.whenStable();
      await delayMs(0);

      // Row mutated in-place — no full reload required
      const updatedRows = component.rows();
      expect(updatedRows[0].is_active).toBe(false);

      // Success toast (AC-07.1)
      expect(mockActions.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Bilateral Mapping',
        detail: 'Mapping deactivated'
      });

      // Telemetry (design §10)
      expect(mockClarity.trackEvent).toHaveBeenCalledWith('bilateral.mapping.deactivated', {
        mapping_id: activeRow.id,
        agresso_agreement_id: activeRow.agresso_agreement_id
      });
    });

    it('only mutates the target row; other rows remain unchanged', async () => {
      const otherRow = makeRow({ id: 2, agresso_agreement_id: 'D527', is_active: true });
      mockService.deactivate.mockResolvedValue({ ok: true, data: { ...activeRow, is_active: false } });
      component.rows.set([activeRow, otherRow]);

      await component.confirmDeactivate(activeRow);
      await fixture.whenStable();
      await delayMs(0);

      const updatedRows = component.rows();
      expect(updatedRows.find(r => r.id === 1)?.is_active).toBe(false);
      expect(updatedRows.find(r => r.id === 2)?.is_active).toBe(true);
    });
  });

  describe('confirmDeactivate — failure path (AC-07.3)', () => {
    const activeRow = makeRow({ id: 1, agresso_agreement_id: 'A511', is_active: true });

    beforeEach(async () => {
      mockService.list.mockResolvedValue(makePage([activeRow]));
      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
    });

    it('shows an error toast with result.message and does not change is_active on failure (AC-07.3)', async () => {
      const errorMessage = 'Mapping not found';
      mockService.deactivate.mockResolvedValue({ ok: false, status: 404, message: errorMessage });
      component.rows.set([activeRow]);

      await component.confirmDeactivate(activeRow);
      await fixture.whenStable();
      await delayMs(0);

      // Row not mutated
      expect(component.rows()[0].is_active).toBe(true);

      // Error toast surfaced (AC-07.3)
      expect(mockActions.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: errorMessage })
      );

      // No telemetry on failure
      expect(mockClarity.trackEvent).not.toHaveBeenCalled();
    });

    it('deactivating an already-inactive row — ok:false does not crash the UI (AC-07.3)', async () => {
      const inactiveRow = makeRow({ id: 3, is_active: false });
      mockService.deactivate.mockResolvedValue({ ok: false, status: 400, message: 'Already inactive' });
      component.rows.set([inactiveRow]);

      // Must not throw
      await expect(component.confirmDeactivate(inactiveRow)).resolves.toBeUndefined();

      expect(component.rows()[0].is_active).toBe(false); // unchanged
    });
  });

  describe('Deactivate button visibility (AC-07.3)', () => {
    it('renders the Deactivate button only for active rows', async () => {
      const activeRow = makeRow({ id: 1, is_active: true });
      const inactiveRow = makeRow({ id: 2, is_active: false });
      mockService.list.mockResolvedValue(makePage([activeRow, inactiveRow]));

      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
      fixture.detectChanges();

      const deactivateBtns = fixture.nativeElement.querySelectorAll('[data-testid="deactivate-btn"]');
      expect(deactivateBtns.length).toBe(1);
    });

    it('renders no Deactivate button when all rows are inactive', async () => {
      const inactiveRow1 = makeRow({ id: 1, is_active: false });
      const inactiveRow2 = makeRow({ id: 2, is_active: false });
      mockService.list.mockResolvedValue(makePage([inactiveRow1, inactiveRow2]));

      fixture.detectChanges();
      await fixture.whenStable();
      await delayMs(0);
      fixture.detectChanges();

      const deactivateBtns = fixture.nativeElement.querySelectorAll('[data-testid="deactivate-btn"]');
      expect(deactivateBtns.length).toBe(0);
    });
  });

  // ── onNotesInput clips at max length ──────────────────────────────────────

  it('onNotesInput clips the input at notesMaxLength (500 chars)', () => {
    const long = 'a'.repeat(510);
    component.onNotesInput(long);
    expect(component.notes().length).toBe(500);
  });

  // ── selectedProject computed signal ───────────────────────────────────────

  it('selectedProject returns the matching CLARISA option when a project is selected', async () => {
    mockService.list.mockResolvedValue(makePage([]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);

    component.openCreateDialog();
    await fixture.whenStable();
    await delayMs(0);

    component.selectedProjectId.set(22);

    expect(component.selectedProject()).toEqual(CLARISA_OPTIONS[0]);
  });

  it('selectedProject returns null when no project is selected', async () => {
    mockService.list.mockResolvedValue(makePage([]));
    fixture.detectChanges();
    await fixture.whenStable();
    await delayMs(0);

    component.openCreateDialog();

    expect(component.selectedProject()).toBeNull();
  });
});
