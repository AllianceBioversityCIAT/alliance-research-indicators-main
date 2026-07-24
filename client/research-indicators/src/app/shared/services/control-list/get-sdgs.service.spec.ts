import { TestBed } from '@angular/core/testing';
import { GetSdgsService } from './get-sdgs.service';
import { ApiService } from '../api.service';

describe('GetSdgsService', () => {
  let service: GetSdgsService;
  let apiMock: { GET_SDGs: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_SDGs: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [GetSdgsService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetSdgsService);
    await Promise.resolve();
  };

  it('should be created', async () => {
    await setup({ data: [] });
    expect(service).toBeTruthy();
  });

  it('should initialize with empty list and loading false', async () => {
    await setup({ data: [] });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('main success maps data with select_label and sdg_id', async () => {
    const mockData = [
      { id: 1, financial_code: 'SDG1', short_name: 'No Poverty' },
      { id: 2, financial_code: 'SDG2', short_name: 'Zero Hunger' }
    ];
    await setup({ data: mockData });
    expect(apiMock.GET_SDGs).toHaveBeenCalled();
    expect(service.list().length).toBe(2);
    expect(service.list()[0].select_label).toBe('SDG1 - No Poverty');
    expect(service.list()[0].sdg_id).toBe(1);
    expect(service.list()[1].select_label).toBe('SDG2 - Zero Hunger');
    expect(service.list()[1].sdg_id).toBe(2);
    expect(service.loading()).toBe(false);
  });

  it('main success handles non-array response', async () => {
    await setup({ data: null });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main catch sets empty list and stops loading', async () => {
    await setup(undefined, true);
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should allow manual main call with updated data', async () => {
    await setup({ data: [] });
    const newData = [{ id: 3, financial_code: 'SDG3', short_name: 'Good Health' }];
    apiMock.GET_SDGs.mockResolvedValueOnce({ data: newData });
    
    await service.main();
    expect(service.list().length).toBe(1);
    expect(service.list()[0].select_label).toBe('SDG3 - Good Health');
    expect(service.list()[0].sdg_id).toBe(3);
    expect(service.loading()).toBe(false);
  });

  it('initialize calls main', async () => {
    await setup({ data: [] });
    const mainSpy = jest.spyOn(service, 'main');
    service.initialize();
    expect(mainSpy).toHaveBeenCalled();
  });
});
