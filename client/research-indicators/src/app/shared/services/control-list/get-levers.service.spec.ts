import { TestBed } from '@angular/core/testing';
import { GetLeversService } from './get-levers.service';
import { ApiService } from '../api.service';

describe('GetLeversService', () => {
  let service: GetLeversService;
  let apiMock: { GET_Levers: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_Levers: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [GetLeversService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetLeversService);
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
    const mockData = [
      { id: 1, name: 'Lever 1' },
      { id: 2, name: 'Lever 2' }
    ];
    const expectedData = [
      { id: 1, name: 'Lever 1', lever_id: 1 },
      { id: 2, name: 'Lever 2', lever_id: 2 }
    ];
    await setup({ data: mockData });
    expect(apiMock.GET_Levers).toHaveBeenCalled();
    expect(service.list()).toEqual(expectedData);
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
    const newData = [{ id: 3, name: 'New Lever' }];
    const expectedData = [{ id: 3, name: 'New Lever', lever_id: 3 }];
    apiMock.GET_Levers.mockResolvedValueOnce({ data: newData });

    await service.main();
    expect(service.list()).toEqual(expectedData);
    expect(service.loading()).toBe(false);
  });

  it('keeps the Other lever only when API returns it', async () => {
    await setup({ data: [{ id: 9, name: 'Other', short_name: 'Other', full_name: 'Other' }] });
    expect(service.list().filter(lever => Number(lever.id) === 9)).toHaveLength(1);
  });

  it('keeps parameterized lever lists separate', async () => {
    await setup({ data: [] });
    apiMock.GET_Levers.mockResolvedValueOnce({ data: [{ id: 10, name: 'Research Area' }] });

    await service.main({ portfolioId: 1, reportYear: 2026 });

    expect(apiMock.GET_Levers).toHaveBeenLastCalledWith({ portfolioId: 1, reportYear: 2026 });
    expect(service.getList({ portfolioId: 1, reportYear: 2026 })()).toEqual([{ id: 10, name: 'Research Area', lever_id: 10 }]);
    expect(service.list()).toEqual([]);
  });

  it('falls back to root signals when cached parameter signals are missing', async () => {
    await setup({ data: [] });
    (service as any).listsByParams.set('4:2029', undefined);
    (service as any).loadingByParams.set('4:2029', undefined);

    expect(service.getList({ portfolioId: 4, reportYear: 2029 })).toBe(service.list);
    expect(service.getLoading({ portfolioId: 4, reportYear: 2029 })).toBe(service.loading);
  });

  it('handles empty parameter keys', async () => {
    await setup({ data: [] });

    expect(service.getList({})()).toEqual([]);
    expect(service.getLoading({})()).toBe(true);
  });
});
