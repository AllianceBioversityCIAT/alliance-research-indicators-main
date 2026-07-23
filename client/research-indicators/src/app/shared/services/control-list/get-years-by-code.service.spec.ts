import { TestBed } from '@angular/core/testing';
import { GetYearsByCodeService } from './get-years-by-code.service';
import { ApiService } from '../api.service';
import { CacheService } from '../cache/cache.service';
import { apiServiceMock, cacheServiceMock } from '../../../testing/mock-services.mock';

describe('GetYearsByCodeService', () => {
  let service: GetYearsByCodeService;
  let apiService: any;
  let cacheService: any;

  const mockData = [
    { id: 1, name: '2023' },
    { id: 2, name: '2024' }
  ];

  beforeEach(() => {
    const apiMock = { ...apiServiceMock, GET_Years: jest.fn().mockResolvedValue({ data: mockData }) };
    const cacheMock = {
      ...cacheServiceMock,
      currentResultId: jest.fn().mockReturnValue(123),
      getCurrentNumericResultId: jest.fn(function (this: any) {
        return typeof this.currentResultId === 'function' ? this.currentResultId() : 123;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        GetYearsByCodeService,
        {
          provide: ApiService,
          useValue: apiMock
        },
        {
          provide: CacheService,
          useValue: cacheMock
        }
      ]
    });

    service = TestBed.inject(GetYearsByCodeService);
    apiService = TestBed.inject(ApiService);
    cacheService = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('main', () => {
    it('should set loading, call API with currentResultId and set list correctly', async () => {
      // Reset loading to true to simulate initial state
      service.loading.set(true);

      await service.main();

      expect(service.loading()).toBe(false);
      expect(apiService.GET_Years).toHaveBeenCalledWith(cacheService.currentResultId());
      expect(service.list()).toEqual(mockData);
    });

    it('should handle API response with empty data', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue({ data: [] });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with null data', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue({ data: null });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with undefined data', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue({ data: undefined });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response without data property', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue({ status: 200 });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as undefined', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue(undefined);

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as null', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue(null);

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API errors and still set loading to false', async () => {
      const error = new Error('API Error');
      (apiService.GET_Years as jest.Mock).mockRejectedValue(error);

      try {
        await service.main();
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(service.loading()).toBe(false);
    });

    it('should handle API errors without throwing', async () => {
      (apiService.GET_Years as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(service.main()).rejects.toThrow('API Error');
      expect(service.loading()).toBe(false);
    });

    it('should handle non-array data gracefully', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue({ data: 'not-an-array' });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle data as object instead of array', async () => {
      (apiService.GET_Years as jest.Mock).mockResolvedValue({ data: { id: 1, name: 'test' } });

      await service.main();

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('signals', () => {
    it('should initialize with correct default values', () => {
      expect(service.list()).toEqual(mockData);
      expect(service.loading()).toBe(false); // After constructor calls main()
      expect(service.isOpenSearch()).toBe(false);
    });

    it('should update loading state during API call', async () => {
      // Reset loading to true to simulate initial state
      service.loading.set(true);

      const mainPromise = service.main();

      // During the API call, loading should be true
      expect(service.loading()).toBe(true);

      await mainPromise;

      // After the API call, loading should be false
      expect(service.loading()).toBe(false);
    });

    it('should call main in constructor', () => {
      // The constructor should have called main() already
      expect(service.loading()).toBe(false);
      expect(apiService.GET_Years).toHaveBeenCalledWith(cacheService.currentResultId());
    });
  });

  describe('cache integration', () => {
    it('should use currentResultId from cache service', async () => {
      const mockResultId = 456;
      cacheService.currentResultId = jest.fn().mockReturnValue(mockResultId);
      cacheService.getCurrentNumericResultId = jest.fn().mockReturnValue(mockResultId);

      await service.main();

      expect(apiService.GET_Years).toHaveBeenCalledWith(mockResultId);
    });

    it('should handle different result IDs from cache', async () => {
      const mockResultId = 789;
      cacheService.currentResultId = jest.fn().mockReturnValue(mockResultId);
      cacheService.getCurrentNumericResultId = jest.fn().mockReturnValue(mockResultId);

      await service.main();

      expect(apiService.GET_Years).toHaveBeenCalledWith(mockResultId);
    });
  });
});
