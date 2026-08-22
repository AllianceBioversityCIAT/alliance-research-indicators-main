import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetContractResultsSummaryService } from './get-contract-results-summary.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { ContractResultsSummary } from '@interfaces/contract-results-summary.interface';

const summaryUrl = (id: string) =>
  `${environment.mainApiUrl}agresso/contracts/reports/results-summary?contract-id=${encodeURIComponent(id)}`;

describe('GetContractResultsSummaryService', () => {
  let service: GetContractResultsSummaryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetContractResultsSummaryService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetContractResultsSummaryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the null empty-state contract before any load resolves', () => {
    expect(service.list()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('should store the contract id and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A1676');

    expect(service.contractId).toBe('A1676');
    expect(service.update).toHaveBeenCalled();
  });

  it('should not issue a request when update is called with an empty contract id', async () => {
    await service.update();

    expect(service.list()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should load the summary from the API envelope (envelope handling)', async () => {
    const payload: ContractResultsSummary = {
      total: 12,
      by_status: [
        { status_id: 1, name: 'Approved', count: 8 },
        { status_id: null, name: 'No status', count: 4 }
      ],
      by_year: [
        { year: 2024, count: 5 },
        { year: 2025, count: 7 }
      ],
      partner_institutions: 4
    };
    service.contractId = 'A1676';

    const updatePromise = service.update();
    const req = httpMock.expectOne(summaryUrl('A1676'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: payload, successfulRequest: true });
    await updatePromise;

    expect(service.list()).toEqual(payload);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should transition the loading signal false -> true -> false (KZ-015)', async () => {
    expect(service.loading()).toBe(false);

    service.contractId = 'A1676';
    const updatePromise = service.update();
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(summaryUrl('A1676'));
    req.flush({ data: { total: 0, by_status: [], by_year: [], partner_institutions: 0 }, successfulRequest: true });
    await updatePromise;

    expect(service.loading()).toBe(false);
  });

  it('should set loadError and list null when an HTTP error resolves with successfulRequest: false (red input)', async () => {
    service.contractId = 'A1676';

    const updatePromise = service.update();
    const req = httpMock.expectOne(summaryUrl('A1676'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await updatePromise;

    expect(service.loadError()).toBe(true);
    expect(service.list()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should retry via update() after an error and recover to the data state', async () => {
    service.contractId = 'A1676';

    const firstPromise = service.update();
    const req1 = httpMock.expectOne(summaryUrl('A1676'));
    req1.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await firstPromise;
    expect(service.loadError()).toBe(true);

    const payload: ContractResultsSummary = {
      total: 7,
      by_status: [{ status_id: 2, name: 'Submitted', count: 7 }],
      by_year: [{ year: 2024, count: 7 }],
      partner_institutions: 2
    };
    const secondPromise = service.update();
    const req2 = httpMock.expectOne(summaryUrl('A1676'));
    req2.flush({ data: payload, successfulRequest: true });
    await secondPromise;

    expect(service.list()).toEqual(payload);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should standardize an empty envelope on null', async () => {
    service.contractId = 'A1676';

    const updatePromise = service.update();
    const req = httpMock.expectOne(summaryUrl('A1676'));
    req.flush({});
    await updatePromise;

    expect(service.list()).toBeNull();
    expect(service.loadError()).toBe(false);
  });
});
