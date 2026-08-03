import { TestBed } from '@angular/core/testing';
import { GetClarisaSdgTargetsService } from './get-clarisa-sdg-targets.service';
import { ApiService } from '../api.service';

describe('GetClarisaSdgTargetsService', () => {
  let service: GetClarisaSdgTargetsService;
  let apiMock: { GET_ClarisaSdgTargets: jest.Mock };

  beforeEach(() => {
    apiMock = {
      GET_ClarisaSdgTargets: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetClarisaSdgTargetsService, { provide: ApiService, useValue: apiMock }]
    });

    service = TestBed.inject(GetClarisaSdgTargetsService);
  });

  it('should be created with default signals', () => {
    expect(service).toBeTruthy();
    expect(service.loading()).toBe(false);
    expect(service.list()).toEqual([]);
  });

  it('isOpenSearch should be false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });

  it('getList/getLoading return shared signals for any id', () => {
    expect(service.getList()).toBe(service.list);
    expect(service.getList(1)).toBe(service.list);
    expect(service.getLoading()).toBe(service.loading);
    expect(service.getLoading(2)).toBe(service.loading);
  });

  it('main should call GET_ClarisaSdgTargets and map rows with select_label', async () => {
    apiMock.GET_ClarisaSdgTargets.mockResolvedValue({
      data: [
        { id: 1, sdg_target_code: '1.1', sdg_target: 'Eradicate poverty' },
        { id: 2, sdg_target_code: '', sdg_target: 'Title only' }
      ]
    });
    await service.main();
    expect(apiMock.GET_ClarisaSdgTargets).toHaveBeenCalled();
    expect(service.list()).toEqual([
      {
        id: 1,
        sdg_target_code: '1.1',
        sdg_target: 'Eradicate poverty',
        sdg_target_id: 1,
        select_label: '1.1 — Eradicate poverty'
      },
      {
        id: 2,
        sdg_target_code: '',
        sdg_target: 'Title only',
        sdg_target_id: 2,
        select_label: 'Title only'
      }
    ]);
  });

  it('main should set empty list on error', async () => {
    apiMock.GET_ClarisaSdgTargets.mockRejectedValue(new Error('network'));
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main: undefined response uses empty rows (optional chaining, non-array data)', async () => {
    apiMock.GET_ClarisaSdgTargets.mockResolvedValue(undefined);
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('main: data not an array falls back to []', async () => {
    apiMock.GET_ClarisaSdgTargets.mockResolvedValue({ data: { not: 'an-array' } } as { data: unknown });
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('mapRows: nullish data coalesces to []', () => {
    // private helper; only path that passes null/undefined to mapRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (service as any).mapRows(null) as { sdg_target_id: number; select_label: string }[];
    expect(mapped).toEqual([]);
  });

  it('mapRows: empty sdg_target_code and sdg_target gives empty select_label', async () => {
    apiMock.GET_ClarisaSdgTargets.mockResolvedValue({
      data: [{ id: 9, sdg_target_code: '', sdg_target: '' }]
    });
    await service.main();
    expect(service.list()).toEqual([
      expect.objectContaining({ sdg_target_id: 9, id: 9, select_label: '' })
    ]);
  });
});
