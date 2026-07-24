import { TestBed } from '@angular/core/testing';
import { GetOsCountriesService } from './get-os-countries.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('GetOsCountriesService', () => {
  let service: GetOsCountriesService;
  let apiService: any;

  const mockData = [
    { id: 1, name: 'Country 1' },
    { id: 2, name: 'Country 2' }
  ];

  beforeEach(() => {
    // Clone the mock and ensure that GET_OpenSearchCountries is always a jest.fn()
    const apiMock = { ...apiServiceMock, GET_OpenSearchCountries: jest.fn().mockResolvedValue({ data: mockData }) };

    TestBed.configureTestingModule({
      providers: [
        GetOsCountriesService,
        {
          provide: ApiService,
          useValue: apiMock
        }
      ]
    });

    service = TestBed.inject(GetOsCountriesService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('update', () => {
    it('should set loading, call API and set list correctly', async () => {
      await service.update('test');

      expect(service.loading()).toBe(false);
      expect(apiService.GET_OpenSearchCountries).toHaveBeenCalledWith('test');
      expect(service.list()).toEqual(mockData);
    });

    it('should handle API response with empty data', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue({ data: [] });

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with null data', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue({ data: null });

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with undefined data', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue({ data: undefined });

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response without data property', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue({ status: 200 });

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as undefined', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue(undefined);

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as null', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue(null);

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API errors and still set loading to false', async () => {
      const error = new Error('API Error');
      (apiService.GET_OpenSearchCountries as jest.Mock).mockRejectedValue(error);

      try {
        await service.update('test');
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(service.loading()).toBe(false);
    });

    it('should handle API errors without throwing', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(service.update('test')).rejects.toThrow('API Error');
      expect(service.loading()).toBe(false);
    });
  });

  describe('signals', () => {
    it('should initialize with correct default values', () => {
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.isOpenSearch()).toBe(true);
      expect(service.useInstance()).toBe(false);
    });

    it('should update loading state during API call', async () => {
      const updatePromise = service.update('test');

      // During the API call, loading should be true
      expect(service.loading()).toBe(true);

      await updatePromise;

      // After the API call, loading should be false
      expect(service.loading()).toBe(false);
    });

    it('should handle non-array data gracefully', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue({ data: 'not-an-array' });

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle data as object instead of array', async () => {
      (apiService.GET_OpenSearchCountries as jest.Mock).mockResolvedValue({ data: { id: 1, name: 'test' } });

      await service.update('test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });
});
