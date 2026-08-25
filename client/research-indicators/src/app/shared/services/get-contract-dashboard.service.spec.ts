import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetContractDashboardService } from './get-contract-dashboard.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { ContractDashboardReport } from '@shared/interfaces/contract-dashboard.interface';

const dashboardUrl = (id: string) =>
  `${environment.mainApiUrl}agresso/contracts/reports/dashboard?contract-id=${encodeURIComponent(id)}`;

describe('GetContractDashboardService', () => {
  let service: GetContractDashboardService;
  let httpMock: HttpTestingController;

  const mockReport: ContractDashboardReport = {
    summary: {
      total: 10,
      by_status: [{ status_id: 1, name: 'Approved', count: 10 }],
      by_year: [{ year: 2024, count: 10 }],
      by_indicator_year: [{ indicator_id: 1, year: 2024, count: 10 }],
      partner_institutions: 5
    },
    tops: {
      partners: [{ institution_id: 101, name: 'Partner One', count: 4 }],
      primary_levers: [{ lever_id: 1, name: 'Lever One', count: 6 }],
      main_contacts: [{ contact_person_name: 'Jane Doe', count: 3 }],
      contributors: [{ project_name: 'Contributor Proj', count: 2 }]
    },
    geo_scope: {
      contract_id: 'A1676',
      limit: 5,
      geo_scope_summary: { global: 1, regional: 2, countries: 3, sub_national: 0, yet_to_be_determined: 0 },
      top_regions: [{ name: 'Latin America', count: 2 }],
      top_countries: [{ country_name: 'Colombia', count: 3 }]
    },
    sp_alignment: {
      sps: [{ sp_code: 'SP01', name: 'Science Program 1', category: 'A', icon_key: 'icon-1', links: [] }],
      results_with_alignment: 8,
      results_without_alignment: 2
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetContractDashboardService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetContractDashboardService);
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
    expect(service.summary()).toBeNull();
    expect(service.tops()).toBeNull();
    expect(service.topPartners()).toEqual([]);
    expect(service.topPrimaryLevers()).toEqual([]);
    expect(service.topMainContactPersons()).toEqual([]);
    expect(service.topContributors()).toEqual([]);
    expect(service.geoScope()).toBeNull();
    expect(service.spAlignment()).toBeNull();
  });

  it('should transition loading false -> true -> false and populate all computed signals simultaneously (KZ-015)', async () => {
    expect(service.loading()).toBe(false);

    const loadPromise = service.load('A1676');
    expect(service.loading()).toBe(true);
    expect(service.loadError()).toBe(false);

    const req = httpMock.expectOne(dashboardUrl('A1676'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockReport, successfulRequest: true });
    await loadPromise;

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.loadedContractId()).toBe('A1676');
    expect(service.data()).toEqual(mockReport);

    expect(service.summary()).toEqual(mockReport.summary);
    expect(service.tops()).toEqual(mockReport.tops);
    expect(service.topPartners()).toEqual(mockReport.tops!.partners);
    expect(service.topPrimaryLevers()).toEqual(mockReport.tops!.primary_levers);
    expect(service.topMainContactPersons()).toEqual(mockReport.tops!.main_contacts);
    expect(service.topContributors()).toEqual(mockReport.tops!.contributors);
    expect(service.geoScope()).toEqual(mockReport.geo_scope);
    expect(service.spAlignment()).toEqual(mockReport.sp_alignment);
  });

  it('should deduplicate subsequent load calls for the same contractId unless force is true', async () => {
    const firstLoad = service.load('A1676');
    const req1 = httpMock.expectOne(dashboardUrl('A1676'));
    req1.flush({ data: mockReport, successfulRequest: true });
    await firstLoad;

    expect(service.loadedContractId()).toBe('A1676');

    // Subsequent load for same contractId without force does not issue another request
    await service.load('A1676');
    httpMock.expectNone(dashboardUrl('A1676'));

    // Subsequent load with force: true issues another request
    const forceLoad = service.load('A1676', { force: true });
    const req2 = httpMock.expectOne(dashboardUrl('A1676'));
    req2.flush({ data: mockReport, successfulRequest: true });
    await forceLoad;

    // Load for different contractId issues another request
    const diffLoad = service.load('B2000');
    const req3 = httpMock.expectOne(dashboardUrl('B2000'));
    req3.flush({ data: mockReport, successfulRequest: true });
    await diffLoad;

    expect(service.loadedContractId()).toBe('B2000');
  });

  it('should re-fetch with force: true when update() is called with an active loadedContractId', async () => {
    // Calling update() before any contract is loaded should do nothing
    await service.update();
    httpMock.expectNone(dashboardUrl('A1676'));

    // Initial load
    const firstLoad = service.load('A1676');
    const req1 = httpMock.expectOne(dashboardUrl('A1676'));
    req1.flush({ data: mockReport, successfulRequest: true });
    await firstLoad;

    // Call update()
    const updatePromise = service.update();
    const req2 = httpMock.expectOne(dashboardUrl('A1676'));
    expect(req2.request.method).toBe('GET');
    req2.flush({ data: mockReport, successfulRequest: true });
    await updatePromise;

    expect(service.data()).toEqual(mockReport);
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('should set loadError: true, loading: false, and data: null when API throws an error', async () => {
    const loadPromise = service.load('A1676');
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(dashboardUrl('A1676'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    await loadPromise;

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
    expect(service.summary()).toBeNull();
    expect(service.tops()).toBeNull();
    expect(service.topPartners()).toEqual([]);
    expect(service.topPrimaryLevers()).toEqual([]);
    expect(service.topMainContactPersons()).toEqual([]);
    expect(service.topContributors()).toEqual([]);
    expect(service.geoScope()).toBeNull();
    expect(service.spAlignment()).toBeNull();
  });

  it('should handle thrown exceptions in catch block when apiService rejects', async () => {
    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService, 'GET_ContractDashboard').mockRejectedValueOnce(new Error('Network failure'));

    await service.load('A1676');

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
  });

  it('should retry after error and successfully recover state', async () => {
    const loadPromise1 = service.load('A1676');
    const req1 = httpMock.expectOne(dashboardUrl('A1676'));
    req1.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    await loadPromise1;
    expect(service.loadError()).toBe(true);

    const loadPromise2 = service.load('A1676');
    const req2 = httpMock.expectOne(dashboardUrl('A1676'));
    req2.flush({ data: mockReport, successfulRequest: true });
    await loadPromise2;

    expect(service.loadError()).toBe(false);
    expect(service.data()).toEqual(mockReport);
  });


  it('should handle partial section failures where sections are null', async () => {
    const partialReport: ContractDashboardReport = {
      summary: mockReport.summary,
      tops: null,
      geo_scope: null,
      sp_alignment: null
    };

    const loadPromise = service.load('A1676');
    const req = httpMock.expectOne(dashboardUrl('A1676'));
    req.flush({ data: partialReport, successfulRequest: true });
    await loadPromise;

    expect(service.data()).toEqual(partialReport);
    expect(service.summary()).toEqual(mockReport.summary);
    expect(service.tops()).toBeNull();
    expect(service.topPartners()).toEqual([]);
    expect(service.topPrimaryLevers()).toEqual([]);
    expect(service.topMainContactPersons()).toEqual([]);
    expect(service.topContributors()).toEqual([]);
    expect(service.geoScope()).toBeNull();
    expect(service.spAlignment()).toBeNull();
  });

  it('should handle empty response envelope safely setting data to null', async () => {
    const loadPromise = service.load('A1676');
    const req = httpMock.expectOne(dashboardUrl('A1676'));
    req.flush({});
    await loadPromise;

    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.summary()).toBeNull();
  });

  describe('invalidate(contractId?) — changes/dashboard-refresh T-01, R-DRF-001', () => {
    it('issues a fresh HTTP request after invalidate(id) clears the cache for that id', async () => {
      const first = service.load('A1676');
      httpMock.expectOne(dashboardUrl('A1676')).flush({ data: mockReport, successfulRequest: true });
      await first;
      expect(service.loadedContractId()).toBe('A1676');

      service.invalidate('A1676');

      const second = service.load('A1676');
      const req2 = httpMock.expectOne(dashboardUrl('A1676'));
      req2.flush({ data: mockReport, successfulRequest: true });
      await second;

      expect(service.loadedContractId()).toBe('A1676');
    });

    it('does NOT invalidate a different contract id currently loaded (no HTTP re-issue for it)', async () => {
      const load = service.load('B-2');
      httpMock.expectOne(dashboardUrl('B-2')).flush({ data: mockReport, successfulRequest: true });
      await load;
      expect(service.loadedContractId()).toBe('B-2');

      service.invalidate('A1676');

      // A subsequent non-forced load of B-2 must be served from cache — no new HTTP call.
      await service.load('B-2');
      httpMock.expectNone(dashboardUrl('B-2'));
      expect(service.loadedContractId()).toBe('B-2');
    });
  });
});
