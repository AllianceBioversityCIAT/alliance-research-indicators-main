import { TestBed } from '@angular/core/testing';
import { ApiService } from '@shared/services/api.service';
import { GetTopPartnersService } from './get-top-partners.service';

describe('GetTopPartnersService', () => {
  let service: GetTopPartnersService;
  let apiService: { GET_TopPartners: jest.Mock };

  beforeEach(() => {
    apiService = {
      GET_TopPartners: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetTopPartnersService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetTopPartnersService);
  });

  it('should store query values and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A100', 5);

    expect(service.contractId).toBe('A100');
    expect(service.limit).toBe(5);
    expect(service.update).toHaveBeenCalled();
  });

  it('should not request partners when the contract id is empty', async () => {
    await service.update();

    expect(apiService.GET_TopPartners).not.toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should load partners from the API response', async () => {
    const topPartners = [{ institution_name: 'Alliance Partner', count: 4 }];
    service.contractId = 'A100';
    service.limit = 5;
    apiService.GET_TopPartners.mockResolvedValue({ data: { top_partners: topPartners } });

    await service.update();

    expect(apiService.GET_TopPartners).toHaveBeenCalledWith('A100', 5);
    expect(service.list()).toEqual(topPartners);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should reset partners when the API response has no list', async () => {
    service.contractId = 'A100';
    service.limit = 5;
    apiService.GET_TopPartners.mockResolvedValue(undefined);

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should clear partners and mark the load as failed when the API rejects', async () => {
    service.contractId = 'A100';
    service.limit = 5;
    service.list.set([{ institution_name: 'Alliance Partner', count: 4 }]);
    apiService.GET_TopPartners.mockRejectedValue(new Error('Request failed'));

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
  });
});
