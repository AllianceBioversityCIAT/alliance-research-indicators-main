import { TestBed } from '@angular/core/testing';
import { GetInnovationTypesService } from './get-innovation-types.service';
import { ApiService } from '../api.service';

const mockData = [
  { id: 1, name: 'Innovation Type 1' },
  { id: 2, name: 'Innovation Type 2' }
];

describe('GetInnovationTypesService', () => {
  let service: GetInnovationTypesService;
  let apiService: any;

  beforeEach(() => {
    apiService = {
      GET_InnovationTypes: jest.fn().mockResolvedValue({ data: mockData })
    };
    TestBed.configureTestingModule({
      providers: [GetInnovationTypesService, { provide: ApiService, useValue: apiService }]
    });
    service = TestBed.inject(GetInnovationTypesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main sets loading and list correctly', async () => {
    await service.main();
    expect(apiService.GET_InnovationTypes).toHaveBeenCalled();
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('main handles empty response', async () => {
    apiService.GET_InnovationTypes.mockResolvedValueOnce({ data: [] });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response null', async () => {
    apiService.GET_InnovationTypes.mockResolvedValueOnce({ data: null });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response undefined', async () => {
    apiService.GET_InnovationTypes.mockResolvedValueOnce(undefined);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response without data', async () => {
    apiService.GET_InnovationTypes.mockResolvedValueOnce({ status: 200 });
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
