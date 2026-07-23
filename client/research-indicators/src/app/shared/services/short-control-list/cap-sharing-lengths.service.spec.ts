import { TestBed } from '@angular/core/testing';
import { CapSharingLengthsService } from './cap-sharing-lengths.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';
import { Length } from '../../interfaces/get-cap-sharing.interface';

describe('CapSharingLengthsService', () => {
  let service: CapSharingLengthsService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CapSharingLengthsService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(CapSharingLengthsService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load data successfully', async () => {
    const mockData: Length[] = [
      { length_id: 1, name: 'Length 1', is_active: true },
      { length_id: 2, name: 'Length 2', is_active: false }
    ];

    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/session-length',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: mockData
    };

    jest.spyOn(apiService, 'GET_SessionLength').mockResolvedValue(mockResponse);

    await service.main();

    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
    expect(apiService.GET_SessionLength).toHaveBeenCalledTimes(2); // Constructor + manual call
  });

  it('should handle loading state correctly', async () => {
    const mockData: Length[] = [{ length_id: 1, name: 'Length 1', is_active: true }];

    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/session-length',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: mockData
    };

    jest.spyOn(apiService, 'GET_SessionLength').mockResolvedValue(mockResponse);

    const loadingPromise = service.main();

    // Verify that loading is true during the load
    expect(service.loading()).toBe(true);

    await loadingPromise;

    // Verify that loading is false after the load
    expect(service.loading()).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.spyOn(apiService, 'GET_SessionLength').mockRejectedValue(new Error('API Error'));

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading session lengths:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle null response data', async () => {
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/session-length',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: null
    } as any;

    jest.spyOn(apiService, 'GET_SessionLength').mockResolvedValue(mockResponse);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response data', async () => {
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/session-length',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: undefined
    } as any;

    jest.spyOn(apiService, 'GET_SessionLength').mockResolvedValue(mockResponse);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response', async () => {
    jest.spyOn(apiService, 'GET_SessionLength').mockResolvedValue(undefined as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty response data', async () => {
    const mockResponse = {
      status: 200,
      description: 'Success',
      timestamp: new Date().toISOString(),
      path: '/api/session-length',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      data: []
    };

    jest.spyOn(apiService, 'GET_SessionLength').mockResolvedValue(mockResponse);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should initialize with empty list and loading false', () => {
    const newService = TestBed.inject(CapSharingLengthsService);

    expect(newService.list()).toEqual([]);
    expect(newService.loading()).toBe(false);
  });

  it('should have correct signal types', () => {
    expect(typeof service.list).toBe('function');
    expect(typeof service.loading).toBe('function');

    // Verify that the signals return values of the correct type
    expect(Array.isArray(service.list())).toBe(true);
    expect(typeof service.loading()).toBe('boolean');
  });
});
