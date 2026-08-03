import { TestBed } from '@angular/core/testing';
import { GetOsResultService } from './get-os-result.service';
import { ApiService } from '../api.service';

describe('GetOsResultService', () => {
  let service: GetOsResultService;
  let apiMock: Partial<ApiService>;

  const mockData = [
    { id: 1, title: 'Result 1' },
    { id: 2, title: 'Result 2' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_OpenSearchResult: jest.fn().mockResolvedValue({
        data: mockData
      })
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetOsResultService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(true);
  });

  it('update should load data correctly with default parameters', async () => {
    const search = 'test search';

    await service.update(search);

    expect(apiMock.GET_OpenSearchResult).toHaveBeenCalledWith(search, 5);
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('update should load data with custom sampleSize', async () => {
    const search = 'test search';
    const sampleSize = 10;

    await service.update(search, sampleSize);

    expect(apiMock.GET_OpenSearchResult).toHaveBeenCalledWith(search, sampleSize);
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('update should handle errors correctly', async () => {
    const search = 'test search';

    apiMock.GET_OpenSearchResult = jest.fn().mockRejectedValue(new Error('API Error'));

    await service.update(search);

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('update should set loading to true at start and false at end', async () => {
    const search = 'test search';

    expect(service.loading()).toBe(false);

    const updatePromise = service.update(search);

    expect(service.loading()).toBe(true);

    await updatePromise;

    expect(service.loading()).toBe(false);
  });
});
