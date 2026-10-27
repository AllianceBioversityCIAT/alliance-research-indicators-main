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

type ResultsPayload = { successfulRequest: boolean; data?: { results: Result[] } };

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
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

  it('issues one GET_Results when two main(2) calls overlap, and both resolve with the same list', async () => {
    const gate = deferred<ResultsPayload>();
    apiMock.GET_Results.mockReturnValue(gate.promise);
    const expected = [row(4)];

    const first = service.main(2);
    const second = service.main(2);

    expect(apiMock.GET_Results).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    gate.resolve({ successfulRequest: true, data: { results: expected } });
    await Promise.all([first, second]);

    expect(service.getList(2)()).toEqual(expected);
  });

  it('clears a forced error and fills the list when a later main(2) succeeds after a failure', async () => {
    apiMock.GET_Results.mockResolvedValueOnce({
      successfulRequest: false,
      data: { results: [row(4)] }
    });

    await service.main(2);

    expect(service.getError(2)()).toBe(true);
    expect(service.getList(2)()).toEqual([]);

    const gate = deferred<ResultsPayload>();
    apiMock.GET_Results.mockImplementationOnce(() => gate.promise);

    const pending = service.main(2);
    // Forced state: not reachable via main() once requests are deduped and the
    // error is cleared at start. This isolates the success-path reset (defense
    // in depth) so its removal is detectable.
    service.getError(2).set(true);
    gate.resolve({ successfulRequest: true, data: { results: [row(4)] } });
    await pending;

    expect(service.getError(2)()).toBe(false);
    expect(service.getList(2)()).toEqual([row(4)]);
  });

  it('keeps an overlapping main(6) independent of an in-flight main(2)', async () => {
    const gate2 = deferred<ResultsPayload>();
    const gate6 = deferred<ResultsPayload>();
    apiMock.GET_Results.mockImplementation((params: { 'indicator-codes': number[] }) =>
      params['indicator-codes'][0] === 2 ? gate2.promise : gate6.promise
    );

    const development = service.main(2);
    const use = service.main(6);

    expect(apiMock.GET_Results).toHaveBeenCalledTimes(2);
    expect(apiMock.GET_Results.mock.calls.map(call => call[0])).toEqual([
      { 'indicator-codes': [2] },
      { 'indicator-codes': [6] }
    ]);

    gate2.resolve({ successfulRequest: true, data: { results: [row(4)] } });
    gate6.resolve({ successfulRequest: true, data: { results: [row(6)] } });
    await Promise.all([development, use]);

    expect(service.getList(2)()).toEqual([row(4)]);
    expect(service.getList(6)()).toEqual([row(6)]);
  });

  it('issues a new GET_Results when main(2) is called again after the previous call settles', async () => {
    apiMock.GET_Results.mockResolvedValue({ successfulRequest: true, data: { results: [row(4)] } });

    await service.main(2);
    await service.main(2);

    expect(apiMock.GET_Results).toHaveBeenCalledTimes(2);
  });
});
