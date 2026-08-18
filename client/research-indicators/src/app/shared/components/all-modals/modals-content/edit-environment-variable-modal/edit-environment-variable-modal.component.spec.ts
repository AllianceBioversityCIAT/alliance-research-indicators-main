// @akili-spec docs/specs/bilateral/clarisa-phase-config-variable — T-03 / R-CPC-003, R-CPC-004, DD-3, DD-4, DD-7
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import { EditEnvironmentVariableModalComponent, CLARISA_PHASE_CONFIG_KEY } from './edit-environment-variable-modal.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { VariableConfigurationJsonRowComponent } from '@pages/platform/pages/administration/configuration/variable-configuration/components/variable-configuration-json-row/variable-configuration-json-row.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ApiService } from '@shared/services/api.service';
import { VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { AppConfigListItem, UpdateAppConfigDto } from '@shared/interfaces/app-config.interface';
import { ClarisaProjectPhasesResponse } from '@interfaces/bilateral/bilateral-project-mapping.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';

describe('EditEnvironmentVariableModalComponent', () => {
  let fixture: ComponentFixture<EditEnvironmentVariableModalComponent>;
  let component: EditEnvironmentVariableModalComponent;
  let saveEdit: jest.Mock;
  let editingUsesJson: jest.Mock;
  let getPhases: jest.Mock;
  let canEdit: boolean;
  let isOpen: boolean;
  let editingItem: ReturnType<typeof signal<AppConfigListItem | null>>;
  let editForm: ReturnType<typeof signal<UpdateAppConfigDto>>;

  function row(overrides: Partial<AppConfigListItem> = {}): AppConfigListItem {
    return {
      key: 'test.key',
      category: 'EMAIL',
      subcategory: null,
      description: 'desc',
      simple_value: 'value',
      json_value: null,
      updated_at: '2024-01-01',
      updated_by: 'user',
      ...overrides
    };
  }

  function phasesResponse(
    data: ClarisaProjectPhasesResponse,
    successfulRequest = true
  ): MainResponse<ClarisaProjectPhasesResponse> {
    return {
      data,
      status: successfulRequest ? 200 : 500,
      description: '',
      timestamp: '',
      path: '',
      successfulRequest,
      errorDetail: undefined as never
    };
  }

  beforeEach(async () => {
    saveEdit = jest.fn().mockResolvedValue(undefined);
    editingUsesJson = jest.fn().mockReturnValue(false);
    getPhases = jest.fn().mockResolvedValue(phasesResponse({ phases: [], phaseAbsentCount: 0 }));
    canEdit = true;
    isOpen = true;
    editingItem = signal<AppConfigListItem | null>(null);
    editForm = signal<UpdateAppConfigDto>({});

    await TestBed.configureTestingModule({
      imports: [EditEnvironmentVariableModalComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: AllModalsService,
          useValue: {
            isModalOpen: jest.fn().mockImplementation(() => ({ isOpen }))
          }
        },
        {
          provide: RolesService,
          useValue: {
            canEditAppConfiguration: () => canEdit
          }
        },
        {
          provide: ApiService,
          useValue: {
            GET_ClarisaProjectPhases: getPhases
          }
        },
        {
          provide: VariableConfigurationService,
          useValue: {
            editingItem,
            editForm,
            saveEdit,
            editingUsesJson,
            jsonSections: () => [],
            jsonValues: () => ({}),
            modalJsonSections: signal({}),
            isJsonRowDirty: () => false,
            saving: signal(false),
            closeEdit: jest.fn(),
            toggleModalJsonSection: jest.fn(),
            onJsonFieldChange: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditEnvironmentVariableModalComponent);
    component = fixture.componentInstance;
  });

  function open(item: AppConfigListItem): void {
    editingItem.set(item);
    editForm.set({ simple_value: item.simple_value ?? '' });
    fixture.detectChanges();
    // Component-level `effect()`s are scheduled on a microtask, not run
    // synchronously by `detectChanges()` — flush so `loadPhaseOptions()` is
    // actually invoked before the test awaits its resolution.
    TestBed.flushEffects();
  }

  function phaseSelectDebugElement() {
    return fixture.debugElement
      .queryAll(By.directive(Select))
      .find(de => (de.nativeElement as HTMLElement).getAttribute('data-testid') === 'clarisa-phase-select');
  }

  function simpleValueInputExists(): boolean {
    return fixture.debugElement
      .queryAll(By.directive(InputComponent))
      .some(de => (de.componentInstance as InputComponent).optionValue === 'simple_value');
  }

  // ── Pre-existing behaviour (unchanged) ─────────────────────────────────────

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should mirror editing item key into variableNameDisplay', () => {
    fixture.detectChanges();
    expect(component.service.editingItem).toBe(editingItem);
    editingItem.set(row());
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.variableNameDisplay().key).toBe('test.key');

    editingItem.set(null);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.variableNameDisplay().key).toBe('');
  });

  it('onSave should delegate to VariableConfigurationService.saveEdit', () => {
    fixture.detectChanges();
    component.onSave();
    expect(saveEdit).toHaveBeenCalled();
  });

  // ── R-CPC-004: selector replaces the text input for this key ──────────────

  it('renders the CLARISA phase year selector when editing ARI_CLARISA_PROJECTS_PHASE', async () => {
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(phaseSelectDebugElement()).toBeTruthy();
    expect(simpleValueInputExists()).toBe(false);
  });

  // ── BUT NOT: any other key's control changes ───────────────────────────────

  it('still renders app-input (simple_value) for a different key', async () => {
    open(row({ key: 'SOME_OTHER_KEY', simple_value: 'plain text' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(simpleValueInputExists()).toBe(true);
    expect(phaseSelectDebugElement()).toBeUndefined();
  });

  // ── BUT NOT: the structured-JSON branch is disturbed ───────────────────────

  it('still renders the structured JSON editor for a JSON-valued key, even if it were the phase key', async () => {
    editingUsesJson.mockReturnValue(true);
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, json_value: { a: 1 } }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(VariableConfigurationJsonRowComponent))).toBeTruthy();
    expect(phaseSelectDebugElement()).toBeUndefined();
  });

  // ── AND MUST: stay read-only without canEditAppConfiguration() ─────────────

  it('disables the phase selector when the user lacks canEditAppConfiguration()', async () => {
    canEdit = false;
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    const select = phaseSelectDebugElement();
    expect((select?.componentInstance as Select).disabled).toBe(true);
  });

  // ── R-CPC-003: configured value injected when absent from the derived set ──

  it('includes the configured value in the option set even when absent from the derived phases', async () => {
    getPhases.mockResolvedValue(phasesResponse({ phases: [{ phase: 2025, count: 25 }], phaseAbsentCount: 0 }));
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2027' }));
    await fixture.whenStable();
    fixture.detectChanges();

    const values = component.phaseSelectOptions().map(o => o.value);
    expect(values).toContain('2025');
    expect(values).toContain('2027');
  });

  // ── R-CPC-003 scenario 2: empty derived set must not block saving / render unusable ──

  it('keeps the control usable and save enabled when the derived set is empty', async () => {
    getPhases.mockResolvedValue(phasesResponse({ phases: [], phaseAbsentCount: 3 }));
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.phaseSelectOptions()).toEqual([{ value: '2026', label: '2026' }]);
    const select = phaseSelectDebugElement();
    expect((select?.componentInstance as Select).disabled).toBe(false);

    const saveButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button[type="button"]:last-of-type');
    expect(saveButton?.disabled).toBe(false);
  });

  // ── R-CPC-003 scenario 2: must state no phase data is available upstream ───

  it('shows the "no phase data upstream" hint when phaseAbsentCount > 0, distinct from "no projects"', async () => {
    getPhases.mockResolvedValue(phasesResponse({ phases: [], phaseAbsentCount: 5 }));
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    const hint: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="clarisa-phase-hint"]');
    expect(hint?.textContent).toContain('CLARISA publishes no phase data');
    expect(hint?.textContent).not.toContain('No eligible CLARISA projects found');
  });

  it('shows the "no eligible projects" hint when phaseAbsentCount is 0 and no phases exist', async () => {
    getPhases.mockResolvedValue(phasesResponse({ phases: [], phaseAbsentCount: 0 }));
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    const hint: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="clarisa-phase-hint"]');
    expect(hint?.textContent).toContain('No eligible CLARISA projects found');
    expect(hint?.textContent).not.toContain('CLARISA publishes no phase data');
  });

  it('surfaces a failed phases request distinctly, instead of rendering it as "no options"', async () => {
    getPhases.mockResolvedValue(phasesResponse({ phases: [], phaseAbsentCount: 0 }, false));
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    const error: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="clarisa-phase-error"]');
    const hint: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="clarisa-phase-hint"]');
    expect(error).toBeTruthy();
    expect(hint).toBeNull();
    // The configured value must still be usable even though the request failed.
    expect(component.phaseSelectOptions()).toEqual([{ value: '2026', label: '2026' }]);
  });

  // ── DD-3: free entry preserved via `editable` ───────────────────────────────

  it('renders the phase selector as editable, preserving free-text entry (DD-3)', async () => {
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2026' }));
    await fixture.whenStable();
    fixture.detectChanges();

    const select = phaseSelectDebugElement();
    expect((select?.componentInstance as Select).editable).toBe(true);
  });

  // ── DD-7: options are labelled with their per-year project count ───────────

  it('labels options with their per-year project count (DD-7)', async () => {
    getPhases.mockResolvedValue(
      phasesResponse({
        phases: [
          { phase: 2026, count: 3 },
          { phase: 2025, count: 25 }
        ],
        phaseAbsentCount: 0
      })
    );
    open(row({ key: CLARISA_PHASE_CONFIG_KEY, simple_value: '2025' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.phaseSelectOptions()).toEqual([
      { value: '2026', label: '2026 (3)' },
      { value: '2025', label: '2025 (25)' }
    ]);
  });

  it('does not call the phases endpoint when opening the modal for a different key', async () => {
    open(row({ key: 'SOME_OTHER_KEY' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getPhases).not.toHaveBeenCalled();
  });
});
