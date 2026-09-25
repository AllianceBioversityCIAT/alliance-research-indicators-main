import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { environment } from '@envs/environment';
import { PromptManagerService } from './prompt-manager.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { cacheServiceMock } from 'src/app/testing/mock-services.mock';
import { PromptItem } from '@shared/interfaces/prompt-manager.interface';

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

describe('PromptManagerService', () => {
  let service: PromptManagerService;
  let http: { get: jest.Mock; post: jest.Mock };
  let actions: { showToast: jest.Mock };
  let allModals: AllModalsService;

  beforeEach(() => {
    http = { get: jest.fn(), post: jest.fn() };
    actions = { showToast: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        PromptManagerService,
        { provide: HttpClient, useValue: http },
        { provide: ActionsService, useValue: actions },
        { provide: CacheService, useValue: cacheServiceMock }
      ]
    });

    service = TestBed.inject(PromptManagerService);
    allModals = TestBed.inject(AllModalsService);
  });

  it('loadList should store the prompts returned by the service', async () => {
    http.get.mockReturnValue(of({ prompts: [promptRow] }));

    await service.loadList();

    expect(http.get).toHaveBeenCalledWith(`${environment.documentOverviewUrl}/api/prompts`, expect.any(Object));
    const headers = http.get.mock.calls[0][1].headers;
    expect(headers.get('access-token')).toBe(cacheServiceMock.dataCache().access_token);
    expect(service.items()).toEqual([promptRow]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('loadList should flag the error and empty the list when the request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    http.get.mockReturnValue(throwError(() => new Error('boom')));

    await service.loadList();

    expect(service.loadError()).toBe(true);
    expect(service.items()).toEqual([]);
  });

  it('openEdit should seed the draft from user_prompt and open the modal', () => {
    service.openEdit(promptRow);

    expect(service.editingItem()).toEqual(promptRow);
    expect(service.editForm()).toEqual({ system_role: 'stored role', context: 'stored context' });
    expect(allModals.isModalOpen('editPrompt').isOpen).toBe(true);
    expect(service.isDirty()).toBe(false);
  });

  it('openEdit should fall back to default_prompt when a section has no stored value', () => {
    service.openEdit({ ...promptRow, user_prompt: { system_role: 'stored role' } });

    expect(service.editForm()).toEqual({ system_role: 'stored role', context: 'default context' });
  });

  it('isDirty should turn true once a section is edited', () => {
    service.openEdit(promptRow);
    service.editForm.update(form => ({ ...form, context: 'edited context' }));

    expect(service.isDirty()).toBe(true);
  });

  it('saveEdit should POST only the declared sections, reload and close', async () => {
    http.get.mockReturnValue(of({ prompts: [promptRow] }));
    http.post.mockReturnValue(of({}));
    service.openEdit(promptRow);
    service.editForm.update(form => ({ ...form, context: 'edited context', ignored: 'nope' }));

    await service.saveEdit();

    expect(http.post).toHaveBeenCalledWith(
      `${environment.documentOverviewUrl}/api/prompts`,
      {
        id: 'project-overview',
        user_prompt: { system_role: 'stored role', context: 'edited context' },
        updated_by: cacheServiceMock.dataCache().user.email
      },
      expect.any(Object)
    );
    expect(http.get).toHaveBeenCalled();
    expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    expect(allModals.isModalOpen('editPrompt').isOpen).toBe(false);
    expect(service.saving()).toBe(false);
  });

  it('saveEdit should surface the failure and keep the modal open', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    http.post.mockReturnValue(throwError(() => new Error('boom')));
    service.openEdit(promptRow);

    await service.saveEdit();

    expect(service.saveError()).toBe('Failed to save the prompt. Please check your changes and try again.');
    expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    expect(allModals.isModalOpen('editPrompt').isOpen).toBe(true);
    expect(service.saving()).toBe(false);
  });

  it('sectionKeys should fall back to the stored prompt keys when sections is empty', () => {
    expect(service.sectionKeys({ ...promptRow, sections: [] })).toEqual(['system_role', 'context']);
  });

  it('sectionLabel should humanize unknown keys', () => {
    expect(service.sectionLabel('system_role')).toBe('System role');
    expect(service.sectionLabel('extra_notes_section')).toBe('Extra notes section');
  });
});
