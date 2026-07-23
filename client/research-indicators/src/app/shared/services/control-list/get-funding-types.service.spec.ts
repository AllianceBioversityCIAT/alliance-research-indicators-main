import { TestBed } from '@angular/core/testing';
import { GetFundingTypesService } from './get-funding-types.service';
import { ApiService } from '../api.service';

describe('GetFundingTypesService', () => {
  let service: GetFundingTypesService;
  let apiMock: { GET_FundingTypes: jest.Mock };

  const setup = async (response: unknown, reject = false) => {
    apiMock = {
      GET_FundingTypes: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [GetFundingTypesService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetFundingTypesService);
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

  it('main success sets data and stops loading', async () => {
    const mockData = [{ funding_type: 'BLR' }, { funding_type: 'RUN' }];
    await setup({ data: mockData });
    expect(apiMock.GET_FundingTypes).toHaveBeenCalled();
    expect(service.list()).toEqual(mockData);
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
    const newData = [{ funding_type: 'W3U' }, { funding_type: 'HOS' }];
    apiMock.GET_FundingTypes.mockResolvedValueOnce({ data: newData });

    await service.main();
    expect(service.list()).toEqual(newData);
    expect(service.loading()).toBe(false);
  });
});
