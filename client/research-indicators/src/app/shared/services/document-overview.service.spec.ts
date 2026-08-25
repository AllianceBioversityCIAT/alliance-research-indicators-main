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

  it('generateDocumentOverview should include the trimmed text resource in the payload when provided', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', '  Context text to ground the summary.  ');

    expect(httpClientMock.post).toHaveBeenCalledWith(
      `${environment.documentOverviewUrl}/api/document-overview`,
      {
        bucket_name: 'ai-services-ibd',
        project_folder: `${environment.keyProjectOverview}A492`,
        user_id: cacheServiceMock.dataCache().user.email,
        text: 'Context text to ground the summary.'
      },
      expect.any(Object)
    );
  });

  it('generateDocumentOverview should cap the text resource at 20,000 characters', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', 'x'.repeat(25_000));

    const body = httpClientMock.post.mock.calls[0][1];
    expect(body.text).toHaveLength(20_000);
  });

  it('generateDocumentOverview should omit the text field when text is empty or whitespace', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', '   ');

    const body = httpClientMock.post.mock.calls[0][1];
    expect(body).not.toHaveProperty('text');
  });

  // R-EOC-003 AC.1/AC.2: project_context is a NEW, independent optional field — sent alongside
  // (never merged into) the user's own `text` resource.
  it('generateDocumentOverview should include the trimmed project_context in the payload when provided', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', 'User text.', '  [PROJECT — source: Agresso]\nTitle: X  ');

    expect(httpClientMock.post).toHaveBeenCalledWith(
      `${environment.documentOverviewUrl}/api/document-overview`,
      {
        bucket_name: 'ai-services-ibd',
        project_folder: `${environment.keyProjectOverview}A492`,
        user_id: cacheServiceMock.dataCache().user.email,
        text: 'User text.',
        project_context: '[PROJECT — source: Agresso]\nTitle: X'
      },
      expect.any(Object)
    );
  });

  it('generateDocumentOverview should omit the project_context field when it is empty, whitespace, or not provided (R-EOC-003 AC.4)', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', undefined, '   ');
    let body = httpClientMock.post.mock.calls[0][1];
    expect(body).not.toHaveProperty('project_context');

    await service.generateDocumentOverview('A492');
    body = httpClientMock.post.mock.calls[1][1];
    expect(body).not.toHaveProperty('project_context');
  });

  it('generateDocumentOverview should never merge project_context into text — both can be present, independently valued (R-EOC-003 AC.3)', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', 'Exact user text, untouched.', 'Assembled project digest.');

    const body = httpClientMock.post.mock.calls[0][1];
    expect(body.text).toBe('Exact user text, untouched.');
    expect(body.project_context).toBe('Assembled project digest.');
  });

  it('generateDocumentOverview should cap project_context at 8,000 characters', async () => {
    httpClientMock.post.mockReturnValue(of({ overview: { project_summary: 'Generated.' } }));

    await service.generateDocumentOverview('A492', undefined, 'x'.repeat(9_000));

    const body = httpClientMock.post.mock.calls[0][1];
    expect(body.project_context).toHaveLength(8_000);
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
