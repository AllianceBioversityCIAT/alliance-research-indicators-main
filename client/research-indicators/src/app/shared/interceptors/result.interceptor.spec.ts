import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { resultInterceptor } from './result.interceptor';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

describe('resultInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => TestBed.runInInjectionContext(() => resultInterceptor(req, next));

  let mockRouter: any;
  let mockHandler: jest.MockedFunction<HttpHandlerFn>;

  beforeEach(() => {
    mockRouter = {
      url: '/test-route',
      parseUrl: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: mockRouter }]
    });

    mockHandler = jest.fn().mockReturnValue(of({}));
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should pass through request when X-Use-Year header is not present', () => {
    const request = new HttpRequest('GET', 'http://test.com/api/data');

    interceptor(request, mockHandler);

    expect(mockHandler).toHaveBeenCalledWith(request);
  });

  it('should remove X-Use-Year header and pass through when no year is found in URL', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: {}
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data');
  });

  it('should add year parameter to URL when X-Use-Year header is present and year exists', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
  });

  it('should add year parameter to URL with & separator when URL already has query parameters', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data?param1=value1', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?param1=value1&reportYear=2023');
  });

  it('should handle POST request with X-Use-Year header', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const body = { data: 'test' };
    const request = new HttpRequest('POST', 'http://test.com/api/data', body, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
    expect(calledRequest.method).toBe('POST');
    expect(calledRequest.body).toEqual(body);
  });

  it('should handle PUT request with X-Use-Year header', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const body = { data: 'test' };
    const request = new HttpRequest('PUT', 'http://test.com/api/data/123', body, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data/123?reportYear=2023');
    expect(calledRequest.method).toBe('PUT');
  });

  it('should handle DELETE request with X-Use-Year header', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('DELETE', 'http://test.com/api/data/123', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data/123?reportYear=2023');
    expect(calledRequest.method).toBe('DELETE');
  });

  it('should handle request with multiple existing query parameters', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data?param1=value1&param2=value2', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?param1=value1&param2=value2&reportYear=2023');
  });

  it('should handle request with empty version parameter', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data');
  });

  it('should handle request with null version parameter', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: null }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data');
  });

  it('should handle request with undefined version parameter', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: undefined }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data');
  });

  it('should handle request with version parameter that is not a string', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: 2023 }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
  });

  it('should handle request with complex URL structure', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'https://api.example.com/v1/users/123/projects?status=active&type=research', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('https://api.example.com/v1/users/123/projects?status=active&type=research&reportYear=2023');
  });

  it('should handle request with URL containing hash fragment', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data?param1=value1#section1', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?param1=value1#section1&reportYear=2023');
  });

  it('should preserve request body when adding year parameter', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const body = { name: 'test', value: 123 };
    const request = new HttpRequest('POST', 'http://test.com/api/data', body, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
    expect(calledRequest.body).toEqual(body);
  });

  it('should preserve request method when adding year parameter', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true');
    const request = new HttpRequest('PATCH', 'http://test.com/api/data/123', { field: 'value' }, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data/123?reportYear=2023');
    expect(calledRequest.method).toBe('PATCH');
  });

  it('should handle request with multiple X-Use-Year headers', () => {
    const headers = new HttpHeaders().set('X-Use-Year', 'true').set('X-Use-Year', 'false'); // This will override the previous one
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
  });

  it('should handle request with case-insensitive X-Use-Year header', () => {
    const headers = new HttpHeaders().set('x-use-year', 'true');
    const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

    mockRouter.parseUrl.mockReturnValue({
      queryParams: { version: '2023' }
    });

    interceptor(request, mockHandler);

    const calledRequest = mockHandler.mock.calls[0][0];
    expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
    expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
  });

  describe('Platform detection', () => {
    it('should add TIP platform when URL contains TIP-2804', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/TIP-2804/general-information';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: { version: '2023' }
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023&reportingPlatforms=TIP');
    });

    it('should add PRMS platform when URL contains PRMS-2804', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/PRMS-2804/general-information';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: { version: '2023' }
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023&reportingPlatforms=PRMS');
    });

    it('should add AICCRA platform when URL contains AICCRA-27233', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/AICCRA-27233/general-information';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: { version: '2023' }
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023&reportingPlatforms=AICCRA');
    });

    // Guards the bug class, not just AICCRA: the alternation used to be a hardcoded
    // subset of PLATFORM_CODES. Any code added to that constant must be resolvable here,
    // or its results silently fall back to platform_code='STAR' server-side.
    it.each(Object.values(PLATFORM_CODES).filter(code => code !== PLATFORM_CODES.STAR))(
      'resolves %s from the URL so the platform is never silently defaulted to STAR',
      platformCode => {
        const headers = new HttpHeaders().set('X-Use-Year', 'true');
        const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

        mockRouter.url = `/result/${platformCode}-27233/general-information`;
        mockRouter.parseUrl.mockReturnValue({ queryParams: {} });

        interceptor(request, mockHandler);

        expect(mockHandler.mock.calls[0][0].url).toBe(`http://test.com/api/data?reportingPlatforms=${platformCode}`);
      }
    );

    it('should add STAR platform when URL contains only result/2804', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/2804/general-information';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: { version: '2023' }
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023&reportingPlatforms=STAR');
    });

    it('should not add platform when URL does not match result pattern', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/other-route';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: { version: '2023' }
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?reportYear=2023');
    });

    it('should add platform without year when no year is present', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/TIP-2804/general-information';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: {}
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?reportingPlatforms=TIP');
    });

    it('should handle both year and platform with existing query parameters', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data?param1=value1', null, { headers });

      mockRouter.url = '/result/PRMS-2804/general-information';
      mockRouter.parseUrl.mockReturnValue({
        queryParams: { version: '2023' }
      });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.headers.has('X-Use-Year')).toBe(false);
      expect(calledRequest.url).toBe('http://test.com/api/data?param1=value1&reportYear=2023&reportingPlatforms=PRMS');
    });

    // Attempt-2 rework — Reviewer FAIL: the T-01 refactor to platform-code.util.ts
    // must not widen this interceptor's URL matcher. Added, not editing the
    // existing PLATFORM_CODES enumeration above (DD-4's safety net stays intact).
    it('should not add a platform for an unrecognized prefix (does not widen the matcher)', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/FOO-123/general-information';
      mockRouter.parseUrl.mockReturnValue({ queryParams: {} });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.url).toBe('http://test.com/api/data');
    });

    it('should not add a platform for a lowercase prefix (case-sensitivity preserved)', () => {
      const headers = new HttpHeaders().set('X-Use-Year', 'true');
      const request = new HttpRequest('GET', 'http://test.com/api/data', null, { headers });

      mockRouter.url = '/result/tip-123/general-information';
      mockRouter.parseUrl.mockReturnValue({ queryParams: {} });

      interceptor(request, mockHandler);

      const calledRequest = mockHandler.mock.calls[0][0];
      expect(calledRequest.url).toBe('http://test.com/api/data');
    });
  });
});
