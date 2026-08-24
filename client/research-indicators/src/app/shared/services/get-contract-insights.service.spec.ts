import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetContractInsightsService } from './get-contract-insights.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { ContractInsightsReport } from '@shared/interfaces/contract-insights.interface';

const contractInsightsUrl = (id: string) =>
  `${environment.mainApiUrl}agresso/contracts/reports/insights?contract-id=${encodeURIComponent(id)}`;

describe('GetContractInsightsService', () => {
  let service: GetContractInsightsService;
  let httpMock: HttpTestingController;

  const mockReport: ContractInsightsReport = {
    reach: {
      meta: { total_results: 20, n: 12 },
      overall: {
        women_youth: 30,
        women_not_youth: 45,
        men_youth: 25,
        men_not_youth: 40,
        total: 140
      },
      by_actor_type: [
        {
          actor_type_id: 1,
          actor_type_name: 'Smallholder farmers',
          women_youth: 20,
          women_not_youth: 25,
          men_youth: 15,
          men_not_youth: 20,
          total: 80
        }
      ],
      not_disaggregated_rows: 3
    },
    sdg_coverage: {
      meta: { total_results: 20, n: 18 },
      sdgs: [
        { sdg_id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger', count: 10 },
        { sdg_id: 15, short_name: 'SDG 15', full_name: 'Life on Land', count: 4 }
      ]
    },
    evidence: {
      meta: { total_results: 20, n: 20 },
      results_with_evidence: 15,
      evidences_total: 22,
      public_count: 18,
      private_count: 4,
      by_role: [{ evidence_role_id: 1, name: 'Primary evidence', count: 15 }]
    },
    review_flow: {
      meta: { total_results: 20, n: 20 },
      by_event_type: [{ event_type: 'RESULT_SUBMITTED', label: 'Result submitted', count: 12 }],
      by_decision: [{ decision: 'APPROVE', label: 'Approved', count: 9 }],
      cycle_time: { median_days: null, p90_days: null, sample_size: 0 },
      excluded_for_incomplete_history: 12
    },
    contributing_levers: {
      meta: { total_results: 20, n: 6 },
      levers: [{ lever_id: 3, short_name: 'Genetic Innovation', full_name: 'Genetic Innovation lever', count: 6 }]
    },
    keywords: {
      meta: { total_results: 20, n: 14 },
      keywords: [
        { keyword: 'soil health', count: 3 },
        { keyword: 'water use', count: 2 }
      ]
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetContractInsightsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetContractInsightsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the null empty-state signals before any load resolves', () => {
    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.loadedContractId()).toBeNull();
    expect(service.reach()).toBeNull();
    expect(service.sdgCoverage()).toBeNull();
    expect(service.evidence()).toBeNull();
    expect(service.reviewFlow()).toBeNull();
    expect(service.contributingLevers()).toBeNull();
    expect(service.keywords()).toBeNull();
    expect(service.sectionFailed('reach')).toBe(false);
  });

  it('should request the exact insights URL with contract-id encoded in the query string', async () => {
    const loadPromise = service.load('A511');
    const req = httpMock.expectOne(contractInsightsUrl('A511'));
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(contractInsightsUrl('A511'));
    req.flush({ data: mockReport, successfulRequest: true });
    await loadPromise;
  });

  it('should transition loading false -> true -> false and populate all six section signals simultaneously (KZ-015)', async () => {
    expect(service.loading()).toBe(false);

    const loadPromise = service.load('A511');
    expect(service.loading()).toBe(true);
    expect(service.loadError()).toBe(false);

    const req = httpMock.expectOne(contractInsightsUrl('A511'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockReport, successfulRequest: true });
    await loadPromise;

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.loadedContractId()).toBe('A511');
    expect(service.data()).toEqual(mockReport);

    expect(service.reach()).toEqual(mockReport.reach);
    expect(service.sdgCoverage()).toEqual(mockReport.sdg_coverage);
    expect(service.evidence()).toEqual(mockReport.evidence);
    expect(service.reviewFlow()).toEqual(mockReport.review_flow);
    expect(service.contributingLevers()).toEqual(mockReport.contributing_levers);
    expect(service.keywords()).toEqual(mockReport.keywords);

    expect(service.sectionFailed('reach')).toBe(false);
    expect(service.sectionFailed('sdg_coverage')).toBe(false);
  });

  it('should deduplicate subsequent load calls for the same contractId unless force is true (K-004 named failing input: removing the dedupe guard reds this test)', async () => {
    const firstLoad = service.load('A511');
    const req1 = httpMock.expectOne(contractInsightsUrl('A511'));
    req1.flush({ data: mockReport, successfulRequest: true });
    await firstLoad;

    expect(service.loadedContractId()).toBe('A511');

    // Subsequent load for same contractId without force does not issue another request
    await service.load('A511');
    httpMock.expectNone(contractInsightsUrl('A511'));

    // Subsequent load with force: true issues another request
    const forceLoad = service.load('A511', { force: true });
    const req2 = httpMock.expectOne(contractInsightsUrl('A511'));
    req2.flush({ data: mockReport, successfulRequest: true });
    await forceLoad;

    // Load for a different contractId issues another request
    const diffLoad = service.load('B2000');
    const req3 = httpMock.expectOne(contractInsightsUrl('B2000'));
    req3.flush({ data: mockReport, successfulRequest: true });
    await diffLoad;

    expect(service.loadedContractId()).toBe('B2000');
  });

  it('should re-fetch with force: true when update() is called with an active loadedContractId', async () => {
    // Calling update() before any contract is loaded should do nothing
    await service.update();
    httpMock.expectNone(contractInsightsUrl('A511'));

    // Initial load
    const firstLoad = service.load('A511');
    const req1 = httpMock.expectOne(contractInsightsUrl('A511'));
    req1.flush({ data: mockReport, successfulRequest: true });
    await firstLoad;

    // Call update()
    const updatePromise = service.update();
    const req2 = httpMock.expectOne(contractInsightsUrl('A511'));
    expect(req2.request.method).toBe('GET');
    req2.flush({ data: mockReport, successfulRequest: true });
    await updatePromise;

    expect(service.data()).toEqual(mockReport);
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('should set loadError: true, loading: false, and data: null when API throws an error', async () => {
    const loadPromise = service.load('A511');
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(contractInsightsUrl('A511'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    await loadPromise;

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
    expect(service.reach()).toBeNull();
    expect(service.sdgCoverage()).toBeNull();
    expect(service.evidence()).toBeNull();
    expect(service.reviewFlow()).toBeNull();
    expect(service.contributingLevers()).toBeNull();
    expect(service.keywords()).toBeNull();
  });

  it('should handle thrown exceptions in catch block when apiService rejects', async () => {
    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService, 'GET_ContractInsights').mockRejectedValueOnce(new Error('Network failure'));

    await service.load('A511');

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
  });

  it('should set loadError: true when apiService returns successfulRequest: false', async () => {
    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService, 'GET_ContractInsights').mockResolvedValueOnce({
      data: null as any,
      successfulRequest: false,
      description: 'Internal server error',
      status: 500
    });

    await service.load('A511');

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
  });

  it('should retry after error and successfully recover state', async () => {
    const loadPromise1 = service.load('A511');
    const req1 = httpMock.expectOne(contractInsightsUrl('A511'));
    req1.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    await loadPromise1;
    expect(service.loadError()).toBe(true);

    const loadPromise2 = service.load('A511');
    const req2 = httpMock.expectOne(contractInsightsUrl('A511'));
    req2.flush({ data: mockReport, successfulRequest: true });
    await loadPromise2;

    expect(service.loadError()).toBe(false);
    expect(service.data()).toEqual(mockReport);
  });

  it('should treat a null section as failed while the others report sectionFailed = false (tri-state, D-F4-3: n = 0 is NOT failure)', async () => {
    const partialReport: ContractInsightsReport = {
      reach: null, // failed -> sectionFailed === true
      sdg_coverage: mockReport.sdg_coverage, // populated -> sectionFailed === false
      evidence: null, // failed -> sectionFailed === true
      review_flow: { ...mockReport.review_flow!, meta: { total_results: 20, n: 0 } }, // n = 0 is empty, not failed
      contributing_levers: mockReport.contributing_levers,
      keywords: mockReport.keywords
    };

    const loadPromise = service.load('A511');
    const req = httpMock.expectOne(contractInsightsUrl('A511'));
    req.flush({ data: partialReport, successfulRequest: true });
    await loadPromise;

    expect(service.data()).toEqual(partialReport);
    expect(service.reach()).toBeNull();
    expect(service.sdgCoverage()).toEqual(mockReport.sdg_coverage);
    expect(service.evidence()).toBeNull();
    expect(service.reviewFlow()?.meta.n).toBe(0);

    expect(service.sectionFailed('reach')).toBe(true);
    expect(service.sectionFailed('evidence')).toBe(true);
    expect(service.sectionFailed('sdg_coverage')).toBe(false);
    expect(service.sectionFailed('review_flow')).toBe(false);
    expect(service.sectionFailed('contributing_levers')).toBe(false);
    expect(service.sectionFailed('keywords')).toBe(false);
  });

  it('should handle empty response envelope safely setting data to null', async () => {
    const loadPromise = service.load('A511');
    const req = httpMock.expectOne(contractInsightsUrl('A511'));
    req.flush({});
    await loadPromise;

    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.reach()).toBeNull();
  });
});
