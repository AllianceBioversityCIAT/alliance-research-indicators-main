import { TestBed } from '@angular/core/testing';
import { ApiService } from '@shared/services/api.service';
import { GetTopMainContactPersonsService } from './get-top-main-contact-persons.service';

describe('GetTopMainContactPersonsService', () => {
  let service: GetTopMainContactPersonsService;
  let apiService: { GET_TopMainContactPersons: jest.Mock };

  beforeEach(() => {
    apiService = {
      GET_TopMainContactPersons: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetTopMainContactPersonsService, { provide: ApiService, useValue: apiService }]
    });

    service = TestBed.inject(GetTopMainContactPersonsService);
  });

  it('should store query values and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('D527', 5);

    expect(service.contractId).toBe('D527');
    expect(service.limit).toBe(5);
    expect(service.update).toHaveBeenCalled();
  });

  it('should not request contact persons when the contract id is empty', async () => {
    await service.update();

    expect(apiService.GET_TopMainContactPersons).not.toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should load contact persons from the API response', async () => {
    const topContactPersons = [{ name: 'Jane Doe', count: 4 }];
    service.contractId = 'D527';
    service.limit = 5;
    apiService.GET_TopMainContactPersons.mockResolvedValue({ data: { top_main_contact_persons: topContactPersons } });

    await service.update();

    expect(apiService.GET_TopMainContactPersons).toHaveBeenCalledWith('D527', 5);
    expect(service.list()).toEqual(topContactPersons);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should reset contact persons when the API response has no list', async () => {
    service.contractId = 'D527';
    service.limit = 5;
    apiService.GET_TopMainContactPersons.mockResolvedValue(undefined);

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should clear contact persons and mark the load as failed when the API rejects', async () => {
    service.contractId = 'D527';
    service.limit = 5;
    service.list.set([{ name: 'Jane Doe', count: 4 }]);
    apiService.GET_TopMainContactPersons.mockRejectedValue(new Error('Request failed'));

    await service.update();

    expect(service.list()).toEqual([]);
    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
  });
});
