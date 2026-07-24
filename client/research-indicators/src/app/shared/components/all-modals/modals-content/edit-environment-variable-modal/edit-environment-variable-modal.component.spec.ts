import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EditEnvironmentVariableModalComponent } from './edit-environment-variable-modal.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { AppConfigListItem } from '@shared/interfaces/app-config.interface';

describe('EditEnvironmentVariableModalComponent', () => {
  let fixture: ComponentFixture<EditEnvironmentVariableModalComponent>;
  let component: EditEnvironmentVariableModalComponent;
  let saveEdit: jest.Mock;
  let editingItem: ReturnType<typeof signal<AppConfigListItem | null>>;

  const row: AppConfigListItem = {
    key: 'test.key',
    category: 'EMAIL',
    subcategory: null,
    description: 'desc',
    simple_value: 'value',
    json_value: null,
    updated_at: '2024-01-01',
    updated_by: 'user'
  };

  beforeEach(async () => {
    saveEdit = jest.fn().mockResolvedValue(undefined);
    editingItem = signal<AppConfigListItem | null>(null);

    await TestBed.configureTestingModule({
      imports: [EditEnvironmentVariableModalComponent],
      providers: [
        {
          provide: AllModalsService,
          useValue: {
            isModalOpen: jest.fn().mockReturnValue({ isOpen: false })
          }
        },
        {
          provide: RolesService,
          useValue: {
            canEditAppConfiguration: () => true
          }
        },
        {
          provide: VariableConfigurationService,
          useValue: {
            editingItem,
            editForm: signal({}),
            saveEdit,
            editingUsesJson: () => false,
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mirror editing item key into variableNameDisplay', () => {
    expect(component.service.editingItem).toBe(editingItem);
    editingItem.set(row);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.variableNameDisplay().key).toBe('test.key');

    editingItem.set(null);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.variableNameDisplay().key).toBe('');
  });

  it('onSave should delegate to VariableConfigurationService.saveEdit', () => {
    component.onSave();
    expect(saveEdit).toHaveBeenCalled();
  });
});
