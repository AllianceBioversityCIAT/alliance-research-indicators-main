import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from './api.service';
import { PoolFundingFlagsService } from './pool-funding-flags.service';

describe('PoolFundingFlagsService', () => {
  let service: PoolFundingFlagsService;
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
      providers: [PoolFundingFlagsService, { provide: ApiService, useValue: mockApi }, { provide: CacheService, useValue: mockCache }]
    });
    service = TestBed.inject(PoolFundingFlagsService);
  });

  it('starts enabled before any read resolves', () => {
    expect(service.sectionEnabled()).toBe(true);
    expect(service.prmsSyncButtonEnabled()).toBe(true);
  });

  it('does not call the API when there is no access token and stays enabled', async () => {
    mockCache.dataCache.set({ access_token: '' });

    await service.load();

    expect(mockApi.GET_ConfigurationByKey).not.toHaveBeenCalled();
    expect(service.sectionEnabled()).toBe(true);
    expect(service.prmsSyncButtonEnabled()).toBe(true);
  });

  it('reads both keys once and parses simple_value', async () => {
    mockApi.GET_ConfigurationByKey.mockImplementation((key: string) => {
      if (key === APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_SECTION_ENABLED) {
        return Promise.resolve({ data: { simple_value: 'false' } });
      }
      return Promise.resolve({ data: { simple_value: 'true' } });
    });

    const first = service.load();
    const second = service.load();

    expect(first).toBe(second);
    await first;

    expect(mockApi.GET_ConfigurationByKey).toHaveBeenCalledTimes(2);
    expect(mockApi.GET_ConfigurationByKey).toHaveBeenCalledWith(APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_SECTION_ENABLED);
    expect(mockApi.GET_ConfigurationByKey).toHaveBeenCalledWith(APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED);
    expect(service.sectionEnabled()).toBe(false);
    expect(service.prmsSyncButtonEnabled()).toBe(true);
  });

  it('fails open when a read rejects', async () => {
    mockApi.GET_ConfigurationByKey.mockRejectedValue(new Error('Network error'));

    await service.load();

    expect(service.sectionEnabled()).toBe(true);
    expect(service.prmsSyncButtonEnabled()).toBe(true);
  });

  it('fails open when simple_value is absent', async () => {
    mockApi.GET_ConfigurationByKey.mockResolvedValue({ data: { simple_value: null } });

    await service.load();

    expect(service.sectionEnabled()).toBe(true);
    expect(service.prmsSyncButtonEnabled()).toBe(true);
  });
});
