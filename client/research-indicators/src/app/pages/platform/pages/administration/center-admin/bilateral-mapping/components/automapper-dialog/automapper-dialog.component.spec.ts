// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-06 / R-CAM-002, R-CAM-003, R-5, design.md §6.2
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutomapperDialogComponent } from './automapper-dialog.component';
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { ActionsService } from '@services/actions.service';
import {
  AutomapperApplyResponse,
  AutomapperPreviewResponse,
  formatClarisaProjectLabel
} from '@interfaces/bilateral/bilateral-project-mapping.interface';

describe('AutomapperDialogComponent', () => {
  let fixture: ComponentFixture<AutomapperDialogComponent>;
  let component: AutomapperDialogComponent;
  let mockService: {
    previewAutoMap: jest.Mock;
    applyAutoMap: jest.Mock;
  };
  let mockActions: {
    showToast: jest.Mock;
  };

  const samplePreview: AutomapperPreviewResponse = {
    feedFetchedAt: '2026-08-19T21:10:00.000Z',
    counts: {
      toCreate: 2,
      alreadyMapped: 1,
      ambiguous: 2,
      unresolved: 2,
      divergent: 1,
      supersede: 1
    },
    toCreate: [
      {
        clarisaProjectId: 1516,
        clarisaProjectFullName: 'Project D514',
        clarisaProjectShortName: 'Project D514', // equal -> should collapse (F-A)
        externalCode: 'C-D514',
        derivedContractId: 'D514',
        action: 'toCreate'
      },
      {
        clarisaProjectId: 1517,
        clarisaProjectFullName: 'Australian Centre for International Agricultural Research',
        clarisaProjectShortName: 'ACIAR', // distinct -> should not collapse (F-A)
        externalCode: 'B-A1080',
        derivedContractId: 'A1080',
        action: 'toCreate'
      }
    ],
    alreadyMapped: [
      {
        clarisaProjectId: 1516,
        clarisaProjectFullName: 'Project D514',
        clarisaProjectShortName: 'Project D514',
        externalCode: 'C-D514',
        derivedContractId: 'D514',
        action: 'alreadyMapped',
        existingMappingId: 1,
        existingClarisaProjectId: 1516
      }
    ],
    divergent: [
      {
        clarisaProjectId: 1600,
        clarisaProjectFullName: 'New 2026 Project',
        clarisaProjectShortName: 'New 2026 Project',
        externalCode: 'C-A511',
        derivedContractId: 'A511',
        action: 'divergent',
        existingMappingId: 2,
        existingClarisaProjectId: 22 // different manual project
      }
    ],
    ambiguous: [
      {
        clarisaProjectId: 1700,
        clarisaProjectFullName: 'Ambiguous Alpha',
        clarisaProjectShortName: 'Alpha',
        externalCode: 'C-AMB1',
        derivedContractId: 'AMB1'
      },
      {
        clarisaProjectId: 1701,
        clarisaProjectFullName: 'Ambiguous Beta Project',
        clarisaProjectShortName: 'Beta',
        externalCode: 'C-AMB1-B',
        derivedContractId: 'AMB1'
      }
    ],
    unresolved: [
      {
        clarisaProjectId: 1800,
        clarisaProjectFullName: 'Unresolved With Contract',
        clarisaProjectShortName: 'Unresolved 1',
        externalCode: 'C-MISSING',
        derivedContractId: 'MISSING'
      },
      {
        clarisaProjectId: 1801,
        clarisaProjectFullName: 'Unresolved Without Code',
        clarisaProjectShortName: 'Unresolved 2',
        externalCode: null,
        derivedContractId: '' // empty derivedContractId -> must render "no external_code" (F-B)
      }
    ],
    supersede: [
      {
        clarisaProjectId: 1900,
        clarisaProjectFullName: 'Phase 2026 Project',
        clarisaProjectShortName: 'Phase 2026 Project',
        externalCode: 'C-S500',
        derivedContractId: 'S500',
        action: 'supersede',
        existingMappingId: 5,
        existingClarisaProjectId: 138
      }
    ]
  };

  const sampleApplyResponse: AutomapperApplyResponse = {
    feedFetchedAt: '2026-08-19T21:10:00.000Z',
    counts: {
      created: 2,
      alreadyMapped: 1,
      ambiguous: 2,
      unresolved: 2,
      divergent: 1,
      superseded: 1
    },
    ambiguous: samplePreview.ambiguous,
    unresolved: samplePreview.unresolved
  };

  beforeEach(async () => {
    mockService = {
      previewAutoMap: jest.fn().mockResolvedValue(samplePreview),
      applyAutoMap: jest.fn().mockResolvedValue({ ok: true, data: sampleApplyResponse })
    };
    mockActions = {
      showToast: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AutomapperDialogComponent],
      providers: [
        { provide: BilateralMappingService, useValue: mockService },
        { provide: ActionsService, useValue: mockActions }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AutomapperDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.querySelectorAll('.p-dialog, .p-dialog-mask, .p-component-overlay').forEach(el => el.remove());
  });

  const queryEl = <T extends HTMLElement = HTMLElement>(selector: string): T | null =>
    (fixture.nativeElement.querySelector(selector) ?? document.body.querySelector(selector)) as T | null;

  const queryAll = <T extends HTMLElement = HTMLElement>(selector: string): T[] => {
    const fromFixture = Array.from(fixture.nativeElement.querySelectorAll(selector)) as T[];
    if (fromFixture.length > 0) return fromFixture;
    return Array.from(document.body.querySelectorAll(selector)) as T[];
  };

  // ── Issue 1 (GATING): Production Open Lifecycle ─────────────────────────

  describe('Production open lifecycle (Issue 1)', () => {
    it('loads preview on dialog open when constructed with visible=false (production sequence)', async () => {
      // 1. Production sequence: Component is constructed with visible = false by default
      expect(component.visible()).toBe(false);
      fixture.detectChanges(); // ngOnInit runs with visible === false
      await fixture.whenStable();

      // previewAutoMap must NOT have been called during initial page construction
      expect(mockService.previewAutoMap).not.toHaveBeenCalled();
      expect(queryEl('[data-testid="preview-content"]')).toBeNull();

      // 2. Admin clicks "Auto-map" button: visible flips to true
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // previewAutoMap MUST be called on open, and preview content must render
      expect(mockService.previewAutoMap).toHaveBeenCalledTimes(1);
      expect(queryEl('[data-testid="preview-content"]')).not.toBeNull();
    });

    it('clears preview state on closeDialog', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.closeDialog();
      expect(component.visible()).toBe(false);
      expect(component.preview()).toBeNull();
    });
  });

  // ── Finding F-A: Label collapses when short_name === full_name ───────────

  describe('Finding F-A: Project name formatting and collapsing', () => {
    it('collapses the label to a single name when short_name and full_name are equal (F-A Branch 1)', () => {
      const equalNames = {
        short_name: 'Project D514',
        full_name: 'Project D514'
      };
      const label = formatClarisaProjectLabel(equalNames);
      expect(label).toBe('Project D514');
      expect(label).not.toContain(' — ');
    });

    it('renders "short_name — full_name" when both names are distinct (F-A Branch 2)', () => {
      const distinctNames = {
        short_name: 'ACIAR',
        full_name: 'Australian Centre for International Agricultural Research'
      };
      const label = formatClarisaProjectLabel(distinctNames);
      expect(label).toBe('ACIAR — Australian Centre for International Agricultural Research');
    });

    it('renders single name if only one name is present and fallback if none (null-safety)', () => {
      expect(formatClarisaProjectLabel({ short_name: 'USAID', full_name: null })).toBe('USAID');
      expect(formatClarisaProjectLabel({ short_name: null, full_name: 'Full Title' })).toBe('Full Title');
      expect(formatClarisaProjectLabel({ id: 999, short_name: null, full_name: null })).toBe('Project #999');
    });

    it('renders collapsed names in the preview template', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.selectTab('toCreate');
      fixture.detectChanges();

      const toCreatePanel = queryEl('[data-testid="panel-toCreate"]');
      expect(toCreatePanel).not.toBeNull();
      // Branch 1: collapsed
      expect(toCreatePanel!.textContent).toContain('Project D514');
      expect(toCreatePanel!.textContent).not.toContain('Project D514 — Project D514');
      // Branch 2: distinct
      expect(toCreatePanel!.textContent).toContain('ACIAR — Australian Centre for International Agricultural Research');
    });
  });

  // ── Finding F-B: Empty derivedContractId renders "no external_code" ───────

  describe('Finding F-B: Unresolved contract id fallback', () => {
    it('renders an explicit "no external_code" when derivedContractId is empty or null (F-B)', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.selectTab('unresolved');
      fixture.detectChanges();

      const unresolvedPanel = queryEl('[data-testid="panel-unresolved"]');
      expect(unresolvedPanel).not.toBeNull();

      const contractCells = queryAll('[data-testid="unresolved-contract-id"]');
      expect(contractCells.length).toBe(2);

      // First entry has contract ID 'MISSING'
      expect(contractCells[0].textContent?.trim()).toBe('MISSING');
      // Second entry has empty derivedContractId -> MUST render 'no external_code' (F-B)
      expect(contractCells[1].textContent?.trim()).toBe('no external_code');
    });
  });

  // ── Finding F-C: Apply confirmation wording & feed freshness ──────────────

  describe('Finding F-C: Honest apply confirmation and feed timestamp', () => {
    it('surfaces feedFetchedAt timestamp in the dialog header', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const timestampEl = queryEl('[data-testid="preview-feed-timestamp"]');
      expect(timestampEl).not.toBeNull();
      expect(timestampEl!.textContent).toContain('Feed Cache:');
    });

    it('words the apply confirmation honestly without promising exact preview replay (F-C)', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Click apply button to open confirmation
      const applyBtn = queryEl<HTMLButtonElement>('[data-testid="start-apply-btn"]');
      expect(applyBtn).not.toBeNull();
      applyBtn!.click();
      fixture.detectChanges();

      expect(component.confirmingApply()).toBe(true);

      const confirmBlock = queryEl('[data-testid="apply-confirmation-block"]');
      expect(confirmBlock).not.toBeNull();

      const confirmText = queryEl('[data-testid="apply-confirmation-text"]');
      expect(confirmText).not.toBeNull();

      // Assert honest wording
      expect(confirmText!.textContent).toContain('Apply auto-mapping?');
      expect(confirmText!.textContent).toContain('re-evaluate eligible projects against current data');
      expect(confirmText!.textContent).toContain('Preview evaluated from CLARISA cache at:');
    });
  });

  // ── Hard Requirement 7: Ambiguous and Divergent list BOTH candidates ─────

  describe('Hard Requirement 7: Candidate visibility for ambiguous and divergent', () => {
    it('lists BOTH candidates in the divergent panel (existing manual mapping and derived candidate)', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.selectTab('divergent');
      fixture.detectChanges();

      const divergentRow = queryEl('[data-testid="divergent-row"]');
      expect(divergentRow).not.toBeNull();

      const existingCol = queryEl('[data-testid="divergent-existing"]');
      const candidateCol = queryEl('[data-testid="divergent-candidate"]');

      expect(existingCol!.textContent).toContain('Project ID 22');
      expect(candidateCol!.textContent).toContain('New 2026 Project');
      expect(candidateCol!.textContent).toContain('id: 1600');
    });

    it('lists BOTH colliding candidates in ambiguous panel sharing contract AMB1', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.selectTab('ambiguous');
      fixture.detectChanges();

      const ambiguousRows = queryAll('[data-testid="ambiguous-row"]');
      expect(ambiguousRows.length).toBe(2);

      // Candidate 1
      expect(ambiguousRows[0].textContent).toContain('AMB1');
      expect(ambiguousRows[0].textContent).toContain('Alpha');
      expect(ambiguousRows[0].textContent).toContain('id: 1700');

      // Candidate 2 (sharing contract AMB1)
      expect(ambiguousRows[1].textContent).toContain('AMB1');
      expect(ambiguousRows[1].textContent).toContain('Beta');
      expect(ambiguousRows[1].textContent).toContain('id: 1701');
    });
  });

  // ── Apply Execution Flow ──────────────────────────────────────────────────

  describe('Apply execution flow', () => {
    it('applies auto-map on confirmation, shows result counts, shows toast, and emits applied event', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.onStartApply();
      fixture.detectChanges();

      let emittedResult: AutomapperApplyResponse | null = null;
      component.applied.subscribe(res => { emittedResult = res; });

      const confirmBtn = queryEl<HTMLButtonElement>('[data-testid="confirm-apply-btn"]');
      expect(confirmBtn).not.toBeNull();
      confirmBtn!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(mockService.applyAutoMap).toHaveBeenCalledWith(2026);
      expect(component.applyResult()).toEqual(sampleApplyResponse);
      expect(emittedResult).toEqual(sampleApplyResponse);
      expect(mockActions.showToast).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'success',
        summary: 'Auto-Mapper Applied'
      }));

      // Result panel is rendered
      const resultPanel = queryEl('[data-testid="apply-result-panel"]');
      expect(resultPanel).not.toBeNull();
      expect(queryEl('[data-testid="apply-count-created"]')!.textContent?.trim()).toBe('2');
      expect(queryEl('[data-testid="apply-count-superseded"]')!.textContent?.trim()).toBe('1');
    });

    it('surfaces error message when applyAutoMap fails', async () => {
      mockService.applyAutoMap.mockResolvedValue({
        ok: false,
        status: 422,
        message: 'No external codes in cohort'
      });

      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      component.onStartApply();
      fixture.detectChanges();

      const confirmBtn = queryEl<HTMLButtonElement>('[data-testid="confirm-apply-btn"]');
      expect(confirmBtn).not.toBeNull();
      confirmBtn!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.applyError()).toBe('No external codes in cohort');
      const errorEl = queryEl('[data-testid="apply-error-text"]');
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toContain('No external codes in cohort');
    });
  });
});


