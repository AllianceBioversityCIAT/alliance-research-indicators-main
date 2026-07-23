import { TestBed } from '@angular/core/testing';
import { GetInstitutionTypesService } from './get-institution-types.service';
import { ApiService } from '../api.service';

const mockData = [
  { id: 1, name: 'Type 1' },
  { id: 2, name: 'Type 2' }
];

describe('GetInstitutionTypesService', () => {
  let service: GetInstitutionTypesService;
  let apiService: any;

  beforeEach(() => {
    apiService = {
      GET_SubInstitutionTypes: jest.fn().mockResolvedValue({ data: mockData })
    };
    TestBed.configureTestingModule({
      providers: [GetInstitutionTypesService, { provide: ApiService, useValue: apiService }]
    });
    service = TestBed.inject(GetInstitutionTypesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main sets loading and list correctly', async () => {
    await service.main();
    expect(apiService.GET_SubInstitutionTypes).toHaveBeenCalledWith(1);
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('main handles empty response', async () => {
    apiService.GET_SubInstitutionTypes.mockResolvedValueOnce({ data: [] });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response null', async () => {
    apiService.GET_SubInstitutionTypes.mockResolvedValueOnce({ data: null });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response undefined', async () => {
    apiService.GET_SubInstitutionTypes.mockResolvedValueOnce(undefined);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response without data', async () => {
    apiService.GET_SubInstitutionTypes.mockResolvedValueOnce({ status: 200 });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('initial signals', () => {
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });
});
