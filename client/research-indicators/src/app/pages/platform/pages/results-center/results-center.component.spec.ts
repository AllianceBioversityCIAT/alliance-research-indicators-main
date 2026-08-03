import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import ResultsCenterComponent from './results-center.component';
import { ResultsCenterService } from './results-center.service';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../shared/services/api.service';
import { ActionsService } from '../../../../shared/services/actions.service';
import { MenuItem } from 'primeng/api';
import { signal } from '@angular/core';

describe('ResultsCenterComponent', () => {
  let component: ResultsCenterComponent;
  let fixture: ComponentFixture<ResultsCenterComponent>;
  let mockResultsCenterService: any;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockActionsService: jest.Mocked<ActionsService>;
  let mockRouter: { navigate: jest.Mock };
  let queryParamGet: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers();

    mockResultsCenterService = {
      resetState: jest.fn(),
      primaryContractId: signal<string | null>(null),
      myResultsFilterItem: signal({ id: 'all', label: 'All Results' }),
      myResultsFilterItems: [
        { id: 'all', label: 'All Results' },
        { id: 'my', label: 'My Results' }
      ],
      clearAllFilters: jest.fn(),
      onSelectFilterTab: jest.fn(),
      onActiveItemChange: jest.fn(),
      resultsFilter: signal({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      }),
      appliedFilters: signal({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      }),
      searchInput: signal(''),
      showFiltersSidebar: signal(false),
      showConfigurationsSidebar: signal(false),
      main: jest.fn(),
      applyFilters: jest.fn(),
      cleanMultiselects: jest.fn(),
      cleanFilters: jest.fn(),
      pinnedTab: signal('all'),
      activateStatePersistence: jest.fn(),
      deactivateStatePersistence: jest.fn(),
      restorePersistedState: jest.fn().mockReturnValue(false),
      applyStatusFilterFromHomeLink: jest.fn()
    } as any;

    mockCacheService = {
      dataCache: signal({
        user: {
          sec_user_id: 123
        }
      })
    } as any;

    mockApiService = {
      GET_Configuration: jest.fn(),
      PATCH_Configuration: jest.fn()
    } as any;

    mockActionsService = {
      showToast: jest.fn()
    } as any;

    mockApiService.GET_Configuration.mockResolvedValue({
      data: { all: '0', self: '0' }
    } as any);
    sessionStorage.clear();

    queryParamGet = jest.fn().mockReturnValue(null);
    mockRouter = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ResultsCenterComponent],
      providers: [
        { provide: ResultsCenterService, useValue: mockResultsCenterService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: ActionsService, useValue: mockActionsService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string) => queryParamGet(key) }
            }
          }
        },
        { provide: Router, useValue: mockRouter }
      ]
    })
      .overrideComponent(ResultsCenterComponent, {
        set: {
          imports: [],
          template: `<div></div>`
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ResultsCenterComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    jest.useRealTimers();
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

  describe('initializeState', () => {
    it('should restore persisted state and call main', async () => {
      mockResultsCenterService.restorePersistedState.mockReturnValue(true);
      mockResultsCenterService.main.mockResolvedValue(undefined);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.primaryContractId()).toBeNull();
      expect(mockResultsCenterService.showFiltersSidebar()).toBe(false);
      expect(mockResultsCenterService.showConfigurationsSidebar()).toBe(false);
      expect(mockResultsCenterService.restorePersistedState).toHaveBeenCalledWith('results-center');
      expect(mockResultsCenterService.activateStatePersistence).toHaveBeenCalledWith('results-center');
      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.main).toHaveBeenCalled();
    });

    it('should load my results when no restored state and preferred tab is my', async () => {
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(loadMyResultsSpy).toHaveBeenCalled();
      expect(loadAllResultsSpy).not.toHaveBeenCalled();
      expect(mockResultsCenterService.main).not.toHaveBeenCalled();
    });

    it('should load all results when no restored state and preferred tab is all', async () => {
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(loadAllResultsSpy).toHaveBeenCalled();
      expect(loadMyResultsSpy).not.toHaveBeenCalled();
    });

    it('should load my results and strip tab query when ?tab=my (e.g. from home main actions)', async () => {
      queryParamGet.mockImplementation((key: string) => (key === 'tab' ? 'my' : null));
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();

      await (component as any).initializeState();

      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(loadMyResultsSpy).toHaveBeenCalled();
      expect(loadAllResultsSpy).not.toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { tab: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });

    it('should apply indicator tab from query param, skip restore, and clear URL', async () => {
      queryParamGet.mockImplementation((key: string) => (key === 'indicatorTab' ? '42' : null));
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      const loadPinnedTabPreferenceSpy = jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults');

      await (component as any).initializeState();

      expect(mockResultsCenterService.restorePersistedState).not.toHaveBeenCalled();
      expect(loadPinnedTabPreferenceSpy).toHaveBeenCalled();
      expect(loadMyResultsSpy).toHaveBeenCalledWith(true);
      expect(mockResultsCenterService.onSelectFilterTab).toHaveBeenCalledWith(42, { skipMain: true });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      expect(mockResultsCenterService.activateStatePersistence).toHaveBeenCalledWith('results-center');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { indicatorTab: null, statusTab: null, statusLabel: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });

    it('should apply status filter from query param, load My Results, and clear URL', async () => {
      queryParamGet.mockImplementation((key: string) => {
        if (key === 'statusTab') {
          return '6';
        }
        if (key === 'statusLabel') {
          return 'Submitted';
        }
        return null;
      });
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults');

      await (component as any).initializeState();

      expect(loadMyResultsSpy).toHaveBeenCalledWith(true);
      expect(mockResultsCenterService.applyStatusFilterFromHomeLink).toHaveBeenCalledWith(6, 'Submitted', {
        skipMain: true
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
      expect(mockResultsCenterService.onSelectFilterTab).not.toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { indicatorTab: null, statusTab: null, statusLabel: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });

    it('should pass undefined statusLabel when statusLabel query param is absent', async () => {
      queryParamGet.mockImplementation((key: string) => (key === 'statusTab' ? '9' : null));
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await (component as any).initializeState();

      expect(mockResultsCenterService.applyStatusFilterFromHomeLink).toHaveBeenCalledWith(9, undefined, {
        skipMain: true
      });
    });

    it('should apply both indicator tab and status filter when both query params are present', async () => {
      queryParamGet.mockImplementation((key: string) => {
        if (key === 'indicatorTab') {
          return '3';
        }
        if (key === 'statusTab') {
          return '11';
        }
        if (key === 'statusLabel') {
          return 'Postpone';
        }
        return null;
      });
      mockResultsCenterService.restorePersistedState.mockReturnValue(false);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');
      jest.spyOn(component, 'loadMyResults');

      await (component as any).initializeState();

      expect(mockResultsCenterService.onSelectFilterTab).toHaveBeenCalledWith(3, { skipMain: true });
      expect(mockResultsCenterService.applyStatusFilterFromHomeLink).toHaveBeenCalledWith(11, 'Postpone', {
        skipMain: true
      });
      expect(mockResultsCenterService.main).toHaveBeenCalledTimes(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should deactivate persistence and hide sidebars', () => {
      mockResultsCenterService.showFiltersSidebar.set(true);
      mockResultsCenterService.showConfigurationsSidebar.set(true);

      component.ngOnDestroy();

      expect(mockResultsCenterService.deactivateStatePersistence).toHaveBeenCalledWith('results-center');
      expect(mockResultsCenterService.showFiltersSidebar()).toBe(false);
      expect(mockResultsCenterService.showConfigurationsSidebar()).toBe(false);
    });
  });

  describe('orderedFilterItems', () => {
    it('should return correct order when pinned tab is my', () => {
      component.pinnedTab.set('my');

      const result = component.orderedFilterItems();

      expect(result).toEqual([
        { id: 'my', label: 'My Results' },
        { id: 'all', label: 'All Results' }
      ]);
    });

    it('should return correct order when pinned tab is all', () => {
      component.pinnedTab.set('all');

      const result = component.orderedFilterItems();

      expect(result).toEqual([
        { id: 'all', label: 'All Results' },
        { id: 'my', label: 'My Results' }
      ]);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle showSignal', () => {
      const initialValue = component.showSignal();

      component.toggleSidebar();

      expect(component.showSignal()).toBe(!initialValue);
    });
  });

  describe('applyFilters', () => {
    it('should call resultsCenterService.applyFilters', () => {
      component.applyFilters();

      expect(mockResultsCenterService.applyFilters).toHaveBeenCalled();
    });
  });

  describe('loadPinnedTabPreference', () => {
    it('should resolve all when all is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({
        data: { all: '1', self: '0' }
      } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve my when self is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({
        data: { all: '0', self: '1' }
      } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('my');
      expect(component.pinnedTab()).toBe('my');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when no tab is pinned', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({
        data: { all: '0', self: '0' }
      } as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });

    it('should resolve all when no response data', async () => {
      mockApiService.GET_Configuration.mockResolvedValue({} as any);

      const result = await (component as any).loadPinnedTabPreference();

      expect(result).toBe('all');
      expect(component.pinnedTab()).toBe('all');
      expect(component.loadingPin()).toBe(false);
    });
  });

  describe('onActiveItemChange', () => {
    it('should handle my tab selection and preserve search input', () => {
      const event: MenuItem = { id: 'my', label: 'My Results' };
      const loadMyResultsSpy = jest.spyOn(component, 'loadMyResults').mockImplementation();
      mockResultsCenterService.searchInput.set('ABC');

      component.onActiveItemChange(event);

      expect(loadMyResultsSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.cleanFilters).toHaveBeenCalled();
      expect(mockResultsCenterService.searchInput()).toBe('ABC');
    });

    it('should handle all tab selection and preserve search input', () => {
      const event: MenuItem = { id: 'all', label: 'All Results' };
      const loadAllResultsSpy = jest.spyOn(component, 'loadAllResults').mockImplementation();
      mockResultsCenterService.searchInput.set('test search');

      component.onActiveItemChange(event);

      expect(loadAllResultsSpy).toHaveBeenCalled();
      expect(mockResultsCenterService.cleanFilters).toHaveBeenCalled();
      expect(mockResultsCenterService.searchInput()).toBe('test search');
    });
  });

  describe('loadMyResults', () => {
    it('should update results filter and applied filters and call main', () => {
      component.loadMyResults();

      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[1]);
      expect(mockResultsCenterService.resultsFilter()).toEqual({
        'create-user-codes': ['123'],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(mockResultsCenterService.main).toHaveBeenCalled();
    });

    it('should preserve indicator-codes-tabs when switching', () => {
      mockResultsCenterService.resultsFilter.set({
        ...mockResultsCenterService.resultsFilter(),
        'indicator-codes-tabs': [5]
      });

      component.loadMyResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([5]);
      expect(mockResultsCenterService.appliedFilters()['indicator-codes-tabs']).toEqual([5]);
    });

    it('should default to empty array when indicator-codes-tabs is undefined', () => {
      mockResultsCenterService.resultsFilter.set({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': []
      } as any);

      component.loadMyResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });
  });

  describe('loadAllResults', () => {
    it('should update results filter and applied filters and call main', () => {
      component.loadAllResults();

      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[0]);
      expect(mockResultsCenterService.resultsFilter()).toEqual({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(mockResultsCenterService.main).toHaveBeenCalled();
    });

    it('should preserve indicator-codes-tabs when switching', () => {
      mockResultsCenterService.resultsFilter.set({
        ...mockResultsCenterService.resultsFilter(),
        'indicator-codes-tabs': [3]
      });

      component.loadAllResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([3]);
      expect(mockResultsCenterService.appliedFilters()['indicator-codes-tabs']).toEqual([3]);
    });

    it('should default to empty array when indicator-codes-tabs is undefined', () => {
      mockResultsCenterService.resultsFilter.set({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': []
      } as any);

      component.loadAllResults();

      expect(mockResultsCenterService.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });
  });

  describe('togglePin', () => {
    it('should pin all tab when toggling from my', async () => {
      component.pinnedTab.set('my');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[0]);
      expect(mockResultsCenterService.cleanMultiselects).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Results',
        detail: 'All Results tab pinned successfully'
      });
    });

    it('should pin my tab when toggling from all', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('my');

      await component.togglePin('my');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: false, self: true });
      expect(component.pinnedTab()).toBe('my');
      expect(mockResultsCenterService.myResultsFilterItem()).toEqual(mockResultsCenterService.myResultsFilterItems[1]);
      expect(mockResultsCenterService.cleanMultiselects).toHaveBeenCalled();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Results',
        detail: 'My Results tab pinned successfully'
      });
    });

    it('should unpin tab when toggling same tab', async () => {
      component.pinnedTab.set('all');
      mockApiService.PATCH_Configuration.mockResolvedValue({} as any);
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(mockApiService.PATCH_Configuration).toHaveBeenCalledWith('result-table', 'tab', { all: true, self: false });
      expect(component.pinnedTab()).toBe('all');
      expect(mockResultsCenterService.cleanMultiselects).toHaveBeenCalled();
    });

    it('should handle error when API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.PATCH_Configuration.mockRejectedValue(new Error('API Error'));
      jest.spyOn(component as any, 'loadPinnedTabPreference').mockResolvedValue('all');

      await component.togglePin('all');
      jest.runAllTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Error updating pinned tab:', expect.any(Error));
      expect(mockActionsService.showToast).toHaveBeenCalled();
      expect(component.loadingPin()).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('isPinned', () => {
    it('should return true when tab is pinned', () => {
      component.pinnedTab.set('my');

      expect(component.isPinned('my')).toBe(true);
    });

    it('should return false when tab is not pinned', () => {
      component.pinnedTab.set('my');

      expect(component.isPinned('all')).toBe(false);
    });
  });

  describe('onPinIconClick', () => {
    it('should stop event propagation and call togglePin', () => {
      const event = new Event('click');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
      const togglePinSpy = jest.spyOn(component, 'togglePin').mockResolvedValue();

      component.onPinIconClick('all', event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(togglePinSpy).toHaveBeenCalledWith('all');
    });
  });
});
