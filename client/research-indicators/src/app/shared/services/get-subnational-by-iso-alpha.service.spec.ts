import { TestBed } from '@angular/core/testing';
import { GetSubnationalByIsoAlphaService } from './get-subnational-by-iso-alpha.service';
import { ApiService } from './api.service';
import { signal } from '@angular/core';

describe('GetSubnationalByIsoAlphaService', () => {
  let service: GetSubnationalByIsoAlphaService;
  let apiMock: any;

  const mockData = [
    { id: 1, name: 'Sub1', sub_national_id: 0 },
    { id: 2, name: 'Sub2', sub_national_id: 0 }
  ];

  beforeEach(() => {
    apiMock = {
      GET_SubNationals: jest.fn().mockResolvedValue({ data: JSON.parse(JSON.stringify(mockData)) })
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetSubnationalByIsoAlphaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default signals', () => {
    expect(service.results()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('should call api and set sub_national_id in getInstance', async () => {
    const resultSignal = await service.getInstance({ isoAlpha2: 'CO' });
    const value = resultSignal();
    expect(apiMock.GET_SubNationals).toHaveBeenCalledWith('CO');
    expect(value.length).toBe(2);
    expect(value[0].sub_national_id).toBe(1);
    expect(value[1].sub_national_id).toBe(2);
  });

  it('should handle empty response', async () => {
    apiMock.GET_SubNationals.mockResolvedValueOnce({ data: [] });
    const resultSignal = await service.getInstance({ isoAlpha2: 'BR' });
    expect(resultSignal()).toEqual([]);
  });

  it('should propagate errors from api', async () => {
    apiMock.GET_SubNationals.mockRejectedValueOnce(new Error('fail'));
    await expect(service.getInstance({ isoAlpha2: 'XX' })).rejects.toThrow('fail');
  });
});
