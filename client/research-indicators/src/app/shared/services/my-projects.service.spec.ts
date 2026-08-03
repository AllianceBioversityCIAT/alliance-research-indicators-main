import { TestBed } from '@angular/core/testing';
import { MyProjectsService, MyProjectsFilters } from './my-projects.service';
import { ApiService } from './api.service';
import { CacheService } from './cache/cache.service';
import { MenuItem } from 'primeng/api';
import { ContractsResponseWithMeta } from '../interfaces/contracts-response-with-meta.interface';

describe('MyProjectsService', () => {
  let service: MyProjectsService;
  let mockApiService: any;
  let mockCacheService: any;

  const mockFindContractsResponseData = [
    {
      agreement_id: 'A001',
      projectDescription: 'Test Project',
      description: 'Test Description',
      project_lead_description: 'Test Lead',
      principal_investigator: 'Test PI',
      lever_name: 'Test Lever',
      lever: {
        short_name: 'TL',
        name: 'Test Lever'
      }
    },
    {
      agreement_id: 'A002',
      projectDescription: 'Test Project 2',
      description: 'Test Description 2',
      project_lead_description: 'Test Lead 2',
      principal_investigator: null,
      lever_name: null,
      lever: 'Test Lever String'
    }
  ];

  beforeEach(() => {
    mockApiService = {
      GET_FindContracts: jest.fn().mockResolvedValue({
        data: { data: mockFindContractsResponseData },
        status: 200,
        description: 'ok',
        timestamp: new Date().toISOString(),
        path: '/find-contracts',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      })
    };

    mockCacheService = {
      dataCache: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [MyProjectsService, { provide: ApiService, useValue: mockApiService }, { provide: CacheService, useValue: mockCacheService }]
    });

    service = TestBed.inject(MyProjectsService);
    globalThis.sessionStorage?.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.sessionStorage?.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(true);
      expect(service.isOpenSearch()).toBe(false);
      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.showFiltersSidebar()).toBe(false);
      expect(service.multiselectRefs()).toEqual({});
      expect(service.searchInput()).toBe('');
      expect(service.myProjectsFilterItem()).toEqual(service.myProjectsFilterItems[0]);
    });

    it('should have correct filter items', () => {
      expect(service.myProjectsFilterItems).toEqual([
        { id: 'all', label: 'All Projects' },
        { id: 'my', label: 'My Projects' }
      ]);
    });
  });

  describe('hasFilters computed', () => {
    it('should return false when no filters are active', () => {
      expect(service.hasFilters()).toBe(false);
    });

    it('should return true when contract code filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when project name filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        projectName: 'Test Project'
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when principal investigator filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        principalInvestigator: 'Test PI'
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when levers filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        levers: [{ id: 1, short_name: 'Test' }]
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when status codes filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when funding types filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [{ funding_type: 'BLR' }]
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when start date filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: '2024-01-01'
      });
      expect(service.hasFilters()).toBe(true);
    });

    it('should return true when end date filter is active', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        endDate: '2024-12-31'
      });
      expect(service.hasFilters()).toBe(true);
    });
  });

  describe('getBaseParams', () => {
    it('should return correct params for all projects', () => {
      service.myProjectsFilterItem.set(service.myProjectsFilterItems[0]);
      const params = (service as any).getBaseParams();
      expect(params).toEqual({ 'current-user': false, 'with-indicators': false });
    });

    it('should return correct params for my projects', () => {
      service.myProjectsFilterItem.set(service.myProjectsFilterItems[1]);
      const params = (service as any).getBaseParams();
      expect(params).toEqual({ 'current-user': true, 'with-indicators': false });
    });

    it('should return correct params when myProjectsFilterItem is undefined', () => {
      service.myProjectsFilterItem.set(undefined);
      const params = (service as any).getBaseParams();
      expect(params).toEqual({ 'current-user': false, 'with-indicators': false });
    });
  });

  describe('isFilterActive', () => {
    it('should return false for empty string', () => {
      expect((service as any).isFilterActive('')).toBe(false);
    });

    it('should return true for non-empty string', () => {
      expect((service as any).isFilterActive('test')).toBe(true);
    });

    it('should return false for empty array', () => {
      expect((service as any).isFilterActive([])).toBe(false);
    });

    it('should return true for non-empty array', () => {
      expect((service as any).isFilterActive([{ id: 1, short_name: 'test' }])).toBe(true);
    });
  });

  describe('getLeverDisplayName', () => {
    it('should return joined names from levers array', () => {
      const item = { levers: [{ short_name: 'L1' }, { short_name: 'L2' }] };
      expect((service as any).getLeverDisplayName(item)).toBe('L1, L2');
    });

    it('should return name from single levers object (non-array)', () => {
      const item = { levers: { short_name: 'Single' } };
      expect((service as any).getLeverDisplayName(item)).toBe('Single');
    });

    it('should filter out falsy short_name from levers and fall through when empty', () => {
      const item = { levers: [{ short_name: '' }], lever_name: 'Fallback' };
      expect((service as any).getLeverDisplayName(item)).toBe('Fallback');
    });

    it('should return lever_name when available', () => {
      const item = { lever_name: 'Test Lever' };
      expect((service as any).getLeverDisplayName(item)).toBe('Test Lever');
    });

    it('should return lever.short_name when lever is object and lever_name is not available', () => {
      const item = { lever: { short_name: 'TL', name: 'Test Lever' } };
      expect((service as any).getLeverDisplayName(item)).toBe('TL');
    });

    it('should return lever.name when lever is object and short_name is not available', () => {
      const item = { lever: { name: 'Test Lever' } };
      expect((service as any).getLeverDisplayName(item)).toBe('Test Lever');
    });

    it('should return empty string when lever is object but no name properties', () => {
      const item = { lever: {} };
      expect((service as any).getLeverDisplayName(item)).toBe('');
    });

    it('should return lever string when lever is string', () => {
      const item = { lever: 'Test Lever String' };
      expect((service as any).getLeverDisplayName(item)).toBe('Test Lever String');
    });

    it('should return empty string when lever is not available', () => {
      const item = {};
      expect((service as any).getLeverDisplayName(item)).toBe('');
    });
  });

  describe('main method', () => {
    it('should fetch and process data successfully', async () => {
      await service.main();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'with-indicators': false,
          'order-field': 'contract-code',
          direction: 'DESC'
        })
      );
      expect(service.loading()).toBe(false);
      expect(service.list()).toHaveLength(2);

      const firstItem = service.list()[0];
      expect((firstItem as any).full_name).toBe('A001 Test Project Test Description Test Lead');
      expect((firstItem as any).display_principal_investigator).toBe('Test PI');
      expect((firstItem as any).display_lever_name).toBe('Test Lever');

      const secondItem = service.list()[1];
      expect((secondItem as any).full_name).toBe('A002 Test Project 2 Test Description 2 Test Lead 2');
      expect((secondItem as any).display_principal_investigator).toBe('Test Lead 2');
      expect((secondItem as any).display_lever_name).toBe('Test Lever String');
    });

    it('should handle API response without data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: undefined,
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with null data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: null,
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with undefined data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: undefined,
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with false data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: false as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with empty string data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: '' as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with empty array data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: [],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with no response object', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce(null as any);

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with non-array data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: 'not-an-array' as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with zero data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: 0 as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with NaN data', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: NaN as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with undefined response', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce(undefined as any);

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with null response', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce(null as any);

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with empty object', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: undefined,
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with data property but falsy value', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: false as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with data property but empty string', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: '' as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with data property but zero', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: 0 as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with data property but NaN', async () => {
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: NaN as unknown as any[],
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.GET_FindContracts.mockRejectedValueOnce(new Error('API Error'));

      await service.main();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch find contracts:', expect.any(Error));
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not clear list on API error when tab changed before response', async () => {
      await service.main();
      expect(service.list()).toHaveLength(2);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      service.myProjectsFilterItem.set(service.myProjectsFilterItems[1]);
      let rejectApi: (reason: any) => void;
      mockApiService.GET_FindContracts.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectApi = reject;
          })
      );
      const mainPromise = service.main();
      service.myProjectsFilterItem.set(service.myProjectsFilterItems[0]);
      rejectApi!(new Error('API Error'));
      await mainPromise;

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch find contracts:', expect.any(Error));
      expect(service.list()).toHaveLength(2);
      expect(service.loading()).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should call API with custom params and default sort', async () => {
      const customParams = { 'test-param': 'test-value' };
      await service.main(customParams);

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          ...customParams,
          'with-indicators': false,
          'order-field': 'contract-code',
          direction: 'DESC'
        })
      );
    });

    it('should handle item with no principal_investigator and no project_lead_description', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A003',
              projectDescription: 'Test Project 3',
              description: 'Test Description 3',
              project_lead_description: null,
              principal_investigator: null,
              lever_name: 'Test Lever 3'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('');
    });

    it('should handle item with empty principal_investigator but valid project_lead_description', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A004',
              projectDescription: 'Test Project 4',
              description: 'Test Description 4',
              project_lead_description: 'Valid Lead Description',
              principal_investigator: '',
              lever_name: 'Test Lever 4'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('Valid Lead Description');
    });

    it('should handle item with undefined principal_investigator but valid project_lead_description', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A005',
              projectDescription: 'Test Project 5',
              description: 'Test Description 5',
              project_lead_description: 'Valid Lead Description',
              principal_investigator: undefined,
              lever_name: 'Test Lever 5'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('Valid Lead Description');
    });

    it('should handle item with valid principal_investigator', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A006',
              projectDescription: 'Test Project 6',
              description: 'Test Description 6',
              project_lead_description: 'Lead Description',
              principal_investigator: 'Valid Principal Investigator',
              lever_name: 'Test Lever 6'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('Valid Principal Investigator');
    });

    it('should handle item with empty principal_investigator and empty project_lead_description', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A007',
              projectDescription: 'Test Project 7',
              description: 'Test Description 7',
              project_lead_description: '',
              principal_investigator: '',
              lever_name: 'Test Lever 7'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('');
    });

    it('should handle item with false principal_investigator but valid project_lead_description', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A008',
              projectDescription: 'Test Project 8',
              description: 'Test Description 8',
              project_lead_description: 'Valid Lead Description',
              principal_investigator: false,
              lever_name: 'Test Lever 8'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('Valid Lead Description');
    });

    it('should handle item with 0 principal_investigator but valid project_lead_description', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              agreement_id: 'A009',
              projectDescription: 'Test Project 9',
              description: 'Test Description 9',
              project_lead_description: 'Valid Lead Description',
              principal_investigator: 0,
              lever_name: 'Test Lever 9'
            }
          ]
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.list()).toHaveLength(1);
      const item = service.list()[0] as any;
      expect(item.display_principal_investigator).toBe('Valid Lead Description');
    });

    it('should set totalRecords to 0 when listData is empty array', async () => {
      const mockResponse = {
        data: { data: [] },
        metadata: { total: 100 },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.totalRecords()).toBe(0);
      expect(service.list()).toEqual([]);
    });

    it('should use parsedTotal when metadata.total is valid', async () => {
      const mockResponse = {
        data: { data: mockFindContractsResponseData },
        metadata: { total: 50 },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.totalRecords()).toBe(50);
    });

    it('should use listData.length when metadata.total is not finite', async () => {
      const mockResponse = {
        data: { data: mockFindContractsResponseData },
        metadata: { total: Infinity },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.totalRecords()).toBe(2);
    });

    it('should use metadata.total from response.metadata when available', async () => {
      const mockResponse = {
        data: { data: mockFindContractsResponseData },
        metadata: { total: 75 },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      } as ContractsResponseWithMeta;
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.totalRecords()).toBe(75);
    });

    it('should use metadata.total from response.data.metadata when response.metadata is not available', async () => {
      const mockResponse = {
        data: {
          data: mockFindContractsResponseData,
          metadata: { total: 88 }
        },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce(mockResponse);

      await service.main();

      expect(service.totalRecords()).toBe(88);
    });

    it('should set display_lever_name from lever.name when lever has no short_name (cover getLeverDisplayName path from main)', async () => {
      const itemWithLeverNameOnly = {
        agreement_id: 'A010',
        projectDescription: 'P',
        description: 'D',
        project_lead_description: 'L',
        principal_investigator: 'PI',
        lever_name: null,
        lever: { name: 'Lever Name Only' }
      };
      mockApiService.GET_FindContracts.mockResolvedValueOnce({
        data: { data: [itemWithLeverNameOnly] },
        status: 200,
        description: 'ok',
        timestamp: '',
        path: '',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      });

      await service.main();

      expect(service.list()).toHaveLength(1);
      expect((service.list()[0] as any).display_lever_name).toBe('Lever Name Only');
    });
  });

  describe('main method - direction and tab-change branches', () => {
    it('should set direction to DESC when direction is null', async () => {
      await service.main({ 'current-user': true, direction: null });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(expect.objectContaining({ direction: 'DESC', 'order-field': 'contract-code' }));
    });

    it('should set direction to DESC when direction is empty string', async () => {
      await service.main({ 'current-user': true, direction: '' });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(expect.objectContaining({ direction: 'DESC', 'order-field': 'contract-code' }));
    });

    it('should default order-field to contract-code when missing', async () => {
      await service.main({ 'current-user': false, page: 1, limit: 10 });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(expect.objectContaining({ 'order-field': 'contract-code', direction: 'DESC' }));
    });

    it('should keep explicit order-field when provided', async () => {
      await service.main({ 'current-user': false, 'order-field': 'project-name', direction: 'ASC' });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(expect.objectContaining({ 'order-field': 'project-name', direction: 'ASC' }));
    });

    it('should not update list when tab changes during request', async () => {
      let resolveApi!: (value: any) => void;
      mockApiService.GET_FindContracts.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveApi = resolve;
          })
      );

      const mainPromise = service.main();
      service.myProjectsFilterItem.set({ id: 'different-tab', label: 'Other' });
      resolveApi({
        data: {
          data: [
            {
              agreement_id: 'X',
              projectDescription: 'P',
              description: 'D',
              project_lead_description: 'L',
              principal_investigator: 'PI',
              lever_name: 'Lv'
            }
          ]
        }
      });
      await mainPromise;

      expect(service.list()).toEqual([]);
    });
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should apply contract code filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'contract-code': 'A001',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().contractCode).toBe('A001');
    });

    it('should apply project name filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        projectName: 'Test Project'
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'project-name': 'Test Project',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().projectName).toBe('Test Project');
    });

    it('should apply principal investigator filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        principalInvestigator: 'Test PI'
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'principal-investigator': 'Test PI',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().principalInvestigator).toBe('Test PI');
    });

    it('should apply levers filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        levers: [
          { id: 1, short_name: 'Test' },
          { id: 2, short_name: 'Test2' }
        ]
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          lever: '1,2',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().levers).toHaveLength(2);
    });

    it('should apply status codes filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [
          { name: 'Active', value: 'active' },
          { name: 'Inactive', value: 'inactive' }
        ]
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          status: 'active,inactive',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().statusCodes).toHaveLength(2);
    });

    it('should apply funding types filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [{ funding_type: 'BLR' }, { funding_type: 'RUN' }]
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'funding-type': 'BLR,RUN',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().fundingTypes).toHaveLength(2);
    });

    it('should apply start date filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        startDate: '2024-01-01'
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'start-date': '2024-01-01T00:00:00.000',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().startDate).toBe('2024-01-01');
    });

    it('should apply end date filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        endDate: '2024-12-31'
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'end-date': '2024-12-31T00:00:00.000',
          page: 1,
          limit: 10
        })
      );
      expect(service.appliedFilters().endDate).toBe('2024-12-31');
    });

    it('should apply multiple filters', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001',
        projectName: 'Test Project',
        levers: [{ id: 1, short_name: 'Test' }]
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'contract-code': 'A001',
          'project-name': 'Test Project',
          lever: '1',
          page: 1,
          limit: 10
        })
      );
    });

    it('should apply filters for my projects', () => {
      service.myProjectsFilterItem.set(service.myProjectsFilterItems[1]);
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.applyFilters();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': true,
          'contract-code': 'A001',
          page: 1,
          limit: 10
        })
      );
    });

    it('should include query parameter when provided', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.applyFilters({ page: 1, limit: 10, query: 'test query' });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'contract-code': 'A001',
          page: 1,
          limit: 10,
          query: 'test query'
        })
      );
    });

    it('should include sort parameters when sortField is provided', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.applyFilters({ page: 1, limit: 10, sortField: 'contract-code', sortOrder: 1 });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'current-user': false,
          'contract-code': 'A001',
          page: 1,
          limit: 10,
          'order-field': 'contract-code',
          direction: 'ASC'
        })
      );
    });

    it('should set direction to DESC when sortOrder is not 1', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.applyFilters({ page: 1, limit: 10, sortField: 'contract-code', sortOrder: -1 });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          'order-field': 'contract-code',
          direction: 'DESC'
        })
      );
    });

    it('should include both query and sort parameters', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.applyFilters({ page: 1, limit: 10, query: 'test', sortField: 'contract-code', sortOrder: 1 });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test',
          'order-field': 'contract-code',
          direction: 'ASC'
        })
      );
    });
  });

  describe('countFiltersSelected computed', () => {
    it('should return undefined when no filters are selected', () => {
      expect(service.countFiltersSelected()).toBeUndefined();
    });

    it('should return count when filters are selected', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001',
        projectName: 'Test Project',
        levers: [
          { id: 1, short_name: 'Test' },
          { id: 2, short_name: 'L2' }
        ],
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      // contractCode (1) + projectName (1) + levers (2) + status (1) = 5
      expect(service.countFiltersSelected()).toBe('5');
    });

    it('should count principalInvestigator filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        principalInvestigator: 'Test PI'
      });

      expect(service.countFiltersSelected()).toBe('1');
    });

    it('should count startDate filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        startDate: '2024-01-01'
      });

      expect(service.countFiltersSelected()).toBe('1');
    });

    it('should count endDate filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        endDate: '2024-12-31'
      });

      expect(service.countFiltersSelected()).toBe('1');
    });

    it('should handle levers with null/undefined length', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        levers: undefined as any
      });

      expect(service.countFiltersSelected()).toBeUndefined();
    });

    it('should handle statusCodes with null/undefined length', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: undefined as any
      });

      expect(service.countFiltersSelected()).toBeUndefined();
    });

    it('should count funding types filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [{ funding_type: 'BLR' }, { funding_type: 'RUN' }]
      });

      expect(service.countFiltersSelected()).toBe('2');
    });

    it('should handle fundingTypes with null/undefined length', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: undefined as any
      });

      expect(service.countFiltersSelected()).toBeUndefined();
    });
  });

  describe('getActiveFilters computed', () => {
    it('should return empty array when no filters are applied', () => {
      expect(service.getActiveFilters()).toEqual([]);
    });

    it('should return active filters', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001',
        projectName: 'Test Project',
        levers: [{ id: 1, short_name: 'Test' }]
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'CONTRACT CODE' }),
          expect.objectContaining({ label: 'PROJECT NAME' }),
          expect.objectContaining({ label: 'LEVER' })
        ])
      );
    });

    it('should include statusCodes in getActiveFilters (cover statusCodes forEach)', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [
          { name: 'Active', value: 'active' },
          { name: 'Draft', value: 'draft' }
        ]
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toHaveLength(2);
      expect(activeFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'STATUS', value: 'Active', id: 'active' }),
          expect.objectContaining({ label: 'STATUS', value: 'Draft', id: 'draft' })
        ])
      );
    });

    it('should include fundingTypes in getActiveFilters', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [{ funding_type: 'BLR' }, { funding_type: 'RUN' }]
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toHaveLength(2);
      expect(activeFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'FUNDING TYPE', value: 'BLR', id: 'BLR' }),
          expect.objectContaining({ label: 'FUNDING TYPE', value: 'RUN', id: 'RUN' })
        ])
      );
    });

    it('should format start date correctly', () => {
      // Use a date that will work in all timezones
      const dateStr = '2024-01-15T12:00:00.000Z';
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: dateStr
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toHaveLength(1);
      expect(activeFilters[0].label).toBe('START DATE');
      // The date format should be: "MMM, DD /YYYY"
      expect(activeFilters[0].value).toMatch(/^[A-Z][a-z]{2}, \d{2} \/\d{4}$/);
      expect(activeFilters[0].value).toContain('2024');
    });

    it('should format end date correctly', () => {
      // Use a date that will work in all timezones
      const dateStr = '2024-12-25T12:00:00.000Z';
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        endDate: dateStr
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toHaveLength(1);
      expect(activeFilters[0].label).toBe('END DATE');
      // The date format should be: "MMM, DD /YYYY"
      expect(activeFilters[0].value).toMatch(/^[A-Z][a-z]{2}, \d{2} \/\d{4}$/);
      expect(activeFilters[0].value).toContain('2024');
    });

    it('should handle invalid date in formatDate', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: 'invalid-date'
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toEqual([expect.objectContaining({ label: 'START DATE', value: 'invalid-date' })]);
    });

    it('should return empty string for empty date', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: ''
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toEqual([]);
    });

    it('should handle lever without short_name', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        levers: [{ id: 5 } as any]
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toEqual([expect.objectContaining({ label: 'LEVER', value: '5', id: 5 })]);
    });

    it('should include principalInvestigator in active filters', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        principalInvestigator: 'Test PI'
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toEqual([expect.objectContaining({ label: 'PRINCIPAL INVESTIGATOR', value: 'Test PI' })]);
    });

    it('should handle empty date string in formatDate', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: ''
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters).toEqual([]);
    });

    it('should handle null date in formatDate', () => {
      // Set a truthy value first, then override to null
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: null as any
      });

      const activeFilters = service.getActiveFilters();
      // formatDate will receive null and return empty string, but the filter won't be added because of the outer if check
      expect(activeFilters).toEqual([]);
    });

    it('should handle date with whitespace only', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: '   ' as any
      });

      const activeFilters = service.getActiveFilters();
      // Whitespace is truthy, so formatDate will be called
      expect(activeFilters.length).toBeGreaterThan(0);
      expect(activeFilters[0].label).toBe('START DATE');
    });

    it('should handle zero as date value', () => {
      // Zero is falsy, so formatDate should handle it
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: 0 as any
      });

      const activeFilters = service.getActiveFilters();
      // Zero is falsy, so the filter won't be added
      expect(activeFilters).toEqual([]);
    });

    it('should handle false as date value', () => {
      // False is falsy, so formatDate should handle it
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: false as any
      });

      const activeFilters = service.getActiveFilters();
      // False is falsy, so the filter won't be added
      expect(activeFilters).toEqual([]);
    });

    it('should handle formatDate when startDate is truthy but becomes empty inside', () => {
      // Test with valid date
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: '2024-01-01T00:00:00.000Z'
      });
      let activeFilters = service.getActiveFilters();
      expect(activeFilters.length).toBe(1);
      expect(activeFilters[0].label).toBe('START DATE');

      // Test with endDate
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        endDate: '2024-12-31T23:59:59.999Z'
      });
      activeFilters = service.getActiveFilters();
      expect(activeFilters.length).toBe(1);
      expect(activeFilters[0].label).toBe('END DATE');
    });

    it('should handle formatDate with falsy value to cover line 199', () => {
      // To cover line 199 (if (!iso) return '';), we need formatDate to receive a falsy value
      // Since formatDate is internal and only called when startDate/endDate is truthy,
      // we use Object.defineProperty with a getter that returns different values
      // on each access to bypass the outer truthy check

      let accessCount = 0;
      const customFilters: any = Object.assign(Object.create(MyProjectsFilters.prototype), new MyProjectsFilters());

      Object.defineProperty(customFilters, 'startDate', {
        get() {
          accessCount++;
          // Return truthy on first access (for outer if check), empty string on subsequent (for formatDate)
          return accessCount === 1 ? ' ' : ''; // Space is truthy, empty string is falsy
        },
        enumerable: true,
        configurable: true
      });

      service.appliedFilters.set(customFilters);
      const activeFilters = service.getActiveFilters();

      // The filter should be added (first access was truthy), but value should be empty (formatDate received '')
      expect(activeFilters.length).toBe(1);
      expect(activeFilters[0].label).toBe('START DATE');
      expect(activeFilters[0].value).toBe(''); // formatDate('') returns '' via line 199
    });

    it('should test getActiveFilters with both startDate and endDate', () => {
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        contractCode: 'TEST'
      });

      const activeFilters = service.getActiveFilters();
      expect(activeFilters.length).toBe(3);
      expect(activeFilters.some(f => f.label === 'START DATE')).toBe(true);
      expect(activeFilters.some(f => f.label === 'END DATE')).toBe(true);
      expect(activeFilters.some(f => f.label === 'CONTRACT CODE')).toBe(true);
    });
  });

  describe('onActiveItemChange', () => {
    it('should change filter item and reset filters', () => {
      jest.clearAllMocks();
      const newItem: MenuItem = { id: 'my', label: 'My Projects' };

      service.onActiveItemChange(newItem);

      expect(service.myProjectsFilterItem()).toBe(newItem);
      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.searchInput()).toBe('');
      expect(mockApiService.GET_FindContracts).not.toHaveBeenCalled();
    });
  });

  describe('showFilterSidebar', () => {
    it('should show filter sidebar', () => {
      service.showFilterSidebar();
      expect(service.showFiltersSidebar()).toBe(true);
    });
  });

  describe('cleanMultiselects', () => {
    it('should clear multiselects successfully', () => {
      const mockMultiselect = {
        clear: jest.fn()
      } as any;

      service.multiselectRefs.set({
        test: mockMultiselect
      });

      service.cleanMultiselects();

      expect(mockMultiselect.clear).toHaveBeenCalled();
    });

    it('should handle error when clearing multiselect', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockMultiselect = {
        clear: jest.fn().mockImplementation(() => {
          throw new Error('Clear error');
        })
      } as any;

      service.multiselectRefs.set({
        test: mockMultiselect
      });

      service.cleanMultiselects();

      expect(consoleSpy).toHaveBeenCalledWith('Error clearing multiselect:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle multiselect without clear method', () => {
      const mockMultiselect = {} as any;

      service.multiselectRefs.set({
        test: mockMultiselect
      });

      expect(() => service.cleanMultiselects()).not.toThrow();
    });

    it('should handle empty multiselect refs', () => {
      service.multiselectRefs.set({});
      expect(() => service.cleanMultiselects()).not.toThrow();
    });

    it('should skip null/undefined ref values in cleanMultiselects (cover falsy multiselect branch)', () => {
      const mockClear = jest.fn();
      service.multiselectRefs.set({
        status: { clear: mockClear } as any,
        lever: null as any
      });
      service.cleanMultiselects();
      expect(mockClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAllFilters', () => {
    it('should clear all filters without fetching (caller reloads)', () => {
      jest.clearAllMocks();
      service.clearAllFilters();

      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.searchInput()).toBe('');
      expect(mockApiService.GET_FindContracts).not.toHaveBeenCalled();
    });
  });

  describe('clearFilters', () => {
    it('should clear filters without fetching (caller reloads)', () => {
      jest.clearAllMocks();
      service.clearFilters();

      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.searchInput()).toBe('');
      expect(mockApiService.GET_FindContracts).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh data', () => {
      service.refresh();

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(expect.objectContaining({ 'current-user': false, page: 1, limit: 10 }));
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001',
        projectName: 'Test Project'
      });
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });
      service.searchInput.set('test search');

      service.resetFilters();

      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.searchInput()).toBe('');
    });
  });

  describe('resetState', () => {
    it('should reset all state', () => {
      service.resetState();

      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.searchInput()).toBe('');
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(true);
      expect(service.isOpenSearch()).toBe(false);
      expect(service.showFiltersSidebar()).toBe(false);
      expect(service.multiselectRefs()).toEqual({});
      expect(service.myProjectsFilterItem()).toEqual(service.myProjectsFilterItems[0]);
    });
  });

  describe('removeFilter', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should remove contractCode filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });

      service.removeFilter('CONTRACT CODE');

      expect(service.tableFilters().contractCode).toBe('');
    });

    it('should remove projectName filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        projectName: 'Test Project'
      });

      service.removeFilter('PROJECT NAME');

      expect(service.tableFilters().projectName).toBe('');
    });

    it('should remove principalInvestigator filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        principalInvestigator: 'Test PI'
      });

      service.removeFilter('PRINCIPAL INVESTIGATOR');

      expect(service.tableFilters().principalInvestigator).toBe('');
    });

    it('should remove startDate filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        startDate: '2024-01-01'
      });

      service.removeFilter('START DATE');

      expect(service.tableFilters().startDate).toBe('');
    });

    it('should remove endDate filter', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        endDate: '2024-12-31'
      });

      service.removeFilter('END DATE');

      expect(service.tableFilters().endDate).toBe('');
    });

    it('should remove all statusCodes when id is null', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [
          { name: 'Active', value: 'active' },
          { name: 'Inactive', value: 'inactive' }
        ]
      });

      service.removeFilter('STATUS');

      expect(service.tableFilters().statusCodes).toEqual([]);
    });

    it('should remove specific statusCode when id is provided', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [
          { name: 'Active', value: 'active' },
          { name: 'Inactive', value: 'inactive' }
        ]
      });

      service.removeFilter('STATUS', 'active');

      expect(service.tableFilters().statusCodes).toEqual([{ name: 'Inactive', value: 'inactive' }]);
    });

    it('should remove all levers when id is null', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        levers: [
          { id: 1, short_name: 'Test' },
          { id: 2, short_name: 'Test2' }
        ]
      });

      service.removeFilter('LEVER');

      expect(service.tableFilters().levers).toEqual([]);
    });

    it('should remove specific lever when id is provided', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        levers: [
          { id: 1, short_name: 'Test' },
          { id: 2, short_name: 'Test2' }
        ]
      });

      service.removeFilter('LEVER', 1);

      expect(service.tableFilters().levers).toEqual([{ id: 2, short_name: 'Test2' }]);
    });

    it('should remove all funding types when label is FUNDING TYPE and id is not provided', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [
          { funding_type: 'BLR' },
          { funding_type: 'RUN' }
        ]
      });

      service.removeFilter('FUNDING TYPE');

      expect(service.tableFilters().fundingTypes).toEqual([]);
    });

    it('should remove specific funding type when id is provided', () => {
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [
          { funding_type: 'BLR' },
          { funding_type: 'RUN' }
        ]
      });

      service.removeFilter('FUNDING TYPE', 'BLR');

      expect(service.tableFilters().fundingTypes).toEqual([{ funding_type: 'RUN' }]);
    });

    it('should call removeById on multiselect ref when id is provided', () => {
      const mockMultiselect = {
        removeById: jest.fn()
      } as any;

      service.multiselectRefs.set({
        status: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      service.removeFilter('STATUS', 'active');

      expect(mockMultiselect.removeById).toHaveBeenCalledWith('active');
    });

    it('should call clear on multiselect ref when id is null', () => {
      const mockMultiselect = {
        clear: jest.fn()
      } as any;

      service.multiselectRefs.set({
        status: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      service.removeFilter('STATUS');

      expect(mockMultiselect.clear).toHaveBeenCalled();
    });

    it('should handle removeById error gracefully', () => {
      const mockMultiselect = {
        removeById: jest.fn().mockImplementation(() => {
          throw new Error('Remove error');
        })
      } as any;

      service.multiselectRefs.set({
        status: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      expect(() => service.removeFilter('STATUS', 'active')).not.toThrow();
    });

    it('should handle clear error gracefully', () => {
      const mockMultiselect = {
        clear: jest.fn().mockImplementation(() => {
          throw new Error('Clear error');
        })
      } as any;

      service.multiselectRefs.set({
        status: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      expect(() => service.removeFilter('STATUS')).not.toThrow();
    });

    it('should handle multiselect ref without removeById method', () => {
      const mockMultiselect = {} as any;

      service.multiselectRefs.set({
        status: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      expect(() => service.removeFilter('STATUS', 'active')).not.toThrow();
    });

    it('should handle multiselect ref without clear method', () => {
      const mockMultiselect = {} as any;

      service.multiselectRefs.set({
        status: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        statusCodes: [{ name: 'Active', value: 'active' }]
      });

      expect(() => service.removeFilter('STATUS')).not.toThrow();
    });

    it('should do nothing when label is not found in mapping', () => {
      const initialFilters = {
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      };
      service.tableFilters.set(initialFilters);

      service.removeFilter('UNKNOWN LABEL');

      expect(service.tableFilters().contractCode).toBe('A001');
    });

    it('should handle lever multiselect ref', () => {
      const mockMultiselect = {
        removeById: jest.fn()
      } as any;

      service.multiselectRefs.set({
        lever: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        levers: [{ id: 1, short_name: 'Test' }]
      });

      service.removeFilter('LEVER', 1);

      expect(mockMultiselect.removeById).toHaveBeenCalledWith(1);
    });

    it('should handle funding type multiselect ref', () => {
      const mockMultiselect = {
        removeById: jest.fn()
      } as any;

      service.multiselectRefs.set({
        fundingType: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [{ funding_type: 'BLR' }]
      });

      service.removeFilter('FUNDING TYPE', 'BLR');

      expect(mockMultiselect.removeById).toHaveBeenCalledWith('BLR');
    });

    it('should call clear on funding type multiselect ref when id is null', () => {
      const mockMultiselect = {
        clear: jest.fn()
      } as any;

      service.multiselectRefs.set({
        fundingType: mockMultiselect
      });

      service.tableFilters.set({
        ...new MyProjectsFilters(),
        fundingTypes: [{ funding_type: 'BLR' }]
      });

      service.removeFilter('FUNDING TYPE');

      expect(mockMultiselect.clear).toHaveBeenCalled();
    });
  });

  describe('state persistence', () => {
    it('should persist current view state when persistence is activated', () => {
      service.myProjectsFilterItem.set(service.myProjectsFilterItems[1]);
      service.tableFilters.set({
        ...new MyProjectsFilters(),
        contractCode: 'A001'
      });
      service.appliedFilters.set({
        ...new MyProjectsFilters(),
        projectName: 'Persisted Project'
      });
      service.searchInput.set('persist me');

      service.activateStatePersistence('project-1');
      TestBed.flushEffects();

      const rawState = globalThis.sessionStorage?.getItem('my-projects-view-state:project-1');
      expect(rawState).toBeTruthy();
      expect(JSON.parse(rawState!)).toEqual({
        myProjectsFilterItemId: 'my',
        tableFilters: expect.objectContaining({ contractCode: 'A001' }),
        appliedFilters: expect.objectContaining({ projectName: 'Persisted Project' }),
        searchInput: 'persist me'
      });
    });

    it('should persist the default tab id when no tab is selected', () => {
      service.myProjectsFilterItem.set(undefined);

      service.activateStatePersistence('project-1');
      TestBed.flushEffects();

      const rawState = globalThis.sessionStorage?.getItem('my-projects-view-state:project-1');
      expect(rawState).toBeTruthy();
      expect(JSON.parse(rawState!).myProjectsFilterItemId).toBe('all');
    });

    it('should clear the active persistence key only when the key matches', () => {
      service.activateStatePersistence('project-1');
      expect(service.activeStateKey()).toBe('project-1');

      service.deactivateStatePersistence('other-key');
      expect(service.activeStateKey()).toBe('project-1');

      service.deactivateStatePersistence('project-1');
      expect(service.activeStateKey()).toBeNull();
    });

    it('should skip persisting when there is no active persistence key', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

      service.activateStatePersistence('project-1');
      TestBed.flushEffects();
      setItemSpy.mockClear();

      service.deactivateStatePersistence('project-1');
      TestBed.flushEffects();

      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('should restore persisted state successfully', () => {
      globalThis.sessionStorage?.setItem(
        'my-projects-view-state:project-1',
        JSON.stringify({
          myProjectsFilterItemId: 'my',
          tableFilters: { contractCode: 'A001', startDate: '2024-01-01' },
          appliedFilters: { projectName: 'Restored Project', endDate: '2024-12-31' },
          searchInput: 'restored search'
        })
      );

      const restored = service.restorePersistedState('project-1');

      expect(restored).toBe(true);
      expect(service.myProjectsFilterItem()).toEqual(service.myProjectsFilterItems[1]);
      expect(service.tableFilters()).toEqual(expect.objectContaining({ contractCode: 'A001', startDate: '2024-01-01' }));
      expect(service.appliedFilters()).toEqual(expect.objectContaining({ projectName: 'Restored Project', endDate: '2024-12-31' }));
      expect(service.searchInput()).toBe('restored search');
    });

    it('should fall back to the default tab when persisted tab id is unknown', () => {
      globalThis.sessionStorage?.setItem(
        'my-projects-view-state:project-1',
        JSON.stringify({
          myProjectsFilterItemId: 'unknown',
          tableFilters: {},
          appliedFilters: {},
          searchInput: ''
        })
      );

      const restored = service.restorePersistedState('project-1');

      expect(restored).toBe(true);
      expect(service.myProjectsFilterItem()).toEqual(service.myProjectsFilterItems[0]);
    });

    it('should restore default filter objects and empty search when persisted values are missing', () => {
      globalThis.sessionStorage?.setItem(
        'my-projects-view-state:project-1',
        JSON.stringify({
          myProjectsFilterItemId: 'all'
        })
      );

      const restored = service.restorePersistedState('project-1');

      expect(restored).toBe(true);
      expect(service.tableFilters()).toEqual(new MyProjectsFilters());
      expect(service.appliedFilters()).toEqual(new MyProjectsFilters());
      expect(service.searchInput()).toBe('');
    });

    it('should return false when there is no persisted state to restore', () => {
      expect(service.restorePersistedState('missing-project')).toBe(false);
    });

    it('should remove invalid persisted state when restore fails', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      globalThis.sessionStorage?.setItem('my-projects-view-state:project-1', '{invalid json');

      const restored = service.restorePersistedState('project-1');

      expect(restored).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('Error restoring persisted my-projects state:', expect.any(SyntaxError));
      expect(globalThis.sessionStorage?.getItem('my-projects-view-state:project-1')).toBeNull();
    });
  });

  describe('poolFundingOnly filter', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('applyFilters with poolFundingOnly=true includes pool-funding-contributor=true in the request', () => {
      service.tableFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });

      service.applyFilters({ page: 1, limit: 10 });

      expect(mockApiService.GET_FindContracts).toHaveBeenCalledWith(expect.objectContaining({ 'pool-funding-contributor': true }));
    });

    it('applyFilters with poolFundingOnly=false omits the pool-funding-contributor key', () => {
      service.tableFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: false });

      service.applyFilters({ page: 1, limit: 10 });

      const passed = mockApiService.GET_FindContracts.mock.calls[0][0] as Record<string, unknown>;
      expect(passed).not.toHaveProperty('pool-funding-contributor');
    });

    it('getActiveFilters returns a single contribution-to-pool-funding chip when enabled', () => {
      service.appliedFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });

      const chips = service.getActiveFilters();
      const poolChips = chips.filter(c => c.label === 'CONTRIBUTING TO POOL FUNDING');
      expect(poolChips).toHaveLength(1);
      expect(poolChips[0]).toEqual({
        label: 'CONTRIBUTING TO POOL FUNDING',
        value: 'Contributing to Pool Funding'
      });
    });

    it('removeFilter("CONTRIBUTING TO POOL FUNDING") resets poolFundingOnly to false', () => {
      service.tableFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });

      service.removeFilter('CONTRIBUTING TO POOL FUNDING');

      expect(service.tableFilters().poolFundingOnly).toBe(false);
    });

    it('resetFilters clears poolFundingOnly', () => {
      service.tableFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });
      service.appliedFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });

      service.resetFilters();

      expect(service.tableFilters().poolFundingOnly).toBe(false);
      expect(service.appliedFilters().poolFundingOnly).toBe(false);
    });

    it('countFiltersSelected increments when poolFundingOnly is enabled', () => {
      service.tableFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });
      expect(service.countFiltersSelected()).toBe('1');

      service.tableFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true, contractCode: 'A001' });
      expect(service.countFiltersSelected()).toBe('2');
    });

    it('hasFilters returns true when only poolFundingOnly is applied', () => {
      service.appliedFilters.set({ ...new MyProjectsFilters(), poolFundingOnly: true });
      expect(service.hasFilters()).toBe(true);
    });

    it('restorePersistedState preserves poolFundingOnly through session round-trip', () => {
      globalThis.sessionStorage?.setItem(
        'my-projects-view-state:project-1',
        JSON.stringify({
          myProjectsFilterItemId: 'all',
          tableFilters: { poolFundingOnly: true, contractCode: 'A001' },
          appliedFilters: { poolFundingOnly: true },
          searchInput: ''
        })
      );

      const restored = service.restorePersistedState('project-1');

      expect(restored).toBe(true);
      expect(service.tableFilters().poolFundingOnly).toBe(true);
      expect(service.appliedFilters().poolFundingOnly).toBe(true);
    });
  });
});
