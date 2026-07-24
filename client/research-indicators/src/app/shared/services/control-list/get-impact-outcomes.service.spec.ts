import { TestBed } from '@angular/core/testing';
import { ApiService } from '../api.service';
import { GetImpactOutcomesService } from './get-impact-outcomes.service';

describe('GetImpactOutcomesService', () => {
  let service: GetImpactOutcomesService;
  let apiMock: { GET_ImpactOutcomes: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_ImpactOutcomes: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [GetImpactOutcomesService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetImpactOutcomesService);
    await Promise.resolve();
  };

  it('should initialize with root list and loading false', async () => {
    await setup({ data: [{ id: 1, name: 'IO1' }] });

    expect(service.list()).toEqual([{ id: 1, name: 'IO1' }]);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('should handle non-array root response', async () => {
    await setup({ data: null });

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle root request errors', async () => {
    await setup(undefined, true);

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should keep parameterized lists and loading states separate', async () => {
    await setup({ data: [] });
    apiMock.GET_ImpactOutcomes.mockResolvedValueOnce({ data: [{ id: 2, name: 'IO2' }] });

    await service.main({ portfolioId: 1, reportYear: 2026 });

    expect(apiMock.GET_ImpactOutcomes).toHaveBeenLastCalledWith({ portfolioId: 1, reportYear: 2026 });
    expect(service.getList({ portfolioId: 1, reportYear: 2026 })()).toEqual([{ id: 2, name: 'IO2' }]);
    expect(service.getLoading({ portfolioId: 1, reportYear: 2026 })()).toBe(false);
    expect(service.list()).toEqual([]);
  });

  it('should handle non-array parameterized response and request errors', async () => {
    await setup({ data: [] });
    apiMock.GET_ImpactOutcomes.mockResolvedValueOnce({ data: null });
    await service.main({ portfolioId: 2, reportYear: 2027 });
    expect(service.getList({ portfolioId: 2, reportYear: 2027 })()).toEqual([]);

    apiMock.GET_ImpactOutcomes.mockRejectedValueOnce(new Error('fail'));
    await service.main({ portfolioId: 3, reportYear: 2028 });
    expect(service.getList({ portfolioId: 3, reportYear: 2028 })()).toEqual([]);
    expect(service.getLoading({ portfolioId: 3, reportYear: 2028 })()).toBe(false);
  });

  it('should fall back to root signals when cached parameter signals are missing', async () => {
    await setup({ data: [] });
    (service as any).listsByParams.set('4:2029', undefined);
    (service as any).loadingByParams.set('4:2029', undefined);

    expect(service.getList({ portfolioId: 4, reportYear: 2029 })).toBe(service.list);
    expect(service.getLoading({ portfolioId: 4, reportYear: 2029 })).toBe(service.loading);
  });

  it('should handle empty parameter keys', async () => {
    await setup({ data: [] });

    expect(service.getList({})()).toEqual([]);
    expect(service.getLoading({})()).toBe(true);
  });
});
