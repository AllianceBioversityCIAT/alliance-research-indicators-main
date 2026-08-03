import { TestBed } from '@angular/core/testing';
import { GetOsSubnationalService } from './get-os-subnational.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('GetOsSubnationalService', () => {
  let service: GetOsSubnationalService;
  let apiService: jest.Mocked<ApiService>;

  const mockData = [
    { id: 1, name: 'Subnational 1' },
    { id: 2, name: 'Subnational 2' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GetOsSubnationalService,
        {
          provide: ApiService,
          useValue: apiServiceMock
        }
      ]
    });

    service = TestBed.inject(GetOsSubnationalService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('update', () => {
    it('should set loading, call API and set list correctly', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: mockData });
      await service.update('test');
      expect(service.loading()).toBe(false);
      expect(apiService.GET_OpenSearchSubNationals).toHaveBeenCalledWith('test');
      expect(service.list()).toEqual(mockData);
    });

    it('should handle API response with empty data', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: [] });
      await service.update('test');
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with null data', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: null });
      await service.update('test');
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response with undefined data', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: undefined });
      await service.update('test');
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response without data property', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ status: 200 });
      await service.update('test');
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle API response as undefined', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue(undefined);
      await service.update('test');
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should set loading to false even when API throws an error', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(service.update('test')).rejects.toThrow('fail');
      expect(service.loading()).toBe(false);
    });
  });

  describe('getInstance', () => {
    it('should return signal with transformed data without filters', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: mockData });
      const result = await service.getInstance('test');
      expect(apiService.GET_OpenSearchSubNationals).toHaveBeenCalledWith('test', undefined);
      expect(result()).toEqual([
        { id: 1, name: 'Subnational 1', sub_national_id: 1 },
        { id: 2, name: 'Subnational 2', sub_national_id: 2 }
      ]);
    });

    it('should return signal with transformed data with filters', async () => {
      const filters = { country: 'test' };
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: mockData });
      const result = await service.getInstance('test', filters);
      expect(apiService.GET_OpenSearchSubNationals).toHaveBeenCalledWith('test', filters);
      expect(result()).toEqual([
        { id: 1, name: 'Subnational 1', sub_national_id: 1 },
        { id: 2, name: 'Subnational 2', sub_national_id: 2 }
      ]);
    });

    it('should handle API response with empty data', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: [] });
      const result = await service.getInstance('test');
      expect(result()).toEqual([]);
    });

    it('should handle API response with null data', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: null });
      const result = await service.getInstance('test');
      expect(result()).toEqual([]);
    });

    it('should handle API response with undefined data', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: undefined });
      const result = await service.getInstance('test');
      expect(result()).toEqual([]);
    });

    it('should handle API response without data property', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ status: 200 });
      const result = await service.getInstance('test');
      expect(result()).toEqual([]);
    });

    it('should handle API response as undefined', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue(undefined);
      const result = await service.getInstance('test');
      expect(result()).toEqual([]);
    });

    it('should set sub_national_id for each item in data', async () => {
      const customData = [
        { id: 10, name: 'A' },
        { id: 20, name: 'B' }
      ];
      apiService.GET_OpenSearchSubNationals = jest.fn().mockResolvedValue({ data: customData });
      const result = await service.getInstance('test');
      expect(result()).toEqual([
        { id: 10, name: 'A', sub_national_id: 10 },
        { id: 20, name: 'B', sub_national_id: 20 }
      ]);
    });

    it('should throw if API throws', async () => {
      apiService.GET_OpenSearchSubNationals = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(service.getInstance('test')).rejects.toThrow('fail');
    });
  });
});
