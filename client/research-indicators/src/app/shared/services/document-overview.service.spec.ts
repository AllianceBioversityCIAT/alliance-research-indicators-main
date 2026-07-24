import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DocumentOverviewService } from './document-overview.service';
import { cacheServiceMock } from 'src/app/testing/mock-services.mock';
import { environment } from '@envs/environment';

describe('DocumentOverviewService', () => {
  let service: DocumentOverviewService;
  let httpClientMock: { get: jest.Mock; post: jest.Mock };

  beforeEach(() => {
    httpClientMock = {
      get: jest.fn(),
      post: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [DocumentOverviewService, { provide: HttpClient, useValue: httpClientMock }]
    });

    service = TestBed.inject(DocumentOverviewService);
    (service as any).cache = cacheServiceMock;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetchDocumentOverviewSummary should GET query params and headers', async () => {
    const mockResponse = {
      overview: {
        project_summary: 'Stored project summary.'
      }
    };
    httpClientMock.get.mockReturnValue(of(mockResponse));

    const response = await service.fetchDocumentOverviewSummary('A492');

    expect(response).toEqual(mockResponse);
    expect(httpClientMock.get).toHaveBeenCalledWith(
      `${environment.documentOverviewUrl}/api/document-overview`,
      expect.any(Object)
    );

    const requestOptions = httpClientMock.get.mock.calls[0][1];
    expect(requestOptions.params.get('bucket_name')).toBe('ai-services-ibd');
    expect(requestOptions.params.get('project_folder')).toBe(`${environment.keyProjectOverview}A492`);
    expect(requestOptions.headers.get('access-token')).toBe(cacheServiceMock.dataCache().access_token);
    expect(requestOptions.headers.get('X-API-Key')).toBe(environment.clarisaApiKey);
    expect(requestOptions.headers.get('Content-Type')).toBe('application/json');
  });

  it('generateDocumentOverview should POST the expected payload and headers', async () => {
    const mockResponse = {
      overview: {
        project_summary: 'Generated project summary.'
      }
    };
    httpClientMock.post.mockReturnValue(of(mockResponse));

    const response = await service.generateDocumentOverview('A492');

    expect(response).toEqual(mockResponse);
    expect(httpClientMock.post).toHaveBeenCalledWith(
      `${environment.documentOverviewUrl}/api/document-overview`,
      {
        bucket_name: 'ai-services-ibd',
        project_folder: `${environment.keyProjectOverview}A492`,
        user_id: cacheServiceMock.dataCache().user.email
      },
      expect.any(Object)
    );

    const requestOptions = httpClientMock.post.mock.calls[0][2];
    expect(requestOptions.headers.get('access-token')).toBe(cacheServiceMock.dataCache().access_token);
    expect(requestOptions.headers.get('X-API-Key')).toBe(environment.clarisaApiKey);
    expect(requestOptions.headers.get('Content-Type')).toBe('application/json');
  });

  it('fetchDocumentOverviewSummary should throw error on failure', async () => {
    httpClientMock.get.mockReturnValue(throwError(() => new Error('fail')));

    await expect(service.fetchDocumentOverviewSummary('A492')).rejects.toThrow('fail');
  });

  it('generateDocumentOverview should throw error on failure', async () => {
    httpClientMock.post.mockReturnValue(throwError(() => new Error('fail')));

    await expect(service.generateDocumentOverview('A492')).rejects.toThrow('fail');
  });

  it('deleteDocumentOverviewFiles should POST the expected payload without auth headers', async () => {
    httpClientMock.post.mockReturnValue(of(undefined));

    await service.deleteDocumentOverviewFiles('A492', ['contract.pdf']);

    expect(httpClientMock.post).toHaveBeenCalledWith(
      `${environment.documentOverviewUrl}/api/document-overview/files/delete`,
      {
        bucket_name: 'ai-services-ibd',
        project_folder: `${environment.keyProjectOverview}A492`,
        file_names: ['contract.pdf']
      },
      expect.any(Object)
    );

    const requestOptions = httpClientMock.post.mock.calls[0][2];
    expect(requestOptions.headers.get('Content-Type')).toBe('application/json');
    expect(requestOptions.headers.get('no-auth-interceptor')).toBe('true');
    expect(requestOptions.headers.get('access-token')).toBeNull();
    expect(requestOptions.headers.get('X-API-Key')).toBeNull();
  });

  it('deleteDocumentOverviewFiles should throw error on failure', async () => {
    httpClientMock.post.mockReturnValue(throwError(() => new Error('fail')));

    await expect(service.deleteDocumentOverviewFiles('A492', ['contract.pdf'])).rejects.toThrow('fail');
  });
});
