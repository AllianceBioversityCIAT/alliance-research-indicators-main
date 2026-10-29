// @akili-spec docs/specs/bilateral/annualized-project-mapping — T-10 / R-APM-008 AC.2, R-APM-010 AC.1
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import { EditEnvironmentVariableModalComponent, POOL_FUNDING_FLAG_KEYS } from './edit-environment-variable-modal.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { VariableConfigurationJsonRowComponent } from '@pages/platform/pages/administration/configuration/variable-configuration/components/variable-configuration-json-row/variable-configuration-json-row.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ApiService } from '@shared/services/api.service';
import { VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { AppConfigListItem, UpdateAppConfigDto } from '@shared/interfaces/app-config.interface';

describe('EditEnvironmentVariableModalComponent', () => {
  let fixture: ComponentFixture<EditEnvironmentVariableModalComponent>;
  let component: EditEnvironmentVariableModalComponent;
  let saveEdit: jest.Mock;
  let editingUsesJson: jest.Mock;
  let canEdit: boolean;
  let apiCalls: string[];
  let modalOpen: ReturnType<typeof signal<boolean>>;
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

  beforeEach(async () => {
    saveEdit = jest.fn().mockResolvedValue(undefined);
    editingUsesJson = jest.fn().mockReturnValue(false);
    canEdit = true;
    apiCalls = [];
    modalOpen = signal(true);
    editingItem = signal<AppConfigListItem | null>(null);
    editForm = signal<UpdateAppConfigDto>({});

    const api = new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop !== 'string') return undefined;
          return () => {
            apiCalls.push(prop);
            return Promise.resolve({ successfulRequest: true, data: {} });
          };
        }
      }
    );

    await TestBed.configureTestingModule({
      imports: [EditEnvironmentVariableModalComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: AllModalsService,
          useValue: {
            isModalOpen: jest.fn().mockImplementation(() => ({ isOpen: modalOpen() }))
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
          useValue: api
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
    // synchronously by `detectChanges()` — flush so any open-time fetch
    // is recorded before the assertion.
    TestBed.flushEffects();
  }

  function simpleValueInputExists(): boolean {
    return fixture.debugElement
      .queryAll(By.directive(InputComponent))
      .some(de => (de.componentInstance as InputComponent).optionValue === 'simple_value');
  }

  function phaseRequests(): string[] {
    return apiCalls.filter(name => /phases/i.test(name) || name.includes('projects/phases'));
  }

  function poolFundingToggle(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="pool-funding-flag-toggle"]');
  }

  function clickPoolFundingToggle(): void {
    const root = poolFundingToggle()?.querySelector('[data-pc-name="toggleswitch"]') as HTMLElement | null;
    root?.click();
    fixture.detectChanges();
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

  // ── R-APM-008 AC.2 / R-APM-010 AC.1: ARI_PRMS_SYNC stays a plain value ────

  it('renders a plain value input when editing ARI_PRMS_SYNC', async () => {
    open(row({ key: 'ARI_PRMS_SYNC', simple_value: '2027' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(simpleValueInputExists()).toBe(true);
    expect(fixture.debugElement.query(By.directive(Select))).toBeNull();
    expect(poolFundingToggle()).toBeNull();
    expect(phaseRequests()).toEqual([]);
  });

  // ── No key may request the retired phases endpoint ────────────────────────

  it.each(['ARI_PRMS_SYNC', 'SOME_OTHER_KEY', 'ARI_CLARISA_PROJECTS_PHASE', ...POOL_FUNDING_FLAG_KEYS])(
    'does not request tools/clarisa/projects/phases when opening %s',
    async key => {
      open(row({ key, simple_value: '2026' }));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(phaseRequests()).toEqual([]);
    }
  );

  // ── BUT NOT: any other key's control changes ───────────────────────────────

  it('still renders app-input (simple_value) for a different key', async () => {
    open(row({ key: 'SOME_OTHER_KEY', simple_value: 'plain text' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(simpleValueInputExists()).toBe(true);
    expect(fixture.debugElement.query(By.directive(Select))).toBeNull();
    expect(poolFundingToggle()).toBeNull();
  });

  // ── R-PFT-005: boolean toggle replaces the text input for the two flags ──

  it.each(POOL_FUNDING_FLAG_KEYS)('renders the pool-funding toggle and not a text input when editing %s', async key => {
    modalOpen.set(false);
    fixture.detectChanges();
    expect(poolFundingToggle()).toBeNull();

    modalOpen.set(true);
    open(row({ key, simple_value: 'true' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(poolFundingToggle()).toBeTruthy();
    expect(simpleValueInputExists()).toBe(false);
    expect(fixture.debugElement.query(By.directive(Select))).toBeNull();
  });

  it.each(POOL_FUNDING_FLAG_KEYS)('writes exactly true then false into simple_value when toggling %s', async key => {
    modalOpen.set(false);
    fixture.detectChanges();
    expect(poolFundingToggle()).toBeNull();

    modalOpen.set(true);
    open(row({ key, simple_value: 'true' }));
    await fixture.whenStable();
    fixture.detectChanges();

    clickPoolFundingToggle();
    expect(editForm().simple_value).toBe('false');

    clickPoolFundingToggle();
    expect(editForm().simple_value).toBe('true');
  });

  // ── BUT NOT: the structured-JSON branch is disturbed ───────────────────────

  it('still renders the structured JSON editor for a JSON-valued key', async () => {
    editingUsesJson.mockReturnValue(true);
    open(row({ key: 'ARI_PRMS_SYNC', json_value: { a: 1 } }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(VariableConfigurationJsonRowComponent))).toBeTruthy();
    expect(simpleValueInputExists()).toBe(false);
    expect(fixture.debugElement.query(By.directive(Select))).toBeNull();
  });
});
