import { TestBed } from '@angular/core/testing';
import { GetInnoDevOutputService } from './get-innovation-dev-output.service';
import { ApiService } from '../api.service';
import { apiServiceMock, mockResults } from '../../../testing/mock-services.mock';

describe('GetInnoDevOutputService', () => {
  let service: GetInnoDevOutputService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock.GET_Results.mockResolvedValue(Promise.resolve(mockResults));
    TestBed.configureTestingModule({
      providers: [GetInnoDevOutputService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(GetInnoDevOutputService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize and call main in constructor', async () => {
    apiService.GET_Results.mockResolvedValueOnce(Promise.resolve(mockResults));
    await service.main();
    expect(apiService.GET_Results).toHaveBeenCalled();
    expect(service.loading()).toBe(false);
    expect(service.list().length).toBeGreaterThan(0);
  });

  it('should set loading true while fetching and false after', async () => {
    service.loading.set(false);
    const originalSet = service.loading.set;
    const loadingStates: boolean[] = [];
    service.loading.set = jest.fn(v => {
      loadingStates.push(v);
      originalSet.call(service.loading, v);
    });
    apiService.GET_Results.mockResolvedValueOnce(Promise.resolve(mockResults));
    await service.main();
    expect(loadingStates).toEqual([true, false]);
    expect(service.loading()).toBe(false);
  });

  it('should set list with results from API', async () => {
    service.list.set([]);
    apiService.GET_Results.mockResolvedValueOnce(Promise.resolve(mockResults));
    await service.main();
    expect(service.list()).toEqual(mockResults.data.results);
  });

  it('should set list to [] if response.data is falsy', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ ...mockResults, data: null } as any);
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('should set list to [] if response.data is undefined', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ ...mockResults, data: undefined } as any);
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('should handle API error and keep loading true', async () => {
    apiService.GET_Results.mockRejectedValueOnce(new Error('API Error'));
    await expect(service.main()).rejects.toThrow('API Error');
    expect(service.loading()).toBe(true);
  });

  it('should only request indicator-codes 2', async () => {
    apiService.GET_Results.mockResolvedValueOnce(Promise.resolve(mockResults));
    await service.main();
    expect(apiService.GET_Results).toHaveBeenCalledWith({ 'indicator-codes': [2] });
  });
});
