import { TestBed } from '@angular/core/testing';
import { GetLeverSdgTargetsService } from './get-lever-sdg-targets.service';
import { ApiService } from '../api.service';

describe('GetLeverSdgTargetsService', () => {
  let service: GetLeverSdgTargetsService;
  let apiMock: { GET_LeverSdgTargets: jest.Mock };

  beforeEach(() => {
    apiMock = {
      GET_LeverSdgTargets: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetLeverSdgTargetsService, { provide: ApiService, useValue: apiMock }]
    });

    service = TestBed.inject(GetLeverSdgTargetsService);
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
    expect(l1).not.toBe(l2);
    expect(service.getLoading(1)).not.toBe(service.getLoading(2));
  });

  it('main without valid lever_id should clear default list and toggle default loading', async () => {
    const spySet = jest.spyOn(service.list, 'set');
    const spyLoadSet = jest.spyOn(service.loading, 'set');
    await service.main();
    expect(spyLoadSet).toHaveBeenNthCalledWith(1, true);
    expect(spySet).toHaveBeenCalledWith([]);
    expect(spyLoadSet).toHaveBeenLastCalledWith(false);
  });

  it('main with string lever id should call API and map rows with select_label', async () => {
    apiMock.GET_LeverSdgTargets.mockResolvedValue({
      data: [
        { id: 1, sdg_target_code: '2.1', sdg_target: 'End hunger' },
        { id: 2, sdg_target_code: '', sdg_target: 'Only label' }
      ]
    });
    await service.main('10');
    expect(apiMock.GET_LeverSdgTargets).toHaveBeenCalledWith(10, true);
    const listSig = service.getList(10);
    expect(listSig()).toEqual([
      {
        id: 1,
        sdg_target_code: '2.1',
        sdg_target: 'End hunger',
        sdg_target_id: 1,
        select_label: '2.1 — End hunger'
      },
      {
        id: 2,
        sdg_target_code: '',
        sdg_target: 'Only label',
        sdg_target_id: 2,
        select_label: 'Only label'
      }
    ]);
  });

  it('main with lever_id should set empty list when API returns non-array data', async () => {
    apiMock.GET_LeverSdgTargets.mockResolvedValue({ data: null });
    const listSig = service.getList(4);
    const spy = jest.spyOn(listSig, 'set');
    await service.main(4);
    expect(spy).toHaveBeenCalledWith([]);
  });

  it('main with lever_id should handle API error and set empty list', async () => {
    apiMock.GET_LeverSdgTargets.mockRejectedValue(new Error('network'));
    const listSig = service.getList(8);
    const loadSig = service.getLoading(8);
    await service.main(8);
    expect(listSig()).toEqual([]);
    expect(loadSig()).toBe(false);
  });

  it('main with non-finite string lever id should use default list path', async () => {
    const spy = jest.spyOn(service.list, 'set');
    await service.main('not-a-number');
    expect(apiMock.GET_LeverSdgTargets).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([]);
  });

  it('mapRows returns empty array for null/undefined data', () => {
    expect((service as any).mapRows(null)).toEqual([]);
    expect((service as any).mapRows(undefined)).toEqual([]);
  });

  it('mapRows builds empty select_label when both code and title are blank', () => {
    const rows = (service as any).mapRows([{ id: 9, sdg_target_code: '', sdg_target: '' }]);
    expect(rows[0].select_label).toBe('');
  });
});
