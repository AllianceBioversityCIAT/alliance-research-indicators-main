import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReleaseNotesApiService } from './release-notes-api.service';
import { environment } from '../../../environments/environment';

describe('ReleaseNotesApiService', () => {
  let service: ReleaseNotesApiService;
  let httpMock: HttpTestingController;

  const queryUrl = `${environment.releasesNotesApiUrl}/databases/${environment.releaseNotesDatabaseId}/query`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReleaseNotesApiService]
    });
    service = TestBed.inject(ReleaseNotesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('queryReleaseNotesPage should request a single page', () => {
    let result: unknown;
    service.queryReleaseNotesPage().subscribe(r => {
      result = r;
    });

    const req = httpMock.expectOne(r => r.url === queryUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('projects')).toBe('STAR');
    expect(req.request.params.get('status')).toBe('Published');
    expect(req.request.params.has('start_cursor')).toBe(false);
    req.flush({ results: [{ id: 'page-1' }], has_more: true, next_cursor: 'cursor-abc' });

    expect(result).toEqual({
      results: [{ id: 'page-1' }],
      has_more: true,
      next_cursor: 'cursor-abc'
    });
  });

  it('queryReleaseNotes should aggregate a single page', () => {
    let result: unknown;
    service.queryReleaseNotes().subscribe(r => {
      result = r;
    });

    const req = httpMock.expectOne(r => r.url === queryUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('projects')).toBe('STAR');
    expect(req.request.params.get('status')).toBe('Published');
    expect(req.request.params.has('start_cursor')).toBe(false);
    req.flush({ results: [{ id: 'page-1' }], has_more: false });

    expect(result).toEqual({
      object: 'list',
      results: [{ id: 'page-1' }],
      has_more: false
    });
  });

  it('queryReleaseNotes should treat missing results as empty', () => {
    let result: unknown;
    service.queryReleaseNotes().subscribe(r => {
      result = r;
    });
    httpMock.expectOne(r => r.url === queryUrl).flush({ results: null, has_more: false });
    expect(result).toEqual({ object: 'list', results: [], has_more: false });
  });

  it('queryReleaseNotes should paginate when has_more and next_cursor', () => {
    let result: unknown;
    service.queryReleaseNotes().subscribe(r => {
      result = r;
    });

    const first = httpMock.expectOne(r => r.url === queryUrl);
    first.flush({ results: [{ id: 'page-1' }], has_more: true, next_cursor: 'cursor-abc' });

    const second = httpMock.expectOne(r => r.url === queryUrl);
    expect(second.request.params.get('start_cursor')).toBe('cursor-abc');
    second.flush({ results: [{ id: 'page-2' }], has_more: false });

    expect(result).toEqual({
      object: 'list',
      results: [{ id: 'page-1' }, { id: 'page-2' }],
      has_more: false
    });
  });

  it('getPage should request the page endpoint', () => {
    let body: unknown;
    service.getPage('abc-123').subscribe(r => {
      body = r;
    });

    const req = httpMock.expectOne(`${environment.releasesNotesApiUrl}/pages/abc-123`);
    req.flush({ id: 'abc-123' });
    expect(body).toEqual({ id: 'abc-123' });
  });

  it('getBlockChildren should request block children', () => {
    let body: unknown;
    service.getBlockChildren('block-1').subscribe(r => {
      body = r;
    });

    const req = httpMock.expectOne(`${environment.releasesNotesApiUrl}/blocks/block-1/children`);
    req.flush({ results: [] });
    expect(body).toEqual({ results: [] });
  });
});
