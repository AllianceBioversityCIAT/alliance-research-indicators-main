import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VariableConfigurationService, UNCategorized_FILTER } from './variable-configuration.service';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { AppConfigListItem } from '@shared/interfaces/app-config.interface';

describe('VariableConfigurationService', () => {
  let service: VariableConfigurationService;
  let api: {
    GET_AppConfigList: jest.Mock;
    GET_AppConfigCategories: jest.Mock;
    PATCH_AppConfigByKey: jest.Mock;
  };
  let allModals: {
    openModal: jest.Mock;
    closeModal: jest.Mock;
    isModalOpen: jest.Mock;
  };
  let canEditAppConfiguration: jest.Mock;
  let showToast: jest.Mock;

  const simpleRow: AppConfigListItem = {
    key: 'simple.key',
    category: 'EMAIL',
    subcategory: null,
    description: 'desc',
    simple_value: 'value',
    json_value: null,
    updated_at: '2024-01-01',
    updated_by: 'user'
  };

  const jsonRow: AppConfigListItem = {
    key: 'json.key',
    category: 'UI',
    subcategory: 'DATE',
    description: 'json desc',
    simple_value: null,
    json_value: {
      date: { order: 'DMY', enabled: true },
      locale: 'en-US'
    },
    updated_at: '2024-01-02',
    updated_by: 'admin'
  };

  beforeEach(() => {
    api = {
      GET_AppConfigList: jest.fn().mockResolvedValue({
        data: { data: [simpleRow, jsonRow] }
      }),
      GET_AppConfigCategories: jest.fn().mockResolvedValue({ data: { categories: ['EMAIL'], subcategories: [] } }),
      PATCH_AppConfigByKey: jest.fn().mockResolvedValue({ data: { key: 'simple.key' } })
    };
    allModals = {
      openModal: jest.fn(),
      closeModal: jest.fn(),
      isModalOpen: jest.fn().mockReturnValue({ isOpen: false })
    };
    canEditAppConfiguration = jest.fn().mockReturnValue(true);
    showToast = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        VariableConfigurationService,
        { provide: ApiService, useValue: api },
        { provide: ActionsService, useValue: { showToast } },
        { provide: AllModalsService, useValue: allModals },
        {
          provide: RolesService,
          useValue: {
            canEditAppConfiguration
          }
        }
      ]
    });
    service = TestBed.inject(VariableConfigurationService);
  });

  it('loads list without sending pagination params', async () => {
    await service.loadList();
    expect(api.GET_AppConfigList).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'key',
        sortOrder: 'ASC'
      })
    );
    expect(api.GET_AppConfigList).toHaveBeenCalledWith(
      expect.not.objectContaining({
        page: expect.anything(),
        limit: expect.anything()
      })
    );
    expect(service.items()).toEqual([simpleRow, jsonRow]);
    expect(service.loading()).toBe(false);
  });

  it('extracts items from nested data.data response', async () => {
    api.GET_AppConfigList.mockResolvedValueOnce({
      data: {
        data: [{ key: 'nested.key' }],
        pagination: { total: 1, page: 1, limit: 1, pageSize: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      }
    });
    await service.loadList();
    expect(service.items()).toEqual([{ key: 'nested.key' }]);
  });

  it('extracts items when API returns a bare array', async () => {
    api.GET_AppConfigList.mockResolvedValueOnce({ data: [{ key: 'array.key' }] });
    await service.loadList();
    expect(service.items()).toEqual([{ key: 'array.key' }]);
  });

  it('skips overlapping loadList calls while a request is in flight', async () => {
    let resolveList: (value: unknown) => void = () => undefined;
    api.GET_AppConfigList.mockReturnValueOnce(
      new Promise(resolve => {
        resolveList = resolve;
      })
    );

    const first = service.loadList();
    const second = service.loadList();
    expect(api.GET_AppConfigList).toHaveBeenCalledTimes(1);

    resolveList({ data: { data: [] } });
    await Promise.all([first, second]);
  });

  it('sets loadError when list request fails', async () => {
    api.GET_AppConfigList.mockRejectedValueOnce(new Error('network'));
    await service.loadList();
    expect(service.loadError()).toBe(true);
    expect(service.items()).toEqual([]);
  });

  it('syncDraftsFromActive copies active filters to draft signals', () => {
    service.search.set('query');
    service.categoryFilter.set('EMAIL');
    service.subcategoryFilter.set('SMTP');
    service.syncDraftsFromActive();
    expect(service.draftSearch()).toBe('query');
    expect(service.draftCategoryFilter()).toBe('EMAIL');
    expect(service.draftSubcategoryFilter()).toBe('SMTP');
  });

  it('buildQuery maps uncategorized filters to empty strings', () => {
    service.search.set('  find  ');
    service.categoryFilter.set(UNCategorized_FILTER);
    service.subcategoryFilter.set(UNCategorized_FILTER);
    service.sortField.set('category');
    service.sortOrder.set('DESC');

    expect(service.buildQuery()).toEqual({
      search: '  find  ',
      category: '',
      subcategory: '',
      sortField: 'category',
      sortOrder: 'DESC'
    });
  });

  it('loadFacets stores categories when API succeeds', async () => {
    await service.loadFacets();
    expect(service.facets()).toEqual({ categories: ['EMAIL'], subcategories: [] });
  });

  it('loadFacets ignores failed requests', async () => {
    api.GET_AppConfigCategories.mockRejectedValueOnce(new Error('fail'));
    await service.loadFacets();
    expect(service.facets()).toEqual({ categories: [], subcategories: [] });
  });

  it('reload syncs draft filters from active state and loads facets and list', async () => {
    service.search.set('active');
    service.categoryFilter.set('EMAIL');
    service.draftSearch.set('');
    await service.reload();
    expect(service.draftSearch()).toBe('active');
    expect(service.draftCategoryFilter()).toBe('EMAIL');
    expect(api.GET_AppConfigCategories).toHaveBeenCalled();
    expect(api.GET_AppConfigList).toHaveBeenCalled();
  });

  it('applyFilters commits draft values and reloads', async () => {
    service.draftSearch.set('  filtered  ');
    service.draftCategoryFilter.set('EMAIL');
    service.draftSubcategoryFilter.set(null);
    await service.applyFilters();
    expect(service.search()).toBe('filtered');
    expect(service.showAdvancedFilters()).toBe(true);
    expect(api.GET_AppConfigList).toHaveBeenCalled();
  });

  it('resetFilters clears active and draft filter state', () => {
    service.search.set('x');
    service.categoryFilter.set('EMAIL');
    service.draftSearch.set('y');
    service.showAdvancedFilters.set(true);
    service.resetFilters();
    expect(service.search()).toBe('');
    expect(service.categoryFilter()).toBeNull();
    expect(service.draftSearch()).toBe('');
    expect(service.showAdvancedFilters()).toBe(false);
  });

  it('patches configuration and reloads list', async () => {
    const ok = await service.patchItem('test.key', { simple_value: 'x' });
    expect(ok).toBe(true);
    expect(api.PATCH_AppConfigByKey).toHaveBeenCalledWith('test.key', { simple_value: 'x' });
    expect(api.GET_AppConfigList).toHaveBeenCalled();
    expect(service.saveSuccess()).toBe(true);
    expect(showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Configuration',
      detail: 'Data saved successfully'
    });
  });

  it('patchItem returns false and sets saveError on failure', async () => {
    api.PATCH_AppConfigByKey.mockRejectedValueOnce(new Error('fail'));
    const ok = await service.patchItem('test.key', { simple_value: 'x' });
    expect(ok).toBe(false);
    expect(service.saveError()).toContain('Failed to save');
    expect(showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save configuration. Please check your values and try again.'
    });
  });

  it('json helpers reflect draft state and labels', () => {
    service.syncJsonDrafts([jsonRow]);
    expect(service.isJsonConfig(jsonRow)).toBe(true);
    expect(service.isJsonConfig(simpleRow)).toBe(false);
    expect(service.isJsonConfig({ ...simpleRow, json_value: {} })).toBe(false);
    expect(service.jsonSections('json.key').length).toBeGreaterThan(0);
    expect(service.jsonValues('json.key')['locale']).toBe('en-US');
    expect(service.isJsonRowDirty('json.key')).toBe(false);
    expect(service.jsonSectionCount(jsonRow)).toBeGreaterThan(0);
    expect(service.jsonSectionsLabel(jsonRow)).toMatch(/sections/);

    const singleSectionRow: AppConfigListItem = {
      ...jsonRow,
      key: 'single.section',
      json_value: { only: true }
    };
    service.syncJsonDrafts([singleSectionRow]);
    expect(service.jsonSectionsLabel(singleSectionRow)).toBe('1 section');
  });

  it('buildRowSearchHaystack includes flattened json values', () => {
    const haystack = service.buildRowSearchHaystack(jsonRow);
    expect(haystack).toContain('en-us');
    expect(haystack).toContain('true');
  });

  it('openEdit prepares simple row and opens modal', () => {
    service.openEdit(simpleRow);
    expect(service.editingItem()).toEqual(simpleRow);
    expect(service.editingUsesJson()).toBe(false);
    expect(service.editForm().simple_value).toBe('value');
    expect(allModals.openModal).toHaveBeenCalledWith('editEnvironmentVariable');
  });

  it('openEdit keeps all json accordion sections collapsed', () => {
    service.syncJsonDrafts([jsonRow]);
    service.openEdit(jsonRow);
    expect(service.editingUsesJson()).toBe(true);
    expect(service.modalJsonSections()).toEqual({});
  });

  it('toggleModalJsonSection flips section state', () => {
    service.toggleModalJsonSection('date');
    expect(service.modalJsonSections()['date']).toBe(true);
    service.toggleModalJsonSection('date');
    expect(service.modalJsonSections()['date']).toBe(false);
  });

  it('onJsonFieldChange updates draft values when draft exists', () => {
    service.syncJsonDrafts([jsonRow]);
    service.onJsonFieldChange('json.key', { pathKey: 'locale', value: 'fr-FR' });
    expect(service.jsonValues('json.key').locale).toBe('fr-FR');
    expect(service.isJsonRowDirty('json.key')).toBe(true);
  });

  it('onJsonFieldChange is a no-op without draft', () => {
    service.onJsonFieldChange('missing', { pathKey: 'locale', value: 'x' });
    expect(service.jsonDrafts()).toEqual({});
  });

  it('saveEdit saves simple value and closes on success', async () => {
    service.openEdit(simpleRow);
    service.editForm.update(form => ({ ...form, simple_value: ' updated ' }));
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).toHaveBeenCalledWith(
      'simple.key',
      expect.objectContaining({ simple_value: 'updated' })
    );
    expect(allModals.closeModal).toHaveBeenCalled();
    expect(service.editingItem()).toBeNull();
  });

  it('saveEdit saves json configuration and closes on success', async () => {
    service.syncJsonDrafts([jsonRow]);
    service.openEdit(jsonRow);
    service.onJsonFieldChange('json.key', { pathKey: 'locale', value: 'de-DE' });
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).toHaveBeenCalledWith(
      'json.key',
      expect.objectContaining({
        json_value: expect.objectContaining({ locale: 'de-DE' }),
        simple_value: undefined
      })
    );
    expect(service.editingItem()).toBeNull();
  });

  it('saveEdit shows error toast and keeps modal open when json patch fails', async () => {
    api.PATCH_AppConfigByKey.mockRejectedValueOnce(new Error('fail'));
    service.syncJsonDrafts([jsonRow]);
    service.openEdit(jsonRow);
    await service.saveEdit();
    expect(showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save configuration. Please check your values and try again.'
    });
    expect(service.editingItem()).toEqual(jsonRow);
  });

  it('saveEdit returns early without permission or editing row', async () => {
    canEditAppConfiguration.mockReturnValue(false);
    service.openEdit(simpleRow);
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).not.toHaveBeenCalled();

    canEditAppConfiguration.mockReturnValue(true);
    service.editingItem.set(null);
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).not.toHaveBeenCalled();
  });

  it('saveEdit returns early for json row without draft', async () => {
    service.editingItem.set(jsonRow);
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).not.toHaveBeenCalled();
  });

  it('syncJsonDrafts preserves dirty draft for item being edited', () => {
    service.syncJsonDrafts([jsonRow]);
    service.openEdit(jsonRow);
    service.onJsonFieldChange('json.key', { pathKey: 'locale', value: 'dirty-locale' });
    const dirtyDraft = service.jsonDrafts()['json.key'];
    service.syncJsonDrafts([{ ...jsonRow, json_value: { locale: 'reset', enabled: false } }]);
    expect(service.jsonDrafts()['json.key']).toBe(dirtyDraft);
  });

  it('closeEdit closes modal and clears editing state', () => {
    service.openEdit(simpleRow);
    service.closeEdit();
    expect(allModals.closeModal).toHaveBeenCalledWith('editEnvironmentVariable');
    expect(service.editingItem()).toBeNull();
  });

  it('returns empty list when API response has no items', async () => {
    api.GET_AppConfigList.mockResolvedValueOnce({ data: undefined });
    await service.loadList();
    expect(service.items()).toEqual([]);
  });

  it('json accessors return defaults for unknown row keys', () => {
    expect(service.jsonSections('missing')).toEqual([]);
    expect(service.jsonValues('missing')).toEqual({});
    expect(service.isJsonRowDirty('missing')).toBe(false);
  });

  it('openEdit uses empty strings for missing row fields and flat json without groups', () => {
    const sparseRow: AppConfigListItem = {
      key: 'flat.json',
      category: null,
      subcategory: null,
      description: null,
      simple_value: null,
      json_value: { locale: 'en-US' },
      updated_at: '2024-01-03',
      updated_by: null
    };
    service.syncJsonDrafts([sparseRow]);
    service.openEdit(sparseRow);
    expect(service.editForm()).toEqual({
      description: '',
      simple_value: '',
      category: '',
      subcategory: ''
    });
    expect(service.modalJsonSections()).toEqual({});
  });

  it('jsonSectionCount falls back to top-level json keys without draft', () => {
    expect(service.jsonSectionCount(jsonRow)).toBe(Object.keys(jsonRow.json_value!).length);
  });

  it('saveEdit uses undefined optional fields when edit form values are blank', async () => {
    const sparse: AppConfigListItem = { ...simpleRow, description: null, category: null, subcategory: null };
    service.openEdit(sparse);
    service.editForm.set({});
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).toHaveBeenCalledWith(
      'simple.key',
      expect.objectContaining({
        description: undefined,
        category: undefined,
        subcategory: undefined,
        simple_value: ''
      })
    );
  });

  it('saveEdit omits blank trimmed metadata fields for json configuration', async () => {
    service.syncJsonDrafts([jsonRow]);
    service.openEdit(jsonRow);
    service.editForm.set({ description: '   ', category: ' ', subcategory: '\t' });
    await service.saveEdit();
    expect(api.PATCH_AppConfigByKey).toHaveBeenCalledWith(
      'json.key',
      expect.objectContaining({
        description: undefined,
        category: undefined,
        subcategory: undefined
      })
    );
  });

  it('jsonSectionCount returns zero for non-json rows and uses draft sections when present', () => {
    expect(service.jsonSectionCount(simpleRow)).toBe(0);
    service.syncJsonDrafts([jsonRow]);
    expect(service.jsonSectionCount(jsonRow)).toBe(service.jsonDrafts()['json.key']!.sections.length);
  });

  it('buildRowSearchHaystack ignores empty string parts', () => {
    const haystack = service.buildRowSearchHaystack({
      ...simpleRow,
      category: '',
      description: '',
      subcategory: null
    });
    expect(haystack).toContain('simple.key');
    expect(haystack).not.toContain('email');
  });

  it('buildRowSearchHaystack stringifies null json leaf values', () => {
    const haystack = service.buildRowSearchHaystack({
      ...jsonRow,
      json_value: { meta: null, enabled: false, count: 0 }
    });
    expect(haystack).toContain('false');
    expect(haystack).toContain('0');
  });

  it('syncJsonDrafts does not reset drafts when there are no json rows', () => {
    service.syncJsonDrafts([simpleRow]);
    const draftsRef = service.jsonDrafts();
    service.syncJsonDrafts([simpleRow]);
    expect(service.jsonDrafts()).toBe(draftsRef);
  });

  it('resets edit state when edit modal closes', () => {
    const isOpen = signal(false);
    allModals.isModalOpen.mockImplementation(() => ({ isOpen: isOpen() }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        VariableConfigurationService,
        { provide: ApiService, useValue: api },
        { provide: ActionsService, useValue: { showToast } },
        { provide: AllModalsService, useValue: allModals },
        { provide: RolesService, useValue: { canEditAppConfiguration } }
      ]
    });
    const effectService = TestBed.inject(VariableConfigurationService);
    effectService.openEdit(simpleRow);
    isOpen.set(true);
    TestBed.flushEffects();
    isOpen.set(false);
    TestBed.flushEffects();
    expect(effectService.editingItem()).toBeNull();
  });
});
