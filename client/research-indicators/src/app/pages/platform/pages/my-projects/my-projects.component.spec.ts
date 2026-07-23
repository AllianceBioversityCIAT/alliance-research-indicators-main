import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import MyProjectsComponent from './my-projects.component';
import { ApiService } from '@shared/services/api.service';
import { MyProjectsService } from '@shared/services/my-projects.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { signal } from '@angular/core';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';

describe('MyProjectsComponent', () => {
  let component: MyProjectsComponent;
  let fixture: ComponentFixture<MyProjectsComponent>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockMyProjectsService: jest.Mocked<MyProjectsService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockActionsService: jest.Mocked<ActionsService>;
  let mockProjectUtilsService: jest.Mocked<ProjectUtilsService>;
  let mockRouter: jest.Mocked<Router>;
  let queryParamGet: jest.Mock;

  beforeEach(async () => {
    mockApiService = {
      GET_Configuration: jest.fn(),
      PATCH_Configuration: jest.fn()
    } as any;

    mockMyProjectsService = {
      resetState: jest.fn(),
      main: jest.fn(),
      clearFilters: jest.fn(),
      cleanMultiselects: jest.fn(),
      showFilterSidebar: jest.fn(),
      applyFilters: jest.fn(),
      removeFilter: jest.fn(),
      resetFilters: jest.fn(),
      searchInput: signal(''),
      list: signal([]),
      loading: signal(false),
      myProjectsFilterItem: signal({ id: 'all', label: 'All Projects' }),
      multiselectRefs: signal({}),
      showFiltersSidebar: signal(false),
      countFiltersSelected: jest.fn().mockReturnValue(0),
      getActiveFilters: jest.fn().mockReturnValue([]),
      hasFilters: jest.fn().mockReturnValue(false),
      totalRecords: signal(0),
      activateStatePersistence: jest.fn(),
      deactivateStatePersistence: jest.fn(),
      restorePersistedState: jest.fn().mockReturnValue(false)
    } as any;

    mockCacheService = {
      hasSmallScreen: jest.fn().mockReturnValue(false)
    } as any;

    mockActionsService = {
      showToast: jest.fn()
    } as any;

    mockProjectUtilsService = {} as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '0' } } as any);
    sessionStorage.clear();
    queryParamGet = jest.fn().mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [MyProjectsComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: MyProjectsService, useValue: mockMyProjectsService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: ProjectUtilsService, useValue: mockProjectUtilsService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map(),
              queryParamMap: { get: (key: string) => queryParamGet(key) }
            },
            params: of({})
          }
        }
      ]
    })
      .overrideComponent(MyProjectsComponent, {
        set: {
          imports: [],
          template: `<div></div>`
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MyProjectsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize state', () => {
      const initializeStateSpy = jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);

      component.ngOnInit();

      expect(initializeStateSpy).toHaveBeenCalled();
    });
  });

  describe('ngAfterViewInit', () => {
    it('should set multiselect refs and clean multiselects', () => {
      const statusSelect = {} as MultiselectComponent;
      const leverSelect = {} as MultiselectComponent;
      const fundingTypeSelect = {} as MultiselectComponent;
      component.statusSelect = statusSelect;
      component.leverSelect = leverSelect;
      component.fundingTypeSelect = fundingTypeSelect;

      jest.useFakeTimers();
      component.ngAfterViewInit();
      jest.advanceTimersByTime(100);
      jest.useRealTimers();

      expect(mockMyProjectsService.multiselectRefs()).toEqual({
        status: statusSelect,
        lever: leverSelect,
        fundingType: fundingTypeSelect
      });
      expect(mockMyProjectsService.cleanMultiselects).toHaveBeenCalled();
    });

    it('should set only available multiselect refs', () => {
      const fundingTypeSelect = {} as MultiselectComponent;
      component.statusSelect = undefined;
      component.leverSelect = undefined;
      component.fundingTypeSelect = fundingTypeSelect;

      jest.useFakeTimers();
      component.ngAfterViewInit();
      jest.advanceTimersByTime(100);
      jest.useRealTimers();

      expect(mockMyProjectsService.multiselectRefs()).toEqual({
        fundingType: fundingTypeSelect
      });
      expect(mockMyProjectsService.cleanMultiselects).toHaveBeenCalled();
    });

    it('should not set refs if components are not available', () => {
      component.statusSelect = undefined;
      component.leverSelect = undefined;
      component.fundingTypeSelect = undefined;

      component.ngAfterViewInit();

      expect(mockMyProjectsService.cleanMultiselects).not.toHaveBeenCalled();
    });
  });

  describe('persistViewState effect', () => {
    it('should not persist state while persistence is disabled', () => {
      jest.spyOn(component as any, 'initializeState').mockResolvedValue(undefined);
      component.allProjectsFirst.set(11);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(sessionStorage.getItem('my-projects-component-state')).toBeNull();
    });

    it('should persist component state when persistence is enabled', () => {
      component['persistViewStateEnabled'].set(true);
      component.allProjectsFirst.set(11);
      component.allProjectsRows.set(22);
      component.myProjectsFirst.set(33);
      component.myProjectsRows.set(44);
      component.searchValue = 'persisted';
      component['_isQuerySentToBackend'].set(true);
      component.isTableView.set(false);
      component.sortField.set('description');
      component.sortOrder.set(1);
      component.selectedTab.set('my');
      component.pinnedTab.set('my');
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(JSON.parse(sessionStorage.getItem('my-projects-component-state')!)).toEqual({
        allProjectsFirst: 11,
        allProjectsRows: 22,
        myProjectsFirst: 33,
        myProjectsRows: 44,
        searchValue: 'persisted',
        isQuerySentToBackend: true,
        isTableView: false,
        sortField: 'description',
        sortOrder: 1,
        selectedTab: 'my',
        tableScrollTopMy: 0,
        tableScrollTopAll: 0
      });
    });
  });

  describe('loadPinnedTabPreference', () => {
    it('should resolve all when all is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '1', self: '0' } } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve my when self is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '1' } } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('my');
      expect(component.pinnedTab()).toBe('my');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when nothing is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: { all: '0', self: '0' } } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when response has no data', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({ data: null } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });
  });

  describe('applyPinnedTabDefault', () => {
    it('should apply my tab default', () => {
      const loadMyProjectsSpy = jest.spyOn(component, 'loadMyProjects').mockImplementation();

      (component as any).applyPinnedTabDefault('my');

      expect(component.myProjectsFilterItem()?.id).toBe('my');
      expect(mockMyProjectsService.myProjectsFilterItem()?.id).toBe('my');
      expect(component.selectedTab()).toBe('my');
      expect(loadMyProjectsSpy).toHaveBeenCalled();
    });

    it('should apply all tab default', () => {
      const loadAllProjectsSpy = jest.spyOn(component, 'loadAllProjects').mockImplementation();

      (component as any).applyPinnedTabDefault('all');

      expect(component.myProjectsFilterItem()?.id).toBe('all');
      expect(mockMyProjectsService.myProjectsFilterItem()?.id).toBe('all');
      expect(component.selectedTab()).toBe('all');
      expect(loadAllProjectsSpy).toHaveBeenCalled();
    });
  });

  describe('initializeState', () => {
    it('should restore persisted state and load current tab state when persisted data exists', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(true);
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' } as any);
      const restoreViewStateSpy = jest.spyOn(component as any, 'restoreViewState').mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadCurrentTabStateSpy = jest.spyOn(component as any, 'loadCurrentTabState').mockImplementation();
      const applyPinnedTabDefaultSpy = jest.spyOn(component as any, 'applyPinnedTabDefault').mockImplementation();

      await (component as any).initializeState();

      expect(mockMyProjectsService.restorePersistedState).toHaveBeenCalledWith('my-projects');
      expect(restoreViewStateSpy).toHaveBeenCalled();
      expect(mockMyProjectsService.activateStatePersistence).toHaveBeenCalledWith('my-projects');
      expect(component['persistViewStateEnabled']()).toBe(true);
      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(component.myProjectsFilterItem()?.id).toBe('my');
      expect(component.selectedTab()).toBe('my');
      expect(loadCurrentTabStateSpy).toHaveBeenCalled();
      expect(applyPinnedTabDefaultSpy).not.toHaveBeenCalled();
    });

    it('should fallback to all tab when restored state has no active tab', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(true);
      mockMyProjectsService.myProjectsFilterItem.set(undefined as any);
      jest.spyOn(component as any, 'restoreViewState').mockReturnValue(false);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadCurrentTabStateSpy = jest.spyOn(component as any, 'loadCurrentTabState').mockImplementation();

      await (component as any).initializeState();

      expect(component.myProjectsFilterItem()?.id).toBe('all');
      expect(component.selectedTab()).toBe('all');
      expect(loadCurrentTabStateSpy).toHaveBeenCalled();
    });

    it('should apply pinned tab default when there is no restored state', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(false);
      const restoreViewStateSpy = jest.spyOn(component as any, 'restoreViewState').mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');
      const applyPinnedTabDefaultSpy = jest.spyOn(component as any, 'applyPinnedTabDefault').mockImplementation();
      const loadCurrentTabStateSpy = jest.spyOn(component as any, 'loadCurrentTabState').mockImplementation();

      await (component as any).initializeState();

      expect(restoreViewStateSpy).toHaveBeenCalled();
      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(applyPinnedTabDefaultSpy).toHaveBeenCalledWith('my');
      expect(loadCurrentTabStateSpy).not.toHaveBeenCalled();
    });

    it('should sync service tab from view state when only component state was restored', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(false);
      sessionStorage.setItem(
        'my-projects-component-state',
        JSON.stringify({
          selectedTab: 'my',
          myProjectsFirst: 20,
          myProjectsRows: 10,
          allProjectsFirst: 0,
          allProjectsRows: 10,
          isTableView: true,
          sortField: 'agreement_id',
          sortOrder: -1
        })
      );
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadCurrentTabStateSpy = jest.spyOn(component as any, 'loadCurrentTabState').mockImplementation();

      await (component as any).initializeState();

      expect(mockMyProjectsService.myProjectsFilterItem()?.id).toBe('my');
      expect(component.myProjectsFilterItem()?.id).toBe('my');
      expect(loadCurrentTabStateSpy).toHaveBeenCalled();
    });

    it('should force my tab when query has tab=my and persisted state was restored', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(true);
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' } as any);
      jest.spyOn(component as any, 'restoreViewState').mockReturnValue(false);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const updatePendingSpy = jest.spyOn(component as any, 'updatePendingScrollFromStoredTabScroll').mockImplementation();
      const loadCurrentTabStateSpy = jest.spyOn(component as any, 'loadCurrentTabState').mockImplementation();
      queryParamGet.mockImplementation((k: string) => (k === 'tab' ? 'my' : null));

      await (component as any).initializeState();

      expect(component.myProjectsFilterItem()?.id).toBe('my');
      expect(component.selectedTab()).toBe('my');
      expect(mockMyProjectsService.myProjectsFilterItem()?.id).toBe('my');
      expect(updatePendingSpy).toHaveBeenCalled();
      expect(loadCurrentTabStateSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { tab: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });

    it('should call applyPinnedTabDefault(my) when query has tab=my and there is no restored state', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(false);
      jest.spyOn(component as any, 'restoreViewState').mockReturnValue(false);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const applyPinnedTabDefaultSpy = jest.spyOn(component as any, 'applyPinnedTabDefault').mockImplementation();
      queryParamGet.mockImplementation((k: string) => (k === 'tab' ? 'my' : null));

      await (component as any).initializeState();

      expect(applyPinnedTabDefaultSpy).toHaveBeenCalledWith('my');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { tab: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });
  });

  describe('restoreViewState', () => {
    it('should return false when there is no persisted view state', () => {
      const result = (component as any).restoreViewState();

      expect(result).toBe(false);
    });

    it('should restore persisted view state values', () => {
      sessionStorage.setItem(
        'my-projects-component-state',
        JSON.stringify({
          allProjectsFirst: 20,
          allProjectsRows: 25,
          myProjectsFirst: 5,
          myProjectsRows: 15,
          searchValue: 'abc',
          isQuerySentToBackend: true,
          isTableView: false,
          sortField: 'description',
          sortOrder: 1,
          selectedTab: 'my'
        })
      );

      const result = (component as any).restoreViewState();

      expect(result).toBe(true);
      expect(component.allProjectsFirst()).toBe(20);
      expect(component.allProjectsRows()).toBe(25);
      expect(component.myProjectsFirst()).toBe(5);
      expect(component.myProjectsRows()).toBe(15);
      expect(component.searchValue).toBe('abc');
      expect(component['_isQuerySentToBackend']()).toBe(true);
      expect(component.isTableView()).toBe(false);
      expect(component.sortField()).toBe('description');
      expect(component.sortOrder()).toBe(1);
      expect(component.selectedTab()).toBe('my');
    });

    it('should restore default values when persisted state is partial', () => {
      sessionStorage.setItem('my-projects-component-state', JSON.stringify({ selectedTab: 'other' }));

      const result = (component as any).restoreViewState();

      expect(result).toBe(true);
      expect(component.allProjectsFirst()).toBe(0);
      expect(component.allProjectsRows()).toBe(10);
      expect(component.myProjectsFirst()).toBe(0);
      expect(component.myProjectsRows()).toBe(10);
      expect(component.searchValue).toBe('');
      expect(component['_isQuerySentToBackend']()).toBe(false);
      expect(component.isTableView()).toBe(true);
      expect(component.sortField()).toBe('agreement_id');
      expect(component.sortOrder()).toBe(-1);
      expect(component.selectedTab()).toBe('all');
    });

    it('should return false and remove invalid persisted view state', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      sessionStorage.setItem('my-projects-component-state', '{invalid-json');

      const result = (component as any).restoreViewState();

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(sessionStorage.getItem('my-projects-component-state')).toBeNull();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('loadCurrentTabState', () => {
    it('should apply filters when filters exist even without query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(true);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' } as any);
      component.allProjectsFirst.set(20);
      component.allProjectsRows.set(10);
      component.sortField.set('');
      mockMyProjectsService.searchInput.set('');

      (component as any).loadCurrentTabState();

      expect(component['_isQuerySentToBackend']()).toBe(false);
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith({
        page: 3,
        limit: 10,
        sortField: undefined,
        sortOrder: -1,
        query: undefined
      });
    });

    it('should apply filters with current my-projects query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' } as any);
      component.searchValue = 'term';
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);
      component.sortField.set('agreement_id');
      component.sortOrder.set(1);

      (component as any).loadCurrentTabState();

      expect(component['_isQuerySentToBackend']()).toBe(true);
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortField: 'contract-code',
        sortOrder: 1,
        query: 'term'
      });
    });

    it('should load my projects with pagination when there are no filters or query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' } as any);
      component.searchValue = '';
      const loadMyProjectsWithPaginationSpy = jest.spyOn(component as any, 'loadMyProjectsWithPagination').mockImplementation();
      const loadAllProjectsWithPaginationSpy = jest.spyOn(component as any, 'loadAllProjectsWithPagination').mockImplementation();

      (component as any).loadCurrentTabState();

      expect(loadMyProjectsWithPaginationSpy).toHaveBeenCalledWith(undefined);
      expect(loadAllProjectsWithPaginationSpy).not.toHaveBeenCalled();
    });

    it('should load all projects with pagination when active tab is all and there are no filters or query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' } as any);
      mockMyProjectsService.searchInput.set('');
      const loadMyProjectsWithPaginationSpy = jest.spyOn(component as any, 'loadMyProjectsWithPagination').mockImplementation();
      const loadAllProjectsWithPaginationSpy = jest.spyOn(component as any, 'loadAllProjectsWithPagination').mockImplementation();

      (component as any).loadCurrentTabState();

      expect(loadAllProjectsWithPaginationSpy).toHaveBeenCalledWith(undefined);
      expect(loadMyProjectsWithPaginationSpy).not.toHaveBeenCalled();
    });
  });

  describe('togglePin', () => {
    it('should pin all tab', async () => {
      component.pinnedTab.set('my');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      jest.useFakeTimers();

      const promise = component.togglePin('all');
      await promise;
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('contract-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(mockMyProjectsService.cleanMultiselects).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should pin my tab', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');
      jest.useFakeTimers();

      const promise = component.togglePin('my');
      await promise;
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('contract-table', 'tab', { all: false, self: true });
      expect(component.pinnedTab()).toBe('my');
      expect(mockMyProjectsService.cleanMultiselects).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should unpin when clicking same tab', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      jest.useFakeTimers();

      const promise = component.togglePin('all');
      await promise;
      jest.runAllTimers();

      expect(component.pinnedTab()).toBe('all');
      jest.useRealTimers();
    });

    it('should handle error when toggling pin', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.PATCH_Configuration.mockRejectedValue(new Error('API Error'));
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      jest.useFakeTimers();

      const promise = component.togglePin('all');
      await promise;
      jest.runAllTimers();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalled();
      expect(component.loadingPin()).toBe(false);
      jest.useRealTimers();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('isPinned', () => {
    it('should return true when tab is pinned', () => {
      component.pinnedTab.set('all');
      expect(component.isPinned('all')).toBe(true);
    });

    it('should return false when tab is not pinned', () => {
      component.pinnedTab.set('all');
      expect(component.isPinned('my')).toBe(false);
    });
  });

  describe('onActiveItemChange', () => {
    it('should switch to my projects', () => {
      const event = { id: 'my', label: 'My Projects' };
      jest.spyOn(component, 'loadMyProjects');

      component.onActiveItemChange(event);

      expect(component.myProjectsFilterItem()?.id).toBe('my');
      expect(component.selectedTab()).toBe('my');
      expect(component.myProjectsFirst()).toBe(0);
      expect(component.searchValue).toBe('');
      expect(mockMyProjectsService.resetFilters).toHaveBeenCalled();
      expect(component.loadMyProjects).toHaveBeenCalled();
    });

    it('should switch to all projects', () => {
      const event = { id: 'all', label: 'All Projects' };
      jest.spyOn(component, 'loadAllProjects');

      component.onActiveItemChange(event);

      expect(component.myProjectsFilterItem()?.id).toBe('all');
      expect(component.selectedTab()).toBe('all');
      expect(component.allProjectsFirst()).toBe(0);
      expect(component.searchValue).toBe('');
      expect(mockMyProjectsService.resetFilters).toHaveBeenCalled();
      expect(component.loadAllProjects).toHaveBeenCalled();
    });
  });

  describe('loadMyProjects', () => {
    it('should call service main with current-user true', () => {
      component.loadMyProjects();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(expect.objectContaining({ 'current-user': true }));
    });

    it('should include order-field funding_type when sorting by Project Type column', () => {
      component.sortField.set('funding_type');
      component.sortOrder.set(-1);
      component.loadMyProjects();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'funding-type', direction: 'DESC' })
      );
    });

    it('should include order-field and ASC when sortField set and sortOrder 1', () => {
      component.sortField.set('description');
      component.sortOrder.set(1);
      component.loadMyProjects();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'project-name', direction: 'ASC' })
      );
    });

    it('should not include order-field when sortField is empty', () => {
      component.sortField.set('');
      component.sortOrder.set(1);
      component.loadMyProjects();
      const call = mockMyProjectsService.main.mock.calls[0][0];
      expect(call['order-field']).toBeUndefined();
      expect(call['direction']).toBeUndefined();
    });
  });

  describe('loadAllProjects', () => {
    it('should call service main with current-user false', () => {
      component.loadAllProjects();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(expect.objectContaining({ 'current-user': false }));
    });

    it('should include order-field funding_type when sorting by Project Type column', () => {
      component.sortField.set('funding_type');
      component.sortOrder.set(1);
      component.loadAllProjects();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'funding-type', direction: 'ASC' })
      );
    });

    it('should include order-field and ASC when sortOrder 1', () => {
      component.sortField.set('agreement_id');
      component.sortOrder.set(1);
      component.loadAllProjects();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'contract-code', direction: 'ASC' })
      );
    });

    it('should not include order-field when sortField is empty', () => {
      component.sortField.set('');
      component.loadAllProjects();
      const call = mockMyProjectsService.main.mock.calls[0][0];
      expect(call['order-field']).toBeUndefined();
    });
  });

  describe('onPinIconClick', () => {
    it('should stop propagation and toggle pin', () => {
      const event = { stopPropagation: jest.fn() } as any;
      jest.spyOn(component, 'togglePin').mockResolvedValue();

      component.onPinIconClick('all', event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.togglePin).toHaveBeenCalledWith('all');
    });
  });

  describe('setSearchInputFilter', () => {
    it('should set search value for my projects', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });

      component.setSearchInputFilter('test search');

      expect(component.searchValue).toBe('test search');
      expect(component.myProjectsFirst()).toBe(0);
    });

    it('should set search input for all projects', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });

      component.setSearchInputFilter('test search');

      expect(mockMyProjectsService.searchInput()).toBe('test search');
      expect(component.allProjectsFirst()).toBe(0);
    });

    it('should pass undefined query and not set isQuerySentToBackend when query is empty', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.setSearchInputFilter('');
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ query: undefined })
      );
    });

    it('should pass undefined sortField when sortField is empty', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.sortField.set('');
      component.setSearchInputFilter('x');
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: undefined })
      );
    });
  });

  describe('handleRemoveFilter', () => {
    it('should call removeFilter and applyFilters with current query and pagination', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component['_searchValue'].set('q');
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);
      component.sortField.set('agreement_id');
      component.sortOrder.set(-1);

      component.handleRemoveFilter('Status', 1);

      expect(mockMyProjectsService.removeFilter).toHaveBeenCalledWith('Status', 1);
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10, query: 'q' })
      );
    });

    it('should use service searchInput for all tab', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('all-query');
      component.allProjectsFirst.set(20);
      component.allProjectsRows.set(10);

      component.handleRemoveFilter('Lever');

      expect(mockMyProjectsService.removeFilter).toHaveBeenCalledWith('Lever', undefined);
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 10, query: 'all-query' })
      );
    });

    it('should pass undefined sortField when sortField is empty', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.sortField.set('');
      component.myProjectsRows.set(10);
      component.handleRemoveFilter('Status');
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: undefined })
      );
    });
  });

  describe('handleClearFilters', () => {
    it('should clear search, reset filters and load my projects when on my tab', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = 'old';

      component.handleClearFilters();

      expect(component.searchValue).toBe('');
      expect(mockMyProjectsService.resetFilters).toHaveBeenCalled();
      expect(component.myProjectsFirst()).toBe(0);
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(expect.objectContaining({ 'current-user': true }));
    });

    it('should clear and load all projects when on all tab', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('query');

      component.handleClearFilters();

      expect(mockMyProjectsService.resetFilters).toHaveBeenCalled();
      expect(component.allProjectsFirst()).toBe(0);
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(expect.objectContaining({ 'current-user': false }));
    });
  });

  describe('showFiltersSidebar', () => {
    it('should call service showFilterSidebar', () => {
      component.showFiltersSidebar();
      expect(mockMyProjectsService.showFilterSidebar).toHaveBeenCalled();
    });
  });

  describe('showConfigurationsSidebar', () => {
    it('should be callable without error', () => {
      expect(() => component.showConfigurationsSidebar()).not.toThrow();
    });
  });

  describe('toggleTableView', () => {
    it('should set isTableView to true', () => {
      component.isTableView.set(false);
      component.toggleTableView();
      expect(component.isTableView()).toBe(true);
    });
  });

  describe('toggleCardView', () => {
    it('should set isTableView to false', () => {
      component.isTableView.set(true);
      component.toggleCardView();
      expect(component.isTableView()).toBe(false);
    });
  });

  describe('openProject', () => {
    it('should navigate to project detail', () => {
      const project = { agreement_id: 'A001' } as any;
      component.openProject(project);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/project-detail', 'A001', 'project-dashboard']);
    });

    it('should not navigate if agreement_id is missing', () => {
      const project = {} as any;
      component.openProject(project);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for submitted', () => {
      const result = { result_status: { name: 'Submitted' } } as any;
      expect(component.getStatusColor(result)).toBe('#1689CA');
    });

    it('should return correct color for accepted', () => {
      const result = { result_status: { name: 'Accepted' } } as any;
      expect(component.getStatusColor(result)).toBe('#7CB580');
    });

    it('should return correct color for editing', () => {
      const result = { result_status: { name: 'Editing' } } as any;
      expect(component.getStatusColor(result)).toBe('#F58220');
    });

    it('should return default color for unknown status', () => {
      const result = { result_status: { name: 'Unknown' } } as any;
      expect(component.getStatusColor(result)).toBe('#8D9299');
    });

    it('should return default color when status is missing', () => {
      const result = {} as any;
      expect(component.getStatusColor(result)).toBe('#8D9299');
    });
  });

  describe('openResult', () => {
    it('should navigate to result', () => {
      const result = { platform_code: 'STAR', result_official_code: '001' } as any;
      component.openResult(result);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/result', 'STAR-001']);
    });
  });

  describe('openResultByYear', () => {
    it('should navigate to result with year', () => {
      const result = { platform_code: 'STAR', result_official_code: '001' } as any;
      component.openResultByYear(result, 2024);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/result', 'STAR-001', 2024]);
    });
  });

  describe('getScrollHeight', () => {
    it('should return small screen height', () => {
      mockCacheService.hasSmallScreen.mockReturnValue(true);
      expect(component.getScrollHeight()).toBe('calc(100vh - 410px)');
    });

    it('should return normal screen height', () => {
      mockCacheService.hasSmallScreen.mockReturnValue(false);
      expect(component.getScrollHeight()).toBe('calc(100vh - 440px)');
    });
  });

  describe('getLoadingState', () => {
    it('should return service loading state', () => {
      mockMyProjectsService.loading.set(true);
      expect(component.getLoadingState()).toBe(true);
    });
  });

  describe('getCurrentProjects', () => {
    it('should return filtered projects', () => {
      const projects = [{ agreement_id: 'A001' }] as any;
      mockMyProjectsService.list.set(projects);
      expect(component.getCurrentProjects()).toEqual(projects);
    });

    it('should return projects with funding_type for Project Type column display', () => {
      const projects = [
        { agreement_id: 'A001', funding_type: 'W1/W2' },
        { agreement_id: 'A002', funding_type: null }
      ] as any;
      mockMyProjectsService.list.set(projects);
      expect(component.getCurrentProjects()).toEqual(projects);
      expect(component.getCurrentProjects()[0].funding_type).toBe('W1/W2');
      expect(component.getCurrentProjects()[1].funding_type).toBeNull();
    });
  });

  describe('getCurrentFirst', () => {
    it('should return myProjectsFirst for my tab', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(10);
      expect(component.getCurrentFirst()).toBe(10);
    });

    it('should return allProjectsFirst for all tab', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(20);
      expect(component.getCurrentFirst()).toBe(20);
    });
  });

  describe('getCurrentRows', () => {
    it('should return myProjectsRows for my tab', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsRows.set(15);
      expect(component.getCurrentRows()).toBe(15);
    });

    it('should return allProjectsRows for all tab', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsRows.set(25);
      expect(component.getCurrentRows()).toBe(25);
    });
  });

  describe('onCurrentPageChange', () => {
    it('should call onPageChange', () => {
      jest.spyOn(component, 'onPageChange');
      const event = { first: 10, rows: 20 } as any;
      component.onCurrentPageChange(event);
      expect(component.onPageChange).toHaveBeenCalledWith(event);
    });
  });

  describe('onAllProjectsPageChange', () => {
    it('should use event.first when rows are unchanged (first must align to rows grid)', () => {
      mockMyProjectsService.totalRecords.set(120);
      component.allProjectsRows.set(40);
      component.allProjectsFirst.set(40);
      const event = { first: 80, rows: 40 } as any;
      component.onAllProjectsPageChange(event);
      expect(component.allProjectsFirst()).toBe(80);
      expect(component.allProjectsRows()).toBe(40);
    });

    it('should align first when rows per page changes', () => {
      component.allProjectsFirst.set(40);
      component.allProjectsRows.set(10);
      const event = { first: 0, rows: 25 } as any;
      component.onAllProjectsPageChange(event);
      expect(component.allProjectsFirst()).toBe(25);
      expect(component.allProjectsRows()).toBe(25);
    });

    it('should clamp first to last standard page when aligned index exceeds total (floor((total-1)/rows)*rows)', () => {
      mockMyProjectsService.totalRecords.set(30);
      component.allProjectsFirst.set(40);
      component.allProjectsRows.set(10);
      jest.spyOn(component as any, 'loadAllProjectsWithPagination').mockImplementation();

      component.onAllProjectsPageChange({ first: 0, rows: 25 });

      expect(component.allProjectsFirst()).toBe(25);
      expect(component.allProjectsRows()).toBe(25);
    });

    it('should clamp same-rows navigation to lastPageFirst for total 33 and rows 10', () => {
      mockMyProjectsService.totalRecords.set(33);
      component.allProjectsFirst.set(0);
      component.allProjectsRows.set(10);
      jest.spyOn(component as any, 'loadAllProjectsWithPagination').mockImplementation();

      component.onAllProjectsPageChange({ first: 50, rows: 10 });

      expect(component.allProjectsFirst()).toBe(30);
    });

    it('should use safeRows of 10 when event.rows is 0 (alignFirstAfterRowsChange)', () => {
      mockMyProjectsService.totalRecords.set(100);
      component.allProjectsFirst.set(25);
      component.allProjectsRows.set(10);
      jest.spyOn(component as any, 'loadAllProjectsWithPagination').mockImplementation();

      component.onAllProjectsPageChange({ first: 0, rows: 0 });

      // newRows 0 → safeRows 10; floor(25/10)*10 = 20
      expect(component.allProjectsFirst()).toBe(20);
      expect(component.allProjectsRows()).toBe(0);
    });
  });

  describe('orderedFilterItems', () => {
    it('should return my first when my is pinned', () => {
      component.pinnedTab.set('my');
      const items = component.orderedFilterItems();
      expect(items[0].id).toBe('my');
      expect(items[1].id).toBe('all');
    });

    it('should return all first when all is pinned', () => {
      component.pinnedTab.set('all');
      const items = component.orderedFilterItems();
      expect(items[0].id).toBe('all');
      expect(items[1].id).toBe('my');
    });
  });

  describe('filteredProjects', () => {
    it('should return all projects without filtering when hasFilters is true', () => {
      const projects = [{ agreement_id: 'A001' }, { agreement_id: 'A002' }] as any;
      mockMyProjectsService.list.set(projects);
      mockMyProjectsService.hasFilters.mockReturnValue(true);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = 'test';
      expect(component.filteredProjects()).toEqual(projects);
    });

    it('should return all projects without filtering when query was sent to backend', () => {
      const projects = [{ agreement_id: 'A001' }] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.setSearchInputFilter('sent');
      expect(component.filteredProjects()).toEqual(projects);
    });

    it('should return all projects when no search term for my tab', () => {
      const projects = [{ agreement_id: 'A001' }, { agreement_id: 'A002' }] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = '';

      expect(component.filteredProjects()).toEqual(projects);
    });

    it('should return all projects when no search term for all tab', () => {
      const projects = [{ agreement_id: 'A001' }, { agreement_id: 'A002' }] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('');

      expect(component.filteredProjects()).toEqual(projects);
    });

    it('should filter projects by full_name for my tab', () => {
      const projects = [
        { agreement_id: 'A001', full_name: 'Test Project' },
        { agreement_id: 'A002', full_name: 'Other Project' }
      ] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = 'test';

      const filtered = component.filteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].agreement_id).toBe('A001');
    });

    it('should filter projects by agreement_id', () => {
      const projects = [
        { agreement_id: 'A001', full_name: 'Test' },
        { agreement_id: 'A002', full_name: 'Other' }
      ] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('a001');

      const filtered = component.filteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].agreement_id).toBe('A001');
    });

    it('should filter projects by description', () => {
      const projects = [
        { agreement_id: 'A001', description: 'Test Description' },
        { agreement_id: 'A002', description: 'Other Description' }
      ] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('test');

      const filtered = component.filteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].agreement_id).toBe('A001');
    });

    it('should filter projects by projectDescription', () => {
      const projects = [
        { agreement_id: 'A001', projectDescription: 'Test Project' },
        { agreement_id: 'A002', projectDescription: 'Other Project' }
      ] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('test');

      const filtered = component.filteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].agreement_id).toBe('A001');
    });

    it('should filter projects by principal_investigator', () => {
      const projects = [
        { agreement_id: 'A001', principal_investigator: 'John Doe' },
        { agreement_id: 'A002', principal_investigator: 'Jane Smith' }
      ] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('john');

      const filtered = component.filteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].agreement_id).toBe('A001');
    });

    it('should filter projects when agreement_id is null', () => {
      const projects = [
        { agreement_id: null, full_name: 'Test Project' },
        { agreement_id: 'A002', full_name: 'Other Project' }
      ] as any;
      mockMyProjectsService.list.set(projects);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = 'test';

      const filtered = component.filteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].full_name).toBe('Test Project');
    });
  });

  describe('searchValue', () => {
    it('should get search value', () => {
      component['_searchValue'].set('test');
      expect(component.searchValue).toBe('test');
    });

    it('should set search value', () => {
      component.searchValue = 'new value';
      expect(component['_searchValue']()).toBe('new value');
    });
  });

  describe('onPageChange', () => {
    it('should align first from anchor when rows per page changes (not use event.first when Prime sends 0)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(40);
      component.allProjectsRows.set(10);
      component.onPageChange({ first: 0, rows: 25 });
      expect(component.allProjectsFirst()).toBe(25);
      expect(component.allProjectsRows()).toBe(25);
    });

    it('should set first from event when only the page changes (same rows)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsRows.set(10);
      component.onPageChange({ first: 10, rows: 10 });
      expect(component.allProjectsFirst()).toBe(10);
      expect(component.allProjectsRows()).toBe(10);
    });

    it('should set first and rows on page change when rows unchanged from default (first from event)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.onPageChange({ first: 10, rows: 20 });
      expect(component.allProjectsFirst()).toBe(0);
      expect(component.allProjectsRows()).toBe(20);
    });

    it('should set default values on page change (undefined)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.onPageChange({ first: undefined, rows: undefined });
      expect(component.allProjectsFirst()).toBe(0);
      expect(component.allProjectsRows()).toBe(10);
    });

    it('should align first for my tab when rows per page changes', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(40);
      component.myProjectsRows.set(10);
      component.onPageChange({ first: 0, rows: 25 });
      expect(component.myProjectsFirst()).toBe(25);
      expect(component.myProjectsRows()).toBe(25);
    });

    it('should set first from event for my tab when only page changes (aligned to rows grid)', () => {
      mockMyProjectsService.totalRecords.set(100);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsRows.set(10);
      component.onPageChange({ first: 20, rows: 10 });
      expect(component.myProjectsFirst()).toBe(20);
      expect(component.myProjectsRows()).toBe(10);
    });

    it('should set default values for my projects tab when undefined', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.onPageChange({ first: undefined, rows: undefined });
      expect(component.myProjectsFirst()).toBe(0);
      expect(component.myProjectsRows()).toBe(10);
    });

    it('should call applyFilters on page change when filters are active (preserves status etc.)', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(true);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(20);
      component.allProjectsRows.set(10);
      component.sortField.set('agreement_id');
      component.sortOrder.set(-1);

      component.onPageChange({ first: 30, rows: 10 });

      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 4, limit: 10, sortField: 'contract-code', sortOrder: -1, query: undefined })
      );
      expect(mockMyProjectsService.main).not.toHaveBeenCalled();
    });

    it('should call applyFilters on page change when search query is set on all tab', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      mockMyProjectsService.searchInput.set('find-me');
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(0);
      component.allProjectsRows.set(10);

      component.onPageChange({ first: 10, rows: 10 });

      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10, query: 'find-me' })
      );
    });

    it('should not refetch when paginator repeats the same first and rows (avoids duplicate GET_FindContracts)', () => {
      jest.clearAllMocks();
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(0);
      component.allProjectsRows.set(10);

      component.onPageChange({ first: 0, rows: 10 });

      expect(mockMyProjectsService.applyFilters).not.toHaveBeenCalled();
      expect(mockMyProjectsService.main).not.toHaveBeenCalled();
    });
  });

  describe('onAllProjectsPageChange (defaults)', () => {
    it('should use event.first when rows unchanged with explicit rows (aligned to grid)', () => {
      mockMyProjectsService.totalRecords.set(120);
      component.allProjectsRows.set(40);
      const event = { first: 80, rows: 40 } as any;
      component.onAllProjectsPageChange(event);
      expect(component.allProjectsFirst()).toBe(80);
      expect(component.allProjectsRows()).toBe(40);
    });

    it('should set default values when undefined', () => {
      const event = { first: undefined, rows: undefined } as any;
      component.onAllProjectsPageChange(event);
      expect(component.allProjectsFirst()).toBe(0);
      expect(component.allProjectsRows()).toBe(10);
    });
  });

  describe('onSort', () => {
    it('should set sort, reset first and call applyFilters when on my tab with search query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component['_searchValue'].set('my-query');
      component.myProjectsFirst.set(10);
      component.myProjectsRows.set(10);

      component.onSort({ field: 'description', order: 1 });

      expect(component.sortField()).toBe('description');
      expect(component.sortOrder()).toBe(1);
      expect(component.myProjectsFirst()).toBe(0);
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10, query: 'my-query', sortField: 'project-name', sortOrder: 1 })
      );
    });

    it('should call applyFilters when on all tab with search query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('all-query');

      component.onSort({ field: 'agreement_id', order: -1 });

      expect(component.allProjectsFirst()).toBe(0);
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10, query: 'all-query', sortField: 'contract-code', sortOrder: -1 })
      );
    });

    it('should use field as order-field when not in mapping (mapTableFieldToApiField fallback)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('');
      component.onSort({ field: 'custom_field', order: 1 });
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'custom_field', direction: 'ASC' })
      );
    });

    it('should map funding_type to order-field when sorting Project Type column on all tab', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('');
      component.onSort({ field: 'funding_type', order: -1 });
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'funding-type', direction: 'DESC' })
      );
    });

    it('should map funding_type to sortField when sorting Project Type column with active search on my tab', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component['_searchValue'].set('grant');
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);

      component.onSort({ field: 'funding_type', order: 1 });

      expect(component.sortField()).toBe('funding_type');
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'funding-type', sortOrder: 1, query: 'grant' })
      );
    });

    it('should call loadAllProjectsWithPagination with ASC when order 1', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('');
      component.onSort({ field: 'start_date', order: 1 });
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'ASC' })
      );
    });

    it('should call loadMyProjectsWithPagination without query when search empty', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component['_searchValue'].set('');
      component.onSort({ field: 'agreement_id', order: -1 });
      const call = mockMyProjectsService.main.mock.calls[0][0];
      expect(call.query).toBeUndefined();
      expect(call.direction).toBe('DESC');
    });

    it('should map is_pool_funding_contributor to pool-funding-contributor when sorting by the Pool Funding column', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('');

      component.onSort({ field: 'is_pool_funding_contributor', order: 1 });

      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'order-field': 'pool-funding-contributor', direction: 'ASC' })
      );
    });
  });

  describe('onPoolFundingOnlyChange', () => {
    it('updates tableFilters.poolFundingOnly when the sidebar checkbox toggles on', () => {
      const initial = { poolFundingOnly: false, contractCode: 'A001' };
      const tableFilters = signal<any>(initial);
      mockMyProjectsService.tableFilters = tableFilters as any;

      component.onPoolFundingOnlyChange(true);

      expect(tableFilters().poolFundingOnly).toBe(true);
      expect(tableFilters().contractCode).toBe('A001');
    });

    it('updates tableFilters.poolFundingOnly when the sidebar checkbox toggles off', () => {
      const initial = { poolFundingOnly: true, levers: [] };
      const tableFilters = signal<any>(initial);
      mockMyProjectsService.tableFilters = tableFilters as any;

      component.onPoolFundingOnlyChange(false);

      expect(tableFilters().poolFundingOnly).toBe(false);
    });

    it('coerces non-boolean truthy/falsy values', () => {
      const tableFilters = signal<any>({ poolFundingOnly: false });
      mockMyProjectsService.tableFilters = tableFilters as any;

      component.onPoolFundingOnlyChange('yes' as unknown as boolean);
      expect(tableFilters().poolFundingOnly).toBe(true);

      component.onPoolFundingOnlyChange(0 as unknown as boolean);
      expect(tableFilters().poolFundingOnly).toBe(false);
    });
  });

  describe('applyFilters', () => {
    it('should call applyFilters with current query when on my tab with search value', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = 'search-term';
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);

      component.applyFilters();

      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10, query: 'search-term' })
      );
    });

    it('should call applyFilters for all tab with service searchInput', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('all-search');
      component.allProjectsFirst.set(20);
      component.allProjectsRows.set(10);

      component.applyFilters();

      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 10, query: 'all-search' })
      );
    });

    it('should call applyFilters with undefined query when no search (currentQuery falsy branch)', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.searchValue = '';
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);
      component.applyFilters();
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ query: undefined })
      );
    });

    it('should call applyFilters with undefined sortField when sortField is empty', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.sortField.set('');
      component.allProjectsRows.set(10);
      component.applyFilters();
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: undefined })
      );
    });

    it('should compute page when rows is 0 (uses rows || 1 in getCurrentPage)', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(0);
      component.sortField.set('agreement_id');
      component.applyFilters();
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 0 })
      );
    });

    it('should compute page when first is undefined (first ?? 0 branch)', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(undefined as any);
      component.myProjectsRows.set(10);
      component.applyFilters();
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  describe('loadMyProjectsWithPagination / loadAllProjectsWithPagination (rows || 1)', () => {
    it('should use rows||1 when myProjectsRows is 0 (loadMyProjectsWithPagination)', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(0);
      component.handleClearFilters();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'current-user': true, page: 1, limit: 0 })
      );
    });

    it('should use rows||1 when allProjectsRows is 0 (loadAllProjectsWithPagination)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(0);
      component.allProjectsRows.set(0);
      component.handleClearFilters();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'current-user': false, page: 1, limit: 0 })
      );
    });

    it('onSort my tab with myProjectsRows 0 hits (myProjectsRows() || 1)', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(0);
      component.onSort({ field: 'agreement_id', order: -1 });
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 0 })
      );
    });

    it('onSort all tab with allProjectsRows 0 hits (allProjectsRows() || 1)', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(0);
      component.allProjectsRows.set(0);
      mockMyProjectsService.searchInput.set('');
      component.onSort({ field: 'agreement_id', order: 1 });
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 0 })
      );
    });

    it('loadMyProjectsWithPagination with myProjectsFirst undefined hits else first=0', () => {
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.myProjectsFirst.set(undefined as any);
      component.myProjectsRows.set(10);
      (component as any).loadMyProjectsWithPagination();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 })
      );
    });

    it('loadAllProjectsWithPagination with allProjectsFirst undefined hits else first=0', () => {
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.allProjectsFirst.set(undefined as any);
      component.allProjectsRows.set(10);
      (component as any).loadAllProjectsWithPagination();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 })
      );
    });
  });

  describe('coverage: view state, scroll helpers, pagination query', () => {
    it('restoreViewState returns false and clears storage on invalid JSON', () => {
      sessionStorage.setItem('my-projects-component-state', 'not-json');
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      expect((component as any).restoreViewState()).toBe(false);
      expect(sessionStorage.getItem('my-projects-component-state')).toBeNull();
      warn.mockRestore();
    });

    it('getTableScrollContainer returns null when matching node is not HTMLElement', () => {
      const host = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'p-datatable-table-container');
      host.appendChild(svg);
      (component as any).tableRppScope = { nativeElement: host };
      expect((component as any).getTableScrollContainer()).toBeNull();
    });

    it('readActiveTabScrollTop uses table container scrollTop', () => {
      const tableContainer = document.createElement('div');
      tableContainer.className = 'p-datatable-table-container';
      tableContainer.scrollTop = 17;
      const host = document.createElement('div');
      host.appendChild(tableContainer);
      (component as any).tableRppScope = { nativeElement: host };
      expect((component as any).readActiveTabScrollTop()).toBe(17);
    });

    it('readStoredScrollPair returns zeros when JSON parse fails', () => {
      sessionStorage.setItem('my-projects-component-state', 'x');
      expect((component as any).readStoredScrollPair()).toEqual({ my: 0, all: 0 });
    });

    it('mergeScrollPositionsForPersist uses live scroll when container exists (my tab)', () => {
      sessionStorage.setItem(
        'my-projects-component-state',
        JSON.stringify({ tableScrollTopMy: 0, tableScrollTopAll: 9 })
      );
      const tableContainer = document.createElement('div');
      tableContainer.className = 'p-datatable-table-container';
      tableContainer.scrollTop = 21;
      const host = document.createElement('div');
      host.appendChild(tableContainer);
      (component as any).tableRppScope = { nativeElement: host };
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      const r = (component as any).mergeScrollPositionsForPersist();
      expect(r.scrollMy).toBe(21);
      expect(r.scrollAll).toBe(9);
    });

    it('mergeScrollPositionsForPersist uses live scroll for all tab and keeps my from storage', () => {
      sessionStorage.setItem(
        'my-projects-component-state',
        JSON.stringify({ tableScrollTopMy: 3, tableScrollTopAll: 0 })
      );
      const tableContainer = document.createElement('div');
      tableContainer.className = 'p-datatable-table-container';
      tableContainer.scrollTop = 40;
      const host = document.createElement('div');
      host.appendChild(tableContainer);
      (component as any).tableRppScope = { nativeElement: host };
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      const r = (component as any).mergeScrollPositionsForPersist();
      expect(r.scrollMy).toBe(3);
      expect(r.scrollAll).toBe(40);
    });

    it('mergeScrollPositionsForPersist without container uses session scroll only', () => {
      sessionStorage.setItem(
        'my-projects-component-state',
        JSON.stringify({ tableScrollTopMy: 2, tableScrollTopAll: 5 })
      );
      const host = document.createElement('div');
      (component as any).tableRppScope = { nativeElement: host };
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      const r = (component as any).mergeScrollPositionsForPersist();
      expect(r.scrollMy).toBe(2);
      expect(r.scrollAll).toBe(5);
    });

    it('onActiveItemChange stores scroll for my tab when switching away', () => {
      jest.spyOn(component as any, 'readActiveTabScrollTop').mockReturnValue(66);
      component.isTableView.set(true);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      (component as any).onActiveItemChange({ id: 'all', label: 'All Projects' });
      expect((component as any).tableScrollTopMy).toBe(66);
    });

    it('onActiveItemChange stores scroll for all tab when switching away', () => {
      jest.spyOn(component as any, 'readActiveTabScrollTop').mockReturnValue(77);
      component.isTableView.set(true);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      (component as any).onActiveItemChange({ id: 'my', label: 'My Projects' });
      expect((component as any).tableScrollTopAll).toBe(77);
    });

    it('toggleTableView sets pendingScrollRestore when stored top > 0', () => {
      (component as any).tableScrollTopMy = 4;
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.isTableView.set(false);
      component.toggleTableView();
      expect((component as any).pendingScrollRestore()).toEqual({ top: 4 });
    });

    it('toggleCardView saves scrollTop for my tab', () => {
      jest.spyOn(component as any, 'readActiveTabScrollTop').mockReturnValue(11);
      component.isTableView.set(true);
      component.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component.toggleCardView();
      expect((component as any).tableScrollTopMy).toBe(11);
      expect(component.isTableView()).toBe(false);
    });

    it('toggleCardView saves scrollTop for all tab', () => {
      jest.spyOn(component as any, 'readActiveTabScrollTop').mockReturnValue(22);
      component.isTableView.set(true);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      component.toggleCardView();
      expect((component as any).tableScrollTopAll).toBe(22);
    });

    it('updatePendingScrollFromStoredTabScroll clears pending when not table view', () => {
      (component as any).pendingScrollRestore.set({ top: 1 });
      component.isTableView.set(false);
      (component as any).updatePendingScrollFromStoredTabScroll();
      expect((component as any).pendingScrollRestore()).toBeNull();
    });

    it('updatePendingScrollFromStoredTabScroll sets pending when table view and top > 0', () => {
      (component as any).tableScrollTopAll = 6;
      component.isTableView.set(true);
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      (component as any).updatePendingScrollFromStoredTabScroll();
      expect((component as any).pendingScrollRestore()).toEqual({ top: 6 });
    });

    it('scheduleTableScrollRestore sets scrollTop when container is found', () => {
      const el = document.createElement('div');
      jest.spyOn(component as any, 'getTableScrollContainer').mockReturnValue(el);
      jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
      (component as any).scheduleTableScrollRestore(88);
      expect(el.scrollTop).toBe(88);
      jest.restoreAllMocks();
    });

    it('scheduleTableScrollRestore stops after max attempts without container', () => {
      jest.spyOn(component as any, 'getTableScrollContainer').mockReturnValue(null);
      const raf = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
      (component as any).scheduleTableScrollRestore(1);
      expect(raf.mock.calls.length).toBeGreaterThanOrEqual(41);
      raf.mockRestore();
      jest.restoreAllMocks();
    });

    it('scrollRestoreEffect schedules table scroll when loading done and pending is set', async () => {
      const spy = jest.spyOn(component as any, 'scheduleTableScrollRestore').mockImplementation();
      mockMyProjectsService.loading.set(false);
      component.isTableView.set(true);
      (component as any).pendingScrollRestore.set({ top: 55 });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();
      expect(spy).toHaveBeenCalledWith(55);
      spy.mockRestore();
    });

    it('loadMyProjectsWithPagination adds query param when query provided', () => {
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);
      (component as any).loadMyProjectsWithPagination('hello');
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'hello', 'current-user': true })
      );
    });

    it('loadAllProjectsWithPagination adds query param when query provided', () => {
      component.allProjectsFirst.set(0);
      component.allProjectsRows.set(10);
      (component as any).loadAllProjectsWithPagination('world');
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'world', 'current-user': false })
      );
    });

    it('loadCurrentTabState calls loadMyProjectsWithPagination when my tab and no filters/query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'my', label: 'My Projects' });
      component['_searchValue'].set('');
      jest.clearAllMocks();
      (component as any).loadCurrentTabState();
      expect(mockMyProjectsService.main).toHaveBeenCalled();
      expect(mockMyProjectsService.applyFilters).not.toHaveBeenCalled();
    });

    it('loadCurrentTabState calls loadAllProjectsWithPagination when all tab and no filters/query', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(false);
      mockMyProjectsService.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      mockMyProjectsService.searchInput.set('');
      jest.clearAllMocks();
      (component as any).loadCurrentTabState();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ 'current-user': false })
      );
    });

    it('clampProjectsPaginatorFirst treats undefined first as 0 before flooring', () => {
      mockMyProjectsService.totalRecords.set(100);
      expect((component as any).clampProjectsPaginatorFirst(undefined as any, 10)).toBe(0);
    });

    it('initializeState uses myProjectsFilterItems[0] when restored selectedTab is all', async () => {
      mockMyProjectsService.restorePersistedState.mockReturnValue(false);
      sessionStorage.setItem(
        'my-projects-component-state',
        JSON.stringify({
          selectedTab: 'all',
          myProjectsFirst: 0,
          myProjectsRows: 10,
          allProjectsFirst: 0,
          allProjectsRows: 10,
          isTableView: true,
          sortField: 'agreement_id',
          sortOrder: -1
        })
      );
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      jest.spyOn(component as any, 'loadCurrentTabState').mockImplementation();

      await (component as any).initializeState();

      expect(mockMyProjectsService.myProjectsFilterItem()?.id).toBe('all');
    });

    it('refreshProjectsWithCurrentContext uses undefined sortField when sortField signal is empty', () => {
      mockMyProjectsService.hasFilters.mockReturnValue(true);
      component.sortField.set('');
      component.myProjectsFilterItem.set({ id: 'all', label: 'All Projects' });
      jest.clearAllMocks();
      (component as any).refreshProjectsWithCurrentContext();
      expect(mockMyProjectsService.applyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: undefined })
      );
    });

    it('loadMyProjectsWithPagination sets direction DESC when sortOrder is not 1', () => {
      component.sortField.set('agreement_id');
      component.sortOrder.set(-1);
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);
      jest.clearAllMocks();
      (component as any).loadMyProjectsWithPagination();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'DESC' })
      );
    });

    it('loadMyProjectsWithPagination sets direction ASC when sortOrder is 1', () => {
      component.sortField.set('agreement_id');
      component.sortOrder.set(1);
      component.myProjectsFirst.set(0);
      component.myProjectsRows.set(10);
      jest.clearAllMocks();
      (component as any).loadMyProjectsWithPagination();
      expect(mockMyProjectsService.main).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'ASC' })
      );
    });

    it('readStoredScrollPair applies defaults when only one scroll key is stored', () => {
      sessionStorage.setItem('my-projects-component-state', JSON.stringify({ tableScrollTopMy: 8 }));
      expect((component as any).readStoredScrollPair()).toEqual({ my: 8, all: 0 });

      sessionStorage.setItem('my-projects-component-state', JSON.stringify({ tableScrollTopAll: 9 }));
      expect((component as any).readStoredScrollPair()).toEqual({ my: 0, all: 9 });
    });
  });
});
