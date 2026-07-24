import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import VariableConfigurationComponent from './variable-configuration.component';
import { VariableConfigurationService, UNCategorized_FILTER } from '@shared/services/variable-configuration.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { AppConfigListItem } from '@shared/interfaces/app-config.interface';

describe('VariableConfigurationComponent', () => {
  let fixture: ComponentFixture<VariableConfigurationComponent>;
  let component: VariableConfigurationComponent;
  let mockService: {
    reload: jest.Mock;
    loadList: jest.Mock;
    applyFilters: jest.Mock;
    resetFilters: jest.Mock;
    syncJsonDrafts: jest.Mock;
    buildRowSearchHaystack: jest.Mock;
    isJsonConfig: jest.Mock;
    jsonSectionsLabel: jest.Mock;
    openEdit: jest.Mock;
    items: ReturnType<typeof signal<AppConfigListItem[]>>;
  };

  const simpleRow: AppConfigListItem = {
    key: 'simple.key',
    category: 'EMAIL',
    subcategory: null,
    description: 'desc',
    simple_value: 'plain',
    json_value: null,
    updated_at: '2024-06-15T14:30:00.000Z',
    updated_by: 'alice'
  };

  const jsonRow: AppConfigListItem = {
    key: 'json.key',
    category: null,
    subcategory: '',
    description: 'json',
    simple_value: null,
    json_value: { locale: 'en-US' },
    updated_at: 'invalid-date',
    updated_by: null
  };

  beforeEach(async () => {
    mockService = {
      reload: jest.fn().mockResolvedValue(undefined),
      loadList: jest.fn().mockResolvedValue(undefined),
      applyFilters: jest.fn().mockResolvedValue(undefined),
      resetFilters: jest.fn(),
      syncJsonDrafts: jest.fn(),
      buildRowSearchHaystack: jest.fn((row: AppConfigListItem) => `${row.key} haystack`),
      isJsonConfig: jest.fn((row: AppConfigListItem) => row.key === 'json.key'),
      jsonSectionsLabel: jest.fn().mockReturnValue('2 sections'),
      openEdit: jest.fn(),
      items: signal<AppConfigListItem[]>([simpleRow, jsonRow]),
      loading: signal(false),
      loadError: signal(false),
      saveSuccess: signal(false),
      saving: signal(false),
      saveError: signal<string | null>(null),
      facets: signal({ categories: [], subcategories: [] }),
      search: signal(''),
      categoryFilter: signal<string | null>(null),
      subcategoryFilter: signal<string | null>(null),
      draftSearch: signal(''),
      draftCategoryFilter: signal<string | null>(null),
      draftSubcategoryFilter: signal<string | null>(null),
      showAdvancedFilters: signal(false),
      sortField: signal('key' as const),
      sortOrder: signal('ASC' as const)
    };

    await TestBed.configureTestingModule({
      imports: [VariableConfigurationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: VariableConfigurationService, useValue: mockService },
        {
          provide: RolesService,
          useValue: {
            canEditAppConfiguration: () => true,
            canAccessAppConfiguration: () => true
          }
        },
        {
          provide: AllModalsService,
          useValue: {
            openModal: jest.fn(),
            closeModal: jest.fn(),
            isModalOpen: jest.fn().mockReturnValue({ isOpen: false })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VariableConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads configurations on init and builds haystacks', async () => {
    await fixture.whenStable();
    expect(mockService.reload).toHaveBeenCalled();
    expect(mockService.syncJsonDrafts).toHaveBeenCalled();
    expect(component.rowSearchHaystacks()['simple.key']).toContain('haystack');
  });

  it('computed table layout includes actions column when user can edit', () => {
    expect(component.tableColSpan()).toBe(8);
    expect(component.tableMinWidth()).toContain('px');
    expect(component.tableStyle()['table-layout']).toBe('fixed');
  });

  it('fixedColumnStyle and descriptionColumnStyle return pixel rules', () => {
    expect(component.fixedColumnStyle(120)).toEqual({
      width: '120px',
      minWidth: '120px',
      maxWidth: '120px'
    });
    expect(component.descriptionColumnStyle().minWidth).toBe(`${component.columnWidths.descriptionMin}px`);
  });

  it('filteredItems returns all rows without table search', () => {
    expect(component.filteredItems().length).toBe(2);
    expect(component.hasTableSearch()).toBe(false);
  });

  it('filteredItems filters by client-side haystack', () => {
    component.setTableSearch('json');
    expect(component.hasTableSearch()).toBe(true);
    expect(component.filteredItems().map(r => r.key)).toEqual(['json.key']);
    component.clearTableSearch();
    expect(component.filteredItems().length).toBe(2);
  });

  it('facetOptions deduplicates values and adds uncategorized option', () => {
    const opts = component.facetOptions(['EMAIL', null, '', 'EMAIL', 'UI']);
    expect(opts[0]).toEqual({ label: 'All', value: null });
    expect(opts).toContainEqual({ label: 'Uncategorized', value: UNCategorized_FILTER });
    expect(opts).toContainEqual({ label: 'EMAIL', value: 'EMAIL' });
    expect(opts).toContainEqual({ label: 'UI', value: 'UI' });
  });

  it('displayValue covers json, simple, and empty states', () => {
    expect(component.displayValue(jsonRow)).toBe('2 sections');
    expect(component.displayValue(simpleRow)).toBe('plain');
    expect(
      component.displayValue({
        ...simpleRow,
        simple_value: '   ',
        json_value: null
      })
    ).toBe('—');
  });

  it('formatUpdatedAt formats valid dates and handles invalid input', () => {
    expect(component.formatUpdatedAt(simpleRow.updated_at)).toMatch(/\d{2}\/\d{2}\/\d{4} at /);
    expect(component.formatUpdatedAt(null)).toBe('—');
    expect(component.formatUpdatedAt('invalid-date')).toBe('—');
  });

  it('applyFilters reloads haystacks and drafts', async () => {
    await component.applyFilters();
    expect(mockService.applyFilters).toHaveBeenCalled();
    expect(mockService.syncJsonDrafts).toHaveBeenCalledTimes(2);
  });

  it('onSearchKeydown applies filters on Enter', () => {
    const applySpy = jest.spyOn(component, 'applyFilters');
    component.onSearchKeydown({ key: 'Enter' } as KeyboardEvent);
    component.onSearchKeydown({ key: 'Escape' } as KeyboardEvent);
    expect(applySpy).toHaveBeenCalledTimes(1);
  });

  it('clearFilters resets service filters and refreshes list', async () => {
    await component.clearFilters();
    expect(mockService.resetFilters).toHaveBeenCalled();
    expect(mockService.loadList).toHaveBeenCalled();
    expect(mockService.syncJsonDrafts).toHaveBeenCalled();
  });

  it('openEdit delegates to the service', () => {
    component.openEdit(simpleRow);
    expect(mockService.openEdit).toHaveBeenCalledWith(simpleRow);
  });
});

describe('VariableConfigurationComponent without edit permission', () => {
  it('tableColSpan omits actions column', async () => {
    await TestBed.configureTestingModule({
      imports: [VariableConfigurationComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: VariableConfigurationService,
          useValue: {
            reload: jest.fn().mockResolvedValue(undefined),
            loadList: jest.fn().mockResolvedValue(undefined),
            applyFilters: jest.fn().mockResolvedValue(undefined),
            resetFilters: jest.fn(),
            items: signal([]),
            loading: signal(false),
            loadError: signal(false),
            saveSuccess: signal(false),
            facets: signal({ categories: [], subcategories: [] }),
            draftSearch: signal(''),
            draftCategoryFilter: signal(null),
            draftSubcategoryFilter: signal(null),
            showAdvancedFilters: signal(false),
            syncJsonDrafts: jest.fn(),
            buildRowSearchHaystack: jest.fn().mockReturnValue(''),
            isJsonConfig: jest.fn().mockReturnValue(false),
            jsonSectionsLabel: jest.fn().mockReturnValue('')
          }
        },
        {
          provide: RolesService,
          useValue: {
            canEditAppConfiguration: () => false,
            canAccessAppConfiguration: () => true
          }
        },
        { provide: AllModalsService, useValue: { isModalOpen: jest.fn().mockReturnValue({ isOpen: false }) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(VariableConfigurationComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.tableColSpan()).toBe(7);
  });
});
