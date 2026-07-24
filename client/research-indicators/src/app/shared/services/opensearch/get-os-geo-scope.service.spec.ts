import { TestBed } from '@angular/core/testing';
import { GetOsGeoScopeService } from './get-os-geo-scope.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('GetOsGeoScopeService', () => {
  let service: GetOsGeoScopeService;
  let apiService: any;

  const mockData = [
    { id: 1, name: 'Geo 1' },
    { id: 2, name: 'Geo 2' }
  ];

  beforeEach(() => {
    // Clone the mock and ensure that GET_GeoSearch is always a jest.fn()
    const apiMock = { ...apiServiceMock, GET_GeoSearch: jest.fn().mockResolvedValue({ data: mockData }) };

    TestBed.configureTestingModule({
      providers: [
        GetOsGeoScopeService,
        {
          provide: ApiService,
          useValue: apiMock
        }
      ]
    });

    service = TestBed.inject(GetOsGeoScopeService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('update', () => {
    it('should set loading, call API and set list correctly', async () => {
      await service.update('geo-scope', 'test');

      expect(service.loading()).toBe(false);
      expect(apiService.GET_GeoSearch).toHaveBeenCalledWith('geo-scope', 'test');
      expect(service.list()).toEqual(mockData);
    });

    it('should handle API response with empty data', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockResolvedValue({ data: [] });

      await service.update('geo-scope', 'test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with null data', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockResolvedValue({ data: null });

      await service.update('geo-scope', 'test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with undefined data', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockResolvedValue({ data: undefined });

      await service.update('geo-scope', 'test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response without data property', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockResolvedValue({ status: 200 });

      await service.update('geo-scope', 'test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as undefined', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockResolvedValue(undefined);

      await service.update('geo-scope', 'test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as null', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockResolvedValue(null);

      await service.update('geo-scope', 'test');

      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API errors and still set loading to false', async () => {
      const error = new Error('API Error');
      (apiService.GET_GeoSearch as jest.Mock).mockRejectedValue(error);

      try {
        await service.update('geo-scope', 'test');
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(service.loading()).toBe(false);
    });

    it('should handle API errors without throwing', async () => {
      (apiService.GET_GeoSearch as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(service.update('geo-scope', 'test')).rejects.toThrow('API Error');
      expect(service.loading()).toBe(false);
    });
  });

  describe('signals', () => {
    it('should initialize with correct default values', () => {
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.isOpenSearch()).toBe(true);
    });

    it('should update loading state during API call', async () => {
      const updatePromise = service.update('geo-scope', 'test');

      // During the API call, loading should be true
      expect(service.loading()).toBe(true);

      await updatePromise;

      // After the API call, loading should be false
      expect(service.loading()).toBe(false);
    });
  });
});
