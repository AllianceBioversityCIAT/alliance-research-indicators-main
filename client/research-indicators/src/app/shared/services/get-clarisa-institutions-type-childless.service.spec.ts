import { TestBed } from '@angular/core/testing';
import { GetClarisaInstitutionsTypesChildlessService } from './get-clarisa-institutions-type-childless.service';
import { ApiService } from './api.service';
import { apiServiceMock } from '../../testing/mock-services.mock';

describe('GetClarisaInstitutionsTypesChildlessService', () => {
  let service: GetClarisaInstitutionsTypesChildlessService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetClarisaInstitutionsTypesChildlessService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(GetClarisaInstitutionsTypesChildlessService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load data successfully', async () => {
    const mockData = [
      {
        code: 1,
        created_at: '2024-01-01',
        description: 'Type 1',
        is_active: true,
        name: 'Institution Type 1',
        parent_code: null,
        updated_at: '2024-01-02'
      },
      {
        code: 2,
        created_at: '2024-01-03',
        description: null,
        is_active: true,
        name: 'Institution Type 2',
        parent_code: null,
        updated_at: '2024-01-04'
      }
    ];

    jest.spyOn(apiServiceMock, 'GET_InstitutionsTypesChildless').mockResolvedValue({
      data: mockData
    } as any);

    await service.main();

    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('should handle loading state correctly', async () => {
    const mockData = [
      {
        code: 1,
        created_at: '2024-01-01',
        description: 'Type 1',
        is_active: true,
        name: 'Institution Type 1',
        parent_code: null,
        updated_at: '2024-01-02'
      }
    ];

    jest.spyOn(apiServiceMock, 'GET_InstitutionsTypesChildless').mockResolvedValue({
      data: mockData
    } as any);

    const loadPromise = service.main();

    expect(service.loading()).toBe(true);

    await loadPromise;

    expect(service.loading()).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.spyOn(apiServiceMock, 'GET_InstitutionsTypesChildless').mockRejectedValue(new Error('API Error'));

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading institutions types childless:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle null response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_InstitutionsTypesChildless').mockResolvedValue({
      data: null
    } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_InstitutionsTypesChildless').mockResolvedValue({
      data: undefined
    } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_InstitutionsTypesChildless').mockResolvedValue({
      data: []
    } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should initialize with empty list and loading false', () => {
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should initialize with isOpenSearch false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });
});
