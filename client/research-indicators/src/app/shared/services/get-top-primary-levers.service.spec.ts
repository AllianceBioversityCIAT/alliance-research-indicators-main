import { TestBed } from '@angular/core/testing';
import { ApiService } from '@shared/services/api.service';
import { GetTopPrimaryLeversService } from './get-top-primary-levers.service';

describe('GetTopPrimaryLeversService', () => {
  let service: GetTopPrimaryLeversService;
  let apiService: { GET_TopPrimaryLevers: jest.Mock };

  beforeEach(() => {
    apiService = {
      GET_TopPrimaryLevers: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetTopPrimaryLeversService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetTopPrimaryLeversService);
  });

  it('should store query values and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A100', 5);

    expect(service.contractId).toBe('A100');
    expect(service.limit).toBe(5);
    expect(service.update).toHaveBeenCalled();
  });

  it('should not request primary levers when the contract id is empty', async () => {
    await service.update();

    expect(apiService.GET_TopPrimaryLevers).not.toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should load primary levers from the API response', async () => {
    const topPrimaryLevers = [{ lever_id: 1, short_name: 'LEV', full_name: 'Lever', count: 6 }];
    service.contractId = 'A100';
    service.limit = 5;
    apiService.GET_TopPrimaryLevers.mockResolvedValue({ data: { top_primary_levers: topPrimaryLevers } });

    await service.update();

    expect(apiService.GET_TopPrimaryLevers).toHaveBeenCalledWith('A100', 5);
    expect(service.list()).toEqual(topPrimaryLevers);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should reset primary levers when the API response has no list', async () => {
    service.contractId = 'A100';
    service.limit = 5;
    apiService.GET_TopPrimaryLevers.mockResolvedValue(undefined);

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should clear primary levers and mark the load as failed when the API rejects', async () => {
    service.contractId = 'A100';
    service.limit = 5;
    service.list.set([{ lever_id: 1, short_name: 'LEV', full_name: 'Lever', count: 6 }]);
    apiService.GET_TopPrimaryLevers.mockRejectedValue(new Error('Request failed'));

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
  });
});
