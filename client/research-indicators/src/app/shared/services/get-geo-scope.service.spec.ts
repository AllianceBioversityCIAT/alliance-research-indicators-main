import { TestBed } from '@angular/core/testing';
import { ApiService } from '@shared/services/api.service';
import { PROJECT_DASHBOARD_DEFAULT_LIMIT } from '@shared/constants/country-centroids.constants';
import { GetGeoScopeService } from './get-geo-scope.service';

describe('GetGeoScopeService', () => {
  let service: GetGeoScopeService;
  let apiService: { GET_GeoScope: jest.Mock };

  beforeEach(() => {
    apiService = {
      GET_GeoScope: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetGeoScopeService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetGeoScopeService);
  });

  it('should store query values and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A100', 8);

    expect(service.contractId).toBe('A100');
    expect(service.limit).toBe(8);
    expect(service.update).toHaveBeenCalled();
  });

  it('should use the default limit when main receives no limit', () => {
    service.update = jest.fn();

    service.main('A100');

    expect(service.limit).toBe(PROJECT_DASHBOARD_DEFAULT_LIMIT);
    expect(service.update).toHaveBeenCalled();
  });

  it('should not request geo scope when the contract id is empty', async () => {
    await service.update();

    expect(apiService.GET_GeoScope).not.toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should load summary, regions and countries from the API response', async () => {
    const summary = { global: 1, countries: 2 };
    const topRegions = [{ region_name: 'Latin America', count: 2 }];
    const topCountries = [{ country_name: 'Colombia', count: 1 }];
    service.contractId = 'A100';
    service.limit = 5;
    apiService.GET_GeoScope.mockResolvedValue({
      data: {
        geo_scope_summary: summary,
        top_regions: topRegions,
        top_countries: topCountries
      }
    });

    await service.update();

    expect(apiService.GET_GeoScope).toHaveBeenCalledWith('A100', 5);
    expect(service.summary()).toEqual(summary);
    expect(service.topRegionsList()).toEqual(topRegions);
    expect(service.topCountries()).toEqual(topCountries);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should reset values when the API response has no geo lists', async () => {
    service.contractId = 'A100';
    service.limit = 5;
    apiService.GET_GeoScope.mockResolvedValue(undefined);

    await service.update();

    expect(service.summary()).toEqual({});
    expect(service.topRegionsList()).toEqual([]);
    expect(service.topCountries()).toEqual([]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should clear values and mark the load as failed when the API rejects', async () => {
    service.contractId = 'A100';
    service.limit = 5;
    service.summary.set({ global: 1 });
    service.topRegionsList.set([{ region_name: 'Latin America', count: 2 }]);
    service.topCountries.set([{ country_name: 'Colombia', count: 1 }]);
    apiService.GET_GeoScope.mockRejectedValue(new Error('Request failed'));

    await service.update();

    expect(service.summary()).toEqual({});
    expect(service.topRegionsList()).toEqual([]);
    expect(service.topCountries()).toEqual([]);
    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
  });
});
