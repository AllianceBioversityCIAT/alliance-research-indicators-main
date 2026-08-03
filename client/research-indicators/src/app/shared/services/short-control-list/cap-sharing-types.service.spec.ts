import { TestBed } from '@angular/core/testing';
import { CapSharingTypesService } from './cap-sharing-types.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('CapSharingTypesService', () => {
  let service: CapSharingTypesService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CapSharingTypesService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(CapSharingTypesService);
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
      { session_type_id: 1, name: 'Type 1', is_active: true },
      { session_type_id: 2, name: 'Type 2', is_active: false }
    ];
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockResolvedValue({ data: mockData } as any);
    await service.main();
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('should handle loading state correctly', async () => {
    const mockData = [{ session_type_id: 1, name: 'Type 1', is_active: true }];
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockResolvedValue({ data: mockData } as any);
    const loadPromise = service.main();
    expect(service.loading()).toBe(true);
    await loadPromise;
    expect(service.loading()).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockRejectedValue(new Error('API Error'));
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading session types:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should handle null response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockResolvedValue({ data: null } as any);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockResolvedValue({ data: undefined } as any);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockResolvedValue(undefined as any);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionType').mockResolvedValue({ data: [] } as any);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should initialize with empty list and loading false', () => {
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
