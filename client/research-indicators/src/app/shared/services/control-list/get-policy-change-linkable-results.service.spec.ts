import { TestBed } from '@angular/core/testing';
import { GetPolicyChangeLinkableResultsService } from './get-policy-change-linkable-results.service';
import { ApiService } from '../api.service';
import { Result } from '@shared/interfaces/result/result.interface';

function row(statusId: number): Result {
  return {
    result_id: 100 + statusId,
    result_status_id: statusId,
    indicator_id: 2,
    title: `status-${statusId}`
  } as Result;
}

describe('GetPolicyChangeLinkableResultsService', () => {
  let service: GetPolicyChangeLinkableResultsService;
  let apiMock: { GET_Results: jest.Mock };

  beforeEach(() => {
    apiMock = {
      GET_Results: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [GetPolicyChangeLinkableResultsService, { provide: ApiService, useValue: apiMock }]
    });

    service = TestBed.inject(GetPolicyChangeLinkableResultsService);
  });

  it('main(2) calls GET_Results with indicator-codes [2] exactly', async () => {
    apiMock.GET_Results.mockResolvedValue({ successfulRequest: true, data: { results: [] } });
    await service.main(2);
    expect(apiMock.GET_Results.mock.calls[0][0]).toEqual({ 'indicator-codes': [2] });
  });

  it('main(6) calls GET_Results with indicator-codes [6] exactly', async () => {
    apiMock.GET_Results.mockResolvedValue({ successfulRequest: true, data: { results: [] } });
    await service.main(6);
    expect(apiMock.GET_Results.mock.calls[0][0]).toEqual({ 'indicator-codes': [6] });
  });

  it('keeps statuses 4, 6 and 14 and drops Not approved (7) and Deleted (8)', async () => {
    const fixture = [row(4), row(6), row(7), row(8), row(14)];
    apiMock.GET_Results.mockResolvedValue({ successfulRequest: true, data: { results: fixture } });

    await service.main(2);

    expect(service.getList(2)()).toEqual([row(4), row(6), row(14)]);
  });

  it('sets this indicator error and an empty list when the response is unsuccessful, and leaves the other indicator untouched', async () => {
    const otherError = service.getError(6);
    expect(otherError()).toBe(false);
    apiMock.GET_Results.mockResolvedValue({
      successfulRequest: false,
      data: { results: [row(4)] }
    });

    await service.main(2);

    expect(service.getError(2)()).toBe(true);
    expect(service.getList(2)()).toEqual([]);
    expect(service.getError(6)()).toBe(false);
    expect(otherError).toBe(service.getError(6));
  });

  it('sets this indicator error and an empty list when GET_Results throws', async () => {
    apiMock.GET_Results.mockRejectedValue(new Error('network'));

    await service.main(2);

    expect(service.getError(2)()).toBe(true);
    expect(service.getList(2)()).toEqual([]);
    expect(service.getLoading(2)()).toBe(false);
  });

  it('getList(2) and getList(6) are distinct signals', () => {
    expect(service.getList(2)).not.toBe(service.getList(6));
    service.getList(2).set([row(4)]);
    expect(service.getList(6)()).toEqual([]);
    expect(service.getList(2)()).toEqual([row(4)]);
  });

  it('isOpenSearch returns false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });
});
