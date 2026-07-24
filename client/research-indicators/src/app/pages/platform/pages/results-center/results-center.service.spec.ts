import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { ResultsCenterService } from './results-center.service';
import { ApiService } from '../../../../shared/services/api.service';
import { CacheService } from '../../../../shared/services/cache/cache.service';
import { GetResultsService } from '../../../../shared/services/control-list/get-results.service';
import { Result } from '../../../../shared/interfaces/result/result.interface';
import { GetAllIndicators } from '../../../../shared/interfaces/get-all-indicators.interface';

describe('ResultsCenterService', () => {
  let service: ResultsCenterService;
  let mockApiService: jest.Mocked<ApiService>;
  let mockGetResultsService: jest.Mocked<GetResultsService>;

  const mockUser = {
    sec_user_id: 123
  };

  const mockDataCache = {
    user: mockUser
  };

  const indicatorListSignal = signal<GetAllIndicators[]>([
    { indicator_id: 1, name: 'Indicator 1', able: true, active: false },
    { indicator_id: 2, name: 'Indicator 2', able: true, active: false }
  ]);
  const mockIndicatorTabs = {
    lazy: () => ({
      list: indicatorListSignal,
      isLoading: signal(true),
      hasValue: signal(true)
    })
  };

  const mockResults = [
    {
      result_official_code: 'RES001',
      title: 'Test Result',
      indicators: { name: 'Test Indicator' },
      result_status: { name: 'SUBMITTED' },
      result_contracts: { contract_id: 'CON001' },
      result_levers: { lever: { short_name: 'LEV1' } },
      report_year_id: 2024,
      snapshot_years: [2023, 2024],
      created_by_user: { first_name: 'John', last_name: 'Doe' },
      created_at: '2024-01-01T00:00:00Z'
    }
  ] as any;

  beforeEach(() => {
    indicatorListSignal.set([
      { indicator_id: 1, name: 'Indicator 1', able: true, active: false },
      { indicator_id: 2, name: 'Indicator 2', able: true, active: false }
    ]);
    const mockApiServiceObj = {
      indicatorTabs: mockIndicatorTabs
    } as any;

    const mockCacheServiceObj = {
      dataCache: signal(mockDataCache)
    } as any;

    const mockGetResultsServiceObj = {
      fetchPaginated: jest.fn().mockResolvedValue({ results: mockResults, total: 1 })
    } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ResultsCenterService,
        { provide: ApiService, useValue: mockApiServiceObj },
        { provide: CacheService, useValue: mockCacheServiceObj },
        { provide: GetResultsService, useValue: mockGetResultsServiceObj }
      ]
    });

    service = TestBed.inject(ResultsCenterService);
    mockApiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    mockGetResultsService = TestBed.inject(GetResultsService) as jest.Mocked<GetResultsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('onChangeList effect', () => {
    it('should prepend All Indicators and set able by indicator_id when isLoading is false', fakeAsync(() => {
      const listSignal = signal<GetAllIndicators[]>([
        { indicator_id: 1, name: 'Indicator 1', able: true, active: false },
        { indicator_id: 2, name: 'Indicator 2', able: true, active: false },
        { indicator_id: 7, name: 'Indicator 7', able: false, active: false }
      ]);
      const mockIndicatorTabsLoaded = {
        lazy: () => ({
          list: listSignal,
          isLoading: signal(false),
          hasValue: signal(true)
        })
      };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          ResultsCenterService,
          { provide: ApiService, useValue: { indicatorTabs: mockIndicatorTabsLoaded } as any },
          { provide: CacheService, useValue: { dataCache: signal(mockDataCache) } },
          { provide: GetResultsService, useValue: { fetchPaginated: jest.fn().mockResolvedValue({ results: mockResults, total: 1 }) } }
        ]
      });
      TestBed.inject(ResultsCenterService);
      tick();

      expect(listSignal().length).toBe(4);
      expect(listSignal()[0]).toEqual({ name: 'All Indicators', indicator_id: 0, able: true, active: true });
      expect(listSignal()[1].able).toBe(true);
      expect(listSignal()[2].able).toBe(true);
      expect(listSignal()[3].able).toBe(false);
    }));
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      expect(service.hasFilters()).toBe(false);
      expect(service.showFiltersSidebar()).toBe(false);
      expect(service.showConfigurationSidebar()).toBe(false);
      expect(service.loading()).toBe(false);
      expect(service.list()).toEqual([]);
      expect(service.resultsListForTable()).toEqual([]);
      expect(service.searchInput()).toBe('');
      expect(service.showConfigurationsSidebar()).toBe(false);
      expect(service.confirmFiltersSignal()).toBe(false);
    });

    it('should initialize myResultsFilterItems correctly', () => {
      expect(service.myResultsFilterItems).toEqual([
        { id: 'all', label: 'All Results' },
        { id: 'my', label: 'My Results' }
      ]);
    });

    it('should initialize myResultsFilterItem with first item', () => {
      expect(service.myResultsFilterItem()).toEqual(service.myResultsFilterItems[0]);
    });

    it('should initialize resultsFilter with default values', () => {
      const filter = service.resultsFilter();
      expect(filter['indicator-codes']).toEqual([]);
      expect(filter['lever-codes']).toEqual([]);
      expect(filter['create-user-codes']).toEqual([]);
    });

    it('should initialize resultsConfig with default values', () => {
      const config = service.resultsConfig();
      expect(config.indicators).toBe(true);
      expect(config['result-status']).toBe(true);
      expect(config.contracts).toBe(true);
      expect(config['primary-contract']).toBe(false);
      expect(config['primary-lever']).toBe(true);
      expect(config.levers).toBe(true);
      expect(config['audit-data']).toBe(true);
      expect(config['audit-data-object']).toBe(true);
    });
  });

  describe('Table columns', () => {
    it('should have correct table columns configuration', () => {
      const columns = service.tableColumns();
      expect(columns.length).toBeGreaterThan(0);

      const codeColumn = columns.find(col => col.field === 'result_official_code');
      expect(codeColumn).toBeDefined();
      expect(codeColumn?.header).toBe('Code');
      expect(codeColumn?.filter).toBe(true);

      const publicLinkColumn = columns.find(col => col.field === 'public_link');
      expect(publicLinkColumn).toBeDefined();
      expect(publicLinkColumn?.header).toBe('Link');
      expect(publicLinkColumn?.filter).toBe(true);
      expect(publicLinkColumn?.hideFilterIf?.()).toBe(true);
      expect(columns[columns.length - 1].field).toBe('public_link');
      expect(publicLinkColumn?.getValue?.({ public_link: undefined } as Result)).toBe('None');
    });

    it('should get result_platform value correctly', () => {
      const columns = service.tableColumns();
      const platformColumn = columns.find(col => col.field === 'result_platform');
      const getValue = platformColumn?.getValue;
      if (getValue) {
        const result = { result_platform: 'STAR' } as Result;
        expect(getValue(result)).toBe('STAR');
      }
    });

    it('should have result_platform column hideIf returning true', () => {
      const columns = service.tableColumns();
      const platformColumn = columns.find(col => col.field === 'result_platform');
      const hideIf = platformColumn?.hideIf;
      if (typeof hideIf === 'function') {
        expect(hideIf()).toBe(true);
      }
    });

    it('should get result_official_code value correctly', () => {
      const columns = service.tableColumns();
      const codeColumn = columns.find(col => col.field === 'result_official_code');
      const getValue = codeColumn?.getValue;
      if (getValue) {
        const result = { result_official_code: 'RES-001' } as Result;
        expect(getValue(result)).toBe('RES-001');
      }
    });

    it('should get title value correctly', () => {
      const columns = service.tableColumns();
      const titleColumn = columns.find(col => col.field === 'title');
      const getValue = titleColumn?.getValue;

      if (getValue) {
        const result = { title: 'Test Title---' } as Result;
        expect(getValue(result)).toBe('Test Title');
      }
    });

    it('should return title as-is when not a string (title getValue)', () => {
      const columns = service.tableColumns();
      const titleColumn = columns.find(col => col.field === 'title');
      const getValue = titleColumn?.getValue;

      if (getValue) {
        expect(getValue({ title: null } as unknown as Result)).toBeNull();
        expect(getValue({ title: undefined } as unknown as Result)).toBeUndefined();
        expect(getValue({ title: 123 } as any)).toBe(123);
      }
    });

    it('should get indicator value correctly', () => {
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator_id');
      const getValue = indicatorColumn?.getValue;

      if (getValue) {
        const result = { indicators: { name: 'Test Indicator' } } as Result;
        expect(getValue(result)).toBe('Test Indicator');
      }
    });

    it('should get status value correctly', () => {
      const columns = service.tableColumns();
      const statusColumn = columns.find(col => col.field === 'status');
      const getValue = statusColumn?.getValue;

      if (getValue) {
        const result = { result_status: { name: 'SUBMITTED' } } as Result;
        expect(getValue(result)).toBe('SUBMITTED');
      }
    });

    it('should get creator value correctly', () => {
      const columns = service.tableColumns();
      const creatorColumn = columns.find(col => col.field === 'creator');
      const getValue = creatorColumn?.getValue;

      if (getValue) {
        const result = {
          created_by_user: { first_name: 'John', last_name: 'Doe' }
        } as Result;
        expect(getValue(result)).toBe('John Doe');
      }
    });

    it('should get creation date value correctly', () => {
      const columns = service.tableColumns();
      const dateColumn = columns.find(col => col.field === 'creation_date');
      const getValue = dateColumn?.getValue;

      if (getValue) {
        const result = { created_at: '2024-01-01T00:00:00Z' } as Result;
        const dateValue = getValue(result);
        expect(dateValue).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      }
    });

    it('should get versions value correctly', () => {
      const columns = service.tableColumns();
      const versionsColumn = columns.find(col => col.field === 'versions');
      const getValue = versionsColumn?.getValue;

      if (getValue) {
        const result = { snapshot_years: [2023, 2024] } as Result;
        expect(getValue(result)).toEqual([2023, 2024]);
      }
    });

    it('should return empty array for versions when snapshot_years is not array or string', () => {
      const columns = service.tableColumns();
      const versionsColumn = columns.find(col => col.field === 'versions');
      const getValue = versionsColumn?.getValue;
      if (getValue) {
        expect(getValue({ snapshot_years: null } as unknown as Result)).toEqual([]);
        expect(getValue({ snapshot_years: {} } as unknown as Result)).toEqual([]);
      }
    });

    it('should parse versions when snapshot_years is comma-separated string', () => {
      const columns = service.tableColumns();
      const versionsColumn = columns.find(col => col.field === 'versions');
      const getValue = versionsColumn?.getValue;
      if (getValue) {
        expect(getValue({ snapshot_years: '2026,2025' } as unknown as Result)).toEqual([2026, 2025]);
      }
    });

    it('should evaluate indicator column hideIf computed', () => {
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator_id');
      const hideIf = indicatorColumn?.hideIf;
      if (typeof hideIf === 'function') {
        expect(typeof hideIf()).toBe('boolean');
      }
    });

    it('should return hideIf true when list has active indicator with indicator_id !== 0', () => {
      indicatorListSignal.update(prev => prev.map((x, i) => (i === 0 ? { ...x, active: true } : x)));
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator_id');
      const hideIf = indicatorColumn?.hideIf;
      if (typeof hideIf === 'function') expect(hideIf()).toBe(true);
    });

    it('should return hideIf false when active indicator has indicator_id 0', () => {
      indicatorListSignal.set([{ indicator_id: 0, name: 'All Indicators', able: true, active: true }]);
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator_id');
      const hideIf = indicatorColumn?.hideIf;
      if (typeof hideIf === 'function') expect(hideIf()).toBe(false);
    });

    it('should evaluate creator column hideFilterIf when create-user-codes is empty', () => {
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [] }));
      const columns = service.tableColumns();
      const creatorColumn = columns.find(col => col.field === 'creator');
      const hideFilterIf = creatorColumn?.hideFilterIf;
      if (hideFilterIf) expect(hideFilterIf()).toBe(false);
    });

    it('should evaluate creator column hideFilterIf when create-user-codes has items', () => {
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [123] as any }));
      const columns = service.tableColumns();
      const creatorColumn = columns.find(col => col.field === 'creator');
      const hideFilterIf = creatorColumn?.hideFilterIf;
      if (typeof hideFilterIf === 'function') {
        expect(hideFilterIf()).toBe(true);
      }
    });

    it('should evaluate creator column hideFilterIf when create-user-codes is undefined', () => {
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': undefined as any }));
      const columns = service.tableColumns();
      const creatorColumn = columns.find(col => col.field === 'creator');
      const hideFilterIf = creatorColumn?.hideFilterIf;
      if (hideFilterIf) expect(hideFilterIf()).toBe(false);
    });
  });

  describe('getAllPathsAsArray', () => {
    it('should return array of filterable column paths', () => {
      const paths = service.getAllPathsAsArray();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveFilters', () => {
    it('should return empty array when no filters are active', () => {
      const filters = service.getActiveFilters();
      expect(filters).toEqual([]);
    });

    it('should return INDICATOR TAB when indicator-codes-tabs has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'indicator-codes-tabs': [1, 2]
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'INDICATOR TAB' })]));
    });

    it('should return INDICATOR when indicator-codes-filter has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'indicator-codes-filter': [1, 2]
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        indicators: [
          { indicator_id: 1, name: 'Ind 1' },
          { indicator_id: 2, name: 'Ind 2' }
        ] as any
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'INDICATOR' })]));
    });

    it('should return STATUS when status-codes has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'status-codes': [1, 2]
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        statusCodes: [
          { result_status_id: 1, name: 'A' },
          { result_status_id: 2, name: 'B' }
        ] as any
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'STATUS' })]));
    });

    it('should return PROJECT when contract-codes has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'contract-codes': ['C1', 'C2']
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        contracts: [
          { agreement_id: 'C1', display_label: 'C1' },
          { agreement_id: 'C2', display_label: 'C2' }
        ] as any
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'PROJECT' })]));
    });

    it('should return LEVER when lever-codes has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'lever-codes': [1, 2]
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        levers: [
          { id: 1, short_name: 'L1' },
          { id: 2, short_name: 'L2' }
        ] as any
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'LEVER' })]));
    });

    it('should return YEAR when years has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        years: [2023, 2024]
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        years: [{ report_year: 2023 } as any, { report_year: 2024 } as any]
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'YEAR' })]));
    });

    it('should return SOURCE when platform-code has items', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'platform-code': ['STAR', 'ROAR']
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        sources: [
          { platform_code: 'STAR', name: 'STAR' },
          { platform_code: 'ROAR', name: 'ROAR' }
        ] as any
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'SOURCE', value: 'STAR', id: 'STAR' })]));
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'SOURCE', value: 'ROAR', id: 'ROAR' })]));
    });

    it('should skip falsy items in tableFilters when building getActiveFilters', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'indicator-codes-filter': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        indicators: [null, { indicator_id: 1, name: 'Ind A' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'INDICATOR', id: 1 }));
      expect(filters.filter(f => f.label === 'INDICATOR')).toHaveLength(1);
    });

    it('should use empty string for INDICATOR value when name is undefined', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'indicator-codes-filter': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        indicators: [{ indicator_id: 1, name: undefined }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'INDICATOR', value: '', id: 1 }));
    });

    it('should use empty string for STATUS value when name is undefined', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'status-codes': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        statusCodes: [{ result_status_id: 1, name: undefined }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'STATUS', value: '', id: 1 }));
    });

    it('should use empty string for SOURCE value when name is undefined', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'platform-code': ['pc1'] }));
      service.tableFilters.update(prev => ({
        ...prev,
        sources: [{ platform_code: 'pc1', name: undefined }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'SOURCE', value: '', id: 'pc1' }));
    });

    it('should use empty array when sources is undefined in getActiveFilters', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'platform-code': ['pc1'] }));
      service.tableFilters.update(prev => ({ ...prev, sources: undefined as any }));
      const filters = service.getActiveFilters();
      expect(filters.filter(f => f.label === 'SOURCE')).toHaveLength(0);
    });

    it('should use empty string for LEVER value when short_name and name are falsy', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        levers: [{ id: 1, short_name: undefined, name: undefined }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'LEVER', value: '', id: 1 }));
    });

    it('should not add LEVER when lever-codes is null in appliedFilters', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': null as any }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      const filters = service.getActiveFilters();
      expect(filters.filter(f => f.label === 'LEVER')).toHaveLength(0);
    });

    it('should skip falsy items in statusCodes when building getActiveFilters', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'status-codes': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        statusCodes: [null, { result_status_id: 1, name: 'Submitted' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters.filter(f => f.label === 'STATUS')).toHaveLength(1);
      expect(filters).toContainEqual(expect.objectContaining({ label: 'STATUS', id: 1 }));
    });

    it('should skip falsy items in sources when building getActiveFilters', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'platform-code': ['PC1'] }));
      service.tableFilters.update(prev => ({
        ...prev,
        sources: [undefined, { platform_code: 'PC1', name: 'Source 1' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters.filter(f => f.label === 'SOURCE')).toHaveLength(1);
    });

    it('should use display_label for PROJECT when present', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'contract-codes': ['ag1'] }));
      service.tableFilters.update(prev => ({
        ...prev,
        contracts: [{ agreement_id: 'ag1', display_label: 'My Project Label' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'PROJECT', value: 'My Project Label', id: 'ag1' }));
    });

    it('should use agreement_id for PROJECT when display_label is missing', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'contract-codes': ['ag2'] }));
      service.tableFilters.update(prev => ({
        ...prev,
        contracts: [{ agreement_id: 'ag2' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'PROJECT', value: 'ag2', id: 'ag2' }));
    });

    it('should use name for LEVER when short_name is missing', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        levers: [{ id: 1, name: 'Lever Full Name' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'LEVER', value: 'Lever Full Name', id: 1 }));
    });

    it('should use short_name for LEVER when both short_name and name are set', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': [1] }));
      service.tableFilters.update(prev => ({
        ...prev,
        levers: [{ id: 1, short_name: 'Short', name: 'Long Name' }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters).toContainEqual(expect.objectContaining({ label: 'LEVER', value: 'Short', id: 1 }));
    });

    it('should skip falsy items in years when building getActiveFilters', () => {
      service.appliedFilters.update(prev => ({ ...prev, years: [2024] }));
      service.tableFilters.update(prev => ({
        ...prev,
        years: [null, { report_year: 2024 }] as any
      }));
      const filters = service.getActiveFilters();
      expect(filters.filter(f => f.label === 'YEAR')).toHaveLength(1);
    });

    it('should return multiple filters when multiple are active', () => {
      service.appliedFilters.update(prev => ({
        ...prev,
        'status-codes': [1],
        'lever-codes': [2],
        years: [2024]
      }));
      service.tableFilters.update(prev => ({
        ...prev,
        statusCodes: [{ result_status_id: 1, name: 'A' }] as any,
        levers: [{ id: 2, short_name: 'L2' }] as any,
        years: [{ report_year: 2024 } as any]
      }));

      const filters = service.getActiveFilters();
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'STATUS' })]));
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'LEVER' })]));
      expect(filters).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'YEAR' })]));
    });
  });

  describe('countFiltersSelected', () => {
    it('should return undefined when no filters are selected', () => {
      const count = service.countFiltersSelected();
      expect(count).toBeUndefined();
    });

    it('should return count when filters are selected', () => {
      service.resultsFilter.update(prev => ({
        ...prev,
        'status-codes': [1, 2],
        'lever-codes': [3]
      }));

      const count = service.countFiltersSelected();
      expect(count).toBe('3');
    });

    it('should exclude create-user-codes and indicator-codes-tabs from count', () => {
      service.resultsFilter.update(prev => ({
        ...prev,
        'create-user-codes': ['1'],
        'indicator-codes-tabs': [2],
        'status-codes': [3]
      }));

      const count = service.countFiltersSelected();
      expect(count).toBe('1');
    });

    it('should count all result filter types when all have length (cover line 286 and each 282-287 branch)', () => {
      service.resultsFilter.update(prev => ({
        ...prev,
        'indicator-codes-filter': [1],
        'status-codes': [2],
        'platform-code': ['STAR'],
        'contract-codes': ['C1'],
        'lever-codes': [3],
        years: [2024]
      }));
      const count = service.countFiltersSelected();
      expect(count).toBe('6');
    });

    it('should use 0 when lever-codes is undefined in resultsFilter (cover line 286 ?? 0 branch)', () => {
      service.resultsFilter.set({
        'indicator-codes': [],
        'indicator-codes-filter': [1],
        'status-codes': [],
        'platform-code': [],
        'contract-codes': [],
        'lever-codes': undefined as any,
        'indicator-codes-tabs': [],
        'create-user-codes': [],
        years: []
      } as any);
      const count = service.countFiltersSelected();
      expect(count).toBe('1');
    });
  });

  describe('countTableFiltersSelected', () => {
    it('should return undefined when no table filters are selected', () => {
      const count = service.countTableFiltersSelected();
      expect(count).toBeUndefined();
    });

    it('should return count when table filters are selected', () => {
      service.tableFilters.update(prev => ({
        ...prev,
        statusCodes: [
          { result_status_id: 1, name: 'A' },
          { result_status_id: 2, name: 'B' }
        ] as any,
        levers: [{ id: 3, short_name: 'L3' }] as any
      }));

      const count = service.countTableFiltersSelected();
      expect(count).toBe('3');
    });

    it('should include sources in count when table filters have sources (cover 294-299)', () => {
      service.tableFilters.update(prev => ({
        ...prev,
        sources: [{ platform_code: 'STAR' }, { platform_code: 'ROAR' }] as any,
        indicators: [{ indicator_id: 1 }] as any
      }));
      const count = service.countTableFiltersSelected();
      expect(count).toBe('3');
    });

    it('should count all table filter types when all have length (cover each 294-299 branch)', () => {
      service.tableFilters.update(prev => ({
        ...prev,
        indicators: [{ indicator_id: 1 }] as any,
        statusCodes: [{ result_status_id: 1 }] as any,
        sources: [{ platform_code: 'X' }] as any,
        contracts: [{ contract_id: 'C1' }] as any,
        levers: [{ id: 1 }] as any,
        years: [2024]
      }));
      const count = service.countTableFiltersSelected();
      expect(count).toBe('6');
    });

    it('should use 0 when tableFilters has undefined indicators and years (cover 294-299 ?? 0 branches)', () => {
      service.tableFilters.set({
        indicators: undefined as any,
        statusCodes: [{ result_status_id: 1 }] as any,
        sources: [],
        contracts: [],
        levers: [],
        years: undefined as any
      } as any);
      const count = service.countTableFiltersSelected();
      expect(count).toBe('1');
    });

    it('should use 0 for each undefined tableFilter key (cover lines 295-298 ?? 0)', () => {
      service.tableFilters.set({
        indicators: [{ indicator_id: 1 }] as any,
        statusCodes: undefined as any,
        sources: undefined as any,
        contracts: undefined as any,
        levers: undefined as any,
        years: undefined as any
      } as any);
      const count = service.countTableFiltersSelected();
      expect(count).toBe('1');
    });
  });

  describe('getStatusSeverity', () => {
    it('should return correct severity for SUBMITTED', () => {
      expect(service.getStatusSeverity('SUBMITTED')).toBe('info');
    });

    it('should return correct severity for ACCEPTED', () => {
      expect(service.getStatusSeverity('ACCEPTED')).toBe('success');
    });

    it('should return correct severity for EDITING', () => {
      expect(service.getStatusSeverity('EDITING')).toBe('warning');
    });

    it('should return undefined for unknown status', () => {
      expect(service.getStatusSeverity('UNKNOWN')).toBeUndefined();
    });
  });

  describe('onActiveItemChange', () => {
    it('should update myResultsFilterItem and clear filters for "my" tab', () => {
      const event: MenuItem = { id: 'my', label: 'My Results' };

      service.onActiveItemChange(event);

      expect(service.myResultsFilterItem()).toEqual(event);
      expect(service.searchInput()).toBe('');
      expect(service.resultsFilter()['create-user-codes']).toEqual(['123']);
      expect(service.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });

    it('should update myResultsFilterItem and clear filters for "all" tab', () => {
      const event: MenuItem = { id: 'all', label: 'All Results' };

      service.onActiveItemChange(event);

      expect(service.myResultsFilterItem()).toEqual(event);
      expect(service.searchInput()).toBe('');
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
      expect(service.resultsFilter()['indicator-codes-tabs']).toEqual([]);
    });

    it('should clear indicator-codes-tabs when changing tabs', () => {
      // Set up initial state with indicator tab selected
      service.resultsFilter.update(prev => ({
        ...prev,
        'indicator-codes-tabs': [1]
      }));

      const event: MenuItem = { id: 'my', label: 'My Results' };

      service.onActiveItemChange(event);

      expect(service.resultsFilter()['indicator-codes-tabs']).toEqual([]);
      expect(service.resultsFilter()['create-user-codes']).toEqual(['123']);
    });

    it('should clear and reset table when tableRef is set', () => {
      const tableMock = { clear: jest.fn(), sortField: '', sortOrder: 0, first: 5 };
      service.tableRef.set(tableMock as any);

      const event: MenuItem = { id: 'all', label: 'All Results' };
      service.onActiveItemChange(event);

      expect(tableMock.clear).toHaveBeenCalled();
      expect(tableMock.sortField).toBe('result_official_code');
      expect(tableMock.sortOrder).toBe(-1);
      expect(tableMock.first).toBe(0);
      expect(service.resultsTablePaginatorFirst()).toBe(0);
    });
  });

  describe('handleResultsTableLazyLoad', () => {
    it('should use event.first when rows per page unchanged', () => {
      const tableMock = { first: 0, rows: 10, totalRecords: 100 } as any;
      service.tableRef.set(tableMock);
      service.resultsTableTotalRecords.set(100);
      service.resultsTablePaginatorFirst.set(10);
      service.resultsTablePaginatorRows.set(10);
      service.handleResultsTableLazyLoad({ first: 20, rows: 10 });
      expect(service.resultsTablePaginatorFirst()).toBe(20);
    });

    it('should align first when rows per page changes even if event.first is 0', () => {
      const tableMock = { first: 0, rows: 10, totalRecords: 100 } as any;
      service.tableRef.set(tableMock);
      service.resultsTableTotalRecords.set(100);
      service.resultsTablePaginatorFirst.set(40);
      service.resultsTablePaginatorRows.set(10);
      service.handleResultsTableLazyLoad({ first: 0, rows: 25 });
      expect(service.resultsTablePaginatorFirst()).toBe(25);
      expect(service.resultsTablePaginatorRows()).toBe(25);
    });

    it('should clamp first to last standard page when aligned index exceeds total (no total - rows overlap)', () => {
      const tableMock = { first: 0, rows: 10, totalRecords: 60 } as any;
      service.tableRef.set(tableMock);
      service.resultsTableTotalRecords.set(60);
      service.resultsTablePaginatorFirst.set(50);
      service.resultsTablePaginatorRows.set(10);
      service.handleResultsTableLazyLoad({ first: 0, rows: 25 });
      expect(service.resultsTablePaginatorFirst()).toBe(50);
    });

    it('should clamp to lastPageFirst = floor((total-1)/rows)*rows when same rows (e.g. total 33, rows 10 → first 30)', () => {
      const tableMock = { first: 0, rows: 10, totalRecords: 33 } as any;
      service.tableRef.set(tableMock);
      service.resultsTableTotalRecords.set(33);
      service.resultsTablePaginatorFirst.set(0);
      service.resultsTablePaginatorRows.set(10);
      service.handleResultsTableLazyLoad({ first: 50, rows: 10 });
      expect(service.resultsTablePaginatorFirst()).toBe(30);
    });

    it('should update sort signals when lazy load includes sortField', () => {
      service.resultsTableTotalRecords.set(100);
      service.handleResultsTableLazyLoad({
        first: 0,
        rows: 10,
        sortField: 'title',
        sortOrder: 1
      } as any);
      expect(service.resultsTableSortField()).toBe('title');
      expect(service.resultsTableSortOrder()).toBe(1);

      service.handleResultsTableLazyLoad({
        first: 0,
        rows: 10,
        sortField: 'result_official_code',
        sortOrder: -1
      } as any);
      expect(service.resultsTableSortField()).toBe('result_official_code');
      expect(service.resultsTableSortOrder()).toBe(-1);
    });

    it('should default missing first and rows from signals', () => {
      service.resultsTableTotalRecords.set(100);
      service.resultsTablePaginatorFirst.set(5);
      service.resultsTablePaginatorRows.set(10);
      service.handleResultsTableLazyLoad({} as any);
      expect(service.resultsTablePaginatorFirst()).toBe(0);
      expect(service.resultsTablePaginatorRows()).toBe(10);
    });

    it('should treat rows 0 as page size 10 when aligning paginator', () => {
      service.resultsTableTotalRecords.set(50);
      service.resultsTablePaginatorFirst.set(20);
      service.resultsTablePaginatorRows.set(10);
      service.handleResultsTableLazyLoad({ first: 0, rows: 0 } as any);
      expect(service.resultsTablePaginatorRows()).toBe(0);
      expect(service.resultsTablePaginatorFirst()).toBe(20);
    });

    it('should coerce undefined first in clampPaginatorFirstToStandardGrid', () => {
      const clamp = (service as any).clampPaginatorFirstToStandardGrid.bind(service);
      expect(clamp(undefined, 10, 100)).toBe(0);
    });
  });

  describe('showFilterSidebar', () => {
    it('should set showFiltersSidebar to true', () => {
      service.showFilterSidebar();
      expect(service.showFiltersSidebar()).toBe(true);
    });
  });

  describe('showConfigSidebar', () => {
    it('should set showConfigurationsSidebar to true', () => {
      service.showConfigSidebar();
      expect(service.showConfigurationsSidebar()).toBe(true);
    });
  });

  describe('onChangeList effect', () => {
    it('should update indicator list when isLoading is false', fakeAsync(() => {
      const listSignal = signal<GetAllIndicators[]>([
        { indicator_id: 1, name: 'Indicator 1', able: true, active: false },
        { indicator_id: 99, name: 'Other', able: false, active: false }
      ]);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          ResultsCenterService,
          {
            provide: ApiService,
            useValue: {
              indicatorTabs: {
                lazy: () => ({
                  list: listSignal,
                  isLoading: signal(false),
                  hasValue: signal(true)
                })
              }
            }
          },
          { provide: CacheService, useValue: { dataCache: signal(mockDataCache) } },
          { provide: GetResultsService, useValue: { fetchPaginated: jest.fn().mockResolvedValue({ results: mockResults, total: 1 }) } }
        ]
      });
      TestBed.inject(ResultsCenterService);
      tick();
      const list = listSignal();
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].name).toBe('All Indicators');
      expect(list[0].indicator_id).toBe(0);
      const indicator1 = list.find(i => i.indicator_id === 1);
      expect(indicator1?.able).toBe(true);
      const indicator99 = list.find(i => i.indicator_id === 99);
      expect(indicator99?.able).toBe(false);
    }));
  });

  describe('applyFilters', () => {
    it('should update resultsFilter and appliedFilters with table filters and call main', () => {
      const mockLevers = [{ id: 1, name: 'Lever 1' }] as any;
      const mockStatuses = [{ result_status_id: 1, name: 'Status 1' }] as any;
      const mockYears = [{ report_year: 2024 }] as any;
      const mockContracts = [{ agreement_id: 1, name: 'Contract 1' }] as any;
      const mockIndicators = [{ indicator_id: 1, name: 'Indicator 1' }] as any;

      service.tableFilters.update(prev => ({
        ...prev,
        levers: mockLevers,
        statusCodes: mockStatuses,
        years: mockYears,
        contracts: mockContracts,
        indicators: mockIndicators
      }));

      const mainSpy = jest.spyOn(service, 'main');

      service.applyFilters();

      const filter = service.resultsFilter();
      const appliedFilter = service.appliedFilters();

      expect(filter['lever-codes']).toEqual([1]);
      expect(filter['status-codes']).toEqual([1]);
      expect(filter['years']).toEqual([2024]);
      expect(filter['contract-codes']).toEqual([1]);
      expect(filter['indicator-codes-filter']).toEqual([1]);

      expect(appliedFilter['lever-codes']).toEqual([1]);
      expect(appliedFilter['status-codes']).toEqual([1]);
      expect(appliedFilter['years']).toEqual([2024]);
      expect(appliedFilter['contract-codes']).toEqual([1]);
      expect(appliedFilter['indicator-codes-filter']).toEqual([1]);

      expect(mainSpy).toHaveBeenCalled();
    });

    it('should reset table first to 0 when tableRef is set', () => {
      const tableMock = { first: 10, clear: jest.fn(), sortField: '', sortOrder: 0 };
      service.tableRef.set(tableMock as any);
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.applyFilters();

      expect(tableMock.first).toBe(0);
    });

    it('should map platform-code from sources with null/undefined as empty array', () => {
      service.tableFilters.update(
        prev =>
          ({
            ...prev,
            levers: [],
            statusCodes: [],
            years: [],
            contracts: [],
            indicators: [],
            sources: undefined
          }) as any
      );
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(service.resultsFilter()['platform-code']).toEqual([]);
      expect(service.appliedFilters()['platform-code']).toEqual([]);
    });

    it('should preserve create-user-codes when myResultsFilterItem is my tab', () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [100, 200] as any }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual([100, 200]);
      expect(service.appliedFilters()['create-user-codes']).toEqual([100, 200]);
    });

    it('should not preserve create-user-codes when tab is all', () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[0]);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [99] as any }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
      expect(service.appliedFilters()['create-user-codes']).toEqual([]);
    });

    it('should use empty array when currentTab is undefined in applyFilters', () => {
      service.myResultsFilterItem.set(undefined as any);
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
    });

    it('should use empty array when tab is my and create-user-codes is undefined in applyFilters', () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': undefined as any }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
    });

    it('should not set table.first when tableRef is null', () => {
      service.tableRef.set(undefined as any);
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      const mainSpy = jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should map platform-code from sources when sources is defined', () => {
      service.tableFilters.update(prev => ({
        ...prev,
        levers: [],
        statusCodes: [],
        years: [],
        contracts: [],
        indicators: [],
        sources: [{ platform_code: 'STAR', name: 'STAR' }] as any
      }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.applyFilters();
      expect(service.resultsFilter()['platform-code']).toEqual(['STAR']);
      expect(service.appliedFilters()['platform-code']).toEqual(['STAR']);
    });
  });

  describe('onSelectFilterTab', () => {
    it('should update indicator tabs and set active indicator', () => {
      service.onSelectFilterTab(1);

      const mockIndicatorTabsList = mockApiService.indicatorTabs.lazy().list();
      expect(mockIndicatorTabsList).toBeDefined();
    });

    it('should clear indicator-codes-tabs when indicatorId is 0 and call main', () => {
      const mainSpy = jest.spyOn(service, 'main');

      service.onSelectFilterTab(0);

      const filter = service.resultsFilter();
      const appliedFilter = service.appliedFilters();
      expect(filter['indicator-codes-tabs']).toEqual([]);
      expect(appliedFilter['indicator-codes-tabs']).toEqual([]);
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should use empty create-user-codes when currentTab is undefined in onSelectFilterTab', () => {
      service.myResultsFilterItem.set(undefined as any);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [999] as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.onSelectFilterTab(1);
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
    });

    it('should preserve empty array when tab is my and create-user-codes undefined in onSelectFilterTab', () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': undefined as any }));
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());
      service.onSelectFilterTab(1);
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
    });

    it('should set indicator-codes-tabs when indicatorId is not 0 and call main', () => {
      const mainSpy = jest.spyOn(service, 'main');

      service.onSelectFilterTab(2);

      const filter = service.resultsFilter();
      const appliedFilter = service.appliedFilters();
      expect(filter['indicator-codes-tabs']).toEqual([2]);
      expect(appliedFilter['indicator-codes-tabs']).toEqual([2]);
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should not call main when skipMain is true', () => {
      const mainSpy = jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.onSelectFilterTab(1, { skipMain: true });

      expect(mainSpy).not.toHaveBeenCalled();
    });
  });

  describe('initializeProjectDashboardResultsTable', () => {
    it('sets pending revision status, contract context, and loads all results', () => {
      const mainSpy = jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.initializeProjectDashboardResultsTable('D514');

      expect(service.primaryContractId()).toBe('D514');
      expect(service.myResultsFilterItem()?.id).toBe('all');
      expect(service.resultsFilter()['status-codes']).toEqual([5]);
      expect(service.appliedFilters()['status-codes']).toEqual([5]);
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
      expect(service.tableFilters().statusCodes).toEqual([{ result_status_id: 5, name: 'Pending Revision' }]);
      expect(service.searchInput()).toBe('');
      expect(service.resultsTablePaginatorFirst()).toBe(0);
      expect(service.resultsTablePaginatorRows()).toBe(10);
      expect(mainSpy).toHaveBeenCalled();
    });
  });

  describe('applyStatusFilterFromHomeLink', () => {
    it('sets status on tableFilters and results filters and calls main by default', () => {
      const mainSpy = jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.applyStatusFilterFromHomeLink(5, 'Approved');

      expect(service.tableFilters().statusCodes).toEqual([{ result_status_id: 5, name: 'Approved' }]);
      expect(service.resultsFilter()['status-codes']).toEqual([5]);
      expect(service.appliedFilters()['status-codes']).toEqual([5]);
      expect(mainSpy).toHaveBeenCalled();
    });

    it('does not call main when skipMain is true', () => {
      const mainSpy = jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.applyStatusFilterFromHomeLink(3, 'Draft', { skipMain: true });

      expect(service.tableFilters().statusCodes[0]).toEqual({ result_status_id: 3, name: 'Draft' });
      expect(mainSpy).not.toHaveBeenCalled();
    });

    it('uses display name Status when statusName is omitted', () => {
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.applyStatusFilterFromHomeLink(9);

      expect(service.tableFilters().statusCodes[0].name).toBe('Status');
    });

    it('trims statusName', () => {
      jest.spyOn(service, 'main').mockImplementation(() => Promise.resolve());

      service.applyStatusFilterFromHomeLink(2, '  Submitted  ');

      expect(service.tableFilters().statusCodes[0].name).toBe('Submitted');
    });
  });

  describe('cleanFilters', () => {
    it('should clear table filters', () => {
      service.tableFilters.update(prev => ({
        ...prev,
        indicators: [{ indicator_id: 1 }] as any,
        statusCodes: [{ result_status_id: 1 }] as any,
        years: [{ id: 2024 }] as any,
        contracts: [{ agreement_id: 1 }] as any,
        levers: [{ id: 1 }] as any
      }));

      service.cleanFilters();

      const tableFilters = service.tableFilters();
      expect(tableFilters.indicators).toEqual([]);
      expect(tableFilters.statusCodes).toEqual([]);
      expect(tableFilters.years).toEqual([]);
      expect(tableFilters.contracts).toEqual([]);
      expect(tableFilters.levers).toEqual([]);
    });

    it('should reset sort and pagination when table exists without clearing global filter', () => {
      const tableMock = {
        sortField: '',
        sortOrder: 0,
        first: 10
      };
      service.tableRef.set(tableMock as any);
      service.tableFilters.set({
        indicators: [{ indicator_id: 1 }],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: []
      } as any);

      service.cleanFilters();

      expect(tableMock.sortField).toBe('result_official_code');
      expect(tableMock.sortOrder).toBe(-1);
      expect(tableMock.first).toBe(0);
      const filters = service.tableFilters();
      expect(filters.indicators).toEqual([]);
      expect(filters.statusCodes).toEqual([]);
    });

    it('should handle when table is null', () => {
      service.tableRef.set(undefined as any);
      service.cleanFilters();
      const filters = service.tableFilters();
      expect(filters.indicators).toEqual([]);
    });
  });

  describe('clearAllFilters', () => {
    it('should set create-user-codes from user id when active tab is My Results (Clear Filters must not change tab)', () => {
      service.pinnedTab.set('all');
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);
      service.clearAllFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual(['123']);
      expect(service.myResultsFilterItem()).toEqual(service.myResultsFilterItems[1]);
    });

    it('should clear create-user-codes when active tab is All Results (Clear Filters must not switch to My Results)', () => {
      service.pinnedTab.set('my');
      service.myResultsFilterItem.set(service.myResultsFilterItems[0]);
      service.clearAllFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
      expect(service.myResultsFilterItem()).toEqual(service.myResultsFilterItems[0]);
    });

    it('should treat undefined tab as All Results for create-user-codes', () => {
      service.myResultsFilterItem.set(undefined as any);
      service.clearAllFilters();
      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
    });

    it('should clear all filters and reset state', () => {
      service.resultsFilter.update(prev => ({
        ...prev,
        'indicator-codes-filter': [1, 2],
        'indicator-codes-tabs': [3]
      }));
      service.appliedFilters.update(prev => ({
        ...prev,
        'indicator-codes-filter': [1, 2],
        'indicator-codes-tabs': [3]
      }));
      service.searchInput.set('test');

      const mainSpy = jest.spyOn(service, 'main');

      service.clearAllFilters();

      const filter = service.resultsFilter();
      const appliedFilter = service.appliedFilters();
      expect(filter['indicator-codes-filter']).toEqual([]);
      expect(filter['indicator-codes-tabs']).toEqual([]);
      expect(appliedFilter['indicator-codes-filter']).toEqual([]);
      expect(appliedFilter['indicator-codes-tabs']).toEqual([]);
      expect(service.searchInput()).toBe('');
      expect(mainSpy).toHaveBeenCalled();
    });

    it('should clear table filters and reset sort when table exists', () => {
      const tableMock = {
        clear: jest.fn(),
        sortField: '' as string,
        sortOrder: 0 as number,
        first: 0 as number
      };
      service.tableRef.set(tableMock as any);

      service.clearAllFilters();

      expect(tableMock.clear).toHaveBeenCalled();
      expect(tableMock.sortField).toBe('result_official_code');
      expect(tableMock.sortOrder).toBe(-1);
      expect(tableMock.first).toBe(0);
    });

    it('should handle when table is null', () => {
      service.tableRef.set(undefined as any);
      service.clearAllFilters();
      expect(service.resultsFilter()['indicator-codes-filter']).toEqual([]);
    });

    it('should call cleanMultiselects after clearAllFilters via setTimeout', () => {
      jest.useFakeTimers();
      const cleanSpy = jest.spyOn(service, 'cleanMultiselects');
      jest.spyOn(service, 'onSelectFilterTab').mockImplementation(() => {});
      service.clearAllFilters();
      const callsBeforeFlush = cleanSpy.mock.calls.length;
      jest.runAllTimers();
      expect(cleanSpy.mock.calls.length).toBeGreaterThan(callsBeforeFlush);
      jest.useRealTimers();
    });
  });

  describe('cleanMultiselects', () => {
    it('should clear all multiselect refs', () => {
      const mockMultiselect = {
        clear: jest.fn()
      };

      service.multiselectRefs.set({
        test1: mockMultiselect as any,
        test2: mockMultiselect as any
      });

      service.cleanMultiselects();

      expect(mockMultiselect.clear).toHaveBeenCalledTimes(2);
    });

    it('should catch and warn when a multiselect clear throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const okMultiselect = { clear: jest.fn() };
      const failingMultiselect = {
        clear: jest.fn().mockImplementation(() => {
          throw new Error('clear failed');
        })
      };

      service.multiselectRefs.set({
        ok: okMultiselect as any,
        fail: failingMultiselect as any
      });

      service.cleanMultiselects();

      expect(okMultiselect.clear).toHaveBeenCalled();
      expect(failingMultiselect.clear).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Error clearing multiselect:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });
  });

  describe('tableColumns getValue functions', () => {
    it('should get project value correctly with primary contract in array', () => {
      const columns = service.tableColumns();
      const projectColumn = columns.find(col => col.field === 'project');
      const getValue = projectColumn?.getValue;

      if (getValue) {
        const result = {
          result_contracts: [
            { is_primary: 0, contract_id: 'A123' },
            { is_primary: 1, contract_id: 'B456' },
            { is_primary: 0, contract_id: 'C789' }
          ]
        } as unknown as Result;
        expect(getValue(result)).toBe('B456');
      }
    });

    it('should get project value correctly with primary contract as single object', () => {
      const columns = service.tableColumns();
      const projectColumn = columns.find(col => col.field === 'project');
      const getValue = projectColumn?.getValue;

      if (getValue) {
        const result = {
          result_contracts: { is_primary: 1, contract_id: 'D012' }
        } as unknown as Result;
        expect(getValue(result)).toBe('D012');
      }
    });

    it('should return "-" when no result_contracts', () => {
      const columns = service.tableColumns();
      const projectColumn = columns.find(col => col.field === 'project');
      const getValue = projectColumn?.getValue;

      if (getValue) {
        const result = {} as unknown as Result;
        expect(getValue(result)).toBe('-');
      }
    });

    it('should return "-" when result_contracts has no primary contract', () => {
      const columns = service.tableColumns();
      const projectColumn = columns.find(col => col.field === 'project');
      const getValue = projectColumn?.getValue;

      if (getValue) {
        const result = {
          result_contracts: [
            { is_primary: 0, contract_id: 'A123' },
            { is_primary: 0, contract_id: 'B456' }
          ]
        } as unknown as Result;
        expect(getValue(result)).toBe('-');
      }
    });

    it('should return "-" for indicator getValue when indicators is undefined', () => {
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator');
      const getValue = indicatorColumn?.getValue;
      if (getValue) expect(getValue({} as unknown as Result)).toBe('-');
    });

    it('should return indicator name for indicator getValue when indicators.name is set (cover line 77)', () => {
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator');
      const getValue = indicatorColumn?.getValue;
      if (getValue) expect(getValue({ indicators: { name: 'Capacity Sharing' } } as unknown as Result)).toBe('Capacity Sharing');
    });

    it('should return "-" for indicator getValue when indicators exists but name is undefined (cover line 77 branch)', () => {
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator_id');
      const getValue = indicatorColumn?.getValue;
      if (getValue) expect(getValue({ indicators: {} } as unknown as Result)).toBe('-');
    });

    it('should cover indicator getValue branches for line 77 (indicators null and indicators.name set)', () => {
      const columns = service.tableColumns();
      const indicatorColumn = columns.find(col => col.field === 'indicator_id');
      const getValue = indicatorColumn?.getValue;
      if (getValue) {
        expect(getValue({ indicators: null } as unknown as Result)).toBe('-');
        expect(getValue({ indicators: { name: 'Cap' } } as unknown as Result)).toBe('Cap');
      }
    });

    it('should return "-" for status getValue when result_status is undefined', () => {
      const columns = service.tableColumns();
      const statusColumn = columns.find(col => col.field === 'status');
      const getValue = statusColumn?.getValue;
      if (getValue) expect(getValue({} as unknown as Result)).toBe('-');
    });

    it('should return "-" for status getValue when result_status has no name (cover line 86)', () => {
      const columns = service.tableColumns();
      const statusColumn = columns.find(col => col.field === 'status');
      const getValue = statusColumn?.getValue;
      if (getValue) expect(getValue({ result_status: {} } as unknown as Result)).toBe('-');
    });

    it('should return "-" for creator getValue when created_by_user is null', () => {
      const columns = service.tableColumns();
      const creatorColumn = columns.find(col => col.field === 'creator');
      const getValue = creatorColumn?.getValue;
      if (getValue) expect(getValue({ created_by_user: null } as unknown as Result)).toBe('-');
    });

    it('should return "-" for creation_date getValue when created_at is null', () => {
      const columns = service.tableColumns();
      const dateColumn = columns.find(col => col.field === 'creation_date');
      const getValue = dateColumn?.getValue;
      if (getValue) expect(getValue({ created_at: null } as unknown as Result)).toBe('-');
    });

    it('should get lever value correctly with primary levers', () => {
      const columns = service.tableColumns();
      const leverColumn = columns.find(col => col.field === 'lever');
      const getValue = leverColumn?.getValue;

      if (getValue) {
        const result = {
          result_levers: [
            { is_primary: 0, lever: { short_name: 'Lever 1' } },
            { is_primary: 1, lever: { short_name: 'Lever 2' } },
            { is_primary: 1, lever: { short_name: 'Lever 3' } }
          ]
        } as unknown as Result;
        expect(getValue(result)).toBe('Lever 2, Lever 3');
      }
    });

    it('should return "-" when no result_levers', () => {
      const columns = service.tableColumns();
      const leverColumn = columns.find(col => col.field === 'lever');
      const getValue = leverColumn?.getValue;

      if (getValue) {
        const result = {} as unknown as Result;
        expect(getValue(result)).toBe('-');
      }
    });

    it('should return "-" when result_levers is not an array', () => {
      const columns = service.tableColumns();
      const leverColumn = columns.find(col => col.field === 'lever');
      const getValue = leverColumn?.getValue;

      if (getValue) {
        const result = { result_levers: {} } as unknown as Result;
        expect(getValue(result)).toBe('-');
      }
    });

    it('should get lever value with lever missing short_name using empty string', () => {
      const columns = service.tableColumns();
      const leverColumn = columns.find(col => col.field === 'lever');
      const getValue = leverColumn?.getValue;
      if (getValue) {
        const result = {
          result_levers: [
            { is_primary: 1, lever: {} },
            { is_primary: 1, lever: { short_name: 'L2' } }
          ]
        } as unknown as Result;
        expect(getValue(result)).toBe('L2');
      }
    });

    it('should return "-" when no primary levers', () => {
      const columns = service.tableColumns();
      const leverColumn = columns.find(col => col.field === 'lever');
      const getValue = leverColumn?.getValue;

      if (getValue) {
        const result = {
          result_levers: [{ is_primary: 0, lever: { short_name: 'Lever 1' } }]
        } as unknown as Result;
        expect(getValue(result)).toBe('-');
      }
    });

    it('should get research areas from direct result research areas', () => {
      const display = (result: Result) => (service as any).getResearchAreasDisplay(result);
      expect(
        display({
          result_research_areas: [{ research_area: { short_name: 'RA1' } }, { short_name: 'RA2' }]
        } as unknown as Result)
      ).toBe('RA1, RA2');
    });

    it('should get research areas from result levers when classified as research area', () => {
      const display = (result: Result) => (service as any).getResearchAreasDisplay(result);
      expect(
        display({
          result_levers: [
            { type: 'lever', lever: { short_name: 'L1' } },
            { type: 'research_area', lever: { short_name: 'RA1' } },
            { group: 'Research Area', lever: { short_name: 'RA2' } },
            { category: 'research-area', lever: { short_name: 'RA3' } }
          ]
        } as unknown as Result)
      ).toBe('RA1, RA2, RA3');
    });

    it('should return dash when research areas are missing', () => {
      const display = (result: Result) => (service as any).getResearchAreasDisplay(result);
      expect(display({ result_research_areas: [], result_levers: null } as unknown as Result)).toBe('-');
      expect(display({ research_areas: 'not-an-array' } as unknown as Result)).toBe('-');
    });

    it('should format research areas from alternate label fields', () => {
      const display = (result: Result) => (service as any).getResearchAreasDisplay(result);
      expect(
        display({
          research_areas: [
            { research_area: { short_name: null } },
            { research_area: { name: 'Research Area Name' } },
            { research_area: { full_name: 'Research Area Full Name' } },
            { lever: { short_name: 'Lever Short' } },
            { lever: { name: 'Lever Name' } },
            { lever: { full_name: 'Lever Full Name' } },
            { short_name: 'Direct Short' },
            { name: 'Direct Name' },
            { full_name: 'Direct Full Name' }
          ]
        } as unknown as Result)
      ).toBe(
        'Research Area Name, Research Area Full Name, Lever Short, Lever Name, Lever Full Name, Direct Short, Direct Name, Direct Full Name'
      );
    });

    it('should get year value correctly', () => {
      const columns = service.tableColumns();
      const yearColumn = columns.find(col => col.field === 'year');
      const getValue = yearColumn?.getValue;

      if (getValue) {
        const result = { report_year_id: 2024 } as unknown as Result;
        expect(getValue(result)).toBe('2024');
      }
    });

    it('should return "-" when report_year_id is null', () => {
      const columns = service.tableColumns();
      const yearColumn = columns.find(col => col.field === 'year');
      const getValue = yearColumn?.getValue;

      if (getValue) {
        const result = { report_year_id: null } as unknown as Result;
        expect(getValue(result)).toBe('-');
      }
    });
  });

  describe('removeFilter', () => {
    it('should remove INDICATOR TAB filter', () => {
      const onSelectFilterTabSpy = jest.spyOn(service, 'onSelectFilterTab');
      service.removeFilter('INDICATOR TAB');
      expect(onSelectFilterTabSpy).toHaveBeenCalledWith(0);
    });

    it('should remove INDICATOR filter', () => {
      service.tableFilters.set({
        indicators: [{ indicator_id: 1 }, { indicator_id: 2 }],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: []
      } as any);
      service.removeFilter('INDICATOR', 1);
      const filters = service.tableFilters();
      expect(filters.indicators).toEqual([{ indicator_id: 2 }]);
    });

    it('should remove STATUS filter', () => {
      service.tableFilters.set({
        indicators: [],
        statusCodes: [{ result_status_id: 1 }, { result_status_id: 2 }],
        years: [],
        contracts: [],
        levers: []
      } as any);
      service.removeFilter('STATUS', 1);
      const filters = service.tableFilters();
      expect(filters.statusCodes).toEqual([{ result_status_id: 2 }]);
    });

    it('should remove PROJECT filter', () => {
      service.tableFilters.set({
        indicators: [],
        statusCodes: [],
        years: [],
        contracts: [{ agreement_id: 'A1' }, { agreement_id: 'A2' }],
        levers: []
      } as any);
      service.removeFilter('PROJECT', 'A1');
      const filters = service.tableFilters();
      expect(filters.contracts).toEqual([{ agreement_id: 'A2' }]);
    });

    it('should remove LEVER filter', () => {
      service.tableFilters.set({
        indicators: [],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: [{ id: 1 }, { id: 2 }]
      } as any);
      service.removeFilter('LEVER', 1);
      const filters = service.tableFilters();
      expect(filters.levers).toEqual([{ id: 2 }]);
    });

    it('should remove YEAR filter', () => {
      service.tableFilters.set({
        indicators: [],
        statusCodes: [],
        years: [{ report_year: 2023 }, { report_year: 2024 }],
        contracts: [],
        levers: []
      } as any);
      service.removeFilter('YEAR', 2023);
      const filters = service.tableFilters();
      expect(filters.years).toEqual([{ report_year: 2024 }]);
    });

    it('should remove SOURCE filter', () => {
      service.tableFilters.set({
        indicators: [],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: [],
        sources: [{ platform_code: 'STAR' }, { platform_code: 'ROAR' }] as any
      } as any);
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('SOURCE', 'STAR');
      const filters = service.tableFilters();
      expect(filters.sources).toEqual([{ platform_code: 'ROAR' }]);
    });

    it('should call removeById on multiselect ref when multiple items remain', () => {
      const removeByIdSpy = jest.fn();
      service.multiselectRefs.set({
        indicator: { clear: jest.fn(), removeById: removeByIdSpy } as any
      });
      service.tableFilters.set({
        indicators: [{ indicator_id: 1 }, { indicator_id: 2 }],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: []
      } as any);
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('INDICATOR', 1);
      expect(removeByIdSpy).toHaveBeenCalledWith(1);
    });

    it('should call clear on multiselect ref when removing last item', () => {
      const clearSpy = jest.fn();
      service.multiselectRefs.set({
        indicator: { clear: clearSpy, removeById: jest.fn() } as any
      });
      service.tableFilters.set({
        indicators: [{ indicator_id: 1 }],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: []
      } as any);
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('INDICATOR', 1);
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should clear filter array when id is not provided', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': [1, 2] }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }, { id: 2 }] as any }));
      service.removeFilter('LEVER');
      expect(service.tableFilters().levers).toEqual([]);
      expect(service.resultsFilter()['lever-codes']).toEqual([]);
    });

    it('should clear filter array when id is undefined for INDICATOR', () => {
      service.tableFilters.set({
        indicators: [{ indicator_id: 1 }],
        statusCodes: [],
        years: [],
        contracts: [],
        levers: []
      } as any);
      service.removeFilter('INDICATOR');
      const filters = service.tableFilters();
      expect(filters.indicators).toEqual([]);
    });

    it('should return early when label is not in map', () => {
      const initialFilters = service.tableFilters();
      service.removeFilter('UNKNOWN');
      expect(service.tableFilters()).toEqual(initialFilters);
    });

    it('should handle removeFilter when state key is undefined', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'platform-code': ['pc1'] }));
      service.tableFilters.update(prev => ({ ...prev, sources: undefined as any }));
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('SOURCE', 'pc1');
      expect(service.tableFilters().sources).toEqual([]);
    });

    it('should handle removeFilter when state key is null', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'status-codes': [1] }));
      service.tableFilters.update(prev => ({ ...prev, statusCodes: null as any }));
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('STATUS', 1);
      expect(service.tableFilters().statusCodes).toEqual([]);
    });

    it('should not throw when multiselect ref has no clear method', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': [1] }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }] as any }));
      service.multiselectRefs.set({ lever: {} as any });
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      expect(() => service.removeFilter('LEVER', 1)).not.toThrow();
    });

    it('should not throw when multiselect ref has no removeById method', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'lever-codes': [1, 2] }));
      service.tableFilters.update(prev => ({ ...prev, levers: [{ id: 1 }, { id: 2 }] as any }));
      service.multiselectRefs.set({ lever: { clear: jest.fn() } as any });
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('LEVER', 1);
      expect(service.tableFilters().levers).toHaveLength(1);
    });

    it('should handle filter with undefined item in array when removing by id', () => {
      service.appliedFilters.update(prev => ({ ...prev, 'indicator-codes-filter': [1, 2] }));
      service.tableFilters.update(prev => ({
        ...prev,
        indicators: [undefined, { indicator_id: 1, name: 'A' }] as any
      }));
      jest.spyOn(service, 'applyFilters').mockImplementation(() => {});
      service.removeFilter('INDICATOR', 1);
      expect(service.tableFilters().indicators).toHaveLength(1);
      expect(service.tableFilters().indicators[0]).toBeUndefined();
    });
  });

  describe('clearAllFiltersWithPreserve', () => {
    it('should clear filters and preserve indicator codes', () => {
      const tableMock = {
        clear: jest.fn(),
        sortField: '',
        sortOrder: 0,
        first: 0
      };
      service.tableRef.set(tableMock as any);
      service.resultsFilter.set({ 'indicator-codes': [1, 2, 3] } as any);
      service.appliedFilters.set({ 'indicator-codes': [1, 2, 3] } as any);
      service.searchInput.set('test');

      service.clearAllFiltersWithPreserve([1, 2]);

      expect(service.tableFilters().indicators).toEqual([]);
      const filter = service.resultsFilter();
      // Note: onSelectFilterTab(0) is called at the end, which resets indicator-codes-tabs to []
      expect(filter['indicator-codes-tabs']).toEqual([]);
      expect(filter['indicator-codes']).toEqual([]);
      expect(filter['indicator-codes-filter']).toEqual([]);
      expect(filter['create-user-codes']).toEqual([]);
      expect(service.searchInput()).toBe('');
      expect(tableMock.clear).toHaveBeenCalled();
      expect(tableMock.sortField).toBe('result_official_code');
      expect(tableMock.sortOrder).toBe(-1);
    });

    it('should handle when table is null', () => {
      service.tableRef.set(undefined as any);
      service.clearAllFiltersWithPreserve([1]);
      const filter = service.resultsFilter();
      // Note: onSelectFilterTab(0) is called at the end, which resets indicator-codes-tabs to []
      expect(filter['indicator-codes-tabs']).toEqual([]);
      expect(filter['indicator-codes']).toEqual([]);
    });
  });

  describe('resetState', () => {
    it('should reset all state', () => {
      service.list.set([mockResults[0]]);
      service.loading.set(false);
      service.showFiltersSidebar.set(true);
      service.showConfigurationSidebar.set(true);
      service.multiselectRefs.set({ test: {} as any });
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);

      service.resetState();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(true);
      expect(service.showFiltersSidebar()).toBe(false);
      expect(service.showConfigurationSidebar()).toBe(false);
      expect(service.multiselectRefs()).toEqual({});
      expect(service.myResultsFilterItem()).toEqual(service.myResultsFilterItems[0]);
    });
  });

  describe('state persistence', () => {
    it('should activate persistence and save current state to sessionStorage', () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);
      service.searchInput.set('abc');
      service.primaryContractId.set('contract-1');
      service.resultsTablePaginatorFirst.set(50);
      service.resultsTablePaginatorRows.set(25);
      service.resultsFilter.update(prev => ({ ...prev, 'indicator-codes-tabs': [2] }));

      service.activateStatePersistence('demo');
      TestBed.flushEffects();

      const savedState = JSON.parse(sessionStorage.getItem('results-center-view-state:demo') ?? '{}');

      expect(service.activeStateKey()).toBe('demo');
      expect(savedState.myResultsFilterItemId).toBe('my');
      expect(savedState.primaryContractId).toBe('contract-1');
      expect(savedState.searchInput).toBe('abc');
      expect(savedState.resultsTablePaginatorFirst).toBe(50);
      expect(savedState.resultsTablePaginatorRows).toBe(25);
    });

    it('should persist all as default tab id when myResultsFilterItem is undefined', () => {
      service.myResultsFilterItem.set(undefined as any);

      service.activateStatePersistence('fallback');
      TestBed.flushEffects();

      const savedState = JSON.parse(sessionStorage.getItem('results-center-view-state:fallback') ?? '{}');
      expect(savedState.myResultsFilterItemId).toBe('all');
    });

    it('should clear active key only when deactivating the matching persistence key', () => {
      service.activateStatePersistence('demo');

      service.deactivateStatePersistence('other');
      expect(service.activeStateKey()).toBe('demo');

      service.deactivateStatePersistence('demo');
      expect(service.activeStateKey()).toBeNull();
    });

    it('should return false when there is no persisted state', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      expect(service.restorePersistedState('missing')).toBe(false);
      expect(getItemSpy).toHaveBeenCalledWith('results-center-view-state:missing');
    });

    it('should restore persisted state and sync active indicator tab', () => {
      const persistedState = {
        myResultsFilterItemId: 'my',
        tableFilters: {
          indicators: [{ indicator_id: 2, name: 'Indicator 2' }],
          statusCodes: [{ result_status_id: 9, name: 'Submitted' }],
          contracts: [{ agreement_id: 'C1', display_label: 'Contract 1' }],
          levers: [{ id: 4, short_name: 'L4' }],
          years: [{ report_year: 2025 }],
          sources: [{ platform_code: 'STAR', name: 'STAR' }]
        },
        resultsFilter: {
          'create-user-codes': ['123'],
          'indicator-codes': [2],
          'status-codes': [9],
          'contract-codes': ['C1'],
          'platform-code': ['STAR'],
          'lever-codes': [4],
          years: [2025],
          'indicator-codes-filter': [2],
          'indicator-codes-tabs': [2]
        },
        appliedFilters: {
          'create-user-codes': ['123'],
          'indicator-codes': [2],
          'status-codes': [9],
          'contract-codes': ['C1'],
          'platform-code': ['STAR'],
          'lever-codes': [4],
          years: [2025],
          'indicator-codes-filter': [2],
          'indicator-codes-tabs': [2]
        },
        searchInput: 'saved search',
        primaryContractId: 'contract-2',
        resultsTablePaginatorFirst: 100,
        resultsTablePaginatorRows: 25,
        resultsTableSortField: 'title',
        resultsTableSortOrder: 1
      };
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(persistedState));

      const restored = service.restorePersistedState('demo');

      expect(restored).toBe(true);
      expect(service.myResultsFilterItem()).toEqual(service.myResultsFilterItems[1]);
      expect(service.tableFilters().contracts).toEqual(persistedState.tableFilters.contracts);
      expect(service.resultsFilter()['platform-code']).toEqual(['STAR']);
      expect(service.appliedFilters()['indicator-codes-tabs']).toEqual([2]);
      expect(service.searchInput()).toBe('saved search');
      expect(service.primaryContractId()).toBe('contract-2');
      expect(service.resultsTablePaginatorFirst()).toBe(100);
      expect(service.resultsTablePaginatorRows()).toBe(25);
      expect(service.resultsTableSortField()).toBe('title');
      expect(service.resultsTableSortOrder()).toBe(1);
      expect(mockApiService.indicatorTabs.lazy().list().find(item => item.indicator_id === 2)?.active).toBe(true);
      expect(mockApiService.indicatorTabs.lazy().list().find(item => item.indicator_id === 1)?.active).toBe(false);
    });

    it('should fall back to defaults when persisted filters are missing', () => {
      const persistedState = {
        myResultsFilterItemId: 'unknown',
        searchInput: undefined,
        primaryContractId: undefined
      };
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(persistedState));

      const restored = service.restorePersistedState('defaults');

      expect(restored).toBe(true);
      expect(service.myResultsFilterItem()).toEqual(service.myResultsFilterItems[0]);
      expect(service.resultsFilter()).toEqual({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'platform-code': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(service.appliedFilters()).toEqual({
        'create-user-codes': [],
        'indicator-codes': [],
        'status-codes': [],
        'contract-codes': [],
        'platform-code': [],
        'lever-codes': [],
        years: [],
        'indicator-codes-filter': [],
        'indicator-codes-tabs': []
      });
      expect(service.searchInput()).toBe('');
      expect(service.primaryContractId()).toBeNull();
      expect(service.resultsTablePaginatorFirst()).toBe(0);
      expect(service.resultsTablePaginatorRows()).toBe(10);
      expect(mockApiService.indicatorTabs.lazy().list().every(item => item.active === false)).toBe(true);
    });

    it('should remove invalid persisted state and return false when parsing fails', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('{invalid-json');

      const restored = service.restorePersistedState('broken');

      expect(restored).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('Error restoring persisted results-center state:', expect.any(Error));
      expect(removeItemSpy).toHaveBeenCalledWith('results-center-view-state:broken');
      warnSpy.mockRestore();
    });
  });

  describe('invalidateResultsListFetchCache', () => {
    it('should clear fetch dedupe so main runs fetch again with same params', async () => {
      await service.main();
      expect(mockGetResultsService.fetchPaginated).toHaveBeenCalledTimes(1);
      await service.main();
      expect(mockGetResultsService.fetchPaginated).toHaveBeenCalledTimes(1);
      service.invalidateResultsListFetchCache();
      await service.main();
      expect(mockGetResultsService.fetchPaginated).toHaveBeenCalledTimes(2);
    });
  });

  describe('getExportResultFilter and getExportPaginationOptions', () => {
    it('getExportPaginationOptions should mirror table sort and search', () => {
      service.resultsTableSortField.set('title');
      service.resultsTableSortOrder.set(1);
      service.searchInput.set('  q  ');
      expect(service.getExportPaginationOptions()).toEqual({
        sortField: 'result-title',
        sortOrder: 'ASC',
        search: 'q'
      });
    });

    it('getExportPaginationOptions should use DESC when sort order is not ascending', () => {
      service.resultsTableSortField.set('result_official_code');
      service.resultsTableSortOrder.set(-1);
      service.searchInput.set('');
      expect(service.getExportPaginationOptions()).toEqual({
        sortField: 'code',
        sortOrder: 'DESC',
        search: ''
      });
    });

    it('getExportResultFilter should add create-user-codes on My Results tab without mutating signals incorrectly', () => {
      service.myResultsFilterItem.set({ id: 'my', label: 'My Results' });
      service.resultsFilter.set({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': [] });
      const f = service.getExportResultFilter();
      expect(f['create-user-codes']).toEqual(['123']);
    });

    it('getExportResultFilter should include contract-codes when primary project is pinned', () => {
      service.primaryContractId.set('C-99');
      service.resultsFilter.set({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': [] });
      expect(service.getExportResultFilter()['contract-codes']).toEqual(['C-99']);
    });

    it('getExportResultFilter should clear create-user-codes when tab is not My but filter still has user codes', () => {
      service.myResultsFilterItem.set({ id: 'all', label: 'All Results' });
      service.resultsFilter.set({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': ['123'] });
      expect(service.getExportResultFilter()['create-user-codes']).toEqual([]);
    });

    it('getExportResultFilter should keep existing create-user-codes on My tab when already set', () => {
      service.myResultsFilterItem.set({ id: 'my', label: 'My Results' });
      service.resultsFilter.set({ 'indicator-codes': [], 'lever-codes': [], 'create-user-codes': ['999'] });
      expect(service.getExportResultFilter()['create-user-codes']).toEqual(['999']);
    });
  });

  describe('main', () => {
    it('should pass contract-codes when primaryContractId is set', async () => {
      service.primaryContractId.set('contract-123');
      await service.main();
      expect(mockGetResultsService.fetchPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ 'contract-codes': ['contract-123'] }),
        expect.objectContaining({
          page: 1,
          limit: 10,
          sortField: 'code',
          sortOrder: 'DESC',
          search: ''
        }),
        expect.anything()
      );
    });

    it('should load results successfully', async () => {
      await service.main();

      const results = service.list();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        result_official_code: 'RES001',
        title: 'Test Result',
        indicators: { name: 'Test Indicator' },
        result_status: { name: 'SUBMITTED' },
        result_contracts: { contract_id: 'CON001' },
        result_levers: { lever: { short_name: 'LEV1' } },
        report_year_id: 2024,
        snapshot_years: [2023, 2024],
        created_by_user: { first_name: 'John', last_name: 'Doe' },
        created_at: '2024-01-01T00:00:00Z'
      });
      expect(results[0]).toHaveProperty('primaryLeverSort');
      expect(service.loading()).toBe(false);
    });

    it('should handle results with no primary levers', async () => {
      const resultsWithoutPrimary = [
        {
          ...mockResults[0],
          result_levers: [{ is_primary: 0, lever: { short_name: 'Lever 1' } }]
        }
      ];
      mockGetResultsService.fetchPaginated.mockResolvedValueOnce({ results: resultsWithoutPrimary, total: 1 });

      await service.main();

      const results = service.list();
      expect((results[0] as any).primaryLeverSort).toBe('');
    });

    it('should compute primaryLeverSort with lever short_name missing using empty string', async () => {
      const resultsWithLeverNoShortName = [
        {
          ...mockResults[0],
          result_levers: [
            { is_primary: 1, lever: {} },
            { is_primary: 1, lever: { short_name: 'L2' } }
          ]
        }
      ] as any;
      mockGetResultsService.fetchPaginated.mockResolvedValueOnce({ results: resultsWithLeverNoShortName, total: 1 });
      await service.main();
      const list = service.list();
      expect(list).toHaveLength(1);
      expect((list[0] as any).primaryLeverSort).toBe('l2');
    });

    it('should handle results with primary levers', async () => {
      const resultsWithPrimary = [
        {
          ...mockResults[0],
          result_levers: [
            { is_primary: 1, lever: { short_name: 'Lever 1' } },
            { is_primary: 1, lever: { short_name: 'Lever 2' } }
          ]
        }
      ];
      mockGetResultsService.fetchPaginated.mockResolvedValueOnce({ results: resultsWithPrimary, total: 1 });

      await service.main();

      const results = service.list();
      expect((results[0] as any).primaryLeverSort).toBe('lever 1, lever 2');
    });

    it('should handle errors when loading results', async () => {
      mockGetResultsService.fetchPaginated.mockRejectedValueOnce(new Error('API Error'));

      // Mock console.error to prevent error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading results:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should set create-user-codes to current user when tab is my and create-user-codes is empty', async () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[1]);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [] }));
      service.appliedFilters.update(prev => ({ ...prev, 'create-user-codes': [] }));

      await service.main();

      expect(service.resultsFilter()['create-user-codes']).toEqual(['123']);
      expect(service.appliedFilters()['create-user-codes']).toEqual(['123']);
    });

    it('should not update list when context changes during request', async () => {
      const initialList = [{ result_official_code: 'OLD' }] as any;
      service.list.set(initialList);
      let resolveFetch!: (v: { results: Result[]; total: number }) => void;
      const fetchPromise = new Promise<{ results: Result[]; total: number }>(r => {
        resolveFetch = r;
      });
      mockGetResultsService.fetchPaginated.mockImplementationOnce(() => fetchPromise as any);
      const mainPromise = service.main();
      await Promise.resolve();
      service.primaryContractId.set('other-contract');
      resolveFetch({ results: mockResults, total: 1 });
      await mainPromise;
      expect(service.list()).toEqual(initialList);
    });

    it('should handle results with no created_by_user', async () => {
      const resultsWithoutUser = [{ ...mockResults[0], created_by_user: undefined }];
      mockGetResultsService.fetchPaginated.mockResolvedValueOnce({ results: resultsWithoutUser, total: 1 });

      await service.main();

      expect(service.list()[0]).toHaveProperty('_creatorFullName', '');
    });

    it('should handle created_by_user with null first_name and last_name', async () => {
      const resultsWithNullNames = [{ ...mockResults[0], created_by_user: { first_name: null, last_name: null } }];
      mockGetResultsService.fetchPaginated.mockResolvedValueOnce({ results: resultsWithNullNames, total: 1 });

      await service.main();

      expect(service.list()[0]).toHaveProperty('_creatorFullName');
      expect(typeof (service.list()[0] as any)._creatorFullName).toBe('string');
    });

    it('should clear create-user-codes when tab is not my and create-user-codes has items', async () => {
      service.myResultsFilterItem.set(service.myResultsFilterItems[0]);
      service.resultsFilter.update(prev => ({ ...prev, 'create-user-codes': [999] as any }));
      service.appliedFilters.update(prev => ({ ...prev, 'create-user-codes': [999] as any }));

      await service.main();

      expect(service.resultsFilter()['create-user-codes']).toEqual([]);
      expect(service.appliedFilters()['create-user-codes']).toEqual([]);
    });
  });

  describe('buildSearchField', () => {
    it('should return the single word when only one word is provided', () => {
      expect(service.buildSearchField('Daniela')).toBe('daniela');
    });
  });
});
