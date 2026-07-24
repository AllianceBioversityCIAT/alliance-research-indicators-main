import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { CacheService } from '@services/cache/cache.service';
import { DateFormatConfigService } from './date-format-config.service';
import { ApiService } from './api.service';
import { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';

const mockConfig: DateFormatJsonValue = {
  locale: 'en',
  timezone: { iana: 'Europe/Madrid', displayName: 'CET', abbreviationMode: 'short' },
  date: {
    style: 'short',
    order: 'DMY',
    separator: '/',
    twoDigitDay: true,
    twoDigitMonth: true,
    fourDigitYear: true,
    monthName: { enabled: false, format: 'short', uppercase: false }
  },
  time: { hour12: false, twoDigitMinute: true },
  display: {
    order: 'date time',
    separator: ' ',
    suffix: { enabled: true, style: 'short', fallback: '', wrap: 'PAREN' }
  }
};

describe('DateFormatConfigService', () => {
  let service: DateFormatConfigService;
  let mockApi: { GET_ConfigurationByKey: jest.Mock };
  let mockCache: { dataCache: ReturnType<typeof signal<{ access_token: string }>> };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi = {
      GET_ConfigurationByKey: jest.fn()
    };
    mockCache = {
      dataCache: signal({ access_token: 'test-token' })
    };
    TestBed.configureTestingModule({
      providers: [
        DateFormatConfigService,
        { provide: ApiService, useValue: mockApi },
        { provide: CacheService, useValue: mockCache }
      ]
    });
    service = TestBed.inject(DateFormatConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have config signal initial value null', () => {
    expect(service.config()).toBeNull();
  });

  describe('loadConfig', () => {
    it('should not call API when there is no access token', async () => {
      mockCache.dataCache.set({ access_token: '' });

      const result = await service.loadConfig();

      expect(mockApi.GET_ConfigurationByKey).not.toHaveBeenCalled();
      expect(service.config()).toBeNull();
      expect(result).toBeNull();

      mockCache.dataCache.set({ access_token: 'test-token' });
    });

    it('should call API and set config when data.json_value is config object with timezone', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({
        data: { json_value: mockConfig }
      });

      const result = await service.loadConfig();

      expect(mockApi.GET_ConfigurationByKey).toHaveBeenCalledWith(APPLICATION_CONFIGURATION_KEY.DATE_FORMAT);
      expect(service.config()).toEqual(mockConfig);
      expect(result).toEqual(mockConfig);
    });

    it('should set config to null when response is undefined', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue(undefined);

      const result = await service.loadConfig();

      expect(service.config()).toBeNull();
      expect(result).toBeNull();
    });

    it('should set config to null when response.data is undefined', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({ data: undefined });

      const result = await service.loadConfig();

      expect(service.config()).toBeNull();
      expect(result).toBeNull();
    });

    it('should set config to null when response.data.json_value is null', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({ data: { json_value: null } });

      const result = await service.loadConfig();

      expect(service.config()).toBeNull();
      expect(result).toBeNull();
    });

    it('should set config to null when json_value is not an object (normalize returns null)', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({
        data: { json_value: 'invalid' }
      });

      const result = await service.loadConfig();

      expect(service.config()).toBeNull();
      expect(result).toBeNull();
    });

    it('should set config when json_value is nested object with json_value.timezone', async () => {
      const nested = { json_value: mockConfig };
      mockApi.GET_ConfigurationByKey.mockResolvedValue({
        data: { json_value: nested }
      });

      const result = await service.loadConfig();

      expect(service.config()).toEqual(mockConfig);
      expect(result).toEqual(mockConfig);
    });

    it('should set config when json_value is object with timezone at top level (no nested json_value)', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({
        data: { json_value: { timezone: { iana: 'UTC', displayName: 'UTC', abbreviationMode: 'short' } } }
      });

      const result = await service.loadConfig();

      expect(service.config()).toEqual({
        timezone: { iana: 'UTC', displayName: 'UTC', abbreviationMode: 'short' }
      });
      expect(result).not.toBeNull();
    });

    it('should set config to null when json_value is object without timezone', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({
        data: { json_value: { foo: 'bar' } }
      });

      const result = await service.loadConfig();

      expect(service.config()).toBeNull();
      expect(result).toBeNull();
    });

    it('should return same promise on second loadConfig call (cache)', async () => {
      mockApi.GET_ConfigurationByKey.mockResolvedValue({
        data: { json_value: mockConfig }
      });

      const p1 = service.loadConfig();
      const p2 = service.loadConfig();

      expect(p1).toBe(p2);
      await p1;
      expect(mockApi.GET_ConfigurationByKey).toHaveBeenCalledTimes(1);
    });

    it('should set config to null and return null on API rejection', async () => {
      mockApi.GET_ConfigurationByKey.mockRejectedValue(new Error('Network error'));

      const result = await service.loadConfig();

      expect(service.config()).toBeNull();
      expect(result).toBeNull();
    });
  });
});
