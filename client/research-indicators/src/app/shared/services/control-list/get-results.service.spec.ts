import { TestBed } from '@angular/core/testing';
import { GetResultsService } from './get-results.service';
import { ResultFilter, ResultConfig } from '@interfaces/result/result.interface';
import { ApiService } from '@services/api.service';

describe('GetResultsService', () => {
  let service: GetResultsService;
  let apiService: { GET_Results: jest.Mock };

  const mockData = [
    { id: 1, name: 'Result 1' },
    { id: 2, name: 'Result 2' }
  ];

  const mockResponse = {
    data: { results: mockData, total: 2 }
  };

  beforeEach(() => {
    apiService = {
      GET_Results: jest.fn().mockResolvedValue(mockResponse)
    };

    TestBed.configureTestingModule({
      providers: [GetResultsService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetResultsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('constructor calls updateList and sets initial values', () => {
    expect(service.results()).toEqual(mockData);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('updateList sets loading and results correctly', async () => {
    await service.updateList();
    expect(apiService.GET_Results).toHaveBeenCalledWith({}, undefined, { page: 1, limit: 10_000 });
    expect(service.results()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('updateList handles empty response', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ data: { results: [], total: 0 } });
    await service.updateList();
    expect(service.results()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('updateList handles response null', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ data: null });
    await service.updateList();
    expect(service.results()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('updateList handles response undefined', async () => {
    apiService.GET_Results.mockResolvedValueOnce(undefined);
    await service.updateList();
    expect(service.results()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('updateList handles response without data', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ status: 200 });
    await service.updateList();
    expect(service.results()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('updateList handles missing results array', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ data: { total: 0 } });
    await service.updateList();
    expect(service.results()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('updateList handles API error', async () => {
    apiService.GET_Results.mockRejectedValueOnce(new Error('API Error'));

    await service.updateList();

    expect(service.loading()).toBe(false);
    expect(service.results()).toEqual([]);
  });

  it('fetchPaginated returns results and total', async () => {
    const filter: ResultFilter = {} as ResultFilter;
    const config: ResultConfig = {} as ResultConfig;
    const pagination = { page: 1, limit: 10, sortField: 'code' as const, sortOrder: 'DESC' as const };
    apiService.GET_Results.mockResolvedValueOnce({ data: { results: [{ id: 99 }], total: 1 } });

    const result = await service.fetchPaginated(filter, pagination, config);

    expect(apiService.GET_Results).toHaveBeenCalledWith(filter, config, pagination);
    expect(result).toEqual({ results: [{ id: 99 }], total: 1 });
  });

  it('fetchPaginated without resultConfig', async () => {
    const filter: ResultFilter = {} as ResultFilter;
    const pagination = { page: 2, limit: 5 };
    apiService.GET_Results.mockResolvedValueOnce({ data: { results: [{ id: 77 }], total: 10 } });

    const result = await service.fetchPaginated(filter, pagination);

    expect(apiService.GET_Results).toHaveBeenCalledWith(filter, undefined, pagination);
    expect(result).toEqual({ results: [{ id: 77 }], total: 10 });
  });

  it('fetchPaginated handles empty envelope', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ data: { results: [], total: 0 } });

    const result = await service.fetchPaginated({} as ResultFilter, { page: 1, limit: 10 });

    expect(result).toEqual({ results: [], total: 0 });
  });

  it('fetchPaginated handles API error', async () => {
    apiService.GET_Results.mockRejectedValueOnce(new Error('API Error'));

    const result = await service.fetchPaginated({} as ResultFilter, { page: 1, limit: 10 });

    expect(result).toEqual({ results: [], total: 0 });
  });

  it('fetchPaginated defaults total to 0 when response.data.total is missing', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ data: { results: [{ id: 1 } as any] } });

    const result = await service.fetchPaginated({} as ResultFilter, { page: 1, limit: 10 });

    expect(result.results).toEqual([{ id: 1 }]);
    expect(result.total).toBe(0);
  });

  it('fetchPaginated defaults results to [] when response.data.results is missing', async () => {
    apiService.GET_Results.mockResolvedValueOnce({ data: { total: 5 } as any });

    const result = await service.fetchPaginated({} as ResultFilter, { page: 1, limit: 10 });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(5);
  });
});
