import { TestBed } from '@angular/core/testing';
import { GetAllResultStatusService } from './get-all-result-status.service';
import { ApiService } from '@shared/services/api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';
import { GetAllResultStatus } from '../../interfaces/get-all-result-status.interface';

describe('GetAllResultStatusService', () => {
  let service: GetAllResultStatusService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetAllResultStatusService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(GetAllResultStatusService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load data successfully', async () => {
    const mockData: GetAllResultStatus[] = [
      { is_active: true, result_status_id: 1, name: 'Status 1', description: null },
      { is_active: false, result_status_id: 2, name: 'Status 2', description: null }
    ];
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/result-status',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: mockData
    };
    jest.spyOn(apiService, 'GET_AllResultStatus').mockResolvedValue(mockResponse);
    await service.main();
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
    expect(apiService.GET_AllResultStatus).toHaveBeenCalledTimes(2);
  });

  it('should handle loading state correctly', async () => {
    const mockData: GetAllResultStatus[] = [{ is_active: true, result_status_id: 1, name: 'Status 1', description: null }];
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/result-status',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: mockData
    };
    jest.spyOn(apiService, 'GET_AllResultStatus').mockResolvedValue(mockResponse);
    const loadingPromise = service.main();
    expect(service.loading()).toBe(true);
    await loadingPromise;
    expect(service.loading()).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(apiService, 'GET_AllResultStatus').mockRejectedValue(new Error('API Error'));
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading result status:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should handle null response data', async () => {
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/result-status',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: null
    } as any;
    jest.spyOn(apiService, 'GET_AllResultStatus').mockResolvedValue(mockResponse);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response data', async () => {
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/result-status',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: undefined
    } as any;
    jest.spyOn(apiService, 'GET_AllResultStatus').mockResolvedValue(mockResponse);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response', async () => {
    jest.spyOn(apiService, 'GET_AllResultStatus').mockResolvedValue(undefined as any);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty response data', async () => {
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/result-status',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: []
    };
    jest.spyOn(apiService, 'GET_AllResultStatus').mockResolvedValue(mockResponse);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should initialize with empty list and loading false', () => {
    const newService = TestBed.inject(GetAllResultStatusService);
    expect(newService.list()).toEqual([]);
    expect(newService.loading()).toBe(false);
  });

  it('should have correct signal types', () => {
    expect(typeof service.list).toBe('function');
    expect(typeof service.loading).toBe('function');
    expect(Array.isArray(service.list())).toBe(true);
    expect(typeof service.loading()).toBe('boolean');
  });
});
