import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetFullContractReportsService } from './get-full-contract-reports.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ContractFullReports } from '@interfaces/contract-full-reports.interface';
import { mockContractFullReports } from 'src/app/testing/contract-full-reports.mock';

// Per the T-01 gate: this suite must observe a real HTTP request shaped by the
// real `ApiService` + `ToPromiseService` chain — `HttpTestingController`, not a
// mocked `ApiService`. Asserting a hand-built URL string against a mocked
// service would be decorative; it would not prove `contract-id` was actually
// encoded before it reached the network layer.
describe('GetFullContractReportsService', () => {
  let service: GetFullContractReportsService;
  let apiService: ApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.mainApiUrl}agresso/contracts/reports/full`;

  const ok = (data: ContractFullReports): MainResponse<ContractFullReports> =>
    ({
      data,
      status: 200,
      description: 'Contract full reports generated',
      timestamp: '',
      path: '',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' }
    }) as MainResponse<ContractFullReports>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetFullContractReportsService, ApiService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(GetFullContractReportsService);
    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('has empty/null per-section computeds before any payload is loaded', () => {
    expect(service.payload()).toBeNull();
    expect(service.topPartners()).toEqual([]);
    expect(service.topPrimaryLevers()).toEqual([]);
    expect(service.topMainContactPersons()).toEqual([]);
    expect(service.topContributors()).toEqual([]);
    expect(service.staff()).toEqual([]);
    expect(service.geoScope()).toBeNull();
  });

  it('does not issue a request when contractId is empty', async () => {
    await service.update();

    httpMock.expectNone(() => true);
    expect(service.loading()).toBe(false);
  });

  it('main() stores the contract id and triggers update()', () => {
    service.update = jest.fn();

    service.main('FULL-100');

    expect(service.contractId).toBe('FULL-100');
    expect(service.update).toHaveBeenCalled();
  });

  it('issues exactly one GET to reports/full and loads the payload (R-PDB-001 AC.1)', async () => {
    const getSpy = jest.spyOn(apiService, 'GET_FullContractReports');
    const mock = mockContractFullReports();

    service.contractId = 'FULL-100';
    const pending = service.update();
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(`${baseUrl}?contract-id=FULL-100`);
    expect(req.request.method).toBe('GET');

    req.flush(ok(mock));
    await pending;

    expect(getSpy).toHaveBeenCalledWith('FULL-100');
    expect(service.payload()).toEqual(mock);
    expect(service.topPartners()).toEqual(mock.top_partners);
    expect(service.topPrimaryLevers()).toEqual(mock.top_primary_levers);
    expect(service.topMainContactPersons()).toEqual(mock.top_main_contact_persons);
    expect(service.topContributors()).toEqual(mock.top_contributors);
    expect(service.staff()).toEqual(mock.staff);
    expect(service.geoScope()).toEqual(mock.geo_scope);
    // T-14 recommended addition (owner-escalated, tasks.md § T-14): the 10
    // indicator-metadata accessors added by T-10 (indicator-metadata-charts)
    // are reached by nothing else -- this component's own spec stubs the
    // service, so a cross-wire here (e.g. `innovationType` reading
    // `payload()?.innovation_nature`) would compile cleanly and stay green
    // everywhere else. One assertion per accessor, mirroring the six above.
    expect(service.innovationNature()).toEqual(mock.innovation_nature);
    expect(service.innovationType()).toEqual(mock.innovation_type);
    expect(service.innovationReadiness()).toEqual(mock.innovation_readiness);
    expect(service.oicrMaturity()).toEqual(mock.oicr_maturity);
    expect(service.policyType()).toEqual(mock.policy_type);
    expect(service.policyStage()).toEqual(mock.policy_stage);
    expect(service.sessionFormat()).toEqual(mock.session_format);
    expect(service.sessionType()).toEqual(mock.session_type);
    expect(service.genderDistribution()).toEqual(mock.gender_distribution);
    expect(service.degree()).toEqual(mock.degree);
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('encodes a contract-id containing a space and a slash into a valid request URL (R-PDB-001 AC.3)', async () => {
    const contractId = 'A 100/1';
    service.contractId = contractId;
    const pending = service.update();

    const req = httpMock.expectOne(`${baseUrl}?contract-id=A%20100%2F1`);
    expect(req.request.method).toBe('GET');

    req.flush(ok(mockContractFullReports()));
    await pending;
  });

  it('loadError sets the flag AND clears payload on a failed request', async () => {
    service.contractId = 'FULL-100';
    // Seed a previous, valid payload so clearing it on failure is observable.
    service.payload.set(mockContractFullReports());

    const pending = service.update();
    const req = httpMock.expectOne(`${baseUrl}?contract-id=FULL-100`);
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Internal Server Error' });
    await pending;

    expect(service.loadError()).toBe(true);
    expect(service.payload()).toBeNull();
    expect(service.topPartners()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('a retry after a failure re-issues the single request and can recover (Try again)', async () => {
    service.contractId = 'FULL-100';

    const firstPending = service.update();
    httpMock.expectOne(`${baseUrl}?contract-id=FULL-100`).flush({ message: 'boom' }, { status: 500, statusText: 'Internal Server Error' });
    await firstPending;

    expect(service.loadError()).toBe(true);
    expect(service.payload()).toBeNull();

    const mock = mockContractFullReports();
    const secondPending = service.update();
    httpMock.expectOne(`${baseUrl}?contract-id=FULL-100`).flush(ok(mock));
    await secondPending;

    expect(service.loadError()).toBe(false);
    expect(service.payload()).toEqual(mock);
    expect(service.topPartners()).toEqual(mock.top_partners);
  });
});
