import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetProjectDetailService } from './get-project-detail.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

const resultsCountUrl = (id: string) => `${environment.mainApiUrl}agresso/contracts/${id}/results/count`;

describe('GetProjectDetailService', () => {
  let service: GetProjectDetailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetProjectDetailService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetProjectDetailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the null empty-state contract before any load resolves', () => {
    expect(service.project()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('should issue exactly one GET_ResultsCount request for repeated loads of the same contract id (per-navigation dedupe — AC.2)', async () => {
    const first = service.load('A-1');
    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { agreement_id: 'A-1' } });
    await first;

    await service.load('A-1');

    expect(service.project()?.agreement_id).toBe('A-1');
    expect(service.loadedContractIds.has('A-1')).toBe(true);
  });

  it('should dedupe concurrent in-flight loads for the same contract id (no second HTTP request)', async () => {
    const first = service.load('A-1');
    const second = service.load('A-1');

    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { agreement_id: 'A-1' } });

    await Promise.all([first, second]);
    expect(service.project()?.agreement_id).toBe('A-1');
  });

  it('should produce two independent cache entries for two different contract ids (judgment W6)', async () => {
    const loadA = service.load('A-1');
    const loadB = service.load('B-2');

    const reqA = httpMock.expectOne(resultsCountUrl('A-1'));
    const reqB = httpMock.expectOne(resultsCountUrl('B-2'));
    reqA.flush({ data: { agreement_id: 'A-1' } });
    reqB.flush({ data: { agreement_id: 'B-2' } });

    await Promise.all([loadA, loadB]);

    expect(service.project()?.agreement_id).toBe('B-2');
    expect(service.loadedContractIds.has('A-1')).toBe(true);
    expect(service.loadedContractIds.has('B-2')).toBe(true);
  });

  it('should issue a fresh HTTP request after invalidate(id) clears the cache', async () => {
    const first = service.load('A-1');
    const req1 = httpMock.expectOne(resultsCountUrl('A-1'));
    req1.flush({ data: { agreement_id: 'A-1' } });
    await first;

    service.invalidate('A-1');
    expect(service.loadedContractIds.has('A-1')).toBe(false);

    const second = service.load('A-1');
    const req2 = httpMock.expectOne(resultsCountUrl('A-1'));
    req2.flush({ data: { agreement_id: 'A-1', description: 'updated' } });
    await second;

    expect(service.project()?.description).toBe('updated');
  });

  it('should clear all cache entries when invalidate() is called without an id', async () => {
    const loadA = service.load('A-1');
    const loadB = service.load('B-2');
    httpMock.expectOne(resultsCountUrl('A-1')).flush({ data: { agreement_id: 'A-1' } });
    httpMock.expectOne(resultsCountUrl('B-2')).flush({ data: { agreement_id: 'B-2' } });
    await Promise.all([loadA, loadB]);

    service.invalidate();
    expect(service.loadedContractIds.has('A-1')).toBe(false);
    expect(service.loadedContractIds.has('B-2')).toBe(false);
  });

  it('should standardize empty response on null (not undefined or {})', async () => {
    const load = service.load('A-1');
    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    req.flush({ data: null });
    await load;

    expect(service.project()).toBeNull();
    expect(service.loadedContractIds.has('A-1')).toBe(false);
  });

  it('should standardize empty envelope on null', async () => {
    const load = service.load('A-1');
    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    req.flush({});
    await load;

    expect(service.project()).toBeNull();
  });

  it('should set loadError and project null when the request fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = service.load('A-1');
    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await load;

    expect(service.loadError()).toBe(true);
    expect(service.project()).toBeNull();
    expect(service.loadedContractIds.has('A-1')).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should NOT issue an HTTP request when load is called with an empty contract id', async () => {
    await service.load('');
    expect(service.project()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should transition the loading signal: false → true → false (KZ-015 — arrange the transition)', async () => {
    expect(service.loading()).toBe(false);

    const loadPromise = service.load('A-1');
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    req.flush({ data: { agreement_id: 'A-1' } });
    await loadPromise;

    expect(service.loading()).toBe(false);
  });

  it('should resolve the in-flight awaiter with the same data as the original caller', async () => {
    const first = service.load('A-1');
    const second = service.load('A-1');

    const req = httpMock.expectOne(resultsCountUrl('A-1'));
    req.flush({ data: { agreement_id: 'A-1', description: 'shared' } });

    await Promise.all([first, second]);

    expect(service.project()?.description).toBe('shared');
  });
});
