import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetClarisaProjectService } from './get-clarisa-project.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

const clarisaProjectUrl = (id: string) => `${environment.mainApiUrl}agresso/contracts/${id}/clarisa-project`;

describe('GetClarisaProjectService', () => {
  let service: GetClarisaProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetClarisaProjectService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetClarisaProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the null empty-state contract before any load resolves', () => {
    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('should issue exactly one GET_ContractClarisaProject request for repeated loads of the same contract id (per-navigation dedupe)', async () => {
    const first = service.load('A-1');
    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    await first;

    await service.load('A-1');

    expect(service.data()?.short_name).toBe('CL-A1');
  });

  it('should dedupe concurrent in-flight loads for the same contract id (no second HTTP request)', async () => {
    const first = service.load('A-1');
    const second = service.load('A-1');

    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });

    await Promise.all([first, second]);
    expect(service.data()?.short_name).toBe('CL-A1');
  });

  it('should produce two independent cache entries for two different contract ids', async () => {
    const loadA = service.load('A-1');
    const loadB = service.load('B-2');

    const reqA = httpMock.expectOne(clarisaProjectUrl('A-1'));
    const reqB = httpMock.expectOne(clarisaProjectUrl('B-2'));
    reqA.flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    reqB.flush({ data: { id: 2, short_name: 'CL-B2', science_programs: [] } });

    await Promise.all([loadA, loadB]);

    expect(service.data()?.short_name).toBe('CL-B2');
  });

  // Reviewer FAIL, attempt 2: a shared `data` signal + memo-hit early-return
  // left `data` holding the previously loaded contract's record on
  // back-navigation (A -> B -> A). This is the discriminating case: no
  // second HTTP request for A, but `data()` must still resolve to A's
  // record, not B's.
  it('should serve the correct contract record after re-entering a previously-loaded contract (A -> B -> A, no re-fetch)', async () => {
    const loadA = service.load('A-1');
    httpMock.expectOne(clarisaProjectUrl('A-1')).flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    await loadA;

    const loadB = service.load('B-2');
    httpMock.expectOne(clarisaProjectUrl('B-2')).flush({ data: { id: 2, short_name: 'CL-B2', science_programs: [] } });
    await loadB;

    expect(service.data()?.short_name).toBe('CL-B2');

    await service.load('A-1');

    expect(service.data()?.short_name).toBe('CL-A1');
    httpMock.verify();
  });

  it('should issue a fresh HTTP request after invalidate(id) clears the cache', async () => {
    const first = service.load('A-1');
    const req1 = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req1.flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    await first;

    service.invalidate('A-1');

    const second = service.load('A-1');
    const req2 = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req2.flush({ data: { id: 1, short_name: 'CL-A1-updated', science_programs: [] } });
    await second;

    expect(service.data()?.short_name).toBe('CL-A1-updated');
  });

  it('should clear all cache entries when invalidate() is called without an id', async () => {
    const loadA = service.load('A-1');
    httpMock.expectOne(clarisaProjectUrl('A-1')).flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    await loadA;

    service.invalidate();

    const second = service.load('A-1');
    httpMock.expectOne(clarisaProjectUrl('A-1')).flush({ data: { id: 1, short_name: 'CL-A1-again', science_programs: [] } });
    await second;

    expect(service.data()?.short_name).toBe('CL-A1-again');
  });

  // R-EOC-001 AC.2: unmapped contract — data:null with a 200 is a normal
  // state, not an error. The discriminating case (KZ-001).
  it('should set data null WITHOUT setting loadError when the contract is unmapped (data:null, 200)', async () => {
    const load = service.load('A-1');
    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({ data: null });
    await load;

    expect(service.data()).toBeNull();
    expect(service.loadError()).toBe(false);
  });

  // R-EOC-001 AC.4: cold-cache CLARISA degrade — still data:null + errors[],
  // still a 200, still NOT an error state on the client (NFR-2).
  it('should set data null WITHOUT setting loadError when CLARISA degrades (data:null, errors present)', async () => {
    const load = service.load('A-1');
    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({ data: null, errors: ['clarisa_unavailable'] });
    await load;

    expect(service.data()).toBeNull();
    expect(service.loadError()).toBe(false);
  });

  it('should memoize a null-data response so an unmapped contract does not re-fetch on the next load (NFR-1)', async () => {
    const first = service.load('A-1');
    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({ data: null });
    await first;

    await service.load('A-1');

    httpMock.verify();
  });

  it('should standardize empty envelope on null', async () => {
    const load = service.load('A-1');
    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({});
    await load;

    expect(service.data()).toBeNull();
    expect(service.loadError()).toBe(false);
  });

  it('should set loadError and data null when the request transport-fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = service.load('A-1');
    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await load;

    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should re-fetch after a transport failure (not memoized)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const first = service.load('A-1');
    const req1 = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req1.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await first;

    const second = service.load('A-1');
    const req2 = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req2.flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    await second;

    expect(service.data()?.short_name).toBe('CL-A1');
    consoleSpy.mockRestore();
  });

  it('should NOT issue an HTTP request when load is called with an empty contract id', async () => {
    await service.load('');
    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should transition the loading signal: false → true → false (KZ-015 — arrange the transition)', async () => {
    expect(service.loading()).toBe(false);

    const loadPromise = service.load('A-1');
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({ data: { id: 1, short_name: 'CL-A1', science_programs: [] } });
    await loadPromise;

    expect(service.loading()).toBe(false);
  });

  it('should resolve the in-flight awaiter with the same data as the original caller', async () => {
    const first = service.load('A-1');
    const second = service.load('A-1');

    const req = httpMock.expectOne(clarisaProjectUrl('A-1'));
    req.flush({ data: { id: 1, short_name: 'CL-A1', full_name: 'shared', science_programs: [] } });

    await Promise.all([first, second]);

    expect(service.data()?.full_name).toBe('shared');
  });
});
