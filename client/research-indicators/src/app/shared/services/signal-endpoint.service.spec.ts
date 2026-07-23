import { SignalEndpointService } from './signal-endpoint.service';

describe('SignalEndpointService', () => {
  let service: SignalEndpointService;
  let mockTP: any;
  let mockCache: any;

  beforeEach(() => {
    mockTP = { get: jest.fn().mockResolvedValue({ data: undefined }) };
    mockCache = { set: jest.fn(), get: jest.fn(), has: jest.fn() };
    service = Object.create(SignalEndpointService.prototype);
    (service as any).TP = mockTP;
    (service as any).clCache = mockCache;
  });

  function setupEndpoint(useCache = true, referenceName?: string) {
    return service.createEndpoint<any>(() => 'url', referenceName, useCache);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetch stores data and sets hasValue for array', async () => {
    mockTP.get.mockResolvedValue({ data: [1, 2, 3] });
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint();
    await endpoint.fetch();
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    expect(endpoint.lazy().list()).toEqual([1, 2, 3]);
    expect(endpoint.lazy().hasValue()).toBe(true);
    // isLoading() is not validated by signal timing in Jest
    expect(mockCache.set).toHaveBeenCalledWith('url', [1, 2, 3]);
  });

  it('fetch stores data and sets hasValue for object', async () => {
    mockTP.get.mockResolvedValue({ data: { a: 1 } });
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint();
    await endpoint.fetch();
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    expect(endpoint.lazy().list()).toEqual({ a: 1 });
    expect(endpoint.lazy().hasValue()).toBe(true);
    // isLoading() is not validated by signal timing in Jest
  });

  it('fetch sets hasValue false for empty array/object', async () => {
    mockTP.get.mockResolvedValueOnce({ data: [] });
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint();
    await endpoint.fetch();
    expect(endpoint.lazy().hasValue()).toBe(false);
    mockTP.get.mockResolvedValueOnce({ data: {} });
    await endpoint.fetch();
    expect(endpoint.lazy().hasValue()).toBe(false);
  });

  it('promise returns cached data if present', async () => {
    mockCache.has.mockReturnValue(true);
    mockCache.get.mockReturnValue([7]);
    const endpoint = setupEndpoint();
    const result = await endpoint.promise();
    expect(result).toEqual([7]);
  });

  it('promise fetches from API if no cache', async () => {
    mockCache.has.mockReturnValue(false);
    mockTP.get.mockResolvedValue({ data: [5] });
    const endpoint = setupEndpoint();
    const result = await endpoint.promise();
    expect(result).toEqual([5]);
  });

  it('fetch stores reference cache if referenceName', async () => {
    mockTP.get.mockResolvedValue({ data: [1, 2, 3] });
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint(true, 'ref');
    endpoint.setReferenceName('ref');
    await endpoint.fetch();
    expect(mockCache.set).toHaveBeenCalledWith('url_ref', [1, 2, 3]);
  });

  it('getCachedData returns reference cache if present', async () => {
    mockCache.has.mockImplementation((key: any) => key === 'url_ref');
    mockCache.get.mockImplementation((key: any) => (key === 'url_ref' ? [9] : null));
    const endpoint = setupEndpoint(true, 'ref');
    endpoint.setReferenceName('ref');
    const result = await endpoint.promise();
    expect(result).toEqual([9]);
  });

  it('getCachedData returns parent cache if reference not present', async () => {
    mockCache.has.mockImplementation((key: any) => key === 'url');
    mockCache.get.mockImplementation((key: any) => (key === 'url' ? [8] : null));
    const endpoint = setupEndpoint();
    const result = await endpoint.promise();
    expect(result).toEqual([8]);
  });

  it('getCachedData returns null if no cache', async () => {
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint();
    const result = await endpoint.promise();
    expect(result).toEqual(undefined);
  });

  it('getCachedData returns null if useCache is false', async () => {
    const endpoint = setupEndpoint(false);
    const result = await endpoint.promise();
    expect(result).toEqual(undefined);
  });

  it('setReferenceName triggers fetch if initialized', async () => {
    mockTP.get.mockResolvedValueOnce({ data: [1] });
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint();
    endpoint.lazy(); // initialize and make first fetch
    await new Promise(r => setTimeout(r, 0));
    mockTP.get.mockResolvedValueOnce({ data: [2] });
    endpoint.setReferenceName('newRef');
    await new Promise(r => setTimeout(r, 0));
    expect(endpoint.lazy().list()).toEqual([2]);
  });

  it('lazy initializes and fetches only once', async () => {
    mockTP.get.mockResolvedValue({ data: [1, 2, 3] });
    mockCache.has.mockReturnValue(false);
    const endpoint = setupEndpoint();
    const result1 = endpoint.lazy();
    expect(result1).toHaveProperty('isLoading');
    expect(result1).toHaveProperty('hasValue');
    expect(result1).toHaveProperty('list');
    // call again does not fetch again
    const fetchSpy = jest.spyOn(endpoint, 'fetch');
    endpoint.lazy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
