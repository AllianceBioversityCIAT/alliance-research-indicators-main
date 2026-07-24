import { TestBed } from '@angular/core/testing';
import { GetLeverStrategicOutcomesService } from './get-lever-strategic-outcomes.service';
import { ApiService } from '../api.service';

describe('GetLeverStrategicOutcomesService', () => {
  let service: GetLeverStrategicOutcomesService;
  let apiMock: { GET_LeverStrategicOutcomes: jest.Mock };

  beforeEach(() => {
    apiMock = {
      GET_LeverStrategicOutcomes: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        GetLeverStrategicOutcomesService,
        { provide: ApiService, useValue: apiMock }
      ]
    });

    service = TestBed.inject(GetLeverStrategicOutcomesService);
  });

  it('should be created with default signals', () => {
    expect(service).toBeTruthy();
    expect(service.loading()).toBe(false);
    expect(service.list()).toEqual([]);
  });

  it('isOpenSearch should be false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });

  it('getList/getLoading without lever_id should return default signals', () => {
    expect(service.getList()).toBe(service.list);
    expect(service.getLoading()).toBe(service.loading);
  });

  it('getList/getLoading with lever_id should return distinct per-id signals', () => {
    const l1 = service.getList(1);
    const l2 = service.getList(2);
    const ld1 = service.getLoading(1);
    const ld2 = service.getLoading(2);

    expect(l1).not.toBe(l2);
    expect(ld1).not.toBe(ld2);

    // Update and verify independence
    l1.set([{ lever_strategic_outcome_id: 10 } as any]);
    l2.set([{ lever_strategic_outcome_id: 20 } as any]);
    expect(l1()).toEqual([{ lever_strategic_outcome_id: 10 }]);
    expect(l2()).toEqual([{ lever_strategic_outcome_id: 20 }]);
  });

  it('main without lever_id should set default list empty and toggle default loading', async () => {
    const spySet = jest.spyOn(service.list, 'set');
    const spyLoadSet = jest.spyOn(service.loading, 'set');
    await service.main();
    expect(spyLoadSet).toHaveBeenNthCalledWith(1, true);
    expect(spySet).toHaveBeenCalledWith([]);
    expect(spyLoadSet).toHaveBeenLastCalledWith(false);
  });

  it('main with lever_id should populate per-id store when API returns array', async () => {
    apiMock.GET_LeverStrategicOutcomes.mockResolvedValue({ data: [{ id: 3 }] });
    const listSig = service.getList(7);
    const loadSig = service.getLoading(7);
    const listSpy = jest.spyOn(listSig, 'set');
    const loadSpy = jest.spyOn(loadSig, 'set');

    await service.main(7);
    expect(apiMock.GET_LeverStrategicOutcomes).toHaveBeenCalledWith(7);
    expect(listSpy).toHaveBeenCalledWith([{ id: 3 } as any]);
    expect(loadSpy).toHaveBeenLastCalledWith(false);
  });

  it('main with lever_id should set empty list when API returns non-array', async () => {
    apiMock.GET_LeverStrategicOutcomes.mockResolvedValue({ data: null });
    const listSig = service.getList(5);
    const spy = jest.spyOn(listSig, 'set');
    await service.main(5);
    expect(spy).toHaveBeenCalledWith([]);
  });

  it('main with lever_id should handle API error and set empty list', async () => {
    apiMock.GET_LeverStrategicOutcomes.mockRejectedValue(new Error('fail'));
    const listSig = service.getList(9);
    const loadSig = service.getLoading(9);
    const spyList = jest.spyOn(listSig, 'set');
    const spyLoad = jest.spyOn(loadSig, 'set');
    await service.main(9);
    expect(spyList).toHaveBeenCalledWith([]);
    expect(spyLoad).toHaveBeenLastCalledWith(false);
  });

  it('main with numeric string lever_id should coerce and call API', async () => {
    apiMock.GET_LeverStrategicOutcomes.mockResolvedValue({ data: [{ id: 1 }] });
    await service.main('11');
    expect(apiMock.GET_LeverStrategicOutcomes).toHaveBeenCalledWith(11);
    expect(service.getList(11)()).toEqual([{ id: 1 }]);
  });

  it('main with non-numeric string lever_id should clear default list without API call', async () => {
    const spy = jest.spyOn(service.list, 'set');
    await service.main('xyz');
    expect(apiMock.GET_LeverStrategicOutcomes).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([]);
  });
});


