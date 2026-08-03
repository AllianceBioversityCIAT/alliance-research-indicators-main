import { TestBed } from '@angular/core/testing';
import { ApiService } from '@shared/services/api.service';
import { GetTopContributorsContractsService } from './get-top-contributors-contracts.service';

describe('GetTopContributorsContractsService', () => {
  let service: GetTopContributorsContractsService;
  let apiService: { GET_TopContributorsContracts: jest.Mock };

  beforeEach(() => {
    apiService = {
      GET_TopContributorsContracts: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetTopContributorsContractsService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetTopContributorsContractsService);
  });

  it('should store query values and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A100', 3);

    expect(service.contractId).toBe('A100');
    expect(service.limit).toBe(3);
    expect(service.update).toHaveBeenCalled();
  });

  it('should not request contributors when the contract id is empty', async () => {
    await service.update();

    expect(apiService.GET_TopContributorsContracts).not.toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should load contributors from the API response', async () => {
    const topContributors = [{ contract_code: 'C-1', count: 2 }];
    service.contractId = 'A100';
    service.limit = 3;
    apiService.GET_TopContributorsContracts.mockResolvedValue({ data: { top_contributors: topContributors } });

    await service.update();

    expect(apiService.GET_TopContributorsContracts).toHaveBeenCalledWith('A100', 3);
    expect(service.list()).toEqual(topContributors);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should reset contributors when the API response has no list', async () => {
    service.contractId = 'A100';
    service.limit = 3;
    apiService.GET_TopContributorsContracts.mockResolvedValue(undefined);

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should clear contributors and mark the load as failed when the API rejects', async () => {
    service.contractId = 'A100';
    service.limit = 3;
    service.list.set([{ contract_code: 'C-1', count: 2 }]);
    apiService.GET_TopContributorsContracts.mockRejectedValue(new Error('Request failed'));

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
  });
});
