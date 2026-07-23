import { TestBed } from '@angular/core/testing';
import { DisseminationQualificationsService } from './dissemination-qualifications.service';
import { ApiService } from '../api.service';

describe('DisseminationQualificationsService', () => {
  let service: DisseminationQualificationsService;
  let apiMock: { GET_DisseminationQualifications: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_DisseminationQualifications: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [DisseminationQualificationsService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(DisseminationQualificationsService);
    await Promise.resolve();
  };

  it('should create', async () => {
    await setup({ data: [] });
    expect(service).toBeTruthy();
  });

  it('main success with array', async () => {
    const data = [
      { value: 1, label: 'Local' },
      { value: 2, label: 'Global' }
    ];
    await setup({ data });
    expect(apiMock.GET_DisseminationQualifications).toHaveBeenCalled();
    expect(service.list()).toEqual(data);
    expect(service.loading()).toBe(false);
  });

  it('main success with undefined data uses []', async () => {
    await setup({ data: undefined });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main catch sets empty, logs and stops loading', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined as any);
    await setup(undefined, true);
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
