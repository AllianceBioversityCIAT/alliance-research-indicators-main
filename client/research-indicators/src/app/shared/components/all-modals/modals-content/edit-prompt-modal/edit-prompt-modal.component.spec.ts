import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { EditPromptModalComponent } from './edit-prompt-modal.component';
import { PromptManagerService } from '@shared/services/prompt-manager.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { cacheServiceMock } from 'src/app/testing/mock-services.mock';
import { PromptItem, PromptSections } from '@shared/interfaces/prompt-manager.interface';

const promptRow: PromptItem = {
  id: 'project-overview',
  name: 'Project Overview',
  description: 'Prompt used to synthesize a project overview.',
  sections: ['system_role', 'context'],
  variables: [{ name: 'user_input', placeholder: '{user_input}', description: 'Free text', required: true }],
  default_prompt: { system_role: 'default role', context: 'default context' },
  user_prompt: { system_role: 'stored role', context: 'stored context' },
  is_modified: true,
  created_at: '2026-08-20T17:25:48.370307+00:00',
  updated_at: '2026-08-20T17:25:48.370307+00:00',
  updated_by: 'daniela.gomez@cgiar.org'
};

describe('EditPromptModalComponent', () => {
  let fixture: ComponentFixture<EditPromptModalComponent>;
  let component: EditPromptModalComponent;
  let allModals: AllModalsService;
  // isDirty is signal-backed so the OnPush template re-renders exactly as it
  // does with the real service, whose isDirty() reads editingItem()/editForm().
  let dirty: ReturnType<typeof signal<boolean>>;
  let serviceMock: {
    editingItem: ReturnType<typeof signal<PromptItem | null>>;
    editForm: ReturnType<typeof signal<PromptSections>>;
    saving: ReturnType<typeof signal<boolean>>;
    saveError: ReturnType<typeof signal<string | null>>;
    isDirty: jest.Mock;
    closeEdit: jest.Mock;
    saveEdit: jest.Mock;
    sectionKeys: jest.Mock;
    sectionLabel: jest.Mock;
  };

  beforeEach(async () => {
    dirty = signal(false);
    serviceMock = {
      editingItem: signal<PromptItem | null>(null),
      editForm: signal<PromptSections>({}),
      saving: signal(false),
      saveError: signal<string | null>(null),
      isDirty: jest.fn(() => dirty()),
      closeEdit: jest.fn(),
      saveEdit: jest.fn().mockResolvedValue(undefined),
      sectionKeys: jest.fn((row: PromptItem) => row.sections),
      sectionLabel: jest.fn((key: string) => key)
    };

    await TestBed.configureTestingModule({
      imports: [EditPromptModalComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PromptManagerService, useValue: serviceMock },
        { provide: CacheService, useValue: cacheServiceMock }
      ]
    }).compileComponents();

    allModals = TestBed.inject(AllModalsService);
    allModals.closeModal('editPrompt');

    fixture = TestBed.createComponent(EditPromptModalComponent);
    component = fixture.componentInstance;
  });

  // KZ-015: the product always constructs this content closed and opens it later,
  // so the fixture must exercise that transition rather than the end state.
  it('should render nothing while the modal is closed', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-textarea')).toHaveLength(0);
  });

  it('should render one textarea per section once the modal opens', () => {
    fixture.detectChanges();

    serviceMock.editingItem.set(promptRow);
    serviceMock.editForm.set({ ...promptRow.user_prompt });
    allModals.openModal('editPrompt');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-textarea')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Project Overview');
    expect(fixture.nativeElement.textContent).toContain('{user_input}');
  });

  it('should keep Save disabled until the draft is dirty', () => {
    serviceMock.editingItem.set(promptRow);
    allModals.openModal('editPrompt');
    fixture.detectChanges();

    const saveButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[1];
    expect(saveButton.disabled).toBe(true);

    dirty.set(true);
    fixture.detectChanges();
    expect(saveButton.disabled).toBe(false);

    saveButton.click();
    expect(serviceMock.saveEdit).toHaveBeenCalled();
  });

  it('should close the edit through the service when Cancel is clicked', () => {
    serviceMock.editingItem.set(promptRow);
    allModals.openModal('editPrompt');
    fixture.detectChanges();

    const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[0];
    cancelButton.click();

    expect(serviceMock.closeEdit).toHaveBeenCalled();
  });

  it('should surface the save error', () => {
    serviceMock.editingItem.set(promptRow);
    serviceMock.saveError.set('Failed to save the prompt.');
    allModals.openModal('editPrompt');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Failed to save the prompt.');
  });

  it('should delegate section helpers to the service', () => {
    expect(component.sectionKeys(promptRow)).toEqual(['system_role', 'context']);
    expect(component.sectionLabel('context')).toBe('context');
  });
});
