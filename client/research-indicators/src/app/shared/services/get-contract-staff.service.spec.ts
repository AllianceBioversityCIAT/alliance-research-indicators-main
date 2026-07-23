import { TestBed } from '@angular/core/testing';
import { ApiService } from '@shared/services/api.service';
import { GetContractStaffService } from './get-contract-staff.service';

describe('GetContractStaffService', () => {
  let service: GetContractStaffService;
  let apiService: { GET_ContractStaff: jest.Mock };

  beforeEach(() => {
    apiService = {
      GET_ContractStaff: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetContractStaffService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetContractStaffService);
  });

  it('should store the contract id and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A100');

    expect(service.contractId).toBe('A100');
    expect(service.update).toHaveBeenCalled();
  });

  it('should not request staff when the contract id is empty', async () => {
    await service.update();

    expect(apiService.GET_ContractStaff).not.toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should load staff from the API response', async () => {
    const staff = [{ name: 'Ada Lovelace', role: 'PI' }];
    service.contractId = 'A100';
    apiService.GET_ContractStaff.mockResolvedValue({ data: { staff } });

    await service.update();

    expect(apiService.GET_ContractStaff).toHaveBeenCalledWith('A100');
    expect(service.staff()).toEqual(staff);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should reset staff when the API response is empty', async () => {
    service.contractId = 'A100';
    apiService.GET_ContractStaff.mockResolvedValue(undefined);

    await service.update();

    expect(service.staff()).toEqual([]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should clear staff and mark the load as failed when the API rejects', async () => {
    service.contractId = 'A100';
    service.staff.set([{ name: 'Grace Hopper', role: 'Co-PI' }]);
    apiService.GET_ContractStaff.mockRejectedValue(new Error('Request failed'));

    await service.update();

    expect(service.staff()).toEqual([]);
    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
  });
});
